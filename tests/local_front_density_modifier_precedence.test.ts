import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getLocalFrontDensityModifier } from '../src/sim/combat/local_front_defense.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 5, seed: 'test', phase: 'war' } as any,
        factions: [],
        brigade_aor: {},
        military: {
            formations: {
                brig1: {
                    id: 'brig1',
                    faction: 'RBiH',
                    name: 'Brig1',
                    created_turn: 1,
                    status: 'active',
                    assignment: null,
                    kind: 'brigade',
                    personnel: 1000,
                    cohesion: 60,
                    tags: [],
                    location_osid: 'op:test:s1',
                },
            },
            brigade_front_assignment: {
                brig1: 'legacy_front',
            },
            assignable_front_segments: [
                {
                    front_id: 'legacy_front',
                    edge_ids: ['e1', 'e2', 'e3', 'e4'],
                    side_a: 'RBiH',
                    side_b: 'RS',
                    length_edges: 4,
                },
            ],
            corps_front_sectors: {
                sector_1: {
                    sector_id: 'sector_1',
                    corps_id: 'arbih_3rd_corps',
                    faction: 'RBiH',
                    opposing_factions: ['RS'],
                    edge_ids: ['e1', 'e2'],
                    sub_segments: [],
                    length_edges: 2,
                    territory_osids: ['op:test:s1'],
                    assigned_brigade_ids: ['brig1', 'brig2'],
                    reserve_brigade_ids: [],
                    density: 1,
                    threat_ratio: 1,
                    defensive_power: 100,
                    sector_stance: 'defend',
                    stance_source: 'bot',
                },
            },
        } as any,
    } as GameState;
}

test('getLocalFrontDensityModifier prefers sector density over legacy front assignment', () => {
    const state = makeState();
    const brigade = state.military.formations!.brig1!;

    const modifier = getLocalFrontDensityModifier(state, brigade as any);
    assert.equal(modifier, 1.0);
});

test('getLocalFrontDensityModifier legacy fallback works without local_fronts runtime state', () => {
    const state = makeState();
    delete (state.military as any).corps_front_sectors;
    const brigade = state.military.formations!.brig1!;

    const modifier = getLocalFrontDensityModifier(state, brigade as any);
    assert.equal(modifier, 0.8);
});
