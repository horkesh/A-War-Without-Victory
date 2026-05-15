# Bot Orders Overstack Count Cache

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1805`
**Baseline:** n1804 overstack split, final hash `0cb626c032204372`
**Result:** n1805 final hash `0cb626c032204372`

## Summary
- Replaced repeated same-corps OSID formation scans in `sectorMarch.overstackRedistribution` with one per-faction order-pass count cache.
- Preserved overstack semantics, including active `brigade` / `og` / `operational_group` filtering and the no-corps all-faction fallback.
- Reduced `.overstackRedistribution.countHere` from 189.557ms in n1804 to 3.615ms in n1805 while preserving the final state hash.

## Changes Made
### Count Cache
- Added `buildCorpsBrigadeCountsByOsid(...)` and `getCorpsBrigadeCountAtOsid(...)` in `bot_brigade_context.ts`.
- Built the cache once in `executeFactionDirectivesImpl(...)` for the faction order pass and threaded it through `BrigadeEvaluationContext`.
- Updated the overstack redistribution path to read from the cache while keeping `columnAssignments` as the same mutable per-turn departure/arrival adjustment.

### Regression Guard
- Added `tests/bot_brigade_context_counts.test.ts` to prove cached counts match `countCorpsBrigadesAtOsid(...)` for same-corps counts, all-faction fallback counts, ignored militia, destroyed formations, and other-faction formations.
- Red proof: `npx.cmd vitest run tests\bot_brigade_context_counts.test.ts --reporter=dot` failed on the missing exported cache builder.
- Green proof: the focused cache test and bot-order guard suite passed after implementation.

## Profile Results
The n1805 proof kept final hash `0cb626c032204372`, matching n1804/n1803/n1802.

| Label | Count | Total ns | Mean ns | p95 ns |
|---|---:|---:|---:|---:|
| `bot_orders.executeFactionDirectives.eval.sectorMarch` | 7,377 | 226,873,000 | 30,754 | 50,000 |
| `.retroactiveTooth` | 5,692 | 82,802,000 | 14,547 | 26,600 |
| `.overstackRedistribution` | 5,573 | 24,234,100 | 4,348 | 9,900 |
| `.assignedSectorLookup` | 856 | 21,503,300 | 25,120 | 40,600 |
| `.overstackRedistribution.countHere` | 5,573 | 3,614,700 | 648 | 1,200 |
| `.overstackRedistribution.rankCandidates` | 774 | 1,772,100 | 2,289 | 4,400 |
| `.overstackRedistribution.destination` | 23 | 808,700 | 35,160 | 96,100 |

Compared with n1804:
- `.overstackRedistribution.countHere`: 189.557ms -> 3.615ms.
- `.overstackRedistribution.rankCandidates`: 27.299ms -> 1.772ms because candidate sort reads the same cache.
- `.overstackRedistribution`: 264.194ms -> 24.234ms.

## Determinism
- The cache is rebuilt from `state.military.formations` for each faction pass and iterates formation IDs with `strictCompare`.
- The cached counts mirror the old scanner's filters and do not mutate during evaluation; planned same-turn departures/arrivals remain represented only by `columnAssignments`.
- No scenario data, combat math, target ordering, save schema, serialization format, or RNG path changed.
- Profiled n1805 final hash `0cb626c032204372` confirms serialized output parity.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_context.ts` | Added corps/OSID count cache builder and lookup helper. |
| `src/sim/combat/bot_brigade_ai_osid.ts` | Builds the cache once per faction directive pass and threads it through evaluator context. |
| `src/sim/combat/bot_brigade_eval_types.ts` | Adds optional cache field to `BrigadeEvaluationContext`. |
| `src/sim/combat/bot_brigade_eval_front.ts` | Reads cached same-corps counts in overstack redistribution while preserving fallback scanner behavior for direct tests. |
| `tests/bot_brigade_context_counts.test.ts` | Guards cache semantics against the legacy scanner. |

## Next Steps
- Use a fresh profile before choosing the next CPU lane.
- Based on n1805, likely next bot-order targets are `.retroactiveTooth` at 82.802ms and `.assignedSectorLookup` at 21.503ms.
- Do not revisit overstack destination pathfinding without new evidence; it remains below 1ms in the latest proof.
