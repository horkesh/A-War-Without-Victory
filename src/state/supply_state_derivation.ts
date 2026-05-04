/**
 * H7.x — Supply state derivation, corridor objects (Open/Brittle/Cut), and local production capacity.
 * Systems Manual §14 (Supply and corridors), §15 (Local production); Engine Invariants §4.
 * No new mechanics: derives from existing graph, control, and reachability only.
 */

import type { GameState, MunicipalityId } from './game_state.js';

import type { AdjacencyMap } from '../map/adjacency_map.js';
import type { EdgeRecord, SettlementRecord } from '../map/settlements.js';
import { getSettlementControlStatus } from './settlement_control.js';
import type { SupplyReachabilityReport } from './supply_reachability.js';
import type { SupplyReachabilityOsidReport, FactionSupplyReachabilityOsid } from './supply_reachability_osid.js';
import { buildOsidAdjacency } from '../sim/combat/osid_adjacency.js';
import { strictCompare } from './validateGameState.js';

// ═══════════════════════════════════════════════════════════════════════════
// v0.9.3 C2a — per-faction OSID-supply derivation caches.
//
// `deriveCorridorsOsid` and `deriveSupplyStateByOsid` are pure over the
// per-faction `FactionSupplyReachabilityOsid` entry plus the (stable) edge
// adjacency. The C2 supply-reachability cache returns the same per-faction
// reference on cache hit, so we can use that reference as a WeakMap key for
// both downstream derivations.
//
// Bridge detection in `deriveCorridorsOsid` is the dominant cost (O(E²) in
// the worst case for the per-faction subgraph). Heartland-component + adequate
// BFS in `deriveSupplyStateByOsid` are the second cost. Both skipped on cache
// hit.
//
// Production caller (war_phases.ts supply-osid step) always sequences
// deriveCorridorsOsid → deriveSupplyStateByOsid with the SAME supplyReport,
// so the two caches stay coherent.
// ═══════════════════════════════════════════════════════════════════════════
const corridorCacheByFaction: WeakMap<FactionSupplyReachabilityOsid, DerivedCorridor[]> = new WeakMap();
const supplyStateCacheByFaction: WeakMap<FactionSupplyReachabilityOsid, FactionSupplyStateByOsidEntry> = new WeakMap();

/** Supply state levels per canon (Systems Manual §14). */
export type SupplyStateLevel = 'adequate' | 'strained' | 'critical';

/** Corridor state levels per canon (Engine Invariants §4). */
export type CorridorStateLevel = 'open' | 'brittle' | 'cut';

/** Single derived corridor: one edge for one faction with state. */
export interface DerivedCorridor {
    edge_id: string;
    faction_id: string;
    state: CorridorStateLevel;
}

/** Report of derived corridor states per faction. */
export interface CorridorDerivationReport {
    schema: 1;
    turn: number;
    corridors: DerivedCorridor[]; // sorted by faction_id then edge_id
}

/** Per-settlement supply state for one faction. */
export interface SettlementSupplyState {
    sid: string;
    state: SupplyStateLevel;
}

/** Per-faction supply state derivation. */
export interface FactionSupplyStateEntry {
    faction_id: string;
    by_settlement: SettlementSupplyState[]; // sorted by sid
    adequate_count: number;
    strained_count: number;
    critical_count: number;
}

/** Report of derived supply states. */
export interface SupplyStateDerivationReport {
    schema: 1;
    turn: number;
    factions: FactionSupplyStateEntry[]; // sorted by faction_id
}

/** Local production capacity per municipality (0..1, derived from existing state). */
export interface LocalProductionCapacityEntry {
    mun_id: MunicipalityId;
    capacity: number; // [0, 1]
    controlling_faction_id: string | null;
}

/** Report of local production capacity per municipality. */
export interface LocalProductionCapacityReport {
    schema: 1;
    turn: number;
    by_municipality: LocalProductionCapacityEntry[]; // sorted by mun_id
}

