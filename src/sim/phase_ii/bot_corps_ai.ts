/**
 * Bot AI for corps-level decisions: stance selection, named operations,
 * operational group activation, and corridor breach detection.
 *
 * Sits above bot_brigade_ai.ts in the decision hierarchy.
 * Corps stance flows down to modulate brigade posture decisions.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */

import type {
  GameState,
  FactionId,
  FormationId,
  FormationState,
  SettlementId,
  CorpsStance,
  CorpsOperation,
  CorpsCommandState,
  OGActivationOrder
} from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { strictCompare } from '../../state/validateGameState.js';
import { buildAdjacencyFromEdges } from './phase_ii_adjacency.js';
import { getBrigadeAoRSettlements } from './brigade_aor.js';
import {
  FACTION_STRATEGIES,
  isCorridorMunicipality,
  isOffensiveObjective,
  getActiveDoctrinePhase,
  getActiveStandingOrder
} from './bot_strategy.js';
import { MAX_BRIGADE_PERSONNEL } from '../../state/formation_constants.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Sector threat ratio above which corps goes defensive. */
const THREAT_DEFENSIVE_THRESHOLD = 1.5;

/** Sector threat ratio below which corps can go offensive (if healthy). */
const THREAT_OFFENSIVE_THRESHOLD = 0.7;

/** Average cohesion below which corps must reorganize. */
const COHESION_REORGANIZE_THRESHOLD = 25;

/** Average personnel fraction below which corps must reorganize. */
const PERSONNEL_REORGANIZE_THRESHOLD = 0.5;

/** Personnel fraction above which corps is considered healthy for offensive. */
const PERSONNEL_HEALTHY_THRESHOLD = 0.7;

/** Cohesion above which corps is considered healthy for offensive. */
const COHESION_HEALTHY_THRESHOLD = 50;

/** Minimum healthy brigades to launch a named operation. */
const MIN_BRIGADES_FOR_OPERATION = 3;

/** Corps exhaustion above which no new operations can be launched. */
const MAX_EXHAUSTION_FOR_OPERATION = 30;

/** Named operation phase durations (turns). */
const PLANNING_DURATION = 2;
const EXECUTION_MAX_DURATION = 6;
const RECOVERY_DURATION = 3;

/** OG minimum donor personnel residual after contribution. */
const OG_MIN_DONOR_RESIDUAL = 400;

/** OG maximum personnel contribution per donor. */
const OG_MAX_CONTRIBUTION_PER_DONOR = 500;

/** OG default duration (turns). */
const OG_DEFAULT_DURATION = 5;

/** Corridor breach: max enemy settlements in a narrow strip to attempt breach. */
const CORRIDOR_BREACH_MAX_STRIP_WIDTH = 5;

/** Operation progress: target capture threshold to consider success. */
const PROGRESS_SUCCESS_THRESHOLD = 0.5;

/** Operation progress: failure threshold after 2 turns of execution. */
const PROGRESS_FAILURE_THRESHOLD = 0.2;

/** Brigade loss threshold to pull from operation. */
const BRIGADE_LOSS_THRESHOLD = 0.3;

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Get all active corps for a faction, sorted by ID. */
function getFactionCorps(state: GameState, faction: FactionId): FormationState[] {
  const formations = state.formations ?? {};
  const result: FormationState[] = [];
  for (const id of Object.keys(formations).sort(strictCompare)) {
    const f = formations[id];
    if (!f || f.faction !== faction || f.status !== 'active') continue;
    if (f.kind !== 'corps') continue;
    result.push(f);
  }
  return result;
}

/** Get active brigades subordinate to a given corps. */
function getCorpsSubordinates(state: GameState, corpsId: FormationId): FormationState[] {
  const formations = state.formations ?? {};
  const result: FormationState[] = [];
  for (const id of Object.keys(formations).sort(strictCompare)) {
    const f = formations[id];
    if (!f || f.status !== 'active') continue;
    if ((f.kind ?? 'brigade') !== 'brigade') continue;
    if (f.corps_id !== corpsId) continue;
    result.push(f);
  }
  return result;
}

/** Compute average personnel fraction for a set of brigades. */
function averagePersonnelFraction(brigades: FormationState[]): number {
  if (brigades.length === 0) return 0;
  let sum = 0;
  for (const b of brigades) sum += (b.personnel ?? 0) / MAX_BRIGADE_PERSONNEL;
  return sum / brigades.length;
}

