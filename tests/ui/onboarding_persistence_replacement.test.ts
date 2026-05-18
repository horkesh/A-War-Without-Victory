// @vitest-environment jsdom
/**
 * UI-6 onboarding persistence — current-owner coverage (Batch 45).
 *
 * Migrates the legacy `FirstTurnOrientationCard` persistence coverage
 * onto the current onboarding surface (`OnboardingOverlay`, the only
 * mounted first-run owner per `tests/ui/onboarding_track_d_consolidation.test.ts`).
 *
 * Legacy assertion (now retired): dismissing the orientation card must
 * not write to browser localStorage — first-session state lives in the
 * caller-owned session, not the browser.
 *
 * Current owner equivalent: dismissing the OnboardingOverlay must
 * route through the IPC bridge (`tutorial:dismiss`) and must not write
 * to localStorage. Persistence flows into `StateMeta.tutorial_state`
 * via the IPC handler — never via localStorage. This test pins both
 * properties so any drift back toward localStorage is blocked.
 *
 * Plan: docs/plans/2026-05-18-autonomous-ui-product-lane-bank.md UI-6.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';

import {
    OnboardingOverlay,
    type OnboardingIpcBridge,
    type TutorialStateShape,
} from '../../src/ui/map/components/onboarding/OnboardingOverlay';

function freshState(): TutorialStateShape {
    return { dismissed: false, completed_steps: [] };
}

function stubIpc(): OnboardingIpcBridge & { dismissTutorial: ReturnType<typeof vi.fn> } {
    return {
        dismissTutorial: vi.fn().mockResolvedValue({ ok: true }),
        advanceStep: vi.fn().mockResolvedValue({ ok: true }),
        restartTutorial: vi.fn().mockResolvedValue({ ok: true }),
    };
}

describe('OnboardingOverlay persistence (UI-6 / Batch 45 replacement for legacy first-turn card)', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        window.localStorage.clear();
    });

    it('routes dismissal through the IPC bridge and never writes to localStorage', async () => {
        const setItem = vi.spyOn(window.localStorage.__proto__, 'setItem');
        const ipc = stubIpc();

        render(createElement(OnboardingOverlay, {
            tutorialState: freshState(),
            ipc,
        }));

        // ESC dismisses the overlay (canonical Lane E dismissal path).
        fireEvent.keyDown(window, { key: 'Escape' });

        // The dismiss IPC was invoked exactly once.
        expect(ipc.dismissTutorial).toHaveBeenCalledTimes(1);
        // No localStorage write occurred during dismissal.
        expect(setItem).not.toHaveBeenCalled();
        expect(window.localStorage.getItem('awwv_seen_first_turn_intro')).toBeNull();
        // The legacy localStorage key from the retired FirstTurnOrientationCard
        // must remain absent — no compatibility shim.
        expect(window.localStorage.getItem('awwv.tutorial.dismissed')).toBeNull();
    });

    it('does not render when tutorial_state.dismissed === true (already-seen save load)', () => {
        const ipc = stubIpc();

        render(createElement(OnboardingOverlay, {
            tutorialState: { dismissed: true, completed_steps: [] },
            ipc,
        }));

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(ipc.dismissTutorial).not.toHaveBeenCalled();
    });

    it('renders for a fresh save (tutorial_state is null/undefined → treated as not yet seen)', () => {
        const ipc = stubIpc();

        render(createElement(OnboardingOverlay, {
            tutorialState: null,
            ipc,
        }));

        expect(screen.getByRole('dialog')).toBeTruthy();
    });
});
