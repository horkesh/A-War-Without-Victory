import { describe, expect, it } from 'vitest';

import { deriveInboxItems } from '../../src/ui/map/data/inboxItems.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function state(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
    return {
        label: 'test',
        phase: 'war',
        turn: 2,
        player_faction: 'RBiH',
        formations: [],
        militiaPools: [],
        controlBySettlement: {},
        statusBySettlement: {},
        brigadeAorByFormationId: {},
        attackOrders: [],
        movementOrders: [],
        recentControlEvents: [],
        historicalEventsByTurn: [],
        pressureWarning: false,
        latestTurnSummary: null,
        turnSummaries: [],
        ...overrides,
    } as LoadedGameState;
}

describe('deriveInboxItems event notifications', () => {
    it('projects surfaced, unconsumed notifications for the player faction only', () => {
        const items = deriveInboxItems(state({
            turn: 2,
            player_faction: 'RBiH',
            pendingEventNotifications: [
                {
                    notification_id: 'rs_strategic_goals:RS:HRHB',
                    event_id: 'rs_strategic_goals',
                    source_faction: 'RS',
                    target_faction: 'HRHB',
                    response_id: 'all_six',
                    surfaced_on_turn: 2,
                    headline: 'HRHB-only headline',
                    body: 'HRHB body',
                    consumed: false,
                },
                {
                    notification_id: 'rs_strategic_goals:RS:RBiH',
                    event_id: 'rs_strategic_goals',
                    source_faction: 'RS',
                    target_faction: 'RBiH',
                    response_id: 'all_six',
                    surfaced_on_turn: 2,
                    headline: 'RS Assembly endorses Six Strategic Goals',
                    body: 'Sarajevo intelligence reads the platform as a hardening of territorial war aims.',
                    consumed: false,
                },
                {
                    notification_id: 'future:RS:RBiH',
                    event_id: 'future',
                    source_faction: 'RS',
                    target_faction: 'RBiH',
                    response_id: 'default',
                    surfaced_on_turn: 3,
                    headline: 'Future headline',
                    body: 'Future body',
                    consumed: false,
                },
                {
                    notification_id: 'consumed:RS:RBiH',
                    event_id: 'consumed',
                    source_faction: 'RS',
                    target_faction: 'RBiH',
                    response_id: 'default',
                    surfaced_on_turn: 2,
                    headline: 'Consumed headline',
                    body: 'Consumed body',
                    consumed: true,
                },
            ],
        }), null);

        const notifications = items.filter((item) => item.type === 'intelligence_notification');

        expect(notifications).toEqual([
            {
                id: 'intel:rs_strategic_goals:RS:RBiH',
                type: 'intelligence_notification',
                severity: 'info',
                title: 'RS Assembly endorses Six Strategic Goals',
                subtitle: 'Sarajevo intelligence reads the platform as a hardening of territorial war aims.',
                action: 'dismiss_intelligence_notification',
                priority: 55,
            },
        ]);
    });
});
