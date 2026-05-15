# Bot Orders Return-To-Corps Territory Cache

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1821`
**Baseline:** n1820 adjacent-enemy cache, final hash `0cb626c032204372`
**Result:** n1821 final hash `0cb626c032204372`

## Summary
- Added a pass-local corps-territory lookup keyed by corps id.
- Reused that lookup inside `evaluateReturnToCorps(...)` for both current-location territory membership and BFS target collection.
- Cut the return-to-corps territory sub-labels while preserving final-state hash, anchor status, and benchmark status.

## Changes Made
### Corps-Territory Index
- Added `buildCorpsTerritoryOsidsByCorps(...)` in `bot_brigade_context.ts`.
- The helper reads `state.military.corps_front_sectors`, iterates sector ids with `strictCompare`, sorts territory OSIDs with `strictCompare`, and returns a corps-sorted `Map<string, Set<Osid>>`.
- Empty or absent sector state returns an empty map, preserving direct-call fallback behavior.

### Order-Pass Reuse
- `executeFactionDirectivesImpl(...)` builds `corpsTerritoryOsidsByCorps` once per faction directive pass.
- `BrigadeEvaluationContext` now carries the optional cache for hot evaluators.
- `evaluateReturnToCorps(...)` uses the cache for `.returnToCorps.territoryCheck` and `.returnToCorps.collectTargets`; direct callers without the cache still use sorted legacy sector scans.
- Elite reserve loan behavior is unchanged: on-loan elites still resolve target territory through `loaned_to_corps`.

### Regression Guard
- Extended `tests/elite_loan_return_to_corps.test.ts` with a red-green cache-consumption regression.
- Added helper coverage proving deterministic cache key/value order.
- Extended `tests/bot_orders_perf_profile.test.ts` to guard order-loop cache construction and evaluator cache reads.

## Profile Results
The n1821 proof kept final hash `0cb626c032204372`, matching n1820/n1819/n1818/n1817/n1815/n1814/n1813/n1812/n1811/n1810/n1809/n1808/n1807/n1806/n1805/n1804/n1803/n1802.

| Label | Baseline | n1821 | Delta |
|---|---:|---:|---:|
| `bot_orders.executeFactionDirectives.eval.returnToCorps` | 46.883ms (n1820) | 25.514ms | -21.369ms |
| `.returnToCorps.territoryCheck` | 20.496ms (n1820) | 1.072ms | -19.424ms |
| `.returnToCorps.collectTargets` | 2.815ms (latest exact prior split n1811) | 0.684ms | -2.131ms |
| `bot_orders.executeFactionDirectives.evaluators` | 503.935ms (n1820) | 480.012ms | -23.923ms |
| `bot_orders.executeFactionDirectives.total` | 766.933ms (n1820) | 771.974ms | +5.041ms |

The full `total` bucket was run-noisy and slightly higher in n1821, so this lane should be read as a targeted evaluator/sub-label reduction rather than an end-to-end total wall-clock win.

Current top bot-order evaluator buckets in n1821:

| Label | Total ns |
|---|---:|
| `sectorMarch` | 126,656,300 |
| `sectorAttack` | 61,428,000 |
| `homeDefense` | 60,442,400 |
| `defensive` | 47,930,000 |
| `homeDefense.uncontestedOccupation` | 47,666,500 |
| `uncontestedOccupation` | 34,349,800 |
| `sectorAttack.executionDirectObjective` | 30,246,500 |
| `returnToCorps` | 25,514,100 |

## Scenario Results
- Final hash: `0cb626c032204372`
- Anchors: 26/27
- Benchmarks: 6/6
- Anomaly reports: 9 total, 2 warnings, 0 critical

## Determinism
- The cache is built from sector ids and territory OSIDs sorted with `strictCompare`.
- The evaluator only reads the pass-local cache and does not mutate `GameState`, save schema, movement-order sequencing, RNG state, or serialization.
- Fallback scans remain for direct callers that omit the cache.
- Profiled n1821 final hash `0cb626c032204372` confirms serialized output parity.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_context.ts` | Adds deterministic corps-territory cache builder. |
| `src/sim/combat/bot_brigade_ai_osid.ts` | Builds and threads the pass-local cache through brigade evaluation context. |
| `src/sim/combat/bot_brigade_eval_types.ts` | Adds optional context field for corps-territory cache. |
| `src/sim/combat/bot_brigade_eval_front.ts` | Reads cached corps territory in return-to-corps territory check and target collection. |
| `tests/elite_loan_return_to_corps.test.ts` | Adds red-green cache consumption and helper ordering coverage. |
| `tests/bot_orders_perf_profile.test.ts` | Guards cache wiring in the order loop and evaluator. |

## Next Steps
- Use a fresh profile before selecting the next bot-order target.
- Current top bot-order pressure after n1821 is `sectorMarch`, `sectorAttack`, `homeDefense`, and `defensive`; `returnToCorps` is no longer a leading parent bucket.
