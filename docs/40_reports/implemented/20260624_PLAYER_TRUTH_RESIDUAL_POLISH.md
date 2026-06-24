# Player Truth Residual Polish

**Date:** 2026-06-24
**Branch:** `codex/player-truth-polish-residuals`
**Baseline:** `c91c19c99`
**Result:** Implemented and locally verified through focused UI proof, TypeScript, player-journey QA, and browser gates

## Summary

- Closed three residual Pyrrhic scout findings in one batch: AAR raw notable-event fallback, missing/stale operation commander display, sparse Army HQ operation metrics, and tactical counter physical-location truth.
- Kept the batch UI/read-model/map-projection only. No simulation logic, scenario data, startup artifact, save schema, event evaluator mechanics, command-HQ semantics, calibration floor, baseline manifest, packaging artifact, randomness, timestamps, or locale persistence changed.

## Changes Made

- AAR notable-event rows now render `aar.notable.fallback` for unmapped event kinds instead of printing the raw kind id.
- Operations Panel, Operation Briefing, and Army HQ Operations now distinguish assigned commanders from unassigned operations and unresolved commander records.
- Army HQ operation brigade rows render missing or non-finite personnel, cohesion, and morale as unreported rather than `0`, `0%`, or `NaN`.
- Tactical map formation counters now require explicit `location_osid` field truth. AoR and HQ anchor fallback remains available to non-counter anchor consumers through `resolveFormationLocationOsid(...)`, with command-only `hq_osid` preferred over legacy `hq_sid`.

## Verification

- Focused combined proof passed 5 files / 70 tests:
  `node node_modules\vitest\vitest.mjs run tests\ui\aar_tooltip_friction_labels.test.ts tests\ui_map_render_smoke.test.ts tests\ui_player_visibility.test.ts tests\ui\map_click_routing_contract.test.ts tests\ui\oob_operations_panel.test.ts --pool=forks --reporter=dot`
- Final operation focused proof passed 19/19:
  `node node_modules\vitest\vitest.mjs run tests\ui\oob_operations_panel.test.ts --pool=forks --reporter=dot`
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 552 tests.
- `npm.cmd run qa:first-hour:browser` passed against `http://127.0.0.1:3003/?dev=1`.
- `npm.cmd run qa:live-surface:browser` passed against `http://127.0.0.1:3003/?dev=1`.

## Follow-Up Queue

- Continue regular GitHub Actions polling for the pushed `main` head and this branch after integration.
