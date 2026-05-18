# Sector Reconstruction Batch 16

**Date:** 2026-05-18
**Baseline:** Batch 15 / 40w n1891 `0d8d9ccdc477d77a`
**Result:** `buildFactionSectors(...):brigade-classification` now has child attribution labels for profile-guided follow-up. No sector rule, cache lifetime, save field, scenario data, random source, or timestamp-derived gameplay value changed.

## Summary

- Added deterministic, env-gated child labels inside the remaining `brigade-classification` profile bucket.
- Kept the parent label intact so Batch 15 and Batch 16 profiles remain comparable.
- Used a fresh profiled 40w run to identify the real child owners: territory assignment and minimum-sector coverage, not commander-profile construction or cross-corps enclave defense.

## Profiling Evidence

Fresh Batch 16 profile: `PERF_PROFILE_SECTOR_PARTITION=true npm.cmd run sim:scenario:run:40w:timed`

Run: `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1892`

Final hash: `0d8d9ccdc477d77a` (same as Batch 15)

Aggregation source: tail 94 invocation records from `data/derived/_debug/sector_partition_perf.jsonl`

| Label | Aggregate ms | Count |
|---|---:|---:|
| `buildFactionSectors:RS` | 3588.555 | 94 |
| `buildFactionSectors:RBiH` | 3436.952 | 94 |
| `recoverDroppedFrontEdges:1` | 1669.750 | 94 |
| `buildFactionSectors:RBiH:corps-sector-construction` | 1492.138 | 94 |
| `recoverDroppedFrontEdges:faction-front-claim-setup` | 1340.104 | 282 |
| `buildFactionSectors:RS:corps-sector-construction` | 1153.307 | 94 |
| `buildFactionSectors:RS:brigade-classification` | 839.921 | 94 |
| `buildFactionSectors:RBiH:brigade-classification` | 628.263 | 94 |

### Brigade Classification Child Labels

| Label | Aggregate ms | Count |
|---|---:|---:|
| `buildFactionSectors:RS:brigade-classification:territory-assignment` | 443.984 | 94 |
| `buildFactionSectors:RBiH:brigade-classification:territory-assignment` | 434.018 | 94 |
| `buildFactionSectors:RS:brigade-classification:minimum-sector-coverage` | 378.808 | 94 |
| `buildFactionSectors:RBiH:brigade-classification:minimum-sector-coverage` | 182.848 | 94 |
| `buildFactionSectors:RS:brigade-classification:commander-profile-build` | 15.476 | 94 |
| `buildFactionSectors:RBiH:brigade-classification:commander-profile-build` | 10.005 | 94 |
| `buildFactionSectors:RS:brigade-classification:cross-corps-enclave-defense` | 0.132 | 94 |
| `buildFactionSectors:RBiH:brigade-classification:cross-corps-enclave-defense` | 0.127 | 94 |

## Changes Made

### Sector Attribution

- Wrapped the existing commander profile build, territory assignment, cross-corps enclave defense, and minimum-sector coverage calls with nested `_perfTime(...)` labels.
- Preserved the outer `brigade-classification` label for aggregate continuity.
- Added no global cache and no invocation-local data reuse; this batch is attribution-only.

### Tests

- Extended `tests/sector_partition_instrumentation.test.ts` so the static instrumentation contract requires the new child labels.
- Verified the test failed before implementation on the first missing child label, then passed after the wrappers were added.

## Verification

| Command | Result |
|---|---|
| `npx.cmd vitest run tests\sector_partition_instrumentation.test.ts --reporter=dot` before implementation | Failed as expected: missing `buildFactionSectors:${faction}:brigade-classification:commander-profile-build`. |
| `npx.cmd vitest run tests\sector_partition_instrumentation.test.ts --reporter=dot` after implementation | Passed: 1 file, 12 tests. |
| `PERF_PROFILE_SECTOR_PARTITION=true npm.cmd run sim:scenario:run:40w:timed` | Passed; produced n1892 `0d8d9ccdc477d77a`. |
| `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1892` | Passed. |
| `npx.cmd vitest run tests\sector_partition_instrumentation.test.ts tests\sector_partition_buildCorpsFrontSectors_integration.test.ts tests\sector_frontline_truth.test.ts --reporter=dot` | Passed: 3 files, 48 tests. |
| `npm.cmd run sim:scenario:run:40w` parent integration | Passed; produced n1893 `b14179d65639860c`, 27/27 anchors, 6/6 bot benchmarks. The hash move is from the concurrent intel casualty hook, not the sidecar-only sector labels. |

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/corps_front_sectors.ts` | Added child `_perfTime(...)` labels under `buildFactionSectors:${faction}:brigade-classification`. |
| `tests/sector_partition_instrumentation.test.ts` | Added static contract coverage for the new classification child labels. |
| `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_BATCH16.md` | Recorded Batch 16 evidence, verification, and next target. |

## Next Target

The next sector follow-up should optimize or further attribute one of these measured owners:

1. `buildFactionSectors:*:corps-sector-construction`, still the larger build-local owner.
2. `buildFactionSectors:*:brigade-classification:territory-assignment`, the largest classification child.
3. `buildFactionSectors:RS:brigade-classification:minimum-sector-coverage`, if the next lane chooses classification over construction.

Do not target commander-profile build or cross-corps enclave defense first; Batch 16 shows those are not meaningful remaining owners.
