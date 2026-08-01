import { applyEventEffects } from './apply_effects.js';
import { applyDefinitionDimensionShifts, applyDefinitionFlags } from './evaluate_events.js';
import type { GameState } from '../../state/game_state.js';
import type { EventDefinition, EventResponseOption } from './event_types.js';

export function hasAuthoredAIDefaultResponse(def: EventDefinition): boolean {
    const options = def.response_options ?? [];
    if (options.length === 0) return false;
    if (def.bot_response_logic === 'accept_first') return true;
    return typeof def.historical_default_response_id === 'string'
        && options.some((option) => option.id === def.historical_default_response_id);
}

export function selectAIDefaultResponse(def: EventDefinition): EventResponseOption {
    const options = def.response_options ?? [];
    if (options.length === 0) throw new Error(`No response options for event "${def.id}"`);

    if (def.bot_response_logic === 'accept_first') return options[0]!;

    if (def.historical_default_response_id) {
        const selected = options.find((option) => option.id === def.historical_default_response_id);
        if (selected) return selected;
    }

    throw new Error(`Event "${def.id}" has no authored AI default response`);
}

export function applyAIDefaultResponse(state: GameState, def: EventDefinition): EventResponseOption {
    const chosen = selectAIDefaultResponse(def);
    applyEventEffects(state, chosen.effects ?? []);
    applyDefinitionFlags(state, chosen.sets_flags);
    applyDefinitionDimensionShifts(state, chosen.dimension_shifts);
    return chosen;
}
