/**
 * OSID-level supply reachability for Phase II.
 * BFS from faction supply sources over OSID graph (faction-controlled OSIDs only).
 * Determinism: sorted iteration (faction_id, osid, edge_id). No timestamps or RNG.
 * Canon: SUPPLY_DESIGN.md, Systems Manual §14.
 */

import type { GameState } from './game_state.js';
import { getPoliticalControllerOSID } from './settlement_control.js';
import type { EdgeRecord } from '../map/settlements.js';
import type { CanonicalToOperationalMap, OperationalToCanonicalReverseMap } from '../data/operational_data.js';

export interface FactionSupplyReachabilityOsid {
    faction_id: string;
    sources: string[]; // OSIDs, sorted
    controlled: string[]; // OSIDs, sorted
    reachable_osids: string[];
    isolated_osids: string[];
    edges_used: string[]; // "osid1__osid2" sorted
}

export interface SupplyReachabilityOsidReport {
    schema: 1;
    turn: number;
    factions: FactionSupplyReachabilityOsid[]; // sorted by faction_id
}

function buildOsidAdjacency(edges: EdgeRecord[]): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const e of edges) {
        const a = e.a;
        const b = e.b;
        if (!adj.has(a)) adj.set(a, []);
        adj.get(a)!.push(b);
        if (!adj.has(b)) adj.set(b, []);
        adj.get(b)!.push(a);
    }
    for (const list of adj.values()) {
        list.sort((x, y) => x.localeCompare(y));
    }
    return adj;
}

/**
 * Compute supply reachability per faction over the OSID graph.
 * Controlled set = OSIDs where getPoliticalControllerOSID(state, osid) === faction.id.
 * Sources = faction.supply_sources (canonical SIDs) mapped to OSIDs via canonicalToOperational.
 */
export function computeSupplyReachabilityOsid(
    state: GameState,
    edges: EdgeRecord[],
    canonicalToOperational: CanonicalToOperationalMap,
    operationalToCanonical: OperationalToCanonicalReverseMap
): SupplyReachabilityOsidReport {
    const turn = state.meta.turn;
    const factions = [...(state.factions ?? [])].sort((a, b) => a.id.localeCompare(b.id));
    const adjacency = buildOsidAdjacency(edges);

    const factionResults: FactionSupplyReachabilityOsid[] = [];

    const allOsids = new Set<string>();
    for (const e of edges) {
        allOsids.add(e.a);
        allOsids.add(e.b);
    }

    for (const faction of factions) {
        const controlled: string[] = [];
        for (const osid of [...allOsids].sort((a, b) => a.localeCompare(b))) {
            const c = getPoliticalControllerOSID(state, osid, operationalToCanonical);
            if (c === faction.id) controlled.push(osid);
        }

        const sourcesRaw = faction.supply_sources ?? [];
        const sourceOsids = new Set<string>();
        for (const sid of sourcesRaw) {
            const osid = canonicalToOperational[sid];
            if (osid) sourceOsids.add(osid);
        }
        const sources = [...sourceOsids].sort((a, b) => a.localeCompare(b));

        const controlledSet = new Set(controlled);
        const visited = new Set<string>();
        const edgesUsed = new Set<string>();
        const queue: string[] = [];

        for (const osid of sources) {
            if (controlledSet.has(osid) && !visited.has(osid)) {
                visited.add(osid);
                queue.push(osid);
            }
        }

        while (queue.length > 0) {
            const current = queue.shift()!;
            const neighbors = adjacency.get(current) ?? [];
            for (const neighbor of neighbors) {
                if (visited.has(neighbor)) continue;
                const c = getPoliticalControllerOSID(state, neighbor, operationalToCanonical);
                if (c !== faction.id) continue;
                const edgeId = current < neighbor ? `${current}__${neighbor}` : `${neighbor}__${current}`;
                visited.add(neighbor);
                queue.push(neighbor);
                edgesUsed.add(edgeId);
            }
        }

        const reachable_osids = controlled.filter((osid) => visited.has(osid));
        const isolated_osids = controlled.filter((osid) => !visited.has(osid));
        factionResults.push({
            faction_id: faction.id,
            sources,
            controlled,
            reachable_osids,
            isolated_osids,
            edges_used: [...edgesUsed].sort((a, b) => a.localeCompare(b))
        });
    }

    return { schema: 1, turn, factions: factionResults };
}
