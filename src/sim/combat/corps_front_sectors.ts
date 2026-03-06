/**
 * Corps Front Sectors: partitions the hostile boundary into per-corps sectors.
 *
 * Each corps owns a contiguous slice of the OSID-level hostile boundary in its
 * area of responsibility. Multi-source BFS from corps HQ locations assigns each
 * friendly OSID to the nearest corps; front edges are then partitioned accordingly.
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
import { buildOsidAdjacency, type Osid } from './osid_adjacency.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';

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
    reverseMap: Map<string, string[]> | null
): Record<string, CorpsFrontSector> {
    const osidFrontEdges = state.war_front_edges_osid;
    if (!osidFrontEdges || osidFrontEdges.length === 0) return {};
    if (!edges || edges.length === 0) return {};

    const adjacency = buildOsidAdjacency(edges);
    const formations = state.formations ?? {};
    const factions = getFactions(state);
    const result: Record<string, CorpsFrontSector> = {};

    for (const faction of factions) {
        const factionSectors = buildFactionSectors(
            state, faction, osidFrontEdges, adjacency, formations, reverseMap
        );
        for (const sector of factionSectors) {
            result[sector.sector_id] = sector;
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Per-Faction Sector Building
// ═══════════════════════════════════════════════════════════════════════════

function buildFactionSectors(
    state: GameState,
    faction: FactionId,
    osidFrontEdges: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    adjacency: Map<Osid, Osid[]>,
    formations: Record<FormationId, FormationState>,
    reverseMap: Map<string, string[]> | null
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
    consolidateCrossCorpsFronts(corpsEdges, osidFrontEdges, faction, adjacency);

    // Step 4: Build multi-sectors (sub-segments promoted to independent sectors)
    const sectors: CorpsFrontSector[] = [];
    for (const corpsId of corpsIds) {
        const edgeIds = corpsEdges.get(corpsId);
        if (!edgeIds || edgeIds.length === 0) continue;

        const corpsMultiSectors = buildMultiSectorsForCorps(
            state, corpsId, faction, edgeIds, osidFrontEdges,
            adjacency, formations, reverseMap
        );
        for (const sector of corpsMultiSectors) {
            sectors.push(sector);
        }
    }

    // Step 5: Faction-wide fallback for orphaned brigades
    // Brigades in corps without sectors or BFS-unreachable pockets get assigned
    // to the nearest faction sector via unrestricted BFS (through any territory).
    // General staff units are exempt — they're army-level reserves.
    assignOrphanedBrigadesToFaction(sectors, faction, formations, adjacency);

    // Step 6: Redistribute excess reserves across faction sectors
    redistributeExcessReserves(sectors);

    // Step 7: Ensure every sector has at least one assigned brigade
    ensureMinimumSectorCoverage(sectors, formations, adjacency);

    sectors.sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    return sectors;
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

    // Pre-compute friendly OSIDs for fast membership checks
    const friendlyOsids = new Set<Osid>();
    for (const osid of adjacency.keys()) {
        const ctrl = getPoliticalControllerOSID(state, osid, reverseMap ?? undefined);
        if (ctrl === faction) friendlyOsids.add(osid);
    }

    // Collect seed OSIDs for each corps (sorted by corps ID for determinism)
    const seeds: Array<{ corpsId: FormationId; osid: Osid }> = [];
    for (const corpsId of corpsIds) {
        const corpsFormation = formations[corpsId];
        if (!corpsFormation) continue;

        // Primary: corps' own location_osid
        const hqOsid = corpsFormation.location_osid;
        if (hqOsid && friendlyOsids.has(hqOsid)) {
            seeds.push({ corpsId, osid: hqOsid });
            continue;
        }

        // Fallback: find any subordinate brigade's location_osid
        const subOsid = findSubordinateOsid(formations, corpsId, friendlyOsids);
        if (subOsid) {
            seeds.push({ corpsId, osid: subOsid });
        }
    }

    // Multi-source BFS: all seeds start at distance 0
    const queue: Array<{ osid: Osid; corpsId: FormationId }> = [];
    for (const seed of seeds) {
        if (result.has(seed.osid)) continue; // First corps to claim wins (sorted order)
        result.set(seed.osid, seed.corpsId);
        queue.push(seed);
    }

    let head = 0;
    while (head < queue.length) {
        const { osid, corpsId } = queue[head++]!;
        const neighbors = adjacency.get(osid) ?? [];
        for (const neighbor of neighbors) {
            if (result.has(neighbor)) continue;
            if (!friendlyOsids.has(neighbor)) continue;
            result.set(neighbor, corpsId);
            queue.push({ osid: neighbor, corpsId });
        }
    }

    // Post-BFS: claim disconnected friendly OSIDs where corps brigades are located.
    // Handles pockets/enclaves not reachable through contiguous friendly territory.
    const sortedFormIds = Object.keys(formations).sort(strictCompare);
    for (const fid of sortedFormIds) {
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        const fCorpsId = getFormationCorpsId(f);
        if (!f.location_osid || !fCorpsId) continue;
        if (!friendlyOsids.has(f.location_osid)) continue;
        if (result.has(f.location_osid)) continue;
        // Brigade at unreachable friendly OSID → assign to its corps and BFS from there
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
function consolidateCrossCorpsFronts(
    corpsEdges: Map<FormationId, string[]>,
    osidFrontEdges: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>
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

    // Build adjacency across ALL faction edges (ignoring corps boundaries)
    const edgeAdj = buildEdgeAdjacency(allEdgeIds, edgeMeta, faction, adjacency);

    // Also connect edges sharing a hostile-side OSID. Two edges facing the same
    // enemy OSID are part of the same front even if their friendly OSIDs aren't
    // adjacent (e.g. orahova<>kruskik_2 and gradiska_3<>kruskik_2 share hostile
    // kruskik_2 but orahova and gradiska_3 aren't directly adjacent).
    const hostileToEdges = new Map<string, string[]>();
    for (const eid of allEdgeIds) {
        const meta = edgeMeta.get(eid);
        if (!meta) continue;
        const addHostile = (osid: string, side: string | null) => {
            if (side === faction) return; // skip friendly side
            let list = hostileToEdges.get(osid);
            if (!list) { list = []; hostileToEdges.set(osid, list); }
            list.push(eid);
        };
        addHostile(meta.a, meta.side_a);
        addHostile(meta.b, meta.side_b);
    }
    for (const edgesAtHostile of hostileToEdges.values()) {
        if (edgesAtHostile.length < 2) continue;
        edgesAtHostile.sort(strictCompare);
        for (let i = 0; i < edgesAtHostile.length; i++) {
            for (let j = i + 1; j < edgesAtHostile.length; j++) {
                const a = edgesAtHostile[i]!;
                const b = edgesAtHostile[j]!;
                let listA = edgeAdj.get(a);
                if (!listA) { listA = []; edgeAdj.set(a, listA); }
                if (!listA.includes(b)) listA.push(b);
                let listB = edgeAdj.get(b);
                if (!listB) { listB = []; edgeAdj.set(b, listB); }
                if (!listB.includes(a)) listB.push(a);
            }
        }
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

        // Reassign minority edges to the majority corps
        for (const eid of component) {
            const currentCorps = edgeToCorps.get(eid);
            if (!currentCorps || currentCorps === majorityCorps) continue;

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
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 4: Build Multi-Sector from Sub-Segments
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum front edges for a sub-segment to be promoted to its own sector. */
export const MIN_SECTOR_EDGES = 5;

