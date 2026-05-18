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

## Remaining Phase D Scope
| File | Event | Source | Coverage |
|---|---|---:|---:|
| `war_1992.json` | `drina_cleansing_decision_1992` | RS | 0/4 |
| `war_1992.json` | `concentration_camps_revealed_1992` | RS | 0/6 |
| `war_1993.json` | `gornji_vakuf_clashes_1993` | HRHB | 0/4 |
| `war_1993.json` | `ic_pressure_vopp_engagement` | RBiH | 0/4 |
| `war_1993.json` | `vance_owen_plan_1993` | RBiH | 0/4 |
| `war_1993.json` | `srebrenica_demilitarization_1993` | RBiH | 0/6 |
| `war_1993.json` | `rs_assembly_rejects_voplan_1993` | RS | 0/4 |
| `war_1993.json` | `operation_lukavac_93` | RS | 0/4 |
| `war_1993.json` | `owen_stoltenberg_plan_1993` | RBiH | 0/4 |
| `war_1993.json` | `os_rbih_tactical_acceptance_1993` | RBiH | 0/4 |
| `war_1993.json` | `strategic_posture_review_rbih` | RBiH | 0/8 |
| `war_1993.json` | `strategic_posture_review_rs` | RS | 0/8 |
| `war_1993.json` | `strategic_posture_review_hrhb` | HRHB | 0/8 |
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
