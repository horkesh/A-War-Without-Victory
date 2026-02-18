/**
 * Phase II: Battle resolution engine.
 *
 * Replaces the simplistic garrison-based combat with a multi-factor battle system.
 * Every engagement produces detailed casualties, equipment losses, and snap events.
 *
 * Formula inputs:
 *   Personnel density, equipment (tanks/artillery/AA with condition), experience,
 *   cohesion, posture, supply, readiness, corps stance, named operations, OG bonus,
 *   resilience, disruption, terrain (rivers, slope, urban, friction, road access),
 *   front hardening.
 *
 * Deterministic: no Math.random(); sorted iteration; same inputs → same outputs.
 */

import type {
  GameState,
  FactionId,
  FormationId,
  FormationState,
  SettlementId,
  BrigadePosture,
  CorpsStance
} from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import type { TerrainScalarsData } from '../../map/terrain_scalars.js';
import { getTerrainScalarsForSid, getMaxAttackersForTarget } from '../../map/terrain_scalars.js';
import { strictCompare } from '../../state/validateGameState.js';
import { areRbihHrhbAllied } from '../phase_i/alliance_update.js';
import { MIN_BRIGADE_SPAWN, MIN_COMBAT_PERSONNEL, MILITIA_COHESION, isLargeUrbanSettlementMun, LARGE_SETTLEMENT_MUN_IDS } from '../../state/formation_constants.js';
import { militiaPoolKey } from '../../state/militia_pool_key.js';
import { getBrigadeAoRSettlements, getSettlementGarrison } from './brigade_aor.js';
import { computeEquipmentMultiplier, captureEquipment, ensureBrigadeComposition } from './equipment_effects.js';
import { computeResilienceModifier } from './faction_resilience.js';
import {
  initializeCasualtyLedger,
  recordBattleCasualties,
  recordEquipmentLoss
} from '../../state/casualty_ledger.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Power ratio at or above which attacker wins and flips settlement. */
const ATTACKER_VICTORY_THRESHOLD = 1.2;

// --- Multi-brigade attack (Phase D) ---
const MULTI_BRIGADE_EFFICIENCY_2 = 0.85;
const MULTI_BRIGADE_EFFICIENCY_3 = 0.75;
const SAME_CORPS_EFFICIENCY_2 = 0.9;
const SAME_CORPS_EFFICIENCY_3 = 0.82;
const OG_COORDINATION_BONUS = 1.1;
const DEFENDER_OUTNUMBERED_BONUS = 1.15;
const MAX_ATTACKERS_PER_TARGET = 3;
const LINKING_DEFENSE_BONUS = 1.1;

/** Power ratio below which defender wins outright. */
const STALEMATE_LOWER_BOUND = 0.7;

/** Baseline casualties per unit of engagement intensity (intensity_divisor garrison = 1 unit). */
const BASE_CASUALTY_PER_INTENSITY = 50;
const CASUALTY_INTENSITY_DIVISOR = 350;

/** Minimum personnel lost per side per engagement (no free wins). */
const MIN_CASUALTIES_PER_BATTLE = 15;
/** Undefended settlements still incur small defending losses (militia/rear security). */
const UNDEFENDED_DEFENDER_CASUALTY_SCALE = 0.5;
const MIN_UNDEFENDED_DEFENDER_CASUALTIES = 1;

/** Casualty category fractions (must sum to 1). */
const KIA_FRACTION = 0.25;
const WIA_FRACTION = 0.55;
// MIA = remainder (0.20)

/** Experience multiplier: floor + scale × experience. */
const EXPERIENCE_MULT_BASE = 0.6;
const EXPERIENCE_MULT_SCALE = 0.8;

// --- Terrain constants ---
const RIVER_DEFENSE_SCALE = 0.40;
const SLOPE_DEFENSE_SCALE = 0.30;
const URBAN_DEFENSE_BONUS = 0.25;
const SARAJEVO_DEFENSE_BONUS = 0.40;
const ENCLAVE_DEFENSE_BONUS = 0.20;
const FRICTION_DEFENSE_SCALE = 0.20;
const ROAD_ACCESS_BASE = 0.85;
const ROAD_ACCESS_SCALE = 0.15;

// --- Urban casualty multipliers ---
const URBAN_ATTACKER_CASUALTY_MULT = 1.5;
const SARAJEVO_ATTACKER_CASUALTY_MULT = 2.0;

// --- Equipment loss rates per unit of intensity ---
const TANK_LOSS_RATE = 0.02;
const ARTILLERY_LOSS_RATE = 0.01;

// --- Pyrrhic victory ---
const PYRRHIC_THRESHOLD = 0.20;
const PYRRHIC_COHESION_PENALTY = 10;

// --- Snap events ---
const AMMO_CRISIS_TURNS = 4;
const AMMO_CRISIS_POWER_MULT = 0.3;
const COMMANDER_CASUALTY_THRESHOLD = 0.15;
const COMMANDER_EXP_LOSS = 0.15;
const COMMANDER_COHESION_LOSS = 8;
const LAST_STAND_COHESION_MIN = 40;
const LAST_STAND_DEFENDER_MULT = 1.8;
const LAST_STAND_ATTACKER_CAS_MULT = 1.5;
const LAST_STAND_DEFENDER_CAS_MULT = 1.3;
const SURRENDER_COHESION_MAX = 15;
const SURRENDER_POWER_MULT = 0.1;
const SURRENDER_CAPTURE_RATE = 0.25;

// --- Posture multipliers (mirrored from brigade_pressure.ts) ---
const POSTURE_PRESSURE_MULT: Record<BrigadePosture, number> = {
  defend: 0.3,
  probe: 0.7,
  attack: 1.5,
  elastic_defense: 0.2,
  consolidation: 0.6
};

const POSTURE_DEFENSE_MULT: Record<BrigadePosture, number> = {
  defend: 1.5,
  probe: 1.0,
  attack: 0.5,
  elastic_defense: 1.2,
  consolidation: 1.1
};

const READINESS_MULT: Record<string, number> = {
  active: 1.0,
  overextended: 0.5,
  degraded: 0.2,
  forming: 0
};

