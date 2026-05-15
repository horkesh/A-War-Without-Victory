import { describe, expect, it } from 'vitest';

import { buildAdjacentEnemyOsidsByLoc } from '../src/sim/combat/bot_brigade_context.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import type { GameState } from '../src/state/game_state.js';

describe('buildAdjacentEnemyOsidsByLoc', () => {
    it('caches sorted adjacent enemy OSIDs including tactical war-front edges', () => {
        const loc = 'op:test:front' as Osid;
        const baseEnemy = 'op:test:base_enemy' as Osid;
        const frontEdgeEnemy = 'op:test:front_edge_enemy' as Osid;
        const friendly = 'op:test:friendly' as Osid;
        const state = {
            military: {
                war_front_edges_osid: [
                    { a: loc, b: frontEdgeEnemy },
                ],
            },
            political: {
                political_controllers: {
                    [loc]: 'RBiH',
                    [baseEnemy]: 'RS',
                    [frontEdgeEnemy]: 'RS',
                    [friendly]: 'RBiH',
                },
            },
        } as unknown as GameState;
        const adjacency = new Map<Osid, Osid[]>([
            [loc, [friendly, baseEnemy]],
            [friendly, [loc]],
            [baseEnemy, [loc]],
            [frontEdgeEnemy, []],
        ]);

        const cache = buildAdjacentEnemyOsidsByLoc(
            state,
            'RBiH',
            adjacency,
            new Map(),
            [loc, loc],
        );

        expect(cache.get(loc)).toEqual([baseEnemy, frontEdgeEnemy]);
        expect(cache.size).toBe(1);
    });
});
