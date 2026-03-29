/**
 * zone_detection.ts — Zone classification and corridor detection for v0.8 Corps Commander Intelligence.
 *
 * Partitions corps territory into zones using connected components from SpatialContext.
 * Each disconnected piece of corps territory is a separate zone. Computes corridor width,
 * population value, strategic value, posture, and garrison budgets.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random(), no Date.now().
 */

import type { FactionId, FormationId, FormationState, CorpsFrontSector } from '../../../state/game_state.js';
import type { SpatialContext } from '../../spatial_context.js';
import type { OsidEthnicComposition } from '../ethnic_defense.js';
import { getCoEthnicShare } from '../ethnic_defense.js';
import { strictCompare } from '../../../state/validateGameState.js';
import type { ZoneAssessment, ZoneId, ZonePosture } from './commander_state.js';
import { GARRISON_EDGES_PER_BRIGADE } from './allocate.js';

// ═══════════════════════════════════════════════════════════════════════════
// detectZones — partition corps territory into connected zones
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Partition corps territory into zones using connected components from SpatialContext.
 * Each disconnected piece of corps territory is a separate zone.
 */
export function detectZones(
    corpsId: FormationId,
    faction: FactionId,
    corpsBrigades: FormationState[],
    corpsOsids: string[],
    spatial: SpatialContext,
    sectors: CorpsFrontSector[],
    ethnicMap: OsidEthnicComposition | null,
): ZoneAssessment[] {
    // 1. Get connected component map for this faction
    const componentMap = spatial.componentsByFaction.get(faction);
    if (!componentMap) return [];

    const corpsOsidSet = new Set(corpsOsids);
    const allFriendlyOsids = spatial.friendlyOsidsByFaction.get(faction) ?? new Set<string>();

    // 2. Group corps OSIDs by component index
    const componentGroups = new Map<number, string[]>();
    for (const osid of [...corpsOsids].sort(strictCompare)) {
        const compIdx = componentMap.get(osid);
        if (compIdx === undefined) continue;
        let group = componentGroups.get(compIdx);
        if (!group) {
            group = [];
            componentGroups.set(compIdx, group);
        }
        group.push(osid);
    }

    // 3. Find the main body (largest group by OSID count)
    let mainBodyCompIdx = -1;
    let mainBodySize = 0;
    const sortedCompIndices = [...componentGroups.keys()].sort((a, b) => a - b);
    for (const compIdx of sortedCompIndices) {
        const size = componentGroups.get(compIdx)!.length;
        if (size > mainBodySize) {
            mainBodySize = size;
            mainBodyCompIdx = compIdx;
        }
    }

    // 4. Build zone assessments
    const zones: ZoneAssessment[] = [];

    for (const compIdx of sortedCompIndices) {
        const zoneOsids = componentGroups.get(compIdx)!;
        const zoneOsidSet = new Set(zoneOsids);
        const isMainBody = compIdx === mainBodyCompIdx;
        const zoneId = `zone:${corpsId}:${compIdx}` as ZoneId;

        // Count front edges overlapping this zone
        let frontEdgeCount = 0;
        const frontOsidsInZone = new Set<string>();
        for (const sector of sectors) {
            if (sector.corps_id !== corpsId) continue;
            for (const subSeg of sector.sub_segments) {
                // Check if sub-segment overlaps this zone
                let overlapCount = 0;
                for (const osid of subSeg.friendly_osids) {
                    if (zoneOsidSet.has(osid)) {
                        overlapCount++;
                        frontOsidsInZone.add(osid);
                    }
                }
                if (overlapCount > 0) {
                    frontEdgeCount += subSeg.length_edges;
                }
            }
        }

        // Compute depth via BFS from front OSIDs inward
        const depth = computeZoneDepth(frontOsidsInZone, zoneOsidSet, spatial);

        // Compute corridor width
        const corridorWidth = measureCorridorWidth(
            zoneOsidSet,
            allFriendlyOsids,
            spatial.adjacency as ReadonlyMap<string, readonly string[]>,
            isMainBody,
        );

        // Compute population value (sum of co-ethnic shares)
        let populationValue = 0;
        if (ethnicMap) {
            for (const osid of zoneOsids) {
                populationValue += getCoEthnicShare(osid, faction, ethnicMap);
            }
        }

        // Compute strategic value (connectivity-based)
        const strategicValue = computeStrategicValue(zoneOsidSet, spatial);

        // Identify brigades in this zone
        const assignedBrigadeIds: FormationId[] = [];
        for (const brig of [...corpsBrigades].sort((a, b) => strictCompare(a.id, b.id))) {
            if (brig.location_osid && zoneOsidSet.has(brig.location_osid)) {
                assignedBrigadeIds.push(brig.id);
            }
        }

        // Derive posture
        const posture = derivePosture(corridorWidth, frontEdgeCount, assignedBrigadeIds.length);

        // Compute garrison budget
        const edgesPerBrigade = getEdgesPerBrigade(posture);
        const garrisonBudget = frontEdgeCount > 0 ? Math.ceil(frontEdgeCount / edgesPerBrigade) : 0;

        // Commitment ratio
        const commitmentRatio = computeCommitmentRatio(frontEdgeCount, assignedBrigadeIds.length);

        // Surplus and deficit
        const surplus = Math.max(0, assignedBrigadeIds.length - garrisonBudget);
        const deficit = Math.max(0, garrisonBudget - assignedBrigadeIds.length);

        // Surplus brigade IDs (last N by sorted order — those beyond garrison budget)
        const surplusBrigades = surplus > 0 ? assignedBrigadeIds.slice(garrisonBudget) : [];

        zones.push({
            zone_id: zoneId,
            corps_id: corpsId,
            faction,
            osids: zoneOsids,
            front_edge_count: frontEdgeCount,
            depth,
            corridor_width: corridorWidth,
            population_value: populationValue,
            strategic_value: strategicValue,
            posture,
            commitment_ratio: commitmentRatio,
            garrison_budget: garrisonBudget,
            assigned_brigades: assignedBrigadeIds,
            surplus_brigades: surplusBrigades,
            deficit,
            is_main_body: isMainBody,
        });
    }

    return zones;
}

