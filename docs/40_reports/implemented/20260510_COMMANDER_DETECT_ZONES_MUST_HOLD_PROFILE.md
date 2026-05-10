# Commander Detect Zones Must-Hold Profile

**Date:** 2026-05-10
**Status:** Implemented
**Lane:** v0.9.3/v0.9.4 CPU performance profiling

## Summary

Added deeper default-off labels inside `assessSituation.detectZones`, then used the profile to target the largest internal sub-bucket: zone `mustHold` evaluation.

The retained cut precomputes scenario-authored must-hold OSIDs once per `detectZones` call, reuses deterministic friendly-OSID ordering for chokepoint component checks, and skips the expensive engine-derived chokepoint walk when a zone contains no chokepoint.

## Evidence

Profiled runs:

```text
PERF_PROFILE_BOT_ORDERS=true npm run sim:scenario:run:40w -- --unique --out runs
```

| Run | Final hash | Notes |
|---|---|---|
| `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1767` | `ea9f3db7ac59a443` | sub-label baseline |
| `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1768` | `ea9f3db7ac59a443` | retained prefilter cut |

Key bucket movement:

| Label | Before | After | Delta |
|---|---:|---:|---:|
| `commander.runCommanderForCorps.decide.assessSituation.detectZones` | 238.720 ms | 235.058 ms | -3.662 ms |
| `commander.runCommanderForCorps.decide.assessSituation.detectZones.buildZoneAssessments` | 216.538 ms | 203.192 ms | -13.346 ms |
| `commander.runCommanderForCorps.decide.assessSituation.detectZones.mustHold` | 126.351 ms | 115.098 ms | -11.253 ms |

## Determinism And Canon

No gameplay rule changed. The profiler remains gated by `PERF_PROFILE_BOT_ORDERS=true`; with the flag absent, wrappers call through without collecting samples. The optimization preserves sorted iteration and keeps the same final state hash in the 40-week proof run.

## Verification

- Red: `npx.cmd vitest run tests/bot_orders_perf_profile.test.ts --reporter=dot` failed on missing `detectZones.*` labels.
- Green: `npx.cmd vitest run tests/bot_orders_perf_profile.test.ts tests/commander/briefing_campaign_intent.test.ts --reporter=dot` passed 19/19.
- `npm.cmd run typecheck` passed.
- Profiled 40w n1768 kept final hash `ea9f3db7ac59a443`.

## Next CPU Lane

`frontGeometry` is still the largest named commander bucket in the latest profile, while `buildOperations` remains larger than `detectZones`. The next CPU pass should start from fresh sub-label evidence and retain only a measured wall-clock win.
