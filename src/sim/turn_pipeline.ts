import { GameState, type FactionId, type PhaseIIFrontDescriptor, type PhaseEAorMembership, type PhaseERearZoneDescriptor } from '../state/game_state.js';
import { cloneGameState } from '../state/clone.js';
import { EdgeRecord } from '../map/settlements.js';
import { computeFrontEdges } from '../map/front_edges.js';
import { computeFrontRegions } from '../map/front_regions.js';
import { buildAdjacencyMap } from '../map/adjacency_map.js';
import { syncFrontSegments } from '../state/front_segments.js';
import { normalizeFrontPosture } from '../state/front_posture.js';
import { expandRegionPostureToEdges } from '../state/front_posture_regions.js';
import { accumulateFrontPressure, FrontPressureStepReport } from '../state/front_pressure.js';
import { accumulateExhaustion, ExhaustionStats } from '../state/exhaustion.js';
import { applyFormationCommitment, CommitmentStepReport } from '../state/front_posture_commitment.js';
import { updateFormationFatigue, FormationFatigueStepReport } from '../state/formation_fatigue.js';
import {
  updateFormationLifecycle,
  deriveMunicipalityAuthorityMap,
  type FormationLifecycleStepReport
} from '../state/formation_lifecycle.js';
import { updateMilitiaFatigue, MilitiaFatigueStepReport } from '../state/militia_fatigue.js';
import {
  updateDisplacement,
  applyPhaseIDisplacementFromFlips,
  type DisplacementStepReport
} from '../state/displacement.js';
import {
  processPhaseIIDisplacementTakeover,
  type PhaseIITakeoverDisplacementReport
} from '../state/displacement_takeover.js';
import { processMinorityFlight, type MinorityFlightReport } from '../state/minority_flight.js';
import { updateSustainability, SustainabilityStepReport } from '../state/sustainability.js';
import { updateNegotiationPressure, NegotiationPressureStepReport } from '../state/negotiation_pressure.js';
import { updateNegotiationCapital, NegotiationCapitalStepReport } from '../state/negotiation_capital.js';
import { updateEmbargoProfiles } from '../state/embargo.js';
import { ensureMaintenanceCapacity } from '../state/maintenance.js';
import { updateCapabilityProfiles } from '../state/capability_progression.js';
import { updateLegitimacyState } from '../state/legitimacy.js';
import { updateEnclaveIntegrity } from '../state/enclave_integrity.js';
import { updateSarajevoState } from '../state/sarajevo_exception.js';
import {
  ensureInternationalVisibilityPressure,
  updateInternationalVisibilityPressure,
  updatePatronState
} from '../state/patron_pressure.js';
import { updateDoctrineState, getDoctrineTempoMultiplier } from '../state/doctrine.js';
import { updateHeavyEquipmentState } from '../state/heavy_equipment.js';
import {
  generateNegotiationOffers,
  checkOfferAcceptance,
  expireCeasefireEntries,
  applyEnforcementPackage,
  type OfferGenerationReport,
  type AcceptanceReport,
  type EnforcementPackage
} from '../state/negotiation_offers.js';
import { loadSettlementGraph, type LoadedSettlementGraph } from '../map/settlements.js';
import {
  getEnablePhase3A,
  loadEnrichedContactGraph,
  buildPressureEligibilityPhase3A,
  buildStateAccessors,
  type Phase3AAuditSummary
} from './pressure/phase3a_pressure_eligibility.js';
import {
  getEnablePhase3ADiffusion,
  runPhase3APressureDiffusion
} from './pressure/phase3a_pressure_diffusion.js';
import {
  getEnablePhase3B,
  applyPhase3BPressureExhaustion,
  type Phase3BExhaustionResult
} from './pressure/phase3b_pressure_exhaustion.js';
import {
  getEnablePhase3C,
  applyPhase3CExhaustionCollapseGating,
  type Phase3CEligibilityResult
} from './pressure/phase3c_exhaustion_collapse_gating.js';
import {
  getEnablePhase3D,
  applyPhase3DCollapseResolution,
  type Phase3DCollapseResolutionResult
} from './collapse/phase3d_collapse_resolution.js';
import { updateMilitiaEmergence, type MilitiaEmergenceReport } from './phase_i/militia_emergence.js';
import { runPoolPopulation, type PoolPopulationReport } from './phase_i/pool_population.js';
import {
  runMinorityMilitiaDecay,
  type MinorityDecayReport
} from './phase_i/minority_militia_decay.js';
import {
  spawnFormationsFromPools,
  reinforceBrigadesFromPools,
  applyWiaTrickleback,
  isFormationSpawnDirectiveActive,
  type SpawnFormationsReport,
  type ReinforceBrigadesReport,
  type WiaTricklebackReport
} from './formation_spawn.js';
import type { ControlFlipReport } from './phase_i/control_flip.js';
import {
  updateAllianceValue,
  ensureRbihHrhbState,
  countBilateralFlips,
  type AllianceUpdateReport
} from './phase_i/alliance_update.js';
import { updateMixedMunicipalitiesList } from './phase_i/mixed_municipality.js';
import { checkAndApplyCeasefire, type CeasefireCheckReport } from './phase_i/bilateral_ceasefire.js';
import { checkAndApplyWashington, type WashingtonCheckReport } from './phase_i/washington_agreement.js';
import { runMinorityErosion, type MinorityErosionReport } from './phase_i/minority_erosion.js';
import { runAuthorityDegradation, type AuthorityDegradationReport } from './phase_i/authority_degradation.js';
import { runControlStrain, buildSettlementsByMun, type ControlStrainReport } from './phase_i/control_strain.js';
import {
  populateFactionAoRFromControl,
  ensureFormationHomeMunsInFactionAoR
} from '../scenario/scenario_runner.js';
import {
  loadOobBrigades,
  loadOobCorps,
  loadMunicipalityHqSettlement,
  type OobBrigade,
  type OobCorps
} from '../scenario/oob_loader.js';
import { buildSidToMunFromSettlements } from '../scenario/oob_phase_i_entry.js';
import { evaluateEvents } from './events/evaluate_events.js';
import { runDisplacementHooks, type DisplacementHooksReport } from './phase_i/displacement_hooks.js';
import { runJNATransition, type JNATransitionReport } from './phase_i/jna_transition.js';

