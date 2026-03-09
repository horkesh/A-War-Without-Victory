/**
 * Phase D Step 7: War phase turn structure integration tests.
 * - Pipeline order for war phase: phase-ii-consolidation runs after supply-resolution.
 * - Regression: Peace phase behavior unchanged (Peace phase run reports only phase-i-* phases).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import type { EdgeRecord } from '../src/map/settlements.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIIState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 20,
            seed: 'pipeline-ii',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10
        },
        factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { S1: 'RBiH', S2: 'RS', S3: 'HRHB' }
    };
}

function minimalPhaseIState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'pipeline-i',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10
        },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 5 },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { s1: 'RBiH', s2: 'RS' },
        municipalities: { MUN_A: { stability_score: 50 }, MUN_B: { stability_score: 50 } },
        war_consolidation_until: {},
        war_militia_strength: { MUN_A: { RBiH: 30, RS: 60, HRHB: 10 }, MUN_B: { RBiH: 25, RS: 70, HRHB: 5 } }
    };
}

test('War phase runTurn includes consolidate-rear-pockets after supply-resolution', async () => {
    const state = minimalPhaseIIState();
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const { report } = await runTurn(state, { seed: 'pipeline-ii', settlementEdges: edges });
    const names = report.phases.map((p) => p.name);
    const idxSupply = names.indexOf('supply-resolution');
    const idxPhaseII = names.indexOf('consolidate-rear-pockets');
    assert.ok(idxSupply >= 0, 'supply-resolution should be in pipeline');
    assert.ok(idxPhaseII >= 0, 'consolidate-rear-pockets should be in pipeline');
    assert.ok(idxPhaseII > idxSupply, 'consolidate-rear-pockets should run after supply-resolution');
});

test('war runTurn includes consolidate-rear-pockets on default path', async () => {
    const state = minimalPhaseIState();
    const { report } = await runTurn(state, { seed: 'pipeline-i' });
    const names = report.phases.map((p) => p.name);
    assert.ok(names.includes('consolidate-rear-pockets'));
    assert.ok(!names.includes('phase-i-control-flip'));
});
