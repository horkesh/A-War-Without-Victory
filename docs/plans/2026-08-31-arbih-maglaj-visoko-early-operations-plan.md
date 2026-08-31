# ARBiH Maglaj and Visoko Early Operations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two staggered, fallible early-war ARBiH CorpsOperations targeting the persistent Maglaj and Visoko/Breza January mismatches.

**Architecture:** Extend the existing ARBiH pre-planned operation catalog only. Preserve ordinary operation admission, marching, readiness, prediction, and attack resolution; add no scripted control changes.

**Tech Stack:** TypeScript, Vitest, existing AWWV scenario harness and operational graph.

---

### Task 1: Lock the authored operation contracts

**Files:**
- Modify: `tests/pre_planned_operations.test.ts`

1. Add failing assertions for both operation definitions: unique name, owning corps, staggered
   availability, staging OSID, participant roster, and one objective.
2. Run `npx vitest run tests/pre_planned_operations.test.ts` and confirm failure because the
   definitions do not exist.

### Task 2: Add the two catalog entries

**Files:**
- Modify: `src/sim/combat/pre_planned_operations.ts`

1. Add the week-8 1st Corps Visoko–Breza operation with a predicted-victory launch threshold.
2. Add the week-14 3rd Corps Maglaj operation with a predicted-victory launch threshold.
3. Keep both single-axis and single-objective; use ordinary operation resolution.
4. Give both an eight-week marching/assembly budget; this is a maximum budget, not a mandatory
   staff delay.
5. Run the focused test and confirm it passes.

### Task 3: Verify graph and bounded behavior

**Files:**
- No production changes expected.

1. Run focused pre-planned and operation validation tests.
2. Run TypeScript validation.
3. Run only the bounded scenario horizon needed to observe injection and combat; do not start a
   188-week run.
4. Inspect operation histories, battle receipts, control events, and collateral checkpoint
   changes. If either plan cannot launch, diagnose the existing engine path before tuning data.

### Task 4: Synchronize truthful documentation

**Files:**
- Modify only the relevant living report/ledger entries required by repository process.

1. Record what was authored and what bounded evidence actually showed.
2. Distinguish a successful operation attempt from a guaranteed territorial result.
3. Re-run focused tests and inspect `git diff --check` before handoff.
