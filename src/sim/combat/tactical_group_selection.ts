/**
 * Tactical Group donor selection (ADR-0005 — Phase 1 full donor model).
 *
 * Implements the ratified donor model (ADR-0005 §Distance falloff,
 * §Cross-corps donor permission, §Army HQ Operations, §Constants reference):
 *
 *   1. Candidate pool:
 *      - Regular TG: anchor's corps ∪ corps ADJACENT to the anchor's corps.
 *        Two corps are adjacent iff at least one of corps B's brigades sits on
 *        an OSID that is BFS-adjacent to an OSID held by one of corps A's
 *        brigades (derived deterministically from the OSID adjacency graph +
 *        brigade locations — no new persisted state field).
 *      - Army HQ op (context.army_hq_op_id set, ENABLE_TG_ARMY_HQ_OPS on):
 *        ALL same-faction corps, regardless of adjacency.
 *   2. Faction filter: strict same-faction (Hard Invariant #10 — no HVO↔ARBiH).
 *   3. Eligibility gates per candidate (anchor exclusion, active status, cohesion
 *      ≥ COHESION_HEALTHY_THRESHOLD, cooldown elapsed, not already in a TG,
 *      not reserved by a pending pre-planned op, per-scenario donation cap,
 *      kind-scaled residual-personnel floor, BFS hops ≤ MAX_OG_DONOR_DISTANCE).
 *   4. Distance falloff (ADR §Distance falloff), frozen at TG formation:
 *        hops            = bfsDistance(donor.location_osid, staging_osid, friendlyOsids)
 *        donation_factor = max(0.10, 1.0 - 0.15 × hops)
 *        donation_cap    = 0.30 × donor.personnel
 *        donation_pers   = floor(min(donor.personnel × donation_factor, donation_cap))
 *        donation_equip  = floor(donor.equipment × donation_factor × 0.5)
 *   5. DETERMINISTIC SORT (frozen at formation): (distance_hops asc,
 *      source_corps_id strictCompare asc, brigade_id strictCompare asc).
 *      Never sort by personnel.
 *
 * The BFS source is the canonical OSID adjacency graph. Callers may pass it via
 * `context.adjacency` (the war pipeline already has it in scope); otherwise we
 * fall back to the state-derived front-edge adjacency. When NO adjacency is
 * available (e.g. unit-test fixtures with no edges), hops degrade to 0 — the
 * pre-Phase-1 behavior — so flag-off stays byte-identical and no donor is
 * spuriously excluded by an empty graph.
 */

