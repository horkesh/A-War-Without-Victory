# Engine Quality, Performance, and Stability Implementation Plan

> **For implementation:** REQUIRED SUB-SKILL: use `executing-plans` and execute one phase at a time.

**Goal:** Turn the optional-state, sector-performance, save/replay, generated-artifact, and branch/CI residual banks into finite verified contracts.

**Architecture:** First freeze current behavior with deterministic inventories and profiles. Classify every optional state family, optimize only measured hot paths with byte-identical output, assign every generated artifact one owner, and make CI run the same release-facing contracts used locally. This lane changes behavior only when a separately named defect requires it; performance work must preserve scenario bytes.

**Tech stack:** TypeScript, Node.js/V8 profiling, Vitest, scenario runner, replay JSONL, GitHub Actions, Electron release checks.

**Date:** 2026-07-31
**Status:** READY -- may run after R1-R3 source convergence
**Roadmap workstream:** R5
**Canonical owner:** `GameState` validators/migrations for persistence; scenario runner for artifacts; profiled call site for performance
**Collision rule:** Do not edit Tactical Group state until R3 is merged. Do not edit map lifecycle/resource code until R1 is merged.
**Activation:** Begin only after the owner says `Execute the master roadmap` or explicitly names this plan.

---

## 1. Resolved decisions

1. Optional-state work ends when every field is classified as required-persisted, optional-persisted, derived/transient, compatibility-only, or dead. It is not an endless field-by-field lane.
2. A field becomes required only with a materialized runtime default, migration, validator rejection tests, and round-trip proof.
3. Derived sector/front/combat caches remain outside saves.
4. Performance selection is profile-driven. No speculative cache or mutable collection may cross a deterministic boundary.
5. The historical target remains a mean below 100 ms per simulated turn on the recorded reference machine. Progress is also accepted only when full-run and local-owner timings move in the same direction.
6. Every generated file is exactly one of: committed static input, committed golden output, retained research evidence, untracked diagnostic, or transient package output.
7. CI and local release checks use the same scripts; a skipped/cancelled required job is not green.

## 2. Purpose and non-goals

### In scope

- finite `GameState` persistence classification and validator closeout;
- V8/current-instrumentation performance profile and measured optimization;
- sector/frontline hot paths, graph construction, and serialization owners;
- save migration, replay manifest/sidecar, startup snapshot, baseline, and diagnostic artifact ownership;
- structural fingerprint, CI path filters, and release-facing local/remote parity.

### Non-goals

- no calibration tuning, OOB/scenario content, historical event, map-data regeneration, or GUI redesign;
- no baseline refresh for a performance-only change;
- no committed package output or deletion of retained evidence;
- no version, tag, release, or `FORAWWV.md` change.

## 3. External-agent execution contract

```powershell
git status --short --branch
Get-Content -Raw .claude/napkin.md
Get-Content -Raw docs/life_lessons.md
Get-Content -Raw docs/plans/MASTER_ROADMAP.md
Get-Content -Raw docs/20_engineering/DETERMINISM_TEST_MATRIX.md
Get-Content -Raw docs/20_engineering/repo/GENERATED_ARTIFACT_POLICY.md -ErrorAction SilentlyContinue
rg -n "interface MilitaryState|validateGameState|migrate|buildFactionSectors|replay_manifest|artifact ownership" src tools tests
```

Before each phase, capture `git status --short`, current scenario hashes, and the relevant generated-artifact paths. Never clean or overwrite unrelated user output.

## 4. Phase sequence

## Phase 0 -- Reproducible truth baseline

**Assigned role:** Performance Engineer + Systems Programmer
**Independent review:** Determinism Auditor

### Task 0.1 -- Pin current state and artifact inventories

**Files:**

- Create `tools/diagnostics/game_state_field_classification.ts`
- Create `tools/diagnostics/generated_artifact_inventory.ts`
- Create `tests/game_state_field_classification.test.ts`
- Create `tests/generated_artifact_inventory.test.ts`

