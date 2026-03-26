/**
 * Phase A1.2: Canonical weekly turn pipeline (roadmap-aligned).
 *
 * runOneTurn(state, inputs) → newState
 *
 * Phase order (ROADMAP_v1_0.md, Systems Manual §1):
 * 1. directives
 * 2. deployments
 * 3. military_interaction
 * 4. fragmentation_resolution
 * 5. supply_resolution
 * 6. political_effects
 * 7. exhaustion_update
 * 8. persistence
 *
 * Determinism rule (Engine Invariants §11.3):
 * - No iteration over Record/Map/Set without explicit sorting.
 * - Use strict comparator: (a < b ? -1 : a > b ? 1 : 0); no localeCompare.
 */

import { cloneGameState } from './clone.js';
import type { GameState } from './game_state.js';
import { ALL_GATES_OPEN } from './phase_gates.js';
import {
    PHASE_ORDER,
    phaseDeployments,
    phaseDirectives,
    phaseExhaustionUpdate,
    phaseFragmentationResolution,
    phaseMilitaryInteraction,
    phasePersistence,
    phasePoliticalEffects,
    phaseSupplyResolution,
    type TurnPipelineInput
} from './turn_phases.js';


const PHASE_HANDLERS = [
    phaseDirectives,
    phaseDeployments,
    phaseMilitaryInteraction,
    phaseFragmentationResolution,
    phaseSupplyResolution,
    phasePoliticalEffects,
    phaseExhaustionUpdate,
    phasePersistence
];

export interface RunOneTurnResult {
    state: GameState;
    phasesExecuted: string[];
}

/**
 * Run one full turn through the canonical pipeline.
 * meta.turn increments by exactly +1 at the end.
 * meta.turn must remain an integer >= 0.
 */
export function runOneTurn(
    state: GameState,
    inputs: TurnPipelineInput,
    gate: typeof ALL_GATES_OPEN = ALL_GATES_OPEN
): RunOneTurnResult {
    let working = cloneGameState(state);

    if (working.meta.phase === 'war') {
        throw new Error(
            `runOneTurn: phase "${working.meta.phase}" not yet implemented in canonical pipeline; use sim/turn_pipeline runTurn for war phases`
        );
    }

    for (let i = 0; i < PHASE_ORDER.length; i++) {
        working = PHASE_HANDLERS[i](working, inputs, gate);
    }

    const nextTurn = working.meta.turn + 1;
    if (!Number.isInteger(nextTurn) || nextTurn < 0) {
        throw new Error(`Invariant: meta.turn must be non-negative integer; got ${nextTurn}`);
    }

    working = {
        ...working,
        meta: {
            ...working.meta,
            turn: nextTurn,
            seed: inputs.seed
        }
    };

    return {
        state: working,
        phasesExecuted: [...PHASE_ORDER]
    };
}

