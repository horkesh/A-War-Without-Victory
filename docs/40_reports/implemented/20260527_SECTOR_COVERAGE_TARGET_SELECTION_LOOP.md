# Sector Coverage Target Selection Loop

**Date:** 2026-05-27
**Baseline:** `5d94adbfdb09bbda`
**Result:** Byte-identical 40w profile hash `5d94adbfdb09bbda`

## Summary
- Implemented a narrow `ensureMinimumSectorCoverage(...)` performance slice in `src/sim/combat/brigade_assignment.ts`.
- Replaced `pickVacantLocalFrontTarget(...)` filter/map/filter materialization with a deterministic ordered loop plus the same final sort.
- Added invocation-local movement-state/order aliases for the hot severe rescue eligibility filters.

## Changes Made

### Sector Coverage Rescue
- `pickVacantLocalFrontTarget(...)` now skips occupied/unreachable targets before allocating candidate records.
- The final candidate ordering remains `dist`, then `strictCompare(target)`.
- `ensureMinimumSectorCoverage(...)` reads `brigade_movement_state` and `brigade_movement_orders` once per invocation and uses those immutable local views in repeated filters.

### Tests
- Extended `tests/sector_partition_instrumentation.test.ts` static contracts to cover the invocation-local movement views and the deterministic target-selection loop.
- Focused sector truth/order tests and required sector verification stayed green.

## Profile Evidence

| Metric | Supplied main baseline | Same-machine `origin/main` check | Post-slice profile |
| --- | ---: | ---: | ---: |
| `reconcile-final-sector-truth` | 7378.7446ms / 40 | 22608.3127ms / 40 | 7901.9543ms / 40 |
| `partition-corps-front-sectors` | 7051.4919ms / 40 | 32290.3498ms / 40 | 7806.6525ms / 40 |
| `reconcile-final-sector-truth-after-ops` | 2603.2670ms / 40 | 11408.7375ms / 40 | 2774.4366ms / 40 |
| `sealMergedSectorTruth:ensure-coverage` | 1883.7516ms | 2171.6060ms | 2175.6227ms |
| `ensureMinimumSectorCoverage:severe-rescue:floor-completion` | 712.9144ms | 805.3171ms | 807.0146ms |
| `ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned` | 668.3441ms | 816.1526ms | 798.6458ms |

The same-machine `origin/main` worktree showed much higher parent phase totals than the supplied baseline, so parent wall-clock numbers are treated as noisy. The targeted child evidence is stable enough to show the slice is byte-identical and modestly improves `:zero-assigned` against the same-machine main check while `:floor-completion` is effectively flat.

## Lessons Learned
- An attempted invocation-local front OSID view cache preserved the final hash but regressed `sealMergedSectorTruth:ensure-coverage`, matching the existing warning against front/reserve/territory set caches in this area. It was reverted before closeout.
- For this hotspot, avoiding intermediate arrays in the target selector is safer than caching derived sector sets.
- `npm.cmd run test:baselines` currently fails locally on `apr1992_52w` `final_save.json` (`814386ed9ce2fa96...` expected, `e11a68b2da3d...` actual). Reversing only this runtime slice and rerunning produced the same mismatch, so this report treats the local 52w baseline failure as pre-existing/platform-bound rather than caused by the target-selection loop.

## Files Changed

| File | Change |
| --- | --- |
| `src/sim/combat/brigade_assignment.ts` | Narrow target-selection loop and movement-view aliases. |
| `tests/sector_partition_instrumentation.test.ts` | Static byte-identity/performance-slice contracts. |
| `docs/plans/2026-05-20-sector-performance-next-target-plan.md` | Current clean baseline hash note. |
| `docs/plans/COMMAND_BOARD.md` | Current sector baseline and drift note. |
| `docs/40_reports/audits/20260518_MASTER_BACKLOG_EXECUTION_QUEUE.md` | Current sector baseline note. |

## Next Steps
- Keep using `5d94adbfdb09bbda` as the clean sector/frontline pre-change baseline until a later accepted main changes it.
- Treat broad sector-front view caches as a known bad candidate unless new evidence changes the cost model.
