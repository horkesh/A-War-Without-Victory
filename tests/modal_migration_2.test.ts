// @vitest-environment jsdom
/**
 * LANE-V094-MODAL-MIGRATION-2 — Wave 2 per-modal migration verification.
 *
 * Successor lane to LANE-V094-MODAL-MIGRATION (Wave 1 ship at commit
 * `8d1bfee4`). This file pins the per-migration contract for the 4 modals
 * migrated in Wave 2:
 *
 *   1. CommanderSelectionModal — `src/ui/map/components/CommanderSelectionModal.tsx`
 *   2. OperationBriefingModal  — `src/ui/map/components/OperationBriefingModal.tsx`
 *   3. AttackConfirmation      — `src/ui/map/components/AttackConfirmation.tsx`
 *   4. SidePickerOverlay       — `src/ui/map/components/SidePickerOverlay.tsx`
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
 *   M5  — wrapper invocation references the expected `Z.*` tier (z-index
 *         numerical value preserved verbatim from pre-migration source).
 *
 * Per-modal aria contract:
 *   A1  — every migrated modal source declares an `ariaLabelledBy="..."`
 *         id, and the same id appears as an `id="..."` attribute inside
 *         the panel (so screen readers can resolve the headline label).
 *
 * Cross-target invariants:
 *   X1  — no migrated modal still hand-rolls `role="dialog"` markup
 *         (the wrapper provides it).
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
    /** Canonical `Z.*` tier this modal must consume (preserved from pre-migration). */
    zTier: string;
}

const TARGETS: ReadonlyArray<MigrationTarget> = [
    {
        label: 'CommanderSelectionModal',
        path: 'src/ui/map/components/CommanderSelectionModal.tsx',
        ariaLabelledBy: 'commander-selection-title',
        zTier: 'Z.CRITICAL_MODAL',
    },
    {
        label: 'OperationBriefingModal',
        path: 'src/ui/map/components/OperationBriefingModal.tsx',
        ariaLabelledBy: 'operation-briefing-title',
        zTier: 'Z.CRITICAL_MODAL',
    },
    {
        label: 'AttackConfirmation',
        path: 'src/ui/map/components/AttackConfirmation.tsx',
        ariaLabelledBy: 'attack-confirmation-title',
        zTier: 'Z.ATTACK_CONFIRMATION',
    },
    {
        label: 'SidePickerOverlay',
        path: 'src/ui/map/components/SidePickerOverlay.tsx',
        ariaLabelledBy: 'side-picker-title',
        zTier: 'Z.OVERLAY_LIGHT',
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

describe('Modal migration Wave 2 — per-target source contract', () => {
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

            it(`M5 — wrapper invocation preserves the expected Z.* tier`, () => {
                // The Z token must reach the Modal wrapper via the `zIndex`
                // prop. Match the prop form `zIndex={Z.X}` (curly-brace JSX
                // expression) explicitly to avoid matching docstring
                // mentions or unrelated style declarations.
                const expr = `zIndex={${target.zTier}}`;
                expect(
                    src,
                    `${target.path} should pass ${expr} to <Modal>`,
                ).toContain(expr);
            });

            it(`A1 — declares ariaLabelledBy and corresponding id appears inside panel`, () => {
                expect(src).toContain(`ariaLabelledBy="${target.ariaLabelledBy}"`);
                expect(src).toContain(`id="${target.ariaLabelledBy}"`);
            });
        });
    }

    it(`X1 — no migrated modal still hand-rolls role="dialog" markup`, () => {
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
