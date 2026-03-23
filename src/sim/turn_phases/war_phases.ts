/** War-phase pipeline steps. Extracted from turn_pipeline.ts (R7). */

// --- Domain imports (paths adjusted: one directory deeper than turn_pipeline.ts) ---

import { evaluateArmyHQGathering } from '../combat/army_hq_gathering.js';
import { snapshotPoliticalControllers, assertControlEventConsistency } from '../combat/assert_control_events.js';
import { assertFormationsInFriendlyTerritory } from '../combat/assert_formation_territory.js';
import { assertOperationLifecycle } from '../combat/assert_operation_lifecycle.js';
import { attributeOperationCasualties } from '../combat/operation_casualty_attribution.js';
import { recordOperationWeeklyEntries } from '../combat/operation_aar.js';
import { buildAdjacencyMap } from '../../map/adjacency_map.js';
import { computeFrontEdges, computeFrontEdgesOsid } from '../../map/front_edges.js';
import { computeFrontRegions } from '../../map/front_regions.js';
import { loadSettlementGraph } from '../../map/settlements.js';
import { loadTerrainScalars } from '../../map/terrain_scalars.js';
import { backfillFormationLocationOsid, computeOsidPopulation, loadOperationalCentroids, loadOperationalData, loadOperationalEdges } from '../../data/operational_data.js';
import { loadSettlementEthnicityData } from '../../data/settlement_ethnicity.js';
import { buildSidToMunFromSettlements, buildOsidToMunFromReverseMap } from '../../scenario/oob_early_war_entry.js';
import { updateCapabilityProfiles } from '../../state/capability_progression.js';
import { updateDisplacement } from '../../state/displacement.js';
import { processDisplacementTakeover } from '../../state/displacement_takeover.js';
import { getDoctrineTempoMultiplier, updateDoctrineState } from '../../state/doctrine.js';
import { updateEmbargoProfiles } from '../../state/embargo.js';
import { updateEnclaveIntegrity } from '../../state/enclave_integrity.js';
import { accumulateExhaustion } from '../../state/exhaustion.js';
import { applyFatigueRecovery, updateFormationFatigue } from '../../state/formation_fatigue.js';
import { deriveMunicipalityAuthorityMap, updateFormationLifecycle } from '../../state/formation_lifecycle.js';
import { normalizeFrontPosture } from '../../state/front_posture.js';
import { applyFormationCommitment } from '../../state/front_posture_commitment.js';
import { expandRegionPostureToEdges } from '../../state/front_posture_regions.js';
import { accumulateFrontPressure } from '../../state/front_pressure.js';
import { syncFrontSegments } from '../../state/front_segments.js';
import { deriveAssignableFrontSegments } from '../../state/assignable_front_segments.js';
import { assignFrontSegmentTheatres, ensureDefaultTheatres } from '../../state/theatres.js';
import { GameState, type FactionId, type LegacyBrigadeAoRState, type EffectivePostureExposureState } from '../../state/game_state.js';
import { updateHeavyEquipmentState } from '../../state/heavy_equipment.js';
import { updateLegitimacyState } from '../../state/legitimacy.js';
import { ensureMaintenanceCapacity } from '../../state/maintenance.js';
import { updateMilitiaFatigue } from '../../state/militia_fatigue.js';
import { updateNegotiationCapital } from '../../state/negotiation_capital.js';
import {
    applyEnforcementPackage,
    checkOfferAcceptance,
    expireCeasefireEntries,
    generateNegotiationOffers
} from '../../state/negotiation_offers.js';
import { updateNegotiationPressure } from '../../state/negotiation_pressure.js';
import {
    applyIvpConsequences,
    ensureInternationalVisibilityPressure,
    updateInternationalVisibilityPressure,
    updatePatronState
} from '../../state/patron_pressure.js';
import { migratePoliticalControllersToOsidIfNeeded } from '../../state/political_control_init.js';
import { updateSarajevoState } from '../../state/sarajevo_exception.js';
import { updateSustainability } from '../../state/sustainability.js';
import { updateLossOfControlTrends } from '../../state/loss_of_control_trends.js';
import { calculateFactionProductionBonus, ensureProductionFacilities } from '../../state/production_facilities.js';
import { computeSupplyReachability } from '../../state/supply_reachability.js';
import { computeSupplyReachabilityOsid } from '../../state/supply_reachability_osid.js';
import {
    deriveCorridors,
    deriveCorridorsOsid,
    deriveLocalProductionCapacity,
    deriveSupplyState,
    deriveSupplyStateByOsid
} from '../../state/supply_state_derivation.js';
import { strictCompare } from '../../state/validateGameState.js';

import { applyPhase3DCollapseResolution } from '../collapse/phase3d_collapse_resolution.js';
import { evaluateEvents } from '../events/evaluate_events.js';
import { updateEventReadiness } from '../events/pressure_system.js';
import { collectStrategicReserves, reinforceFromStrategicReserves } from '../combat/strategic_reserve.js';
import { reinforceBrigadesFromPools, applyWiaTrickleback } from '../formation_spawn.js';
import { runFormationHqRelocation } from '../formation_hq_relocation.js';
import { ensureRbihHrhbState, updateAllianceValue } from '../early_war/alliance_update.js';
import { checkAndApplyCeasefire } from '../early_war/bilateral_ceasefire.js';
import { buildSettlementsByMun } from '../early_war/control_strain.js';
import { applyCasualtyPoolExhaustion } from '../early_war/pool_population.js';
import { checkAndApplyWashington } from '../early_war/washington_agreement.js';
import { updateMixedMunicipalitiesList } from '../early_war/mixed_municipality.js';
import { checkAndApplyOperationStorm } from '../combat/operation_storm.js';
import { tickHvIntegration } from '../combat/hv_integration.js';
import {
    applyCorpsAttackAxisOrders,
    applyCorpsFrontAutoDistribution,
    ensureDerivedCorpsFrontEdges
} from '../combat/corps_front_assign.js';
import { runCohesionDrift } from '../combat/cohesion_drift.js';
import { runMoraleDrift } from '../combat/morale_drift.js';
import { runOngoingMobilization } from '../combat/ongoing_mobilization.js';
import { getEnablePhase3ADiffusion, runPhase3APressureDiffusion } from '../pressure/phase3a_pressure_diffusion.js';
import {
    buildPressureEligibilityPhase3A,
    buildStateAccessors,
    getEnablePhase3A,
    loadEnrichedContactGraph
} from '../pressure/phase3a_pressure_eligibility.js';
import { applyPhase3BPressureExhaustion } from '../pressure/phase3b_pressure_exhaustion.js';
import { applyPhase3CExhaustionCollapseGating } from '../pressure/phase3c_exhaustion_collapse_gating.js';
import { deriveFrontsFromPressureEligible } from '../emergence/front_emergence.js';
import { diffusePressure } from '../emergence/pressure_diffusion.js';
import { applySettlementDisplacementDeltas } from '../displacement_pipeline/displacement_accumulation.js';
import { buildDisplacementCapacityReport } from '../displacement_pipeline/displacement_capacity_hooks.js';
import { aggregateSettlementDisplacementToMunicipalities } from '../displacement_pipeline/displacement_municipality_aggregation.js';
import { evaluateDisplacementTriggers } from '../displacement_pipeline/displacement_triggers.js';
import { applyBrigadeRepositionOrders } from '../combat/apply_brigade_reposition.js';
import { generateAllBotOrdersOsid, computeOsidEthnicComposition, type OsidBotContext } from '../combat/bot_brigade_ai_osid.js';
import { generateAllCorpsOrders, extractCorpsAiReport, type CorpsAiReportEntry } from '../combat/bot_corps_ai.js';
import { checkAndFireGrazAccords, recordTruceBroken } from '../local_truces.js';
import { processBrigadeMovement } from '../combat/brigade_movement.js';
import { applyPostureCosts, applyPostureOrders } from '../combat/brigade_posture.js';
import { applySectorStanceOrders } from '../combat/sector_stance_orders.js';
import { getCommandFrictionMultipliers } from '../combat/command_friction.js';
import { advanceOperations, applyCorpsEffects, initializeCorpsCommand } from '../combat/corps_command.js';
import { degradeEquipment, ensureBrigadeComposition } from '../combat/equipment_effects.js';
import { getRSMaintenanceCapacityMult, runEquipmentProgression } from '../combat/faction_progression.js';
import { updateEnclaveResilience } from '../combat/enclave_resilience.js';
import { updateExhaustion } from '../combat/exhaustion.js';
import { detectFronts } from '../combat/front_emergence.js';
import { buildLocalFronts } from '../combat/local_front_defense.js';
import { buildCorpsFrontSectors, assignBrigadesToSubSegments, REASSIGNMENT_ENTRENCHMENT_RETAIN } from '../combat/corps_front_sectors.js';
import { distributeBrigadesToFront } from '../combat/brigade_front_distribution.js';
import { evaluateHomeReturn } from '../combat/brigade_home_return.js';
import { applyFrontlineAttrition } from '../combat/frontline_attrition.js';
import { advanceSectorOffensives, updateSectorOffensiveResults } from '../combat/sector_offensive.js';
import { processJnaWithdrawals } from '../combat/jna_phantom_brigades.js';
import { injectQueuedOperation } from '../combat/pre_planned_operations.js';
import { checkTriggeredOperations } from '../combat/triggered_operations.js';
import { computeMilitiaGarrisons } from '../combat/militia_garrison.js';
import { activateOGs, updateOGLifecycle } from '../combat/operational_groups.js';
import { deriveSectorIntel } from '../combat/sector_intel.js';
import { ensureBrigadeFrontAssignments } from '../combat/front_assignment.js';
import { resolveAttackOrders } from '../combat/resolve_attack_orders.js';
import { resolveAttackOrdersOsid, displaceFormationsInEnemyTerritory } from '../combat/attack_resolution_osid.js';
import { applyBrigadeMovementOrders } from '../combat/brigade_movement_orders.js';
import { processOsidColumnMovement, type OsidColumnMovementReport } from '../combat/osid_column_movement.js';
import { updateSupplyPressure } from '../combat/supply_pressure.js';
import {
    applyHumanitarianConvoyDecisions,
    applySmugglingAllocation,
    applyUnAirdrops,
    evaluateHumanitarianConvoys,
    maybeActivateSarajevoTunnel,
    updateSiegeTurnCounters,
    updateSupplyReserves
} from '../../state/supply_reserves.js';
import { buildOsidAdjacency } from '../combat/osid_adjacency.js';
import { generateArmyReserveRequests, evaluateArmyReserveAssignments, tickEliteLoans } from '../combat/army_reserve_system.js';
import { buildHomeDistanceCache } from '../combat/home_distance.js';
import { computeSectorCombatRatings } from '../combat/sector_combat_rating.js';
import { detectParamilitaryTargets, advanceParamilitaries } from '../combat/paramilitary_sweep.js';
import { consolidateRearPockets } from '../combat/rear_pocket_consolidation.js';
import { PARAMILITARY_FADE_WEEK } from '../../state/formation_constants.js';
import { accrueRecruitmentResources, runOngoingRecruitment } from '../recruitment_turn.js';
import { computeHomeDefenseActive } from '../compute_home_defense.js';
import { createBotOrderDiagnosticsSnapshot } from '../../scenario/combat_causality.js';
import { checkWarTermination, applyWarTermination } from '../war_termination.js';
import { computeNegotiationBreakdown } from '../negotiation/compute_capital.js';
import { evaluatePeacePlans } from '../negotiation/peace_plans.js';
import { updatePatronPressure } from '../negotiation/patron_pressure.js';
import { evaluatePatronEvents } from '../negotiation/patron_events.js';

