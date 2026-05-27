import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { getOperationalSitrepView } from '../src/ui/shared/operational_sitrep_views.js';

/** Base state includes all migration defaults that deserializeState adds, so round-trip matches (Phase B Step 1). */
const baseState: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
        turn: 0,
        seed: 'initial-seed',
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
    } as any,
    factions: [
        {
            id: 'RBiH',
            profile: {
                authority: 10,
                legitimacy: 10,
                control: 10,
                logistics: 10,
                exhaustion: 0,
            },
            areasOfResponsibility: [],
            supply_sources: [],
            command_capacity: 0,
            negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
            declaration_pressure: 0,
            declared: false,
            declaration_turn: null,
        },
    ],
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
        phantoms_spawned: [],
        negotiation: {
            capital: {},
            patron_relationships: {},
            peace_plan_history: [],
            pending_counter_offers: [],
        },
        war_jna: { transition_begun: false, withdrawal_progress: 0, asset_transfer_rs: 0 },
        war_militia_strength: {},
    } as any,
    political: {
        political_controllers: {},
        negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null, last_counter_turn: {} },
        ceasefire: {},
        negotiation_ledger: [],
        supply_rights: { corridors: [] },
        municipalities: {},
        war_consolidation_until: {},
        war_control_strain: {},
        war_exhaustion: {},
        war_exhaustion_local: {},
        war_supply_condition: {},
        war_supply_pressure: {},
    } as any,
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
    } as any,
    paramilitary_decision_history: [],
};

