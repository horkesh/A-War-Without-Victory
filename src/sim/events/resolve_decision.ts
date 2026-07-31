/**
 * Resolve a player's event decision.
 *
 * Peace-plan event chains have one canonical decision owner even though legacy
 * event and negotiation surfaces may both be pending.
 */

import type { GameState } from '../../state/game_state.js';
import {
    resolveOwenStoltenbergAssemblyDecision,
    resolveOwenStoltenbergPresidencyDecision,
    resolveVanceOwenEventDecision,
} from '../negotiation/peace_plans.js';
import { resolveEventDecisionCore } from './resolve_decision_core.js';

const VANCE_OWEN_EVENT_ID = 'vance_owen_plan_1993';
const OWEN_STOLTENBERG_PRESIDENCY_EVENT_ID = 'owen_stoltenberg_plan_1993';
const OWEN_STOLTENBERG_ASSEMBLY_EVENT_ID = 'os_rbih_tactical_acceptance_1993';

export function resolveEventDecision(state: GameState, eventId: string, responseId: string): void {
    if (
        eventId === VANCE_OWEN_EVENT_ID
        && (responseId === 'accept' || responseId === 'reject')
    ) {
        resolveVanceOwenEventDecision(
            state,
            responseId === 'accept' ? 'accepted' : 'rejected',
        );
        return;
    }

    if (
        eventId === OWEN_STOLTENBERG_PRESIDENCY_EVENT_ID
        && (responseId === 'accept' || responseId === 'reject')
    ) {
        resolveOwenStoltenbergPresidencyDecision(state, responseId);
        return;
    }

    if (
        eventId === OWEN_STOLTENBERG_ASSEMBLY_EVENT_ID
        && (responseId === 'reject_via_assembly' || responseId === 'accept_for_optics')
    ) {
        resolveOwenStoltenbergAssemblyDecision(state, responseId);
        return;
    }

    resolveEventDecisionCore(state, eventId, responseId);
}
