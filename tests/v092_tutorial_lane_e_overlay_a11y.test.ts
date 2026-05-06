// @vitest-environment jsdom
/**
 * LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-E — OnboardingOverlay accessibility tests.
 *
 * Authority: Tutorial Phase 0 panel
 * `docs/40_reports/audits/20260506_V092_TUTORIAL_FILL_OUT_PHASE_0_PANEL.md`
 * Lane E scope: add `role="dialog"` + focus trap + ESC dismissal to the
 * `OnboardingOverlay` (which is NOT a `<Modal>`-wrapped component).
 *
 * Layered on A11y Lane A (`src/ui/shared/Modal.tsx`, frozen at `9dd9eb42`):
 * Lane E mirrors the same a11y contract Modal canonicalized, but in the
 * full-overlay pattern OnboardingOverlay uses.
 *
 * Seven contracts:
 *   T1 — Overlay root carries `role="dialog"` + `aria-modal="true"`.
 *   T2 — `aria-labelledby` resolves to a step-title id rendered inside the
 *        overlay subtree.
 *   T3 — Focus trap captures `document.activeElement` on open, restores on
 *        unmount.
 *   T4 — ESC fires `ipc.dismissTutorial()` exactly once.
 *   T5 — Tab cycles within overlay's focusables (Tab on last → first;
 *        Shift+Tab on first → last).
 *   T6 — Static-grep determinism + lane-tag guards on the overlay source.
 *   T7 — Tutorial Lane B-subset's auto-dismiss-on-step-8 path still works
 *        (regression guard via the exported pure helpers).
 *
 * Sensitive-history compliance: Ring 1, UI surface only, faction-agnostic.
 *
 * Determinism: pure render + JSDOM events; no clock, no Math.random,
 * no new Date.
 */

import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
    ONBOARDING_STEPS,
    resolveNextStep,
} from '../src/ui/map/components/onboarding/onboardingSteps.js';
import {
    OnboardingOverlay,
    applyAdvanceStepPure,
    applyDismissPure,
    isFinalStep,
    type OnboardingIpcBridge,
    type TutorialStateShape,
} from '../src/ui/map/components/onboarding/OnboardingOverlay.js';

function readSrc(relPath: string): string {
    return readFileSync(resolve(process.cwd(), relPath), 'utf-8');
}

/** Build an IPC bridge stub whose three methods resolve to `{ ok: true }`. */
function makeIpcStub(): OnboardingIpcBridge & {
    dismissTutorial: ReturnType<typeof vi.fn>;
    advanceStep: ReturnType<typeof vi.fn>;
    restartTutorial: ReturnType<typeof vi.fn>;
} {
    return {
        dismissTutorial: vi.fn(async () => ({ ok: true })),
        advanceStep: vi.fn(async (_id: string) => ({ ok: true })),
        restartTutorial: vi.fn(async () => ({ ok: true })),
    };
}

/** Fresh-campaign tutorial state: undefined / not yet dismissed. */
const FRESH_STATE: TutorialStateShape | null | undefined = undefined;

