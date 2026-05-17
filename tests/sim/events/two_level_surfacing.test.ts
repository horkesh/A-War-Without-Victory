import { afterEach, describe, expect, it } from 'vitest';

import { evaluateEvents } from '../../../src/sim/events/evaluate_events.js';
import { resolveEventDecision } from '../../../src/sim/events/resolve_decision.js';
import type { EventDefinition } from '../../../src/sim/events/event_types.js';
import type { GameState } from '../../../src/state/game_state.js';

const ORIGINAL_FLAG = process.env.AWWV_TWO_LEVEL_NOTIFICATIONS;

afterEach(() => {
    if (ORIGINAL_FLAG === undefined) delete process.env.AWWV_TWO_LEVEL_NOTIFICATIONS;
    else process.env.AWWV_TWO_LEVEL_NOTIFICATIONS = ORIGINAL_FLAG;
});

function enableNotifications(): void {
    process.env.AWWV_TWO_LEVEL_NOTIFICATIONS = 'true';
}

function state(playerFaction: 'RBiH' | 'RS' | 'HRHB', turn = 1): GameState {
    return {
        schema_version: 14,
        factions: { RBiH: {}, RS: {}, HRHB: {} },
        meta: { turn, phase: 'war', player_faction: playerFaction },
        military: {
            formations: {},
            fired_event_ids: [],
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 50, RS: 50, HRHB: 50 },
        },
        political: { political_controllers: {} },
        displacement: {},
    } as unknown as GameState;
}

const RS_STRATEGIC_GOALS: EventDefinition = {
    id: 'rs_strategic_goals',
    title: 'The Assembly Speaks',
    trigger: { turn_min: 1, turn_max: 1, phase: 'war' },
    effect: { kind: 'narrative', text: 'The strategic goals are presented.' },
    once: true,
    responding_faction: 'RS',
    requires_player_response: true,
    bot_response_logic: 'historical',
    response_options: [
        {
            id: 'all_six',
            label: 'Adopt all six goals',
            effects: [{ kind: 'morale_change', faction: 'RS', delta: 5 }],
            sets_flags: { rs_strategic_goals: 'all_six' },
        },
        {
            id: 'selective',
            label: 'Adopt goals selectively',
            effects: [],
            sets_flags: { rs_strategic_goals: 'selective' },
        },
    ],
    notifications_to_other_factions: {
        all_six: {
            RBiH: {
                headline: 'RS Assembly endorses Six Strategic Goals',
                body: 'Sarajevo intelligence reads the platform as a hardening of territorial war aims.',
            },
            HRHB: {
                headline: 'Karadzic Assembly clarifies territorial reach',
                body: 'Mostar leadership weighs the corridor and ethnic-separation claims against its patron line.',
            },
        },
    },
};

describe('two-level event surfacing', () => {
    it('does not carry authored notification text or emit notifications when the flag is off', () => {
        delete process.env.AWWV_TWO_LEVEL_NOTIFICATIONS;
        const s = state('RS', 1);

        evaluateEvents(s, () => 0, 1, [RS_STRATEGIC_GOALS]);
        resolveEventDecision(s, 'rs_strategic_goals', 'all_six');

        expect(s.military.pending_event_notifications).toBeUndefined();
        expect(s.military.pending_event_decisions ?? []).toHaveLength(0);
    });

    it('emits one deterministic notification per authored non-source faction after a player response', () => {
        enableNotifications();
        const s = state('RS', 1);

        evaluateEvents(s, () => 0, 1, [RS_STRATEGIC_GOALS]);
        resolveEventDecision(s, 'rs_strategic_goals', 'all_six');

        expect(s.military.pending_event_notifications).toEqual([
            {
                notification_id: 'rs_strategic_goals:RS:HRHB',
                event_id: 'rs_strategic_goals',
                source_faction: 'RS',
                target_faction: 'HRHB',
                response_id: 'all_six',
                surfaced_on_turn: 2,
                headline: 'Karadzic Assembly clarifies territorial reach',
                body: 'Mostar leadership weighs the corridor and ethnic-separation claims against its patron line.',
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
        ]);
    });

    it('emits an authored notification when an AI respondent takes the default response', () => {
        enableNotifications();
        const s = state('RBiH', 1);

        evaluateEvents(s, () => 0, 1, [RS_STRATEGIC_GOALS]);

        expect(s.military.pending_event_decisions ?? []).toHaveLength(0);
        expect(s.military.pending_event_notifications?.map((n) => n.notification_id)).toEqual([
            'rs_strategic_goals:RS:HRHB',
            'rs_strategic_goals:RS:RBiH',
        ]);
        expect(s.military.pending_event_notifications?.find((n) => n.target_faction === 'RBiH')?.headline)
            .toBe('RS Assembly endorses Six Strategic Goals');
    });

    it('keeps notification emission byte-stable across identical runs', () => {
        enableNotifications();
        const a = state('RBiH', 1);
        const b = state('RBiH', 1);

        evaluateEvents(a, () => 0, 1, [RS_STRATEGIC_GOALS]);
        evaluateEvents(b, () => 0, 1, [RS_STRATEGIC_GOALS]);

        expect(JSON.stringify(a.military.pending_event_notifications)).toBe(
            JSON.stringify(b.military.pending_event_notifications),
        );
    });
});
