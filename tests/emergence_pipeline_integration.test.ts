/**
 * Phase E Step 6: Pipeline integration tests.
 * - Current emergence pipeline order is stable.
 * - Emergence steps only run in war.
 * - Current pipeline-owned emergence reports are populated.
 */

import assert from 'node:assert';
import { test } from 'vitest';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIIState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'pipeline-test', phase: 'war', referendum_held: true, referendum_turn: 0, war_start_turn: 1 },
        factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {}
        } as any,
        political: {
            political_controllers: { S1: 'RBiH', S2: 'RS' }
        } as any,
        displacement: {} as any
    };
}

test('Pipeline: current emergence steps run in the canonical order', async () => {
    const state = minimalPhaseIIState();
    const edges = [{ a: 'S1', b: 'S2' }];
    const result = await runTurn(state, { seed: 'test', settlementEdges: edges });

    const phaseNames = result.report.phases.map((p) => p.name);
    const supplyPressureIdx = phaseNames.indexOf('supply-pressure-exhaustion');
    const pressureIdx = phaseNames.indexOf('phase-e-pressure-update');
    const frontEmergenceIdx = phaseNames.indexOf('front-emergence');
    const deriveSectorIntelIdx = phaseNames.indexOf('derive-sector-intel');

    assert.ok(supplyPressureIdx >= 0, 'supply-pressure-exhaustion exists');
    assert.ok(pressureIdx >= 0, 'phase-e-pressure-update exists');
    assert.ok(frontEmergenceIdx >= 0, 'front-emergence exists');
    assert.ok(deriveSectorIntelIdx >= 0, 'derive-sector-intel exists');

    assert.ok(pressureIdx > supplyPressureIdx, 'phase-e-pressure-update after supply-pressure-exhaustion');
    assert.ok(frontEmergenceIdx > pressureIdx, 'front-emergence after phase-e-pressure-update');
    assert.ok(deriveSectorIntelIdx > frontEmergenceIdx, 'derive-sector-intel after front-emergence');
});

test('Pipeline: peace phase is rejected by war pipeline', async () => {
    const state = minimalPhaseIIState();
    state.meta.phase = 'peace';
    const edges = [{ a: 'S1', b: 'S2' }];
    await assert.rejects(
        () => runTurn(state, { seed: 'test', settlementEdges: edges }),
        /unsupported lifecycle phase "peace"; expected 'war'/
    );
});

test('Pipeline: current emergence reports are populated when war phase', async () => {
    const state = minimalPhaseIIState();
    const edges = [{ a: 'S1', b: 'S2' }];
    const result = await runTurn(state, { seed: 'test', settlementEdges: edges });

    assert.ok('phase_e_pressure_update' in result.report, 'phase_e_pressure_update report exists');
    assert.ok('front_emergence_report' in result.report, 'front_emergence_report report exists');
});

test('Pipeline: War phase substrate still runs before emergence layers', async () => {
    const state = minimalPhaseIIState();
    state.political.war_supply_pressure = { RBiH: 10, RS: 15 };
    state.political.war_exhaustion = { RBiH: 5, RS: 8 };
    const edges = [{ a: 'S1', b: 'S2' }];

    const result = await runTurn(state, { seed: 'test', settlementEdges: edges });
    const phaseNames = result.report.phases.map((p) => p.name);

    assert.ok(phaseNames.includes('supply-pressure-exhaustion'), 'supply-pressure-exhaustion ran');
    assert.ok(phaseNames.includes('phase-e-pressure-update'), 'phase-e-pressure-update ran');
    assert.ok(phaseNames.includes('front-emergence'), 'front-emergence ran');
});

test('Pipeline: Phase E derivation is deterministic (same state + edges -> same reports)', async () => {
    const state1 = minimalPhaseIIState();
    const state2 = minimalPhaseIIState();
    const edges = [{ a: 'S1', b: 'S2' }];

    const result1 = await runTurn(state1, { seed: 'test', settlementEdges: edges });
    const result2 = await runTurn(state2, { seed: 'test', settlementEdges: edges });

    assert.deepStrictEqual(
        result1.report.front_emergence_report,
        result2.report.front_emergence_report,
        'front_emergence_report is deterministic'
    );
});
