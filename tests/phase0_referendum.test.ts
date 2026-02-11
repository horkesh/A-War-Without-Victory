/**
 * Phase B Step 6: Mandatory Referendum System tests.
 * - Eligibility when RS and HRHB both declared; deadline and hold set war_start_turn.
 * - Non-war terminal when deadline reached without referendum.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import {
  REFERENDUM_WAR_DELAY_TURNS,
  REFERENDUM_DEADLINE_TURNS_DEFAULT,
  OUTCOME_NON_WAR_TERMINAL,
  isReferendumEligible,
  updateReferendumEligibility,
  holdReferendum,
  checkReferendumDeadline,
  isWarStartTurn,
  applyPhase0ToPhaseITransition
} from '../src/phase0/index.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhase0State(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 0, seed: 'ref-test', phase: 'phase_0' },
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

test('constants match Phase_0_Spec §4.5', () => {
  assert.strictEqual(REFERENDUM_WAR_DELAY_TURNS, 4);
  assert.strictEqual(REFERENDUM_DEADLINE_TURNS_DEFAULT, 12);
  assert.strictEqual(OUTCOME_NON_WAR_TERMINAL, 'non_war_terminal');
});

test('isReferendumEligible: false when RS not declared', () => {
  const state = minimalPhase0State();
  const hrhb = state.factions.find((f) => f.id === 'HRHB')!;
  hrhb.declared = true;
  assert.strictEqual(isReferendumEligible(state), false);
});

test('isReferendumEligible: false when HRHB not declared', () => {
  const state = minimalPhase0State();
  const rs = state.factions.find((f) => f.id === 'RS')!;
  rs.declared = true;
  assert.strictEqual(isReferendumEligible(state), false);
});

test('isReferendumEligible: true when both RS and HRHB declared', () => {
  const state = minimalPhase0State();
  const rs = state.factions.find((f) => f.id === 'RS')!;
  const hrhb = state.factions.find((f) => f.id === 'HRHB')!;
  rs.declared = true;
  hrhb.declared = true;
  assert.strictEqual(isReferendumEligible(state), true);
});

test('updateReferendumEligibility: sets eligible_turn and deadline_turn when eligible', () => {
  const state = minimalPhase0State();
  const rs = state.factions.find((f) => f.id === 'RS')!;
  const hrhb = state.factions.find((f) => f.id === 'HRHB')!;
  rs.declared = true;
  hrhb.declared = true;
  updateReferendumEligibility(state, 5);
  assert.strictEqual(state.meta.referendum_eligible_turn, 5);
  assert.strictEqual(state.meta.referendum_deadline_turn, 5 + REFERENDUM_DEADLINE_TURNS_DEFAULT);
});

test('updateReferendumEligibility: no-op when not eligible', () => {
  const state = minimalPhase0State();
  updateReferendumEligibility(state, 5);
  assert.strictEqual(state.meta.referendum_eligible_turn, undefined);
  assert.strictEqual(state.meta.referendum_deadline_turn, undefined);
});

test('updateReferendumEligibility: idempotent when already eligible', () => {
  const state = minimalPhase0State();
  const rs = state.factions.find((f) => f.id === 'RS')!;
  const hrhb = state.factions.find((f) => f.id === 'HRHB')!;
  rs.declared = true;
  hrhb.declared = true;
  updateReferendumEligibility(state, 5);
  const firstDeadline = state.meta.referendum_deadline_turn;
  updateReferendumEligibility(state, 10);
  assert.strictEqual(state.meta.referendum_eligible_turn, 5);
  assert.strictEqual(state.meta.referendum_deadline_turn, firstDeadline);
});

test('updateReferendumEligibility: respects deadlineTurns option', () => {
  const state = minimalPhase0State();
  const rs = state.factions.find((f) => f.id === 'RS')!;
  const hrhb = state.factions.find((f) => f.id === 'HRHB')!;
  rs.declared = true;
  hrhb.declared = true;
  updateReferendumEligibility(state, 3, { deadlineTurns: 6 });
  assert.strictEqual(state.meta.referendum_eligible_turn, 3);
  assert.strictEqual(state.meta.referendum_deadline_turn, 9);
});

test('holdReferendum: sets referendum_held, referendum_turn, war_start_turn', () => {
  const state = minimalPhase0State();
  holdReferendum(state, 10);
  assert.strictEqual(state.meta.referendum_held, true);
  assert.strictEqual(state.meta.referendum_turn, 10);
  assert.strictEqual(state.meta.war_start_turn, 10 + REFERENDUM_WAR_DELAY_TURNS);
});

test('checkReferendumDeadline: no-op before deadline', () => {
  const state = minimalPhase0State();
  state.meta.referendum_eligible_turn = 0;
  state.meta.referendum_deadline_turn = 12;
  checkReferendumDeadline(state, 5);
  assert.strictEqual(state.meta.game_over, undefined);
  assert.strictEqual(state.meta.outcome, undefined);
});

test('checkReferendumDeadline: no-op when referendum already held', () => {
  const state = minimalPhase0State();
  state.meta.referendum_eligible_turn = 0;
  state.meta.referendum_deadline_turn = 12;
  state.meta.referendum_held = true;
  checkReferendumDeadline(state, 15);
  assert.strictEqual(state.meta.game_over, undefined);
  assert.strictEqual(state.meta.outcome, undefined);
});

test('checkReferendumDeadline: sets game_over and outcome when deadline reached', () => {
  const state = minimalPhase0State();
  state.meta.referendum_eligible_turn = 0;
  state.meta.referendum_deadline_turn = 12;
  checkReferendumDeadline(state, 12);
  assert.strictEqual(state.meta.game_over, true);
  assert.strictEqual(state.meta.outcome, OUTCOME_NON_WAR_TERMINAL);
});

test('checkReferendumDeadline: no-op when no deadline set', () => {
  const state = minimalPhase0State();
  checkReferendumDeadline(state, 100);
  assert.strictEqual(state.meta.game_over, undefined);
});

test('isWarStartTurn: false when referendum not held', () => {
  const state = minimalPhase0State();
  state.meta.turn = 14;
  state.meta.war_start_turn = 14;
  assert.strictEqual(isWarStartTurn(state), false);
});

test('isWarStartTurn: false when turn !== war_start_turn', () => {
  const state = minimalPhase0State();
  state.meta.referendum_held = true;
  state.meta.referendum_turn = 10;
  state.meta.war_start_turn = 14;
  state.meta.turn = 13;
  assert.strictEqual(isWarStartTurn(state), false);
});

test('isWarStartTurn: true when referendum held and turn === war_start_turn', () => {
  const state = minimalPhase0State();
  state.meta.referendum_held = true;
  state.meta.referendum_turn = 10;
  state.meta.war_start_turn = 14;
  state.meta.turn = 14;
  assert.strictEqual(isWarStartTurn(state), true);
});

test('applyPhase0ToPhaseITransition: no transition when phase is not phase_0', () => {
  const state = minimalPhase0State();
  state.meta.phase = 'phase_i';
  state.meta.referendum_held = true;
  state.meta.war_start_turn = 14;
  state.meta.turn = 14;
  const result = applyPhase0ToPhaseITransition(state);
  assert.strictEqual(result, false);
  assert.strictEqual(state.meta.phase, 'phase_i');
});

test('applyPhase0ToPhaseITransition: no transition when not war_start_turn', () => {
  const state = minimalPhase0State();
  state.meta.phase = 'phase_0';
  state.meta.referendum_held = true;
  state.meta.war_start_turn = 14;
  state.meta.turn = 13;
  const result = applyPhase0ToPhaseITransition(state);
  assert.strictEqual(result, false);
  assert.strictEqual(state.meta.phase, 'phase_0');
});

test('applyPhase0ToPhaseITransition: transitions to phase_i only when phase_0 and war_start_turn', () => {
  const state = minimalPhase0State();
  state.meta.phase = 'phase_0';
  state.meta.referendum_held = true;
  state.meta.referendum_turn = 10;
  state.meta.war_start_turn = 14;
  state.meta.turn = 14;
  const result = applyPhase0ToPhaseITransition(state);
  assert.strictEqual(result, true);
  assert.strictEqual(state.meta.phase, 'phase_i');
});
