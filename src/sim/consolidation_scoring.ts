/**
 * Deterministic consolidation and isolated-cluster scoring for AI.
 *
 * Used by Phase I bot (edge ranking) and Phase II brigade AI (target/posture).
 * Scores candidate settlements/municipalities for rear cleanup priority,
 * with exception handling for connected strongholds, isolated holdouts,
 * and fast-cleanup municipalities (e.g. Prijedor, Banja Luka ≤4 turns).
 *
 * No randomness; all iteration sorted by canonical IDs.
 */

import type { GameState, FactionId, SettlementId } from '../state/game_state.js';
import type { EdgeRecord } from '../map/settlements.js';
import { strictCompare } from '../state/validateGameState.js';

// ═══════════════════════════════════════════════════════════════════════════
// Exception data (deterministic lookup)
// ═══════════════════════════════════════════════════════════════════════════

/** Connected strongholds (RBiH in RS-dominated area): resist quick cleanup. Sapna, Teočak–Čelić. */
export const CONNECTED_STRONGHOLD_SIDS: readonly SettlementId[] = [
  'S163520', // Sapna
  'S123749'  // Kalesija/Teočak–Čelić
] as const;

/** Isolated VRS strongholds in RBiH-held muns: persist as holdouts. Petrovo (Gračanica), Vozuća (Zavidovići). */
export const ISOLATED_HOLDOUT_SIDS: readonly SettlementId[] = [
  'S120154', // Petrovo / Gračanica
  'S162094'  // Vozuća / Zavidovići
] as const;

/** Municipalities where rear cleanup should complete in ≤4 turns, by faction. */
export const FAST_REAR_CLEANUP_MUNS_BY_FACTION: Readonly<Record<FactionId, readonly string[]>> = {
  RS: ['prijedor', 'banja_luka'],
  RBiH: [],
  HRHB: []
} as const;

/** Municipalities with high-population holdouts (e.g. Kozarac in Prijedor) — higher resistance weight. */
export const LARGE_POPULATION_HOLDOUT_MUNS: readonly string[] = [
  'prijedor'  // Kozarac
] as const;

const CONNECTED_SET = new Set<string>(CONNECTED_STRONGHOLD_SIDS);
const ISOLATED_SET = new Set<string>(ISOLATED_HOLDOUT_SIDS);
const FAST_CLEANUP_SET_BY_FACTION = new Map<FactionId, Set<string>>(
  (Object.entries(FAST_REAR_CLEANUP_MUNS_BY_FACTION) as [FactionId, readonly string[]][])
    .map(([faction, munIds]) => [faction, new Set<string>(munIds)])
);
const LARGE_POP_SET = new Set<string>(LARGE_POPULATION_HOLDOUT_MUNS);

// ═══════════════════════════════════════════════════════════════════════════
// Scoring constants
// ═══════════════════════════════════════════════════════════════════════════

/** Base score for hostile settlement inside attacker-controlled municipality (rear cleanup). */
export const SCORE_HOSTILE_IN_OWN_MUN = 100;

/** Score for target in an isolated hostile cluster (breakthrough opportunity). */
export const SCORE_ISOLATED_CLUSTER = 60;

/** Penalty applied when target is a connected stronghold (harder to take). */
export const PENALTY_CONNECTED_STRONGHOLD = -40;

/** Penalty when target is a known isolated holdout (persist longer). */
export const PENALTY_ISOLATED_HOLDOUT = -30;

/** Penalty for large-population holdout municipality. */
export const PENALTY_LARGE_POP_HOLDOUT = -25;

/** Bonus when municipality is in fast rear-cleanup set (prioritize for ≤4-turn completion). */
export const BONUS_FAST_CLEANUP_MUN = 60;

/** Max turns for "fast" rear cleanup (e.g. one month). */
export const FAST_CLEANUP_MAX_TURNS = 4;

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

export function isConnectedStrongholdSid(sid: SettlementId): boolean {
  return CONNECTED_SET.has(sid);
}

export function isIsolatedHoldoutSid(sid: SettlementId): boolean {
  return ISOLATED_SET.has(sid);
}

export function isFastRearCleanupMun(
  munId: string | undefined | null,
  attackerFaction: FactionId = 'RS'
): boolean {
  if (munId == null) return false;
  return FAST_CLEANUP_SET_BY_FACTION.get(attackerFaction)?.has(munId) ?? false;
}

export function isLargePopulationHoldoutMun(munId: string | undefined | null): boolean {
  return munId != null && LARGE_POP_SET.has(munId);
}

/**
 * Build adjacency set for settlements (sids adjacent to a given sid).
 */
function buildAdjacency(edges: EdgeRecord[]): Map<SettlementId, Set<SettlementId>> {
  const adj = new Map<SettlementId, Set<SettlementId>>();
  for (const e of edges) {
    let aSet = adj.get(e.a);
    if (!aSet) { aSet = new Set(); adj.set(e.a, aSet); }
    aSet.add(e.b);
    let bSet = adj.get(e.b);
    if (!bSet) { bSet = new Set(); adj.set(e.b, bSet); }
    bSet.add(e.a);
  }
  return adj;
}

const ADJACENCY_CACHE_BY_EDGES = new WeakMap<EdgeRecord[], Map<SettlementId, Set<SettlementId>>>();

