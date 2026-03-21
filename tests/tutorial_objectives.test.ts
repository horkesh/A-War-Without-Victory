import { describe, it, expect } from 'vitest';
import {
    TUTORIAL_OBJECTIVES,
    createTutorialState,
    getCurrentObjective,
    checkObjectiveCompletion,
} from '../src/sim/tutorial/tutorial_objectives.js';

describe('tutorial_objectives', () => {
    it('has 11 objectives', () => {
        expect(TUTORIAL_OBJECTIVES.length).toBe(11);
    });

    it('creates initial state at objective 0', () => {
        const state = createTutorialState();
        expect(state.currentObjectiveIndex).toBe(0);
        expect(state.completedObjectives.length).toBe(0);
        expect(state.dismissed).toBe(false);
    });

    it('returns first objective as current', () => {
        const tutState = createTutorialState();
        const obj = getCurrentObjective(tutState);
        expect(obj?.id).toBe('review_forces');
    });

    it('completes objective on matching action', () => {
        const tutState = createTutorialState();
        const gameState = { meta: { turn: 1 } } as any;

        const result = checkObjectiveCompletion(tutState, 'orbat_opened', gameState);
        expect(result).not.toBeNull();
        expect(result!.currentObjectiveIndex).toBe(1);
        expect(result!.completedObjectives).toContain('review_forces');
    });

    it('does not complete on non-matching action', () => {
        const tutState = createTutorialState();
        const gameState = { meta: { turn: 1 } } as any;

        const result = checkObjectiveCompletion(tutState, 'wrong_action', gameState);
        expect(result).toBeNull();
    });

    it('completes survive objective via state check', () => {
        const tutState = {
            completedObjectives: TUTORIAL_OBJECTIVES.slice(0, 10).map(o => o.id),
            currentObjectiveIndex: 10,
            dismissed: false,
        };
        const gameState = { meta: { turn: 10 } } as any;

        const result = checkObjectiveCompletion(tutState, '', gameState);
        expect(result).not.toBeNull();
        expect(result!.completedObjectives).toContain('survive');
    });

    it('returns null when dismissed', () => {
        const tutState = { ...createTutorialState(), dismissed: true };
        expect(getCurrentObjective(tutState)).toBeNull();
    });
});
