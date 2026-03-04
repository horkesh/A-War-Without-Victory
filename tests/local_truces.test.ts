/**
 * Tests for Vienna Declaration / Local Truces mechanic.
 * Covers: declaration firing, truce partner logic, exception municipalities,
 * truce-break detection, and aggression spike.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    VIENNA_DECLARATION_TURN,
    TRUCE_EXCEPTION_MUNICIPALITIES,
    isViennaDeclarationActive,
    isTruceException,
    getTrucePartner,
    getTruceBreakAggressionBonus,
    checkAndFireViennaDeclaration,
    recordTruceBroken,
} from '../src/sim/local_truces.js';
import type { GameState } from '../src/state/game_state.js';

// ─── Minimal state factory ────────────────────────────────────────────────────

function makeState(turn: number, overrides: Partial<GameState> = {}): GameState {
    return {
        schema_version: 1,
        meta: { phase: 'war', turn, scenario_start_date: '1992-04-06' },
        factions: [],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        ...overrides,
    } as unknown as GameState;
}

// ─── Constants ────────────────────────────────────────────────────────────────

describe('VIENNA_DECLARATION_TURN', () => {
    it('should be week 4', () => {
        assert.equal(VIENNA_DECLARATION_TURN, 4);
    });
});

describe('TRUCE_EXCEPTION_MUNICIPALITIES', () => {
    it('includes Posavina corridor', () => {
        assert.ok(TRUCE_EXCEPTION_MUNICIPALITIES.has('brod'));
        assert.ok(TRUCE_EXCEPTION_MUNICIPALITIES.has('derventa'));
        assert.ok(TRUCE_EXCEPTION_MUNICIPALITIES.has('odzak'));
        assert.ok(TRUCE_EXCEPTION_MUNICIPALITIES.has('bosanski_samac'));
        assert.ok(TRUCE_EXCEPTION_MUNICIPALITIES.has('orasje'));
    });
    it('includes Jajce', () => {
        assert.ok(TRUCE_EXCEPTION_MUNICIPALITIES.has('jajce'));
    });
    it('does NOT include central Bosnia municipalities covered by truce', () => {
        assert.ok(!TRUCE_EXCEPTION_MUNICIPALITIES.has('travnik'));
        assert.ok(!TRUCE_EXCEPTION_MUNICIPALITIES.has('mostar'));
        assert.ok(!TRUCE_EXCEPTION_MUNICIPALITIES.has('kiseljak'));
    });
});

// ─── isViennaDeclarationActive ────────────────────────────────────────────────

describe('isViennaDeclarationActive', () => {
    it('returns false when field not set', () => {
        const state = makeState(10);
        assert.equal(isViennaDeclarationActive(state), false);
    });

    it('returns false when current turn < declaration turn', () => {
        const state = makeState(3);
        state.vienna_declaration_turn = 4;
        assert.equal(isViennaDeclarationActive(state), false);
    });

    it('returns true when current turn == declaration turn', () => {
        const state = makeState(4);
        state.vienna_declaration_turn = 4;
        assert.equal(isViennaDeclarationActive(state), true);
    });

    it('returns true long after declaration', () => {
        const state = makeState(40);
        state.vienna_declaration_turn = 4;
        assert.equal(isViennaDeclarationActive(state), true);
    });
});

// ─── isTruceException ────────────────────────────────────────────────────────

describe('isTruceException', () => {
    it('returns true for Posavina corridor OSID', () => {
        assert.equal(isTruceException('op:brod:brod_2'), true);
        assert.equal(isTruceException('op:derventa:derventa_2'), true);
        assert.equal(isTruceException('op:odzak:odzak_2'), true);
        assert.equal(isTruceException('op:jajce:jajce_2'), true);
    });

    it('returns false for truce-covered OSID', () => {
        assert.equal(isTruceException('op:mostar:mostar_2'), false);
        assert.equal(isTruceException('op:travnik:travnik_2'), false);
        assert.equal(isTruceException('op:kiseljak:kiseljak_2'), false);
    });

    it('returns false for invalid/short OSID', () => {
        assert.equal(isTruceException('invalid'), false);
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

// ─── checkAndFireViennaDeclaration ────────────────────────────────────────────

describe('checkAndFireViennaDeclaration', () => {
    it('returns null before declaration turn', () => {
        const state = makeState(3);
        const result = checkAndFireViennaDeclaration(state);
        assert.equal(result, null);
        assert.equal(state.vienna_declaration_turn, undefined);
    });

    it('fires at declaration turn and sets state field', () => {
        const state = makeState(4);
        const result = checkAndFireViennaDeclaration(state);
        assert.ok(result !== null);
        assert.ok(result!.includes('Vienna'));
        assert.equal(state.vienna_declaration_turn, 4);
    });

    it('fires if turn > declaration turn (first time)', () => {
        const state = makeState(7);
        const result = checkAndFireViennaDeclaration(state);
        assert.ok(result !== null);
        assert.equal(state.vienna_declaration_turn, 7);
    });

    it('does not fire again once already set', () => {
        const state = makeState(8);
        state.vienna_declaration_turn = 4;
        const result = checkAndFireViennaDeclaration(state);
        assert.equal(result, null);
        assert.equal(state.vienna_declaration_turn, 4); // unchanged
    });

    it('does not fire in peace phase', () => {
        const state = makeState(5);
        (state.meta as any).phase = 'peace';
        const result = checkAndFireViennaDeclaration(state);
        assert.equal(result, null);
    });
});

// ─── recordTruceBroken ───────────────────────────────────────────────────────

describe('recordTruceBroken', () => {
    it('returns null when truce not active', () => {
        const state = makeState(10);
        // vienna_declaration_turn not set → truce not active
        const result = recordTruceBroken('RS', 'op:mostar:mostar_2', state);
        assert.equal(result, null);
    });

    it('returns null for RBiH (no truce partner)', () => {
        const state = makeState(10);
        state.vienna_declaration_turn = 4;
        const result = recordTruceBroken('RBiH', 'op:banja_luka:banja_luka_2', state);
        assert.equal(result, null);
    });

    it('returns null for exception municipalities (Posavina)', () => {
        const state = makeState(10);
        state.vienna_declaration_turn = 4;
        const result = recordTruceBroken('RS', 'op:brod:brod_2', state);
        assert.equal(result, null);
    });

    it('records RS truce break against HRHB cell', () => {
        const state = makeState(10);
        state.vienna_declaration_turn = 4;
        const result = recordTruceBroken('RS', 'op:mostar:mostar_2', state);
        assert.ok(result !== null);
        assert.ok(result!.includes('breaking'));
        assert.equal(state.truce_broken_turn?.['RS'], 10);
    });

    it('records HRHB truce break against RS cell', () => {
        const state = makeState(12);
        state.vienna_declaration_turn = 4;
        const result = recordTruceBroken('HRHB', 'op:banja_luka:banja_luka_2', state);
        assert.ok(result !== null);
        assert.equal(state.truce_broken_turn?.['HRHB'], 12);
    });

    it('does not overwrite existing break (only records first)', () => {
        const state = makeState(15);
        state.vienna_declaration_turn = 4;
        state.truce_broken_turn = { RS: 10 };
        const result = recordTruceBroken('RS', 'op:mostar:mostar_2', state);
        assert.equal(result, null); // already broken, no new warning
        assert.equal(state.truce_broken_turn?.['RS'], 10); // unchanged
    });
});

// ─── getTruceBreakAggressionBonus ────────────────────────────────────────────

describe('getTruceBreakAggressionBonus', () => {
    it('returns 0 when truce not active', () => {
        const state = makeState(10);
        assert.equal(getTruceBreakAggressionBonus('HRHB', state), 0);
    });

    it('returns 0 when partner has not broken truce', () => {
        const state = makeState(10);
        state.vienna_declaration_turn = 4;
        assert.equal(getTruceBreakAggressionBonus('HRHB', state), 0);
    });

    it('returns spike when partner (RS) broke truce this turn', () => {
        const state = makeState(10);
        state.vienna_declaration_turn = 4;
        state.truce_broken_turn = { RS: 10 };
        // HRHB gets the spike because RS broke the truce
        const bonus = getTruceBreakAggressionBonus('HRHB', state);
        assert.ok(bonus > 0);
    });

    it('returns spike within 6 turns of break', () => {
        const state = makeState(14); // 14 - 10 = 4 < 6
        state.vienna_declaration_turn = 4;
        state.truce_broken_turn = { RS: 10 };
        const bonus = getTruceBreakAggressionBonus('HRHB', state);
        assert.ok(bonus > 0);
    });

    it('returns 0 after spike expires (6 turns later)', () => {
        const state = makeState(16); // 16 - 10 = 6 → expired
        state.vienna_declaration_turn = 4;
        state.truce_broken_turn = { RS: 10 };
        const bonus = getTruceBreakAggressionBonus('HRHB', state);
        assert.equal(bonus, 0);
    });

    it('returns 0 for RBiH (no truce partner)', () => {
        const state = makeState(10);
        state.vienna_declaration_turn = 4;
        state.truce_broken_turn = { RS: 8, HRHB: 9 };
        assert.equal(getTruceBreakAggressionBonus('RBiH', state), 0);
    });
});
