# R5 Phase 2c Amortized Sector Topology Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Recover the dominant sector-reconstruction cost without changing any campaign byte, then repeatedly hand the 100 ms/turn target to the largest owner in a fresh full profile until the target is met.

**Architecture:** First establish a current, committee-usable profile from the corrected fixed-point source under the exclusive runtime lease. Replace repeated scans and graph searches inside one sector-build call with a call-scoped, deterministic derived context whose formation-location counts are updated by the same mutation owner. Only after that bounded packet passes full legacy equivalence and shows a measured win may the lane split sector construction into a pure topology solve and deterministic mutation commit, with explicit faction/component dirty receipts. No cache crosses a turn or enters `GameState`.

**Tech Stack:** TypeScript, Vitest, Node/V8 CPU profiling, the 40-week scenario runner, deterministic JSON serialization, PowerShell evidence capture.

---

## Status and authority boundary

This document is an active implementation and measurement plan. The dense formation-occupancy contract and its bounded `ensureMinimumSectorCoverage(...)` integration are accepted at commit `25313d1c05b174188fad167ff38ed826b6aa737d`. The fully captured exact-parent replay improves mean throughput from `1,183.549` to `1,122.123 ms/turn` (`-5.190%`) with exact bytes, so `1,122.123 ms/turn` (`11.2212x` the `100 ms/turn` target) is the current accepted floor. The `1,223.822 ms/turn` fixed-point packet remains diagnostic because its measured source omitted the prune receipt. R5 remains open; Task 3's red-first reachability/sector-fact equivalence is next.

Task 1's owner-selection subset is complete at source commit `4462a485f1fd1ad511068bcaacd0926af962771e`; Task 5's occupancy disposition is complete at `25313d1c05b174188fad167ff38ed826b6aa737d`. Do not collect another heavy packet while any scenario, performance, Electron, package, baseline, or other heavy runtime owner holds the machine lane. No baseline re-floor, package, version, tag, publication, release-state, canon, or `docs/10_canon/FORAWWV.md` change belongs to Phase 2c.

The determinism-auditor skill references `docs/PHASE_A_INVARIANTS.md`, but that file does not exist at this repository revision. Use the live contracts below and record the stale skill reference as documentation debt; do not invent a replacement contract.

## Evidence that selects the design

### Accepted and diagnostic boundaries

| Evidence | Result | Use in Phase 2c |
|---|---:|---|
| Accepted operational-data packet | `1,189.962 ms/turn` mean | Historical accepted floor only. |
| Committee-blocked fixed-point packet | `1,223.822 ms/turn` mean; P50 `1,219.931`; P95 `1,254.343`; `197.974 MB` sampled heap | Diagnostic owner ranking only. |
| Corrected fixed-point source | 300 full-state comparisons across live-war, final-turn, and final-save-projection modes | Correctness prerequisite. |
| Fresh corrected-source phase/sector profile | `46,291.786 ms` wall; three sector phases `15,092.603 ms` (`377.315 ms/turn`, `32.603%`) | Current owner selection only; not a replicated floor. |
| Fresh corrected-source application V8 capture | `buildCorpsFrontSectors` `14,170.635 ms` inclusive (`29.699%`) | Confirms sector reconstruction is the next structural owner. |
| Accepted dense occupancy replay | control `1,183.549`; candidate `1,122.123 ms/turn`; all three pairs faster; exact bytes | New current floor and permission to begin Task 3. |

In the diagnostic 40-turn phase profile, the three large sector steps cost:

- `reconcile-final-sector-truth`: `6,751.949 ms`;
- `partition-corps-front-sectors`: `6,006.792 ms`;
- `reconcile-final-sector-truth-after-ops`: `3,077.626 ms`.

Together they cost `15,836.367 ms`, or about `395.9 ms/turn` and `32.7%` of the diagnostic wall time. Even deleting all of that work would leave about `828 ms/turn`. Phase 2c therefore cannot close R5 with one sector patch: after each accepted packet, a fresh full profile must select the next owner.

The same diagnostic sector sidecar contains `99` `buildCorpsFrontSectors` invocations over 40 turns (`2.475` calls/turn). Its nested labels rank repeated work inside the owner—`buildFactionSectors`, `ensureMinimumSectorCoverage`, sealing, recovery, geometry, ownership, and territory—but nested inclusive labels overlap and must not be added as independent totals.

The last application V8 self-time ranking gives the bounded primitives to test inside the current owner:

