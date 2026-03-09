/**
 * Elite loan system: army-level elite units temporarily attached to corps.
 *
 * Lifecycle:
 * 1. Bot AI requests loan → elite unit deployed to corps front
 * 2. Duration: 6 weeks max
 * 3. Forced recall: 30% casualties or morale < 35
 * 4. Cooldown: 4 weeks after recall
 * 5. Permanent degradation: personnel drops below 50% of initial → loses elite status
 *
 * Deterministic: sorted iteration, threshold-based decisions.
 */

import type { FormationState, GameState, FactionId } from '../../state/game_state.js';
import {
    ELITE_LOAN_DURATION,
    ELITE_LOAN_COOLDOWN,
    ELITE_CASUALTY_THRESHOLD,
    ELITE_MORALE_RECALL,
    ELITE_DEGRADATION_THRESHOLD,
    createEliteLoanState,
} from '../../state/elite_loan_types.js';
import { strictCompare } from '../../state/validateGameState.js';

/**
 * Check if an elite formation should be force-recalled.
 */
function shouldForceRecall(formation: FormationState): boolean {
    const loan = formation.elite_loan_state;
    if (!loan || !loan.on_loan) return false;

    // Duration expired
    const currentTurn = 0; // Will be passed in
    // Morale check
    if ((formation.morale ?? 60) < ELITE_MORALE_RECALL) return true;

    // Casualty check
    if (loan.loan_start_personnel && loan.loan_start_personnel > 0) {
        const currentPersonnel = formation.personnel ?? 0;
        const casualtyRate = 1 - (currentPersonnel / loan.loan_start_personnel);
        if (casualtyRate >= ELITE_CASUALTY_THRESHOLD) return true;
    }

    return false;
}

/**
 * Process elite loan lifecycle for all formations.
 * Called once per turn as a pipeline step.
 */
export function processEliteLoanLifecycle(state: GameState): EliteLoanReport {
    const turn = state.meta?.turn ?? 0;
    const report: EliteLoanReport = {
        loans_active: 0,
        loans_recalled: 0,
        loans_expired: 0,
        permanently_degraded: 0,
    };

    const formationIds = Object.keys(state.military.formations ?? {}).sort(strictCompare);

    for (const id of formationIds) {
        const f = state.military.formations![id];
        if (!f.elite_loan_state) continue;
        if (f.status !== 'active') continue;

        const loan = f.elite_loan_state;

        // Check permanent degradation
        if (!loan.permanently_degraded) {
            const initialPersonnel = loan.loan_start_personnel ?? (f.personnel ?? 2000);
            if ((f.personnel ?? 0) < initialPersonnel * ELITE_DEGRADATION_THRESHOLD) {
                loan.permanently_degraded = true;
                report.permanently_degraded++;
            }
        }

        if (!loan.on_loan) {
            // Not on loan — nothing to process
            continue;
        }

        // Check duration expiry
        const turnsSinceLoan = loan.loan_start_turn != null ? turn - loan.loan_start_turn : 0;
        if (turnsSinceLoan >= ELITE_LOAN_DURATION) {
            recallElite(f, turn);
            report.loans_expired++;
            continue;
        }

        // Check force recall conditions
        if ((f.morale ?? 60) < ELITE_MORALE_RECALL) {
            recallElite(f, turn);
            report.loans_recalled++;
            continue;
        }
        if (loan.loan_start_personnel && loan.loan_start_personnel > 0) {
            const casualtyRate = 1 - ((f.personnel ?? 0) / loan.loan_start_personnel);
            if (casualtyRate >= ELITE_CASUALTY_THRESHOLD) {
                recallElite(f, turn);
                report.loans_recalled++;
                continue;
            }
        }

        report.loans_active++;
    }

    return report;
}

/**
 * Deploy an elite unit on loan to a corps.
 */
export function deployElite(formation: FormationState, corpsId: string, turn: number): boolean {
    if (!formation.elite_loan_state) return false;
    const loan = formation.elite_loan_state;

    // Cannot deploy if permanently degraded
    if (loan.permanently_degraded) return false;

    // Cannot deploy if on cooldown
    if (loan.last_recall_turn != null) {
        if (turn - loan.last_recall_turn < ELITE_LOAN_COOLDOWN) return false;
    }

    // Cannot deploy if already on loan
    if (loan.on_loan) return false;

    loan.on_loan = true;
    loan.loaned_to_corps = corpsId;
    loan.loan_start_turn = turn;
    loan.loan_start_personnel = formation.personnel ?? 0;

    return true;
}

/**
 * Recall an elite unit from loan.
 */
function recallElite(formation: FormationState, turn: number): void {
    const loan = formation.elite_loan_state;
    if (!loan) return;

    loan.on_loan = false;
    loan.loaned_to_corps = null;
    loan.loan_start_turn = null;
    loan.last_recall_turn = turn;
    loan.loan_start_personnel = null;
}

/**
 * Check if an elite unit is available for deployment.
 */
export function isEliteAvailable(formation: FormationState, turn: number): boolean {
    if (!formation.elite_loan_state) return false;
    const loan = formation.elite_loan_state;
    if (loan.permanently_degraded) return false;
    if (loan.on_loan) return false;
    if (loan.last_recall_turn != null && turn - loan.last_recall_turn < ELITE_LOAN_COOLDOWN) return false;
    return true;
}

export interface EliteLoanReport {
    loans_active: number;
    loans_recalled: number;
    loans_expired: number;
    permanently_degraded: number;
}
