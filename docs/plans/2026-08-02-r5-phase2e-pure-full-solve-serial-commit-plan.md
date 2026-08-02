# R5 Phase 2e Pure Full-Solve / Serial-Commit Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract the complete current corps-sector build into a referentially transparent full solve over an explicit snapshot, then apply its exact ordered mutations through one prevalidated serial commit without changing sectors, state, reconciliation receipts, diagnostics, saves, or Task 8A behavior.

**Architecture:** Capture every current builder input into a typed immutable `SectorTopologySolveInput`, execute the unchanged faction/global/fixed-point sequence against a detached mutable working projection, and record every live-state write in an ordered mutation journal. Validate the whole journal against current state before applying any entry, then replay it in legacy order and return the solved sectors so `runFullGeometryReconciliation(...)` retains its existing installation, sub-segment, rating, and receipt ownership.

**Tech Stack:** TypeScript, Vitest, fast-check-style deterministic generated fixtures already used by the sector suites, canonical `serializeState(...)`, Node/V8 CPU profiling, phase/sector instrumentation, and the 40-week scenario runner.

---

**Date:** 2026-08-02

**Status:** DESIGN COMPLETE / IMPLEMENTATION NOT STARTED

**Owner lane:** R5 Phase 2e, engine quality/performance/stability

**Related command-board row:** R5

**Design base:** `0fd36157bd7b92241ac48b8a9e4d94d69f8d2141`

**Current next action:** Task 1, capture the current imperative writer sequence with RED characterization before extracting any production body.

**Collision rule:** This packet owns the sector-builder and final-sector test surfaces listed below. It must not overlap another branch changing `corps_front_sectors.ts`, `brigade_assignment.ts`, `final_sector_truth_reconciliation.ts`, the real-save sector oracle, or the Phase 2 performance report.
**Runtime rule:** Scenario, baseline, V8, wall-clock, Electron, and package commands require the orchestrator's named exclusive runtime lease. Fast focused tests, TypeScript, static determinism checks, and documentation checks do not.

## 1. Status, authority, and prerequisite result

Task 8A is retained at integrated commit `0fd36157b`. Its exact-parent packet passes all predeclared gates:

- integrated candidate `0fd36157bd7b92241ac48b8a9e4d94d69f8d2141`, candidate tree `c92a6a05956bf42a24afd762f5c6815ad65c7d1f`;
- exact parent/control `5987daea518501745bc94be3939589ea5e767c23`, control tree `bf71a0240b010a080824958277e9ce933c3c402e`;
- authoritative manifest `data/derived/_debug/r5_phase2d_task8a_integrated/measurement_manifest.json`, SHA-256 `50b78332ebae96f4dd767da61c89e398c1bead91a246e1a945d657b36cea138d`, disposition `PASS_RETAIN`;

- all 14 final saves are exactly `5,085,892` bytes with SHA-256 `9d2a59dc1097ff3b69d3cec2d19962af32b7199de9f0b311d1dea4c562a596b4`;
- combined adjacency inclusive time falls `81.610253%`;
- `buildCorpsFrontSectors` inclusive time falls `7.075305%` in the paired V8 comparison;
- two of three wall-clock pairs improve, median pair improvement is `2.599063%`, maximum regression is `1.766058%`, and mean improves from `1,106.025` to `1,086.311 ms/turn` (`1.782383%`);
- unexpected canonical relation fallbacks remain zero;
- the retained fresh profile still ranks `buildCorpsFrontSectors` first at `11,834.649 ms` inclusive, `295.866 ms/turn`, and `26.2249%` of sampled application time.

The Task 8A memory movement is a watch item, not a hidden success: phase-boundary sampled peak heap rises from `215.046 MB` in the exact-parent control profile to `291.752 MB` in the candidate profile; the retained fresh owner profile samples `281.242 MB`. Phase 2e therefore has a hard memory ceiling in addition to exact-output and throughput non-regression gates.

This document authorizes only enabling extraction. It does **not** authorize incremental reuse, dirty-component solves, cross-call caching, parallel faction execution, a new reconciliation receipt, a pass skip, or Task 6. Task 6 remains closed until the exact authorization gate in section 11 passes after Phase 2e acceptance.

## 2. Governing contracts and required reading

Read these files before editing:

1. `docs/10_canon/Engine_Invariants_v0_9_0.md` sections 1, 11.1-11.4, 13.1-13.2, 14.2, and 14.4: deterministic handling, stable order, recomputation, and physical `location_osid` truth.
2. `docs/20_engineering/CODE_CANON.md`, especially Determinism Contract and Canonical Turn Pipelines: no new entrypoint and byte-identical output from identical input.
3. `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`, especially stable ordering and byte-identical reruns.
4. `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`, war-phase owner and pre-commit checklist.
5. `docs/20_engineering/REPO_MAP.md`, canonical war pipeline and scenario harness.
6. `docs/20_engineering/ADR/ADR-0006-sectors-as-standing-operational-groups.md`, Persistence Contract: `corps_front_sectors` is a persisted current-turn snapshot and rebuilding it can relocate formations.
7. `docs/plans/2026-08-01-r5-phase2c-amortized-sector-topology-plan.md`, especially Tasks 6-8 and rejected shortcuts.
8. `docs/40_reports/implemented/20260801_ENGINE_QUALITY_PHASE2_MEASURED_PERFORMANCE.md` and `data/derived/_debug/r5_phase2d_task8a_integrated/measurement_manifest.json`.
9. `src/sim/combat/corps_front_sectors.ts`, `brigade_assignment.ts`, `sector_territory.ts`, `sector_building.ts`, `sector_splitting.ts`, `commander_override.ts`, `bot_strategy.ts`, `officer_system.ts`, `final_sector_truth_reconciliation.ts`, and `src/sim/turn_phases/war_phase_reconciliation_steps.ts`.
10. `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts`, `tests/final_sector_reconciliation_session.test.ts`, `tests/final_sector_truth_reconciliation.test.ts`, and `tests/real_save_sector_truth_contracts.test.ts`.

