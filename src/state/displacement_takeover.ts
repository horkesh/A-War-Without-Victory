import type {
  DisplacementCampState,
  DisplacementState,
  FactionId,
  GameState,
  HostileTakeoverTimerState,
  MunicipalityId
} from './game_state.js';
import type { DisplacementRoutingRecord } from './displacement.js';
import type { SettlementRecord } from '../map/settlements.js';
import { getEffectiveSettlementSide } from './control_effective.js';
import { LARGE_URBAN_MUN_IDS } from './large_urban_mun_data.js';
import {
  getFactionFleeAbroadFraction,
  DISPLACEMENT_KILLED_FRACTION
} from './displacement_loss_constants.js';
import {
  POSAVINA_MUN_IDS,
  CROAT_KRAJINA_SOURCE_MUN_IDS,
  EAST_OF_SARAJEVO_MUN_IDS,
  SARAJEVO_AREA_MUN_IDS,
  HERZEGOVINA_DEST_MUN_IDS,
  POSAVINA_CROAT_DEST_MUN_IDS
} from './displacement_routing_data.js';
import type { MunicipalityPopulation1991Map } from './population_share.js';
import { strictCompare } from './validateGameState.js';
import { militiaPoolKey } from './militia_pool_key.js';
import { getMunicipalityIdFromRecord, getOrInitDisplacementState, recordCivilianDisplacementCasualties } from './displacement_state_utils.js';

const TAKEOVER_DISPLACEMENT_DELAY_TURNS = 4;
const CAMP_REROUTE_DELAY_TURNS = 4;

/** Posavina Croats: most flee to Croatia (canon: displacement redesign 2026-02-17). */
const POSAVINA_CROAT_FLEE_ABROAD = 0.70;

// Enclave-overrun special case (historical high-lethality second displacement).
export const ENCLAVE_OVERRUN_KILL_FRACTION = 0.35;

const DISPLACEMENT_CAPACITY_FRACTION = 1.5;
const REINFORCEMENT_RATE = 0.05;
const DISPLACED_CONTRIBUTION_CAP = 2000;
const RBIH_HRHB_ALLIED_THRESHOLD = 0.20;

const ENCLAVE_MUN_IDS = new Set<MunicipalityId>(['srebrenica', 'gorazde', 'zepa']);
const NORTHWEST_BOSNIA_MUN_IDS = new Set<MunicipalityId>([
  'prijedor',
  'sanski_most',
  'bosanski_novi',
  'novi_grad',
  'kljuc'
]);
const EAST_BOSNIA_MUN_IDS = new Set<MunicipalityId>([
  'zvornik',
  'bratunac',
  'srebrenica',
  'vlasenica',
  'rogatica',
  'visegrad',
  'foca',
  'gorazde'
]);

const FALLBACK_ROUTES_BY_FACTION: Record<string, MunicipalityId[]> = {
  RBiH: [
    'tuzla',
    'zenica',
    'travnik',
    'gorazde',
    'srebrenica',
    'centar_sarajevo',
    'novi_grad_sarajevo',
    'novo_sarajevo',
    'bihac'
  ],
  RS: ['banja_luka', 'bijeljina', 'doboj', 'prijedor', 'zvornik', 'brcko'],
  HRHB: ['mostar', 'livno', 'travnik', 'brcko']
};

export interface TakeoverBattleRecord {
  settlement_flipped: boolean;
  location: string;
  attacker_faction: FactionId;
  defender_faction: FactionId;
}

export interface PhaseIIBattleResolutionLike {
  battles: TakeoverBattleRecord[];
}

export interface PhaseIITakeoverDisplacementReport {
  timers_started: number;
  timers_matured: number;
  camps_created: number;
  camps_routed: number;
  displaced_total: number;
  killed_total: number;
  fled_abroad_total: number;
  routed_total: number;
  source_municipalities: MunicipalityId[];
  routing: DisplacementRoutingRecord[];
}

function isRbihHrhbPair(a: FactionId, b: FactionId): boolean {
  return (a === 'RBiH' && b === 'HRHB') || (a === 'HRHB' && b === 'RBiH');
}

