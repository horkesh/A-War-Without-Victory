# Autonomous Engine Quality Lane Bank Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:systematic-debugging for failures and superpowers:verification-before-completion before every handoff.

**Goal:** Give Claude an engine-quality work queue focused on performance, serialization, strict-null migration, scenario proof, and merge safety.

**Architecture:** Each lane must be byte-proofed or explicitly output-changing by design. Prefer pass-local deterministic indexes, sidecar-only attribution, and typed fixture repair over broad refactors. Do not tune sensitive-history outcomes or relax canon to satisfy a test.

**Tech Stack:** TypeScript, Vitest, scenario runner, 40w/188w artifacts, existing diagnostics, no new dependencies.

---

## Global Engine Rules

- Start every lane with `git status --short --branch`.
- Use `rg` to locate owners and tests.
- For behavior-risky changes, run 40w and `node tools\validate_run_consistency.cjs <run-dir>`.
- Preserve active accepted 40w hash unless the lane explicitly changes output and the report says why.
- Avoid cross-run caches. Invocation/pass-local caches are acceptable only with byte-identity proof.
- Update reports and ledgers after validation, not before.

## Stop Gates

Stop if a hash changes unexpectedly, a sensitive-history watched operation newly delivers, a migration would weaken validation, or a test fix requires hiding a real schema contract.

---

## EQ-1 - Sector Split-Pieces Optimization

**Objective:** Reduce `enforceFinalSectorGeometryInvariants:split-pieces` cost without changing sector output.

**Sources:**

- `docs/40_reports/SECTOR_MASTER.md`
- `docs/40_reports/implemented/20260518_BATCH32_ENFORCE_FINAL_GEOMETRY_ATTRIBUTION.md`

**Likely files:**

- `src/sim/combat/sector_splitting.ts`
- `src/sim/combat/sector_rearrangement.ts`
- `src/sim/combat/corps_front_sectors.ts`
- `tests/sector_partition_instrumentation.test.ts`
- `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts`
- `tests/sector_frontline_truth.test.ts`

**Tasks:**

1. Re-profile the current branch with sector partition profiling enabled.
2. Add child labels if `split-pieces` is still too broad.
3. Inspect repeated BFS/adjacency work in `splitNonContiguousSectors`.
4. Implement only deterministic single-call-frame reuse.
5. Prove byte identity with focused tests and 40w.

**Validation:**

- `npm.cmd run typecheck`
- `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/sector_frontline_truth.test.ts --reporter=dot`
- profiled 40w
- consistency validation
- `git diff --check`

---

## EQ-2 - Serialization Week-39 Redundant Write

**Objective:** Remove one redundant full-state serialization only if final replay/save artifacts remain correct.

**Source:** Batch 33 serialization attribution report.

**Likely files:**

- `src/scenario/scenario_runner.ts`
- `tests/serialization_attribution_contract.test.ts`
- replay/save artifact tests

**Tasks:**

1. Trace the in-loop week-39 final hash/write and post-reconciliation final write.
2. Add a test proving observed final artifacts use the post-reconciliation state.
3. Remove or gate the redundant serialize only after the test proves ownership.
4. Keep replay actions JSONL semantics honest; do not silently change a consumer contract.

**Validation:**

- `npm.cmd run typecheck`
- focused serialization/replay tests
- `npm.cmd run test:baselines`
- 40w proof if artifact bytes can move
- `git diff --check`

---

## EQ-3 - Strict Null Phase 3 Safe Slice

**Objective:** Continue strict-null migration into low-conflict early-war/bot files.

**Source:** `docs/plans/2026-05-17-strict-null-checks-migration-phases.md`

**Allowed initial files:**

- `src/sim/bot/simple_general_bot.ts`
- low-conflict `src/sim/early_war/*` files

**Avoid initially:**

- `src/sim/early_war/alliance_update.ts`
- `src/sim/turn_phases/war_phases.ts`

**Tasks:**

