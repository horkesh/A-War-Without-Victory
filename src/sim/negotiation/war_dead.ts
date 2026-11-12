/**
 * The war's dead so far, all sides, from the same sources the Verdict's cost ledger
 * reads (sim/endgame/cost_ledger.ts): military killed from the casualty ledger and
 * civilians killed from the displacement state. Used to stamp each peace plan answer
 * and by the delegation folder, so the folder and the Verdict never disagree.
 *
 * Deterministic: sorted faction iteration, integer sums.
 */
import type { GameState } from '../../state/game_state.js';
import { CANONICAL_FACTIONS } from '../../state/game_state.js';

export interface WarDead { military: number; civilian: number }

export function warDeadTotals(state: GameState): WarDead {
    const ledger = state.military?.casualty_ledger ?? {};
    const civilians = (state.displacement as { civilian_casualties?: Record<string, { killed?: number }> } | undefined)?.civilian_casualties ?? {};
    let military = 0;
    let civilian = 0;
    for (const faction of [...CANONICAL_FACTIONS].sort()) {
        military += Math.max(0, Math.round((ledger as Record<string, { killed?: number }>)[faction]?.killed ?? 0));
        civilian += Math.max(0, Math.round(civilians[faction]?.killed ?? 0));
    }
    return { military, civilian };
}
