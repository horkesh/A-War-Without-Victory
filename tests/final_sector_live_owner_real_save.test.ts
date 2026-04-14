import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { parseEdges } from '../src/map/settlements_parse.js';
import { buildOsidAdjacency, buildSharedBoundaryAdjacency, type Osid } from '../src/sim/combat/osid_adjacency.js';
import { splitNonContiguousSectors } from '../src/sim/combat/sector_splitting.js';
import { strictCompare } from '../src/state/validateGameState.js';

type SectorLike = {
    sector_id: string;
    corps_id: string;
    faction?: string;
    opposing_factions?: string[];
    edge_ids?: string[];
    territory_osids?: string[];
    assigned_brigade_ids?: string[];
    reserve_brigade_ids?: string[];
    rear_brigade_ids?: string[];
    sub_segments?: Array<{
        sub_segment_id: string;
        friendly_osids: string[];
        enemy_osids: string[];
        edge_ids: string[];
        length_edges: number;
        primary_brigade_ids: string[];
    }>;
    length_edges?: number;
};

function parseEdgeId(edgeId: string): { a: string; b: string } | null {
    const splitAt = edgeId.indexOf('__');
    if (splitAt <= 0) return null;
    return {
        a: edgeId.slice(0, splitAt),
        b: edgeId.slice(splitAt + 2),
    };
}

function liveOwnerCount(sector: SectorLike): number {
    return (sector.assigned_brigade_ids?.length ?? 0) + (sector.reserve_brigade_ids?.length ?? 0);
}

describe('final sector live owner invariant (real save)', () => {
    it('does not leave zero-owner sibling fragments with overlapping same-corps territory in the final save', () => {
        const state = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
        const rawGraph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));
        const graphEdges = parseEdges(rawGraph);
        const adjacency = buildOsidAdjacency(graphEdges);
        const sharedBoundaryAdj = buildSharedBoundaryAdjacency(graphEdges);
        const CASE_B_SPLIT_THRESHOLD = 0.00015;
        const caseBSplitAdj = new Map<Osid, Osid[]>();
        for (const edge of graphEdges) {
            if (!edge?.a || !edge?.b) continue;
            if (edge.min_dist !== undefined && edge.min_dist > CASE_B_SPLIT_THRESHOLD) continue;
            const listA = caseBSplitAdj.get(edge.a as Osid) ?? [];
            if (!listA.includes(edge.b as Osid)) listA.push(edge.b as Osid);
            caseBSplitAdj.set(edge.a as Osid, listA);
            const listB = caseBSplitAdj.get(edge.b as Osid) ?? [];
            if (!listB.includes(edge.a as Osid)) listB.push(edge.a as Osid);
            caseBSplitAdj.set(edge.b as Osid, listB);
        }
        for (const list of caseBSplitAdj.values()) list.sort(strictCompare);
        const edgeMeta = new Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>();
        for (const edge of state.military.war_front_edges_osid ?? []) {
            edgeMeta.set(edge.edge_id, { a: edge.a, b: edge.b, side_a: edge.side_a, side_b: edge.side_b });
        }
        const sectors = Object.values(state.military.corps_front_sectors ?? {}) as SectorLike[];

        const offenders = sectors.flatMap((target) => {
            if ((target.edge_ids?.length ?? 0) === 0 || liveOwnerCount(target) > 0) return [];

            const targetTerritory = new Set(target.territory_osids ?? []);
            const targetEndpoints = new Set<string>();
            for (const edgeId of target.edge_ids ?? []) {
                const parsed = parseEdgeId(edgeId);
                if (!parsed) continue;
                targetEndpoints.add(parsed.a);
                targetEndpoints.add(parsed.b);
            }

            return sectors.flatMap((candidate) => {
                if (candidate.sector_id === target.sector_id) return [];
                if (candidate.corps_id !== target.corps_id) return [];
                if (liveOwnerCount(candidate) === 0) return [];

                const candidateTerritory = new Set(candidate.territory_osids ?? []);
                const candidateEndpoints = new Set<string>();
                for (const edgeId of candidate.edge_ids ?? []) {
                    const parsed = parseEdgeId(edgeId);
                    if (!parsed) continue;
                    candidateEndpoints.add(parsed.a);
                    candidateEndpoints.add(parsed.b);
                }

                const territoryOverlap = [...targetTerritory].filter((osid) => candidateTerritory.has(osid));
                const endpointOverlap = [...targetEndpoints].filter((osid) => candidateEndpoints.has(osid));
                if (territoryOverlap.length === 0) return [];
                const merged = {
                    ...candidate,
                    edge_ids: [...new Set([...(candidate.edge_ids ?? []), ...(target.edge_ids ?? [])])].sort(strictCompare),
                    territory_osids: [...new Set([...(candidate.territory_osids ?? []), ...(target.territory_osids ?? [])])].sort(strictCompare),
                    assigned_brigade_ids: [...new Set([...(candidate.assigned_brigade_ids ?? []), ...(target.assigned_brigade_ids ?? [])])].sort(strictCompare),
                    reserve_brigade_ids: [...new Set([...(candidate.reserve_brigade_ids ?? []), ...(target.reserve_brigade_ids ?? [])])].sort(strictCompare),
                    rear_brigade_ids: [...new Set([...(candidate.rear_brigade_ids ?? []), ...(target.rear_brigade_ids ?? [])])].sort(strictCompare),
                    sub_segments: [...(candidate.sub_segments ?? []), ...(target.sub_segments ?? [])],
                    length_edges: [...new Set([...(candidate.edge_ids ?? []), ...(target.edge_ids ?? [])])].length,
                } as SectorLike;
                const pieces = splitNonContiguousSectors(
                    [merged as any],
                    adjacency,
                    candidate.faction,
                    edgeMeta,
                    sharedBoundaryAdj,
                    undefined,
                    caseBSplitAdj,
                    undefined,
                );
                if (pieces.length !== 1) return [];

                return [{
                    target: target.sector_id,
                    candidate: candidate.sector_id,
                    territoryOverlap,
                    endpointOverlap,
                }];
            });
        });

        expect(offenders).toEqual([]);
    });
});
