/**
 * Presidential Inbox item derivation.
 *
 * Reads all pending decision queues from LoadedGameState and produces
 * a prioritized list of inbox items for the president to act on.
 *
 * Canonical owner: this file. All inbox items derive from here.
 * No new state — reads existing fields only.
 */

import type { LoadedGameState } from './types';
import type { EventDefinition } from '../../../sim/events/event_types';
import { isOperationOpportunityReview } from './operationOpportunityDossiers';
import { isResolvedProposalReview, parseHistoricalOperationAuthorizationAction } from './historicalOperationAuthorization';
import { playerFactionMatch } from './playerFactionMatch';
import { strictCompare } from '../../../state/validateGameState';
import { turnToDateString } from '../utils/formatters';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { getDecisionSurface, getDecisionSurfaceForInboxType } from './decisionSurfaceRegistry';
import { isRequiredPendingEventDecision } from './eventDecisionRouting';
import { getPlayerFacingCorpsName } from '../../shared/playerFacingLabels';
import { getActiveLocale, t, type MessageKey } from '../i18n';
import { buildReserveRequestPresentation, buildReserveRequestSummary } from './reserveRequestPresentation';
import { looksLikeRawPlayerFacingToken } from '../utils/playerSafeText';
import { isPeacePlanOwnedByPendingEvent } from '../utils/peacePlanDismissal';
import { PARAMILITARY_TARGET_AVG_POPULATION } from '../../../state/formation_constants';

export type InboxItemType = 'event_decision' | 'peace_plan' | 'dayton_negotiation' | 'convoy_decision' | 'paramilitary_request' | 'reserve_request' | 'officer_event' | 'operation_opportunity' | 'autonomy_proposal' | 'intelligence_notification' | 'situation';
export type InboxSeverity = 'blocking' | 'urgent' | 'normal' | 'info';

export interface InboxItem {
    id: string;
    type: InboxItemType;
    severity: InboxSeverity;
    title: string;
    subtitle: string;
    /** Number of source records represented by this card. Undefined means 1. */
    updateCount?: number;
    /** Source record ids represented by this card, source order preserved. */
    sourceIds?: string[];
    /** Optional card-specific action copy for informational handoffs. */
    actionLabel?: string;
    /** Keep a selected informational situation visible in the Desk packet. */
    includeInDeskPacket?: boolean;
    /** Which panel/modal to open when clicked */
    action: 'event_modal' | 'peace_plan_modal' | 'dayton_modal' | 'paramilitary_review' | 'convoy_decision_modal' | 'army_reserve' | 'army_hq_personnel' | 'army_hq_briefing' | 'decision_room' | 'dismiss_intelligence_notification' | 'none';
    /** Priority for sorting (lower = higher priority) */
    priority: number;
}

function opportunityProposalIdFromAction(action: string | null | undefined, fallbackId: string): string {
    const prefix = 'OPPORTUNITY:';
    return typeof action === 'string' && action.startsWith(prefix) && action.slice(prefix.length).trim()
        ? action.slice(prefix.length).trim()
        : fallbackId;
}

export function isAdvanceBlockingInboxItem(item: Pick<InboxItem, 'type' | 'severity'>): boolean {
    if (item.type === 'event_decision') return item.severity === 'blocking';
    if (item.type === 'autonomy_proposal') return item.severity === 'blocking';
    const gatePolicy = getDecisionSurfaceForInboxType(item.type)?.gatePolicy;
    return gatePolicy === 'hard_block' || gatePolicy === 'modal_required';
}

export function effectiveInboxSeverity(item: Pick<InboxItem, 'type' | 'severity'>): InboxSeverity {
    return isAdvanceBlockingInboxItem(item) ? 'blocking' : item.severity;
}

