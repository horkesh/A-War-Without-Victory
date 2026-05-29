# Event Foundational Decisions Packet

**Date:** 2026-05-27
**Owner:** Orchestrator
**Scope:** Event-system labels, defaults, source gates, sensitive-history limits, causal branch authoring, and first implementation sequence.
**Status:** Proposal / gated decision packet. No event JSON, runtime code, GUI code, save schema, scenario setup, or generated artifact changed.

## Current Evidence

- Current event catalog diagnostics remain: 247 events, 44 choice events, 36 required-response rows, 17 production modal-ready rows, 180 warnings, 0 errors.
- The catalog remains `NOT_READY`; broad authoring is blocked by source, sensitive-history, historical/default, counterfactual-default, and late-scenario proof gates.
- Response-option `future_consequences` metadata is now typed, loader-validated, and surfaced in taxonomy diagnostics, but it is behavior-neutral. It does not yet open, close, delay, or suppress events at runtime.
- Historian, Game Designer, and Technical Architect/QA specialists agree that the event system should become the historical/counterfactual presidential layer only through gated packets, not broad prose filling.

## Decision Summary

Approve this as the event-authoring rule packet:

1. Player-facing decision sets must have exactly one approved default-label type before they can be modal-ready.
2. Historical bots remain the calibration baseline; option 0 must be the historical/default path only when that label is historically defensible.
3. Sensitive-history events may ask the player how to respond to exposure, crisis, command discipline, humanitarian access, or diplomatic fallout. They may not ask the player to authorize abuse.
4. Branch metadata may describe future consequences now, but runtime branch behavior needs a later technical packet before it can move scenario output.
5. The next implementation slice should be player-visible but behavior-neutral: add `future_consequences` metadata to the four already approved first-packet rows and render that metadata in the event modal.

## Approved Label Taxonomy

| Label | Use When | Block When |
| --- | --- | --- |
| `Historical default` | The option matches the documented action taken by the historical actor and sources support that actor-specific choice. | The row authorizes atrocity, abstracts a recurring command visit, or is a counterfactual-only branch. |
| `Historical response` | The event is a response to an already-occurring sensitive event, and the player is not authorizing the abuse itself. | The option manages, optimizes, conceals, or rewards the abuse as a player tactic. |
| `Counterfactual staff path` | The row exists because the sim diverged and no historical default exists, but Product/Game Design approve a baseline staff recommendation. | The row is presented as historical or lacks design provenance and historical analogy. |
| `Staff recommendation` | The row abstracts command posture, recurring visits, or staff advice where no single historical decision event exists. | A specific historical label is claimed without a specific source. |
| `Blocked` | None of the above labels is defensible. | Do not author modal-ready prose or historical bot defaults. |

## Source Standards

| Event Class | Minimum Source Standard |
| --- | --- |
| Atrocity, genocide, detention, ethnic-cleansing, hostage, safe-area, massacre, or civilian-targeting rows | ICTY/ICJ/UN or equivalent primary legal sources. Balkan Battlegrounds may support operational context only. |
| Srebrenica and safe-area rows | ICTY Krstic/Karadzic/Mladic, UN resolutions/reports, and BB operational context where relevant. |
| Operational military rows | BB is acceptable for operational chronology, control, and campaign context unless legal/civilian claims enter the prose. |
| Diplomacy and peace-plan rows | Agreement texts, UN/official chronology, or corroborated participant evidence; late-1995 halt framing also needs live-state proof. |
| Counterfactual rows | Repo design provenance plus historical analogy; source notes must say the branch is non-historical. |

Modal source notes must be compact but explicit. Deeper citations can route to Codex/Records, but the modal cannot hide why the historical/default label is trusted.

## Sensitive-History Rulings

| Event / Family | Ruling |
| --- | --- |
| `rs_strategic_goals` | May remain a foundational war-aim/platform decision. `all_six` can be `Historical default`; alternatives are counterfactual. Effects must be political/strategic: flags, aggression posture, command friction, international standing, patron pressure, scrutiny, operation constraints, and Cost Ledger exposure. Do not frame genocide or cleansing as a selected tactic. |
| `drina_cleansing_decision_1992` | Blocked as a player-selectable systematic-cleansing decision. Convert to consequence/reflection, or reframe around command discipline while displacement/war-crime consequences emerge from existing systems. |
| `concentration_camps_revealed_1992` | May be a response-to-exposure row. `deny` can be `Historical response` if sourced to ICTY-backed findings. Do not make camp operation or concealment an efficiency path. |
| `srebrenica_demilitarization_1993` | Historical/default path is partial or nominal compliance such as `hide_weapons`, not full compliance. Avoid any "prevent genocide" reward framing. |
| `un_hostage_crisis_1995` | May ask the player how to respond to crisis/fallout, never whether to authorize hostage-taking or human shields. |
| `visit_to_front_*` | Use `Staff recommendation` unless a specific trip/date is sourced. Remove or block sensitive press/camp-management wording, especially `visit_press_hrhb`, unless tribunal-grade evidence supports the exact claim. |
| `csq_*` | Use `Counterfactual staff path` or keep blocked. Never label as historical default. `csq_partition_referendum_proposal` needs explicit user/Product approval because it is a stretch branch. |
| `us_halts_federation_advance_1995` | Defer until 188-week/endgame proof confirms the live battlefield state supports Banja Luka/halt framing. Runtime text must not assert captures, 51/49 realization, or Banja Luka reach unless state predicates prove it. |

