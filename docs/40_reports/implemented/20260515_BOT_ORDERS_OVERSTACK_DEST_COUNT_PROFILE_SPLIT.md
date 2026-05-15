# Bot Orders Overstack Destination-Count Profile Split

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1827`
**Baseline:** n1826 direct-objective officer lookup, final hash `0cb626c032204372`
**Result:** n1827 kept final hash `0cb626c032204372`

## Summary
- Added a default-off profile label around the overstack redistribution destination-count check in `evaluateSectorMarch(...)`.
- The split showed destination-count checks are not the residual overstack hotspot after the count-cache lane.
- This lane is retained as instrumentation, not as a wall-clock optimization.

## Changes Made
### Overstack Destination Count Label
- `src/sim/combat/bot_brigade_eval_front.ts`
  - Wraps the candidate destination count expression in `sectorMarchProfileTime('.overstackRedistribution.destCount', ...)`.
  - Leaves the existing `columnAssignments` arrival adjustment in place.
  - Preserves the existing overstack destination/pathfinding branch order.

### Profile Guard
- `tests/bot_orders_perf_profile.test.ts`
  - Guards `.overstackRedistribution.destCount` so future attribution does not silently disappear.

## Scenario Results
### 40w Profile
- Final state hash: `0cb626c032204372`
- Anchor checks: 26/27
- Bot benchmarks: 6/6
- Anomalies: 9 total, 0 critical, 2 warnings

### Overstack Attribution
- `.sectorMarch`: 128.344ms / 7,377 calls
- `.sectorMarch.overstackRedistribution`: 23.589ms / 5,573 calls
- `.overstackRedistribution.countHere`: 2.831ms / 5,573 calls
- `.overstackRedistribution.rankCandidates`: 1.472ms / 774 calls
- `.overstackRedistribution.destination`: 0.708ms / 23 calls
- New `.overstackRedistribution.destCount`: 0.503ms / 1,081 calls

The new destination-count label is small. Residual `overstackRedistribution` time is not explained by the candidate destination count loop, so the next lane should use fresh attribution before attempting another overstack-specific cache.

## Verification
- Red first: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` failed because `.overstackRedistribution.destCount` was not present.
- Green focused guard: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` passed 5/5.
- Typecheck: `npm.cmd run typecheck` passed.
- Profile: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs` produced n1827 with final hash `0cb626c032204372`.

## Lessons Learned
- After the n1805 count-cache lane, overstack destination-count checks are too small to justify an optimization by themselves.
- Do not infer that residual parent overstack time belongs to pathfinding without a deeper split; the visible children explain only a minority of the parent bucket.
- Keep this label as cheap evidence for future profiles, but choose the next CPU lane from the top fresh profile rather than from stale overstack assumptions.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/bot_brigade_eval_front.ts` | Adds `.overstackRedistribution.destCount` profiling around the candidate destination count check. |
| `tests/bot_orders_perf_profile.test.ts` | Guards the new profile label. |
| `docs/40_reports/implemented/20260515_BOT_ORDERS_OVERSTACK_DEST_COUNT_PROFILE_SPLIT.md` | Records n1827 evidence and follow-up guidance. |

## Next Steps
- Use a fresh profile for the next CPU lane.
- Current n1827 top buckets point at `sectorMarch`, `sectorAttack`, `homeDefense`, `defensive`, and `uncontestedOccupation` shared work.
- If revisiting overstack, split the parent further before optimizing pathfinding or candidate-loop mechanics.
