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
import type { ArmyLabel } from './identity.js';
import type { RecruitmentResourceState } from './recruitment_types.js';
import type { CasualtyLedger } from './casualty_ledger.js';

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

/** Brigade municipality movement order: replace brigade municipality assignment for this turn. */
export type BrigadeMunicipalityOrder = Record<FormationId, MunicipalityId[] | null>;

/** Brigade posture order: set a brigade's posture. */
export interface BrigadePostureOrder {
  brigade_id: FormationId;
  posture: BrigadePosture;
}

/** Brigade movement status (Brigade AoR Redesign Phase C: pack/unpack cycle). */
export type BrigadeMovementStatus = 'deployed' | 'packing' | 'in_transit' | 'unpacking';

/** Per-brigade movement state. When status is in_transit, brigade has no AoR. */
export interface BrigadeMovementState {
  status: BrigadeMovementStatus;
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

/** Named corps operation (multi-turn: planning → execution → recovery). */
export interface CorpsOperation {
  name: string;
  type: 'general_offensive' | 'sector_attack' | 'strategic_defense' | 'reorganization';
  phase: 'planning' | 'execution' | 'recovery';
  started_turn: number;
  phase_started_turn: number;
  target_settlements?: SettlementId[];
  participating_brigades: FormationId[];
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
export type PhaseName = 'phase_0' | 'phase_i' | 'phase_ii';

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
export type FormationKind = 'militia' | 'territorial_defense' | 'brigade' | 'operational_group' | 'corps_asset' | 'corps' | 'og' | 'army_hq';

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
  experience?: number; // [0,1] formation experience (Phase I / System 10)
  activation_gated?: boolean; // true if activation is blocked by time, authority, or supply constraints
  activation_turn?: number | null; // turn when formation activated (null if still forming)
  // System 3: Heavy equipment state.
  equipment_state?: EquipmentState;
  // System 9: Doctrine eligibility and activation.
  doctrine_state?: DoctrineState;
  /** HQ settlement for map placement and clickable icon. When set, icon is drawn at this settlement; when absent, fallback to municipality centroid. */
  hq_sid?: SettlementId;
  // --- Brigade Operations System fields ---
  /** Brigade posture (Phase II). Default: 'defend'. */
  posture?: BrigadePosture;
  /** Parent corps formation ID (null = unattached). */
  corps_id?: FormationId | null;
  /** Typed brigade composition (tanks, artillery, infantry). */
  composition?: BrigadeComposition;
  /** 1-turn disruption flag from AoR reshaping; reduces pressure output. */
  disrupted?: boolean;
  /** WIA trickleback: wounded pending return to this formation (only return when out of combat). */
  wounded_pending?: number;
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
  phase_0_scheduled_referendum_turn?: number | null;
  /** Phase 0: Optional scheduled war-start turn override used with scheduled referendum starts. */
  phase_0_scheduled_war_start_turn?: number | null;
  /** Phase 0: Optional absolute path to a mun1990 control file to apply exactly when war starts. */
  phase_0_war_start_control_path?: string | null;
  /** Phase 0: First turn when referendum became eligible (both RS and HRHB declared). */
  referendum_eligible_turn?: number | null;
  /** Phase 0: Deadline turn for referendum; if reached without referendum → non-war terminal. */
  referendum_deadline_turn?: number | null;
  /** Phase 0: Game ended (e.g. non-war terminal). Phase I unreachable when true without war. */
  game_over?: boolean;
  /** Phase 0: Outcome label when game_over (e.g. 'non_war_terminal'). */
  outcome?: string;
  /** Phase I → II: Consecutive turns with opposing-control edges >= MIN_OPPOSING_EDGES (D0.9.1). Default 0 on load. */
  phase_i_opposing_edges_streak?: number;
  /** Phase I §4.8 (historical fidelity): Earliest turn when RBiH–HRHB open war can begin. When turn < this value, RBiH–HRHB treated as allied for flips and alliance cannot drop below ALLIED_THRESHOLD. Default 26 when absent (October 1992 for April 1992 start). */
  rbih_hrhb_war_earliest_turn?: number | null;
  /** Phase I §4.8: When false, alliance value is not updated (RBiH–HRHB remain at init_alliance_rbih_hrhb). Set from scenario.enable_rbih_hrhb_dynamics. */
  enable_rbih_hrhb_dynamics?: boolean;
  /** Desktop GUI: which side the human plays (RBiH, RS, HRHB). Set when starting a new campaign from the app. Non-normative for simulation. */
  player_faction?: FactionId;
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
  /** Phase II: delayed hostile takeover timers (per municipality). */
  hostile_takeover_timers?: Record<MunicipalityId, HostileTakeoverTimerState>;
  /** Phase II: temporary camp holding pools before rerouting (per municipality). */
  displacement_camp_state?: Record<MunicipalityId, DisplacementCampState>;
  /** Phase II: non-takeover minority flight state (per settlement). Canon: displacement redesign 2026-02-17. */
  minority_flight_state?: Record<SettlementId, MinorityFlightStateEntry>;
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
  phase_i_consolidation_until?: Record<MunicipalityId, number>;
  /** Militia strength [0, 100] per municipality per faction; Phase I §4.2. */
  phase_i_militia_strength?: Record<MunicipalityId, Record<FactionId, number>>;
  /** Control strain accumulated per municipality; Phase I §4.5. */
  phase_i_control_strain?: Record<MunicipalityId, number>;
  /** JNA withdrawal and asset transfer; Phase I §4.6. Does not start war. */
  phase_i_jna?: PhaseIJNAState;
  /** RBiH–HRHB alliance relationship [-1, 1]; Phase I §4.8. */
  phase_i_alliance_rbih_hrhb?: number;
  /** Phase I §4.8: RBiH–HRHB bilateral state (war tracking, ceasefire, Washington Agreement). */
  rbih_hrhb_state?: RbihHrhbState;
  /** Phase I §4.4: displacement initiated turn per municipality (hook only; no population change). */
  phase_i_displacement_initiated?: Record<MunicipalityId, number>;
  /** B4: Coercion pressure [0, 1] per municipality; reduces flip threshold (makes flip easier). Scenario/init can supply (e.g. Prijedor, Zvornik). */
  coercion_pressure_by_municipality?: Record<MunicipalityId, number>;

