/**
 * v0.4.1 Phase 2: Resolve a player's event decision.
 * Finds the pending decision by event_id, applies the chosen response's effects, removes from pending list.
 */

import type { GameState } from '../../state/game_state.js';
import { applyEventEffects } from './apply_effects.js';
import {
    applyDefinitionDimensionShifts,
    applyDefinitionFlags,
    applyResponseRuntimeCausality,
    recordEventDecision,
} from './evaluate_events.js';
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

    // Audit-trail entry — player path. Pairs with bot paths in evaluate_events.ts.
    const decisionTurn = state.meta.turn ?? decision.turn_fired;
    recordEventDecision(
        state,
        eventId,
        chosen.id,
        'player',
        decision.faction,
        decisionTurn,
    );

    // Phase B Sub-slice B3: player path response-level runtime causality
    // (packet §3.3, §3.5). Mirror of bot path in evaluate_events.ts —
    // both paths produce identical deltas to `enabled_event_ids`,
    // `closed_event_ids`, and `event_causality_log` for the same choice.
    applyResponseRuntimeCausality(state, eventId, chosen.id, chosen, decisionTurn);

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
