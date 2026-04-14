import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadOperationalCentroids } from '../src/data/operational_data.js';
import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors';
import type { GameState } from '../src/state/game_state.js';

type ContactGraphEdge = {
    edge_id: string;
    a: string;
    b: string;
    shared_segments?: number;
};

const ROOT = process.cwd();
const FINAL_SAVE_PATH = path.join(ROOT, 'data', 'derived', 'latest_run_final_save.json');
const CONTACT_GRAPH_PATH = path.join(ROOT, 'data', 'derived', 'operational', 'operational_contact_graph.json');

function loadState(): GameState {
    return JSON.parse(fs.readFileSync(FINAL_SAVE_PATH, 'utf8')) as GameState;
}

function loadEdges(): ContactGraphEdge[] {
    const graph = JSON.parse(fs.readFileSync(CONTACT_GRAPH_PATH, 'utf8')) as { edges: ContactGraphEdge[] };
    return graph.edges.filter((edge) => (edge.shared_segments ?? 0) >= 1);
}

function collectDuplicateEdgeOwners(
    sectors: Array<{ sector_id: string; corps_id: string; faction: string; edge_ids: string[] }>,
    keyFn: (sector: { sector_id: string; corps_id: string; faction: string }, edgeId: string) => string,
) {
    const ownerBuckets = new Map<string, string[]>();
    for (const sector of sectors) {
        for (const edgeId of sector.edge_ids ?? []) {
            const key = keyFn(sector, edgeId);
            const owners = ownerBuckets.get(key) ?? [];
            owners.push(sector.sector_id);
            ownerBuckets.set(key, owners);
        }
    }

    return [...ownerBuckets.entries()]
        .filter(([, owners]) => owners.length > 1)
        .map(([key, owners]) => ({ key, owners: [...owners].sort() }))
        .sort((a, b) => a.key.localeCompare(b.key));
}

describe('Frontline sectors from real save', () => {
    it('keeps each live front edge side owned by at most one sector per faction and corps after rebuild', async () => {
        const centroids = await loadOperationalCentroids(ROOT);
        const sectors = Object.values(buildCorpsFrontSectors(loadState(), loadEdges(), null, centroids));

        const duplicateFactionEdgeOwners = collectDuplicateEdgeOwners(
            sectors,
            (sector, edgeId) => `${sector.faction}::${edgeId}`,
        );
        const duplicateCorpsEdgeOwners = collectDuplicateEdgeOwners(
            sectors,
            (sector, edgeId) => `${sector.corps_id}::${edgeId}`,
        );

        expect(duplicateFactionEdgeOwners).toEqual([]);
        expect(duplicateCorpsEdgeOwners).toEqual([]);
    });
});
