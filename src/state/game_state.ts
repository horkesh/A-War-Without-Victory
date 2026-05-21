/**
 * CANONICAL GameState schema definition.
 *
 * This file is the SINGLE SOURCE OF TRUTH for all GameState types.
 * Do not duplicate type definitions elsewhere.
 *
 * Phase A consolidation: Merged with schema.ts.
 * schema.ts now re-exports from this file for backward compatibility.
 *
 * Canon constraints (Engine Invariants v0.3.0, CANON.md):
 * - 1 game turn = 1 week (meta.turn is integer weeks; no dates/timestamps in state).
 * - No serialization of derived states (Engine Invariants §13.1–§13.2); derived state must be recomputed each turn.
 * - Political control exists independently; must be initialized deterministically before other systems (Engine Invariants §9.2, Rulebook §4).
 * - No randomness / no timestamps in state or derived artifacts (Engine Invariants §11.1–§11.2).
 *
 * Deterministic ordering (Engine Invariants §11.3):
 * - Allowed collection shapes: Record<Id, T> or Map-like structures. When producing arrays from
 *   maps/records (e.g. for output or deterministic comparison), always use sorted keys (e.g. by
 *   id localeCompare). If using Map: convert to arrays via sorted keys before any output or
 *   deterministic comparisons. See validateGameState.ts sortedKeysForRecord().
 *
 * Includes:
 * - Core types (FactionId, FormationId, MunicipalityId, etc.)
 * - All interface definitions (GameState, FactionState, FormationState, etc.)
 * - Phase 3C collapse eligibility types
 * - Phase 5B/5D exposure types
 * - Phase 12C/12D treaty types
 * - Phase 21/22 displacement and sustainability types
 */
import type { BrigadeHistory } from './brigade_history.js';
import type { OperationWeeklyEntry, PendingOperationCasualties, OperationAAR } from '../sim/combat/operation_aar.js';
import type { OpInjectionWarning } from '../sim/combat/operation_validation.js';
import type { CasualtyLedger } from './casualty_ledger.js';
import type { CombatSummary } from './combat_summary.js';
import type { BrigadeDecoration } from './decoration_types.js';
import type { EliteLoanState, ArmyReserveRequest, EliteBrigadeTracker, ArmyReserveDecisionRecord } from './elite_loan_types.js';
import type { BrigadeWarStory } from '../sim/war_stories.js';
import type { ArmyLabel } from './identity.js';
import type { RecruitmentResourceState } from './recruitment_types.js';
import type { CommanderState } from '../sim/combat/commander/commander_state.js';

export const CURRENT_SCHEMA_VERSION = 14 as const;

// --- ID types (canonical) ---
export type FactionId = string;
/** Alias for faction identity in political control and authority contexts. */
export type FactionKey = FactionId;
/** The three canonical factions in AWWV. */
export const CANONICAL_FACTIONS: readonly FactionId[] = ['RBiH', 'RS', 'HRHB'] as const;

export type FormationId = string;

export type MunicipalityId = string;

export type PostureLevel = 'hold' | 'probe' | 'push';

// --- Brigade Operations System types ---

/** Brigade posture (War phase). Controls pressure output, defensive resilience, and exhaustion rate. */
export type BrigadePosture = 'hold' | 'defend' | 'defend_at_all_costs' | 'elastic_defense' | 'counterattack' | 'dig_in' | 'attack' | 'assault';

/** Equipment condition for a typed equipment category (tanks, artillery). */
export interface EquipmentCondition {
    operational: number;  // fraction [0,1]
    degraded: number;     // fraction [0,1]
    non_operational: number; // fraction [0,1]
}

/** Typed brigade composition: what a brigade is made of beyond headcount. */
export interface BrigadeComposition {
    infantry: number;      // personnel with small arms
    tanks: number;         // MBTs and APCs
    artillery: number;     // howitzers, mortars, MLRS
    aa_systems: number;    // anti-aircraft systems
    tank_condition: EquipmentCondition;
    artillery_condition: EquipmentCondition;
}

/** AoR reshape order: transfer a settlement from one brigade to another. */
export interface BrigadeAoROrder {
    settlement_id: SettlementId;
    from_brigade: FormationId;
    to_brigade: FormationId;
}

/** Brigade municipality movement order: replace brigade municipality assignment for this turn. (Legacy; AoR removed.) */
export type BrigadeMunicipalityOrder = Record<FormationId, MunicipalityId[] | null>;

/**
 * Legacy AoR keys: present only when loading old saves. Do not write; not serialized.
 * Use for transition casts where code still reads during AoR phase-out.
 */
export interface LegacyBrigadeAoRState {
    brigade_aor?: Record<SettlementId, FormationId | null>;
    brigade_aor_orders?: BrigadeAoROrder[];
    brigade_mun_orders?: BrigadeMunicipalityOrder;
    brigade_municipality_assignment?: Record<FormationId, MunicipalityId[]>;
}

/** Cast state to include legacy AoR keys (read-only; do not assign). Used during AoR phase-out. */
export function getLegacyAoR(state: GameState): LegacyBrigadeAoRState {
    return state as GameState & LegacyBrigadeAoRState;
}

/** Brigade posture order: set a brigade's posture. */
export interface BrigadePostureOrder {
    brigade_id: FormationId;
    posture: BrigadePosture;
}

/** Brigade movement status (Brigade AoR Redesign Phase C: pack/unpack cycle). */
export type BrigadeMovementStatus = 'deployed' | 'packing' | 'in_transit' | 'unpacking';

/** Deployment posture action staged by UI/IPC. */
export type BrigadeDeployAction = 'deploy' | 'undeploy';

/** Per-brigade movement state. When status is in_transit, brigade has no AoR. */
export interface BrigadeMovementState {
    status: BrigadeMovementStatus;
    /** Movement posture: combat (default) or column (undeployed). */
    stance?: 'combat' | 'column';
    /** Destination settlement(s) (1–4 contiguous). Set when packing or in_transit. */
    destination_sids?: SettlementId[];
    /** Path through friendly territory (current segment when in_transit). Sorted for determinism. */
    path?: SettlementId[];
    /** Turns remaining in transit. Decremented each turn. */
    turns_remaining?: number;
}

/** Pending movement order consumed by combat/column movement systems. */
export interface BrigadeMovementOrder {
    /** Destination settlement(s), normally 1-4 contiguous faction-controlled settlements. */
    destination_sids: SettlementId[];
    /** Movement posture. Column orders are undeployed operational marches. */
    stance?: 'combat' | 'column';
}

/** Corps standing stance (always active, modifies subordinate brigades). */
export type CorpsStance = 'defensive' | 'balanced' | 'offensive' | 'reorganize';

/** Political directive from a faction's patron state (e.g., Zagreb for HVO). */
export interface PatronDirective {
    name: string;
    start_week: number;
    end_week: number;
    /** Maximum corps stance allowed under this directive. */
    stance_ceiling: CorpsStance;
    description: string;
}

/** Army-level stance (overrides corps stances when set). */
export type ArmyStance = 'general_defensive' | 'balanced' | 'general_offensive' | 'total_mobilization';

/** Operation preparation sub-phase (within planning phase). */
export type PreparationSubPhase = 'intel_gathering' | 'force_staging' | 'supply_check' | 'assessment' | 'ready' | 'waiting_for_sync';

/** Commander's go/no-go recommendation at end of preparation. */
export type CommanderAssessment = 'launch' | 'postpone' | 'abort';

/** Active probe sub-action during operation preparation. */
export interface OperationActiveProbe {
    target_osid: string;
    brigade_ids: FormationId[];
    started_turn: number;
    resolved: boolean;
    result_confidence_gain?: number;
}

// --- Sector-facing intelligence (replaces legacy SID-keyed recon_intelligence) ---

/** Estimated enemy sector strength from sector-pair observation. */
export type SectorStrengthCategory = 'unknown' | 'thin' | 'moderate' | 'dense' | 'fortress';

/** Observed enemy posture across a shared front boundary. */
export type SectorPostureObserved = 'unknown' | 'defensive' | 'entrenched' | 'offensive_prep';

/**
 * Per-friendly-sector, per-enemy-sector intelligence record.
 * Keyed: sector_intel[friendly_sector_id] = SectorIntelRecord[].
 * One record per enemy sector that shares front edges with the friendly sector.
 */
export type SectorStrengthClass = 'fortress' | 'strong' | 'adequate' | 'thin' | 'critical';

export interface SectorCombatRating {
    sector_id: string;
    faction: string;
    /** Total attack power of all sector brigades. */
    offensive_power: number;
    /** Total defense power across all edges. */
    defensive_power: number;
    /** defensive_power / edge_count. */
    defense_per_edge: number;
    /** Raw headcount in sector. */
    personnel: number;
    /** Average morale (0-100). */
    morale_avg: number;
    /** Average cohesion (0-100). */
    cohesion_avg: number;
    /** Average fatigue (0-30). */
    fatigue_avg: number;
    /** Front edges to defend. */
    edge_count: number;
    /** Active brigades in sector. */
    brigade_count: number;
    /** Comparative strength class. */
    strength_class: SectorStrengthClass;
}

export type SectorIntelSource = 'passive_contact' | 'patrol' | 'scout' | 'combat';

export interface SectorIntelOsidConfidence {
    osid: string;
    /** Current OSID-level intelligence confidence [0.0, 1.0]. */
    confidence: number;
    /** Sorted low-level observation sources contributing to this estimate. */
    sources: SectorIntelSource[];
}

export interface SectorIntelRecord {
    enemy_sector_id: string;
    enemy_faction: FactionId;
    enemy_corps_id: FormationId;
    /** Number of front edges shared between friendly and enemy sector (always known). */
    front_edge_count: number;
    /** Estimated enemy density/strength. Requires confidence >= CONFIDENCE_ROUGH_STRENGTH. */
    strength_category: SectorStrengthCategory;
    /** Observed enemy posture. Requires confidence >= CONFIDENCE_FULL_STRENGTH. */
    posture_observed: SectorPostureObserved;
    /** True if enemy offensive preparation detected. Requires confidence >= CONFIDENCE_DEEP_INTEL and recon_range >= 2. */
    offensive_signs: boolean;
    /** Current intelligence confidence [0.0, 1.0]. Drives all observable thresholds. */
    confidence: number;
    /** Consecutive turns this sector pair has been in contact (sharing front edges). */
    turns_in_contact: number;
    /** Enemy brigade IDs visible at current confidence level. Empty when confidence < CONFIDENCE_FRONT_BRIGADES. */
    visible_brigade_ids: FormationId[];
    /** Optional bounded confidence for front-visible enemy OSIDs. Sorted by OSID. */
    osid_confidence?: SectorIntelOsidConfidence[];
    /** Turn this record was last updated. */
    last_updated_turn: number;
}

/**
 * Independent axis of advance within a multi-axis operation.
 * Each axis has its own contiguous objective chain and assigned brigades.
 * Multiple axes can converge on a shared terminal objective.
 */
export interface OperationAxis {
    axis_id: string;
    name: string;
    assigned_brigades: FormationId[];
    /** Designated main effort brigade — highest basePower at launch. Full combat power. */
    main_brigade?: FormationId;
    /** All other brigades on this axis. Reduced combat power, reduced casualties. */
    support_brigades?: FormationId[];
    objectives: string[];
    current_objective_index: number;
    status: 'executing' | 'stalled' | 'complete';
    failure_count: number;
    consecutive_failures_on_current: number;
    momentum: number;
    last_result?: 'captured' | 'failed' | 'stalemate' | 'approach';
    attack_attempt_count: number;
    objective_capture_count: number;
    movement_only_execution_turns: number;
    idle_execution_turn_streak: number;
    /** Consecutive turns where attack on current objective resulted in catastrophic outcome.
     *  After 2 consecutive catastrophics on the same target, axis stalls — no commander
     *  sends men to die at the same fortified position three turns running. */
    consecutive_catastrophic_on_current?: number;
    /** Friendly OSID where this axis's brigades stage during planning. */
    staging_osid?: string;
    /** Diagnostic (write-only): set true at launch-readiness check when this axis's
     *  current objective has zero approach OSIDs (front-unreachable from any friendly
     *  position). Does NOT change execution flow — silent-skip behavior is preserved.
     *  The op still launches on its other axes; this axis stays in 'executing' but
     *  never attacks. Persists through to AxisAAR for post-mortem visibility.
     *  See LATE_WAR_OPERATION_COMBAT_DELIVERY_MEGA_LANE Phase C, sector_offensive_launch_helpers.ts. */
    unreachable_at_launch?: boolean;
    /** Typed diagnostic for axes that fail the opening-attack launch gate. */
    launch_blocker?: 'participants_below_attack_floor' | 'no_approach_osid' | 'zero_eligible_axis' | 'recent_catastrophic_losses_at_objective';
}

/** Named corps operation (multi-turn: planning → execution → recovery). */
export interface CorpsOperation {
    name: string;
    type: 'general_offensive' | 'sector_attack' | 'strategic_defense' | 'reorganization' | 'feint' | 'probe';
    phase: 'planning' | 'execution' | 'recovery';
    started_turn: number;
    phase_started_turn: number;
    target_settlements?: SettlementId[];
    participating_brigades: FormationId[];
    // --- Multi-axis structure (standard for all operations) ---
    /** Independent axes of advance. When present, per-axis fields drive execution. */
    axes?: OperationAxis[];
    // --- Sector offensive fields (type === 'sector_attack') ---
    /**
     * Primary sector anchor — the sector this operation is anchored to.
     * Under the sector-anchored launch contract (Phase 3), this must be set at launch
     * and the default eligible brigade pool must be derived from this sector's assigned brigades.
     * Do NOT add a separate `primary_sector_id` field — this IS the primary sector anchor.
     */
    sector_id?: string;

