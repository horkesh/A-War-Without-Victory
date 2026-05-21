# Cross-Corps Component Edge Index

**Date:** 2026-05-21
**Lane:** Sector reconstruction performance
**Baseline:** `runs_perf/sector_reconstruction_osid_to_corps_prefilter_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`
**Result:** `runs_perf/sector_reconstruction_cross_corps_component_index_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`

## Summary

- Replaced `queue.shift()` in `consolidateCrossCorpsFronts(...)` component traversal with an index cursor, avoiding repeated array compaction while preserving BFS discovery order.
- Built an invocation-local `componentEdgesByCorps` map while counting component ownership.
- Reused that per-component edge list for minority-corps zero-edge and brigade-presence protection checks instead of rescanning every component edge for each corps.
- Did not change cross-corps majority selection, protected-corps rules, reassignment order, sector behavior, scenario data, combat math, operation behavior, save schema, or persisted output.

## Evidence

Deterministic artifacts are byte-identical against the OSID-to-corps prefilter baseline:

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
| `recoverDroppedFrontEdges:faction-front-claim-setup:cross-corps-consolidation` | 278.967 | 272.419 | -6.548 |
| `buildFactionSectors:RS:front-edge-consolidation` | 131.084 | 124.293 | -6.790 |
| `buildFactionSectors:RBiH:front-edge-consolidation` | 120.643 | 109.385 | -11.258 |
| `buildFactionSectors:HRHB:front-edge-consolidation` | 31.654 | 31.815 | +0.162 |
| `recoverDroppedFrontEdges:faction-front-claim-setup` | 873.043 | 887.333 | +14.291 |

The post-change clean sidecar is `data/derived/_debug/sector_partition_perf_cross_corps_component_index_clean.jsonl`. This is a narrow child-bucket reduction with run-noisy parent movement; it is not claimed as a total wall-clock win.

## Verification

| Command | Result |
|---|---|
| `npx.cmd vitest run tests/trnovo_kalinovik_sector_fix.test.ts tests/sector_partition_instrumentation.test.ts tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/sector_frontline_truth.test.ts --reporter=dot` | PASS, 69/69 |
| `npm.cmd run typecheck` | PASS |
| `$env:PERF_PROFILE_SECTOR_PARTITION='true'; npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_reconstruction_cross_corps_component_index_profile --report data/derived/_debug/sector_reconstruction_cross_corps_component_index_profile_40w.json` | PASS |
| `node tools\validate_run_consistency.cjs runs_perf\sector_reconstruction_cross_corps_component_index_profile\apr1992_definitive_40w__3649b3861a87e6ea__w40_n0` | PASS |

## Next Target

Do not chase the remaining cross-corps child without a stronger profile signal. The next measured sector targets remain the larger `sealMergedSectorTruth:ensure-coverage` children and the broader `buildFactionSectors:*` / `buildMultiSectorsForCorps:*` owners.
