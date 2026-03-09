import assert from 'node:assert';
import { test } from 'node:test';

import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { ensureBrigadeFrontAssignments, isBrigadeAssignedToFront } from '../src/sim/combat/front_assignment.js';

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 8, seed: 'test', phase: 'war' } as any,
        factions: [],
        formations: {
            b1: {
                id: 'b1',
                faction: 'RBiH',
                name: 'B1',
                created_turn: 1,
                status: 'active',
                assignment: null,
                kind: 'brigade',
                personnel: 1000,
                cohesion: 60,
                tags: [],
                location_osid: 'op:test_mun:s1',
            },
            b2: {
                id: 'b2',
                faction: 'RS',
                name: 'B2',
                created_turn: 1,
                status: 'active',
                assignment: null,
                kind: 'brigade',
                personnel: 1000,
                cohesion: 60,
                tags: [],
                location_osid: 'op:test_mun:s2',
            },
        } as any,
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        brigade_aor: {
            S1: 'b1',
            S2: 'b2',
        },
        assignable_front_segments: [
            {
                front_id: 'RBiH__RS__S1__S2',
                edge_ids: ['S1__S2'],
                side_a: 'RBiH',
                side_b: 'RS',
                length_edges: 1,
            },
        ],
    } as GameState;
}

test('ensureBrigadeFrontAssignments assigns brigades deterministically', () => {
    const state = makeState();
    ensureBrigadeFrontAssignments(state);
    assert.strictEqual(state.military.brigade_front_assignment?.b1, 'RBiH__RS__S1__S2');
    assert.strictEqual(state.military.brigade_front_assignment?.b2, 'RBiH__RS__S1__S2');
    assert.ok(isBrigadeAssignedToFront(state, 'b1'));
    assert.ok(isBrigadeAssignedToFront(state, 'b2'));
});

test('ensureBrigadeFrontAssignments repairs invalid assignments', () => {
    const state = makeState();
    state.military.brigade_front_assignment = { b1: 'MISSING_FRONT', b2: null };
    ensureBrigadeFrontAssignments(state);
    assert.strictEqual(state.military.brigade_front_assignment?.b1, 'RBiH__RS__S1__S2');
    assert.strictEqual(state.military.brigade_front_assignment?.b2, 'RBiH__RS__S1__S2');
});