    // --- Sector-anchored launch contract — Phase 2 scaffolding (not yet populated) ---
    /** Sectors explicitly contributing attachments or accepting transferred risk. */
    supporting_sector_ids?: string[];
    /** Brigade IDs drawn from the primary sector at launch time. Stored for traces. Deterministic order. */
    primary_sector_brigades?: string[];
    /** Brigade IDs from outside the primary sector, explicitly attached as reinforcements. Deterministic order. */
    attached_brigades?: string[];
    /** Why non-primary brigades are present. Absent = all brigades from primary sector. */
    reinforcement_source?: 'adjacent_sector' | 'corps_reserve' | 'army_loan';
    /** Ordered OSID targets (legacy flat list — used when axes is absent). */
    objectives?: string[];
    /** Next OSID to attack (legacy — used when axes is absent). */
    current_objective_index?: number;
    /** Turns of preparation required (from scope). */
    planning_duration?: number;
    /** Fraction of participating brigades with adequate supply (0-1). */
    supply_readiness?: number;
    /** Consecutive objective captures (legacy — used when axes is absent). */
    momentum?: number;
    /** Result of last objective attack (legacy — used when axes is absent). */
    last_result?: 'captured' | 'failed' | 'stalemate' | 'approach';
    /** Total failures across all objectives (legacy — used when axes is absent). */
    failure_count?: number;
    /** Consecutive failures on current objective (legacy — used when axes is absent). */
    consecutive_failures_on_current?: number;
    /** Friendly OSID where brigades stage during planning phase. */
    staging_osid?: string;
    /** Cumulative objective attack attempts (legacy — used when axes is absent). */
    attack_attempt_count?: number;
    /** Cumulative objectives captured (legacy — used when axes is absent). */
    objective_capture_count?: number;
    /** Execution turns spent maneuvering (legacy — used when axes is absent). */
    movement_only_execution_turns?: number;
    /** Consecutive idle execution turns (legacy — used when axes is absent). */
    idle_execution_turn_streak?: number;
    /** Operation-specific attack approval override. */
    min_attack_outcome?: CorpsDirective['min_attack_outcome'];
    /** Operation tempo preset. */
    tempo?: 'methodical' | 'standard' | 'all_out';
    /** Main effort objective. */
    schwerpunkt_osid?: string;
    /** First-turn artillery preparation toggle. */
    artillery_preparation?: boolean;
    /** Launch immediately from planning when set. */
    force_launch?: boolean;
    /** True if this operation was ever force-launched by the player. Permanent — not cleared on recovery. */
    was_force_launched?: boolean;
    /** Internal consumption flag for artillery preparation. */
    artillery_preparation_consumed?: boolean;
    /** Dig in participating brigades when manually halted. */
    dig_in_on_halt?: boolean;
    /** Reason the operation entered recovery. */
    recovery_reason?: 'completed' | 'max_failures' | 'orphaned_sector' | 'no_logged_attempt' | 'manual_termination' | 'probe_complete' | 'brigade_attrition' | 'political_blocked' | 'planning_invalidated' | 'no_launch_readiness' | 'defender_power_too_high' | 'participants_below_attack_floor' | 'no_approach_osid' | 'zero_eligible_axis';
    /** Named officer commanding this operation (if any). */
    commander_officer_id?: string;
    /** True when this operation was launched from the pre-planned operations catalog
     *  (vs auto-generated by the bot during a sector offensive). Used for theater-aware
     *  follow-on suppression: only pre-planned ops reset the inter-theater cooldown. */
    is_pre_planned?: boolean;

    // --- Operation preparation sub-phases (within planning) ---
    /** Current sub-phase of preparation (only meaningful when phase === 'planning'). */
    preparation_sub_phase?: PreparationSubPhase;
    /** Turns elapsed in preparation (incremented each turn while phase === 'planning'). */
    preparation_turns_elapsed?: number;
    /** Max preparation turns before forced decision (derived from commander aggressiveness). */
    preparation_max_turns?: number;
    /** Intel confidence snapshot at assessment time (for briefing display). */
    intel_confidence_at_assessment?: number;
    /** Supply readiness snapshot at assessment time (for briefing display). */
    supply_readiness_at_assessment?: number;
    /** Commander's estimated force ratio (accuracy depends on intel + competence). */
    force_ratio_estimate?: number;
    /** Commander's go/no-go recommendation. */
    commander_assessment?: CommanderAssessment;
    /** Snapshot of commander's go/no-go recommendation at the moment of presidential approval or force-launch.
     *  Set once at decision time; never recomputed. Survives recovery reset. */
    commander_assessment_at_launch?: CommanderAssessment;
    /** Number of postponements (max 2 before forced abort). */
    postponement_count?: number;
    /** Active probe sub-action within preparation. */
    active_probe?: OperationActiveProbe;

    // --- AAR accumulator fields (populated during lifecycle) ---
    /** Per-turn log entries for the operation AAR. */
    weekly_log?: OperationWeeklyEntry[];
    /** Total personnel of participating brigades at operation start. */
    initial_strength?: number;
    /** Pending casualties from battles this turn (drained into weekly_log). */
    pending_casualties?: PendingOperationCasualties;
    /** Previous turn's objective control snapshot for diff (OSID→faction). */
    _prev_objective_state?: Record<string, string | null>;

    /** True when this is an emergency defensive operation (bypasses slot limit, max 1). */
    is_emergency?: boolean;

    /** Turns remaining before a player-ordered halt takes effect.
     *  Set by interpretOperationHalt. Decremented per-turn in Phase 3 decay step.
     *  When it reaches 0, recovery_reason = 'manual_termination' is written. */
    halt_delay_turns_remaining?: number;

    // --- Synchronized operation fields (Army HQ Gathering v0.4.7) ---
    /** If part of a synchronized operation, the sync op name */
    sync_operation_name?: string;
    /** Earliest turn to launch (from sync window) */
    sync_launch_after?: number;

    // --- Corps-wide operation reinforcement (brigade concentration) ---
    /** Brigades loaned from other sectors for this operation, with source tracking. */
    loaned_brigades?: Array<{
        brigade_id: FormationId;
        source_sector_id: string;
        arrived: boolean;
    }>;

    // --- Combat feedback counters (for API commanders / GUI) ---
    /** Battles conducted this turn (reset each turn). */
    battles_this_turn?: number;
    /** OSIDs captured this turn (reset each turn). */
    territory_gained_this_turn?: number;
    /** Total battles since operation started. */
    total_battles?: number;
    /** Total OSIDs captured since operation started. */
    total_territory_gained?: number;

    // --- Reevaluation diagnostics ---
    /** Log of reevaluation checks (when brigades are lost mid-operation). */
    reevaluation_log?: Array<{
        turn: number;
        reason: string;
        decision: 'continue' | 'abort';
        active_brigades: number;
        total_personnel: number;
    }>;

    // --- Phase 4 (Force Quality Foundation) — readiness trait snapshot ---
    /** Snapshot of force-quality readiness traits + the input snapshot at plan-creation
     *  time. Populated when the operation was emitted from a commander plan with
     *  force_quality_traits attached. Carried through the lifecycle and copied into
     *  the AAR at finalize. Optional + zero-default for back-compat with prior saves. */
    force_quality_traits_at_launch?: import('../sim/combat/commander/commander_state.js').ForceQualityPlanSnapshot;
    /** Phase 4: true if force-quality readiness gated the proposal (operation_readiness < threshold).
     *  Diagnostic flag — does not affect combat math. */
    force_quality_blocked_at_launch?: boolean;
    /** Phase 4: max axes derived from axis_coordination soft gate; 1 means single-axis only. */
    force_quality_max_axes_at_launch?: number;
}

/** Independent sector stances — each sector can differ from its corps stance. */
export type SectorStance = 'fortify' | 'defend' | 'elastic' | 'active_defense' | 'screening';

export interface SectorStanceOrder {
    sector_id: string;
    /** New: sets sector_stance directly (not brigade postures). */
    stance: SectorStance;
}

/**
 * Corps-level directive: what the corps commander tells subordinate brigades to do.
 * Generated each turn by bot_corps_ai.ts; consumed by bot_brigade_ai_osid.ts.
 * Replaces per-brigade strategic scoring — brigades execute, corps decides.
 *
 * Deterministic: all arrays sorted by strictCompare.
 */
export interface CorpsDirective {
    /** Front segments this corps is responsible for covering. */
    assigned_front_ids: string[];
    /** OSIDs the corps wants attacked this turn (priority-sorted, highest first). */
    offensive_targets: string[];
    /** OSIDs that must be held at all costs (chokepoints, enclaves, corridors). */
    hold_osids: string[];
    /** OSIDs to avoid attacking (heartland, political constraints). */
    avoid_osids: string[];
    /** Maximum simultaneous attackers per target OSID. */
    max_attackers_per_target: number;
    /** Fraction of subordinate brigades to keep in reserve (0.0–0.5). */
    reserve_fraction: number;
    /** Minimum predicted outcome to approve an attack. */
    min_attack_outcome: 'decisive_victory' | 'victory' | 'costly_victory' | 'stalemate' | 'repulsed';
    /** Aggression modifier from doctrine phase (-0.1 to 0.15). */
    aggression_modifier: number;
    /** Per-sector offensive targets (sector_id → target OSIDs). Multi-sector corps only. */
    sector_targets?: Record<string, string[]>;
    /** Sector IDs that are under-density and need brigade reinforcement. */
    reinforce_sector_ids?: string[];
    /** Priority sector for offensive concentration (sector with most offensive targets). */
    priority_sector_id?: string;
    /** Explicit brigade-to-sector reassignment orders from density equalization.
     *  Brigade AI reads these and issues column march orders to move brigades to their assigned sector. */
    sector_reassignment_orders?: Array<{ brigade_id: string; to_sector_id: string }>;
}

/**
 * Army HQ directive forcing a corps to launch an operation.
 * Rare — army commander overriding corps-level caution for strategic necessity.
 */
export interface ArmyHQOverride {
    corps_id: string;
    operation_name: string;
    min_brigades: number;
    target_osids: string[];
    reason: string;
    issued_turn: number;
    type: 'offensive' | 'probe' | 'feint';
    max_brigades?: number;
}

/** Per-corps command state. */
export interface CorpsCommandState {
    command_span: number;
    subordinate_count: number;
    og_slots: number;
    active_ogs: FormationId[];
    corps_exhaustion: number;
    stance: CorpsStance;
    active_operations: CorpsOperation[];
    reserves_committed_until_turn?: number;
    /** Corps directive for subordinate brigades (generated each turn by corps AI). */
    directive?: CorpsDirective | null;
    /** Queue of operation names to inject when current op completes. */
    queued_operations?: string[];
    /** Number of consecutive probe operations launched without a full attack. Reset on full op or completion. */
    consecutive_probes?: number;
    /** Last completed operation — used for theater-aware follow-on suppression. */
    last_completed_operation?: CorpsOperation | null;
    /** Turn on which the last operation completed — used for post-op cooldown. */
    last_completed_operation_turn?: number;
    /**
     * Per-OSID failure tracking for offensive targets.
     * Maps OSID → { failure_count, cooldown_until_turn }.
     * When an objective is attempted N times without capture, it enters a cooldown
     * period and is excluded from future targeting until the cooldown expires.
     * Prevents suicidal repeated assaults on hardened positions.
     */
    failed_offensive_objectives?: Record<string, { failure_count: number; cooldown_until_turn: number }>;
    /** True if this corps was decided by AI commander this turn. Formula bot skips AI-decided corps. */
    ai_decided?: boolean;
    /** AI commander's assessment text for this corps (displayed in UI). */
    ai_assessment?: string;
    /** Diagnostic: why this corps is/isn't launching operations. */
    status_reason?: string;
    /** Diagnostic: gate audit trace for operation launch evaluation. */
    op_launch_trace?: string[];
    /** Latest commander-generated reinforcement pressure signals for Army HQ consumption. */
    commander_reinforcement_requests?: Array<{
        zone_id: string;
        brigades_needed: number;
        priority: 'critical' | 'high' | 'medium' | 'low';
    }>;
    /** Persistent commander state for v0.8 intelligent corps AI. */
    commander_state?: CommanderState;
    /** Turn number when command stabilization cooldown expires (Wave 4). Set after Stabilize action. */
    stabilization_cooldown_until?: number;
    /** Player's raw ordered stance before officer interpretation. Set when player issues stance order. Cleared at turn end. */
    player_ordered_stance?: string | null;
    /** Formula bot's recommended stance computed this turn. Set by generateCorpsStanceOrders; read by Level 1 proposal generation. */
    ai_recommended_stance?: CorpsStance;
    /** v0.8.4 Phase D: Player response to op proposal at Level 1. Cleared each turn by apply-autonomy-transition. */
    player_op_response?: { plan_id: string; approved: boolean; turn: number };
}

/** Operational group activation order. */
export interface OGActivationOrder {
    corps_id: FormationId;
    donors: Array<{ brigade_id: FormationId; personnel_contribution: number }>;
    focus_settlements: SettlementId[];
    posture: BrigadePosture;
    max_duration: number;
}

/** Settlement holdout state (Peace phase settlement-level control). */
export interface SettlementHoldoutState {
    holdout: boolean;
    holdout_faction: FactionId;
    /** Attacker currently attempting to clear the holdout (may not yet control settlement). */
    occupying_faction?: FactionId;
    holdout_resistance: number;
    holdout_since_turn: number;
    /** Turns without supply connection to same-faction territory. */
    isolated_turns: number;
}

/**
 * Canonical phase names (game phase, not turn sub-phase).
 * Phase 0 = Pre-War; Peace phase = Early War (Phase_Specifications_v0_3_0, Phase_0/Phase_I specs).
 */
export type PhaseName = 'peace' | 'war';

export interface FormationAssignment {
    kind: 'region' | 'edge' | 'sector';
    region_id?: string;
    edge_id?: string;
    /** Sector ID when kind === 'sector'. Set by brigade-to-sector sync. */
    sector_id?: string;
    /** Role within sector: 'front', 'reserve', or 'rear' (sector-attached but not at the line). */
    role?: 'front' | 'reserve' | 'rear';
}

export interface FormationOpsState {
    fatigue: number; // integer >= 0, irreversible in Phase 10
    last_supplied_turn: number | null; // null or <= current turn
}

// Peace phase.0: Formation lifecycle states (Systems Manual §5)
export type FormationReadinessState = 'forming' | 'active' | 'overextended' | 'degraded';

// Peace phase.0: Formation types (Systems Manual §4)
export type FormationKind = 'militia' | 'brigade' | 'operational_group' | 'corps_asset' | 'corps' | 'og' | 'army_hq' | 'jna_phantom' | 'hv_phantom' | 'paramilitary';

