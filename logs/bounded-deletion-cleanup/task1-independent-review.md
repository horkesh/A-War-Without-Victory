# Cleanup Task 1 — independent review

**Date:** 2026-09-08
**Reviewer:** independent Systems / QA review (Sol)
**Base / branch:** `650fad4ec` / `codex/cleanup-browser-combat`
**Verdict:** **GO**

## Scope reviewed

- deletion of `src/sim/run_combat_browser.ts`;
- removal of its unused import from `src/ui/warroom/ClickableRegionManager.ts`;
- current entrypoint and ownership corrections in the five changed engineering documents;
- Task 1 continuity updates and supplied search, typecheck, Warroom-build, documentation-test, and diff-check receipts.

Tasks 2–8, campaigns, generators, production data, dependency work, and other cleanup were outside this review.

## Findings

No blocking or non-blocking source finding remains.

The deleted 44-line module contained imports, type declarations, and the exported `runPhaseIITurn` function only. It had no top-level registration, mutation, I/O, or other import side effect. The pre-deletion tracked search found the definition and one unused import but no invocation. The post-deletion executable search returns no match for `runPhaseIITurn` or `run_combat_browser`.

The live Warroom path is preserved. `ClickableRegionManager` still prefers `bridge.advanceTurn()` and, when that bridge is absent, still imports and invokes `runPhaseITurn` from `src/sim/run_early_war_browser.ts`. Neither that call nor the canonical `src/sim/turn_pipeline.ts::runTurn` owner changed.

The five current engineering documents now describe the desktop IPC owner, canonical war pipeline, and retained bounded browser fallback consistently. Historical reports and plans remain historical. During review, `docs/plans/MASTER_ROADMAP.md` had one stale BC09/BC07 status sentence; it was corrected to the already-settled BC09 reviewed-GO and BC07 RETAIN dispositions before this verdict.

No canon conflict was found. No `docs/10_canon` content, game rule, state/schema contract, production input, or live simulation behavior changed. No determinism risks were found: the change removes unreachable, side-effect-free code and introduces no RNG, ordering, time, I/O, or mutation path.

## Evidence checked

- `logs/bounded-deletion-cleanup/task1-search.log`: no executable matches after deletion; live fallback import/export/invocation recorded.
- `logs/bounded-deletion-cleanup/task1-typecheck.log`: `npm.cmd run typecheck`, exit 0.
- `logs/bounded-deletion-cleanup/task1-warroom-build.log`: `npm.cmd run warroom:build`, exit 0; 664 modules transformed and build completed in 6.29 seconds.
- `logs/bounded-deletion-cleanup/task1-docs-tests.log`: 3 files / 13 tests passed, exit 0.
- `logs/bounded-deletion-cleanup/task1-diff-check.log`: `git diff --check`, exit 0 (line-ending warnings only).

The plan explicitly requires no new test for this uncalled, side-effect-free deletion. The search proof plus typecheck and Warroom build directly cover the relevant failure modes.

## Disposition

**GO for Cleanup Task 1's separate local commit.** This verdict closes only Task 1. Tasks 2–8 and all deferred campaign, calibration, build-preparation, and packaged-acceptance gates remain open.
