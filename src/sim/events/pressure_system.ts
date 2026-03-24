import type { GameState } from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
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
    registry: EventDefinition[],
    edges?: EdgeRecord[]
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
            ? evaluateCondition(def.trigger.condition, state, edges)
            : true;

        // Also check turn window if present
        const turn = state.meta?.turn ?? 0;
        const inWindow = (def.trigger.turn_min == null || turn >= def.trigger.turn_min)
            && (def.trigger.turn_max == null || turn <= def.trigger.turn_max);

        if (conditionsMet && inWindow) {
            let rate = base_rate;
            if (modifiers) {
                for (const mod of modifiers) {
                    if (evaluateCondition(mod.condition, state, edges)) {
                        rate += mod.rate_bonus;
                    }
                }
            }
            readiness[def.id] = (readiness[def.id] ?? 0) + rate;
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
