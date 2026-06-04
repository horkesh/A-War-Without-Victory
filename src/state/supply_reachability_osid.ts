/**
 * OSID-level supply reachability for War phase.
 * BFS from faction supply sources over OSID graph (faction-controlled OSIDs only).
 * Determinism: sorted iteration (faction_id, osid, edge_id). No timestamps or RNG.
 * Canon: SUPPLY_DESIGN.md, Systems Manual §14.
 *
 * v0.9.3 C2 — two-layer optimization:
 *   1. Single-pass controlled-set bucketing: one `getPoliticalControllerOSID`
 *      call per OSID (was: one per OSID × faction = 3× waste).
 *   2. Per-GameState, per-faction BFS result cache keyed on
 *      `(sources, controlled, edge topology)` string hash. When a faction's
 *      controlled set, sources, and graph topology are byte-identical to the
 *      previous turn, the cached BFS result is reused. Correctness follows
 *      from runSupplyBfs being pure over (sources, controlled, adjacency).
 *   No caller mutates the returned per-faction objects — grep-audited; arrays
 *   are shared across turns on cache hit.
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

/** Per-GameState, per-faction BFS memo. WeakMap keys to GameState identity so
 *  cache lifetime matches the scenario run. */
const factionSupplyCache: WeakMap<
    GameState,
    Map<string, { key: string; result: FactionSupplyReachabilityOsid }>
> = new WeakMap();

/** Compose the deterministic cache key: sorted sources ∥ sorted controlled.
 *  OSID strings use `:` separators so `,` is safe as the join delimiter. */
function edgeTopologyFingerprint(edges: readonly EdgeRecord[]): string {
    return edges
        .map((edge) => edge.a < edge.b ? `${edge.a}__${edge.b}` : `${edge.b}__${edge.a}`)
        .sort((a, b) => a.localeCompare(b))
        .join(',');
}

function factionCacheKey(
    sources: readonly string[],
    controlled: readonly string[],
    edgeTopology: string,
): string {
    return sources.join(',') + '||' + controlled.join(',') + '||edges=' + edgeTopology;
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
    const adjacency = buildOsidAdjacency(edges); // C1-memoized
    const edgeTopology = edgeTopologyFingerprint(edges);

    // Build the set of all OSIDs from edges + hoist the sort out of the faction loop.
    const allOsids = new Set<string>();
    for (const e of edges) {
        allOsids.add(e.a);
        allOsids.add(e.b);
    }
    const sortedOsids = [...allOsids].sort((a, b) => a.localeCompare(b));

    // Single-pass controlled-set bucketing: one political-controller lookup
    // per OSID, dispatched to the owning faction's list. Preserves per-faction
    // sort order because sortedOsids is already sorted.
    const controlledByFaction = new Map<string, string[]>();
    for (const faction of factions) controlledByFaction.set(faction.id, []);
    for (const osid of sortedOsids) {
        const c = getPoliticalControllerOSID(state, osid, operationalToCanonical);
        if (c) {
            const bucket = controlledByFaction.get(c);
            if (bucket) bucket.push(osid);
        }
    }

    // Fetch (or create) the per-GameState cache bucket.
    let perFactionCache = factionSupplyCache.get(state);
    if (!perFactionCache) {
        perFactionCache = new Map();
        factionSupplyCache.set(state, perFactionCache);
    }

    const factionResults: FactionSupplyReachabilityOsid[] = [];

    for (const faction of factions) {
        const controlled = controlledByFaction.get(faction.id) ?? [];

        const sourcesRaw = faction.supply_sources ?? [];
        const sourceOsids = new Set<string>();
        for (const sid of sourcesRaw) {
            const osid = canonicalToOperational[sid];
            if (osid) sourceOsids.add(osid);
        }
        const sources = [...sourceOsids].sort((a, b) => a.localeCompare(b));

        // Cache check: if (sources, controlled) matches last turn, skip BFS.
        const cacheKey = factionCacheKey(sources, controlled, edgeTopology);
        const cached = perFactionCache.get(faction.id);
        if (cached && cached.key === cacheKey) {
            factionResults.push(cached.result);
            continue;
        }

        const controlledSet = new Set(controlled);
        const bfs = runSupplyBfs({
            controlled,
            sources,
            isTraversable: (node) => controlledSet.has(node),
            getNeighbors: (node) => adjacency.get(node) ?? [],
        });

        const result: FactionSupplyReachabilityOsid = {
            faction_id: faction.id,
            sources,
            controlled,
            reachable_osids: bfs.reachable,
            isolated_osids: bfs.isolated,
            edges_used: bfs.edgesUsed,
        };
        perFactionCache.set(faction.id, { key: cacheKey, result });
        factionResults.push(result);
    }

    return { schema: 1, turn, factions: factionResults };
}
