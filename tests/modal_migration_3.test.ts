// @vitest-environment jsdom
/**
 * LANE-V094-MODAL-DISMISSIBLE-EXTENSION — Wave 3 per-modal migration
 * verification.
 *
 * Successor lane to LANE-V094-MODAL-MIGRATION-2 (Wave 2 ship). This file
 * pins the per-migration contract for the 4 must-respond / terminal modals
 * migrated alongside the substrate `dismissible` extension:
 *
 *   1. GameOverModal           — `src/ui/map/components/GameOverModal.tsx`
 *   2. PeacePlanModal          — `src/ui/map/components/PeacePlanModal.tsx`
 *   3. DaytonNegotiationModal  — `src/ui/map/components/DaytonNegotiationModal.tsx`
 *   4. EventDecisionModal      — `src/ui/map/components/EventDecisionModal.tsx`
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
 *   M6  — wrapper invocation declares `dismissible={false}` (must-respond /
 *         terminal modal contract — only valid close path is the parent
 *         flipping render guard or replacing game state).
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
        label: 'GameOverModal',
        path: 'src/ui/map/components/GameOverModal.tsx',
        ariaLabelledBy: 'game-over-title',
        zTier: 'Z.GAME_OVER',
    },
    {
        label: 'PeacePlanModal',
        path: 'src/ui/map/components/PeacePlanModal.tsx',
        ariaLabelledBy: 'peace-plan-title',
        zTier: 'Z.CRITICAL_MODAL',
    },
    {
        label: 'DaytonNegotiationModal',
        path: 'src/ui/map/components/DaytonNegotiationModal.tsx',
        ariaLabelledBy: 'dayton-negotiation-title',
        zTier: 'Z.CRITICAL_MODAL',
    },
    {
        label: 'EventDecisionModal',
        path: 'src/ui/map/components/EventDecisionModal.tsx',
        ariaLabelledBy: 'event-decision-title',
        zTier: 'Z.CRITICAL_MODAL',
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

describe('Modal migration Wave 3 — per-target source contract', () => {
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

            it(`M6 — wrapper invocation declares dismissible={false}`, () => {
                // Must-respond / terminal modal contract: ESC + click-outside
                // disabled at the wrapper level. The only valid close path
                // is parent re-render or game state replacement.
                expect(
                    src,
                    `${target.path} should pass dismissible={false} to <Modal>`,
                ).toContain('dismissible={false}');
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
