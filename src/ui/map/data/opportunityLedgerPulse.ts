/**
 * Opportunity Ledger Pulse — read-model aggregator for Records subtab "OPPORTUNITIES".
 *
 * Singular ownership: pure derivation over `state.operationOpportunityRecords`
 * (already player-scoped by `deriveOperationOpportunityRecords`). Mirrors the
 * `buildTurnAftermathLedgerSummary` pattern in `turnAftermath.ts` — no engine
 * state mutation, no I/O, deterministic via `strictCompare`-sorted iteration.
 *
 * Consumed by `OpportunityLedgerPanel.tsx` to render an Army-HQ pulse band so
 * the player can see decisions taken / missed / outcomes-so-far without leaving
 * Records.
 */
import type { LoadedGameState, OperationOpportunityRecordView } from './types';

export interface OpportunityLedgerPulseAxes {
    required_green: number;
    required_total: number;
    optional_green: number;
    optional_total: number;
}

export interface OpportunityLedgerPulse {
    /** Total tracked records (pending + resolved). */
    total_decisions: number;
    /** Resolved decisions only (taken + missed). Excludes still-pending. */
    resolved_decisions: number;
    /** Decisions still on the desk: eligible_pending_review + delayed. */
    pending: number;
    /** Player approved / redirected / under-resourced an opportunity. */
    taken: number;
    /** Player declined or let an opportunity expire. */
    missed: number;
    /** Taken decisions with no exit_class yet — operation underway. */
    in_progress: number;
    /** Decisive or partial success outcomes. */
    completed_success: number;
    /** Failed, aborted, or did_not_launch outcomes. */
    completed_failure: number;
    /** Defensive-crisis approvals that committed reserves but launched no offensive. */
    t3_authorized: number;
    /** Lifetime sum of prerequisite axis counters across all records that report them. */
    lifetime_axes: OpportunityLedgerPulseAxes;
    /** Compact one-liner summarizing the pulse for the Army-HQ band. */
    headline: string;
}

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function isPending(status: OperationOpportunityRecordView['status']): boolean {
    return status === 'eligible_pending_review' || status === 'delayed';
}

function isTaken(status: OperationOpportunityRecordView['status']): boolean {
    return status === 'approved' || status === 'redirected' || status === 'under_resourced_approved';
}

function isMissed(status: OperationOpportunityRecordView['status']): boolean {
    return status === 'declined' || status === 'expired';
}

function buildHeadline(
    total: number,
    taken: number,
    missed: number,
    success: number,
    failure: number,
    pending: number,
): string {
    if (total === 0) return 'No opportunity decisions recorded yet.';
    const parts: string[] = [];
    parts.push(`${taken} taken / ${missed} missed`);
    if (success > 0 || failure > 0) {
        parts.push(`${success} success / ${failure} failure`);
    }
    if (pending > 0) {
        parts.push(`${pending} on desk`);
    }
    return parts.join(' | ');
}

export function buildOpportunityLedgerPulse(state: LoadedGameState | null | undefined): OpportunityLedgerPulse {
    const records = state?.operationOpportunityRecords ?? [];
    // Stable iteration: sort a shallow copy by proposal_id (already unique) so
    // accumulator order is deterministic regardless of caller-supplied order.
    const ordered = [...records].sort((a, b) => strictCompare(a.proposal_id, b.proposal_id));

    let pending = 0;
    let taken = 0;
    let missed = 0;
    let inProgress = 0;
    let completedSuccess = 0;
    let completedFailure = 0;
    let t3Authorized = 0;
    let requiredGreen = 0;
    let requiredTotal = 0;
    let optionalGreen = 0;
    let optionalTotal = 0;

    for (const record of ordered) {
        if (isPending(record.status)) {
            pending += 1;
        } else if (isMissed(record.status)) {
            missed += 1;
        } else if (isTaken(record.status)) {
            taken += 1;
            switch (record.exit_class) {
                case 'decisive_success':
                case 'partial_success':
                    completedSuccess += 1;
                    break;
                case 'failed':
                case 'aborted':
                case 'did_not_launch':
                    completedFailure += 1;
                    break;
                case 't3_authorized_no_offensive':
                    t3Authorized += 1;
                    break;
                case undefined:
                    inProgress += 1;
                    break;
                default:
                    // Unknown exit_class — treat as in-progress so we don't double-count.
                    inProgress += 1;
                    break;
            }
        }

        if (typeof record.required_axes_total === 'number' && typeof record.required_axes_green === 'number') {
            requiredTotal += record.required_axes_total;
            requiredGreen += record.required_axes_green;
        }
        if (typeof record.optional_axes_total === 'number' && typeof record.optional_axes_green === 'number') {
            optionalTotal += record.optional_axes_total;
            optionalGreen += record.optional_axes_green;
        }
    }

    const totalDecisions = ordered.length;
    const resolvedDecisions = taken + missed;

    return {
        total_decisions: totalDecisions,
        resolved_decisions: resolvedDecisions,
        pending,
        taken,
        missed,
        in_progress: inProgress,
        completed_success: completedSuccess,
        completed_failure: completedFailure,
        t3_authorized: t3Authorized,
        lifetime_axes: {
            required_green: requiredGreen,
            required_total: requiredTotal,
            optional_green: optionalGreen,
            optional_total: optionalTotal,
        },
        headline: buildHeadline(totalDecisions, taken, missed, completedSuccess, completedFailure, pending),
    };
}
