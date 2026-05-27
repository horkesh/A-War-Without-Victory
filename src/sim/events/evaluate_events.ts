/**
 * B1→v0.4.1 Event evaluation: deterministic evaluation of event registry.
 * Uses caller-provided RNG for random events; stable iteration order.
 * v0.4.1: applies mechanical effects via applyEventEffects; tracks fired_event_ids for once-only events.
 * v0.4.1 Phase 2: decision events — player faction queues pending decisions; bot factions auto-respond.
 * v0.6.0: recurrence model, priority queue (4/turn cap), pressure integration, dimension shifts.
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { getEventRegistry } from './event_registry.js';
import { applyEventEffects } from './apply_effects.js';
import type { EventDefinition, DimensionShift, EventResponseOption, FiredEvent, PendingEventDecision, Rng } from './event_types.js';
import { triggerMatches } from './event_types.js';
import { isEventReady } from './pressure_system.js';
import { pickBotResponseV1 } from './bot_response.js';
import { applyAIDefaultResponse } from './ai_default_response.js';
import { emitEventNotifications, isTwoLevelNotificationsEnabled } from './emit_notifications.js';
import { applyDimensionShift, type DimensionStore } from './strategic_dimensions.js';
import { getPoliticalPersonality, computePoliticalAssessment } from '../political/political_personality.js';
import { pickPoliticalResponse } from '../political/political_event_decision.js';

/**
 * Maximum events that can fire in a single turn.
 * Raised from 3→4: at w5, jna_withdrawal_1992 was crowded out by 4+ eligible
 * events (barracks + others), preventing the jna_withdrawn flag from firing
 * and breaking the Drina → Srebrenica → Corridor cascade chain.
 */
const MAX_EVENTS_PER_TURN = 4;

export interface EventsEvaluationReport {
    fired: FiredEvent[];
    candidates_considered: number;
    overflowed: boolean;
    overflowed_ids: string[];
    mutex_suppressed_ids: string[];
}

/** Canonical candidate ordering before the per-turn cap is applied. */
export function compareEventCandidates(a: EventDefinition, b: EventDefinition): number {
    const priorityDelta = (a.priority ?? 100) - (b.priority ?? 100);
    if (priorityDelta !== 0) return priorityDelta;

    const turnDelta = (a.trigger.turn_min ?? Number.MAX_SAFE_INTEGER) - (b.trigger.turn_min ?? Number.MAX_SAFE_INTEGER);
    if (turnDelta !== 0) return turnDelta;

    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
}