describe('LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-E — OnboardingOverlay a11y', () => {
    it('T1 — overlay root carries role="dialog" + aria-modal="true"', () => {
        const ipc = makeIpcStub();
        const { getByTestId, unmount } = render(
            createElement(OnboardingOverlay, { tutorialState: FRESH_STATE, ipc }),
        );
        const overlay = getByTestId('onboarding-overlay');
        expect(overlay.getAttribute('role')).toBe('dialog');
        expect(overlay.getAttribute('aria-modal')).toBe('true');
        // tabIndex=-1 lets the overlay be focused programmatically when no
        // descendants are focusable (defensive — Skip+Next are always present).
        expect(overlay.getAttribute('tabindex')).toBe('-1');
        unmount();
    });

    it('T2 — aria-labelledby resolves to a step-title id rendered inside the overlay subtree', () => {
        const ipc = makeIpcStub();
        const { getByTestId, unmount } = render(
            createElement(OnboardingOverlay, { tutorialState: FRESH_STATE, ipc }),
        );
        const overlay = getByTestId('onboarding-overlay');
        const labelledBy = overlay.getAttribute('aria-labelledby');
        expect(labelledBy).toBeTruthy();
        // The id is a deterministic mirror of the current step id.
        const next = resolveNextStep([]);
        expect(next).not.toBeNull();
        expect(labelledBy).toBe(`onboarding-title-${next!.id}`);

        // The referenced node exists inside the overlay and announces the
        // step title.
        const titleNode = overlay.querySelector(`#${labelledBy}`);
        expect(titleNode).not.toBeNull();
        expect(titleNode!.textContent).toBe(next!.title);
        // The visible OnboardingStep heading is also still present
        // (sibling component untouched by Lane E).
        expect(getByTestId('onboarding-step')).toBeTruthy();
        unmount();
    });

    it('T3 — focus trap captures document.activeElement on open, restores on unmount', () => {
        // Set up an opener button that owns focus before the overlay mounts.
        const opener = document.createElement('button');
        opener.setAttribute('data-testid', 'lane-e-opener');
        opener.textContent = 'Open';
        document.body.appendChild(opener);
        opener.focus();
        expect(document.activeElement).toBe(opener);

        const ipc = makeIpcStub();
        const { unmount } = render(
            createElement(OnboardingOverlay, { tutorialState: FRESH_STATE, ipc }),
        );

        // First focusable inside the overlay should now hold focus. The
        // overlay's authored skip+advance buttons are the targets; either
        // one is fine — assert focus moved away from the opener and into
        // the overlay subtree.
        const active = document.activeElement as HTMLElement | null;
        expect(active).not.toBe(opener);
        // First focusable in the overlay is the Skip button.
        expect(active?.getAttribute('data-testid')).toBe('onboarding-skip');

        // Unmount restores focus to the originator.
        unmount();
        expect(document.activeElement).toBe(opener);

        document.body.removeChild(opener);
    });

    it('T4 — ESC dismisses via ipc.dismissTutorial()', async () => {
        const ipc = makeIpcStub();
        const { unmount } = render(
            createElement(OnboardingOverlay, { tutorialState: FRESH_STATE, ipc }),
        );
        expect(ipc.dismissTutorial).not.toHaveBeenCalled();

        // Fire an ESC keydown at window level (the overlay listens at window
        // so a focused descendant still receives the dismiss).
        fireEvent.keyDown(window, { key: 'Escape' });

        // ipc.dismissTutorial() should have been invoked exactly once.
        expect(ipc.dismissTutorial).toHaveBeenCalledTimes(1);

        // Other IPC channels untouched.
        expect(ipc.advanceStep).not.toHaveBeenCalled();
        expect(ipc.restartTutorial).not.toHaveBeenCalled();

        unmount();
    });

    it('T5 — Tab cycles within overlay focusables (Tab on last → first; Shift+Tab on first → last)', () => {
        const ipc = makeIpcStub();
        const { getByTestId, unmount } = render(
            createElement(OnboardingOverlay, { tutorialState: FRESH_STATE, ipc }),
        );
        const overlay = getByTestId('onboarding-overlay');
        const skip = getByTestId('onboarding-skip') as HTMLButtonElement;
        const advance = getByTestId('onboarding-advance') as HTMLButtonElement;

        // Document-order focusables inside the overlay are [skip, advance]
        // (per OnboardingStep.tsx).
        // Forward cycle: focus the last (advance), press Tab → first (skip).
        advance.focus();
        expect(document.activeElement).toBe(advance);
        fireEvent.keyDown(overlay, { key: 'Tab' });
        expect(document.activeElement).toBe(skip);

        // Backward cycle: focus the first (skip), press Shift+Tab → last (advance).
        skip.focus();
        expect(document.activeElement).toBe(skip);
        fireEvent.keyDown(overlay, { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(advance);

        unmount();
    });

    it('T6 — static-grep determinism + lane-tag guards on OnboardingOverlay.tsx', () => {
        const rawSrc = readSrc('src/ui/map/components/onboarding/OnboardingOverlay.tsx');

        // Lane-tag wiring is searchable.
        expect(rawSrc).toMatch(/LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-E/);

        // Required a11y additions are wired.
        expect(rawSrc).toMatch(/role="dialog"/);
        expect(rawSrc).toMatch(/aria-modal="true"/);
        expect(rawSrc).toMatch(/aria-labelledby=\{titleId\}/);
        expect(rawSrc).toMatch(/onboarding-title-\$\{next\.id\}/);

        // ESC handler installs at window level and calls dismissTutorial.
        expect(rawSrc).toMatch(/window\.addEventListener\(\s*['"]keydown['"]/);
        expect(rawSrc).toMatch(/e\.key\s*!==\s*['"]Escape['"]/);
        expect(rawSrc).toMatch(/ipc\.dismissTutorial\(\)/);

        // Focus trap captures + restores via previousActiveRef.
        expect(rawSrc).toMatch(/previousActiveRef/);
        expect(rawSrc).toMatch(/document\.activeElement/);

        // Tutorial Lane B-subset auto-dismiss path is still present
        // (regression guard at the source level).
        expect(rawSrc).toMatch(/LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-B-SUBSET/);
        expect(rawSrc).toMatch(/isFinalStep\(next\.id\)/);

        // Determinism guards. Strip block / line comments first so
        // docstrings that mention forbidden tokens don't false-positive.
        const stripComments = (src: string): string =>
            src
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
        const codeOnly = stripComments(rawSrc);
        expect(codeOnly).not.toMatch(/Math\.random\s*\(/);
        expect(codeOnly).not.toMatch(/Date\.now\s*\(/);
        expect(codeOnly).not.toMatch(/new\s+Date\s*\(/);
        expect(codeOnly).not.toMatch(/localeCompare/);

        // Faction-symmetry: overlay must not bake faction tokens (matches
        // the A11y Lane A guard pattern).
        expect(rawSrc).not.toMatch(/\b(?:RBiH|HRHB|VRS|ARBiH|HVO)\b/);
    });

    it('T7 — Tutorial Lane B-subset auto-dismiss-on-step-8 still works (regression guard)', () => {
        // Construct the pre-step-8 state and verify the LANE-B-SUBSET
        // composition (advance + dismiss) still produces the expected net
        // state. Pure-helper assertion exercises the same identity Lane B
        // guarded; if Lane E broke the wiring this test would fail.
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

        const next = resolveNextStep(beforeStep8.completed_steps);
        expect(next).not.toBeNull();
        expect(next!.id).toBe('08_judge');
        expect(isFinalStep(next!.id)).toBe(true);

        const afterAdvance = applyAdvanceStepPure(beforeStep8, '08_judge');
        const afterDismiss = applyDismissPure(afterAdvance);

        // Net effect: dismissed=true, every step recorded.
        expect(afterDismiss.dismissed).toBe(true);
        expect(afterDismiss.completed_steps.length).toBe(ONBOARDING_STEPS.length);
        expect(afterDismiss.current_step).toBe('08_judge');

        // Sanity: only the final step is the final step.
        for (const step of ONBOARDING_STEPS) {
            if (step.id === '08_judge') continue;
            expect(isFinalStep(step.id)).toBe(false);
        }
    });
});
