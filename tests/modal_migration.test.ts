// @vitest-environment jsdom
/**
 * LANE-V094-MODAL-MIGRATION — per-modal migration verification tests.
 *
 * Successor lane to LANE-V094-MODAL-WRAPPER (foundation `<Modal>` ship at
 * commit `5fec69a6`). This file pins the per-migration contract for the
 * 4 modals migrated in this lane:
 *
 *   1. RecruitmentModal      — `src/ui/map/components/RecruitmentModal.tsx`
 *   2. WarSummaryModal       — `src/ui/map/components/WarSummaryModal.tsx`
 *   3. TurnAftermathModal    — `src/ui/map/components/TurnAftermathModal.tsx`
 *   4. AdvanceTurnModal      — `src/ui/map/components/warroom/AdvanceTurnModal.tsx`
 *
 * Per-modal contract (all four):
 *   M1  — module imports `Modal` from `src/ui/shared/Modal`
 *   M2  — module continues to import `Z` from canonical `src/ui/shared/zIndex`
 *   M3  — no residual numeric `zIndex: <literal>` shell-tier value (regression
 *         guard: tier numbers must flow through `Z.*` tokens)
 *   M4  — no residual `data-tutorial-step` ATTRIBUTE was added or stripped
 *         (none of these modals had a tutorial-step anchor before; none
 *         introduces one). Tutorial onboarding contract preserved by
 *         absence.
 *
 * Per-modal aria contract:
 *   A1  — every migrated modal source declares an `ariaLabelledBy="..."`
 *         id, and the same id appears as an `id="..."` attribute inside
 *         the panel (so screen readers can resolve the headline label).
 *
 * No engine path; no store reads; no IPC.
 *
 * Sensitive-history compliance: Ring 1, faction-agnostic mechanism, no §6
 * surface. UI-only — does NOT enter sim path. No `political_controllers`,
 * `OOB`, paint anchor, rupture wiring, or `enclave_resilience.ts` touched.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(repoRoot, p), 'utf8');

interface MigrationTarget {
    label: string;
    path: string;
    ariaLabelledBy: string;
}

const TARGETS: ReadonlyArray<MigrationTarget> = [
    {
        label: 'RecruitmentModal',
        path: 'src/ui/map/components/RecruitmentModal.tsx',
        ariaLabelledBy: 'recruitment-title',
    },
    {
        label: 'WarSummaryModal',
        path: 'src/ui/map/components/WarSummaryModal.tsx',
        ariaLabelledBy: 'war-summary-title',
    },
    {
        label: 'TurnAftermathModal',
        path: 'src/ui/map/components/TurnAftermathModal.tsx',
        ariaLabelledBy: 'turn-aftermath-title',
    },
    {
        label: 'AdvanceTurnModal',
        path: 'src/ui/map/components/warroom/AdvanceTurnModal.tsx',
        ariaLabelledBy: 'advance-turn-title',
    },
];

// Tier numbers that must flow through Z.* tokens (mirrors
// tests/z_index_canonical.test.ts SHELL_TIER_NUMBERS set). Any source file
// that still hard-codes one of these via `zIndex: N` is a migration
// regression.
const SHELL_TIER_NUMBERS = new Set<number>([
    40, 42, 50, 55, 60, 90, 100, 120, 200, 500, 900, 1000, 1100, 1200,
    8000, 8500, 9000, 9999, 10000, 99999,
]);

describe('Modal migration — per-target source contract', () => {
    for (const target of TARGETS) {
        describe(target.label, () => {
            const src = read(target.path);

            it(`M1 — imports Modal from src/ui/shared/Modal`, () => {
                expect(src, `${target.path} should import Modal`).toMatch(
                    /import\s*\{\s*Modal\s*\}\s*from\s*['"][^'"]*shared\/Modal(?:\.js)?['"]/,
                );
            });

            it(`M2 — still imports Z from canonical src/ui/shared/zIndex`, () => {
                expect(src, `${target.path} should import Z from shared/zIndex`).toMatch(
                    /import\s*\{\s*Z\s*\}\s*from\s*['"][^'"]*shared\/zIndex(?:\.js)?['"]/,
                );
            });

            it(`M3 — no residual numeric zIndex literal mapped to a shell tier`, () => {
                const matches = src.match(/zIndex\s*:\s*(\d+)/g);
                if (!matches) return;
                for (const m of matches) {
                    const n = Number(m.replace(/[^0-9]/g, ''));
                    expect(
                        SHELL_TIER_NUMBERS.has(n),
                        `${target.path} contains residual zIndex: ${n} (should flow through Z.*)`,
                    ).toBe(false);
                }
            });

            it(`M4 — no data-tutorial-step JSX attribute introduced or stripped`, () => {
                // None of these modals had a tutorial-step anchor before; none
                // introduces one in the migration. Match the JSX attribute
                // form (`data-tutorial-step=`) explicitly so docstring
                // mentions of the contract do not register as anchors.
                expect(src).not.toMatch(/data-tutorial-step\s*=/);
            });

            it(`A1 — declares ariaLabelledBy and corresponding id appears inside panel`, () => {
                expect(src).toContain(`ariaLabelledBy="${target.ariaLabelledBy}"`);
                expect(src).toContain(`id="${target.ariaLabelledBy}"`);
            });
        });
    }

    it(`every migration target's source file uses the canonical <Modal> import (not local re-implementations)`, () => {
        for (const target of TARGETS) {
            const src = read(target.path);
            // Migrated modals must NOT still hand-roll their own
            // `role="dialog"` markup (the wrapper provides it). Any residual
            // hand-rolled dialog role inside a panel is a regression.
            expect(
                src,
                `${target.path} should not contain a hand-rolled role="dialog" (Modal wrapper provides it)`,
            ).not.toMatch(/role=["']dialog["']/);
        }
    });
});
