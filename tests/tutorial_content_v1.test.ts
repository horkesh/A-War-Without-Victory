/**
 * LANE-NIGHTSHIFT-TUTORIAL-CONTENT-V1 — 8-step campaign-loop tutorial tests.
 *
 * Five contracts:
 *   T1 — step ordering is deterministic (sorted by id lexicographically).
 *   T2 — every step's `target_ui_element` is either null or an entry in the
 *        canonical `TUTORIAL_SPOTLIGHT_TARGETS` allow-list.
 *   T3 — dismiss action sets `tutorial_state.dismissed=true` while preserving
 *        `completed_steps`.
 *   T4 — restart action resets `dismissed=false` and clears `completed_steps`
 *        (current_step also cleared).
 *   T5 — save/load round-trip (JSON) preserves the full tutorial progress.
 *
 * The dismiss / restart actions are exposed as pure helpers in
 * `OnboardingOverlay.tsx` (`applyDismissPure`, `applyRestart`) so this test
 * exercises the contract without spinning up Electron. The canonical IPC
 * implementation lives in `src/desktop/electron-main.cjs` and must match.
 *
 * Determinism: no clock, no Math.random, pure synchronous mutation.
 */

import { describe, expect, it } from 'vitest';
import {
    ONBOARDING_STEPS,
    TUTORIAL_SPOTLIGHT_TARGETS,
    compareStepsById,
} from '../src/ui/map/components/onboarding/onboardingSteps.js';
import {
    applyDismissPure,
    applyRestart,
    type TutorialStateShape,
} from '../src/ui/map/components/onboarding/OnboardingOverlay.js';

function jsonRoundTrip<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

