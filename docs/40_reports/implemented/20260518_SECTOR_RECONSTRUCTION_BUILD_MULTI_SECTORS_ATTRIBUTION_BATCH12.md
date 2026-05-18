# Sector Reconstruction buildMultiSectorsForCorps Attribution Batch 12

**Date:** 2026-05-18
**Run ID:** `runs_perf/sector_reconstruction_attribution_batch12/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`
**Baseline:** Batch 11 identified `buildFactionSectors:RBiH:corps-sector-construction` and `buildFactionSectors:RS:corps-sector-construction` as the next attribution target.
**Result:** Added opt-in sidecar-only child labels inside `buildMultiSectorsForCorps(...)`; no optimization shipped.

## Summary
- Threaded the existing sector-partition perf timer into `buildMultiSectorsForCorps(...)` without changing default call behavior.
- Added timestamp-free labels for edge metadata lookup, subsegment discovery/merge/split/renumber, sector construction, brigade-cap enforcement, non-contiguous split, post-split merge, and final filtering.
- Fresh profile points to sector object construction first, then non-contiguous split and post-split merge, for any future narrower optimization plan.

## Changes Made
### Sector Instrumentation
- `src/sim/combat/sector_building.ts` now accepts an optional `perfTime` callback with a direct-call default.
- `src/sim/combat/corps_front_sectors.ts` passes the existing `_perfTime` helper from the active `buildCorpsFrontSectors(...)` invocation.
- Labels remain sidecar-only through the existing `PERF_PROFILE_SECTOR_PARTITION=true` gate and emit into `data/derived/_debug/sector_partition_perf.jsonl`.

### Static Contract
- `tests/sector_partition_instrumentation.test.ts` now guards the `buildMultiSectorsForCorps(...)` label set and bans timestamp/time-source patterns in that region.
- The new contract was run red first and failed on the missing label strings before production instrumentation was added.

## Labels Added
- `buildMultiSectorsForCorps:${corpsId}:edge-meta-lookup`
- `buildMultiSectorsForCorps:${corpsId}:subsegment-discovery`
- `buildMultiSectorsForCorps:${corpsId}:subsegment-merge-undersized`
- `buildMultiSectorsForCorps:${corpsId}:subsegment-edge-cap-split`
- `buildMultiSectorsForCorps:${corpsId}:subsegment-renumber`
- `buildMultiSectorsForCorps:${corpsId}:sector-object-construction`
- `buildMultiSectorsForCorps:${corpsId}:brigade-cap-enforcement`
- `buildMultiSectorsForCorps:${corpsId}:split-non-contiguous-sectors`
- `buildMultiSectorsForCorps:${corpsId}:post-split-merge`
- `buildMultiSectorsForCorps:${corpsId}:final-filter`

## Fresh Profile Results
Profile command:
`PERF_PROFILE_SECTOR_PARTITION=true npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_reconstruction_attribution_batch12 --report data/derived/_debug/sector_reconstruction_attribution_batch12_40w.json`

Hotspot report:
`data/derived/_debug/sector_reconstruction_attribution_batch12_hotspot.md`

Final save hash prefix:
`248202ee4fd13027`

Top build-multi phases aggregated across corps:

| Label suffix | Total ms | Count |
|---|---:|---:|
| `sector-object-construction` | 818.379 | 1410 |
| `split-non-contiguous-sectors` | 355.750 | 1410 |
| `post-split-merge` | 327.079 | 1410 |
| `subsegment-edge-cap-split` | 224.856 | 1410 |
| `subsegment-discovery` | 191.441 | 1410 |
| `brigade-cap-enforcement` | 135.107 | 1410 |
| `edge-meta-lookup` | 112.895 | 1410 |

Top per-corps build-multi labels:

| Label | Total ms | Count |
|---|---:|---:|
| `buildMultiSectorsForCorps:arbih_1st_corps:sector-object-construction` | 121.557 | 94 |
| `buildMultiSectorsForCorps:arbih_2nd_corps:sector-object-construction` | 93.815 | 94 |
| `buildMultiSectorsForCorps:vrs_1st_krajina:sector-object-construction` | 93.370 | 94 |
| `buildMultiSectorsForCorps:arbih_3rd_corps:sector-object-construction` | 74.508 | 94 |
| `buildMultiSectorsForCorps:vrs_herzegovina:sector-object-construction` | 72.234 | 94 |
| `buildMultiSectorsForCorps:hvo_central_bosnia:sector-object-construction` | 69.670 | 94 |
| `buildMultiSectorsForCorps:arbih_1st_corps:brigade-cap-enforcement` | 67.575 | 94 |
| `buildMultiSectorsForCorps:arbih_2nd_corps:split-non-contiguous-sectors` | 67.181 | 94 |
| `buildMultiSectorsForCorps:arbih_1st_corps:split-non-contiguous-sectors` | 65.867 | 94 |
| `buildMultiSectorsForCorps:vrs_herzegovina:subsegment-edge-cap-split` | 65.796 | 94 |

## Verification
| Command | Result |
|---|---|
| `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts --reporter=dot` before production edit | Failed as expected: missing `buildMultiSectorsForCorps` labels. |
| `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts --reporter=dot` after production edit | Passed, 11 tests. |
| `npm.cmd run typecheck` | Passed. |
| Fresh opt-in profile command above | Passed, `totalWallS=101.87`, 378 sector sidecar invocations. |
| `npm.cmd run perf:profile-hotspot:report -- --profile data/derived/_debug/sector_reconstruction_attribution_batch12_40w.json --final-state-hash 248202ee4fd13027 --sector-partition-jsonl data/derived/_debug/sector_partition_perf.jsonl --json-out data/derived/_debug/sector_reconstruction_attribution_batch12_hotspot.json --markdown-out data/derived/_debug/sector_reconstruction_attribution_batch12_hotspot.md --risk-note partition-corps-front-sectors="Sector reconstruction is deterministic behavior, not diagnostic-only overhead."` | Passed. |
| Parent integration 40w | Passed as n1888 hash `248202ee4fd13027`, 27/27 anchors, 6/6 bot benchmarks. |

## Determinism Notes
- Instrumentation remains behind the existing module-load `PERF_PROFILE_SECTOR_PARTITION=true` flag.
- No timestamps, `Date.now`, `new Date`, `performance.now`, randomness, or locale sorting were added.
- The new labels write only to ignored sidecar/debug outputs and do not enter deterministic saves.
- The n1888 hash move is owned by the concurrent public AAR/read-model annotation lane, not by sidecar attribution.

## Next Steps
1. Treat `buildMultiSectorsForCorps:*:sector-object-construction` as the next measured target.
2. Start with `arbih_1st_corps`, `arbih_2nd_corps`, and `vrs_1st_krajina`, then inspect whether repeated `buildSectorFromSubSegments(...)` formation scans can be attributed more narrowly.
3. Do not claim speed wins from this batch; it only adds attribution.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/sector_building.ts` | Added optional perf timer and build-multi child labels. |
| `src/sim/combat/corps_front_sectors.ts` | Passed existing `_perfTime` into `buildMultiSectorsForCorps(...)`. |
| `tests/sector_partition_instrumentation.test.ts` | Added static contract for build-multi child labels. |
| `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_BUILD_MULTI_SECTORS_ATTRIBUTION_BATCH12.md` | This implementation report. |
