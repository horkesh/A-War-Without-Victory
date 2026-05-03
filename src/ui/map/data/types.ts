/**
 * Type definitions for the MapLibre map application.
 * Migrated from legacy types.ts — only game-state and map-relevant types.
 */

import type { OperationalSitrepView } from '../../shared/operational_sitrep_views.js';

export type FactionId = 'RS' | 'RBiH' | 'HRHB' | null;

export interface FrontEdgeView {
    edge_id: string;
    a: string;
    b: string;
    side_a: string | null;
    side_b: string | null;
}

export interface FrontPressureView {
    edge_id: string;
    value: number;
    max_abs: number;
    last_updated_turn: number;
}

/** Officer mutable state for UI (from GameState.named_officers). */
export interface NamedOfficerStateView {
    officer_id: string;
    status: string;
    assigned_corps_id: string | null;
    acting_commander: boolean;
    turns_in_command: number;
    battles: number;
    victories: number;
}

/** Flattened officer data for UI (merge of named_officer_data + named_officers). */
export interface NamedOfficerView {
    id: string;
    name: string;
    faction: string;
    rank: string;
    competence: number;
    aggressiveness: number;
    defensive_skill: number;
    political_reliability: number;
    home_corps_id?: string;
    origin: string;
    status: string;
    assigned_corps_id: string | null;
    acting_commander: boolean;
    turns_in_command: number;
    battles: number;
    victories: number;
    /** Enclave lock: officer physically trapped in a pocket. */
    enclave_lock?: { enclave_id: string; locked_until_turn?: number };
    /** Currently assigned to an operation (name). */
    assigned_operation?: string;
    /** Compatible corps IDs for regional fit display. */
    compatible_corps_ids?: string[];
    /** Casualty vulnerability (0-1). High = shown as warning. */
    casualty_vulnerability?: number;
    /** War crimes record from historical data (ICTY etc). */
    war_crimes_record?: {
        court: string;
        verdict: string;
        sentence?: string;
        charges?: string;
        summary: string;
    };
    /** Accumulated experience points from commanding operations. */
    experience_points?: number;
    /** Total operations commanded. */
    operations_commanded?: number;
    /** Competence at first experience event (baseline). */
    initial_competence?: number;
    /** True when officer is currently cowed (override threshold reached, complies fully). */
    is_cowed?: boolean;
    /** Turn when cowed status expires (turn > this → no longer cowed). */
    cowed_until_turn?: number;
    /** Pre-computed effective compliance modifier (base reliability ± warlord modifier). */
    effective_compliance_modifier?: number;
}

