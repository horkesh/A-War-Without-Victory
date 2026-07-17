/**
 * Legacy/minimal pipeline harness.
 *
 * This file is useful for smoke tests and older prototype flows, but it is not
 * the canonical war-phase runtime. Live war behavior belongs in
 * `src/sim/turn_pipeline.ts`.
 */

import { cloneGameState } from '../state/clone.js';
import { GameState } from '../state/game_state.js';
import { defaultSteps } from './steps.js';

export interface TurnContext {
    state: GameState;
    seed: string;
}

export interface TurnStep {
    name: string;
    execute: (context: TurnContext) => void;
}

export interface TurnOptions {
    seed?: string;
    steps?: TurnStep[];
}

export function executeTurn(state: GameState, options: TurnOptions = {}): GameState {
    const seed = options.seed ?? state.meta.seed ?? 'default-seed';
    const workingState = cloneGameState(state);

    workingState.meta = {
        ...workingState.meta,
        seed,
        turn: workingState.meta.turn + 1
    };

    const steps = options.steps ?? defaultSteps;
    const context: TurnContext = { state: workingState, seed };

    for (const step of steps) {
        step.execute(context);
    }

    return context.state;
}