function getCachedAdjacency(edges: EdgeRecord[]): Map<SettlementId, Set<SettlementId>> {
  const cached = ADJACENCY_CACHE_BY_EDGES.get(edges);
  if (cached) return cached;
  const computed = buildAdjacency(edges);
  ADJACENCY_CACHE_BY_EDGES.set(edges, computed);
  return computed;
}

/**
 * Determine municipality controller from political_controllers (majority of sids in mun).
 * If sidToMun not provided or mun unknown, returns null.
 */
function getMunController(
  state: GameState,
  sidsInMun: SettlementId[],
  pc: Record<SettlementId, FactionId | null>
): FactionId | null {
  const counts: Record<string, number> = {};
  for (const sid of sidsInMun) {
    const c = pc[sid];
    const key = c ?? '_null_';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [key, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      best = key === '_null_' ? null : key;
    }
  }
  return best as FactionId | null;
}

/**
 * Check if a settlement belongs to an "isolated" hostile cluster:
 * same-faction controlled, with no same-faction neighbor outside the cluster (or few connections).
 * Simplified: we consider a settlement in a mun that is majority hostile to the attacker,
 * and the mun has no same-faction neighbor mun, as isolated.
 * Here we use a simple heuristic: target sid is hostile and has at least one attacker-controlled neighbor
 * (so it's on the front); "isolated cluster" = small number of hostile settlements adjacent to us.
 */
function countAttackerControlledNeighbors(
  sid: SettlementId,
  attackerFaction: FactionId,
  adj: Map<SettlementId, Set<SettlementId>>,
  pc: Record<SettlementId, FactionId | null>
): number {
  const neighbors = adj.get(sid);
  if (!neighbors) return 0;
  let n = 0;
  for (const nb of neighbors) {
    if (pc[nb] === attackerFaction) n++;
  }
  return n;
}

// ═══════════════════════════════════════════════════════════════════════════
// Public scoring API
// ═══════════════════════════════════════════════════════════════════════════

export interface ConsolidationScoreInput {
  state: GameState;
  targetSid: SettlementId;
  attackerFaction: FactionId;
  edges: EdgeRecord[];
  /** Optional precomputed adjacency for batch scoring in a single turn. */
  adjacency?: Map<SettlementId, Set<SettlementId>>;
  /** Settlement ID -> municipality ID (mun1990_id or mun_code). */
  sidToMun: Map<SettlementId, string> | Record<SettlementId, string> | null;
  /** All settlement IDs per municipality (for mun controller). If absent, mun controller not used. */
  settlementsByMun?: Map<string, SettlementId[]>;
}

/**
 * Score a single settlement as a consolidation/breakthrough target for the attacker faction.
 * Higher = higher priority. Deterministic.
 */
export function scoreConsolidationTarget(input: ConsolidationScoreInput): number {
  const {
    state,
    targetSid,
    attackerFaction,
    edges,
    sidToMun,
    settlementsByMun
  } = input;

  const pc = state.political_controllers ?? {};
  const controller = pc[targetSid];
  if (controller === attackerFaction) return 0; // already ours
  if (controller == null) return 0;

  const rawMun = sidToMun == null ? null : (sidToMun instanceof Map ? sidToMun.get(targetSid) : (sidToMun as Record<string, string>)[targetSid]);
  const munId = rawMun ?? null;
  const adj = input.adjacency ?? getCachedAdjacency(edges);

  let score = 0;

  // 1) Hostile settlement inside our municipality (rear cleanup)
  if (settlementsByMun && munId) {
    const sidsInMun = settlementsByMun.get(munId);
    if (sidsInMun?.length) {
      const munController = getMunController(state, sidsInMun, pc);
      if (munController === attackerFaction) {
        score += SCORE_HOSTILE_IN_OWN_MUN;
      }
    }
  }

  // 2) Isolated cluster: we have adjacent control, target is small hostile pocket
  const attackerNeighbors = countAttackerControlledNeighbors(targetSid, attackerFaction, adj, pc);
  if (attackerNeighbors > 0 && score === 0) {
    score += SCORE_ISOLATED_CLUSTER;
  }

  // 3) Exception penalties
  if (isConnectedStrongholdSid(targetSid)) {
    score += PENALTY_CONNECTED_STRONGHOLD;
  }
  if (isIsolatedHoldoutSid(targetSid)) {
    score += PENALTY_ISOLATED_HOLDOUT;
  }
  if (isLargePopulationHoldoutMun(munId)) {
    score += PENALTY_LARGE_POP_HOLDOUT;
  }

  // 4) Fast cleanup mun bonus (prioritize so ≤4-turn completion)
  if (isFastRearCleanupMun(munId, attackerFaction)) {
    score += BONUS_FAST_CLEANUP_MUN;
  }

  return Math.max(0, score);
}

/**
 * Sort settlement IDs by consolidation score descending, then by sid for determinism.
 */
export function sortTargetsByConsolidationScore(
  state: GameState,
  candidateSids: SettlementId[],
  attackerFaction: FactionId,
  edges: EdgeRecord[],
  sidToMun: Map<SettlementId, string> | Record<SettlementId, string> | null,
  settlementsByMun?: Map<string, SettlementId[]>
): SettlementId[] {
  const scored = candidateSids.map(sid => ({
    sid,
    score: scoreConsolidationTarget({
      state,
      targetSid: sid,
      attackerFaction,
      edges,
      sidToMun,
      settlementsByMun
    })
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return strictCompare(a.sid, b.sid);
  });
  return scored.map(x => x.sid);
}
