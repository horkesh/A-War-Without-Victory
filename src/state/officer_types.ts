/**
 * Type definitions for the Named Officers system (Tier 1).
 *
 * Named officers are historical corps and army-level commanders with individual
 * ratings that affect combat modifiers, corps directives, and succession.
 *
 * Deterministic: all data is static JSON. Mutable state is on GameState.
 */

import type { FactionId } from './game_state.js';
import type { StepCurveEntry } from './war_timeline.js';

// ═══════════════════════════════════════════════════════════════════════════
// Static officer data (loaded from JSON, immutable during simulation)
// ═══════════════════════════════════════════════════════════════════════════

export type OfficerRank = 'army_commander' | 'corps_commander' | 'deputy';
export type OfficerOrigin = 'jna' | 'hv' | 'to' | 'militia' | 'foreign' | 'political' | 'military';
export type OfficerPoolTier = 'starter' | 'tier_a' | 'tier_b' | 'tier_c';

export interface NamedOfficer {
    id: string;
    name: string;
    faction: FactionId;
    rank: OfficerRank;

    /** Overall military skill (1-5). Primary combat modifier. */
    competence: number;
    /** Attack willingness (1-5). Affects corps directive aggression. */
    aggressiveness: number;
    /** Defensive combat skill (1-5). Affects defensive modifier. */
    defensive_skill: number;
    /** Political reliability (1-5). Affects HVO succession priority. */
    political_reliability: number;

    /** Preferred corps (no assignment penalty). */
    home_corps_id?: string;
    /** Acceptable corps (small assignment penalty). */
    compatible_corps_ids?: string[];

    /** Turn when officer enters the pool. */
    available_from_turn: number;
    /** Turn when officer departs (historical departure). */
    available_until_turn?: number;
    /** True if this officer starts assigned at scenario begin. */
    is_historical_start?: boolean;
    /** Corps ID to auto-assign at scenario start (for starters). */
    historical_corps_id?: string;

    origin: OfficerOrigin;
    /** 0.0-1.0, higher = more likely to be killed/captured. */
    casualty_vulnerability: number;
    /** Whether competence can improve via combat experience. */
    can_improve: boolean;
    /** Per-battle competence gain (0.0-0.1). */
    improvement_rate: number;
    /** Pool priority tier for succession ordering. */
    pool_tier: OfficerPoolTier;

    /** War crimes record from ICTY or BiH State Court. Informational — does not affect gameplay. */
    war_crimes_record?: {
        /** Court that handled the case. */
        court: 'ICTY' | 'BiH State Court';
        /** Outcome of proceedings. */
        verdict: 'convicted' | 'acquitted' | 'died_before_trial' | 'indicted';
        /** Sentence if convicted (e.g. "Life imprisonment", "20 years"). */
        sentence?: string;
        /** Primary charges. */
        charges: string;
        /** One-line summary. */
        summary: string;
    };

    /** If set, officer is physically trapped in an enclave and can only command ops within it. */
    enclave_lock?: {
        /** Enclave identifier (e.g. 'srebrenica', 'bihac', 'sarajevo', 'sarajevo_ring', 'orasje'). */
        enclave_id: string;
        /** Turn when enclave breaks out / officer evacuated. Undefined = permanent lock. */
        locked_until_turn?: number;
    };

    // ── A2 substrate (LANE-NIGHTSHIFT-A2-ARMY-CO-LOOP-SUBSTRATE) ──────────────
    // DDR-cited fields per audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md
    // (eee308e0). All optional + defaulted; A3 consumes them.

    /**
     * A2 substrate (DDR Q3): willingness to launch operations the political
     * leader did NOT explicitly order. 1-5 scale (higher = more autonomous).
     * ≥4 unlocks autonomous-launch path in A3. Canonical defaults from DDR:
     * Mladić=5, Halilović=4, Praljak=3, Delić=2, Petković=2, Roso=2. Defaults
     * applied at population time (A4); undefined here means "use canonical
     * fallback" in A3.
     *
     * Faction-symmetric mechanism: every army CO has a stubbornness value;
     * faction-asymmetric data only.
     */
    stubbornness?: number;

