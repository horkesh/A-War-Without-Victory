/**
 * The paramilitary policy card's data vocabulary, in one place (§6 D1 stage 2, engine C2).
 *
 * Leaf module: it imports only types and the card registry (`paramilitary_policy_card.ts`, itself a
 * types-only leaf), so `evaluate_events.ts` (the card-to-order mirror) and the policy resolver can
 * all read it without an import cycle. The mirror's in-person check lives here for the same reason.
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import { PARAMILITARY_POLICY_CARD_BY_FACTION } from './paramilitary_policy_card.js';

/** The three standing orders a policy card or the review modal can write. */
export type ParamilitaryPolicy = 'always_allow' | 'always_deny' | 'ask';

export function isParamilitaryPolicy(value: unknown): value is ParamilitaryPolicy {
    return value === 'always_allow' || value === 'always_deny' || value === 'ask';
}

/** The one flag key a faction's paramilitary policy card writes: `<faction>_paramilitary_policy`. */
export function paramilitaryPolicyFlagKey(faction: FactionId): string {
    return `${faction.toLowerCase()}_paramilitary_policy`;
}

/**
 * The policy card each faction has in the event data, by id. HRHB has none (registered gap).
 * Pinned against the unfiltered catalog by tests/paramilitary_policy_binding.test.ts: every card
 * that sets a `<faction>_paramilitary_policy` flag is listed here, and nothing else is. The
 * resolver uses it to tell "no card in the data" (allow, as before) from "a card the start-week
 * filter removed" (never read as no card: event_loader.ts start-week filter, engine C4).
 * Derived from the one card registry, `PARAMILITARY_POLICY_CARD_BY_FACTION` (§6 T3 and M-a), so the
 * request gate, the cap and this resolver can never name different cards.
 */
export const PARAMILITARY_POLICY_CARD_ID_BY_FACTION: Readonly<Partial<Record<FactionId, string>>> = Object.freeze(
    Object.fromEntries(
        Object.entries(PARAMILITARY_POLICY_CARD_BY_FACTION).flatMap(([faction, card]) => (card ? [[faction, card.eventId]] : [])),
    ),
);

/**
 * Whether the human's standing order `state.paramilitary_policy` is an Always allow or Always deny
 * the human gave in person for `faction` in the review modal. The modal offers only those two
 * standing orders and files this faction's requests in `paramilitary_decision_history` in the same
 * step. Same own-record rule as the resolver (`humanStandingParamilitaryOrder`): a newer human
 * decision for another side (a faction switch) means the order is not this side's.
 *
 * Ruling A1 (an order the human gives in person wins): the card-to-order mirror reads this so an
 * automatic answer to this faction's card (Observer's, at fire time or from the pending drain)
 * never replaces such an order, and F1-B (2026-11-19) reads it first, before that answer writes
 * anything, so the automatic answer is the option that writes the order
 * (`selectInPersonParamilitaryOrderResponse`, ai_default_response.ts). Headless runs file no
 * paramilitary decisions, so this is false there.
 */
export function hasInPersonParamilitaryStandingOrder(state: GameState, faction: FactionId): boolean {
    const order = state.paramilitary_policy;
    if (order !== 'always_allow' && order !== 'always_deny') return false;
    const history = Array.isArray(state.paramilitary_decision_history) ? state.paramilitary_decision_history : [];
    let newestOwn = Number.NEGATIVE_INFINITY;
    let newestOther = Number.NEGATIVE_INFINITY;
    for (const record of history) {
        if (!record) continue;
        if (record.faction === faction) newestOwn = Math.max(newestOwn, Number(record.turn));
        else newestOther = Math.max(newestOther, Number(record.turn));
    }
    if (newestOwn === Number.NEGATIVE_INFINITY) return false;
    const ownCardId = PARAMILITARY_POLICY_CARD_ID_BY_FACTION[faction];
    const cardIds: readonly (string | undefined)[] = Object.values(PARAMILITARY_POLICY_CARD_ID_BY_FACTION);
    for (const entry of state.military?.event_decision_log ?? []) {
        if (entry?.decision_source !== 'player' || entry.event_id === ownCardId) continue;
        if (cardIds.includes(entry.event_id)) newestOther = Math.max(newestOther, Number(entry.turn));
    }
    return newestOwn >= newestOther;
}
