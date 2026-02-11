/**
 * Phase 3 executive roadmap: Referendum held → war at correct turn.
 * Build Phase 0 state with referendum_held, referendum_turn, war_start_turn.
 * Advance to war_start_turn via runOneTurn; assert meta.phase === 'phase_i'.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { runOneTurn } from '../src/state/turn_pipeline.js';
import { buildMinimalPhase0State } from './phase0_e2e_helper.js';

const INPUTS = { seed: 'war-start-e2e' };

test('referendum held: at war_start_turn runPhase0Turn applies transition to phase_i', () => {
  const referendumTurn = 2;
  const warStartTurn = referendumTurn + 4;

  let state = buildMinimalPhase0State({
    turn: warStartTurn,
    seed: INPUTS.seed,
    referendum_held: true,
    referendum_turn: referendumTurn,
    war_start_turn: warStartTurn
  });

  assert.strictEqual(state.meta.phase, 'phase_0', 'must start in phase_0');
  assert.strictEqual(state.meta.turn, warStartTurn, 'start at war_start_turn so transition runs this turn');

  const result = runOneTurn(state, INPUTS);
  state = result.state;

  assert.strictEqual(state.meta.phase, 'phase_i', 'phase must transition to phase_i when current_turn === war_start_turn');
  assert.strictEqual(state.meta.turn, warStartTurn + 1, 'turn advances after transition');
});

test('referendum held: war_start_turn is referendum_turn + 4 (canon)', () => {
  const referendumTurn = 10;
  const warStartTurn = referendumTurn + 4;

  const state = buildMinimalPhase0State({
    turn: referendumTurn,
    seed: INPUTS.seed,
    referendum_held: true,
    referendum_turn: referendumTurn,
    war_start_turn: warStartTurn
  });

  assert.strictEqual(state.meta.war_start_turn, 14, 'war_start_turn must be referendum_turn + 4 per Phase_0_Spec §4.5');
});
