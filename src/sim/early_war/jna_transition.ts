/**
 * Early-war JNA transition mechanics, executed by the canonical War pipeline.
 * Withdrawal progress and asset transfer to RS (VRS); JNA does not start the war.
 */

import type { GameState, JNATransitionState } from '../../state/game_state.js';

/** Legacy Phase I §4.6.1: withdrawal progress per turn before terminal event truth. */
const WITHDRAWAL_PER_TURN = 0.05;
/** Legacy Phase I §4.6.2: asset transfer to RS per turn (JNA_Total_Assets × 0.05). */
const ASSET_TRANSFER_PER_TURN = 0.05;
/** Legacy Phase I §6.1 completion thresholds. */
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
 * Advance JNA withdrawal and asset transfer in the War pipeline.
 * Before the authored withdrawal event, the legacy transition advances 0.05/turn.
 * The event's `jna_withdrawn` flag is authoritative completion truth.
 * This lifecycle projection never starts the war (Engine Invariants §8).
 */
export function runJNATransition(state: GameState): JNATransitionReport {
    const rsDeclared = state.factions?.some((f) => f.id === 'RS' && f.declared === true) ?? false;
    const withdrawalRecorded = state.military.event_flags?.jna_withdrawn === true;
    let started = false;

    if (!state.military.war_jna) {
        (state as GameState & { war_jna: JNATransitionState }).military.war_jna = {
            transition_begun: false,
            withdrawal_progress: 0,
            asset_transfer_rs: 0
        };
    }
    const jna = state.military.war_jna!;
    const withdrawal_before = jna.withdrawal_progress;
    const asset_transfer_before = jna.asset_transfer_rs;

    if (withdrawalRecorded) {
        started = !jna.transition_begun;
        jna.transition_begun = true;
        jna.withdrawal_progress = 1;
        jna.asset_transfer_rs = 1;
    } else {
        if (!jna.transition_begun && rsDeclared) {
            jna.transition_begun = true;
            jna.withdrawal_progress = 0;
            jna.asset_transfer_rs = 0;
            started = true;
        }

        if (jna.transition_begun) {
            jna.withdrawal_progress = Math.min(1, round2(jna.withdrawal_progress + WITHDRAWAL_PER_TURN));
            jna.asset_transfer_rs = Math.min(1, round2(jna.asset_transfer_rs + ASSET_TRANSFER_PER_TURN));
        }
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

