/**
 * Paramilitary standing policy for every non-manual rear-pocket spawn.
 *
 * §6 D1 stage 2, integrated ruling 2026-11-18 (§1, §2) with round-2 amendments A1 and A3, which
 * bind over §1. One pure resolver; `detectParamilitaryTargets` calls it once per faction per turn,
 * after the manual player's pending skip and before any candidate, so it gates every spawn that
 * is not the manual (autonomy 0) player's own request path. That path is untouched.
 *
 * Decision table:
 *
 * | faction | input | result |
 * |---|---|---|
 * | human-controlled (Assisted, Delegated, Observer) | the human's standing order `state.paramilitary_policy` for this faction is Always allow | allow |
 * | | Always deny, `ask` (Review each deployment), unanswered, or another side's order | deny |
 * | bot (not human-controlled) | the decided card flag `event_flags.<faction>_paramilitary_policy` | that order; `ask` denies (§2) |
 * | | undecided, card in the catalog | the card's historical default, read through `selectAIDefaultResponse` |
 * | | undecided, the faction's card missing from a supplied catalog (start-week filter) | deny (never read as "no card") |
 * | | undecided, no card in the data (HRHB) | allow, as before |
 * | | undecided, no catalog passed at all (unit tests only) | allow, as before (engine C3) |
 *
 * `ask` with no human asking denies (§2, unanimous): it would otherwise buy Always allow's sweeps
 * at Review's price and log a review that never happened.
 *
 * At Observer the card's automatic answer writes the human's order on its fire turn (the
 * player-faction mirror in `applyDefinitionFlags`), so the side follows the historical policy from
 * then on and its acts are charged; before that answer it sends none (A1). An Always allow or
 * Always deny the human already gave in person in the review modal is kept: the automatic answer
 * never replaces it (`hasInPersonParamilitaryStandingOrder`).
 *
 * Pure and deterministic: reads persisted state and the loader-sorted catalog; no RNG, no clock,
 * no writes. No new state field and no migration.
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import type { EventDefinition } from '../events/event_types.js';
import { selectAIDefaultResponse } from '../events/ai_default_response.js';
import {
    isParamilitaryPolicy,
    paramilitaryPolicyFlagKey,
    PARAMILITARY_POLICY_CARD_ID_BY_FACTION,
    type ParamilitaryPolicy,
} from '../events/paramilitary_policy_flag.js';

export type NonManualParamilitaryDecision = 'always_allow' | 'always_deny';

/** True when a human controls this faction (any autonomy level). Headless auto-control has no human. */
export function isHumanControlledFaction(state: GameState, faction: FactionId): boolean {
    if (state.meta?.headless_scenario_auto_control) return false;
    return (state.meta?.player_faction ?? null) === faction;
}

/**
 * The one card in `catalog` whose response options set this faction's policy flag, or null.
 * Throws when more than one card sets it: a policy with two authors has no single default.
 */
export function findParamilitaryPolicyCard(
    catalog: readonly EventDefinition[],
    faction: FactionId,
): EventDefinition | null {
    const key = paramilitaryPolicyFlagKey(faction);
    const cards = catalog.filter((def) =>
        (def.response_options ?? []).some((option) => Object.prototype.hasOwnProperty.call(option.sets_flags ?? {}, key)),
    );
    if (cards.length > 1) {
        throw new Error(
            `paramilitary policy: ${cards.length} cards set ${key} (${cards.map((def) => def.id).join(', ')}); exactly one may`,
        );
    }
    return cards[0] ?? null;
}

/**
 * The order a card's historical default answer writes, read from that option's `sets_flags`
 * (not from the response id, which matches only by naming). Throws when the card has no authored
 * default or the default writes no valid order.
 */
export function historicalParamilitaryPolicy(card: EventDefinition, faction: FactionId): ParamilitaryPolicy {
    const key = paramilitaryPolicyFlagKey(faction);
    const option = selectAIDefaultResponse(card);
    const value = option.sets_flags?.[key];
    if (!isParamilitaryPolicy(value)) {
        throw new Error(
            `paramilitary policy: the historical default "${option.id}" of ${card.id} does not set ${key} to a policy`,
        );
    }
    return value;
}

