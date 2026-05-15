# Commander Rank Defender Profile Split

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1784`
**Baseline:** n1782, final hash `7ef09f55d6494edd`
**Result:** n1784, final hash `7ef09f55d6494edd`

## Summary
- Split the direct probe predictor's `.rankDefendersByPower` profile bucket into defender-power computation and sort/aggregation sub-buckets.
- Preserved the final hash in the profiled 40w proof.
- Found that `.rankDefendersByPower.computeDefenderPower` accounts for 56.651ms of the current 63.934ms ranking bucket.
- Found that `.rankDefendersByPower.sortAndTotal` accounts for only 2.391ms, so sort replacement is not the next measured target.
- The nested profile labels add opt-in profiling overhead; this is an attribution lane, not a runtime optimization lane.

## Changes Made
### Rank Defender Sub-Buckets
- Extended `rankDefendersByPowerWithEntries(...)` with an optional `profilePrefix`.
- Timed per-defender `computeDefenderPower(...)` calls as `.rankDefendersByPower.computeDefenderPower`.
- Timed the existing sort, stacked-total calculation, and `powerByFormationId` map creation as `.rankDefendersByPower.sortAndTotal`.
- Passed the existing direct-probe predictor prefix from the sector-defense caller.
- Preserved the current ranking algorithm and stacked support formula.

### Regression Guard
- Updated `tests/bot_orders_perf_profile.test.ts` to require both nested rank-defender labels and prefix propagation into `rankDefendersByPowerWithEntries(...)`.

## Scenario Results
### Determinism
- Command: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs`
- Result run: `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1784`
- Final state hash: `7ef09f55d6494edd`, matching n1782.

### Parent Profile
The extra nested timers increase opt-in profile overhead, so parent buckets are not interpreted as performance wins in this lane.

| Label | n1782 total ns | n1784 total ns | Delta |
|-------|----------------|----------------|-------|
| `commander.runCommanderForCorps.total` | 1,196,194,600 | 1,226,095,800 | +29,901,200 |
| `.decide.emitCommanderOutput` | 283,988,200 | 303,095,100 | +19,106,900 |
| `.decide.emitCommanderOutput.buildOperations` | 214,570,500 | 229,723,700 | +15,153,200 |
| `.probe.deriveObjectives` | 184,496,900 | 197,838,700 | +13,341,800 |
| `.probe.deriveObjectives.predictDirectTargets` | 163,489,100 | 176,271,200 | +12,782,100 |

### Direct Predictor Internals
| Sub-label | n1782 total ns | n1784 total ns | Delta |
|-----------|----------------|----------------|-------|
| `.rankDefendersByPower` | 56,918,600 | 63,934,200 | +7,015,600 |
| `.rankDefendersByPower.computeDefenderPower` | n/a | 56,650,600 | n/a |
| `.rankDefendersByPower.sortAndTotal` | n/a | 2,390,800 | n/a |
| `.attackerPower` | 13,083,300 | 14,094,900 | +1,011,600 |
| `.sectorDefensePower` | 10,388,700 | 10,626,200 | +237,500 |
| `.sectorLookup` | 8,548,300 | 9,126,600 | +578,300 |
| `.overextension` | 6,526,900 | 7,972,900 | +1,446,000 |
| `.casualties` | 4,934,800 | 5,271,200 | +336,400 |
| `.defenderFormationScan` | 1,801,500 | 1,774,000 | -27,500 |

Current n1784 rank split:

| Sub-label | Count | Total ns | Mean ns | P95 ns |
|-----------|-------|----------|---------|--------|
| `.rankDefendersByPower.computeDefenderPower` | 571 | 56,650,600 | 99,212 | 197,500 |
| `.rankDefendersByPower.sortAndTotal` | 571 | 2,390,800 | 4,187 | 7,100 |

## Rejected Candidate
- Before this split, a single-pass max-plus-sum replacement for sort/aggregation was tested and rejected.
- Profile n1783 kept final hash `7ef09f55d6494edd`, but worsened `predictDirectTargets` from 163.489ms to 173.305ms and `.rankDefendersByPower` from 56.919ms to 58.352ms.
- That result matches the n1784 split: sort/aggregation is small, while defender-power computation dominates.

## Validation
- Red first: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` failed on missing `.rankDefendersByPower.computeDefenderPower`.
- Green static guard: same command passed 5/5.
- Focused commander regression: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts tests\commander\operation_emit_overlap_guards.test.ts tests\commander\corridor_quality_guard.test.ts tests\commander\elite_formation_utilization.test.ts tests\commander\commander.test.ts --reporter=dot` passed 103/103.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed with CRLF warnings only.
- Profiled 40w n1784 passed with final hash `7ef09f55d6494edd`.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/combat_predictor.ts` | Splits the rank-defender profile bucket into compute and sort/aggregation sub-buckets. |
| `tests/bot_orders_perf_profile.test.ts` | Adds static guard for nested rank-defender profile labels and prefix propagation. |
| `docs/40_reports/implemented/20260515_COMMANDER_RANK_DEFENDER_PROFILE_SPLIT.md` | New implementation report. |

## Next Steps
- Do not spend the next CPU lane on defender-ranking sort replacement without new evidence.
- The next measured target should be `computeDefenderPower(...)` internals or repeated context lookups feeding that calculation.
