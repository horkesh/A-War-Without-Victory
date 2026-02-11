

import type {
  GameState,
  FormationId,
  FactionId,
  FormationState,
  FormationReadinessState,
  FormationKind,
  MunicipalityId,
  MilitiaPoolState
} from './game_state.js';
import { strictCompare } from './validateGameState.js';

/**
 * Phase I.0: Formation lifecycle state management.
 * 
 * Systems Manual §5: "Formations progress through readiness states: Forming, Active, Overextended, and Degraded."
 * Systems Manual §13: "Militia emerge early with low cohesion. Formation of organized brigades requires time, authority, supply, and training."
 * Rulebook §6.1: "Early in the war, before coherent brigade fronts emerge, Areas of Responsibility are inactive."
 */

/**
 * Militia emergence rules (Systems Manual §13).
 * 
 * - Militia emerge early (turn < MILITIA_EMERGENCE_WINDOW)
 * - Low cohesion (MILITIA_BASE_COHESION < brigade baseline)
 * - Supply-sensitive (degradation faster than brigades)
 * - No AoR assignment by default (Rulebook §6.1)
 */
export const MILITIA_EMERGENCE_WINDOW = 6; // turns, early war period
export const MILITIA_BASE_COHESION = 30; // [0,100], low baseline
export const BRIGADE_BASE_COHESION = 60; // [0,100], standard baseline
export const BRIGADE_FORMATION_MIN_TURN = 3; // minimum turns before brigade can form

/**
 * Formation activation gating (Systems Manual §13).
 * 
 * Brigade activation requires:
 * - Time: created_turn + BRIGADE_FORMATION_MIN_TURN <= current_turn
 * - Authority: municipality authority >= BRIGADE_AUTHORITY_THRESHOLD
 * - Supply: formation supplied for at least 1 turn
 */
export const BRIGADE_AUTHORITY_THRESHOLD = 0.4; // [0,1], minimum authority for brigade activation

/** Authority value by control state (consolidated=full, contested=reduced, fragmented=minimal). */
const AUTHORITY_CONSOLIDATED = 1;
const AUTHORITY_CONTESTED = 0.5;
const AUTHORITY_FRAGMENTED = 0.2;

/**
 * Derive municipality authority map from political control state.
 * Deterministic: iterates municipalities in sorted order. Used by formation lifecycle for brigade activation gating.
 */
export function deriveMunicipalityAuthorityMap(state: GameState): Map<MunicipalityId, number> {
  const out = new Map<MunicipalityId, number>();
  const muns = state.municipalities ?? {};
  const munIds = Object.keys(muns).sort(strictCompare);
  for (const munId of munIds) {
    const control = muns[munId]?.control;
    const value =
      control === 'consolidated'
        ? AUTHORITY_CONSOLIDATED
        : control === 'fragmented'
          ? AUTHORITY_FRAGMENTED
          : AUTHORITY_CONTESTED;
    out.set(munId, value);
  }
  return out;
}

/**
 * Readiness state transition thresholds.
 * 
 * - Forming → Active: activation_gated = false, cohesion >= ACTIVE_MIN_COHESION
 * - Active → Overextended: cohesion < OVEREXTENDED_THRESHOLD OR fatigue > OVEREXTENDED_FATIGUE
 * - Overextended → Degraded: cohesion < DEGRADED_THRESHOLD OR fatigue > DEGRADED_FATIGUE
 * - Degraded → (cannot transition back to Active without reconstitution, not in scope)
 */
export const ACTIVE_MIN_COHESION = 40;
export const OVEREXTENDED_THRESHOLD = 30;
export const DEGRADED_THRESHOLD = 15;
export const OVEREXTENDED_FATIGUE = 20;
export const DEGRADED_FATIGUE = 40;

/**
 * Derive formation kind from formation properties and tags.
 * 
 * Rules:
 * - Explicit kind field takes precedence
 * - Tags: 'militia' → militia, 'territorial_defense' → territorial_defense, 'operational_group' → operational_group
 * - Default: 'brigade'
 */
