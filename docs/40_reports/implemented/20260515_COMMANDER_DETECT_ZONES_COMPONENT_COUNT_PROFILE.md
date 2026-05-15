# Commander Detect Zones Component Count Profile

**Date:** 2026-05-15
**Lane:** v0.9.3/v0.9.4 CPU performance profiling / commander detect-zones
**Baseline run:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1775`
**Result run:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1776`
**Final hash:** `7ef09f55d6494edd` before and after

## Summary

- Ran a fresh post-crash 40-week commander profile to avoid relying on stale May 10 wall-clock assumptions.
- Kept the target narrow: `detectZones.mustHold` component analysis now tracks component size as a number instead of allocating a full member set for every component.
- Removed an unused `bfsCountExcluding` helper in the same hot-path module.

## Changes Made

### Detect-Zones Component Facts

- `src/sim/combat/commander/zone_detection.ts`
  - Replaced `FriendlyComponentFacts.members: Set<string>` with `memberCount: number`.
  - Incremented `memberCount` during traversal instead of adding every member to a per-component set.
  - Preserved the existing `visited` set, sorted frontier order, and `hasZoneOsid` / `hasOutsideCorpsOsid` facts.
  - Removed unused `bfsCountExcluding`.

### Regression Guard

- `tests/bot_orders_perf_profile.test.ts`
  - Added a static guard that keeps `mustHold` component collection count-based and prevents reintroducing the unused helper or per-component member set.

## Measured Result

| Bucket | n1775 baseline | n1776 result | Delta |
|---|---:|---:|---:|
| `commander.runCommanderForCorps.decide.assessSituation.detectZones` | 278.073 ms | 248.538 ms | -29.535 ms |
| `commander.runCommanderForCorps.decide.assessSituation.detectZones.buildZoneAssessments` | 239.846 ms | 213.348 ms | -26.498 ms |
| `commander.runCommanderForCorps.decide.assessSituation.detectZones.mustHold` | 131.504 ms | 112.200 ms | -19.304 ms |
| `commander.runCommanderForCorps.decide.emitCommanderOutput.buildOperations` | 302.647 ms | 280.458 ms | -22.189 ms |
| `commander.runCommanderForCorps.total` | 1,482.397 ms | 1,352.270 ms | -130.127 ms |

Both runs reported 26/27 anchors and the same final hash `7ef09f55d6494edd`.

## Validation

- Red first: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` failed on missing `memberCount`.
- Green focused: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` passed 5/5.
- Commander behavior-adjacent: `npx.cmd vitest run tests\commander\briefing_campaign_intent.test.ts tests\commander\commander.test.ts --reporter=dot` passed 70/70.
- TypeScript: `npm.cmd run typecheck` passed.
- Profile proof: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs` produced n1776 with final hash `7ef09f55d6494edd`.

## Canon Posture

No gameplay rule, scenario data, OOB data, event trigger, combat math, score rule, save schema, player command lever, or sensitive-history adjudication changed. This is a deterministic allocation reduction inside an existing commander read-path helper. Normal runs still do not collect performance samples unless `PERF_PROFILE_BOT_ORDERS=true` is set.

## Next Steps

- Start the next CPU pass from a fresh profile rather than assuming a fixed target; today `buildOperations` and `detectZones` remain close enough that machine/run variance matters.
- Retain only candidates with a same-hash profile proof and a clear local hot bucket.
