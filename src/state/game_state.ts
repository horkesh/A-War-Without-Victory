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
import type { CasualtyLedger } from './casualty_ledger.js';
import type { ArmyLabel } from './identity.js';
import type { RecruitmentResourceState } from './recruitment_types.js';

export const CURRENT_SCHEMA_VERSION = 1 as const;

// --- ID types (canonical) ---
export type FactionId = string;
/** Alias for faction identity in political control and authority contexts. */
export type FactionKey = FactionId;

export type FormationId = string;

export type MunicipalityId = string;

export type PostureLevel = 'hold' | 'probe' | 'push';

// --- Brigade Operations System types ---

/** Brigade posture (Phase II). Controls pressure output, defensive resilience, and exhaustion rate. */
export type BrigadePosture = 'defend' | 'probe' | 'attack' | 'elastic_defense' | 'consolidation';

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

/** Corps standing stance (always active, modifies subordinate brigades). */
export type CorpsStance = 'defensive' | 'balanced' | 'offensive' | 'reorganize';

/** Army-level stance (overrides corps stances when set). */
export type ArmyStance = 'general_defensive' | 'balanced' | 'general_offensive' | 'total_mobilization';

/** Phase J: Strength category for fog-of-war display (enemy formation revealed by battle/probe/recon). */
export type ReconStrengthCategory = 'weak' | 'moderate' | 'strong' | 'fortress';

/** Phase J: Detected enemy brigade info (formation known from battle, else presence-only from recon). */
export interface DetectedBrigadeInfo {
    formation_id?: FormationId;
    strength_category: ReconStrengthCategory;
    detected_turn: number;
    detected_via: 'battle' | 'probe' | 'recon' | 'linked';
}

/** Phase J: Per-faction fog-of-war intelligence (passive recon refreshed each turn). */
export interface ReconIntelligence {
    /** Enemy settlements where brigade presence is known. */
    detected_brigades: Record<SettlementId, DetectedBrigadeInfo>;
    /** Enemy settlements confirmed empty (no brigade; may have militia). Sorted array for determinism. */
    confirmed_empty: SettlementId[];
}

/** Named corps operation (multi-turn: planning → execution → recovery). */
export interface CorpsOperation {
    name: string;
    type: 'general_offensive' | 'sector_attack' | 'strategic_defense' | 'reorganization';
    phase: 'planning' | 'execution' | 'recovery';
    started_turn: number;
    phase_started_turn: number;
    target_settlements?: SettlementId[];
    participating_brigades: FormationId[];
    // --- Sector offensive fields (type === 'sector_attack') ---
    /** Which sector this launches from. */
    sector_id?: string;
    /** Ordered OSID targets (multi-OSID push). */
    objectives?: string[];
    /** Next OSID to attack (index into objectives). */
    current_objective_index?: number;
    /** Turns of preparation required (from scope). */
    planning_duration?: number;
    /** Fraction of participating brigades with adequate supply (0-1). */
    supply_readiness?: number;
    /** Consecutive objective captures (0-3, cap). */
    momentum?: number;
    /** Result of last objective attack. */
    last_result?: 'captured' | 'failed' | 'stalemate';
    /** Total failures across all objectives. */
    failure_count?: number;
    /** Consecutive failures on current objective. */
    consecutive_failures_on_current?: number;
    /** Friendly OSID where brigades stage during planning phase. */
    staging_osid?: string;
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
}

/** Per-corps command state. */
export interface CorpsCommandState {
    command_span: number;
    subordinate_count: number;
    og_slots: number;
    active_ogs: FormationId[];
    corps_exhaustion: number;
    stance: CorpsStance;
    active_operation?: CorpsOperation | null;
    /** Corps directive for subordinate brigades (generated each turn by corps AI). */
    directive?: CorpsDirective | null;
}

/** Operational group activation order. */
export interface OGActivationOrder {
    corps_id: FormationId;
    donors: Array<{ brigade_id: FormationId; personnel_contribution: number }>;
    focus_settlements: SettlementId[];
    posture: 'probe' | 'attack' | 'defend';
    max_duration: number;
}

