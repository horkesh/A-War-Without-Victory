/**
 * Phase A1.1: Denylisted derived-state keys are rejected by validateGameStateShape.
 * Engine Invariants Section 13.1: no serialization of derived states.
 */

import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';

function baseState(): Record<string, unknown> {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'x' },
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as any,
        political: {
            political_controllers: {},
        } as any,
        displacement: {} as any,
    };
}

describe('validateGameStateShape denylisted derived fields', () => {
    it('rejects state with top-level "fronts" key', () => {
        const state = baseState();
        state.fronts = [];
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        expect((result as { errors: string[] }).errors.some(e => e.includes('fronts'))).toBe(true);
    });

    it('rejects state with top-level "corridors" key', () => {
        const state = baseState();
        state.corridors = {};
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        expect((result as { errors: string[] }).errors.some(e => e.includes('corridors'))).toBe(true);
    });

    it('rejects state with top-level "derived" key', () => {
        const state = baseState();
        state.derived = {};
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        expect((result as { errors: string[] }).errors.some(e => e.includes('derived'))).toBe(true);
    });

    it('rejects state with top-level "cache" key', () => {
        const state = baseState();
        state.cache = {};
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        expect((result as { errors: string[] }).errors.some(e => e.includes('cache'))).toBe(true);
    });

    // Phase E: AoR and rear zone are derived; must not be serialized (Engine Invariants Section 13.1).
    it('rejects state with top-level "phase_e_aor_membership" key', () => {
        const state = baseState();
        (state as Record<string, unknown>).phase_e_aor_membership = { by_formation: {} };
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        expect((result as { errors: string[] }).errors.some(e => e.includes('phase_e_aor_membership'))).toBe(true);
    });

    it('rejects state with top-level "phase_e_aor_influence" key', () => {
        const state = baseState();
        (state as Record<string, unknown>).phase_e_aor_influence = {};
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        expect((result as { errors: string[] }).errors.some(e => e.includes('phase_e_aor_influence'))).toBe(true);
    });

    it('rejects state with top-level "phase_e_rear_zone" key', () => {
        const state = baseState();
        (state as Record<string, unknown>).phase_e_rear_zone = { settlement_ids: [] };
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        expect((result as { errors: string[] }).errors.some(e => e.includes('phase_e_rear_zone'))).toBe(true);
    });
});