- [ ] Emit every `GameState`/`MilitaryState` field with declared type, initializer, validator, migration, serializer, and known readers.
- [ ] Emit every known scenario/replay/baseline/diagnostic/package artifact with owner and tracked/transient policy.
- [ ] Fail on unclassified fields and unowned writes.
- [ ] Sort output with stable ASCII comparison and omit absolute paths/timestamps.

### Task 0.2 -- Capture fresh performance owners

**Files:**

- Modify only instrumentation under `tools/perf/` if current output lacks owner attribution
- Create `tests/performance_wall_clock_report.test.ts`

- [ ] Run one warmup and three measured 40-turn runs on the recorded machine.
- [ ] Capture total/turn mean, P50, P95, V8 inclusive owners, sector subowners, graph load, combat, bot orders, serialization, and peak heap.
- [ ] Prove profiling flags do not change scenario bytes.

```powershell
npm.cmd run perf:wall-clock:report
npm.cmd run perf:profile-hotspot:report
npm.cmd run sim:scenario:run:40w
npm.cmd run test:baselines
npm.cmd run typecheck
```

`/simplify` -> review -> commit `test(engine): inventory quality and performance owners`

## Phase 1 -- Finite GameState contract closeout

**Assigned role:** Systems Programmer
**Independent review:** Technical Architect + QA Engineer

### Task 1.1 -- Classify all remaining fields as one batch

**Files:**

- Modify `src/state/game_state.ts`
- Modify `src/state/validateGameState.ts`
- Modify `src/state/initialize_new_game_state.ts`
- Modify `tests/game_state_field_classification.test.ts`
- Modify `tests/validate_game_state_shape.test.ts`

- [ ] Record one classification for every field still reported by Phase 0.
- [ ] Keep caches and UI read models derived/transient.
- [ ] Mark compatibility-only fields with the supported legacy-save boundary.
- [ ] Delete a field only after proving zero supported reader/writer and no fixture dependency.

### Task 1.2 -- Promote required-persisted families coherently

**Files when promotion is required:**

- Modify `src/state/save_migration.ts`
- Modify `src/state/validateGameState.ts`
- Modify `src/state/initialize_new_game_state.ts`
- Add/update `tests/fixtures/save_migration/`
- Modify `tests/save_migration.test.ts`
- Modify `tests/save_migration_round_trip_contract.test.ts`
- Modify `tests/save_migration_validator_rejection.test.ts`

- [ ] Group fields by lifecycle/owner rather than one-field schema churn.
- [ ] Materialize deterministic defaults for legacy saves.
- [ ] Reject missing/malformed current-version payloads.
- [ ] Preserve array order and map key ordering.
- [ ] Rebuild startup snapshot only through its canonical command.

```powershell
npm.cmd run test:vitest -- tests/game_state_field_classification.test.ts tests/validate_game_state_shape.test.ts tests/save_migration.test.ts tests/save_migration_round_trip_contract.test.ts tests/save_migration_validator_rejection.test.ts tests/save_migration_drift_audit.test.ts --pool=forks --reporter=dot
npm.cmd run desktop:startup-snapshot:check
npm.cmd run typecheck
npm.cmd run test:baselines
```

`/simplify` -> review -> commit `refactor(state): close persistence classification`

## Phase 2 -- Measured wall-clock performance

**Assigned role:** Performance Engineer
**Independent review:** Systems Programmer + Determinism Auditor

### Task 2.1 -- Optimize the largest amortized owner

**Likely files, selected only by Phase 0 evidence:**

- `src/sim/combat/sector_partition.ts`
- `src/sim/combat/sector_reconciliation.ts`
- `src/sim/combat/brigade_front_distribution.ts`
- graph/front helpers named by the V8 profile
- `tools/scenario_runner/` serialization owners
- focused sector/performance tests named by `rg -n "buildFactionSectors|reconcileFinalSectorTruth" tests`

For each candidate:

- [ ] Write an equivalence test or existing-output assertion first.
- [ ] Measure candidate-local cost before editing.
- [ ] Implement one bounded reuse/index/algorithm change.
- [ ] Prove no mutable `Map`/`Set` or insertion order leaks into state/output.
- [ ] Run the local profile and full timed 40-turn run.
- [ ] Keep the change only when both measurements improve and output remains byte-identical.
- [ ] Revert performance-inconclusive or regressing candidates before the next candidate.