/** Per-OSID supply state for one faction (War phase). */
export interface OsidSupplyStateEntry {
    osid: string;
    state: SupplyStateLevel;
}

/** Per-faction supply state by OSID. */
export interface FactionSupplyStateByOsidEntry {
    faction_id: string;
    by_osid: OsidSupplyStateEntry[]; // sorted by osid
}

/** Report of supply state by OSID per faction. Used for supply_mult in combat when operational layer is authoritative. */
export interface SupplyStateByOsidReport {
    schema: 1;
    turn: number;
    factions: FactionSupplyStateByOsidEntry[]; // sorted by faction_id
}

/**
 * Returns true if edgeId is a bridge in the subgraph (reachable nodes, edges_used).
 * Removing the edge disconnects the graph.
 */
function isBridgeInSubgraph(
    edgeId: string,
    edgesUsed: Set<string>,
    reachableNodes: Set<string>,
    adjacencyMap: AdjacencyMap
): boolean {
    const parts = edgeId.split('__');
    if (parts.length !== 2) return false;
    const [a, b] = parts;
    if (!reachableNodes.has(a) || !reachableNodes.has(b)) return false;
    const without = new Set(edgesUsed);
    without.delete(edgeId);
    // BFS from a without using edgeId; if b not visited, bridge
    const visited = new Set<string>();
    const queue: string[] = [a];
    visited.add(a);
    while (queue.length > 0) {
        const cur = queue.shift()!;
        const neighbors = adjacencyMap[cur] ?? [];
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            const eid = cur < n ? `${cur}__${n}` : `${n}__${cur}`;
            if (!without.has(eid)) continue;
            visited.add(n);
            queue.push(n);
        }
    }
    return !visited.has(b);
}

/**
 * Derives corridor objects and state (Open/Brittle/Cut) per faction from supply reachability.
 * Canon: Corridors are derived per faction; state is exactly one of Open, Brittle, Cut (Engine §4).
 * - Traversed edges: Open if redundant (not a bridge), Brittle if bridge.
 * - Potential but not traversed (both endpoints controlled): Cut.
 */
export function deriveCorridors(
    state: GameState,
    adjacencyMap: AdjacencyMap,
    supplyReport: SupplyReachabilityReport
): CorridorDerivationReport {
    const turn = state.meta.turn;
    const corridors: DerivedCorridor[] = [];

    for (const fac of supplyReport.factions) {
        const controlledSet = new Set(fac.controlled);
        const edgesUsed = new Set(fac.edges_used ?? []);
        const reachableSet = new Set(fac.reachable_controlled);

        // Potential corridor edges: edges (a,b) with both a,b in controlled
        const potentialEdges = new Set<string>();
        for (const sid of fac.controlled) {
            const neighbors = adjacencyMap[sid] ?? [];
            for (const n of neighbors) {
                if (!controlledSet.has(n)) continue;
                const eid = sid < n ? `${sid}__${n}` : `${n}__${sid}`;
                potentialEdges.add(eid);
            }
        }

        // Traversed edges: Open or Brittle (bridge => brittle)
        for (const edgeId of edgesUsed) {
            const isBridge = isBridgeInSubgraph(edgeId, edgesUsed, reachableSet, adjacencyMap);
            corridors.push({
                edge_id: edgeId,
                faction_id: fac.faction_id,
                state: isBridge ? 'brittle' : 'open'
            });
        }

        // Potential but not traversed: Cut
        for (const edgeId of potentialEdges) {
            if (edgesUsed.has(edgeId)) continue;
            corridors.push({
                edge_id: edgeId,
                faction_id: fac.faction_id,
                state: 'cut'
            });
        }
    }

    corridors.sort((a, b) => {
        const fc = a.faction_id.localeCompare(b.faction_id);
        if (fc !== 0) return fc;
        return a.edge_id.localeCompare(b.edge_id);
    });

    return { schema: 1, turn, corridors };
}

