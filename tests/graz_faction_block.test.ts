/**
 * Tests for Graz Accords: faction-level RS↔HRHB blocking and cold-front detection.
 * Covers shouldGrazBlockAttack (n697) and isColdFront (faction-level extension).
 */

import { describe, it, expect } from 'vitest';
import {
    shouldGrazBlockAttack,
} from '../src/sim/local_truces.js';
import { isColdFront } from '../src/sim/combat/frontline_attrition.js';
import type { FactionId, GameState, CorpsFrontSector, FormationState } from '../src/state/game_state.js';

function makeActiveState(turn: number = 10): GameState {
    return {
        schema_version: 1,
        meta: { phase: 'war', turn, scenario_start_date: '1992-04-06' },
        factions: [],
        political: {
            vienna_declaration_turn: 4,
            vienna_accepted: { RS: true, HRHB: true } as Record<FactionId, boolean>,
        },
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
    } as unknown as GameState;
}

describe('Graz faction-level RS→HRHB block (n697)', () => {
    it('blocks SRK (vrs_sarajevo_romanija) attacking non-Kiseljak HRHB territory', () => {
        const state = makeActiveState();
        // SRK pushed into Kakanj area — should be blocked by Graz faction-level check
        expect(shouldGrazBlockAttack(state, 'vrs_sarajevo_romanija', 'RS', 'op:kakanj:kakanj_2', 'HRHB')).toBe(true);
    });

    it('blocks vrs_drina attacking HRHB territory (non-exempt RS corps)', () => {
        const state = makeActiveState();
        expect(shouldGrazBlockAttack(state, 'vrs_drina', 'RS', 'op:travnik:travnik_2', 'HRHB')).toBe(true);
    });

    it('does NOT block vrs_1st_krajina attacking HRHB (Posavina — exempt)', () => {
        const state = makeActiveState();
        expect(shouldGrazBlockAttack(state, 'vrs_1st_krajina', 'RS', 'op:orasje:ostra_luka', 'HRHB')).toBe(false);
    });

    it('does NOT block vrs_2nd_krajina from faction-level (falls through to corps-pair which blocks it)', () => {
        // vrs_2nd_krajina is exempt from faction-level, but the corps-pair mechanism blocks it
        const state = makeActiveState();
        expect(shouldGrazBlockAttack(state, 'vrs_2nd_krajina', 'RS', 'op:duvno:duvno_2', 'HRHB')).toBe(true);
    });

    it('faction-level block clears when Herzegovina truce is broken', () => {
        // Faction-level check uses isHerzegovinaTruceActive — if Herzegovina broken, faction-level also clears
        const state = makeActiveState();
        state.political.vienna_herzegovina_broken_by = 'RS';
        expect(shouldGrazBlockAttack(state, 'vrs_sarajevo_romanija', 'RS', 'op:kakanj:kakanj_2', 'HRHB')).toBe(false);
    });

    it('Kiseljak exclusion still blocks SRK even for non-Kiseljak OSID (via faction-level)', () => {
        const state = makeActiveState();
        expect(shouldGrazBlockAttack(state, 'vrs_sarajevo_romanija', 'RS', 'op:kiseljak:kiseljak_2', 'HRHB')).toBe(true);
    });

    it('does not block when Graz accords not yet active', () => {
        const state = makeActiveState();
        state.political.vienna_declaration_turn = undefined as any;
        expect(shouldGrazBlockAttack(state, 'vrs_sarajevo_romanija', 'RS', 'op:kakanj:kakanj_2', 'HRHB')).toBe(false);
    });
});

