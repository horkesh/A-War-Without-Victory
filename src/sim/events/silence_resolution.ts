/**
 * Event decisions resolved by silence (player-override model, owner 2026-11-25; Engine Invariants
 * §14.10a; lane C s8 ruling Q7b, H-16; the §6 cards by the §6 HOW ruling, lane C s8, H-14, H-20, H-21).
 *
 * A player-respondent event at autonomy 0-2 (and the halt card at every level, Observer included:
 * H-20) is queued for the President when it fires. The desktop
 * pauses the turn right after `evaluate-events` (PAUSE BEFORE COMBAT, turn_pipeline.ts) so their
 * answer lands in-turn, where a bot's answer lands. Whatever they leave unanswered when the turn
 * resumes is resolved HERE, in the same step boundary, as the bot's choice: `selectBotEventResponse`
 * on the options the card offers, applied through the same applier as the bot path and logged as the
 * bot's answer (`bot_ai_default`/`bot_political`, `answeredBy: 'automatic'`). Their explicit answer, a
 * filed answer ahead of firing, or the Observer answer at Level 3 always wins because each of those
 * is applied first.
 *
 * The §6 cards (the paramilitary policy cards and the HRHB minority-policy halt card) are resolved the
 * same way, with two rules of their own:
 * - a paramilitary policy card takes the Always allow or Always deny the player already gave that side
 *   in person, if any (F1-B, `selectInPersonParamilitaryOrderResponse`, as Observer does): an explicit
 *   act outranks silence;
 * - the halt card takes its authored historical default (no halt). The halt is the player's act only
 *   (RB5: the halt option is the flag's one writer, and a bot's expulsion policy ignores the card), so
 *   silence never orders it, in either decision mode.
 *
 * Covered: decisions for the live player's faction whose event fired this turn (a card fired this
 * turn, or an opening birth card whose event fired this turn). Left on the desk, unchanged:
 * - decisions fired on an earlier turn (a save from before this rule; the player answers them);
 * - an opening decision still answerable ahead of its firing.
 *
 * Inert in headless runs and campaigns without a player (no player-respondent decision is queued).
 * Deterministic: decisions are taken in queue (firing) order; no RNG, no wall clock.
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import { cloneGameState } from '../../state/clone.js';
import { recordSilenceReceipt, selectLivePlayerFaction } from '../player_override.js';
import { selectInPersonParamilitaryOrderResponse } from './ai_default_response.js';
import { isAnswerAheadOfFiringDecision } from './answer_ahead_of_firing.js';
import { applyChosenEventResponse, isMinorityPolicyHaltCardId, selectBotEventResponse, type BotEventResponseSelection, type PrimaryEventsPass } from './evaluate_events.js';
import type { EventDefinition, EventResponseOption, PendingEventDecision } from './event_types.js';
import { resolveEventDecision } from './resolve_decision.js';
import { PARAMILITARY_POLICY_CARD_ID_BY_FACTION } from './paramilitary_policy_flag.js';

function isParamilitaryPolicyCard(eventId: string): boolean {
    return Object.values(PARAMILITARY_POLICY_CARD_ID_BY_FACTION).includes(eventId);
}

const isMinorityPolicyHaltCard = isMinorityPolicyHaltCardId;

function firedThisTurn(state: GameState, decision: PendingEventDecision, turn: number): boolean {
    return decision.turn_fired === turn || state.military.event_last_fired_turn?.[decision.event_id] === turn;
}

/**
 * The staff's answer to a card the player left unanswered: the bot's choice (the bot path's own selector), except on
 * the §6 cards (see the file header).
 */
function selectStaffAnswer(state: GameState, def: EventDefinition, faction: FactionId): BotEventResponseSelection {
    if (isParamilitaryPolicyCard(def.id)) {
        const inPerson = selectInPersonParamilitaryOrderResponse(state, def);
        if (inPerson) return { chosen: inPerson, decisionSource: 'bot_ai_default' };
    }
    return selectBotEventResponse(state, def, faction, isMinorityPolicyHaltCard(def.id));
}

/**
 * The receipt line for a decision resolved by silence. The §6 cards get a fixed line that names neither the option nor
 * the card title (both carry words the §6 copy rules keep out of a staff receipt); the event decision log keeps the
 * option.
 */
