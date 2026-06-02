// Officer-Resentment Consequence-Receipt read-model — closes the HUMAN-COST
// half of the force-op "authorship of the tragedy" AFTER-loop.
//
// The territorial AFTER half (#118, forcedOpReceipts.ts) surfaces what an op the
// president force-launched actually PRODUCED on the ground. This sibling surfaces
// what overriding the general COST in his loyalty: when the president forces a
// requested op past a corps commander's shown objection, the engine
// (`recordPresidentialOverride`, order_interpretation.ts ~:493-525) bumps the
// commanding officer's persisted `override_count` / `last_override_turn`, appends a
// rolling `recent_overrides` entry, and on the cowed threshold sets
// `cowed_until_turn`. None of that was player-facing. This pure read-model emits
// the receipt — "you overrode General X, and here is what it cost you" — factual,
// negative-sum, never celebratory.
//
// Design rules (mirrors forcedOpReceipts.ts):
//   - PURE. No state mutation. No engine calls.
//   - DEFENSIVE. Flag-off / pre-substrate saves carry no overrides; the
//     projection collapses to an empty array.
//   - DETERMINISTIC. Sorted iteration via `strictCompare` (override turn then
//     officer id). No Math.random, no Date.now, no timestamps.
//   - REALIZED ONLY. We render the override the engine already persisted onto the
//     officer state — we do not re-simulate.
//
// PLAYER-ORIGIN (caveat verified, mirrors forcedOpReceipts' reasoning): the
// override fields on a NamedOfficerState can only be written by
// `recordPresidentialOverride`. Its two callers are both player-only:
//   1. war_phases.ts injectOpDirectives (~:767) — gated on
//      `pending_op_directive.forced_over_objection`, and the whole step early-outs
//      with ZERO mutation when no corps has a `pending_op_directive` (an OPTIONAL
//      field never set in headless/historical runs), so it only fires for a player
//      force-launch over objection.
//   2. order_interpretation.ts overrideInterpretation (~:551) — gated on a
//      `pending_officer_events` entry being `overridable`; a player-IPC override
//      path that bot/historical runs never invoke.
// Therefore the override substrate is empty for bot/historical → the projection
// returns [] → calibration untouched.

import type { GameState } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';

/** One receipt: a single corps commander the president overrode by force-launching
 *  an operation past his shown objection. */
export interface OfficerResentmentReceipt {
    /** Stable id for keying/dedupe — the officer id. */
    id: string;
    /** Display name of the overridden commander (falls back to a generic label). */
    officerName: string;
    /** Corps the officer commands (null when unassigned in state). */
    corpsId: string | null;
    /** Turn of the most recent override the president authored against this CO. */
    overrideTurn: number;
    /** Running count of presidential overrides against this CO this war. Note the
     *  engine RESETS this to 0 the turn an officer is cowed, so a cowed officer
     *  reports `overrideCount: 0` — `newlyCowed` carries that signal instead. */
    overrideCount: number;
    /** True when this override pushed the CO over the cowed threshold this turn —
     *  he now complies fully without deviation until `cowedUntilTurn`. */
    newlyCowed: boolean;
    /** Turn until which the CO is cowed (compliant), when set. */
    cowedUntilTurn: number | null;
}

/**
 * Build the realized officer-resentment receipt list from the persisted officer
 * substrate. Iterates `state.military.named_officers`, keeps only officers the
 * president has overridden (`last_override_turn` set — player-origin by
 * construction, see header), joins the display name from `named_officer_data`, and
 * maps each to a sober receipt. Returns `[]` defensively when state or the officer
 * map is absent.
 *
 * Deterministic ordering: override turn ascending, then officer id via
 * `strictCompare`.
 */
export function buildOfficerResentmentReceipts(
    state: GameState | null | undefined,
): OfficerResentmentReceipt[] {
    const officers = state?.military?.named_officers;
    if (!officers) return [];

    const officerData = state?.military?.named_officer_data ?? [];

    const out: OfficerResentmentReceipt[] = [];
    const officerIds = Object.keys(officers).sort(strictCompare);
    for (const id of officerIds) {
        const os = officers[id];
        if (!os) continue;
        // Only the president overriding a CO sets last_override_turn (player-origin).
        if (os.last_override_turn === undefined) continue;

        const data = officerData.find((o) => o.id === id);
        const cowedUntilTurn = os.cowed_until_turn ?? null;
        const overrideTurn = os.last_override_turn;
        // The override was "newly cowed" when the cow window opens on this override
        // turn (recordPresidentialOverride sets cowed_until_turn = turn + DURATION).
        const newlyCowed =
            cowedUntilTurn !== null && cowedUntilTurn > overrideTurn;

        out.push({
            id,
            officerName: data?.name?.trim() || 'the corps commander',
            corpsId: os.assigned_corps_id ?? null,
            overrideTurn,
            overrideCount: os.override_count ?? 0,
            newlyCowed,
            cowedUntilTurn,
        });
    }

    return out.sort((a, b) => {
        if (a.overrideTurn !== b.overrideTurn) return a.overrideTurn - b.overrideTurn;
        return strictCompare(a.id, b.id);
    });
}

/** Convenience filter: receipts whose most recent override landed on `turn`. Used
 *  by the Turn Aftermath "officer-resentment" section. */
export function officerResentmentReceiptsRealizedOnTurn(
    receipts: readonly OfficerResentmentReceipt[],
    turn: number,
): OfficerResentmentReceipt[] {
    return receipts.filter((r) => r.overrideTurn === turn);
}
