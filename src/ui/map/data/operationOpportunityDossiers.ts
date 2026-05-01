import type { LoadedGameState, OperationOpportunityAxisState, OperationOpportunityProposalView } from './types';

type RawRecord = Record<string, unknown>;

const REVIEW_ACTION_PREFIX = 'OPPORTUNITY:';
const LIVE_PROPOSAL_STATUSES = new Set(['eligible_pending_review', 'delayed']);

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function humanizeId(id: string): string {
    const cleaned = id.replace(/_+/g, ' ').trim();
    if (!cleaned) return 'Operation Opportunity';
    return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

function splitDescription(description: string | undefined): { title?: string; detail?: string } {
    const text = description?.trim();
    if (!text) return {};
    const emDashIndex = text.indexOf('\u2014');
    const hyphenIndex = text.indexOf(' - ');
    const splitAt = emDashIndex >= 0 ? emDashIndex : hyphenIndex >= 0 ? hyphenIndex : -1;
    if (splitAt < 0) return { title: text };
    const title = text.slice(0, splitAt).trim();
    const detail = text.slice(splitAt + (emDashIndex >= 0 ? 1 : 3)).trim();
    return { title: title || undefined, detail: detail || undefined };
}

function axisLabel(axis: string): string {
    return humanizeId(axis);
}

function axisState(mode: string, green: boolean): OperationOpportunityAxisState {
    if (green) return 'ready';
    if (mode === 'required') return 'blocked';
    if (mode === 'optional') return 'strained';
    return 'not_applicable';
}

function axisCounts(axes: RawRecord[]): Pick<OperationOpportunityProposalView,
    'required_axes_green' | 'required_axes_total' | 'optional_axes_green' | 'optional_axes_total'> {
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

function getReviewProposalId(review: RawRecord): string | undefined {
    const action = typeof review.proposed_action === 'string' ? review.proposed_action : '';
    if (!action.startsWith(REVIEW_ACTION_PREFIX)) return undefined;
    const proposalId = action.slice(REVIEW_ACTION_PREFIX.length);
    return proposalId || undefined;
}

export function isOperationOpportunityReview(review: {
    proposed_action?: string;
}): boolean {
    return typeof review.proposed_action === 'string' && review.proposed_action.startsWith(REVIEW_ACTION_PREFIX);
}

export function deriveOperationOpportunityProposals(
    state: any,
    playerFaction: string | null | undefined,
): LoadedGameState['operationOpportunityProposals'] {
    const proposals = Array.isArray(state.military?.operation_opportunities)
        ? state.military.operation_opportunities as RawRecord[]
        : [];
    if (proposals.length === 0) return undefined;

    const reviewByProposalId = new Map<string, RawRecord>();
    const reviews = Array.isArray(state.meta?.pending_proposal_reviews)
        ? state.meta.pending_proposal_reviews as RawRecord[]
        : [];
    for (const review of reviews) {
        const proposalId = getReviewProposalId(review);
        if (proposalId) reviewByProposalId.set(proposalId, review);
    }

    const result: OperationOpportunityProposalView[] = [];
    for (const proposal of proposals) {
        const proposalId = typeof proposal.proposal_id === 'string' ? proposal.proposal_id : '';
        const opportunityId = typeof proposal.opportunity_id === 'string' ? proposal.opportunity_id : '';
        const status = typeof proposal.status === 'string' ? proposal.status : '';
        const faction = typeof proposal.approver_faction === 'string' ? proposal.approver_faction : undefined;
        if (!proposalId || !opportunityId || !LIVE_PROPOSAL_STATUSES.has(status)) continue;
        if (playerFaction && faction !== playerFaction) continue;

        const review = reviewByProposalId.get(proposalId);
        const reviewDescription = typeof review?.description === 'string' ? review.description : undefined;
        const descriptionParts = splitDescription(reviewDescription);
        const axes = Array.isArray(proposal.last_axis_evaluation)
            ? proposal.last_axis_evaluation as RawRecord[]
            : [];
        const hasLiveReview = Boolean(review && status === 'eligible_pending_review');

        result.push({
            proposal_id: proposalId,
            opportunity_id: opportunityId,
            display_name: descriptionParts.title ?? humanizeId(opportunityId),
            faction,
            status: status as OperationOpportunityProposalView['status'],
            eligibility_turn: typeof proposal.eligibility_turn === 'number' ? proposal.eligibility_turn : undefined,
            expires_turn: typeof proposal.expires_turn === 'number' ? proposal.expires_turn : undefined,
            review_id: typeof review?.id === 'string' ? review.id : undefined,
            description: descriptionParts.detail ?? reviewDescription,
            recommendation: typeof review?.proposed_value === 'string' ? review.proposed_value : undefined,
            proposed_action: typeof review?.proposed_action === 'string' ? review.proposed_action : undefined,
            ...axisCounts(axes),
            prerequisite_axes: axes.map((axis) => {
                const axisId = typeof axis.axis === 'string' ? axis.axis : 'unknown_axis';
                const mode = typeof axis.mode === 'string' ? axis.mode : 'unknown';
                const green = axis.green === true;
                return {
                    axis: axisId,
                    label: axisLabel(axisId),
                    mode,
                    green,
                    state: axisState(mode, green),
                    reason: typeof axis.reason === 'string' ? axis.reason : '',
                };
            }),
            available_actions: [
                { id: 'approve', label: 'Authorize', enabled: hasLiveReview },
                { id: 'decline', label: 'Decline', enabled: hasLiveReview },
            ],
        });
    }

    result.sort((a, b) => {
        const aTurn = a.expires_turn ?? a.eligibility_turn ?? 0;
        const bTurn = b.expires_turn ?? b.eligibility_turn ?? 0;
        if (aTurn !== bTurn) return aTurn - bTurn;
        return strictCompare(a.proposal_id, b.proposal_id);
    });
    return result.length > 0 ? result : undefined;
}