  // --- Phase II (Mid-War / Consolidation) state (Phase D; Engine Invariants §4, §6, §8) ---
  /** Supply pressure per faction [0, 100]; higher = worse. Constrains effectiveness; no free replenishment. */
  phase_ii_supply_pressure?: Record<FactionId, number>;
  /** Faction-level exhaustion (monotonic, irreversible). Engine Invariants §8. */
  phase_ii_exhaustion?: Record<FactionId, number>;
  /** Optional local (per-settlement) exhaustion accumulator; monotonic when present. */
  phase_ii_exhaustion_local?: Record<SettlementId, number>;

  // --- Phase F (Displacement & Population Dynamics) — stored, not derived (ROADMAP Phase F) ---
  /** Settlement-level displacement (capacity degradation) [0, 1]. Monotonic; never decreases. */
  settlement_displacement?: Record<SettlementId, number>;
  /** Turn when displacement began at this settlement (optional; for reporting only). */
  settlement_displacement_started_turn?: Record<SettlementId, number>;
  /** Municipality-level displacement (capacity degradation) [0, 1]. Monotonic; never decreases. */
  municipality_displacement?: Record<MunicipalityId, number>;

  // --- Brigade Operations System state ---
  /** Per-brigade municipality supra-layer assignment (Phase II). Brigades may share municipalities. */
  brigade_municipality_assignment?: Record<FormationId, MunicipalityId[]>;
  /** Pending brigade municipality movement orders (consumed once per turn). */
  brigade_mun_orders?: BrigadeMunicipalityOrder;
  /** Per-settlement brigade AoR assignment (Phase II). null = rear settlement (no brigade). */
  brigade_aor?: Record<SettlementId, FormationId | null>;
  /** Pending AoR reshape orders (consumed once per turn). */
  brigade_aor_orders?: BrigadeAoROrder[];
  /** Pending brigade posture orders (consumed once per turn). */
  brigade_posture_orders?: BrigadePostureOrder[];
  /** Attack orders: one target settlement per brigade per turn; null = no attack (Brigade Realism plan §3.4). Consumed once per turn. */
  brigade_attack_orders?: Record<FormationId, SettlementId | null>;
  /** Corps command state. Key: corps FormationId. */
  corps_command?: Record<FormationId, CorpsCommandState>;
  /** Army-level stance per faction. */
  army_stance?: Record<FactionId, ArmyStance>;
  /** OG activation orders (consumed once per turn). */
  og_orders?: OGActivationOrder[];
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
}

/** Civilian casualties from displacement (killed, fled abroad) per faction (ethnicity-aligned). */
export interface CivilianCasualtiesByFaction {
  [factionId: string]: { killed: number; fled_abroad: number };
}
