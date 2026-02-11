/**
 * Phase E2: Canonical entry point for preparing a fresh GameState for running.
 *
 * Ensures political control init is invoked exactly once per GameState creation.
 * Both sim_run and dev_runner use this single path.
 */

import type { GameState } from './game_state.js';
import type { LoadedSettlementGraph } from '../map/settlements.js';
import {
  initializePoliticalControllers,
  type PoliticalControlInitResult,
  type PoliticalControlInitOptions
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
  const pc = state.political_controllers;
  if (!pc) {
    throw new Error(
      'Phase F3 invariant: political_controllers must exist after init. Init did not run correctly.'
    );
  }
  const sids = Array.from(settlementGraph.settlements.keys()).sort((a, b) => a.localeCompare(b));
  const undefinedSids: string[] = [];
  const nullSids: string[] = [];
  for (const sid of sids) {
    if (pc[sid] === undefined) {
      undefinedSids.push(sid);
      continue;
    }
    if (pc[sid] === null) {
      nullSids.push(sid);
    }
  }
  if (undefinedSids.length > 0) {
    throw new Error(
      `Phase F3 invariant: ${undefinedSids.length} settlement(s) have political_controller === undefined after init. ` +
        `Init did not run correctly. First 10: ${undefinedSids.slice(0, 10).join(', ')}`
    );
  }
  if (nullSids.length > 0) {
    throw new Error(
      `Phase F3 invariant: ${nullSids.length} settlement(s) have political_controller === null after init. ` +
        `Start control must be faction-assigned. First 10: ${nullSids.slice(0, 10).join(', ')}`
    );
  }
  return result;
}
