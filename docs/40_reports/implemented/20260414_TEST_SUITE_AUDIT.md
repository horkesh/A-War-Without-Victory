# Test Suite Audit — 2026-04-14

## Summary

| Category | Files | Tests | Lines |
|---|---|---|---|
| vitest | 297 | 3,499 | 83,812 |
| node:test | 200 | ~1,273 | 37,542 |
| **Total** | **497** | **~4,772** | **121,354** |

Only vitest runs in the standard `npm run test:vitest` pipeline. The 200 node:test files run via `npm test` (separate runner). Both frameworks pass when run, but **only vitest is used as a gate** in daily development.

## Problems Found

### Problem 1: Two test frameworks, 172 files overlap (BIGGEST ISSUE)

172 of 200 node:test files test the same source modules that vitest files also cover. This is **dual-framework coverage** of the same code — double the maintenance cost for zero additional confidence.

The 28 node:test files with unique coverage (no vitest equivalent) are genuinely valuable — they test desktop packaging, determinism scanning, campaign unlock, and dev UI surfaces that vitest doesn't reach.

**Recommendation:** Migrate the 172 overlapping node:test files to vitest. Delete the node:test copies. Keep the 28 unique node:test files (or migrate those too if their imports work under vitest).

**Impact:** -172 files, -37,542 lines. One test framework, one runner, one gate.

### Problem 2: 89 single-test files

89 files contain exactly 1 test each. Many are bug-fix regression locks created during hardening sessions. Examples:
- `arbih_mobilization_cap.test.ts` (11 lines, 1 test)
- `initial_territory_pacing.test.ts` (12 lines, 1 test)
- `operation_combat_feedback.test.ts` (10 lines, 1 test)
- `rbih_aligned_municipalities.test.ts` (11 lines, 1 test)

These are not wrong individually, but they fragment the test suite. A single `regression_locks.test.ts` with 89 tests organized by domain would be easier to maintain and faster to scan.

**Recommendation:** Consolidate single-test files by domain:
- `regression_locks_combat.test.ts` (combat/battle bug fixes)
- `regression_locks_sector.test.ts` (sector/frontline bug fixes)
- `regression_locks_scenario.test.ts` (scenario data/init bug fixes)
- `regression_locks_ui.test.ts` (UI/adapter bug fixes)

**Impact:** -89 files → ~4 files. Same test count, less noise.

### Problem 3: 1 file with 0 tests, 580 lines of dead code

`battle_resolution.test.ts` — 580 lines, 9 `test.skip()` calls, 0 active tests. References legacy `battle_resolution.js` and `resolve_attack_orders.js` APIs that were replaced by the `attack_resolution_osid.ts` system. The decomposition program added 187 tests for the new system across 8 files.

**Recommendation:** Delete `battle_resolution.test.ts`. The legacy API is gone. The new tests (`attack_equipment_effects.test.ts`, `attack_casualty_distribution.test.ts`, etc.) cover the replacement.

**Impact:** -580 lines of dead code.

### Problem 4: 26 scenario-running tests (slow)

26 test files run full scenarios via `runScenario()`. These are valuable integration tests but each takes 30-120 seconds. They dominate the ~500s vitest runtime.

**Recommendation:** Don't remove, but tag them for separate CI stage. Currently they all run in the single `npm run test:vitest` pipeline, making the feedback loop slow for unit-level changes.

### Problem 5: 13 real-save dependent tests (fragile)

13 files depend on `data/derived/latest_run_final_save.json`. They break or produce false results when the save changes. Most use `skipIf(!hasSave)` guards, but the coupling is structural.

**Recommendation:** These are genuinely valuable (the round-trip tests I added today are in this category). Keep them but accept that they test against a moving target. Document that the save must be refreshed after behavior changes.

### Problem 6: `command_authority.test.ts` — 290 tests, 2888 lines

This is the largest test file by far. It grew across multiple hardening waves (v0.8.x-final command authority cleanup). Likely has overlapping coverage from different waves testing the same invariants from different angles.

**Recommendation:** Audit for internal overlap. Some tests probably assert the same thing with slightly different fixtures. A focused dedup pass could probably cut it to ~150 tests without losing coverage.

## What's NOT a problem

- **Decomposition tests (187 across 8 files):** Each file tests one extracted module. Clean ownership, no overlap, valuable for catching regressions.
- **Commander tests (255 across 14 files):** Well-organized by maturity phase. Each file tests a distinct aspect of commander intelligence.
- **Autonomy tests (113 across 7 files):** Clean, organized by phase.
- **Political tests (226 across 13 files):** Well-scoped, each file tests one political subsystem.

## Prioritized Action Plan

| Priority | Action | Files removed | Lines saved | Effort |
|---|---|---|---|---|
| 1 | Delete `battle_resolution.test.ts` | 1 | 580 | 1 min |
| 2 | Consolidate 89 single-test files into ~4 domain files | -85 | ~0 (same tests, fewer files) | 2-3 hours |
| 3 | Migrate 172 overlapping node:test → vitest | -172 | ~25,000+ | 1-2 days |
| 4 | Dedup `command_authority.test.ts` | 0 | ~1,500 | 2-3 hours |
| 5 | Tag scenario-running tests for separate CI stage | 0 | 0 | 30 min |

**Total potential reduction:** ~258 files, ~27,000 lines. From 497 files to ~239. Same real coverage.

## Verdict

About **40% of the test files are unnecessary overhead** — not because the tests are wrong, but because:
1. Two frameworks test the same code (172 overlapping node:test files)
2. One-test-per-file fragmentation (89 files)
3. One dead file (battle_resolution.test.ts)

The actual test LOGIC is mostly sound. The problem is organizational, not logical. The fix is consolidation and framework unification, not deletion of test coverage.
