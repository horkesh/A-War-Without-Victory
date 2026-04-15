/**
 * Phase A1.1: Lock canonical GameState shape contract.
 * - Minimal valid GameState fixture passes validateGameStateShape.
 */

import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';

/** Minimal valid GameState for Phase A1.1 shape. */
function minimalValidGameState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'phase-a1.1-fixture' },
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
            political_controllers: {
                SID_001: 'RBiH',
                SID_002: null,
            },
        } as any,
        displacement: {} as any,
    };
}

describe('validateGameStateShape canonical shape', () => {
    it('returns ok for minimal valid GameState', () => {
        const state = minimalValidGameState();
        const result = validateGameStateShape(state);
        expect(result.ok, result.ok ? '' : (result as { errors: string[] }).errors.join('; ')).toBe(true);
    });

    it('returns ok when meta.phase is set to known value', () => {
        const state = minimalValidGameState();
        state.meta.phase = 'peace';
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(true);
    });

    it('returns ok when displacement is absent (optional)', () => {
        const state = minimalValidGameState();
        const stateObj = state as unknown as Record<string, unknown>;
        delete stateObj.displacement;
        const result = validateGameStateShape(stateObj);
        expect(result.ok).toBe(true);
    });
});
