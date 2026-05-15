# Bot Orders Return-To-Corps Roster Cache

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1811`
**Baseline:** n1810 return-to-corps profile split, final hash `0cb626c032204372`
**Result:** n1811 final hash `0cb626c032204372`

## Summary
- Reused the existing pass-local `sectorAssignmentByBrigade` cache for return-to-corps roster membership checks.
- Preserved direct-call fallback behavior: when no cached membership signal is provided, `evaluateReturnToCorps(...)` still scans sector rosters as before.
- Reduced `.returnToCorps.rosterScan` from 144.998ms in n1810 to 1.002ms in n1811 while keeping the final state hash stable.

## Changes Made
### Cached Roster Membership
- Updated `evaluateReturnToCorps(...)` to read `ctx.sectorAssignment` for the assigned/reserve roster check when the order-pass cache is present.
- Kept the legacy all-sector assigned/reserve scan for direct callers where `sectorAssignment` is `undefined`.
- Preserved assigned/reserve semantics: any cached sector assignment means the brigade is already rostered and should not be recalled as an orphan.

### Regression Guard
- Extended `tests/elite_loan_return_to_corps.test.ts` with a cached-membership case that fails if the evaluator ignores `ctx.sectorAssignment`.
- Red proof: `npx.cmd vitest run tests\elite_loan_return_to_corps.test.ts --reporter=dot` failed because the evaluator still routed an already-cached brigade.
- Green proof: focused return-to-corps and profile wiring tests passed after implementation.

## Profile Results
The n1811 proof kept final hash `0cb626c032204372`, matching n1810/n1809/n1808/n1807/n1806/n1805/n1804/n1803/n1802.

| Label | Count | Total ns | Mean ns | p95 ns |
|---|---:|---:|---:|---:|
| `bot_orders.executeFactionDirectives.eval.returnToCorps` | 7,231 | 47,788,700 | 6,608 | 25,100 |
| `.returnToCorps.territoryCheck` | 972 | 20,088,600 | 20,667 | 39,200 |
| `.returnToCorps.bfs` | 51 | 3,371,400 | 66,105 | 334,800 |
| `.returnToCorps.collectTargets` | 83 | 2,814,600 | 33,910 | 63,200 |
| `.returnToCorps.rosterScan` | 7,231 | 1,002,300 | 138 | 200 |
| `.returnToCorps.walkBack` | 34 | 50,400 | 1,482 | 3,500 |

Compared with n1810:
- `.returnToCorps.rosterScan`: 144.998ms -> 1.002ms.
- `returnToCorps` parent: 190.872ms -> 47.789ms.
- `bot_orders.executeFactionDirectives.evaluators`: 901.777ms -> 732.966ms.
- `bot_orders.executeFactionDirectives.total`: 1,151.786ms -> 979.235ms.

## Determinism
- The reused `sectorAssignmentByBrigade` cache is built once per faction directive pass from sector IDs sorted with `strictCompare`.
- The change reads an existing pass-local cache and does not mutate `GameState`, save schema, sector ordering, BFS behavior, movement-order writes, RNG behavior, or serialization.
- Profiled n1811 final hash `0cb626c032204372` confirms serialized output parity.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_eval_front.ts` | Uses cached sector membership for return-to-corps roster checks with legacy fallback. |
| `tests/elite_loan_return_to_corps.test.ts` | Guards cached-membership skip behavior. |

## Next Steps
- Use a fresh profile before selecting the next bot-order target.
- Current top bot-order evaluator candidates are `sectorMarch` (145.870ms), `sectorAttack` (117.043ms), `defensive` (95.075ms), `pocketEvacuation` (87.660ms), and `homeDefense` (84.950ms).
- Do not revisit return-to-corps roster membership unless it resurfaces in a fresh profile.