export interface FormationView {
    id: string;
    faction: string;
    name: string;
    kind: string;
    readiness: string;
    cohesion: number;
    fatigue: number;
    status: string;
    createdTurn: number;
    tags: string[];
    municipalityId?: string;
    hq_sid?: string;
    location_osid?: string;
    home_osid?: string;
    aorSettlementIds?: string[];
    personnel?: number;
    posture?: string;
    corps_id?: string;
    corpsStance?: string;
    corpsExhaustion?: number;
    subordinateIds?: string[];
    corpsOgSlots?: number;
    corpsActiveOgIds?: string[];
    corpsCommandSpan?: number;
    movementStatus?: 'deployed' | 'packing' | 'in_transit' | 'unpacking';
    movementStance?: 'combat' | 'column';
    // War story (progressive — regenerated each turn from brigade_history)
    narrativeArc?: 'veteran' | 'bloodied' | 'shattered' | 'risen' | 'destroyed' | 'garrison';
    warNarrative?: string;
    notableMoments?: Array<{ turn: number; description: string }>;
    /** Brigade officer quality [0.05, 0.90] (Officers Phase E). */
    officer_quality?: number;
    /** True when brigade is in its home municipality (blocks attack/assault orders). */
    home_defense_active?: boolean;
    /** BFS hops from home_osid to current location_osid (from home_distance_cache). */
    homeHops?: number;
    /** Home-distance effectiveness multiplier [0.70–1.0] (from home_distance_cache + equipment_class). */
    homeDistanceMult?: number;
    /** True if brigade is elite (mechanized/motorized): uses gentler home-distance decay. */
    homeIsElite?: boolean;
    /** Player-overridden sector assignment (brigade_sector_override). Null when cleared. */
    sectorOverrideId?: string;
    /** Sub-segment this brigade is assigned to (from corps_front_sectors). */
    assigned_sub_segment_id?: string;
    /** Actual campaign casualties from casualty_ledger.per_formation (brigades only). */
    campaignKia?: number;
    campaignWia?: number;
    campaignMia?: number;
    /** Elite loan state (elite brigades only). */
    eliteLoanState?: {
        on_loan: boolean;
        loaned_to_corps: string | null;
        loan_start_turn: number | null;
        turns_deployed: number;
        in_cooldown: boolean;
        permanently_degraded: boolean;
        current_episode_id: number | null;
        base_osid?: string | null;
    };
    /** Turn of first battle (brigades only). Null if never fought. */
    firstBattleTurn?: number | null;
    /** OSID where first battle occurred (brigades only). */
    firstBattleOsid?: string | null;
    /** Last N engagement records from brigade_history.engagements (brigades only). */
    recent_engagements?: Array<{
        turn: number;
        osid: string;
        role: 'attacker' | 'defender';
        outcome: string;
        casualties_taken: number;
        territory_flipped: boolean;
    }>;
    // Combat summary (corps/army_hq aggregate — computed each turn from subordinate brigade_histories)
    combatSummary?: {
        battles_fought: number;
        victories: number;
        defeats: number;
        stalemates: number;
        battles_as_attacker: number;
        battles_as_defender: number;
        total_casualties_taken: number;
        total_casualties_inflicted: number;
        total_osids_captured: number;
        total_osids_lost: number;
        win_rate: number;
        casualty_exchange_ratio: number;
        current_personnel: number;
        peak_aggregate_personnel: number;
        nadir_aggregate_personnel: number;
        arc_distribution: Record<string, number>;
        brigade_count: number;
        active_brigade_count: number;
        most_casualties_brigade_id: string | null;
        most_victories_brigade_id: string | null;
    };
    morale?: number;
    entrenchment_turns?: number;
    dig_in_progress?: number;
    disrupted_turns?: number;
    equipment_decay?: number;
    honor?: string;
    composition?: {
        infantry: number;
        tanks: number;
        artillery: number;
        aa_systems: number;
        tank_condition: { operational: number; degraded: number; non_operational: number };
        artillery_condition: { operational: number; degraded: number; non_operational: number };
    };
    decorations?: Array<{ tier: string; type: string; notes?: string }>;
    last_repulsed_from?: { osid: string; turn: number };
    last_retreat_from?: { osid: string; turn: number };
    brigade_history?: {
        longest_victory_streak: number;
        turns_under_siege: number;
        total_equipment_destroyed?: { tanks: number; artillery: number; aa_systems: number };
        total_equipment_captured?: { tanks: number; artillery: number; aa_systems: number };
    };
    /** Stranded brigade lifecycle status. Undefined if not stranded. */
    strandedStatus?: 'none' | 'holding' | 'reconnected' | 'collapsed';
    /** Turn when brigade became stranded. */
    strandedSinceTurn?: number;
    /**
     * Command strain score for this corps (derived on-read, never stored on GameState).
     * Accumulates from force-launched ops (+3) and unresolved warlord friction (+2).
     * Decays -1/turn. 0 = healthy, 1-5 = strained, 6+ = compromised.
     * Only populated for corps/corps_asset formations.
     */
    commandStrain?: number;
    /** Player-facing label derived from commandStrain. */
    commandStrainLabel?: 'healthy' | 'strained' | 'compromised';
    /**
     * Unresolved warlord friction event types for this corps's active commander.
     * Derived on-read from state.military.friction_events. Empty array = no friction.
     * Only populated for corps/corps_asset formations.
     */
    activeFrictionTypes?: string[];
    /**
     * Full friction event list for this corps's active commander.
     * Derived on-read. Includes resolved and unresolved events.
     * Canonical source for Wave 3 friction resolution UI on the back face.
     * Only populated for corps/corps_asset formations.
     */
    frictionEvents?: FrictionEventView[];
    /** True when Stabilize Command Relationship action is available (strain > 0, cooldown not active). */
    stabilizationAvailable?: boolean;
    /** Turn when stabilization cooldown expires. Undefined = no cooldown active. */
    stabilizationCooldownUntil?: number;
    /** CA cost for Stabilize action: 15 if compromised, 10 if strained, 0 if no CA system. */
    stabilizationCostCA?: number;
    /** Projected command strain for turn+1 (derived on-read). */
    projectedStrainNextTurn?: number;
    /** Player-facing recovery forecast string. null = healthy (silence=healthy). */
    recoveryForecast?: string | null;
    /**
     * Corps situation assessment — explains why the commander is leaning a certain way.
     * Derived on-read from CommanderState. Null fields = healthy (silence).
     * Only populated for corps/corps_asset formations.
     */
    situationAssessment?: {
        postureSummary: string | null;
        militaryFactors: string[];
        institutionalFactors: string[];
        planExplanation: string | null;
        threatContext: string | null;
        /** Wave 2: The dominant reason this corps is constrained. Null = healthy. */
        dominantReason: string | null;
        /** Wave 2: Classification of the primary constraint type. 'none' = healthy. */
        primaryConstraint: 'siege' | 'threat_pressure' | 'defensive_duty' | 'force_condition' | 'institutional_strain' | 'plan_lifecycle' | 'none';
        /** Wave 3: What would need to change for the constraint to ease. Null = healthy. */
        reliefPath: string | null;
    };
}

/**
 * Player-safe view of a warlord friction event.
 * Exposes what the player needs for the acknowledgement loop.
 * compositeKey = `${officerId}:${turn}:${type}` — deterministic routing key.
 */
export interface FrictionEventView {
    /** Routing key for IPC acknowledgement: `${officerId}:${turn}:${type}` */
    compositeKey: string;
    officerId: string;
    /** Player-facing label for the friction type. */
    typeLabel: string;
    turn: number;
    resolved: boolean;
}

export interface MilitiaPoolView {
    munId: string;
    faction: string;
    available: number;
    committed: number;
    exhausted: number;
    fatigue: number;
}

export interface FogOfWarView {
    visibleEnemyOsids: string[];
    visibleEnemySectorIds: string[];
}