function silenceReceiptText(
    decision: PendingEventDecision,
    chosen: EventResponseOption,
): { description: string; proposed_value?: string } {
    if (isParamilitaryPolicyCard(decision.event_id)) {
        return { description: 'Paramilitary policy decision: staff proceeded under the standing default; the refusal was available.' };
    }
    if (isMinorityPolicyHaltCard(decision.event_id)) {
        return {
            description: 'Minority policy decision: staff proceeded under the standing default and no halt was ordered; '
                + 'the halt was available only when the decision came.',
        };
    }
    return { description: `${decision.event_title} — staff proceeded: ${chosen.id}`, proposed_value: chosen.id };
}

/**
 * Resolve, as the bot's choice, every eligible player decision still pending at the end of
 * `evaluate-events` (after the desktop pause, if any). Returns the resolved event ids in order.
 * With `onlyEventId`, only that card's decisions (the card's slot in firing order, LIVE-HIDDEN-SPLIT).
 */
export function resolvePlayerEventDecisionsBySilence(
    state: GameState,
    eventDefinitions: readonly EventDefinition[],
    turn: number,
    onlyEventId?: string,
): string[] {
    const playerFaction: FactionId | null = selectLivePlayerFaction(state);
    if (playerFaction == null) return [];
    if (state.meta.phase !== 'war') return [];
    // Observer answers every decision itself at fire time (evaluate_events.ts), except the halt card,
    // which queues at every level so the halt is reachable before the first wave (H-20, orchestrator
    // call 1, 2026-11-25); at Observer only that card is resolved here.
    const observer = (state.meta.autonomy_level ?? 0) >= 3;
    const pending = state.military.pending_event_decisions ?? [];
    if (pending.length === 0) return [];

    const defsById = new Map<string, EventDefinition>();
    for (const def of eventDefinitions) {
        if (!defsById.has(def.id)) defsById.set(def.id, def);
    }

    const resolved: string[] = [];
    const resolvedRows = new Set<PendingEventDecision>();
    // A snapshot: an applied answer may queue a further card, which waits for its own turn.
    for (const decision of [...pending]) {
        if (onlyEventId !== undefined && decision.event_id !== onlyEventId) continue;
        const def = defsById.get(decision.event_id);
        const eligible = def != null
            && (!observer || isMinorityPolicyHaltCard(decision.event_id))
            && decision.faction === playerFaction
            && firedThisTurn(state, decision, turn)
            && !isAnswerAheadOfFiringDecision(state, decision.event_id);
        if (!eligible) continue;
        // Choose among the options this decision actually offers, as the bot_equivalent harness does.
        const offered = new Set((decision.response_options ?? []).map((option) => option.id));
        const offeredOptions = (def.response_options ?? []).filter((option) => offered.has(option.id));
        if (offeredOptions.length === 0) continue;
        const narrowed: EventDefinition = { ...def, response_options: offeredOptions };
        resolvedRows.add(decision);
        const { chosen, decisionSource } = selectStaffAnswer(state, narrowed, decision.faction);
        applyChosenEventResponse(state, {
            eventId: def.id,
            chosen,
            decisionSource,
            faction: decision.faction,
            turn,
            answeredBy: 'automatic',
            notifications: def.notifications_to_other_factions,
        });
        const text = silenceReceiptText(decision, chosen);
        recordSilenceReceipt(state, {
            id: `EVENT_SILENCE_${def.id}`,
            faction: decision.faction,
            turn: Math.min(decision.turn_fired, turn),
            domain: 'events',
            description: text.description,
            proposed_action: `EVENT:${def.id}`,
            adopted: true,
            ...(text.proposed_value !== undefined ? { proposed_value: text.proposed_value } : {}),
        }, turn);
        resolved.push(def.id);
    }
    if (resolvedRows.size > 0) {
        state.military.pending_event_decisions = (state.military.pending_event_decisions ?? [])
            .filter((row) => !resolvedRows.has(row));
    }
    return resolved;
}

/** The PAUSE BEFORE COMBAT hook (`TurnInput.onPlayerDecisionsPending`). */
export type PlayerDecisionPauseHook = (
    state: GameState,
    decisions: PendingEventDecision[],
) => Promise<void> | void;

/**
 * The resolver an answer given in person at the pause lands through, on the turn's working state
 * (`TurnInput.resolvePausedDecision`). It must be the one the pause hook answered with: the desktop
 * passes its own (`resolveDesktopEventDecisionInPlace`); the default is the sim's.
 */
export type PausedDecisionResolver = (state: GameState, eventId: string, responseId: string) => void;

/** One answer the President gave in person at the pause, in the order given. */
interface PauseAnswer {
    eventId: string;
    responseId: string;
}