/**
 * Derives supply state (Adequate/Strained/Critical) per settlement per faction.
 * Canon: Supply states are Adequate, Strained, Critical (Systems §14).
 * - Critical: isolated (not reachable from sources).
 * - Strained: reachable but at least one corridor on path is Brittle.
 * - Adequate: reachable and all corridors on path Open.
 */
export function deriveSupplyState(
    state: GameState,
    adjacencyMap: AdjacencyMap,
    supplyReport: SupplyReachabilityReport,
    corridorReport: CorridorDerivationReport
): SupplyStateDerivationReport {
    const turn = state.meta.turn;
    const factionEntries: FactionSupplyStateEntry[] = [];

    const corridorByFactionEdge = new Map<string, CorridorStateLevel>();
    for (const c of corridorReport.corridors) {
        corridorByFactionEdge.set(`${c.faction_id}:${c.edge_id}`, c.state);
    }

    for (const fac of supplyReport.factions) {
        const reachableSet = new Set(fac.reachable_controlled);
        const isolatedSet = new Set(fac.isolated_controlled);
        const edgesUsed = new Set(fac.edges_used ?? []);
        const openEdges = new Set<string>();
        for (const edgeId of edgesUsed) {
            const st = corridorByFactionEdge.get(`${fac.faction_id}:${edgeId}`);
            if (st === 'open') openEdges.add(edgeId);
        }

        // BFS from sources using only open edges -> adequate set
        const sources = new Set(
            fac.sources.filter((sid) => reachableSet.has(sid))
        );
        const adequateVisited = new Set<string>();
        const queue: string[] = [...sources];
        for (const s of sources) adequateVisited.add(s);
        while (queue.length > 0) {
            const cur = queue.shift()!;
            const neighbors = adjacencyMap[cur] ?? [];
            for (const n of neighbors) {
                if (adequateVisited.has(n)) continue;
                const eid = cur < n ? `${cur}__${n}` : `${n}__${cur}`;
                if (!openEdges.has(eid)) continue;
                adequateVisited.add(n);
                queue.push(n);
            }
        }

        const by_settlement: SettlementSupplyState[] = [];
        let adequate_count = 0;
        let strained_count = 0;
        let critical_count = 0;

        for (const sid of fac.controlled) {
            let level: SupplyStateLevel;
            if (isolatedSet.has(sid)) {
                level = 'critical';
                critical_count += 1;
            } else if (adequateVisited.has(sid)) {
                level = 'adequate';
                adequate_count += 1;
            } else {
                level = 'strained';
                strained_count += 1;
            }
            by_settlement.push({ sid, state: level });
        }
        by_settlement.sort((a, b) => a.sid.localeCompare(b.sid));

        factionEntries.push({
            faction_id: fac.faction_id,
            by_settlement,
            adequate_count,
            strained_count,
            critical_count
        });
    }

    factionEntries.sort((a, b) => a.faction_id.localeCompare(b.faction_id));

    return { schema: 1, turn, factions: factionEntries };
}

/**
 * Derives local production capacity per municipality from existing state.
 * Canon: Production constrained by authority, population, exhaustion, connectivity (Systems §15).
 * No new mechanics: uses faction profile (authority, exhaustion), displacement, supply reachability.
 */
