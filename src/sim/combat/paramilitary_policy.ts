/**
 * Paramilitary standing policy for every rear-pocket spawn sent in a side's name.
 *
 * §6 D1 stage 2, integrated ruling 2026-11-18 (§1, §2) with round-2 amendments A1 and A3, under the
 * player-override model (owner 2026-11-25, "There should be no drift between live and headless
 * games"; §6 HOW ruling, lane C s8, H-14 and H-21 with guards G1-G5). `detectParamilitaryTargets`
 * calls `resolveNonManualParamilitaryPolicy` once per faction per turn for every side that is not
 * the manual (autonomy 0) player's, and `resolveManualParamilitaryOrder` for the manual player's.
 *
 * Decision table:
 *
 * | faction | input | result |
 * |---|---|---|
 * | human-controlled, any level | the player's own explicit refusal on record (G1: never lifted by the cap or by another side's newer decision) | deny |
 * | | the player's own standing order Always allow in force (`humanStandingParamilitaryOrder`) | allow |
 * | Assisted, Delegated, Observer | anything else: unanswered, Review each (no surface to ask at these levels), an allow the cap clamps | the bot's order, below |
 * | Full Control | Review each chosen by the player | requests (`detectParamilitaryTargets`) |
 * | | the request gate holds (card not applied): Review each | none (no request before the card applies) |
 * | | anything else (unanswered) | the bot's order, below, on the headless clock |
 * | bot (not human-controlled) | the decided card flag `event_flags.<faction>_paramilitary_policy` | that order; `ask` denies (§2) |
 * | | undecided, card in the catalog | the card's historical default, read through `selectAIDefaultResponse` |
 * | | undecided, the faction's card missing from a supplied catalog (start-week filter) | deny (never read as "no card") |
 * | | undecided, no card in the data (HRHB) | allow, as before |
 * | | undecided, no catalog passed at all (unit tests only) | allow, as before (engine C3) |
 *
 * `ask` with no human asking denies (§2, unanimous): it would otherwise buy Always allow's sweeps
 * at Review's price and log a review that never happened.
 *
 * Silence is the bot's choice through the same function the bot path calls (`botParamilitaryPolicy`),
 * so a hands-off side sends the sweeps headless sends, on the same turn, through the same candidate
 * loop (G4) and at the same cost (G5). An explicit act is the player's own: their answer to the
 * side's card (`decision_source === 'player'`, filed ahead or applied), a standing order given in
 * the review modal, or requests decided there one by one. A bot or automatic answer (Observer, or the
 * staff by silence) is never one.
 *
 * At Observer the card's automatic answer writes the human's order on its fire turn (the
 * player-faction mirror in `applyDefinitionFlags`); an Always allow or Always deny the human already
 * gave in person in the review modal is kept: the automatic answer never replaces it
 * (`hasInPersonParamilitaryStandingOrder`).
 *
 * Pure and deterministic: reads persisted state and the loader-sorted catalog; no RNG, no clock,
 * no writes. No new state field and no migration.
 */

