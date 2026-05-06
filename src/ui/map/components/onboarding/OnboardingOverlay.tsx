/**
 * v0.9.2 tutorial onboarding — root overlay (LANE-NIGHTSHIFT-TUTORIAL-CONTENT-V1).
 *
 * Single-owner: this component is the only renderer of the onboarding overlay.
 * Reads `meta.tutorial_state` from the supplied state-shape; writes via the
 * IPC bridge (`tutorial:dismiss`, `tutorial:advance-step`, `tutorial:restart`).
 *
 * Visibility predicate: render only when `tutorial_state?.dismissed !== true`.
 * Absent/undefined `tutorial_state` is treated as "not yet dismissed" so the
 * overlay shows on a fresh campaign.
 *
 * **Faction-agnostic.** Not gated by `meta.player_faction`.
 *
 * **Determinism:** step order from `onboardingSteps.ts` (lexicographic sort
 * by id). No clock, no Math.random.
 *
 * **Restart affordance:** when the tutorial is `dismissed` OR all steps are
 * complete, callers may render a small "Restart Tutorial" button via the
 * exported `OnboardingRestartButton`. The overlay itself does not re-show
 * automatically after dismissal — restart is an explicit player action.
 */

import { useState } from 'react';
import { OnboardingStep } from './OnboardingStep';
import { ONBOARDING_STEPS, resolveNextStep } from './onboardingSteps';
import { Z } from '../../../shared/zIndex';

/** Minimal tutorial-state shape mirrored from `StateMeta.tutorial_state`. */
export interface TutorialStateShape {
    dismissed: boolean;
    current_step?: string;
    completed_steps: string[];
}

/**
 * IPC bridge surface used by the overlay. The desktop bridge wires these to
 * `tutorial:dismiss`, `tutorial:advance-step`, and `tutorial:restart`
 * ipcMain handlers. Provided as a prop so unit tests and storybook can inject
 * stubs without an Electron host.
 */
export interface OnboardingIpcBridge {
    dismissTutorial: () => Promise<{ ok: boolean; error?: string }>;
    advanceStep: (stepId: string) => Promise<{ ok: boolean; error?: string }>;
    restartTutorial: () => Promise<{ ok: boolean; error?: string }>;
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

/**
 * Pure helper used by tests and any restart-affordance UI. Builds the next
 * tutorial state for a "restart" action: `dismissed=false`, `current_step`
 * cleared, `completed_steps=[]`. Mirrors the `tutorial:restart` IPC handler.
 */
export function applyRestart(_prior: TutorialStateShape | null | undefined): TutorialStateShape {
    return {
        dismissed: false,
        current_step: undefined,
        completed_steps: [],
    };
}

/**
 * Pure helper used by tests. Mirrors the `tutorial:dismiss` IPC handler:
 * sets `dismissed=true` and preserves prior fields (current_step, completed_steps).
 */
export function applyDismissPure(prior: TutorialStateShape | null | undefined): TutorialStateShape {
    const safe = prior ?? { dismissed: false, completed_steps: [] };
    return {
        dismissed: true,
        current_step: safe.current_step,
        completed_steps: Array.isArray(safe.completed_steps) ? safe.completed_steps.slice() : [],
    };
}

/**
 * Pure helper used by tests. Mirrors the `tutorial:advance-step` IPC handler:
 * idempotent append of `stepId` to `completed_steps`; sets `current_step`
 * to the most recent stepId. `dismissed` is preserved from prior.
 *
 * Determinism: linear scan + slice; no clock, no Math.random.
 */
export function applyAdvanceStepPure(
    prior: TutorialStateShape | null | undefined,
    stepId: string,
): TutorialStateShape {
    const safe = prior ?? { dismissed: false, completed_steps: [] };
    const completed = Array.isArray(safe.completed_steps) ? safe.completed_steps.slice() : [];
    if (!completed.includes(stepId)) {
        completed.push(stepId);
    }
    return {
        dismissed: safe.dismissed === true,
        current_step: stepId,
        completed_steps: completed,
    };
}

/**
 * LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-B-SUBSET — auto-dismiss on final step.
 *
 * Predicate used by `OnboardingOverlay`'s onAdvance handler to decide whether
 * the player has just completed the *final* authored step. When this returns
 * `true`, the overlay must (after appending the final step via
 * `tutorial:advance-step`) also invoke `tutorial:dismiss` so the overlay does
 * not invisibly re-show on next launch.
 *
 * Pure / deterministic: compares the supplied stepId against
 * `ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1].id` from the canonical
 * lexicographically-sorted list. No clock, no Math.random.
 */
export function isFinalStep(stepId: string): boolean {
    const last = ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1];
    return !!last && last.id === stepId;
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
            // LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-B-SUBSET: auto-dismiss on
            // final step. After appending the last authored step to
            // `completed_steps`, also write `dismissed=true` so the overlay
            // does not invisibly re-show on next launch (resolveNextStep
            // returns null past step 8 → overlay would render null forever
            // with `dismissed=false`). Two IPC writes (advance + dismiss)
            // are deterministic and idempotent: each ipcMain handler is
            // a pure synchronous transform of the canonical state.
            if (isFinalStep(next.id)) {
                await ipc.dismissTutorial();
            }
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
            data-tutorial-step={next.target_ui_element === null ? next.id : undefined}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: Z.HARD_MODAL,
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

/**
 * Standalone "Restart Tutorial" button. Renders a small affordance the App
 * shell can mount in (e.g.) the Help menu. Click invokes the
 * `tutorial:restart` IPC handler which clears completed_steps and
 * dismissed flags — the overlay then re-mounts at step 1 on the next render.
 *
 * Faction-agnostic. Single-owner: this is the only canonical restart button.
 */
export interface OnboardingRestartButtonProps {
    ipc: OnboardingIpcBridge | null;
    /** Optional callback fired after restart succeeds (for telemetry / focus). */
    onRestart?: () => void;
}

export function OnboardingRestartButton(props: OnboardingRestartButtonProps): JSX.Element {
    const { ipc, onRestart } = props;
    const [pending, setPending] = useState(false);

    const handleClick = async () => {
        if (pending || !ipc) return;
        setPending(true);
        try {
            const result = await ipc.restartTutorial();
            if (result?.ok && onRestart) onRestart();
        } finally {
            setPending(false);
        }
    };

    return (
        <button
            type="button"
            data-testid="onboarding-restart"
            onClick={handleClick}
            disabled={pending || !ipc}
            style={{
                background: 'transparent',
                color: '#cdb98c',
                border: '1px solid rgba(205, 185, 140, 0.5)',
                borderRadius: 3,
                padding: '4px 10px',
                fontSize: 11,
                cursor: pending || !ipc ? 'wait' : 'pointer',
            }}
        >
            Restart Tutorial
        </button>
    );
}