/** Compute average cohesion for a set of brigades. */
function averageCohesion(brigades: FormationState[]): number {
  if (brigades.length === 0) return 0;
  let sum = 0;
  for (const b of brigades) sum += b.cohesion ?? 60;
  return sum / brigades.length;
}

/** Count how many brigades are "healthy" (personnel > 70%, cohesion > 50). */
function countHealthyBrigades(brigades: FormationState[]): number {
  let count = 0;
  for (const b of brigades) {
    const persFrac = (b.personnel ?? 0) / MAX_BRIGADE_PERSONNEL;
    const coh = b.cohesion ?? 60;
    if (persFrac >= PERSONNEL_HEALTHY_THRESHOLD && coh >= COHESION_HEALTHY_THRESHOLD) count++;
  }
  return count;
}

/** Get the home municipality of a corps (from tags or home_mun). */
function getCorpsHomeMun(corps: FormationState): string | null {
  if (!corps.tags) return null;
  for (const tag of corps.tags) {
    if (tag.startsWith('mun:')) return tag.slice(4);
  }
  return null;
}

/** Compute a simple sector threat ratio for a corps' area based on front pressure. */
function computeSectorThreat(
  state: GameState,
  subordinates: FormationState[],
  edges: EdgeRecord[]
): number {
  const pc = state.political_controllers ?? {};
  const frontPressure = state.front_pressure ?? {};
  const brigadeAor = state.brigade_aor ?? {};

  let ourPressure = 0;
  let enemyPressure = 0;
  const corpsBrigadeIds = new Set(subordinates.map(b => b.id));
  const faction = subordinates[0]?.faction;
  if (!faction) return 1.0;

  // Check front edges where our brigades' settlements border enemy
  for (const e of edges) {
    const ctrlA = pc[e.a];
    const ctrlB = pc[e.b];
    if (!ctrlA || !ctrlB || ctrlA === ctrlB) continue;

    const eid = e.a < e.b ? `${e.a}:${e.b}` : `${e.b}:${e.a}`;
    const pressure = frontPressure[eid];
    if (!pressure) continue;

    // Check if either side belongs to one of our corps' brigades
    const aInCorps = brigadeAor[e.a] && corpsBrigadeIds.has(brigadeAor[e.a]!);
    const bInCorps = brigadeAor[e.b] && corpsBrigadeIds.has(brigadeAor[e.b]!);
    if (!aInCorps && !bInCorps) continue;

    // Accumulate pressure from our side vs enemy
    const ourSideIsA = ctrlA === faction;
    if (ourSideIsA) {
      ourPressure += Math.abs(Math.max(0, pressure.value));
      enemyPressure += Math.abs(Math.max(0, -pressure.value));
    } else {
      ourPressure += Math.abs(Math.max(0, -pressure.value));
      enemyPressure += Math.abs(Math.max(0, pressure.value));
    }
  }

  if (ourPressure <= 0) return enemyPressure > 0 ? 2.0 : 1.0;
  return enemyPressure / ourPressure;
}

// ═══════════════════════════════════════════════════════════════════════════
// Corps Stance Selection (B1)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate corps stance orders for a faction.
 * Writes stance directly to state.corps_command.
 * Deterministic: sorted corps iteration, no randomness.
 */
