import type { LoadedGameState, OperationOpportunityRecordView, OperationOpportunitySummaryView } from './types';

type RawRecord = Record<string, unknown>;

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function humanizeOpportunityId(id: string): string {
    const cleaned = id.replace(/_+/g, ' ').trim();
    if (!cleaned) return 'Operation opportunity';
    return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

function opportunityNameFromReview(description: string | undefined): string | undefined {
    if (!description) return undefined;
    const split = description.split('\u2014')[0]?.trim() ?? description.trim();
    return split || undefined;
}

function statusFromResolution(
    response: OperationOpportunityRecordView['response'],
): OperationOpportunityRecordView['status'] {
    switch (response) {
        case 'approve': return 'approved';
        case 'decline': return 'declined';
        case 'expire': return 'expired';
        case 'redirect': return 'redirected';
        case 'under_resource': return 'under_resourced_approved';
        case 'delay':
        default: return 'delayed';
    }
}

function axisCounts(proposal: RawRecord | undefined): Pick<OperationOpportunityRecordView,
    'required_axes_green' | 'required_axes_total' | 'optional_axes_green' | 'optional_axes_total'> {
    const axes = Array.isArray(proposal?.last_axis_evaluation)
        ? proposal.last_axis_evaluation as RawRecord[]
        : [];
    let requiredGreen = 0;
    let requiredTotal = 0;
    let optionalGreen = 0;
    let optionalTotal = 0;
    for (const axis of axes) {
        if (axis.mode === 'required') {
            requiredTotal++;
            if (axis.green === true) requiredGreen++;
        } else if (axis.mode === 'optional') {
            optionalTotal++;
            if (axis.green === true) optionalGreen++;
        }
    }
    return {
        required_axes_green: requiredTotal > 0 ? requiredGreen : undefined,
        required_axes_total: requiredTotal > 0 ? requiredTotal : undefined,
        optional_axes_green: optionalTotal > 0 ? optionalGreen : undefined,
        optional_axes_total: optionalTotal > 0 ? optionalTotal : undefined,
    };
}

function aarToRecordFields(aar: RawRecord | undefined): Partial<OperationOpportunityRecordView> {
    if (!aar) return {};
    const objectivesTargeted = Array.isArray(aar.objectives_targeted) ? aar.objectives_targeted.length : undefined;
    const objectivesCaptured = Array.isArray(aar.objectives_captured) ? aar.objectives_captured.length : undefined;
    const grade = aar.grade as RawRecord | undefined;
    return {
        faction: typeof aar.faction === 'string' ? aar.faction : undefined,
        aar_outcome: typeof aar.outcome === 'string' ? aar.outcome : undefined,
        started_turn: typeof aar.started_turn === 'number' ? aar.started_turn : undefined,
        ended_turn: typeof aar.ended_turn === 'number' ? aar.ended_turn : undefined,
        total_attacks: typeof aar.total_attacks === 'number' ? aar.total_attacks : undefined,
        objectives_targeted: objectivesTargeted,
        objectives_captured: objectivesCaptured,
        grade_stars: typeof grade?.stars === 'number' ? grade.stars : undefined,
        grade_verdict: typeof grade?.verdict === 'string' ? grade.verdict : undefined,
    };
}

export function deriveOperationOpportunityRecords(
    state: any,
    playerFaction: string | null | undefined,
): LoadedGameState['operationOpportunityRecords'] {
    const proposals = Array.isArray(state.military?.operation_opportunities)
        ? state.military.operation_opportunities as RawRecord[]
        : [];
    const resolutions = Array.isArray(state.military?.operation_opportunity_resolutions)
        ? state.military.operation_opportunity_resolutions as RawRecord[]
        : [];
    if (proposals.length === 0 && resolutions.length === 0) return undefined;

    const proposalById = new Map<string, RawRecord>();
    for (const proposal of proposals) {
        const proposalId = typeof proposal.proposal_id === 'string' ? proposal.proposal_id : '';
        if (proposalId) proposalById.set(proposalId, proposal);
    }

    const reviewByProposalId = new Map<string, RawRecord>();
    const reviews = Array.isArray(state.meta?.pending_proposal_reviews)
        ? state.meta.pending_proposal_reviews as RawRecord[]
        : [];
    for (const review of reviews) {
        const action = typeof review.proposed_action === 'string' ? review.proposed_action : '';
        if (!action.startsWith('OPPORTUNITY:')) continue;
        reviewByProposalId.set(action.slice('OPPORTUNITY:'.length), review);
    }

    const aarById = new Map<string, RawRecord>();
    for (const aar of Array.isArray(state.operation_history) ? state.operation_history as RawRecord[] : []) {
        const id = typeof aar.operation_id === 'string' ? aar.operation_id : '';
        if (id) aarById.set(id, aar);
    }

    const resolutionByProposalId = new Map<string, RawRecord>();
    for (const resolution of resolutions) {
        const proposalId = typeof resolution.proposal_id === 'string' ? resolution.proposal_id : '';
        if (proposalId) resolutionByProposalId.set(proposalId, resolution);
    }

    const ids = new Set<string>([
        ...proposals.map(p => typeof p.proposal_id === 'string' ? p.proposal_id : '').filter(Boolean),
        ...resolutions.map(r => typeof r.proposal_id === 'string' ? r.proposal_id : '').filter(Boolean),
    ]);

    const records: OperationOpportunityRecordView[] = [];
    for (const proposalId of [...ids].sort(strictCompare)) {
        const proposal = proposalById.get(proposalId);
        const resolution = resolutionByProposalId.get(proposalId);
        const review = reviewByProposalId.get(proposalId);
        const aarId = typeof resolution?.executed_op_aar_id === 'string' ? resolution.executed_op_aar_id : undefined;
        const aar = aarId ? aarById.get(aarId) : undefined;
        const response = resolution?.response as OperationOpportunityRecordView['response'] | undefined;
        const status = resolution
            ? statusFromResolution(response)
            : (proposal?.status as OperationOpportunityRecordView['status'] | undefined) ?? 'eligible_pending_review';
        const opportunityId = typeof (proposal?.opportunity_id ?? resolution?.opportunity_id) === 'string'
            ? String(proposal?.opportunity_id ?? resolution?.opportunity_id)
            : 'unknown_opportunity';
        const displayName =
            (typeof resolution?.executed_op_name === 'string' ? resolution.executed_op_name : undefined)
            ?? opportunityNameFromReview(typeof review?.description === 'string' ? review.description : undefined)
            ?? humanizeOpportunityId(opportunityId);
        const faction =
            (typeof proposal?.approver_faction === 'string' ? proposal.approver_faction : undefined)
            ?? (typeof review?.faction === 'string' ? review.faction : undefined)
            ?? (typeof aar?.faction === 'string' ? aar.faction : undefined);

        if (playerFaction && faction && faction !== playerFaction) continue;
        if (playerFaction && !faction) continue;

        records.push({
            proposal_id: proposalId,
            opportunity_id: opportunityId,
            display_name: displayName,
            faction,
            status,
            eligibility_turn: typeof proposal?.eligibility_turn === 'number' ? proposal.eligibility_turn : undefined,
            expires_turn: typeof proposal?.expires_turn === 'number' ? proposal.expires_turn : undefined,
            response,
            response_turn: typeof resolution?.response_turn === 'number' ? resolution.response_turn : undefined,
            executed_op_name: typeof resolution?.executed_op_name === 'string' ? resolution.executed_op_name : undefined,
            executed_op_aar_id: aarId,
            exit_class: resolution?.exit_class as OperationOpportunityRecordView['exit_class'] | undefined,
            ...axisCounts(proposal),
            ...aarToRecordFields(aar),
        });
    }

    records.sort((a, b) => {
        const aTurn = a.response_turn ?? a.eligibility_turn ?? 0;
        const bTurn = b.response_turn ?? b.eligibility_turn ?? 0;
        if (aTurn !== bTurn) return bTurn - aTurn;
        return strictCompare(a.proposal_id, b.proposal_id);
    });
    return records.length > 0 ? records : undefined;
}

export function deriveOperationOpportunitySummary(
    records: LoadedGameState['operationOpportunityRecords'],
): OperationOpportunitySummaryView | undefined {
    if (!records || records.length === 0) return undefined;
    let pendingCount = 0;
    let resolvedCount = 0;
    let completedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    let didNotLaunchCount = 0;
    for (const record of records) {
        if (record.status === 'eligible_pending_review' || record.status === 'delayed') {
            pendingCount++;
        } else {
            resolvedCount++;
        }
        if (record.executed_op_aar_id) completedCount++;
        if (record.exit_class === 'decisive_success' || record.exit_class === 'partial_success') successCount++;
        if (record.exit_class === 'failed' || record.exit_class === 'aborted') failedCount++;
        if (record.exit_class === 'did_not_launch') didNotLaunchCount++;
    }
    return { pendingCount, resolvedCount, completedCount, successCount, failedCount, didNotLaunchCount };
}
