/**
 * D7 defect #7 — OPS-view right panel z-order.
 *
 * The Field Ops Snapshot panel must not stack behind the Presidential
 * Inbox when OPS view is active. `shouldRenderInboxPanel(primary,
 * operationsPanelOpen)` must return false when the OperationsPanel is
 * open, so the right rail renders only one of (Field Ops, Inbox).
 *
 * Source plan: docs/plans/2026-05-16-gui-playtest-defects-plan.md track D7.
 * Source report: docs/40_reports/playtest/GUI_PLAYTEST_2026-05-16.md defect #7.
 */
import { describe, expect, it } from 'vitest';
import { shouldRenderInboxPanel } from '../../src/ui/map/components/panelRail.js';

describe('OPS view right-panel exclusivity (playtest defect #7)', () => {
    it('hides Presidential Inbox when OperationsPanel is open', () => {
        expect(shouldRenderInboxPanel('inbox', true)).toBe(false);
    });

    it('renders Presidential Inbox when OperationsPanel is closed and primary is inbox', () => {
        expect(shouldRenderInboxPanel('inbox', false)).toBe(true);
    });

    it('does not render Inbox when a different primary panel is active', () => {
        expect(shouldRenderInboxPanel('settlement', false)).toBe(false);
        expect(shouldRenderInboxPanel('corps', true)).toBe(false);
    });
});
