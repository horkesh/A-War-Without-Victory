# Event Notification 1995 Late-War Outcome Slice

**Date:** 2026-05-22
**Scope:** Phase D notification content backfill for four 1995 late-war outcome rows.

## Summary

This slice completes `notifications_to_other_factions` coverage for:

- `karadzic_mladic_split_1995`
- `us_halts_federation_advance_1995`
- `holbrooke_ceasefire_demand_oct95`
- `dayton_talks_begin_1995`

The new recipient text is observational and grounded in existing event titles, narratives, response labels, response descriptions, effects, dimension shifts, and historical-source fields. It does not change simulation behavior, event triggers, response effects, save schema, operation behavior, calibration/army-arc tuning, combat math, or painted targets.

## Policy

The late-war outcome gate is closed only for copy that stays compatible with alternate simulation state:

- command-crisis copy describes the Pale-Mladic rupture without asserting later battlefield consequences;
- Washington-halt copy describes the halt warning, Banja Luka pressure, refugee-catastrophe risk, and diplomatic cost already present in the event row;
- ceasefire copy describes accept/continue posture and US-support risk without asserting final Dayton success;
- Dayton-talks copy describes opening negotiation posture without asserting final signed terms.

## Residual Delta

Before this slice, Phase D notification residuals stood at 13 rows / 62 recipient blocks after the 1994 late-war diplomacy slice.

After this slice:

- late-war outcome policy residual: 0 rows / 0 blocks;
- total Phase D residual: 9 rows / 46 blocks;
- remaining lanes: historian-required and front-visit mixed-sensitive.

## Verification

Required verification:

```powershell
node -e "JSON.parse(require('fs').readFileSync('data/scenarios/events/war_1995.json','utf8')); console.log('war_1995 json ok')"
npx.cmd vitest run tests\sim\events\event_notification_content_backfill.test.ts tests\sim\events\two_level_surfacing.test.ts tests\ui\inboxItems.notifications.test.ts tests\event_timeline_integrity.test.ts --reporter=dot
npm.cmd run typecheck
git diff --check
```

## Files

- `data/scenarios/events/war_1995.json`
- `tests/sim/events/event_notification_content_backfill.test.ts`
- `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`
- `docs/plans/2026-05-18-event-notification-sensitive-content-review-plan.md`
- `docs/40_reports/audits/20260521_EVENT_NOTIFICATION_RESIDUAL_REVIEW_MATRIX.md`