The determinism skill's `docs/PHASE_A_INVARIANTS.md` reference is stale at this revision; that file does not exist. Do not invent it. The live authority is the set above.

### Architecture assessment

- `CODE_CANON.md` makes `src/sim/turn_pipeline.ts` the sole war runtime and forbids shadow entrypoints. Phase 2e therefore remains an internal builder extraction called by the existing reconciliation owner.
- `ADR-0006` explicitly says sector rebuilding can relocate formations and is not an observational cache rebuild. A delayed commit is safe only if the detached solver observes each local write at the exact point the legacy builder would have written live state.
- Engine Invariants sections 11.3 and 14.2 require stable `strictCompare` ordering for sector construction and brigade operations. Every snapshot collection, journal, diagnostic, and commit traversal therefore has an explicit stable order; no `Object.values` or `Map` iteration may become output-significant without a preceding sort or preserved legacy insertion contract.
- Engine Invariants sections 13.1-13.2 do not permit a new persisted cache. The solve snapshot, working projection, Task 8A relation, dense occupancy, and mutation journal are invocation-local and absent from `GameState` and serialization.
- `DETERMINISM_TEST_MATRIX.md` requires byte-identical reruns. Hash-only comparison is insufficient here because the changed boundary includes reports, sessions, receipts, mutation order, warnings, and direct state writes.

## 3. Purpose and non-goals

### Purpose

Create a narrow architecture boundary with three explicit owners:

1. `captureSectorTopologySolveInput(...)` owns a complete immutable read snapshot.
2. `solveCorpsFrontSectorsPure(...)` owns the full current topology algorithm over detached working state and returns sectors, ordered mutations, deterministic diagnostics, and deterministic instrumentation counters.
3. `commitSectorTopologySolve(...)` owns preflight validation and serial live-state replay.

The production wrapper remains `buildCorpsFrontSectors(...)`. Its default becomes:

```ts
const input = captureSectorTopologySolveInput(state, edges, reverseMap, centroids, spatial, options);
const output = solveCorpsFrontSectorsPure(input);
commitSectorTopologySolve(state, output);
return output.sectors;
```

`runFullGeometryReconciliation(...)` remains unchanged in ownership: it snapshots active locations, calls the builder, installs `state.military.corps_front_sectors`, assigns sub-segments, clears stale ownership, computes ratings, and reports final active-location deltas.

### Non-goals

- No incremental/faction/component solve, dirty identity, cross-call reuse, memoized prior output, `WeakMap`, or module cache.
- No parallel faction execution. Later factions and recovery must see earlier local location writes in exact order.
- No change to Task 8A relation construction/query/fallback behavior, its explicit `test-only-legacy-edge-adjacency` oracle, or dense occupancy.
- No topology rule, threshold, pass count, fixed-point receipt, sector ID, warning text, or gameplay change.
- No save schema, migration, baseline refresh, scenario authoring, UI, Electron, package, version, tag, signing, publication, or release-state change.
- No canon edit and no edit to `docs/10_canon/FORAWWV.md`.
- No claim that the extraction improves performance. It is accepted only if it is exact, bounded in memory, and non-regressing enough to serve as enabling architecture.

## 4. Approaches considered

| Approach | Disposition | Reason |
|---|---|---|
| Explicit typed snapshot + detached working projection + serial journal commit | **Selected** | Makes every read/write reviewable, lets later solve stages see prior local writes, keeps live state unchanged until validation succeeds, and creates the only safe future boundary for incremental research. |
| Clone the complete `GameState`, run the current builder on the clone, then diff | Rejected | Copies unrelated state, worsens the observed Task 8A heap risk, hides the true read contract, produces an unordered semantic diff instead of the exact write sequence, and can silently acquire new inputs. |
| Solve each faction independently or in parallel and merge | Rejected | Current strict-sorted faction construction reads all formations; coverage can relocate a formation before later factions and recovery read it. Independent solves would change behavior before any incremental work begins. |
| Keep direct state mutation and expose a nominal `solve` wrapper | Rejected | Does not create a pure boundary and cannot prove that the caller can defer live writes safely. |

## 5. Current call graph and exact write order

The accepted 40-week profile records 99 builds:

| Caller | Calls | Ownership |
|---|---:|---|
| Scenario startup projection | 1 | `scenario_runner.ts` direct build before turn 1. |
| Pre-combat sector partition | 40 | `war_phases.ts` direct build once per turn. |
| First post-combat reconciliation | 40 | `runFullGeometryReconciliation(...)`. |
| Location-writeback fixed points | 17 | Session geometry receipt after a build changes active locations. |
| Final-save projection | 1 | New reconciliation session with `finalSaveGeometryProjection`. |

