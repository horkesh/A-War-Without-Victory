/**
 * Phase A1.1: Lock canonical GameState shape contract.
 * - Minimal valid GameState fixture passes validateGameStateShape.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';

/** Minimal valid GameState for Phase A1.1 shape (meta + optional political_controllers). */
function minimalValidGameState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'phase-a1.1-fixture' },
        factions: [],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: {
            'SID_001': 'RBiH',
            'SID_002': null
        }
    };
}

test('validateGameStateShape returns ok for minimal valid GameState', () => {
    const state = minimalValidGameState();
    const result = validateGameStateShape(state);
    assert.strictEqual(result.ok, true, result.ok ? '' : (result as { errors: string[] }).errors.join('; '));
});

test('validateGameStateShape returns ok when meta.phase is set to known value', () => {
    const state = minimalValidGameState();
    state.meta.phase = 'phase_0';
    const result = validateGameStateShape(state);
    assert.strictEqual(result.ok, true);
});

test('validateGameStateShape returns ok when political_controllers is absent (optional)', () => {
    const state = minimalValidGameState();
    const stateObj = state as unknown as Record<string, unknown>;
    delete stateObj.political_controllers;
    const result = validateGameStateShape(stateObj);
    assert.strictEqual(result.ok, true);
});
