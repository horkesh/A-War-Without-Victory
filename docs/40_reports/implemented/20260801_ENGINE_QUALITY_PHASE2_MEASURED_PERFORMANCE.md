# Engine Quality Phase 2 — measured performance checkpoint

**Date:** 2026-08-01
**Roadmap:** R5, Phase 2
**Scenario:** `data/scenarios/apr1992_definitive_40w.json`
**Reference machine:** AMD Ryzen 7 5700X, 8 physical / 16 logical cores, Windows x64, Node v24.13.0
**Target:** mean below 100 ms per simulated turn
**Status:** Operational-graph reuse and runtime-hardened immutable-adjacency reuse accepted by replicated measurement; target not yet met.

## Determinism boundary

Phase 1 changed the persisted schema to v37, so the Phase 0 v36 final-save file is not a byte-comparison peer. All Phase 2 comparisons use the same v37 state shape.

Every Phase 2 warmup, measured, sector-profiled, V8-profiled, and hardened-adjacency final save inspected to date has:

- final state hash `52ee1829aab62e5e`;
- exact size `5,071,275` bytes;
- exact SHA-256 `52ee1829aab62e5ede80ca461b0ec6cc1d5ecc8ac2e0700a36ea7229d6050bde`.

The final hardened-adjacency packet contained one excluded warmup, one corrected application-level V8 run, and three timed runs. All five final saves were compared directly and were byte-identical to the replicated post-graph-reuse baseline. No baseline was refreshed for either performance-only candidate.

## Wall-clock checkpoints

| Checkpoint | Runs | Mean ms/turn | P50 | P95 | Sampled peak heap | Interpretation |
|---|---:|---:|---:|---:|---:|---|
| Phase 0 owner baseline | 3 measured | 1,562.923 | 1,563.681 | 1,567.255 | 340.317 MB | Frozen pre-optimization owner baseline. |
| Operational-graph reuse | 3 measured | 1,292.665 | 1,289.839 | 1,302.636 | 214.034 MB | Mean improved 17.3%; heap improved 37.1%. |
| Runtime-hardened immutable adjacency reuse | 3 measured | 1,201.897 | 1,206.850 | 1,210.672 | 193.845 MB | Mean improved a further 7.0%; heap improved a further 9.4%. |

The three replicated operational-graph samples were `1,285.520`, `1,289.839`, and `1,302.636` ms/turn.

The three post-hardening adjacency samples were `1,188.168`, `1,206.850`, and `1,210.672` ms/turn. The aggregate recorded:

- mean total bucket: `48,075.874` ms, or `1,201.897` ms/turn;
- mean simulation bucket: `46,293.012` ms, or `1,157.325` ms/turn;
- P50/P95: `1,206.850` / `1,210.672` ms/turn;
- final state hash, file size, and SHA-256 exactly matching in the excluded warmup, V8, and all three measured modes.

The hardened application-level V8 run recorded `51.0405172` seconds versus `55.538847` seconds for the preceding application profile, an 8.1% reduction in the profiled wall clock.

## Candidate-local owner movement

| Candidate | Owner before | Owner after | Owner share before | Owner share after | Result |
|---|---:|---:|---:|---:|---|
| Reuse one immutable operational settlement graph | `loadSettlementGraph` 5,684.957 ms inclusive | 684.079 ms inclusive | 8.73% | 1.20% | −5,000.878 ms, or −88.0%. |
| Reuse adjacency for an immutable edge-array identity | `buildAdjacencyMap` 2,764.472 ms self | 90.059 ms self | 4.84% | 0.17% | −2,674.413 ms, or −96.7%. |

The adjacency cache is eligible only for a runtime-registered, deeply frozen graph edge identity, or an independently deeply frozen array whose every edge record is frozen. Arbitrary mutable arrays take the uncached builder path. Cached adjacency objects and their neighbor arrays are themselves frozen, so a later phase cannot corrupt another consumer's value.

## Evidence paths

The raw performance products are intentionally untracked diagnostics under the repository's generated-artifact policy:

- post-operational-graph replicated report (before adjacency reuse): `data/derived/_debug/r5_phase2_performance_report.json`;
- post-operational-graph replicated manifest (before adjacency reuse): `data/derived/_debug/r5_phase2_performance_manifest.json`;
- hardened-adjacency application profile: `data/derived/_debug/r5_phase2_adj_hardened_v8_app.cpuprofile`;
- hardened-adjacency V8 summary: `data/derived/_debug/r5_phase2_adj_hardened_v8_summary.json`;
- hardened-adjacency phase report: `data/derived/_debug/r5_phase2_adj_hardened_v8_report.json`;
- hardened-adjacency warmup and measured runs: `runs_perf/r5_phase2_adj_hardened_{warmup,measured_1,measured_2,measured_3}/.../timing.json`.

The tracked acceptance contract is this report plus the focused equivalence tests. Raw profiler products remain untracked because they are machine-local diagnostic evidence, not canonical game data.

## Remaining target gap and next measured owner

The latest replicated mean is still 12.02× the 100 ms/turn target. No Phase 2 completion claim is made.

The current application profile ranks the next bounded owners as:

1. repeated operational-data load/reverse-map construction (`loadOperationalData` 905.793 ms self / 1,390.831 ms inclusive; `buildReverseMap` 466.977 ms self / 472.217 ms inclusive);
2. repeated active-brigade location scans (`countActiveBrigadesByOsid` 2,027.278 ms self / 2,220.066 ms inclusive in brigade assignment);
3. primitive political-control lookup/object allocation (`getSettlementControlStatus` 2,152.797 ms self/inclusive);
4. the sector reconstruction algorithm (`buildCorpsFrontSectors` 15,272.677 ms inclusive), which requires deeper measured redesign after the bounded owners.

Each subsequent candidate remains subject to the same rule: focused equivalence test first, current-owner profile, full timed run, exact byte equality, independent determinism review, and rejection on regression or unexplained drift.
