// @vitest-environment jsdom
/**
 * LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-B-SUBSET — auto-dismiss + RestartButton
 * mount tests.
 *
 * Six contracts:
 *   T1 — After step 8 advance, `tutorial_state.dismissed === true` and the
 *        final step id is appended to `completed_steps` (composition of
 *        `applyAdvanceStepPure` + `applyDismissPure`).
 *   T2 — After dismiss, `OnboardingOverlay` renders null on next mount
 *        (visibility predicate).
 *   T3 — `OnboardingRestartButton` is visible in `SettingsScreen` when
 *        tutorial is dismissed.
 *   T4 — `OnboardingRestartButton` is hidden in `SettingsScreen` while the
 *        tutorial is active (dismissed=false / undefined).
 *   T5 — Restart triggers `tutorial:restart` IPC and `applyRestart` resets to
 *        a state where the next overlay mount resolves to step 1
 *        (`01_welcome`).
 *   T6 — Static-grep guards: `OnboardingOverlay.tsx` calls `dismissTutorial`
 *        from inside the `onAdvance` final-step branch; `SettingsScreen.tsx`
 *        mounts `OnboardingRestartButton` gated on `tutorial_state.dismissed`.
 *
 * Sensitive-history compliance: Ring 1, UI-only surface, faction-agnostic
 * (`StateMeta.tutorial_state` is UI-only per design intent).
 *
 * Determinism: pure helpers + JSDOM markup; no clock, no Math.random,
 * no new Date.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
    ONBOARDING_STEPS,
    resolveNextStep,
} from '../src/ui/map/components/onboarding/onboardingSteps.js';
import {
    applyAdvanceStepPure,
    applyDismissPure,
    applyRestart,
    isFinalStep,
    shouldShowOnboarding,
    type TutorialStateShape,
} from '../src/ui/map/components/onboarding/OnboardingOverlay.js';

function readSrc(relPath: string): string {
    return readFileSync(resolve(process.cwd(), relPath), 'utf-8');
}

describe('LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-B-SUBSET — auto-dismiss + RestartButton mount', () => {
    it('T1 — after step 8 advance, dismissed=true and 08_judge appended to completed_steps', () => {
        // Build a state where the player has completed steps 1-7 and is on
        // step 8 (`08_judge`). The overlay's onAdvance handler is modeled by
        // applyAdvanceStepPure + applyDismissPure (mirrors the two IPC writes).
        const beforeStep8: TutorialStateShape = {
            dismissed: false,
            current_step: '07_report',
            completed_steps: [
                '01_welcome',
                '02_map',
                '03_brief',
                '04_inspect',
                '05_decide',
                '06_execute',
                '07_report',
            ],
        };

        // The next step the overlay would show is `08_judge`.
        const next = resolveNextStep(beforeStep8.completed_steps);
        expect(next).not.toBeNull();
        expect(next!.id).toBe('08_judge');
        expect(isFinalStep(next!.id)).toBe(true);

        // Advance: ipc.advanceStep('08_judge') mirror.
        const afterAdvance = applyAdvanceStepPure(beforeStep8, '08_judge');
        expect(afterAdvance.completed_steps).toEqual([
            '01_welcome',
            '02_map',
            '03_brief',
            '04_inspect',
            '05_decide',
            '06_execute',
            '07_report',
            '08_judge',
        ]);
        expect(afterAdvance.current_step).toBe('08_judge');
        // Per IPC contract, advance alone does not set dismissed=true.
        expect(afterAdvance.dismissed).toBe(false);

        // Auto-dismiss: ipc.dismissTutorial() mirror, fired by overlay because
        // isFinalStep('08_judge') === true.
        const afterDismiss = applyDismissPure(afterAdvance);
        expect(afterDismiss.dismissed).toBe(true);
        expect(afterDismiss.completed_steps).toEqual(afterAdvance.completed_steps);
        expect(afterDismiss.current_step).toBe('08_judge');

        // Net effect: `dismissed=true` AND every step recorded.
        expect(afterDismiss.dismissed).toBe(true);
        expect(afterDismiss.completed_steps.length).toBe(ONBOARDING_STEPS.length);

        // Non-final steps must NOT trigger auto-dismiss.
        for (const step of ONBOARDING_STEPS) {
            if (step.id === '08_judge') continue;
            expect(isFinalStep(step.id)).toBe(false);
        }
    });

    it('T2 — after dismiss, shouldShowOnboarding returns false (overlay renders null on next mount)', () => {
        // Construct the post-auto-dismiss state from T1.
        const completed: TutorialStateShape = {
            dismissed: true,
            current_step: '08_judge',
            completed_steps: ONBOARDING_STEPS.map(s => s.id),
        };

        // Visibility predicate: dismissed === true → overlay must not render.
        expect(shouldShowOnboarding(completed)).toBe(false);

        // Round-trip through JSON (save/load) and verify visibility is stable.
        const reloaded = JSON.parse(JSON.stringify(completed)) as TutorialStateShape;
        expect(reloaded.dismissed).toBe(true);
        expect(shouldShowOnboarding(reloaded)).toBe(false);

        // Active-tutorial state still shows.
        const active: TutorialStateShape = {
            dismissed: false,
            current_step: '03_brief',
            completed_steps: ['01_welcome', '02_map', '03_brief'],
        };
        expect(shouldShowOnboarding(active)).toBe(true);

        // Fresh / undefined state still shows (treated as "not yet dismissed").
        expect(shouldShowOnboarding(undefined)).toBe(true);
        expect(shouldShowOnboarding(null)).toBe(true);
    });

    it('T3 — OnboardingRestartButton mount in SettingsScreen is gated on dismissed=true', () => {
        // SettingsScreen.tsx must:
        //   (a) import `OnboardingRestartButton` from the canonical owner.
        //   (b) read `tutorial_state` from the canonical UI store.
        //   (c) render the button only when `dismissed === true`.
        // Static check ensures the host is wired correctly without spinning
        // up the Electron host (this is a renderer-level affordance check).
        const settingsSrc = readSrc('src/ui/map/components/SettingsScreen.tsx');

        // (a) canonical import.
        expect(settingsSrc).toMatch(
            /import\s*\{[^}]*OnboardingRestartButton[^}]*\}\s*from\s*['"]\.\/onboarding\/OnboardingOverlay['"]/,
        );
        // (b) reads tutorial_state from the store. The canonical store path
        // is `loadedGameState?.tutorial_state` (mirrored from
        // `meta.tutorial_state`).
        expect(settingsSrc).toMatch(/loadedGameState\?\.tutorial_state/);
        // (c) gate render on dismissed === true. The host derives a
        // `tutorialDismissed` flag from `<state>?.dismissed === true` and
        // gates the JSX on that flag (rendered conditionally below).
        expect(settingsSrc).toMatch(/tutorialDismissed\s*=\s*[^\n]*\?\.dismissed\s*===\s*true/);
        expect(settingsSrc).toMatch(/\{tutorialDismissed\s*&&/);
        // Mount uses the canonical button.
        expect(settingsSrc).toMatch(/<OnboardingRestartButton\s+ipc=/);
    });

    it('T4 — RestartButton mount is hidden while the tutorial is active', () => {
        // Same source-level gate as T3, but assert by negation: the render
        // expression is wrapped in `{tutorialDismissed && ...}` so when
        // `tutorial_state.dismissed !== true`, the button JSX is not emitted.
        const settingsSrc = readSrc('src/ui/map/components/SettingsScreen.tsx');

        // The only render of OnboardingRestartButton in SettingsScreen.tsx is
        // inside the gated branch — there is no unconditional mount.
        const mountIndex = settingsSrc.indexOf('<OnboardingRestartButton');
        expect(mountIndex).toBeGreaterThan(0);

        // The gate `{tutorialDismissed && (` must appear *before* the mount.
        const gateIndex = settingsSrc.indexOf('{tutorialDismissed &&');
        expect(gateIndex).toBeGreaterThan(0);
        expect(gateIndex).toBeLessThan(mountIndex);

        // Active-tutorial states (dismissed=false / undefined) yield
        // `tutorialDismissed === false`, which short-circuits the && and
        // omits the button from the rendered tree.
        const activeStates: Array<TutorialStateShape | undefined> = [
            undefined,
            { dismissed: false, completed_steps: [] },
            {
                dismissed: false,
                current_step: '03_brief',
                completed_steps: ['01_welcome', '02_map', '03_brief'],
            },
        ];
        for (const s of activeStates) {
            // Pure model of the host: tutorialDismissed = state?.dismissed === true
            const tutorialDismissed = s?.dismissed === true;
            expect(tutorialDismissed).toBe(false);
        }
    });

    it('T5 — restart resets state so the next overlay mount resolves to step 1 (01_welcome)', () => {
        // Pre-restart state: dismissed-with-progress (the UX entry point for
        // the restart button).
        const dismissedComplete: TutorialStateShape = {
            dismissed: true,
            current_step: '08_judge',
            completed_steps: ONBOARDING_STEPS.map(s => s.id),
        };

        // applyRestart mirrors the `tutorial:restart` IPC handler.
        const restarted = applyRestart(dismissedComplete);
        expect(restarted.dismissed).toBe(false);
        expect(restarted.current_step).toBeUndefined();
        expect(restarted.completed_steps).toEqual([]);

        // Next overlay mount: visibility = true, next step = 01_welcome.
        expect(shouldShowOnboarding(restarted)).toBe(true);
        const next = resolveNextStep(restarted.completed_steps);
        expect(next).not.toBeNull();
        expect(next!.id).toBe('01_welcome');

        // Restart from a partial state also resets to step 1.
        const partial: TutorialStateShape = {
            dismissed: false,
            current_step: '04_inspect',
            completed_steps: ['01_welcome', '02_map', '03_brief', '04_inspect'],
        };
        const restartedPartial = applyRestart(partial);
        expect(restartedPartial.completed_steps).toEqual([]);
        expect(resolveNextStep(restartedPartial.completed_steps)!.id).toBe('01_welcome');

        // Pure: source not mutated.
        expect(dismissedComplete.dismissed).toBe(true);
        expect(dismissedComplete.completed_steps.length).toBe(ONBOARDING_STEPS.length);
    });

    it('T6 — static-grep guards: auto-dismiss wired in onAdvance + restart mount gated on dismissed', () => {
        const overlaySrc = readSrc('src/ui/map/components/onboarding/OnboardingOverlay.tsx');

        // The onAdvance handler must call ipc.dismissTutorial() inside an
        // `isFinalStep` branch. The lane-tag comment is mandatory so the
        // wiring is searchable.
        expect(overlaySrc).toMatch(/LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-B-SUBSET/);
        expect(overlaySrc).toMatch(/isFinalStep\(next\.id\)/);
        expect(overlaySrc).toMatch(/await\s+ipc\.dismissTutorial\(\)/);

        // The pure `isFinalStep` helper is exported and references the
        // canonical sorted ONBOARDING_STEPS list (not a hardcoded id).
        expect(overlaySrc).toMatch(/export function isFinalStep/);
        expect(overlaySrc).toMatch(/ONBOARDING_STEPS\[ONBOARDING_STEPS\.length - 1\]/);

        // The pure `applyAdvanceStepPure` test mirror is exported.
        expect(overlaySrc).toMatch(/export function applyAdvanceStepPure/);

        // The SettingsScreen host mount is gated on dismissed===true and the
        // button is the canonical owner export.
        const settingsSrc = readSrc('src/ui/map/components/SettingsScreen.tsx');
        expect(settingsSrc).toMatch(/LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-B-SUBSET/);
        expect(settingsSrc).toMatch(/<OnboardingRestartButton/);

        // Determinism: no Math.random / Date.now / new Date in either file.
        // Strip block comments (/** ... */) and line comments (// ...) before
        // grepping so docstrings that mention these tokens (e.g. "no clock,
        // no Math.random") don't false-positive as runtime usage.
        const stripComments = (src: string): string =>
            src
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
        for (const rawSrc of [overlaySrc, settingsSrc]) {
            const src = stripComments(rawSrc);
            expect(src).not.toMatch(/Math\.random\s*\(/);
            expect(src).not.toMatch(/Date\.now\s*\(/);
            expect(src).not.toMatch(/new\s+Date\s*\(/);
        }
    });
});