Within one build, the observable order is:

1. validate strategies and early-return conditions;
2. build/reuse graph views, edge metadata, Task 8A relations, sorted formation IDs, and pre-recovery setup;
3. for factions in `strictCompare` order, build sectors and immediately expose local coverage writes to later faction reads;
4. run the existing global merge, repair, canonicalization, five seal passes, conditional convergence, recovery, owner-truth, side-coverage, absorption, final-save projection, and metric sequence exactly as written;
5. for each formation ID in stable order, conditionally clear a sector assignment and then unconditionally clear its sub-segment field; afterward traverse sectors in stable order and each authored assigned/reserve/rear brigade list in its existing order to set assignments;
6. set `state.military.unresolved_sector_brigades`;
7. emit ordered final unresolved warnings only when `isFinalPass`;
8. flush optional performance diagnostics and return sectors;
9. the reconciliation caller installs sectors, assigns sub-segments, clears stale sub-segment ownership, computes ratings, and records the final location delta.

The solver must update its detached working formation projection at steps 3-5. The serial commit is delayed relative to live state, not relative to the algorithm's own reads.

## 6. Complete builder input inventory

The following table is the Phase 2e read allow-list. A static test must fail if the solver path reads a `GameState` field not represented here.

| Input family | Current reads | Snapshot field and capture rule |
|---|---|---|
| Invocation modes | `isFinalPass`, `finalSaveGeometryProjection`, fixed-point strategy, dense/legacy occupancy strategy, Task 8A relation strategy/counters | `options`; validate enum values before reading state; counters remain test-only and outside deterministic output. |
| Turn/mode | `meta.turn`, `meta.decision_mode` | Scalars `turn`, `decisionMode`. |
| Factions | `state.factions[].id` | `factionIds`, copied and `strictCompare` sorted. |
| Front truth | `military.war_front_edges_osid` with `edge_id`, `a`, `b`, `side_a`, `side_b` | Deep-copied ordered front-edge rows; preserve the existing array as semantic source and use explicit sorts at current sorted consumers. |
| Operational graph | `edges` fields used by OSID/shared-boundary/Case-B adjacency; optional `reverseMap`; optional centroids | Deep-copied/frozen `edges`, strict-key `reverseMapEntries` with copied SID arrays, and strict-key centroid entries. Do not retain mutable caller maps. |
| Spatial snapshot | adjacency, shared-boundary adjacency, friendly OSIDs by faction, components by faction; phase/turn only for provenance | Deep-copied sorted entry arrays rebuilt into invocation-local read-only maps/sets. If no `SpatialContext` exists, capture the exact fallback products from `edges` and political control. |
| Political control | `political.political_controllers` directly and through `getPoliticalControllerOSID(...)` | Strict-key record copy `politicalControllers`; preserve `null`/`undefined` distinction where the current lookup does. |
| Cold-front exception | `political.graz_east_herzegovina_active_turn` | Scalar/null snapshot. |
| Emergent commander priority | `political.control_events`, `political.last_supply_state_by_osid`, and `military.campaign_plans` when `decision_mode === 'emergent'` | Deep-copied arrays/records with existing event order preserved; strict-key records; only fields read by `getCorpsArmyPriorities(...)`. |
| Formation identity/lifecycle | record key, `id`, `faction`, `status`, `kind`, `readiness`, `lifecycle_status`, `tags`, `corps_id` | One strict-ID ordered `SectorTopologyFormation` record. Preserve `undefined` defaults exactly. |
| Formation geography | `location_osid`, `home_osid`, `hq_osid`, `hq_sid` | Same formation projection; these fields must be locally mutable only where listed in section 7. |
| Formation strength | `personnel`, `personnel_lent_by_tg`, `cohesion`, `experience`, `honor` | Same projection; required by enemy totals and `computeLocalFrontDefensivePower(...)`. |
| Formation assignment/eligibility | `assignment`, `assigned_sub_segment_id`, `posture`, `disrupted`, `disrupted_turns`, `stranded_status` | Same projection; deep-copy assignment objects. |
| Elite/enclave movement | `elite_loan_state.on_loan`, `loaned_to_corps`, `loan_start_turn`; faction/home/origin inference used by enclave guard | Minimal deep copy of the named loan fields plus the formation geography above. |
| Movement ownership | `military.brigade_movement_orders`, `military.brigade_movement_state`, `military.brigade_posture_orders` | Strict-key/deep copies; posture order array order preserved. |
| Player sector direction | `military.brigade_sector_override` | Strict-key deep copy. |
| Corps/operation truth | `military.corps_command`: directive priority, active-operation id/type/phase/sector/preparation subphase, participants, axes/objectives | Strict-key command record with active operation array order and participant/objective array order preserved. |
| Officer profile | `military.named_officers`, `military.named_officer_data` fields used by `getCorpsCommander(...)` | Strict-key officer state and authored officer-data array copy; no lookup may fall through to live state. |
| Static doctrine | faction priority tables, constants, enclave definitions, corps exclusions | Module-owned immutable data; list in solver imports and pin by existing focused tests. Not copied into `GameState` or output. |

Implementation note: change `getCorpsArmyPriorities(...)`, `buildCorpsCommanderProfiles(...)`, and the sector-specific political-controller fallback to accept narrow read interfaces. Do not manufacture a partial object and cast it to `GameState`.

## 7. Complete builder output and mutation inventory

