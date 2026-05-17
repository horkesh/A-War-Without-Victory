# Fatigue Recovery Rebalance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebalance fatigue so engagement, frontline duty, supply fatigue, and passive recovery produce visible but bounded readiness pressure.

**Architecture:** Separate combat fatigue, supply fatigue, frontline assignment drag, and recovery; tune only with named constants and focused tests.

**Tech Stack:** TypeScript formation fatigue, combat aftermath, commander force evaluation, Vitest, scenario proof.

---

## Files

- `src/state/formation_fatigue.ts`
- `src/sim/combat/attack_resource_aftermath.ts`
- `src/state/formation_constants.ts`
- `src/sim/combat/combat_math.ts`
- `src/sim/combat/commander/force_eval.ts`
- `tests/formation_fatigue_frontline_assignment.test.ts`
- `tests/phase10_ops_fatigue.test.ts`
- `tests/attack_resource_aftermath.test.ts`
- `tests/combat_exhaustion.test.ts`

## Implementation Tasks

1. Add failing tests proving engaged brigades do not passively recover in the same tick.
2. Add tests for front-assigned but non-engaged brigade equilibrium.
3. Add aftermath/combat math tests for any changed fatigue constants.
4. Keep `engagedFormationIds` and `buildFrontlineAssignedFormationSet(state)` as the primary ownership signals.
5. Introduce or tune named constants for recovery interval/frontline duty drag.
6. Run 40w proof and document fatigue distribution before/after.

## Verification

- `npx.cmd vitest run tests/formation_fatigue_frontline_assignment.test.ts tests/phase10_ops_fatigue.test.ts tests/attack_resource_aftermath.test.ts tests/combat_exhaustion.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run sim:scenario:run:40w`

## Documentation And Ledger

- Update force-quality/fatigue report.
- Update `docs/40_reports/REAL_WAR_MASTER.md` if calibration changes.
- Add `docs/PROJECT_LEDGER.md` behavior entry.

## Stop Gates

- Stop for runaway fatigue, no visible combat effect, or globally blocked commanders.
- Stop if ordering changes introduce nondeterminism.
