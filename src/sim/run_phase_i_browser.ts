/**
 * Browser-safe Phase I turn runner. No Node/fs imports.
 * Used by the warroom when advancing a turn in phase_i. Accepts a pre-loaded settlement graph
 * (built via settlements_parse.buildGraphFromJSON from fetched JSON).
 * Same logic as turn_pipeline Phase I path; does not import turn_pipeline or map/settlements.
 */

import type { GameState } from '../state/game_state.js';
import { cloneGameState } from '../state/clone.js';
import type { LoadedSettlementGraph } from '../map/settlements_parse.js';
import { updateMilitiaEmergence, type MilitiaEmergenceReport } from './phase_i/militia_emergence.js';
import { runPoolPopulation, type PoolPopulationReport } from './phase_i/pool_population.js';
import {
  spawnFormationsFromPools,
  isFormationSpawnDirectiveActive,
  type SpawnFormationsReport
} from './formation_spawn.js';
import { runControlFlip, type ControlFlipReport } from './phase_i/control_flip.js';
import { runAuthorityDegradation, type AuthorityDegradationReport } from './phase_i/authority_degradation.js';
import { runControlStrain, buildSettlementsByMun, type ControlStrainReport } from './phase_i/control_strain.js';
import {
  runDisplacementHooks,
  type DisplacementHooksReport,
  type MunicipalityPopulation1991Map
} from './phase_i/displacement_hooks.js';
import { runJNATransition, type JNATransitionReport } from './phase_i/jna_transition.js';
import {
  updatePhaseIOpposingEdgesStreak,
  applyPhaseIToPhaseIITransition
} from './phase_transitions/phase_i_to_phase_ii.js';

export interface PhaseITurnInput {
  seed: string;
  settlementGraph: LoadedSettlementGraph;
  /** Optional 1991 census by mun for displacement hook trigger (Hostile_Population_Share > 0.30). */
  municipalityPopulation1991?: MunicipalityPopulation1991Map;
}

export interface PhaseITurnReport {
  seed: string;
  phases: { name: string }[];
  phase_i_militia_emergence?: MilitiaEmergenceReport;
  phase_i_pool_population?: PoolPopulationReport;
  phase_i_formation_spawn?: SpawnFormationsReport;
  phase_i_control_flip?: ControlFlipReport;
  phase_i_displacement_hooks?: DisplacementHooksReport;
  phase_i_control_strain?: ControlStrainReport;
  phase_i_authority?: AuthorityDegradationReport;
  phase_i_jna_transition?: JNATransitionReport;
}

function isPhaseIAllowed(state: GameState): boolean {
  const meta = state.meta;
  if (!meta.referendum_held) return false;
  const warStart = meta.war_start_turn;
  if (warStart === undefined || warStart === null) return false;
  return meta.turn >= warStart;
}

function assertNoAoRInPhaseI(state: GameState): void {
  const factions = state.factions ?? [];
  for (const faction of factions) {
    if (faction.areasOfResponsibility && faction.areasOfResponsibility.length > 0) {
      throw new Error(`Phase I forbids AoR assignment; faction ${faction.id} has AoR entries`);
    }
  }
}

/**
 * Run one Phase I turn in the browser. Requires pre-loaded settlement graph (no Node).
 * Returns new state and report; does not mutate the argument.
 */
export async function runPhaseITurn(
  state: GameState,
  input: PhaseITurnInput
): Promise<{ nextState: GameState; report: PhaseITurnReport }> {
  const working = cloneGameState(state);
  if (working.meta.phase !== 'phase_i') {
    throw new Error('runPhaseITurn: state must be in phase_i');
  }
  if (!isPhaseIAllowed(working)) {
    throw new Error('runPhaseITurn: Phase I requires referendum_held and current_turn >= war_start_turn');
  }
  assertNoAoRInPhaseI(working);

  const graph = input.settlementGraph;
  const report: PhaseITurnReport = {
    seed: input.seed,
    phases: [
      { name: 'phase-i-militia-emergence' },
      { name: 'phase-i-pool-population' },
      { name: 'phase-i-formation-spawn' },
      { name: 'phase-i-control-flip' },
      { name: 'phase-i-displacement-hooks' },
      { name: 'phase-i-control-strain' },
      { name: 'phase-i-authority-update' },
      { name: 'phase-i-jna-transition' }
    ]
  };

  working.meta = { ...working.meta, seed: input.seed, turn: working.meta.turn + 1 };

  report.phase_i_militia_emergence = updateMilitiaEmergence(working);

  report.phase_i_pool_population = runPoolPopulation(working, graph.settlements);

  if (isFormationSpawnDirectiveActive(working)) {
    const directive = working.formation_spawn_directive!;
    const kind = directive.kind === 'both' || directive.kind === 'militia' ? 'brigade' : (directive.kind ?? 'brigade');
    report.phase_i_formation_spawn = spawnFormationsFromPools(working, {
      factionFilter: null,
      munFilter: null,
      maxPerMun: null,
      customTags: [],
      applyChanges: true,
      formationKind: kind
    });
  }

  report.phase_i_control_flip = runControlFlip({
    state: working,
    turn: working.meta.turn,
    settlements: graph.settlements,
    edges: graph.edges
  });

  report.phase_i_displacement_hooks = runDisplacementHooks(
    working,
    working.meta.turn,
    report.phase_i_control_flip ?? {
      flips: [],
      municipalities_evaluated: 0,
      control_events: []
    },
    input.municipalityPopulation1991
  );

  const byMun = buildSettlementsByMun(graph.settlements);
  report.phase_i_control_strain = runControlStrain(working, working.meta.turn, byMun);

  report.phase_i_authority = runAuthorityDegradation(working);

  report.phase_i_jna_transition = runJNATransition(working);

  if (graph.edges.length > 0) {
    updatePhaseIOpposingEdgesStreak(working, graph.edges);
  }
  applyPhaseIToPhaseIITransition(working, graph.edges);

  return { nextState: working, report };
}
