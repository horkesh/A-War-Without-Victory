# Commander Emit/Assess Profile

**Date:** 2026-05-10
**Status:** Implemented
**Lane:** v0.9.3/v0.9.4 CPU performance profiling

## Summary

Added deeper default-off profiler labels under `assessSituation` and `emitCommanderOutput`, then used a profiled 40-week run to test a candidate `buildOperations` optimization.

The candidate did not produce a wall-clock win, so it was removed. The retained value of this slice is the finer instrumentation: the next CPU pass can target a named sub-bucket instead of the opaque decision bucket.

## Evidence

Profiled run:

```text
PERF_PROFILE_BOT_ORDERS=true npm run sim:scenario:run:40w -- --unique --out runs
```

Run output:

- Run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1766`
- Final hash: `ea9f3db7ac59a443`
- Profile: `data/derived/_debug/bot_orders_perf_profile.json`

Key retained labels:

| Label | Total |
|---|---:|
| `commander.runCommanderForCorps.decide.emitCommanderOutput.buildOperations` | 316.829 ms |
| `commander.runCommanderForCorps.decide.assessSituation.detectZones` | 271.783 ms |
| `commander.runCommanderForCorps.buildBriefing.enemyEquipmentSummary` | 167.570 ms |
| `commander.runCommanderForCorps.decide.makeDecisions` | 113.005 ms |
| `commander.runCommanderForCorps.decide.assessSituation.evaluateForces` | 63.298 ms |

Rejected candidate:

| Candidate | Before | After | Verdict |
|---|---:|---:|---|
| Probe target `predictedTargets` OSID map inside `buildOperations` | 316.271 ms | 316.829 ms | Rejected; no measured win |

## Implementation

- Added `assessSituation` labels for `collectCorpsOsids`, `detectZones`, `evaluateForces`, `concentrationZones`, and `assessThreats`.
- Added `emitCommanderOutput` labels for `buildDirective`, `buildOperations`, `buildSectorStances`, `buildUpdatedState`, `buildPlanUpdates`, and `buildPrepositioningOrders`.
- Tested and removed the `predictedTargetByOsid` candidate because the profile did not justify retaining it.

## Determinism And Canon

No gameplay rule changed. The profiler is gated by `PERF_PROFILE_BOT_ORDERS=true`; with the flag absent, wrappers call through without collecting samples. When enabled, the only write remains the debug profile JSON.

## Verification

- Red: `npx.cmd vitest run tests/bot_orders_perf_profile.test.ts --reporter=dot` failed on missing emit/assess labels.
- Green: `npx.cmd vitest run tests/bot_orders_perf_profile.test.ts --reporter=dot` passed 6/6 after instrumentation.
- `npm.cmd run typecheck` passed.
- Profiled 40w n1766 kept final hash `ea9f3db7ac59a443`.

## Next CPU Lane

The next proven candidates should start from `frontGeometry`, `emitCommanderOutput.buildOperations`, or `assessSituation.detectZones`. Retain only changes that move the profile, not changes that merely look cheaper in isolation.
