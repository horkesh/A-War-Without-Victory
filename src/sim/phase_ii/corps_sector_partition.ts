/**
 * Corps Sector Partitioning.
 *
 * Partitions a faction's territory and frontline into corps sectors.
 * Detects disconnected territories (enclaves).
 * Orders front municipalities within each corps sector for sequential brigade allocation.
 *
 * Deterministic: sorted iteration via strictCompare, no randomness.
 */

import type {
  GameState,
  FactionId,
  FormationId,
  SettlementId,
  MunicipalityId,
  FormationState,
} from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { strictCompare } from '../../state/validateGameState.js';

// --- Types ---

export interface CorpsSectorPartition {
  /** Per-corps set of settlements in that corps' sector (all faction-controlled, not just front). */
  sectorByCorps: Map<FormationId, Set<SettlementId>>;
  /** Reverse lookup: settlement → corps that owns it. */
  corpsBySettlement: Map<SettlementId, FormationId>;
}

export interface DisconnectedTerritories {
  /** The largest connected component of the faction's controlled territory. */
  mainTerritory: Set<SettlementId>;
  /** Each enclave is a smaller disconnected component. */
  enclaves: Set<SettlementId>[];
}

// --- Helpers ---

/**
 * Get a formation's corps ID from corps_id field or tags.
 * Exported so corps_directed_aor can use it.
 */
export function getFormationCorpsId(formation: FormationState): FormationId | null {
  if (formation.corps_id) return formation.corps_id;
  const tags = formation.tags ?? [];
  for (const tag of tags) {
    if (tag.startsWith('corps:')) {
      const id = tag.slice(6).trim();
      if (id) return id;
    }
  }
  return null;
}

/**
 * Build adjacency restricted to a single faction's controlled settlements.
 */
function buildFactionAdjacency(
  edges: EdgeRecord[],
  pc: Record<SettlementId, FactionId | null>,
  faction: FactionId
): Map<SettlementId, SettlementId[]> {
  const adj = new Map<SettlementId, SettlementId[]>();
  for (const edge of edges) {
    if (pc[edge.a] !== faction || pc[edge.b] !== faction) continue;
    let listA = adj.get(edge.a);
    if (!listA) { listA = []; adj.set(edge.a, listA); }
    listA.push(edge.b);
    let listB = adj.get(edge.b);
    if (!listB) { listB = []; adj.set(edge.b, listB); }
    listB.push(edge.a);
  }
  // Sort all neighbor lists for determinism
  for (const list of adj.values()) list.sort(strictCompare);
  return adj;
}

// --- Public functions ---

/**
 * Detect disconnected territories for a faction.
 *
 * Finds connected components of the faction's controlled settlements.
 * The largest component is the "main territory"; all others are enclaves.
 *
 * Uses BFS over faction-restricted adjacency. Deterministic.
 */
export function detectDisconnectedTerritories(
  faction: FactionId,
  pc: Record<SettlementId, FactionId | null>,
  edges: EdgeRecord[]
): DisconnectedTerritories {
  const adj = buildFactionAdjacency(edges, pc, faction);

  // Get all faction-controlled settlements
  const allSettlements = Object.keys(pc)
    .filter((sid) => pc[sid] === faction)
    .sort(strictCompare);

  const visited = new Set<SettlementId>();
  const components: Set<SettlementId>[] = [];

  for (const seed of allSettlements) {
    if (visited.has(seed)) continue;

    const component = new Set<SettlementId>();
    const queue: SettlementId[] = [seed];
    visited.add(seed);

    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      component.add(current);
      const neighbors = adj.get(current) ?? [];
      for (const n of neighbors) {
        if (visited.has(n)) continue;
        visited.add(n);
        queue.push(n);
      }
    }

    components.push(component);
  }

  // Sort: largest first, then by minimum SID for determinism
  components.sort((a, b) => {
    if (a.size !== b.size) return b.size - a.size;
    const minA = Array.from(a).sort(strictCompare)[0] ?? '';
    const minB = Array.from(b).sort(strictCompare)[0] ?? '';
    return strictCompare(minA, minB);
  });

  const mainTerritory = components[0] ?? new Set<SettlementId>();
  const enclaves = components.slice(1);

  return { mainTerritory, enclaves };
}

/**
 * Partition front-active settlements into corps sectors using multi-source BFS
 * from corps HQ locations.
 *
 * Each front-active settlement belongs to the corps whose BFS reached it first.
 * Only considers settlements within the provided territory set (for enclave isolation).
 *
 * Extracted and extended from the private buildCorpsLookup() in brigade_aor.ts.
 */
