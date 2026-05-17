# VRS 1KK Corridor 92 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure `vrs_1st_krajina` reaches Operation Corridor after Operation Prijedor, or emits a typed blocker explaining why it did not.

**Architecture:** Preserve the sequential pre-planned 1KK queue and fix the first failed handoff/validation point rather than skipping history.

**Tech Stack:** TypeScript pre-planned operations, operation execution diagnostics, scenario proof, Vitest.

---

## Files

- `src/sim/combat/pre_planned_operations.ts`
- `src/sim/combat/sector_offensive.ts`
- `src/sim/turn_phases/war_phases.ts`
- `src/scenario/combat_causality.ts`
- `data/scenarios/apr1992_vrs_operation_proof_4w.json`
- `tests/pre_planned_operations.test.ts`
- `tests/scenario_vrs_operation_proof.test.ts`

## Implementation Tasks

1. Add failing queue test proving Operation Prijedor completion injects Operation Corridor while preserving `queued_operations`.
2. Add scenario proof that `operation_aars.json` contains Operation Corridor or a typed blocker by the historical window.
3. Diagnose whether Prijedor stalls, queue injection is blocked, Corridor roster fails validation, or objectives are already controlled.
4. Preserve the 1KK order: Prijedor before Corridor before later diversions; do not move Donji Vakuf ahead of Corridor.
5. Add non-consuming blocker/status for queued ops that fail validation.
6. If the issue is Prijedor noncompletion, fix recovery/queue handoff before touching Corridor data.

## Verification

- `npx.cmd vitest run tests/pre_planned_operations.test.ts tests/scenario_vrs_operation_proof.test.ts`
- `npm.cmd run sim:scenario:run:40w`

## Documentation And Ledger

- Update `docs/40_reports/REAL_WAR_MASTER.md`.
- Add implemented report under `docs/40_reports/implemented/`.
- Update roadmap/backlog and `docs/PROJECT_LEDGER.md`.

## Stop Gates

- Stop if fixing requires changing historical Corridor objectives or brigades without historian review.
- Stop if the queue skips Operation Prijedor instead of proving completion/blocker.
