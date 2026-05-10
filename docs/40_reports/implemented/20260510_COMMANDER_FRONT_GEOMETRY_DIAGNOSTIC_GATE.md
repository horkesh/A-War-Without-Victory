# Commander Front Geometry Diagnostic Gate

**Date:** 2026-05-10  
**Lane:** v0.9.3/v0.9.4 CPU performance profiling / commander briefing  
**Commit:** this commit  
**Ring:** N/A, pure performance/read-model gating

## Summary

The latest profile showed `commander.runCommanderForCorps.buildBriefing.frontGeometry.analyze` as the next real wall-clock cost. A production search found no current consumer of `CommanderBriefing.front_geometry`; tests and types carry the nullable field, but commander decision, emit, UI, and save paths do not read it.

This pass keeps the read model available for diagnostics, but stops computing it during normal commander briefing assembly.

## Implementation

- Added `AWWV_COMMANDER_FRONT_GEOMETRY=true` / `1` as an explicit diagnostic opt-in.
- Kept `CommanderBriefing.front_geometry` as the same nullable field.
- Default briefing assembly now returns `front_geometry: null` without collecting or analyzing front geometry.
- Opt-in briefing assembly still runs the existing deterministic `analyzeFrontGeometry(...)` path.

## Measured Result

Baseline retained profile:

- Run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1769`
- Final hash: `ea9f3db7ac59a443`
- `commander.runCommanderForCorps.buildBriefing`: 892.256 ms
- `commander.runCommanderForCorps.buildBriefing.frontGeometry`: 517.222 ms
- `commander.runCommanderForCorps.buildBriefing.frontGeometry.analyze`: 497.416 ms
- `commander.runCommanderForCorps.total`: 1,889.297 ms

Post-change profile:

- Run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1771`
- Final hash: `ea9f3db7ac59a443`
- `commander.runCommanderForCorps.buildBriefing`: 372.027 ms
- `commander.runCommanderForCorps.buildBriefing.frontGeometry`: 2.247 ms
- `commander.runCommanderForCorps.buildBriefing.frontGeometry.analyze`: not emitted in the default path
- `commander.runCommanderForCorps.total`: 1,381.411 ms

## Validation

- Red first: `npx.cmd vitest run tests/commander/briefing_campaign_intent.test.ts --reporter=dot` failed because default briefing still computed `front_geometry`.
- Green focused: `npx.cmd vitest run tests/commander/briefing_campaign_intent.test.ts --reporter=dot` passed 16/16.
- Profile proof: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs` produced `n1771` with final hash `ea9f3db7ac59a443`.

## Canon Posture

No scenario data, OOB, operation definition, combat math, commander decision consumer, event trigger, score rule, save schema, player command lever, or sensitive-history canon changed. This gates an unused diagnostic read model while keeping it available on request.

## Next CPU Targets

The current largest measured commander buckets after this pass are:

- `commander.runCommanderForCorps.decide.emitCommanderOutput.buildOperations`
- `commander.runCommanderForCorps.decide.assessSituation.detectZones`
- `commander.runCommanderForCorps.buildBriefing.enemyEquipmentSummary`

The next CPU pass should start from a fresh profile and retain only measured wall-clock wins.
