# Engine Quality Phase 2 — measured performance checkpoint

**Date:** 2026-08-01
**Roadmap:** R5, Phase 2
**Scenario:** `data/scenarios/apr1992_definitive_40w.json`
**Reference machine:** AMD Ryzen 7 5700X, 8 physical / 16 logical cores, Windows x64, Node v24.13.0
**Target:** mean below 100 ms per simulated turn
**Status:** Operational-graph, runtime-hardened immutable-adjacency, operational-data ownership reuse, and fixed-point mutation receipts are accepted by exact-output tests and measured evidence. Same-parent control disproves the apparent committee-repair regression; the earlier `+18.155%` packet is preserved below as historical evidence but superseded as a causal timing result. The performance target is not met.

## Determinism boundary

Phase 1 changed the persisted schema to v37, so the Phase 0 v36 final-save file is not a byte-comparison peer. All Phase 2 comparisons use the same v37 state shape.

The original Phase 2 packet through committee-corrected final-sector receipts used one shared prior-state lineage. Every inspected final save in that historical packet had:

- final state hash `52ee1829aab62e5e`;
- exact size `5,071,275` bytes;
- exact SHA-256 `52ee1829aab62e5ede80ca461b0ec6cc1d5ecc8ac2e0700a36ea7229d6050bde`.

The authoritative operational-data packet contained one excluded warmup, one corrected same-process application V8 run, and three timed runs. The initial final-sector-receipt packet contained one excluded warmup, one current phase-owner profile, and three timed runs. After committee review blocked its dependency dispatch and roster writeback accounting, the repaired receipt packet repeated that exact warmup/profile/three-run shape. All inspected final saves were compared directly and were byte-identical to the preceding checkpoints.

Phase 2b starts from reviewed parent `6649ae8ca`. Already-integrated reviewed content changes the current scenario artifact relative to the historical packet, so cross-parent byte comparison would be invalid. The exact pre-committee control (`5c272e0b4`), corrected reviewed parent, detailed candidate profile, and all three candidate measurements were instead run from the same content lineage and produced identical final saves:

- exact size `5,070,902` bytes;
- exact SHA-256 `b28225e47b8e7ba563c4e836151fc8699f3cd191f4912c6c13ac7c099719fbd5`.

No baseline was refreshed. The different bytes between the historical and current-parent packets are provenance, not candidate drift.

## Wall-clock checkpoints

| Checkpoint | Runs | Mean ms/turn | P50 | P95 | Sampled peak heap | Interpretation |
|---|---:|---:|---:|---:|---:|---|
| Phase 0 owner baseline | 3 measured | 1,562.923 | 1,563.681 | 1,567.255 | 340.317 MB | Frozen pre-optimization owner baseline. |
| Operational-graph reuse | 3 measured | 1,292.665 | 1,289.839 | 1,302.636 | 214.034 MB | Mean improved 17.3%; heap improved 37.1%. |
| Runtime-hardened immutable adjacency reuse | 3 measured | 1,201.897 | 1,206.850 | 1,210.672 | 193.845 MB | Mean improved a further 7.0%; heap improved a further 9.4%. |
| Caller-owned operational-data reuse | 3 measured | 1,189.962 | 1,187.475 | 1,195.055 | 199.453 MB | Mean improved a further 0.993%; targeted reverse-map work was removed. |
| Turn-local final-sector receipts | 3 measured | 1,344.179 | 1,359.386 | 1,379.356 | 214.877 MB | Current machine envelope was slower; same-condition pre-change control was 1,348.022 ms/turn, making the candidate 0.285% faster and therefore throughput-neutral. Accepted for explicit ownership and byte identity, not as a speed claim. |
| Committee-corrected final-sector receipts (historical packet) | 3 measured | 1,588.219 | 1,616.182 | 1,654.908 | 202.072 MB | Exact-output correctness checkpoint. The apparent +18.155% regression is preserved but superseded as timing evidence by the same-parent control below. |
| Exact pre-committee control at reviewed-parent lineage (`5c272e0b4`) | 1 control | 1,377.877 | n/a | n/a | n/a | Same-condition causal control for the receipt correction. |
| Corrected receipts at reviewed parent (`6649ae8ca`) | 1 control | 1,332.681 | n/a | n/a | 203.571 MB | 3.280% faster than the exact pre-committee control; the old regression attribution is disproved. |
| Fixed-point mutation receipts | 3 measured | 1,223.822 | 1,219.931 | 1,254.343 | 197.974 MB | Current-parent mean improved 8.168% versus the corrected control; paired builder and call-count evidence below supplies the causal result. |

