import assert from 'node:assert';
import { test } from 'vitest';

import { runScenarioDeterministic } from '../src/cli/sim_scenario.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';

function buildTinyState(): { state: GameState; edges: EdgeRecord[] } {
    const edges: EdgeRecord[] = [
        { a: 's1', b: 's2' }, // canonical edge_id s1__s2
        { a: 's1', b: 's3' } // canonical edge_id s1__s3
    ];

    const state: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 0,
            seed: 'scenario-seed',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 0,
            war_start_turn: 0
        },
  factions: [
            // Provide local supply so this test remains focused on determinism, not supply penalties.
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: ['s1'], supply_sources: ['s1'] },
            { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: ['s2', 's3'], supply_sources: ['s2'] }
        ],
  military: {
    formations: {
            // Phase 9: Add 3 formations to provide sufficient commitment (3000 milli-points) for weight=3
            // This gives friction_factor = 3000/3000 = 1.0, so effective_weight = 3, matching pre-Phase 9 behavior
            F_A_0001: {
                id: 'F_A_0001',
                faction: 'RBiH',
                name: 'Test Formation 1',
                created_turn: 0,
                kind: 'brigade',
                status: 'active',
                location_osid: 's1',
                assignment: { kind: 'edge', edge_id: 's1__s2' }
            },
            F_A_0002: {
                id: 'F_A_0002',
                faction: 'RBiH',
                name: 'Test Formation 2',
                created_turn: 0,
                kind: 'brigade',
                status: 'active',
                location_osid: 's1',
                assignment: { kind: 'edge', edge_id: 's1__s2' }
            },
            F_A_0003: {
                id: 'F_A_0003',
                faction: 'RBiH',
                name: 'Test Formation 3',
                created_turn: 0,
                kind: 'brigade',
                status: 'active',
                location_osid: 's1',
                assignment: { kind: 'edge', edge_id: 's1__s2' }
            }
        },
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {
            // Seed an existing pressure lane so both edges appear in top_pressures.
            s1__s3: { edge_id: 's1__s3', value: 6, max_abs: 6, last_updated_turn: 0 }
        },
    militia_pools: {}
  } as any,
  political: {
            political_controllers: { s1: 'RBiH', s2: 'RS', s3: 'RS' },
    settlements: {
            s1: {
                legitimacy_state: {
                    legitimacy_score: 1,
                    demographic_legitimacy: 1,
                    institutional_legitimacy: 1,
                    stability_bonus: 0,
                    coercion_penalty: 0,
                    last_updated_turn: 0,
                    last_controller: 'RBiH',
                    last_control_change_turn: 0
                }
            },
            s2: {
                legitimacy_state: {
                    legitimacy_score: 1,
                    demographic_legitimacy: 1,
                    institutional_legitimacy: 1,
                    stability_bonus: 0,
                    coercion_penalty: 0,
                    last_updated_turn: 0,
                    last_controller: 'RS',
                    last_control_change_turn: 0
                }
            },
            s3: {
                legitimacy_state: {
                    legitimacy_score: 1,
                    demographic_legitimacy: 1,
                    institutional_legitimacy: 1,
                    stability_bonus: 0,
                    coercion_penalty: 0,
                    last_updated_turn: 0,
                    last_controller: 'RS',
                    last_control_change_turn: 0
                }
            }
        }
  } as any,
        displacement: {} as any
    };

    return { state, edges,
        
        
    };
}

test('sim:scenario emits deterministic per-turn summary (no apply)', async () => {
    const { state, edges } = buildTinyState();

    const script = {
        schema: 1 as const,
        turns: {
            '1': [{ faction: 'RBiH', edge_id: 's1__s2', posture: 'push' as const, weight: 3 }],
            '2': [{ faction: 'RBiH', edge_id: 's1__s2', posture: 'push' as const, weight: 3 }]
        }
    };

    const { summary } = await runScenarioDeterministic(state, {
        turns: 2,
        applyBreaches: false,
        applyNegotiation: false,
        script,
        settlementEdges: edges
    });

    assert.strictEqual(summary.schema, 2);
    assert.strictEqual(summary.turns.length, 2);

    // Pressure stays deterministic across turns for the same seeded setup.
    assert.strictEqual(summary.turns[0].highest_abs_pressure_current, 6);
    assert.strictEqual(summary.turns[1].highest_abs_pressure_current, 6);
    assert.ok(summary.turns[0].highest_abs_pressure_current > 0);

    // No timestamps in output artifact.
    const json = JSON.stringify(summary);
    assert.ok(!json.includes('generated_at'));
    assert.ok(!json.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/), 'should not include ISO timestamps');

    // top_pressures include both expected edges (ordering can change with pressure model tuning).
    const t1 = summary.turns[0];
    assert.deepStrictEqual(t1.top_pressures.map((p) => p.edge_id).sort(), ['s1__s2', 's1__s3']);
});

