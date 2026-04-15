import { expect, test } from 'vitest';

import { buildAdjacencyMap } from '../src/map/adjacency_map.js';
import { computeFrontEdges } from '../src/map/front_edges.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import { normalizeFrontPosture } from '../src/state/front_posture.js';
import { accumulateFrontPressure } from '../src/state/front_pressure.js';
import { syncFrontSegments } from '../src/state/front_segments.js';
import { CURRENT_SCHEMA_VERSION, GameState } from '../src/state/game_state.js';

test('accumulateFrontPressure applies 50% penalty when one side locally unsupplied', () => {
    // Graph: a -- b -- c
    // Front edge is b__c (A controls b, B controls c)
    const edges: EdgeRecord[] = [
        { a: 'a', b: 'b' },
        { a: 'b', b: 'c' }
    ];
    const adjacencyMap = buildAdjacencyMap(edges);

    const state: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 1, seed: 'seed' },
  factions: [
            // A controls a,b and has source at a so b is reachable (a->b)
            {
                id: 'A',
                profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
                areasOfResponsibility: ['a', 'b'],
                supply_sources: ['a']
            },
            // B controls c but has no sources => unsupplied locally at c
            {
                id: 'B',
                profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
                areasOfResponsibility: ['c'],
                supply_sources: []
            }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {
            A: { assignments: { 'b__c': { edge_id: 'b__c', posture: 'push', weight: 3 } } }, // intent 6
            B: { assignments: { 'b__c': { edge_id: 'b__c', posture: 'push', weight: 3 } } } // intent 6 -> eff 3
        },
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: { a: 'A', b: 'A', c: 'B' },
    settlements: {
            a: {
                legitimacy_state: {
                    legitimacy_score: 1,
                    demographic_legitimacy: 1,
                    institutional_legitimacy: 1,
                    stability_bonus: 0,
                    coercion_penalty: 0,
                    last_updated_turn: 1,
                    last_controller: 'A',
                    last_control_change_turn: 1
                }
            },
            b: {
                legitimacy_state: {
                    legitimacy_score: 1,
                    demographic_legitimacy: 1,
                    institutional_legitimacy: 1,
                    stability_bonus: 0,
                    coercion_penalty: 0,
                    last_updated_turn: 1,
                    last_controller: 'A',
                    last_control_change_turn: 1
                }
            },
            c: {
                legitimacy_state: {
                    legitimacy_score: 1,
                    demographic_legitimacy: 1,
                    institutional_legitimacy: 1,
                    stability_bonus: 0,
                    coercion_penalty: 0,
                    last_updated_turn: 1,
                    last_controller: 'B',
                    last_control_change_turn: 1
                }
            }
        }
  } as any,
        displacement: {} as any
    };

    const derived = computeFrontEdges(state, edges);
    syncFrontSegments(state, derived);
    normalizeFrontPosture(state);

    // Without supply effect delta would be 0.
    // With B unsupplied: intent_b_eff = floor(6/2)=3 => delta = 6-3=3
    const stats = accumulateFrontPressure(state, derived, adjacencyMap);
    expect(stats.edges_considered).toBe(1);
    expect(stats.edges_with_any_unsupplied_side).toBe(1);
    expect(stats.pressure_deltas).toEqual({ b__c: 3 });
    expect(stats.local_supply).toEqual({ b__c: { side_a_supplied: true, side_b_supplied: false } });
    expect(state.military.front_pressure['b__c'].value).toBe(3);
});

test('accumulateFrontPressure yields no change when both sides locally supplied', () => {
    // Graph: a -- b -- c -- d
    // Front edge is b__c (A controls a,b; B controls c,d)
    const edges: EdgeRecord[] = [
        { a: 'a', b: 'b' },
        { a: 'b', b: 'c' },
        { a: 'c', b: 'd' }
    ];
    const adjacencyMap = buildAdjacencyMap(edges);

    const state: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 1, seed: 'seed' },
  factions: [
            {
                id: 'A',
                profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
                areasOfResponsibility: ['a', 'b'],
                supply_sources: ['a']
            },
            {
                id: 'B',
                profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
                areasOfResponsibility: ['c', 'd'],
                supply_sources: ['d']
            }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {
            A: { assignments: { 'b__c': { edge_id: 'b__c', posture: 'push', weight: 3 } } }, // intent 6
            B: { assignments: { 'b__c': { edge_id: 'b__c', posture: 'push', weight: 3 } } } // intent 6
        },
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: { a: 'A', b: 'A', c: 'B', d: 'B' },
    settlements: {
            a: {
                legitimacy_state: {
                    legitimacy_score: 1,
                    demographic_legitimacy: 1,
                    institutional_legitimacy: 1,
                    stability_bonus: 0,
                    coercion_penalty: 0,
                    last_updated_turn: 1,
                    last_controller: 'A',
                    last_control_change_turn: 1
                }
            },
            b: {
                legitimacy_state: {
                    legitimacy_score: 1,
                    demographic_legitimacy: 1,
                    institutional_legitimacy: 1,
                    stability_bonus: 0,
                    coercion_penalty: 0,
                    last_updated_turn: 1,
                    last_controller: 'A',
                    last_control_change_turn: 1
                }
            },
            c: {
                legitimacy_state: {
                    legitimacy_score: 1,
                    demographic_legitimacy: 1,
                    institutional_legitimacy: 1,
                    stability_bonus: 0,
                    coercion_penalty: 0,
                    last_updated_turn: 1,
                    last_controller: 'B',
                    last_control_change_turn: 1
                }
            },
            d: {
                legitimacy_state: {
                    legitimacy_score: 1,
                    demographic_legitimacy: 1,
                    institutional_legitimacy: 1,
                    stability_bonus: 0,
                    coercion_penalty: 0,
                    last_updated_turn: 1,
                    last_controller: 'B',
                    last_control_change_turn: 1
                }
            }
        }
  } as any,
        displacement: {} as any
    };

    const derived = computeFrontEdges(state, edges);
    syncFrontSegments(state, derived);
    normalizeFrontPosture(state);

    const stats = accumulateFrontPressure(state, derived, adjacencyMap);
    expect(stats.edges_considered).toBe(1);
    expect(stats.edges_with_any_unsupplied_side).toBe(0);
    expect(stats.pressure_deltas).toEqual({ b__c: 0 });
    expect(stats.local_supply).toEqual({ b__c: { side_a_supplied: true, side_b_supplied: true } });
    expect(state.military.front_pressure['b__c'].value).toBe(0);
});

