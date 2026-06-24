# Sparse Readiness and Sector Intel Truth

Date: 2026-06-24

## Summary

Closed the residual sparse-data truth lane from the player-surface polish queue. Army HQ readiness and combat-effectiveness grading now treats missing grade-critical brigade fields as incomplete assessment truth instead of awarding favorable readiness/effectiveness grades from neutral fallbacks. Sector tactical/intel projection preserves absent density, threat ratio, defensive power, intelligence confidence, and offensive-sign fields as unreported through Corps Front, Situation, Army HQ sector rows, tooltips, and map layers.

The morale overlay now emits nullable morale with an explicit `morale_reported` flag and renders unreported sectors with neutral grey fill instead of defaulting them to morale 50. Density features skip sectors with missing density. Army HQ expanded sector rows render sparse brigade personnel/cohesion as unreported instead of `0` or `0%`.

This batch also fixes the stale BCS President's Desk expectation that caused the pushed `main` Baseline Regression failure after the modal-required blocker label changed from urgent-style copy to required-style copy.

## Verification

- `npm.cmd run typecheck` passed.
- `node node_modules\vitest\vitest.mjs run tests\ui\combat_effectiveness_sparse_data.test.ts tests\ui\army_hq_readiness_threat_copy.test.ts tests\ui_map_game_state_adapter.test.ts tests\ui_map_sector_frontline_fills.test.ts tests\ui_map_tooltip_player_visibility.test.ts tests\ui\corps_front_panel_routing.test.ts tests\ui\president_desk_decision_card_fallback.test.ts tests\strict_null_inventory_progress.test.ts --pool=forks --reporter=dot` passed 8 files / 186 tests.
- `node node_modules\vitest\vitest.mjs run tests\ui\gui_audit_dead_controls.test.ts tests\ui\combat_effectiveness_sparse_data.test.ts tests\ui\army_hq_readiness_threat_copy.test.ts tests\ui\corps_front_panel_routing.test.ts --pool=forks --reporter=dot` passed 4 files / 45 tests.
- `npm.cmd run qa:player-journeys` passed 43 files / 574 tests.

## Scope

UI/read-model/map-projection/test/docs polish only. No simulation logic, scenario data, startup artifact, save schema, event evaluator mechanics, turn pipeline, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, baselines, golden manifests, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