export function deriveFormationKind(formation: FormationState): FormationKind {
  if (formation.kind) return formation.kind;
  
  // Infer from tags if present
  if (formation.tags) {
    if (formation.tags.includes('militia')) return 'militia';
    if (formation.tags.includes('territorial_defense')) return 'territorial_defense';
    if (formation.tags.includes('operational_group')) return 'operational_group';
    if (formation.tags.includes('corps_asset')) return 'corps_asset';
  }
  
  // Default to brigade
  return 'brigade';
}

/**
 * Compute base cohesion for a formation based on kind and creation context.
 */
export function computeBaseCohesion(kind: FormationKind, createdTurn: number): number {
  if (kind === 'militia') {
    // Militia have low cohesion, slightly higher if created later (some organization)
    const lateness = Math.min(createdTurn, MILITIA_EMERGENCE_WINDOW);
    return Math.floor(MILITIA_BASE_COHESION + lateness * 2); // max +12 if created at turn 6
  }
  
  if (kind === 'territorial_defense') {
    // TD units: between militia and brigade
    return Math.floor((MILITIA_BASE_COHESION + BRIGADE_BASE_COHESION) / 2);
  }
  
  // Brigade, OG, corps_asset: standard baseline
  return BRIGADE_BASE_COHESION;
}

/**
 * Check if a brigade formation can activate.
 * 
 * Requirements (Systems Manual §13):
 * - Time: created_turn + BRIGADE_FORMATION_MIN_TURN <= current_turn
 * - Authority: municipality authority >= BRIGADE_AUTHORITY_THRESHOLD (if can be derived)
 * - Supply: formation supplied this turn OR last_supplied_turn is recent
 */
export function canBrigadeActivate(
  state: GameState,
  formation: FormationState,
  supplied: boolean,
  municipalityAuthority: number | null
): boolean {
  const currentTurn = state.meta.turn;
  
  // Time gate
  const turnsForming = currentTurn - formation.created_turn;
  if (turnsForming < BRIGADE_FORMATION_MIN_TURN) {
    return false;
  }
  
  // Authority gate (if available)
  if (municipalityAuthority !== null && municipalityAuthority < BRIGADE_AUTHORITY_THRESHOLD) {
    return false;
  }
  
  // Supply gate: must be supplied now OR was supplied recently
  const lastSupplied = formation.ops?.last_supplied_turn ?? null;
  const wasRecentlySupplied = lastSupplied !== null && currentTurn - lastSupplied <= 2;
  if (!supplied && !wasRecentlySupplied) {
    return false;
  }
  
  return true;
}

/**
 * Derive readiness state from formation properties.
 * 
 * State machine (Systems Manual §5):
 * - Forming: activation_gated = true OR cohesion < ACTIVE_MIN_COHESION
 * - Active: cohesion >= ACTIVE_MIN_COHESION AND not overextended/degraded
 * - Overextended: cohesion < OVEREXTENDED_THRESHOLD OR fatigue > OVEREXTENDED_FATIGUE
 * - Degraded: cohesion < DEGRADED_THRESHOLD OR fatigue > DEGRADED_FATIGUE
 * 
 * Priority: Degraded > Overextended > Forming > Active
 */
export function deriveReadinessState(formation: FormationState): FormationReadinessState {
  const cohesion = formation.cohesion ?? BRIGADE_BASE_COHESION;
  const fatigue = formation.ops?.fatigue ?? 0;
  const activationGated = formation.activation_gated ?? false;
  
  // Degraded (terminal)
  if (cohesion < DEGRADED_THRESHOLD || fatigue > DEGRADED_FATIGUE) {
    return 'degraded';
  }
  
  // Overextended
  if (cohesion < OVEREXTENDED_THRESHOLD || fatigue > OVEREXTENDED_FATIGUE) {
    return 'overextended';
  }
  
  // Forming (waiting for activation)
  if (activationGated || cohesion < ACTIVE_MIN_COHESION) {
    return 'forming';
  }
  
  // Active
  return 'active';
}

