# Engine Quality Phase 2 — measured performance checkpoint

**Date:** 2026-08-01
**Roadmap:** R5, Phase 2
**Scenario:** `data/scenarios/apr1992_definitive_40w.json`
**Reference machine:** AMD Ryzen 7 5700X, 8 physical / 16 logical cores, Windows x64, Node v24.13.0
**Target:** mean below 100 ms per simulated turn
**Status:** Operational-graph, runtime-hardened immutable-adjacency, operational-data ownership reuse, and the Phase 2c call-scoped dense formation-occupancy index are accepted. Same-parent control disproves the apparent committee-repair regression; the earlier `+18.155%` packet is preserved below as historical evidence but superseded as a causal timing result. The Phase 2b fixed-point candidate remains committee-blocked. The accepted Phase 2c replay mean is `1,122.123 ms/turn`, or `11.2212x` the target, so the performance target is not met.

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
| Fixed-point mutation receipts (committee-blocked packet) | 3 measured | 1,223.822 | 1,219.931 | 1,254.343 | 197.974 MB | Diagnostic only. Source dependency proof and benchmark provenance were insufficient; no performance acceptance is claimed. |
| Dense formation occupancy (Phase 2c accepted replay) | 3 measured | 1,122.123 | 1,118.922 | 1,163.315 | 254.082 MB | Exact-parent control mean was 1,183.549 ms/turn; candidate mean improved 5.190%, all three pairs improved, and all saves were byte-identical. |

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

The committee-blocked fixed-point candidate measured `47,887.717`, `48,797.227`, and `50,173.716` ms total wall: mean `48,952.887` ms or `1,223.822` ms/turn, P50 `1,219.931`, P95 `1,254.343`, and mean phase-boundary sampled peak heap 197.974 MB. Against the one-run same-parent corrected control this appeared 8.168% faster. The detailed profile also appeared to reduce measured sector work from `18,904.264` to `15,356.308` ms (`-18.77%`). Neither result is accepted: the measured source omitted the prune receipt from its fixed-point dependency set.

A one-off 20-pair alternating builder run reported `209.666` to `196.560` ms (`-6.251%`), but its exact command and raw stdout were not retained. That is the complete available provenance; the result is non-reproducible and removed from the acceptance case. A fresh benchmark must use a committed runner or capture exact command, parent commit/candidate commit, fixture hashes, Node version, every pair, aggregation method, and raw output before any speed claim is restored.

## Candidate-local owner movement

| Candidate | Owner before | Owner after | Owner share before | Owner share after | Result |
|---|---:|---:|---:|---:|---|
| Reuse one immutable operational settlement graph | `loadSettlementGraph` 5,684.957 ms inclusive | 684.079 ms inclusive | 8.73% | 1.20% | −5,000.878 ms, or −88.0%. |
| Reuse adjacency for an immutable edge-array identity | `buildAdjacencyMap` 2,764.472 ms self | 90.059 ms self | 4.84% | 0.17% | −2,674.413 ms, or −96.7%. |
| Reuse caller-owned operational mappings | `loadOperationalData` 905.793 ms self / 1,390.831 ms inclusive; `buildReverseMap` 466.977 / 472.217 ms | `loadOperationalData` 7.755 / 15.554 ms; `buildReverseMap` 7.799 / 7.799 ms | 2.44% and 0.83% | 0.03% and 0.02% | Named work removed in comparable same-process application V8 profiles; whole-turn mean improved 0.993%. |
| Replace implicit final-sector fingerprint cache with turn-local receipts | Module-level `WeakMap<GameState, ...>` inferred invalidation from a pre-build fingerprint and hid self-mutating formation-location inputs | `TurnContext` owns ordered geometry/territory/roster/rating epochs; dispatch follows the earliest dirty stage; postcombat and operation-roster location writers emit explicit geometry receipts | n/a | n/a | Exact legacy bytes restored and committee ordering/writeback blockers closed. Correctness accepted; same-parent control later disproved the apparent timing regression. |
| Consume fixed-point mutation receipts (committee-blocked) | Every build repeated seal pass 3, prune pass 2, recovery pass 2, and owner-truth pass 4 | The blocked source gated convergence on recovery alone even though ghost pruning ran after seal pass 2 and could delete a sector independently | 99/99 calls for each pass | Historical diagnostic counts: seal 3: 5/99; prune 2: 5/99; recovery 2: 5/99; owner truth 4: 1/99 | Not accepted. Corrected source must consume both prune and recovery receipts and pass the complete observable-surface/mode matrix before remeasurement. |

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
- committee-blocked fixed-point measurements: `data/derived/_debug/r5_phase2b_fixed_point_receipts_candidate{,_m2,_m3}.json` and matching `runs_perf` directories;
- committee-blocked detailed sector profile: `data/derived/_debug/r5_phase2b_fixed_point_receipts_sector_detail.json` and `runs_perf/r5_phase2b_fixed_point_receipts_sector_detail/...`;
- exact pre-committee control: detached `5c272e0b4`, measured at `55,115.070` ms before its transient worktree was removed.

