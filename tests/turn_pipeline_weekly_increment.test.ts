/**
 * Phase A1.2: meta.turn increments by exactly +1; reject non-integer or negative.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { CURRENT_SCHEMA_VERSION, GameState } from '../src/state/game_state.js';
import { runOneTurn } from '../src/state/turn_pipeline.js';

const baseState: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 0, seed: 'initial-seed' },
    factions: [],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
};

test('meta.turn increments by exactly +1 per turn', () => {
    const { state: s1 } = runOneTurn(baseState, { seed: 'a' });
    assert.strictEqual(s1.meta.turn, 1, 'After 1 turn, meta.turn should be 1');

    const { state: s2 } = runOneTurn(s1, { seed: 'b' });
    assert.strictEqual(s2.meta.turn, 2, 'After 2 turns, meta.turn should be 2');
});

test('meta.turn remains integer >= 0', () => {
    const { state } = runOneTurn(baseState, { seed: 'x' });
    assert.ok(Number.isInteger(state.meta.turn), 'meta.turn must be integer');
    assert.ok(state.meta.turn >= 0, 'meta.turn must be non-negative');
});

test('input state is not mutated', () => {
    const input = { ...baseState };
    runOneTurn(input, { seed: 'y' });
    assert.strictEqual(input.meta.turn, 0, 'Input state must remain unchanged');
});
