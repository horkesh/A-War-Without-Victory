# Bot Orders Lazy Officer Lookup

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1833`
**Baseline:** n1832 overstack residual profile split, final hash `0cb626c032204372`
**Result:** Retained CPU optimization; n1833 kept final hash `0cb626c032204372`

## Summary
- Changed bot-order officer combat lookup construction from eager per-faction-pass construction to lazy first-use construction.
- The lookup remains pass-local and is still built at most once per faction directive pass.
- The sectorAttack direct-objective predictor is currently the only bot-order consumer, so faction passes that never reach that prediction branch no longer pay the index cost.

## Implementation
### Lazy Pass-Local Getter
- Replaced eager `const officerCombatLookup = ... buildOfficerCombatLookup(state)` in `executeFactionDirectivesImpl(...)` with `let officerCombatLookup` plus `getOfficerCombatLookup()`.
- The getter checks the same `named_officers` and `named_officer_data` gates, profiles the same `bot_orders.executeFactionDirectives.officerIndex` label, and memoizes the result for the current faction pass.
- `BrigadeEvaluationContext` now carries both the legacy optional `officerCombatLookup` and the lazy `getOfficerCombatLookup` fallback.

### SectorAttack Consumer
- `evaluateSectorAttack(...)` calls the getter only inside `.sectorAttack.executionDirectObjective.predict`, after local direct-objective gates pass.
- Direct test callers can still provide `officerCombatLookup` directly.
- Prediction semantics are unchanged; only index construction timing moved later.

## Scenario Results
### 40w Profile
- Final state hash: `0cb626c032204372`
- Anchor checks: 26/27
- Bot benchmarks: 6/6
- Anomalies: 9 total, 0 critical, 2 warnings

### Key Timings
- n1832 `bot_orders.executeFactionDirectives.officerIndex`: 42.553ms / 120 builds
- n1833 `bot_orders.executeFactionDirectives.officerIndex`: 4.279ms / 46 builds
- n1832 `bot_orders.executeFactionDirectives.total`: 969.086ms
- n1833 `bot_orders.executeFactionDirectives.total`: 860.523ms
- n1833 `.sectorAttack.executionDirectObjective.predict`: 41.092ms / 107 calls

The commander-side probe `officerIndex` remains separate at 17.291ms / 282 builds and was not changed in this lane.

## Verification
- Red first: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` failed because lazy officer lookup wiring was absent.
- Green focused guard: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` passed 5/5.
- Typecheck: `npm.cmd run typecheck` passed.
- Profile: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs` produced n1833 with final hash `0cb626c032204372`.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/bot_brigade_ai_osid.ts` | Replaces eager officer lookup construction with a memoized pass-local getter. |
| `src/sim/combat/bot_brigade_eval_attack.ts` | Requests the lookup only when direct-objective prediction actually runs. |
| `src/sim/combat/bot_brigade_eval_types.ts` | Adds the optional lazy getter to `BrigadeEvaluationContext`. |
| `tests/bot_orders_perf_profile.test.ts` | Guards the lazy wiring. |
| `docs/40_reports/implemented/20260515_BOT_ORDERS_LAZY_OFFICER_LOOKUP.md` | Records n1833 results and retained optimization. |

## Next Steps
- Keep officer lookup construction at a reuse boundary; do not build rank-local indexes.
- A future commander-side lane may inspect `commander...predictDirectTargets.officerIndex`, which remains separate and still costs 17.291ms.
- Next bot-order CPU work should use a fresh top profile; current large buckets are `homeDefense.uncontestedOccupation`, direct-objective sectorAttack prediction, and remaining defensive/uncontested shared work.
