# Sector Reconstruction Batch 17

**Date:** 2026-05-18
**Baseline:** Batch 16 / 40w n1893 `b14179d65639860c`
**Result:** `buildFactionSectors(...):corps-sector-construction:${corpsId}` now has child attribution for the build call versus the staffability filter. No sector rule, cache lifetime, save field, scenario data, random source, or timestamp-derived gameplay value changed.

## Summary

- Added default-off, sidecar-only perf labels under the broad per-corps construction owner identified by Batch 16.
- Preserved the existing parent `buildFactionSectors:${faction}:corps-sector-construction:${corpsId}` label so Batch 11-17 profiles remain comparable.
- Chose attribution over optimization because Batch 16 did not expose an obvious byte-identical reuse boundary inside the owned orchestrator file.

## Profiling Evidence

Fresh Batch 17 profile: `PERF_PROFILE_SECTOR_PARTITION=true npm.cmd run sim:scenario:run:40w:timed`

Run: `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1894`

Final hash: `b14179d65639860c` (same as Batch 16 integrated-context proof)

Aggregation source: tail 94 invocation records from `data/derived/_debug/sector_partition_perf.jsonl`

| Label | Aggregate ms | Count |
|---|---:|---:|
| `buildFactionSectors:RBiH:corps-sector-construction:arbih_1st_corps:multi-sector-build` | 376.616 | 94 |
| `buildFactionSectors:RBiH:corps-sector-construction:arbih_2nd_corps:multi-sector-build` | 243.989 | 94 |
| `buildFactionSectors:RS:corps-sector-construction:vrs_1st_krajina:multi-sector-build` | 210.313 | 94 |
| `buildFactionSectors:RS:corps-sector-construction:vrs_herzegovina:multi-sector-build` | 191.993 | 94 |
| `buildFactionSectors:RBiH:corps-sector-construction:arbih_3rd_corps:staffability-filter` | 185.249 | 94 |
| `buildFactionSectors:RBiH:corps-sector-construction:arbih_2nd_corps:staffability-filter` | 175.377 | 94 |
| `buildFactionSectors:RS:corps-sector-construction:vrs_drina:multi-sector-build` | 172.371 | 94 |
| `buildFactionSectors:RBiH:corps-sector-construction:arbih_3rd_corps:multi-sector-build` | 137.172 | 94 |
| `buildFactionSectors:RS:corps-sector-construction:vrs_sarajevo_romanija:multi-sector-build` | 127.578 | 94 |
| `buildFactionSectors:RS:corps-sector-construction:vrs_east_bosnian:multi-sector-build` | 88.774 | 94 |
| `buildFactionSectors:RBiH:corps-sector-construction:arbih_1st_corps:staffability-filter` | 86.416 | 94 |
| `buildFactionSectors:RS:corps-sector-construction:vrs_2nd_krajina:multi-sector-build` | 86.131 | 94 |

## Changes Made

### Sector Attribution

- Wrapped the existing `buildMultiSectorsForCorps(...)` call with nested `multi-sector-build` attribution under the per-corps construction parent.
- Wrapped the existing `canCorpsStaffSectorFront(...)` filter loop with nested `staffability-filter` attribution.
- Added no new cache, no persisted state, and no new ordering source. Both labels remain under the existing `PERF_PROFILE_SECTOR_PARTITION=true` sidecar writer.

### Tests

- Extended `tests/sector_partition_instrumentation.test.ts` so the static instrumentation contract requires the new deterministic child labels.
- Verified the test failed before implementation on the missing `multi-sector-build` label, then passed after the wrappers were added.

## Verification

| Command | Result |
|---|---|
| `npx.cmd vitest run tests\sector_partition_instrumentation.test.ts --reporter=dot` before implementation | Failed as expected: missing `buildFactionSectors:${faction}:corps-sector-construction:${corpsId}:multi-sector-build`. |
| `npx.cmd vitest run tests\sector_partition_instrumentation.test.ts --reporter=dot` after implementation | Passed: 1 file, 12 tests. |
| `npx.cmd vitest run tests\sector_partition_instrumentation.test.ts tests\sector_partition_buildCorpsFrontSectors_integration.test.ts tests\sector_frontline_truth.test.ts --reporter=dot` | Passed: 3 files, 48 tests. |
| `PERF_PROFILE_SECTOR_PARTITION=true npm.cmd run sim:scenario:run:40w:timed` | Passed; produced n1894 `b14179d65639860c`. |
| `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1894` | Passed. |

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/corps_front_sectors.ts` | Added nested sidecar labels under per-corps construction for `multi-sector-build` and `staffability-filter`. |
| `tests/sector_partition_instrumentation.test.ts` | Added static contract coverage for the new construction child labels. |
| `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_BATCH17.md` | Recorded Batch 17 evidence, verification, and next target. |

## Next Target

The next sector follow-up should inspect one of the now-measured child owners before optimizing:

1. `buildFactionSectors:*:corps-sector-construction:*:multi-sector-build`, especially ARBiH 1st/2nd Corps and VRS 1st Krajina.
2. `buildFactionSectors:RBiH:corps-sector-construction:arbih_3rd_corps:staffability-filter` and ARBiH 2nd Corps staffability filtering.
3. If a read-only reuse boundary is still not obvious, continue sidecar-only attribution inside the relevant owner rather than changing sector truth.
