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

const DECORATION_FACTION_BY_SUFFIX = {
    rbih: 'RBiH',
    rs: 'RS',
    hrhb: 'HRHB',
} as const;

function validateDecorationTarget(
    state: GameState,
    eventId: string,
    decisionFaction: string,
    chosen: { id: string; target_formation_id?: string },
): string | undefined {
    const match = /^decorate_steadfast_(rbih|rs|hrhb)__(.+)$/.exec(chosen.id);
    if (!match) {
        if (chosen.target_formation_id != null) {
            throw new Error(`Invalid decoration target metadata for response "${chosen.id}"`);
        }
        return undefined;
    }
    const suffix = match[1] as keyof typeof DECORATION_FACTION_BY_SUFFIX;
    const targetFromId = match[2];
    const targetId = chosen.target_formation_id;
    const faction = DECORATION_FACTION_BY_SUFFIX[suffix];
    const formation = typeof targetId === 'string' ? state.military.formations[targetId] : undefined;
    const kind = typeof formation?.kind === 'string' ? formation.kind : 'brigade';
    if (
        eventId !== `decorate_a_unit_${suffix}`
        || decisionFaction !== faction
        || !targetId
        || targetId !== targetFromId
        || !formation
        || formation.faction !== faction
        || formation.status !== 'active'
        || (kind !== 'corps' && kind !== 'brigade')
    ) {
        throw new Error(`Invalid decoration target for response "${chosen.id}"`);
    }
    return targetId;
}

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

    const targetFormationId = validateDecorationTarget(state, eventId, decision.faction, chosen);
    applyEventEffects(state, chosen.effects ?? [], targetFormationId);
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
