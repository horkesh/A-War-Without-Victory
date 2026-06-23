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
// `was_force_launched` operation, recorded against its `corps_id`. We therefore
// keep a resentment receipt only when the OVERRIDDEN CO's corps had a force-launched
// operation (active `was_force_launched` op OR a resolved `force_launched` AAR). An
// order-interpretation-only override produces no such op on the corps → no receipt.
//
// OP-COMMANDER ≠ OVERRIDDEN CORPS-CO (#303): the override substrate
// (`last_override_turn` / `override_count` / `cowed_until_turn`) is recorded by
// `recordPresidentialOverride` against the CURRENT CORPS COMMANDER —
// `getCorpsCommander(corpsId)`, the active officer assigned to that corps. The
// force-launched op the same `injectOpDirectives` step emits is led by a DIFFERENT
// officer: `assignOperationCommander` → `selectOperationCommander` draws from the
// RESERVE pool (`status === 'reserve'`), never the seated corps CO. So the op's
// `commander_officer_id` is the reserve op-leader, NOT the overridden corps CO.
// Keying the force-op discriminator off `commander_officer_id` therefore matched the
// override against an officer who carries no override substrate, and DROPPED the
// genuine corps-CO receipt for the whole `injectOpDirectives` path. We discriminate
// by CORPS instead: build the set of corps that had a force-launched op, then join
// the overridden CO to that corps via his CURRENT `assigned_corps_id`.
//
// RELIEF PERSISTENCE (#282): the override substrate records `last_override_turn`
// but NOT the corps the override happened on — the only corps signal on officer
// state is the CURRENT `assigned_corps_id`. When a force-overridden CO is later
// RELIEVED, `relieveOfficer` clears `assigned_corps_id` → null, so a relieved CO
// can no longer be joined to a force-launched corps by his current assignment. We
// recover his corps from the force-launched-corps set: a force-launched corps that
// no CURRENTLY-active overridden CO claims is the corps a since-relieved overridden
// CO held at override time. When that recovery is unambiguous (exactly one such
// orphaned corps), the relieved CO still yields a receipt tied to it; otherwise the
// receipt is still emitted with `corpsId: null` (the override is real either way).

import type { GameState } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';
import { isCanonicalPlayerFaction, playerFactionMatch } from './playerFactionMatch.js';

function getPlayerFaction(state: GameState | null | undefined): string | null {
    return typeof state?.meta?.player_faction === 'string' ? state.meta.player_faction : null;
}

function corpsFaction(state: GameState, corpsId: string, cmd?: unknown): string | null {
    const commandFaction = (cmd as { faction?: unknown } | undefined)?.faction;
    if (typeof commandFaction === 'string' && commandFaction.trim().length > 0) return commandFaction;
    const formation = state.military?.formations?.[corpsId];
    return typeof formation?.faction === 'string' && formation.faction.trim().length > 0 ? formation.faction : null;
}

function rowBelongsToPlayer(rowFaction: string | null, playerFaction: string | null): boolean {
    return !isCanonicalPlayerFaction(playerFaction)
        || rowFaction === null
        || playerFactionMatch(rowFaction, playerFaction);
}

/**
 * Read-side set of `corps_id`s that ran a force-launched operation — active
 * (`was_force_launched === true` op) or resolved (`force_launched === true` AAR).
 * The corps (NOT the op's `commander_officer_id`, which is a RESERVE op-leader, not
 * the overridden corps CO — #303) is the read-side proxy for "the president forced
 * an op here past the CO's objection". Used to discriminate genuine force-op
 * overrides from ordinary order-interpretation overrides (#125: the latter never
 * produce a force-launched op on the corps) AND to recover the corps for a
 * since-RELIEVED overridden CO whose current `assigned_corps_id` was cleared (#282).
 * Deterministic: a sorted set, iteration-order-independent.
 */