/** Settlement holdout state (Phase I settlement-level control). */
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
 * Phase 0 = Pre-War; Phase I = Early War (Phase_Specifications_v0_3_0, Phase_0/Phase_I specs).
 */
export type PhaseName = 'peace' | 'war';

export interface FormationAssignment {
    kind: 'region' | 'edge';
    region_id?: string;
    edge_id?: string;
}

export interface FormationOpsState {
    fatigue: number; // integer >= 0, irreversible in Phase 10
    last_supplied_turn: number | null; // null or <= current turn
}

// Phase I.0: Formation lifecycle states (Systems Manual §5)
export type FormationReadinessState = 'forming' | 'active' | 'overextended' | 'degraded';

// Phase I.0: Formation types (Systems Manual §4)
export type FormationKind = 'militia' | 'brigade' | 'operational_group' | 'corps_asset' | 'corps' | 'og' | 'army_hq';

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
    // Phase I.0: Formation organization substrate
    kind?: FormationKind; // default: 'brigade' for backward compatibility
    /** Troops in formation. Brigades: spawn at MIN_BRIGADE_SPAWN (1000), reinforce from pool up to MAX_BRIGADE_PERSONNEL (2500). When absent, treat as 1000. */
    personnel?: number;
    readiness?: FormationReadinessState; // default: 'active' for backward compatibility
    cohesion?: number; // [0,100] formation cohesion, affects effectiveness and collapse risk
    /** Willingness to fight [0,100]. Non-monotonic. Distinct from cohesion (tactical effectiveness). Gates retreat resistance. */
    morale?: number;
    experience?: number; // [0,1] formation experience (Phase I / System 10)
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
    /** Brigade posture (Phase II). Default: 'defend'. */
    posture?: BrigadePosture;
    /** Parent corps formation ID (null = unattached). */
    corps_id?: FormationId | null;
    /** Typed brigade composition (tanks, artillery, infantry). */
    composition?: BrigadeComposition;
    /** Equipment class for progression (police → light_infantry → mountain). See recruitment_types.EquipmentClass. */
    equipment_class?: string;
    /** 1-turn disruption flag from AoR reshaping; reduces pressure output. */
    disrupted?: boolean;
    /** Turns on current OSID without moving; resets on move; caps at MAX_ENTRENCHMENT (12). */
    entrenchment_turns?: number;
    /** HoI: consecutive successful defenses; resets on move or attacker success; caps at MAX_RESILIENCE_STREAK (4). */
    defense_streak?: number;
    /** HoI: turns remaining disrupted (0 = not disrupted); set by push-back outcome. */
    disrupted_turns?: number;
    /** WIA trickleback: wounded pending return to this formation (only return when out of combat). */
    wounded_pending?: number;
    /** Counter-attack tracking: OSID this brigade retreated from and the turn it happened.
     *  Only the retreated brigade may initiate a counter-attack against this OSID next turn. */
    last_retreat_from?: { osid: string; turn: number };
    /** Fog of war: OSID where this brigade's attack was repulsed/catastrophic.
     *  Lifts fog for this target — brigade learned enemy strength the hard way. */
    last_repulsed_from?: { osid: string; turn: number };
    // Phase I Overhaul: proto-brigade lifecycle tracking
    /** Municipality where formation originally emerged (for naming displaced-origin brigades). */
    origin_mun?: string;
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
    last_major_shift: number | null; // turn index
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
export interface DisplacementEvent {
    turn: number;
    origin_mun: MunicipalityId;
    origin_osid?: string;
    dest_mun: MunicipalityId;
    dest_osid?: string;
    ethnicity: FactionId;
    displaced: number;
    killed: number;
    fled_abroad: number;
    settled: number;
}

/**
 * Phase II: delayed hostile-takeover displacement timer.
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
 * Phase II: temporary municipality holding pool (camp simulation) prior to rerouting.
 */
export interface DisplacementCampState {
    mun_id: MunicipalityId;
    population: number;
    started_turn: number;
    by_faction: Partial<Record<FactionId, number>>;
}

