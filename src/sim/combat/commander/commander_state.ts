/**
 * commander_state.ts — Type definitions for the v0.8 Corps Commander Intelligence system.
 *
 * All types for zone assessment, threat evaluation, force assessment, multi-turn planning,
 * intel picture, and the commander decision loop. Types only — no behavior.
 *
 * Determinism: no Math.random(), no Date.now(), no timestamps.
 */

import type {
    GameState,
    FactionId,
    FormationId,
    FormationState,
    CorpsOperation,
    CorpsDirective,
    SectorStance,
    CorpsFrontSector,
    SectorIntelRecord,
} from '../../../state/game_state.js';
import type { OperationalToCanonicalReverseMap } from '../../../data/operational_data.js';

import type { SpatialContext } from '../../spatial_context.js';
import type { FactionGraphAnalysis } from '../osid_graph_analysis.js';
import type { OsidEthnicComposition } from '../ethnic_defense.js';
import type { FrontGeometryAssessment } from '../front_geometry_analysis.js';
import type {
    FrontPriority,
    SyncOpParticipant,
} from '../army_hq_gathering_types.js';
import type { SupplyStateByOsidReport } from '../../../state/supply_state_derivation.js';

// ---------------------------------------------------------------------------
// 1. ZoneId — branded string for zone identification
// ---------------------------------------------------------------------------

/** Branded string identifying a connected component of corps territory. */
export type ZoneId = string & { readonly __brand: 'ZoneId' };

// ---------------------------------------------------------------------------
// 2. ZonePosture
// ---------------------------------------------------------------------------

/**
 * Posture of a zone, computed from geometry and force balance.
 * - besieged: corridor_width <= 1
 * - defending: deficit (garrison > available brigades)
 * - balanced: garrison met, small surplus
 * - projecting: large surplus, can launch ops
 */
export type ZonePosture = 'besieged' | 'defending' | 'balanced' | 'projecting';

// ---------------------------------------------------------------------------
// 3. ZoneAssessment — one per connected component of corps territory
// ---------------------------------------------------------------------------

export interface ZoneAssessment {
    readonly zone_id: ZoneId;
    readonly corps_id: FormationId;
    readonly faction: FactionId;
    /** All OSIDs in this zone. */
    readonly osids: readonly string[];
    /** Hostile boundary edges. */
    readonly front_edge_count: number;
    /** BFS depth from front to rear. */
    readonly depth: number;
    /** Narrowest connection to main body (BFS exits of width >= 2). */
    readonly corridor_width: number;
    /** Co-ethnic population at risk. */
    readonly population_value: number;
    /** Chokepoints, connectivity score. */
    readonly strategic_value: number;
    /** Computed from geometry. */
    readonly posture: ZonePosture;
    /** front_edges / assigned_brigades (SRK ~8.9 = fully committed). */
    readonly commitment_ratio: number;
    /** Min brigades needed (posture-dependent). */
    readonly garrison_budget: number;
    /** Brigades assigned to this zone. */
    readonly assigned_brigades: readonly FormationId[];
    /** Available for operations. */
    readonly surplus_brigades: readonly FormationId[];
    /** max(0, garrison_budget - assigned_brigades.length). */
    readonly deficit: number;
    /** Largest connected component. */
    readonly is_main_body: boolean;
    /** Enemy OSIDs adjacent to this zone's front (from sector sub_segments). */
    readonly enemy_adjacent_osids: readonly string[];
    /** Any sector covering this zone has must_hold=true. Derived each turn; not stored in scenario. */
    readonly is_must_hold: boolean;
}

// ---------------------------------------------------------------------------
// 4. ThreatAssessment
// ---------------------------------------------------------------------------

export interface ThreatAssessment {
    readonly threatened_zones: ReadonlyArray<{
        readonly zone_id: ZoneId;
        readonly threat_level: 'low' | 'medium' | 'high' | 'critical';
    }>;
    /** Zones where intel detects enemy massing. */
    readonly enemy_concentration_zones: readonly ZoneId[];
    readonly recent_losses: ReadonlyArray<{
        readonly zone_id: ZoneId;
        readonly osids_lost: readonly string[];
        readonly turn: number;
    }>;
    readonly overall_pressure: 'low' | 'moderate' | 'heavy' | 'critical';
}

