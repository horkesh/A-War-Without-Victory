# Sector Reconstruction Build-Sector Attribution Batch 13

**Date:** 2026-05-18
**Run ID:** Not applicable
**Baseline:** Batch 12 sector profiling attributed `buildMultiSectorsForCorps(...)`
**Result:** `buildSectorFromSubSegments(...)` now has deterministic, optional child attribution labels

## Summary
- Added default-off perf attribution inside `buildSectorFromSubSegments(...)` without changing sector construction inputs, ordering, or returned sector shape.
- Threaded the existing `SectorPartitionPerfTimer` through normal multi-sector construction and recovered-front-edge sector reconstruction.
- Added a static instrumentation contract test before implementation and verified focused sector suites plus TypeScript.

## Labels Added
- `buildSectorFromSubSegments:${corpsId}:${sectorIndex}:assigned-brigade-scan`
- `buildSectorFromSubSegments:${corpsId}:${sectorIndex}:defensive-power`
- `buildSectorFromSubSegments:${corpsId}:${sectorIndex}:enemy-power-scan`
- `buildSectorFromSubSegments:${corpsId}:${sectorIndex}:input-aggregation`
- `buildSectorFromSubSegments:${corpsId}:${sectorIndex}:sector-record-assembly`
- `buildSectorFromSubSegments:${corpsId}:${sectorIndex}:sorted-edge-list`

## Changes Made
### Sector Reconstruction
- `src/sim/combat/sector_building.ts`
  - Added an optional `perfTime` parameter to `buildSectorFromSubSegments(...)`, defaulting to direct execution.
  - Wrapped input aggregation, edge sorting, assigned-brigade scan, defensive-power computation, enemy-power scan, and sector-record assembly.
  - Passed `perfTime` from both `buildMultiSectorsForCorps(...)` call sites.

### Recovered Edge Reconstruction
- `src/sim/combat/corps_front_sectors.ts`
  - Passed `_perfTime` into the recovered-front-edge `buildSectorFromSubSegments(...)` call so recovered sectors are attributed under the same static label family.

### Test Contract
- `tests/sector_partition_instrumentation.test.ts`
  - Added a static contract guard for the `buildSectorFromSubSegments(...)` label list and nondeterministic-pattern exclusions.
  - RED result before implementation: `cmd /c npx vitest run tests/sector_partition_instrumentation.test.ts` failed 1 test because the expected `buildSectorFromSubSegments` labels were absent.

## Verification
| Command | Result |
|---|---|
| `cmd /c npx vitest run tests/sector_partition_instrumentation.test.ts` | PASS: 1 file, 12 tests |
| `cmd /c npx vitest run tests/sector_partition_instrumentation.test.ts tests/sector_rearrangement.test.ts tests/sector_contiguity_split.test.ts tests/sector_split_brigade_assignment.test.ts tests/sector_frontline_truth.test.ts` | PASS: 5 files, 67 tests |
| `cmd /c npm run typecheck` | PASS: `tsc --noEmit -p tsconfig.json` |
| Parent `npm.cmd run sim:scenario:run:40w` | PASS: n1889 hash `248202ee4fd13027`, byte-identical to n1888, 27/27 anchors, 6/6 bot benchmarks |
| Parent `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1889` | PASS |

Note: `npx vitest ...` through PowerShell failed before test execution because local execution policy blocks `npx.ps1`; rerunning through `cmd /c npx` executed Vitest normally.

## Residual Risk
- The new labels include `sectorIndex`, so flagged perf JSONL can have more buckets than the Batch 12 corps-level labels. This is intentional for per-sector attribution, but large scenario profiles will be more verbose.
- Parent integration ran 40w and proved byte identity against n1888; future optimization lanes still need their own byte-identity proof after using these labels.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/sector_building.ts` | Optional build-sector perf labels and timer plumbing |
| `src/sim/combat/corps_front_sectors.ts` | Recovered-sector call passes existing perf timer |
| `tests/sector_partition_instrumentation.test.ts` | Static label contract for build-sector attribution |
| `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_BUILD_SECTOR_ATTRIBUTION_BATCH13.md` | Implementation report |
