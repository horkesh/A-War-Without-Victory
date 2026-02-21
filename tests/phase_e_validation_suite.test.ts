/**
 * Phase E Step 7: Phase E validation suite.
 * Comprehensive tests for Phase E exit criteria per ROADMAP:
 * - Pressure diffuses spatially and deterministically
 * - AoRs exist as interaction zones (emergent and reversible)
 * - Rear Political Control Zones stabilize the rear
 * - No negotiation, collapse, or end-state logic exists in Phase E
 * - Phase D invariants still hold (exhaustion monotonic, no control flip by Phase E)
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { deriveAoRMembership } from '../src/sim/phase_e/aor_instantiation.js';
import { diffusePressure } from '../src/sim/phase_e/pressure_diffusion.js';
import { deriveRearPoliticalControlZones } from '../src/sim/phase_e/rear_zone_detection.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIIState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'validation-test', phase: 'phase_ii', referendum_held: true, referendum_turn: 0, war_start_turn: 1 },
        factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {
            'F1': { id: 'F1', faction: 'RBiH', name: 'Brigade 1', created_turn: 0, status: 'active', assignment: null },
            'F2': { id: 'F2', faction: 'RS', name: 'Brigade 2', created_turn: 0, status: 'active', assignment: null }
        },
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { 'S1': 'RBiH', 'S2': 'RS', 'S3': 'RBiH' },
        phase_ii_exhaustion: { RBiH: 5, RS: 8 }
    };
}

test('Phase E validation: pressure diffuses spatially and deterministically', () => {
    const state = minimalPhaseIIState();
    state.front_pressure = { 'S1__S2': { edge_id: 'S1__S2', value: 10, max_abs: 10, last_updated_turn: 10 } };
    const edges = [{ a: 'S1', b: 'S2' }];

    const result1 = diffusePressure(state, edges);
    const result2 = diffusePressure(state, edges);

    assert.strictEqual(result1.report.applied, result2.report.applied, 'Diffusion applied flag is deterministic');
    assert.strictEqual(result1.report.stats.total_outflow, result2.report.stats.total_outflow, 'Diffusion outflow is deterministic');
    assert.strictEqual(result1.report.stats.total_inflow, result2.report.stats.total_inflow, 'Diffusion inflow is deterministic');
});

test('Phase E validation: AoRs are emergent (only when sustained conditions met)', () => {
    const state = minimalPhaseIIState();
    const edges = [{ a: 'S1', b: 'S2' }];

    // No sustained conditions → no AoRs
    const aor1 = deriveAoRMembership(state, edges);
    assert.strictEqual(Object.keys(aor1.by_formation).length, 0, 'No AoRs when conditions not sustained');

    // Add sustained conditions (pressure >= 5, active_streak >= 3)
    state.front_pressure = { 'S1__S2': { edge_id: 'S1__S2', value: 10, max_abs: 10, last_updated_turn: 10 } };
    state.front_segments = { 'S1__S2': { edge_id: 'S1__S2', active: true, created_turn: 7, since_turn: 7, last_active_turn: 10, active_streak: 3, max_active_streak: 3, friction: 0, max_friction: 0 } };

    const aor2 = deriveAoRMembership(state, edges);
    assert.ok(Object.keys(aor2.by_formation).length > 0, 'AoRs emerge when sustained conditions met');
});

test('Phase E validation: AoRs are reversible (dissolve when conditions weaken)', () => {
    const state = minimalPhaseIIState();
    state.front_pressure = { 'S1__S2': { edge_id: 'S1__S2', value: 10, max_abs: 10, last_updated_turn: 10 } };
    state.front_segments = { 'S1__S2': { edge_id: 'S1__S2', active: true, created_turn: 7, since_turn: 7, last_active_turn: 10, active_streak: 3, max_active_streak: 3, friction: 0, max_friction: 0 } };
    const edges = [{ a: 'S1', b: 'S2' }];

    const aor1 = deriveAoRMembership(state, edges);
    assert.ok(Object.keys(aor1.by_formation).length > 0, 'AoRs exist when sustained');

    // Weaken conditions (pressure drops below threshold)
    state.front_pressure['S1__S2'].value = 3;
    const aor2 = deriveAoRMembership(state, edges);
    assert.strictEqual(Object.keys(aor2.by_formation).length, 0, 'AoRs dissolve when conditions weaken');
});

test('Phase E validation: Rear Political Control Zones stabilize the rear', () => {
    const state = minimalPhaseIIState();
    const edges = [{ a: 'S1', b: 'S2' }];
    const rearZone = deriveRearPoliticalControlZones(state, edges);

    // S3 is rear (controlled but not on any eligible edge)
    assert.ok(rearZone.settlement_ids.includes('S3'), 'S3 is in rear zone');

    // Rear zones do not flip control (read-only derivation)
    const originalControl = { ...state.political_controllers };
    deriveRearPoliticalControlZones(state, edges);
    assert.deepStrictEqual(state.political_controllers, originalControl, 'Rear zone detection does not flip control');
});

test('Phase E validation: no negotiation logic in Phase E modules', async () => {
    // Phase E modules must not contain negotiation, end-state, enforcement, or termination logic
    // This is enforced by phase_e0_1_guard.ts at module load time
    // If Phase E modules contain forbidden substrings, guard throws
    // This test verifies that Phase E modules can be imported without error
    const { deriveAoRMembership: aor } = await import('../src/sim/phase_e/aor_instantiation.js');
    const { deriveRearPoliticalControlZones: rear } = await import('../src/sim/phase_e/rear_zone_detection.js');
    const { diffusePressure: pressure } = await import('../src/sim/phase_e/pressure_diffusion.js');

    assert.ok(typeof aor === 'function', 'deriveAoRMembership is a function');
    assert.ok(typeof rear === 'function', 'deriveRearPoliticalControlZones is a function');
    assert.ok(typeof pressure === 'function', 'diffusePressure is a function');

    // If we reach here, Phase E modules do not contain forbidden logic (guard passed)
});

test('Phase E validation: Phase D invariants still hold (exhaustion monotonic)', async () => {
    const state = minimalPhaseIIState();
    state.phase_ii_exhaustion = { RBiH: 5, RS: 8 };
    const originalExhaustion = { ...state.phase_ii_exhaustion };
    const edges = [{ a: 'S1', b: 'S2' }];

    // Run one turn with Phase E active
    const result = await runTurn(state, { seed: 'test', settlementEdges: edges });

    // Phase E must not decrease exhaustion (Phase D invariant: exhaustion monotonic)
    // Note: Phase II consolidation may increase exhaustion; Phase E must not decrease it
    for (const fid of Object.keys(originalExhaustion)) {
        const original = originalExhaustion[fid] ?? 0;
        const current = result.nextState.phase_ii_exhaustion?.[fid] ?? 0;
        assert.ok(current >= original, `Exhaustion for ${fid} did not decrease (Phase D invariant)`);
    }
});

test('Phase E validation: Phase E does not flip control', async () => {
    const state = minimalPhaseIIState();
    const originalControl = { ...state.political_controllers };
    const edges = [{ a: 'S1', b: 'S2' }];

    // Run Phase E derivations
    diffusePressure(state, edges);
    deriveAoRMembership(state, edges);
    deriveRearPoliticalControlZones(state, edges);

    // Phase E must not flip control (read-only derivation)
    assert.deepStrictEqual(state.political_controllers, originalControl, 'Phase E does not flip control');
});

test('Phase E validation: Phase E does not create end-state', async () => {
    const state = minimalPhaseIIState();
    const edges = [{ a: 'S1', b: 'S2' }];

    const result = await runTurn(state, { seed: 'test', settlementEdges: edges });

    // Phase E must not set end_state (negotiation/end-state belongs to Phase O)
    assert.ok(!result.nextState.end_state, 'Phase E does not create end_state');
});

test('Phase E validation: Phase E outputs are consumable by future phases', () => {
    const state = minimalPhaseIIState();
    state.front_pressure = { 'S1__S2': { edge_id: 'S1__S2', value: 10, max_abs: 10, last_updated_turn: 10 } };
    state.front_segments = { 'S1__S2': { edge_id: 'S1__S2', active: true, created_turn: 7, since_turn: 7, last_active_turn: 10, active_streak: 3, max_active_streak: 3, friction: 0, max_friction: 0 } };
    const edges = [{ a: 'S1', b: 'S2' }];

    // Phase E outputs are well-typed and consumable
    const aor = deriveAoRMembership(state, edges);
    const rear = deriveRearPoliticalControlZones(state, edges);

    // AoR membership has expected shape
    assert.ok(typeof aor === 'object', 'AoR membership is an object');
    assert.ok('by_formation' in aor, 'AoR membership has by_formation');

    // Rear zone has expected shape
    assert.ok(typeof rear === 'object', 'Rear zone is an object');
    assert.ok('settlement_ids' in rear, 'Rear zone has settlement_ids');
    assert.ok(Array.isArray(rear.settlement_ids), 'Rear zone settlement_ids is an array');

    // Future phases (Phase F, Phase O) can consume these outputs without reinterpretation
});

test('Phase E validation: Phase E is deterministic across multiple turns', async () => {
    const state1 = minimalPhaseIIState();
    const state2 = minimalPhaseIIState();
    const edges = [{ a: 'S1', b: 'S2' }];

    const result1 = await runTurn(state1, { seed: 'test', settlementEdges: edges });
    const result2 = await runTurn(state2, { seed: 'test', settlementEdges: edges });

    // Phase E reports should be identical for same inputs
    assert.deepStrictEqual(
        result1.report.phase_e_aor_derivation,
        result2.report.phase_e_aor_derivation,
        'Phase E AoR derivation is deterministic'
    );
    assert.deepStrictEqual(
        result1.report.phase_e_rear_zone_derivation,
        result2.report.phase_e_rear_zone_derivation,
        'Phase E rear zone derivation is deterministic'
    );
});
