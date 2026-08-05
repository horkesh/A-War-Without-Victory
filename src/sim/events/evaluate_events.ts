/**
 * B1→v0.4.1 Event evaluation: deterministic evaluation of event registry.
 * Event eligibility is derived from state, authored triggers, and pressure.
 * v0.4.1: applies mechanical effects via applyEventEffects; tracks fired_event_ids for once-only events.
 * v0.4.1 Phase 2: decision events — player faction queues pending decisions; bot factions auto-respond.
 * v0.6.0: recurrence model, priority queue (4/turn cap), pressure integration, dimension shifts.
 */

import type { GameState, FactionId, CausalityLogEntry } from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { getEventRegistry } from './event_registry.js';
import { applyEventEffects } from './apply_effects.js';
import type { EventDefinition, DimensionShift, EventResponseOption, FiredEvent, PendingEventDecision, Rng } from './event_types.js';
import { triggerMatches } from './event_types.js';
import { isEventReady } from './pressure_system.js';
import { pickBotResponseV1 } from './bot_response.js';
import { applyAIDefaultResponse, hasAuthoredAIDefaultResponse } from './ai_default_response.js';
import { emitEventNotifications } from './emit_notifications.js';
import { applyDimensionShift, type DimensionStore } from './strategic_dimensions.js';
import { getPoliticalPersonality, computePoliticalAssessment } from '../political/political_personality.js';
import { pickPoliticalResponse } from '../political/political_event_decision.js';
import { compareCausalityEntries, strictCompare } from '../../state/validateGameState.js';

/**
 * Maximum PLAYER-FACING DECISION events that can fire in a single turn.
 *
 * The cap exists ONLY for decision-modal pacing: it bounds how many
 * player-decision events (events with non-empty `response_options`) can be
 * queued / auto-resolved in one turn so the player is not flooded with modals.
 *
 * Auto-resolving and pure flag-setter events (no `response_options`) are NEVER
 * capped — they fire unconditionally when eligible and are never sent to the
 * overflow queue. A flag-setter crowded out on the last turn of its window
 * (e.g. jna_withdrawal_1992, turn 5-5) would otherwise be permanently dropped
 * because the next turn `triggerMatches` rejects it (currentTurn > turn_max),
 * silently killing downstream causal chains (Srebrenica/Žepa enclave + falls).
 * See fix(events): cap only player-facing decisions (silent-drop bug).
 */
const MAX_EVENTS_PER_TURN = 4;

/**
 * A "player-decision" event is one that presents response options to a faction.
 * Only these are subject to MAX_EVENTS_PER_TURN + the overflow queue; auto /
 * flag-setter events bypass both. Decision-event status is a property of the
 * authored definition (presence of non-empty `response_options`), independent
 * of which faction is the player this run — keeping the partition deterministic
 * and run-invariant.
 */
