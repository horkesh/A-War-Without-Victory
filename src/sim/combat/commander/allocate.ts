/**
 * allocate.ts — Grigsby two-pass brigade allocation for v0.8 Corps Commander Intelligence.
 *
 * Pass 1: Garrison allocation — assign minimum brigades to hold each zone.
 * Pass 2: Surplus pool — remaining brigades available for operations.
 *
 * The Sarajevo Fix: besieged zones lock brigades to garrison, preventing the
 * corps CO from stripping the siege ring for operations. SRK with ~80 edges
 * and 9 brigades gets garrison_budget=10, deficit=1, zero surplus, pure defense.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random(), no Date.now().
 */

/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Canonical
 * DOMAIN:    Brigade-to-sector allocation — garrison first, surplus for ops
 * ═══════════════════════════════════════════════════════════════
 *
 * DECIDES:   How many brigades garrison each zone vs. enter the surplus pool for operations
 * WRITES:    Nothing in GameState — returns AllocationResult struct to commander_loop
 * READS:     ZoneAssessment (threat levels, zone widths), officer personality, briefing
 * MUST NOT:  move brigades — only assigns to sectors (T1 intent; execution via T2/T3)
 *
 * UPSTREAM:  assess.ts (ZoneAssessment, ForceEvaluation), officer personality
 * DOWNSTREAM: plan.ts (surplus pool sizing), emit.ts (directive sector_assignment)
 *
 * TRUTH INVARIANTS:
 * - must_hold zones always receive garrison_budget regardless of surplus pressure
 * - Besieged corps (SRK) lock all brigades to garrison — zero surplus
 * - Deterministic: sorted iteration via strictCompare, no Math.random(), no Date.now()
 *
 * MOVEMENT TIER: T1 — Strategic Intent Owner (assignment only; no movement issued here)
 * ═══════════════════════════════════════════════════════════════
 */

import type { FormationId } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';
import type {
    ZoneAssessment,
    ZoneId,
    ZonePosture,
    BrigadeEvaluation,
    ForceAssessment,
    OfficerPersonality,
} from './commander_state.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Garrison budget constants — edges per brigade by posture. */
export const GARRISON_EDGES_PER_BRIGADE: Record<ZonePosture, number> = {
    besieged: 8,
    defending: 12,
    balanced: 15,
    projecting: 20,
};

/** Caution threshold above which garrison budget is increased. */
const CAUTIOUS_THRESHOLD = 0.5;

/** Max garrison budget increase for cautious commanders (fraction). */
const CAUTIOUS_BUDGET_INCREASE = 0.2;

/** Aggression threshold above which garrison budget is reduced. */
const AGGRESSIVE_THRESHOLD = 0.7;

/** Garrison budget reduction for aggressive commanders (fraction). */
const AGGRESSIVE_BUDGET_REDUCTION = 0.1;

/** Garrison budget multiplier for must-hold zones (structural chokepoints). */
const MUST_HOLD_BUDGET_MULTIPLIER = 1.5;

/** Besieged zone surplus is locked to local ops within this many hops. */
export const BESIEGED_SURPLUS_HOP_LIMIT = 2;

// ═══════════════════════════════════════════════════════════════════════════
// AllocationResult
// ═══════════════════════════════════════════════════════════════════════════