### 7.1 Pure output

```ts
export interface SectorTopologySolveOutput {
    readonly sectors: Readonly<Record<string, CorpsFrontSector>>;
    readonly mutations: readonly SectorTopologyMutation[];
    readonly diagnostics: readonly SectorTopologyDiagnostic[];
    readonly trace: SectorTopologyDeterministicTrace;
}
```

`sectors` contains every current `CorpsFrontSector`/sub-segment field: IDs, owner/faction/opponents, edge and territory lists, assigned/reserve/rear lists, unstaffed flag, density/threat/power, stance/source, optional must-hold/display fields when current logic supplies them, and all sub-segment fields. Sector-local intermediate writes remain inside detached solve state and are represented by final sectors plus deterministic phase trace; they never touch `GameState` during solve.

### 7.2 Ordered live-state mutation journal

The journal is an append-only array in execution order. It has no timestamps and no generated IDs. Each row contains `sequence` equal to its zero-based index, exact before/after values, and the current deterministic stage label.

```ts
export type SectorTopologyMutation =
    | { sequence: number; stage: string; kind: 'formation-location'; formationId: FormationId; before: string | undefined; after: string }
    | { sequence: number; stage: string; kind: 'formation-entrenchment'; formationId: FormationId; before: number | undefined; after: 0 }
    | { sequence: number; stage: string; kind: 'formation-assigned-sub-segment'; formationId: FormationId; before: string | undefined; after: string | undefined }
    | { sequence: number; stage: string; kind: 'formation-assignment'; formationId: FormationId; before: FormationAssignment | null; after: FormationAssignment | null }
    | { sequence: number; stage: string; kind: 'unresolved-sector-brigades'; before: readonly FormationId[] | undefined; after: readonly FormationId[] };
```

Required writer mapping:

| Current writer | Journal requirement |
|---|---|
| `ensureMinimumSectorCoverage(...)` | Update detached dense occupancy first, then append/apply the location row, then append/apply the entrenchment row. This reproduces current `activeCounts.move(...)`, `formation.location_osid = target`, `formation.entrenchment_turns = 0` order. |
| Builder reachability-demotion paths | Append every `assigned_sub_segment_id = undefined` assignment at its current point, including value-preserving writes if the legacy statement executes. The separate operation-sensitive roster reconciliation stays outside this extraction and retains its current owner. |
| `syncSectorAssignmentsToFormations(...)` | For each stable formation ID, append a conditional sector-assignment clear followed immediately by the unconditional sub-segment clear; then append assignment sets in stable sector order and existing assigned/reserve/rear list order. Do not batch the two clear kinds into separate traversals. |
| Final unresolved collection | Append one unresolved-list replacement after assignment synchronization and before warnings. |

No other live-state write is allowed inside the builder. A static test scans the complete reachable solver surface for direct assignments to `GameState` or source formations. If a new writer is discovered, stop and extend the union, snapshot, oracle, and documentation before continuing.

### 7.3 Diagnostics and instrumentation

- Final unresolved warnings become deterministic `SectorTopologyDiagnostic` rows during solve and are emitted only by commit after the unresolved-list mutation.
- Debug/warn/error text and order must equal the imperative oracle byte-for-byte.
- Task 8A relation counters and dense occupancy remain invocation-local.
- Wall-clock timing remains an observational shell. The pure core receives no clock or environment. An optional outer stage runner may time named pure stages only when `PERF_PROFILE_SECTOR_PARTITION=true`; on/off runs must produce identical output, journal, state, warnings, bytes, and deterministic trace.
- The trace contains only stable counts/order labels, never durations.

### 7.4 Commit atomicity

`commitSectorTopologySolve(...)` has two passes:

1. Validation replays the journal into a tiny shadow of only the target fields, checking every `before` value and sequence without mutating live state. It also checks that live turn and front-edge fingerprint still match input provenance.
2. Only after complete validation succeeds, apply every row to live state in sequence, emit diagnostics at their declared boundary, and return.

Any stale precondition throws before the first live write. Do not catch and fall back after a partial commit. A stale commit may rerun the complete capture/solve once only at the caller's explicit same-invocation boundary; production should not normally need this because build/commit is synchronous.

## 8. File ownership and collision map

### Create

- `src/sim/combat/sector_topology_solver_types.ts` — narrow read types, output, mutation and diagnostic unions.
- `src/sim/combat/sector_topology_snapshot.ts` — complete deterministic capture and provenance fingerprint.
- `src/sim/combat/sector_topology_mutation_journal.ts` — detached writer port, preflight validator, serial commit.
- `src/sim/combat/sector_topology_solver.ts` — full extracted core and detached working projection.
- `tests/sector_topology_snapshot.test.ts`.
- `tests/sector_topology_mutation_journal.test.ts`.
- `tests/sector_topology_solver_equivalence.test.ts`.
- `tools/perf/sector_topology_exact_parent_oracle.ts` — committed control/candidate artifact comparator for the exact-parent external oracle.
- `docs/40_reports/implemented/<date>_R5_PHASE2E_PURE_SOLVE_SERIAL_COMMIT.md` at source checkpoint/measurement disposition.

### Modify

