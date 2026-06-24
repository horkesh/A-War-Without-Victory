// Forced-Operation Consequence-Receipt read-model — closes the force-op
// "authorship of the tragedy" AFTER-loop.
//
// The BEFORE half (#108/#109): forcing an operation over a corps commander's
// shown objection tags the emitted op `was_force_launched` +
// `commander_assessment_at_launch`, and finalizeOperationAAR snapshots those
// onto the persisted OperationAAR at resolution (operation_aar.ts ~:874-880).
//
// This pure read-model surfaces the RECEIPT: when a force-launched operation
// actually RESOLVES, render the outcome the president authored over the
// commander's recommendation — factual, negative-sum, never celebratory.
//
// Design rules (mirrors consequenceReceipts.ts):
//   - PURE. No state mutation. No engine calls.
//   - DEFENSIVE. Flag-off / pre-substrate saves carry no force_launched AARs;
//     the projection collapses to an empty array.
//   - DETERMINISTIC. Sorted iteration via `strictCompare` (ended_turn then id).
//     No Math.random, no Date.now, no timestamps.
//   - REALIZED ONLY. We render what the engine already finalized onto the AAR —
//     we do not re-simulate.
//
// PLAYER-ORIGIN (caveat verified): the `force_launched` flag on an AAR can only
// originate from a player force-launch. Two engine sites set
// `was_force_launched`:
//   1. war_phases.ts injectOpDirectives — gated on `pending_op_directive`, which
//      is OPTIONAL and never set in headless/historical runs (early-out with
//      zero mutation), so it only fires for a player force-launch.
//   2. commander/commander_loop.ts:289 — Direct Intervention, gated on
//      `playerOpResp?.force_launched === true`; headless/bot runs never set
//      player_op_response (autonomy level 0) so the branch is never taken
//      outside human play.
// The AAR does not carry a `requested_by_president` flag, but neither path can
// fire for a bot, so `force_launched === true` is itself the player-origin
// signal. The bot/historical projection is therefore [] → calibration untouched.

import type { GameState } from '../../../state/game_state.js';
import type { OperationAAR } from '../../../sim/combat/operation_aar.js';
import { strictCompare } from '../../../state/validateGameState.js';
import { getPlayerSafeOperationName } from '../utils/playerSafeText.js';
import { isCanonicalPlayerFaction, playerFactionMatch } from './playerFactionMatch.js';

/** One receipt: a single resolved operation that the president force-launched
 *  over the corps commander's objection. */
export interface ForcedOpReceipt {
    /** Stable id for keying/dedupe — the AAR's operation_id. */
    id: string;
    /** Display name of the forced operation. */
    opName: string;
    /** Corps that executed the operation. */
    corpsId: string;
    /** Commander whose objection was overridden (falls back to a generic label). */
    commanderName: string;
    /** The recommendation snapshotted at the moment of the presidential decision
     *  (a no-go assessment — 'abort'/'postpone' — when present). */
    assessmentAtLaunch: string | null;
    /** Operation outcome bucket. */
    outcome: OperationAAR['outcome'];
    /** Star grade (1-5) awarded by gradeOperation. */
    grade: number;
    /** Friendly casualties suffered (killed + wounded). */
    casualtiesSuffered: number;
    /** Enemy casualties inflicted (killed + wounded). */
    casualtiesInflicted: number;
    /** Number of objectives held at operation resolution. */
    objectivesHeldAtClose: number;
    /** Turn the operation resolved. */
    endedTurn: number;
}

/** Sum killed + wounded defensively. */
function tally(t: { killed?: number; wounded?: number } | undefined): number {
    if (!t) return 0;
    return (t.killed ?? 0) + (t.wounded ?? 0);
}

function getPlayerFaction(state: GameState | null | undefined): string | null {
    return typeof state?.meta?.player_faction === 'string' ? state.meta.player_faction : null;
}

function aarBelongsToPlayer(aar: OperationAAR, playerFaction: string | null): boolean {
    if (!isCanonicalPlayerFaction(playerFaction)) return true;
    const aarFaction = (aar as { faction?: unknown }).faction;
    return typeof aarFaction === 'string' && playerFactionMatch(aarFaction, playerFaction);
}

/**
 * Build the realized forced-op receipt list from the persisted AAR substrate.
 * Iterates `state.operation_history`, keeps only `force_launched === true`
 * AARs (player-origin by construction — see header), and maps each to a sober
 * receipt. Returns `[]` defensively when state or the AAR list is absent.
 *
 * Deterministic ordering: ended_turn ascending, then operation_id via
 * `strictCompare`.
 */
export function buildForcedOpReceipts(
    state: GameState | null | undefined,
): ForcedOpReceipt[] {
    const aars = state?.operation_history;
    if (!aars || aars.length === 0) return [];
    const playerFaction = getPlayerFaction(state);

    const out: ForcedOpReceipt[] = [];
    for (const aar of aars) {
        if (aar.force_launched !== true) continue;
        if (!aarBelongsToPlayer(aar, playerFaction)) continue;
        out.push({
            id: aar.operation_id,
            opName: getPlayerSafeOperationName(aar.operation_name, aar.corps_id, 'Operation'),
            corpsId: aar.corps_id,
            commanderName: aar.commander_name?.trim() || 'the corps commander',
            assessmentAtLaunch: aar.commander_assessment_at_launch ?? null,
            outcome: aar.outcome,
            grade: aar.grade?.stars ?? 0,
            casualtiesSuffered: tally(aar.casualties_suffered),
            casualtiesInflicted: tally(aar.casualties_inflicted),
            objectivesHeldAtClose: aar.objectives_captured?.length ?? 0,
            endedTurn: aar.ended_turn,
        });
    }

    return out.sort((a, b) => {
        if (a.endedTurn !== b.endedTurn) return a.endedTurn - b.endedTurn;
        return strictCompare(a.id, b.id);
    });
}

/** Convenience filter: receipts whose operation resolved on `turn`. Used by the
 *  Turn Aftermath "forced-op consequences" section. */
export function forcedOpReceiptsRealizedOnTurn(
    receipts: readonly ForcedOpReceipt[],
    turn: number,
): ForcedOpReceipt[] {
    return receipts.filter((r) => r.endedTurn === turn);
}
