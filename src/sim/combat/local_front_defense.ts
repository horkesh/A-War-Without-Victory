/**
 * Local Fronts: defensive sectors composed of contiguous front edges.
 *
 * Key mechanic: coverage density. A brigade covering 20 edges is much weaker
 * per-edge than one covering 5. Thin fronts collapse; concentrated fronts hold.
 *
 * Derived each turn (Engine Invariants §13: no serialization of derived state).
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */

import type {
    AssignableFrontSegmentState,
    FactionId,
    FormationId,
    FormationState,
    GameState,
    LocalFront
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Coverage density: below this ratio, defense power is penalized. */
const THIN_FRONT_THRESHOLD = 0.5;  // brigades / edges

/** Coverage density: above this ratio, mutual support bonus applies. */
const DENSE_FRONT_THRESHOLD = 1.0;  // brigades / edges

/** Maximum mutual support bonus for dense fronts. */
const MAX_DENSITY_BONUS = 1.25;

/** Minimum coverage penalty for very thin fronts. */
const MIN_COVERAGE_PENALTY = 0.6;

// ═══════════════════════════════════════════════════════════════════════════
// Defensive Power Calculation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute brigade power contribution to a local front.
 * Uses simplified basePower (personnel × equipment × experience × cohesion × honor).
 */
function brigadePower(formation: FormationState): number {
    const personnel = formation.personnel ?? 0;
    if (personnel <= 0) return 0;
    const cohesion = Math.max(0, Math.min(100, formation.cohesion ?? 60)) / 100;
    const experience = Math.max(0, Math.min(1, formation.experience ?? 0));
    const expMult = 0.6 + 0.4 * experience;
    const honorMult = formation.honor === 'vitezka' ? 1.20
        : formation.honor === 'slavna' ? 1.10 : 1.0;
    return personnel * expMult * cohesion * honorMult;
}

/**
 * Compute front density modifier.
 * - density < THIN_FRONT_THRESHOLD → penalty (down to MIN_COVERAGE_PENALTY)
 * - density between thresholds → 1.0 (normal)
 * - density > DENSE_FRONT_THRESHOLD → bonus (up to MAX_DENSITY_BONUS)
 */
function frontDensityModifier(assignedBrigades: number, coverageLength: number): number {
    if (coverageLength <= 0) return 1.0;
    const density = assignedBrigades / coverageLength;

    if (density >= DENSE_FRONT_THRESHOLD) {
        // Linear bonus: 1.0 at threshold → MAX_DENSITY_BONUS at 2× threshold
        const bonusFraction = Math.min(1.0, (density - DENSE_FRONT_THRESHOLD) / DENSE_FRONT_THRESHOLD);
        return 1.0 + bonusFraction * (MAX_DENSITY_BONUS - 1.0);
    }

    if (density < THIN_FRONT_THRESHOLD) {
        // Linear penalty: 1.0 at threshold → MIN_COVERAGE_PENALTY at density=0
        const penaltyFraction = density / THIN_FRONT_THRESHOLD;
        return MIN_COVERAGE_PENALTY + penaltyFraction * (1.0 - MIN_COVERAGE_PENALTY);
    }

    return 1.0;
}

/**
 * Compute defensive power for a local front.
 *
 * defensive_power = sum(brigade_power) × density_modifier / coverage_length
 *
 * Returns per-edge defensive power (higher = harder to attack any edge on this front).
 */
export function computeLocalFrontDefensivePower(
    formations: Record<FormationId, FormationState>,
    assignedBrigadeIds: string[],
    coverageLength: number
): number {
    if (coverageLength <= 0 || assignedBrigadeIds.length === 0) return 0;

    let totalPower = 0;
    for (const brigId of assignedBrigadeIds) {
        const f = formations[brigId];
        if (f && f.status === 'active') {
            totalPower += brigadePower(f);
        }
    }

    const densityMod = frontDensityModifier(assignedBrigadeIds.length, coverageLength);
    return (totalPower * densityMod) / coverageLength;
}

// ═══════════════════════════════════════════════════════════════════════════
// Local Front Construction (Bot)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build local fronts from assignable front segments and brigade assignments.
 *
 * Each front segment where a faction has assigned brigades becomes a LocalFront.
 * Coverage length = segment edge count. Assigned brigades = those mapped to this segment.
 *
 * Deterministic: processes segments in sorted order by front_id.
 */
export function buildLocalFronts(state: GameState): Record<string, LocalFront> {
    const segments = state.assignable_front_segments;
    const assignments = state.brigade_front_assignment;
    const formations = state.formations ?? {};
    const turn = state.meta?.turn ?? 0;

    if (!segments || !assignments) return {};

    const result: Record<string, LocalFront> = {};

    // Group brigades by their assigned front_id
    const brigadesByFront: Record<string, string[]> = {};
    const sortedBrigadeIds = Object.keys(assignments).sort(strictCompare);
    for (const brigId of sortedBrigadeIds) {
        const frontId = assignments[brigId];
        if (!frontId) continue; // reserve brigade, not assigned to any front
        if (!brigadesByFront[frontId]) brigadesByFront[frontId] = [];
        brigadesByFront[frontId]!.push(brigId);
    }

    // Build local front for each segment that has assigned brigades
    const sortedSegments = [...segments].sort((a, b) => strictCompare(a.front_id, b.front_id));
    for (const seg of sortedSegments) {
        const brigIds = brigadesByFront[seg.front_id];
        if (!brigIds || brigIds.length === 0) continue;

        // Determine faction from first assigned brigade
        const firstBrig = formations[brigIds[0]!];
        if (!firstBrig) continue;
        const faction = firstBrig.faction as FactionId;

        const coverageLength = seg.length_edges;
        const defensivePower = computeLocalFrontDefensivePower(
            formations,
            brigIds,
            coverageLength
        );

        result[seg.front_id] = {
            id: seg.front_id,
            faction,
            name: seg.name ?? seg.front_id,
            created_turn: turn,
            assigned_brigade_ids: brigIds,
            edge_ids: seg.edge_ids,
            coverage_length: coverageLength,
            defensive_power: defensivePower
        };
    }

    return result;
}

/**
 * Get the front density modifier for a specific brigade's local front.
 * Used by attack resolution to apply coverage-based defense modifier.
 *
 * Returns 1.0 if brigade is not assigned to a local front.
 */
export function getLocalFrontDensityModifier(
    state: GameState,
    formation: FormationState
): number {
    const frontId = state.brigade_front_assignment?.[formation.id];
    if (!frontId) return 1.0;

    const front = state.local_fronts?.[frontId];
    if (!front) return 1.0;

    return frontDensityModifier(front.assigned_brigade_ids.length, front.coverage_length);
}