export interface FormationState {
    id: FormationId;
    faction: FactionId;
    name: string;
    created_turn: number;
    status: 'active' | 'inactive';
    assignment: FormationAssignment | null;
    tags?: string[]; // optional, descriptive only, no gameplay meaning
    ops?: FormationOpsState; // Phase 10: operational degradation tracking
    force_label?: ArmyLabel; // optional, presentational army label (ARBiH/VRS/HVO) for visibility
    // Peace phase.0: Formation organization substrate
    kind?: FormationKind; // default: 'brigade' for backward compatibility
    /** Troops in formation. Brigades: spawn at MIN_BRIGADE_SPAWN (1000), reinforce from pool up to MAX_BRIGADE_PERSONNEL (2500). When absent, treat as 1000. */
    personnel?: number;
    readiness?: FormationReadinessState; // default: 'active' for backward compatibility
    cohesion?: number; // [0,100] formation cohesion, affects effectiveness and collapse risk
    /** Willingness to fight [0,100]. Non-monotonic. Distinct from cohesion (tactical effectiveness). Gates retreat resistance. */
    morale?: number;
    experience?: number; // [0,1] formation experience (Peace phase / System 10)
    /** Unit honor/decoration title. Affects combat power: slavna (1.10×), viteska (1.20×). ARBiH decoration system; reflects veteran status and battle-hardened capability. */
    honor?: 'slavna' | 'viteska';
    activation_gated?: boolean; // true if activation is blocked by time, authority, or supply constraints
    activation_turn?: number | null; // turn when formation activated (null if still forming)
    // System 3: Heavy equipment state.
    equipment_state?: EquipmentState;
    // System 9: Doctrine eligibility and activation.
    doctrine_state?: DoctrineState;
    /** HQ settlement for map placement and clickable icon. When set, icon is drawn at this settlement; when absent, fallback to municipality centroid. */
    hq_sid?: SettlementId;
    /** Operational settlement ID (OSID). Set at creation from hq_sid via canonical_to_operational_map. */
    location_osid?: SettlementId;
    // --- Brigade Operations System fields ---
    /** Brigade posture (War phase). Default: 'hold'. */
    posture?: BrigadePosture;
    /** True when brigade is defending its ethnic homeland (auto-set by posture system). */
    home_defense_active?: boolean;
    /** Countdown from 2 after a retreat; 0 = expired. Enables counterattack posture eligibility. */
    counterattack_window_turns?: number;
    /** Dig-in construction progress [0.0, 1.0]; full effect at >= 0.75; resets on displacement/move. */
    dig_in_progress?: number;
    /** Parent corps formation ID (null = unattached). */
    corps_id?: FormationId | null;
    /** Typed brigade composition (tanks, artillery, infantry). */
    composition?: BrigadeComposition;
    /** Equipment class for progression (police → light_infantry → mountain). See recruitment_types.EquipmentClass. */
    equipment_class?: string;
    /** 1-turn disruption flag from AoR reshaping; reduces pressure output. */
    disrupted?: boolean;
    /** Turns on current OSID without moving; resets on move; caps at MAX_ENTRENCHMENT (6). */
    entrenchment_turns?: number;
    /** HoI: consecutive successful defenses; resets on move or attacker success; caps at MAX_RESILIENCE_STREAK (4). */
    defense_streak?: number;
    /** HoI: turns remaining disrupted (0 = not disrupted); set by push-back outcome. */
    disrupted_turns?: number;
    /** Consecutive turns at morale 0; after 3+, 5% personnel attrition per turn. */
    zero_morale_turns?: number;
    /**
     * LANE-NIGHTSHIFT-N4-CANON-AMENDMENT (Engine Invariants v0.7.0 §6.2.4 +
     * Systems Manual v0.7.0 §6.4, 2026-05-03): consecutive turns at
     * morale <= MORALE_OVERRIDE_THRESHOLD (15). Increments each turn when
     * morale <= 15; resets to 0 when morale > 20 (5-point hysteresis band).
     * When this counter reaches MORALE_OVERRIDE_TURNS (8), the brigade
     * dissolves on the next dissolution check regardless of personnel cap —
     * BUT ONLY when the env flag MORALE_OVERRIDE_ENABLED is true (shadow-flag
     * default-off; counter increments either way for diagnostic visibility).
     * Save/load: persisted; absent on legacy saves deserializes to 0.
     */
    morale_low_streak?: number;
    /** How many battle outcomes this formation has processed through morale drift. Used for habituation — diminishing morale effect of combat over time. */
    battle_outcome_count?: number;
    /** Per-brigade personnel cap. When set, overrides MAX_BRIGADE_PERSONNEL for reinforcement. Derived from OOB max_personnel field. Varies by formation type and faction — historical brigades ranged from 1500 (enclave) to 3500 (mechanized). */
    max_personnel?: number;
    /** WIA trickleback: wounded pending return to this formation (only return when out of combat). */
    wounded_pending?: number;
    /** Counter-attack tracking: OSID this brigade retreated from and the turn it happened.
     *  Only the retreated brigade may initiate a counter-attack against this OSID next turn. */
    last_retreat_from?: { osid: string; turn: number };
    /** Fog of war: OSID where this brigade's attack was repulsed/catastrophic.
     *  Lifts fog for this target — brigade learned enemy strength the hard way. */
    last_repulsed_from?: { osid: string; turn: number };
    // Peace-phase Overhaul: proto-brigade lifecycle tracking
    /** Municipality where formation originally emerged (for naming displaced-origin brigades). */
    origin_mun?: string;
    /** Municipality the brigade's soldiers originally came from (refugees/displaced). Informational. */
    displaced_from?: string;
    /** Turn when formation was promoted to its current kind. */
    promoted_turn?: number;
    /** OOB brigade catalog entry matched on promotion (inherits name/corps/equipment). */
    matched_oob_id?: string;
    /** Per-brigade terrain defense bonus from OOB (e.g. mountain/fortified position). Multiplicative: × (1 + bonus). */
    defense_terrain_bonus?: number;
    /** When set, formation recruits from this faction's militia pools instead of its own. Cross-faction recruitment (e.g. HVO-designation ARBiH brigades recruiting from Croatian pools). */
    recruit_pool_faction?: FactionId;
    /** Fallback OSID where brigade reforms if stranded with no retreat path. Set from OOB. */
    fallback_osid?: string;
    /** Stranded brigade lifecycle status. 'none' = not stranded, 'holding' = isolated and degrading,
     *  'reconnected' = friendly path restored (clears next turn), 'collapsed' = dissolved.
     *  Managed by update-stranded-brigade-lifecycle pipeline step. */
    stranded_status?: 'none' | 'holding' | 'reconnected' | 'collapsed';
    /** Turn when brigade first became stranded (entered 'holding' status). */
    stranded_since_turn?: number;
    /** Last turn when brigade was reachable to a same-corps sector front via friendly OSID path. */
    last_reachable_turn?: number;
    /** Origin OSID — where this brigade was raised / permanently based. Used for home distance effectiveness. Set at creation, never changes. */
    home_osid?: string;
    /** Elite reserve base OSID used for return after loan termination/recall. */
    base_osid?: string;
    /** Sub-segment this brigade is assigned to defend (AoR). Derived each turn. */
    assigned_sub_segment_id?: string;
    /** Garrison unit — only defends, never attacks. Set from OOB (e.g. VRS 65th Protection Regiment). */
    garrison?: boolean;
    /** Target OSID for paramilitary sweep. When set, this paramilitary unit marches to and captures this OSID, then dissolves. */
    paramilitary_target?: string;
    /** Turns remaining until paramilitary unit reaches target and captures it. */
    paramilitary_eta?: number;
    /** Paramilitary mode: 'rear_pocket' (default) or 'offensive' (Drina valley ethnic cleansing). */
    paramilitary_mode?: 'rear_pocket' | 'offensive';

    /** Fractional scavenge accumulator — sub-integer amounts from battlefield scavenging.
     *  When a brigade scavenges 0.3 tanks from a battle, it's stored here.
     *  When the accumulator reaches ≥1.0, a whole unit is granted and debited. */
    scavenge_accumulator?: { tanks: number; artillery: number };

    // --- OOB Rework: Brigade history, decorations, elite loan, lifecycle ---
    /** Brigade combat history (engagement log + running tallies). Initialized on first battle or at creation. */
    brigade_history?: BrigadeHistory;
    /** Decorations awarded to this brigade (earned during the war). Highest tier bonus applies (no stacking). */
    decorations?: BrigadeDecoration[];
    /**
     * Historical distinction potential: this unit has the character to earn this tier.
     * Reduces decoration-earning thresholds by ~30% (tier_1) / 35% (tier_2/3).
     * Set from OOB for units that earned decorations in the historical war; replaces
     * the old `historical_decorations` start-of-war pre-award.
     */
    distinction_potential?: 'tier_1' | 'tier_2' | 'tier_3';
    /** Elite loan lifecycle state (army-level elite units only). */
    elite_loan_state?: EliteLoanState;
    /** Formation lifecycle status. Default 'active'. Set by lifecycle event processing. */
    lifecycle_status?: 'active' | 'forming' | 'disbanded' | 'merged' | 'destroyed' | 'withdrawn' | 'displaced';
    /** Turn when formation was destroyed (for reconstitution delay calculation). */
    destruction_turn?: number;
    /** Turn at which a JNA phantom brigade withdraws (equipment handed off, formation removed). */
    withdrawal_turn?: number;
    /** VRS equipment decay factor [0,1]. Applied as multiplier to equipment ratio. 1.0 = full effectiveness, 0.6 = floor. */
    equipment_decay?: number;
    /** Brigade officer quality [0,1]. Abstracted command competence at brigade level. Grows with combat experience, decays with casualties. Faction defaults: VRS starts high (~0.55), ARBiH starts low (~0.05), HVO stable (~0.225). */
    officer_quality?: number;
    /** Progressive war story — regenerated each war turn from brigade_history. */
    war_story?: BrigadeWarStory;
    /** Corps/Army aggregate combat summary — computed each war turn from subordinate brigade_histories. */
    combat_summary?: CombatSummary;
}

export interface FrontPostureAssignment {
    edge_id: string;
    posture: PostureLevel;
    // integer >= 0, default 0 (allocation counter; no effects yet)
    weight: number;
}

export interface FrontPostureState {
    // keyed by edge_id
    assignments: Record<string, FrontPostureAssignment>;
}

export interface FrontRegionPostureAssignment {
    region_id: string;
    posture: PostureLevel;
    weight: number;
}

export interface FrontRegionPostureState {
    // keyed by region_id
    assignments: Record<string, { posture: PostureLevel; weight: number }>;
}

export interface FrontPressureState {
    edge_id: string;
    // signed pressure: positive means “side_a advantage”, negative means “side_b advantage”
    // side_a / side_b are derived from current front_edges snapshot when present
    value: number; // integer, can be negative
    max_abs: number; // maximum absolute value observed
    last_updated_turn: number;
}

export interface FrontEdgeState {
    edge_id: string;
    a: SettlementId;
    b: SettlementId;
    side_a: FactionId | null;
    side_b: FactionId | null;
}

export interface FrontSegmentState {
    edge_id: string;
    active: boolean;
    created_turn: number;
    since_turn: number;
    last_active_turn: number;
    // Deterministic scaffolding for future static-front hardening (no mechanics yet).
    // consecutive turns currently active (0 if inactive)
    active_streak: number;
    // maximum active_streak ever achieved
    max_active_streak: number;
    // Deterministic scaffolding for future pressure/supply/exhaustion coupling (no mechanics yet).
    // current friction counter (integer >= 0)
    friction: number;
    // maximum friction ever observed (integer >= 0)
    max_friction: number;
}

/**
 * HoI-style assignable front segment (contiguous hostile boundary component).
 * Distinct from edge-keyed front_segments used for friction/hardening scaffolding.
 */
export interface AssignableFrontSegmentState {
    front_id: string;
    edge_ids: string[];
    side_a: FactionId | null;
    side_b: FactionId | null;
    /** Deterministic proxy for segment extent (edge count for now). */
    length_edges: number;
    /** Optional player/scenario label (e.g. "Sarajevo line"). */
    name?: string;
    /** Phase 3 planned: theatre ownership for this segment. */
    theatre_id?: string;
}

export interface TheatreState {
    id: string;
    name: string;
    faction: FactionId;
    army_ids?: FormationId[];
    region_scope?: MunicipalityId[];
}

export interface AuthorityProfile {
    authority: number;
    legitimacy: number;
    control: number;
    logistics: number;
    exhaustion: number;
}

export interface PatronState {
    material_support_level: number; // 0..1
    diplomatic_isolation: number; // 0..1
    constraint_severity: number; // 0..1
    patron_commitment: number; // 0..1
    last_updated: number; // turn index
}

export interface InternationalVisibilityPressure {
    sarajevo_siege_visibility: number; // 0..1
    enclave_humanitarian_pressure: number; // 0..1
    atrocity_visibility: number; // 0..1
    negotiation_momentum: number; // 0..1
    composite_ivp?: number; // 0..1
    last_major_shift: number | null; // turn index
}

export interface PendingConvoyDecision {
    id: string;
    target_enclave: string;
    route_faction: FactionId;
    supply_amount: number;
    decision?: 'allow' | 'block' | 'divert';
}

/** Paramilitary deployment request for a rear enemy pocket. */
export interface ParamilitaryRequest {
    /** Target OSID to capture. */
    target_osid: string;
    /** Faction requesting deployment. */
    faction: FactionId;
    /** Estimated paramilitary strength (personnel). */
    strength: number;
    /** Projected civilian casualties as an integer count. Required for player-facing ask-mode review. */
    estimated_civilian_risk?: number;
    /** Player decision: 'allow' deploys paramilitary, 'deny' skips, 'regular' flags for corps priority. */
    decision?: 'allow' | 'deny' | 'regular';
}

export type MunicipalitySupportType =
    | 'weapons_shipment'
    | 'staff_priority'
    | 'croatian_support_package';

export interface MunicipalitySupportOrder {
    faction: FactionId;
    mun_id: MunicipalityId;
    type: MunicipalitySupportType;
    staged_turn: number;
}

export interface EmbargoProfile {
    heavy_equipment_access: number; // 0..1
    ammunition_resupply_rate: number; // 0..1
    maintenance_capacity: number; // 0..1
    smuggling_efficiency: number; // 0..1
    external_pipeline_status: number; // 0..1
}

export interface MaintenanceCapacity {
    base_capacity: number; // 0..1
    skilled_technicians: number; // 0..1
    spare_parts_availability: number; // 0..1
    workshop_access: number; // 0..1
    external_support: number; // 0..1
}

export interface CapabilityProfile {
    year: number;
    equipment_access?: number; // 0..1
    equipment_operational?: number; // 0..1
    training_quality: number; // 0..1
    organizational_maturity: number; // 0..1
    croatian_support?: number; // 0..1
    doctrine_effectiveness?: Record<string, number>;
}

export interface EquipmentState {
    operational_heavy: number;
    degraded_heavy: number;
    non_operational_heavy: number;
    total_heavy: number;
    maintenance_deficit: number; // 0..1
    last_maintenance: number | null; // turn index
}

export type WatchedOperationBlocker =
    | ''
    | 'active_primary_corps'
    | 'active_secondary_corps'
    | 'cooldown_decline_state'
    | 'already_owned_objectives'
    | 'empty_live_axes'
    | 'validation_warning'
    | 'validation_blocker'
    | 'build_failure'
    | 'accepted_injected';

