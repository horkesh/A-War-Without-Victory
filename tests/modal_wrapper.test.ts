// @vitest-environment jsdom
/**
 * LANE-V094-MODAL-WRAPPER — shared <Modal> wrapper render + behavior contract.
 *
 * Direct-mount proof of the canonical Modal wrapper. The wrapper centralizes
 * modal entry/exit transitions, ESC dismissal, click-outside dismissal,
 * focus trap (focus-first-on-open + restore-on-close + Tab cycle), aria
 * semantics (role="dialog", aria-modal=true, aria-labelledby), and z-index
 * canonicalization via `src/ui/shared/zIndex.ts`.
 *
 * Contracts:
 *   T1  — renders nothing when isOpen=false
 *   T2  — renders backdrop + panel when isOpen=true with role/aria attrs
 *   T3  — ESC key invokes onClose by default; respects closeOnEscape=false
 *   T4  — clicking backdrop invokes onClose by default; respects
 *         closeOnBackdropClick=false; clicks inside panel do NOT dismiss
 *   T5  — focus-trap: first focusable inside panel is focused on open;
 *         original focus is restored on close
 *   T6  — aria-labelledby propagates to the dialog node
 *   T7  — z-index sourced from canonical Z module (no hard-coded literals
 *         leak into the rendered HTML)
 *   T8  — pure / deterministic: same props yield byte-identical static HTML
 *   T9  — faction-symmetric mechanism: no faction tokens / RGBs in output
 *  T10  — children pass through unchanged (DOM structure preserved for
 *         tutorial `data-tutorial-step` anchors)
 *
 * No engine path; no store reads; no IPC.
 */
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fireEvent, render } from '@testing-library/react';
import { Modal } from '../src/ui/shared/Modal';
import { Z } from '../src/ui/shared/zIndex';

