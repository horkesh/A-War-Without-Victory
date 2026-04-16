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
const FINAL_SAVE_PATH = path.join(ROOT, 'runs', 'apr1992_definitive_40w__480e358e5d284e09__w40_n1438', 'final_save.json');
const CONTACT_GRAPH_PATH = path.join(ROOT, 'data', 'derived', 'operational', 'operational_contact_graph.json');
const hasSave = fs.existsSync(FINAL_SAVE_PATH);

const SARAJEVO_CORE_EDGE_IDS = [
    'op:ilidza:sarajevo_dio_ilidza_2__op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo',
    'op:ilidza:sarajevo_dio_novi_grad_sarajevo__op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo',
    'op:novi_grad_sarajevo:recica__op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo',
    'op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo__op:novo_sarajevo:lukavica',
    'op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo__op:vogosca:hotonj',
    'op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo__op:vogosca:vogosca_3',
    'op:novo_sarajevo:lukavica__op:novo_sarajevo:sarajevo_dio_novo_sarajevo',
] as const;

function loadState(): GameState {
    return JSON.parse(fs.readFileSync(FINAL_SAVE_PATH, 'utf8')) as GameState;
}

function loadEdges(): ContactGraphEdge[] {
    const graph = JSON.parse(fs.readFileSync(CONTACT_GRAPH_PATH, 'utf8')) as { edges: ContactGraphEdge[] };
    return graph.edges.filter((edge) => (edge.shared_segments ?? 0) >= 1);
}

describe('Sarajevo core front ownership from real save', () => {
    it.skipIf(!hasSave)('keeps every live Sarajevo siege-core war edge owned by both 1st Corps and SRK sector packets when rebuilt', () => {
        const state = loadState();
        const sectors = buildCorpsFrontSectors(state, loadEdges(), null);
        const ownerByEdge = new Map<string, string[]>();

        for (const sector of Object.values(sectors)) {
            for (const edgeId of sector.edge_ids) {
                const owners = ownerByEdge.get(edgeId) ?? [];
                owners.push(sector.sector_id);
                ownerByEdge.set(edgeId, owners);
            }
        }

        for (const edgeId of SARAJEVO_CORE_EDGE_IDS) {
            const owners = ownerByEdge.get(edgeId) ?? [];
            expect(
                owners.some((sectorId) => sectorId.startsWith('sector:arbih_1st_corps:')),
                `${edgeId} should remain owned by an arbih_1st_corps sector`,
            ).toBe(true);
            expect(
                owners.some((sectorId) => sectorId.startsWith('sector:vrs_sarajevo_romanija:')),
                `${edgeId} should remain owned by a vrs_sarajevo_romanija sector`,
            ).toBe(true);
        }
    });
});