export function isPlayerDecisionEvent(def: EventDefinition): boolean {
    return Array.isArray(def.response_options) && def.response_options.length > 0;
}

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
    const fireCount = state.military.event_fire_counts?.[def.id] ?? 0;

    // 1. once:true events that already fired through either canonical path.
    // Natural evaluation records both the id and count; desktop-initiated
    // actions record the count at queue time. Either receipt must seal the
    // row against a later natural queue without coupling the evaluator to the
    // desktop-only action_cadence contract.
    if (def.once && (firedIds.includes(def.id) || fireCount > 0)) return false;

    // 2. Recurrence max_fires check
    if (def.recurrence) {
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

    const policyFlag = state.meta.player_faction === 'RS'
        ? 'rs_paramilitary_policy'
        : state.meta.player_faction === 'RBiH'
            ? 'rbih_paramilitary_policy'
            : null;
    const policy = policyFlag ? flags[policyFlag] : undefined;
    if (policy === 'always_allow' || policy === 'always_deny' || policy === 'ask') {
        state.paramilitary_policy = policy;
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

/** Add enabled event IDs from an event's enables_events list.
 *  Phase B Sub-slice B3: EXPORTED (was module-private at line 184 in B2/B1).
 *  Performs dedup-on-append plus canonical sort-on-write via `strictCompare`.
 *  Sort-on-write is NET-NEW behavior in B3 — the B1/B2 helper only deduped.
 *  Single-writer discipline: this is the ONLY entry point to
 *  `state.military.enabled_event_ids` per packet §3.7.
 *  See packet `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md` §3.2, §3.7. */
export function recordEnabledEvents(state: GameState, enablesEvents: string[] | undefined): void {
    if (!enablesEvents || enablesEvents.length === 0) return;
    if (!state.military.enabled_event_ids) {
        state.military.enabled_event_ids = [];
    }
    const arr = state.military.enabled_event_ids;
    let mutated = false;
    for (const id of enablesEvents) {
        if (!arr.includes(id)) {
            arr.push(id);
            mutated = true;
        }
    }
    if (mutated) {
        arr.sort(strictCompare);
    }
}

/** Add closed event IDs from a response's closes_events_runtime list (and any
 *  other foreclosure source). Symmetrical to `recordEnabledEvents`.
 *  Phase B Sub-slice B3: NEW WRITER.
 *  Performs dedup-on-append plus canonical sort-on-write via `strictCompare`.
 *  Single-writer discipline: this is the ONLY entry point to
 *  `state.military.closed_event_ids` per packet §3.7.
 *  See packet §3.2 (soft foreclosure), §3.3 (response-level runtime arrays). */
export function recordClosedEvents(state: GameState, closedEvents: string[] | undefined): void {
    if (!closedEvents || closedEvents.length === 0) return;
    if (!state.military.closed_event_ids) {
        state.military.closed_event_ids = [];
    }
    const arr = state.military.closed_event_ids;
    let mutated = false;
    for (const id of closedEvents) {
        if (!arr.includes(id)) {
            arr.push(id);
            mutated = true;
        }
    }
    if (mutated) {
        arr.sort(strictCompare);
    }
}

/** Append a structured entry to `state.military.event_causality_log`.
 *  Phase B Sub-slice B3: NEW WRITER.
 *  Performs dedup (skip identical entries) plus canonical sort-on-write via
 *  the same `compareCausalityEntries` the validator uses (single source of
 *  truth — packet §3.7). Single-writer discipline: this is the ONLY entry
 *  point to `state.military.event_causality_log`. */
export function recordCausality(state: GameState, entry: CausalityLogEntry): void {
    if (!state.military.event_causality_log) {
        state.military.event_causality_log = [];
    }
    const log = state.military.event_causality_log;
    // Normalize to the tuple shape used by compareCausalityEntries (null → '').
    const tupleOf = (e: CausalityLogEntry) => ({
        turn: e.turn,
        from_event: e.from_event,
        to_event: e.to_event ?? '',
        to_flag: e.to_flag ?? '',
        kind: e.kind,
        source_response_id: e.source_response_id ?? '',
    });
    const newTuple = tupleOf(entry);
    // Dedup: skip identical entries (same compare-tuple).
    for (const existing of log) {
        if (compareCausalityEntries(tupleOf(existing), newTuple) === 0) {
            return;
        }
    }
    log.push(entry);
    log.sort((a, b) => compareCausalityEntries(tupleOf(a), tupleOf(b)));
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
    currentTurn: number,
    edges?: EdgeRecord[],
): boolean {
    // Phase B Sub-slice B3: short-circuit on closed/disabled BEFORE pressure or
    // eligibility work. Packet §3.2, §3.5 — closed events never reach pressure
    // accumulation; required-enabled events skip eligibility cost when ungated.
    // 1. Soft foreclosure — `closed_event_ids` overrides everything (including
    //    recurrence / overflow re-eval). Readiness is NOT zeroed on close, so
    //    re-opening (Phase D+, manual only) restores prior state.
    if (state.military.closed_event_ids && state.military.closed_event_ids.includes(def.id)) {
        return false;
    }
    // 2. Opt-in `requires_enabled` gate — event only eligible if id is in
    //    `enabled_event_ids`. Default false preserves existing catalog behavior.
    if (def.requires_enabled === true) {
        const enabled = state.military.enabled_event_ids;
        if (!enabled || !enabled.includes(def.id)) return false;
    }

    if (!canEventFire(def, state, currentTurn)) return false;

    if (def.pressure) {
        // Pressure events: readiness can persist briefly after a trigger gate closes;
        // require the trigger to still match before allowing the event to fire.
        if (!triggerMatches(def, state, currentTurn, edges)) return false;
        if (!isEventReady(state, def)) return false;
    } else if (!triggerMatches(def, state, currentTurn, edges)) {
        return false;
    }

    return true;
}

/** Apply response-level runtime causality (`enables_events_runtime` /
 *  `closes_events_runtime`) for a chosen option, writing through the shared
 *  helpers and recording matching `event_causality_log` entries.
 *
 *  Used by both the player path (resolve_decision.ts) and the bot path
 *  (evaluate_events.ts auto-resolve), so both paths produce IDENTICAL deltas
 *  to `enabled_event_ids`, `closed_event_ids`, and `event_causality_log` for
 *  the same choice. Packet §3.3, §3.5.
 *
 *  No-op rule per packet §3.3: a close targeting an already-fired event is a
 *  state no-op (no write to closed_event_ids is needed since closure is
 *  redundant), but a causality entry is still recorded so the audit trail
 *  reflects the authoring intent. Same logic for an `enables` target that
 *  is once-fired. */
export function applyResponseRuntimeCausality(
    state: GameState,
    fromEventId: string,
    sourceResponseId: string,
    chosen: { enables_events_runtime?: string[]; closes_events_runtime?: string[] },
    currentTurn: number,
): void {
    const firedIds = state.military.fired_event_ids ?? [];

    // Enables — write to enabled_event_ids (unless target is already once-fired).
    if (chosen.enables_events_runtime && chosen.enables_events_runtime.length > 0) {
        const toWrite: string[] = [];
        for (const targetId of chosen.enables_events_runtime) {
            if (!firedIds.includes(targetId)) {
                toWrite.push(targetId);
            }
            // Causality entry is recorded for ALL targets (including no-op
            // already-fired) so the audit trail captures authoring intent.
            recordCausality(state, {
                turn: currentTurn,
                from_event: fromEventId,
                to_event: targetId,
                to_flag: null,
                kind: 'enables',
                source_response_id: sourceResponseId,
            });
        }
        recordEnabledEvents(state, toWrite);
    }

    // Closes — write to closed_event_ids (unless target is already fired —
    // closing it is a no-op since the event already resolved).
    if (chosen.closes_events_runtime && chosen.closes_events_runtime.length > 0) {
        const toWrite: string[] = [];
        for (const targetId of chosen.closes_events_runtime) {
            if (!firedIds.includes(targetId)) {
                toWrite.push(targetId);
            }
            recordCausality(state, {
                turn: currentTurn,
                from_event: fromEventId,
                to_event: targetId,
                to_flag: null,
                kind: 'closes',
                source_response_id: sourceResponseId,
            });
        }
        recordClosedEvents(state, toWrite);
    }
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
 * Evaluate events for the current turn. Deterministic: same state and turn -> same fired list.
 * Phase 1: Collect candidates (recurrence gating and trigger/pressure matching).
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
    _rng: Rng,
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
        if (isCandidateEligible(def, state, currentTurn, edges)) {
            queuedCandidates.push(def);
        }
    }

    const newCandidates: EventDefinition[] = [];
    const seenNewIds = new Set<string>();
    for (const def of canonicalEvents) {
        if (queuedIdSet.has(def.id) || seenNewIds.has(def.id)) continue;
        if (isCandidateEligible(def, state, currentTurn, edges)) {
            newCandidates.push(def);
            seenNewIds.add(def.id);
        }
    }

    // Phase 2: Sort canonically, suppress same-turn mutex siblings, then cap.
    const candidates = [...queuedCandidates, ...newCandidates];
    candidates.sort(compareEventCandidates);
    const mutexFiltered = filterMutexCandidates(candidates);
    // Phase B Sub-slice B3: record mutex-suppressed causality entries (packet §3.4).
    // Determinism: mutex_suppressed_ids comes from `filterMutexCandidates` which
    // walks `candidates` in canonical order; entries appended in that order then
    // sorted by `recordCausality`.
    for (const suppressedId of mutexFiltered.mutex_suppressed_ids) {
        recordCausality(state, {
            turn: currentTurn,
            from_event: suppressedId,
            to_event: null,
            to_flag: null,
            kind: 'mutex_suppressed',
        });
    }

    // Partition the (mutex-filtered, canonically-sorted) eligible set into
    // player-decision events (subject to the cap + overflow queue) and auto /
    // flag-setter events (fire unconditionally — never capped, never overflowed).
    // Order is preserved within each partition because we walk the already-sorted
    // list once; this keeps firing order deterministic. The cap's only legitimate
    // purpose is decision-modal pacing, so it applies ONLY to the decision set.
    const autoCandidates: EventDefinition[] = [];
    const decisionCandidates: EventDefinition[] = [];
    for (const def of mutexFiltered.candidates) {
        if (isPlayerDecisionEvent(def)) {
            decisionCandidates.push(def);
        } else {
            autoCandidates.push(def);
        }
    }

    // Only player-decision events overflow. Auto/flag-setter events never do.
    const overflowedIds = decisionCandidates.slice(MAX_EVENTS_PER_TURN).map((def) => def.id);
    state.military.event_overflow_queue = overflowedIds;
    // Phase B Sub-slice B3: record overflow causality entries (packet §3.4).
    for (const overflowedId of overflowedIds) {
        recordCausality(state, {
            turn: currentTurn,
            from_event: overflowedId,
            to_event: null,
            to_flag: null,
            kind: 'overflowed',
        });
    }

    // Fire all auto/flag-setter events, plus the capped player-decision set.
    // Re-sort the union so firing order stays in canonical (priority/turn/id)
    // order regardless of the partition split.
    const cappedDecisions = decisionCandidates.slice(0, MAX_EVENTS_PER_TURN);
    const toFire = [...autoCandidates, ...cappedDecisions].sort(compareEventCandidates);

    // Phase 3: Fire selected events
    for (const def of toFire) {
        // Collect all effects and apply mechanical ones (primary + additional)
        const effects = collectEffects(def);
        applyEventEffects(state, effects);

        // Apply dimension_shifts and sets_flags from the definition itself
        applyDefinitionDimensionShifts(state, def.dimension_shifts);
        applyDefinitionFlags(state, def.sets_flags);
        // Phase B Sub-slice B3: record flag-open causality entries for
        // event-level `sets_flags` (packet §3.4). Iteration over Object.keys
        // sorted via strictCompare for determinism (CLAUDE.md sacred rules).
        if (def.sets_flags) {
            const flagKeys = Object.keys(def.sets_flags).slice().sort(strictCompare);
            for (const flagKey of flagKeys) {
                recordCausality(state, {
                    turn: currentTurn,
                    from_event: def.id,
                    to_event: null,
                    to_flag: flagKey,
                    kind: 'opens_flag',
                });
            }
        }

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
                // CALIBRATION GUARD: this persisted payload is an explicit field whitelist.
                // `def.image` is intentionally UI-display-only (read in DataLoader.ts -> resolveEventIllustration)
                // and MUST NOT be added here — persisting it would move the save hash / structural
                // fingerprint and require a dual-horizon re-floor (scenario-tester GO, event-illustration
                // wiring, 2026-06-10). Keep image out of persisted sim state.
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
                    ...(def.staff_recommended_response_id
                        ? { staff_recommended_response_id: def.staff_recommended_response_id }
                        : {}),
                    ...(def.notifications_to_other_factions
                        ? { notifications_to_other_factions: def.notifications_to_other_factions }
                        : {}),
                });
            } else {
                // No player faction (headless/spectator) OR Observer (level 3) for non-required events: bot auto-responds.
                // Political personality path for dimension-weighted logic types.
                let chosen: EventResponseOption;
                let decisionSource: 'bot_political' | 'bot_v1' | 'bot_ai_default';
                // Free War Phase 0 de-railroad: in 'emergent' mode, bypass the
                // historical-default railroad and fall through to the live
                // political/v1 scorers. Unset follows the save-migration default
                // ('historical') independently of notification delivery.
                const emergent = state.meta.decision_mode === 'emergent';
                const historical = !emergent;
                if (historical && hasAuthoredAIDefaultResponse(def)) {
                    chosen = applyAIDefaultResponse(state, def);
                    decisionSource = 'bot_ai_default';
                // Free War Phase 0.5: in EMERGENT mode, route EVERY faction-attributed
                // event through the signal-driven political scorer — not just the
                // POLITICAL_LOGICS subset. Most events carry bot_response_logic
                // 'historical' (→ pickBotResponseV1, which hard-returns the historical
                // default with no scoring); without this, emergent freedom is nominal.
                // Historical/unset uses the political scorer only when no authored
                // AI default exists and the event explicitly selects political logic.
                } else if (
                    respondingFaction !== null &&
                    (emergent || POLITICAL_LOGICS.has(def.bot_response_logic ?? ''))
                ) {
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
                // Phase B Sub-slice B3: bot path response-level runtime causality
                // (packet §3.3, §3.5). Mirror of player path in resolve_decision.ts
                // — both paths produce identical deltas for the same choice.
                applyResponseRuntimeCausality(state, def.id, chosen.id, chosen, currentTurn);
                if (respondingFaction !== null) {
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

        // Record enabled events (event-level `enables_events`).
        // Phase B Sub-slice B3: Append causality entries for each enabled target
        // (packet §3.4). Iteration uses authored order; recordCausality sorts
        // the log canonically before write.
        if (def.enables_events && def.enables_events.length > 0) {
            for (const targetId of def.enables_events) {
                recordCausality(state, {
                    turn: currentTurn,
                    from_event: def.id,
                    to_event: targetId,
                    to_flag: null,
                    kind: 'enables',
                });
            }
        }
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
