/**
 * Phase B Step 5: Declaration Pressure tests.
 * - RS/HRHB enabling conditions per §4.4; pressure +10/+8; declare at 100.
 * - Declaration does NOT set war_start_turn or referendum_held (war gated by referendum).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import {
    DECLARATION_PRESSURE_THRESHOLD,
    DECLARING_FACTIONS,
    HRHB_PRESSURE_PER_TURN,
    RS_PRESSURE_PER_TURN,
    accumulateDeclarationPressure,
    areHrhbEnablingConditionsMet,
    areRsEnablingConditionsMet,
    type DeclarationPressureOptions
} from '../src/phase0/index.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhase0State(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'decl-test', phase: 'phase_0' },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null
            },
            {
                id: 'RS',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null
            },
            {
                id: 'HRHB',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null
            }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        municipalities: {}
    };
}

const rsSatisfyingOptions: DeclarationPressureOptions = {
    getRsOrgCoverageSerbMajority: () => 65,
    getJnaCoordinationTriggered: () => true,
    getRbhRsRelationship: () => -0.6,
    getFryRecognitionConfirmed: () => true
};

const hrhbSatisfyingOptions: DeclarationPressureOptions = {
    ...rsSatisfyingOptions,
    getHrhbOrgCoverageCroatMajority: () => 55,
    getCroatiaSupportConfirmed: () => true,
    getRbhHrhbRelationship: () => 0.1
};

test('constants match Phase_0_Spec §4.4', () => {
    assert.strictEqual(RS_PRESSURE_PER_TURN, 10);
    assert.strictEqual(HRHB_PRESSURE_PER_TURN, 8);
    assert.strictEqual(DECLARATION_PRESSURE_THRESHOLD, 100);
    assert.deepStrictEqual([...DECLARING_FACTIONS], ['RS', 'HRHB']);
});

test('areRsEnablingConditionsMet: false when no options', () => {
    const state = minimalPhase0State();
    assert.strictEqual(areRsEnablingConditionsMet(state, {}), false);
});

test('areRsEnablingConditionsMet: false when one condition fails', () => {
    const state = minimalPhase0State();
    const opts: DeclarationPressureOptions = {
        getRsOrgCoverageSerbMajority: () => 50,
        getJnaCoordinationTriggered: () => true,
        getRbhRsRelationship: () => -0.6,
        getFryRecognitionConfirmed: () => true
    };
    assert.strictEqual(areRsEnablingConditionsMet(state, opts), false);
});

test('areRsEnablingConditionsMet: true when all conditions met', () => {
    const state = minimalPhase0State();
    assert.strictEqual(areRsEnablingConditionsMet(state, rsSatisfyingOptions), true);
});

test('areRsEnablingConditionsMet: false when RS already declared', () => {
    const state = minimalPhase0State();
    const rs = state.factions.find((f) => f.id === 'RS')!;
    rs.declared = true;
    assert.strictEqual(areRsEnablingConditionsMet(state, rsSatisfyingOptions), false);
});

test('areHrhbEnablingConditionsMet: false when RS not declared', () => {
    const state = minimalPhase0State();
    assert.strictEqual(areHrhbEnablingConditionsMet(state, hrhbSatisfyingOptions), false);
});

test('areHrhbEnablingConditionsMet: true when RS declared and HRHB conditions met', () => {
    const state = minimalPhase0State();
    const rs = state.factions.find((f) => f.id === 'RS')!;
    rs.declared = true;
    assert.strictEqual(areHrhbEnablingConditionsMet(state, hrhbSatisfyingOptions), true);
});

test('accumulateDeclarationPressure: no change when conditions not met', () => {
    const state = minimalPhase0State();
    accumulateDeclarationPressure(state, 1, {});
    const rs = state.factions.find((f) => f.id === 'RS')!;
    const hrhb = state.factions.find((f) => f.id === 'HRHB')!;
    assert.strictEqual(rs.declaration_pressure, 0);
    assert.strictEqual(rs.declared, false);
    assert.strictEqual(hrhb.declaration_pressure, 0);
    assert.strictEqual(hrhb.declared, false);
});

test('accumulateDeclarationPressure: RS gains +10 per turn, declares at 100', () => {
    const state = minimalPhase0State();
    for (let t = 1; t <= 10; t++) {
        accumulateDeclarationPressure(state, t, rsSatisfyingOptions);
    }
    const rs = state.factions.find((f) => f.id === 'RS')!;
    assert.strictEqual(rs.declaration_pressure, 100);
    assert.strictEqual(rs.declared, true);
    assert.strictEqual(rs.declaration_turn, 10);
});

test('accumulateDeclarationPressure: RS pressure stops after declaration', () => {
    const state = minimalPhase0State();
    const rs = state.factions.find((f) => f.id === 'RS')!;
    rs.declaration_pressure = 95;
    accumulateDeclarationPressure(state, 1, rsSatisfyingOptions);
    assert.strictEqual(rs.declaration_pressure, 100);
    assert.strictEqual(rs.declared, true);
    accumulateDeclarationPressure(state, 2, rsSatisfyingOptions);
    assert.strictEqual(rs.declaration_pressure, 100);
});

test('accumulateDeclarationPressure: HRHB gains +8 when RS declared and conditions met', () => {
    const state = minimalPhase0State();
    const rs = state.factions.find((f) => f.id === 'RS')!;
    rs.declared = true;
    rs.declaration_turn = 1;
    for (let t = 2; t <= 13; t++) {
        accumulateDeclarationPressure(state, t, hrhbSatisfyingOptions);
    }
    const hrhb = state.factions.find((f) => f.id === 'HRHB')!;
    assert.strictEqual(hrhb.declaration_pressure, 96);
    assert.strictEqual(hrhb.declared, false);
    accumulateDeclarationPressure(state, 14, hrhbSatisfyingOptions);
    assert.strictEqual(hrhb.declaration_pressure, 100);
    assert.strictEqual(hrhb.declared, true);
    assert.strictEqual(hrhb.declaration_turn, 14);
});

test('declaration does NOT set war_start_turn or referendum_held', () => {
    const state = minimalPhase0State();
    assert.strictEqual(state.meta.war_start_turn, undefined);
    assert.strictEqual(state.meta.referendum_held, undefined);
    for (let t = 1; t <= 10; t++) {
        accumulateDeclarationPressure(state, t, rsSatisfyingOptions);
    }
    const rs = state.factions.find((f) => f.id === 'RS')!;
    assert.strictEqual(rs.declared, true);
    assert.strictEqual(state.meta.war_start_turn, undefined);
    assert.strictEqual(state.meta.referendum_held, undefined);
    assert.strictEqual(state.meta.referendum_eligible_turn, undefined);
});

test('ensureDeclarationState initializes undefined pressure and declared', () => {
    const state = minimalPhase0State();
    const rs = state.factions.find((f) => f.id === 'RS')!;
    delete (rs as unknown as Record<string, unknown>).declaration_pressure;
    delete (rs as unknown as Record<string, unknown>).declared;
    delete (rs as unknown as Record<string, unknown>).declaration_turn;
    accumulateDeclarationPressure(state, 1, rsSatisfyingOptions);
    assert.strictEqual(rs.declaration_pressure, 10);
    assert.strictEqual(rs.declared, false);
    assert.strictEqual(rs.declaration_turn, null);
});
