# Bot Orders Wall-Clock Profile And Sector Assignment Cache

**Date:** 2026-05-10  
**Status:** Implemented  
**Lane:** v0.9.3/v0.9.4 CPU performance profiling  

## Summary

Added default-off wall-clock profiling for the bot-orders and commander-loop hot paths, then used the profile to optimize the largest named bot-brigade evaluator hotspot.

The profiler is gated by `PERF_PROFILE_BOT_ORDERS=true`. With the flag absent, the wrapper calls through without collecting samples or writing artifacts. With the flag enabled, the scenario runner writes a stable JSON summary to `data/derived/_debug/bot_orders_perf_profile.json`.

## Evidence

Scenario used for before/after profiling:

```text
npx tsx tools/scenario_runner/run_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --unique --out <run-dir>
```

All CPU-lane 40w verification runs produced current local final hash `ea9f3db7ac59a443`.

| Label | Before | After | Delta |
|---|---:|---:|---:|
| `bot_orders.executeFactionDirectives.total` | 1,807.542 ms | 1,555.460 ms | -252.082 ms |
| `bot_orders.executeFactionDirectives.evaluators` | 1,604.395 ms | 1,331.743 ms | -272.652 ms |
| `bot_orders.executeFactionDirectives.eval.sectorMarch` | 461.641 ms | 319.196 ms | -142.445 ms |
| `bot_orders.executeFactionDirectives.eval.garrisonAndDetachments` | 87.738 ms | 9.113 ms | -78.625 ms |

Commander-loop profiling remains the larger combined slice after this pass:

| Label | After |
|---|---:|
| `commander.runCommanderForCorps.total` | 2,058.984 ms |
| `commander.runCommanderForCorps.buildBriefing` | 1,062.452 ms |
| `commander.runCommanderForCorps.commanderDecide` | 991.283 ms |

## Implementation

- Added `src/sim/combat/_perf_profile_bot_orders.ts`.
- Wired bot-order profiler labels into `executeFactionDirectives`, individual brigade evaluators, `runCommanderForCorps`, briefing construction, and commander decision.
- Added scenario-runner dump support for `PERF_PROFILE_BOT_ORDERS=true`.
- Added a per-faction `buildSectorAssignmentByBrigade(...)` cache in `bot_brigade_ai_osid.ts`.
- Passed cached sector/front membership through `BrigadeEvaluationContext`.
- Reused cached line-front sets in `assignedBrigadeNotOnSectorFrontOsids(...)`, `evaluateSectorMarch(...)`, `evaluateGarrisonAndDetachments(...)`, and attack gates.

## Follow-Up: Commander Decision Split

The next profiled 40w run after sparse-replay closure kept the same final hash, `ea9f3db7ac59a443`, and confirmed the commander-loop bucket still deserves attention:

| Label | Total |
|---|---:|
| `commander.runCommanderForCorps.total` | 2,067.218 ms |
| `commander.runCommanderForCorps.buildBriefing` | 1,056.041 ms |
| `commander.runCommanderForCorps.commanderDecide` | 1,006.205 ms |
| `commander.runCommanderForCorps.decide.emitCommanderOutput` | 378.807 ms |
| `commander.runCommanderForCorps.decide.assessSituation` | 371.642 ms |
| `commander.runCommanderForCorps.decide.makeDecisions` | 116.744 ms |
| `commander.runCommanderForCorps.decide.assembleBeliefState` | 60.631 ms |
| `commander.runCommanderForCorps.decide.managePlan` | 47.007 ms |
| `commander.runCommanderForCorps.decide.allocateBrigades` | 21.009 ms |

Added default-off sub-buckets for the six commander decision phases and removed a repeated nested `zones.some(...includes(...))` scan in `assessThreats` by precomputing the current-zone OSID set once per assessment. This keeps loss-detection semantics unchanged: OSIDs that merely shift to another current zone are not recent losses, while OSIDs absent from all current zones still count as lost.

## Determinism And Canon

No gameplay rule changed. The cache preserves the existing sorted sector scan semantics by iterating sector IDs through `strictCompare` and retaining the first matching sector entry.

The wall-clock probe is debug-only and does not write into game state, save state, scenario reports, baselines, or canon mechanics. Profiling output is explicitly gated by `PERF_PROFILE_BOT_ORDERS=true`.

## Verification

- Red tests first: `npx.cmd vitest run tests/bot_orders_perf_profile.test.ts --reporter=dot` failed on missing profiler/cache wiring, then again on missing commander decision phase labels/current-zone OSID cache guard.
- Green focused tests: `npx.cmd vitest run tests/bot_orders_perf_profile.test.ts tests/brigade_aor_subsegment.test.ts --reporter=dot` passed 29/29.
- Typecheck: `npm.cmd run typecheck` passed.
- Default-off 40w scenario: final hash `ea9f3db7ac59a443`.
- Profiled 40w scenario: final hash `ea9f3db7ac59a443`.

## Next CPU Lane

The next proven wall-clock target remains commander-loop internals, now with better names. `buildBriefing` is the largest single top-level slice, while `emitCommanderOutput` and `assessSituation` are the largest named decision sub-phases. Further optimization should start from one of those three measured buckets.

## Follow-Up: Briefing Candidate Rejected

A 2026-05-10 follow-up pass tested `buildBriefing` more directly because the profile kept naming it as the largest single commander bucket.

Pre-candidate 40w profile:

| Label | Total |
|---|---:|
| `commander.runCommanderForCorps.buildBriefing` | 1,047.460 ms |
| `commander.runCommanderForCorps.commanderDecide` | 1,009.717 ms |
| `commander.runCommanderForCorps.total` | 2,062.019 ms |
| `bot_orders.executeFactionDirectives.total` | 1,563.882 ms |

Candidate tested: replace repeated `findSectorForEnemyOsid(...)` calls in enemy-equipment summaries with a per-briefing defender-sector lookup that preserves sorted sector precedence and territory fallback semantics.

Post-candidate 40w profile:

| Label | Total |
|---|---:|
| `commander.runCommanderForCorps.buildBriefing` | 1,082.252 ms |
| `commander.runCommanderForCorps.commanderDecide` | 987.511 ms |
| `commander.runCommanderForCorps.total` | 2,074.604 ms |
| `bot_orders.executeFactionDirectives.total` | 1,552.730 ms |

Both runs produced final hash `ea9f3db7ac59a443`, so the candidate was deterministic, but it was not a proven wall-clock win. The code change was rejected and not retained. The next CPU pass should instrument inside `buildBriefing` before changing it again, or instead take the already named `emitCommanderOutput` / `assessSituation` sub-buckets.
