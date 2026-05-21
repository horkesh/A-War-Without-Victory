/**
 * Sector building: sub-segments, splitting, decomposition.
 * Extracted from corps_front_sectors.ts — pure refactoring, zero behavior change.
 */

import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import type { OsidCentroidMap } from '../../data/operational_data_types.js';
import { computeLocalFrontDefensivePower } from './local_front_defense.js';
import { getFormationCorpsId } from './corps_sector_partition.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { Osid } from './osid_adjacency.js';
import {
    MAX_SECTOR_BRIGADES,
    MAX_SECTOR_EDGES,
} from './corps_front_sectors_constants.js';
import { buildEdgeAdjacency } from './sector_edge_adjacency.js';
import { mergeUndersizedSubSegments, splitNonContiguousSectors, mergeUndersizedSectors } from './sector_splitting.js';
import { deduplicateBrigadesAcrossSectors } from './brigade_assignment.js';

type SectorPartitionPerfTimer = <T>(label: string, fn: () => T) => T;

interface SectorFormationScanIndex {
    assignedCandidateIds: readonly FormationId[];
    enemyPersonnelByLocation: ReadonlyMap<string, number>;
}

function isActiveCombatFormation(formation: FormationState | undefined): formation is FormationState {
    return !!formation
        && formation.status === 'active'
        && (formation.kind === 'brigade' || formation.kind === 'og' || formation.kind === 'operational_group');
}

function buildActiveCombatFormationScanIds(
    formations: Record<FormationId, FormationState>,
): FormationId[] {
    return Object.keys(formations)
        .sort(strictCompare)
        .filter((fid): fid is FormationId => isActiveCombatFormation(formations[fid]));
}

function buildSectorFormationScanIndex(
    formations: Record<FormationId, FormationState>,
    faction: FactionId,
    corpsId: FormationId,
    formationScanIds: readonly FormationId[],
): SectorFormationScanIndex {
    const assignedCandidateIds: FormationId[] = [];
    const enemyPersonnelByLocation = new Map<string, number>();

    for (const fid of formationScanIds) {
        const formation = formations[fid];
        if (!formation?.location_osid) continue;
        if (formation.faction === faction) {
            if (getFormationCorpsId(formation) === corpsId) assignedCandidateIds.push(fid);
            continue;
        }
        enemyPersonnelByLocation.set(
            formation.location_osid,
            (enemyPersonnelByLocation.get(formation.location_osid) ?? 0) + (formation.personnel ?? 0),
        );
    }

    return {
        assignedCandidateIds,
        enemyPersonnelByLocation,
    };
}

/**
 * Decompose a corps' front edges into connected sub-segments via BFS.
 */