export interface EnclaveResilienceView {
    resilience: number;
    isolation_turns: number;
    hardening_active: boolean;
    supply_state?: 'adequate' | 'strained' | 'critical';
    airdrop_status?: 'receiving' | 'not_eligible' | 'not_isolated_long_enough';
    airdrop_allocation?: number;
    faction?: FactionId;
    display_name?: string;
}

export interface SectorEntrenchmentSummaryView {
    avgEntrenchment: number;
    avgDigIn: number;
    digInCount: number;
    totalCount: number;
}

export interface MobilizationSummaryView {
    faction: Exclude<FactionId, null>;
    total_available: number;
    total_committed: number;
    total_exhausted: number;
    exhaustion_pct: number;
    strategic_reserve: number;
    top_pools: Array<{ mun_id: string; available: number }>;
}

export interface RecruitmentView {
    capitalByFaction: Record<string, number>;
    equipmentByFaction?: Record<string, number>;
    recruitedBrigadeIds: string[];
}

export interface CasualtyLedgerEntryView {
    killed: number;
    wounded: number;
    missing_captured: number;
}

export interface CivilianCasualtyView {
    killed: number;
    fled_abroad: number;
}

export interface InternationalVisibilityPressureView {
    atrocity_visibility: number;
    enclave_humanitarian_pressure: number;
    sarajevo_siege_visibility: number;
    negotiation_momentum: number;
    composite_ivp?: number;
    last_major_shift: number;
}

export interface PendingConvoyDecisionView {
    id: string;
    target_enclave: string;
    route_faction: Exclude<FactionId, null>;
    supply_amount: number;
    decision?: 'allow' | 'block' | 'divert';
}

export interface MunicipalitySupportOrderView {
    faction: Exclude<FactionId, null>;
    mun_id: string;
    type: 'weapons_shipment' | 'staff_priority' | 'croatian_support_package';
    staged_turn: number;
    label: string;
}

export type CommandBriefingSeverity = 'critical' | 'warning' | 'info';
export type SummaryFocusSection = 'overview' | 'ivp' | 'convoys' | 'casualties' | 'support' | 'opsec' | 'capital';

export interface CommandBriefingTargetView {
    type: 'summary' | 'enclaves' | 'operation' | 'sector' | 'settlement' | 'corps' | 'officer_events' | 'none';
    summaryFocus?: SummaryFocusSection;
    operationKey?: string;
    sectorId?: string;
    osid?: string;
    enclaveId?: string;
    corpsId?: string;
}

export interface CommandBriefingItemView {
    id: string;
    kind: 'military' | 'diplomatic' | 'humanitarian' | 'field_reports' | 'command';
    category?: string;
    severity: CommandBriefingSeverity;
    title: string;
    detail: string;
    actionLabel?: string;
    corpsId?: string;
    target: CommandBriefingTargetView;
}

export interface CommandBriefingView {
    headline: string;
    criticalCount: number;
    pendingCount: number;
    items: CommandBriefingItemView[];
}

export interface PresidentialReviewQueueView {
    pendingCount: number;
    criticalCount: number;
    eventDecisionCount: number;
    commandInterpretationCount: number;
    personnelDirectiveCount: number;
    operationOpportunityCount: number;
}

export interface ArmyReserveQueueView {
    pendingCount: number;
    criticalCount: number;
    offensiveCount: number;
    defensiveCount: number;
    leadCriticalReason?: string;
    leadCriticalProvenanceDriver?: 'active_operation' | 'sector_threat' | 'captured_objectives' | 'commander_request';
    leadCriticalCommanderPriority?: 'critical' | 'high' | 'medium' | 'low';
    leadCriticalCommanderBrigadesNeeded?: number;
    leadCriticalFocusZoneId?: string;
    leadCriticalThreatRatio?: number;
    leadCriticalAssignedBrigadeCount?: number;
    leadCriticalOperationName?: string;
    leadCriticalOperationPhase?: string;
    leadCriticalOperationPreparationSubPhase?: string;
    leadCriticalOperationMomentum?: number;
    leadCriticalOperationObjectiveCaptureCount?: number;
    leadCriticalPurpose?: 'offensive' | 'defensive';
    leadCriticalWhyNeeded?: string;
    leadCriticalDescription?: string;
}

export type OperationOpportunityRecordStatus =
    | 'eligible_pending_review'
    | 'delayed'
    | 'approved'
    | 'declined'
    | 'expired'
    | 'redirected'
    | 'under_resourced_approved';

export interface OperationOpportunityRecordView {
    proposal_id: string;
    opportunity_id: string;
    display_name: string;
    faction?: string;
    status: OperationOpportunityRecordStatus;
    eligibility_turn?: number;
    expires_turn?: number;
    response?: 'approve' | 'delay' | 'redirect' | 'under_resource' | 'decline' | 'expire';
    response_turn?: number;
    executed_op_name?: string;
    executed_op_aar_id?: string;
    exit_class?: 'did_not_launch' | 'decisive_success' | 'partial_success' | 'failed' | 'aborted' | 't3_authorized_no_offensive';
    aar_outcome?: string;
    started_turn?: number;
    ended_turn?: number;
    total_attacks?: number;
    objectives_targeted?: number;
    objectives_captured?: number;
    grade_stars?: number;
    grade_verdict?: string;
    required_axes_green?: number;
    required_axes_total?: number;
    optional_axes_green?: number;
    optional_axes_total?: number;
}

