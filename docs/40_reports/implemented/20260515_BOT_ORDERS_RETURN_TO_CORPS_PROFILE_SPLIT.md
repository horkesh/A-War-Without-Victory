# Bot Orders Return-To-Corps Profile Split

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1810`
**Baseline:** n1809 uncontested defender index, final hash `0cb626c032204372`
**Result:** n1810 final hash `0cb626c032204372`

## Summary
- Split the `evaluateReturnToCorps(...)` evaluator with default-off sub-labels for roster membership scans, corps-territory checks, target collection, BFS, and path walk-back.
- Identified repeated sector roster membership scans as the dominant return-to-corps cost.
- Kept serialized output stable: n1810 matched the n1809/n1808 final hash `0cb626c032204372`.

## Changes Made
### Return-To-Corps Attribution
- Added `RETURN_TO_CORPS_PROFILE_PREFIX` and `returnToCorpsProfileTime(...)`.
- Wrapped the all-sector assigned/reserve membership scan as `.returnToCorps.rosterScan`.
- Wrapped target-corps territory membership as `.returnToCorps.territoryCheck`.
- Wrapped corps-territory target collection as `.returnToCorps.collectTargets`.
- Wrapped friendly-territory BFS and first-step walk-back as `.returnToCorps.bfs` and `.returnToCorps.walkBack`.

### Regression Guard
- Extended `tests/bot_orders_perf_profile.test.ts` to require the new prefix and all five return-to-corps sub-labels.
- Red proof: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` failed on missing `RETURN_TO_CORPS_PROFILE_PREFIX`.
- Green proof: focused profile and elite-loan return-to-corps tests passed after implementation.

## Profile Results
The n1810 proof kept final hash `0cb626c032204372`, matching n1809/n1808/n1807/n1806/n1805/n1804/n1803/n1802.

| Label | Count | Total ns | Mean ns | p95 ns |
|---|---:|---:|---:|---:|
| `bot_orders.executeFactionDirectives.eval.returnToCorps` | 7,231 | 190,871,600 | 26,396 | 50,300 |
| `.returnToCorps.rosterScan` | 7,231 | 144,998,100 | 20,052 | 29,100 |
| `.returnToCorps.territoryCheck` | 972 | 18,271,200 | 18,797 | 34,500 |
| `.returnToCorps.bfs` | 51 | 3,413,300 | 66,927 | 314,400 |
| `.returnToCorps.collectTargets` | 83 | 2,590,000 | 31,204 | 60,700 |
| `.returnToCorps.walkBack` | 34 | 53,800 | 1,582 | 4,200 |

Top evaluator context in n1810:
- `returnToCorps`: 190.872ms parent total; nested timing overhead makes parent-to-n1809 comparison noisy.
- `sectorMarch`: 153.087ms.
- `sectorAttack`: 120.389ms.
- `defensive`: 100.246ms.

## Determinism
- Profiling remains gated by `PERF_PROFILE_BOT_ORDERS=true` and writes only `data/derived/_debug/bot_orders_perf_profile.json`.
- The wrappers preserve the old branch order, `Object.values(sectors)` iteration, BFS queue behavior, movement-order writes, RNG behavior, save schema, and serialized state.
- Profiled n1810 final hash `0cb626c032204372` confirms serialized output parity.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_eval_front.ts` | Added return-to-corps sub-label profiling. |
| `tests/bot_orders_perf_profile.test.ts` | Added static guard coverage for return-to-corps profile labels. |

## Next Steps
- Optimize `.returnToCorps.rosterScan` with a deterministic pass-local sector membership index keyed by brigade id before touching BFS or corps target collection.
- Keep BFS and walk-back as non-targets unless a fresh profile says otherwise.
