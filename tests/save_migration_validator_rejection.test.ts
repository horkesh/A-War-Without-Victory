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
});
