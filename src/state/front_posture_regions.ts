import type { FrontRegionsFile } from '../map/front_regions.js';
import type { GameState, PostureLevel } from './game_state.js';

function isPostureLevel(value: unknown): value is PostureLevel {
    return value === 'hold' || value === 'probe' || value === 'push';
}

function clampWeight(value: unknown): number {
    if (!Number.isInteger(value)) return 0;
    const n = value as number;
    return n < 0 ? 0 : n;
}

/**
 * Deterministically expand region-level posture commands into per-edge posture assignments.
 *
 * Rules:
 * - For each faction (sorted):
 *   - For each region_id assignment (sorted):
 *     - Find region in frontRegions by region_id (missing => ignore)
 *     - For each edge_id in region.edge_ids (already sorted):
 *       - Skip inactive segments (state.military.front_segments[edge_id]?.active !== true)
 *       - If edge posture already exists for this faction, do nothing (edge overrides region)
 *       - Else write edge posture = region posture/weight (clamped/coerced)
 *
 * This mutates state.front_posture but never deletes or clears existing edge assignments.
 * Cleanup/zeroing of inactive/stale edges remains the responsibility of normalizeFrontPosture.
 */
export function expandRegionPostureToEdges(
    state: GameState,
    frontRegions: FrontRegionsFile
): { expanded_edges_count: number } {
    if (!state.military.front_posture || typeof state.military.front_posture !== 'object') state.military.front_posture = {};
    if (!state.military.front_posture_regions || typeof state.military.front_posture_regions !== 'object') state.military.front_posture_regions = {};

    const regionById = new Map<string, { edge_ids: string[] }>();
    for (const r of frontRegions.regions ?? []) {
        if (r && typeof r.region_id === 'string' && Array.isArray(r.edge_ids)) {
            regionById.set(r.region_id, { edge_ids: r.edge_ids });
        }
    }

    let expanded = 0;
    const factionIdsSorted = Object.keys(state.military.front_posture_regions).sort();

    for (const factionId of factionIdsSorted) {
        const rp = state.military.front_posture_regions[factionId];
        if (!rp || typeof rp !== 'object') continue;
        const regionAssignments = rp.assignments;
        if (!regionAssignments || typeof regionAssignments !== 'object') continue;

        if (!state.military.front_posture[factionId]) state.military.front_posture[factionId] = { assignments: {} };
        if (!state.military.front_posture[factionId].assignments) state.military.front_posture[factionId].assignments = {};
        const edgeAssignments = state.military.front_posture[factionId].assignments;

        const regionIdsSorted = Object.keys(regionAssignments).sort();
        for (const region_id of regionIdsSorted) {
            const a = regionAssignments[region_id];
            if (!a || typeof a !== 'object') continue;

            const region = regionById.get(region_id);
            if (!region) continue;

            const posture: PostureLevel = isPostureLevel(a.posture) ? a.posture : 'hold';
            const weight = clampWeight(a.weight);

            for (const edge_id of region.edge_ids) {
                const seg = state.military.front_segments[edge_id];
                const isActive = seg && seg.active === true;
                if (!isActive) continue;

                if (edgeAssignments[edge_id] && typeof edgeAssignments[edge_id] === 'object') {
                    // explicit per-edge override wins
                    continue;
                }

                edgeAssignments[edge_id] = { edge_id, posture, weight };
                expanded += 1;
            }
        }
    }

    return { expanded_edges_count: expanded };
}

