# Commander DetectZones Must-Hold Queue Traversal

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1840`
**Baseline:** n1838 commander enemy-equipment summary context, hash `0cb626c032204372`
**Result:** n1840 kept final hash `0cb626c032204372`

## Summary

- Replaced the `detectZones.mustHold` component helper's per-depth frontier arrays with one append-only queue.
- Removed layer-level sorting from `collectFriendlyComponentsExcluding(...)` because the helper only returns component counts and booleans, not traversal order.
- Preserved component membership, scenario-authored must-hold behavior, sector `must_hold` fallback behavior, and engine-derived chokepoint predicates.

## Changes Made

### Must-Hold Component Traversal

- `src/sim/combat/commander/zone_detection.ts`
  - `collectFriendlyComponentsExcluding(...)` now uses `let queue = [source]` plus an index cursor.
  - The helper still iterates component sources via `sortedFriendlyOsids`, so component discovery order remains anchored to the same sorted source list.
  - The removed `next.sort(strictCompare)` did not feed any returned ordering; the helper returns only `memberCount`, `hasZoneOsid`, and `hasOutsideCorpsOsid`.

### Tests

- `tests/bot_orders_perf_profile.test.ts`
  - Added a static guard over `collectFriendlyComponentsExcluding(...)` so the helper stays queue-based and does not reintroduce per-layer sorting.

## Profile Results

### Hash And Gates

- Final hash: `0cb626c032204372`
- Anchor checks: 26/27
- Bot benchmarks: 6/6
- Anomalies: 9 total, 0 critical, 2 warnings

### Commander Zone Detection Path

| Label | n1838 | n1840 | Delta |
|---|---:|---:|---:|
| `commander.runCommanderForCorps.decide.assessSituation.detectZones` | 236.936ms | 202.165ms | -34.771ms |
| `.detectZones.buildZoneAssessments` | 205.252ms | 169.836ms | -35.416ms |
| `.detectZones.mustHold` | 110.264ms | 75.965ms | -34.299ms |
| `commander.runCommanderForCorps.decide.assessSituation` | 353.920ms | 321.523ms | -32.397ms |
| `commander.runCommanderForCorps.total` | 1086.928ms | 1078.638ms | -8.290ms |

The broader `bot_orders.executeFactionDirectives.total` label moved 1296.451ms -> 1279.638ms in this proof. The retained claim is the targeted must-hold traversal cut because nested profile labels remain noisy.

## Lessons Learned

- Adjacent-corps context caching was tried first in n1839 and rejected: `.buildBriefing.adjacentCorps` dropped 72.440ms -> 57.569ms, but the new context cost 20.050ms, making the isolated path slightly worse.
- For graph component helpers, sorted source iteration is sufficient when returned facts are order-insensitive. Sorting every BFS layer is wasted work unless member order is part of the contract.

## Verification

- Red first: `npm.cmd run test:vitest:fast -- -- tests\bot_orders_perf_profile.test.ts` failed on missing `let queue = [source]`.
- Green focused guard and briefing tests: `npm.cmd run test:vitest:fast -- -- tests\bot_orders_perf_profile.test.ts tests\commander\briefing_campaign_intent.test.ts` passed 21/21.
- Typecheck: `npm.cmd run typecheck` passed.
- Profile: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w` produced n1840 with final hash `0cb626c032204372`.
- Final docs-truth gate after bookkeeping: `npm.cmd run test:vitest:fast -- -- tests\bot_orders_perf_profile.test.ts tests\commander\briefing_campaign_intent.test.ts tests\docs_desktop_v09_truth.test.ts` passed 27/27, `npm.cmd run typecheck` passed, and `git diff --check` reported only line-ending normalization warnings.

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/commander/zone_detection.ts` | Uses queue traversal for must-hold component facts. |
| `tests/bot_orders_perf_profile.test.ts` | Guards the queue traversal shape and no per-layer sort regression. |
| `docs/40_reports/implemented/20260515_COMMANDER_DETECT_ZONES_MUST_HOLD_QUEUE.md` | This report. |

## Next Steps

- Choose the next CPU lane from a fresh profile.
- Current larger remaining buckets include `emitCommanderOutput.buildOperations.probe.deriveObjectives.predictDirectTargets`, `homeDefense.uncontestedOccupation`, and direct defender-power prediction children.
- Do not reintroduce per-layer sorting inside `collectFriendlyComponentsExcluding(...)` unless the helper starts returning ordered component members.
