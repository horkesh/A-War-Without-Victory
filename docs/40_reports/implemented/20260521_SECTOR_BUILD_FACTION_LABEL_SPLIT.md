# Sector Build-Faction Label Split

**Date:** 2026-05-21
**Lane:** Sector reconstruction performance instrumentation
**Baseline:** Current pre-edit 40w profile `runs_perf/sector_reconstruction_current_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`
**Result:** Label-split 40w profile `runs_perf/sector_reconstruction_label_split_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`

## Summary

- Split ambiguous `buildFactionSectors:*` sidecar labels without changing sector behavior or deterministic scenario artifacts.
- `territory-voronoi` now distinguishes assignment from disconnected-territory repair.
- The two formerly duplicated `post-classification-normalization` blocks now have unique labels, with the truth-normalization block split into dedup, ownership enforcement, rehome, rear reclassification, and power recomputation.

## Changes Made

### Sidecar Label Refinement

`src/sim/combat/corps_front_sectors.ts` now records these additional opt-in labels under `PERF_PROFILE_SECTOR_PARTITION=true`:

| Parent | New child labels |
|---|---|
| `buildFactionSectors:${faction}:territory-voronoi` | `:assign`, `:repair-disconnected` |
| `buildFactionSectors:${faction}:post-classification-rear-normalization` | replaces the first broad duplicate post-classification label |
| `buildFactionSectors:${faction}:post-classification-truth-normalization` | `:dedup-initial`, `:enforce-ownership`, `:rehome-unassigned`, `:reclassify-rear`, `:recompute-power` |

`tests/sector_partition_instrumentation.test.ts` pins the new deterministic label set and continues to reject timestamp/random/locale-sort patterns in the instrumented region.

## Evidence

Pre-edit and post-edit profiled runs are byte-identical in deterministic artifacts:

| Artifact | Status | SHA-256 prefix |
|---|---|---|
| `final_save.json` | identical | `4368f50c00c464ad` |
| `run_summary.json` | identical | `2afd76aa7e85df8a` |
| `weekly_report.jsonl` | identical | `b0d3e2c76e173a25` |
| `end_report.md` | identical | `bd6816aaa4053632` |

The label-split profile completed with current final state hash `4368f50c00c464ad`; `node tools\validate_run_consistency.cjs runs_perf\sector_reconstruction_label_split_profile\apr1992_definitive_40w__3649b3861a87e6ea__w40_n0` passed.

Top newly clarified child costs from `data/derived/_debug/sector_partition_perf_label_split_clean.jsonl`:

| Label | ms |
|---|---:|
| `buildFactionSectors:RS:post-classification-truth-normalization:recompute-power` | 104.846 |
| `buildFactionSectors:RBiH:post-classification-truth-normalization:recompute-power` | 87.539 |
| `buildFactionSectors:RS:territory-voronoi:assign` | 65.001 |
| `buildFactionSectors:RBiH:territory-voronoi:assign` | 62.165 |
| `buildFactionSectors:RS:territory-voronoi:repair-disconnected` | 41.592 |
| `buildFactionSectors:RBiH:territory-voronoi:repair-disconnected` | 36.869 |

The broader current leaders remain `buildFactionSectors:RBiH:corps-sector-construction` and `buildFactionSectors:RS:corps-sector-construction`, with `brigade-classification:territory-assignment` still the leading classified child outside construction.

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/corps_front_sectors.ts` | Added nested sidecar-only labels for territory Voronoi and post-classification normalization phases. |
| `tests/sector_partition_instrumentation.test.ts` | Updated static instrumentation contract for the new deterministic label set. |

## Verification

| Command | Result |
|---|---|
| `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts --reporter=dot` | PASS, 17/17 |
| `npm.cmd run typecheck` | PASS |
| `$env:PERF_PROFILE_SECTOR_PARTITION='true'; npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_reconstruction_label_split_profile --report data/derived/_debug/sector_reconstruction_label_split_profile_40w.json` | PASS |
| `node tools\validate_run_consistency.cjs runs_perf\sector_reconstruction_label_split_profile\apr1992_definitive_40w__3649b3861a87e6ea__w40_n0` | PASS |

## Next Target

The next implementation lane should not optimize from the old `post-classification-normalization` aggregate. Use the new labels:

1. Continue inside `corps-sector-construction`, especially RBiH 1st/2nd Corps and VRS Herzegovina/1st Krajina multi-sector build.
2. If optimizing outside construction, inspect `brigade-classification:territory-assignment` before `recompute-power`; it remains larger.
3. Treat `territory-voronoi:assign` and `:repair-disconnected` as lower-priority follow-ups unless a fresh profile moves them upward.
