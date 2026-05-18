# Accessibility P0 Closeout - Batch 18 verification and propagation

**Plan:** `docs/plans/2026-05-17-accessibility-p0-closeout-plan.md`
**Predecessor implementation:** commit `07163a48` (2026-05-17), report `docs/40_reports/implemented/20260517_ACCESSIBILITY_P0_CLOSEOUT.md`, audit `docs/40_reports/audits/20260517_ACCESSIBILITY_P0_DISCOVERY.md`.

## Scope

Batch 18 is a verification-only closeout. The four P0 categories (clickable-div elimination, contrast tokens, reduced motion, form labels) were already implemented in `07163a48` as part of the launch readiness slice; the May-17 closeout report explicitly flagged "Ledger note needed" and "Roadmap note needed" as the only follow-ups. This batch closes that doc-side gap, reconciles stale parent status rows that still described the P0 blockers as open, and re-verifies the four static regressions plus the lane-E forms/live-regions guard remain green on current HEAD.

No component, CSS, or test source files were modified in Batch 18.

## P0 categories re-verified on HEAD

### Clickable Controls - PASS

`tests/ui/accessibility_clickable_controls.test.ts` (2 tests) - confirms no `onClick` on non-interactive JSX tags across the 12 components flagged by discovery, and every remaining `role="button"` fallback in `CorpsCard.tsx`, `OOBSidebar.tsx`, and `SettlementDetailContent.tsx` carries a Space-key activation handler.

### Contrast Tokens - PASS

`tests/ui/accessibility_contrast_tokens.test.ts` (2 tests) - pins WCAG AA contrast >= 4.5 for the canonical map palette pairs against `panel-bg` and `panel-card`, and asserts `src/ui/map/tailwind.config.ts` still declares the audited token values. No token churn required.

### Reduced Motion - PASS

`tests/ui/accessibility_reduced_motion.test.ts` (1 test) - asserts `src/ui/map/styles/globals.css` keeps the OS-level `@media (prefers-reduced-motion: reduce)` gate and the in-game `html.user-reduce-motion` gate, both collapsing animation duration, iteration count, transition duration, and scroll behavior.

### Form Labels - PASS

`tests/ui/accessibility_form_labels.test.ts` (1 test) - confirms every `<input>`, `<select>`, and `<textarea>` across the 13 audited form components has a programmatic name via `aria-label`, `aria-labelledby`, `id` plus `label htmlFor`, or a wrapping `<label>`.

## Verification

- `npm.cmd run typecheck` - PASS.
- `npx.cmd vitest run tests/ui/accessibility_clickable_controls.test.ts tests/ui/accessibility_contrast_tokens.test.ts tests/ui/accessibility_reduced_motion.test.ts tests/ui/accessibility_form_labels.test.ts tests/v093_a11y_lane_e_forms_live_regions.test.ts tests/ui_shell_navigation.test.ts --reporter=dot` - 6 files, 33 tests passed (clickable 2, form labels 1, contrast 2, reduced motion 1, lane-E forms/live-regions 12, ui shell navigation 15).
- `npm.cmd run desktop:map:build` - Vite build completed; pre-existing chunk-size warnings only.
- `git diff --check` - clean (CRLF normalization warnings only on touched docs, no whitespace defects).

## Browser/axe spot check

Not performed in Batch 18. The May-17 closeout also did not run browser/axe and noted it as the remaining optional follow-up; static regressions remain the gate of record for v1.0 P0.

## Determinism

Renderer-only verification. No sim, scenario, IPC, or persisted-output changes.

## Files changed in Batch 18

- `.claude/napkin.md` - notes that a11y P0 is closed by static guards and browser/axe is RC evidence.
- `docs/40_reports/GAME_STATE_RATING_MASTER.md` - replaces stale Accessibility C-/open-P0 rows with current closed-P0 truth and RC spot-check follow-up.
- `docs/40_reports/GUI_MASTER.md` - added Accessibility P0 entry to the "Where to look" table and to the current-status summary.
- `docs/40_reports/audits/20260518_MASTER_BACKLOG_EXECUTION_QUEUE.md` - records Batch 18 as verified stale / docs propagated.
- `docs/40_reports/implemented/20260518_ACCESSIBILITY_P0_BATCH18.md` - this report.
- `docs/PROJECT_LEDGER.md` - appended Batch 18 entry capturing verification, file list, and proof commands.
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` - adds the durable rule for verification-only closeouts reconciling stale parent truth.
- `docs/plans/MASTER_ROADMAP.md` - updates the execution-wave header to include Batch 18.

No code, CSS, scenario, or test sources were modified.
