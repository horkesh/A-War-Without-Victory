# Event Notification Front-Visit Command-Signaling Slice

**Date:** 2026-05-22
**Scope:** Phase D notification content backfill for front-visit command-signaling options.

## Summary

This slice adds non-source recipient notification coverage for:

- `visit_to_front_rbih`: `visit_sarajevo`
- `visit_to_front_rs`: `visit_sarajevo_lines`, `visit_drina_front`

The copy is restricted to visible command presence, morale signaling, siege-line/eastern-front posture, and international scrutiny already present in the event rows. It does not add new historical claims, casualty figures, detention/atrocity claims, sensitive-history rupture content, event triggers, response effects, simulation behavior, save schema, operation behavior, calibration/army-arc tuning, combat math, or painted-target changes.

## Deferred Blocks

The only remaining front-visit notification gaps are blocked-sensitive press options:

- `visit_to_front_rs`: `visit_press_rs`
- `visit_to_front_hrhb`: `visit_press_hrhb`

## Residual Delta

Before this slice, Phase D notification residuals stood at 6 rows / 26 recipient blocks after the Igman/Lukavac slice.

After this slice:

- front-visit mixed-sensitive residual: 2 rows / 4 blocks;
- total Phase D residual: 5 rows / 20 blocks.

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
