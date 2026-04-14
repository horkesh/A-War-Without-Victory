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
import { turnToDateString } from '../utils/formatters';
import { getOsidDisplayName } from '../utils/osidDisplayName';

export type InboxItemType = 'event_decision' | 'peace_plan' | 'reserve_request' | 'officer_event' | 'situation';
export type InboxSeverity = 'blocking' | 'urgent' | 'normal' | 'info';

export interface InboxItem {
    id: string;
    type: InboxItemType;
    severity: InboxSeverity;
    title: string;
    subtitle: string;
    /** Which panel/modal to open when clicked */
    action: 'event_modal' | 'peace_plan_modal' | 'army_reserve' | 'army_hq_personnel' | 'none';
    /** Priority for sorting (lower = higher priority) */
    priority: number;
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

    // 1. Pending event decisions (BLOCKING — turn won't advance)
    const eventDecisions = state.pendingEventDecisions;
    if (eventDecisions) {
        for (const evt of eventDecisions) {
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

    // TODO: Autonomy proposals (pendingProposalReviews) removed from inbox scope.
    // The GameStateAdapter does not yet map state.meta.pending_proposal_reviews to LoadedGameState.
    // Re-add when adapter plumbing is wired (see v0.8.4 Phase E backlog).

    // 3. Reserve requests
    const reserveRequests = state.pendingReserveRequests;
    if (reserveRequests) {
        for (const req of reserveRequests) {
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

    // 4. Officer events
    const officerEvents = state.pendingOfficerEvents;
    if (officerEvents) {
        for (const evt of officerEvents) {
            items.push({
                id: `officer:${evt.event_id}`,
                type: 'officer_event',
                severity: 'normal',
                title: evt.type === 'replacement_suggested' ? 'Commander Replacement' : 'Personnel Matter',
                subtitle: evt.officer_name ? `Regarding ${evt.officer_name}.` : 'A personnel decision requires attention.',
                action: 'army_hq_personnel',
                priority: 50,
            });
        }
    }

    // 5. Situation highlights (informational, from turn summary + state)
    const turn = state.turn ?? 0;
    const dateStr = turnToDateString(turn);

    // Territory changes from recent control events (current turn only)
    const recentEvents = (state.recentControlEvents ?? []).filter(e => e.turn === turn);
    const playerFaction = state.player_faction;
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
            action: 'none',
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
            action: 'none',
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
        action: 'none',
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
