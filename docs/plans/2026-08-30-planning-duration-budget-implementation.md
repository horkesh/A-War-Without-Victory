# Planning Duration Budget Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore readiness-based CorpsOperation launch without restoring independent brigade attack authority.

**Architecture:** Keep all existing readiness, ownership, and attack-executability gates. Change only the planning-clock conjunction so a ready operation may enter execution after one planning turn; retain `planning_duration` as the timeout/marching budget.

**Tech Stack:** TypeScript, Vitest, deterministic scenario harness, Node 22.

---

### Task 1: Pin the readiness transition

**Files:**
- Modify: `tests/sector_offensive_idle_recovery.test.ts`

1. Change the existing planning-floor test to require both opening and later staged operations to execute before the duration budget expires.
2. Keep the unstaged case in planning until it becomes staged.
3. Run `npx vitest run tests/sector_offensive_idle_recovery.test.ts -t "uses planning duration as a staging budget"` and confirm the new later-operation assertion fails under the current mandatory floor.

### Task 2: Restore the budget contract

**Files:**
- Modify: `src/sim/combat/sector_offensive.ts`
- Modify: `src/sim/combat/operation_preparation.ts`

1. Replace the scenario-birth exception with a general `elapsed >= 1 && (preparationReady || stagedEarly)` transition.
2. Retain `elapsed > planDuration` and forced-launch behavior.
3. Correct comments that call the field a mandatory floor.
4. Re-run the focused test and confirm it passes.

### Task 3: Align canon and durable knowledge

**Files:**
- Modify: `docs/10_canon/Engine_Invariants_v0_9_0.md`
- Modify: `docs/10_canon/Systems_Manual_v0_9_0.md`
- Modify: `docs/10_canon/context.md`
- Modify: `docs/PROJECT_LEDGER_KNOWLEDGE.md`

1. State that readiness may end planning after one full turn.
2. State that `planning_duration` remains the march/preparation and anti-paralysis budget.
3. Preserve all operation ownership and attack-executability clauses.

### Task 4: Verify code and determinism

1. Run the focused sector-offensive suite.
2. Run ops-only provenance, army-reserve, temporal-contract, and determinism tests.
3. Run typecheck and the complete balanced Vitest suite.
4. Confirm the worktree contains only intended changes.

### Task 5: Validate the 188-week outcome

1. Run the definitive 188-week scenario into a new untracked run directory without updating the baseline manifest.
2. Run `tools/engine_health_gate.cjs`, `tools/verify_checkpoints.cjs`, capture provenance, and sensitive-history diagnostics against it.
3. Compare killed, wounded, operations, attack orders, battles, planning deaths, and political-blocked deaths with the exact `037396e3c` and accepted branch artifacts.
4. Apply the documented falsifiers.

### Task 6: Re-baseline and record

1. If validation passes, update only the January engine-health threshold using the established measured-minus-three convention.
2. Do not update or reconcile the baseline manifest.
3. Append the mandatory `docs/PROJECT_LEDGER.md` entry with commands, outputs, and remaining caveats.
4. Re-run the affected threshold tests and health gate.