/**
 * Phase II: non-takeover minority flight (settlement-level).
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
 * Phase I (Early War): JNA withdrawal and asset transfer state (Phase_I_Spec §4.6).
 * War start remains referendum-gated; JNA transition does not start the war.
 */
export interface PhaseIJNAState {
    /** True when RS has declared and JNA withdrawal has begun. */
    transition_begun: boolean;
    /** Withdrawal progress [0, 1]; 0.05 per turn per spec. */
    withdrawal_progress: number;
    /** Asset transfer to RS (VRS) [0, 1]; 5% per turn per spec. */
    asset_transfer_rs: number;
}

/**
 * Phase I §4.8: RBiH–HRHB bilateral relationship state.
 * Tracks the full lifecycle: fragile alliance → strain → open war → ceasefire → Washington Agreement.
 * All fields deterministic; no timestamps or randomness.
 */
export interface RbihHrhbState {
    /** Turn when alliance crossed below HOSTILE_THRESHOLD (0.0); null if war not started. */
    war_started_turn: number | null;
    /** True when bilateral ceasefire preconditions met and ceasefire fired. */
    ceasefire_active: boolean;
    /** Turn when ceasefire was established; null if not yet. */
    ceasefire_since_turn: number | null;
    /** True when Washington Agreement preconditions met and agreement fired. */
    washington_signed: boolean;
    /** Turn when Washington was signed; null if not yet. */
    washington_turn: number | null;
    /** Consecutive turns with 0 bilateral RBiH-HRHB flips (stalemate counter). */
    stalemate_turns: number;
    /** Bilateral flips counted this turn (reset per turn; consumed by next turn's alliance update). */
    bilateral_flips_this_turn: number;
    /** Cumulative bilateral flips since war started. */
    total_bilateral_flips: number;
    /** Dynamic list of municipalities with both RBiH and HRHB formations/pools. Sorted deterministically. */
    allied_mixed_municipalities: string[];
}

export interface NegotiationStatus {
    ceasefire_active: boolean;
    ceasefire_since_turn: number | null;
    last_offer_turn: number | null;
}

