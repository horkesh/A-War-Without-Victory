import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { deserializeState } from '../src/state/serialize.js';

function currentVersionState(): any {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 0,
            seed: 'save-migration-validator-rejection',
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
            decision_mode: 'historical',
        },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: {
                    pressure: 0,
                    last_change_turn: null,
                    capital: 0,
                    spent_total: 0,
                    last_capital_change_turn: null,
                },
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null,
            },
        ],
        paramilitary_decision_history: [],
        military: {
            front_segments: {},
            theatres: {},
            army_theatre_assignment: {},
            formations: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            assignable_front_segments: [],
            brigade_front_assignment: {},
            militia_pools: {},
            war_militia_strength: {},
            war_jna: { transition_begun: false, withdrawal_progress: 0, asset_transfer_rs: 0 },
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
            closed_event_ids: [],
            event_causality_log: [],
            pending_event_decisions: [],
            pending_event_notifications: [],
            phantoms_spawned: [],
        },
        political: {
            political_controllers: {},
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
            ceasefire: {},
            negotiation_ledger: [],
            supply_rights: { corridors: [] },
            municipalities: {},
            war_consolidation_until: {},
            war_control_strain: {},
            war_supply_pressure: {},
            war_supply_condition: {},
            war_exhaustion: {},
            war_exhaustion_local: {},
        },
        displacement: {
            displacement_state: {},
            civilian_casualties: {},
            war_displacement_initiated: {},
            hostile_takeover_timers: {},
            displacement_camp_state: {},
            minority_flight_state: {},
            settlement_displacement: {},
            settlement_displacement_started_turn: {},
            municipality_displacement: {},
            displacement_event_log: [],
            sustainability_state: {},
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
        },
    };
}

