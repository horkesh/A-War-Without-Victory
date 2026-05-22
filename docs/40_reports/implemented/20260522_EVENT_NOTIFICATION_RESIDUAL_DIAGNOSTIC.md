# Event Notification Residual Diagnostic

**Date:** 2026-05-22
**Scope:** Tooling and test guard for Phase D notification backfill residual counts.

## Summary

Added `tools/diagnostics/event_notification_residuals.cjs`, a deterministic diagnostic that reads `data/scenarios/events/war_*.json`, finds `requires_player_response` events with a `responding_faction`, and counts missing non-source `notifications_to_other_factions[response_id][recipient]` blocks.

The diagnostic reports:

```text
Event notification residuals: 9 rows / 38 recipient blocks
```

The focused test `tests/sim/events/event_notification_residuals_diagnostic.test.ts` pins that floor and the residual event-id set so future content slices must update the executable proof, not only prose trackers.

## Behavior

No simulation behavior, save schema, scenario mechanics, event triggers, response effects, calibration/army-arc tuning, combat math, operation behavior, or notification emission behavior changed. This is diagnostics and regression coverage only.

## Verification

```powershell
node tools\diagnostics\event_notification_residuals.cjs
npx.cmd vitest run tests\sim\events\event_notification_residuals_diagnostic.test.ts --reporter=dot
```

## Files

- `tools/diagnostics/event_notification_residuals.cjs`
- `tests/sim/events/event_notification_residuals_diagnostic.test.ts`
- `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`
- `docs/plans/2026-05-18-event-notification-sensitive-content-review-plan.md`
