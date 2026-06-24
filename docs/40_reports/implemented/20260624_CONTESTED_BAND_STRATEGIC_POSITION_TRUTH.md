# 2026-06-24 - Contested Band and Strategic Position Truth

## Summary

This batch closes two low-risk player-truth residuals:

- contested-band adjacent-pressure overlays now count only fielded tactical formations at explicit physical locations, using the shared `isFieldedTacticalFormation(...)` boundary instead of counting forming units, inactive/non-tactical rows, or command HQ records as pressure;
- Army HQ Strategic Position no longer turns missing negotiating-capital or dimension rows into neutral `50` values. Missing composite and missing dimension metrics render as unreported, while reported dimensions still display their actual values and modifiers.

## Verification

- Focused red/green packet: `node node_modules\vitest\vitest.mjs run tests\ui_map_contested_bands.test.ts tests\ui\army_hq_readiness_threat_copy.test.ts tests\ui_player_visibility.test.ts --pool=forks --reporter=dot` passed 3 files / 30 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 579 tests.
- `npm.cmd run qa:live-surface:browser` passed and verified dev-server cleanup.
- `.tmp_live_surface_browser_sweep` was removed after capturing the live-surface evidence.

## Scope

UI/read-model/map-projection/test/docs polish only. No simulation logic, scenario source data, event evaluator mechanics, startup snapshot, save schema, generated calibration artifact, structural fingerprint artifact, baseline manifest, golden manifest, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.
