import { describe, expect, it } from 'vitest';

import type { FormationState, GameState } from '../src/state/game_state.js';
import {
    buildCorpsSubordinatesByCorps,
    getCorpsSubordinates,
} from '../src/sim/combat/bot_corps_helpers.js';

function brigade(id: string, corpsId: string, status: FormationState['status'] = 'active'): FormationState {
    return {
        id,
        faction: 'RBiH',
        kind: 'brigade',
        status,
        corps_id: corpsId,
    } as FormationState;
}

describe('corps subordinate index', () => {
    it('matches fallback subordinate ordering and returns copies', () => {
        const state = {
            military: {
                formations: {
                    zeta: brigade('zeta', 'corps_a'),
                    alpha: brigade('alpha', 'corps_a'),
                    inactive: brigade('inactive', 'corps_a', 'inactive'),
                    other: brigade('other', 'corps_b'),
                    corps_a: {
                        id: 'corps_a',
                        faction: 'RBiH',
                        kind: 'corps',
                        status: 'active',
                    },
                },
            },
        } as unknown as GameState;

        const indexed = buildCorpsSubordinatesByCorps(state);
        const fallbackIds = getCorpsSubordinates(state, 'corps_a').map(f => f.id);
        const indexedIds = getCorpsSubordinates(state, 'corps_a', indexed).map(f => f.id);

        expect(indexedIds).toEqual(fallbackIds);
        expect(indexedIds).toEqual(['alpha', 'zeta']);
        expect(getCorpsSubordinates(state, 'missing_corps', indexed)).toEqual([]);

        const firstRead = getCorpsSubordinates(state, 'corps_a', indexed);
        firstRead.pop();
        expect(getCorpsSubordinates(state, 'corps_a', indexed).map(f => f.id)).toEqual(['alpha', 'zeta']);
    });
});
