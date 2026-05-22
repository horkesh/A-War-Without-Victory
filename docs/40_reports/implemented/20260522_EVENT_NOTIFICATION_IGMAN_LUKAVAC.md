# Event Notification Igman/Lukavac Slice

**Date:** 2026-05-22
**Scope:** Phase D notification content backfill for `operation_lukavac_93`.

## Summary

This slice completes non-source recipient notification coverage for `operation_lukavac_93`.

The copy is limited to the authored row's military and diplomatic posture:

- RS complies with the UN-brokered withdrawal demand after the Lukavac 93 advance.
- RS defies NATO and holds the Igman positions despite air-strike risk.

## Historian Basis

The event row is supported by the BB2 account of Operation Lukavac 93: VRS forces advanced through Trnovo toward Igman and Bjelasnica, threatened Sarajevo's remaining supply route, and withdrew slowly under Western/NATO pressure after the air-strike threat (BB2 pp.391-392).

No new casualty figures, atrocity claims, or final outcome claims are introduced.

## Residual Delta

Before this slice, Phase D notification residuals stood at 7 rows / 30 recipient blocks after the NATO/UN crisis slice.

After this slice:

- historian-required residual: 3 rows / 16 blocks;
- total Phase D residual: 6 rows / 26 blocks.

## Verification

Required verification:

```powershell
node -e "JSON.parse(require('fs').readFileSync('data/scenarios/events/war_1993.json','utf8')); console.log('war_1993 json ok')"
node tools\diagnostics\event_notification_residuals.cjs
npx.cmd vitest run tests\sim\events\event_notification_content_backfill.test.ts tests\sim\events\event_notification_residuals_diagnostic.test.ts tests\sim\events\two_level_surfacing.test.ts tests\ui\inboxItems.notifications.test.ts tests\event_timeline_integrity.test.ts --reporter=dot
npm.cmd run typecheck
git diff --check
```

## Files

- `data/scenarios/events/war_1993.json`
- `tests/sim/events/event_notification_content_backfill.test.ts`
- `tests/sim/events/event_notification_residuals_diagnostic.test.ts`
- `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`
- `docs/plans/2026-05-18-event-notification-sensitive-content-review-plan.md`
