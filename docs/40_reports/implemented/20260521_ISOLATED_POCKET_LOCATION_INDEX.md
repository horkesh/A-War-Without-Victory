# Isolated Pocket Location Index

**Date:** 2026-05-21
**Lane:** Sector reconstruction performance
**Baseline:** `runs_perf/sector_reconstruction_recovery_setup_attribution_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`
**Result:** `runs_perf/sector_reconstruction_isolated_pocket_location_index_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`

## Summary

- Replaced the repeated full-formation scan inside `consolidateIsolatedCorpsPockets(...)` home-brigade protection checks with one invocation-local corps-location index.
- Preserved the existing pocket rule: a non-largest edge component is protected when a same-faction formation assigned to the same corps is located on the pocket's friendly OSID.
- Did not change sector ownership rules, scenario data, combat math, operation behavior, save schema, or persisted output.

## Evidence

Deterministic artifacts are byte-identical against the recovery setup attribution baseline:

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
| `recoverDroppedFrontEdges:faction-front-claim-setup` | 1288.512 | 882.674 | -405.838 |
| `recoverDroppedFrontEdges:faction-front-claim-setup:isolated-pocket-consolidation` | 582.834 | 197.511 | -385.322 |
| `buildFactionSectors:RS:isolated-pocket-consolidation` | 258.333 | 105.114 | -153.218 |
| `buildFactionSectors:RBiH:isolated-pocket-consolidation` | 274.059 | 101.004 | -173.055 |
| `buildFactionSectors:HRHB:isolated-pocket-consolidation` | 52.795 | 24.928 | -27.867 |

The post-change clean sidecar is `data/derived/_debug/sector_partition_perf_isolated_pocket_location_index_clean.jsonl`.

## Verification

| Command | Result |
|---|---|
| `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts --reporter=dot` | PASS, 17/17 |
| `npm.cmd run typecheck` | PASS |
| `$env:PERF_PROFILE_SECTOR_PARTITION='true'; npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_reconstruction_isolated_pocket_location_index_profile --report data/derived/_debug/sector_reconstruction_isolated_pocket_location_index_profile_40w.json` | PASS |
| `node tools\validate_run_consistency.cjs runs_perf\sector_reconstruction_isolated_pocket_location_index_profile\apr1992_definitive_40w__3649b3861a87e6ea__w40_n0` | PASS |

## Next Target

Do not keep chasing the already-reduced isolated-pocket home-brigade check. The next measured sector targets are now `sealMergedSectorTruth:ensure-coverage`, the remaining `recoverDroppedFrontEdges:faction-front-claim-setup` children (`osid-to-corps` and cross-corps consolidation), and larger `buildFactionSectors:*` / `buildMultiSectorsForCorps:*` owners.
