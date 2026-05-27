import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { applyMigrations, getLatestSchemaVersion } from '../src/state/save_migration.js';

function minimalLegacyState(schemaVersion = 2): any {
    return {
        schema_version: schemaVersion,
        meta: {
            turn: 5,
            seed: 'save-migration-versioned-steps',
        },
        factions: [
            {
                id: 'ARBiH',
                profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 },
                areasOfResponsibility: [],
            },
        ],
        military: {
            front_segments: {
                fs1: {},
            },
            formations: {
                brigade_1: {
                    id: 'brigade_1',
                    name: '1st Brigade',
                    faction: 'ARBiH',
                    personnel: 100,
                },
            },
            militia_pools: {
                'mun1:ARBiH': {
                    mun_id: 'mun1',
                    faction: 'ARBiH',
                    available: 4,
                    committed: 0,
                    exhausted: 0,
                    updated_turn: 0,
                },
            },
        },
        political: {
            political_controllers: {},
        },
        displacement: {},
    };
}

describe('versioned save migration steps', () => {
    it('bumps GameState schema to the latest registered migration', () => {
        expect(CURRENT_SCHEMA_VERSION).toBe(getLatestSchemaVersion());
        expect(getLatestSchemaVersion()).toBe(27);
    });

    it('materializes legacy defaults through versioned registry steps', () => {
        const state = minimalLegacyState();

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.meta.referendum_held).toBe(false);
        expect(state.meta.game_over).toBe(false);
        expect(state.factions[0].id).toBe('RBiH');
        expect(state.factions[0].declaration_pressure).toBe(0);
        expect(state.factions[0].negotiation.capital).toBe(0);
        expect(state.military.theatres).toEqual({});
        expect(state.military.assignable_front_segments).toEqual([]);
        expect(state.military.front_segments.fs1.active_streak).toBe(0);
        expect(state.military.formations.brigade_1.kind).toBe('brigade');
        expect(state.military.formations.brigade_1.force_label).toBe('ARBiH');
        expect(state.military.militia_pools['mun1:ARBiH'].faction).toBe('RBiH');
        expect(state.military.militia_pools['mun1:ARBiH'].fatigue).toBe(0);
        expect(state.political.negotiation_status).toEqual({
            ceasefire_active: false,
            ceasefire_since_turn: null,
            last_offer_turn: null,
            last_counter_turn: {},
        });
        expect(state.meta.player_faction).toBe('RBiH');
        expect(state.military.negotiation.pending_counter_offers).toEqual([]);
        expect(state.military.army_co_decision_traces).toEqual({});
        expect(state.military.army_corps_directives_by_faction).toEqual({});
        expect(state.military.event_decision_log).toEqual([]);
        expect(state.military.fired_event_ids).toEqual([]);
        expect(state.military.event_readiness).toEqual({});
        expect(state.military.event_fire_counts).toEqual({});
        expect(state.military.event_last_fired_turn).toEqual({});
        expect(state.military.event_flags).toEqual({});
        expect(state.military.enabled_event_ids).toEqual([]);
        expect(state.military.event_overflow_queue).toEqual([]);
        expect(state.military.event_aggression_modifiers).toEqual([]);
        expect(state.military.recruitment_modifiers).toEqual([]);
        expect(state.military.equipment_quality_modifiers).toEqual([]);
        expect(state.military.cost_ledger_annotations).toEqual([]);
        expect(state.military.pending_convoy_decisions).toEqual([]);
        expect(state.military.convoy_decision_history).toEqual([]);
        expect(state.military.pending_event_decisions).toEqual([]);
        expect(state.military.pending_event_notifications).toEqual([]);
        expect(state.military.phantoms_spawned).toEqual([]);
        expect(state.paramilitary_decision_history).toEqual([]);
        expect(state.political.supply_rights).toEqual({ corridors: [] });
        expect(state.political.war_consolidation_until).toEqual({});
        expect(state.political.war_control_strain).toEqual({});
        expect(state.political.war_supply_pressure).toEqual({});
        expect(state.political.war_supply_condition).toEqual({});
        expect(state.political.war_exhaustion).toEqual({});
        expect(state.political.war_exhaustion_local).toEqual({});
        expect(state.displacement.displacement_event_log).toEqual([]);
        expect(state.displacement.displacement_humanitarian_aggregates).toEqual({});
        expect(state.displacement.displacement_origin_dest_arrivals).toEqual({});
        expect(state.displacement.displacement_recent_by_turn).toEqual({});
        expect(state.displacement.settlement_displacement).toEqual({});
        expect(state.displacement.settlement_displacement_started_turn).toEqual({});
        expect(state.displacement.municipality_displacement).toEqual({});
        expect(state.displacement.civilian_casualties).toEqual({});
    });

    it('materializes v8 displacement aggregate defaults for v7 saves', () => {
        const state = minimalLegacyState(7);

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.displacement.displacement_humanitarian_aggregates).toEqual({});
        expect(state.displacement.displacement_origin_dest_arrivals).toEqual({});
        expect(state.displacement.displacement_recent_by_turn).toEqual({});
    });

    it('materializes displacement root and aggregate/capacity records for legacy saves without displacement state', () => {
        const state = minimalLegacyState(1);
        delete state.displacement;

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.displacement).toEqual({
            displacement_state: {},
            displacement_camp_state: {},
            displacement_event_log: [],
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
            civilian_casualties: {},
            hostile_takeover_timers: {},
            minority_flight_state: {},
            municipality_displacement: {},
            settlement_displacement: {},
            settlement_displacement_started_turn: {},
            sustainability_state: {},
            war_displacement_initiated: {},
        });
    });

    it('materializes v10 command substrate defaults for v9 saves', () => {
        const state = minimalLegacyState(9);

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.military.army_co_decision_traces).toEqual({});
        expect(state.military.army_corps_directives_by_faction).toEqual({});
    });

    it('materializes v14 event decision log default for v13 saves', () => {
        const state = minimalLegacyState(13);

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.military.event_decision_log).toEqual([]);
    });

    it('materializes v15 event bookkeeping defaults for v14 saves', () => {
        const state = minimalLegacyState(14);

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.military.fired_event_ids).toEqual([]);
        expect(state.military.event_readiness).toEqual({});
        expect(state.military.event_fire_counts).toEqual({});
        expect(state.military.event_last_fired_turn).toEqual({});
        expect(state.military.event_flags).toEqual({});
        expect(state.military.enabled_event_ids).toEqual([]);
    });

    it('materializes v16 displacement capacity map defaults for v15 saves', () => {
        const state = minimalLegacyState(15);

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.displacement.settlement_displacement).toEqual({});
        expect(state.displacement.settlement_displacement_started_turn).toEqual({});
        expect(state.displacement.municipality_displacement).toEqual({});
    });

    it('materializes v17 displacement operational contract defaults for v16 saves', () => {
        const state = minimalLegacyState(16);
        delete state.displacement.war_displacement_initiated;
        delete state.displacement.hostile_takeover_timers;
        delete state.displacement.displacement_camp_state;

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.displacement.war_displacement_initiated).toEqual({});
        expect(state.displacement.hostile_takeover_timers).toEqual({});
        expect(state.displacement.displacement_camp_state).toEqual({});
    });

    it('materializes v18 displacement lazy-map defaults for v17 saves', () => {
        const state = minimalLegacyState(17);
        delete state.displacement.displacement_state;
        delete state.displacement.minority_flight_state;
        delete state.displacement.sustainability_state;

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.displacement.displacement_state).toEqual({});
        expect(state.displacement.minority_flight_state).toEqual({});
        expect(state.displacement.sustainability_state).toEqual({});
    });

    it('materializes v19 civilian casualty defaults for v18 saves', () => {
        const state = minimalLegacyState(18);
        delete state.displacement.civilian_casualties;

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.displacement.civilian_casualties).toEqual({});
    });

    it('materializes v20 phantom-spawn marker defaults for v19 saves', () => {
        const state = minimalLegacyState(19);
        delete state.military.phantoms_spawned;

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.military.phantoms_spawned).toEqual([]);
    });

    it('preserves existing v20 phantom-spawn marker order and contents for v19 saves', () => {
        const state = minimalLegacyState(19);
        state.military.phantoms_spawned = ['phantom_b', 'phantom_a', 'phantom_b'];

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.military.phantoms_spawned).toEqual(['phantom_b', 'phantom_a', 'phantom_b']);
    });

    it('materializes v21 paramilitary decision history defaults for v20 saves', () => {
        const state = minimalLegacyState(20);
        delete state.paramilitary_decision_history;

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.paramilitary_decision_history).toEqual([]);
    });

    it('preserves existing v21 paramilitary decision history order and contents for v20 saves', () => {
        const state = minimalLegacyState(20);
        state.paramilitary_decision_history = [
            {
                id: 'paramilitary:5:op:zvornik:kozluk_2',
                turn: 5,
                target_osid: 'op:zvornik:kozluk_2',
                faction: 'RS',
                strength: 80,
                decision: 'allow',
                estimated_civilian_risk: 12,
            },
        ];

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.paramilitary_decision_history).toEqual([
            {
                id: 'paramilitary:5:op:zvornik:kozluk_2',
                turn: 5,
                target_osid: 'op:zvornik:kozluk_2',
                faction: 'RS',
                strength: 80,
                decision: 'allow',
                estimated_civilian_risk: 12,
            },
        ]);
    });

    it('materializes v22 event overflow queue defaults for v21 saves', () => {
        const state = minimalLegacyState(21);
        delete state.military.event_overflow_queue;

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.military.event_overflow_queue).toEqual([]);
    });

    it('preserves existing v22 event overflow queue order and contents for v21 saves', () => {
        const state = minimalLegacyState(21);
        state.military.event_overflow_queue = ['overflow_b', 'overflow_a', 'overflow_b'];

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.military.event_overflow_queue).toEqual(['overflow_b', 'overflow_a', 'overflow_b']);
    });

    it('materializes v23 pending event notification defaults for v22 saves', () => {
        const state = minimalLegacyState(22);
        state.military.event_overflow_queue = [];
        delete state.military.pending_event_notifications;

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.military.pending_event_notifications).toEqual([]);
    });

    it('preserves existing v23 pending event notification order and contents for v22 saves', () => {
        const state = minimalLegacyState(22);
        state.military.event_overflow_queue = [];
        state.military.pending_event_notifications = [
            {
                notification_id: 'event_b:RS:RBiH',
                event_id: 'event_b',
                source_faction: 'RS',
                target_faction: 'RBiH',
                response_id: 'historical_b',
                surfaced_on_turn: 4,
                headline: 'Second notification',
                body: 'Second notification body.',
                consumed: false,
            },
            {
                notification_id: 'event_a:HRHB:RBiH',
                event_id: 'event_a',
                source_faction: 'HRHB',
                target_faction: 'RBiH',
                response_id: 'historical_a',
                surfaced_on_turn: 3,
                headline: 'First notification',
                body: 'First notification body.',
                consumed: true,
            },
        ];

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.military.pending_event_notifications).toEqual([
            {
                notification_id: 'event_b:RS:RBiH',
                event_id: 'event_b',
                source_faction: 'RS',
                target_faction: 'RBiH',
                response_id: 'historical_b',
                surfaced_on_turn: 4,
                headline: 'Second notification',
                body: 'Second notification body.',
                consumed: false,
            },
            {
                notification_id: 'event_a:HRHB:RBiH',
                event_id: 'event_a',
                source_faction: 'HRHB',
                target_faction: 'RBiH',
                response_id: 'historical_a',
                surfaced_on_turn: 3,
                headline: 'First notification',
                body: 'First notification body.',
                consumed: true,
            },
        ]);
    });

    it('materializes v24 pending event decision defaults for v23 saves', () => {
        const state = minimalLegacyState(23);
        state.military.event_overflow_queue = [];
        state.military.pending_event_notifications = [];
        delete state.military.pending_event_decisions;

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.military.pending_event_decisions).toEqual([]);
    });

    it('preserves existing v24 pending event decision order and contents for v23 saves', () => {
        const state = minimalLegacyState(23);
        state.military.event_overflow_queue = [];
        state.military.pending_event_notifications = [];
        state.military.pending_event_decisions = [
            {
                event_id: 'event_b',
                event_title: 'Second decision',
                turn_fired: 4,
                response_options: [{ id: 'historical_b', label: 'Historical B' }],
                faction: 'RS',
                requires_player_response: true,
                historical_default_response_id: 'historical_b',
                trigger_evidence: ['second trigger'],
            },
            {
                event_id: 'event_a',
                event_title: 'First decision',
                turn_fired: 3,
                response_options: [{ id: 'historical_a', label: 'Historical A' }],
                faction: 'RBiH',
                requires_player_response: true,
                historical_default_response_id: 'historical_a',
                trigger_evidence: ['first trigger'],
            },
        ];

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.military.pending_event_decisions).toEqual([
            {
                event_id: 'event_b',
                event_title: 'Second decision',
                turn_fired: 4,
                response_options: [{ id: 'historical_b', label: 'Historical B' }],
                faction: 'RS',
                requires_player_response: true,
                historical_default_response_id: 'historical_b',
                trigger_evidence: ['second trigger'],
            },
            {
                event_id: 'event_a',
                event_title: 'First decision',
                turn_fired: 3,
                response_options: [{ id: 'historical_a', label: 'Historical A' }],
                faction: 'RBiH',
                requires_player_response: true,
                historical_default_response_id: 'historical_a',
                trigger_evidence: ['first trigger'],
            },
        ]);
    });

    it('materializes v25 event modifier defaults for v24 saves', () => {
        const state = minimalLegacyState(24);
        state.military.event_overflow_queue = [];
        state.military.pending_event_notifications = [];
        state.military.pending_event_decisions = [];
        delete state.military.event_aggression_modifiers;
        delete state.military.recruitment_modifiers;
        delete state.military.equipment_quality_modifiers;

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.military.event_aggression_modifiers).toEqual([]);
        expect(state.military.recruitment_modifiers).toEqual([]);
        expect(state.military.equipment_quality_modifiers).toEqual([]);
    });

    it('preserves existing v25 event modifier order and contents for v24 saves', () => {
        const state = minimalLegacyState(24);
        state.military.event_overflow_queue = [];
        state.military.pending_event_notifications = [];
        state.military.pending_event_decisions = [];
        state.military.event_aggression_modifiers = [
            { faction: 'RS', delta: 0.2, expires_turn: 12 },
            { faction: 'RBiH', delta: -0.1, expires_turn: 13 },
        ];
        state.military.recruitment_modifiers = [
            { faction: 'RBiH', pool_multiplier: 1.1, expires_turn: 14 },
            { faction: 'HRHB', pool_multiplier: 0.95, expires_turn: 15 },
        ];
        state.military.equipment_quality_modifiers = [
            { faction: 'HRHB', multiplier: 1.05, expires_turn: 16 },
            { faction: 'RS', multiplier: 0.9, expires_turn: 17 },
        ];

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.military.event_aggression_modifiers).toEqual([
            { faction: 'RS', delta: 0.2, expires_turn: 12 },
            { faction: 'RBiH', delta: -0.1, expires_turn: 13 },
        ]);
        expect(state.military.recruitment_modifiers).toEqual([
            { faction: 'RBiH', pool_multiplier: 1.1, expires_turn: 14 },
            { faction: 'HRHB', pool_multiplier: 0.95, expires_turn: 15 },
        ]);
        expect(state.military.equipment_quality_modifiers).toEqual([
            { faction: 'HRHB', multiplier: 1.05, expires_turn: 16 },
            { faction: 'RS', multiplier: 0.9, expires_turn: 17 },
        ]);
    });

    it('materializes v26 cost ledger annotation defaults for v25 saves', () => {
        const state = minimalLegacyState(25);
        state.military.event_overflow_queue = [];
        state.military.pending_event_notifications = [];
        state.military.pending_event_decisions = [];
        state.military.event_aggression_modifiers = [];
        state.military.recruitment_modifiers = [];
        state.military.equipment_quality_modifiers = [];
        delete state.military.cost_ledger_annotations;

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.military.cost_ledger_annotations).toEqual([]);
    });

    it('preserves existing v26 cost ledger annotation order and contents for v25 saves', () => {
        const state = minimalLegacyState(25);
        state.military.event_overflow_queue = [];
        state.military.pending_event_notifications = [];
        state.military.pending_event_decisions = [];
        state.military.event_aggression_modifiers = [];
        state.military.recruitment_modifiers = [];
        state.military.equipment_quality_modifiers = [];
        state.military.cost_ledger_annotations = [
            { event_id: 'paramilitary_sweep', tag: 'paramilitary_findings', text: 'First finding', turn: 8, faction: 'RBiH' },
            { event_id: 'arms_embargo', tag: 'diplomatic_cost', turn: 9 },
        ];

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.military.cost_ledger_annotations).toEqual([
            { event_id: 'paramilitary_sweep', tag: 'paramilitary_findings', text: 'First finding', turn: 8, faction: 'RBiH' },
            { event_id: 'arms_embargo', tag: 'diplomatic_cost', turn: 9 },
        ]);
    });

    it('materializes v27 convoy decision defaults for v26 saves', () => {
        const state = minimalLegacyState(26);
        state.military.event_overflow_queue = [];
        state.military.pending_event_notifications = [];
        state.military.pending_event_decisions = [];
        state.military.event_aggression_modifiers = [];
        state.military.recruitment_modifiers = [];
        state.military.equipment_quality_modifiers = [];
        state.military.cost_ledger_annotations = [];
        delete state.military.pending_convoy_decisions;
        delete state.military.convoy_decision_history;

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.military.pending_convoy_decisions).toEqual([]);
        expect(state.military.convoy_decision_history).toEqual([]);
    });

    it('preserves existing v27 convoy decision order and contents for v26 saves', () => {
        const state = minimalLegacyState(26);
        state.military.event_overflow_queue = [];
        state.military.pending_event_notifications = [];
        state.military.pending_event_decisions = [];
        state.military.event_aggression_modifiers = [];
        state.military.recruitment_modifiers = [];
        state.military.equipment_quality_modifiers = [];
        state.military.cost_ledger_annotations = [];
        state.military.pending_convoy_decisions = [
            { id: 'convoy:8:ENCL_a:RS', target_enclave: 'ENCL_a', route_faction: 'RS', supply_amount: 0.5, decision: 'allow' },
            { id: 'convoy:9:ENCL_b:HRHB', target_enclave: 'ENCL_b', route_faction: 'HRHB', supply_amount: 0.4 },
        ];
        state.military.convoy_decision_history = [
            { id: 'convoy:7:ENCL_c:RS', turn: 7, target_enclave: 'ENCL_c', route_faction: 'RS', target_faction: 'RBiH', supply_amount: 0.3, decision: 'block', decided_by: 'bot' },
            { id: 'convoy:8:ENCL_d:HRHB', turn: 8, target_enclave: 'ENCL_d', route_faction: 'HRHB', target_faction: 'RBiH', supply_amount: 0.6, decision: 'divert', decided_by: 'player' },
        ];

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.military.pending_convoy_decisions).toEqual([
            { id: 'convoy:8:ENCL_a:RS', target_enclave: 'ENCL_a', route_faction: 'RS', supply_amount: 0.5, decision: 'allow' },
            { id: 'convoy:9:ENCL_b:HRHB', target_enclave: 'ENCL_b', route_faction: 'HRHB', supply_amount: 0.4 },
        ]);
        expect(state.military.convoy_decision_history).toEqual([
            { id: 'convoy:7:ENCL_c:RS', turn: 7, target_enclave: 'ENCL_c', route_faction: 'RS', target_faction: 'RBiH', supply_amount: 0.3, decision: 'block', decided_by: 'bot' },
            { id: 'convoy:8:ENCL_d:HRHB', turn: 8, target_enclave: 'ENCL_d', route_faction: 'HRHB', target_faction: 'RBiH', supply_amount: 0.6, decision: 'divert', decided_by: 'player' },
        ]);
    });
});
