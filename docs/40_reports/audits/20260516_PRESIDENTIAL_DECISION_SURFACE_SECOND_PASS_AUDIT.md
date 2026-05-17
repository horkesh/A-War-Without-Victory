# Presidential Decision Surface Second-Pass Audit

**Date:** 2026-05-16  
**Trigger:** User challenge that paramilitary requests were only one example: every player decision class must be surfaced, resolvable, and correctly gated.  
**Scope:** Engine/state decision producers -> UI adapter -> Presidential Inbox / Decision Room -> action surface -> resolver -> advance gating.
**Status:** CLOSED 2026-05-16 by `docs/40_reports/implemented/20260516_PRESIDENTIAL_DECISION_SURFACE_CORRECTNESS.md`. This file remains the source audit; the residuals below are preserved as findings and marked closed in the coverage matrix.

## Executive Finding

The first Inbox audit was too narrow. It correctly found hidden `pending_paramilitary_requests`, `pending_convoy_decisions`, and `pendingDayton` Inbox gaps, but it treated "has an Inbox card" as enough. A decision surface is only complete when the right player sees it, the card routes to a real action surface, the action writes the canonical queue, and the turn-advance policy is explicit.

Second-pass findings:

1. **Convoy decisions are surfaced but can fail to resolve.** The canonical engine path is `state.military.pending_convoy_decisions`, used by `evaluateHumanitarianConvoys(...)`, `applyHumanitarianConvoyDecisions(...)`, and `GameStateAdapter`. The desktop IPC handler `stage-convoy-decision` reads/writes root `state.pending_convoy_decisions`, so the UI can show a convoy decision while the action path misses or mutates the wrong field.
2. **Event decisions are not scoped tightly enough to `responding_faction`.** `evaluateEvents(...)` queues player decisions whenever a player faction exists and autonomy is low or the event is required, then stamps `faction: playerFaction`. The explicit `responding_faction` fallback logic exists only in the bot auto-response branch. Required diplomatic events can therefore be offered to the wrong side, especially because 26 of 36 required response events lack `responding_faction`.
3. **There is no unified decision manifest or gate policy.** Decision queues live across root `GameState`, `state.military`, `state.military.negotiation`, and `state.meta`. Inbox coverage, Decision Room counters, and advance-turn blockers are hand-maintained mirrors. Current hard blocking only covers required event decisions in desktop advance, and event/paramilitary in UI pre-advance projections. Other surfaced families have implicit, modal-specific, or advisory behavior with no central declaration.

## Why This Was Missed

The miss was architectural, not only a paramilitary oversight.

- Player decisions are scattered across several state owners instead of registered in one player-decision manifest.
- The Inbox is a hand-built projection in `src/ui/map/data/inboxItems.ts`; there is no executable producer-to-consumer invariant.
- New systems used local names like `pending`, `review`, `proposal`, `request`, and `opportunity` without a shared contract that says whether the item is player-facing, blocking, advisory, modal-owned, or bot-only.
- Tests were written per family after each feature, not as an exhaustive audit over every decision producer and resolver.
- The first audit stopped at "Inbox consumer exists" and did not verify resolver path, faction ownership, or advance policy for each family.

## Closure Coverage Matrix

| Family | Canonical queue/source | Current surface | Resolver/action | Gate policy | Residual risk |
|---|---|---|---|---|---|
| Event decisions | `state.military.pending_event_decisions` | Inbox `event_decision`; Army HQ briefing / Decision Room | `resolve-decision` IPC / event response resolver | Manifest-backed hard block for required player decisions | CLOSED: evaluator respects `responding_faction`; required-response catalog has explicit valid owners and tests. |
| Peace plan | `state.military.negotiation.pending_peace_plan` | Inbox `peace_plan`; `PeacePlanModal`; manifest fallback card | Peace-plan response path | Manifest-backed modal-required block | CLOSED: registered in player-decision manifest and projected into UI/desktop gates. |
| Dayton negotiation | `state.military.negotiation.pending_dayton` | Inbox `dayton_negotiation`; Dayton modal; manifest fallback card | Dayton response path | Manifest-backed modal-required block | CLOSED: registered in player-decision manifest and projected into UI/desktop gates. |
| Paramilitary requests | root `state.pending_paramilitary_requests` | Inbox `paramilitary_request`; `ParamilitaryReviewModal`; Decision Room | `resolve-paramilitary-requests` IPC | Manifest-backed hard block | CLOSED: UI and desktop gates consume the same manifest summary; queued requests block until resolved. |
| Convoy decisions | `state.military.pending_convoy_decisions` | Inbox `convoy_decision`; `ConvoyDecisionModal`; War Summary / Situation convoys as secondary summaries; manifest fallback card | `stage-convoy-decision` IPC | Manifest-backed modal-required block | CLOSED: desktop IPC writes the canonical military queue via `convoy_ipc_contract.cjs`; completion plan added direct lifecycle tests and a dedicated modal owner surface. |
| Reserve requests | `state.military.pending_reserve_requests` | Inbox `reserve_request`; Army Reserve queue | Reserve approve/decline IPC | Manifest advisory | CLOSED: registered as advisory in manifest. |
| Officer/personnel events | `state.military.pending_officer_events` | Inbox `officer_event`; Army HQ personnel/attention | acknowledge/accept/resolve officer handlers | Manifest advisory | CLOSED: registered as advisory in manifest with player-faction scoping. |
| Autonomy proposal reviews | `state.meta.pending_proposal_reviews` | Inbox `autonomy_proposal`; Autonomy panel | accept/reject proposal | Manifest advisory | CLOSED: registered as advisory in manifest. |
| Operation opportunities | `state.military.operation_opportunities` plus `OPPORTUNITY:*` proposal reviews | Inbox `operation_opportunity`; Army HQ dossier | operation opportunity decision resolver | Manifest advisory | CLOSED: registered as advisory in manifest. |
| Autonomy level pending | `state.meta.autonomy_level_pending` | No Inbox card | Turn-transition setting | Not a player decision queue | Correctly excluded: this is a staged setting, not a decision request. |
| Player-staged orders | UI/order queues | Command surfaces | Existing order staging IPC | Player-created state, not generated pending decision | Correctly excluded from generated decision audit. |