describe('Modal — shared wrapper render + behavior contract', () => {
    it('T1 — renders nothing when isOpen=false', () => {
        const onClose = vi.fn();
        const html = renderToStaticMarkup(
            createElement(Modal, { isOpen: false, onClose, children: createElement('div', {}, 'hidden') }),
        );
        expect(html).toBe('');
    });

    it('T2 — renders backdrop + panel with role=dialog and aria-modal when isOpen=true', () => {
        const onClose = vi.fn();
        const html = renderToStaticMarkup(
            createElement(Modal, {
                isOpen: true,
                onClose,
                children: createElement('div', {}, 'visible'),
            }),
        );
        expect(html).toContain('role="dialog"');
        expect(html).toContain('aria-modal="true"');
        expect(html).toContain('data-testid="modal-backdrop"');
        expect(html).toContain('data-testid="modal-panel"');
        expect(html).toContain('visible');
    });

    it('T3 — ESC key invokes onClose by default; respects closeOnEscape=false', () => {
        // Default — ESC closes.
        const onCloseA = vi.fn();
        const { unmount: unmountA } = render(
            createElement(Modal, {
                isOpen: true,
                onClose: onCloseA,
                children: createElement('div', {}, 'x'),
            }),
        );
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onCloseA).toHaveBeenCalledTimes(1);
        unmountA();

        // closeOnEscape=false — ESC does nothing.
        const onCloseB = vi.fn();
        const { unmount: unmountB } = render(
            createElement(Modal, {
                isOpen: true,
                onClose: onCloseB,
                closeOnEscape: false,
                children: createElement('div', {}, 'x'),
            }),
        );
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onCloseB).not.toHaveBeenCalled();
        unmountB();
    });

    it('T4 — backdrop click dismisses; closeOnBackdropClick=false suppresses; panel-internal clicks do NOT dismiss', () => {
        // Default — backdrop click closes.
        const onCloseA = vi.fn();
        const { getByTestId, unmount: unmountA } = render(
            createElement(Modal, {
                isOpen: true,
                onClose: onCloseA,
                children: createElement('button', { type: 'button', 'data-testid': 'inner-btn' }, 'inside'),
            }),
        );
        const backdrop = getByTestId('modal-backdrop');
        fireEvent.click(backdrop);
        expect(onCloseA).toHaveBeenCalledTimes(1);

        // Click inside panel — does NOT close.
        const panel = getByTestId('modal-panel');
        fireEvent.click(panel);
        expect(onCloseA).toHaveBeenCalledTimes(1);

        // Click on a button inside the panel — does NOT close (stopPropagation).
        const innerBtn = getByTestId('inner-btn');
        fireEvent.click(innerBtn);
        expect(onCloseA).toHaveBeenCalledTimes(1);
        unmountA();

        // closeOnBackdropClick=false — backdrop click does not close.
        const onCloseB = vi.fn();
        const { getByTestId: getB, unmount: unmountB } = render(
            createElement(Modal, {
                isOpen: true,
                onClose: onCloseB,
                closeOnBackdropClick: false,
                children: createElement('div', {}, 'x'),
            }),
        );
        fireEvent.click(getB('modal-backdrop'));
        expect(onCloseB).not.toHaveBeenCalled();
        unmountB();
    });

    it('T5 — focus trap: first focusable child is focused on open; prior focus restored on close', () => {
        // Pre-mount a button outside the modal and focus it; this is the
        // "originator" that should regain focus when the modal closes.
        const externalBtn = document.createElement('button');
        externalBtn.setAttribute('data-testid', 'external-trigger');
        externalBtn.textContent = 'Open Modal';
        document.body.appendChild(externalBtn);
        externalBtn.focus();
        expect(document.activeElement).toBe(externalBtn);

        const onClose = vi.fn();
        const { getByTestId, rerender, unmount } = render(
            createElement(Modal, {
                isOpen: true,
                onClose,
                children: createElement(
                    'div',
                    {},
                    createElement('button', { type: 'button', 'data-testid': 'first-btn' }, 'First'),
                    createElement('button', { type: 'button', 'data-testid': 'second-btn' }, 'Second'),
                ),
            }),
        );

        // First focusable inside the panel should now have focus.
        const firstBtn = getByTestId('first-btn');
        expect(document.activeElement).toBe(firstBtn);

        // Close the modal — focus should restore to the originator.
        rerender(
            createElement(Modal, {
                isOpen: false,
                onClose,
                children: createElement('div', {}),
            }),
        );
        expect(document.activeElement).toBe(externalBtn);

        unmount();
        document.body.removeChild(externalBtn);
    });

    it('T6 — aria-labelledby propagates to the dialog node', () => {
        const onClose = vi.fn();
        const html = renderToStaticMarkup(
            createElement(Modal, {
                isOpen: true,
                onClose,
                ariaLabelledBy: 'my-headline',
                children: createElement('h2', { id: 'my-headline' }, 'My Headline'),
            }),
        );
        expect(html).toContain('aria-labelledby="my-headline"');
        expect(html).toContain('id="my-headline"');
    });

    it('T7 — z-index sourced from canonical Z module (no hard-coded literals)', () => {
        const onClose = vi.fn();
        // Default — uses Z.MODAL (1000) for backdrop, +1 for panel.
        const defaultHtml = renderToStaticMarkup(
            createElement(Modal, {
                isOpen: true,
                onClose,
                children: createElement('div', {}, 'x'),
            }),
        );
        expect(defaultHtml).toMatch(/z-index\s*:\s*1000/);
        expect(defaultHtml).toMatch(/z-index\s*:\s*1001/);

        // Explicit zIndex=Z.CRITICAL_MODAL (9999) — uses 9999 for backdrop, 10000 for panel.
        const criticalHtml = renderToStaticMarkup(
            createElement(Modal, {
                isOpen: true,
                onClose,
                zIndex: Z.CRITICAL_MODAL,
                children: createElement('div', {}, 'x'),
            }),
        );
        expect(criticalHtml).toMatch(/z-index\s*:\s*9999/);
        expect(criticalHtml).toMatch(/z-index\s*:\s*10000/);

        // Sanity-check: canonical Z module is the source of truth.
        expect(Z.MODAL).toBe(1000);
        expect(Z.CRITICAL_MODAL).toBe(9999);
    });

    it('T8 — pure / deterministic: same props yield byte-identical static HTML', () => {
        const onClose = vi.fn();
        const a = renderToStaticMarkup(
            createElement(Modal, {
                isOpen: true,
                onClose,
                ariaLabelledBy: 'h1',
                children: createElement('h2', { id: 'h1' }, 'X'),
            }),
        );
        const b = renderToStaticMarkup(
            createElement(Modal, {
                isOpen: true,
                onClose,
                ariaLabelledBy: 'h1',
                children: createElement('h2', { id: 'h1' }, 'X'),
            }),
        );
        expect(b).toBe(a);
    });

    it('T9 — faction-symmetric mechanism: no faction tokens / RGBs in default output', () => {
        const onClose = vi.fn();
        const html = renderToStaticMarkup(
            createElement(Modal, {
                isOpen: true,
                onClose,
                children: createElement('div', {}, 'x'),
            }),
        );
        // No faction tokens.
        expect(html).not.toMatch(/RBiH|HRHB|VRS|ARBiH|HVO/i);
        // No raw faction RGB values (canonical FACTION_GLOW_RGB / theme hex).
        expect(html).not.toMatch(/#c04040|#4a9a55|#4080b8|#c24040/);
    });

    it('T10 — children pass through unchanged (preserves DOM for tutorial anchors)', () => {
        const onClose = vi.fn();
        const html = renderToStaticMarkup(
            createElement(Modal, {
                isOpen: true,
                onClose,
                children: createElement(
                    'section',
                    { 'data-tutorial-step': 'sample-anchor' },
                    createElement('h3', { id: 'sample-h' }, 'Tutorial Anchor'),
                ),
            }),
        );
        // The migration must not strip data-tutorial-step from migrated
        // modals. Wrapper renders children verbatim.
        expect(html).toContain('data-tutorial-step="sample-anchor"');
        expect(html).toContain('id="sample-h"');
        expect(html).toContain('Tutorial Anchor');
    });
});
