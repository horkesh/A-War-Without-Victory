# Commander Lazy Defender Formation Scan Profile

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1782`
**Baseline:** n1781, final hash `7ef09f55d6494edd`
**Result:** n1782, final hash `7ef09f55d6494edd`

## Summary
- Deferred the all-formations defender scan inside `predictCombatOutcome(...)` until the sector-defense path actually needs fallback defenders.
- Preserved the final hash in the profiled 40w proof.
- Cut `.defenderFormationScan` from 591 calls / 28.514ms to 20 calls / 1.802ms.
- Cut `.predictDirectTargets` from 193.777ms to 163.489ms.

## Changes Made
### Lazy Fallback Defender Scan
- Added `collectDefenderFormationsAtTarget(...)` as the single sorted fallback scan helper.
- Replaced the eager scan in `predictCombatOutcome(...)` with a memoized `getDefenderFormations()` closure.
- The enemy-controlled sector path now skips the fallback scan whenever sector brigades are present.
- Fallback behavior is unchanged for enclave/garrison edge cases, militia ghost defense, and non-enemy-controlled territory with hostile brigades present.

### Regression Guard
- Updated `tests/bot_orders_perf_profile.test.ts` to require the lazy helper, nullable scan cache, and fallback getter shape.

## Scenario Results
### Determinism
- Command: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs`
- Result run: `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1782`
- Final state hash: `7ef09f55d6494edd`, matching n1781.

### Parent Profile
| Label | n1781 total ns | n1782 total ns | Delta |
|-------|----------------|----------------|-------|
| `commander.runCommanderForCorps.total` | 1,229,372,800 | 1,196,194,600 | -33,178,200 |
| `.decide.emitCommanderOutput` | 317,397,700 | 283,988,200 | -33,409,500 |
| `.decide.emitCommanderOutput.buildOperations` | 246,304,900 | 214,570,500 | -31,734,400 |
| `.probe.deriveObjectives` | 215,347,500 | 184,496,900 | -30,850,600 |
| `.probe.deriveObjectives.predictDirectTargets` | 193,777,100 | 163,489,100 | -30,288,000 |

### Direct Predictor Internals
| Sub-label | n1781 total ns | n1782 total ns | Delta |
|-----------|----------------|----------------|-------|
| `.rankDefendersByPower` | 57,172,600 | 56,918,600 | -254,000 |
| `.defenderFormationScan` | 28,514,000 | 1,801,500 | -26,712,500 |
| `.attackerPower` | 13,340,800 | 13,083,300 | -257,500 |
| `.sectorDefensePower` | 10,753,900 | 10,388,700 | -365,200 |
| `.sectorLookup` | 8,692,600 | 8,548,300 | -144,300 |
| `.overextension` | 6,792,500 | 6,526,900 | -265,600 |
| `.casualties` | 5,192,100 | 4,934,800 | -257,300 |

Current n1782 leading internals:

| Sub-label | Count | Total ns | Mean ns | P95 ns |
|-----------|-------|----------|---------|--------|
| `.rankDefendersByPower` | 574 | 56,918,600 | 99,161 | 200,100 |
| `.attackerPower` | 591 | 13,083,300 | 22,137 | 38,800 |
| `.sectorDefensePower` | 571 | 10,388,700 | 18,193 | 50,300 |
| `.sectorLookup` | 591 | 8,548,300 | 14,464 | 31,900 |
| `.defenderFormationScan` | 20 | 1,801,500 | 90,075 | 166,900 |

## Validation
- Red first: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` failed on missing `collectDefenderFormationsAtTarget`.
- Green static guard: same command passed 5/5.
- Focused commander regression: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts tests\commander\operation_emit_overlap_guards.test.ts tests\commander\corridor_quality_guard.test.ts tests\commander\elite_formation_utilization.test.ts tests\commander\commander.test.ts --reporter=dot` passed 103/103.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed with CRLF warnings only.
- Profiled 40w n1782 passed with final hash `7ef09f55d6494edd`.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/combat_predictor.ts` | Defers fallback defender formation scanning until sector defense cannot answer the prediction. |
| `tests/bot_orders_perf_profile.test.ts` | Adds static guard for the lazy fallback scan shape. |
| `docs/40_reports/implemented/20260515_COMMANDER_LAZY_DEFENDER_FORMATION_SCAN_PROFILE.md` | New implementation report. |

## Next Steps
- `rankDefendersByPower` is now the dominant direct predictor internal at 56.919ms.
- The next CPU pass should profile or reduce defender ranking work; defender scanning is no longer a leading target after n1782.
