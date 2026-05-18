# Sector Reconstruction buildFactionSectors Attribution Batch 11

**Date:** 2026-05-18
**Run ID:** `runs_perf/sector_reconstruction_attribution_batch11/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`
**Baseline:** Batch 10 Task 5 proved `buildFactionSectors:*` as the next attribution target.
**Result:** Added opt-in sidecar-only child labels under `buildFactionSectors:*`; no optimization shipped.

## Summary
- Added timestamp-free `PERF_PROFILE_SECTOR_PARTITION=true` attribution inside faction sector construction.
- The new labels split OSID-to-corps mapping, front-edge partition/consolidation, sector construction, territory Voronoi, brigade classification, commander review, normalization, and final coverage.
- Fresh profile points to `buildFactionSectors:RBiH:corps-sector-construction` and `buildFactionSectors:RS:corps-sector-construction` as the next bounded optimization probe.

## Changes Made
### Sector Instrumentation
- Extended the existing sector-partition sidecar instrumentation in `src/sim/combat/corps_front_sectors.ts`.
- Kept all timing behind the existing module-load `PERF_PROFILE_SECTOR_PARTITION=true` gate.
- Added per-corps construction labels such as `buildFactionSectors:RBiH:corps-sector-construction:arbih_1st_corps`.

### Tests
- Added a static contract in `tests/sector_partition_instrumentation.test.ts` for deterministic `buildFactionSectors:${faction}:*` child labels.
- The contract also guards against timestamp, `Date.now`, `new Date`, and `performance.now` in the instrumented build-faction region.

## Fresh Profile Results
Profile command:
`PERF_PROFILE_SECTOR_PARTITION=true npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_reconstruction_attribution_batch11 --report data/derived/_debug/sector_reconstruction_attribution_batch11_40w.json`

Hotspot report:
`data/derived/_debug/sector_reconstruction_attribution_batch11_hotspot.md`

Final save hash prefix:
`38fcfed23b5b5c11`

Top sector sub-functions:

| Label | Total ms | Count |
|---|---:|---:|
| `buildFactionSectors:RS` | 3502.683 | 94 |
| `buildFactionSectors:RBiH` | 3430.284 | 94 |
| `recoverDroppedFrontEdges:1` | 1616.936 | 94 |
| `buildFactionSectors:RBiH:corps-sector-construction` | 1542.006 | 94 |
| `recoverDroppedFrontEdges:faction-front-claim-setup` | 1298.899 | 282 |
| `buildFactionSectors:HRHB` | 1225.840 | 94 |
| `buildFactionSectors:RS:corps-sector-construction` | 1203.719 | 94 |
| `buildFactionSectors:RS:brigade-classification` | 788.500 | 94 |

Top per-corps construction labels:

| Label | Total ms | Count |
|---|---:|---:|
| `buildFactionSectors:RBiH:corps-sector-construction:arbih_1st_corps` | 404.338 | 94 |
| `buildFactionSectors:RBiH:corps-sector-construction:arbih_2nd_corps` | 271.686 | 94 |
| `buildFactionSectors:RS:corps-sector-construction:vrs_1st_krajina` | 246.071 | 94 |
| `buildFactionSectors:RS:corps-sector-construction:vrs_herzegovina` | 213.430 | 94 |
| `buildFactionSectors:RS:corps-sector-construction:vrs_drina` | 211.385 | 94 |

## Verification
| Command | Result |
|---|---|
| `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts --reporter=dot` | Passed, 10 tests. |
| `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts tests/profile_hotspot_report.test.ts --reporter=dot` | Passed, 12 tests. |
| `npm.cmd run typecheck` | Passed. |
| Fresh opt-in profile command above | Passed, `totalWallS=98.54`, 94 sector sidecar invocations. |
| `npm.cmd run perf:profile-hotspot:report -- --profile data/derived/_debug/sector_reconstruction_attribution_batch11_40w.json --final-state-hash 38fcfed23b5b5c11 --sector-partition-jsonl data/derived/_debug/sector_partition_perf_batch11.jsonl --json-out data/derived/_debug/sector_reconstruction_attribution_batch11_hotspot.json --markdown-out data/derived/_debug/sector_reconstruction_attribution_batch11_hotspot.md --risk-note partition-corps-front-sectors="Sector reconstruction is deterministic behavior, not diagnostic-only overhead."` | Passed. |
| Parent integration 40w | Passed as n1887 hash `38fcfed23b5b5c11`, 27/27 anchors, 6/6 bot benchmarks. |

## Determinism Notes
- Instrumentation writes only to `data/derived/_debug/sector_partition_perf.jsonl` and derived hotspot sidecars when explicitly enabled.
- No game state, scenario data, save schema, or report artifact consumed by game logic changed.
- Output remains timestamp-free; elapsed reads use the existing `process.hrtime.bigint()` sidecar path.
- The n1887 hash move is owned by the concurrent intel execution-friction lane, not by sidecar attribution.

## Next Steps
1. Target `buildFactionSectors:RBiH:corps-sector-construction` first, with a narrower proof inside `buildMultiSectorsForCorps(...)`.
2. Start with `arbih_1st_corps` and `arbih_2nd_corps`, then compare against `vrs_1st_krajina`, `vrs_herzegovina`, and `vrs_drina`.
3. Do not optimize until the next child labels isolate one bounded repeated loop, likely inside sub-segment discovery/splitting or per-corps sector construction rather than OSID-to-corps mapping.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/corps_front_sectors.ts` | Added build-faction child attribution labels in the existing sector instrumentation helper. |
| `tests/sector_partition_instrumentation.test.ts` | Added static deterministic-label contract for `buildFactionSectors:*`. |
| `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_BUILD_FACTION_SECTORS_ATTRIBUTION_BATCH11.md` | This implementation report. |
