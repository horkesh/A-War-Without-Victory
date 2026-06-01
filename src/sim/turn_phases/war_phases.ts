/** War-phase pipeline steps. Extracted from turn_pipeline.ts (R7). */

// --- Domain imports (paths adjusted: one directory deeper than turn_pipeline.ts) ---

import { evaluateArmyHQGathering } from '../combat/army_hq_gathering.js';
import {
    applyArmyDirectiveInterpretation,
    A3_PIPELINE_STEP_NAME,
} from '../combat/army_order_interpretation.js';
import {
    applyArmyCoRosterStep,
    A4_PIPELINE_STEP_NAME,
} from '../combat/army_co_roster_loader.js';
import {
    applyPoliticalDirectiveProducer,
    B1_PIPELINE_STEP_NAME,
} from '../political/political_directive_producer.js';
import {
    applyBotOpportunityDecisions,
    applyResolvedOpportunityDecisions,
    generateOpportunityProposalReviews,
    runOpportunityEvaluationStep,
} from '../combat/operation_opportunities.js';
import { snapshotPoliticalControllers } from '../combat/assert_control_events.js';
import { assertOperationLifecycle } from '../combat/assert_operation_lifecycle.js';
import { applyGuerrillaAttrition } from '../combat/guerrilla_attrition.js';
import { cleanupExpiredEventModifiers } from '../events/active_modifiers.js';
import { attributeOperationCasualties } from '../combat/operation_casualty_attribution.js';
import { recordOperationWeeklyEntries } from '../combat/operation_aar.js';
import { buildAdjacencyMap } from '../../map/adjacency_map.js';
import { computeFrontEdges, computeFrontEdgesOsid } from '../../map/front_edges.js';
import { computeFrontRegions } from '../../map/front_regions.js';
import { loadSettlementGraph } from '../../map/settlements.js';
import { loadTerrainScalars } from '../../map/terrain_scalars_node.js';
import { backfillFormationLocationOsid, computeOsidPopulation, loadOperationalCentroids, loadOperationalData, loadOperationalEdges } from '../../data/operational_data.js';
import { loadSettlementEthnicityData } from '../../data/settlement_ethnicity.js';
import { buildSidToMunFromSettlements, buildOsidToMunFromReverseMap } from '../../scenario/oob_early_war_entry.js';
import { updateCapabilityProfiles } from '../../state/capability_progression.js';
import { computeDimensionBaseValues, applyDimensionShift } from '../events/strategic_dimensions.js';
import { relieveOfficer, recordPresidentialOverride } from '../combat/order_interpretation.js';
import { clamp } from '../../utils/math.js';
import { updateDisplacement } from '../../state/displacement.js';
import { processDisplacementTakeover } from '../../state/displacement_takeover.js';
import { getDoctrineTempoMultiplier, updateDoctrineState } from '../../state/doctrine.js';
import { updateEmbargoProfiles } from '../../state/embargo.js';
import { updateEnclaveIntegrity, computeEnclaveResilienceFallbackPressure } from '../../state/enclave_integrity.js';
import { accumulateExhaustion } from '../../state/exhaustion.js';
import { applyFatigueRecovery, updateFormationFatigue } from '../../state/formation_fatigue.js';
import { deriveMunicipalityAuthorityMap, updateFormationLifecycle } from '../../state/formation_lifecycle.js';
import { normalizeFrontPosture } from '../../state/front_posture.js';
import { applyFormationCommitment } from '../../state/front_posture_commitment.js';
import { expandRegionPostureToEdges } from '../../state/front_posture_regions.js';
import { accumulateFrontPressure } from '../../state/front_pressure.js';
import { syncFrontSegments } from '../../state/front_segments.js';
import { GameState, type FactionId, type FormationId, type FormationState, type LegacyBrigadeAoRState, type EffectivePostureExposureState, type AuthoredOpDef, type OperationAxis, type CorpsOperation, type CorpsCommandState } from '../../state/game_state.js';
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
import { ensureRbihHrhbState, updateAllianceValue, countBilateralFlips, countTerritorialIncidents } from '../early_war/alliance_update.js';
import { checkAndApplyCeasefire } from '../early_war/bilateral_ceasefire.js';
import { buildSettlementsByMun } from '../early_war/control_strain.js';
import { applyCasualtyPoolExhaustion } from '../early_war/pool_population.js';
import { checkAndApplyWashington } from '../early_war/washington_agreement.js';
import { updateMixedMunicipalitiesList } from '../early_war/mixed_municipality.js';
import { checkAndApplyOperationStorm } from '../combat/operation_storm.js';
import { tickHvIntegration } from '../combat/hv_integration.js';
import { runCohesionDrift } from '../combat/cohesion_drift.js';
import { runMoraleDrift } from '../combat/morale_drift.js';
import { runOngoingMobilization } from '../combat/ongoing_mobilization.js';
import { applyPoolWarWearinessDecay } from '../combat/pool_decay.js';
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
import { buildCorpsFrontSectors, assignBrigadesToSubSegments, REASSIGNMENT_ENTRENCHMENT_RETAIN } from '../combat/corps_front_sectors.js';
import { ENABLE_TG_OG_PROMOTION } from '../combat/tactical_group_config.js';
import { applyOgPromotions, projectPromotionDisplayNames } from '../combat/tactical_group_promotion.js';
import { distributeBrigadesToFront } from '../combat/brigade_front_distribution.js';
import { correctMarchOrders, correctTransitStates } from '../combat/commander_march_correction.js';
import { evaluateHomeReturn } from '../combat/brigade_home_return.js';
import { applyFrontlineAttrition } from '../combat/frontline_attrition.js';
import { advanceSectorOffensives, updateSectorOffensiveResults, reevaluateWeakenedOperations } from '../combat/sector_offensive.js';
import { buildStaticOsidAdjacency } from '../combat/sector_offensive_launch_helpers.js';
// LANE-2026-05-02: estimateForceRatio defender-modifier integration — terrain cache for advance-sector-offensives
import { buildTerrainCache } from '../combat/combat_predictor.js';
import { processJnaWithdrawals, spawnJnaPhantomBrigades } from '../combat/jna_phantom_brigades.js';
import { injectQueuedOperation } from '../combat/pre_planned_operations.js';
import { isSlot0AvailableForQueue, hasAvailableSlot, getAvailableBrigades, buildCorpsOperation, findBrigadeOperationAnywhere, removeOperation } from '../combat/corps_operation_helpers.js';
import { validateOpAtInjection, hasBlockingOpInjectionWarnings } from '../combat/operation_validation.js';
import { createSingleAxis } from '../combat/sector_offensive_axis_helpers.js';
import { getCorpsSubordinates } from '../combat/bot_corps_helpers.js';
import { assignOperationCommander, releaseOperationCommander, releaseTacticalCommander } from '../combat/officer_system.js';
import { isEligibleOperationFormation } from '../../state/formation_constants.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { checkTriggeredOperations, injectArmyHqOperations } from '../combat/triggered_operations.js';
import { computeMilitiaGarrisons } from '../combat/militia_garrison.js';
import { activateOGs, updateOGLifecycle } from '../combat/operational_groups.js';
import { deriveSectorIntel } from '../combat/sector_intel.js';
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
import type { Osid } from '../combat/osid_adjacency.js';
import { generateArmyReserveRequests, evaluateArmyReserveAssignments, tickEliteLoans } from '../combat/army_reserve_system.js';
import { buildHomeDistanceCache } from '../combat/home_distance.js';
import { computeSectorCombatRatings } from '../combat/sector_combat_rating.js';
import { detectParamilitaryTargets, advanceParamilitaries, detectOffensiveParamilitaryTargets } from '../combat/paramilitary_sweep.js';
import { updateStrandedBrigadeLifecycle } from '../combat/stranded_brigade_lifecycle.js';
import {
    PARAMILITARY_FADE_WEEK,
    OFFENSIVE_PARA_FADE_WEEK,
    VRS_EQUIPMENT_DECAY_FLOOR,
    VRS_EQUIPMENT_DECAY_START_WEEK
} from '../../state/formation_constants.js';
import { generateLevel1StanceProposals, generateLevel1OpProposals } from '../ai_commander/proposal_generation.js';
import { generateCorpsStanceOrders } from '../combat/bot_corps_stance.js';
import { accrueRecruitmentResources, runOngoingRecruitment } from '../recruitment_turn.js';
import { reroutePoolSurplus } from '../recruitment_engine.js';
import { computeHomeDefenseActive } from '../compute_home_defense.js';
import { createBotOrderDiagnosticsSnapshot } from '../../scenario/combat_causality.js';
import { warPhaseReconciliationSteps } from './war_phase_reconciliation_steps.js';
import { warPhaseNegotiationSteps } from './war_phase_negotiation_steps.js';
import { warPhaseBriefingSteps } from './war_phase_briefing_steps.js';
import { reconcileFinalOperationTruth } from '../combat/final_operation_truth_reconciliation.js';

// --- Pipeline infrastructure imports ---
import type { NamedPhase, TurnContext, TurnReport } from '../turn_pipeline_types.js';
import { setPoliticalControlSnapshot, setAllianceAtTurnStart, getAllianceAtTurnStart } from '../turn_pipeline_types.js';
import {
    getOperationalData,
    setOperationalData,
    getGraphAndEdges,
    getSiegeStateCache,
    setSiegeStateCache,
    getSpatialContextCache,
    setSpatialContextCache,
    loadRecruitmentCatalog,
    missingSettlementEdges
} from '../turn_pipeline_types.js';
import { computeSpatialContext } from '../spatial_context.js';
import type { EffectivePostureState } from '../../state/front_posture_commitment.js';
import type { EffectivePressureEdge } from '../pressure/phase3a_pressure_eligibility.js';

interface WarPhaseContextExtensions {
    effectivePosture?: Record<FactionId, EffectivePostureState>;
    phase3aEffectiveEdges?: EffectivePressureEdge[];
}

/** Attack floor for player-authored ops — mirrors MIN_OPERATION_PARTICIPANTS in
 *  pre_planned_operations.ts / triggered_operations.ts (kept as a local const because
 *  the engine constant is not exported). */
const AUTHORED_OP_MIN_PARTICIPANTS = 2;

/**
 * Consume player-authored operations staged on cc.pending_authored_op (Free War
 * Phase 4, #67). Single owner of the inject-authored-operations step.
 *
 * DETERMINISM EARLY-OUT: returns with ZERO mutation when no corps has a
 * pending_authored_op. pending_authored_op is OPTIONAL and never set in
 * headless/historical runs → byte-identical baselines.
 *
 * Per corps (sorted strictCompare):
 *  1. Pre-filter def.participating_brigades: keep only brigades that belong to this
 *     corps (getCorpsSubordinates), are eligible (isEligibleOperationFormation), and
 *     are not already committed to another active op (getAvailableBrigades) — injection
 *     has no native double-commit guard, so this is the guard.
 *  2. Build axes: prefer def.axes (re-filtered to surviving brigades); else a single
 *     axis from def.objectives + surviving brigades.
 *  3. Validate via validateOpAtInjection (blocking errors reject) + attack floor
 *     (AUTHORED_OP_MIN_PARTICIPANTS) + free slot (hasAvailableSlot).
 *  4. If valid: buildCorpsOperation(isPrePlanned=false) → push → assignOperationCommander
 *     → tag authored_by_player. If invalid: record authored_op_rejection, inject nothing.
 *  5. ALWAYS clear cc.pending_authored_op (consumed-once).
 */
