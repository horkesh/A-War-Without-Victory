# Event Notification Narrative-Tone 1992 Slice

**Date:** 2026-05-22  
**Scope:** Phase D `notifications_to_other_factions` content backfill for the two narrative-tone 1992 foundational-decision rows.

## Summary

The narrative-tone residual bucket for `rs_strategic_goals` and `rbih_state_identity` is now implemented. Both events now provide authored notification text for every response and each non-source recipient faction.

## What Changed

- `rs_strategic_goals`: added RBiH/HRHB notifications for `selective` and `aggressive`.
- `rbih_state_identity`: added RS/HRHB notifications for `bosniak_national` and `pragmatic`.
- Extended the content backfill test to assert full non-source recipient coverage for both rows.

## Content Constraints

The new copy is framed as diplomatic/intelligence readout, uses only facts already present in the event row labels, descriptions, effects, and dimension shifts, and does not add new historical claims. It avoids omniscient private intent, new atrocity claims, new mechanics, and second-person player framing.

## Residual Delta

- Narrative-tone bucket: `2 rows / 8 blocks` -> `0 rows / 0 blocks`.
- Overall Phase D notification residual: `20 rows / 90 blocks` -> `18 rows / 82 blocks`.

## Verification

- `npx.cmd vitest run tests\sim\events\event_notification_content_backfill.test.ts tests\sim\events\two_level_surfacing.test.ts tests\ui\inboxItems.notifications.test.ts tests\event_timeline_integrity.test.ts --reporter=dot` PASS 28/28
- `npm.cmd run typecheck` PASS
- `git diff --check` PASS
