# Bot Orders Sector Attack Direct Prediction

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1814`
**Baseline:** n1813 sector-attack profile split, final hash `0cb626c032204372`
**Result:** n1814 final hash `0cb626c032204372`

## Summary
- Replaced eager full-neighbor prediction in `evaluateSectorAttack(...)` execution with a direct current-objective prediction when the brigade is tactically adjacent to the objective.
- Deferred `predictAllAdjacentTargets(...)` until the attack-through fallback after friendly objective-approach pathing fails.
- Cut `sectorAttack` from 126.089ms to 61.800ms while preserving final-state hash and anchor status.

## Changes Made
### Direct Objective Prediction
- Imported `predictCombatOutcome(...)` into `bot_brigade_eval_attack.ts`.
- Added `.sectorAttack.executionDirectObjective` around the direct current-objective prediction.
- Preserved the existing avoid-list, null-controller, own/friendly controller, and RBiH-HRHB combat-gate behavior before predicting.

### Deferred Attack-Through Prediction
- Moved the full `predictAllAdjacentTargets(...)` call below objective approach pathing.
- Kept `.sectorAttack.executionPredictTargets` for the full-neighbor attack-through fallback, but the n1814 40w run did not hit that branch.
- Kept intermediate target filtering and outcome checks unchanged when the fallback branch does run.

### Regression Guard
- Extended `tests/bot_orders_perf_profile.test.ts` to require `.sectorAttack.executionDirectObjective`, `predictCombatOutcome(...)` in `evaluateSectorAttack(...)`, and full-neighbor prediction after approach pathing.
- Red proof: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` failed on missing `.sectorAttack.executionDirectObjective`.
- Green proof: focused profile/staging tests and typecheck passed after implementation.

## Profile Results
The n1814 proof kept final hash `0cb626c032204372`, matching n1813/n1812/n1811/n1810/n1809/n1808/n1807/n1806/n1805/n1804/n1803/n1802.

| Label | n1813 Total ns | n1814 Total ns | Delta |
|---|---:|---:|---:|
| `bot_orders.executeFactionDirectives.eval.sectorAttack` | 126,089,200 | 61,799,800 | -64.289ms |
| `.sectorAttack.executionPredictTargets` | 94,286,200 | 0 | -94.286ms |
| `.sectorAttack.executionDirectObjective` | 0 | 30,441,800 | +30.442ms |
| `bot_orders.executeFactionDirectives.evaluators` | 733,338,200 | 670,871,100 | -62.467ms |
| `bot_orders.executeFactionDirectives.total` | 980,382,400 | 919,104,200 | -61.278ms |

Current sector-attack sub-labels in n1814:

| Label | Count | Total ns | Mean ns | p95 ns |
|---|---:|---:|---:|---:|
| `.sectorAttack.executionDirectObjective` | 107 | 30,441,800 | 284,502 | 439,200 |
| `.sectorAttack.planningApproachPath` | 121 | 6,074,400 | 50,201 | 199,400 |
| `.sectorAttack.planningApproaches` | 287 | 3,436,200 | 11,972 | 18,200 |
| `.sectorAttack.executionApproachPath` | 65 | 2,967,300 | 45,650 | 116,100 |
| `.sectorAttack.executionAdjacentParticipants` | 107 | 1,362,400 | 12,732 | 22,400 |
| `.sectorAttack.executionTacticalAdjacency` | 172 | 1,034,400 | 6,013 | 8,200 |
| `.sectorAttack.offAssignedFront` | 3,088 | 887,400 | 287 | 400 |
| `.sectorAttack.executionApproachOsids` | 65 | 639,700 | 9,841 | 13,500 |

Current top bot-order evaluator buckets in n1814:

| Label | Total ns |
|---|---:|
| `sectorMarch` | 128,263,000 |
| `defensive` | 100,884,600 |
| `pocketEvacuation` | 89,140,900 |
| `homeDefense` | 85,414,600 |
| `sectorAttack` | 61,799,800 |

## Determinism
- The change only reorders when prediction work is performed in branches where the old prediction result was unused unless the attack-through fallback ran.
- Direct objective prediction calls the same `predictCombatOutcome(...)` used by `predictAllAdjacentTargets(...)` for that objective, with the same state, adjacency, reverse map, terrain, supply, population, and ethnic inputs.
- No `GameState` fields, save schema, candidate ordering, movement-order writes, attack-order writes, RNG behavior, or serialization format changed.
- Profiled n1814 final hash `0cb626c032204372` confirms serialized output parity.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_eval_attack.ts` | Uses direct objective prediction and defers full-neighbor prediction to attack-through fallback. |
| `tests/bot_orders_perf_profile.test.ts` | Guards the direct/fallback prediction split. |

## Next Steps
- Use a fresh profile before selecting the next bot-order target.
- Current top bot-order pressure has shifted back to `sectorMarch`, followed by `defensive`, `pocketEvacuation`, and `homeDefense`; sectorAttack is no longer the leading evaluator.
