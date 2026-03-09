import assert from 'node:assert';
import { test } from 'node:test';

import { assignFrontSegmentTheatres, ensureDefaultTheatres } from '../src/state/theatres.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeState(): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 10, seed: 'test', phase: 'war' } as any,
  factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ] as any,
  military: {
    formations: {
            army_rbih: {
                id: 'army_rbih',
                faction: 'RBiH',
                name: 'Army RBiH',
                created_turn: 1,
                status: 'active',
                assignment: null,
                kind: 'army_hq',
                personnel: 0,
                cohesion: 0,
                tags: [],
            },
            army_rs: {
                id: 'army_rs',
                faction: 'RS',
                name: 'Army RS',
                created_turn: 1,
                status: 'active',
                assignment: null,
                kind: 'army_hq',
                personnel: 0,
                cohesion: 0,
                tags: [],
            },
        } as any,
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
} as GameState;
}

test('ensureDefaultTheatres builds one deterministic theatre per faction', () => {
    const state = makeState();
    ensureDefaultTheatres(state);

    assert.ok(state.military.theatres?.RBiH_default);
    assert.ok(state.military.theatres?.RS_default);
    assert.strictEqual(state.military.army_theatre_assignment?.army_rbih, 'RBiH_default');
    assert.strictEqual(state.military.army_theatre_assignment?.army_rs, 'RS_default');
    assert.deepStrictEqual(state.military.theatres?.RBiH_default?.army_ids, ['army_rbih']);
    assert.deepStrictEqual(state.military.theatres?.RS_default?.army_ids, ['army_rs']);
});

test('assignFrontSegmentTheatres attaches theatre_id deterministically', () => {
    const state = makeState();
    const out = assignFrontSegmentTheatres(state, [
        {
            front_id: 'RBiH__RS__S1__S2',
            edge_ids: ['S1__S2'],
            side_a: 'RBiH',
            side_b: 'RS',
            length_edges: 1,
        },
    ]);
    assert.strictEqual(out[0]?.theatre_id, 'RBiH_default');
});

