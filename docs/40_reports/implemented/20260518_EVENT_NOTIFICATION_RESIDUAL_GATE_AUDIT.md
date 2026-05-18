# Event Notification Residual Gate Audit

**Date:** 2026-05-18
**Scope:** Batch 9 residual audit for `notifications_to_other_factions`
**Tracker:** `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`
**Plan:** `docs/plans/2026-05-18-event-notification-sensitive-content-review-plan.md`

## Summary

Batch 9 audited the remaining event-notification backfill scope and converted it into an implementation-ready review plan. No event JSON was edited and no sensitive recipient notification copy was authored.

The audit treats two sparse 1992 rows as residual even though they already have partial safe coverage:

- `rs_strategic_goals`
- `rbih_state_identity`

## Residual Categories

| Review type | Rows | Remaining recipient blocks | Events |
|---|---:|---:|---|
| Historian-required | 6 | 28 | `drina_cleansing_decision_1992`; `concentration_camps_revealed_1992`; `srebrenica_demilitarization_1993`; `operation_lukavac_93`; `nato_ultimatum_sarajevo_1994`; `un_hostage_crisis_1995` |
| Narrative tone required | 2 | 8 | `rs_strategic_goals`; `rbih_state_identity` |
| Washington timing policy | 2 | 8 | `washington_agreement_1994`; `ic_rbih_restraint_post_washington` |
| Late-war outcome policy | 7 | 28 | `contact_group_plan_1994`; `belgrade_embargo_rs_1994`; `carter_ceasefire_1994`; `karadzic_mladic_split_1995`; `us_halts_federation_advance_1995`; `holbrooke_ceasefire_demand_oct95`; `dayton_talks_begin_1995` |
| Front-visit mixed-sensitive | 3 | 30 | `visit_to_front_rbih`; `visit_to_front_rs`; `visit_to_front_hrhb` |

**Total residual:** 20 event rows and 102 recipient blocks.

## Findings

- The residual set is not safe for broad prose backfill. It includes atrocity/displacement, detention-camp disclosure, safe-area and demilitarization, Sarajevo siege/NATO ultimatum, UN hostage, Washington timing, final-diplomacy, and counterfactual outcome rows.
- The future implementation pass should proceed lane by lane instead of mixing all residual rows into one content batch.
- Several rows can remain intentionally sparse after review. The engine already skips absent notification blocks, so content should be added only where review clears a specific response/recipient pair.
- The current tests already cover safe-content examples and deterministic two-level surfacing. Future content batches should extend `tests/sim/events/event_notification_content_backfill.test.ts` for newly cleared rows.

## Verification

- Confirmed the residual ids exist in `data/scenarios/events/war_1992.json`, `war_1993.json`, `war_1994.json`, and `war_1995.json`.
- Ran an ad hoc JSON parse/count check across the 20 residual rows:
  - 2 sparse rows at `2/6` recipient-block coverage each.
  - 18 zero-coverage rows matching the tracker residual table.
  - 102 missing recipient blocks total.
- `git diff --check` should be run after this docs-only audit.

## Ledger Handling

This was a documentation-only audit. Shared integration docs were intentionally not edited because the Batch 9 instructions reserve `docs/PROJECT_LEDGER.md`, `docs/plans/MASTER_ROADMAP.md`, and `docs/40_reports/audits/20260518_MASTER_BACKLOG_EXECUTION_QUEUE.md` for parent integration.
