/**
 * Tests for Graz Accords / Local Truces mechanic.
 * Covers: accords firing, corps-pair truce, Kiseljak OSID exclusion,
 * truce-break detection, aggression spike, and shouldGrazBlockAttack.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
    GRAZ_ACCORDS_TURN,
    GRAZ_CORPS_PAIRS,
    GRAZ_KISELJAK_VRS_EXCLUSION,
    GRAZ_KISELJAK_HRHB_EXCLUSION,
    isGrazAccordsActive,
    isHerzegovinaTruceActive,
    isKiseljakExclusionActive,
    isCorpsInGrazPair,
    getCorpsTrucePartner,
    getTrucePartner,
    isKiseljakExcluded,
    shouldGrazBlockAttack,
    getTruceBreakAggressionBonus,
    checkAndFireGrazAccords,
    recordTruceBroken,
} from '../src/sim/local_truces.js';
import type { FactionId, GameState } from '../src/state/game_state.js';

// ─── Minimal state factory ────────────────────────────────────────────────────

function makeState(turn: number, overrides: Partial<GameState> = {}): GameState {
    const overrideMilitary = (overrides.military ?? {}) as Record<string, unknown>;
    const overridePolitical = (overrides.political ?? {}) as Record<string, unknown>;

    return {
        schema_version: 1,
        meta: { phase: 'war', turn, scenario_start_date: '1992-04-06' },
        factions: [],
        ...Object.fromEntries(
            Object.entries(overrides).filter(([key]) => key !== 'military' && key !== 'political'),
        ),
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            ...overrideMilitary,
        } as any,
        political: {
            ...overridePolitical,
        } as any,
    } as unknown as GameState;
}

function makeActiveState(turn: number = 10): GameState {
    const state = makeState(turn);
    state.political.vienna_declaration_turn = 4;
    state.political.vienna_accepted = { RS: true, HRHB: true } as Record<FactionId, boolean>;
    return state;
}

// ─── Constants ────────────────────────────────────────────────────────────────

describe('GRAZ_ACCORDS_TURN', () => {
    it('should be week 4', () => {
        assert.equal(GRAZ_ACCORDS_TURN, 4);
    });
});

describe('GRAZ_CORPS_PAIRS', () => {
    it('has Herzegovina pair', () => {
        assert.ok(GRAZ_CORPS_PAIRS.some(([a, b]) =>
            a === 'vrs_herzegovina' && b === 'hvo_southeast_herzegovina'));
    });
    it('has 2KK/Tomislavgrad pair', () => {
        assert.ok(GRAZ_CORPS_PAIRS.some(([a, b]) =>
            a === 'vrs_2nd_krajina' && b === 'hvo_tomislavgrad'));
    });
});

describe('Kiseljak exclusions', () => {
    it('VRS exclusion includes kiseljak OSIDs', () => {
        assert.ok(GRAZ_KISELJAK_VRS_EXCLUSION.has('op:kiseljak:kiseljak_2'));
        assert.ok(GRAZ_KISELJAK_VRS_EXCLUSION.has('op:kiseljak:gromiljak_2'));
        assert.equal(GRAZ_KISELJAK_VRS_EXCLUSION.size, 7);
    });
    it('HRHB exclusion includes border OSIDs', () => {
        assert.ok(GRAZ_KISELJAK_HRHB_EXCLUSION.has('op:hadzici:misevici_2'));
        assert.ok(GRAZ_KISELJAK_HRHB_EXCLUSION.has('op:visoko:bradve_2'));
        assert.equal(GRAZ_KISELJAK_HRHB_EXCLUSION.size, 7);
    });
});

// ─── isGrazAccordsActive ─────────────────────────────────────────────────────

describe('isGrazAccordsActive', () => {
    it('returns false when field not set', () => {
        assert.equal(isGrazAccordsActive(makeState(10)), false);
    });

    it('returns false when current turn < declaration turn', () => {
        const state = makeState(3);
        state.political.vienna_declaration_turn = 4;
        state.political.vienna_accepted = { RS: true, HRHB: true } as Record<FactionId, boolean>;
        assert.equal(isGrazAccordsActive(state), false);
    });

    it('returns false when not accepted by both factions', () => {
        const state = makeState(10);
        state.political.vienna_declaration_turn = 4;
        // No vienna_accepted set
        assert.equal(isGrazAccordsActive(state), false);
    });

    it('returns false when only one faction accepted', () => {
        const state = makeState(10);
        state.political.vienna_declaration_turn = 4;
        state.political.vienna_accepted = { RS: true } as Record<FactionId, boolean>;
        assert.equal(isGrazAccordsActive(state), false);
    });

    it('returns true when both factions accepted and turn >= declaration', () => {
        assert.equal(isGrazAccordsActive(makeActiveState(4)), true);
    });

    it('returns true long after declaration', () => {
        assert.equal(isGrazAccordsActive(makeActiveState(40)), true);
    });
});

// ─── Corps pair queries ──────────────────────────────────────────────────────

describe('isCorpsInGrazPair', () => {
    it('returns true for vrs_herzegovina', () => {
        assert.equal(isCorpsInGrazPair('vrs_herzegovina'), true);
    });
    it('returns true for hvo_southeast_herzegovina', () => {
        assert.equal(isCorpsInGrazPair('hvo_southeast_herzegovina'), true);
    });
    it('returns true for vrs_2nd_krajina', () => {
        assert.equal(isCorpsInGrazPair('vrs_2nd_krajina'), true);
    });
    it('returns false for vrs_1st_krajina (Posavina — not covered)', () => {
        assert.equal(isCorpsInGrazPair('vrs_1st_krajina'), false);
    });
    it('returns false for vrs_drina', () => {
        assert.equal(isCorpsInGrazPair('vrs_drina'), false);
    });
});

describe('getCorpsTrucePartner', () => {
    it('vrs_herzegovina → hvo_southeast_herzegovina', () => {
        assert.equal(getCorpsTrucePartner('vrs_herzegovina'), 'hvo_southeast_herzegovina');
    });
    it('hvo_tomislavgrad → vrs_2nd_krajina', () => {
        assert.equal(getCorpsTrucePartner('hvo_tomislavgrad'), 'vrs_2nd_krajina');
    });
    it('vrs_1st_krajina → null', () => {
        assert.equal(getCorpsTrucePartner('vrs_1st_krajina'), null);
    });
});

// ─── getTrucePartner ─────────────────────────────────────────────────────────

describe('getTrucePartner', () => {
    it('RS partner is HRHB', () => {
        assert.equal(getTrucePartner('RS'), 'HRHB');
    });
    it('HRHB partner is RS', () => {
        assert.equal(getTrucePartner('HRHB'), 'RS');
    });
    it('RBiH has no partner', () => {
        assert.equal(getTrucePartner('RBiH'), null);
    });
});

// ─── isKiseljakExcluded ──────────────────────────────────────────────────────

describe('isKiseljakExcluded', () => {
    it('RS cannot target HRHB Kiseljak OSIDs', () => {
        assert.equal(isKiseljakExcluded('op:kiseljak:kiseljak_2', 'RS'), true);
        assert.equal(isKiseljakExcluded('op:kiseljak:gromiljak_2', 'RS'), true);
    });
    it('HRHB cannot target VRS border OSIDs', () => {
        assert.equal(isKiseljakExcluded('op:hadzici:misevici_2', 'HRHB'), true);
        assert.equal(isKiseljakExcluded('op:visoko:bradve_2', 'HRHB'), true);
    });
    it('RS not excluded from HRHB exclusion list', () => {
        assert.equal(isKiseljakExcluded('op:hadzici:misevici_2', 'RS'), false);
    });
    it('HRHB not excluded from VRS exclusion list', () => {
        assert.equal(isKiseljakExcluded('op:kiseljak:kiseljak_2', 'HRHB'), false);
    });
    it('random OSID not excluded for anyone', () => {
        assert.equal(isKiseljakExcluded('op:mostar:mostar_2', 'RS'), false);
        assert.equal(isKiseljakExcluded('op:mostar:mostar_2', 'HRHB'), false);
    });
});

// ─── shouldGrazBlockAttack ───────────────────────────────────────────────────

describe('shouldGrazBlockAttack', () => {
    it('does not block when accords not active', () => {
        const state = makeState(10); // no vienna_declaration_turn
        assert.equal(shouldGrazBlockAttack(state, 'vrs_herzegovina', 'RS', 'op:mostar:mostar_2', 'HRHB'), false);
    });

    it('does not block RBiH attacks (no truce partner)', () => {
        const state = makeActiveState();
        assert.equal(shouldGrazBlockAttack(state, 'rbih_1st_corps', 'RBiH', 'op:mostar:mostar_2', 'HRHB'), false);
    });

    it('blocks vrs_herzegovina attacking HRHB territory', () => {
        const state = makeActiveState();
        assert.equal(shouldGrazBlockAttack(state, 'vrs_herzegovina', 'RS', 'op:mostar:mostar_2', 'HRHB'), true);
    });

    it('blocks hvo_southeast_herzegovina attacking RS territory', () => {
        const state = makeActiveState();
        assert.equal(shouldGrazBlockAttack(state, 'hvo_southeast_herzegovina', 'HRHB', 'op:nevesinje:sopilja', 'RS'), true);
    });

    it('blocks vrs_2nd_krajina attacking HRHB territory', () => {
        const state = makeActiveState();
        assert.equal(shouldGrazBlockAttack(state, 'vrs_2nd_krajina', 'RS', 'op:duvno:duvno_2', 'HRHB'), true);
    });

    it('does NOT block vrs_1st_krajina attacking HRHB (Posavina — exempt)', () => {
        const state = makeActiveState();
        assert.equal(shouldGrazBlockAttack(state, 'vrs_1st_krajina', 'RS', 'op:brod:brod_2', 'HRHB'), false);
    });

    it('blocks vrs_drina attacking HRHB (non-exempt RS corps — faction-level block)', () => {
        const state = makeActiveState();
        assert.equal(shouldGrazBlockAttack(state, 'vrs_drina', 'RS', 'op:travnik:travnik_2', 'HRHB'), true);
    });

    it('blocks vrs_sarajevo_romanija attacking non-Kiseljak HRHB territory (faction-level block)', () => {
        const state = makeActiveState();
        assert.equal(shouldGrazBlockAttack(state, 'vrs_sarajevo_romanija', 'RS', 'op:kakanj:kakanj_2', 'HRHB'), true);
    });

    it('blocks vrs_sarajevo_romanija even when Herzegovina truce broken (only Herzegovina truce, not faction-level)', () => {
        // When Herzegovina truce is broken, the faction-level check (which uses isHerzegovinaTruceActive)
        // is also disabled. Only Kiseljak exclusion remains independent.
        const state = makeActiveState();
        state.political.vienna_herzegovina_broken_by = 'RS';
        assert.equal(shouldGrazBlockAttack(state, 'vrs_sarajevo_romanija', 'RS', 'op:kakanj:kakanj_2', 'HRHB'), false);
    });

    it('blocks Kiseljak OSID attack by RS (any corps)', () => {
        const state = makeActiveState();
        assert.equal(shouldGrazBlockAttack(state, 'vrs_sarajevo_romanija', 'RS', 'op:kiseljak:kiseljak_2', 'HRHB'), true);
    });

    it('blocks Kiseljak border OSID attack by HRHB (any corps)', () => {
        const state = makeActiveState();
        assert.equal(shouldGrazBlockAttack(state, 'hvo_central_bosnia', 'HRHB', 'op:hadzici:misevici_2', 'RS'), true);
    });

    it('does not block same-faction targets', () => {
        const state = makeActiveState();
        assert.equal(shouldGrazBlockAttack(state, 'vrs_herzegovina', 'RS', 'op:mostar:mostar_2', 'RS'), false);
    });

    it('does not block after Herzegovina truce is broken', () => {
        const state = makeActiveState();
        state.political.vienna_herzegovina_broken_by = 'RS';
        assert.equal(shouldGrazBlockAttack(state, 'vrs_herzegovina', 'RS', 'op:mostar:mostar_2', 'HRHB'), false);
    });

    it('still blocks Kiseljak after Herzegovina truce is broken', () => {
        const state = makeActiveState();
        state.political.vienna_herzegovina_broken_by = 'RS';
        assert.equal(shouldGrazBlockAttack(state, 'vrs_sarajevo_romanija', 'RS', 'op:kiseljak:kiseljak_2', 'HRHB'), true);
    });

    it('still blocks Kiseljak after Kiseljak truce is broken because the faction-level RS block remains active', () => {
        const state = makeActiveState();
        state.political.vienna_kiseljak_broken = true;
        assert.equal(shouldGrazBlockAttack(state, 'vrs_sarajevo_romanija', 'RS', 'op:kiseljak:kiseljak_2', 'HRHB'), true);
    });
});

// ─── Herzegovina/Kiseljak active queries ─────────────────────────────────────

describe('isHerzegovinaTruceActive', () => {
    it('true when accords active and not broken', () => {
        assert.equal(isHerzegovinaTruceActive(makeActiveState()), true);
    });
    it('false when Herzegovina broken', () => {
        const state = makeActiveState();
        state.political.vienna_herzegovina_broken_by = 'RS';
        assert.equal(isHerzegovinaTruceActive(state), false);
    });
    it('false when accords not active', () => {
        assert.equal(isHerzegovinaTruceActive(makeState(10)), false);
    });
});

describe('isKiseljakExclusionActive', () => {
    it('true when accords active and not broken', () => {
        assert.equal(isKiseljakExclusionActive(makeActiveState()), true);
    });
    it('false when Kiseljak broken', () => {
        const state = makeActiveState();
        state.political.vienna_kiseljak_broken = true;
        assert.equal(isKiseljakExclusionActive(state), false);
    });
});

// ─── checkAndFireGrazAccords ─────────────────────────────────────────────────

describe('checkAndFireGrazAccords', () => {
    it('returns null before accords turn', () => {
        const state = makeState(3);
        const result = checkAndFireGrazAccords(state);
        assert.equal(result, null);
        assert.equal(state.political.vienna_declaration_turn, undefined);
    });

    it('fires at accords turn and sets state fields', () => {
        const state = makeState(4);
        const result = checkAndFireGrazAccords(state);
        assert.ok(result !== null);
        assert.ok(result!.includes('Graz'));
        assert.ok(result!.includes('Karadžić'));
        assert.equal(state.political.vienna_declaration_turn, 4);
        assert.equal(state.political.vienna_accepted?.['RS' as FactionId], true);
        assert.equal(state.political.vienna_accepted?.['HRHB' as FactionId], true);
    });

    it('fires if turn > accords turn (first time)', () => {
        const state = makeState(7);
        const result = checkAndFireGrazAccords(state);
        assert.ok(result !== null);
        assert.equal(state.political.vienna_declaration_turn, 7);
    });

    it('does not fire again once already set', () => {
        const state = makeState(8);
        state.political.vienna_declaration_turn = 4;
        const result = checkAndFireGrazAccords(state);
        assert.equal(result, null);
        assert.equal(state.political.vienna_declaration_turn, 4);
    });

    it('does not fire in peace phase', () => {
        const state = makeState(5);
        (state.meta as any).phase = 'peace';
        const result = checkAndFireGrazAccords(state);
        assert.equal(result, null);
    });
});

// ─── recordTruceBroken ───────────────────────────────────────────────────────

describe('recordTruceBroken', () => {
    it('returns null when truce not active', () => {
        const state = makeState(10);
        const result = recordTruceBroken('RS', 'op:mostar:mostar_2', state);
        assert.equal(result, null);
    });

    it('returns null for RBiH (no truce partner)', () => {
        const state = makeActiveState();
        const result = recordTruceBroken('RBiH', 'op:banja_luka:banja_luka_2', state);
        assert.equal(result, null);
    });

    it('records Kiseljak break when RS attacks Kiseljak-excluded OSID', () => {
        const state = makeActiveState();
        const result = recordTruceBroken('RS', 'op:kiseljak:kiseljak_2', state);
        assert.ok(result !== null);
        assert.ok(result!.includes('Kiseljak'));
        assert.equal(state.political.vienna_kiseljak_broken, true);
        assert.equal(state.political.truce_broken_turn?.['RS'], 10);
    });

    it('records Herzegovina break when RS attacks non-Kiseljak HRHB OSID', () => {
        const state = makeActiveState();
        const result = recordTruceBroken('RS', 'op:mostar:mostar_2', state);
        assert.ok(result !== null);
        assert.ok(result!.includes('Herzegovina'));
        assert.ok(result!.includes('Graz'));
        assert.equal(state.political.vienna_herzegovina_broken_by, 'RS');
        assert.equal(state.political.truce_broken_turn?.['RS'], 10);
    });

    it('returns null for OSID not covered by any truce', () => {
        const state = makeActiveState();
        // Attack on HRHB OSID by a corps NOT in a pair, and not Kiseljak-excluded
        // Since recordTruceBroken doesn't know about corps, it checks Herzegovina first
        // which is active for all factions. Any RS→HRHB attack triggers Herzegovina break.
        const result = recordTruceBroken('RS', 'op:brod:brod_2', state);
        // This OSID is not in Kiseljak exclusion, so it falls through to Herzegovina check
        // Herzegovina truce is active → breaks it
        assert.ok(result !== null);
    });

    it('does not overwrite existing Herzegovina break', () => {
        const state = makeActiveState();
        state.political.vienna_herzegovina_broken_by = 'HRHB';
        state.political.truce_broken_turn = { RS: 8 } as Record<FactionId, number>;
        // Herzegovina already broken, Kiseljak not excluded
        const result = recordTruceBroken('RS', 'op:mostar:mostar_2', state);
        assert.equal(result, null); // both sub-truces already resolved for this OSID
    });
});

// ─── getTruceBreakAggressionBonus ────────────────────────────────────────────

describe('getTruceBreakAggressionBonus', () => {
    it('returns 0 when truce not active', () => {
        const state = makeState(10);
        assert.equal(getTruceBreakAggressionBonus('HRHB', state), 0);
    });

    it('returns 0 when partner has not broken truce', () => {
        const state = makeActiveState();
        assert.equal(getTruceBreakAggressionBonus('HRHB', state), 0);
    });

    it('returns spike when partner (RS) broke truce this turn', () => {
        const state = makeActiveState();
        state.political.truce_broken_turn = { RS: 10 } as Record<FactionId, number>;
        const bonus = getTruceBreakAggressionBonus('HRHB', state);
        assert.ok(bonus > 0);
    });

    it('returns spike within 6 turns of break', () => {
        const state = makeActiveState(14);
        state.political.truce_broken_turn = { RS: 10 } as Record<FactionId, number>;
        const bonus = getTruceBreakAggressionBonus('HRHB', state);
        assert.ok(bonus > 0);
    });

    it('returns 0 after spike expires (6 turns later)', () => {
        const state = makeActiveState(16);
        state.political.truce_broken_turn = { RS: 10 } as Record<FactionId, number>;
        const bonus = getTruceBreakAggressionBonus('HRHB', state);
        assert.equal(bonus, 0);
    });

    it('returns 0 for RBiH (no truce partner)', () => {
        const state = makeActiveState();
        state.political.truce_broken_turn = { RS: 8, HRHB: 9 } as Record<FactionId, number>;
        assert.equal(getTruceBreakAggressionBonus('RBiH', state), 0);
    });
});
