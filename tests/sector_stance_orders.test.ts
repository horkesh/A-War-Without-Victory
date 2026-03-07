import { describe, expect, it } from 'vitest';
import { applySectorStanceOrders } from '../src/sim/combat/sector_stance_orders.js';
import type { FactionId, FormationState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeBrigade(id: string, faction: FactionId, corpsId: string): FormationState {
    return {
        id,
        faction,
        corps_id: corpsId,
        name: id,
        created_turn: 1,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1000,
        cohesion: 60,
        hq_sid: 'S1',
        location_osid: 'op:test:friendly',
        tags: []
    };
}

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'sector-stance-test', phase: 'war' } as any,
        factions: [
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {
            'rs-corps-1': {
                id: 'rs-corps-1', faction: 'RS', name: 'I Krajina', created_turn: 1, status: 'active',
                assignment: null, kind: 'corps', personnel: 50, cohesion: 80, hq_sid: 'S1', tags: []
            },
            'rs-brig-1': makeBrigade('rs-brig-1', 'RS', 'rs-corps-1'),
            'rs-brig-2': makeBrigade('rs-brig-2', 'RS', 'rs-corps-1'),
        },
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { S1: 'RS' },
        brigade_posture_orders: [],
        corps_front_sectors: {
            'sector:rs-corps-1': {
                sector_id: 'sector:rs-corps-1',
                corps_id: 'rs-corps-1',
                faction: 'RS',
                opposing_factions: ['RBiH'],
                edge_ids: ['e1'],
                sub_segments: [],
                length_edges: 1,
                territory_osids: [],
                assigned_brigade_ids: ['rs-brig-1', 'rs-brig-2'],
                reserve_brigade_ids: [],
                density: 1,
                threat_ratio: 1,
                defensive_power: 1000,
                intel_confidence: 1,
                offensive_signs: false,
            }
        },
        sector_stance_orders: [{ sector_id: 'sector:rs-corps-1', stance: 'dig_in' }]
    } as GameState;
}

describe('applySectorStanceOrders', () => {
    it('translates sector stance into brigade posture orders', () => {
        const state = makeState();

        const report = applySectorStanceOrders(state);

        expect(report.postures_changed).toBe(2);
        expect(state.brigade_posture_orders).toEqual([
            { brigade_id: 'rs-brig-1', posture: 'dig_in' },
            { brigade_id: 'rs-brig-2', posture: 'dig_in' },
        ]);
        expect(state.sector_stance_orders).toEqual([]);
    });
});
