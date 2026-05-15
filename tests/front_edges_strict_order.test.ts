import { describe, expect, it } from 'vitest';

import { computeFrontEdges, computeFrontEdgesOsid } from '../src/map/front_edges.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 40, seed: 'front-edge-strict-order' },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
                areasOfResponsibility: ['op:ljubinje:bancici', 'op:lopare:celic_3'],
                supply_sources: [],
            },
            {
                id: 'RS',
                profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
                areasOfResponsibility: ['zz_enemy_1', 'zz_enemy_2'],
                supply_sources: [],
            },
        ],
        military: { formations: {}, militia_pools: {} } as GameState['military'],
        political: {} as GameState['political'],
        displacement: {} as GameState['displacement'],
    };
}

describe('front edge ordering', () => {
    it('uses strict codepoint ordering rather than locale collation', () => {
        const edges: EdgeRecord[] = [
            { a: 'op:lopare:celic_3', b: 'zz_enemy_1' },
            { a: 'op:ljubinje:bancici', b: 'zz_enemy_2' },
        ];

        const frontEdges = computeFrontEdges(makeState(), edges);

        expect(frontEdges.map(edge => edge.a)).toEqual([
            'op:ljubinje:bancici',
            'op:lopare:celic_3',
        ]);
    });

    it('uses the same strict ordering for OSID front edges', () => {
        const edges: EdgeRecord[] = [
            { a: 'op:lopare:celic_3', b: 'zz_enemy_1' },
            { a: 'op:ljubinje:bancici', b: 'zz_enemy_2' },
        ];
        const state = makeState();
        state.political.political_controllers = {
            'op:ljubinje:bancici': 'RBiH',
            'op:lopare:celic_3': 'RBiH',
            zz_enemy_1: 'RS',
            zz_enemy_2: 'RS',
        };

        const frontEdges = computeFrontEdgesOsid(state, edges, new Map());

        expect(frontEdges.map(edge => edge.a)).toEqual([
            'op:ljubinje:bancici',
            'op:lopare:celic_3',
        ]);
    });
});