## Event Catalog Finding

PowerShell JSON audit over `data/scenarios/events/*.json` found:

- 44 events with `response_options`.
- 36 events with `requires_player_response: true`.
- 26 of those 36 required events have no explicit `responding_faction`.

Required events missing explicit owner:

| File | Event IDs |
|---|---|
| `war_1992.json` | `concentration_camps_revealed_1992`, `drina_cleansing_decision_1992`, `hrhb_political_goal`, `london_conference_1992`, `rbih_state_identity`, `rs_strategic_goals` |
| `war_1993.json` | `gornji_vakuf_clashes_1993`, `operation_lukavac_93`, `owen_stoltenberg_plan_1993`, `rs_assembly_rejects_voplan_1993`, `srebrenica_demilitarization_1993`, `strategic_posture_review_hrhb`, `strategic_posture_review_rbih`, `strategic_posture_review_rs`, `vance_owen_plan_1993`, `visit_to_front_hrhb`, `visit_to_front_rbih`, `visit_to_front_rs` |
| `war_1994.json` | `belgrade_embargo_rs_1994`, `carter_ceasefire_1994`, `contact_group_plan_1994`, `washington_agreement_1994` |
| `war_1995.json` | `dayton_talks_begin_1995`, `karadzic_mladic_split_1995`, `un_hostage_crisis_1995`, `us_halts_federation_advance_1995` |

This did not prove each item was player-hidden. It proved the owner field was not reliable enough for a high-stakes decision surface, and the evaluator ignored it when queuing player-facing event decisions. Closure added `responding_faction` to every required-response event in the 1992-1995 catalogs and a catalog test requiring valid ownership.

## Required Remediation

Actionable implementation plan: `docs/plans/2026-05-16-presidential-decision-surface-correctness-plan.md`.

**P0 - correctness:**

1. CLOSED: `stage-convoy-decision` reads/writes `state.military.pending_convoy_decisions`; the regression fails if the root queue is used.
2. CLOSED: `src/state/player_decision_manifest.ts` registers the current generated player decision families with gate policy and deterministic summaries.
3. CLOSED: `evaluateEvents(...)` respects `def.responding_faction`; every `requires_player_response` event has a valid explicit owner.

**P1 - UX truthfulness:**

4. CLOSED: desktop advance hard-blocking, UI pre-advance counts, and Decision Room readiness consume the manifest summary.
5. CLOSED: visible pending-decision metrics prefer `playerDecisionSummary.totalCount`; old review queues remain compatibility inputs, not the complete truth source.
6. CARRIED FORWARD AS RULE: any new `pending_*`, `*_review`, `*_request`, or decision resolver must register producer -> adapter -> Inbox/Decision Room -> action route -> resolver -> gate classification in the manifest.

## Status

Closed on 2026-05-16. The first audit remains superseded because Inbox visibility alone was not enough; the closeout now covers convoy resolution, event ownership, manifest-backed gate policy, UI counters/readiness, desktop hard-blocking, and regression tests. See `docs/40_reports/implemented/20260516_PRESIDENTIAL_DECISION_SURFACE_CORRECTNESS.md`.

## Convoy Completion Addendum

Follow-up plan `docs/plans/2026-05-16-convoy-system-completion-plan.md` closed the engineering-tractable convoy gaps:

- Task 1 direct lifecycle coverage: `tests/humanitarian_convoy_lifecycle.test.ts`.
- Task 2 dedicated modal: `src/ui/map/components/ConvoyDecisionModal.tsx`, Inbox action `convoy_decision_modal`, and manifest owner surface `convoy_decision_modal`.

Open convoy policy gaps remain intentionally blocked on canon/design rulings: convoy aging/expiry and route-controller versus target-owner semantics.
