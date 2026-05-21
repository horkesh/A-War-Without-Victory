# OSID-To-Corps Prefilter

**Date:** 2026-05-21
**Lane:** Sector reconstruction performance
**Baseline:** `runs_perf/sector_reconstruction_isolated_pocket_location_index_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`
**Result:** `runs_perf/sector_reconstruction_osid_to_corps_prefilter_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`

## Summary

- Reused one sorted active same-faction combat-formation list inside `mapOsidsToCorps(...)` instead of re-filtering and re-resolving corps membership across each brigade pass.
- Replaced repeated `corpsIds.includes(...)` checks with one invocation-local `Set`.
- Replaced the fallback "has locked seed" scan with an invocation-local `Set`.
- Did not change corps boundary rules, municipality exclusion rules, BFS order, scenario data, combat math, operation behavior, save schema, or persisted output.

## Evidence

Deterministic artifacts are byte-identical against the isolated-pocket location-index baseline:

| Artifact | Status | SHA-256 prefix |
|---|---|---:|
| `final_save.json` | identical | `4368f50c00c464ad` |
| `run_summary.json` | identical | `2afd76aa7e85df8a` |
| `weekly_report.jsonl` | identical | `b0d3e2c76e173a25` |
| `end_report.md` | identical | `bd6816aaa4053632` |
| `watched_operations.json` | identical | `ed73cf32a34f7618` |

Clean 94-invocation sidecar comparison:

| Label | Before ms | After ms | Delta ms |
|---|---:|---:|---:|
| `recoverDroppedFrontEdges:faction-front-claim-setup:osid-to-corps` | 333.054 | 307.073 | -25.982 |
| `buildFactionSectors:RS:osid-to-corps` | 146.848 | 140.660 | -6.189 |
| `buildFactionSectors:RBiH:osid-to-corps` | 131.772 | 123.287 | -8.485 |
| `buildFactionSectors:HRHB:osid-to-corps` | 62.519 | 53.777 | -8.742 |
| `recoverDroppedFrontEdges:faction-front-claim-setup` | 882.674 | 873.043 | -9.632 |

The post-change clean sidecar is `data/derived/_debug/sector_partition_perf_osid_to_corps_prefilter_clean.jsonl`. Parent-level recovery setup movement is intentionally reported as small/noisy; the useful signal is the direct `osid-to-corps` child reduction.

## Verification

| Command | Result |
|---|---|
| `npx.cmd vitest run tests/trnovo_kalinovik_sector_fix.test.ts tests/sector_partition_instrumentation.test.ts tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/sector_frontline_truth.test.ts --reporter=dot` | PASS, 69/69 |
| `npm.cmd run typecheck` | PASS |
| `$env:PERF_PROFILE_SECTOR_PARTITION='true'; npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_reconstruction_osid_to_corps_prefilter_profile --report data/derived/_debug/sector_reconstruction_osid_to_corps_prefilter_profile_40w.json` | PASS |
| `node tools\validate_run_consistency.cjs runs_perf\sector_reconstruction_osid_to_corps_prefilter_profile\apr1992_definitive_40w__3649b3861a87e6ea__w40_n0` | PASS |

## Rejected Adjacent Experiment

A per-sector front/reserve/territory set cache inside `ensureMinimumSectorCoverage(...)` was tested first. It was byte-identical but slower: `sealMergedSectorTruth:ensure-coverage` regressed 2064.183ms -> 2112.303ms in the clean 94-invocation comparison. That experiment was fully reverted before this report.

## Next Target

Do not chase the small residual `osid-to-corps` cost without new evidence. The next measured sector targets remain `sealMergedSectorTruth:ensure-coverage`, `recoverDroppedFrontEdges:faction-front-claim-setup:cross-corps-consolidation`, and larger `buildFactionSectors:*` / `buildMultiSectorsForCorps:*` owners.