export interface WatchedOperationTraceRow {
    operation_id: string;
    operation_name: string;
    canonical_window: string;
    catalog_status: 'present' | 'missing' | 'not_applicable';
    eligibility_status: 'eligible' | 'not_eligible' | 'unknown';
    launch_status: 'launched' | 'blocked' | 'not_launched' | 'unknown';
    delivery_status: 'blocked' | 'unknown' | 'missing';
    blocker_code: WatchedOperationBlocker | string;
    typed_blocker: WatchedOperationBlocker | string;
    turn: number;
}

export type DoctrineType = 'INFILTRATE' | 'ARTILLERY_COUNTER' | 'COORDINATED_STRIKE' | 'STATIC_DEFENSE' | 'ATTACK' | 'DEFEND';

export interface DoctrineState {
    active: DoctrineType | null;
    eligible: Record<DoctrineType, boolean>;
    active_turns: number;
}

export interface NegotiationState {
    pressure: number; // integer >= 0, monotonically non-decreasing
    last_change_turn: number | null; // null or <= current turn
    // Phase 12A: Negotiation capital (spendable leverage currency)
    capital: number; // integer >= 0, can go up/down
    spent_total: number; // integer >= 0, monotonic
    last_capital_change_turn: number | null; // null or <= current turn
}

export interface FactionState {
    id: FactionId;
    profile: AuthorityProfile;
    // No map yet: keep as generic IDs for future AoR assignment.
    areasOfResponsibility: string[];
    // Input-only field for supply reachability reporting (no gameplay effects yet).
    supply_sources: string[]; // settlement sids
    // System 1: Patron pressure and IVP effects.
    patron_state?: PatronState;
    // System 2: Arms embargo asymmetry profile.
    embargo_profile?: EmbargoProfile;
    // System 3: Maintenance capacity (per faction).
    maintenance_capacity?: MaintenanceCapacity;
    // System 10: Capability progression profile.
    capability_profile?: CapabilityProfile;
    // Command capacity for Phase 9: integer >= 0, default 0 (no extra capacity configured).
    // If > 0, applies global scaling when total demand exceeds capacity.
    command_capacity?: number;
    // Phase 11A: Negotiation pressure accounting (no deal-making yet).
    negotiation?: NegotiationState;
    // Phase 0: Pre-War Capital (non-renewable). RS=100, RBiH=70, HRHB=40 (Phase_0_Spec §4.1).
    prewar_capital?: number;
    // Phase 0: Declaration pressure accumulation; declares when >= 100 (Phase_0_Spec §4.4).
    declaration_pressure?: number;
    // Phase 0: Faction has declared (RS or HRHB independence).
    declared?: boolean;
    // Phase 0: Turn when faction declared; null if not declared.
    declaration_turn?: number | null;
}

export interface MilitiaPoolState {
    mun_id: MunicipalityId;
    /** Faction for (mun_id, faction) pool. Non-null for composite-key pools. */
    faction: FactionId | null; // null allowed for legacy single-per-mun pools
    available: number; // integer >= 0
    committed: number; // integer >= 0, reserved for later conversion to formations
    exhausted: number; // integer >= 0, reserved for later attrition and displacement effects
    updated_turn: number; // integer, last mutation turn, deterministic from state.meta.turn (NOT wall clock)
    tags?: string[]; // optional labels, no mechanics
    fatigue?: number; // Phase 10: integer >= 0, irreversible operational degradation
}

/**
 * Formation spawn directive (FORAWWV H2.4). When present and active for current turn, pipeline may run formation spawn.
 */
export interface FormationSpawnDirective {
    /** Which kind to spawn: militia only, brigade only, or both (militia first by policy). */
    kind?: 'militia' | 'brigade' | 'both';
    /** Turn when directive is active; if absent, active when present. */
    turn?: number;
    /** Allow forming formations from displaced when conditions met. */
    allow_displaced_origin?: boolean;
}

// Phase 21: Population displacement state (per municipality)
export interface DisplacementState {
    mun_id: MunicipalityId;
    original_population: number; // immutable baseline from census or existing data
    displaced_out: number; // cumulative, irreversible (people who left this municipality)
    displaced_in: number; // cumulative (people who arrived from other municipalities)
    /** When set, displaced_in is split by recruiting faction (Bosniak→RBiH, Serb→RS, Croat→HRHB) so pool population can add to the correct faction's pool at this mun. */
    displaced_in_by_faction?: Partial<Record<FactionId, number>>;
    lost_population: number; // cumulative (killed, emigrated, unreachable - abstracted)
    last_updated_turn: number; // integer, last mutation turn
    /** OSID-level tracking: origin OSID → count displaced from. */
    displaced_out_by_osid?: Record<string, number>;
    /** OSID-level tracking: destination OSID → count settled in. */
    displaced_in_by_osid?: Record<string, number>;
}

/** Per-event displacement record for tracking and reporting. Sorted by (turn, origin_mun). */
/** Single OSID control-change event. Used by GUI battle-markers layer; does not affect simulation. */
export interface ControlEvent {
    turn: number;
    settlement_id: string;
    mechanism: 'combat' | 'consolidation' | 'abandoned' | 'event';
    from: string | null;
    to: string | null;
    mun_id?: string;
    /** Deterministic join key: {turn}:{osid}:{attacker_brigade}:{defender_brigade|null} */
    battle_id?: string;
    /** Brigade that attacked to cause this control change. */
    attacker_brigade?: string;
}

export interface DisplacementEvent {
    turn: number;
    origin_mun: MunicipalityId;
    origin_osid?: string;
    dest_mun: MunicipalityId;
    dest_osid?: string;
    ethnicity: FactionId;
    /** Faction controlling the origin OSID at time of displacement (the causer). */
    caused_by?: FactionId;
    displaced: number;
    killed: number;
    fled_abroad: number;
    settled: number;
}

/**
 * War phase: delayed hostile-takeover displacement timer.
 * Starts on settlement control flip (when factions are at war) and matures after N turns.
 */
export interface HostileTakeoverTimerState {
    mun_id: MunicipalityId;
    from_faction: FactionId;
    to_faction: FactionId;
    started_turn: number;
    /** Set when initial displacement fires. Undefined = still in 4-turn countdown. */
    matured_turn?: number;
    /** Cumulative persons displaced from this OSID (initial + all sustained rounds). */
    cumulative_displaced?: number;
}

/**
 * War phase: temporary municipality holding pool (camp simulation) prior to rerouting.
 */
export interface DisplacementCampState {
    mun_id: MunicipalityId;
    population: number;
    started_turn: number;
    by_faction: Partial<Record<FactionId, number>>;
}

/**
 * War phase: non-takeover minority flight (settlement-level).
 * Tracks gradual (RBiH 50% over 26 turns) or completed (HRHB/RS 100% immediate).
 * Key: SettlementId. Canon: displacement redesign 2026-02-17.
 */
export interface MinorityFlightStateEntry {
    started_turn: number;
    cumulative_fled: number;
    target_faction: FactionId;
    /** Initial minority population at settlement when flight started (for 50% cap). */
    initial_minority_pop: number;
}

// Phase 22: Sustainability collapse state (per municipality)
export interface SustainabilityState {
    mun_id: MunicipalityId;
    is_surrounded: boolean;
    unsupplied_turns: number; // integer >= 0, consecutive turns without supply
    sustainability_score: number; // integer 0-100, monotonic decreasing
    collapsed: boolean; // true when sustainability_score <= 0
    last_updated_turn: number; // integer, last mutation turn
}

/**
 * Peace phase (Early War): JNA withdrawal and asset transfer state (Phase_I_Spec §4.6).
 * War start remains referendum-gated; JNA transition does not start the war.
 */
export interface JNATransitionState {
    /** True when RS has declared and JNA withdrawal has begun. */
    transition_begun: boolean;
    /** Withdrawal progress [0, 1]; 0.05 per turn per spec. */
    withdrawal_progress: number;
    /** Asset transfer to RS (VRS) [0, 1]; 5% per turn per spec. */
    asset_transfer_rs: number;
}

/**
 * Peace-phase §4.8: RBiH–HRHB bilateral relationship state.
 * Tracks the full lifecycle: fragile alliance → strain → open war → ceasefire → Washington Agreement.
 * All fields deterministic; no timestamps or randomness.
 */
export interface RbihHrhbState {
    /** Turn when alliance crossed below HOSTILE_THRESHOLD (0.0); null if war not started. */
    war_started_turn: number | null;
    /** Turn when alliance first dropped below ALLIED_THRESHOLD (0.20); null if not yet. Mobilization period starts here. */
    mobilization_started_turn: number | null;
    /** True when bilateral ceasefire preconditions met and ceasefire fired. */
    ceasefire_active: boolean;
    /** Turn when ceasefire was established; null if not yet. */
    ceasefire_since_turn: number | null;
    /**
     * True when Washington Agreement signing PREDICATE has fired (Path A or
     * Path B preconditions in `src/sim/early_war/washington_agreement.ts`).
     *
     * SEMANTIC NOTE — distinct from the calendar event:
     * - This flag (`washington_signed`) fires when sim conditions converge on
     *   the W1-W6 (diplomatic) or P1-P3 (patron-override) gates clearing. The
     *   timing is emergent from gameplay state and may differ from the
     *   historical date.
     * - The CALENDAR event `washington_agreement_1994` (in
     *   `state.military.event_last_fired_turn`) fires on a fixed historical
     *   schedule (~w101 from April 1992 = March 18, 1994) regardless of state.
     *
     * Consumers gating on bilateral combat suppression (e.g.,
     * `battle_resolution.ts:914`) read THIS flag, not the calendar event.
     * Per #29 sub-issue 3 — leave names as-is; the semantics ARE different.
     */
    washington_signed: boolean;
    /** Turn when Washington was signed; null if not yet. */
    washington_turn: number | null;
    /** Consecutive turns with 0 bilateral RBiH-HRHB flips (stalemate counter). */
    stalemate_turns: number;
    /** Bilateral flips counted this turn (reset per turn; consumed by next turn's alliance update). */
    bilateral_flips_this_turn: number;
    /** Weighted territorial competition incidents counted this turn; consumed by next turn's alliance update. */
    territorial_incidents_this_turn: number;
    /** Cumulative bilateral flips since war started. */
    total_bilateral_flips: number;
    /** Dynamic list of municipalities with both RBiH and HRHB formations/pools. Sorted deterministically. */
    allied_mixed_municipalities: string[];
    /** Per-faction corps temporarily diverted to the RBiH-HRHB bilateral front. */
    bilateral_diverted_corps?: Partial<Record<FactionId, FormationId>>;
    /** Per-faction release progress after ceasefire/Washington, in turns. */
    bilateral_corps_release_progress?: Partial<Record<FactionId, number>>;
}

export interface NegotiationStatus {
    ceasefire_active: boolean;
    ceasefire_since_turn: number | null;
    last_offer_turn: number | null;
    /** Per-faction turn of last counter-offer emission; enforces one counter per turn. */
    last_counter_turn?: Record<FactionId, number>;
}

export interface CeasefireFreezeEntry {
    since_turn: number;
    until_turn: number | null; // null for indefinite
}

/**
 * v0.8.4: Records a player override of a specific AI-proposed decision.
 * Stored on state.meta.autonomy_overrides for the current turn.
 * Cleared by apply-autonomy-transition at the start of each turn.
 */
export interface AutonomyOverride {
    turn: number;
    level: 'army' | 'corps' | 'event';
    target_id: string;
    faction: FactionId;
}

/**
 * v0.8.4 Phase B: An AI-generated proposal waiting for player review at Level 1 (Assisted).
 * Created by the formula AI when autonomy_level === 1. Player must accept/reject via IPC.
 */
export interface PendingProposalReview {
    /** Deterministic: "PROP_<turn>_<domain>_<seq>" */
    id: string;
    turn: number;
    faction: FactionId;
    domain: 'military' | 'political' | 'events' | 'ops';
    /** Human-readable summary of the proposal. */
    description: string;
    /** Canonical action identifier. */
    proposed_action: string;
    /** Set when player responds; absent = pending. */
    accepted?: boolean;
    /**
     * Rich decision for operation-opportunity reviews. This preserves the
     * war-pipeline ownership boundary: desktop IPC records intent here, then
     * apply-resolved-opportunity-decisions consumes it next turn.
     */
    opportunity_decision?: 'approve' | 'delay' | 'redirect' | 'under_resource' | 'decline';
    opportunity_decision_options?: {
        redirect_variant_id?: string;
        delay_turns?: number;
        commitment_profile?: 'minimum' | 'standard' | 'reinforced';
    };
    /** Turn when player responded. */
    resolved_turn?: number;
    /** The value currently active (e.g. current corps stance). */
    current_value?: string;
    /** The value the AI is proposing (e.g. proposed corps stance). */
    proposed_value?: string;
}

/**
 * World-level deterministic bookkeeping (Engine Invariants §11).
 * Conceptually "WorldState": current_turn (weeks), phase, seed.
 * No timestamps; no randomness. Turn is integer weeks only.
 * Phase 0: Referendum and war-start gating (Phase_0_Spec §4.5, CANON War Start Rule).
 */