/** Keep the first event per mutex group in canonical order and suppress later same-turn siblings. */
export function filterMutexCandidates(candidates: EventDefinition[]): {
    candidates: EventDefinition[];
    mutex_suppressed_ids: string[];
} {
    const seenGroups = new Set<string>();
    const filtered: EventDefinition[] = [];
    const mutexSuppressedIds: string[] = [];

    for (const candidate of candidates) {
        const group = candidate.mutex_group;
        if (group == null || group.length === 0) {
            filtered.push(candidate);
            continue;
        }
        if (seenGroups.has(group)) {
            mutexSuppressedIds.push(candidate.id);
            continue;
        }
        seenGroups.add(group);
        filtered.push(candidate);
    }

    return { candidates: filtered, mutex_suppressed_ids: mutexSuppressedIds };
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
export function applyDefinitionDimensionShifts(state: GameState, shifts: DimensionShift[] | undefined): void {
    if (!shifts || shifts.length === 0) return;
    const negotiation = state.military.negotiation;
    if (!negotiation?.strategic_dimensions) return;
    const store = negotiation.strategic_dimensions as DimensionStore;
    for (const shift of shifts) {
        applyDimensionShift(store, shift.faction, shift.dimension, shift.delta);
    }
}

/** Apply sets_flags from an event definition to event_flags on state. */
export function applyDefinitionFlags(state: GameState, flags: Record<string, string | number | boolean> | undefined): void {
    if (!flags) return;
    if (!state.military.event_flags) {
        state.military.event_flags = {};
    }
    for (const [key, value] of Object.entries(flags)) {
        state.military.event_flags[key] = value;
    }
}

/** Append a structured entry to `state.military.event_decision_log` recording
 *  which response option was selected for an event, and which pick path made
 *  the choice. Exported because `resolve_decision.ts` calls this when the
 *  player responds via IPC. See game_state.ts `event_decision_log` docstring. */
export function recordEventDecision(
    state: GameState,
    eventId: string,
    responseId: string,
    decisionSource: 'bot_political' | 'bot_v1' | 'bot_ai_default' | 'player',
    faction: FactionId | null,
    currentTurn: number,
): void {
    if (!state.military.event_decision_log) {
        state.military.event_decision_log = [];
    }
    state.military.event_decision_log.push({
        event_id: eventId,
        response_id: responseId,
        decision_source: decisionSource,
        faction,
        turn: currentTurn,
    });
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

function uniqueStringsInOrder(values: readonly unknown[] | undefined): string[] {
    if (!Array.isArray(values)) return [];
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const value of values) {
        if (typeof value !== 'string' || seen.has(value)) continue;
        seen.add(value);
        ids.push(value);
    }
    return ids;
}

function isCandidateEligible(
    def: EventDefinition,
    state: GameState,
    rng: Rng,
    currentTurn: number,
    edges?: EdgeRecord[],
): boolean {
    if (!canEventFire(def, state, currentTurn)) return false;

    if (def.pressure) {
        // Pressure events: readiness can persist briefly after a trigger gate closes;
        // require the trigger to still match before allowing the event to fire.
        if (!triggerMatches(def, state, currentTurn, edges)) return false;
        if (!isEventReady(state, def)) return false;
    } else if (!triggerMatches(def, state, currentTurn, edges)) {
        return false;
    }

    if (def.probability != null && rng() >= def.probability) return false;
    return true;
}

/** Default moderate commander profile for bot response selection. */
const DEFAULT_BOT_COMMANDER = { aggressiveness: 3, competence: 3 };

/**
 * Logic types that route through the political personality engine (Phase 2).
 * All other logic types fall back to pickBotResponseV1.
 * Declared at module scope — constant, no need to recreate per event.
 */
const POLITICAL_LOGICS = new Set<string>(['strategic_weighted', 'capital_based', 'capital_weighted']);

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
    registry?: EventDefinition[],
    edges?: EdgeRecord[]
): EventsEvaluationReport {
    const fired: FiredEvent[] = [];
    const phase = state.meta.phase;
    if (phase !== 'war') {
        state.military.event_overflow_queue = [];
        return { fired, candidates_considered: 0, overflowed: false, overflowed_ids: [], mutex_suppressed_ids: [] };
    }

    // Ensure fired_event_ids array exists
    if (!state.military.fired_event_ids) {
        state.military.fired_event_ids = [];
    }
    const firedIds = state.military.fired_event_ids;
    const playerFaction = state.meta.player_faction;

    const events = registry ?? getEventRegistry();
    const canonicalEvents = [...events].sort(compareEventCandidates);
    const eventsById = new Map<string, EventDefinition>();
    for (const def of canonicalEvents) {
        if (!eventsById.has(def.id)) {
            eventsById.set(def.id, def);
        }
    }

    // Phase 1: Collect candidates
    const queuedIds = uniqueStringsInOrder(state.military.event_overflow_queue);
    const queuedIdSet = new Set(queuedIds);
    const queuedCandidates: EventDefinition[] = [];
    for (const id of queuedIds) {
        const def = eventsById.get(id);
        if (!def) continue;
        if (isCandidateEligible(def, state, rng, currentTurn, edges)) {
            queuedCandidates.push(def);
        }
    }

    const newCandidates: EventDefinition[] = [];
    const seenNewIds = new Set<string>();
    for (const def of canonicalEvents) {
        if (queuedIdSet.has(def.id) || seenNewIds.has(def.id)) continue;
        if (isCandidateEligible(def, state, rng, currentTurn, edges)) {
            newCandidates.push(def);
            seenNewIds.add(def.id);
        }
    }

    // Phase 2: Sort canonically, suppress same-turn mutex siblings, then cap.
    const candidates = [...queuedCandidates, ...newCandidates];
    candidates.sort(compareEventCandidates);
    const mutexFiltered = filterMutexCandidates(candidates);
    const overflowedIds = mutexFiltered.candidates.slice(MAX_EVENTS_PER_TURN).map((def) => def.id);
    state.military.event_overflow_queue = overflowedIds;
    const toFire = mutexFiltered.candidates.slice(0, MAX_EVENTS_PER_TURN);

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
            const autonomyLevel = state.meta.autonomy_level ?? 0;
            // Explicit owner first. Legacy soft derivation is kept only from authored event data,
            // never from the current player faction.
            const respondingFaction: FactionId | null =
                def.responding_faction
                ?? def.dimension_shifts?.[0]?.faction
                ?? def.response_options?.[0]?.dimension_shifts?.[0]?.faction
                ?? null;
            const isPlayerRespondent = playerFaction != null && respondingFaction === playerFaction;
            const mustShowPlayer = isPlayerRespondent && (autonomyLevel < 3 || def.requires_player_response === true);
            if (mustShowPlayer) {
                // Player faction (levels 0-2) OR high-stakes event at any level: queue as pending decision
                if (!state.military.pending_event_decisions) {
                    state.military.pending_event_decisions = [];
                }
                state.military.pending_event_decisions.push({
                    event_id: def.id,
                    event_title: text,
                    ...(def.narrative ? { narrative: def.narrative } : {}),
                    ...(def.category ? { category: def.category } : {}),
                    ...(def.situation ? { situation: def.situation } : {}),
                    ...(def.staff_assessment ? { staff_assessment: def.staff_assessment } : {}),
                    ...(def.trigger_evidence && def.trigger_evidence.length > 0
                        ? { trigger_evidence: [...def.trigger_evidence] }
                        : {}),
                    ...(def.historical_source ? { historical_source: def.historical_source } : {}),
                    ...(def.source_note ? { source_note: def.source_note } : {}),
                    ...(def.source ? { source: def.source } : {}),
                    turn_fired: currentTurn,
                    response_options: def.response_options,
                    faction: respondingFaction,
                    requires_player_response: def.requires_player_response,
                    ...(def.historical_default_response_id
                        ? { historical_default_response_id: def.historical_default_response_id }
                        : {}),
                    ...(isTwoLevelNotificationsEnabled()
                        ? { notifications_to_other_factions: def.notifications_to_other_factions }
                        : {}),
                });
            } else {
                // No player faction (headless/spectator) OR Observer (level 3) for non-required events: bot auto-responds.
                // Political personality path for dimension-weighted logic types.
                let chosen: EventResponseOption;
                let decisionSource: 'bot_political' | 'bot_v1' | 'bot_ai_default';
                if (isTwoLevelNotificationsEnabled()) {
                    chosen = applyAIDefaultResponse(state, def);
                    decisionSource = 'bot_ai_default';
                } else if (POLITICAL_LOGICS.has(def.bot_response_logic ?? '') && respondingFaction !== null) {
                    const personality = getPoliticalPersonality(respondingFaction);
                    const assessment = computePoliticalAssessment(state, respondingFaction, personality);
                    chosen = pickPoliticalResponse(def.response_options, respondingFaction, assessment, personality);
                    applyEventEffects(state, chosen.effects ?? []);
                    // Apply flags and dimension shifts from the chosen response option
                    applyDefinitionFlags(state, chosen.sets_flags);
                    applyDefinitionDimensionShifts(state, chosen.dimension_shifts);
                    decisionSource = 'bot_political';
                } else {
                    chosen = pickBotResponseV1(
                        def.response_options,
                        def.bot_response_logic,
                        DEFAULT_BOT_COMMANDER,
                        def.historical_default_response_id,
                    );
                    applyEventEffects(state, chosen.effects ?? []);
                    // Apply flags and dimension shifts from the chosen response option
                    applyDefinitionFlags(state, chosen.sets_flags);
                    applyDefinitionDimensionShifts(state, chosen.dimension_shifts);
                    decisionSource = 'bot_v1';
                }
                recordEventDecision(state, def.id, chosen.id, decisionSource, respondingFaction, currentTurn);
                if (isTwoLevelNotificationsEnabled() && respondingFaction !== null) {
                    emitEventNotifications(
                        state,
                        { event_id: def.id, notifications_to_other_factions: def.notifications_to_other_factions },
                        chosen.id,
                        respondingFaction,
                        currentTurn,
                    );
                }
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

    return {
        fired,
        candidates_considered: candidates.length,
        overflowed: overflowedIds.length > 0,
        overflowed_ids: overflowedIds,
        mutex_suppressed_ids: mutexFiltered.mutex_suppressed_ids,
    };
}
