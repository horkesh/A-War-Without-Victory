# Event Modal Gated Decision Packet

**Date:** 2026-05-26  
**Owner:** Orchestrator  
**Scope:** Required-response event modal authoring after the 17/36 modal-ready milestone.  
**Status:** Decision packet; no event JSON or runtime code changed.

## Current Evidence

- `main` was pushed to `origin/main` at `6c55bd23` (`docs(events): document modal browser proof`).
- Local diagnostics still report 247 total events, 36 required-response rows, and 17 production modal-ready required-response rows.
- The catalog remains `NOT_READY` because 19 required-response rows still lack some combination of explicit historical default, historical marker, source note, numeric/mechanical preview, source support, sensitive-history approval, or late-scenario proof.
- Product and Historian specialist inventories agree: no remaining required-response row is safe for broad autonomous modal prose.

## Decision

Do not dispatch another broad event-modal authoring worker yet. The next event-system action is approval triage:

1. Decide which sensitive-history rows should remain player decisions and which should become consequence/reflection rows.
2. Decide whether counterfactual consequence rows may receive a gameplay-safe default label, or whether they need a separate label from `Historical default`.
3. Decide whether abstract recurring rows such as `visit_to_front_*` can use staff-recommended defaults instead of claimed historical defaults.
4. Keep `us_halts_federation_advance_1995` deferred until 188-week/endgame proof confirms the late-war battlefield state justifies the halt framing.

## Remaining Required-Response Debt

### Sensitive-History Approval Required

| Event | Gate |
| --- | --- |
| `rs_strategic_goals` | Genocide/Six Goals framing; needs approval before default labeling or modal prose. |
| `drina_cleansing_decision_1992` | Direct ethnic-cleansing framing; should not proceed as an optimization lever. |
| `concentration_camps_revealed_1992` | Detention-camp exposure/response framing; legal/source review required. |
| `london_conference_1992` | Sensitive language plus missing source/default/mechanical preview. |
| `srebrenica_demilitarization_1993` | Srebrenica plus counterfactual weapons/disarmament framing. |
| `visit_to_front_rs` | RS front-visit framing includes sensitive press/camp language and missing source. |
| `nato_ultimatum_sarajevo_1994` | Sarajevo/Markale ultimatum framing; missing source/default/options prose. |
| `un_hostage_crisis_1995` | Hostage/human-shield framing; source present but default/prose needs approval. |

### Source Or Design Blocked

| Event | Gate |
| --- | --- |
| `owen_stoltenberg_plan_1993` | Missing source; contested RBiH default. |
| `strategic_posture_review_rbih` | Missing source; broad posture default is design/historical judgment. |
| `strategic_posture_review_rs` | Missing source; default could encode contested war-aim interpretation. |
| `visit_to_front_rbih` | Missing source; front-visit default is more design than single-event history. |
| `visit_to_front_hrhb` | Missing source plus source/design default blocker. |
| `karadzic_mladic_split_1995` | Source present, but personality/default blocked and scheduled-only cleanup needed. |
| `us_halts_federation_advance_1995` | Source present, but explicitly deferred for 188-week/endgame proof. |

### Counterfactual Consequence Rows

| Event | Gate |
| --- | --- |
| `csq_separate_peace_overture` | Counterfactual default blocked. |
| `csq_third_party_mediation_offered` | Source present; broad mediation default needs product approval. |
| `csq_tripartite_federation_overture` | Counterfactual/default blocked. |
| `csq_partition_referendum_proposal` | Ahistorical partition-referendum framing; user approval needed. |

## Approval Questions

1. Should `rs_strategic_goals` and `drina_cleansing_decision_1992` be rewritten from player-selectable decisions into consequence/reflection rows?
2. For `concentration_camps_revealed_1992` and `un_hostage_crisis_1995`, should the player only choose responses to exposure/crisis, never authorization or optimization of the abuse itself?
3. For `srebrenica_demilitarization_1993`, is the historical default allowed to be partial/nominal compliance, or should it become a constrained receipt?
4. Should `visit_to_front_*` rows use `staff recommendation` rather than `historical default` when the row is an abstraction?
5. Should counterfactual `csq_*` rows receive a non-historical label such as `baseline staff path`, or stay blocked until each has an approved default theory?

## Next Dispatch

If the user approves a row or packet, dispatch one implementation worker with this boundary:

- update only the approved row(s);
- preserve event IDs, response IDs, option order, triggers, effects, flags, and dimension shifts unless explicitly approved;
- keep option 0 as the historical path only when Historian/Product approve that claim;
- never make atrocity, detention, hostage-taking, genocide, or civilian harm an optimization lever;
- run the event acceptance/taxonomy diagnostics, focused event tests, modal catalog test, typecheck, and browser modal smoke;
- run baseline regression if bot choice, event firing, effects, flags, dimensions, pending decisions, logs, or scenario output can move.