export interface CeasefireFreezeEntry {
    since_turn: number;
    until_turn: number | null; // null for indefinite
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
    /** Game phase (Phase 0 / Phase I / Phase II). Optional for backward compatibility. */
    phase?: PhaseName;
    /** Phase 0: Referendum has been held. War start only when true and current_turn == war_start_turn. */
    referendum_held?: boolean;
    /** Phase 0: Turn when referendum was held; null if not yet held. */
    referendum_turn?: number | null;
    /** Phase 0: Turn when war starts (referendum_turn + 4). Phase I entered only at this turn. */
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
    /** Phase 0: Game ended (e.g. non-war terminal). Phase I unreachable when true without war. */
    game_over?: boolean;
    /** Phase 0: Outcome label when game_over (e.g. 'non_war_terminal'). */
    outcome?: string;
    /** Phase 0→I: Turn when Phase 0 ended (audit; set at transition). §8 Output Contract. */
    peace_end_turn?: number | null;
    /** Phase 0→I: Turn when Phase I started (audit; set at transition). §8 Output Contract. */
    war_start_lifecycle_phase_turn?: number | null;
    /** Phase 0→I: What triggered transition (e.g. 'war_start_turn'). §8 Output Contract. */
    escalation_reason?: string | null;
    /** Phase I → II: Consecutive turns with opposing-control edges >= MIN_OPPOSING_EDGES (D0.9.1). Default 0 on load. */
    war_opposing_edges_streak?: number;
    /** Phase I→II: Optional initial entrenchment turns (0..12) for all brigades at transition; set from scenario. */
    war_entrenchment_init_turns?: number;
    /** Stuck-in-Phase-I fallback: force transition after this many Phase I turns since war_start_turn (e.g. 52). */
    war_force_transition_after_turns?: number;
    /** Phase II §11.3: Operation Storm (Oluja) has triggered (precondition step set). */
    operation_storm_triggered?: boolean;
    /** Phase I §4.8 (historical fidelity): Earliest turn when RBiH–HRHB open war can begin. When turn < this value, RBiH–HRHB treated as allied for flips and alliance cannot drop below ALLIED_THRESHOLD. Default 26 when absent (October 1992 for April 1992 start). */
    rbih_hrhb_war_earliest_turn?: number | null;
    /** Phase I §4.8: When false, alliance value is not updated (RBiH–HRHB remain at init_alliance_rbih_hrhb). Set from scenario.enable_rbih_hrhb_dynamics. */
    enable_rbih_hrhb_dynamics?: boolean;
    /** Desktop GUI: which side the human plays (RBiH, RS, HRHB). Set when starting a new campaign from the app. Non-normative for simulation. */
    player_faction?: FactionId;
    /** Calendar date corresponding to turn 0 for this scenario. Defaults to { year: 1991, month: 8, day: 1 } (1 September 1991) when absent. Non-normative for simulation — used by UI only. */
    scenario_start_date?: { year: number; month: number; day: number };
    /** Phase I Overhaul: recruitment mode from scenario config. Controls whether bottom-up TO detachment
     *  lifecycle is active ("bottom_up") or legacy brigade spawn is used ("auto_oob" / "player_choice"). */
    recruitment_mode?: 'player_choice' | 'auto_oob' | 'bottom_up';
    /** Per-faction OSID-level avoidance: brigade AI will not attack these OSIDs for the listed faction.
     *  Used to lock historically-specific OSIDs (e.g. Vozuća pocket) without broad municipality targeting. */
    avoided_osids_by_faction?: Record<string, string[]>;
    /** Phase A: When true, supply reserves system is active (general supply + heavy munitions). */
    supply_reserves_enabled?: boolean;
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
 * See GameState.political_controllers. Engine Invariants §9.1.
 */
export interface SettlementState {
    // Placeholder for future fields. political_controller is NOT stored here.
    legitimacy_state?: LegitimacyState;
}

/**
 * Phase 0: Per-municipality organizational factors (Phase_0_Spec §4.2, §7.2).
 * Used for Stability Score derivation and Phase I hand-off.
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
    /** Phase 0: Stability Score [0, 100]. Carried to Phase I as flip resistance. */
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

// Phase 12C.2: Control recognition registry (legal claim without ownership transfer)
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

// Phase 3C Tier-1: Per-entity (settlement SID) eligibility state
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

// Phase 3C: Local strain accumulator (proxy until per-entity exhaustion exists)
export interface LocalStrainState {
    // Per-entity (settlement SID) local strain accumulator
    by_entity: Record<string, number>; // EntityId -> strain value (monotonic, clamped)
}

// Phase 3D: Collapse damage tracks (irreversible degradation per entity per domain)
export interface CollapseDamageState {
    // Per-entity (settlement SID) collapse damage accumulator
    by_entity: Record<string, {
        authority: number; // [0,1] monotonic damage track
        cohesion: number;  // [0,1] monotonic damage track
        spatial: number;   // [0,1] monotonic damage track
    }>;
}

// Phase 3D: Capacity modifiers (derived from collapse damage, consumed by later phases)
export interface CapacityModifiersState {
    // Per-entity (settlement SID) capacity modifiers
    by_sid: Record<string, {
        authority_mult: number;    // [0,1] multiplier for authority/control capacity
        cohesion_mult: number;     // [0,1] multiplier for cohesion/formation capacity
        supply_mult: number;       // [0,1] multiplier for supply throughput
        pressure_cap_mult: number; // [0,1] multiplier for front pressure generation cap
    }>;
}

// Phase 5B: Effective posture exposure (read-only, no new mechanics)
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

// Phase 5D: Loss-of-control trend exposure (read-only, no new mechanics)
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
 * Phase II: In-memory front descriptor (non-geometric). Not serialized (Engine Invariants §13.1).
 * Fronts are derived each turn from settlement-level interaction; this type describes one logical front.
 */
export type PhaseIIFrontStability = 'fluid' | 'static' | 'oscillating';

export interface PhaseIIFrontDescriptor {
    /** Stable identifier for this front (e.g. "F_<edge_id_0>_<turn>"). */
    id: string;
    /** Edge IDs that constitute this front (settlement contact edges). */
    edge_ids: string[];
    /** Turn when this front was first detected. */
    created_turn: number;
    /** Stability: fluid (mobile), static (hardened), oscillating. */
    stability: PhaseIIFrontStability;
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
    // Persistent formation roster (scaffolding only; no gameplay effects in this phase)
    formations: Record<FormationId, FormationState>;
    front_segments: Record<string, FrontSegmentState>;
    // scaffolding-only: stored intent/allocation (no resolution yet)
    front_posture: Record<FactionId, FrontPostureState>;
    // player-facing scaffolding: region-level posture assignments, expanded deterministically into per-edge posture
    front_posture_regions: Record<FactionId, FrontRegionPostureState>;
    // scaffolding-only: persistent pressure accumulator per segment (no resolution yet)
    front_pressure: Record<string, FrontPressureState>;
    /** Municipality-level militia pools. Key: MunicipalityId (legacy) or "mun_id:faction" (composite). Plan: militia_and_brigade_formation_system. */
    militia_pools: Record<string, MilitiaPoolState>;
    /** Phase II (Brigade AoR Redesign Phase B): Per-settlement militia garrison strength. Derived from militia_pools + org penetration; settlements with a brigade use brigade garrison instead. Recomputed each turn. */
    militia_garrison?: Record<SettlementId, number>;
    /** Phase II (Brigade AoR Redesign Phase C): Per-brigade movement state (packing / in_transit / unpacking). When in_transit, brigade has no AoR. */
    brigade_movement_state?: Record<FormationId, BrigadeMovementState>;
    /** Phase II (Brigade AoR Redesign Phase C): Pending movement orders (consumed each turn). destination_sids = 1–4 contiguous faction-controlled settlements. */
    brigade_movement_orders?: Record<FormationId, { destination_sids: SettlementId[] }>;
    /** Phase II: Pending reposition orders (consumed each turn). Set brigade AoR to exactly these 1–4 contiguous faction-controlled settlements; no physical move. */
    brigade_reposition_orders?: Record<FormationId, { settlement_ids: SettlementId[] }>;
    /** Phase II tactical deploy/undeploy staging (consumed each turn). */
    brigade_deploy_orders?: Record<FormationId, BrigadeDeployAction>;
    /** Phase II (Brigade AoR Redesign Phase G): Per-brigade encirclement (AoR entirely in enclave). Used for cohesion drain, garrison penalty, movement block. */
    brigade_encircled?: Record<FormationId, boolean>;
    /** Phase II (Brigade AoR Redesign Phase I): Per-settlement cumulative battle damage [0, 1] (exhaustion-as-terrain). */
    battle_damage?: Record<SettlementId, number>;
    /** Phase II (Brigade AoR Redesign Phase J): Per-faction recon intelligence (detected enemy brigades, confirmed empty). */
    recon_intelligence?: Record<FactionId, ReconIntelligence>;
    /** Formation spawn directive (FORAWWV H2.4). When set and active for current turn, formation spawn may run. */
    formation_spawn_directive?: FormationSpawnDirective;
    /** Strategic production facilities (capturable local supply contributors). */
    production_facilities?: Record<string, ProductionFacilityState>;
    // Phase 11B: Negotiation status and ceasefire enforcement
    negotiation_status?: NegotiationStatus;
    ceasefire?: Record<string, CeasefireFreezeEntry>; // keyed by edge_id
    // Phase 12A: Negotiation capital ledger
    negotiation_ledger?: NegotiationLedgerEntry[];
    // Phase 12C.2: Negotiated control overrides (applied after AoR control resolution)
    control_overrides?: Record<SettlementId, ControlOverrideState>;
    // Phase 12C.2: Control recognition registry (legal claim without ownership transfer)
    control_recognition?: Record<SettlementId, ControlRecognitionState>;
    // Phase 12C.3: Supply rights registry (corridor traversal rights)
    supply_rights?: SupplyRightsState;
    // Phase 12D.0: Peace end-state marker (war ends when territorial treaty is applied)
    end_state?: EndState;
    // Phase 21: Population displacement tracking (per municipality)
    displacement_state?: Record<MunicipalityId, DisplacementState>;
    /** Phase II: delayed hostile takeover timers (per OSID). */
    hostile_takeover_timers?: Record<string, HostileTakeoverTimerState>;
    /** Phase II: temporary camp holding pools before rerouting (per municipality). */
    displacement_camp_state?: Record<MunicipalityId, DisplacementCampState>;
    /** Phase II: non-takeover minority flight state (per settlement). Canon: displacement redesign 2026-02-17. */
    minority_flight_state?: Record<SettlementId, MinorityFlightStateEntry>;
    /** Cumulative displacement event log, sorted by (turn, origin_mun). */
    displacement_event_log?: DisplacementEvent[];
    // Phase 22: Sustainability collapse tracking (per municipality)
    sustainability_state?: Record<MunicipalityId, SustainabilityState>;
    // Phase 3C: Collapse eligibility state (per faction, Tier-0)
    collapse_eligibility?: Record<FactionId, CollapseEligibilityState>;
    // Phase 3C Tier-1: Per-entity (settlement SID) eligibility state
    collapse_eligibility_tier1?: Record<string, Tier1EntityEligibilityState>; // EntityId -> Tier1EntityEligibilityState
    // Phase 3C: Local strain accumulator (proxy until per-entity exhaustion exists)
    local_strain?: LocalStrainState;
    // Phase 3D: Collapse damage tracks (irreversible degradation per entity per domain)
    collapse_damage?: CollapseDamageState;
    // Phase 3D: Capacity modifiers (derived from collapse damage, consumed by later phases)
    capacity_modifiers?: CapacityModifiersState;
    // Phase 5B: Effective posture exposure (read-only, no new mechanics)
    effective_posture_exposure?: EffectivePostureExposureState;
    // Phase 5C: Logistics prioritization (player intent injection, no new mechanics)
    // Target ID format: edge_id for edge assignments, region_id for region assignments
    logistics_priority?: Record<FactionId, Record<string, number>>; // target_id -> priority (default 1.0, > 0)
    // Phase 5D: Loss-of-control trend exposure (read-only, no new mechanics)
    loss_of_control_trends?: LossOfControlTrendExposureState;
    /**
     * Political control substrate (per settlement, independent of AoR).
     * CANONICAL: Political control is authoritative at political_controllers; no duplicate storage permitted.
     * Engine Invariants §9.1: every settlement must have an entry; value may be null but key must exist.
     * Initialized deterministically before fronts/AoR/pressure (Engine Invariants §9.2).
     */
    political_controllers?: Record<SettlementId, FactionId | null>;
    /**
     * Political control contested flag (per settlement).
     * true => contested at initialization; false => uncontested.
     */
    contested_control?: Record<SettlementId, boolean>;
    /** Phase 0: Per-municipality state (stability_score, organizational_penetration). Hand-off to Phase I. */
    municipalities?: Record<MunicipalityId, MunicipalityState>;
    /** System 4: Settlement-level state (legitimacy, etc). */
    settlements?: Record<SettlementId, SettlementState>;
    /** System 1: International Visibility Pressure (IVP). */
    international_visibility_pressure?: InternationalVisibilityPressure;
    /** System 5: Enclave integrity tracking. */
    enclaves?: EnclaveState[];
    /** System 6: Sarajevo exception state. */
    sarajevo_state?: SarajevoState;

