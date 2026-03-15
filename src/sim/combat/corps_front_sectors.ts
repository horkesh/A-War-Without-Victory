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
 */

import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { computeLocalFrontDefensivePower } from './local_front_defense.js';
import { getFormationCorpsId } from './corps_sector_partition.js';
import { buildOsidAdjacency, buildSharedBoundaryAdjacency, munFromOsid, type Osid } from './osid_adjacency.js';
import type { OsidCentroidMap } from '../../data/operational_data_types.js';
import { FRONT_EDGE_MAX_GAP } from '../../map/front_edges.js';

import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import { findConnectedComponents } from '../../utils/graph.js';
import {
    COMMANDER_COMPETENCE_ASSIGNMENT_THRESHOLD,
    EXEMPT_CORPS_IDS,
    MAX_SECTOR_BRIGADES,
    MAX_SECTOR_EDGES,
    MIN_SECTOR_EDGES,
    PHASE_2C_MAX_HOPS,
    PRE_OP_STAGING_WEIGHT_INTEL,
    PRE_OP_STAGING_WEIGHT_STAGING,
} from './corps_front_sectors_constants.js';
import { getCorpsCommander } from './officer_system.js';

// ═══════════════════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build corps front sectors for all factions.
 * Requires operational edges and OSID front edges to be available.
 *
 * @param state - Current game state (must have war_front_edges_osid populated)
 * @param edges - Operational contact graph edges (for OSID adjacency)
 * @param reverseMap - operationalToCanonical map for getPoliticalControllerOSID
 */