// ---------------------------------------------------------------------------
// 5. BrigadeEvaluation — fitness scoring per brigade
// ---------------------------------------------------------------------------

export interface BrigadeEvaluation {
    readonly brigade_id: FormationId;
    /** personnel x supply x cohesion x equipment_priority x (not disrupted). */
    readonly fitness_offense: number;
    /** personnel x supply x cohesion x (1 + entrenchment) x 0.5. */
    readonly fitness_defense: number;
    /** Floor 0.2 even for depleted. */
    readonly fitness_garrison: number;
    /** From resolveEquipmentClass. */
    readonly equipment_class: string | undefined;
    /** From getEquipmentOffensivePriority (0-3). */
    readonly equipment_priority: number;
    /** Decisive Campaigns tiered assignment. */
    readonly tier: 'main_effort' | 'active_defense' | 'garrison';
    /** personnel >= 400. */
    readonly is_combat_effective: boolean;
    readonly is_disrupted: boolean;
    /** brigade.elite_loan_state?.on_loan — loaned to another corps, excluded from surplus pool. */
    readonly is_on_loan: boolean;
    /** brigade.home_defense_active — blocked from attack/assault posture at execution. */
    readonly is_home_defense: boolean;
    /** brigade.morale — used to gate critical-morale brigades out of ops selection. */
    readonly morale: number;
    readonly current_zone: ZoneId | null;
}

// ---------------------------------------------------------------------------
// 6. ForceAssessment
// ---------------------------------------------------------------------------

export interface ForceAssessment {
    readonly total_brigades: number;
    readonly combat_effective: number;
    readonly evaluations: readonly BrigadeEvaluation[];
    readonly by_zone: Readonly<Record<string, readonly BrigadeEvaluation[]>>;
    readonly tier_counts: {
        readonly main_effort: number;
        readonly active_defense: number;
        readonly garrison: number;
    };
    /** Sum of all zone surplus. */
    readonly total_surplus: number;
}

// ---------------------------------------------------------------------------
// 7. CommanderPlanStatus
// ---------------------------------------------------------------------------

export type CommanderPlanStatus =
    | 'concentrating'
    | 'ready'
    | 'executing'
    | 'suspended'
    | 'abandoned';

// ---------------------------------------------------------------------------
// 8. CommanderPlan — multi-turn intention
// ---------------------------------------------------------------------------

export interface CommanderPlan {
    readonly plan_id: string;
    readonly objective_description: string;
    readonly target_osids: readonly string[];
    readonly required_brigades: number;
    readonly assigned_brigades: readonly FormationId[];
    readonly staging_zone: ZoneId;
    readonly status: CommanderPlanStatus;
    readonly created_turn: number;
    readonly target_ready_turn: number;
    /** 0-1, fraction of required brigades at staging. */
    readonly concentration_progress: number;
    /** Re-evaluated each turn. */
    readonly viability_score: number;
    readonly suspension_reason?: string;
    /** Turn when the plan was first suspended. Used for MAX_SUSPENSION_TURNS timeout. */
    readonly suspended_since_turn?: number;
    readonly source: 'pre_planned' | 'reactive' | 'opportunity';
    /** Phase 4 (Force Quality Foundation): true when force-quality readiness gated this plan
     *  (operation_readiness < threshold). The plan is downgraded — concentration window extended,
     *  axis count capped — but not deleted. See `../corps_operation_readiness.ts`. */
    readonly force_quality_blocked?: boolean;
    /** Phase 4: snapshot of the seven readiness traits at plan-creation time + the input
     *  snapshot that produced them. Carried into the operation lifecycle so it can be
     *  copied into the AAR at finalize and surfaced in decision_trace. */
    readonly force_quality_traits?: ForceQualityPlanSnapshot;
    /** Phase 4: max axes cap derived from `axis_coordination` (1 when low). 0 = no cap. */
    readonly force_quality_max_axes?: number;
}

/**
 * Phase 4 (Force Quality Foundation): per-plan snapshot of readiness traits +
 * the inputs that produced them. Embedded in CommanderPlan and copied into
 * the AAR at finalize. Player-safe diagnostic — same numbers already in state.
 */
