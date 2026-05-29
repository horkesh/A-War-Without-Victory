# Sector Coverage Corps Group Reuse

**Date:** 2026-05-26  
**Type:** Deterministic sector/frontline performance optimization  
**Plan:** `docs/plans/2026-05-26-sector-truth-reconciliation-byte-identity-plan.md` Phase 1  
**Result:** Byte-identical final hash preserved; performance evidence is mixed/noisy.

## Summary

Phase 1 implemented one narrow invocation-local optimization inside `ensureMinimumSectorCoverage(...)`: the sorted `sectorsByCorps.entries()` view is now built once per invocation and reused across the coverage passes that previously materialized and sorted the same corps-sector groups repeatedly.

This does not introduce a broad cache, module-level cache, cross-turn cache, persisted state, save-schema field, scenario data change, or mutable `Map`/`Set` leakage. The reused value is a function-local array sorted with the existing strict comparator, and it references the same per-corps sector arrays that the previous loops consumed.

## Files Changed

- `src/sim/combat/brigade_assignment.ts`
- `tests/sector_partition_instrumentation.test.ts`

## TDD Proof

- Added a static contract test requiring `ensureMinimumSectorCoverage(...)` to declare `sortedCorpsSectorGroups`, to avoid repeated `[...sectorsByCorps.entries()].sort(...)` after that declaration, and to remain free of timing sources.
- Red proof before implementation: the focused test failed because `sortedCorpsSectorGroups` did not exist.
- Green proof after implementation: the focused test passed.

## Verification

| Gate | Result |
| --- | --- |
| Focused sector tests | PASS, 5 files / 41 tests |
| `npm.cmd run typecheck` | PASS after adding local ignored dependency junctions for this worktree |
| Profiled 40w proof | PASS, final hash preserved |
| Baseline regression | PASS, all scenarios match |
| `git diff --check` | PASS |

Focused sector command:

```powershell
node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\final_sector_truth_reconciliation_cache.test.ts tests\final_sector_truth_reconciliation.test.ts tests\sector_partition_buildCorpsFrontSectors_integration.test.ts tests\sector_partition_instrumentation.test.ts tests\war_phase_step_order.test.ts --reporter=dot
```

Profile command used the parent repo's `tsx` because this worktree initially lacked its own `node_modules/tsx` package:

```powershell
$env:PERF_PROFILE_SECTOR_PARTITION='true'
node F:\A-War-Without-Victory\node_modules\tsx\dist\cli.mjs tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_truth_reconciliation_post_profile --report data/derived/_debug/sector_truth_reconciliation_post_profile_40w.json
```

## Hash Evidence

| Run | Final hash |
| --- | --- |
| Clean pre-change profile | `f219401f4a17f311` |
| Post-change profile | `f219401f4a17f311` |

## Timing Evidence

| Bucket | Before | After | Delta |
| --- | ---: | ---: | ---: |
| `reconcile-final-sector-truth` | 9555.383ms | 8079.037ms | -1476.345ms |
| `partition-corps-front-sectors` | 11060.971ms | 8860.342ms | -2200.629ms |
| `reconcile-final-sector-truth-after-ops` | 3266.196ms | 2681.481ms | -584.714ms |
| `sealMergedSectorTruth:ensure-coverage` | 2135.188ms from the profile evidence closeout | 4308.496ms from the post sidecar | not comparable |
| Total profiled wall time | 112.01s | 117.96s | +5.95s |

The phase buckets moved in the expected direction, but full scenario wall time moved the wrong way and the comparable local pre-change `sealMergedSectorTruth:ensure-coverage` sidecar was overwritten by the post profile output. Per the plan acceptance rule, this report does not claim a realized scenario speedup; it claims only byte-identity with a narrow local allocation/sort reduction and mixed timing evidence.

## Generated Outputs

Generated profile and baseline outputs remain ignored and unstaged under `data/derived/_debug/`, `data/derived/scenario/_baseline_tmp/`, and `runs_perf/`. Ignored local dependency junctions were used only so this worktree could run the required npm scripts.

## Residual Risk

The change is intentionally low-risk because it only removes repeated local sorting. Remaining sector/frontline performance work should re-profile from the preserved hash before choosing another target, especially if it needs comparable sub-function timing for `sealMergedSectorTruth:ensure-coverage`.