1. `getSettlementControlStatus`: `2,187.781 ms` self/inclusive;
2. `countActiveBrigadesByOsid` in brigade assignment: `1,935.641 ms` self / `2,131.756 ms` inclusive, plus `465.709 ms` in front distribution;
3. `bfsReachable`: `1,396.594 ms` self;
4. `computeFrontEdges`: `1,248.647 ms` self / `3,376.603 ms` inclusive;
5. `buildEdgeAdjacency`: `927.002 ms` self / `1,469.030 ms` inclusive;
6. `friendlyPathToAny`: `720.647 ms` self / `781.308 ms` inclusive;
7. `buildOneHopReserveBand`: `537.673 ms` self.

### Fresh corrected-source owner packet

The exclusive runtime-lane packet ran on Windows x64 with Node `24.13.0` and an AMD Ryzen 7 5700X at `4462a485f1fd1ad511068bcaacd0926af962771e`. Five unrelated long-lived Node processes remained present, but no AWWV scenario, performance, Electron, package, or baseline process overlapped the runs. Exact commands and transcripts are retained in ignored Phase 2c diagnostics.

The excluded warmup completed in `45,236.582 ms` (`43,475.791 ms` simulation). The phase/sector profile completed in `46,291.786 ms`, or `1,157.295 ms/turn`, with `281.171 MB` phase-boundary sampled peak heap and `447.488 MB` RSS. Its three sector phases were `reconcile-final-sector-truth` `6,368.145 ms`, `partition-corps-front-sectors` `5,765.945 ms`, and `reconcile-final-sector-truth-after-ops` `2,958.513 ms`: `15,092.603 ms`, or `377.315 ms/turn` and `32.603%` of wall time. Even perfect removal would leave about `779.980 ms/turn` in that one run.

The same-process application profile sampled `47,713.892 ms` across `31,793` samples and `1,781` frames. `buildCorpsFrontSectors` remained the dominant inclusive application owner at `14,170.635 ms` (`29.699%`). Its three largest self-time primitives were `getSettlementControlStatus` `2,086.262 ms`, `countActiveBrigadesByOsid` in brigade assignment `1,456.808 ms`, and `strictCompare` `1,408.912 ms`; `bfsReachable` cost `1,346.664 ms` and `computeFrontEdges` cost `1,260.255 ms` self / `3,301.004 ms` inclusive. The sector sidecar recorded `99` builder invocations over 40 turns (`2.475` calls/turn) and `14,646.453 ms` total instrumented builder time. Nested labels overlap and are not additive.

Warmup, phase/sector, and V8 final saves were each exactly `5,070,902` bytes with SHA-256 `b28225e47b8e7ba563c4e836151fc8699f3cd191f4912c6c13ac7c099719fbd5` and state hash `b28225e47b8e7ba5`. This is sufficient to confirm the next owner, not to establish a current replicated floor: the three timed measured runs in Task 1 remain open.

### Rejected bounded status-result reuse

A red-first spike reused four frozen canonical objects returned by `getSettlementControlStatus`. RED failed only the intended identity contract while semantic equality passed; GREEN passed the focused 2/2 tests, an expanded eight-file 27-test matrix, and `npm run typecheck`. The real-scenario candidate preserved the exact `5,070,902` bytes, SHA-256, and state hash.

The candidate did not earn a source checkpoint. Its like-mode excluded warmup was `46,307.911 ms` versus `45,236.582 ms` for current source (`+2.368%`), while the V8 machine envelope slowed globally from `47,713.892` to `57,484.452` sampled milliseconds. The target function itself moved from `2,086.262` to `2,169.100 ms` self (`+3.971%`) and showed no allocation/owner reduction. Because the globally slower V8 run cannot prove a causal regression but the like-mode warmup and absolute owner both show no win, the candidate is rejected as inconclusive/no-benefit and is fully reverted. Its source/test blobs and raw profiles remain ignored negative evidence; production source and tests are unchanged.

The next safe executable packet is Task 2's red-first call-scoped dense occupancy contract. It creates no production hot-path replacement until exact mutation-sequence parity passes. Cross-turn caching, shared status-object allocation tricks, and direct topology mutation remain excluded.

### Dense occupancy source checkpoint

