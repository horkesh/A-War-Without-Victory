/**
 * Tactical Group lifecycle operations (ADR-0005 v2.2a).
 *
 * Pure mutation helpers — no flag checks (callers gate). Separation of
 * concerns: `tactical_group_selection.ts` chooses (read-only); this file
 * mutates state to form / dissolve.
 *
 * v2.2a (this revision): formTacticalGroup + dissolveTacticalGroup helpers.
 * v2.2b: wires these into operation_preparation.ts (intel_gathering →
 * ready) and sector_offensive.ts (execution → recovery).
 *
 * All mutations respect ADR-0005 Hard Invariants:
 *   #1 — one-TG-per-brigade exclusivity (form preconditions check)
 *   #6 — anchor destruction = TG dissolution (dissolve handles cleanly)
 *   #8 — no anchor swap mid-op (form is one-shot; no replace API)
 *   #10 — no HVO↔ARBiH cross-faction donations (selectDonors enforces;
 *         form trusts caller-provided donor list)
 */

import type {
    ArmyHqOpId,
    FormationId,
    GameState,
    TacticalGroup,
    TgDonorContribution,
    TgId,
    TgStatus,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

export interface FormTgParams {
    op_id: string;
    army_hq_op_id?: ArmyHqOpId;
    anchor_brigade_id: FormationId;
    /** Caller-selected donor pool (e.g. result of selectDonors). */
    donors: readonly TgDonorContribution[];
    /** Current turn for formed_on_turn + per-brigade ledger updates. */
    current_turn: number;
}

export interface FormTgResult {
    /** TG id if formation succeeded; null if a precondition failed. */
    tg_id: TgId | null;
    /** Human-readable reason if tg_id is null (one of: missing_anchor, anchor_in_other_tg, donor_in_other_tg, duplicate_donor). */
    rejection_reason?: string;
}

/**
 * Form a Tactical Group, mutating state in place.
 *
 * Effects on success:
 *   - Creates `TacticalGroup` entry under `state.military.tactical_groups[id]`
 *   - Writes `personnel_lent_by_tg[id]` on each donor brigade (Hard Inv #1)
 *   - Writes `equipment_lent_by_tg[id]` on each donor brigade
 *   - Sets TG status to 'forming'; v2.2b transitions through engaged/recovering
 *
 * Effects on failure: state unchanged; null tg_id returned with reason.
 */
export function formTacticalGroup(
    state: GameState,
    params: FormTgParams,
): FormTgResult {
    const mil = state.military;
    if (!mil) return { tg_id: null, rejection_reason: 'no_military_state' };

    const formations = mil.formations ?? {};
    const anchor = formations[params.anchor_brigade_id];
    if (!anchor) return { tg_id: null, rejection_reason: 'missing_anchor' };
    if (!anchor.corps_id) return { tg_id: null, rejection_reason: 'anchor_no_corps' };
    if (!anchor.location_osid) return { tg_id: null, rejection_reason: 'anchor_no_location' };

    // Hard Invariant #1: anchor must not be in another TG.
    if (Object.keys(anchor.personnel_lent_by_tg ?? {}).length > 0) {
        return { tg_id: null, rejection_reason: 'anchor_in_other_tg' };
    }

    // Hard Invariant #1: each donor must not be in another TG.
    // Check for duplicate donor IDs too (defensive against caller bugs).
    const seenDonorIds = new Set<FormationId>();
    for (const d of params.donors) {
        if (seenDonorIds.has(d.brigade_id)) {
            return { tg_id: null, rejection_reason: 'duplicate_donor' };
        }
        seenDonorIds.add(d.brigade_id);
        if (d.brigade_id === params.anchor_brigade_id) {
            return { tg_id: null, rejection_reason: 'anchor_in_donor_list' };
        }
        const donor = formations[d.brigade_id];
        if (!donor) return { tg_id: null, rejection_reason: 'missing_donor' };
        if (Object.keys(donor.personnel_lent_by_tg ?? {}).length > 0) {
            return { tg_id: null, rejection_reason: 'donor_in_other_tg' };
        }
    }

    const tgId = makeTgId(anchor.corps_id, params.op_id, params.anchor_brigade_id);

    // Build the TG entity. donor_contributions stored pre-sorted by brigade_id
    // (Hard Invariant #4) — caller's order may be different.
    const sortedDonors: TgDonorContribution[] = [...params.donors]
        .sort((a, b) => strictCompare(a.brigade_id, b.brigade_id));

    const tg: TacticalGroup = {
        id: tgId,
        corps_id: anchor.corps_id,
        op_id: params.op_id,
        ...(params.army_hq_op_id != null && { army_hq_op_id: params.army_hq_op_id }),
        anchor_brigade_id: params.anchor_brigade_id,
        donor_contributions: sortedDonors,
        location_osid: anchor.location_osid,
        status: 'forming' as TgStatus,
        formed_on_turn: params.current_turn,
        cohesion: 100, // OG starts healthy; canon §6.3 drain happens per-turn
    };

    // Mutate state: insert TG.
    if (!mil.tactical_groups) mil.tactical_groups = {};
    mil.tactical_groups[tgId] = tg;

    // Mutate state: write per-donor lent fields (Hard Invariant #1).
    for (const d of sortedDonors) {
        const donor = formations[d.brigade_id];
        if (!donor.personnel_lent_by_tg) donor.personnel_lent_by_tg = {};
        donor.personnel_lent_by_tg[tgId] = d.personnel_lent;
        const eq = d.heavy_equipment_lent;
        if (eq.tanks > 0 || eq.artillery > 0 || eq.aa_systems > 0) {
            if (!donor.equipment_lent_by_tg) donor.equipment_lent_by_tg = {};
            donor.equipment_lent_by_tg[tgId] = { ...eq };
        }
    }

    return { tg_id: tgId };
}

export interface DissolveTgResult {
    /** True if a TG was found and dissolved; false if id was unknown. */
    dissolved: boolean;
    /** TG id that was dissolved (echoed for caller convenience). */
    tg_id: TgId;
}

/**
 * Dissolve a Tactical Group, mutating state in place.
 *
 * Effects on success:
 *   - Removes TG entry from `state.military.tactical_groups`
 *   - Clears `personnel_lent_by_tg[tgId]` on every donor brigade
 *   - Clears `equipment_lent_by_tg[tgId]` on every donor brigade
 *   - Sets `tg_cooldown_until_turn` on anchor + each donor (Hard Invariant #2:
 *     TG_DONOR_COOLDOWN_TURNS = 6)
 *
 * Casualties are NOT applied here — battle resolution debits live during
 * combat; trickle-back is bookkeeping only (ADR-0005 §Trickle-back).
 *
 * Effects on failure (TG id unknown): state unchanged; dissolved = false.
 */
export const TG_DONOR_COOLDOWN_TURNS = 6;

/**
 * Anchor cohesion floor for Hard Invariant #6 immediate dissolution. Per canon
 * Systems Manual v0.9.0 §6.3 ("OGs dissolve at cohesion < 15"). When a TG anchor
 * falls below this cohesion (or below MIN_ATTACK_PERSONNEL), the TG dissolves
 * immediately rather than waiting for the next-tick recovery transition.
 */
export const TG_ANCHOR_DISSOLVE_COHESION_FLOOR = 15;

export function dissolveTacticalGroup(
    state: GameState,
    tgId: TgId,
    current_turn: number,
): DissolveTgResult {
    const mil = state.military;
    if (!mil?.tactical_groups?.[tgId]) {
        return { dissolved: false, tg_id: tgId };
    }
    const tg = mil.tactical_groups[tgId];
    const formations = mil.formations ?? {};
    const cooldownUntil = current_turn + TG_DONOR_COOLDOWN_TURNS;

    // Clear donor lent fields + set cooldown.
    for (const d of tg.donor_contributions) {
        const donor = formations[d.brigade_id];
        if (!donor) continue;
        if (donor.personnel_lent_by_tg) {
            delete donor.personnel_lent_by_tg[tgId];
            if (Object.keys(donor.personnel_lent_by_tg).length === 0) {
                delete donor.personnel_lent_by_tg;
            }
        }
        if (donor.equipment_lent_by_tg) {
            delete donor.equipment_lent_by_tg[tgId];
            if (Object.keys(donor.equipment_lent_by_tg).length === 0) {
                delete donor.equipment_lent_by_tg;
            }
        }
        donor.tg_cooldown_until_turn = cooldownUntil;
    }

    // Anchor also enters cooldown (no lent fields to clear).
    const anchor = formations[tg.anchor_brigade_id];
    if (anchor) {
        anchor.tg_cooldown_until_turn = cooldownUntil;
    }

    // Remove TG entry.
    delete mil.tactical_groups[tgId];

    return { dissolved: true, tg_id: tgId };
}

/** Canonical TG id format. Frozen by ADR-0005 §Schema. */
function makeTgId(corpsId: FormationId, opId: string, anchorBrigadeId: FormationId): TgId {
    return `tg:${corpsId}:${opId}:${anchorBrigadeId}`;
}
