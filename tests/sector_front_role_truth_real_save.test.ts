import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors';
import type { GameState } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

type ContactGraphEdge = {
    edge_id: string;
    a: string;
    b: string;
    shared_segments?: number;
};

const ROOT = process.cwd();
const FINAL_SAVE_PATH = path.join(ROOT, 'runs', 'apr1992_definitive_40w__480e358e5d284e09__w40_n1438', 'final_save.json');
const CONTACT_GRAPH_PATH = path.join(ROOT, 'data', 'derived', 'operational', 'operational_contact_graph.json');

function loadState(): GameState {
    return JSON.parse(fs.readFileSync(FINAL_SAVE_PATH, 'utf8')) as GameState;
}

function loadEdges(): ContactGraphEdge[] {
    const graph = JSON.parse(fs.readFileSync(CONTACT_GRAPH_PATH, 'utf8')) as { edges: ContactGraphEdge[] };
    return graph.edges.filter((edge) => (edge.shared_segments ?? 0) >= 1);
}

function buildAdjacency(edges: ContactGraphEdge[]): Map<Osid, Osid[]> {
    const adjacency = new Map<Osid, Osid[]>();
    for (const edge of edges) {
        const left = adjacency.get(edge.a as Osid) ?? [];
        if (!left.includes(edge.b as Osid)) left.push(edge.b as Osid);
        adjacency.set(edge.a as Osid, left);

        const right = adjacency.get(edge.b as Osid) ?? [];
        if (!right.includes(edge.a as Osid)) right.push(edge.a as Osid);
        adjacency.set(edge.b as Osid, right);
    }
    for (const neighbors of adjacency.values()) neighbors.sort();
    return adjacency;
}

describe('Frontline role truth from real save', () => {
    it('keeps every sector front inside the sector territory packet and serializes formation roles from physical position truth', () => {
        const state = loadState();
        const edges = loadEdges();
        const adjacency = buildAdjacency(edges);
        const sectors = Object.values(buildCorpsFrontSectors(state, edges, null));
        const violations: Array<{ sector: string; detail: string }> = [];

        for (const sector of sectors) {
            const frontOsids = new Set<string>();
            for (const subSegment of sector.sub_segments) {
                for (const osid of subSegment.friendly_osids) frontOsids.add(osid);
            }

            const missingFrontTerritory = [...frontOsids]
                .filter((osid) => !sector.territory_osids.includes(osid))
                .sort();
            if (missingFrontTerritory.length > 0) {
                violations.push({
                    sector: sector.sector_id,
                    detail: `missing front territory: ${missingFrontTerritory.join(', ')}`,
                });
            }

            const friendlyOsids = new Set(
                Object.entries(state.political.political_controllers ?? {})
                    .filter(([, controller]) => controller === sector.faction)
                    .map(([osid]) => osid),
            );
            const reserveBand = new Set<string>();
            for (const frontOsid of frontOsids) {
                for (const neighbor of adjacency.get(frontOsid as Osid) ?? []) {
                    if (frontOsids.has(neighbor)) continue;
                    if (!friendlyOsids.has(neighbor)) continue;
                    reserveBand.add(neighbor);
                }
            }

            for (const brigadeId of [...sector.assigned_brigade_ids, ...sector.reserve_brigade_ids]) {
                const formation = state.military.formations?.[brigadeId];
                const locationOsid = formation?.location_osid;
                const role = formation?.assignment?.kind === 'sector' ? formation.assignment.role : null;
                if (!locationOsid || !role) continue;

                if (role === 'front' && !frontOsids.has(locationOsid)) {
                    violations.push({
                        sector: sector.sector_id,
                        detail: `front role off front: ${brigadeId} at ${locationOsid}`,
                    });
                }
                if (role === 'reserve' && !reserveBand.has(locationOsid) && !frontOsids.has(locationOsid)) {
                    violations.push({
                        sector: sector.sector_id,
                        detail: `reserve role outside reserve band: ${brigadeId} at ${locationOsid}`,
                    });
                }
                if (role === 'rear' && (frontOsids.has(locationOsid) || reserveBand.has(locationOsid))) {
                    violations.push({
                        sector: sector.sector_id,
                        detail: `rear role too close to front: ${brigadeId} at ${locationOsid}`,
                    });
                }
            }
        }

        expect(violations).toEqual([]);
    });

    it('keeps any rear-only sector packets physically truthful when rebuild leaves them alive', () => {
        const state = loadState();
        const edges = loadEdges();
        const adjacency = buildAdjacency(edges);
        const sectors = Object.values(buildCorpsFrontSectors(state, edges, null));

        const rearOnly = sectors
            .filter((sector) =>
                sector.length_edges > 0
                && sector.assigned_brigade_ids.length === 0
                && sector.reserve_brigade_ids.length === 0
                && (sector.rear_brigade_ids?.length ?? 0) > 0,
            )
            .map((sector) => ({
                sector: sector.sector_id,
                corps: sector.corps_id,
                rear: [...(sector.rear_brigade_ids ?? [])].sort(),
                edges: sector.length_edges,
                frontOsids: [...new Set(sector.sub_segments.flatMap((subSegment) => subSegment.friendly_osids))].sort(),
                territoryOsids: [...sector.territory_osids].sort(),
            }))
            .sort((a, b) => a.sector.localeCompare(b.sector));

        const violations = rearOnly.flatMap((sector) => {
            const frontSet = new Set(sector.frontOsids);
            const territorySet = new Set(sector.territoryOsids);
            const reserveBand = new Set<string>();
            for (const frontOsid of frontSet) {
                for (const neighbor of adjacency.get(frontOsid as Osid) ?? []) {
                    if (frontSet.has(neighbor)) continue;
                    if (!territorySet.has(neighbor)) continue;
                    reserveBand.add(neighbor);
                }
            }

            return sector.rear.flatMap((brigadeId) => {
                const locationOsid = state.military.formations?.[brigadeId]?.location_osid;
                if (!locationOsid) {
                    return [`${sector.sector}: ${brigadeId} has no location_osid`];
                }
                if (!territorySet.has(locationOsid)) {
                    return [`${sector.sector}: ${brigadeId} at ${locationOsid} is outside sector territory`];
                }
                if (frontSet.has(locationOsid) || reserveBand.has(locationOsid)) {
                    return [`${sector.sector}: ${brigadeId} at ${locationOsid} is too close to stay rear-only`];
                }
                return [];
            });
        });

        expect(violations).toEqual([]);
    });
});
