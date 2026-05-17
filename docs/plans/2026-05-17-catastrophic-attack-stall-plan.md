# Catastrophic Attack Stall Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stop repeated fresh-brigade attacks into objectives with recent catastrophic outcomes and very low power ratios.

**Architecture:** Add deterministic objective-level failure memory and consume it in launch/readiness and axis continuation before order emission.

**Tech Stack:** TypeScript operation execution, commander planning, Vitest, baseline checks.

---

## Files

- `src/sim/combat/sector_offensive.ts`
- `src/sim/combat/sector_offensive_launch_helpers.ts`
- `src/sim/combat/commander/emit.ts`
- `src/sim/combat/commander/plan.ts`
- `tests/catastrophic_stall.test.ts`
- `tests/operation_launch_feasibility_defender_aware.test.ts`

## Implementation Tasks

1. Extend `catastrophic_stall` tests so catastrophic memory is objective-level across brigades, not only same-axis/same-brigade.
2. Add failing test: recent catastrophic result at objective plus power ratio below floor blocks or redirects before attack-order emission.
3. Add deterministic memory keyed by objective OSID, corps, and faction, sourced from operation state/AAR/brigade histories.
4. Apply memory in launch/readiness and axis continuation.
5. Keep one desperate attack allowance; block repeated attacks only after evidence.
6. Surface commander reason as "recent catastrophic losses at objective" in reevaluation/weekly logs.

## Verification

- `npx.cmd vitest run tests/catastrophic_stall.test.ts tests/operation_launch_feasibility_defender_aware.test.ts`
- `npm.cmd run test:baselines`

## Documentation And Ledger

- Update `docs/40_reports/REAL_WAR_MASTER.md`.
- Update operation reevaluation notes or implemented report.
- Add `docs/PROJECT_LEDGER.md` behavior entry.

## Stop Gates

- Stop if behavior changes all factions asymmetrically without canon sign-off.
- Stop if memory depends on unsorted object iteration or wall-clock timestamps.