- `src/sim/combat/corps_front_sectors.ts` — production wrapper, extracted core ownership, explicit test-only execution strategy, stage labels.
- `src/sim/combat/brigade_assignment.ts` — writer port for location/entrenchment/assignment/sub-segment writes; narrow read context.
- `src/sim/combat/sector_territory.ts` and `sector_building.ts` — narrow political/formation reads; no full-state cast.
- `src/sim/combat/commander_override.ts`, `bot_strategy.ts`, and `officer_system.ts` — narrow topology-specific read interfaces without changing other callers.
- `src/sim/combat/final_sector_truth_reconciliation.ts` only to thread the explicit test strategy/hooks through the existing reconciliation seam; do not change receipt logic or production call order.
- `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts` — three-mode x 100 candidate/legacy/rerun matrix.
- `tests/final_sector_reconciliation_session.test.ts`, `tests/final_sector_truth_reconciliation.test.ts`, `tests/real_save_sector_truth_contracts.test.ts`, and `tests/sector_partition_instrumentation.test.ts`.
- `docs/plans/2026-08-01-r5-phase2c-amortized-sector-topology-plan.md`, this plan, `MASTER_ROADMAP.md`, `COMMAND_BOARD.md`, `PROJECT_LEDGER.md`, `PROJECT_LEDGER_KNOWLEDGE.md`, and report indices at checkpoint/disposition.

### Must not modify

- `docs/10_canon/FORAWWV.md` or any canon file.
- `src/sim/turn_pipeline.ts`, `war_phases.ts`, or `war_phase_reconciliation_steps.ts` unless a discovered contradiction makes the design invalid; stop instead of changing the pipeline.
- GameState/schema/serializer/migration files.
- Scenarios, approved baselines, package/version/release configuration, or UI.

## 9. Task sequence

Each task is one commit. Do not combine extraction, oracle repair, and measurement in one commit.

### Task 1: RED characterization of the imperative boundary

**Files:**

- Create `tests/sector_topology_mutation_journal.test.ts`.
- Modify `src/sim/combat/corps_front_sectors.ts` only for test-visible writer tracing after RED.
- Modify `src/sim/combat/brigade_assignment.ts` only for test-visible writer tracing after RED.

1. Write a failing test importing `createSectorTopologyMutationRecorder` and requesting `test-only-imperative-live-state` execution.
2. Pin one fixture that moves a formation and require exact location then entrenchment row order.
3. Pin demotion/sub-segment clears, assignment clear/set order, unresolved replacement, and warning order.
4. Pin unknown execution strategy rejection before state inspection.
5. Run RED; expected failure is missing module/export/strategy.
6. Add the smallest writer port around current direct writes without moving algorithm stages.
7. Run GREEN and typecheck.

```powershell
node_modules\.bin\vitest.cmd run tests/sector_topology_mutation_journal.test.ts tests/sector_partition_instrumentation.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
git diff --check
```

**Stop:** Any live writer cannot be represented by the section 7 union, or tracing changes bytes/diagnostics. Update the design before extraction.

**Commit:** `test(sectors): characterize topology mutation order`

### Task 2: RED complete immutable snapshot

**Files:**

- Create `src/sim/combat/sector_topology_solver_types.ts`.
- Create `src/sim/combat/sector_topology_snapshot.ts`.
- Create `tests/sector_topology_snapshot.test.ts`.
- Modify narrow-reader files listed in section 8 only after RED.

1. Write a failing test for `captureSectorTopologySolveInput(...)` over the pristine real save.
2. Assert the exact allow-list families in section 6, strict ID/key order, preserved authored array order, and no retained caller `Map`, `Set`, array, object, formation, operation, officer, or assignment identity.
3. Deep-freeze the output and prove read helpers can consume it.
4. Mutate the source state after capture and prove the snapshot is unchanged.
5. Add a static full-state-read inventory test: every `state.*` access reachable from the solver must map to one declared snapshot family.
6. Refactor political-controller, commander, priority, and officer readers to narrow interfaces. Do not cast a partial object to `GameState`.

```powershell
node_modules\.bin\vitest.cmd run tests/sector_topology_snapshot.test.ts tests/commander_driven_brigade_assignment.test.ts tests/sector_power_threat_recompute.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
git diff --check
```

**Stop:** A reader needs state outside section 6. Extend and review the inventory explicitly; never reach back to live state from solve.

**Commit:** `refactor(sectors): capture explicit topology solve input`

### Task 3: RED pure full solve on detached working state

**Files:**

- Create `src/sim/combat/sector_topology_solver.ts`.
- Create `tests/sector_topology_solver_equivalence.test.ts`.
- Modify `corps_front_sectors.ts`, `brigade_assignment.ts`, `sector_territory.ts`, `sector_building.ts`, `commander_override.ts`, `bot_strategy.ts`, and `officer_system.ts`.

1. Write a failing test importing `solveCorpsFrontSectorsPure(...)`.
2. Deep-freeze the input; require solve to complete without mutation.
3. Compare its sectors, mutation journal, diagnostics, and trace to `test-only-imperative-live-state` on targeted no-move, one-move, multi-pass recovery, demotion, final-pass-warning, and final-save-projection fixtures.
4. Extract the orchestrator in existing statement order. Use one detached formation projection and update it synchronously through the writer port.
5. Preserve Task 8A relation provider, synthetic fallback receipts, dense occupancy, recovered-front setup lifetime, all fixed-point conditions, and every current stable sort/tie-break.
6. Add a static guard forbidding direct live-state mutation or `GameState` access in the pure solver.

