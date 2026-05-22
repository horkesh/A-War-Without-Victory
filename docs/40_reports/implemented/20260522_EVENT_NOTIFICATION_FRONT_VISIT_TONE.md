# Event Notification Front-Visit Narrative-Tone Slice

**Date:** 2026-05-22
**Scope:** Phase D notification content backfill for the narrative-tone subset of recurring front-visit rows.

## Summary

This slice adds `notifications_to_other_factions` coverage for:

- `visit_to_front_rbih`: `visit_bihac`, `visit_press_rbih`
- `visit_to_front_hrhb`: `visit_mostar_front`, `visit_central_bosnia`

The copy is limited to command-presence, morale, logistics, media, and diplomatic-signaling information already present in the event rows. It does not add new historical claims, new sensitive-history rupture content, event triggers, response effects, simulation behavior, save schema, operation behavior, calibration/army-arc tuning, combat math, or painted-target changes.

## Deferred Blocks

The following front-visit blocks remain absent:

- `visit_to_front_rbih`: `visit_sarajevo` remains historian-gated because it intersects Sarajevo siege framing.
- `visit_to_front_rs`: `visit_sarajevo_lines` and `visit_drina_front` remain historian-gated; `visit_press_rs` remains blocked-sensitive.
- `visit_to_front_hrhb`: `visit_press_hrhb` remains blocked-sensitive because the row itself references managed detention-camp avoidance.

## Residual Delta

Before this slice, Phase D notification residuals stood at 9 rows / 46 recipient blocks after the 1995 late-war outcome slice.

After this slice:

- front-visit mixed-sensitive residual: 3 rows / 10 blocks;
- total Phase D residual: 9 rows / 38 blocks;
- all narrative-tone notification residuals are now closed.

## Verification

Required verification:

```powershell
node -e "JSON.parse(require('fs').readFileSync('data/scenarios/events/war_1993.json','utf8')); console.log('war_1993 json ok')"
npx.cmd vitest run tests\sim\events\event_notification_content_backfill.test.ts tests\sim\events\two_level_surfacing.test.ts tests\ui\inboxItems.notifications.test.ts tests\event_timeline_integrity.test.ts --reporter=dot
npm.cmd run typecheck
git diff --check
```

## Files

- `data/scenarios/events/war_1993.json`
- `tests/sim/events/event_notification_content_backfill.test.ts`
- `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`
- `docs/plans/2026-05-18-event-notification-sensitive-content-review-plan.md`
- `docs/40_reports/audits/20260521_EVENT_NOTIFICATION_RESIDUAL_REVIEW_MATRIX.md`