    // --- Phase I (Early War) state (Phase_I_Specification_v0_3_0.md) ---
    /** Turn (inclusive) until which municipality cannot flip control; keyed by MunicipalityId. */
    war_consolidation_until?: Record<MunicipalityId, number>;
    /** Militia strength [0, 100] per municipality per faction; Phase I §4.2. */
    war_militia_strength?: Record<MunicipalityId, Record<FactionId, number>>;
    /** Control strain accumulated per municipality; Phase I §4.5. */
    war_control_strain?: Record<MunicipalityId, number>;
    /** JNA withdrawal and asset transfer; Phase I §4.6. Does not start war. */
    war_jna?: PhaseIJNAState;
    /** RBiH–HRHB alliance relationship [-1, 1]; Phase I §4.8. */
    war_alliance_rbih_hrhb?: number;
    /** Phase I §4.8: RBiH–HRHB bilateral state (war tracking, ceasefire, Washington Agreement). */
    rbih_hrhb_state?: RbihHrhbState;
    /** Phase I §4.4: displacement initiated turn per municipality (hook only; no population change). */
    war_displacement_initiated?: Record<MunicipalityId, number>;
    /** B4: Coercion pressure [0, 1] per municipality; reduces flip threshold (makes flip easier). Scenario/init can supply (e.g. Prijedor, Zvornik). */
    coercion_pressure_by_municipality?: Record<MunicipalityId, number>;

