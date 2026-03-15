/**
 * Elite loan system types.
 *
 * Army-level elite units can be temporarily "loaned" to a corps.
 * Loans are op-tied (no fixed expiry) — brigade stays until:
 *   - Operation concludes and need evaporates (op_complete / need_expired)
 *   - Player manually recalls (player_recall)
 *   - Forced recall: ≥30% casualties, morale < 35, or ≥50% personnel loss
 *
 * Cooldown of 4 turns between loans prevents thrash.
 * Permanent degradation if personnel drops below 50% of loan start.
 */

// ─── Loan state ──────────────────────────────────────────────────────────────

/** Elite loan lifecycle state for a single formation. */
export interface EliteLoanState {
    /** Whether this formation is currently deployed on loan to a corps. */
    on_loan: boolean;
    /** Corps ID receiving the loan (null when not on loan). */
    loaned_to_corps: string | null;
    /** Turn when current loan started (null when not on loan). */
    loan_start_turn: number | null;
    /** Turn when last loan ended (null if never loaned). */
    last_recall_turn: number | null;
    /** Personnel at start of current loan (for casualty threshold). */
    loan_start_personnel: number | null;
    /** Whether elite status has been permanently lost (personnel dropped below 50%). */
    permanently_degraded: boolean;
    /** Index of the current active episode in EliteBrigadeTracker.episodes (null when not on loan). */
    current_episode_id: number | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum turns on loan before army AI will consider voluntary recall (prevents thrash). */
export const ELITE_LOAN_MIN_DURATION = 6;
/** Turns of cooldown between loans. */
export const ELITE_LOAN_COOLDOWN = 4;
/** Fraction of loan-start personnel lost that triggers forced recall. */
export const ELITE_CASUALTY_THRESHOLD = 0.30;
/** Morale floor that triggers forced recall. */
export const ELITE_MORALE_RECALL = 35;
/** Cohesion floor that triggers forced recall. */
export const ELITE_COHESION_RECALL = 25;
/** Fraction of loan-start personnel lost that triggers permanent degradation. */
export const ELITE_DEGRADATION_THRESHOLD = 0.50;
/** Reinforcement rate when returned to army HQ pool. */
export const ELITE_REINFORCEMENT_RATE = 0.50;
/** Bot AI will not auto-assign a brigade more than this many BFS hops away from the requesting corps. */
export const MAX_AUTO_DEPLOY_HOPS = 8;

// ─── Request / tracker types ─────────────────────────────────────────────────

export type ReserveRequestReason =
    | 'offensive_support'   // corps has active op with momentum, wants reinforcement
    | 'defensive_gap'       // sectors under high threat_ratio, understrength
    | 'exploitation'        // corps just captured territory, wants to exploit
    | 'enclave_relief';     // enclave under siege, resilience falling

export type EliteRecallReason =
    | 'op_complete'
    | 'need_expired'
    | 'player_recall'
    | 'casualty_threshold'
    | 'morale_collapse'
    | 'cohesion_collapse'
    | 'permanent_degradation';

export interface ArmyReserveRequest {
    corps_id: string;
    faction: string;
    reason: ReserveRequestReason;
    /** Priority after geographic penalty applied (0–100, or negative = rejected). */
    priority: number;
    /** Priority before geographic penalty. */
    raw_priority: number;
    /** BFS hops from best available brigade to this corps (computed at request time). */
    travel_hops: number;
    turn_requested: number;
    description: string;
    suggested_brigade_id: string | null;
}

export interface EliteLoanEpisode {
    /** Sequential episode index within this brigade's tracker (0-based). */
    episode_id: number;
    corps_id: string;
    reason: ReserveRequestReason;
    loan_start_turn: number;
    /** null while loan is still active */
    loan_end_turn: number | null;
    /** null while loan is still active */
    recall_reason: EliteRecallReason | null;
    travel_hops: number;
    personnel_start: number;
    personnel_end: number | null;
    /** personnel_start - personnel_end (updated on close) */
    casualties_taken: number;
    /** Battles fought while on this loan */
    battles_fought: number;
    /** Enemy OSIDs captured while on this loan */
    osids_captured: number;
    /** Estimated KIA inflicted while on this loan */
    kia_inflicted_est: number;
}

export interface EliteBrigadeTracker {
    brigade_id: string;
    total_loans: number;
    total_turns_deployed: number;
    total_battles: number;
    total_casualties_taken: number;
    total_osids_captured: number;
    episodes: EliteLoanEpisode[];
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/** Create initial elite loan state (not on loan, not degraded). */
export function createEliteLoanState(): EliteLoanState {
    return {
        on_loan: false,
        loaned_to_corps: null,
        loan_start_turn: null,
        last_recall_turn: null,
        loan_start_personnel: null,
        permanently_degraded: false,
        current_episode_id: null,
    };
}

/** Create initial tracker for an elite brigade. */
export function createEliteBrigadeTracker(brigadeId: string): EliteBrigadeTracker {
    return {
        brigade_id: brigadeId,
        total_loans: 0,
        total_turns_deployed: 0,
        total_battles: 0,
        total_casualties_taken: 0,
        total_osids_captured: 0,
        episodes: [],
    };
}
