/**
 * Phase A1.2: Assert exact phase order including fragmentation_resolution.
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

const EXPECTED_ORDER = [
    'directives',
    'deployments',
    'military_interaction',
    'fragmentation_resolution',
    'supply_resolution',
    'political_effects',
    'exhaustion_update',
    'persistence'
];

test('runOneTurn executes phases in exact roadmap order', () => {
    const { phasesExecuted } = runOneTurn(baseState, { seed: 'test-seed' });
    assert.deepStrictEqual(
        phasesExecuted,
        EXPECTED_ORDER,
        'Phase order must match ROADMAP_v1_0.md and Systems Manual §1'
    );
});

test('fragmentation_resolution is present in pipeline', () => {
    const { phasesExecuted } = runOneTurn(baseState, { seed: 'test-seed' });
    assert.ok(
        phasesExecuted.includes('fragmentation_resolution'),
        'fragmentation_resolution must be in pipeline'
    );
    assert.strictEqual(
        phasesExecuted.indexOf('fragmentation_resolution'),
        3,
        'fragmentation_resolution must be at index 3 (4th phase)'
    );
});
