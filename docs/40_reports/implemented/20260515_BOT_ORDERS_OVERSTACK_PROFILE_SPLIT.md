# Bot Orders Overstack Profile Split

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1804`
**Baseline:** n1803 sectorMarch split, final hash `0cb626c032204372`
**Result:** n1804 final hash `0cb626c032204372`

## Summary
- Split the hot `sectorMarch.overstackRedistribution` profile bucket into `countHere`, `rankCandidates`, and `destination` sub-buckets.
- Preserved simulation output: n1804 kept the same final hash as n1803/n1802.
- Identified the leading overstack cost as the initial same-corps OSID count, not candidate destination pathfinding.

## Changes Made
### Profiling
- Added nested default-off labels inside the existing `overstackRedistribution` block:
  - `.overstackRedistribution.countHere`
  - `.overstackRedistribution.rankCandidates`
  - `.overstackRedistribution.destination`
- Left the existing movement decision logic unchanged: same count helper, same candidate sort, same destination search, same `columnAssignments` updates.

### Regression Guard
- Extended `tests/bot_orders_perf_profile.test.ts` so the static profile-wiring guard requires the new overstack sub-labels.
- Red proof: the focused guard failed before the nested overstack labels existed.
- Green proof: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts tests\tooth_guard.test.ts tests\retroactive_tooth_eviction.test.ts --reporter=dot` passed 19/19, and `npm.cmd run typecheck` passed.

## Profile Results
The n1804 proof kept final hash `0cb626c032204372`, matching n1803/n1802.

| Label | Count | Total ns | Mean ns | p95 ns |
|---|---:|---:|---:|---:|
| `bot_orders.executeFactionDirectives.eval.sectorMarch` | 7,377 | 452,833,500 | 61,384 | 121,700 |
| `.overstackRedistribution` | 5,573 | 264,193,900 | 47,406 | 117,100 |
| `.overstackRedistribution.countHere` | 5,573 | 189,556,600 | 34,013 | 49,400 |
| `.retroactiveTooth` | 5,692 | 82,822,000 | 14,550 | 27,000 |
| `.overstackRedistribution.rankCandidates` | 774 | 27,299,200 | 35,270 | 148,100 |
| `.overstackRedistribution.destination` | 23 | 760,100 | 33,047 | 83,600 |

Nested profile overhead increased the parent `sectorMarch` and `overstackRedistribution` totals. The useful signal is the relative sub-label ranking: `countHere` dominates, candidate ranking is second, and destination pathfinding is negligible in this proof.

## Determinism
- No simulation rule, combat formula, target ordering, scenario data, serialization format, or save schema changed.
- Instrumentation remains behind `PERF_PROFILE_BOT_ORDERS=true` and writes only the existing debug profile JSON.
- Same final hash confirms the split did not alter serialized output.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_eval_front.ts` | Added nested overstack profile labels. |
| `tests/bot_orders_perf_profile.test.ts` | Added static guard coverage for overstack sub-labels. |
| `docs/40_reports/implemented/20260515_BOT_ORDERS_OVERSTACK_PROFILE_SPLIT.md` | This report. |

## Next Steps
- Optimize `.overstackRedistribution.countHere` first.
- Candidate shape: reuse or precompute same-corps active formation counts for the sector front OSIDs without changing the existing `columnAssignments` semantics.
- Do not prioritize destination pathfinding in overstack redistribution based on n1804; it fired only 23 times and cost 0.760ms.
