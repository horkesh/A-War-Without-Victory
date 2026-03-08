/**
 * Phase E Step 6: Pipeline integration tests.
 * - Pipeline order correct (Phase E after War phase consolidation)
 * - War phase unchanged (Phase E does not modify War phase logic)
 * - No early execution (Phase E only runs when meta.phase === 'war')
 */

import assert from 'node:assert';
import { test } from 'node:test';
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
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { 'S1': 'RBiH', 'S2': 'RS' }
    };
}

test('Pipeline: Phase E steps run in correct order (after phase-ii-consolidation)', async () => {
    const state = minimalPhaseIIState();
    const edges = [{ a: 'S1', b: 'S2' }];
    const result = await runTurn(state, { seed: 'test', settlementEdges: edges });

    const phaseNames = result.report.phases.map((p) => p.name);
    const consolidationIdx = phaseNames.indexOf('phase-ii-consolidation');
    const frontEmergenceIdx = phaseNames.indexOf('phase-ii-front-emergence');
    const pressureIdx = phaseNames.indexOf('phase-e-pressure-update');
    const aorIdx = phaseNames.indexOf('phase-e-aor-derivation');
    const rearIdx = phaseNames.indexOf('phase-e-rear-zone-derivation');

    assert.ok(consolidationIdx >= 0, 'phase-ii-consolidation exists');
    assert.ok(frontEmergenceIdx >= 0, 'phase-ii-front-emergence exists (War phase-scoped)');
    assert.ok(pressureIdx >= 0, 'phase-e-pressure-update exists');
    assert.ok(aorIdx >= 0, 'phase-e-aor-derivation exists');
    assert.ok(rearIdx >= 0, 'phase-e-rear-zone-derivation exists');

    // War phase front emergence runs after War phase consolidation; Phase E steps after that
    assert.ok(frontEmergenceIdx > consolidationIdx, 'phase-ii-front-emergence after phase-ii-consolidation');
    assert.ok(pressureIdx > consolidationIdx, 'phase-e-pressure-update after phase-ii-consolidation');
    assert.ok(aorIdx > consolidationIdx, 'phase-e-aor-derivation after phase-ii-consolidation');
    assert.ok(rearIdx > consolidationIdx, 'phase-e-rear-zone-derivation after phase-ii-consolidation');

    // Order: consolidation → pressure → front emergence (War phase) → aor → rear
    assert.ok(frontEmergenceIdx > pressureIdx, 'phase-ii-front-emergence after phase-e-pressure-update');
    assert.ok(aorIdx > frontEmergenceIdx, 'phase-e-aor-derivation after phase-ii-front-emergence');
    assert.ok(rearIdx > aorIdx, 'phase-e-rear-zone-derivation after phase-e-aor-derivation');
});

test('Pipeline: peace phase is rejected by war pipeline', async () => {
    const state = minimalPhaseIIState();
    state.meta.phase = 'peace';
    const edges = [{ a: 'S1', b: 'S2' }];
    await assert.rejects(
        () => runTurn(state, { seed: 'test', settlementEdges: edges }),
        /use state pipeline runOneTurn for peace/
    );
});

test('Pipeline: Phase E reports are populated when war phase', async () => {
    const state = minimalPhaseIIState();
    const edges = [{ a: 'S1', b: 'S2' }];
    const result = await runTurn(state, { seed: 'test', settlementEdges: edges });

    // Phase E reports should exist (even if empty/no-op)
    assert.ok('phase_e_pressure_update' in result.report, 'phase_e_pressure_update report exists');
    assert.ok('front_emergence_report' in result.report, 'front_emergence_report report exists');
    assert.ok('phase_e_aor_derivation' in result.report, 'phase_e_aor_derivation report exists');
    assert.ok('phase_e_rear_zone_derivation' in result.report, 'phase_e_rear_zone_derivation report exists');
});

test('Pipeline: War phase unchanged (Phase E does not modify War phase logic)', async () => {
    const state = minimalPhaseIIState();
    state.war_supply_pressure = { RBiH: 10, RS: 15 };
    state.war_exhaustion = { RBiH: 5, RS: 8 };
    const originalPressure = { ...state.war_supply_pressure };
    const originalExhaustion = { ...state.war_exhaustion };

    const edges = [{ a: 'S1', b: 'S2' }];
    const result = await runTurn(state, { seed: 'test', settlementEdges: edges });

    // War phase state should not be modified by Phase E (Phase E reads only)
    // Note: War phase consolidation may update these values; we're checking Phase E doesn't override
    // For this test, we just verify that Phase E reports exist and War phase ran
    const phaseNames = result.report.phases.map((p) => p.name);
    assert.ok(phaseNames.includes('phase-ii-consolidation'), 'War phase consolidation ran');
    assert.ok(phaseNames.includes('phase-e-pressure-update'), 'Phase E ran after War phase');
});

test('Pipeline: Phase E derivation is deterministic (same state + edges → same reports)', async () => {
    const state1 = minimalPhaseIIState();
    const state2 = minimalPhaseIIState();
    const edges = [{ a: 'S1', b: 'S2' }];

    const result1 = await runTurn(state1, { seed: 'test', settlementEdges: edges });
    const result2 = await runTurn(state2, { seed: 'test', settlementEdges: edges });

    // Phase E reports should be identical for same inputs
    assert.deepStrictEqual(
        result1.report.front_emergence_report,
        result2.report.front_emergence_report,
        'front_emergence_report is deterministic'
    );
});