    /**
     * A2 substrate (DDR Q4): tolerance of subordinate insubordination /
     * autonomous launches before relief. 1-5 scale (higher = more permissive).
     * Only meaningful on POLITICAL leaders; storing on the general officer
     * schema is fine (a different consumer reads it). Canonical defaults from
     * DDR: Karadžić=4, Izetbegović=3, Boban=2.
     *
     * Faction-symmetric mechanism: every political-leader entry has a tolerance
     * value; faction-asymmetric data only.
     */
    override_tolerance?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Mutable officer state (on GameState, changes each turn)
// ═══════════════════════════════════════════════════════════════════════════

export type OfficerStatus = 'active' | 'reserve' | 'killed' | 'captured' | 'retired' | 'defected';

export interface NamedOfficerState {
    officer_id: string;
    status: OfficerStatus;
    assigned_corps_id: string | null;
    turns_in_command: number;
    battles: number;
    victories: number;
    /** Negative competence penalty from incompatible assignment. */
    effective_competence_penalty: number;
    /** Turns remaining on assignment penalty. 0 = no penalty. */
    penalty_turns_remaining: number;
    /** True if serving as acting commander (lower modifier). */
    acting_commander: boolean;
    /** Operation name if currently commanding a named operation. */
    assigned_operation?: string;
    /** Accumulated experience points from commanding operations. */
    experience_points?: number;
    /** Total number of operations commanded. */
    operations_commanded?: number;
    /** Competence at first experience gain (baseline for drift tracking). */
    initial_competence?: number;
    /** Aggressiveness at first experience gain (baseline for skill shift cap). */
    initial_aggressiveness?: number;
    /** Consecutive operation failures (reset on success). Drives defeatism check. */
    consecutive_op_failures?: number;
    /** Number of times this officer's interpretation was overridden by the player. */
    override_count?: number;
    /** Turn when last overridden (tracks consecutive override window). */
    last_override_turn?: number;
    /** If set, officer is "cowed" — complies fully without deviation until this turn. */
    cowed_until_turn?: number;

    // ── A2 substrate (LANE-NIGHTSHIFT-A2-ARMY-CO-LOOP-SUBSTRATE) ──────────────
    // DDR-cited fields per audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md
    // (eee308e0). All optional + defaulted at consumption (A3); writers populate
    // when the autonomous-launch path or override-tracking path fires. No
    // breaking changes to existing saves.

    /**
     * A2 substrate (DDR Q3): turn of last autonomous launch by this army CO.
     * Used by A3 to enforce the 12-turn rolling-window cooldown
     * (max 1 autonomous launch per army CO per 12 turns).
     * Undefined = never autonomously launched.
     */
    last_autonomous_launch_turn?: number;

