/**
 * Resolve a player's event decision.
 *
 * §6 E3a2: the peace-plan cards no longer have special owners here. A routed card's option
 * declares `plan_answer`; answering it applies the option and logs the choice like any other
 * card (resolveEventDecisionCore), and evaluate-peace-plans reads the answer back from the
 * log and resolves the plan (peace_plans.ts). The former Vance-Owen and Owen-Stoltenberg
 * special cases, which wrote the plan record from the applier, are retired.
 */

import type { GameState } from '../../state/game_state.js';
import { resolveEventDecisionCore } from './resolve_decision_core.js';

export function resolveEventDecision(state: GameState, eventId: string, responseId: string): void {
    resolveEventDecisionCore(state, eventId, responseId);
}
