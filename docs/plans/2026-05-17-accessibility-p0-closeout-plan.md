# Accessibility P0 Closeout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the four v1.0 accessibility P0 blockers: clickable-div anti-patterns, WCAG-AA contrast gaps, `prefers-reduced-motion`, and form label wiring.

**Architecture:** Patch semantics at the component owner, not through global hacks. Add regression tests that prevent reintroducing inaccessible patterns.

**Tech Stack:** React, CSS, Vitest static tests, axe/manual browser spot checks.

---

## Task 1: Clickable-Div Elimination

**Files:**
- Test: `tests/ui/accessibility_clickable_controls.test.ts`
- Modify: files identified by static scan under `src/ui/map/components/`.

**Steps:**
1. Run a discovery scan and paste the offender file list into `docs/40_reports/audits/YYYYMMDD_ACCESSIBILITY_P0_DISCOVERY.md` before patching.
2. Add a static test that fails on `onClick` on non-button/non-link interactive containers without role and keyboard handlers.
3. Replace offenders with `<button type="button">` or fully accessible role/key handling only when semantic button cannot fit.
4. Rerun test.

## Task 2: Contrast Token Audit

**Files:**
- Test: `tests/ui/accessibility_contrast_tokens.test.ts`
- Modify: `src/ui/map/styles/globals.css` and theme token files.

**Steps:**
1. Encode required contrast pairs from the a11y audit.
2. Adjust only borderline tokens, preserving visual hierarchy.
3. Rerun affected visual shell tests.

Stop if the patch expands into broad global token churn; split that into a separate visual-design plan.

## Task 3: Reduced Motion

**Files:**
- Modify: `src/ui/map/styles/globals.css`
- Test: `tests/ui/accessibility_reduced_motion.test.ts`

**Steps:**
1. Add test that `prefers-reduced-motion: reduce` exists and disables nonessential animation.
2. Add CSS media query for transitions/animations used by overlays, pulsing borders, and coachmarks.

## Task 4: Form Labels

**Files:**
- Test: `tests/ui/accessibility_form_labels.test.ts`
- Modify: modal/settings/form components flagged by the test.

**Steps:**
1. Add static test for inputs/selects without `id` plus `label htmlFor` or `aria-label`.
2. Patch each offender.

## Verification

Run:
- `npm.cmd run typecheck`
- `npx.cmd vitest run tests\ui\accessibility_clickable_controls.test.ts tests\ui\accessibility_contrast_tokens.test.ts tests\ui\accessibility_reduced_motion.test.ts tests\ui\accessibility_form_labels.test.ts tests\v093_a11y_lane_e_forms_live_regions.test.ts`
- `npm.cmd run desktop:map:build`
- Browser/axe spot check the patched surfaces and save evidence in the implemented report.

## Docs and Ledger

Update:
- `docs/40_reports/GAME_STATE_RATING_MASTER.md`
- `docs/40_reports/implemented/YYYYMMDD_ACCESSIBILITY_P0_CLOSEOUT.md`
- `docs/plans/MASTER_ROADMAP.md`
- `docs/PROJECT_LEDGER.md`

Determinism: UI semantics/CSS only.

## Commit And Closeout

- Stage only accessibility discovery/report, component/CSS fixes, focused tests, roadmap, and ledger files owned by this plan.
- Closeout must list the four P0 categories and mark each PASS with test and browser/axe evidence.
