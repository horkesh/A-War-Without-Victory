import type {
    LoadedGameState,
    OperationOpportunityAxisState,
    OperationOpportunityFootprintOsidView,
    OperationOpportunityProposalView,
} from './types';
import { playerFactionMatch } from './playerFactionMatch';
import { humanizeOsid } from '../utils/osidDisplayName';

type RawRecord = Record<string, unknown>;
type ForceTraitBand = OperationOpportunityProposalView['force_quality_traits'][number]['band'];

const REVIEW_ACTION_PREFIX = 'OPPORTUNITY:';
const LIVE_PROPOSAL_STATUSES = new Set(['eligible_pending_review', 'delayed']);
const FORCE_TRAIT_ORDER = [
    'operation_readiness',
    'staging_reliability',
    'axis_coordination',
    'support_delivery',
    'failure_recovery',
    'reserve_response',
    'collapse_susceptibility',
] as const;

const FORCE_TRAIT_LABELS: Record<typeof FORCE_TRAIT_ORDER[number], string> = {
    operation_readiness: 'Operation readiness',
    staging_reliability: 'Staging reliability',
    axis_coordination: 'Axis coordination',
    support_delivery: 'Support delivery',
    failure_recovery: 'Failure recovery',
    reserve_response: 'Reserve response',
    collapse_susceptibility: 'Collapse susceptibility',
};

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

function axisState(mode: string, green: boolean | undefined): OperationOpportunityAxisState {
    if (green == null) return 'unreported';
    if (green) return 'ready';
    if (mode === 'required') return 'blocked';
    if (mode === 'optional') return 'strained';
    return 'not_applicable';
}

function traitBand(trait: typeof FORCE_TRAIT_ORDER[number], rawValue: number): ForceTraitBand {
    const value = trait === 'collapse_susceptibility' ? 1 - rawValue : rawValue;
    if (value >= 0.75) return 'strong';
    if (value >= 0.55) return 'adequate';
    if (value >= 0.35) return 'strained';
    return 'poor';
}

function bandReason(trait: typeof FORCE_TRAIT_ORDER[number], band: ForceTraitBand): string {
    if (trait === 'collapse_susceptibility') {
        if (band === 'strong') return 'low collapse risk under pressure';
        if (band === 'adequate') return 'manageable collapse risk';
        if (band === 'strained') return 'elevated collapse risk';
        return 'severe collapse risk';
    }
    if (band === 'strong') return 'strong institutional signal';
    if (band === 'adequate') return 'adequate institutional signal';
    if (band === 'strained') return 'strained institutional signal';
    return 'poor institutional signal';
}

function forceTraitViews(rawTraits: unknown): OperationOpportunityProposalView['force_quality_traits'] {
    if (!rawTraits || typeof rawTraits !== 'object') return [];
    const source = rawTraits as RawRecord;
    const result: OperationOpportunityProposalView['force_quality_traits'] = [];
    for (const trait of FORCE_TRAIT_ORDER) {
        const value = source[trait];
        if (typeof value !== 'number' || !Number.isFinite(value)) continue;
        const clamped = Math.max(0, Math.min(1, value));
        const band = traitBand(trait, clamped);
        result.push({
            trait,
            label: FORCE_TRAIT_LABELS[trait],
            band,
            reason: bandReason(trait, band),
        });
    }
    return result;
}

function stringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const out: string[] = [];
    for (const entry of value) {
        if (typeof entry !== 'string' || entry.length === 0 || out.includes(entry)) continue;
        out.push(entry);
    }
    return out;
}

function footprintViews(
    rawOsids: unknown,
    role: OperationOpportunityFootprintOsidView['role'],
): OperationOpportunityFootprintOsidView[] {
    return stringArray(rawOsids).map((osid) => ({
        osid,
        label: humanizeOsid(osid),
        role,
    }));
}

function redirectVariantViews(rawVariants: unknown): OperationOpportunityProposalView['redirect_variants'] {
    if (!Array.isArray(rawVariants)) return [];
    const out: OperationOpportunityProposalView['redirect_variants'] = [];
    for (const rawVariant of rawVariants) {
        if (!rawVariant || typeof rawVariant !== 'object') continue;
        const variant = rawVariant as RawRecord;
        const variantId = typeof variant.variant_id === 'string' ? variant.variant_id : '';
        if (!variantId) continue;
        const name = typeof variant.name === 'string' && variant.name.trim()
            ? variant.name.trim()
            : humanizeId(variantId);
        out.push({
            variant_id: variantId,
            label: name,
            objectives: footprintViews(variant.objectives, 'objective'),
            staging: footprintViews(variant.staging_osids, 'staging'),
        });
    }
    out.sort((a, b) => strictCompare(a.variant_id, b.variant_id));
    return out;
}