export interface StateMeta {
    /** Current turn (integer weeks). 1 game turn = 1 week (CANON, Engine Invariants). */
    turn: number;
    /** Deterministic seed for reproducibility; no wall-clock time. */
    seed: string;
    /** Game phase (Phase 0 / Peace phase / War phase). Optional for backward compatibility. */
    phase?: PhaseName;
    /** Phase 0: Referendum has been held. War start only when true and current_turn == war_start_turn. */
    referendum_held?: boolean;
    /** Phase 0: Turn when referendum was held; null if not yet held. */
    referendum_turn?: number | null;
    /** Phase 0: Turn when war starts (referendum_turn + 4). Peace phase entered only at this turn. */
    war_start_turn?: number | null;
    /** Phase 0: Optional scheduled referendum turn for deterministic historical starts when referendum is not held at turn 0. */
    peace_scheduled_referendum_turn?: number | null;
    /** Phase 0: Optional scheduled war-start turn override used with scheduled referendum starts. */
    peace_scheduled_war_start_turn?: number | null;
    /** Phase 0: Optional absolute path to a mun1990 control file to apply exactly when war starts. */
    peace_war_start_control_path?: string | null;
    /** Phase 0: First turn when referendum became eligible (both RS and HRHB declared). */
    referendum_eligible_turn?: number | null;
    /** Phase 0: Deadline turn for referendum; if reached without referendum → non-war terminal. */
    referendum_deadline_turn?: number | null;
    /** Phase 0: Game ended (e.g. non-war terminal). Peace phase unreachable when true without war. */
    game_over?: boolean;
    /** Phase 0: Outcome label when game_over (e.g. 'non_war_terminal'). */
    outcome?: string;
    /** Phase 0→I: Turn when Phase 0 ended (audit; set at transition). §8 Output Contract. */
    peace_end_turn?: number | null;
    /** Phase 0→I: Turn when Peace phase started (audit; set at transition). §8 Output Contract. */
    war_start_lifecycle_phase_turn?: number | null;
    /** Phase 0→I: What triggered transition (e.g. 'war_start_turn'). §8 Output Contract. */
    escalation_reason?: string | null;
    /** Peace → War phase: Consecutive turns with opposing-control edges >= MIN_OPPOSING_EDGES (D0.9.1). Default 0 on load. */
    war_opposing_edges_streak?: number;
    /** Peace→War phase: Optional initial entrenchment turns (0..12) for all brigades at transition; set from scenario. */
    war_entrenchment_init_turns?: number;
    /** Stuck-in-Peace-phase fallback: force transition after this many Peace phase turns since war_start_turn (e.g. 52). */
    war_force_transition_after_turns?: number;
    /** War phase §11.3: Operation Storm (Oluja) actual western-theater rupture has occurred. */
    operation_storm_triggered?: boolean;
    /** War phase §11.3: Turn when abstract Operation Storm preconditions first aligned. */
    operation_storm_precondition_turn?: number;
    /** War phase §11.3: True once abstract Operation Storm preconditions have aligned. */
    operation_storm_preconditions_met?: boolean;
    /** War phase §11.3: Turn when the Operation Storm event opened the western theater. */
    operation_storm_turn?: number;
    /** War phase §6.3: HV brigades have been spawned (one-shot flag, set after Washington + delay). */
    hv_brigades_spawned?: boolean;
    /** Peace-phase §4.8 (historical fidelity): Earliest turn when RBiH–HRHB open war can begin. When turn < this value, RBiH–HRHB treated as allied for flips and alliance cannot drop below ALLIED_THRESHOLD. Default 26 when absent (October 1992 for April 1992 start). */
    rbih_hrhb_war_earliest_turn?: number | null;
    /** Peace-phase §4.8: When false, alliance value is not updated (RBiH–HRHB remain at init_alliance_rbih_hrhb). Set from scenario.enable_rbih_hrhb_dynamics. */
    enable_rbih_hrhb_dynamics?: boolean;
    /** Desktop GUI: which side the human plays (RBiH, RS, HRHB). Set when starting a new campaign from the app. Non-normative for simulation. */
    player_faction?: FactionId;
    /** Calendar date corresponding to turn 0 for this scenario. Defaults to { year: 1991, month: 8, day: 1 } (1 September 1991) when absent. Non-normative for simulation — used by UI only. */
    scenario_start_date?: { year: number; month: number; day: number };
    /** Peace-phase Overhaul: recruitment mode from scenario config. Controls whether bottom-up TO detachment
     *  lifecycle is active ("bottom_up") or legacy brigade spawn is used ("auto_oob" / "player_choice"). */
    recruitment_mode?: 'player_choice' | 'auto_oob' | 'bottom_up';
    /**
     * @deprecated Non-empty values are banned calibration escapes. Fix bot targeting,
     * OOB stats, or painted targets instead; use osid_control_overrides only for
     * factual initial-control corrections.
     */
    avoided_osids_by_faction?: Record<string, string[]>;
    /** Phase A: When true, supply reserves system is active (general supply + heavy munitions). */
    supply_reserves_enabled?: boolean;
    /** Maximum turns before game ends in stalemate. Default 208 (4 years). Set from scenario.weeks or explicit override. */
    max_turns?: number;
    /** Scenario victory conditions, stored at scenario load for pipeline evaluation. */
    victory_conditions?: import('../scenario/scenario_types.js').ScenarioVictoryConditions;
    /** Scenario-authored Sarajevo numeric siege tuning. ID-set geometry remains code-side canon. */
    sarajevo_overrides?: import('../scenario/scenario_types.js').SarajevoSiegeOverrides;
    /** AI Commander configuration (mode, API key, cost estimate). Desktop-only; not used by sim engine. */
    ai_commander_config?: import('../sim/ai_commander/ai_config.js').AiCommanderConfig;
    /** Calendar date string for current turn (set at runtime in saves, not always present). */
    date?: string;
    /** v0.8.4: Current autonomy level. 0 = Full Control (default). 1 = Strategic. 2 = Political. 3 = Observer. */
    autonomy_level?: 0 | 1 | 2 | 3;
    /** v0.8.4: Queued autonomy change; takes effect at the start of the next turn via apply-autonomy-transition. */
    autonomy_level_pending?: 0 | 1 | 2 | 3;
    /** v0.8.4: Per-decision player overrides this turn. Cleared each turn by apply-autonomy-transition. */
    autonomy_overrides?: AutonomyOverride[];
    /** v0.8.4 Phase B: Pending AI proposal reviews at Level 1 (Assisted). Player must accept or reject before they take effect. */
    pending_proposal_reviews?: PendingProposalReview[];
    /**
     * LANE-NIGHTSHIFT-N3 (D#2, 2026-05-03): frozen endgame snapshot.
     *
     * Set ONCE at game-over from `freezeEndgameSnapshot(state)` (3 termination
     * writers: resolvePeacePlan-allAccepted, resolveDaytonNegotiation, and
     * checkWarTermination collapse/turn-limit branches). The adapter prefers
     * this snapshot over recomputing `gameVerdict` / `costLedger` /
     * `historicalComparison` from live state, so post-Dayton bot drift can't
     * perturb the verdict on save/load round-trip.
     *
     * Older saves without this field fall back to the existing recompute path.
     */
    endgame_snapshot?: EndgameSnapshot;
    /**
     * v0.9.2 tutorial/onboarding skeleton (LANE-NIGHTSHIFT-ROUND2-TUTORIAL-ONBOARDING-SKELETON).
     *
     * Tracks first-session tutorial overlay state. Additive, optional — absent on
     * older saves and treated as "not yet dismissed" so the overlay shows on a
     * fresh campaign. Faction-agnostic, UI-only; the simulation does not read
     * this field. `dismissed=true` hides the overlay permanently for the save;
     * `current_step` and `completed_steps` track the step walkthrough deterministically.
     */
    tutorial_state?: {
        dismissed: boolean;
        current_step?: string;
        completed_steps: string[];
    };
}

/**
 * LANE-NIGHTSHIFT-N3 (D#2, 2026-05-03): frozen endgame outcome.
 *
 * Three derived shapes captured at termination so save/load round-trips
 * preserve verdict identical regardless of post-termination engine drift.
 * Fields are typed as opaque `unknown` to avoid cross-package type imports
 * in `game_state.ts`; the adapter narrows them back to their original
 * shapes when reading.
 */
export interface EndgameSnapshot {
    /** Turn at which the snapshot was frozen. */
    frozen_turn: number;
    /** Outcome string at freeze time (`meta.outcome`). Stored for cross-check. */
    outcome: string;
    /** GameVerdict from `computeFullVerdict` at freeze time. */
    verdict?: unknown;
    /** Cost ledger from `buildCostLedger` at freeze time. */
    cost_ledger?: unknown;
    /** Historical comparison from `compareToHistorical` at freeze time. */
    historical_comparison?: unknown;
}

export interface NegotiationLedgerEntry {
    id: string; // deterministic id: "NLED_<turn>_<faction_id>_<kind>_<seq>"
    turn: number;
    faction_id: string;
    kind: 'gain' | 'spend' | 'adjust';
    amount: number; // integer >= 0
    reason: string; // fixed enum-like string
    meta?: Record<string, number | string>; // optional, keep small and deterministic
}

export type SettlementId = string;
export type PoliticalSideId = FactionId;

/**
 * Settlement-level state (canonical). Reserved for future settlement-scoped fields.
 * Political control is authoritative at political_controllers; no duplicate storage permitted.
 * See GameState.political.political_controllers. Engine Invariants §9.1.
 */
export interface SettlementState {
    // Placeholder for future fields. political_controller is NOT stored here.
    legitimacy_state?: LegitimacyState;
}

/**
 * Phase 0: Per-municipality organizational factors (Phase_0_Spec §4.2, §7.2).
 * Used for Stability Score derivation and Peace phase hand-off.
 */
export interface OrganizationalPenetration {
    /** Police loyalty to controller: loyal | mixed | hostile */
    police_loyalty?: 'loyal' | 'mixed' | 'hostile';
    /** Territorial Defense control: controlled | contested | lost */
    to_control?: 'controlled' | 'contested' | 'lost';
    /** SDS penetration level (0–100). Party/paramilitary investment by RS. */
    sds_penetration?: number;
    /** SDA penetration (0–100). Party investment by RBiH. Phase_0_Spec §4.2.3. */
    sda_penetration?: number;
    /** HDZ penetration (0–100). Party investment by HRHB. Phase_0_Spec §4.2.3. */
    hdz_penetration?: number;
    /** Patriotska Liga presence (0–100). Paramilitary investment by RBiH. Phase_0_Spec §4.2.4. */
    patriotska_liga?: number;
    /** Paramilitary presence by RS (0–100). Phase_0_Spec §4.2.4. */
    paramilitary_rs?: number;
    /** Paramilitary presence by HRHB (0–100). Phase_0_Spec §4.2.4. */
    paramilitary_hrhb?: number;
    /** JNA garrison present in municipality. */
    jna_presence?: boolean;
}

/** Phase 0: Stability-derived control status (System 11). */
export type ControlStatus = 'SECURE' | 'CONTESTED' | 'HIGHLY_CONTESTED';

/**
 * Municipality-level state placeholders (authority/control/legitimacy).
 * Distinct fields; not collapsed. Full mechanics in later phases.
 * Phase 0: stability_score and organizational_penetration (Phase_0_Spec §4.6, §7).
 */
export interface MunicipalityState {
    /** Placeholder: authority level (0..1 or scale TBD). */
    authority?: number;
    /** Placeholder: control consolidation. */
    control?: 'contested' | 'consolidated' | 'fragmented';
    /** Placeholder: legitimacy. */
    legitimacy?: number;
    /** Phase 0: Stability Score [0, 100]. Carried to Peace phase as flip resistance. */
    stability_score?: number;
    /** Phase 0: Stability-derived control status (SECURE/CONTESTED/HIGHLY_CONTESTED). */
    control_status?: ControlStatus;
    /** Phase 0: Organizational factors for Stability Score and hand-off. */
    organizational_penetration?: OrganizationalPenetration;
}

export type ProductionFacilityType = 'ammunition' | 'heavy_equipment' | 'small_arms';

export interface ProductionFacilityState {
    facility_id: string;
    name: string;
    municipality_id: MunicipalityId;
    type: ProductionFacilityType;
    base_capacity: number;
    current_condition: number;
    required_inputs: {
        electricity: boolean;
        raw_materials: boolean;
        skilled_labor: boolean;
    };
}

/** Phase C enclave resilience structured entry (backward-compat: old saves store bare number). */
export interface EnclaveResilienceEntry {
    resilience: number;         // [0, 30]
    isolation_turns: number;    // consecutive turns critical or strained
    hardening_active: boolean;  // true when isolation_turns >= HARDENING_THRESHOLD
}

export interface LegitimacyState {
    legitimacy_score: number; // 0..1
    demographic_legitimacy: number; // 0..1
    institutional_legitimacy: number; // 0..1
    stability_bonus: number; // 0..1
    coercion_penalty: number; // 0..1
    last_updated_turn: number;
    last_controller: FactionId | null;
    last_control_change_turn: number | null;
}

export interface EnclaveState {
    id: string;
    faction_id: FactionId;
    settlement_ids: SettlementId[];
    integrity: number; // 0..1
    components: {
        supply: number;
        authority: number;
        population: number;
        connectivity: number;
    };
    humanitarian_pressure: number; // 0..1
    siege_duration: number; // turns
    collapsed: boolean;
}

export type SarajevoSiegeStatus = 'OPEN' | 'PARTIAL' | 'BESIEGED';

export interface SarajevoState {
    mun_id: MunicipalityId;
    mun_ids?: MunicipalityId[];
    settlement_ids: SettlementId[];
    siege_status: SarajevoSiegeStatus;
    siege_duration: number;
    external_supply: number; // 0..1
    internal_supply: number; // 0..1
    siege_intensity: number; // 0..1
    international_focus: number;
    humanitarian_pressure: number; // 0..1
    last_updated_turn: number;
}

// Phase 12C.2: Negotiated control overrides (treaty-based control assignments)
export interface ControlOverrideState {
    side: PoliticalSideId;
    kind: 'treaty_transfer' | 'treaty_recognition';
    treaty_id: string;
    since_turn: number;
}

export interface ControlRecognitionState {
    side: PoliticalSideId;
    treaty_id: string;
    since_turn: number;
}

// Phase 12C.3: Supply corridor right-of-way (traversal rights without control change)
export interface SupplyCorridorRight {
    id: string; // deterministic
    treaty_id: string;
    beneficiary: PoliticalSideId;
    scope: { kind: 'region'; region_id: string } | { kind: 'edges'; edge_ids: string[] } | { kind: 'settlements'; sids: string[] };
    since_turn: number;
    until_turn: number | null; // null = indefinite
}

export interface SupplyRightsState {
    corridors: SupplyCorridorRight[];
}

// Phase 12D.0: Peace end-state marker
export type EndStateKind = 'peace_treaty';

// Phase 12D.1: End-state snapshot (frozen final outcome)
// Phase 13A.0: Added competences array
export interface EndStateSnapshot {
    turn: number;
    // Canonical control outcome
    controllers: Array<[number, string]>; // sorted by sid asc, includes BRCKO_CONTROLLER_ID if applicable
    settlements_by_controller: Array<[string, number]>; // sorted by controller_id asc
    // Optional summaries, ONLY if already available in state without new mechanics
    exhaustion_totals?: Array<[string, number]>; // per side_id, sorted by side_id
    negotiation_spend?: Array<{ side_id: string; category: string; amount: number }>; // sorted
    // Phase 13A.0: Institutional competences allocated at peace
    competences?: Array<{
        competence: string; // CompetenceId
        holder: string; // PoliticalSideId or special identifier (e.g. "INTERNATIONAL_SUPERVISION")
    }>; // sorted by competence ID
    outcome_hash: string; // sha256 over canonical snapshot object
}

export interface EndState {
    kind: EndStateKind;
    treaty_id: string;
    since_turn: number;
    note?: string;
    snapshot?: EndStateSnapshot; // Phase 12D.1: Frozen snapshot created once at peace entry
}

