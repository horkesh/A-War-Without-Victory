# Bot Orders Home Defense Profile Split

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1807`
**Baseline:** n1806 retroactive-tooth sector cache, final hash `0cb626c032204372`
**Result:** n1807 final hash `0cb626c032204372`

## Summary
- Split `evaluateHomeDefense(...)` with default-off sub-labels for the deep-rear near-front check and nested uncontested occupation call.
- Proved the parent home-defense bucket is mostly delegated work: `homeDefense.uncontestedOccupation` accounts for 193.515ms of the 209.140ms parent total.
- Kept serialized simulation output byte-stable by leaving profiling behind `PERF_PROFILE_BOT_ORDERS=true`.

## Changes Made
### Home-Defense Attribution
- Added `HOME_DEFENSE_PROFILE_PREFIX` and `homeDefenseProfileTime(...)` to `bot_brigade_eval_attack.ts`.
- Wrapped the deep-rear "fall through to interior movement" test as `.homeDefense.deepRearNearFront`.
- Wrapped the home-defense call to `evaluateUncontestedOccupation(...)` as `.homeDefense.uncontestedOccupation`.
- Reduced `evaluateHomeDefense(...)` destructuring to the fields actually used by that function.

### Regression Guard
- Extended `tests/bot_orders_perf_profile.test.ts` to require the home-defense profile prefix and both sub-labels.
- Red proof: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` failed on missing `HOME_DEFENSE_PROFILE_PREFIX`.
- Green proof: the focused profile test passed after implementation.

## Profile Results
The n1807 proof kept final hash `0cb626c032204372`, matching n1806/n1805/n1804/n1803/n1802.

| Label | Count | Total ns | Mean ns | p95 ns |
|---|---:|---:|---:|---:|
| `bot_orders.executeFactionDirectives.eval.homeDefense` | 7,006 | 209,139,700 | 29,851 | 131,600 |
| `.homeDefense.uncontestedOccupation` | 3,662 | 193,515,300 | 52,844 | 150,900 |
| `bot_orders.executeFactionDirectives.eval.uncontestedOccupation` | 2,537 | 132,664,100 | 52,291 | 136,400 |
| `.homeDefense.deepRearNearFront` | 137 | 529,300 | 3,863 | 5,800 |

Top bot-order evaluator context in n1807:
- `homeDefense`: 209.140ms parent total, mostly nested uncontested occupation.
- `returnToCorps`: 174.536ms.
- `sectorMarch`: 155.357ms.
- Standalone `uncontestedOccupation`: 132.664ms.

## Determinism
- Profiling remains gated by `PERF_PROFILE_BOT_ORDERS=true` and writes only `data/derived/_debug/bot_orders_perf_profile.json`.
- The wrappers do not change iteration order, target selection, command output, save schema, scenario data, combat math, RNG, or serialized state.
- Profiled n1807 final hash `0cb626c032204372` confirms serialized output parity.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_eval_attack.ts` | Added home-defense sub-label profiling. |
| `tests/bot_orders_perf_profile.test.ts` | Added static guard coverage for home-defense profile labels. |

## Next Steps
- Treat local home-defense logic as a poor optimization target until new evidence says otherwise.
- Split or optimize shared `evaluateUncontestedOccupation(...)` next, because it accounts for most home-defense time and also appears as a standalone evaluator bucket.
