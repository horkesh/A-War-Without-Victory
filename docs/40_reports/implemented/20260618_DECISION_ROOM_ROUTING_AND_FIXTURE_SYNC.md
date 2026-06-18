# Decision Room Routing and Fixture Sync

**Date:** 2026-06-18
**Scope:** UI/read-model routing, player-faction filtering, and stale unit-fixture alignment.

## Summary

Pre-advance priority review, the tactical `1 REVIEW` badge, and operation-opportunity actions now route to the Warroom-native Decision Room. Army HQ remains the source/evidence handoff for operation opportunities, but it is no longer the default owner for presidential priority review.

Decision Room paramilitary request cards, proposal-review cards, and pre-advance blocker counts now share the loaded-player-faction scope. This prevents enemy-faction request data from surfacing as player blockers.

The CI-stale Krivaja/Stupcanica unit fixtures now seed `srebrenica_falls_1995` / `zepa_falls_1995` receipts when they intentionally assert late-1995 operation-context behavior. The tests no longer imply a turn-only operation-delivery path for Srebrenica or Zepa.

## Verification

- `npx.cmd vitest run tests\ui\decision_surface_registry.test.ts tests\ui\inbox_items.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\presidential_decision_room.test.ts tests\ui_presidential_decision_room_wiring.test.ts tests\ui_shell_navigation.test.ts --pool=forks --reporter=dot` - PASS, 110/110.
- `npx.cmd vitest run tests\ui\shell_navigation_ownership.test.ts tests\ui\advance_turn_button_gated_feedback.test.ts tests\ui_shell_frame_contract.test.ts --pool=forks --reporter=dot` - PASS, 26/26.
- `npx.cmd vitest run tests\krivaja_roster_and_prestage.test.ts tests\stupcanica_w27_trigger_fix.test.ts tests\triggered_operations_late_1995.test.ts tests\triggered_operations.test.ts --pool=forks --reporter=dot` - PASS, 47/47.
- `npm.cmd run typecheck -- --pretty false` - PASS.
- `npm.cmd run qa:player-journeys` - PASS, 105/105.
- `git diff --check` - PASS.
- Live in-app browser smoke on `http://127.0.0.1:5174/`: ARBiH start -> war-start splash -> foundational `What Is Bosnia?` command card -> `1 REVIEW` opens `Warroom Decision Room`; no console warnings/errors.

## Determinism

No simulation logic, scenario source data, save schema, generated artifacts, calibration floor, golden baselines, randomness, timestamps, or persisted output ordering changed.
