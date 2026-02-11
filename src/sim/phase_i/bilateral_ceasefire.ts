/**
 * Phase I §4.8: RBiH–HRHB bilateral ceasefire evaluator (precondition-driven).
 *
 * Six preconditions (ALL must be true):
 *   C1: war duration >= CEASEFIRE_MIN_WAR_DURATION turns since war_started_turn
 *   C2: HRHB exhaustion > CEASEFIRE_HRHB_EXHAUSTION
 *   C3: RBiH exhaustion > CEASEFIRE_RBIH_EXHAUSTION
 *   C4: stalemate >= CEASEFIRE_STALEMATE_MIN consecutive turns with 0 bilateral flips
 *   C5: IVP negotiation_momentum > CEASEFIRE_IVP_THRESHOLD
 *   C6: HRHB patron_state.constraint_severity > CEASEFIRE_PATRON_CONSTRAINT
 *
 * Effects:
 *   - Freeze all RBiH–HRHB flips (ceasefire_active = true)
 *   - Alliance recovery begins (+CEASEFIRE_RECOVERY_RATE/turn via alliance_update)
 *   - Bots stop targeting each other; redirect to RS (bot layer reads ceasefire_active)
 *   - Minority erosion halted (erosion step checks ceasefire_active)
 *
 * Canon: Phase_I_Specification_v0_4_0.md §4.8; Engine_Invariants §J.
 */

import type { GameState } from '../../state/game_state.js';

// ── Tunable ceasefire precondition thresholds ──

/** C1: Minimum turns of war before ceasefire can fire. */
export const CEASEFIRE_MIN_WAR_DURATION = 20;
/** C2: HRHB exhaustion threshold. */
export const CEASEFIRE_HRHB_EXHAUSTION = 35;
/** C3: RBiH exhaustion threshold. */
export const CEASEFIRE_RBIH_EXHAUSTION = 30;
/** C4: Minimum consecutive stalemate turns (0 bilateral flips). */
export const CEASEFIRE_STALEMATE_MIN = 4;
/** C5: IVP negotiation_momentum threshold. */
export const CEASEFIRE_IVP_THRESHOLD = 0.40;
/** C6: HRHB patron constraint_severity threshold. */
export const CEASEFIRE_PATRON_CONSTRAINT = 0.45;

export interface CeasefirePreconditionResult {
  c1_war_duration: boolean;
  c2_hrhb_exhaustion: boolean;
  c3_rbih_exhaustion: boolean;
  c4_stalemate: boolean;
  c5_ivp_momentum: boolean;
  c6_patron_constraint: boolean;
  all_met: boolean;
}

export interface CeasefireCheckReport {
  preconditions: CeasefirePreconditionResult;
  fired: boolean;
  already_active: boolean;
}

/**
 * Evaluate ceasefire preconditions. Pure function of state.
 */
export function evaluateCeasefirePreconditions(state: GameState): CeasefirePreconditionResult {
  const rhs = state.rbih_hrhb_state;
  const turn = state.meta.turn;

  // C1: war duration
  const warStartedTurn = rhs?.war_started_turn ?? null;
  const warDuration = warStartedTurn !== null ? turn - warStartedTurn : 0;
  const c1 = warDuration >= CEASEFIRE_MIN_WAR_DURATION;

  // C2: HRHB exhaustion
  const hrhbExhaustion = state.phase_ii_exhaustion?.['HRHB'] ?? 0;
  const c2 = hrhbExhaustion > CEASEFIRE_HRHB_EXHAUSTION;

  // C3: RBiH exhaustion
  const rbihExhaustion = state.phase_ii_exhaustion?.['RBiH'] ?? 0;
  const c3 = rbihExhaustion > CEASEFIRE_RBIH_EXHAUSTION;

  // C4: stalemate
  const stalemateturns = rhs?.stalemate_turns ?? 0;
  const c4 = stalemateturns >= CEASEFIRE_STALEMATE_MIN;

  // C5: IVP negotiation_momentum
  const ivp = state.international_visibility_pressure;
  const negotiationMomentum = ivp?.negotiation_momentum ?? 0;
  const c5 = negotiationMomentum > CEASEFIRE_IVP_THRESHOLD;

  // C6: HRHB patron constraint_severity
  const hrhbFaction = (state.factions ?? []).find((f) => f.id === 'HRHB');
  const constraintSeverity = hrhbFaction?.patron_state?.constraint_severity ?? 0;
  const c6 = constraintSeverity > CEASEFIRE_PATRON_CONSTRAINT;

  return {
    c1_war_duration: c1,
    c2_hrhb_exhaustion: c2,
    c3_rbih_exhaustion: c3,
    c4_stalemate: c4,
    c5_ivp_momentum: c5,
    c6_patron_constraint: c6,
    all_met: c1 && c2 && c3 && c4 && c5 && c6
  };
}

/**
 * Check and apply ceasefire if all preconditions met. Deterministic; no randomness.
 * Must run AFTER alliance update, BEFORE Washington check.
 */
export function checkAndApplyCeasefire(state: GameState): CeasefireCheckReport {
  const rhs = state.rbih_hrhb_state;
  if (!rhs) {
    return {
      preconditions: {
        c1_war_duration: false,
        c2_hrhb_exhaustion: false,
        c3_rbih_exhaustion: false,
        c4_stalemate: false,
        c5_ivp_momentum: false,
        c6_patron_constraint: false,
        all_met: false
      },
      fired: false,
      already_active: false
    };
  }

  // Already active or Washington signed — no re-evaluation needed
  if (rhs.ceasefire_active) {
    return {
      preconditions: evaluateCeasefirePreconditions(state),
      fired: false,
      already_active: true
    };
  }
  if (rhs.washington_signed) {
    return {
      preconditions: evaluateCeasefirePreconditions(state),
      fired: false,
      already_active: false
    };
  }

  const preconditions = evaluateCeasefirePreconditions(state);
  if (!preconditions.all_met) {
    return { preconditions, fired: false, already_active: false };
  }

  // Fire ceasefire
  rhs.ceasefire_active = true;
  rhs.ceasefire_since_turn = state.meta.turn;

  return { preconditions, fired: true, already_active: false };
}
