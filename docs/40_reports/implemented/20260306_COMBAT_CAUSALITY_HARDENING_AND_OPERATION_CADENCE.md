# Combat Causality Hardening and Operation Cadence

**Date:** 2026-03-06
**Run ID:** `apr1992_definitive_40w__7c821fa7d934716d__w40_n113`
**Baseline:** `n111` (`55` attack orders, `47` battles, `invalid_operation_count = 4`, invalid for mixed real/false-positive execution failures)
**Result:** `n113` (`60` attack orders, `51` battles, `invalid_operation_count = 0`, still invalid only for isolated `zero_battles` weeks)

## Summary

- Narrowed combat-causality diagnostics so execution-phase operation maneuver turns are no longer mislabeled as stalled combat.
- Shortened sector-offensive dead time by allowing a staged force to leave planning early once all assigned brigades have actually reached the staging OSID.
- Verified the fixes with focused regression tests, typecheck, and fresh 40-week scenario runs (`n112`, `n113`).

## Changes Made

### 1. Combat-causality diagnostics

- Added `movement_orders_by_brigade` to the scenario harness order snapshot in `src/scenario/combat_causality.ts`.
- Added `movement_order_count` to per-operation diagnostics.
- Changed the invalidation rule so `execution_without_attack_orders` only fires when an execution-phase operation has neither attack orders nor movement orders.
- Kept `attack_orders_without_battles` unchanged for real “order emitted, nothing resolved” cases.

### 2. Sector-offensive cadence

- Added `areParticipantsStaged(...)` in `src/sim/combat/sector_offensive.ts`.
- Updated `advanceSectorOffensives(...)` so a `sector_attack` in planning may transition to execution early when:
  - at least one full planning turn has elapsed, and
  - all active participating brigades are already at `staging_osid`.
- This preserves the one-turn staging discipline while removing long idle planning tails after the force is already assembled.

### 3. Regression coverage

- `tests/scenario_operation_diagnostics.test.ts`
  - added a regression that proves a maneuver-only execution turn is not invalid combat causality.
- `tests/sector_offensive.test.ts`
  - added a regression that proves staged operations can leave planning early.
- Existing operation-focus coverage remained green in `tests/bot_operation_objective_focus.test.ts`.

## Scenario Results

### Combat-causality progression

| Run | Attack Orders | Battles | Invalid Operation Count | Status |
|-----|---------------|---------|-------------------------|--------|
| `n111` | 55 | 47 | 4 | Invalid; mixed real stalls and false-positive diagnostics |
| `n112` | 55 | 47 | 0 | Invalid only for `zero_battles` weeks |
| `n113` | 60 | 51 | 0 | Invalid only for `zero_battles` weeks; improved cadence |

### Key behavioral evidence

- `Operation Foca` turn 3 and `Operation Prijedor` turn 5 were confirmed as maneuver turns, not dead execution.
- `Operacija Lukavac` was the real cadence case:
  - before the planning fix it sat staged but idle until turn 16
  - after the fix it entered execution on turn 12
  - this increased total RS activity and removed the lingering invalid-operation flags

### Remaining failure mode

- `combat_causality.invalid_operation_count` is now `0`.
- The scenario still fails the combat-calibration gate because some weeks remain entirely battleless.
- That makes the next debugging lane a cadence/overlap problem, not an operation-ownership problem.

## Lessons Learned

- A zero-attack execution turn is not automatically a bug; operation-owned maneuver must be distinguished from inert execution.
- Fixed-duration planning can become design debt once staged movement works correctly, because the engine then creates empty weeks after the force is already ready.
- The current highest-value metric split is:
  - operation deadlock / invalid execution windows
  - whole-run or whole-week battle cadence

## Files Changed

| File | Change |
|------|--------|
| `src/scenario/combat_causality.ts` | Added movement-aware combat-causality diagnostics |
| `src/sim/combat/sector_offensive.ts` | Added early planning→execution transition for fully staged operations |
| `tests/scenario_operation_diagnostics.test.ts` | Added maneuver-turn regression |
| `tests/sector_offensive.test.ts` | Added early-staged transition regression |
| `docs/40_reports/CALIBRATION_MASTER.md` | Recorded narrowed failure mode and `n113` result |
| `docs/PROJECT_LEDGER.md` | Logged code/tests/runs and remaining risk |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Added reusable sector/operation gotchas |
| `.claude/napkin.md` | Added runbook notes for maneuver turns and staged planning exits |

## Verification

- `cmd /c node_modules\.bin\vitest.cmd run tests\scenario_operation_diagnostics.test.ts`
- `cmd /c node_modules\.bin\tsx.cmd --test tests\sector_offensive.test.ts`
- `cmd /c node_modules\.bin\tsx.cmd --test tests\bot_operation_objective_focus.test.ts`
- `cmd /c npm run typecheck`
- `cmd /c npm run sim:scenario:run:40w -- --scenario data/scenarios/apr1992_definitive_40w.json --unique --out runs`

## Next Steps

- Reduce isolated `zero_battles` weeks by improving offensive cadence overlap across corps and between planning/recovery windows.
- Audit whether recovery durations are too long relative to successful short operations.
- Check whether more than one corps can maintain offensive pressure without waiting for the previous sector operation to fully clear.
