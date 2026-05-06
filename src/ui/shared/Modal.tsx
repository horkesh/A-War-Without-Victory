/**
 * Shared `<Modal>` wrapper — single canonical owner of modal entry/exit
 * transitions, ESC dismissal, focus management, and aria semantics.
 *
 * ─── Authority ─────────────────────────────────────────────────────────────
 * Per `docs/40_reports/audits/20260505_V094_PHASE_1_2_UI_SHELL_AUDIT.md`
 * §3.1 P1-B (modal entry/exit transitions), P1-F (ESC dismissal
 * consistency), P1-J (focus management in modal stack). Audit identified
 * inconsistent modal entry/exit transitions, ad-hoc ESC handling, and
 * inconsistent focus management across ~12 modals — each shipped with
 * its own bespoke `useEffect(window.addEventListener('keydown', ...))`
 * pattern, custom backdrop, and no unified focus return.
 *
 * This wrapper centralizes those concerns so callers get correct behavior
 * by default, and migrating modals can shed their bespoke handlers.
 *
 * ─── Dismissibility (LANE-V094-MODAL-DISMISSIBLE-EXTENSION) ───────────────
 * `onClose` is OPTIONAL and `dismissible` (default `true`) is the master
 * switch for user-initiated dismissal. Callers that omit both inherit the
 * Wave 1 contract (ESC + click-outside fire `onClose` if provided; no-op
 * if not). Callers that pass `dismissible={false}` opt out of both ESC
 * and click-outside handlers entirely — the modal can ONLY be closed by
 * the parent flipping `isOpen={false}` after a response action. Used by
 * terminal modals (Game Over) and must-respond modals (Peace Plan, Dayton
 * negotiation, Event decision). See the `dismissible` prop JSDoc for the
 * full behavior matrix.
 *
 * ─── Faction-symmetric mechanism ──────────────────────────────────────────
 * Modal styling is data — no faction-specific branching. Backdrop / panel
 * colors are derived from the existing palette tokens (`bg-panel-bg`,
 * `border-panel-border`, etc.). No faction palette mutation.
 *
 * ─── Z-index ───────────────────────────────────────────────────────────────
 * Backdrop and panel z-index are sourced from the canonical
 * `src/ui/shared/zIndex.ts` module. Callers pass a `zIndex` prop (defaults
 * to `Z.MODAL`) so the wrapper does not lock callers into a specific tier.
 *
 * ─── Determinism ───────────────────────────────────────────────────────────
 * Pure render. No `Math.random`, no `Date.now`, no closures over mutable
 * state. Animation is CSS-driven (no JS-side timers).
 *
 * ─── Tutorial onboarding compatibility ────────────────────────────────────
 * The wrapper renders backdrop + panel as siblings of the children
 * subtree — it does NOT inject extra DOM into the children, so any
 * `data-tutorial-step` anchor inside a migrated modal is preserved
 * unchanged. The wrapper itself does not carry a `data-tutorial-step`
 * attribute.
 *
 * ─── Sensitive-history compliance ──────────────────────────────────────────
 * Ring 1, faction-agnostic mechanism, no §6 surface. UI-only — does NOT
 * enter sim path. No `political_controllers`, `OOB`, paint anchor,
 * rupture wiring, or `enclave_resilience.ts` touched.
 */
import React, { useEffect, useRef } from 'react';
import { Z } from './zIndex';

export interface ModalProps {
    /**
     * Controls whether the modal is rendered. When `false`, the component
     * returns `null` (no DOM weight). Migration parity with the existing
     * `isOpen` prop pattern used by 12+ modals.
     */
    isOpen: boolean;
    /**
     * Called when the user dismisses the modal (ESC key, click-outside, or
     * close button via the panel). Migrating modals pass their existing
     * `onClose` / `onDismiss` here. Optional — terminal / must-respond
     * modals may omit it together with `dismissible={false}`.
     *
     * Behavior:
     *   - `dismissible !== false` and `onClose` provided: existing behavior
     *     identical to the original (Wave 1) contract.
     *   - `dismissible !== false` and `onClose` undefined: ESC + click-outside
     *     fire no-op; consumer can omit `onClose` without crashing.
     *   - `dismissible === false`: handlers not installed at all; `onClose`
     *     may be undefined. Modal is closed only by the parent flipping
     *     `isOpen={false}` (e.g., after a response action).
     */
    onClose?: () => void;
    /**
     * Master switch for user-initiated dismissal. Defaults to `true`.
     *
     *   - `true` (default): existing semantics — `closeOnEscape` and
     *     `closeOnBackdropClick` apply.
     *   - `false`: ESC + click-outside are both disabled regardless of
     *     `closeOnEscape` / `closeOnBackdropClick`. Use for terminal
     *     modals (Game Over) and must-respond modals (Peace Plan, Dayton
     *     negotiation, Event decision) where the only valid close path
     *     is the parent flipping `isOpen={false}` after a response.
     *
     * Examples:
     *   `<Modal isOpen={open} onClose={close} />`              // dismissible
     *   `<Modal isOpen={open} dismissible={false}>...</Modal>` // must-respond
     *   `<Modal isOpen={open} dismissible={false}>...</Modal>` // terminal
     *
     * Backward-compatibility: callers that omit `dismissible` get
     * `dismissible=true` and identical behavior to the pre-extension wrapper.
     */
    dismissible?: boolean;
    /**
     * Children rendered inside the panel. Migrating modals lift their
     * panel-content subtree directly into here.
     */
    children: React.ReactNode;
    /**
     * Numeric z-index for the backdrop. Panel sits one tier above the
     * backdrop via `zIndex + 1` (no extra token needed; modals are
     * rendered as backdrop > panel siblings inside one fixed wrapper).
     * Defaults to `Z.MODAL`.
     */
    zIndex?: number;
    /**
     * Whether ESC dismisses the modal. Defaults to `true`.
     */
    closeOnEscape?: boolean;
    /**
     * Whether clicking the backdrop dismisses the modal. Defaults to
     * `true`.
     */
    closeOnBackdropClick?: boolean;
    /**
     * Whether to trap focus inside the modal panel. When `true`, the first
     * focusable element inside the panel is focused on open, and focus is
     * restored to the previous active element on close. Defaults to
     * `true`.
     */
    trapFocus?: boolean;
    /**
     * Optional `aria-labelledby` referencing an `id` on a heading inside
     * the panel.
     */
    ariaLabelledBy?: string;
    /**
     * Optional `aria-label` (used when no labelledby ID is available).
     */
    ariaLabel?: string;
    /**
     * Optional `aria-describedby` referencing an `id` on a description
     * element inside the panel. Per LANE-NIGHTSHIFT-V093-A11Y-LANE-A
     * (Phase 1 ACs from
     * `docs/40_reports/audits/20260506_V093_A11Y_PHASE_0_PANEL.md`):
     * additive, defaults `undefined`. Existing callers unaffected.
     */
    ariaDescribedBy?: string;
    /**
     * Optional className applied to the backdrop element. Migrating
     * modals can pass their existing backdrop styling here (e.g.
     * `bg-black/60`, `bg-black/70 backdrop-blur-sm`).
     */
    backdropClassName?: string;
    /**
     * Optional className applied to the panel container element.
     * Migrating modals pass their existing panel styling here.
     */
    panelClassName?: string;
    /**
     * Optional inline style applied to the panel container.
     */
    panelStyle?: React.CSSProperties;
    /**
     * Optional `data-testid` applied to the backdrop for test harnesses.
     */
    testIdBackdrop?: string;
    /**
     * Optional `data-testid` applied to the panel for test harnesses.
     */
    testIdPanel?: string;
}

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Resolve focusable elements within a panel, in document order.
 */
