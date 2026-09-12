# April 1994 Operational Corrections — Implementation Plan

**Status:** Completed. Later corrections refined the accepted result; see
[`20260902_APRIL_1994_OPERATIONAL_CALIBRATION.md`](../40_reports/implemented/20260902_APRIL_1994_OPERATIONAL_CALIBRATION.md).

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make ARBiH the operational attacker against HVO and add canonical Army-HQ elite participation to Cerska–Kamenica and Zvezda 94.

**Architecture:** Preserve the existing bilateral corps diversion, historical-operation injection, combat resolution, and elite-loan systems. Change doctrine at the stance producers, add elite IDs to historical rosters, and extend triggered-operation admission to call the same shared Army-HQ loan rules already used by pre-planned operations.

**Tech Stack:** TypeScript, Vitest, deterministic scenario runner.

### Task 1: Lock bilateral doctrine with failing tests

**Files:** `tests/bilateral_formation_diversion.test.ts`, `tests/bot_corps_stance.test.ts`, `src/sim/combat/bot_corps_ai.ts`, `src/sim/combat/bot_corps_stance.ts`

1. Change/add assertions for ARBiH offensive and HVO defensive posture during open bilateral war.
2. Run the focused tests and confirm the current inverse policy fails.
3. Make the minimal stance changes in both posture producers.
4. Rerun the focused tests to green.

### Task 2: Lock historical elite rosters with failing tests

**Files:** `tests/triggered_operations.test.ts`, `tests/pre_planned_operations.test.ts`, `src/sim/combat/triggered_operations.ts`, `src/sim/combat/pre_planned_operations.ts`

1. Assert both historical operation definitions include `rs_1st_guards_motorized` and `rs_65th_protection_motorized_regiment`.
2. Add a triggered-operation regression proving explicitly rostered Main Staff elites are loaned to the Drina Corps and participate.
3. Run focused tests and confirm roster/admission failures.
4. Add the roster entries and implement triggered-operation loan admission/deployment through the shared Army reserve helpers.
5. Rerun focused tests to green.

### Task 3: Verify behavioral safety

**Files:** relevant combat and scenario tests

1. Run bilateral, triggered-operation, pre-planned-operation, main-staff availability, and elite-loan tests.
2. Run TypeScript type checking.
3. Run the scenario test suite.
4. Run a full deterministic 188-week RS calibration and inspect the April 1994 checkpoint plus later regressions.

### Task 4: Propagate the result

**Files:** `docs/40_reports/CALIBRATION_MASTER.md`, `docs/PROJECT_LEDGER.md`, and any directly affected system documentation

1. Record the doctrine correction, historical-source distinction, implementation files, tests, and measured calibration delta.
2. Verify documentation names canonical files and does not overstate the Zvezda unit evidence.
3. Run final fresh verification and report the branch/worktree and results.
