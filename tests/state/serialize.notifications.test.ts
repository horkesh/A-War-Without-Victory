import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION, type GameState } from '../../src/state/game_state.js';
import { deserializeState, serializeState } from '../../src/state/serialize.js';
import { validateGameStateShape } from '../../src/state/validateGameState.js';

function minimalState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 2,
            phase: 'war',
            referendum_held: false,
            referendum_turn: null,
            war_start_turn: null,
            peace_scheduled_referendum_turn: null,
            peace_scheduled_war_start_turn: null,
            peace_war_start_control_path: null,
            referendum_eligible_turn: null,
            referendum_deadline_turn: null,
            game_over: false,
            player_faction: 'RBiH',
        },
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            theatres: {},
            army_theatre_assignment: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            assignable_front_segments: [],
            brigade_front_assignment: {},
            militia_pools: {},
            event_overflow_queue: ['overflow_notice'],
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
            ],
        },
        political: {
            political_controllers: {},
            negotiation_status: {
                ceasefire_active: false,
                ceasefire_since_turn: null,
                last_offer_turn: null,
                last_counter_turn: {},
            },
            ceasefire: {},
            negotiation_ledger: [],
            supply_rights: { corridors: [] },
        },
        displacement: {},
    } as unknown as GameState;
}

describe('event notification serialization', () => {
    it('round-trips pending_event_notifications through save serialization', () => {
        const original = minimalState();

        const payload = serializeState(original);
        const hydrated = deserializeState(payload);

        expect(hydrated.military.pending_event_notifications).toEqual(original.military.pending_event_notifications);
        expect(hydrated.military.event_overflow_queue).toEqual(['overflow_notice']);
        expect(serializeState(hydrated)).toBe(payload);
    });

    it('validates pending_event_notifications shape when present', () => {
        const invalid = minimalState() as unknown as Record<string, any>;
        invalid.military.pending_event_notifications[0].surfaced_on_turn = 1.5;
        invalid.military.pending_event_notifications[0].consumed = 'no';

        const result = validateGameStateShape(invalid, { requireVersion: CURRENT_SCHEMA_VERSION });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('military.pending_event_notifications[0].surfaced_on_turn must be a non-negative integer');
            expect(result.errors).toContain('military.pending_event_notifications[0].consumed must be boolean');
        }
    });
});
