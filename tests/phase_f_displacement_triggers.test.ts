/**
 * Phase F Step 2: Displacement trigger conditions tests.
 * - Trigger evaluator returns bounded deltas only for front-active settlements when phase_ii.
 * - Deterministic: same state + edges => same deltas.
 * - No triggers in phase_0 / phase_i.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import type { EdgeRecord } from '../src/map/settlements.js';
import { evaluateDisplacementTriggers, PHASE_F_MAX_DELTA_PER_TURN } from '../src/sim/phase_f/displacement_triggers.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIIState(controllers: Record<string, string> = { S1: 'RBiH', S2: 'RS' }): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 20,
            seed: 'pf-trig',
            phase: 'phase_ii',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10
        },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: controllers
    };
}

test('evaluateDisplacementTriggers: phase_i returns empty deltas', () => {
    const state = minimalPhaseIIState() as GameState;
    state.meta!.phase = 'phase_i';
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const { deltas, report } = evaluateDisplacementTriggers(state, edges);
    assert.deepStrictEqual(Object.keys(deltas), []);
    assert.strictEqual(report.triggered_settlements.length, 0);
});

test('evaluateDisplacementTriggers: phase_ii + opposing control yields bounded deltas for front-active settlements', () => {
    const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const { deltas, report } = evaluateDisplacementTriggers(state, edges);
    assert.ok(Object.keys(deltas).length >= 1, 'at least one settlement should get a delta when front-active');
    for (const [sid, val] of Object.entries(deltas)) {
        assert.ok(val > 0 && val <= PHASE_F_MAX_DELTA_PER_TURN, `delta for ${sid} must be in (0, ${PHASE_F_MAX_DELTA_PER_TURN}]`);
    }
    assert.ok(report.reasons['S1']?.includes('front_active') ?? report.reasons['S2']?.includes('front_active'), 'reason should include front_active');
});

test('evaluateDisplacementTriggers: same control on both ends yields no front-active edges', () => {
    const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RBiH' });
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const { deltas } = evaluateDisplacementTriggers(state, edges);
    assert.deepStrictEqual(Object.keys(deltas), []);
});

test('evaluateDisplacementTriggers: deterministic re-run identical', () => {
    const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const r1 = evaluateDisplacementTriggers(state, edges);
    const r2 = evaluateDisplacementTriggers(state, edges);
    assert.deepStrictEqual(r1.deltas, r2.deltas);
    assert.deepStrictEqual(r1.report.triggered_settlements.sort(), r2.report.triggered_settlements.sort());
});
