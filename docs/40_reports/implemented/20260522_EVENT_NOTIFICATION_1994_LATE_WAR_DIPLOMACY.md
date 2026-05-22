# Event Notification 1994 Late-War Diplomacy Slice

**Date:** 2026-05-22
**Scope:** Phase D notification content backfill for three 1994 late-war diplomacy rows.

## Summary

Three `war_1994.json` decision rows now have complete non-source recipient notification coverage:

- `contact_group_plan_1994`
- `belgrade_embargo_rs_1994`
- `carter_ceasefire_1994`

This closes 3 rows / 12 recipient blocks from the late-war outcome-policy bucket.

## Policy Guard

The copy is proposal- and pressure-focused:

- Contact Group text describes acceptance/rejection of the proposed 51/49 framework without asserting final settlement facts.
- Belgrade embargo text describes the Belgrade-Pale split, supply pressure, and RS response posture without resolving later patron or battlefield outcomes.
- Carter ceasefire text describes compliance or preparation posture during the winter pause without asserting the later spring campaign.

No scenario data, event triggers, mechanics, save schema, calibration/army-arc tuning, sensitive-history rupture behavior, or late-war outcome policy changed.

## Verification

- `npx.cmd vitest run tests\sim\events\event_notification_content_backfill.test.ts tests\sim\events\two_level_surfacing.test.ts tests\ui\inboxItems.notifications.test.ts tests\event_timeline_integrity.test.ts --reporter=dot` PASS 30/30
- `npm.cmd run typecheck` PASS
- `git diff --check` PASS

## Residual

Phase D notification residual is now 13 rows / 62 recipient blocks:

- Historian-required: 6 rows / 28 blocks
- Late-war outcome policy: 4 rows / 16 blocks
- Front-visit mixed-sensitive: 3 rows / 18 blocks