export interface OperationOpportunitySummaryView {
    pendingCount: number;
    resolvedCount: number;
    completedCount: number;
    successCount: number;
    failedCount: number;
    didNotLaunchCount: number;
}

export type OperationOpportunityAxisState = 'ready' | 'blocked' | 'strained' | 'not_applicable';

export interface OperationOpportunityPrerequisiteAxisView {
    axis: string;
    label: string;
    mode: string;
    green: boolean;
    state: OperationOpportunityAxisState;
    reason: string;
}

export interface OperationOpportunityProposalActionView {
    id: 'approve' | 'delay' | 'redirect' | 'under_resource' | 'decline';
    label: string;
    enabled: boolean;
}

export type OperationOpportunityForceTraitBand = 'strong' | 'adequate' | 'strained' | 'poor';

export interface OperationOpportunityForceTraitView {
    trait: string;
    label: string;
    band: OperationOpportunityForceTraitBand;
    reason: string;
}

export interface OperationOpportunityFootprintOsidView {
    osid: string;
    label: string;
    role: 'objective' | 'staging';
}

export interface OperationOpportunityRedirectVariantView {
    variant_id: string;
    label: string;
    objectives: OperationOpportunityFootprintOsidView[];
    staging: OperationOpportunityFootprintOsidView[];
}

export interface OperationOpportunityProposalView {
    proposal_id: string;
    opportunity_id: string;
    display_name: string;
    faction?: string;
    status: OperationOpportunityRecordStatus;
    eligibility_turn?: number;
    expires_turn?: number;
    review_id?: string;
    description?: string;
    recommendation?: string;
    proposed_action?: string;
    required_axes_green?: number;
    required_axes_total?: number;
    optional_axes_green?: number;
    optional_axes_total?: number;
    prerequisite_axes: OperationOpportunityPrerequisiteAxisView[];
    force_quality_traits: OperationOpportunityForceTraitView[];
    objectives: OperationOpportunityFootprintOsidView[];
    staging: OperationOpportunityFootprintOsidView[];
    redirect_variants: OperationOpportunityRedirectVariantView[];
    available_actions: OperationOpportunityProposalActionView[];
}

export interface AttackOrderView {
    brigadeId: string;
    targetSettlementId: string;
}

export interface MovementOrderSettlementView {
    brigadeId: string;
    targetSettlementIds: string[];
}

export interface RepositionOrderView {
    brigadeId: string;
    settlementIds: string[];
}

export interface AoROrderView {
    settlementId: string;
    fromBrigadeId: string;
    toBrigadeId: string;
}

export interface RecentControlEventView {
    turn: number;
    settlementId: string;
    from: string | null;
    to: string | null;
    mechanism: string;
    municipalityId: string | null;
}

export interface CorpsFrontSectorView {
    sector_id: string;
    corps_id: string;
    corps_name: string;
    display_name: string;
    faction: string;
    opposing_factions: string[];
    edge_ids: string[];
  territory_osids?: string[];
    sub_segment_count: number;
    length_edges: number;
    assigned_brigade_ids: string[];
    reserve_brigade_ids: string[];
    rear_brigade_ids?: string[];
    density: number;
    threat_ratio: number;
    defensive_power: number;
    intel_confidence: number;
    offensive_signs: boolean;
    logistics_priority?: number;
    opsec_active?: boolean;
    /** Sector combat power rating — offensive power aggregate. */
    combat_offensive_power?: number;
    /** Sector combat power rating — defensive power aggregate. */
    combat_defensive_power?: number;
    /** Sector combat power rating — defense per edge. */
    combat_defense_per_edge?: number;
    /** Sector combat power rating — strength classification. */
    combat_strength_class?: 'fortress' | 'strong' | 'adequate' | 'thin' | 'critical';
    /** Sector combat power rating — average morale. */
    combat_morale_avg?: number;
    /** Sector combat power rating — average cohesion. */
    combat_cohesion_avg?: number;
    /** Sector combat power rating — average fatigue. */
    combat_fatigue_avg?: number;
    /** Sector combat power rating — total personnel. */
    combat_personnel?: number;
    /** Sector stance: independent of corps stance, within corps constraints. */
    sector_stance?: 'fortify' | 'defend' | 'elastic' | 'active_defense' | 'screening';
    /** Who set this stance: 'bot' | 'player'. */
    stance_source?: 'bot' | 'player';
    /** Sub-segments with edge and brigade assignment data. */
    sub_segments?: Array<{
        sub_segment_id: string;
        edge_ids: string[];
        friendly_osids: string[];
        enemy_osids: string[];
        length_edges: number;
        primary_brigade_ids: string[];
        gap?: boolean;
    }>;
}

/**
 * CANONICAL UI-FACING OPERATION MODEL
 *
 * All operation data shown to the player must flow through this type.
 * Populated exclusively by GameStateAdapter (operation extraction block).
 * UI surfaces must not read CorpsOperation directly from GameState.
 *
 * Lifecycle: planning → execution → recovery (matches engine CorpsOperation.phase)
 * Reflects CorpsOperation; see sector_offensive.ts for lifecycle and corps_operation_helpers.ts for creation rules.
 */