// Phase 3C: Collapse eligibility state (per faction, per domain)
export interface CollapseEligibilityState {
    // Tier-0: Per-domain eligibility flags (faction-level)
    eligible_authority: boolean;
    eligible_cohesion: boolean;
    eligible_spatial: boolean;
    // Tier-0: Per-domain persistence counters (consecutive turns above threshold)
    persistence_authority: number;
    persistence_cohesion: number;
    persistence_spatial: number;
    // Suppression/immunity flags
    suppressed: boolean;
    immune: boolean;
    // Last updated turn (for determinism)
    last_updated_turn: number;
}

export interface Tier1EntityEligibilityState {
    // Per-domain eligibility flags
    domains: {
        authority: boolean;
        cohesion: boolean;
        spatial: boolean;
    };
    // Per-domain persistence counters
    persistence: {
        authority: number;
        cohesion: number;
        spatial: number;
    };
    // Suppression/immunity flags
    suppressed: boolean;
    immune: boolean;
    // Optional debug info (keep small)
    debug?: {
        exposure: number;
        gates?: {
            authority?: { threshold_met: boolean; degradation_exists: boolean };
            cohesion?: { threshold_met: boolean; degradation_exists: boolean };
            spatial?: { threshold_met: boolean; degradation_exists: boolean };
        };
    };
}

export interface LocalStrainState {
    // Per-entity (settlement SID) local strain accumulator
    by_entity: Record<string, number>; // EntityId -> strain value (monotonic, clamped)
}

export interface CollapseDamageState {
    // Per-entity (settlement SID) collapse damage accumulator
    by_entity: Record<string, {
        authority: number; // [0,1] monotonic damage track
        cohesion: number;  // [0,1] monotonic damage track
        spatial: number;   // [0,1] monotonic damage track
    }>;
}

export interface CapacityModifiersState {
    // Per-entity (settlement SID) capacity modifiers
    by_sid: Record<string, {
        authority_mult: number;    // [0,1] multiplier for authority/control capacity
        cohesion_mult: number;     // [0,1] multiplier for cohesion/formation capacity
        supply_mult: number;       // [0,1] multiplier for supply throughput
        pressure_cap_mult: number; // [0,1] multiplier for front pressure generation cap
    }>;
}

// Exposes intended vs effective posture for visibility/debugging
export interface EffectivePostureExposureState {
    // Per faction, per edge: intended vs effective posture data
    by_faction: Record<FactionId, {
        // Per edge: exposure data
        by_edge: Record<string, {
            // Intended posture (as set by player)
            intended_posture: PostureLevel;
            intended_weight: number; // base_weight from commitment report
            // Effective posture multiplier actually used this turn
            effective_weight: number; // effective_weight from commitment report
            // Raw contributing scalars (diagnostics only)
            friction_factor: number; // [0,1] friction factor from commitment
            commit_points: number; // integer milli-points committed
            // Global capacity factor if applied
            global_factor?: number; // [0,1] global capacity scaling factor
        }>;
    }>;
    // Last updated turn (for determinism)
    last_updated_turn: number;
}

// Exposes trends and warnings derived from existing irreversible state
export type TrendDirection = 'up' | 'flat' | 'down';

export interface LossOfControlTrendExposureState {
    // Per faction: exhaustion trends
    by_faction: Record<FactionId, {
        exhaustion_trend: TrendDirection; // derived from exhaustion delta
        exhaustion_increasing: boolean; // true if exhaustion delta > 0
        collapse_eligible: boolean; // true if any domain eligible (from collapse_eligibility)
    }>;
    // Per settlement (SID): capacity degradation warnings
    by_settlement: Record<string, {
        capacity_degraded: boolean; // true if any capacity_mult < 1
        supply_fragile: boolean; // true if supply_mult < 1
        will_not_recover: boolean; // true if collapse_damage present (irreversible)
        capacity_trend: TrendDirection; // derived from capacity_mult change
    }>;
    // Per edge: pressure/supply trends
    by_edge: Record<string, {
        pressure_trend: TrendDirection; // derived from pressure value change
        supply_fragile: boolean; // true if min(supply_mult endpoints) < 1
        command_friction_worsening: boolean; // true if friction increased (from front_segments)
    }>;
    // Previous turn snapshot (for trend computation)
    previous_turn_snapshot?: {
        turn: number;
        faction_exhaustion: Record<FactionId, number>;
        settlement_capacity: Record<string, { supply_mult: number; pressure_cap_mult: number }>;
        edge_pressure: Record<string, number>;
        edge_friction: Record<string, number>;
    };
    // Last updated turn (for determinism)
    last_updated_turn: number;
}

/**
 * War phase: In-memory front descriptor (non-geometric). Not serialized (Engine Invariants §13.1).
 * Fronts are derived each turn from settlement-level interaction; this type describes one logical front.
 */
export type FrontStability = 'fluid' | 'static' | 'oscillating';

export interface FrontDescriptor {
    /** Stable identifier for this front (e.g. "F_<edge_id_0>_<turn>"). */
    id: string;
    /** Edge IDs that constitute this front (settlement contact edges). */
    edge_ids: string[];
    /** Turn when this front was first detected. */
    created_turn: number;
    /** Stability: fluid (mobile), static (hardened), oscillating. */
    stability: FrontStability;
}

// --- Phase E (Spatial & Interaction) — derived types only; not serialized (Engine Invariants §13.1) ---
/**
 * Phase E: Pressure is stored in state.front_pressure (edge-keyed; Phase 3A canonical field).
 * No separate pressure_map / pressure_fields; Phase E uses front_pressure for diffusion and eligibility.
 */

/**
 * Phase E: AoR membership descriptor (derived each turn; not serialized).
 * Represents which formation has influence over which edges/settlements within front-active zones.
 * Overlapping AoRs allowed; reversible when conditions change.
 */
export interface PhaseEAorMembershipEntry {
    formation_id: FormationId;
    /** Edge IDs in this formation's AoR (front-active only). */
    edge_ids: string[];
    /** Influence weight [0, 1] for pressure diffusion; derived from sustained dominance. */
    influence_weight: number;
}

export interface PhaseEAorMembership {
    /** Per formation: AoR edges and influence. Recomputed each turn. */
    by_formation: Record<FormationId, PhaseEAorMembershipEntry>;
}

/**
 * Phase E: Rear Political Control Zone descriptor (derived each turn; not serialized).
 * Settlements outside all brigade AoRs; retain control, do not generate/absorb pressure (Engine §9.4).
 */
export interface PhaseERearZoneDescriptor {
    /** Settlement IDs in rear (not in any AoR). Recomputed each turn. */
    settlement_ids: string[];
}

/** Phase 0 event (stored in phase0_events_log). */
export interface Phase0Event {
    type: string;
    turn: number;
    faction?: FactionId;
    municipality?: MunicipalityId;
    details: Record<string, unknown>;
}

export interface GameState {
    schema_version: number;
    meta: StateMeta;
    factions: FactionState[];
    // --- Control change events (Phase 5 GUI: battle markers) ---
    // --- Turn after-action reports (GUI only) ---
    /**
     * Per-turn after-action reports compiled at the end of each war turn.
     * Kept for last 3 turns, most recent first (index 0 = latest).
     * Written by compile-turn-summary pipeline step; read-only to all other systems.
     * Does not affect simulation logic.
     */
    turn_summaries?: import('./turn_summary.js').TurnSummary[];
    /** Completed operation After-Action Reports (persisted for GUI + artifact export). */
    operation_history?: OperationAAR[];

    // --- Local Truces (Graz Accords, 6 May 1992) ---
    // --- Paramilitary rear pocket cleanup ---
    /**
     * Pending paramilitary deployment requests for the player faction.
     * Populated each turn when rear enemy pockets are detected.
     * Bot factions auto-approve; player gets batch decision panel.
     */
    pending_paramilitary_requests?: ParamilitaryRequest[];
    /**
     * Player standing policy for paramilitary deployments.
     * 'always_allow' | 'always_deny' | 'ask' (default: 'ask').
     */
    paramilitary_policy?: 'always_allow' | 'always_deny' | 'ask';
    /** Cumulative count of paramilitary deployments per faction (for consequence scaling). */
    paramilitary_deployment_count?: Record<FactionId, number>;
    military: MilitaryState;
    political: PoliticalState;
    displacement: DisplacementDomainState;
}

/**
 * Corps front sector: a corps' managed slice of hostile boundary.
 * Derived each turn (Engine Invariants §13: no serialization of derived state).
 * Deterministic: sorted iteration via strictCompare.
 */
export interface CorpsFrontSector {
    /** Unique ID: "sector:{corps_id}". */
    sector_id: string;
    /** Owning corps formation ID. */
    corps_id: FormationId;
    /** Faction that owns this sector. */
    faction: FactionId;
    /** Enemy faction(s) on the other side. */
    opposing_factions: FactionId[];
    /** OSID hostile-boundary edge IDs composing this sector. */
    edge_ids: string[];
    /** Sub-segments: contiguous groups of edges within this sector (for disjoint fronts). */
    sub_segments: CorpsFrontSubSegment[];
    /** Total edge count (proxy for front width). */
    length_edges: number;
    /** All friendly OSIDs in this sector's territory (front edges + depth via Voronoi BFS). */
    territory_osids: string[];
    /** Brigade IDs assigned to this sector's active line. */
    assigned_brigade_ids: FormationId[];
    /** Brigade IDs designated reserve for this sector (deep interior, not in any sector territory). */
    reserve_brigade_ids: FormationId[];
    /** Brigade IDs owned by this sector but positioned in rear territory rather than the live line. */
    rear_brigade_ids?: FormationId[];
    /**
     * Canonical truth flag: this sector packet preserves a live faction-side war front,
     * but no assigned/reserve brigade physically owns that line right now.
     */
    unstaffed_front?: boolean;
    /** Density: assigned_brigades / length_edges. */
    density: number;
    /** Threat ratio: enemy power adjacent to sector / defensive power. */
    threat_ratio: number;
    /** Computed defensive power (same formula as LocalFront). */
    defensive_power: number;
    /** Independent sector stance (Layer B). Defaults to 'defend'. */
    sector_stance: SectorStance;
    /** Who set this stance: bot AI or player. Player overrides persist until changed. */
    stance_source: 'bot' | 'player';
    /** This sector is strategically critical — its loss carries outsized consequences. */
    must_hold?: boolean;
    /** Who set must_hold: authored in scenario data, bot assessment, or player decision. */
    must_hold_source?: 'scenario' | 'bot' | 'player';
    /** Human-readable label for CoS briefing (e.g. "Posavina Corridor anchor"). */
    must_hold_reason?: string;
}

/**
 * A contiguous group of edges within a corps' front sector.
 * A corps with disjoint territory (e.g. enclaves) gets multiple sub-segments.
 */
export interface CorpsFrontSubSegment {
    /** Sub-segment ID: "subseg:{corps_id}:{index}". */
    sub_segment_id: string;
    /** Edge IDs in this contiguous group. */
    edge_ids: string[];
    /** Friendly-side OSIDs touching these edges. */
    friendly_osids: string[];
    /** Enemy-side OSIDs touching these edges. */
    enemy_osids: string[];
    /** Edge count. */
    length_edges: number;
    /** Brigade IDs assigned as primary defenders of this sub-segment. */
    primary_brigade_ids: string[];
    /** True if this sub-segment has no primary brigade (gap in the line). */
    gap?: boolean;
}

/** Civilian casualties from displacement (killed, fled abroad) per faction (ethnicity-aligned). */
export interface CivilianCasualtiesByFaction {
    [factionId: string]: { killed: number; fled_abroad: number };
}

