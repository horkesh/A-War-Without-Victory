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
        osidFrontEdges, faction, osidToCorps, state, reverseMap
    );

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
        if (!f.location_osid || !f.corps_id) continue;
        if (!friendlyOsids.has(f.location_osid)) continue;
        if (result.has(f.location_osid)) continue;
        // Brigade at unreachable friendly OSID → assign to its corps and BFS from there
        if (!corpsIds.includes(f.corps_id)) continue;
        result.set(f.location_osid, f.corps_id);
        const pocketQueue: Osid[] = [f.location_osid];
        let pHead = 0;
        while (pHead < pocketQueue.length) {
            const po = pocketQueue[pHead++]!;
            const pNeighbors = adjacency.get(po) ?? [];
            for (const pn of pNeighbors) {
                if (result.has(pn)) continue;
                if (!friendlyOsids.has(pn)) continue;
                result.set(pn, f.corps_id);
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
        if (!f || f.corps_id !== corpsId) continue;
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
 */
function partitionFrontEdges(
    osidFrontEdges: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    faction: FactionId,
    osidToCorps: Map<Osid, FormationId>,
    state: GameState,
    reverseMap: Map<string, string[]> | null
): Map<FormationId, string[]> {
    const result = new Map<FormationId, string[]>();

    // Sort front edges for deterministic processing
    const sorted = [...osidFrontEdges]
        .filter(e => e.side_a === faction || e.side_b === faction)
        .sort((a, b) => strictCompare(a.edge_id, b.edge_id));

    for (const edge of sorted) {
        // Identify the friendly-side OSID
        const friendlyOsid = edge.side_a === faction ? edge.a : edge.b;
        const corpsId = osidToCorps.get(friendlyOsid);
        if (!corpsId) continue; // Edge on unclaimed OSID — skip

        let list = result.get(corpsId);
        if (!list) { list = []; result.set(corpsId, list); }
        list.push(edge.edge_id);
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 4: Build Multi-Sector from Sub-Segments
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum front edges for a sub-segment to be promoted to its own sector. */
export const MIN_SECTOR_EDGES = 5;

/**
 * Decompose a corps' front edges into connected sub-segments via BFS.
 */
function findSubSegments(
    corpsId: FormationId,
    faction: FactionId,
    edgeIds: string[],
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>
): CorpsFrontSubSegment[] {
    const edgeSet = new Set(edgeIds);
    const edgeAdj = buildEdgeAdjacency(edgeIds, edgeMeta);
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
 * Every connected component (sub-segment) becomes its own sector, regardless
 * of edge count. Non-contiguous fronts (pockets, enclaves) always get separate
 * sectors — no cross-component merging.
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

    const subSegments = findSubSegments(corpsId, faction, edgeIds, edgeMeta);
    if (subSegments.length === 0) return [];

    // Each connected component becomes its own sector (sorted for determinism)
    subSegments.sort((a, b) => strictCompare(a.sub_segment_id, b.sub_segment_id));

    const sectors: CorpsFrontSector[] = [];
    for (let i = 0; i < subSegments.length; i++) {
        const sector = buildSectorFromSubSegments(
            state, corpsId, faction, i, [subSegments[i]!], edgeMeta, formations
        );
        if (sector) sectors.push(sector);
    }

    return sectors;
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
        if (f.corps_id !== corpsId) continue;
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
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build adjacency map between front edges (edges sharing an OSID endpoint).
 */
function buildEdgeAdjacency(
    edgeIds: string[],
    edgeMeta: Map<string, { a: string; b: string }>
): Map<string, string[]> {
    const osidToEdges = new Map<string, string[]>();
    for (const eid of edgeIds) {
        const meta = edgeMeta.get(eid);
        if (!meta) continue;
        let listA = osidToEdges.get(meta.a);
        if (!listA) { listA = []; osidToEdges.set(meta.a, listA); }
        listA.push(eid);
        let listB = osidToEdges.get(meta.b);
        if (!listB) { listB = []; osidToEdges.set(meta.b, listB); }
        listB.push(eid);
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