function areFactionsAtWar(state: GameState, a: FactionId, b: FactionId): boolean {
  if (!a || !b || a === b) return false;
  if (!isRbihHrhbPair(a, b)) return true;
  const currentTurn = state.meta.turn;
  const earliestTurn =
    typeof state.meta.rbih_hrhb_war_earliest_turn === 'number'
      ? state.meta.rbih_hrhb_war_earliest_turn
      : Number.MAX_SAFE_INTEGER;
  if (currentTurn < earliestTurn) return false;
  const alliance = typeof state.phase_i_alliance_rbih_hrhb === 'number' ? state.phase_i_alliance_rbih_hrhb : 0;
  return alliance <= RBIH_HRHB_ALLIED_THRESHOLD;
}

function getFleeAbroadFraction(sourceMun: MunicipalityId, fromFaction: FactionId): number {
  if (fromFaction === 'HRHB' && POSAVINA_MUN_IDS.has(sourceMun)) return POSAVINA_CROAT_FLEE_ABROAD;
  return getFactionFleeAbroadFraction(fromFaction);
}

function getPopulationTotal(entry: { total: number; bosniak: number; serb: number; croat: number; other: number }): number {
  return Math.max(0, entry.total);
}

function getFactionAlignedPopulation(entry: { total: number; bosniak: number; serb: number; croat: number; other: number }, faction: FactionId): number {
  if (faction === 'RBiH') return Math.max(0, entry.bosniak + entry.other);
  if (faction === 'RS') return Math.max(0, entry.serb);
  if (faction === 'HRHB') return Math.max(0, entry.croat);
  return 0;
}

function getDynamicHostileShare(
  munId: MunicipalityId,
  fromFaction: FactionId,
  dispState: DisplacementState,
  population1991ByMun?: MunicipalityPopulation1991Map
): number {
  const fallback = 1;
  if (!population1991ByMun) return fallback;
  const entry = population1991ByMun[munId];
  if (!entry) return fallback;
  const baseTotal = getPopulationTotal(entry);
  if (baseTotal <= 0) return fallback;
  const baseFaction = getFactionAlignedPopulation(entry, fromFaction);
  const incomingByFaction = dispState.displaced_in_by_faction ?? {};
  const incomingTotal = Object.values(incomingByFaction)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0)
    .reduce((sum, v) => sum + v, 0);
  const incomingFaction = incomingByFaction[fromFaction] ?? 0;
  const adjustedTotal = Math.max(1, baseTotal + incomingTotal);
  const adjustedFaction = Math.max(0, baseFaction + incomingFaction);
  const share = adjustedFaction / adjustedTotal;
  if (!Number.isFinite(share)) return fallback;
  return Math.max(0, Math.min(1, share));
}

function isEnclaveOverrun(munId: MunicipalityId, fromFaction: FactionId, toFaction: FactionId): boolean {
  if (!ENCLAVE_MUN_IDS.has(munId)) return false;
  return fromFaction === 'RBiH' && toFaction !== 'RBiH';
}

function buildFriendlyMunicipalitiesByFaction(
  state: GameState,
  settlements: Map<string, SettlementRecord>
): Record<FactionId, Set<MunicipalityId>> {
  const out: Record<FactionId, Set<MunicipalityId>> = {
    RBiH: new Set<MunicipalityId>(),
    RS: new Set<MunicipalityId>(),
    HRHB: new Set<MunicipalityId>()
  };
  const sids = Array.from(settlements.keys()).sort(strictCompare);
  for (const sid of sids) {
    const side = getEffectiveSettlementSide(state, sid);
    if (!side || !out[side]) continue;
    const rec = settlements.get(sid);
    if (!rec) continue;
    out[side].add(getMunicipalityIdFromRecord(rec));
  }
  return out;
}

