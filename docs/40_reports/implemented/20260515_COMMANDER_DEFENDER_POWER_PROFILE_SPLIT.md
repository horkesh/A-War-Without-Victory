# Commander Defender Power Profile Split

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1788`
**Baseline:** n1784, final hash `7ef09f55d6494edd`
**Result:** n1788, final hash `7ef09f55d6494edd`

## Summary
- Split direct-probe defender power computation into internal sub-buckets.
- Preserved the final hash in the profiled 40w proof.
- Kept `combat_math.ts` decoupled from the bot-orders profiler by passing an optional timing callback from `combat_predictor.ts`.
- Found that officer lookup and front-density lookup dominate the measured `computeDefenderPower(...)` internals.
- The nested profile labels add opt-in profiling overhead; this is an attribution lane, not a runtime optimization lane.

## Changes Made
### Defender Power Sub-Buckets
- Added an internal `CombatMathProfileTimer` callback type and `combatMathProfileTime(...)` helper in `combat_math.ts`.
- Extended `computeDefenderPower(...)` with an optional final `profileTime` parameter.
- Timed defender-power substeps as short suffixes under the existing direct-probe prefix:
  - `.base`
  - `.supply`
  - `.terrainFactors`
  - `.frontDensity`
  - `.officer`
  - `.home`
  - `.equipmentQuality`
- `combat_predictor.ts` now creates `defenderPowerProfileTime` only when the direct-probe profile prefix exists.
- No resolver caller, attacker-power caller, combat formula, ranking rule, stacked support formula, target ordering, scenario data, output schema, or save schema changed.

### Regression Guard
- Updated `tests/bot_orders_perf_profile.test.ts` to require the callback-threaded profile shape.
- Added a guard against doubled labels such as `.computeDefenderPower.computeDefenderPower.base`.

## Scenario Results
### Determinism
- Command: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs`
- Result run: `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1788`
- Final state hash: `7ef09f55d6494edd`, matching n1784.

### Parent Profile
The extra nested timers increase opt-in profile overhead, so parent buckets are not interpreted as performance wins in this lane.

| Label | n1784 total ns | n1788 total ns | Delta |
|-------|----------------|----------------|-------|
| `commander.runCommanderForCorps.total` | 1,226,095,800 | 1,244,868,200 | +18,772,400 |
| `.decide.emitCommanderOutput` | 303,095,100 | 320,235,200 | +17,140,100 |
| `.decide.emitCommanderOutput.buildOperations` | 229,723,700 | 249,166,400 | +19,442,700 |
| `.probe.deriveObjectives` | 197,838,700 | 218,240,500 | +20,401,800 |
| `.probe.deriveObjectives.predictDirectTargets` | 176,271,200 | 197,059,800 | +20,788,600 |

### Direct Predictor Internals
| Sub-label | n1784 total ns | n1788 total ns | Delta |
|-----------|----------------|----------------|-------|
| `.rankDefendersByPower` | 63,934,200 | 88,417,400 | +24,483,200 |
| `.rankDefendersByPower.computeDefenderPower` | 56,650,600 | 81,697,300 | +25,046,700 |
| `.rankDefendersByPower.sortAndTotal` | 2,390,800 | 2,432,100 | +41,300 |
| `.attackerPower` | 14,094,900 | 12,465,800 | -1,629,100 |
| `.sectorDefensePower` | 10,626,200 | 10,641,300 | +15,100 |
| `.sectorLookup` | 9,126,600 | 8,940,200 | -186,400 |
| `.overextension` | 7,972,900 | 7,131,800 | -841,100 |
| `.casualties` | 5,271,200 | 5,113,900 | -157,300 |

Current n1788 defender-power split:

| Sub-label | Count | Total ns | Mean ns | P95 ns |
|-----------|-------|----------|---------|--------|
| `.officer` | 1,419 | 22,682,400 | 15,984 | 32,400 |
| `.frontDensity` | 1,419 | 15,176,900 | 10,695 | 21,300 |
| `.terrainFactors` | 1,419 | 5,114,700 | 3,604 | 10,700 |
| `.base` | 1,419 | 3,438,200 | 2,422 | 5,900 |
| `.home` | 1,419 | 1,740,300 | 1,226 | 4,100 |
| `.supply` | 1,419 | 1,710,400 | 1,205 | 4,200 |
| `.equipmentQuality` | 1,419 | 744,200 | 524 | 1,700 |

## Validation
- Red first: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` failed on missing `defenderPowerProfilePrefix`.
- Red label-shape guard: the same test failed until suffixes were changed from `.computeDefenderPower.base` to `.base`.
- Green static guard: same command passed 5/5.
- Focused commander regression: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts tests\commander\operation_emit_overlap_guards.test.ts tests\commander\corridor_quality_guard.test.ts tests\commander\elite_formation_utilization.test.ts tests\commander\commander.test.ts --reporter=dot` passed 103/103.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed with CRLF warnings only.
- Profiled 40w n1788 passed with final hash `7ef09f55d6494edd`.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/combat_math.ts` | Adds optional callback-threaded defender-power substep timing. |
| `src/sim/combat/combat_predictor.ts` | Passes direct-probe defender-power timing callback into the ranked sector defender path. |
| `tests/bot_orders_perf_profile.test.ts` | Adds static guards for the callback shape and clean label suffixes. |
| `docs/40_reports/implemented/20260515_COMMANDER_DEFENDER_POWER_PROFILE_SPLIT.md` | New implementation report. |

## Next Steps
- Target `getThreeTierOfficerMod(...)` lookup cost first, or `getLocalFrontDensityModifier(...)` if a smaller index lane is safer.
- Do not optimize supply lookup first in this direct-probe path without new evidence; n1788 shows supply at only 1.710ms.