// --- Corps stance multipliers ---
const CORPS_STANCE_PRESSURE: Record<CorpsStance, number> = {
  defensive: 0.7,
  balanced: 1.0,
  offensive: 1.2,
  reorganize: 0.0
};

const CORPS_STANCE_DEFENSE: Record<CorpsStance, number> = {
  defensive: 1.2,
  balanced: 1.0,
  offensive: 0.8,
  reorganize: 1.0
};

// Sarajevo core municipalities (extreme urban defense)
const SARAJEVO_CORE_MUNS = new Set(LARGE_SETTLEMENT_MUN_IDS);
const ENCLAVE_CORE_MUNS = new Set<string>(['srebrenica', 'gorazde', 'bihac']);
const EARLY_WAR_RS_EXTERNAL_SUPPORT_END_TURN = 26;
const RS_EXTERNAL_SUPPORT_MUNS = new Set<string>([
  'bijeljina',
  'zvornik',
  'foca',
  'vlasenica',
  'bratunac',
  'visegrad',
  'rogatica',
  'prijedor'
]);
const RS_EXTERNAL_SUPPORT_MULT = 1.22;

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type BattleOutcome = 'attacker_victory' | 'defender_victory' | 'stalemate' | 'pyrrhic_victory';

export interface BattleCasualties {
  killed: number;
  wounded: number;
  missing_captured: number;
  tanks_lost: number;
  artillery_lost: number;
}

export interface CombatPowerBreakdown {
  base_garrison: number;
  equipment_mult: number;
  experience_mult: number;
  cohesion_mult: number;
  posture_mult: number;
  supply_mult: number;
  readiness_mult: number;
  corps_stance_mult: number;
  operation_mult: number;
  og_bonus: number;
  resilience_mult: number;
  disruption_mult: number;
  terrain_mult: number;
  front_hardening_mult: number;
  total_combat_power: number;
}

export interface TerrainModifiers {
  river_crossing_penalty: number;
  elevation_advantage: number;
  urban_defense_bonus: number;
  terrain_friction_bonus: number;
  road_access_modifier: number;
  composite: number;
}

export interface SnapEvent {
  type: string;
  description: string;
  affected_formation: string;
  mechanical_effect: string;
}

export interface BattleReport {
  turn: number;
  attacker_brigade: FormationId;
  defender_brigade: FormationId | null;
  attacker_faction: FactionId;
  defender_faction: FactionId;
  location: SettlementId;
  attacker_power: CombatPowerBreakdown;
  defender_power: CombatPowerBreakdown | null;
  terrain_modifiers: TerrainModifiers;
  power_ratio: number;
  outcome: BattleOutcome;
  casualties: {
    attacker: BattleCasualties;
    defender: BattleCasualties;
  };
  settlement_flipped: boolean;
  snap_events: SnapEvent[];
}

