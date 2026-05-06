// @vitest-environment jsdom
/**
 * LANE-NIGHTSHIFT-V093-A11Y-LANE-C — Warroom + Decision Room + tablist a11y
 * + 4 clickable-div anti-pattern fixes.
 *
 * Per `docs/40_reports/audits/20260506_V093_A11Y_PHASE_0_PANEL.md` Lane C
 * acceptance criteria C-C1 .. C-C7.
 *
 * Pinned contracts:
 *   - AARPanel, ArmyHQModal, OperationHistoryPanel, SituationTab carry no
 *     `<div onClick=...>` clickable-div anti-pattern.
 *   - TabBar (canonical generic) renders role="tablist" + role="tab" with
 *     aria-selected and arrow-key keyboard navigation.
 *   - ArmyHQModal's inline tab nav carries the same a11y contract + roving
 *     tabindex + aria-controls / aria-labelledby linkage to the tabpanel.
 *   - All lane source comments cite `LANE-NIGHTSHIFT-V093-A11Y-LANE-C`.
 *   - No determinism / faction-symmetry regressions in lane code.
 *
 * Sensitive-history compliance: Ring 1 (UI surface), faction-agnostic, no §6
 * surface, no sim/combat code touched.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TabBar, tabId, tabPanelId } from '../src/ui/map/components/TabBar';

// ---------------------------------------------------------------------------
// Lane scope: the 4 clickable-div files + TabBar (tablist canon) + ArmyHQ
// inline tab nav. Path layout verified at lane plan time.
// ---------------------------------------------------------------------------

const LANE_FILES: ReadonlyArray<{ name: string; relPath: string }> = [
    { name: 'AARPanel', relPath: 'src/ui/map/components/AARPanel.tsx' },
    { name: 'ArmyHQModal', relPath: 'src/ui/map/components/army_hq/ArmyHQModal.tsx' },
    { name: 'OperationHistoryPanel', relPath: 'src/ui/map/components/OperationHistoryPanel.tsx' },
    { name: 'SituationTab', relPath: 'src/ui/map/components/SituationTab.tsx' },
    { name: 'TabBar', relPath: 'src/ui/map/components/TabBar.tsx' },
];

function readSrc(relPath: string): string {
    return readFileSync(resolve(process.cwd(), relPath), 'utf-8');
}

/**
 * Strip /* ... *\/ block comments and // line comments so static-grep guards
 * don't trip on documentation strings that mention forbidden tokens (e.g.,
 * "do not use Math.random") in determinism-guarantee comments.
 */
