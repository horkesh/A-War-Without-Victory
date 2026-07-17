import assert from 'node:assert';
import { test } from 'vitest';

import { runScenarioDeterministic } from '../src/cli/sim_scenario.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';

test('determinism: same fatigue scenario run twice produces identical scenario_summary.json', async () => {
    const edges: EdgeRecord[] = [
        { a: 's1', b: 's2' },
        { a: 's1', b: 's3' },
    ];

    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 0,
            seed: 'determinism-test-seed',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 0,
            war_start_turn: 0,
        },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
                areasOfResponsibility: ['s1'],
                supply_sources: ['s1'],
                command_capacity: 0,
            },
            {
                id: 'RS',
                profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
                areasOfResponsibility: ['s2', 's3'],
                supply_sources: ['s2'],
                command_capacity: 0,
            },
        ],
        military: {
            formations: {
                F_RBIH_0001: {
                    id: 'F_RBIH_0001',
                    faction: 'RBiH',
                    name: 'Test Formation 1',
                    created_turn: 0,
                    kind: 'brigade',
                    status: 'active',
                    location_osid: 's1',
                    assignment: { kind: 'edge', edge_id: 's1__s2' },
                    ops: { fatigue: 0, last_supplied_turn: null },
                },
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {
                MUN1: {
                    mun_id: 'MUN1',
                    faction: 'RBiH',
                    available: 1000,
                    committed: 0,
                    exhausted: 0,
                    updated_turn: 0,
                    fatigue: 0,
                },
            },
            war_militia_strength: {},
        } as any,
        political: { political_controllers: { s1: 'RBiH', s2: 'RS', s3: 'RS' }, municipalities: {}, war_consolidation_until: {} } as any,
        displacement: {} as any,
    } as unknown as GameState;

    const script = {
        schema: 1 as const,
        turns: {
            '1': [{ faction: 'RBiH', edge_id: 's1__s2', posture: 'push' as const, weight: 1 }],
            '2': [{ faction: 'RBiH', edge_id: 's1__s2', posture: 'push' as const, weight: 1 }],
            '3': [{ faction: 'RBiH', edge_id: 's1__s2', posture: 'push' as const, weight: 1 }],
        },
    };

    const { summary: summary1 } = await runScenarioDeterministic(state, {
        turns: 3,
        applyBreaches: false,
        applyNegotiation: false,
        script,
        settlementEdges: edges,
    });

    const state2: GameState = JSON.parse(JSON.stringify(state));
    const { summary: summary2 } = await runScenarioDeterministic(state2, {
        turns: 3,
        applyBreaches: false,
        applyNegotiation: false,
        script,
        settlementEdges: edges,
    });

    const json1 = JSON.stringify(summary1, null, 2);
    const json2 = JSON.stringify(summary2, null, 2);

    assert.strictEqual(json1, json2, 'scenario summaries should be identical');
    assert.ok(!json1.includes('generated_at'), 'should not include generated_at timestamps');
    assert.ok(!json1.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/), 'should not include ISO timestamps');

    assert.ok(summary1.turns.length >= 3, 'should have at least 3 turns');
    for (let i = 0; i < 3; i += 1) {
        const turn1 = summary1.turns[i];
        const turn2 = summary2.turns[i];
        assert.strictEqual(
            turn1.formations.formations_unsupplied_count,
            turn2.formations.formations_unsupplied_count,
            `turn ${i + 1}: formations_unsupplied_count should match`
        );
        assert.strictEqual(
            turn1.formations.formations_avg_fatigue,
            turn2.formations.formations_avg_fatigue,
            `turn ${i + 1}: formations_avg_fatigue should match`
        );
        assert.strictEqual(
            turn1.militia_pools.militia_pools_unsupplied_count,
            turn2.militia_pools.militia_pools_unsupplied_count,
            `turn ${i + 1}: militia_pools_unsupplied_count should match`
        );
        assert.strictEqual(
            turn1.militia_pools.militia_pools_avg_fatigue,
            turn2.militia_pools.militia_pools_avg_fatigue,
            `turn ${i + 1}: militia_pools_avg_fatigue should match`
        );
    }
}, 30_000);