function injectAuthoredOperations(state: GameState): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;

    // DETERMINISM GATE — early-out with zero mutation if nothing is staged.
    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    if (!corpsIds.some((id) => corpsCommand[id]?.pending_authored_op)) return;

    const formations = state.military.formations ?? {};
    const turn = state.meta?.turn ?? 0;

    for (const corpsId of corpsIds) {
        const cmd = corpsCommand[corpsId];
        const staged = cmd?.pending_authored_op;
        if (!cmd || !staged) continue;

        // Consumed-once: clear the staged field regardless of outcome.
        cmd.pending_authored_op = undefined;

        const def: AuthoredOpDef = staged.def;
        const opName = typeof def.name === 'string' ? def.name : 'Authored Operation';
        const reject = (reason: string): void => {
            cmd.authored_op_rejection = { op_name: opName, reason, turn };
        };

        const corpsFaction = formations[corpsId]?.faction;
        if (!corpsFaction) { reject('corps_not_found'); continue; }

        // 1. Pre-filter participants — membership + eligibility + double-commit guard.
        const corpsBrigadeIds = new Set(
            getCorpsSubordinates(state, corpsId).map((f) => f.id),
        );
        // getAvailableBrigades only inspects THIS corps's active_operations. Joint/
        // triggered ops store their full brigade list under the PRIMARY corps even
        // when they draw brigades from another corps, so a brigade committed as a
        // secondary-axis participant in another corps's op would pass this local
        // check. Pair it with the state-wide findBrigadeOperationAnywhere lookup so
        // the guard searches ALL corps' active operations (prevents cross-corps
        // double-commit).
        const available = new Set(
            getAvailableBrigades(cmd, [...corpsBrigadeIds]),
        );
        const requested = Array.isArray(def.participating_brigades) ? def.participating_brigades : [];
        const survivors = [...new Set(requested)]
            .filter((bid) => {
                if (!corpsBrigadeIds.has(bid)) return false;           // must belong to this corps
                if (!available.has(bid)) return false;                  // not committed in own corps
                if (findBrigadeOperationAnywhere(state, bid)) return false; // not committed in ANY corps
                const f = formations[bid];
                return !!f && isEligibleOperationFormation(f);           // brigade-only, active
            })
            .sort(strictCompare);

        if (survivors.length < AUTHORED_OP_MIN_PARTICIPANTS) {
            reject('participants_below_attack_floor');
            continue;
        }

        // 2. Build axes from surviving brigades.
        const survivorSet = new Set(survivors);
        let axes: OperationAxis[];
        if (Array.isArray(def.axes) && def.axes.length > 0) {
            axes = [];
            for (const axisDef of def.axes) {
                const axisBrigades = (axisDef.assigned_brigades ?? [])
                    .filter((bid) => survivorSet.has(bid))
                    .sort(strictCompare);
                const axisObjectives = Array.isArray(axisDef.objectives) ? [...axisDef.objectives] : [];
                if (axisBrigades.length === 0 || axisObjectives.length === 0) continue;
                axes.push(createSingleAxis(axisBrigades, axisObjectives, axisDef.staging_osid ?? def.staging_osid, formations));
            }
        } else {
            const objectives = Array.isArray(def.objectives) ? [...def.objectives] : [];
            axes = objectives.length > 0
                ? [createSingleAxis(survivors, objectives, def.staging_osid, formations)]
                : [];
        }

        if (axes.length === 0) { reject('op_empty'); continue; }

        // 3a. Validate at injection (objective ownership, axis-empty, op-empty, overlap).
        const warnings = validateOpAtInjection(
            {
                name: opName,
                faction: corpsFaction,
                axes: axes.map((a) => ({ axis_id: a.axis_id, brigades: a.assigned_brigades, objectives: a.objectives, staging_osid: a.staging_osid })),
                staging_osid: def.staging_osid ?? '',
            },
            state,
            undefined,
            cmd,
        );
        if (hasBlockingOpInjectionWarnings(warnings)) {
            const blocker = warnings.find((w) => w.severity === 'error');
            reject(blocker?.check ?? 'validation_failed');
            continue;
        }

        // 3b. Attack floor on surviving axis participants.
        const axisParticipants = [...new Set(axes.flatMap((a) => a.assigned_brigades))];
        if (axisParticipants.length < AUTHORED_OP_MIN_PARTICIPANTS) {
            reject('participants_below_attack_floor');
            continue;
        }

        // 3c. Free operation slot required (slots scale with active brigade count).
        if (!hasAvailableSlot(cmd, corpsBrigadeIds.size)) {
            reject('no_available_slot');
            continue;
        }

        // 4. Build the canon CorpsOperation (isPrePlanned=false — does NOT occupy slot 0).
        const op: CorpsOperation = buildCorpsOperation(
            {
                name: opName,
                planning_duration: def.planning_duration,
                staging_osid: def.staging_osid ?? '',
                ...(def.min_attack_outcome ? { min_attack_outcome: def.min_attack_outcome } : {}),
            },
            axes,
            axisParticipants,
            turn,
            false,
            typeof def.sector_id === 'string' ? def.sector_id : undefined,
        );
        op.type = def.type ?? 'sector_attack';
        op.authored_by_player = true;
        if (typeof def.tempo === 'string') op.tempo = def.tempo;
        if (typeof def.schwerpunkt_osid === 'string') op.schwerpunkt_osid = def.schwerpunkt_osid;
        if (def.artillery_preparation === true) op.artillery_preparation = true;
        if (Array.isArray(def.target_settlements) && def.target_settlements.length > 0) {
            op.target_settlements = [...def.target_settlements];
        }

        cmd.active_operations.push(op);
        assignOperationCommander(state, op, corpsId, corpsFaction);
        cmd.stance = 'offensive';
        // Clear any prior rejection on successful injection.
        cmd.authored_op_rejection = undefined;
    }
}

/**
 * Apply player STOP-OP halts staged on cc.pending_op_halt (Presidential Command
 * Model slice 1/N). Single owner of the apply-op-halts step.
 *
 * DETERMINISM EARLY-OUT: returns with ZERO mutation when no corps has a
 * pending_op_halt. pending_op_halt is OPTIONAL and never set in headless/historical
 * runs → byte-identical baselines by construction.
 *
 * Per corps (sorted strictCompare), for each staged halt:
 *  1. Find the matching LIVE op in active_operations (by op_id first, then op_name).
 *  2. If found: release its commander (releaseOperationCommander), release the TG
 *     tactical_commander too when the op carries tg_commander_officer_id
 *     (releaseTacticalCommander) — otherwise that officer is left active/assigned to a
 *     removed op — then remove it via the canonical clean-removal path (removeOperation)
 *     — the SAME path completion and attrition-abort use (corps_command.ts:268-269,
 *     sector_offensive.ts).
 *     Brigades are released implicitly by op-membership recompute (getAvailableBrigades);
 *     the op object is dropped wholesale, so no dangling axis/op-id refs remain.
 *  3. Append a halted_op_record (op_name + turn) for the UI / follow-up consequence.
 *  4. ALWAYS clear cc.pending_op_halt (consumed-once), even if no live op matched.
 *
 * MECHANICAL ONLY: no dimension/consequence effects (patron_confidence etc.) are
 * wired here — that is a deliberate FOLLOW-UP, not this slice.
 */
function applyOpHalts(state: GameState): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;

    // DETERMINISM GATE — early-out with zero mutation if nothing is staged.
    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    if (!corpsIds.some((id) => corpsCommand[id]?.pending_op_halt)) return;

    const turn = state.meta?.turn ?? 0;

    for (const corpsId of corpsIds) {
        const cmd = corpsCommand[corpsId];
        const staged = cmd?.pending_op_halt;
        if (!cmd || !staged) continue;

        // Consumed-once: clear the staged field regardless of outcome.
        cmd.pending_op_halt = undefined;

        // Match the LIVE op by name — `name` is the canonical CorpsOperation identifier
        // (CorpsOperation has no `id` field; op_halt.cjs records op_name from it). The
        // staged op_id is informational only.
        const ops = Array.isArray(cmd.active_operations) ? cmd.active_operations : [];
        const op = staged.op_name ? ops.find((o) => o.name === staged.op_name) : undefined;

        if (op) {
            // Canonical clean-removal path (mirrors op completion / attrition abort):
            // release the officer back to reserve, then drop the op from active_operations.
            releaseOperationCommander(state, op);
            // TG ops also carry a tactical_commander (tg_commander_officer_id); release it
            // too or the TG officer is left active/assigned to a removed op and unavailable
            // for future TG assignments. releaseTacticalCommander is a no-op when unset.
            if (op.tg_commander_officer_id) releaseTacticalCommander(state, op);
            removeOperation(cmd, op);

            // Append the halt record (op_name + turn) for the UI / follow-up consequence.
            const record = { op_name: op.name ?? staged.op_name ?? 'Operation', turn };
            if (Array.isArray(cmd.halted_op_record)) cmd.halted_op_record.push(record);
            else cmd.halted_op_record = [record];
        }
    }
}

/**
 * Cohesion cost of a presidential CO sacking, applied to the faction's
 * internal_cohesion dimension via applyDimensionShift (a persistent event_modifier
 * delta that SURVIVES the per-turn compute-dimension-bases recompute — that step only
 * rewrites base_value, never event_modifier). Sacking a serving commander mid-war
 * rattles the chain of command; the cost is observable across turns. */
const CO_REPLACEMENT_COHESION_COST = -4;

/**
 * Apply player REPLACE-CO orders staged on cc.pending_co_replacement (Presidential
 * Command Model slice 3/N). Single owner of the apply-co-replacements step.
 *
 * DETERMINISM EARLY-OUT: returns with ZERO mutation when no corps has a
 * pending_co_replacement. pending_co_replacement is OPTIONAL and never set in
 * headless/historical runs → byte-identical baselines by construction.
 *
 * Per corps (sorted strictCompare), for each staged replacement:
 *  1. Find the corps's CURRENT named CO (active + assigned). If none, clear and skip
 *     (the staging guard already required one, but the engine is defensive).
 *  2. REUSE relieveOfficer(state, currentCoId, corpsId): retires the CO, installs the
 *     reserve/acting replacement for RELIEF_ACTING_DURATION, emits officer_relieved,
 *     returns { morale_hit, replacement_officer_id }.
 *  3. Apply the returned morale hit to the corps's active brigades (relieveOfficer
 *     documents this as the caller's job — TODO in order_interpretation.ts).
 *  4. Apply the internal_cohesion cost via applyDimensionShift (persistent, observable).
 *  5. Append a co_replacement_record (relieved + replacement + turn).
 *  6. ALWAYS clear cc.pending_co_replacement (consumed-once).
 *
 * Faction asymmetry (RS officer-corps revolt risk) is NOT hardcoded here: it emerges
 * downstream from the successor's roster `stubbornness` flowing through
 * proposeAutonomousArmyLaunch — this step only installs the successor.
 */
