# War Map Chrome I18n Boundary

**Date:** 2026-06-21

## Summary

War Map mode, layer-toggle, and map-mode legend chrome now render through EN/BCS i18n keys instead of hardcoded English literals. The map-mode ids, numeric hotkeys, layer state keys, and live/dev layer semantics are unchanged.

## Changed

- `MAP_MODES` now carries typed `labelKey` values while preserving existing English `label` metadata for fallback/debug contract use.
- `DEV_LAYER_TOGGLES` and `LIVE_LAYER_TOGGLES` now carry typed layer `labelKey` values.
- `BottomStatusStrip` resolves mode and layer labels with `t(...)` at render time.
- `MapModeLegend` resolves legend titles/stops with `t(...)` keys for ethnic, supply, casualties, morale, operations, defense, authority, and legitimacy modes.
- EN/BCS dictionaries now cover `map.mode.*`, `map.layer.*`, and `map.legend.*`.

## Verification

- Red proof: `npm.cmd exec -- vitest run tests/ui/bottom_status_strip_labels.test.ts tests/ui/supply_legend_overlap_contract.test.ts tests/ui/map_modes_no_duplicate_labels.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` failed on English-rendered War Map mode/legend labels and missing `labelKey` registry metadata.
- Green proof: same command passed 25/25 after the fix.
- Adjacent registry proof: `npm.cmd exec -- vitest run tests/ui_map_modes.test.ts tests/ui/map_mode_shortcut_contract.test.ts tests/ui/bottom_status_strip_labels.test.ts tests/ui/supply_legend_overlap_contract.test.ts tests/ui/map_modes_no_duplicate_labels.test.ts --pool=forks --reporter=dot` passed 17/17.
- TypeScript: `npm.cmd run typecheck` passed.
- Player journey pack: `npm.cmd run qa:player-journeys` passed 239/239.
- Whitespace: `git diff --check` passed.
- Live browser sweep: `npm.cmd run qa:live-surface:browser` passed and verified first-hour major surface reachability, owner journey drilldowns, archive/inbox routes, Codex drilldown, console health, and dev-server port cleanup. Temporary `.tmp_live_surface_browser_sweep` evidence was inspected and removed.

## Scope

UI/i18n/test/docs polish only. No simulation logic, scenario data, map-mode ids, layer-state ids, route commands, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Follow-Up Queue

The parallel UI/QA audit found two independent War Map chrome residuals outside this branch scope:

- `src/ui/map/map/MapContainer.tsx`: radial/context labels (`View Unit`, `View Corps`, `View Sector`, `Sector Detail`, `Deselect`, and front target `Front`) should move to `map.context.*` keys.
- `src/ui/map/components/ops_modal/OpsMap.tsx`: compact plan-map legend copy (`Objective`, `Schwerpunkt`, `Staging`, `Corps front`, `Bright = selectable`, `Dim = out of range`) should move to existing/new `opsPlanning.legend.*` keys.
