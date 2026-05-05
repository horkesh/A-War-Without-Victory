// @vitest-environment jsdom
/**
 * LANE-V094-MODAL-DISMISSIBLE-EXTENSION — substrate test for the
 * `<Modal>` wrapper's `dismissible` prop + optional `onClose` extension.
 *
 * Successor lane to LANE-V094-MODAL-MIGRATION-2 (Wave 2 ship). This file
 * pins the extended substrate contract:
 *
 *   D1  — `dismissible=true` (default) AND `onClose` provided: ESC + click-
 *         outside fire `onClose` (Wave 1 backward-compat)
 *   D2  — `dismissible=true` (default) AND `onClose` undefined: ESC + click-
 *         outside fire as no-op (no crash)
 *   D3  — `dismissible=false`: ESC handler not installed (no `onClose` call,
 *         no propagation/stop on the keydown event)
 *   D4  — `dismissible=false`: click-outside (backdrop click) does NOT call
 *         `onClose` — handler installed but the master switch suppresses
 *   D5  — `dismissible=false` AND `onClose` undefined: typecheck-clean and
 *         renders + behaves correctly (terminal/must-respond modal contract)
 *   D6  — backward compatibility: existing Wave 1 callsite shape (`onClose:
 *         () => void`, no `dismissible`) continues to work; renders + ESC +
 *         click-outside all behave as Wave 1
 *   D7  — `dismissible=false` overrides `closeOnEscape=true` (master switch
 *         takes precedence over the per-channel toggle)
 *   D8  — `dismissible=false` overrides `closeOnBackdropClick=true` (master
 *         switch takes precedence over the per-channel toggle)
 *
 * No engine path; no store reads; no IPC.
 *
 * Sensitive-history compliance: Ring 1, faction-agnostic mechanism, no §6
 * surface. UI-only — does NOT enter sim path. No `political_controllers`,
 * `OOB`, paint anchor, rupture wiring, or `enclave_resilience.ts` touched.
 */
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Modal } from '../src/ui/shared/Modal';

describe('Modal — dismissible prop + optional onClose contract', () => {
    it('D1 — dismissible=true (default) + onClose provided: ESC + click-outside both fire onClose', () => {
        const onClose = vi.fn();
        const { getByTestId, unmount } = render(
            createElement(Modal, {
                isOpen: true,
                onClose,
                children: createElement('div', {}, 'x'),
            }),
        );
        // ESC fires onClose.
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);

        // Backdrop click fires onClose.
        fireEvent.click(getByTestId('modal-backdrop'));
        expect(onClose).toHaveBeenCalledTimes(2);
        unmount();
    });

    it('D2 — dismissible=true (default) + onClose undefined: ESC + click-outside fire no-op (no crash)', () => {
        const { getByTestId, unmount } = render(
            createElement(Modal, {
                isOpen: true,
                // onClose intentionally omitted to prove the optional contract.
                children: createElement('div', {}, 'x'),
            }),
        );
        // ESC must not throw — ?.() guard turns it into a no-op.
        expect(() => {
            fireEvent.keyDown(window, { key: 'Escape' });
        }).not.toThrow();
        // Backdrop click must not throw.
        expect(() => {
            fireEvent.click(getByTestId('modal-backdrop'));
        }).not.toThrow();
        unmount();
    });

    it('D3 — dismissible=false: ESC does NOT call onClose', () => {
        const onClose = vi.fn();
        const { unmount } = render(
            createElement(Modal, {
                isOpen: true,
                onClose,
                dismissible: false,
                children: createElement('div', {}, 'x'),
            }),
        );
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).not.toHaveBeenCalled();
        unmount();
    });

    it('D4 — dismissible=false: click-outside (backdrop click) does NOT call onClose', () => {
        const onClose = vi.fn();
        const { getByTestId, unmount } = render(
            createElement(Modal, {
                isOpen: true,
                onClose,
                dismissible: false,
                children: createElement('div', {}, 'x'),
            }),
        );
        fireEvent.click(getByTestId('modal-backdrop'));
        expect(onClose).not.toHaveBeenCalled();
        unmount();
    });

    it('D5 — dismissible=false + onClose undefined: typecheck-clean, renders + ESC + click-outside no-op', () => {
        const { getByTestId, unmount } = render(
            createElement(Modal, {
                isOpen: true,
                dismissible: false,
                // onClose intentionally omitted (terminal / must-respond contract).
                children: createElement('div', { id: 'inner' }, 'must-respond'),
            }),
        );
        // Renders.
        expect(getByTestId('modal-backdrop')).toBeTruthy();
        expect(getByTestId('modal-panel')).toBeTruthy();
        // ESC: must not throw, must not crash.
        expect(() => {
            fireEvent.keyDown(window, { key: 'Escape' });
        }).not.toThrow();
        // Backdrop click: must not throw, must not crash.
        expect(() => {
            fireEvent.click(getByTestId('modal-backdrop'));
        }).not.toThrow();
        unmount();
    });

    it('D6 — backward compatibility: Wave 1 callsite (onClose required, no dismissible) behaves identically', () => {
        // Verbatim Wave 1 shape: onClose required, no dismissible prop.
        // Must render + ESC + click-outside all behave as Wave 1.
        const onClose = vi.fn();
        const html = renderToStaticMarkup(
            createElement(Modal, {
                isOpen: true,
                onClose,
                children: createElement('div', {}, 'wave-1-shape'),
            }),
        );
        // Wrapper still emits the Wave 1 backdrop+panel structure.
        expect(html).toContain('role="dialog"');
        expect(html).toContain('aria-modal="true"');
        expect(html).toContain('data-testid="modal-backdrop"');
        expect(html).toContain('data-testid="modal-panel"');
        expect(html).toContain('wave-1-shape');

        // Behavior: ESC + click-outside fire onClose (default dismissible=true).
        const { getByTestId, unmount } = render(
            createElement(Modal, {
                isOpen: true,
                onClose,
                children: createElement('div', {}, 'x'),
            }),
        );
        fireEvent.keyDown(window, { key: 'Escape' });
        fireEvent.click(getByTestId('modal-backdrop'));
        expect(onClose).toHaveBeenCalledTimes(2);
        unmount();
    });

    it('D7 — dismissible=false overrides closeOnEscape=true (master switch precedence)', () => {
        // Even if the per-channel toggle is explicitly true, the master
        // switch must suppress the dismiss handler.
        const onClose = vi.fn();
        const { unmount } = render(
            createElement(Modal, {
                isOpen: true,
                onClose,
                dismissible: false,
                closeOnEscape: true,
                children: createElement('div', {}, 'x'),
            }),
        );
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).not.toHaveBeenCalled();
        unmount();
    });

    it('D8 — dismissible=false overrides closeOnBackdropClick=true (master switch precedence)', () => {
        const onClose = vi.fn();
        const { getByTestId, unmount } = render(
            createElement(Modal, {
                isOpen: true,
                onClose,
                dismissible: false,
                closeOnBackdropClick: true,
                children: createElement('div', {}, 'x'),
            }),
        );
        fireEvent.click(getByTestId('modal-backdrop'));
        expect(onClose).not.toHaveBeenCalled();
        unmount();
    });
});
