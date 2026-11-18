/**
 * Package "1994-95 attack and defence", P2 step 3 (ratified 2026-11-16): a retake-only counter-attack
 * in ANY corps stance. A brigade may counter-attack only an adjacent cell its faction lost in combat
 * within the retreat window and has not taken back; never other enemy ground.
 */
import { describe, expect, it } from 'vitest';

import { generateAllBotOrdersOsid } from '../src/sim/combat/bot_brigade_ai_osid.js';
import type { GameState } from '../src/state/game_state.js';

type Stance = 'offensive' | 'balanced' | 'defensive';

function makeState(stance: Stance, lostTurn: number | null, retreatTarget: string | null): GameState {
    return {
        meta: { turn: 3, phase: 'war', seed: 'retake-counter-attack' },
        political: {
            political_controllers: { F1: 'RS', T1: 'RBiH', E1: 'RBiH' },
            control_events: lostTurn == null ? [] : [
                { turn: lostTurn, settlement_id: 'T1', from: 'RS', to: 'RBiH', mechanism: 'combat' },
            ],
        },
        factions: [],
        displacement: { settlement_displacement: {}, municipality_displacement: {}, displacement_state: {} },
        military: {
            formations: {
                rs_bde: {
                    id: 'rs_bde', name: 'rs_bde', kind: 'brigade', faction: 'RS', status: 'active', corps_id: 'vrs_test',
                    posture: 'defend', cohesion: 70, morale: 70, personnel: 1000, equipment: {},
                    location_osid: 'F1',
                    ...(retreatTarget ? { last_retreat_from: { osid: retreatTarget, turn: 2 } } : {}),
                },
            },
            corps_command: {
                vrs_test: { stance, active_operations: [], corps_exhaustion: 0 },
            },
            brigade_attack_orders: {}, brigade_movement_orders: {}, brigade_posture_orders: [],
        },
    } as unknown as GameState;
}

const edges = [{ a: 'F1', b: 'T1' }, { a: 'F1', b: 'E1' }, { a: 'T1', b: 'E1' }] as any;
const run = (state: GameState) => {
    generateAllBotOrdersOsid(state, ['RS'], {
        edges, reverseMap: new Map(), supplyStateByOsid: {} as any, osidPopulationMap: new Map(),
    });
    return { attack_orders: (state.military.brigade_attack_orders ?? {}) as Record<string, string | undefined> };
};

describe('retake-only counter-attack in any stance (P2 step 3)', () => {
    for (const stance of ['offensive', 'balanced', 'defensive'] as const) {
        it(`a ${stance} corps' brigade retakes the cell it just lost`, () => {
            const result = run(makeState(stance, 2, 'T1'));
            expect(result.attack_orders.rs_bde).toBe('T1');
        });
    }

    it('never targets an adjacent enemy cell that was not just lost', () => {
        // E1 is enemy-held and adjacent but was never lost by RS; T1 was not lost either.
        const result = run(makeState('offensive', null, 'T1'));
        expect(result.attack_orders.rs_bde).toBeUndefined();
    });

    it('does not retake once the loss is older than the retreat window', () => {
        const state = makeState('offensive', 2, null);
        state.meta.turn = 6; // lost at t2, window 2 turns
        expect(run(state).attack_orders.rs_bde).toBeUndefined();
    });
});
