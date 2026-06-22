// @vitest-environment jsdom
/**
 * UI-4 Army HQ Briefing Progressive Disclosure (Batch 43).
 *
 * Verifies that the Army HQ BRIEFING tab's SituationBriefing block
 * (which duplicates briefing items already visible in the Decision
 * Room) is wrapped in a `<details>` collapsible. The block is:
 *
 *   1. open by default when any item severity is `critical`
 *      (do not bury alerts behind a click).
 *   2. collapsed by default when all items are warning/info or empty
 *      (cuts first-paint density without losing access).
 *
 * All items remain reachable in the DOM at all times (the
 * `<details>` element keeps children in the document, just visually
 * hidden when closed) — primary cards never disappear.
 *
 * Plan: docs/plans/2026-05-18-autonomous-ui-product-lane-bank.md UI-4.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import {
    SituationBriefing,
    type BriefingItem,
} from '../../src/ui/map/components/army_hq/SituationBriefing';
import { setLocale } from '../../src/ui/map/i18n/index';

afterEach(() => {
    setLocale('en');
    cleanup();
});

function makeItem(overrides: Partial<BriefingItem> = {}): BriefingItem {
    return {
        id: overrides.id ?? 'b1',
        kind: 'military',
        category: 'readiness',
        severity: overrides.severity ?? 'warning',
        title: overrides.title ?? 'Brief item',
        detail: overrides.detail ?? 'detail copy',
        actionLabel: overrides.actionLabel ?? 'Review',
        actionChipLabel: overrides.actionChipLabel,
        target: overrides.target ?? { type: 'corps', corpsId: 'rs_1k_corps' },
        corpsId: overrides.corpsId ?? 'rs_1k_corps',
    } as BriefingItem;
}

describe('SituationBriefing progressive disclosure (UI-4 / Batch 43)', () => {
    it('opens by default when at least one briefing item is critical', () => {
        const items: BriefingItem[] = [
            makeItem({ id: 'b1', severity: 'critical', title: 'Critical sustain' }),
            makeItem({ id: 'b2', severity: 'warning', title: 'Soft warn' }),
        ];
        const { container } = render(createElement(SituationBriefing, { items }));
        const details = container.querySelector('details[data-testid="situation-briefing"]');
        expect(details).toBeTruthy();
        expect((details as HTMLDetailsElement).hasAttribute('open')).toBe(true);
        // Both items reachable in the DOM regardless of toggle state.
        expect(container.textContent).toContain('Critical sustain');
        expect(container.textContent).toContain('Soft warn');
    });

    it('collapses by default when no item is critical (warning/info only)', () => {
        const items: BriefingItem[] = [
            makeItem({ id: 'b1', severity: 'warning', title: 'Soft warn' }),
            makeItem({ id: 'b2', severity: 'info', title: 'FYI' }),
        ];
        const { container } = render(createElement(SituationBriefing, { items }));
        const details = container.querySelector('details[data-testid="situation-briefing"]');
        expect(details).toBeTruthy();
        expect((details as HTMLDetailsElement).hasAttribute('open')).toBe(false);
        // Items still in the DOM (reachable on toggle, never removed).
        expect(container.textContent).toContain('Soft warn');
        expect(container.textContent).toContain('FYI');
    });

    it('shows item count and severity tally in the summary', () => {
        const items: BriefingItem[] = [
            makeItem({ id: 'b1', severity: 'critical' }),
            makeItem({ id: 'b2', severity: 'warning' }),
            makeItem({ id: 'b3', severity: 'warning' }),
            makeItem({ id: 'b4', severity: 'info' }),
        ];
        const { container } = render(createElement(SituationBriefing, { items }));
        const summary = container.querySelector('details[data-testid="situation-briefing"] > summary');
        expect(summary).toBeTruthy();
        const summaryText = summary!.textContent ?? '';
        expect(summaryText).toContain('4');
        expect(summaryText).toContain('1');
        expect(summaryText).toContain('2');
    });

    it('shows empty-state message and collapses when item list is empty', () => {
        const { container } = render(createElement(SituationBriefing, { items: [] }));
        // Empty state still uses the same wrapper for consistent semantics.
        const details = container.querySelector('details[data-testid="situation-briefing"]');
        expect(details).toBeTruthy();
        expect((details as HTMLDetailsElement).hasAttribute('open')).toBe(false);
        expect(container.textContent).toContain('No alerts');
    });

    it('uses player-facing briefing copy instead of staff arrows or hardcoded English chrome', () => {
        const items: BriefingItem[] = [
            makeItem({
                id: 'op',
                title: 'Operation window',
                target: { type: 'operation', operationKey: 'arbih_3rd_corps|op_alpha' },
            }),
            makeItem({
                id: 'settlement',
                title: 'Settlement report',
                target: { type: 'settlement', osid: 'tuzla_1' },
            }),
        ];

        const { container } = render(createElement(SituationBriefing, { items, onNavigate: () => undefined }));

        const copy = container.textContent ?? '';
        expect(copy).toContain('Situation briefing');
        expect(copy).toContain('2 items');
        expect(copy).toContain('Inspect operation');
        expect(copy).toContain('Inspect map');
        expect(copy).not.toContain('-> OP');
        expect(copy).not.toContain('-> MAP');
        expect(copy).not.toContain('Situation Briefing');
    });

    it('renders normalized action chip labels instead of static target type labels', () => {
        const items: BriefingItem[] = [
            makeItem({
                id: 'supply',
                title: 'Supply lines critically exposed',
                target: { type: 'summary', summaryFocus: 'support' },
                actionChipLabel: 'Supply ledger',
            }),
        ];

        const { container } = render(createElement(SituationBriefing, { items, onNavigate: () => undefined }));

        expect(container.textContent).toContain('Supply ledger');
        expect(container.textContent).not.toContain('-> CORPS');
    });

    it('localizes collector fallback copy in BCS mode', () => {
        setLocale('bcs');
        const items: BriefingItem[] = [
            makeItem({
                id: 'mil-active-ops',
                severity: 'info',
                kind: 'military',
                category: 'military',
                briefingCategory: 'active_operations',
                title: '2 active operations',
                detail: '2 corps-level operations in progress.',
                target: { type: 'none' },
            }),
            makeItem({
                id: 'log-supply',
                severity: 'warning',
                kind: 'military',
                category: 'logistics',
                briefingCategory: 'supply',
                title: 'Supply lines under strain',
                detail: '5 adequate, 2 strained, 0 critical; 0 cut corridors, 1 brittle corridor.',
                actionLabel: 'Review Supply',
                actionChipLabel: 'Supply ledger',
                target: { type: 'summary', summaryFocus: 'support', label: 'Supply ledger' },
            }),
        ];

        const { container } = render(createElement(SituationBriefing, { items, onNavigate: () => undefined }));
        const copy = container.textContent ?? '';

        expect(copy).toContain('2 aktivne operacije');
        expect(copy).toContain('2 operacije na nivou korpusa su u toku.');
        expect(copy).toContain('Linije snabdijevanja pod pritiskom');
        expect(copy).toContain('5 dovoljno, 2 pod pritiskom, 0 kritično; 0 presječenih koridora, 1 krhak koridor.');
        expect(copy).toContain('Pregledaj snabdijevanje');
        expect(copy).not.toContain('2 active operations');
        expect(copy).not.toContain('Supply lines under strain');
        expect(copy).not.toContain('Supply ledger');
    });

    it('emits operation, sector, and settlement field targets when action chips are clicked', () => {
        const items: BriefingItem[] = [
            makeItem({
                id: 'op',
                title: 'Operation window',
                target: { type: 'operation', operationKey: 'arbih_3rd_corps|op_alpha' },
                actionChipLabel: 'Inspect operation',
            }),
            makeItem({
                id: 'sector',
                title: 'Sector pressure',
                target: { type: 'sector', sectorId: 'sector_tuzla' },
                actionChipLabel: 'Inspect sector',
            }),
            makeItem({
                id: 'settlement',
                title: 'Settlement report',
                target: { type: 'settlement', osid: 'tuzla_1' },
                actionChipLabel: 'Inspect settlement',
            }),
        ];
        const onNavigate = vi.fn();

        const { getByText } = render(createElement(SituationBriefing, { items, onNavigate }));
        fireEvent.click(getByText('Inspect operation'));
        fireEvent.click(getByText('Inspect sector'));
        fireEvent.click(getByText('Inspect settlement'));

        expect(onNavigate).toHaveBeenNthCalledWith(1, { type: 'operation', operationKey: 'arbih_3rd_corps|op_alpha' });
        expect(onNavigate).toHaveBeenNthCalledWith(2, { type: 'sector', sectorId: 'sector_tuzla', corpsId: 'rs_1k_corps' });
        expect(onNavigate).toHaveBeenNthCalledWith(3, { type: 'settlement', osid: 'tuzla_1' });
    });
});
