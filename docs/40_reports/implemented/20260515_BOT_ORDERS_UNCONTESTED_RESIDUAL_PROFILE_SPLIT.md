# Bot Orders Uncontested Residual Profile Split

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1834`
**Baseline:** n1833 lazy officer lookup, final hash `0cb626c032204372`
**Result:** Retained instrumentation-only split; n1834 kept final hash `0cb626c032204372`

## Summary
- Added default-off residual labels inside shared `evaluateUncontestedOccupation(...)`.
- Split early function gates, the candidate loop, and local candidate gates while preserving caller-specific label prefixes.
- The profile confirms the broad candidate-loop wrapper is nested-profiler inflated; the useful local signal is candidate gate cost.

## Implementation
### Early Gates
- Added `.earlyGates` around the turn throttle, active-operation guard, and disrupted-brigade guard.
- The wrapper returns the same false result when any old early-return guard would have returned false.

### Candidate Loop
- Added `.candidateLoop` around the existing adjacent-neighbor iteration.
- The wrapper preserves neighbor order, all existing continue conditions, and the attack/posture write path.
- Because it wraps existing nested `.salient`, `.defenderScan`, and `.sectorDefense` timers, this parent label is expected to be overhead-inflated.

### Candidate Gates
- Added `.candidateGates` around local per-neighbor filters before salient checks: operational OSID gate, controller gate, HRHB/RBiH alliance guard, and enclave guard.
- The existing scenario avoid-list guard remains after the salient check, preserving the previous profile/order shape.

## Scenario Results
### 40w Profile
- Final state hash: `0cb626c032204372`
- Anchor checks: 26/27
- Bot benchmarks: 6/6
- Anomalies: 9 total, 0 critical, 2 warnings

### Key Timings
- `homeDefense.uncontestedOccupation`: 128.322ms / 3,662 calls
- `homeDefense.uncontestedOccupation.candidateLoop`: 105.288ms / 3,500 calls
- `homeDefense.uncontestedOccupation.candidateGates`: 11.581ms / 21,038 calls
- `homeDefense.uncontestedOccupation.salient`: 12.578ms / 5,699 calls
- `homeDefense.uncontestedOccupation.sectorDefense`: 3.611ms / 2,633 calls
- `homeDefense.uncontestedOccupation.defenderScan`: 1.642ms / 4,469 calls
- `homeDefense.uncontestedOccupation.earlyGates`: 1.455ms / 3,662 calls

Standalone and defensive callers show the same pattern:
- `eval.uncontestedOccupation.candidateLoop`: 73.126ms / 2,490 calls
- `eval.uncontestedOccupation.candidateGates`: 7.831ms / 15,265 calls
- `defensive.uncontestedOccupation.candidateLoop`: 35.740ms / 1,339 calls
- `defensive.uncontestedOccupation.candidateGates`: 2.903ms / 7,867 calls

## Interpretation
- `.candidateLoop` is an attribution wrapper, not a standalone optimization target, because it encloses nested child timers and raises the apparent parent total.
- `.earlyGates` is too small to optimize.
- `.candidateGates` is the only newly visible local cost with plausible follow-up value, but it should be split further before changing enclave/alliance/controller checks.

## Verification
- Red first: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` failed because `.earlyGates` was missing.
- Green focused guard: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` passed 5/5.
- Typecheck: `npm.cmd run typecheck` passed.
- Profile: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs` produced n1834 with final hash `0cb626c032204372`.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/bot_brigade_eval_attack.ts` | Adds residual timing labels inside `evaluateUncontestedOccupation(...)`. |
| `tests/bot_orders_perf_profile.test.ts` | Guards the new profile labels. |
| `docs/40_reports/implemented/20260515_BOT_ORDERS_UNCONTESTED_RESIDUAL_PROFILE_SPLIT.md` | Records n1834 results and interpretation. |

## Next Steps
- Do not optimize `.candidateLoop` directly from this profile; it is nested-profiler inflated.
- Do not optimize `.earlyGates`.
- If continuing inside uncontested occupation, split `.candidateGates` before changing any local gate semantics; otherwise pivot to direct-objective sectorAttack prediction or another larger fresh-profile bucket.
