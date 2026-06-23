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
import { playerFactionMatch } from './playerFactionMatch';
import { strictCompare } from '../../../state/validateGameState';
import { turnToDateString } from '../utils/formatters';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { getDecisionSurface } from './decisionSurfaceRegistry';
import { getPlayerFacingCorpsName } from '../../shared/playerFacingLabels';
import { getActiveLocale, t, type MessageKey } from '../i18n';

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
    /** Which panel/modal to open when clicked */
    action: 'event_modal' | 'peace_plan_modal' | 'dayton_modal' | 'paramilitary_review' | 'convoy_decision_modal' | 'army_reserve' | 'army_hq_personnel' | 'decision_room' | 'autonomy_panel' | 'dismiss_intelligence_notification' | 'none';
    /** Priority for sorting (lower = higher priority) */
    priority: number;
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
    if (getActiveLocale() === 'en' && trimmed) return trimmed;
    return t('inbox.item.autonomyProposal.subtitleFallback', { domain: proposalDomainLabel(domain) });
}

function normalizeDedupeSubject(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    return trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || null;
}

function classifyPendingParamilitaryBand(count: number): 'minor' | 'mid' | 'severe' {
    if (count >= 10) return 'severe';
    if (count >= 4) return 'mid';
    return 'minor';
}

function estimateInternationalStandingImpact(count: number): number {
    const band = classifyPendingParamilitaryBand(count);
    if (band === 'severe') return -((count * 5) + 10);
    if (band === 'mid') return -(count * 4);
    return -(count * 2);
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

    // 1. Pending event decisions (BLOCKING — turn won't advance)
    const eventDecisions = state.pendingEventDecisions;
    if (eventDecisions) {
        for (const evt of eventDecisions) {
            if (!playerFactionMatch(evt.faction, playerFaction)) continue;
            items.push({
                id: `event:${evt.event_id}`,
                type: 'event_decision',
                severity: 'blocking',
                title: localizedEventTitle(evt.event_id, evt.event_title, eventCatalog),
                subtitle: t('inbox.item.eventDecision.subtitle', { date: turnToDateString(evt.turn_fired) }),
                action: eventSurface.inboxAction,
                priority: 10,
            });
        }
    }

    // 2. Pending peace plan
    const peacePlan = state.pendingPeacePlan;
    if (peacePlan) {
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
        for (const prop of proposals) {
            if (!playerFactionMatch(prop.faction, playerFaction)) continue;
            if (isOperationOpportunityReview(prop)) {
                const { title, detail } = splitOpportunityDescription(prop.description || '');
                items.push({
                    id: `opportunity:${prop.id}`,
                    type: 'operation_opportunity',
                    severity: 'normal',
                    title,
                    subtitle: formatOpportunityRecommendationDetail(prop.proposed_value, detail),
                    action: operationSurface.inboxAction,
                    priority: 32,
                });
                continue;
            }
            items.push({
                id: `proposal:${prop.id}`,
                type: 'autonomy_proposal',
                severity: 'normal',
                title: t('inbox.item.autonomyProposal.title'),
                subtitle: formatAutonomyProposalSubtitle(prop.description, prop.domain),
                action: autonomySurface.inboxAction,
                priority: 35,
            });
        }
    }

    // 4. Paramilitary requests — defensive faction filter so RS-only items
    //    never surface to RBiH/HRHB inboxes (and vice versa). Upstream may
    //    already filter, but the inbox is presidential-scoped by contract.
    const paramilitaryRequests = (state.pendingParamilitaryRequests ?? [])
        .filter((request) => playerFactionMatch(request.faction, playerFaction));
    if (paramilitaryRequests.length > 0) {
        const totalStrength = paramilitaryRequests.reduce((sum, request) => sum + request.strength, 0);
        const projectedCivilianRisk = paramilitaryRequests.reduce((sum, request) => sum + request.estimated_civilian_risk, 0);
        const standingImpact = estimateInternationalStandingImpact(paramilitaryRequests.length);
        const samplePlace = getOsidDisplayName(paramilitaryRequests[0]?.target_osid ?? '', osidNameMap);
        items.push({
            id: `paramilitary:${state.turn ?? 0}`,
            type: 'paramilitary_request',
            severity: 'blocking',
            title: t('inbox.item.paramilitary.title'),
            subtitle: t('inbox.item.paramilitary.subtitle', {
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
            }),
            action: paramilitarySurface.inboxAction,
            priority: 25,
        });
    }

    const convoyDecisions = (state.pendingConvoyDecisions ?? [])
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
            items.push({
                id: `reserve:${req.request_id}`,
                type: 'reserve_request',
                severity: 'normal',
                title: t('inbox.item.reserve.title'),
                subtitle: purposeLabel
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
            items.push({
                id: `officer:${key}`,
                type: 'officer_event',
                severity: 'normal',
                title: commandInterpretation
                    ? armyCoOperationProposal
                        ? t('inbox.item.officer.title.autonomousOperationProposal')
                        : t('inbox.item.officer.title.commandInterpretation')
                    : evt.type === 'replacement_suggested'
                        ? t('inbox.item.officer.title.commanderReplacement')
                        : t('inbox.item.officer.title.personnelMatter'),
                subtitle: evt.officer_name
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
    return items.some(i => i.severity === 'blocking');
}

/**
 * Resolve which queue index to open when an inbox event_decision row is clicked.
 *
 * @param itemId  The InboxItem.id passed from the inbox click (e.g. "event:evt_beta").
 * @param queue   The EventDisplayData[] queue built from pendingEventDecisions,
 *                where each entry's `.id` is the raw event_id.
 * @returns       The index into `queue` for the clicked event, or 0 as fallback.
 */
export function resolveEventQueueIndex(
    itemId: string,
    queue: ReadonlyArray<{ id: string }>,
): number {
    if (!itemId.startsWith('event:')) return 0;
    const targetEventId = itemId.slice(6);
    const idx = queue.findIndex(d => d.id === targetEventId);
    return idx >= 0 ? idx : 0;
}
