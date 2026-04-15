/**
 * Phase A1.2: Assert exact phase order including fragmentation_resolution.
 */

import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import { runOneTurn } from '../src/state/turn_pipeline.js';

const baseState: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 0, seed: 'initial-seed' },
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

const EXPECTED_ORDER = [
    'directives',
    'deployments',
    'military_interaction',
    'fragmentation_resolution',
    'supply_resolution',
    'political_effects',
    'exhaustion_update',
    'persistence',
];

describe('runOneTurn phase order', () => {
    it('executes phases in exact roadmap order', () => {
        const { phasesExecuted } = runOneTurn(baseState, { seed: 'test-seed' });
        expect(phasesExecuted).toEqual(EXPECTED_ORDER);
    });

    it('includes fragmentation_resolution at index 3', () => {
        const { phasesExecuted } = runOneTurn(baseState, { seed: 'test-seed' });
        expect(phasesExecuted.includes('fragmentation_resolution')).toBe(true);
        expect(phasesExecuted.indexOf('fragmentation_resolution')).toBe(3);
    });
});