export interface MilitaryState {
formations: Record<FormationId, FormationState>;
front_segments: Record<string, FrontSegmentState>;
front_posture: Record<FactionId, FrontPostureState>;
front_posture_regions: Record<FactionId, FrontRegionPostureState>;
front_pressure: Record<string, FrontPressureState>;
/** Municipality-level militia pools. Key: MunicipalityId (legacy) or "mun_id:faction" (composite). Plan: militia_and_brigade_formation_system. */
militia_pools: Record<string, MilitiaPoolState>;
/** Faction-level strategic manpower reserve. Excess pool.available from rear municipalities flows here;
     *  under-strength front-line brigades draw from it at reduced rate. Key: FactionId → available manpower. */
strategic_reserves?: Record<string, number>;
/** War phase (Brigade AoR Redesign Phase B): Per-settlement militia garrison strength. Derived from militia_pools + org penetration; settlements with a brigade use brigade garrison instead. Recomputed each turn. */
militia_garrison?: Record<SettlementId, number>;
/** War phase (Brigade AoR Redesign Phase C): Per-brigade movement state (packing / in_transit / unpacking). When in_transit, brigade has no AoR. */
brigade_movement_state?: Record<FormationId, BrigadeMovementState>;
/** War phase (Brigade AoR Redesign Phase C): Pending movement orders (consumed each turn). destination_sids = 1–4 contiguous faction-controlled settlements. */
brigade_movement_orders?: Record<FormationId, BrigadeMovementOrder>;
/** Retired compatibility residue from older saves/tools. Live runtime no longer consumes brigade reposition orders. */
brigade_reposition_orders?: Record<FormationId, { settlement_ids: SettlementId[] }>;
/** War phase tactical deploy/undeploy staging (consumed each turn). */
brigade_deploy_orders?: Record<FormationId, BrigadeDeployAction>;
/** War phase (Brigade AoR Redesign Phase G): Per-brigade encirclement (AoR entirely in enclave). Used for cohesion drain, garrison penalty, movement block. */
brigade_encircled?: Record<FormationId, boolean>;
/** War phase (Brigade AoR Redesign Peace phase): Per-settlement cumulative battle damage [0, 1] (exhaustion-as-terrain). */
battle_damage?: Record<SettlementId, number>;
/** Formation spawn directive (FORAWWV H2.4). When set and active for current turn, formation spawn may run. */
formation_spawn_directive?: FormationSpawnDirective;
/** Strategic production facilities (capturable local supply contributors). */
production_facilities?: Record<string, ProductionFacilityState>;
/** Decision Room `stage-logistics-priority` per-faction-per-edge supply bias. Range [0.5, 1.5], default 1.0. Read by formation fatigue and combat supply math. */
logistics_priority?: Record<FactionId, Record<string, number>>;
/** Sector-level defensive intent translated into brigade posture orders each turn. */
sector_stance_orders?: SectorStanceOrder[];
/** Militia strength [0, 100] per municipality per faction; Peace-phase §4.2. */
war_militia_strength?: Record<MunicipalityId, Record<FactionId, number>>;
/** JNA withdrawal and asset transfer; Peace-phase §4.6. Does not start war. */
war_jna?: JNATransitionState;
/** Consecutive critical-supply turns per faction:OSID. Key: `${factionId}:${osid}`. Phase B siege. */
siege_turn_counters?: Record<string, number>;
/** General supply reserves per faction [0..100]. Consumed by maintenance; replenished by facilities/patron. */
general_supply_reserve?: Record<FactionId, number>;
/** Scenario-authored must-hold OSIDs per corps. Set once at scenario load; read by commander briefing. Key: corps_id. */
must_hold_osids_by_corps?: Record<string, string[]>;
/** Per-corps comms quality override loaded from scenario. Key: corps_id. */
comms_override_by_corps?: Record<string, { before_turn: number; mode: 'radio' | 'full' }>;
/** Heavy munitions reserves per faction [0..100]. Consumed by combat; replenished by ammo facilities/patron. */
heavy_munitions_reserve?: Record<FactionId, number>;
/** Canonical front-edge snapshot for GUI rendering and deterministic diagnostics. */
front_edges?: FrontEdgeState[];
/** OSID front-edge snapshot (War phase operational view) for HoI/OSID consumers. */
war_front_edges_osid?: FrontEdgeState[];
/** Legacy compatibility snapshot for old saves/tests only. No live turn-pipeline step should rebuild or consume it as frontline truth. */
assignable_front_segments?: AssignableFrontSegmentState[];
// COMPATIBILITY-ONLY: brigade_front_assignment is not written by any live runtime code.
// It is retained for save/load backward compatibility with pre-v0.8 saves only.
// Do NOT read this field for frontline truth. Use corps_front_sectors instead.
// See: docs/40_reports/implemented/20260403_FRONTLINE_AUTHORITY_AND_PLAYER_SHELL_INTEL_REDUCTION.md
/** Legacy compatibility fallback only. Null = reserve; sectors/front edges are the live frontline truth. */
brigade_front_assignment?: Record<FormationId, string | null>;
/** Legacy theatre compatibility state. Not a live player-shell or turn-pipeline authority. */
theatres?: Record<string, TheatreState>;
/** Legacy theatre compatibility assignment. Preserved only for old saves/tools. */
army_theatre_assignment?: Record<FormationId, string>;
/** Legacy AoR tuning compatibility field. Do not expose in the live player shell and do not write new values. */
brigade_desired_aor_cap?: Record<FormationId, number>;
/** Pending brigade posture orders (consumed once per turn). */
brigade_posture_orders?: BrigadePostureOrder[];
/** Attack orders: one target settlement per brigade per turn; null = no attack (Brigade Realism plan §3.4). Consumed once per turn. */
brigade_attack_orders?: Record<FormationId, SettlementId | null>;
/**
     * Corps-level attack axis orders: target geometry compressed as ordered edge_ids.
     * Intent-only order surface; translated to brigade orders by deterministic assignment.
     */
/** Corps command state. Key: corps FormationId. */
corps_command?: Record<FormationId, CorpsCommandState>;
/** Equipment reserve per corps: excess from JNA phantom withdrawals. Drawn during brigade reinforcement. */
corps_equipment_reserve?: Record<FormationId, { tanks: number; artillery: number; apcs: number }>;
/** Operation injection validation warnings (collected at injection time, surfaced in run_summary). */
op_injection_warnings?: OpInjectionWarning[];
/** Compact triggered-operation lifecycle diagnostics. Observability only; does not affect launch behavior. */
watched_operations?: WatchedOperationTraceRow[];
/** Triggered operations that have been offered and accepted (operation name → turn accepted). */
triggered_operations_accepted?: Record<string, number>;
/** Triggered operations that have been declined (operation name → { declined_turn, decline_count }). */
declined_operations?: Record<string, { declined_turn: number; decline_count: number }>;
/** LANE B Phase 1 (Operation Opportunity MVP): live opportunity proposal queue.
 *  Owner: src/sim/combat/operation_opportunities.ts. Sorted deterministically by
 *  (eligibility_turn, opportunity_id, proposal_id). Optional + safe to omit. */
operation_opportunities?: import('../sim/combat/operation_opportunities.js').OperationOpportunityState[];
/** LANE B: append-only resolution log for opportunity decisions
 *  (approve / delay / decline / redirect / under_resource / expire).
 *  AAR-loop closure fills executed_op_aar_id + exit_class when approved ops complete. */
operation_opportunity_resolutions?: import('../sim/combat/operation_opportunities.js').OperationOpportunityResolution[];
/** LANE E: append-only diagnostic log for in-window opportunity misses.
 *  Owner: src/sim/combat/operation_opportunities.ts evaluator skip path.
 *  Pure observability — does NOT affect eligibility, decisions, op spawning,
 *  or AAR linkage. Read by tools/diagnostics/opportunity_health_audit.cjs and
 *  any LANE-D-class stress audit. Bounded by len(catalog × in-window-turns). */
operation_opportunity_diagnostics?: import('../sim/combat/operation_opportunities.js').OperationOpportunityIneligibilityDiagnostic[];
/** Army-level stance per faction. */
army_stance?: Record<FactionId, ArmyStance>;
/** OG activation orders (consumed once per turn). */
og_orders?: OGActivationOrder[];
/** Settlement holdout state (Peace phase settlement-level control). Key: SettlementId. */
settlement_holdouts?: Record<SettlementId, SettlementHoldoutState>;
/** Recruitment resources: capital pools, equipment pools, recruited brigade tracking. */
recruitment_state?: RecruitmentResourceState;
/** Cumulative casualty ledger (killed, wounded, missing/captured) per faction and formation. */
casualty_ledger?: CasualtyLedger;
/** Legacy compatibility cache only. No longer rebuilt in the live war pipeline. */
/** Corps front sectors: per-corps slices of hostile boundary. Derived each turn (Engine Invariants §13). */
corps_front_sectors?: Record<string, CorpsFrontSector>;
/** Active non-exempt field brigades that could not be placed truthfully into any sector this turn. Derived each turn. */
unresolved_sector_brigades?: FormationId[];
/** Sector combat power ratings: per-sector offensive/defensive power. Derived each turn after sector partition. */
sector_combat_ratings?: Record<string, SectorCombatRating>;
/** Sector-facing intelligence: per-friendly-sector intelligence records (one per facing enemy sector). Derived each turn. */
sector_intel?: Record<string, SectorIntelRecord[]>;
/** Home distance cache: formationId → BFS hop distance from home_osid to location_osid. Derived each turn. */
home_distance_cache?: Record<string, number>;
/** Player-issued permanent sector assignments. Overrides bot assignment in classifyBrigadesByTerritory.
 *  Keyed by brigadeId → sector_id. Persists until manually cleared. */
brigade_sector_override?: Record<string, string>;
/** War timeline: externalized faction temporal profiles (doctrine, cohesion, reinforcement, etc). Loaded from data/scenarios/timelines/{id}.json. */
war_timeline?: import('./war_timeline.js').WarTimeline;
/** Named officer static data (loaded from JSON). Immutable during simulation. */
named_officer_data?: import('./officer_types.js').NamedOfficer[];
/** Named officer mutable state keyed by officer ID. */
named_officers?: Record<string, import('./officer_types.js').NamedOfficerState>;
/** Player-entered humanitarian airdrop split by enclave id. */
airdrop_allocation?: Record<string, number>;
/** Pending convoy choices generated by IVP/enclave state. */
pending_convoy_decisions?: PendingConvoyDecision[];
/** Player-entered smuggling split by enclave id. */
smuggling_allocation?: Record<string, { type: 'ammo' | 'food'; amount: number }>;
/** One-turn municipality-targeted local support orders for asymmetric Phase E player agency. */
municipality_support_orders?: Partial<Record<FactionId, MunicipalitySupportOrder>>;
/** One-time Sarajevo tunnel unlock. */
sarajevo_tunnel_operational?: boolean;
/** Smuggling route capacity and disruption state per route id. */
smuggling_routes?: import('../sim/economy/smuggling_routes.js').SmugglingRouteState[];
/** Sector ids with OPSEC active. */
opsec_sectors?: string[];
/** Tracks which operation names have been used (name → turn used). Sequential consumption, no repeats. */
used_operation_names?: Record<string, number>;
/** Pending army reserve loan requests from corps, awaiting army-AI or player approval this turn. */
pending_reserve_requests?: ArmyReserveRequest[];
/** Reserve decision history (accepted/declined/terminated) for Army HQ dialogue log. */
reserve_request_history?: ArmyReserveDecisionRecord[];
/** Army HQ overrides forcing corps to launch operations. Consumed and cleared each turn. */
army_hq_overrides?: ArmyHQOverride[];
/** Active campaign plan per faction (null = no plan, use defaults). */
campaign_plans?: Record<string, import('../sim/combat/army_hq_gathering_types.js').CampaignPlan | null>;
/** Turn of last gathering per faction. */
last_gathering_turn?: Record<string, number>;
/**
 * A2 substrate (LANE-NIGHTSHIFT-A2-ARMY-CO-LOOP-SUBSTRATE):
 * Per-faction army-level decision traces — append-only "why" log for
 * army-CO-loop decisions so UI (A5 Army HQ pushback) can surface them.
 *
 * DDR-cited per `docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md`
 * (eee308e0). Single canonical owner; no parallel state.
 *
 * Writer: A3 (army-level order-interpretation lane). Reader: A5 UI.
 * Faction-symmetric mechanism; faction-asymmetric data populated per faction.
 * Each entry: turn (integer ≥0), campaign_role (mirrors FrontPriority['role']
 * vocabulary), human-readable rationale, optional raw_directive_id linking back
 * to the originating ArmyHQOverride / sync-op for cross-reference.
 *
 * Bounded by trim policy (A3 owns trim/GC). Entries sorted by turn ascending
 * for deterministic serialization.
 */
army_co_decision_traces?: Record<string, Array<{
    turn: number;
    campaign_role: string;
    rationale: string;
    raw_directive_id?: string;
}>>;
/**
 * C1 substrate (LANE-NIGHTSHIFT-C1-CORPS-DIRECTIVE-CONSUMER-WIRE):
 * Per-faction × per-corps directive map persisted by A3's
 * `applyArmyDirectiveInterpretation` and read by `assembleCampaignIntent`
 * (commander/briefing.ts) so the political → army → corps chain is observable.
 *
 * DDR-cited per `docs/40_reports/audits/20260506_C_LANE_BOT_CORPS_ORDERS_CONSUMER_DDR.md`
 * (57cec91c). A3's existing return-value contract is preserved; this slot is
 * a parallel persisted view consumed by the briefing-overlay path.
 *
 * Writer: A3 pipeline step (`apply-army-directive-interpretation`).
 * Reader: briefing.ts → `assembleCampaignIntent` overlays
 * `frontPriority.role` → `briefing.campaign_role`. Faction-symmetric mechanism;
 * faction-asymmetric data lands via B2 leader profiles → B1 producer → A3
 * verb-translation. Backward-compatible with pre-C1 saves (always optional).
 *
 * Env flag `C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true` short-circuits
 * BOTH the persist path (A3) and the read path (briefing) for byte-stable A/B.
 *
 * Inner record keyed by corps_id (from formations[corpsId].faction lookup);
 * value mirrors `ArmyCorpsDirective` from army_order_interpretation.ts:
 * `{corps_id, role: 'primary'|'secondary'|'economy'|'contain', deviated: boolean}`
 * plus optional directive vocabulary metadata.
 */
army_corps_directives_by_faction?: Record<string, Record<string, {
    corps_id: string;
    role: 'primary' | 'secondary' | 'economy' | 'contain';
    /** Optional political directive intensity copied through from A3. */
    directive_magnitude?: 'limited' | 'standard' | 'maximum';
    /** Optional closed political authorization flags copied through from A3. */
    permission_flags?: Array<
        'authorize_offensive'
        | 'authorize_reserve_commitment'
        | 'preserve_reserve'
        | 'avoid_escalation'
    >;
    deviated: boolean;
    /**
     * Q2 (LANE-NIGHTSHIFT-Q2-COMPLIANCE-DEVIATION-REASON): canonical reason
     * code explaining WHY this corps deviated from the raw role. Defined iff
     * `deviated === true`; omitted when `deviated === false`. See
     * `ArmyCorpsDirectiveDeviationReason` in
     * `src/sim/combat/army_order_interpretation.ts` for the closed enum and
     * mapping rules.
     */
    deviation_reason?: 'aggressive_preference' | 'cautious_preference' | 'compliance_score_low';
}>>;
/** Per-brigade elite deployment tracker. Keyed by brigade FormationId. */
elite_brigade_tracker?: Record<string, EliteBrigadeTracker>;
/** Pending officer personnel events for player notification (new arrivals, suggested replacements). */
pending_officer_events?: import('./officer_types.js').PendingOfficerEvent[];
/** Average competence of active officers per faction (updated each turn). */
faction_officer_maturity?: Record<string, number>;
/** Warlord friction events (low-reliability commanders ignoring orders). */
friction_events?: import('../sim/combat/warlord_friction.js').FrictionEvent[];
/** Negotiation capital, patron relationships, peace plan history. */
negotiation?: import('./negotiation_types.js').NegotiationState;
/** Event IDs that have already fired (prevents re-fire for once-only events). */
fired_event_ids?: string[];
/** Pending event decisions awaiting player response. */
pending_event_decisions?: import('../sim/events/event_types.js').PendingEventDecision[];
/** Informational event notifications for non-source factions. Never blocks turn advance. */
pending_event_notifications?: import('../sim/events/event_types.js').EventNotification[];
/** Temporary aggression modifiers from events (e.g. VRS fury after barracks seizure). Expires after duration_turns. */
event_aggression_modifiers?: Array<{ faction: string; delta: number; expires_turn: number }>;
// ─── v0.9.0 Consequence System state (Phase 1 Session 1) ─────────────────
// Writers in src/sim/events/apply_effects.ts. Consumers land in Session 2.
// All readers MUST filter by `expires_turn > currentTurn` — no cleanup GC yet.
/** Active guerrilla threat zones. Brigades in listed municipalities take cohesion/morale attrition per turn. */
guerrilla_threats?: Array<{
    faction: FactionId;
    municipalities: string[];
    intensity: number;
    expires_turn: number;
}>;
/** Active recruitment modifiers. Stack multiplicatively with ongoing_mobilization scale. */
recruitment_modifiers?: Array<{
    faction: FactionId;
    pool_multiplier: number;
    expires_turn: number;
}>;
/** Active equipment-quality modifiers. Stack multiplicatively with combat power
 *  in `computeAttackerPower` / `computeDefenderPower`. Reader returns 1.0
 *  (no-op, byte-stable) when this array is empty/undefined. Writer:
 *  `applyEquipmentQualityModifier` in apply_effects.ts. GC by
 *  `cleanupExpiredEventModifiers`. Single canonical owner; no parallel tensor. */
equipment_quality_modifiers?: Array<{
    faction: FactionId;
    multiplier: number;
    expires_turn: number;
}>;
/** Active alliance floor/ceiling locks on the RBiH-HRHB alliance value. */
alliance_locks?: Array<{
    mode: 'floor' | 'ceiling';
    value: number;
    expires_turn: number;
}>;
/** Runtime bot-strategy priority shifts, merged with static FACTION_STRATEGIES at directive-generation time. */
bot_priority_shifts?: Array<{
    faction: FactionId;
    add_objectives?: string[];
    remove_objectives?: string[];
    expires_turn: number;
}>;
// v0.6.0 emergent event system state
/** Pressure system readiness counters per event ID. */
event_readiness?: Record<string, number>;
/** How many times each event has fired (for recurrence tracking). */
event_fire_counts?: Record<string, number>;
/** Turn number when each event last fired (for cooldown tracking). */
event_last_fired_turn?: Record<string, number>;
/** Named flags set by player decisions — read by downstream events. */
event_flags?: Record<string, string | number | boolean>;
/** Event IDs unlocked by event chains (enables_events). */
enabled_event_ids?: string[];
/** Event-imposed constraints on military operations. */
event_constraints?: import('../sim/events/event_constraints.js').EventConstraints;
/** AI commander decision log for replay determinism. */
ai_decision_log?: import('../sim/ai_commander/ai_types.js').CommandDecisionLogEntry[];
/** AI commander army-level decisions for current turn (consumed by corps directive step). */
ai_army_decisions?: Record<string, import('../sim/ai_commander/ai_types.js').ArmyDecision>;
/** Corps commander dialogue responses for current turn (cosmetic flavor; never affects gameplay). */
corps_dialogues?: import('../sim/ai_commander/corps_dialogue.js').CorpsDialogueEntry[];
/** Rolling buffer of war dispatches from outside perspectives (UNHCR, NATO analyst, etc). Max 10. Cosmetic only. */
war_dispatches?: import('../sim/ai_commander/war_dispatches.js').WarDispatch[];
/** Rolling buffer of the last 20 after-action battle narratives (cosmetic, never affects gameplay). */
battle_narratives?: import('../sim/ai_commander/aar_narrative.js').BattleNarrative[];
/** Queue of significant battles awaiting narrative generation (populated during combat, consumed by ai-battle-narratives step). */
narrative_queue?: import('../sim/ai_commander/aar_narrative.js').NarrativeQueueEntry[];
/** Command briefing assembled for player faction each turn (cosmetic, never affects gameplay). */
last_briefing?: import('../sim/briefing/collect_briefing.js').CommandBriefing;
/** Per-enclave state tracking (fallen status, resilience, etc). Key: enclave name. */
enclave_state?: Record<string, { fallen?: boolean; status?: string; [key: string]: unknown }>;
/** Presidential command authority resource. Spent on Level 3 (Direct Intervention) actions; recovers +2/turn.
 *  See docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md §Level 3. */
command_authority?: CommandAuthority;
/** Audit-only annotations attached to the cost ledger by divergence events.
 *  Read-only surface — `buildCostLedger` reflects these without applying mechanical
 *  effects. Each entry records the annotating event id, narrative tag, and turn. */
cost_ledger_annotations?: Array<{
    event_id: string;
    tag: string;
    text?: string;
    turn: number;
    /** Optional faction subject when the annotation is faction-scoped. */
    faction?: FactionId;
}>;
}

