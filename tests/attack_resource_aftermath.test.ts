/**
 * Tests for src/sim/combat/attack_resource_aftermath.ts
 *
 * Covers: applyCombatFatigue
 * Extracted from attack_resolution_osid.ts (tranche 6).
 */

import { describe, expect, it } from 'vitest';
import {
    applyCombatFatigue,
    FATIGUE_ATTACKER,
    FATIGUE_DEFENDER,
} from '../src/sim/combat/attack_resource_aftermath.js';
import { FATIGUE_MAX } from '../src/state/formation_constants.js';
import type { FactionId, FormationState, GameState, BrigadeComposition } from '../src/state/game_state.js';
import {
    makeAttackComposition as makeComposition,
    makeAttackFormation as makeFormation,
} from './_helpers/combat.js';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers (extracted to tests/_helpers/combat.ts; aliased for local readability)
// ═══════════════════════════════════════════════════════════════════════════

// Supply-expenditure and facility-damage tests retired 2026-11-17 with the supply-reserve
// economy (Fable consult 6).

// ═══════════════════════════════════════════════════════════════════════════
// applyCombatFatigue
// ═══════════════════════════════════════════════════════════════════════════

describe('applyCombatFatigue', () => {
    it('applies FATIGUE_ATTACKER (2) to all attackers in defended combat', () => {
        const a1 = makeFormation({ id: 'a1', ops: { fatigue: 5, last_supplied_turn: null } });
        const a2 = makeFormation({ id: 'a2', ops: { fatigue: 10, last_supplied_turn: null } });
        const def = makeFormation({ id: 'def' });
        applyCombatFatigue({ attackerFormations: [a1, a2], defenderFormation: def });
        expect(a1.ops!.fatigue).toBe(5 + FATIGUE_ATTACKER);
        expect(a2.ops!.fatigue).toBe(10 + FATIGUE_ATTACKER);
    });

    it('applies FATIGUE_DEFENDER (1) to defender', () => {
        const def = makeFormation({ id: 'def', ops: { fatigue: 8, last_supplied_turn: null } });
        applyCombatFatigue({ attackerFormations: [], defenderFormation: def });
        expect(def.ops!.fatigue).toBe(8 + FATIGUE_DEFENDER);
    });

    it('applies defender fatigue to the primary defender only', () => {
        const primary = makeFormation({ id: 'def-a', ops: { fatigue: 8, last_supplied_turn: null } });
        const reserve = makeFormation({ id: 'def-b', ops: { fatigue: 4, last_supplied_turn: null } });

        applyCombatFatigue({
            attackerFormations: [],
            defenderFormation: primary,
        });

        expect(primary.ops!.fatigue).toBe(8 + FATIGUE_DEFENDER);
        expect(reserve.ops!.fatigue).toBe(4);
    });

    it('initializes ops if missing', () => {
        const a1 = makeFormation({ id: 'a1' });
        delete (a1 as any).ops;
        const def = makeFormation({ id: 'def' });
        delete (def as any).ops;

        applyCombatFatigue({ attackerFormations: [a1], defenderFormation: def });
        expect(a1.ops).toBeDefined();
        expect(a1.ops!.fatigue).toBe(FATIGUE_ATTACKER);
        expect(a1.ops!.last_supplied_turn).toBeNull();
        expect(def.ops).toBeDefined();
        expect(def.ops!.fatigue).toBe(FATIGUE_DEFENDER);
        expect(def.ops!.last_supplied_turn).toBeNull();
    });

    it('caps at FATIGUE_MAX', () => {
        const a1 = makeFormation({ id: 'a1', ops: { fatigue: FATIGUE_MAX - 1, last_supplied_turn: null } });
        const def = makeFormation({ id: 'def', ops: { fatigue: FATIGUE_MAX, last_supplied_turn: null } });

        applyCombatFatigue({ attackerFormations: [a1], defenderFormation: def });
        // a1: 29 + 2 = 31, capped to 30
        expect(a1.ops!.fatigue).toBe(FATIGUE_MAX);
        // def: 30 + 1 = 31, capped to 30
        expect(def.ops!.fatigue).toBe(FATIGUE_MAX);
    });

    it('applies reduced attacker fatigue when no defender is present', () => {
        const a1 = makeFormation({ id: 'a1', ops: { fatigue: 0, last_supplied_turn: null } });
        applyCombatFatigue({ attackerFormations: [a1], defenderFormation: null });
        expect(a1.ops!.fatigue).toBe(0.5);
        // No crash, no defender mutation
    });
});
