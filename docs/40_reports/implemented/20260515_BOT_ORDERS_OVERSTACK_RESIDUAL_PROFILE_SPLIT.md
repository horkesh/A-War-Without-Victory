# Bot Orders Overstack Residual Profile Split

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1832`
**Baseline:** n1831 defensive sector lookup cache rejection, final hash `0cb626c032204372`
**Result:** Retained instrumentation-only split; n1832 kept final hash `0cb626c032204372`

## Summary
- Added default-off timing labels inside the remaining `evaluateSectorMarch(...)` overstack redistribution parent.
- Split the residual into a gate wrapper and a candidate-loop wrapper while preserving the existing count, rank, destination-count, and destination labels.
- The profile shows the overstack residual is mostly gate/profiler overhead, not destination counting or pathfinding.

## Implementation
### Overstack Gate
- Wrapped the eligibility check in `.overstackRedistribution.gate`.
- The gate includes the existing `columnAssignments` departure lookup, `.overstackRedistribution.countHere`, and the `frontSet.size > 1` check.
- It preserves the same effective-count semantics: planned departures still reduce the current OSID count through `Math.min(0, plannedDepartures)`.

### Candidate Loop
- Wrapped the existing candidate iteration and movement write in `.overstackRedistribution.candidateLoop`.
- The loop still evaluates ranked candidates in the same order, preserves the destination-count capacity guard, runs the same destination lookup, and writes the same column-march/posture orders.
- Same-turn `columnAssignments` departure/arrival updates are unchanged.

## Scenario Results
### 40w Profile
- Final state hash: `0cb626c032204372`
- Anchor checks: 26/27
- Bot benchmarks: 6/6
- Anomalies: 9 total, 0 critical, 2 warnings

### Key Timings
- `.overstackRedistribution`: 39.023ms / 5,573 calls
- `.overstackRedistribution.gate`: 17.214ms / 5,573 calls
- `.overstackRedistribution.candidateLoop`: 4.956ms / 774 calls
- `.overstackRedistribution.countHere`: 3.269ms / 5,573 calls
- `.overstackRedistribution.rankCandidates`: 1.586ms / 774 calls
- `.overstackRedistribution.destCount`: 0.566ms / 1,081 calls
- `.overstackRedistribution.destination`: 0.755ms / 23 calls

## Interpretation
- Destination-count checks and destination pathfinding remain too small to justify optimization.
- The new gate label explains the largest visible child label, but it mostly wraps already-cheap checks and an existing nested count label.
- The parent remains nested-profiler inflated after adding more child timers; this is attribution, not a wall-clock regression signal.

## Verification
- Red first: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` failed because `.overstackRedistribution.gate` was missing.
- Green focused guard: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` passed 5/5.
- Typecheck: `npm.cmd run typecheck` passed.
- Profile: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs` produced n1832 with final hash `0cb626c032204372`.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/bot_brigade_eval_front.ts` | Adds gate and candidate-loop timing labels around existing overstack redistribution logic. |
| `tests/bot_orders_perf_profile.test.ts` | Guards the new source-level profile labels. |
| `docs/40_reports/implemented/20260515_BOT_ORDERS_OVERSTACK_RESIDUAL_PROFILE_SPLIT.md` | Records n1832 results and interpretation. |

## Next Steps
- Do not optimize overstack destination count, candidate ranking, or destination pathfinding from this evidence.
- Treat remaining `sectorMarch` parent totals as nested-profiler inflated unless a fresh wall-clock profile says otherwise.
- Choose the next CPU lane from a fresh top profile; current larger candidates include `sectorAttack.executionDirectObjective.predict`, `homeDefense.uncontestedOccupation`, officer-index net cost, and remaining defensive/uncontested shared work.
