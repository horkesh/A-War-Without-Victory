import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

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

function collectMissingFactionSideOwners(state: GameState, sectors: Array<{ faction: string; edge_ids: string[] }>) {
    const byFactionEdge = new Map<string, number>();
    for (const sector of sectors) {
        for (const edgeId of sector.edge_ids ?? []) {
            const key = `${sector.faction}::${edgeId}`;
            byFactionEdge.set(key, (byFactionEdge.get(key) ?? 0) + 1);
        }
    }

    return (state.military.war_front_edges_osid ?? [])
        .flatMap((edge) => {
            const misses: Array<{ edge_id: string; faction: string; osid: string }> = [];
            if (edge.side_a) {
                const key = `${edge.side_a}::${edge.edge_id}`;
                if (!byFactionEdge.has(key)) {
                    misses.push({ edge_id: edge.edge_id, faction: edge.side_a, osid: edge.a });
                }
            }
            if (edge.side_b) {
                const key = `${edge.side_b}::${edge.edge_id}`;
                if (!byFactionEdge.has(key)) {
                    misses.push({ edge_id: edge.edge_id, faction: edge.side_b, osid: edge.b });
                }
            }
            return misses;
        })
        .sort((a, b) =>
            a.faction.localeCompare(b.faction)
            || a.edge_id.localeCompare(b.edge_id)
            || a.osid.localeCompare(b.osid),
        );
}

describe('Front-edge faction-side ownership from real save', () => {
    it('serializes every live war-edge side into a same-faction sector packet', () => {
        const state = loadState();
        const sectors = Object.values(state.military.corps_front_sectors ?? {});
        const missing = collectMissingFactionSideOwners(state, sectors);

        expect(missing).toEqual([]);
    });

    it('keeps every live war-edge side owned by a same-faction sector when rebuilt from the final state', () => {
        const state = loadState();
        const rebuilt = Object.values(buildCorpsFrontSectors(state, loadEdges(), null));
        const missing = collectMissingFactionSideOwners(state, rebuilt);

        expect(missing).toEqual([]);
    });
});