## Material Consequence Minimum

Every presidential decision option must include at least one material consequence:

- immediate `effects`, `sets_flags`, or `dimension_shifts`;
- validated `future_consequences` metadata that names future branch visibility;
- modifiers, constraints, patron pressure, morale/cohesion, supply/equipment/recruitment changes, alliance changes, bot priorities, operation suppression, negotiation capital, Cost Ledger/Records/Codex trail, or endgame interpretation.

Pure wallpaper rows are not modal-ready. If the effect is future-only, the modal must say whether it is guaranteed, conditional, or risk-based.

## Technical Boundary

Enforceable now:

- loader validation for response-option structure, `future_consequences` shape, timing/certainty enums, string arrays, dangling opened/closed event ids, event vocabulary, factions, duplicate ids, and invalid historical default ids;
- taxonomy/acceptance diagnostics for source notes, historical markers, default ids, option 0 historical calibration, sensitive gates, modal readiness, and branch metadata findings;
- runtime application of existing response `effects`, `sets_flags`, `dimension_shifts`, pending player decisions, historical bot defaults, mutex filtering, overflow queueing, and decision logs.

Not yet runtime behavior:

- `future_consequences` does not open, close, delay, or suppress events or flags;
- `opens_flags` and `closes_flags` are explanatory metadata only;
- response-level `opens_events` is not equivalent to event-level `enables_events`;
- `material_effect_refs` are not yet verified against actual effects;
- future-consequence cards still need modal rendering work.

## First Authoring / Implementation Order

1. Add `future_consequences` metadata to the four approved first-packet rows only: `rbih_state_identity`, `hrhb_political_goal`, `rs_assembly_rejects_voplan_1993`, and `belgrade_embargo_rs_1994`.
2. Render future consequence cards in `EventDecisionModal`, labeled as guaranteed, conditional, or risk, and bounded to player-visible information.
3. Keep evaluator behavior unchanged in that slice. No branch runtime, save schema, bot-choice, trigger, effect, scenario, or calibration change.
4. Then prepare the next source/default packet in this order: `visit_to_front_*`, `csq_*`, `concentration_camps_revealed_1992` / `srebrenica_demilitarization_1993`, `rs_strategic_goals`, then late-war halt rows only after 188-week proof.

## Required Verification For Future Packets

Minimum authoring packet gate:

```powershell
npx.cmd tsx tools\diagnostics\event_taxonomy_report.ts --json
npx.cmd tsx tools\diagnostics\event_acceptance_report.ts --json
npx.cmd tsx tools\diagnostics\event_presidential_acceptance.ts --json
npx.cmd vitest run tests\event_loader.test.ts tests\sim\events\event_taxonomy_report.test.ts tests\sim\events\event_acceptance_report.test.ts tests\sim\events\event_presidential_acceptance.test.ts tests\events_evaluate.test.ts tests\event_decisions.test.ts tests\player_decision_manifest.test.ts --reporter=dot
npm.cmd run typecheck
git diff --check
```

Additional gates:

- modal display changes: add focused event-modal tests and browser/modal smoke where useful;
- save-shape changes: add migration, validator, fixture, roundtrip, and drift-audit tests;
- scenario-affecting event data: run 52-week proof for early/mid-war packets and 188-week proof for late-war, Washington/Dayton/Srebrenica/Banja Luka halt, or full-campaign claims.

## Stop Gates

Stop before commit if:

- an event makes atrocity, detention, hostage-taking, genocide, civilian targeting, or civilian harm a player optimization lever;
- a historical/default label lacks source support;
- a future-consequence claim implies runtime branch behavior not yet implemented;
- a decision would move bot historical calibration to a non-historical option;
- a branch is closed by date alone instead of player choice, flags, or live predicates;
- any scenario hash or benchmark drift is unexplained;
- a new persisted field lacks save-schema proof.

## Orchestrator Completion Block

**Canonical owner:** Event-system product/engine lane, with Historian and Game Designer gates for content and Technical Architect/QA gates for runtime mapping.

**Demoted path:** Broad event prose authoring and runtime branch implementation before source/default/sensitive-history approval.

**Player-visible truth:** Event modals must clearly show historical baseline, source note, alternatives, numeric/material consequences, future branch visibility, uncertainty, and record trail.

**Canonical UI surface:** Existing President's Desk / event decision modal stack / Decision Surface Registry / consequence ledger. Do not create a parallel event inbox.

**Done means:** First visible slice adds approved branch metadata to the four first-packet rows, renders it in the modal, passes focused event/modal diagnostics, and preserves evaluator/scenario behavior.
