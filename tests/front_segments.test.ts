import { expect, test } from 'vitest';

import { computeFrontEdges } from '../src/map/front_edges.js';
import { EdgeRecord } from '../src/map/settlements.js';
import { syncFrontSegments } from '../src/state/front_segments.js';
import { CURRENT_SCHEMA_VERSION, GameState } from '../src/state/game_state.js';

test('syncFrontSegments is deterministic and persists inactive segments', () => {
    const edges: EdgeRecord[] = [{ a: 's1', b: 's2' }];

    const state: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 1, seed: 'seed' },
  factions: [
            { id: 'A', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: ['s1'], supply_sources: [] },
            { id: 'B', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: ['s2'], supply_sources: [] }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {} as any, displacement: {} as any
};

    // Turn 1: create + activate
    const derived1 = computeFrontEdges(state, edges);
    syncFrontSegments(state, derived1);
    expect(state.military.front_segments['s1__s2']).toBeTruthy();
    expect(state.military.front_segments['s1__s2']).toEqual({
        edge_id: 's1__s2',
        active: true,
        created_turn: 1,
        since_turn: 1,
        last_active_turn: 1,
        active_streak: 1,
        max_active_streak: 1,
        friction: 1,
        max_friction: 1
    });

    // Turn 2: same control, since_turn unchanged, last_active_turn updated
    state.meta.turn = 2;
    const derived2 = computeFrontEdges(state, edges);
    syncFrontSegments(state, derived2);
    expect(state.military.front_segments['s1__s2'].since_turn).toBe(1);
    expect(state.military.front_segments['s1__s2'].last_active_turn).toBe(2);
    expect(state.military.front_segments['s1__s2'].active).toBe(true);
    expect(state.military.front_segments['s1__s2'].active_streak).toBe(2);
    expect(state.military.front_segments['s1__s2'].max_active_streak).toBe(2);
    expect(state.military.front_segments['s1__s2'].friction).toBe(2);
    expect(state.military.front_segments['s1__s2'].max_friction).toBe(2);

    // Turn 3: change control so edge is not part of derived fronts (neutral side -> dropped)
    state.meta.turn = 3;
    state.factions[1].areasOfResponsibility = []; // s2 becomes neutral
    const derived3 = computeFrontEdges(state, edges);
    expect(derived3.length).toBe(0);
    syncFrontSegments(state, derived3);
    expect(state.military.front_segments['s1__s2'].active).toBe(false);
    expect(state.military.front_segments['s1__s2'].last_active_turn).toBe(2);
    expect(state.military.front_segments['s1__s2'].active_streak).toBe(0);
    expect(state.military.front_segments['s1__s2'].max_active_streak).toBe(2);
    expect(state.military.front_segments['s1__s2'].friction).toBe(1);
    expect(state.military.front_segments['s1__s2'].max_friction).toBe(2);

    // Turn 4: reactivate => active_streak resets, max retained
    state.meta.turn = 4;
    state.factions[1].areasOfResponsibility = ['s2']; // s2 becomes controlled again
    const derived4 = computeFrontEdges(state, edges);
    syncFrontSegments(state, derived4);
    expect(state.military.front_segments['s1__s2'].active).toBe(true);
    expect(state.military.front_segments['s1__s2'].active_streak).toBe(1);
    expect(state.military.front_segments['s1__s2'].max_active_streak).toBe(2);
    expect(state.military.front_segments['s1__s2'].friction).toBe(2);
    expect(state.military.front_segments['s1__s2'].max_friction).toBe(2);
});