/**
 * The human's current standing order for `faction`, or `ask` when there is none.
 *
 * `state.paramilitary_policy` is one global field, written by the card answer (the player-faction
 * mirror in `applyDefinitionFlags`, including Observer's automatic answer) and by the review
 * modal. An order never carries across a faction switch, so the field counts for `faction` only
 * when this faction's own saved record carries it and no other side's human decision is newer:
 * - this faction's policy card is answered and its flag holds the same value (the card answer
 *   writes both at once), or
 * - the player filed a paramilitary decision for this faction (`paramilitary_decision_history`:
 *   the review modal resolves this faction's requests and sets the order in the same step).
 * A bot-sourced card answer counts only while no other side has a human decision on record: at
 * Observer that is the automatic answer, but after a faction switch it is a bot's answer from
 * before the human took this side, which is never the human's order.
 */
export function humanStandingParamilitaryOrder(state: GameState, faction: FactionId): ParamilitaryPolicy {
    const order = state.paramilitary_policy;
    if (order !== 'always_allow' && order !== 'always_deny') return 'ask';
    const log = state.military?.event_decision_log ?? [];
    const history = Array.isArray(state.paramilitary_decision_history) ? state.paramilitary_decision_history : [];
    const ownCardId = PARAMILITARY_POLICY_CARD_ID_BY_FACTION[faction] ?? null;
    const otherCardIds = new Set(
        Object.entries(PARAMILITARY_POLICY_CARD_ID_BY_FACTION)
            .filter(([cardFaction]) => cardFaction !== faction)
            .map(([, id]) => id as string),
    );

    let newestOtherHuman = Number.NEGATIVE_INFINITY;
    for (const entry of log) {
        if (entry?.decision_source === 'player' && otherCardIds.has(entry.event_id)) {
            newestOtherHuman = Math.max(newestOtherHuman, Number(entry.turn));
        }
    }
    for (const record of history) {
        if (record && record.faction !== faction) newestOtherHuman = Math.max(newestOtherHuman, Number(record.turn));
    }

    let newestOwn = Number.NEGATIVE_INFINITY;
    const ownFlag = state.military?.event_flags?.[paramilitaryPolicyFlagKey(faction)];
    if (ownCardId && ownFlag === order) {
        for (const entry of log) {
            if (entry?.event_id !== ownCardId) continue;
            if (entry.decision_source === 'player' || newestOtherHuman === Number.NEGATIVE_INFINITY) {
                newestOwn = Math.max(newestOwn, Number(entry.turn));
            }
        }
    }
    for (const record of history) {
        if (record && record.faction === faction) newestOwn = Math.max(newestOwn, Number(record.turn));
    }

    if (newestOwn === Number.NEGATIVE_INFINITY || newestOwn < newestOtherHuman) return 'ask';
    return order;
}

/**
 * Whether a non-manual faction's staff or bot may send rear-pocket paramilitaries this turn.
 * The manual (autonomy 0) player's request path never reaches here.
 */
export function resolveNonManualParamilitaryPolicy(
    state: GameState,
    faction: FactionId,
    catalog: readonly EventDefinition[] | undefined,
): NonManualParamilitaryDecision {
    if (isHumanControlledFaction(state, faction)) {
        // A1: the human's current standing order decides at Assisted, Delegated and Observer;
        // unanswered or `ask` sends none.
        return humanStandingParamilitaryOrder(state, faction) === 'always_allow' ? 'always_allow' : 'always_deny';
    }

    const decided = state.military?.event_flags?.[paramilitaryPolicyFlagKey(faction)];
    if (decided !== undefined) {
        // §2: `ask` with no human asking denies; anything that is not an order fails closed.
        return decided === 'always_allow' ? 'always_allow' : 'always_deny';
    }

    // Undecided bot: the card's historical default, read from the event data.
    if (catalog === undefined) return 'always_allow';
    const card = findParamilitaryPolicyCard(catalog, faction);
    const registeredCardId = PARAMILITARY_POLICY_CARD_ID_BY_FACTION[faction] ?? null;
    if (card) {
        if (registeredCardId !== card.id) {
            throw new Error(
                `paramilitary policy: ${card.id} sets ${paramilitaryPolicyFlagKey(faction)} but ${faction}'s registered card is ${registeredCardId ?? 'none'}`,
            );
        }
        return historicalParamilitaryPolicy(card, faction) === 'always_allow' ? 'always_allow' : 'always_deny';
    }
    // C4: the faction has a card in the data, but this catalog lacks it (the loader's start-week
    // filter): never read that as "no card". Fail closed.
    if (registeredCardId) return 'always_deny';
    // No card in the data (HRHB): allow, as before.
    return 'always_allow';
}
