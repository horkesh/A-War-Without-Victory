# Event Notification Backfill

**Date:** 2026-05-18
**Scope:** Phase D tracker for `notifications_to_other_factions` on `requires_player_response` events.

## Policy
- Backfill only when the existing event title, narrative, response label, response description, effects, and historical source already support the recipient text.
- Do not invent fallback prose. Missing recipient/response blocks stay absent and are skipped by the engine.
- Sensitive-history, Washington timing, and late-war diplomacy events remain content-review scope before authoring.

## Implemented Coverage
| File | Event | Source | Coverage | Status |
|---|---|---:|---:|---|
| `war_1992.json` | `rs_strategic_goals` | RS | 2/6 | Existing sparse coverage for `all_six`; remaining options need historian/narrative review. |
| `war_1992.json` | `rbih_state_identity` | RBiH | 2/6 | Existing sparse coverage for `civic`; remaining options need historian/narrative review. |
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

## Remaining Phase D Scope
| File | Event | Source | Coverage |
|---|---|---:|---:|
| `war_1992.json` | `drina_cleansing_decision_1992` | RS | 0/4 |
| `war_1992.json` | `concentration_camps_revealed_1992` | RS | 0/6 |
| `war_1993.json` | `srebrenica_demilitarization_1993` | RBiH | 0/6 |
| `war_1993.json` | `operation_lukavac_93` | RS | 0/4 |
| `war_1993.json` | `visit_to_front_rbih` | RBiH | 0/10 |
| `war_1993.json` | `visit_to_front_rs` | RS | 0/10 |
| `war_1993.json` | `visit_to_front_hrhb` | HRHB | 0/10 |
| `war_1994.json` | `nato_ultimatum_sarajevo_1994` | RS | 0/4 |
| `war_1994.json` | `washington_agreement_1994` | RBiH | 0/4 |
| `war_1994.json` | `ic_rbih_restraint_post_washington` | RBiH | 0/4 |
| `war_1994.json` | `contact_group_plan_1994` | RBiH | 0/4 |
| `war_1994.json` | `belgrade_embargo_rs_1994` | RS | 0/4 |
| `war_1994.json` | `carter_ceasefire_1994` | RBiH | 0/4 |
| `war_1995.json` | `un_hostage_crisis_1995` | RS | 0/4 |
| `war_1995.json` | `karadzic_mladic_split_1995` | RS | 0/4 |
| `war_1995.json` | `us_halts_federation_advance_1995` | RBiH | 0/4 |
| `war_1995.json` | `holbrooke_ceasefire_demand_oct95` | RBiH | 0/4 |
| `war_1995.json` | `dayton_talks_begin_1995` | RBiH | 0/4 |

## Batch 9 Residual Gate Audit

**Plan:** [`docs/plans/2026-05-18-event-notification-sensitive-content-review-plan.md`](../plans/2026-05-18-event-notification-sensitive-content-review-plan.md)
**Report:** [`docs/40_reports/implemented/20260518_EVENT_NOTIFICATION_RESIDUAL_GATE_AUDIT.md`](implemented/20260518_EVENT_NOTIFICATION_RESIDUAL_GATE_AUDIT.md)

Batch 9 did not author any new `notifications_to_other_factions` copy. The residual surface is now classified for a future content pass.

| Review type | Rows | Remaining recipient blocks | Events |
|---|---:|---:|---|
| Historian-required | 6 | 28 | `drina_cleansing_decision_1992`; `concentration_camps_revealed_1992`; `srebrenica_demilitarization_1993`; `operation_lukavac_93`; `nato_ultimatum_sarajevo_1994`; `un_hostage_crisis_1995` |
| Narrative tone required | 2 | 8 | `rs_strategic_goals`; `rbih_state_identity` |
| Washington timing policy | 2 | 8 | `washington_agreement_1994`; `ic_rbih_restraint_post_washington` |
| Late-war outcome policy | 7 | 28 | `contact_group_plan_1994`; `belgrade_embargo_rs_1994`; `carter_ceasefire_1994`; `karadzic_mladic_split_1995`; `us_halts_federation_advance_1995`; `holbrooke_ceasefire_demand_oct95`; `dayton_talks_begin_1995` |
| Front-visit mixed-sensitive | 3 | 30 | `visit_to_front_rbih`; `visit_to_front_rs`; `visit_to_front_hrhb` |

**Total residual:** 20 event rows and 102 recipient blocks. This total includes two sparse 1992 rows already listed under implemented coverage because they still have uncovered response/recipient combinations.

## Batch 8 Gated Residual Notes
| File | Event | Gate |
|---|---|---|
| `war_1992.json` | `drina_cleansing_decision_1992` | Atrocity/displacement decision text; requires historian/content review before recipient prose. |
| `war_1992.json` | `concentration_camps_revealed_1992` | Detention-camp and atrocity disclosure text; requires historian/content review before recipient prose. |
| `war_1993.json` | `srebrenica_demilitarization_1993` | Enclave/demilitarization/humanitarian-convoy sensitivities; not authored in safe-content batch. |
| `war_1993.json` | `operation_lukavac_93` | Sarajevo siege/isolation and NATO-strike escalation sensitivities; not authored in safe-content batch. |
| `war_1993.json` | `visit_to_front_rbih` | Front-visit text intersects Sarajevo siege and Bihac pocket context; recipient prose needs content review. |
| `war_1993.json` | `visit_to_front_rs` | Front-visit text intersects Sarajevo siege lines, Drina enclaves, and international observation; recipient prose needs content review. |
| `war_1993.json` | `visit_to_front_hrhb` | Front-visit text intersects Mostar blockade, central Bosnia, and detention-camp press management; recipient prose needs content review. |
| `war_1994.json` | `nato_ultimatum_sarajevo_1994` | Markale/Sarajevo heavy-weapons ultimatum; siege/civilian-harm sensitivity. |
| `war_1994.json` | `washington_agreement_1994` | Washington timing reconciliation remains gated by policy. |
| `war_1994.json` | `ic_rbih_restraint_post_washington` | Post-Washington timing and restraint policy remains gated by policy. |
| `war_1994.json` | `contact_group_plan_1994` | Late-war diplomacy trajectory; defer to diplomacy/outcome content review. |
| `war_1994.json` | `belgrade_embargo_rs_1994` | Late-war diplomacy/patron rupture; defer to diplomacy/outcome content review. |
| `war_1994.json` | `carter_ceasefire_1994` | Late-war ceasefire diplomacy; defer to diplomacy/outcome content review. |
| `war_1995.json` | `un_hostage_crisis_1995` | UN hostage/human-shield crisis; sensitive-history row. |
| `war_1995.json` | `karadzic_mladic_split_1995` | Late-war command crisis tied to Operation Storm timing; defer to late-war outcome review. |
| `war_1995.json` | `us_halts_federation_advance_1995` | Late-war outcome/refugee catastrophe counterfactual; gated by policy. |
| `war_1995.json` | `holbrooke_ceasefire_demand_oct95` | Late-war diplomacy/outcome row; gated by policy. |
| `war_1995.json` | `dayton_talks_begin_1995` | Late-war final settlement/outcome row; gated by policy. |