export function deriveLocalProductionCapacity(
    state: GameState,
    supplyReport: SupplyReachabilityReport,
    settlements: Map<string, SettlementRecord>
): LocalProductionCapacityReport {
    const turn = state.meta.turn;
    const munIds = new Set<MunicipalityId>();

    for (const [, rec] of settlements) {
        const munId = (rec.mun1990_id ?? rec.mun_code) as MunicipalityId;
        munIds.add(munId);
    }

    const by_municipality: LocalProductionCapacityEntry[] = [];
    const reachableByFaction = new Map<string, Set<string>>();
    for (const fac of supplyReport.factions) {
        reachableByFaction.set(fac.faction_id, new Set(fac.reachable_controlled));
    }

    for (const munId of [...munIds].sort()) {
        const sidsInMun: string[] = [];
        for (const [sid, rec] of settlements) {
            const m = (rec.mun1990_id ?? rec.mun_code) as MunicipalityId;
            if (m === munId) sidsInMun.push(sid);
        }
        if (sidsInMun.length === 0) {
            by_municipality.push({ mun_id: munId, capacity: 0, controlling_faction_id: null });
            continue;
        }

        let controlling_faction_id: string | null = null;
        let authorityMult = 1;
        let exhaustionMult = 1;
        let connectivity = 0;

        for (const sid of sidsInMun) {
            const status = getSettlementControlStatus(state, sid);
            if (status.kind === 'known' && status.side) {
                controlling_faction_id = status.side;
                const faction = state.factions?.find((f) => f.id === status.side);
                if (faction?.profile) {
                    authorityMult = Math.max(0, Math.min(1, (faction.profile.authority ?? 0) / 100));
                    exhaustionMult = Math.max(0, 1 - (faction.profile.exhaustion ?? 0) / 200);
                }
                const reachable = reachableByFaction.get(status.side);
                if (reachable?.has(sid)) connectivity = 1;
                break;
            }
        }

        const displacement = state.displacement.displacement_state?.[munId];
        let populationMult = 1;
        if (displacement && displacement.original_population > 0) {
            const effective = Math.max(0, displacement.original_population - displacement.displaced_out - displacement.lost_population + displacement.displaced_in);
            populationMult = Math.min(1, effective / displacement.original_population);
        }

        const capacity = Math.max(0, Math.min(1, authorityMult * exhaustionMult * populationMult * (connectivity || 0.5)));
        by_municipality.push({ mun_id: munId, capacity, controlling_faction_id });
    }

    return { schema: 1, turn, by_municipality };
}

// ═══════════════════════════════════════════════════════════════════════════
// OSID-level supply state (War phase)
// ═══════════════════════════════════════════════════════════════════════════


/**
 * LEGACY per-edge BFS-removal bridge predicate.
 *
 * Retained for the G2 parity wrapper (`SUPPLY_BRIDGE_PARITY_CHECK=true`)
 * and exported under `__test_*` names for the G1 property test.
 *
 * Production callsite (`computeFactionCorridors`) uses Tarjan
 * (`findBridgesInSubgraphOsid`) below. Do NOT call this function in any
 * non-test, non-parity-check path — it is O(E²) on the subgraph.
 */
function isBridgeInSubgraphOsidLegacy(
    edgeId: string,
    edgesUsed: Set<string>,
    reachableNodes: Set<string>,
    adjacency: Map<string, string[]>
): boolean {
    const parts = edgeId.split('__');
    if (parts.length !== 2) return false;
    const [a, b] = parts;
    if (!reachableNodes.has(a) || !reachableNodes.has(b)) return false;
    const without = new Set(edgesUsed);
    without.delete(edgeId);
    const visited = new Set<string>();
    const queue: string[] = [a];
    visited.add(a);
    while (queue.length > 0) {
        const cur = queue.shift()!;
        const neighbors = adjacency.get(cur) ?? [];
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            const eid = cur < n ? `${cur}__${n}` : `${n}__${cur}`;
            if (!without.has(eid)) continue;
            visited.add(n);
            queue.push(n);
        }
    }
    return !visited.has(b);
}

/**
 * LANE-NIGHTSHIFT-SUPPLY-OSID-A0-TARJAN: single-pass O(V+E) bridge-finding.
 *
 * Tarjan's bridge algorithm (1974). Iterative DFS to avoid recursion stack
 * overflow on BiH-scale graphs. Multi-component-safe: outer loop restarts
 * DFS at every unvisited reachable node, so subgraphs split into enclaves
 * (Goražde / Žepa / Sarajevo / Bihać per spec §5) are handled correctly.
 *
 * Determinism plumbing (binding):
 *   - Root vertex iteration via `[...reachableNodes].sort(strictCompare)`.
 *   - Neighbor iteration via the C1-memoized adjacency lists, which
 *     `buildOsidAdjacency` already sorts via strictCompare.
 *   - Output is a Set<string>; downstream `computeFactionCorridors` only
 *     calls `.has()` on it (set is order-insensitive at consumer side),
 *     and emits sorted DerivedCorridor[] downstream.
 *
 * The `reachableNodes` filter mirrors the legacy predicate's early-exit:
 * an edge whose endpoint is not in `reachableNodes` is never a bridge in
 * the reachable subgraph (it isn't even part of it). The `edges` filter
 * mirrors the legacy's `edgesUsed.has(eid)` neighbor-edge gate.
 *
 * Returns the SET of bridge edge IDs (canonical-orientation: a__b with a<b).
 */
