# Recovery Setup Attribution

**Date:** 2026-05-21
**Lane:** Sector reconstruction performance instrumentation
**Baseline:** `runs_perf/sector_reconstruction_multisource_reachability_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`
**Result:** `runs_perf/sector_reconstruction_recovery_setup_attribution_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`

## Summary

- Added sidecar-only child labels inside `recoverDroppedFrontEdges:faction-front-claim-setup`.
- Preserved the existing build-scoped `RecoveredFrontClaimSetup` cache and did not change recovery behavior.
- The new evidence identifies isolated-pocket consolidation, OSID-to-corps mapping, and cross-corps consolidation as the next concrete recovery setup owners.

## Labels Added

| Parent | Child label |
|---|---|
| `recoverDroppedFrontEdges:faction-front-claim-setup` | `:osid-to-corps` |
| `recoverDroppedFrontEdges:faction-front-claim-setup` | `:front-edge-partition` |
| `recoverDroppedFrontEdges:faction-front-claim-setup` | `:cross-corps-consolidation` |
| `recoverDroppedFrontEdges:faction-front-claim-setup` | `:isolated-pocket-consolidation` |
| `recoverDroppedFrontEdges:faction-front-claim-setup` | `:friendly-component-setup` |
| `recoverDroppedFrontEdges:faction-front-claim-setup` | `:faction-brigade-component-index` |

## Evidence

Deterministic artifacts are byte-identical against the multi-source reachability baseline:

| Artifact | Status | SHA-256 prefix |
|---|---|---:|
| `final_save.json` | identical | `4368f50c00c464ad` |
| `run_summary.json` | identical | `2afd76aa7e85df8a` |
| `weekly_report.jsonl` | identical | `b0d3e2c76e173a25` |
| `end_report.md` | identical | `bd6816aaa4053632` |

Clean 94-invocation child totals from `data/derived/_debug/sector_partition_perf_recovery_setup_attribution_clean.jsonl`:

| Label | ms | Calls |
|---|---:|---:|
| `recoverDroppedFrontEdges:faction-front-claim-setup` | 1288.512 | 282 |
| `recoverDroppedFrontEdges:faction-front-claim-setup:isolated-pocket-consolidation` | 582.834 | 282 |
| `recoverDroppedFrontEdges:faction-front-claim-setup:osid-to-corps` | 317.618 | 282 |
| `recoverDroppedFrontEdges:faction-front-claim-setup:cross-corps-consolidation` | 294.750 | 282 |
| `recoverDroppedFrontEdges:faction-front-claim-setup:faction-brigade-component-index` | 38.770 | 282 |
| `recoverDroppedFrontEdges:faction-front-claim-setup:front-edge-partition` | 28.589 | 282 |
| `recoverDroppedFrontEdges:faction-front-claim-setup:friendly-component-setup` | 23.674 | 282 |

## Verification

| Command | Result |
|---|---|
| `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts --reporter=dot` | PASS, 17/17 |
| `npm.cmd run typecheck` | PASS |
| `$env:PERF_PROFILE_SECTOR_PARTITION='true'; npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_reconstruction_recovery_setup_attribution_profile --report data/derived/_debug/sector_reconstruction_recovery_setup_attribution_profile_40w.json` | PASS |
| `node tools\validate_run_consistency.cjs runs_perf\sector_reconstruction_recovery_setup_attribution_profile\apr1992_definitive_40w__3649b3861a87e6ea__w40_n0` | PASS |

## Next Target

Do not optimize `front-edge-partition`, `friendly-component-setup`, or the faction brigade index first. The next measured recovery setup lane should inspect `consolidateIsolatedCorpsPockets(...)`; if that cannot be simplified safely, inspect `mapOsidsToCorps(...)` reuse and `consolidateCrossCorpsFronts(...)` next.
