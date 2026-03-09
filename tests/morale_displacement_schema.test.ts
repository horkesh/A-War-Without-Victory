/**
 * Phase M1: Morale and displacement event log schema tests.
 * - morale field defaults to 60 on migration, clamped to [0, 100].
 * - displacement_event_log defaults to [] on migration.
 * - Round-trip preserves morale and displacement events.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import type { GameState, FormationState, DisplacementEvent } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';

/** Minimal fixture with one formation and displacement state. */
function minimalFixture(overrides?: {
    morale?: number | undefined;
    events?: DisplacementEvent[];
}): any {
    const formation: any = {
        id: 'test_bde_1',
        faction: 'RBiH',
        name: 'Test Brigade',
        created_turn: 0,
        status: 'active',
        assignment: null,
        cohesion: 60,
        personnel: 1000,
        kind: 'brigade',
        readiness: 'active',
        location_osid: 'op:tuzla:tuzla_2'
    };
    if (overrides?.morale !== undefined) {
        formation.morale = overrides.morale;
    }

    const state: any = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'morale-test',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 4,
            war_start_turn: 5,
            referendum_eligible_turn: null,
            referendum_deadline_turn: null,
            game_over: false,
            outcome: undefined
        },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 5 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                prewar_capital: 70,
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null
            }
        ],
        formations: { test_bde_1: formation },
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {}
    };

    if (overrides?.events !== undefined) {
        state.displacement.displacement_event_log = overrides.events;
    }

    return state;
}

test('morale defaults to 60 when missing', () => {
    const raw = minimalFixture(); // no morale set
    const migrated = deserializeState(serializeState(raw));
    const f = migrated.military.formations['test_bde_1'];
    assert.strictEqual(f.morale, 60, 'morale should default to 60');
});

test('morale round-trips correctly', () => {
    const raw = minimalFixture({ morale: 75 });
    const migrated = deserializeState(serializeState(raw));
    const f = migrated.military.formations['test_bde_1'];
    assert.strictEqual(f.morale, 75, 'morale 75 should survive round-trip');
});

test('morale clamped to 100 when above range', () => {
    const raw = minimalFixture({ morale: 150 });
    const migrated = deserializeState(serializeState(raw));
    const f = migrated.military.formations['test_bde_1'];
    assert.strictEqual(f.morale, 100, 'morale should be clamped to 100');
});

test('morale clamped to 0 when below range', () => {
    const raw = minimalFixture({ morale: -10 });
    const migrated = deserializeState(serializeState(raw));
    const f = migrated.military.formations['test_bde_1'];
    assert.strictEqual(f.morale, 0, 'morale should be clamped to 0');
});

test('displacement_event_log defaults to empty array', () => {
    const raw = minimalFixture(); // no event log set
    const migrated = deserializeState(serializeState(raw));
    assert.ok(Array.isArray(migrated.displacement.displacement_event_log), 'displacement_event_log should be array');
    assert.strictEqual(migrated.displacement.displacement_event_log!.length, 0, 'should be empty by default');
});

test('displacement_event_log round-trips with events', () => {
    const events: DisplacementEvent[] = [
        {
            turn: 5,
            origin_mun: 'prijedor',
            origin_osid: 'op:prijedor:prijedor_2',
            dest_mun: 'travnik',
            dest_osid: 'op:travnik:travnik_2',
            ethnicity: 'RBiH',
            displaced: 500,
            killed: 50,
            fled_abroad: 0,
            settled: 450
        },
        {
            turn: 7,
            origin_mun: 'bijeljina',
            dest_mun: 'tuzla',
            ethnicity: 'RBiH',
            displaced: 300,
            killed: 30,
            fled_abroad: 0,
            settled: 270
        }
    ];
    const raw = minimalFixture({ events });
    const migrated = deserializeState(serializeState(raw));
    assert.strictEqual(migrated.displacement.displacement_event_log!.length, 2, 'should preserve 2 events');
    assert.strictEqual(migrated.displacement.displacement_event_log![0].origin_mun, 'prijedor');
    assert.strictEqual(migrated.displacement.displacement_event_log![0].displaced, 500);
    assert.strictEqual(migrated.displacement.displacement_event_log![1].turn, 7);
    assert.strictEqual(migrated.displacement.displacement_event_log![1].ethnicity, 'RBiH');
});

test('morale enclave initialization value (70) round-trips', () => {
    const raw = minimalFixture({ morale: 70 });
    const migrated = deserializeState(serializeState(raw));
    const f = migrated.military.formations['test_bde_1'];
    assert.strictEqual(f.morale, 70, 'enclave morale 70 should survive round-trip');
});
