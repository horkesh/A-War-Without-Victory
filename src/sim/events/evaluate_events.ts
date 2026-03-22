/**
 * B1→v0.4.1 Event evaluation: deterministic evaluation of event registry.
 * Uses caller-provided RNG for random events; stable iteration order.
 * v0.4.1: applies mechanical effects via applyEventEffects; tracks fired_event_ids for once-only events.
 * v0.4.1 Phase 2: decision events — player faction queues pending decisions; bot factions auto-respond.
 * v0.6.0: recurrence model, priority queue (3/turn cap), pressure integration, dimension shifts.
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import { getEventRegistry } from './event_registry.js';
import { applyEventEffects } from './apply_effects.js';
import type { EventDefinition, DimensionShift, EventResponseOption, FiredEvent, PendingEventDecision, Rng } from './event_types.js';
import { triggerMatches } from './event_types.js';
import { isEventReady } from './pressure_system.js';
import { pickBotResponseV1 } from './bot_response.js';
import { applyDimensionShift, type DimensionStore } from './strategic_dimensions.js';

/** Maximum events that can fire in a single turn. */
const MAX_EVENTS_PER_TURN = 3;

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

/**
 * Check whether an event is allowed to fire based on once/recurrence rules.
 * Exported for testing.
 */
export function canEventFire(def: EventDefinition, state: GameState, currentTurn: number): boolean {
    const firedIds = state.military.fired_event_ids ?? [];

    // 1. once:true events that already fired
    if (def.once && firedIds.includes(def.id)) return false;

    // 2. Recurrence max_fires check
    if (def.recurrence) {
        const fireCount = state.military.event_fire_counts?.[def.id] ?? 0;
        if (def.recurrence.max_fires != null && fireCount >= def.recurrence.max_fires) return false;

        // 3. Cooldown check
        if (def.recurrence.cooldown_turns != null && def.recurrence.cooldown_turns > 0) {
            const lastFired = state.military.event_last_fired_turn?.[def.id];
            if (lastFired != null && (currentTurn - lastFired) < def.recurrence.cooldown_turns) return false;
        }
    }

    return true;
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

/** Apply dimension_shifts from an event definition to the strategic dimensions store. */
function applyDefinitionDimensionShifts(state: GameState, shifts: DimensionShift[] | undefined): void {
    if (!shifts || shifts.length === 0) return;
    const negotiation = state.military.negotiation;
    if (!negotiation?.strategic_dimensions) return;
    const store = negotiation.strategic_dimensions as DimensionStore;
    for (const shift of shifts) {
        applyDimensionShift(store, shift.faction, shift.dimension, shift.delta);
    }
}

/** Apply sets_flags from an event definition to event_flags on state. */
function applyDefinitionFlags(state: GameState, flags: Record<string, string | number | boolean> | undefined): void {
    if (!flags) return;
    if (!state.military.event_flags) {
        state.military.event_flags = {};
    }
    for (const [key, value] of Object.entries(flags)) {
        state.military.event_flags[key] = value;
    }
}

/** Record fire counts and last-fired turn for an event. */
function recordEventFiring(state: GameState, eventId: string, currentTurn: number): void {
    if (!state.military.event_fire_counts) {
        state.military.event_fire_counts = {};
    }
    state.military.event_fire_counts[eventId] = (state.military.event_fire_counts[eventId] ?? 0) + 1;

    if (!state.military.event_last_fired_turn) {
        state.military.event_last_fired_turn = {};
    }
    state.military.event_last_fired_turn[eventId] = currentTurn;
}

/** Add enabled event IDs from an event's enables_events list. */
function recordEnabledEvents(state: GameState, enablesEvents: string[] | undefined): void {
    if (!enablesEvents || enablesEvents.length === 0) return;
    if (!state.military.enabled_event_ids) {
        state.military.enabled_event_ids = [];
    }
    for (const id of enablesEvents) {
        if (!state.military.enabled_event_ids.includes(id)) {
            state.military.enabled_event_ids.push(id);
        }
    }
}

/** Default moderate commander profile for bot response selection. */
const DEFAULT_BOT_COMMANDER = { aggressiveness: 3, competence: 3 };

/**
 * Evaluate events for the current turn. Deterministic: same state, turn, and rng sequence -> same fired list.
 * Phase 1: Collect candidates (recurrence gating, trigger/pressure matching, probability roll).
 * Phase 2: Sort by priority (lower first), cap at MAX_EVENTS_PER_TURN.
 * Phase 3: Fire top candidates — apply effects, record state, handle decisions.
 *
 * Events WITH pressure config use isEventReady() instead of triggerMatches().
 * Events WITHOUT pressure config use triggerMatches() (backward compatible).
 *
 * Decision events (response_options present):
 * - For the player faction: queued as PendingEventDecision on state.military.pending_event_decisions.
 *   Primary/additional effects are still applied immediately; response effects wait for player choice.
 * - For bot factions: auto-responded using pickBotResponseV1; response effects applied immediately.
 */
export function evaluateEvents(
    state: GameState,
    rng: Rng,
    currentTurn: number,
    registry?: EventDefinition[]
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

    const events = registry ?? getEventRegistry();

    // Phase 1: Collect candidates
    const candidates: EventDefinition[] = [];
    for (const def of events) {
        // Recurrence/once gating
        if (!canEventFire(def, state, currentTurn)) continue;

        // Pressure-based vs trigger-based evaluation
        if (def.pressure) {
            // Pressure events: fire when readiness >= threshold
            if (!isEventReady(state, def)) continue;
        } else {
            // Legacy events: use triggerMatches
            if (!triggerMatches(def, state, currentTurn)) continue;
        }

        // Probability gate (applies to both paths)
        if (def.probability != null) {
            if (rng() >= def.probability) continue;
        }

        candidates.push(def);
    }

    // Phase 2: Sort by priority (lower first, default 100) and cap at 3
    candidates.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    const toFire = candidates.slice(0, MAX_EVENTS_PER_TURN);

    // Phase 3: Fire selected events
    for (const def of toFire) {
        // Collect all effects and apply mechanical ones (primary + additional)
        const effects = collectEffects(def);
        applyEventEffects(state, effects);

        // Apply dimension_shifts and sets_flags from the definition itself
        applyDefinitionDimensionShifts(state, def.dimension_shifts);
        applyDefinitionFlags(state, def.sets_flags);

        const text = getNarrativeText(def);
        fired.push({ id: def.id, text });

        // Handle decision events (response_options present)
        // Diplomatic events fire once globally. Player gets a decision; bots auto-respond once.
        if (def.response_options && def.response_options.length > 0) {
            if (playerFaction) {
                // Player faction: queue as pending decision
                if (!state.military.pending_event_decisions) {
                    state.military.pending_event_decisions = [];
                }
                state.military.pending_event_decisions.push({
                    event_id: def.id,
                    event_title: text,
                    turn_fired: currentTurn,
                    response_options: def.response_options,
                    faction: playerFaction,
                });
            } else {
                // No player faction (headless/spectator): bot auto-responds once
                const chosen = pickBotResponseV1(def.response_options, def.bot_response_logic, DEFAULT_BOT_COMMANDER);
                applyEventEffects(state, chosen.effects);
            }
        }

        // Track once-only events
        if (def.once) {
            firedIds.push(def.id);
        }

        // Record fire count and last-fired turn (for ALL events, not just recurring)
        recordEventFiring(state, def.id, currentTurn);

        // Record enabled events
        recordEnabledEvents(state, def.enables_events);

        // Reset pressure readiness after firing (pressure events only)
        if (def.pressure && state.military.event_readiness) {
            state.military.event_readiness[def.id] = 0;
        }
    }

    return { fired };
}
