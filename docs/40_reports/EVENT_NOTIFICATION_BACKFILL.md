# Event Notification Backfill

**Date:** 2026-05-18
**Scope:** Phase D tracker for `notifications_to_other_factions` on `requires_player_response` events.
**Diagnostic:** `node tools/diagnostics/event_notification_residuals.cjs` computes the current missing recipient-block floor from event JSON.

## Policy
- Backfill only when the existing event title, narrative, response label, response description, effects, and historical source already support the recipient text.
- Do not invent fallback prose. Missing recipient/response blocks stay absent and are skipped by the engine.
- Sensitive-history and mixed-sensitive front-visit events remain content-review scope before authoring. Washington timing rows are closed under the two-clock policy; late-war outcome rows are closed where copy stays posture/process-focused and avoids unsupported final-outcome assertions.

## Implemented Coverage
| File | Event | Source | Coverage | Status |
|---|---|---:|---:|---|
| `war_1992.json` | `rs_strategic_goals` | RS | 6/6 | Narrative-tone slice complete for `selective` and `aggressive`; prior `all_six` coverage preserved. |
| `war_1992.json` | `rbih_state_identity` | RBiH | 6/6 | Narrative-tone slice complete for `bosniak_national` and `pragmatic`; prior `civic` coverage preserved. |
| `war_1992.json` | `hrhb_political_goal` | HRHB | 6/6 | Batch 4 safe backfill complete from existing authored event fields. |
| `war_1992.json` | `london_conference_1992` | RBiH | 4/4 | Batch 5 safe backfill complete from existing conference narrative, response descriptions, and effects. |
| `war_1993.json` | `strategic_posture_review_rbih` | RBiH | 8/8 | Batch 7 safe backfill complete from recurring posture narrative, response descriptions, effects, dimension shifts, and flags. |
| `war_1993.json` | `strategic_posture_review_rs` | RS | 8/8 | Batch 7 safe backfill complete from recurring posture narrative, response descriptions, effects, dimension shifts, and flags. |
| `war_1993.json` | `strategic_posture_review_hrhb` | HRHB | 8/8 | Batch 7 safe backfill complete from recurring posture narrative, response descriptions, effects, dimension shifts, and flags. |
| `war_1993.json` | `gornji_vakuf_clashes_1993` | HRHB | 4/4 | Batch 8 safe backfill complete from existing military clash narrative, response descriptions, and alliance/morale effects. |
| `war_1993.json` | `ic_pressure_vopp_engagement` | RBiH | 4/4 | Batch 8 safe backfill complete from existing Vance-Owen pressure narrative, response labels, and dimension shifts. |
| `war_1993.json` | `vance_owen_plan_1993` | RBiH | 4/4 | Batch 8 safe backfill complete from existing plan narrative, response descriptions, and diplomatic effects. |
| `war_1993.json` | `rs_assembly_rejects_voplan_1993` | RS | 4/4 | Batch 8 safe backfill complete from existing assembly rejection narrative, response descriptions, and dimension shifts. |
| `war_1993.json` | `owen_stoltenberg_plan_1993` | RBiH | 4/4 | Batch 8 safe backfill complete from existing tripartite union narrative, response descriptions, and diplomatic effects. |
| `war_1993.json` | `os_rbih_tactical_acceptance_1993` | RBiH | 4/4 | Batch 8 safe backfill complete from existing tactical-acceptance narrative, response labels, and dimension shifts. |
| `war_1993.json` | `visit_to_front_rbih` | RBiH | 10/10 | Front-visit recipient coverage complete; Sarajevo command-signaling option cleared without adding new siege facts. |
| `war_1993.json` | `visit_to_front_rs` | RS | 8/10 | Safe front-visit slice complete for `visit_posavina` and `stay_pale_rs`; Sarajevo-line and Drina command-signaling options cleared; press option remains blocked-sensitive. |
| `war_1993.json` | `visit_to_front_hrhb` | HRHB | 8/10 | Safe front-visit slice complete for `visit_posavina_hrhb` and `stay_mostar_hrhb`; narrative-tone slice complete for `visit_mostar_front` and `visit_central_bosnia`; press option remains blocked-sensitive. |
| `war_1993.json` | `operation_lukavac_93` | RS | 4/4 | Historian-cleared Igman/Lukavac slice complete from the authored row and BB2 Operation Lukavac 93 account. |
| `war_1994.json` | `nato_ultimatum_sarajevo_1994` | RS | 4/4 | Historian-cleared NATO/Sarajevo slice complete from the authored Markale ultimatum row and BB1/BB2 Sarajevo exclusion-zone chronology. |
| `war_1995.json` | `un_hostage_crisis_1995` | RS | 4/4 | Historian-cleared UN hostage-crisis slice complete from the authored hostage row and BB1 hostage-release chronology. |
| `war_1994.json` | `washington_agreement_1994` | RBiH | 4/4 | Washington-timing slice complete; copy refers to the formal week-102 authored Washington Agreement event only. |
| `war_1994.json` | `ic_rbih_restraint_post_washington` | RBiH | 4/4 | Washington-timing slice complete; copy refers to the post-Washington military window without implying an early formal-signature event. |
| `war_1994.json` | `contact_group_plan_1994` | RBiH | 4/4 | 1994 late-war diplomacy slice complete; copy describes the proposal and pressure without asserting final settlement outcomes. |
| `war_1994.json` | `belgrade_embargo_rs_1994` | RS | 4/4 | 1994 late-war diplomacy slice complete; copy describes the Belgrade-Pale split, embargo pressure, and response posture. |
| `war_1994.json` | `carter_ceasefire_1994` | RBiH | 4/4 | 1994 late-war diplomacy slice complete; copy describes ceasefire compliance or preparation posture without asserting later battlefield outcomes. |
| `war_1995.json` | `karadzic_mladic_split_1995` | RS | 4/4 | 1995 late-war outcome slice complete; copy describes the Pale-Mladic command crisis without asserting downstream campaign outcomes. |
| `war_1995.json` | `us_halts_federation_advance_1995` | RBiH | 4/4 | 1995 late-war outcome slice complete; copy describes the Washington halt choice, refugee-warning context, and diplomatic risk without asserting a final settlement. |
| `war_1995.json` | `holbrooke_ceasefire_demand_oct95` | RBiH | 4/4 | 1995 late-war outcome slice complete; copy describes ceasefire posture and US-support risk without asserting Dayton success. |
| `war_1995.json` | `dayton_talks_begin_1995` | RBiH | 4/4 | 1995 late-war outcome slice complete; copy describes opening negotiation posture without asserting final terms. |

