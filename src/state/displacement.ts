/**
 * Phase 21: Population displacement and recruitment integration
 *
 * Deterministic displacement system that tracks population movement
 * and permanently reduces local recruitment capacity.
 */

import type { GameState, MunicipalityId, FactionId, DisplacementState, MilitiaPoolState } from './game_state.js';
import type { SettlementRecord } from '../map/settlements.js';

import { computeSupplyReachability } from './supply_reachability.js';
import { buildAdjacencyMap, type AdjacencyMap } from '../map/adjacency_map.js';
import type { EdgeRecord } from '../map/settlements.js';
import { computeFrontBreaches, type FrontBreach } from './front_breaches.js';
import { computeFrontEdges } from '../map/front_edges.js';
import { getEffectiveSettlementSide } from './control_effective.js';

// Displacement trigger constants
const UNSUPPLIED_PRESSURE_TURNS = 3; // N consecutive turns without supply
const UNSUPPLIED_DISPLACEMENT_FRACTION = 0.05; // 5% per turn after N turns
const ENCIRCLEMENT_DISPLACEMENT_FRACTION = 0.10; // 10% per turn when encircled
const BREACH_PERSISTENCE_TURNS = 2; // M turns of breaches
const BREACH_DISPLACEMENT_FRACTION = 0.03; // 3% per turn when breaches persist

// Displacement routing constants
const DISPLACEMENT_CAPACITY_FRACTION = 1.5; // Receiving municipalities can take 150% of original population
const LOST_POPULATION_FRACTION = 0.20; // 20% of displaced population becomes lost (when no 1991 census)

// Ethnicity-based loss: when 1991 census is available
const DISPLACEMENT_KILLED_FRACTION = 0.10; // 10% killed (all ethnicities)
const FLEE_ABROAD_FRACTION_RS = 0.30; // Serbs: 30% of displaced leave BiH (Serbia to flee to)
const FLEE_ABROAD_FRACTION_HRHB = 0.25; // Croats: 25% leave BiH (Croatia to flee to)
const FLEE_ABROAD_FRACTION_RBIH = 0; // Bosniaks: no external state to flee to

// Phase 22: Sustainability collapse displacement multiplier
const COLLAPSE_DISPLACEMENT_MULTIPLIER = 1.5; // 50% increase when municipality is collapsed

/**
 * Displacement update record per municipality.
 */
export interface DisplacementRecord {
  mun_id: MunicipalityId;
  faction_id: FactionId | null;
  original_population: number;
  displaced_out_before: number;
  displaced_out_after: number;
  displaced_in_before: number;
  displaced_in_after: number;
  lost_population_before: number;
  lost_population_after: number;
  displacement_this_turn: number;
  reason: string[];
}

/**
 * Displacement routing record.
 */
export interface DisplacementRoutingRecord {
  from_mun: MunicipalityId;
  to_mun: MunicipalityId;
  amount: number;
  reason: string;
}

/**
 * Displacement step report.
 */
export interface DisplacementStepReport {
  by_municipality: DisplacementRecord[];
  routing: DisplacementRoutingRecord[];
}

/**
 * Track unsupplied pressure state per municipality.
 * This is a transient state that tracks consecutive unsupplied turns.
 */
interface MunicipalityPressureState {
  mun_id: MunicipalityId;
  faction_id: FactionId;
  unsupplied_consecutive_turns: number;
  last_checked_turn: number;
}

/**
 * Module-level cache for tracking pressure state across turns.
 *
 * DETERMINISM NOTE: This cache persists across function calls within a single
 * process. For deterministic simulation, call resetDisplacementPressureCache()
 * at simulation start to ensure clean state.
 *
 * The cache tracks consecutive unsupplied turns per municipality per faction.
 * It is automatically updated during displacement computation and does not
 * need to be serialized - it reconstructs from turn-by-turn execution.
 */
const pressureStateCache = new Map<string, MunicipalityPressureState>();

/**
 * Reset the displacement pressure state cache.
 * Call this at simulation initialization to ensure deterministic behavior
 * across multiple simulation runs within the same process.
 */
export function resetDisplacementPressureCache(): void {
  pressureStateCache.clear();
}

/**
 * Get or initialize displacement state for a municipality.
 */
function getOrInitDisplacementState(
  state: GameState,
  munId: MunicipalityId,
  originalPopulation: number
): DisplacementState {
  if (!state.displacement_state) {
    state.displacement_state = {};
  }

  const existing = state.displacement_state[munId];
  if (existing) {
    return existing;
  }

  const newState: DisplacementState = {
    mun_id: munId,
    original_population: originalPopulation,
    displaced_out: 0,
    displaced_in: 0,
    lost_population: 0,
    last_updated_turn: state.meta.turn
  };

  state.displacement_state[munId] = newState;
  return newState;
}

