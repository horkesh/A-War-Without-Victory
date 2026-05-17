import { describe, expect, it } from 'vitest';

import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
import { shouldShowOnboarding } from '../../src/ui/map/components/onboarding/OnboardingOverlay.js';

function minimalSave(turn: number, tutorialState?: unknown): Record<string, unknown> {
    return {
        meta: {
            turn,
            phase: 'war',
            ...(tutorialState !== undefined ? { tutorial_state: tutorialState } : {}),
        },
        military: {
            formations: {},
        },
        political: {
            political_controllers: {},
        },
    };
}

describe('tutorial persistence on continued saves', () => {
    it('treats progressed older saves without tutorial_state as already seen', () => {
        const loaded = parseGameState(minimalSave(40));

        expect(loaded.tutorial_state).toEqual({
            dismissed: true,
            completed_steps: [],
        });
        expect(shouldShowOnboarding(loaded.tutorial_state)).toBe(false);
    });

    it('keeps fresh turn-0 saves without tutorial_state eligible for onboarding', () => {
        const loaded = parseGameState(minimalSave(0));

        expect(loaded.tutorial_state).toBeUndefined();
        expect(shouldShowOnboarding(loaded.tutorial_state)).toBe(true);
    });

    it('respects explicit saved tutorial_state over turn-based defaults', () => {
        const explicit = {
            dismissed: false,
            current_step: '03_brief',
            completed_steps: ['01_welcome', '02_map'],
        };
        const loaded = parseGameState(minimalSave(40, explicit));

        expect(loaded.tutorial_state).toEqual(explicit);
        expect(shouldShowOnboarding(loaded.tutorial_state)).toBe(true);
    });
});
