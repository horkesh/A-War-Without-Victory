# Combat Causality Diagnostics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add deterministic per-operation combat diagnostics to scenario run artifacts so calibration can distinguish active combat from inert offensives and invalidate zero-battle combat runs automatically.

**Architecture:** Extend existing War turn and scenario-run reporting rather than adding a parallel logger. Capture per-operation state from `corps_command.active_operation` and correlate it with OSID attack-resolution output in one pure helper, then surface the result in `weekly_report.jsonl` and `run_summary.json`.

**Tech Stack:** TypeScript, existing scenario harness (`src/scenario/scenario_runner.ts`), War turn pipeline reports, Vitest/node test suite.

---

### Task 1: Add failing tests for operation diagnostics helper

**Files:**
- Create: `tests/scenario_operation_diagnostics.test.ts`
- Modify: `src/scenario/scenario_runner.ts`

**Step 1: Write the failing test**

Cover one pure helper that:
- reads active `sector_attack` operations from state
- correlates participating brigades with `phase_ii_attack_resolution_osid.battles`
- emits per-operation fields for attack attempts, current-objective attempts, battles, and invalid-zero-battle flags

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scenario_operation_diagnostics.test.ts`
Expected: FAIL because the helper/export does not exist yet.

**Step 3: Write minimal implementation**

Add a pure helper in `src/scenario/scenario_runner.ts` that derives:
- `faction`
- `corps_id`
- `operation_name`
- `phase`
- `current_objective`
- `participating_brigade_count`
- `attacking_brigade_ids`
- `battle_count`
- `current_objective_attack_count`
- `current_objective_battle_count`
- `invalid_for_combat_calibration`

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/scenario_operation_diagnostics.test.ts`
Expected: PASS

### Task 2: Wire diagnostics into weekly and run summary artifacts

**Files:**
- Modify: `src/scenario/scenario_runner.ts`
- Modify: `src/scenario/scenario_end_report.ts`

**Step 1: Write the failing test**

Extend the test to assert:
- weekly diagnostics include per-operation entries
- run summary includes a combat-causality block with invalidation reasons

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scenario_operation_diagnostics.test.ts`
Expected: FAIL because the new artifact fields are absent.

**Step 3: Write minimal implementation**

Add deterministic fields to scenario artifacts:
- weekly record:
  - `operation_diagnostics`
- run summary:
  - `combat_causality`
  - aggregate invalidation booleans/reasons

Keep ordering stable by faction, corps ID, operation name, brigade ID.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/scenario_operation_diagnostics.test.ts`
Expected: PASS

### Task 3: Add scenario-level invalidation gate

**Files:**
- Modify: `src/scenario/scenario_runner.ts`
- Modify: `tests/scenario_operation_diagnostics.test.ts`

**Step 1: Write the failing test**

Assert that a run is marked invalid for combat calibration when:
- total battles = 0, or
- an active operation reaches reporting with no attack attempts and no battles

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scenario_operation_diagnostics.test.ts`
Expected: FAIL because invalidation logic is missing.

**Step 3: Write minimal implementation**

Emit:
- `combat_causality.valid_for_combat_calibration`
- `combat_causality.invalidation_reasons`
- `combat_causality.total_battles`
- `combat_causality.total_orders_by_faction`

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/scenario_operation_diagnostics.test.ts`
Expected: PASS

### Task 4: Verify and propagate docs

**Files:**
- Modify: `docs/40_reports/CALIBRATION_MASTER.md`
- Modify: `docs/PROJECT_LEDGER.md`

**Step 1: Verify targeted tests**

Run: `npx vitest run tests/scenario_operation_diagnostics.test.ts`
Expected: PASS

**Step 2: Verify no local regressions in nearby harness behavior**

Run: `npx vitest run tests/scenario_harness_smoke_h1_4.test.ts tests/scenario_end_report_h1_5.test.ts`
Expected: PASS, or pre-existing failures only.

**Step 3: Update docs**

Record the new artifact fields and the combat-causality gate in the calibration docs and ledger.

