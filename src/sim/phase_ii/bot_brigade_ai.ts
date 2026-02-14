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
import { buildAdjacencyFromEdges, getFactionBrigades } from './phase_ii_adjacency.js';
import { getBrigadeAoRSettlements, computeBrigadeDensity, getSettlementGarrison } from './brigade_aor.js';
import { canAdoptPosture } from './brigade_posture.js';
import type { CorpsStance } from '../../state/game_state.js';
import { FACTION_STRATEGIES, isCorridorMunicipality, isOffensiveObjective, isDefensivePriority, getEffectiveAttackShare } from './bot_strategy.js';
import { scoreConsolidationTarget } from '../consolidation_scoring.js';
import { estimateAttackCost } from './combat_estimate.js';

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
const COVERAGE_UNDERSTAFFED = 55;
const COVERAGE_SURPLUS = 140;

/** Pressure imbalance threshold for triggering reinforcement reshaping. */
const PRESSURE_IMBALANCE_THRESHOLD = 1.8;

// --- Target scoring constants ---

/** Score bonus for attacking undefended settlements (garrison = 0). */
const SCORE_UNDEFENDED = 100;

/** Score bonus for attacking settlements in corridor priority municipalities. */
const SCORE_CORRIDOR_OBJECTIVE = 95;

/** Score bonus for recapturing home municipality settlements. */
const SCORE_HOME_RECAPTURE = 60;

/** Max score bonus for weak garrisons (scales linearly down from this). */
const SCORE_WEAK_GARRISON_MAX = 50;

/** Garrison threshold below which weakness bonus kicks in. */
const GARRISON_WEAKNESS_THRESHOLD = 120;

/** Score bonus for attacking settlements in strategic offensive objective municipalities. */
const SCORE_OFFENSIVE_OBJECTIVE = 85;

/** Weight for consolidation/breakthrough score (rear cleanup, isolated clusters, fast-cleanup muns). */
const CONSOLIDATION_SCORE_WEIGHT = 0.15;

/** Garrison at or above this value counts as "heavy resistance" for allowing duplicate attack targets (OG+operation exception only). */
const HEAVY_RESISTANCE_GARRISON_THRESHOLD = 250;

/** Casualty-aversion: don't attack when expected losses exceed this fraction, unless strategic target. */
const CASUALTY_AVERSION_THRESHOLD = 0.15;

/** Strategic targets: accept higher losses up to this fraction. */
const STRATEGIC_LOSS_ACCEPTANCE = 0.25;

/** Minimum win probability required to attack (unless strategic). */
const MIN_WIN_PROBABILITY = 0.6;

/** Score penalty for attacking settlements with high opposing-ethnicity concentration. */
const ETHNIC_RESISTANCE_PENALTY = -40;

/** Max brigades per faction in elastic_defense for economy of force. */
const MAX_ELASTIC_DEFENSE_PER_FACTION = 2;

// --- Helpers ---

/**
 * True if the settlement has heavy resistance: defender brigade in AoR at target, or garrison >= HEAVY_RESISTANCE_GARRISON_THRESHOLD.
 * Used to allow duplicate attack targets only when OG+operation and heavy resistance (plan: one-brigade-per-target).
 */
function hasHeavyResistance(
  state: GameState,
  targetSid: SettlementId,
  edges: EdgeRecord[]
): boolean {
  const garrison = getSettlementGarrison(state, targetSid, edges);
  if (garrison >= HEAVY_RESISTANCE_GARRISON_THRESHOLD) return true;
  const brigadeAor = state.brigade_aor ?? {};
  const defenderBrigadeId = brigadeAor[targetSid];
  if (defenderBrigadeId == null) return false;
  const formation = state.formations?.[defenderBrigadeId];
  return formation != null && formation.status === 'active';
}

/**
 * True if the brigade is part of an active OG conducting an operation toward this settlement.
 * Checks whether the brigade's parent corps has an active operation in execution phase
 * with target_settlements containing the target, AND the brigade is a participant.
 * Enables the one-brigade-per-target exception for multi-brigade convergence on
 * heavily defended objectives (corridor breaches, major offensives).
 */