/** Maximum edges per sector before forced split at midpoint. */
export const MAX_SECTOR_EDGES = 25;

/** Maximum brigades per sector before forced split. */
export const MAX_SECTOR_BRIGADES = 8;

/** Maximum reserve brigades per front edge (proportional cap). ~1 per typical 10-18 edge sector. */
export const RESERVE_PER_EDGE_CAP = 0.07;

/**
 * Decompose a corps' front edges into connected sub-segments via BFS.
 */
function findSubSegments(
    corpsId: FormationId,
    faction: FactionId,
    edgeIds: string[],
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    osidAdjacency: Map<Osid, Osid[]>
): CorpsFrontSubSegment[] {
    const edgeSet = new Set(edgeIds);
    const edgeAdj = buildEdgeAdjacency(edgeIds, edgeMeta, faction, osidAdjacency);
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
    formations: Record<FormationId, FormationState>,
    reverseMap: Map<string, string[]> | null
): CorpsFrontSector[] {
    if (edgeIds.length === 0) return [];

    // Build edge metadata lookup
    const edgeMeta = new Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>();
    for (const e of osidFrontEdges) {
        edgeMeta.set(e.edge_id, e);
    }

    // Step 1: Find connected components
    let subSegments = findSubSegments(corpsId, faction, edgeIds, edgeMeta, adjacency);
    // Proposal B: merge undersized sub-segments up to MIN_SECTOR_EDGES
    subSegments = mergeUndersizedSubSegments(corpsId, subSegments, adjacency);
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

    // Step 5 (Phase 1B + 1C): Assign interior brigades as reserves
    assignInteriorBrigadesToSectors(
        finalSectors, corpsId, faction, formations, adjacency, reverseMap, state
    );

    // Step 6: Redistribute excess reserves (proportional cap per sector)
    redistributeExcessReserves(finalSectors);

    return finalSectors;
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
        assigned_brigade_ids: assignedBrigadeIds,
        reserve_brigade_ids: [],
        density,
        threat_ratio: threatRatio,
        defensive_power: defensivePower,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 1B + 1C: Interior Brigade Assignment → Reserves
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assign brigades not at front-adjacent OSIDs to their nearest sector as reserves.
 * BFS from each unassigned brigade's location_osid through friendly territory
 * toward the nearest sector friendly_osid.
 */
function assignInteriorBrigadesToSectors(
    sectors: CorpsFrontSector[],
    corpsId: FormationId,
    faction: FactionId,
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: Map<string, string[]> | null,
    state: GameState
): void {
    if (sectors.length === 0) return;

    // Collect all already-assigned brigades
    const assigned = new Set<FormationId>();
    for (const s of sectors) {
        for (const bid of s.assigned_brigade_ids) assigned.add(bid);
    }

    // Build reverse map: friendly_osid → sector index
    const osidToSectorIdx = new Map<string, number>();
    for (let i = 0; i < sectors.length; i++) {
        const s = sectors[i]!;
        for (const ss of s.sub_segments) {
            for (const osid of ss.friendly_osids) {
                if (!osidToSectorIdx.has(osid)) osidToSectorIdx.set(osid, i);
            }
        }
    }

    // Pre-compute friendly OSIDs for BFS boundary
    const friendlyOsids = new Set<string>();
    for (const osid of adjacency.keys()) {
        const ctrl = getPoliticalControllerOSID(state, osid, reverseMap ?? undefined);
        if (ctrl === faction) friendlyOsids.add(osid);
    }

    // Find unassigned brigades in this corps and BFS-assign to nearest sector
    const sortedFormIds = Object.keys(formations).sort(strictCompare);
    for (const fid of sortedFormIds) {
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (getFormationCorpsId(f) !== corpsId || !f.location_osid) continue;
        if (assigned.has(fid)) continue;

        const sectorIdx = bfsToNearestSector(
            f.location_osid, osidToSectorIdx, adjacency, friendlyOsids
        );
        if (sectorIdx !== null) {
            sectors[sectorIdx]!.reserve_brigade_ids.push(fid);
            assigned.add(fid);
        }
    }

    // Sort reserve lists for determinism
    for (const s of sectors) {
        s.reserve_brigade_ids.sort(strictCompare);
    }
}

/**
 * BFS from startOsid through friendly territory to find the nearest OSID
 * belonging to any sector. Returns the sector index, or null if unreachable.
 */
function bfsToNearestSector(
    startOsid: string,
    osidToSectorIdx: Map<string, number>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>
): number | null {
    // Quick check: already at a sector OSID?
    const direct = osidToSectorIdx.get(startOsid);
    if (direct !== undefined) return direct;

    // BFS through friendly territory (sorted neighbors for determinism)
    const visited = new Set<string>();
    visited.add(startOsid);
    const queue: string[] = [startOsid];
    let head = 0;

    while (head < queue.length) {
        const osid = queue[head++]!;
        const neighbors = (adjacency.get(osid) ?? []).slice().sort(strictCompare);
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            if (!friendlyOsids.has(n)) continue;
            visited.add(n);

            const sIdx = osidToSectorIdx.get(n);
            if (sIdx !== undefined) return sIdx;

            queue.push(n);
        }
    }

    return null; // Unreachable (enclave with no front edges)
}