/**
 * Check if a municipality is under pressure (has active front segments).
 */
function isMunicipalityUnderPressure(
  munId: MunicipalityId,
  settlements: Map<string, SettlementRecord>,
  state: GameState,
  frontEdges: ReturnType<typeof computeFrontEdges>
): boolean {
  // Find all settlements in this municipality
  const munSettlements: string[] = [];
  for (const [sid, settlement] of settlements.entries()) {
    if ((settlement.mun1990_id ?? settlement.mun_code) === munId) {
      munSettlements.push(sid);
    }
  }

  if (munSettlements.length === 0) return false;

  // Check if any settlement in the municipality is part of an active front edge
  const munSettlementSet = new Set(munSettlements);
  for (const edge of frontEdges) {
    const seg = (state.front_segments as any)?.[edge.edge_id];
    const isActive = seg && typeof seg === 'object' && (seg as any).active === true;
    if (!isActive) continue;

    if (munSettlementSet.has(edge.a) || munSettlementSet.has(edge.b)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a municipality is supplied for a faction.
 */
function isMunicipalitySupplied(
  factionId: FactionId,
  munId: MunicipalityId,
  settlements: Map<string, SettlementRecord>,
  reachableSettlements: Set<string>
): boolean {
  // Find all settlements in this municipality
  const munSettlements: string[] = [];
  for (const [sid, settlement] of settlements.entries()) {
    if ((settlement.mun1990_id ?? settlement.mun_code) === munId) {
      munSettlements.push(sid);
    }
  }

  // Sort deterministically
  munSettlements.sort();

  // Check if at least one settlement in the municipality is reachable
  for (const sid of munSettlements) {
    if (reachableSettlements.has(sid)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a municipality is encircled (no friendly adjacency path).
 * A municipality is encircled if there's no path through friendly-controlled
 * settlements to any other friendly municipality.
 */
function isMunicipalityEncircled(
  munId: MunicipalityId,
  factionId: FactionId,
  settlements: Map<string, SettlementRecord>,
  adjacencyMap: AdjacencyMap,
  state: GameState
): boolean {
  // Find all settlements in this municipality
  const munSettlements: string[] = [];
  for (const [sid, settlement] of settlements.entries()) {
    if ((settlement.mun1990_id ?? settlement.mun_code) === munId) {
      munSettlements.push(sid);
    }
  }

  if (munSettlements.length === 0) return false;

  // BFS from any settlement in this municipality
  // Check if we can reach any settlement in a different friendly municipality
  const visited = new Set<string>();
  const queue: string[] = [munSettlements[0]]; // Start from first settlement
  visited.add(munSettlements[0]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacencyMap[current] ?? [];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;

      const neighborSide = getEffectiveSettlementSide(state, neighbor);
      if (neighborSide !== factionId) continue; // Must be friendly-controlled

      visited.add(neighbor);

      // Check if neighbor is in a different municipality
      const neighborSettlement = settlements.get(neighbor);
      if (neighborSettlement && (neighborSettlement.mun1990_id ?? neighborSettlement.mun_code) !== munId) {
        // Found path to different friendly municipality - not encircled
        return false;
      }

      queue.push(neighbor);
    }
  }

  // No path found to different friendly municipality - encircled
  return true;
}

/**
 * Count breaches affecting a municipality.
 */
function countBreachesAffectingMunicipality(
  munId: MunicipalityId,
  settlements: Map<string, SettlementRecord>,
  breaches: FrontBreach[],
  frontEdges: ReturnType<typeof computeFrontEdges>
): number {
  // Find all settlements in this municipality
  const munSettlements: string[] = [];
  for (const [sid, settlement] of settlements.entries()) {
    if ((settlement.mun1990_id ?? settlement.mun_code) === munId) {
      munSettlements.push(sid);
    }
  }

  if (munSettlements.length === 0) return 0;

  const munSettlementSet = new Set(munSettlements);

  // Build edge_id to front edge map
  const edgeMap = new Map<string, typeof frontEdges[0]>();
  for (const edge of frontEdges) {
    edgeMap.set(edge.edge_id, edge);
  }

  // Count breaches where the edge involves a settlement in this municipality
  let count = 0;
  for (const breach of breaches) {
    const edge = edgeMap.get(breach.edge_id);
    if (!edge) continue;

    if (munSettlementSet.has(edge.a) || munSettlementSet.has(edge.b)) {
      count += 1;
    }
  }

  return count;
}

/**
 * Find shortest path to friendly municipality using BFS.
 */
function findShortestPathToFriendlyMunicipality(
  startMunId: MunicipalityId,
  factionId: FactionId,
  settlements: Map<string, SettlementRecord>,
  adjacencyMap: AdjacencyMap,
  state: GameState,
  reachableSettlements: Set<string>
): MunicipalityId | null {
  // Find all settlements in starting municipality
  const startSettlements: string[] = [];
  for (const [sid, settlement] of settlements.entries()) {
    if ((settlement.mun1990_id ?? settlement.mun_code) === startMunId) {
      startSettlements.push(sid);
    }
  }

  if (startSettlements.length === 0) return null;

  // BFS to find shortest path to any friendly municipality with supply
  const visited = new Set<string>();
  const queue: Array<{ sid: string; path: string[] }> = startSettlements.map((sid) => ({
    sid,
    path: [sid]
  }));
  for (const sid of startSettlements) {
    visited.add(sid);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacencyMap[current.sid] ?? [];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;

      const neighborSide = getEffectiveSettlementSide(state, neighbor);
      if (neighborSide !== factionId) continue; // Must be friendly-controlled

      visited.add(neighbor);

      const neighborSettlement = settlements.get(neighbor);
      if (!neighborSettlement) continue;

      const neighborMunId = neighborSettlement.mun1990_id ?? neighborSettlement.mun_code;

      // Check if this is a different municipality with supply
      if (neighborMunId !== startMunId && reachableSettlements.has(neighbor)) {
        return neighborMunId;
      }

      // Continue searching
      queue.push({
        sid: neighbor,
        path: [...current.path, neighbor]
      });
    }
  }

  return null;
}

/**
 * Route displaced population to friendly municipalities.
 */
function routeDisplacedPopulation(
  fromMunId: MunicipalityId,
  factionId: FactionId,
  amount: number,
  settlements: Map<string, SettlementRecord>,
  adjacencyMap: AdjacencyMap,
  state: GameState,
  reachableSettlements: Set<string>,
  displacementState: Record<MunicipalityId, DisplacementState>
): DisplacementRoutingRecord[] {
  const routing: DisplacementRoutingRecord[] = [];
  let remaining = amount;

  // Find all friendly municipalities with supply, sorted by shortest path
  const candidateMuns: Array<{ mun_id: MunicipalityId; distance: number }> = [];

  // Get all municipalities controlled by this faction with supply
  const munSettlementsByMun = new Map<MunicipalityId, string[]>();
  for (const [sid, settlement] of settlements.entries()) {
    const side = getEffectiveSettlementSide(state, sid);
    if (side !== factionId) continue;
    if (!reachableSettlements.has(sid)) continue;

    const munId = settlement.mun1990_id ?? settlement.mun_code;
    if (!munSettlementsByMun.has(munId)) {
      munSettlementsByMun.set(munId, []);
    }
    munSettlementsByMun.get(munId)!.push(sid);
  }

  // Calculate distances and sort
  for (const [targetMunId, targetSettlements] of munSettlementsByMun.entries()) {
    if (targetMunId === fromMunId) continue; // Don't route to self

    // Find shortest path (simplified: use first settlement in each municipality)
    const fromSettlements: string[] = [];
    for (const [sid, settlement] of settlements.entries()) {
      if ((settlement.mun1990_id ?? settlement.mun_code) === fromMunId) {
        fromSettlements.push(sid);
      }
    }

    if (fromSettlements.length === 0 || targetSettlements.length === 0) continue;

    // Simple distance: use BFS from first settlement
    const visited = new Set<string>();
    const queue: Array<{ sid: string; dist: number }> = fromSettlements.map((sid) => ({
      sid,
      dist: 0
    }));
    for (const sid of fromSettlements) {
      visited.add(sid);
    }

    let found = false;
    let distance = Infinity;

    while (queue.length > 0 && !found) {
      const current = queue.shift()!;
      const neighbors = adjacencyMap[current.sid] ?? [];

      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;

        const neighborSide = getEffectiveSettlementSide(state, neighbor);
        if (neighborSide !== factionId) continue;

        visited.add(neighbor);
        const neighborSettlement = settlements.get(neighbor);
        if (!neighborSettlement) continue;

        if ((neighborSettlement.mun1990_id ?? neighborSettlement.mun_code) === targetMunId) {
          distance = current.dist + 1;
          found = true;
          break;
        }

        queue.push({ sid: neighbor, dist: current.dist + 1 });
      }
    }

    if (found) {
      candidateMuns.push({ mun_id: targetMunId, distance });
    }
  }

  // Sort by distance, then by mun_id for determinism
  candidateMuns.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    return a.mun_id.localeCompare(b.mun_id);
  });

  // Route to candidates respecting capacity limits
  for (const candidate of candidateMuns) {
    if (remaining <= 0) break;

    const targetMunId = candidate.mun_id;
    const targetState = displacementState[targetMunId];
    const targetOriginal = targetState?.original_population ?? 10000; // Default if not initialized
    const targetCurrent = targetOriginal + (targetState?.displaced_in ?? 0) - (targetState?.displaced_out ?? 0);
    const targetCapacity = Math.floor(targetOriginal * DISPLACEMENT_CAPACITY_FRACTION);
    const targetAvailable = Math.max(0, targetCapacity - targetCurrent);

    if (targetAvailable <= 0) continue;

    const routed = Math.min(remaining, targetAvailable);
    remaining -= routed;

    routing.push({
      from_mun: fromMunId,
      to_mun: targetMunId,
      amount: routed,
      reason: 'friendly_supplied'
    });
  }

  return routing;
}

/** 1991 census per mun for splitting displaced by ethnicity (Bosniak→RBiH, Serb→RS, Croat→HRHB). */
export type MunicipalityPopulation1991Map = Record<
  string,
  { total: number; bosniak: number; serb: number; croat: number; other: number }
>;

/** One-time displacement fraction for Phase I flip when no 1991 census (Phase I §4.4). */
export const PHASE_I_DISPLACEMENT_FRACTION_NO_CENSUS = 0.15;

/** Minimal shape for Phase I displacement apply (avoids state -> phase_i dependency). */
export interface PhaseIDisplacementFlipInfo {
  mun_id: MunicipalityId;
  from_faction: FactionId | null;
  to_faction: FactionId;
}

export interface PhaseIDisplacementHooksInfo {
  by_mun: Array<{ mun_id: MunicipalityId; initiated_turn: number }>;
}

/**
 * Get losing faction's population share in mun from 1991 census (for Phase I displacement amount).
 * Returns fraction in [0,1]; when no census or no entry, returns PHASE_I_DISPLACEMENT_FRACTION_NO_CENSUS.
 */
function getLosingFactionShare(
  munId: MunicipalityId,
  fromFaction: FactionId | null,
  population1991ByMun?: MunicipalityPopulation1991Map
): number {
  if (!fromFaction || !population1991ByMun) return PHASE_I_DISPLACEMENT_FRACTION_NO_CENSUS;
  const entry = population1991ByMun[munId];
  if (!entry || entry.total <= 0) return PHASE_I_DISPLACEMENT_FRACTION_NO_CENSUS;
  const total = entry.total;
  if (fromFaction === 'RBiH') return (entry.bosniak + entry.other) / total;
  if (fromFaction === 'RS') return entry.serb / total;
  if (fromFaction === 'HRHB') return entry.croat / total;
  return PHASE_I_DISPLACEMENT_FRACTION_NO_CENSUS;
}

/**
 * Apply one-time Phase I displacement for muns that flipped and had displacement initiated this turn (Phase I §4.4).
 * Mutates state.displacement_state; uses same routing and killed/fled-abroad rules as Phase II when census provided.
 */
export function applyPhaseIDisplacementFromFlips(
  state: GameState,
  turn: number,
  flips: PhaseIDisplacementFlipInfo[],
  hooksByMun: PhaseIDisplacementHooksInfo['by_mun'],
  settlements: Map<string, SettlementRecord>,
  adjacencyMap: AdjacencyMap,
  population1991ByMun?: MunicipalityPopulation1991Map
): DisplacementStepReport {
  const defaultOriginalPopulation = 10000;
  const records: DisplacementRecord[] = [];
  const routingRecords: DisplacementRoutingRecord[] = [];
  const flipByMun = new Map<MunicipalityId, PhaseIDisplacementFlipInfo>();
  for (const f of flips) {
    flipByMun.set(f.mun_id, f);
  }
  const munsInitiatedThisTurn = hooksByMun.filter((m) => m.initiated_turn === turn).map((m) => m.mun_id);
  munsInitiatedThisTurn.sort((a, b) => a.localeCompare(b));

  for (const munId of munsInitiatedThisTurn) {
    const flip = flipByMun.get(munId);
    if (!flip || flip.from_faction === null) continue;

    const fromFaction = flip.from_faction;
    const dispState = getOrInitDisplacementState(
      state,
      munId,
      state.displacement_state?.[munId]?.original_population ?? defaultOriginalPopulation
    );
    const remainingPopulation =
      dispState.original_population - dispState.displaced_out - dispState.lost_population;
    if (remainingPopulation <= 0) continue;

    const share = getLosingFactionShare(munId, fromFaction, population1991ByMun);
    const displacementAmount = Math.min(
      Math.floor(dispState.original_population * share),
      remainingPopulation
    );
    if (displacementAmount <= 0) continue;

    let lostAmount: number;
    let routedAmount: number;
    let routableByFaction: { RBiH: number; RS: number; HRHB: number } | undefined;

    if (population1991ByMun) {
      const byFaction = splitDisplacedByEthnicity(munId, displacementAmount, population1991ByMun);
      const rRBiH = Math.floor(
        byFaction.RBiH * (1 - DISPLACEMENT_KILLED_FRACTION) * (1 - FLEE_ABROAD_FRACTION_RBIH)
      );
      const rRS = Math.floor(
        byFaction.RS * (1 - DISPLACEMENT_KILLED_FRACTION) * (1 - FLEE_ABROAD_FRACTION_RS)
      );
      const rHRHB = Math.floor(
        byFaction.HRHB * (1 - DISPLACEMENT_KILLED_FRACTION) * (1 - FLEE_ABROAD_FRACTION_HRHB)
      );
      routableByFaction = { RBiH: rRBiH, RS: rRS, HRHB: rHRHB };
      routedAmount = rRBiH + rRS + rHRHB;
      lostAmount = displacementAmount - routedAmount;
    } else {
      lostAmount = Math.floor(displacementAmount * LOST_POPULATION_FRACTION);
      routedAmount = displacementAmount - lostAmount;
    }

    const beforeOut = dispState.displaced_out;
    const beforeIn = dispState.displaced_in;
    const beforeLost = dispState.lost_population;
    dispState.displaced_out += displacementAmount;
    dispState.lost_population += lostAmount;
    dispState.last_updated_turn = turn;

    if (routedAmount > 0) {
      const reachableSettlements = new Set<string>();
      for (const [sid, settlement] of settlements.entries()) {
        const side = getEffectiveSettlementSide(state, sid);
        if (side !== fromFaction) continue;
        const sidMun = (settlement.mun1990_id ?? settlement.mun_code) as MunicipalityId;
        if (sidMun === munId) continue;
        reachableSettlements.add(sid);
      }
      const routing = routeDisplacedPopulation(
        munId,
        fromFaction,
        routedAmount,
        settlements,
        adjacencyMap,
        state,
        reachableSettlements,
        state.displacement_state!
      );
      const totalRoutable = routableByFaction
        ? routableByFaction.RBiH + routableByFaction.RS + routableByFaction.HRHB
        : routedAmount;
      for (const route of routing) {
        const destState = getOrInitDisplacementState(
          state,
          route.to_mun,
          state.displacement_state![route.to_mun]?.original_population ?? defaultOriginalPopulation
        );
        destState.displaced_in += route.amount;
        destState.last_updated_turn = turn;
        if (population1991ByMun && routableByFaction && totalRoutable > 0) {
          if (!destState.displaced_in_by_faction) destState.displaced_in_by_faction = {};
          const df = destState.displaced_in_by_faction;
          const rRBiH = Math.floor((route.amount * routableByFaction.RBiH) / totalRoutable);
          const rRS = Math.floor((route.amount * routableByFaction.RS) / totalRoutable);
          const rHRHB = route.amount - rRBiH - rRS;
          if (rRBiH > 0) df['RBiH'] = (df['RBiH'] ?? 0) + rRBiH;
          if (rRS > 0) df['RS'] = (df['RS'] ?? 0) + rRS;
          if (rHRHB > 0) df['HRHB'] = (df['HRHB'] ?? 0) + rHRHB;
        } else if (population1991ByMun) {
          const byFaction = splitDisplacedByEthnicity(route.from_mun, route.amount, population1991ByMun);
          if (!destState.displaced_in_by_faction) destState.displaced_in_by_faction = {};
          const df = destState.displaced_in_by_faction;
          if (byFaction.RBiH > 0) df['RBiH'] = (df['RBiH'] ?? 0) + byFaction.RBiH;
          if (byFaction.RS > 0) df['RS'] = (df['RS'] ?? 0) + byFaction.RS;
          if (byFaction.HRHB > 0) df['HRHB'] = (df['HRHB'] ?? 0) + byFaction.HRHB;
        }
        routingRecords.push(route);
      }
      const totalRouted = routing.reduce((sum, r) => sum + r.amount, 0);
      const unRouted = routedAmount - totalRouted;
      if (unRouted > 0) {
        dispState.lost_population += unRouted;
      }
    }

    const militiaPools = state.militia_pools as Record<string, MilitiaPoolState> | undefined;
    if (militiaPools && remainingPopulation > 0) {
      const poolKey = `${munId}:${fromFaction}`;
      const pool = militiaPools[poolKey];
      if (pool && typeof pool === 'object') {
        const reductionRatio = displacementAmount / Math.max(1, remainingPopulation);
        const poolReduction = Math.floor(pool.available * reductionRatio);
        if (poolReduction > 0) {
          pool.available = Math.max(0, pool.available - poolReduction);
          pool.updated_turn = turn;
        }
      }
    }

    records.push({
      mun_id: munId,
      faction_id: fromFaction,
      original_population: dispState.original_population,
      displaced_out_before: beforeOut,
      displaced_out_after: dispState.displaced_out,
      displaced_in_before: beforeIn,
      displaced_in_after: dispState.displaced_in,
      lost_population_before: beforeLost,
      lost_population_after: dispState.lost_population,
      displacement_this_turn: displacementAmount,
      reason: ['phase_i_flip']
    });
  }

  records.sort((a, b) => a.mun_id.localeCompare(b.mun_id));
  routingRecords.sort((a, b) => {
    const fromCmp = a.from_mun.localeCompare(b.from_mun);
    if (fromCmp !== 0) return fromCmp;
    return a.to_mun.localeCompare(b.to_mun);
  });
  return { by_municipality: records, routing: routingRecords };
}

/**
 * Split displaced amount by source mun's 1991 ethnic share. Returns { RBiH, RS, HRHB } (other assigned to RBiH).
 */
function splitDisplacedByEthnicity(
  fromMunId: MunicipalityId,
  amount: number,
  population1991ByMun: MunicipalityPopulation1991Map
): { RBiH: number; RS: number; HRHB: number } {
  const entry = population1991ByMun[fromMunId];
  if (!entry || entry.total <= 0)
    return { RBiH: amount, RS: 0, HRHB: 0 };
  const total = entry.total;
  const rbih = Math.floor((amount * entry.bosniak) / total);
  const rs = Math.floor((amount * entry.serb) / total);
  const hrhb = Math.floor((amount * entry.croat) / total);
  const other = amount - rbih - rs - hrhb;
  return { RBiH: rbih + other, RS: rs, HRHB: hrhb };
}

/**
 * Update population displacement for all municipalities.
 * When population1991ByMun is provided, displaced_in at each destination is split by source mun's 1991 ethnicity (displaced_in_by_faction) so pool population can add to the correct faction's pool.
 */
export function updateDisplacement(
  state: GameState,
  settlements: Map<string, SettlementRecord>,
  settlementEdges: EdgeRecord[],
  population1991ByMun?: MunicipalityPopulation1991Map
): DisplacementStepReport {
  const currentTurn = state.meta.turn;
  const militiaPools = state.militia_pools as Record<MunicipalityId, MilitiaPoolState> | undefined;

  if (!militiaPools || typeof militiaPools !== 'object') {
    return { by_municipality: [], routing: [] };
  }

  // Compute derived state
  const adjacencyMap = buildAdjacencyMap(settlementEdges);
  const supplyReport = computeSupplyReachability(state, adjacencyMap);
  const frontEdges = computeFrontEdges(state, settlementEdges);
  const breaches = computeFrontBreaches(state, frontEdges);

  // Build reachable sets by faction
  const reachableByFaction = new Map<FactionId, Set<string>>();
  for (const f of supplyReport.factions) {
    reachableByFaction.set(f.faction_id, new Set(f.reachable_controlled));
  }

  // Track breach persistence (simplified: count breaches this turn)
  const breachCountByMun = new Map<MunicipalityId, number>();
  const poolKeysSorted = Object.keys(militiaPools).sort();
  for (const key of poolKeysSorted) {
    const pool = militiaPools[key];
    if (!pool || typeof pool !== 'object') continue;
    const factionId = pool.faction;
    if (!factionId || typeof factionId !== 'string') continue;
    const munId = typeof pool.mun_id === 'string' ? pool.mun_id : key;

    const count = countBreachesAffectingMunicipality(munId, settlements, breaches, frontEdges);
    breachCountByMun.set(munId, count);
  }

  const records: DisplacementRecord[] = [];
  const routingRecords: DisplacementRoutingRecord[] = [];

  // Process each militia pool (key may be mun_id or "mun_id:faction")
  for (const key of poolKeysSorted) {
    const pool = militiaPools[key];
    if (!pool || typeof pool !== 'object') continue;

    const factionId = pool.faction;
    if (factionId === null || factionId === undefined) continue; // only process pools with faction
    if (typeof factionId !== 'string') continue;

    const munId = typeof pool.mun_id === 'string' ? pool.mun_id : key;

    // Get or initialize displacement state
    // Use a default original population if not set (can be initialized from census data later)
    const defaultOriginalPopulation = 10000;
    const dispState = getOrInitDisplacementState(state, munId, defaultOriginalPopulation);

    // Check conditions
    const underPressure = isMunicipalityUnderPressure(munId, settlements, state, frontEdges);
    const reachableSettlements = reachableByFaction.get(factionId) ?? new Set<string>();
    const supplied = isMunicipalitySupplied(factionId, munId, settlements, reachableSettlements);
    const encircled = isMunicipalityEncircled(munId, factionId, settlements, adjacencyMap, state);
    const breachCount = breachCountByMun.get(munId) ?? 0;

    // Phase 22: Check if municipality is collapsed (sustainability collapse)
    const sustState = state.sustainability_state?.[munId];
    const isCollapsed = sustState?.collapsed ?? false;

    // Calculate displacement amount
    const remainingPopulation =
      dispState.original_population - dispState.displaced_out - dispState.lost_population;
    let displacementAmount = 0;
    const reasons: string[] = [];

    // Trigger 1: Sustained pressure without supply
    if (underPressure && !supplied) {
      // Track consecutive unsupplied turns
      const cacheKey = `${munId}:${factionId}`;
      const cached = pressureStateCache.get(cacheKey);
      const consecutiveTurns =
        cached && cached.last_checked_turn === currentTurn - 1
          ? cached.unsupplied_consecutive_turns + 1
          : 1;

      pressureStateCache.set(cacheKey, {
        mun_id: munId,
        faction_id: factionId,
        unsupplied_consecutive_turns: consecutiveTurns,
        last_checked_turn: currentTurn
      });

      if (consecutiveTurns >= UNSUPPLIED_PRESSURE_TURNS) {
        const fraction = UNSUPPLIED_DISPLACEMENT_FRACTION;
        const amount = Math.floor(remainingPopulation * fraction);
        displacementAmount += amount;
        reasons.push(`unsupplied_pressure_${consecutiveTurns}_turns`);
      }
    } else {
      // Reset cache if supplied or not under pressure
      const cacheKey = `${munId}:${factionId}`;
      pressureStateCache.delete(cacheKey);
    }

    // Trigger 2: Encirclement
    if (encircled) {
      const fraction = ENCIRCLEMENT_DISPLACEMENT_FRACTION;
      const amount = Math.floor(remainingPopulation * fraction);
      displacementAmount += amount;
      reasons.push('encircled');
    }

    // Trigger 3: Breach persistence
    if (breachCount >= BREACH_PERSISTENCE_TURNS) {
      const fraction = BREACH_DISPLACEMENT_FRACTION;
      const amount = Math.floor(remainingPopulation * fraction);
      displacementAmount += amount;
      reasons.push(`breaches_${breachCount}`);
    }

    // Phase 22: Sustainability collapse amplifies displacement
    if (isCollapsed) {
      displacementAmount = Math.floor(displacementAmount * COLLAPSE_DISPLACEMENT_MULTIPLIER);
      reasons.push('sustainability_collapsed');
    }

    // Cap displacement to remaining population
    displacementAmount = Math.min(displacementAmount, remainingPopulation);

    if (displacementAmount > 0) {
      let lostAmount: number;
      let routedAmount: number;
      let routableByFaction: { RBiH: number; RS: number; HRHB: number } | undefined;

      if (population1991ByMun) {
        const byFaction = splitDisplacedByEthnicity(munId, displacementAmount, population1991ByMun);
        const rRBiH = Math.floor(
          byFaction.RBiH * (1 - DISPLACEMENT_KILLED_FRACTION) * (1 - FLEE_ABROAD_FRACTION_RBIH)
        );
        const rRS = Math.floor(
          byFaction.RS * (1 - DISPLACEMENT_KILLED_FRACTION) * (1 - FLEE_ABROAD_FRACTION_RS)
        );
        const rHRHB = Math.floor(
          byFaction.HRHB * (1 - DISPLACEMENT_KILLED_FRACTION) * (1 - FLEE_ABROAD_FRACTION_HRHB)
        );
        routableByFaction = { RBiH: rRBiH, RS: rRS, HRHB: rHRHB };
        routedAmount = rRBiH + rRS + rHRHB;
        lostAmount = displacementAmount - routedAmount;
      } else {
        lostAmount = Math.floor(displacementAmount * LOST_POPULATION_FRACTION);
        routedAmount = displacementAmount - lostAmount;
      }

      // Update displacement state
      const beforeOut = dispState.displaced_out;
      const beforeIn = dispState.displaced_in;
      const beforeLost = dispState.lost_population;

      dispState.displaced_out += displacementAmount;
      dispState.lost_population += lostAmount;
      dispState.last_updated_turn = currentTurn;

      // Reduce militia pool available proportionally (but not committed)
      const reductionRatio = displacementAmount / Math.max(1, remainingPopulation);
      const poolReduction = Math.floor(pool.available * reductionRatio);
      if (poolReduction > 0) {
        pool.available = Math.max(0, pool.available - poolReduction);
        pool.updated_turn = currentTurn;
      }

      // Route displaced population
      if (routedAmount > 0) {
        const routing = routeDisplacedPopulation(
          munId,
          factionId,
          routedAmount,
          settlements,
          adjacencyMap,
          state,
          reachableSettlements,
          state.displacement_state!
        );

        const totalRoutable = routableByFaction
          ? routableByFaction.RBiH + routableByFaction.RS + routableByFaction.HRHB
          : routedAmount;

        for (const route of routing) {
          const destState = getOrInitDisplacementState(
            state,
            route.to_mun,
            state.displacement_state![route.to_mun]?.original_population ?? defaultOriginalPopulation
          );
          destState.displaced_in += route.amount;
          destState.last_updated_turn = currentTurn;

          if (population1991ByMun && routableByFaction && totalRoutable > 0) {
            if (!destState.displaced_in_by_faction) destState.displaced_in_by_faction = {};
            const df = destState.displaced_in_by_faction;
            const rRBiH = Math.floor((route.amount * routableByFaction.RBiH) / totalRoutable);
            const rRS = Math.floor((route.amount * routableByFaction.RS) / totalRoutable);
            const rHRHB = route.amount - rRBiH - rRS;
            if (rRBiH > 0) df['RBiH'] = (df['RBiH'] ?? 0) + rRBiH;
            if (rRS > 0) df['RS'] = (df['RS'] ?? 0) + rRS;
            if (rHRHB > 0) df['HRHB'] = (df['HRHB'] ?? 0) + rHRHB;
          } else if (population1991ByMun) {
            const byFaction = splitDisplacedByEthnicity(route.from_mun, route.amount, population1991ByMun);
            if (!destState.displaced_in_by_faction) destState.displaced_in_by_faction = {};
            const df = destState.displaced_in_by_faction;
            if (byFaction.RBiH > 0) df['RBiH'] = (df['RBiH'] ?? 0) + byFaction.RBiH;
            if (byFaction.RS > 0) df['RS'] = (df['RS'] ?? 0) + byFaction.RS;
            if (byFaction.HRHB > 0) df['HRHB'] = (df['HRHB'] ?? 0) + byFaction.HRHB;
          }

          routingRecords.push(route);
        }

        const totalRouted = routing.reduce((sum, r) => sum + r.amount, 0);
        const unRouted = routedAmount - totalRouted;
        if (unRouted > 0) {
          dispState.lost_population += unRouted;
        }
      }

      records.push({
        mun_id: munId,
        faction_id: factionId,
        original_population: dispState.original_population,
        displaced_out_before: beforeOut,
        displaced_out_after: dispState.displaced_out,
        displaced_in_before: beforeIn,
        displaced_in_after: dispState.displaced_in,
        lost_population_before: beforeLost,
        lost_population_after: dispState.lost_population,
        displacement_this_turn: displacementAmount,
        reason: reasons
      });
    }
  }

  // Sort records deterministically
  records.sort((a, b) => a.mun_id.localeCompare(b.mun_id));
  routingRecords.sort((a, b) => {
    const fromCmp = a.from_mun.localeCompare(b.from_mun);
    if (fromCmp !== 0) return fromCmp;
    return a.to_mun.localeCompare(b.to_mun);
  });

  // Enforce recruitment ceilings after all displacement updates
  enforceRecruitmentCeilings(state);

  return { by_municipality: records, routing: routingRecords };
}

/**
 * Enforce recruitment ceiling based on displacement.
 * After displacement, the effective recruitment capacity is:
 * original_population - displaced_out - lost_population
 *
 * This reduces militia pool available if it exceeds the ceiling.
 */
export function enforceRecruitmentCeilings(state: GameState): void {
  const militiaPools = state.militia_pools as Record<MunicipalityId, MilitiaPoolState> | undefined;
  if (!militiaPools || typeof militiaPools !== 'object') return;
  if (!state.displacement_state || typeof state.displacement_state !== 'object') return;

  const currentTurn = state.meta.turn;

  for (const [key, pool] of Object.entries(militiaPools)) {
    if (!pool || typeof pool !== 'object') continue;

    const munId = typeof pool.mun_id === 'string' ? pool.mun_id : key;
    const dispState = state.displacement_state[munId];
    if (!dispState) continue; // No displacement state means no ceiling enforcement needed

    // Calculate effective recruitment ceiling
    const effectiveCeiling =
      dispState.original_population - dispState.displaced_out - dispState.lost_population;

    // Current total pool size
    const currentTotal = pool.available + pool.committed;

    // If total exceeds ceiling, reduce available (but not committed)
    if (currentTotal > effectiveCeiling) {
      const excess = currentTotal - effectiveCeiling;
      pool.available = Math.max(0, pool.available - excess);
      pool.updated_turn = currentTurn;
    }
  }
}
