# Sector Multi-Source Reachability

**Date:** 2026-05-21
**Lane:** Sector reconstruction performance
**Baseline:** `runs_perf/sector_reconstruction_label_split_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`
**Result:** `runs_perf/sector_reconstruction_multisource_reachability_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`

## Summary

- Reworked `canAnyBrigadeReachAny(...)` from one BFS per brigade location to one multi-source BFS per predicate call.
- Preserved the same rule: a sector front is reachable if any active brigade location can reach any target OSID within `TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS` through friendly territory.
- Did not add module-level, cross-turn, or persisted caches.

## Implementation

`src/sim/combat/sector_utils.ts` now initializes the BFS frontier with all valid brigade start OSIDs, then expands by hop layer once. This keeps the old start-location and target checks, but avoids repeatedly revisiting the same friendly territory for each brigade in the same corps/faction reachability query.

A broader whole-frontier precompute was tested first and rejected: it was byte-identical but slower because it explored too much territory for RS and paid large upfront costs. The committed path keeps the existing early-exit behavior.

## Evidence

Deterministic artifacts are byte-identical against the label-split baseline:

| Artifact | Status | SHA-256 prefix |
|---|---|---:|
| `final_save.json` | identical | `4368f50c00c464ad` |
| `run_summary.json` | identical | `2afd76aa7e85df8a` |
| `weekly_report.jsonl` | identical | `b0d3e2c76e173a25` |
| `end_report.md` | identical | `bd6816aaa4053632` |

The clean 94-invocation sidecar batch in `data/derived/_debug/sector_partition_perf_multisource_reachability_clean.jsonl` shows the main staffability buckets dropping:

| Label | Before ms | After ms |
|---|---:|---:|
| `buildFactionSectors:RBiH:corps-sector-construction:arbih_2nd_corps:staffability-filter` | 194.482 | 13.558 |
| `buildFactionSectors:RBiH:corps-sector-construction:arbih_3rd_corps:staffability-filter` | 185.285 | 14.109 |
| `buildFactionSectors:HRHB:corps-sector-construction:hvo_central_bosnia:staffability-filter` | 86.585 | 14.473 |
| `buildFactionSectors:RBiH:corps-sector-construction:arbih_1st_corps:staffability-filter` | 81.262 | 9.151 |
| `buildFactionSectors:RBiH:corps-sector-construction:arbih_5th_corps:staffability-filter` | 61.522 | 7.935 |
| `buildFactionSectors:RS:corps-sector-construction:vrs_1st_krajina:staffability-filter` | 28.312 | 6.243 |

The profiled run completed with `totalWallS=102.23`; broad wall-clock remains noisy, so this report treats the change as a targeted bucket reduction rather than a new whole-run floor.

## Verification

| Command | Result |
|---|---|
| `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts --reporter=dot` | PASS, 17/17 |
| `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/sector_frontline_truth.test.ts --reporter=dot` | PASS, 53/53 |
| `npm.cmd run typecheck` | PASS |
| `$env:PERF_PROFILE_SECTOR_PARTITION='true'; npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_reconstruction_multisource_reachability_profile --report data/derived/_debug/sector_reconstruction_multisource_reachability_profile_40w.json` | PASS |
| `node tools\validate_run_consistency.cjs runs_perf\sector_reconstruction_multisource_reachability_profile\apr1992_definitive_40w__3649b3861a87e6ea__w40_n0` | PASS |

## Next Target

With staffability filtering reduced, the next sector-performance lane should return to the larger remaining buckets: `sealMergedSectorTruth:ensure-coverage`, `recoverDroppedFrontEdges:faction-front-claim-setup`, and the split/merge children under `buildMultiSectorsForCorps:*`.
