/**
 * v0.4.1 Phase 2: Resolve a player's event decision.
 * Finds the pending decision by event_id, applies the chosen response's effects, removes from pending list.
 */

import type { GameState } from '../../state/game_state.js';
import { applyEventEffects } from './apply_effects.js';
import { applyDefinitionDimensionShifts, applyDefinitionFlags } from './evaluate_events.js';
import { emitEventNotifications, isTwoLevelNotificationsEnabled } from './emit_notifications.js';

/**
 * Resolve a pending event decision.
 * @param state - GameState (mutated in place)
 * @param eventId - The event_id of the pending decision
 * @param responseId - The id of the chosen EventResponseOption
 * @throws if no pending decision matches eventId, or no response option matches responseId
 */
export function resolveEventDecision(state: GameState, eventId: string, responseId: string): void {
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

    // Apply the chosen response's effects (may be absent for dimension-shifts-only options)
    applyEventEffects(state, chosen.effects ?? []);

    // Apply flags and dimension shifts from the chosen response option
    applyDefinitionFlags(state, chosen.sets_flags);
    applyDefinitionDimensionShifts(state, chosen.dimension_shifts);

    if (isTwoLevelNotificationsEnabled()) {
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
    }

    // Remove from pending list
    pending.splice(idx, 1);
}
