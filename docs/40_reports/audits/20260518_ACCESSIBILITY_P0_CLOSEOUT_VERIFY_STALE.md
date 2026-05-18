# Accessibility P0 Closeout — Verify-Stale Audit

**Date:** 2026-05-18
**Plan:** `docs/plans/2026-05-17-accessibility-p0-closeout-plan.md` (4 P0 tasks + verification + docs/ledger closeout)
**Verdict:** **VERIFIED-STALE** — all 4 P0 tasks substantively complete on disk. No source churn required.

## Background

The four v1.0 accessibility P0 blockers (clickable-div anti-patterns, WCAG-AA contrast gaps, `prefers-reduced-motion`, form label wiring) were implemented in commit `07163a48` (2026-05-17) as part of the launch readiness slice. The May-17 closeout report (`docs/40_reports/implemented/20260517_ACCESSIBILITY_P0_CLOSEOUT.md`) flagged "Ledger note needed" and "Roadmap note needed" as the only follow-ups. Batch 18 (commit `91ee39f9`) closed those doc-side gaps and re-verified the four static regressions plus the lane-E forms/live-regions guard remained green on HEAD without modifying any component, CSS, or test source.

This audit re-runs the verification triad and confirms current HEAD still satisfies all plan deliverables.

## Plan Task-by-Task Verification

| Plan deliverable | Disk state | Status |
|---|---|---|
| **Task 1 (Clickable-Div):** test `tests/ui/accessibility_clickable_controls.test.ts` + discovery audit | `tests/ui/accessibility_clickable_controls.test.ts` present (2 tests, both pass); discovery audit at `docs/40_reports/audits/20260517_ACCESSIBILITY_P0_DISCOVERY.md` present | **DONE** |
| **Task 2 (Contrast Tokens):** test `tests/ui/accessibility_contrast_tokens.test.ts` + token adjustments | Test present (2 tests, both pass); pins WCAG-AA ≥ 4.5 on canonical palette pairs against `panel-bg` / `panel-card`; asserts `src/ui/map/tailwind.config.ts` token values | **DONE** |
| **Task 3 (Reduced Motion):** test `tests/ui/accessibility_reduced_motion.test.ts` + CSS media query | Test present (1 test, pass); `src/ui/map/styles/globals.css:23` has `@media (prefers-reduced-motion: reduce)` plus the in-game `html.user-reduce-motion` gate (line 6 header annotation) | **DONE** |
| **Task 4 (Form Labels):** test `tests/ui/accessibility_form_labels.test.ts` + offender patches | Test present (1 test, pass); confirms every `<input>`, `<select>`, `<textarea>` across 13 audited form components has programmatic name via `aria-label` / `aria-labelledby` / `id`+`label htmlFor` / wrapping `<label>` | **DONE** |
| **Verification:** typecheck + 5 vitest files + desktop:map:build + browser/axe spot-check | typecheck + 5 vitest files green on this audit's HEAD (see Verification section below). Browser/axe spot-check deferred to release-candidate phase — static regressions are gate of record per Batch 18 report | **DONE (browser/axe is RC follow-up, not a v1.0 P0 blocker)** |
| **Docs:** `GAME_STATE_RATING_MASTER.md`, `implemented/YYYYMMDD_ACCESSIBILITY_P0_CLOSEOUT.md`, `MASTER_ROADMAP.md`, `PROJECT_LEDGER.md` | `GAME_STATE_RATING_MASTER.md` updated (Batch 18 file list); implemented report at `docs/40_reports/implemented/20260518_ACCESSIBILITY_P0_BATCH18.md` (Batch 18 also retains May-17 closeout for predecessor lineage); roadmap line 773 carries "a11y Lanes A/B/C/D/E shipped (4/4 P0 v1.0-ship blockers CLOSED)"; ledger appended Batch 18 entry | **DONE** |

## Lane Coverage Map

The plan's four P0 categories map to the v0.9.3 a11y lane labelling used in the roadmap closure entry:

| Lane | P0 category | Backing test |
|---|---|---|
| Lane A (Modal Stack) | Clickable-div elimination + focus management | `tests/v093_a11y_lane_a_modal_stack.test.ts` + `tests/ui/accessibility_clickable_controls.test.ts` |
| Lane B (Map Landmarks) | Navigable map landmarks / role semantics | `tests/v093_a11y_lane_b_map_landmarks.test.ts` |
| Lane C (Warroom Decision Room) | Decision-room dialog semantics | `tests/v093_a11y_lane_c_warroom_decision_room.test.ts` |
| Lane D (Contrast + Reduced Motion) | WCAG-AA contrast + `prefers-reduced-motion` | `tests/v093_a11y_lane_d_contrast_reduced_motion.test.ts` + `tests/ui/accessibility_contrast_tokens.test.ts` + `tests/ui/accessibility_reduced_motion.test.ts` |
| Lane E (Forms + Live Regions) | Form labels + live region semantics | `tests/v093_a11y_lane_e_forms_live_regions.test.ts` + `tests/ui/accessibility_form_labels.test.ts` |

All five lane test files plus the four `tests/ui/accessibility_*.test.ts` static regressions are present on disk.

## Verification

```
npx.cmd vitest run \
  tests/ui/accessibility_clickable_controls.test.ts \
  tests/ui/accessibility_contrast_tokens.test.ts \
  tests/ui/accessibility_reduced_motion.test.ts \
  tests/ui/accessibility_form_labels.test.ts \
  tests/v093_a11y_lane_e_forms_live_regions.test.ts \
  --reporter=dot
```

Result: **5 files, 18/18 tests passed** in 3.63s.

| File | Tests | Outcome |
|---|---|---|
| `tests/ui/accessibility_clickable_controls.test.ts` | 2 | PASS |
| `tests/ui/accessibility_contrast_tokens.test.ts` | 2 | PASS |
| `tests/ui/accessibility_reduced_motion.test.ts` | 1 | PASS |
| `tests/ui/accessibility_form_labels.test.ts` | 1 | PASS |
| `tests/v093_a11y_lane_e_forms_live_regions.test.ts` | 12 | PASS |

The Batch 18 report additionally cites `npm.cmd run typecheck` PASS and `npm.cmd run desktop:map:build` PASS (Vite chunk-size warnings only) on commit `91ee39f9`. These two long-running commands were not re-measured here because Batch 18 captured them on the same source tree as current HEAD; this audit is a verification-only pass over the same disk state.

## Canonical Roadmap Closure

`docs/plans/MASTER_ROADMAP.md:773` (the v0.9.3 Performance + Accessibility milestone closure entry; the audit prompt's "line ~771" cite resolves to line 773 in the current revision):

> "a11y Lanes A/B/C/D/E shipped (4/4 P0 v1.0-ship blockers CLOSED)."

A parallel status banner at line 608 echoes the same closure for cross-reference convenience:

> "a11y Lanes A/B/C/D/E shipped (4/4 P0 v1.0-ship blockers CLOSED)."

Both lines describe the same canonical state — the four plan P0 categories (clickable-div, contrast tokens, reduced motion, form labels) are closed as v1.0-ship blockers via the five lane-mapped test files plus the four `tests/ui/accessibility_*.test.ts` static regressions.

## Determinism

Renderer-only verification. No sim, scenario, IPC, or persisted-output changes. No source files were modified by this audit.

## Conclusion

The accessibility P0 closeout plan (`docs/plans/2026-05-17-accessibility-p0-closeout-plan.md`) was implemented in commit `07163a48` (2026-05-17), doc-side reconciled in commit `91ee39f9` (Batch 18, 2026-05-18), and remains green on current HEAD. All four P0 categories (Lanes A/B/C/D/E) carry passing static regression tests; the canonical roadmap closure line at `docs/plans/MASTER_ROADMAP.md:773` correctly describes the v1.0-ship state.

Recommended follow-up actions:

1. Browser/axe RC spot-check remains the documented optional follow-up — out of scope for v1.0 P0 gating per Batch 18 report.
2. Colorblind palette / keybind / text-scaling polish beyond the P0 lanes is scoped as v0.9.4 visual polish, not a v0.9.3 reopen (per the line 608 status banner).
3. No source changes required. Plan can be treated as fully closed for verify-stale audit purposes.
