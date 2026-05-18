# Sector Reconstruction Task 5 Proof

**Date:** 2026-05-18
**Plan:** `docs/plans/2026-05-18-sector-reconstruction-performance-plan.md`
**Source implementation:** `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_TASK4_ATTEMPT.md`
**Lane:** Batch 10 sector performance evidence
**Result:** Byte identity proven; full-harness performance win not claimed from one noisy run

## Summary

- Reused committed Batch 9 timed run n1885 as the post-Task-4 full-harness proof. It preserved final hash `42607f83870e01d5`.
- Compared n1885 against the Batch 6 n1881 baseline for `final_save.json`, `run_summary.json`, `weekly_report.jsonl`, and `end_report.md`; all four artifacts are byte-identical.
- Ran a fresh Batch 10 sector partition profile. It also produced final-save hash `42607f83870e01d5` and identifies the next target as `buildFactionSectors:*`, especially RS/RBiH, not another immediate pass over `recoverDroppedFrontEdges:faction-front-claim-setup`.

## Evidence Paths

| Evidence | Path |
|---|---|
| Batch 6 before timed run | `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1881/timing.json` |
| Batch 9 after timed run | `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1885/timing.json` |
| Batch 10 wall-clock report JSON | `data/derived/_debug/sector_perf_wall_clock_report_batch10.json` |
| Batch 10 wall-clock report Markdown | `data/derived/_debug/sector_perf_wall_clock_report_batch10.md` |
| Fresh Batch 10 profile JSON | `data/derived/_debug/sector_reconstruction_partition_profile_batch10_40w.json` |
| Fresh Batch 10 run output | `runs_perf/sector_reconstruction_partition_profile_batch10/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0` |
| Fresh Batch 10 sector JSONL sidecar | `data/derived/_debug/sector_partition_perf_batch10.jsonl` |
| Fresh Batch 10 hotspot report JSON | `data/derived/_debug/sector_reconstruction_hotspot_report_batch10_clean.json` |
| Fresh Batch 10 hotspot report Markdown | `data/derived/_debug/sector_reconstruction_hotspot_report_batch10_clean.md` |

## Full-Harness Timing

Batch 9 n1885 is directionally faster than Batch 6 n1881, but this is a single same-machine run comparison. Treat it as post-change evidence, not a statistically proven performance win.

| bucket/step | before ms | after ms | delta | output hash/status | evidence path |
|---|---:|---:|---:|---|---|
| total | 102962.338 | 96896.459 | -6065.879 | `42607f83870e01d5` | `runs/..._n1881/timing.json` vs `runs/..._n1885/timing.json` |
| simulation | 84483.876 | 79103.790 | -5380.086 | `42607f83870e01d5` | `runs/..._n1881/timing.json` vs `runs/..._n1885/timing.json` |
| `partition-corps-front-sectors` | 11089.454 | 9929.979 | -1159.475 | byte-identical artifacts | Batch 6 profile vs Batch 10 fresh profile |
| `reconcile-final-sector-truth` | 10972.853 | 9865.160 | -1107.693 | byte-identical artifacts | Batch 6 profile vs Batch 10 fresh profile |
| `reconcile-final-sector-truth-after-ops` | 4223.628 | 3743.191 | -480.437 | byte-identical artifacts | Batch 6 profile vs Batch 10 fresh profile |

## Artifact Identity

Compared Batch 6 n1881 to Batch 9 n1885:

| Artifact | Status | SHA-256 |
|---|---|---|
| `final_save.json` | identical | `42607f83870e01d51f023297a4ae67b3f837b03fc459575f27969a27ea5b9b60` |
| `run_summary.json` | identical | `951b97d143097709c92155d88860c5b192228ba882266246cc3f290c9afa4df3` |
| `weekly_report.jsonl` | identical | `af0cdf5a2b5f8d6fe2d352eb5c2dd269f595008d7614ec9377ac0628a7d388a8` |
| `end_report.md` | identical | `218157d8771b056ba339c9ed2d1340d6d660fe4be94300d7f24a54f5f342ff3f` |

Compared Batch 9 n1885 to the fresh Batch 10 profiled run:

| Artifact | Status |
|---|---|
| `final_save.json` | identical |
| `run_summary.json` | identical |
| `weekly_report.jsonl` | identical |
| `end_report.md` | identical |