### Task 2.2 -- Repeat by current profile, not the old list

- [ ] Reprofile after every accepted optimization.
- [ ] Continue until the recorded-machine mean is below 100 ms/turn.
- [ ] If the remaining owner requires an algorithmic redesign, write failing equivalence/property tests and implement the redesign inside this phase; do not create a new roadmap gate.
- [ ] Record P50/P95, heap, hashes, and before/after owner shares for every accepted commit.

```powershell
npm.cmd run test:vitest -- tests/sector_partition_instrumentation.test.ts tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/final_sector_truth_reconciliation.test.ts tests/final_sector_truth_reconciliation_cache.test.ts tests/brigade_front_distribution.test.ts tests/performance_wall_clock_report.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run sim:scenario:run:40w
npm.cmd run test:baselines
npm.cmd run perf:wall-clock:report
npm.cmd run perf:profile-hotspot:report
```

**Failure rule:** unexplained byte drift rejects the candidate. Do not re-floor a performance-only change.

`/simplify` -> independent performance/determinism review -> commit one measured optimization

## Phase 3 -- Save, replay, and artifact ownership closeout

**Assigned role:** Platform Specialist + Systems Programmer
**Independent review:** QA Engineer

### Task 3.1 -- Close remaining artifact inventory failures

**Files:**

- Modify the precise owners under `src/scenario/`, `src/sim/replay/`, `tools/scenario_runner/`, or `tools/diagnostics/`
- Modify `tests/generated_artifact_ownership_matrix_contract.test.ts`
- Add one focused ownership test per new matrix row

- [ ] Ensure replay manifests and sidecars have one finalizer.
- [ ] Ensure latest-run copies are byte-equivalent to their canonical source.
- [ ] Ensure baselines/startup snapshots/migration drift have explicit static ownership.
- [ ] Ensure diagnostics and `data/derived/_debug/**` remain untracked unless a narrow matrix row says otherwise.
- [ ] Ensure package directories are transient and release evidence stores path/size/SHA-256, not binaries.

### Task 3.2 -- Replay/save equivalence

**Files:**

- Modify `src/sim/replay/replay_manifest.ts`
- Modify `src/scenario/replay_save_emit.ts`
- Modify `tests/replay_artifact_ownership.test.ts`
- Modify `tests/replay_save_finalizer_artifact_ownership.test.ts`
- Modify `tests/replay_surface_truth.test.ts`

- [ ] Prove the final save, replay manifest, replay sequence, and selected-frame summary agree on scenario, faction, turn, and state fingerprint.
- [ ] Prove an old save migrates, round-trips, and produces the same current-state replay contract.

```powershell
npm.cmd run test:vitest -- tests/generated_artifact_ownership_matrix_contract.test.ts tests/replay_artifact_ownership.test.ts tests/replay_save_finalizer_artifact_ownership.test.ts tests/replay_surface_truth.test.ts tests/scenario_latest_run_final_save_map_copy.test.ts tests/startup_snapshot_artifact_ownership.test.ts tests/save_migration_drift_artifact_ownership.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run test:baselines
```

`/simplify` -> review -> commit `fix(artifacts): close save and replay ownership`

## Phase 4 -- CI and repository hygiene convergence

**Assigned role:** Platform Specialist + Systems Programmer
**Independent review:** Process QA

### Task 4.1 -- Make local and CI contracts identical

**Files:**

- Modify `.github/workflows/desktop-release-guard.yml`
- Modify `.github/workflows/release.yml`
- Modify trusted path-filter/detector scripts under `tools/`
- Modify `tests/desktop_release_ci_guardrails.test.ts`
- Modify `tests/baseline_regression_ci_guardrails.test.ts`

- [ ] Include every runtime/package input path in release guards.
- [ ] Restore trusted detector scripts from `HEAD` after base comparison.
- [ ] Treat cancelled/skipped required jobs as non-green.
- [ ] Keep local commands and CI commands byte-for-byte aligned where practical.
- [ ] Add no secret, token, certificate, or machine path to tracked files.

