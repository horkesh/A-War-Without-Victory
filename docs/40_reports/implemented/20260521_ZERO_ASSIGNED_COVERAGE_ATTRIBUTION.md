# Zero-Assigned Coverage Attribution

**Date:** 2026-05-21
**Lane:** Sector reconstruction performance attribution
**Baseline:** `runs_perf/sector_reconstruction_cross_corps_component_index_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`
**Result:** `runs_perf/sector_reconstruction_zero_assigned_subsplit_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`

## Summary

- Split `ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned` into four deterministic child labels:
  - `:promote-reserve`
  - `:pull-rear`
  - `:pull-reserve`
  - `:transfer-surplus`
- Preserved the existing early-exit behavior by returning booleans from the timed child callbacks and continuing the outer sector loop at the same points as before.
- Did not change assignment rules, transfer eligibility, sector behavior, scenario data, combat math, operation behavior, save schema, or persisted output.

## Evidence

Deterministic artifacts are byte-identical against the cross-corps component-index baseline:

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
| `sealMergedSectorTruth:ensure-coverage` | 2089.642 | 2055.491 | -34.151 |
| `ensureMinimumSectorCoverage:territory-claim-rescue` | 874.457 | 868.327 | -6.130 |
| `ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned` | 836.103 | 831.096 | -5.007 |
| `ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned:promote-reserve` | 0.000 | 245.887 | +245.887 |
| `ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned:pull-rear` | 0.000 | 275.737 | +275.737 |
| `ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned:pull-reserve` | 0.000 | 264.345 | +264.345 |
| `ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned:transfer-surplus` | 0.000 | 19.009 | +19.009 |

The post-change clean sidecar is `data/derived/_debug/sector_partition_perf_zero_assigned_subsplit_clean.jsonl`. The useful signal is attribution: `pull-rear`, `pull-reserve`, and `promote-reserve` are co-dominant; `transfer-surplus` is not the next optimization target.

## Verification

| Command | Result |
|---|---|
| `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts tests/sector_coverage_truth_preservation.test.ts tests/sector_severe_undercoverage_rebalance.test.ts --reporter=dot` | PASS, 32/32 |
| `npm.cmd run typecheck` | PASS |
| `$env:PERF_PROFILE_SECTOR_PARTITION='true'; npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_reconstruction_zero_assigned_subsplit_profile --report data/derived/_debug/sector_reconstruction_zero_assigned_subsplit_profile_40w.json` | PASS |
| `node tools\validate_run_consistency.cjs runs_perf\sector_reconstruction_zero_assigned_subsplit_profile\apr1992_definitive_40w__3649b3861a87e6ea__w40_n0` | PASS |

## Next Target

Do not optimize `transfer-surplus` from this split. Candidate next work is a conservative byte-identical reduction in one of the three co-dominant zero-assigned children, or a separate measured split of `severe-rescue:floor-completion` that respects the prior rejected pass-wide active-count hoist.
