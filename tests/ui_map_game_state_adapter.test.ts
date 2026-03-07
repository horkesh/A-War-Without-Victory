import assert from 'node:assert';
import { test } from 'node:test';

import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';

test('parseGameState extracts deterministic order lists and events', () => {
    const parsed = parseGameState({
        meta: { turn: 7, phase: 'war' },
        formations: {
            b2: { faction: 'RS', name: 'B2', kind: 'brigade', readiness: 'active', cohesion: 60, status: 'active', created_turn: 1, tags: [] },
            b1: { faction: 'RBiH', name: 'B1', kind: 'brigade', readiness: 'active', cohesion: 70, status: 'active', created_turn: 1, tags: [] }
        },
        brigade_attack_orders: [
            { brigade_id: 'b2', target_settlement_id: 'S3' },
            { brigade_id: 'b1', target_settlement_id: 'S1' }
        ],
        brigade_movement_orders: {
            b2: { destination_sids: ['S4', 'S3'] },
            b1: { destination_sids: ['S2'] }
        },
        control_events: [
            { turn: 7, settlement_id: 'S2', from: 'RS', to: 'RBiH', mechanism: 'phase_ii_attack', mun_id: 'foo' },
            { turn: 6, settlement_id: 'S1', from: null, to: 'RS', mechanism: 'war', mun_id: 'bar' }
        ],
        political_controllers: { S1: 'RBiH' }
    });

    assert.strictEqual(parsed.attackOrders.length, 2);
    assert.strictEqual(parsed.attackOrders[0].brigadeId, 'b1');
    assert.strictEqual(parsed.movementOrdersSettlement?.[0]?.brigadeId, 'b1');
    assert.deepStrictEqual(parsed.movementOrdersSettlement?.[0]?.targetSettlementIds, ['S2']);
    assert.strictEqual(parsed.recentControlEvents.length, 2);
    assert.strictEqual(parsed.recentControlEvents[0].turn, 6);
});

test('parseGameState preserves meta.player_faction in LoadedGameState', () => {
    const parsed = parseGameState({
        meta: { turn: 1, phase: 'war', player_faction: 'RS' },
        formations: {},
        political_controllers: {}
    });
    assert.strictEqual(parsed.player_faction, 'RS');
});

test('parseGameState extracts canonical front edge and pressure views', () => {
    const parsed = parseGameState({
        meta: { turn: 11, phase: 'war' },
        formations: {},
        political_controllers: {},
        front_edges: [
            { a: 'S2', b: 'S1', side_a: 'RS', side_b: 'RBiH' },
            { edge_id: 'S3__S4', a: 'S3', b: 'S4', side_a: 'RBiH', side_b: 'HRHB' }
        ],
        war_front_edges_osid: [
            { a: 'op:a', b: 'op:b', side_a: 'RS', side_b: 'RBiH' }
        ],
        front_pressure: {
            S1__S2: { edge_id: 'S1__S2', value: -3, max_abs: 9, last_updated_turn: 11 }
        },
        brigade_front_assignment: {
            b1: 'RBiH__RS__S1__S2',
            b2: null,
        },
        army_theatre_assignment: {
            army_rbih: 'RBiH_default',
        },
        theatres: {
            RBiH_default: { id: 'RBiH_default', name: 'RBiH Theatre', faction: 'RBiH', army_ids: ['army_rbih'] },
        },
        assignable_front_segments: [
            { front_id: 'RBiH__RS__S1__S2', edge_ids: ['S1__S2'], side_a: 'RBiH', side_b: 'RS', length_edges: 1 }
        ],
    });
    assert.ok(parsed.frontEdges && parsed.frontEdges.length === 2);
    assert.strictEqual(parsed.frontEdges?.[0]?.edge_id, 'S1__S2');
    assert.ok(parsed.frontEdgesOsid && parsed.frontEdgesOsid.length === 1);
    assert.strictEqual(parsed.frontEdgesOsid?.[0]?.edge_id, 'op:a__op:b');
    assert.strictEqual(parsed.frontPressureByEdge?.S1__S2?.value, -3);
    assert.strictEqual(parsed.brigadeFrontAssignment?.b1, 'RBiH__RS__S1__S2');
    assert.strictEqual(parsed.brigadeFrontAssignment?.b2, null);
    assert.strictEqual(parsed.armyTheatreAssignment?.army_rbih, 'RBiH_default');
    assert.strictEqual(parsed.theatres?.RBiH_default?.faction, 'RBiH');
    assert.ok(parsed.assignableFrontSegments && parsed.assignableFrontSegments.length === 1);
    assert.strictEqual(parsed.assignableFrontSegments?.[0]?.front_id, 'RBiH__RS__S1__S2');
});

