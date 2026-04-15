/**
 * Phase A1.3: Serializer rejects denylisted derived-state keys (defense in depth with validateGameStateShape).
 * Engine Invariants Section 13.1: no serialization of derived states.
 */

import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { serializeGameState } from '../src/state/serializeGameState.js';

function baseState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'x' },
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
}

function expectThrownMessage(run: () => void, matcher: (message: string) => boolean): void {
    try {
        run();
        throw new Error('Expected serializeGameState to throw');
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        expect(matcher(message), `Unexpected error message: ${message}`).toBe(true);
    }
}

describe('serializeGameState derived-state rejection', () => {
    it('rejects state with top-level "fronts"', () => {
        const state = baseState() as GameState & { fronts?: unknown };
        state.fronts = [];
        expectThrownMessage(
            () => serializeGameState(state),
            (message) => message.includes('fronts') || message.includes('denylisted') || message.includes('validation')
        );
    });

    it('rejects state with top-level "corridors"', () => {
        const state = baseState() as GameState & { corridors?: unknown };
        state.corridors = {};
        expectThrownMessage(
            () => serializeGameState(state),
            (message) => message.includes('corridors') || message.includes('denylisted') || message.includes('validation')
        );
    });

    it('rejects state with top-level "derived"', () => {
        const state = baseState() as GameState & { derived?: unknown };
        state.derived = {};
        expectThrownMessage(
            () => serializeGameState(state),
            (message) => message.includes('derived') || message.includes('denylisted') || message.includes('validation')
        );
    });

    it('rejects state with top-level "cache"', () => {
        const state = baseState() as GameState & { cache?: unknown };
        state.cache = {};
        expectThrownMessage(
            () => serializeGameState(state),
            (message) => message.includes('cache') || message.includes('denylisted') || message.includes('validation')
        );
    });
});
