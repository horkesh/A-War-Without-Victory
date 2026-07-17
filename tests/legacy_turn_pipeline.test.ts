import { describe, expect, it } from 'vitest';

import { executeTurn, type TurnContext } from '../src/turn/pipeline.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import { strictCompare } from '../src/state/validateGameState.js';

function minimalState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 2, phase: 'war', seed: 'initial-seed' },
        factions: [],
        military: { formations: {} },
        political: {},
        displacement: {},
    } as unknown as GameState;
}

describe('legacy turn pipeline invariant compatibility', () => {
    it('executes ordered steps without exposing a random selector', () => {
        const contextKeys: string[][] = [];
        const stepNames: string[] = [];
        const next = executeTurn(minimalState(), {
            seed: 'explicit-seed',
            steps: [
                {
                    name: 'first',
                    execute: (context: TurnContext) => {
                        contextKeys.push(Object.keys(context).sort(strictCompare));
                        stepNames.push('first');
                    },
                },
                {
                    name: 'second',
                    execute: () => stepNames.push('second'),
                },
            ],
        });

        expect(contextKeys).toEqual([['seed', 'state']]);
        expect(stepNames).toEqual(['first', 'second']);
        expect(next.meta.turn).toBe(3);
        expect(next.meta.seed).toBe('explicit-seed');
    });
});
