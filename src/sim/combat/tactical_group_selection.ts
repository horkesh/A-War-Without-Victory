/**
 * Tactical Group donor selection (ADR-0005 v2.0 scaffold).
 *
 * v2.0: stub returns empty donor pool. TG entity is formed with anchor only,
 * which equals v1 behavior (anchor takes 100% casualties). Calibration-neutral.
 *
 * v2.2 (per ADR-0005 §Phased Rollout): wires actual BFS-based donor selection
 * with the adjacent-corps rule from ADR-0005 §"Cross-corps donor permission":
 *
 *   1. Candidate pool = anchor's corps ∪ corps adjacent to anchor's corps
 *      (via sector-adjacency BFS, cached per-turn in corps_command_meta).
 *   2. Faction filter: same-faction only. NO HVO↔ARBiH cross-faction
 *      donations regardless of alliance state (ADR-0005 §Decision and
 *      Hard Invariant #10).
 *   3. Eligibility gates per candidate:
 *      - donor.cohesion ≥ COHESION_HEALTHY_THRESHOLD
 *      - donor.tg_cooldown_until_turn ≤ current_turn (Hard Invariant #2)
 *      - donor.tg_donations_this_scenario < MAX_DONATIONS_PER_SCENARIO
 *      - donor not already in personnel_lent_by_tg (Hard Invariant #1)
 *      - donor.personnel - donation ≥ MIN_BRIGADE_PERSONNEL_AFTER_DONATION
 *        (kind-scaled: motorized 1000, light infantry 600, militia 400)
 *      - bfsDistance(donor.location_osid, anchor staging_osid, friendlyOsids)
 *        ≤ MAX_OG_DONOR_DISTANCE (6)
 *   4. Distance falloff per candidate:
 *        donation_factor = max(0.10, 1.0 - 0.15 * hops)
 *        donation_cap    = 0.30 * donor.personnel
 *        donation_pers   = floor(min(donor.personnel * donation_factor, donation_cap))
 *        donation_equip  = floor(donor.equipment * donation_factor * 0.5)
 *
 *   5. DETERMINISTIC SORT (CRITICAL — frozen at TG formation):
 *        primary:   distance_hops asc
 *        secondary: source_corps_id strictCompare asc (biases portfolios
 *                   toward fewer C2 nodes; matches Technical Architect r3)
 *        tertiary:  brigade_id strictCompare asc
 *      Never sort by personnel — changes turn-to-turn introduce nondeterminism.
 *
 *   6. Faction-scope opt-in: when callerContext.army_hq_op_id is set, skip
 *      the adjacent-corps rule and pull from all same-faction corps. Apply
 *      ARMY_HQ_COHESION_BLEED_MULT = 2.0× at bleed time (v2.3+).
 *
 * v3.0 will wire scenario triggers for Army HQ ops (Krivaja-95, Vozuća 94,
 * Lukavac 93) and the per-faction frequency gate (MAX_ARMY_HQ_OPS_PER_
 * FACTION_PER_YEAR = 2, ARMY_HQ_OP_COOLDOWN_TURNS = 52).
 */

