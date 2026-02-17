/**
 * Phase B Step 5: Declaration Pressure System (Phase_0_Specification_v0_4_0.md §4.4).
 *
 * RS and HRHB declarations are NOT player-triggered; they emerge when enabling conditions
 * are met and pressure accumulates. Declaration does NOT start war (war gated by referendum).
 */

import type { GameState, FactionId } from '../state/game_state.js';

/** RS pressure per turn when all enabling conditions met (Phase_0_Spec §4.4.1). */
export const RS_PRESSURE_PER_TURN = 10;

/** HRHB pressure per turn when all enabling conditions met (Phase_0_Spec §4.4.2). */
export const HRHB_PRESSURE_PER_TURN = 8;

/** Pressure threshold; when reached, faction declares (Phase_0_Spec §4.4). */
export const DECLARATION_PRESSURE_THRESHOLD = 100;

/** Faction IDs that can declare (RS, HRHB). RBiH does not declare. */
export const DECLARING_FACTIONS: readonly FactionId[] = ['RS', 'HRHB'];

/**
 * Optional lookups for enabling conditions. When a lookup is omitted, that condition
 * is treated as not met (no pressure accumulation). Production callers must supply
 * real data; tests supply mocks.
 */
export interface DeclarationPressureOptions {
  /** RS §4.4.1: RS org penetration in Serb-majority municipalities coverage (0–100). Need ≥ 60. */
  getRsOrgCoverageSerbMajority?: (state: GameState) => number;
  /** RS §4.4.1: JNA transition triggered or imminent. */
  getJnaCoordinationTriggered?: (state: GameState) => boolean;
  /** RS §4.4.1: RBiH–RS relationship. Need ≤ -0.5 (hostile). */
  getRbhRsRelationship?: (state: GameState) => number;
  /** RS §4.4.1: FRY (Serbia) recognition confirmed. */
  getFryRecognitionConfirmed?: (state: GameState) => boolean;
  /** HRHB §4.4.2: HRHB org penetration in Croat-majority municipalities coverage (0–100). Need ≥ 50. */
  getHrhbOrgCoverageCroatMajority?: (state: GameState) => number;
  /** HRHB §4.4.2: Croatian government support confirmed. */
  getCroatiaSupportConfirmed?: (state: GameState) => boolean;
  /** HRHB §4.4.2: RBiH–HRHB relationship. Need ≤ +0.2 (strained or worse). */
  getRbhHrhbRelationship?: (state: GameState) => number;
  /** Optional RS relationship threshold override (default -0.5). */
  rsRelationshipThreshold?: number;
  /** Optional RS organizational coverage threshold override (default 60). */
  rsOrgCoverageThreshold?: number;
  /** Optional HRHB relationship threshold override (default +0.2). */
  hrhbRelationshipThreshold?: number;
  /** Optional HRHB organizational coverage threshold override (default 50). */
  hrhbOrgCoverageThreshold?: number;
  /** Optional RS declaration pressure threshold override (default 100). */
  rsPressureThreshold?: number;
  /** Optional HRHB declaration pressure threshold override (default 100). */
  hrhbPressureThreshold?: number;
  /** Optional RS pressure-per-turn override (default 10). */
  rsPressurePerTurn?: number;
  /** Optional HRHB pressure-per-turn override (default 8). */
  hrhbPressurePerTurn?: number;
  /** Optional HRHB war-context override. Default behavior requires RS declared. */
  isHrhbWarContextSatisfied?: (state: GameState) => boolean;
}