export interface ForceQualityPlanSnapshot {
    readonly traits: import('../corps_operation_readiness.js').CorpsOperationReadinessTraits;
    readonly inputs: import('../corps_operation_readiness.js').CorpsOperationReadinessInputSnapshot;
    readonly applied_gate: 'none' | 'soft_block' | 'axis_cap' | 'staging_extended' | 'soft_block+axis_cap' | 'soft_block+staging_extended' | 'axis_cap+staging_extended' | 'soft_block+axis_cap+staging_extended';
}

// ---------------------------------------------------------------------------
// 9. SectorActivityEntry
// ---------------------------------------------------------------------------

export interface SectorActivityEntry {
    readonly sector_id: string;
    readonly turn: number;
    readonly activity: 'quiet' | 'skirmish' | 'active' | 'contested' | 'overrun';
    readonly enemy_strength_estimate: number;
    readonly own_casualties: number;
}

// ---------------------------------------------------------------------------
// 10. OperationHistoryEntry
// ---------------------------------------------------------------------------

export interface OperationHistoryEntry {
    readonly operation_name: string;
    readonly type: string;
    readonly started_turn: number;
    readonly ended_turn: number;
    readonly outcome: 'success' | 'partial' | 'stalemate' | 'failure' | 'abandoned';
    readonly osids_captured: readonly string[];
    readonly osids_lost: readonly string[];
    readonly casualties_inflicted: number;
    readonly casualties_suffered: number;
}

// ---------------------------------------------------------------------------
// 11. IntelPicture
// ---------------------------------------------------------------------------

export interface IntelPicture {
    /** 0-1 confidence per zone. */
    readonly zone_confidence: Readonly<Record<string, number>>;
    /** sector_id -> detected offensive signs. */
    readonly offensive_signs: Readonly<Record<string, number>>;
    /** sector_id -> enemy massing. */
    readonly concentration_detected: Readonly<Record<string, boolean>>;
    readonly last_updated_turn: number;
}

// ---------------------------------------------------------------------------
// 11b. EnemyEquipmentSummary
// ---------------------------------------------------------------------------

export interface EnemyEquipmentSummary {
    /** Sum of enemy tanks across adjacent enemy sectors. */
    readonly tanks: number;
    /** Sum of enemy artillery across adjacent enemy sectors. */
    readonly artillery: number;
    /** True when no heavy equipment is detected in adjacent enemy sectors. */
    readonly infantry_only: boolean;
}

export interface AdjacentCorpsSummary {
    readonly corps_id: FormationId;
    readonly stance: string;
    readonly active_operations: number;
}

// ---------------------------------------------------------------------------
// 11c. CommanderIntelData — typed intel payload for briefing
// ---------------------------------------------------------------------------

/**
 * Structured intel data assembled from sector_intel records and opsec state.
 * Replaces the previous `unknown` typing on CommanderBriefing.intel_data.
 */
export interface CommanderIntelData {
    readonly sector_intel: Readonly<Record<string, readonly SectorIntelRecord[]>>;
    readonly opsec_active_sectors: readonly string[];
}

// ---------------------------------------------------------------------------
// 12a. CommanderBeliefState — v0.8.1: perception layer, distinct from raw truth
// ---------------------------------------------------------------------------

/**
 * Belief about a specific zone's enemy posture.
 * Diverges from raw state as intel degrades or concentrates.
 */
export interface ZoneBelief {
    readonly zone_id: ZoneId;
    /** Estimated total enemy headcount adjacent to this zone. */
    readonly estimated_enemy_strength: number;
    /** Inferred enemy intent from observed signals. */
    readonly estimated_enemy_intent: 'hold' | 'probe' | 'attack' | 'mass' | 'unknown';
    /** 0-1, composite confidence in this belief. */
    readonly confidence: number;
    /** Last turn this belief was confirmed by direct observation. */
    readonly last_confirmed_turn: number;
}

/**
 * Commander's perception of the world — not raw GameState truth.
 * Built from intel, sector activity, and prior beliefs. Decays without confirmation.
 */