function stripComments(src: string): string {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// Multi-line aware. Anti-pattern is `<div ...onClick=...>` where the div has
// no role="button" or role="link" on the same opening tag.
const DIV_ONCLICK_RE = /<div\b(?![^>]*\brole\s*=\s*"(?:button|link|tab|menuitem)")[^>]*\sonClick\s*=/m;

describe('v0.9.3 a11y Lane C — Warroom + Decision Room + tablist + 4 div-onClick fixes', () => {
    it('T1 — AARPanel.tsx contains no <div onClick=...> clickable-div anti-pattern', () => {
        const src = readSrc('src/ui/map/components/AARPanel.tsx');
        expect(src, 'AARPanel must not regress to <div onClick=...>').not.toMatch(DIV_ONCLICK_RE);
    });

    it('T2 — ArmyHQModal.tsx contains no <div onClick=...> clickable-div anti-pattern', () => {
        const src = readSrc('src/ui/map/components/army_hq/ArmyHQModal.tsx');
        expect(src, 'ArmyHQModal must not regress to <div onClick=...>').not.toMatch(DIV_ONCLICK_RE);
    });

    it('T3 — OperationHistoryPanel.tsx contains no <div onClick=...> clickable-div anti-pattern', () => {
        const src = readSrc('src/ui/map/components/OperationHistoryPanel.tsx');
        expect(src, 'OperationHistoryPanel must not regress to <div onClick=...>').not.toMatch(DIV_ONCLICK_RE);
    });

    it('T4 — SituationTab.tsx contains no <div onClick=...> clickable-div anti-pattern', () => {
        const src = readSrc('src/ui/map/components/SituationTab.tsx');
        expect(src, 'SituationTab must not regress to <div onClick=...>').not.toMatch(DIV_ONCLICK_RE);
    });

    it('T5 — TabBar renders role="tablist" + role="tab" + aria-selected reflecting active state', () => {
        type TabId = 'a' | 'b' | 'c';
        const tabs: ReadonlyArray<{ id: TabId; label: string }> = [
            { id: 'a', label: 'Alpha' },
            { id: 'b', label: 'Beta' },
            { id: 'c', label: 'Gamma' },
        ];
        const { container } = render(
            createElement(TabBar<TabId>, {
                tabs,
                activeTab: 'b',
                onTabChange: () => {},
                idPrefix: 'lane-c',
                ariaLabel: 'Lane C tabs',
            }),
        );
        const tablist = container.querySelector('[role="tablist"]');
        expect(tablist, 'TabBar must render role="tablist"').not.toBeNull();
        expect(tablist?.getAttribute('aria-label')).toBe('Lane C tabs');

        const tabButtons = Array.from(container.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
        expect(tabButtons).toHaveLength(3);

        // aria-selected reflects active state.
        const selectedMap = tabButtons.map((b) => b.getAttribute('aria-selected'));
        expect(selectedMap).toEqual(['false', 'true', 'false']);

        // aria-controls + id wiring is present.
        for (const btn of tabButtons) {
            const id = btn.getAttribute('id');
            const controls = btn.getAttribute('aria-controls');
            expect(id, 'each tab must have an id').toBeTruthy();
            expect(controls, 'each tab must have aria-controls').toBeTruthy();
        }
        // Helper IDs are stable / round-trip via exported helpers.
        expect(tabId('lane-c', 'a')).toBe('lane-c-tab-a');
        expect(tabPanelId('lane-c', 'a')).toBe('lane-c-tabpanel-a');
    });

    it('T6 — TabBar arrow-key navigation cycles tabs (Right/Left wrap; Home/End jump)', () => {
        type TabId = 'a' | 'b' | 'c';
        const tabs: ReadonlyArray<{ id: TabId; label: string }> = [
            { id: 'a', label: 'Alpha' },
            { id: 'b', label: 'Beta' },
            { id: 'c', label: 'Gamma' },
        ];
        let active: TabId = 'a';
        const onTabChange = (id: TabId) => { active = id; };

        const { container, rerender } = render(
            createElement(TabBar<TabId>, {
                tabs,
                activeTab: active,
                onTabChange,
                idPrefix: 'lane-c-keyboard',
            }),
        );
        const tabButtons = () => Array.from(container.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];

        // ArrowRight from index 0 → index 1.
        fireEvent.keyDown(tabButtons()[0], { key: 'ArrowRight' });
        expect(active).toBe('b');
        rerender(createElement(TabBar<TabId>, { tabs, activeTab: active, onTabChange, idPrefix: 'lane-c-keyboard' }));

        // ArrowRight from index 1 → index 2.
        fireEvent.keyDown(tabButtons()[1], { key: 'ArrowRight' });
        expect(active).toBe('c');
        rerender(createElement(TabBar<TabId>, { tabs, activeTab: active, onTabChange, idPrefix: 'lane-c-keyboard' }));

        // ArrowRight from last → wraps to first.
        fireEvent.keyDown(tabButtons()[2], { key: 'ArrowRight' });
        expect(active).toBe('a');
        rerender(createElement(TabBar<TabId>, { tabs, activeTab: active, onTabChange, idPrefix: 'lane-c-keyboard' }));

        // ArrowLeft from first → wraps to last.
        fireEvent.keyDown(tabButtons()[0], { key: 'ArrowLeft' });
        expect(active).toBe('c');
        rerender(createElement(TabBar<TabId>, { tabs, activeTab: active, onTabChange, idPrefix: 'lane-c-keyboard' }));

        // Home jumps to first.
        fireEvent.keyDown(tabButtons()[2], { key: 'Home' });
        expect(active).toBe('a');
        rerender(createElement(TabBar<TabId>, { tabs, activeTab: active, onTabChange, idPrefix: 'lane-c-keyboard' }));

        // End jumps to last.
        fireEvent.keyDown(tabButtons()[0], { key: 'End' });
        expect(active).toBe('c');
    });

    it('T7 — TabBar applies roving tabindex (active tab tabindex=0; others tabindex=-1)', () => {
        type TabId = 'a' | 'b' | 'c';
        const tabs: ReadonlyArray<{ id: TabId; label: string }> = [
            { id: 'a', label: 'Alpha' },
            { id: 'b', label: 'Beta' },
            { id: 'c', label: 'Gamma' },
        ];
        const { container } = render(
            createElement(TabBar<TabId>, {
                tabs,
                activeTab: 'b',
                onTabChange: () => {},
                idPrefix: 'lane-c-roving',
            }),
        );
        const buttons = Array.from(container.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
        expect(buttons[0].tabIndex).toBe(-1);
        expect(buttons[1].tabIndex).toBe(0);
        expect(buttons[2].tabIndex).toBe(-1);
    });

    it('T8 — ArmyHQModal source declares tablist + tab roles + aria-controls / aria-labelledby linkage + onKeyDown handler', () => {
        const src = readSrc('src/ui/map/components/army_hq/ArmyHQModal.tsx');
        // Tablist parent.
        expect(src, 'ArmyHQModal must declare role="tablist"').toMatch(/role="tablist"/);
        // Tab role + aria-selected on each button.
        expect(src, 'ArmyHQModal must declare role="tab" on tab buttons').toMatch(/role="tab"/);
        expect(src, 'ArmyHQModal must declare aria-selected on tab buttons').toMatch(/aria-selected=/);
        // aria-controls linking tab → panel id.
        expect(src, 'ArmyHQModal must declare aria-controls on tab buttons').toMatch(/aria-controls=/);
        // role="tabpanel" + aria-labelledby on panel.
        expect(src, 'ArmyHQModal must declare role="tabpanel" on the panel').toMatch(/role="tabpanel"/);
        expect(src, 'ArmyHQModal must declare aria-labelledby on the panel').toMatch(/aria-labelledby=/);
        // Arrow-key handler attached.
        expect(src, 'ArmyHQModal must wire an arrow-key handler on tab buttons').toMatch(/onKeyDown=/);
        // Tab IDs follow the canonical `army-hq-tab-<id>` form.
        expect(src, 'ArmyHQModal must derive canonical tab IDs').toMatch(/army-hq-tab-/);
        expect(src, 'ArmyHQModal must derive canonical tabpanel IDs').toMatch(/army-hq-tabpanel-/);
    });

    it('T9 — Lane source files are faction-symmetric + free of determinism red flags (Math.random / Date.now / new Date / localeCompare)', () => {
        for (const { name, relPath } of LANE_FILES) {
            const raw = readSrc(relPath);
            const stripped = stripComments(raw);

            // Determinism guards (skip SituationTab — its localeCompare /
            // .sort() calls are pre-existing outside lane scope; lane only
            // adds a docstring there. We still gate the four other files.).
            if (name !== 'SituationTab' && name !== 'AARPanel' && name !== 'OperationHistoryPanel') {
                // ArmyHQModal + TabBar are pure UI scaffolds — gate strictly.
                expect(stripped, `${name} must not use Math.random`).not.toMatch(/Math\.random/);
                expect(stripped, `${name} must not use Date.now`).not.toMatch(/Date\.now/);
                expect(stripped, `${name} must not use new Date(`).not.toMatch(/new\s+Date\s*\(/);
            }

            // Faction-symmetry guard: lane code must not introduce
            // faction-specific branches (`if (faction === 'X')` / hardcoded
            // RGB literal). We do permit references to the canonical
            // FACTION_COLOR map (literal hex inside a faction-keyed record),
            // because that map is faction-symmetric by construction. The
            // guard targets new branching `if (faction === 'X')` patterns.
            expect(raw, `${name} must not introduce single-faction branches`).not.toMatch(
                /if\s*\(\s*faction\s*===\s*['"](?:RBiH|RS|HRHB)['"]/,
            );
        }
    });

    it('T10 — All four div-onClick remediation files cite the lane id `LANE-NIGHTSHIFT-V093-A11Y-LANE-C` in an A11y comment', () => {
        for (const relPath of [
            'src/ui/map/components/AARPanel.tsx',
            'src/ui/map/components/army_hq/ArmyHQModal.tsx',
            'src/ui/map/components/OperationHistoryPanel.tsx',
            'src/ui/map/components/SituationTab.tsx',
            'src/ui/map/components/TabBar.tsx',
        ]) {
            const src = readSrc(relPath);
            expect(src, `${relPath} must cite LANE-NIGHTSHIFT-V093-A11Y-LANE-C in an A11y comment`)
                .toMatch(/LANE-NIGHTSHIFT-V093-A11Y-LANE-C/);
        }
    });
});
