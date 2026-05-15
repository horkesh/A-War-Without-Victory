# Bot Orders Sector Attack Direct-Objective Profile Split

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1825`
**Baseline:** n1824 rejected salient-cache profile, final hash `0cb626c032204372`
**Result:** n1825 kept final hash `0cb626c032204372`

## Summary
- Threaded the existing optional `predictCombatOutcome(...)` profile-prefix hook into the sector-attack direct current-objective prediction path.
- Added a profile guard so future sector-attack direct-objective prediction work keeps nested predictor attribution visible.
- The split is instrumentation-only: it identifies defender ranking and defender-power computation as the leading direct-objective internals, but does not claim a wall-clock cut.

## Changes Made
### Sector Attack Profiling
- `src/sim/combat/bot_brigade_eval_attack.ts`
  - Added `SECTOR_ATTACK_DIRECT_OBJECTIVE_PREDICT_PROFILE_PREFIX`.
  - Passed that prefix into the direct `predictCombatOutcome(...)` call used when the current objective is directly attackable.
  - Preserved the existing direct-objective branch order, return behavior, fallback prediction path, order writes, RNG behavior, save schema, and serialization.

### Profile Guard
- `tests/bot_orders_perf_profile.test.ts`
  - Added a source guard for `.sectorAttack.executionDirectObjective.predictCombatOutcome` so this nested attribution remains wired.

## Scenario Results
### 40w Profile
- Final state hash: `0cb626c032204372`
- Anchor checks: 26/27
- Bot benchmarks: 6/6
- Anomalies: 9 total, 0 critical, 2 warnings

### Direct-Objective Attribution
- `.sectorAttack.executionDirectObjective`: 45.700ms / 107 calls
- `.sectorAttack.executionDirectObjective.predictCombatOutcome.rankDefendersByPower`: 22.117ms / 104 calls
- `.sectorAttack.executionDirectObjective.predictCombatOutcome.rankDefendersByPower.computeDefenderPower`: 20.229ms / 104 calls
- `.sectorAttack.executionDirectObjective.predictCombatOutcome.rankDefendersByPower.computeDefenderPower.officer`: 6.107ms / 434 calls
- `.sectorAttack.executionDirectObjective.predictCombatOutcome.sectorDefensePower`: 4.040ms / 104 calls
- `.sectorAttack.executionDirectObjective.predictCombatOutcome.attackerPower`: 2.988ms / 107 calls

The parent `sectorAttack` and `executionDirectObjective` labels are larger in n1825 because nested timing now runs inside the direct-objective call. Use the child labels for target selection, not the overhead-inflated parent labels.

## Verification
- Red first: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` failed on the missing `.sectorAttack.executionDirectObjective.predictCombatOutcome` profile hook.
- Green focused suite: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts tests/uncontested_occupation_priority.test.ts` passed 12/12.
- Typecheck: `npm.cmd run typecheck` passed.
- Profile: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs` produced n1825 with final hash `0cb626c032204372`.

## Lessons Learned
- The direct sector-attack objective path is still predictor-bound after the direct-prediction optimization; the leading child is defender ranking, not pathing or tactical adjacency.
- The next lane should inspect whether the predictor can reuse officer lookup, sector-local front-density, or defender-power context in this bot-order caller without copying the commander direct-probe cache shapes blindly.
- Parent timer increases are expected when adding nested labels inside a hot path; child totals are the decision surface for follow-up CPU work.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/bot_brigade_eval_attack.ts` | Threads direct-objective sector-attack predictor profiling into `predictCombatOutcome(...)`. |
| `tests/bot_orders_perf_profile.test.ts` | Guards the new nested direct-objective predictor label. |
| `docs/40_reports/implemented/20260515_BOT_ORDERS_SECTOR_ATTACK_DIRECT_OBJECTIVE_PROFILE_SPLIT.md` | Records n1825 profile evidence and follow-up guidance. |

## Next Steps
- Inspect the direct-objective `rankDefendersByPower.computeDefenderPower` internals before broad sector-attack work.
- Compare any proposed reuse/index candidate against n1825 with the same final-state hash gate.
- Avoid retrying the exact uncontested-salient cache shape rejected in n1824.
