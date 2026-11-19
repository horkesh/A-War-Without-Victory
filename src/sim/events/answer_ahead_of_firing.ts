/**
 * ANSWER AHEAD OF FIRING (owner decision 2026-11-06; extended by the §6 design T, signed 2026-11-19).
 *
 * A player's opening foundational decision is shown at campaign birth, so every faction starts
 * the war with its identity decision on the desk. A bot answers each of them later, in its authored
 * window: `rs_strategic_goals` at t1, `rbih_state_identity` at t3, `hrhb_political_goal` at t4.
 * Applying the player's answer at birth gave its effects to the turn-0 formation set only and opened
 * its gated follow-ups early, which drifted the player game away from the no-player game (HRHB first,
 * 163bee0e5; the RBiH and RS cards by §6 design T1).
 *
 * So for such an event the player ANSWERS at birth but the event FIRES on its own schedule:
 * - at birth the card is queued without firing the event (no effects, no fired receipt);
 * - answering it files the player's choice in `event_decision_log` (the Chronicle and Army HQ
 *   records show it at the turn it was filed) and applies nothing (`resolve_decision_core.ts`);
 * - when evaluate-events fires the event in its window, the filed answer is applied there, at the
 *   point a bot's answer is applied (`evaluate_events.ts`), so the effects land on the same turn
 *   and in the same order as in the no-player game.
 *
 * The RBiH paramilitary-policy card follows the same rule (§6 design T2): the opening lane still puts
 * it to the player before the first Advance, keyed on the FILED identity answer
 * (`opening_policy_transition.ts`), and its answer is filed too and applied when the card fires (t4).
 * It is not a foundational decision (canon names three, Game Bible §21.3), so it has its own entry.
 *
 * A save that already holds one of these cards FIRED (a build before T fired the RBiH and RS cards at
 * birth) answers it the old way, applied at once: the rule keys on "not fired yet", i.e. on save shape.
 *
 * No new state: "answered ahead" is a player entry in `event_decision_log` for one of these events
 * that has not fired yet. Pure predicates only (no imports beyond types), so both the evaluator
 * and the decision core can use them without an import cycle.
 */

import type { GameState } from '../../state/game_state.js';

/** The three factions' opening foundational decisions (mirrors the start adapters' mapping). */
export const OPENING_FOUNDATIONAL_EVENT_IDS: readonly string[] = [
    'hrhb_political_goal',
    'rbih_state_identity',
    'rs_strategic_goals',
];

/** The opening lane's follow-up card, asked before the first Advance and answered ahead of its t4 firing. */
export const OPENING_POLICY_ANSWER_AHEAD_EVENT_IDS: readonly string[] = [
    'rbih_paramilitary_policy_1992',
];

/** Every event whose player answer may be filed ahead of its firing. */
export const ANSWER_AHEAD_EVENT_IDS: readonly string[] = [
    ...OPENING_FOUNDATIONAL_EVENT_IDS,
    ...OPENING_POLICY_ANSWER_AHEAD_EVENT_IDS,
];

function hasFired(state: GameState, eventId: string): boolean {
    return (state.military.fired_event_ids ?? []).includes(eventId)
        || (state.military.event_fire_counts?.[eventId] ?? 0) > 0;
}

/** An answer-ahead decision whose event has not fired yet. Answering it only files the answer. */
export function isAnswerAheadOfFiringDecision(state: GameState, eventId: string): boolean {
    return ANSWER_AHEAD_EVENT_IDS.includes(eventId) && !hasFired(state, eventId);
}

/** The response the player filed ahead of this event firing, or null. */
export function findAnswerAheadOfFiring(state: GameState, eventId: string): string | null {
    if (!isAnswerAheadOfFiringDecision(state, eventId)) return null;
    const entry = (state.military.event_decision_log ?? [])
        .find((row) => row.event_id === eventId && row.decision_source === 'player');
    return entry ? entry.response_id : null;
}

/**
 * The turn a player decision's response applied and wrote its causal edges: the decision's own turn,
 * or, for an answer filed ahead of its event firing, the turn the event fired. Null while such an
 * answer is filed but its event has not fired: it has applied nothing yet, so nothing it caused is real.
 */
export function decisionAppliedTurn(
    state: GameState,
    decision: { event_id: string; turn: number },
): number | null {
    if (!ANSWER_AHEAD_EVENT_IDS.includes(decision.event_id)) return decision.turn;
    const military = state.military;
    const fired = (military?.fired_event_ids ?? []).includes(decision.event_id)
        || (military?.event_fire_counts?.[decision.event_id] ?? 0) > 0;
    if (!fired) return null;
    const firedTurn = military?.event_last_fired_turn?.[decision.event_id];
    return typeof firedTurn === 'number' && firedTurn > decision.turn ? firedTurn : decision.turn;
}
