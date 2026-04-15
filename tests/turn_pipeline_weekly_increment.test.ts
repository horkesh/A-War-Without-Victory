/**
 * Phase A1.2: meta.turn increments by exactly +1; reject non-integer or negative.
 */

import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import { runOneTurn } from '../src/state/turn_pipeline.js';

const baseState: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 0, seed: 'initial-seed' },
    factions: [],
    military: {
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
    } as any,
    political: {
        political_controllers: {},
    } as any,
    displacement: {} as any,
};

describe('runOneTurn weekly increment', () => {
    it('increments meta.turn by exactly +1 per turn', () => {
        const { state: s1 } = runOneTurn(baseState, { seed: 'a' });
        expect(s1.meta.turn).toBe(1);

        const { state: s2 } = runOneTurn(s1, { seed: 'b' });
        expect(s2.meta.turn).toBe(2);
    });

    it('keeps meta.turn integer and non-negative', () => {
        const { state } = runOneTurn(baseState, { seed: 'x' });
        expect(Number.isInteger(state.meta.turn)).toBe(true);
        expect(state.meta.turn >= 0).toBe(true);
    });

    it('does not mutate the input state', () => {
        const input = structuredClone(baseState);
        runOneTurn(input, { seed: 'y' });
        expect(input.meta.turn).toBe(0);
    });
});