import type {
    FormationId,
    FormationState,
    GameState,
    TgDonorContribution,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
// ADR-0005 v2.2c (issue #40): exclude brigades reserved by not-yet-injected pre-planned ops.
import { getReservedPrePlannedBrigadeIds } from './pre_planned_operations.js';

export interface DonorSelectionContext {
    /** Anchor brigade for the prospective TG. */
    anchor_brigade_id: FormationId;
    /** Staging OSID for distance calculations. */
    staging_osid: string;
    /** When set, donor pool spans all same-faction corps (Army HQ op). */
    army_hq_op_id?: string;
}

// === Eligibility thresholds (ADR-0005 §Tier 1 constraints) ===
const COHESION_HEALTHY_THRESHOLD = 50;
const MIN_BRIGADE_PERSONNEL_AFTER_DONATION_DEFAULT = 800;
const DONATION_CAP_FRACTION = 0.30;
/** v2.2-simplified: uniform donation factor (no distance falloff yet — v2.2b/v3). */
const V2_2_DONATION_FACTOR = 0.25;
/** v2.2-simplified: max donors per TG. Caps cascade risk while full sort lands later. */
const MAX_DONORS_PER_TG_V2_2 = 3;

/**
 * Select donor contributions for a prospective TG.
 *
 * **v2.2-simplified** (this revision):
 *   - Candidate pool = same corps only (adjacent-corps rule deferred to v2.2b
 *     pending the corps-adjacency cache scaffold)
 *   - Basic eligibility gates:
 *       * active status, same faction as anchor
 *       * cohesion ≥ COHESION_HEALTHY_THRESHOLD
 *       * not already in a TG (Hard Invariant #1)
 *       * residual personnel after donation ≥ MIN_BRIGADE_PERSONNEL_AFTER_DONATION
 *       * not the anchor itself
 *       * cooldown elapsed if tg_cooldown_until_turn is set
 *   - Uniform donation: V2_2_DONATION_FACTOR (25%) capped at DONATION_CAP_FRACTION (30%)
 *   - Sort by (brigade_id strictCompare asc) — distance_hops field set to 0
 *   - Max donors capped at MAX_DONORS_PER_TG_V2_2 (3)
 *
 * v2.2b will extend with: adjacent-corps rule via sector-adjacency BFS;
 * distance falloff (max(0.10, 1.0 - 0.15*hops)); Army HQ faction-scope opt-in;
 * per-scenario donation cap; sort by (distance_hops, source_corps_id, brigade_id).
 *
 * Returns empty array if anchor not found or no eligible donors.
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

    // Iterate same-corps candidates, sorted by brigade_id for determinism.
    const candidates: FormationState[] = Object.keys(formations)
        .sort(strictCompare)
        .map(id => formations[id])
        .filter(f => isEligibleDonor(f, context, anchorCorps, anchorFaction, currentTurn, reservedPrePlanned));

    const selected = candidates.slice(0, MAX_DONORS_PER_TG_V2_2);

    return selected.map(donor => buildContribution(donor, anchorCorps));
}

function isEligibleDonor(
    f: FormationState,
    context: DonorSelectionContext,
    anchorCorps: FormationId,
    anchorFaction: string,
    currentTurn: number,
    reservedPrePlanned: ReadonlySet<FormationId>,
): boolean {
    if (f.id === context.anchor_brigade_id) return false;
    if (f.status !== 'active') return false;
    if (f.faction !== anchorFaction) return false;
    if (f.corps_id !== anchorCorps) return false; // v2.2-simplified: same corps only
    if (reservedPrePlanned.has(f.id)) return false; // issue #40: reserved for a not-yet-injected pre-planned op
    if ((f.cohesion ?? 0) < COHESION_HEALTHY_THRESHOLD) return false;
    if (Object.keys(f.personnel_lent_by_tg ?? {}).length > 0) return false; // Hard Invariant #1
    if (f.tg_cooldown_until_turn != null && currentTurn < f.tg_cooldown_until_turn) return false;
    const personnel = f.personnel ?? 0;
    const donation = computeDonationPersonnel(personnel);
    if (personnel - donation < MIN_BRIGADE_PERSONNEL_AFTER_DONATION_DEFAULT) return false;
    return true;
}

function computeDonationPersonnel(personnel: number): number {
    const factor = V2_2_DONATION_FACTOR;
    const cap = personnel * DONATION_CAP_FRACTION;
    return Math.floor(Math.min(personnel * factor, cap));
}

function buildContribution(donor: FormationState, anchorCorps: FormationId): TgDonorContribution {
    const personnel = donor.personnel ?? 0;
    const personnelLent = computeDonationPersonnel(personnel);
    return {
        brigade_id: donor.id,
        source_corps_id: donor.corps_id ?? anchorCorps,
        distance_hops: 0, // v2.2-simplified — actual BFS in v2.2b
        personnel_lent: personnelLent,
        heavy_equipment_lent: { tanks: 0, artillery: 0, aa_systems: 0 }, // v2.2-simplified: personnel only
        casualties_so_far: 0,
        equipment_losses_so_far: { tanks: 0, artillery: 0, aa_systems: 0 },
        cohesion_bleed_applied: 0, // v2.3 wires the bleed formula
    };
}
