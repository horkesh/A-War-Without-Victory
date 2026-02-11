/**
 * Browser-safe Phase 0 turn advancement for the warroom.
 * Uses runPhase0Turn from the phase0 pipeline and advances meta.turn by 1.
 * No Node/fs dependencies so it can run in the Vite bundle.
 * Phase I+ is not supported here; use sim/turn_pipeline runTurn in Node for war phases.
 */

import type { GameState } from '../../state/game_state.js';
import { runPhase0Turn } from '../../phase0/turn.js';

function cloneState(state: GameState): GameState {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(state);
  }
  return JSON.parse(JSON.stringify(state)) as GameState;
}

/**
 * Run one Phase 0 turn: runPhase0Turn then advance meta.turn by 1.
 * Returns new state; does not mutate the argument.
 * Only valid when state.meta.phase === 'phase_0'.
 */
export function runPhase0TurnAndAdvance(state: GameState, seed: string): GameState {
  const working = cloneState(state);
  if (working.meta.phase !== 'phase_0') {
    return working;
  }
  runPhase0Turn(working, {});
  const nextTurn = working.meta.turn + 1;
  if (!Number.isInteger(nextTurn) || nextTurn < 0) {
    throw new Error(`Invariant: meta.turn must be non-negative integer; got ${nextTurn}`);
  }
  return {
    ...working,
    meta: {
      ...working.meta,
      turn: nextTurn,
      seed
    }
  };
}