import { detectPhaseIIFronts } from './phase_ii/front_emergence.js';
import {
  computeBrigadeEncirclement,
  applySurroundedBrigadeReform,
  identifyFrontActiveSettlements,
  validateBrigadeAoR,
  applyBrigadeMunicipalityOrders
} from './phase_ii/brigade_aor.js';
import { enforceContiguity, enforceCorpsLevelContiguity } from './phase_ii/corps_directed_aor.js';
import { buildAdjacencyFromEdges } from './phase_ii/phase_ii_adjacency.js';
import { applyReshapeOrders } from './phase_ii/aor_reshaping.js';
import { applyPostureOrders, applyPostureCosts } from './phase_ii/brigade_posture.js';
import { generateAllBotOrders } from './phase_ii/bot_brigade_ai.js';
import { generateAllCorpsOrders } from './phase_ii/bot_corps_ai.js';
import { applyCorpsEffects, advanceOperations } from './phase_ii/corps_command.js';
import { activateOGs, updateOGLifecycle } from './phase_ii/operational_groups.js';
import { applyBrigadePressureToState } from './phase_ii/brigade_pressure.js';
import { computeMilitiaGarrisons } from './phase_ii/militia_garrison.js';
import { processBrigadeMovement } from './phase_ii/brigade_movement.js';
import { resolveAttackOrders, type ResolveAttackOrdersReport } from './phase_ii/resolve_attack_orders.js';
import { loadTerrainScalars } from '../map/terrain_scalars.js';
import { degradeEquipment, ensureBrigadeComposition } from './phase_ii/equipment_effects.js';
import { updatePhaseIISupplyPressure } from './phase_ii/supply_pressure.js';
import { updatePhaseIIExhaustion } from './phase_ii/exhaustion.js';
import { getPhaseIICommandFrictionMultipliers } from './phase_ii/command_friction.js';
import { updateReconIntelligence } from './phase_ii/recon_intelligence.js';
import {
  applyPhaseIToPhaseIITransition,
  updatePhaseIOpposingEdgesStreak
} from './phase_transitions/phase_i_to_phase_ii.js';
import { runFormationHqRelocation, type FormationHqRelocationReport } from './formation_hq_relocation.js';
import { runPhaseIBotPosture } from './phase_i/bot_phase_i.js';
import { strictCompare } from '../state/validateGameState.js';
import {
  diffusePressure,
  type PhaseEPressureDiffusionReport
} from './phase_e/pressure_diffusion.js';
import { derivePhaseIIFrontsFromPressureEligible } from './phase_e/front_emergence.js';
import { evaluateDisplacementTriggers } from './phase_f/displacement_triggers.js';
import { applySettlementDisplacementDeltas } from './phase_f/displacement_accumulation.js';
import { aggregateSettlementDisplacementToMunicipalities } from './phase_f/displacement_municipality_aggregation.js';
import { buildDisplacementCapacityReport } from './phase_f/displacement_capacity_hooks.js';
import { updateLossOfControlTrends } from '../state/loss_of_control_trends.js';
import { computeSupplyReachability } from '../state/supply_reachability.js';
import {
  deriveCorridors,
  deriveSupplyState,
  deriveLocalProductionCapacity,
  type CorridorDerivationReport,
  type SupplyStateDerivationReport,
  type LocalProductionCapacityReport
} from '../state/supply_state_derivation.js';
import {
  ensureProductionFacilities,
  calculateFactionProductionBonus
} from '../state/production_facilities.js';
import { accrueRecruitmentResources, runOngoingRecruitment } from './recruitment_turn.js';


export type Rng = () => number;

/** Per-mun 1991 census (by_mun1990_id). Used to weight militia pool by eligible population. */
export type MunicipalityPopulation1991 = Record<
  string,
  { total: number; bosniak: number; serb: number; croat: number; other: number }
>;

