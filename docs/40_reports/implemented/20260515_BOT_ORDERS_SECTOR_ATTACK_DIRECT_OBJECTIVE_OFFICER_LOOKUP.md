# Bot Orders Sector Attack Direct-Objective Officer Lookup

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1826`
**Baseline:** n1825 direct-objective profile split, final hash `0cb626c032204372`
**Result:** n1826 kept final hash `0cb626c032204372`

## Summary
- Reused the existing `OfficerCombatLookup` path in bot-order sector-attack direct current-objective predictions.
- Built the lookup once per faction directive pass and threaded it through `BrigadeEvaluationContext` into `predictCombatOutcome(...)`.
- The direct-objective officer sublabel dropped sharply; the new pass-level index cost is recorded explicitly so follow-up work compares net cost, not only child labels.

## Changes Made
### Pass-Local Lookup
- `src/sim/combat/bot_brigade_ai_osid.ts`
  - Builds `buildOfficerCombatLookup(state)` once per `executeFactionDirectivesImpl(...)` pass when named-officer state and data exist.
  - Profiles lookup construction under `bot_orders.executeFactionDirectives.officerIndex`.
  - Passes the lookup through each brigade evaluation context.

### Context And Direct Prediction
- `src/sim/combat/bot_brigade_eval_types.ts`
  - Adds optional `officerCombatLookup?: OfficerCombatLookup` to `BrigadeEvaluationContext`.
- `src/sim/combat/bot_brigade_eval_attack.ts`
  - Passes the lookup into the direct current-objective `predictCombatOutcome(...)` call in `evaluateSectorAttack(...)`.

### Profile Guard
- `tests/bot_orders_perf_profile.test.ts`
  - Guards the pass-local lookup build, the `officerIndex` label, the context field, and direct-objective predictor threading.

## Scenario Results
### 40w Profile
- Final state hash: `0cb626c032204372`
- Anchor checks: 26/27
- Bot benchmarks: 6/6
- Anomalies: 9 total, 0 critical, 2 warnings

### Direct-Objective Attribution
- `.sectorAttack.executionDirectObjective`: 45.700ms -> 36.409ms
- `.sectorAttack`: 77.130ms -> 66.983ms
- `.rankDefendersByPower`: 22.117ms -> 14.675ms
- `.rankDefendersByPower.computeDefenderPower`: 20.229ms -> 12.904ms
- `.computeDefenderPower.officer`: 6.107ms -> 0.696ms
- New `bot_orders.executeFactionDirectives.officerIndex`: 8.425ms / 120 calls

The new lookup cost means this is a targeted sector-attack cut, not a broad total-wall-clock claim. In n1826, the direct-objective and sector-attack buckets fell enough to keep the lane, while the pass-local index cost remains visible for future net-cost comparisons.

## Verification
- Red first: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` failed because `buildOfficerCombatLookup` was not wired into bot-order directive execution.
- Green focused guard: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` passed 5/5.
- Typecheck: `npm.cmd run typecheck` passed.
- Profile: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs` produced n1826 with final hash `0cb626c032204372`.

## Lessons Learned
- Existing shared predictor lookup hooks can be reused in bot-order callers if the lookup is built at the directive-pass boundary rather than inside the rank loop.
- The direct-objective path still has meaningful non-officer defender-power work after this lane: terrain factors, base power, sector defense, and attacker power are now better next candidates than officer scanning.
- Always include index-build cost in the report; an optimization that collapses a child label can still be net-neutral if construction is too expensive.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/bot_brigade_ai_osid.ts` | Builds and profiles pass-local officer lookup for bot-order directive execution. |
| `src/sim/combat/bot_brigade_eval_types.ts` | Carries optional officer lookup in brigade evaluation context. |
| `src/sim/combat/bot_brigade_eval_attack.ts` | Threads lookup into direct-objective sector-attack prediction. |
| `tests/bot_orders_perf_profile.test.ts` | Guards the wiring and profile label. |
| `docs/40_reports/implemented/20260515_BOT_ORDERS_SECTOR_ATTACK_DIRECT_OBJECTIVE_OFFICER_LOOKUP.md` | Records n1826 evidence and follow-up guidance. |

## Next Steps
- Use a fresh profile before optimizing remaining sector-attack work.
- If sector-attack remains competitive, inspect non-officer `computeDefenderPower(...)` internals or direct-objective `sectorDefensePower`.
- Do not rebuild officer lookup inside defender ranking; the pass-level construction boundary is the retained shape.