/**
 * Apply cohesion degradation for unsupplied formations.
 * 
 * Rules:
 * - Militia: -3 cohesion per turn unsupplied (supply-sensitive)
 * - Brigade/TD: -2 cohesion per turn unsupplied
 * - OG/Corps: -1 cohesion per turn unsupplied (more resilient)
 * - Cohesion is clamped to [0, 100]
 */
export function applyCohesionDegradation(
  formation: FormationState,
  supplied: boolean
): number {
  if (supplied) return formation.cohesion ?? BRIGADE_BASE_COHESION;
  
  const kind = deriveFormationKind(formation);
  const current = formation.cohesion ?? computeBaseCohesion(kind, formation.created_turn);
  
  let degradation = 0;
  if (kind === 'militia') {
    degradation = 3; // supply-sensitive
  } else if (kind === 'brigade' || kind === 'territorial_defense') {
    degradation = 2;
  } else {
    degradation = 1; // OG, corps_asset more resilient
  }
  
  return Math.max(0, current - degradation);
}

/**
 * Formation lifecycle state report (per formation).
 */
export interface FormationLifecycleRecord {
  formation_id: FormationId;
  faction_id: FactionId;
  kind: FormationKind;
  readiness_before: FormationReadinessState;
  readiness_after: FormationReadinessState;
  cohesion_before: number;
  cohesion_after: number;
  activation_gated: boolean;
  activation_turn: number | null;
  supplied: boolean;
}

/**
 * Formation lifecycle state report (aggregate).
 */
export interface FormationLifecycleStepReport {
  by_formation: FormationLifecycleRecord[];
  by_faction: Array<{
    faction_id: FactionId;
    formations_total: number;
    formations_forming: number;
    formations_active: number;
    formations_overextended: number;
    formations_degraded: number;
    militia_count: number;
    brigade_count: number;
  }>;
}

/**
 * Update formation lifecycle states.
 * 
 * Per formation:
 * 1. Derive kind (if not set)
 * 2. Initialize cohesion (if not set)
 * 3. Check activation gates (for brigades in 'forming')
 * 4. Apply cohesion degradation (if unsupplied)
 * 5. Derive readiness state
 * 6. Update activation_turn when transitioning from forming to active
 */