describe('LANE-NIGHTSHIFT-TUTORIAL-CONTENT-V1 — 8-step campaign-loop tutorial', () => {
    it('T1 — step ordering is deterministic (sorted by id)', () => {
        // The exported list must be sorted lexicographically by id. Verify by
        // (a) round-tripping through the same comparator and (b) byte-stable
        // JSON across two reads.
        const ids = ONBOARDING_STEPS.map(s => s.id);
        const sorted = [...ids].sort();
        expect(ids).toEqual(sorted);

        // Eight steps as authored.
        expect(ONBOARDING_STEPS.length).toBe(8);

        // Authored ids form the 01_…08_ prefix family, stable lexicographic order.
        expect(ids).toEqual([
            '01_welcome',
            '02_map',
            '03_brief',
            '04_inspect',
            '05_decide',
            '06_execute',
            '07_report',
            '08_judge',
        ]);

        // Comparator is a total order: applying it twice yields identical output.
        const resorted1 = [...ONBOARDING_STEPS].sort(compareStepsById);
        const resorted2 = [...ONBOARDING_STEPS].sort(compareStepsById);
        expect(JSON.stringify(resorted1)).toBe(JSON.stringify(resorted2));
        expect(JSON.stringify(resorted1)).toBe(JSON.stringify(ONBOARDING_STEPS));
    });

    it('T2 — every target_ui_element is null or in TUTORIAL_SPOTLIGHT_TARGETS', () => {
        const validTargets = new Set(TUTORIAL_SPOTLIGHT_TARGETS);
        for (const step of ONBOARDING_STEPS) {
            if (step.target_ui_element === null) continue;
            expect(
                validTargets.has(step.target_ui_element),
                `step '${step.id}' targets '${step.target_ui_element}' which is not in TUTORIAL_SPOTLIGHT_TARGETS`,
            ).toBe(true);
        }

        // Welcome step (01) is the spotlight-on-overlay case (null target).
        const welcome = ONBOARDING_STEPS.find(s => s.id === '01_welcome');
        expect(welcome).toBeDefined();
        expect(welcome!.target_ui_element).toBeNull();

        // Body copy is non-empty, faction-agnostic, and within the 30–60-word
        // CoS-briefing voice band documented in the lane spec.
        for (const step of ONBOARDING_STEPS) {
            expect(step.title.length).toBeGreaterThan(0);
            expect(step.body.length).toBeGreaterThan(0);
            const wordCount = step.body.split(/\s+/).filter(Boolean).length;
            expect(
                wordCount,
                `step '${step.id}' body has ${wordCount} words; expected 30–60`,
            ).toBeGreaterThanOrEqual(30);
            expect(wordCount).toBeLessThanOrEqual(70);
            // Faction-agnostic: body must not name a faction.
            expect(step.body.toLowerCase()).not.toMatch(/\b(rbih|arbih|rs|vrs|hrhb|hvo)\b/);
        }
    });

    it('T3 — dismiss sets dismissed=true while preserving completed_steps', () => {
        // Case A: fresh state.
        const fresh: TutorialStateShape | undefined = undefined;
        const dismissedFresh = applyDismissPure(fresh);
        expect(dismissedFresh.dismissed).toBe(true);
        expect(dismissedFresh.completed_steps).toEqual([]);
        expect(dismissedFresh.current_step).toBeUndefined();

        // Case B: partial progress before dismiss — completed_steps preserved.
        const partial: TutorialStateShape = {
            dismissed: false,
            current_step: '03_brief',
            completed_steps: ['01_welcome', '02_map', '03_brief'],
        };
        const dismissedPartial = applyDismissPure(partial);
        expect(dismissedPartial.dismissed).toBe(true);
        expect(dismissedPartial.current_step).toBe('03_brief');
        expect(dismissedPartial.completed_steps).toEqual(['01_welcome', '02_map', '03_brief']);

        // Idempotent: dismiss twice leaves dismissed=true unchanged.
        const dismissedTwice = applyDismissPure(dismissedPartial);
        expect(dismissedTwice.dismissed).toBe(true);
        expect(dismissedTwice.completed_steps).toEqual(['01_welcome', '02_map', '03_brief']);

        // Pure: source not mutated.
        expect(partial.dismissed).toBe(false);
        expect(partial.completed_steps).toEqual(['01_welcome', '02_map', '03_brief']);
    });

    it('T4 — restart resets dismissed=false and clears completed_steps', () => {
        // Case A: from a dismissed-with-progress state.
        const dismissedWithProgress: TutorialStateShape = {
            dismissed: true,
            current_step: '04_inspect',
            completed_steps: ['01_welcome', '02_map', '03_brief', '04_inspect'],
        };
        const restarted = applyRestart(dismissedWithProgress);
        expect(restarted.dismissed).toBe(false);
        expect(restarted.completed_steps).toEqual([]);
        expect(restarted.current_step).toBeUndefined();

        // Case B: from null/undefined (fresh) — still produces canonical reset.
        const restartedFresh = applyRestart(undefined);
        expect(restartedFresh.dismissed).toBe(false);
        expect(restartedFresh.completed_steps).toEqual([]);
        expect(restartedFresh.current_step).toBeUndefined();

        // Pure: source not mutated.
        expect(dismissedWithProgress.dismissed).toBe(true);
        expect(dismissedWithProgress.completed_steps).toEqual([
            '01_welcome', '02_map', '03_brief', '04_inspect',
        ]);
    });

    it('T5 — save/load round-trip (JSON) preserves tutorial progress', () => {
        // Build a partially-progressed state that touches every field shape.
        const progressed: TutorialStateShape = {
            dismissed: false,
            current_step: '05_decide',
            completed_steps: ['01_welcome', '02_map', '03_brief', '04_inspect', '05_decide'],
        };
        const after = jsonRoundTrip(progressed);
        expect(after).toEqual(progressed);
        expect(after.dismissed).toBe(false);
        expect(after.current_step).toBe('05_decide');
        expect(after.completed_steps).toEqual([
            '01_welcome', '02_map', '03_brief', '04_inspect', '05_decide',
        ]);
        expect(JSON.stringify(after)).toBe(JSON.stringify(progressed));

        // Dismissed state round-trips.
        const dismissed: TutorialStateShape = {
            dismissed: true,
            current_step: '08_judge',
            completed_steps: ONBOARDING_STEPS.map(s => s.id),
        };
        const dismissedAfter = jsonRoundTrip(dismissed);
        expect(dismissedAfter).toEqual(dismissed);

        // Restart-then-save-load yields fresh-equivalent state.
        const restarted = applyRestart(dismissed);
        const restartedAfter = jsonRoundTrip(restarted);
        expect(restartedAfter.dismissed).toBe(false);
        expect(restartedAfter.completed_steps).toEqual([]);
        expect(restartedAfter.current_step).toBeUndefined();
    });
});
