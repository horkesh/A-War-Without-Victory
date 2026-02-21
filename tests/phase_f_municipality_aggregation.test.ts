/**
 * Phase F Step 4: Municipality displacement aggregation tests.
 * - Aggregation correctness: mean of settlement values => municipality value.
 * - Monotonic: municipality_displacement never decreases.
 * - Deterministic: same inputs => same outputs.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { aggregateSettlementDisplacementToMunicipalities } from '../src/sim/phase_f/displacement_municipality_aggregation.js';
import type { GameState, MunicipalityId, SettlementId } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIIState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 25,
            seed: 'pf-mun',
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
        political_controllers: {}
    };
}

test('aggregateSettlementDisplacementToMunicipalities: mean correctness', () => {
    const state = minimalPhaseIIState();
    state.settlement_displacement = { s1: 0.2, s2: 0.4, s3: 0.6 }; // mean 0.4
    const settlementsByMun = new Map<MunicipalityId, SettlementId[]>();
    settlementsByMun.set('MUN_A', ['s1', 's2', 's3']);
    aggregateSettlementDisplacementToMunicipalities(state, settlementsByMun);
    assert.ok(Math.abs((state.municipality_displacement!['MUN_A'] ?? 0) - 0.4) < 1e-9, 'mean 0.2+0.4+0.6 => 0.4');
});

test('aggregateSettlementDisplacementToMunicipalities: monotonic', () => {
    const state = minimalPhaseIIState();
    state.settlement_displacement = { s1: 0.5 };
    state.municipality_displacement = { MUN_A: 0.3 };
    const settlementsByMun = new Map<MunicipalityId, SettlementId[]>();
    settlementsByMun.set('MUN_A', ['s1']);
    aggregateSettlementDisplacementToMunicipalities(state, settlementsByMun);
    assert.ok(state.municipality_displacement!['MUN_A'] >= 0.3);
    assert.strictEqual(state.municipality_displacement!['MUN_A'], 0.5);
});

test('aggregateSettlementDisplacementToMunicipalities: deterministic ordering', () => {
    const state1 = minimalPhaseIIState();
    const state2 = minimalPhaseIIState();
    state1.settlement_displacement = { a: 0.1, b: 0.3 };
    state2.settlement_displacement = { a: 0.1, b: 0.3 };
    const byMun = new Map<MunicipalityId, SettlementId[]>();
    byMun.set('M1', ['b', 'a']); // different order
    aggregateSettlementDisplacementToMunicipalities(state1, byMun);
    byMun.set('M1', ['a', 'b']);
    aggregateSettlementDisplacementToMunicipalities(state2, byMun);
    assert.strictEqual(state1.municipality_displacement!['M1'], state2.municipality_displacement!['M1']);
});

test('aggregateSettlementDisplacementToMunicipalities: phase_i no-op', () => {
    const state = minimalPhaseIIState();
    state.meta!.phase = 'phase_i';
    state.settlement_displacement = { s1: 0.5 };
    const byMun = new Map<MunicipalityId, SettlementId[]>();
    byMun.set('MUN_A', ['s1']);
    aggregateSettlementDisplacementToMunicipalities(state, byMun);
    assert.strictEqual(state.municipality_displacement === undefined || Object.keys(state.municipality_displacement).length === 0, true);
});