export function updateFormationLifecycle(
  state: GameState,
  suppliedByFormation: Map<FormationId, boolean>,
  municipalityAuthorityByMun: Map<MunicipalityId, number>
): FormationLifecycleStepReport {
  const currentTurn = state.meta.turn;
  const formations = state.formations ?? {};
  
  const records: FormationLifecycleRecord[] = [];
  const factionStats = new Map<FactionId, {
    total: number;
    forming: number;
    active: number;
    overextended: number;
    degraded: number;
    militia: number;
    brigade: number;
  }>();
  
  // Process formations in deterministic order
  const formationIds = Object.keys(formations).sort();
  
  for (const formationId of formationIds) {
    const formation = formations[formationId];
    if (!formation || formation.status !== 'active') continue;
    
    const factionId = formation.faction;
    
    // 1. Derive kind (default to brigade for existing formations)
    const kind = deriveFormationKind(formation);
    if (!formation.kind) {
      formation.kind = kind;
    }
    
    // 2. Initialize cohesion (if not set)
    if (formation.cohesion === undefined) {
      formation.cohesion = computeBaseCohesion(kind, formation.created_turn);
    }
    
    const cohesionBefore = formation.cohesion;
    const readinessBefore = formation.readiness ?? deriveReadinessState(formation);
    
    // 3. Check activation gates (for brigades still forming)
    const supplied = suppliedByFormation.get(formationId) ?? true;
    
    if (readinessBefore === 'forming' && kind === 'brigade') {
      // Try to derive municipality authority from formation's origin
      let munAuthority: number | null = null;
      if (formation.tags) {
        const munTag = formation.tags.find(t => t.startsWith('mun:'));
        if (munTag) {
          const munId = munTag.slice(4);
          munAuthority = municipalityAuthorityByMun.get(munId) ?? null;
        }
      }
      
      const canActivate = canBrigadeActivate(state, formation, supplied, munAuthority);
      formation.activation_gated = !canActivate;
      
      // If now activated, record activation_turn
      if (canActivate && formation.activation_turn === null) {
        formation.activation_turn = currentTurn;
      }
    } else {
      // Non-brigade or already past forming: not gated
      formation.activation_gated = false;
    }
    
    // Initialize activation_turn if not set
    if (formation.activation_turn === undefined) {
      formation.activation_turn = null;
    }
    
    // 4. Apply cohesion degradation (if unsupplied)
    formation.cohesion = applyCohesionDegradation(formation, supplied);
    const cohesionAfter = formation.cohesion;
    
    // 5. Derive readiness state
    formation.readiness = deriveReadinessState(formation);
    const readinessAfter = formation.readiness;
    
    // Record
    records.push({
      formation_id: formationId,
      faction_id: factionId,
      kind,
      readiness_before: readinessBefore,
      readiness_after: readinessAfter,
      cohesion_before: cohesionBefore,
      cohesion_after: cohesionAfter,
      activation_gated: formation.activation_gated ?? false,
      activation_turn: formation.activation_turn ?? null,
      supplied
    });
    
    // Update faction stats
    const stats = factionStats.get(factionId) ?? {
      total: 0,
      forming: 0,
      active: 0,
      overextended: 0,
      degraded: 0,
      militia: 0,
      brigade: 0
    };
    stats.total += 1;
    if (readinessAfter === 'forming') stats.forming += 1;
    if (readinessAfter === 'active') stats.active += 1;
    if (readinessAfter === 'overextended') stats.overextended += 1;
    if (readinessAfter === 'degraded') stats.degraded += 1;
    if (kind === 'militia') stats.militia += 1;
    if (kind === 'brigade') stats.brigade += 1;
    factionStats.set(factionId, stats);
  }
  
  // Build faction summary
  const byFaction = Array.from(factionStats.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([faction_id, stats]) => ({
      faction_id,
      formations_total: stats.total,
      formations_forming: stats.forming,
      formations_active: stats.active,
      formations_overextended: stats.overextended,
      formations_degraded: stats.degraded,
      militia_count: stats.militia,
      brigade_count: stats.brigade
    }));
  
  return {
    by_formation: records,
    by_faction: byFaction
  };
}

/**
 * Militia emergence check: determine if a militia pool should spawn a militia formation.
 * 
 * Rules (Systems Manual §13):
 * - Militia emerge early (turn < MILITIA_EMERGENCE_WINDOW)
 * - Must have available manpower >= threshold
 * - Faction must be non-null
 * - Supply-sensitive: prefer supplied municipalities
 * 
 * This is a query function; actual spawn logic is in sim_generate_formations or turn pipeline.
 */
export function shouldMilitiaPoolSpawnMilitia(
  state: GameState,
  munId: MunicipalityId,
  pool: MilitiaPoolState,
  supplied: boolean,
  minManpower: number = 100
): boolean {
  const currentTurn = state.meta.turn;
  
  // Early war only
  if (currentTurn >= MILITIA_EMERGENCE_WINDOW) {
    return false;
  }
  
  // Must have faction
  if (!pool.faction) {
    return false;
  }
  
  // Must have sufficient manpower
  if (pool.available < minManpower) {
    return false;
  }
  
  // Supply-sensitive: unsupplied municipalities less likely (50% chance gate, deterministic by seed+turn)
  if (!supplied) {
    // Deterministic gate: use state seed + turn + munId
    const seed = state.meta.seed;
    const hash = simpleHash(`${seed}_${currentTurn}_${munId}`);
    if (hash % 2 === 0) {
      return false; // 50% gate
    }
  }
  
  return true;
}

/**
 * Simple deterministic hash for gating logic.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
