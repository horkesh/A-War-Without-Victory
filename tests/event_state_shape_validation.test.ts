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
            event_overflow_queue: [],
            pending_event_decisions: [],
            pending_event_notifications: [],
            phantoms_spawned: [],
            event_aggression_modifiers: [],
            recruitment_modifiers: [],
            equipment_quality_modifiers: [],
            cost_ledger_annotations: [],
            pending_convoy_decisions: [],
            convoy_decision_history: [],
            pending_reserve_requests: [],
            reserve_request_history: [],
            triggered_operations_accepted: {},
            declined_operations: {},
            used_operation_names: {},
            pending_officer_events: [],
            officer_decision_history: [],
            cascade_penalties: [],
            offensive_ops_suppressions: [],
            alliance_locks: [],
            bot_priority_shifts: [],
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
    it('accepts valid pending decisions, decision log rows, event modifier arrays, cost annotations, officer queues, and consequence runtime queues', () => {
        const result = validateWithMilitary({
            pending_event_decisions: [{
                event_id: 'rbih_state_identity',
                event_title: 'What Is Bosnia?',
                turn_fired: 2,
                response_options: [{ id: 'civic', label: 'Civic multi-ethnic republic' }],
                faction: 'RBiH',
                requires_player_response: true,
                historical_default_response_id: 'civic',
                staff_recommended_response_id: 'civic',
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
            cost_ledger_annotations: [
                { event_id: 'paramilitary_sweep', tag: 'paramilitary_findings', text: 'Verified finding', turn: 8, faction: 'RBiH' },
                { event_id: 'external_pressure', tag: 'diplomatic_cost', turn: 9 },
            ],
            event_overflow_queue: ['delayed_event_a', 'delayed_event_b'],
            pending_officer_events: [{
                event_id: 'officer:event-a',
                type: 'order_modified',
                faction: 'RBiH',
                turn: 12,
                officer_id: 'commander_a',
                acknowledged: false,
                current_commander_id: 'old_a',
                corps_id: 'arbih_1st_corps',
                reason: '',
                overridable: true,
                override_action: 'confirm_order_override',
                original_order: {
                    order_type: 'operation_launch',
                    corps_id: '',
                    operation_name: 'Operation A',
                    objectives: ['obj_a'],
                    delay_turns: 0,
                },
                interpreted_order: {
                    order_type: 'operation_launch',
                    corps_id: 'arbih_1st_corps',
                    directive_verb: 'attack',
                    opportunity_id: 'opp_a',
                },
            }],
            officer_decision_history: [{
                id: 'officer:12:officer:event-a:override_confirmed',
                turn: 12,
                faction: 'RBiH',
                event_id: 'officer:event-a',
                event_type: 'order_modified',
                officer_id: 'commander_a',
                current_commander_id: 'old_a',
                corps_id: 'arbih_1st_corps',
                decision: 'override_confirmed',
            }],
            cascade_penalties: [{ osid: 'op:banja_luka:west', multiplier: 0.85, expires_turn: 178 }],
            offensive_ops_suppressions: [{ faction: 'RS', expires_turn: 180, reason: 'holbrooke_halt' }],
            alliance_locks: [{ mode: 'floor', value: 0.8, expires_turn: 120 }],
            bot_priority_shifts: [{ faction: 'RBiH', add_objectives: ['obj_a'], remove_objectives: ['obj_b'], expires_turn: 170 }],
        });

        expect(result).toEqual({ ok: true });
    });

    it('rejects malformed pending event decisions', () => {
        const result = validateWithMilitary({
            pending_event_decisions: [
                {
                    event_id: '',
                    event_title: 42,
                    turn_fired: -1,
                    response_options: [
                        42,
                        { id: '', label: 7, effect: 42, effects: 'bad' },
                    ],
                    faction: 'JNA',
                    requires_player_response: 'yes',
                    historical_default_response_id: '',
                    staff_recommended_response_id: '',
                    trigger_evidence: [7],
                },
                {
                    event_id: 'empty_options',
                    event_title: 'Empty Options',
                    turn_fired: 1,
                    response_options: [],
                    faction: 'RBiH',
                },
                {
                    event_id: 'bad_nested_options',
                    event_title: 'Bad Nested Options',
                    turn_fired: 1,
                    response_options: [
                        { id: 'same', label: 'A', effects: [42] },
                        { id: 'same', label: 'B' },
                    ],
                    faction: 'RBiH',
                    historical_default_response_id: 'missing',
                    staff_recommended_response_id: 'missing_staff',
                },
            ],
        });

        expect(result).toEqual({
            ok: false,
            errors: expect.arrayContaining([
                'military.pending_event_decisions[0].event_id must be a non-empty string',
                'military.pending_event_decisions[0].event_title must be a non-empty string',
                'military.pending_event_decisions[0].turn_fired must be a non-negative integer',
                'military.pending_event_decisions[0].response_options[0] must be an object',
                'military.pending_event_decisions[0].response_options[1].id must be a non-empty string',
                'military.pending_event_decisions[0].response_options[1].label must be a non-empty string',
                'military.pending_event_decisions[0].response_options[1].effect must be an object with a non-empty kind',
                'military.pending_event_decisions[0].response_options[1].effects must be an array when present',
                'military.pending_event_decisions[0].faction must be one of: RBiH, RS, HRHB',
                'military.pending_event_decisions[0].requires_player_response must be boolean when present',
                'military.pending_event_decisions[0].historical_default_response_id must be a non-empty string when present',
                'military.pending_event_decisions[0].staff_recommended_response_id must be a non-empty string when present',
                'military.pending_event_decisions[0].trigger_evidence must be a string array when present',
                'military.pending_event_decisions[1].response_options must not be empty',
                'military.pending_event_decisions[2].response_options[0].effects[0] must be an object with a non-empty kind',
                'military.pending_event_decisions[2].response_options[1].id must be unique within response_options: same',
                'military.pending_event_decisions[2].historical_default_response_id must match a response option id',
                'military.pending_event_decisions[2].staff_recommended_response_id must match a response option id',
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

    it('rejects malformed cost ledger annotations', () => {
        const result = validateWithMilitary({
            cost_ledger_annotations: [
                { event_id: '', tag: 7, text: 42, turn: -1, faction: 'JNA' },
                42,
            ],
        });

        expect(result).toEqual({
            ok: false,
            errors: expect.arrayContaining([
                'military.cost_ledger_annotations[0].event_id must be a non-empty string',
                'military.cost_ledger_annotations[0].tag must be a non-empty string',
                'military.cost_ledger_annotations[0].turn must be a non-negative integer',
                'military.cost_ledger_annotations[0].text must be a string when present',
                'military.cost_ledger_annotations[0].faction must be one of: RBiH, RS, HRHB',
                'military.cost_ledger_annotations[1] must be an object',
            ]),
        });
    });

    it('rejects malformed event overflow queues', () => {
        const nonArray = validateWithMilitary({ event_overflow_queue: 'bad' });
        const nonStringEntry = validateWithMilitary({ event_overflow_queue: ['ok', 7] });

        expect(nonArray).toEqual({
            ok: false,
            errors: expect.arrayContaining([
                'military.event_overflow_queue must be a string array when present',
            ]),
        });
        expect(nonStringEntry).toEqual({
            ok: false,
            errors: expect.arrayContaining([
                'military.event_overflow_queue must be a string array when present',
            ]),
        });
    });

    it('rejects malformed pending officer events', () => {
        const result = validateWithMilitary({
            pending_officer_events: [{
                event_id: '',
                type: 'not_real',
                faction: 'JNA',
                turn: -1,
                officer_id: '',
                current_commander_id: '',
                corps_id: '',
                acknowledged: 'false',
                reason: 7,
                overridable: 'yes',
                override_action: 42,
                original_order: {
                    order_type: 'bad',
                    corps_id: 42,
                    objectives: ['ok', 7],
                    delay_turns: -1,
                },
                interpreted_order: 42,
            }, 42],
        });

        expect(result).toEqual({
            ok: false,
            errors: expect.arrayContaining([
                'military.pending_officer_events[0].event_id must be a non-empty string',
                'military.pending_officer_events[0].type must be a known OfficerEventType',
                'military.pending_officer_events[0].faction must be one of: RBiH, RS, HRHB',
                'military.pending_officer_events[0].turn must be a non-negative integer',
                'military.pending_officer_events[0].officer_id must be a non-empty string',
                'military.pending_officer_events[0].acknowledged must be boolean',
                'military.pending_officer_events[0].current_commander_id must be a non-empty string when present',
                'military.pending_officer_events[0].corps_id must be a non-empty string when present',
                'military.pending_officer_events[0].reason must be a string when present',
                'military.pending_officer_events[0].overridable must be boolean when present',
                'military.pending_officer_events[0].override_action must be a string when present',
                'military.pending_officer_events[0].original_order.order_type must be a valid order_type',
                'military.pending_officer_events[0].original_order.corps_id must be a string',
                'military.pending_officer_events[0].original_order.objectives must be a string array when present',
                'military.pending_officer_events[0].original_order.delay_turns must be a non-negative integer when present',
                'military.pending_officer_events[0].interpreted_order must be an object',
                'military.pending_officer_events[1] must be an object',
            ]),
        });
    });

    it('rejects malformed officer decision history', () => {
        const result = validateWithMilitary({
            officer_decision_history: [{
                id: '',
                turn: -1,
                faction: 'JNA',
                event_id: '',
                event_type: '',
                officer_id: '',
                decision: 'ignored',
                current_commander_id: '',
                corps_id: '',
                new_officer_id: '',
                outgoing_officer_id: '',
            }, 42],
        });

        expect(result).toEqual({
            ok: false,
            errors: expect.arrayContaining([
                'military.officer_decision_history[0].id must be a non-empty string',
                'military.officer_decision_history[0].turn must be a non-negative integer',
                'military.officer_decision_history[0].faction must be one of: RBiH, RS, HRHB',
                'military.officer_decision_history[0].event_id must be a non-empty string',
                'military.officer_decision_history[0].event_type must be a non-empty string',
                'military.officer_decision_history[0].officer_id must be a non-empty string',
                'military.officer_decision_history[0].decision must be one of: acknowledged, override_confirmed, replacement_accepted',
                'military.officer_decision_history[0].current_commander_id must be a non-empty string when present',
                'military.officer_decision_history[0].corps_id must be a non-empty string when present',
                'military.officer_decision_history[0].new_officer_id must be a non-empty string when present',
                'military.officer_decision_history[0].outgoing_officer_id must be a non-empty string when present',
                'military.officer_decision_history[1] must be an object',
            ]),
        });
    });

    it('rejects malformed consequence runtime effect queues', () => {
        const result = validateWithMilitary({
            cascade_penalties: [{ osid: '', multiplier: Number.POSITIVE_INFINITY, expires_turn: -1 }, 42],
            offensive_ops_suppressions: [{ faction: 'JNA', expires_turn: 1.5, reason: 7 }, 42],
            alliance_locks: [{ mode: 'middle', value: Number.NaN, expires_turn: -1 }, 42],
            bot_priority_shifts: [{ faction: 'UN', add_objectives: ['ok', 7], remove_objectives: 'bad', expires_turn: -1 }, 42],
        });

        expect(result).toEqual({
            ok: false,
            errors: expect.arrayContaining([
                'military.cascade_penalties[0].osid must be a non-empty string',
                'military.cascade_penalties[0].multiplier must be a finite number',
                'military.cascade_penalties[0].expires_turn must be a non-negative integer',
                'military.cascade_penalties[1] must be an object',
                'military.offensive_ops_suppressions[0].faction must be one of: RBiH, RS, HRHB',
                'military.offensive_ops_suppressions[0].expires_turn must be a non-negative integer',
                'military.offensive_ops_suppressions[0].reason must be a string when present',
                'military.offensive_ops_suppressions[1] must be an object',
                'military.alliance_locks[0].mode must be one of: floor, ceiling',
                'military.alliance_locks[0].value must be a finite number',
                'military.alliance_locks[0].expires_turn must be a non-negative integer',
                'military.alliance_locks[1] must be an object',
                'military.bot_priority_shifts[0].faction must be one of: RBiH, RS, HRHB',
                'military.bot_priority_shifts[0].add_objectives must be a string array when present',
                'military.bot_priority_shifts[0].remove_objectives must be a string array when present',
                'military.bot_priority_shifts[0].expires_turn must be a non-negative integer',
                'military.bot_priority_shifts[1] must be an object',
            ]),
        });
    });
});