export interface OperationView {
    corps_id: string;
    corps_name: string;
    faction: string;
    name: string;
    type: string;
    phase: 'planning' | 'execution' | 'recovery';
    sector_id?: string;
    staging_osid?: string;
    objectives?: string[];
    current_objective_index?: number;
    momentum?: number;
    failure_count?: number;
    consecutive_failures_on_current?: number;
    phase_started_turn?: number;
    participating_brigade_count: number;
    participating_brigade_ids?: string[];
    started_turn: number;
    supply_readiness?: number;
    avg_cohesion?: number;
    avg_personnel_pct?: number;
    readiness?: {
        supply: number;
        cohesion: number;
        intel: number;
    };
    min_attack_outcome?: 'decisive_victory' | 'victory' | 'costly_victory' | 'stalemate' | 'repulsed';
    tempo?: 'methodical' | 'standard' | 'all_out';
    schwerpunkt_osid?: string;
    artillery_preparation?: boolean;
    force_launch?: boolean;
    was_force_launched?: boolean;
    recovery_reason?: 'completed' | 'max_failures' | 'orphaned_sector' | 'no_logged_attempt' | 'manual_termination';
    axes?: Array<{
        axis_id: string;
        name: string;
        assigned_brigades: string[];
        objectives: string[];
        current_objective_index: number;
        status: 'executing' | 'stalled' | 'complete';
        momentum: number;
        staging_osid?: string;
    }>;
    /** Operation commander officer ID (if assigned). */
    commander_officer_id?: string;
    /** Preparation sub-phase (only during planning). */
    preparation_sub_phase?: 'intel_gathering' | 'force_staging' | 'supply_check' | 'assessment' | 'ready';
    /** Turns elapsed in preparation. */
    preparation_turns_elapsed?: number;
    /** Max preparation turns before forced decision. */
    preparation_max_turns?: number;
    /** Commander's go/no-go recommendation. */
    commander_assessment?: 'launch' | 'postpone' | 'abort';
    /** Snapshot of commander's recommendation at the moment of presidential decision. Set once; never recomputed. */
    commander_assessment_at_launch?: 'launch' | 'postpone' | 'abort';
    /** Intel confidence snapshot at assessment. */
    intel_confidence_at_assessment?: number;
    /** Supply readiness snapshot at assessment. */
    supply_readiness_at_assessment?: number;
    /** Commander's estimated force ratio. */
    force_ratio_estimate?: number;
    /** Number of postponements so far. */
    postponement_count?: number;
    /** Wave 6: Readiness trend — directional classification derived from assessment + postponements + timeline. */
    readinessTrend?: {
        direction: 'nearing_launch' | 'improving' | 'building' | 'stagnating' | 'deteriorating' | 'not_viable';
        label: string | null;
        timelineFraction: number | null;
        timelineLabel: string | null;
    };
    /** Whether an active probe is in progress. */
    has_active_probe?: boolean;
    /** Other sectors that contributed attached brigades to this operation. */
    supporting_sector_ids?: string[];
    /** Brigade IDs drawn from the primary sector at launch. */
    primary_sector_brigades?: string[];
    /** Brigade IDs from outside the primary sector, explicitly attached. */
    attached_brigades?: string[];
    /** Why non-primary brigades are present. Absent = all from primary sector. */
    reinforcement_source?: 'adjacent_sector' | 'corps_reserve' | 'army_loan';
}

/** Sector intelligence record — enemy assessment from one friendly sector. */
export interface SectorIntelRecordView {
    friendly_sector_id: string;
    enemy_sector_id: string;
    front_edge_count: number;
    strength_category: 'unknown' | 'thin' | 'moderate' | 'dense' | 'fortress';
    posture_observed: 'unknown' | 'defensive' | 'entrenched' | 'offensive_prep';
    offensive_signs: boolean;
    confidence: number;
    turns_in_contact: number;
    visible_brigade_ids: string[];
}

