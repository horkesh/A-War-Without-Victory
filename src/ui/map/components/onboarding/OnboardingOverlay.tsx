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
 *
 * **Accessibility (LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-E):** the overlay is
 * a modal dialog by semantics. Lane E layers the same a11y contract A11y
 * Lane A canonicalized for `<Modal>` (`src/ui/shared/Modal.tsx`, frozen)
 * directly into this full-overlay component:
 *   - `role="dialog"` + `aria-modal="true"` on the overlay root.
 *   - `aria-labelledby` referencing a deterministic id rendered inside the
 *     overlay subtree (`onboarding-title-<step.id>`).
 *   - Focus capture/restore: on open, the previously-focused element is
 *     captured and the first focusable descendant gains focus; on close,
 *     focus is restored to the originator.
 *   - Tab / Shift+Tab cycle within the overlay's focusable descendants.
 *   - ESC dismisses the tutorial via `ipc.dismissTutorial()`.
 *
 * Tutorial Lane B-subset's auto-dismiss-on-step-8 path (committed at
 * `c2dcec62`) is preserved byte-identical inside `onAdvance`.
 */

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
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
    /** IPC bridge. Pass null for local preview-only progression without persisted writes. */
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

/**
 * Selector for focusable descendants. Mirrors the canonical
 * FOCUSABLE_SELECTOR in `src/ui/shared/Modal.tsx` (A11y Lane A, frozen).
 * Replicated here rather than imported to keep Lane E's exclusive file
 * ownership intact (Modal.tsx must not be touched).
 */
const ONBOARDING_FOCUSABLE_SELECTOR: string = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface TutorialSpotlightRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

const SPOTLIGHT_PADDING = 12;

export function resolveTutorialSpotlightRect(targetToken: string | null | undefined): TutorialSpotlightRect | null {
    if (!targetToken || typeof document === 'undefined') return null;
    const selector = '[data-tutorial-step=' + JSON.stringify(targetToken) + ']';
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
        left: Math.max(0, Math.round(rect.left - SPOTLIGHT_PADDING)),
        top: Math.max(0, Math.round(rect.top - SPOTLIGHT_PADDING)),
        width: Math.round(rect.width + SPOTLIGHT_PADDING * 2),
        height: Math.round(rect.height + SPOTLIGHT_PADDING * 2),
    };
}

function getOverlayFocusables(root: HTMLElement | null): HTMLElement[] {
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(ONBOARDING_FOCUSABLE_SELECTOR));
}