function splitOpportunityDescription(description: string): { title: string; detail: string } {
    const trimmed = description.trim();
    if (!trimmed) return { title: t('inbox.item.operationOpportunity.titleFallback'), detail: t('inbox.item.operationOpportunity.detailFallback') };
    if (getActiveLocale() !== 'en') return { title: t('inbox.item.operationOpportunity.titleFallback'), detail: t('inbox.item.operationOpportunity.detailFallback') };
    const emDashIndex = trimmed.indexOf('\u2014');
    const hyphenIndex = trimmed.indexOf(' - ');
    const splitAt = emDashIndex >= 0 ? emDashIndex : hyphenIndex >= 0 ? hyphenIndex : -1;
    if (splitAt < 0) return { title: trimmed, detail: t('inbox.item.operationOpportunity.detailFallback') };
    const delimiterLength = emDashIndex >= 0 ? 1 : 3;
    return {
        title: trimmed.slice(0, splitAt).trim() || t('inbox.item.operationOpportunity.titleFallback'),
        detail: trimmed.slice(splitAt + delimiterLength).trim() || t('inbox.item.operationOpportunity.detailFallback'),
    };
}

const OPPORTUNITY_RECOMMENDATION_LABEL_KEYS: Record<string, MessageKey> = {
    approve: 'inbox.item.operationOpportunity.recommendation.approve',
    delay: 'inbox.item.operationOpportunity.recommendation.delay',
    redirect: 'inbox.item.operationOpportunity.recommendation.redirect',
    under_resource: 'inbox.item.operationOpportunity.recommendation.underResource',
    decline: 'inbox.item.operationOpportunity.recommendation.decline',
};

function formatOpportunityRecommendationDetail(proposedValue: string | null | undefined, fallbackDetail: string): string {
    const labelKey = proposedValue ? OPPORTUNITY_RECOMMENDATION_LABEL_KEYS[proposedValue] : undefined;
    if (labelKey) return t('inbox.item.operationOpportunity.recommendationDetail', { recommendation: t(labelKey) });
    return fallbackDetail;
}

const PROPOSAL_DOMAIN_LABEL_KEYS: Partial<Record<string, MessageKey>> = {
    ops: 'inbox.item.autonomyProposal.domain.ops',
    military: 'inbox.item.autonomyProposal.domain.military',
};

function proposalDomainLabel(domain: string | null | undefined): string {
    if (!domain) return t('inbox.item.autonomyProposal.domain.generic');
    return t(PROPOSAL_DOMAIN_LABEL_KEYS[domain] ?? 'inbox.item.autonomyProposal.domain.generic');
}

function formatAutonomyProposalSubtitle(description: string | null | undefined, domain: string | null | undefined): string {
    const trimmed = description?.trim();
    if (getActiveLocale() === 'en' && trimmed && !looksLikeRawPlayerFacingToken(trimmed)) return trimmed;
    return t('inbox.item.autonomyProposal.subtitleFallback', { domain: proposalDomainLabel(domain) });
}

function normalizeDedupeSubject(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    return trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || null;
}

function paramilitaryStandingPenalty(deploymentCount: number): number {
    if (deploymentCount >= 10) return (deploymentCount * 5) + 10;
    if (deploymentCount >= 4) return deploymentCount * 4;
    return deploymentCount * 2;
}

function currentParamilitaryDeploymentCount(state: LoadedGameState, faction: string | null | undefined): number {
    if (!faction) return 0;
    const counts = state.rawGameState?.paramilitary_deployment_count as Record<string, unknown> | undefined;
    const value = counts?.[faction];
    return typeof value === 'number' && Number.isFinite(value) && value > 0
        ? Math.trunc(value)
        : 0;
}

function formatParamilitaryStandingImpact(value: number): string {
    const exact = value.toFixed(4).replace(/\.?0+$/, '');
    return getActiveLocale() === 'bcs' ? exact.replace('.', ',') : exact;
}

function formatParamilitaryModelPopulation(): string {
    return new Intl.NumberFormat(getActiveLocale() === 'bcs' ? 'bs-BA' : 'en-US').format(
        PARAMILITARY_TARGET_AVG_POPULATION,
    );
}