export interface AllocationResult {
    /** Updated zones with garrison/surplus assignments. */
    zones: ZoneAssessment[];
    /** Brigades locked to garrison duty — cannot participate in ops. */
    garrison_locks: Array<{ brigade_id: FormationId; zone_id: ZoneId; reason: string }>;
    /** Brigades available for operations. */
    surplus_pool: BrigadeEvaluation[];
    /** Total garrison budget across all zones. */
    total_garrison_budget: number;
    /** Whether the corps has any surplus for ops. */
    can_launch_ops: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// computeGarrisonBudget — garrison budget for one zone
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute garrison budget for a zone based on posture, front edge count,
 * and officer personality.
 *
 * A cautious commander (caution > 0.5) increases budget by 10-20%.
 * An aggressive commander (aggression > 0.7) reduces budget by 10%.
 * Minimum budget of 1 for any zone with front edges.
 */
export function computeGarrisonBudget(
    zone: ZoneAssessment,
    personality: OfficerPersonality,
    isMustHold = false,
): number {
    if (zone.front_edge_count === 0) return 0;

    const edgesPerBrigade = GARRISON_EDGES_PER_BRIGADE[zone.posture];
    let budget = Math.ceil(zone.front_edge_count / edgesPerBrigade);

    // Must-hold zones (structural chokepoints) get a garrison floor bump
    // applied BEFORE personality modifiers so aggressive commanders cannot
    // strip corridor-entrance zones below the structural minimum.
    if (isMustHold) {
        budget = Math.ceil(budget * MUST_HOLD_BUDGET_MULTIPLIER);
    }

    // Personality modifiers
    if (personality.caution > CAUTIOUS_THRESHOLD) {
        // Linear interpolation: caution 0.5 -> +0%, caution 1.0 -> +20%
        const cautionFraction = (personality.caution - CAUTIOUS_THRESHOLD) / (1.0 - CAUTIOUS_THRESHOLD);
        const increase = cautionFraction * CAUTIOUS_BUDGET_INCREASE;
        budget = Math.ceil(budget * (1 + increase));
    } else if (personality.aggression > AGGRESSIVE_THRESHOLD) {
        budget = Math.ceil(budget * (1 - AGGRESSIVE_BUDGET_REDUCTION));
    }

    // Minimum 1 for any zone with front edges
    return Math.max(1, budget);
}

// ═══════════════════════════════════════════════════════════════════════════
// sortForGarrison — sort brigades by garrison suitability (best defenders first)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sort brigades for garrison assignment — prefer best defenders first.
 * Primary: fitness_defense descending.
 * Tiebreaker: brigade_id via strictCompare for determinism.
 */
export function sortForGarrison(evaluations: BrigadeEvaluation[]): BrigadeEvaluation[] {
    return [...evaluations].sort((a, b) => {
        const fitDiff = b.fitness_defense - a.fitness_defense;
        if (fitDiff !== 0) return fitDiff;
        return strictCompare(a.brigade_id, b.brigade_id);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// sortZonesByPriority — garrison priority ordering
// ═══════════════════════════════════════════════════════════════════════════

const POSTURE_PRIORITY: Record<ZonePosture, number> = {
    besieged: 0,
    defending: 1,
    balanced: 2,
    projecting: 3,
};

/**
 * Sort zones by garrison priority.
 * 1. Besieged first (posture priority ascending).
 * 2. Highest deficit first.
 * 3. Highest population_value first.
 * 4. zone_id via strictCompare for determinism.
 */
export function sortZonesByPriority(zones: ZoneAssessment[]): ZoneAssessment[] {
    return [...zones].sort((a, b) => {
        // 1. Posture priority (besieged=0 first)
        const postureDiff = POSTURE_PRIORITY[a.posture] - POSTURE_PRIORITY[b.posture];
        if (postureDiff !== 0) return postureDiff;

        // 2. Highest deficit first
        const deficitDiff = b.deficit - a.deficit;
        if (deficitDiff !== 0) return deficitDiff;

        // 3. Highest population_value first
        const popDiff = b.population_value - a.population_value;
        if (popDiff !== 0) return popDiff;

        // 4. Deterministic tiebreaker
        return strictCompare(a.zone_id, b.zone_id);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// allocateBrigades — two-pass Grigsby allocation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Two-pass Grigsby allocation: garrison first, surplus for ops.
 *
 * Pass 1: For each zone (priority-sorted), compute garrison budget and assign
 * brigades. Prefer brigades already in the zone, prefer those with higher
 * fitness_defense. Garrison brigades are LOCKED.
 *
 * Pass 2: Remaining brigades form the surplus pool, available for operations.
 * Besieged zone surplus (rare) is locked to local ops only.
 *
 * Returns updated zone assessments with garrison/surplus assignments and
 * the list of garrison-locked brigades.
 */
export function allocateBrigades(
    zones: ZoneAssessment[],
    forces: ForceAssessment,
    personality: OfficerPersonality,
): AllocationResult {
    // Track which brigades have been assigned to garrison
    const garrisonAssigned = new Set<string>();
    const garrisonLocks: Array<{ brigade_id: FormationId; zone_id: ZoneId; reason: string }> = [];
    const updatedZones: ZoneAssessment[] = [];

    // Build a fast lookup: brigade_id -> BrigadeEvaluation
    const evalByBrigade = new Map<string, BrigadeEvaluation>();
    for (const ev of forces.evaluations) {
        evalByBrigade.set(ev.brigade_id, ev);
    }

    // -----------------------------------------------------------------------
    // Pass 1: Garrison allocation
    // -----------------------------------------------------------------------

    // Compute garrison budgets for all zones
    const budgetByZone = new Map<string, number>();
    const zonesWithBudgets: ZoneAssessment[] = [];

    for (const zone of zones) {
        const budget = computeGarrisonBudget(zone, personality, zone.is_must_hold);
        budgetByZone.set(zone.zone_id, budget);

        // Create a temporary zone with the personality-adjusted garrison budget
        // so sortZonesByPriority can use the updated deficit
        const adjustedDeficit = Math.max(0, budget - zone.assigned_brigades.length);
        zonesWithBudgets.push({
            ...zone,
            garrison_budget: budget,
            deficit: adjustedDeficit,
        });
    }

    // Sort zones by priority: besieged first, highest deficit first
    const prioritySortedZones = sortZonesByPriority(zonesWithBudgets);

    // For each zone, assign garrison brigades
    const garrisonByZone = new Map<string, FormationId[]>();
    const surplusByZone = new Map<string, FormationId[]>();

    for (const zone of prioritySortedZones) {
        const budget = budgetByZone.get(zone.zone_id) ?? 0;

        // Get evaluations for brigades in this zone, sorted for garrison suitability
        const zoneBrigadeEvals: BrigadeEvaluation[] = [];
        for (const brigId of zone.assigned_brigades) {
            const ev = evalByBrigade.get(brigId);
            if (ev && !garrisonAssigned.has(brigId)) {
                zoneBrigadeEvals.push(ev);
            }
        }
        const sortedZoneBrigades = sortForGarrison(zoneBrigadeEvals);

        const zoneGarrison: FormationId[] = [];
        const zoneSurplus: FormationId[] = [];

        if (zone.posture === 'besieged' && budget >= sortedZoneBrigades.length) {
            // Besieged zones with budget >= available: ALL brigades garrison, no surplus
            for (const ev of sortedZoneBrigades) {
                zoneGarrison.push(ev.brigade_id);
                garrisonAssigned.add(ev.brigade_id);
                garrisonLocks.push({
                    brigade_id: ev.brigade_id,
                    zone_id: zone.zone_id,
                    reason: `besieged garrison (budget ${budget}, available ${sortedZoneBrigades.length})`,
                });
            }
        } else {
            // Assign up to budget brigades to garrison, rest to surplus
            for (let i = 0; i < sortedZoneBrigades.length; i++) {
                const ev = sortedZoneBrigades[i];
                if (i < budget) {
                    zoneGarrison.push(ev.brigade_id);
                    garrisonAssigned.add(ev.brigade_id);
                    garrisonLocks.push({
                        brigade_id: ev.brigade_id,
                        zone_id: zone.zone_id,
                        reason: `${zone.posture} garrison (slot ${i + 1}/${budget})`,
                    });
                } else {
                    zoneSurplus.push(ev.brigade_id);
                }
            }
        }

        garrisonByZone.set(zone.zone_id, zoneGarrison);
        surplusByZone.set(zone.zone_id, zoneSurplus);
    }

    // -----------------------------------------------------------------------
    // Pass 2: Build surplus pool
    // -----------------------------------------------------------------------

    // Surplus = all brigades not assigned to garrison
    // Include brigades not in any zone (unassigned) as surplus
    const surplusEvals: BrigadeEvaluation[] = [];

    for (const ev of [...forces.evaluations].sort((a, b) => strictCompare(a.brigade_id, b.brigade_id))) {
        if (!garrisonAssigned.has(ev.brigade_id) && !ev.is_on_loan) {
            surplusEvals.push(ev);
        }
    }

    // -----------------------------------------------------------------------
    // Build updated zone assessments
    // -----------------------------------------------------------------------

    // Re-sort zones back to original order for output consistency
    for (const zone of [...zones].sort((a, b) => strictCompare(a.zone_id, b.zone_id))) {
        const budget = budgetByZone.get(zone.zone_id) ?? 0;
        const garrison = garrisonByZone.get(zone.zone_id) ?? [];
        const surplus = surplusByZone.get(zone.zone_id) ?? [];
        const deficit = Math.max(0, budget - garrison.length);

        updatedZones.push({
            ...zone,
            garrison_budget: budget,
            surplus_brigades: surplus,
            deficit,
        });
    }

    // Total garrison budget
    let totalGarrisonBudget = 0;
    for (const budget of budgetByZone.values()) {
        totalGarrisonBudget += budget;
    }

    // Can launch ops only if there is non-besieged surplus OR besieged-breakout surplus
    // (issue #13 Option H: besieged zones with surplus brigades AND an enemy front are
    // breakout-capable — historical Vitez/Kiseljak/Žepče pocket operations 1993-94 and
    // Bihać 5th Corps offensives from encirclement). No corridor_width requirement:
    // breakout ops attack INTO the encirclement, not through a friendly retreat route.
    // Downstream supply/feasibility/MIN_BRIGADES gates catch hopeless breakouts.
    const launchCapableSurplus = surplusEvals.filter(ev => {
        const zone = updatedZones.find(z => z.assigned_brigades.includes(ev.brigade_id));
        if (!zone) return true;
        if (zone.posture !== 'besieged') return true;
        return zone.front_edge_count > 0;
    });

    return {
        zones: updatedZones,
        garrison_locks: garrisonLocks,
        surplus_pool: surplusEvals,
        total_garrison_budget: totalGarrisonBudget,
        can_launch_ops: launchCapableSurplus.length > 0,
    };
}
