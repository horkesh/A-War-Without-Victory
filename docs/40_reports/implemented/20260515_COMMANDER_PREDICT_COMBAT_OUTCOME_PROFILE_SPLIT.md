# Commander Predict Combat Outcome Profile Split

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1780`
**Baseline:** n1779, final hash `7ef09f55d6494edd`
**Result:** n1780, final hash `7ef09f55d6494edd`

## Summary
- Added an optional profile-prefix parameter to `predictCombatOutcome(...)` so the commander probe path can split direct combat prediction internals without changing default callers.
- Passed the prefix only from `predictDirectEnemyTargets(...)`, under `.probe.deriveObjectives.predictDirectTargets.predictCombatOutcome`.
- Preserved the final hash in the profiled 40w proof.
- The profile split shows direct probe prediction is currently led by defender ranking, reactive sector-defense power, and the all-formations defender scan.

This lane is instrumentation only. Parent bucket totals are not a speed-win comparison because nested timing adds profiling overhead; the useful result is the internal ranking for the next optimization lane.

## Changes Made
### Predictor Sub-Buckets
- Added `predictorPerfTime(...)` in `src/sim/combat/combat_predictor.ts`.
- Extended `predictCombatOutcome(...)` with optional `profilePrefix?: string`.
- Split these substeps when a prefix is supplied:
  - `.defenderFormationScan`
  - `.controller`
  - `.artSuppression`
  - `.sectorLookup`
  - `.sectorBrigades`
  - `.rankDefendersByPower`
  - `.sectorDefensePower`
  - `.attackerPower`
  - `.casualties`
  - `.overextension`

### Probe Call Site
- Updated `src/sim/combat/commander/emit.ts` so direct probe predictions emit nested profile labels beneath `.probe.deriveObjectives.predictDirectTargets.predictCombatOutcome`.
- Other `predictCombatOutcome(...)` callers remain unchanged because the new argument is optional.

### Regression Guard
- Updated `tests/bot_orders_perf_profile.test.ts` to require the commander call-site prefix and the predictor sublabels.

## Scenario Results
### Determinism
- Command: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs`
- Result run: `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1780`
- Final state hash: `7ef09f55d6494edd`, matching n1779.

### Profile Signal
Parent labels from n1780:

| Label | Count | Total ns | Mean ns | P95 ns |
|-------|-------|----------|---------|--------|
| `commander.runCommanderForCorps.total` | 668 | 1,385,284,000 | 2,073,778 | 4,587,900 |
| `.decide.emitCommanderOutput` | 668 | 392,539,600 | 587,634 | 1,812,600 |
| `.decide.emitCommanderOutput.buildOperations` | 668 | 314,275,000 | 470,471 | 1,634,200 |
| `.probe.deriveObjectives` | 344 | 279,775,000 | 813,299 | 1,891,700 |
| `.probe.deriveObjectives.predictDirectTargets` | 335 | 255,570,600 | 762,897 | 1,818,300 |

Direct `predictCombatOutcome(...)` internals:

| Sub-label | Count | Total ns | Mean ns | P95 ns |
|-----------|-------|----------|---------|--------|
| `.rankDefendersByPower` | 574 | 61,217,900 | 106,651 | 216,500 |
| `.sectorDefensePower` | 571 | 49,935,100 | 87,452 | 182,300 |
| `.defenderFormationScan` | 591 | 34,092,900 | 57,686 | 121,000 |
| `.attackerPower` | 591 | 14,757,300 | 24,970 | 45,700 |
| `.sectorLookup` | 591 | 9,937,800 | 16,815 | 39,300 |
| `.overextension` | 591 | 8,342,800 | 14,116 | 31,800 |
| `.casualties` | 591 | 5,806,900 | 9,825 | 17,900 |
| `.artSuppression` | 591 | 2,027,200 | 3,430 | 8,300 |
| `.sectorBrigades` | 591 | 1,354,800 | 2,292 | 3,900 |
| `.controller` | 591 | 416,300 | 704 | 1,700 |

## Validation
- Red first: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` failed on missing `.predictDirectTargets.predictCombatOutcome`.
- Green static guard: same command passed 5/5.
- Focused commander regression: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts tests\commander\operation_emit_overlap_guards.test.ts tests\commander\corridor_quality_guard.test.ts tests\commander\elite_formation_utilization.test.ts tests\commander\commander.test.ts --reporter=dot` passed 103/103.
- `npm.cmd run typecheck` passed.
- Profiled 40w n1780 passed with final hash `7ef09f55d6494edd`.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/combat_predictor.ts` | Added optional profile-prefix instrumentation around predictor internals. |
| `src/sim/combat/commander/emit.ts` | Passed the nested probe predictor profile prefix into direct combat predictions. |
| `tests/bot_orders_perf_profile.test.ts` | Added static guard for nested predictor instrumentation. |
| `docs/40_reports/implemented/20260515_COMMANDER_PREDICT_COMBAT_OUTCOME_PROFILE_SPLIT.md` | New implementation report. |

## Next Steps
- Optimize `rankDefendersByPower(...)` / sector defense power only with a fresh red guard and same-hash profile proof.
- Candidate direction: avoid repeated defender ranking or repeated sector reactive-defense scans for direct probe targets when the inputs are identical within a commander briefing.