function findBridgesInSubgraphOsid(
    edges: Set<string>,
    reachableNodes: Set<string>,
    adjacency: Map<string, string[]>
): Set<string> {
    const bridges = new Set<string>();
    if (reachableNodes.size === 0 || edges.size === 0) return bridges;

    // Index reachable nodes deterministically (root iteration must be
    // strictCompare-sorted to avoid Map-iteration-order divergence).
    const reachableSorted: string[] = [...reachableNodes].sort(strictCompare);
    const indexOf = new Map<string, number>();
    for (let i = 0; i < reachableSorted.length; i++) indexOf.set(reachableSorted[i], i);

    const N = reachableSorted.length;
    const disc: number[] = new Array(N).fill(-1);
    const low: number[] = new Array(N).fill(-1);
    let timer = 0;

    /**
     * Iterative DFS with explicit stack of (nodeIdx, parentIdx, neighborCursor).
     * Each frame remembers which neighbor index it last advanced to.
     */
    type Frame = { v: number; parent: number; cursor: number; neighbors: string[] };
    const stack: Frame[] = [];

    const buildNeighbors = (v: number): string[] => {
        const node = reachableSorted[v];
        const raw = adjacency.get(node) ?? [];
        // Filter to neighbors that are (a) reachable and (b) connected by an
        // edge in the subgraph `edges` set. Adjacency is already strictCompare-
        // sorted by buildOsidAdjacency, so the filtered list inherits that order.
        const out: string[] = [];
        for (const n of raw) {
            if (!reachableNodes.has(n)) continue;
            const eid = node < n ? `${node}__${n}` : `${n}__${node}`;
            if (!edges.has(eid)) continue;
            out.push(n);
        }
        return out;
    };

    for (let r = 0; r < N; r++) {
        if (disc[r] !== -1) continue; // already visited (other component)
        // Start DFS at r
        const rootNeighbors = buildNeighbors(r);
        disc[r] = timer;
        low[r] = timer;
        timer++;
        stack.push({ v: r, parent: -1, cursor: 0, neighbors: rootNeighbors });

        while (stack.length > 0) {
            const top = stack[stack.length - 1];
            if (top.cursor < top.neighbors.length) {
                const nName = top.neighbors[top.cursor];
                top.cursor++;
                const nIdx = indexOf.get(nName);
                if (nIdx === undefined) continue; // not in reachable set (defensive)
                if (nIdx === top.parent) continue; // skip immediate parent
                if (disc[nIdx] !== -1) {
                    // Back-edge: update low[top.v] with disc[nIdx]
                    if (disc[nIdx] < low[top.v]) low[top.v] = disc[nIdx];
                } else {
                    // Tree-edge: descend
                    disc[nIdx] = timer;
                    low[nIdx] = timer;
                    timer++;
                    const nNeighbors = buildNeighbors(nIdx);
                    stack.push({ v: nIdx, parent: top.v, cursor: 0, neighbors: nNeighbors });
                }
            } else {
                // Pop: propagate low[top.v] to parent
                const popped = stack.pop()!;
                if (popped.parent !== -1) {
                    const p = popped.parent;
                    if (low[popped.v] < low[p]) low[p] = low[popped.v];
                    // Bridge condition: low[child] > disc[parent]
                    if (low[popped.v] > disc[p]) {
                        const childName = reachableSorted[popped.v];
                        const parentName = reachableSorted[p];
                        const eid = parentName < childName
                            ? `${parentName}__${childName}`
                            : `${childName}__${parentName}`;
                        bridges.add(eid);
                    }
                }
            }
        }
    }

    return bridges;
}

