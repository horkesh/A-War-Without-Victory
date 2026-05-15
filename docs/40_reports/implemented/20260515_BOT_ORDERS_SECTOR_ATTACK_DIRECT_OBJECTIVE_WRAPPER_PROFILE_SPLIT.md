# Bot Orders Sector Attack Direct-Objective Wrapper Profile Split

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1829`
**Baseline:** n1828 sectorMarch residual profile split, final hash `0cb626c032204372`
**Result:** n1829 kept final hash `0cb626c032204372`

## Summary
- Split the sector-attack direct-objective wrapper into local gate checks and the direct predictor call.
- The direct predictor call accounts for nearly all of the wrapper time.
- This lane is retained as instrumentation, not as a wall-clock optimization.

## Changes Made
### Direct-Objective Wrapper Labels
- `src/sim/combat/bot_brigade_eval_attack.ts`
  - Adds `.sectorAttack.executionDirectObjective.gates` around avoided-OSID, controller, and alliance gate checks.
  - Adds `.sectorAttack.executionDirectObjective.predict` around the direct `predictCombatOutcome(...)` call.
  - Keeps existing predictor-internal labels under `.sectorAttack.executionDirectObjective.predictCombatOutcome.*`.

### Profile Guard
- `tests/bot_orders_perf_profile.test.ts`
  - Guards the new wrapper labels.

## Scenario Results
### 40w Profile
- Final state hash: `0cb626c032204372`
- Anchor checks: 26/27
- Bot benchmarks: 6/6
- Anomalies: 9 total, 0 critical, 2 warnings

### Direct-Objective Attribution
- `.sectorAttack`: 75.460ms / 3,088 calls
- `.sectorAttack.executionDirectObjective`: 40.794ms / 107 calls
- New `.sectorAttack.executionDirectObjective.predict`: 39.897ms / 107 calls
- New `.sectorAttack.executionDirectObjective.gates`: 0.178ms / 107 calls
- `.predictCombatOutcome.rankDefendersByPower`: 16.034ms / 104 calls
- `.rankDefendersByPower.computeDefenderPower`: 14.119ms / 104 calls
- `.predictCombatOutcome.sectorDefensePower`: 4.218ms / 104 calls
- `.predictCombatOutcome.attackerPower`: 3.329ms / 107 calls

The wrapper gate checks are not worth optimizing. Future sectorAttack CPU work should focus on the predictor child labels or broader operation-planning path labels, not the local direct-objective gates.

## Verification
- Red first: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` failed because `.sectorAttack.executionDirectObjective.gates` was missing.
- Green focused guard: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` passed 5/5.
- Typecheck: `npm.cmd run typecheck` passed.
- Profile: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs` produced n1829 with final hash `0cb626c032204372`.

## Lessons Learned
- Sector-attack direct-objective local gate checks are negligible.
- The direct objective wrapper is predictor-bound; the retained `predict` label provides a parent for child-label comparisons.
- Next work should choose between predictor internals (`rankDefendersByPower`, `sectorDefensePower`, `attackerPower`) and larger shared buckets such as `homeDefense.uncontestedOccupation`.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/bot_brigade_eval_attack.ts` | Adds direct-objective gate and predict wrapper labels. |
| `tests/bot_orders_perf_profile.test.ts` | Guards the new wrapper labels. |
| `docs/40_reports/implemented/20260515_BOT_ORDERS_SECTOR_ATTACK_DIRECT_OBJECTIVE_WRAPPER_PROFILE_SPLIT.md` | Records n1829 evidence and follow-up guidance. |

## Next Steps
- Do not optimize direct-objective gate checks without new evidence.
- If staying in sectorAttack, inspect direct predictor child labels: defender ranking, sector defense power, or attacker power.
- Otherwise pivot to `homeDefense.uncontestedOccupation` or defensive shared work from the fresh top profile.