The three replicated operational-graph samples were `1,285.520`, `1,289.839`, and `1,302.636` ms/turn.

The three post-hardening adjacency samples were `1,188.168`, `1,206.850`, and `1,210.672` ms/turn. The aggregate recorded:

- mean total bucket: `48,075.874` ms, or `1,201.897` ms/turn;
- mean simulation bucket: `46,293.012` ms, or `1,157.325` ms/turn;
- P50/P95: `1,206.850` / `1,210.672` ms/turn;
- final state hash, file size, and SHA-256 exactly matching in the excluded warmup, V8, and all three measured modes.

The hardened application-level V8 run recorded `51.0405172` seconds versus `55.538847` seconds for the preceding application profile, an 8.1% reduction in the profiled wall clock.

The three authoritative corrected operational-data samples were `1,187.356`, `1,195.055`, and `1,187.475` ms/turn. Their mean total bucket was `47,598.479` ms, or `1,189.962` ms/turn; mean simulation was `1,146.633` ms/turn. The corrected same-process V8 run recorded `49,509.962` ms wall time and 1,824 application frames. The 199.453 MB heap sample is not claimed as an improvement over adjacency's 193.845 MB; acceptance rests on the replicated whole-turn reduction, targeted-owner removal, and byte identity.

The final-sector-receipt samples were `1,379.356`, `1,359.386`, and `1,293.795` ms/turn. Their mean simulation bucket was `1,288.537` ms/turn. Because this packet ran in a materially slower current machine envelope than the earlier operational-data packet, an exact pre-change `eab6812fd` control was run immediately afterward and recorded `1,348.022` ms/turn. The receipt candidate is 0.285% faster than that same-condition control, which is below a defensible performance-effect threshold. The earlier replicated `1,189.962` ms/turn remains the authoritative best throughput checkpoint; the receipt candidate is accepted as neutral architectural/stability work and does not reset that floor.

The receipt profile recorded `58,417.586` ms total wall and 214.877 MB phase-boundary sampled peak heap. Relevant phase owners were: `reconcile-final-sector-truth` 8,270.320 ms / 40 calls, `partition-corps-front-sectors` 7,646.724 ms / 40, `reconcile-final-sector-truth-after-ops` 4,021.142 ms / 40, `final-distribute-brigades-to-front` 1,842.221 ms / 40, and the already-clean `seal-final-sector-truth-after-distribution` 0.801 ms / 40. The last figure confirms the duplicate seal owner became a deterministic no-op; the whole-run packet does not establish a statistically meaningful net speedup.

Independent committee review then found two correctness blockers: a later ratings receipt could mask an earlier operation-roster stage, and roster coverage could relocate an active formation while reporting zero geometry-input mutations and falsely closing the session. The repair dispatches from the earliest dirty dependency stage, captures roster location writes, issues `operation-roster-formation-location-writeback`, and consumes one bounded full-geometry fixed point. Its historical measured samples were `1,493.568`, `1,616.182`, and `1,654.908` ms/turn: mean `1,588.219`, P50 `1,616.182`, P95 `1,654.908`, and mean simulation `1,528.019` ms/turn. That packet appeared 18.155% slower than the prior receipt mean and 17.819% slower than the prior packet's immediate control.

Phase 2b recovered the exact pre-committee implementation at `5c272e0b4` and measured it under the same conditions as reviewed parent `6649ae8ca`. The pre-committee control took `55,115.070` ms (`1,377.877` ms/turn); the corrected parent took `53,307.259` ms (`1,332.681` ms/turn), making the corrected implementation 3.280% faster. This same-parent result disproves the earlier causal regression conclusion. The historical packet remains recorded, but its timing delta is now classified as environmental noise rather than a receipt-correction cost.

The historical corrected profile recorded `62,649.585` ms total wall and 202.072 MB phase-boundary sampled peak heap. Relevant phase owners were: `reconcile-final-sector-truth` 8,878.592 ms / 40 calls, `partition-corps-front-sectors` 7,997.175 ms / 40, `reconcile-final-sector-truth-after-ops` 4,120.042 ms / 40, `final-distribute-brigades-to-front` 1,908.359 ms / 40, and `seal-final-sector-truth-after-distribution` 0.935 ms / 40. Those owner observations remain useful, while that packet's whole-run regression attribution is superseded.