export interface TurnInput {
  seed: string;
  settlementEdges?: EdgeRecord[];
  /** When provided, Phase I uses this graph instead of loadSettlementGraph() (e.g. browser or tests). */
  settlementGraph?: LoadedSettlementGraph;
  applyNegotiation?: boolean; // Phase 11B: apply accepted negotiation offers
  /** When provided, pool population is weighted by eligible population (RBiH=bosniak, RS=serb, HRHB=croat) so brigade counts reflect demographics. */
  municipalityPopulation1991?: MunicipalityPopulation1991;
  /** When provided, holdout resistance scales by settlement population (deterministic). */
  settlementPopulationBySid?: Record<string, number>;
  /** When provided, emergent brigades get hq_sid from this map (mun1990_id -> sid) for map placement. */
  municipalityHqSettlement?: Record<string, string>;
  /** When provided, emergent brigade names use historical OOB name for (faction, mun_id, ordinal). */
  historicalNameLookup?: (faction: string, mun_id: string, ordinal: number) => string | null;
  /** When provided, Phase I wave flip uses ethnicity for holdout decisions (avoids 0/0 → all flips). */
  settlementDataRaw?: Array<{ sid: string; ethnicity?: { composition?: Record<string, number> }; population?: number }>;
}

export interface TurnReport {
  seed: string;
  phases: { name: string }[];
  region_posture_expansion?: { expanded_edges_count: number };
  formation_fatigue?: FormationFatigueStepReport;
  formation_lifecycle?: FormationLifecycleStepReport; // Phase I.0
  commitment?: CommitmentStepReport;
  front_pressure?: FrontPressureStepReport;
  exhaustion?: ExhaustionStats;
  militia_fatigue?: MilitiaFatigueStepReport;
  displacement?: DisplacementStepReport; // Phase 21
  sustainability?: SustainabilityStepReport; // Phase 22
  negotiation_pressure?: NegotiationPressureStepReport;
  negotiation_capital?: NegotiationCapitalStepReport; // Phase 12A
  negotiation_offer?: OfferGenerationReport; // Phase 11B
  negotiation_acceptance?: AcceptanceReport; // Phase 11B
  negotiation_apply?: { applied: boolean; freeze_edges_count: number }; // Phase 11B
  phase3a_pressure_eligibility?: Phase3AAuditSummary; // Phase 3A: pressure eligibility audit (feature-gated)
  phase3b_pressure_exhaustion?: Phase3BExhaustionResult; // Phase 3B: pressure → exhaustion coupling (feature-gated)
  phase3c_exhaustion_collapse_gating?: Phase3CEligibilityResult; // Phase 3C: exhaustion → collapse eligibility gating (feature-gated)
  phase3d_collapse_resolution?: Phase3DCollapseResolutionResult; // Phase 3D: collapse resolution (feature-gated)
  phase_i_militia_emergence?: MilitiaEmergenceReport; // Phase C Step 3: militia emergence
  phase_i_pool_population?: PoolPopulationReport; // Phase C Step 3.5: militia pools from strength + displaced
  phase_i_minority_militia_decay?: MinorityDecayReport; // Phase C Step 3.5a: early-war minority decay (turns 1–3)
  phase_i_brigade_reinforcement?: ReinforceBrigadesReport; // Phase C Step 3.5b: fill brigades to 2.5k before spawn
  phase_i_formation_spawn?: SpawnFormationsReport; // Phase C Step 3.6: spawn formations when directive active (FORAWWV H2.4)
  phase_i_control_flip?: ControlFlipReport; // Phase C Step 4: early war control change
  formation_hq_relocation?: FormationHqRelocationReport; // Phase II: relocate HQs for safety and AoR depth sync
  phase_i_authority?: AuthorityDegradationReport; // Phase C Step 5: authority degradation
  phase_i_control_strain?: ControlStrainReport; // Phase C Step 6: control strain
  phase_i_displacement_hooks?: DisplacementHooksReport; // Phase C Step 7: displacement initiation hooks
  phase_i_displacement_apply?: DisplacementStepReport; // Phase C Step 7b: one-time Phase I displacement from flips (Phase I §4.4)
  phase_i_jna_transition?: JNATransitionReport; // Phase C Step 8: JNA withdrawal and asset transfer
phase_i_alliance_update?: AllianceUpdateReport; // Phase I §4.8: RBiH–HRHB alliance value update
  phase_i_ceasefire_check?: CeasefireCheckReport; // Phase I §4.8: bilateral ceasefire evaluation
  phase_i_washington_check?: WashingtonCheckReport; // Phase I §4.8: Washington Agreement evaluation
  phase_i_bilateral_flip_count?: number; // Phase I §4.8: bilateral RBiH–HRHB flips this turn
  phase_i_minority_erosion_report?: MinorityErosionReport; // Phase I §4.8: minority militia erosion
  end_state_active?: boolean; // Phase 12D.0: true if end_state exists (war ended)
  end_state_info?: { // Phase 12D.1: snapshot info when end_state is active
    kind: string;
    treaty_id: string;
    since_turn: number;
    outcome_hash?: string;
    settlements_by_controller?: Record<string, number>;
  };
  // H7.x: Supply Resolution Phase (supply state, corridors, local production)
  supply_resolution?: {
    supply_state: SupplyStateDerivationReport;
    corridors: CorridorDerivationReport;
    local_production?: LocalProductionCapacityReport;
    production_bonus_by_faction?: Record<FactionId, number>;
  };
  /** Phase E: pressure diffusion (runs only when meta.phase === 'phase_ii') */
  phase_e_pressure_update?: PhaseEPressureDiffusionReport;
  /** Phase II: front emergence — derived fronts from pressure-eligible edges (phase_ii only) */
  phase_ii_front_emergence?: PhaseIIFrontDescriptor[];
  /** Phase II: attack orders resolved (garrison-based flips); one target per brigade per turn */
  phase_ii_resolve_attack_orders?: ResolveAttackOrdersReport;
  /** Phase II: delayed hostile-takeover displacement (timer + camp + reroute). */
  phase_ii_takeover_displacement?: PhaseIITakeoverDisplacementReport;
  /** Phase II: non-takeover minority flight (settlement-level). */
  phase_ii_minority_flight?: MinorityFlightReport;
  /** Phase II: brigade reinforcement from militia pools after casualties */
  phase_ii_brigade_reinforcement?: ReinforceBrigadesReport;
  /** Phase II: WIA trickleback — wounded return to formations when out of combat */
  phase_ii_wia_trickleback?: WiaTricklebackReport;
  /** Phase E: AoR derivation — Areas of Responsibility from sustained spatial dominance (phase_ii only) */
  phase_e_aor_derivation?: PhaseEAorMembership;
  /** Phase E: rear zone derivation — Rear Political Control Zones (phase_ii only) */
  phase_e_rear_zone_derivation?: PhaseERearZoneDescriptor;
  /** Phase F: displacement triggers + settlement accumulation + municipality aggregation (phase_ii only) */
  phase_f_displacement?: {
    trigger_report: {
      triggered_settlements: string[];
      /** Phase H1.7: activity diagnostics (counts only). */
      pressure_eligible_size: number;
      front_active_set_size: number;
      displacement_trigger_eligible_size: number;
    };
    capacity_report: ReturnType<typeof buildDisplacementCapacityReport>;
  };
  enclave_integrity?: { enclaves: number; humanitarian_pressure_total: number };
  sarajevo_exception?: { siege_status: string; siege_intensity: number; humanitarian_pressure: number };
  /** B1: Events fired this turn (narrative). Deterministic for same seed + turn. */
  events_fired?: { id: string; text: string }[];
  patron_ivp?: { sarajevo_visibility: number; enclave_pressure: number; negotiation_momentum: number };
  legitimacy_update?: { settlements: number };
  embargo_update?: { factions: number };
  capability_update?: { factions: number };
  doctrine_update?: { formations: number };
  equipment_update?: { formations: number };
  /** Phase II: recruitment resource accrual + ongoing OOB recruitment. */
  phase_ii_recruitment?: {
    accrual_by_faction: Record<FactionId, { capital_delta: number; equipment_delta: number }>;
    recruited_actions: number;
    recruited_by_faction: Record<FactionId, number>;
    remaining_capital: Record<FactionId, number>;
    remaining_equipment: Record<FactionId, number>;
  };
}