// ═══════════════════════════════════════════════════════════════════════════
// Reserve Redistribution (Proportional Cap)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Redistribute excess reserves from overfilled sectors to underfilled ones.
 * Each sector's reserve cap = max(1, ceil(length_edges × RESERVE_PER_EDGE_CAP)).
 * Overflow brigades move to the least-filled sector. If all sectors are full,
 * the brigade stays in its original sector (never dropped).
 */
function redistributeExcessReserves(sectors: CorpsFrontSector[]): void {
    if (sectors.length <= 1) return;

    // Compute per-sector caps
    const caps = sectors.map(s => Math.max(1, Math.ceil(s.length_edges * RESERVE_PER_EDGE_CAP)));

    // Collect overflow brigades (remove from tail of sorted reserve list)
    const overflow: FormationId[] = [];
    for (let i = 0; i < sectors.length; i++) {
        const s = sectors[i]!;
        const cap = caps[i]!;
        if (s.reserve_brigade_ids.length > cap) {
            // Remove excess from the end (sorted, so tail = last alphabetically)
            const excess = s.reserve_brigade_ids.splice(cap);
            overflow.push(...excess);
        }
    }

    if (overflow.length === 0) return;

    // Sort overflow for deterministic assignment
    overflow.sort(strictCompare);

    // Assign each overflow brigade to the least-filled sector
    for (const bid of overflow) {
        let bestIdx = -1;
        let bestRatio = Infinity;
        for (let i = 0; i < sectors.length; i++) {
            const ratio = sectors[i]!.reserve_brigade_ids.length / caps[i]!;
            if (ratio < bestRatio) {
                bestRatio = ratio;
                bestIdx = i;
            }
        }
        if (bestIdx >= 0) {
            sectors[bestIdx]!.reserve_brigade_ids.push(bid);
        }
    }

    // Re-sort reserve lists for determinism
    for (const s of sectors) {
        s.reserve_brigade_ids.sort(strictCompare);
    }
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
    adjacency: Map<Osid, Osid[]>
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

            // Step 1: promote first reserve to assigned
            if (sector.reserve_brigade_ids.length > 0) {
                const bid = sector.reserve_brigade_ids.shift()!;
                sector.assigned_brigade_ids.push(bid);
                continue;
            }

            // Step 2: BFS from sector friendly OSIDs to find nearest brigade
            // in a surplus sector (>1 assigned) within the same corps
            const sectorOsids = new Set<string>();
            for (const ss of sector.sub_segments) {
                for (const o of ss.friendly_osids) sectorOsids.add(o);
            }

            // Map brigade location_osid → brigade_id for surplus sectors only
            const donorByOsid = new Map<string, FormationId>();
            for (const other of corpsSectors) {
                if (other.sector_id === sector.sector_id) continue;
                if (other.assigned_brigade_ids.length <= 1) continue; // Keep at least 1
                for (const bid of other.assigned_brigade_ids) {
                    const f = formations[bid];
                    if (f?.location_osid && !donorByOsid.has(f.location_osid)) {
                        donorByOsid.set(f.location_osid, bid);
                    }
                }
            }
            if (donorByOsid.size === 0) continue;

            // BFS through all adjacency from sector friendly OSIDs
            const queue: Osid[] = [...sectorOsids].sort(strictCompare);
            const visited = new Set(queue);
            let head = 0;
            let donorBid: FormationId | null = null;

            outer: while (head < queue.length) {
                const osid = queue[head++]!;
                for (const n of [...(adjacency.get(osid) ?? [])].sort(strictCompare)) {
                    if (visited.has(n)) continue;
                    visited.add(n);
                    const bid = donorByOsid.get(n);
                    if (bid) { donorBid = bid; break outer; }
                    queue.push(n);
                }
            }

            if (!donorBid) continue;

            // Transfer donorBid from its sector to this empty sector
            for (const other of corpsSectors) {
                const idx = other.assigned_brigade_ids.indexOf(donorBid);
                if (idx >= 0) {
                    other.assigned_brigade_ids.splice(idx, 1);
                    sector.assigned_brigade_ids.push(donorBid);
                    break;
                }
            }
        }
    }

    // Sort for determinism
    for (const s of allSectors) s.assigned_brigade_ids.sort(strictCompare);
}