### Task 4.2 -- Branch/reference hygiene

- [ ] Report merged, superseded, stale, and protected branches without deleting them during implementation.
- [ ] Close only repo-local stale references after proof; remote deletion/push is outside this plan unless separately authorized.
- [ ] Run link and generated-artifact checks from a clean checkout/worktree before closeout.

```powershell
npm.cmd run ci:structural-fingerprint:check
npm.cmd run desktop:release:check
npm.cmd run qa:electron-runtime-contracts
npm.cmd run test:baselines
npm.cmd run typecheck
git diff --check
```

`/simplify` -> review -> commit `ci: converge release-facing quality gates`

## Phase 5 -- Integrated proof and closeout

**Assigned role:** QA Engineer
**Independent review:** Verification Before Completion

- [ ] Re-run the Phase 0 inventories; require zero unclassified fields and zero unowned artifacts.
- [ ] Run three measured 40-turn profiles and publish median/P95 against the 100 ms/turn budget.
- [ ] Run full Vitest, typecheck, desktop release check, baselines, structural fingerprint, paired 188-turn engine health, and replay/save checks.
- [ ] Create `docs/40_reports/implemented/20260731_ENGINE_QUALITY_PERFORMANCE_STABILITY.md`.
- [ ] Update the master roadmap, ledger, and reusable knowledge.

```powershell
npm.cmd run typecheck
npm.cmd run test:vitest -- --pool=forks --reporter=dot
npm.cmd run test:baselines
npm.cmd run engine:health:gate
npm.cmd run ci:structural-fingerprint:check
npm.cmd run desktop:release:check
git diff --check
```

## 5. Determinism and acceptance rules

- ASCII/stable comparison for persisted/generated order; no `localeCompare` on deterministic paths.
- No timestamps, machine paths, random ids, or environment-dependent defaults in artifacts.
- Profiling is default-off and excluded from state/replay/baselines.
- A behavior-neutral performance change must be byte-identical at 40 and 188 turns.
- A schema version changes once per coherent family, never once per field.

## 6. Success criteria

- [ ] Zero unclassified `GameState`/`MilitaryState` fields.
- [ ] Zero generated writes without an ownership matrix row.
- [ ] Mean simulated turn below 100 ms on the recorded reference machine, with P50/P95 and hardware recorded.
- [ ] Save migration, replay, startup snapshot, baseline, and final-save equivalence checks pass.
- [ ] Local and CI release-facing commands agree.
- [ ] No package, version, tag, push, or public release occurs in this lane.

## 7. Copy-ready execution prompt

```text
Role and objective: Implement roadmap R5 using docs/plans/2026-07-31-engine-quality-performance-stability-plan.md, one phase at a time.

Locked decisions: classify all state fields in one finite inventory; persist only materialized state; keep caches transient; optimize only the current measured owner; require byte-identical output for performance work; give every generated artifact one owner.

Read first: .claude/napkin.md, docs/life_lessons.md, docs/plans/MASTER_ROADMAP.md, docs/20_engineering/DETERMINISM_TEST_MATRIX.md, and the target files named by the phase.

Constraints: TDD, stable ordering, one logical commit, /simplify before verification, no baseline refresh for performance-only changes, no package/version/tag/push/release mutation.

Handoff: exact files, tests/results, before/after timing and hashes, state/artifact inventory counts, rejected candidates, docs/ledger updates, and next phase.
```

## 8. Orchestrator completion block

**Canonical owner:** persistence validators/migrations, profiled runtime owner, artifact finalizer.
**Demoted path:** endless optional-field slices, speculative caches, duplicate sidecar writers, CI-only truth.
**Player-visible truth:** faster turns and reliable saves/replays without changed campaign outcomes.
**Canonical UI surface:** none; replay UI consumes the canonical manifest.
**Done means:** zero unclassified state/artifacts, sub-100 ms measured turns, byte-stable performance output, and green local/CI parity.