export function findSubSegments(
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
export function buildMultiSectorsForCorps(
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
    friendlyOsids?: Set<string>,
    perfTime: SectorPartitionPerfTimer = (_label, fn) => fn(),
): CorpsFrontSector[] {
    if (edgeIds.length === 0) return [];

    // Build edge metadata lookup from the already-derived front-edge packet.
    // Sector geometry must inherit the exact edge-side truth from
    // war_front_edges_osid, not re-derive friendly/enemy sides from broad
    // municipality-level control fallback. Re-derivation can smear canonical
    // control across operational OSIDs and fuse unrelated front arcs into one
    // fake sector line.
    const edgeMeta = perfTime(`buildMultiSectorsForCorps:${corpsId}:edge-meta-lookup`, () => {
        const nextEdgeMeta = new Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>();
        const frontEdgeLookup = new Map(
            osidFrontEdges.map((edge) => [edge.edge_id, edge] as const),
        );
        for (const eid of edgeIds) {
            const frontEdge = frontEdgeLookup.get(eid);
            if (frontEdge) {
                nextEdgeMeta.set(eid, {
                    a: frontEdge.a,
                    b: frontEdge.b,
                    side_a: frontEdge.side_a,
                    side_b: frontEdge.side_b,
                });
                continue;
            }
            const sep = eid.indexOf('__');
            if (sep < 0) continue;
            const osidA = eid.slice(0, sep);
            const osidB = eid.slice(sep + 2);
            nextEdgeMeta.set(eid, {
                a: osidA,
                b: osidB,
                side_a: getPoliticalControllerOSID(state, osidA, reverseMap ?? undefined),
                side_b: getPoliticalControllerOSID(state, osidB, reverseMap ?? undefined),
            });
        }
        return nextEdgeMeta;
    });

    // Step 1: Find connected components via triple-junction connectivity.
    // Pass sharedBoundaryAdj so Case A/B only connect edges at true polygon
    // boundaries (≤5.5m). Without this, distance_contact adjacency (>33m) bridges
    // disconnected fronts — e.g. hajderovici_2↔kamensko_2 (38m) bridges Zavidovici
    // to Olovo via Case B at gornja_borovica_2.
    let subSegments = perfTime(`buildMultiSectorsForCorps:${corpsId}:subsegment-discovery`, () => findSubSegments(
        corpsId, faction, edgeIds, edgeMeta, adjacency, sharedBoundaryAdj, centroids
    ));
    // Proposal B: merge undersized sub-segments up to MIN_SECTOR_EDGES.
    // Do NOT pass friendlyOsids — merging should use direct OSID adjacency only,
    // not unbounded BFS through rear territory (which merges distant segments).
    subSegments = perfTime(`buildMultiSectorsForCorps:${corpsId}:subsegment-merge-undersized`, () => mergeUndersizedSubSegments(
        corpsId, subSegments, adjacency, sharedBoundaryAdj, caseBSplitAdj, centroids
    ));
    if (subSegments.length === 0) return [];

    // Step 2 (Phase 1D): Split oversized sub-segments
    subSegments = perfTime(`buildMultiSectorsForCorps:${corpsId}:subsegment-edge-cap-split`, () => splitOversizedSubSegments(
        corpsId, subSegments, edgeMeta
    ));

    // Renumber sub-segments deterministically
    perfTime(`buildMultiSectorsForCorps:${corpsId}:subsegment-renumber`, () => {
        subSegments.sort((a, b) => strictCompare(a.sub_segment_id, b.sub_segment_id));
        for (let i = 0; i < subSegments.length; i++) {
            subSegments[i]!.sub_segment_id = `subseg:${corpsId}:${i}`;
        }
    });

    // Step 3: Build sectors with full brigade assignment (front + interior BFS)
    const activeCombatFormationScanIds = perfTime(`buildMultiSectorsForCorps:${corpsId}:active-combat-formation-scan-ids`, () => (
        buildActiveCombatFormationScanIds(formations)
    ));
    const sectorFormationScanIndex = perfTime(`buildMultiSectorsForCorps:${corpsId}:sector-formation-scan-index`, () => (
        buildSectorFormationScanIndex(formations, faction, corpsId, activeCombatFormationScanIds)
    ));

    const sectors = perfTime(`buildMultiSectorsForCorps:${corpsId}:sector-object-construction`, () => {
        const builtSectors: CorpsFrontSector[] = [];
        for (let i = 0; i < subSegments.length; i++) {
            const sector = buildSectorFromSubSegments(
                state, corpsId, faction, i, [subSegments[i]!], edgeMeta,
                formations, perfTime, activeCombatFormationScanIds, sectorFormationScanIndex
            );
            if (sector) builtSectors.push(sector);
        }
        return builtSectors;
    });

    // Step 4 (Phase 1E): Recursively split sectors exceeding MAX_SECTOR_BRIGADES
    const finalSectors = perfTime(`buildMultiSectorsForCorps:${corpsId}:brigade-cap-enforcement`, () => {
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
                                edgeMeta, formations, perfTime, activeCombatFormationScanIds, sectorFormationScanIndex
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
        return sectorPool;
    });

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
    const contiguousSectors = perfTime(`buildMultiSectorsForCorps:${corpsId}:split-non-contiguous-sectors`, () => splitNonContiguousSectors(
        finalSectors, adjacency, faction, edgeMeta, sharedBoundaryAdj, friendlyOsids, caseBSplitAdj, centroids
    ));

    // Step 4c: Post-split merge — re-merge undersized sectors created by contiguity
    // splits back into adjacent same-corps sectors. Uses caseBSplitAdj (16.6m) for
    // edge adjacency — same threshold as the split, so merges never re-bridge
    // connections that were cut. Friendly BFS component gate provides additional
    // safety against merging sectors separated by enemy territory.
    const mergedSectors = perfTime(`buildMultiSectorsForCorps:${corpsId}:post-split-merge`, () => mergeUndersizedSectors(
        corpsId, contiguousSectors, edgeMeta, faction, caseBSplitAdj, friendlyOsids
    ));

    // Brigade assignment (territory_osids, assigned/reserve classification) is now
    // handled faction-wide by assignTerritoryVoronoi + classifyBrigadesByTerritory
    // in buildFactionSectors Steps 5-6.

    // Filter ghost/orphan sectors: require at least 1 front edge.
    // Sectors with territory but 0 edges are pockets that lost their front — prune them.
    return perfTime(`buildMultiSectorsForCorps:${corpsId}:final-filter`, () => mergedSectors.filter(s => s.length_edges > 0));
}

/**
 * Recursively split sub-segments exceeding MAX_SECTOR_EDGES at their midpoint.
 * After each split, decomposes halves into connected components to guarantee
 * geographic contiguity (midpoint split on branching graphs can fragment).
 */
export function splitOversizedSubSegments(
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
export function decomposeIntoConnectedComponents(
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
export function splitSubSegmentAtMidpoint(
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
export function walkEdgeChain(
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
export function buildSubSegmentFromEdges(
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
export function buildSectorFromSubSegments(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    sectorIndex: number,
    subSegments: CorpsFrontSubSegment[],
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    formations: Record<FormationId, FormationState>,
    perfTime: SectorPartitionPerfTimer = (_label, fn) => fn(),
    activeCombatFormationScanIds?: readonly FormationId[],
    sectorFormationScanIndex?: SectorFormationScanIndex,
): CorpsFrontSector | null {
    if (subSegments.length === 0) return null;

    const {
        allEdgeIds,
        allFriendlyOsids,
        allEnemyOsids,
        allOpposingFactions,
    } = perfTime(`buildSectorFromSubSegments:${corpsId}:${sectorIndex}:input-aggregation`, () => {
        const nextEdgeIds = new Set<string>();
        const nextFriendlyOsids = new Set<string>();
        const nextEnemyOsids = new Set<string>();
        const nextOpposingFactions = new Set<string>();

        for (const ss of subSegments) {
            for (const eid of ss.edge_ids) nextEdgeIds.add(eid);
            for (const o of ss.friendly_osids) nextFriendlyOsids.add(o);
            for (const o of ss.enemy_osids) nextEnemyOsids.add(o);
            for (const eid of ss.edge_ids) {
                const meta = edgeMeta.get(eid);
                if (!meta) continue;
                const enemy = meta.side_a === faction ? meta.side_b : meta.side_a;
                if (enemy) nextOpposingFactions.add(enemy);
            }
        }

        return {
            allEdgeIds: nextEdgeIds,
            allFriendlyOsids: nextFriendlyOsids,
            allEnemyOsids: nextEnemyOsids,
            allOpposingFactions: nextOpposingFactions,
        };
    });

    const sortedEdgeIds = perfTime(`buildSectorFromSubSegments:${corpsId}:${sectorIndex}:sorted-edge-list`, () => [...allEdgeIds].sort(strictCompare));
    const totalEdges = sortedEdgeIds.length;
    const formationScanIds = activeCombatFormationScanIds ?? buildActiveCombatFormationScanIds(formations);
    const scanIndex = sectorFormationScanIndex ?? buildSectorFormationScanIndex(formations, faction, corpsId, formationScanIds);

    // Per-sector brigade assignment: brigade at OSID in sector's friendly_osids
    const assignedBrigadeIds = perfTime(`buildSectorFromSubSegments:${corpsId}:${sectorIndex}:assigned-brigade-scan`, () => {
        const nextAssignedBrigadeIds: FormationId[] = [];
        for (const fid of scanIndex.assignedCandidateIds) {
            const f = formations[fid];
            if (!f.location_osid || !allFriendlyOsids.has(f.location_osid)) continue;
            nextAssignedBrigadeIds.push(fid);
        }
        return nextAssignedBrigadeIds;
    });

    const density = totalEdges > 0 ? assignedBrigadeIds.length / totalEdges : 0;
    const defensivePower = perfTime(`buildSectorFromSubSegments:${corpsId}:${sectorIndex}:defensive-power`, () => computeLocalFrontDefensivePower(
        formations, assignedBrigadeIds, totalEdges
    ));

    const enemyPower = perfTime(`buildSectorFromSubSegments:${corpsId}:${sectorIndex}:enemy-power-scan`, () => {
        let nextEnemyPower = 0;
        for (const osid of allEnemyOsids) {
            nextEnemyPower += scanIndex.enemyPersonnelByLocation.get(osid) ?? 0;
        }
        return nextEnemyPower;
    });
    const threatRatio = defensivePower > 0 ? enemyPower / defensivePower : 0;

    return perfTime(`buildSectorFromSubSegments:${corpsId}:${sectorIndex}:sector-record-assembly`, () => ({
        sector_id: `sector:${corpsId}:${sectorIndex}`,
        corps_id: corpsId,
        faction,
        opposing_factions: [...allOpposingFactions].sort(strictCompare),
        edge_ids: sortedEdgeIds,
        sub_segments: subSegments,
        length_edges: totalEdges,
        territory_osids: [],
        assigned_brigade_ids: assignedBrigadeIds,
        reserve_brigade_ids: [],
        rear_brigade_ids: [],
        density,
        threat_ratio: threatRatio,
        defensive_power: defensivePower,
        sector_stance: 'defend',
        stance_source: 'bot',
    }));
}
