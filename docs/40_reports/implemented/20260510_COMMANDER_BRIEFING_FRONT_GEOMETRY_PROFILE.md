# Commander Briefing Front Geometry Profile

**Date:** 2026-05-10
**Status:** Implemented
**Lane:** v0.9.3/v0.9.4 CPU performance profiling

## Summary

Added `buildBriefing` sub-buckets to the existing default-off bot-orders profiler and used the first measured result to cut the largest briefing sub-path.

The profiler remains gated by `PERF_PROFILE_BOT_ORDERS=true`. With the flag absent, the wrappers call through without collecting samples or writing artifacts.

## Evidence

Scenario command:

```text
npx tsx tools/scenario_runner/run_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --unique --out runs
```

Both before/after profiled runs produced final hash `ea9f3db7ac59a443`.

| Label | Before | After | Delta |
|---|---:|---:|---:|
| `commander.runCommanderForCorps.total` | 2,110.601 ms | 2,026.497 ms | -84.104 ms |
| `commander.runCommanderForCorps.buildBriefing` | 1,077.718 ms | 1,041.042 ms | -36.676 ms |
| `commander.runCommanderForCorps.buildBriefing.frontGeometry` | 691.284 ms | 659.228 ms | -32.056 ms |
| `commander.runCommanderForCorps.commanderDecide` | 1,029.093 ms | 981.670 ms | -47.423 ms |
| `bot_orders.executeFactionDirectives.total` | 1,562.491 ms | 1,551.148 ms | -11.343 ms |

## Implementation

- Added briefing sub-buckets for sectors, subordinates, front geometry, intel, fatigue, enemy equipment, adjacent corps, and campaign intent.
- Replaced the salient detector BFS `queue.shift()` loop with an index-based queue.
- Added a regression guard that prevents reintroducing `.shift()` in `front_geometry_analysis.ts`.

## Determinism And Canon

No gameplay rule changed. The BFS visit order is unchanged: newly discovered neighbors are still appended to the queue in adjacency order and consumed FIFO. The implementation only changes how the queue head advances.

The profiler is debug-only and writes only `data/derived/_debug/bot_orders_perf_profile.json` when explicitly enabled.

## Verification

- Red: `npx.cmd vitest run tests/bot_orders_perf_profile.test.ts --reporter=dot` failed on missing briefing labels.
- Red: `npx.cmd vitest run tests/front_geometry_analysis.test.ts --reporter=dot` failed on existing `.shift()` queue compaction.
- Green focused: both suites passed after implementation.
- Profiled 40w before/after stayed hash-stable at `ea9f3db7ac59a443`.

## Next CPU Lane

`frontGeometry` remains the largest named briefing sub-bucket after this cut, while `emitCommanderOutput` and `assessSituation` remain the largest decision sub-buckets. The next CPU pass should add/inspect deeper labels there before retaining any further optimization.