    // --- Phase II (Mid-War / Consolidation) state (Phase D; Engine Invariants §4, §6, §8) ---
    /** Supply pressure per faction [0, 100]; higher = worse. Constrains effectiveness; no free replenishment. */
    war_supply_pressure?: Record<FactionId, number>;
    /** Faction-level exhaustion (monotonic, irreversible). Engine Invariants §8. */
    war_exhaustion?: Record<FactionId, number>;
    /** Optional local (per-settlement) exhaustion accumulator; monotonic when present. */
    war_exhaustion_local?: Record<SettlementId, number>;
    /** Enclave resilience per enclave ID. Phase C: EnclaveResilienceEntry; old saves: bare number. */
    enclave_resilience?: Record<string, number | EnclaveResilienceEntry>;
    /** Consecutive critical-supply turns per faction:OSID. Key: `${factionId}:${osid}`. Phase B siege. */
    siege_turn_counters?: Record<string, number>;


    // --- Supply Reserves (Phase A — SUPPLY_AMMO_SYSTEM_PLAN.md §3) ---
    /** General supply reserves per faction [0..100]. Consumed by maintenance; replenished by facilities/patron. */
    general_supply_reserve?: Record<FactionId, number>;
    /** Heavy munitions reserves per faction [0..100]. Consumed by combat; replenished by ammo facilities/patron. */
    heavy_munitions_reserve?: Record<FactionId, number>;