function orderedUnique(items: MunicipalityId[]): MunicipalityId[] {
  const out: MunicipalityId[] = [];
  const seen = new Set<MunicipalityId>();
  for (const id of items) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function getPrimaryRouteForSourceMun(sourceMun: MunicipalityId, faction: FactionId): MunicipalityId[] {
  if (faction === 'RBiH') {
    if (NORTHWEST_BOSNIA_MUN_IDS.has(sourceMun)) {
      return ['travnik', 'zenica', 'tuzla', 'gorazde'];
    }
    if (EAST_BOSNIA_MUN_IDS.has(sourceMun)) {
      return ['srebrenica', 'tuzla', 'gorazde', 'zenica', 'travnik'];
    }
  }
  if (faction === 'HRHB') {
    if (CROAT_KRAJINA_SOURCE_MUN_IDS.has(sourceMun)) {
      return [...HERZEGOVINA_DEST_MUN_IDS];
    }
    if (POSAVINA_MUN_IDS.has(sourceMun)) {
      return [...POSAVINA_CROAT_DEST_MUN_IDS];
    }
  }
  if (faction === 'RS') {
    if (SARAJEVO_AREA_MUN_IDS.has(sourceMun)) {
      return [...EAST_OF_SARAJEVO_MUN_IDS];
    }
  }
  return [];
}

function getRoutingOrder(sourceMun: MunicipalityId, faction: FactionId): MunicipalityId[] {
  const primary = getPrimaryRouteForSourceMun(sourceMun, faction);
  const fallback = FALLBACK_ROUTES_BY_FACTION[faction] ?? [];
  return orderedUnique([...primary, ...fallback, ...LARGE_URBAN_MUN_IDS]);
}

function addOneTurnPoolContribution(
  state: GameState,
  routedByPoolKey: Map<string, { munId: MunicipalityId; faction: FactionId; amount: number }>
): void {
  if (!state.militia_pools) state.militia_pools = {};
  const poolKeys = Array.from(routedByPoolKey.keys()).sort(strictCompare);
  for (const key of poolKeys) {
    const row = routedByPoolKey.get(key);
    if (!row) continue;
    const contribution = Math.min(
      Math.floor(Math.max(0, row.amount) * REINFORCEMENT_RATE),
      DISPLACED_CONTRIBUTION_CAP
    );
    if (contribution <= 0) continue;
    const currentTurn = state.meta.turn;
    const pool = state.militia_pools[key];
    if (pool) {
      pool.available += contribution;
      pool.updated_turn = currentTurn;
    } else {
      state.militia_pools[key] = {
        mun_id: row.munId,
        faction: row.faction,
        available: contribution,
        committed: 0,
        exhausted: 0,
        updated_turn: currentTurn
      };
    }
  }
}

export function processPhaseIIDisplacementTakeover(
  state: GameState,
  settlements: Map<string, SettlementRecord>,
  battleReport?: PhaseIIBattleResolutionLike,
  population1991ByMun?: MunicipalityPopulation1991Map
): PhaseIITakeoverDisplacementReport {
  if (state.meta.phase !== 'phase_ii') {
    return {
      timers_started: 0,
      timers_matured: 0,
      camps_created: 0,
      camps_routed: 0,
      displaced_total: 0,
      killed_total: 0,
      fled_abroad_total: 0,
      routed_total: 0,
      source_municipalities: [],
      routing: []
    };
  }

  if (!state.hostile_takeover_timers) state.hostile_takeover_timers = {};
  if (!state.displacement_camp_state) state.displacement_camp_state = {};

  const report: PhaseIITakeoverDisplacementReport = {
    timers_started: 0,
    timers_matured: 0,
    camps_created: 0,
    camps_routed: 0,
    displaced_total: 0,
    killed_total: 0,
    fled_abroad_total: 0,
    routed_total: 0,
    source_municipalities: [],
    routing: []
  };

  const currentTurn = state.meta.turn;
  const timerMap = state.hostile_takeover_timers as Record<MunicipalityId, HostileTakeoverTimerState>;
  const campMap = state.displacement_camp_state as Record<MunicipalityId, DisplacementCampState>;

  const battles = (battleReport?.battles ?? []).slice().sort((a, b) => {
    const byAttacker = strictCompare(a.attacker_faction, b.attacker_faction);
    if (byAttacker !== 0) return byAttacker;
    return strictCompare(a.location, b.location);
  });

  // 1) Start takeover timers from flipped settlements.
  for (const battle of battles) {
    if (!battle.settlement_flipped) continue;
    const fromFaction = battle.defender_faction;
    const toFaction = battle.attacker_faction;
    if (!fromFaction || !toFaction) continue;
    if (!areFactionsAtWar(state, fromFaction, toFaction)) continue;
    const rec = settlements.get(battle.location);
    if (!rec) continue;
    const munId = getMunicipalityIdFromRecord(rec);
    if (!munId) continue;
    const existing = timerMap[munId];
    if (
      existing &&
      existing.from_faction === fromFaction &&
      existing.to_faction === toFaction &&
      existing.started_turn <= currentTurn
    ) {
      continue;
    }
    timerMap[munId] = {
      mun_id: munId,
      from_faction: fromFaction,
      to_faction: toFaction,
      started_turn: currentTurn
    };
    report.timers_started += 1;
  }

  // 2) Mature timers into camp state.
  const timerMuns = Object.keys(timerMap).sort(strictCompare) as MunicipalityId[];
  for (const munId of timerMuns) {
    const timer = timerMap[munId];
    if (!timer) continue;
    if (currentTurn - timer.started_turn < TAKEOVER_DISPLACEMENT_DELAY_TURNS) continue;

    const dispState = getOrInitDisplacementState(
      state,
      munId,
      state.displacement_state?.[munId]?.original_population ?? 10000
    );

    const currentPopulation = Math.max(
      0,
      dispState.original_population - dispState.displaced_out - dispState.lost_population + dispState.displaced_in
    );
    let hostileShare = getDynamicHostileShare(
      munId,
      timer.from_faction,
      dispState,
      population1991ByMun
    );
    if (timer.to_faction === 'HRHB' && timer.from_faction === 'RS') hostileShare = 1.0;
    else if (timer.to_faction === 'RBiH' && timer.from_faction === 'RS') hostileShare = 0.5 * hostileShare;
    else if (timer.to_faction === 'RS' && (timer.from_faction === 'RBiH' || timer.from_faction === 'HRHB'))
      hostileShare = 1.0;
    const displacementAmount = Math.max(0, Math.min(currentPopulation, Math.floor(currentPopulation * hostileShare)));
    if (displacementAmount <= 0) {
      delete timerMap[munId];
      continue;
    }

    const killFraction = isEnclaveOverrun(munId, timer.from_faction, timer.to_faction)
      ? ENCLAVE_OVERRUN_KILL_FRACTION
      : DISPLACEMENT_KILLED_FRACTION;
    const killed = Math.floor(displacementAmount * killFraction);
    const survivors = Math.max(0, displacementAmount - killed);
    const fledAbroad = Math.floor(survivors * getFleeAbroadFraction(munId, timer.from_faction));
    const routedToCamp = Math.max(0, survivors - fledAbroad);
    const lost = killed + fledAbroad;

    const beforePop = currentPopulation;
    dispState.displaced_out += displacementAmount;
    dispState.lost_population += lost;
    dispState.last_updated_turn = currentTurn;

    // Reduce source militia availability proportionally to demographic loss.
    const sourcePoolKey = militiaPoolKey(munId, timer.from_faction);
    const sourcePool = state.militia_pools?.[sourcePoolKey];
    if (sourcePool && beforePop > 0) {
      const ratio = displacementAmount / beforePop;
      const reduction = Math.floor(sourcePool.available * ratio);
      if (reduction > 0) {
        sourcePool.available = Math.max(0, sourcePool.available - reduction);
        sourcePool.updated_turn = currentTurn;
      }
    }

    if (routedToCamp > 0) {
      const existingCamp = campMap[munId];
      const created = !existingCamp;
      const camp: DisplacementCampState = existingCamp ?? {
        mun_id: munId,
        population: 0,
        started_turn: currentTurn,
        by_faction: {}
      };
      camp.population += routedToCamp;
      camp.by_faction[timer.from_faction] = (camp.by_faction[timer.from_faction] ?? 0) + routedToCamp;
      if (created) report.camps_created += 1;
      campMap[munId] = camp;
    }

    report.timers_matured += 1;
    report.displaced_total += displacementAmount;
    report.killed_total += killed;
    report.fled_abroad_total += fledAbroad;
    report.routed_total += routedToCamp;
    report.source_municipalities.push(munId);

    recordCivilianDisplacementCasualties(state, timer.from_faction, killed, fledAbroad);

    delete timerMap[munId];
  }

  // 3) Mature camp state into routed arrivals (urban-center order + capacity overflow).
  const friendlyMunsByFaction = buildFriendlyMunicipalitiesByFaction(state, settlements);
  const routedByPoolKey = new Map<string, { munId: MunicipalityId; faction: FactionId; amount: number }>();
  const campMuns = Object.keys(campMap).sort(strictCompare) as MunicipalityId[];
  for (const sourceMunId of campMuns) {
    const camp = campMap[sourceMunId];
    if (!camp) continue;
    if (currentTurn - camp.started_turn < CAMP_REROUTE_DELAY_TURNS) continue;

    let routedFromCamp = 0;
    const factionKeys = (Object.keys(camp.by_faction) as FactionId[]).sort(strictCompare);
    for (const factionId of factionKeys) {
      let remaining = Math.max(0, Math.floor(camp.by_faction[factionId] ?? 0));
      if (remaining <= 0) continue;
      const routeOrder = getRoutingOrder(sourceMunId, factionId);
      for (const targetMunId of routeOrder) {
        if (remaining <= 0) break;
        if (!friendlyMunsByFaction[factionId]?.has(targetMunId)) continue;
        if (targetMunId === sourceMunId) continue;
        const targetState = getOrInitDisplacementState(
          state,
          targetMunId,
          state.displacement_state?.[targetMunId]?.original_population ?? 10000
        );
        const targetCurrent = Math.max(
          0,
          targetState.original_population + targetState.displaced_in - targetState.displaced_out - targetState.lost_population
        );
        const targetCapacity = Math.floor(targetState.original_population * DISPLACEMENT_CAPACITY_FRACTION);
        const availableCapacity = Math.max(0, targetCapacity - targetCurrent);
        if (availableCapacity <= 0) continue;
        const routed = Math.min(remaining, availableCapacity);
        if (routed <= 0) continue;

        targetState.displaced_in += routed;
        if (!targetState.displaced_in_by_faction) targetState.displaced_in_by_faction = {};
        targetState.displaced_in_by_faction[factionId] =
          (targetState.displaced_in_by_faction[factionId] ?? 0) + routed;
        targetState.last_updated_turn = currentTurn;

        const poolKey = militiaPoolKey(targetMunId, factionId);
        const current = routedByPoolKey.get(poolKey);
        if (current) {
          current.amount += routed;
        } else {
          routedByPoolKey.set(poolKey, { munId: targetMunId, faction: factionId, amount: routed });
        }

        report.routing.push({
          from_mun: sourceMunId,
          to_mun: targetMunId,
          amount: routed,
          reason: 'camp_reroute_urban_motherland'
        });
        remaining -= routed;
        routedFromCamp += routed;
      }
      camp.by_faction[factionId] = remaining;
    }

    camp.population = (Object.values(camp.by_faction) as number[])
      .filter((v) => typeof v === 'number' && Number.isFinite(v) && v > 0)
      .reduce((sum, v) => sum + v, 0);

    if (routedFromCamp > 0) report.camps_routed += 1;
    if (camp.population <= 0) delete campMap[sourceMunId];
  }

  addOneTurnPoolContribution(state, routedByPoolKey);

  report.source_municipalities = orderedUnique(report.source_municipalities).sort(strictCompare);
  report.routing.sort((a, b) => {
    const fromCmp = strictCompare(a.from_mun, b.from_mun);
    if (fromCmp !== 0) return fromCmp;
    return strictCompare(a.to_mun, b.to_mun);
  });
  return report;
}
