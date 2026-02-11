/**
 * Phase C Step 4: Early war control change system (Phase_I_Specification_v0_4_0.md §4.3).
 * Control flips only via Phase I mechanisms, only after war_start_turn.
 * Control changes do not grant authority (Engine Invariants §3, §9).
 */

import type { GameState, FactionId, MunicipalityId, SettlementId } from '../../state/game_state.js';
import type { SettlementRecord } from '../../map/settlements.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { strictCompare } from '../../state/validateGameState.js';
import { isLargeSettlementMun } from '../../state/formation_constants.js';
import { getFactionCapabilityModifier } from '../../state/capability_progression.js';
import { areRbihHrhbAllied } from './alliance_update.js';
import { computeAlliedDefense, isMixedMunicipality } from './mixed_municipality.js';
import { applyWaveFlip, processHoldoutCleanup } from './settlement_control.js';
import type { SettlementFlipEvent } from './settlement_control.js';

/** Doctrine key for attacker effectiveness in flip formula (deterministic per role). All factions use ATTACK. */
const ATTACKER_DOCTRINE = 'ATTACK';

/** Doctrine key for defender effectiveness. RS uses STATIC_DEFENSE; RBiH/HRHB use DEFEND. */
function getDefenderDoctrine(factionId: FactionId): string {
  return factionId === 'RS' ? 'STATIC_DEFENSE' : 'DEFEND';
}

/** Phase I §4.3.3: Flip when Current_Stability + Defensive_Militia < 50 + (Attacking_Militia × 1.50). */
const FLIP_THRESHOLD_BASE = 50;
const FLIP_ATTACKER_FACTOR = 1.5;
/** B4: Coercion pressure reduces threshold (max reduction per mun). */
const COERCION_THRESHOLD_REDUCTION_MAX = 15;

/** Phase I §4.3.5: Base consolidation duration (turns). */
const CONSOLIDATION_BASE_TURNS = 4;

/** Phase I §4.3.4: Post-flip stability lockdown. */
const POST_FLIP_STABILITY = 100;

/** Phase I §4.3.4: Militia strength after flip for new controller / prior controller. */
const POST_FLIP_CONTROLLER_STRENGTH = 100;
const POST_FLIP_LOST_STRENGTH = 0;

/** Phase I §4.3.1: Controlling faction militia below this makes municipality flip-eligible. */
// Increased from 40 to 5000 to allow flips even when defended by significant forces (brigade size).
const FLIP_ELIGIBLE_MILITIA_THRESHOLD = 5000;

/** Phase H2.2: Harness-only control event (one per settlement flip). Not saved into GameState (Engine Invariants §13.1). */
export interface ControlEvent {
  turn: number;
  settlement_id: string;
  from: FactionId | null;
  to: FactionId | null;
  mechanism: 'phase_i_control_flip';
  mun_id: string | null;
}

export interface ControlFlipReport {
  flips: Array<{ mun_id: MunicipalityId; from_faction: FactionId | null; to_faction: FactionId }>;
  municipalities_evaluated: number;
  /** Phase H2.2: settlement-level events emitted at application site (for control_events.jsonl). */
  control_events: ControlEvent[];
  /** Settlement-level wave/holdout events from settlement_control.ts. */
  settlement_events?: SettlementFlipEvent[];
}

export interface ControlFlipInput {
  state: GameState;
  turn: number;
  /** Optional: settlements and edges to derive mun->sid and mun adjacency. If absent, no political_controllers updates. */
  settlements?: Map<string, SettlementRecord>;
  edges?: EdgeRecord[];
  /** Optional: raw settlement data with ethnicity for settlement-level control. */
  settlementDataRaw?: Array<{ sid: string; ethnicity?: { composition?: Record<string, number> } }>;
}

/** Brigade offensive amplification factor (brigades amplify militia in Phase I). */
const BRIGADE_ATTACK_AMPLIFIER = 0.5;

/**
 * Build municipality id -> settlement ids from graph. Uses mun1990_id ?? mun_code as MunicipalityId.
 */