function applyCoReplacements(state: GameState): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;

    // DETERMINISM GATE — early-out with zero mutation if nothing is staged.
    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    if (!corpsIds.some((id) => corpsCommand[id]?.pending_co_replacement)) return;

    const turn = state.meta?.turn ?? 0;
    const officers = state.military.named_officers;
    const dims = state.military.negotiation?.strategic_dimensions;
    const formations = state.military.formations ?? {};

    for (const corpsId of corpsIds) {
        const cmd = corpsCommand[corpsId];
        const staged = cmd?.pending_co_replacement;
        if (!cmd || !staged) continue;

        // Consumed-once: clear the staged field regardless of outcome.
        cmd.pending_co_replacement = undefined;

        // Resolve the CURRENT CO (active + assigned to this corps). Defensive: skip if
        // none (e.g. the CO was relieved by another path between staging and apply).
        let currentCoId: string | null = null;
        let coFaction: FactionId | null = null;
        if (officers) {
            for (const id of Object.keys(officers).sort(strictCompare)) {
                const os = officers[id];
                if (os && os.status === 'active' && os.assigned_corps_id === corpsId) {
                    currentCoId = id;
                    break;
                }
            }
        }
        if (!currentCoId) continue;

        const coData = state.military.named_officer_data?.find((o) => o.id === currentCoId);
        coFaction = coData ? coData.faction : (formations[corpsId]?.faction ?? null);

        // REUSE the orphan relief helper: retires the CO, installs the staged/auto
        // replacement, emits officer_relieved, returns the morale hit.
        const relief = relieveOfficer(state, currentCoId, corpsId);

        // Apply the returned morale hit to this corps's active brigades (relieveOfficer
        // documents this as the caller's responsibility). getCorpsSubordinates returns the
        // active brigades whose corps_id is this corps (sorted, deterministic).
        if (relief.morale_hit !== 0) {
            for (const brigade of getCorpsSubordinates(state, corpsId)) {
                if (typeof brigade.morale === 'number') {
                    brigade.morale = clamp(brigade.morale + relief.morale_hit, 0, 100);
                }
            }
        }

        // Cohesion cost — persistent internal_cohesion event_modifier (observable across
        // turns; the compute-dimension-bases recompute preserves event_modifier).
        if (dims && coFaction) {
            applyDimensionShift(dims, coFaction, 'internal_cohesion', CO_REPLACEMENT_COHESION_COST);
        }

        // Append the replacement record for the UI / follow-up consequence.
        const record = {
            relieved_officer_id: relief.relieved_officer_id,
            replacement_officer_id: relief.replacement_officer_id,
            turn,
        };
        if (Array.isArray(cmd.co_replacement_record)) cmd.co_replacement_record.push(record);
        else cmd.co_replacement_record = [record];
    }
}

/**
 * Result of planning a presidential REQUEST-OP directive into a candidate operation.
 * A `rejected` plan carries the reason code (mirrors op_directive_rejection.reason);
 * an `ok` plan carries everything needed to BUILD the op — but produces NO mutation.
 *
 * Shared by:
 *  - `injectOpDirectives` (the consume step — mutates state from an `ok` plan), and
 *  - `queryDirectiveObjection` (the read-only objection query — runs the same
 *    auto-selection on a deserialized-fresh state, never mutating).
 */
export type DirectivePlanResult =
    | { ok: false; reason: string }
    | {
          ok: true;
          corpsFaction: FactionId;
          participants: FormationId[];
          stagingOsid: string;
          axes: OperationAxis[];
          opName: string;
          /** Count of corps subordinate brigades — used for slot-availability accounting. */
          corpsBrigadeCount: number;
      };

/**
 * PURE auto-selection + axis-build for a presidential REQUEST-OP directive — the
 * commander's force-selection logic factored out of `injectOpDirectives` so it can be
 * run WITHOUT mutating state (the pre-commit objection predictor needs a candidate
 * plan; the staged directive only carries a target OSID).
 *
 * Identical selection to the consume path (`injectOpDirectives`):
 *  1. AUTO-SELECT participant brigades: this corps's subordinates (getCorpsSubordinates)
 *     that are available in their own corps (getAvailableBrigades), not committed in ANY
 *     corps (findBrigadeOperationAnywhere), and eligible (isEligibleOperationFormation).
 *     Require ≥ AUTHORED_OP_MIN_PARTICIPANTS.
 *  2. BUILD a reachable axis toward target_osid: the smallest FRIENDLY OSID adjacent to
 *     the target (controller === corps faction) as staging (deterministic).
 *  3. Validate via validateOpAtInjection (blocking errors reject).
 *
 * Returns a discriminated plan; NEVER mutates `state` or `cmd`. The mutation (push op,
 * assign commander, set stance, clear staged field) lives ONLY in the consume step so
 * `injectOpDirectives`' behavior is unchanged.
 */
export function planDirectiveOperation(
    state: GameState,
    cmd: CorpsCommandState,
    corpsId: string,
    targetOsid: string,
    adjacency: Map<string, string[]> | undefined,
): DirectivePlanResult {
    const formations = state.military.formations ?? {};

    const corpsFaction = formations[corpsId]?.faction;
    if (!corpsFaction) return { ok: false, reason: 'corps_not_found' };

    // Objective must be enemy-held — directing at a friendly/own OSID is a no-op.
    const targetController = getPoliticalControllerOSID(state, targetOsid, undefined);
    if (targetController === null) return { ok: false, reason: 'objective_uncontrolled' };
    if (targetController === corpsFaction) return { ok: false, reason: 'objective_already_owned' };

    // 1. AUTO-SELECT the force — the commander picks brigades, not the president.
    //    Eligible + available in own corps + not committed anywhere.
    const corpsBrigadeIds = new Set(
        getCorpsSubordinates(state, corpsId).map((f) => f.id),
    );
    const available = new Set(getAvailableBrigades(cmd, [...corpsBrigadeIds]));
    const participants = [...corpsBrigadeIds]
        .filter((bid) => {
            if (!available.has(bid)) return false;                       // free in own corps
            if (findBrigadeOperationAnywhere(state, bid)) return false;   // not committed in ANY corps
            const f = formations[bid];
            return !!f && isEligibleOperationFormation(f);                // brigade-only, active
        })
        .sort(strictCompare);

    if (participants.length < AUTHORED_OP_MIN_PARTICIPANTS) {
        return { ok: false, reason: 'no_available_force' };
    }

    // 2. BUILD the axis — find a FRIENDLY OSID adjacent to the target through the
    //    static adjacency graph. That neighbor is the staging zone; the target is the
    //    single objective. Smallest friendly neighbor (deterministic). With no
    //    adjacency graph available we cannot prove reachability → reject.
    if (!adjacency) return { ok: false, reason: 'no_adjacency' };
    const neighbors = adjacency.get(targetOsid) ?? [];
    const stagingOsid = [...neighbors]
        .filter((n) => getPoliticalControllerOSID(state, n, undefined) === corpsFaction)
        .sort(strictCompare)[0];
    if (!stagingOsid) return { ok: false, reason: 'objective_unreachable' };

    const axes: OperationAxis[] = [createSingleAxis(participants, [targetOsid], stagingOsid, formations)];

    // 3. Validate WITH adjacency so staging_adjacency / all_objectives_owned are enforced.
    const opName = `Presidential Directive — ${targetOsid}`;
    const warnings = validateOpAtInjection(
        {
            name: opName,
            faction: corpsFaction,
            axes: axes.map((a) => ({ axis_id: a.axis_id, brigades: a.assigned_brigades, objectives: a.objectives, staging_osid: a.staging_osid })),
            staging_osid: stagingOsid,
        },
        state,
        adjacency,
        cmd,
    );
    if (hasBlockingOpInjectionWarnings(warnings)) {
        const blocker = warnings.find((w) => w.severity === 'error');
        return { ok: false, reason: blocker?.check ?? 'validation_failed' };
    }

    return {
        ok: true,
        corpsFaction,
        participants,
        stagingOsid,
        axes,
        opName,
        corpsBrigadeCount: corpsBrigadeIds.size,
    };
}

/**
 * Consume player REQUEST-OP directives staged on cc.pending_op_directive (Presidential
 * Command Model slice 2/N). Single owner of the inject-op-directive step.
 *
 * The president names ONLY a target OSID. This step builds the operation the way a
 * commander would — auto-selecting the force and an axis/staging toward the target via
 * the shared pure `planDirectiveOperation` helper. The president does NOT pick brigades
 * or axes.
 *
 * DETERMINISM EARLY-OUT: returns with ZERO mutation when no corps has a
 * pending_op_directive. pending_op_directive is OPTIONAL and never set in
 * headless/historical runs → byte-identical baselines by construction.
 *
 * Per corps (sorted strictCompare):
 *  1-3. Plan the candidate op via planDirectiveOperation (auto-select force +
 *     reachable axis + injection-validate). On a rejected plan, record
 *     op_directive_rejection and inject nothing.
 *  3b. Free operation slot required (hasAvailableSlot).
 *  4. buildCorpsOperation(isPrePlanned=false) → push → assignOperationCommander →
 *     tag requested_by_president (+ was_force_launched / commander_assessment_at_launch
 *     when forced_over_objection) → record the presidential override on the CO.
 *  5. ALWAYS clear cc.pending_op_directive (consumed-once).
 */
function injectOpDirectives(state: GameState, adjacency?: Map<string, string[]>): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;

    // DETERMINISM GATE — early-out with zero mutation if nothing is staged.
    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    if (!corpsIds.some((id) => corpsCommand[id]?.pending_op_directive)) return;

    const turn = state.meta?.turn ?? 0;

    for (const corpsId of corpsIds) {
        const cmd = corpsCommand[corpsId];
        const staged = cmd?.pending_op_directive;
        if (!cmd || !staged) continue;

        // Consumed-once: clear the staged field regardless of outcome.
        const forcedOverObjection = staged.forced_over_objection === true;
        cmd.pending_op_directive = undefined;

        const targetOsid = staged.target_osid;
        const reject = (reason: string): void => {
            cmd.op_directive_rejection = { target_osid: targetOsid, reason, turn };
        };

        const plan = planDirectiveOperation(state, cmd, corpsId, targetOsid, adjacency);
        if (!plan.ok) { reject(plan.reason); continue; }

        // 3b. Free operation slot required (slots scale with active brigade count).
        if (!hasAvailableSlot(cmd, plan.corpsBrigadeCount)) {
            reject('no_available_slot');
            continue;
        }

        // 4. Build the canon CorpsOperation (isPrePlanned=false — does NOT occupy slot 0).
        const op: CorpsOperation = buildCorpsOperation(
            { name: plan.opName, staging_osid: plan.stagingOsid },
            plan.axes,
            plan.participants,
            turn,
            false,
            undefined,
        );
        op.type = 'sector_attack';
        op.requested_by_president = true;

        // When the president FORCED this op past a shown commander objection, tag it for
        // the existing badge/strain/receipt surfaces (command_strain.ts deriveOperationOutcomeCategory
        // reads was_force_launched; consequenceReceipts.ts reads commander_assessment_at_launch).
        // The objection that was overridden was a no-go ('postpone'/'abort'), so snapshot
        // a no-go assessment — abort is the strongest framing the predictor produces.
        if (forcedOverObjection) {
            op.was_force_launched = true;
            op.commander_assessment_at_launch = 'abort';
        }

        cmd.active_operations.push(op);
        assignOperationCommander(state, op, corpsId, plan.corpsFaction);
        cmd.stance = 'offensive';
        // Clear any prior rejection on successful injection.
        cmd.op_directive_rejection = undefined;

        // The CO was warned and overridden — bump override tracking + cow on threshold.
        if (forcedOverObjection) {
            recordPresidentialOverride(state, corpsId, turn);
        }
    }
}