export interface TurnContext {
  state: GameState;
  rng: Rng;
  input: TurnInput;
  report: TurnReport;
}

export type PhaseHandler = (context: TurnContext) => void | Promise<void>;

/** Load settlement graph and edges from context (or default). Used by Phase II AoR and related steps. */
async function getGraphAndEdges(context: TurnContext): Promise<{ graph: LoadedSettlementGraph; edges: EdgeRecord[] }> {
  const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
  const edges = context.input.settlementEdges && context.input.settlementEdges.length > 0
    ? context.input.settlementEdges
    : graph.edges;
  return { graph, edges };
}

interface NamedPhase {
  name: string;
  run: PhaseHandler;
}

interface RecruitmentCatalogCache {
  base_dir: string;
  brigades: OobBrigade[];
  corps: OobCorps[];
  municipality_hq_settlement: Record<string, string>;
}

let recruitmentCatalogCache: RecruitmentCatalogCache | null = null;

async function loadRecruitmentCatalog(): Promise<RecruitmentCatalogCache | null> {
  const baseDir = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '';
  if (!baseDir) return null;
  if (recruitmentCatalogCache && recruitmentCatalogCache.base_dir === baseDir) {
    return recruitmentCatalogCache;
  }
  try {
    const [brigades, corps, municipality_hq_settlement] = await Promise.all([
      loadOobBrigades(baseDir),
      loadOobCorps(baseDir),
      loadMunicipalityHqSettlement(baseDir)
    ]);
    recruitmentCatalogCache = { base_dir: baseDir, brigades, corps, municipality_hq_settlement };
    return recruitmentCatalogCache;
  } catch {
    return null;
  }
}

