/**
 * Turn pipeline shared types, interfaces, and context helpers.
 * Extracted from turn_pipeline.ts (R7) to avoid circular dependencies
 * between the orchestrator and phase step files.
 */

import { EdgeRecord, loadSettlementGraph, type LoadedSettlementGraph } from '../map/settlements.js';
import {
    loadMunicipalityHqSettlement,
    loadOobBrigades,
    loadOobCorps,
    type OobBrigade,
    type OobCorps
} from '../scenario/oob_loader.js';
import type { DisplacementStepReport } from '../state/displacement.js';
import type { PhaseIITakeoverDisplacementReport } from '../state/displacement_takeover.js';
import type { ExhaustionStats } from '../state/exhaustion.js';
import type { FormationFatigueStepReport } from '../state/formation_fatigue.js';
import type { FormationLifecycleStepReport } from '../state/formation_lifecycle.js';
import type { CommitmentStepReport } from '../state/front_posture_commitment.js';
import type { FrontPressureStepReport } from '../state/front_pressure.js';
import { GameState, type FactionId, type PhaseIIFrontDescriptor } from '../state/game_state.js';
import type { MilitiaFatigueStepReport } from '../state/militia_fatigue.js';
import type { NegotiationCapitalStepReport } from '../state/negotiation_capital.js';
import type {
    AcceptanceReport,
    OfferGenerationReport
} from '../state/negotiation_offers.js';
import type { NegotiationPressureStepReport } from '../state/negotiation_pressure.js';
import type { SustainabilityStepReport } from '../state/sustainability.js';
import type {
    CorridorDerivationReport,
    LocalProductionCapacityReport,
    SupplyStateDerivationReport,
    SupplyStateByOsidReport
} from '../state/supply_state_derivation.js';
import type { SupplyReservesReport, SiegeTurnCounterReport } from '../state/supply_reserves.js';
import type { Phase3DCollapseResolutionResult } from './collapse/phase3d_collapse_resolution.js';
import type { SpawnFormationsReport, ReinforceBrigadesReport, WiaTricklebackReport } from './formation_spawn.js';
import type { FormationHqRelocationReport } from './formation_hq_relocation.js';
import type { PhaseEPressureDiffusionReport } from './emergence/pressure_diffusion.js';
import type { buildDisplacementCapacityReport } from './displacement_pipeline/displacement_capacity_hooks.js';
import type { AllianceUpdateReport } from './early_war/alliance_update.js';
import type { AuthorityDegradationReport } from './early_war/authority_degradation.js';
import type { CeasefireCheckReport } from './early_war/bilateral_ceasefire.js';
import type { ControlFlipReport } from './early_war/control_flip.js';
import type { ControlStrainReport } from './early_war/control_strain.js';
import type { DisplacementHooksReport } from './early_war/displacement_hooks.js';
import type { JNATransitionReport } from './early_war/jna_transition.js';
import type { MilitiaEmergenceReport } from './early_war/militia_emergence.js';
import type { MinorityErosionReport } from './early_war/minority_erosion.js';
import type { MinorityDecayReport } from './early_war/minority_militia_decay.js';
import type { PoolPopulationReport } from './early_war/pool_population.js';
import type { WashingtonCheckReport } from './early_war/washington_agreement.js';
import type { OperationStormCheckReport } from './combat/operation_storm.js';
import type { AttackResolutionOsidReport } from './combat/attack_resolution_osid.js';
import type { BotOrderDiagnosticsSnapshot } from '../scenario/combat_causality.js';
import type { CorpsAiReportEntry } from './combat/bot_corps_ai.js';
import type { CohesionDriftReport } from './combat/cohesion_drift.js';
import type { ConsolidationFlipsReport } from './combat/consolidation_flips.js';
import type { RearPocketConsolidationReport } from './combat/consolidate_rear_pockets.js';
import type { EnclaveResilienceReport } from './combat/enclave_resilience.js';
import type { EquipmentProgressionReport } from './combat/faction_progression.js';
import type { FrontlineAttritionReport } from './combat/frontline_attrition.js';
import type { MoraleDriftReport } from './combat/morale_drift.js';
import type { OngoingMobilizationReport } from './combat/ongoing_mobilization.js';
import type { StrategicReserveCollectionReport, StrategicReserveReinforcementReport } from './combat/strategic_reserve.js';
import type { ResolveAttackOrdersReport } from './combat/resolve_attack_orders.js';
import type { OsidColumnMovementReport } from './combat/osid_column_movement.js';
import type { OfficerQualityReport } from './combat/officer_quality_update.js';
import type { OfficerSuccessionReport } from './combat/officer_system.js';
import type { Phase3AAuditSummary } from './pressure/phase3a_pressure_eligibility.js';
import type { Phase3BExhaustionResult } from './pressure/phase3b_pressure_exhaustion.js';
import type { Phase3CEligibilityResult } from './pressure/phase3c_exhaustion_collapse_gating.js';
import type { SiegeRatioByMunFaction } from './early_war/compute_siege_state.js';
import { loadOperationalData, loadOperationalEdges } from '../data/operational_data.js';


// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

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
    formation_lifecycle?: FormationLifecycleStepReport;
    commitment?: CommitmentStepReport;
    front_pressure?: FrontPressureStepReport;
    exhaustion?: ExhaustionStats;
    militia_fatigue?: MilitiaFatigueStepReport;
    displacement?: DisplacementStepReport;
    sustainability?: SustainabilityStepReport;
    negotiation_pressure?: NegotiationPressureStepReport;
    negotiation_capital?: NegotiationCapitalStepReport;
    negotiation_offer?: OfferGenerationReport;
    negotiation_acceptance?: AcceptanceReport;
    negotiation_apply?: { applied: boolean; freeze_edges_count: number };
    phase3a_pressure_eligibility?: Phase3AAuditSummary;
    phase3b_pressure_exhaustion?: Phase3BExhaustionResult;
    phase3c_exhaustion_collapse_gating?: Phase3CEligibilityResult;
    phase3d_collapse_resolution?: Phase3DCollapseResolutionResult;
    phase_i_militia_emergence?: MilitiaEmergenceReport;
    phase_i_pool_population?: PoolPopulationReport;
    phase_i_minority_militia_decay?: MinorityDecayReport;
    phase_i_brigade_reinforcement?: ReinforceBrigadesReport;
    phase_i_formation_spawn?: SpawnFormationsReport;
    phase_i_control_flip?: ControlFlipReport;
    formation_hq_relocation?: FormationHqRelocationReport;
    phase_i_authority?: AuthorityDegradationReport;
    war_control_strain?: ControlStrainReport;
    phase_i_displacement_hooks?: DisplacementHooksReport;
    phase_i_displacement_apply?: DisplacementStepReport;
    war_jna_transition?: JNATransitionReport;
    phase_i_alliance_update?: AllianceUpdateReport;
    phase_i_ceasefire_check?: CeasefireCheckReport;
    phase_i_washington_check?: WashingtonCheckReport;
    phase_ii_operation_storm_check?: OperationStormCheckReport;
    phase_i_bilateral_flip_count?: number;
    phase_i_minority_erosion_report?: MinorityErosionReport;
    end_state_active?: boolean;
    end_state_info?: {
        kind: string;
        treaty_id: string;
        since_turn: number;
        outcome_hash?: string;
        settlements_by_controller?: Record<string, number>;
    };
    supply_resolution?: {
        supply_state: SupplyStateDerivationReport;
        corridors: CorridorDerivationReport;
        local_production?: LocalProductionCapacityReport;
        production_bonus_by_faction?: Record<FactionId, number>;
        supply_state_by_osid?: SupplyStateByOsidReport;
    };
    phase_e_pressure_update?: PhaseEPressureDiffusionReport;
    phase_ii_front_emergence?: PhaseIIFrontDescriptor[];
    phase_ii_bot_order_diagnostics?: BotOrderDiagnosticsSnapshot;
    phase_ii_resolve_attack_orders?: ResolveAttackOrdersReport;
    phase_ii_attack_resolution_osid?: AttackResolutionOsidReport;
    phase_ii_cohesion_drift?: CohesionDriftReport;
    phase_ii_morale_drift?: MoraleDriftReport;
    frontline_attrition?: FrontlineAttritionReport;
    phase_ii_consolidation_flips?: ConsolidationFlipsReport;
    rear_pocket_consolidation?: RearPocketConsolidationReport;
    phase_ii_takeover_displacement?: PhaseIITakeoverDisplacementReport;
    phase_ii_ongoing_mobilization?: OngoingMobilizationReport;
    phase_ii_brigade_reinforcement?: ReinforceBrigadesReport;
    phase_ii_strategic_reserve_collection?: StrategicReserveCollectionReport;
    phase_ii_strategic_reserve_reinforcement?: StrategicReserveReinforcementReport;
    phase_ii_wia_trickleback?: WiaTricklebackReport;
    phase_f_displacement?: {
        trigger_report: {
            triggered_settlements: string[];
            pressure_eligible_size: number;
            front_active_set_size: number;
            displacement_trigger_eligible_size: number;
        };
        capacity_report: ReturnType<typeof buildDisplacementCapacityReport>;
    };
    enclave_integrity?: { enclaves: number; humanitarian_pressure_total: number };
    sarajevo_exception?: { siege_status: string; siege_intensity: number; humanitarian_pressure: number };
    events_fired?: { id: string; text: string }[];
    patron_ivp?: { sarajevo_visibility: number; enclave_pressure: number; negotiation_momentum: number };
    legitimacy_update?: { settlements: number };
    embargo_update?: { factions: number };
    capability_update?: { factions: number };
    doctrine_update?: { formations: number };
    equipment_update?: { formations: number };
    phase_ii_equipment_progression?: EquipmentProgressionReport;
    phase_ii_enclave_resilience?: EnclaveResilienceReport;
    supply_reserves?: SupplyReservesReport;
    siege_turn_counters?: SiegeTurnCounterReport;
    corps_ai_report?: CorpsAiReportEntry[];
    phase_ii_recruitment?: {
        accrual_by_faction: Record<FactionId, { capital_delta: number; equipment_delta: number }>;
        recruited_actions: number;
        recruited_by_faction: Record<FactionId, number>;
        remaining_capital: Record<FactionId, number>;
        remaining_equipment: Record<FactionId, number>;
    };
    /** Phase II: OSID column movement report */
    osid_column_movement?: OsidColumnMovementReport;
    /** Officer quality growth/loss report */
    officer_quality_update?: OfficerQualityReport;
    /** Named officer succession report */
    officer_succession?: OfficerSuccessionReport;
}

