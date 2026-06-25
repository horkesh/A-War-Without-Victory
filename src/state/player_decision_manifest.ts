import type { GameState } from './game_state.js';

export type PlayerDecisionFamilyId =
    | 'event_decision'
    | 'peace_plan'
    | 'dayton_negotiation'
    | 'paramilitary_request'
    | 'convoy_decision'
    | 'reserve_request'
    | 'officer_event'
    | 'autonomy_proposal'
    | 'operation_opportunity';

export type PlayerDecisionGatePolicy = 'hard_block' | 'modal_required' | 'advisory';

export interface PlayerDecisionFamilyDefinition {
    id: PlayerDecisionFamilyId;
    statePath: string;
    inboxType: string;
    ownerSurface: string;
    resolver: string;
    gatePolicy: PlayerDecisionGatePolicy;
}

export interface PlayerDecisionInstance {
    id: string;
    familyId: PlayerDecisionFamilyId;
    label: string;
    gatePolicy: PlayerDecisionGatePolicy;
    blocking: boolean;
    statePath: string;
    faction?: string;
}

export interface PlayerDecisionFamilySummary {
    id: PlayerDecisionFamilyId;
    gatePolicy: PlayerDecisionGatePolicy;
    count: number;
    blockingCount: number;
    instances: PlayerDecisionInstance[];
}

export interface PlayerDecisionSummary {
    totalCount: number;
    blockingCount: number;
    families: PlayerDecisionFamilySummary[];
}

export type GameStateLike = Partial<GameState> & Record<string, unknown>;

type RawRecord = Record<string, unknown>;

export const PLAYER_DECISION_FAMILIES: readonly PlayerDecisionFamilyDefinition[] = [
    {
        id: 'event_decision',
        statePath: 'military.pending_event_decisions',
        inboxType: 'event_decision',
        ownerSurface: 'event_modal',
        resolver: 'resolve-decision',
        gatePolicy: 'hard_block',
    },
    {
        id: 'peace_plan',
        statePath: 'military.negotiation.pending_peace_plan',
        inboxType: 'peace_plan',
        ownerSurface: 'peace_plan_modal',
        resolver: 'peace-plan-response',
        gatePolicy: 'modal_required',
    },
    {
        id: 'dayton_negotiation',
        statePath: 'military.negotiation.pending_dayton',
        inboxType: 'dayton_negotiation',
        ownerSurface: 'dayton_modal',
        resolver: 'dayton-response',
        gatePolicy: 'modal_required',
    },
    {
        id: 'paramilitary_request',
        statePath: 'pending_paramilitary_requests',
        inboxType: 'paramilitary_request',
        ownerSurface: 'paramilitary_review',
        resolver: 'resolve-paramilitary-requests',
        gatePolicy: 'hard_block',
    },
    {
        id: 'convoy_decision',
        statePath: 'military.pending_convoy_decisions',
        inboxType: 'convoy_decision',
        ownerSurface: 'convoy_decision_modal',
        resolver: 'stage-convoy-decision',
        gatePolicy: 'modal_required',
    },
    {
        id: 'reserve_request',
        statePath: 'military.pending_reserve_requests',
        inboxType: 'reserve_request',
        ownerSurface: 'army_reserve',
        resolver: 'approve-reserve-request/decline-reserve-request',
        gatePolicy: 'advisory',
    },
    {
        id: 'officer_event',
        statePath: 'military.pending_officer_events',
        inboxType: 'officer_event',
        ownerSurface: 'army_hq_personnel',
        resolver: 'acknowledge-officer-event/resolve-officer-event',
        gatePolicy: 'advisory',
    },
    {
        id: 'autonomy_proposal',
        statePath: 'meta.pending_proposal_reviews',
        inboxType: 'autonomy_proposal',
        ownerSurface: 'decision_room',
        resolver: 'resolve-autonomy-proposal',
        gatePolicy: 'advisory',
    },
    {
        id: 'operation_opportunity',
        statePath: 'meta.pending_proposal_reviews + military.operation_opportunities',
        inboxType: 'operation_opportunity',
        ownerSurface: 'decision_room',
        resolver: 'resolve-operation-opportunity',
        gatePolicy: 'advisory',
    },
] as const;

function isRecord(value: unknown): value is RawRecord {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function arrayFrom(value: unknown): RawRecord[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isRecord);
}

