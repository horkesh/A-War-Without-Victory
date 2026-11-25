/**
 * Event decisions resolved by silence (player-override model, owner 2026-11-25; Engine Invariants
 * §14.10a; lane C s8 ruling Q7b, H-16).
 *
 * A player-respondent event at autonomy 0-2 is queued for the President when it fires. The desktop
 * pauses the turn right after `evaluate-events` (PAUSE BEFORE COMBAT, turn_pipeline.ts) so his
 * answer lands in-turn, where a bot's answer lands. Whatever he leaves unanswered when the turn
 * resumes is resolved HERE, in the same step boundary, as the bot's choice: `selectBotEventResponse`
 * on the options the card offers, applied through the same applier as the bot path and logged as the
 * bot's answer (`bot_ai_default`/`bot_political`, `answeredBy: 'automatic'`). His explicit answer, a
 * filed answer ahead of firing, or the Observer answer at Level 3 always wins because each of those
 * is applied first.
 *
 * Covered: decisions for the live player's faction whose event fired this turn (a card fired this
 * turn, or an opening birth card whose event fired this turn). Left on the desk, unchanged:
 * - decisions fired on an earlier turn (a save from before this rule; the player answers them);
 * - an opening decision still answerable ahead of its firing;
 * - the §6 cards routed to their own panel (ruling Q7c): the paramilitary policy cards (H-21) and
 *   the HRHB minority-policy halt card (H-20).
 *
 * Inert in headless runs and campaigns without a player (no player-respondent decision is queued).
 * Deterministic: decisions are taken in queue (firing) order; no RNG, no wall clock.
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import { MINORITY_POLICY_CARD_ID_BY_FACTION } from '../../state/displacement_takeover.js';
import { recordSilenceReceipt, selectLivePlayerFaction } from '../player_override.js';
import { isAnswerAheadOfFiringDecision } from './answer_ahead_of_firing.js';
import { applyChosenEventResponse, selectBotEventResponse } from './evaluate_events.js';
import type { EventDefinition, PendingEventDecision } from './event_types.js';
import { PARAMILITARY_POLICY_CARD_ID_BY_FACTION } from './paramilitary_policy_flag.js';

/** The §6 cards this rule leaves to their own panel (lane C s8 ruling Q7c). */
function isSection6RoutedCard(eventId: string): boolean {
    return Object.values(PARAMILITARY_POLICY_CARD_ID_BY_FACTION).includes(eventId)
        || Object.values(MINORITY_POLICY_CARD_ID_BY_FACTION).includes(eventId);
}

function firedThisTurn(state: GameState, decision: PendingEventDecision, turn: number): boolean {
    return decision.turn_fired === turn || state.military.event_last_fired_turn?.[decision.event_id] === turn;
}

/**
 * Resolve, as the bot's choice, every eligible player decision still pending at the end of
 * `evaluate-events` (after the desktop pause, if any). Returns the resolved event ids in order.
 */
export function resolvePlayerEventDecisionsBySilence(
    state: GameState,
    eventDefinitions: readonly EventDefinition[],
    turn: number,
): string[] {
    const playerFaction: FactionId | null = selectLivePlayerFaction(state);
    if (playerFaction == null) return [];
    if (state.meta.phase !== 'war') return [];
    // Observer answers every decision itself at fire time (evaluate_events.ts).
    if ((state.meta.autonomy_level ?? 0) >= 3) return [];
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
        const def = defsById.get(decision.event_id);
        const eligible = def != null
            && decision.faction === playerFaction
            && firedThisTurn(state, decision, turn)
            && !isAnswerAheadOfFiringDecision(state, decision.event_id)
            && !isSection6RoutedCard(decision.event_id);
        if (!eligible) continue;
        // Choose among the options this decision actually offers, as the bot_equivalent harness does.
        const offered = new Set((decision.response_options ?? []).map((option) => option.id));
        const offeredOptions = (def.response_options ?? []).filter((option) => offered.has(option.id));
        if (offeredOptions.length === 0) continue;
        const narrowed: EventDefinition = { ...def, response_options: offeredOptions };
        resolvedRows.add(decision);
        const { chosen, decisionSource } = selectBotEventResponse(state, narrowed, decision.faction, false);
        applyChosenEventResponse(state, {
            eventId: def.id,
            chosen,
            decisionSource,
            faction: decision.faction,
            turn,
            answeredBy: 'automatic',
            notifications: def.notifications_to_other_factions,
        });
        recordSilenceReceipt(state, {
            id: `EVENT_SILENCE_${def.id}`,
            faction: decision.faction,
            turn: Math.min(decision.turn_fired, turn),
            domain: 'events',
            description: `${decision.event_title} — staff proceeded: ${chosen.id}`,
            proposed_action: `EVENT:${def.id}`,
            adopted: true,
            proposed_value: chosen.id,
        }, turn);
        resolved.push(def.id);
    }
    if (resolvedRows.size > 0) {
        state.military.pending_event_decisions = (state.military.pending_event_decisions ?? [])
            .filter((row) => !resolvedRows.has(row));
    }
    return resolved;
}