    /**
     * A2 substrate (DDR Q4): rolling 12-turn override history for political bot
     * auto-relief threshold (≥3 overrides in 12 turns triggers relief).
     * Append-only ring (consumer prunes entries with turn < currentTurn - 12).
     * Each entry carries the resolution so A3 can distinguish patient overrides
     * from full reliefs. Sorted by turn ascending for determinism.
     */
    recent_overrides?: { turn: number; resolution: 'accept' | 'override' | 'relieve' }[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Faction officer config (from war timeline)
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// Pending officer events (player notification system)
// ═══════════════════════════════════════════════════════════════════════════

export type OfficerEventType =
    | 'officer_available'
    | 'replacement_suggested'
    | 'order_pushback'    // officer objects to an order but will partially comply
    | 'order_modified'    // officer silently modified order parameters
    | 'order_refused'     // officer refuses order entirely, reverts to preferred
    | 'order_exceeded'    // officer expanded beyond order scope (aggressive officers)
    | 'officer_relieved'  // player relieved (fired) the officer
    // ── A3 substrate (LANE-NIGHTSHIFT-A3-ARMY-LEVEL-ORDER-INTERPRETATION) ──
    // DDR-cited per audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md
    // (eee308e0). Both event types are fired by the army-level interpretation
    // path; the corps-level path (order_interpretation.ts) is unchanged.
    | 'army_directive_pushback'  // army CO objects to political directive (compliance < FULL)
    | 'army_co_proposes_op';     // Mladić-class autonomous launch proposal (1-turn warning)

/**
 * Snapshot of an order for before/after interpretation comparison.
 * Used in PendingOfficerEvent to show player what changed.
 */
export interface OrderSnapshot {
    order_type:
        | 'stance_change'
        | 'operation_launch'
        | 'operation_halt'
        | 'brigade_reassign'
        // ── A3 (LANE-NIGHTSHIFT-A3-ARMY-LEVEL-ORDER-INTERPRETATION) ──
        | 'political_directive'   // army-level: political → corps directive translation
        | 'army_co_proposed_op';  // army-level: autonomous-launch proposal payload
    corps_id: string;
    /** For stance changes */
    stance?: string;
    /** For operations */
    operation_name?: string;
    objectives?: string[];
    /** For halts */
    delay_turns?: number;
    /** For political_directive (A3): canonical directive verb. */
    directive_verb?: string;
    /** For army_co_proposed_op (A3): catalog opportunity_id of the proposed op. */
    opportunity_id?: string;
}

export interface PendingOfficerEvent {
    /** Unique event key for deduplication. */
    event_id: string;
    type: OfficerEventType;
    faction: FactionId;
    turn: number;
    /** The newly available officer ID. */
    officer_id: string;
    /** For replacement_suggested: the current commander being suggested for replacement. */
    current_commander_id?: string;
    /** Corps ID where the replacement is suggested. */
    corps_id?: string;
    /** Whether the player has acknowledged this event. */
    acknowledged: boolean;
    /** The original order the player issued. Null if not an interpretation event. */
    original_order?: OrderSnapshot;
    /** What the officer actually did / proposes to do. */
    interpreted_order?: OrderSnapshot;
    /** Human-readable explanation of why the officer deviated. */
    reason?: string;
    /** Whether the player can override this interpretation via IPC. */
    overridable?: boolean;
    /** IPC action string to call to force original order (wired in Phase 2). */
    override_action?: string;
}

export interface FactionOfficerConfig {
    faction: FactionId;
    /**
     * Step-curve override for `learning_rate_per_turn`. When present, takes
     * precedence over the scalar `learning_rate_per_turn` field below (and over
     * `learning_rate_multiplier` / `learning_rate`). Each entry's `value` is the
     * absolute per-turn combat-growth rate for that band; bands may include
     * negative values to model late-war cadre erosion (panel B'.2 precedent —
     * 2026-05-05 Phase 0 panel for OQ-Growth timeline-data variant).
     *
     * MUTUALLY EXCLUSIVE with the scalar `learning_rate_per_turn`: the validator
     * will reject configurations defining both for the same faction.
     *
     * Defaults to the scalar `learning_rate_per_turn` when no band matches the
     * current turn (or to the path #4 hardcoded fallback when neither scalar nor
     * step-curve is present).
     *
     * Faction-symmetric mechanism; faction-asymmetric data only.
     */
    learning_rate_per_turn_step_curve?: StepCurveEntry[];
    /**
     * Absolute per-turn combat-growth rate for brigade officer quality (before
     * quality dampening `(1 - quality * 0.5)`). Preferred field for new scenarios.
     * Frontline growth scales by `FRONTLINE_GROWTH_BASE / COMBAT_GROWTH_BASE` (= 0.5).
     *
     * SHADOWED by `learning_rate_per_turn_step_curve` when both are present (the
     * step-curve wins; the scalar is preserved as fallback for non-canonical
     * faction codes / out-of-band turns).
     */
    learning_rate_per_turn?: number;
    /**
     * Multiplier on `COMBAT_GROWTH_BASE` (= 0.01). Use when an explicit relative
     * factor is desired. Mutually exclusive with `learning_rate_per_turn` in
     * effect — `learning_rate_per_turn` wins if both are set.
     */
    learning_rate_multiplier?: number;
    /**
     * @deprecated Ambiguous unit (treated as multiplier on `COMBAT_GROWTH_BASE`
     * for backward compatibility). New scenarios MUST use `learning_rate_per_turn`
     * (absolute) or `learning_rate_multiplier` (multiplier). See
     * `docs/40_reports/implemented/20260501_FORCE_QUALITY_TRAJECTORY_EVIDENCE_AUDIT.md` §4.
     */
    learning_rate?: number;
    /** VRS brain drain: officers leaving per 20 turns after w40. */
    brain_drain_rate?: number;
    /** VRS brain drain start week. */
    brain_drain_start_week?: number;
    /** ARBiH pool regeneration: new officer every N turns. */
    pool_regeneration_interval?: number;
    /** ARBiH generated officer base competence. */
    pool_generated_base_competence?: number;
    /** ARBiH generated officer competence cap. */
    pool_generated_max_competence?: number;
    /** HVO Zagreb cadre: new officer every N turns. */
    zagreb_cadre_interval?: number;
    /** HVO Roso restructuring week (officers get +1 comp). */
    roso_restructuring_week?: number;
    /** ARBiH warlord friction end week. */
    warlord_friction_end_week?: number;
    /** HVO political replacement delay (turns). */
    political_replacement_delay?: number;
    /** HVO combat death replacement delay (turns). */
    combat_death_replacement_delay?: number;
    /** Competence of generic replacement officers. */
    generic_replacement_competence?: number;
}