type OfficerEvent = NonNullable<LoadedGameState['pendingOfficerEvents']>[number];

function isCommandInterpretationOfficerEvent(type: OfficerEvent['type']): boolean {
    return type === 'order_modified'
        || type === 'order_pushback'
        || type === 'order_refused'
        || type === 'order_exceeded'
        || type === 'army_directive_pushback'
        || type === 'army_co_proposes_op';
}

function officerEventDedupeKey(evt: OfficerEvent): string {
    const subjectKey =
        normalizeDedupeSubject(evt.officer_id)
        ?? normalizeDedupeSubject(evt.current_commander_id)
        ?? normalizeDedupeSubject(evt.officer_name)
        ?? normalizeDedupeSubject(evt.current_commander_name)
        ?? normalizeDedupeSubject(evt.event_id)
        ?? 'unknown';
    return `${evt.type}:${subjectKey}`;
}

function localizedEventTitle(
    eventId: string,
    fallback: string | null | undefined,
    eventCatalog: ReadonlyMap<string, EventDefinition> | undefined,
): string {
    const locale = getActiveLocale();
    const localized = locale === 'en' ? undefined : eventCatalog?.get(eventId)?.localizations?.[locale]?.title;
    const trimmed = localized?.trim();
    if (trimmed) return trimmed;
    return fallback ?? t('inbox.item.eventDecision.titleFallback');
}

const RESERVE_PURPOSE_LABEL_KEYS: Partial<Record<string, MessageKey>> = {
    offensive: 'armyReserve.purpose.offensive',
    defensive: 'armyReserve.purpose.defensive',
};

function reservePurposeLabel(purpose: string | null | undefined): string | null {
    if (!purpose) return null;
    return t(RESERVE_PURPOSE_LABEL_KEYS[purpose] ?? 'armyReserve.purpose.unknown');
}

/**
 * Derive all inbox items from the current game state.
 * Returns items sorted by priority (highest first).
 */