function axisCounts(axes: RawRecord[]): Pick<OperationOpportunityProposalView,
    'required_axes_green' | 'required_axes_total' | 'optional_axes_green' | 'optional_axes_total'> {
    let requiredGreen = 0;
    let requiredTotal = 0;
    let requiredReported = 0;
    let optionalGreen = 0;
    let optionalTotal = 0;
    let optionalReported = 0;
    for (const axis of axes) {
        if (axis.mode === 'required') {
            requiredTotal++;
            if (typeof axis.green === 'boolean') requiredReported++;
            if (axis.green === true) requiredGreen++;
        } else if (axis.mode === 'optional') {
            optionalTotal++;
            if (typeof axis.green === 'boolean') optionalReported++;
            if (axis.green === true) optionalGreen++;
        }
    }
    return {
        required_axes_green: requiredTotal > 0 && requiredReported === requiredTotal ? requiredGreen : undefined,
        required_axes_total: requiredTotal > 0 ? requiredTotal : undefined,
        optional_axes_green: optionalTotal > 0 && optionalReported === optionalTotal ? optionalGreen : undefined,
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

function isLivePlayerOpportunityReview(review: RawRecord, playerFaction: string | null | undefined): boolean {
    if (review.accepted != null || review.opportunity_decision != null || review.resolved_turn != null) return false;
    const faction = typeof review.faction === 'string' ? review.faction : undefined;
    return playerFactionMatch(faction, playerFaction);
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
        if (!proposalId) continue;
        if (!isLivePlayerOpportunityReview(review, playerFaction)) continue;
        reviewByProposalId.set(proposalId, review);
    }

    const result: OperationOpportunityProposalView[] = [];
    for (const proposal of proposals) {
        const proposalId = typeof proposal.proposal_id === 'string' ? proposal.proposal_id : '';
        const opportunityId = typeof proposal.opportunity_id === 'string' ? proposal.opportunity_id : '';
        const status = typeof proposal.status === 'string' ? proposal.status : '';
        const faction = typeof proposal.approver_faction === 'string' ? proposal.approver_faction : undefined;
        if (!proposalId || !opportunityId || !LIVE_PROPOSAL_STATUSES.has(status)) continue;
        if (!playerFactionMatch(faction, playerFaction)) continue;

        const review = reviewByProposalId.get(proposalId);
        const reviewDescription = typeof review?.description === 'string' ? review.description : undefined;
        const descriptionParts = splitDescription(reviewDescription);
        const axes = Array.isArray(proposal.last_axis_evaluation)
            ? proposal.last_axis_evaluation as RawRecord[]
            : [];
        const hasLiveReview = Boolean(review && status === 'eligible_pending_review');
        const footprint = proposal.last_footprint && typeof proposal.last_footprint === 'object'
            ? proposal.last_footprint as RawRecord
            : {};
        const redirectVariants = redirectVariantViews(proposal.redirect_variants);

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
                const green = typeof axis.green === 'boolean' ? axis.green : undefined;
                return {
                    axis: axisId,
                    label: axisLabel(axisId),
                    mode,
                    green,
                    state: axisState(mode, green),
                    reason: typeof axis.reason === 'string' ? axis.reason : '',
                };
            }),
            force_quality_traits: forceTraitViews(proposal.last_force_quality_traits),
            objectives: footprintViews(footprint.objectives, 'objective'),
            staging: footprintViews(footprint.staging_osids, 'staging'),
            redirect_variants: redirectVariants,
            available_actions: [
                { id: 'approve', label: 'Authorize', enabled: hasLiveReview },
                { id: 'delay', label: 'Delay', enabled: hasLiveReview },
                ...(redirectVariants.length > 0
                    ? [{ id: 'redirect' as const, label: 'Redirect', enabled: hasLiveReview }]
                    : []),
                { id: 'under_resource', label: 'Under-resource', enabled: hasLiveReview },
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
