/**
 * Phase I §4.8: RBiH–HRHB alliance update (per-turn deterministic).
 *
 * Drivers:
 *   (a) appeasement:  +APPEASEMENT_BASE_RATE when no bilateral incidents
 *   (b) patron_drag:  -PATRON_PRESSURE_COEFF * hrhb_patron_commitment
 *   (c) incident:     -INCIDENT_PENALTY_PER_FLIP * bilateral_flips_last_turn
 *   (d) ceasefire:    +CEASEFIRE_RECOVERY_RATE when ceasefire active
 *
 * Update is one-turn-delayed for incidents (this turn's flips feed next turn's update).
 * Canon: Phase_I_Specification_v0_4_0.md §4.8; Engine Invariants §J.
 */

import type { GameState, RbihHrhbState, FactionId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

// ── Tunable constants (all canon-referenced, version-controlled) ──

/** Positive drift per turn toward alliance when no bilateral incidents occurred last turn. */
export const APPEASEMENT_BASE_RATE = 0.003;
/** Negative drift per turn from HRHB patron commitment pressure. */
export const PATRON_PRESSURE_COEFF = 0.015;
/** Penalty per bilateral RBiH–HRHB control flip from the *previous* turn. */
export const INCIDENT_PENALTY_PER_FLIP = 0.04;
/** Positive recovery per turn when ceasefire is active. */
export const CEASEFIRE_RECOVERY_RATE = 0.015;

/** Threshold above which RBiH and HRHB are considered allied (no bilateral flips). */
export const ALLIED_THRESHOLD = 0.20;
/** Threshold below which open war mechanics (minority erosion) begin. */
export const HOSTILE_THRESHOLD = 0.00;
/** Threshold for "strong alliance" (full coordination, joint defense). */
export const STRONG_ALLIANCE_THRESHOLD = 0.50;
/** Threshold for "full war" (maximum pressure, formation displacement). */
export const FULL_WAR_THRESHOLD = -0.50;

/** Default initial alliance value (fragile alliance, April 1992). */
export const DEFAULT_INIT_ALLIANCE = 0.35;

/** Default mixed municipalities with both RBiH and HRHB formations. */
export const DEFAULT_MIXED_MUNICIPALITIES: readonly string[] = [
  'bugojno',
  'busovaca',
  'kiseljak',
  'mostar',
  'novi_travnik',
  'travnik',
  'vitez'
];

export type AlliancePhase = 'strong_alliance' | 'fragile_alliance' | 'strained' | 'open_war' | 'full_war';

export function getAlliancePhase(value: number): AlliancePhase {
  if (value > STRONG_ALLIANCE_THRESHOLD) return 'strong_alliance';
  if (value > ALLIED_THRESHOLD) return 'fragile_alliance';
  if (value > HOSTILE_THRESHOLD) return 'strained';
  if (value >= FULL_WAR_THRESHOLD) return 'open_war';
  return 'full_war';
}

export function areRbihHrhbAllied(state: GameState): boolean {
  const value = state.phase_i_alliance_rbih_hrhb;
  if (value === undefined || value === null) return true; // absent = allied
  return value > ALLIED_THRESHOLD;
}

export function isRbihHrhbAtWar(state: GameState): boolean {
  const value = state.phase_i_alliance_rbih_hrhb;
  if (value === undefined || value === null) return false;
  return value <= HOSTILE_THRESHOLD;
}

export interface AllianceUpdateReport {
  previous_value: number;
  new_value: number;
  delta: number;
  drivers: {
    appeasement: number;
    patron_drag: number;
    incident_penalty: number;
    ceasefire_boost: number;
  };
  phase: AlliancePhase;
  war_started_this_turn: boolean;
  locked: boolean;
}

/**
 * Initialize rbih_hrhb_state if absent.
 */
export function ensureRbihHrhbState(state: GameState, initValue?: number, initMixedMunicipalities?: string[]): void {
  if (state.phase_i_alliance_rbih_hrhb === undefined || state.phase_i_alliance_rbih_hrhb === null) {
    state.phase_i_alliance_rbih_hrhb = initValue ?? DEFAULT_INIT_ALLIANCE;
  }
  if (!state.rbih_hrhb_state) {
    const mixed = initMixedMunicipalities
      ? [...initMixedMunicipalities].sort(strictCompare)
      : [...DEFAULT_MIXED_MUNICIPALITIES].sort(strictCompare);
    (state as any).rbih_hrhb_state = {
      war_started_turn: null,
      ceasefire_active: false,
      ceasefire_since_turn: null,
      washington_signed: false,
      washington_turn: null,
      stalemate_turns: 0,
      bilateral_flips_this_turn: 0,
      total_bilateral_flips: 0,
      allied_mixed_municipalities: mixed
    } satisfies RbihHrhbState;
  }
}

/**
 * Per-turn alliance value update (Phase I §4.8). Pure function of state; no randomness.
 * Must run BEFORE control flip (so this turn's threshold governs flip eligibility).
 * Uses bilateral_flips_this_turn from PREVIOUS turn (one-turn-delayed feedback).
 */
export function updateAllianceValue(state: GameState): AllianceUpdateReport {
  ensureRbihHrhbState(state);
  const rhs = state.rbih_hrhb_state!;

  const previousValue = state.phase_i_alliance_rbih_hrhb!;

  // If Washington signed, alliance is locked — no update.
  if (rhs.washington_signed) {
    return {
      previous_value: previousValue,
      new_value: previousValue,
      delta: 0,
      drivers: { appeasement: 0, patron_drag: 0, incident_penalty: 0, ceasefire_boost: 0 },
      phase: getAlliancePhase(previousValue),
      war_started_this_turn: false,
      locked: true
    };
  }

  // Retrieve HRHB patron_commitment (default 0 if absent)
  const hrhbFaction = (state.factions ?? []).find((f) => f.id === 'HRHB');
  const patronCommitment = hrhbFaction?.patron_state?.patron_commitment ?? 0;

  // One-turn-delayed feedback: bilateral_flips_this_turn is from the PREVIOUS turn's control flip step.
  const bilateralFlipsLastTurn = rhs.bilateral_flips_this_turn;
  const noIncidents = bilateralFlipsLastTurn === 0;

  // Compute drivers
  const appeasement = APPEASEMENT_BASE_RATE * (noIncidents ? 1.0 : 0.3);
  const patronDrag = PATRON_PRESSURE_COEFF * patronCommitment;
  const incidentPenalty = INCIDENT_PENALTY_PER_FLIP * bilateralFlipsLastTurn;
  const ceasefireBoost = rhs.ceasefire_active ? CEASEFIRE_RECOVERY_RATE : 0;

  const delta = appeasement - patronDrag - incidentPenalty + ceasefireBoost;

  // Apply delta, clamp to [-1, 1]
  let newValue = Math.max(-1, Math.min(1, previousValue + delta));
  // Phase I §4.8 (historical fidelity): no open war before rbih_hrhb_war_earliest_turn (e.g. Oct 1992 for Apr 1992 start).
  const earliestTurn = state.meta.rbih_hrhb_war_earliest_turn ?? 26;
  if (state.meta.turn < earliestTurn) {
    newValue = Math.max(newValue, ALLIED_THRESHOLD);
  }
  state.phase_i_alliance_rbih_hrhb = newValue;

  // Track war start (only after earliest turn)
  let warStartedThisTurn = false;
  if (
    state.meta.turn >= earliestTurn &&
    rhs.war_started_turn === null &&
    newValue <= HOSTILE_THRESHOLD
  ) {
    rhs.war_started_turn = state.meta.turn;
    warStartedThisTurn = true;
  }

  // Reset bilateral flips for this turn (will be populated by control flip step)
  rhs.bilateral_flips_this_turn = 0;

  return {
    previous_value: previousValue,
    new_value: newValue,
    delta,
    drivers: {
      appeasement,
      patron_drag: patronDrag,
      incident_penalty: incidentPenalty,
      ceasefire_boost: ceasefireBoost
    },
    phase: getAlliancePhase(newValue),
    war_started_this_turn: warStartedThisTurn,
    locked: false
  };
}

/**
 * Count bilateral RBiH–HRHB flips from a control flip report.
 * Called AFTER control flip step to populate rhs.bilateral_flips_this_turn.
 */
export function countBilateralFlips(
  state: GameState,
  flips: Array<{ mun_id: string; from_faction: FactionId | null; to_faction: FactionId }>
): number {
  const rhs = state.rbih_hrhb_state;
  if (!rhs) return 0;

  let count = 0;
  for (const flip of flips) {
    const from = flip.from_faction;
    const to = flip.to_faction;
    if (
      (from === 'RBiH' && to === 'HRHB') ||
      (from === 'HRHB' && to === 'RBiH')
    ) {
      count++;
    }
  }

  rhs.bilateral_flips_this_turn = count;
  rhs.total_bilateral_flips += count;

  // Update stalemate counter
  if (count === 0) {
    rhs.stalemate_turns++;
  } else {
    rhs.stalemate_turns = 0;
  }

  return count;
}