// ═══════════════════════════════════════════════════════════════════════════
// Faction-Wide Orphan Assignment
// ═══════════════════════════════════════════════════════════════════════════

/** Corps IDs exempt from sector assignment (army staff, future-conflict reserves). */
const EXEMPT_CORPS_IDS = new Set([
    'arbih_general_staff', 'vrs_main_staff', 'hvo_general_staff',
    'hvo_central_bosnia', // Reserved for Bosniak-Croat conflict
]);

/**
 * Assign brigades orphaned from corps-level assignment (corps without sectors,
 * BFS-unreachable pockets) to the nearest sector of their faction via
 * unrestricted BFS through any OSID adjacency. General staff units are exempt.
 */
function assignOrphanedBrigadesToFaction(
    sectors: CorpsFrontSector[],
    faction: FactionId,
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>
): void {
    if (sectors.length === 0) return;

    // Collect all assigned brigades
    const assigned = new Set<FormationId>();
    for (const s of sectors) {
        for (const bid of s.assigned_brigade_ids) assigned.add(bid);
        for (const bid of s.reserve_brigade_ids) assigned.add(bid);
    }

    // Build reverse map: OSID → sector index (across all faction sectors)
    const osidToSectorIdx = new Map<string, number>();
    for (let i = 0; i < sectors.length; i++) {
        const s = sectors[i]!;
        for (const ss of s.sub_segments) {
            for (const osid of ss.friendly_osids) {
                if (!osidToSectorIdx.has(osid)) osidToSectorIdx.set(osid, i);
            }
        }
    }

    // Find orphaned brigades (excluding general staff units)
    const sortedFormIds = Object.keys(formations).sort(strictCompare);
    for (const fid of sortedFormIds) {
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid) continue;
        if (assigned.has(fid)) continue;

        const fCorpsId = getFormationCorpsId(f);
        if (fCorpsId && EXEMPT_CORPS_IDS.has(fCorpsId)) continue; // Exempt

        // Unrestricted BFS (through any territory) to nearest sector
        const sectorIdx = bfsUnrestrictedToNearestSector(
            f.location_osid, osidToSectorIdx, adjacency
        );
        if (sectorIdx !== null) {
            sectors[sectorIdx]!.reserve_brigade_ids.push(fid);
            assigned.add(fid);
        }
    }

    // Re-sort reserve lists for determinism
    for (const s of sectors) {
        s.reserve_brigade_ids.sort(strictCompare);
    }
}

