import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

import { parseEdges } from '../src/map/settlements_parse.js';
import { buildOsidAdjacency, buildSharedBoundaryAdjacency, type Osid } from '../src/sim/combat/osid_adjacency.js';
import { splitNonContiguousSectors } from '../src/sim/combat/sector_splitting.js';
import { loadOperationalCentroids } from '../src/data/operational_data.js';
import { strictCompare } from '../src/state/validateGameState.js';
import type { CorpsFrontSector } from '../src/state/game_state.js';

const CASE_B_SPLIT_THRESHOLD = 0.00015;

describe('final sector geometry invariant (real save)', () => {
    it('serializes every sector as exactly one contiguous front line', async () => {
        const state = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
        const rawGraph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));
        const edges = parseEdges(rawGraph);
        const adjacency = buildOsidAdjacency(edges);
        const sharedBoundaryAdj = buildSharedBoundaryAdjacency(edges);
        const caseBSplitAdj = new Map<Osid, Osid[]>();

        for (const edge of edges) {
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

        const centroids = await loadOperationalCentroids(process.cwd());
        const sectors = Object.values(state.military.corps_front_sectors ?? {}) as CorpsFrontSector[];
        const fractured = sectors
            .map((sector) => ({
                sector_id: sector.sector_id,
                pieces: splitNonContiguousSectors(
                    [sector],
                    adjacency,
                    sector.faction,
                    edgeMeta,
                    sharedBoundaryAdj,
                    undefined,
                    caseBSplitAdj,
                    centroids,
                ),
            }))
            .filter((entry) => entry.pieces.length !== 1)
            .map((entry) => ({
                sector_id: entry.sector_id,
                pieces: entry.pieces.length,
                piece_edges: entry.pieces.map((piece) => piece.edge_ids),
            }));

        expect(fractured).toEqual([]);
    });
});
