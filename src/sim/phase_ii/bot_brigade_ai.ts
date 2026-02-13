/**
 * Stage 4C: Bot AI for brigade operations.
 * Generates AoR reshape and posture orders for bot-controlled factions.
 * Used for automated faction play where no human player is providing orders.
 *
 * Deterministic: all iteration sorted by brigade ID, pressure magnitude.
 * No randomness, no timestamps.
 */

import type {
  GameState,
  FactionId,
  FormationId,
  FormationState,
  SettlementId,
  BrigadeAoROrder,
  BrigadePostureOrder,
  BrigadePosture
} from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getBrigadeAoRSettlements, computeBrigadeDensity, getSettlementGarrison } from './brigade_aor.js';
import { canAdoptPosture } from './brigade_posture.js';
import { FACTION_STRATEGIES, isCorridorMunicipality, isOffensiveObjective, isDefensivePriority } from './bot_strategy.js';

// --- Types ---

export interface BotOrdersResult {
  reshape_orders: BrigadeAoROrder[];
  posture_orders: BrigadePostureOrder[];
  /** One target settlement per brigade per turn; null = no attack (Brigade Realism §3.4–3.5). Only set when AI judges attack is appropriate (e.g. posture attack/probe, front contact). */
  attack_orders: Record<FormationId, SettlementId | null>;
}

// --- Constants ---

/** Maximum reshape orders per faction per turn (stability constraint). */
const MAX_RESHAPE_ORDERS_PER_FACTION = 3;

/** Coverage ratio thresholds (personnel / settlement_count). */
const COVERAGE_UNDERSTAFFED = 50;
const COVERAGE_SURPLUS = 150;

/** Pressure imbalance threshold for triggering reinforcement reshaping. */
const PRESSURE_IMBALANCE_THRESHOLD = 2;

// --- Target scoring constants ---

/** Score bonus for attacking undefended settlements (garrison = 0). */
const SCORE_UNDEFENDED = 100;

/** Score bonus for attacking settlements in corridor priority municipalities. */
const SCORE_CORRIDOR_OBJECTIVE = 90;

/** Score bonus for recapturing home municipality settlements. */
const SCORE_HOME_RECAPTURE = 60;

/** Max score bonus for weak garrisons (scales linearly down from this). */
const SCORE_WEAK_GARRISON_MAX = 50;

/** Garrison threshold below which weakness bonus kicks in. */
const GARRISON_WEAKNESS_THRESHOLD = 100;

/** Score bonus for attacking settlements in strategic offensive objective municipalities. */
const SCORE_OFFENSIVE_OBJECTIVE = 70;

// --- Helpers ---

/**
 * Build adjacency map from edge list.
 */
function buildAdjacency(edges: EdgeRecord[]): Map<SettlementId, Set<SettlementId>> {
  const adj = new Map<SettlementId, Set<SettlementId>>();
  for (const edge of edges) {
    let setA = adj.get(edge.a);
    if (!setA) { setA = new Set(); adj.set(edge.a, setA); }
    setA.add(edge.b);

    let setB = adj.get(edge.b);
    if (!setB) { setB = new Set(); adj.set(edge.b, setB); }
    setB.add(edge.a);
  }
  return adj;
}

/**
 * Normalize edge ID: sorted pair to ensure deterministic key.
 */
function edgeId(a: SettlementId, b: SettlementId): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/**
 * Get all active brigades for a faction, sorted by ID.
 */
function getFactionBrigades(state: GameState, faction: FactionId): FormationState[] {
  const formations = state.formations ?? {};
  const result: FormationState[] = [];
  const ids = Object.keys(formations).sort(strictCompare);
  for (const id of ids) {
    const f = formations[id];
    if (!f) continue;
    if (f.faction !== faction) continue;
    if (f.status !== 'active') continue;
    if ((f.kind ?? 'brigade') !== 'brigade') continue;
    result.push(f);
  }
  return result;
}

/**
 * Identify front edges where faction controls one side.
 * Returns edges where faction controls exactly one endpoint,
 * sorted deterministically.
 */
