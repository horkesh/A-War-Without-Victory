# Strict-Null Phase D3 Trace CLI Tail

Date: 2026-05-22

## Scope

Type-only cleanup in `src/cli/phaseD3_trace_missing_census_settlements.ts`. No simulation behavior, save schema, scenario data, substrate regeneration, map data, painted-control target, combat math, operation delivery, or calibration/army-arc tuning changed.

## Change

- Added explicit optional `political.settlements` and `political.municipalities` JSON shapes for the Phase D3 audit inputs.
- Replaced broad JSON `as any` reads with typed optional chaining for index settlements, census municipalities, municipality names, municipality settlement ids, and master GeoJSON settlement-layer filtering.
- Added a strict-null inventory guard pinning the Phase D3 trace CLI at zero `as_any_casts`.

## Inventory

`node tools\diagnostics\strict_null_inventory.cjs` current floor after this slice:

- `as_factionid_casts`: 2
- `as_unknown_casts`: 0
- `as_any_casts`: 127
- `non_null_assertions_dot`: 0
- `non_null_assertions_index`: 0
- `optional_fields_game_state`: 477

## Verification

- `npx.cmd tsc --noEmit -p tsconfig.json --pretty false` passed.
- `node tools\diagnostics\strict_null_inventory.cjs` passed and reports the floor above.
- `npm.cmd run phaseD3:trace_missing_census_settlements` was attempted but exited with the existing required-input guard because `data/derived/settlements_substrate.geojson` is absent in this checkout.

## Roadmap Delta

The Phase D3 missing-census audit CLI no longer contributes inventory-counted `as_any_casts`. Remaining `as_any_casts` are concentrated in the Phase 3A/3ABC CLI harnesses, `sim_scenario.ts`, scenario-runner diagnostics, save migration, and `GameStateAdapter`.
