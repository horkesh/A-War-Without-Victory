/**
 * Elite loan system types.
 *
 * Army-level elite units can be temporarily "loaned" to a corps
 * for 6-week deployments with 4-week cooldown between.
 *
 * Forced recall at 30% casualties or morale < 35.
 * Permanent degradation if personnel drops below 50%.
 */

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
}

/** Elite loan system constants. */
export const ELITE_LOAN_DURATION = 6;
export const ELITE_LOAN_COOLDOWN = 4;
export const ELITE_CASUALTY_THRESHOLD = 0.30;
export const ELITE_MORALE_RECALL = 35;
export const ELITE_DEGRADATION_THRESHOLD = 0.50;
export const ELITE_REINFORCEMENT_RATE = 0.50;

/** Create initial elite loan state (not on loan, not degraded). */
export function createEliteLoanState(): EliteLoanState {
    return {
        on_loan: false,
        loaned_to_corps: null,
        loan_start_turn: null,
        last_recall_turn: null,
        loan_start_personnel: null,
        permanently_degraded: false,
    };
}
