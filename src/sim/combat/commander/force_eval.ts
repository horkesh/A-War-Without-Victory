/**
 * force_eval.ts — Brigade fitness scoring for v0.8 Corps Commander Intelligence.
 *
 * Evaluates all brigades for a corps, producing fitness scores and tiered assignment.
 * Fitness scoring: offense (attack potential), defense (hold potential), garrison (minimum capability).
 * Tiered assignment: main_effort / active_defense / garrison.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random(), no Date.now().
 */

import type { FormationId, FormationState } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';
import { resolveEquipmentClass, getEquipmentOffensivePriority } from '../sector_offensive.js';
import type { ZoneAssessment, ZoneId, BrigadeEvaluation, ForceAssessment } from './commander_state.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Standard brigade personnel for normalization. */
const STANDARD_PERSONNEL = 2500;

/** Personnel threshold for combat effectiveness. */
const COMBAT_EFFECTIVE_PERSONNEL = 400;

/** Equipment priority threshold for main_effort tier. */
const MAIN_EFFORT_EQUIPMENT_PRIORITY = 2;

/** Fitness threshold for main_effort tier. */
const MAIN_EFFORT_FITNESS_THRESHOLD = 0.4;

/** Fitness threshold for active_defense tier. */
const ACTIVE_DEFENSE_FITNESS_THRESHOLD = 0.3;

/** Minimum garrison fitness floor for depleted units. */
const GARRISON_FITNESS_FLOOR = 0.2;

// ═══════════════════════════════════════════════════════════════════════════
// Supply multiplier
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert supply status string to combat multiplier.
 * The briefing supply_by_osid is typed as unknown for now; brigades don't carry
 * supply_status directly. Use a conservative default.
 */
function supplyMult(_supplyStatus: string | undefined): number {
    switch (_supplyStatus) {
        case 'adequate': return 1.0;
        case 'strained': return 0.75;
        case 'critical': return 0.5;
        default: return 0.8; // unknown / not available
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// evaluateBrigade — single brigade fitness scoring
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate a single brigade's fitness.
 * Pure function — no mutations.
 */
export function evaluateBrigade(
    brigade: FormationState,
    currentZone: ZoneId | null,
    supplyStatus?: string,
): BrigadeEvaluation {
    const personnel = brigade.personnel ?? 1000;
    const cohesion = brigade.cohesion ?? 50;
    const entrenchment = brigade.entrenchment_turns ?? 0;
    const disruptedTurns = brigade.disrupted_turns ?? 0;
    const isDisrupted = disruptedTurns > 0;
    const isCombatEffective = personnel >= COMBAT_EFFECTIVE_PERSONNEL;

    const equipClass = resolveEquipmentClass(brigade);
    const equipPriority = getEquipmentOffensivePriority(equipClass);
    const sMult = supplyMult(supplyStatus);

    // Fitness formulas from design doc
    const personnelNorm = personnel / STANDARD_PERSONNEL;
    const cohesionNorm = cohesion / 100;

    const fitnessOffense = personnelNorm * sMult * cohesionNorm
        * (1 + equipPriority * 0.25)
        * (isDisrupted ? 0 : 1);

    const fitnessDefense = personnelNorm * sMult * cohesionNorm
        * (1 + entrenchment * 0.1)
        * 0.5;

    const fitnessGarrison = Math.max(GARRISON_FITNESS_FLOOR, personnelNorm * 0.5);

    // Tiered assignment
    let tier: BrigadeEvaluation['tier'];
    if (equipPriority >= MAIN_EFFORT_EQUIPMENT_PRIORITY && fitnessOffense >= MAIN_EFFORT_FITNESS_THRESHOLD) {
        tier = 'main_effort';
    } else if (fitnessDefense >= ACTIVE_DEFENSE_FITNESS_THRESHOLD && isCombatEffective) {
        tier = 'active_defense';
    } else {
        tier = 'garrison';
    }

    return {
        brigade_id: brigade.id,
        fitness_offense: fitnessOffense,
        fitness_defense: fitnessDefense,
        fitness_garrison: fitnessGarrison,
        equipment_class: equipClass,
        equipment_priority: equipPriority,
        tier,
        is_combat_effective: isCombatEffective,
        is_disrupted: isDisrupted,
        current_zone: currentZone,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// assignBrigadeToZone — match brigade to zone by location
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assign brigade to zone based on location_osid.
 * Returns null if brigade has no location or is not in any zone.
 */
export function assignBrigadeToZone(
    brigade: FormationState,
    zones: ZoneAssessment[],
): ZoneId | null {
    const loc = brigade.location_osid;
    if (!loc) return null;

    for (const zone of zones) {
        if (zone.osids.includes(loc)) {
            return zone.zone_id;
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// evaluateCorpsForces — full force assessment for a corps
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate all brigades for a corps, producing fitness scores and tiered assignment.
 * Pure function — no mutations.
 */
export function evaluateCorpsForces(
    brigades: readonly FormationState[],
    zoneAssessments: ZoneAssessment[],
): ForceAssessment {
    // Build a fast lookup: OSID -> ZoneId
    const osidToZone = new Map<string, ZoneId>();
    for (const zone of zoneAssessments) {
        for (const osid of zone.osids) {
            osidToZone.set(osid, zone.zone_id);
        }
    }

    const evaluations: BrigadeEvaluation[] = [];
    const byZone = new Map<string, BrigadeEvaluation[]>();
    let combatEffective = 0;
    let mainEffort = 0;
    let activeDefense = 0;
    let garrison = 0;

    // Sort brigades for deterministic iteration
    const sortedBrigades = [...brigades].sort((a, b) => strictCompare(a.id, b.id));

    for (const brigade of sortedBrigades) {
        const loc = brigade.location_osid;
        const currentZone = loc ? (osidToZone.get(loc) ?? null) : null;

        const evaluation = evaluateBrigade(brigade, currentZone);
        evaluations.push(evaluation);

        if (evaluation.is_combat_effective) combatEffective++;

        switch (evaluation.tier) {
            case 'main_effort': mainEffort++; break;
            case 'active_defense': activeDefense++; break;
            case 'garrison': garrison++; break;
        }

        // Group by zone
        const zoneKey = currentZone ?? '__unassigned__';
        let zoneEvals = byZone.get(zoneKey);
        if (!zoneEvals) {
            zoneEvals = [];
            byZone.set(zoneKey, zoneEvals);
        }
        zoneEvals.push(evaluation);
    }

    // Total surplus across all zones
    let totalSurplus = 0;
    for (const zone of zoneAssessments) {
        totalSurplus += Math.max(0, zone.assigned_brigades.length - zone.garrison_budget);
    }

    return {
        total_brigades: sortedBrigades.length,
        combat_effective: combatEffective,
        evaluations,
        by_zone: byZone,
        tier_counts: {
            main_effort: mainEffort,
            active_defense: activeDefense,
            garrison,
        },
        total_surplus: totalSurplus,
    };
}
