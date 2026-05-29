# Event Staff Recommendation Defaults

**Date:** 2026-05-27
**Result:** One abstract command-presence row is production modal-ready through staff recommendation metadata without becoming a historical calibration default.

## Summary

- Added a separate `staff_recommended_response_id` event field for abstract decisions where no sourced historical default is valid.
- Updated the `visit_to_front_*` packet with neutral command-presence prose, source notes, trigger evidence, and staff recommendations while keeping RS/HRHB sensitive/source gates active.
- Removed sensitive-history reward coupling from gated RS/HRHB visit options: Drina visits no longer write war-crimes delta, and press-tour options now increase scrutiny instead of improving international standing/patron pressure.
- Updated diagnostics and modal rendering so staff recommendations are visible to the player but do not control historical bot calibration.

## Changes Made

### Event Schema And UI

- `EventDefinition` and `PendingEventDecision` now carry optional `staff_recommended_response_id`.
- The event loader validates staff recommendation IDs against authored response options.
- `evaluateEvents(...)` copies the field into pending decisions.
- `EventDecisionModal` renders a distinct `Staff recommendation` badge and explanatory copy, separate from `Historical default`.

### Event Data

- `visit_to_front_rbih` now has `staff_recommended_response_id: stay_capital_rbih` and is production modal-ready as an abstract command decision.
- `visit_to_front_rs` and `visit_to_front_hrhb` now have staff recommendations and safer prose, but remain blocked by sensitive/source gates.
- Unsupported trip-specific assertions were removed or narrowed.
- Sensitive-history effect corrections were applied to gated RS/HRHB rows: `visit_drina_front` now raises patron pressure instead of adding `war_crimes_delta`, while RS/HRHB press visits now carry international-standing and patron-pressure costs instead of rewards.

### Diagnostics

- Taxonomy and acceptance diagnostics now recognize approved staff-recommendation rows without requiring historical-default markers.
- Presidential-acceptance diagnostics now probe only historical-default modal-ready rows; staff-recommendation modal-ready rows are counted as skipped because they are not calibration defaults.
- Current catalog remains 247 rows, 44 choice events, 36 required-response rows.
- Production modal-ready rows move from 17 to 18. Missing approved-default debt drops to 16 because the three `visit_to_front_*` rows are now staff-recommendation rows, not historical-default rows; raw missing historical-default counts remain 19.

## Files Changed

| File | Change |
| --- | --- |
| `data/scenarios/events/war_1993.json` | Added staff recommendations/source notes/trigger evidence, safer visit-to-front prose, and sensitive-history effect corrections for gated RS/HRHB options. |
| `src/sim/events/event_types.ts` | Added staff recommendation metadata to event and pending-decision types. |
| `src/sim/events/event_loader.ts` | Validates staff recommendation option IDs. |
| `src/sim/events/evaluate_events.ts` | Carries staff recommendation metadata into pending decisions. |
| `src/state/validateGameState.ts` | Validates pending staff recommendation IDs in saved pending decisions. |
| `src/ui/map/components/EventDecisionModal.tsx` | Renders `Staff recommendation` separately from `Historical default`. |
| `src/ui/map/data/types.ts` | Exposes staff recommendation metadata to UI data shape. |
| `tools/diagnostics/event_taxonomy_report.ts` | Adds staff recommendation field and readiness logic. |
| `tools/diagnostics/event_acceptance_report.ts` | Adds staff recommendation acceptance logic. |
| `tools/diagnostics/event_presidential_acceptance.ts` | Keeps historical-bot acceptance proof scoped to historical-default rows. |
| Focused event/modal tests | Cover loader validation, pending-decision propagation, modal display, catalog rendering, and updated diagnostic counts. |

## Verification

- `npx.cmd vitest run tests\event_decisions.test.ts tests\event_state_shape_validation.test.ts tests\save_migration_validator_rejection.test.ts tests\sim\events\event_acceptance_report.test.ts tests\sim\events\event_taxonomy_report.test.ts tests\sim\events\event_presidential_acceptance.test.ts tests\ui\event_decision_modal_catalog.test.ts tests\ui\event_decision_modal_phase3.test.ts --reporter=dot` - PASS; 189/189 tests.
- `npx.cmd vitest run tests\event_loader.test.ts tests\event_decisions.test.ts tests\event_state_shape_validation.test.ts tests\save_migration_validator_rejection.test.ts tests\sim\events\event_taxonomy_report.test.ts tests\sim\events\event_acceptance_report.test.ts tests\sim\events\event_presidential_acceptance.test.ts tests\events_evaluate.test.ts tests\player_decision_manifest.test.ts tests\ui\event_decision_modal_phase3.test.ts tests\ui\event_decision_modal_catalog.test.ts --reporter=dot` - PASS; 245/245 tests.
- Earlier focused loader/modal pack: `npx.cmd vitest run tests\event_loader.test.ts tests\event_decisions.test.ts tests\sim\events\event_taxonomy_report.test.ts tests\sim\events\event_acceptance_report.test.ts tests\ui\event_decision_modal_phase3.test.ts tests\ui\event_decision_modal_catalog.test.ts --reporter=dot` - PASS; 92/92 tests.
- `npx.cmd vitest run tests\sim\events\event_presidential_acceptance.test.ts tests\events_evaluate.test.ts tests\player_decision_manifest.test.ts --reporter=dot` - PASS; 37/37 tests.
- `npx.cmd tsx tools\diagnostics\event_taxonomy_report.ts --json | Out-Null; npx.cmd tsx tools\diagnostics\event_acceptance_report.ts --json | Out-Null; npx.cmd tsx tools\diagnostics\event_presidential_acceptance.ts --json | Out-Null` - PASS.
- `npm.cmd run typecheck` - PASS.
- `git diff --check` - PASS.
- Independent Historian/Game Designer and Technical QA reviews - no blockers after sensitive-effect and save-validation fixes.

## Next Steps

- Prepare the full event database and alternate-timeline plan before broad authoring.
- Define runtime semantics for causal opens/closes before any response-level branch behavior changes.
- Continue with `csq_*` source/default packet only after historian/game-design review.
