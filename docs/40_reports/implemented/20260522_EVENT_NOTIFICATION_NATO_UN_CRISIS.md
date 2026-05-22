# Event Notification NATO/UN Crisis Slice

**Date:** 2026-05-22
**Scope:** Phase D notification content backfill for two historian-cleared crisis rows.

## Summary

This slice completes non-source recipient notification coverage for:

- `nato_ultimatum_sarajevo_1994`
- `un_hostage_crisis_1995`

The new text is limited to diplomatic and military posture already present in the authored event rows: Sarajevo heavy-weapons exclusion-zone compliance/defiance, NATO air-strike risk, UN hostage leverage, phased release, and diplomatic damage.

## Historian Basis

- The Sarajevo ultimatum row is supported by its Markale prerequisite and by the BB chronology describing NATO's 9 February 1994 demand for heavy weapons to be pulled 20 km back from Sarajevo or placed under UN control, with noncompliant weapons treated as air-strike targets (BB1 p.17; BB2 pp.455-456).
- The UN hostage row is supported by its authored event text and BB chronology describing NATO strikes near Pale, subsequent hostage-taking, and releases in June 1995 (BB1 pp.36-37).

No new casualty numbers, atrocity claims, or final outcome claims are introduced.

## Residual Delta

Before this slice, Phase D notification residuals stood at 9 rows / 38 recipient blocks after the front-visit narrative-tone slice.

After this slice:

- historian-required residual: 4 rows / 20 blocks;
- total Phase D residual: 7 rows / 30 blocks.

## Verification

Required verification:

```powershell
node -e "JSON.parse(require('fs').readFileSync('data/scenarios/events/war_1994.json','utf8')); JSON.parse(require('fs').readFileSync('data/scenarios/events/war_1995.json','utf8')); console.log('war_1994/1995 json ok')"
node tools\diagnostics\event_notification_residuals.cjs
npx.cmd vitest run tests\sim\events\event_notification_content_backfill.test.ts tests\sim\events\event_notification_residuals_diagnostic.test.ts tests\sim\events\two_level_surfacing.test.ts tests\ui\inboxItems.notifications.test.ts tests\event_timeline_integrity.test.ts --reporter=dot
npm.cmd run typecheck
git diff --check
```

## Files

- `data/scenarios/events/war_1994.json`
- `data/scenarios/events/war_1995.json`
- `tests/sim/events/event_notification_content_backfill.test.ts`
- `tests/sim/events/event_notification_residuals_diagnostic.test.ts`
- `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`
- `docs/plans/2026-05-18-event-notification-sensitive-content-review-plan.md`
