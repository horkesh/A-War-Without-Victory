/**
 * THE one predicate for "the Observer drain will answer this pending card" (§6 mechanics batch item 6, ruled 6/6,
 * 2026-11-23). Two readers, so they cannot diverge:
 * - the drain in `evaluateEvents` (evaluate_events.ts, OBSERVER SWEEP) answers exactly these rows;
 * - the player-decision manifest (player_decision_manifest.ts) stops hard-blocking Advance for exactly these rows.
 *
 * A row qualifies at Observer (autonomy 3) when its authored historical default names one of its own options and it is
 * not an opening card answered ahead of its firing (that one keeps blocking and resolves at fire time). A card with no
 * authored default keeps blocking: the drain leaves it on the desk, and only the player may answer it.
 *
 * The row is read, not the catalog definition: the manifest cannot see the catalog. Rows copy `response_options` and
 * `historical_default_response_id` from the definition when they are queued. The drain also requires the definition to
 * carry the default; if a later catalog dropped it, the card is advisory and waits for the player's answer.
 *
 * Pure: types only, plus the answer-ahead predicate (itself import-free), so the state layer and the UI bundle can use it.
 */

import type { GameState } from '../../state/game_state.js';
import { isAnswerAheadOfFiringDecision } from './answer_ahead_of_firing.js';

/** The fields of a pending decision row the predicate reads. */
export interface ObserverDrainRow {
    event_id: string;
    historical_default_response_id?: string;
    response_options?: ReadonlyArray<{ id: string }>;
}

export const OBSERVER_AUTONOMY_LEVEL = 3;

export function isObserverDrainablePendingDecision(state: GameState, row: ObserverDrainRow): boolean {
    if ((state.meta?.autonomy_level ?? 0) < OBSERVER_AUTONOMY_LEVEL) return false;
    const defaultId = row.historical_default_response_id;
    if (typeof defaultId !== 'string') return false;
    if (!(row.response_options ?? []).some((option) => option.id === defaultId)) return false;
    return !isAnswerAheadOfFiringDecision(state, row.event_id);
}
