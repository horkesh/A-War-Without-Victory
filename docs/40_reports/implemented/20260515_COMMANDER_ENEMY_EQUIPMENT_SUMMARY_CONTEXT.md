# Commander Enemy Equipment Summary Context

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1838`
**Baseline:** n1837 commander corps subordinates index, hash `0cb626c032204372`
**Result:** n1838 kept final hash `0cb626c032204372`

## Summary

- Moved commander briefing enemy-equipment summary support data out of the per-corps briefing hot path.
- Built a pass-local context with OSID-to-sector ownership and per-sector tank/artillery totals once before the commander loop.
- Preserved direct-call fallback behavior for `buildBriefing(...)` callers that do not provide the context.

## Changes Made

### Briefing Context

- `src/sim/combat/commander/briefing.ts`
  - Added `EnemyEquipmentSummaryContext` and `buildEnemyEquipmentSummaryContext(...)`.
  - The context contains `enemySectorByOsid` and `equipmentBySectorId`.
  - `collectEnemyEquipmentSummary(...)` now consumes the context when available, and otherwise builds the same data locally as before.

### Commander Loop

- `src/sim/combat/bot_corps_ai.ts`
  - Builds the context once per faction pass when `spatial` is available.
  - Profiles construction under `commander.runCommanderForCorps.enemyEquipmentSummaryContext`.
- `src/sim/combat/commander/commander_loop.ts`
  - Threads the optional context into `buildBriefing(...)`.

### Tests

- `tests/bot_orders_perf_profile.test.ts`
  - Guards the context builder, profile label, and briefing handoff.
- `tests/commander/briefing_campaign_intent.test.ts`
  - Existing enemy-equipment summary coverage passed with the fallback path intact.

## Profile Results

### Hash And Gates

- Final hash: `0cb626c032204372`
- Anchor checks: 26/27
- Bot benchmarks: 6/6
- Anomalies: 9 total, 0 critical, 2 warnings

### Commander Briefing Path

| Label | n1837 | n1838 | Delta |
|---|---:|---:|---:|
| `commander.runCommanderForCorps.buildBriefing` | 263.142ms | 149.336ms | -113.806ms |
| `.buildBriefing.enemyEquipmentSummary` | 115.916ms | 11.176ms | -104.740ms |
| `commander.runCommanderForCorps.enemyEquipmentSummaryContext` | n/a | 54.218ms | +54.218ms |
| Enemy-equipment net | 115.916ms | 65.394ms | -50.522ms |
| `commander.runCommanderForCorps.total` | 1206.734ms | 1086.928ms | -119.806ms |

The total bot-order label moved 1321.734ms -> 1296.451ms in this profiled run, but the retained claim is the targeted briefing summary cut because other nested-profile labels remain noisy.

## Verification

- Red first: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` failed on missing `commander.runCommanderForCorps.enemyEquipmentSummaryContext`.
- Green focused guard and briefing tests: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts tests/commander/briefing_campaign_intent.test.ts` passed 21/21.
- Typecheck: `npm.cmd run typecheck` passed.
- Profile: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs` produced n1838 with final hash `0cb626c032204372`.

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/commander/briefing.ts` | Adds pass-local enemy equipment summary context and indexed summary lookup. |
| `src/sim/combat/bot_corps_ai.ts` | Builds and profiles the context before commander briefing. |
| `src/sim/combat/commander/commander_loop.ts` | Threads the optional context into briefing assembly. |
| `tests/bot_orders_perf_profile.test.ts` | Guards profile and wiring. |
| `docs/40_reports/implemented/20260515_COMMANDER_ENEMY_EQUIPMENT_SUMMARY_CONTEXT.md` | This report. |

## Next Steps

- Pick the next CPU lane from a fresh profile.
- Current larger remaining commander buckets include `buildOperations.probe.deriveObjectives.predictDirectTargets`, `detectZones.mustHold`, `adjacentCorps`, and bot-order shared uncontested parents.
- Do not rebuild OSID-to-sector or per-sector equipment totals inside every corps briefing.
