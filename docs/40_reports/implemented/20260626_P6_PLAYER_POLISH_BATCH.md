# P6 Player Polish Batch

**Date:** 2026-06-26

**Branch:** `codex/p6-player-polish-batch`

## Summary

Closed the next P2 owner-playthrough scout queue from the Army HQ / sector / brigade information-quality sweep without reopening packaging, calibration, or BCS-only cleanup.

- Battle markers, battle tooltips, and settlement timelines now respect player-facing battle visibility: player-involved battles remain visible, fog-visible enemy contacts remain visible, and hidden enemy-only battles do not leak marker or timeline truth.
- Sparse battle casualty fields now remain unreported through the adapter/read-model path; markers, tooltips, and settlement timelines render `Unreported` instead of invented zeroes.
- Army HQ decision consequence records now render only Records-filed decision receipts. Chronicle-filed presidential decisions stay in Chronicle and route/focus there even when a caller attempts to open by record id.
- Sector staged-order arrows now use physical brigade location for reserve/member-only brigades instead of snapping them to front-edge anchors; only line holders can supply sector-front arrow origins.

## Verification

Focused/local proof completed before broad browser gates:

- `npm.cmd exec -- vitest run tests/ui_map_battle_casualty_truth.test.ts tests/ui_map_game_state_adapter.test.ts tests/ui_player_visibility.test.ts tests/ui/aar_tooltip_friction_labels.test.ts tests/ui/settlement_timeline_i18n.test.ts tests/ui/decision_consequence_records_panel.test.ts tests/ui/records_button_behavior.test.ts tests/ui_chronicle_operation_aar_link.test.ts tests/ui/chronicle_focus_routing.test.ts tests/ui/sector_staged_order_map_feedback.test.ts tests/ui_map_sector_lookup.test.ts --pool=forks --reporter=dot` passed 11 files / 124 tests.
- `npm.cmd run typecheck` passed after integration typing fixes.
- `npm.cmd run qa:player-journeys` passed 43 files / 631 tests.
- `npm.cmd run qa:first-hour:browser` passed after the browser gate was updated to prove Chronicle-owned decision receipts stay in Chronicle and browser proof uses the tileless basemap fallback by default.
- `npm.cmd run qa:live-surface:browser` passed after the live-surface drilldown was updated to prove the same Chronicle/Records route ownership.
- Final focused proof passed 12 files / 130 tests, including `tests/ui/first_hour_browser_gate_contract.test.ts`.
- `git diff --check` passed.

GitHub PR checks, merge, and branch cleanup remain pending at this report stage.

## Scope

UI/read-model/map rendering/navigation/test/docs polish only. No simulation logic, event evaluator mechanics, scenario data, startup artifact, save schema, baseline/golden manifest, structural fingerprint artifact, calibration, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale persistence, or persisted simulation output changed.
