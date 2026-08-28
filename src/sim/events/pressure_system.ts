import type { GameState } from '../../state/game_state.js';
import type { EventDefinition } from './event_types.js';
import { evaluateCondition } from './event_types.js';

/**
 * Update readiness counters for all pressure-enabled events.
 * Called once per turn BEFORE event evaluation.
 *
 * Events without a `pressure` config are skipped (old-style events).
 * Deterministic: sorted by event ID, pure state reads.
 */
export function updateEventReadiness(
    state: GameState,
    registry: EventDefinition[]
): void {
    if (!state.military.event_readiness) {
        state.military.event_readiness = {};
    }

    const readiness = state.military.event_readiness;

    for (const def of registry) {
        if (!def.pressure) continue;

        const { base_rate, decay_rate, modifiers } = def.pressure;

        // Check if the event's trigger conditions are met
        const conditionsMet = def.trigger.condition
            ? evaluateCondition(def.trigger.condition, state)
            : true;

        // Also check turn window if present
        const turn = state.meta?.turn ?? 0;
        const inWindow = (def.trigger.turn_min == null || turn >= def.trigger.turn_min)
            && (def.trigger.turn_max == null || turn <= def.trigger.turn_max);

        // Check requires_events prerequisite chain
        const requiresMet = def.trigger.requires_events == null
            || def.trigger.requires_events.length === 0
            || def.trigger.requires_events.every(
                id => (state.military.fired_event_ids ?? []).includes(id)
            );

        if (conditionsMet && inWindow && requiresMet) {
            let rate = base_rate;
            if (modifiers) {
                for (const mod of modifiers) {
                    if (evaluateCondition(mod.condition, state)) {
                        rate += mod.rate_bonus;
                    }
                }
            }
            // FLOORED AT ZERO. The accumulate branch previously had no floor while
            // the decay branch did, so a modifier set summing negative drove
            // readiness arbitrarily far below 0 — and every turn spent climbing back
            // out is a turn the event silently cannot fire, long after the condition
            // that suppressed it has gone. No event in data/scenarios/events can
            // reach a negative rate today (verified 2026-08-28: for every pressure
            // row, base_rate + the sum of all negative rate_bonuses is >= 0), so
            // this is behaviour-neutral now. It is here because the §6 panel's
            // compliant shape for enclave reachability is precisely "add one large
            // negative modifier", which is the input that would have found this.
            readiness[def.id] = Math.max(0, (readiness[def.id] ?? 0) + rate);
        } else {
            if (readiness[def.id] != null && readiness[def.id] > 0) {
                readiness[def.id] = Math.max(0, readiness[def.id] - decay_rate);
            }
        }
    }
}

/**
 * Check if an event's readiness has reached its threshold.
 */
export function isEventReady(state: GameState, def: EventDefinition): boolean {
    if (!def.pressure) return false;
    const readiness = state.military.event_readiness?.[def.id] ?? 0;
    return readiness >= def.pressure.threshold;
}
