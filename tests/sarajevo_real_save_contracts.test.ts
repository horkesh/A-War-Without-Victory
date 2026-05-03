/**
 * Sarajevo real-save contracts (Cluster 7).
 *
 * Merged verbatim from:
 *   - sarajevo_core_fog_visibility_real_save.test.ts (1 it)
 *   - sarajevo_core_front_ownership_real_save.test.ts (1 it)
 *
 * Both tests load real serialized save artifacts to verify Sarajevo-core
 * truth survives a full save/load round trip.
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseGameState } from '../src/ui/map/data/GameStateAdapter';
import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors';
import type { GameState } from '../src/state/game_state.js';

const ROOT = process.cwd();

// ── Sarajevo core fog visibility from real save ──────────────────────────────

describe('Sarajevo core fog visibility from real save', () => {
    const FINAL_SAVE_PATH = path.join(ROOT, 'data', 'derived', 'latest_run_final_save.json');
    const SARAJEVO_CORE_OSID = 'op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo';

    it('keeps Sarajevo Dio - Novi Grad Sarajevo visible for RS player view when it is a live frontline settlement', () => {
        const state = JSON.parse(fs.readFileSync(FINAL_SAVE_PATH, 'utf8')) as Record<string, unknown>;
        const meta = (state.meta ?? {}) as Record<string, unknown>;
        state.meta = { ...meta, player_faction: 'RS' };

        const loaded = parseGameState(state);

        expect(loaded.player_faction).toBe('RS');
        expect(loaded.fogOfWar?.visibleEnemyOsids ?? []).toContain(SARAJEVO_CORE_OSID);
    });
});

// ── Sarajevo core front ownership from real save ─────────────────────────────

type ContactGraphEdge = {
    edge_id: string;
    a: string;
    b: string;
    shared_segments?: number;
};

describe('Sarajevo core front ownership from real save', () => {
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
