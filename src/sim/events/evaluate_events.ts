/**
 * B1→v0.4.1 Event evaluation: deterministic evaluation of event registry.
 * Uses caller-provided RNG for random events; stable iteration order.
 * v0.4.1: applies mechanical effects via applyEventEffects; tracks fired_event_ids for once-only events.
 * v0.4.1 Phase 2: decision events — player faction queues pending decisions; bot factions auto-respond.
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import { EVENT_REGISTRY } from './event_registry.js';
import { applyEventEffects } from './apply_effects.js';
import type { EventDefinition, EventResponseOption, FiredEvent, PendingEventDecision, Rng } from './event_types.js';
import { triggerMatches } from './event_types.js';

export interface EventsEvaluationReport {
    fired: FiredEvent[];
}

/** Collect all effects from an event definition (primary + additional). */
function collectEffects(def: EventDefinition) {
    const effects = [def.effect];
    if (def.effects) {
        effects.push(...def.effects);
    }
    return effects;
}

/** Pick a bot response option based on the event's bot_response_logic. */
function pickBotResponse(
    options: EventResponseOption[],
    logic: EventDefinition['bot_response_logic']
): EventResponseOption {
    if (logic === 'reject_all') return options[options.length - 1];
    // 'accept_first', 'capital_based', and 'capital_weighted' all pick first (capital logic is placeholder)
    return options[0];
}

/** Get the narrative text for the primary effect of an event definition. */
function getNarrativeText(def: EventDefinition): string {
    // Prefer title/narrative fields when available
    if (def.title) return def.title;
    if (def.narrative) return def.narrative;
    const effects = collectEffects(def);
    const narrativeEffects = effects.filter(e => e.kind === 'narrative');
    return narrativeEffects.length > 0
        ? narrativeEffects.map(e => e.kind === 'narrative' ? e.text : '').join(' ')
        : def.id;
}

/**
 * Evaluate events for the current turn. Deterministic: same state, turn, and rng sequence -> same fired list.
 * Iterates EVENT_REGISTRY in order; for each event, if trigger matches and (if probability) rng() < probability, fire.
 * Once-only events (def.once === true) are skipped if their id is in state.military.fired_event_ids.
 *
 * Decision events (response_options present):
 * - For the player faction: queued as PendingEventDecision on state.military.pending_event_decisions.
 *   Primary/additional effects are still applied immediately; response effects wait for player choice.
 * - For bot factions: auto-responded using bot_response_logic; response effects applied immediately.
 */
export function evaluateEvents(
    state: GameState,
    rng: Rng,
    currentTurn: number
): EventsEvaluationReport {
    const fired: FiredEvent[] = [];
    const phase = state.meta.phase;
    if (phase !== 'war') {
        return { fired };
    }

    // Ensure fired_event_ids array exists
    if (!state.military.fired_event_ids) {
        state.military.fired_event_ids = [];
    }
    const firedIds = state.military.fired_event_ids;
    const playerFaction = state.meta.player_faction as FactionId | undefined;
    const allFactions: FactionId[] = ['RBiH', 'RS', 'HRHB'];

    for (const def of EVENT_REGISTRY) {
        // Skip once-only events that have already fired
        if (def.once && firedIds.includes(def.id)) continue;

        if (!triggerMatches(def, state, currentTurn)) continue;
        if (def.probability != null) {
            if (rng() >= def.probability) continue;
        }

        // Collect all effects and apply mechanical ones (primary + additional)
        const effects = collectEffects(def);
        applyEventEffects(state, effects);

        const text = getNarrativeText(def);
        fired.push({ id: def.id, text });

        // Handle decision events (response_options present)
        if (def.response_options && def.response_options.length > 0) {
            for (const faction of allFactions) {
                if (playerFaction && faction === playerFaction) {
                    // Player faction: queue as pending decision
                    if (!state.military.pending_event_decisions) {
                        state.military.pending_event_decisions = [];
                    }
                    state.military.pending_event_decisions.push({
                        event_id: def.id,
                        event_title: text,
                        turn_fired: currentTurn,
                        response_options: def.response_options,
                        faction,
                    });
                } else {
                    // Bot faction: auto-respond
                    const chosen = pickBotResponse(def.response_options, def.bot_response_logic);
                    applyEventEffects(state, chosen.effects);
                }
            }
        }

        // Track once-only events
        if (def.once) {
            firedIds.push(def.id);
        }
    }

    return { fired };
}