function getRoutineEquipmentOperationalFloor(state: GameState, formation: FormationState, turn: number): number {
    if (formation.faction !== 'RS') return 0;
    const timelineDecay = state.military.war_timeline?.equipment_decay?.find(c => c.faction === 'RS');
    const startWeek = timelineDecay?.start_week ?? VRS_EQUIPMENT_DECAY_START_WEEK;
    if (turn < startWeek) return 0;
    return timelineDecay?.floor ?? VRS_EQUIPMENT_DECAY_FLOOR;
}

export function selectBotBrigadeOrderFactions(state: GameState): FactionId[] {
    const playerFaction = state.meta.headless_scenario_auto_control
        ? null
        : state.meta.player_faction ?? null;
    return (state.factions ?? [])
        .map(f => f.id)
        .filter((fid): fid is FactionId => playerFaction == null || fid !== playerFaction)
        .sort(strictCompare);
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
        // Issue #13 zone posture inertia: capture alliance value BEFORE
        // evaluate-events so mid-turn alliance breaks don't instantly flip
        // HVO/ARBiH enclaves to besieged. Spatial-context recomputes later
        // in the turn read this snapshot instead of the live alliance value,
        // giving the commander loop one turn of posture inertia to commit
        // surplus brigades to ops against a newly-hostile former ally before
        // enclave geometry collapses.
        name: 'snapshot-alliance-at-turn-start',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            setAllianceAtTurnStart(context, context.state.political.war_alliance_rbih_hrhb);
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
        // v0.9.0 Consequence System: GC expired event-driven modifiers before
        // evaluate-events writes this turn's new ones. Readers still filter by
        // expires_turn > currentTurn, so this step is strictly hygiene, not
        // correctness — no sim behavior change when arrays are empty or all
        // entries are still active.
        name: 'cleanup-expired-event-modifiers',
        run: (context) => {
            cleanupExpiredEventModifiers(context.state, context.state.meta.turn);
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
            const result = evaluateEvents(context.state, context.rng, turn, context.input.eventDefinitions, context.input.settlementEdges);
            context.report.events_fired = result.fired;
            // Graz Accords: fires at week 4 (6 May 1992), sets state.political.vienna_declaration_turn
            const grazText = checkAndFireGrazAccords(context.state);
            if (grazText) {
                result.fired.push({ id: 'graz_accords', text: grazText });
            }
        }
    },
    {
        name: 'compute-dimension-bases',
        run: (context) => {
            const neg = context.state.military.negotiation;
            if (!neg?.strategic_dimensions) return;
            for (const faction of ['RBiH', 'RS', 'HRHB'] as const) {
                computeDimensionBaseValues(neg.strategic_dimensions, context.state, faction);
            }
        }
    },
    {
        name: 'sync-front-segments',
        skipIf: [missingSettlementEdges],
        run: (context) => {
            const edges = context.input.settlementEdges;
            if (!edges) return;
            const derivedFrontEdges = computeFrontEdges(context.state, edges);
            syncFrontSegments(context.state, derivedFrontEdges);
            // In war phase, prefer OSID front edges (from previous turn's refreshFrontEdgeSnapshot)
            // for segment derivation. Canonical SID edges produce front_ids that can't be matched
            // against OSID-keyed political_controllers and brigade location_osid.
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
        // v0.9.0 Consequence System: partisan resistance drains cohesion/morale
        // from brigades stationed in active guerrilla_threat municipalities.
        // No-op when state.military.guerrilla_threats is empty (historical path).
        name: 'apply-guerrilla-attrition',
        run: (context) => {
            applyGuerrillaAttrition(context.state);
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
        name: 'compute-spatial-context-pre-combat',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.edges?.length) return;
            const pc = context.state.political.political_controllers ?? {};
            // Issue #13 zone posture inertia: use alliance captured at turn start
            // (before evaluate-events), not the live value. When an event mid-turn
            // breaks alliance, zone posture stays on the pre-break state for this
            // turn's commander loop, giving it a window to commit ops.
            // Distinguish snapshot-captured (use it as-is, even if undefined) from
            // snapshot-missing (fall back to live state).
            const allianceSnap = getAllianceAtTurnStart(context);
            const allianceForZones = allianceSnap !== undefined
                ? allianceSnap.value
                : context.state.political.war_alliance_rbih_hrhb;
            const spatial = computeSpatialContext(
                od.edges,
                pc,
                ['RBiH', 'RS', 'HRHB'],
                context.state.meta.turn ?? 0,
                'pre-combat',
                undefined,
                undefined,
                undefined,
                allianceForZones,
            );
            setSpatialContextCache(context, { preCombat: spatial });
        }
    },
    {
        name: 'update-siege-counters',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (!context.state.meta.supply_reserves_enabled) return;
            const supplyByOsid = context.report.supply_resolution?.supply_state_by_osid;
            const spatial = getSpatialContextCache(context);
            const adjacency = spatial ? spatial.preCombat.adjacency as Map<string, string[]> : undefined;
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
            const generalSupplyReserve = context.state.military.general_supply_reserve;
            const heavyMunitionsReserve = context.state.military.heavy_munitions_reserve;
            if (generalSupplyReserve && heavyMunitionsReserve) {
                for (const fid of Object.keys(income.general).sort()) {
                    generalSupplyReserve[fid] = Math.min(100,
                        (generalSupplyReserve[fid] ?? 0) + (income.general[fid] ?? 0));
                    heavyMunitionsReserve[fid] = Math.min(100,
                        (heavyMunitionsReserve[fid] ?? 0) + (income.heavy[fid] ?? 0));
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
            const colSpatial = getSpatialContextCache(context);
            const report = processOsidColumnMovement(
                context.state,
                od.edges,
                od.opData.operationalToCanonical,
                terrainData,
                colSpatial?.preCombat.adjacency,
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
            const moveSpatial = getSpatialContextCache(context);
            const report = applyBrigadeMovementOrders(context.state, od.edges, od.opData.operationalToCanonical, moveSpatial?.preCombat.adjacency);
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
            const spatial = getSpatialContextCache(context);
            context.state.military.corps_front_sectors = buildCorpsFrontSectors(
                context.state, od.edges, od.opData.operationalToCanonical, od.centroids, spatial?.preCombat
            );
        }
    },
    // Note: brigade_front_assignment survives only as a compatibility fallback.
    // Sectors are the live frontline authority, and local_fronts are no longer rebuilt
    // as runtime truth once the modern sector pipeline is available.

    {
        name: 'assign-brigades-to-subsegments',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const sectorMap = context.state.military.corps_front_sectors;
            if (!sectorMap) return;
            const sectorList = Object.values(sectorMap);
            if (sectorList.length === 0) return;
            const spatial = getSpatialContextCache(context);
            if (!spatial) return;
            const adjacency = spatial.preCombat.adjacency as Map<Osid, Osid[]>;

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
        // ADR-0006 ARBiH OG→Division promotion (identity/command-echelon re-badge; NO force
        // inflation). Flag-off: early-return before any read/write → byte-identical state.
        // Runs after sectors are (re)built + brigades assigned so the projected Division
        // display_name lands on the current turn's derived sectors. Deterministic + idempotent.
        name: 'promote-og-to-division',
        run: (context) => {
            if (!ENABLE_TG_OG_PROMOTION) return;
            if (context.state.meta.phase !== 'war') return;
            applyOgPromotions(context.state, context.state.meta.turn);
            projectPromotionDisplayNames(context.state);
        }
    },

    {
        name: 'distribute-brigades-to-front',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const sectorMap = context.state.military.corps_front_sectors;
            if (!sectorMap) return;
            const spatial = getSpatialContextCache(context);
            if (!spatial) return;
            const adjacency = spatial.preCombat.adjacency as Map<Osid, Osid[]>;
            distributeBrigadesToFront(context.state, Object.values(sectorMap), adjacency);
        }
    },

    {
        name: 'return-displaced-brigades',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const spatial = getSpatialContextCache(context);
            if (!spatial) return;
            const adjacency = spatial.preCombat.adjacency as Map<Osid, Osid[]>;
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
        name: 'offensive-paramilitary-detect',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            if ((context.state.meta?.turn ?? 0) > OFFENSIVE_PARA_FADE_WEEK) return;
            const od = getOperationalData(context);
            if (!od?.opData?.operationalToCanonical || !od?.edges?.length) return;

            const report = detectOffensiveParamilitaryTargets(
                context.state, od.edges, od.opData.operationalToCanonical
            );
            if (report.spawned.length > 0 || report.pending_player_requests > 0) {
                const existing = context.report.paramilitary_sweep as import('../combat/paramilitary_sweep.js').ParamilitarySweepReport | undefined;
                if (existing) {
                    existing.spawned.push(...report.spawned);
                    existing.pending_player_requests += report.pending_player_requests;
                } else {
                    context.report.paramilitary_sweep = report;
                }
            }
        }
    },
    {
        name: 'paramilitary-advance',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.opData?.operationalToCanonical || !od?.edges?.length) return;
            const report = advanceParamilitaries(
                context.state, od.edges, od.opData.operationalToCanonical
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
        // Spawn turn-gated phantom brigades (e.g. HV 1995 expeditionary wave that
        // arrives post-Split Agreement turn ≈ 150). Idempotent — defs already
        // spawned at scenario init or earlier turn are skipped. See
        // `docs/40_reports/proposals/20260523_HV_EXPEDITIONARY_GHOST_DESIGN.md`.
        // Runs BEFORE withdrawals each turn so a phantom can't spawn and withdraw
        // in the same turn (defensive, though spawn_turn < withdrawal_turn by author).
        name: 'phantom-brigade-spawn',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            spawnJnaPhantomBrigades(context.state);
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
        name: 'reconcile-live-operation-truth',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            reconcileFinalOperationTruth(context.state);
        }
    },
    {
        name: 'update-stranded-brigade-lifecycle',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const spatial = getSpatialContextCache(context);
            const adj = spatial?.preCombat?.adjacency;
            if (!adj) return;
            const strandedReport = updateStrandedBrigadeLifecycle(context.state, adj);
            if (strandedReport.updated > 0) {
                context.report.stranded_brigade_lifecycle = strandedReport;
            }
        }
    },
    {
        name: 'advance-sector-offensives',
        // LANE-2026-05-02: build terrain cache once per turn so estimateForceRatio
        // can honor terrain/urban/forest defender modifiers via combat_math helpers.
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const supplyByOsid = context.report.supply_resolution?.supply_state_by_osid;
            // LANE-2026-05-02: build defender terrain multiplier cache (mirrors
            // combat_predictor.buildTerrainCache call shape used elsewhere).
            let terrainMultByOsid: Record<string, number> | undefined;
            const od = getOperationalData(context);
            if (od?.opData?.operationalToCanonical) {
                let terrainData;
                try {
                    terrainData = await loadTerrainScalars();
                } catch {
                    terrainData = { by_sid: {} };
                }
                terrainMultByOsid = buildTerrainCache(od.opData.operationalToCanonical, terrainData);
            }
            const staticAdjacency = od?.edges ? buildStaticOsidAdjacency(od.edges) : undefined;
            const prepEvents = advanceSectorOffensives(context.state, supplyByOsid, terrainMultByOsid, staticAdjacency);
            if (prepEvents.length > 0) {
                context.report.preparation_events = prepEvents;
            }
        }
    },
    {
        name: 'reevaluate-weakened-operations',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            reevaluateWeakenedOperations(context.state);
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
        name: 'decay-officer-interpretation-state',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const { state } = context;
            const turn = state.meta.turn;

            // 1. Expire cowed_until_turn for officers whose cowing period has ended.
            // Iteration-order-safe: each officer is mutated independently; no cross-officer ordering dependency.
            const officers = state.military.named_officers;
            if (officers) {
                for (const [, officerState] of Object.entries(officers)) {
                    if (
                        officerState.cowed_until_turn !== undefined &&
                        turn > officerState.cowed_until_turn
                    ) {
                        delete officerState.cowed_until_turn;
                        officerState.override_count = 0;
                    }
                }
            }

            // 2. Clean stale acknowledged officer events (acknowledged + older than 8 turns).
            // NOTE: halt_delay_turns_remaining countdown stays in sector_offensive.ts (must run pre-combat).
            if (state.military.pending_officer_events) {
                state.military.pending_officer_events = state.military.pending_officer_events.filter(
                    evt => !(evt.acknowledged && evt.turn < turn - 8)
                );
            }
        }
    },
    {
        name: 'inject-queued-operations',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const cc = context.state.military.corps_command;
            if (!cc) return;
            const spatial = getSpatialContextCache(context);
            const adjacency = spatial?.preCombat.adjacency as Map<Osid, Osid[]> | undefined;
            for (const corpsId of Object.keys(cc).sort(strictCompare)) {
                const cmd = cc[corpsId];
                // Queued pre-planned ops are sequential and occupy slot 0.
                // Bot AI ops in other slots do NOT block queue injection.
                if (cmd?.queued_operations?.length && isSlot0AvailableForQueue(cmd)) {
                    injectQueuedOperation(context.state, corpsId, adjacency);
                }
            }
        }
    },
    {
        // Free War Phase 4 (#67): consume player-authored operations staged by the
        // desktop IPC handler (electron-main.cjs stage-corps-operation-order) on
        // cc.pending_authored_op. Placed adjacent to inject-queued-operations so all
        // operation injection shares one ordering neighbourhood.
        //
        // DETERMINISM GATE: if no corps has a pending_authored_op, this step performs
        // ZERO state mutation (early-out below). pending_authored_op is OPTIONAL and is
        // never set in headless/historical scenarios → byte-identical by construction.
        //
        // Flow per corps (sorted strictCompare): validate def → pre-filter participants
        // (drop already-committed brigades via getAvailableBrigades; enforce brigade↔corps
        // membership + isEligibleOperationFormation) → require free slot → build canon
        // CorpsOperation via buildCorpsOperation (isPrePlanned=false) → assignOperationCommander
        // → tag authored_by_player. ALWAYS clear pending_authored_op (consumed-once).
        name: 'inject-authored-operations',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            injectAuthoredOperations(context.state);
        }
    },
    {
        // STOP-OP presidential lever (Presidential Command Model slice 1/N): apply any
        // player halts staged by the desktop IPC handler (electron-main.cjs
        // stage-op-halt-order → op_halt.cjs) on cc.pending_op_halt. Placed immediately
        // after inject-authored-operations so all player operation-management lives in
        // one ordering neighbourhood, and BEFORE the AAR/combat steps so the halted op
        // takes effect cleanly this turn (its brigades free up before execution).
        //
        // ORDERING (#106 step-order fix): apply-op-halts runs BEFORE inject-op-directive
        // so a STOP-OP + REQUEST-OP staged on the SAME corps in one turn works — the halt
        // frees the live op's brigades/slot FIRST, then the directive can reuse them.
        // Previously inject-op-directive ran first and rejected the directive because the
        // still-live halted op's brigades/slot read as occupied. Both steps are player-only
        // early-out steps (pending_op_halt / pending_op_directive never set in headless),
        // so this reorder is byte-identical by construction.
        //
        // DETERMINISM GATE: if no corps has a pending_op_halt, this step performs ZERO
        // state mutation (early-out below). pending_op_halt is OPTIONAL and is never set
        // in headless/historical scenarios → byte-identical by construction.
        //
        // MECHANICAL ONLY: release commander → remove op via the canonical clean-removal
        // path → append halted_op_record → clear. No dimension/consequence effects
        // (patron_confidence etc.) — that is a deliberate FOLLOW-UP, not this slice.
        name: 'apply-op-halts',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            applyOpHalts(context.state);
        }
    },
    {
        // REQUEST-OP presidential lever (Presidential Command Model slice 2/N): consume
        // player directives staged by the desktop IPC handler (electron-main.cjs
        // stage-op-directive-order → op_directive_staging.cjs) on cc.pending_op_directive.
        // The president names ONLY a target OSID; this step builds the op a commander
        // would — auto-selecting the force + a reachable axis/staging toward the target.
        // Placed immediately after apply-op-halts so all player operation injection lives
        // in one ordering neighbourhood, and BEFORE the commander loop (ai-corps-decisions)
        // so the directed op is live this same turn. Runs AFTER apply-op-halts (#106) so a
        // same-turn STOP-OP frees brigades/slot the directive can reuse.
        //
        // DETERMINISM GATE: if no corps has a pending_op_directive, this step performs
        // ZERO state mutation (early-out below). pending_op_directive is OPTIONAL and is
        // never set in headless/historical scenarios → byte-identical by construction.
        //
        // Reachability uses the pre-combat adjacency graph (cached at compute-spatial-
        // context, step ~822) to pick a FRIENDLY OSID adjacent to the target as staging.
        name: 'inject-op-directive',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const spatial = getSpatialContextCache(context);
            const adjacency = spatial ? (spatial.preCombat.adjacency as Map<string, string[]>) : undefined;
            injectOpDirectives(context.state, adjacency);
        }
    },
    {
        // REPLACE-CO presidential lever (Presidential Command Model slice 3/N): apply any
        // player CO-replacement orders staged by the desktop IPC handler (electron-main.cjs
        // stage-co-replacement-order → co_replacement.cjs) on cc.pending_co_replacement.
        // Placed in the same player-lever ordering neighbourhood, and BEFORE the commander
        // loop (ai-corps-decisions) so the new CO is in command this same turn.
        //
        // DETERMINISM GATE: if no corps has a pending_co_replacement, this step performs
        // ZERO state mutation (early-out below). pending_co_replacement is OPTIONAL and is
        // never set in headless/historical scenarios → byte-identical by construction.
        //
        // REUSES relieveOfficer (retire CO → install reserve/acting replacement → emit
        // officer_relieved). Applies the returned morale hit to the corps's brigades and an
        // internal_cohesion event_modifier cost (observable across turns), records the
        // replacement, clears the staged field. RS officer-revolt asymmetry emerges
        // downstream from the successor's roster stubbornness — not hardcoded here.
        name: 'apply-co-replacements',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            applyCoReplacements(context.state);
        }
    },
    {
        // ADR-0005 v3.0: inject faction-wide Army HQ operations (Krivaja-95, Farz 95).
        // Runs AFTER inject-queued-operations and BEFORE check-triggered-
        // operations so the Army HQ path owns its promoted defs exclusively. Fully gated by
        // ENABLE_TG_ARMY_HQ_OPS — injectArmyHqOperations early-returns when the flag is off,
        // so this step is byte-identical-inert in the flag-off path.
        name: 'inject-army-hq-operations',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            injectArmyHqOperations(context.state);
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
            const spatial = getSpatialContextCache(context);
            if (!spatial) return;
            const adjacency = spatial.preCombat.adjacency as Map<Osid, Osid[]>;
            const sortedIds = Object.keys(context.state.military.formations ?? {}).sort(strictCompare);
            context.state.military.home_distance_cache = buildHomeDistanceCache(context.state.military.formations ?? {}, adjacency, sortedIds);
        }
    },
    {
        // LANE B Phase 2 (Operation Opportunity MVP): consume any prior-turn
        // OPPORTUNITY:<proposal_id> proposals that the player accepted/rejected
        // via the IPC. MUST run BEFORE apply-autonomy-transition because that
        // step GCs prior-turn proposals.
        //
        // The IPC handler (electron-main.cjs accept-proposal/reject-proposal)
        // only sets `accepted` on the proposal row; this step is the single
        // owner that translates that into a decision on the opportunity queue
        // by routing through applyOpportunityDecision -> buildCorpsOperation.
        name: 'apply-resolved-opportunity-decisions',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            applyResolvedOpportunityDecisions(context.state, context.state.meta.turn);
        },
    },
    {
        name: 'apply-autonomy-transition',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const meta = context.state.meta;
            if (meta.autonomy_level_pending !== undefined) {
                meta.autonomy_level = meta.autonomy_level_pending;
                meta.autonomy_level_pending = undefined;
            }
            meta.autonomy_overrides = undefined;
            // GC all proposals from previous turns — unresolved ones were missed by the player,
            // resolved ones have already been consumed. Current-turn proposals are not yet generated
            // at this pipeline point.
            if (meta.pending_proposal_reviews) {
                meta.pending_proposal_reviews = meta.pending_proposal_reviews.filter(
                    p => p.turn >= meta.turn
                );
            }
            // v0.8.4 Phase D: Clear per-corps player_op_response each turn so stale responses
            // from prior turns do not block or spuriously approve next-turn plans.
            const corpsCmd = context.state.military.corps_command;
            if (corpsCmd) {
                for (const corpsId of Object.keys(corpsCmd)) {
                    if (corpsCmd[corpsId].player_op_response !== undefined) {
                        corpsCmd[corpsId].player_op_response = undefined;
                    }
                    // Free War Phase 4 (#67): belt-and-suspenders GC of any stale
                    // pending_authored_op (normally consumed by inject-authored-operations
                    // earlier the same turn; clear here if it survived for any reason).
                    if (corpsCmd[corpsId].pending_authored_op !== undefined) {
                        corpsCmd[corpsId].pending_authored_op = undefined;
                    }
                    // STOP-OP (Presidential Command Model slice 1/N): belt-and-suspenders GC
                    // of any stale pending_op_halt (normally consumed by apply-op-halts earlier
                    // the same turn; clear here if it survived for any reason).
                    if (corpsCmd[corpsId].pending_op_halt !== undefined) {
                        corpsCmd[corpsId].pending_op_halt = undefined;
                    }
                    // REQUEST-OP (Presidential Command Model slice 2/N): belt-and-suspenders
                    // GC of any stale pending_op_directive (normally consumed by
                    // inject-op-directive earlier the same turn; clear here if it survived).
                    if (corpsCmd[corpsId].pending_op_directive !== undefined) {
                        corpsCmd[corpsId].pending_op_directive = undefined;
                    }
                    // REPLACE-CO (Presidential Command Model slice 3/N): belt-and-suspenders
                    // GC of any stale pending_co_replacement (normally consumed by
                    // apply-co-replacements earlier the same turn; clear here if it survived).
                    if (corpsCmd[corpsId].pending_co_replacement !== undefined) {
                        corpsCmd[corpsId].pending_co_replacement = undefined;
                    }
                }
            }
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
            const autonomyLevel = context.state.meta.autonomy_level ?? 0;
            const botFactions = (context.state.factions ?? [])
                .map((f) => f.id)
                .filter((fid: string) => {
                    if (playerFaction == null) return true;
                    if (fid === playerFaction) return autonomyLevel >= 2;
                    return true;
                });

            const results = await Promise.allSettled(
                botFactions.map(async (faction: string) => {
                    const decision = await generateArmyDecision(context.state, faction, client);
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
            const autonomyLevel = context.state.meta.autonomy_level ?? 0;
            const botFactions = (context.state.factions ?? [])
                .map((f) => f.id)
                .filter((fid: string) => {
                    if (playerFaction == null) return true;
                    if (fid === playerFaction) return autonomyLevel >= 2;
                    return true;
                });

            for (const faction of botFactions) {
                const armyDecision = context.state.military.ai_army_decisions?.[faction] ?? null;
                await generateCorpsDecisions(context.state, faction, armyDecision, client);
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
        // B1 (LANE-NIGHTSHIFT-B1-POLITICAL-DIRECTIVE-PRODUCER-INFRA):
        // Bot-side producer for the soft-state political directive that A3
        // (`apply-army-directive-interpretation`) reads from
        // `state.military.political_directives_by_faction[faction]`. Without
        // a producer, A3's `readPoliticalDirective` short-circuits every turn
        // and `interpretArmyDirective` is never invoked. B1 wires the
        // infrastructure; B2 will populate `political_leader_data` so the
        // producer transitions from always-null to actively emitting verbs.
        //
        // Position: AFTER `evaluate-army-hq-gathering` (the producer reads
        // CampaignPlan to derive `target_corps_id`) and BEFORE
        // `evaluate-army-co-transitions` (A4) / `apply-army-directive-interpretation`
        // (A3, the consumer of what we write).
        //
        // SUBSTRATE-DRIVEN: short-circuits when
        // B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED env flag is set OR
        // `state.military.political_leader_data` / `political_leaders` are
        // unpopulated. 40w byte-stable until B2 ships scenario data.
        //
        // DDR: docs/40_reports/audits/20260506_B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DDR.md
        // (941bd68e + 168d65c2). A3: c8ff93d8. A4: 93c75b1d.
        name: B1_PIPELINE_STEP_NAME,
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            applyPoliticalDirectiveProducer(context.state);
        },
    },
    {
        // A4 (LANE-NIGHTSHIFT-A4-ARMY-CO-ROSTER-PERSONALITIES):
        // Populate canonical historical roster onto NamedOfficer.stubbornness
        // and political-leader-tolerance state; evaluate scheduled transitions
        // (informational — `processOfficerSuccession` remains canonical owner of
        // the relief event); apply emergent variation rules (competence decay,
        // stubbornness escalation, cooldown halving) when an army CO is held
        // past their tenure_end_default (resolved against OOB
        // available_until_turn when the roster JSON leaves it null).
        //
        // Position: AFTER `evaluate-army-hq-gathering` (consumes the same
        // CampaignPlan context implicitly — same turn) and BEFORE
        // `apply-army-directive-interpretation` (A3 reads the populated
        // stubbornness values).
        //
        // SUBSTRATE-DRIVEN: short-circuits when the roster JSON is unavailable
        // or A4_ARMY_CO_ROSTER_DISABLED env var is set (188w A/B control run).
        //
        // DDR: docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md
        // (eee308e0). A1: 18136710. A2: ba6955bf. A3: c8ff93d8.
        name: A4_PIPELINE_STEP_NAME,
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            applyArmyCoRosterStep(context.state);
        },
    },
    {
        // A3 (LANE-NIGHTSHIFT-A3-ARMY-LEVEL-ORDER-INTERPRETATION):
        // Translate POLITICAL directives → per-corps directives via the army CO's
        // advisory interpretation; emit `army_directive_pushback` PendingOfficerEvent
        // on non-FULL compliance, plus `army_co_proposes_op` for Mladić-class
        // autonomous launches (stubbornness ≥ 4 + 12-turn cooldown).
        //
        // Position: AFTER `evaluate-army-co-transitions` (A4 populates stubbornness
        // / tolerance from the canonical roster) and BEFORE `generate-bot-corps-orders`
        // (downstream consumer of corps directives).
        //
        // SUBSTRATE-DRIVEN: pre-A4-roster-data this step short-circuits when no
        // political directive is present in state.military.political_directives_by_faction
        // and when stubbornness fields are unpopulated. 40w byte-stable until A4
        // populates the canonical roster.
        //
        // DDR: docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md
        // (eee308e0). A1: 18136710. A2: ba6955bf.
        name: A3_PIPELINE_STEP_NAME,
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            applyArmyDirectiveInterpretation(context.state);
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
            // Use canonical helper so headless_scenario_auto_control is honored.
            // Inline duplicate-filter previously skipped this flag, so RBiH (when
            // configured as player_faction) had no corps_command.commander_state
            // written across the entire run — bricking commander_confidence
            // predicates for all ARBiH catalog opportunities. See
            // docs/40_reports/audits/20260522_FORENSICS_COMMANDER_STATE_INIT.md.
            const factions = selectBotBrigadeOrderFactions(context.state);
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
            const corpsSpatial = getSpatialContextCache(context);
            const corpsAdjacency = corpsSpatial?.preCombat.adjacency;
            for (const faction of factions) {
                const supplyByOsid = context.report.supply_resolution?.supply_state_by_osid;
                generateAllCorpsOrders(context.state, faction, edges, sidToMun, reverseMap, osidEdges, supplyByOsid, corpsEthnicMap, corpsAdjacency, corpsSpatial?.preCombat);
                corpsReport.push(...extractCorpsAiReport(context.state, faction));
            }
            if (corpsReport.length > 0) {
                context.report.corps_ai_report = corpsReport;
            }
        }
    },
    {
        // v0.8.4 Phase C: Compute formula AI stance recommendations for the player faction.
        // generate-bot-corps-orders skips playerFaction — this step fills in ai_recommended_stance
        // so that generate-level1-proposals can surface meaningful proposals.
        // Runs AFTER bot corps orders so the same pass sees current sector/commander state.
        name: 'generate-player-stance-recommendations',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const playerFaction = context.state.meta.player_faction;
            if (!playerFaction) return;
            if (context.state.meta.autonomy_level !== 1) return;
            const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
            const edges = context.input.settlementEdges && context.input.settlementEdges.length > 0
                ? context.input.settlementEdges
                : graph.edges;
            const sidToMun = new Map<string, string>();
            for (const [sid, rec] of graph.settlements.entries()) {
                const munId = rec.mun1990_id ?? rec.mun_code;
                if (munId) sidToMun.set(sid, munId);
            }
            // generateCorpsStanceOrders sets ai_recommended_stance on each corps cmd
            // and respects player_ordered_stance guard (will not overwrite cmd.stance).
            generateCorpsStanceOrders(context.state, playerFaction, edges, sidToMun);
        },
    },
    {
        // v0.8.4 Phase C: Generate Level 1 Assisted stance proposals for player review.
        // Reads ai_recommended_stance set by generate-player-stance-recommendations above.
        name: 'generate-level1-proposals',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const playerFaction = context.state.meta.player_faction;
            if (!playerFaction) return;
            if (context.state.meta.autonomy_level !== 1) return;
            const proposals = generateLevel1StanceProposals(context.state, playerFaction);
            if (proposals.length === 0) return;
            if (!context.state.meta.pending_proposal_reviews) {
                context.state.meta.pending_proposal_reviews = [];
            }
            // Remove any stale proposals from this same turn (defensive guard against double-run).
            context.state.meta.pending_proposal_reviews = context.state.meta.pending_proposal_reviews
                .filter(p => p.turn !== context.state.meta.turn);
            context.state.meta.pending_proposal_reviews.push(...proposals);
        },
    },
    {
        // LANE B Phase 1 (Operation Opportunity MVP): pure deterministic evaluator
        // that surfaces / refreshes / expires operation opportunity proposals from
        // the catalog (src/sim/combat/operation_opportunities.ts).
        //
        // Phase 1 ships an empty catalog, so this step is a substrate no-op on the
        // current main. Phase 3 fills the catalog with the 5th Corps / Sana 95
        // family. Phase 2 wires the autonomy / IPC bridge that reads
        // state.military.operation_opportunities into the player review surface.
        //
        // Runs BEFORE generate-level1-op-proposals so future autonomy wiring
        // can read freshly evaluated opportunities for the same turn.
        // Runs in war phase only — peace phase has no opportunity surface.
        name: 'evaluate-operation-opportunities',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            runOpportunityEvaluationStep(context.state, context.state.meta.turn);
        },
    },
    {
        // LANE B Phase 2: bot factions decide their own opportunities synchronously
        // — they never sit in the player review queue. Player faction's opportunities
        // are skipped here and surfaced via generate-level1-opportunity-proposals
        // below (autonomy_level === 1 only).
        name: 'apply-bot-opportunity-decisions',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const playerFaction = context.state.meta.player_faction ?? null;
            applyBotOpportunityDecisions(context.state, context.state.meta.turn, playerFaction);
        },
    },
    {
        // LANE B Phase 2: surface player-faction opportunities into the autonomy
        // review queue at autonomy_level=1. Format: proposed_action =
        // "OPPORTUNITY:<proposal_id>". The accept/reject IPC marks `accepted`;
        // apply-resolved-opportunity-decisions on the next turn applies the
        // decision via applyOpportunityDecision.
        name: 'generate-level1-opportunity-proposals',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const playerFaction = context.state.meta.player_faction;
            if (!playerFaction) return;
            const reviews = generateOpportunityProposalReviews(context.state, playerFaction);
            if (reviews.length === 0) return;
            if (!context.state.meta.pending_proposal_reviews) {
                context.state.meta.pending_proposal_reviews = [];
            }
            context.state.meta.pending_proposal_reviews.push(...reviews);
        },
    },
    {
        // v0.8.4 Phase D: Generate Level 1 Assisted op-planning proposals for player review.
        // Reads commander_state.current_plan and decision_trace set by the commander loop above.
        // Appends to pending_proposal_reviews without removing stance proposals from this turn.
        name: 'generate-level1-op-proposals',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const playerFaction = context.state.meta.player_faction;
            if (!playerFaction) return;
            if (context.state.meta.autonomy_level !== 1) return;
            const proposals = generateLevel1OpProposals(context.state, playerFaction);
            if (proposals.length === 0) return;
            if (!context.state.meta.pending_proposal_reviews) {
                context.state.meta.pending_proposal_reviews = [];
            }
            context.state.meta.pending_proposal_reviews.push(...proposals);
        },
    },
    {
        name: 'commander-correct-march-orders',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const spatial = getSpatialContextCache(context);
            if (!spatial) return;
            const adjacency = spatial.preCombat.adjacency as Map<string, string[]>;
            correctMarchOrders(context.state, adjacency);
            correctTransitStates(context.state, adjacency);
        },
    },
    {
        // Recompute after bot corps orders: the commander loop rearranges,
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
            const spatial = getSpatialContextCache(context);
            if (!spatial) return;
            const adjacency = spatial.preCombat.adjacency as Map<Osid, Osid[]>;
            generateArmyReserveRequests(context.state, adjacency);
            evaluateArmyReserveAssignments(context.state, adjacency);
        }
    },
    {
        name: 'generate-bot-brigade-orders',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const factions = selectBotBrigadeOrderFactions(context.state);

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
                const spatialCache = getSpatialContextCache(context);
                const osidCtx: OsidBotContext = {
                    edges: od.edges,
                    reverseMap: od.opData.operationalToCanonical,
                    adjacency: spatialCache?.preCombat.adjacency,
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
        name: 'recover-command-authority',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const auth = context.state.military.command_authority;
            if (!auth) return;
            // Reset per-turn spend counter
            auth.spent_this_turn = 0;

            // Wave 10: CA recovery penalty for recent presidential interventions.
            // Each recent force-launched op (within 3 turns) or unresolved friction
            // event (within 2 turns) reduces recovery by 0.5, capped at full loss.
            // No UI imports — inline approximation of strain sources.
            const currentTurn = context.state.meta?.turn ?? 0;
            let recentInterventions = 0;
            const corpsCommand = context.state.military.corps_command;
            if (corpsCommand) {
                for (const corpsId of Object.keys(corpsCommand).sort()) {
                    const corps = corpsCommand[corpsId];
                    for (const op of (corps.active_operations ?? [])) {
                        if (op.was_force_launched && (currentTurn - (op.started_turn ?? currentTurn)) < 3) {
                            recentInterventions++;
                        }
                    }
                }
            }
            const unresolvedFriction = (context.state.military.friction_events ?? [])
                .filter((e: { resolved: boolean; turn: number }) => !e.resolved && (currentTurn - e.turn) < 2).length;

            const penalty = Math.min(2, (recentInterventions + unresolvedFriction) * 0.5);
            const recovery = Math.max(0, 2 - penalty);
            auth.current = Math.min(auth.max, auth.current + recovery);
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
                const operationalFloor = getRoutineEquipmentOperationalFloor(context.state, f, turn);
                degradeEquipment(f, f.posture, maintenance, operationalFloor);
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
        // ── Fall-1995 mechanic E-A3: multi-axis simultaneity penalty ──────
        // Build the turn-start cache `active_offensives_against_corps`:
        // map<defender corps FormationId, count of enemy CorpsOperations whose
        //   phase==='execution' and whose objectives include at least one OSID
        //   controlled by the defender corps's faction>.
        // Consumer: `computeDefenderPowerBreakdown` in combat_math.ts applies a
        //   multiplier (1.0× / 0.9× / 0.8× / 0.7× capped) to defender power.
        // Determinism: iterates corps_command keys via strictCompare; multiplier
        //   itself is a deterministic function of the count.
        // Byte-stability: when no corps has >1 enemy offensives against it, the
        //   cache contains only 0/1 values and combat_math gates the multiplier
        //   `if (multiplier !== 1.0)` — historical (single-offensive) path is
        //   untouched.
        // See docs/40_reports/proposals/20260523_ENGINE_SYNTHESIS_FALL_1995.md §3 E-A3.
        name: 'build-active-offensives-cache',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const corpsCommand = context.state.military.corps_command;
            const formations = context.state.military.formations ?? {};
            const pc = context.state.political.political_controllers ?? {};
            const cache: Record<string, number> = {};
            if (!corpsCommand) {
                context.state.military.active_offensives_against_corps = cache;
                return;
            }

            // Pre-build a list of "active enemy offensives": each entry is
            // {attackerFaction, objectives: string[]}. Sorted iteration of
            // corps_command keys for determinism.
            const activeOffensives: Array<{ attackerFaction: FactionId; objectives: string[] }> = [];
            const attackerCorpsIds = Object.keys(corpsCommand).sort(strictCompare);
            for (const attackerCorpsId of attackerCorpsIds) {
                const attackerCmd = corpsCommand[attackerCorpsId];
                if (!attackerCmd) continue;
                const attackerCorps = formations[attackerCorpsId];
                if (!attackerCorps) continue;
                const attackerFaction = attackerCorps.faction;
                for (const op of attackerCmd.active_operations) {
                    if (op.phase !== 'execution') continue;
                    // Treat sector_attack/general_offensive/feint as "offensive";
                    // probes are non-territorial and excluded. (Feints exert
                    // distraction pressure consistent with the E-A3 model.)
                    if (op.type === 'reorganization' || op.type === 'strategic_defense' || op.type === 'probe') continue;
                    const objectives: string[] = [];
                    if (op.objectives) for (const o of op.objectives) objectives.push(o);
                    if (op.axes) {
                        for (const axis of op.axes) {
                            if (axis.objectives) for (const o of axis.objectives) objectives.push(o);
                        }
                    }
                    if (objectives.length === 0) continue;
                    activeOffensives.push({ attackerFaction, objectives });
                }
            }

            // For each defender corps, count how many active enemy offensives
            // target at least one OSID currently controlled by that corps's faction.
            const defenderCorpsIds = Object.keys(corpsCommand).sort(strictCompare);
            for (const defenderCorpsId of defenderCorpsIds) {
                const defenderCorps = formations[defenderCorpsId];
                if (!defenderCorps) continue;
                const defenderFaction = defenderCorps.faction;
                let count = 0;
                for (const off of activeOffensives) {
                    if (off.attackerFaction === defenderFaction) continue;
                    let targetsDefender = false;
                    for (const osid of off.objectives) {
                        if (pc[osid] === defenderFaction) {
                            targetsDefender = true;
                            break;
                        }
                    }
                    if (targetsDefender) count++;
                }
                if (count > 0) cache[defenderCorpsId] = count;
            }
            context.state.military.active_offensives_against_corps = cache;
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
                const attackSpatial = getSpatialContextCache(context);
                context.report.attack_resolution_osid = resolveAttackOrdersOsid(
                    context.state,
                    od.edges,
                    od.opData.operationalToCanonical,
                    terrainData,
                    context.report.supply_resolution?.supply_state_by_osid,
                    osidPopMap,
                    ethnicComp,
                    attackSpatial?.preCombat.adjacency,
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

            // Compatibility-only SID fallback. The canonical war-phase combat
            // resolver is `resolveAttackOrdersOsid(...)` above.
            context.report.resolve_attack_orders = resolveAttackOrders(
                context.state, edges, terrainData, settlementToMun
            );
        }
    },
    {
        name: 'compute-spatial-context-post-combat',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.edges?.length) return;
            const existing = getSpatialContextCache(context);
            if (!existing) return; // pre-combat must have run
            const pc = context.state.political.political_controllers ?? {};
            // Issue #13: use turn-start alliance snapshot for posture inertia.
            // Snapshot-captured (even undefined) takes priority; fall back only if missing.
            const allianceSnap = getAllianceAtTurnStart(context);
            const allianceForZones = allianceSnap !== undefined
                ? allianceSnap.value
                : context.state.political.war_alliance_rbih_hrhb;
            const postCombat = computeSpatialContext(
                od.edges,
                pc,
                ['RBiH', 'RS', 'HRHB'],
                context.state.meta.turn ?? 0,
                'post-combat',
                undefined,
                existing.preCombat.adjacency,
                existing.preCombat.sharedBoundaryAdjacency,
                allianceForZones,
            );
            setSpatialContextCache(context, {
                preCombat: existing.preCombat,
                postCombat,
            });
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
            const displaceSpatial = getSpatialContextCache(context);
            const displaceAdj = displaceSpatial?.postCombat?.adjacency ?? displaceSpatial?.preCombat.adjacency;
            displaceFormationsInEnemyTerritory(context.state, od.edges, od.opData.operationalToCanonical, displaceAdj);
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
    // LANE-NIGHTSHIFT-SRK-SIEGE-DEFENDER-MORALE-PHASE-1 (Engine Invariants
    // v0.9.0 §6.10 + Systems Manual v0.9.0 §6.10, 2026-05-08): siege defender
    // morale drain. Runs AFTER morale-drift so the graduated siege drain
    // layers on top of the existing affinity drift; net direction is what
    // matters. Faction-symmetric — reads `state.military.siege_turn_counters`
    // (already faction-keyed). Default-off shadow flag
    // SIEGE_MORALE_DRAIN_ENABLED; diagnostic counter increments
    // unconditionally per N4 precedent.
    {
        name: 'apply-siege-morale-drain',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const { applySiegeMoraleDrain } = await import('../combat/siege_morale_drain.js');
            context.report.siege_morale_drain = applySiegeMoraleDrain(context.state);
        }
    },
    // --- Second dissolution pass: catches brigades whose morale/cohesion dropped
    // below threshold during post-combat drift (morale-drift, cohesion-drift).
    // The first pass (line ~373) runs before combat and cannot catch these.
    // This pass is additive — no change for brigades above threshold.
    {
        name: 'check-brigade-dissolution-post-combat',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const { dissolveCombatIneffectiveBrigades } = await import('../combat/brigade_dissolution.js');
            const dissolutionReport = dissolveCombatIneffectiveBrigades(context.state);
            if (dissolutionReport.dissolved_count > 0) {
                // Merge into existing dissolution report if present
                const existing = context.report.brigade_dissolution;
                if (existing) {
                    context.report.brigade_dissolution = {
                        dissolved_count: existing.dissolved_count + dissolutionReport.dissolved_count,
                        dissolved_brigades: [...existing.dissolved_brigades, ...dissolutionReport.dissolved_brigades],
                    };
                } else {
                    context.report.brigade_dissolution = dissolutionReport;
                }
            }
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
                        attacker_faction: b.attacker_faction,
                        defender_faction: b.defender_faction
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
        name: 'bilateral-flip-count-war',
        run: (context) => {
            // Issue #23 fix A: war-phase bilateral RBiH↔HRHB flip counter.
            // earlyWarPhases.bilateral-flip-count never fires in player_choice
            // mode, so without this step stalemate_turns stays at 0 forever and
            // ceasefire pre-condition C4 (>= 4 stalemate turns) is unreachable,
            // blocking Washington Agreement Path A.
            // Reads control_events (already populated by war-phase OSID flips)
            // filtered for this turn and RBiH↔HRHB transitions only.
            if (context.state.meta.phase !== 'war') return;
            const turn = context.state.meta.turn;
            const events = context.state.political.control_events ?? [];
            const flips: Array<{ mun_id: string; from_faction: FactionId | null; to_faction: FactionId }> = [];
            for (const e of events) {
                if (e.turn !== turn) continue;
                if (!e.mun_id) continue;
                if (e.to !== 'RBiH' && e.to !== 'HRHB' && e.to !== 'RS') continue;
                if (e.from !== null && e.from !== 'RBiH' && e.from !== 'HRHB' && e.from !== 'RS') continue;
                flips.push({ mun_id: e.mun_id, from_faction: e.from, to_faction: e.to });
            }
            context.report.bilateral_flip_count = countBilateralFlips(context.state, flips);
            context.report.territorial_incident_count = countTerritorialIncidents(context.state, flips);
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
                    catalog.municipality_hq_settlement,
                    opDataCache?.opData?.canonicalToOperational,
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
        name: 'pool-war-weariness-decay',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            context.report.pool_war_weariness_decay = applyPoolWarWearinessDecay(context.state);
        }
    },
    {
        name: 'reroute-pool-surplus',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const catalog = await loadRecruitmentCatalog();
            if (!catalog?.brigades?.length) return;
            const activeIds = new Set(Object.keys(context.state.military.formations ?? {}));
            for (const faction of ['HRHB', 'RBiH', 'RS'] as const) {
                const unspawnedByMun: Record<string, { faction: string; initial_personnel: number }[]> = {};
                for (const b of catalog.brigades) {
                    if (b.faction !== faction) continue;
                    if (activeIds.has(b.id)) continue;
                    const mun = b.home_mun;
                    if (!unspawnedByMun[mun]) unspawnedByMun[mun] = [];
                    unspawnedByMun[mun].push({ faction: b.faction, initial_personnel: b.initial_personnel ?? b.manpower_cost ?? 500 });
                }
                reroutePoolSurplus(context.state, faction, unspawnedByMun);
            }
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
        name: 'recall-drifted-brigades',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const spatial = getSpatialContextCache(context);
            const postCombatAdj = spatial?.postCombat?.adjacency ?? spatial?.preCombat?.adjacency;
            recallDriftedBrigades(context.state, postCombatAdj as Map<string, string[]> | undefined);
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
        name: 'sanitize-ghost-sector-power',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const sectors = context.state.military.corps_front_sectors ?? {};
            const ratings = context.state.military.sector_combat_ratings ?? {};
            for (const sid of Object.keys(sectors).sort(strictCompare)) {
                const s = sectors[sid];
                if (s.assigned_brigade_ids.length === 0 && s.reserve_brigade_ids.length === 0) {
                    s.defensive_power = 0;
                    s.density = 0;
                    s.threat_ratio = 0;
                    if (ratings[sid]) {
                        ratings[sid].offensive_power = 0;
                        ratings[sid].defensive_power = 0;
                        ratings[sid].defense_per_edge = 0;
                        ratings[sid].personnel = 0;
                        ratings[sid].morale_avg = 0;
                        ratings[sid].cohesion_avg = 0;
                        ratings[sid].fatigue_avg = 0;
                        ratings[sid].brigade_count = 0;
                        ratings[sid].strength_class = 'critical';
                    }
                }
            }
        },
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
            const spatial = getSpatialContextCache(context);
            tickEliteLoans(context.state, context.state.meta.turn, spatial?.preCombat.adjacency as Map<Osid, Osid[]> | undefined);
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
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const sarajevo = updateSarajevoState(context.state, context.report.supply_resolution?.supply_state_by_osid);
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
            // #23 phase 2: bridge enclave_resilience map into IVP rollup. The
            // primary supply-critical-component detection produces zero entries
            // despite historically-correct sieges (n10 empirical); the fallback
            // reads the hand-curated enclave_resilience map so siege humanitarian
            // pressure surfaces in IVP and constraint_severity can clear W4 (>0.55).
            const primaryPressure = context.report.enclave_integrity?.humanitarian_pressure_total ?? 0;
            const fallbackPressure = computeEnclaveResilienceFallbackPressure(context.state);
            const enclavePressure = primaryPressure + fallbackPressure;
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
    ...warPhaseReconciliationSteps,
    ...warPhaseNegotiationSteps,
    ...warPhaseBriefingSteps,
    {
        // LANE D-CONTENT (Path A): per-turn displacement_event_log retention boundary.
        //
        // The legacy log is now a per-turn buffer: appended-to during the turn,
        // consumed by per-turn-filtered readers (compile_turn_summary,
        // patron_pressure), and cleared here at end-of-turn AFTER all consumers
        // have run. The bounded humanitarian / origin-dest aggregates
        // (state.displacement.displacement_humanitarian_aggregates,
        // displacement_origin_dest_arrivals) carry the cumulative state forward,
        // since the two cumulative consumers (compute_capital,
        // brigade_reconstitution) were rebound to read from those aggregates.
        //
        // Heap impact: legacy log heap drops from O(events × turns) to
        // O(events_this_turn). Aggregates remain ≲21 KB (analytical bound).
        //
        // Streaming: if context.input.displacementEventStreamSink is provided
        // (scenario_runner wires this to displacement_event_log.jsonl), the
        // sink is invoked with this turn's events BEFORE clearing, mirroring
        // the brigade_temporal_log.jsonl pattern. Without a sink, the events
        // are dropped — equivalent to streaming-without-retention semantics.
        name: 'clear-displacement-event-log',
        run: (context) => {
            const log = context.state.displacement?.displacement_event_log;
            if (!log) return;
            // Stream out before clearing (only if a sink is registered).
            const sink = context.input.displacementEventStreamSink;
            if (sink && log.length > 0) {
                sink(log.slice());
            }
            // Truncate buffer (in-place; preserves array identity for any
            // intra-turn references already captured).
            log.length = 0;
        }
    },
];