describe('save migration validator hardening', () => {
    it('rejects a current-version save missing a required-as-of-version field', () => {
        const state = currentVersionState();
        delete state.political.negotiation_status;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v4[\s\S]*political\.negotiation_status/
        );
    });

    it('rejects a current-version save missing military army CO decision traces', () => {
        const state = currentVersionState();
        delete state.military.army_co_decision_traces;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v10[\s\S]*military\.army_co_decision_traces/
        );
    });

    it('rejects a current-version save missing military army corps directives by faction', () => {
        const state = currentVersionState();
        delete state.military.army_corps_directives_by_faction;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v10[\s\S]*military\.army_corps_directives_by_faction/
        );
    });

    it('rejects a current-version save missing military event decision log', () => {
        const state = currentVersionState();
        delete state.military.event_decision_log;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v14[\s\S]*military\.event_decision_log/
        );
    });

    it.each([
        ['fired_event_ids', 15],
        ['event_readiness', 15],
        ['event_fire_counts', 15],
        ['event_last_fired_turn', 15],
        ['event_flags', 15],
        ['enabled_event_ids', 15],
    ])('rejects a current-version save missing military event bookkeeping substrate %s', (field, version) => {
        const state = currentVersionState();
        delete state.military[field];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            new RegExp(`Save schema validation failed after migration[\\s\\S]*v${version}[\\s\\S]*military\\.${field}`)
        );
    });

    it('rejects a current-version save missing displacement event log', () => {
        const state = currentVersionState();
        delete state.displacement.displacement_event_log;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v7[\s\S]*displacement\.displacement_event_log/
        );
    });

    it.each([
        ['war_consolidation_until', 6],
        ['war_control_strain', 6],
        ['war_supply_pressure', 7],
        ['war_supply_condition', 7],
        ['war_exhaustion', 7],
        ['war_exhaustion_local', 7],
    ])('rejects a current-version save missing political war substrate record %s', (field, version) => {
        const state = currentVersionState();
        delete state.political[field];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            new RegExp(`Save schema validation failed after migration[\\s\\S]*v${version}[\\s\\S]*political\\.${field}`)
        );
    });

    it.each([
        'displacement_humanitarian_aggregates',
        'displacement_origin_dest_arrivals',
        'displacement_recent_by_turn',
    ])('rejects a current-version save missing displacement aggregate record %s', (field) => {
        const state = currentVersionState();
        delete state.displacement[field];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            new RegExp(`Save schema validation failed after migration[\\s\\S]*v8[\\s\\S]*displacement\\.${field}`)
        );
    });

    it.each([
        ['war_displacement_initiated', 17],
        ['hostile_takeover_timers', 17],
        ['displacement_camp_state', 17],
    ])('rejects a current-version save missing displacement operational substrate %s', (field, version) => {
        const state = currentVersionState();
        delete state.displacement[field];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            new RegExp(`Save schema validation failed after migration[\\s\\S]*v${version}[\\s\\S]*displacement\\.${field}`)
        );
    });

    it.each([
        ['war_displacement_initiated', []],
        ['hostile_takeover_timers', null],
        ['displacement_camp_state', []],
    ])('rejects a current-version save with invalid displacement operational substrate %s', (field, value) => {
        const state = currentVersionState();
        state.displacement[field] = value;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            new RegExp(`Save schema validation failed after migration[\\s\\S]*v17[\\s\\S]*displacement\\.${field}`)
        );
    });

    it.each([
        'displacement_state',
        'minority_flight_state',
        'sustainability_state',
    ])('rejects a current-version save missing displacement lazy map %s', (field) => {
        const state = currentVersionState();
        delete state.displacement[field];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            new RegExp(`Save schema validation failed after migration[\\s\\S]*v18[\\s\\S]*displacement\\.${field}`)
        );
    });

    it.each([
        ['displacement_state', []],
        ['minority_flight_state', null],
        ['sustainability_state', []],
    ])('rejects a current-version save with invalid displacement lazy map %s', (field, value) => {
        const state = currentVersionState();
        state.displacement[field] = value;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            new RegExp(`Save schema validation failed after migration[\\s\\S]*v18[\\s\\S]*displacement\\.${field}`)
        );
    });

    it('rejects a current-version save missing displacement civilian casualties', () => {
        const state = currentVersionState();
        delete state.displacement.civilian_casualties;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v19[\s\S]*displacement\.civilian_casualties/
        );
    });

    it('rejects a current-version save with non-object displacement civilian casualties', () => {
        const state = currentVersionState();
        state.displacement.civilian_casualties = [];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v19[\s\S]*displacement\.civilian_casualties/
        );
    });

    it.each([
        ['missing killed', { fled_abroad: 0 }],
        ['missing fled_abroad', { killed: 0 }],
        ['negative killed', { killed: -1, fled_abroad: 0 }],
        ['negative fled_abroad', { killed: 0, fled_abroad: -1 }],
        ['non-finite killed', { killed: Number.POSITIVE_INFINITY, fled_abroad: 0 }],
        ['non-numeric fled_abroad', { killed: 0, fled_abroad: '0' }],
    ])('rejects a current-version save with malformed displacement civilian casualties entry: %s', (_name, entry) => {
        const state = currentVersionState();
        state.displacement.civilian_casualties = { RBiH: entry };

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v19[\s\S]*displacement\.civilian_casualties/
        );
    });

    it('rejects a current-version save missing nested displacement lazy maps even with legacy top-level residue', () => {
        const state = currentVersionState();
        delete state.displacement.displacement_state;
        delete state.displacement.minority_flight_state;
        delete state.displacement.sustainability_state;
        state.displacement_state = { legacy_mun: { original_population: 10, displaced_out: 0, displaced_in: 0, lost_population: 0 } };
        state.minority_flight_state = { legacy_sid: { settlement_id: 'legacy_sid', flight_turn: 1 } };
        state.sustainability_state = { legacy_mun: { mun_id: 'legacy_mun', sustainability_score: 1, collapsed: false } };

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v18[\s\S]*displacement\.displacement_state/
        );
    });

    it.each([
        'settlement_displacement',
        'settlement_displacement_started_turn',
        'municipality_displacement',
    ])('rejects a current-version save missing Phase F displacement capacity record %s', (field) => {
        const state = currentVersionState();
        delete state.displacement[field];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            new RegExp(`Save schema validation failed after migration[\\s\\S]*v16[\\s\\S]*displacement\\.${field}`)
        );
    });

    it('rejects a current-version save missing nested Phase F capacity maps even with legacy top-level residue', () => {
        const state = currentVersionState();
        delete state.displacement.settlement_displacement;
        state.settlement_displacement = { legacy_sid: 0.1 };

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v16[\s\S]*displacement\.settlement_displacement/
        );
    });

    it('rejects a current-version save missing nested displacement operational maps even with legacy top-level residue', () => {
        const state = currentVersionState();
        delete state.displacement.hostile_takeover_timers;
        state.hostile_takeover_timers = { legacy_osid: { mun_id: 'legacy', from_faction: 'RBiH', to_faction: 'RS', started_turn: 1 } };

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v17[\s\S]*displacement\.hostile_takeover_timers/
        );
    });

    it.each([
        ['displacement_humanitarian_aggregates', []],
        ['displacement_origin_dest_arrivals', []],
        ['displacement_recent_by_turn', null],
    ])('rejects a current-version save with invalid displacement aggregate record %s', (field, value) => {
        const state = currentVersionState();
        state.displacement[field] = value;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            new RegExp(`Save schema validation failed after migration[\\s\\S]*v8[\\s\\S]*displacement\\.${field}`)
        );
    });

    it('migrates a v1 save before applying current-version required-field validation', () => {
        const state = currentVersionState();
        state.schema_version = 1;
        delete state.meta.referendum_held;
        delete state.political.negotiation_status;
        delete state.military.army_co_decision_traces;
        delete state.military.army_corps_directives_by_faction;
        delete state.military.event_decision_log;
        delete state.military.fired_event_ids;
        delete state.military.event_readiness;
        delete state.military.event_fire_counts;
        delete state.military.event_last_fired_turn;
        delete state.military.event_flags;
        delete state.military.enabled_event_ids;
        delete state.military.event_overflow_queue;
        delete state.military.event_aggression_modifiers;
        delete state.military.recruitment_modifiers;
        delete state.military.equipment_quality_modifiers;
        delete state.military.pending_event_decisions;
        delete state.military.pending_event_notifications;
        delete state.displacement.displacement_event_log;
        delete state.displacement.war_displacement_initiated;
        delete state.displacement.hostile_takeover_timers;
        delete state.displacement.displacement_camp_state;
        delete state.displacement.displacement_state;
        delete state.displacement.minority_flight_state;
        delete state.displacement.sustainability_state;
        delete state.displacement.civilian_casualties;
        delete state.displacement.displacement_humanitarian_aggregates;
        delete state.displacement.displacement_origin_dest_arrivals;
        delete state.displacement.displacement_recent_by_turn;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.meta.referendum_held).toBe(false);
        expect(migrated.political.negotiation_status).toEqual({
            ceasefire_active: false,
            ceasefire_since_turn: null,
            last_offer_turn: null,
            last_counter_turn: {},
        });
        expect(migrated.military.army_co_decision_traces).toEqual({});
        expect(migrated.military.army_corps_directives_by_faction).toEqual({});
        expect(migrated.military.event_decision_log).toEqual([]);
        expect(migrated.military.fired_event_ids).toEqual([]);
        expect(migrated.military.event_readiness).toEqual({});
        expect(migrated.military.event_fire_counts).toEqual({});
        expect(migrated.military.event_last_fired_turn).toEqual({});
        expect(migrated.military.event_flags).toEqual({});
        expect(migrated.military.enabled_event_ids).toEqual([]);
        expect(migrated.military.event_overflow_queue).toEqual([]);
        expect(migrated.military.event_aggression_modifiers).toEqual([]);
        expect(migrated.military.recruitment_modifiers).toEqual([]);
        expect(migrated.military.equipment_quality_modifiers).toEqual([]);
        expect(migrated.military.pending_event_decisions).toEqual([]);
        expect(migrated.military.pending_event_notifications).toEqual([]);
        expect(migrated.displacement.displacement_event_log).toEqual([]);
        expect(migrated.displacement.war_displacement_initiated).toEqual({});
        expect(migrated.displacement.hostile_takeover_timers).toEqual({});
        expect(migrated.displacement.displacement_camp_state).toEqual({});
        expect(migrated.displacement.displacement_state).toEqual({});
        expect(migrated.displacement.minority_flight_state).toEqual({});
        expect(migrated.displacement.sustainability_state).toEqual({});
        expect(migrated.displacement.civilian_casualties).toEqual({});
        expect(migrated.displacement.displacement_humanitarian_aggregates).toEqual({});
        expect(migrated.displacement.displacement_origin_dest_arrivals).toEqual({});
        expect(migrated.displacement.displacement_recent_by_turn).toEqual({});
    });

    it('materializes v16 Phase F displacement capacity records for v15 saves', () => {
        const state = currentVersionState();
        state.schema_version = 15;
        delete state.displacement.settlement_displacement;
        delete state.displacement.settlement_displacement_started_turn;
        delete state.displacement.municipality_displacement;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.displacement.settlement_displacement).toEqual({});
        expect(migrated.displacement.settlement_displacement_started_turn).toEqual({});
        expect(migrated.displacement.municipality_displacement).toEqual({});
    });

    it('rescues legacy top-level Phase F capacity maps for v15 saves before v16 validation', () => {
        const state = currentVersionState();
        state.schema_version = 15;
        delete state.displacement.settlement_displacement;
        delete state.displacement.settlement_displacement_started_turn;
        delete state.displacement.municipality_displacement;
        state.settlement_displacement = { legacy_sid: 0.1 };
        state.settlement_displacement_started_turn = { legacy_sid: 2 };
        state.municipality_displacement = { legacy_mun: 0.2 };

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.displacement.settlement_displacement).toEqual({ legacy_sid: 0.1 });
        expect(migrated.displacement.settlement_displacement_started_turn).toEqual({ legacy_sid: 2 });
        expect(migrated.displacement.municipality_displacement).toEqual({ legacy_mun: 0.2 });
    });

    it('materializes v17 displacement operational records for v16 saves', () => {
        const state = currentVersionState();
        state.schema_version = 16;
        delete state.displacement.war_displacement_initiated;
        delete state.displacement.hostile_takeover_timers;
        delete state.displacement.displacement_camp_state;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.displacement.war_displacement_initiated).toEqual({});
        expect(migrated.displacement.hostile_takeover_timers).toEqual({});
        expect(migrated.displacement.displacement_camp_state).toEqual({});
    });

    it('rescues legacy top-level displacement operational records for v16 saves before v17 validation', () => {
        const state = currentVersionState();
        state.schema_version = 16;
        delete state.displacement.war_displacement_initiated;
        delete state.displacement.hostile_takeover_timers;
        delete state.displacement.displacement_camp_state;
        state.war_displacement_initiated = { legacy_mun: 4 };
        state.hostile_takeover_timers = {
            legacy_osid: { mun_id: 'legacy_mun', from_faction: 'RBiH', to_faction: 'RS', started_turn: 2 },
        };
        state.displacement_camp_state = {
            legacy_mun: { mun_id: 'legacy_mun', population: 12, started_turn: 2 },
        };

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.displacement.war_displacement_initiated).toEqual({ legacy_mun: 4 });
        expect(migrated.displacement.hostile_takeover_timers).toEqual({
            legacy_osid: { mun_id: 'legacy_mun', from_faction: 'RBiH', to_faction: 'RS', started_turn: 2 },
        });
        expect(migrated.displacement.displacement_camp_state).toEqual({
            legacy_mun: { mun_id: 'legacy_mun', population: 12, started_turn: 2 },
        });
    });

    it('materializes v18 displacement lazy maps for v17 saves', () => {
        const state = currentVersionState();
        state.schema_version = 17;
        delete state.displacement.displacement_state;
        delete state.displacement.minority_flight_state;
        delete state.displacement.sustainability_state;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.displacement.displacement_state).toEqual({});
        expect(migrated.displacement.minority_flight_state).toEqual({});
        expect(migrated.displacement.sustainability_state).toEqual({});
    });

    it('rescues legacy top-level displacement lazy maps for v17 saves before v18 validation', () => {
        const state = currentVersionState();
        state.schema_version = 17;
        delete state.displacement.displacement_state;
        delete state.displacement.minority_flight_state;
        delete state.displacement.sustainability_state;
        state.displacement_state = { legacy_mun: { original_population: 10, displaced_out: 0, displaced_in: 0, lost_population: 0 } };
        state.minority_flight_state = { legacy_sid: { settlement_id: 'legacy_sid', flight_turn: 1 } };
        state.sustainability_state = { legacy_mun: { mun_id: 'legacy_mun', sustainability_score: 1, collapsed: false } };

        const migrated = deserializeState(JSON.stringify(state)) as any;

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.displacement.displacement_state).toEqual({
            legacy_mun: { original_population: 10, displaced_out: 0, displaced_in: 0, lost_population: 0 },
        });
        expect(migrated.displacement.minority_flight_state).toEqual({
            legacy_sid: { settlement_id: 'legacy_sid', flight_turn: 1 },
        });
        expect(migrated.displacement.sustainability_state).toEqual({
            legacy_mun: { mun_id: 'legacy_mun', sustainability_score: 1, collapsed: false },
        });
        expect(Object.prototype.hasOwnProperty.call(migrated, 'displacement_state')).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(migrated, 'minority_flight_state')).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(migrated, 'sustainability_state')).toBe(false);
    });

    it('materializes v19 civilian casualties for v18 saves', () => {
        const state = currentVersionState();
        state.schema_version = 18;
        delete state.displacement.civilian_casualties;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.displacement.civilian_casualties).toEqual({});
    });

    it('materializes v20 phantom-spawn markers for v19 saves', () => {
        const state = currentVersionState();
        state.schema_version = 19;
        delete state.military.phantoms_spawned;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.phantoms_spawned).toEqual([]);
    });

    it('preserves v19 phantom-spawn marker order and contents', () => {
        const state = currentVersionState();
        state.schema_version = 19;
        state.military.phantoms_spawned = ['jna_phantom_b', 'jna_phantom_a', 'jna_phantom_b'];

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.phantoms_spawned).toEqual(['jna_phantom_b', 'jna_phantom_a', 'jna_phantom_b']);
    });

    it('rejects current-version saves missing phantom-spawn markers', () => {
        const state = currentVersionState();
        delete state.military.phantoms_spawned;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v20[\s\S]*military\.phantoms_spawned/
        );
    });

    it('rejects current-version saves with malformed phantom-spawn markers', () => {
        const state = currentVersionState();
        state.military.phantoms_spawned = ['valid', 42];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v20[\s\S]*military\.phantoms_spawned/
        );
    });

    it('materializes v21 paramilitary decision history for v20 saves', () => {
        const state = currentVersionState();
        state.schema_version = 20;
        delete state.paramilitary_decision_history;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.paramilitary_decision_history).toEqual([]);
    });

    it('rejects current-version saves missing paramilitary decision history', () => {
        const state = currentVersionState();
        delete state.paramilitary_decision_history;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v21[\s\S]*paramilitary_decision_history/
        );
    });

    it('rejects current-version saves with malformed paramilitary decision history', () => {
        const state = currentVersionState();
        state.paramilitary_decision_history = {};

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v21[\s\S]*paramilitary_decision_history/
        );
    });

    it('materializes v22 event overflow queue for v21 saves', () => {
        const state = currentVersionState();
        state.schema_version = 21;
        delete state.military.event_overflow_queue;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.event_overflow_queue).toEqual([]);
    });

    it('rejects current-version saves missing event overflow queue', () => {
        const state = currentVersionState();
        delete state.military.event_overflow_queue;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v22[\s\S]*military\.event_overflow_queue/
        );
    });

    it('rejects current-version saves with malformed event overflow queue', () => {
        const state = currentVersionState();
        state.military.event_overflow_queue = ['valid_event', 42];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v22[\s\S]*military\.event_overflow_queue/
        );
    });

    it('materializes v23 pending event notifications for v22 saves', () => {
        const state = currentVersionState();
        state.schema_version = 22;
        delete state.military.pending_event_notifications;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.pending_event_notifications).toEqual([]);
    });

    it('rejects current-version saves missing pending event notifications', () => {
        const state = currentVersionState();
        delete state.military.pending_event_notifications;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v23[\s\S]*military\.pending_event_notifications/
        );
    });

    it('rejects current-version saves with malformed pending event notifications', () => {
        const state = currentVersionState();
        state.military.pending_event_notifications = {};

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v23[\s\S]*military\.pending_event_notifications/
        );
    });

    it('materializes v24 pending event decisions for v23 saves', () => {
        const state = currentVersionState();
        state.schema_version = 23;
        delete state.military.pending_event_decisions;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.pending_event_decisions).toEqual([]);
    });

    it('rejects current-version saves missing pending event decisions', () => {
        const state = currentVersionState();
        delete state.military.pending_event_decisions;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v24[\s\S]*military\.pending_event_decisions/
        );
    });

    it('rejects current-version saves with malformed pending event decisions', () => {
        const state = currentVersionState();
        state.military.pending_event_decisions = {};

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v24[\s\S]*military\.pending_event_decisions/
        );
    });

    it('rejects current-version saves with malformed pending event decision response options', () => {
        const state = currentVersionState();
        state.military.pending_event_decisions = [{
            event_id: 'rbih_state_identity',
            event_title: 'What Is Bosnia?',
            turn_fired: 2,
            response_options: [42],
            faction: 'RBiH',
            requires_player_response: true,
        }];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.pending_event_decisions\[0\]\.response_options\[0\] must be an object/
        );
    });

    it('rejects current-version saves with empty pending event decision response options', () => {
        const state = currentVersionState();
        state.military.pending_event_decisions = [{
            event_id: 'rbih_state_identity',
            event_title: 'What Is Bosnia?',
            turn_fired: 2,
            response_options: [],
            faction: 'RBiH',
            requires_player_response: true,
        }];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.pending_event_decisions\[0\]\.response_options must not be empty/
        );
    });

    it('rejects current-version saves with duplicate pending event decision response ids', () => {
        const state = currentVersionState();
        state.military.pending_event_decisions = [{
            event_id: 'rbih_state_identity',
            event_title: 'What Is Bosnia?',
            turn_fired: 2,
            response_options: [
                { id: 'same', label: 'First' },
                { id: 'same', label: 'Second' },
            ],
            faction: 'RBiH',
            requires_player_response: true,
        }];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.pending_event_decisions\[0\]\.response_options\[1\]\.id must be unique within response_options: same/
        );
    });

    it('rejects current-version saves with malformed pending event decision response effects', () => {
        const state = currentVersionState();
        state.military.pending_event_decisions = [{
            event_id: 'rbih_state_identity',
            event_title: 'What Is Bosnia?',
            turn_fired: 2,
            response_options: [{ id: 'civic', label: 'Civic multi-ethnic republic', effects: [42] }],
            faction: 'RBiH',
            requires_player_response: true,
        }];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.pending_event_decisions\[0\]\.response_options\[0\]\.effects\[0\] must be an object with a non-empty kind/
        );
    });

    it('rejects current-version saves with pending event historical defaults missing from response options', () => {
        const state = currentVersionState();
        state.military.pending_event_decisions = [{
            event_id: 'rbih_state_identity',
            event_title: 'What Is Bosnia?',
            turn_fired: 2,
            response_options: [{ id: 'civic', label: 'Civic multi-ethnic republic' }],
            faction: 'RBiH',
            requires_player_response: true,
            historical_default_response_id: 'missing',
        }];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.pending_event_decisions\[0\]\.historical_default_response_id must match a response option id/
        );
    });

    it('rejects current-version saves with pending event staff recommendations missing from response options', () => {
        const state = currentVersionState();
        state.military.pending_event_decisions = [{
            event_id: 'visit_to_front_rbih',
            event_title: 'Visit to the Front',
            turn_fired: 84,
            response_options: [{ id: 'stay_capital_rbih', label: 'Stay in Sarajevo' }],
            faction: 'RBiH',
            requires_player_response: true,
            staff_recommended_response_id: 'missing',
        }];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.pending_event_decisions\[0\]\.staff_recommended_response_id must match a response option id/
        );
    });

    it('materializes v25 event modifiers for v24 saves', () => {
        const state = currentVersionState();
        state.schema_version = 24;
        delete state.military.event_aggression_modifiers;
        delete state.military.recruitment_modifiers;
        delete state.military.equipment_quality_modifiers;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.event_aggression_modifiers).toEqual([]);
        expect(migrated.military.recruitment_modifiers).toEqual([]);
        expect(migrated.military.equipment_quality_modifiers).toEqual([]);
    });

    it('rejects current-version saves missing event aggression modifiers', () => {
        const state = currentVersionState();
        delete state.military.event_aggression_modifiers;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v25[\s\S]*military\.event_aggression_modifiers/
        );
    });

    it('rejects current-version saves missing recruitment modifiers', () => {
        const state = currentVersionState();
        delete state.military.recruitment_modifiers;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v25[\s\S]*military\.recruitment_modifiers/
        );
    });

    it('rejects current-version saves missing equipment quality modifiers', () => {
        const state = currentVersionState();
        delete state.military.equipment_quality_modifiers;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v25[\s\S]*military\.equipment_quality_modifiers/
        );
    });

    it('rejects current-version saves with malformed event modifiers', () => {
        const state = currentVersionState();
        state.military.event_aggression_modifiers = {};
        state.military.recruitment_modifiers = [{ faction: 'RBiH', pool_multiplier: 'bad', expires_turn: 1 }];
        state.military.equipment_quality_modifiers = [{ faction: 'JNA', multiplier: 1.1, expires_turn: -1 }];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.event_aggression_modifiers[\s\S]*military\.recruitment_modifiers\[0\]\.pool_multiplier must be a finite number[\s\S]*military\.equipment_quality_modifiers\[0\]\.faction must be one of: RBiH, RS, HRHB[\s\S]*military\.equipment_quality_modifiers\[0\]\.expires_turn must be a non-negative integer/
        );
    });

    it('materializes v26 cost ledger annotations for v25 saves', () => {
        const state = currentVersionState();
        state.schema_version = 25;
        delete state.military.cost_ledger_annotations;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.cost_ledger_annotations).toEqual([]);
    });

    it('rejects current-version saves missing cost ledger annotations', () => {
        const state = currentVersionState();
        delete state.military.cost_ledger_annotations;

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*v26[\s\S]*military\.cost_ledger_annotations/
        );
    });

    it('rejects current-version saves with malformed cost ledger annotations', () => {
        const state = currentVersionState();
        state.military.cost_ledger_annotations = [
            { event_id: '', tag: 7, text: 42, turn: -1, faction: 'JNA' },
            42,
        ];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.cost_ledger_annotations\[0\]\.event_id must be a non-empty string[\s\S]*military\.cost_ledger_annotations\[0\]\.tag must be a non-empty string[\s\S]*military\.cost_ledger_annotations\[0\]\.turn must be a non-negative integer[\s\S]*military\.cost_ledger_annotations\[0\]\.text must be a string when present[\s\S]*military\.cost_ledger_annotations\[0\]\.faction must be one of: RBiH, RS, HRHB[\s\S]*military\.cost_ledger_annotations\[1\] must be an object/
        );
    });

    it('materializes v27 convoy decision queues for v26 saves', () => {
        const state = currentVersionState();
        state.schema_version = 26;
        delete state.military.pending_convoy_decisions;
        delete state.military.convoy_decision_history;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.pending_convoy_decisions).toEqual([]);
        expect(migrated.military.convoy_decision_history).toEqual([]);
    });

    it('rejects current-version saves missing convoy decision queues', () => {
        const missingPending = currentVersionState();
        delete missingPending.military.pending_convoy_decisions;
        const missingHistory = currentVersionState();
        delete missingHistory.military.convoy_decision_history;

        expect(() => deserializeState(JSON.stringify(missingPending))).toThrow(
            /Save schema validation failed after migration[\s\S]*v27[\s\S]*military\.pending_convoy_decisions/
        );
        expect(() => deserializeState(JSON.stringify(missingHistory))).toThrow(
            /Save schema validation failed after migration[\s\S]*v27[\s\S]*military\.convoy_decision_history/
        );
    });

    it('rejects current-version saves with malformed convoy decision queues', () => {
        const state = currentVersionState();
        state.military.pending_convoy_decisions = [
            { id: '', target_enclave: 42, route_faction: 'JNA', supply_amount: -1, decision: 'approve' },
            42,
        ];
        state.military.convoy_decision_history = [
            { id: '', turn: 1.5, target_enclave: '', route_faction: 'JNA', target_faction: 'UN', supply_amount: Number.POSITIVE_INFINITY, decision: 'approve', decided_by: 'staff' },
            42,
        ];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.pending_convoy_decisions\[0\]\.id must be a non-empty string[\s\S]*military\.pending_convoy_decisions\[0\]\.route_faction must be one of: RBiH, RS, HRHB[\s\S]*military\.pending_convoy_decisions\[1\] must be an object[\s\S]*military\.convoy_decision_history\[0\]\.turn must be a non-negative integer[\s\S]*military\.convoy_decision_history\[0\]\.decided_by must be one of: player, bot[\s\S]*military\.convoy_decision_history\[1\] must be an object/
        );
    });

    it('materializes v28 reserve request queues for v27 saves', () => {
        const state = currentVersionState();
        state.schema_version = 27;
        delete state.military.pending_reserve_requests;
        delete state.military.reserve_request_history;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.pending_reserve_requests).toEqual([]);
        expect(migrated.military.reserve_request_history).toEqual([]);
    });

    it('preserves v27 reserve request queue order and contents', () => {
        const state = currentVersionState();
        state.schema_version = 27;
        state.military.pending_reserve_requests = [
            {
                request_id: 'reserve:req-b',
                corps_id: 'arbih_1st_corps',
                faction: 'RBiH',
                reason: 'offensive_support',
                priority: 80,
                raw_priority: 90,
                travel_hops: 2,
                turn_requested: 12,
                description: 'Support the active operation.',
                suggested_brigade_id: 'arbih_guards',
            },
            {
                request_id: 'reserve:req-a',
                corps_id: 'arbih_2nd_corps',
                faction: 'RBiH',
                reason: 'defensive_gap',
                priority: 60,
                raw_priority: 70,
                travel_hops: 1,
                turn_requested: 13,
                description: 'Reinforce a thin sector.',
                suggested_brigade_id: null,
            },
        ];
        state.military.reserve_request_history = [
            {
                request_id: 'reserve:hist-b',
                turn: 14,
                faction: 'RBiH',
                corps_id: 'arbih_1st_corps',
                brigade_id: 'arbih_guards',
                outcome: 'accepted',
                reason: 'Approved for immediate deployment.',
                decided_by: 'player',
                purpose: 'offensive',
                why_needed: 'Exploit the breach.',
                how_to_use: 'Commit as the main effort.',
            },
            {
                request_id: 'reserve:hist-a',
                turn: 15,
                faction: 'RS',
                corps_id: 'vrs_1st_krajina',
                brigade_id: null,
                outcome: 'declined',
                reason: 'No suitable brigade available.',
                decided_by: 'army_ai',
                purpose: 'defensive',
                why_needed: 'Hold a threatened sector.',
                how_to_use: 'Stiffen the line.',
            },
        ];

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.pending_reserve_requests?.map((request) => request.request_id)).toEqual(['reserve:req-b', 'reserve:req-a']);
        expect(migrated.military.reserve_request_history?.map((record) => record.request_id)).toEqual(['reserve:hist-b', 'reserve:hist-a']);
    });

    it('rejects current-version saves missing reserve request queues', () => {
        const missingPending = currentVersionState();
        delete missingPending.military.pending_reserve_requests;
        const missingHistory = currentVersionState();
        delete missingHistory.military.reserve_request_history;

        expect(() => deserializeState(JSON.stringify(missingPending))).toThrow(
            /Save schema validation failed after migration[\s\S]*v28[\s\S]*military\.pending_reserve_requests/
        );
        expect(() => deserializeState(JSON.stringify(missingHistory))).toThrow(
            /Save schema validation failed after migration[\s\S]*v28[\s\S]*military\.reserve_request_history/
        );
    });

    it('rejects current-version saves with malformed reserve request queues', () => {
        const state = currentVersionState();
        state.military.pending_reserve_requests = [
            {
                request_id: '',
                corps_id: 42,
                faction: 'JNA',
                reason: 'panic',
                priority: Number.POSITIVE_INFINITY,
                raw_priority: '90',
                travel_hops: -1,
                turn_requested: 1.5,
                description: '',
                suggested_brigade_id: 42,
                purpose: 'urgent',
            },
            42,
        ];
        state.military.reserve_request_history = [
            {
                request_id: '',
                turn: -1,
                faction: 'JNA',
                corps_id: '',
                brigade_id: 42,
                outcome: 'approved',
                reason: '',
                decided_by: 'staff',
                purpose: 'urgent',
                why_needed: 42,
                how_to_use: '',
            },
            42,
        ];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.pending_reserve_requests\[0\]\.corps_id must be a non-empty string[\s\S]*military\.pending_reserve_requests\[0\]\.faction must be one of: RBiH, RS, HRHB[\s\S]*military\.pending_reserve_requests\[0\]\.reason must be one of: offensive_support, defensive_gap, exploitation, enclave_relief[\s\S]*military\.pending_reserve_requests\[0\]\.priority must be a finite number[\s\S]*military\.pending_reserve_requests\[0\]\.travel_hops must be a non-negative integer[\s\S]*military\.pending_reserve_requests\[1\] must be an object[\s\S]*military\.reserve_request_history\[0\]\.turn must be a non-negative integer[\s\S]*military\.reserve_request_history\[0\]\.outcome must be one of: accepted, declined, terminated[\s\S]*military\.reserve_request_history\[0\]\.decided_by must be one of: army_ai, player[\s\S]*military\.reserve_request_history\[1\] must be an object/
        );
    });

    it('materializes v29 triggered-operation bookkeeping records for v28 saves', () => {
        const state = currentVersionState();
        state.schema_version = 28;
        delete state.military.triggered_operations_accepted;
        delete state.military.declined_operations;
        delete state.military.used_operation_names;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.triggered_operations_accepted).toEqual({});
        expect(migrated.military.declined_operations).toEqual({});
        expect(migrated.military.used_operation_names).toEqual({});
    });

    it('preserves v28 triggered-operation bookkeeping records', () => {
        const state = currentVersionState();
        state.schema_version = 28;
        state.military.triggered_operations_accepted = {
            'Operation B': 12,
            'Operation A': 9,
        };
        state.military.declined_operations = {
            'Operation D': { declined_turn: 13, decline_count: 2 },
            'Operation C': { declined_turn: 8, decline_count: 1 },
        };
        state.military.used_operation_names = {
            'Name B': 11,
            'Name A': 10,
        };

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(Object.keys(migrated.military.triggered_operations_accepted ?? {})).toEqual(['Operation B', 'Operation A']);
        expect(migrated.military.triggered_operations_accepted).toEqual({
            'Operation B': 12,
            'Operation A': 9,
        });
        expect(Object.keys(migrated.military.declined_operations ?? {})).toEqual(['Operation D', 'Operation C']);
        expect(migrated.military.declined_operations).toEqual({
            'Operation D': { declined_turn: 13, decline_count: 2 },
            'Operation C': { declined_turn: 8, decline_count: 1 },
        });
        expect(Object.keys(migrated.military.used_operation_names ?? {})).toEqual(['Name B', 'Name A']);
        expect(migrated.military.used_operation_names).toEqual({
            'Name B': 11,
            'Name A': 10,
        });
    });

    it('rejects current-version saves missing triggered-operation bookkeeping records', () => {
        const missingAccepted = currentVersionState();
        delete missingAccepted.military.triggered_operations_accepted;
        const missingDeclined = currentVersionState();
        delete missingDeclined.military.declined_operations;
        const missingNames = currentVersionState();
        delete missingNames.military.used_operation_names;

        expect(() => deserializeState(JSON.stringify(missingAccepted))).toThrow(
            /Save schema validation failed after migration[\s\S]*v29[\s\S]*military\.triggered_operations_accepted/
        );
        expect(() => deserializeState(JSON.stringify(missingDeclined))).toThrow(
            /Save schema validation failed after migration[\s\S]*v29[\s\S]*military\.declined_operations/
        );
        expect(() => deserializeState(JSON.stringify(missingNames))).toThrow(
            /Save schema validation failed after migration[\s\S]*v29[\s\S]*military\.used_operation_names/
        );
    });

    it('rejects current-version saves with malformed triggered-operation bookkeeping records', () => {
        const state = currentVersionState();
        state.military.triggered_operations_accepted = {
            ok: 1,
            negative: -1,
            fractional: 1.5,
        };
        state.military.declined_operations = {
            ok: { declined_turn: 2, decline_count: 1 },
            negative: { declined_turn: -1, decline_count: 1 },
            missing: { declined_turn: 2 },
            non_object: 3,
        };
        state.military.used_operation_names = {
            ok: 3,
            bad: '3',
        };

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.triggered_operations_accepted\.negative must be a non-negative integer[\s\S]*military\.triggered_operations_accepted\.fractional must be a non-negative integer[\s\S]*military\.declined_operations\.negative\.declined_turn must be a non-negative integer[\s\S]*military\.declined_operations\.missing\.decline_count must be a non-negative integer[\s\S]*military\.declined_operations\.non_object must be an object[\s\S]*military\.used_operation_names\.bad must be a non-negative integer/
        );
    });

    it('materializes v30 officer decision queues for v29 saves', () => {
        const state = currentVersionState();
        state.schema_version = 29;
        delete state.military.pending_officer_events;
        delete state.military.officer_decision_history;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.pending_officer_events).toEqual([]);
        expect(migrated.military.officer_decision_history).toEqual([]);
    });

    it('rejects current-version saves missing officer decision queues', () => {
        const missingPending = currentVersionState();
        delete missingPending.military.pending_officer_events;
        const missingHistory = currentVersionState();
        delete missingHistory.military.officer_decision_history;

        expect(() => deserializeState(JSON.stringify(missingPending))).toThrow(
            /Save schema validation failed after migration[\s\S]*v30[\s\S]*military\.pending_officer_events/
        );
        expect(() => deserializeState(JSON.stringify(missingHistory))).toThrow(
            /Save schema validation failed after migration[\s\S]*v30[\s\S]*military\.officer_decision_history/
        );
    });

    it('rejects current-version saves with malformed pending officer events', () => {
        const state = currentVersionState();
        state.military.pending_officer_events = [
            {
                event_id: '',
                type: 'unknown_event',
                faction: 'JNA',
                turn: -1,
                officer_id: '',
                current_commander_id: '',
                corps_id: '',
                acknowledged: 'no',
                reason: 42,
                overridable: 'yes',
                override_action: 7,
                original_order: {
                    order_type: 'invalid_order',
                    corps_id: 42,
                    stance: 7,
                    objectives: ['ok', 7],
                    delay_turns: -1,
                },
                interpreted_order: 42,
            },
            42,
        ];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.pending_officer_events\[0\]\.event_id must be a non-empty string[\s\S]*military\.pending_officer_events\[0\]\.type must be a known OfficerEventType[\s\S]*military\.pending_officer_events\[0\]\.faction must be one of: RBiH, RS, HRHB[\s\S]*military\.pending_officer_events\[0\]\.turn must be a non-negative integer[\s\S]*military\.pending_officer_events\[0\]\.officer_id must be a non-empty string[\s\S]*military\.pending_officer_events\[0\]\.acknowledged must be boolean[\s\S]*military\.pending_officer_events\[0\]\.current_commander_id must be a non-empty string when present[\s\S]*military\.pending_officer_events\[0\]\.corps_id must be a non-empty string when present[\s\S]*military\.pending_officer_events\[0\]\.reason must be a string when present[\s\S]*military\.pending_officer_events\[0\]\.overridable must be boolean when present[\s\S]*military\.pending_officer_events\[0\]\.override_action must be a string when present[\s\S]*military\.pending_officer_events\[0\]\.original_order\.order_type must be a valid order_type[\s\S]*military\.pending_officer_events\[0\]\.original_order\.corps_id must be a string[\s\S]*military\.pending_officer_events\[0\]\.original_order\.stance must be a string when present[\s\S]*military\.pending_officer_events\[0\]\.original_order\.objectives must be a string array when present[\s\S]*military\.pending_officer_events\[0\]\.original_order\.delay_turns must be a non-negative integer when present[\s\S]*military\.pending_officer_events\[0\]\.interpreted_order must be an object[\s\S]*military\.pending_officer_events\[1\] must be an object/
        );
    });

    it('rejects current-version saves with malformed officer decision history', () => {
        const state = currentVersionState();
        state.military.officer_decision_history = [
            {
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
            },
            42,
        ];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.officer_decision_history\[0\]\.id must be a non-empty string[\s\S]*military\.officer_decision_history\[0\]\.event_id must be a non-empty string[\s\S]*military\.officer_decision_history\[0\]\.event_type must be a non-empty string[\s\S]*military\.officer_decision_history\[0\]\.officer_id must be a non-empty string[\s\S]*military\.officer_decision_history\[0\]\.turn must be a non-negative integer[\s\S]*military\.officer_decision_history\[0\]\.faction must be one of: RBiH, RS, HRHB[\s\S]*military\.officer_decision_history\[0\]\.decision must be one of: acknowledged, override_confirmed, replacement_accepted[\s\S]*military\.officer_decision_history\[0\]\.current_commander_id must be a non-empty string when present[\s\S]*military\.officer_decision_history\[0\]\.corps_id must be a non-empty string when present[\s\S]*military\.officer_decision_history\[0\]\.new_officer_id must be a non-empty string when present[\s\S]*military\.officer_decision_history\[0\]\.outgoing_officer_id must be a non-empty string when present[\s\S]*military\.officer_decision_history\[1\] must be an object/
        );
    });

    it('materializes v31 consequence runtime effect queues for v30 saves', () => {
        const state = currentVersionState();
        state.schema_version = 30;
        delete state.military.cascade_penalties;
        delete state.military.offensive_ops_suppressions;
        delete state.military.alliance_locks;
        delete state.military.bot_priority_shifts;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.cascade_penalties).toEqual([]);
        expect(migrated.military.offensive_ops_suppressions).toEqual([]);
        expect(migrated.military.alliance_locks).toEqual([]);
        expect(migrated.military.bot_priority_shifts).toEqual([]);
    });

    it('preserves v30 consequence runtime effect queue order and contents', () => {
        const state = currentVersionState();
        state.schema_version = 30;
        state.military.cascade_penalties = [
            { osid: 'op:banja_luka:west', multiplier: 0.85, expires_turn: 178 },
            { osid: 'op:kljuc:center', multiplier: 0.9, expires_turn: 179 },
        ];
        state.military.offensive_ops_suppressions = [
            { faction: 'RS', expires_turn: 180, reason: 'holbrooke_halt' },
            { faction: 'RBiH', expires_turn: 181 },
        ];
        state.military.alliance_locks = [
            { mode: 'floor', value: 0.8, expires_turn: 120 },
            { mode: 'ceiling', value: 0.55, expires_turn: 90 },
        ];
        state.military.bot_priority_shifts = [
            { faction: 'RBiH', add_objectives: ['obj_b', 'obj_a'], expires_turn: 170 },
            { faction: 'HRHB', remove_objectives: ['obj_c'], expires_turn: 171 },
        ];

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.cascade_penalties?.map((entry) => entry.osid)).toEqual(['op:banja_luka:west', 'op:kljuc:center']);
        expect(migrated.military.offensive_ops_suppressions?.map((entry) => entry.faction)).toEqual(['RS', 'RBiH']);
        expect(migrated.military.alliance_locks?.map((entry) => entry.mode)).toEqual(['floor', 'ceiling']);
        expect(migrated.military.bot_priority_shifts?.map((entry) => entry.faction)).toEqual(['RBiH', 'HRHB']);
        expect(migrated.military.bot_priority_shifts?.[0].add_objectives).toEqual(['obj_b', 'obj_a']);
    });

    it('rejects current-version saves missing consequence runtime effect queues', () => {
        const missingCascade = currentVersionState();
        delete missingCascade.military.cascade_penalties;
        const missingSuppressions = currentVersionState();
        delete missingSuppressions.military.offensive_ops_suppressions;
        const missingLocks = currentVersionState();
        delete missingLocks.military.alliance_locks;
        const missingShifts = currentVersionState();
        delete missingShifts.military.bot_priority_shifts;

        expect(() => deserializeState(JSON.stringify(missingCascade))).toThrow(
            /Save schema validation failed after migration[\s\S]*v31[\s\S]*military\.cascade_penalties/
        );
        expect(() => deserializeState(JSON.stringify(missingSuppressions))).toThrow(
            /Save schema validation failed after migration[\s\S]*v31[\s\S]*military\.offensive_ops_suppressions/
        );
        expect(() => deserializeState(JSON.stringify(missingLocks))).toThrow(
            /Save schema validation failed after migration[\s\S]*v31[\s\S]*military\.alliance_locks/
        );
        expect(() => deserializeState(JSON.stringify(missingShifts))).toThrow(
            /Save schema validation failed after migration[\s\S]*v31[\s\S]*military\.bot_priority_shifts/
        );
    });

    it('rejects current-version saves with malformed consequence runtime effect queues', () => {
        const state = currentVersionState();
        state.military.cascade_penalties = [
            { osid: '', multiplier: Number.POSITIVE_INFINITY, expires_turn: -1 },
            42,
        ];
        state.military.offensive_ops_suppressions = [
            { faction: 'JNA', expires_turn: 1.5, reason: 7 },
            42,
        ];
        state.military.alliance_locks = [
            { mode: 'middle', value: Number.NaN, expires_turn: -1 },
            42,
        ];
        state.military.bot_priority_shifts = [
            { faction: 'UN', add_objectives: ['ok', 7], remove_objectives: 'bad', expires_turn: -1 },
            42,
        ];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.cascade_penalties\[0\]\.osid must be a non-empty string[\s\S]*military\.cascade_penalties\[0\]\.multiplier must be a finite number[\s\S]*military\.cascade_penalties\[0\]\.expires_turn must be a non-negative integer[\s\S]*military\.cascade_penalties\[1\] must be an object[\s\S]*military\.offensive_ops_suppressions\[0\]\.faction must be one of: RBiH, RS, HRHB[\s\S]*military\.offensive_ops_suppressions\[0\]\.expires_turn must be a non-negative integer[\s\S]*military\.offensive_ops_suppressions\[0\]\.reason must be a string when present[\s\S]*military\.offensive_ops_suppressions\[1\] must be an object[\s\S]*military\.alliance_locks\[0\]\.mode must be one of: floor, ceiling[\s\S]*military\.alliance_locks\[0\]\.value must be a finite number[\s\S]*military\.alliance_locks\[0\]\.expires_turn must be a non-negative integer[\s\S]*military\.alliance_locks\[1\] must be an object[\s\S]*military\.bot_priority_shifts\[0\]\.faction must be one of: RBiH, RS, HRHB[\s\S]*military\.bot_priority_shifts\[0\]\.add_objectives must be a string array when present[\s\S]*military\.bot_priority_shifts\[0\]\.remove_objectives must be a string array when present[\s\S]*military\.bot_priority_shifts\[0\]\.expires_turn must be a non-negative integer[\s\S]*military\.bot_priority_shifts\[1\] must be an object/
        );
    });

    it('accepts current-version saves with absent event constraints', () => {
        const state = currentVersionState();
        delete state.military.event_constraints;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.event_constraints).toBeUndefined();
    });

    it('accepts current-version saves with well-formed event constraints', () => {
        const state = currentVersionState();
        state.military.event_constraints = {
            operation_blocks: [
                { faction: 'RS', expires_turn: 20, reason: 'ceasefire' },
            ],
            doctrine_overrides: [
                { faction: 'RBiH', forced_stance: 'defensive', expires_turn: 21, reason: 'UN pressure' },
            ],
            scope_restrictions: [
                {
                    faction: 'HRHB',
                    allowed_municipalities: ['Mostar'],
                    blocked_municipalities: ['Bugojno'],
                    expires_turn: 22,
                    reason: 'corridor limit',
                },
                {
                    faction: 'RS',
                    blocked_municipalities: ['Sarajevo'],
                    reason: 'open-ended restriction',
                },
            ],
        };

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.event_constraints?.operation_blocks?.[0].reason).toBe('ceasefire');
        expect(migrated.military.event_constraints?.scope_restrictions?.[1].expires_turn).toBeUndefined();
    });

    it('rejects current-version saves with malformed event constraints', () => {
        const state = currentVersionState();
        state.military.event_constraints = {
            operation_blocks: [
                { faction: 'JNA', expires_turn: -1, reason: 7 },
                42,
            ],
            doctrine_overrides: [
                { faction: 'RS', forced_stance: '', expires_turn: 1.5, reason: '' },
                42,
            ],
            scope_restrictions: [
                {
                    faction: 'UN',
                    allowed_municipalities: ['ok', 7],
                    blocked_municipalities: 'bad',
                    expires_turn: -1,
                    reason: 42,
                },
                42,
            ],
        };

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.event_constraints\.operation_blocks\[0\]\.faction must be one of: RBiH, RS, HRHB[\s\S]*military\.event_constraints\.operation_blocks\[0\]\.expires_turn must be a non-negative integer[\s\S]*military\.event_constraints\.operation_blocks\[0\]\.reason must be a non-empty string[\s\S]*military\.event_constraints\.operation_blocks\[1\] must be an object[\s\S]*military\.event_constraints\.doctrine_overrides\[0\]\.expires_turn must be a non-negative integer[\s\S]*military\.event_constraints\.doctrine_overrides\[0\]\.reason must be a non-empty string[\s\S]*military\.event_constraints\.doctrine_overrides\[0\]\.forced_stance must be a non-empty string[\s\S]*military\.event_constraints\.doctrine_overrides\[1\] must be an object[\s\S]*military\.event_constraints\.scope_restrictions\[0\]\.faction must be one of: RBiH, RS, HRHB[\s\S]*military\.event_constraints\.scope_restrictions\[0\]\.allowed_municipalities must be a string array when present[\s\S]*military\.event_constraints\.scope_restrictions\[0\]\.blocked_municipalities must be a string array when present[\s\S]*military\.event_constraints\.scope_restrictions\[0\]\.expires_turn must be a non-negative integer when present[\s\S]*military\.event_constraints\.scope_restrictions\[0\]\.reason must be a non-empty string[\s\S]*military\.event_constraints\.scope_restrictions\[1\] must be an object/
        );
    });

    it('rejects current-version saves with non-object or non-array event constraints members', () => {
        const nonObject = currentVersionState();
        nonObject.military.event_constraints = [];
        const nonArrayMember = currentVersionState();
        nonArrayMember.military.event_constraints = {
            operation_blocks: {},
            doctrine_overrides: {},
            scope_restrictions: {},
        };

        expect(() => deserializeState(JSON.stringify(nonObject))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.event_constraints must be an object when present/
        );
        expect(() => deserializeState(JSON.stringify(nonArrayMember))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.event_constraints\.operation_blocks must be an array when present[\s\S]*military\.event_constraints\.doctrine_overrides must be an array when present[\s\S]*military\.event_constraints\.scope_restrictions must be an array when present/
        );
    });

    it('accepts current-version saves with absent patron defiance supply cuts', () => {
        const state = currentVersionState();
        delete state.military.patron_defiance_supply_cuts;

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.patron_defiance_supply_cuts).toBeUndefined();
    });

    it('accepts current-version saves with well-formed patron defiance supply cuts', () => {
        const state = currentVersionState();
        state.military.patron_defiance_supply_cuts = [
            { faction: 'RS', turn: 30, cut_fraction: 0.2, support_after: 0.6 },
            { faction: 'HRHB', turn: 44, cut_fraction: 1, support_after: 0 },
        ];

        const migrated = deserializeState(JSON.stringify(state));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.military.patron_defiance_supply_cuts?.map((cut: any) => cut.faction)).toEqual(['RS', 'HRHB']);
    });

    it('rejects current-version saves with malformed patron defiance supply cuts', () => {
        const state = currentVersionState();
        state.military.patron_defiance_supply_cuts = [
            { faction: 'JNA', turn: -1, cut_fraction: 0, support_after: 1.5 },
            { faction: 'RS', turn: 1.5, cut_fraction: Number.POSITIVE_INFINITY, support_after: Number.NaN },
            42,
        ];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.patron_defiance_supply_cuts\[0\]\.faction must be one of: RBiH, RS, HRHB[\s\S]*military\.patron_defiance_supply_cuts\[0\]\.turn must be a non-negative integer[\s\S]*military\.patron_defiance_supply_cuts\[0\]\.cut_fraction must be > 0 and <= 1[\s\S]*military\.patron_defiance_supply_cuts\[0\]\.support_after must be a finite number in \[0,1\][\s\S]*military\.patron_defiance_supply_cuts\[1\]\.turn must be a non-negative integer[\s\S]*military\.patron_defiance_supply_cuts\[1\]\.cut_fraction must be > 0 and <= 1[\s\S]*military\.patron_defiance_supply_cuts\[1\]\.support_after must be a finite number in \[0,1\][\s\S]*military\.patron_defiance_supply_cuts\[2\] must be an object/
        );
    });

    it('rejects current-version saves with non-array patron defiance supply cuts', () => {
        const state = currentVersionState();
        state.military.patron_defiance_supply_cuts = {};

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.patron_defiance_supply_cuts must be an array when present/
        );
    });

    it('accepts current-version saves with absent or well-formed airdrop allocations', () => {
        const absent = currentVersionState();
        delete absent.military.airdrop_allocation;
        const withAllocation = currentVersionState();
        withAllocation.military.airdrop_allocation = {
            gorazde: 0.75,
            srebrenica: 0.25,
        };

        const migratedAbsent = deserializeState(JSON.stringify(absent));
        const migratedWithAllocation = deserializeState(JSON.stringify(withAllocation));

        expect(migratedAbsent.military.airdrop_allocation).toBeUndefined();
        expect(migratedWithAllocation.military.airdrop_allocation).toEqual({
            gorazde: 0.75,
            srebrenica: 0.25,
        });
    });

    it('rejects current-version saves with malformed airdrop allocations', () => {
        const state = currentVersionState();
        state.military.airdrop_allocation = {
            ok: 0,
            negative: -1,
            infinite: Number.POSITIVE_INFINITY,
            text: '1',
        };

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.airdrop_allocation\.negative must be a finite non-negative number[\s\S]*military\.airdrop_allocation\.infinite must be a finite non-negative number[\s\S]*military\.airdrop_allocation\.text must be a finite non-negative number/
        );
    });

    it('rejects current-version saves with non-record airdrop allocations', () => {
        const state = currentVersionState();
        state.military.airdrop_allocation = [];

        expect(() => deserializeState(JSON.stringify(state))).toThrow(
            /Save schema validation failed after migration[\s\S]*military\.airdrop_allocation must be an object when present/
        );
    });
});
