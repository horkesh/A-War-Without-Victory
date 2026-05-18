# Sector Reconstruction Performance Plan

**Date:** 2026-05-18
**Lane:** sector performance planning and instrumentation
**Baseline:** Batch 6 n1881, hash `42607f83870e01d5`
**Result:** Execution-grade plan created. No simulation behavior changed.

## Summary

- Created an owned sector reconstruction performance plan at `docs/plans/2026-05-18-sector-reconstruction-performance-plan.md`.
- Used Batch 6 measured evidence to scope the next work to sector reconstruction/reconciliation, especially `recoverDroppedFrontEdges:*` after deeper attribution.
- Preserved the lane boundary: no changes to `src/sim/combat/corps_front_sectors.ts`, no shared integration-doc edits, and no speculative optimization.

## Evidence Used

| source | key finding |
|---|---|
| `docs/40_reports/implemented/20260518_PERFORMANCE_WALL_CLOCK_BATCH6_MEASURED_FOLLOWUP.md` | 40w n1881 stayed hash-stable at `42607f83870e01d5`; total wall-clock was 102962.338ms. |
| `tools/perf/wall_clock_target_report.ts` | Existing deterministic sidecar helper reports timing buckets without writing to scenario truth artifacts. |
| `tools/perf/profile_hotspot_report.ts` | Existing deterministic sidecar helper summarizes profile and sector-partition JSONL evidence. |
| `tests/sector_partition_instrumentation.test.ts` | Current opt-in sector instrumentation is flag-gated, sorted, timestamp-free, and sidecar-only. |
| `tests/final_sector_truth_reconciliation_cache.test.ts` | Existing final-sector reconciliation cache has focused invalidation coverage. |
| `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts` | Existing real-save equivalence gate is the right guard for future bounded sector optimizations. |

## Plan Contents

The plan defines:

- exact baseline reproduction commands;
- hotspot and sector-subprofile refresh commands;
- a first implementation task limited to deeper read-only attribution inside `recoverDroppedFrontEdges(...)`;
- allowed and disallowed optimization patterns;
- focused test requirements;
- 40w byte-identity proof requirements;
- stop conditions for drift, nondeterminism, behavior change, and speculative caching.

## Files Changed

| file | change |
|---|---|
| `docs/plans/2026-05-18-sector-reconstruction-performance-plan.md` | New sector-owned execution plan. |
| `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_PERFORMANCE_PLAN.md` | New planning/implementation report. |

## Verification

- `rg --files docs/plans docs/40_reports/implemented tools/perf tests` confirmed every linked repo path used by the plan/report exists.
- `npx.cmd vitest run tests/profile_hotspot_report.test.ts tests/wall_clock_target_report.test.ts tests/sector_partition_instrumentation.test.ts tests/final_sector_truth_reconciliation_cache.test.ts --reporter=dot` passed 4 files / 17 tests.
- Ledger handling was considered, but this lane intentionally did not edit `docs/PROJECT_LEDGER.md` because the parent owns shared integration docs for Batch 7.

## Next Step

Implement Task 3 from the plan: add deeper opt-in `PERF_PROFILE_SECTOR_PARTITION=true` attribution inside `recoverDroppedFrontEdges(...)`, prove the new sidecar labels are deterministic and timestamp-free, then choose the first bounded optimization from the measured inner-loop leader.
