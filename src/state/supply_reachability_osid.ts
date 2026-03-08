/**
 * OSID-level supply reachability for War phase.
 * BFS from faction supply sources over OSID graph (faction-controlled OSIDs only).
 * Determinism: sorted iteration (faction_id, osid, edge_id). No timestamps or RNG.
 * Canon: SUPPLY_DESIGN.md, Systems Manual §14.
 */

import type { GameState } from './game_state.js';
import { getPoliticalControllerOSID } from './settlement_control.js';
import type { EdgeRecord } from '../map/settlements.js';
import type { CanonicalToOperationalMap, OperationalToCanonicalReverseMap } from '../data/operational_data.js';
import { runSupplyBfs } from './supply_reachability.js';
import { buildOsidAdjacency } from '../sim/combat/osid_adjacency.js';

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
        const bfs = runSupplyBfs({
            controlled,
            sources,
            isTraversable: (node) => controlledSet.has(node),
            getNeighbors: (node) => adjacency.get(node) ?? [],
        });

        factionResults.push({
            faction_id: faction.id,
            sources,
            controlled,
            reachable_osids: bfs.reachable,
            isolated_osids: bfs.isolated,
            edges_used: bfs.edgesUsed
        });
    }

    return { schema: 1, turn, factions: factionResults };
}