export interface LoadedGameState {
    label: string;
    turn: number;
    phase: string;
    metadata?: { turn: number; date: string };
    formations: FormationView[];
    militiaPools: MilitiaPoolView[];
    controlBySettlement: Record<string, string | null>;
    /** Initial political controllers at scenario start (for timeline provenance). */
    initialControlBySettlement?: Record<string, string | null>;
    statusBySettlement: Record<string, string>;
    brigadeAorByFormationId: Record<string, string[]>;
    frontEdges?: FrontEdgeView[];
    frontEdgesOsid?: FrontEdgeView[];
    frontPressureByEdge?: Record<string, FrontPressureView>;
    attackOrders: AttackOrderView[];
    aorOrders: AoROrderView[];
    recentControlEvents: RecentControlEventView[];
    /** Full control event history (all turns, all OSIDs) for timeline. */
    allControlEvents: Array<{ turn: number; settlementId: string; from: string | null; to: string | null; mechanism: string }>;
    /** Raw displacement event log for settlement timeline. */
    displacementEventLog: Array<{ turn: number; origin_osid?: string; dest_osid?: string; origin_mun?: string; ethnicity?: string; displaced: number; killed: number; fled_abroad: number; settled: number; caused_by?: string }>;
    /** Per-OSID battle records from all turn summaries, for settlement timeline. */
    battlesByOsid: Record<string, Array<{ turn: number; attacker_faction: string; defender_faction: string; outcome: string; attacker_casualties: number; defender_casualties: number; territory_flipped: boolean }>>;
    /** Per-OSID brigade movement events (arrived/departed) from all turn summaries. */
    movementsByOsid: Record<string, Array<{ turn: number; formation_id: string; formation_name: string; type: 'arrived' | 'departed' }>>;
    /** Per-OSID supply state transitions from all turn summaries. */
    supplyTransitionsByOsid: Record<string, Array<{ turn: number; from: string; to: string }>>;
    /** Historical events fired per turn (from scenario event definitions). */
    historicalEventsByTurn: Array<{ turn: number; id: string; text: string }>;
    recruitment?: RecruitmentView;
    armyStance?: Record<string, string>;
    casualtyLedger?: Record<string, CasualtyLedgerEntryView>;
    civilianCasualties?: Record<string, CivilianCasualtyView>;
    internationalVisibilityPressure?: InternationalVisibilityPressureView;
    ivpConsequencesActive?: string[];
    pendingConvoyDecisions?: PendingConvoyDecisionView[];
    municipalitySupportOrders?: Partial<Record<'RS' | 'RBiH' | 'HRHB', MunicipalitySupportOrderView>>;
    sarajevoTunnelOperational?: boolean;
    warPhaseSupplyPressure?: Record<string, number>;
    warPhaseExhaustion?: Record<string, number>;
    player_faction?: string | null;
    rbih_hrhb_war_earliest_turn?: number | null;
    war_alliance_rbih_hrhb?: number | null;
    /**
     * v0.9.2 tutorial onboarding skeleton (LANE-NIGHTSHIFT-ROUND2-TUTORIAL-ONBOARDING-SKELETON).
     *
     * Mirrors `state.meta.tutorial_state`. Optional / absent on older saves;
     * the OnboardingOverlay treats absent as "not yet dismissed". UI-only:
     * sim engine does not read this.
     */
    tutorial_state?: {
        dismissed: boolean;
        current_step?: string;
        completed_steps: string[];
    };
    displacementByMun?: Record<string, {
        originalPopulation: number;
        displacedOut: number;
        displacedIn: number;
        lostPopulation: number;
        currentPopulation: number;
        arrivedByFaction?: Partial<Record<string, number>>;
    }>;
    /** Per-OSID per-faction departed counts (from displacement_event_log). */
    departedByOsid?: Record<string, Partial<Record<string, number>>>;
    /** Per-mun per-faction departed totals (for settlement fallback when OSID has no events). */
    departedByMun?: Record<string, Record<string, number>>;
    /** Per-OSID displacement totals from event log (exact out/lost/in so numbers add up). */
    displacementByOsid?: Record<string, { out: number; lost: number; in: number }>;
    /** Presidential command authority (Level 3 override resource). */
    commandAuthority?: { current: number; max: number; spentThisTurn: number; lifetimeSpent: number };
    fogOfWar?: FogOfWarView;
    /** Sector intelligence records for the player faction — per friendly sector, what we know about enemy sectors. */
    sectorIntel?: SectorIntelRecordView[];
    movementOrdersSettlement?: MovementOrderSettlementView[];
    repositionOrders?: RepositionOrderView[];
    corpsFrontSectors?: CorpsFrontSectorView[];
    /**
     * Brigade IDs that could not be assigned to any sector this turn (engine truth: military.unresolved_sector_brigades).
     * Filtered to the player's faction in the adapter. Codex principle #6: unresolved is honest — do not hide these.
     */
    unresolvedSectorBrigades?: string[];
    operations?: OperationView[];
    /** Officer data for Phase E GUI (sorted by id). Present when state has named_officers. */
    namedOfficerData?: NamedOfficerView[];
    /** Officer mutable state by id (sorted keys when iterating). */
    namedOfficerStateById?: Record<string, NamedOfficerStateView>;
    /** Per-faction supply reserve levels (general supply + heavy munitions, 0–100 each). Only present when supply_reserves_enabled. */
    factionReserves?: Record<string, { generalSupply: number; heavyMunitions: number }>;
    /** Production facility views for EconomyPanel. */
    productionFacilities?: Array<{ id: string; name: string; type: string; municipality: string; condition: number; controller: string | null }>;
    /** Smuggling route views for EconomyPanel. */
    smugglingRoutes?: Array<{ id: string; name: string; faction: string; capacity: number; disrupted: boolean; active_turns: number }>;
    /** Embargo status per faction for EconomyPanel. */
    embargoStatus?: Record<string, { pipeline: number; smuggling: number }>;
    /** Enclave resilience state per enclave id. Present when enclave_resilience exists in game state. */
    enclaveResilience?: Record<string, EnclaveResilienceView>;
    /** Per-sector summary of brigade entrenchment state. */
    sectorEntrenchmentSummary?: Record<string, SectorEntrenchmentSummaryView>;
    /** Per-faction summary of manpower pools and strategic reserves. */
    mobilizationSummary?: Record<string, MobilizationSummaryView>;
    /** Top-level command-routing summary for urgent player-facing matters. */
    commandBriefing?: CommandBriefingView;
    /** Canonical operational SITREP packet shared with Warroom reporting surfaces. */
    operationalSitrep?: OperationalSitrepView;
    /** Canonical Army HQ / presidential military review queue summary derived from pending review owners. */
    presidentialReviewQueue?: PresidentialReviewQueueView;
    /** Canonical Army Reserve management queue summary derived from pending reserve requests. */
    armyReserveQueue?: ArmyReserveQueueView;
    /** Read-only Army HQ opportunity ledger: proposal -> decision -> AAR outcome. */
    operationOpportunityRecords?: OperationOpportunityRecordView[];
    /** Summary counts for Army HQ opportunity records. */
    operationOpportunitySummary?: OperationOpportunitySummaryView;
    /** Live Army HQ opportunity dossiers awaiting presidential review. */
    operationOpportunityProposals?: OperationOpportunityProposalView[];
    /** Most recent turn after-action report (null before first turn is advanced). */
    latestTurnSummary: import('../../../state/turn_summary.js').TurnSummary | null;
    /** All turn summaries (for Chronicle timeline). */
    turnSummaries: import('../../../state/turn_summary.js').TurnSummary[];
    /** Completed operation AARs. */
    operationHistory?: Array<{
        operation_id: string;
        operation_name: string;
        corps_id: string;
        faction: string;
        started_turn: number;
        ended_turn: number;
        outcome: string;
        commander_name?: string;
        commander_rank?: string;
        objectives_targeted: string[];
        objectives_logged_captured?: string[];
        objectives_held_without_logged_capture?: string[];
        capture_provenance?: 'no_objectives_held' | 'logged_capture' | 'held_without_logged_capture' | 'held_without_logged_attack' | 'mixed';
        objectives_captured: string[];
        total_attacks: number;
        casualties_suffered: { killed: number; wounded: number };
        casualties_inflicted: { killed: number; wounded: number };
        equipment_lost: { tanks: number; artillery: number };
        equipment_destroyed: { tanks: number; artillery: number };
        equipment_captured: { tanks: number; artillery: number };
        grade: { stars: number; verdict: string; factors: Record<string, number> };
        duration_turns: number;
        weekly_log: Array<{
            turn: number; phase: string; attacks_this_turn: number;
            objectives_captured_this_turn: string[]; notable_events: string[];
            casualties_suffered: { killed: number; wounded: number };
            casualties_inflicted: { killed: number; wounded: number };
        }>;
        axis_summaries?: Array<{
            axis_id: string; axis_name: string; objectives_targeted: string[];
            objectives_captured: string[]; total_attacks: number;
            casualties_suffered: { killed: number; wounded: number };
            casualties_inflicted: { killed: number; wounded: number };
        }>;
        recovery_reason?: 'completed' | 'max_failures' | 'orphaned_sector' | 'no_logged_attempt' | 'manual_termination';
        /** True when the player force-launched this operation against command recommendation. */
        force_launched?: boolean;
        /** CA cost paid at time of force-launch (always 15 when force_launched is true). */
        ca_cost_at_launch?: number;
        /** Snapshot of commander's recommendation at the moment of presidential decision. */
        commander_assessment_at_launch?: 'launch' | 'postpone' | 'abort';
    }>;
    /** Player-issued permanent sector assignments (brigade_sector_override). */
    brigadeSectorOverride?: Record<string, string>;
    /** Pending army reserve loan requests awaiting player decision. */
    pendingReserveRequests?: Array<{
        request_id: string;
        corps_id: string;
        faction: string;
        reason: string;
        provenance_driver?: 'active_operation' | 'sector_threat' | 'captured_objectives' | 'commander_request';
        commander_request_priority?: 'critical' | 'high' | 'medium' | 'low';
        commander_request_brigades_needed?: number;
        commander_focus_zone_id?: string;
        sector_threat_ratio?: number;
        sector_assigned_brigade_count?: number;
        operation_name?: string;
        operation_phase?: string;
        operation_preparation_sub_phase?: string;
        operation_momentum?: number;
        operation_objective_capture_count?: number;
        purpose?: 'offensive' | 'defensive';
        why_needed?: string;
        how_to_use?: string;
        priority: number;
        severityBand: 'critical' | 'routine';
        travel_hops: number;
        description: string;
        suggested_brigade_id: string | null;
        turn_requested: number;
    }>;
    /** Per-elite-brigade deployment history. */
    eliteBrigadeTracker?: Record<string, {
        total_loans: number;
        total_turns_deployed: number;
        total_battles: number;
        total_casualties_taken: number;
        total_osids_captured: number;
        episodes: Array<{
            episode_id: number;
            corps_id: string;
            reason: string;
            loan_start_turn: number;
            loan_end_turn: number | null;
            recall_reason: string | null;
            travel_hops: number;
            personnel_start: number;
            casualties_taken: number;
            battles_fought: number;
            osids_captured: number;
        }>;
    }>;
    /** Pending officer personnel events (new arrivals, suggested replacements, Phase 3 interpretation events). */
    pendingOfficerEvents?: Array<{
        event_id: string;
        type: 'officer_available' | 'replacement_suggested' | 'order_modified' | 'order_pushback' | 'order_refused' | 'officer_relieved';
        faction: string;
        turn: number;
        officer_id: string;
        officer_name: string;
        officer_competence: number;
        officer_aggressiveness: number;
        officer_defensive_skill: number;
        current_commander_id?: string;
        current_commander_name?: string;
        current_commander_competence?: number;
        current_commander_aggressiveness?: number;
        current_commander_defensive_skill?: number;
        current_commander_war_crimes_record?: {
            court: string;
            verdict: string;
            sentence?: string;
            charges?: string;
            summary: string;
        };
        corps_id?: string;
        corps_name?: string;
        acknowledged: boolean;
        war_crimes_record?: {
            court: string;
            verdict: string;
            sentence?: string;
            charges?: string;
            summary: string;
        };
        /** Human-readable reason the officer deviated (Phase 3 interpretation events). */
        reason?: string;
        /** Whether the player can override this interpretation. */
        overridable?: boolean;
        /** IPC action string to call on override. */
        override_action?: string;
    }>;
    // ═══════════════════════════════════════════════════════════════════
    // Peace Phase (Phase 0) — only populated when meta.phase === 'peace'
    // ═══════════════════════════════════════════════════════════════════