export function deriveInboxItems(
    state: LoadedGameState | null,
    osidNameMap: Record<string, string> | null,
    eventCatalog?: ReadonlyMap<string, EventDefinition>,
): InboxItem[] {
    if (!state) return [];

    const items: InboxItem[] = [];
    const playerFaction = state.player_faction;
    const eventSurface = getDecisionSurface('event_decision');
    const peaceSurface = getDecisionSurface('peace_plan');
    const daytonSurface = getDecisionSurface('dayton_negotiation');
    const paramilitarySurface = getDecisionSurface('paramilitary_request');
    const convoySurface = getDecisionSurface('convoy_decision');
    const reserveSurface = getDecisionSurface('reserve_request');
    const officerSurface = getDecisionSurface('officer_event');
    const operationSurface = getDecisionSurface('operation_opportunity');
    const autonomySurface = getDecisionSurface('autonomy_proposal');
    const intelligenceSurface = getDecisionSurface('intelligence_notification');
    const situationSurface = getDecisionSurface('situation');

    // 1. Pending event decisions. Only required rows block and auto-open, but
    // advisory choices still need their real response surface when reviewed.
    const eventDecisions = state.pendingEventDecisions;
    if (eventDecisions) {
        for (const evt of eventDecisions) {
            if (!playerFactionMatch(evt.faction, playerFaction)) continue;
            const required = isRequiredPendingEventDecision(evt);
            items.push({
                id: `event:${evt.event_id}`,
                type: 'event_decision',
                severity: required ? 'blocking' : 'normal',
                title: localizedEventTitle(evt.event_id, evt.event_title, eventCatalog),
                subtitle: t(required ? 'inbox.item.eventDecision.subtitle' : 'inbox.item.eventDecision.advisorySubtitle', { date: turnToDateString(evt.turn_fired) }),
                action: eventSurface.inboxAction,
                priority: 10,
            });
        }
    }

    // 2. Pending peace plan
    const peacePlan = state.pendingPeacePlan;
    if (peacePlan && !isPeacePlanOwnedByPendingEvent(peacePlan, state.pendingEventDecisions)) {
        items.push({
            id: `peace:${peacePlan.planId}`,
            type: 'peace_plan',
            severity: 'urgent',
            title: peacePlan.planName ?? t('inbox.item.peacePlan.titleFallback'),
            subtitle: t('inbox.item.peacePlan.subtitle'),
            action: peaceSurface.inboxAction,
            priority: 20,
        });
    }

    // 3. Autonomy proposals (Level 1 Assisted — requires player accept/reject)
    const dayton = state.pendingDayton;
    if (dayton && !state.gameOver) {
        items.push({
            id: `dayton:${state.turn ?? 0}`,
            type: 'dayton_negotiation',
            severity: 'blocking',
            title: t('inbox.item.dayton.title'),
            subtitle: t('inbox.item.dayton.subtitle'),
            action: daytonSurface.inboxAction,
            priority: 22,
        });
    }

    const proposals = state.pendingProposalReviews;
    if (proposals && proposals.length > 0) {
        const historicalOperationReviews: Array<{
            prop: NonNullable<LoadedGameState['pendingProposalReviews']>[number];
            operationName: string;
        }> = [];
        const pendingProposals = [...proposals]
            .filter((prop) => playerFactionMatch(prop.faction, playerFaction))
            .filter((prop) => !isResolvedProposalReview(prop))
            .sort((a, b) => strictCompare(a.id, b.id));
        for (const prop of pendingProposals) {
            if (!playerFactionMatch(prop.faction, playerFaction)) continue;
            if (isOperationOpportunityReview(prop)) {
                const { title, detail } = splitOpportunityDescription(prop.description || '');
                const proposalId = opportunityProposalIdFromAction(prop.proposed_action, prop.id);
                const hasDecisionRoomDossier = (state.operationOpportunityProposals ?? [])
                    .some((proposal) => proposal.proposal_id === proposalId || proposal.review_id === prop.id);
                if (!hasDecisionRoomDossier) continue;
                items.push({
                    id: `opportunity:${proposalId}`,
                    type: 'operation_opportunity',
                    severity: 'normal',
                    title,
                    subtitle: formatOpportunityRecommendationDetail(prop.proposed_value, detail),
                    action: operationSurface.inboxAction,
                    priority: 32,
                });
                continue;
            }
            const historicalOp = parseHistoricalOperationAuthorizationAction(prop.proposed_action);
            if (historicalOp) {
                historicalOperationReviews.push({
                    prop,
                    operationName: historicalOp.operationName,
                });
                continue;
            }
            const ordinaryOperation = prop.domain === 'ops'
                ? state.opProposalCards?.find((proposal) => proposal.proposal_id === prop.id)
                : undefined;
            items.push({
                id: `command:review-proposal:${prop.id}`,
                type: 'autonomy_proposal',
                severity: 'normal',
                title: t('inbox.item.autonomyProposal.title'),
                subtitle: formatAutonomyProposalSubtitle(ordinaryOperation?.summary ?? prop.description, prop.domain),
                action: autonomySurface.inboxAction,
                priority: 35,
            });
        }
        if (historicalOperationReviews.length === 1) {
            const review = historicalOperationReviews[0];
            if (review) {
                items.push({
                    id: `command:review-proposal:${review.prop.id}`,
                    type: 'autonomy_proposal',
                    severity: 'blocking',
                    title: review.operationName,
                    subtitle: t('inbox.item.historicalOperation.subtitle'),
                    action: autonomySurface.inboxAction,
                    priority: 20,
                });
            }
        } else if (historicalOperationReviews.length > 1) {
            items.push({
                id: 'command:review-proposal:historical-ops',
                type: 'autonomy_proposal',
                severity: 'blocking',
                title: t('inbox.item.historicalOperation.groupTitle'),
                subtitle: t('inbox.item.historicalOperation.groupSubtitle', { count: historicalOperationReviews.length }),
                updateCount: historicalOperationReviews.length,
                sourceIds: historicalOperationReviews.map((review) => review.prop.id),
                action: autonomySurface.inboxAction,
                priority: 20,
            });
        }
    }

    // 4. Paramilitary requests — defensive faction filter so RS-only items
    //    never surface to RBiH/HRHB inboxes (and vice versa). Upstream may
    //    already filter, but the inbox is presidential-scoped by contract.
    const paramilitaryRequests = state.paramilitaryPolicy && state.paramilitaryPolicy !== 'ask'
        ? []
        : (state.pendingParamilitaryRequests ?? [])
            .filter((request) =>
                playerFactionMatch(request.faction, playerFaction)
                && !isFinalParamilitaryDecision(request.decision),
            );
    if (paramilitaryRequests.length > 0) {
        const totalStrength = paramilitaryRequests.reduce((sum, request) => sum + request.strength, 0);
        const projectedCivilianRisk = paramilitaryRequests.reduce((sum, request) => sum + request.estimated_civilian_risk, 0);
        const previousDeployments = currentParamilitaryDeploymentCount(state, playerFaction);
        const deploymentImpact = paramilitaryStandingPenalty(previousDeployments + paramilitaryRequests.length)
            - paramilitaryStandingPenalty(previousDeployments);
        const standingImpact = formatParamilitaryStandingImpact(
            -(deploymentImpact + (projectedCivilianRisk / PARAMILITARY_TARGET_AVG_POPULATION)),
        );
        const samplePlace = getOsidDisplayName(paramilitaryRequests[0]?.target_osid ?? '', osidNameMap);
        const consequenceSummary = t('inbox.item.paramilitary.subtitle', {
            requestCount: paramilitaryRequests.length,
            requestLabel: t(paramilitaryRequests.length === 1
                ? 'inbox.item.paramilitary.request.one'
                : 'inbox.item.paramilitary.request.many'),
            place: samplePlace,
            civilianRisk: projectedCivilianRisk,
            civilianLabel: t(projectedCivilianRisk === 1
                ? 'inbox.item.paramilitary.civilian.one'
                : 'inbox.item.paramilitary.civilian.many'),
            warCrimeCount: paramilitaryRequests.length,
            warCrimeLabel: t(paramilitaryRequests.length === 1
                ? 'inbox.item.paramilitary.warCrime.one'
                : 'inbox.item.paramilitary.warCrime.many'),
            standingImpact,
            strength: totalStrength,
        });
        const sourceContext = t('paramilitaryReview.sourceContext', {
            modelPopulation: formatParamilitaryModelPopulation(),
        });
        items.push({
            id: `paramilitary:${state.turn ?? 0}`,
            type: 'paramilitary_request',
            severity: 'blocking',
            title: t('inbox.item.paramilitary.title'),
            subtitle: `${consequenceSummary} ${sourceContext}`,
            action: paramilitarySurface.inboxAction,
            priority: 25,
        });
    }

    const convoyDecisions = (state.pendingConvoyDecisions ?? [])
        .filter((convoy) => convoy.decision == null)
        .filter((convoy) => playerFactionMatch(convoy.route_faction, playerFaction));
    for (const convoy of convoyDecisions) {
        items.push({
            id: `convoy:${convoy.id}`,
            type: 'convoy_decision',
            severity: 'normal',
            title: t('inbox.item.convoy.title'),
            subtitle: t('inbox.item.convoy.subtitle', { supply: convoy.supply_amount }),
            action: convoySurface.inboxAction,
            priority: 38,
        });
    }

    // 5. Reserve requests
    const reserveRequests = state.pendingReserveRequests;
    if (reserveRequests) {
        for (const req of reserveRequests) {
            if (!playerFactionMatch(req.faction, playerFaction)) continue;
            const corpsName = getPlayerFacingCorpsName(req.corps_id, state.formations, 'An assigned command');
            const purposeLabel = reservePurposeLabel(req.purpose);
            const presentation = buildReserveRequestPresentation(state, req, osidNameMap);
            items.push({
                id: `reserve:${req.request_id}`,
                type: 'reserve_request',
                severity: 'normal',
                title: t('inbox.item.reserve.title'),
                subtitle: getActiveLocale() === 'en'
                    ? `${buildReserveRequestSummary(presentation)} Purpose: ${purposeLabel ?? t('armyReserve.purpose.unknown')}.`
                    : purposeLabel
                        ? t('inbox.item.reserve.subtitleWithPurpose', { corps: corpsName, purpose: purposeLabel })
                        : t('inbox.item.reserve.subtitle', { corps: corpsName }),
                action: reserveSurface.inboxAction,
                priority: 40,
            });
        }
    }

    // 6. Officer events
    const officerEvents = state.pendingOfficerEvents;
    if (officerEvents) {
        const officerGroups = new Map<string, OfficerEvent[]>();
        for (const evt of officerEvents) {
            if (!playerFactionMatch(evt.faction, playerFaction)) continue;
            const key = officerEventDedupeKey(evt);
            const existing = officerGroups.get(key);
            if (existing) existing.push(evt);
            else officerGroups.set(key, [evt]);
        }
        for (const [key, events] of officerGroups) {
            const evt = events[0];
            if (!evt) continue;
            const commandInterpretation = events.some((event) => isCommandInterpretationOfficerEvent(event.type));
            const armyCoOperationProposal = events.some((event) => event.type === 'army_co_proposes_op');
            const replacement = evt.type === 'replacement_suggested';
            const availability = evt.type === 'officer_available';
            items.push({
                id: `officer:${key}`,
                type: 'officer_event',
                severity: 'normal',
                title: commandInterpretation
                    ? armyCoOperationProposal
                        ? t('inbox.item.officer.title.autonomousOperationProposal')
                        : t('inbox.item.officer.title.commandInterpretation')
                    : replacement
                        ? t('inbox.item.officer.title.commanderReplacement')
                        : availability
                            ? t('inbox.item.officer.title.availabilityNotice')
                            : t('inbox.item.officer.title.personnelMatter'),
                subtitle: replacement && evt.officer_name
                    ? t('inbox.item.officer.subtitle.replacement', {
                        officer: evt.officer_name,
                        incumbent: evt.current_commander_name ?? t('inbox.item.officer.currentCommanderFallback'),
                    })
                    : availability && evt.officer_name
                        ? t('inbox.item.officer.subtitle.availability', { officer: evt.officer_name })
                        : evt.officer_name
                            ? t('inbox.item.officer.subtitle.regarding', { officer: evt.officer_name })
                            : t('inbox.item.officer.subtitle.fallback'),
                updateCount: events.length,
                sourceIds: events.map(event => event.event_id),
                action: commandInterpretation ? 'decision_room' : officerSurface.inboxAction,
                priority: 50,
            });
        }
    }

    const notifications = state.pendingEventNotifications ?? [];
    for (const notification of [...notifications].sort((a, b) => strictCompare(a.notification_id, b.notification_id))) {
        if (!playerFactionMatch(notification.target_faction, playerFaction)) continue;
        if (notification.consumed) continue;
        if (notification.surfaced_on_turn > (state.turn ?? 0)) continue;
        items.push({
            id: `intel:${notification.notification_id}`,
            type: 'intelligence_notification',
            severity: 'info',
            title: notification.headline,
            subtitle: notification.body,
            action: intelligenceSurface.inboxAction,
            priority: 55,
        });
    }

    // 7. Situation highlights (informational, from turn summary + state)
    const turn = state.turn ?? 0;
    const dateStr = turnToDateString(turn);

    const rbihCorpsReorganization =
        playerFaction === 'RBiH'
        && turn === 24
        && state.formations.some(formation => (
            formation.faction === 'RBiH'
            && formation.kind === 'corps'
            && formation.createdTurn <= turn
        ));
    if (rbihCorpsReorganization) {
        items.push({
            id: 'sit:rbih-corps-reorganization:24',
            type: 'situation',
            severity: 'info',
            title: t('inbox.item.rbihCorpsReorganization.title'),
            subtitle: t('inbox.item.rbihCorpsReorganization.subtitle'),
            action: 'army_hq_briefing',
            actionLabel: t('inbox.item.rbihCorpsReorganization.action'),
            includeInDeskPacket: true,
            priority: 58,
        });
    }

    // Territory changes from recent control events (current turn only).
    // Turn 0 control records are scenario setup, not player-visible wartime gains/losses.
    const recentEvents = turn > 0
        ? (state.recentControlEvents ?? []).filter(e => e.turn === turn)
        : [];
    const losses = recentEvents.filter(e => e.from === playerFaction && e.to !== playerFaction);
    const gains = recentEvents.filter(e => e.to === playerFaction && e.from !== playerFaction);
    if (losses.length > 0) {
        const placeName = getOsidDisplayName(losses[0]?.settlementId ?? '', osidNameMap);
        items.push({
            id: `sit:territory_loss:${turn}`,
            type: 'situation',
            severity: 'info',
            title: t('inbox.item.territoryLost.title'),
            subtitle: losses.length === 1
                ? t('inbox.item.territoryLost.single', { place: placeName })
                : t('inbox.item.territoryLost.many', { count: losses.length, place: placeName }),
            action: situationSurface.inboxAction,
            priority: 60,
        });
    }
    if (gains.length > 0) {
        const placeName = getOsidDisplayName(gains[0]?.settlementId ?? '', osidNameMap);
        items.push({
            id: `sit:territory_gain:${turn}`,
            type: 'situation',
            severity: 'info',
            title: t('inbox.item.territoryGained.title'),
            subtitle: gains.length === 1
                ? t('inbox.item.territoryGained.single', { place: placeName })
                : t('inbox.item.territoryGained.many', { count: gains.length, place: placeName }),
            action: situationSurface.inboxAction,
            priority: 65,
        });
    }

    // Date marker
    items.push({
        id: `sit:date:${turn}`,
        type: 'situation',
        severity: 'info',
        title: dateStr,
        subtitle: t('inbox.item.situationDate.subtitle', { date: dateStr }),
        action: situationSurface.inboxAction,
        priority: 99,
    });

    return items.sort((a, b) => a.priority - b.priority);
}