test('parseGameState treats phase_ii as war for formation location_osid', () => {
    const parsed = parseGameState({
        meta: { turn: 5, phase: 'phase_ii' },
        formations: {
            b1: { id: 'b1', faction: 'RS', name: 'B1', kind: 'brigade', location_osid: 'op:mun:xyz', tags: [] },
        },
        political_controllers: {},
    });
    assert.strictEqual(parsed.phase, 'phase_ii');
    assert.strictEqual(parsed.formations.length, 1);
    assert.strictEqual(parsed.formations[0].location_osid, 'op:mun:xyz');
    assert.deepStrictEqual(parsed.formations[0].aorSettlementIds, ['op:mun:xyz']);
});

test('parseGameState accepts formations as array', () => {
    const parsed = parseGameState({
        meta: { turn: 1, phase: 'war' },
        formations: [
            { id: 'f1', faction: 'RBiH', name: 'F1', kind: 'brigade', tags: [] },
            { id: 'f2', faction: 'RS', name: 'F2', kind: 'brigade', tags: [] },
        ],
        political_controllers: {},
    });
    assert.strictEqual(parsed.formations.length, 2);
    assert.strictEqual(parsed.formations[0].id, 'f1');
    assert.strictEqual(parsed.formations[1].id, 'f2');
});

test('parseGameState unwraps { state: GameState } wrapper', () => {
    const parsed = parseGameState({
        state: {
            meta: { turn: 3, phase: 'war' },
            formations: {},
            political_controllers: {},
        },
    });
    assert.strictEqual(parsed.turn, 3);
    assert.strictEqual(parsed.phase, 'war');
});

test('parseGameState throws clear error when meta.turn is missing', () => {
    assert.throws(
        () => parseGameState({ meta: {}, formations: {}, political_controllers: {} }),
        /meta\.turn must be a number/
    );
});

test('parseGameState derives enclave, mobilization, and sector entrenchment summaries', () => {
    const parsed = parseGameState({
        meta: { turn: 16, phase: 'war', player_faction: 'RBiH' },
        formations: {
            rbih_corps: { id: 'rbih_corps', faction: 'RBiH', name: '1st Corps', kind: 'corps', tags: [] },
            b1: {
                id: 'b1',
                faction: 'RBiH',
                corps_id: 'rbih_corps',
                name: '1st Brigade',
                kind: 'brigade',
                location_osid: 'op:gorazde:gorazde_2',
                entrenchment_turns: 4,
                dig_in_progress: 0.6,
                posture: 'dig_in',
                tags: ['mun:gorazde'],
            },
            b2: {
                id: 'b2',
                faction: 'RBiH',
                corps_id: 'rbih_corps',
                name: '2nd Brigade',
                kind: 'brigade',
                location_osid: 'op:gorazde:gorazde_3',
                entrenchment_turns: 2,
                dig_in_progress: 0.2,
                posture: 'hold',
                tags: ['mun:gorazde'],
            },
        },
        political_controllers: {
            'op:gorazde:gorazde_2': 'RBiH',
            'op:gorazde:gorazde_3': 'RBiH',
        },
        militia_pools: {
            gorazde: { faction: 'RBiH', available: 1200, committed: 300, exhausted: 100, fatigue: 0 },
            'gorazde:HRHB': { faction: 'HRHB', available: 50, committed: 20, exhausted: 10, fatigue: 0 },
            sarajevo: { faction: 'RBiH', available: 2000, committed: 500, exhausted: 250, fatigue: 0 },
        },
        strategic_reserves: {
            RBiH: 9000,
            HRHB: 1200,
        },
        corps_front_sectors: {
            rbih_sector_1: {
                sector_id: 'rbih_sector_1',
                corps_id: 'rbih_corps',
                faction: 'RBiH',
                opposing_factions: ['RS'],
                edge_ids: ['op:gorazde:gorazde_2__op:rs:foe_1'],
                sub_segments: [{ friendly_osids: ['op:gorazde:gorazde_2', 'op:gorazde:gorazde_3'], enemy_osids: ['op:rs:foe_1'] }],
                assigned_brigade_ids: ['b1', 'b2'],
                reserve_brigade_ids: [],
                density: 1.1,
                threat_ratio: 0.9,
                defensive_power: 500,
            },
        },
        enclave_resilience: {
            gorazde: { resilience: 9, isolation_turns: 5, hardening_active: false },
            sarajevo: { resilience: 12, isolation_turns: 9, hardening_active: true },
        },
        supply_state_by_osid: {
            factions: [
                {
                    faction_id: 'RBiH',
                    by_osid: [
                        { osid: 'op:gorazde:gorazde_2', state: 'critical' },
                        { osid: 'op:gorazde:gorazde_3', state: 'strained' },
                        { osid: 'op:centar_sarajevo:centar_1', state: 'strained' },
                    ],
                },
            ],
        },
    });

    assert.equal(parsed.enclaveResilience?.gorazde?.supply_state, 'critical');
    assert.equal(parsed.enclaveResilience?.gorazde?.airdrop_status, 'receiving');
    assert.equal(parsed.enclaveResilience?.gorazde?.faction, 'RBiH');
    assert.equal(parsed.enclaveResilience?.sarajevo?.hardening_active, true);

    assert.equal(parsed.mobilizationSummary?.RBiH?.total_available, 3200);
    assert.equal(parsed.mobilizationSummary?.RBiH?.total_committed, 800);
    assert.equal(parsed.mobilizationSummary?.RBiH?.total_exhausted, 350);
    assert.equal(parsed.mobilizationSummary?.RBiH?.strategic_reserve, 9000);
    assert.equal(parsed.mobilizationSummary?.RBiH?.top_pools[0]?.mun_id, 'sarajevo');

    assert.equal(parsed.sectorEntrenchmentSummary?.rbih_sector_1?.avgEntrenchment, 3);
    assert.equal(parsed.sectorEntrenchmentSummary?.rbih_sector_1?.avgDigIn, 0.4);
    assert.equal(parsed.sectorEntrenchmentSummary?.rbih_sector_1?.digInCount, 1);
    assert.equal(parsed.sectorEntrenchmentSummary?.rbih_sector_1?.totalCount, 2);
});

