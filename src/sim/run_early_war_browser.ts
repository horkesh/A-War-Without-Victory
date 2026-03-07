/**
 * Browser-safe Phase I turn runner. No Node/fs imports.
 * Used by the warroom when advancing a turn in phase_i. Accepts a pre-loaded settlement graph
 * (built via settlements_parse.buildGraphFromJSON from fetched JSON).
 * Same logic as turn_pipeline Phase I path; does not import turn_pipeline or map/settlements.
 */

import type { LoadedSettlementGraph } from '../map/settlements_parse.js';
import { cloneGameState } from '../state/clone.js';
import type { GameState } from '../state/game_state.js';
import {
    isFormationSpawnDirectiveActive,
    spawnFormationsFromPools,
    type SpawnFormationsReport
} from './formation_spawn.js';
import type { CanonicalToOperationalMap } from '../data/operational_data_types.js';
import { runAuthorityDegradation, type AuthorityDegradationReport } from './early_war/authority_degradation.js';
import type { ControlFlipReport } from './early_war/control_flip.js';
import { buildSettlementsByMun, runControlStrain, type ControlStrainReport } from './early_war/control_strain.js';
import {
    runDisplacementHooks,
    type DisplacementHooksReport,
    type MunicipalityPopulation1991Map
} from './early_war/displacement_hooks.js';
import { runJNATransition, type JNATransitionReport } from './early_war/jna_transition.js';
import { updateMilitiaEmergence, type MilitiaEmergenceReport } from './early_war/militia_emergence.js';
import { runPoolPopulation, type PoolPopulationReport } from './early_war/pool_population.js';

export interface PhaseITurnInput {
    seed: string;
    settlementGraph: LoadedSettlementGraph;
    /** Optional 1991 census by mun for displacement hook trigger (Hostile_Population_Share > 0.30). */
    municipalityPopulation1991?: MunicipalityPopulation1991Map;
    /** Optional mapping for location_osid assignment on spawned formations. */
    canonicalToOperational?: CanonicalToOperationalMap;
}

export interface PhaseITurnReport {
    seed: string;
    phases: { name: string }[];
    militia_emergence?: MilitiaEmergenceReport;
    pool_population?: PoolPopulationReport;
    formation_spawn?: SpawnFormationsReport;
    control_flip?: ControlFlipReport;
    displacement_hooks?: DisplacementHooksReport;
    war_control_strain?: ControlStrainReport;
    authority_degradation?: AuthorityDegradationReport;
    war_jna_transition?: JNATransitionReport;
}

function isEarlyWarAllowed(state: GameState): boolean {
    const meta = state.meta;
    if (!meta.referendum_held) return false;
    const warStart = meta.war_start_turn;
    if (warStart === undefined || warStart === null) return false;
    return meta.turn >= warStart;
}

function assertNoAoRInEarlyWar(state: GameState): void {
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
    if (working.meta.phase !== 'war') {
        throw new Error('runPhaseITurn: state must be in war phase');
    }
    if (!isEarlyWarAllowed(working)) {
        throw new Error('runPhaseITurn: Phase I requires referendum_held and current_turn >= war_start_turn');
    }
    assertNoAoRInEarlyWar(working);

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

    report.militia_emergence = updateMilitiaEmergence(working);

    report.pool_population = runPoolPopulation(working, graph.settlements);

    if (isFormationSpawnDirectiveActive(working)) {
        const directive = working.formation_spawn_directive!;
        const kind = directive.kind === 'both' || directive.kind === 'militia' ? 'brigade' : (directive.kind ?? 'brigade');
        report.formation_spawn = spawnFormationsFromPools(working, {
            factionFilter: null,
            munFilter: null,
            maxPerMun: null,
            customTags: [],
            applyChanges: true,
            formationKind: kind,
            canonicalToOperational: input.canonicalToOperational
        });
    }

    report.control_flip = {
        flips: [],
        municipalities_evaluated: 0,
        control_events: []
    };

    report.displacement_hooks = runDisplacementHooks(
        working,
        working.meta.turn,
        report.control_flip ?? {
            flips: [],
            municipalities_evaluated: 0,
            control_events: []
        },
        input.municipalityPopulation1991
    );

    const byMun = buildSettlementsByMun(graph.settlements);
    report.war_control_strain = runControlStrain(working, working.meta.turn, byMun);

    report.authority_degradation = runAuthorityDegradation(working);

    report.war_jna_transition = runJNATransition(working);

    return { nextState: working, report };
}

