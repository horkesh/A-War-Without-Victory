# Strict-Null MapContainer Bridge Tail

Date: 2026-05-22

## Scope

Type-only cleanup in `src/ui/map/map/MapContainer.tsx`. No simulation behavior, save schema, scenario data, map data, painted-control target, combat math, operation delivery, or calibration/army-arc tuning changed.

## Change

- Replaced the remaining tactical-map `as any` bridge casts with local MapLibre, PMTiles, and deck.gl types.
- Typed `safeEnsureSource(...)` / `safeEnsureLayer(...)` through MapLibre source/layer specifications.
- Registered PMTiles through `AddProtocolAction` and called `Protocol.tilev4(...)` directly.
- Typed deck click picking through `PickingInfo<{ properties?: Record<string, unknown> }>` and narrowed `stack_count` before numeric comparison.
- Typed MapLibre filter expressions through `FilterSpecification`.
- Added a strict-null inventory regression guard pinning `src/ui/map/map/MapContainer.tsx` at zero `as_any_casts`.

## Inventory

`node tools\diagnostics\strict_null_inventory.cjs` current floor:

- `as_factionid_casts`: 2
- `as_unknown_casts`: 0
- `as_any_casts`: 135
- `non_null_assertions_dot`: 0
- `non_null_assertions_index`: 0
- `optional_fields_game_state`: 477

Remaining inventory-counted `as_any_casts` are confined to:

- `src/cli/phase3a_ab_harness.ts`
- `src/cli/phase3abc_audit_harness.ts`
- `src/cli/phaseD3_trace_missing_census_settlements.ts`
- `src/cli/sim_scenario.ts`
- `src/scenario/scenario_runner.ts`
- `src/state/save_migration.ts`
- `src/ui/map/data/GameStateAdapter.ts`

## Verification

- `npx.cmd vitest run tests\ui_map_deck_counter_visibility.test.ts tests\ui_map_no_sector_demarcation_overlay.test.ts --reporter=dot` passed 4/4.
- `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot` passed 84/84.
- `node tools\diagnostics\strict_null_inventory.cjs` passed and reports the floor above.

## Roadmap Delta

The tactical map shell no longer contributes any inventory-counted `as_any_casts`. Remaining strict-null work should avoid calibration-owned scenario/operation outcome tuning and proceed through the CLI harness, scenario-runner diagnostics, save-migration boundary, and GameStateAdapter/FactionId-unification lanes with focused guards.
