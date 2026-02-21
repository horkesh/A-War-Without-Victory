/**
 * Phase D Step 7: Phase II turn structure integration tests.
 * - Pipeline order for phase_ii: phase-ii-consolidation runs after supply-resolution.
 * - Regression: Phase I behavior unchanged (Phase I run reports only phase-i-* phases).
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
            phase: 'phase_ii',
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
            phase: 'phase_i',
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
        phase_i_consolidation_until: {},
        phase_i_militia_strength: { MUN_A: { RBiH: 30, RS: 60, HRHB: 10 }, MUN_B: { RBiH: 25, RS: 70, HRHB: 5 } }
    };
}

test('Phase II runTurn includes phase-ii-consolidation after supply-resolution', async () => {
    const state = minimalPhaseIIState();
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const { report } = await runTurn(state, { seed: 'pipeline-ii', settlementEdges: edges });
    const names = report.phases.map((p) => p.name);
    const idxSupply = names.indexOf('supply-resolution');
    const idxPhaseII = names.indexOf('phase-ii-consolidation');
    assert.ok(idxSupply >= 0, 'supply-resolution should be in pipeline');
    assert.ok(idxPhaseII >= 0, 'phase-ii-consolidation should be in pipeline');
    assert.ok(idxPhaseII > idxSupply, 'phase-ii-consolidation should run after supply-resolution');
});

test('Phase I runTurn reports only Phase I phase names (no phase-ii-consolidation)', async () => {
    const state = minimalPhaseIState();
    const { report } = await runTurn(state, { seed: 'pipeline-i' });
    const names = report.phases.map((p) => p.name);
    assert.ok(!names.includes('phase-ii-consolidation'));
    assert.ok(names.includes('phase-i-control-flip'));
});