Task 2 is GREEN. The missing-module RED was preserved, then the stable-ordinal, eligibility, unknown-OSID, move-away/move-back/same-location, creation/removal, status/readiness/lifecycle, cross-faction, stale-write, and parity cases passed 4/4 focused tests. The index uses a `Uint32Array`, a stable strict-sorted ordinal map, and tracked formation locations. Unknown mutation targets, stale/double moves, underflow, overflow, and formation-id mismatches fail closed.

The first bounded Task 4 integration builds one dense index per `ensureMinimumSectorCoverage(...)` call from current formation locations and every selectable front OSID. It replaces eight repeated `countActiveBrigadesByOsid(...)` scans and routes the function's sole `location_osid` write through `index.move(...)` before state mutation. It does not yet introduce reachability/component caching; Task 3 is deliberately deferred until this isolated occupancy candidate is dispositioned so timing cannot conflate two optimizations.

The focused coverage/rebalance slice passed 3 files / 26 tests, TypeScript passed, and the complete sector/full-state gate passed 6 files / 46 tests in `330.16s`. That gate includes 100+ deterministic real-save variants and the three production reconciliation modes.

The candidate warmup, phase/sector profile, V8 profile, and two alternating three-pair sequences preserved the exact `5,070,902`-byte save, SHA-256 `b28225e47b8e7ba563c4e836151fc8699f3cd191f4912c6c13ac7c099719fbd5`, and state hash `b28225e47b8e7ba5`. In the authoritative fully captured replay, controls measured `1,162.403`, `1,231.142`, and `1,157.103 ms/turn`; candidates measured `1,118.922`, `1,163.315`, and `1,084.132`. Means were `1,183.549` versus `1,122.123 ms/turn` (`-5.190%`), and mean simulation improved `-5.178%`. The named `ensureMinimumSectorCoverage` owner fell `48.055%` inclusive, `buildCorpsFrontSectors` fell `8.693%`, and the three sector phases fell `10.599%`. Approved baselines passed without refresh. The occupancy-only candidate is accepted.

## Invariants that every candidate must preserve

The implementation owner must cite and test these live contracts:

- `docs/10_canon/Engine_Invariants_v0_9_0.md`: stable ordering, derived-state ownership, formation-location control, enclave connectivity, and sector-front truth;
- `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`: exact-output and scenario gates for simulation changes;
- `docs/20_engineering/DETERMINISM_AUDIT.md` and `docs/20_engineering/INVARIANTS_IN_CODE.md`: no clock, locale, filesystem order, undeclared randomness, or hidden state;
- `docs/20_engineering/CODE_CANON.md`: canonical turn pipeline and state ownership;
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`: invocation-local sector metadata reuse, map-sparseness regression, self-mutating reconciliation receipts, and real-scenario byte gates.

The observable equivalence surface is larger than the returned sector record. Compare:

- every sector and sub-segment field, array order, id, owner, edge, territory, reserve, rating, and status;
- every active formation's `location_osid`, sector/sub-segment assignment, and operational readiness;
- `unresolved_sector_brigades`, operation participants, sector ratings, front edges, and reconciliation receipts/reports;
- complete `GameState` equality and canonical `serializeState(...)` bytes;
- live-war, final-turn, and final-save-projection behavior;
- deterministic rerun hashes and approved baseline inactivity.

No optimization may teleport a formation, convert assignment into movement authority, weaken the canonical destruction/dissolution path, change strict tie order, change a threshold, omit a truth pass without a complete mutation receipt, or persist a performance context.

## Design alternatives

### Approach A — call-scoped derived context (recommended first)

Build immutable topology facts and a mutation-aware formation-location index once inside `buildCorpsFrontSectors(...)`; thread only the required read-only views into hot helpers. Use stable OSID ordinals and dense `Uint32Array` counts instead of a long-lived sparse `Map`. Every location write must go through the context's delta owner, with test-only consistency assertions against the formations record.

Advantages: bounded lifetime, no save/schema effect, attacks measured repeated scans/BFS construction, and can be introduced helper by helper behind exact legacy comparisons. Risk: missing one location write creates stale counts; the mutation owner and invariant assertion are mandatory.

### Approach B — receipt-scoped incremental topology solve (conditional second stage)

After Approach A is accepted, factor the builder into a pure topology solve and a deterministic mutation commit. Extend transient reconciliation receipts with exact dirty faction/component/front-edge/formation identities. Recompute only affected topology packets; copy untouched prior materialized sectors in canonical order; commit all formation and sector mutations in the same legacy order.

Advantages: can amortize the current `2.475` builds/turn and is capable of a larger algorithmic reduction. Risk: `buildCorpsFrontSectors(...)` writes inputs that a later call reads. A receipt kind without complete dirty identity is insufficient, and a partial solver can silently preserve stale topology.

### Approach C — whole-builder memoization, skipped passes, or parallel faction mutation (rejected)

Do not use a whole-state fingerprint/`WeakMap`, cross-turn/module cache, unconditional truth-pass skip, parallel faction builder, or approximate output check. These shapes either hide self-invalidation, share mutable formation state, alter deterministic write order, or already failed equivalence.

## Recommended architecture

### `SectorBuildDerivedContext`

Create a call-owned context in a new module only after Task 1 confirms the owner:

```ts
interface SectorBuildDerivedContext {
    readonly osidOrdinal: ReadonlyMap<Osid, number>;
    readonly occupancy: FormationOccupancyIndex;
    readonly factionTopology: ReadonlyMap<FactionId, FactionTopologyFacts>;
    sectorFacts(sector: CorpsFrontSector): SectorReachabilityFacts;
}