1. Run strict-null inventory tests and record Phase 3 count.
2. Remove casts only where runtime equivalence is obvious or tested.
3. Prefer type guards/helpers over assertions.
4. Update inventory expected counts after code changes.

**Validation:**

- `npm.cmd run typecheck`
- `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot`
- focused early-war/bot tests
- 40w proof if behavior can change
- `git diff --check`

---

## EQ-4 - Strict Null Phase 4 Scenario and IPC Slice

**Objective:** Prepare the next strict-null phase for scenario/desktop surfaces after Phase 3 has landed.

**Source:** strict-null migration plan Phase 4.

**Likely files:**

- `src/desktop/desktop_sim.ts`
- `src/scenario/scenario_loader.ts`
- `src/scenario/scenario_runner.ts`
- `src/scenario/scenario_end_report.ts`
- scenario diagnostics/loaders listed in the strict-null plan

**Tasks:**

1. Do an audit-only commit first if the escape families need classification.
2. Fix low-risk loader/report assertions before runner/control-flow assertions.
3. Keep scenario JSON neutrality and loaded-game validation boundary intact.
4. Add focused tests for migrated fixture shapes.

**Validation:**

- `npm.cmd run typecheck`
- strict-null inventory test
- focused scenario/desktop tests
- `npm.cmd run test:baselines`
- 40w if runner output can change
- `git diff --check`

---

## EQ-5 - H1 Watched-Operation Visibility Tasks 1-3

**Objective:** Execute diagnostic/reporting visibility for Krivaja-95, Stupcanica-95, and Cerska-Kamenica without outcome tuning.

**Source:** `docs/plans/2026-05-17-h1-watched-operation-outcome-plan.md`

**Allowed scope:** Tasks 1-3 only: trace fixture, catalog injection trace, AAR/report visibility.

**Forbidden scope:** Task 4 outcome acceptance, balance changes, OOB edits, precondition relaxation.

**Validation:**

- `npm.cmd run typecheck`
- `npx.cmd vitest run tests/sensitive_history_status_diagnostic.test.ts tests/triggered_operations_late_1995.test.ts tests/operation_launch_feasibility_defender_aware.test.ts --reporter=dot`
- added report-contract tests
- 188w diagnostic proof only if needed
- stop if sensitive outcome changes

---

## EQ-6 - Scenario Proof and Baseline Hygiene

**Objective:** Keep merge readiness durable after large branch work by proving fixture/generated artifacts match current contracts.

**Tasks:**

1. Run `npm.cmd test` after every large multi-batch sequence, not only focused suites.
2. Run `npm.cmd run test:baselines` after scenario, migration, serialization, or generated artifact changes.
3. If generated artifacts move, identify the canonical builder and document the reason.
4. Never fix a baseline by weakening a validator.

**Validation:**

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run test:baselines`
- `npm.cmd run desktop:map:build`
- `git diff --check`

---

## Ready-to-paste Claude prompt

### 1. Role and objective

You are the engine-quality implementation worker for AWWV. Execute `docs/plans/2026-05-18-autonomous-engine-quality-lane-bank.md` one batch at a time, starting from a clean branch.

### 2. Canon references

Read the batch source docs plus relevant canon/specs for scenario, state, save migration, or combat changes. Always inspect existing tests and state schema files before editing.

### 3. Determinism and ledger constraints

No timestamps, randomness, nondeterministic iteration, or cross-run mutable caches. Stable ordering is required for any set/map output. Update `docs/PROJECT_LEDGER.md` and implemented reports for behavior/output/scenario changes; add knowledge entries only for reusable rules.

### 4. STOP AND ASK triggers

Canon conflicts or canon silence on required decision; determinism or stable ordering cannot be guaranteed; ledger update requirement is unclear; scope expands beyond prompt objective. Also stop for unexpected hash drift or sensitive-history outcome delivery.

### 5. Output format and validation

Report files changed, exact commands and pass/fail counts, 40w/188w proof where applicable, consistency result, docs updates, commit hash or not committed, and next engine lane.

