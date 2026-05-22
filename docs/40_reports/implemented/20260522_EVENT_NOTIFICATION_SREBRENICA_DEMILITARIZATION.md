# Event Notification Srebrenica Demilitarization

**Date:** 2026-05-22
**Scope:** Phase D `notifications_to_other_factions` content backfill for `srebrenica_demilitarization_1993`.

## Summary

Added non-source recipient notification coverage for:

- `comply_fully` to RS and HRHB.
- `hide_weapons` to RS and HRHB.
- `refuse` to RS and HRHB.

The copy is limited to the authored row's agreement, UNPROFOR-supervision, disarmament, international-standing, and enclave-defense tradeoff. It avoids casualty claims, later 1995 outcome claims, and new humanitarian-convoy facts. External source review used the ICTY Krstic Trial Judgment's Srebrenica safe-area discussion plus the PA-X/UN agreement records for the April/May 1993 demilitarization terms.

Source references:

- ICTY Krstic Trial Judgment, Parts I-II: https://www.icty.org/x/cases/krstic/tjug/en/krs-tj010802e-1.htm
- PA-X, Agreement for the Demilitarization of Srebrenica, 17 April 1993: https://www.peaceagreements.org/view/1027/
- PA-X, Agreement on the Demilitarization of Srebrenica and Zepa, 8 May 1993: https://www.peaceagreements.org/agreements/1483/

## Residual Impact

`tools/diagnostics/event_notification_residuals.cjs` now reports 2 residual rows / 4 recipient blocks. The remaining blocks are only the blocked-sensitive press options:

- `visit_to_front_rs` / `visit_press_rs`: RBiH and HRHB.
- `visit_to_front_hrhb` / `visit_press_hrhb`: RBiH and RS.

## Verification

Completed verification:

```powershell
node -e "JSON.parse(require('fs').readFileSync('data/scenarios/events/war_1992.json','utf8')); JSON.parse(require('fs').readFileSync('data/scenarios/events/war_1993.json','utf8')); console.log('event json ok')"
node tools\diagnostics\event_notification_residuals.cjs --json
npx.cmd vitest run tests\sim\events\event_notification_content_backfill.test.ts tests\sim\events\event_notification_residuals_diagnostic.test.ts tests\sim\events\two_level_surfacing.test.ts tests\ui\inboxItems.notifications.test.ts tests\event_timeline_integrity.test.ts --reporter=dot
npm.cmd run typecheck
git diff --check
```

Results: JSON parse passed; residual diagnostic reported 2 rows / 4 blocks; focused tests passed 37/37; typecheck passed; diff check passed.