export interface CommanderBeliefState {
    readonly zone_beliefs: readonly ZoneBelief[];
    /** Composite confidence in supply continuity for this corps area. 0-1. */
    readonly supply_continuity_confidence: number;
    /** Per-subordinate reliability score (brigade_id -> 0-1). */
    readonly subordinate_reliability: Readonly<Record<string, number>>;
    /** Per-neighboring-corps cooperation confidence (corps_id -> 0-1). */
    readonly neighbor_support_confidence: Readonly<Record<string, number>>;
}

// ---------------------------------------------------------------------------
// 12b. CommanderRelationships — v0.8.1: trust model for order interpretation
// ---------------------------------------------------------------------------

/**
 * Functional relationship model — directly supports future order interpretation,
 * trust-sensitive compliance, sibling cooperation, and patron dependence.
 */
export interface CommanderRelationships {
    /** Player trust in this commander. 0-1, starts at faction default. */
    readonly player_trust: number;
    /** Trust toward sibling corps commanders. corps_id -> 0-1. */
    readonly sibling_corps_trust: Readonly<Record<string, number>>;
    /** Alignment with faction patron/political authority. 0-1. */
    readonly patron_alignment: number;
}

// ---------------------------------------------------------------------------
// 12c. CommanderLesson — v0.8.1: outcome memory affecting future scoring
// ---------------------------------------------------------------------------

/** Categories of operational lessons extracted from history. */
export type CommanderLessonCategory =
    | 'offensive_failure'
    | 'defensive_failure'
    | 'reserve_misuse'
    | 'intel_surprise'
    | 'staging_delay'
    | 'success_pattern';

/**
 * A structured lesson extracted from operational history.
 * Lessons decay over time and influence candidate intent scoring.
 */
export interface CommanderLesson {
    readonly lesson_id: string;
    readonly category: CommanderLessonCategory;
    /** Zone where the lesson was learned, if zone-specific. */
    readonly zone_id?: ZoneId;
    /** OSIDs involved in the original event, for cooldown matching. */
    readonly relevant_osids?: readonly string[];
    /** Scoring weight: positive reinforces, negative inhibits. */
    readonly weight: number;
    /** Turn this lesson was created. */
    readonly created_turn: number;
    /** Turn after which this lesson is discarded. Undefined = permanent. */
    readonly expires_turn?: number;
}

// ---------------------------------------------------------------------------
// 12d. CommanderIntentCandidate — v0.8.1: competing intent types
// ---------------------------------------------------------------------------

/** The types of strategic intent a commander can pursue. */
export type CommanderIntentType =
    | 'hold_line'
    | 'reinforce_zone'
    | 'stage_operation'
    | 'launch_opportunity'
    | 'thin_quiet_sector'
    | 'recall_exposed_brigades'
    | 'request_army_support';

/**
 * A scored candidate intent. Multiple candidates are generated per turn;
 * the winner becomes the active plan or action.
 */
export interface CommanderIntentCandidate {
    readonly intent_id: string;
    readonly type: CommanderIntentType;
    /** Target zone, if zone-specific. */
    readonly target_zone?: ZoneId;
    /** Composite score — higher wins. */
    readonly score: number;
    /** Factor-by-factor score breakdown for trace inspection. */
    readonly score_breakdown: Readonly<Record<string, number>>;
    /** Hard constraints that block this candidate. Empty = eligible. */
    readonly blocked_by: readonly string[];
}

// ---------------------------------------------------------------------------
// 12e. CommanderDecisionTrace — v0.8.1: structured reasoning audit trail
// ---------------------------------------------------------------------------

/**
 * Per-turn structured decision trace.
 * Records what the commander considered, what won, and why.
 */
export interface CommanderDecisionTrace {
    readonly turn: number;
    /** ID of the winning intent, or null if no action taken. */
    readonly winning_intent_id: string | null;
    /** All candidates evaluated this turn. */
    readonly candidates: readonly CommanderIntentCandidate[];
    /** Hard constraints that applied this turn (e.g. 'insufficient_supply'). */
    readonly hard_constraints: readonly string[];
    /** Lesson IDs that influenced scoring this turn. */
    readonly lessons_applied: readonly string[];
    /** Relationship modifiers applied this turn (e.g. 'player_trust:stage_operation'). Phase 5. */
    readonly relationships_applied: readonly string[];
    /** Phase 4 (Force Quality Foundation): per-turn snapshot of force-quality readiness traits +
     *  the input snapshot that produced them. Player-safe diagnostic — same numbers already in
     *  state. Engineering-only surface; not displayed to the player without further surface work. */
    readonly force_quality_traits?: ForceQualityPlanSnapshot;
}

