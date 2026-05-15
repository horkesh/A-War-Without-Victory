# Bot Orders Sector March Assignment Cache

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1812`
**Baseline:** n1811 return-to-corps roster cache, final hash `0cb626c032204372`
**Result:** n1812 final hash `0cb626c032204372`

## Summary
- Updated `evaluateSectorMarch(...)` to treat cached `sectorAssignment: null` as an authoritative no-assignment result.
- Preserved direct-call fallback behavior: only `sectorAssignment === undefined` triggers the legacy all-sector assigned/reserve lookup.
- Removed the `.sectorMarch.assignedSectorLookup` work from the main order pass while keeping the final state hash stable.

## Changes Made
### Cached Null Assignment
- Changed the fallback condition from `!sectorAssignment` to `sectorAssignment === undefined`.
- The main order pass always supplies either a cache entry or `null`, so cached misses no longer rescan every sector.
- Direct callers that omit `sectorAssignment` still use the legacy scan.

### Regression Guard
- Extended `tests/tooth_guard.test.ts` with a cached-null sector assignment case that fails if `evaluateSectorMarch(...)` falls back to scanning sector rosters.
- Red proof: `npx.cmd vitest run tests\tooth_guard.test.ts --reporter=dot` failed because the evaluator still scanned despite cached `null`.
- Green proof: focused sector-march and profile wiring tests passed after implementation.

## Profile Results
The n1812 proof kept final hash `0cb626c032204372`, matching n1811/n1810/n1809/n1808/n1807/n1806/n1805/n1804/n1803/n1802.

| Label | n1811 Total ns | n1812 Total ns | Delta |
|---|---:|---:|---:|
| `.sectorMarch.assignedSectorLookup` | 19,336,800 | 0 | -19.337ms |
| `bot_orders.executeFactionDirectives.eval.sectorMarch` | 145,870,000 | 128,024,600 | -17.845ms |
| `bot_orders.executeFactionDirectives.evaluators` | 732,966,100 | 729,800,200 | -3.166ms |
| `bot_orders.executeFactionDirectives.total` | 979,234,600 | 978,691,000 | -0.544ms |

Current sector-march sub-labels in n1812:

| Label | Count | Total ns | Mean ns | p95 ns |
|---|---:|---:|---:|---:|
| `.overstackRedistribution` | 5,573 | 21,484,600 | 3,855 | 8,600 |
| `.retroactiveTooth` | 5,692 | 16,359,100 | 2,874 | 1,800 |
| `.sectorReassignment` | 7,377 | 3,112,000 | 421 | 300 |
| `.overstackRedistribution.countHere` | 5,573 | 3,002,100 | 538 | 900 |
| `.offAssignedFront` | 7,377 | 1,812,000 | 245 | 400 |

## Determinism
- The reused sector assignment cache is built once per faction directive pass from sector IDs sorted with `strictCompare`.
- The change only distinguishes cache miss (`null`) from cache absent (`undefined`) and does not mutate `GameState`, save schema, sector ordering, movement-order writes, RNG behavior, or serialization.
- Profiled n1812 final hash `0cb626c032204372` confirms serialized output parity.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_eval_front.ts` | Uses cached null sector assignment to skip fallback assigned-sector lookup. |
| `tests/tooth_guard.test.ts` | Guards cached-null assignment semantics. |

## Next Steps
- Use a fresh profile before selecting the next bot-order target.
- Current top bot-order evaluator candidates are `sectorAttack`, `defensive`, `homeDefense`, and `pocketEvacuation`; sectorMarch no longer has the redundant assignment lookup.
