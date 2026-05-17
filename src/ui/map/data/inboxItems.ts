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
import { isOperationOpportunityReview } from './operationOpportunityDossiers';
import { turnToDateString } from '../utils/formatters';
import { getOsidDisplayName } from '../utils/osidDisplayName';

export type InboxItemType = 'event_decision' | 'peace_plan' | 'dayton_negotiation' | 'convoy_decision' | 'paramilitary_request' | 'reserve_request' | 'officer_event' | 'operation_opportunity' | 'autonomy_proposal' | 'situation';
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
    action: 'event_modal' | 'peace_plan_modal' | 'dayton_modal' | 'paramilitary_review' | 'convoy_decision_modal' | 'army_reserve' | 'army_hq_personnel' | 'army_hq_opportunity' | 'army_hq_briefing' | 'autonomy_panel' | 'none';
    /** Priority for sorting (lower = higher priority) */
    priority: number;
}

function matchesPlayerFaction(itemFaction: string | null | undefined, playerFaction: string | null | undefined): boolean {
    return !playerFaction || !itemFaction || itemFaction === playerFaction;
}

function splitOpportunityDescription(description: string): { title: string; detail: string } {
    const trimmed = description.trim();
    if (!trimmed) return { title: 'Operation Opportunity', detail: 'ops proposal requires your review.' };
    const emDashIndex = trimmed.indexOf('\u2014');
    const hyphenIndex = trimmed.indexOf(' - ');
    const splitAt = emDashIndex >= 0 ? emDashIndex : hyphenIndex >= 0 ? hyphenIndex : -1;
    if (splitAt < 0) return { title: trimmed, detail: 'ops proposal requires your review.' };
    const delimiterLength = emDashIndex >= 0 ? 1 : 3;
    return {
        title: trimmed.slice(0, splitAt).trim() || 'Operation Opportunity',
        detail: trimmed.slice(splitAt + delimiterLength).trim() || 'ops proposal requires your review.',
    };
}

function normalizeDedupeSubject(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    return trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || null;
}

type OfficerEvent = NonNullable<LoadedGameState['pendingOfficerEvents']>[number];

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

/**
 * Derive all inbox items from the current game state.
 * Returns items sorted by priority (highest first).
 */