import { isParamilitaryStandingOrderRecord, type FactionId, type GameState } from '../../state/game_state.js';
import type { EventDefinition } from '../events/event_types.js';
import { staffChoiceUnlessExplicit } from '../player_override.js';
import { selectAIDefaultResponse } from '../events/ai_default_response.js';
import {
    isParamilitaryPolicy,
    paramilitaryPolicyFlagKey,
    PARAMILITARY_POLICY_CARD_ID_BY_FACTION,
    type ParamilitaryPolicy,
} from '../events/paramilitary_policy_flag.js';
import {
    appliedParamilitaryPolicyCardAnswer,
    hasParamilitaryPolicyCardApplied,
    readParamilitaryStandingOrder,
} from '../events/paramilitary_policy_card.js';

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
 * - this faction's policy card has applied that same order (the applied answer writes the flag
 *   and the order at once), or
 * - the player filed a paramilitary decision for this faction (`paramilitary_decision_history`:
 *   the review modal resolves this faction's requests and sets the order in the same step).
 * A bot-sourced card answer counts only while no other side has a human decision on record: at
 * Observer that is the automatic answer, but after a faction switch it is a bot's answer from
 * before the human took this side, which is never the human's order.
 *
 * Since the merge onto §6 T and M (2026-11-20, their records' "D1's inherited duties"):
 * - the order is read through M's cap (`readParamilitaryStandingOrder`): never above the answer
 *   this side's card has APPLIED, nor above `ask` before it applies, so an older build's modal
 *   order above the card's answer reads clamped here too;
 * - a card answer counts only once that card has APPLIED it (T's shared accessor,
 *   `hasParamilitaryPolicyCardApplied` / `appliedParamilitaryPolicyCardAnswer`): an answer filed
 *   ahead (RBiH at t0, applied at t4) is no answer before then, for this side and as another
 *   side's human decision alike.
 * So no sweep is sent in a human's name at Assisted to Observer before that human's card applies.
 */
export function humanStandingParamilitaryOrder(state: GameState, faction: FactionId): ParamilitaryPolicy {
    const order = readParamilitaryStandingOrder(state, faction);
    if (order !== 'always_allow' && order !== 'always_deny') return 'ask';
    const log = state.military?.event_decision_log ?? [];
    const history = Array.isArray(state.paramilitary_decision_history) ? state.paramilitary_decision_history : [];
    const ownCardId = PARAMILITARY_POLICY_CARD_ID_BY_FACTION[faction] ?? null;
    const otherCardIds = new Set(
        Object.entries(PARAMILITARY_POLICY_CARD_ID_BY_FACTION)
            .filter(([cardFaction]) => cardFaction !== faction && hasParamilitaryPolicyCardApplied(state, cardFaction))
            .map(([, id]) => id),
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
    if (ownCardId && appliedParamilitaryPolicyCardAnswer(state, faction) === order) {
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

/** always_deny < ask < always_allow: on a tie between two own acts of the same turn the refusal wins (G1, fail closed). */
const OWN_ACT_TIE_RANK: Readonly<Record<ParamilitaryPolicy, number>> = { always_deny: 0, ask: 1, always_allow: 2 };

/**
 * The player's newest own explicit paramilitary act for `faction`, as the order it gives, or null when none is on
 * record (§6 HOW ruling, lane C s8: the explicit acts). Read from persisted records only, never from the global
 * `paramilitary_policy` field, so neither M's cap nor a newer decision for another side can hide it:
 * - the player's own answer to the side's policy card (`event_decision_log`, `decision_source === 'player'`), filed
 *   ahead or applied: its response id is the order it writes (pinned by tests/paramilitary_receipt_cause.test.ts);
 * - a standing order given in the review modal (`paramilitary_decision_history`, `kind: 'standing_order'`);
 * - a request decided there one by one: Allow is a choice made under Review each, so it reads `ask`; Deny and Regular
 *   forces refuse the sweep, so they read as a refusal.
 * A bot or automatic answer (Observer, the staff by silence) is never an explicit act. A malformed row reads as a
 * refusal. Newest by turn; on a tie the refusal wins, then Review each.
 */
export function newestOwnParamilitaryAct(state: GameState, faction: FactionId): ParamilitaryPolicy | null {
    let newestTurn = Number.NEGATIVE_INFINITY;
    let newestOrder: ParamilitaryPolicy | null = null;
    const consider = (rawTurn: unknown, order: ParamilitaryPolicy): void => {
        const value = Number(rawTurn);
        const turn = Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
        if (newestOrder === null || turn > newestTurn
            || (turn === newestTurn && OWN_ACT_TIE_RANK[order] < OWN_ACT_TIE_RANK[newestOrder])) {
            newestTurn = turn;
            newestOrder = order;
        }
    };
    const ownCardId = PARAMILITARY_POLICY_CARD_ID_BY_FACTION[faction] ?? null;
    if (ownCardId) {
        for (const entry of state.military?.event_decision_log ?? []) {
            if (entry?.event_id !== ownCardId || entry.decision_source !== 'player') continue;
            consider(entry.turn, isParamilitaryPolicy(entry.response_id) ? entry.response_id : 'always_deny');
        }
    }
    const history = Array.isArray(state.paramilitary_decision_history) ? state.paramilitary_decision_history : [];
    for (const record of history) {
        if (!record || record.faction !== faction) continue;
        if (isParamilitaryStandingOrderRecord(record)) {
            consider(record.turn, isParamilitaryPolicy(record.order) ? record.order : 'always_deny');
        } else {
            consider(record.turn, (record as { decision?: unknown }).decision === 'allow' ? 'ask' : 'always_deny');
        }
    }
    return newestOrder;
}

/**
 * The player's explicit paramilitary order for `faction`: `always_deny`, `always_allow`, `ask` (Review each), or null
 * when the player has given none (silence: the staff apply the bot's order). Guard G1 (§6 HOW ruling, binding): an
 * explicit refusal is durable across turns, levels, save/load and faction switches, and is never clamped. So a
 * refusal is read from the own records (`newestOwnParamilitaryAct`) as well as from the standing order in force;
 * M's cap and a newer decision for another side can only downgrade an Always allow (to silence), never turn a
 * refusal into `ask` and so into the bot's allow.
 */
export function explicitParamilitaryOrder(state: GameState, faction: FactionId): ParamilitaryPolicy | null {
    const standing = humanStandingParamilitaryOrder(state, faction);
    if (standing === 'always_deny') return 'always_deny';
    const newest = newestOwnParamilitaryAct(state, faction);
    if (newest === 'always_deny') return 'always_deny';
    if (standing === 'always_allow') return 'always_allow';
    return newest === 'ask' ? 'ask' : null;
}

/**
 * Whether a non-manual faction's staff or bot may send rear-pocket paramilitaries this turn.
 * The manual (autonomy 0) player's request path never reaches here (`resolveManualParamilitaryOrder`).
 *
 * H-21 (§6 HOW ruling, lane C s8): a human side's staff at Assisted, Delegated and Observer follow the player's
 * explicit Always allow or refusal; otherwise (unanswered, or Review each, which has no surface at these levels)
 * they apply the bot's order, through the same function the bot path calls, on the headless clock. This also covers
 * a side with no policy card (HRHB), which earlier had its own branch (round 4s).
 */
export function resolveNonManualParamilitaryPolicy(
    state: GameState,
    faction: FactionId,
    catalog: readonly EventDefinition[] | undefined,
): NonManualParamilitaryDecision {
    if (isHumanControlledFaction(state, faction)) {
        const explicit = explicitParamilitaryOrder(state, faction);
        const order = explicit === 'always_allow' || explicit === 'always_deny' ? explicit : null;
        return staffChoiceUnlessExplicit(order, () => botParamilitaryPolicy(state, faction, catalog));
    }
    return botParamilitaryPolicy(state, faction, catalog);
}

/**
 * The order the manual (Full Control) player's side follows this turn in `detectParamilitaryTargets` (H-14, §6 HOW
 * ruling, lane C s8). Full Control still surfaces the policy card, the review modal and, under Review each, every
 * request; silence is the bot's order, sent through the same candidate loop as a bot's (G4):
 * - an explicit refusal (G1) denies; an explicit Always allow allows;
 * - Review each (`ask`) chosen by the player makes requests, except while the request gate holds (the side's card
 *   has not applied an answer, §6 T3), when no request may be made and so none is sent;
 * - otherwise (the player gave no order) the staff apply the bot's order, as headless does in the same week.
 */
export function resolveManualParamilitaryOrder(
    state: GameState,
    faction: FactionId,
    catalog: readonly EventDefinition[] | undefined,
    requestGateHolds: boolean,
): ParamilitaryPolicy {
    const explicit = explicitParamilitaryOrder(state, faction);
    if (explicit === 'always_deny') return 'always_deny';
    if (explicit === 'ask') return requestGateHolds ? 'always_deny' : 'ask';
    if (explicit === 'always_allow' && !requestGateHolds) return 'always_allow';
    return botParamilitaryPolicy(state, faction, catalog);
}

/** The bot's order: the decided card flag, else the card's historical default read from the event data. */
export function botParamilitaryPolicy(
    state: GameState,
    faction: FactionId,
    catalog: readonly EventDefinition[] | undefined,
): NonManualParamilitaryDecision {
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