describe('state serialization contracts', () => {
    it('round-trips cleanly', () => {
        const original = structuredClone(baseState);
        const payload = serializeState(original);
        const hydrated = deserializeState(payload);

        expect(hydrated).toEqual(original);
    });

    it('serialize -> deserialize -> serialize yields identical string', () => {
        const original = structuredClone(baseState);
        const once = serializeState(original);
        const hydrated = deserializeState(once);
        const twice = serializeState(hydrated);

        expect(once).toBe(twice);
    });

    it('preserves canonical command briefing packets', () => {
        const original = structuredClone(baseState);
        original.meta.turn = 12;
        original.meta.player_faction = 'RBiH' as any;
        original.military.last_briefing = {
            turn: 12,
            faction: 'RBiH',
            headline: '2 items for your review.',
            criticalCount: 1,
            warningCount: 1,
            items: [
                {
                    id: 'cmd-1',
                    section: 'command',
                    severity: 'critical',
                    title: 'Commander requests acknowledgement',
                    detail: 'Pending officer decision remains unresolved.',
                    actionLabel: 'Review command chain',
                    target: { corpsId: 'rbih_1st_corps' },
                },
                {
                    id: 'hum-1',
                    section: 'humanitarian',
                    severity: 'warning',
                    title: 'Gorazde under prolonged siege',
                    detail: 'Isolation is now affecting resilience.',
                    target: { enclaveId: 'gorazde' },
                },
            ],
        } as any;

        const payload = serializeState(original);
        const hydrated = deserializeState(payload);

        expect(hydrated.military.last_briefing).toEqual(original.military.last_briefing);
        expect(serializeState(hydrated)).toBe(payload);
    });

    it('preserves canonical packets and reconstructs SITREP deterministically after desktop-style autonomy mutations', () => {
        const original = structuredClone(baseState) as GameState & { [key: string]: any };
        original.meta.turn = 12;
        original.meta.phase = 'war';
        original.meta.player_faction = 'RBiH';
        original.meta.autonomy_level = 1;
        original.meta.autonomy_level_pending = 2;
        original.meta.autonomy_overrides = [];
        original.meta.pending_proposal_reviews = [
            {
                id: 'proposal-1',
                turn: 12,
                faction: 'RBiH',
                domain: 'ops',
                description: 'Approve the pending operation.',
                proposed_action: 'APPROVE_OP:arbih_3rd_corps:plan-1',
            },
        ] as any;
        original.factions = [
            {
                id: 'RBiH',
                profile: {
                    authority: 0.25,
                    legitimacy: 0.8,
                    control: 0.5,
                    logistics: 0.6,
                    exhaustion: 0.2,
                },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null,
            },
            {
                id: 'RS',
                profile: {
                    authority: 0.8,
                    legitimacy: 0.8,
                    control: 0.5,
                    logistics: 0.6,
                    exhaustion: 0.1,
                },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null,
            },
        ] as any;
        original.military.formations = {
            arbih_3rd_corps: {
                id: 'arbih_3rd_corps',
                faction: 'RBiH',
                force_label: 'ARBiH',
                kind: 'corps',
                status: 'active',
                readiness: 'active',
                cohesion: 60,
                morale: 60,
                activation_gated: false,
                activation_turn: null,
                name: 'arbih_3rd_corps',
                personnel: 0,
                created_turn: 0,
                assignment: null,
                ops: { fatigue: 0, last_supplied_turn: null },
            },
            arbih_b1: {
                id: 'arbih_b1',
                faction: 'RBiH',
                force_label: 'ARBiH',
                kind: 'brigade',
                status: 'active',
                readiness: 'active',
                name: '1st Brigade',
                personnel: 450,
                cohesion: 41,
                morale: 60,
                activation_gated: false,
                activation_turn: null,
                corps_id: 'arbih_3rd_corps',
                created_turn: 0,
                assignment: null,
                ops: { fatigue: 0, last_supplied_turn: null },
            },
        } as any;
        original.military.front_edges = [
            { edge_id: 'edge_1', a: 'op:tuzla:centar', b: 'op:bijeljina:center', side_a: 'RBiH', side_b: 'RS' },
        ];
        original.military.front_pressure = {
            edge_1: { edge_id: 'edge_1', value: 0.9, max_abs: 1, last_updated_turn: 12 },
        } as any;
        original.military.front_segments = {
            edge_1: {
                edge_id: 'edge_1',
                friction: 1,
                max_friction: 1,
                active: true,
                active_streak: 0,
                max_active_streak: 0,
                created_turn: 0,
                since_turn: 0,
                last_active_turn: 12,
            },
        } as any;
        original.military.casualty_ledger = {};
        original.military.militia_garrison = {};
        original.military.brigade_movement_state = {};
        original.military.brigade_encircled = { arbih_b1: true };
        original.military.corps_command = {
            arbih_3rd_corps: {
                stance: 'balanced',
                player_ordered_stance: 'balanced',
                active_operations: [{
                    name: 'plan-1',
                    type: 'sector_attack',
                    phase: 'execution',
                    started_turn: 11,
                    phase_started_turn: 11,
                    participating_brigades: ['arbih_b1'],
                }],
                player_op_response: { plan_id: 'plan-1', approved: true, turn: 12 },
            },
        } as any;
        original.military.last_briefing = {
            turn: 12,
            faction: 'RBiH',
            headline: '2 items for your review.',
            criticalCount: 1,
            warningCount: 1,
            items: [
                {
                    id: 'cmd-1',
                    section: 'command',
                    severity: 'critical',
                    title: 'Commander requests acknowledgement',
                    detail: 'Pending officer decision remains unresolved.',
                    actionLabel: 'Review command chain',
                    target: { corpsId: 'arbih_3rd_corps' },
                },
                {
                    id: 'hum-1',
                    section: 'humanitarian',
                    severity: 'warning',
                    title: 'Gorazde under prolonged siege',
                    detail: 'Isolation is now affecting resilience.',
                    target: { enclaveId: 'gorazde' },
                },
            ],
        } as any;
        original.political.political_controllers = {
            'op:tuzla:centar': 'RBiH',
            'op:bijeljina:center': 'RS',
        };
        original.political.war_exhaustion = { RBiH: 0.2 };
        original.political.war_exhaustion_local = {};
        original.political.war_supply_pressure = {};
        original.political.loss_of_control_trends = { by_faction: { RBiH: { exhaustion_trend: 'flat' } } } as any;
        original.displacement.displacement_state = {};
        original.displacement.displacement_camp_state = {
            camp_1: { mun_id: 'tuzla', population: 1000, started_turn: 12, by_faction: { RBiH: 1000 } },
        } as any;
        original.displacement.hostile_takeover_timers = {
            timer_1: { mun_id: 'tuzla', from_faction: 'RBiH', to_faction: 'RS', started_turn: 12 },
        } as any;
        original.displacement.civilian_casualties = {};
        original.displacement.sustainability_state = {
            tuzla: {
                mun_id: 'tuzla',
                collapsed: false,
                sustainability_score: 20,
                is_surrounded: false,
                unsupplied_turns: 0,
                last_updated_turn: 12,
            },
        } as any;

        const expectedSitrep = getOperationalSitrepView(original as any, 'RBiH');
        const payload = serializeState(original);
        const hydrated = deserializeState(payload) as GameState & { [key: string]: any };
        const hydratedSitrep = getOperationalSitrepView(hydrated as any, 'RBiH');

        expect(hydrated.military.last_briefing).toEqual(original.military.last_briefing);
        expect(hydrated.military.front_segments).toEqual(original.military.front_segments);
        expect(hydratedSitrep).toEqual(expectedSitrep);
        expect(serializeState(hydrated)).toBe(payload);
    });
});
