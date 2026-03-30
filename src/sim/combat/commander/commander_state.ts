/**
 * commander_state.ts — Type definitions for the v0.8 Corps Commander Intelligence system.
 *
 * All types for zone assessment, threat evaluation, force assessment, multi-turn planning,
 * intel picture, and the commander decision loop. Types only — no behavior.
 *
 * Determinism: no Math.random(), no Date.now(), no timestamps.
 */

import type {
    FactionId,
    FormationId,
    FormationState,
    CorpsOperation,
    CorpsDirective,
    SectorStance,
    CorpsFrontSector,
} from '../../../state/game_state.js';

import type { SpatialContext } from '../../spatial_context.js';
import type { FactionGraphAnalysis } from '../osid_graph_analysis.js';
import type { OsidEthnicComposition } from '../ethnic_defense.js';
import type { FrontGeometryAssessment } from '../front_geometry_analysis.js';

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
    readonly source: 'pre_planned' | 'reactive' | 'opportunity';
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
    /** Keep loose for now, tighten later. */
    readonly supply_by_osid: unknown;
    readonly ethnic_map: OsidEthnicComposition | null;
    readonly graph_analysis: FactionGraphAnalysis | null;
    readonly front_geometry: FrontGeometryAssessment | null;
    /** Keep loose for now, tighten later. */
    readonly intel_data: unknown;
    /** From bot_strategy doctrine phase. */
    readonly doctrine_stance: string;
    /** Current corps stance. */
    readonly corps_stance: string;
    readonly officer_personality: OfficerPersonality;
    /** Pre-planned ops for this corps. */
    readonly pre_planned_ops: readonly unknown[];
    /** Last turn's state for continuity. */
    readonly previous_state: CommanderState | null;
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
