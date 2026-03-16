// tests/ai_commander_advisor.test.ts
import { describe, it, expect } from 'vitest';
import { getAdvisorRecommendation } from '../src/sim/ai_commander/player_advisor.js';
import type { GameState } from '../src/state/game_state.js';

describe('player advisor', () => {
    it('returns unavailable message when no client', async () => {
        const state = { meta: { turn: 5 }, military: {} } as unknown as GameState;
        const result = await getAdvisorRecommendation(state, 'RBiH', 'situation_analysis', null);
        expect(result).not.toBeNull();
        expect(result!.assessment).toContain('not available');
    });

    it('returns error message when client fails', async () => {
        const state = { meta: { turn: 5 }, military: {} } as unknown as GameState;
        const mockClient = {
            provider: 'test',
            isAvailable: () => true,
            generateDecision: async () => { throw new Error('network error'); },
        };
        const result = await getAdvisorRecommendation(state, 'RBiH', 'situation_analysis', mockClient);
        expect(result).not.toBeNull();
        expect(result!.assessment).toContain('error');
    });
});