import type {
    FormationId,
    FormationState,
    GameState,
    TgDonorContribution,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { bfsDistance } from './sector_utils.js';
// ADR-0005 v2.2c (issue #40): exclude brigades reserved by not-yet-injected pre-planned ops.
import { getReservedPrePlannedBrigadeIds } from './pre_planned_operations.js';
import {
    ENABLE_TG_ARMY_HQ_OPS,
    ENABLE_TG_COHESION_BLEED,
    MAX_DONATIONS_PER_SCENARIO,
    MAX_OG_DONOR_DISTANCE,
    TG_DISTANCE_FALLOFF_PER_HOP,
    TG_DISTANCE_FALLOFF_FLOOR,
    TG_EQUIPMENT_FALLOFF_MULT,
    MIN_BRIGADE_PERSONNEL_AFTER_DONATION_BY_KIND,
    MIN_BRIGADE_PERSONNEL_AFTER_DONATION_DEFAULT,
} from './tactical_group_config.js';

export interface DonorSelectionContext {
    /** Anchor brigade for the prospective TG. */
    anchor_brigade_id: FormationId;
    /** Staging OSID for distance calculations. */
    staging_osid: string;
    /** When set, donor pool spans all same-faction corps (Army HQ op). */
    army_hq_op_id?: string;
    /**
     * Optional OSID adjacency graph for BFS distance falloff + corps-adjacency
     * derivation. When omitted, a state-derived front-edge adjacency is used.
     */
    adjacency?: Map<string, string[]>;
    /**
     * ADR-0005 Phase 2: per-op donor cap. When set, the returned pool is sliced
     * to at most this many donors (e.g. the `limited` policy caps at 2; `none`
     * passes 0 → empty pool). When omitted, the module default (MAX_DONORS_PER_TG)
     * applies. Never widens the cap above the module default.
     */
    max_donors?: number;
}

// === Eligibility thresholds (ADR-0005 §Tier 1 constraints) ===
const COHESION_HEALTHY_THRESHOLD = 50;
const DONATION_CAP_FRACTION = 0.30;
/** Max donors per TG. Caps cascade/C2 risk; the deterministic sort takes the closest few. */
const MAX_DONORS_PER_TG = 3;

/**
 * Select donor contributions for a prospective TG (ADR-0005 full donor model).
 *
 * Returns empty array if anchor not found or no eligible donors. The returned
 * contributions carry frozen `distance_hops`, falloff-scaled `personnel_lent`,
 * and falloff-scaled `heavy_equipment_lent` (pro-rata equipment slice).
 */
export function selectDonors(
    state: GameState,
    context: DonorSelectionContext,
): TgDonorContribution[] {
    const formations = state.military?.formations;
    if (!formations) return [];

    const anchor = formations[context.anchor_brigade_id];
    if (!anchor) return [];
    const anchorCorps = anchor.corps_id;
    const anchorFaction = anchor.faction;
    if (!anchorCorps) return [];

    const currentTurn = state.meta?.turn ?? 0;
    // Issue #40: brigades reserved by pre-planned ops that have not yet injected must not be
    // consumed as donors, or the op cannot resolve its hardcoded brigade when it injects.
    const reservedPrePlanned = getReservedPrePlannedBrigadeIds(currentTurn);

    // Adjacency graph for BFS distance + corps-adjacency derivation. Caller-supplied
    // (war pipeline) or state-derived; empty when no edges (unit fixtures) → hops degrade to 0.
    const adjacency = context.adjacency ?? buildFrontEdgeAdjacency(state);

    // Army HQ ops draw donors from ALL same-faction corps (cross-corps, ignores adjacency);
    // regular TGs are restricted to the anchor's corps ∪ adjacent corps.
    const factionScope = ENABLE_TG_ARMY_HQ_OPS && context.army_hq_op_id != null;
    const allowedCorps: ReadonlySet<FormationId> | null = factionScope
        ? null // null = no corps restriction (faction-wide)
        : computeDonorCorpsSet(formations, anchorCorps, anchorFaction, adjacency);

    // Friendly OSIDs for BFS pathing (don't path through enemy territory).
    const friendlyOsids = computeFriendlyOsids(formations, anchorFaction);

    // Iterate candidates, sorted by brigade_id for a stable base order; the final
    // (distance_hops, source_corps_id, brigade_id) sort is applied after BFS below.
    const candidates: FormationState[] = Object.keys(formations)
        .sort(strictCompare)
        .map(id => formations[id])
        .filter(f => isEligibleDonor(f, context, anchorFaction, allowedCorps, currentTurn, reservedPrePlanned));

    // Compute BFS hops once per candidate (frozen at formation), drop beyond the ceiling.
    interface Scored { donor: FormationState; hops: number; }
    const scored: Scored[] = [];
    for (const f of candidates) {
        const hops = bfsHops(f.location_osid, context.staging_osid, adjacency, friendlyOsids);
        if (hops > MAX_OG_DONOR_DISTANCE) continue; // ADR §Distance falloff: skip
        // Residual-personnel floor must use the distance-scaled donation.
        const personnel = f.personnel ?? 0;
        const donation = computeDonationPersonnel(personnel, hops);
        if (personnel - donation < minPersonnelAfterDonation(f)) continue;
        scored.push({ donor: f, hops });
    }

    // ADR §Distance falloff donor ordering: (distance_hops asc, source_corps_id asc, brigade_id asc).
    scored.sort((a, b) => {
        if (a.hops !== b.hops) return a.hops - b.hops;
        const ca = a.donor.corps_id ?? anchorCorps;
        const cb = b.donor.corps_id ?? anchorCorps;
        if (ca !== cb) return strictCompare(ca, cb);
        return strictCompare(a.donor.id, b.donor.id);
    });

    // ADR-0005 Phase 2: a per-op donor cap (limited/none policies) may tighten — never widen —
    // the module default. Math.min keeps `full` (max_donors omitted) at MAX_DONORS_PER_TG and
    // a `limited` cap of 2 at 2; a `none` cap of 0 yields an empty pool.
    const cap = context.max_donors != null
        ? Math.max(0, Math.min(MAX_DONORS_PER_TG, context.max_donors))
        : MAX_DONORS_PER_TG;

    return scored
        .slice(0, cap)
        .map(s => buildContribution(s.donor, anchorCorps, s.hops));
}

function isEligibleDonor(
    f: FormationState,
    context: DonorSelectionContext,
    anchorFaction: string,
    allowedCorps: ReadonlySet<FormationId> | null,
    currentTurn: number,
    reservedPrePlanned: ReadonlySet<FormationId>,
): boolean {
    if (f.id === context.anchor_brigade_id) return false;
    if (f.status !== 'active') return false;
    if (f.faction !== anchorFaction) return false;
    // Corps scope: regular TG → own corps ∪ adjacent corps; Army HQ op → faction-wide (allowedCorps null).
    if (allowedCorps != null) {
        const corps = f.corps_id;
        if (corps == null || !allowedCorps.has(corps)) return false;
    }
    if (reservedPrePlanned.has(f.id)) return false; // issue #40: reserved for a not-yet-injected pre-planned op
    if ((f.cohesion ?? 0) < COHESION_HEALTHY_THRESHOLD) return false;
    if (Object.keys(f.personnel_lent_by_tg ?? {}).length > 0) return false; // Hard Invariant #1
    if (f.tg_cooldown_until_turn != null && currentTurn < f.tg_cooldown_until_turn) return false;
    // v2.3 per-scenario donation cap (Hard Invariant / §Schema anti-fire-hose). Only enforced
    // under ENABLE_TG_COHESION_BLEED; flag-off leaves the eligible set unchanged (byte-identical).
    if (ENABLE_TG_COHESION_BLEED && (f.tg_donations_this_scenario ?? 0) >= MAX_DONATIONS_PER_SCENARIO) return false;
    // Residual-personnel floor is re-checked post-BFS (distance-scaled donation); a coarse
    // pre-check using zero-hop donation here would only ever be looser, so skip it.
    return true;
}

/**
 * BFS hops from a donor OSID to the staging OSID over the adjacency graph.
 * Returns 0 when either endpoint is missing OR the graph is empty (no edges) —
 * the pre-Phase-1 degrade path that keeps unit fixtures + flag-off byte-identical.
 */
function bfsHops(
    fromOsid: string | undefined,
    stagingOsid: string,
    adjacency: Map<string, string[]>,
    friendlyOsids: Set<string>,
): number {
    if (!fromOsid || !stagingOsid) return 0;
    if (adjacency.size === 0) return 0; // no graph available → degrade to 0 hops
    if (fromOsid === stagingOsid) return 0;
    const dist = bfsDistance(fromOsid, stagingOsid, adjacency, friendlyOsids);
    // Unreachable through friendly territory → push beyond the ceiling so the donor is skipped.
    return Number.isFinite(dist) ? dist : MAX_OG_DONOR_DISTANCE + 1;
}

/**
 * Deterministic set of corps eligible to donate to a regular TG: the anchor's corps plus
 * every same-faction corps adjacent to it. Adjacency = a brigade of corps B occupies an OSID
 * that is graph-adjacent to an OSID occupied by a brigade of the anchor's corps.
 */
function computeDonorCorpsSet(
    formations: Record<FormationId, FormationState>,
    anchorCorps: FormationId,
    anchorFaction: string,
    adjacency: Map<string, string[]>,
): ReadonlySet<FormationId> {
    const result = new Set<FormationId>([anchorCorps]);
    if (adjacency.size === 0) return result; // no graph → same-corps only (pre-Phase-1 degrade)

    // OSIDs occupied by anchor-corps brigades.
    const anchorOsids = new Set<string>();
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const f = formations[id];
        if (f.corps_id === anchorCorps && f.location_osid) anchorOsids.add(f.location_osid);
    }
    if (anchorOsids.size === 0) return result;

    // The neighbor frontier of all anchor-corps OSIDs (1-hop reachable OSIDs).
    const neighborOsids = new Set<string>();
    for (const osid of [...anchorOsids].sort(strictCompare)) {
        for (const nb of adjacency.get(osid) ?? []) neighborOsids.add(nb);
    }

    // Any same-faction corps with a brigade on an anchor-OSID-neighbor is adjacent.
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const f = formations[id];
        if (f.faction !== anchorFaction) continue;
        const corps = f.corps_id;
        if (corps == null || result.has(corps)) continue;
        if (f.location_osid && neighborOsids.has(f.location_osid)) result.add(corps);
    }
    return result;
}