export interface TurnContext {
    state: GameState;
    rng: Rng;
    input: TurnInput;
    report: TurnReport;
}

export type PhaseHandler = (context: TurnContext) => void | Promise<void>;

export interface NamedPhase {
    name: string;
    run: PhaseHandler;
}

// ═══════════════════════════════════════════════════════════════════════════
// Context caches and helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Operational data cached on TurnContext during load-operational-data step. */
export interface OperationalDataCache {
    opData: Awaited<ReturnType<typeof loadOperationalData>>;
    edges: Awaited<ReturnType<typeof loadOperationalEdges>>;
}

/** Type-safe accessor for operational data attached to context by load-operational-data step. */
export function getOperationalData(context: TurnContext): OperationalDataCache | undefined {
    return (context as TurnContext & { operationalData?: OperationalDataCache }).operationalData;
}

/** Type-safe setter for operational data on context. */
export function setOperationalData(context: TurnContext, data: OperationalDataCache): void {
    (context as TurnContext & { operationalData?: OperationalDataCache }).operationalData = data;
}

/** Siege state cached on TurnContext by compute-siege-state step (Phase F). Turn-local only. */
export interface SiegeStateCache { siegeRatios: SiegeRatioByMunFaction; }

/** Type-safe accessor for siege state attached to context. */
export function getSiegeStateCache(context: TurnContext): SiegeStateCache | undefined {
    return (context as TurnContext & { siegeStateCache?: SiegeStateCache }).siegeStateCache;
}

/** Type-safe setter for siege state on context. */
export function setSiegeStateCache(context: TurnContext, data: SiegeStateCache): void {
    (context as TurnContext & { siegeStateCache?: SiegeStateCache }).siegeStateCache = data;
}

/** Load settlement graph and edges from context (or default). */
export async function getGraphAndEdges(context: TurnContext): Promise<{ graph: LoadedSettlementGraph; edges: EdgeRecord[] }> {
    const graph = context.input.settlementGraph ?? (await loadSettlementGraph());
    const edges = context.input.settlementEdges && context.input.settlementEdges.length > 0
        ? context.input.settlementEdges
        : graph.edges;
    return { graph, edges };
}

// ═══════════════════════════════════════════════════════════════════════════
// Recruitment catalog cache
// ═══════════════════════════════════════════════════════════════════════════

export interface RecruitmentCatalogCache {
    base_dir: string;
    brigades: OobBrigade[];
    corps: OobCorps[];
    municipality_hq_settlement: Record<string, string>;
}

let recruitmentCatalogCache: RecruitmentCatalogCache | null = null;

export async function loadRecruitmentCatalog(): Promise<RecruitmentCatalogCache | null> {
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
