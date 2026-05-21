# Strict-Null UI Map Non-Null Tail

**Date:** 2026-05-21
**Type:** Strict-null cleanup; UI/runtime refactor with no presentation change.

## Summary

Cleaned the final inventory-counted dot non-null assertions from the UI map path:

- `src/ui/map/map/MapContainer.tsx`
- `src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.ts`

`MapContainer.tsx` now narrows `loadedGameState` inside the corridor-heartbeat closure before reading front edges and pressure, and narrows `frontEdgesOsid` before sector highlight fallback collection. `buildCorpsFrontLinesGeoJSON.ts` now handles the theoretically empty splice result in `connectChains(...)` instead of asserting the stitched feature exists.

No map mode behavior, sector highlighting, corridor heartbeat default-off behavior, front-line geometry, deck layer selection, save schema, scenario data, or output tuning changed.

## Inventory Result

Current strict-null inventory floor after this slice:

```text
as_factionid_casts 2
as_unknown_casts 4
as_any_casts 179
non_null_assertions_dot 0
non_null_assertions_index 0
optional_fields_game_state 473
```

The top-level inventory now has zero counted non-null assertions in both dot and index categories.

## Verification

```text
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/ui_map_front_lines_phase_a.test.ts tests/ui_sector_glow_continuity.test.ts tests/sector_front_glow_continuity_real_save.test.ts tests/ui_map_no_corridor_heartbeat_default_overlay.test.ts --reporter=dot
PASS 76/76

npm.cmd run typecheck
PASS

npm.cmd run desktop:map:build
PASS with existing Vite browser-external/dynamic-import/chunk-size warnings.
```