/**
 * BFS from startOsid through ALL adjacency (not restricted to friendly territory)
 * to find the nearest OSID belonging to any sector.
 */
function bfsUnrestrictedToNearestSector(
    startOsid: string,
    osidToSectorIdx: Map<string, number>,
    adjacency: Map<Osid, Osid[]>
): number | null {
    const direct = osidToSectorIdx.get(startOsid);
    if (direct !== undefined) return direct;

    const visited = new Set<string>();
    visited.add(startOsid);
    const queue: string[] = [startOsid];
    let head = 0;

    while (head < queue.length) {
        const osid = queue[head++]!;
        const neighbors = (adjacency.get(osid) ?? []).slice().sort(strictCompare);
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            visited.add(n);

            const sIdx = osidToSectorIdx.get(n);
            if (sIdx !== undefined) return sIdx;

            queue.push(n);
        }
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

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
// Proposal B: Merge Undersized Sub-Segments
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns true if two sub-segments are geographically adjacent: any friendly OSID
 * of one is the same as, or OSID-adjacent to, any friendly OSID of the other.
 */
function isSegmentAdjacent(
    a: CorpsFrontSubSegment,
    b: CorpsFrontSubSegment,
    osidAdjacency: Map<Osid, Osid[]>
): boolean {
    const bSet = new Set(b.friendly_osids);
    for (const osid of a.friendly_osids) {
        if (bSet.has(osid)) return true;
        for (const nb of osidAdjacency.get(osid) ?? []) {
            if (bSet.has(nb)) return true;
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
    osidAdjacency: Map<Osid, Osid[]>
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
            if (isSegmentAdjacent(target, candidate, osidAdjacency)) {
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
 * Build adjacency map between front edges (edges sharing an OSID endpoint).
 * When faction is provided, only connects edges via friendly-side OSIDs, ensuring
 * sub-segments are geographically contiguous on the friendly side.
 */
function buildEdgeAdjacency(
    edgeIds: string[],
    edgeMeta: Map<string, { a: string; b: string; side_a?: string | null; side_b?: string | null }>,
    faction?: string,
    osidAdjacency?: Map<Osid, Osid[]>
): Map<string, string[]> {
    const osidToEdges = new Map<string, string[]>();
    for (const eid of edgeIds) {
        const meta = edgeMeta.get(eid);
        if (!meta) continue;
        // When faction is provided, only group by friendly-side OSIDs so that sub-segments
        // are connected through shared friendly territory, not shared enemy territory.
        const addOsid = (osid: string, side: string | null | undefined) => {
            if (faction !== undefined && side !== faction) return;
            let list = osidToEdges.get(osid);
            if (!list) { list = []; osidToEdges.set(osid, list); }
            list.push(eid);
        };
        addOsid(meta.a, meta.side_a);
        addOsid(meta.b, meta.side_b);
    }

    const adj = new Map<string, string[]>();
    for (const edgesAtOsid of osidToEdges.values()) {
        edgesAtOsid.sort(strictCompare);
        for (let i = 0; i < edgesAtOsid.length; i++) {
            for (let j = i + 1; j < edgesAtOsid.length; j++) {
                const a = edgesAtOsid[i]!;
                const b = edgesAtOsid[j]!;
                let listA = adj.get(a);
                if (!listA) { listA = []; adj.set(a, listA); }
                if (!listA.includes(b)) listA.push(b);
                let listB = adj.get(b);
                if (!listB) { listB = []; adj.set(b, listB); }
                if (!listB.includes(a)) listB.push(a);
            }
        }
    }

    // Proposal A: also connect edges whose friendly-side OSIDs are OSID-adjacent.
    // E1=(A,X) and E2=(B,Y) become adjacent if A and B are neighbors in the OSID graph.
    // This makes sub-segments follow the geographic front line, not isolated by OSID.
    if (osidAdjacency) {
        for (const [osidA, edgesA] of osidToEdges) {
            for (const neighborOsid of osidAdjacency.get(osidA) ?? []) {
                const edgesB = osidToEdges.get(neighborOsid);
                if (!edgesB) continue;
                for (const ea of edgesA) {
                    for (const eb of edgesB) {
                        if (ea === eb) continue;
                        let listA = adj.get(ea);
                        if (!listA) { listA = []; adj.set(ea, listA); }
                        if (!listA.includes(eb)) listA.push(eb);
                        let listB = adj.get(eb);
                        if (!listB) { listB = []; adj.set(eb, listB); }
                        if (!listB.includes(ea)) listB.push(ea);
                    }
                }
            }
        }
    }

    // Sort each adjacency list
    for (const list of adj.values()) list.sort(strictCompare);
    return adj;
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
 * Find the sector that has targetOsid as an enemy-side OSID (i.e., the sector
 * whose brigades should defend it when attacked with no brigade physically there).
 * Returns the first matching sector in deterministic sector_id order, or null.
 */
export function findSectorForEnemyOsid(
    state: GameState,
    targetOsid: string
): CorpsFrontSector | null {
    const sectors = state.corps_front_sectors;
    if (!sectors) return null;
    for (const sid of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sid]!;
        for (const sub of sector.sub_segments) {
            if (sub.enemy_osids.includes(targetOsid)) return sector;
        }
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
    const corpsFormation = state.formations?.[corpsId];
    if (!corpsFormation) return null;
    return (corpsFormation as FormationState & { location_osid?: string }).location_osid ?? null;
}