Evidence lineage is fail-closed. The first operational-data packet is invalid because other lanes executed read-only commands during timing. The first `_clean2` V8 attempt is invalid because it profiled only the parent CLI and contained zero application frames. The otherwise clean `_clean2` packet was then superseded after independent review found an optional-resource coupling regression. The reviewer approved the granular correction, actual-phase failure tests, read-only consumer audit, and corrected five-mode packet. Only the corrected packet named above is authoritative for this candidate.

The initial receipt checkpoint is likewise superseded for correctness by the committee-corrected packet. Its historical RED regressions reproduce both blockers; the focused matrix passed 5 files / 69 tests and the expanded sector/performance matrix passed 8 files / 105 tests, including 100+ deterministic real-save variants. The corrected historical warmup, profile, and all three measured saves were each exactly 5,071,275 bytes with SHA-256 `52ee1829aab62e5ede80ca461b0ec6cc1d5ecc8ac2e0700a36ea7229d6050bde` and state hash `52ee1829aab62e5e`.

The blocked Phase 2b checkpoint added a full-reference fixed-point mode but compared a hand-maintained subset of sector fields plus formation state only, in the default `isFinalPass=false` / `finalSaveGeometryProjection=false` mode. Its exact focused command was:

```powershell
npm.cmd exec -- vitest run tests/sector_partition_instrumentation.test.ts tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/final_sector_truth_reconciliation.test.ts tests/final_sector_truth_reconciliation_cache.test.ts tests/final_sector_reconciliation_session.test.ts tests/sector_territory_contiguity_repair.test.ts --pool=forks --reporter=dot
```

The command reported Vitest 2.1.9, 6 files / 78 tests passed, started `2026-08-01 17:49:49`, duration `177.19s`. Raw stdout existed only in the Codex task transcript and was not retained as a durable artifact; the count is historical provenance, not sufficient evidence for acceptance. The committee correction replaces the selective serializer with recursive stable-key canonicalization of the complete `CorpsFrontSector`/sub-segment packet and entire cloned `GameState`, and exercises the three production modes: live war (`false/false`), final turn (`true/false`), and final-save projection (`false/true`).

A rejected unconditional skip of final seal pass 5 failed the earlier gate at variant seed 27 (ARBiH 3rd Corps topology diverged, 20 sectors versus 8) and was fully reverted. The blocked candidate's detailed profile and all three measurements did preserve the then-current parent final save at 5,070,902 bytes and SHA-256 `b28225e47b8e7ba563c4e836151fc8699f3cd191f4912c6c13ac7c099719fbd5`, but exact scenario bytes cannot accept a shortcut whose dependency proof and test surface are incomplete.

### Committee correction verification

The prune-receipt regression was run RED before the source repair:

```powershell
npm.cmd exec -- vitest run tests/postmerge_ghost_sector_prune.test.ts tests/sector_partition_instrumentation.test.ts --pool=forks --reporter=dot
```

It failed for the intended reason: `pruneGhostArtifactSectors` returned `undefined` for both mutation/no-mutation cases and the convergence guard did not consume a prune receipt (3 failed, 34 passed). The corrected source returns a deterministic boolean receipt and runs the convergence segment unless both prune and recovery report unchanged.

The fresh combined GREEN command was:

```powershell
npm.cmd exec -- vitest run tests/sector_partition_instrumentation.test.ts tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/final_sector_truth_reconciliation.test.ts tests/final_sector_truth_reconciliation_cache.test.ts tests/final_sector_reconciliation_session.test.ts tests/sector_territory_contiguity_repair.test.ts tests/postmerge_ghost_sector_prune.test.ts --pool=forks --reporter=dot
```

Vitest 2.1.9 reported 7 files / 81 tests passed, started `2026-08-01 18:22:50`, duration `385.56s`. The complete recursive optimized/reference property covered every returned sector/sub-segment field and the entire directly mutated `GameState` across 100 variants in each of the three production modes (300 candidate/reference comparisons); that property took `291.245s`. Raw stdout is preserved in the ignored diagnostic `data/derived/_debug/r5_phase2b_committee_correction_focused.log` (192,074 bytes; SHA-256 `c02a7ed2b9159e4996e54ccefa6678ca17c3cfa1d40f8e6877fd53ba33e39e8a`).

`npm.cmd run typecheck` passed. `npm.cmd run test:baselines` reported `Baseline regression: all scenarios match.` Its raw stdout/stderr is preserved in the ignored diagnostic `data/derived/_debug/r5_phase2b_committee_correction_baselines.log` (63,168 bytes; SHA-256 `a908d8a8993de784c2415f2cfa8dd3d20bf35bab8cbbfe2476b7c1e9cc0d2506`). Diff hygiene and the determinism-sensitive added-line scan passed. Per `DETERMINISM_TEST_MATRIX.md`, `Engine_Invariants_v0_9_0.md`, `DETERMINISM_AUDIT.md`, `INVARIANTS_IN_CODE.md`, and `CODE_CANON.md`, the correction adds no random, time-derived, locale-dependent, filesystem-order, or persisted diagnostic input. No performance profile or new timed scenario measurement was run for the correction; the timing packet remains blocked pending an authorized fresh lane.

The tracked acceptance contract is this report plus the focused equivalence tests. Raw profiler products remain untracked because they are machine-local diagnostic evidence, not canonical game data.

### Ledger and handoff correction

