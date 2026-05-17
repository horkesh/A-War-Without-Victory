# Operation Stall Backlog Lane

**Date:** 2026-05-18
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1872`
**Baseline:** Open VRS Corridor 92 and ARBiH zero-attack stall plans.
**Result:** Focused launch/queue diagnostics implemented; parent 40w smoke hash `42607f83870e01d5` with 27/27 anchors and 6/6 benchmarks.

## Summary
- VRS 1st Krajina queued operations now leave typed status when Corridor/Jajce/Bosanski Novi are skipped because all queued objectives are already RS-held, preventing silent historical queue disappearance.
- ARBiH-style zero-attack launch stalls now classify opening-attack blockers as `participants_below_attack_floor`, `no_approach_osid`, or `zero_eligible_axis` before entering execution.
- Axis AARs preserve `launch_blocker` alongside `unreachable_at_launch` for post-run diagnosis.

## Changes Made
### Launch And Queue Diagnostics
- Added deterministic opening-attack readiness classification in `sector_offensive_launch_helpers`.
- Wired planning lifecycle recovery to typed launch blockers instead of generic `no_launch_readiness` where the cause is known.
- Added queued-operation warnings for below-floor participants and already-owned queued objectives.
- Kept queued operation iteration on `strictCompare`.

### Tests
- Added ARBiH launch-gate fixtures for all-understrength participants and no approach OSID.
- Added VRS 1KK queue proof that Corridor injects after Prijedor vacates slot 0 while preserving the remaining queue.
- Added Corridor moot-status proof for already-held objectives.

## Scenario Results
- `npx.cmd vitest run tests/pre_planned_operations.test.ts tests/operation_execution_staging_truth.test.ts tests/operation_progress_replacement_truth.test.ts tests/scenario_operation_diagnostics.test.ts`: 41/41 tests passed.
- `npx.cmd vitest run tests/scenario_vrs_operation_proof.test.ts`: 1/1 test passed.
- `npm.cmd run sim:scenario:run:40w`: parent integration run completed as n1872; final hash `42607f83870e01d5`, 27/27 anchors, 6/6 benchmarks.
- 40w final save contains `Operation Corridor` warning: `all_objectives_owned`, turn 5, all 9 objectives already RS-controlled.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/sector_offensive_launch_helpers.ts` | Added typed opening-attack readiness classifier. |
| `src/sim/combat/sector_offensive.ts` | Uses typed launch blockers during planning recovery. |
| `src/sim/combat/pre_planned_operations.ts` | Emits non-silent queued-operation blocker/status warnings. |
| `src/sim/combat/operation_validation.ts` | Adds queued participant blocker warning type. |
| `src/sim/combat/operation_aar.ts` | Carries axis launch blocker into AAR. |
| `src/state/game_state.ts` | Adds typed fields for launch blockers/recovery reasons. |
| `src/sim/turn_phases/war_phases.ts` | Uses `strictCompare` for queued-operation corps iteration. |
| `tests/pre_planned_operations.test.ts` | Adds VRS 1KK queue and Corridor status coverage. |
| `tests/operation_execution_staging_truth.test.ts` | Adds launch blocker regression coverage. |

## Next Steps
- Parent integration kept `data/derived/latest_run_final_save.json` as the n1872 fixture refresh for this batch.
- A later realism lane should decide whether Corridor objectives being already RS-held by turn 5 is desirable data/tempo, but this lane now classifies it explicitly instead of forcing a historical outcome.
