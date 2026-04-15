/**
 * Phase A1.3: Serializer rejects pipeline wrapper objects ({ state, phasesExecuted }).
 */

import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { serializeGameState } from '../src/state/serializeGameState.js';

function minimalState(): GameState {
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
        political: {} as any,
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

describe('serializeGameState wrapper rejection', () => {
    it('rejects wrapper { state, phasesExecuted }', () => {
        const state = minimalState();
        const wrapper = { state, phasesExecuted: ['directives', 'deployments'] };
        expectThrownMessage(
            () => serializeGameState(wrapper as unknown as GameState),
            (message) => message.includes('phasesExecuted') || message.includes('unexpected top-level')
        );
    });

    it('rejects object with only state key (wrapper shape)', () => {
        const state = minimalState();
        const wrapper = { state };
        expectThrownMessage(
            () => serializeGameState(wrapper as unknown as GameState),
            (message) => message.includes('unexpected top-level') && message.includes('state')
        );
    });
});
