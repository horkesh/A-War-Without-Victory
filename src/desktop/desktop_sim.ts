/**
 * Desktop (Electron main) sim API: load scenario/state, advance turn.
 * Used by electron-main.cjs via a CJS bundle. No browser/DOM deps; Node fs/path OK.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GameState } from '../state/game_state.js';
import { deserializeState, serializeState } from '../state/serialize.js';
import { createStateFromScenario } from '../scenario/scenario_runner.js';
import { loadOobBrigades, loadMunicipalityHqSettlement } from '../scenario/oob_loader.js';
import { buildSidToMunFromSettlements } from '../scenario/oob_phase_i_entry.js';
import { loadSettlementGraph } from '../map/settlements.js';
import { recruitBrigade, applyRecruitment, initializeRecruitmentResources } from '../sim/recruitment_engine.js';
import type { EquipmentClass } from '../state/recruitment_types.js';
import { isValidEquipmentClass } from '../state/recruitment_types.js';
import { runPhase0TurnAndAdvance } from '../ui/warroom/run_phase0_turn.js';
import { runPhaseITurn } from '../sim/run_phase_i_browser.js';
import { runTurn } from '../sim/turn_pipeline.js';
import type { LoadedSettlementGraph } from '../map/settlements_parse.js';

function settlementGraphOptions(baseDir: string): { settlementsPath: string; edgesPath: string } {
  return {
    settlementsPath: join(baseDir, 'data/source/settlements_initial_master.json'),
    edgesPath: join(baseDir, 'data/derived/settlement_edges.json'),
  };
}

export interface DesktopSimAdvanceResult {
  state: GameState;
  error?: string;
  report?: {
    phase: string;
    turn: number;
    details?: unknown;
  };
}

/** Scenario file used for "New Game" (April 1992 definitive start, Phase II, ethnic_1991). */
export const NEW_GAME_SCENARIO_RELATIVE = 'data/scenarios/apr1992_definitive_52w.json';

/** April 1992 game start: initial recruitment capital and equipment for desktop recruitment UI (from apr1992_definitive_52w). */
const NEW_GAME_RECRUITMENT_CAPITAL: Record<string, number> = { HRHB: 120, RBiH: 200, RS: 350 };
const NEW_GAME_EQUIPMENT_POINTS: Record<string, number> = { HRHB: 150, RBiH: 40, RS: 500 };

/** Load a scenario file and return initial GameState. */
export async function loadScenarioFromPath(
  scenarioPath: string,
  baseDir: string
): Promise<{ state: GameState }> {
  const state = await createStateFromScenario(scenarioPath, baseDir);
  return { state };
}

/**
 * Start a new campaign: load April 1992 scenario, set player_faction, inject recruitment_state for desktop UI.
 * Deterministic: faction order and resource keys sorted.
 */
export async function startNewCampaign(
  baseDir: string,
  playerFaction: 'RBiH' | 'RS' | 'HRHB'
): Promise<{ state: GameState }> {
  const scenarioPath = join(baseDir, NEW_GAME_SCENARIO_RELATIVE);
  const state = await createStateFromScenario(scenarioPath, baseDir);

  const factionIds = (state.factions ?? []).map((f) => f.id).sort();
  if (factionIds.length === 0) {
    return { state };
  }

  if (!state.recruitment_state) {
    state.recruitment_state = initializeRecruitmentResources(
      factionIds,
      NEW_GAME_RECRUITMENT_CAPITAL,
      NEW_GAME_EQUIPMENT_POINTS,
      undefined,
      undefined,
      1
    );
  }

  if (state.meta) state.meta.player_faction = playerFaction;
  return { state };
}

/** Load a saved state file (final_save.json or any GameState JSON). */
export async function loadStateFromPath(statePath: string): Promise<{ state: GameState }> {
  const content = await readFile(statePath, 'utf8');
  return { state: deserializeState(content) };
}

/**
 * Advance one turn using browser-safe Phase 0 / I / II runners.
 * Returns new state; does not mutate the argument.
 */
export async function advanceTurn(state: GameState, baseDir: string): Promise<DesktopSimAdvanceResult> {
  const phase = state.meta?.phase ?? 'phase_ii';
  const seed = state.meta?.seed ?? 'desktop-seed';

  const graph = await loadSettlementGraph(settlementGraphOptions(baseDir));

  const graphForBrowser = graph as LoadedSettlementGraph;

  try {
    if (phase === 'phase_0') {
      const next = runPhase0TurnAndAdvance(state, seed);
      return { state: next, report: { phase, turn: next.meta.turn } };
    }
    if (phase === 'phase_i') {
      const { nextState, report } = await runPhaseITurn(state, { seed, settlementGraph: graphForBrowser });
      return { state: nextState, report: { phase, turn: nextState.meta.turn, details: report } };
    }
    if (phase === 'phase_ii') {
      const { nextState, report } = await runTurn(state, {
        seed,
        settlementGraph: graphForBrowser,
        settlementEdges: graph.edges,
      });
      return { state: nextState, report: { phase, turn: nextState.meta.turn, details: report } };
    }
    return { state, error: `Unknown phase: ${phase}` };
  } catch (err) {
    return { state, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Apply a single player recruitment action (desktop only). Mutates state in place.
 * Returns updated state on success so main can serialize and send to renderer.
 */
export async function applyPlayerRecruitment(
  state: GameState,
  baseDir: string,
  brigadeId: string,
  equipmentClass: string
): Promise<{ ok: true; state: GameState } | { ok: false; error: string }> {
  if (!state.recruitment_state) {
    return { ok: false, error: 'No recruitment state' };
  }
  const cls = equipmentClass.trim() as EquipmentClass;
  if (!isValidEquipmentClass(cls)) {
    return { ok: false, error: `Invalid equipment class: ${equipmentClass}` };
  }

  const [brigades, municipalityHqSettlement, graph] = await Promise.all([
    loadOobBrigades(baseDir),
    loadMunicipalityHqSettlement(baseDir),
    loadSettlementGraph(settlementGraphOptions(baseDir)),
  ]);

  const brigade = brigades.find((b) => b.id === brigadeId);
  if (!brigade) {
    return { ok: false, error: `Brigade not found: ${brigadeId}` };
  }

  const sidToMun = buildSidToMunFromSettlements(graph.settlements);

  const result = recruitBrigade(
    state,
    brigade,
    cls,
    state.recruitment_state,
    sidToMun,
    municipalityHqSettlement
  );

  if (!result.success) {
    return { ok: false, error: result.reason ?? 'Recruitment failed' };
  }

  applyRecruitment(state, result, state.recruitment_state);
  return { ok: true, state };
}

/**
 * Load OOB brigade catalog for recruitment UI. Returns serializable list for renderer.
 */
export async function getRecruitmentCatalog(baseDir: string): Promise<{ brigades: Array<{
  id: string;
  faction: string;
  name: string;
  home_mun: string;
  manpower_cost: number;
  capital_cost: number;
  default_equipment_class: string;
  available_from: number;
  mandatory: boolean;
}> }> {
  const brigades = await loadOobBrigades(baseDir);
  return {
    brigades: brigades.map((b) => ({
      id: b.id,
      faction: b.faction,
      name: b.name,
      home_mun: b.home_mun,
      manpower_cost: b.manpower_cost,
      capital_cost: b.capital_cost,
      default_equipment_class: b.default_equipment_class,
      available_from: b.available_from,
      mandatory: b.mandatory,
    })),
  };
}

/** Re-export for main process (serialize/deserialize state for IPC). */
export { serializeState, deserializeState };