The fresh profiled run final-save SHA-256 prefix is `42607f83870e01d5`.

## Fresh Sector Profile

Fresh Batch 10 profile:

| metric | value |
|---|---:|
| total wall | 97101.342ms |
| `partition-corps-front-sectors` | 9929.979ms / 40 calls |
| `reconcile-final-sector-truth` | 9865.160ms / 40 calls |
| `reconcile-final-sector-truth-after-ops` | 3743.191ms / 40 calls |
| fresh sector invocations | 95 |
| fresh sector JSONL total | 24904.395ms |

Top fresh sector sidecar labels:

| sector sub-function | total ms | pct sector partition | count |
|---|---:|---:|---:|
| `buildFactionSectors:RS` | 3532.382 | 14.184 | 95 |
| `buildFactionSectors:RBiH` | 3459.256 | 13.890 | 95 |
| `recoverDroppedFrontEdges:1` | 1645.555 | 6.607 | 95 |
| `recoverDroppedFrontEdges:faction-front-claim-setup` | 1309.072 | 5.256 | 285 |
| `buildFactionSectors:HRHB` | 1216.601 | 4.885 | 95 |

## Next Recommended Target

The next Task 5/6 target should be deeper attribution inside `buildFactionSectors:*`, starting with shared RS/RBiH work. The previous Task 4 target, `recoverDroppedFrontEdges:faction-front-claim-setup`, fell from the Task 3 leader to fourth in the fresh clean sidecar, while RS and RBiH faction build remain the top repeated costs.

Recommended next proof shape:

1. Add opt-in sublabels inside faction-sector construction, especially calls to `mapOsidsToCorps(...)`, front-edge partitioning, and per-corps BFS/territory assignment.
2. Keep the instrumentation under `PERF_PROFILE_SECTOR_PARTITION=true` and sidecar-only.
3. Do not optimize `buildFactionSectors:*` until the new labels identify one bounded repeated inner loop with byte-identity tests comparable to Task 4.

## Commands

| Command | Result |
|---|---|
| `npm.cmd run perf:wall-clock:report -- --timing runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1885/timing.json --json-out data/derived/_debug/sector_perf_wall_clock_report_batch10.json --markdown-out data/derived/_debug/sector_perf_wall_clock_report_batch10.md --benchmark-mode full_harness --command "npm.cmd run sim:scenario:run:40w:timed"` | Passed. |
| `$env:PERF_PROFILE_SECTOR_PARTITION='true'; npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_reconstruction_partition_profile_batch10 --report data/derived/_debug/sector_reconstruction_partition_profile_batch10_40w.json` | Passed; totalWallS=97.10. |
| `npm.cmd run perf:profile-hotspot:report ... --sector-partition-jsonl data/derived/_debug/sector_partition_perf.jsonl ...batch10...` | Passed, but combined pre-existing JSONL entries with the fresh run because the canonical sidecar appends. Superseded by the clean report. |
| `npm.cmd run perf:profile-hotspot:report ... --sector-partition-jsonl data/derived/_debug/sector_partition_perf_batch10.jsonl ...batch10_clean...` | Passed after extracting the fresh 95-entry tail. |
| first clean hotspot rerun | Failed once because PowerShell `Set-Content -Encoding UTF8` wrote a BOM; regenerated the JSONL with `.NET UTF8Encoding(false)` and reran successfully. |
| `npm.cmd run test:baselines` | Failed outside this report-only lane: `apr1992_52w` `activity_summary.json` expected `c29e296b27d04e2dc3ed6b159d1ccc40e9d9538e8c16878e0f3cda71f055e0b1`, actual `825c3c141adb757c1a068a9d9d3add092b6f2875a577ffeee392d2f0fa2c7ef9`, temp run `data/derived/scenario/_baseline_tmp/apr1992_52w`. No baseline or sim files were changed in this lane. |
| `git diff --check` | Passed with CRLF normalization warnings in other agents' dirty intel files. |

## Conclusion

Task 5's byte-identity gate is satisfied for the committed after-change run and for the fresh profiled run. The available timing and profile numbers are directionally lower than the Batch 6 baseline, but this report does not claim a full-harness performance win from one timed run. The next actionable sector performance lane is narrower attribution of `buildFactionSectors:RS` and `buildFactionSectors:RBiH`.
