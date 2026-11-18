/**
 * The paramilitary policy card's data vocabulary, in one place (§6 D1 stage 2, engine C2).
 *
 * Leaf module: it imports only types, so `evaluate_events.ts` (the card-to-order mirror), the
 * sweep's pending gate and the policy resolver can all read it without an import cycle.
 */

import type { FactionId } from '../../state/game_state.js';

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
 */
export const PARAMILITARY_POLICY_CARD_ID_BY_FACTION: Readonly<Partial<Record<FactionId, string>>> = {
    RS: 'rs_paramilitary_policy_1992',
    RBiH: 'rbih_paramilitary_policy_1992',
};