function buildSettlementsByMun(settlements: Map<string, SettlementRecord>): Map<MunicipalityId, SettlementId[]> {
  const byMun = new Map<MunicipalityId, SettlementId[]>();
  for (const [sid, rec] of settlements.entries()) {
    const munId = (rec.mun1990_id ?? rec.mun_code) as MunicipalityId;
    const list = byMun.get(munId) ?? [];
    list.push(sid);
    byMun.set(munId, list);
  }
  for (const list of byMun.values()) {
    list.sort(strictCompare);
  }
  return byMun;
}

/**
 * Build municipality adjacency: mun A adjacent to B if some settlement in A is adjacent to some in B.
 */
function buildMunAdjacency(
  settlements: Map<string, SettlementRecord>,
  edges: EdgeRecord[]
): Map<MunicipalityId, Set<MunicipalityId>> {
  const sidToMun = new Map<string, MunicipalityId>();
  for (const [sid, rec] of settlements.entries()) {
    sidToMun.set(sid, (rec.mun1990_id ?? rec.mun_code) as MunicipalityId);
  }
  const adj = new Map<MunicipalityId, Set<MunicipalityId>>();
  for (const edge of edges) {
    const munA = sidToMun.get(edge.a);
    const munB = sidToMun.get(edge.b);
    if (!munA || !munB || munA === munB) continue;
    let setA = adj.get(munA);
    if (!setA) {
      setA = new Set();
      adj.set(munA, setA);
    }
    setA.add(munB);
    let setB = adj.get(munB);
    if (!setB) {
      setB = new Set();
      adj.set(munB, setB);
    }
    setB.add(munA);
  }
  return adj;
}