    // --- Phase F (Displacement & Population Dynamics) — stored, not derived (ROADMAP Phase F) ---
    /** Settlement-level displacement (capacity degradation) [0, 1]. Monotonic; never decreases. */
    settlement_displacement?: Record<SettlementId, number>;
    /** Turn when displacement began at this settlement (optional; for reporting only). */
    settlement_displacement_started_turn?: Record<SettlementId, number>;
    /** Municipality-level displacement (capacity degradation) [0, 1]. Monotonic; never decreases. */
    municipality_displacement?: Record<MunicipalityId, number>;

    // --- Brigade Operations System state (Phase II: OSID-based) ---
    /** Canonical front-edge snapshot for GUI rendering and deterministic diagnostics. */
    front_edges?: FrontEdgeState[];
    /** OSID front-edge snapshot (Phase II operational view) for HoI/OSID consumers. */
    war_front_edges_osid?: FrontEdgeState[];
    /** HoI-style assignable front segments derived from canonical front_edges. */
    assignable_front_segments?: AssignableFrontSegmentState[];
    /** HoI-style brigade assignment to an assignable front segment. null = reserve. */
    brigade_front_assignment?: Record<FormationId, string | null>;
    /** HoI-style top-level theatre model. */
    theatres?: Record<string, TheatreState>;
    /** Army (army_hq) to theatre assignment map. */
    army_theatre_assignment?: Record<FormationId, string>;
    /**
     * Corps front assignment (HoI-style): per-corps normalized edge_ids (e.g. "S1__S2").
     * Army front is derived as the union of corps fronts.
     */
    corps_front_edges?: Record<FormationId, string[]>;
    /** Optional fallback front lines for controlled withdrawal. */
    corps_fallback_front_edges?: Record<FormationId, string[]>;
    /** Player/bot desired AoR settlement cap per brigade (1–4). When set, overrides personnel-based cap. (Legacy; AoR removed.) */
    brigade_desired_aor_cap?: Record<FormationId, number>;
    /** Pending brigade posture orders (consumed once per turn). */
    brigade_posture_orders?: BrigadePostureOrder[];
    /** Attack orders: one target settlement per brigade per turn; null = no attack (Brigade Realism plan §3.4). Consumed once per turn. */
    brigade_attack_orders?: Record<FormationId, SettlementId | null>;
    /**
     * Corps-level attack axis orders: target geometry compressed as ordered edge_ids.
     * Intent-only order surface; translated to brigade orders by deterministic assignment.
     */
    corps_attack_axis_orders?: Record<FormationId, { edge_ids: string[]; created_turn?: number }>;
    /** Corps command state. Key: corps FormationId. */
    corps_command?: Record<FormationId, CorpsCommandState>;
    /** Army-level stance per faction. */
    army_stance?: Record<FactionId, ArmyStance>;
    /** OG activation orders (consumed once per turn). */
    og_orders?: OGActivationOrder[];
    /** Optional OG subfront extent as front edge IDs (subset of parent corps front). */
    og_subfront_edges?: Record<FormationId, string[]>;
    /** Settlement holdout state (Phase I settlement-level control). Key: SettlementId. */
    settlement_holdouts?: Record<SettlementId, SettlementHoldoutState>;

