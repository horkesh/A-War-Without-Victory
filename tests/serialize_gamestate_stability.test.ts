/**
 * Phase A1.3: Stable deterministic serialization - same state produces byte-identical JSON.
 */

import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { serializeGameState } from '../src/state/serializeGameState.js';

/** Minimal valid GameState with out-of-order record keys (political_controllers, formations). */
function fixtureWithOutOfOrderKeys(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 1, seed: 'stability-fixture', player_faction: 'RBiH', decision_mode: 'historical' } as any,
        factions: [],
        military: {
            formations: {
                form_z: { id: 'form_z', faction: 'RBiH', name: 'Z', created_turn: 0, status: 'active', assignment: null },
                form_a: { id: 'form_a', faction: 'RS', name: 'A', created_turn: 0, status: 'active', assignment: null },
                form_m: { id: 'form_m', faction: 'HRHB', name: 'M', created_turn: 0, status: 'active', assignment: null },
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as any,
        political: {
            political_controllers: {
                sid_zzz: 'RBiH',
                sid_aaa: null,
                sid_mmm: 'RS',
            },
        } as any,
        displacement: {} as any,
    };
}

describe('serializeGameState stability', () => {
    it('produces identical string when called twice', () => {
        const state = fixtureWithOutOfOrderKeys();
        const a = serializeGameState(state);
        const b = serializeGameState(state);
        expect(a).toBe(b);
    });

    it('has deterministically ordered top-level keys', () => {
        const state = fixtureWithOutOfOrderKeys();
        const str = serializeGameState(state);
        const parsed = JSON.parse(str) as Record<string, unknown>;
        const keys = Object.keys(parsed);
        const sorted = [...keys].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
        expect(keys).toEqual(sorted);
    });

    it('has deterministically ordered keys in political_controllers', () => {
        const state = fixtureWithOutOfOrderKeys();
        const str = serializeGameState(state);
        const parsed = JSON.parse(str) as Record<string, unknown>;
        const political = parsed.political as Record<string, unknown> | undefined;
        const pc = political?.political_controllers as Record<string, unknown> | undefined;
        expect(pc && typeof pc === 'object').toBeTruthy();
        const keys = Object.keys(pc as Record<string, unknown>);
        const sorted = [...keys].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
        expect(keys).toEqual(sorted);
    });

    it('has deterministically ordered keys in formations', () => {
        const state = fixtureWithOutOfOrderKeys();
        const str = serializeGameState(state);
        const parsed = JSON.parse(str) as Record<string, unknown>;
        const military = parsed.military as Record<string, unknown> | undefined;
        const formations = military?.formations as Record<string, unknown> | undefined;
        expect(formations && typeof formations === 'object').toBeTruthy();
        const keys = Object.keys(formations as Record<string, unknown>);
        const sorted = [...keys].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
        expect(keys).toEqual(sorted);
    });
});
