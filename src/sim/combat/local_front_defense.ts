/**
 * Legacy frontline-density helpers.
 *
 * The active engine now treats corps-front sectors as frontline truth.
 * This file survives for one narrow reason: it still provides the shared
 * density formula plus a compatibility fallback for older front-assignment
 * state when sector truth is unavailable.
 *
 * It is no longer the owner of a live "local fronts" runtime layer.
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */

import type {
    AssignableFrontSegmentState,
    FactionId,
    FormationId,
    FormationState,
    GameState
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Coverage density: below this ratio, defense power is penalized. */
const THIN_FRONT_THRESHOLD = 0.5;

/** Coverage density: above this ratio, mutual support bonus applies. */
const DENSE_FRONT_THRESHOLD = 1.0;

/** Maximum mutual support bonus for dense fronts. */
const MAX_DENSITY_BONUS = 1.25;

/** Minimum coverage penalty for very thin fronts. */
const MIN_COVERAGE_PENALTY = 0.6;

/**
 * Compute brigade power contribution to a frontage.
 * Uses simplified basePower (personnel × equipment × experience × cohesion × honor).
 */
function brigadePower(formation: FormationState): number {
    const personnel = formation.personnel ?? 0;
    if (personnel <= 0) return 0;
    const cohesion = Math.max(0, Math.min(100, formation.cohesion ?? 60)) / 100;
    const experience = Math.max(0, Math.min(1, formation.experience ?? 0));
    const expMult = 0.6 + 0.4 * experience;
    const honorMult = formation.honor === 'viteska' ? 1.20
        : formation.honor === 'slavna' ? 1.10 : 1.0;
    return personnel * expMult * cohesion * honorMult;
}

/**
 * Compute front density modifier.
 * - density < THIN_FRONT_THRESHOLD → penalty (down to MIN_COVERAGE_PENALTY)
 * - density between thresholds → 1.0
 * - density > DENSE_FRONT_THRESHOLD → bonus (up to MAX_DENSITY_BONUS)
 *
 * Exported so attack resolution and sector coverage can share one formula.
 */
export function frontDensityModifier(assignedBrigades: number, coverageLength: number): number {
    if (coverageLength <= 0) return 1.0;
    const density = assignedBrigades / coverageLength;

    if (density >= DENSE_FRONT_THRESHOLD) {
        const bonusFraction = Math.min(1.0, (density - DENSE_FRONT_THRESHOLD) / DENSE_FRONT_THRESHOLD);
        return 1.0 + bonusFraction * (MAX_DENSITY_BONUS - 1.0);
    }

    if (density < THIN_FRONT_THRESHOLD) {
        const penaltyFraction = density / THIN_FRONT_THRESHOLD;
        return MIN_COVERAGE_PENALTY + penaltyFraction * (1.0 - MIN_COVERAGE_PENALTY);
    }

    return 1.0;
}

/**
 * Compute defensive power for a frontage from its assigned brigades.
 *
 * defensive_power = sum(brigade_power) × density_modifier / coverage_length
 */
export function computeLocalFrontDefensivePower(
    formations: Record<FormationId, FormationState>,
    assignedBrigadeIds: string[],
    coverageLength: number
): number {
    if (coverageLength <= 0 || assignedBrigadeIds.length === 0) return 0;

    let totalPower = 0;
    for (const brigId of assignedBrigadeIds) {
        const formation = formations[brigId];
        if (formation && formation.status === 'active') {
            totalPower += brigadePower(formation);
        }
    }

    const densityMod = frontDensityModifier(assignedBrigadeIds.length, coverageLength);
    return (totalPower * densityMod) / coverageLength;
}

function findFrontSegment(
    segments: AssignableFrontSegmentState[],
    frontId: string
): AssignableFrontSegmentState | null {
    return segments.find((segment) => segment.front_id === frontId) ?? null;
}

function countAssignedBrigadesForFront(
    assignments: Record<string, string | null>,
    frontId: string
): number {
    let assignedCount = 0;
    for (const brigadeId of Object.keys(assignments).sort(strictCompare)) {
        if (assignments[brigadeId] === frontId) assignedCount += 1;
    }
    return assignedCount;
}

function findSectorDensityModifier(
    state: GameState,
    formation: FormationState
): number | null {
    const sectors = state.military.corps_front_sectors;
    if (!sectors) return null;

    for (const sectorId of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sectorId]!;
        if (!sector.assigned_brigade_ids.includes(formation.id)) continue;
        return frontDensityModifier(sector.assigned_brigade_ids.length, sector.length_edges);
    }

    return null;
}

function findLegacyFrontDensityModifier(
    state: GameState,
    formation: FormationState
): number | null {
    const frontId = state.military.brigade_front_assignment?.[formation.id];
    if (!frontId) return null;

    const segments = state.military.assignable_front_segments ?? [];
    const segment = findFrontSegment(segments, frontId);
    if (!segment) return null;

    const assignments = state.military.brigade_front_assignment ?? {};
    const assignedCount = countAssignedBrigadesForFront(assignments, frontId);
    return frontDensityModifier(assignedCount, segment.length_edges);
}

/**
 * Get the frontline density modifier for a specific brigade.
 *
 * Lookup order:
 * 1. corps_front_sectors (live frontline truth)
 * 2. brigade_front_assignment (legacy compatibility fallback)
 *
 * Returns 1.0 if the brigade is not assigned to any live frontline.
 */
export function getLocalFrontDensityModifier(
    state: GameState,
    formation: FormationState
): number {
    const sectorModifier = findSectorDensityModifier(state, formation);
    if (sectorModifier !== null) return sectorModifier;

    const legacyModifier = findLegacyFrontDensityModifier(state, formation);
    if (legacyModifier !== null) return legacyModifier;

    return 1.0;
}
