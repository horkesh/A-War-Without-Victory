# ARBiH Zero-Attack Operation Stalls Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent ARBiH 2nd/3rd/4th Corps operations from entering execution with zero eligible attacks when participants are understrength, off-axis, or not adjacent.

**Architecture:** Extend launch/readiness to prove executable opening attacks per active axis and emit typed blockers for non-executable axes.

**Tech Stack:** TypeScript sector offensive logic, scenario diagnostics, Vitest.

---

## Files

- `src/sim/combat/sector_offensive.ts`
- `src/sim/combat/sector_offensive_launch_helpers.ts`
- `src/scenario/combat_causality.ts`
- `tests/scenario_operation_diagnostics.test.ts`
- `tests/operation_execution_staging_truth.test.ts`
- `tests/operation_progress_replacement_truth.test.ts`

## Implementation Tasks

1. Add failing fixtures for known 2nd/3rd/4th Corps patterns from `REAL_WAR_MASTER.md`.
2. Assert operations with all participants below attack floor abort with `participants_below_attack_floor`.
3. Assert operations with no adjacent approach OSID abort or stall axis with `no_approach_osid`.
4. Assert wrong-front targets do not execute zero attacks; they emit `zero_eligible_axis` or `no_launch_readiness`.
5. Extend readiness to require at least one executable opening attack per active axis.
6. For multi-axis ops, mark only non-executable axes blocked and recover the operation when all axes are terminal.
7. Preserve movement-only grace for real in-transit brigades.

## Verification

- `npx.cmd vitest run tests/operation_execution_staging_truth.test.ts tests/operation_progress_replacement_truth.test.ts tests/scenario_operation_diagnostics.test.ts`
- `npm.cmd run test:vitest:scenario`

## Documentation And Ledger

- Update `docs/40_reports/REAL_WAR_MASTER.md`.
- Add implemented report under `docs/40_reports/implemented/`.
- Add `docs/PROJECT_LEDGER.md` behavior/diagnostic entry.

## Stop Gates

- Stop if the fix suppresses legitimate local ARBiH counterattacks.
- Stop if implementation introduces brigade-level direct attacks; preserve CorpsOperation-only invariant.