/**
 * G2 parity wrapper. Default: returns Tarjan output unchanged.
 * Opt-in via `SUPPLY_BRIDGE_PARITY_CHECK=true`: also runs the legacy per-edge
 * predicate over every edge in `edges` and asserts identical bridge classification.
 * On mismatch, throws with a graph dump containing the first divergent edge.
 *
 * The parity wrapper is the production-path safety net for cases the G1 property
 * test cannot catch (real BiH topology with caches, faction interactions, multi-turn
 * state). Default OFF — zero production cost. Run 40w with the env flag set to
 * catch drift in real scenarios before merge.
 */
function findBridgesInSubgraphOsidWithParity(
    edges: Set<string>,
    reachableNodes: Set<string>,
    adjacency: Map<string, string[]>
): Set<string> {
    const tarjan = findBridgesInSubgraphOsid(edges, reachableNodes, adjacency);
    if (process.env.SUPPLY_BRIDGE_PARITY_CHECK !== 'true') return tarjan;

    // Parity check: re-classify every edge with the legacy predicate.
    for (const e of edges) {
        const legacyIsBridge = isBridgeInSubgraphOsidLegacy(e, edges, reachableNodes, adjacency);
        const tarjanIsBridge = tarjan.has(e);
        if (legacyIsBridge !== tarjanIsBridge) {
            const dumpNodes: string[] = [...reachableNodes].sort(strictCompare).slice(0, 50);
            const dumpEdges: string[] = [...edges].sort(strictCompare).slice(0, 50);
            const detail = JSON.stringify({
                first_divergent_edge: e,
                legacy_is_bridge: legacyIsBridge,
                tarjan_is_bridge: tarjanIsBridge,
                reachable_node_count: reachableNodes.size,
                edge_count: edges.size,
                node_sample: dumpNodes,
                edge_sample: dumpEdges,
            });
            throw new Error(`SUPPLY_BRIDGE_PARITY_CHECK mismatch: ${detail}`);
        }
    }
    return tarjan;
}

// Test-only re-exports for G1 property test + small-graph correctness test.
// Names prefixed `__test_` to discourage non-test consumers.
export { findBridgesInSubgraphOsid as __test_findBridgesInSubgraphOsid };
export { isBridgeInSubgraphOsidLegacy as __test_isBridgeInSubgraphOsidLegacy };

/**
 * Compute the corridor list for a single faction over the OSID graph.
 * Pure over (fac, adjacency); cache key is fac reference identity.
 */
function computeFactionCorridors(
    fac: FactionSupplyReachabilityOsid,
    adjacency: Map<string, string[]>
): DerivedCorridor[] {
    const controlledSet = new Set(fac.controlled);
    const reachableSet = new Set(fac.reachable_osids);

    // Build full set of edges between reachable controlled OSIDs.
    // Bridge detection must operate on the actual subgraph topology, not the
    // BFS spanning tree (edges_used). The BFS tree has zero cycles, so every
    // edge is trivially a bridge — producing 100% brittle, 0% open.
    const reachableEdges = new Set<string>();
    const potentialEdges = new Set<string>();
    for (const osid of fac.controlled) {
        const neighbors = adjacency.get(osid) ?? [];
        for (const n of neighbors) {
            if (!controlledSet.has(n)) continue;
            const eid = osid < n ? `${osid}__${n}` : `${n}__${osid}`;
            potentialEdges.add(eid);
            if (reachableSet.has(osid) && reachableSet.has(n)) {
                reachableEdges.add(eid);
            }
        }
    }

    // LANE-NIGHTSHIFT-SUPPLY-OSID-A0-TARJAN: single Tarjan pass replaces the
    // legacy O(E²) per-edge BFS-removal call (was: ~360k ops/faction at BiH
    // scale; now: O(V+E) ≈ ~3k ops/faction). G1 property test (10k trials)
    // proves set-equality with legacy. G2 parity wrapper guards production.
    const bridgeSet = findBridgesInSubgraphOsidWithParity(reachableEdges, reachableSet, adjacency);

    const out: DerivedCorridor[] = [];
    for (const edgeId of reachableEdges) {
        const isBridge = bridgeSet.has(edgeId);
        out.push({ edge_id: edgeId, faction_id: fac.faction_id, state: isBridge ? 'brittle' : 'open' });
    }
    for (const edgeId of potentialEdges) {
        if (reachableEdges.has(edgeId)) continue;
        out.push({ edge_id: edgeId, faction_id: fac.faction_id, state: 'cut' });
    }
    return out;
}

