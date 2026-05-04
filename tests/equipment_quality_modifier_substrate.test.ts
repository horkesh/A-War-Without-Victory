/**
 * LANE-NIGHTSHIFT-EQUIPMENT-QUALITY-MODIFIER-SUBSTRATE
 *
 * Substrate contracts for the new `equipment_quality_modifier` effect kind.
 * Mirrors the recruitment_modifier precedent in tests/consequence_consumers.test.ts.
 *
 * Covers:
 *   1. writer pushes correct entry shape (faction, multiplier, expires_turn)
 *   2. cleanupExpiredEventModifiers GCs expired entries
 *   3. getActiveEquipmentQualityMultiplier returns 1.0 when nothing active
 *   4. returns product of active multipliers for the queried faction
 *   5. faction-scoped: other factions' modifiers are ignored
 *   6. deterministic: same input → same output across two evaluations
 *
 * No combat-math integration test here — that lives implicitly in the 40w smoke
 * (must be byte-stable) and explicitly when callers run scenarios with the
 * event #11 firing.
 */
import { describe, it, expect } from 'vitest';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import {
    cleanupExpiredEventModifiers,
    getActiveEquipmentQualityMultiplier,
} from '../src/sim/events/active_modifiers.js';
import type { GameState } from '../src/state/game_state.js';

function makeState(): GameState {
    return {
        schema_version: 1,
        meta: { turn: 10, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'a' } as GameState['meta'],
        factions: [
            { id: 'RBiH', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 40 },
            heavy_munitions_reserve: { RBiH: 30, RS: 50, HRHB: 20 },
            fired_event_ids: [],
        } as unknown as GameState['military'],
        political: {
            war_alliance_rbih_hrhb: 0.5,
        } as GameState['political'],
    } as unknown as GameState;
}

describe('equipment_quality_modifier writer', () => {
    it('pushes a correctly shaped entry with expires_turn = currentTurn + duration_turns', () => {
        const state = makeState();
        // currentTurn comes from state.meta.turn (10). duration 30 → expires 40.
        applyEventEffects(state, [
            { kind: 'equipment_quality_modifier', faction: 'RBiH', multiplier: 1.05, duration_turns: 30 },
        ]);
        const mods = state.military.equipment_quality_modifiers;
        expect(mods).toBeDefined();
        expect(mods).toHaveLength(1);
        expect(mods![0]).toEqual({
            faction: 'RBiH',
            multiplier: 1.05,
            expires_turn: 40,
        });
    });
});

describe('cleanupExpiredEventModifiers GC', () => {
    it('drops equipment_quality_modifier entries whose expires_turn <= currentTurn', () => {
        const state = makeState();
        (state.military as unknown as {
            equipment_quality_modifiers: Array<{ faction: string; multiplier: number; expires_turn: number }>;
        }).equipment_quality_modifiers = [
            { faction: 'RBiH', multiplier: 1.05, expires_turn: 8 },   // expired (<=10)
            { faction: 'RBiH', multiplier: 1.10, expires_turn: 10 },  // expired (==currentTurn → <=)
            { faction: 'RBiH', multiplier: 1.20, expires_turn: 11 },  // active (>10)
        ];
        cleanupExpiredEventModifiers(state, 10);
        expect(state.military.equipment_quality_modifiers).toHaveLength(1);
        expect(state.military.equipment_quality_modifiers![0].multiplier).toBe(1.20);
    });
});

describe('getActiveEquipmentQualityMultiplier', () => {
    it('returns 1.0 (no-op) when no modifiers are active', () => {
        const state = makeState();
        expect(getActiveEquipmentQualityMultiplier(state, 'RBiH', 10)).toBe(1.0);
        expect(getActiveEquipmentQualityMultiplier(state, 'RS', 10)).toBe(1.0);
        expect(getActiveEquipmentQualityMultiplier(state, 'HRHB', 10)).toBe(1.0);
    });

    it('returns the product of active multipliers for the queried faction', () => {
        const state = makeState();
        applyEventEffects(state, [
            { kind: 'equipment_quality_modifier', faction: 'RBiH', multiplier: 1.05, duration_turns: 30 },
            { kind: 'equipment_quality_modifier', faction: 'RBiH', multiplier: 1.10, duration_turns: 30 },
        ]);
        // 1.05 * 1.10 = 1.155
        expect(getActiveEquipmentQualityMultiplier(state, 'RBiH', 10)).toBeCloseTo(1.155);
    });

    it('is faction-scoped (RS modifier does not bleed into RBiH or HRHB)', () => {
        const state = makeState();
        applyEventEffects(state, [
            { kind: 'equipment_quality_modifier', faction: 'RS', multiplier: 2.0, duration_turns: 30 },
        ]);
        expect(getActiveEquipmentQualityMultiplier(state, 'RBiH', 10)).toBe(1.0);
        expect(getActiveEquipmentQualityMultiplier(state, 'HRHB', 10)).toBe(1.0);
        expect(getActiveEquipmentQualityMultiplier(state, 'RS', 10)).toBe(2.0);
    });

    it('is deterministic — repeated calls on identical state yield identical results', () => {
        const state = makeState();
        applyEventEffects(state, [
            { kind: 'equipment_quality_modifier', faction: 'RBiH', multiplier: 1.05, duration_turns: 30 },
            { kind: 'equipment_quality_modifier', faction: 'HRHB', multiplier: 1.07, duration_turns: 30 },
            { kind: 'equipment_quality_modifier', faction: 'RBiH', multiplier: 1.02, duration_turns: 30 },
        ]);
        const a1 = getActiveEquipmentQualityMultiplier(state, 'RBiH', 10);
        const a2 = getActiveEquipmentQualityMultiplier(state, 'RBiH', 10);
        const b1 = getActiveEquipmentQualityMultiplier(state, 'HRHB', 10);
        const b2 = getActiveEquipmentQualityMultiplier(state, 'HRHB', 10);
        const c1 = getActiveEquipmentQualityMultiplier(state, 'RS', 10);
        const c2 = getActiveEquipmentQualityMultiplier(state, 'RS', 10);
        expect(a1).toBe(a2);
        expect(b1).toBe(b2);
        expect(c1).toBe(c2);
        expect(a1).toBeCloseTo(1.05 * 1.02);
        expect(b1).toBeCloseTo(1.07);
        expect(c1).toBe(1.0);
    });

    it('ignores expired modifiers based on `expires_turn > currentTurn` semantics', () => {
        const state = makeState();
        (state.military as unknown as {
            equipment_quality_modifiers: Array<{ faction: string; multiplier: number; expires_turn: number }>;
        }).equipment_quality_modifiers = [
            { faction: 'RBiH', multiplier: 2.0, expires_turn: 10 }, // expired (<=10)
            { faction: 'RBiH', multiplier: 1.5, expires_turn: 11 }, // active (>10)
        ];
        expect(getActiveEquipmentQualityMultiplier(state, 'RBiH', 10)).toBeCloseTo(1.5);
    });
});
