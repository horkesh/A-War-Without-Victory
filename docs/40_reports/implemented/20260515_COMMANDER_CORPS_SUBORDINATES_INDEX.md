# Commander Corps Subordinates Index

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1837`
**Baseline:** n1836 uncontested candidate-gates profile split, hash `0cb626c032204372`
**Result:** n1837 kept final hash `0cb626c032204372`

## Summary

- Added a deterministic per-faction-pass corps subordinate index for commander briefing assembly.
- Reused the index inside `buildBriefing(...)` so each corps no longer rescans every formation for its active brigades.
- Preserved direct-call fallback behavior for tests and any caller that does not provide the index.

## Changes Made

### Subordinate Index

- `src/sim/combat/bot_corps_helpers.ts`
  - Added `buildCorpsSubordinatesByCorps(...)`.
  - The builder scans sorted formation IDs once, keeps active brigades only, groups by `corps_id`, and preserves the fallback helper's deterministic per-corps order.
  - `getCorpsSubordinates(...)` now accepts an optional read-only index and returns a copy of indexed results, matching the old fresh-array contract.

### Commander Loop

- `src/sim/combat/bot_corps_ai.ts`
  - Builds the index once before the per-corps commander loop when `spatial` is available.
  - Profiles construction under `commander.runCommanderForCorps.corpsSubordinatesIndex`.
- `src/sim/combat/commander/commander_loop.ts` and `src/sim/combat/commander/briefing.ts`
  - Thread the optional index into `buildBriefing(...)`.
  - Keep the existing `commander.runCommanderForCorps.buildBriefing.getCorpsSubordinates` child label around the lookup.

### Tests

- `tests/bot_orders_perf_profile.test.ts`
  - Guards the index builder, profile label, and briefing handoff.
- `tests/corps_subordinates_index.test.ts`
  - Proves indexed subordinate results match fallback ordering, ignore inactive/non-brigade formations, return empty arrays for missing corps, and preserve the fresh-array contract.

## Profile Results

### Hash And Gates

- Final hash: `0cb626c032204372`
- Anchor checks: 26/27
- Bot benchmarks: 6/6
- Anomalies: 9 total, 0 critical, 2 warnings

### Commander Briefing Path

| Label | n1836 | n1837 | Delta |
|---|---:|---:|---:|
| `commander.runCommanderForCorps.buildBriefing` | 324.411ms | 263.142ms | -61.269ms |
| `.buildBriefing.getCorpsSubordinates` | 63.641ms | 0.597ms | -63.044ms |
| `commander.runCommanderForCorps.corpsSubordinatesIndex` | n/a | 13.532ms | +13.532ms |
| Subordinate net | 63.641ms | 14.129ms | -49.512ms |
| `commander.runCommanderForCorps.total` | 1259.079ms | 1206.734ms | -52.345ms |

Other briefing labels moved with normal profile variance: `enemyEquipmentSummary` measured 121.252ms -> 115.916ms, while `adjacentCorps` measured 68.404ms -> 75.366ms. The retained claim is the targeted subordinate lookup cut, not a broad total bot-order wall-clock claim.

## Verification

- Red first: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` failed on missing `commander.runCommanderForCorps.corpsSubordinatesIndex`.
- Green focused guard and behavior test: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts tests/corps_subordinates_index.test.ts` passed 6/6.
- Typecheck: `npm.cmd run typecheck` passed.
- Profile: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs` produced n1837 with final hash `0cb626c032204372`.

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/bot_corps_helpers.ts` | Adds deterministic corps subordinate index and indexed lookup fallback. |
| `src/sim/combat/bot_corps_ai.ts` | Builds and profiles the pass-local index before commander briefing. |
| `src/sim/combat/commander/commander_loop.ts` | Threads the optional index into briefing assembly. |
| `src/sim/combat/commander/briefing.ts` | Consumes the optional index in `getCorpsSubordinates`. |
| `tests/bot_orders_perf_profile.test.ts` | Guards profile and wiring. |
| `tests/corps_subordinates_index.test.ts` | Adds equivalence and fresh-array behavior coverage. |
| `docs/40_reports/implemented/20260515_COMMANDER_CORPS_SUBORDINATES_INDEX.md` | This report. |

## Next Steps

- Pick the next CPU lane from a fresh profile.
- Current larger measured buckets include commander `buildOperations.probe.deriveObjectives.predictDirectTargets`, `buildBriefing.enemyEquipmentSummary`, `detectZones.mustHold`, and bot-order home-defense/shared uncontested parents.
- Do not reintroduce per-corps full-formation scans for subordinate lookup.