/**
 * Derives corridor states (Open/Brittle/Cut) per faction for the OSID graph.
 *
 * v0.9.3 C2a: per-faction corridor list memoized on FactionSupplyReachabilityOsid
 * reference identity. Cache hits skip bridge detection (the dominant cost).
 */
export function deriveCorridorsOsid(
    state: GameState,
    edges: EdgeRecord[],
    supplyReport: SupplyReachabilityOsidReport
): CorridorDerivationReport {
    const turn = state.meta.turn;
    const adjacency = buildOsidAdjacency(edges);
    const corridors: DerivedCorridor[] = [];

    for (const fac of supplyReport.factions) {
        let perFaction = corridorCacheByFaction.get(fac);
        if (!perFaction) {
            perFaction = computeFactionCorridors(fac, adjacency);
            corridorCacheByFaction.set(fac, perFaction);
        }
        for (const c of perFaction) corridors.push(c);
    }

    corridors.sort((a, b) => {
        const fc = a.faction_id.localeCompare(b.faction_id);
        if (fc !== 0) return fc;
        return a.edge_id.localeCompare(b.edge_id);
    });

    return { schema: 1, turn, corridors };
}

/**
 * Find the heartland (largest connected component) of a reachable set.
 * Sources in disconnected pockets (enclaves like Sarajevo, Bihać) are
 * excluded from adequate-BFS seeding → their OSIDs classify as "strained".
 * Deterministic: sorted iteration over OSIDs and neighbors.
 */
function findHeartlandComponent(
    reachableSet: Set<string>,
    adjacency: Map<string, string[]>
): Set<string> {
    const visited = new Set<string>();
    let largest = new Set<string>();

    const reachableSorted = [...reachableSet].sort((a, b) => a.localeCompare(b));
    for (const start of reachableSorted) {
        if (visited.has(start)) continue;
        const component = new Set<string>();
        const queue = [start];
        visited.add(start);
        while (queue.length > 0) {
            const node = queue.shift()!;
            component.add(node);
            const neighbors = adjacency.get(node) ?? [];
            for (const n of neighbors) {
                if (reachableSet.has(n) && !visited.has(n)) {
                    visited.add(n);
                    queue.push(n);
                }
            }
        }
        if (component.size > largest.size) largest = component;
    }

    return largest;
}

/**
 * Derives supply state (Adequate/Strained/Critical) per OSID per faction.
 * Isolated → critical; reachable with brittle path → strained; else adequate.
 *
 * Isolated source detection: supply sources in pockets disconnected from the
 * heartland (largest reachable component) produce "strained", not "adequate".
 * Models besieged cities with limited supply (Sarajevo UN airlift, Bihać
 * Croatian corridor) — reachable from a local source but cut off from the
 * main supply network.
 */
/**
 * Compute the per-OSID supply state entry for a single faction.
 * Pure over (fac, adjacency, perFactionOpenEdges); cache key is fac reference.
 *
 * `perFactionOpenEdges` is derived from corridorReport entries for this faction
 * — but those are themselves derivable from `fac` (via deriveCorridorsOsid),
 * so the per-faction cache key is the supplyReport entry alone.
 */
