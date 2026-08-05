// Directive-Outcome Consequence-Receipt read-model — surfaces WHY a president's
// REQUEST-OP directive could not be carried out (Presidential Command Model §4,
// R4 Phase 6 Task 6.2).
//
// The `inject-op-directive` war-phase step writes `op_directive_rejection`
// ({ target_osid, reason, turn }) on a corps command entry when the president named an
// objective the corps commander cannot build an operation toward — no free force, no
// reachable staging, objective already held, no operation slot. The engine computed the
// exact reason and (before this task) threw it away: the president was charged nothing
// visible and told nothing. This pure read-model projects that persisted field into a
// sober, player-facing receipt — the CO explaining a military impossibility, not a UI
// error.
//
// Design rules (mirror commandFrictionReceipts.ts / forcedOpReceipts.ts):
//   - PURE. No state mutation. No engine calls.
//   - DEFENSIVE. Absent field / pre-substrate saves collapse to [].
//   - DETERMINISTIC. Sorted iteration via `strictCompare` (turn then corps id).
//     No Math.random, no Date.now, no timestamps.
//   - REALIZED ONLY. We render the rejection the engine already persisted; the reason
//     code is mapped to player-safe prose at the render layer (opDirectiveObjection
//     `plainReason`), and the target OSID through the `playerSafe`/display-name boundary.
//
// PLAYER-ORIGIN: `op_directive_rejection` is written ONLY when a `pending_op_directive`
// (a player-only staged field, absent in headless/historical runs) fails to build, so the
// bot/historical projection is [] → calibration untouched.

import type { GameState } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';

/** One receipt: a single directive the engine could not carry out, on one corps. */
export interface DirectiveOutcomeReceipt {
    /** Stable id for keying/dedupe (corps + turn). */
    id: string;
    /** Corps whose commander could not execute the order. */
    corpsId: string;
    /** The objective the president named. Resolved to a display name at render. */
    targetOsid: string;
    /** Plan rejection reason code — mapped to player-safe prose by `plainReason()`. */
    reason: string;
    /** Turn the rejection was recorded. */
    turn: number;
}

/**
 * Build the realized directive-outcome receipt list from the per-corps
 * `op_directive_rejection` persisted on `state.military.corps_command[*]`. Returns `[]`
 * defensively when state or the corps_command map is absent.
 *
 * Deterministic ordering: turn ascending, then corps id via `strictCompare`.
 */
export function buildDirectiveOutcomeReceipts(
    state: GameState | null | undefined,
): DirectiveOutcomeReceipt[] {
    const corpsCommand = state?.military?.corps_command;
    if (!corpsCommand) return [];

    const out: DirectiveOutcomeReceipt[] = [];
    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        const rejection = corpsCommand[corpsId]?.op_directive_rejection;
        if (!rejection) continue;
        if (typeof rejection.target_osid !== 'string' || typeof rejection.reason !== 'string') continue;
        if (typeof rejection.turn !== 'number') continue;
        out.push({
            id: `directive-rejection:${corpsId}:${rejection.turn}`,
            corpsId,
            targetOsid: rejection.target_osid,
            reason: rejection.reason,
            turn: rejection.turn,
        });
    }

    return out.sort((a, b) => {
        if (a.turn !== b.turn) return a.turn - b.turn;
        return strictCompare(a.corpsId, b.corpsId);
    });
}

/**
 * Convenience filter: receipts recorded on `turn`. The `op_directive_rejection` field is
 * PERSISTENT — it lingers until the next directive on that corps succeeds (or GC) — so the
 * Desk inbox must show only the CURRENT turn's rejection, else a stale "cannot attack"
 * card haunts the desk for weeks. Mirrors `commandFrictionReceiptsRealizedOnTurn`.
 */
export function directiveOutcomeReceiptsRealizedOnTurn(
    receipts: readonly DirectiveOutcomeReceipt[],
    turn: number,
): DirectiveOutcomeReceipt[] {
    return receipts.filter((r) => r.turn === turn);
}
