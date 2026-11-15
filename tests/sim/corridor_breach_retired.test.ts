/**
 * RF-corridor-breach (2026-11-15): the corridor-breach pass is retired. Do not revive it.
 *
 * WHY (operations-expert and corps-army-commander, both ruling "retire"):
 * - It read OSID-keyed `political_controllers` through an S-id `sidToMun`, so on main's 188-week
 *   run it found 0 targets for every faction on every turn.
 * - With the IDs "fixed" it would have woken for HRHB on 174 of 188 turns and built a HOLLOW
 *   operation (`objectives: []`) that attacks nothing. It took the first corps by id and its four
 *   strongest brigades, ignoring garrison, sector and queue-head guards. And it forced
 *   `cmd.stance = 'offensive'` over the faction rules: the Herzegovina corps that rule E3 holds
 *   defensive would have been flipped into "breaching" ALLIED ARBiH Mostar from mid-1992 (t15:
 *   Livno Gubin, five Mostar cells including Mostar istok, Stolac Hatelji), with no alliance gate.
 * - `corridor_municipalities` means territory to DEFEND (E3 forces those corps defensive); it was
 *   never a breach-target list. Corridor fights are authored operations (Corridor 92), and the
 *   commander loop plans opportunities.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { generateAllCorpsOrders } from '../../src/sim/combat/bot_corps_ai.js';
import * as botCorpsAi from '../../src/sim/combat/bot_corps_ai.js';
import type { FactionId, FormationState, GameState } from '../../src/state/game_state.js';

const CORPS = 'hvo_test_herzegovina';
const HOME = 'op:mostar:test_west';
const ALLIED_CELLS = ['op:mostar:test_istok', 'op:mostar:test_blagaj'];

function brigade(id: string, faction: FactionId, osid: string, corps?: string): FormationState {
    return {
        id, name: id, faction, kind: 'brigade', status: 'active', created_turn: 0, assignment: null,
        corps_id: corps ?? null, location_osid: osid, personnel: 2600, cohesion: 80, morale: 70,
    } as unknown as FormationState;
}

/** An HRHB Herzegovina corps (home Mostar) beside ARBiH-held Mostar cells while the two are allied, t15. */
function makeState(): GameState {
    return {
        meta: { turn: 15, phase: 'war', seed: 'corridor-retired' },
        factions: [{ id: 'RS' }, { id: 'RBiH' }, { id: 'HRHB' }],
        political: {
            political_controllers: { [HOME]: 'HRHB', [ALLIED_CELLS[0]]: 'RBiH', [ALLIED_CELLS[1]]: 'RBiH' },
            war_alliance_rbih_hrhb: 0.8,
        },
        military: {
            formations: {
                [CORPS]: { id: CORPS, name: CORPS, faction: 'HRHB', kind: 'corps', status: 'active', created_turn: 0, assignment: null, personnel: 0, tags: ['mun:mostar'] },
                h1: brigade('h1', 'HRHB', HOME, CORPS),
                h2: brigade('h2', 'HRHB', HOME, CORPS),
                h3: brigade('h3', 'HRHB', HOME, CORPS),
                a1: brigade('a1', 'RBiH', ALLIED_CELLS[0]),
            },
            corps_command: {
                [CORPS]: { command_span: 4, subordinate_count: 3, og_slots: 0, active_ogs: [], active_operations: [], corps_exhaustion: 0, stance: 'offensive' },
            },
        },
    } as unknown as GameState;
}

function runPass(state: GameState): void {
    const edges = [{ a: HOME, b: ALLIED_CELLS[0] }, { a: ALLIED_CELLS[0], b: ALLIED_CELLS[1] }];
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
        generateAllCorpsOrders(state, 'HRHB', edges as never, new Map(), null, edges as never);
    } finally {
        spy.mockRestore();
    }
}

describe('RF-corridor-breach: the corridor-breach pass is retired', () => {
    it('the module and its exports are gone', () => {
        expect(existsSync(join(process.cwd(), 'src/sim/combat/bot_corps_corridor.ts'))).toBe(false);
        expect('attemptCorridorBreach' in botCorpsAi).toBe(false);
        expect('detectCorridorBreachOpportunities' in botCorpsAi).toBe(false);
    });

    it('a faction pass never creates a "Corridor Breach" operation', () => {
        const state = makeState();
        runPass(state);
        const ops = Object.values(state.military.corps_command ?? {}).flatMap(cmd => cmd?.active_operations ?? []);
        expect(ops.some(op => (op.name ?? '').startsWith('Corridor Breach'))).toBe(false);
    });

    it('an HRHB Herzegovina corps beside allied ARBiH Mostar stays defensive through the whole pass', () => {
        const state = makeState();
        runPass(state);
        expect(state.military.corps_command![CORPS]!.stance).toBe('defensive');
    });
});
