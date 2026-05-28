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
    GameState,
    TgDonorContribution,
} from '../../state/game_state.js';

export interface DonorSelectionContext {
    /** Anchor brigade for the prospective TG. */
    anchor_brigade_id: FormationId;
    /** Staging OSID for distance calculations. */
    staging_osid: string;
    /** When set, donor pool spans all same-faction corps (Army HQ op). */
    army_hq_op_id?: string;
}

/**
 * Select donor contributions for a prospective TG.
 *
 * v2.0 stub: always returns []. TG forms as anchor-only.
 * v2.2 will replace with the full algorithm documented in the file header.
 */
export function selectDonors(
    _state: GameState,
    _context: DonorSelectionContext,
): TgDonorContribution[] {
    // v2.0: empty donor pool. v2.2 will populate via BFS adjacent-corps walk.
    return [];
}