export interface BattleResolutionReport {
  battles_fought: number;
  flips_applied: number;
  total_attacker_casualties: BattleCasualties;
  total_defender_casualties: BattleCasualties;
  battles: BattleReport[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function buildAdjacency(edges: EdgeRecord[]): Map<SettlementId, SettlementId[]> {
  const adj = new Map<SettlementId, SettlementId[]>();
  for (const e of edges) {
    if (!e?.a || !e?.b) continue;
    const listA = adj.get(e.a) ?? [];
    if (!listA.includes(e.b)) listA.push(e.b);
    adj.set(e.a, listA);
    const listB = adj.get(e.b) ?? [];
    if (!listB.includes(e.a)) listB.push(e.a);
    adj.set(e.b, listB);
  }
  for (const list of adj.values()) list.sort(strictCompare);
  return adj;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function getExperienceMult(formation: FormationState): number {
  const exp = formation.experience ?? 0;
  return EXPERIENCE_MULT_BASE + EXPERIENCE_MULT_SCALE * clamp(exp, 0, 1);
}

function getSupplyFactor(formation: FormationState, turn: number): number {
  const lastSupplied = formation.ops?.last_supplied_turn;
  if (lastSupplied !== null && lastSupplied !== undefined && turn - lastSupplied <= 2) return 1.0;
  return 0.4;
}

function getUnsuppliedTurns(formation: FormationState, turn: number): number {
  const lastSupplied = formation.ops?.last_supplied_turn;
  if (lastSupplied === null || lastSupplied === undefined) return turn; // never supplied
  return Math.max(0, turn - lastSupplied);
}

function getCorpsStance(state: GameState, formation: FormationState): CorpsStance | null {
  if (!formation.corps_id || !state.corps_command) return null;
  const corps = state.corps_command[formation.corps_id];
  if (!corps) return null;

  // Check army stance override
  const faction = formation.faction;
  const armyStance = state.army_stance?.[faction];
  if (armyStance === 'general_defensive') return 'defensive';
  if (armyStance === 'general_offensive') return 'offensive';
  if (armyStance === 'total_mobilization') return 'reorganize';

  return corps.stance ?? 'balanced';
}

function getOperationMult(state: GameState, formation: FormationState, mode: 'pressure' | 'defense'): number {
  if (!formation.corps_id || !state.corps_command) return 1.0;
  const corps = state.corps_command[formation.corps_id];
  if (!corps?.active_operation) return 1.0;
  const op = corps.active_operation;

  // Check if this formation participates
  if (!op.participating_brigades.includes(formation.id)) return 1.0;

  if (op.phase === 'execution') return mode === 'pressure' ? 1.5 : 1.0;
  if (op.phase === 'planning') return mode === 'pressure' ? 1.0 : 1.05;
  if (op.phase === 'recovery') return mode === 'pressure' ? 0.6 : 0.9;
  return 1.0;
}

function getOGBonus(formation: FormationState): number {
  return (formation.kind === 'operational_group' || formation.kind === 'og') ? 1.3 : 1.0;
}

/** Militia defender power: garrison × cohesion mult × terrain (no equipment/posture/corps). Phase B. */
function computeMilitiaDefenderPower(garrison: number, terrainMult: number): number {
  return garrison * (MILITIA_COHESION / 100) * terrainMult;
}

// ═══════════════════════════════════════════════════════════════════════════
// Terrain
// ═══════════════════════════════════════════════════════════════════════════

export function computeTerrainModifier(
  terrainData: TerrainScalarsData,
  targetSid: SettlementId,
  settlementToMun: Map<string, string>
): TerrainModifiers {
  const t = getTerrainScalarsForSid(terrainData, targetSid);
  const mun = settlementToMun.get(targetSid);

  const river = t.river_crossing_penalty * RIVER_DEFENSE_SCALE;
  const slope = clamp(t.slope_index * SLOPE_DEFENSE_SCALE, 0, SLOPE_DEFENSE_SCALE);

  let urban = 0;
  if (mun) {
    if (SARAJEVO_CORE_MUNS.has(mun)) {
      urban = SARAJEVO_DEFENSE_BONUS;
    } else if (isLargeUrbanSettlementMun(mun)) {
      urban = URBAN_DEFENSE_BONUS;
    }
    if (ENCLAVE_CORE_MUNS.has(mun)) {
      urban += ENCLAVE_DEFENSE_BONUS;
    }
  }

  const friction = t.terrain_friction_index * FRICTION_DEFENSE_SCALE;
  const roadAccess = ROAD_ACCESS_BASE + ROAD_ACCESS_SCALE * t.road_access_index;

  const composite = (1 + river + slope + urban + friction) * roadAccess;

  return {
    river_crossing_penalty: river,
    elevation_advantage: slope,
    urban_defense_bonus: urban,
    terrain_friction_bonus: friction,
    road_access_modifier: roadAccess,
    composite
  };
}

function getUrbanCasualtyMult(settlementToMun: Map<string, string>, sid: SettlementId): number {
  const mun = settlementToMun.get(sid);
  if (!mun) return 1.0;
  if (SARAJEVO_CORE_MUNS.has(mun)) return SARAJEVO_ATTACKER_CASUALTY_MULT;
  if (isLargeUrbanSettlementMun(mun)) return URBAN_ATTACKER_CASUALTY_MULT;
  return 1.0;
}

function getExternalSupportMultiplier(
  attackerFaction: FactionId,
  turn: number,
  settlementToMun: Map<string, string>,
  targetSid: SettlementId
): number {
  if (attackerFaction !== 'RS') return 1.0;
  if (turn >= EARLY_WAR_RS_EXTERNAL_SUPPORT_END_TURN) return 1.0;
  const mun = settlementToMun.get(targetSid);
  if (!mun) return 1.0;
  if (!RS_EXTERNAL_SUPPORT_MUNS.has(mun)) return 1.0;
  return RS_EXTERNAL_SUPPORT_MULT;
}

// ═══════════════════════════════════════════════════════════════════════════
// Combat power
// ═══════════════════════════════════════════════════════════════════════════

function computeCombatPower(
  state: GameState,
  formation: FormationState,
  baseGarrison: number,
  mode: 'attack' | 'defend',
  terrainMult: number,
  activeStreak: number
): CombatPowerBreakdown {
  const posture = formation.posture ?? 'defend';
  const postureMult = mode === 'attack'
    ? (POSTURE_PRESSURE_MULT[posture])
    : (POSTURE_DEFENSE_MULT[posture]);

  const equipmentMult = computeEquipmentMultiplier(formation, posture);
  const experienceMult = getExperienceMult(formation);
  const cohesionMult = (formation.cohesion ?? 60) / 100;
  const supplyMult = getSupplyFactor(formation, state.meta.turn);
  const readinessMult = READINESS_MULT[formation.readiness ?? 'active'] ?? 1.0;

  const corpsStance = getCorpsStance(state, formation);
  const corpsStanceMult = corpsStance
    ? (mode === 'attack' ? CORPS_STANCE_PRESSURE[corpsStance] : CORPS_STANCE_DEFENSE[corpsStance])
    : 1.0;

  const operationMult = getOperationMult(state, formation, mode === 'attack' ? 'pressure' : 'defense');
  const ogBonus = getOGBonus(formation);
  const resilienceMult = computeResilienceModifier(state, formation.faction, formation);
  const disruptionMult = formation.disrupted ? 0.5 : 1.0;

  const tMult = mode === 'defend' ? terrainMult : 1.0;
  const hardeningMult = mode === 'defend' ? (1 + Math.min(0.5, activeStreak * 0.05)) : 1.0;

  const total = baseGarrison * equipmentMult * experienceMult * cohesionMult
    * postureMult * supplyMult * readinessMult * corpsStanceMult
    * operationMult * ogBonus * resilienceMult * disruptionMult
    * tMult * hardeningMult;

  return {
    base_garrison: baseGarrison,
    equipment_mult: equipmentMult,
    experience_mult: experienceMult,
    cohesion_mult: cohesionMult,
    posture_mult: postureMult,
    supply_mult: supplyMult,
    readiness_mult: readinessMult,
    corps_stance_mult: corpsStanceMult,
    operation_mult: operationMult,
    og_bonus: ogBonus,
    resilience_mult: resilienceMult,
    disruption_mult: disruptionMult,
    terrain_mult: tMult,
    front_hardening_mult: hardeningMult,
    total_combat_power: total
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Snap events
// ═══════════════════════════════════════════════════════════════════════════

interface SnapContext {
  state: GameState;
  targetSid: SettlementId;
  defenderFormation: FormationState | null;
  adjacency: Map<SettlementId, SettlementId[]>;
}

function isSurrounded(ctx: SnapContext): boolean {
  if (!ctx.defenderFormation) return false;
  const defFaction = ctx.defenderFormation.faction;
  const pc = ctx.state.political_controllers ?? {};
  const neighbors = ctx.adjacency.get(ctx.targetSid) ?? [];
  if (neighbors.length === 0) return false;

  for (const nSid of neighbors) {
    const controller = pc[nSid];
    if (controller === defFaction) return false; // at least one friendly neighbor
  }
  return true;
}

interface PreBattleSnap {
  events: SnapEvent[];
  defenderPowerMult: number;
  attackerCasMult: number;
  defenderCasMult: number;
  isSurrenderCascade: boolean;
  isAmmoCrisis: boolean;
}

function evaluatePreBattleSnaps(ctx: SnapContext): PreBattleSnap {
  const result: PreBattleSnap = {
    events: [],
    defenderPowerMult: 1.0,
    attackerCasMult: 1.0,
    defenderCasMult: 1.0,
    isSurrenderCascade: false,
    isAmmoCrisis: false
  };

  if (!ctx.defenderFormation) return result;
  const def = ctx.defenderFormation;
  const turn = ctx.state.meta.turn;
  const cohesion = def.cohesion ?? 60;
  const surrounded = isSurrounded(ctx);
  const unsuppliedTurns = getUnsuppliedTurns(def, turn);

  // Ammo crisis: unsupplied 4+ turns
  if (unsuppliedTurns >= AMMO_CRISIS_TURNS) {
    result.defenderPowerMult *= AMMO_CRISIS_POWER_MULT;
    result.isAmmoCrisis = true;
    result.events.push({
      type: 'ammo_crisis',
      description: `${def.name ?? def.id} ran out of ammunition after ${unsuppliedTurns} turns without supply`,
      affected_formation: def.id,
      mechanical_effect: `defender power ×${AMMO_CRISIS_POWER_MULT}`
    });
  }

  // Surrender cascade: surrounded + low cohesion + unsupplied (mutually exclusive with last stand)
  if (surrounded && cohesion < SURRENDER_COHESION_MAX && unsuppliedTurns >= 2) {
    result.defenderPowerMult *= SURRENDER_POWER_MULT;
    result.isSurrenderCascade = true;
    result.events.push({
      type: 'surrender_cascade',
      description: `${def.name ?? def.id} surrendered — surrounded, broken, no supply`,
      affected_formation: def.id,
      mechanical_effect: `defender power ×${SURRENDER_POWER_MULT}, garrison captured`
    });
  }
  // Last stand: surrounded + sufficient cohesion (only if NOT surrender)
  else if (surrounded && cohesion >= LAST_STAND_COHESION_MIN) {
    result.defenderPowerMult *= LAST_STAND_DEFENDER_MULT;
    result.attackerCasMult *= LAST_STAND_ATTACKER_CAS_MULT;
    result.defenderCasMult *= LAST_STAND_DEFENDER_CAS_MULT;
    result.events.push({
      type: 'last_stand',
      description: `${def.name ?? def.id} is surrounded and fighting to the last man`,
      affected_formation: def.id,
      mechanical_effect: `defender power ×${LAST_STAND_DEFENDER_MULT}, attacker casualties ×${LAST_STAND_ATTACKER_CAS_MULT}`
    });
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Casualties
// ═══════════════════════════════════════════════════════════════════════════

function splitCasualties(
  total: number, kiaFrac: number, wiaFrac: number,
  tanksLost: number, artilleryLost: number
): BattleCasualties {
  const killed = Math.floor(total * kiaFrac);
  const wounded = Math.floor(total * wiaFrac);
  return { killed, wounded, missing_captured: total - killed - wounded, tanks_lost: tanksLost, artillery_lost: artilleryLost };
}

function computeBattleCasualties(
  attackerPower: number,
  defenderPower: number,
  powerRatio: number,
  urbanCasMult: number,
  terrainComposite: number,
  snapMults: PreBattleSnap,
  attackerFormation: FormationState,
  defenderFormation: FormationState | null,
  /** When defender is militia (no formation but garrison > 0), cap defender casualties at this value. */
  defenderGarrisonCap?: number
): { attacker: BattleCasualties; defender: BattleCasualties } {
  // Truly undefended (no defender power)
  if (defenderPower <= 0) {
    const undefendedIntensityFactor = Math.max(0.1, attackerPower / 800);
    const defenderTotal = Math.max(
      MIN_UNDEFENDED_DEFENDER_CASUALTIES,
      Math.round(BASE_CASUALTY_PER_INTENSITY * UNDEFENDED_DEFENDER_CASUALTY_SCALE * undefendedIntensityFactor)
    );
    return {
      attacker: { killed: 0, wounded: 2, missing_captured: 0, tanks_lost: 0, artillery_lost: 0 },
      defender: splitCasualties(defenderTotal, 0.15, 0.5, 0, 0)
    };
  }

  const intensity = Math.min(attackerPower, defenderPower);
  const intensityFactor = Math.max(0.1, intensity / CASUALTY_INTENSITY_DIVISOR);
  const baseCas = BASE_CASUALTY_PER_INTENSITY * intensityFactor;

  // Attacker casualties: inverse of power ratio (weaker attacker = more losses)
  let attackerTotal = baseCas * (1 / Math.max(0.5, powerRatio)) * urbanCasMult * snapMults.attackerCasMult;
  attackerTotal = Math.max(MIN_CASUALTIES_PER_BATTLE, Math.round(attackerTotal));

  // Defender casualties: proportional to power ratio (overwhelming = more defender losses)
  let defenderTotal = baseCas * Math.min(2.0, powerRatio) * (1 / Math.max(0.8, terrainComposite)) * snapMults.defenderCasMult;
  if (snapMults.isAmmoCrisis) defenderTotal *= 1.5;
  defenderTotal = Math.max(MIN_CASUALTIES_PER_BATTLE, Math.round(defenderTotal));

  const attackerPersonnel = attackerFormation.personnel ?? 0;
  const defenderPersonnel = defenderFormation
    ? (defenderFormation.personnel ?? 0)
    : (defenderGarrisonCap ?? 0);
  attackerTotal = Math.min(attackerTotal, Math.max(0, attackerPersonnel - MIN_COMBAT_PERSONNEL));
  defenderTotal = Math.min(defenderTotal, Math.max(0, defenderPersonnel));

  let defenderKiaFrac = KIA_FRACTION;
  let defenderWiaFrac = WIA_FRACTION;
  if (snapMults.isSurrenderCascade && defenderFormation) {
    defenderKiaFrac = 0.05;
    defenderWiaFrac = 0.10;
    defenderTotal = Math.max(defenderTotal, Math.round(defenderPersonnel * 0.5));
    defenderTotal = Math.min(defenderTotal, Math.max(0, defenderPersonnel - MIN_COMBAT_PERSONNEL));
  }

  const defenderReported = defenderTotal > 0
    ? defenderTotal
    : Math.min(MIN_CASUALTIES_PER_BATTLE, defenderPersonnel);

  const attackerComp = attackerFormation.composition ?? ensureBrigadeComposition(attackerFormation);
  const attackPostureMult = (attackerFormation.posture === 'attack') ? 1.5 : 1.0;
  const aTanksLost = Math.min(attackerComp.tanks, Math.floor(attackerComp.tanks * TANK_LOSS_RATE * intensityFactor * attackPostureMult));
  const aArtLost = Math.min(attackerComp.artillery, Math.floor(attackerComp.artillery * ARTILLERY_LOSS_RATE * intensityFactor));

  let dTanksLost = 0;
  let dArtLost = 0;
  if (defenderFormation) {
    const defenderComp = defenderFormation.composition ?? ensureBrigadeComposition(defenderFormation);
    const terrainProtection = 1 / Math.max(0.8, terrainComposite);
    dTanksLost = Math.min(defenderComp.tanks, Math.floor(defenderComp.tanks * TANK_LOSS_RATE * intensityFactor * terrainProtection));
    dArtLost = Math.min(defenderComp.artillery, Math.floor(defenderComp.artillery * ARTILLERY_LOSS_RATE * intensityFactor * terrainProtection));
  }

  return {
    attacker: splitCasualties(attackerTotal, KIA_FRACTION, WIA_FRACTION, aTanksLost, aArtLost),
    defender: splitCasualties(defenderReported, defenderKiaFrac, defenderWiaFrac, dTanksLost, dArtLost)
  };
}

function totalPersonnelLoss(cas: BattleCasualties): number {
  return cas.killed + cas.wounded + cas.missing_captured;
}

// ═══════════════════════════════════════════════════════════════════════════
// Post-battle snap events
// ═══════════════════════════════════════════════════════════════════════════

function evaluatePostBattleSnaps(
  attackerFormation: FormationState,
  defenderFormation: FormationState | null,
  casualties: { attacker: BattleCasualties; defender: BattleCasualties }
): SnapEvent[] {
  const events: SnapEvent[] = [];

  // Commander casualty: attacker
  const attackerPersonnel = attackerFormation.personnel ?? 0;
  if (attackerPersonnel > 0) {
    const attackerLossRatio = totalPersonnelLoss(casualties.attacker) / attackerPersonnel;
    if (attackerLossRatio >= COMMANDER_CASUALTY_THRESHOLD && (attackerFormation.experience ?? 0) > 0.3) {
      events.push({
        type: 'commander_casualty',
        description: `${attackerFormation.name ?? attackerFormation.id} lost experienced officers in heavy fighting`,
        affected_formation: attackerFormation.id,
        mechanical_effect: `experience -${COMMANDER_EXP_LOSS}, cohesion -${COMMANDER_COHESION_LOSS}`
      });
    }
  }

  // Commander casualty: defender
  if (defenderFormation) {
    const defenderPersonnel = defenderFormation.personnel ?? 0;
    if (defenderPersonnel > 0) {
      const defenderLossRatio = totalPersonnelLoss(casualties.defender) / defenderPersonnel;
      if (defenderLossRatio >= COMMANDER_CASUALTY_THRESHOLD && (defenderFormation.experience ?? 0) > 0.3) {
        events.push({
          type: 'commander_casualty',
          description: `${defenderFormation.name ?? defenderFormation.id} lost experienced officers in heavy fighting`,
          affected_formation: defenderFormation.id,
          mechanical_effect: `experience -${COMMANDER_EXP_LOSS}, cohesion -${COMMANDER_COHESION_LOSS}`
        });
      }
    }
  }

  return events;
}

// ═══════════════════════════════════════════════════════════════════════════
// Apply results to state
// ═══════════════════════════════════════════════════════════════════════════

function applyPersonnelLoss(formation: FormationState, loss: number): void {
  if (typeof formation.personnel !== 'number') return;
  formation.personnel = Math.max(MIN_COMBAT_PERSONNEL, formation.personnel - loss);
  // Degrade readiness when personnel drops below spawn threshold (combat attrition)
  if (formation.personnel < MIN_BRIGADE_SPAWN && formation.readiness === 'active') {
    formation.readiness = 'degraded';
  }
}

function addWoundedPending(formation: FormationState, wounded: number): void {
  if (wounded <= 0) return;
  formation.wounded_pending = (formation.wounded_pending ?? 0) + wounded;
}

function applyEquipmentBattleLoss(formation: FormationState, tanksLost: number, artilleryLost: number): void {
  const comp = formation.composition;
  if (!comp) return;

  if (tanksLost > 0 && comp.tanks > 0) {
    const removed = Math.min(tanksLost, comp.tanks);
    comp.tanks -= removed;
    // Shift some remaining to degraded (battle wear)
    const wearShift = Math.min(comp.tank_condition.operational, 0.03 * removed / Math.max(1, comp.tanks));
    comp.tank_condition.operational -= wearShift;
    comp.tank_condition.degraded += wearShift;
  }

  if (artilleryLost > 0 && comp.artillery > 0) {
    const removed = Math.min(artilleryLost, comp.artillery);
    comp.artillery -= removed;
    const wearShift = Math.min(comp.artillery_condition.operational, 0.02 * removed / Math.max(1, comp.artillery));
    comp.artillery_condition.operational -= wearShift;
    comp.artillery_condition.degraded += wearShift;
  }
}

function applyCommanderCasualtyEffects(formation: FormationState): void {
  if (typeof formation.experience === 'number') {
    formation.experience = Math.max(0, formation.experience - COMMANDER_EXP_LOSS);
  }
  if (typeof formation.cohesion === 'number') {
    formation.cohesion = Math.max(0, formation.cohesion - COMMANDER_COHESION_LOSS);
  }
}

function applySurrenderCapture(
  loserFormation: FormationState,
  winnerFormation: FormationState
): void {
  const loserComp = loserFormation.composition;
  const winnerComp = winnerFormation.composition;
  if (!loserComp || !winnerComp) return;

  // Capture equipment at higher rate
  const capturedTanks = Math.floor(loserComp.tanks * SURRENDER_CAPTURE_RATE);
  const capturedArt = Math.floor(loserComp.artillery * SURRENDER_CAPTURE_RATE);

  if (capturedTanks > 0) {
    loserComp.tanks -= capturedTanks;
    winnerComp.tanks += capturedTanks;
    const frac = capturedTanks / Math.max(1, winnerComp.tanks);
    winnerComp.tank_condition.degraded += frac * 0.5;
    winnerComp.tank_condition.operational = Math.max(0, winnerComp.tank_condition.operational - frac * 0.3);
  }

  if (capturedArt > 0) {
    loserComp.artillery -= capturedArt;
    winnerComp.artillery += capturedArt;
    const frac = capturedArt / Math.max(1, winnerComp.artillery);
    winnerComp.artillery_condition.degraded += frac * 0.5;
    winnerComp.artillery_condition.operational = Math.max(0, winnerComp.artillery_condition.operational - frac * 0.3);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════════════════════════════

function zeroCasualties(): BattleCasualties {
  return { killed: 0, wounded: 0, missing_captured: 0, tanks_lost: 0, artillery_lost: 0 };
}

function addCasualties(a: BattleCasualties, b: BattleCasualties): BattleCasualties {
  return {
    killed: a.killed + b.killed,
    wounded: a.wounded + b.wounded,
    missing_captured: a.missing_captured + b.missing_captured,
    tanks_lost: a.tanks_lost + b.tanks_lost,
    artillery_lost: a.artillery_lost + b.artillery_lost
  };
}

/**
 * Resolve all brigade attack orders for one turn.
 * Produces detailed battle reports with casualties, equipment losses, and snap events.
 * Mutates state: political_controllers, formation personnel/equipment/experience/cohesion,
 * casualty_ledger. Clears brigade_attack_orders.
 */
export function resolveBattleOrders(
  state: GameState,
  edges: EdgeRecord[],
  terrainData: TerrainScalarsData,
  settlementToMun: Map<string, string>
): BattleResolutionReport {
  const report: BattleResolutionReport = {
    battles_fought: 0,
    flips_applied: 0,
    total_attacker_casualties: zeroCasualties(),
    total_defender_casualties: zeroCasualties(),
    battles: []
  };

  const orders = state.brigade_attack_orders;
  if (!orders || typeof orders !== 'object') return report;

  // Ensure casualty ledger
  if (!state.casualty_ledger) {
    const factionIds = (state.factions ?? []).map(f => f.id).sort(strictCompare);
    state.casualty_ledger = initializeCasualtyLedger(factionIds);
  }

  const adjacency = buildAdjacency(edges);
  const pc = state.political_controllers ?? {};
  const formations = state.formations ?? {};
  const brigadeAor = state.brigade_aor ?? {};
  const frontSegments = state.front_segments ?? {};
  const turn = state.meta.turn;

  const orderEntries = (Object.entries(orders) as [FormationId, SettlementId | null][])
    .filter((entry): entry is [FormationId, SettlementId] => entry[1] != null && entry[1] !== '')
    .sort((a, b) => strictCompare(a[0], b[0]));

  // Group by target; for each target collect attackers with AoR adjacent to target. Phase D: cap 3; Phase H: terrain battle width (mountain 1, hills 2, plains 3).
  const targetToAttackers = new Map<SettlementId, FormationId[]>();
  for (const [formationId, targetSid] of orderEntries) {
    const formation = formations[formationId];
    if (!formation || formation.faction == null) continue;
    const defenderFaction = pc[targetSid] as FactionId | null | undefined;
    if (!defenderFaction || defenderFaction === formation.faction) continue;
    const neighbors = adjacency.get(targetSid) ?? [];
    const aorSettlements = getBrigadeAoRSettlements(state, formationId);
    const adjacent = aorSettlements.some(sid => neighbors.includes(sid));
    if (!adjacent) continue;
    let list = targetToAttackers.get(targetSid);
    if (!list) {
      list = [];
      targetToAttackers.set(targetSid, list);
    }
    const terrainCap = getMaxAttackersForTarget(terrainData, targetSid);
    const cap = Math.min(MAX_ATTACKERS_PER_TARGET, terrainCap);
    if (list.length < cap) list.push(formationId);
  }
  for (const list of targetToAttackers.values()) {
    list.sort(strictCompare);
  }

  const targetsSorted = [...targetToAttackers.keys()].sort(strictCompare);
  for (const targetSid of targetsSorted) {
    const attackerIds = targetToAttackers.get(targetSid)!;
    const formationId = attackerIds[0];
    const formation = formations[formationId];
    if (!formation || formation.faction == null) continue;
    const attackerFaction = formation.faction as FactionId;
    const defenderFaction = pc[targetSid] as FactionId | null | undefined;
    if (!defenderFaction || defenderFaction === attackerFaction) continue;

    // --- RBiH-HRHB alliance block ---
    const isRbihVsHrhb =
      (attackerFaction === 'RBiH' && defenderFaction === 'HRHB') ||
      (attackerFaction === 'HRHB' && defenderFaction === 'RBiH');
    if (isRbihVsHrhb) {
      const earliestTurn = state.meta?.rbih_hrhb_war_earliest_turn ?? 26;
      const beforeEarliestWar = turn < earliestTurn;
      const rhs = state.rbih_hrhb_state;
      const ceasefireActive = rhs?.ceasefire_active ?? false;
      const washingtonSigned = rhs?.washington_signed ?? false;
      const rbihHrhbAllied = beforeEarliestWar || areRbihHrhbAllied(state) || ceasefireActive || washingtonSigned;
      if (rbihHrhbAllied) continue;
    }

    const neighbors = adjacency.get(targetSid) ?? [];
    let combinedAttackerPower = 0;
    const sameCorps = attackerIds.length >= 2 && attackerIds.every(id => {
      const corpsId = formations[id]?.corps_id;
      return corpsId && formations[corpsId] && attackerIds.every(o => formations[o]?.corps_id === corpsId);
    });
    const hasOG = attackerIds.some(id => (formations[id]?.kind ?? 'brigade') === 'operational_group' || formations[id]?.kind === 'og');
    const effN = attackerIds.length === 1 ? 1 : attackerIds.length === 2
      ? (sameCorps ? SAME_CORPS_EFFICIENCY_2 : MULTI_BRIGADE_EFFICIENCY_2)
      : (sameCorps ? SAME_CORPS_EFFICIENCY_3 : MULTI_BRIGADE_EFFICIENCY_3);
    const ogMult = hasOG ? OG_COORDINATION_BONUS : 1;
    for (const aid of attackerIds) {
      const aorSettlements = getBrigadeAoRSettlements(state, aid);
      const frontlineSids = aorSettlements.filter(sid => neighbors.includes(sid));
      const rawGarrison = frontlineSids.reduce(
        (sum, sid) => sum + getSettlementGarrison(state, sid, edges), 0
      );
      const bp = computeCombatPower(state, formations[aid]!, rawGarrison, 'attack', 1.0, 0);
      const ext = getExternalSupportMultiplier(attackerFaction, turn, settlementToMun, targetSid);
      combinedAttackerPower += bp.total_combat_power * ext * effN * ogMult;
    }
    const attackerPower = {
      base_garrison: attackerPowers.reduce((s, x) => s + (formations[x.formationId]?.personnel ?? 0), 0) / Math.max(1, attackerPowers.length),
      equipment_mult: 1,
      experience_mult: 1,
      cohesion_mult: 1,
      posture_mult: 1,
      supply_mult: 1,
      readiness_mult: 1,
      corps_stance_mult: 1,
      operation_mult: 1,
      og_bonus: hasOG ? OG_COORDINATION_BONUS : 1,
      resilience_mult: 1,
      disruption_mult: 1,
      terrain_mult: 1,
      front_hardening_mult: 1,
      total_combat_power: combinedAttackerPower
    };

    // --- Terrain for defending settlement ---
    const terrain = computeTerrainModifier(terrainData, targetSid, settlementToMun);

    // --- Defender brigade or militia ---
    const defenderBrigadeId: FormationId | undefined = brigadeAor[targetSid] ?? undefined;
    const defenderFormation = defenderBrigadeId != null ? formations[defenderBrigadeId] : undefined;
    const defenderFormationOrNull = defenderFormation ?? null;
    const defGarrison = getSettlementGarrison(state, targetSid, edges);

    // --- Front hardening streak ---
    let activeStreak = 0;
    for (const nSid of neighbors) {
      const segId = nSid < targetSid ? `${nSid}:${targetSid}` : `${targetSid}:${nSid}`;
      const seg = frontSegments[segId];
      if (seg && typeof (seg as any).active_streak === 'number') {
        activeStreak = Math.max(activeStreak, (seg as any).active_streak);
      }
    }

    // --- Snap events (pre-battle) ---
    const snapCtx: SnapContext = {
      state,
      targetSid,
      defenderFormation: defenderFormationOrNull,
      adjacency
    };
    const preBattleSnaps = evaluatePreBattleSnaps(snapCtx);

    // --- Defender outnumbered bonus (Phase D) ---
    const outnumberedMult = attackerIds.length >= 2 ? DEFENDER_OUTNUMBERED_BONUS : 1;
    // --- Linking: defender has another friendly brigade with AoR adjacent to target (+10%) ---
    let linkingMult = 1;
    if (defenderFaction) {
      for (const nSid of neighbors) {
        const aorOwner = brigadeAor[nSid];
        if (aorOwner && aorOwner !== defenderBrigadeId && formations[aorOwner]?.faction === defenderFaction) {
          linkingMult = LINKING_DEFENSE_BONUS;
          break;
        }
      }
    }

    let defenderPower: CombatPowerBreakdown | null = null;
    if (defenderFormation) {
      defenderPower = computeCombatPower(
        state, defenderFormation, defGarrison, 'defend',
        terrain.composite, activeStreak
      );
      defenderPower.total_combat_power *= preBattleSnaps.defenderPowerMult * outnumberedMult * linkingMult;
    } else if (defGarrison > 0) {
      const power = computeMilitiaDefenderPower(defGarrison, terrain.composite) * outnumberedMult * linkingMult;
      defenderPower = {
        base_garrison: defGarrison,
        equipment_mult: 1,
        experience_mult: 1,
        cohesion_mult: MILITIA_COHESION / 100,
        posture_mult: 1,
        supply_mult: 1,
        readiness_mult: 1,
        corps_stance_mult: 1,
        operation_mult: 1,
        og_bonus: 1,
        resilience_mult: 1,
        disruption_mult: 1,
        terrain_mult: terrain.composite,
        front_hardening_mult: 1,
        total_combat_power: power
      };
    }

    // --- Power ratio & outcome ---
    const aPower = attackerPower.total_combat_power;
    const dPower = defenderPower?.total_combat_power ?? 0;
    const powerRatio = dPower <= 0 ? (aPower > 0 ? 999 : 0) : aPower / dPower;

    let outcome: BattleOutcome;
    if (dPower <= 0 && aPower > 0) {
      outcome = 'attacker_victory';
    } else if (powerRatio >= ATTACKER_VICTORY_THRESHOLD) {
      outcome = 'attacker_victory';
    } else if (powerRatio < STALEMATE_LOWER_BOUND) {
      outcome = 'defender_victory';
    } else {
      outcome = 'stalemate';
    }

    // --- Casualties ---
    const urbanCasMult = getUrbanCasualtyMult(settlementToMun, targetSid);
    const casualties = computeBattleCasualties(
      aPower, dPower, powerRatio, urbanCasMult, terrain.composite,
      preBattleSnaps, formation, defenderFormationOrNull,
      defenderFormationOrNull ? undefined : (defGarrison > 0 ? defGarrison : undefined)
    );

    // --- Post-battle snaps ---
    const postBattleSnaps = evaluatePostBattleSnaps(formation, defenderFormationOrNull, casualties);
    const allSnaps = [...preBattleSnaps.events, ...postBattleSnaps];

    // --- Pyrrhic victory check ---
    if (outcome === 'attacker_victory') {
      const attackerPersonnel = formation.personnel ?? 0;
      const attackerLoss = totalPersonnelLoss(casualties.attacker);
      if (attackerPersonnel > 0 && attackerLoss / attackerPersonnel >= PYRRHIC_THRESHOLD) {
        outcome = 'pyrrhic_victory';
        allSnaps.push({
          type: 'pyrrhic_victory',
          description: `${formation.name ?? formationId} won but at terrible cost`,
          affected_formation: formationId,
          mechanical_effect: `cohesion -${PYRRHIC_COHESION_PENALTY}, brigade disrupted`
        });
      }
    }

    // --- Apply results ---
    const settlementFlipped = outcome === 'attacker_victory' || outcome === 'pyrrhic_victory';

    if (settlementFlipped) {
      (state.political_controllers as Record<SettlementId, FactionId>)[targetSid] = attackerFaction;
      report.flips_applied += 1;
      if (defenderFormation) {
        if (preBattleSnaps.isSurrenderCascade) {
          applySurrenderCapture(defenderFormation, formation);
        } else {
          const loserAoRSize = getBrigadeAoRSettlements(state, defenderBrigadeId!).length;
          captureEquipment(defenderFormation, formation, loserAoRSize);
        }
      }
      // Phase D: first attacker by ID claims the settlement in its AoR
      (state.brigade_aor as Record<SettlementId, FormationId | null>)[targetSid] = formationId;
    }

    const totalAttackerLoss = totalPersonnelLoss(casualties.attacker);
    const totalAttackerPersonnel = attackerIds.reduce((s, id) => s + (formations[id]?.personnel ?? 0), 0);
    for (let i = 0; i < attackerIds.length; i++) {
      const aid = attackerIds[i];
      const af = formations[aid];
      if (!af) continue;
      const share = totalAttackerPersonnel > 0 ? (af.personnel ?? 0) / totalAttackerPersonnel : 1 / attackerIds.length;
      const loss = Math.round(totalAttackerLoss * share);
      applyPersonnelLoss(af, loss);
      addWoundedPending(af, Math.round(casualties.attacker.wounded * share));
      const tankShare = attackerIds.length === 1 ? 1 : share;
      applyEquipmentBattleLoss(af, Math.floor(casualties.attacker.tanks_lost * tankShare), Math.floor(casualties.attacker.artillery_lost * tankShare));
      const ledger = state.casualty_ledger!;
      recordBattleCasualties(ledger, attackerFaction, aid, {
        killed: Math.floor(casualties.attacker.killed * share),
        wounded: Math.floor(casualties.attacker.wounded * share),
        missing_captured: Math.floor(casualties.attacker.missing_captured * share)
      });
      recordEquipmentLoss(ledger, attackerFaction, { tanks: Math.floor(casualties.attacker.tanks_lost * tankShare), artillery: Math.floor(casualties.attacker.artillery_lost * tankShare) });
    }

    if (defenderFormation) {
      const defenderPersonnel = defenderFormation.personnel ?? 0;
      const defenderApplicable = Math.max(0, defenderPersonnel - MIN_COMBAT_PERSONNEL);
      applyPersonnelLoss(defenderFormation, Math.min(totalPersonnelLoss(casualties.defender), defenderApplicable));
      addWoundedPending(defenderFormation, casualties.defender.wounded);
      applyEquipmentBattleLoss(defenderFormation, casualties.defender.tanks_lost, casualties.defender.artillery_lost);
    } else if (defGarrison > 0) {
      const mun = settlementToMun.get(targetSid);
      if (mun && state.militia_pools) {
        const poolKey = militiaPoolKey(mun, defenderFaction!);
        const pool = state.militia_pools[poolKey];
        if (pool && typeof pool.available === 'number') {
          pool.available = Math.max(0, pool.available - totalPersonnelLoss(casualties.defender));
        }
      }
    }

    for (const snap of allSnaps) {
      if (snap.type === 'commander_casualty') {
        const affected = formations[snap.affected_formation];
        if (affected) applyCommanderCasualtyEffects(affected);
      }
      if (snap.type === 'pyrrhic_victory' && snap.affected_formation === formationId) {
        if (typeof formation.cohesion === 'number') {
          formation.cohesion = Math.max(0, formation.cohesion - PYRRHIC_COHESION_PENALTY);
        }
        formation.disrupted = true;
      }
    }

    if (defenderFormation && defenderBrigadeId) {
      const ledger = state.casualty_ledger!;
      recordBattleCasualties(ledger, defenderFaction!, defenderBrigadeId, {
        killed: casualties.defender.killed,
        wounded: casualties.defender.wounded,
        missing_captured: casualties.defender.missing_captured
      });
      recordEquipmentLoss(ledger, defenderFaction!, {
        tanks: casualties.defender.tanks_lost,
        artillery: casualties.defender.artillery_lost
      });
    }

    // Build battle report
    const battleReport: BattleReport = {
      turn,
      attacker_brigade: formationId,
      defender_brigade: defenderBrigadeId ?? null,
      attacker_faction: attackerFaction,
      defender_faction: defenderFaction!,
      location: targetSid,
      attacker_power: attackerPower,
      defender_power: defenderPower,
      terrain_modifiers: terrain,
      power_ratio: Math.round(powerRatio * 100) / 100,
      outcome,
      casualties,
      settlement_flipped: settlementFlipped,
      snap_events: allSnaps
    };

    report.battles.push(battleReport);
    report.battles_fought += 1;
    report.total_attacker_casualties = addCasualties(report.total_attacker_casualties, casualties.attacker);
    report.total_defender_casualties = addCasualties(report.total_defender_casualties, casualties.defender);
  }

  // Sort battles deterministically
  report.battles.sort((a, b) => {
    const c = strictCompare(a.attacker_brigade, b.attacker_brigade);
    if (c !== 0) return c;
    return strictCompare(a.location, b.location);
  });

  // Clear consumed orders
  delete state.brigade_attack_orders;

  return report;
}