// ═══════════════════════════════════════════════════════════════════════════
// measureCorridorWidth — BFS corridor width detection
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BFS corridor width detection.
 * Measures the narrowest connection from a zone to the faction main body.
 * Width <= 1 OSID = besieged, = 2 pressured, >= 3 open.
 *
 * For main body: returns Infinity unless fully encircled (0 exits to friendly territory).
 * For non-main-body zones: counts boundary OSIDs that connect to friendly-but-not-in-zone OSIDs.
 * That count is the corridor width (narrowest cross-section at the zone boundary).
 */
export function measureCorridorWidth(
    zoneOsids: Set<string>,
    allFriendlyOsids: ReadonlySet<string>,
    adjacency: ReadonlyMap<string, readonly string[]>,
    isMainBody: boolean,
): number {
    if (isMainBody) {
        // Main body: check for full encirclement
        // Count zone boundary OSIDs that connect to friendly territory outside this zone
        let exitCount = 0;
        for (const osid of [...zoneOsids].sort(strictCompare)) {
            const neighbors = adjacency.get(osid);
            if (!neighbors) continue;
            for (const n of neighbors) {
                if (!zoneOsids.has(n) && allFriendlyOsids.has(n)) {
                    exitCount++;
                    break; // Count each OSID once
                }
            }
        }
        // Main body with exits to friendly territory is not encircled
        // Main body with no external friendly connections: could be the entire faction territory
        // (which is normal, not besieged) — only return 0 if zone is small subset
        // Since main body IS the largest component, return Infinity
        return Infinity;
    }

    // Non-main-body zone: count boundary OSIDs connecting to friendly-but-not-in-zone territory
    // This is the corridor width at the zone boundary
    let corridorWidth = 0;
    for (const osid of [...zoneOsids].sort(strictCompare)) {
        const neighbors = adjacency.get(osid);
        if (!neighbors) continue;
        for (const n of neighbors) {
            if (!zoneOsids.has(n) && allFriendlyOsids.has(n)) {
                corridorWidth++;
                break; // Count each zone boundary OSID with external-friendly access once
            }
        }
    }
    return corridorWidth;
}

