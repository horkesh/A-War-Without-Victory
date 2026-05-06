// @vitest-environment jsdom
/**
 * LANE-NIGHTSHIFT-V093-A11Y-LANE-A — Modal stack accessibility baseline tests.
 *
 * Per `docs/40_reports/audits/20260506_V093_A11Y_PHASE_0_PANEL.md` Lane A
 * acceptance criteria C-A1..C-A8. Pins the canonical `<Modal>` wrapper's
 * a11y contract and audits each of the 12 migrated modals.
 *
 * Sensitive-history compliance: Ring 1, faction-agnostic, no §6 surface.
 */
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fireEvent, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Modal } from '../src/ui/shared/Modal';

// Absolute paths of the 12 migrated modals (per Phase 0 audit §2.1 + Lane A
// scope). AdvanceTurnModal lives under `warroom/`.
const MIGRATED_MODAL_FILES: ReadonlyArray<{ name: string; relPath: string; expectedLabelledBy: string }> = [
    { name: 'RecruitmentModal', relPath: 'src/ui/map/components/RecruitmentModal.tsx', expectedLabelledBy: 'recruitment-title' },
    { name: 'WarSummaryModal', relPath: 'src/ui/map/components/WarSummaryModal.tsx', expectedLabelledBy: 'war-summary-title' },
    { name: 'TurnAftermathModal', relPath: 'src/ui/map/components/TurnAftermathModal.tsx', expectedLabelledBy: 'turn-aftermath-title' },
    { name: 'AdvanceTurnModal', relPath: 'src/ui/map/components/warroom/AdvanceTurnModal.tsx', expectedLabelledBy: 'advance-turn-title' },
    { name: 'CommanderSelectionModal', relPath: 'src/ui/map/components/CommanderSelectionModal.tsx', expectedLabelledBy: 'commander-selection-title' },
    { name: 'OperationBriefingModal', relPath: 'src/ui/map/components/OperationBriefingModal.tsx', expectedLabelledBy: 'operation-briefing-title' },
    { name: 'AttackConfirmation', relPath: 'src/ui/map/components/AttackConfirmation.tsx', expectedLabelledBy: 'attack-confirmation-title' },
    { name: 'SidePickerOverlay', relPath: 'src/ui/map/components/SidePickerOverlay.tsx', expectedLabelledBy: 'side-picker-title' },
    { name: 'GameOverModal', relPath: 'src/ui/map/components/GameOverModal.tsx', expectedLabelledBy: 'game-over-title' },
    { name: 'PeacePlanModal', relPath: 'src/ui/map/components/PeacePlanModal.tsx', expectedLabelledBy: 'peace-plan-title' },
    { name: 'DaytonNegotiationModal', relPath: 'src/ui/map/components/DaytonNegotiationModal.tsx', expectedLabelledBy: 'dayton-negotiation-title' },
    { name: 'EventDecisionModal', relPath: 'src/ui/map/components/EventDecisionModal.tsx', expectedLabelledBy: 'event-decision-title' },
];

function readSrc(relPath: string): string {
    return readFileSync(resolve(process.cwd(), relPath), 'utf-8');
}