    /** Peace phase faction data (capital, declarations). */
    peaceFactions?: Array<{
        id: string;
        capital: number;
        declaration_pressure: number;
        declared: boolean;
        declaration_turn: number | null;
    }>;
    /** RBiH-HRHB relationship value [-1, +1]. */
    peaceAllianceValue?: number;
    /** Referendum state. */
    peaceReferendum?: {
        held: boolean;
        turn: number | null;
        eligible_turn: number | null;
        deadline_turn: number | null;
        war_start_turn: number | null;
    };
    /** Phase 0 events for the most recent turn. */
    peaceEvents?: Array<{
        type: string;
        turn: number;
        faction?: string;
        details: Record<string, unknown>;
    }>;
    /** Game over state. */
    gameOver?: boolean;
    gameOutcome?: string;
    /** Game verdict (computed at game end from negotiation capital). */
    gameVerdict?: import('../../../state/negotiation_types.js').GameVerdict;
    /** Cost ledger (computed at game end — downstream aggregation of war costs). */
    costLedger?: import('../../../sim/endgame/cost_ledger.js').CostLedger;
    /** Historical comparison (computed at game end — divergence from historical baseline). */
    historicalComparison?: import('../../../sim/endgame/endgame_comparison.js').ComparisonResult;

    /** Active (in-progress) operations. */
    activeOperations?: Array<{
        corps_id: string;
        operation_name: string;
        faction: string;
        type: string;
        phase: string;
        started_turn: number;
        participating_brigades: string[];
        commander_name?: string;
        objectives_count: number;
        objectives_captured: number;
        attacks: number;
        weekly_log_length: number;
    }>;

