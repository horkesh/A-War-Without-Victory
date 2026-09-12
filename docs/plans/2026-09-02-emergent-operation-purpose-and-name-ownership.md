# Emergent Operation Purpose and Historical Name Ownership Implementation Plan

**Status:** Completed in `174a53b11`, `85b99e48f`, and `f8c5d1268`; calibrated evidence and
subsequent regression recovery are consolidated in
[`20260902_APRIL_1994_OPERATIONAL_CALIBRATION.md`](../40_reports/implemented/20260902_APRIL_1994_OPERATIONAL_CALIBRATION.md).

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent commander-generated operations from borrowing historical catalogue names and prevent exposed-but-pointless OSIDs from becoming offensive objectives unless their capture advances a state-derived operational purpose.

**Architecture:** Historical operation definitions remain in their existing pre-planned, triggered, opportunity, and Army-HQ catalogues, but a shared name-ownership module derives normalized reserved stems from every catalogue and keeps them out of the emergent pool. Opportunity planning gains a deterministic, faction-neutral operational-purpose assessment based on live graph effects; physical exposure remains a feasibility tiebreaker rather than the source of strategic intent.

**Tech Stack:** TypeScript, Vitest, deterministic OSID graph analysis, existing commander and operation catalogue modules.

---

### Task 1: Historical operation name ownership

**Files:**
- Create: `src/sim/combat/historical_operation_names.ts`
- Modify: `src/sim/combat/operation_names.ts`
- Modify: `tests/operation_name_collision.test.ts`

1. Extend the collision test to aggregate authored names from the pre-planned and triggered catalogues and compare normalized semantic stems, so `Operacija Farz` conflicts with `Operation Farz 95`.
2. Run the focused test and verify that it fails on Farz and any other catalogue-owned names still exposed to emergent selection.
3. Implement deterministic name normalization and an explicit reserved-name registry that can include catalogue aliases before full catalogue implementation.
4. Filter the emergent pools at construction and make the fallback generate a neutral corps/turn label rather than recycle a reserved name.
5. Run the focused test and operation-name consumers; commit the name-ownership change.

### Task 2: Purpose-gated emergent objectives

**Files:**
- Modify: `src/sim/combat/commander/plan.ts`
- Test: `tests/commander_plan.test.ts` or the existing focused commander-plan test owning opportunity target selection.

1. Add a failing regression fixture matching the Lopare geometry: a highly exposed enemy OSID whose capture increases frontage and does not connect territory, cut enemy connectivity, relieve a threatened friendly position, recapture recent ground, or advance an Army-HQ target must lose to a less exposed meaningful objective—or produce no operation when it is the only candidate.
2. Verify the test fails because current ranking selects by friendly approach count.
3. Add a pure deterministic assessment returning a declared purpose and graph-derived strategic effect. Recognized purposes are corridor/linkage, enemy-connectivity cut, salient reduction/front-economy improvement, threatened-position relief, recent recapture, and campaign-objective advance.
4. Require an ordinary emergent opportunity to have a recognized positive purpose. Keep bilateral and explicitly tasked campaign objectives authoritative; keep approach count and combat feasibility as secondary ranking inputs.
5. Run focused commander/operation tests and commit the target-selection change.

### Task 3: Documentation, calibration, and final verification

**Files:**
- Modify: `docs/10_canon/Systems_Manual_v0_9_0.md`
- Modify: `docs/20_engineering/AI_STRATEGY_SPECIFICATION.md`
- Modify: `docs/40_reports/CALIBRATION_MASTER.md`
- Modify: `docs/PROJECT_LEDGER.md`

1. Document that emergent operations require state-derived operational purpose and cannot consume catalogue-reserved historical names.
2. Run typecheck and the focused operation/commander suites.
3. Run the deterministic April-1994 checkpoint scenario from the established calibration command and inspect operation AARs, control-change attribution, Lopare Selo, and all prior Goražde/Srebrenica corrections.
4. Run determinism/diff checks required by the calibration lane.
5. Append the measured result and exact commands to the ledger and calibration master; commit documentation and evidence.
