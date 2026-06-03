/**
 * Tactical Group anchor resolution + de-confliction (ADR-0005 Phase 4 — Migration
 * reconciliation). Two edge cases from the auto-mechanical "first-brigade-is-anchor"
 * migration rule (ADR-0005 §"Migration of existing pre-planned ops") are resolved here:
 *
 *   1. PHANTOM-ANCHOR (Op Prsten `ilijas_ring`, Op Visegrad `visegrad_seizure`):
 *      `assignBrigadeRoles` picks `main_brigade` = highest basePower, and a JNA
 *      phantom (full personnel + heavy equipment at spawn) outranks the resident
 *      VRS brigade — so the phantom becomes the anchor, then EVAPORATES at its
 *      `withdrawal_turn` (~w5-w10), killing the TG mid-op every time.
 *
 *      Fix (faithful option (a) where possible): `resolveTgAnchor` prefers a
 *      NON-PHANTOM (persistent) brigade on the axis. When at least one persistent
 *      brigade is present it is chosen as the anchor (highest basePower among
 *      persistent brigades, deterministic id tiebreak). When EVERY assigned brigade
 *      is a phantom (Op Prsten `ilijas_ring`), no persistent anchor exists → return
 *      `null` and the caller forms NO TG (option (b): legacy anchor-only path until a
 *      real VRS anchor is authored). Documented per ADR §Migration hand-review table.
 *
 *   2. DUAL-ANCHOR COLLISION (Op Podrinje `srebrenica_ring` AND Op Drina
 *      `bratunac_vlasenica` both want `rs_1st_bratunac` → violates Hard Invariant #1):
 *      two concurrent ops/axes cannot both anchor the same brigade. `formTacticalGroup`
 *      already REJECTS the second (anchor_in_other_tg), but the loser would then form no
 *      TG even when it has a perfectly good next-best persistent anchor available.
 *
 *      Fix: `resolveTgAnchor` takes a `reservedAnchors` set (brigades already claimed as
 *      anchors this formation pass + brigades reserved like issue-#40 pre-planned). The
 *      loser deterministically picks its NEXT-BEST persistent, non-reserved anchor; if
 *      none is free it defers (returns null → no TG this pass). Formation order is the
 *      stable sorted op/axis order, so the winner is deterministic (strictCompare).
 *
 * FLAG-GATED: these helpers are only invoked inside the ENABLE_TG_FORMATION gate
 * (formTgsAtReadyTransition). Flag-off never reaches them, so flag-off stays
 * byte-identical. No new persisted state field — the reservation set is built
 * per-formation-pass from the live `tactical_groups` Record + the issue-#40 reserve.
 *
 * Determinism: phantom test is pure (id-registry ∪ runtime markers); anchor ranking
 * is (basePower desc, id strictCompare asc); reservation iteration is sorted.
 */

import type {
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { basePower } from './combat_math.js';
import { _ALL_PHANTOM_DEFS } from './jna_phantom_brigades.js';

/**
 * Deterministic id-set of every phantom brigade defined in the JNA/HV phantom
 * registry. Frozen at module load (the def list is static data). Used as the
 * primary phantom classifier; runtime markers (`withdrawal_turn`, kind tag) are a
 * belt-and-braces fallback for any phantom not in the registry.
 */
const PHANTOM_ID_SET: ReadonlySet<FormationId> = new Set<FormationId>(
    _ALL_PHANTOM_DEFS.map((d) => d.id as FormationId),
);

/**
 * True if a brigade is a transient phantom that will evaporate at a withdrawal turn
 * (JNA stand-in / HV expeditionary ghost) and therefore must NOT anchor a TG.
 *
 * Deterministic, pure. Three independent signals (any → phantom):
 *   - id present in the static phantom registry (`PHANTOM_ID_SET`)
 *   - `withdrawal_turn` set (only phantoms carry this field)
 *   - kind tag `jna_phantom` (set by `spawnJnaPhantomBrigades`)
 */
export function isPhantomBrigade(f: FormationState | undefined): boolean {
    if (!f) return false;
    if (PHANTOM_ID_SET.has(f.id)) return true;
    if (f.withdrawal_turn != null) return true;
    if (f.kind === 'jna_phantom') return true;
    return false;
}

/**
 * Resolve the persistent anchor for a prospective TG on an axis (ADR-0005 Phase 4).
 *
 * Selection order (all deterministic):
 *   1. Filter `assigned_brigades` to brigades that (a) resolve to an active formation,
 *      (b) are NOT phantoms (Fix 1), and (c) are NOT already reserved as another TG's
 *      anchor this pass (Fix 2 de-confliction).
 *   2. Rank survivors by (basePower desc, id strictCompare asc) and return the top.
 *   3. Return `null` when no eligible persistent brigade remains — the caller forms NO
 *      TG (phantom-only axis → legacy path; or de-confliction loser with no free
 *      next-best → defer).
 *
 * @param reservedAnchors brigades already claimed as anchors (this formation pass) or
 *        otherwise reserved (issue-#40 pre-planned). Pass an empty set for no de-confliction.
 */
export function resolveTgAnchor(
    state: GameState,
    axis: { main_brigade?: FormationId; assigned_brigades: readonly FormationId[] },
    reservedAnchors: ReadonlySet<FormationId>,
): FormationId | null {
    const formations = state.military?.formations;
    if (!formations) return null;

    // Candidate pool: assigned brigades that are active, persistent (non-phantom), and free.
    const eligible: FormationState[] = [];
    // Sort the input ids first for a stable base order before the power ranking.
    for (const id of [...axis.assigned_brigades].sort(strictCompare)) {
        if (reservedAnchors.has(id)) continue;            // Fix 2: already an anchor / reserved
        const f = formations[id];
        if (!f) continue;
        if (f.status !== 'active') continue;
        if (isPhantomBrigade(f)) continue;                // Fix 1: phantom can't anchor (evaporates mid-op)
        // Hard Invariant #1 alignment: a brigade already lent to an active TG (donor) cannot
        // anchor a new one. Prior axes in this same pass may have pulled it as a donor; skip it
        // so formTacticalGroup never rejects this anchor with anchor_in_other_tg.
        if (Object.keys(f.personnel_lent_by_tg ?? {}).length > 0) continue;
        eligible.push(f);
    }
    if (eligible.length === 0) return null;

    if (axis.main_brigade) {
        const main = eligible.find((f) => f.id === axis.main_brigade);
        if (main) return main.id;
    }

    // Rank by (basePower desc, id asc). Mirrors assignBrigadeRoles but over the
    // phantom-filtered, reservation-filtered survivors only.
    eligible.sort((a, b) => {
        const pa = basePower(a);
        const pb = basePower(b);
        if (pb !== pa) return pb - pa;
        return strictCompare(a.id, b.id);
    });
    return eligible[0].id;
}

/**
 * Build the set of brigades already claimed as TG anchors in the live state
 * (every active TG's `anchor_brigade_id`). Used to seed the de-confliction
 * reservation set for a formation pass so a second op cannot re-anchor a brigade
 * already anchoring an active TG. Deterministic: sorted-key iteration.
 */
export function collectActiveAnchorIds(state: GameState): Set<FormationId> {
    const result = new Set<FormationId>();
    const tgs = state.military?.tactical_groups;
    if (!tgs) return result;
    for (const id of Object.keys(tgs).sort(strictCompare)) {
        const tg = tgs[id];
        if (tg && tg.status !== 'dissolved') result.add(tg.anchor_brigade_id);
    }
    return result;
}
