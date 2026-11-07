/**
 * ANSWER AHEAD OF FIRING (owner decision 2026-11-06).
 *
 * A player's opening foundational decision is shown at campaign birth, so every faction starts
 * the war with its identity decision on the desk. One of them, `hrhb_political_goal`, is authored
 * for a later window (t3-7; a bot answers it at t4). Applying the player's answer at birth gave
 * its effects to the turn-0 formation set only and opened its gated follow-ups early, which drifted
 * the HRHB-player game away from the no-player game (see `preFiresOpeningDecisionAtBirth`).
 *
 * So for such an event the player ANSWERS at birth but the event FIRES on its own schedule:
 * - at birth the card is queued without firing the event (no effects, no fired receipt);
 * - answering it files the player's choice in `event_decision_log` (the Chronicle and Army HQ
 *   records show it at turn 0) and applies nothing (`resolve_decision_core.ts`);
 * - when evaluate-events fires the event in its window, the filed answer is applied there, at the
 *   point a bot's answer is applied (`evaluate_events.ts`), so the effects land on the same turn
 *   and in the same order as in the no-player game.
 *
 * No new state: "answered ahead" is a player entry in `event_decision_log` for an opening event
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

function hasFired(state: GameState, eventId: string): boolean {
    return (state.military.fired_event_ids ?? []).includes(eventId)
        || (state.military.event_fire_counts?.[eventId] ?? 0) > 0;
}

/** An opening foundational decision whose event has not fired yet. Answering it only files the answer. */
export function isAnswerAheadOfFiringDecision(state: GameState, eventId: string): boolean {
    return OPENING_FOUNDATIONAL_EVENT_IDS.includes(eventId) && !hasFired(state, eventId);
}

/** The response the player filed ahead of this event firing, or null. */
export function findAnswerAheadOfFiring(state: GameState, eventId: string): string | null {
    if (!isAnswerAheadOfFiringDecision(state, eventId)) return null;
    const entry = (state.military.event_decision_log ?? [])
        .find((row) => row.event_id === eventId && row.decision_source === 'player');
    return entry ? entry.response_id : null;
}
