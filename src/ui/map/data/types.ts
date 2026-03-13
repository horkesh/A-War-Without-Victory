/**
 * Type definitions for the MapLibre map application.
 * Migrated from legacy types.ts — only game-state and map-relevant types.
 */

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

export interface AssignableFrontSegmentView {
    front_id: string;
    edge_ids: string[];
    side_a: string | null;
    side_b: string | null;
    length_edges: number;
    name?: string;
    theatre_id?: string;
}

export interface TheatreView {
    id: string;
    name: string;
    faction: string;
    army_ids?: string[];
    region_scope?: string[];
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
export type SummaryFocusSection = 'overview' | 'ivp' | 'convoys' | 'casualties' | 'support' | 'opsec';

export interface CommandBriefingTargetView {
    type: 'summary' | 'enclaves' | 'operation' | 'sector' | 'settlement';
    summaryFocus?: SummaryFocusSection;
    operationKey?: string;
    sectorId?: string;
    osid?: string;
    enclaveId?: string;
}

export interface CommandBriefingItemView {
    id: string;
    kind: 'convoy' | 'enclave' | 'operation' | 'ivp' | 'sector' | 'support' | 'opsec';
    severity: CommandBriefingSeverity;
    title: string;
    detail: string;
    actionLabel: string;
    target: CommandBriefingTargetView;
}

export interface CommandBriefingView {
    headline: string;
    criticalCount: number;
    pendingCount: number;
    items: CommandBriefingItemView[];
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
    sub_segment_count: number;
    length_edges: number;
    assigned_brigade_ids: string[];
    reserve_brigade_ids: string[];
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
}

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
    /** Intel confidence snapshot at assessment. */
    intel_confidence_at_assessment?: number;
    /** Supply readiness snapshot at assessment. */
    supply_readiness_at_assessment?: number;
    /** Commander's estimated force ratio. */
    force_ratio_estimate?: number;
    /** Number of postponements so far. */
    postponement_count?: number;
    /** Whether an active probe is in progress. */
    has_active_probe?: boolean;
}

export interface LoadedGameState {
    label: string;
    turn: number;
    phase: string;
    metadata?: { turn: number; date: string };
    formations: FormationView[];
    militiaPools: MilitiaPoolView[];
    controlBySettlement: Record<string, string | null>;
    statusBySettlement: Record<string, string>;
    brigadeAorByFormationId: Record<string, string[]>;
    brigadeFrontAssignment?: Record<string, string | null>;
    theatres?: Record<string, TheatreView>;
    armyTheatreAssignment?: Record<string, string>;
    brigadeDesiredAoRCap?: Record<string, number>;
    frontEdges?: FrontEdgeView[];
    frontEdgesOsid?: FrontEdgeView[];
    assignableFrontSegments?: AssignableFrontSegmentView[];
    frontPressureByEdge?: Record<string, FrontPressureView>;
    attackOrders: AttackOrderView[];
    aorOrders: AoROrderView[];
    recentControlEvents: RecentControlEventView[];
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
    fogOfWar?: FogOfWarView;
    movementOrdersSettlement?: MovementOrderSettlementView[];
    repositionOrders?: RepositionOrderView[];
    corpsFrontSectors?: CorpsFrontSectorView[];
    operations?: OperationView[];
    /** Officer data for Phase E GUI (sorted by id). Present when state has named_officers. */
    namedOfficerData?: NamedOfficerView[];
    /** Officer mutable state by id (sorted keys when iterating). */
    namedOfficerStateById?: Record<string, NamedOfficerStateView>;
    /** Per-faction supply reserve levels (general supply + heavy munitions, 0–100 each). Only present when supply_reserves_enabled. */
    factionReserves?: Record<string, { generalSupply: number; heavyMunitions: number }>;
    /** Enclave resilience state per enclave id. Present when enclave_resilience exists in game state. */
    enclaveResilience?: Record<string, EnclaveResilienceView>;
    /** Per-sector summary of brigade entrenchment state. */
    sectorEntrenchmentSummary?: Record<string, SectorEntrenchmentSummaryView>;
    /** Per-faction summary of manpower pools and strategic reserves. */
    mobilizationSummary?: Record<string, MobilizationSummaryView>;
    /** Top-level command-routing summary for urgent player-facing matters. */
    commandBriefing?: CommandBriefingView;
    /** Most recent turn after-action report (null before first turn is advanced). */
    latestTurnSummary: import('../../../state/turn_summary.js').TurnSummary | null;
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
    }>;
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
}