```powershell
node_modules\.bin\vitest.cmd run tests/sector_topology_solver_equivalence.test.ts tests/sector_front_edge_relation.test.ts tests/sector_topology_mutation_journal.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
node_modules\.bin\vitest.cmd run tests/determinism_static_scan_r1_5.test.ts --pool=forks --reporter=dot
git diff --check
```

**Stop:** Any reordering is needed to make extraction convenient. Preserve the old order or reject the shape.

**Commit:** `refactor(sectors): extract pure full topology solve`

### Task 4: RED atomic serial commit

**Files:**

- Create `src/sim/combat/sector_topology_mutation_journal.ts` if not created in Task 1; otherwise complete it.
- Modify `src/sim/combat/corps_front_sectors.ts`.
- Extend `tests/sector_topology_mutation_journal.test.ts`.

1. Write failing tests for stale turn, changed front-edge provenance, first-row stale value, later repeated-write stale value, malformed sequence, unknown kind, and target formation missing.
2. Prove every failure occurs before any live write or diagnostic emission.
3. Prove a valid commit applies exact rows in sequence and emits exact warning order after unresolved truth.
4. Add deterministic rerun proof: fresh capture + solve + commit on identical clones yields identical journals, state, and bytes.
5. Make pure-solve/serial-commit the production default; keep `test-only-imperative-live-state` explicit and inaccessible through ordinary callers.

```powershell
node_modules\.bin\vitest.cmd run tests/sector_topology_mutation_journal.test.ts tests/sector_topology_solver_equivalence.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
git diff --check
```

**Commit:** `refactor(sectors): commit topology solve serially`

### Task 5: RED full reconciliation oracle, three modes x 100

**Files:**

- Modify `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts`.
- Modify `tests/final_sector_reconciliation_session.test.ts` and `tests/final_sector_truth_reconciliation.test.ts`.
- Create `tools/perf/sector_topology_exact_parent_oracle.ts`.

For each of 100 deterministic real-save variants in each mode:

- live war: `isFinalPass=false`, `finalSaveGeometryProjection=false`;
- final turn: `true`, `false`;
- final-save projection: `false`, `true`.

Compare candidate, explicit imperative legacy, and candidate rerun across:

1. complete returned/installed sectors and sub-segments;
2. complete `GameState` after reconciliation;
3. full reconciliation report;
4. complete session, pending/consumed receipts, `last_report`, and exact receipt sequence;
5. explicit candidate/legacy mutation journal including every sequence/stage/before/after row;
6. `geometry_builds` sequence and active-location mutation count, including variants that exercise the extra fixed point;
7. warnings, debug, log, error, and Task 8A construction/query/fallback diagnostics;
8. canonical serialized bytes, size, SHA-256, and deterministic rerun SHA;
9. solve input unchanged before/after;
10. relation and dense-occupancy strategy contracts.

First run the property with an intentionally omitted commit row and preserve the expected RED mismatch. Then repair and run GREEN. The committed exact-parent oracle tool must also be able to compare candidate artifacts with control artifacts generated from `0fd36157b` in a separate worktree; use this in Task 8, not during the fast lane.

```powershell
node_modules\.bin\vitest.cmd run tests/sector_partition_buildCorpsFrontSectors_integration.test.ts -t "pure full solve and serial commit preserve reports, sessions, receipts, mutation order, geometry order, sectors, full state, diagnostics, bytes, and rerun hashes across production modes and 100 real-save variants" --pool=forks --reporter=dot
```

**Stop:** Do not reduce the case count or comparison surface. Improve fixture setup or shard deterministic cases while retaining all 300.

**Commit:** `test(sectors): prove pure solve reconciliation equivalence`

### Task 6: Fast dependent gates and independent review

Run serially without a heavy runtime lease:

```powershell
node_modules\.bin\vitest.cmd run tests/sector_topology_snapshot.test.ts tests/sector_topology_mutation_journal.test.ts tests/sector_topology_solver_equivalence.test.ts tests/sector_front_edge_relation.test.ts tests/sector_partition_instrumentation.test.ts tests/final_sector_reconciliation_session.test.ts tests/final_sector_truth_reconciliation.test.ts tests/real_save_sector_truth_contracts.test.ts tests/sector_territory_contiguity_repair.test.ts tests/sector_power_threat_recompute.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
node_modules\.bin\vitest.cmd run tests/determinism_static_scan_r1_5.test.ts --pool=forks --reporter=dot
git diff --check
```

Independent Technical Architect, Systems/Determinism, and Performance reviewers must each return PASS. Review must explicitly inspect:

- complete input allow-list;
- no partial-`GameState` cast;
- pure input non-mutation;
- local write visibility across factions/recovery;
- journal completeness/order and atomic preflight;
- Task 8A relation/dense occupancy preservation;
- no incremental reuse or Task 6 implementation;
- memory design (no whole-state clone, no sector snapshots per journal row, primitive journal rows only).

Repair findings red-first and rerun affected gates.

**Commit:** `docs(r5): checkpoint pure solve source proof`

### Task 7: Approved baselines without refresh

Acquire the exclusive runtime lease. Verify clean branch/commit, exact Node/platform, no other AWWV heavy process, and absolute script paths. Run:

```powershell
npm.cmd run test:baselines
```

Expected: all approved scenarios match with no refresh. Any drift stops measurement. Find the first weekly/state/journal divergence; do not update a manifest for an enabling refactor.