function stringFrom(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getMeta(state: GameStateLike): RawRecord {
    return isRecord(state.meta) ? state.meta : {};
}

function getMilitary(state: GameStateLike): RawRecord {
    return isRecord(state.military) ? state.military : {};
}

function getNegotiation(state: GameStateLike): RawRecord {
    const military = getMilitary(state);
    return isRecord(military.negotiation) ? military.negotiation : {};
}

function playerFactionFor(state: GameStateLike, playerFaction?: string | null): string | null {
    if (playerFaction !== undefined) return playerFaction;
    return stringFrom(getMeta(state).player_faction) ?? null;
}

function matchesPlayerFaction(item: RawRecord, playerFaction: string | null): boolean {
    if (!playerFaction) return true;
    const faction = stringFrom(item.faction);
    return faction === playerFaction;
}

function isResolved(item: RawRecord): boolean {
    return item.accepted !== undefined
        || item.resolved_turn !== undefined
        || item.decision !== undefined
        || item.acknowledged === true;
}

function isOperationOpportunityReview(review: RawRecord): boolean {
    const action = stringFrom(review.proposed_action);
    return Boolean(action?.startsWith('OPPORTUNITY:'));
}

function instance(
    family: PlayerDecisionFamilyDefinition,
    id: string,
    blocking: boolean,
    faction?: string,
    gatePolicy: PlayerDecisionGatePolicy = family.gatePolicy,
): PlayerDecisionInstance {
    return {
        id,
        familyId: family.id,
        label: labelForFamily(family.id),
        gatePolicy,
        blocking,
        statePath: family.statePath,
        ...(faction ? { faction } : {}),
    };
}

function requiredFamily(id: PlayerDecisionFamilyId): PlayerDecisionFamilyDefinition {
    const family = PLAYER_DECISION_FAMILIES.find((entry) => entry.id === id);
    if (!family) throw new Error(`Unknown player decision family: ${id}`);
    return family;
}

function labelForFamily(familyId: PlayerDecisionFamilyId): string {
    switch (familyId) {
        case 'event_decision': return 'Event decision';
        case 'peace_plan': return 'Peace plan';
        case 'dayton_negotiation': return 'Dayton negotiation';
        case 'paramilitary_request': return 'Paramilitary request';
        case 'convoy_decision': return 'Convoy decision';
        case 'reserve_request': return 'Reserve request';
        case 'officer_event': return 'Officer event';
        case 'autonomy_proposal': return 'Autonomy proposal';
        case 'operation_opportunity': return 'Operation opportunity';
    }
}

function eventDecisionInstances(state: GameStateLike, playerFaction: string | null): PlayerDecisionInstance[] {
    const family = requiredFamily('event_decision');
    return arrayFrom(getMilitary(state).pending_event_decisions)
        .filter((item) => matchesPlayerFaction(item, playerFaction))
        .map((item, index) => {
            const id = stringFrom(item.event_id) ?? `event:${index}`;
            const blocking = item.requires_player_response === true;
            const gatePolicy: PlayerDecisionGatePolicy = blocking ? 'hard_block' : 'advisory';
            return instance(family, id, blocking, stringFrom(item.faction), gatePolicy);
        });
}

function singletonInstance(
    state: GameStateLike,
    familyId: 'peace_plan' | 'dayton_negotiation',
    value: unknown,
): PlayerDecisionInstance[] {
    if (!value) return [];
    const family = requiredFamily(familyId);
    if (familyId === 'peace_plan') {
        const id = isRecord(value)
            ? stringFrom(value.plan_id) ?? stringFrom(value.planId) ?? 'peace_plan'
            : 'peace_plan';
        return [instance(family, id, true)];
    }
    const turn = typeof getMeta(state).turn === 'number' ? getMeta(state).turn : 0;
    return [instance(family, `dayton:${turn}`, true)];
}

function paramilitaryRequestInstances(state: GameStateLike, playerFaction: string | null): PlayerDecisionInstance[] {
    const family = requiredFamily('paramilitary_request');
    return arrayFrom(state.pending_paramilitary_requests)
        .filter((item) => matchesPlayerFaction(item, playerFaction))
        .map((item, index) => {
            const target = stringFrom(item.target_osid) ?? `request:${index}`;
            return instance(family, target, true, stringFrom(item.faction));
        });
}

function convoyDecisionInstances(state: GameStateLike, playerFaction: string | null): PlayerDecisionInstance[] {
    const family = requiredFamily('convoy_decision');
    return arrayFrom(getMilitary(state).pending_convoy_decisions)
        .filter((item) => item.decision === undefined)
        .filter((item) => {
            const routeFaction = stringFrom(item.route_faction);
            return !playerFaction || routeFaction === playerFaction;
        })
        .map((item, index) => instance(family, stringFrom(item.id) ?? `convoy:${index}`, true));
}

function reserveRequestInstances(state: GameStateLike, playerFaction: string | null): PlayerDecisionInstance[] {
    const family = requiredFamily('reserve_request');
    return arrayFrom(getMilitary(state).pending_reserve_requests)
        .filter((item) => matchesPlayerFaction(item, playerFaction))
        .map((item, index) => {
            const id = stringFrom(item.request_id)
                ?? `reserve:${Number(item.turn_requested ?? 0)}:${String(item.corps_id ?? '')}:${index}`;
            return instance(family, id, false, stringFrom(item.faction));
        });
}

function officerEventInstances(state: GameStateLike, playerFaction: string | null): PlayerDecisionInstance[] {
    const family = requiredFamily('officer_event');
    return arrayFrom(getMilitary(state).pending_officer_events)
        .filter((item) => matchesPlayerFaction(item, playerFaction))
        .filter((item) => item.acknowledged !== true)
        .map((item, index) => instance(
            family,
            stringFrom(item.event_id) ?? `officer:${index}`,
            false,
            stringFrom(item.faction),
        ));
}

function proposalReviewInstances(
    state: GameStateLike,
    playerFaction: string | null,
    familyId: 'autonomy_proposal' | 'operation_opportunity',
): PlayerDecisionInstance[] {
    const family = requiredFamily(familyId);
    const wantOperation = familyId === 'operation_opportunity';
    return arrayFrom(getMeta(state).pending_proposal_reviews)
        .filter((item) => matchesPlayerFaction(item, playerFaction))
        .filter((item) => !isResolved(item))
        .filter((item) => isOperationOpportunityReview(item) === wantOperation)
        .map((item, index) => instance(
            family,
            stringFrom(item.id) ?? `${familyId}:${index}`,
            false,
            stringFrom(item.faction),
        ));
}

function operationOpportunityFallbackInstances(
    state: GameStateLike,
    playerFaction: string | null,
    countedReviewProposalIds: Set<string>,
): PlayerDecisionInstance[] {
    const family = requiredFamily('operation_opportunity');
    return arrayFrom(getMilitary(state).operation_opportunities)
        .filter((item) => item.status === 'eligible_pending_review')
        .filter((item) => {
            if (!playerFaction) return true;
            const approver = stringFrom(item.approver_faction) ?? stringFrom(item.faction);
            return approver === playerFaction;
        })
        .filter((item) => {
            const proposalId = stringFrom(item.proposal_id);
            return !proposalId || !countedReviewProposalIds.has(proposalId);
        })
        .map((item, index) => instance(
            family,
            stringFrom(item.proposal_id) ?? stringFrom(item.opportunity_id) ?? `operation_opportunity:${index}`,
            false,
            stringFrom(item.approver_faction) ?? stringFrom(item.faction),
        ));
}

function collectInstances(state: GameStateLike, playerFaction: string | null): PlayerDecisionInstance[][] {
    const negotiation = getNegotiation(state);
    const operationReviews = proposalReviewInstances(state, playerFaction, 'operation_opportunity');
    const countedReviewProposalIds = new Set<string>();
    for (const review of arrayFrom(getMeta(state).pending_proposal_reviews)) {
        const action = stringFrom(review.proposed_action);
        if (action?.startsWith('OPPORTUNITY:')) {
            countedReviewProposalIds.add(action.slice('OPPORTUNITY:'.length));
        }
    }

    return [
        eventDecisionInstances(state, playerFaction),
        singletonInstance(state, 'peace_plan', negotiation.pending_peace_plan),
        singletonInstance(state, 'dayton_negotiation', negotiation.pending_dayton),
        paramilitaryRequestInstances(state, playerFaction),
        convoyDecisionInstances(state, playerFaction),
        reserveRequestInstances(state, playerFaction),
        officerEventInstances(state, playerFaction),
        proposalReviewInstances(state, playerFaction, 'autonomy_proposal'),
        [
            ...operationReviews,
            ...operationOpportunityFallbackInstances(state, playerFaction, countedReviewProposalIds),
        ],
    ];
}

export function summarizePlayerDecisions(
    state: GameStateLike,
    playerFaction?: string | null,
): PlayerDecisionSummary {
    const effectiveFaction = playerFactionFor(state, playerFaction);
    const groupedInstances = collectInstances(state, effectiveFaction);
    const families = PLAYER_DECISION_FAMILIES.map((family, index): PlayerDecisionFamilySummary => {
        const instances = groupedInstances[index] ?? [];
        const blockingCount = instances.filter((item) => item.blocking).length;
        return {
            id: family.id,
            gatePolicy: family.gatePolicy,
            count: instances.length,
            blockingCount,
            instances,
        };
    });

    return {
        totalCount: families.reduce((sum, family) => sum + family.count, 0),
        blockingCount: families.reduce((sum, family) => sum + family.blockingCount, 0),
        families,
    };
}

export function listBlockingPlayerDecisions(
    state: GameStateLike,
    playerFaction?: string | null,
): PlayerDecisionInstance[] {
    return summarizePlayerDecisions(state, playerFaction)
        .families.flatMap((family) => family.instances.filter((item) => item.blocking));
}

export function countBlockingPlayerDecisions(
    state: GameStateLike,
    playerFaction?: string | null,
): number {
    return listBlockingPlayerDecisions(state, playerFaction).length;
}
