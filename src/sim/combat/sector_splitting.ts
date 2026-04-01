/**
 * Sector splitting and merging: contiguity splits, undersized merges.
 * Extracted from corps_front_sectors.ts — pure refactoring, zero behavior change.
 */

import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FactionId,
    FormationId,
} from '../../state/game_state.js';
import type { OsidCentroidMap } from '../../data/operational_data_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import { findConnectedComponents } from '../../utils/graph.js';
import type { Osid } from './osid_adjacency.js';
import {
    MIN_SECTOR_EDGES,
} from './corps_front_sectors_constants.js';
import { buildEdgeAdjacency, buildEdgeAdjacencyStrictCaseB, isCaseBBridge, isOsidAdjacent, isSegmentAdjacent } from './sector_edge_adjacency.js';

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
    centroids?: OsidCentroidMap,
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
        // Guard: if upstream sub_segments had empty friendly_osids (Path 2 corruption),
        // rebuild allFriendly directly from edgeMeta using the same faction-side logic
        // as findSubSegments. Without this, allFriendly.has(osidA) is always false and
        // osidB is blindly treated as friendly for every edge.
        if (allFriendly.size === 0 && faction && edgeMeta) {
            for (const eid of sector.edge_ids) {
                const meta = edgeMeta.get(eid);
                if (!meta) continue;
                if (meta.side_a === faction) { allFriendly.add(meta.a); }
                else { allFriendly.add(meta.b); }
            }
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
            edgeAdj = buildEdgeAdjacency(sector.edge_ids, edgeMeta, faction, osidAdjacency, sharedBoundaryAdj, centroids);
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
                sector.edge_ids, edgeMeta, faction, sharedBoundaryAdj ?? osidAdjacency, strictAdj ?? osidAdjacency, centroids
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
                    else { compFriendly.add(meta.b); compEnemy.add(meta.a); }
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

/**
 * Iteratively merge sub-segments below MIN_SECTOR_EDGES into their nearest
 * OSID-adjacent neighbor. Isolated segments (enclaves with no adjacent neighbor)
 * are kept as-is. Always merges the smallest segment first; ties broken by ID.
 */
export function mergeUndersizedSubSegments(
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
 * Combine two sub-segments into one, merging their edge IDs and OSID sets.
 */
export function mergeSubSegmentsInto(
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
export function mergeUndersizedSectors(
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
export function areSectorsEdgeAdjacent(
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
export function mergeSectors(
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
