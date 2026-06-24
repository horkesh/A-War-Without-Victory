# 2026-06-24 - Map and Command Ownership Truth Follow-Up

## Summary

This batch closes the next map/command truth residuals from the Pyrrhic scout queue:

- staged order arrows and sector ghost paths now require explicit physical `location_osid` sources, so AoR coverage and HQ anchors cannot become movement origins;
- formation marker morale no longer falls back to cohesion when morale is absent;
- operation opportunity dossiers only bind live, unresolved, player-faction review rows;
- proactive force-launch cards require a resolved player-owned corps formation when the loaded player faction is known;
- formation tooltips render missing cohesion as `Unreported` instead of `0`;
- front-stability overlay properties distinguish missing threat intensity from low threat and emit `stability_score: null` plus `threat_reported: false`;
- battle markers distinguish combat-flip markers from battle-reported markers, leaving casualties and attacker counts null when no battle row exists while the renderer coalesces only for visual radius sizing.

## Verification

- Focused red/green packet: `node node_modules\vitest\vitest.mjs run tests\ui_map_game_state_adapter.test.ts tests\ui\proactive_force_launch.test.ts tests\ui\sector_staged_order_map_feedback.test.ts tests\ui_map_render_smoke.test.ts tests\ui\aar_tooltip_friction_labels.test.ts tests\ui_map_front_stability.test.ts tests\ui_map_battle_casualty_truth.test.ts --pool=forks --reporter=dot` passed 7 files / 100 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 578 tests.
- `npm.cmd run qa:live-surface:browser` passed and verified dev-server cleanup; `.tmp_live_surface_browser_sweep` was removed after inspection.

## Scope

UI/read-model/map-projection/test/docs polish only. No simulation logic, scenario source data, event evaluator mechanics, startup snapshot, save schema, generated calibration artifact, structural fingerprint artifact, baseline manifest, golden manifest, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.

## GitHub Hygiene

The latest pushed `main` commit before this batch, `15d8947a`, is green across Event System CI, Desktop Release Guard, Baseline Regression, and Full Suite + Structural Fingerprint. The prior red `main` runs were the stale BCS Desk `Hitno` expectation, already fixed by the sparse readiness/sector-intel batch.
