/**
 * The paramilitary policy card's data vocabulary, in one place (§6 D1 stage 2, engine C2).
 *
 * Leaf module: it imports only types and the card registry (`paramilitary_policy_card.ts`, itself a
 * types-only leaf), so `evaluate_events.ts` (the card-to-order mirror) and the policy resolver can
 * all read it without an import cycle. The mirror's in-person check lives here for the same reason.
 */

import type { FactionId } from '../../state/game_state.js';
import {
    PARAMILITARY_POLICY_CARD_BY_FACTION,
    appliedParamilitaryPolicyCardAnswer,
    hasParamilitaryPolicyCardApplied,
    readParamilitaryStandingOrder,
} from './paramilitary_policy_card.js';
import type { ParamilitaryPolicyOrder, ParamilitaryPolicyStateView } from './paramilitary_policy_card.js';

/**
 * The read shape of the in-person checks below (§6 item 3: structural, so the Codex's ghost view reads them with
 * no cast). `GameState`, the player-visible projection and `GhostEntryStateView` all fit it.
 */
export interface InPersonParamilitaryStateView extends ParamilitaryPolicyStateView {
    readonly paramilitary_decision_history?: ReadonlyArray<{ readonly faction?: string | null; readonly turn?: number } | null | undefined> | null;
    readonly military?: {
        readonly fired_event_ids?: readonly string[];
        readonly event_fire_counts?: Readonly<Record<string, number | undefined>>;
        readonly event_decision_log?: ReadonlyArray<{
            readonly event_id: string;
            readonly decision_source?: string;
            readonly turn?: number;
        }>;
        readonly event_flags?: Readonly<Record<string, unknown>>;
    } | null;
}

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
 *
 * Since the merge onto §6 T and M (2026-11-20): the order is read through M's cap
 * (`readParamilitaryStandingOrder`), so an order above the side's applied card answer, or above
 * `ask` before the card applies (an older build's modal Always allow), is not an order in force;
 * and another side's card answer counts as a human decision only once that card has applied
 * (`hasParamilitaryPolicyCardApplied`, T's shared accessor): a filed, unapplied answer is none.
 */
export function hasInPersonParamilitaryStandingOrder(state: InPersonParamilitaryStateView, faction: FactionId): boolean {
    const order = readParamilitaryStandingOrder(state, faction);
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
    const appliedOtherCardIds = new Set(
        Object.entries(PARAMILITARY_POLICY_CARD_ID_BY_FACTION)
            .filter(([cardFaction]) => cardFaction !== faction && hasParamilitaryPolicyCardApplied(state, cardFaction))
            .map(([, cardId]) => cardId),
    );
    for (const entry of state.military?.event_decision_log ?? []) {
        if (entry?.decision_source !== 'player') continue;
        if (appliedOtherCardIds.has(entry.event_id)) newestOther = Math.max(newestOther, Number(entry.turn));
    }
    return newestOwn >= newestOther;
}

/**
 * The answer the side's policy card APPLIED, when the player gave it in person: the card has applied
 * (`appliedParamilitaryPolicyCardAnswer`) and the newest decision-log row for the card is the player's
 * (`decision_source === 'player'`; newest by turn, the later row on a tie: the log is append-only). Null when the
 * card has not applied, the side has no card (HRHB), or the newest answer was automatic (Observer, the staff
 * default, a bot): §6 item 3, an automatic answer is the side's historical default, not the player's decision.
 */
export function inPersonParamilitaryPolicyCardAnswer(
    state: InPersonParamilitaryStateView,
    faction: FactionId,
): ParamilitaryPolicyOrder | null {
    const applied = appliedParamilitaryPolicyCardAnswer(state, faction);
    const card = PARAMILITARY_POLICY_CARD_BY_FACTION[faction];
    if (applied === null || !card) return null;
    let newestTurn = Number.NEGATIVE_INFINITY;
    let newestSource: string | undefined;
    for (const entry of state.military?.event_decision_log ?? []) {
        if (entry?.event_id !== card.eventId) continue;
        const turn = Number(entry.turn);
        const comparable = Number.isFinite(turn) ? turn : Number.NEGATIVE_INFINITY;
        if (comparable >= newestTurn) {
            newestTurn = comparable;
            newestSource = entry.decision_source;
        }
    }
    return newestSource === 'player' ? applied : null;
}
