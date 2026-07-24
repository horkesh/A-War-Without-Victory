import { describe, expect, it } from 'vitest';
import { consolidateRearPockets } from '../src/sim/combat/rear_pocket_consolidation.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { GameState } from '../src/state/game_state.js';

const POCKET = 'op:bugojno:allied_pocket';
const RING = [
    'op:bugojno:ring_a',
    'op:bugojno:ring_b',
];
const BULK = [
    'op:bugojno:bulk_a',
    'op:bugojno:bulk_b',
    'op:bugojno:bulk_c',
    'op:bugojno:bulk_d',
    'op:bugojno:bulk_e',
];

function makeEdges(): EdgeRecord[] {
    return [
        ...RING.map((osid) => ({ a: POCKET, b: osid } as EdgeRecord)),
        ...RING.map((osid) => ({ a: osid, b: BULK[0]! } as EdgeRecord)),
        ...BULK.slice(0, -1).map((osid, index) => ({
            a: osid,
            b: BULK[index + 1]!,
        } as EdgeRecord)),
    ];
}

function makeState(turn: number): GameState {
    const politicalControllers: Record<string, 'RBiH' | 'HRHB'> = {
        [POCKET]: 'HRHB',
    };
    for (const osid of [...RING, ...BULK]) {
        politicalControllers[osid] = 'RBiH';
    }

    return {
        meta: {
            turn,
            phase: 'war',
            seed: 'rear-pocket-alliance-gate',
            rbih_hrhb_war_earliest_turn: 26,
        },
        factions: [{ id: 'RBiH' }, { id: 'HRHB' }],
        military: {
            formations: {},
        },
        political: {
            political_controllers: politicalControllers,
            control_events: [],
            war_alliance_rbih_hrhb: -0.3,
        },
        displacement: {
            hostile_takeover_timers: {},
        },
    } as unknown as GameState;
}

describe('rear-pocket consolidation bilateral-war gate', () => {
    it('does not seize allied territory before the scenario war floor', () => {
        const state = makeState(21);

        const report = consolidateRearPockets(state, makeEdges(), new Map());

        expect(report.total_flipped).toBe(0);
        expect(state.political.political_controllers?.[POCKET]).toBe('HRHB');
        expect(state.political.control_events).toEqual([]);
    });

    it('permits the same undefended pocket after the scenario war floor', () => {
        const state = makeState(26);

        const report = consolidateRearPockets(state, makeEdges(), new Map());

        expect(report.total_flipped).toBe(1);
        expect(state.political.political_controllers?.[POCKET]).toBe('RBiH');
    });
});
