# Bot Orders Defensive Profile Split

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1817`
**Baseline:** n1815 pocket-evacuation cache, final hash `0cb626c032204372`
**Result:** n1817 final hash `0cb626c032204372`

## Summary
- Added default-off profile attribution inside `evaluateDefensive(...)` for deep-rear checks, retreat counterattacks, front-gap handling, and nested uncontested occupation.
- Preserved branch order and command-writing behavior; the only runtime effect under the flag is profiler timing output.
- Identified `.defensive.frontGapCountHere` as the leading measured sub-label at 50.198ms.

## Changes Made
### Defensive Sub-Labels
- Added `DEFENSIVE_PROFILE_PREFIX` and `defensiveProfileTime(...)` in `bot_brigade_eval_attack.ts`.
- Split self-retreat counterattack prediction and sector lookup labels.
- Split sector-retreat counterattack sector lookup, target collection, and prediction labels.
- Split front-gap defender count and front-gap search labels.
- Wrapped nested `evaluateUncontestedOccupation(...)` under `.defensive.uncontestedOccupation`.

### Regression Guard
- Extended `tests/bot_orders_perf_profile.test.ts` to require every defensive sub-label.
- Red proof: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` failed on missing `DEFENSIVE_PROFILE_PREFIX`.
- Green proof: the same focused test passed after implementation.

## Profile Results
The n1817 proof kept final hash `0cb626c032204372`, matching n1815/n1814/n1813/n1812/n1811/n1810/n1809/n1808/n1807/n1806/n1805/n1804/n1803/n1802.

| Label | n1815 Total ns | n1817 Total ns | Delta |
|---|---:|---:|---:|
| `bot_orders.executeFactionDirectives.eval.defensive` | 96,382,400 | 105,075,700 | +8.693ms |
| `bot_orders.executeFactionDirectives.evaluators` | 594,846,300 | 605,365,000 | +10.519ms |
| `bot_orders.executeFactionDirectives.total` | 836,077,200 | 857,886,600 | +21.809ms |

The parent increase is expected nested profiler overhead; sub-label totals drive lane selection.

| Defensive Label | Count | Total ns | Mean ns | p95 ns |
|---|---:|---:|---:|---:|
| `.defensive.frontGapCountHere` | 1,365 | 50,197,700 | 36,774 | 51,600 |
| `.defensive.uncontestedOccupation` | 1,353 | 23,665,500 | 17,491 | 39,100 |
| `.defensive.sectorCounterAttackSectorLookup` | 1,287 | 11,516,300 | 8,948 | 13,400 |
| `.defensive.frontGapSearch` | 297 | 3,828,300 | 12,889 | 46,100 |
| `.defensive.sectorCounterAttackPredictTargets` | 4 | 2,273,400 | 568,350 | 768,600 |
| `.defensive.sectorCounterAttackCollectTargets` | 6 | 496,200 | 82,700 | 210,600 |
| `.defensive.deepRearNearFront` | 78 | 174,800 | 2,241 | 3,200 |

Current top bot-order evaluator buckets in n1817:

| Label | Total ns |
|---|---:|
| `sectorMarch` | 130,368,000 |
| `defensive` | 105,075,700 |
| `homeDefense` | 84,866,600 |
| `homeDefense.uncontestedOccupation` | 71,705,600 |
| `uncontestedOccupation` | 50,187,400 |

## Determinism
- Profiling remains gated by `PERF_PROFILE_BOT_ORDERS=true` and writes only `data/derived/_debug/bot_orders_perf_profile.json`.
- Wrappers preserve branch order, sorted candidate filters, movement/posture/attack-order writes, RNG behavior, save schema, and serialization.
- Profiled n1817 final hash `0cb626c032204372` confirms serialized output parity.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_eval_attack.ts` | Adds default-off defensive sub-label profile wrappers. |
| `tests/bot_orders_perf_profile.test.ts` | Guards the defensive profile labels. |

## Next Steps
- Optimize `.defensive.frontGapCountHere` first; it repeatedly counts all faction brigades at the current OSID and is the only large defensive sub-label in n1817.
- Treat nested profiler parent totals as overhead-inflated and compare any optimization against a fresh same-hash profile.