// ═══════════════════════════════════════════════════════════════════════════
// computeCommitmentRatio
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute commitment ratio for a zone.
 * SRK example: 80 edges / 9 brigades = 8.9 = fully committed.
 */
export function computeCommitmentRatio(frontEdges: number, brigadeCount: number): number {
    if (brigadeCount <= 0) return frontEdges > 0 ? Infinity : 0;
    return frontEdges / brigadeCount;
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BFS depth from front OSIDs inward through the zone.
 * Returns the maximum BFS distance from any front OSID to the deepest interior OSID.
 */
function computeZoneDepth(
    frontOsids: Set<string>,
    zoneOsids: Set<string>,
    spatial: SpatialContext,
): number {
    if (frontOsids.size === 0) return 0;

    const visited = new Set<string>(frontOsids);
    let frontier = [...frontOsids].sort(strictCompare);
    let maxDepth = 0;

    while (frontier.length > 0) {
        const next: string[] = [];
        for (const osid of frontier) {
            const neighbors = spatial.adjacency.get(osid as string);
            if (!neighbors) continue;
            for (const n of neighbors) {
                if (!visited.has(n) && zoneOsids.has(n)) {
                    visited.add(n);
                    next.push(n);
                }
            }
        }
        if (next.length > 0) {
            maxDepth++;
            next.sort(strictCompare);
        }
        frontier = next;
    }

    return maxDepth;
}

/**
 * Compute strategic value from connectivity.
 * Higher connectivity = more strategically important (junction point, crossroads).
 * Counts OSIDs with >= 4 friendly neighbors (chokepoints/junctions) and uses
 * average connectivity as baseline.
 */
function computeStrategicValue(
    zoneOsids: Set<string>,
    spatial: SpatialContext,
): number {
    let totalConnections = 0;
    let chokepoints = 0;

    for (const osid of [...zoneOsids].sort(strictCompare)) {
        const neighbors = spatial.adjacency.get(osid as string);
        if (!neighbors) continue;
        let friendlyNeighborCount = 0;
        for (const n of neighbors) {
            if (zoneOsids.has(n)) friendlyNeighborCount++;
        }
        totalConnections += friendlyNeighborCount;
        if (friendlyNeighborCount >= 4) chokepoints++;
    }

    const avgConnectivity = zoneOsids.size > 0 ? totalConnections / zoneOsids.size : 0;
    // Strategic value: weighted sum of chokepoint density and average connectivity
    return chokepoints * 2 + avgConnectivity;
}

/**
 * Derive zone posture from corridor width, front edge count, and brigade count.
 */
function derivePosture(
    corridorWidth: number,
    frontEdgeCount: number,
    brigadeCount: number,
): ZonePosture {
    if (corridorWidth <= 1) return 'besieged';

    // Compute garrison budget for 'balanced' to determine surplus/deficit
    const balancedBudget = frontEdgeCount > 0
        ? Math.ceil(frontEdgeCount / GARRISON_EDGES_PER_BRIGADE.balanced)
        : 0;
    const surplus = brigadeCount - balancedBudget;

    if (surplus >= 3) return 'projecting';
    if (surplus < 0) return 'defending';
    return 'balanced';
}

/**
 * Get edges-per-brigade constant for a given posture.
 */
function getEdgesPerBrigade(posture: ZonePosture): number {
    return GARRISON_EDGES_PER_BRIGADE[posture];
}
