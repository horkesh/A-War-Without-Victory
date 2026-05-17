import { describe, expect, it } from 'vitest';

import { dismissEventNotification } from '../../../src/sim/events/dismiss_notifications.js';
import type { GameState } from '../../../src/state/game_state.js';

function state(): GameState {
    return {
        meta: { turn: 2, phase: 'war', schema_version: 14, player_faction: 'RBiH' },
        factions: [],
        military: {
            pending_event_notifications: [
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
                    notification_id: 'rs_strategic_goals:RS:HRHB',
                    event_id: 'rs_strategic_goals',
                    source_faction: 'RS',
                    target_faction: 'HRHB',
                    response_id: 'all_six',
                    surfaced_on_turn: 2,
                    headline: 'HRHB headline',
                    body: 'HRHB body',
                    consumed: false,
                },
            ],
        },
        political: {},
    } as unknown as GameState;
}

describe('dismissEventNotification', () => {
    it('marks only the matching event notification consumed', () => {
        const s = state();

        const result = dismissEventNotification(s, 'rs_strategic_goals:RS:RBiH');

        expect(result).toEqual({ ok: true });
        expect(s.military.pending_event_notifications).toEqual([
            expect.objectContaining({ notification_id: 'rs_strategic_goals:RS:RBiH', consumed: true }),
            expect.objectContaining({ notification_id: 'rs_strategic_goals:RS:HRHB', consumed: false }),
        ]);
    });

    it('rejects unknown notification ids without mutating the queue', () => {
        const s = state();

        const result = dismissEventNotification(s, 'missing:RS:RBiH');

        expect(result).toEqual({ ok: false, error: 'notification_not_found' });
        expect(s.military.pending_event_notifications?.map((notification) => notification.consumed)).toEqual([false, false]);
    });
});