## Remaining Phase D Scope
| File | Event | Source | Coverage |
|---|---|---:|---:|
| `war_1992.json` | `drina_cleansing_decision_1992` | RS | 0/4 |
| `war_1992.json` | `concentration_camps_revealed_1992` | RS | 0/6 |
| `war_1993.json` | `srebrenica_demilitarization_1993` | RBiH | 0/6 |
| `war_1993.json` | `visit_to_front_rs` | RS | 8/10 |
| `war_1993.json` | `visit_to_front_hrhb` | HRHB | 8/10 |

## Batch 9 Residual Gate Audit

**Plan:** [`docs/plans/2026-05-18-event-notification-sensitive-content-review-plan.md`](../plans/2026-05-18-event-notification-sensitive-content-review-plan.md)
**Report:** [`docs/40_reports/implemented/20260518_EVENT_NOTIFICATION_RESIDUAL_GATE_AUDIT.md`](implemented/20260518_EVENT_NOTIFICATION_RESIDUAL_GATE_AUDIT.md)

Batch 9 did not author any new `notifications_to_other_factions` copy. The residual surface is now classified for a future content pass.

| Review type | Rows | Remaining recipient blocks | Events |
|---|---:|---:|---|
| Historian-required | 3 | 16 | `drina_cleansing_decision_1992`; `concentration_camps_revealed_1992`; `srebrenica_demilitarization_1993` |
| Late-war outcome policy | 0 | 0 | Closed 2026-05-22 by the 1994 diplomacy and 1995 endgame/outcome slices. |
| Front-visit mixed-sensitive | 2 | 4 | `visit_to_front_rs`; `visit_to_front_hrhb` |

**Total residual:** 5 event rows and 20 recipient blocks after the 2026-05-22 front-visit command-signaling slice. The prior Igman/Lukavac floor was 6 rows / 26 blocks.

## Batch 8 Gated Residual Notes
| File | Event | Gate |
|---|---|---|
| `war_1992.json` | `drina_cleansing_decision_1992` | Atrocity/displacement decision text; requires historian/content review before recipient prose. |
| `war_1992.json` | `concentration_camps_revealed_1992` | Detention-camp and atrocity disclosure text; requires historian/content review before recipient prose. |
| `war_1993.json` | `srebrenica_demilitarization_1993` | Enclave/demilitarization/humanitarian-convoy sensitivities; not authored in safe-content batch. |
| `war_1993.json` | `operation_lukavac_93` | Historian-cleared Igman/Lukavac reconciliation implemented 2026-05-22; row is no longer residual. |
| `war_1993.json` | `visit_to_front_rbih` | Sarajevo front command-signaling reconciliation implemented 2026-05-22; row is no longer residual. |
| `war_1993.json` | `visit_to_front_rs` | Sarajevo-line and Drina command-signaling options implemented 2026-05-22; press option remains blocked-sensitive. |
| `war_1993.json` | `visit_to_front_hrhb` | Mostar and central-Bosnia narrative-tone options implemented 2026-05-22; press option remains blocked-sensitive. |
| `war_1994.json` | `nato_ultimatum_sarajevo_1994` | Historian-cleared NATO/Sarajevo reconciliation implemented 2026-05-22; row is no longer residual. |
| `war_1994.json` | `washington_agreement_1994` | Washington timing reconciliation implemented 2026-05-22; row is no longer residual. |
| `war_1994.json` | `ic_rbih_restraint_post_washington` | Post-Washington timing reconciliation implemented 2026-05-22; row is no longer residual. |
| `war_1994.json` | `contact_group_plan_1994` | 1994 late-war diplomacy reconciliation implemented 2026-05-22; row is no longer residual. |
| `war_1994.json` | `belgrade_embargo_rs_1994` | 1994 late-war diplomacy reconciliation implemented 2026-05-22; row is no longer residual. |
| `war_1994.json` | `carter_ceasefire_1994` | 1994 late-war diplomacy reconciliation implemented 2026-05-22; row is no longer residual. |
| `war_1995.json` | `un_hostage_crisis_1995` | Historian-cleared UN hostage-crisis reconciliation implemented 2026-05-22; row is no longer residual. |
| `war_1995.json` | `karadzic_mladic_split_1995` | 1995 late-war outcome reconciliation implemented 2026-05-22; row is no longer residual. |
| `war_1995.json` | `us_halts_federation_advance_1995` | 1995 late-war outcome reconciliation implemented 2026-05-22; row is no longer residual. |
| `war_1995.json` | `holbrooke_ceasefire_demand_oct95` | 1995 late-war outcome reconciliation implemented 2026-05-22; row is no longer residual. |
| `war_1995.json` | `dayton_talks_begin_1995` | 1995 late-war outcome reconciliation implemented 2026-05-22; row is no longer residual. |