export function buildCorpsFrontSectors(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: Map<string, string[]> | null,
    centroids?: OsidCentroidMap,
): Record<string, CorpsFrontSector> {
    const osidFrontEdges = state.military.war_front_edges_osid;
    if (!osidFrontEdges || osidFrontEdges.length === 0) return {};
    if (!edges || edges.length === 0) return {};

    const adjacency = buildOsidAdjacency(edges);
    // Front-edge-compatible adjacency: same threshold as FRONT_EDGE_MAX_GAP.
    // Stricter than full adjacency (excludes >33m gaps that create phantom bridges)
    // but wider than SHARED_BOUNDARY_THRESHOLD (5.5m) to include legitimate
    // 6-30m polygon gaps at triple junctions.
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
    // Used in splitNonContiguousSectors to detect sectors whose friendly OSIDs are
    // separated by enemy territory (connected only via GIS near-miss polygon contacts).
    const strictAdj = buildSharedBoundaryAdjacency(edges);
    // Intermediate adjacency (~16.6m) for Case B split threshold.
    // Case B connects front edges sharing the same hostile OSID. At 5.5m (strictAdj),
    // too many legitimate Case B connections are cut (34 extra sectors). At 33m
    // (FRONT_EDGE_MAX_GAP), problematic pocket-bridging connections pass through.
    // Natural gap in Case B distance distribution: 15.5m → 24.6m (zero connections).
    // 16.6m catches all legitimate triple junctions while cutting pocket bridges.
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
            state, faction, osidFrontEdges, adjacency, frontEdgeAdj, strictAdj, caseBSplitAdj, formations, reverseMap, centroids
        );
        for (const sector of factionSectors) {
            result[sector.sector_id] = sector;
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Per-Faction Sector Building
// Pipeline steps: 1) mapOsidsToCorps (BFS), 2) partitionFrontEdges,
// 3) consolidateCrossCorpsFronts, 4) buildMultiSectorsForCorps, 5) assignTerritoryVoronoi,
// 6) classifyBrigades (frontline by position + corps distributes rest by need),
// 7) ensureMinimumSectorCoverage, 8) reclassifyRearBrigades, 9) prune empty sectors.
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
    // When a contiguous front (connected component of edges via friendly-OSID
    // adjacency) is split across multiple corps by the BFS Voronoi boundary,
    // reassign the minority edges to the majority corps. Prevents pockets and
    // border settlements from being split between distant corps.
    // Brigade-locked edges (where a brigade of that corps is stationed) are protected.
    consolidateCrossCorpsFronts(corpsEdges, osidFrontEdges, faction, adjacency, formations, osidToCorps, centroids);
    // Step 3c: Consolidate isolated corps pockets.
    // After 3b, a corps may still have disconnected edge components (isolated
    // pockets protected by brigade presence). Reassign isolated pocket edges to
    // the neighboring majority corps — a single brigade shouldn't keep an
    // isolated pocket as a separate corps sector when surrounded by another corps.
    consolidateIsolatedCorpsPockets(corpsEdges, osidFrontEdges, faction, adjacency, formations, centroids);

    // Pre-compute friendly OSIDs once for territory, brigade assignment, and contiguity checks.
    const friendlyOsids = new Set<string>();
    for (const osid of adjacency.keys()) {
        const ctrl = getPoliticalControllerOSID(state, osid, reverseMap ?? undefined);
        if (ctrl === faction) friendlyOsids.add(osid);
    }
    // Also include political_controllers entries not in adjacency graph (interior OSIDs).
    const pc = state.political.political_controllers ?? {};
    for (const [osid, ctrl] of Object.entries(pc)) {
        if (ctrl === faction) friendlyOsids.add(osid);
    }

    // Step 4: Build multi-sectors (sub-segments promoted to independent sectors)
    // Skip exempt corps entirely — they have no front and shouldn't produce sectors.
    const sectors: CorpsFrontSector[] = [];
    for (const corpsId of corpsIds) {
        if (EXEMPT_CORPS_IDS.has(corpsId)) continue;
        const edgeIds = corpsEdges.get(corpsId);
        if (!edgeIds || edgeIds.length === 0) continue;

        const corpsMultiSectors = buildMultiSectorsForCorps(
            state, corpsId, faction, edgeIds, osidFrontEdges,
            adjacency, sharedBoundaryAdj, strictAdj, caseBSplitAdj, formations, reverseMap, centroids, friendlyOsids
        );
        for (const sector of corpsMultiSectors) {
            sectors.push(sector);
        }
    }

    // Step 5: Territory Voronoi — BFS from each sector's front-edge OSIDs
    // backward through friendly territory. Each friendly OSID is assigned to
    // the nearest sector (by hop count). Corps boundaries are respected:
    // each sector's BFS can only claim OSIDs assigned to its corps.
    assignTerritoryVoronoi(sectors, adjacency, friendlyOsids, osidToCorps);

    // Pre-compute friendly territory connected components (used by steps 6 and 7).
    const componentOf = buildFriendlyComponents(adjacency, friendlyOsids);

    // Step 6: Classify brigades — corps-driven assignment.
    // Phase 1: Frontline brigades assigned by position (you defend where you stand).
    // Phase 2: Corps pools remaining brigades, distributes to sectors by need
    //          (proportional to front edge count, shaped by commander personality).
    // Player override (brigade_sector_override) pins brigades before Phase 1/2 runs.
    // General staff units are exempt.
    const commanderProfiles = buildCorpsCommanderProfiles(state, sectors);
    const playerOverrides = state.military.brigade_sector_override;
    classifyBrigadesByTerritory(sectors, faction, formations, adjacency, friendlyOsids, componentOf, commanderProfiles, playerOverrides);

    // Step 6b: Cross-corps enclave defense — brigades defend where they stand.
    // After corps-strict assignment, some brigades remain unassigned because their
    // location's front edges belong to a different corps's sector (e.g. HVO 111th at
    // Žepče — hvo_central_bosnia corps, but Žepče sector is hvo_northwest_bosnia).
    // A brigade physically present at a front defends it regardless of corps org chart.
    assignCrossCorpsEnclaveDefenders(sectors, formations, faction);

    // Step 7: Ensure every sector with front edges has at least one assigned brigade.
    // Transfer from adjacent surplus sectors only (geographic contiguity enforced).
    ensureMinimumSectorCoverage(sectors, formations, adjacency, friendlyOsids, componentOf);

    // Step 8: Reclassify brigades by frontline proximity.
    // Front → assigned, 1-hop → reserve (cap 1), deeper → stays assigned (marches forward).
    // GOLDEN RULE: no brigade is ever dropped from its sector.
    reclassifyRearBrigades(sectors, formations, adjacency, friendlyOsids);

    // Step 8b: Deduplicate — steps 6b/7/8 can produce cross-sector duplicates
    // when shared front OSIDs or coverage transfers create overlapping claims.
    deduplicateBrigadesAcrossSectors(sectors);

    // Step 8c: Recompute defensive_power and threat_ratio from final brigade sets.
    // Must run AFTER all assignment steps so sectors rescued by ensureMinimumSectorCoverage
    // (0→1 brigade) show non-zero dp/threat_ratio instead of stale zeros.
    recomputeSectorPowerAndThreat(sectors, formations, faction);

    // Final prune: remove sectors that are ghost artifacts:
    //  - 0 front edges (no enemy contact)
    //  - 0 territory AND 0 assigned/reserve brigades (isolated pocket with nobody home)
    const pruned = sectors.filter(s => {
        if (s.length_edges === 0) return false;
        if (s.territory_osids.length === 0
            && s.assigned_brigade_ids.length === 0
            && s.reserve_brigade_ids.length === 0) return false;
        return true;
    });
    pruned.sort((a, b) => strictCompare(a.sector_id, b.sector_id));

    // ── INVARIANT: every assigned brigade must be reachable from its sector ──
    // This assertion catches ALL paths that assign brigades to sectors
    // (Phase 1 positional, Phase 2 pool, ensureMinimumSectorCoverage,
    // deduplication, reclassification). If a new path is added that violates
    // connected component boundaries, this catches it immediately.
    assertBrigadeReachability(pruned, formations, componentOf);
    assertSectorBrigadesActive(pruned, formations);

    return pruned;
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 5: Territory Voronoi — BFS from Front Edges into Depth
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Multi-source BFS from each sector's front-edge friendly_osids backward
 * through friendly territory. Each friendly OSID is assigned to the nearest
 * sector (by hop count). First-claim wins; sectors processed in sorted order.
 *
 * Corps boundaries are respected: each sector's BFS can only claim OSIDs
 * that mapOsidsToCorps assigned to the same corps (or unclaimed OSIDs).
 *
 * Sets each sector's `territory_osids` to the sorted list of claimed OSIDs.
 * Deterministic: sorted sector order, sorted neighbor iteration.
 */
function assignTerritoryVoronoi(
    sectors: CorpsFrontSector[],
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    osidToCorps?: Map<Osid, FormationId>
): void {
    if (sectors.length === 0) return;

    // Track which sectors each OSID belongs to.
    // Front-edge OSIDs can be shared across multiple sectors (a settlement
    // at the junction of two front lines supports both). Rear territory
    // uses exclusive first-claim via BFS.
    const claimed = new Map<string, number>();          // BFS exclusive claim
    const sharedClaims = new Map<string, number[]>();   // front-edge multi-claim

    // Collect front-edge OSIDs for each sector. An OSID that appears on
    // multiple sectors' front edges belongs to ALL of them.
    const sortedIndices = sectors.map((_, i) => i);
    sortedIndices.sort((a, b) => strictCompare(sectors[a]!.sector_id, sectors[b]!.sector_id));

    for (const si of sortedIndices) {
        const sector = sectors[si]!;
        const seedOsids = new Set<string>();
        for (const ss of sector.sub_segments) {
            for (const o of ss.friendly_osids) seedOsids.add(o);
        }
        for (const osid of [...seedOsids].sort(strictCompare)) {
            if (!friendlyOsids.has(osid)) continue;
            const existing = sharedClaims.get(osid);
            if (existing) {
                existing.push(si);
            } else {
                sharedClaims.set(osid, [si]);
            }
        }
    }

    // Seed BFS from all front-edge OSIDs. Each OSID's BFS expansion
    // is driven by its FIRST claiming sector (exclusive for rear territory).
    type BfsEntry = { osid: string; sectorIdx: number };
    const queue: BfsEntry[] = [];
    for (const [osid, sectorIndices] of [...sharedClaims.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        // First sector index drives BFS expansion into rear territory
        claimed.set(osid, sectorIndices[0]!);
        queue.push({ osid, sectorIdx: sectorIndices[0]! });
    }

    // Multi-source BFS through friendly territory.
    // Corps boundary enforcement: each sector can only claim OSIDs that
    // mapOsidsToCorps assigned to its corps (or OSIDs not in the map at all).
    // No territory cap — every friendly OSID must belong to a sector.
    let head = 0;
    while (head < queue.length) {
        const { osid, sectorIdx } = queue[head++]!;
        const sectorCorps = sectors[sectorIdx]!.corps_id;
        const neighbors = adjacency.get(osid) ?? [];
        for (const n of neighbors) {
            if (claimed.has(n)) continue;
            if (!friendlyOsids.has(n)) continue;
            // Respect corps boundaries: don't claim OSIDs owned by another corps
            if (osidToCorps) {
                const ownerCorps = osidToCorps.get(n as Osid);
                if (ownerCorps && ownerCorps !== sectorCorps) continue;
            }
            // No territory cap — every friendly OSID must belong to a sector.
            // GOLDEN RULE: Every brigade must be in a sector. To achieve this,
            // every friendly OSID must be claimed so brigade classification never
            // falls through.
            claimed.set(n, sectorIdx);
            queue.push({ osid: n, sectorIdx });
        }
    }

    // Post-Voronoi sweep: claim any unclaimed friendly OSIDs that BFS missed.
    // These are interior OSIDs not reachable from front edges because all paths
    // to them went through territory belonging to a different corps. Assign them
    // to the nearest sector (by hop count through friendly territory, ignoring
    // corps boundaries) so they get sector-pooled defense.
    const unclaimed: string[] = [];
    for (const osid of friendlyOsids) {
        if (!claimed.has(osid)) unclaimed.push(osid);
    }
    if (unclaimed.length > 0) {
        // Build reverse lookup: claimed OSID → sector index (already in `claimed`)
        // BFS from each unclaimed OSID to find nearest claimed OSID
        unclaimed.sort(strictCompare);
        for (const orphan of unclaimed) {
            const visited = new Set<string>([orphan]);
            let frontier = [orphan];
            let found = false;
            for (let hop = 0; hop < 20 && !found; hop++) {
                const next: string[] = [];
                for (const curr of frontier) {
                    const neighbors = adjacency.get(curr as Osid) ?? [];
                    for (const n of neighbors) {
                        if (visited.has(n)) continue;
                        visited.add(n);
                        if (claimed.has(n)) {
                            // Assign orphan to the same sector as this neighbor
                            const sIdx = claimed.get(n)!;
                            // No territory cap — claim orphan unconditionally.
                            claimed.set(orphan, sIdx);
                            found = true;
                            break;
                        }
                        if (friendlyOsids.has(n)) next.push(n);
                    }
                    if (found) break;
                }
                frontier = next;
            }
        }
    }

    // Assign territory_osids to each sector.
    // Front-edge OSIDs that appear in multiple sectors are included in ALL
    // of those sectors' territory (shared front-edge territory). Rear OSIDs
    // from the exclusive BFS go to their single claiming sector.
    const perSector: Set<string>[] = sectors.map(() => new Set<string>());
    // 1. BFS-claimed (exclusive rear territory)
    for (const [osid, sectorIdx] of claimed) {
        perSector[sectorIdx]!.add(osid);
    }
    // 2. Shared front-edge OSIDs → all claiming sectors
    for (const [osid, sectorIndices] of sharedClaims) {
        for (const si of sectorIndices) {
            perSector[si]!.add(osid);
        }
    }
    for (let i = 0; i < sectors.length; i++) {
        sectors[i]!.territory_osids = [...perSector[i]!].sort(strictCompare);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Friendly Territory Connected Components
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Partition friendly OSIDs into connected components via BFS.
 * Returns a map from OSID → component index (0-based).
 * Delegates to the generic findConnectedComponents() utility.
 */
export function buildFriendlyComponents(
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
): Map<string, number> {
    const components = findConnectedComponents(
        friendlyOsids,
        osid => (adjacency.get(osid as Osid) ?? []).filter(n => friendlyOsids.has(n)),
    );
    const componentOf = new Map<string, number>();
    for (let i = 0; i < components.length; i++) {
        for (const osid of components[i]!) componentOf.set(osid, i);
    }
    return componentOf;
}

/**
 * Get the component ID for a sector (from its first territory OSID or friendly front OSID).
 * Returns -1 if sector has no OSIDs in the component map.
 */
export function getSectorComponent(sector: CorpsFrontSector, componentOf: Map<string, number>): number {
    for (const osid of sector.territory_osids) {
        const c = componentOf.get(osid);
        if (c !== undefined) return c;
    }
    for (const ss of sector.sub_segments) {
        for (const o of ss.friendly_osids) {
            const c = componentOf.get(o);
            if (c !== undefined) return c;
        }
    }
    return -1;
}

// ═══════════════════════════════════════════════════════════════════════════
// Reachability Invariant Assertion
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assert that every assigned/reserve brigade can physically reach its sector
 * through contiguous friendly territory (same connected component).
 *
 * This is the SINGLE enforcement point for the reachability invariant.
 * All assignment paths (Phase 1 positional, Phase 2 pool, coverage transfers,
 * deduplication, reclassification) flow through the sector pipeline and hit
 * this assertion before sectors are returned to consumers.
 *
 * Logs violations as console.error. Sectors remain usable — the brigade
 * just can't physically reach its sector, which downstream guards
 * (filterReachableReassignmentOrders) will catch for march orders.
 */
function assertBrigadeReachability(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    componentOf: Map<string, number>,
): void {
    const violations: string[] = [];
    for (const sec of sectors) {
        const secComp = getSectorComponent(sec, componentOf);
        if (secComp === -1) continue; // sector has no mapped OSIDs — skip
        const allBids = [
            ...sec.assigned_brigade_ids,
            ...(sec.reserve_brigade_ids ?? []),
        ];
        for (const bid of allBids) {
            const f = formations[bid];
            if (!f || !f.location_osid) continue;
            const brigComp = componentOf.get(f.location_osid) ?? -2;
            if (brigComp !== secComp) {
                violations.push(
                    `${bid} (at ${f.location_osid}, comp ${brigComp}) → ${sec.sector_id} (comp ${secComp})`
                );
            }
        }
    }
    if (violations.length > 0) {
        console.error(
            `SECTOR REACHABILITY INVARIANT VIOLATION: ${violations.length} brigade(s) assigned to unreachable sectors:\n  ${violations.join('\n  ')}`
        );
    }
}

/**
 * INVARIANT: No dissolved/inactive brigade may appear in any sector.
 *
 * Checks all assigned_brigade_ids and reserve_brigade_ids for:
 *   - Formation exists in formations record
 *   - f.status === 'active'
 *   - f.lifecycle_status is NOT 'destroyed' or 'disbanded'
 *
 * Logs violations as console.error. Sectors remain usable — downstream
 * combat logic simply ignores inactive formations, but their presence
 * in a sector is a bug that must be surfaced.
 */
export function assertSectorBrigadesActive(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
): void {
    const violations: string[] = [];
    for (const sec of sectors) {
        const allBids = [
            ...sec.assigned_brigade_ids,
            ...(sec.reserve_brigade_ids ?? []),
        ].sort(strictCompare);
        for (const bid of allBids) {
            const f = formations[bid];
            if (!f) {
                violations.push(
                    `${bid} in ${sec.sector_id}: formation not found in formations record`
                );
                continue;
            }
            if (f.status !== 'active') {
                violations.push(
                    `${bid} in ${sec.sector_id}: status='${f.status}' (expected 'active')`
                );
            } else if (f.lifecycle_status === 'destroyed' || f.lifecycle_status === 'disbanded') {
                // Invariant: destroyed/disbanded must not have status='active'
                violations.push(
                    `${bid} in ${sec.sector_id}: status='active' but lifecycle_status='${f.lifecycle_status}'`
                );
            }
        }
    }
    if (violations.length > 0) {
        console.error(
            `SECTOR BRIGADE STATUS INVARIANT VIOLATION: ${violations.length} inactive/dissolved brigade(s) found in sectors:\n  ${violations.join('\n  ')}`
        );
    }
}

/**
 * Validate that a set of sector reassignment orders only move brigades
 * to sectors they can physically reach. Call this from directive generation
 * (bot_corps_directives.ts) before issuing march orders.
 *
 * Returns the filtered list of valid orders (invalid orders are dropped
 * with a console.warn).
 */
export function filterReachableReassignmentOrders(
    orders: Array<{ brigade_id: string; to_sector_id: string }>,
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    componentOf: Map<string, number>,
): Array<{ brigade_id: string; to_sector_id: string }> {
    const sectorMap = new Map<string, CorpsFrontSector>();
    for (const s of sectors) sectorMap.set(s.sector_id, s);

    return orders.filter(order => {
        const sec = sectorMap.get(order.to_sector_id);
        if (!sec) return false;
        const f = formations[order.brigade_id];
        if (!f || !f.location_osid) return false;
        const secComp = getSectorComponent(sec, componentOf);
        const brigComp = componentOf.get(f.location_osid) ?? -2;
        if (brigComp !== secComp) {
            console.warn(
                `[filterReachableReassignmentOrders] Dropped unreachable order: ${order.brigade_id} (comp ${brigComp}) → ${order.to_sector_id} (comp ${secComp})`
            );
            return false;
        }
        return true;
    });
}


// ═══════════════════════════════════════════════════════════════════════════
// Commander Profile — per-corps personality snapshot for brigade assignment
// ═══════════════════════════════════════════════════════════════════════════

interface CorpsCommanderProfile {
    competence: number;
    aggressiveness: number;
    /** Priority sector from the corps directive (offensive concentration point). */
    prioritySectorId?: string;
    /** sector_id → weight multiplier from active op preparation phases. */
    preStagingSectorWeights: Map<string, number>;
}

/**
 * Build a CorpsCommanderProfile for each corps that has sectors.
 * Reads named_officers + corps_command from state. Pure — no side effects.
 */
function buildCorpsCommanderProfiles(
    state: GameState,
    sectors: CorpsFrontSector[],
): Map<string, CorpsCommanderProfile> {
    const profiles = new Map<string, CorpsCommanderProfile>();

    const corpsIds = [...new Set(sectors.map(s => s.corps_id))].sort(strictCompare);

    for (const corpsId of corpsIds) {
        const commander = getCorpsCommander(corpsId, state);
        let competence = 0.3; // generic placeholder when no named commander
        let aggressiveness = 0.5;

        if (commander) {
            const penalty = commander.state.effective_competence_penalty ?? 0;
            // officer_types.ts: competence is 1–5, normalize to 0–1
            competence = Math.max(0, (commander.data.competence - penalty) / 5);
            aggressiveness = commander.data.aggressiveness / 5;
        }

        const corpsCmd = state.military.corps_command?.[corpsId];
        // priority_sector_id is on the CorpsDirective (generated prior turn)
        const prioritySectorId = corpsCmd?.directive?.priority_sector_id;

        // Build pre-op staging weights from the active operation's preparation phase.
        // active_operation is a single CorpsOperation | null.
        const preStagingSectorWeights = new Map<string, number>();
        if (corpsCmd?.active_operation) {
            const op = corpsCmd.active_operation;
            const subPhase = op.preparation_sub_phase;
            // sector_id = the sector this op launches from (set during planning)
            const opSectorId = op.sector_id;
            if (subPhase && opSectorId) {
                const weight = subPhase === 'intel_gathering'
                    ? PRE_OP_STAGING_WEIGHT_INTEL
                    : PRE_OP_STAGING_WEIGHT_STAGING;
                const existing = preStagingSectorWeights.get(opSectorId) ?? 0;
                if (weight > existing) preStagingSectorWeights.set(opSectorId, weight);
            }
        }
        // Also apply directive priority_sector_id if not already covered by op
        if (prioritySectorId && !preStagingSectorWeights.has(prioritySectorId)) {
            preStagingSectorWeights.set(prioritySectorId, PRE_OP_STAGING_WEIGHT_INTEL);
        }

        profiles.set(corpsId, { competence, aggressiveness, prioritySectorId, preStagingSectorWeights });
    }

    return profiles;
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 6: Classify Brigades by Territory Membership
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classify brigades into sectors based on territory membership.
 *
 * - Brigade at an OSID in a sector's territory_osids → assigned to that sector.
 * - Brigade in friendly territory but not in any sector's territory → assigned
 *   to the nearest sector (BFS through friendly territory).
 * - General staff units are exempt.
 *
 * GOLDEN RULE: Every active brigade MUST end up in a sector. If a brigade
 * falls through all classification priorities, that's a bug — investigate.
 *
 * Clears existing assigned/reserve lists and rebuilds from scratch.
 * Deterministic: sorted iteration via strictCompare.
 */
function classifyBrigadesByTerritory(
    sectors: CorpsFrontSector[],
    faction: FactionId,
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    componentOf: Map<string, number>,
    commanderProfiles: Map<string, CorpsCommanderProfile>,
    playerOverrides?: Record<string, string>, // brigadeId → sector_id
): void {
    if (sectors.length === 0) return;

    // Clear existing assignments (will be rebuilt)
    for (const s of sectors) {
        s.assigned_brigade_ids = [];
        s.reserve_brigade_ids = [];
    }

    // ── Player override: pin brigades to player-assigned sectors ─────────
    // Player-issued sector assignments (brigade_sector_override) take precedence
    // over all bot logic. Brigades with a valid override are pinned directly and
    // skipped from Phase 1/2 processing. Invalid overrides (wrong corps, sector
    // dissolved) are silently skipped — the brigade falls through to normal assignment.
    const playerOverridden = new Set<FormationId>();
    if (playerOverrides) {
        const sectorById = new Map(sectors.map(s => [s.sector_id, s]));
        for (const bid of Object.keys(playerOverrides).sort(strictCompare)) {
            const sectorId = playerOverrides[bid];
            if (!sectorId) continue;
            const f = formations[bid];
            if (!f || f.faction !== faction || f.status !== 'active') continue;
            if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
            const fCorpsId = getFormationCorpsId(f);
            if (!fCorpsId) continue;
            const sector = sectorById.get(sectorId);
            if (!sector || sector.corps_id !== fCorpsId) continue; // stale/wrong corps — fall through
            sector.assigned_brigade_ids.push(bid);
            playerOverridden.add(bid);
        }
    }

    // ── Pre-compute enemy personnel per sector for budget-aware Phase 1 ──
    // Needed before Phase 1 so shared-front-OSID brigades go to the sector
    // with the highest garrison DEFICIT, not the most edges.
    const preEnemyPers = new Map<string, number>();
    {
        const allFids = Object.keys(formations).sort(strictCompare);
        for (const s of sectors) {
            const enemyOsids = new Set<string>();
            for (const ss of s.sub_segments) for (const eo of ss.enemy_osids) enemyOsids.add(eo);
            let ep = 0;
            for (const fid of allFids) {
                const f = formations[fid];
                if (!f || f.faction === faction || f.status !== 'active') continue;
                if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
                if (f.location_osid && enemyOsids.has(f.location_osid)) ep += f.personnel ?? 0;
            }
            preEnemyPers.set(s.sector_id, ep);
        }
    }

    // ── Phase 1: Assign frontline brigades by position ──────────────────
    // Brigades physically on a sector's front OSID are assigned to that sector.
    // This is positional reality — you defend where you stand.
    // A front OSID can belong to multiple sectors (shared junction). In that
    // case, assign the brigade to the sector with the highest enemy threat.
    // This ensures shared-front brigades go to the siege ring, not the quiet rear.
    const frontOsidToSectorIndices = new Map<string, number[]>();
    for (let i = 0; i < sectors.length; i++) {
        for (const ss of sectors[i]!.sub_segments) {
            for (const o of ss.friendly_osids) {
                const existing = frontOsidToSectorIndices.get(o);
                if (existing) {
                    if (!existing.includes(i)) existing.push(i);
                } else {
                    frontOsidToSectorIndices.set(o, [i]);
                }
            }
        }
    }

    // Per-corps unassigned brigade pool (corps decides where they go)
    const corpsPool = new Map<FormationId, FormationId[]>();

    // ── Phase 0a: Elite loan routing ─────────────────────────────────────────
    // Loaned elite brigades masquerade as members of their target corps for
    // sector assignment. This ensures a loaned RS 1st Guards gets placed in
    // Drina Corps sectors, not left unassigned in the Main Staff exempt pool.
    const loanedCorpsMap = new Map<FormationId, string>();
    for (const [fid, f] of Object.entries(formations)) {
        const ls = f.elite_loan_state;
        if (ls?.on_loan && ls.loaned_to_corps) loanedCorpsMap.set(fid, ls.loaned_to_corps);
    }

    const sortedFormIds = Object.keys(formations).sort(strictCompare);
    for (const fid of sortedFormIds) {
        if (playerOverridden.has(fid)) continue; // already pinned by player override
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid) continue;

        const fCorpsId = getFormationCorpsId(f);
        // Loaned elites bypass the exempt check — they act as members of their target corps
        if (fCorpsId && EXEMPT_CORPS_IDS.has(fCorpsId) && !loanedCorpsMap.has(fid)) continue;

        // Effective corps: loan target if on loan, own corps otherwise
        const effectiveCorpsId = loanedCorpsMap.get(fid) ?? fCorpsId;

        const loc = f.location_osid;

        // Frontline brigade → assigned to sector it's physically on
        const frontIndices = frontOsidToSectorIndices.get(loc);
        if (frontIndices && frontIndices.length > 0) {
            // Filter to same-corps sectors only
            const corpsIndices = frontIndices.filter(idx => sectors[idx]!.corps_id === effectiveCorpsId);
            if (corpsIndices.length === 1) {
                sectors[corpsIndices[0]!]!.assigned_brigade_ids.push(fid);
                continue;
            } else if (corpsIndices.length > 1) {
                // Shared front OSID — assign to sector with highest enemy threat.
                // This puts brigades on the siege ring, not the quiet Vareš sector.
                let bestIdx = corpsIndices[0]!;
                let bestThreat = -Infinity;
                for (const idx of corpsIndices) {
                    const s = sectors[idx]!;
                    const threat = preEnemyPers.get(s.sector_id) ?? 0;
                    if (threat > bestThreat || (threat === bestThreat && strictCompare(s.sector_id, sectors[bestIdx]!.sector_id) < 0)) {
                        bestThreat = threat;
                        bestIdx = idx;
                    }
                }
                sectors[bestIdx]!.assigned_brigade_ids.push(fid);
                continue;
            }
        }

        // Not on front — goes to corps pool for corps-level assignment
        if (effectiveCorpsId) {
            const pool = corpsPool.get(effectiveCorpsId) ?? [];
            pool.push(fid);
            corpsPool.set(effectiveCorpsId, pool);
        }
    }

    // ── Phase 2: Corps distributes pooled brigades to sectors by need ───
    // The corps decides: sectors with more front edges get more brigades.
    // Constraint: a pooled brigade can only be assigned to a sector it can
    // physically reach through friendly territory (same connected component).
    // GOLDEN RULE: every brigade must end up in a sector.
    const sectorsByCorps = new Map<FormationId, CorpsFrontSector[]>();
    for (const s of sectors) {
        if (s.length_edges === 0) continue;
        const list = sectorsByCorps.get(s.corps_id) ?? [];
        list.push(s);
        sectorsByCorps.set(s.corps_id, list);
    }

    for (const [corpsId, pool] of [...corpsPool.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        const corpsSectors = sectorsByCorps.get(corpsId);
        if (!corpsSectors || corpsSectors.length === 0) {
            // No sectors for this corps — skip. These brigades remain unassigned
            // rather than being dumped into an arbitrary sector they can't reach.
            // ensureMinimumSectorCoverage() handles same-component transfers.
            continue;
        }

        // Build sector → municipality set from territory_osids for home-affinity matching.
        // Brigades should defend their home municipality when possible.
        const sectorMunicipalities = new Map<CorpsFrontSector, Set<string>>();
        for (const s of corpsSectors) {
            const muns = new Set<string>();
            for (const osid of s.territory_osids) {
                const m = munFromOsid(osid);
                if (m) muns.add(m);
            }
            sectorMunicipalities.set(s, muns);
        }

        // ── Budget-based brigade allocation ──────────────────────────────
        // The corps commander's primary job: secure the front FIRST, then
        // optimize placement. Replaces home-affinity-first Phase 2a-2d.
        //
        // Step 1: Compute garrison budget per sector (enemy-strength-aware)
        // Step 2: Fill garrisons in threat priority order
        // Step 3: Allocate surplus (operations, reserve, home optimization)

        const EDGES_PER_GARRISON_BRIGADE = 6;
        const THREAT_BASELINE = 2000;

        // Pre-compute enemy personnel per sector
        const allFormIds = Object.keys(formations).sort(strictCompare);
        const sectorEnemyPers = new Map<CorpsFrontSector, number>();
        for (const s of corpsSectors) {
            const enemyOsids = new Set<string>();
            for (const ss of s.sub_segments) {
                for (const eo of ss.enemy_osids) enemyOsids.add(eo);
            }
            let enemyPers = 0;
            for (const fid of allFormIds) {
                const f = formations[fid];
                if (!f || f.faction === faction || f.status !== 'active') continue;
                if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
                if (!f.location_osid || !enemyOsids.has(f.location_osid)) continue;
                enemyPers += f.personnel ?? 0;
            }
            sectorEnemyPers.set(s, enemyPers);
        }

        // Step 1: Compute garrison budgets
        const totalPooled = pool.length;
        const totalAlreadyAssigned = corpsSectors.reduce((sum, s) => sum + s.assigned_brigade_ids.length, 0);
        const totalAvailable = totalPooled + totalAlreadyAssigned;

        const sectorBudget = new Map<CorpsFrontSector, number>();
        let totalMinGarrison = 0;
        for (const s of corpsSectors) {
            const ep = sectorEnemyPers.get(s) ?? 0;
            const threatMult = Math.min(3.0, Math.max(1.0, Math.sqrt(ep / THREAT_BASELINE)));
            const raw = Math.ceil(s.length_edges / EDGES_PER_GARRISON_BRIGADE) * threatMult;
            sectorBudget.set(s, raw);
            totalMinGarrison += raw;
        }

        // Proportional allocation when budget > available (common for thin corps)
        const sectorAllocation = new Map<CorpsFrontSector, number>();
        if (totalMinGarrison <= totalAvailable) {
            // Enough brigades — every sector gets its full garrison
            for (const s of corpsSectors) sectorAllocation.set(s, Math.ceil(sectorBudget.get(s)!));
        } else {
            // Not enough — proportional with minimum 1 per front sector
            let allocated = 0;
            const frontSectors = corpsSectors.filter(s => s.length_edges > 0);
            // Reserve 1 per front sector first
            for (const s of frontSectors) { sectorAllocation.set(s, 1); allocated++; }
            for (const s of corpsSectors) { if (!sectorAllocation.has(s)) sectorAllocation.set(s, 0); }
            // Distribute remainder proportionally by budget weight
            const remaining = totalAvailable - allocated;
            if (remaining > 0 && totalMinGarrison > 0) {
                const proportional: Array<{ sector: CorpsFrontSector; frac: number }> = [];
                for (const s of frontSectors) {
                    proportional.push({ sector: s, frac: (sectorBudget.get(s)! / totalMinGarrison) * remaining });
                }
                // Floor allocation
                for (const p of proportional) {
                    const extra = Math.floor(p.frac);
                    sectorAllocation.set(p.sector, sectorAllocation.get(p.sector)! + extra);
                    allocated += extra;
                }
                // Remainder to highest-threat sectors
                const leftover = totalAvailable - allocated;
                if (leftover > 0) {
                    const byThreat = [...proportional]
                        .sort((a, b) => (sectorEnemyPers.get(b.sector) ?? 0) - (sectorEnemyPers.get(a.sector) ?? 0)
                            || strictCompare(a.sector.sector_id, b.sector.sector_id));
                    for (let i = 0; i < leftover && i < byThreat.length; i++) {
                        sectorAllocation.set(byThreat[i]!.sector, sectorAllocation.get(byThreat[i]!.sector)! + 1);
                    }
                }
            }
        }

        // Build sector need from allocation
        const sectorNeed: Array<{ sector: CorpsFrontSector; need: number; comp: number }> = [];
        // Sort sectors by enemy threat descending — fill highest-threat first
        const sortedSectors = [...corpsSectors].sort((a, b) =>
            (sectorEnemyPers.get(b) ?? 0) - (sectorEnemyPers.get(a) ?? 0)
            || strictCompare(a.sector_id, b.sector_id));
        for (const s of sortedSectors) {
            const comp = getSectorComponent(s, componentOf);
            const alloc = sectorAllocation.get(s) ?? 0;
            const need = Math.max(0, alloc - s.assigned_brigade_ids.length);
            sectorNeed.push({ sector: s, need, comp });
        }

        // Pre-compute each sector's front OSID set for BFS distance matching
        const sectorFrontOsidSets = new Map<CorpsFrontSector, Set<string>>();
        for (const sn of sectorNeed) {
            const frontSet = new Set<string>();
            for (const ss of sn.sector.sub_segments) {
                for (const o of ss.friendly_osids) frontSet.add(o);
            }
            sectorFrontOsidSets.set(sn.sector, frontSet);
        }

        // Step 2: Fill garrisons — highest-threat sectors first
        // Home affinity is a distance modifier (-2 hops), not the primary driver.
        const unmatched: FormationId[] = [];
        for (const sn of sectorNeed) {
            if (sn.need <= 0) continue;
            // Score all available pool brigades for this sector
            const candidates: Array<{ bid: FormationId; dist: number }> = [];
            for (const bid of pool) {
                if (sn.sector.assigned_brigade_ids.includes(bid)) continue; // already assigned
                const f = formations[bid];
                if (!f?.location_osid) continue;
                const brigComp = componentOf.get(f.location_osid) ?? -2;
                if (brigComp !== sn.comp) continue; // unreachable

                // BFS distance from brigade to sector front
                let dist = Infinity;
                const brigLoc = f.location_osid;
                if (sectorFrontOsidSets.get(sn.sector)?.has(brigLoc)) {
                    dist = 0;
                } else {
                    const visited = new Set<string>([brigLoc]);
                    let frontier = [brigLoc];
                    for (let hop = 1; hop <= PHASE_2C_MAX_HOPS && dist === Infinity; hop++) {
                        const next: string[] = [];
                        for (const osid of frontier) {
                            for (const nb of (adjacency.get(osid as Osid) ?? [])) {
                                if (visited.has(nb)) continue;
                                visited.add(nb);
                                if (!friendlyOsids.has(nb)) continue;
                                if (sectorFrontOsidSets.get(sn.sector)?.has(nb)) { dist = hop; break; }
                                next.push(nb);
                            }
                            if (dist !== Infinity) break;
                        }
                        frontier = next;
                    }
                }
                if (dist === Infinity) continue;

                // Home affinity bonus: -2 hops if brigade's home municipality is in sector
                const homeMun = f.home_osid ? munFromOsid(f.home_osid) : undefined;
                const isHome = homeMun && sectorMunicipalities.get(sn.sector)?.has(homeMun);
                const effectiveDist = isHome ? Math.max(0, dist - 2) : dist;

                candidates.push({ bid, dist: effectiveDist });
            }

            // Sort by effective distance, assign closest first
            candidates.sort((a, b) => a.dist - b.dist || strictCompare(a.bid, b.bid));
            let filled = 0;
            for (const c of candidates) {
                if (filled >= sn.need) break;
                sn.sector.assigned_brigade_ids.push(c.bid);
                // Remove from pool so other sectors don't claim this brigade
                const poolIdx = pool.indexOf(c.bid);
                if (poolIdx >= 0) pool.splice(poolIdx, 1);
                filled++;
            }
            sn.need -= filled;
        }

        // Step 3: Surplus allocation — remaining pool brigades
        // These go to highest-need sector they can reach, with home affinity as tiebreaker
        for (const bid of [...pool]) {
            const f = formations[bid];
            if (!f?.location_osid) continue;
            const brigComp = componentOf.get(f.location_osid) ?? -2;
            const homeMun = f.home_osid ? munFromOsid(f.home_osid) : undefined;

            // Find best sector: prefer sectors with remaining need, then home sectors
            const reachable = sectorNeed
                .filter(sn => sn.comp === brigComp)
                .sort((a, b) => {
                    // Primary: sectors still needing brigades first
                    if (a.need > 0 && b.need <= 0) return -1;
                    if (b.need > 0 && a.need <= 0) return 1;
                    // Secondary: home affinity
                    const aHome = homeMun && sectorMunicipalities.get(a.sector)?.has(homeMun) ? 1 : 0;
                    const bHome = homeMun && sectorMunicipalities.get(b.sector)?.has(homeMun) ? 1 : 0;
                    if (bHome !== aHome) return bHome - aHome;
                    // Tertiary: highest threat
                    return (sectorEnemyPers.get(b.sector) ?? 0) - (sectorEnemyPers.get(a.sector) ?? 0)
                        || strictCompare(a.sector.sector_id, b.sector.sector_id);
                });

            if (reachable.length > 0) {
                const target = reachable[0]!;
                target.sector.assigned_brigade_ids.push(bid);
                target.need = Math.max(0, target.need - 1);
            }
        }

    }

    // ── Force-assign loaned elites that BFS couldn't place ──
    // A loaned elite may be physically in another corps's territory (e.g. Black Swans
    // at brnjic_2 in 3rd Corps territory, loaned to 2nd Corps). BFS from 2nd Corps
    // sectors can't reach it. Force-assign to the target corps's largest sector
    // so the sector-march rule moves the brigade there.
    for (const [fid, targetCorpsId] of loanedCorpsMap) {
        // Check if this elite was assigned to any sector
        let alreadyAssigned = false;
        for (const sec of sectors) {
            if (sec.assigned_brigade_ids.includes(fid) || sec.reserve_brigade_ids?.includes(fid)) {
                alreadyAssigned = true;
                break;
            }
        }
        if (alreadyAssigned) continue;

        // Find the target corps's sector with the most assigned brigades (the "main effort")
        let bestSector: CorpsFrontSector | null = null;
        let bestCount = -1;
        for (const sec of sectors) {
            if (sec.corps_id !== targetCorpsId) continue;
            const count = sec.assigned_brigade_ids.length;
            if (count > bestCount || (count === bestCount && bestSector && strictCompare(sec.sector_id, bestSector.sector_id) < 0)) {
                bestCount = count;
                bestSector = sec;
            }
        }

        if (bestSector) {
            bestSector.assigned_brigade_ids.push(fid);
        }
    }

    // Sort for determinism
    for (const s of sectors) {
        s.assigned_brigade_ids.sort(strictCompare);
        s.reserve_brigade_ids.sort(strictCompare);
    }

    // Reserve cap is applied later in reclassifyRearBrigades (Step 8),
    // after equalization and coverage have redistributed assigned brigades.

    // NOTE: density, defensive_power, and threat_ratio are intentionally NOT
    // computed here. They are computed once at the very end of buildFactionSectors
    // by recomputeSectorPowerAndThreat(), AFTER all assignment steps (Steps 7-8b)
    // have run. Computing them here would produce stale values for sectors that
    // gain their first brigade via ensureMinimumSectorCoverage (Step 7), causing
    // those sectors to show dp=0 and threat_ratio=0 despite having defenders.
}

/**
 * Step 6b: Cross-corps enclave defense.
 *
 * After corps-strict assignment, some brigades are unassigned because they're
 * physically present in territory where the front edges belong to a different
 * corps's sector. This happens in disconnected enclaves where the "correct" corps
 * has no sectors nearby (e.g. HVO central Bosnia brigades in Žepče — the Žepče
 * front edges are in an hvo_northwest_bosnia sector).
 *
 * A brigade physically at a front OSID defends it regardless of corps org charts.
 * This pass assigns orphaned brigades to the nearest same-faction sector at their
 * location, even if it belongs to a different corps.
 */
function assignCrossCorpsEnclaveDefenders(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    faction: FactionId,
): void {
    // Build set of all already-assigned brigade IDs
    const assigned = new Set<string>();
    for (const s of sectors) {
        for (const bid of s.assigned_brigade_ids) assigned.add(bid);
        for (const bid of s.reserve_brigade_ids ?? []) assigned.add(bid);
    }

    // Build front OSID → sector index map (all sectors, not corps-filtered)
    const frontOsidToSectors = new Map<string, number[]>();
    for (let i = 0; i < sectors.length; i++) {
        for (const ss of sectors[i]!.sub_segments) {
            for (const o of ss.friendly_osids) {
                const existing = frontOsidToSectors.get(o);
                if (existing) { if (!existing.includes(i)) existing.push(i); }
                else frontOsidToSectors.set(o, [i]);
            }
        }
    }

    // Also build territory OSID → sector index (for brigades 1-hop behind front)
    const territoryOsidToSectors = new Map<string, number[]>();
    for (let i = 0; i < sectors.length; i++) {
        for (const o of sectors[i]!.territory_osids) {
            const existing = territoryOsidToSectors.get(o);
            if (existing) { if (!existing.includes(i)) existing.push(i); }
            else territoryOsidToSectors.set(o, [i]);
        }
    }

    const sortedFormIds = Object.keys(formations).sort(strictCompare);
    for (const fid of sortedFormIds) {
        if (assigned.has(fid)) continue;
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid) continue;
        const fCorpsId = getFormationCorpsId(f);
        if (fCorpsId && EXEMPT_CORPS_IDS.has(fCorpsId)) continue;

        // Guard: if the brigade's own corps has ANY sector at all, skip — the brigade
        // should be assigned to its own corps through the normal pipeline. Cross-corps
        // assignment is ONLY for brigades whose corps has zero sectors (true disconnected
        // enclaves, e.g. HVO central Bosnia brigades where hvo_central_bosnia has no
        // sectors but hvo_northwest_bosnia does). This prevents Herzegovina brigades from
        // being captured by 1KK sectors (Čajniče → Banja Luka wandering bug).
        const loc = f.location_osid;
        const ownCorpsHasSectors = sectors.some(s => s.corps_id === fCorpsId);
        if (ownCorpsHasSectors) continue;

        // Check if this brigade is on a front OSID of ANY same-faction sector
        let sectorIndices = frontOsidToSectors.get(loc);
        if (!sectorIndices || sectorIndices.length === 0) {
            // Not on front — check territory (1-hop behind)
            sectorIndices = territoryOsidToSectors.get(loc);
        }
        if (!sectorIndices || sectorIndices.length === 0) continue;

        // Filter to same-faction sectors (should always be, but guard)
        const factionIndices = sectorIndices.filter(idx => sectors[idx]!.faction === faction);
        if (factionIndices.length === 0) continue;

        // Assign to neediest sector
        let bestIdx = factionIndices[0]!;
        let bestNeed = -Infinity;
        for (const idx of factionIndices) {
            const s = sectors[idx]!;
            const need = s.length_edges - s.assigned_brigade_ids.length;
            if (need > bestNeed || (need === bestNeed && strictCompare(s.sector_id, sectors[bestIdx]!.sector_id) < 0)) {
                bestNeed = need;
                bestIdx = idx;
            }
        }
        sectors[bestIdx]!.assigned_brigade_ids.push(fid);
        assigned.add(fid);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 8: Reclassify Rear Brigades (post-equalization)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * After equalization and coverage, classify assigned brigades by position:
 * - On sector front OSID → stays assigned (frontline duty)
 * - 1 hop behind front → reserve candidate (recovery/reaction force)
 * - Deeper rear → stays assigned (will march toward front via interior movement)
 *
 * GOLDEN RULE 1: Every brigade MUST be in a sector. We never drop brigades.
 * GOLDEN RULE 2: Brigades in a sector MUST be at the frontline, except
 *   one reserve per sector (1 hop behind, recovering or reaction force).
 *   Deep-rear brigades are kept assigned and will be marched forward by
 *   evaluateInteriorMovement() each turn.
 */
function reclassifyRearBrigades(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>
): void {
    for (const sector of sectors) {
        const frontSet = getSectorFrontOsids(sector);
        if (frontSet.size === 0) continue;

        // Build 1-hop set from all front OSIDs through friendly territory.
        const oneHopBehind = new Set<string>();
        for (const fo of frontSet) {
            for (const n of (adjacency.get(fo as Osid) ?? [])) {
                if (frontSet.has(n)) continue;
                if (!friendlyOsids.has(n)) continue;
                oneHopBehind.add(n);
            }
        }

        // Classify: front → assigned, 1-hop → reserve candidate, deeper → dropped.
        const keepAssigned: FormationId[] = [];
        let reserveCandidates: Array<{ bid: FormationId; personnel: number }> = [];

        for (const bid of [...sector.assigned_brigade_ids, ...sector.reserve_brigade_ids]) {
            const f = formations[bid];
            if (!f?.location_osid) { keepAssigned.push(bid); continue; }
            if (frontSet.has(f.location_osid)) {
                keepAssigned.push(bid);
            } else if (oneHopBehind.has(f.location_osid)) {
                reserveCandidates.push({ bid, personnel: f.personnel ?? 0 });
            } else {
                // Deep-rear brigade: keep assigned. Interior movement will march
                // it toward the front. GOLDEN RULE: never drop a brigade from its sector.
                keepAssigned.push(bid);
            }
        }

        // Zero-assigned guard for SRK fortress sectors: the Sarajevo ring has brigades
        // permanently 1-hop behind a fortified front (they sit in suburbs, not on the
        // actual siege line). ensureMinimumSectorCoverage places a rescue brigade in
        // assigned[], but reclassifyRearBrigades demotes it back to reserve every turn
        // because it's 1-hop. This creates a cycle: assigned=[], defensive_power=0.
        // Fix: SRK sectors keep their sole 1-hop brigade as assigned.
        // SCOPED TO SRK ONLY: does not affect offensive corps or ARBiH sectors
        // (which would otherwise get artificially stronger defense).
        if (
            sector.corps_id === 'vrs_sarajevo_romanija' &&
            keepAssigned.length === 0 &&
            reserveCandidates.length > 0
        ) {
            reserveCandidates.sort((a, b) => b.personnel - a.personnel || strictCompare(a.bid, b.bid));
            keepAssigned.push(reserveCandidates[0]!.bid);
            reserveCandidates = reserveCandidates.slice(1);
        }

        // Cap: 1 reserve per sector. Pick the strongest brigade.
        // Non-winners go back into assigned — they are 1 hop from the front, not
        // deep rear, and must not be silently dropped from all sector lists.
        reserveCandidates.sort((a, b) => b.personnel - a.personnel || strictCompare(a.bid, b.bid));
        const reserveBrigade = reserveCandidates.length > 0 ? reserveCandidates[0]!.bid : null;
        for (const rc of reserveCandidates.slice(1)) {
            keepAssigned.push(rc.bid);
        }

        sector.assigned_brigade_ids = keepAssigned.sort(strictCompare);
        sector.reserve_brigade_ids = reserveBrigade ? [reserveBrigade] : [];
    }

    // Recalculate density (assigned only — reserves don't count for front coverage)
    for (const s of sectors) {
        s.density = s.length_edges > 0
            ? s.assigned_brigade_ids.length / s.length_edges : 0;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Sector Power & Threat Recomputation (runs LAST, after all assignment steps)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Recompute density, defensive_power, and threat_ratio for all sectors.
 *
 * This MUST run AFTER all brigade-assignment steps (classifyBrigadesByTerritory,
 * ensureMinimumSectorCoverage, reclassifyRearBrigades, deduplicateBrigadesAcrossSectors)
 * to ensure the values reflect the final brigade set in each sector.
 *
 * Sectors rescued by ensureMinimumSectorCoverage (0→1 brigade) used to show
 * dp=0 / threat_ratio=0 because the old code computed these mid-pipeline inside
 * classifyBrigadesByTerritory, before Steps 7-8b ran. This caused those sectors
 * to appear unthreatened (stance = active_defense, no reinforcement priority).
 */
function recomputeSectorPowerAndThreat(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    faction: FactionId,
): void {
    const allFormIds = Object.keys(formations).sort(strictCompare);
    for (const s of sectors) {
        s.density = s.length_edges > 0
            ? s.assigned_brigade_ids.length / s.length_edges : 0;
        s.defensive_power = computeLocalFrontDefensivePower(
            formations, s.assigned_brigade_ids, s.length_edges
        );

        // Compute enemy power from formations at sector enemy OSIDs
        const enemyOsids = new Set<string>();
        for (const ss of s.sub_segments) {
            for (const eo of ss.enemy_osids) enemyOsids.add(eo);
        }
        let enemyPower = 0;
        for (const fid of allFormIds) {
            const f = formations[fid];
            if (!f || f.faction === faction || f.status !== 'active') continue;
            if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
            if (!f.location_osid || !enemyOsids.has(f.location_osid)) continue;
            enemyPower += f.personnel ?? 0;
        }
        // When defensive_power is 0 (sector has no assigned front-line brigades),
        // threat_ratio must reflect real enemy presence. Setting it to 0 makes the
        // sector look unthreatened — density floor pass skips it (THREAT_GATE=300),
        // bot assigns active_defense stance, and reinforcement logic never fires.
        // Reality: 0-defense vs active enemy = maximum threat. Use 9999 as a cap.
        s.threat_ratio = s.defensive_power > 0
            ? enemyPower / s.defensive_power
            : (enemyPower > 0 ? 9999 : 0);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 6b: Equalize Sector Density
// ═══════════════════════════════════════════════════════════════════════════

/** Collect the set of friendly-side front OSIDs for a sector. */
function getSectorFrontOsids(sector: CorpsFrontSector): Set<string> {
    const frontSet = new Set<string>();
    for (const ss of sector.sub_segments) {
        for (const o of ss.friendly_osids) frontSet.add(o);
    }
    return frontSet;
}


// ═══════════════════════════════════════════════════════════════════════════
// Step 2: Multi-Source BFS — Map OSIDs to Nearest Corps
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Multi-source BFS from all corps HQ locations through friendly-controlled territory.
 * Each OSID is assigned to the nearest corps by hop count.
 * Deterministic: corps sorted by ID, neighbors sorted by strictCompare.
 */
function mapOsidsToCorps(
    state: GameState,
    faction: FactionId,
    corpsIds: FormationId[],
    adjacency: Map<Osid, Osid[]>,
    formations: Record<FormationId, FormationState>,
    reverseMap: Map<string, string[]> | null
): Map<Osid, FormationId> {
    const result = new Map<Osid, FormationId>();

    // Pre-compute friendly OSIDs for fast membership checks.
    // Include BOTH edge-graph OSIDs and political_controllers entries so that
    // corps/brigades at deep-interior locations can seed BFS.
    const friendlyOsids = new Set<Osid>();
    for (const osid of adjacency.keys()) {
        const ctrl = getPoliticalControllerOSID(state, osid, reverseMap ?? undefined);
        if (ctrl === faction) friendlyOsids.add(osid);
    }
    // Also add all OSIDs from political_controllers that belong to this faction.
    // These may not appear in the adjacency graph (interior OSIDs with no edges)
    // but are needed for BFS seeding from corps HQ / subordinate locations.
    const pc = state.political.political_controllers ?? {};
    for (const [osid, ctrl] of Object.entries(pc)) {
        if (ctrl === faction) friendlyOsids.add(osid);
    }

    // ── Phase 1: Lock OSIDs by brigade HOME positions ──
    // Corps territory is defined by where brigades BELONG (home_osid), not where
    // they happen to be standing. A displaced 4th Corps brigade in Visoko doesn't
    // make Visoko 4th Corps territory — Visoko belongs to 1st Corps because
    // 1st Corps brigades are FROM there.
    const osidCorpsVotes = new Map<Osid, Map<FormationId, number>>();
    const sortedBrigadeIds = Object.keys(formations).sort(strictCompare);
    for (const fid of sortedBrigadeIds) {
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        const fCorpsId = getFormationCorpsId(f);
        if (!fCorpsId || !corpsIds.includes(fCorpsId)) continue;

        // Primary seed: home_osid (where the brigade belongs)
        const homeOsid = f.home_osid;
        if (homeOsid && friendlyOsids.has(homeOsid)) {
            let votes = osidCorpsVotes.get(homeOsid);
            if (!votes) { votes = new Map(); osidCorpsVotes.set(homeOsid, votes); }
            votes.set(fCorpsId, (votes.get(fCorpsId) ?? 0) + 1);
        }
    }

    // Lock: assign each home-OSID to the majority corps
    const lockedSeeds: Array<{ corpsId: FormationId; osid: Osid }> = [];
    const sortedOccupiedOsids = [...osidCorpsVotes.keys()].sort(strictCompare);
    for (const osid of sortedOccupiedOsids) {
        const votes = osidCorpsVotes.get(osid)!;
        const sorted = [...votes.entries()].sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return strictCompare(a[0], b[0]);
        });
        const winner = sorted[0]![0];
        result.set(osid, winner);
        lockedSeeds.push({ corpsId: winner, osid });
    }

    // ── Phase 1b: Lock OSIDs by brigade CURRENT position (secondary) ──
    // Only claims unclaimed OSIDs — home-based territory always wins.
    // This handles brigades that have moved into genuinely new territory
    // (captured areas not covered by any brigade's home).
    // GUARD: Skip location seeds in municipalities where ANOTHER corps has home
    // seeds. Prevents e.g. a 4th Corps brigade in Visoko from seeding 4th Corps
    // territory when 1st Corps has home seeds there — BFS would then steal Sarajevo.
    const homeMunCorps = new Map<string, Set<FormationId>>();
    for (const seed of lockedSeeds) {
        const mun = munFromOsid(seed.osid);
        if (!mun) continue;
        let corps = homeMunCorps.get(mun);
        if (!corps) { corps = new Set(); homeMunCorps.set(mun, corps); }
        corps.add(seed.corpsId);
    }
    for (const fid of sortedBrigadeIds) {
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid || !friendlyOsids.has(f.location_osid)) continue;
        if (result.has(f.location_osid)) continue; // Home-based claim takes precedence
        const fCorpsId = getFormationCorpsId(f);
        if (!fCorpsId || !corpsIds.includes(fCorpsId)) continue;
        // Skip if another corps has home seeds in this municipality
        const locMun = munFromOsid(f.location_osid);
        if (locMun) {
            const munCorps = homeMunCorps.get(locMun);
            if (munCorps && !munCorps.has(fCorpsId)) continue;
        }
        result.set(f.location_osid, fCorpsId);
        lockedSeeds.push({ corpsId: fCorpsId, osid: f.location_osid });
    }

    // ── Phase 2: BFS gap fill from locked seeds ──
    // Fill unoccupied friendly OSIDs by expanding from home + position seeds.
    // Nearest seed determines ownership of interior territory.
    const queue: Array<{ osid: Osid; corpsId: FormationId }> = [];
    for (const seed of lockedSeeds) {
        queue.push(seed);
    }

    // Fallback: if a corps has zero locked seeds (no brigades at all), use HQ
    for (const corpsId of corpsIds) {
        if (lockedSeeds.some(s => s.corpsId === corpsId)) continue;
        const corpsFormation = formations[corpsId];
        if (corpsFormation?.location_osid && friendlyOsids.has(corpsFormation.location_osid) && !result.has(corpsFormation.location_osid)) {
            result.set(corpsFormation.location_osid, corpsId);
            queue.push({ corpsId, osid: corpsFormation.location_osid });
        } else {
            const subOsid = findSubordinateOsid(formations, corpsId, friendlyOsids);
            if (subOsid && !result.has(subOsid)) {
                result.set(subOsid, corpsId);
                queue.push({ corpsId, osid: subOsid });
            }
        }
    }

    let head = 0;
    while (head < queue.length) {
        const { osid, corpsId } = queue[head++]!;
        const neighbors = adjacency.get(osid) ?? [];
        for (const neighbor of neighbors) {
            if (result.has(neighbor)) continue;
            if (!friendlyOsids.has(neighbor)) continue;
            // Don't expand into municipalities where ANOTHER corps has home seeds.
            // Prevents BFS race from stealing territory: e.g. 1st Corps BFS from
            // Olovo reaching Kladanj before 2nd Corps, when 2nd Corps brigades are
            // FROM Kladanj. Same guard as Phase 1b location seeds.
            const neighborMun = munFromOsid(neighbor);
            if (neighborMun) {
                const munCorps = homeMunCorps.get(neighborMun);
                if (munCorps && !munCorps.has(corpsId)) continue;
            }
            result.set(neighbor, corpsId);
            queue.push({ osid: neighbor, corpsId });
        }
    }

    // Post-BFS: claim disconnected friendly OSIDs where corps brigades are located.
    // Handles pockets/enclaves not reachable through contiguous friendly territory.
    for (const fid of sortedBrigadeIds) {
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        const fCorpsId = getFormationCorpsId(f);
        if (!f.location_osid || !fCorpsId) continue;
        if (!friendlyOsids.has(f.location_osid)) continue;
        if (result.has(f.location_osid)) continue;
        if (!corpsIds.includes(fCorpsId)) continue;
        result.set(f.location_osid, fCorpsId);
        const pocketQueue: Osid[] = [f.location_osid];
        let pHead = 0;
        while (pHead < pocketQueue.length) {
            const po = pocketQueue[pHead++]!;
            const pNeighbors = adjacency.get(po) ?? [];
            for (const pn of pNeighbors) {
                if (result.has(pn)) continue;
                if (!friendlyOsids.has(pn)) continue;
                result.set(pn, fCorpsId);
                pocketQueue.push(pn);
            }
        }
    }

    return result;
}

/**
 * Find the first subordinate brigade OSID for a corps (fallback when corps HQ has no OSID).
 */
function findSubordinateOsid(
    formations: Record<FormationId, FormationState>,
    corpsId: FormationId,
    friendlyOsids: Set<Osid>
): Osid | null {
    const sortedIds = Object.keys(formations).sort(strictCompare);
    for (const fid of sortedIds) {
        const f = formations[fid];
        if (!f || getFormationCorpsId(f) !== corpsId) continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (f.status !== 'active' || !f.location_osid) continue;
        if (friendlyOsids.has(f.location_osid)) return f.location_osid;
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 3: Partition Front Edges to Corps
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assign each hostile-boundary front edge to the corps that owns its friendly-side OSID.
 * When an edge is on an OSID not reachable by the main BFS (disconnected pockets/islands),
 * BFS outward through OSID adjacency to find the nearest already-claimed OSID and inherit
 * its corps. This correctly assigns Bihać, Srebrenica, etc. to the geographically nearest
 * corps rather than the alphabetically-first one.
 */
function partitionFrontEdges(
    osidFrontEdges: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    faction: FactionId,
    osidToCorps: Map<Osid, FormationId>,
    state: GameState,
    reverseMap: Map<string, string[]> | null,
    corpsIds: FormationId[],
    adjacency: Map<Osid, Osid[]>
): Map<FormationId, string[]> {
    const result = new Map<FormationId, string[]>();

    // Sort front edges for deterministic processing
    const sorted = [...osidFrontEdges]
        .filter(e => e.side_a === faction || e.side_b === faction)
        .sort((a, b) => strictCompare(a.edge_id, b.edge_id));

    for (const edge of sorted) {
        // Identify the friendly-side OSID
        const friendlyOsid = edge.side_a === faction ? edge.a : edge.b;
        let corpsId = osidToCorps.get(friendlyOsid);

        // Edge on unclaimed or disconnected OSID (pocket/island). BFS outward through
        // OSID adjacency (ignoring control, any territory) to find nearest claimed OSID.
        if (!corpsId) {
            corpsId = bfsNearestClaimedCorps(friendlyOsid, osidToCorps, adjacency) ?? corpsIds[0];
            if (!corpsId) continue; // Only if faction has NO corps at all
        }

        let list = result.get(corpsId);
        if (!list) { list = []; result.set(corpsId, list); }
        list.push(edge.edge_id);
    }

    return result;
}

/**
 * BFS from startOsid through all OSID adjacency (ignoring political control) to find
 * the nearest OSID that is already assigned to a corps in osidToCorps.
 * Returns that corps ID, or null if none reachable.
 * Deterministic: adjacency lists must be sorted (buildOsidAdjacency guarantees this).
 */
function bfsNearestClaimedCorps(
    startOsid: Osid,
    osidToCorps: Map<Osid, FormationId>,
    adjacency: Map<Osid, Osid[]>
): FormationId | null {
    const queue: Osid[] = [startOsid];
    const visited = new Set<Osid>([startOsid]);
    let head = 0;
    while (head < queue.length) {
        const cur = queue[head++]!;
        const neighbors = adjacency.get(cur) ?? [];
        for (const nb of neighbors) {
            if (visited.has(nb)) continue;
            visited.add(nb);
            const cId = osidToCorps.get(nb);
            if (cId) return cId;
            queue.push(nb);
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 3b: Consolidate Cross-Corps Front Splits
// ═══════════════════════════════════════════════════════════════════════════

/**
 * After partitioning front edges to corps via BFS Voronoi, contiguous fronts
 * can be split across multiple corps at the boundary. This detects connected
 * components of edges (via friendly-OSID adjacency, ignoring corps assignment)
 * and reassigns minority edges to the majority corps in each component.
 *
 * Example: Bosanska Gradiška has two RBiH OSIDs (orahova → 5th Corps,
 * gradiska_3 → 3rd Corps). Their edges form one contiguous front but are
 * split by the BFS boundary. This merges them under whichever corps owns
 * the majority of edges in that front.
 *
 * Mutates corpsEdges in place.
 */
/** Is this edge protected from corps reassignment by brigade presence or BFS territory mapping? */
function isEdgeProtectedFromReassignment(
    eid: string,
    corpsId: FormationId,
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    faction: FactionId,
    osidBrigadeCorps: Map<string, Set<FormationId>>,
    osidToCorps: Map<Osid, FormationId>,
): boolean {
    const meta = edgeMeta.get(eid);
    if (!meta) return false;
    const friendlyOsid = meta.side_a === faction ? meta.a : meta.b;
    // Brigade presence protects
    const brigCorps = osidBrigadeCorps.get(friendlyOsid);
    if (brigCorps && brigCorps.has(corpsId)) return true;
    // BFS home-seed mapping is authoritative — consolidation shouldn't override it.
    const mappedCorps = osidToCorps.get(friendlyOsid as Osid);
    if (mappedCorps === corpsId) return true;
    return false;
}

function consolidateCrossCorpsFronts(
    corpsEdges: Map<FormationId, string[]>,
    osidFrontEdges: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    formations: Record<FormationId, FormationState>,
    osidToCorps: Map<Osid, FormationId>,
    centroids?: OsidCentroidMap,
): void {
    // Collect all edge_ids across all corps for this faction
    const allEdgeIds: string[] = [];
    for (const edges of corpsEdges.values()) {
        allEdgeIds.push(...edges);
    }
    if (allEdgeIds.length === 0) return;

    // Build edge metadata lookup
    const edgeMeta = new Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>();
    for (const e of osidFrontEdges) {
        edgeMeta.set(e.edge_id, e);
    }

    // Build edge-to-corps reverse lookup
    const edgeToCorps = new Map<string, FormationId>();
    for (const [corpsId, edges] of corpsEdges) {
        for (const eid of edges) {
            edgeToCorps.set(eid, corpsId);
        }
    }

    // Build adjacency across ALL faction edges (ignoring corps boundaries).
    // Includes friendly-OSID, OSID-neighbor, same-hostile-OSID, and hostile-
    // OSID-neighbor adjacency — so connected components faithfully represent
    // contiguous front segments.
    const edgeAdj = buildEdgeAdjacency(allEdgeIds, edgeMeta, faction, adjacency, undefined, centroids);

    // Build brigade-presence lookup once: OSID → set of corps with brigades
    // stationed there. Edges where a brigade of the current corps is stationed
    // are protected from consolidation (brigade presence defines the corps
    // boundary — not edge-count majority).
    const osidBrigadeCorps = new Map<string, Set<FormationId>>();
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid) continue;
        const fCorpsId = getFormationCorpsId(f);
        if (!fCorpsId) continue;
        let set = osidBrigadeCorps.get(f.location_osid);
        if (!set) { set = new Set(); osidBrigadeCorps.set(f.location_osid, set); }
        set.add(fCorpsId);
    }

    // Find connected components via BFS
    const visited = new Set<string>();
    const sortedAll = [...allEdgeIds].sort(strictCompare);

    for (const seed of sortedAll) {
        if (visited.has(seed)) continue;

        // BFS to find connected component
        const component: string[] = [];
        const queue = [seed];
        visited.add(seed);
        while (queue.length > 0) {
            const eid = queue.shift()!;
            component.push(eid);
            for (const next of edgeAdj.get(eid) ?? []) {
                if (visited.has(next)) continue;
                visited.add(next);
                queue.push(next);
            }
        }

        // Count edges per corps in this component
        const corpsCounts = new Map<FormationId, number>();
        for (const eid of component) {
            const c = edgeToCorps.get(eid);
            if (c) corpsCounts.set(c, (corpsCounts.get(c) ?? 0) + 1);
        }
        if (corpsCounts.size <= 1) continue; // No split — single corps owns all

        // Find majority corps (deterministic: highest count, then lexicographic tiebreak)
        let majorityCorps: FormationId | null = null;
        let majorityCount = 0;
        for (const [cid, count] of [...corpsCounts.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
            if (count > majorityCount || (count === majorityCount && majorityCorps !== null && strictCompare(cid, majorityCorps) < 0)) {
                majorityCorps = cid;
                majorityCount = count;
            }
        }
        if (!majorityCorps) continue;

        // Identify which minority corps can safely lose their edges in this
        // component. Protect a corps if losing this component's edges would
        // leave it with zero remaining edges (sector-less). Uses current
        // remaining count (not initial) to catch cumulative losses.
        const protectedCorps = new Set<FormationId>();
        for (const [cid, countInComponent] of corpsCounts) {
            if (cid === majorityCorps) continue;
            const remainingForCorps = corpsEdges.get(cid)?.length ?? 0;
            if (remainingForCorps <= countInComponent) {
                protectedCorps.add(cid);
            }
        }

        // Reassign minority edges to the majority corps
        for (const eid of component) {
            const currentCorps = edgeToCorps.get(eid);
            if (!currentCorps || currentCorps === majorityCorps) continue;
            if (protectedCorps.has(currentCorps)) continue;

            if (isEdgeProtectedFromReassignment(eid, currentCorps, edgeMeta, faction, osidBrigadeCorps, osidToCorps)) continue;

            // Remove from current corps
            const currentList = corpsEdges.get(currentCorps);
            if (currentList) {
                const idx = currentList.indexOf(eid);
                if (idx >= 0) currentList.splice(idx, 1);
            }

            // Add to majority corps
            let majorityList = corpsEdges.get(majorityCorps);
            if (!majorityList) {
                majorityList = [];
                corpsEdges.set(majorityCorps, majorityList);
            }
            majorityList.push(eid);
            edgeToCorps.set(eid, majorityCorps);
        }
    }

    // ── Hostile-OSID coherence pass ──
    // When edges from multiple corps face the SAME hostile OSID, consolidate
    // minority-corps edges to the majority corps. This prevents settlements
    // from being split between corps (e.g. Bijela with edges from both 1st
    // and 4th Corps). Brigade presence still protects.
    const hostileOsidToCorpsCounts = new Map<string, Map<FormationId, string[]>>();
    for (const edge of osidFrontEdges) {
        if (edge.side_a !== faction && edge.side_b !== faction) continue;
        const corps = edgeToCorps.get(edge.edge_id);
        if (!corps) continue;
        const hostileOsid = edge.side_a === faction ? edge.b : edge.a;
        let corpMap = hostileOsidToCorpsCounts.get(hostileOsid);
        if (!corpMap) { corpMap = new Map(); hostileOsidToCorpsCounts.set(hostileOsid, corpMap); }
        let list = corpMap.get(corps);
        if (!list) { list = []; corpMap.set(corps, list); }
        list.push(edge.edge_id);
    }

    for (const [_hostileOsid, corpMap] of [...hostileOsidToCorpsCounts.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        if (corpMap.size <= 1) continue; // single corps — no conflict

        // Find majority corps for this hostile OSID
        let majCorps: FormationId | null = null;
        let majCount = 0;
        for (const [cid, eids] of [...corpMap.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
            if (eids.length > majCount || (eids.length === majCount && majCorps !== null && strictCompare(cid, majCorps) < 0)) {
                majCorps = cid;
                majCount = eids.length;
            }
        }
        if (!majCorps) continue;

        // Reassign minority-corps edges (respect brigade presence)
        for (const [cid, eids] of corpMap) {
            if (cid === majCorps) continue;
            for (const eid of eids) {
                if (isEdgeProtectedFromReassignment(eid, cid, edgeMeta, faction, osidBrigadeCorps, osidToCorps)) continue;
                // Reassign
                const fromList = corpsEdges.get(cid);
                if (fromList) {
                    const idx = fromList.indexOf(eid);
                    if (idx >= 0) fromList.splice(idx, 1);
                }
                let toList = corpsEdges.get(majCorps);
                if (!toList) { toList = []; corpsEdges.set(majCorps, toList); }
                toList.push(eid);
                edgeToCorps.set(eid, majCorps);
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 3c: Consolidate Isolated Corps Pockets
// ═══════════════════════════════════════════════════════════════════════════

/**
 * After cross-corps consolidation, a corps may still have disconnected edge
 * components (protected by brigade presence in 3b). This pass overrides that
 * protection for isolated pockets: if a corps's edges form multiple connected
 * components, the smaller components are reassigned to whichever corps
 * dominates the neighboring area. A 1-brigade pocket in Kakanj surrounded by
 * 2nd Corps territory should become 2nd Corps's responsibility.
 *
 * "Isolated" = a connected component of a corps's edges that is NOT part of
 * the corps's largest connected component.
 */
function consolidateIsolatedCorpsPockets(
    corpsEdges: Map<FormationId, string[]>,
    osidFrontEdges: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    formations: Record<FormationId, FormationState>,
    centroids?: OsidCentroidMap,
): void {
    const edgeMeta = new Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>();
    // Reverse index: friendly OSID → front edge IDs touching it
    const osidToFrontEdgeIds = new Map<Osid, string[]>();
    for (const e of osidFrontEdges) {
        edgeMeta.set(e.edge_id, e);
        const friendlyOsid = e.side_a === faction ? e.a : e.side_b === faction ? e.b : null;
        if (friendlyOsid) {
            let list = osidToFrontEdgeIds.get(friendlyOsid);
            if (!list) { list = []; osidToFrontEdgeIds.set(friendlyOsid, list); }
            list.push(e.edge_id);
        }
    }

    // Build reverse lookup: edge → corps
    const edgeToCorps = new Map<string, FormationId>();
    for (const [corpsId, edges] of corpsEdges) {
        for (const eid of edges) edgeToCorps.set(eid, corpsId);
    }

    // Process each corps: find connected components of its edges
    for (const corpsId of [...corpsEdges.keys()].sort(strictCompare)) {
        const edges = corpsEdges.get(corpsId);
        if (!edges || edges.length <= 1) continue;

        // Build edge adjacency for this corps's edges only (friendly-side)
        const edgeAdj = buildEdgeAdjacency(edges, edgeMeta, faction, adjacency, undefined, centroids);

        // Find connected components
        const components = findConnectedComponents(
            new Set(edges),
            (eid) => edgeAdj.get(eid) ?? [],
        );
        if (components.length <= 1) continue; // Single component — no isolation

        // Find the largest component (the corps's "main body")
        let largestIdx = 0;
        for (let i = 1; i < components.length; i++) {
            if (components[i]!.size > components[largestIdx]!.size) largestIdx = i;
        }

        // Reassign all non-largest components to neighboring corps
        for (let ci = 0; ci < components.length; ci++) {
            if (ci === largestIdx) continue;
            const isolatedEdges = [...components[ci]!];

            // GOLDEN RULE: If a home brigade is present in the pocket, protect it.
            let homeBrigadePresent = false;
            for (const eid of isolatedEdges) {
                const meta = edgeMeta.get(eid);
                if (!meta) continue;
                const friendlyOsid = meta.side_a === faction ? meta.a : meta.b;
                for (const f of Object.values(formations)) {
                    if (f.faction === faction && f.location_osid === friendlyOsid && getFormationCorpsId(f) === corpsId) {
                        homeBrigadePresent = true;
                        break;
                    }
                }
                if (homeBrigadePresent) break;
            }
            if (homeBrigadePresent) continue;

            // Find the best neighboring corps by counting adjacent edges from other corps.

            // Use osidToFrontEdgeIds reverse index instead of scanning all front edges.
            const neighborCorpsCounts = new Map<FormationId, number>();
            for (const eid of isolatedEdges) {
                const meta = edgeMeta.get(eid);
                if (!meta) continue;
                const friendlyOsid = meta.side_a === faction ? meta.a : meta.b;
                // Check OSID neighbors for edges belonging to other corps
                const osidsToCheck = [friendlyOsid, ...(adjacency.get(friendlyOsid) ?? [])];
                for (const checkOsid of osidsToCheck) {
                    for (const candidateEid of osidToFrontEdgeIds.get(checkOsid) ?? []) {
                        const candidateCorps = edgeToCorps.get(candidateEid);
                        if (!candidateCorps || candidateCorps === corpsId) continue;
                        neighborCorpsCounts.set(candidateCorps, (neighborCorpsCounts.get(candidateCorps) ?? 0) + 1);
                    }
                }
            }

            // Pick the neighbor corps with the most adjacent edges (deterministic tiebreak)
            let bestNeighbor: FormationId | null = null;
            let bestCount = 0;
            for (const [nCorps, count] of [...neighborCorpsCounts.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
                if (count > bestCount || (count === bestCount && bestNeighbor !== null && strictCompare(nCorps, bestNeighbor) < 0)) {
                    bestNeighbor = nCorps;
                    bestCount = count;
                }
            }
            if (!bestNeighbor) continue; // No neighbor found — keep as-is (true enclave)

            // Reassign edges from isolated pocket to neighbor corps
            for (const eid of isolatedEdges) {
                const currentList = corpsEdges.get(corpsId);
                if (currentList) {
                    const idx = currentList.indexOf(eid);
                    if (idx >= 0) currentList.splice(idx, 1);
                }
                let targetList = corpsEdges.get(bestNeighbor);
                if (!targetList) { targetList = []; corpsEdges.set(bestNeighbor, targetList); }
                targetList.push(eid);
                edgeToCorps.set(eid, bestNeighbor);
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 4: Build Multi-Sector from Sub-Segments
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum front edges for a sub-segment to be promoted to its own sector. */
export { MIN_SECTOR_EDGES } from './corps_front_sectors_constants.js';

/** Maximum edges per sector before forced split at midpoint. */
export { MAX_SECTOR_EDGES } from './corps_front_sectors_constants.js';

/** Maximum brigades per sector before forced split. */
export { MAX_SECTOR_BRIGADES } from './corps_front_sectors_constants.js';


/** Maximum reserve brigades per sector. */
export { MAX_RESERVES_PER_SECTOR } from './corps_front_sectors_constants.js';

/**
 * Decompose a corps' front edges into connected sub-segments via BFS.
 */
function findSubSegments(
    corpsId: FormationId,
    faction: FactionId,
    edgeIds: string[],
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    osidAdjacency: Map<Osid, Osid[]>,
    sharedBoundaryAdj?: Map<Osid, Osid[]>,
    centroids?: OsidCentroidMap,
): CorpsFrontSubSegment[] {
    const edgeSet = new Set(edgeIds);
    // Build edge adjacency for these edges only (friendly-side)
    const edgeAdj = buildEdgeAdjacency(edgeIds, edgeMeta, faction, osidAdjacency, sharedBoundaryAdj, centroids);
    const visited = new Set<string>();
    const subSegments: CorpsFrontSubSegment[] = [];
    let segIndex = 0;

    const sortedEdgeIds = [...edgeIds].sort(strictCompare);
    for (const seed of sortedEdgeIds) {
        if (visited.has(seed)) continue;

        const component: string[] = [];
        const stack = [seed];
        visited.add(seed);

        while (stack.length > 0) {
            const eid = stack.pop()!;
            component.push(eid);
            const neighbors = edgeAdj.get(eid) ?? [];
            for (const next of neighbors) {
                if (visited.has(next)) continue;
                if (!edgeSet.has(next)) continue;
                visited.add(next);
                stack.push(next);
            }
        }

        component.sort(strictCompare);

        const friendlyOsids = new Set<string>();
        const enemyOsids = new Set<string>();

        for (const eid of component) {
            const meta = edgeMeta.get(eid);
            if (!meta) continue;
            if (meta.side_a === faction) {
                friendlyOsids.add(meta.a);
                enemyOsids.add(meta.b);
            } else {
                friendlyOsids.add(meta.b);
                enemyOsids.add(meta.a);
            }
        }

        subSegments.push({
            sub_segment_id: `subseg:${corpsId}:${segIndex}`,
            edge_ids: component,
            friendly_osids: [...friendlyOsids].sort(strictCompare),
            enemy_osids: [...enemyOsids].sort(strictCompare),
            length_edges: component.length,
            primary_brigade_ids: [],
        });
        segIndex++;
    }

    return subSegments;
}

/**
 * Build multi-sector output for a corps from its assigned front edge IDs.
 *
 * Pipeline:
 *   1. Find connected components (sub-segments) via BFS on edge adjacency
 *   2. Split oversized components at midpoint (Phase 1D: MAX_SECTOR_EDGES)
 *   3. Build sectors, assign brigades (front + interior via BFS)
 *   4. Populate reserves from interior brigades (Phase 1C)
 *   5. Post-pass: split sectors exceeding MAX_SECTOR_BRIGADES (Phase 1E)
 *
 * Sector IDs: `sector:{corps_id}:0`, `sector:{corps_id}:1`, etc.
 */
function buildMultiSectorsForCorps(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    edgeIds: string[],
    osidFrontEdges: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    adjacency: Map<Osid, Osid[]>,
    sharedBoundaryAdj: Map<Osid, Osid[]>,
    strictAdj: Map<Osid, Osid[]>,
    caseBSplitAdj: Map<Osid, Osid[]>,
    formations: Record<FormationId, FormationState>,
    reverseMap: Map<string, string[]> | null,
    centroids?: OsidCentroidMap,
    friendlyOsids?: Set<string>
): CorpsFrontSector[] {
    if (edgeIds.length === 0) return [];

    // Build edge metadata lookup
    const edgeMeta = new Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>();
    const allFriendly = friendlyOsids ?? new Set<string>();

    for (const eid of edgeIds) {
        const sep = eid.indexOf('__');
        if (sep < 0) continue;
        const osidA = eid.slice(0, sep);
        const osidB = eid.slice(sep + 2);
        edgeMeta.set(eid, {
            a: osidA,
            b: osidB,
            side_a: getPoliticalControllerOSID(state, osidA, reverseMap ?? undefined),
            side_b: getPoliticalControllerOSID(state, osidB, reverseMap ?? undefined),
        });

    }

    // Step 1: Find connected components via triple-junction connectivity.
    // Pass sharedBoundaryAdj so Case A/B only connect edges at true polygon
    // boundaries (≤5.5m). Without this, distance_contact adjacency (>33m) bridges
    // disconnected fronts — e.g. hajderovici_2↔kamensko_2 (38m) bridges Zavidovici
    // to Olovo via Case B at gornja_borovica_2.
    let subSegments = findSubSegments(corpsId, faction, edgeIds, edgeMeta, adjacency, sharedBoundaryAdj, centroids);
    // Proposal B: merge undersized sub-segments up to MIN_SECTOR_EDGES.
    // Do NOT pass friendlyOsids — merging should use direct OSID adjacency only,
    // not unbounded BFS through rear territory (which merges distant segments).
    subSegments = mergeUndersizedSubSegments(corpsId, subSegments, adjacency, sharedBoundaryAdj);
    if (subSegments.length === 0) return [];

    // Step 2 (Phase 1D): Split oversized sub-segments
    subSegments = splitOversizedSubSegments(corpsId, subSegments, edgeMeta);

    // Renumber sub-segments deterministically
    subSegments.sort((a, b) => strictCompare(a.sub_segment_id, b.sub_segment_id));
    for (let i = 0; i < subSegments.length; i++) {
        subSegments[i]!.sub_segment_id = `subseg:${corpsId}:${i}`;
    }

    // Step 3: Build sectors with full brigade assignment (front + interior BFS)
    const sectors: CorpsFrontSector[] = [];
    for (let i = 0; i < subSegments.length; i++) {
        const sector = buildSectorFromSubSegments(
            state, corpsId, faction, i, [subSegments[i]!], edgeMeta,
            formations
        );
        if (sector) sectors.push(sector);
    }

    // Step 4 (Phase 1E): Recursively split sectors exceeding MAX_SECTOR_BRIGADES
    let sectorPool = sectors;
    let splitOccurred = true;
    while (splitOccurred) {
        splitOccurred = false;
        const next: CorpsFrontSector[] = [];
        for (const sector of sectorPool) {
            const total = sector.assigned_brigade_ids.length + sector.reserve_brigade_ids.length;
            if (total > MAX_SECTOR_BRIGADES && sector.length_edges >= 4) {
                const halves = splitSubSegmentAtMidpoint(sector.sub_segments[0]!, corpsId, edgeMeta);
                if (halves) {
                    for (const half of halves) {
                        const s = buildSectorFromSubSegments(
                            state, corpsId, faction, next.length, [half],
                            edgeMeta, formations
                        );
                        if (s) next.push(s);
                    }
                    splitOccurred = true;
                    continue;
                }
            }
            sector.sector_id = `sector:${corpsId}:${next.length}`;
            next.push(sector);
        }
        sectorPool = next;
    }
    const finalSectors = sectorPool;

    // Dedup: Phase 1E splits can produce the same brigade in two sectors when
    // a junction OSID has edges on both sides of a midpoint split.
    deduplicateBrigadesAcrossSectors(finalSectors);

    // Step 4b: Split non-contiguous sectors using triple-junction connectivity.
    // Edges sharing a friendly OSID are only on the same front LINE if their
    // hostile sides are also adjacent (and vice versa). This correctly splits
    // at branching points where a single OSID faces multiple hostile directions.
    // Uses sharedBoundaryAdj (same as findSubSegments) so Case A/B only connect
    // at true polygon boundaries, matching the front edge filter threshold.
    // Strict Case B re-check uses caseBSplitAdj (16.6m) — wider than 5.5m strict
    // to preserve legitimate triple junctions, but catches pocket bridges (>16.6m).
    const contiguousSectors = splitNonContiguousSectors(
        finalSectors, adjacency, faction, edgeMeta, sharedBoundaryAdj, friendlyOsids, caseBSplitAdj
    );

    // Step 4c: Post-split merge — re-merge undersized sectors created by contiguity
    // splits back into adjacent same-corps sectors. Uses caseBSplitAdj (16.6m) for
    // edge adjacency — same threshold as the split, so merges never re-bridge
    // connections that were cut. Friendly BFS component gate provides additional
    // safety against merging sectors separated by enemy territory.
    const mergedSectors = mergeUndersizedSectors(
        corpsId, contiguousSectors, edgeMeta, faction, caseBSplitAdj, friendlyOsids
    );

    // Brigade assignment (territory_osids, assigned/reserve classification) is now
    // handled faction-wide by assignTerritoryVoronoi + classifyBrigadesByTerritory
    // in buildFactionSectors Steps 5-6.

    // Filter ghost/orphan sectors: require at least 1 front edge.
    // Sectors with territory but 0 edges are pockets that lost their front — prune them.
    return mergedSectors.filter(s => s.length_edges > 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 1D: Split Oversized Sub-Segments
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Recursively split sub-segments exceeding MAX_SECTOR_EDGES at their midpoint.
 * After each split, decomposes halves into connected components to guarantee
 * geographic contiguity (midpoint split on branching graphs can fragment).
 */
function splitOversizedSubSegments(
    corpsId: FormationId,
    subSegments: CorpsFrontSubSegment[],
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>
): CorpsFrontSubSegment[] {
    const result: CorpsFrontSubSegment[] = [];

    for (const seg of subSegments) {
        if (seg.length_edges <= MAX_SECTOR_EDGES) {
            result.push(seg);
            continue;
        }
        // Try to split at midpoint
        const halves = splitSubSegmentAtMidpoint(seg, corpsId, edgeMeta);
        if (!halves) {
            result.push(seg); // Can't split — keep as-is
            continue;
        }
        // Ensure contiguity: decompose each half into connected components,
        // then recurse on oversized components
        for (const half of halves) {
            const components = decomposeIntoConnectedComponents(half, corpsId, edgeMeta);
            for (const comp of components) {
                if (comp.length_edges > MAX_SECTOR_EDGES) {
                    result.push(...splitOversizedSubSegments(corpsId, [comp], edgeMeta));
                } else {
                    result.push(comp);
                }
            }
        }
    }

    return result;
}

/**
 * Decompose a sub-segment into connected components via BFS on edge adjacency.
 * Returns one component if already contiguous, multiple if fragmented.
 */
function decomposeIntoConnectedComponents(
    seg: CorpsFrontSubSegment,
    corpsId: FormationId,
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>
): CorpsFrontSubSegment[] {
    const adj = buildEdgeAdjacency(seg.edge_ids, edgeMeta);
    const edgeSet = new Set(seg.edge_ids);
    const visited = new Set<string>();
    const components: CorpsFrontSubSegment[] = [];
    let idx = 0;

    const sortedEdges = [...seg.edge_ids].sort(strictCompare);
    for (const seed of sortedEdges) {
        if (visited.has(seed)) continue;
        const component: string[] = [];
        const stack = [seed];
        visited.add(seed);
        while (stack.length > 0) {
            const eid = stack.pop()!;
            component.push(eid);
            for (const next of adj.get(eid) ?? []) {
                if (visited.has(next) || !edgeSet.has(next)) continue;
                visited.add(next);
                stack.push(next);
            }
        }
        component.sort(strictCompare);
        components.push(buildSubSegmentFromEdges(corpsId, idx++, component, edgeMeta, seg));
    }

    return components;
}

/**
 * Split a sub-segment at its edge-chain midpoint.
 * Walks from one end of the edge chain, splits at the halfway mark.
 * Returns two sub-segments, or null if the segment can't be meaningfully split.
 */
function splitSubSegmentAtMidpoint(
    seg: CorpsFrontSubSegment,
    corpsId: FormationId,
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>
): [CorpsFrontSubSegment, CorpsFrontSubSegment] | null {
    if (seg.length_edges < 4) return null;

    // Build local adjacency and walk the edge chain to find ordering
    const adj = buildEdgeAdjacency(seg.edge_ids, edgeMeta);
    const chain = walkEdgeChain(seg.edge_ids, adj);
    const mid = Math.floor(chain.length / 2);
    const firstHalf = chain.slice(0, mid);
    const secondHalf = chain.slice(mid);

    if (firstHalf.length === 0 || secondHalf.length === 0) return null;

    return [
        buildSubSegmentFromEdges(corpsId, 0, firstHalf, edgeMeta, seg),
        buildSubSegmentFromEdges(corpsId, 1, secondHalf, edgeMeta, seg),
    ];
}

/**
 * BFS traversal from an endpoint edge to produce a geographic ordering.
 * BFS ensures nearby edges are visited first, giving a spatial ordering
 * suitable for midpoint splitting even on branching front graphs.
 */
function walkEdgeChain(
    edgeIds: string[],
    adj: Map<string, string[]>
): string[] {
    const edgeSet = new Set(edgeIds);
    const sorted = [...edgeIds].sort(strictCompare);

    // Find an endpoint (degree 1 in the edge graph) as starting point
    let start = sorted[0]!;
    for (const eid of sorted) {
        const neighbors = (adj.get(eid) ?? []).filter(n => edgeSet.has(n));
        if (neighbors.length <= 1) { start = eid; break; }
    }

    // BFS traversal — visits all neighbors, geographic ordering
    const visited = new Set<string>();
    const chain: string[] = [];
    const queue: string[] = [start];
    visited.add(start);

    while (queue.length > 0) {
        const eid = queue.shift()!;
        chain.push(eid);
        const neighbors = (adj.get(eid) ?? []).filter(n => edgeSet.has(n) && !visited.has(n));
        neighbors.sort(strictCompare);
        for (const n of neighbors) {
            visited.add(n);
            queue.push(n);
        }
    }

    // Safety fallback for disconnected edges (shouldn't happen in connected component)
    for (const eid of sorted) {
        if (!visited.has(eid)) chain.push(eid);
    }

    return chain;
}

/**
 * Build a CorpsFrontSubSegment from a subset of edge IDs.
 */
function buildSubSegmentFromEdges(
    corpsId: FormationId,
    indexHint: number,
    edgeIds: string[],
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    parentSeg: CorpsFrontSubSegment
): CorpsFrontSubSegment {
    const edgeSet = new Set(edgeIds);
    const friendlyOsids = new Set<string>();
    const enemyOsids = new Set<string>();

    // Derive faction from parent segment's OSID sets
    for (const eid of edgeIds) {
        const meta = edgeMeta.get(eid);
        if (!meta) continue;
        // An OSID is friendly if it was in the parent's friendly set
        if (parentSeg.friendly_osids.includes(meta.a)) {
            friendlyOsids.add(meta.a);
            enemyOsids.add(meta.b);
        } else {
            friendlyOsids.add(meta.b);
            enemyOsids.add(meta.a);
        }
    }

    edgeIds.sort(strictCompare);
    return {
        sub_segment_id: `subseg:${corpsId}:split${indexHint}`,
        edge_ids: edgeIds,
        friendly_osids: [...friendlyOsids].sort(strictCompare),
        enemy_osids: [...enemyOsids].sort(strictCompare),
        length_edges: edgeIds.length,
        primary_brigade_ids: [],
    };
}

/**
 * Build a single CorpsFrontSector from one or more sub-segments.
 */
function buildSectorFromSubSegments(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    sectorIndex: number,
    subSegments: CorpsFrontSubSegment[],
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    formations: Record<FormationId, FormationState>
): CorpsFrontSector | null {
    if (subSegments.length === 0) return null;

    const allEdgeIds = new Set<string>();
    const allFriendlyOsids = new Set<string>();
    const allEnemyOsids = new Set<string>();
    const allOpposingFactions = new Set<string>();

    for (const ss of subSegments) {
        for (const eid of ss.edge_ids) allEdgeIds.add(eid);
        for (const o of ss.friendly_osids) allFriendlyOsids.add(o);
        for (const o of ss.enemy_osids) allEnemyOsids.add(o);
        for (const eid of ss.edge_ids) {
            const meta = edgeMeta.get(eid);
            if (!meta) continue;
            const enemy = meta.side_a === faction ? meta.side_b : meta.side_a;
            if (enemy) allOpposingFactions.add(enemy);
        }
    }

    const sortedEdgeIds = [...allEdgeIds].sort(strictCompare);
    const totalEdges = sortedEdgeIds.length;

    // Per-sector brigade assignment: brigade at OSID in sector's friendly_osids
    const assignedBrigadeIds: FormationId[] = [];
    const sortedFormIds = Object.keys(formations).sort(strictCompare);
    for (const fid of sortedFormIds) {
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid || !allFriendlyOsids.has(f.location_osid)) continue;
        if (getFormationCorpsId(f) !== corpsId) continue;
        assignedBrigadeIds.push(fid);
    }

    const density = totalEdges > 0 ? assignedBrigadeIds.length / totalEdges : 0;
    const defensivePower = computeLocalFrontDefensivePower(
        formations, assignedBrigadeIds, totalEdges
    );

    let enemyPower = 0;
    for (const fid of sortedFormIds) {
        const f = formations[fid];
        if (!f || f.faction === faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid || !allEnemyOsids.has(f.location_osid)) continue;
        enemyPower += f.personnel ?? 0;
    }
    const threatRatio = defensivePower > 0 ? enemyPower / defensivePower : 0;

    return {
        sector_id: `sector:${corpsId}:${sectorIndex}`,
        corps_id: corpsId,
        faction,
        opposing_factions: [...allOpposingFactions].sort(strictCompare) as FactionId[],
        edge_ids: sortedEdgeIds,
        sub_segments: subSegments,
        length_edges: totalEdges,
        territory_osids: [],
        assigned_brigade_ids: assignedBrigadeIds,
        reserve_brigade_ids: [],
        density,
        threat_ratio: threatRatio,
        defensive_power: defensivePower,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

/**
 * BFS from startOsid through friendly territory to find the nearest OSID
 * belonging to a sector. If allowedSectorIdxs is provided, only sectors
 * in that set are considered (used for corps-strict assignment).
 * Returns the sector index, or null if unreachable.
 */
function bfsToNearestSector(
    startOsid: string,
    osidToSectorIdx: Map<string, number>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    allowedSectorIdxs?: number[]
): number | null {
    const allowed = allowedSectorIdxs ? new Set(allowedSectorIdxs) : null;

    // Quick check: already at a sector OSID?
    const direct = osidToSectorIdx.get(startOsid);
    if (direct !== undefined && (!allowed || allowed.has(direct))) return direct;

    // BFS through friendly territory (adjacency lists are pre-sorted by buildOsidAdjacency)
    const visited = new Set<string>();
    visited.add(startOsid);
    const queue: string[] = [startOsid];
    let head = 0;

    while (head < queue.length) {
        const osid = queue[head++]!;
        const neighbors = adjacency.get(osid) ?? [];
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            if (!friendlyOsids.has(n)) continue;
            visited.add(n);

            const sIdx = osidToSectorIdx.get(n);
            if (sIdx !== undefined && (!allowed || allowed.has(sIdx))) return sIdx;

            queue.push(n);
        }
    }

    return null; // Unreachable (enclave with no front edges)
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 7: Minimum Sector Coverage
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ensure every sector has at least one assigned brigade.
 *
 * For sectors with 0 assigned brigades:
 *   1. Promote the first reserve brigade to assigned (if any exist).
 *   2. Otherwise, BFS from the sector's friendly OSIDs to find the nearest
 *      brigade in a surplus sector (>1 assigned) and transfer it.
 *
 * "Assigned" here means the brigade is physically present at a front OSID of
 * the sector. Reserves are interior brigades BFS-assigned as backup.
 * Deterministic: sorted iteration throughout.
 */
function ensureMinimumSectorCoverage(
    allSectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    componentOf: Map<string, number>
): void {
    // Group by corps — only transfer within the same corps
    const sectorsByCorps = new Map<FormationId, CorpsFrontSector[]>();
    for (const s of allSectors) {
        const list = sectorsByCorps.get(s.corps_id) ?? [];
        list.push(s);
        sectorsByCorps.set(s.corps_id, list);
    }

    for (const [, corpsSectors] of [...sectorsByCorps.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        for (const sector of corpsSectors) {
            if (sector.assigned_brigade_ids.length > 0) continue;

            const sectorComp = getSectorComponent(sector, componentOf);

            // Step 1: promote first connected reserve to assigned
            // Only promote reserves whose location is reachable from sector
            // through friendly territory (skip disconnected pocket reserves).
            {
                const sectorFriendly = getSectorFrontOsids(sector);
                let promoted = false;
                for (let ri = 0; ri < sector.reserve_brigade_ids.length; ri++) {
                    const bid = sector.reserve_brigade_ids[ri]!;
                    const f = formations[bid];
                    if (!f?.location_osid) continue;
                    // Check connectivity: BFS from brigade location through friendly to sector
                    const reachable = bfsToNearestSector(
                        f.location_osid,
                        new Map([...sectorFriendly].map(o => [o, 0])),
                        adjacency, friendlyOsids
                    );
                    if (reachable !== null) {
                        sector.reserve_brigade_ids.splice(ri, 1);
                        sector.assigned_brigade_ids.push(bid);
                        promoted = true;
                        break;
                    }
                }
                if (promoted) continue;
            }

            // Step 2: transfer one non-front brigade from a surplus corps sector (>1 assigned).
            // Step 3 fallback: if no non-front brigade available, take any brigade from
            // the highest-surplus donor (>2 assigned preferred, >1 as last resort).
            {
                // Only transfer from sectors in the same connected component —
                // brigades can't march through enemy territory to reach a pocket.
                const surplusSectors = corpsSectors
                    .filter(s => s.assigned_brigade_ids.length > 1
                        && s.sector_id !== sector.sector_id
                        && getSectorComponent(s, componentOf) === sectorComp)
                    .sort((a, b) => b.assigned_brigade_ids.length - a.assigned_brigade_ids.length || strictCompare(a.sector_id, b.sector_id));

                let transferred = false;
                // Step 2: prefer non-front-line brigade
                for (const donor of surplusSectors) {
                    const donorFront = getSectorFrontOsids(donor);
                    for (const bid of [...donor.assigned_brigade_ids].sort(strictCompare)) {
                        const f = formations[bid];
                        if (!f?.location_osid) continue;
                        if (donorFront.has(f.location_osid)) continue;
                        const idx = donor.assigned_brigade_ids.indexOf(bid);
                        if (idx >= 0) donor.assigned_brigade_ids.splice(idx, 1);
                        sector.assigned_brigade_ids.push(bid);
                        transferred = true;
                        break;
                    }
                    if (transferred) break;
                }
                // Step 3: fallback — take any brigade from highest-surplus donor
                if (!transferred) {
                    for (const donor of surplusSectors) {
                        if (donor.assigned_brigade_ids.length <= 1) continue;
                        const bid = donor.assigned_brigade_ids[donor.assigned_brigade_ids.length - 1]!;
                        donor.assigned_brigade_ids.pop();
                        sector.assigned_brigade_ids.push(bid);
                        transferred = true;
                        break;
                    }
                }
            }
        }
    }

    // ── Density floor pass (n701→n750): reinforce under-pressure thin fronts ──
    // After the 0-brigade rescue, transfer surplus brigades from over-staffed sectors
    // to under-staffed sectors that are under active enemy pressure (threat_ratio gate).
    // n750: EPB 8→4 (tighter floor), gate 300→200 (catches moderate-high threat),
    // component restriction removed (corps commander orders march regardless of
    // territory connectivity — the march system handles cross-component movement).
    // n758: Constants unchanged from n701. The 1KK density problem (sector:9
    // threat=240, 2 brigades on 9 edges while sector:5 has 6 on 9) cannot be fixed
    // by EPB/gate alone — EPB=4 causes VRS over-concentration (Teočak falls),
    // cross-component removal causes -1.2pp regression. Needs density-ratio-based
    // approach (relative density within corps) rather than absolute threshold.
    const DENSITY_FLOOR_EDGES_PER_BRIGADE = 8;
    const DENSITY_FLOOR_THREAT_GATE = 300; // only reinforce sectors under real pressure
    const needed = (s: CorpsFrontSector): number =>
        Math.max(1, Math.ceil(s.length_edges / DENSITY_FLOOR_EDGES_PER_BRIGADE));

    for (const [, corpsSectors] of [...sectorsByCorps.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        // Under-staffed under pressure: has brigades but fewer than needed, AND threat is high
        const underStaffed = corpsSectors
            .filter(s =>
                s.assigned_brigade_ids.length > 0
                && s.assigned_brigade_ids.length < needed(s)
                && (s.threat_ratio ?? 0) > DENSITY_FLOOR_THREAT_GATE)
            .sort((a, b) =>
                (needed(b) - b.assigned_brigade_ids.length) - (needed(a) - a.assigned_brigade_ids.length)
                || strictCompare(a.sector_id, b.sector_id));

        for (const recipient of underStaffed) {
            const deficit = needed(recipient) - recipient.assigned_brigade_ids.length;

            // Find donors with surplus above their own floor.
            const recipComp = getSectorComponent(recipient, componentOf);
            // Find same-component donors with surplus above their own floor
            const donors = corpsSectors
                .filter(s =>
                    s.sector_id !== recipient.sector_id
                    && getSectorComponent(s, componentOf) === recipComp
                    && s.assigned_brigade_ids.length > needed(s))
                .sort((a, b) =>
                    (b.assigned_brigade_ids.length - needed(b)) - (a.assigned_brigade_ids.length - needed(a))
                    || strictCompare(a.sector_id, b.sector_id));

            let transferred = 0;
            for (const donor of donors) {
                if (transferred >= deficit) break;
                if (donor.assigned_brigade_ids.length <= needed(donor)) continue;

                // Prefer a non-frontline brigade to minimize disruption
                const donorFront = getSectorFrontOsids(donor);
                let bid: string | undefined;
                for (const b of [...donor.assigned_brigade_ids].sort(strictCompare)) {
                    const f = formations[b];
                    if (f?.location_osid && !donorFront.has(f.location_osid)) { bid = b; break; }
                }
                // Fallback: take the last brigade if still surplus after home-front check
                if (!bid && donor.assigned_brigade_ids.length > needed(donor)) {
                    bid = donor.assigned_brigade_ids[donor.assigned_brigade_ids.length - 1];
                }
                if (!bid) continue;

                const idx = donor.assigned_brigade_ids.indexOf(bid);
                if (idx >= 0) {
                    donor.assigned_brigade_ids.splice(idx, 1);
                    recipient.assigned_brigade_ids.push(bid);
                    transferred++;
                }
            }
        }
    }

    // ── Idle equalization pass (Step 7c): spread brigades from quiet over-dense sectors ──
    // Step 7b only fires when recipients are under attack (threat > 300).
    // This pass fills the gap: when a sector is over-dense AND quiet (almost no enemy pressure),
    // it donates surplus brigades to thin same-component sectors regardless of recipient threat.
    // Prevents home-municipality affinity from permanently stacking brigades on quiet sectors
    // while adjacent thin sectors go under-covered (e.g. 1KK 9-brigade sector at threat=6
    // while 2-brigade sectors at threat=37–57 go unreinforced by Step 7b).
    //
    // SAFETY: only takes from sectors with very low threat (donor gate). This prevents the
    // -1.5pp regression seen when equalization pulled brigades from sectors under real pressure.
    // Only takes non-frontline brigades (same rule as Step 7b).
    const EQUALIZATION_DONOR_MAX_THREAT = 25;       // donor must be essentially inactive
    const EQUALIZATION_MIN_DONOR_DENSITY = 0.90;   // donor must be clearly over-packed
    const EQUALIZATION_MAX_RECIP_DENSITY = 0.25;   // recipient must be clearly thin
    const EQUALIZATION_MAX_TRANSFERS = 1;           // conservative: 1 brigade per turn

    for (const [, corpsSectors] of [...sectorsByCorps.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        const overDense = corpsSectors
            .filter(s =>
                s.assigned_brigade_ids.length > 1
                && s.length_edges > 0
                && s.assigned_brigade_ids.length / s.length_edges >= EQUALIZATION_MIN_DONOR_DENSITY
                && (s.threat_ratio ?? 0) <= EQUALIZATION_DONOR_MAX_THREAT)
            .sort((a, b) =>
                (b.assigned_brigade_ids.length / b.length_edges)
                - (a.assigned_brigade_ids.length / a.length_edges)
                || strictCompare(a.sector_id, b.sector_id));

        const thin = corpsSectors
            .filter(s =>
                s.assigned_brigade_ids.length > 0
                && s.length_edges > 0
                && s.assigned_brigade_ids.length / s.length_edges < EQUALIZATION_MAX_RECIP_DENSITY)
            .sort((a, b) =>
                (a.assigned_brigade_ids.length / a.length_edges)
                - (b.assigned_brigade_ids.length / b.length_edges)
                || strictCompare(a.sector_id, b.sector_id));

        for (const recipient of thin) {
            const recipComp = getSectorComponent(recipient, componentOf);
            let transferred = 0;

            for (const donor of overDense) {
                if (transferred >= EQUALIZATION_MAX_TRANSFERS) break;
                if (donor.sector_id === recipient.sector_id) continue;
                if (getSectorComponent(donor, componentOf) !== recipComp) continue;
                // Re-check density still justifies transfer after previous transfers
                if (donor.assigned_brigade_ids.length / donor.length_edges < EQUALIZATION_MIN_DONOR_DENSITY) continue;

                // Only take non-frontline brigades — don't strip front-line coverage
                const donorFront = getSectorFrontOsids(donor);
                let bid: string | undefined;
                for (const b of [...donor.assigned_brigade_ids].sort(strictCompare)) {
                    const f = formations[b];
                    if (f?.location_osid && !donorFront.has(f.location_osid)) { bid = b; break; }
                }
                if (!bid) continue;

                const idx = donor.assigned_brigade_ids.indexOf(bid);
                if (idx >= 0) {
                    donor.assigned_brigade_ids.splice(idx, 1);
                    recipient.assigned_brigade_ids.push(bid);
                    transferred++;
                }
            }
        }
    }

    // ── Moderate-pressure reinforcement pass (Step 7d) ──────────────────────
    // 7b only fires at threat > 300 (acute crisis). 7c only donates from quiet sectors
    // (donor threat ≤ 25). Gap: thin sectors under moderate pressure (threat 50–300)
    // that have no quiet donor available are never reinforced by either pass.
    // This pass targets that gap: thin AND under moderate threat, pulling from
    // over-dense sectors regardless of donor threat level.
    //
    // Safety: only takes non-frontline brigades from donors — same rule as 7b and 7c.
    // Donor density gate (> 0.75) ensures only genuinely over-packed sectors donate.
    const PASS_7D_RECIPIENT_MAX_DENSITY = 0.25;    // recipient must be thin
    const PASS_7D_RECIPIENT_MIN_THREAT = 50;       // recipient must have real pressure
    const PASS_7D_DONOR_MIN_DENSITY = 0.75;        // donor must be over-packed
    const PASS_7D_MAX_TRANSFERS = 2;               // max donations per sector per turn

    for (const [, corpsSectors] of [...sectorsByCorps.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        const recipients = corpsSectors
            .filter(s =>
                s.assigned_brigade_ids.length > 0
                && s.length_edges > 0
                && s.assigned_brigade_ids.length / s.length_edges < PASS_7D_RECIPIENT_MAX_DENSITY
                && (s.threat_ratio ?? 0) >= PASS_7D_RECIPIENT_MIN_THREAT)
            .sort((a, b) =>
                (a.assigned_brigade_ids.length / a.length_edges)
                - (b.assigned_brigade_ids.length / b.length_edges)
                || strictCompare(a.sector_id, b.sector_id));

        for (const recipient of recipients) {
            const recipComp = getSectorComponent(recipient, componentOf);
            let transferred = 0;

            const donors = corpsSectors
                .filter(s =>
                    s.sector_id !== recipient.sector_id
                    && s.assigned_brigade_ids.length > 1
                    && s.length_edges > 0
                    && s.assigned_brigade_ids.length / s.length_edges >= PASS_7D_DONOR_MIN_DENSITY
                    && getSectorComponent(s, componentOf) === recipComp)
                .sort((a, b) =>
                    (b.assigned_brigade_ids.length / b.length_edges)
                    - (a.assigned_brigade_ids.length / a.length_edges)
                    || strictCompare(a.sector_id, b.sector_id));

            for (const donor of donors) {
                if (transferred >= PASS_7D_MAX_TRANSFERS) break;
                // Re-check donor density still justifies transfer
                if (donor.assigned_brigade_ids.length / donor.length_edges < PASS_7D_DONOR_MIN_DENSITY) continue;

                const donorFront = getSectorFrontOsids(donor);
                let bid: string | undefined;
                for (const b of [...donor.assigned_brigade_ids].sort(strictCompare)) {
                    const f = formations[b];
                    if (f?.location_osid && !donorFront.has(f.location_osid)) { bid = b; break; }
                }
                if (!bid) continue;

                const idx = donor.assigned_brigade_ids.indexOf(bid);
                if (idx >= 0) {
                    donor.assigned_brigade_ids.splice(idx, 1);
                    recipient.assigned_brigade_ids.push(bid);
                    transferred++;
                }
            }
        }
    }

    // Sort for determinism
    for (const s of allSectors) s.assigned_brigade_ids.sort(strictCompare);
}

// ═══════════════════════════════════════════════════════════════════════════
// Brigade Deduplication
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Remove brigades that appear in multiple sectors, keeping only the first
 * claim in sector_id order. This fixes the Phase 1E junction-OSID bug where
 * a brigade at an OSID that spans both halves of a midpoint split gets
 * double-assigned. Applies across both assigned and reserve lists.
 */
function deduplicateBrigadesAcrossSectors(sectors: CorpsFrontSector[]): void {
    if (sectors.length <= 1) return;
    const claimed = new Set<FormationId>();
    const sorted = [...sectors].sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    for (const sector of sorted) {
        sector.assigned_brigade_ids = sector.assigned_brigade_ids.filter(bid => {
            if (claimed.has(bid)) return false;
            claimed.add(bid);
            return true;
        });
        sector.reserve_brigade_ids = sector.reserve_brigade_ids.filter(bid => {
            if (claimed.has(bid)) return false;
            claimed.add(bid);
            return true;
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Split Non-Contiguous Sectors
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Split sectors whose friendly OSIDs are not contiguous through OSID adjacency.
 * BFS through each sector's friendly OSIDs; if disconnected components exist,
 * split into one sector per component. Edges are partitioned by which component
 * their friendly-side OSID belongs to. Brigades distributed to the largest component.
 *
 * Deterministic: sorted iteration via strictCompare.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Step 4b: Split Non-Contiguous Sectors (shared-OSID connectivity)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Split sectors whose front edges span disconnected fronts.
 *
 * Uses triple-junction connectivity via buildEdgeAdjacency when faction info
 * is available: two edges are adjacent iff they share a friendly OSID AND
 * their hostile OSIDs are adjacent (Case A), or share a hostile OSID AND
 * their friendly OSIDs are adjacent (Case B). This correctly splits edges
 * at branching points where the front line forks — e.g. one OSID facing
 * hostile territory in multiple directions belongs to separate sectors.
 *
 * Falls back to shared-OSID connectivity when faction info is not provided.
 *
 * For each sector:
 *   1. Build edge adjacency graph (triple-junction or shared-OSID fallback)
 *   2. Find connected components
 *   3. If >1 component, split into separate sectors
 */
export function splitNonContiguousSectors(
    sectors: CorpsFrontSector[],
    osidAdjacency: Map<Osid, Osid[]>,
    faction?: string,
    edgeMeta?: Map<string, { a: string; b: string; side_a?: string | null; side_b?: string | null }>,
    sharedBoundaryAdj?: Map<Osid, Osid[]>,
    friendlyOsids?: Set<string>,
    strictAdj?: Map<Osid, Osid[]>,
): CorpsFrontSector[] {
    const result: CorpsFrontSector[] = [];

    for (const sector of sectors) {
        if (sector.edge_ids.length <= 1) {
            result.push(sector);
            continue;
        }

        // Collect all friendly OSIDs for this sector (used for edge side detection)
        const allFriendly = new Set<string>();
        for (const ss of sector.sub_segments) {
            for (const o of ss.friendly_osids) allFriendly.add(o);
        }

        // Build edge adjacency for this sector's edges.
        // When faction info is available, use triple-junction connectivity
        // (buildEdgeAdjacency) which correctly splits at branching points:
        // edges sharing a friendly OSID are only connected if their hostile
        // sides are also adjacent (and vice versa). This prevents merging
        // edges that face different directions at the same OSID.
        // Falls back to shared-OSID connectivity when faction info is absent.
        // Try to parse edge IDs as osidA__osidB format
        let parsedEdgeCount = 0;
        for (const eid of sector.edge_ids) {
            if (eid.indexOf('__') >= 0) parsedEdgeCount++;
        }

        // Non-standard edge IDs: fall back to OSID-level connectivity
        if (parsedEdgeCount === 0) {
            const osidComponents = findConnectedComponents(
                allFriendly,
                (osid) => osidAdjacency.get(osid as Osid) ?? [],
            );
            if (osidComponents.length <= 1) {
                result.push(sector);
            } else {
                let largestIdx = 0;
                for (let i = 1; i < osidComponents.length; i++) {
                    if (osidComponents[i]!.size > osidComponents[largestIdx]!.size) largestIdx = i;
                }
                for (let ci = 0; ci < osidComponents.length; ci++) {
                    const comp = osidComponents[ci]!;
                    const compEdgeIds = sector.edge_ids.slice();
                    const isLargest = ci === largestIdx;
                    const subSeg: CorpsFrontSubSegment = {
                        sub_segment_id: `subseg:${sector.corps_id}:split${ci}`,
                        edge_ids: isLargest ? compEdgeIds : [],
                        friendly_osids: [...comp].sort(strictCompare),
                        enemy_osids: [...sector.sub_segments.flatMap(ss => ss.enemy_osids)].sort(strictCompare),
                        length_edges: isLargest ? compEdgeIds.length : 0,
                        primary_brigade_ids: [],
                    };
                    result.push({
                        sector_id: `sector:${sector.corps_id}:${result.length}`,
                        corps_id: sector.corps_id,
                        faction: sector.faction,
                        opposing_factions: [...sector.opposing_factions],
                        edge_ids: isLargest ? compEdgeIds : [],
                        sub_segments: [subSeg],
                        length_edges: isLargest ? compEdgeIds.length : 0,
                        territory_osids: sector.territory_osids.filter(o => comp.has(o)),
                        assigned_brigade_ids: isLargest ? [...sector.assigned_brigade_ids] : [],
                        reserve_brigade_ids: isLargest ? [...sector.reserve_brigade_ids] : [],
                        density: 0,
                        threat_ratio: 0,
                        defensive_power: 0,
                        sector_stance: sector.sector_stance ?? 'defend',
                        stance_source: sector.stance_source ?? 'bot',
                    });
                }
            }
            continue;
        }

        // Build edge adjacency for osidA__osidB formatted edges.
        // When faction info is available, use triple-junction connectivity
        // which correctly splits at branching points. Otherwise shared-OSID.
        let edgeAdj: Map<string, string[]>;
        if (faction && edgeMeta) {
            edgeAdj = buildEdgeAdjacency(sector.edge_ids, edgeMeta, faction, osidAdjacency, sharedBoundaryAdj);
        } else {
            const tempMeta = new Map<string, { a: string; b: string }>();
            for (const eid of sector.edge_ids) {
                const sep = eid.indexOf('__');
                if (sep < 0) continue;
                tempMeta.set(eid, { a: eid.slice(0, sep), b: eid.slice(sep + 2) });
            }
            edgeAdj = buildEdgeAdjacency(sector.edge_ids, tempMeta as any);
        }

        // Find connected components of edges
        const edgeComponents = findConnectedComponents(
            new Set(sector.edge_ids),
            (eid) => edgeAdj.get(eid) ?? [],
        );

        // Single component by edge adjacency — but Case B (same hostile, friendly
        // adj) can bridge front edges on opposite sides of enemy pockets.
        // Re-check with intermediate Case B: require fi-H and fj-H both ≤16.6m.
        // Natural gap in Case B distance distribution (15.5m → 24.6m) ensures all
        // legitimate triple junctions pass while pocket bridges (≥24.6m) are cut.
        // Fragments are re-merged in Step 4c using Case A only adjacency.
        if (edgeComponents.length <= 1 && faction && edgeMeta) {
            const strictCaseBAdjMap = buildEdgeAdjacencyStrictCaseB(
                sector.edge_ids, edgeMeta, faction, sharedBoundaryAdj ?? osidAdjacency, strictAdj ?? osidAdjacency
            );
            const strictComponents = findConnectedComponents(
                new Set(sector.edge_ids),
                (eid) => strictCaseBAdjMap.get(eid) ?? [],
            );
            if (strictComponents.length <= 1) {
                result.push(sector);
                continue;
            }

            // Split by strict Case B components
            let largestCi = 0;
            let largestSize = 0;
            for (let ci = 0; ci < strictComponents.length; ci++) {
                if (strictComponents[ci]!.size > largestSize) {
                    largestSize = strictComponents[ci]!.size;
                    largestCi = ci;
                }
            }
            for (let ci = 0; ci < strictComponents.length; ci++) {
                const compEdges = strictComponents[ci]!;
                const compFriendly = new Set<string>();
                const compEnemy = new Set<string>();
                for (const eid of compEdges) {
                    const meta = edgeMeta.get(eid);
                    if (!meta) continue;
                    if (meta.side_a === faction) { compFriendly.add(meta.a); compEnemy.add(meta.b); }
                    else if (meta.side_b === faction) { compFriendly.add(meta.b); compEnemy.add(meta.a); }
                }
                const compEdgeIds = [...compEdges].sort(strictCompare);
                if (compEdgeIds.length === 0) continue;

                const isLargest = ci === largestCi;
                const subSeg: CorpsFrontSubSegment = {
                    sub_segment_id: `subseg:${sector.corps_id}:ftsplit${ci}`,
                    edge_ids: compEdgeIds,
                    friendly_osids: [...compFriendly].sort(strictCompare),
                    enemy_osids: [...compEnemy].sort(strictCompare),
                    length_edges: compEdgeIds.length,
                    primary_brigade_ids: [],
                };
                result.push({
                    sector_id: `sector:${sector.corps_id}:${result.length}`,
                    corps_id: sector.corps_id,
                    faction: sector.faction,
                    opposing_factions: [...sector.opposing_factions],
                    edge_ids: compEdgeIds,
                    sub_segments: [subSeg],
                    length_edges: compEdgeIds.length,
                    territory_osids: sector.territory_osids.filter(o => compFriendly.has(o)),
                    assigned_brigade_ids: isLargest ? [...sector.assigned_brigade_ids] : [],
                    reserve_brigade_ids: isLargest ? [...sector.reserve_brigade_ids] : [],
                    density: 0,
                    threat_ratio: 0,
                    defensive_power: 0,
                    sector_stance: sector.sector_stance ?? 'defend',
                    stance_source: sector.stance_source ?? 'bot',
                });
            }
            continue;
        }

        if (edgeComponents.length <= 1) {
            result.push(sector);
            continue;
        }

        // Multiple components — split sector
        // Find the largest component (for brigade fallback assignment)
        let largestCompIdx = 0;
        let largestCompSize = 0;
        for (let ci = 0; ci < edgeComponents.length; ci++) {
            if (edgeComponents[ci]!.size > largestCompSize) {
                largestCompSize = edgeComponents[ci]!.size;
                largestCompIdx = ci;
            }
        }

        // Build per-component sectors
        for (let ci = 0; ci < edgeComponents.length; ci++) {
            const edgeComp = edgeComponents[ci]!;
            const compFriendly = new Set<string>();
            const compEnemy = new Set<string>();

            // Derive friendly/enemy OSIDs from the edges in this component
            for (const eid of edgeComp) {
                const sep = eid.indexOf('__');
                if (sep < 0) continue;
                const osidA = eid.slice(0, sep);
                const osidB = eid.slice(sep + 2);
                if (allFriendly.has(osidA)) {
                    compFriendly.add(osidA);
                    compEnemy.add(osidB);
                } else {
                    compFriendly.add(osidB);
                    compEnemy.add(osidA);
                }
            }

            const compEdgeIds = [...edgeComp].sort(strictCompare);
            if (compEdgeIds.length === 0 && compFriendly.size === 0) continue;

            const subSeg: CorpsFrontSubSegment = {
                sub_segment_id: `subseg:${sector.corps_id}:split${ci}`,
                edge_ids: compEdgeIds,
                friendly_osids: [...compFriendly].sort(strictCompare),
                enemy_osids: [...compEnemy].sort(strictCompare),
                length_edges: compEdgeIds.length,
                primary_brigade_ids: [],
            };

            // Brigades: all go to the largest component; others get empty lists
            // (classifyBrigadesByTerritory will re-populate after territory Voronoi)
            const isLargest = ci === largestCompIdx;
            // Split territory_osids by component membership
            const compTerritoryOsids = sector.territory_osids.filter(o => compFriendly.has(o));

            const newSector: CorpsFrontSector = {
                sector_id: `sector:${sector.corps_id}:${result.length}`,
                corps_id: sector.corps_id,
                faction: sector.faction,
                opposing_factions: [...sector.opposing_factions],
                edge_ids: compEdgeIds,
                sub_segments: [subSeg],
                length_edges: compEdgeIds.length,
                territory_osids: compTerritoryOsids.sort(strictCompare),
                assigned_brigade_ids: isLargest ? [...sector.assigned_brigade_ids] : [],
                reserve_brigade_ids: isLargest ? [...sector.reserve_brigade_ids] : [],
                density: 0,
                threat_ratio: 0,
                defensive_power: 0,
                sector_stance: sector.sector_stance ?? 'defend',
                stance_source: sector.stance_source ?? 'bot',
            };

            result.push(newSector);
        }
    }

    // Renumber sector IDs deterministically
    result.sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    for (let i = 0; i < result.length; i++) {
        result[i]!.sector_id = `sector:${result[i]!.corps_id}:${i}`;
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Proposal B: Merge Undersized Sub-Segments
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if two sub-segments are adjacent on the front line (triple-junction rule).
 * Two segments are front-adjacent if any of their front edges meet at a polygon
 * triple junction — shared friendly + hostile adj, or shared hostile + friendly adj.
 */
function isSegmentAdjacent(
    a: CorpsFrontSubSegment,
    b: CorpsFrontSubSegment,
    osidAdjacency: Map<Osid, Osid[]>,
    sharedBoundaryAdj?: Map<Osid, Osid[]>,
): boolean {
    const aFriendlySet = new Set(a.friendly_osids);
    const bFriendlySet = new Set(b.friendly_osids);

    type FrontEdge = { friendly: string; hostile: string };
    const parseEdges = (seg: CorpsFrontSubSegment, friendlySet: Set<string>): FrontEdge[] => {
        const result: FrontEdge[] = [];
        for (const eid of seg.edge_ids) {
            const sep = eid.indexOf('__');
            if (sep < 0) continue;
            const osidA = eid.slice(0, sep);
            const osidB = eid.slice(sep + 2);
            if (friendlySet.has(osidA)) result.push({ friendly: osidA, hostile: osidB });
            else if (friendlySet.has(osidB)) result.push({ friendly: osidB, hostile: osidA });
        }
        return result;
    };

    const edgesA = parseEdges(a, aFriendlySet);
    const edgesB = parseEdges(b, bFriendlySet);

    // Both cases use shared-boundary adjacency to avoid bridging through distance contacts.
    const caseAdj = sharedBoundaryAdj ?? osidAdjacency;

    // Check all pairs for triple-junction connectivity
    for (const ea of edgesA) {
        for (const eb of edgesB) {
            // Case A: same friendly, hostile OSIDs share true boundary
            if (ea.friendly === eb.friendly && (caseAdj.get(ea.hostile as Osid) ?? []).includes(eb.hostile)) return true;
            // Case B: same hostile, friendly OSIDs share true boundary
            if (ea.hostile === eb.hostile && (caseAdj.get(ea.friendly as Osid) ?? []).includes(eb.friendly)) return true;
        }
    }

    return false;
}

/**
 * Combine two sub-segments into one, merging their edge IDs and OSID sets.
 */
function mergeSubSegmentsInto(
    corpsId: FormationId,
    indexHint: number,
    a: CorpsFrontSubSegment,
    b: CorpsFrontSubSegment
): CorpsFrontSubSegment {
    const edgeIds = [...new Set([...a.edge_ids, ...b.edge_ids])].sort(strictCompare);
    const friendlyOsids = [...new Set([...a.friendly_osids, ...b.friendly_osids])].sort(strictCompare);
    const enemyOsids = [...new Set([...a.enemy_osids, ...b.enemy_osids])].sort(strictCompare);
    return {
        sub_segment_id: `subseg:${corpsId}:${indexHint}`,
        edge_ids: edgeIds,
        friendly_osids: friendlyOsids,
        enemy_osids: enemyOsids,
        length_edges: edgeIds.length,
        primary_brigade_ids: [],
    };
}

/**
 * Iteratively merge sub-segments below MIN_SECTOR_EDGES into their nearest
 * OSID-adjacent neighbor. Isolated segments (enclaves with no adjacent neighbor)
 * are kept as-is. Always merges the smallest segment first; ties broken by ID.
 */
function mergeUndersizedSubSegments(
    corpsId: FormationId,
    subSegments: CorpsFrontSubSegment[],
    osidAdjacency: Map<Osid, Osid[]>,
    sharedBoundaryAdj?: Map<Osid, Osid[]>,
): CorpsFrontSubSegment[] {
    if (subSegments.length <= 1) return subSegments;

    let segs = subSegments.slice();
    const unmergeableIds = new Set<string>();

    let changed = true;
    while (changed) {
        changed = false;

        let targetIdx = -1;
        let minSize = Infinity;
        for (let i = 0; i < segs.length; i++) {
            const s = segs[i]!;
            if (unmergeableIds.has(s.sub_segment_id)) continue;
            if (s.length_edges < MIN_SECTOR_EDGES) {
                if (s.length_edges < minSize ||
                    (s.length_edges === minSize && targetIdx >= 0 &&
                        strictCompare(s.sub_segment_id, segs[targetIdx]!.sub_segment_id) < 0)) {
                    minSize = s.length_edges;
                    targetIdx = i;
                }
            }
        }
        if (targetIdx === -1) break;

        const target = segs[targetIdx]!;

        let bestIdx = -1;
        let bestSize = Infinity;
        for (let i = 0; i < segs.length; i++) {
            if (i === targetIdx) continue;
            const candidate = segs[i]!;
            if (isSegmentAdjacent(target, candidate, osidAdjacency, sharedBoundaryAdj)) {
                if (candidate.length_edges < bestSize ||
                    (candidate.length_edges === bestSize && bestIdx >= 0 &&
                        strictCompare(candidate.sub_segment_id, segs[bestIdx]!.sub_segment_id) < 0)) {
                    bestSize = candidate.length_edges;
                    bestIdx = i;
                }
            }
        }

        if (bestIdx === -1) {
            unmergeableIds.add(target.sub_segment_id);
            continue;
        }

        const merged = mergeSubSegmentsInto(corpsId, segs.length, target, segs[bestIdx]!);
        const newSegs: CorpsFrontSubSegment[] = [];
        for (let i = 0; i < segs.length; i++) {
            if (i === targetIdx || i === bestIdx) continue;
            newSegs.push(segs[i]!);
        }
        newSegs.push(merged);
        segs = newSegs;
        changed = true;
    }

    segs.sort((a, b) => strictCompare(a.sub_segment_id, b.sub_segment_id));
    for (let i = 0; i < segs.length; i++) {
        segs[i]!.sub_segment_id = `subseg:${corpsId}:${i}`;
    }
    return segs;
}

/**
 * Post-split merge: re-merge undersized sectors (< MIN_SECTOR_EDGES) created by
 * contiguity splitting back into their adjacent same-corps neighbors.
 *
 * Merge eligibility: two sectors can merge if their friendly OSIDs are in the
 * same BFS component through all friendly territory. This is safe because sectors
 * on opposite sides of an enemy pocket are in DIFFERENT friendly BFS components.
 * (Edge adjacency would re-bridge via Case B through hostile OSIDs.)
 *
 * Algorithm: iteratively find the smallest undersized sector, merge it into
 * the smallest adjacent neighbor. Ties broken by sector ID for determinism.
 */
function mergeUndersizedSectors(
    corpsId: FormationId,
    sectors: CorpsFrontSector[],
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    faction: string,
    caseAdj: Map<Osid, Osid[]>,
    friendlyOsids?: Set<string>,
): CorpsFrontSector[] {
    if (sectors.length <= 1) return sectors;

    // Pre-compute friendly BFS components so we know which sectors
    // can safely merge (same friendly territory component) vs which are
    // on opposite sides of an enemy pocket (different components).
    // Build a component ID for each friendly OSID via BFS through all friendly territory.
    const friendlyCompOf = new Map<string, number>();
    if (friendlyOsids && friendlyOsids.size > 0) {
        let compId = 0;
        const allFriendly = [...friendlyOsids].sort(strictCompare);
        for (const start of allFriendly) {
            if (friendlyCompOf.has(start)) continue;
            const visited = new Set<string>([start]);
            const queue = [start];
            while (queue.length > 0) {
                const cur = queue.shift()!;
                for (const nb of (caseAdj.get(cur as Osid) ?? [])) {
                    if (!visited.has(nb) && friendlyOsids.has(nb)) {
                        visited.add(nb);
                        queue.push(nb);
                    }
                }
            }
            for (const v of visited) friendlyCompOf.set(v, compId);
            compId++;
        }
    }

    // Get the friendly BFS component for a sector (component of its first friendly OSID)
    const getSectorComp = (sector: CorpsFrontSector): number | undefined => {
        for (const ss of sector.sub_segments) {
            for (const o of ss.friendly_osids) {
                const c = friendlyCompOf.get(o);
                if (c !== undefined) return c;
            }
        }
        return undefined;
    };

    let pool = sectors.slice();
    const unmergeableIds = new Set<string>();

    let changed = true;
    while (changed) {
        changed = false;

        // Find smallest undersized sector
        let targetIdx = -1;
        let minSize = Infinity;
        for (let i = 0; i < pool.length; i++) {
            const s = pool[i]!;
            if (unmergeableIds.has(s.sector_id)) continue;
            if (s.length_edges < MIN_SECTOR_EDGES) {
                if (s.length_edges < minSize ||
                    (s.length_edges === minSize && targetIdx >= 0 &&
                        strictCompare(s.sector_id, pool[targetIdx]!.sector_id) < 0)) {
                    minSize = s.length_edges;
                    targetIdx = i;
                }
            }
        }
        if (targetIdx === -1) break;

        const target = pool[targetIdx]!;
        const targetComp = getSectorComp(target);

        // Find the smallest neighbor to merge into.
        // Two sectors can merge if they're in the same friendly BFS component
        // AND their edges are adjacent by standard Cases A+B.
        // Being in the same BFS component guarantees they're on the same side
        // of any enemy pocket. Edge adjacency ensures they're neighbors on
        // the front line (not just in the same broad territory).
        let bestIdx = -1;
        let bestSize = Infinity;
        for (let i = 0; i < pool.length; i++) {
            if (i === targetIdx) continue;
            const candidate = pool[i]!;
            // Must be in the same friendly territory component
            if (targetComp !== undefined) {
                const candComp = getSectorComp(candidate);
                if (candComp !== undefined && candComp !== targetComp) continue;
            }
            if (!areSectorsEdgeAdjacent(target, candidate, edgeMeta, faction, caseAdj)) continue;
            if (candidate.length_edges < bestSize ||
                (candidate.length_edges === bestSize && bestIdx >= 0 &&
                    strictCompare(candidate.sector_id, pool[bestIdx]!.sector_id) < 0)) {
                bestSize = candidate.length_edges;
                bestIdx = i;
            }
        }

        if (bestIdx === -1) {
            unmergeableIds.add(target.sector_id);
            continue;
        }

        // Merge target into best neighbor
        const merged = mergeSectors(corpsId, pool[bestIdx]!, target, pool.length);
        const next: CorpsFrontSector[] = [];
        for (let i = 0; i < pool.length; i++) {
            if (i === targetIdx || i === bestIdx) continue;
            next.push(pool[i]!);
        }
        next.push(merged);
        pool = next;
        // Clear unmergeable set — neighbors changed, retry previously isolated sectors
        unmergeableIds.clear();
        changed = true;
    }

    // Renumber deterministically
    pool.sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    for (let i = 0; i < pool.length; i++) {
        pool[i]!.sector_id = `sector:${corpsId}:${i}`;
    }
    return pool;
}

/**
 * Check if two sectors are adjacent by standard edge adjacency (Cases A+B).
 * Two sectors are adjacent if any edge from one is adjacent to any edge from
 * the other via triple-junction connectivity.
 */
function areSectorsEdgeAdjacent(
    a: CorpsFrontSector,
    b: CorpsFrontSector,
    edgeMeta: Map<string, { a: string; b: string; side_a?: string | null; side_b?: string | null }>,
    faction: string,
    caseAdj: Map<Osid, Osid[]>,
    centroids?: OsidCentroidMap,
): boolean {
    // Build per-edge friendly/hostile for both sectors
    const getEdgeSides = (edgeIds: string[]): Array<{ friendly: string; hostile: string }> => {
        const result: Array<{ friendly: string; hostile: string }> = [];
        for (const eid of edgeIds) {
            const meta = edgeMeta.get(eid);
            if (!meta) continue;
            if (meta.side_a === faction) result.push({ friendly: meta.a, hostile: meta.b });
            else if (meta.side_b === faction) result.push({ friendly: meta.b, hostile: meta.a });
        }
        return result;
    };

    const edgesA = getEdgeSides(a.edge_ids);
    const edgesB = getEdgeSides(b.edge_ids);

    for (const ea of edgesA) {
        for (const eb of edgesB) {
            // Case A: same friendly, hostile adj — always safe
            if (ea.friendly === eb.friendly && isOsidAdjacent(ea.hostile as Osid, eb.hostile as Osid, caseAdj)) return true;
            // Case B: same hostile, friendly adj — use the same threshold as the
            // split (caseAdj) so we don't re-bridge connections the split just broke.
            // BFS component check in the caller provides additional safety.
            if (ea.hostile === eb.hostile && isOsidAdjacent(ea.friendly as Osid, eb.friendly as Osid, caseAdj)) {
                if (!isCaseBBridge(ea.friendly as Osid, eb.friendly as Osid, ea.hostile as Osid, centroids)) return true;
            }
        }
    }
    return false;
}

/**
 * Merge two sectors into one, combining edges, sub-segments, and territory.
 * Brigade lists are combined (dedup handled later by faction-wide assignment).
 */
function mergeSectors(
    corpsId: FormationId,
    base: CorpsFrontSector,
    other: CorpsFrontSector,
    indexHint: number,
): CorpsFrontSector {
    const edgeIds = [...new Set([...base.edge_ids, ...other.edge_ids])].sort(strictCompare);
    const territoryOsids = [...new Set([...base.territory_osids, ...other.territory_osids])].sort(strictCompare);
    const opposingFactions = [...new Set([...base.opposing_factions, ...other.opposing_factions])].sort(strictCompare);

    // Merge sub-segments
    const mergedSubSeg: CorpsFrontSubSegment = {
        sub_segment_id: `subseg:${corpsId}:merged${indexHint}`,
        edge_ids: edgeIds,
        friendly_osids: [...new Set([
            ...base.sub_segments.flatMap(ss => ss.friendly_osids),
            ...other.sub_segments.flatMap(ss => ss.friendly_osids),
        ])].sort(strictCompare),
        enemy_osids: [...new Set([
            ...base.sub_segments.flatMap(ss => ss.enemy_osids),
            ...other.sub_segments.flatMap(ss => ss.enemy_osids),
        ])].sort(strictCompare),
        length_edges: edgeIds.length,
        primary_brigade_ids: [],
    };

    const brigadeIds = [...new Set([...base.assigned_brigade_ids, ...other.assigned_brigade_ids])].sort(strictCompare);
    const reserveIds = [...new Set([...base.reserve_brigade_ids, ...other.reserve_brigade_ids])].sort(strictCompare);

    return {
        sector_id: `sector:${corpsId}:${indexHint}`,
        corps_id: corpsId,
        faction: base.faction,
        opposing_factions: opposingFactions,
        edge_ids: edgeIds,
        sub_segments: [mergedSubSeg],
        length_edges: edgeIds.length,
        territory_osids: territoryOsids,
        assigned_brigade_ids: brigadeIds,
        reserve_brigade_ids: reserveIds,
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: base.sector_stance ?? 'defend',
        stance_source: base.stance_source ?? 'bot',
    };
}

/**
 * Topological verification for Case B connections: does the common hostile OSID H
 * sit between the two friendly OSIDs fi and fj?
 *
 * Case B connects front edges facing the same hostile OSID H. When the friendly
 * OSIDs share a GIS polygon boundary (point touch) but sit on opposite sides
 * of the hostile pocket, they are topologically distinct front segments.
 *
 * Bridge criteria: angle between vectors (H→fi) and (H→fj) > 165°.
 */
function isCaseBBridge(
    fi: Osid,
    fj: Osid,
    h: Osid,
    centroids?: OsidCentroidMap
): boolean {
    if (!centroids) return false;
    const cFi = centroids.get(fi);
    const cFj = centroids.get(fj);
    const cH = centroids.get(h);
    if (!cFi || !cFj || !cH) return false;

    // Vectors from H to fi and fj
    const v1 = { lat: cFi.lat - cH.lat, lon: cFi.lon - cH.lon };
    const v2 = { lat: cFj.lat - cH.lat, lon: cFj.lon - cH.lon };

    const angle1 = Math.atan2(v1.lat, v1.lon);
    const angle2 = Math.atan2(v2.lat, v2.lon);
    let diff = Math.abs(angle1 - angle2);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;

    const deg = (diff * 180) / Math.PI;
    return deg > 165; // Opposite sides of H -> bridge
}

/**
 * Build adjacency map between front edges using front-line-following
 * (triple-junction connectivity).
 *
 * Two front edges are adjacent on the front line iff they meet at a polygon
 * triple junction — three mutually adjacent OSIDs forming a corner of the front.
 *
 * Case A: same friendly OSID F, hostile OSIDs H₁ adj H₂ → triple junction (F, H₁, H₂)
 * Case B: same hostile OSID H, friendly OSIDs F₁ adj F₂ → triple junction (F₁, F₂, H)
 *
 * When faction/osidAdjacency are not provided (decompose/bisect paths), falls back
 * to shared-OSID grouping without adjacency walk.
 */
function buildEdgeAdjacency(
    edgeIds: string[],
    edgeMeta: Map<string, { a: string; b: string; side_a?: string | null; side_b?: string | null }>,
    faction?: string,
    osidAdjacency?: Map<Osid, Osid[]>,
    sharedBoundaryAdj?: Map<Osid, Osid[]>,
    centroids?: OsidCentroidMap,
): Map<string, string[]> {
    // Use Set-based adjacency for O(1) dedup, convert to sorted arrays at end
    const adjSets = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
        if (a === b) return;
        let sa = adjSets.get(a);
        if (!sa) { sa = new Set(); adjSets.set(a, sa); }
        sa.add(b);
        let sb = adjSets.get(b);
        if (!sb) { sb = new Set(); adjSets.set(b, sb); }
        sb.add(a);
    };

    if (faction !== undefined && osidAdjacency !== undefined) {
        // Triple-junction connectivity: follow the front line, not territory BFS.
        const friendlyToEdges = new Map<string, string[]>();
        const hostileToEdges = new Map<string, string[]>();
        const edgeHostile = new Map<string, string>();
        const edgeFriendly = new Map<string, string>();

        for (const eid of edgeIds) {
            const meta = edgeMeta.get(eid);
            if (!meta) continue;
            let friendly: string, hostile: string;
            if (meta.side_a === faction) { friendly = meta.a; hostile = meta.b; }
            else if (meta.side_b === faction) { friendly = meta.b; hostile = meta.a; }
            else continue;

            edgeFriendly.set(eid, friendly);
            edgeHostile.set(eid, hostile);

            let list = friendlyToEdges.get(friendly);
            if (!list) { list = []; friendlyToEdges.set(friendly, list); }
            list.push(eid);

            list = hostileToEdges.get(hostile);
            if (!list) { list = []; hostileToEdges.set(hostile, list); }
            list.push(eid);
        }

        // Both Case A and Case B use sharedBoundaryAdj to require true shared
        // polygon boundaries (not distance contacts). Without this, degenerate
        // triple junctions through near-miss polygon adjacency bridge disconnected
        // front segments (e.g. Srebrenica ↔ Cerska via distance_contact hostiles).
        const caseAdj = sharedBoundaryAdj ?? osidAdjacency;

        // Case A: same friendly OSID, hostile OSIDs share a true boundary.
        // Front turns along the friendly polygon boundary at a triple junction.
        for (const edges of friendlyToEdges.values()) {
            for (let i = 0; i < edges.length; i++) {
                const hi = edgeHostile.get(edges[i]!)!;
                for (let j = i + 1; j < edges.length; j++) {
                    const hj = edgeHostile.get(edges[j]!)!;
                    if (isOsidAdjacent(hi, hj, caseAdj)) {
                        link(edges[i]!, edges[j]!);
                    }
                }
            }
        }

        // Case B: same hostile OSID, friendly OSIDs share a true boundary.
        // Front turns along the hostile polygon boundary at a triple junction.
        for (const [h, edges] of hostileToEdges.entries()) {
            for (let i = 0; i < edges.length; i++) {
                const fi = edgeFriendly.get(edges[i]!)! as Osid;
                for (let j = i + 1; j < edges.length; j++) {
                    const fj = edgeFriendly.get(edges[j]!)! as Osid;
                    if (isOsidAdjacent(fi, fj, caseAdj)) {
                        // Topological check: is this a bridge across a hostile pocket?
                        if (isCaseBBridge(fi, fj, h as Osid, centroids)) continue;
                        link(edges[i]!, edges[j]!);
                    }
                }
            }
        }

    } else {
        // No faction/adjacency: group by shared OSID only (decompose/bisect paths).
        const osidToEdges = new Map<string, string[]>();
        for (const eid of edgeIds) {
            const meta = edgeMeta.get(eid);
            if (!meta) continue;
            for (const osid of [meta.a, meta.b]) {
                let list = osidToEdges.get(osid);
                if (!list) { list = []; osidToEdges.set(osid, list); }
                list.push(eid);
            }
        }
        for (const edges of osidToEdges.values()) {
            for (let i = 0; i < edges.length; i++) {
                for (let j = i + 1; j < edges.length; j++) {
                    link(edges[i]!, edges[j]!);
                }
            }
        }
    }

    // Convert Sets to sorted arrays
    const adj = new Map<string, string[]>();
    for (const [k, s] of adjSets) {
        adj.set(k, [...s].sort(strictCompare));
    }
    return adj;
}


/**
 * Build edge adjacency using Case A + strict-triple-junction Case B.
 * Case A (same friendly, hostile adj): always included.
 * Case B (same hostile H, friendly fi/fj adj): only included when BOTH
 * fi-H and fj-H are within the provided adjacency threshold. Without this,
 * Case B bridges front edges facing the same enemy pocket from different sides
 * through GIS near-miss contacts (e.g. olovo_2↔krivajevici at 16.9m connects
 * front segments on opposite sides of the RS Vares pocket). The caller controls
 * the threshold via `strictAdjForCaseB` — typically 16.6m (natural gap in the
 * Case B distance distribution between 15.5m and 24.6m).
 */
function buildEdgeAdjacencyStrictCaseB(
    edgeIds: string[],
    edgeMeta: Map<string, { a: string; b: string; side_a?: string | null; side_b?: string | null }>,
    faction: string,
    caseAdj: Map<Osid, Osid[]>,
    strictAdjForCaseB: Map<Osid, Osid[]>,
    centroids?: OsidCentroidMap,
): Map<string, string[]> {
    const adjSets = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
        let sa = adjSets.get(a);
        if (!sa) { sa = new Set(); adjSets.set(a, sa); }
        sa.add(b);
        let sb = adjSets.get(b);
        if (!sb) { sb = new Set(); adjSets.set(b, sb); }
        sb.add(a);
    };

    const friendlyToEdges = new Map<string, string[]>();
    const hostileToEdges = new Map<string, string[]>();
    const edgeHostile = new Map<string, string>();
    const edgeFriendly = new Map<string, string>();

    for (const eid of edgeIds) {
        const meta = edgeMeta.get(eid);
        if (!meta) continue;
        let friendly: string, hostile: string;
        if (meta.side_a === faction) { friendly = meta.a; hostile = meta.b; }
        else if (meta.side_b === faction) { friendly = meta.b; hostile = meta.a; }
        else continue;
        edgeFriendly.set(eid, friendly);
        edgeHostile.set(eid, hostile);
        let list = friendlyToEdges.get(friendly);
        if (!list) { list = []; friendlyToEdges.set(friendly, list); }
        list.push(eid);
        list = hostileToEdges.get(hostile);
        if (!list) { list = []; hostileToEdges.set(hostile, list); }
        list.push(eid);
    }

    // Case A: same friendly OSID, hostile OSIDs share a boundary
    for (const edges of friendlyToEdges.values()) {
        for (let i = 0; i < edges.length; i++) {
            const hi = edgeHostile.get(edges[i]!)! as Osid;
            for (let j = i + 1; j < edges.length; j++) {
                const hj = edgeHostile.get(edges[j]!)! as Osid;
                if (isOsidAdjacent(hi, hj, caseAdj)) {
                    link(edges[i]!, edges[j]!);
                }
            }
        }
    }

    // Case B (threshold-gated): same hostile H, friendly fi/fj adj,
    // AND both fi-H and fj-H must be within the provided adjacency threshold.
    // Prevents pocket bridges where GIS polygons are near but not truly shared.
    for (const [h, edges] of hostileToEdges.entries()) {
        for (let i = 0; i < edges.length; i++) {
            const fi = edgeFriendly.get(edges[i]!)! as Osid;
            const hi = edgeHostile.get(edges[i]!)! as Osid; // same as H for all in group
            for (let j = i + 1; j < edges.length; j++) {
                const fj = edgeFriendly.get(edges[j]!)! as Osid;
                if (!isOsidAdjacent(fi, fj, caseAdj)) continue;
                // Strict check: fi-H and fj-H must both be in strict adjacency
                if (!isOsidAdjacent(fi, hi, strictAdjForCaseB)) continue;
                if (!isOsidAdjacent(fj, hi, strictAdjForCaseB)) continue;
                // Topological check: is this a bridge across a hostile pocket?
                if (isCaseBBridge(fi, fj, h as Osid, centroids)) continue;
                link(edges[i]!, edges[j]!);
            }
        }
    }


    const adj = new Map<string, string[]>();
    for (const [k, s] of adjSets) {
        adj.set(k, [...s].sort(strictCompare));
    }
    return adj;
}

/** Check if two OSIDs are adjacent in the OSID adjacency map. */
function isOsidAdjacent(a: Osid, b: Osid, adj: Map<Osid, Osid[]>): boolean {
    return (adj.get(a) ?? []).includes(b);
}

/**
 * Get sorted list of active corps formation IDs for a faction.
 */
function getCorpsForFaction(
    formations: Record<FormationId, FormationState>,
    faction: FactionId
): FormationId[] {
    return Object.keys(formations)
        .sort(strictCompare)
        .filter(fid => {
            const f = formations[fid];
            return f && f.faction === faction && f.status === 'active'
                && (f.kind === 'corps' || f.kind === 'corps_asset');
        });
}

/**
 * Get sorted list of faction IDs in the game.
 */
function getFactions(state: GameState): FactionId[] {
    return (state.factions ?? []).map(f => f.id).sort(strictCompare);
}

// ═══════════════════════════════════════════════════════════════════════════
// Sector-Aware Brigade Assignment
// ═══════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════
// Exported query helpers for attack resolution
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find the sector that DEFENDS targetOsid via sector-coverage when no brigade
 * is physically there.  That is the defender-faction sector whose sub-segment
 * lists targetOsid as a **friendly** OSID (= the sector that owns the territory).
 *
 * Previous implementation searched enemy_osids, which returned the attacker's
 * sector instead of the defender's — making the predictor treat the attacker's
 * own brigades as defenders (blocking attacks against truly undefended OSIDs).
 *
 * Returns the first matching sector in deterministic sector_id order, or null.
 */
export function findSectorForEnemyOsid(
    state: GameState,
    targetOsid: string,
    defenderFaction?: string | null,
): CorpsFrontSector | null {
    const sectors = state.military.corps_front_sectors;
    if (!sectors) return null;
    // First pass: check front-edge friendly_osids (primary — direct front defense)
    for (const sid of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sid]!;
        if (defenderFaction && sector.faction !== defenderFaction) continue;
        for (const sub of sector.sub_segments) {
            if (sub.friendly_osids.includes(targetOsid)) return sector;
        }
    }
    // Second pass: check territory_osids (fallback — depth territory claimed by post-Voronoi sweep)
    for (const sid of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sid]!;
        if (defenderFaction && sector.faction !== defenderFaction) continue;
        if (sector.territory_osids?.includes(targetOsid)) return sector;
    }
    return null;
}

/**
 * Get the corps HQ OSID for the brigade's corps — used as rout destination when
 * a sector-coverage defender has no valid retreat path after a flip.
 * Returns null if no corps formation is found or it has no location_osid.
 */
export function getCorpsHqOsid(
    state: GameState,
    formation: FormationState
): string | null {
    const corpsId = getFormationCorpsId(formation);
    if (!corpsId) return null;
    const corpsFormation = state.military.formations?.[corpsId];
    if (!corpsFormation) return null;
    return (corpsFormation as FormationState & { location_osid?: string }).location_osid ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Brigade Sub-Segment Assignment (AoR)
// ═══════════════════════════════════════════════════════════════════════════

/** Sub-segments wider than this get 2+ brigades. */
const WIDE_SEGMENT_THRESHOLD = 5;

/** Home OSID affinity bonus when brigade's home_osid is in the sub-segment's friendly OSIDs. */
const HOME_AFFINITY_BONUS = 1.3;

/** Mechanized/motorized brigade terrain affinity bonus for non-mountain sub-segments. */
const MECH_TERRAIN_BONUS = 1.2;

/**
 * Assign front-line brigades to sub-segments within each sector.
 * Each brigade gets exactly one sub-segment (their AoR). Each sub-segment
 * should have at least one brigade if possible. Widest segments get priority.
 *
 * Deterministic: sorted iteration, greedy best-fit.
 */
export function assignBrigadesToSubSegments(
    state: GameState,
    sectors: CorpsFrontSector[],
    adjacency: Map<string, string[]>
): void {
    const formations = state.military.formations ?? {};

    for (const sector of sectors) {
        if (sector.sub_segments.length === 0) continue;

        // Reset previous assignments
        for (const ss of sector.sub_segments) {
            ss.primary_brigade_ids = [];
            ss.gap = false;
        }

        // Separate front-line brigades from reserves
        const frontBrigadeIds: string[] = [];
        for (const bid of sector.assigned_brigade_ids) {
            if (sector.reserve_brigade_ids.includes(bid)) continue;
            const f = formations[bid];
            if (!f || f.status === 'inactive') continue;
            frontBrigadeIds.push(bid);
        }

        if (frontBrigadeIds.length === 0) {
            // All sub-segments are gaps
            for (const ss of sector.sub_segments) {
                ss.gap = true;
            }
            continue;
        }

        // If only 1 sub-segment, assign all front brigades to it
        if (sector.sub_segments.length === 1) {
            sector.sub_segments[0]!.primary_brigade_ids = [...frontBrigadeIds].sort(strictCompare);
            for (const bid of frontBrigadeIds) {
                const f = formations[bid];
                if (f) f.assigned_sub_segment_id = sector.sub_segments[0]!.sub_segment_id;
            }
            continue;
        }

        // Compute affinity for each brigade × sub-segment pair
        const affinities: Array<{ bid: string; ssIdx: number; score: number }> = [];
        for (const bid of frontBrigadeIds) {
            const f = formations[bid];
            if (!f) continue;
            const brigLoc = (f as FormationState & { location_osid?: string }).location_osid ?? '';
            const brigHome = f.home_osid ?? '';
            const isMech = f.equipment_class === 'mechanized' || f.equipment_class === 'motorized';

            for (let si = 0; si < sector.sub_segments.length; si++) {
                const ss = sector.sub_segments[si]!;
                // Distance from brigade location to nearest friendly OSID in this sub-segment
                let minDist = Infinity;
                for (const fOsid of ss.friendly_osids) {
                    if (fOsid === brigLoc) { minDist = 0; break; }
                    const d = bfsDistance(brigLoc, fOsid, adjacency);
                    if (d < minDist) minDist = d;
                }
                let score = 1.0 / (1 + (minDist === Infinity ? 20 : minDist));

                // Home affinity bonus
                if (brigHome && ss.friendly_osids.includes(brigHome)) {
                    score *= HOME_AFFINITY_BONUS;
                }

                // Mech terrain bonus (non-mountain terrain = favorable for mechanized)
                if (isMech) {
                    score *= MECH_TERRAIN_BONUS;
                }

                affinities.push({ bid, ssIdx: si, score });
            }
        }

        // Sort sub-segments by width descending (widest first gets first pick)
        const ssOrder = sector.sub_segments
            .map((ss, i) => ({ idx: i, width: ss.length_edges }))
            .sort((a, b) => b.width - a.width || a.idx - b.idx);

        const assignedBrigades = new Set<string>();
        const brigadesPerSubSeg: Map<number, string[]> = new Map();

        // First pass: assign one brigade to each sub-segment (widest first)
        for (const { idx } of ssOrder) {
            // Find best unassigned brigade for this sub-segment
            const candidates = affinities
                .filter(a => a.ssIdx === idx && !assignedBrigades.has(a.bid))
                .sort((a, b) => b.score - a.score || a.bid.localeCompare(b.bid));

            if (candidates.length > 0) {
                const best = candidates[0]!;
                assignedBrigades.add(best.bid);
                brigadesPerSubSeg.set(idx, [best.bid]);
            }
        }

        // Second pass: assign remaining brigades to sub-segments that need more
        const unassigned = frontBrigadeIds
            .filter(b => !assignedBrigades.has(b))
            .sort(strictCompare);

        for (const bid of unassigned) {
            // Find best sub-segment for this brigade
            const candidates = affinities
                .filter(a => a.bid === bid)
                .sort((a, b) => {
                    // Prefer wide under-staffed sub-segments
                    const ssA = sector.sub_segments[a.ssIdx]!;
                    const ssB = sector.sub_segments[b.ssIdx]!;
                    const countA = brigadesPerSubSeg.get(a.ssIdx)?.length ?? 0;
                    const countB = brigadesPerSubSeg.get(b.ssIdx)?.length ?? 0;
                    const needsA = ssA.length_edges >= WIDE_SEGMENT_THRESHOLD && countA < 2 ? 1 : 0;
                    const needsB = ssB.length_edges >= WIDE_SEGMENT_THRESHOLD && countB < 2 ? 1 : 0;
                    if (needsA !== needsB) return needsB - needsA;
                    return b.score - a.score || a.ssIdx - b.ssIdx;
                });

            if (candidates.length > 0) {
                const best = candidates[0]!;
                const list = brigadesPerSubSeg.get(best.ssIdx) ?? [];
                list.push(bid);
                brigadesPerSubSeg.set(best.ssIdx, list);
            }
        }

        // Write assignments to sub-segments and formations
        for (let si = 0; si < sector.sub_segments.length; si++) {
            const ss = sector.sub_segments[si]!;
            const assigned = brigadesPerSubSeg.get(si) ?? [];
            ss.primary_brigade_ids = assigned.sort(strictCompare);
            ss.gap = assigned.length === 0;

            for (const bid of assigned) {
                const f = formations[bid];
                if (f) f.assigned_sub_segment_id = ss.sub_segment_id;
            }
        }
    }
}

/** Simple BFS distance between two OSIDs through adjacency graph. */
function bfsDistance(from: string, to: string, adjacency: Map<string, string[]>): number {
    if (from === to) return 0;
    if (!from || !to) return Infinity;
    const visited = new Set<string>([from]);
    const queue: Array<{ osid: string; depth: number }> = [{ osid: from, depth: 0 }];
    let head = 0;
    const maxDepth = 10; // cap search depth

    while (head < queue.length) {
        const { osid, depth } = queue[head++]!;
        if (depth >= maxDepth) break;
        const neighbors = adjacency.get(osid) ?? [];
        for (const n of neighbors) {
            if (n === to) return depth + 1;
            if (visited.has(n)) continue;
            visited.add(n);
            queue.push({ osid: n, depth: depth + 1 });
        }
    }
    return Infinity;
}

/**
 * Find which sub-segment contains a given OSID (either as friendly or enemy).
 * Returns the sub-segment, or undefined if not found.
 */
export function findSubSegmentForOsid(
    sector: CorpsFrontSector,
    targetOsid: string
): CorpsFrontSubSegment | undefined {
    for (const ss of sector.sub_segments) {
        if (ss.friendly_osids.includes(targetOsid) || ss.enemy_osids.includes(targetOsid)) {
            return ss;
        }
    }
    return undefined;
}
