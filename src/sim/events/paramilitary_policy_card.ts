/**
 * The paramilitary-policy cards and the one shared answer to "has this faction's policy card APPLIED an answer?"
 * (§6 design T3, signed 2026-11-19; reused by M-a's cap and, after its rebase, by D1).
 *
 * A card's answer has applied when the card has FIRED, a receipt for it is on record (any source: the player,
 * an answer filed ahead and applied at fire time, or Observer's automatic answer), and its policy flag holds a
 * valid order. The flag is written only when an answer applies (`applyDefinitionFlags` at fire time or on an
 * in-window answer); an answer filed ahead of the card's firing writes only the decision log. So a filed answer
 * is never an applied one.
 *
 * HRHB has no card (the registered §6 gap) and is never in this registry. Pure reads of persisted state:
 * deterministic and order-independent.
 */

import type { FactionId, GameState } from '../../state/game_state.js';

export type ParamilitaryPolicyOrder = 'always_deny' | 'ask' | 'always_allow';

export interface ParamilitaryPolicyCard {
    /** The faction's one paramilitary-policy event card. */
    readonly eventId: string;
    /** The event flag every option of the card sets to its own option id. */
    readonly flag: string;
}

export const PARAMILITARY_POLICY_CARD_BY_FACTION: Readonly<Partial<Record<FactionId, ParamilitaryPolicyCard>>> = {
    RBiH: { eventId: 'rbih_paramilitary_policy_1992', flag: 'rbih_paramilitary_policy' },
    RS: { eventId: 'rs_paramilitary_policy_1992', flag: 'rs_paramilitary_policy' },
};

export function isParamilitaryPolicyOrder(value: unknown): value is ParamilitaryPolicyOrder {
    return value === 'always_deny' || value === 'ask' || value === 'always_allow';
}

/** The order the faction's policy card applied, or null when it has not applied (or the faction has no card). */
export function appliedParamilitaryPolicyCardAnswer(
    state: GameState,
    faction: FactionId | null | undefined,
): ParamilitaryPolicyOrder | null {
    if (!faction) return null;
    const card = PARAMILITARY_POLICY_CARD_BY_FACTION[faction];
    if (!card) return null;
    const military = state.military;
    const fired = (military?.fired_event_ids ?? []).includes(card.eventId)
        || (military?.event_fire_counts?.[card.eventId] ?? 0) > 0;
    if (!fired) return null;
    const receipted = (military?.event_decision_log ?? []).some((row) => row.event_id === card.eventId);
    if (!receipted) return null;
    const order = military?.event_flags?.[card.flag];
    return isParamilitaryPolicyOrder(order) ? order : null;
}

export function hasParamilitaryPolicyCardApplied(state: GameState, faction: FactionId | null | undefined): boolean {
    return appliedParamilitaryPolicyCardAnswer(state, faction) !== null;
}
