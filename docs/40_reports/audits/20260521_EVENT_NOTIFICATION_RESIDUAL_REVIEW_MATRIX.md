# Event Notification Residual Review Matrix

Date: 2026-05-21

Scope: docs-only classification for residual `notifications_to_other_factions` blocks. No event JSON, notification copy, tests, simulation behavior, canon text, or generated artifacts changed.

Source tracker: `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`

## Count Reconciliation

| Source | Rows | Missing recipient blocks |
|---|---:|---:|
| Tracker residual floor | 20 | 102 |
| Event JSON reconciliation | 20 | 102 |
| This matrix | 20 | 102 |

Reconciliation method: for each residual event row, count every missing non-source recipient block for every response id. Source factions are taken from the tracker because the event JSON rows do not consistently carry a source-faction field.

## Bucket Summary

| Bucket | Blocks | Rows touched |
|---|---:|---:|
| safe | 12 | 6 |
| historian-required | 34 | 9 |
| narrative-tone | 16 | 6 |
| Washington-timing | 8 | 2 |
| late-war-outcome | 28 | 7 |
| blocked-sensitive | 4 | 2 |
| Total | 102 | 20 |

## Residual Matrix

| File | Event id | Source | Missing response/recipient blocks | Bucket assignment | Reason |
|---|---|---|---:|---|---|
| `war_1992.json` | `rs_strategic_goals` | RS | 4 | `selective` -> RBiH/HRHB: narrative-tone; `aggressive` -> RBiH/HRHB: narrative-tone | Charged opening-political framing; existing row supports neutral diplomatic/military readout but copy must not add omniscient intent or moralizing. |
| `war_1992.json` | `rbih_state_identity` | RBiH | 4 | `bosniak_national` -> RS/HRHB: narrative-tone; `pragmatic` -> RS/HRHB: narrative-tone | State-identity choices are politically charged and require careful inter-faction framing, but not historian sourcing beyond existing row. |
| `war_1992.json` | `drina_cleansing_decision_1992` | RS | 4 | `systematic` -> RBiH/HRHB: historian-required; `restrained` -> RBiH/HRHB: historian-required | Atrocity/displacement decision row; recipient text must be historically grounded and cannot invent civilian-harm claims. |
| `war_1992.json` | `concentration_camps_revealed_1992` | RS | 6 | `deny`/`obstruct`/`cooperate` -> RBiH/HRHB: historian-required | Detention-camp disclosure row; requires historian review for factual support and careful wording. |
| `war_1993.json` | `srebrenica_demilitarization_1993` | RBiH | 6 | `comply_fully`/`hide_weapons`/`refuse` -> RS/HRHB: historian-required | Safe-area, demilitarization, and humanitarian-convoy context; no recipient copy without source-backed review. |
| `war_1993.json` | `operation_lukavac_93` | RS | 4 | `comply`/`defy_nato` -> RBiH/HRHB: historian-required | Sarajevo siege/isolation and NATO-strike escalation row; needs historian/context review. |
| `war_1993.json` | `visit_to_front_rbih` | RBiH | 10 | `visit_sarajevo` -> RS/HRHB: historian-required; `visit_eastern_front` -> RS/HRHB: safe; `visit_bihac` -> RS/HRHB: narrative-tone; `stay_capital_rbih` -> RS/HRHB: safe; `visit_press_rbih` -> RS/HRHB: narrative-tone | Mixed front-visit row: ordinary command/stay options are safe; Sarajevo and Bihac/press options need sensitive or tone review. |
| `war_1993.json` | `visit_to_front_rs` | RS | 10 | `visit_posavina` -> RBiH/HRHB: safe; `visit_sarajevo_lines` -> RBiH/HRHB: historian-required; `visit_drina_front` -> RBiH/HRHB: historian-required; `stay_pale_rs` -> RBiH/HRHB: safe; `visit_press_rs` -> RBiH/HRHB: blocked-sensitive | Posavina/stay options can be neutral; Sarajevo/Drina options need historian review; press visit risks unsupported disclosure/propaganda framing from current row. |
| `war_1993.json` | `visit_to_front_hrhb` | HRHB | 10 | `visit_mostar_front` -> RBiH/RS: narrative-tone; `visit_central_bosnia` -> RBiH/RS: narrative-tone; `visit_posavina_hrhb` -> RBiH/RS: safe; `stay_mostar_hrhb` -> RBiH/RS: safe; `visit_press_hrhb` -> RBiH/RS: blocked-sensitive | Posavina/stay options can be neutral; Mostar/central Bosnia need tone review; press visit risks unsupported detention/blockade implications. |
| `war_1994.json` | `nato_ultimatum_sarajevo_1994` | RS | 4 | `comply_withdraw_hwez`/`defy_ultimatum_hwez` -> RBiH/HRHB: historian-required | Markale/Sarajevo heavy-weapons ultimatum; needs sourced siege/civilian-harm framing. |
| `war_1994.json` | `washington_agreement_1994` | RBiH | 4 | `accept`/`reluctant` -> RS/HRHB: Washington-timing | Must not conflate formal authored Washington event with live `washington_signed` predicate. |
| `war_1994.json` | `ic_rbih_restraint_post_washington` | RBiH | 4 | `acknowledge_pressure`/`resist_patron` -> RS/HRHB: Washington-timing | Post-Washington restraint row requires timing-policy wording to avoid implying the formal agreement fired early. |
| `war_1994.json` | `contact_group_plan_1994` | RBiH | 4 | `accept`/`reject` -> RS/HRHB: late-war-outcome | Territorial split and peace-plan implications must remain compatible with alternate sim state. |
| `war_1994.json` | `belgrade_embargo_rs_1994` | RS | 4 | `defiant`/`negotiate` -> RBiH/HRHB: late-war-outcome | Patron rupture and late-war diplomacy can alter downstream outcome claims; needs outcome-policy review. |
| `war_1994.json` | `carter_ceasefire_1994` | RBiH | 4 | `respect`/`exploit` -> RS/HRHB: late-war-outcome | Ceasefire exploitation can imply counterfactual military trajectory; needs outcome-policy review. |
| `war_1995.json` | `un_hostage_crisis_1995` | RS | 4 | `maintain_hostages`/`release_gradually` -> RBiH/HRHB: historian-required | UN hostage/human-shield row; requires historian review and careful non-sensational wording. |
| `war_1995.json` | `karadzic_mladic_split_1995` | RS | 4 | `remove_mladic`/`back_down` -> RBiH/HRHB: late-war-outcome | Command crisis tied to Operation Storm and late-war trajectory; needs outcome-policy review. |
| `war_1995.json` | `us_halts_federation_advance_1995` | RBiH | 4 | `comply`/`push_further` -> RS/HRHB: late-war-outcome | Banja Luka / refugee / final-territory implications require outcome-policy review. |
| `war_1995.json` | `holbrooke_ceasefire_demand_oct95` | RBiH | 4 | `accept_ceasefire`/`continue_offensive` -> RS/HRHB: late-war-outcome | Dayton setup and final offensive momentum claims require outcome-policy review. |
| `war_1995.json` | `dayton_talks_begin_1995` | RBiH | 4 | `accept`/`hardline` -> RS/HRHB: late-war-outcome | Final-settlement framing must not assert outcome facts beyond current sim prerequisites. |

## First Future Safe Slice

The first content implementation slice should be safe-only and capped at these five event rows:

| Event id | Safe blocks |
|---|---:|
| `visit_to_front_rbih` | `visit_eastern_front` -> RS/HRHB; `stay_capital_rbih` -> RS/HRHB |
| `visit_to_front_rs` | `visit_posavina` -> RBiH/HRHB; `stay_pale_rs` -> RBiH/HRHB |
| `visit_to_front_hrhb` | `visit_posavina_hrhb` -> RBiH/RS; `stay_mostar_hrhb` -> RBiH/RS |

This is three rows and twelve recipient blocks, below the five-row cap. Do not include narrative-tone or blocked-sensitive front-visit blocks in the first pass.

Future verification for the safe content slice:

```powershell
npx.cmd vitest run tests/sim/events/event_notification_content_backfill.test.ts tests/sim/events/two_level_surfacing.test.ts tests/ui/inboxItems.notifications.test.ts tests/event_timeline_integrity.test.ts --reporter=dot
```
