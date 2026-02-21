/**
 * Phase B Step 8: Phase 0 Turn Structure tests.
 * - runPhase0Turn runs steps 4–10 in spec order; no-op when game_over or not phase_0.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import {
    buildPhase0TurnOptions,
    getPrewarCapital,
    runPhase0Turn,
    type DeclarationPressureOptions,
    type Phase0TurnOptions
} from '../src/phase0/index.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhase0State(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'turn-test', phase: 'phase_0' },
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
        municipalities: { M1: {}, M2: {} }
    };
}

const rsSatisfyingOptions: DeclarationPressureOptions = {
    getRsOrgCoverageSerbMajority: () => 65,
    getJnaCoordinationTriggered: () => true,
    getRbhRsRelationship: () => -0.6,
    getFryRecognitionConfirmed: () => true
};

test('runPhase0Turn: no-op when game_over', () => {
    const state = minimalPhase0State();
    state.meta.game_over = true;
    state.meta.turn = 5;
    runPhase0Turn(state, { declarationPressure: rsSatisfyingOptions });
    const rs = state.factions.find((f) => f.id === 'RS')!;
    assert.strictEqual(rs.declaration_pressure, 0);
    assert.strictEqual(state.meta.turn, 5);
});

test('runPhase0Turn: no-op when phase is not phase_0', () => {
    const state = minimalPhase0State();
    state.meta.phase = 'phase_i';
    runPhase0Turn(state, { declarationPressure: rsSatisfyingOptions });
    const rs = state.factions.find((f) => f.id === 'RS')!;
    assert.strictEqual(rs.declaration_pressure, 0);
});

test('runPhase0Turn: runs declaration pressure when options supplied', () => {
    const state = minimalPhase0State();
    state.meta.turn = 1;
    runPhase0Turn(state, { declarationPressure: rsSatisfyingOptions });
    const rs = state.factions.find((f) => f.id === 'RS')!;
    assert.strictEqual(rs.declaration_pressure, 10);
});

test('runPhase0Turn: applies scheduled phase_0 capital trickle', () => {
    const state = minimalPhase0State();
    const beforeRbih = getPrewarCapital(state, 'RBiH');
    const beforeRs = getPrewarCapital(state, 'RS');
    const beforeHrhb = getPrewarCapital(state, 'HRHB');
    state.meta.phase_0_scheduled_referendum_turn = 26;
    state.meta.phase_0_scheduled_war_start_turn = 30;
    runPhase0Turn(state, {});
    assert.strictEqual(getPrewarCapital(state, 'RBiH'), beforeRbih + 1);
    assert.strictEqual(getPrewarCapital(state, 'RS'), beforeRs + 1);
    assert.strictEqual(getPrewarCapital(state, 'HRHB'), beforeHrhb + 1);
});

test('runPhase0Turn: runs referendum eligibility when both declared', () => {
    const state = minimalPhase0State();
    const rs = state.factions.find((f) => f.id === 'RS')!;
    const hrhb = state.factions.find((f) => f.id === 'HRHB')!;
    rs.declared = true;
    hrhb.declared = true;
    state.meta.turn = 3;
    runPhase0Turn(state, { referendum: { deadlineTurns: 5 } });
    assert.strictEqual(state.meta.referendum_eligible_turn, 3);
    assert.strictEqual(state.meta.referendum_deadline_turn, 8);
});

test('runPhase0Turn: runs stability update (municipalities get scores)', () => {
    const state = minimalPhase0State();
    runPhase0Turn(state, {});
    assert.strictEqual(state.municipalities!.M1!.stability_score, 35);
    assert.strictEqual(state.municipalities!.M2!.stability_score, 35);
});

test('runPhase0Turn: runs transition when war_start_turn', () => {
    const state = minimalPhase0State();
    state.meta.referendum_held = true;
    state.meta.referendum_turn = 10;
    state.meta.war_start_turn = 14;
    state.meta.turn = 14;
    runPhase0Turn(state, {});
    assert.strictEqual(state.meta.phase, 'phase_i');
});

test('runPhase0Turn: runs non-war terminal when deadline reached', () => {
    const state = minimalPhase0State();
    state.meta.referendum_eligible_turn = 0;
    state.meta.referendum_deadline_turn = 4;
    state.meta.turn = 4;
    runPhase0Turn(state, {});
    assert.strictEqual(state.meta.game_over, true);
    assert.strictEqual(state.meta.outcome, 'non_war_terminal');
});

test('runPhase0Turn: full sequence order (eligibility then deadline check)', () => {
    const state = minimalPhase0State();
    const rs = state.factions.find((f) => f.id === 'RS')!;
    const hrhb = state.factions.find((f) => f.id === 'HRHB')!;
    rs.declared = true;
    hrhb.declared = true;
    state.meta.turn = 2;
    const opts: Phase0TurnOptions = { referendum: { deadlineTurns: 2 } };
    runPhase0Turn(state, opts);
    assert.strictEqual(state.meta.referendum_eligible_turn, 2);
    assert.strictEqual(state.meta.referendum_deadline_turn, 4);
    state.meta.turn = 4;
    runPhase0Turn(state, opts);
    assert.strictEqual(state.meta.game_over, true);
    assert.strictEqual(state.meta.outcome, 'non_war_terminal');
});

test('runPhase0Turn: buildPhase0TurnOptions sets referendum deadline from schedule (Priority C)', () => {
    const state = minimalPhase0State();
    const rs = state.factions.find((f) => f.id === 'RS')!;
    const hrhb = state.factions.find((f) => f.id === 'HRHB')!;
    rs.declared = true;
    hrhb.declared = true;
    state.meta.turn = 5;
    state.meta.phase_0_scheduled_referendum_turn = 20;
    state.meta.phase_0_scheduled_war_start_turn = 24;
    const options = buildPhase0TurnOptions(state);
    runPhase0Turn(state, options);
    assert.strictEqual(state.meta.referendum_eligible_turn, 5);
    assert.strictEqual(
        state.meta.referendum_deadline_turn,
        5 + 21,
        'deadline must be eligible_turn + (scheduledRefTurn+1) so scheduled referendum at 20 can fire'
    );
    assert.ok(
        (state.meta.referendum_deadline_turn ?? 0) >= 20,
        'deadline must be >= scheduled referendum turn (no early non_war_terminal)'
    );
});
