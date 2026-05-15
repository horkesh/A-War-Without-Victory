# Commander Build Operations Profile Split

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1777`
**Baseline:** n1776, final hash `7ef09f55d6494edd`
**Result:** n1777, final hash `7ef09f55d6494edd`

## Summary
- Split `emitCommanderOutput.buildOperations` into default-off plan/probe profile sub-buckets behind `PERF_PROFILE_BOT_ORDERS=true`.
- The profiled n1777 proof preserved the final hash and showed `buildOperations.probe.deriveObjectives` dominates this bucket.
- This is instrumentation only; it identifies the next CPU lane rather than claiming a speed win.

## Changes Made
### Commander Emit Profiling
- Added `BUILD_OPERATIONS_PROFILE_PREFIX` in `src/sim/combat/commander/emit.ts`.
- Timed plan-path sub-buckets: `.plan.activeSlotUsers`, `.plan.primaryPool`, `.plan.attachedPool`, `.plan.reachableEnemyOsids`, `.plan.objectives`, and `.plan.buildOperation`.
- Timed probe-path sub-buckets: `.probe.cooldown`, `.probe.selectBrigade`, `.probe.deriveObjectives`, `.probe.reachability`, and `.probe.buildProbeOperation`.

### Regression Guard
- Extended `tests/bot_orders_perf_profile.test.ts` so the static profiling contract covers the new labels.
- Red-first proof: the test failed before implementation on missing `BUILD_OPERATIONS_PROFILE_PREFIX`.

## Scenario Results
### Determinism
- Command: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs`
- Result run: `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1777`
- Final state hash: `7ef09f55d6494edd`, matching n1776.

### Profile Signal
| Label | Count | Total ns | Mean ns | P95 ns |
|-------|-------|----------|---------|--------|
| `commander.runCommanderForCorps.decide.emitCommanderOutput.buildOperations` | 668 | 293,331,400 | 439,118 | 1,638,000 |
| `.probe.deriveObjectives` | 344 | 257,392,900 | 748,235 | 1,894,100 |
| `.probe.selectBrigade` | 357 | 6,019,700 | 16,861 | 48,300 |
| `.plan.attachedPool` | 34 | 2,233,500 | 65,691 | 196,300 |
| `.plan.buildOperation` | 14 | 1,656,700 | 118,335 | 540,700 |
| `.probe.cooldown` | 638 | 1,643,300 | 2,575 | 6,200 |
| `.probe.buildProbeOperation` | 45 | 1,134,100 | 25,202 | 60,600 |
| `.plan.primaryPool` | 34 | 1,037,200 | 30,505 | 123,800 |
| `.probe.reachability` | 50 | 737,200 | 14,744 | 43,100 |
| `.plan.reachableEnemyOsids` | 15 | 348,800 | 23,253 | 148,600 |
| `.plan.activeSlotUsers` | 40 | 230,500 | 5,762 | 11,100 |
| `.plan.objectives` | 15 | 192,800 | 12,853 | 73,700 |

`probe.deriveObjectives` is the only sub-bucket large enough to justify another pass. The plan-path labels are small in this run and should not be the next target without new evidence.

## Validation
- `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` failed red on missing `BUILD_OPERATIONS_PROFILE_PREFIX`.
- `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` passed after implementation: 5/5.
- `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts tests\commander\operation_emit_overlap_guards.test.ts tests\commander\corridor_quality_guard.test.ts tests\commander\elite_formation_utilization.test.ts --reporter=dot` passed: 49/49.
- `npm.cmd run typecheck` passed.
- `npx.cmd vitest run tests\commander\commander.test.ts --reporter=dot` passed: 54/54.
- Profiled 40w n1777 passed with final hash `7ef09f55d6494edd`.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/commander/emit.ts` | Added default-off profile sub-buckets under `buildOperations`. |
| `tests/bot_orders_perf_profile.test.ts` | Added static guard for the new labels. |
| `docs/40_reports/implemented/20260515_COMMANDER_BUILD_OPERATIONS_PROFILE_SPLIT.md` | New implementation report. |

## Next Steps
- Start the next CPU lane inside `buildOperations.probe.deriveObjectives`.
- First inspect whether `buildTerrainCache(...)`, `predictAllAdjacentTargets(...)`, or candidate ranking dominates that sub-bucket before attempting a candidate optimization.
- Keep the same proof standard: red guard where applicable, focused emit tests, typecheck, profiled 40w proof, and final hash match.