// ---------------------------------------------------------------------------
// 12. CommanderState — persistent per corps, lives on CorpsCommandState
// ---------------------------------------------------------------------------

export interface CommanderState {
    zone_assessments: ZoneAssessment[];
    threat_assessment: ThreatAssessment;
    force_assessment: ForceAssessment;
    current_plan: CommanderPlan | null;
    sector_activity_log: SectorActivityEntry[];
    operation_history: OperationHistoryEntry[];
    intel_picture: IntelPicture;
    /** Min brigades per zone. */
    garrison_budget: Record<string, number>;
    last_assessment_turn: number;
    /** Last plan lifecycle action taken this turn. 'none' = no plan change. */
    last_plan_action?: 'created' | 'advanced' | 'suspended' | 'abandoned' | 'launched' | 'none';
    /** Reason string for the last plan action. Player-safe explanation of why. */
    last_plan_reason?: string;

    // ── v0.8.1 Commander Maturity fields (Phase 1: defaults only) ──

    /** Perception layer — diverges from raw state as intel degrades. */
    belief_state?: CommanderBeliefState;
    /** Functional trust model for order interpretation. */
    relationships?: CommanderRelationships;
    /** Lessons extracted from operational history. */
    lessons?: readonly CommanderLesson[];
    /** Last turn's decision trace (most recent only; history in operation_history). */
    decision_trace?: CommanderDecisionTrace;
}

// ---------------------------------------------------------------------------
// 13. OfficerPersonality — deterministic from existing officer data
// ---------------------------------------------------------------------------

export interface OfficerPersonality {
    /** 0-1, willingness to attack at marginal ratios. */
    readonly aggression: number;
    /** 0-1, reserve holdback fraction. */
    readonly caution: number;
    /** 0-1, exploit unexpected opportunities. */
    readonly initiative: number;
    /** 0-1, from existing officer data. */
    readonly competence: number;
}

// ---------------------------------------------------------------------------
// 14. CommanderBriefing — assembled each turn as input to commander loop
// ---------------------------------------------------------------------------

