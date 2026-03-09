/**
 * Phase E2: Canonical entry point for preparing a fresh GameState for running.
 *
 * Ensures political control init is invoked exactly once per GameState creation.
 * Both sim_run and dev_runner use this single path.
 */

import type { LoadedSettlementGraph } from '../map/settlements.js';
import type { GameState } from './game_state.js';
import {
    initializePoliticalControllers,
    type PoliticalControlInitOptions,
    type PoliticalControlInitResult
} from './political_control_init.js';


/**
 * Prepare a fresh GameState for running.
 * Calls initializePoliticalControllers exactly once (idempotent: no-op if already initialized).
 * Phase F3: Asserts all settlements have political_controller field (not undefined) after init.
 *
 * Order: GameState creation -> prepareNewGameState -> runTurn / dev exposure
 */
export async function prepareNewGameState(
    state: GameState,
    settlementGraph: LoadedSettlementGraph,
    mappingPath?: string,
    initOptions?: PoliticalControlInitOptions
): Promise<PoliticalControlInitResult> {
    const result = await initializePoliticalControllers(state, settlementGraph, mappingPath, initOptions);
    const pc = state.political.political_controllers;
    if (!pc) {
        throw new Error(
            'Phase F3 invariant: political_controllers must exist after init. Init did not run correctly.'
        );
    }
    const reverseMap = initOptions?.operationalToCanonical;
    const keysToCheck = reverseMap
        ? Array.from(reverseMap.keys()).sort((a, b) => a.localeCompare(b))
        : Array.from(settlementGraph.settlements.keys()).sort((a, b) => a.localeCompare(b));
    const undefinedKeys: string[] = [];
    const nullKeys: string[] = [];
    for (const key of keysToCheck) {
        if (pc[key] === undefined) {
            undefinedKeys.push(key);
            continue;
        }
        if (pc[key] === null) {
            nullKeys.push(key);
        }
    }
    if (undefinedKeys.length > 0) {
        throw new Error(
            `Phase F3 invariant: ${undefinedKeys.length} settlement(s) have political_controller === undefined after init. ` +
            `Init did not run correctly. First 10: ${undefinedKeys.slice(0, 10).join(', ')}`
        );
    }
    if (nullKeys.length > 0) {
        throw new Error(
            `Phase F3 invariant: ${nullKeys.length} settlement(s) have political_controller === null after init. ` +
            `Start control must be faction-assigned. First 10: ${nullKeys.slice(0, 10).join(', ')}`
        );
    }
    return result;
}
