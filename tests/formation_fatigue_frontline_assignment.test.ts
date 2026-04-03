import assert from 'node:assert';
import { test } from 'node:test';

import { applyFatigueRecovery } from '../src/state/formation_fatigue.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 3, seed: 'fatigue-test', phase: 'war' } as any,
        factions: [],
        military: {
            formations: {
                b1: {
                    id: 'b1',
                    faction: 'RBiH',
                    name: '1st Brigade',
                    kind: 'brigade',
                    created_turn: 1,
                    status: 'active',
                    tags: [],
                    ops: { fatigue: 0, last_supplied_turn: 2 },
                },
                b2: {
                    id: 'b2',
                    faction: 'RBiH',
                    name: '2nd Brigade',
                    kind: 'brigade',
                    created_turn: 1,
                    status: 'active',
                    tags: [],
                    ops: { fatigue: 0, last_supplied_turn: 2 },
                },
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as any,
        political: {
            political_controllers: {},
        } as any,
        displacement: {
            displacement_event_log: [],
        } as any,
    } as GameState;
}

test('applyFatigueRecovery treats sector-assigned brigades as frontline formations', () => {
    const state = makeState();
    state.military.corps_front_sectors = {
        sector_1: {
            sector_id: 'sector_1',
            corps_id: 'rbih_corps',
            faction: 'RBiH',
            edge_ids: ['S1__S2'],
            assigned_brigade_ids: ['b1'],
            reserve_brigade_ids: [],
            sub_segments: [],
            opposing_factions: ['RS'],
            length_edges: 1,
            density: 1,
            threat_ratio: 1,
            defensive_power: 100,
        },
    } as any;

    applyFatigueRecovery(state);

    assert.strictEqual(state.military.formations.b1.ops?.fatigue, 0.5);
    assert.strictEqual(state.military.formations.b2.ops?.fatigue, 0);
});

test('applyFatigueRecovery does not treat sector reserves as frontline formations', () => {
    const state = makeState();
    state.military.corps_front_sectors = {
        sector_1: {
            sector_id: 'sector_1',
            corps_id: 'rbih_corps',
            faction: 'RBiH',
            edge_ids: ['S1__S2'],
            assigned_brigade_ids: [],
            reserve_brigade_ids: ['b1'],
            sub_segments: [],
            opposing_factions: ['RS'],
            length_edges: 1,
            density: 1,
            threat_ratio: 1,
            defensive_power: 100,
        },
    } as any;

    applyFatigueRecovery(state);

    assert.strictEqual(state.military.formations.b1.ops?.fatigue, 0);
    assert.strictEqual(state.military.formations.b2.ops?.fatigue, 0);
});

test('applyFatigueRecovery does not revive legacy front assignments when sector truth is absent', () => {
    const state = makeState();
    state.military.brigade_front_assignment = { b2: 'RBiH__RS__S1__S2' };
    state.military.assignable_front_segments = [
        {
            front_id: 'RBiH__RS__S1__S2',
            edge_ids: ['S1__S2'],
            side_a: 'RBiH',
            side_b: 'RS',
            length_edges: 1,
        },
    ] as any;

    applyFatigueRecovery(state);

    assert.strictEqual(state.military.formations.b1.ops?.fatigue, 0);
    assert.strictEqual(state.military.formations.b2.ops?.fatigue, 0);
});
