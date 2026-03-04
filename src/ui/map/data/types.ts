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
    home_corps_id?: string;
    status: string;
    assigned_corps_id: string | null;
    acting_commander: boolean;
    turns_in_command: number;
    battles: number;
    victories: number;
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
}

export interface MilitiaPoolView {
    munId: string;
    faction: string;
    available: number;
    committed: number;
    exhausted: number;
    fatigue: number;
}

export interface ReconIntelligenceView {
    detected_brigades: Record<string, { strength_category: string; detected_via: string }>;
    confirmed_empty: string[];
}

export interface EnclaveResilienceView {
    resilience: number;
    isolation_turns: number;
    hardening_active: boolean;
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
    last_major_shift: number;
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
    participating_brigade_count: number;
    started_turn: number;
    supply_readiness?: number;
}

export interface LoadedGameState {
    label: string;
    turn: number;
    phase: string;
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
    phaseIiSupplyPressure?: Record<string, number>;
    phaseIiExhaustion?: Record<string, number>;
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
    reconIntelligence?: ReconIntelligenceView;
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
}

