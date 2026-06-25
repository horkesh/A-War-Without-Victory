# Vitezoci Decision Routing Convergence

Date: 2026-06-25

## Summary

This packet closes the Vitezoci presidential-routing follow-up from the D2 polish lane.

Implemented:

- Required event decisions are now defined by `requires_player_response === true`.
- Advisory event decisions no longer block, auto-open EventDecisionModal, count as presidential required reviews, or render as Army HQ required decisions.
- Autonomy proposal review routes to the Presidential Decision Room with `command:review-proposal:*` card ids.
- Operation-opportunity inbox rows require a matching live Decision Room dossier before rendering.
- Operation-opportunity desk packet art no longer reuses reserve-request art.
- Army HQ attention copy distinguishes presidential signatures from Army HQ command review ownership.
- The `main` Baseline Regression failure at `fc29d66f3` was traced to sparse-effectiveness and routing-fixture contracts that no longer described real actionable items; the local repair gives the Formation Detail modifier fixture explicit grade-critical fields and updates older event/opportunity tests to use required-response events and live Decision Room dossiers.

## Verification

- `node node_modules\vitest\vitest.mjs run tests/ui/inbox_items.test.ts tests/ui/decision_surface_registry.test.ts tests/ui/event_decision_auto_launch_contract.test.ts tests/ui/presidential_blockers.test.ts tests/ui/presidential_desk_assets.test.ts tests/ui/army_hq_timing_copy.test.ts tests/ui_map_game_state_adapter.test.ts tests/player_decision_manifest.test.ts tests/ui/pre_advance_command_review.test.ts tests/ui/presidential_decision_room.test.ts tests/ui_presidential_decision_room_wiring.test.ts tests/ui_shell_navigation.test.ts tests/ui_presidential_toolbar_summary_click.test.ts --pool=forks --reporter=dot`
  - 13 files / 240 tests passed.
- `node node_modules\vitest\vitest.mjs run tests/ui/formation_detail_parity.test.ts tests/ui/inbox_items.test.ts tests/ui/decision_surface_registry.test.ts tests/ui/event_decision_auto_launch_contract.test.ts tests/ui/presidential_blockers.test.ts tests/ui/presidential_desk_assets.test.ts tests/ui/army_hq_timing_copy.test.ts tests/ui_map_game_state_adapter.test.ts tests/player_decision_manifest.test.ts tests/ui/pre_advance_command_review.test.ts tests/ui/presidential_decision_room.test.ts tests/ui_presidential_decision_room_wiring.test.ts tests/ui_shell_navigation.test.ts tests/ui_presidential_toolbar_summary_click.test.ts --pool=forks --reporter=dot`
  - 14 files / 272 tests passed.
- `node node_modules\vitest\vitest.mjs run tests/ui/advance_turn_button_gated_feedback.test.ts tests/ui/gui_audit_dead_controls.test.ts tests/ui/turn_aftermath.test.ts --pool=forks --reporter=dot`
  - 3 files / 39 tests passed.
- `npm.cmd run typecheck -- --pretty false`
  - Passed.
- `npm.cmd run test:vitest:fast`
  - 1109 files passed / 4 skipped; 10674 tests passed / 34 skipped.

## Scope

UI/read-model/i18n/test/docs polish only.

No simulation logic, event evaluator mechanics, scenario data, startup artifact, save schema, baseline manifest, golden manifest, structural fingerprint artifact, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.

## Remaining Queue

The next non-packaging polish packet should address Chandrasekhar's Army HQ P1 findings:

- zero-fielded-brigade readiness should render neutral/unreported instead of ineffective with 0 fatigue/cohesion;
- missing command relationship/exhaustion should render unreported instead of healthy silence;
- unreported personnel coloring should be neutral rather than low-strength red.