/**
 * Recall brigades that have drifted far from home with no active operation.
 * BFS on raw adjacency (ignoring faction control) — if a brigade is >MAX hops from
 * home_osid and not participating in an active operation, issue a column march home.
 * Prevents SRK Vogosca brigades from permanently parking at Gorazde.
 */
const DRIFT_RECALL_MAX_HOPS = 4;

function isWithinSameCorpsSectorSpace(
    formation: FormationState,
    state: GameState,
    adjacency: Map<string, string[]>,
    politicalControllers: Record<string, string>,
): boolean {
    const corpsId = formation.elite_loan_state?.on_loan
        ? formation.elite_loan_state.loaned_to_corps
        : formation.corps_id;
    const loc = formation.location_osid;
    if (!corpsId || !loc) return false;

    for (const sector of Object.values(state.military.corps_front_sectors ?? {})) {
        if (sector.corps_id !== corpsId) continue;
        if ((sector.territory_osids ?? []).includes(loc)) return true;

        const frontSet = new Set<string>();
        for (const seg of sector.sub_segments ?? []) {
            for (const osid of seg.friendly_osids ?? []) {
                frontSet.add(osid);
                if (osid === loc) return true;
            }
        }

        if (politicalControllers[loc] !== formation.faction) continue;
        for (const frontOsid of frontSet) {
            for (const neighbor of adjacency.get(frontOsid) ?? []) {
                if (neighbor === loc) return true;
            }
        }
    }

    return false;
}

