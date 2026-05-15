# Bot Orders Adjacent-Enemy Cache

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1820`
**Baseline:** n1819 uncontested sector-defense cache, final hash `0cb626c032204372`
**Result:** n1820 final hash `0cb626c032204372`

## Summary
- Added a pass-local adjacent-enemy lookup keyed by brigade location OSID.
- Reused that lookup inside `executeFactionDirectivesImpl(...)` instead of recomputing tactical adjacency and controller filters for every brigade at the same location.
- Cut `adjacentEnemyScan` from 63.837ms to 2.468ms while preserving final-state hash and anchor status.

## Changes Made
### Adjacent-Enemy Index
- Added `buildAdjacentEnemyOsidsByLoc(...)` in `bot_brigade_context.ts`.
- The helper deduplicates locations, sorts them with `strictCompare`, and reuses the existing `getAdjacentEnemyOsids(...)` semantics for each unique location.
- Tactical war-front edges remain included because `getAdjacentEnemyOsids(...)` still routes through `getTacticalAdjacentOsids(...)`.

### Order-Pass Reuse
- `executeFactionDirectivesImpl(...)` builds the adjacent-enemy lookup once per faction directive pass from the sorted brigade list.
- Each brigade now reads `adjacentEnemyByLoc.get(loc)` inside the existing `adjacentEnemyScan` profile wrapper, with the legacy scan retained as a fallback.

### Regression Guard
- Added `tests/adjacent_enemy_cache.test.ts`.
- Extended `tests/bot_orders_perf_profile.test.ts` to guard that the order loop uses `buildAdjacentEnemyOsidsByLoc(...)` and `adjacentEnemyByLoc.get(loc)`.
- Red proof: the focused suite failed before implementation because the helper did not exist and the order loop was not wired to it.

## Profile Results
The n1820 proof kept final hash `0cb626c032204372`, matching n1819/n1818/n1817/n1815/n1814/n1813/n1812/n1811/n1810/n1809/n1808/n1807/n1806/n1805/n1804/n1803/n1802.

| Label | n1819 Total ns | n1820 Total ns | Delta |
|---|---:|---:|---:|
| `bot_orders.executeFactionDirectives.adjacentEnemyScan` | 63,836,700 | 2,467,700 | -61.369ms |
| `bot_orders.executeFactionDirectives.eval.sectorMarch` | 127,875,900 | 124,675,200 | -3.201ms |
| `bot_orders.executeFactionDirectives.eval.homeDefense` | 66,859,400 | 61,250,800 | -5.609ms |
| `bot_orders.executeFactionDirectives.eval.defensive` | 50,625,300 | 48,897,800 | -1.728ms |
| `bot_orders.executeFactionDirectives.evaluators` | 517,579,300 | 503,935,400 | -13.644ms |
| `bot_orders.executeFactionDirectives.total` | 792,167,100 | 766,932,500 | -25.235ms |

Current top bot-order evaluator buckets in n1820:

| Label | Total ns |
|---|---:|
| `sectorMarch` | 124,675,200 |
| `sectorAttack` | 62,543,300 |
| `homeDefense` | 61,250,800 |
| `defensive` | 48,897,800 |
| `homeDefense.uncontestedOccupation` | 48,387,600 |
| `returnToCorps` | 46,882,700 |
| `uncontestedOccupation` | 34,957,100 |

## Determinism
- The lookup is built from the already-sorted faction brigade list and deduplicated locations sorted with `strictCompare`.
- Each cached value is produced by the legacy adjacent-enemy helper, preserving tactical war-front edge inclusion, controller filtering, and sorted output.
- The evaluator only reads the cache and does not mutate `GameState`, save schema, order sequencing, RNG state, or serialization.
- Profiled n1820 final hash `0cb626c032204372` confirms serialized output parity.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_context.ts` | Adds the adjacent-enemy cache builder. |
| `src/sim/combat/bot_brigade_ai_osid.ts` | Builds and reads the pass-local adjacent-enemy cache. |
| `tests/adjacent_enemy_cache.test.ts` | Adds a red-green regression for cached tactical adjacent enemies. |
| `tests/bot_orders_perf_profile.test.ts` | Guards order-loop cache wiring. |

## Next Steps
- Use a fresh profile before selecting the next bot-order target.
- Current bot-order pressure after n1820 is `sectorMarch`, `sectorAttack`, `homeDefense`, `defensive`, and `returnToCorps`.