    /** Fired event IDs with their turn and metadata, for the event log. */
    firedEvents?: Array<{
        id: string;
        turn: number;
        title: string;
        narrative: string;
        category: string;
        effects: Array<{ kind: string; description: string }>;
        isDecision: boolean;
        responseOptions?: Array<{ id: string; label: string; description?: string }>;
    }>;

    /** Pending event decisions awaiting player response. */
    pendingEventDecisions?: Array<{
        event_id: string;
        event_title: string;
        turn_fired: number;
        faction: string;
        response_options: Array<{
            id: string;
            label: string;
            description?: string;
            effects: import('../../../sim/events/event_types.js').EventEffect[];
        }>;
    }>;

    /** Per-faction composite negotiating capital score (weighted 0-100). Derived from strategicDimensions. */
    negotiatingCapital?: Record<string, number>;

    /** Per-faction strategic dimensions (v0.6.0 metagame). 6 dimensions, hybrid base + modifier = effective. */
    strategicDimensions?: Record<string, Record<string, {
        base_value: number;
        event_modifier: number;
        effective_value: number;
    }>>;

    /** Per-faction event flags set by player decisions. */
    eventFlags?: Record<string, string | number | boolean>;
    /** True when any event has readiness >= 50 (approaching threshold). */
    pressureWarning: boolean;

    /** Per-faction patron override authority (0-100). */
    patronOverrideAuthority?: Record<string, number>;

    /** Pending Dayton negotiation — shown when shouldInitiateDayton fires. */
    pendingDayton?: {
        territorialPackages: Array<{
            id: string;
            name: string;
            defaultHolder: string;
            demandCost: number;
            concedeCost: number;
        }>;
        institutionalPackages: Array<{
            id: string;
            name: string;
            centralizedCost: number;
            decentralizedCost: number;
        }>;
        factionCapital: Record<string, number>;
        patronOverride: Record<string, number>;
    };

    /** Pending peace plan awaiting player response. */
    pendingPeacePlan?: {
        planId: string;
        planName: string;
        narrative: string;
        turnOffered: number;
        proposedSplit: { RBiH: number; RS: number; HRHB: number };
        institutionalModel: string;
        botResponses: Record<string, 'accepted' | 'rejected'>;
    };

    /** Pending autonomy proposal reviews (Level 1 Assisted). Mapped from state.meta.pending_proposal_reviews. */
    pendingProposalReviews?: Array<{
        id: string;
        turn: number;
        faction: string;
        domain: string;
        description: string;
        proposed_action?: string;
        current_value?: string;
        proposed_value?: string;
    }>;
}