function isPartOfOGOperationToward(
  state: GameState,
  brigadeId: FormationId,
  targetSid: SettlementId
): boolean {
  const formations = state.formations ?? {};
  const brigade = formations[brigadeId];
  if (!brigade?.corps_id || !state.corps_command) return false;

  const cmd = state.corps_command[brigade.corps_id];
  if (!cmd?.active_operation) return false;

  const op = cmd.active_operation;
  // Must be in execution phase with this brigade participating
  if (op.phase !== 'execution') return false;
  if (!op.participating_brigades.includes(brigadeId)) return false;

  // Must have the target settlement in operation targets
  const targets = op.target_settlements ?? [];
  return targets.includes(targetSid);
}

/**
 * Normalize edge ID: sorted pair to ensure deterministic key.
 */
function edgeId(a: SettlementId, b: SettlementId): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
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
 * Soft front: front-active but no enemy brigade defending adjacent enemy settlements.
 * Real fronts = two brigades face each other; soft = rear cleanup / undefended pockets.
 */
function hasSoftFront(
  state: GameState,
  brigade: FormationState,
  adj: Map<SettlementId, Set<SettlementId>>,
  edges: EdgeRecord[]
): boolean {
  const pc = state.political_controllers ?? {};
  const brigadeSettlements = getBrigadeAoRSettlements(state, brigade.id);
  let hasEnemyNeighbor = false;
  let allEnemyNeighborsUndefended = true;

  for (const sid of brigadeSettlements) {
    const neighbors = adj.get(sid);
    if (!neighbors) continue;
    for (const neighbor of neighbors) {
      const neighborFaction = pc[neighbor];
      if (!neighborFaction || neighborFaction === brigade.faction) continue;
      hasEnemyNeighbor = true;
      const garrison = getSettlementGarrison(state, neighbor, edges);
      if (garrison > GARRISON_WEAKNESS_THRESHOLD) {
        allEnemyNeighborsUndefended = false;
      }
    }
  }

  return hasEnemyNeighbor && allEnemyNeighborsUndefended;
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
 * Get the parent corps stance for a brigade. Returns null if no corps assignment.
 */
function getParentCorpsStance(state: GameState, brigade: FormationState): CorpsStance | null {
  if (!brigade.corps_id || !state.corps_command) return null;
  const cmd = state.corps_command[brigade.corps_id];
  return cmd?.stance ?? null;
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
 * Build mun_id -> settlement IDs from political_controllers and sidToMun (for consolidation scoring).
 * Deterministic: sorted keys.
 */
function buildSettlementsByMunFromControl(
  state: GameState,
  sidToMun: Map<SettlementId, string> | null
): Map<string, SettlementId[]> {
  const out = new Map<string, SettlementId[]>();
  if (!sidToMun || sidToMun.size === 0) return out;
  const pc = state.political_controllers ?? {};
  const sids = (Object.keys(pc) as SettlementId[]).sort(strictCompare);
  for (const sid of sids) {
    const mun = sidToMun instanceof Map ? sidToMun.get(sid) : (sidToMun as Record<string, string>)[sid];
    if (!mun) continue;
    const list = out.get(mun) ?? [];
    list.push(sid);
    out.set(mun, list);
  }
  for (const list of out.values()) list.sort(strictCompare);
  return out;
}

/**
 * Score a target settlement for attack priority.
 * Higher score = higher priority. Deterministic.
 * Includes consolidation/breakthrough scoring (rear cleanup, isolated clusters, fast-cleanup muns).
 */
function scoreTarget(
  state: GameState,
  targetSid: SettlementId,
  brigade: FormationState,
  faction: FactionId,
  edges: EdgeRecord[],
  sidToMun: Map<SettlementId, string> | null,
  settlementsByMun?: Map<string, SettlementId[]>
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

  // 5. Consolidation/breakthrough: rear cleanup, isolated clusters, fast-cleanup muns (still produces casualties)
  const consolidationScore = scoreConsolidationTarget({
    state,
    targetSid,
    attackerFaction: faction,
    edges,
    sidToMun,
    settlementsByMun
  });
  score += Math.floor(consolidationScore * CONSOLIDATION_SCORE_WEIGHT);

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

  const adj = buildAdjacencyFromEdges(edges);
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
  const turn = state.meta?.turn ?? 0;
  const effectiveAttackShare = getEffectiveAttackShare(faction, turn);
  const maxAttackBrigades = Math.max(1, Math.floor(brigades.length * effectiveAttackShare));

  for (const brigade of brigades) {
    const density = computeBrigadeDensity(state, brigade.id);
    const hasFront = hasFrontActiveSettlements(state, brigade, adj);
    const softFront = hasFront && hasSoftFront(state, brigade, adj, edges);
    const currentPosture: BrigadePosture = brigade.posture ?? 'defend';
    const inCorridor = isBrigadeInCorridor(state, brigade, faction, munLookup);

    // Check if brigade HQ is in an offensive objective municipality
    const homeMun = getFormationHomeMun(brigade);
    const hqMun = munLookup?.get(brigade.hq_sid ?? '') ?? null;
    const inOffensiveZone = isOffensiveObjective(homeMun, faction) || isOffensiveObjective(hqMun, faction);

    // Corps stance modulates brigade posture decisions
    const corpsStance = getParentCorpsStance(state, brigade);
    const corpsForceDefend = corpsStance === 'defensive' || corpsStance === 'reorganize';
    // Offensive corps lowers attack threshold by 30%
    const effectiveAttackThreshold = corpsStance === 'offensive'
      ? Math.floor(strategy.attack_coverage_threshold * 0.7)
      : strategy.attack_coverage_threshold;
    // Offensive corps allows more brigades in attack posture
    const corpsMaxAttack = corpsStance === 'offensive'
      ? Math.max(maxAttackBrigades, Math.floor(brigades.length * 0.6))
      : maxAttackBrigades;

    let targetPosture: BrigadePosture | null = null;

    if (!hasFront) {
      // No front contact: stay or switch to defend (reserve)
      if (currentPosture !== 'defend') {
        targetPosture = 'defend';
      }
    } else if (corpsForceDefend && currentPosture !== 'defend' && currentPosture !== 'elastic_defense') {
      // Corps in defensive/reorganize stance: force brigade to defend
      targetPosture = 'defend';
    } else if (inCorridor && currentPosture !== 'defend') {
      // Corridor brigades: force defend posture to hold critical territory
      targetPosture = 'defend';
    } else if (softFront && !inCorridor && !corpsForceDefend && currentPosture === 'defend' && density >= COVERAGE_UNDERSTAFFED) {
      // Soft front (no enemy brigade): consolidation to clean rear / undefended pockets
      targetPosture = 'consolidation';
    } else if (!corpsForceDefend && density >= effectiveAttackThreshold && currentPosture === 'defend') {
      // Overstaffed and defending: can afford to probe/attack (if below share limit)
      if (attackPostureCount < corpsMaxAttack) {
        targetPosture = strategy.preferred_posture_when_overstaffed;
      }
    } else if (!corpsForceDefend && inOffensiveZone && density >= COVERAGE_UNDERSTAFFED && currentPosture === 'defend') {
      // Brigades in strategic offensive zones probe at lower density threshold
      if (attackPostureCount < corpsMaxAttack) {
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
        // Track attack posture count changes (consolidation does not count toward limit)
        const wasAttack = currentPosture === 'attack' || currentPosture === 'probe';
        const willAttack = targetPosture === 'attack' || targetPosture === 'probe';
        if (willAttack && !wasAttack) attackPostureCount++;
        if (wasAttack && !willAttack) attackPostureCount--;
      }
    }
  }

  // --- Step 1b: Enforce min_active_brigades (ensure faction isn't passive) ---
  // Build a map of effective postures (pending orders override current)
  const pendingPostureForMinActive = new Map<FormationId, BrigadePosture>();
  for (const order of result.posture_orders) {
    pendingPostureForMinActive.set(order.brigade_id, order.posture);
  }

  if (attackPostureCount < strategy.min_active_brigades) {
    // Find brigades on the front in defend posture, sorted by density descending (best candidates first)
    const defendingFrontBrigades = brigades
      .filter(b => {
        const effectivePosture = pendingPostureForMinActive.get(b.id) ?? b.posture ?? 'defend';
        return effectivePosture === 'defend' && hasFrontActiveSettlements(state, b, adj)
          && !isBrigadeInCorridor(state, b, faction, munLookup);
      })
      .map(b => ({ brigade: b, density: computeBrigadeDensity(state, b.id) }))
      .sort((a, b) => {
        if (b.density !== a.density) return b.density - a.density;
        return strictCompare(a.brigade.id, b.brigade.id);
      });

    for (const { brigade } of defendingFrontBrigades) {
      if (attackPostureCount >= strategy.min_active_brigades) break;
      if (canAdoptPosture(brigade, 'probe')) {
        // Check if we already issued an order for this brigade — if so, override it
        const existingIdx = result.posture_orders.findIndex(o => o.brigade_id === brigade.id);
        if (existingIdx >= 0) {
          result.posture_orders[existingIdx].posture = 'probe';
        } else {
          result.posture_orders.push({ brigade_id: brigade.id, posture: 'probe' });
        }
        attackPostureCount++;
      }
    }
  }

  // --- Step 1c: Economy of force (D4) — thin quiet sectors to concentrate for offense ---
  let elasticDefenseCount = brigades.filter(b => {
    const p = pendingPostureForMinActive.get(b.id) ?? b.posture ?? 'defend';
    return p === 'elastic_defense';
  }).length;

  if (elasticDefenseCount < MAX_ELASTIC_DEFENSE_PER_FACTION) {
    // Find the lowest-density defending brigade on a quiet sector
    const quietDefenders = brigades
      .filter(b => {
        const p = pendingPostureForMinActive.get(b.id) ?? b.posture ?? 'defend';
        return p === 'defend' && hasFrontActiveSettlements(state, b, adj)
          && !isBrigadeInCorridor(state, b, faction, munLookup);
      })
      .map(b => ({ brigade: b, density: computeBrigadeDensity(state, b.id) }))
      .sort((a, b) => {
        if (a.density !== b.density) return a.density - b.density;
        return strictCompare(a.brigade.id, b.brigade.id);
      });

    for (const { brigade } of quietDefenders) {
      if (elasticDefenseCount >= MAX_ELASTIC_DEFENSE_PER_FACTION) break;
      // Only thin out if there are attacking brigades that could benefit
      if (attackPostureCount === 0) break;
      if (canAdoptPosture(brigade, 'elastic_defense')) {
        const existingIdx = result.posture_orders.findIndex(o => o.brigade_id === brigade.id);
        if (existingIdx >= 0) {
          result.posture_orders[existingIdx].posture = 'elastic_defense';
        } else {
          result.posture_orders.push({ brigade_id: brigade.id, posture: 'elastic_defense' });
        }
        elasticDefenseCount++;
      }
    }
  }

  // --- Step 1d: Feints (D5) — probe on secondary sectors during named operation planning ---
  if (state.corps_command) {
    const corpsCommand = state.corps_command;
    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
      const cmd = corpsCommand[corpsId];
      if (!cmd?.active_operation || cmd.active_operation.phase !== 'planning') continue;
      const opParticipants = new Set(cmd.active_operation.participating_brigades);

      // Find 1-2 non-participating brigades to set as feint probes
      let feintCount = 0;
      for (const brigade of brigades) {
        if (feintCount >= 2) break;
        if (opParticipants.has(brigade.id)) continue;
        const p = pendingPostureForMinActive.get(brigade.id) ?? brigade.posture ?? 'defend';
        if (p !== 'defend') continue;
        if (!hasFrontActiveSettlements(state, brigade, adj)) continue;
        if (isBrigadeInCorridor(state, brigade, faction, munLookup)) continue;

        if (canAdoptPosture(brigade, 'probe') && attackPostureCount < maxAttackBrigades + 2) {
          const existingIdx = result.posture_orders.findIndex(o => o.brigade_id === brigade.id);
          if (existingIdx >= 0) {
            result.posture_orders[existingIdx].posture = 'probe';
          } else {
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'probe' });
          }
          attackPostureCount++;
          feintCount++;
        }
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
  // Build settlementsByMun from political_controllers + sidToMun for consolidation scoring
  const settlementsByMunForConsolidation = buildSettlementsByMunFromControl(state, munLookup);

  // One brigade per target per faction per turn; duplicate allowed only when OG+operation and heavy resistance (plan: one-brigade-per-target).
  const chosenTargets = new Set<SettlementId>();

  for (const brigade of brigades) {
    const posture = pendingPosture.get(brigade.id) ?? brigade.posture ?? 'defend';
    if (posture !== 'attack' && posture !== 'probe' && posture !== 'consolidation') continue;
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
      let score = scoreTarget(state, sid, brigade, faction, edges, munLookup, settlementsByMunForConsolidation);

      // D2: Ethnic resistance penalty — penalize attacking high opposing-ethnicity settlements
      // (simplified: use defensive priority as proxy for ethnically aligned areas the enemy controls)
      if (munLookup) {
        const targetMun = munLookup.get(sid);
        const pc = state.political_controllers ?? {};
        const defenderFaction = pc[sid] as FactionId | null;
        if (defenderFaction && targetMun && isDefensivePriority(targetMun, defenderFaction)) {
          const isStrategicOverride = isPartOfOGOperationToward(state, brigade.id, sid)
            || isCorridorMunicipality(targetMun, faction)
            || isOffensiveObjective(targetMun, faction);
          if (!isStrategicOverride) {
            score += ETHNIC_RESISTANCE_PENALTY;
          }
        }
      }

      scoredTargets.push({ sid, score });
    }

    // Sort by score descending, then by settlement ID for deterministic tie-breaking
    scoredTargets.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return strictCompare(a.sid, b.sid);
    });

    // D1: Casualty-aversion — filter targets where cost is too high
    const viableTargets: Array<{ sid: SettlementId; score: number }> = [];
    for (const t of scoredTargets) {
      const estimate = estimateAttackCost(state, brigade, t.sid, edges, null, munLookup ?? new Map());
      const isStrategicTarget = munLookup && (
        isCorridorMunicipality(munLookup.get(t.sid), faction) ||
        isOffensiveObjective(munLookup.get(t.sid), faction) ||
        isPartOfOGOperationToward(state, brigade.id, t.sid)
      );

      const lossThreshold = isStrategicTarget ? STRATEGIC_LOSS_ACCEPTANCE : CASUALTY_AVERSION_THRESHOLD;
      const winThreshold = isStrategicTarget ? 0.3 : MIN_WIN_PROBABILITY;

      // Undefended settlements (garrison 0) are always viable
      const garrison = getSettlementGarrison(state, t.sid, edges);
      if (garrison === 0 || (estimate.expected_loss_fraction <= lossThreshold || estimate.win_probability >= winThreshold)) {
        viableTargets.push(t);
      }
    }

    // Fall back to all targets if casualty-aversion filters everything
    const candidateTargets = viableTargets.length > 0 ? viableTargets : scoredTargets;
    const preferred = candidateTargets[0]?.sid;
    if (preferred == null) continue;

    let assigned: SettlementId | null = null;
    if (!chosenTargets.has(preferred)) {
      assigned = preferred;
    } else if (isPartOfOGOperationToward(state, brigade.id, preferred) && hasHeavyResistance(state, preferred, edges)) {
      assigned = preferred;
    } else {
      for (const t of candidateTargets) {
        if (!chosenTargets.has(t.sid)) {
          assigned = t.sid;
          break;
        }
      }
    }
    if (assigned != null) {
      result.attack_orders[brigade.id] = assigned;
      chosenTargets.add(assigned);
    }
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