interface FormationOccupancyIndex {
    count(osid: Osid): number;
    move(formationId: string, from: Osid | undefined, to: Osid | undefined): void;
    assertEquivalent(formations: Readonly<Record<string, Formation>>): void;
}
```

Requirements:

- derive ordinals from the complete OSID universe sorted with `strictCompare`;
- use `Uint32Array`, not a narrow counter with an unstated maximum;
- treat unknown OSIDs explicitly and deterministically;
- build faction component IDs from the exact current friendly graph;
- precompute per-sector front membership, one-hop reserve membership, territory membership, and component facts;
- preserve the legacy traversal and tie order when a helper returns a candidate, not merely the same set;
- invalidate/rebuild sector facts after any sector geometry mutation;
- update occupancy at the same statement that changes a formation location;
- keep test assertions and profiling optional/off by default;
- never store the context or typed arrays in `GameState`, a module global, a static cache, or a cross-turn session.

### Reachability replacement rule

An unbounded friendly-territory BFS may be replaced by component equality only after a property test proves equivalence for every candidate formation/sector pair across the generated corpus. Bounded path/distance routines are not component checks; preserve hop bounds and exact target/tie order with reverse-distance tables or keep the legacy routine.

### Incremental solver rule

Approach B is eligible only after the call-scoped packet is accepted and a fresh profile still ranks repeated full builds first. Dirty identity must cover every input consumed by the topology solve:

- changed political controller OSIDs and affected faction components;
- front-edge additions/removals and both faction sides;
- formation creation/destruction/status/corps/faction/location changes;
- final-turn/final-save mode;
- any prior sector mutation that changes the next pass's input.

The solver must create a new result from stable inputs. The commit stage applies sector replacement, formation location changes, assignments, unresolved diagnostics, and ratings in legacy order. If complete dirty identity cannot be proven, recompute the full affected faction; if faction isolation cannot be proven, fall back to the full builder.

## Task 1 — Acquire the runtime lease and establish current truth

**Status:** Complete. Owner selection, exact-byte evidence, and the exact-parent measured disposition are captured; the accepted candidate floor is `1,122.123 ms/turn`.

**Files:**

- Read `src/sim/combat/corps_front_sectors.ts`
- Read `src/sim/combat/brigade_assignment.ts`
- Read `src/sim/combat/final_sector_truth_reconciliation.ts`
- Write ignored evidence under `data/derived/_debug/r5_phase2c_current_*`
- Write ignored runs under `runs_perf/r5_phase2c_current_*`
- Update `docs/40_reports/implemented/20260801_ENGINE_QUALITY_PHASE2_MEASURED_PERFORMANCE.md`

1. Obtain an explicit named exclusive runtime lease from the orchestrator after R4 releases it. Record owner, start/end, branch, full commit, Node/platform/CPU class, and the absence of concurrent scenario/perf/Electron/package/baseline work.
2. Verify a clean worktree and corrected fixed-point source. Do not time a dirty tree or an unrecorded commit.
3. Clear or uniquely rename only the exact ignored Phase 2c output targets. Never delete a broad output directory.
4. Run one excluded 40-week warmup, one phase+sector profile, one same-process V8 CPU profile, and three timed measured runs. Preserve exact commands and raw stdout/stderr in ignored files. Complete; the Task 5 exact-parent replay supplies the authoritative three-run current/candidate comparison.
5. Hash every `final_save.json`; require identical byte size, SHA-256, and final state hash across warmup/profile/V8/measured modes before using timing.
6. Rank V8 self and inclusive owners, phase owners, sector nested labels, and calls/turn. Do not sum overlapping nested timers.
7. If sector reconstruction is not the largest amortized owner, stop this design before source edits and write a new bounded plan for the actual owner.

Representative commands, run serially inside the lease from the repository root:

```powershell
git status --short --branch
git rev-parse HEAD
npx.cmd tsx tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_40w.json --unique --map --timing-json --out runs_perf/r5_phase2c_current_warmup
$env:PERF_PROFILE_SECTOR_PARTITION='true'
npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/r5_phase2c_current_sector --report data/derived/_debug/r5_phase2c_current_sector_profile.json
Remove-Item Env:\PERF_PROFILE_SECTOR_PARTITION
node.exe --cpu-prof --cpu-prof-name=r5_phase2c_current.cpuprofile --import tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/r5_phase2c_current_v8 --report data/derived/_debug/r5_phase2c_current_v8_phase.json
npx.cmd tsx tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_40w.json --unique --map --timing-json --out runs_perf/r5_phase2c_current_measured_1
npx.cmd tsx tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_40w.json --unique --map --timing-json --out runs_perf/r5_phase2c_current_measured_2
npx.cmd tsx tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_40w.json --unique --map --timing-json --out runs_perf/r5_phase2c_current_measured_3
```

Before execution, verify the current Node/tsx combination accepts the V8 invocation in a no-scenario help/syntax probe. If it does not, use the repository's live same-process V8 command and record it verbatim; do not accept a profile that contains only the parent CLI and zero application frames.

Expected result: a committee-usable current packet names one owner and preserves exact bytes. Any drift or unproven process contamination rejects the packet.

## Task 2 — Red-first formation occupancy contract

**Status:** Complete. Isolated contract, mutation-sequence parity, bounded coverage integration, and Task 5 performance disposition are GREEN/accepted.

**Files:**

- Create `src/sim/combat/sector_build_derived_context.ts`
- Create `tests/sector_build_derived_context.test.ts`
- Modify `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts`

1. Write a failing test for stable OSID ordinal construction, exact active-brigade counts, unknown OSIDs, and deterministic repeated construction.
2. Write a failing mutation-sequence property test that applies creation/status/location changes and compares the dense index to the legacy full scan after every mutation.
3. Include move-away, move-back, same-OSID, inactive/forming/destroyed, missing-location, and cross-faction cases.
4. Implement the smallest call-scoped occupancy index. Do not thread it into production hot paths yet.
5. Add a test-only `assertEquivalent(...)` and prove that underflow, double-move, or an unregistered OSID fails closed.

```powershell
npx.cmd vitest run tests/sector_build_derived_context.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
```

Expected RED: module/export missing. Expected GREEN: exact parity after every deterministic mutation sequence.

## Task 3 — Red-first reachability and sector-fact equivalence

**Status:** NEXT. The occupancy-only candidate is accepted; implement and disposition this reachability-only packet without mixing in incremental topology.

**Files:**

- Modify `src/sim/combat/sector_build_derived_context.ts`
- Modify `src/sim/combat/brigade_assignment.ts`
- Modify `tests/sector_build_derived_context.test.ts`
- Modify `tests/sector_coverage_truth_preservation.test.ts`
- Modify `tests/sector_severe_undercoverage_rebalance.test.ts`

1. Expose test-only reference decisions for `canReachSectorFront`, `claimTypeForSector`, `pickVacantLocalFrontTarget`, and `targetPreservesHomeDistance` without changing production selection.
2. Generate deterministic friendly graphs with disconnected components, enclaves, empty front sets, reserve bands, ties, and home-distance boundaries.
3. Compare reference and indexed result for every active formation × sector × candidate target, including exact chosen target and order.
4. Implement faction component facts and per-sector front/reserve/territory sets.
5. Replace only the proven unbounded reachability check first. Keep bounded distance/path logic legacy until separately proven.
6. Profile the focused helper with profiling off/on output equality. Revert an indexed helper that is slower or allocates more without a compensating whole-owner win.

```powershell
npx.cmd vitest run tests/sector_build_derived_context.test.ts tests/sector_coverage_truth_preservation.test.ts tests/sector_severe_undercoverage_rebalance.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
```

Expected result: all decisions and tie order are identical; no formation moves merely because it is assigned.

## Task 4 — Thread the context through one full build

**Status:** Bounded occupancy-only subset accepted. One index owns one `ensureMinimumSectorCoverage(...)` invocation and all of that owner's location writes; broader reachability/whole-builder topology facts remain open under Tasks 3 and 6.

**Files:**

- Modify `src/sim/combat/corps_front_sectors.ts`
- Modify `src/sim/combat/brigade_assignment.ts`
- Modify `src/sim/combat/brigade_front_distribution.ts` only if the current profile proves it shares the same valid lifetime
- Modify `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts`
- Modify `tests/final_sector_reconciliation_session.test.ts`
- Modify `tests/real_save_sector_truth_contracts.test.ts`

1. Build one context at the start of `buildCorpsFrontSectors(...)` from current formations/topology.
2. Route every in-build formation-location mutation through one adapter that updates both state and occupancy. Audit with `rg -n "location_osid\s*="` in all invoked helpers.
3. Rebuild/invalidate per-sector facts after geometry changes; never reuse facts whose sector arrays were mutated.
4. Add a test-only legacy strategy and compare optimized/reference complete state over at least 100 deterministic variants in each of live-war, final-turn, and final-save-projection modes.
5. Compare the complete observable surface listed above, not selected fields.
6. Run focused sector truth tests and TypeScript before any performance command.

```powershell
npx.cmd vitest run tests/sector_build_derived_context.test.ts tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/final_sector_reconciliation_session.test.ts tests/final_sector_truth_reconciliation.test.ts tests/final_sector_truth_reconciliation_cache.test.ts tests/real_save_sector_truth_contracts.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
```

Expected result: 300+ complete-state optimized/reference comparisons pass with exact canonical bytes.

## Task 5 — Lease-backed candidate measurement and disposition

**Status:** Complete — accepted. Fully captured exact-parent replay improved the whole-run mean `5.190%`; all byte, owner, baseline, and non-regression gates passed.

**Files:**

- Update `docs/40_reports/implemented/20260801_ENGINE_QUALITY_PHASE2_MEASURED_PERFORMANCE.md`
- Update this plan's status
- Append `docs/PROJECT_LEDGER.md`
- Update `docs/PROJECT_LEDGER_KNOWLEDGE.md` only for an accepted or clearly rejected reusable result

1. Reacquire the exclusive runtime lease.
2. Run an excluded real-scenario warmup and compare exact bytes to the Task 1 control before collecting timing. On drift, stop and find the first divergent weekly record.
3. Repeat the Task 1 current packet shape for the candidate with a unique stem.
4. Compare a same-lease, same-parent control and candidate. Preserve all six measured samples and report control/candidate mean, P50, P95, heap, owner self/inclusive time, phase time, calls/turn, bytes, SHA-256, and exact commit/command lineage.
5. Retain the packet only if exact bytes pass, the named owner materially falls, and the replicated whole-run mean does not regress outside the paired envelope. Revert an inconclusive or regressing performance-only candidate.
6. Do not refresh an approved baseline for a performance-only change.

```powershell
npm.cmd run test:baselines
npm.cmd run perf:wall-clock:report
npm.cmd run perf:profile-hotspot:report
git diff --check
```

Expected result: one accepted measured optimization or a documented rejection with production source reverted.

## Task 6 — Conditional incremental topology packet

Start only after Task 3's safer call-scoped reachability packet is dispositioned, and only if its fresh full profile still ranks repeated full sector builds first. Task 5 is accepted and the occupancy profile still ranks `buildCorpsFrontSectors` first, but that is permission to continue the bounded context work, not permission to skip directly to a larger solver.

**Files:**

- Create `src/sim/combat/sector_topology_solver.ts`
- Modify `src/sim/combat/corps_front_sectors.ts`
- Modify `src/sim/combat/final_sector_truth_reconciliation.ts`
- Modify `src/sim/turn_phases/war_phase_reconciliation_steps.ts`
- Modify `tests/final_sector_reconciliation_session.test.ts`
- Create `tests/sector_topology_solver_equivalence.test.ts`

1. Write RED tests showing current broad receipt kinds cannot identify which faction/component/front piece is dirty.
2. Define transient sorted dirty identity; do not add it to `GameState` or save schema.
3. Extract a pure full topology solve and prove it equals the current builder before adding incremental scope.
4. Add faction-level fallback first. Compare full versus faction-scoped solve across the complete state surface.
5. Add component scope only when property tests prove no cross-component owner, recovery, absorption, territory, or formation-write dependency.
6. Commit mutations in exact legacy order; when a write affects an upstream input, emit the geometry receipt and continue the bounded fixed point.
7. Repeat Task 5 measurement and disposition.

Expected result: fewer full-faction/full-builder solves per turn with exact bytes. If dirty identity expands to most factions/components in the current scenario, reject the complexity and reprofile another owner.

## Task 7 — Mandatory full-profile handoff to the next owner

**Status:** Current occupancy handoff complete. Mean remains above target, sector construction remains the largest inclusive owner, and Task 3's reachability/sector facts are next.

After every accepted sector packet:

1. Recompute the Amdahl bound from the fresh full profile.
2. If mean is above `100 ms/turn`, select the largest amortized self/inclusive owner, not the historical list.
3. Likely questions, only if the new profile confirms them:
   - political-control lookup: return a primitive/read-only status and remove per-call object allocation without changing unknown/contested semantics;
   - bot corps orders: build one bounded read-only faction decision context after sector truth is current;
   - front graph: reuse only deeply immutable canonical topology at its existing ownership boundary;
   - serialization/validation: separate diagnostic validation from required simulation work only if exact release/debug ownership is explicit.
4. Write a new red-first bounded packet for that owner and repeat current control → candidate → exact bytes → replicated timing.

R5 Phase 2 is complete only when a committee-usable replicated packet records mean `<100 ms/turn` with exact deterministic output. A large local percentage or one fast run is not completion.

## Rejected shortcuts and retry conditions

| Shortcut | Disposition | Retry only if |
|---|---|---|
| Whole-state fingerprint or module `WeakMap` | Rejected: the builder mutates its own next input and hidden invalidation already failed ownership review. | Never in this shape. |
| Cross-turn mutable topology/formation cache | Rejected: stale state, ordering, and persistence risk. | A new explicit immutable ownership boundary and full invalidation proof exist. |
| Unconditional final seal/pass skip | Rejected: variant seed 27 diverged to 20 versus 8 sectors. | Complete producer mutation receipts and full-mode property proof justify a specific conditional skip. |
| Fixed point gated only on recovery | Rejected: ghost pruning can mutate independently. | Already corrected to consume both receipts. |
| Naive long-lived `Map` hoist for floor completion | Rejected: byte-identical but regressed roughly `696 -> 907 ms` in confirmation runs as the mutated map grew sparse. | A different dense/delta structure wins a current profile. |
| Recompute recovery setup between recovery passes | Rejected: formation-location mutation changes inputs inside the invocation. | An explicit mutation-aware context proves equivalent setup updates. |
| Parallel faction construction | Rejected: factions share formation-location and deterministic commit state. | A pure solve/serial commit split proves all solve inputs immutable and outputs independent. |
| Threshold/rule simplification | Rejected: changes gameplay rather than compute. | A separately authorized design/canon change, never a performance claim. |
| Hash-only or selected-field equivalence | Rejected: can miss mutated assignments/receipts and output fields. | Never; retain complete-state and byte comparisons. |
| Performance baseline re-floor | Rejected: conceals an unexplained regression. | Never for a performance-only change. |

## Completion checklist

- [x] Fresh corrected-source current profile captured under the exclusive lease.
- [x] Exact commands/raw output/commit/machine/process envelope retained.
- [x] One excluded warmup, one phase+sector profile, one application V8 profile, and three measured runs captured.
- [x] All profile/mode final saves are byte-identical.
- [x] Current profile, not historical rank, selects each implementation owner.
- [x] Red-first helper and complete-state equivalence tests pass.
- [x] Context is invocation-local, mutation-aware, stable-order, and absent from `GameState`.
- [x] No skipped pass lacks a complete mutation receipt.
- [x] Same-parent replicated candidate improves its named owner and does not regress whole-run throughput.
- [x] Rejected candidates are fully reverted and recorded.
- [x] Fresh Amdahl calculation and next-owner handoff exist while mean remains above `100 ms/turn`.
- [x] Ledger, report, roadmap, and reusable knowledge state exactly match evidence.
- [x] No baseline refresh, package/version/tag/release mutation, canon/FORAWWV edit, push, or integration was performed by this design packet.
- [ ] R5 replicated mean is below `100 ms/turn`; continue with Task 3 and reprofile.
