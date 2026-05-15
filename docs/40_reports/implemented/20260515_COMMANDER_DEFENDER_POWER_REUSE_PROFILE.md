# Commander Defender Power Reuse Profile

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1781`
**Baseline:** n1780, final hash `7ef09f55d6494edd`
**Result:** n1781, final hash `7ef09f55d6494edd`

## Summary
- Reused the defender powers already computed during sector defender ranking instead of recomputing each brigade's defender power during reactive sector-defense aggregation.
- Preserved the final hash in the profiled 40w proof.
- Cut `.predictDirectTargets` from 255.571ms to 193.777ms and `.sectorDefensePower` from 49.935ms to 10.754ms.

## Changes Made
### Defender Power Reuse
- Added a local `rankDefendersByPowerWithEntries(...)` helper in `src/sim/combat/combat_predictor.ts`.
- The helper mirrors `rankDefendersByPower(...)` for primary defender and stacked total power, while also returning `powerByFormationId`.
- The sector reactive-defense loop now reads `powerByFormationId.get(b.id)` and only falls back to `computeDefenderPower(...)` if a future caller somehow supplies a defender not present in the ranked set.

### Regression Guard
- Updated `tests/bot_orders_perf_profile.test.ts` to require the ranked-power reuse shape.

## Scenario Results
### Determinism
- Command: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs`
- Result run: `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1781`
- Final state hash: `7ef09f55d6494edd`, matching n1780.

### Parent Profile
| Label | n1780 total ns | n1781 total ns | Delta |
|-------|----------------|----------------|-------|
| `commander.runCommanderForCorps.total` | 1,385,284,000 | 1,229,372,800 | -155,911,200 |
| `.decide.emitCommanderOutput` | 392,539,600 | 317,397,700 | -75,141,900 |
| `.decide.emitCommanderOutput.buildOperations` | 314,275,000 | 246,304,900 | -67,970,100 |
| `.probe.deriveObjectives` | 279,775,000 | 215,347,500 | -64,427,500 |
| `.probe.deriveObjectives.predictDirectTargets` | 255,570,600 | 193,777,100 | -61,793,500 |

### Direct Predictor Internals
| Sub-label | n1780 total ns | n1781 total ns | Delta |
|-----------|----------------|----------------|-------|
| `.rankDefendersByPower` | 61,217,900 | 57,172,600 | -4,045,300 |
| `.sectorDefensePower` | 49,935,100 | 10,753,900 | -39,181,200 |
| `.defenderFormationScan` | 34,092,900 | 28,514,000 | -5,578,900 |
| `.attackerPower` | 14,757,300 | 13,340,800 | -1,416,500 |
| `.sectorLookup` | 9,937,800 | 8,692,600 | -1,245,200 |
| `.overextension` | 8,342,800 | 6,792,500 | -1,550,300 |
| `.casualties` | 5,806,900 | 5,192,100 | -614,800 |

Current n1781 leading internals:

| Sub-label | Count | Total ns | Mean ns | P95 ns |
|-----------|-------|----------|---------|--------|
| `.rankDefendersByPower` | 574 | 57,172,600 | 99,603 | 189,300 |
| `.defenderFormationScan` | 591 | 28,514,000 | 48,247 | 106,600 |
| `.attackerPower` | 591 | 13,340,800 | 22,573 | 38,600 |
| `.sectorDefensePower` | 571 | 10,753,900 | 18,833 | 54,200 |

## Validation
- Red first: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` failed on missing `rankDefendersByPowerWithEntries`.
- Green static guard: same command passed 5/5.
- Focused commander regression: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts tests\commander\operation_emit_overlap_guards.test.ts tests\commander\corridor_quality_guard.test.ts tests\commander\elite_formation_utilization.test.ts tests\commander\commander.test.ts --reporter=dot` passed 103/103.
- `npm.cmd run typecheck` passed.
- Profiled 40w n1781 passed with final hash `7ef09f55d6494edd`.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/combat_predictor.ts` | Reuses ranked defender powers in the sector reactive-defense loop. |
| `tests/bot_orders_perf_profile.test.ts` | Adds static guard for the reuse shape. |
| `docs/40_reports/implemented/20260515_COMMANDER_DEFENDER_POWER_REUSE_PROFILE.md` | New implementation report. |

## Next Steps
- `rankDefendersByPower` remains the leading direct predictor sublabel at 57.173ms.
- The next low-risk target is likely lazy defender formation scanning, because the all-formations scan still runs before the sector branch knows whether it needs fallback defenders.