### Task 8: Exact-parent functional and measurement packet

Use two clean worktrees:

- control detached at exact parent `0fd36157bd7b92241ac48b8a9e4d94d69f8d2141`;
- candidate at the reviewed Phase 2e source commit.

Record cwd, branch/detached status, commit, parent, tree, Node/tsx/OS/CPU/RAM, process preflight, exact commands, exit codes, raw stdout/stderr, and SHA-256 for every artifact in one ignored manifest. Run serially under one uninterrupted lease:

1. exact-parent 3 modes x 100 external oracle artifacts for control and candidate;
2. one excluded warmup per lineage;
3. one phase+sector profile per lineage;
4. one same-process application V8 profile per lineage;
5. three alternating wall-clock pairs in order `control1, candidate1, control2, candidate2, control3, candidate3`;
6. one retained-candidate fresh phase profile and one fresh V8 owner profile only after retention gates pass.

Do not run Electron, package, or any baseline refresh in this lane.

### Task 9: Retain or revert

Phase 2e is retained only if every gate passes:

| Gate | Threshold |
|---|---|
| Functional exactness | All 300 in-process and 300 exact-parent external comparisons exact across every section 9 Task 5 surface. |
| Journal | Candidate and imperative legacy journal sequences exact; commit preflight atomic; no unjournaled live write. |
| Determinism | Every valid run has exact bytes/SHA; candidate rerun exact; static scan green. |
| Baselines | All approved baselines pass without refresh. |
| Whole-run timing | At least two of three candidate pairs no slower; median paired regression no worse than `1.0%`; no pair regresses more than `2.0%`. Improvement is welcome but not required. |
| Builder timing | `buildCorpsFrontSectors` inclusive time does not regress more than `3.0%` against exact-parent control. |
| Heap ceiling | Candidate phase-boundary sampled peak heap is at most both `300.000 MB` and `105%` of the exact-parent retained-fresh control measured in the same packet. Using current evidence, the latter reference is `295.304 MB`; recompute from the actual control and apply the lower threshold. |
| RSS ceiling | Candidate RSS is at most both `512.000 MB` and `110%` of same-packet control. |
| Journal allocation | Journal contains primitive/scalar rows plus copied assignment/list payloads only; no `GameState`, sector record, graph map, operation, or formation object identity; report maximum rows and serialized bytes per invocation. |
| Runtime ownership | No overlapping AWWV heavy process and no invalid lineage. |

If any exactness, journal, baseline, atomicity, or memory gate fails, reject and revert the production default/extraction. If only timing is noisy within the stop bounds, repeat one complete alternating three-pair packet once; do not cherry-pick favorable samples. If the repeat still fails, reject. Preserve the characterization tests and a no-go report only if they remain useful without dead production seams.

**Retained commit:** `perf(sectors): separate pure topology solve from serial commit`

**Rejected commit:** revert production/candidate-only code, then `docs(r5): record pure solve extraction no-go`

### Task 10: Documentation and handoff

For either disposition:

- update this plan and `docs/plans/2026-08-01-r5-phase2c-amortized-sector-topology-plan.md`;
- update `MASTER_ROADMAP.md` and `COMMAND_BOARD.md` only with measured truth;
- append a formal `PROJECT_LEDGER.md` entry;
- add a reusable lesson to `PROJECT_LEDGER_KNOWLEDGE.md` only if accepted or if the no-go establishes a durable boundary;
- write the implementation report and update both report indices;
- record exact commits, hashes, memory, timings, tests, baseline disposition, Task 6 gate result, and next owner.

## 10. Determinism, schema, and canon gates

- No `Math.random`, timestamps, time-derived IDs, locale collation, environment-dependent solve branch, filesystem iteration, or nondeterministic object/map order.
- Snapshot records and journal rows use explicit `strictCompare` ordering wherever current behavior requires sorted traversal; existing authored array order is preserved where it is semantic.
- No snapshot, working projection, journal, relation, dense occupancy, stage trace, or provenance field enters `GameState` or canonical serialization.
- No new GameState field, schema version, migration, default, validator, or fixture change.
- No baseline refresh. Any mismatch is a blocker.
- No canon or FORAWWV edit. If exact behavior cannot be preserved, stop and reject the extraction rather than redefining rules.
- The optional timing observer is outside deterministic semantics and must pass profile-off/profile-on byte/journal/state equality.

## 11. Exact Task 6 authorization gate

Phase 2e acceptance does **not** authorize Task 6. The orchestrator may mark Task 6 authorized only after all of the following are true in one retained-source packet:

1. Tasks 1-10 above pass and Phase 2e is integrated as the production default.
2. Independent architecture, determinism, and performance reviews return PASS with no open blocker.
3. Approved baselines pass without refresh; the three-mode x 100 oracle and exact-parent external oracle are exact.
4. Memory and timing retention gates pass.
5. A fresh retained-source full V8 profile ranks `buildCorpsFrontSectors` as the **largest non-overlapping named causal application owner**, not merely a nested phase, at both at least `100.000 ms/turn` inclusive and at least `10.000%` of sampled application time.
6. The fresh sector sidecar records at least `80` full builder calls over 40 turns (`>=2.0` calls/turn) and at least one postcombat location-writeback fixed-point build, proving repeated full solves remain material.
7. The fresh Amdahl calculation shows at least `10%` theoretical whole-run speedup from perfect removal of the builder.
8. The roadmap, command board, active plan, report, and ledger are updated with the exact profile hash and the explicit words `Task 6 authorized`.

