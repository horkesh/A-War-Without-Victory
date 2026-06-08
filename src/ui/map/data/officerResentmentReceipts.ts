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
//   1. war_phases.ts injectOpDirectives (~:790) — gated on
//      `pending_op_directive.forced_over_objection`, and the whole step early-outs
//      with ZERO mutation when no corps has a `pending_op_directive` (an OPTIONAL
//      field never set in headless/historical runs), so it only fires for a player
//      force-launch over objection. This path ALSO emits a CorpsOperation tagged
//      `was_force_launched` for the same corps on the same turn.
//   2. order_interpretation.ts overrideInterpretation (~:551) — gated on a
//      `pending_officer_events` entry being `overridable`; a player-IPC override
//      path that bot/historical runs never invoke. This path acknowledges a
//      pending officer event and emits NO operation.
// Therefore the override substrate is empty for bot/historical → the projection
// returns [] → calibration untouched.
//
// FORCE-OP DISCRIMINATION (#125): both callers bump the SAME officer fields
// (`last_override_turn` / `override_count` / `recent_overrides`) indistinguishably,
// so keying on `last_override_turn` alone over-counts ordinary order-interpretation
// overrides as forced-op resentment. We discriminate READ-SIDE (no new sim
// substrate field): only the force-LAUNCH path (#1) ever produces a
// `was_force_launched` operation, and that operation records BOTH its `corps_id`
// and the `commander_officer_id` it was launched under. We therefore keep a
// resentment receipt only when the officer commanded at least one force-launched
// operation (active `was_force_launched` op OR a resolved `force_launched` AAR).
// An order-interpretation-only override produces no such op → no receipt.
//
// RELIEF PERSISTENCE (#282): the override substrate records `last_override_turn`
// but NOT the corps the override happened on — the only corps signal on officer
// state is the CURRENT `assigned_corps_id`. When a force-overridden CO is later
// RELIEVED, `relieveOfficer` clears `assigned_corps_id` → null, so keying the
// receipt's corps off the officer's current corps would drop the receipt entirely
// (the old `corpsId === null` guard masked the loss). We instead key the corps off
// the force-launched op's recorded history: the op/AAR carries the corps the
// officer commanded WHEN force-launched, which survives relief. A relieved CO
// (current corps null) therefore still yields a receipt tied to the corps he held
// at override time.

import type { GameState } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';

/**
 * Read-side map of `officer_id` → the corps the officer commanded on a
 * force-launched operation — active (`was_force_launched === true`) or resolved
 * (`force_launched === true` AAR). Used both to discriminate genuine force-op
 * overrides from ordinary order-interpretation overrides (#125: the latter never
 * produce a force-launched op, so an officer absent from this map was overridden
 * only via order-interpretation and must NOT surface a receipt) AND to recover the
 * historical corps for a since-RELIEVED CO whose current `assigned_corps_id` was
 * cleared (#282). Deterministic: first force-launched op encountered in sorted
 * iteration wins (active ops by corps id, then resolved AARs in history order).
 */
function forceLaunchCorpsByOfficer(state: GameState): Map<string, string> {
    const out = new Map<string, string>();

    const corpsCommand = state.military?.corps_command;
    if (corpsCommand) {
        for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
            const cmd = corpsCommand[corpsId];
            const ops = cmd?.active_operations;
            if (!ops) continue;
            for (const op of ops) {
                if (op.was_force_launched !== true) continue;
                const officerId = op.commander_officer_id;
                if (officerId && !out.has(officerId)) out.set(officerId, corpsId);
            }
        }
    }

    const aars = state.operation_history;
    if (aars) {
        for (const aar of aars) {
            if (aar.force_launched !== true) continue;
            const officerId = aar.commander_officer_id;
            if (officerId && !out.has(officerId)) out.set(officerId, aar.corps_id);
        }
    }

    return out;
}

/** One receipt: a single corps commander the president overrode by force-launching
 *  an operation past his shown objection. */
export interface OfficerResentmentReceipt {
    /** Stable id for keying/dedupe — the officer id. */
    id: string;
    /** Display name of the overridden commander (falls back to a generic label). */
    officerName: string;
    /** Corps the officer commanded when force-launched. Recovered from the
     *  force-launched op's recorded history so it survives the CO being relieved
     *  (relief clears `assigned_corps_id` → null) (#282). Falls back to the current
     *  `assigned_corps_id`; null only when neither is known. */
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
    // Officer → corps he commanded on a force-launched op. Used to drop
    // order-interpretation-only overrides (#125) AND to recover the historical
    // corps for a since-relieved CO whose assigned_corps_id was cleared (#282).
    const forceLaunchCorps = forceLaunchCorpsByOfficer(state);

    const out: OfficerResentmentReceipt[] = [];
    const officerIds = Object.keys(officers).sort(strictCompare);
    for (const id of officerIds) {
        const os = officers[id];
        if (!os) continue;
        // Only the president overriding a CO sets last_override_turn (player-origin).
        if (os.last_override_turn === undefined) continue;
        // #125: a genuine forced-op override emits a force-launched operation
        // commanded by this officer. An override recorded without one came from
        // ordinary order-interpretation (overrideInterpretation) — not a forced op
        // — so it must NOT surface a resentment receipt.
        const forceLaunchCorpsId = forceLaunchCorps.get(id);
        if (forceLaunchCorpsId === undefined) continue;
        // #282: prefer the force-launched op's recorded corps (survives relief);
        // fall back to the officer's current corps for parity with the op record.
        const corpsId = os.assigned_corps_id ?? forceLaunchCorpsId;

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
            corpsId,
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
