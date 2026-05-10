# Commander Front Geometry Input Scan Profile

**Date:** 2026-05-10  
**Lane:** CPU performance profiling / commander briefing  
**Commit:** pending at report authoring  
**Ring:** N/A, pure performance and default-off instrumentation

## Summary

This pass targeted the next proven commander hot spot after `detectZones`: `commander.runCommanderForCorps.buildBriefing.frontGeometry`.

The previous retained 40w profile (`n1768`) showed:

- `buildBriefing`: 1,010.406 ms total
- `buildBriefing.frontGeometry`: 647.155 ms total
- `commander.runCommanderForCorps.total`: 1,977.369 ms total

The optimization keeps the existing front-geometry analysis but stops rebuilding the hostile-boundary input by scanning adjacency from every corps territory OSID when the sector substrate already exposes `sub_segments[].enemy_osids`. The old adjacency scan remains as a fallback for sparse or pre-subsegment states.

## Implementation

- Added `frontGeometry.collectOsids` and `frontGeometry.analyze` profiler sub-buckets under the existing default-off `PERF_PROFILE_BOT_ORDERS=true` profiler.
- Added deterministic `collectFrontGeometryEnemyOsids(...)`.
- Prefer sector `subSegment.enemy_osids` for front-boundary enemy OSIDs.
- Preserve the old friendly-adjacency scan as fallback when no subsegment enemy OSIDs exist.
- Preserve stable sorting through `strictCompare`.

## Measured Result

Profiled 40w run:

- Run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1769`
- Final hash: `ea9f3db7ac59a443`

Post-change profile:

- `buildBriefing`: 892.256 ms total
- `buildBriefing.frontGeometry`: 517.222 ms total
- `frontGeometry.collectOsids`: 16.850 ms total
- `frontGeometry.analyze`: 497.416 ms total
- `commander.runCommanderForCorps.total`: 1,889.297 ms total

Versus `n1768`, this cuts `frontGeometry` by about 129.933 ms and `buildBriefing` by about 118.149 ms over the 40w run while preserving the scenario hash.

## Validation

- Red first: `npx.cmd vitest run tests/bot_orders_perf_profile.test.ts --reporter=dot` failed on missing `frontGeometry.collectOsids`.
- Green focused suite: `npx.cmd vitest run tests/bot_orders_perf_profile.test.ts tests/front_geometry_analysis.test.ts tests/commander/briefing_campaign_intent.test.ts --reporter=dot` passed 31/31.
- Profile proof: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w` produced `n1769` with final hash `ea9f3db7ac59a443`.

## Canon Posture

No scenario data, OOB, operation definition, combat math, event trigger, score rule, save schema, player lever, or sensitive-history canon changed. The profiler remains default-off and writes only `data/derived/_debug/bot_orders_perf_profile.json` when explicitly enabled.

## Next CPU Targets

The next CPU pass should use a fresh profile before editing. Current remaining candidates are:

- `emitCommanderOutput.buildOperations`
- `frontGeometry.analyze`
- other measured `assessSituation.detectZones` internals

Reject candidate optimizations that do not produce a measured wall-clock win.