/** Derive current controller of a municipality from political_controllers (majority of settlements in mun). */
function getMunicipalityController(
  state: GameState,
  sids: SettlementId[]
): FactionId | null {
  const counts: Record<string, number> = {};
  for (const sid of sids) {
    const c = state.political_controllers?.[sid] ?? null;
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

/** War is active if at least one faction has declared (Phase I §4.3.1). */
function isWarActive(state: GameState): boolean {
  return (state.factions ?? []).some((f) => f.declared === true);
}

/** Is municipality in consolidation period? (Phase I §4.3.1, §4.3.5). */
function inConsolidation(state: GameState, munId: MunicipalityId, turn: number): boolean {
  const until = state.phase_i_consolidation_until?.[munId];
  return typeof until === 'number' && turn < until;
}

/** Is mun A adjacent to a municipality controlled by faction (hostile to currentController)? */
function hasAdjacentHostile(
  munId: MunicipalityId,
  currentController: FactionId | null,
  munAdjacency: Map<MunicipalityId, Set<MunicipalityId>>,
  state: GameState,
  settlementsByMun: Map<MunicipalityId, SettlementId[]>
): boolean {
  const neighbors = munAdjacency.get(munId);
  if (!neighbors) return false;
  // Dynamic alliance check: use phase_i_alliance_rbih_hrhb threshold (Phase I §4.8)
  const earliestTurn = state.meta.rbih_hrhb_war_earliest_turn ?? 26;
  const beforeEarliestWar = state.meta.turn < earliestTurn;
  const rbihHrhbAllied = beforeEarliestWar || areRbihHrhbAllied(state);
  // If ceasefire active, RBiH–HRHB flips are frozen
  const ceasefireActive = state.rbih_hrhb_state?.ceasefire_active === true;
  for (const neighborMun of neighbors) {
    const sids = settlementsByMun.get(neighborMun);
    if (!sids?.length) continue;
    const neighborController = getMunicipalityController(state, sids);
    if (neighborController !== null && neighborController !== currentController) {
      // Dynamic alliance: RBiH and HRHB skip when allied or ceasefire active (or before earliest war week)
      if ((currentController === 'RBiH' && neighborController === 'HRHB') ||
        (currentController === 'HRHB' && neighborController === 'RBiH')) {
        if (rbihHrhbAllied || ceasefireActive) continue;
      }
      return true;
    }
  }
  return false;
}

/**
 * Formation strength in a municipality for a faction (sum of personnel of formations with tag mun:munId).
 * Used for formation-aware Phase I flip (JNA/early RS historical fidelity: RS gains from day one where VRS brigades sit).
 * Deterministic: formations iterated in sorted id order.
 */
function getFormationStrengthInMun(state: GameState, munId: MunicipalityId, faction: FactionId): number {
  const formations = state.formations;
  if (!formations || typeof formations !== 'object') return 0;
  const ids = (Object.keys(formations) as import('../../state/game_state.js').FormationId[]).sort(strictCompare);
  let sum = 0;
  const tag = `mun:${munId}`;
  for (const id of ids) {
    const f = formations[id];
    if (!f || f.faction !== faction || !Array.isArray(f.tags) || !f.tags.includes(tag)) continue;
    sum += typeof f.personnel === 'number' && f.personnel >= 0 ? f.personnel : 1000;
  }
  return sum;
}

/**
 * Get attacking brigade strength from adjacent municipalities for a given faction.
 * Brigades in adjacent muns project offensive pressure into the target mun.
 */
function getAdjacentBrigadeAttackStrength(
  munId: MunicipalityId,
  attackerFaction: FactionId,
  munAdjacency: Map<MunicipalityId, Set<MunicipalityId>>,
  state: GameState,
  settlementsByMun: Map<MunicipalityId, SettlementId[]>
): number {
  const neighbors = munAdjacency.get(munId);
  if (!neighbors) return 0;
  let total = 0;
  for (const neighborMun of neighbors) {
    const sids = settlementsByMun.get(neighborMun);
    if (!sids?.length) continue;
    const neighborController = getMunicipalityController(state, sids);
    if (neighborController !== attackerFaction) continue;
    total += getFormationStrengthInMun(state, neighborMun, attackerFaction);
  }
  return total;
}

/** Get strongest hostile militia + formation strength in adjacent municipalities (attacker). */
function getStrongestAdjacentAttacker(
  munId: MunicipalityId,
  currentController: FactionId | null,
  munAdjacency: Map<MunicipalityId, Set<MunicipalityId>>,
  state: GameState,
  settlementsByMun: Map<MunicipalityId, SettlementId[]>
): { faction: FactionId; strength: number } | null {
  const neighbors = munAdjacency.get(munId);
  if (!neighbors) return null;
  let best: { faction: FactionId; strength: number } | null = null;
  const strengthByMun = state.phase_i_militia_strength ?? {};
  // Dynamic alliance check (Phase I §4.8); before earliest war turn treat RBiH–HRHB as allied (historical fidelity).
  const earliestTurn = state.meta.rbih_hrhb_war_earliest_turn ?? 26;
  const beforeEarliestWar = state.meta.turn < earliestTurn;
  const rbihHrhbAllied = beforeEarliestWar || areRbihHrhbAllied(state);
  const ceasefireActive = state.rbih_hrhb_state?.ceasefire_active === true;
  for (const neighborMun of neighbors) {
    const sids = settlementsByMun.get(neighborMun);
    if (!sids?.length) continue;
    const neighborController = getMunicipalityController(state, sids);
    if (neighborController === null || neighborController === currentController) continue;

    // Dynamic alliance: RBiH and HRHB skip when allied or ceasefire active (or before earliest war week)
    if ((currentController === 'RBiH' && neighborController === 'HRHB') ||
      (currentController === 'HRHB' && neighborController === 'RBiH')) {
      if (rbihHrhbAllied || ceasefireActive) continue;
    }

    const byFaction = strengthByMun[neighborMun] ?? {};
    const militiaStr = byFaction[neighborController] ?? 0;
    const formationStr = getFormationStrengthInMun(state, neighborMun, neighborController);
    const str = militiaStr + formationStr;
    if (best === null || str > best.strength) {
      best = { faction: neighborController, strength: str };
    }
  }
  return best;
}

/** Current stability for mun (Phase I §4.3.2): base + militia defense bonus + control_status adjustment. */
function getCurrentStability(state: GameState, munId: MunicipalityId, controller: FactionId | null): number {
  const mun = state.municipalities?.[munId];
  const base = mun?.stability_score ?? 50;
  const status = mun?.control_status ?? 'CONTESTED';
  const controlStatusAdj = status === 'SECURE' ? 10 : status === 'HIGHLY_CONTESTED' ? -20 : 0;
  const strengthByMun = state.phase_i_militia_strength ?? {};
  const byFaction = strengthByMun[munId] ?? {};
  const militiaStrength = controller ? (byFaction[controller] ?? 0) : 0;
  const militiaDefenseBonus = militiaStrength * 0.15;
  return Math.max(0, Math.min(100, base + militiaDefenseBonus + controlStatusAdj));
}

/**
 * Apply control flip with settlement-level wave model.
 * Instead of flipping all settlements in bulk, uses demographic-based wave:
 * - Settlements with favorable demographics flip immediately
 * - Hostile-majority settlements become holdouts requiring cleanup
 * Does NOT update faction profile (authority) per Engine Invariants §3, §9.
 */
function applyFlip(
  state: GameState,
  munId: MunicipalityId,
  newController: FactionId,
  previousController: FactionId | null,
  turn: number,
  settlementsByMun: Map<MunicipalityId, SettlementId[]>,
  settlementData: Map<string, { ethnicity?: { composition?: Record<string, number> } }>
): SettlementFlipEvent[] {
  // Use settlement-level wave flip
  const waveResult = applyWaveFlip(
    state,
    munId,
    newController,
    previousController,
    settlementsByMun,
    settlementData,
    turn
  );

  // Consolidation and militia updates (same as before)
  if (!state.phase_i_consolidation_until) {
    (state as GameState & { phase_i_consolidation_until: Record<string, number> }).phase_i_consolidation_until = {};
  }
  state.phase_i_consolidation_until![munId] = turn + CONSOLIDATION_BASE_TURNS;
  const municipalities = state.municipalities ?? {};
  if (municipalities[munId]) {
    municipalities[munId].stability_score = POST_FLIP_STABILITY;
  }
  if (state.phase_i_militia_strength) {
    const byFaction = state.phase_i_militia_strength[munId] ?? {};
    const factionIds = (state.factions ?? []).map((f) => f.id).sort(strictCompare);
    for (const fid of factionIds) {
      byFaction[fid] = fid === newController ? POST_FLIP_CONTROLLER_STRENGTH : POST_FLIP_LOST_STRENGTH;
    }
    state.phase_i_militia_strength[munId] = byFaction;
  }

  return waveResult.events;
}

/**
 * Run Phase I control flip resolution (Phase I §4.3).
 * Only evaluates municipalities in state.municipalities. Requires war_start_turn (caller gates).
 * Does not modify faction authority (control/authority distinction preserved).
 */
export function runControlFlip(input: ControlFlipInput): ControlFlipReport {
  const { state, turn, settlements, edges, settlementDataRaw } = input;
  const report: ControlFlipReport = { flips: [], municipalities_evaluated: 0, control_events: [] };
  const allSettlementEvents: SettlementFlipEvent[] = [];

  const warStart = state.meta.war_start_turn;
  if (typeof warStart !== 'number' || turn < warStart) return report;
  if (!isWarActive(state)) return report;

  const municipalities = state.municipalities ?? {};
  const munIds = (Object.keys(municipalities) as MunicipalityId[]).slice().sort(strictCompare);

  let settlementsByMun: Map<MunicipalityId, SettlementId[]> | undefined;
  let munAdjacency: Map<MunicipalityId, Set<MunicipalityId>> | undefined;
  if (settlements && edges && settlements.size > 0) {
    settlementsByMun = buildSettlementsByMun(settlements);
    munAdjacency = buildMunAdjacency(settlements, edges);
  }

  // Build settlement ethnicity data map for wave flips
  const settlementData = new Map<string, { ethnicity?: { composition?: Record<string, number> } }>();
  if (settlementDataRaw) {
    for (const rec of settlementDataRaw) {
      settlementData.set(rec.sid, rec);
    }
  }

  /** Flip-eligible candidates: [munId, currentController, attacker faction, attacker strength, current stability, defensive militia]. */
  type Candidate = [MunicipalityId, FactionId | null, FactionId, number, number, number];
  const candidates: Candidate[] = [];

  for (const munId of munIds) {
    if (inConsolidation(state, munId, turn)) continue;
    const sids = settlementsByMun?.get(munId);
    const controller = sids ? getMunicipalityController(state, sids) : null;
    const strengthByMun = state.phase_i_militia_strength ?? {};
    const byFaction = strengthByMun[munId] ?? {};
    const defensiveMilitia = controller ? (byFaction[controller] ?? 0) : 0;
    if (defensiveMilitia >= FLIP_ELIGIBLE_MILITIA_THRESHOLD) continue;
    if (isLargeSettlementMun(munId) && defensiveMilitia === 0) continue;
    if (!munAdjacency || !settlementsByMun) continue;
    if (!hasAdjacentHostile(munId, controller, munAdjacency, state, settlementsByMun)) continue;
    const attacker = getStrongestAdjacentAttacker(munId, controller, munAdjacency, state, settlementsByMun);
    if (!attacker || attacker.strength <= 0) continue;
    const currentStability = getCurrentStability(state, munId, controller);
    // Phase I §4.8: Allied defense bonus when RS attacks a mixed municipality
    let effectiveDefense = (attacker.faction === 'RS' && controller !== null)
      ? computeAlliedDefense(state, munId, controller, defensiveMilitia)
      : defensiveMilitia;
    // Formation-aware defense: defender formations in this mun add to effectiveDefense
    if (controller !== null) {
      effectiveDefense += getFormationStrengthInMun(state, munId, controller);
    }
    // Brigade offensive amplification: attacking brigades in adjacent muns project pressure
    const attackingBrigadeStr = getAdjacentBrigadeAttackStrength(
      munId, attacker.faction, munAdjacency, state, settlementsByMun
    );
    const totalAttackerStrength = attacker.strength + attackingBrigadeStr * BRIGADE_ATTACK_AMPLIFIER;
    // Capability-weighted flip
    const attackerMod = getFactionCapabilityModifier(state, attacker.faction, ATTACKER_DOCTRINE);
    const scaledAttackerStrength = totalAttackerStrength * attackerMod;
    const defenderMod = controller !== null
      ? getFactionCapabilityModifier(state, controller, getDefenderDoctrine(controller))
      : 1;
    const scaledDefense = effectiveDefense * defenderMod;
    // B4: Coercion pressure reduces threshold
    const coercionPressure = Math.min(1, Math.max(0, state.coercion_pressure_by_municipality?.[munId] ?? 0));
    const coercionReduction = coercionPressure * COERCION_THRESHOLD_REDUCTION_MAX;
    const flipThreshold = FLIP_THRESHOLD_BASE - coercionReduction + scaledAttackerStrength * FLIP_ATTACKER_FACTOR;
    if (currentStability + scaledDefense >= flipThreshold) continue;
    candidates.push([munId, controller, attacker.faction, totalAttackerStrength, currentStability, defensiveMilitia]);
  }

  report.municipalities_evaluated = munIds.length;

  // Phase I §9.2: Flip resolution order — Stability ASC, Municipality_ID ASC
  candidates.sort((a, b) => {
    const stabilityA = a[4];
    const stabilityB = b[4];
    if (stabilityA !== stabilityB) return stabilityA < stabilityB ? -1 : 1;
    return strictCompare(a[0], b[0]);
  });

  for (const [munId, fromFaction, toFaction] of candidates) {
    if (!settlementsByMun) continue;
    // Settlement-level wave flip (replaces bulk mun flip)
    const waveEvents = applyFlip(
      state, munId, toFaction, fromFaction, turn,
      settlementsByMun, settlementData
    );
    report.flips.push({ mun_id: munId, from_faction: fromFaction, to_faction: toFaction });
    allSettlementEvents.push(...waveEvents);
    // Also emit legacy control events for backward compat
    for (const evt of waveEvents) {
      if (evt.mechanism === 'wave_flip') {
        report.control_events.push({
          turn,
          settlement_id: evt.settlement_id,
          from: fromFaction,
          to: toFaction,
          mechanism: 'phase_i_control_flip',
          mun_id: munId
        });
      }
    }
  }

  // Holdout cleanup phase: process existing holdouts each turn
  if (settlements && edges) {
    const holdoutEvents = processHoldoutCleanup(state, turn, edges, settlements);
    allSettlementEvents.push(...holdoutEvents);
    for (const evt of holdoutEvents) {
      report.control_events.push({
        turn,
        settlement_id: evt.settlement_id,
        from: evt.from,
        to: evt.to,
        mechanism: 'phase_i_control_flip',
        mun_id: evt.mun_id
      });
    }
  }

  report.settlement_events = allSettlementEvents;
  return report;
}
