/**
 * H7.x — Supply state derivation, corridor objects (Open/Brittle/Cut), and local production capacity.
 * Systems Manual §14 (Supply and corridors), §15 (Local production); Engine Invariants §4.
 * No new mechanics: derives from existing graph, control, and reachability only.
 */

import type { GameState, MunicipalityId } from './game_state.js';

import type { AdjacencyMap } from '../map/adjacency_map.js';
import type { SupplyReachabilityReport } from './supply_reachability.js';
import { getSettlementControlStatus } from './settlement_control.js';
import type { SettlementRecord } from '../map/settlements.js';

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

    const displacement = state.displacement_state?.[munId];
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
