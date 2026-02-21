/**
 * Phase D Step 5: Exhaustion accumulation tests.
 * - Exhaustion never decreases.
 * - Prolonged conflict increases exhaustion for all sides.
 * - Exhaustion does not flip control directly.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { updatePhaseIIExhaustion } from '../src/sim/phase_ii/exhaustion.js';
import type { GameState, PhaseIIFrontDescriptor } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIIState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 20, seed: 'ex-test', phase: 'phase_ii', referendum_held: true, referendum_turn: 6, war_start_turn: 10 },
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

test('exhaustion never decreases', () => {
    const state = minimalPhaseIIState();
    state.phase_ii_exhaustion = { RBiH: 50, RS: 50, HRHB: 50 };
    const before = { ...state.phase_ii_exhaustion };
    updatePhaseIIExhaustion(state, []);
    assert.ok(state.phase_ii_exhaustion!['RBiH']! >= before['RBiH']!);
    assert.ok(state.phase_ii_exhaustion!['RS']! >= before['RS']!);
    assert.ok(state.phase_ii_exhaustion!['HRHB']! >= before['HRHB']!);
});

test('prolonged conflict increases exhaustion for all sides', () => {
    const state = minimalPhaseIIState();
    state.phase_ii_exhaustion = { RBiH: 0, RS: 0, HRHB: 0 };
    state.phase_ii_supply_pressure = { RBiH: 20, RS: 30, HRHB: 10 };
    const staticFronts: PhaseIIFrontDescriptor[] = [
        { id: 'F_RS--RBiH_e1', edge_ids: ['e1'], created_turn: 10, stability: 'static' }
    ];
    updatePhaseIIExhaustion(state, staticFronts);
    assert.ok(state.phase_ii_exhaustion!['RBiH']! > 0);
    assert.ok(state.phase_ii_exhaustion!['RS']! > 0);
    assert.ok(state.phase_ii_exhaustion!['HRHB']! > 0);
});

test('exhaustion does not flip control directly', () => {
    const state = minimalPhaseIIState();
    const controllersBefore = state.political_controllers ? { ...state.political_controllers } : {};
    state.phase_ii_exhaustion = { RBiH: 0, RS: 0, HRHB: 0 };
    state.phase_ii_supply_pressure = { RBiH: 100, RS: 100, HRHB: 100 };
    updatePhaseIIExhaustion(state, [
        { id: 'F1', edge_ids: ['e1'], created_turn: 1, stability: 'static' }
    ]);
    assert.deepStrictEqual(state.political_controllers, controllersBefore);
});

test('updatePhaseIIExhaustion does nothing when meta.phase is phase_i', () => {
    const state = minimalPhaseIIState();
    state.meta.phase = 'phase_i';
    state.phase_ii_exhaustion = { RBiH: 0, RS: 0, HRHB: 0 };
    updatePhaseIIExhaustion(state, []);
    assert.strictEqual(state.phase_ii_exhaustion!['RBiH'], 0);
    assert.strictEqual(state.phase_ii_exhaustion!['RS'], 0);
});
