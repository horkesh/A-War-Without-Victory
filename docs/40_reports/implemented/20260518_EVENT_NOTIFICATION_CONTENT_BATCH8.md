# Event Notification Content Batch 8

**Date:** 2026-05-18
**Owner:** Codex Batch 8 safe event-notification content lane

## Scope
- Continued Phase D `notifications_to_other_factions` audit/backfill for clearly safe rows only.
- Authored recipient notifications for six 1993 rows where existing event narrative, response labels/descriptions, effects, and dimension shifts already made neutral recipient copy unambiguous:
  - `gornji_vakuf_clashes_1993`
  - `ic_pressure_vopp_engagement`
  - `vance_owen_plan_1993`
  - `rs_assembly_rejects_voplan_1993`
  - `owen_stoltenberg_plan_1993`
  - `os_rbih_tactical_acceptance_1993`
- No triggers, effects, response ordering, runtime code, event order, or default feature-flag behavior changed.

## Coverage Delta
- `war_1993.json` `gornji_vakuf_clashes_1993`: `0/4 -> 4/4`
- `war_1993.json` `ic_pressure_vopp_engagement`: `0/4 -> 4/4`
- `war_1993.json` `vance_owen_plan_1993`: `0/4 -> 4/4`
- `war_1993.json` `rs_assembly_rejects_voplan_1993`: `0/4 -> 4/4`
- `war_1993.json` `owen_stoltenberg_plan_1993`: `0/4 -> 4/4`
- `war_1993.json` `os_rbih_tactical_acceptance_1993`: `0/4 -> 4/4`
- Total Batch 8 added authored recipient-copy rows: 24.

## Basis
- `gornji_vakuf_clashes_1993` was limited to existing military-clash framing, local ceasefire/escalation response descriptions, and alliance/morale effects; no civilian-harm prose was added.
- Vance-Owen and Owen-Stoltenberg rows were limited to existing diplomatic framing, acceptance/rejection labels, diplomatic credibility/patron/standing effects, and stated partition/sovereignty tradeoffs.
- Recipient notifications remain informational and mirror the selected response; they do not add new history, mechanics, or consequences.

## Gated Residual Rows
- Sensitive-history atrocity/displacement/detention rows remain gated: `drina_cleansing_decision_1992`, `concentration_camps_revealed_1992`.
- Enclave/siege-sensitive rows remain gated: `srebrenica_demilitarization_1993`, `operation_lukavac_93`, `nato_ultimatum_sarajevo_1994`.
- Front-visit rows remain gated because the existing option text intersects Sarajevo siege, Bihac pocket, Drina enclaves, Mostar blockade, central Bosnia, or detention-camp press-management context.
- Washington timing and post-Washington restraint remain gated: `washington_agreement_1994`, `ic_rbih_restraint_post_washington`.
- Late-war diplomacy/outcome rows remain gated: `contact_group_plan_1994`, `belgrade_embargo_rs_1994`, `carter_ceasefire_1994`, `us_halts_federation_advance_1995`, `holbrooke_ceasefire_demand_oct95`, `dayton_talks_begin_1995`.
- Late-war sensitive/history-command rows remain gated: `un_hostage_crisis_1995`, `karadzic_mladic_split_1995`.

## Verification
- Red-first coverage test added in `tests/sim/events/event_notification_content_backfill.test.ts`; it failed before JSON content was added with missing `notifications_to_other_factions`.
- `node node_modules\vitest\vitest.mjs run tests\sim\events\event_notification_content_backfill.test.ts`: passed after the JSON backfill (`3/3` tests).
- `node node_modules\vitest\vitest.mjs run tests\sim\events\event_notification_content_backfill.test.ts tests\sim\events\two_level_surfacing.test.ts tests\sim\events\dismiss_notifications.test.ts`: passed (`9/9` tests). This includes default `AWWV_TWO_LEVEL_NOTIFICATIONS` flag-off emission protection.
- `node node_modules\vitest\vitest.mjs run tests\event_timeline_integrity.test.ts`: passed (`17/17` tests).
- `npm.cmd run typecheck`: passed.
- `git diff --check -- data\scenarios\events\war_1993.json tests\sim\events\event_notification_content_backfill.test.ts docs\40_reports\EVENT_NOTIFICATION_BACKFILL.md docs\40_reports\implemented\20260518_EVENT_NOTIFICATION_CONTENT_BATCH8.md`: passed.
