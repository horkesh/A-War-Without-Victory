import { CANONICAL_FACTIONS, type GameState } from '../../state/game_state.js';
import {
    createDefaultPatronRelationship,
    createEmptyCapital,
    type NegotiationState,
} from '../../state/negotiation_types.js';
import { initializeStrategicDimensions } from '../events/strategic_dimensions.js';

function requireRecord(value: unknown, name: string): asserts value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`Malformed negotiation ${name}`);
    }
}

export function initializeNegotiationState(state: GameState): NegotiationState {
    if (state.military.negotiation === undefined) {
        const capital: NegotiationState['capital'] = {};
        const patron_relationships: NegotiationState['patron_relationships'] = {};
        for (const faction of CANONICAL_FACTIONS) {
            capital[faction] = createEmptyCapital();
            patron_relationships[faction] = createDefaultPatronRelationship(faction);
        }
        state.military.negotiation = {
            capital,
            patron_relationships,
            peace_plan_history: [],
            strategic_dimensions: initializeStrategicDimensions(),
        };
        return state.military.negotiation;
    }

    const negotiation = state.military.negotiation as NegotiationState & Record<string, unknown>;
    requireRecord(negotiation, 'state');
    if (negotiation.capital === undefined) negotiation.capital = {};
    else requireRecord(negotiation.capital, 'capital');
    if (negotiation.patron_relationships === undefined) negotiation.patron_relationships = {};
    else requireRecord(negotiation.patron_relationships, 'patron_relationships');
    if (negotiation.peace_plan_history === undefined) negotiation.peace_plan_history = [];
    else if (!Array.isArray(negotiation.peace_plan_history)) throw new Error('Malformed negotiation peace_plan_history');
    if (negotiation.strategic_dimensions === undefined) {
        negotiation.strategic_dimensions = initializeStrategicDimensions();
    } else {
        requireRecord(negotiation.strategic_dimensions, 'strategic_dimensions');
    }

    for (const faction of CANONICAL_FACTIONS) {
        if (negotiation.capital[faction] === undefined) negotiation.capital[faction] = createEmptyCapital();
        else requireRecord(negotiation.capital[faction], `capital.${faction}`);
        if (negotiation.patron_relationships[faction] === undefined) {
            negotiation.patron_relationships[faction] = createDefaultPatronRelationship(faction);
        } else {
            requireRecord(negotiation.patron_relationships[faction], `patron_relationships.${faction}`);
        }
    }
    return negotiation;
}
