# Event Future Consequence Modal Slice

**Date:** 2026-05-27
**Status:** Implemented
**Owner lane:** Event-system product/engine lane

**Supersession note (P17, 2026-06-27):** This report records the historical implementation of pre-choice future-consequence cards. P17 retired that modal display. `future_consequences[]` metadata remains authored and validated, but it is now diagnostic/post-choice receipt substrate and must not be exposed as future-branch preview/detail copy before the player chooses.

## Summary

- Added behavior-neutral `future_consequences` metadata to the four approved first-packet presidential decision rows: `rbih_state_identity`, `hrhb_political_goal`, `rs_assembly_rejects_voplan_1993`, and `belgrade_embargo_rs_1994`.
- Rendered that metadata in the existing `EventDecisionModal` as player-visible future-consequence cards showing timing, certainty, explanation, and later eligible/suppressed branch context.
- Preserved evaluator behavior, response effects, triggers, bot historical choices, save schema, scenario setup, generated artifacts, and calibration behavior.

## Changes Made

### Event Metadata

- `rbih_state_identity` now shows the civic, Bosniak-national, and pragmatic identity branches that become visible through the recorded `rbih_state_identity` flag.
- `hrhb_political_goal` now shows the Croat-republic, united-front, and strategic-ambiguity branches that become visible through the recorded `hrhb_political_goal` flag.
- `rs_assembly_rejects_voplan_1993` now shows the political-cost branch for accepting the assembly rejection and the risk branch for attempting an override.
- `belgrade_embargo_rs_1994` now shows the defiance and accommodation branches through the recorded `rs_belgrade_response` flag.

The metadata uses existing `future_consequences` fields only. It does not change any trigger, effect, response id, response order, `bot_response_logic`, historical marker, or source note.

### Modal Rendering

- Historical note: `EventDecisionModal` rendered future-consequence cards only when a response option carried metadata. P17 supersedes this display behavior.
- Cards display the consequence label, timing, certainty, explanation, and reference rows for later eligible events, later suppressed events, recorded flag context, and suppressed flag context.
- UI wording deliberately avoids saying the response directly opens or closes runtime chains, because current metadata is branch visibility, not runtime gating.

### Tests

- `tests/sim/events/event_taxonomy_report.test.ts` now pins the four rows with metadata and their current `opens_events` diagnostic inventory.
- `tests/ui/event_decision_modal_phase3.test.ts` now verifies future-consequence cards render for a metadata-bearing option and remain absent for an option without metadata.

## Boundary

- No runtime branch behavior was implemented.
- No save schema or migration changed.
- No scenario, baseline, replay, startup snapshot, or generated artifact changed.
- No sensitive-history decision was reopened.
- `.claude/scheduled_tasks.lock` remained unrelated local runtime noise and was not staged.

## Review

- Canon/Game Design review initially found a blocker: the modal labels said `Opens events`, `Closes events`, `Opens flags`, and `Closes flags`, which overclaimed behavior. The labels were corrected to `Later eligible events`, `Later suppressed events`, `Recorded flag context`, and `Suppressed flag context`.
- The same review flagged `Croat republic rupture path` as loaded wording. It was softened to `Croat republic pressure path`.
- Technical/UI QA found no blockers after review. Residual risk: `material_effect_refs` are validated/reported but not rendered because immediate effects already appear in the existing effect preview.

## Verification

- `npx.cmd vitest run tests\event_loader.test.ts tests\sim\events\event_taxonomy_report.test.ts tests\sim\events\event_acceptance_report.test.ts tests\sim\events\event_presidential_acceptance.test.ts tests\events_evaluate.test.ts tests\event_decisions.test.ts tests\player_decision_manifest.test.ts tests\ui\event_decision_modal_phase3.test.ts tests\ui\event_decision_modal_catalog.test.ts --reporter=dot` - PASS; 128/128 tests.
- `npx.cmd tsx tools\diagnostics\event_taxonomy_report.ts --json` - PASS.
- `npx.cmd tsx tools\diagnostics\event_acceptance_report.ts --json` - PASS.
- `npm.cmd run typecheck` - PASS.
- `git diff --check` - PASS; Git emitted an existing CRLF normalization warning for `data/scenarios/events/war_1992.json`.

## Files Changed

| File | Change |
| --- | --- |
| `data/scenarios/events/war_1992.json` | Added future-consequence metadata for `rbih_state_identity` and `hrhb_political_goal`. |
| `data/scenarios/events/war_1993.json` | Added future-consequence metadata for `rs_assembly_rejects_voplan_1993`. |
| `data/scenarios/events/war_1994.json` | Added future-consequence metadata for `belgrade_embargo_rs_1994`. |
| `src/ui/map/components/EventDecisionModal.tsx` | Added display-only future-consequence cards. |
| `tests/sim/events/event_taxonomy_report.test.ts` | Pinned the first live metadata inventory. |
| `tests/ui/event_decision_modal_phase3.test.ts` | Added modal rendering and absence coverage. |
| `docs/plans/2026-05-24-event-system-presidential-core-upgrade-plan.md` | Marked the first future-consequence modal slice closed and routed next work to source/default packets. |
| `docs/plans/COMMAND_BOARD.md` | Updated the event-system lane next action and proof summary. |
| `docs/plans/MASTER_ROADMAP.md` | Added a short roadmap addendum for the implemented slice. |
| `docs/40_reports/README.md` / `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` / `docs/PROJECT_LEDGER.md` | Registered the report and verification record. |

## Next Steps

- Dispatch the next source/default packet in the order approved by the foundational decisions packet: `visit_to_front_*`, then `csq_*`, then `concentration_camps_revealed_1992` / `srebrenica_demilitarization_1993`, then `rs_strategic_goals`.
- Do not implement runtime response-level branch gating until a technical semantics packet approves exact behavior for `opens_events`, `closes_events`, `opens_flags`, and `closes_flags`.