// --- Pipeline infrastructure imports ---
import type { NamedPhase, TurnContext, TurnReport } from '../turn_pipeline_types.js';
import { getPoliticalControlSnapshot, setPoliticalControlSnapshot } from '../turn_pipeline_types.js';
import {
    getOperationalData,
    setOperationalData,
    getGraphAndEdges,
    getSiegeStateCache,
    setSiegeStateCache,
    loadRecruitmentCatalog
} from '../turn_pipeline_types.js';
import type { EffectivePostureState } from '../../state/front_posture_commitment.js';
import type { EffectivePressureEdge } from '../pressure/phase3a_pressure_eligibility.js';

interface WarPhaseContextExtensions {
    effectivePosture?: Record<FactionId, EffectivePostureState>;
    phase3aEffectiveEdges?: EffectivePressureEdge[];
}

// ---------------------------------------------------------------------------
// War-phase step array
// ---------------------------------------------------------------------------

export const warPhases: NamedPhase[] = [
    {
        name: 'initialize',
        run: () => {
            // placeholder: ensure deterministic setup stays inside pipeline
        }
    },
    {
        name: 'capture-aar-snapshot',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const { setAARSnapshot } = await import('../turn_pipeline_types.js');
            const { captureAARSnapshot } = await import('../compile_turn_summary.js');
            setAARSnapshot(context, captureAARSnapshot(context.state));
        }
    },
    {
        name: 'snapshot-political-controllers',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            setPoliticalControlSnapshot(context, snapshotPoliticalControllers(context.state));
        }
    },
    {
        name: 'migrate-political-control-osid',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            try {
                const baseDir = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '';
                const opData = await loadOperationalData(baseDir || undefined);
                if (opData?.operationalToCanonical)
                    migratePoliticalControllersToOsidIfNeeded(context.state, opData.operationalToCanonical);
            } catch {
                // Operational data optional; skip migration when unavailable
            }
        }
    },
    {
        name: 'update-event-readiness',
        run: (context) => {
            if (context.input.eventDefinitions) {
                updateEventReadiness(context.state, context.input.eventDefinitions);
            }
        }
    },
    {
        name: 'evaluate-events',
        run: (context) => {
            const turn = context.state.meta.turn;
            const result = evaluateEvents(context.state, context.rng, turn, context.input.eventDefinitions);
            context.report.events_fired = result.fired;
            // Graz Accords: fires at week 4 (6 May 1992), sets state.political.vienna_declaration_turn
            const grazText = checkAndFireGrazAccords(context.state);
            if (grazText) {
                context.report.events_fired!.push({ id: 'graz_accords', text: grazText });
            }
        }
    },
    {
        name: 'sync-front-segments',
        run: (context) => {
            const edges = context.input.settlementEdges;
            if (!edges) return;
            const derivedFrontEdges = computeFrontEdges(context.state, edges);
            syncFrontSegments(context.state, derivedFrontEdges);
            ensureDefaultTheatres(context.state);
            // In war phase, prefer OSID front edges (from previous turn's refreshFrontEdgeSnapshot)
            // for segment derivation. Canonical SID edges produce front_ids that can't be matched
            // against OSID-keyed political_controllers and brigade location_osid.
            const frontEdgesForSegments =
                context.state.meta.phase === 'war' && context.state.military.war_front_edges_osid?.length
                    ? context.state.military.war_front_edges_osid
                    : derivedFrontEdges;
            const segments = deriveAssignableFrontSegments(frontEdgesForSegments);
            context.state.military.assignable_front_segments = assignFrontSegmentTheatres(context.state, segments);
        }
    },
    {
        name: 'ensure-brigade-front-assignment',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            ensureBrigadeFrontAssignments(context.state);
        }
    },
    {
        name: 'compute-local-fronts',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            context.state.military.local_fronts = buildLocalFronts(context.state);
        }
    },
    {
        name: 'normalize-front-posture',
        run: (context) => {
            normalizeFrontPosture(context.state);
        }
    },
    {
        name: 'expand-region-posture',
        run: (context) => {
            const edges = context.input.settlementEdges;
            if (!edges) return;
            const derivedFrontEdges = computeFrontEdges(context.state, edges);
            const frontRegions = computeFrontRegions(context.state, derivedFrontEdges);
            context.report.region_posture_expansion = expandRegionPostureToEdges(context.state, frontRegions);
        }
    },
    {
        name: 'update-formation-fatigue',
        run: (context) => {
            // Apply per-turn recovery first (combat fatigue accumulated during attack resolution).
            // Pass engaged formation IDs so recovery is blocked for brigades that fought this turn.
            const engagedIds = new Set<string>(context.report.attack_resolution_osid?.engaged_formation_ids ?? []);
            applyFatigueRecovery(context.state, engagedIds);
            const edges = context.input.settlementEdges;
            if (!edges) return;
            const derivedFrontEdges = computeFrontEdges(context.state, edges);
            const frontRegions = computeFrontRegions(context.state, derivedFrontEdges);
            context.report.formation_fatigue = updateFormationFatigue(context.state, derivedFrontEdges, frontRegions, edges);
        }
    },
    {
        name: 'supply-resolution',
        run: async (context) => {
            const edges = context.input.settlementEdges;
            if (!edges) return;
            const adjacencyMap = buildAdjacencyMap(edges);
            const supplyReport = computeSupplyReachability(context.state, adjacencyMap);
            const corridorReport = deriveCorridors(context.state, adjacencyMap, supplyReport);
            const supplyStateReport = deriveSupplyState(context.state, adjacencyMap, supplyReport, corridorReport);
            const graph = await loadSettlementGraph();
            const localProductionReport = deriveLocalProductionCapacity(context.state, supplyReport, graph.settlements);
            ensureProductionFacilities(context.state);
            const productionBonusByFaction = calculateFactionProductionBonus(context.state, graph.settlements);
            context.report.supply_resolution = {
                supply_state: supplyStateReport,
                corridors: corridorReport,
                local_production: localProductionReport,
                production_bonus_by_faction: productionBonusByFaction
            };
        }
    },
    // --- Formation lifecycle (before brigade AI so readiness gates are current) ---
    {
        name: 'update-formation-lifecycle',
        run: async (context) => {
            // Peace phase.0: Formation lifecycle state management
            // Runs early so brigades transition forming→active before bot AI evaluates posture.
            const fatigueReport = context.report.formation_fatigue;
            if (!fatigueReport) return;

            // Build supplied map from fatigue report
            const suppliedByFormation = new Map<string, boolean>();
            for (const record of fatigueReport.by_formation) {
                suppliedByFormation.set(record.formation_id, record.supplied_this_turn);
            }

            // Derive municipality authority from political control (consolidated/contested/fragmented)
            const municipalityAuthorityByMun = deriveMunicipalityAuthorityMap(context.state);

            context.report.formation_lifecycle = updateFormationLifecycle(
                context.state,
                suppliedByFormation,
                municipalityAuthorityByMun
            );
        }
    },
    // --- Brigade dissolution (dissolve combat-ineffective units) ---
    {
        name: 'check-brigade-dissolution',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const { dissolveCombatIneffectiveBrigades } = await import('../combat/brigade_dissolution.js');
            const dissolutionReport = dissolveCombatIneffectiveBrigades(context.state);
            if (dissolutionReport.dissolved_count > 0) {
                context.report.brigade_dissolution = dissolutionReport;
            }
        }
    },
    // --- Brigade reconstitution (reform destroyed brigades from municipality manpower) ---
    {
        name: 'reconstitute-brigades',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const { reconstituteBrigades } = await import('../combat/brigade_reconstitution.js');
            const reconReport = reconstituteBrigades(context.state);
            if (reconReport.reconstituted_count > 0) {
                context.report.brigade_reconstitution = reconReport;
            }
        }
    },
    // --- Brigade Operations Pipeline (War phase only) ---
    {
        name: 'formation-hq-relocation',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
            const report = runFormationHqRelocation(context.state, graph.settlements, graph.edges);
            if (report.relocated > 0) {
                context.report.formation_hq_relocation = report;
            }
        }
    },
    {
        name: 'location-osid-backfill',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            try {
                const baseDir = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '';
                const opData = await loadOperationalData(baseDir || undefined);
                if (opData?.canonicalToOperational)
                    backfillFormationLocationOsid(context.state, opData.canonicalToOperational);
            } catch {
                // Operational data optional; skip backfill when unavailable
            }
        }
    },
    {
        name: 'init-brigade-history',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const { ensureBrigadeHistory } = await import('../combat/brigade_history_recorder.js');
            for (const f of Object.values(context.state.military.formations ?? {})) {
                if (f.kind === 'brigade' || !f.kind) {
                    ensureBrigadeHistory(f);
                }
            }
        }
    },
    {
        name: 'activate-corps',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            // Ensure all OOB corps exist as formations (some activate after peace phase ends).
            // Key case: hvo_central_bosnia (available_from:10) — peace-phase activate-corps
            // never runs when scenario starts directly in war phase.
            // Idempotent: skips corps that already exist.
            const catalog = await loadRecruitmentCatalog();
            if (!catalog?.corps?.length) return;
            const { activateCorpsForTurn } = await import('../early_war/activate_corps.js');
            activateCorpsForTurn(
                context.state,
                catalog.corps,
                context.state.meta.turn,
                undefined,
                catalog.municipality_hq_settlement
            );
        }
    },
    {
        name: 'load-operational-data',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const baseDir = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '';
            try {
                const [opData, edges, centroids] = await Promise.all([
                    loadOperationalData(baseDir || undefined),
                    loadOperationalEdges(baseDir || undefined),
                    loadOperationalCentroids(baseDir || undefined)
                ]);
                setOperationalData(context, { opData, edges, centroids });
            } catch (err) {
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn('load-operational-data: operational data not available, skipping OSID steps:', err instanceof Error ? err.message : String(err));
                }
            }
        }
    },
    {
        name: 'supply-osid',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.opData?.operationalToCanonical || !od?.opData?.canonicalToOperational || !od?.edges?.length) return;
            const osidReach = computeSupplyReachabilityOsid(
                context.state,
                od.edges,
                od.opData.canonicalToOperational,
                od.opData.operationalToCanonical
            );
            const corridorOsid = deriveCorridorsOsid(context.state, od.edges, osidReach);
            const supplyStateByOsid = deriveSupplyStateByOsid(context.state, od.edges, osidReach, corridorOsid);
            if (context.report.supply_resolution) {
                context.report.supply_resolution.supply_state_by_osid = supplyStateByOsid;
            }
            // Persist per-OSID supply state for timeline transition tracking
            const flatSupply: Record<string, string> = {};
            if (supplyStateByOsid?.factions) {
                for (const fac of supplyStateByOsid.factions) {
                    for (const o of fac.by_osid) {
                        flatSupply[o.osid] = o.state;
                    }
                }
            }
            context.state.political.last_supply_state_by_osid = flatSupply;
        }
    },
    {
        name: 'update-siege-counters',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.meta.supply_reserves_enabled) return;
            const supplyByOsid = context.report.supply_resolution?.supply_state_by_osid;
            const od = getOperationalData(context);
            const adjacency = od ? buildOsidAdjacency(od.edges) : undefined;
            context.report.siege_turn_counters = updateSiegeTurnCounters(context.state, supplyByOsid, adjacency);
        }
    },
    {
        name: 'compute-supply-reserves',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.meta.supply_reserves_enabled) return;
            const productionBonus = context.report.supply_resolution?.production_bonus_by_faction ?? {};
            context.report.supply_reserves = updateSupplyReserves(context.state, productionBonus);
        }
    },
    {
        name: 'update-smuggling-routes',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.meta.supply_reserves_enabled) return;
            const { updateSmugglingRoutes, getSmugglingIncome } = await import('../economy/smuggling_routes.js');
            const turn = context.state.meta.turn;
            updateSmugglingRoutes(context.state, turn);
            // Apply smuggling income to supply reserves
            const income = getSmugglingIncome(context.state);
            if (context.state.military.general_supply_reserve && context.state.military.heavy_munitions_reserve) {
                for (const fid of Object.keys(income.general).sort()) {
                    const fkey = fid as import('../../state/game_state.js').FactionId;
                    context.state.military.general_supply_reserve![fkey] = Math.min(100,
                        (context.state.military.general_supply_reserve![fkey] ?? 0) + (income.general[fid] ?? 0));
                    context.state.military.heavy_munitions_reserve![fkey] = Math.min(100,
                        (context.state.military.heavy_munitions_reserve![fkey] ?? 0) + (income.heavy[fid] ?? 0));
                }
            }
        }
    },
    {
        name: 'enclave-resilience',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const supplyByOsid = context.report.supply_resolution?.supply_state_by_osid;
            context.report.enclave_resilience = updateEnclaveResilience(context.state, supplyByOsid);
            applyUnAirdrops(context.state);
        }
    },
    {
        name: 'compute-home-defense-active',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            computeHomeDefenseActive(context.state);
        }
    },
    {
        name: 'osid-column-movement',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.opData?.operationalToCanonical || !od?.edges?.length) return;
            let terrainData;
            try {
                terrainData = await loadTerrainScalars();
            } catch {
                terrainData = { by_sid: {} };
            }
            const report = processOsidColumnMovement(
                context.state,
                od.edges,
                od.opData.operationalToCanonical,
                terrainData
            );
            (context.report as TurnReport & { column_movement?: OsidColumnMovementReport }).column_movement = report;
        }
    },
    {
        name: 'apply-brigade-movement',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.opData?.operationalToCanonical || !od?.edges?.length) return;
            const report = applyBrigadeMovementOrders(context.state, od.edges, od.opData.operationalToCanonical);
            (context.report as TurnReport & { movement_report?: typeof report }).movement_report = report;
        }
    },
    {
        name: 'derive-osid-front-segments',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.opData?.operationalToCanonical || !od?.edges?.length) {
                context.state.military.war_front_edges_osid = undefined;
                return;
            }
            const osidFrontEdges = computeFrontEdgesOsid(context.state, od.edges, od.opData.operationalToCanonical);
            context.state.military.war_front_edges_osid = osidFrontEdges;
        }
    },
    {
        name: 'partition-corps-front-sectors',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.opData?.operationalToCanonical || !od?.edges?.length) return;
            context.state.military.corps_front_sectors = buildCorpsFrontSectors(
                context.state, od.edges, od.opData.operationalToCanonical, od.centroids
            );
        }
    },
    // Note: brigade_front_assignment and local_fronts are NOT overwritten by sector system.
    // Sectors are an organizational layer for corps targeting and directives.
    // The density modifier continues to use the existing local_fronts (faction-level aggregation)
    // because per-sector density would over-penalize overextended factions (VRS historically thin).

    {
        name: 'assign-brigades-to-subsegments',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const sectorMap = context.state.military.corps_front_sectors;
            if (!sectorMap) return;
            const sectorList = Object.values(sectorMap);
            if (sectorList.length === 0) return;
            const od = getOperationalData(context);
            if (!od?.edges?.length) return;
            const adjacency = buildOsidAdjacency(od.edges);

            // D3: Save previous sub-segment assignments for entrenchment reset
            const formations = context.state.military.formations ?? {};
            const prevAssignment = new Map<string, string | undefined>();
            for (const [fid, f] of Object.entries(formations)) {
                if (f && f.status === 'active') {
                    prevAssignment.set(fid, f.assigned_sub_segment_id);
                }
            }

            assignBrigadesToSubSegments(context.state, sectorList, adjacency);

            // D3: If assigned_sub_segment_id changed, decay entrenchment
            for (const [fid, prevSsId] of prevAssignment) {
                const f = formations[fid];
                if (!f) continue;
                const newSsId = f.assigned_sub_segment_id;
                if (prevSsId != null && newSsId != null && prevSsId !== newSsId) {
                    const et = (f as { entrenchment_turns?: number }).entrenchment_turns ?? 0;
                    if (et > 0) {
                        (f as { entrenchment_turns?: number }).entrenchment_turns =
                            Math.floor(et * REASSIGNMENT_ENTRENCHMENT_RETAIN);
                    }
                }
            }
        }
    },

    {
        name: 'distribute-brigades-to-front',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const sectorMap = context.state.military.corps_front_sectors;
            if (!sectorMap) return;
            const od = getOperationalData(context);
            if (!od?.edges?.length) return;
            const adjacency = buildOsidAdjacency(od.edges);
            distributeBrigadesToFront(context.state, Object.values(sectorMap), adjacency);
        }
    },

    {
        name: 'return-displaced-brigades',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.edges?.length) return;
            const adjacency = buildOsidAdjacency(od.edges);
            evaluateHomeReturn(context.state, adjacency);
        }
    },

    {
        name: 'compute-sector-combat-ratings',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.military.corps_front_sectors) return;
            const supplyByOsid = context.report?.supply_resolution?.supply_state_by_osid ?? null;
            const ratingReport = computeSectorCombatRatings(context.state, supplyByOsid);
            if (ratingReport.sectors_rated > 0) {
                context.report.sector_combat_ratings = ratingReport;
            }
        }
    },

    {
        name: 'paramilitary-detect',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            if ((context.state.meta?.turn ?? 0) > PARAMILITARY_FADE_WEEK) return;
            const od = getOperationalData(context);
            if (!od?.opData?.operationalToCanonical || !od?.edges?.length) return;

            const report = detectParamilitaryTargets(
                context.state, od.edges, od.opData.operationalToCanonical
            );
            if (report.spawned.length > 0 || report.pending_player_requests > 0) {
                context.report.paramilitary_sweep = report;
            }
        }
    },
    {
        name: 'paramilitary-advance',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.opData?.operationalToCanonical) return;
            const report = advanceParamilitaries(
                context.state, od.opData.operationalToCanonical
            );
            if (report.captured.length > 0 || report.dissolved.length > 0) {
                const existing = context.report.paramilitary_sweep as import('../combat/paramilitary_sweep.js').ParamilitarySweepReport | undefined;
                if (existing) {
                    existing.captured.push(...report.captured);
                    existing.dissolved.push(...report.dissolved);
                } else {
                    context.report.paramilitary_sweep = report;
                }
            }
        }
    },
    {
        name: 'consolidate-rear-pockets',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.opData?.operationalToCanonical || !od?.edges?.length) return;
            const report = consolidateRearPockets(
                context.state, od.edges, od.opData.operationalToCanonical
            );
            if (report.total_flipped > 0) {
                context.report.rear_pocket_consolidation = report;
            }
        }
    },
    {
        name: 'process-brigade-movement',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (getOperationalData(context)) return;
            const { edges } = await getGraphAndEdges(context);
            let terrainData;
            try {
                terrainData = await loadTerrainScalars();
            } catch {
                terrainData = { by_sid: {} };
            }
            processBrigadeMovement(context.state, edges, terrainData);
        }
    },
    {
        name: 'jna-phantom-withdrawals',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const events = processJnaWithdrawals(context.state);
            if (events.length > 0) {
                if (!context.report.jna_withdrawal_events) context.report.jna_withdrawal_events = [];
                (context.report.jna_withdrawal_events as typeof events).push(...events);
            }
        }
    },
    {
        name: 'advance-sector-offensives',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const supplyByOsid = context.report.supply_resolution?.supply_state_by_osid;
            const prepEvents = advanceSectorOffensives(context.state, supplyByOsid);
            if (prepEvents.length > 0) {
                context.report.preparation_events = prepEvents;
            }
        }
    },
    {
        name: 'assert-operation-lifecycle',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            assertOperationLifecycle(context.state);
        }
    },
    {
        name: 'inject-queued-operations',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const cc = context.state.military.corps_command;
            if (!cc) return;
            for (const corpsId of Object.keys(cc).sort()) {
                const cmd = cc[corpsId];
                if (!cmd?.active_operation && cmd?.queued_operations?.length) {
                    injectQueuedOperation(context.state, corpsId);
                }
            }
        }
    },
    {
        name: 'check-triggered-operations',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            checkTriggeredOperations(context.state);
        }
    },
    {
        name: 'compute-home-distance-cache',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.edges?.length) return;
            const adjacency = buildOsidAdjacency(od.edges);
            const sortedIds = Object.keys(context.state.military.formations ?? {}).sort(strictCompare);
            context.state.military.home_distance_cache = buildHomeDistanceCache(context.state.military.formations ?? {}, adjacency, sortedIds);
        }
    },
    {
        name: 'ai-army-decisions',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const config = context.state.meta.ai_commander_config;
            if (!config || config.mode === 'cadet') return;

            const { createAiClient } = await import('../ai_commander/ai_client.js');
            const { generateArmyDecision } = await import('../ai_commander/army_commander_ai.js');
            const { clearTurnDecisions } = await import('../ai_commander/decision_log.js');

            clearTurnDecisions(context.state);
            const client = await createAiClient(config.anthropic_api_key);
            if (!client) return;

            const playerFaction = context.state.meta.player_faction ?? null;
            const botFactions = (context.state.factions ?? [])
                .map((f) => f.id)
                .filter((fid: string) => playerFaction == null || fid !== playerFaction);

            const results = await Promise.allSettled(
                botFactions.map(async (faction: string) => {
                    const decision = await generateArmyDecision(context.state, faction as FactionId, client);
                    if (decision) {
                        if (!context.state.military.ai_army_decisions) {
                            context.state.military.ai_army_decisions = {};
                        }
                        context.state.military.ai_army_decisions[faction] = decision;
                    }
                })
            );
        }
    },
    {
        name: 'ai-corps-decisions',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const config = context.state.meta.ai_commander_config;
            if (!config || config.mode === 'cadet') return;

            const { createAiClient } = await import('../ai_commander/ai_client.js');
            const { generateCorpsDecisions } = await import('../ai_commander/corps_commander_ai.js');

            const client = await createAiClient(config.anthropic_api_key);
            if (!client) return;

            const playerFaction = context.state.meta.player_faction ?? null;
            const botFactions = (context.state.factions ?? [])
                .map((f) => f.id)
                .filter((fid: string) => playerFaction == null || fid !== playerFaction);

            for (const faction of botFactions) {
                const armyDecision = context.state.military.ai_army_decisions?.[faction] ?? null;
                await generateCorpsDecisions(context.state, faction as FactionId, armyDecision, client);
            }
        }
    },
    {
        name: 'ai-corps-dialogue',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const config = context.state.meta.ai_commander_config;
            if (!config || config.mode === 'cadet') return;

            const { createAiClient } = await import('../ai_commander/ai_client.js');
            const { generateCorpsDialogues } = await import('../ai_commander/corps_dialogue.js');

            const client = await createAiClient(config.anthropic_api_key);
            if (!client) return;

            const dialogues = await generateCorpsDialogues(context.state, client);
            if (dialogues.length > 0) {
                context.state.military.corps_dialogues = dialogues;
            }
        },
    },
    {
        name: 'ai-war-dispatches',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const config = context.state.meta.ai_commander_config;
            if (!config || config.mode === 'cadet') return;

            const { shouldGenerateDispatch } = await import('../ai_commander/war_dispatches.js');
            if (!shouldGenerateDispatch(context.state.meta.turn)) return;

            const { createAiClient } = await import('../ai_commander/ai_client.js');
            const { generateWarDispatch } = await import('../ai_commander/war_dispatches.js');

            const client = await createAiClient(config.anthropic_api_key);
            if (!client) return;

            const dispatch = await generateWarDispatch(context.state, client);
            if (dispatch) {
                const existing = context.state.military.war_dispatches ?? [];
                context.state.military.war_dispatches = [...existing, dispatch].slice(-10);
            }
        },
    },
    {
        name: 'evaluate-army-hq-gathering',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const factions: FactionId[] = ['RS', 'RBiH', 'HRHB'];
            for (const faction of factions) {
                if (faction === context.state.meta.player_faction) continue;
                evaluateArmyHQGathering(context.state, faction, context.state.meta.turn);
            }
        },
    },
    {
        name: 'generate-bot-corps-orders',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            // Ensure corps_command is initialized (handles brigades created by per-turn recruitment)
            initializeCorpsCommand(context.state);
            if (!context.state.military.corps_command || Object.keys(context.state.military.corps_command).length === 0) return;
            const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
            const edges = context.input.settlementEdges && context.input.settlementEdges.length > 0
                ? context.input.settlementEdges
                : graph.edges;
            const sidToMun = new Map<string, string>();
            for (const [sid, rec] of graph.settlements.entries()) {
                const munId = rec.mun1990_id ?? rec.mun_code;
                if (munId) sidToMun.set(sid, munId);
            }
            const playerFaction = context.state.meta.player_faction ?? null;
            const factions = (context.state.factions ?? []).map(f => f.id)
                .filter(fid => playerFaction == null || fid !== playerFaction)
                .sort(strictCompare);
            // Pass operational reverse map + OSID edges for corps directive generation
            const od = getOperationalData(context);
            const reverseMap = od?.opData?.operationalToCanonical ?? null;
            const osidEdges = od?.edges ?? undefined;
            // Load ethnic composition data for corps-level targeting intelligence
            let corpsEthnicMap;
            if (od?.opData?.operationalToCanonical) {
                try {
                    const ethnicityData = await loadSettlementEthnicityData();
                    corpsEthnicMap = computeOsidEthnicComposition(od.opData.operationalToCanonical, ethnicityData);
                } catch {
                    // Non-fatal: ethnic intelligence is a bonus, not a requirement
                }
            }
            const corpsReport: CorpsAiReportEntry[] = [];
            for (const faction of factions) {
                const supplyByOsid = context.report.supply_resolution?.supply_state_by_osid;
                generateAllCorpsOrders(context.state, faction, edges, sidToMun, reverseMap, osidEdges, supplyByOsid, corpsEthnicMap);
                corpsReport.push(...extractCorpsAiReport(context.state, faction as FactionId));
            }
            if (corpsReport.length > 0) {
                context.report.corps_ai_report = corpsReport;
            }
        }
    },
    {
        // Recompute after bot corps orders: generateCorpsDirectives rearranges,
        // concentrates, and splits sectors — renumbering their IDs. The initial
        // compute at step 639 used pre-rearrangement IDs; this refresh aligns
        // sector_combat_ratings with the final corps_front_sectors saved to state.
        name: 'recompute-sector-combat-ratings',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.military.corps_front_sectors) return;
            const supplyByOsid = context.report?.supply_resolution?.supply_state_by_osid ?? null;
            computeSectorCombatRatings(context.state, supplyByOsid);
        }
    },
    {
        name: 'generate-army-reserve-requests',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.edges?.length) return;
            const adjacency = buildOsidAdjacency(od.edges);
            generateArmyReserveRequests(context.state, adjacency);
            evaluateArmyReserveAssignments(context.state, adjacency);
        }
    },
    {
        name: 'generate-bot-brigade-orders',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const playerFaction = context.state.meta.player_faction ?? null;
            const factions = (context.state.factions ?? []).map(f => f.id)
                .filter(fid => playerFaction == null || fid !== playerFaction);

            // War phase bot brigade orders: OSID-only (no brigade_aor). When operational data present, run OSID AI.
            const od = getOperationalData(context);
            if (od?.opData?.operationalToCanonical && od?.edges?.length) {
                const supplyByOsid = context.report.supply_resolution?.supply_state_by_osid;
                const supplyConnectivityByFaction = new Map<string, Set<string>>();
                if (supplyByOsid?.factions) {
                    for (const fac of supplyByOsid.factions) {
                        const supplied = new Set<string>();
                        for (const e of fac.by_osid ?? []) {
                            if (e.state !== 'critical') supplied.add(e.osid);
                        }
                        supplyConnectivityByFaction.set(fac.faction_id, supplied);
                    }
                }
                // Load ethnic composition data for co-ethnic attack/defend scoring
                let ethnicCompositionByOsid;
                try {
                    const ethnicityData = await loadSettlementEthnicityData();
                    ethnicCompositionByOsid = computeOsidEthnicComposition(od.opData.operationalToCanonical, ethnicityData);
                } catch {
                    // Non-fatal: ethnic scoring is a bonus, not a requirement
                }
                const osidPopulationMap = context.input.municipalityPopulation1991
                    ? computeOsidPopulation(od.opData.operationalToCanonical, context.input.municipalityPopulation1991)
                    : undefined;
                const osidCtx: OsidBotContext = {
                    edges: od.edges,
                    reverseMap: od.opData.operationalToCanonical,
                    supplyStateByOsid: supplyByOsid,
                    supplyConnectivityByFaction: supplyConnectivityByFaction.size > 0 ? supplyConnectivityByFaction : undefined,
                    ethnicCompositionByOsid,
                    osidPopulationMap
                };
                const botOrderDiagnostics = generateAllBotOrdersOsid(context.state, factions, osidCtx);
                context.report.bot_order_diagnostics = createBotOrderDiagnosticsSnapshot(context.state, botOrderDiagnostics);
            }
            // When operational data unavailable: no bot brigade orders (AoR path removed).
        }
    },
    {
        name: 'ensure-derived-corps-front-edges',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const { edges } = await getGraphAndEdges(context);
            ensureDerivedCorpsFrontEdges(context.state, edges);
        }
    },
    {
        name: 'apply-corps-front-orders',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.military.corps_front_edges) return;
            applyCorpsFrontAutoDistribution(context.state);
        }
    },
    {
        name: 'apply-corps-attack-axis-orders',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.military.corps_attack_axis_orders) return;
            applyCorpsAttackAxisOrders(context.state);
        }
    },
    {
        name: 'apply-brigade-reposition',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.military.brigade_reposition_orders || Object.keys(context.state.military.brigade_reposition_orders).length === 0) return;
            const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
            const edges = context.input.settlementEdges && context.input.settlementEdges.length > 0
                ? context.input.settlementEdges
                : graph.edges;
            applyBrigadeRepositionOrders(context.state, edges);
        }
    },
    {
        name: 'apply-brigade-posture',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            applyPostureOrders(context.state);
        }
    },
    {
        name: 'apply-sector-stance-orders',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            applySectorStanceOrders(context.state);
        }
    },
    {
        name: 'update-corps-effects',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.military.corps_command) return;
            applyCorpsEffects(context.state);
        }
    },
    {
        name: 'advance-corps-operations',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.military.corps_command) return;
            advanceOperations(context.state);
        }
    },
    {
        name: 'activate-operational-groups',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.military.og_orders?.length) return;
            activateOGs(context.state);
        }
    },
    {
        name: 'equipment-degradation',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const turn = context.state.meta.turn ?? 0;
            const formations = context.state.military.formations ?? {};
            for (const fid of Object.keys(formations).sort()) {
                const f = formations[fid];
                if (f.status !== 'active' || (f.kind !== 'brigade' && f.kind !== 'og')) continue;
                ensureBrigadeComposition(f);
                // Use faction maintenance capacity (0.0-1.0)
                const factionState = (context.state.factions ?? []).find(fac => fac.id === f.faction);
                const baseMaintenance = factionState?.profile?.logistics ?? 50;
                // C3: RS maintenance capacity decays over time (spare parts depletion)
                const maintenanceMult = f.faction === 'RS' ? getRSMaintenanceCapacityMult(turn, context.state.military.war_timeline) : 1.0;
                const maintenance = (baseMaintenance / 100) * maintenanceMult;
                degradeEquipment(f, f.posture, maintenance);
            }
        }
    },
    {
        name: 'equipment-progression',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const turn = context.state.meta.turn ?? 0;
            // Run every 4 turns to model gradual acquisition
            if (turn === 0 || turn % 4 !== 0) return;
            context.report.equipment_progression = runEquipmentProgression(context.state);
        }
    },
    {
        name: 'apply-posture-costs',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            applyPostureCosts(context.state);
        }
    },
    {
        name: 'check-truce-break',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const playerFaction = context.state.meta.player_faction ?? null;
            if (!playerFaction) return;
            // Check if player has any attack orders targeting a truce-partner OSID
            const orders = context.state.military.brigade_attack_orders;
            if (!orders) return;
            const pc = context.state.political.political_controllers ?? {};
            for (const targetOsid of Object.values(orders)) {
                if (!targetOsid) continue;
                const controller = pc[targetOsid];
                if (!controller) continue;
                const warning = recordTruceBroken(playerFaction, targetOsid, context.state);
                if (warning) {
                    (context.report.events_fired ??= []).push({ id: 'truce_broken', text: warning });
                    break; // One warning per turn is enough
                }
            }
        }
    },
    {
        name: 'resolve-attack-orders',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (od?.opData?.operationalToCanonical && od?.edges?.length) {
                let terrainData: Awaited<ReturnType<typeof loadTerrainScalars>> | undefined;
                try {
                    terrainData = await loadTerrainScalars();
                } catch {
                    terrainData = { by_sid: {} };
                }
                const osidPopMap = context.input.municipalityPopulation1991
                    ? computeOsidPopulation(od.opData.operationalToCanonical, context.input.municipalityPopulation1991)
                    : undefined;
                // Ethnic composition for homeland defense bonus in combat resolution
                let ethnicComp;
                try {
                    const ethnicityData = await loadSettlementEthnicityData();
                    ethnicComp = computeOsidEthnicComposition(od.opData.operationalToCanonical, ethnicityData);
                } catch {
                    // Non-fatal: ethnic defense bonus simply not applied
                }
                // Control events are persisted for the full game — no trimming.
                // They feed the settlement timeline ("The Story of This Place").
                context.report.attack_resolution_osid = resolveAttackOrdersOsid(
                    context.state,
                    od.edges,
                    od.opData.operationalToCanonical,
                    terrainData,
                    context.report.supply_resolution?.supply_state_by_osid,
                    osidPopMap,
                    ethnicComp
                );
                // Sort control_events deterministically after resolution.
                if (context.state.political.control_events?.length) {
                    context.state.political.control_events.sort((a, b) => {
                        if (a.turn !== b.turn) return a.turn - b.turn;
                        return a.settlement_id < b.settlement_id ? -1 : a.settlement_id > b.settlement_id ? 1 : 0;
                    });
                }
                return;
            }
            const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
            const edges = context.input.settlementEdges ?? graph.edges;

            const settlementToMun = new Map<string, string>();
            const sidToMunRecord: Record<string, string> = {};
            for (const [sid, rec] of graph.settlements.entries()) {
                const mun = rec.mun1990_id ?? rec.mun_code ?? rec.mun;
                settlementToMun.set(sid, mun);
                sidToMunRecord[sid] = mun;
            }
            computeMilitiaGarrisons(context.state, sidToMunRecord);

            let terrainData;
            try {
                terrainData = await loadTerrainScalars();
            } catch {
                terrainData = { by_sid: {} };
            }

            context.report.resolve_attack_orders = resolveAttackOrders(
                context.state, edges, terrainData, settlementToMun
            );
        }
    },
    {
        name: 'attribute-operation-casualties',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const osidReport = context.report.attack_resolution_osid;
            if (!osidReport) return;
            attributeOperationCasualties(context.state, osidReport);
        }
    },
    {
        name: 'update-sector-offensive-results',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            const reverseMap = od?.opData?.operationalToCanonical ?? null;
            updateSectorOffensiveResults(context.state, reverseMap);
        }
    },
    {
        name: 'record-operation-weekly-entry',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            const reverseMap = od?.opData?.operationalToCanonical ?? null;
            recordOperationWeeklyEntries(context.state, reverseMap);
        }
    },
    {
        name: 'displace-enemy-territory',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.opData?.operationalToCanonical || !od?.edges?.length) return;
            displaceFormationsInEnemyTerritory(context.state, od.edges, od.opData.operationalToCanonical);
        }
    },
    {
        name: 'update-officer-quality',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const { updateBrigadeOfficerQuality } = await import('../combat/officer_quality_update.js');
            // Collect engaged formation IDs from OSID attack resolution report
            const osidReport = context.report.attack_resolution_osid;
            const engagedIds = new Set<string>(osidReport?.engaged_formation_ids ?? []);
            const report = updateBrigadeOfficerQuality(context.state, engagedIds);
            context.report.officer_quality_update = report;
        }
    },
    {
        name: 'evaluate-brigade-decorations',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const { evaluateAllBrigadeDecorations } = await import('../combat/decoration_evaluator.js');
            evaluateAllBrigadeDecorations(context.state);
        }
    },
    {
        name: 'apply-casualty-pool-exhaustion',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const osidReport = context.report.attack_resolution_osid;
            if (!osidReport?.battles?.length) return;
            // Approximate per-formation battle casualties from the report.
            // Uses the same loss rates and outcome modifiers as attack_resolution_osid.
            // Not exact (personnel already reduced), but close enough for pool exhaustion.
            const KIA_FRAC = 0.30;
            const WIA_FRAC = 0.55;
            const ATK_RATE = 0.045;
            const DEF_RATE = 0.02;
            const ATK_MOD: Record<string, number> = {
                decisive_victory: 1.0, victory: 1.2, costly_victory: 1.8,
                stalemate: 1.0, repulsed: 2.0, catastrophic: 3.0
            };
            const DEF_MOD: Record<string, number> = {
                decisive_victory: 2.5, victory: 1.8, costly_victory: 1.2,
                stalemate: 0.8, repulsed: 0.5, catastrophic: 0.3
            };
            const battleCasualties: Array<{ formation_id: string; faction: string; killed: number; missing_captured: number }> = [];
            for (const battle of osidReport.battles) {
                const attP = context.state.military.formations?.[battle.attacker_brigade]?.personnel ?? 0;
                const attCas = Math.round(attP * ATK_RATE * (ATK_MOD[battle.outcome] ?? 1.0));
                if (attCas > 0) {
                    battleCasualties.push({
                        formation_id: battle.attacker_brigade,
                        faction: battle.attacker_faction,
                        killed: Math.floor(attCas * KIA_FRAC),
                        missing_captured: Math.max(0, attCas - Math.floor(attCas * KIA_FRAC) - Math.floor(attCas * WIA_FRAC))
                    });
                }
                if (battle.defender_brigade) {
                    const defP = context.state.military.formations?.[battle.defender_brigade]?.personnel ?? 0;
                    const defCas = Math.round(defP * DEF_RATE * (DEF_MOD[battle.outcome] ?? 1.0));
                    if (defCas > 0) {
                        battleCasualties.push({
                            formation_id: battle.defender_brigade,
                            faction: battle.defender_faction,
                            killed: Math.floor(defCas * KIA_FRAC),
                            missing_captured: Math.max(0, defCas - Math.floor(defCas * KIA_FRAC) - Math.floor(defCas * WIA_FRAC))
                        });
                    }
                }
            }
            if (battleCasualties.length > 0) {
                applyCasualtyPoolExhaustion(context.state, battleCasualties);
            }
        }
    },
    {
        name: 'cohesion-drift',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const engagedIds = context.report.attack_resolution_osid?.engaged_formation_ids ?? [];
            context.report.cohesion_drift_report = runCohesionDrift(context.state, engagedIds);
        }
    },
    {
        name: 'morale-drift',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const engagedIds = context.report.attack_resolution_osid?.engaged_formation_ids ?? [];
            context.report.morale_drift_report = runMoraleDrift(
                context.state, engagedIds, context.input.municipalityPopulation1991,
                context.report.supply_resolution?.supply_state_by_osid
            );
        }
    },
    {
        name: 'apply-frontline-attrition',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            context.report.frontline_attrition = applyFrontlineAttrition(
                context.state,
                context.report.supply_resolution?.supply_state_by_osid
            );
        }
    },
    {
        name: 'apply-siege-bombardment-attrition',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.meta.supply_reserves_enabled) return;
            const { applySiegeBombardmentAttrition } = await import('../combat/siege_attrition.js');
            context.report.siege_bombardment_attrition = applySiegeBombardmentAttrition(context.state);
        }
    },
    {
        name: 'hostile-takeover-displacement',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const graph = context.input.settlementGraph ?? (await loadSettlementGraph());

            // Build combined battle report from both old settlement-based and OSID-based attack resolution.
            // The displacement system needs settlement-level records; we synthesize them from OSID flips
            // by finding one settlement per municipality. This connects OSID-level combat to the
            // existing displacement routing (e.g. East Bosnia displaced → Srebrenica/Gorazde).
            const legacyBattles = context.report.resolve_attack_orders?.battle_report?.battles ?? [];
            const osidBattles: Array<{ settlement_flipped: boolean; location: string; osid?: string; attacker_faction: FactionId; defender_faction: FactionId }> = [];
            const osidReport = context.report.attack_resolution_osid;
            if (osidReport?.battles?.length) {
                const munToSid = new Map<string, string>();
                for (const [sid, rec] of graph.settlements.entries()) {
                    const mun = rec.mun1990_id ?? rec.mun_code ?? (rec as { mun?: string }).mun;
                    if (mun && !munToSid.has(mun)) munToSid.set(mun, sid);
                }
                for (const b of osidReport.battles) {
                    if (!b.attacker_won) continue;
                    const parts = b.target_osid.split(':');
                    const mun = parts.length >= 2 ? parts[1] : undefined;
                    if (!mun) continue;
                    const sid = munToSid.get(mun);
                    if (!sid) continue;
                    osidBattles.push({
                        settlement_flipped: true,
                        location: sid,
                        osid: b.target_osid,
                        attacker_faction: b.attacker_faction as FactionId,
                        defender_faction: b.defender_faction as FactionId
                    });
                }
            }
            const combinedReport = { battles: [...legacyBattles, ...osidBattles] };

            // Load operational settlements (OSID-keyed) for per-OSID census data
            let osidSettlements: Map<string, import('../../map/settlements_parse.js').SettlementRecord> | undefined;
            try {
                const opGraph = await loadSettlementGraph();
                // Check if it's OSID-keyed (keys start with 'op:') — if so, use it
                const firstKey = opGraph.settlements.keys().next().value;
                if (typeof firstKey === 'string' && firstKey.startsWith('op:')) {
                    osidSettlements = opGraph.settlements;
                }
            } catch { /* fallback: no OSID census data */ }

            context.report.takeover_displacement = processDisplacementTakeover(
                context.state,
                graph.settlements,
                combinedReport,
                context.input.municipalityPopulation1991,
                osidSettlements
            );
        }
    },
    {
        name: 'alliance-update',
        run: (context) => {
            // RBiH–HRHB alliance dynamics: must run in War phase too, or alliance never
            // degrades and HVO never enters bilateral war with RBiH.
            // Uses same functions as phase-i-alliance-update.
            ensureRbihHrhbState(context.state);
            updateMixedMunicipalitiesList(context.state);
            if (context.state.meta.enable_rbih_hrhb_dynamics !== false) {
                context.report.alliance_update = updateAllianceValue(context.state);
            }
        }
    },
    {
        name: 'ceasefire-check',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            context.report.ceasefire_check = checkAndApplyCeasefire(context.state);
        }
    },
    {
        name: 'washington-check',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            context.report.washington_check = checkAndApplyWashington(context.state);
        }
    },
    {
        name: 'operation-storm-check',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            context.report.operation_storm_check = checkAndApplyOperationStorm(context.state);
        }
    },
    {
        name: 'hv-integration',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            context.report.hv_integration = tickHvIntegration(context.state);
        }
    },
    {
        name: 'process-lifecycle-events',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const { loadLifecycleEvents, processLifecycleEvents } = await import('../formation_lifecycle_events.js');
            const events = await loadLifecycleEvents();
            processLifecycleEvents(context.state, events);
        }
    },
    {
        name: 'recruitment',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.military.recruitment_state) return;

            const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
            const accrualReport = accrueRecruitmentResources(
                context.state,
                graph.settlements,
                context.report.supply_resolution?.local_production
            );

            const factions = (context.state.factions ?? []).map((f) => f.id).sort(strictCompare);
            const accrual_by_faction: Record<FactionId, { capital_delta: number; equipment_delta: number }> = {} as Record<
                FactionId,
                { capital_delta: number; equipment_delta: number }
            >;
            for (const factionId of factions) {
                accrual_by_faction[factionId] = { capital_delta: 0, equipment_delta: 0 };
            }
            for (const row of accrualReport?.by_faction ?? []) {
                accrual_by_faction[row.faction_id] = {
                    capital_delta: row.capital_delta,
                    equipment_delta: row.equipment_delta
                };
            }

            let recruited_actions = 0;
            const recruited_by_faction: Record<FactionId, number> = {} as Record<FactionId, number>;
            for (const factionId of factions) recruited_by_faction[factionId] = 0;

            const catalog = await loadRecruitmentCatalog();
            if (catalog) {
                let sidToMun = buildSidToMunFromSettlements(graph.settlements);
                // OSID-vs-SID fix: when political_controllers are OSID-keyed, rebuild sidToMun
                // so factionHasPresenceInMun can match OSID keys to municipalities.
                const opDataCache = getOperationalData(context);
                if (opDataCache?.opData?.operationalToCanonical) {
                    const pc = context.state.political.political_controllers ?? {};
                    const firstKey = Object.keys(pc)[0];
                    if (firstKey?.startsWith('op:')) {
                        sidToMun = buildOsidToMunFromReverseMap(
                            opDataCache.opData.operationalToCanonical,
                            sidToMun
                        );
                    }
                }
                const ongoingReport = runOngoingRecruitment(
                    context.state,
                    catalog.corps,
                    catalog.brigades,
                    sidToMun,
                    catalog.municipality_hq_settlement
                );
                recruited_actions = ongoingReport?.actions.length ?? 0;
                for (const action of ongoingReport?.actions ?? []) {
                    recruited_by_faction[action.faction] = (recruited_by_faction[action.faction] ?? 0) + 1;
                }
            }

            const remaining_capital: Record<FactionId, number> = {} as Record<FactionId, number>;
            const remaining_equipment: Record<FactionId, number> = {} as Record<FactionId, number>;
            for (const factionId of factions) {
                remaining_capital[factionId] = context.state.military.recruitment_state.recruitment_capital[factionId]?.points ?? 0;
                remaining_equipment[factionId] = context.state.military.recruitment_state.equipment_pools[factionId]?.points ?? 0;
            }

            context.report.recruitment_report = {
                accrual_by_faction,
                recruited_actions,
                recruited_by_faction,
                remaining_capital,
                remaining_equipment
            };
        }
    },
    {
        name: 'ongoing-mobilization',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
            context.report.ongoing_mobilization = runOngoingMobilization(
                context.state,
                graph.settlements,
                context.input.municipalityPopulation1991 ?? undefined
            );
        }
    },
    {
        name: 'brigade-reinforcement',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            context.report.brigade_reinforcement = reinforceBrigadesFromPools(context.state);
        }
    },
    {
        name: 'strategic-reserve-collection',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            context.report.strategic_reserve_collection = collectStrategicReserves(context.state);
        }
    },
    {
        name: 'strategic-reserve-reinforcement',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            context.report.strategic_reserve_reinforcement = reinforceFromStrategicReserves(context.state);
        }
    },
    {
        name: 'apply-vrs-equipment-decay',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const turn = context.state.meta?.turn ?? 0;
            const { VRS_EQUIPMENT_DECAY_START_WEEK, VRS_EQUIPMENT_DECAY_RATE, VRS_EQUIPMENT_DECAY_FLOOR } = await import('../../state/formation_constants.js');
            // Timeline-driven equipment decay when available
            const timelineDecay = context.state.military.war_timeline?.equipment_decay?.find(c => c.faction === 'RS');
            const startWeek = timelineDecay?.start_week ?? VRS_EQUIPMENT_DECAY_START_WEEK;
            const ratePerWeek = timelineDecay?.rate_per_week ?? VRS_EQUIPMENT_DECAY_RATE;
            const floor = timelineDecay?.floor ?? VRS_EQUIPMENT_DECAY_FLOOR;
            if (turn < startWeek) return;
            for (const f of Object.values(context.state.military.formations ?? {})) {
                if (f.faction !== 'RS' || f.status !== 'active') continue;
                const current = f.equipment_decay ?? 1.0;
                f.equipment_decay = Math.max(floor, current - ratePerWeek);
            }
        }
    },
    {
        name: 'tick-elite-loans',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            tickEliteLoans(context.state, context.state.meta.turn);
        }
    },
    {
        name: 'officer-succession',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.military.named_officers || !context.state.military.named_officer_data) return;
            const { processOfficerSuccession } = await import('../combat/officer_system.js');
            // Collect corps IDs that had combat this turn from the OSID attack report
            const engagedCorpsIds = new Set<string>();
            const osidReport = context.report.attack_resolution_osid;
            if (osidReport?.battles) {
                for (const battle of osidReport.battles) {
                    if (battle.attacker_brigade) {
                        const f = context.state.military.formations?.[battle.attacker_brigade];
                        if (f?.corps_id) engagedCorpsIds.add(f.corps_id);
                    }
                    if (battle.defender_brigade) {
                        const f = context.state.military.formations?.[battle.defender_brigade];
                        if (f?.corps_id) engagedCorpsIds.add(f.corps_id);
                    }
                }
            }
            const report = processOfficerSuccession(context.state, engagedCorpsIds);
            context.report.officer_succession = report;
        }
    },
    {
        name: 'check-heroic-stand',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.military.named_officers || !context.state.military.named_officer_data) return;
            const osidReport = context.report.attack_resolution_osid;
            if (!osidReport?.battles) return;
            const { checkHeroicStand } = await import('../combat/officer_experience.js');
            const formations = context.state.military.formations ?? {};
            const corpsCmds = context.state.military.corps_command ?? {};
            // Find defensive victories at 3:1+ power ratio — award heroic stand to defender's corps commander
            for (const battle of osidReport.battles) {
                if (battle.attacker_won) continue; // Defender must hold
                if (battle.power_ratio < 3.0) continue; // Must be 3:1+ odds against
                if (!battle.defender_brigade) continue;
                const defenderF = formations[battle.defender_brigade];
                if (!defenderF?.corps_id) continue;
                const cmd = corpsCmds[defenderF.corps_id];
                if (!cmd) continue;
                // Find the corps commander officer ID
                const officerState = Object.entries(context.state.military.named_officers ?? {})
                    .find(([, os]) => os.assigned_corps_id === defenderF.corps_id && os.status === 'active');
                if (!officerState) continue;
                checkHeroicStand(context.state, officerState[0], battle.power_ratio);
            }
        }
    },
    {
        name: 'check-warlord-friction',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.military.named_officers || !context.state.military.named_officer_data) return;
            const { checkWarlordFriction } = await import('../combat/warlord_friction.js');
            const frictionReport = checkWarlordFriction(context.state);
            if (frictionReport.events.length > 0) {
                context.report.warlord_friction = frictionReport;
            }
        }
    },
    {
        name: 'update-faction-officer-maturity',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.military.named_officers || !context.state.military.named_officer_data) return;
            const { updateFactionOfficerMaturity } = await import('../combat/officer_experience.js');
            updateFactionOfficerMaturity(context.state);
        }
    },
    {
        name: 'generate-war-stories',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const { generateWarStoryForFormation } = await import('../war_stories.js');
            const formations = context.state.military.formations ?? {};
            for (const fid of Object.keys(formations).sort()) {
                const f = formations[fid];
                if (!f || !f.brigade_history) continue;
                f.war_story = generateWarStoryForFormation(f);
            }
        }
    },
    {
        name: 'compute-combat-summaries',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const { computeCombatSummaries } = await import('../combat/combat_summary_aggregator.js');
            computeCombatSummaries(context.state);
        }
    },
    {
        name: 'wia-trickleback',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            context.report.wia_trickleback = applyWiaTrickleback(context.state);
        }
    },
    {
        name: 'update-og-lifecycle',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            updateOGLifecycle(context.state);
        }
    },
    // --- End Brigade Operations Pipeline ---
    {
        name: 'supply-pressure-exhaustion',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const edges = context.input.settlementEdges;
            if (!edges) return;
            const fronts = detectFronts(context.state, edges);
            const frictionMultipliers = getCommandFrictionMultipliers(context.state, edges);
            updateSupplyPressure(
                context.state,
                edges,
                context.report.supply_resolution?.supply_state,
                frictionMultipliers,
                context.report.supply_resolution?.production_bonus_by_faction,
                context.report.supply_resolution?.supply_state_by_osid
            );
            updateExhaustion(context.state, fronts, frictionMultipliers);
        }
    },
    {
        name: 'phase-e-pressure-update',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            let edges = context.input.settlementEdges;
            if (!edges || edges.length === 0) {
                const graph = await loadSettlementGraph();
                edges = graph.edges;
            }
            if (!edges || edges.length === 0) return;
            const result = diffusePressure(context.state, edges);
            context.report.phase_e_pressure_update = result.report;
        }
    },
    {
        name: 'front-emergence',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            let edges = context.input.settlementEdges;
            if (!edges || edges.length === 0) {
                const graph = await loadSettlementGraph();
                edges = graph.edges;
            }
            if (!edges || edges.length === 0) return;
            context.report.front_emergence_report = deriveFrontsFromPressureEligible(context.state, edges);
        }
    },
    {
        name: 'derive-sector-intel',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            deriveSectorIntel(context.state, context.state.meta.turn);
        }
    },
    {
        name: 'phase-f-displacement',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            let edges = context.input.settlementEdges;
            if (!edges || edges.length === 0) {
                const graph = await loadSettlementGraph();
                edges = graph.edges;
            }
            if (!edges || edges.length === 0) return;
            const graph = await loadSettlementGraph();
            const od = getOperationalData(context);
            const c2o = od?.opData?.canonicalToOperational;
            const { deltas, report: triggerReport } = evaluateDisplacementTriggers(context.state, edges, c2o);
            applySettlementDisplacementDeltas(context.state, deltas);
            const settlementsByMun = buildSettlementsByMun(graph.settlements);
            aggregateSettlementDisplacementToMunicipalities(context.state, settlementsByMun);
            context.report.phase_f_displacement = {
                trigger_report: {
                    triggered_settlements: triggerReport.triggered_settlements,
                    pressure_eligible_size: triggerReport.pressure_eligible_size,
                    front_active_set_size: triggerReport.front_active_set_size,
                    displacement_trigger_eligible_size: triggerReport.displacement_trigger_eligible_size
                },
                capacity_report: buildDisplacementCapacityReport(context.state)
            };
        }
    },
    {
        name: 'update-capability-profiles',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            updateCapabilityProfiles(context.state);
            context.report.capability_update = { factions: context.state.factions.length };
        }
    },
    {
        name: 'update-embargo-profiles',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            updateEmbargoProfiles(context.state);
            applySmugglingAllocation(context.state);
            ensureMaintenanceCapacity(context.state);
            context.report.embargo_update = { factions: context.state.factions.length };
        }
    },
    {
        name: 'update-enclave-integrity',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            let edges = context.input.settlementEdges;
            if (!edges || edges.length === 0) {
                const graph = await loadSettlementGraph();
                edges = graph.edges;
            }
            if (!edges || edges.length === 0) return;
            const graph = await loadSettlementGraph();
            const report = updateEnclaveIntegrity(
                context.state,
                graph,
                edges,
                context.report.supply_resolution?.supply_state
            );
            context.report.enclave_integrity = {
                enclaves: report.enclaves.length,
                humanitarian_pressure_total: report.humanitarian_pressure_total
            };
        }
    },
    {
        name: 'update-sarajevo-exception',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const graph = await loadSettlementGraph();
            const sarajevo = updateSarajevoState(context.state, graph, context.report.supply_resolution?.supply_state);
            maybeActivateSarajevoTunnel(context.state);
            context.report.sarajevo_exception = {
                siege_status: sarajevo.siege_status,
                siege_intensity: sarajevo.siege_intensity,
                humanitarian_pressure: sarajevo.humanitarian_pressure
            };
        }
    },
    {
        name: 'update-patron-ivp',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            ensureInternationalVisibilityPressure(context.state);
            const enclavePressure = context.report.enclave_integrity?.humanitarian_pressure_total ?? 0;
            const ivp = updateInternationalVisibilityPressure(
                context.state,
                context.state.political.sarajevo_state,
                enclavePressure
            );
            const consequences = applyIvpConsequences(context.state, ivp);
            updatePatronState(context.state, context.state.political.sarajevo_state, ivp);
            context.report.patron_ivp = {
                sarajevo_visibility: ivp.sarajevo_siege_visibility,
                enclave_pressure: ivp.enclave_humanitarian_pressure,
                negotiation_momentum: ivp.negotiation_momentum
            };
            (context.report as TurnReport & { patron_ivp_active_consequences?: string[] }).patron_ivp_active_consequences = consequences;
        }
    },
    {
        name: 'evaluate-humanitarian-convoys',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const edges = context.input.settlementEdges;
            if (!edges?.length) return;
            const created = evaluateHumanitarianConvoys(context.state, edges);
            applyHumanitarianConvoyDecisions(context.state);
            (context.report as TurnReport & { humanitarian_convoys?: { created: number; pending: number } }).humanitarian_convoys = {
                created: created.length,
                pending: context.state.military.pending_convoy_decisions?.length ?? 0,
            };
        }
    },
    {
        name: 'update-legitimacy',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const graph = await loadSettlementGraph();
            await updateLegitimacyState(context.state, graph);
            context.report.legitimacy_update = { settlements: Object.keys(context.state.political.settlements ?? {}).length };
        }
    },
    {
        name: 'apply-formation-commitment',
        run: (context) => {
            const edges = context.input.settlementEdges;
            if (!edges) return;
            const derivedFrontEdges = computeFrontEdges(context.state, edges);
            const frontRegions = computeFrontRegions(context.state, derivedFrontEdges);
            const { effectivePosture, report } = applyFormationCommitment(
                context.state,
                derivedFrontEdges,
                frontRegions,
                context.report.formation_fatigue,
                edges
            );
            context.report.commitment = report;
            // Store effective posture in context for pressure step (transient, not persisted)
            (context as TurnContext & WarPhaseContextExtensions).effectivePosture = effectivePosture;
        }
    },
    {
        name: 'update-doctrine-eligibility',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            updateDoctrineState(context.state, context.report.supply_resolution?.supply_state, (context as TurnContext & WarPhaseContextExtensions).effectivePosture);
            context.report.doctrine_update = { formations: Object.keys(context.state.military.formations ?? {}).length };
        }
    },
    {
        name: 'update-heavy-equipment',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const doctrineTempoByFormation: Record<string, number> = {};
            for (const formation of Object.values(context.state.military.formations ?? {})) {
                doctrineTempoByFormation[formation.id] = getDoctrineTempoMultiplier(formation);
            }
            updateHeavyEquipmentState(context.state, (context as TurnContext & WarPhaseContextExtensions).effectivePosture, doctrineTempoByFormation);
            context.report.equipment_update = { formations: Object.keys(context.state.military.formations ?? {}).length };
        }
    },
    {
        name: 'expose-effective-posture',
        run: (context) => {
            // Phase 5B: Expose intended vs effective posture (read-only, no new mechanics)
            const commitmentReport = context.report.commitment;
            if (!commitmentReport) return;

            const turn = context.state.meta.turn;
            const exposure: EffectivePostureExposureState = {
                by_faction: {} as EffectivePostureExposureState['by_faction'],
                last_updated_turn: turn
            };

            // Get effective posture from context (computed in commitment step)
            const effectivePosture = (context as TurnContext & WarPhaseContextExtensions).effectivePosture;

            // Build exposure from commitment report by_edge audits
            // Match audits to factions by checking base posture assignments and effective posture values
            for (const edgeAudit of commitmentReport.by_edge) {
                const edgeId = edgeAudit.edge_id;

                // Find which faction(s) this edge belongs to by checking base posture assignments
                for (const factionId of Object.keys(context.state.military.front_posture || {})) {
                    const assignment = context.state.military.front_posture[factionId]?.assignments?.[edgeId];
                    if (!assignment || assignment.weight === 0) continue;

                    // Verify this audit matches this faction by checking effective posture
                    const effectiveAssignment = effectivePosture?.[factionId]?.assignments?.[edgeId];
                    if (!effectiveAssignment) continue;

                    // Match by checking if base_weight and effective_weight align
                    if (effectiveAssignment.base_weight !== edgeAudit.base_weight ||
                        effectiveAssignment.effective_weight !== edgeAudit.effective_weight) {
                        continue; // This audit doesn't match this faction
                    }

                    if (!exposure.by_faction[factionId]) {
                        exposure.by_faction[factionId] = { by_edge: {} };
                    }

                    // Get global factor from faction totals if applied
                    const factionTotal = commitmentReport.by_faction.find((f) => f.faction_id === factionId);
                    const globalFactor = factionTotal?.capacity_applied ? factionTotal.global_factor : undefined;

                    exposure.by_faction[factionId].by_edge[edgeId] = {
                        intended_posture: assignment.posture,
                        intended_weight: edgeAudit.base_weight,
                        effective_weight: edgeAudit.effective_weight,
                        friction_factor: edgeAudit.friction_factor,
                        commit_points: edgeAudit.commit_points,
                        global_factor: globalFactor
                    };
                }
            }

            context.state.political.effective_posture_exposure = exposure;
        }
    },
    {
        name: 'accumulate-front-pressure',
        run: (context) => {
            const edges = context.input.settlementEdges;
            if (!edges) return;
            const derivedFrontEdges = computeFrontEdges(context.state, edges);
            const adjacencyMap = buildAdjacencyMap(edges);
            const effectivePosture = (context as TurnContext & WarPhaseContextExtensions).effectivePosture;
            context.report.front_pressure = accumulateFrontPressure(context.state, derivedFrontEdges, adjacencyMap, effectivePosture);
        }
    },
    {
        name: 'accumulate-exhaustion',
        run: (context) => {
            const edges = context.input.settlementEdges;
            if (!edges) return;
            const step = context.report.front_pressure;
            if (!step) return;

            const derivedFrontEdges = computeFrontEdges(context.state, edges);
            const deltas = new Map<string, number>(Object.entries(step.pressure_deltas));
            const localSupply = new Map<string, { side_a_supplied: boolean; side_b_supplied: boolean }>(
                Object.entries(step.local_supply)
            );

            context.report.exhaustion = accumulateExhaustion(context.state, derivedFrontEdges, deltas, localSupply);
        }
    },
    {
        name: 'phase3a-pressure-eligibility',
        run: async (context) => {
            // Feature-gated: only run if flag is enabled
            if (!getEnablePhase3A()) return;

            try {
                // Load enriched contact graph
                const enrichedGraph = await loadEnrichedContactGraph();

                // Build state accessors
                const accessors = buildStateAccessors(context.state);

                // Build effective edges with audit enabled
                const result = buildPressureEligibilityPhase3A(
                    enrichedGraph,
                    context.state,
                    accessors,
                    true // audit enabled
                );

                // Store audit in report (effective edges are in-memory only, not persisted)
                if (result.audit) {
                    context.report.phase3a_pressure_eligibility = result.audit;
                }

                // Store effective edges in context for potential use by pressure propagation
                (context as TurnContext & WarPhaseContextExtensions).phase3aEffectiveEdges = result.edgesEffective;
            } catch (err) {
                // If Phase 3A fails, log but don't crash the simulation
                console.warn(`Phase 3A pressure eligibility failed: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
    },
    {
        name: 'phase3a-pressure-diffusion',
        run: (context) => {
            if (!getEnablePhase3A() || !getEnablePhase3ADiffusion()) return;
            const effectiveEdges = (context as { phase3aEffectiveEdges?: unknown }).phase3aEffectiveEdges;
            if (!Array.isArray(effectiveEdges)) return;
            runPhase3APressureDiffusion(context.state, effectiveEdges);
        }
    },
    {
        name: 'phase3b-pressure-exhaustion',
        run: (context) => {
            const edges = context.input.settlementEdges;
            if (!edges) return;
            const derivedFrontEdges = computeFrontEdges(context.state, edges);
            const effectiveEdges = (context as { phase3aEffectiveEdges?: unknown }).phase3aEffectiveEdges;
            const result = applyPhase3BPressureExhaustion(
                context.state,
                derivedFrontEdges,
                Array.isArray(effectiveEdges) ? effectiveEdges : undefined
            );
            context.report.phase3b_pressure_exhaustion = result;
        }
    },
    {
        name: 'phase3c-exhaustion-collapse-gating',
        run: (context) => {
            const edges = context.input.settlementEdges;
            if (!edges) {
                const result = applyPhase3CExhaustionCollapseGating(context.state);
                context.report.phase3c_exhaustion_collapse_gating = result;
                return;
            }
            const derivedFrontEdges = computeFrontEdges(context.state, edges);
            const result = applyPhase3CExhaustionCollapseGating(context.state, derivedFrontEdges);
            context.report.phase3c_exhaustion_collapse_gating = result;
        }
    },
    {
        name: 'phase3d-collapse-resolution',
        run: (context) => {
            const result = applyPhase3DCollapseResolution(context.state);
            context.report.phase3d_collapse_resolution = result;
        }
    },
    {
        name: 'phase5d-loss-of-control-trends',
        run: (context) => {
            const edges = context.input.settlementEdges;
            if (!edges) return;
            const derivedFrontEdges = computeFrontEdges(context.state, edges);
            updateLossOfControlTrends(context.state, derivedFrontEdges, context.report.exhaustion);
        }
    },
    {
        name: 'update-militia-fatigue',
        run: async (context) => {
            const edges = context.input.settlementEdges;
            if (!edges) return;
            const exhaustionReport = context.report.exhaustion;
            if (!exhaustionReport) return;

            // Build exhaustion deltas map
            const exhaustionDeltas = new Map<string, number>();
            for (const f of exhaustionReport.per_faction) {
                if (f.delta > 0) {
                    exhaustionDeltas.set(f.faction_id, f.delta);
                }
            }

            // Load settlement graph to get settlements map
            const graph = await loadSettlementGraph();
            context.report.militia_fatigue = updateMilitiaFatigue(context.state, graph.settlements, edges, exhaustionDeltas);
        }
    },
    {
        name: 'update-displacement',
        run: async (context) => {
            const edges = context.input.settlementEdges;
            if (!edges) return;

            // Load settlement graph to get settlements map
            const graph = await loadSettlementGraph();
            context.report.displacement = updateDisplacement(
                context.state,
                graph.settlements,
                edges,
                context.input.municipalityPopulation1991
            );
        }
    },
    {
        name: 'update-sustainability',
        run: async (context) => {
            const edges = context.input.settlementEdges;
            if (!edges) return;

            // Load settlement graph to get settlements map
            const graph = await loadSettlementGraph();
            context.report.sustainability = updateSustainability(context.state, graph.settlements, edges);
        }
    },
    {
        name: 'update-negotiation-pressure',
        run: (context) => {
            const edges = context.input.settlementEdges;
            if (!edges) return;
            const derivedFrontEdges = computeFrontEdges(context.state, edges);
            context.report.negotiation_pressure = updateNegotiationPressure(
                context.state,
                derivedFrontEdges,
                context.report.exhaustion,
                context.report.formation_fatigue,
                context.report.militia_fatigue,
                context.report.sustainability
            );
        }
    },
    {
        name: 'update-negotiation-capital',
        run: async (context) => {
            context.report.negotiation_capital = await updateNegotiationCapital(
                context.state,
                context.report.negotiation_pressure,
                context.report.formation_fatigue,
                context.report.negotiation_acceptance
            );
        }
    },
    {
        name: 'expire-ceasefire',
        run: (context) => {
            expireCeasefireEntries(context.state);
        }
    },
    {
        name: 'update-negotiation-offers',
        run: (context) => {
            const edges = context.input.settlementEdges;
            if (!edges) return;
            const derivedFrontEdges = computeFrontEdges(context.state, edges);

            // Generate offers
            const offerReport = generateNegotiationOffers(
                context.state,
                derivedFrontEdges,
                edges,
                context.report.exhaustion,
                context.report.formation_fatigue,
                context.report.militia_fatigue
            );
            context.report.negotiation_offer = offerReport;

            // Check acceptance if offer exists
            if (offerReport.offer) {
                const acceptanceReport = checkOfferAcceptance(
                    context.state,
                    offerReport.offer,
                    derivedFrontEdges,
                    edges,
                    context.report.exhaustion,
                    context.report.formation_fatigue
                );
                context.report.negotiation_acceptance = acceptanceReport;

                // Apply if accepted and flag is set
                if (acceptanceReport.accepted && acceptanceReport.enforcement_package && context.input.applyNegotiation) {
                    applyEnforcementPackage(context.state, acceptanceReport.enforcement_package);
                    context.report.negotiation_apply = {
                        applied: true,
                        freeze_edges_count: acceptanceReport.enforcement_package.freeze_edges.length
                    };
                } else {
                    context.report.negotiation_apply = {
                        applied: false,
                        freeze_edges_count: 0
                    };
                }
            } else {
                context.report.negotiation_acceptance = {
                    accepted: false,
                    decision: 'reject',
                    reasons: ['no_offer_generated'],
                    enforcement_package: null,
                    counter_offer: null
                };
                context.report.negotiation_apply = {
                    applied: false,
                    freeze_edges_count: 0
                };
            }
        }
    },
    {
        name: 'rederive-osid-front-segments',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.opData?.operationalToCanonical || !od?.edges?.length) {
                context.state.military.war_front_edges_osid = undefined;
                return;
            }
            const osidFrontEdges = computeFrontEdgesOsid(context.state, od.edges, od.opData.operationalToCanonical);
            context.state.military.war_front_edges_osid = osidFrontEdges;
        }
    },
    {
        name: 'assert-formations-in-friendly-territory',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            assertFormationsInFriendlyTerritory(context.state);
        }
    },
    {
        name: 'assert-control-event-consistency',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const snapshot = getPoliticalControlSnapshot(context);
            if (snapshot) assertControlEventConsistency(context.state, snapshot);
        }
    },
    {
        name: 'evaluate-peace-plans',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            evaluatePeacePlans(context.state);
        }
    },
    {
        name: 'check-victory-conditions',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const result = checkWarTermination(context.state);
            if (result.game_over) {
                applyWarTermination(context.state, result);
                context.report.war_termination = {
                    outcome: result.outcome,
                    winner: result.winner,
                    trigger: result.trigger
                };
            }
        }
    },
    {
        name: 'update-patron-pressure',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            updatePatronPressure(context.state);
            evaluatePatronEvents(context.state);
        }
    },
    {
        name: 'compute-negotiation-capital',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            computeNegotiationBreakdown(context.state);
        }
    },
    {
        name: 'assemble-command-briefing',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const playerFaction = context.state.meta.player_faction;
            if (!playerFaction) return;
            const { assembleCommandBriefing } = require('../briefing/collect_briefing.js');
            const briefing = assembleCommandBriefing(context.state, playerFaction);
            context.state.military.last_briefing = briefing;
        }
    },
    {
        name: 'compile-turn-summary',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const { getAARSnapshot } = await import('../turn_pipeline_types.js');
            const { compileTurnSummary } = await import('../compile_turn_summary.js');
            const { MAX_TURN_SUMMARIES } = await import('../../state/turn_summary.js');
            const snapshot = getAARSnapshot(context);
            if (!snapshot) return;
            const summary = compileTurnSummary(context.state, snapshot, context.report);
            const existing = context.state.turn_summaries ?? [];
            context.state.turn_summaries = [summary, ...existing].slice(0, MAX_TURN_SUMMARIES);
        }
    },
    {
        name: 'resolve-noop',
        run: () => {
            // placeholder: future resolution work goes here
        }
    }
];