/** Friendly OSIDs (occupied by same-faction brigades) for BFS pathing. Deterministic set build. */
function computeFriendlyOsids(
    formations: Record<FormationId, FormationState>,
    anchorFaction: string,
): Set<string> {
    const friendly = new Set<string>();
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const f = formations[id];
        if (f.faction === anchorFaction && f.location_osid) friendly.add(f.location_osid);
    }
    return friendly;
}

/** Distance-falloff factor (ADR §Distance falloff): max(floor, 1 - per_hop × hops). */
function donationFactor(hops: number): number {
    return Math.max(TG_DISTANCE_FALLOFF_FLOOR, 1.0 - TG_DISTANCE_FALLOFF_PER_HOP * hops);
}

function computeDonationPersonnel(personnel: number, hops: number): number {
    const factor = donationFactor(hops);
    const cap = personnel * DONATION_CAP_FRACTION;
    return Math.floor(Math.min(personnel * factor, cap));
}

/** Kind-scaled residual-personnel floor (ADR §Constants reference). */
function minPersonnelAfterDonation(f: FormationState): number {
    const kindKey = f.equipment_class ?? f.kind;
    if (kindKey != null && kindKey in MIN_BRIGADE_PERSONNEL_AFTER_DONATION_BY_KIND) {
        return MIN_BRIGADE_PERSONNEL_AFTER_DONATION_BY_KIND[kindKey];
    }
    return MIN_BRIGADE_PERSONNEL_AFTER_DONATION_DEFAULT;
}

