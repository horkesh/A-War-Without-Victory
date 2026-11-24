/**
 * The paramilitary-policy cards, the one shared answer to "has this faction's policy card APPLIED an answer?"
 * (§6 design T3, signed 2026-11-19; reused by M-a's cap and, after its rebase, by D1), and the standing-order
 * cap built on it (§6 design M, M-a, signed 2026-11-19).
 *
 * A card's answer has applied when the card has FIRED, a receipt for it is on record (any source: the player,
 * an answer filed ahead and applied at fire time, or Observer's automatic answer), and its policy flag holds a
 * valid order. The flag is written only when an answer applies (`applyDefinitionFlags` at fire time or on an
 * in-window answer); an answer filed ahead of the card's firing writes only the decision log. So a filed answer
 * is never an applied one.
 *
 * THE STANDING-ORDER CAP (M-a). The player's standing order (`state.paramilitary_policy`, written by the card's
 * mirror and by the review modal) can never stand above the answer the side's card has APPLIED, ranked
 * always_deny < ask < always_allow, nor above `ask` before the card has applied (or when its flag is missing or
 * invalid: fail closed). The review IPC refuses any write above the cap (`isParamilitaryOrderWithinCap`), and
 * every reader of the order goes through `readParamilitaryStandingOrder`, so a save whose modal-written order is
 * above its card answer reads clamped (tests/s6_modal_cost_cap.test.ts pins both, and the source scan there
 * pins that no reader bypasses the accessor).
 *
 * HRHB has no card (the registered §6 gap) and is never in this registry, so it is never capped. A run with no
 * player faction (headless) is never capped either: there the reader is the identity. Pure reads of persisted
 * state: deterministic and order-independent.
 */

import type { FactionId } from '../../state/game_state.js';

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

/** The IPC error code for a refused attempt to loosen the side's paramilitary policy (copy: `paramilitaryReview.error.cannotLoosen`). */
export const PARAMILITARY_POLICY_CANNOT_LOOSEN = 'paramilitary_policy_cannot_loosen';

/**
 * The IPC error code for a standing order given with no request pending while the side is not at Full Control
 * (§6 mechanics item 2: the opener is Full Control only; copy: `paramilitaryReview.error.notManual`).
 */
export const PARAMILITARY_ORDER_NOT_MANUAL = 'paramilitary_order_not_manual';

/**
 * The minimal read shape of these accessors. `GameState`, the player-visible projection the renderer receives,
 * and the Codex's state view all fit it, so every surface reads the cap through the same code.
 */
export interface ParamilitaryPolicyStateView {
    readonly paramilitary_policy?: unknown;
    readonly military?: {
        readonly fired_event_ids?: readonly string[];
        readonly event_fire_counts?: Readonly<Record<string, number | undefined>>;
        readonly event_decision_log?: ReadonlyArray<{ readonly event_id: string }>;
        readonly event_flags?: Readonly<Record<string, unknown>>;
    } | null;
}

/** always_deny < ask < always_allow (engine D9: the IPC and the readers compare ranks, never special cases). */
const PARAMILITARY_POLICY_RANK: Readonly<Record<ParamilitaryPolicyOrder, number>> = {
    always_deny: 0,
    ask: 1,
    always_allow: 2,
};

export function isParamilitaryPolicyOrder(value: unknown): value is ParamilitaryPolicyOrder {
    return value === 'always_deny' || value === 'ask' || value === 'always_allow';
}

/** The faction's card, matched on the registry's own keys only (never an inherited property). */
function paramilitaryPolicyCardFor(faction: string | null | undefined): ParamilitaryPolicyCard | null {
    if (!faction) return null;
    for (const [registered, card] of Object.entries(PARAMILITARY_POLICY_CARD_BY_FACTION)) {
        if (registered === faction) return card ?? null;
    }
    return null;
}

/** The order the faction's policy card applied, or null when it has not applied (or the faction has no card). */
export function appliedParamilitaryPolicyCardAnswer(
    state: ParamilitaryPolicyStateView,
    faction: string | null | undefined,
): ParamilitaryPolicyOrder | null {
    const card = paramilitaryPolicyCardFor(faction);
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

export function hasParamilitaryPolicyCardApplied(state: ParamilitaryPolicyStateView, faction: string | null | undefined): boolean {
    return appliedParamilitaryPolicyCardAnswer(state, faction) !== null;
}

/**
 * The highest standing order `faction`'s player may hold (M-a): the card's APPLIED answer, or `ask` while the
 * card has not applied. Null when the faction has no card (HRHB) or there is no faction: no cap.
 */
export function paramilitaryStandingOrderCap(
    state: ParamilitaryPolicyStateView,
    faction: string | null | undefined,
): ParamilitaryPolicyOrder | null {
    if (!paramilitaryPolicyCardFor(faction)) return null;
    return appliedParamilitaryPolicyCardAnswer(state, faction) ?? 'ask';
}

/**
 * The one rank check, shared by the review IPC and the modal's Always allow button: `order` is at or below `cap`
 * (always true without a cap). A per-request Allow is an `ask`-rank act, so it is refused under an applied Refuse.
 */
export function isParamilitaryOrderWithinCap(order: ParamilitaryPolicyOrder, cap: ParamilitaryPolicyOrder | null): boolean {
    return cap === null || PARAMILITARY_POLICY_RANK[order] <= PARAMILITARY_POLICY_RANK[cap];
}

/**
 * THE reader of the player's standing order: the recorded order (`ask` when none is recorded), clamped to the
 * cap of `faction` (the player faction). The identity when there is no cap (HRHB, headless).
 */
export function readParamilitaryStandingOrder(
    state: ParamilitaryPolicyStateView,
    faction: string | null | undefined,
): ParamilitaryPolicyOrder {
    const recorded = state.paramilitary_policy;
    const order: ParamilitaryPolicyOrder = isParamilitaryPolicyOrder(recorded) ? recorded : 'ask';
    const cap = paramilitaryStandingOrderCap(state, faction);
    return cap === null || isParamilitaryOrderWithinCap(order, cap) ? order : cap;
}