If any item fails, Task 6 stays closed. Reprofile and hand R5 to the largest current owner. Do not treat existence of the pure boundary as permission to implement reuse.

## 12. Stop and revert rules

Stop before proceeding when:

- an input is missing from section 6;
- a live write is missing from section 7;
- solve reads live `GameState` after capture;
- a partial object is cast to `GameState`;
- later solve stages do not see earlier detached location writes;
- journal validation can fail after live replay begins;
- Task 8A fallbacks/construction counts, dense occupancy, receipts, stage order, warnings, bytes, or hashes diverge;
- memory exceeds the ceiling;
- a baseline mismatch appears;
- a canon contradiction is discovered;
- implementation begins incremental reuse, parallel faction work, or a new receipt;
- another branch owns a colliding file;
- the exclusive runtime lease is unavailable for heavy commands.

Revert rather than relaxing thresholds, shrinking the oracle, refreshing baselines, or changing gameplay.

## 13. Commit sequence

1. `test(sectors): characterize topology mutation order`
2. `refactor(sectors): capture explicit topology solve input`
3. `refactor(sectors): extract pure full topology solve`
4. `refactor(sectors): commit topology solve serially`
5. `test(sectors): prove pure solve reconciliation equivalence`
6. `docs(r5): checkpoint pure solve source proof`
7. `perf(sectors): separate pure topology solve from serial commit` **or** a full revert plus no-go docs commit

Do not squash away RED/repair provenance before independent review. The orchestrator may consolidate only after all source and measurement evidence is recorded.

## 14. Completion checklist

- [ ] Current imperative journal is characterized before extraction.
- [ ] Every section 6 input is captured with no retained mutable caller identity.
- [ ] Pure solve mutates neither input nor live state.
- [ ] Every live builder write is journaled in exact order.
- [ ] Detached local writes are visible to later faction/recovery stages.
- [ ] Serial commit preflights the entire journal before any live write.
- [ ] Task 8A relation and dense occupancy contracts are unchanged.
- [ ] Three modes x 100 compare sectors/state/reports/session/receipts/journal/geometry/diagnostics/bytes/SHA/rerun.
- [ ] Exact-parent external oracle passes.
- [ ] Fast/type/static/baseline gates pass without refresh.
- [ ] Exclusive measurement packet passes timing and memory gates or the candidate is reverted.
- [ ] Fresh profile selects the next owner.
- [ ] Task 6 is authorized only if every section 11 item passes; otherwise it remains closed.
- [ ] Report, roadmap, command board, ledger, knowledge, and indices match evidence.
- [ ] No canon/FORAWWV/schema/scenario/baseline/package/version/release change.

## 15. Copy-ready implementation prompt

```text
Role and objective: Act as Technical Architect, Systems/Determinism Engineer, Performance Engineer, and TDD implementer for R5 Phase 2e. Execute docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md one task and one commit at a time. Start with Task 1 RED characterization. Build a complete immutable sector-topology input snapshot, run the exact current full solve over detached working state, and serially commit its prevalidated ordered mutation journal. Do not implement incremental reuse.

Canon and architecture: Read Engine_Invariants_v0_9_0.md sections 1, 11.1-11.4, 13.1-13.2, 14.2, and 14.4; CODE_CANON.md; DETERMINISM_TEST_MATRIX.md; PIPELINE_ENTRYPOINTS.md; REPO_MAP.md; ADR-0006; the R5 Phase 2c/2d plan; the Task 8A measurement report/manifest; and every source/test file listed in the Phase 2e plan. Preserve the canonical war pipeline and reconciliation ownership.

Determinism and ledger constraints: No randomness, timestamps, locale ordering, environment-dependent solve logic, unordered output, persisted cache, new GameState field, schema/migration, baseline refresh, or partial GameState cast. All inputs and writes must appear in the plan's allow-lists. The pure solve must see its detached writes immediately; live state changes only after full journal preflight. Compare complete state and canonical bytes, not hashes alone. Append PROJECT_LEDGER.md and update PROJECT_LEDGER_KNOWLEDGE.md only for a reusable accepted/no-go lesson. Never edit docs/10_canon/FORAWWV.md.

STOP triggers: Missing input/write inventory, live-state read after capture, inability to preserve exact faction/recovery/fixed-point order, non-atomic commit, Task 8A relation or dense-occupancy drift, receipt/diagnostic/byte divergence, unexplained baseline drift, memory ceiling breach, branch collision, canon conflict, or any attempted incremental/cross-call/parallel implementation. Heavy scenario, baseline, V8, wall-clock, Electron, or package work also stops until the orchestrator grants the exclusive runtime lease.

Output and validation: Preserve RED evidence, one task per commit, and exact commands/results. The mandatory oracle is 100 deterministic real-save variants in each of live-war, final-turn, and final-save-projection modes across sectors, full state, reports, session, receipts, mutation journal, geometry order, diagnostics, bytes, SHA, and rerun. Run fast/type/static gates before lease-backed no-refresh baselines and the exact-parent measurement packet. Apply the plan's timing/heap/RSS gates. Phase 2e is enabling architecture only. Task 6 remains unauthorized unless every exact gate in section 11 passes and the roadmap explicitly says Task 6 authorized.
```
