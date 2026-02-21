/**
 * B1 Event evaluation: deterministic evaluation of event registry.
 * Uses caller-provided RNG for random events; stable iteration order.
 */

import type { GameState } from '../../state/game_state.js';
import { EVENT_REGISTRY } from './event_registry.js';
import type { FiredEvent, Rng } from './event_types.js';
import { triggerMatches } from './event_types.js';

export interface EventsEvaluationReport {
    fired: FiredEvent[];
}

/**
 * Evaluate events for the current turn. Deterministic: same state, turn, and rng sequence → same fired list.
 * Iterates EVENT_REGISTRY in order; for each event, if trigger matches and (if probability) rng() < probability, fire.
 */
export function evaluateEvents(
    state: GameState,
    rng: Rng,
    currentTurn: number
): EventsEvaluationReport {
    const fired: FiredEvent[] = [];
    const phase = state.meta.phase;
    if (phase !== 'phase_i' && phase !== 'phase_ii') {
        return { fired };
    }

    for (const def of EVENT_REGISTRY) {
        if (!triggerMatches(def, state, currentTurn)) continue;
        if (def.probability != null) {
            if (rng() >= def.probability) continue;
        }
        if (def.effect.kind === 'narrative') {
            fired.push({ id: def.id, text: def.effect.text });
        }
    }

    return { fired };
}