describe('v0.9.3 a11y Lane A — Modal stack accessibility baseline', () => {
    it('T1 — Modal renders role="dialog" + aria-modal="true" on the panel', () => {
        const html = renderToStaticMarkup(
            createElement(Modal, {
                isOpen: true,
                onClose: () => {},
                children: createElement('div', {}, 'x'),
            }),
        );
        expect(html).toContain('role="dialog"');
        expect(html).toContain('aria-modal="true"');
    });

    it('T2 — All 12 migrated modals declare ariaLabelledBy with a matching id token in the same source file', () => {
        for (const { name, relPath, expectedLabelledBy } of MIGRATED_MODAL_FILES) {
            const src = readSrc(relPath);
            // ariaLabelledBy is passed as a prop to <Modal>.
            expect(src, `${name} must pass ariaLabelledBy="${expectedLabelledBy}" to <Modal>`)
                .toContain(`ariaLabelledBy="${expectedLabelledBy}"`);
            // The referenced id must be present on a heading element in the
            // same file (`id="..."`). We don't enforce the tag (h1/h2/h3/div)
            // — only the resolved reference. JSX uses double-quoted id
            // attributes throughout this codebase.
            expect(src, `${name} must declare a node with id="${expectedLabelledBy}" so aria-labelledby resolves`)
                .toContain(`id="${expectedLabelledBy}"`);
        }
    });

    it('T3 — ESC respects dismissible: dismissible=true fires onClose; dismissible=false suppresses', () => {
        // dismissible=true (default): ESC fires onClose.
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

        // dismissible=false: ESC suppressed entirely (no-op even if onClose given).
        const onCloseB = vi.fn();
        const { unmount: unmountB } = render(
            createElement(Modal, {
                isOpen: true,
                onClose: onCloseB,
                dismissible: false,
                children: createElement('div', {}, 'x'),
            }),
        );
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onCloseB).not.toHaveBeenCalled();
        unmountB();
    });

    it('T4 — Tab-trap cycles within panel (Tab on last → first; Shift+Tab on first → last)', () => {
        const { getByTestId, unmount } = render(
            createElement(Modal, {
                isOpen: true,
                onClose: () => {},
                children: createElement(
                    'div',
                    {},
                    createElement('button', { type: 'button', 'data-testid': 'btn-a' }, 'A'),
                    createElement('button', { type: 'button', 'data-testid': 'btn-b' }, 'B'),
                    createElement('button', { type: 'button', 'data-testid': 'btn-c' }, 'C'),
                ),
            }),
        );
        const btnA = getByTestId('btn-a') as HTMLButtonElement;
        const btnC = getByTestId('btn-c') as HTMLButtonElement;
        const panel = getByTestId('modal-panel');

        // Forward cycle: focus last button, press Tab → first button gets focus.
        btnC.focus();
        expect(document.activeElement).toBe(btnC);
        fireEvent.keyDown(panel, { key: 'Tab' });
        expect(document.activeElement).toBe(btnA);

        // Backward cycle: focus first button, press Shift+Tab → last button gets focus.
        btnA.focus();
        expect(document.activeElement).toBe(btnA);
        fireEvent.keyDown(panel, { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(btnC);

        unmount();
    });

    it('T5 — Focus restoration: prior document.activeElement regains focus when modal closes', () => {
        const opener = document.createElement('button');
        opener.setAttribute('data-testid', 'lane-a-opener');
        opener.textContent = 'Open';
        document.body.appendChild(opener);
        opener.focus();
        expect(document.activeElement).toBe(opener);

        const { rerender, unmount } = render(
            createElement(Modal, {
                isOpen: true,
                onClose: () => {},
                children: createElement(
                    'div',
                    {},
                    createElement('button', { type: 'button', 'data-testid': 'lane-a-inside' }, 'inside'),
                ),
            }),
        );
        // First focusable inside the panel should now have focus.
        expect((document.activeElement as HTMLElement | null)?.getAttribute('data-testid')).toBe('lane-a-inside');

        // Close → focus restored to opener.
        rerender(
            createElement(Modal, {
                isOpen: false,
                onClose: () => {},
                children: createElement('div', {}),
            }),
        );
        expect(document.activeElement).toBe(opener);

        unmount();
        document.body.removeChild(opener);
    });

    it('T6 — aria-describedby (newly added) wires to the dialog node when ariaDescribedBy supplied', () => {
        const html = renderToStaticMarkup(
            createElement(Modal, {
                isOpen: true,
                onClose: () => {},
                ariaLabelledBy: 'lane-a-title',
                ariaDescribedBy: 'lane-a-desc',
                children: createElement(
                    'div',
                    {},
                    createElement('h2', { id: 'lane-a-title' }, 'Title'),
                    createElement('p', { id: 'lane-a-desc' }, 'Description.'),
                ),
            }),
        );
        expect(html).toContain('aria-labelledby="lane-a-title"');
        expect(html).toContain('aria-describedby="lane-a-desc"');
        expect(html).toContain('id="lane-a-title"');
        expect(html).toContain('id="lane-a-desc"');

        // When ariaDescribedBy is omitted, the attribute must NOT be present
        // on the dialog node (additive prop; backward compatible).
        const htmlNoDesc = renderToStaticMarkup(
            createElement(Modal, {
                isOpen: true,
                onClose: () => {},
                ariaLabelledBy: 'lane-a-title',
                children: createElement('h2', { id: 'lane-a-title' }, 'Title'),
            }),
        );
        expect(htmlNoDesc).not.toContain('aria-describedby');
    });

    it('T7 — None of the 12 migrated modal files contains a <div onClick=...> clickable-div anti-pattern', () => {
        // Static-source guard. We accept <Modal onClick=...> on Modal itself
        // (the wrapper handles backdrop / panel-internal stopPropagation),
        // and <button onClick=...>, but reject <div ...onClick=...>.
        const divOnClickPattern = /<div[^>]*\sonClick\s*=/;
        for (const { name, relPath } of MIGRATED_MODAL_FILES) {
            const src = readSrc(relPath);
            expect(src, `${name} must not contain <div onClick=...> clickable-div anti-pattern`)
                .not.toMatch(divOnClickPattern);
        }
    });

    it('T8 — Determinism + faction-symmetry static-grep guards on Modal.tsx', () => {
        const rawSrc = readSrc('src/ui/shared/Modal.tsx');
        // Strip JS/TS comments before grep so docstrings that mention
        // forbidden tokens (e.g., "no `Math.random`") in determinism-guarantee
        // documentation don't trip the guards. We strip /* ... */ blocks and
        // // line-comments. Non-greedy matching for block comments.
        const src = rawSrc
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:])\/\/.*$/gm, '$1');

        // Determinism guards.
        expect(src, 'Modal.tsx must not use Math.random in code').not.toMatch(/Math\.random/);
        expect(src, 'Modal.tsx must not use Date.now in code').not.toMatch(/Date\.now/);
        expect(src, 'Modal.tsx must not use new Date( in code').not.toMatch(/new\s+Date\s*\(/);
        // Locale-sort patterns are forbidden in deterministic modules; sorted
        // iteration must use the canonical strictCompare. Modal does not
        // sort, but assert defensively to catch regressions.
        expect(src, 'Modal.tsx must not use localeCompare in code').not.toMatch(/localeCompare/);

        // Faction-symmetry guards (run on raw source — these tokens must not
        // appear anywhere, including comments).
        expect(rawSrc, 'Modal.tsx must not bake in faction tokens').not.toMatch(/\b(?:RBiH|HRHB|VRS|ARBiH|HVO)\b/);
        expect(rawSrc, 'Modal.tsx must not bake in canonical faction RGB literals').not.toMatch(/#c04040|#4a9a55|#4080b8|#c24040/);
    });
});