export function generateCorpsStanceOrders(
  state: GameState,
  faction: FactionId,
  edges: EdgeRecord[],
  sidToMun: Map<SettlementId, string>
): void {
  const corpsCommand = state.corps_command;
  if (!corpsCommand) return;

  const corpsList = getFactionCorps(state, faction);
  const turn = state.meta?.turn ?? 0;
  const strategy = FACTION_STRATEGIES[faction];

  for (const corps of corpsList) {
    const cmd = corpsCommand[corps.id];
    if (!cmd) continue;

    const subordinates = getCorpsSubordinates(state, corps.id);
    if (subordinates.length === 0) continue;

    const avgPers = averagePersonnelFraction(subordinates);
    const avgCoh = averageCohesion(subordinates);
    const sectorThreat = computeSectorThreat(state, subordinates, edges);
    const corpsHomeMun = getCorpsHomeMun(corps);

    let stance: CorpsStance = 'balanced';

    // Decision matrix
    if (avgCoh < COHESION_REORGANIZE_THRESHOLD || avgPers < PERSONNEL_REORGANIZE_THRESHOLD) {
      stance = 'reorganize';
    } else if (sectorThreat > THREAT_DEFENSIVE_THRESHOLD) {
      stance = 'defensive';
    } else if (
      sectorThreat < THREAT_OFFENSIVE_THRESHOLD &&
      avgCoh >= COHESION_HEALTHY_THRESHOLD &&
      avgPers >= PERSONNEL_HEALTHY_THRESHOLD
    ) {
      stance = 'offensive';
    }

    // --- Doctrine phase influence (D3) ---
    const doctrinePhase = getActiveDoctrinePhase(faction, turn);
    if (doctrinePhase && stance === 'balanced') {
      // Doctrine provides a default bias when the situation is ambiguous
      stance = doctrinePhase.default_corps_stance;
    }

    // --- Faction-specific overrides (E1-E3 personality) ---

    if (faction === 'RS') {
      // E1: RS corridor corps: never below balanced (corridor is existential)
      if (isCorridorMunicipality(corpsHomeMun, 'RS') && (stance === 'reorganize' || stance === 'defensive')) {
        stance = 'balanced';
      }
      // E1: RS early-war aggression: prefer offensive in weeks 0-20
      if (turn < 20 && stance === 'balanced' && avgPers >= 0.6 && avgCoh >= 40) {
        stance = 'offensive';
      }
      // E1: Sarajevo siege corps: maintain pressure but never assault core
      const SARAJEVO_SIEGE_MUNS = new Set(['pale', 'sokolac', 'trnovo']);
      if (corpsHomeMun && SARAJEVO_SIEGE_MUNS.has(corpsHomeMun)) {
        if (stance === 'reorganize') stance = 'balanced'; // Maintain siege pressure
      }
    } else if (faction === 'RBiH') {
      // E2: RBiH Sarajevo corps: always defensive
      const SARAJEVO_MUNS = new Set(['centar_sarajevo', 'novi_grad_sarajevo', 'novo_sarajevo', 'stari_grad_sarajevo']);
      if (corpsHomeMun && SARAJEVO_MUNS.has(corpsHomeMun)) {
        stance = 'defensive';
      }
      // E2: RBiH survival mode weeks 0-12: no offensive
      if (turn < 12 && stance === 'offensive') {
        stance = 'balanced';
      }
      // E2: RBiH late-war counteroffensive eligibility (week 40+)
      if (turn >= 40 && stance === 'balanced' && avgPers >= 0.6 && avgCoh >= 50) {
        // Check if faction controls enough territory for counteroffensive
        const pc = state.political_controllers ?? {};
        const totalSids = Object.keys(pc).length;
        const ownedSids = Object.values(pc).filter(f => f === 'RBiH').length;
        if (totalSids > 0 && ownedSids / totalSids >= 0.25) {
          stance = 'offensive';
        }
      }
    } else if (faction === 'HRHB') {
      // E3: HRHB Herzegovina corps: defensive (never give up heartland)
      const HERZEGOVINA_MUNS = new Set(strategy.corridor_municipalities);
      if (corpsHomeMun && HERZEGOVINA_MUNS.has(corpsHomeMun)) {
        if (stance === 'offensive' || stance === 'balanced') {
          stance = 'defensive';
        }
      }
      // E3: Alliance-sensitive — check RBiH-HRHB war state
      const rhs = state.rbih_hrhb_state;
      if (rhs && !rhs.washington_signed) {
        const allianceValue = state.phase_i_alliance_rbih_hrhb ?? 1.0;
        // Central Bosnia corps goes offensive when at war with RBiH
        if (allianceValue < 0.2 && !HERZEGOVINA_MUNS.has(corpsHomeMun ?? '')) {
          if (avgPers >= 0.5 && avgCoh >= 40) stance = 'offensive';
        }
      }
    }

    cmd.stance = stance;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Named Operations (B3)
// ═══════════════════════════════════════════════════════════════════════════

/** Faction-specific named operation catalog. */
interface OperationTemplate {
  name: string;
  type: CorpsOperation['type'];
  target_municipalities: string[];
}

function getOperationCatalog(faction: FactionId): OperationTemplate[] {
  switch (faction) {
    case 'RS': return [
      { name: 'Operation Corridor', type: 'sector_attack', target_municipalities: ['brcko', 'bosanski_samac', 'modrica', 'derventa'] },
      { name: 'Drina Sweep', type: 'general_offensive', target_municipalities: ['zvornik', 'bratunac', 'srebrenica', 'vlasenica'] },
      { name: 'Sarajevo Tightening', type: 'strategic_defense', target_municipalities: ['ilidza', 'hadzici', 'vogosca', 'ilijas'] },
    ];
    case 'RBiH': return [
      { name: 'Enclave Relief', type: 'sector_attack', target_municipalities: ['gorazde', 'srebrenica', 'zepa'] },
      { name: 'Sarajevo Breakout', type: 'general_offensive', target_municipalities: ['ilidza', 'hadzici', 'vogosca', 'ilijas'] },
      { name: 'Central Corridor', type: 'sector_attack', target_municipalities: ['zenica', 'travnik', 'kakanj', 'visoko'] },
    ];
    case 'HRHB': return [
      { name: 'Lasva Valley', type: 'sector_attack', target_municipalities: ['vitez', 'busovaca', 'kiseljak', 'novi_travnik'] },
      { name: 'Mostar Consolidation', type: 'sector_attack', target_municipalities: ['mostar', 'stolac', 'capljina'] },
      { name: 'Herzegovina Shield', type: 'strategic_defense', target_municipalities: ['siroki_brijeg', 'citluk', 'ljubuski', 'grude'] },
    ];
    default: return [];
  }
}

/**
 * Generate named operations for bot-controlled corps.
 * Only launches when: corps is offensive/balanced, no active op, enough healthy brigades.
 */
export function generateCorpsOperationOrders(
  state: GameState,
  faction: FactionId,
  edges: EdgeRecord[],
  sidToMun: Map<SettlementId, string>
): void {
  const corpsCommand = state.corps_command;
  if (!corpsCommand) return;

  const corpsList = getFactionCorps(state, faction);
  const turn = state.meta?.turn ?? 0;
  const pc = state.political_controllers ?? {};
  const catalog = getOperationCatalog(faction);

  for (const corps of corpsList) {
    const cmd = corpsCommand[corps.id];
    if (!cmd) continue;

    // Skip if already has an active operation
    if (cmd.active_operation) continue;

    // Must be offensive or balanced
    if (cmd.stance !== 'offensive' && cmd.stance !== 'balanced') continue;

    // Must have low exhaustion
    if (cmd.corps_exhaustion > MAX_EXHAUSTION_FOR_OPERATION) continue;

    const subordinates = getCorpsSubordinates(state, corps.id);
    const healthyCount = countHealthyBrigades(subordinates);
    if (healthyCount < MIN_BRIGADES_FOR_OPERATION) continue;

    // Find best matching operation from catalog
    let bestTemplate: OperationTemplate | null = null;
    let bestRelevance = 0;

    for (const template of catalog) {
      // Relevance: how many target municipalities are adjacent to our AoR but enemy-controlled?
      let relevance = 0;
      for (const mun of template.target_municipalities) {
        // Count enemy-held settlements in this municipality
        const sids = Object.keys(pc).filter(sid => {
          const m = sidToMun.get(sid);
          return m === mun && pc[sid] !== faction;
        });
        relevance += sids.length;
      }
      if (relevance > bestRelevance) {
        bestRelevance = relevance;
        bestTemplate = template;
      }
    }

    if (!bestTemplate || bestRelevance === 0) continue;

    // Collect target settlements
    const targetSettlements: SettlementId[] = [];
    for (const mun of bestTemplate.target_municipalities) {
      for (const sid of Object.keys(pc).sort(strictCompare)) {
        const m = sidToMun.get(sid);
        if (m === mun && pc[sid] !== faction) {
          targetSettlements.push(sid);
        }
      }
    }

    // Select participating brigades: top N healthy brigades by personnel
    const healthySorted = subordinates
      .filter(b => {
        const persFrac = (b.personnel ?? 0) / MAX_BRIGADE_PERSONNEL;
        const coh = b.cohesion ?? 60;
        return persFrac >= PERSONNEL_HEALTHY_THRESHOLD && coh >= COHESION_HEALTHY_THRESHOLD;
      })
      .sort((a, b) => {
        const pDiff = (b.personnel ?? 0) - (a.personnel ?? 0);
        if (pDiff !== 0) return pDiff;
        return strictCompare(a.id, b.id);
      })
      .slice(0, Math.min(5, healthyCount));

    const operation: CorpsOperation = {
      name: bestTemplate.name,
      type: bestTemplate.type,
      phase: 'planning',
      started_turn: turn,
      phase_started_turn: turn,
      target_settlements: targetSettlements,
      participating_brigades: healthySorted.map(b => b.id)
    };

    cmd.active_operation = operation;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Operation Progress Evaluation (C3)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate progress of active operations and advance/abort them.
 * Called each turn for active operations.
 */
export function evaluateOperationProgress(
  state: GameState,
  faction: FactionId
): void {
  const corpsCommand = state.corps_command;
  if (!corpsCommand) return;

  const corpsList = getFactionCorps(state, faction);
  const turn = state.meta?.turn ?? 0;
  const pc = state.political_controllers ?? {};
  const formations = state.formations ?? {};

  for (const corps of corpsList) {
    const cmd = corpsCommand[corps.id];
    if (!cmd?.active_operation) continue;
    const op = cmd.active_operation;

    const turnsInPhase = turn - op.phase_started_turn;

    if (op.phase === 'planning') {
      // Advance to execution after planning duration
      if (turnsInPhase >= PLANNING_DURATION) {
        op.phase = 'execution';
        op.phase_started_turn = turn;
      }
    } else if (op.phase === 'execution') {
      // Check progress
      const targets = op.target_settlements ?? [];
      if (targets.length > 0) {
        const captured = targets.filter(sid => pc[sid] === faction).length;
        const captureRate = captured / targets.length;

        // Abort if failing after 2 turns
        if (turnsInPhase >= 2 && captureRate < PROGRESS_FAILURE_THRESHOLD) {
          op.phase = 'recovery';
          op.phase_started_turn = turn;
          continue;
        }

        // Success or max duration reached
        if (captureRate >= PROGRESS_SUCCESS_THRESHOLD || turnsInPhase >= EXECUTION_MAX_DURATION) {
          op.phase = 'recovery';
          op.phase_started_turn = turn;
          continue;
        }
      } else if (turnsInPhase >= EXECUTION_MAX_DURATION) {
        op.phase = 'recovery';
        op.phase_started_turn = turn;
        continue;
      }

      // Replace heavily damaged brigades
      const updatedParticipants: FormationId[] = [];
      for (const brigId of op.participating_brigades) {
        const brig = formations[brigId];
        if (!brig) continue;
        const startPersonnel = MAX_BRIGADE_PERSONNEL; // approximate
        const currentPersonnel = brig.personnel ?? 0;
        const lossRate = 1 - (currentPersonnel / startPersonnel);
        if (lossRate > BRIGADE_LOSS_THRESHOLD) {
          // Try to find a replacement from the same corps
          const subordinates = getCorpsSubordinates(state, corps.id);
          const replacement = subordinates.find(s =>
            !op.participating_brigades.includes(s.id) &&
            (s.personnel ?? 0) / MAX_BRIGADE_PERSONNEL >= PERSONNEL_HEALTHY_THRESHOLD &&
            (s.cohesion ?? 60) >= COHESION_HEALTHY_THRESHOLD
          );
          if (replacement) {
            updatedParticipants.push(replacement.id);
            continue;
          }
        }
        updatedParticipants.push(brigId);
      }
      op.participating_brigades = updatedParticipants;
    } else if (op.phase === 'recovery') {
      // Clear operation after recovery duration
      if (turnsInPhase >= RECOVERY_DURATION) {
        cmd.active_operation = null;
        // Add exhaustion from the operation
        cmd.corps_exhaustion = Math.min(100, cmd.corps_exhaustion + 15);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Operational Group Activation (C1)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate OG activation orders for active operations in execution phase.
 * Appends to state.og_orders.
 */
export function generateOGActivationOrders(
  state: GameState,
  faction: FactionId,
  edges: EdgeRecord[]
): void {
  const corpsCommand = state.corps_command;
  if (!corpsCommand) return;

  const corpsList = getFactionCorps(state, faction);
  const formations = state.formations ?? {};

  if (!state.og_orders) state.og_orders = [];

  for (const corps of corpsList) {
    const cmd = corpsCommand[corps.id];
    if (!cmd?.active_operation) continue;
    const op = cmd.active_operation;

    // Only activate OGs during execution phase of offensive operations
    if (op.phase !== 'execution') continue;
    if (op.type !== 'sector_attack' && op.type !== 'general_offensive') continue;

    // Check if OG slot is available
    if (cmd.active_ogs.length >= cmd.og_slots) continue;

    // Select donor brigades from operation participants
    const donors: OGActivationOrder['donors'] = [];
    const participantsSorted = [...op.participating_brigades]
      .map(bid => formations[bid])
      .filter((b): b is FormationState => b != null && b.status === 'active')
      .sort((a, b) => {
        const pDiff = (b.personnel ?? 0) - (a.personnel ?? 0);
        if (pDiff !== 0) return pDiff;
        return strictCompare(a.id, b.id);
      });

    // HRHB: lower threshold — only need 2 donors (small force compensation)
    const minDonors = faction === 'HRHB' ? 2 : 3;
    const maxDonors = 4;

    for (const brigade of participantsSorted) {
      if (donors.length >= maxDonors) break;
      const personnel = brigade.personnel ?? 0;
      const residual = personnel - OG_MIN_DONOR_RESIDUAL;
      if (residual <= 0) continue;
      const contribution = Math.min(OG_MAX_CONTRIBUTION_PER_DONOR, residual);
      if (contribution < 100) continue;
      donors.push({
        brigade_id: brigade.id,
        personnel_contribution: contribution
      });
    }

    if (donors.length < minDonors) continue;

    const ogOrder: OGActivationOrder = {
      corps_id: corps.id,
      donors,
      focus_settlements: op.target_settlements ?? [],
      posture: 'attack',
      max_duration: OG_DEFAULT_DURATION
    };

    state.og_orders.push(ogOrder);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Corridor Breach Detection (C2)
// ═══════════════════════════════════════════════════════════════════════════

export interface CorridorTarget {
  breachSettlements: SettlementId[];
  friendlyClusterA: SettlementId[];
  friendlyClusterB: SettlementId[];
  narrowestWidth: number;
}

/**
 * Detect corridor breach opportunities: narrow enemy-held strips between
 * two friendly clusters.
 *
 * Returns sorted list of corridor targets for a faction.
 */
export function detectCorridorBreachOpportunities(
  state: GameState,
  faction: FactionId,
  edges: EdgeRecord[],
  sidToMun: Map<SettlementId, string>
): CorridorTarget[] {
  const pc = state.political_controllers ?? {};
  const adj = buildAdjacencyFromEdges(edges);
  const strategy = FACTION_STRATEGIES[faction];

  // Focus on corridor municipalities for this faction
  const corridorMuns = new Set(strategy.corridor_municipalities);
  if (corridorMuns.size === 0) return [];

  // Find enemy-held settlements in corridor municipalities
  const enemyCorridorSids: SettlementId[] = [];
  for (const sid of Object.keys(pc).sort(strictCompare)) {
    const mun = sidToMun.get(sid);
    if (!mun || !corridorMuns.has(mun)) continue;
    if (pc[sid] !== faction) {
      enemyCorridorSids.push(sid);
    }
  }

  if (enemyCorridorSids.length === 0 || enemyCorridorSids.length > CORRIDOR_BREACH_MAX_STRIP_WIDTH * 3) {
    return []; // No corridor threat or too wide to breach
  }

  // Simple check: if there are enemy settlements that separate two groups of friendly settlements
  // Find friendly settlements adjacent to enemy corridor settlements
  const friendlyBorderSids = new Set<SettlementId>();
  for (const enemySid of enemyCorridorSids) {
    const neighbors = adj.get(enemySid);
    if (!neighbors) continue;
    for (const nSid of neighbors) {
      if (pc[nSid] === faction) {
        friendlyBorderSids.add(nSid);
      }
    }
  }

  if (friendlyBorderSids.size < 2) return [];

  // If we have enemy corridor settlements <= CORRIDOR_BREACH_MAX_STRIP_WIDTH,
  // this is a potential breach point
  if (enemyCorridorSids.length <= CORRIDOR_BREACH_MAX_STRIP_WIDTH) {
    const target: CorridorTarget = {
      breachSettlements: enemyCorridorSids,
      friendlyClusterA: [...friendlyBorderSids].sort(strictCompare).slice(0, Math.ceil(friendlyBorderSids.size / 2)),
      friendlyClusterB: [...friendlyBorderSids].sort(strictCompare).slice(Math.ceil(friendlyBorderSids.size / 2)),
      narrowestWidth: enemyCorridorSids.length
    };
    return [target];
  }

  return [];
}

/**
 * If a corridor breach opportunity exists and no operation is active,
 * launch a corridor breach operation for the nearest corps.
 */
export function attemptCorridorBreach(
  state: GameState,
  faction: FactionId,
  edges: EdgeRecord[],
  sidToMun: Map<SettlementId, string>
): void {
  const corpsCommand = state.corps_command;
  if (!corpsCommand) return;

  const targets = detectCorridorBreachOpportunities(state, faction, edges, sidToMun);
  if (targets.length === 0) return;

  const corpsList = getFactionCorps(state, faction);
  const turn = state.meta?.turn ?? 0;

  for (const target of targets) {
    // Find a corps without active operation that can reach the breach
    for (const corps of corpsList) {
      const cmd = corpsCommand[corps.id];
      if (!cmd || cmd.active_operation) continue;
      if (cmd.stance === 'reorganize') continue;
      if (cmd.corps_exhaustion > MAX_EXHAUSTION_FOR_OPERATION) continue;

      const subordinates = getCorpsSubordinates(state, corps.id);
      const healthyCount = countHealthyBrigades(subordinates);
      if (healthyCount < 2) continue; // Lower threshold for corridor ops

      // Select participating brigades
      const participants = subordinates
        .filter(b => (b.personnel ?? 0) / MAX_BRIGADE_PERSONNEL >= 0.6 && (b.cohesion ?? 60) >= 40)
        .sort((a, b) => {
          const pDiff = (b.personnel ?? 0) - (a.personnel ?? 0);
          if (pDiff !== 0) return pDiff;
          return strictCompare(a.id, b.id);
        })
        .slice(0, 4);

      if (participants.length < 2) continue;

      const operation: CorpsOperation = {
        name: `Corridor Breach (${faction})`,
        type: 'sector_attack',
        phase: 'planning',
        started_turn: turn,
        phase_started_turn: turn,
        target_settlements: target.breachSettlements,
        participating_brigades: participants.map(b => b.id)
      };

      cmd.active_operation = operation;
      // Force offensive stance for this corps during breach
      cmd.stance = 'offensive';
      return; // Only one breach operation at a time
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Army-Wide Standing Orders
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Set army stance based on the active standing order for this faction and turn.
 * Standing orders represent historical army-level strategic directives.
 * The army stance flows down through getEffectiveCorpsStance() in corps_command.ts
 * and getCorpsStance() in battle_resolution.ts, overriding corps-level decisions
 * when non-balanced.
 *
 * HRHB special case: the 'Lasva Offensive' standing order (weeks 12-26) only
 * activates general_offensive when actually at war with RBiH (alliance < 0.2).
 * Otherwise falls back to balanced.
 *
 * Deterministic: depends only on faction, turn, and alliance state.
 */
export function setArmyStandingOrder(
  state: GameState,
  faction: FactionId
): void {
  const turn = state.meta?.turn ?? 0;
  const order = getActiveStandingOrder(faction, turn);
  if (!order) return;

  let stance = order.army_stance;

  // HRHB: Lasva Offensive only applies when at war with RBiH
  if (faction === 'HRHB' && order.name === 'Lasva Offensive') {
    const allianceValue = state.phase_i_alliance_rbih_hrhb ?? 1.0;
    if (allianceValue >= 0.2) {
      stance = 'balanced'; // Not at war — no army-wide offensive
    }
  }

  if (!state.army_stance) state.army_stance = {};
  state.army_stance[faction] = stance;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run all corps-level AI decisions for a faction.
 * Call before generate-bot-brigade-orders in the pipeline.
 *
 * Order:
 * 0. Set army stance from historical standing orders
 * 1. Evaluate progress of existing operations (advance/abort)
 * 2. Set corps stances
 * 3. Launch new named operations
 * 4. Attempt corridor breach if opportunity exists
 * 5. Generate OG activation orders
 */
export function generateAllCorpsOrders(
  state: GameState,
  faction: FactionId,
  edges: EdgeRecord[],
  sidToMun: Map<SettlementId, string>
): void {
  // 0. Set army stance from standing orders
  setArmyStandingOrder(state, faction);

  // 1. Evaluate existing operations
  evaluateOperationProgress(state, faction);

  // 2. Corps stance selection
  generateCorpsStanceOrders(state, faction, edges, sidToMun);

  // 3. Launch new named operations
  generateCorpsOperationOrders(state, faction, edges, sidToMun);

  // 4. Attempt corridor breach
  attemptCorridorBreach(state, faction, edges, sidToMun);

  // 5. OG activation
  generateOGActivationOrders(state, faction, edges);
}