    // --- Phase 0 event log and relationship tracking ---
    /** Phase 0 event log: array of per-turn event arrays. Index = turn number. */
    phase0_events_log?: Phase0Event[][];
    /** Phase 0 relationship tracking (bilateral numeric values). */
    phase0_relationships?: {
        rbih_rs: number;
        rbih_hrhb: number;
    };

    // --- Recruitment system state (recruitment_system_design_note.md) ---
    /** Recruitment resources: capital pools, equipment pools, recruited brigade tracking. */
    recruitment_state?: RecruitmentResourceState;

    // --- Battle resolution & casualty tracking ---
    /** Cumulative casualty ledger (killed, wounded, missing/captured) per faction and formation. */
    casualty_ledger?: CasualtyLedger;

    /** Cumulative civilian displacement casualties (killed, fled_abroad) by ethnicity-aligned faction. */
    civilian_casualties?: CivilianCasualtiesByFaction;

    /** Local fronts: bot/player-defined defensive sectors with coverage-based power. Derived each turn. */
    local_fronts?: Record<string, LocalFront>;

    /** Corps front sectors: per-corps slices of hostile boundary. Derived each turn (Engine Invariants §13). */
    corps_front_sectors?: Record<string, CorpsFrontSector>;
}

/**
 * Local front: a defensive sector composed of contiguous front edges, with
 * assigned brigades whose power is diluted by coverage length.
 * Derived each turn (Engine Invariants §13: no serialization of derived state).
 */
export interface LocalFront {
    id: string;                       // e.g. "front_rs_drina_north"
    faction: FactionId;
    name: string;
    created_turn: number;
    assigned_brigade_ids: string[];   // brigades covering this front
    edge_ids: string[];               // front edges composing this sector
    coverage_length: number;          // number of edges (proxy for front width)
    defensive_power: number;          // computed: f(brigades, terrain, coverage)
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
    /** Brigade IDs assigned to this sector. */
    assigned_brigade_ids: FormationId[];
    /** Brigade IDs designated reserve for this sector. */
    reserve_brigade_ids: FormationId[];
    /** Density: assigned_brigades / length_edges. */
    density: number;
    /** Threat ratio: enemy power adjacent to sector / defensive power. */
    threat_ratio: number;
    /** Computed defensive power (same formula as LocalFront). */
    defensive_power: number;
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
}

/** Civilian casualties from displacement (killed, fled abroad) per faction (ethnicity-aligned). */
export interface CivilianCasualtiesByFaction {
    [factionId: string]: { killed: number; fled_abroad: number };
}


