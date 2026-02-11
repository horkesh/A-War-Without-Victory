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
  if (cov === undefined || cov < 60) return false;

  if (!options.getJnaCoordinationTriggered?.(state)) return false;

  const rel = options.getRbhRsRelationship?.(state);
  if (rel === undefined || rel > -0.5) return false;

  if (!options.getFryRecognitionConfirmed?.(state)) return false;

  return true;
}

/**
 * HRHB enabling conditions (§4.4.2). All four must be true, including RS having declared.
 * Missing options are treated as condition not met.
 */
export function areHrhbEnablingConditionsMet(
  state: GameState,
  options: DeclarationPressureOptions = {}
): boolean {
  const hrhb = getFaction(state, 'HRHB');
  const rs = getFaction(state, 'RS');
  if (!hrhb || hrhb.declared) return false;
  if (!rs || !rs.declared) return false;

  const cov = options.getHrhbOrgCoverageCroatMajority?.(state);
  if (cov === undefined || cov < 50) return false;

  if (!options.getCroatiaSupportConfirmed?.(state)) return false;

  const rel = options.getRbhHrhbRelationship?.(state);
  if (rel === undefined || rel > 0.2) return false;

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

  if (rs && !rs.declared && areRsEnablingConditionsMet(state, options)) {
    const current = rs.declaration_pressure ?? 0;
    rs.declaration_pressure = Math.min(current + RS_PRESSURE_PER_TURN, DECLARATION_PRESSURE_THRESHOLD);
    if (rs.declaration_pressure >= DECLARATION_PRESSURE_THRESHOLD) {
      rs.declared = true;
      rs.declaration_turn = turn;
    }
  }

  if (hrhb && !hrhb.declared && areHrhbEnablingConditionsMet(state, options)) {
    const current = hrhb.declaration_pressure ?? 0;
    hrhb.declaration_pressure = Math.min(current + HRHB_PRESSURE_PER_TURN, DECLARATION_PRESSURE_THRESHOLD);
    if (hrhb.declaration_pressure >= DECLARATION_PRESSURE_THRESHOLD) {
      hrhb.declared = true;
      hrhb.declaration_turn = turn;
    }
  }
}
