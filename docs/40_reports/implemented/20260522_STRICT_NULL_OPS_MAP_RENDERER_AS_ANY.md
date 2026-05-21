# Strict Null OpsMapRenderer As-Any Cleanup

Date: 2026-05-22

## Summary

`src/ui/map/components/plan_ui/OpsMapRenderer.ts` now contributes zero inventory-counted `as_any_casts`.

The cleanup replaces PMTiles/MapLibre protocol-handler casts with the handler type inferred from `maplibregl.addProtocol`, and types generated operation-axis line features as GeoJSON `Feature<LineString, AxisFeatureProperties>`.

## Scope

- Removed three broad casts from `OpsMapRenderer.ts`.
- Added a strict-null progress assertion pinning the renderer at zero `as_any_casts`.
- No operation-planning behavior, map layer IDs, source data, scenario behavior, save schema, or output tuning changed.

## Verification

- `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot` PASS (81/81)
- `npm.cmd run typecheck` PASS
- `npm.cmd run desktop:map:build` PASS with existing Vite externalization/chunk warnings
- `node tools\diagnostics\strict_null_inventory.cjs`
  - `as_factionid_casts`: 2
  - `as_unknown_casts`: 2
  - `as_any_casts`: 150
  - `non_null_assertions_dot`: 0
  - `non_null_assertions_index`: 0
  - `optional_fields_game_state`: 473