function computeFactionSupplyState(
    fac: FactionSupplyReachabilityOsid,
    adjacency: Map<string, string[]>,
    perFactionOpenEdges: Set<string>
): FactionSupplyStateByOsidEntry {
    const reachableSet = new Set(fac.reachable_osids);
    const isolatedSet = new Set(fac.isolated_osids);

    // Isolated source detection: only seed adequate BFS from sources in
    // the heartland (largest connected component of reachable set).
    // Sources in disconnected pockets → their OSIDs are strained, not adequate.
    const heartland = findHeartlandComponent(reachableSet, adjacency);
    const sources = new Set(
        fac.sources.filter((osid) => reachableSet.has(osid) && heartland.has(osid))
    );
    const adequateVisited = new Set<string>();
    const queue: string[] = [...sources];
    for (const s of sources) adequateVisited.add(s);
    while (queue.length > 0) {
        const cur = queue.shift()!;
        const neighbors = adjacency.get(cur) ?? [];
        for (const n of neighbors) {
            if (adequateVisited.has(n)) continue;
            const eid = cur < n ? `${cur}__${n}` : `${n}__${cur}`;
            if (!perFactionOpenEdges.has(eid)) continue;
            adequateVisited.add(n);
            queue.push(n);
        }
    }

    const by_osid: OsidSupplyStateEntry[] = [];
    for (const osid of fac.controlled) {
        let level: SupplyStateLevel;
        if (isolatedSet.has(osid)) {
            level = 'critical';
        } else if (adequateVisited.has(osid)) {
            level = 'adequate';
        } else {
            level = 'strained';
        }
        by_osid.push({ osid, state: level });
    }
    by_osid.sort((a, b) => a.osid.localeCompare(b.osid));

    return { faction_id: fac.faction_id, by_osid };
}

export function deriveSupplyStateByOsid(
    state: GameState,
    edges: EdgeRecord[],
    supplyReport: SupplyReachabilityOsidReport,
    corridorReport: CorridorDerivationReport
): SupplyStateByOsidReport {
    const turn = state.meta.turn;
    const adjacency = buildOsidAdjacency(edges);
    // Group corridor states by faction so the per-faction cache key (the fac
    // reference) is the only deciding input alongside the stable adjacency.
    const openEdgesByFaction = new Map<string, Set<string>>();
    for (const c of corridorReport.corridors) {
        if (c.state !== 'open') continue;
        let set = openEdgesByFaction.get(c.faction_id);
        if (!set) { set = new Set(); openEdgesByFaction.set(c.faction_id, set); }
        set.add(c.edge_id);
    }

    const factionEntries: FactionSupplyStateByOsidEntry[] = [];

    for (const fac of supplyReport.factions) {
        let perFaction = supplyStateCacheByFaction.get(fac);
        if (!perFaction) {
            const openEdges = openEdgesByFaction.get(fac.faction_id) ?? new Set<string>();
            perFaction = computeFactionSupplyState(fac, adjacency, openEdges);
            supplyStateCacheByFaction.set(fac, perFaction);
        }
        factionEntries.push(perFaction);
    }

    factionEntries.sort((a, b) => a.faction_id.localeCompare(b.faction_id));
    return { schema: 1, turn, factions: factionEntries };
}

// ═══════════════════════════════════════════════════════════════════════════
// Enclave resilience (Phase 4 — formula TBD by Game Designer)
// ═══════════════════════════════════════════════════════════════════════════

/** Per-enclave resilience value (0..1). Formula and caps TBD by Game Designer. */
export interface EnclaveResilienceEntry {
    enclave_id: string;
    faction_id: string;
    resilience: number; // 0..1, bounded
    hardening_active: boolean; // true after N turns strained/critical in enclave
}

/** Report of enclave resilience and hardening. Currently stub (no formula). */
export interface EnclaveResilienceReport {
    schema: 1;
    turn: number;
    enclaves: EnclaveResilienceEntry[]; // sorted by faction_id then enclave_id
}
