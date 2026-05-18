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
import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import {
    SituationBriefing,
    type BriefingItem,
} from '../../src/ui/map/components/army_hq/SituationBriefing';

afterEach(() => {
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
});
