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
import { FATIGUE_MAX } from '../../../state/formation_constants.js';
import type { SupplyStateByOsidReport, SupplyStateLevel } from '../../../state/supply_state_derivation.js';
import { strictCompare } from '../../../state/validateGameState.js';
import { resolveEquipmentClass, getEquipmentOffensivePriority } from '../sector_offensive_launch_helpers.js';
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

/** Shared fatigue effectiveness floors aligned with combat_math.ts. */
const FATIGUE_ATTACK_FLOOR = 0.6;
const FATIGUE_DEFEND_FLOOR = 0.75;

// ═══════════════════════════════════════════════════════════════════════════
// Supply multiplier
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert supply status string to combat multiplier.
 * The briefing supply_by_osid does not carry per-brigade narrowing yet;
 * brigades don't expose supply_status directly. Use a conservative default.
 */
function supplyMult(supplyStatus: string | undefined): number {
    switch (supplyStatus) {
        case 'adequate': return 1.0;
        case 'strained': return 0.75;
        case 'critical': return 0.5;
        default: return 0.8; // unknown / not available
    }
}

function getBrigadeSupplyState(
    brigade: FormationState,
    supplyByOsid: SupplyStateByOsidReport | null | undefined,
): SupplyStateLevel | undefined {
    if (!brigade.location_osid || !brigade.faction || !supplyByOsid) {
        return undefined;
    }
    const factions = supplyByOsid.factions ?? [];
    const factionEntry = factions.find(entry => entry?.faction_id === brigade.faction);
    if (!factionEntry || !Array.isArray(factionEntry.by_osid)) return undefined;
    const osidEntry = factionEntry.by_osid.find(entry => entry?.osid === brigade.location_osid);
    return osidEntry?.state;
}

function getFatigueMult(brigade: FormationState, mode: 'attack' | 'defend'): number {
    const fatigue = brigade.ops?.fatigue ?? 0;
    if (fatigue <= 0) return 1.0;
    const ratio = Math.min(1.0, fatigue / FATIGUE_MAX);
    const floor = mode === 'attack' ? FATIGUE_ATTACK_FLOOR : FATIGUE_DEFEND_FLOOR;
    return 1.0 - ratio * (1.0 - floor);
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
    const fatigueOffenseMult = getFatigueMult(brigade, 'attack');
    const fatigueDefenseMult = getFatigueMult(brigade, 'defend');

    // Fitness formulas from design doc
    const personnelNorm = personnel / STANDARD_PERSONNEL;
    const cohesionNorm = cohesion / 100;

    const fitnessOffense = personnelNorm * sMult * cohesionNorm
        * (1 + equipPriority * 0.25)
        * fatigueOffenseMult
        * (isDisrupted ? 0 : 1);

    const fitnessDefense = personnelNorm * sMult * cohesionNorm
        * (1 + entrenchment * 0.1)
        * fatigueDefenseMult
        * 0.5;

    const fitnessGarrison = Math.max(GARRISON_FITNESS_FLOOR, personnelNorm * 0.5);

    // Tiered assignment
    // Issue #20 / Option K: elite formations (OOB is_elite=true → elite_loan_state set)
    // count as main_effort regardless of fitness_offense threshold, provided they have
    // motorized/mechanized equipment. Captures the historical reality that elite units
    // (Vitezovi at Ahmići, Guards Brigades during Cincar/Maestral, Drina Wolves at
    // Srebrenica) maintained offensive capacity even at degraded cohesion — the
    // organizational cadre buffers what raw cohesion-based fitness can't.
    const isElite = brigade.elite_loan_state !== undefined;
    let tier: BrigadeEvaluation['tier'];
    if (isElite && equipPriority >= MAIN_EFFORT_EQUIPMENT_PRIORITY) {
        tier = 'main_effort';
    } else if (equipPriority >= MAIN_EFFORT_EQUIPMENT_PRIORITY && fitnessOffense >= MAIN_EFFORT_FITNESS_THRESHOLD) {
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
        is_on_loan: brigade.elite_loan_state?.on_loan ?? false,
        is_home_defense: brigade.home_defense_active ?? false,
        morale: brigade.morale ?? 50,
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
    supplyByOsid?: SupplyStateByOsidReport | null,
): ForceAssessment {
    // Build a fast lookup: OSID -> ZoneId
    const osidToZone = new Map<string, ZoneId>();
    for (const zone of zoneAssessments) {
        for (const osid of zone.osids) {
            osidToZone.set(osid, zone.zone_id);
        }
    }

    const evaluations: BrigadeEvaluation[] = [];
    const byZone: Record<string, BrigadeEvaluation[]> = {};
    let combatEffective = 0;
    let mainEffort = 0;
    let activeDefense = 0;
    let garrison = 0;

    // Sort brigades for deterministic iteration
    const sortedBrigades = [...brigades].sort((a, b) => strictCompare(a.id, b.id));

    for (const brigade of sortedBrigades) {
        const loc = brigade.location_osid;
        const currentZone = loc ? (osidToZone.get(loc) ?? null) : null;

        const evaluation = evaluateBrigade(
            brigade,
            currentZone,
            getBrigadeSupplyState(brigade, supplyByOsid),
        );
        evaluations.push(evaluation);

        if (evaluation.is_combat_effective) combatEffective++;

        switch (evaluation.tier) {
            case 'main_effort': mainEffort++; break;
            case 'active_defense': activeDefense++; break;
            case 'garrison': garrison++; break;
        }

        // Group by zone
        const zoneKey = currentZone ?? '__unassigned__';
        let zoneEvals = byZone[zoneKey];
        if (!zoneEvals) {
            zoneEvals = [];
            byZone[zoneKey] = zoneEvals;
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
