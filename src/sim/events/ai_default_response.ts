import { applyEventEffects } from './apply_effects.js';
import { applyDefinitionDimensionShifts, applyDefinitionFlags } from './evaluate_events.js';
import {
    hasInPersonParamilitaryStandingOrder,
    paramilitaryPolicyFlagKey,
    PARAMILITARY_POLICY_CARD_ID_BY_FACTION,
} from './paramilitary_policy_flag.js';
import { readParamilitaryStandingOrder } from './paramilitary_policy_card.js';
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

/**
 * §6 D1 stage 2, F1-B (signed 2026-11-19): the option an automatic answer to the player's own registered paramilitary policy
 * card must take when the player already gave that side an Always allow or Always deny in person (ruling A1: an order given in
 * person wins). It is the option whose `sets_flags[<faction>_paramilitary_policy]` writes that order, read from `sets_flags`
 * and never from the response id (engine C2, as `historicalParamilitaryPolicy`). The card's effects, flags, shifts and
 * notifications are then the order's own, so the price equals answering the card in person with that order: Observer is
 * neither a cheaper nor a dearer way to give an order.
 *
 * Returns null, meaning the historical default, unchanged, in every other case: another card, no player faction (headless,
 * so hands-off runs are byte-identical), or no in-person Always allow / Always deny for this side. Throws when the card has
 * no option, or more than one, writing the order, so the data can never silently fall back.
 *
 * Callers are the two automatic entry points only (Observer at fire time, and the Observer drain), and they call it before
 * any part of the answer is applied: the in-person check reads the state as it was before the answer.
 *
 * Since the merge onto §6 M (2026-11-20) the order is the one in force, read through M's cap (`readParamilitaryStandingOrder`):
 * the card has not applied yet, so an order above `ask` (an older build's modal Always allow) is no in-person order and the
 * historical default stands; an in-person Always deny is within any cap and is kept.
 */
export function selectInPersonParamilitaryOrderResponse(
    state: GameState,
    def: EventDefinition,
): EventResponseOption | null {
    const playerFaction = state.meta?.player_faction;
    if (!playerFaction || def.id !== PARAMILITARY_POLICY_CARD_ID_BY_FACTION[playerFaction]) return null;
    if (!hasInPersonParamilitaryStandingOrder(state, playerFaction)) return null;
    const flagKey = paramilitaryPolicyFlagKey(playerFaction);
    const order = readParamilitaryStandingOrder(state, playerFaction);
    const matches = (def.response_options ?? []).filter((option) => option.sets_flags?.[flagKey] === order);
    if (matches.length !== 1) {
        throw new Error(
            `paramilitary policy (F1-B): "${def.id}" has ${matches.length} options writing ${flagKey} = ${String(order)}; exactly one must`,
        );
    }
    return matches[0]!;
}

/**
 * Apply a decision's automatic answer: the authored historical default, or `override` when the caller already chose the
 * option (F1-B, the Observer drain: `selectInPersonParamilitaryOrderResponse`, chosen before anything is applied).
 */
export function applyAIDefaultResponse(
    state: GameState,
    def: EventDefinition,
    override: EventResponseOption | null = null,
): EventResponseOption {
    const chosen = override ?? selectAIDefaultResponse(def);
    applyEventEffects(state, chosen.effects ?? []);
    applyDefinitionFlags(state, chosen.sets_flags, 'automatic');
    applyDefinitionDimensionShifts(state, chosen.dimension_shifts);
    return chosen;
}
