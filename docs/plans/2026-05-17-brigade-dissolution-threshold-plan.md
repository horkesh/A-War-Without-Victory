# Brigade Dissolution Threshold Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make brigade dissolution fire at the intended combat-ineffective threshold without duplicating lifecycle machinery or breaking enclave/late-war exceptions.

**Architecture:** Keep `dissolveCombatIneffectiveBrigades(...)` as owner and adjust threshold criteria through constants/tests.

**Tech Stack:** TypeScript combat/formation state, scenario runner, Vitest.

---

## Files

- `src/sim/combat/brigade_dissolution.ts`
- `src/state/formation_constants.ts`
- `src/sim/turn_phases/war_phases.ts`
- `src/scenario/scenario_runner.ts`
- `tests/krivaja_roster_phase_1.test.ts`
- `tests/integration_formation_integrity.test.ts`
- `tests/destroyed_brigade_tracking.test.ts`

## Implementation Tasks

1. Add failing tests pinning intended threshold behavior for non-enclave brigades below combat-effective personnel.
2. Add tests that dissolution removes brigades from `corps_command.active_operations[*].participating_brigades` and active axes.
3. Add artifact tests proving destroyed-brigade rows include dissolution-triggered units with `destruction_turn`.
4. Decide in code review whether backlog means replacing the current two-of-three gate or adding a personnel-only absolute floor.
5. Preserve enclave exception behavior and timeline override via `resolveDissolutionThreshold(...)`.
6. Keep salvage, reserve return, inactive/destroyed flags, personnel zeroing, and operation removal atomic.

## Verification

- `npx.cmd vitest run tests/krivaja_roster_phase_1.test.ts tests/integration_formation_integrity.test.ts tests/destroyed_brigade_tracking.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run sim:scenario:run:40w`

## Documentation And Ledger

- Update combat/formation docs if threshold semantics change.
- Update `docs/40_reports/REAL_WAR_MASTER.md`.
- Add `docs/PROJECT_LEDGER.md` behavior entry.

## Stop Gates

- Stop if Krivaja roster regressions appear.
- Stop if inactive brigades remain in sectors or operations.
- Stop if 40w destroyed/active counts swing without attribution.
