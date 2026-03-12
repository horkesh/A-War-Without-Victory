/**
 * Vitest tests for validateGameStateShape partition root validation.
 * Covers: military, political, political.political_controllers, displacement (optional).
 */

import { describe, it, expect } from 'vitest';
import { validateGameStateShape } from '../src/state/validateGameState.js';

/** Minimal valid state object that passes all shape checks. */
function minimalValid(): Record<string, unknown> {
    return {
        schema_version: 1,
        meta: { turn: 0, seed: 'test-fixture' },
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {}
        },
        political: {
            political_controllers: {
                'SID_001': 'RBiH',
                'SID_002': null
            }
        },
        displacement: {}
    };
}

describe('validateGameStateShape — partition root validation', () => {
    it('valid state passes', () => {
        const result = validateGameStateShape(minimalValid());
        expect(result.ok).toBe(true);
    });

    it('missing military fails', () => {
        const state = minimalValid();
        delete state.military;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('state.military must be a non-null object');
        }
    });

    it('null military fails', () => {
        const state = minimalValid();
        state.military = null as any;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('state.military must be a non-null object');
        }
    });

    it('missing political fails', () => {
        const state = minimalValid();
        delete state.political;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('state.political must be a non-null object');
        }
    });

    it('null political fails', () => {
        const state = minimalValid();
        state.political = null as any;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('state.political must be a non-null object');
        }
    });

    it('missing political.political_controllers fails', () => {
        const state = minimalValid();
        state.political = { /* no political_controllers */ };
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('state.political.political_controllers must be a non-null object');
        }
    });

    it('null political.political_controllers fails', () => {
        const state = minimalValid();
        (state.political as any).political_controllers = null;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('state.political.political_controllers must be a non-null object');
        }
    });

    it('missing displacement still passes (optional)', () => {
        const state = minimalValid();
        delete state.displacement;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(true);
    });

    it('undefined displacement still passes (optional)', () => {
        const state = minimalValid();
        state.displacement = undefined;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(true);
    });

    it('null displacement fails (must be object when present)', () => {
        const state = minimalValid();
        state.displacement = null as any;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('state.displacement must be an object when present');
        }
    });

    it('array displacement fails', () => {
        const state = minimalValid();
        state.displacement = [] as any;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('state.displacement must be an object when present');
        }
    });
});
