import { applyEventEffects } from './apply_effects.js';
import { applyDefinitionDimensionShifts, applyDefinitionFlags } from './evaluate_events.js';
import type { GameState } from '../../state/game_state.js';
import type { EventDefinition, EventResponseOption } from './event_types.js';

const CANONICAL_AI_DEFAULT_RESPONSE: Record<string, string> = {};

export function selectAIDefaultResponse(def: EventDefinition): EventResponseOption {
    const options = def.response_options ?? [];
    if (options.length === 0) throw new Error(`No response options for event "${def.id}"`);

    const override = CANONICAL_AI_DEFAULT_RESPONSE[def.id];
    if (override) {
        const selected = options.find((option) => option.id === override);
        if (selected) return selected;
    }

    return options[0]!;
}

export function applyAIDefaultResponse(state: GameState, def: EventDefinition): EventResponseOption {
    const chosen = selectAIDefaultResponse(def);
    applyEventEffects(state, chosen.effects ?? []);
    applyDefinitionFlags(state, chosen.sets_flags);
    applyDefinitionDimensionShifts(state, chosen.dimension_shifts);
    return chosen;
}
