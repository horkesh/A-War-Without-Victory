/**
 * Phase 0 Options Builder: derives real DeclarationPressureOptions from GameState.
 *
 * Replaces the empty `{}` options passed to runPhase0Turn with real lookups
 * so declaration pressure actually accumulates when enabling conditions are met.
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import type { GameState, FactionId, MunicipalityId } from '../state/game_state.js';
import type { Phase0TurnOptions } from './turn.js';
import type { DeclarationPressureOptions } from './declaration_pressure.js';
import { strictCompare } from '../state/validateGameState.js';

/**
 * Historical turn thresholds for time-based enabling conditions.
 * Turn 0 = Week 1 of September 1991.
 */
const JNA_COORDINATION_TURN = 13;   // ~December 1991: Germany recognizes Croatia
const FRY_RECOGNITION_TURN = 13;     // Same period: FRY recognition follows
const CROATIA_SUPPORT_TURN = 17;     // ~January 1992: Croatia-HRHB cooperation intensifies

/**
 * Default historical relationship schedule (if state.phase0_relationships is absent).
 * RBiH-RS degrades over time; always hostile.
 */
function defaultRbihRsRelationship(turn: number): number {
  if (turn <= 8) return -0.2;   // Tense
  if (turn <= 16) return -0.4;  // Deteriorating
  return -0.6;                   // Hostile
}

/**
 * Default historical relationship schedule for RBiH-HRHB (if state.phase0_relationships is absent).
 * Starts positive; slowly degrades.
 */
function defaultRbihHrhbRelationship(turn: number): number {
  if (turn <= 12) return 0.5;   // Cooperative
  if (turn <= 20) return 0.3;   // Strained
  return 0.1;                    // Fragile
}

/**
 * Compute RS organizational coverage in Serb-majority municipalities (0-100).
 * A municipality counts as "covered" if it has any RS organizational penetration
 * (sds_penetration > 0 OR paramilitary_rs > 0).
 */
function computeRsOrgCoverage(state: GameState): number {
  if (!state.municipalities) return 0;

  const munIds = Object.keys(state.municipalities).sort(strictCompare);
  let serbMajorityCount = 0;
  let coveredCount = 0;

  for (const munId of munIds) {
    const mun = state.municipalities[munId];
    if (!mun) continue;
    const op = mun.organizational_penetration;

    // Identify Serb-majority: has SDS penetration or is RS-controlled
    const isSerbMajority =
      (op?.sds_penetration !== undefined && op.sds_penetration > 0) ||
      (state.political_controllers?.[munId] === 'RS');

    if (!isSerbMajority) continue;
    serbMajorityCount++;

    // Check if RS has organizational coverage
    const hasCoverage =
      (op?.sds_penetration !== undefined && op.sds_penetration > 0) ||
      (op?.paramilitary_rs !== undefined && op.paramilitary_rs > 0) ||
      (op?.police_loyalty === 'loyal' && state.political_controllers?.[munId] === 'RS');

    if (hasCoverage) coveredCount++;
  }

  if (serbMajorityCount === 0) return 0;
  return Math.round((coveredCount / serbMajorityCount) * 100);
}

/**
 * Compute HRHB organizational coverage in Croat-majority municipalities (0-100).
 */
function computeHrhbOrgCoverage(state: GameState): number {
  if (!state.municipalities) return 0;

  const munIds = Object.keys(state.municipalities).sort(strictCompare);
  let croatMajorityCount = 0;
  let coveredCount = 0;

  for (const munId of munIds) {
    const mun = state.municipalities[munId];
    if (!mun) continue;
    const op = mun.organizational_penetration;

    // Identify Croat-majority: has HDZ penetration or is HRHB-controlled
    const isCroatMajority =
      (op?.hdz_penetration !== undefined && op.hdz_penetration > 0) ||
      (state.political_controllers?.[munId] === 'HRHB');

    if (!isCroatMajority) continue;
    croatMajorityCount++;

    // Check if HRHB has organizational coverage
    const hasCoverage =
      (op?.hdz_penetration !== undefined && op.hdz_penetration > 0) ||
      (op?.paramilitary_hrhb !== undefined && op.paramilitary_hrhb > 0);

    if (hasCoverage) coveredCount++;
  }

  if (croatMajorityCount === 0) return 0;
  return Math.round((coveredCount / croatMajorityCount) * 100);
}

/**
 * Build Phase0TurnOptions from current GameState.
 * Provides real lookups for declaration pressure enabling conditions,
 * referendum options, and stability score computation.
 */
export function buildPhase0TurnOptions(state: GameState): Phase0TurnOptions {
  const turn = state.meta.turn;
  const relationships = state.phase0_relationships;

  const declarationPressure: DeclarationPressureOptions = {
    getRsOrgCoverageSerbMajority: (s: GameState) => computeRsOrgCoverage(s),

    getJnaCoordinationTriggered: (_s: GameState) => turn >= JNA_COORDINATION_TURN,

    getRbhRsRelationship: (_s: GameState) =>
      relationships?.rbih_rs ?? defaultRbihRsRelationship(turn),

    getFryRecognitionConfirmed: (_s: GameState) => turn >= FRY_RECOGNITION_TURN,

    getHrhbOrgCoverageCroatMajority: (s: GameState) => computeHrhbOrgCoverage(s),

    getCroatiaSupportConfirmed: (_s: GameState) => turn >= CROATIA_SUPPORT_TURN,

    getRbhHrhbRelationship: (_s: GameState) =>
      relationships?.rbih_hrhb ?? defaultRbihHrhbRelationship(turn),
  };

  return {
    declarationPressure,
    stability: {
      getController: (munId: MunicipalityId): FactionId | null =>
        state.political_controllers?.[munId] ?? null,
    },
  };
}
