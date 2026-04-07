/**
 * Phase H1.1: Scenario input types (inputs only; no derived fields).
 * Actions are order-normalized (stable sort) before application and logging.
 */

/** Discriminated union: noop, note, probe_intent (H1.8), baseline_ops (H1.9). */
export type ScenarioAction =
    | { type: 'noop' }
    | { type: 'note'; text: string }
    | { type: 'probe_intent'; enabled?: boolean }
    | { type: 'baseline_ops'; enabled?: boolean; intensity?: number };

export interface ScenarioTurn {
    week_index: number;
    actions: ScenarioAction[];
}

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface FactionVictoryCondition {
    min_controlled_settlements?: number;
    max_exhaustion?: number;
    required_settlements_all?: string[];
}

export interface ScenarioVictoryConditions {
    by_faction: Record<string, FactionVictoryCondition>;
}

export interface Scenario {
    scenario_id: string;
    /** Optional absolute week index anchor (weeks since Jan 1992). Enables time-adaptive bot doctrine profiles. */
    scenario_start_week?: number;
    /** Scenario lifecycle start phase. */
    start_lifecycle_phase?: 'peace' | 'war';
    /** For start_lifecycle_phase phase_0: whether referendum is already held at turn 0. Default: true (legacy fixtures). */
    peace_referendum_held_at_start?: boolean;
    /** For start_lifecycle_phase phase_0: whether RS starts already declared at turn 0. Default: true (legacy fixtures). */
    peace_rs_declared_at_start?: boolean;
    /** For start_lifecycle_phase phase_0: whether HRHB starts already declared at turn 0. Default: true (legacy fixtures). */
    peace_hrhb_declared_at_start?: boolean;
    /** For start_lifecycle_phase phase_0: turn when referendum was held. War starts at referendum_turn + 4 per canon. */
    peace_referendum_turn?: number;
    /** For start_lifecycle_phase phase_0: turn when war starts (Peace phase). Must be referendum_turn + 4. Default: peace_referendum_turn + 4. */
    peace_war_start_turn?: number;
    /** For start_lifecycle_phase phase_0: control map key/path to apply exactly when war begins (e.g. "apr1992"). */
    peace_war_start_control?: string;
    weeks: number;
    turns?: ScenarioTurn[];
    /** Phase H2.4: When true, harness injects baseline_ops for each week that has none (harness-only; off by default). */
    use_harness_bots?: boolean;
    /** Option A: scenario date key (e.g. apr1992) or path to mun1990-only control file. When set, harness uses it for initial political control. Deprecated in favor of init_control_mode when ethnic/hybrid; kept for backward compat. */
    init_control?: string;
    /** Initial political control mode: institutional (mun1990 file from init_control), ethnic_1991 (1991 census majority per settlement), hybrid_1992 (institutional + ethnic overrides above threshold). Default: hybrid_1992 when init_control is set; else uses default municipal mapping. */
    init_control_mode?: 'institutional' | 'ethnic_1991' | 'hybrid_1992';
    /** For hybrid_1992: ethnic override applies when settlement majority ethnicity share >= this threshold and differs from municipal controller. Default 0.70. */
    ethnic_override_threshold?: number;
    /** Option A: scenario date key (e.g. apr1992) or path to initial formations JSON. When set, harness loads and merges formations at start. */
    init_formations?: string;
    /** When true or a key (e.g. "default"), at Peace phase entry create OOB formations from data/source/oob_brigades.json and oob_corps.json, gated by control. */
    init_formations_oob?: boolean | string;
    /** Formation spawn directive (FORAWWV H2.4). When set, harness applies at init so Peace phase spawns militia/brigades from pools. */
    formation_spawn_directive?: { kind?: 'militia' | 'brigade' | 'both'; turn?: number; allow_displaced_origin?: boolean };
    /** When true, harness instantiates BotManager and runs bots each turn (Apr 1992 - Jan 1993 sim). */
    use_smart_bots?: boolean;
    /** Optional bot behavior profile intensity. Defaults to "medium". */
    bot_difficulty?: BotDifficulty;
    /** Optional per-turn smart-bot diagnostics artifact in scenario outputs. */
    bot_diagnostics?: boolean;
    /** Optional end-of-scenario victory evaluation contract. */
    victory_conditions?: ScenarioVictoryConditions;
    /** Peace-phase §4.8: Initial RBiH–HRHB alliance value [-1, 1]. Default 0.35 (fragile alliance, Apr 1992). */
    init_alliance_rbih_hrhb?: number;
    /** Peace-phase §4.8: Override default mixed municipalities list. */
    init_mixed_municipalities?: string[];
    /** Peace-phase §4.8: Enable dynamic RBiH–HRHB alliance mechanics (update, ceasefire, Washington). Default true when init_alliance_rbih_hrhb is set. */
    enable_rbih_hrhb_dynamics?: boolean;
    /** Peace-phase §4.8 (historical fidelity): Earliest scenario week when RBiH–HRHB open war can begin (bilateral flips, war_started_turn). April 1992 start: 26 = first week of October 1992. Default 26. */
    rbih_hrhb_war_earliest_week?: number;
    /** B4: Coercion pressure [0, 1] per municipality (mun1990_id). When set, applied to state at init; reduces Peace phase flip threshold in those muns. E.g. Prijedor, Zvornik, Foča. */
    coercion_pressure_by_municipality?: Record<string, number>;
    /** B2: Scenario IDs that must be completed before this scenario is playable. Empty or omitted = no prerequisites. */
    prerequisites?: string[];
    /**
     * Recruitment mode: "player_choice" = setup-phase recruitment from OOB catalog;
     * "auto_oob" = legacy behavior (init_formations_oob: true auto-spawns all). Default: "auto_oob".
     * "bottom_up" = Peace-phase Overhaul: TO detachments emerge at 100 threshold, grow via tier system.
     */
    recruitment_mode?: 'player_choice' | 'auto_oob' | 'bottom_up';
    /**
     * When true with recruitment_mode "player_choice", init creates corps/army_hq only and
     * defers brigade creation to turn-based recruitment (player or bot) from turn 0 onward.
     */
    no_initial_brigade_formations?: boolean;
    /** Per-faction recruitment capital (organizational readiness). Only used when recruitment_mode = "player_choice". */
    recruitment_capital?: Record<string, number>;
    /** Optional per-turn recruitment-capital accrual baseline by faction. */
    recruitment_capital_trickle?: Record<string, number>;
    /** Per-faction equipment points (heavy weapons/vehicles). Only used when recruitment_mode = "player_choice". */
    equipment_points?: Record<string, number>;
    /** Optional per-turn equipment-point accrual baseline by faction. */
    equipment_points_trickle?: Record<string, number>;
    /** Optional deterministic cap of elective recruits per faction per turn (default 1). */
    max_recruits_per_faction_per_turn?: number;
    /**
     * Peace→War phase transition: initial entrenchment turns (0..12) for all brigades at War phase entry.
     * Optional; default 0. When set, implementation may set state.meta.war_entrenchment_init_turns at load
     * so the transition can apply it. See War phase Spec §4, §6 and docs/30_planning/PHASE_I_II_EDGE_CASES.md.
     */
    war_entrenchment_init_turns?: number;
    /**
     * Phase A (Supply Reserves): When true, supply reserves system is enabled.
     * Defaults to false for backward compatibility. When true, each faction accumulates
     * reserves from production and replenishment, consumed by maintenance and combat.
     */
    supply_reserves_enabled?: boolean;
    /**
     * Stuck-in-Peace-phase fallback: after this many Peace phase turns (since war_start_turn) without transition,
     * force transition to War phase. Optional; when absent, default 52 is used for phase_0/phase_i starts.
     * See docs/30_planning/PHASE_I_II_EDGE_CASES.md.
     */
    war_force_transition_after_turns?: number;
    /**
     * Baked initial OSID→faction map. When present, replaces the runtime derivation
     * (operational_political_control.json load) and already includes any osid_control_overrides.
     * Keys: OSID strings ("op:mun:slug"). Values: FactionId ("RS", "RBiH", "HRHB").
     */
    initial_osid_controllers?: Record<string, string>;
    /**
     * Per-OSID political control overrides. Applied after OSID promotion (majority voting),
     * before OOB formation creation. Used for historically accurate initial control that
     * differs from municipality-level ethnic majority (e.g. Brčko: city held by VRS despite
     * municipality-level Bosniak majority).
     * Keys: OSID strings (e.g. "op:brcko:brcko"). Values: FactionId ("RS", "RBiH", "HRHB").
     */
    osid_control_overrides?: Record<string, string>;
    /**
     * Per-faction OSID-level avoidance list. Brigade AI adds a heavy penalty for attacking these OSIDs
     * for the listed faction, preventing them from targeting historically-specific pockets/salients.
     * E.g. "RBiH": ["op:zavidovici:vozuca_2"] keeps RBiH from attacking the Vozuća VRS pocket.
     */
    avoided_osids_by_faction?: Record<string, string[]>;
    /**
     * War timeline ID (e.g. "apr1992"). When set, loads faction temporal profiles
     * from data/scenarios/timelines/{id}.json — doctrine phases, standing orders,
     * cohesion drift/floor/ceiling, reinforcement multipliers, equipment decay,
     * external support, maintenance decay. Stored on GameState.war_timeline.
     */
    war_timeline?: string;
    /** Officer data file ID. When set, loads named officers from data/scenarios/officers/{id}_officers.json. */
    init_officers?: string;
    /**
     * Scenario-authored must-hold OSIDs per corps. Commander garisons these zones at 1.5×
     * budget regardless of dynamic posture. Use for corridor lynchpins (Brcko, Doboj) where
     * historical necessity demands stronger defense than the engine would derive autonomously.
     * Keys: corps_id (e.g. "vrs_posavina"). Values: OSID list.
     */
    must_hold_osids_by_corps?: Record<string, string[]>;
    /** Per-corps comms quality override for scenarios with specific radio/comms constraints. */
    comms_override_by_corps?: Record<string, { before_turn: number; mode: 'radio' | 'full' }>;
}

