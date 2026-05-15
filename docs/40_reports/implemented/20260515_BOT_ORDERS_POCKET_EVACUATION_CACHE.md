# Bot Orders Pocket Evacuation Sector Cache

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1815`
**Baseline:** n1814 sectorAttack direct prediction, final hash `0cb626c032204372`
**Result:** n1815 final hash `0cb626c032204372`

## Summary
- Reused the pass-local `sectorAssignment` cache inside `evaluatePocketEvacuation(...)` instead of rescanning every corps-front sector roster for every brigade.
- Preserved the previous assigned-only semantics by rejecting cached reserve membership and keeping the sorted roster-scan fallback for direct callers without a cache.
- Cut `pocketEvacuation` from 89.141ms to 19.739ms while preserving final-state hash and anchor status.

## Changes Made
### Cached Sector Assignment
- `evaluatePocketEvacuation(...)` now reads `ctx.sectorAssignment` when the directive pass supplies it.
- Cached assigned-sector hits go straight to the existing tiny-pocket and home-evacuation checks.
- Cached reserve membership returns `false`, matching the old scan that only considered `assigned_brigade_ids`.

### Direct-Caller Fallback
- The legacy sorted sector scan remains when `sectorAssignment === undefined`.
- Added `.pocketEvacuation.assignedSectorLookup` profile attribution around both fallback and cached lookup paths.

### Regression Guard
- Extended `tests/tooth_guard.test.ts` with a cached-assignment case whose raw sector roster intentionally omits the brigade. The test fails before the cache is honored and passes after implementation.
- Extended `tests/bot_orders_perf_profile.test.ts` to require the new pocket-evacuation profile label.

## Profile Results
The n1815 proof kept final hash `0cb626c032204372`, matching n1814/n1813/n1812/n1811/n1810/n1809/n1808/n1807/n1806/n1805/n1804/n1803/n1802.

| Label | n1814 Total ns | n1815 Total ns | Delta |
|---|---:|---:|---:|
| `bot_orders.executeFactionDirectives.eval.pocketEvacuation` | 89,140,900 | 19,739,300 | -69.402ms |
| `.pocketEvacuation.assignedSectorLookup` | 0 | 849,100 | +0.849ms |
| `bot_orders.executeFactionDirectives.evaluators` | 670,871,100 | 594,846,300 | -76.025ms |
| `bot_orders.executeFactionDirectives.total` | 919,104,200 | 836,077,200 | -83.027ms |

Pocket-evacuation lookup attribution in n1815:

| Label | Count | Total ns | Mean ns | p95 ns | Max ns |
|---|---:|---:|---:|---:|---:|
| `.pocketEvacuation.assignedSectorLookup` | 7,197 | 849,100 | 117 | 200 | 9,100 |

Current top bot-order evaluator buckets in n1815:

| Label | Total ns |
|---|---:|
| `sectorMarch` | 125,810,100 |
| `defensive` | 96,382,400 |
| `homeDefense` | 87,721,000 |
| `homeDefense.uncontestedOccupation` | 75,134,000 |
| `pocketEvacuation` | 19,739,300 |

## Determinism
- The sector-assignment cache is built once per faction directive pass from sector IDs sorted with `strictCompare`.
- The evaluator only reads the cache and does not mutate `GameState`, save schema, movement-order sequencing beyond the already-existing evacuation write, RNG state, or serialization format.
- Reserve semantics are explicitly preserved by returning `false` when the cached assignment is reserve membership.
- Profiled n1815 final hash `0cb626c032204372` confirms serialized output parity.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_eval_front.ts` | Uses pass-local sector assignment in `evaluatePocketEvacuation(...)` with fallback roster scan and profile attribution. |
| `tests/tooth_guard.test.ts` | Adds a red-green cache-use regression for pocket evacuation. |
| `tests/bot_orders_perf_profile.test.ts` | Guards the pocket-evacuation assignment-lookup label. |

## Next Steps
- Use a fresh profile before selecting the next bot-order target.
- Current top bot-order pressure after n1815 is `sectorMarch`, `defensive`, and `homeDefense`; `pocketEvacuation` is no longer a leading evaluator.
