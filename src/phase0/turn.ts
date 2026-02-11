/**
 * Phase B Step 8: Phase 0 Turn Structure (Phase_0_Specification_v0_4_0.md §5).
 *
 * Runs the Pre-War turn sequence: declaration pressure, referendum eligibility,
 * stability update, war-start transition check, non-war terminal check.
 * Steps 1–3 (Directive, Investment, Alliance) are player/narrative driven;
 * this runner executes engine steps 4–10.
 */

import type { GameState, MunicipalityId } from '../state/game_state.js';
import type { FactionId } from '../state/game_state.js';
import type { GeographicInputs } from './stability.js';
import { accumulateDeclarationPressure, type DeclarationPressureOptions } from './declaration_pressure.js';
import {
  updateReferendumEligibility,
  applyPhase0ToPhaseITransition,
  checkReferendumDeadline,
  type ReferendumEligibilityOptions
} from './referendum.js';
import { updateAllStabilityScores } from './stability.js';

/**
 * Options for runPhase0Turn. Pass-through for declaration pressure, referendum,
 * and stability lookups. Omitted lookups use defaults (e.g. no pressure accumulation,
 * no referendum deadline override, stub stability inputs).
 */
export interface Phase0TurnOptions {
  /** Passed to accumulateDeclarationPressure (RS/HRHB enabling conditions). */
  declarationPressure?: DeclarationPressureOptions;
  /** Passed to updateReferendumEligibility (e.g. deadlineTurns). */
  referendum?: ReferendumEligibilityOptions;
  /** Passed to updateAllStabilityScores (controller, demographic, geographic). */
  stability?: {
    getController?: (munId: MunicipalityId) => FactionId | null;
    getControllerShare?: (munId: MunicipalityId) => number | undefined;
    getGeographic?: (munId: MunicipalityId) => GeographicInputs | undefined;
  };
}

/**
 * Run the Phase 0 turn sequence for the current turn (Phase_0_Spec §5).
 * Uses state.meta.turn; does not increment turn (caller advances turn for next week).
 *
 * Sequence:
 * 4. Declaration Pressure — accumulate RS/HRHB pressure when conditions met
 * 5. Declaration Check — (handled inside accumulation: declare at 100)
 * 6. Referendum eligibility — set eligible_turn and deadline_turn when both declared
 * 7. Authority Degradation — (no-op: not yet implemented)
 * 8. Stability Score Update — recompute all municipality stability scores
 * 9. War start countdown — transition to Phase I if current_turn === war_start_turn
 * 10. Non-war terminal — game_over if deadline reached without referendum
 *
 * No-op if meta.game_over or meta.phase !== 'phase_0'.
 */
export function runPhase0Turn(state: GameState, options: Phase0TurnOptions = {}): void {
  const meta = state.meta;
  if (meta.game_over) return;
  if (meta.phase !== 'phase_0') return;

  const turn = meta.turn;

  accumulateDeclarationPressure(state, turn, options.declarationPressure ?? {});

  updateReferendumEligibility(state, turn, options.referendum ?? {});

  updateAllStabilityScores(state, options.stability);

  applyPhase0ToPhaseITransition(state);

  checkReferendumDeadline(state, turn);
}
