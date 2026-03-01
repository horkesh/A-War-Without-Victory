/**
 * Browser-safe Phase II turn advance. No Node/fs imports.
 * Used by the warroom when advancing a turn in phase_ii. Performs turn increment only.
 * AoR phase-out: no AoR init; Phase II uses location_osid / OSID fronts.
 * Supply pressure and exhaustion are not run here; for full Phase II simulation use runTurn in Node.
 */

import type { LoadedSettlementGraph } from '../map/settlements_parse.js';
import { cloneGameState } from '../state/clone.js';
import type { GameState } from '../state/game_state.js';

export interface PhaseIITurnInput {
    seed: string;
    settlementGraph: LoadedSettlementGraph;
}

export interface PhaseIITurnReport {
    seed: string;
    phases: { name: string }[];
}

/**
 * Run one Phase II turn in the browser: increment turn only.
 * Returns new state and report; does not mutate the argument.
 */
export function runPhaseIITurn(
    state: GameState,
    input: PhaseIITurnInput
): { nextState: GameState; report: PhaseIITurnReport } {
    const working = cloneGameState(state);
    if (working.meta.phase !== 'war') {
        throw new Error('runPhaseIITurn: state must be in phase_ii');
    }

    const report: PhaseIITurnReport = {
        seed: input.seed,
        phases: [{ name: 'phase-ii-advance' }]
    };

    working.meta = { ...working.meta, seed: input.seed, turn: working.meta.turn + 1 };

    return { nextState: working, report };
}

