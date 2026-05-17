import { describe, expect, test } from 'vitest';
import { computeFrontEdges, computeFrontEdgesOsid } from '../src/map/front_edges.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

const edges: EdgeRecord[] = [{ a: 'a', b: 'b' }];

function makeState(alliance: number, turn = 40): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'bilateral-front-edges', phase: 'war', rbih_hrhb_war_earliest_turn: 26 },
        factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        military: { formations: {}, militia_pools: {} } as GameState['military'],
        political: {
            war_alliance_rbih_hrhb: alliance,
            political_controllers: { a: 'RBiH', b: 'HRHB' }
        } as GameState['political'],
        displacement: {}
    } as GameState;
}

describe('bilateral front edges', () => {
    test('suppresses RBiH-HRHB front edges while alliance is above mobilization threshold', () => {
        expect(computeFrontEdges(makeState(0.21), edges)).toHaveLength(0);
        expect(computeFrontEdgesOsid(makeState(0.21), edges, new Map())).toHaveLength(0);
    });

    test('emits RBiH-HRHB front edges during mobilization threshold', () => {
        expect(computeFrontEdges(makeState(0.20), edges)).toHaveLength(1);
        expect(computeFrontEdgesOsid(makeState(0.20), edges, new Map())).toHaveLength(1);
    });

    test('keeps RBiH-HRHB front edges during open war', () => {
        expect(computeFrontEdges(makeState(-0.10), edges)).toHaveLength(1);
        expect(computeFrontEdgesOsid(makeState(-0.10), edges, new Map())).toHaveLength(1);
    });

    test('suppresses RBiH-HRHB front edges before earliest bilateral war turn', () => {
        expect(computeFrontEdges(makeState(0.20, 20), edges)).toHaveLength(0);
        expect(computeFrontEdgesOsid(makeState(0.20, 20), edges, new Map())).toHaveLength(0);
    });
});
