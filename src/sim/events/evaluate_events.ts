/**
 * B1→v0.4.1 Event evaluation: deterministic evaluation of event registry.
 * Uses caller-provided RNG for random events; stable iteration order.
 * v0.4.1: applies mechanical effects via applyEventEffects; tracks fired_event_ids for once-only events.
 */

import type { GameState } from '../../state/game_state.js';
import { EVENT_REGISTRY } from './event_registry.js';
import { applyEventEffects } from './apply_effects.js';
import type { EventDefinition, FiredEvent, Rng } from './event_types.js';
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

/**
 * Evaluate events for the current turn. Deterministic: same state, turn, and rng sequence -> same fired list.
 * Iterates EVENT_REGISTRY in order; for each event, if trigger matches and (if probability) rng() < probability, fire.
 * Once-only events (def.once === true) are skipped if their id is in state.military.fired_event_ids.
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

    for (const def of EVENT_REGISTRY) {
        // Skip once-only events that have already fired
        if (def.once && firedIds.includes(def.id)) continue;

        if (!triggerMatches(def, state, currentTurn)) continue;
        if (def.probability != null) {
            if (rng() >= def.probability) continue;
        }

        // Collect all effects and apply mechanical ones
        const effects = collectEffects(def);
        applyEventEffects(state, effects);

        // Build fired event text from narrative effects (or use id as fallback)
        const narrativeEffects = effects.filter(e => e.kind === 'narrative');
        const text = narrativeEffects.length > 0
            ? narrativeEffects.map(e => e.kind === 'narrative' ? e.text : '').join(' ')
            : def.id;

        fired.push({ id: def.id, text });

        // Track once-only events
        if (def.once) {
            firedIds.push(def.id);
        }
    }

    return { fired };
}
