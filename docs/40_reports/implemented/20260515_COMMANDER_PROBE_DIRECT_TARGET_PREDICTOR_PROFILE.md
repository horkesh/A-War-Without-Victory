# Commander Probe Direct Target Predictor Profile

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1779`
**Baseline:** n1778, final hash `7ef09f55d6494edd`
**Result:** n1779, final hash `7ef09f55d6494edd`

## Summary
- Replaced the probe objective path's whole-neighbor `predictAllAdjacentTargets(...)` call with direct prediction over the already-filtered direct target set.
- Preserved the final hash and reduced the measured probe objective bucket from 263.514ms to 244.752ms in the profiled 40w proof.
- The remaining cost is still inside direct combat prediction, so the next lane needs deeper predictor internals rather than more caller-side filtering.

## Changes Made
### Probe Predictor Narrowing
- Added `predictDirectEnemyTargets(...)` in `src/sim/combat/commander/emit.ts`.
- The helper preserves the same political-controller filter used by `predictAllAdjacentTargets(...)`: null or own-faction controllers do not receive prediction entries.
- It calls `predictCombatOutcome(...)` only for direct probe objective candidates that can be consumed by the later `predictedTargetByOsid` lookup.

### Regression Guard
- Updated `tests/bot_orders_perf_profile.test.ts` so commander emit must use `.probe.deriveObjectives.predictDirectTargets`.
- The guard also prevents `predictAllAdjacentTargets` from returning to the commander emit path.

## Scenario Results
### Determinism
- Command: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs`
- Result run: `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1779`
- Final state hash: `7ef09f55d6494edd`, matching n1778.

### Profile Signal
| Label | n1778 total ns | n1779 total ns | Delta |
|-------|----------------|----------------|-------|
| `.probe.deriveObjectives` | 263,513,800 | 244,751,500 | -18,762,300 |
| `.probe.deriveObjectives.predict*` | 238,333,800 | 219,768,000 | -18,565,800 |

Current n1779 detail:

| Label | Count | Total ns | Mean ns | P95 ns |
|-------|-------|----------|---------|--------|
| `.probe.deriveObjectives` | 344 | 244,751,500 | 711,486 | 1,554,000 |
| `.probe.deriveObjectives.predictDirectTargets` | 335 | 219,768,000 | 656,023 | 1,457,000 |
| `.probe.deriveObjectives.rankTargets` | 335 | 8,140,500 | 24,300 | 70,600 |
| `.probe.deriveObjectives.enemyTargets` | 335 | 2,904,500 | 8,670 | 17,700 |
| `.probe.deriveObjectives.directEnemyTargets` | 335 | 1,899,700 | 5,670 | 9,800 |
| `.probe.deriveObjectives.predictedTargetMap` | 335 | 755,900 | 2,256 | 3,500 |
| `.probe.deriveObjectives.terrainCache` | 335 | 655,200 | 1,955 | 3,600 |
| `.probe.deriveObjectives.pickObjective` | 335 | 341,900 | 1,020 | 1,700 |

## Validation
- Red first: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` failed on missing `.probe.deriveObjectives.predictDirectTargets`.
- Green static guard: same command passed 5/5.
- Focused commander regression: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts tests\commander\operation_emit_overlap_guards.test.ts tests\commander\corridor_quality_guard.test.ts tests\commander\elite_formation_utilization.test.ts tests\commander\commander.test.ts --reporter=dot` passed 103/103.
- `npm.cmd run typecheck` passed.
- Profiled 40w n1779 passed with final hash `7ef09f55d6494edd`.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/commander/emit.ts` | Replaced whole-neighbor probe prediction with direct-target prediction. |
| `tests/bot_orders_perf_profile.test.ts` | Added static guard for the direct-target predictor shape. |
| `docs/40_reports/implemented/20260515_COMMANDER_PROBE_DIRECT_TARGET_PREDICTOR_PROFILE.md` | New implementation report. |

## Next Steps
- Split or optimize `predictCombatOutcome(...)` internals for the probe path; caller-side filtering is no longer the dominant opportunity.
- Preserve the same proof standard: red guard, focused commander tests, typecheck, profiled 40w proof, and final hash match against `7ef09f55d6494edd`.