const phases: NamedPhase[] = [
  {
    name: 'initialize',
    run: () => {
      // placeholder: ensure deterministic setup stays inside pipeline
    }
  },
  {
    name: 'evaluate-events',
    run: (context) => {
      const turn = context.state.meta.turn;
      const result = evaluateEvents(context.state, context.rng, turn);
      context.report.events_fired = result.fired;
    }
  },
  {
    name: 'sync-front-segments',
    run: (context) => {
      const edges = context.input.settlementEdges;
      if (!edges) return;
      const derivedFrontEdges = computeFrontEdges(context.state, edges);
      syncFrontSegments(context.state, derivedFrontEdges);
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
      // Phase I.0: Formation lifecycle state management
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
  // --- Brigade Operations Pipeline (Phase II only) ---
  {
    name: 'formation-hq-relocation',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
      const report = runFormationHqRelocation(context.state, graph.settlements, graph.edges);
      if (report.relocated > 0) {
        context.report.formation_hq_relocation = report;
      }
    }
  },
  {
    name: 'phase-ii-aor-init',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      const factions = context.state.factions ?? [];
      const allAoREmpty = factions.every(
        (f) => !f.areasOfResponsibility || f.areasOfResponsibility.length === 0
      );
      if (!allAoREmpty) return;
      const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
      const pc = context.state.political_controllers ?? {};
      populateFactionAoRFromControl(context.state, Object.keys(pc));
      const byMun = buildSettlementsByMun(graph.settlements);
      ensureFormationHomeMunsInFactionAoR(context.state, byMun);
    }
  },
  {
    name: 'validate-brigade-aor',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      if (!context.state.brigade_aor) return;
      const { graph, edges } = await getGraphAndEdges(context);
      validateBrigadeAoR(context.state, edges, graph.settlements);
    }
  },
  {
    name: 'enforce-brigade-aor-contiguity',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      if (!context.state.brigade_aor) return;
      const { edges } = await getGraphAndEdges(context);
      const frontActive = identifyFrontActiveSettlements(context.state, edges);
      const adj = buildAdjacencyFromEdges(edges);
      enforceContiguity(context.state, frontActive, adj);
    }
  },
  {
    name: 'enforce-corps-aor-contiguity',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      if (!context.state.brigade_aor) return;
      if (!context.state.corps_command) return;
      const { edges } = await getGraphAndEdges(context);
      enforceCorpsLevelContiguity(context.state, edges);
    }
  },
  {
    name: 'detect-brigade-encirclement',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      if (!context.state.brigade_aor) return;
      const { edges } = await getGraphAndEdges(context);
      computeBrigadeEncirclement(context.state, edges);
    }
  },
  {
    name: 'surrounded-brigade-reform',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      if (!context.state.brigade_aor) return;
      const { graph, edges } = await getGraphAndEdges(context);
      const sidToMun: Record<string, string> = {};
      for (const [sid, rec] of graph.settlements.entries()) {
        const munId = rec.mun1990_id ?? rec.mun_code;
        if (munId) sidToMun[sid] = munId;
      }
      applySurroundedBrigadeReform(context.state, edges, sidToMun);
    }
  },
  {
    name: 'process-brigade-movement',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      const { edges } = await getGraphAndEdges(context);
      processBrigadeMovement(context.state, edges);
    }
  },
  {
    name: 'generate-bot-corps-orders',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      if (!context.state.corps_command) return;
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
      for (const faction of factions) {
        generateAllCorpsOrders(context.state, faction, edges, sidToMun);
      }
    }
  },
  {
    name: 'generate-bot-brigade-orders',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      if (!context.state.brigade_aor) return;
      const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
      const edges = context.input.settlementEdges && context.input.settlementEdges.length > 0
        ? context.input.settlementEdges
        : graph.edges;
      // Build sid-to-municipality map for strategic target selection
      const sidToMun = new Map<string, string>();
      for (const [sid, rec] of graph.settlements.entries()) {
        const munId = rec.mun1990_id ?? rec.mun_code;
        if (munId) sidToMun.set(sid, munId);
      }
      // All factions are bot-controlled in auto-run mode; exclude player faction when set
      const playerFaction = context.state.meta.player_faction ?? null;
      const factions = (context.state.factions ?? []).map(f => f.id)
        .filter(fid => playerFaction == null || fid !== playerFaction);
      generateAllBotOrders(context.state, edges, factions, sidToMun);
    }
  },
  {
    name: 'apply-municipality-orders',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      const orders = context.state.brigade_mun_orders;
      if (!orders || typeof orders !== 'object' || Object.keys(orders).length === 0) return;
      const { graph, edges } = await getGraphAndEdges(context);
      applyBrigadeMunicipalityOrders(context.state, edges, graph.settlements);
    }
  },
  {
    name: 'apply-aor-reshaping',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      if (!context.state.brigade_aor_orders?.length) return;
      const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
      const edges = context.input.settlementEdges && context.input.settlementEdges.length > 0
        ? context.input.settlementEdges
        : graph.edges;
      applyReshapeOrders(context.state, edges);
    }
  },
  {
    name: 'formation-hq-aor-depth-sync',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      if (!context.state.brigade_aor) return;
      const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
      const report = runFormationHqRelocation(context.state, graph.settlements, graph.edges);
      if (report.relocated <= 0) return;
      const existing = context.report.formation_hq_relocation;
      if (!existing) {
        context.report.formation_hq_relocation = report;
        return;
      }
      const merged = Array.from(new Set([...existing.formation_ids, ...report.formation_ids])).sort(strictCompare);
      context.report.formation_hq_relocation = {
        relocated: merged.length,
        formation_ids: merged
      };
    }
  },
  {
    name: 'apply-brigade-posture',
    run: (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      applyPostureOrders(context.state);
    }
  },
  {
    name: 'update-corps-effects',
    run: (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      if (!context.state.corps_command) return;
      applyCorpsEffects(context.state);
    }
  },
  {
    name: 'advance-corps-operations',
    run: (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      if (!context.state.corps_command) return;
      advanceOperations(context.state);
    }
  },
  {
    name: 'activate-operational-groups',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      if (!context.state.og_orders?.length) return;
      const { edges } = await getGraphAndEdges(context);
      activateOGs(context.state, edges);
    }
  },
  {
    name: 'equipment-degradation',
    run: (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      const formations = context.state.formations ?? {};
      for (const fid of Object.keys(formations).sort()) {
        const f = formations[fid];
        if (f.status !== 'active' || (f.kind !== 'brigade' && f.kind !== 'og')) continue;
        ensureBrigadeComposition(f);
        // Use faction maintenance capacity (0.0-1.0)
        const factionState = (context.state.factions ?? []).find(fac => fac.id === f.faction);
        const maintenance = (factionState as any)?.profile?.logistics ?? 50;
        degradeEquipment(f, f.posture, maintenance / 100);
      }
    }
  },
  {
    name: 'apply-posture-costs',
    run: (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      applyPostureCosts(context.state);
    }
  },
  {
    name: 'compute-brigade-pressure',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      if (!context.state.brigade_aor) return;
      let edges = context.input.settlementEdges;
      if (!edges || edges.length === 0) {
        const graph = await loadSettlementGraph();
        edges = graph.edges;
      }
      applyBrigadePressureToState(context.state, edges);
    }
  },
  {
    name: 'phase-ii-resolve-attack-orders',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
      const edges = context.input.settlementEdges ?? graph.edges;

      // Build settlement → municipality lookup for terrain/urban defense and militia garrisons
      const settlementToMun = new Map<string, string>();
      const sidToMunRecord: Record<string, string> = {};
      for (const [sid, rec] of graph.settlements.entries()) {
        const mun = rec.mun1990_id ?? rec.mun_code ?? rec.mun;
        settlementToMun.set(sid, mun);
        sidToMunRecord[sid] = mun;
      }
      computeMilitiaGarrisons(context.state, sidToMunRecord);

      // Load terrain scalars (cached after first call)
      let terrainData;
      try {
        terrainData = await loadTerrainScalars();
      } catch {
        terrainData = { by_sid: {} };
      }

      context.report.phase_ii_resolve_attack_orders = resolveAttackOrders(
        context.state, edges, terrainData, settlementToMun
      );
    }
  },
  {
    name: 'phase-ii-hostile-takeover-displacement',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      const battleReport = context.report.phase_ii_resolve_attack_orders?.battle_report;
      const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
      context.report.phase_ii_takeover_displacement = processPhaseIIDisplacementTakeover(
        context.state,
        graph.settlements,
        battleReport,
        context.input.municipalityPopulation1991
      );
    }
  },
  {
    name: 'phase-ii-minority-flight',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
      context.report.phase_ii_minority_flight = processMinorityFlight(
        context.state,
        graph.settlements,
        context.input.municipalityPopulation1991,
        context.input.settlementPopulationBySid
      );
    }
  },
  {
    name: 'phase-ii-recruitment',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      if (!context.state.recruitment_state) return;

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
        const sidToMun = buildSidToMunFromSettlements(graph.settlements);
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
        remaining_capital[factionId] = context.state.recruitment_state.recruitment_capital[factionId]?.points ?? 0;
        remaining_equipment[factionId] = context.state.recruitment_state.equipment_pools[factionId]?.points ?? 0;
      }

      context.report.phase_ii_recruitment = {
        accrual_by_faction,
        recruited_actions,
        recruited_by_faction,
        remaining_capital,
        remaining_equipment
      };
    }
  },
  {
    name: 'phase-ii-brigade-reinforcement',
    run: (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      context.report.phase_ii_brigade_reinforcement = reinforceBrigadesFromPools(context.state);
    }
  },
  {
    name: 'phase-ii-wia-trickleback',
    run: (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      context.report.phase_ii_wia_trickleback = applyWiaTrickleback(context.state);
    }
  },
  {
    name: 'update-og-lifecycle',
    run: (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      updateOGLifecycle(context.state);
    }
  },
  // --- End Brigade Operations Pipeline ---
  {
    name: 'phase-ii-consolidation',
    run: (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      const edges = context.input.settlementEdges;
      if (!edges) return;
      const fronts = detectPhaseIIFronts(context.state, edges);
      const frictionMultipliers = getPhaseIICommandFrictionMultipliers(context.state, edges);
      updatePhaseIISupplyPressure(
        context.state,
        edges,
        context.report.supply_resolution?.supply_state,
        frictionMultipliers,
        context.report.supply_resolution?.production_bonus_by_faction
      );
      updatePhaseIIExhaustion(context.state, fronts, frictionMultipliers);
    }
  },
  {
    name: 'phase-e-pressure-update',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
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
    name: 'phase-ii-front-emergence',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      let edges = context.input.settlementEdges;
      if (!edges || edges.length === 0) {
        const graph = await loadSettlementGraph();
        edges = graph.edges;
      }
      if (!edges || edges.length === 0) return;
      context.report.phase_ii_front_emergence = derivePhaseIIFrontsFromPressureEligible(context.state, edges);
    }
  },
  {
    name: 'phase-ii-recon-intelligence',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      if (!context.state.brigade_aor) return;
      const { edges } = await getGraphAndEdges(context);
      if (!edges?.length) return;
      updateReconIntelligence(context.state, edges);
    }
  },
  {
    name: 'phase-e-aor-derivation',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      let edges = context.input.settlementEdges;
      if (!edges || edges.length === 0) {
        const graph = await loadSettlementGraph();
        edges = graph.edges;
      }
      if (!edges || edges.length === 0) return;
      const { deriveAoRMembership } = await import('./phase_e/aor_instantiation.js');
      context.report.phase_e_aor_derivation = deriveAoRMembership(context.state, edges);
    }
  },
  {
    name: 'phase-e-rear-zone-derivation',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      let edges = context.input.settlementEdges;
      if (!edges || edges.length === 0) {
        const graph = await loadSettlementGraph();
        edges = graph.edges;
      }
      if (!edges || edges.length === 0) return;
      const { deriveRearPoliticalControlZones } = await import('./phase_e/rear_zone_detection.js');
      context.report.phase_e_rear_zone_derivation = deriveRearPoliticalControlZones(context.state, edges);
    }
  },
  {
    name: 'phase-f-displacement',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      let edges = context.input.settlementEdges;
      if (!edges || edges.length === 0) {
        const graph = await loadSettlementGraph();
        edges = graph.edges;
      }
      if (!edges || edges.length === 0) return;
      const graph = await loadSettlementGraph();
      const { deltas, report: triggerReport } = evaluateDisplacementTriggers(context.state, edges);
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
      if (context.state.meta.phase !== 'phase_ii') return;
      updateCapabilityProfiles(context.state);
      context.report.capability_update = { factions: context.state.factions.length };
    }
  },
  {
    name: 'update-embargo-profiles',
    run: (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      updateEmbargoProfiles(context.state);
      ensureMaintenanceCapacity(context.state);
      context.report.embargo_update = { factions: context.state.factions.length };
    }
  },
  {
    name: 'update-enclave-integrity',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
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
      if (context.state.meta.phase !== 'phase_ii') return;
      const graph = await loadSettlementGraph();
      const sarajevo = updateSarajevoState(context.state, graph, context.report.supply_resolution?.supply_state);
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
      if (context.state.meta.phase !== 'phase_ii') return;
      ensureInternationalVisibilityPressure(context.state);
      const enclavePressure = context.report.enclave_integrity?.humanitarian_pressure_total ?? 0;
      const ivp = updateInternationalVisibilityPressure(
        context.state,
        context.state.sarajevo_state,
        enclavePressure
      );
      updatePatronState(context.state, context.state.sarajevo_state, ivp);
      context.report.patron_ivp = {
        sarajevo_visibility: ivp.sarajevo_siege_visibility,
        enclave_pressure: ivp.enclave_humanitarian_pressure,
        negotiation_momentum: ivp.negotiation_momentum
      };
    }
  },
  {
    name: 'update-legitimacy',
    run: async (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      const graph = await loadSettlementGraph();
      await updateLegitimacyState(context.state, graph);
      context.report.legitimacy_update = { settlements: Object.keys(context.state.settlements ?? {}).length };
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
      (context as any).effectivePosture = effectivePosture;
    }
  },
  {
    name: 'update-doctrine-eligibility',
    run: (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      updateDoctrineState(context.state, context.report.supply_resolution?.supply_state, (context as any).effectivePosture);
      context.report.doctrine_update = { formations: Object.keys(context.state.formations ?? {}).length };
    }
  },
  {
    name: 'update-heavy-equipment',
    run: (context) => {
      if (context.state.meta.phase !== 'phase_ii') return;
      const doctrineTempoByFormation: Record<string, number> = {};
      for (const formation of Object.values(context.state.formations ?? {})) {
        doctrineTempoByFormation[formation.id] = getDoctrineTempoMultiplier(formation);
      }
      updateHeavyEquipmentState(context.state, (context as any).effectivePosture, doctrineTempoByFormation);
      context.report.equipment_update = { formations: Object.keys(context.state.formations ?? {}).length };
    }
  },
  {
    name: 'expose-effective-posture',
    run: (context) => {
      // Phase 5B: Expose intended vs effective posture (read-only, no new mechanics)
      const commitmentReport = context.report.commitment;
      if (!commitmentReport) return;

      const turn = context.state.meta.turn;
      const exposure: any = {
        by_faction: {},
        last_updated_turn: turn
      };

      // Get effective posture from context (computed in commitment step)
      const effectivePosture = (context as any).effectivePosture as Record<string, any> | undefined;

      // Build exposure from commitment report by_edge audits
      // Match audits to factions by checking base posture assignments and effective posture values
      for (const edgeAudit of commitmentReport.by_edge) {
        const edgeId = edgeAudit.edge_id;
        
        // Find which faction(s) this edge belongs to by checking base posture assignments
        for (const factionId of Object.keys(context.state.front_posture || {})) {
          const assignment = context.state.front_posture[factionId]?.assignments?.[edgeId];
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

      // Initialize if needed
      if (!context.state.effective_posture_exposure) {
        (context.state as any).effective_posture_exposure = {};
      }
      (context.state as any).effective_posture_exposure = exposure;
    }
  },
  {
    name: 'accumulate-front-pressure',
    run: (context) => {
      const edges = context.input.settlementEdges;
      if (!edges) return;
      const derivedFrontEdges = computeFrontEdges(context.state, edges);
      const adjacencyMap = buildAdjacencyMap(edges);
      const effectivePosture = (context as any).effectivePosture;
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
        (context as any).phase3aEffectiveEdges = result.edgesEffective;
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
    name: 'resolve-noop',
    run: () => {
      // placeholder: future resolution work goes here
    }
  }
];

/**
 * Phase C: Phase I entry gating (Phase_I_Specification_v0_4_0.md; ROADMAP Phase C).
 * Phase I execution occurs only when referendum_held and current_turn >= war_start_turn.
 * Phase 0 must remain the only runner before war_start_turn; use state pipeline for phase_0.
 */
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

/** Phase I turn phases (order per Phase_I_Spec §5; Steps 3–9 add remaining). */
const phaseIPhases: NamedPhase[] = [
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
    name: 'phase-i-pool-population',
    run: async (context) => {
      const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
      context.report.phase_i_pool_population = runPoolPopulation(
        context.state,
        graph.settlements,
        context.input.municipalityPopulation1991
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
    run: (context) => {
      if (!isFormationSpawnDirectiveActive(context.state)) return;
      const directive = context.state.formation_spawn_directive!;
      const kind = directive.kind === 'both' || directive.kind === 'militia' ? 'brigade' : (directive.kind ?? 'brigade');
      context.report.phase_i_formation_spawn = spawnFormationsFromPools(context.state, {
        factionFilter: null,
        munFilter: null,
        maxPerMun: null,
        customTags: [],
        applyChanges: true,
        formationKind: kind,
        municipalityHqSettlement: context.input.municipalityHqSettlement ?? undefined,
        historicalNameLookup: context.input.historicalNameLookup ?? undefined,
        population1991ByMun: context.input.municipalityPopulation1991 ?? undefined
      });
    }
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
        .sort(strictCompare) as import('../state/game_state.js').FactionId[];
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
      if (context.state.meta.phase !== 'phase_i') return;
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
      context.report.phase_i_control_strain = runControlStrain(context.state, context.state.meta.turn, byMun);
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
      context.report.phase_i_jna_transition = runJNATransition(context.state);
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

export async function runTurn(state: GameState, input: TurnInput): Promise<{ nextState: GameState; report: TurnReport }> {
  const working = cloneGameState(state);

  // Phase C Step 2: Phase 0 must use state pipeline; Phase I only when referendum_held and current_turn >= war_start_turn
  const phase = working.meta.phase;
  if (phase === 'phase_0') {
    throw new Error(
      'runTurn: use state pipeline runOneTurn for phase_0; Phase I execution only when referendum_held and current_turn >= war_start_turn'
    );
  }
  if (phase === 'phase_i') {
    if (!isPhaseIAllowed(working)) {
      throw new Error(
        'runTurn: Phase I requires referendum_held and current_turn >= war_start_turn'
      );
    }
    assertNoAoRInPhaseI(working);
    // Run Phase I turn path (minimal until Steps 3–9)
    working.meta = { ...working.meta, seed: input.seed, turn: working.meta.turn + 1 };
    const report: TurnReport = { seed: input.seed, phases: phaseIPhases.map((p) => ({ name: p.name })) };
    const context: TurnContext = { state: working, rng: createRng(input.seed), input, report };
    for (const p of phaseIPhases) {
      await p.run(context);
    }
    // D0.9.1: Update opposing-edges streak (Phase I), then apply transition
    let edges = context.input.settlementGraph?.edges ?? context.input.settlementEdges;
    if (!edges) {
      const graph = await loadSettlementGraph();
      edges = graph.edges;
    }
    if (edges.length > 0) {
      updatePhaseIOpposingEdgesStreak(working, edges);
    }
    applyPhaseIToPhaseIITransition(context.state, edges, context.input.settlementGraph?.settlements);
    return { nextState: context.state, report };
  }

  // Phase 12D.0: If end_state exists, short-circuit to report-only mode
  if (working.end_state) {
    // Increment turn but skip all war mutation phases
    working.meta = {
      ...working.meta,
      seed: input.seed,
      turn: working.meta.turn + 1
    };

    const report: TurnReport = {
      seed: input.seed,
      phases: [{ name: 'end_state_active' }],
      end_state_active: true,
      // Phase 12D.1: Include end_state info in report
      end_state_info: {
        kind: working.end_state.kind,
        treaty_id: working.end_state.treaty_id,
        since_turn: working.end_state.since_turn,
        outcome_hash: working.end_state.snapshot?.outcome_hash,
        settlements_by_controller: working.end_state.snapshot
          ? Object.fromEntries(working.end_state.snapshot.settlements_by_controller)
          : undefined
      }
    };

    return { nextState: working, report };
  }

  // Keep turn metadata deterministic and internal to the pipeline.
  working.meta = {
    ...working.meta,
    seed: input.seed,
    turn: working.meta.turn + 1
  };

  const rng = createRng(input.seed);
  const report: TurnReport = { seed: input.seed, phases: [] };
  const context: TurnContext = { state: working, rng, input, report };

  for (const phase of phases) {
    report.phases.push({ name: phase.name });
    await phase.run(context);
  }

  return { nextState: context.state, report };
}

function createRng(seed: string | number): Rng {
  const numericSeed = typeof seed === 'number' ? seed : hashSeed(seed);
  let a = numericSeed >>> 0;

  return function rng(): number {
    // Mulberry32 for fast, deterministic RNG
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

