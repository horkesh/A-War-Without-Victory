/**
 * LANE-NIGHTSHIFT-ROUND2-TUTORIAL-ONBOARDING-SKELETON.
 *
 * v0.9.2 tutorial onboarding skeleton — state-meta + IPC-action contract tests.
 *
 * Three contracts:
 *   T1 — `meta.tutorial_state` round-trips through JSON save/load byte-identical.
 *   T2 — the dismiss action sets `dismissed=true` and preserves prior fields.
 *   T3 — the advance-step action appends `step_id` to `completed_steps`
 *        deterministically (idempotent, no duplicates, append order preserved).
 *
 * The dismiss / advance-step actions are duplicated as small pure helpers in
 * this file so we can test the contract without spinning up Electron. The
 * canonical implementation lives in `src/desktop/electron-main.cjs`; both
 * paths must match in shape (single-owner contract).
 *
 * Determinism: no clock, no Math.random, pure synchronous mutation.
 */

import { describe, expect, it } from 'vitest';
import type { StateMeta } from '../src/state/game_state.js';

type TutorialState = NonNullable<StateMeta['tutorial_state']>;

interface MetaWithTutorial {
    tutorial_state?: TutorialState;
}

/**
 * Pure mirror of the `tutorial:dismiss` ipcMain handler in electron-main.cjs.
 * Sets dismissed=true and preserves any prior current_step / completed_steps.
 */
function applyDismiss(meta: MetaWithTutorial): void {
    const prior = meta.tutorial_state ?? { dismissed: false, completed_steps: [] };
    meta.tutorial_state = {
        dismissed: true,
        current_step: prior.current_step,
        completed_steps: Array.isArray(prior.completed_steps) ? prior.completed_steps.slice() : [],
    };
}

/**
 * Pure mirror of the `tutorial:advance-step` ipcMain handler. Idempotent
 * append: a duplicate stepId is a no-op. current_step is set to the most
 * recent stepId.
 */
function applyAdvanceStep(meta: MetaWithTutorial, stepId: string): void {
    const prior = meta.tutorial_state ?? { dismissed: false, completed_steps: [] };
    const completed = Array.isArray(prior.completed_steps) ? prior.completed_steps.slice() : [];
    if (!completed.includes(stepId)) {
        completed.push(stepId);
    }
    meta.tutorial_state = {
        dismissed: prior.dismissed === true,
        current_step: stepId,
        completed_steps: completed,
    };
}

function jsonRoundTrip<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

describe('LANE-NIGHTSHIFT-ROUND2-TUTORIAL-ONBOARDING-SKELETON tutorial state', () => {
    it('T1 — tutorial_state round-trips through save/load byte-identical', () => {
        const meta: MetaWithTutorial = {
            tutorial_state: {
                dismissed: false,
                current_step: 'the_map',
                completed_steps: ['welcome', 'the_map'],
            },
        };
        const before = meta.tutorial_state;
        const after = jsonRoundTrip(before);

        // Field-by-field equality + structural equality.
        expect(after).toEqual(before);
        expect(after?.dismissed).toBe(false);
        expect(after?.current_step).toBe('the_map');
        expect(after?.completed_steps).toEqual(['welcome', 'the_map']);

        // Whole-object byte-stable through JSON.
        expect(JSON.stringify(after)).toBe(JSON.stringify(before));

        // Empty / fresh-campaign case (absent tutorial_state) round-trips as undefined.
        const fresh: MetaWithTutorial = {};
        const freshAfter = jsonRoundTrip(fresh);
        expect(freshAfter.tutorial_state).toBeUndefined();
    });

    it('T2 — dismiss action sets dismissed=true and preserves prior fields', () => {
        // Case A: fresh state (no tutorial_state yet).
        const fresh: MetaWithTutorial = {};
        applyDismiss(fresh);
        expect(fresh.tutorial_state).toBeDefined();
        expect(fresh.tutorial_state!.dismissed).toBe(true);
        expect(fresh.tutorial_state!.completed_steps).toEqual([]);
        expect(fresh.tutorial_state!.current_step).toBeUndefined();

        // Case B: partial progress before dismiss — prior steps preserved.
        const partial: MetaWithTutorial = {
            tutorial_state: {
                dismissed: false,
                current_step: 'welcome',
                completed_steps: ['welcome'],
            },
        };
        applyDismiss(partial);
        expect(partial.tutorial_state!.dismissed).toBe(true);
        expect(partial.tutorial_state!.current_step).toBe('welcome');
        expect(partial.tutorial_state!.completed_steps).toEqual(['welcome']);

        // Idempotent: dismiss a second time leaves dismissed=true unchanged.
        applyDismiss(partial);
        expect(partial.tutorial_state!.dismissed).toBe(true);
        expect(partial.tutorial_state!.completed_steps).toEqual(['welcome']);
    });

    it('T3 — advance-step appends step_id to completed_steps deterministically', () => {
        const meta: MetaWithTutorial = {};

        // Sequence A: fresh → welcome → the_map → first_turn (in order).
        applyAdvanceStep(meta, 'welcome');
        expect(meta.tutorial_state!.completed_steps).toEqual(['welcome']);
        expect(meta.tutorial_state!.current_step).toBe('welcome');
        expect(meta.tutorial_state!.dismissed).toBe(false);

        applyAdvanceStep(meta, 'the_map');
        expect(meta.tutorial_state!.completed_steps).toEqual(['welcome', 'the_map']);
        expect(meta.tutorial_state!.current_step).toBe('the_map');

        applyAdvanceStep(meta, 'first_turn');
        expect(meta.tutorial_state!.completed_steps).toEqual(['welcome', 'the_map', 'first_turn']);
        expect(meta.tutorial_state!.current_step).toBe('first_turn');

        // Idempotency: repeating an advance does not duplicate the entry, but
        // current_step still updates to the most recent call (this is the
        // intended "scrub backward then forward" behaviour).
        applyAdvanceStep(meta, 'welcome');
        expect(meta.tutorial_state!.completed_steps).toEqual(['welcome', 'the_map', 'first_turn']);
        expect(meta.tutorial_state!.current_step).toBe('welcome');

        // Determinism: replaying the same sequence on a fresh state yields the
        // same completed_steps order (no clock, no Math.random).
        const replay: MetaWithTutorial = {};
        applyAdvanceStep(replay, 'welcome');
        applyAdvanceStep(replay, 'the_map');
        applyAdvanceStep(replay, 'first_turn');
        expect(replay.tutorial_state!.completed_steps).toEqual(['welcome', 'the_map', 'first_turn']);

        // Save/load through advance preserves the order.
        const reloaded = jsonRoundTrip(replay.tutorial_state);
        expect(reloaded?.completed_steps).toEqual(['welcome', 'the_map', 'first_turn']);
    });
});
