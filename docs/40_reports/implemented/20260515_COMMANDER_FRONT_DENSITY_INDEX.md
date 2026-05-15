# Commander Front-Density Index

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1794`
**Baseline:** n1788, final hash `7ef09f55d6494edd`
**Result:** n1794, final hash `7ef09f55d6494edd`

## Summary
- Added a sector-local front-density lookup for multi-defender direct-probe ranking.
- Cut the measured front-density subpath from 15.177ms to 3.174ms including index-build cost.
- Rejected the first full-state index attempt because it moved more cost into index construction than it removed.
- Kept the final-save hash unchanged.

## Changes Made
### Sector-Local Density Lookup
- `local_front_defense.ts` now exposes `buildLocalFrontDensityModifierByFormationIdForSector(...)`, which computes the current sector's density modifier once and maps each assigned brigade id to that value.
- `getLocalFrontDensityModifier(...)` accepts an optional precomputed lookup while preserving the existing sorted-sector scan path for all current callers.
- `computeDefenderPower(...)` accepts the optional lookup as a final parameter and forwards it only into the existing front-density step.
- `combat_predictor.ts` builds the sector-local lookup only for multi-defender sector ranking in the direct-probe path.

### Regression Guards
- `tests/local_front_density_modifier_precedence.test.ts` verifies repeated modifier reads against a precomputed sector lookup do not re-read sector assignment arrays.
- `tests/bot_orders_perf_profile.test.ts` guards the direct-probe wiring and retains the `.rankDefendersByPower.frontDensityIndex` profile label.

## Scenario Results
### Determinism
- Command: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs`
- Result run: `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1794`
- Final state hash: `7ef09f55d6494edd`, matching n1788.
- Hash class: unchanged.

### Direct Predictor Metrics
| Label | n1788 total ns | n1794 total ns | Delta |
|-------|----------------|----------------|-------|
| `.rankDefendersByPower` | 88,417,400 | 83,109,300 | -5,308,100 |
| `.rankDefendersByPower.computeDefenderPower` | 81,697,300 | 74,042,300 | -7,655,000 |
| `.rankDefendersByPower.computeDefenderPower.frontDensity` | 15,176,900 | 2,250,900 | -12,926,000 |
| `.rankDefendersByPower.frontDensityIndex` | n/a | 922,600 | +922,600 |
| Front-density net | 15,176,900 | 3,173,500 | -12,003,400 |

The first candidate, a full-state density index, was rejected after n1793: `.frontDensity` fell to 2.239ms, but `.frontDensityIndex` cost 16.929ms, making the rank bucket slower overall.

## Validation
- Red first: `npx.cmd vitest run tests\local_front_density_modifier_precedence.test.ts --reporter=dot` failed on missing `buildLocalFrontDensityModifierByFormationId`.
- Green helper guard: same test passed 4/4.
- Red predictor wiring guard: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` failed until the predictor built and passed the lookup.
- Rejected full-state index after n1793 profile showed net regression.
- Red revised guard: focused tests failed until the sector-local builder existed and the predictor passed the resolved sector.
- Focused green: `npx.cmd vitest run tests\local_front_density_modifier_precedence.test.ts tests\bot_orders_perf_profile.test.ts --reporter=dot` passed 9/9.
- Commander regression: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts tests\local_front_density_modifier_precedence.test.ts tests\commander\operation_emit_overlap_guards.test.ts tests\commander\corridor_quality_guard.test.ts tests\commander\elite_formation_utilization.test.ts tests\commander\commander.test.ts --reporter=dot` passed 107/107 before the sector-local rewrite; final focused guards were rerun after the rewrite.
- `npm.cmd run typecheck` passed.
- Focused combat/profile pack: `npx.cmd vitest run tests\local_front_density_modifier_precedence.test.ts tests\bot_orders_perf_profile.test.ts tests\docs_desktop_v09_truth.test.ts tests\commander\operation_emit_overlap_guards.test.ts tests\commander\corridor_quality_guard.test.ts tests\commander\elite_formation_utilization.test.ts tests\commander\commander.test.ts --reporter=dot` passed 113/113.
- Profiled 40w n1794 passed with final hash `7ef09f55d6494edd`.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/local_front_defense.ts` | Adds sector-local density lookup builder and optional lookup consumption. |
| `src/sim/combat/combat_math.ts` | Threads optional density lookup through defender power. |
| `src/sim/combat/combat_predictor.ts` | Builds sector-local lookup for multi-defender direct-probe ranking. |
| `tests/local_front_density_modifier_precedence.test.ts` | Adds no-rescan guard for precomputed lookup reads. |
| `tests/bot_orders_perf_profile.test.ts` | Guards predictor wiring and profile label shape. |

## Next Steps
- Target `getThreeTierOfficerMod(...)` lookup cost next; it remains the leading defender-power internal at 23.404ms in n1794.
- Do not build full-state front-density indexes in this path; the measured sector-local form is the winning shape.
