/** Peace-phase (Phase I) pipeline steps. Extracted from turn_pipeline.ts (R7). */

import { buildAdjacencyMap } from '../../map/adjacency_map.js';
import { computeFrontEdges } from '../../map/front_edges.js';
import { loadSettlementGraph } from '../../map/settlements.js';
import { buildSidToMunFromSettlements, buildOsidToMunFromReverseMap } from '../../scenario/oob_early_war_entry.js';
import { updateCapabilityProfiles } from '../../state/capability_progression.js';
import { applyPhaseIDisplacementFromFlips } from '../../state/displacement.js';
import { GameState, type FactionId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { loadOperationalData, loadOperationalEdges } from '../../data/operational_data.js';
import { evaluateEvents } from '../events/evaluate_events.js';
import {
    isFormationSpawnDirectiveActive,
    reinforceBrigadesFromPools,
    spawnFormationsFromPools
} from '../formation_spawn.js';
import {
    countBilateralFlips,
    ensureRbihHrhbState,
    updateAllianceValue
} from '../early_war/alliance_update.js';
import { runAuthorityDegradation } from '../early_war/authority_degradation.js';
import { checkAndApplyCeasefire } from '../early_war/bilateral_ceasefire.js';
import { buildSettlementsByMun, runControlStrain } from '../early_war/control_strain.js';
import { runDisplacementHooks } from '../early_war/displacement_hooks.js';
import { runJNATransition } from '../early_war/jna_transition.js';
import { updateMilitiaEmergence } from '../early_war/militia_emergence.js';
import { runMinorityErosion } from '../early_war/minority_erosion.js';
import { runMinorityMilitiaDecay } from '../early_war/minority_militia_decay.js';
import { updateMixedMunicipalitiesList } from '../early_war/mixed_municipality.js';
import { runPoolPopulation } from '../early_war/pool_population.js';
import { checkAndApplyWashington } from '../early_war/washington_agreement.js';
import { activateCorpsForTurn } from '../early_war/activate_corps.js';
import { computeSiegeState } from '../early_war/compute_siege_state.js';
import { promoteFormations } from '../early_war/promote_formations.js';
import { runPhaseIBotPosture } from '../early_war/bot_phase_i.js';
import type { NamedPhase, TurnContext } from '../turn_pipeline_types.js';
import { getSiegeStateCache, setSiegeStateCache, loadRecruitmentCatalog } from '../turn_pipeline_types.js';

/**
 * Phase C: Phase I entry gating (Phase_I_Specification_v0_4_0.md; ROADMAP Phase C).
 * Phase I execution occurs only when referendum_held and current_turn >= war_start_turn.
 * Phase 0 must remain the only runner before war_start_turn; use state pipeline for phase_0.
 */
export function isPhaseIAllowed(state: GameState): boolean {
    const meta = state.meta;
    if (!meta.referendum_held) return false;
    const warStart = meta.war_start_turn;
    if (warStart === undefined || warStart === null) return false;
    return meta.turn >= warStart;
}

export function assertNoAoRInPhaseI(state: GameState): void {
    const factions = state.factions ?? [];
    for (const faction of factions) {
        if (faction.areasOfResponsibility && faction.areasOfResponsibility.length > 0) {
            throw new Error(`Phase I forbids AoR assignment; faction ${faction.id} has AoR entries`);
        }
    }
}

/** Phase I turn phases (order per Phase_I_Spec §5; Steps 3–9 add remaining). */
export const peacePhases: NamedPhase[] = [
    {
        name: 'evaluate-events',
        run: (context) => {
            const turn = context.state.meta.turn;
            const result = evaluateEvents(context.state, context.rng, turn);
            context.report.events_fired = result.fired;
        }
    },
    {
        name: 'phase-i-militia-emergence',
        run: (context) => {
            context.report.phase_i_militia_emergence = updateMilitiaEmergence(context.state);
        }
    },
    {
        name: 'compute-siege-state',
        run: async (context) => {
            const _phase = context.state.meta.phase;
            if (_phase !== 'war') return;
            if (context.state.meta.recruitment_mode !== 'bottom_up') return;
            try {
                const baseDir = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '';
                if (!baseDir) return;
                const [opData, edges] = await Promise.all([
                    loadOperationalData(baseDir),
                    loadOperationalEdges(baseDir)
                ]);
                if (!opData?.operationalToCanonical || !edges?.length) return;
                // Build adjacency map from operational edges
                const { buildOsidAdjacency } = await import('../combat/osid_adjacency.js');
                const adjacency = buildOsidAdjacency(edges);
                // Build osidToMun: first build sidToMun from the settlement graph
                const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
                const sidToMun = buildSidToMunFromSettlements(graph.settlements);
                const osidToMun = buildOsidToMunFromReverseMap(opData.operationalToCanonical, sidToMun);
                const siegeRatios = computeSiegeState(context.state, adjacency, osidToMun);
                setSiegeStateCache(context, { siegeRatios });
            } catch {
                // Operational data optional — skip siege computation when unavailable
            }
        }
    },
    {
        name: 'phase-i-pool-population',
        run: async (context) => {
            const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
            context.report.phase_i_pool_population = runPoolPopulation(
                context.state,
                graph.settlements,
                context.input.municipalityPopulation1991,
                getSiegeStateCache(context)?.siegeRatios
            );
        }
    },
    {
        name: 'phase-i-minority-militia-decay',
        run: async (context) => {
            const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
            context.report.phase_i_minority_militia_decay = runMinorityMilitiaDecay(
                context.state,
                graph.settlements,
                context.input.municipalityPopulation1991
            );
        }
    },
    {
        name: 'phase-i-brigade-reinforcement',
        run: (context) => {
            if (!isFormationSpawnDirectiveActive(context.state)) return;
            context.report.phase_i_brigade_reinforcement = reinforceBrigadesFromPools(context.state);
        }
    },
    {
        name: 'phase-i-formation-spawn',
        run: async (context) => {
            if (!isFormationSpawnDirectiveActive(context.state)) return;
            const directive = context.state.formation_spawn_directive!;
            const kind = directive.kind === 'both' || directive.kind === 'militia' ? 'brigade' : (directive.kind ?? 'brigade');
            let canonicalToOperational: import('../../data/operational_data.js').CanonicalToOperationalMap | undefined;
            try {
                const baseDir = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '';
                if (baseDir) {
                    const opData = await loadOperationalData(baseDir);
                    canonicalToOperational = opData.canonicalToOperational;
                }
            } catch {
                // Operational data missing; spawn without location_osid (legacy)
            }
            context.report.phase_i_formation_spawn = spawnFormationsFromPools(context.state, {
                factionFilter: null,
                munFilter: null,
                maxPerMun: null,
                customTags: [],
                applyChanges: true,
                formationKind: kind,
                municipalityHqSettlement: context.input.municipalityHqSettlement ?? undefined,
                historicalNameLookup: context.input.historicalNameLookup ?? undefined,
                population1991ByMun: context.input.municipalityPopulation1991 ?? undefined,
                canonicalToOperational
            }, getSiegeStateCache(context)?.siegeRatios);
        }
    },
    {
        name: 'activate-corps',
        run: async (context) => {
            const _phase2 = context.state.meta.phase;
            if (_phase2 !== 'war') return;
            if (context.state.meta.recruitment_mode !== 'bottom_up') return;
            const currentTurn = context.state.meta.turn ?? 0;
            const catalog = await loadRecruitmentCatalog();
            if (!catalog) return;
            activateCorpsForTurn(
                context.state,
                catalog.corps,
                currentTurn,
                undefined, // sidToMun: skip presence check in pipeline (RS already exists; RBiH/HRHB create regardless)
                catalog.municipality_hq_settlement
            );
        },
    },
    {
        name: 'promote-formations',
        run: async (context) => {
            const _phase3 = context.state.meta.phase;
            if (_phase3 !== 'war') return;
            if (context.state.meta.recruitment_mode !== 'bottom_up') return;
            const currentTurn = context.state.meta.turn ?? 0;
            const catalog = await loadRecruitmentCatalog();
            if (!catalog) return;
            promoteFormations(context.state, currentTurn, catalog.brigades);
        },
    },
    {
        name: 'phase-i-bot-posture',
        run: async (context) => {
            // Phase I bot: assign posture (hold/probe/push) to front edges for bot-controlled factions
            const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
            const edges = context.input.settlementEdges && context.input.settlementEdges.length > 0
                ? context.input.settlementEdges
                : graph.edges;
            const frontEdges = computeFrontEdges(context.state, edges);
            if (frontEdges.length === 0) return;
            const playerFaction = context.state.meta.player_faction ?? null;
            const botFactions = (context.state.factions ?? [])
                .map(f => f.id)
                .filter(fid => playerFaction == null || fid !== playerFaction)
                .sort(strictCompare) as FactionId[];
            runPhaseIBotPosture(context.state, frontEdges, botFactions);
        }
    },
    {
        name: 'phase-i-alliance-update',
        run: (context) => {
            // Phase I §4.8: Initialize rbih_hrhb_state if not present (backward compatible)
            ensureRbihHrhbState(context.state);
            // Update mixed municipalities list
            updateMixedMunicipalitiesList(context.state);
            // Per-turn alliance value update (skip when scenario set enable_rbih_hrhb_dynamics: false)
            if (context.state.meta.enable_rbih_hrhb_dynamics !== false) {
                context.report.phase_i_alliance_update = updateAllianceValue(context.state);
            }
        }
    },
    {
        name: 'phase-i-ceasefire-check',
        run: (context) => {
            // Phase I §4.8: Evaluate bilateral ceasefire preconditions
            context.report.phase_i_ceasefire_check = checkAndApplyCeasefire(context.state);
        }
    },
    {
        name: 'phase-i-washington-check',
        run: (context) => {
            // Phase I §4.8: Evaluate Washington Agreement preconditions (requires ceasefire state)
            context.report.phase_i_washington_check = checkAndApplyWashington(context.state);
        }
    },
    {
        name: 'phase-i-capability-update',
        run: (context) => {
            // System 10: Update capability profiles by year so control flip can use capability-weighted effectiveness
            updateCapabilityProfiles(context.state);
        }
    },
    {
        name: 'phase-i-control-flip',
        run: (context) => {
            // Canonical path: Phase I no longer performs control flips.
            // Political control changes are resolved in Phase II attack resolution only.
            if (context.state.meta.phase !== 'war') return;
            context.report.phase_i_control_flip = {
                flips: [],
                municipalities_evaluated: 0,
                control_events: []
            };
        }
    },
    {
        name: 'phase-i-bilateral-flip-count',
        run: (context) => {
            // Phase I §4.8: Count bilateral RBiH–HRHB flips (feeds next turn's alliance update)
            const flips = context.report.phase_i_control_flip?.flips ?? [];
            context.report.phase_i_bilateral_flip_count = countBilateralFlips(context.state, flips);
        }
    },
    {
        name: 'phase-i-displacement-hooks',
        run: (context) => {
            const controlFlipReport = context.report.phase_i_control_flip ?? {
                flips: [],
                municipalities_evaluated: 0,
                control_events: []
            };
            context.report.phase_i_displacement_hooks = runDisplacementHooks(
                context.state,
                context.state.meta.turn,
                controlFlipReport,
                context.input.municipalityPopulation1991
            );
        }
    },
    {
        name: 'phase-i-displacement-apply',
        run: async (context) => {
            const hooksReport = context.report.phase_i_displacement_hooks;
            const controlFlipReport = context.report.phase_i_control_flip;
            if (!hooksReport?.by_mun?.length || !controlFlipReport?.flips?.length) return;
            const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
            const edges = context.input.settlementEdges ?? graph.edges;
            if (!edges?.length) return;
            const adjacencyMap = buildAdjacencyMap(edges);
            context.report.phase_i_displacement_apply = applyPhaseIDisplacementFromFlips(
                context.state,
                context.state.meta.turn,
                controlFlipReport.flips,
                hooksReport.by_mun,
                graph.settlements,
                adjacencyMap,
                context.input.municipalityPopulation1991
            );
        }
    },
    {
        name: 'phase-i-control-strain',
        run: async (context) => {
            const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
            const byMun = buildSettlementsByMun(graph.settlements);
            context.report.war_control_strain = runControlStrain(context.state, context.state.meta.turn, byMun);
        }
    },
    {
        name: 'phase-i-authority-update',
        run: (context) => {
            context.report.phase_i_authority = runAuthorityDegradation(context.state);
        }
    },
    {
        name: 'phase-i-jna-transition',
        run: (context) => {
            context.report.war_jna_transition = runJNATransition(context.state);
        }
    },
    {
        name: 'phase-i-minority-erosion',
        run: async (context) => {
            // Phase I §4.8: Minority militia erosion in mixed municipalities
            const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
            const byMun = buildSettlementsByMun(graph.settlements);
            context.report.phase_i_minority_erosion_report = runMinorityErosion(context.state, byMun);
        }
    }
];
