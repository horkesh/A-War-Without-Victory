# Player Truth Readiness And Displacement Polish

**Date:** 2026-06-24
**Branch:** `codex/player-truth-readiness-displacement`
**Baseline:** `ed373c17c`
**Result:** Implemented and locally verified through focused UI proof, TypeScript, player-journey QA, and live browser gates

## Summary

- Closed the next player-truth scout slice: AAR displacement groups, partial operation readiness, and stale operation participant records.
- Kept the batch UI/read-model only. No simulation logic, scenario data, startup artifact, save schema, event evaluator mechanics, calibration floor, baseline manifest, structural fingerprint, Srebrenica/Zepa event ownership, packaging artifact, randomness, timestamps, or persisted output ordering changed.

## Changes Made

- AAR displacement breakdown rows now use the shared civilian displacement-group label helper, so `RBiH` / `RS` / `HRHB` displacement keys render as Bosniaks / Serbs / Croats instead of ARBiH / VRS / HVO.
- `GameStateAdapter` now preserves partial operation readiness. Missing supply, cohesion, or intel dimensions stay absent instead of being coerced to `0`.
- Operation participant projection now counts and exposes only resolved formation ids as active/clickable participants. Missing raw ids are retained as stale participant evidence with explicit stale-record counts.
- Army HQ Operations, Operations Panel, and Operation Briefing readiness gauges render absent dimensions as unreported rather than red `0%` bars.
- The stale GitHub OPORD player-safe source guard was updated to the current assigned-commander display model, preserving the guard while removing the obsolete mandatory-commander assumption.

## Verification

- Focused red/green proof passed 2 files / 29 tests:
  `node node_modules\vitest\vitest.mjs run tests\ui\aar_tooltip_friction_labels.test.ts tests\ui\oob_operations_panel.test.ts --pool=forks --reporter=dot`
- Expanded command-surface proof passed 5 files / 73 tests:
  `node node_modules\vitest\vitest.mjs run tests\ui\aar_tooltip_friction_labels.test.ts tests\ui_map_render_smoke.test.ts tests\ui_player_visibility.test.ts tests\ui\map_click_routing_contract.test.ts tests\ui\oob_operations_panel.test.ts --pool=forks --reporter=dot`
- OPORD player-safe CI guard passed 7/7:
  `node node_modules\vitest\vitest.mjs run tests\ui_opord_player_safe_labels.test.ts --pool=forks --reporter=dot`
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 554 tests.
- `npm.cmd run qa:first-hour:browser` passed.
- `npm.cmd run qa:live-surface:browser` passed.
- `git diff --check` passed.
- Temporary browser evidence folders were removed after proof; `.tmp_dev_server` remains because it is the active dev-server workspace.

## Follow-Up Queue

- Poll GitHub Actions after merge/push and fix any new failure before treating the branch as green.