/** Presidential command authority — the player's resource for overriding the command chain.
 *  Distinct from political_capital (PoliticalLeaderState), which is the non-player bot's resource. */
export interface CommandAuthority {
    /** Current authority [0, max]. */
    current: number;
    /** Maximum authority (default 100). */
    max: number;
    /** Authority spent this turn (reset each turn start). */
    spent_this_turn: number;
    /** Lifetime total authority spent. */
    lifetime_spent: number;
}

export interface PoliticalState {
negotiation_status?: NegotiationStatus;
ceasefire?: Record<string, CeasefireFreezeEntry>;
negotiation_ledger?: NegotiationLedgerEntry[];
control_overrides?: Record<SettlementId, ControlOverrideState>;
control_recognition?: Record<SettlementId, ControlRecognitionState>;
supply_rights?: SupplyRightsState;
end_state?: EndState;
collapse_eligibility?: Record<FactionId, CollapseEligibilityState>;
collapse_eligibility_tier1?: Record<string, Tier1EntityEligibilityState>;
local_strain?: LocalStrainState;
collapse_damage?: CollapseDamageState;
capacity_modifiers?: CapacityModifiersState;
effective_posture_exposure?: EffectivePostureExposureState;
loss_of_control_trends?: LossOfControlTrendExposureState;
/**
     * Political control substrate (per settlement, independent of AoR).
     * CANONICAL: Political control is authoritative at political_controllers; no duplicate storage permitted.
     * Engine Invariants §9.1: every settlement must have an entry; value may be null but key must exist.
     * Initialized deterministically before fronts/AoR/pressure (Engine Invariants §9.2).
     */
political_controllers?: Record<SettlementId, FactionId | null>;
/** Snapshot of political_controllers at scenario initialization. Never mutated after init. Used by UI timeline to distinguish "held at start" from "taken during sim." */
initial_political_controllers?: Record<SettlementId, FactionId | null>;
/**
     * Political control contested flag (per settlement).
     * true => contested at initialization; false => uncontested.
     */
contested_control?: Record<SettlementId, boolean>;
/** Phase 0: Per-municipality state (stability_score, organizational_penetration). Hand-off to Peace phase. */
municipalities?: Record<MunicipalityId, MunicipalityState>;
/** System 4: Settlement-level state (legitimacy, etc). */
settlements?: Record<SettlementId, SettlementState>;
/** System 1: International Visibility Pressure (IVP). */
international_visibility_pressure?: InternationalVisibilityPressure;
/** Active IVP threshold consequences. */
ivp_consequences_active?: string[];
/** System 5: Enclave integrity tracking. */
enclaves?: EnclaveState[];
/** System 6: Sarajevo exception state. */
sarajevo_state?: SarajevoState;
/** Turn (inclusive) until which municipality cannot flip control; keyed by MunicipalityId. */
war_consolidation_until?: Record<MunicipalityId, number>;
/** Control strain accumulated per municipality; Peace-phase §4.5. */
war_control_strain?: Record<MunicipalityId, number>;
/** RBiH–HRHB alliance relationship [-1, 1]; Peace-phase §4.8. */
war_alliance_rbih_hrhb?: number;
/** Peace-phase §4.8: RBiH–HRHB bilateral state (war tracking, ceasefire, Washington Agreement). */
rbih_hrhb_state?: RbihHrhbState;
/** B4: Coercion pressure [0, 1] per municipality; reduces flip threshold (makes flip easier). Scenario/init can supply (e.g. Prijedor, Zvornik). */
coercion_pressure_by_municipality?: Record<MunicipalityId, number>;
/** Cumulative supply pressure per faction [0, 100]; higher = worse. Live current supply readers should prefer war_supply_condition via supply_condition.ts helpers. */
war_supply_pressure?: Record<FactionId, number>;
/** Live faction supply condition [0, 100] derived from current OSID supply state; higher = better. */
war_supply_condition?: Record<FactionId, number>;
/** Faction-level exhaustion (monotonic, irreversible). Engine Invariants §8. */
war_exhaustion?: Record<FactionId, number>;
/** Optional local (per-settlement) exhaustion accumulator; monotonic when present. */
war_exhaustion_local?: Record<SettlementId, number>;
/** Enclave resilience per enclave ID. Phase C: EnclaveResilienceEntry; old saves: bare number. */
enclave_resilience?: Record<string, number | EnclaveResilienceEntry>;
/** Phase 0 event log: array of per-turn event arrays. Index = turn number. */
phase0_events_log?: Phase0Event[][];
/** Phase 0 relationship tracking (bilateral numeric values). */
phase0_relationships?: {
        rbih_rs: number;
        rbih_hrhb: number;
    };
// --- Control change events (Phase 5 GUI: battle markers) ---
/**
     * Per-turn log of OSID control changes. Cleared at the start of each attack-resolution step,
     * then populated by combat flips (mechanism='combat').
     * Kept for last 3 turns. Sorted by (turn, settlement_id) for determinism.
     * Used by the GUI battle-markers layer — does not affect simulation logic.
     */
control_events?: ControlEvent[];
/** Last computed supply state per OSID. Persisted for supply transition tracking in the settlement timeline. */
last_supply_state_by_osid?: Record<string, string>;
// --- Local Truces (Graz Accords, 6 May 1992) ---
/**
     * Turn at which the Graz Accords fired (RS-HRHB non-aggression).
     * Corps-pair truces (Herzegovina, 2KK/Tomislavgrad) + OSID-level Kiseljak exclusion.
     * Posavina NOT covered — VRS attacks freely.
     * Field name kept as vienna_declaration_turn for save compatibility.
     */
vienna_declaration_turn?: number;
// --- Local Truces (Graz Accords, 6 May 1992) ---
/**
     * Turn at which each faction broke the Graz Accords truce.
     * Key: FactionId ('RS' or 'HRHB'). Value: turn number.
     * When set, the opponent bot receives an aggression modifier spike for 6 turns.
     */
truce_broken_turn?: Record<FactionId, number>;
// --- Local Truces (Graz Accords, 6 May 1992) ---
/** Per-faction acceptance of the Graz Accords. True = accepted. */
vienna_accepted?: Record<FactionId, boolean>;
// --- Local Truces (Graz Accords, 6 May 1992) ---
/** True when the Kiseljak OSID-level exclusion has been broken by either side. */
vienna_kiseljak_broken?: boolean;
// --- Local Truces (Graz Accords, 6 May 1992) ---
/** Which faction broke the Herzegovina corps-pair truce. null = unbroken. */
vienna_herzegovina_broken_by?: FactionId;
/** Turn at which east Herzegovina truce activates (after Op Jackal ends). null = not yet active.
 * West Herzegovina truce activates at Graz Accords (w4). East pair is delayed until Op Jackal completes. */
graz_east_herzegovina_active_turn?: number;
}

export interface DisplacementDomainState {
displacement_state?: Record<MunicipalityId, DisplacementState>;
/** War phase: delayed hostile takeover timers (per OSID). */
hostile_takeover_timers?: Record<string, HostileTakeoverTimerState>;
/** War phase: temporary camp holding pools before rerouting (per municipality). */
displacement_camp_state?: Record<MunicipalityId, DisplacementCampState>;
/** War phase: non-takeover minority flight state (per settlement). Canon: displacement redesign 2026-02-17. */
minority_flight_state?: Record<SettlementId, MinorityFlightStateEntry>;
/** Cumulative displacement event log, sorted by (turn, origin_mun). */
displacement_event_log?: DisplacementEvent[];
sustainability_state?: Record<MunicipalityId, SustainabilityState>;
/** Peace-phase §4.4: displacement initiated turn per municipality (hook only; no population change). */
war_displacement_initiated?: Record<MunicipalityId, number>;
/** Settlement-level displacement (capacity degradation) [0, 1]. Monotonic; never decreases. */
settlement_displacement?: Record<SettlementId, number>;
/** Turn when displacement began at this settlement (optional; for reporting only). */
settlement_displacement_started_turn?: Record<SettlementId, number>;
/** Municipality-level displacement (capacity degradation) [0, 1]. Monotonic; never decreases. */
municipality_displacement?: Record<MunicipalityId, number>;
/** Cumulative civilian displacement casualties (killed, fled_abroad) by ethnicity-aligned faction. */
civilian_casualties?: CivilianCasualtiesByFaction;
/**
 * Per-faction cumulative humanitarian aggregates (LANE D-PRE substrate).
 * Bounded ~3 factions x 3 ethnicities x 3 numbers = 27 numbers total
 * (plus an optional '_unknown' caused_by bucket for legacy events without
 * caused_by attribution).
 *
 * Updated at append-time alongside displacement_event_log via
 * `appendDisplacementEvent` (see src/state/displacement_event_log.ts).
 *
 * Read by compute_capital.ts in LANE D-CONTENT (currently unread; D-PRE
 * writes the substrate, D-CONTENT rebinds the consumer).
 *
 * Outer key: caused_by faction ('RBiH' | 'RS' | 'HRHB' | '_unknown')
 *   For refugees_received the outer key is the faction controlling the
 *   destination OSID at append time (controllers[evt.dest_osid]).
 * Inner key: ethnicity ('RBiH' | 'RS' | 'HRHB' as ethnicity-aligned faction).
 * Value: cumulative counts.
 */
displacement_humanitarian_aggregates?: Record<string, Record<string, {
    /** Sum of (displaced + killed + fled_abroad) for events caused_by this faction with this ethnicity. */
    refugees_created: number;
    /** Sum of `settled` for events whose dest_osid was controlled by this faction at append time. */
    refugees_received: number;
    /** Sum of `killed` for events caused_by this faction with this ethnicity. */
    civilian_casualties_caused: number;
}>>;
/**
 * Per-(origin_mun, ethnicity) -> Record<dest_mun, settled_total> aggregate
 * (LANE D-PRE substrate).
 *
 * Bounded by displaced-affected origin municipalities (~111 muns x 3
 * ethnicities = ~333 outer keys, ~8 inner keys avg) — see analytical bound
 * in DISPLACEMENT_MASTER.md.
 *
 * Used by brigade_reconstitution.ts Path B in LANE D-CONTENT (currently
 * unread; D-PRE writes the substrate).
 *
 * Outer key: `${origin_mun}|${ethnicity}` (composite to avoid nested map).
 * Inner key: dest_mun.
 * Value: total settled count from origin_mun (this ethnicity) -> dest_mun
 *   accumulated across all turns. Only events with dest_mun !== origin_mun
 *   and settled > 0 contribute (matches consumer's filter at line 193-195).
 */
displacement_origin_dest_arrivals?: Record<string, Record<string, number>>;
/**
 * Per-turn refugee-created totals for recent narrative windows.
 *
 * Updated at append-time alongside `displacement_event_log`. Unlike the
 * per-turn event buffer, this survives end-of-turn log clearing so cosmetic
 * dispatch prompts can compute a 4-turn/monthly displacement cue without
 * restoring the unbounded full-history event log.
 *
 * Key: turn number serialized as an object key.
 * Value: sum of displaced + killed + fled_abroad for events on that turn.
 */
displacement_recent_by_turn?: Record<number, number>;
}
