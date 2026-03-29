/**
 * Corps Front Sectors: partitions the hostile boundary into per-corps sectors.
 *
 * Each corps owns a contiguous slice of the OSID-level hostile boundary in its
 * area of responsibility. Multi-source BFS from corps HQ locations assigns each
 * friendly OSID to the nearest corps; front edges are then partitioned accordingly.
 *
 * GOLDEN RULES:
 *   1. Every active brigade MUST be assigned to a sector. No exceptions.
 *   2. Brigades at a sector MUST be at the frontline. Exception: one reserve
 *      brigade per sector sits 1 hop behind the front (recovery/reaction).
 *      Deep-rear brigades are kept assigned and march forward via interior movement.
 *
 * Derived each turn (Engine Invariants §13: no serialization of derived state).
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 *
 * This file is a thin orchestrator. Implementation lives in extracted modules:
 *   sector_utils.ts, sector_edge_adjacency.ts, sector_assertions.ts,
 *   sector_territory.ts, sector_building.ts, sector_splitting.ts,
 *   brigade_assignment.ts, commander_override.ts, subsegment_assignment.ts
 */

import type {
    CorpsFrontSector,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import type { OsidCentroidMap } from '../../data/operational_data_types.js';
import type { SpatialContext } from '../spatial_context.js';
import { buildOsidAdjacency, buildSharedBoundaryAdjacency, type Osid } from './osid_adjacency.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { getFormationCorpsId } from './corps_sector_partition.js';
import { strictCompare } from '../../state/validateGameState.js';
import { FRONT_EDGE_MAX_GAP } from '../../map/front_edges.js';
import {
    EXEMPT_CORPS_IDS,
    MIN_SECTOR_BRIGADES,
} from './corps_front_sectors_constants.js';
import { getCorpsArmyPriorities } from './bot_strategy.js';

// ── Imported from extracted modules ──────────────────────────────────────
import { buildFriendlyComponents, getSectorComponent, getCorpsForFaction, getFactions, isSectorColdFront } from './sector_utils.js';
import { assertBrigadeReachability, assertSectorBrigadesActive } from './sector_assertions.js';
import {
    mapOsidsToCorps,
    assignTerritoryVoronoi,
    repairDisconnectedTerritory,
    partitionFrontEdges,
    consolidateCrossCorpsFronts,
    consolidateIsolatedCorpsPockets,
} from './sector_territory.js';
import { buildMultiSectorsForCorps } from './sector_building.js';
import {
    classifyBrigadesByTerritory,
    assignCrossCorpsEnclaveDefenders,
    ensureMinimumSectorCoverage,
    reclassifyRearBrigades,
    deduplicateBrigadesAcrossSectors,
    recomputeSectorPowerAndThreat,
    syncSectorAssignmentsToFormations,
} from './brigade_assignment.js';
import {
    buildCorpsCommanderProfiles,
    commanderReviewAssignment,
} from './commander_override.js';

// ═══════════════════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build corps front sectors for all factions.
 * Requires operational edges and OSID front edges to be available.
 *
 * @param state - Current game state (must have war_front_edges_osid populated)
 * @param edges - Operational contact graph edges (for threshold-filtered adjacency maps not in SpatialContext)
 * @param reverseMap - operationalToCanonical map for getPoliticalControllerOSID
 * @param centroids - Optional OSID centroid map
 * @param spatial - SpatialContext providing adjacency, sharedBoundaryAdj, friendlyOsids, components
 */
export function buildCorpsFrontSectors(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: Map<string, string[]> | null,
    centroids?: OsidCentroidMap,
    spatial?: SpatialContext,
): Record<string, CorpsFrontSector> {
    const osidFrontEdges = state.military.war_front_edges_osid;
    if (!osidFrontEdges || osidFrontEdges.length === 0) return {};
    if (!edges || edges.length === 0) return {};

    // Use SpatialContext adjacency if available, otherwise build from edges (backward compat)
    const adjacency = (spatial?.adjacency as Map<Osid, Osid[]>) ?? buildOsidAdjacency(edges);
    // Shared-boundary-only adjacency for territory contiguity checks.
    // Territory must be connected through direct polygon contact — no distance-contact bridging.
    const sharedBoundaryAdj = (spatial?.sharedBoundaryAdjacency as Map<Osid, Osid[]>) ?? buildSharedBoundaryAdjacency(edges);
    // Front-edge-compatible adjacency: same threshold as FRONT_EDGE_MAX_GAP.
    const frontEdgeAdj = new Map<Osid, Osid[]>();
    for (const e of edges) {
        if (!e?.a || !e?.b) continue;
        if (e.min_dist !== undefined && e.min_dist > FRONT_EDGE_MAX_GAP) continue;
        const listA = frontEdgeAdj.get(e.a as Osid) ?? [];
        if (!listA.includes(e.b as Osid)) listA.push(e.b as Osid);
        frontEdgeAdj.set(e.a as Osid, listA);
        const listB = frontEdgeAdj.get(e.b as Osid) ?? [];
        if (!listB.includes(e.a as Osid)) listB.push(e.a as Osid);
        frontEdgeAdj.set(e.b as Osid, listB);
    }
    for (const list of frontEdgeAdj.values()) list.sort(strictCompare);
    // Strict shared-boundary adjacency (5.5m) for friendly-territory reachability.
    // Same as sharedBoundaryAdj — reuse the already-computed map.
    const strictAdj = sharedBoundaryAdj;
    // Intermediate adjacency (~16.6m) for Case B split threshold.
    const CASE_B_SPLIT_THRESHOLD = 0.00015; // ~16.6m
    const caseBSplitAdj = new Map<Osid, Osid[]>();
    for (const e of edges) {
        if (!e?.a || !e?.b) continue;
        if (e.min_dist !== undefined && e.min_dist > CASE_B_SPLIT_THRESHOLD) continue;
        const listA = caseBSplitAdj.get(e.a as Osid) ?? [];
        if (!listA.includes(e.b as Osid)) listA.push(e.b as Osid);
        caseBSplitAdj.set(e.a as Osid, listA);
        const listB = caseBSplitAdj.get(e.b as Osid) ?? [];
        if (!listB.includes(e.a as Osid)) listB.push(e.a as Osid);
        caseBSplitAdj.set(e.b as Osid, listB);
    }
    for (const list of caseBSplitAdj.values()) list.sort(strictCompare);
    const formations = state.military.formations ?? {};
    const factions = getFactions(state);
    const result: Record<string, CorpsFrontSector> = {};

    for (const faction of factions) {
        const factionSectors = buildFactionSectors(
            state, faction, osidFrontEdges, adjacency, sharedBoundaryAdj, strictAdj, caseBSplitAdj, formations, reverseMap, centroids, spatial
        );
        for (const sector of factionSectors) {
            result[sector.sector_id] = sector;
        }
    }

    // Post-processing: merge small adjacent sectors in the same corps that share
    // municipality territory. Prevents splitting two brigades defending the same
    // area into separate sectors (Brcko fix: 215th and 108th were in different
    // sectors, so reactive defense couldn't concentrate them).
    mergeSmallAdjacentSectors(result, adjacency);

    // Post-merge contiguity repair: mergeSmallAdjacentSectors unions territory sets
    // without verifying contiguity. Repair any disconnected territory that resulted.
    {
        const allSectors = Object.values(result);
        const allFriendly = new Set<string>();
        for (const s of allSectors) {
            for (const osid of s.territory_osids) allFriendly.add(osid);
        }
        repairDisconnectedTerritory(allSectors, sharedBoundaryAdj, allFriendly);
    }

    // Sync sector assignments back to formation.assignment
    syncSectorAssignmentsToFormations(result, formations);

    return result;
}

/** Maximum combined brigades for a merge candidate pair. */
const MERGE_MAX_COMBINED_BRIGADES = 6;
/** Maximum brigades in a single sector to be considered "small" for merging. */
const MERGE_SMALL_SECTOR_THRESHOLD = 3;

/**
 * Merge small adjacent sectors belonging to the same corps when they share
 * municipality territory. "Adjacent" means their territory_osids overlap in
 * at least one municipality, OR their friendly_osids are OSID-adjacent.
 */
function mergeSmallAdjacentSectors(
    sectors: Record<string, CorpsFrontSector>,
    adjacency: Map<Osid, Osid[]>,
): void {
    let merged = true;
    while (merged) {
        merged = false;
        const sectorIds = Object.keys(sectors).sort(strictCompare);
        for (let i = 0; i < sectorIds.length && !merged; i++) {
            const a = sectors[sectorIds[i]];
            if (!a) continue;
            if (a.assigned_brigade_ids.length > MERGE_SMALL_SECTOR_THRESHOLD) continue;
            if (a.assigned_brigade_ids.length === 0) continue; // don't merge empty sectors
            for (let j = i + 1; j < sectorIds.length && !merged; j++) {
                const b = sectors[sectorIds[j]];
                if (!b) continue;
                if (b.corps_id !== a.corps_id) continue;
                if (b.assigned_brigade_ids.length > MERGE_SMALL_SECTOR_THRESHOLD) continue;
                if (b.assigned_brigade_ids.length === 0) continue; // don't merge empty sectors
                if (a.assigned_brigade_ids.length + b.assigned_brigade_ids.length > MERGE_MAX_COMBINED_BRIGADES) continue;

                // Check adjacency: do any territory OSIDs share an OSID neighbor?
                if (!areSectorsTerritoryAdjacent(a, b, adjacency)) continue;

                // Merge b into a
                a.edge_ids = [...new Set([...a.edge_ids, ...b.edge_ids])].sort(strictCompare);
                a.territory_osids = [...new Set([...a.territory_osids, ...b.territory_osids])].sort(strictCompare);
                a.assigned_brigade_ids = [...new Set([...a.assigned_brigade_ids, ...b.assigned_brigade_ids])].sort(strictCompare);
                a.reserve_brigade_ids = [...new Set([...a.reserve_brigade_ids, ...b.reserve_brigade_ids])].sort(strictCompare);
                a.opposing_factions = [...new Set([...a.opposing_factions, ...b.opposing_factions])].sort(strictCompare);
                a.length_edges = a.edge_ids.length;
                a.density = a.length_edges > 0 ? a.assigned_brigade_ids.length / a.length_edges : 0;

                // Merge sub-segments
                a.sub_segments = [...a.sub_segments, ...b.sub_segments];

                // Remove b
                delete sectors[sectorIds[j]];
                merged = true;
            }
        }
    }
}

function areSectorsTerritoryAdjacent(
    a: CorpsFrontSector,
    b: CorpsFrontSector,
    adjacency: Map<Osid, Osid[]>,
): boolean {
    const bTerrSet = new Set(b.territory_osids);
    for (const osid of a.territory_osids) {
        const neighbors = adjacency.get(osid as Osid) ?? [];
        for (const n of neighbors) {
            if (bTerrSet.has(n)) return true;
        }
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// Per-Faction Sector Building
// ═══════════════════════════════════════════════════════════════════════════

function buildFactionSectors(
    state: GameState,
    faction: FactionId,
    osidFrontEdges: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    adjacency: Map<Osid, Osid[]>,
    sharedBoundaryAdj: Map<Osid, Osid[]>,
    strictAdj: Map<Osid, Osid[]>,
    caseBSplitAdj: Map<Osid, Osid[]>,
    formations: Record<FormationId, FormationState>,
    reverseMap: Map<string, string[]> | null,
    centroids?: OsidCentroidMap,
    spatial?: SpatialContext,
): CorpsFrontSector[] {
    // Step 1: Find corps for this faction
    const corpsIds = getCorpsForFaction(formations, faction);
    if (corpsIds.length === 0) return [];

    // Step 2: Map OSIDs to corps via multi-source BFS
    const osidToCorps = mapOsidsToCorps(
        state, faction, corpsIds, adjacency, formations, reverseMap
    );

    // Step 3: Partition front edges to corps
    const corpsEdges = partitionFrontEdges(
        osidFrontEdges, faction, osidToCorps, state, reverseMap, corpsIds, adjacency
    );
    // Step 3b: Consolidate cross-corps front splits.
    consolidateCrossCorpsFronts(corpsEdges, osidFrontEdges, faction, adjacency, formations, osidToCorps, centroids, sharedBoundaryAdj);
    // Step 3c: Consolidate isolated corps pockets.
    consolidateIsolatedCorpsPockets(corpsEdges, osidFrontEdges, faction, adjacency, formations, centroids, sharedBoundaryAdj);

    // Pre-compute friendly OSIDs once for territory, brigade assignment, and contiguity checks.
    // Use SpatialContext if available; otherwise build from political_controllers (backward compat).
    let friendlyOsids: Set<string>;
    if (spatial) {
        const spatialFriendly = spatial.friendlyOsidsByFaction.get(faction);
        friendlyOsids = spatialFriendly ? new Set(spatialFriendly) : new Set<string>();
    } else {
        friendlyOsids = new Set<string>();
        for (const osid of adjacency.keys()) {
            const ctrl = getPoliticalControllerOSID(state, osid, reverseMap ?? undefined);
            if (ctrl === faction) friendlyOsids.add(osid);
        }
        const pc = state.political.political_controllers ?? {};
        for (const [osid, ctrl] of Object.entries(pc)) {
            if (ctrl === faction) friendlyOsids.add(osid);
        }
    }

    // Pre-compute friendly connected components for staffability check (FIX 1).
    // A sector is "unstaffable" if no brigade from its corps exists in the same
    // friendly connected component — meaning no unit can physically reach it.
    // Use SpatialContext if available; otherwise build from adjacency + friendlyOsids.
    const preComponentOf = ((spatial?.componentsByFaction.get(faction)) ?? buildFriendlyComponents(adjacency, friendlyOsids)) as Map<string, number>;

    // Step 4: Build multi-sectors (sub-segments promoted to independent sectors)
    const sectors: CorpsFrontSector[] = [];
    for (const corpsId of corpsIds) {
        if (EXEMPT_CORPS_IDS.has(corpsId)) continue;
        const edgeIds = corpsEdges.get(corpsId);
        if (!edgeIds || edgeIds.length === 0) continue;

        // Collect component IDs where this corps has at least one brigade.
        const corpsBrigadeComponents = new Set<number>();
        for (const fid of Object.keys(formations).sort(strictCompare)) {
            const f = formations[fid];
            if (!f || f.faction !== faction || f.status !== 'active') continue;
            if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
            if (getFormationCorpsId(f) !== corpsId) continue;
            if (!f.location_osid) continue;
            const comp = preComponentOf.get(f.location_osid);
            if (comp !== undefined) corpsBrigadeComponents.add(comp);
        }

        const corpsMultiSectors = buildMultiSectorsForCorps(
            state, corpsId, faction, edgeIds, osidFrontEdges,
            adjacency, sharedBoundaryAdj, strictAdj, caseBSplitAdj, formations, reverseMap, centroids, friendlyOsids
        );
        for (const sector of corpsMultiSectors) {
            // FIX 1: Skip unstaffable sectors — no corps brigade in same component.
            const sectorComp = getSectorComponent(sector, preComponentOf);
            if (sectorComp !== -1 && !corpsBrigadeComponents.has(sectorComp)) continue;
            sectors.push(sector);
        }
    }

    // NOTE: Cold-front sector suppression was attempted here but reverted.
    // Removing even tiny cold-front sectors changes Territory Voronoi (Step 5),
    // cascading into different brigade distribution and combat outcomes globally.
    // The ghost sector sanitizer (sanitize-ghost-sector-power pipeline step)
    // already zeros stats for empty sectors — that's sufficient.

    // Step 4d: Merge undersized corps sectors when brigade/sector ratio < MIN_SECTOR_BRIGADES.
    // Herzegovina Corps with 8 brigades and 5 sectors (1.6 brig/sector) creates empty sectors.
    // Merge the smallest adjacent pair until the ratio is met or no adjacent merges remain.
    {
        const corpsIdSet = new Set(sectors.map(s => s.corps_id));
        for (const cid of [...corpsIdSet].sort(strictCompare)) {
            // Count active brigades for this corps
            let corpsBrigadeCount = 0;
            for (const fid of Object.keys(formations).sort(strictCompare)) {
                const f = formations[fid];
                if (!f || f.faction !== faction || f.status !== 'active') continue;
                if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
                if (getFormationCorpsId(f) !== cid) continue;
                corpsBrigadeCount++;
            }

            // Iteratively merge the smallest adjacent sector pair until ratio is met
            let changed = true;
            while (changed) {
                changed = false;
                const corpsSectors = sectors.filter(s => s.corps_id === cid);
                if (corpsSectors.length <= 1) break;
                if (corpsBrigadeCount / corpsSectors.length >= MIN_SECTOR_BRIGADES) break;

                // Find the smallest sector (by edge count, ties broken by ID)
                let smallestIdx = -1;
                let smallestSize = Infinity;
                for (let i = 0; i < corpsSectors.length; i++) {
                    const s = corpsSectors[i]!;
                    if (s.length_edges < smallestSize ||
                        (s.length_edges === smallestSize && smallestIdx >= 0 &&
                            strictCompare(s.sector_id, corpsSectors[smallestIdx]!.sector_id) < 0)) {
                        smallestSize = s.length_edges;
                        smallestIdx = i;
                    }
                }
                if (smallestIdx === -1) break;

                const target = corpsSectors[smallestIdx]!;
                // Find the smallest adjacent neighbor
                let bestNeighborIdx = -1;
                let bestNeighborSize = Infinity;
                for (let i = 0; i < corpsSectors.length; i++) {
                    if (i === smallestIdx) continue;
                    const candidate = corpsSectors[i]!;
                    if (!areSectorsTerritoryAdjacent(target, candidate, adjacency)) continue;
                    if (candidate.length_edges < bestNeighborSize ||
                        (candidate.length_edges === bestNeighborSize && bestNeighborIdx >= 0 &&
                            strictCompare(candidate.sector_id, corpsSectors[bestNeighborIdx]!.sector_id) < 0)) {
                        bestNeighborSize = candidate.length_edges;
                        bestNeighborIdx = i;
                    }
                }
                if (bestNeighborIdx === -1) break; // No adjacent neighbor — can't merge further

                // Merge target into neighbor (in the main sectors array)
                const neighbor = corpsSectors[bestNeighborIdx]!;
                const mergedIdx = sectors.indexOf(neighbor);
                const targetMainIdx = sectors.indexOf(target);
                if (mergedIdx === -1 || targetMainIdx === -1) break;

                // Merge in-place (following mergeSmallAdjacentSectors pattern)
                neighbor.edge_ids = [...new Set([...neighbor.edge_ids, ...target.edge_ids])].sort(strictCompare);
                neighbor.territory_osids = [...new Set([...neighbor.territory_osids, ...target.territory_osids])].sort(strictCompare);
                neighbor.assigned_brigade_ids = [...new Set([...neighbor.assigned_brigade_ids, ...target.assigned_brigade_ids])].sort(strictCompare);
                neighbor.reserve_brigade_ids = [...new Set([...neighbor.reserve_brigade_ids, ...target.reserve_brigade_ids])].sort(strictCompare);
                neighbor.opposing_factions = [...new Set([...neighbor.opposing_factions, ...target.opposing_factions])].sort(strictCompare);
                neighbor.length_edges = neighbor.edge_ids.length;
                neighbor.sub_segments = [...neighbor.sub_segments, ...target.sub_segments];

                // Remove the target sector
                sectors.splice(targetMainIdx, 1);
                changed = true;
            }
        }
    }

    // Step 5: Territory Voronoi — BFS from Front Edges into Depth
    assignTerritoryVoronoi(sectors, adjacency, friendlyOsids, osidToCorps);

    // Step 5b: Repair disconnected territory — Voronoi BFS can assign non-contiguous
    // OSIDs to a sector when front edges are separated. BFS through each sector's
    // territory, keep the largest connected component, reassign orphans to adjacent sectors.
    repairDisconnectedTerritory(sectors, sharedBoundaryAdj, friendlyOsids);

    // Pre-compute friendly territory connected components (used by steps 6 and 7).
    // Use SpatialContext if available; otherwise build from adjacency + friendlyOsids.
    const componentOf = ((spatial?.componentsByFaction.get(faction)) ?? buildFriendlyComponents(adjacency, friendlyOsids)) as Map<string, number>;

    // Step 6: Classify brigades — corps-driven assignment.
    const commanderProfiles = buildCorpsCommanderProfiles(state, sectors);
    const playerOverrides = state.military.brigade_sector_override;
    classifyBrigadesByTerritory(sectors, faction, formations, adjacency, friendlyOsids, componentOf, commanderProfiles, playerOverrides, state);

    // Step 6b: Cross-corps enclave defense
    assignCrossCorpsEnclaveDefenders(sectors, formations, faction, componentOf);

    // Step 7: Ensure every sector with front edges has at least one assigned brigade.
    ensureMinimumSectorCoverage(sectors, formations, adjacency, friendlyOsids, componentOf);

    // Step 8: Reclassify brigades by frontline proximity.
    reclassifyRearBrigades(sectors, formations, adjacency, friendlyOsids);

    // Step 8a: Commander reviews mechanical assignment and issues overrides.
    {
        const uniqueCorps = [...new Set(sectors.map(s => s.corps_id))].sort();
        for (const cid of uniqueCorps) {
            const profile = commanderProfiles.get(cid);
            if (!profile) continue;
            const priorities = getCorpsArmyPriorities(faction, cid, state.meta.turn);
            // Build op participants set — never reassign brigades mid-operation
            const opParticipants = new Set<string>();
            const cmd = state.military.corps_command?.[cid];
            if (cmd?.active_operations) {
                for (const op of cmd.active_operations) {
                    for (const bid of op.participating_brigades) {
                        opParticipants.add(bid);
                    }
                }
            }
            commanderReviewAssignment(
                cid, sectors, formations, priorities, profile,
                componentOf, adjacency, friendlyOsids, opParticipants,
            );
        }
    }

    // Step 8b: Deduplicate
    deduplicateBrigadesAcrossSectors(sectors);

    // Step 8c: Recompute defensive_power and threat_ratio from final brigade sets.
    recomputeSectorPowerAndThreat(sectors, formations, faction);

    // Final prune: remove ghost artifact sectors
    const pruned = sectors.filter(s => {
        if (s.length_edges === 0) return false;
        if (s.territory_osids.length === 0
            && s.assigned_brigade_ids.length === 0
            && s.reserve_brigade_ids.length === 0) return false;
        return true;
    });
    pruned.sort((a, b) => strictCompare(a.sector_id, b.sector_id));

    // ── INVARIANT assertions ──
    assertBrigadeReachability(pruned, formations, componentOf);
    assertSectorBrigadesActive(pruned, formations);

    return pruned;
}

// ═══════════════════════════════════════════════════════════════════════════
// Re-exports for backward compatibility
// All consumers import from this file; extracted modules are internal.
// ═══════════════════════════════════════════════════════════════════════════

// sector_utils.ts
export {
    buildFriendlyComponents,
    getSectorComponent,
    getSectorFrontOsids,
    findSectorForEnemyOsid,
    getCorpsHqOsid,
    bfsToNearestSector,
    bfsDistance,
    getCorpsForFaction,
    getFactions,
    REASSIGNMENT_ENTRENCHMENT_RETAIN,
    isSectorColdFront,
} from './sector_utils.js';

// sector_edge_adjacency.ts
export {
    buildEdgeAdjacency,
    buildEdgeAdjacencyStrictCaseB,
    isSegmentAdjacent,
    isCaseBBridge,
    isOsidAdjacent,
} from './sector_edge_adjacency.js';

// sector_assertions.ts
export {
    assertSectorBrigadesActive,
    filterReachableReassignmentOrders,
} from './sector_assertions.js';

// sector_territory.ts
export {
    mapOsidsToCorps,
    assignTerritoryVoronoi,
    repairDisconnectedTerritory,
    partitionFrontEdges,
    bfsNearestClaimedCorps,
    findSubordinateOsid,
    consolidateCrossCorpsFronts,
    consolidateIsolatedCorpsPockets,
    isEdgeProtectedFromReassignment,
} from './sector_territory.js';

// sector_building.ts
export {
    buildMultiSectorsForCorps,
    findSubSegments,
    buildSectorFromSubSegments,
    splitOversizedSubSegments,
    decomposeIntoConnectedComponents,
    splitSubSegmentAtMidpoint,
    walkEdgeChain,
    buildSubSegmentFromEdges,
} from './sector_building.js';

// sector_splitting.ts
export {
    splitNonContiguousSectors,
    mergeUndersizedSubSegments,
    mergeUndersizedSectors,
    mergeSubSegmentsInto,
    areSectorsEdgeAdjacent,
    mergeSectors,
} from './sector_splitting.js';

// brigade_assignment.ts
export {
    classifyBrigadesByTerritory,
    assignCrossCorpsEnclaveDefenders,
    reclassifyRearBrigades,
    ensureMinimumSectorCoverage,
    deduplicateBrigadesAcrossSectors,
    recomputeSectorPowerAndThreat,
    syncSectorAssignmentsToFormations,
} from './brigade_assignment.js';

// commander_override.ts
export {
    type CorpsCommanderProfile,
    type CommanderOverride,
    commanderReviewAssignment,
    buildCorpsCommanderProfiles,
} from './commander_override.js';

// Re-export constants that were previously exported from this file
export { GARRISON_BUDGET_EDGES_PER_BRIGADE } from './corps_front_sectors_constants.js';

// subsegment_assignment.ts
export {
    assignBrigadesToSubSegments,
    mergeGapSubSegments,
    findSubSegmentForOsid,
} from './subsegment_assignment.js';

// Re-export constants from corps_front_sectors_constants.ts
export { MIN_SECTOR_EDGES } from './corps_front_sectors_constants.js';
export { MAX_SECTOR_EDGES } from './corps_front_sectors_constants.js';
export { MAX_SECTOR_BRIGADES } from './corps_front_sectors_constants.js';
export { MAX_RESERVES_PER_SECTOR } from './corps_front_sectors_constants.js';
