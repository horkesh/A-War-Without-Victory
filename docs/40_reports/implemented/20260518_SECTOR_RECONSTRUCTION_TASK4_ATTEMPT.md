# Sector Reconstruction Task 4 Attempt

**Date:** 2026-05-18
**Plan:** `docs/plans/2026-05-18-sector-reconstruction-performance-plan.md`
**Source attribution:** `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_ATTRIBUTION_TASK3.md`
**Lane:** Batch 9 sector performance Task 4
**Result:** Bounded code optimization shipped

## Summary

Task 3 identified `recoverDroppedFrontEdges:faction-front-claim-setup` as the dominant recovery child cost: 2491.228ms, 86.446% of combined `recoverDroppedFrontEdges:1+2` profile time.

This attempt adds a per-`buildCorpsFrontSectors(...)` cache for that faction-front claim setup and threads it only into the two `recoverDroppedFrontEdges(...)` calls inside the same build invocation. The cache is not module-level, does not survive the build call, does not skip final truth passes, and is bypassable through the existing focused cache equivalence flag `SECTOR_COLDSTART_CACHE_DISABLED=true`.

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/corps_front_sectors.ts` | Added `RecoveredFrontClaimSetup` and a build-scoped `recoveredFrontClaimSetupCache` reused by `recoverDroppedFrontEdges:1` and `recoverDroppedFrontEdges:2`. |
| `tests/sector_partition_instrumentation.test.ts` | Added a static guard proving the recovered-front setup cache is declared in `buildCorpsFrontSectors(...)`, passed to both recovery calls, and absent before the build function. |

## Optimization Shape

- Scope: one `Map<FactionId, RecoveredFrontClaimSetup>` allocated inside one `buildCorpsFrontSectors(...)` invocation.
- Reused data: per-faction `corpsEdges`, `friendlyOsids`, `componentOf`, `factionBrigadeLocations`, and `factionBrigadeComponents` derived from existing inputs.
- Cache lifetime: only the current `buildCorpsFrontSectors(...)` call.
- Ordering: unchanged; existing sorted iterations and final truth passes remain in place.
- Disabled path: `SECTOR_COLDSTART_CACHE_DISABLED=true` recomputes setup on each recovery call for byte-equivalence comparison.

## Verification

| Command | Result |
|---|---|
| `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts --reporter=dot` before implementation | Failed as expected: missing `const recoveredFrontClaimSetupCache`. |
| `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts --reporter=dot` after implementation | 9 tests passed. |
| `npx.cmd vitest run tests/sector_partition_buildCorpsFrontSectors_integration.test.ts --reporter=dot` | 5 tests passed; cached and uncached sector snapshots matched across pristine, final-pass, back-to-back, 100 deterministic variants, and war/final split cases. |
| `npx.cmd vitest run tests/final_sector_truth_reconciliation_cache.test.ts tests/final_sector_truth_reconciliation.test.ts tests/war_phase_step_order.test.ts --reporter=dot` | 13 tests passed. |
| `npm.cmd run typecheck` | Passed. |
| Parent `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/final_sector_truth_reconciliation_cache.test.ts tests/final_sector_truth_reconciliation.test.ts tests/war_phase_step_order.test.ts --reporter=dot` | 5 files / 27 tests passed, including 100 deterministic cache-on/cache-off sector variants. |
| Parent `npm.cmd run sim:scenario:run:40w:timed` | n1885 stayed hash-stable at `42607f83870e01d5`, 27/27 anchors, 6/6 bot benchmarks; timing total `96896.459ms` / `2422.411ms per turn`. |
| Parent `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1885` | Passed. |

## Expected Performance Impact

The optimization targets the repeated setup work across `recoverDroppedFrontEdges:1` and `recoverDroppedFrontEdges:2`. Based on Task 3's 40w profile, the theoretical local target is roughly one duplicate recovery setup computation per faction per build call, with an expected upper-range profile reduction around half of the 2491.228ms setup bucket before noise and residual non-reused work.

Parent timed 40w n1885 kept the final hash byte-identical to Batch 8 (`42607f83870e01d5`) and measured `96896.459ms` total / `2422.411ms per turn`. That is directionally lower than the Batch 6 n1881 timed run (`102962.338ms` total / `2574.058ms per turn`), but it is not a controlled A/B profile by itself; select the next sector optimization target from a fresh sidecar profile rather than this aggregate timing alone.

## Residual Risk

- The cache reuses arrays/maps by reference within one build invocation. Focused cache-on/cache-off snapshot tests passed, but the final 40w artifact comparison remains the definitive byte-identity gate.
- The cache affects only recovery setup reuse; other `mapOsidsToCorps(...)` calls later in the build remain uncached.
- No schema, scenario data, final truth pass, or shared integration docs were changed.
