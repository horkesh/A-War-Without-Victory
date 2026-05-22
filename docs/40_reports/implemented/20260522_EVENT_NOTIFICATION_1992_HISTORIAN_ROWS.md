# Event Notification 1992 Historian Rows

**Date:** 2026-05-22
**Scope:** Phase D `notifications_to_other_factions` content backfill for two 1992 historian-required rows.

## Summary

Added non-source recipient notification coverage for:

- `war_1992.json` / `drina_cleansing_decision_1992`: `systematic` and `restrained` responses to RBiH and HRHB.
- `war_1992.json` / `concentration_camps_revealed_1992`: `deny`, `obstruct`, and `cooperate` responses to RBiH and HRHB.

The copy is limited to diplomatic/intelligence readouts already supported by the authored rows and their cited historical-source fields. BB support reviewed for the 1992 slice included Drina/Prijedor context and international detention-camp access pressure in BB1 pp.5 and 145. No graphic detail, new casualty claim, new event trigger, response effect, timeline rule, feature flag, or simulation behavior changed.

## Residual Impact

`tools/diagnostics/event_notification_residuals.cjs` now reports 3 residual rows / 10 recipient blocks:

- `srebrenica_demilitarization_1993`: 6 blocks, still historian-required because the local BB search did not surface the exact demilitarization agreement support.
- `visit_to_front_rs`: 2 blocks, blocked-sensitive press option.
- `visit_to_front_hrhb`: 2 blocks, blocked-sensitive press option.

## Verification

Completed verification:

```powershell
node -e "JSON.parse(require('fs').readFileSync('data/scenarios/events/war_1992.json','utf8')); JSON.parse(require('fs').readFileSync('data/scenarios/events/war_1993.json','utf8')); console.log('event json ok')"
node tools\diagnostics\event_notification_residuals.cjs --json
npx.cmd vitest run tests\sim\events\event_notification_content_backfill.test.ts tests\sim\events\event_notification_residuals_diagnostic.test.ts tests\sim\events\two_level_surfacing.test.ts tests\ui\inboxItems.notifications.test.ts tests\event_timeline_integrity.test.ts --reporter=dot
npm.cmd run typecheck
git diff --check
```

Results: JSON parse passed; residual diagnostic reported 3 rows / 10 blocks; focused tests passed 36/36; typecheck passed; diff check passed.
