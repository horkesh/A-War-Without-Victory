# 2026-06-23 - Field Context and Panel Truth Follow-up

## Summary

Closed the next non-packaging player-surface polish slice from Pyrrhic scout review. Formation drilldowns from ORBAT, Corps Front, and Formation Detail now preserve known settlement context on field-inspection routes instead of clearing `selectedOsid` while only panning visually. Formation Detail and Settlement Detail reset to their Overview tabs when the selected formation or settlement changes, so newly selected entities do not open on stale Orders/Timeline context.

Corps Front now distinguishes absent logistics-priority and operational-security data from explicit neutral/inactive values. Missing logistics/OPSEC truth renders as unreported, while explicit `1.0x` and `false` still render as neutral/inactive. The Settlement Info close control now has a named button. Army HQ summary now labels and counts executing operations instead of putting planning/recovery records under an `Active Operations` chip. The player-journey QA gate now includes `ui_map_game_state_adapter` and `army_hq_sector_truth` so sector-truth regressions are pinned by the focused release-polish gate.

## Verification

- Focused proof `node node_modules\vitest\vitest.mjs run tests\ui\orbatpanel_drilldown_routing.test.ts tests\ui\corps_front_panel_routing.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\gui_audit_label_discipline.test.ts tests\ui\gui_audit_dead_controls.test.ts tests\player_journey_qa_gate_contract.test.ts --pool=forks --reporter=dot` passed 6 files / 74 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 516 tests.
- `npm.cmd run qa:first-hour:browser` passed with dev-server cleanup verified.
- `npm.cmd run qa:live-surface:browser` passed with dev-server cleanup verified.
- `git diff --check` passed.

## Scope

UI/read-model/test/docs polish only. No simulation logic, scenario data, startup artifact, event mechanics, turn pipeline, save schema, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, baselines, golden manifests, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
