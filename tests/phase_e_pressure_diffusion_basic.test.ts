/**
 * Phase E1.1: Phase E pressure diffusion basic tests.
 * - Minimal diffusion behavior consistent with roadmap (smoke-level when constants are stubbed).
 * - Stable ordering: no dependence on object insertion order.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { diffusePressure } from '../src/sim/phase_e/pressure_diffusion.js';
import { getEligiblePressureEdges, isPressureEligible, toEdgeId } from '../src/sim/phase_e/pressure_eligibility.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function stateWithOpposingControl(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 1, seed: 's', phase: 'phase_ii', referendum_held: true, referendum_turn: 0, war_start_turn: 1 },
        factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {
            S1__S2: { edge_id: 'S1__S2', value: 10, max_abs: 10, last_updated_turn: 0 }
        },
        militia_pools: {},
        political_controllers: { S1: 'RBiH', S2: 'RS', S3: 'RBiH' }
    };
}

test('isPressureEligible: edge with opposing control is eligible', () => {
    const state = stateWithOpposingControl();
    assert.strictEqual(isPressureEligible(state, { a: 'S1', b: 'S2' }), true);
});

test('isPressureEligible: edge with same control is ineligible', () => {
    const state = stateWithOpposingControl();
    assert.strictEqual(isPressureEligible(state, { a: 'S1', b: 'S3' }), false);
});

test('getEligiblePressureEdges: stable order (independent of input order)', () => {
    const state = stateWithOpposingControl();
    const edges1 = [
        { a: 'S2', b: 'S1' },
        { a: 'S1', b: 'S2' }
    ];
    const edges2 = [
        { a: 'S1', b: 'S2' },
        { a: 'S2', b: 'S1' }
    ];
    const out1 = getEligiblePressureEdges(state, edges1);
    const out2 = getEligiblePressureEdges(state, edges2);
    assert.strictEqual(out1.length, out2.length);
    assert.strictEqual(toEdgeId(out1[0]!.a, out1[0]!.b), toEdgeId(out2[0]!.a, out2[0]!.b));
});

test('diffusePressure: returns state and report; report has applied and stats', () => {
    const state = stateWithOpposingControl();
    const edges = [{ a: 'S1', b: 'S2' }];
    const { state: next, report } = diffusePressure(state, edges);
    assert.strictEqual(next, state);
    assert.strictEqual(typeof report.applied, 'boolean');
    assert.strictEqual(typeof report.reason_if_not_applied, 'string');
    assert.ok('nodes_with_outflow' in report.stats);
    assert.ok('total_outflow' in report.stats);
    assert.ok('total_inflow' in report.stats);
    assert.ok('conserved_error_fix_applied' in report.stats);
});