The fixed-point-receipt candidate measured `47,887.717`, `48,797.227`, and `50,173.716` ms total wall: mean `48,952.887` ms or `1,223.822` ms/turn, P50 `1,219.931`, P95 `1,254.343`, and mean phase-boundary sampled peak heap 197.974 MB. Against the one-run same-parent corrected control this is an apparent 8.168% whole-run improvement. Because that control was not replicated, acceptance rests primarily on the paired same-process builder benchmark and deterministic call elimination: 20 alternating candidate/reference pairs reduced mean build time from `209.666` to `196.560` ms (`-6.251%`), while the detailed 99-build profile reduced measured sector work from `18,904.264` to `15,356.308` ms (`-18.77%`).

## Candidate-local owner movement

| Candidate | Owner before | Owner after | Owner share before | Owner share after | Result |
|---|---:|---:|---:|---:|---|
| Reuse one immutable operational settlement graph | `loadSettlementGraph` 5,684.957 ms inclusive | 684.079 ms inclusive | 8.73% | 1.20% | −5,000.878 ms, or −88.0%. |
| Reuse adjacency for an immutable edge-array identity | `buildAdjacencyMap` 2,764.472 ms self | 90.059 ms self | 4.84% | 0.17% | −2,674.413 ms, or −96.7%. |
| Reuse caller-owned operational mappings | `loadOperationalData` 905.793 ms self / 1,390.831 ms inclusive; `buildReverseMap` 466.977 / 472.217 ms | `loadOperationalData` 7.755 / 15.554 ms; `buildReverseMap` 7.799 / 7.799 ms | 2.44% and 0.83% | 0.03% and 0.02% | Named work removed in comparable same-process application V8 profiles; whole-turn mean improved 0.993%. |
| Replace implicit final-sector fingerprint cache with turn-local receipts | Module-level `WeakMap<GameState, ...>` inferred invalidation from a pre-build fingerprint and hid self-mutating formation-location inputs | `TurnContext` owns ordered geometry/territory/roster/rating epochs; dispatch follows the earliest dirty stage; postcombat and operation-roster location writers emit explicit geometry receipts | n/a | n/a | Exact legacy bytes restored and committee ordering/writeback blockers closed. Correctness accepted; same-parent control later disproved the apparent timing regression. |
| Consume fixed-point mutation receipts | Every build repeated seal pass 3, prune pass 2, recovery pass 2, and owner-truth pass 4 | Seal/prune/recovery convergence runs only after recovery reports a mutation; owner-truth pass 4 runs only after final territory repair exercises a mutation path | 99/99 calls for each pass | seal 3: 5/99; prune 2: 5/99; recovery 2: 5/99; owner truth 4: 1/99 | Paired builder mean improved 6.251%; exact reference equivalence held across 100 deterministic real-save variants and complete scenario bytes. |

The adjacency cache is eligible only for a runtime-registered, deeply frozen graph edge identity, or an independently deeply frozen array whose every edge record is frozen. Arbitrary mutable arrays take the uncached builder path. Cached adjacency objects and their neighbor arrays are themselves frozen, so a later phase cannot corrupt another consumer's value.

Scenario and desktop owners now pass one caller-owned, read-only operational-data bundle into each turn. The simulation does not freeze `Map` internals and therefore treats mappings and centroids as a read-only ownership contract; a production consumer scan found no writes outside the loader/builders. Compatibility callers retain separate turn-local promises for mappings, edges, and centroids. Mapping-only migration, backfill, and spawn remain available if optional topology files fail, while the explicit full-data phase alone composes all three resources. No promise or bundle enters `GameState` or crosses turns unless the campaign/scenario caller owns that immutable input.

## Evidence paths

The raw performance products are intentionally untracked diagnostics under the repository's generated-artifact policy:

