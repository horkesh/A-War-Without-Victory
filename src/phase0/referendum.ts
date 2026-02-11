/**
 * Phase B Step 6: Mandatory Referendum System (Phase_0_Specification_v0_4_0.md §4.5).
 *
 * War can occur ONLY after the BiH independence referendum is held. Without a referendum,
 * no war can begin. Referendum is EC-coerced (not discretionary); eligibility requires
 * both RS and HRHB having declared.
 */

import type { GameState } from '../state/game_state.js';

/** Turns from referendum to war start (Phase_0_Spec §4.5: approximately one month = 4 weeks). */
export const REFERENDUM_WAR_DELAY_TURNS = 4;

/**
 * Default turns from eligibility to referendum deadline (N in spec; "defined by narrative").
 * Used when updateReferendumEligibility sets referendum_deadline_turn. Overridable via options.
 */
export const REFERENDUM_DEADLINE_TURNS_DEFAULT = 12;

/** Outcome label when Phase 0 ends without war (deadline reached, referendum not held). */
export const OUTCOME_NON_WAR_TERMINAL = 'non_war_terminal';

export interface ReferendumEligibilityOptions {
  /** Turns from current_turn to referendum deadline when eligibility first becomes true. */
  deadlineTurns?: number;
}

function getRs(state: GameState) {
  return state.factions.find((f) => f.id === 'RS');
}
function getHrhb(state: GameState) {
  return state.factions.find((f) => f.id === 'HRHB');
}

/**
 * Referendum is eligible only when both RS and HRHB have declared (Phase_0_Spec §4.5).
 */
export function isReferendumEligible(state: GameState): boolean {
  const rs = getRs(state);
  const hrhb = getHrhb(state);
  return Boolean(rs?.declared && hrhb?.declared);
}

/**
 * When referendum becomes eligible (both declared), set referendum_eligible_turn and
 * referendum_deadline_turn. Idempotent: does nothing if already eligible (eligible_turn set).
 */
export function updateReferendumEligibility(
  state: GameState,
  turn: number,
  options: ReferendumEligibilityOptions = {}
): void {
  if (!isReferendumEligible(state)) return;
  const meta = state.meta;
  if (meta.referendum_eligible_turn !== undefined && meta.referendum_eligible_turn !== null) return;

  const deadlineTurns = options.deadlineTurns ?? REFERENDUM_DEADLINE_TURNS_DEFAULT;
  meta.referendum_eligible_turn = turn;
  meta.referendum_deadline_turn = turn + deadlineTurns;
}

/**
 * Record that the referendum was held this turn. Sets referendum_held, referendum_turn,
 * and war_start_turn = referendum_turn + 4. War begins only at war_start_turn (Phase_0_Spec §4.5).
 */
export function holdReferendum(state: GameState, turn: number): void {
  const meta = state.meta;
  meta.referendum_held = true;
  meta.referendum_turn = turn;
  meta.war_start_turn = turn + REFERENDUM_WAR_DELAY_TURNS;
}

/**
 * If referendum deadline has been reached and referendum was not held, end Phase 0 in
 * non-war terminal outcome (BiH remains in Yugoslavia; Phase I never entered).
 */
export function checkReferendumDeadline(state: GameState, turn: number): void {
  const meta = state.meta;
  if (meta.referendum_held) return;
  const deadline = meta.referendum_deadline_turn;
  if (deadline === undefined || deadline === null) return;
  if (turn < deadline) return;

  meta.game_over = true;
  meta.outcome = OUTCOME_NON_WAR_TERMINAL;
}

/**
 * True when referendum was held and current turn is war_start_turn (transition to Phase I).
 */
export function isWarStartTurn(state: GameState): boolean {
  const meta = state.meta;
  if (!meta.referendum_held) return false;
  const warTurn = meta.war_start_turn;
  if (warTurn === undefined || warTurn === null) return false;
  return meta.turn === warTurn;
}

/**
 * Phase B Step 7: Phase 0 → Phase I transfer gating (Phase_0_Spec §6).
 * Transition occurs ONLY when current_turn == war_start_turn (referendum held + 4 turns).
 * No declaration or other condition triggers transition. Irreversible once applied.
 *
 * If state is in phase_0 and isWarStartTurn(state), sets meta.phase = 'phase_i' and returns true.
 * Otherwise returns false and does not mutate state.
 */
export function applyPhase0ToPhaseITransition(state: GameState): boolean {
  const meta = state.meta;
  if (meta.phase !== 'phase_0') return false;
  if (!isWarStartTurn(state)) return false;

  meta.phase = 'phase_i';
  return true;
}
