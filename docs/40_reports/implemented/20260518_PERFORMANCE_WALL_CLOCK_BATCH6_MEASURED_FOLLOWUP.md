# Batch 6 Performance Wall Clock Measured Follow-Up

**Date:** 2026-05-18
**Lane:** performance diagnostics and measured optimization follow-up
**Result:** Truth report only. No runtime optimization shipped.

## Summary

- Re-ran the current 40w timed benchmark and confirmed the current hash-stable baseline remains `42607f83870e01d5`.
- Profiled the dominant `simulation` bucket with the existing per-step profiler.
- Added `tools/perf/profile_hotspot_report.ts` and `npm run perf:profile-hotspot:report` to summarize profile JSON plus optional sector-partition JSONL into deterministic JSON/Markdown evidence.
- Did not ship a sector reconstruction optimization. The fresh profile points at deterministic sector behavior (`partition-corps-front-sectors`, `reconcile-final-sector-truth`) rather than diagnostic/report overhead, and no bounded non-behavioral optimization was isolated.

## Measurement Evidence

Baseline timed 40w:

| bucket | before ms | after ms | output hash/status | evidence path |
|---|---:|---:|---|---|
| simulation | 84483.876 | n/a | 42607f83870e01d5 | `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1881/timing.json` |
| serialization_artifacts | 10581.278 | n/a | 42607f83870e01d5 | `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1881/timing.json` |
| setup | 2907.923 | n/a | 42607f83870e01d5 | `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1881/timing.json` |
| diagnostics_reporting | 152.823 | n/a | 42607f83870e01d5 | `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1881/timing.json` |

Observed total: 102962.338ms over 40 turns, or 2574.058ms/turn against the 100ms/turn target. The measured full-harness gap is 25.741x over target. The dominant bucket is `simulation` at 82.053% of measured total.

Quiet routine-diagnostics probe:

| mode | total ms | simulation ms | serialization ms | hash |
|---|---:|---:|---:|---|
| default timed CLI | 102962.338 | 84483.876 | 10581.278 | 42607f83870e01d5 |
| `consoleDiagnostics:false` API run | 109265.432 | 83865.698 | 17725.880 | 42607f83870e01d5 |

Suppressing routine console diagnostics did not produce a reliable wall-clock win. Simulation moved only 618.178ms across 40 turns while serialization became noisier.

Dominant-bucket profile:

| step | total ms | pct total | ms/call | count | risk note |
|---|---:|---:|---:|---:|---|
| partition-corps-front-sectors | 11089.454 | 10.266 | 277.236 | 40 | Sector reconstruction/assignment is deterministic simulation behavior; no bounded non-behavioral optimization isolated. |
| reconcile-final-sector-truth | 10972.853 | 10.158 | 274.321 | 40 | Final sector truth reconciliation mutates derived sector assignments and ratings; cache/pass changes need a separate sector-owned plan. |
| update-displacement | 5520.183 | 5.110 | 138.005 | 40 |  |
| update-sustainability | 5247.288 | 4.858 | 131.182 | 40 |  |
| generate-bot-corps-orders | 4388.094 | 4.062 | 109.702 | 40 |  |
| reconcile-final-sector-truth-after-ops | 4223.628 | 3.910 | 105.591 | 40 |  |

Evidence paths:

- `data/derived/_debug/batch6_profile_40w_n1881.json`
- `data/derived/_debug/batch6_profile_40w_sector_partition.json`
- `data/derived/_debug/sector_partition_perf.jsonl`
- `data/derived/_debug/batch6_profile_hotspot_report.json`
- `data/derived/_debug/batch6_profile_hotspot_report.md`

Sector-partition subprofile:

| sector sub-function | total ms | pct sector partition | count |
|---|---:|---:|---:|
| buildFactionSectors:RS | 3842.799 | 13.787 | 95 |
| buildFactionSectors:RBiH | 3655.124 | 13.113 | 95 |
| recoverDroppedFrontEdges:1 | 1735.119 | 6.225 | 95 |
| recoverDroppedFrontEdges:2 | 1351.722 | 4.850 | 95 |
| buildFactionSectors:HRHB | 1287.266 | 4.618 | 95 |

## Determinism

No game state, scenario data, save schema, combat math, ordering rule, or deterministic scenario artifact contract changed. New profile reporting consumes sidecar profile artifacts only and writes optional JSON/Markdown reports outside saves and scenario truth artifacts.

Determinism docs checked for this lane:

- `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`
- `docs/20_engineering/CODE_CANON.md`
- `docs/10_canon/Engine_Invariants_v0_9_0.md`

## Files Changed

| File | Change |
|---|---|
| `tools/perf/profile_hotspot_report.ts` | New deterministic profile summary builder/formatter/CLI. |
| `tests/profile_hotspot_report.test.ts` | Focused tests for hotspot report shape, sector JSONL summary math, risk decision, and timestamp-shaped output absence. |
| `package.json` | Added `perf:profile-hotspot:report`. |
| `docs/20_engineering/DETERMINISM_TEST_MATRIX.md` | Recorded the profile-hotspot report as sidecar-only performance diagnostics coverage. |
| `docs/plans/MASTER_ROADMAP.md` | Closed measured wall-clock Batch 6 as truth-report-only and left sector optimization as a future scoped lane. |
| `docs/PROJECT_LEDGER.md` | Added this measured follow-up entry. |
| `docs/40_reports/implemented/20260518_PERFORMANCE_WALL_CLOCK_BATCH6_MEASURED_FOLLOWUP.md` | This report. |

## Verification

- Red first: `npx.cmd vitest run tests\profile_hotspot_report.test.ts --reporter=dot` failed because `tools/perf/profile_hotspot_report.ts` did not exist.
- Focused green: `npx.cmd vitest run tests\profile_hotspot_report.test.ts tests\wall_clock_target_report.test.ts tests\scenario_timing_instrumentation.test.ts tests\sector_partition_instrumentation.test.ts --reporter=dot` passed 12/12.
- Fresh 40w timed baseline: `npm.cmd run sim:scenario:run:40w:timed` produced n1881 hash `42607f83870e01d5`.
- Dominant-bucket profile: `npx.cmd tsx tools\perf\profile_scenario.ts --scenario data\scenarios\apr1992_definitive_40w.json --out runs_perf\batch6_profile --report data\derived\_debug\batch6_profile_40w_n1881.json` completed.
- Sector partition subprofile: `PERF_PROFILE_SECTOR_PARTITION=true npx.cmd tsx tools\perf\profile_scenario.ts --scenario data\scenarios\apr1992_definitive_40w.json --out runs_perf\batch6_sector_partition_profile --report data\derived\_debug\batch6_profile_40w_sector_partition.json` completed.

## Follow-Up

Any optimization follow-up should be a sector-owned performance plan around `buildFactionSectors:*`, `recoverDroppedFrontEdges:*`, and repeated final-sector truth passes, with byte-identical 40w proof and focused sector tests. This batch intentionally does not alter those behavior files.
