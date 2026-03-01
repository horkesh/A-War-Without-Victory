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

