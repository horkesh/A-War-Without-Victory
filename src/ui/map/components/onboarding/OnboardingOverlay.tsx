/**
 * v0.9.2 tutorial onboarding skeleton — root overlay.
 *
 * LANE-NIGHTSHIFT-ROUND2-TUTORIAL-ONBOARDING-SKELETON.
 *
 * Single-owner: this component is the only renderer of the onboarding overlay.
 * Reads `meta.tutorial_state` from the supplied state-shape; writes via the
 * IPC bridge (`tutorial:dismiss`, `tutorial:advance-step`).
 *
 * Visibility predicate: render only when `tutorial_state?.dismissed !== true`.
 * Absent/undefined `tutorial_state` is treated as "not yet dismissed" so the
 * overlay shows on a fresh campaign.
 *
 * Faction-agnostic. Not gated by `meta.player_faction`.
 *
 * Determinism: step order from `onboardingSteps.ts` (array index). No clock,
 * no Math.random.
 */

import { useState } from 'react';
import { OnboardingStep } from './OnboardingStep';
import { ONBOARDING_STEPS, resolveNextStep } from './onboardingSteps';

/** Minimal tutorial-state shape mirrored from `StateMeta.tutorial_state`. */
export interface TutorialStateShape {
    dismissed: boolean;
    current_step?: string;
    completed_steps: string[];
}

/**
 * IPC bridge surface used by the overlay. The desktop bridge wires these to
 * `tutorial:dismiss` and `tutorial:advance-step` ipcMain handlers. Provided as
 * a prop so unit tests and storybook can inject stubs without an Electron host.
 */
export interface OnboardingIpcBridge {
    dismissTutorial: () => Promise<{ ok: boolean; error?: string }>;
    advanceStep: (stepId: string) => Promise<{ ok: boolean; error?: string }>;
}

export interface OnboardingOverlayProps {
    /** Current `meta.tutorial_state` value, or null/undefined for fresh save. */
    tutorialState: TutorialStateShape | null | undefined;
    /** IPC bridge. Pass null to disable writes (e.g. headless preview). */
    ipc: OnboardingIpcBridge | null;
}

/**
 * Visibility predicate. Exported for tests and the App shell so callers can
 * short-circuit before mounting the overlay.
 */
export function shouldShowOnboarding(state: TutorialStateShape | null | undefined): boolean {
    if (!state) return true;
    return state.dismissed !== true;
}

export function OnboardingOverlay(props: OnboardingOverlayProps): JSX.Element | null {
    const { tutorialState, ipc } = props;
    const [pending, setPending] = useState(false);

    if (!shouldShowOnboarding(tutorialState)) return null;

    const completed = tutorialState?.completed_steps ?? [];
    const next = resolveNextStep(completed);

    // All steps done but not yet dismissed — auto-dismiss path is owned by the
    // App shell / IPC handler; here we just render nothing rather than show a
    // stale step. The shell may then call dismissTutorial().
    if (!next) return null;

    const indexOneBased = ONBOARDING_STEPS.findIndex(s => s.id === next.id) + 1;
    const total = ONBOARDING_STEPS.length;

    const onAdvance = async () => {
        if (pending || !ipc) return;
        setPending(true);
        try {
            await ipc.advanceStep(next.id);
        } finally {
            setPending(false);
        }
    };

    const onSkip = async () => {
        if (pending || !ipc) return;
        setPending(true);
        try {
            await ipc.dismissTutorial();
        } finally {
            setPending(false);
        }
    };

    return (
        <div
            data-testid="onboarding-overlay"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9000,
                pointerEvents: 'auto',
            }}
        >
            <OnboardingStep
                step={next}
                indexOneBased={indexOneBased}
                total={total}
                disabled={pending || !ipc}
                onAdvance={onAdvance}
                onSkip={onSkip}
            />
        </div>
    );
}