describe('Graz faction-level HRHB→RS block (bilateral ceasefire)', () => {
    it('blocks HRHB corps attacking RS territory', () => {
        const state = makeActiveState();
        // HVO Southeast Herzegovina attacking RS territory is blocked once the east-Herzegovina truce is active.
        (state.political as any).graz_east_herzegovina_active_turn = 8;
        expect(shouldGrazBlockAttack(state, 'hvo_southeast_herzegovina', 'HRHB', 'op:stolac:stolac_2', 'RS')).toBe(true);
    });

    it('blocks non-east non-exempt HRHB corps attacking RS territory through the faction-level branch', () => {
        const state = makeActiveState();
        expect(shouldGrazBlockAttack(state, 'hvo_central_bosnia', 'HRHB', 'op:kotor_varos:kotor_varos_2', 'RS')).toBe(true);
    });

    it('does NOT block HVO Tomislavgrad late-war bypasses', () => {
        const state = makeActiveState();
        expect(shouldGrazBlockAttack(state, 'hvo_tomislavgrad', 'HRHB', 'op:kupres:kupres_2', 'RS')).toBe(false);
    });

    it('does NOT block HVO Northwest Bosnia (Posavina exempt)', () => {
        const state = makeActiveState();
        expect(shouldGrazBlockAttack(state, 'hvo_northwest_bosnia', 'HRHB', 'op:brcko:brcko_2', 'RS')).toBe(false);
    });

    it('blocks HVO SE Herzegovina at function level once east-Herz truce is active (op objective exemption is caller-side)', () => {
        const state = makeActiveState();
        // East-pair (hvo_southeast_herzegovina) is time-gated: blocked only after the
        // east-Herzegovina truce activates (Op Jackal ends). The Op Jackal objective
        // exemption is applied by callers (bot_brigade_ai_osid, bot_corps_directives)
        // which check if the target is an active operation objective before calling this.
        (state.political as any).graz_east_herzegovina_active_turn = 8;
        expect(shouldGrazBlockAttack(state, 'hvo_southeast_herzegovina', 'HRHB', 'op:stolac:stolac_2', 'RS')).toBe(true);
    });

    it('blocks HVO SE Herzegovina after Op Jackal ends', () => {
        const state = makeActiveState();
        (state.political as any).graz_east_herzegovina_active_turn = 8;
        expect(shouldGrazBlockAttack(state, 'hvo_southeast_herzegovina', 'HRHB', 'op:stolac:stolac_2', 'RS')).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// isColdFront — faction-level RS↔HRHB cold front detection
// ═══════════════════════════════════════════════════════════════════════════

function makeSector(overrides: Partial<CorpsFrontSector> = {}): CorpsFrontSector {
    return {
        id: 'sector_1',
        faction: 'RS',
        corps_id: 'vrs_drina',
        opposing_factions: ['HRHB'],
        assigned_brigade_ids: [],
        length_edges: 5,
        territory_osids: [],
        sub_segments: [],
        front_edge_osids: [],
        ...overrides,
    } as unknown as CorpsFrontSector;
}

function makeFormation(corpsId: string, faction: string = 'RS'): FormationState {
    return {
        id: 'test_brigade',
        faction,
        corps_id: corpsId,
        personnel: 1000,
        status: 'active',
    } as unknown as FormationState;
}

describe('isColdFront — faction-level RS↔HRHB extension', () => {
    it('returns true for any RS↔HRHB sector when Graz active (non-pair corps)', () => {
        const state = makeActiveState();
        const sector = makeSector({ faction: 'RS', corps_id: 'vrs_drina', opposing_factions: ['HRHB'] });
        const formation = makeFormation('vrs_drina', 'RS');
        expect(isColdFront(state, formation, sector)).toBe(true);
    });

    it('returns true for SRK facing HRHB', () => {
        const state = makeActiveState();
        const sector = makeSector({ faction: 'RS', corps_id: 'vrs_sarajevo_romanija', opposing_factions: ['HRHB'] });
        const formation = makeFormation('vrs_sarajevo_romanija', 'RS');
        expect(isColdFront(state, formation, sector)).toBe(true);
    });

    it('returns false for Posavina RS corps (exempt — active fighting)', () => {
        const state = makeActiveState();
        const sector = makeSector({ faction: 'RS', corps_id: 'vrs_1st_krajina', opposing_factions: ['HRHB'] });
        const formation = makeFormation('vrs_1st_krajina', 'RS');
        expect(isColdFront(state, formation, sector)).toBe(false);
    });

    it('returns false for Posavina HRHB corps (exempt — active fighting)', () => {
        const state = makeActiveState();
        const sector = makeSector({ faction: 'HRHB', corps_id: 'hvo_northwest_bosnia', opposing_factions: ['RS'] });
        const formation = makeFormation('hvo_northwest_bosnia', 'HRHB');
        expect(isColdFront(state, formation, sector)).toBe(false);
    });

    it('returns false for RS↔RBiH (Graz does not apply)', () => {
        const state = makeActiveState();
        const sector = makeSector({ faction: 'RS', corps_id: 'vrs_drina', opposing_factions: ['RBiH'] });
        const formation = makeFormation('vrs_drina', 'RS');
        expect(isColdFront(state, formation, sector)).toBe(false);
    });

    it('returns false when Graz not active', () => {
        const state = makeActiveState();
        state.political.vienna_declaration_turn = undefined as any;
        const sector = makeSector({ faction: 'RS', corps_id: 'vrs_drina', opposing_factions: ['HRHB'] });
        const formation = makeFormation('vrs_drina', 'RS');
        expect(isColdFront(state, formation, sector)).toBe(false);
    });

    it('returns false for east Herzegovina pair before Op Jackal ends', () => {
        const state = makeActiveState();
        // graz_east_herzegovina_active_turn is null → Op Jackal not complete
        const sector = makeSector({ faction: 'HRHB', corps_id: 'hvo_southeast_herzegovina', opposing_factions: ['RS'] });
        const formation = makeFormation('hvo_southeast_herzegovina', 'HRHB');
        expect(isColdFront(state, formation, sector)).toBe(false);
    });

    it('returns true for east Herzegovina pair after Op Jackal ends', () => {
        const state = makeActiveState();
        (state.political as any).graz_east_herzegovina_active_turn = 8;
        const sector = makeSector({ faction: 'HRHB', corps_id: 'hvo_southeast_herzegovina', opposing_factions: ['RS'] });
        const formation = makeFormation('hvo_southeast_herzegovina', 'HRHB');
        expect(isColdFront(state, formation, sector)).toBe(true);
    });
});

describe('Graz brigade-level attack order filter', () => {
    it('Graz filter removes RS→HRHB attack orders at brigade level', () => {
        // This tests the concept — the actual filter is in bot_brigade_ai_osid.ts
        // Verify shouldGrazBlockAttack blocks vrs_2nd_krajina attacking HRHB territory
        const state = makeActiveState();
        expect(shouldGrazBlockAttack(state, 'vrs_2nd_krajina', 'RS', 'op:prozor:prozor_2', 'HRHB')).toBe(true);
    });

    it('does not remove RS→RBiH attack orders (not covered by Graz)', () => {
        const state = makeActiveState();
        expect(shouldGrazBlockAttack(state, 'vrs_2nd_krajina', 'RS', 'op:bugojno:bugojno_2', 'RBiH')).toBe(false);
    });
});
