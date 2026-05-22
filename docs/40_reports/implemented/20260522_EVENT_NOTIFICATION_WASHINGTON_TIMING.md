# Event Notification Washington Timing Slice

**Date:** 2026-05-22
**Scope:** Phase D notification content backfill for Washington-timing policy rows.

## Summary

Two `war_1994.json` decision rows now have complete non-source recipient notification coverage:

- `washington_agreement_1994`
- `ic_rbih_restraint_post_washington`

This closes the Washington-timing residual bucket: 2 rows / 8 recipient blocks.

## Policy Guard

The copy preserves the established two-clock Washington policy:

- `washington_agreement_1994` describes the formal authored week-102 Washington Agreement event.
- `ic_rbih_restraint_post_washington` describes the later post-Washington military window and does not imply that the formal agreement fired early.

All added text is third-person intelligence/diplomatic readout copy grounded in existing event title, narrative, response labels, effects, and dimension shifts. No scenario data, event triggers, mechanics, save schema, calibration/army-arc tuning, sensitive-history rupture behavior, or late-war outcome policy changed.

## Verification

- `npx.cmd vitest run tests\sim\events\event_notification_content_backfill.test.ts tests\sim\events\two_level_surfacing.test.ts tests\ui\inboxItems.notifications.test.ts tests\event_timeline_integrity.test.ts --reporter=dot` PASS 29/29
- `npm.cmd run typecheck` PASS
- `git diff --check` PASS

## Residual

Phase D notification residual is now 16 rows / 74 recipient blocks:

- Historian-required: 6 rows / 28 blocks
- Late-war outcome policy: 7 rows / 28 blocks
- Front-visit mixed-sensitive: 3 rows / 18 blocks