function getFocusableElements(panel: HTMLElement | null): HTMLElement[] {
    if (!panel) return [];
    return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Shared Modal wrapper. See file header for design rationale.
 */
export function Modal({
    isOpen,
    onClose,
    children,
    zIndex = Z.MODAL,
    dismissible = true,
    closeOnEscape = true,
    closeOnBackdropClick = true,
    trapFocus = true,
    ariaLabelledBy,
    ariaLabel,
    ariaDescribedBy,
    backdropClassName,
    panelClassName,
    panelStyle,
    testIdBackdrop,
    testIdPanel,
}: ModalProps): React.ReactElement | null {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const previousActiveRef = useRef<HTMLElement | null>(null);

    // ESC dismissal — installed at window level so a focused interactive
    // element inside the panel still receives the dismiss.
    // `dismissible === false` is a master switch that force-skips this
    // effect regardless of `closeOnEscape`. When `onClose` is undefined the
    // dismiss is a no-op (no crash) — consistent with the optional contract.
    useEffect(() => {
        if (!isOpen || !dismissible || !closeOnEscape) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose?.();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, dismissible, closeOnEscape, onClose]);

    // Focus management — focus first focusable on open; restore prior
    // focus on close.
    useEffect(() => {
        if (!isOpen || !trapFocus) return;
        // Capture the previously-focused element so we can restore on
        // close.
        previousActiveRef.current = (typeof document !== 'undefined'
            ? (document.activeElement as HTMLElement | null)
            : null);
        // Focus the first focusable child of the panel, or the panel
        // itself if no children are focusable.
        const focusables = getFocusableElements(panelRef.current);
        const target = focusables[0] ?? panelRef.current;
        if (target && typeof target.focus === 'function') {
            target.focus();
        }
        return () => {
            // Restore focus to the originator on close.
            const prior = previousActiveRef.current;
            if (prior && typeof prior.focus === 'function') {
                try {
                    prior.focus();
                } catch {
                    // Element may have been removed from the DOM — no-op.
                }
            }
            previousActiveRef.current = null;
        };
    }, [isOpen, trapFocus]);

    // Tab-trap inside the panel: cycle Tab / Shift+Tab through focusable
    // descendants without escaping into background DOM.
    const handlePanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!trapFocus) return;
        if (e.key !== 'Tab') return;
        const focusables = getFocusableElements(panelRef.current);
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

    if (!isOpen) return null;

    // Backdrop click — disabled when `dismissible === false` (master switch),
    // even if `closeOnBackdropClick` is true. When `onClose` is undefined the
    // dismiss is a no-op so consumers can omit it on terminal / must-respond
    // modals without crashing.
    const handleBackdropClick = () => {
        if (!dismissible || !closeOnBackdropClick) return;
        onClose?.();
    };

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center modal-fade-in ${backdropClassName ?? 'bg-black/60'}`}
            style={{ zIndex }}
            onClick={handleBackdropClick}
            data-testid={testIdBackdrop ?? 'modal-backdrop'}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={ariaLabelledBy}
                aria-label={ariaLabel}
                aria-describedby={ariaDescribedBy}
                tabIndex={-1}
                className={`modal-panel-in ${panelClassName ?? ''}`}
                style={{ ...(panelStyle ?? {}), zIndex: zIndex + 1 }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handlePanelKeyDown}
                data-testid={testIdPanel ?? 'modal-panel'}
            >
                {children}
            </div>
        </div>
    );
}