export function deriveInboxItems(
    state: LoadedGameState | null,
    osidNameMap: Record<string, string> | null,
): InboxItem[] {
    if (!state) return [];

    const items: InboxItem[] = [];
    const playerFaction = state.player_faction;

    // 1. Pending event decisions (BLOCKING — turn won't advance)
    const eventDecisions = state.pendingEventDecisions;
    if (eventDecisions) {
        for (const evt of eventDecisions) {
            if (!matchesPlayerFaction(evt.faction, playerFaction)) continue;
            items.push({
                id: `event:${evt.event_id}`,
                type: 'event_decision',
                severity: 'blocking',
                title: evt.event_title ?? 'Decision Required',
                subtitle: `An event requires your response (turn ${evt.turn_fired}).`,
                action: 'event_modal',
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
            title: peacePlan.planName ?? 'Peace Proposal',
            subtitle: 'International mediators have presented a peace plan.',
            action: 'peace_plan_modal',
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
            title: 'Dayton Negotiation',
            subtitle: 'A final peace framework requires your territorial and institutional proposal.',
            action: 'dayton_modal',
            priority: 22,
        });
    }

    const proposals = state.pendingProposalReviews;
    if (proposals && proposals.length > 0) {
        for (const prop of proposals) {
            if (!matchesPlayerFaction(prop.faction, playerFaction)) continue;
            if (isOperationOpportunityReview(prop)) {
                const { title, detail } = splitOpportunityDescription(prop.description || '');
                items.push({
                    id: `opportunity:${prop.id}`,
                    type: 'operation_opportunity',
                    severity: 'normal',
                    title,
                    subtitle: detail,
                    action: 'army_hq_opportunity',
                    priority: 32,
                });
                continue;
            }
            items.push({
                id: `proposal:${prop.id}`,
                type: 'autonomy_proposal',
                severity: 'normal',
                title: 'Command Proposal',
                subtitle: prop.description || `${prop.domain} proposal requires your review.`,
                action: 'autonomy_panel',
                priority: 35,
            });
        }
    }

    // 4. Paramilitary requests
    const paramilitaryRequests = state.pendingParamilitaryRequests ?? [];
    if (paramilitaryRequests.length > 0) {
        const totalStrength = paramilitaryRequests.reduce((sum, request) => sum + request.strength, 0);
        const samplePlace = getOsidDisplayName(paramilitaryRequests[0]?.target_osid ?? '', osidNameMap);
        items.push({
            id: `paramilitary:${state.turn ?? 0}`,
            type: 'paramilitary_request',
            severity: 'blocking',
            title: 'Paramilitary Authorization',
            subtitle: `${paramilitaryRequests.length} deployment request${paramilitaryRequests.length === 1 ? '' : 's'} near ${samplePlace}; approval risks war crimes and civilian casualties. Estimated strength ${totalStrength}.`,
            action: 'paramilitary_review',
            priority: 25,
        });
    }

    const convoyDecisions = state.pendingConvoyDecisions ?? [];
    for (const convoy of convoyDecisions) {
        items.push({
            id: `convoy:${convoy.id}`,
            type: 'convoy_decision',
            severity: 'normal',
            title: 'Humanitarian Convoy',
            subtitle: `${convoy.route_faction} route to ${convoy.target_enclave}; ${convoy.supply_amount} supply awaits allow, block, or divert orders.`,
            action: 'convoy_decision_modal',
            priority: 38,
        });
    }

    // 5. Reserve requests
    const reserveRequests = state.pendingReserveRequests;
    if (reserveRequests) {
        for (const req of reserveRequests) {
            if (!matchesPlayerFaction(req.faction, playerFaction)) continue;
            const corpsName = req.corps_id?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? 'A corps';
            items.push({
                id: `reserve:${req.request_id}`,
                type: 'reserve_request',
                severity: 'normal',
                title: 'Reserve Request',
                subtitle: `${corpsName} requests reinforcement${req.purpose ? ` for ${req.purpose}` : ''}.`,
                action: 'army_reserve',
                priority: 40,
            });
        }
    }

    // 6. Officer events
    const officerEvents = state.pendingOfficerEvents;
    if (officerEvents) {
        const officerGroups = new Map<string, OfficerEvent[]>();
        for (const evt of officerEvents) {
            if (!matchesPlayerFaction(evt.faction, playerFaction)) continue;
            const key = officerEventDedupeKey(evt);
            const existing = officerGroups.get(key);
            if (existing) existing.push(evt);
            else officerGroups.set(key, [evt]);
        }
        for (const [key, events] of officerGroups) {
            const evt = events[0];
            if (!evt) continue;
            items.push({
                id: `officer:${key}`,
                type: 'officer_event',
                severity: 'normal',
                title: evt.type === 'replacement_suggested' ? 'Commander Replacement' : 'Personnel Matter',
                subtitle: evt.officer_name ? `Regarding ${evt.officer_name}.` : 'A personnel decision requires attention.',
                updateCount: events.length,
                sourceIds: events.map(event => event.event_id),
                action: 'army_hq_personnel',
                priority: 50,
            });
        }
    }

    // 7. Situation highlights (informational, from turn summary + state)
    const turn = state.turn ?? 0;
    const dateStr = turnToDateString(turn);

    // Territory changes from recent control events (current turn only)
    const recentEvents = (state.recentControlEvents ?? []).filter(e => e.turn === turn);
    const losses = recentEvents.filter(e => e.from === playerFaction && e.to !== playerFaction);
    const gains = recentEvents.filter(e => e.to === playerFaction && e.from !== playerFaction);
    if (losses.length > 0) {
        const placeName = getOsidDisplayName(losses[0]?.settlementId ?? '', osidNameMap);
        items.push({
            id: `sit:territory_loss:${turn}`,
            type: 'situation',
            severity: 'info',
            title: 'Territory Lost',
            subtitle: losses.length === 1
                ? `Enemy forces captured ${placeName}.`
                : `Enemy forces captured ${losses.length} positions including ${placeName}.`,
            action: 'army_hq_briefing',
            priority: 60,
        });
    }
    if (gains.length > 0) {
        const placeName = getOsidDisplayName(gains[0]?.settlementId ?? '', osidNameMap);
        items.push({
            id: `sit:territory_gain:${turn}`,
            type: 'situation',
            severity: 'info',
            title: 'Territory Gained',
            subtitle: gains.length === 1
                ? `Your forces secured ${placeName}.`
                : `Your forces secured ${gains.length} positions including ${placeName}.`,
            action: 'army_hq_briefing',
            priority: 65,
        });
    }

    // Date marker
    items.push({
        id: `sit:date:${turn}`,
        type: 'situation',
        severity: 'info',
        title: dateStr,
        subtitle: `Situation as of ${dateStr}.`,
        action: 'army_hq_briefing',
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