Commit `a7b417c0f` remains the blocked initial fixed-point candidate; commit `65b7b072e` is its correctness correction with prune and recovery receipts plus the 300 full-state, three-mode comparison matrix. Neither prior commit body contained the required ledger reference. They were not amended or rewritten; this separate docs-only correction closes that process gap without changing source, tests, baselines, or timing evidence. The canonical record is [2026-08-01 - Engine quality Phase 2b fixed-point mutation-receipt correction](../../PROJECT_LEDGER.md#2026-08-01---engine-quality-phase-2b-fixed-point-mutation-receipt-correction). The non-authoritative 20-pair result and Phase 2b performance acceptance remain blocked exactly as stated above; no unavailable napkin evidence is claimed.

## Remaining target gap and next measured owner

The accepted current-parent best replicated mean is now `1,122.123` ms/turn, or `11.2212x` the 100 ms/turn target. The earlier operational-data floor remains valid historical evidence at `1,189.962 ms/turn`, while the blocked fixed-point packet's `1,223.822 ms/turn` mean is not an accepted checkpoint. No Phase 2 completion or Phase 2b performance-acceptance claim is made.

The current application profile ranks the next bounded owners as:

1. remaining sector reconstruction work (`reconcile-final-sector-truth` 6,751.949 ms and `partition-corps-front-sectors` 6,006.792 ms in the detailed candidate profile), still the dominant algorithmic owner after the safe fixed-point passes were removed;
2. repeated active-brigade location scans (`countActiveBrigadesByOsid` 1,935.641 ms self / 2,131.756 ms inclusive in brigade assignment, plus 465.709 ms in front distribution);
3. primitive political-control lookup/object allocation (`getSettlementControlStatus` 2,187.781 ms self/inclusive).

Each subsequent candidate remains subject to the same rule: focused equivalence test first, current-owner profile, full timed run, exact byte equality, independent determinism review, and rejection on regression or unexplained drift.

### Phase 2c static owner design

The executable design is [R5 Phase 2c amortized sector topology plan](../../plans/2026-08-01-r5-phase2c-amortized-sector-topology-plan.md). This is a static-analysis handoff, not new timing or performance acceptance.

The diagnostic 40-turn profile attributes `6,751.949 ms` to `reconcile-final-sector-truth`, `6,006.792 ms` to `partition-corps-front-sectors`, and `3,077.626 ms` to `reconcile-final-sector-truth-after-ops`: `15,836.367 ms`, or about `395.9 ms/turn`. The same run totals about `1,223.822 ms/turn`, so eliminating all three sector owners would still leave roughly `828 ms/turn`. Sector topology is the first structural candidate, not an order-of-magnitude solution by itself.

The diagnostic sector sidecar records 99 builder invocations over 40 turns (`2.475` calls/turn). Static source inspection shows each full build repeats faction construction followed by geometry, sealing, recovery, coverage, ownership, territory, assignment, and diagnostic passes. The safe first candidate is therefore an invocation-local derived context with stable OSID ordinals, dense mutation-aware formation occupancy, and precomputed faction/sector reachability facts. The context must be updated at the exact formation-location mutation owner and must not cross a turn or enter `GameState`.

A larger pure-solve/serial-commit incremental topology architecture is conditional. It requires explicit dirty faction/component/front-edge/formation identity on the transient receipt, complete full-builder fallback, and full observable-surface equivalence. A broad receipt kind alone cannot prove untouched topology current.

Rejected shapes remain explicit: module/cross-turn `WeakMap` or fingerprint caching, unconditional truth-pass skips, recovery-only fixed-point guards, parallel faction mutation, threshold changes, hash-only comparison, and performance baseline re-flooring. The prior byte-identical floor-completion `Map` hoist is also not a retry candidate: it regressed the target label from roughly `696` to `907 ms` in confirmation runs as its mutation-updated map grew sparse. The Phase 2c plan instead requires a dense/delta structure to earn its place in a fresh profile.

No production source, test, scenario, baseline, timing artifact, package, version, release state, canon, or `FORAWWV.md` changed in this design checkpoint. The next action remains a fresh corrected-source V8/phase/sector/control packet after the exclusive runtime lease is available.

### Phase 2c fresh current-owner attribution

The exclusive runtime lane subsequently produced a fresh corrected-source owner packet at commit `4462a485f1fd1ad511068bcaacd0926af962771e` on Windows x64, Node `24.13.0`, and an AMD Ryzen 7 5700X. Five unrelated long-lived Node processes remained present; no AWWV scenario, performance, Electron, package, or baseline process overlapped the serial runs. This packet selects the next owner but does not establish a new replicated floor because the three timed measured runs were not collected.

The excluded control warmup completed in `45,236.582 ms`, including `43,475.791 ms` simulation. The phase/sector profile completed in `46,291.786 ms` (`1,157.295 ms/turn`) with `281.171 MB` phase-boundary sampled peak heap and `447.488 MB` RSS. Its dominant phases were:

| Phase | Total over 40 turns | Per turn |
|---|---:|---:|
| `reconcile-final-sector-truth` | `6,368.145 ms` | `159.204 ms` |
| `partition-corps-front-sectors` | `5,765.945 ms` | `144.149 ms` |
| `reconcile-final-sector-truth-after-ops` | `2,958.513 ms` | `73.963 ms` |
| **Three-sector total** | **`15,092.603 ms`** | **`377.315 ms`** |

The three sector phases consumed `32.603%` of wall time. Their theoretical complete removal would still leave about `779.980 ms/turn`, so sector work remains the first structural owner rather than a complete route to the `100 ms/turn` target. The sector sidecar recorded 99 builder invocations (`2.475` calls/turn) and `14,646.453 ms` total instrumented builder time. Its largest nested labels include faction building, minimum coverage, sealing, rescue, territory claim, recovery, owner truth, geometry splitting, and surplus transfer; those timers overlap and are ranking evidence only.

The same-process V8 profile sampled `47,713.892 ms`, `31,793` samples, and `1,781` application frames. `buildCorpsFrontSectors` ranked first by inclusive application time at `14,170.635 ms` (`29.699%`). The top current self-time owners were:

1. `getSettlementControlStatus`: `2,086.262 ms` (`4.372%`);
2. `countActiveBrigadesByOsid` in brigade assignment: `1,456.808 ms` self / `1,588.562 ms` inclusive;
3. `strictCompare`: `1,408.912 ms`;
4. `bfsReachable`: `1,346.664 ms`;
5. `computeFrontEdges`: `1,260.255 ms` self / `3,301.004 ms` inclusive;
6. `buildEdgeAdjacency`: `912.269 ms` self / `1,454.438 ms` inclusive;
7. `friendlyPathToAny`: `641.584 ms` self / `701.375 ms` inclusive.

The warmup, phase/sector profile, and V8 run each produced a `5,070,902`-byte final save with SHA-256 `b28225e47b8e7ba563c4e836151fc8699f3cd191f4912c6c13ac7c099719fbd5` and state hash `b28225e47b8e7ba5`. Exact transcripts and raw products remain ignored under:

- `data/derived/_debug/r5_phase2c_current_warmup.transcript.txt`;
- `data/derived/_debug/r5_phase2c_current_sector_profile.json`;
- `data/derived/_debug/r5_phase2c_current_sector_partition.jsonl`;
- `data/derived/_debug/r5_phase2c_current.cpuprofile`;
- `data/derived/_debug/r5_phase2c_current_v8_{phase,summary}.json`;
- `runs_perf/r5_phase2c_current_{warmup,sector_profile,v8}/...`.

The retained raw-evidence hashes are:

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `r5_phase2c_current_warmup.transcript.txt` | `4,926` | `b3fd44fd9d284885e3c1f542fbeb9b7cebfe02b8b4c3c4c8bea182030f60ccfb` |
| `r5_phase2c_current_sector_profile.json` | `18,809` | `01cef0450a0857fee31c62e70382d6e7d89aebe3bb6eac2848a77326c93f8e84` |
| `r5_phase2c_current_sector_partition.jsonl` | `9,334,756` | `c6289bdb68fde6633f27c72c4b1390c55464be56b9765ff30a86d4e67957fbda` |
| `r5_phase2c_current.cpuprofile` | `2,647,735` | `77de5006691a75d9583ee57c61413bd24eff288a7ac867ce38235a47db4f1ee7` |
| `r5_phase2c_current_v8_phase.json` | `18,818` | `10620070c0c3fd2e9911e9af302592bda393001acfbfda8ed42eb7938b9366ef` |
| `r5_phase2c_current_v8_summary.json` | `162,104` | `df4725921343db31a93b25ee9f9d28a8b8b1b9e18f7cc9d551e957b30fe43f30` |

### Rejected Phase 2c canonical status-result reuse

A deliberately bounded red-first spike tested whether four frozen canonical result objects could remove allocation from `getSettlementControlStatus`. RED failed the intended object-identity expectation while semantic equality passed. GREEN passed 2/2 focused tests, an expanded eight-file 27-test matrix, and `npm run typecheck`. The candidate real-scenario saves remained exactly byte-identical to current source.

The candidate was not retained. Its like-mode excluded warmup completed in `46,307.911 ms` versus `45,236.582 ms` for current source (`+2.368%`), including `44,518.156 ms` versus `43,475.791 ms` simulation (`+2.397%`). The candidate V8 envelope was globally slower (`57,484.452` versus `47,713.892` sampled milliseconds), so that profile cannot prove a causal regression. Nevertheless, the target function itself rose from `2,086.262` to `2,169.100 ms` self (`+3.971%`) and no absolute owner reduction appeared. The result is therefore rejected as inconclusive/no-benefit rather than mislabeled as either an optimization or a proven regression.

The source and test spike were fully reverted; production source and tracked tests are unchanged. Ignored negative evidence remains under `data/derived/_debug/r5_phase2c_status_reuse_*` and `runs_perf/r5_phase2c_status_reuse_*`. The next safe executable step is the red-first, call-scoped dense formation-occupancy contract in Task 2 of the Phase 2c plan. It must prove mutation-sequence parity before any production hot-path replacement or candidate timing.

The rejected packet's warmup transcript, CPU profile, phase report, and V8 summary are respectively SHA-256 `7c3f22b5979dc335dfbe76b7d2fe4ce7ae277f34753085a406909bbcd8f9f9fd`, `5886281c0f4a638932a8b2a77d11bb650ea90720d20a47a70bf115ab997de53f`, `6afb721b69f1e4f0348103570dbc502753665323a95068f271902b09901dd879`, and `bf91222a248c3f428859f45a1b7d165d7f6abaf8372d458a6be34ab51980cb89`. The transcripts preserve the exact command lines; the reverted source/test blobs are `19511d45ab085704fa9ea06c6407439c497cbc55` and `b299f65ab065f43edad6d5a0cfd830edb9c92e6f`.

### Accepted Phase 2c dense formation occupancy

The retained candidate is commit `25313d1c05b174188fad167ff38ed826b6aa737d`, whose exact parent/control is `e0481393f32d77001369a78e462f494200bed831`. It constructs one stable-ordinal `Uint32Array` occupancy index per `ensureMinimumSectorCoverage(...)` invocation, replaces eight repeated full formation-location scans, and updates the index at the same statement that owns the function's sole `location_osid` mutation. Unknown OSIDs, stale/double moves, underflow, overflow, and formation-id mismatches fail closed. No index crosses an invocation or enters `GameState`, and no reachability, pass-skipping, rule, or threshold change is included.

The excluded warmup completed in `44,743.659 ms` and preserved exact bytes. The like-mode phase/sector profile completed in `44,174.035 ms`, compared with `46,291.786 ms` for the exact-parent current profile. The three named sector phases fell from `15,092.603` to `13,493.006 ms` (`-10.599%`):

| Phase owner | Exact-parent ms | Candidate ms | Delta |
|---|---:|---:|---:|
| `reconcile-final-sector-truth` | 6,368.145 | 5,668.880 | -10.981% |
| `partition-corps-front-sectors` | 5,765.945 | 5,303.939 | -8.013% |
| `reconcile-final-sector-truth-after-ops` | 2,958.513 | 2,520.187 | -14.816% |
| **Three-sector total** | **15,092.603** | **13,493.006** | **-10.599%** |

The candidate V8 profile sampled `47,354.022 ms`, `31,592` samples, and `1,791` frames. The named `ensureMinimumSectorCoverage` owner fell from `3,124.746` to `1,623.138 ms` inclusive (`-48.055%`); its removed brigade-assignment `countActiveBrigadesByOsid` frame no longer appears, while the replacement `DenseFormationOccupancyIndex` costs `597.951 ms` inclusive. `buildCorpsFrontSectors` fell from `14,170.635` to `12,938.800 ms` inclusive (`-8.693%`). The separate `countActiveBrigadesByOsid` in `brigade_front_distribution.ts` remains `428.529 ms` and is not claimed by this packet.

The authoritative fully captured alternating sequence was `control_1, candidate_1, control_2, candidate_2, control_3, candidate_3`. It used one dependency installation and exact-parent detached control under the same exclusive runtime lease:

| Run | Control ms/turn | Candidate ms/turn | Pair delta |
|---:|---:|---:|---:|
| 1 | 1,162.403 | 1,118.922 | -3.741% |
| 2 | 1,231.142 | 1,163.315 | -5.509% |
| 3 | 1,157.103 | 1,084.132 | -6.306% |
| **Mean** | **1,183.549** | **1,122.123** | **-5.190%** |

Candidate P50/P95 were `1,118.922` / `1,163.315 ms/turn`, versus control `1,162.403` / `1,231.142`. Mean simulation time fell from `1,138.446` to `1,079.494 ms/turn` (`-5.178%`). A preceding alternating sequence with complete timing/save artifacts but incomplete stdout capture also favored the candidate (`1,101.322` versus `1,140.842 ms/turn`, `-3.464%`); it is corroborating evidence only and does not replace the fully captured replay.

Warmup, phase/sector, V8, and all twelve control/candidate measured saves were each exactly `5,070,902` bytes with SHA-256 `b28225e47b8e7ba563c4e836151fc8699f3cd191f4912c6c13ac7c099719fbd5` and state hash `b28225e47b8e7ba5`. The original full-state gate passed 6 files / 46 tests over 100+ deterministic real-save variants and all production reconciliation modes; the focused occupancy/coverage slice passed 3 files / 26 tests; TypeScript passed. A fresh baseline process exited `0` with `Baseline regression: all scenarios match.` No baseline was refreshed.

#### Committee correction: independent occupancy reference

The original long property was necessary but insufficient for the occupancy claim: it compared optimized and exact fixed-point sequences while both sequences still used the same dense occupancy implementation. Committee review therefore reopened only the correctness-evidence boundary, not the retained timing packet or its exact-byte result.

The correction introduces an explicit `dense-index | test-only-legacy-scan` strategy at `ensureMinimumSectorCoverage(...)`. Unknown strategies fail closed. The production default remains one dense call-scoped index; the test-only reference independently rebuilds the historical eligible-formation scan at each of the eight former scan sites and applies the same local count deltas after a chosen move. The strategy is passed explicitly through faction build, dropped-edge recovery, seal, final-owner truth, and operation-sensitive roster reconciliation. It is not an environment switch, module global, persisted field, or alternate gameplay rule.

TDD first proved the missing boundary: the unknown-strategy test failed because the function returned instead of throwing. Separately, the inherited event-state-shape fixture failed schema v37 only because its otherwise-valid military object omitted `corps_front_sectors` and `sector_intel`; the fixture now supplies both empty required fields and the validator is unchanged. GREEN passes the complete brigade reconciliation file (37/37), state-shape validation (9/9), dense index contract (4/4), and TypeScript.

The corrected long gate passes 6 files / 47 tests in `617.81s`. The existing fixed-point property remains separate and passes 300 comparisons in `265.045s`. The new occupancy property passes another 300 comparisons in `264.249s`: 100 deterministic variants of `data/derived/latest_run_final_save.json` in live-war, final-turn, and final-save-projection modes, comparing every returned sector field plus the entire cloned `GameState` between the dense candidate and independent legacy scans. No divergence occurred. `npm.cmd run test:baselines` then exited `0` in `67.6s` with `Baseline regression: all scenarios match.` No baseline was refreshed and no performance timing was rerun or reinterpreted.

Raw evidence is ignored by artifact policy but retained under `data/derived/_debug/r5_phase2c_dense_occupancy_*`, `data/derived/_debug/r5_phase2c_dense_occupancy_replication/`, and `runs_perf/r5_phase2c_dense_occupancy_*`. The authoritative manifest is 32,067 bytes, SHA-256 `6c65d7abffedbf95a4fdfeff9427b35b3e4c47fdd310eeae6a480499d4764c13`; it records every command, commit, timing path/hash, stdout/stderr path/hash, final-save path/hash, pair delta, and exit code. The repository's hotspot and aggregate wall-clock report CLIs both passed against the retained packet; their JSON SHA-256 values are `cbf1d4930d4cd1304ff76a1014273a4685fe1d044ebad0433080d62d3ea9b30f` and `af1fa0df09bdc4b0f12c819b7f515f9246fb9a657278710494ba4610b6eb78c3`. The candidate CPU profile, phase report, sector sidecar, V8 phase report, and V8 summary are respectively SHA-256 `e09fcc6823c6e060c3067e89a3794febea01449a33e291312446bfba953ad134`, `543fda5fde4ce2eed01c52c83eea6b6ed9c418dc96856a60bbe6001dd1d7b299`, `d14893f5287f55c9bf846edcd0aa0cc39b5177e9b1a69c4cac2f19c43eeccb45`, `a412aa7ee902dc1e62ab169d0593bacc1560c342cb6f025c1903eeb97b0a23c9`, and `53ec4e5de4603c70be38fc59e6a5741de125d6905a04ea6a13d8fad7a217928a`.

The fresh candidate profile still ranks `buildCorpsFrontSectors` as the dominant inclusive application owner. Its three sector phases consume `337.325 ms/turn`; perfect removal would still leave about `767.026 ms/turn` in that profile. R5 therefore remains open. The next bounded owner is Task 3's red-first reachability/sector-fact equivalence packet; any later incremental topology solver remains conditional on that safer call-scoped work and another fresh full profile.
