# Vlašić February Planning Boundary — Result Report

**Date:** 2026-09-28
**Worktree:** `april-1995-glamoc/A-War-Without-Victory`

## Changes

### 1. `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts`

- `dateWindowVlasic`: lower bound changed from `turn < 152` to `turn < 150` (week beginning 1995-02-20). Closing bound remains `turn > 166`.
- Reason strings updated to describe a February planning / spring operation window.
- `VLASIC_RIDGE_95_OPPORTUNITY.planning_duration` was not changed by the February-boundary edit; the existing candidate value is 2. No combat, objective, faction, painted-control, denominator, or other-opportunity changes.

### 2. `tests/operation_opportunities_central_bosnia_catalog.test.ts`

- Pre-window case in the "does not surface before/after window" test updated from `turn: 151` to `turn: 149`.
- New focused test `'surfaces at the February planning boundary turn 150'` added, asserting the eligible fixture produces `OPP_150_vlasic_ridge_95` with status `eligible_pending_review` and `isOpportunityEligible === true`.
- Existing post-window (t167) and blocked-prerequisite cases retained unchanged.

## Cheap Checks (in order)

| # | Command | Exit | Result |
|---|---------|------|--------|
| 1 | `git diff --check` | 0 | Clean — no whitespace/conflict-marker errors |
| 2 | `npx.cmd vitest run tests/operation_opportunities_central_bosnia_catalog.test.ts` | 0 | 16/16 tests passed (1 file, 16 tests, 38ms) |
| 3 | `npm.cmd run typecheck` | 0 | `tsc --noEmit` clean |

## Validation Answer

**Yes.** The February boundary exposes the eligible Vlašić proposal at t150 while keeping t149 and t167 closed. The optional `weatherSeasonVlasic` predicate (red below t154) does not block eligibility because the remaining three optional axes (logistics, commander_confidence, force_quality) are green, satisfying `min_optional_axes: 2`. Type correctness is preserved.

## Logs

- `logs/vlasic-march-timing-20260928/git-diff-check.log`
- `logs/vlasic-march-timing-20260928/vitest.log`
- `logs/vlasic-march-timing-20260928/typecheck.log`

## Scope

No commit, no merge, no scenario run, no full suite, no package build. Donja Mahala candidate and unrelated worktree changes untouched.