export interface CommanderBriefing {
    readonly corps_id: FormationId;
    readonly faction: FactionId;
    readonly turn: number;
    readonly spatial: SpatialContext;
    readonly sectors: readonly CorpsFrontSector[];
    readonly brigades: readonly FormationState[];
    /** Optional readonly state snapshot for exact launch-time feasibility filters. */
    readonly state_ref?: GameState;
    /** Optional reverse map for OSID combat prediction at emit time. */
    readonly reverse_map?: OperationalToCanonicalReverseMap | null;
    readonly supply_by_osid: SupplyStateByOsidReport | null;
    readonly ethnic_map: OsidEthnicComposition | null;
    readonly graph_analysis: FactionGraphAnalysis | null;
    readonly front_geometry: FrontGeometryAssessment | null;
    readonly intel_data: CommanderIntelData | null;
    /** From bot_strategy doctrine phase. */
    readonly doctrine_stance: string;
    /** Current corps stance. */
    readonly corps_stance: string;
    /** Current corps-level exhaustion (0-100). */
    readonly corps_exhaustion: number;
    /** Faction-level war exhaustion (monotonic, unbounded). Engine Invariants §8. */
    readonly faction_war_exhaustion: number;
    /** Average subordinate brigade fatigue as 0-100 percent of FATIGUE_MAX. */
    readonly avg_fatigue_pct: number;
    /** Number of subordinate brigades at or above the high-fatigue threshold. */
    readonly brigades_above_fatigue_threshold: number;
    /** Summary of heavy equipment across enemy sectors facing this corps. */
    readonly enemy_equipment_summary: EnemyEquipmentSummary;
    /** Friendly neighboring corps with brigades physically adjacent to this corps area. */
    readonly adjacent_corps: readonly AdjacentCorpsSummary[];
    readonly officer_personality: OfficerPersonality;
    /** Pre-planned ops for this corps. */
    readonly pre_planned_ops: readonly unknown[];
    /** Last turn's state for continuity. */
    readonly previous_state: CommanderState | null;
    /** Active operations currently running for this corps (from CorpsCommandState). */
    readonly active_operations: readonly CorpsOperation[];
    /** Objective cooldowns recorded by the operation lifecycle after repeated failures. */
    readonly failed_offensive_objectives?: Readonly<Record<string, { failure_count: number; cooldown_until_turn: number }>>;
    /** Scenario-authored must-hold OSIDs for this corps. Zones containing these get 1.5× garrison budget. */
    readonly must_hold_osids: readonly string[];
    /** Army HQ campaign front role for this corps, if a current gathering plan exists. */
    readonly campaign_role: FrontPriority['role'] | null;
    /** Army HQ offensive target shortlist for this corps. */
    readonly campaign_offensive_targets: readonly string[];
    /** Army HQ hold-at-all-costs targets for this corps. */
    readonly campaign_hold_targets: readonly string[];
    /** Army HQ stance ceiling for this corps from doctrine override. */
    readonly campaign_stance_ceiling: FrontPriority['suggested_stance'] | null;
    /** Role inside any synchronized multi-corps operation currently naming this corps. */
    readonly campaign_sync_role: SyncOpParticipant['role'] | null;
    /** Target OSIDs from the synchronized operation participant slice, if present. */
    readonly campaign_sync_targets: readonly string[];
    /** Canonical A3/C1 directive deviation reason when this corps received a deviated campaign role. */
    readonly campaign_role_deviation_reason?: 'aggressive_preference' | 'cautious_preference' | 'compliance_score_low';
    /** Phase E MVS: optional propagation of strategic-dimension values into the
     *  commander briefing surface. Populated by `buildBriefing` only when the
     *  two-tier political-dimension propagation gate
     *  (`isIntlStandingOpsHesitationActive`) is ON. Field is OMITTED when the
     *  gate is OFF — mirrors `campaign_role_deviation_reason`'s optional-field
     *  pattern. Byte-stability contract: consumers (sector_offensive op-launch
     *  hesitation) gate on `!== undefined` so the flag-OFF path is identical to
     *  pre-Phase-E briefings. */
    readonly political_dimensions?: {
        /** Effective international_standing value (0..100) for this corps's faction,
         *  sourced from `state.military.negotiation.strategic_dimensions[faction]
         *  .international_standing.effective_value`. */
        readonly international_standing?: number;
    };
}

// ---------------------------------------------------------------------------
// 15. CommanderOutput — what the commander loop produces
// ---------------------------------------------------------------------------

export interface CommanderOutput {
    readonly directive: CorpsDirective;
    readonly operations: readonly CorpsOperation[];
    readonly sector_stances: ReadonlyArray<{
        readonly sector_id: string;
        readonly stance: SectorStance;
    }>;
    readonly updated_state: CommanderState;
    readonly garrison_locks: ReadonlyArray<{
        readonly brigade_id: FormationId;
        readonly zone_id: ZoneId;
        readonly reason: string;
    }>;
    readonly reinforcement_requests: ReadonlyArray<{
        readonly zone_id: ZoneId;
        readonly brigades_needed: number;
        readonly priority: 'critical' | 'high' | 'medium' | 'low';
    }>;
    readonly plan_updates: ReadonlyArray<{
        readonly plan_id: string;
        readonly action: 'advance' | 'suspend' | 'abandon';
        readonly reason: string;
    }>;
    /** Main-effort brigade prepositioning: move unreachable high-value surplus
     *  brigades toward the nearest front-adjacent friendly OSID in their sector.
     *  Consumed by applyCommanderOutput → brigade_movement_orders. */
    readonly prepositioning_orders: ReadonlyArray<{
        readonly brigade_id: FormationId;
        readonly destination_osid: string;
    }>;
}

// ---------------------------------------------------------------------------
// 16. ICorpsCommander — the interface
// ---------------------------------------------------------------------------

export interface ICorpsCommander {
    decide(
        briefing: CommanderBriefing,
        previousState: CommanderState | null,
    ): CommanderOutput;
}