export function recallDriftedBrigades(state: GameState, adjacency?: Map<string, string[]>): void {
    const formations = state.military.formations ?? {};
    const pc = (state.political.political_controllers ?? {}) as Record<string, string>;
    const moveOrders = state.military.brigade_movement_orders ??= {};

    for (const [fid, order] of Object.entries(moveOrders)) {
        const formation = formations[fid];
        const dest = order?.destination_sids?.[0];
        if (!formation || !dest || !formation.faction) continue;
        const controller = pc[dest];
        if (controller != null && controller !== formation.faction) {
            delete moveOrders[fid];
        }
    }

    if (!adjacency || adjacency.size === 0) return;

    // Build set of brigades in active operations
    const inOp = new Set<string>();
    const corpsCmd = state.military.corps_command ?? {};
    for (const cmd of Object.values(corpsCmd)) {
        for (const op of cmd.active_operations) {
            for (const bid of op.participating_brigades ?? []) inOp.add(bid);
            if (op.axes) {
                for (const axis of op.axes) {
                    for (const bid of axis.assigned_brigades ?? []) inOp.add(bid);
                }
            }
        }
    }

    const adj = adjacency;

    // Build set of sector-owned brigades (do not recall these). Reserve and rear
    // buckets are still live sector ownership, not ownerless drift.
    const sectorOwned = new Set<string>();
    for (const sector of Object.values(state.military.corps_front_sectors ?? {})) {
        for (const bid of sector.assigned_brigade_ids ?? []) sectorOwned.add(bid);
        for (const bid of sector.reserve_brigade_ids ?? []) sectorOwned.add(bid);
        for (const bid of sector.rear_brigade_ids ?? []) sectorOwned.add(bid);
    }

    for (const [fid, f] of Object.entries(formations)) {
        if (f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og') continue;
        if (!f.home_osid || !f.location_osid) continue;
        if (f.home_osid === f.location_osid) continue;
        if (inOp.has(fid)) continue;
        if ((f.disrupted_turns ?? 0) > 0) continue;
        if (sectorOwned.has(fid) || f.assignment?.kind === 'sector') {
            if (moveOrders[fid]?.destination_sids?.[0] === f.home_osid) {
                delete moveOrders[fid];
            }
            continue;
        }

        const faction = f.faction;
        if (!faction || pc[f.home_osid] !== faction) {
            if (moveOrders[fid]?.destination_sids?.[0] === f.home_osid) {
                delete moveOrders[fid];
            }
            continue;
        }

        // n1198: BFS through FRIENDLY territory only, not raw adjacency.
        // Raw adjacency sees sela_2→mostar as 3 hops (through RS territory),
        // but the friendly path is 8-10 hops. Using raw distance let brigades
        // trapped in enemy pockets appear "close to home" and skip recall.
        const dist = bfsFriendlyDistance(f.home_osid, f.location_osid, adj, pc, faction ?? '', DRIFT_RECALL_MAX_HOPS + 1);
        if (dist <= DRIFT_RECALL_MAX_HOPS) continue;
        const homeReachable = bfsFriendlyDistance(
            f.home_osid,
            f.location_osid,
            adj,
            pc,
            faction ?? '',
            Math.max(DRIFT_RECALL_MAX_HOPS + 1, adj.size),
        ) <= adj.size;

        const existingOrder = moveOrders[fid];
        if (existingOrder) {
            const existingDest = existingOrder.destination_sids?.[0];
            const isOwnerless = (f.assignment ?? null) == null;
            const outsideOwnCorpsSpace = !isWithinSameCorpsSectorSpace(f, state, adj, pc);
            if (!isOwnerless || !outsideOwnCorpsSpace) {
                continue;
            }
            if (existingDest === f.home_osid) {
                if (!homeReachable) delete moveOrders[fid];
                continue;
            }
        }

        if (!homeReachable) {
            delete moveOrders[fid];
            continue;
        }

        // Brigade is too far from home — recall
        moveOrders[fid] = {
            destination_sids: [f.home_osid],
            stance: 'column',
        };
    }
}

function bfsRawDistance(from: string, to: string, adj: Map<string, string[]>, maxHops: number): number {
    if (from === to) return 0;
    const visited = new Set<string>([from]);
    let frontier = [from];
    for (let h = 1; h <= maxHops; h++) {
        const next: string[] = [];
        for (const n of frontier) {
            for (const nb of adj.get(n) ?? []) {
                if (visited.has(nb)) continue;
                if (nb === to) return h;
                visited.add(nb);
                next.push(nb);
            }
        }
        frontier = next;
        if (frontier.length === 0) break;
    }
    return maxHops + 1;
}

/** BFS through friendly-controlled territory only. Returns maxHops+1 if unreachable. */
function bfsFriendlyDistance(
    from: string, to: string, adj: Map<string, string[]>,
    politicalControllers: Record<string, string>, faction: string,
    maxHops: number,
): number {
    if (from === to) return 0;
    const visited = new Set<string>([from]);
    let frontier = [from];
    for (let h = 1; h <= maxHops; h++) {
        const next: string[] = [];
        for (const n of frontier) {
            for (const nb of adj.get(n) ?? []) {
                if (visited.has(nb)) continue;
                if (nb === to) return h;
                // Only traverse friendly territory
                if (politicalControllers[nb] !== faction) continue;
                visited.add(nb);
                next.push(nb);
            }
        }
        frontier = next;
        if (frontier.length === 0) break;
    }
    return maxHops + 1;
}
