# War Map Context / OpsMap I18n Boundary

**Date:** 2026-06-21

## Summary

Closed the two War Map chrome residuals left by the mode/layer i18n pass. Tactical-map radial/context menu copy and the operations-planning compact map legend now render through EN/BCS i18n keys instead of hardcoded English literals.

## Changed

- `MapContainer` imports `t(...)` and resolves radial/context labels through `map.context.*` keys for unit, corps, settlement, sector, front, and deselect actions.
- `OpsMap` resolves compact planning legend copy through `opsPlanning.compactLegend.*` keys for objective, Schwerpunkt, staging, corps-front, selectable, and out-of-range labels.
- EN/BCS dictionaries now cover the new `map.context.*` and `opsPlanning.compactLegend.*` keys.
- `tests/ui/map_context_menu_i18n.test.ts` pins the MapContainer label boundary and rejects the stale hardcoded English menu strings.
- `tests/ui/ops_planning_target_discovery.test.ts` now pins the OpsMap compact legend under BCS mode.

## Verification

- Red proof: `npm.cmd exec -- vitest run tests/ui/map_context_menu_i18n.test.ts --pool=forks --reporter=dot` failed on missing `map.context.*` render calls and stale English literals.
- Green focused proof: `npm.cmd exec -- vitest run tests/ui/map_context_menu_i18n.test.ts tests/ui/ops_planning_target_discovery.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 38/38.
- TypeScript: `npm.cmd run typecheck` passed.
- Player journey pack: `npm.cmd run qa:player-journeys` passed 239/239.
- Live browser sweep: `npm.cmd run qa:live-surface:browser` passed, confirming first-hour major surfaces, war-start splash, foundational decision flow, surface reachability, console health, and dev-server cleanup. Temporary `.tmp_live_surface_browser_sweep` evidence was inspected and removed.
- Production tactical-map build: `npm.cmd run desktop:map:build` passed.

## Scope

UI/i18n/test/docs polish only. No simulation logic, scenario data, route commands, map-mode ids, layer-state ids, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