function getFactionFrontEdges(
  state: GameState,
  edges: EdgeRecord[],
  faction: FactionId
): Array<{ edge: EdgeRecord; our_sid: SettlementId; enemy_sid: SettlementId }> {
  const pc = state.political_controllers ?? {};
  const result: Array<{ edge: EdgeRecord; our_sid: SettlementId; enemy_sid: SettlementId }> = [];

  for (const edge of edges) {
    const controlA = pc[edge.a];
    const controlB = pc[edge.b];
    if (!controlA || !controlB || controlA === controlB) continue;

    if (controlA === faction) {
      result.push({ edge, our_sid: edge.a, enemy_sid: edge.b });
    } else if (controlB === faction) {
      result.push({ edge, our_sid: edge.b, enemy_sid: edge.a });
    }
  }

  // Sort by edge ID for determinism
  result.sort((a, b) => {
    const eidA = edgeId(a.edge.a, a.edge.b);
    const eidB = edgeId(b.edge.a, b.edge.b);
    return strictCompare(eidA, eidB);
  });

  return result;
}

/**
 * Check if a brigade has any settlements on the front line.
 * A settlement is front-active if it's adjacent to an enemy-controlled settlement.
 */
function hasFrontActiveSettlements(
  state: GameState,
  brigade: FormationState,
  adj: Map<SettlementId, Set<SettlementId>>
): boolean {
  const pc = state.political_controllers ?? {};
  const brigadeSettlements = getBrigadeAoRSettlements(state, brigade.id);

  for (const sid of brigadeSettlements) {
    const neighbors = adj.get(sid);
    if (!neighbors) continue;
    for (const neighbor of neighbors) {
      const neighborFaction = pc[neighbor];
      if (neighborFaction && neighborFaction !== brigade.faction) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Find settlements in a brigade's AoR that are adjacent to a target brigade's AoR.
 * These are candidate settlements for reshape transfer.
 * Returns sorted list for determinism.
 */
function findTransferCandidates(
  state: GameState,
  fromBrigade: FormationId,
  toBrigade: FormationId,
  adj: Map<SettlementId, Set<SettlementId>>
): SettlementId[] {
  const brigadeAor = state.brigade_aor ?? {};
  const fromSettlements = getBrigadeAoRSettlements(state, fromBrigade);

  // Must leave at least 1 settlement in from_brigade
  if (fromSettlements.length <= 1) return [];

  const candidates: SettlementId[] = [];

  for (const sid of fromSettlements) {
    // Check if this settlement is adjacent to any settlement in toBrigade's AoR
    const neighbors = adj.get(sid);
    if (!neighbors) continue;
    let adjacentToTarget = false;
    for (const neighbor of neighbors) {
      if (brigadeAor[neighbor] === toBrigade) {
        adjacentToTarget = true;
        break;
      }
    }
    if (adjacentToTarget) {
      candidates.push(sid);
    }
  }

  return candidates.sort(strictCompare);
}

/**
 * Extract home municipality from formation tags.
 */
function getFormationHomeMun(formation: FormationState): string | null {
  if (!formation.tags) return null;
  for (const tag of formation.tags) {
    if (tag.startsWith('mun:')) return tag.slice(4);
  }
  return null;
}

/**
 * Score a target settlement for attack priority.
 * Higher score = higher priority. Deterministic.
 */
function scoreTarget(
  state: GameState,
  targetSid: SettlementId,
  brigade: FormationState,
  faction: FactionId,
  edges: EdgeRecord[],
  sidToMun: Map<SettlementId, string> | null
): number {
  let score = 0;

  // 1. Undefended settlements (garrison = 0) are easy wins
  const garrison = getSettlementGarrison(state, targetSid, edges);
  if (garrison === 0) {
    score += SCORE_UNDEFENDED;
  } else if (garrison < GARRISON_WEAKNESS_THRESHOLD) {
    // Weaker garrisons get higher score (linear scale)
    score += Math.round(SCORE_WEAK_GARRISON_MAX * (1 - garrison / GARRISON_WEAKNESS_THRESHOLD));
  }

  // 2. Corridor objective + 3. Strategic offensive objective + 4. Home municipality recapture
  if (sidToMun) {
    const targetMun = sidToMun.get(targetSid);
    if (isCorridorMunicipality(targetMun, faction)) {
      score += SCORE_CORRIDOR_OBJECTIVE;
    }
    if (isOffensiveObjective(targetMun, faction)) {
      score += SCORE_OFFENSIVE_OBJECTIVE;
    }
    const homeMun = getFormationHomeMun(brigade);
    if (homeMun && targetMun === homeMun) {
      score += SCORE_HOME_RECAPTURE;
    }
  }

  return score;
}

/**
 * Check if a brigade is in a corridor municipality (for forced defend posture).
 */
function isBrigadeInCorridor(
  state: GameState,
  brigade: FormationState,
  faction: FactionId,
  sidToMun: Map<SettlementId, string> | null
): boolean {
  const strategy = FACTION_STRATEGIES[faction];
  if (!strategy.defend_critical_territory) return false;
  if (!sidToMun) return false;

  // Check if the brigade's HQ settlement is in a corridor municipality
  if (brigade.hq_sid) {
    const munId = sidToMun.get(brigade.hq_sid);
    if (isCorridorMunicipality(munId, faction)) return true;
  }

  // Check home municipality from tags
  const homeMun = getFormationHomeMun(brigade);
  if (isCorridorMunicipality(homeMun, faction)) return true;

  return false;
}

// --- Public API ---

/**
 * Generate bot brigade orders for a single faction.
 *
 * Logic:
 * 1. Compute coverage ratio for each brigade and generate posture orders.
 *    - Faction-specific thresholds and attack share limits.
 *    - Corridor brigades forced to defend when defend_critical_territory is set.
 * 2. Identify high-pressure sectors and generate reshape orders to reinforce.
 * 3. Strategic target selection: score targets by garrison, corridor, home recapture.
 * 4. Limit reshape orders to MAX_RESHAPE_ORDERS_PER_FACTION per turn.
 *
 * All iteration is in sorted order for determinism.
 */
export function generateBotBrigadeOrders(
  state: GameState,
  edges: EdgeRecord[],
  faction: FactionId,
  sidToMun?: Map<SettlementId, string> | null
): BotOrdersResult {
  const result: BotOrdersResult = {
    reshape_orders: [],
    posture_orders: [],
    attack_orders: {}
  };

  const brigades = getFactionBrigades(state, faction);
  if (brigades.length === 0) return result;

  const adj = buildAdjacency(edges);
  const brigadeAor = state.brigade_aor ?? {};
  const frontPressure = state.front_pressure ?? {};
  const strategy = FACTION_STRATEGIES[faction];
  const munLookup = sidToMun ?? null;

  // --- Step 1: Posture decisions based on coverage ratio + faction strategy ---

  // Count how many brigades are already in attack/probe posture (for share limiting)
  let attackPostureCount = 0;
  for (const brigade of brigades) {
    const p = brigade.posture ?? 'defend';
    if (p === 'attack' || p === 'probe') attackPostureCount++;
  }
  const maxAttackBrigades = Math.max(1, Math.floor(brigades.length * strategy.max_attack_posture_share));

  for (const brigade of brigades) {
    const density = computeBrigadeDensity(state, brigade.id);
    const hasFront = hasFrontActiveSettlements(state, brigade, adj);
    const currentPosture: BrigadePosture = brigade.posture ?? 'defend';
    const inCorridor = isBrigadeInCorridor(state, brigade, faction, munLookup);

    // Check if brigade HQ is in an offensive objective municipality
    const homeMun = getFormationHomeMun(brigade);
    const hqMun = munLookup?.get(brigade.hq_sid ?? '') ?? null;
    const inOffensiveZone = isOffensiveObjective(homeMun, faction) || isOffensiveObjective(hqMun, faction);

    let targetPosture: BrigadePosture | null = null;

    if (!hasFront) {
      // No front contact: stay or switch to defend (reserve)
      if (currentPosture !== 'defend') {
        targetPosture = 'defend';
      }
    } else if (inCorridor && currentPosture !== 'defend') {
      // Corridor brigades: force defend posture to hold critical territory
      targetPosture = 'defend';
    } else if (density >= strategy.attack_coverage_threshold && currentPosture === 'defend') {
      // Overstaffed and defending: can afford to probe/attack (if below share limit)
      if (attackPostureCount < maxAttackBrigades) {
        targetPosture = strategy.preferred_posture_when_overstaffed;
      }
    } else if (inOffensiveZone && density >= COVERAGE_UNDERSTAFFED && currentPosture === 'defend') {
      // Brigades in strategic offensive zones probe at lower density threshold
      if (attackPostureCount < maxAttackBrigades) {
        targetPosture = 'probe';
      }
    } else if (density < COVERAGE_UNDERSTAFFED) {
      // Understaffed: fall back to elastic defense
      if (currentPosture !== 'elastic_defense' && currentPosture !== 'defend') {
        targetPosture = 'elastic_defense';
      }
    }

    // Only issue order if posture would change and brigade can adopt it
    if (targetPosture !== null && targetPosture !== currentPosture) {
      if (canAdoptPosture(brigade, targetPosture)) {
        result.posture_orders.push({
          brigade_id: brigade.id,
          posture: targetPosture
        });
        // Track attack posture count changes
        const wasAttack = currentPosture === 'attack' || currentPosture === 'probe';
        const willAttack = targetPosture === 'attack' || targetPosture === 'probe';
        if (willAttack && !wasAttack) attackPostureCount++;
        if (wasAttack && !willAttack) attackPostureCount--;
      }
    }
  }

  // --- Step 2: Identify high-pressure sectors and generate reshape orders ---

  // Build map: brigade_id -> set of front edge IDs it covers
  const brigadeFrontEdges = new Map<FormationId, string[]>();
  const frontEdgeData = getFactionFrontEdges(state, edges, faction);

  for (const fe of frontEdgeData) {
    const eid = edgeId(fe.edge.a, fe.edge.b);
    const assignedBrigade = brigadeAor[fe.our_sid];
    if (!assignedBrigade) continue;
    let edgeList = brigadeFrontEdges.get(assignedBrigade);
    if (!edgeList) { edgeList = []; brigadeFrontEdges.set(assignedBrigade, edgeList); }
    edgeList.push(eid);
  }

  // Find edges where enemy pressure exceeds our pressure by threshold
  const threatenedEdges: Array<{ eid: string; brigade_id: FormationId; imbalance: number }> = [];

  for (const fe of frontEdgeData) {
    const eid = edgeId(fe.edge.a, fe.edge.b);
    const pressure = frontPressure[eid];
    if (!pressure) continue;

    const assignedBrigade = brigadeAor[fe.our_sid];
    if (!assignedBrigade) continue;

    // Determine which side we are on. Pressure value is side_a - side_b convention.
    // Positive value = side_a has more pressure.
    // We need to check if our side is under pressure.
    const ourSidIsA = fe.our_sid < fe.enemy_sid;
    // If our side is A, enemy advantage = -value (enemy is B, so B-A = -value)
    // If our side is B, enemy advantage = value (A-B = value, enemy is A)
    const enemyAdvantage = ourSidIsA ? -pressure.value : pressure.value;

    if (enemyAdvantage > PRESSURE_IMBALANCE_THRESHOLD) {
      threatenedEdges.push({
        eid,
        brigade_id: assignedBrigade,
        imbalance: enemyAdvantage
      });
    }
  }

  // Sort by imbalance descending (most threatened first), then by edge ID for tie-breaking
  threatenedEdges.sort((a, b) => {
    if (b.imbalance !== a.imbalance) return b.imbalance - a.imbalance;
    return strictCompare(a.eid, b.eid);
  });

  // Build coverage map for finding surplus brigades
  const brigadeDensities = new Map<FormationId, number>();
  for (const brigade of brigades) {
    brigadeDensities.set(brigade.id, computeBrigadeDensity(state, brigade.id));
  }

  // For each threatened edge, find a surplus brigade and transfer 1 settlement
  const usedDonors = new Set<FormationId>();
  let reshapeCount = 0;

  for (const threat of threatenedEdges) {
    if (reshapeCount >= MAX_RESHAPE_ORDERS_PER_FACTION) break;

    const threatenedBrigade = threat.brigade_id;

    // Find nearest surplus brigade (coverage > COVERAGE_SURPLUS) that hasn't been used yet
    // "Nearest" = shares the most border settlements with threatened brigade
    // Simplified: just pick the surplus brigade with highest density, sorted by ID for ties
    let bestDonor: FormationId | null = null;
    let bestDonorDensity = 0;
    let bestCandidates: SettlementId[] = [];

    for (const brigade of brigades) {
      if (brigade.id === threatenedBrigade) continue;
      if (usedDonors.has(brigade.id)) continue;

      const density = brigadeDensities.get(brigade.id) ?? 0;
      if (density < COVERAGE_SURPLUS) continue;

      // Check if donor has transfer candidates adjacent to threatened brigade
      const candidates = findTransferCandidates(state, brigade.id, threatenedBrigade, adj);
      if (candidates.length === 0) continue;

      if (density > bestDonorDensity || (density === bestDonorDensity && (!bestDonor || strictCompare(brigade.id, bestDonor) < 0))) {
        bestDonor = brigade.id;
        bestDonorDensity = density;
        bestCandidates = candidates;
      }
    }

    if (bestDonor && bestCandidates.length > 0) {
      // Pick the first candidate settlement (sorted, deterministic)
      result.reshape_orders.push({
        settlement_id: bestCandidates[0],
        from_brigade: bestDonor,
        to_brigade: threatenedBrigade
      });
      usedDonors.add(bestDonor);
      reshapeCount++;
    }
  }

  // --- Step 3: Attack orders — strategic target selection ---
  // Build effective posture map: pending orders override current posture
  const pendingPosture = new Map<FormationId, BrigadePosture>();
  for (const order of result.posture_orders) {
    pendingPosture.set(order.brigade_id, order.posture);
  }

  const frontEdgeDataForAttack = getFactionFrontEdges(state, edges, faction);
  for (const brigade of brigades) {
    const posture = pendingPosture.get(brigade.id) ?? brigade.posture ?? 'defend';
    if (posture !== 'attack' && posture !== 'probe') continue;
    const aorSids = getBrigadeAoRSettlements(state, brigade.id);
    const ourSidsSet = new Set(aorSids);

    // Collect unique enemy-adjacent settlements
    const enemyAdjacentSet = new Set<SettlementId>();
    for (const fe of frontEdgeDataForAttack) {
      if (!ourSidsSet.has(fe.our_sid)) continue;
      enemyAdjacentSet.add(fe.enemy_sid);
    }
    if (enemyAdjacentSet.size === 0) continue;

    // Score each target and pick the best
    const scoredTargets: Array<{ sid: SettlementId; score: number }> = [];
    for (const sid of enemyAdjacentSet) {
      scoredTargets.push({
        sid,
        score: scoreTarget(state, sid, brigade, faction, edges, munLookup)
      });
    }

    // Sort by score descending, then by settlement ID for deterministic tie-breaking
    scoredTargets.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return strictCompare(a.sid, b.sid);
    });

    result.attack_orders[brigade.id] = scoredTargets[0].sid;
  }

  return result;
}

/**
 * Generate bot orders for all bot-controlled factions.
 * Appends generated orders to state.brigade_aor_orders and state.brigade_posture_orders.
 *
 * Factions are processed in sorted order for determinism.
 */
export function generateAllBotOrders(
  state: GameState,
  edges: EdgeRecord[],
  botFactions: FactionId[],
  sidToMun?: Map<SettlementId, string> | null
): void {
  const sortedFactions = [...botFactions].sort(strictCompare);

  const attackOrdersAccum: Record<FormationId, SettlementId | null> = {};
  for (const faction of sortedFactions) {
    const orders = generateBotBrigadeOrders(state, edges, faction, sidToMun);

    if (!state.brigade_aor_orders) state.brigade_aor_orders = [];
    if (!state.brigade_posture_orders) state.brigade_posture_orders = [];

    state.brigade_aor_orders.push(...orders.reshape_orders);
    state.brigade_posture_orders.push(...orders.posture_orders);
    for (const [bid, target] of Object.entries(orders.attack_orders)) {
      if (target != null) attackOrdersAccum[bid as FormationId] = target;
    }
  }
  if (Object.keys(attackOrdersAccum).length > 0) {
    state.brigade_attack_orders = attackOrdersAccum;
  }
}