export function OnboardingOverlay(props: OnboardingOverlayProps): JSX.Element | null {
    const { tutorialState, ipc } = props;
    const [pending, setPending] = useState(false);
    const [previewTutorialState, setPreviewTutorialState] = useState<TutorialStateShape | null>(null);
    const [spotlightRect, setSpotlightRect] = useState<TutorialSpotlightRect | null>(null);

    // LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-E refs.
    // overlayRef: the overlay root, used by the focus trap and Tab cycle.
    // previousActiveRef: the element focused when the overlay opens, restored
    //   on unmount. Mirrors A11y Lane A `Modal.tsx` focus-restoration pattern.
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const previousActiveRef = useRef<HTMLElement | null>(null);

    const effectiveTutorialState = ipc ? tutorialState : (previewTutorialState ?? tutorialState);
    const visible = shouldShowOnboarding(effectiveTutorialState);
    const completed = effectiveTutorialState?.completed_steps ?? [];
    const next = visible ? resolveNextStep(completed) : null;
    const active = visible && next !== null;

    useEffect(() => {
        if (!active || !next) {
            setSpotlightRect(null);
            return;
        }
        const update = () => setSpotlightRect(resolveTutorialSpotlightRect(next.target_ui_element));
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [active, next]);

    // LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-E — focus capture + restore + first-
    // focusable focus on open. Effect runs while the overlay is `active`; the
    // cleanup restores prior focus when the overlay closes (either via
    // dismissTutorial flipping `tutorial_state.dismissed` or via running out
    // of steps). Determinism: pure DOM ops, no clock, no Math.random.
    useEffect(() => {
        if (!active) return;
        previousActiveRef.current = (typeof document !== 'undefined'
            ? (document.activeElement as HTMLElement | null)
            : null);
        const focusables = getOverlayFocusables(overlayRef.current);
        const target = focusables[0] ?? overlayRef.current;
        if (target && typeof target.focus === 'function') {
            target.focus();
        }
        return () => {
            const prior = previousActiveRef.current;
            if (prior && typeof prior.focus === 'function') {
                try {
                    prior.focus();
                } catch {
                    // Originator may have been unmounted — no-op.
                }
            }
            previousActiveRef.current = null;
        };
    }, [active]);

    // LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-E — ESC dismisses the tutorial via
    // `ipc.dismissTutorial()`. Installed at window level so a focused
    // descendant still receives the dismiss. Guarded on `pending` (no
    // double-fire mid-IPC) and on `ipc !== null` (headless preview no-op).
    useEffect(() => {
        if (!active) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (pending) return;
            e.preventDefault();
            e.stopPropagation();
            if (!ipc) {
                setPreviewTutorialState((prior) => applyDismissPure(prior ?? effectiveTutorialState));
                return;
            }
            setPending(true);
            // Fire-and-forget: ipc.dismissTutorial() is a pure synchronous
            // transform of meta.tutorial_state in the ipcMain handler, so
            // we do not block on the promise. `setPending(false)` resets
            // when the promise settles.
            ipc.dismissTutorial().finally(() => setPending(false));
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [active, pending, ipc, effectiveTutorialState]);

    if (!active || !next) return null;

    const indexOneBased = ONBOARDING_STEPS.findIndex(s => s.id === next.id) + 1;
    const total = ONBOARDING_STEPS.length;

    // Deterministic id used by `aria-labelledby` to resolve to the
    // visually-hidden step-title mirror rendered below. Stable across
    // renders for the same step id.
    const titleId = `onboarding-title-${next.id}`;

    const onAdvance = async () => {
        if (pending) return;
        if (!ipc) {
            setPreviewTutorialState((prior) => {
                const advanced = applyAdvanceStepPure(prior ?? effectiveTutorialState, next.id);
                return isFinalStep(next.id) ? applyDismissPure(advanced) : advanced;
            });
            return;
        }
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
        if (pending) return;
        if (!ipc) {
            setPreviewTutorialState((prior) => applyDismissPure(prior ?? effectiveTutorialState));
            return;
        }
        setPending(true);
        try {
            await ipc.dismissTutorial();
        } finally {
            setPending(false);
        }
    };

    // LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-E — Tab / Shift+Tab cycle inside
    // the overlay's focusable descendants. Mirrors A11y Lane A
    // `Modal.tsx`'s `handlePanelKeyDown`. Attached to the overlay root so
    // any keypress while focus is anywhere inside the overlay is handled.
    const onOverlayKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'Tab') return;
        const focusables = getOverlayFocusables(overlayRef.current);
        if (focusables.length === 0) {
            e.preventDefault();
            return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const current = (typeof document !== 'undefined'
            ? (document.activeElement as HTMLElement | null)
            : null);
        if (e.shiftKey && current === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && current === last) {
            e.preventDefault();
            first.focus();
        }
    };

    return (
        <div
            ref={overlayRef}
            data-testid="onboarding-overlay"
            data-tutorial-step={next.target_ui_element === null ? next.id : undefined}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onKeyDown={onOverlayKeyDown}
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
            {spotlightRect && (
                <>
                    <div
                        data-testid="onboarding-spotlight"
                        aria-hidden="true"
                        style={{
                            position: 'fixed',
                            left: spotlightRect.left,
                            top: spotlightRect.top,
                            width: spotlightRect.width,
                            height: spotlightRect.height,
                            border: '2px solid rgba(245, 158, 11, 0.95)',
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.42), 0 0 22px rgba(245, 158, 11, 0.55)',
                            borderRadius: 8,
                            pointerEvents: 'none',
                            zIndex: Z.HARD_MODAL + 1,
                        }}
                    />
                    <div
                        data-testid="onboarding-spotlight-arrow"
                        aria-hidden="true"
                        style={{
                            position: 'fixed',
                            left: spotlightRect.left + Math.min(32, Math.max(12, spotlightRect.width / 2 - 8)),
                            top: spotlightRect.top + spotlightRect.height + 8,
                            width: 0,
                            height: 0,
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderBottom: '12px solid rgba(245, 158, 11, 0.95)',
                            pointerEvents: 'none',
                            zIndex: Z.HARD_MODAL + 1,
                        }}
                    />
                </>
            )}
            {/*
              * LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-E — visually-hidden title
              * mirror so `aria-labelledby` resolves inside the overlay's own
              * subtree. The visible title rendered by `OnboardingStep` is
              * untouched (Lane E does not modify the sibling component); a
              * second a11y-only mirror keeps the wiring deterministic and
              * does not require coupling between the two files. Screen
              * readers announce the dialog name from this element.
              */}
            <h2
                id={titleId}
                data-testid="onboarding-title-mirror"
                style={{
                    position: 'absolute',
                    width: 1,
                    height: 1,
                    padding: 0,
                    margin: -1,
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: 0,
                }}
            >
                {next.title}
            </h2>
            <OnboardingStep
                step={next}
                indexOneBased={indexOneBased}
                total={total}
                disabled={pending}
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
