/**
 * Phase F Step 3: Settlement-level displacement accumulation tests.
 * - Monotonic: displacement never decreases.
 * - Bounded: values stay in [0, 1].
 * - Deterministic: same inputs => same outputs after N turns.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { applySettlementDisplacementDeltas } from '../src/sim/phase_f/displacement_accumulation.js';
import type { GameState, SettlementId } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { serializeState } from '../src/state/serialize.js';

function minimalPhaseIIState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 25,
            seed: 'pf-acc',
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
        political_controllers: { S1: 'RBiH', S2: 'RS' }
    };
}

test('applySettlementDisplacementDeltas: monotonic', () => {
    const state = minimalPhaseIIState();
    state.settlement_displacement = { S1: 0.1, S2: 0.2 };
    const deltas: Record<SettlementId, number> = { S1: 0.03, S2: 0.02 };
    applySettlementDisplacementDeltas(state, deltas);
    assert.strictEqual(state.settlement_displacement!['S1'], 0.13);
    assert.strictEqual(state.settlement_displacement!['S2'], 0.22);
    // Second application with same deltas: values should not decrease
    const beforeS1 = state.settlement_displacement!['S1'];
    applySettlementDisplacementDeltas(state, deltas);
    assert.ok(state.settlement_displacement!['S1'] >= beforeS1);
    assert.ok(state.settlement_displacement!['S2'] >= 0.22);
});

test('applySettlementDisplacementDeltas: bounded [0, 1]', () => {
    const state = minimalPhaseIIState();
    state.settlement_displacement = { S1: 0.98 };
    applySettlementDisplacementDeltas(state, { S1: 0.05 });
    assert.ok(state.settlement_displacement!['S1'] <= 1);
    assert.ok(state.settlement_displacement!['S1'] >= 0.98);
});

test('applySettlementDisplacementDeltas: deterministic same inputs => same outputs', () => {
    const state1 = minimalPhaseIIState();
    const state2 = minimalPhaseIIState();
    const deltas = { S1: 0.02, S2: 0.03 };
    applySettlementDisplacementDeltas(state1, deltas);
    applySettlementDisplacementDeltas(state2, deltas);
    assert.deepStrictEqual(state1.settlement_displacement, state2.settlement_displacement);
    assert.deepStrictEqual(state1.settlement_displacement_started_turn, state2.settlement_displacement_started_turn);
});

test('applySettlementDisplacementDeltas: N turns same deltas => byte-identical serialization', () => {
    const build = () => {
        const s = minimalPhaseIIState();
        s.settlement_displacement = {};
        s.settlement_displacement_started_turn = {};
        return s;
    };
    const stateA = build();
    const stateB = build();
    const deltas = { S1: 0.02, S2: 0.02 };
    for (let t = 0; t < 5; t++) {
        stateA.meta!.turn = 20 + t;
        stateB.meta!.turn = 20 + t;
        applySettlementDisplacementDeltas(stateA, deltas);
        applySettlementDisplacementDeltas(stateB, deltas);
    }
    const outA = serializeState(stateA);
    const outB = serializeState(stateB);
    assert.strictEqual(outA, outB, 'Same inputs over N turns must produce byte-identical serialized state');
});

test('applySettlementDisplacementDeltas: phase_i no-op', () => {
    const state = minimalPhaseIIState();
    state.meta!.phase = 'phase_i';
    state.settlement_displacement = { S1: 0.1 };
    const before = state.settlement_displacement['S1'];
    applySettlementDisplacementDeltas(state, { S1: 0.05 });
    assert.strictEqual(state.settlement_displacement!['S1'], before);
});