- post-operational-graph replicated report (before adjacency reuse): `data/derived/_debug/r5_phase2_performance_report.json`;
- post-operational-graph replicated manifest (before adjacency reuse): `data/derived/_debug/r5_phase2_performance_manifest.json`;
- hardened-adjacency application profile: `data/derived/_debug/r5_phase2_adj_hardened_v8_app.cpuprofile`;
- hardened-adjacency V8 summary: `data/derived/_debug/r5_phase2_adj_hardened_v8_summary.json`;
- hardened-adjacency phase report: `data/derived/_debug/r5_phase2_adj_hardened_v8_report.json`;
- hardened-adjacency warmup and measured runs: `runs_perf/r5_phase2_adj_hardened_{warmup,measured_1,measured_2,measured_3}/.../timing.json`.
- authoritative operational-data application profile and summaries: `data/derived/_debug/r5_phase2_opdata_corrected_v8_{app.cpuprofile,report.json,summary.json,summary_all.json}`;
- authoritative operational-data warmup/V8/measured runs: `runs_perf/r5_phase2_opdata_corrected_{warmup,v8,measured_1,measured_2,measured_3}/...`.
- final-sector receipt phase profile: `data/derived/_debug/r5_phase2_receipts_profile_report.json`;
- final-sector receipt warmup/profile/measured runs: `runs_perf/r5_phase2_receipts_{warmup2,profile,measured_1,measured_2,measured_3}/...`;
- committee-corrected receipt profile: `data/derived/_debug/r5_phase2_receipts_correction_profile_report.json`;
- committee-corrected receipt warmup/profile/measured runs: `runs_perf/r5_phase2_receipts_correction_{warmup,profile,measured_1,measured_2,measured_3}/...`;
- same-condition pre-receipt control: `F:/AWWV-worktrees/r5-receipts-baseline/runs_perf/r5_phase2_pre_receipts_current_control/.../timing.json` (detached `eab6812fd`; transient local evidence).
- current-parent corrected control: `data/derived/_debug/r5_phase2b_current_profile.json` and `runs_perf/r5_phase2b_current_profile/...`;
- fixed-point candidate measurements: `data/derived/_debug/r5_phase2b_fixed_point_receipts_candidate{,_m2,_m3}.json` and matching `runs_perf` directories;
- fixed-point detailed sector profile: `data/derived/_debug/r5_phase2b_fixed_point_receipts_sector_detail.json` and `runs_perf/r5_phase2b_fixed_point_receipts_sector_detail/...`;
- exact pre-committee control: detached `5c272e0b4`, measured at `55,115.070` ms before its transient worktree was removed.

Evidence lineage is fail-closed. The first operational-data packet is invalid because other lanes executed read-only commands during timing. The first `_clean2` V8 attempt is invalid because it profiled only the parent CLI and contained zero application frames. The otherwise clean `_clean2` packet was then superseded after independent review found an optional-resource coupling regression. The reviewer approved the granular correction, actual-phase failure tests, read-only consumer audit, and corrected five-mode packet. Only the corrected packet named above is authoritative for this candidate.

The initial receipt checkpoint is likewise superseded for correctness by the committee-corrected packet. Its historical RED regressions reproduce both blockers; the focused matrix passed 5 files / 69 tests and the expanded sector/performance matrix passed 8 files / 105 tests, including 100+ deterministic real-save variants. The corrected historical warmup, profile, and all three measured saves were each exactly 5,071,275 bytes with SHA-256 `52ee1829aab62e5ede80ca461b0ec6cc1d5ecc8ac2e0700a36ea7229d6050bde` and state hash `52ee1829aab62e5e`.

Phase 2b added an exact full-reference fixed-point mode for tests and compared canonical sectors plus all formation side effects across 100 deterministic real-save variants. The focused matrix passes 6 files / 78 tests; TypeScript, diff hygiene, and the unchanged baseline-regression runner also pass. A rejected unconditional skip of final seal pass 5 failed that gate at variant seed 27 (ARBiH 3rd Corps topology diverged, 20 sectors versus 8) and was fully reverted. The accepted candidate gates work only behind explicit mutation receipts and preserve the current-parent final save exactly at 5,070,902 bytes and SHA-256 `b28225e47b8e7ba563c4e836151fc8699f3cd191f4912c6c13ac7c099719fbd5` in the detailed profile and all three measurements.

The tracked acceptance contract is this report plus the focused equivalence tests. Raw profiler products remain untracked because they are machine-local diagnostic evidence, not canonical game data.

## Remaining target gap and next measured owner

The accepted historical best replicated mean remains `1,189.962` ms/turn, or 11.8996x the 100 ms/turn target. The current-parent fixed-point candidate mean is `1,223.822` ms/turn, or 12.2382x target. Because the historical floor and current parent were measured in different machine envelopes, Phase 2b is accepted as a causal owner improvement, not a new all-time throughput floor. No Phase 2 completion claim is made.

The current application profile ranks the next bounded owners as:

1. remaining sector reconstruction work (`reconcile-final-sector-truth` 6,751.949 ms and `partition-corps-front-sectors` 6,006.792 ms in the detailed candidate profile), still the dominant algorithmic owner after the safe fixed-point passes were removed;
2. repeated active-brigade location scans (`countActiveBrigadesByOsid` 1,935.641 ms self / 2,131.756 ms inclusive in brigade assignment, plus 465.709 ms in front distribution);
3. primitive political-control lookup/object allocation (`getSettlementControlStatus` 2,187.781 ms self/inclusive).

Each subsequent candidate remains subject to the same rule: focused equivalence test first, current-owner profile, full timed run, exact byte equality, independent determinism review, and rejection on regression or unexplained drift.