export function partitionFrontIntoCorpsSectors(
  state: GameState,
  faction: FactionId,
  territory: Set<SettlementId>,
  edges: EdgeRecord[]
): CorpsSectorPartition {
  const pc = state.political_controllers ?? {};
  const formations = state.formations ?? {};

  // Build adjacency restricted to faction AND territory
  const adj = new Map<SettlementId, SettlementId[]>();
  for (const edge of edges) {
    if (!territory.has(edge.a) || !territory.has(edge.b)) continue;
    if (pc[edge.a] !== faction || pc[edge.b] !== faction) continue;
    let listA = adj.get(edge.a);
    if (!listA) { listA = []; adj.set(edge.a, listA); }
    listA.push(edge.b);
    let listB = adj.get(edge.b);
    if (!listB) { listB = []; adj.set(edge.b, listB); }
    listB.push(edge.a);
  }
  for (const list of adj.values()) list.sort(strictCompare);

  // Find corps and their seeds (HQ settlements)
  const corpsToSeed = new Map<FormationId, SettlementId>();
  const corpsFormations = Object.keys(formations).sort(strictCompare);

  for (const fid of corpsFormations) {
    const f = formations[fid];
    if (!f || f.faction !== faction) continue;
    if ((f.kind ?? 'brigade') !== 'corps_asset') continue;
    if (f.status !== 'active') continue;
    const hq = f.hq_sid;
    if (hq && territory.has(hq) && pc[hq] === faction) {
      corpsToSeed.set(fid, hq);
    }
  }

  // Also collect corps seeds from brigade corps_id when corps itself has no valid HQ
  for (const fid of corpsFormations) {
    const f = formations[fid];
    if (!f || f.faction !== faction || f.status !== 'active') continue;
    if ((f.kind ?? 'brigade') !== 'brigade') continue;
    const corpsId = getFormationCorpsId(f);
    if (!corpsId || corpsToSeed.has(corpsId)) continue;
    const hq = f.hq_sid;
    if (hq && territory.has(hq) && pc[hq] === faction) {
      corpsToSeed.set(corpsId, hq);
    }
  }

  const sectorByCorps = new Map<FormationId, Set<SettlementId>>();
  const corpsBySettlement = new Map<SettlementId, FormationId>();

  if (corpsToSeed.size === 0) {
    return { sectorByCorps, corpsBySettlement };
  }

  // Multi-source BFS from all corps seeds
  const queue: [SettlementId, FormationId][] = [];
  const visited = new Map<SettlementId, FormationId>();

  // Initialize seeds in deterministic order
  const corpsIds = Array.from(corpsToSeed.keys()).sort(strictCompare);
  for (const corpsId of corpsIds) {
    const seed = corpsToSeed.get(corpsId)!;
    if (visited.has(seed)) continue;
    visited.set(seed, corpsId);
    queue.push([seed, corpsId]);
    const set = sectorByCorps.get(corpsId) ?? new Set<SettlementId>();
    set.add(seed);
    sectorByCorps.set(corpsId, set);
  }

  let head = 0;
  while (head < queue.length) {
    const [current, corpsId] = queue[head++];
    corpsBySettlement.set(current, corpsId);
    const neighbors = adj.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.set(neighbor, corpsId);
      queue.push([neighbor, corpsId]);
      const set = sectorByCorps.get(corpsId) ?? new Set<SettlementId>();
      set.add(neighbor);
      sectorByCorps.set(corpsId, set);
    }
  }

  return { sectorByCorps, corpsBySettlement };
}

/**
 * Within a corps sector, produce an ordered sequence of front-active municipalities
 * by walking the frontline via BFS along front-active settlements.
 *
 * Handles multiple disjoint front segments within the sector by processing
 * each connected component separately and concatenating in sorted order.
 *
 * Returns municipalities in frontline-walk order (deduplicated, deterministic).
 */
export function orderFrontMunicipalitiesForCorps(
  sectorSettlements: Set<SettlementId>,
  frontActive: Set<SettlementId>,
  adj: Map<SettlementId, Set<SettlementId>>,
  sidToMun: Record<SettlementId, MunicipalityId>
): MunicipalityId[] {
  // Restrict to front-active settlements within this sector
  const sectorFront = Array.from(sectorSettlements)
    .filter((sid) => frontActive.has(sid))
    .sort(strictCompare);

  if (sectorFront.length === 0) return [];

  const sectorFrontSet = new Set(sectorFront);
  const visited = new Set<SettlementId>();
  const allMunOrders: MunicipalityId[][] = [];

  // Find connected components of the sector's front-active settlements
  for (const seed of sectorFront) {
    if (visited.has(seed)) continue;

    // BFS within sector front-active settlements
    const order: MunicipalityId[] = [];
    const seenMuns = new Set<MunicipalityId>();
    const queue: SettlementId[] = [seed];
    visited.add(seed);

    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      const mun = sidToMun[current];
      if (mun && !seenMuns.has(mun)) {
        seenMuns.add(mun);
        order.push(mun);
      }
      const neighbors = adj.get(current);
      if (!neighbors) continue;
      const sortedNeighbors = Array.from(neighbors).sort(strictCompare);
      for (const n of sortedNeighbors) {
        if (!sectorFrontSet.has(n) || visited.has(n)) continue;
        visited.add(n);
        queue.push(n);
      }
    }

    if (order.length > 0) {
      allMunOrders.push(order);
    }
  }

  // Sort connected-component orders by first SID for determinism
  allMunOrders.sort((a, b) => strictCompare(a[0], b[0]));

  // Concatenate and deduplicate while preserving walk order
  const result: MunicipalityId[] = [];
  const seen = new Set<MunicipalityId>();
  for (const order of allMunOrders) {
    for (const mun of order) {
      if (!seen.has(mun)) {
        seen.add(mun);
        result.push(mun);
      }
    }
  }

  return result;
}