function forceLaunchedCorps(state: GameState, playerFaction: string | null): Set<string> {
    const out = new Set<string>();

    const corpsCommand = state.military?.corps_command;
    if (corpsCommand) {
        for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
            const cmd = corpsCommand[corpsId];
            if (!rowBelongsToPlayer(corpsFaction(state, corpsId, cmd), playerFaction)) continue;
            const ops = cmd?.active_operations;
            if (!ops) continue;
            for (const op of ops) {
                if (op.was_force_launched === true) {
                    out.add(corpsId);
                    break;
                }
            }
        }
    }

    const aars = state.operation_history;
    if (aars) {
        for (const aar of aars) {
            const aarFaction = (aar as { faction?: unknown }).faction;
            const rowFaction = typeof aarFaction === 'string' ? aarFaction : null;
            if (aar.force_launched === true && aar.corps_id && rowBelongsToPlayer(rowFaction, playerFaction)) {
                out.add(aar.corps_id);
            }
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
    /** Corps the CO commanded when force-overridden. The override is recorded
     *  against the seated corps CO, so this is his current `assigned_corps_id` when
     *  he is still assigned (#303). For a since-RELIEVED CO (assigned cleared → null)
     *  it is recovered from the orphaned force-launched-corps set when unambiguous,
     *  else null (#282). */
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
    const playerFaction = getPlayerFaction(state);
    // Corps that ran a force-launched op (#303: keyed by corps, NOT op commander).
    // Used to drop order-interpretation-only overrides (#125) AND to recover the
    // corps for a since-relieved CO whose assigned_corps_id was cleared (#282).
    const fLaunchedCorps = forceLaunchedCorps(state, playerFaction);

    // Force-launched corps still claimed by a CURRENTLY-ASSIGNED overridden CO. The
    // remaining (orphaned) force-launched corps are candidates for recovering a
    // since-RELIEVED overridden CO's corps (#282 + #303).
    const claimedCorps = new Set<string>();
    const officerIds = Object.keys(officers).sort(strictCompare);
    for (const id of officerIds) {
        const os = officers[id];
        if (!os || os.last_override_turn === undefined) continue;
        const assigned = os.assigned_corps_id;
        if (assigned && fLaunchedCorps.has(assigned)) claimedCorps.add(assigned);
    }
    const orphanedForceLaunchedCorps = [...fLaunchedCorps]
        .filter((c) => !claimedCorps.has(c))
        .sort(strictCompare);

    const out: OfficerResentmentReceipt[] = [];
    for (const id of officerIds) {
        const os = officers[id];
        if (!os) continue;
        // Only the president overriding a CO sets last_override_turn (player-origin).
        if (os.last_override_turn === undefined) continue;

        // #125 + #303: a genuine forced-op override emits a force-launched op on the
        // CO's corps. An override recorded against a corps with NO force-launched op
        // came from ordinary order-interpretation (overrideInterpretation) — not a
        // forced op — so it must NOT surface a resentment receipt.
        const assigned = os.assigned_corps_id;
        let corpsId: string | null;
        if (assigned && fLaunchedCorps.has(assigned)) {
            // Active overridden CO joined to his force-launched corps directly.
            corpsId = assigned;
        } else if (assigned) {
            // Active CO on a corps with no force-launched op → order-interpretation
            // only (#125) → drop.
            continue;
        } else {
            // Relieved CO (assigned_corps_id cleared): recover the corps from the
            // orphaned force-launched-corps set (#282). Unambiguous only when exactly
            // one orphaned corps remains; otherwise the override is still real but the
            // corps cannot be attributed, so emit with corpsId: null. A relieved CO
            // with NO orphaned force-launched corps was order-interpretation-only → drop.
            if (orphanedForceLaunchedCorps.length === 0) continue;
            corpsId =
                orphanedForceLaunchedCorps.length === 1
                    ? orphanedForceLaunchedCorps[0]
                    : null;
        }

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
