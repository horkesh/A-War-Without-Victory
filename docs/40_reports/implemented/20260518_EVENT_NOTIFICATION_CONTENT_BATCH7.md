# Event Notification Content Batch 7

**Date:** 2026-05-18
**Owner:** Codex Batch 7 safe event-notification content lane

## Scope
- Continued Phase D `notifications_to_other_factions` backfill for clearly safe, non-sensitive rows only.
- Authored recipient notifications for the three recurring 1993 strategic posture review events:
  - `strategic_posture_review_rbih`
  - `strategic_posture_review_rs`
  - `strategic_posture_review_hrhb`
- No UI, trigger, effect, ordering, runtime, or feature-flag behavior changed.

## Coverage Delta
- `war_1993.json` `strategic_posture_review_rbih`: `0/8 -> 8/8`
- `war_1993.json` `strategic_posture_review_rs`: `0/8 -> 8/8`
- `war_1993.json` `strategic_posture_review_hrhb`: `0/8 -> 8/8`
- Total Batch 7 added authored recipient-copy rows: 24.

## Basis
- Content is derived only from existing event narrative, response labels, response descriptions, effects, dimension shifts, and posture flags.
- These rows are generic posture-setting decisions rather than sensitive-history atrocity/enclave rows or late-war diplomacy outcome rows.
- Recipient text is informational and mirrors the responding faction's selected posture; it does not add new event consequences.

## Gated Residual Rows
- Sensitive-history atrocity/displacement/detention rows remain gated: `drina_cleansing_decision_1992`, `concentration_camps_revealed_1992`.
- Enclave/siege-sensitive rows remain gated: `srebrenica_demilitarization_1993`, `operation_lukavac_93`, and front-visit options with enclave/Drina/Mostar detention implications.
- Croat-Bosniak conflict rows remain historian/narrative-gated where copy could imply disputed escalation or civilian-harm framing: `gornji_vakuf_clashes_1993` and `visit_to_front_hrhb`.
- Diplomacy rows with sparse response text or late-war outcome pressure remain gated: `ic_pressure_vopp_engagement`, `vance_owen_plan_1993`, `rs_assembly_rejects_voplan_1993`, `owen_stoltenberg_plan_1993`, `os_rbih_tactical_acceptance_1993`, 1994 Washington/Contact Group/Carter rows, and 1995 Holbrooke/Dayton/Federation-advance rows.

## Verification
- Red-first coverage test added in `tests/sim/events/event_notification_content_backfill.test.ts`; it failed before JSON content was added with missing `notifications_to_other_factions`.
- `node node_modules\vitest\vitest.mjs run tests\sim\events\event_notification_content_backfill.test.ts`: passed after the JSON backfill (`2/2` tests).
- `node node_modules\vitest\vitest.mjs run tests\sim\events\event_notification_content_backfill.test.ts tests\sim\events\two_level_surfacing.test.ts tests\sim\events\dismiss_notifications.test.ts`: passed (`8/8` tests). This includes default `AWWV_TWO_LEVEL_NOTIFICATIONS` flag-off emission protection.
- `node node_modules\vitest\vitest.mjs run tests\event_timeline_integrity.test.ts`: passed (`17/17` tests).
- `git diff --check -- data\scenarios\events\war_1993.json tests\sim\events\event_notification_content_backfill.test.ts docs\40_reports\EVENT_NOTIFICATION_BACKFILL.md docs\40_reports\implemented\20260518_EVENT_NOTIFICATION_CONTENT_BATCH7.md`: passed.
- Lane-local `npm.cmd run typecheck` initially failed while a concurrent verdict UI lane had dirty JSX edits. Parent Batch 7 integration reruns typecheck after merging the UI lane and records the final result in `docs/PROJECT_LEDGER.md`.
