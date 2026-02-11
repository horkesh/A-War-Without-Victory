/**
 * Phase C Step 8: JNA transition mechanics (Phase_I_Specification_v0_4_0.md §4.6).
 * Withdrawal progress and asset transfer to RS (VRS); JNA does not start the war (referendum-gated).
 */

import type { GameState } from '../../state/game_state.js';
import type { PhaseIJNAState } from '../../state/game_state.js';

/** Phase I §4.6.1: withdrawal progress per turn. */
const WITHDRAWAL_PER_TURN = 0.05;
/** Phase I §4.6.2: asset transfer to RS per turn (JNA_Total_Assets × 0.05). */
const ASSET_TRANSFER_PER_TURN = 0.05;
/** Phase I §6.1: transition complete when withdrawal ≥ 0.95 and asset transfer ≥ 0.90. */
const WITHDRAWAL_COMPLETE_THRESHOLD = 0.95;
const ASSET_COMPLETE_THRESHOLD = 0.9;

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

export interface JNATransitionReport {
  started: boolean;
  withdrawal_before: number;
  withdrawal_after: number;
  asset_transfer_before: number;
  asset_transfer_after: number;
  completed: boolean;
}

/**
 * Advance JNA withdrawal and asset transfer (Phase I §4.6).
 * Starts transition when RS is declared and war active (Phase I already gated); advances 0.05/turn each.
 * Does not start the war; war start remains referendum-gated (Engine Invariants §8).
 */
export function runJNATransition(state: GameState): JNATransitionReport {
  const rsDeclared = state.factions?.some((f) => f.id === 'RS' && f.declared === true) ?? false;
  let started = false;

  if (!state.phase_i_jna) {
    (state as GameState & { phase_i_jna: PhaseIJNAState }).phase_i_jna = {
      transition_begun: false,
      withdrawal_progress: 0,
      asset_transfer_rs: 0
    };
  }
  const jna = state.phase_i_jna!;

  if (!jna.transition_begun && rsDeclared) {
    jna.transition_begun = true;
    jna.withdrawal_progress = 0;
    jna.asset_transfer_rs = 0;
    started = true;
  }

  const withdrawal_before = jna.withdrawal_progress;
  const asset_transfer_before = jna.asset_transfer_rs;

  if (jna.transition_begun) {
    jna.withdrawal_progress = Math.min(1, round2(jna.withdrawal_progress + WITHDRAWAL_PER_TURN));
    jna.asset_transfer_rs = Math.min(1, round2(jna.asset_transfer_rs + ASSET_TRANSFER_PER_TURN));
  }

  const withdrawal_after = jna.withdrawal_progress;
  const asset_transfer_after = jna.asset_transfer_rs;
  const completed =
    jna.transition_begun &&
    withdrawal_after >= WITHDRAWAL_COMPLETE_THRESHOLD &&
    asset_transfer_after >= ASSET_COMPLETE_THRESHOLD;

  return {
    started,
    withdrawal_before,
    withdrawal_after,
    asset_transfer_before,
    asset_transfer_after,
    completed
  };
}
