# Commander Enemy Equipment Index Profile

**Date:** 2026-05-10  
**Lane:** v0.9.3/v0.9.4 CPU performance profiling / commander briefing  
**Commit:** this commit  
**Ring:** N/A, pure performance refactor

## Summary

After gating the unused front-geometry diagnostic read model, the next measured briefing hotspot was `commander.runCommanderForCorps.buildBriefing.enemyEquipmentSummary`.

The old path called `findSectorForEnemyOsid(...)` for every enemy OSID in every corps sector subsegment. That helper performs sorted full-sector scans, so the briefing was rebuilding the same defender-sector answer many times.

## Implementation

- Added `buildEnemySectorByOsid(...)` inside commander briefing assembly.
- The index is rebuilt once per briefing from the already-loaded `corps_front_sectors`.
- It preserves the existing lookup precedence:
  - front-edge `friendly_osids` first
  - `territory_osids` fallback second
  - first sector in deterministic `sector_id` order wins
- `collectEnemyEquipmentSummary(...)` now uses `enemySectorByOsid.get(enemyOsid)` instead of repeatedly scanning all sectors.

## Measured Result

Baseline retained profile:

- Run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1771`
- Final hash: `ea9f3db7ac59a443`
- `commander.runCommanderForCorps.buildBriefing`: 372.027 ms
- `commander.runCommanderForCorps.buildBriefing.enemyEquipmentSummary`: 166.376 ms
- `commander.runCommanderForCorps.total`: 1,381.411 ms

Post-change profile:

- Run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1772`
- Final hash: `ea9f3db7ac59a443`
- `commander.runCommanderForCorps.buildBriefing`: 324.490 ms
- `commander.runCommanderForCorps.buildBriefing.enemyEquipmentSummary`: 119.960 ms
- `commander.runCommanderForCorps.total`: 1,313.706 ms

## Validation

- Red first: `npx.cmd vitest run tests/bot_orders_perf_profile.test.ts --reporter=dot` failed on the missing indexed lookup guard.
- Green focused: `npx.cmd vitest run tests/bot_orders_perf_profile.test.ts tests/commander/briefing_campaign_intent.test.ts --reporter=dot` passed 21/21.
- Profile proof: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs` produced `n1772` with final hash `ea9f3db7ac59a443`.

## Canon Posture

No scenario data, OOB, operation definition, combat math, commander decision semantics, event trigger, score rule, save schema, player command lever, or sensitive-history canon changed. This is a deterministic lookup refactor inside a briefing read model.

## Next CPU Targets

The next largest measured commander buckets are:

- `commander.runCommanderForCorps.decide.emitCommanderOutput.buildOperations`
- `commander.runCommanderForCorps.decide.assessSituation.detectZones`

The next CPU pass should start from a fresh profile and reject any candidate that fails to move those real buckets.