function isFinalParamilitaryDecision(decision: unknown): boolean {
    return decision === 'allow' || decision === 'deny' || decision === 'regular';
}

/**
 * Count actionable items (everything except situation highlights).
 */
export function countActionableItems(items: InboxItem[]): number {
    return items.filter(i => i.type !== 'situation').length;
}

/**
 * Whether any items are blocking (turn can't advance).
 */
export function hasBlockingItems(items: InboxItem[]): boolean {
    return items.some((item) => effectiveInboxSeverity(item) === 'blocking');
}

/**
 * Resolve which queue index to open when an inbox event_decision row is clicked.
 *
 * @param itemId  The InboxItem.id passed from the inbox click (e.g. "event:evt_beta").
 * @param queue   The EventDisplayData[] queue built from pendingEventDecisions,
 *                where each entry's `.id` is the raw event_id.
 * @returns       The index into `queue` for the clicked event, or null when identity cannot be resolved.
 */
export function resolveEventQueueIndex(
    itemId: string,
    queue: ReadonlyArray<{ id: string }>,
): number | null {
    if (!itemId.startsWith('event:')) return null;
    const targetEventId = itemId.slice(6);
    const idx = queue.findIndex(d => d.id === targetEventId);
    return idx >= 0 ? idx : null;
}