/**
 * Pro-rata heavy-equipment slice lent by a donor. Equipment is taken from the donor's
 * `composition` (the canonical brigade tank/artillery/AA holding) and scaled by the
 * distance-falloff factor × the harsher equipment multiplier (ADR §Distance falloff:
 * heavy weapons rarely travel piecemeal). Deterministic integer floor.
 */
function computeEquipmentLent(
    f: FormationState,
    hops: number,
): { tanks: number; artillery: number; aa_systems: number } {
    const comp = f.composition;
    if (!comp) return { tanks: 0, artillery: 0, aa_systems: 0 };
    const factor = donationFactor(hops) * TG_EQUIPMENT_FALLOFF_MULT;
    return {
        tanks: Math.floor((comp.tanks ?? 0) * factor),
        artillery: Math.floor((comp.artillery ?? 0) * factor),
        aa_systems: Math.floor((comp.aa_systems ?? 0) * factor),
    };
}

function buildContribution(
    donor: FormationState,
    anchorCorps: FormationId,
    hops: number,
): TgDonorContribution {
    const personnel = donor.personnel ?? 0;
    return {
        brigade_id: donor.id,
        source_corps_id: donor.corps_id ?? anchorCorps,
        distance_hops: hops, // frozen BFS hops at formation (ADR §Distance falloff)
        personnel_lent: computeDonationPersonnel(personnel, hops),
        heavy_equipment_lent: computeEquipmentLent(donor, hops),
        casualties_so_far: 0,
        equipment_losses_so_far: { tanks: 0, artillery: 0, aa_systems: 0 },
        cohesion_bleed_applied: 0, // v2.3 wires the bleed formula (distance-scaled via distance_hops)
    };
}

/**
 * State-only fallback adjacency: bidirectional OSID graph from the live war front edges.
 * Inlined here (rather than imported from sector_offensive_launch_helpers) to avoid an
 * import cycle — that module imports selectDonors. Deterministic; empty when no front edges.
 */
function buildFrontEdgeAdjacency(state: GameState): Map<string, string[]> {
    const frontEdges = state.military?.war_front_edges_osid ?? [];
    const adj = new Map<string, string[]>();
    for (const fe of frontEdges) {
        if (!fe.a || !fe.b) continue;
        let listA = adj.get(fe.a);
        if (!listA) { listA = []; adj.set(fe.a, listA); }
        if (!listA.includes(fe.b)) listA.push(fe.b);
        let listB = adj.get(fe.b);
        if (!listB) { listB = []; adj.set(fe.b, listB); }
        if (!listB.includes(fe.a)) listB.push(fe.a);
    }
    return adj;
}
