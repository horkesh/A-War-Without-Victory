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
    CorpsOperation,
    FormationId,
    FormationState,
    GameState,
    TacticalGroup,
    TgDonorContribution,
    TgId,
    TgStatus,
} from '../../state/game_state.js';
import type { TgParticipationRecord } from '../../state/brigade_history.js';
import { createEmptyBrigadeHistory, TG_PARTICIPATION_WINDOW_TURNS } from '../../state/brigade_history.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    resolveArmyHqOperation,
    resolveTacticalGroupIdsForOperation,
} from '../../state/operation_lifecycle_reconciliation.js';
import { buildArmyHqTelemetryFromTg } from './operation_aar.js';
import {
    ENABLE_TG_COHESION_BLEED,
    ENABLE_TG_ARMY_HQ_OPS,
    ENABLE_TG_OG_PROMOTION,
    ENABLE_TG_RECOVERY_SUPPRESSION,
    TG_COHESION_BLEED_BASE,
    TG_BLEED_HOPS_FACTOR,
    TG_RECOVERY_SUPPRESSION_TURNS,
    ARMY_HQ_COHESION_BLEED_MULT,
    MAX_CONCURRENT_TGS_PER_FACTION,
    MAX_TGS_PER_CORPS,
    ARMY_HQ_TG_CAP_REDUCTION,
} from './tactical_group_config.js';

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

    // Hard Invariant #9 (v2.3, ENABLE_TG_COHESION_BLEED): block reforming a TG with the
    // same composition (anchor + sorted donor ids) while a recently-dissolved instance is
    // still within its cooldown window. Prevents "dissolve and reform same TG via a different
    // op_id" abuse. Flag-off: never checked (recent-composition ledger is never written).
    if (ENABLE_TG_COHESION_BLEED) {
        const recent = mil.tg_recent_compositions;
        if (recent) {
            const hash = compositionHash(params.anchor_brigade_id, params.donors.map(d => d.brigade_id));
            const blockedUntil = recent[hash];
            if (blockedUntil != null && params.current_turn < blockedUntil) {
                return { tg_id: null, rejection_reason: 'same_composition_cooldown' };
            }
        }
    }

    // Concurrency caps (ADR-0005 §Constants reference + §Army HQ Operations). Enforced at
    // formation: a candidate TG that would push the faction or corps past its cap is rejected.
    // Callers form TGs in a deterministic (sorted) op order, so the TGs that win the cap are the
    // earliest in that stable order — the deterministic tie-break. Army HQ ops bypass nothing;
    // instead they REDUCE the faction cap while running (Pyrrhic cost), forcing other ops quiet.
    {
        const capCheck = checkConcurrencyCaps(mil, anchor.faction, anchor.corps_id);
        if (capCheck != null) return { tg_id: null, rejection_reason: capCheck };
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

    // ADR-0006 OG→Division promotion signal (ENABLE_TG_OG_PROMOTION): increment the per-corps
    // formation counter — the deterministic longevity/sustained-success proxy the promotion
    // criterion reads. Counts ALL factions' formations (cheap, faction-agnostic write); the
    // promotion EVALUATION is RBiH-only. Flag-off: never written, so state is byte-identical.
    if (ENABLE_TG_OG_PROMOTION) {
        if (!mil.tg_formations_by_corps) mil.tg_formations_by_corps = {};
        mil.tg_formations_by_corps[anchor.corps_id] =
            (mil.tg_formations_by_corps[anchor.corps_id] ?? 0) + 1;
    }

    // Mutate state: write per-donor lent fields (Hard Invariant #1) + v2.3 Pyrrhic dampener.
    const hqMult = params.army_hq_op_id != null ? ARMY_HQ_COHESION_BLEED_MULT : 1.0;
    for (const d of sortedDonors) {
        const donor = formations[d.brigade_id];
        if (!donor.personnel_lent_by_tg) donor.personnel_lent_by_tg = {};
        donor.personnel_lent_by_tg[tgId] = d.personnel_lent;
        const eq = d.heavy_equipment_lent;
        if (eq.tanks > 0 || eq.artillery > 0 || eq.aa_systems > 0) {
            if (!donor.equipment_lent_by_tg) donor.equipment_lent_by_tg = {};
            donor.equipment_lent_by_tg[tgId] = { ...eq };
        }

        // v2.3 (ENABLE_TG_COHESION_BLEED) — ADR-0005 §Pyrrhic cost:
        //   loss = donated_fraction × (1 + bfs_hops × 0.15) × 15 × (army_hq ? 2.0 : 1.0)
        // Applied once here at formation (the ADR's "locked 8 turns" lock-against-recovery is a
        // deferred design note: the donor enters a 6-turn dissolution cooldown anyway, and the
        // per-turn corps reorganize-recovery path is a faction-wide hot path we leave untouched
        // to protect byte-identity). Records the applied amount on the contribution for the ledger.
        // Also increments the per-scenario donation counter (anti-fire-hose cap; selectDonors gates).
        if (ENABLE_TG_COHESION_BLEED) {
            const donorPersonnel = donor.personnel ?? 0;
            const donatedFraction = donorPersonnel > 0 ? d.personnel_lent / donorPersonnel : 0;
            const rawLoss = donatedFraction * (1 + d.distance_hops * TG_BLEED_HOPS_FACTOR) * TG_COHESION_BLEED_BASE * hqMult;
            const loss = Math.floor(rawLoss);
            if (loss > 0) {
                donor.cohesion = Math.max(0, (donor.cohesion ?? 0) - loss);
                d.cohesion_bleed_applied = loss;
            }
            donor.tg_donations_this_scenario = (donor.tg_donations_this_scenario ?? 0) + 1;
        }

        // v2.3 (ENABLE_TG_RECOVERY_SUPPRESSION) — ADR-0005 §Pyrrhic cost "locked 8 turns":
        // donors recover NO positive ambient cohesion drift for the next 8 turns after donating.
        // cohesion_drift.ts reads tg_recovery_suppressed_until_turn and zeroes upward drift while
        // turn < it (never below the faction floor). Set at formation off the formed-on turn
        // (params.current_turn === tg.formed_on_turn). Flag-off: field never written → cohesion_drift
        // suppression branch never fires → both gold hashes hold byte-identical.
        if (ENABLE_TG_RECOVERY_SUPPRESSION) {
            donor.tg_recovery_suppressed_until_turn = params.current_turn + TG_RECOVERY_SUPPRESSION_TURNS;
        }

        // Phase 3A telemetry: record this brigade's donor participation in its history
        // (ADR-0005 §Schema). Donors iterate in sorted order, so writes are deterministic.
        appendTgParticipation(donor, {
            tg_id: tgId,
            op_id: params.op_id,
            role: 'donor',
            formed_turn: params.current_turn,
            personnel_lent: d.personnel_lent,
            donor_corps_id: d.source_corps_id,
            ...(params.army_hq_op_id != null && { army_hq_op_id: params.army_hq_op_id }),
        }, params.current_turn);
    }

    // Phase 3A telemetry: anchor participation record (own corps; no personnel lent).
    appendTgParticipation(anchor, {
        tg_id: tgId,
        op_id: params.op_id,
        role: 'anchor',
        formed_turn: params.current_turn,
        ...(params.army_hq_op_id != null && { army_hq_op_id: params.army_hq_op_id }),
    }, params.current_turn);

    // Phase 3A telemetry: back-fill donor_corps_ids on the Army HQ op record from the
    // actually-selected donors' source corps (the injection site writes it EMPTY because
    // donors aren't known until TG formation). Sorted + deduped via strictCompare.
    if (params.army_hq_op_id != null) {
        const ahqOp = mil.army_hq_operations?.[params.army_hq_op_id];
        if (ahqOp) {
            const corpsSet = new Set<FormationId>();
            for (const d of sortedDonors) corpsSet.add(d.source_corps_id);
            // Anchor's own corps is the op's anchor_corps, not a donor — exclude it.
            corpsSet.delete(anchor.corps_id);
            ahqOp.donor_corps_ids = [...corpsSet].sort(strictCompare);
            // Link the active TG carrying out the op (set at TG formation per schema).
            ahqOp.tg_id = tgId;
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

    // Hard Invariant #9 (v2.3, ENABLE_TG_COHESION_BLEED): record this composition's hash so a
    // same-composition TG cannot reform via a different op_id until the cooldown window elapses.
    // Flag-off: ledger is never written, so it stays empty/omitted (byte-identical).
    if (ENABLE_TG_COHESION_BLEED) {
        if (!mil.tg_recent_compositions) mil.tg_recent_compositions = {};
        const hash = compositionHash(tg.anchor_brigade_id, tg.donor_contributions.map(d => d.brigade_id));
        mil.tg_recent_compositions[hash] = cooldownUntil;
    }

    // Remove TG entry.
    delete mil.tactical_groups[tgId];

    return { dissolved: true, tg_id: tgId };
}

/** Synchronize live TG and Army-HQ receipts after a CorpsOperation enters execution. */
export function markOperationExecuting(
    state: GameState,
    hostCorpsId: FormationId,
    op: CorpsOperation,
): void {
    const tgIds = resolveTacticalGroupIdsForOperation(state, hostCorpsId, op);
    for (const tgId of tgIds) {
        const tg = state.military.tactical_groups?.[tgId];
        if (!tg) continue;
        tg.status = 'engaged';
        const anchorLocation = state.military.formations?.[tg.anchor_brigade_id]?.location_osid;
        if (anchorLocation) tg.location_osid = anchorLocation;
    }

    const resolved = resolveArmyHqOperation(state, hostCorpsId, op);
    if (!resolved) return;
    resolved.operation.status = 'executing';
    if (tgIds.length > 0) resolved.operation.tg_id = tgIds[0];
    else delete resolved.operation.tg_id;
}

/**
 * Canonical, idempotent execution-to-recovery transition. TGs are marked
 * recovering only during finalization and then removed; Army-HQ receipts remain.
 */
export function enterOperationRecovery(
    state: GameState,
    hostCorpsId: FormationId,
    op: CorpsOperation,
    turn: number,
    reason: CorpsOperation['recovery_reason'],
): void {
    if (op.phase !== 'recovery') {
        op.phase = 'recovery';
        op.phase_started_turn = turn;
        op.recovery_reason = reason;
    }

    const tgIds = resolveTacticalGroupIdsForOperation(state, hostCorpsId, op);
    if (ENABLE_TG_ARMY_HQ_OPS && op.army_hq_telemetry_snapshot == null) {
        for (const tgId of tgIds) {
            const tg = state.military.tactical_groups?.[tgId];
            if (!tg) continue;
            const telemetry = buildArmyHqTelemetryFromTg(tg, op.army_hq_op_id);
            if (!telemetry) continue;
            op.army_hq_telemetry_snapshot = telemetry;
            break;
        }
    }
    for (const tgId of tgIds) {
        const tg = state.military.tactical_groups?.[tgId];
        if (tg) tg.status = 'recovering';
        dissolveTacticalGroup(state, tgId, turn);
    }

    const resolved = resolveArmyHqOperation(state, hostCorpsId, op);
    if (!resolved) return;
    resolved.operation.status = 'recovering';
    delete resolved.operation.tg_id;
}

/** Synchronize the durable Army-HQ receipt before its CorpsOperation is removed. */
export function completeOperationLifecycle(
    state: GameState,
    hostCorpsId: FormationId,
    op: CorpsOperation,
): void {
    const resolved = resolveArmyHqOperation(state, hostCorpsId, op);
    if (!resolved) return;
    resolved.operation.status = 'completed';
    delete resolved.operation.tg_id;
}

/**
 * Concurrency-cap gate (ADR-0005 §Constants reference + §Army HQ Operations Pyrrhic cost #1).
 * Returns a rejection_reason string if forming a TG for `faction`/`corpsId` would exceed a cap,
 * else null. Deterministic: pure counting over the existing tactical_groups Record (sorted keys).
 *
 *   - Per-corps cap:    active TGs anchored by `corpsId`           < MAX_TGS_PER_CORPS
 *   - Per-faction cap:  active TGs for `faction`                   < effective faction cap
 *   - Effective faction cap = MAX_CONCURRENT_TGS_PER_FACTION
 *       − (ENABLE_TG_ARMY_HQ_OPS && faction has an Army HQ op planning/executing
 *          ? ARMY_HQ_TG_CAP_REDUCTION : 0)
 */
function checkConcurrencyCaps(
    mil: NonNullable<GameState['military']>,
    faction: string,
    corpsId: FormationId,
): string | null {
    const tgs = mil.tactical_groups ?? {};
    const formations = mil.formations ?? {};

    let factionCount = 0;
    let corpsCount = 0;
    for (const id of Object.keys(tgs).sort(strictCompare)) {
        const tg = tgs[id];
        if (tg.corps_id === corpsId) corpsCount += 1;
        const tgFaction = formations[tg.anchor_brigade_id]?.faction;
        if (tgFaction === faction) factionCount += 1;
    }

    if (corpsCount >= MAX_TGS_PER_CORPS) return 'corps_tg_cap_reached';

    let factionCap = MAX_CONCURRENT_TGS_PER_FACTION;
    if (ENABLE_TG_ARMY_HQ_OPS && factionHasActiveArmyHqOp(mil, faction)) {
        factionCap = Math.max(0, factionCap - ARMY_HQ_TG_CAP_REDUCTION);
    }
    if (factionCount >= factionCap) return 'faction_tg_cap_reached';

    return null;
}

/** True while the temporary Army-HQ cap reduction is active, including recovery. */
function factionHasActiveArmyHqOp(
    mil: NonNullable<GameState['military']>,
    faction: string,
): boolean {
    const ops = mil.army_hq_operations ?? {};
    for (const id of Object.keys(ops).sort(strictCompare)) {
        const op = ops[id];
        if (op.faction_id !== faction) continue;
        if (op.status === 'planning' || op.status === 'executing' || op.status === 'recovering') return true;
    }
    return false;
}

/** Canonical TG id format. Frozen by ADR-0005 §Schema. */
function makeTgId(corpsId: FormationId, opId: string, anchorBrigadeId: FormationId): TgId {
    return `tg:${corpsId}:${opId}:${anchorBrigadeId}`;
}

/**
 * Composition hash for Hard Invariant #9 (same-composition reformation block). Deterministic:
 * anchor id + donor ids sorted via strictCompare. Independent of op_id (that's the whole point —
 * a different op_id must not let the same brigades re-form the same TG within cooldown).
 */
export function compositionHash(anchorBrigadeId: FormationId, donorIds: readonly FormationId[]): string {
    const sortedDonors = [...donorIds].sort(strictCompare);
    return `${anchorBrigadeId}|${sortedDonors.join(',')}`;
}

/**
 * Append a TG participation record to a brigade's history (ADR-0005 §Schema, Phase 3A
 * telemetry). FLAG-ON only — reached exclusively from `formTacticalGroup`, which the
 * engine calls only inside the `ENABLE_TG_FORMATION` gate. Lazily initializes
 * `brigade_history` + `tg_participations` so flag-off state stays untouched / byte-identical.
 *
 * Maintains the ADR-0005 §421 rolling 26-turn window: records whose `formed_turn` falls
 * outside the window (older than `currentTurn - TG_PARTICIPATION_WINDOW_TURNS`) are flushed
 * to `archived_tg_participations`. Deterministic: the live list is append-order (callers
 * append in sorted donor order then the anchor); the flush preserves that order.
 */
function appendTgParticipation(
    brigade: FormationState,
    record: TgParticipationRecord,
    currentTurn: number,
): void {
    if (!brigade.brigade_history) {
        brigade.brigade_history = createEmptyBrigadeHistory(brigade.personnel ?? 0);
    }
    const hist = brigade.brigade_history;
    if (!hist.tg_participations) hist.tg_participations = [];
    hist.tg_participations.push(record);

    // Flush entries older than the rolling window to the lazy-loaded archive.
    const cutoff = currentTurn - TG_PARTICIPATION_WINDOW_TURNS;
    if (hist.tg_participations.some((r) => r.formed_turn < cutoff)) {
        const live: TgParticipationRecord[] = [];
        const aged: TgParticipationRecord[] = [];
        for (const r of hist.tg_participations) {
            (r.formed_turn < cutoff ? aged : live).push(r);
        }
        hist.tg_participations = live;
        if (aged.length > 0) {
            if (!hist.archived_tg_participations) hist.archived_tg_participations = [];
            hist.archived_tg_participations.push(...aged);
        }
    }
}