test('parseGameState derives operation readiness and offensive metadata', () => {
    const parsed = parseGameState({
        meta: { turn: 16, phase: 'war', player_faction: 'RBiH' },
        formations: {
            rbih_corps: { id: 'rbih_corps', faction: 'RBiH', name: '1st Corps', kind: 'corps', tags: [] },
            b1: { id: 'b1', faction: 'RBiH', corps_id: 'rbih_corps', name: '1st Brigade', kind: 'brigade', cohesion: 80, personnel: 2000, tags: [] },
            b2: { id: 'b2', faction: 'RBiH', corps_id: 'rbih_corps', name: '2nd Brigade', kind: 'brigade', cohesion: 60, personnel: 1500, tags: [] },
        },
        political_controllers: {},
        corps_front_sectors: {
            rbih_sector_1: {
                sector_id: 'rbih_sector_1',
                corps_id: 'rbih_corps',
                faction: 'RBiH',
                opposing_factions: ['RS'],
                edge_ids: [],
                sub_segments: [],
                assigned_brigade_ids: ['b1', 'b2'],
                reserve_brigade_ids: ['b3'],
                density: 1.2,
                threat_ratio: 0.8,
                defensive_power: 500,
            },
        },
        sector_intel: {
            rbih_sector_1: [
                { enemy_sector_id: 'rs_sector_1', confidence: 0.65, strength_category: 'dense', posture_observed: 'defensive', offensive_signs: false, turns_in_contact: 3, visible_brigade_ids: [], last_updated_turn: 16 },
            ],
        },
        corps_command: {
            rbih_corps: {
                active_operation: {
                    name: 'Operation Drina',
                    type: 'sector_attack',
                    phase: 'planning',
                    sector_id: 'rbih_sector_1',
                    participating_brigades: ['b1', 'b2'],
                    objectives: ['op:drina:1'],
                    current_objective_index: 0,
                    started_turn: 14,
                    phase_started_turn: 15,
                    supply_readiness: 0.75,
                    min_attack_outcome: 'costly_victory',
                    tempo: 'all_out',
                    schwerpunkt_osid: 'op:drina:1',
                    artillery_preparation: true,
                    consecutive_failures_on_current: 1,
                },
            },
        },
    });

    const operation = parsed.operations?.[0];
    assert.ok(operation);
    assert.equal(operation?.min_attack_outcome, 'costly_victory');
    assert.equal(operation?.tempo, 'all_out');
    assert.equal(operation?.schwerpunkt_osid, 'op:drina:1');
    assert.equal(operation?.artillery_preparation, true);
    assert.equal(operation?.readiness?.supply, 0.75);
    assert.equal(operation?.readiness?.intel, 0.65);
    assert.equal(operation?.avg_cohesion, 70);
    assert.equal(operation?.avg_personnel_pct, 0.7);
});

test('parseGameState exposes municipality support orders for the player faction UI', () => {
    const parsed = parseGameState({
        meta: { turn: 9, phase: 'war', player_faction: 'RBiH' },
        formations: {},
        political_controllers: {},
        municipality_support_orders: {
            RBiH: {
                faction: 'RBiH',
                mun_id: 'gorazde',
                type: 'weapons_shipment',
                staged_turn: 9,
            }
        }
    });

    assert.equal(parsed.municipalitySupportOrders?.RBiH?.mun_id, 'gorazde');
    assert.equal(parsed.municipalitySupportOrders?.RBiH?.type, 'weapons_shipment');
    assert.equal(parsed.municipalitySupportOrders?.RBiH?.label, 'Weapons shipment');
});
