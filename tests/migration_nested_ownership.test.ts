import assert from 'node:assert';
import { test } from 'node:test';

import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { deserializeState } from '../src/state/serialize.js';

function migrationFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 5,
            seed: 'migration-fixture',
            referendum_held: false,
            referendum_turn: null,
            war_start_turn: null,
            peace_scheduled_referendum_turn: null,
            peace_scheduled_war_start_turn: null,
            peace_war_start_control_path: null,
            referendum_eligible_turn: null,
            referendum_deadline_turn: null,
            game_over: false,
        },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 },
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
                profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 },
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
        },
        political: {
            political_controllers: {},
            municipalities: {},
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
            ceasefire: {},
            negotiation_ledger: [],
            supply_rights: { corridors: [] },
        },
        displacement: {
            displacement_event_log: [],
        },
        ...overrides,
    };
}

test('migrateState canonicalizes nested military and political owner fields directly', () => {
    const payload = JSON.stringify(migrationFixture({
        military: {
            formations: {},
            front_segments: {},
            front_posture: { ARBiH: { assignments: {} } },
            front_posture_regions: { ARBiH: { assignments: {} } },
            front_pressure: {},
            militia_pools: {
                'mun1:ARBiH': {
                    mun_id: 'mun1',
                    faction: 'ARBiH',
                    available: 1,
                    committed: 0,
                    exhausted: 0,
                    updated_turn: 0,
                },
            },
            theatres: {},
            army_theatre_assignment: {},
            assignable_front_segments: [],
            brigade_front_assignment: {},
        },
        political: {
            political_controllers: {},
            municipalities: {},
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
            ceasefire: {},
            negotiation_ledger: [
                { id: 'n2', faction_id: 'RS', turn: 2, type: 'gain', amount: 2, reason: 'y' },
                { id: 'n1', faction_id: 'ARBiH', turn: 1, type: 'spend', amount: 1, reason: 'x' },
            ],
            supply_rights: {
                corridors: [
                    { id: 'c2', treaty_id: 't2', beneficiary: 'ARBiH', scope: { kind: 'region', region_id: 'r2' }, since_turn: 2, until_turn: null },
                    { id: 'c1', treaty_id: 't1', beneficiary: 'RS', scope: { kind: 'region', region_id: 'r1' }, since_turn: 1, until_turn: null },
                ],
            },
        },
    }));

    const hydrated = deserializeState(payload);

    assert.deepStrictEqual(Object.keys(hydrated.military.front_posture), ['RBiH']);
    assert.deepStrictEqual(Object.keys(hydrated.military.front_posture_regions), ['RBiH']);

    const militiaPool = hydrated.military.militia_pools['mun1:ARBiH'] as any;
    assert.strictEqual(militiaPool.faction, 'RBiH');
    assert.strictEqual(militiaPool.fatigue, 0);

    assert.deepStrictEqual(
        hydrated.political.negotiation_ledger?.map((entry: any) => entry.faction_id),
        ['RS', 'RBiH']
    );
    assert.deepStrictEqual(
        hydrated.political.supply_rights?.corridors.map((corridor: any) => `${corridor.id}:${corridor.beneficiary}`),
        ['c1:RS', 'c2:RBiH']
    );
});

test('migrateState materializes missing nested Phase I sibling defaults at the canonical owners', () => {
    const payload = JSON.stringify(migrationFixture({
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
            war_militia_strength: { m1: { RBiH: 10 } },
        },
        political: {
            political_controllers: {},
            municipalities: {},
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
            ceasefire: {},
            negotiation_ledger: [],
            supply_rights: { corridors: [] },
            war_consolidation_until: { m1: 3 },
        },
        displacement: {
            displacement_event_log: [],
            war_displacement_initiated: { m1: 4 },
        },
    }));

    const hydrated = deserializeState(payload);

    assert.deepStrictEqual(hydrated.military.war_militia_strength, { m1: { RBiH: 10 } });
    assert.deepStrictEqual(hydrated.political.war_consolidation_until, { m1: 3 });
    assert.deepStrictEqual(hydrated.displacement.war_displacement_initiated, { m1: 4 });
    assert.deepStrictEqual(hydrated.political.war_control_strain, {});
    assert.deepStrictEqual(hydrated.military.war_jna, {
        transition_begun: false,
        withdrawal_progress: 0,
        asset_transfer_rs: 0,
    });
});

test('migrateState materializes missing nested Phase F sibling defaults under displacement', () => {
    const payload = JSON.stringify(migrationFixture({
        displacement: {
            displacement_event_log: [],
            settlement_displacement: { SID_001: 0.25 },
        },
    }));

    const hydrated = deserializeState(payload);

    assert.deepStrictEqual(hydrated.displacement.settlement_displacement, { SID_001: 0.25 });
    assert.deepStrictEqual(hydrated.displacement.settlement_displacement_started_turn, {});
    assert.deepStrictEqual(hydrated.displacement.municipality_displacement, {});
});

test('migrateState rescues legacy top-level residue into nested owners before defaulting', () => {
    const payload = JSON.stringify({
        ...migrationFixture({
            political: {
                political_controllers: {},
                negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
                ceasefire: {},
            },
            displacement: {
                displacement_event_log: [],
            },
        }),
        negotiation_ledger: [
            { id: 'n1', faction_id: 'ARBiH', turn: 1, type: 'spend', amount: 1, reason: 'x' },
        ],
        supply_rights: {
            corridors: [
                { id: 'c1', treaty_id: 't1', beneficiary: 'ARBiH', scope: { kind: 'region', region_id: 'r1' }, since_turn: 1, until_turn: null },
            ],
        },
        settlement_displacement: { SID_009: 0.4 },
        municipality_displacement: { mun9: 0.2 },
    });

    const hydrated = deserializeState(payload) as any;

    assert.deepStrictEqual(hydrated.political.negotiation_ledger.map((entry: any) => entry.faction_id), ['RBiH']);
    assert.deepStrictEqual(hydrated.political.supply_rights.corridors.map((corridor: any) => corridor.beneficiary), ['RBiH']);
    assert.deepStrictEqual(hydrated.displacement.settlement_displacement, { SID_009: 0.4 });
    assert.deepStrictEqual(hydrated.displacement.municipality_displacement, { mun9: 0.2 });
    assert.ok(!Object.prototype.hasOwnProperty.call(hydrated, 'negotiation_ledger'));
    assert.ok(!Object.prototype.hasOwnProperty.call(hydrated, 'supply_rights'));
    assert.ok(!Object.prototype.hasOwnProperty.call(hydrated, 'settlement_displacement'));
});
