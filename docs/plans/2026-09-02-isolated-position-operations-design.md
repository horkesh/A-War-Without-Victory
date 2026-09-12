# Isolated Position Operations Implementation Plan

**Status:** Completed in `68e5d22e8`. Independent v63/v64 runs produced identical hash
`270709e4d303deed`; the integrated result is documented in
[`20260902_APRIL_1994_OPERATIONAL_CALIBRATION.md`](../40_reports/implemented/20260902_APRIL_1994_OPERATIONAL_CALIBRATION.md).

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Recover historically correct April 1994 pocket reductions through ordinary corps operations and attack resolution without restoring passive political-control transfers.

**Architecture:** Commander planning will recognize a bounded, topologically isolated enemy position as an operational purpose, but the purpose itself will never change control. Authored pre-planned operations will retain their dated concentration orders against discretionary bot routing, and historically scoped axes will carry the residual objectives that the removed consolidation phase had masked. Every OSID must still be attacked and won through the existing operation resolver.

**Tech Stack:** TypeScript simulation engine, Vitest, deterministic scenario harness.

---

### Task 1: Add isolated-position operational purpose

**Files:**
- Modify: `tests/commander/operation_purpose_guard.test.ts`
- Modify: `src/sim/combat/commander/plan.ts`

1. Add failing tests proving a one-cell and multi-cell enemy pocket surrounded by the planning faction receives an `isolated_enemy_position` purpose.
2. Add a negative test proving ordinary exposure and a mixed open boundary do not qualify.
3. Run the focused test and observe the expected failure.
4. Implement deterministic bounded BFS classification using sorted adjacency.
5. Run the focused test to green.

### Task 2: Preserve authored concentration marches

**Files:**
- Modify: `tests/pre_planned_operations.test.ts`
- Modify: `src/sim/combat/pre_planned_operations.ts`

1. Add a failing test proving a queued operation's dated concentration order is not tagged as discretionary routing.
2. Run the focused test and observe the expected failure.
3. Make the authored concentration order authoritative while the operation remains unresolved.
4. Run the focused tests to green.

### Task 3: Repair historically authored residual axes

**Files:**
- Modify: `tests/pre_planned_operations.test.ts`
- Modify: `src/sim/combat/pre_planned_operations.ts`

1. Add focused catalogue tests for the missing Jajce/Krajina and Višegrad residual objectives where supported by the April target and historical operation scope.
2. Run the tests red.
3. Add only the reachable, historically scoped objectives; do not add control effects or outcome guarantees.
4. Run the tests green.

### Task 4: Calibrate and verify

**Files:**
- Modify: `docs/10_canon/Systems_Manual_v0_9_0.md`
- Modify: `docs/40_reports/CALIBRATION_MASTER.md`
- Modify: `docs/PROJECT_LEDGER.md`

1. Run focused commander and pre-planned-operation tests.
2. Run typecheck and relevant regression suites.
3. Run the deterministic 104-week April 1994 scenario.
4. Compare every changed OSID against v52 and the painted target, with special checks for Brčko, Foča, Krajina, Vareš, Zavidovići, Srebrenica, and Goražde.
5. Iterate one root cause at a time with a failing test before each production change.
6. Re-run the accepted scenario twice if the final candidate changes simulation behavior, compare hashes, and document the result.

### Acceptance criteria

- No `consolidation` or `abandoned` control event occurs.
- Every recovered OSID has combat/operation attribution.
- Brčko city remains RS in the historical run without an immutable controller lock.
- Lopare Selo remains RS; probes remain permitted.
- The Foča southern axis and Vareš approach retain live participants and attempt their objectives.
- Stable ordering and identical rerun hashes are demonstrated.
