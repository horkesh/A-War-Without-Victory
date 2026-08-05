/**
 * Core event-decision resolution with no negotiation dependency.
 *
 * Cross-system decision owners may wrap this function, while negotiation can
 * safely use it to consume a duplicate event surface without an import cycle.
 */

import type { GameState } from '../../state/game_state.js';
import { applyEventEffects } from './apply_effects.js';
import {
    applyDefinitionDimensionShifts,
    applyDefinitionFlags,
    applyResponseRuntimeCausality,
    recordEventDecision,
} from './evaluate_events.js';
import { emitEventNotifications } from './emit_notifications.js';

export function resolveEventDecisionCore(state: GameState, eventId: string, responseId: string): void {
    const pending = state.military.pending_event_decisions;
    if (!pending) {
        throw new Error(`No pending event decisions found (looking for ${eventId})`);
    }

    const idx = pending.findIndex(d => d.event_id === eventId);
    if (idx === -1) {
        throw new Error(`No pending decision for event_id "${eventId}"`);
    }

    const decision = pending[idx];
    const chosen = decision.response_options.find(o => o.id === responseId);
    if (!chosen) {
        throw new Error(`No response option "${responseId}" for event "${eventId}"`);
    }

    applyEventEffects(state, chosen.effects ?? []);
    applyDefinitionFlags(state, chosen.sets_flags);
    applyDefinitionDimensionShifts(state, chosen.dimension_shifts);

    const decisionTurn = state.meta.turn ?? decision.turn_fired;
    recordEventDecision(
        state,
        eventId,
        chosen.id,
        'player',
        decision.faction,
        decisionTurn,
    );
    applyResponseRuntimeCausality(state, eventId, chosen.id, chosen, decisionTurn);

    emitEventNotifications(
        state,
        {
            event_id: decision.event_id,
            notifications_to_other_factions: decision.notifications_to_other_factions,
        },
        chosen.id,
        decision.faction,
        state.meta.turn ?? decision.turn_fired,
    );

    pending.splice(idx, 1);
}