function getFiniteNumberOrDefault(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getPositiveIntOrDefault(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function getFaction(state: GameState, factionId: FactionId) {
  return state.factions.find((f) => f.id === factionId);
}

function ensureDeclarationState(state: GameState, factionId: FactionId): void {
  const faction = getFaction(state, factionId);
  if (!faction) return;
  if (faction.declaration_pressure === undefined) faction.declaration_pressure = 0;
  if (faction.declared === undefined) faction.declared = false;
  if (faction.declaration_turn === undefined) faction.declaration_turn = null;
}

/**
 * RS enabling conditions (§4.4.1). All four must be true for RS pressure to accumulate.
 * Missing options are treated as condition not met.
 */
export function areRsEnablingConditionsMet(
  state: GameState,
  options: DeclarationPressureOptions = {}
): boolean {
  const rs = getFaction(state, 'RS');
  if (!rs || rs.declared) return false;

  const cov = options.getRsOrgCoverageSerbMajority?.(state);
  const rsOrgCoverageThreshold = getFiniteNumberOrDefault(options.rsOrgCoverageThreshold, 60);
  if (cov === undefined || cov < rsOrgCoverageThreshold) return false;

  if (!options.getJnaCoordinationTriggered?.(state)) return false;

  const rel = options.getRbhRsRelationship?.(state);
  const rsRelationshipThreshold = getFiniteNumberOrDefault(options.rsRelationshipThreshold, -0.5);
  if (rel === undefined || rel > rsRelationshipThreshold) return false;

  if (!options.getFryRecognitionConfirmed?.(state)) return false;

  return true;
}

/**
 * HRHB enabling conditions (§4.4.2). All four must be true, including war-context.
 * Default war-context is RS declared; callers may override to model sustained-violence context.
 * Missing options are treated as condition not met.
 */
export function areHrhbEnablingConditionsMet(
  state: GameState,
  options: DeclarationPressureOptions = {}
): boolean {
  const hrhb = getFaction(state, 'HRHB');
  const rs = getFaction(state, 'RS');
  if (!hrhb || hrhb.declared) return false;
  const hasWarContext = options.isHrhbWarContextSatisfied
    ? options.isHrhbWarContextSatisfied(state)
    : Boolean(rs?.declared);
  if (!hasWarContext) return false;

  const cov = options.getHrhbOrgCoverageCroatMajority?.(state);
  const hrhbOrgCoverageThreshold = getFiniteNumberOrDefault(options.hrhbOrgCoverageThreshold, 50);
  if (cov === undefined || cov < hrhbOrgCoverageThreshold) return false;

  if (!options.getCroatiaSupportConfirmed?.(state)) return false;

  const rel = options.getRbhHrhbRelationship?.(state);
  const hrhbRelationshipThreshold = getFiniteNumberOrDefault(options.hrhbRelationshipThreshold, 0.2);
  if (rel === undefined || rel > hrhbRelationshipThreshold) return false;

  return true;
}

/**
 * Accumulate declaration pressure for RS and HRHB (when conditions met) and trigger
 * declaration when pressure ≥ DECLARATION_PRESSURE_THRESHOLD.
 * Process order: RS first, then HRHB (deterministic).
 * Does NOT set referendum_held, war_start_turn, or referendum_eligible_turn; declaration
 * does not start war (Phase_0_Spec §4.5, §6).
 */
export function accumulateDeclarationPressure(
  state: GameState,
  turn: number,
  options: DeclarationPressureOptions = {}
): void {
  ensureDeclarationState(state, 'RS');
  ensureDeclarationState(state, 'HRHB');

  const rs = getFaction(state, 'RS');
  const hrhb = getFaction(state, 'HRHB');

  const rsPressurePerTurn = getPositiveIntOrDefault(options.rsPressurePerTurn, RS_PRESSURE_PER_TURN);
  const hrhbPressurePerTurn = getPositiveIntOrDefault(options.hrhbPressurePerTurn, HRHB_PRESSURE_PER_TURN);
  const rsPressureThreshold = getPositiveIntOrDefault(
    options.rsPressureThreshold,
    DECLARATION_PRESSURE_THRESHOLD
  );
  const hrhbPressureThreshold = getPositiveIntOrDefault(
    options.hrhbPressureThreshold,
    DECLARATION_PRESSURE_THRESHOLD
  );

  if (rs && !rs.declared && areRsEnablingConditionsMet(state, options)) {
    const current = rs.declaration_pressure ?? 0;
    rs.declaration_pressure = Math.min(current + rsPressurePerTurn, rsPressureThreshold);
    if (rs.declaration_pressure >= rsPressureThreshold) {
      rs.declared = true;
      rs.declaration_turn = turn;
    }
  }

  if (hrhb && !hrhb.declared && areHrhbEnablingConditionsMet(state, options)) {
    const current = hrhb.declaration_pressure ?? 0;
    hrhb.declaration_pressure = Math.min(current + hrhbPressurePerTurn, hrhbPressureThreshold);
    if (hrhb.declaration_pressure >= hrhbPressureThreshold) {
      hrhb.declared = true;
      hrhb.declaration_turn = turn;
    }
  }
}
