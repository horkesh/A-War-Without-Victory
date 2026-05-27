import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';

function baseState(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 12,
            seed: 'event-state-shape',
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
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            theatres: {},
            army_theatre_assignment: {},
            assignable_front_segments: [],
            brigade_front_assignment: {},
            army_co_decision_traces: {},
            army_corps_directives_by_faction: {},
            event_decision_log: [],
            fired_event_ids: [],
            event_readiness: {},
            event_fire_counts: {},
            event_last_fired_turn: {},
            event_flags: {},
            enabled_event_ids: [],
            phantoms_spawned: [],
        },
        political: {
            political_controllers: {},
            municipalities: {},
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
            ceasefire: {},
            negotiation_ledger: [],
            supply_rights: { corridors: [] },
            war_consolidation_until: {},
            war_control_strain: {},
            war_supply_pressure: {},
            war_supply_condition: {},
            war_exhaustion: {},
            war_exhaustion_local: {},
        },
        displacement: {
            displacement_event_log: [],
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
            displacement_camp_state: {},
            civilian_casualties: {},
            displacement_state: {},
            hostile_takeover_timers: {},
            minority_flight_state: {},
            municipality_displacement: {},
            settlement_displacement: {},
            settlement_displacement_started_turn: {},
            sustainability_state: {},
            war_displacement_initiated: {},
        },
        paramilitary_decision_history: [],
        ...overrides,
    };
}

function validateWithMilitary(militaryOverrides: Record<string, unknown>) {
    const state = baseState({
        military: {
            ...(baseState().military as Record<string, unknown>),
            ...militaryOverrides,
        },
    });
    return validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });
}

describe('event state shape validation', () => {
    it('accepts valid pending decisions, decision log rows, and event modifier arrays', () => {
        const result = validateWithMilitary({
            pending_event_decisions: [{
                event_id: 'rbih_state_identity',
                event_title: 'What Is Bosnia?',
                turn_fired: 2,
                response_options: [{ id: 'civic', label: 'Civic multi-ethnic republic' }],
                faction: 'RBiH',
                requires_player_response: true,
                historical_default_response_id: 'civic',
                trigger_evidence: ['turn window opened'],
            }],
            event_decision_log: [{
                event_id: 'rbih_state_identity',
                response_id: 'civic',
                decision_source: 'player',
                faction: 'RBiH',
                turn: 2,
            }],
            event_aggression_modifiers: [{ faction: 'RS', delta: 0.2, expires_turn: 14 }],
            recruitment_modifiers: [{ faction: 'RBiH', pool_multiplier: 1.1, expires_turn: 20 }],
            equipment_quality_modifiers: [{ faction: 'HRHB', multiplier: 0.95, expires_turn: 18 }],
        });

        expect(result).toEqual({ ok: true });
    });

    it('rejects malformed pending event decisions', () => {
        const result = validateWithMilitary({
            pending_event_decisions: [{
                event_id: '',
                event_title: 42,
                turn_fired: -1,
                response_options: 'bad',
                faction: 'JNA',
                requires_player_response: 'yes',
                historical_default_response_id: '',
                trigger_evidence: [7],
            }],
        });

        expect(result).toEqual({
            ok: false,
            errors: expect.arrayContaining([
                'military.pending_event_decisions[0].event_id must be a non-empty string',
                'military.pending_event_decisions[0].event_title must be a non-empty string',
                'military.pending_event_decisions[0].turn_fired must be a non-negative integer',
                'military.pending_event_decisions[0].response_options must be an array',
                'military.pending_event_decisions[0].faction must be one of: RBiH, RS, HRHB',
                'military.pending_event_decisions[0].requires_player_response must be boolean when present',
                'military.pending_event_decisions[0].historical_default_response_id must be a non-empty string when present',
                'military.pending_event_decisions[0].trigger_evidence must be a string array when present',
            ]),
        });
    });

    it('rejects malformed event decision log entries', () => {
        const result = validateWithMilitary({
            event_decision_log: [{
                event_id: '',
                response_id: 42,
                decision_source: 'random',
                faction: 'JNA',
                turn: 1.5,
            }],
        });

        expect(result).toEqual({
            ok: false,
            errors: expect.arrayContaining([
                'military.event_decision_log[0].event_id must be a non-empty string',
                'military.event_decision_log[0].response_id must be a non-empty string',
                'military.event_decision_log[0].decision_source must be one of: bot_political, bot_v1, bot_ai_default, player',
                'military.event_decision_log[0].faction must be null or one of: RBiH, RS, HRHB',
                'military.event_decision_log[0].turn must be a non-negative integer',
            ]),
        });
    });

    it('rejects malformed event modifier arrays', () => {
        const result = validateWithMilitary({
            event_aggression_modifiers: [{ faction: 'JNA', delta: Number.POSITIVE_INFINITY, expires_turn: -1 }],
            recruitment_modifiers: [{ faction: 'RS', pool_multiplier: '1.1', expires_turn: 2.5 }],
            equipment_quality_modifiers: 'bad',
        });

        expect(result).toEqual({
            ok: false,
            errors: expect.arrayContaining([
                'military.event_aggression_modifiers[0].faction must be one of: RBiH, RS, HRHB',
                'military.event_aggression_modifiers[0].delta must be a finite number',
                'military.event_aggression_modifiers[0].expires_turn must be a non-negative integer',
                'military.recruitment_modifiers[0].pool_multiplier must be a finite number',
                'military.recruitment_modifiers[0].expires_turn must be a non-negative integer',
                'military.equipment_quality_modifiers must be an array when present',
            ]),
        });
    });
});