/**
 * Run the pause on a copy of the working state and return the answers given there, in order.
 *
 * PAUSE-ANSWER-ORDER (rulings §58.2, §69): the hook answers on its copy as before, so the paused
 * screen shows each answer and its effect at once, and the card leaves the queue there. The working
 * state is not touched: the caller lands each answer at its card's slot. Every in-person answer
 * writes exactly one `player` row to the decision log (resolve_decision_core.ts, the filing path
 * included), so the rows the copy appended are the answers. Only the answer IPC can change the
 * paused state (ipc_mutation_policy.cjs PAUSED_TURN_IPC_CHANNELS), so nothing else is lost.
 */
async function takePauseAnswers(
    state: GameState,
    turn: number,
    onPlayerDecisionsPending: PlayerDecisionPauseHook,
): Promise<PauseAnswer[]> {
    const pauseView = cloneGameState(state);
    const logLength = (state.military.event_decision_log ?? []).length;
    await onPlayerDecisionsPending(
        pauseView,
        (pauseView.military.pending_event_decisions ?? []).filter((decision) => decision.turn_fired === turn),
    );
    return (pauseView.military.event_decision_log ?? []).slice(logLength)
        .filter((row) => row.decision_source === 'player')
        .map((row) => ({ eventId: row.event_id, responseId: row.response_id }));
}

/**
 * Settle this turn's player decisions inside `evaluate-events`, after the primary firing pass and
 * BEFORE the same-turn follow-up snapshot (#865 r4693814641): first the pause, where the President
 * answers (called at most once, only when a decision fired this turn), then silence, resolved as the
 * staff default. A follow-up row then sees an answered decision in a live game, as it does in
 * headless. Inert in headless (no hook, no player).
 *
 * LIVE-HIDDEN-SPLIT (rulings §53): with `primary`, every answer of the primary pass lands here in
 * firing order: the bot's and the Observer's answers and a filed answer at their cards' slots, the
 * staff default by silence at the player's slot. Headless lands the same answers in the same order,
 * so a hands-off live turn equals a headless one. Anything still eligible afterwards (a card with no
 * slot this pass) is resolved by silence last, as before.
 *
 * PAUSE-ANSWER-ORDER (rulings §69): the President's in-person answer is taken at the pause and lands
 * at its card's slot too, through `resolvePausedDecision`, so its effect sits where the bot's answer
 * to the same card sits headless. An answer to a card with no slot this pass (an older card) lands
 * right after the pause, as before.
 */
export async function settlePlayerEventDecisionsThisTurn(
    state: GameState,
    eventDefinitions: readonly EventDefinition[],
    turn: number,
    onPlayerDecisionsPending: PlayerDecisionPauseHook | undefined,
    primary?: Pick<PrimaryEventsPass, 'settleAnswers' | 'hasPlayerSlot'>,
    resolvePausedDecision: PausedDecisionResolver = resolveEventDecision,
): Promise<void> {
    const firedThisTurn = (state.military.pending_event_decisions ?? [])
        .filter((decision) => decision.turn_fired === turn);
    const answers = firedThisTurn.length > 0 && onPlayerDecisionsPending
        ? await takePauseAnswers(state, turn, onPlayerDecisionsPending)
        : [];
    const land = (answer: PauseAnswer): void => {
        resolvePausedDecision(state, answer.eventId, answer.responseId);
    };
    const atSlots = answers.filter((answer) => primary?.hasPlayerSlot(answer.eventId) === true);
    // An answer to a card with no slot lands now, unless its card exists only because an answer
    // still waiting for its slot queued it on the copy (an answer that opens a further card): that
    // one lands after the slots, in the order given.
    const isPending = (eventId: string): boolean => (state.military.pending_event_decisions ?? [])
        .some((decision) => decision.event_id === eventId);
    const afterSlots: PauseAnswer[] = [];
    for (const answer of answers) {
        if (atSlots.includes(answer)) continue;
        if (afterSlots.length === 0 && isPending(answer.eventId)) land(answer);
        else afterSlots.push(answer);
    }
    primary?.settleAnswers((eventId) => {
        for (const answer of atSlots) {
            if (answer.eventId === eventId) land(answer);
        }
        resolvePlayerEventDecisionsBySilence(state, eventDefinitions, turn, eventId);
    });
    for (const answer of afterSlots) land(answer);
    resolvePlayerEventDecisionsBySilence(state, eventDefinitions, turn);
}
