# Commander Probe Derive Objectives Profile Split

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1778`
**Baseline:** n1777, final hash `7ef09f55d6494edd`
**Result:** n1778, final hash `7ef09f55d6494edd`

## Summary
- Split `buildOperations.probe.deriveObjectives` into default-off internal profile sub-buckets behind `PERF_PROFILE_BOT_ORDERS=true`.
- The profiled n1778 proof preserved the final hash and showed `predictAllAdjacentTargets(...)` dominates probe objective derivation.
- This is instrumentation only; it narrows the next CPU lane without changing probe objective semantics.

## Changes Made
### Commander Emit Profiling
- Timed terrain-cache construction as `.probe.deriveObjectives.terrainCache`.
- Timed enemy-front candidate collection as `.probe.deriveObjectives.enemyTargets`.
- Timed direct-adjacent target filtering as `.probe.deriveObjectives.directEnemyTargets`.
- Timed the current full-neighborhood predictor call as `.probe.deriveObjectives.predictAllAdjacentTargets`.
- Timed prediction map construction, target ranking, and final objective selection as `.predictedTargetMap`, `.rankTargets`, and `.pickObjective`.

### Regression Guard
- Extended `tests/bot_orders_perf_profile.test.ts` so the static profiling contract covers the new derive-objective sublabels.
- Red-first proof: the test failed before implementation on missing `.probe.deriveObjectives.terrainCache`.

## Scenario Results
### Determinism
- Command: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs`
- Result run: `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1778`
- Final state hash: `7ef09f55d6494edd`, matching n1777.

### Profile Signal
| Label | Count | Total ns | Mean ns | P95 ns |
|-------|-------|----------|---------|--------|
| `.probe.deriveObjectives` | 344 | 263,513,800 | 766,028 | 1,789,000 |
| `.probe.deriveObjectives.predictAllAdjacentTargets` | 335 | 238,333,800 | 711,444 | 1,728,100 |
| `.probe.deriveObjectives.rankTargets` | 335 | 8,388,700 | 25,040 | 68,000 |
| `.probe.deriveObjectives.enemyTargets` | 335 | 2,865,800 | 8,554 | 17,300 |
| `.probe.deriveObjectives.directEnemyTargets` | 335 | 1,804,800 | 5,387 | 9,700 |
| `.probe.deriveObjectives.predictedTargetMap` | 335 | 875,700 | 2,614 | 4,500 |
| `.probe.deriveObjectives.terrainCache` | 335 | 737,200 | 2,200 | 4,000 |
| `.probe.deriveObjectives.pickObjective` | 335 | 393,400 | 1,174 | 2,100 |

`predictAllAdjacentTargets(...)` accounts for about 238.334ms of the 263.514ms derive-objective bucket in this proof. Terrain-cache construction, direct-target filtering, ranking, and map/slice output are all too small to justify optimization first.

## Validation
- `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` failed red on missing `.probe.deriveObjectives.terrainCache`.
- `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` passed after implementation: 5/5.
- `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts tests\commander\operation_emit_overlap_guards.test.ts tests\commander\corridor_quality_guard.test.ts tests\commander\elite_formation_utilization.test.ts tests\commander\commander.test.ts --reporter=dot` passed: 103/103.
- `npm.cmd run typecheck` passed.
- Profiled 40w n1778 passed with final hash `7ef09f55d6494edd`.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/commander/emit.ts` | Added default-off profile sub-buckets inside probe objective derivation. |
| `tests/bot_orders_perf_profile.test.ts` | Added static guard for the new labels. |
| `docs/40_reports/implemented/20260515_COMMANDER_PROBE_DERIVE_OBJECTIVES_PROFILE_SPLIT.md` | New implementation report. |

## Next Steps
- Target the predictor cost directly: avoid whole-neighbor prediction in probe objective derivation when the already-sorted direct target set is sufficient.
- Preserve deterministic ordering and same-hash proof; the next lane should compare final hash to `7ef09f55d6494edd`.
- Do not optimize terrain cache, ranking, or map/slice output before new evidence changes the ranking.
