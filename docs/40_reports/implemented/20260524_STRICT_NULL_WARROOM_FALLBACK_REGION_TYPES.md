# Strict-Null Warroom Fallback Region Types

Date: 2026-05-24

## Summary

The final production inventory-counted `as_unknown_casts` are removed. `WarroomShellLayer.tsx` now treats the three bundled fallback Warroom region JSON files as a typed `WarroomRegionManifest` boundary and normalizes JSON polygon arrays instead of casting each import through `unknown`.

This is a UI type-boundary cleanup only. It does not change Warroom hotspot routing, fallback-region content, scene art, tactical-map handoff behavior, save schema, scenario data, combat math, operation logic, event ordering, or calibration output.

## Changes

- Added a local `WarroomRegionManifest` interface for the imported JSON region shape.
- Routed the RBiH, RS, and HRHB fallback region JSON imports through `FALLBACK_REGION_MANIFESTS_BY_FACTION`.
- Normalized imported JSON `number[][]` polygon arrays into the `[number, number][]` tuple shape used by Warroom hotspot math.
- Kept `FALLBACK_REGIONS_BY_FACTION` as the existing runtime lookup shape for downstream Warroom code.
- Updated the strict-null progress test to pin top-level `as_unknown_casts` at zero.

## Current Inventory

`node tools\diagnostics\strict_null_inventory.cjs` now reports:

| Category | Count |
| --- | ---: |
| `as_factionid_casts` | 0 |
| `as_unknown_casts` | 0 |
| `as_any_casts` | 0 |
| `non_null_assertions_dot` | 0 |
| `non_null_assertions_index` | 0 |
| `optional_fields_game_state` | 486 |

The remaining strict-null work is the optional `GameState` contract/schema lane. It is not an escape-hatch cleanup lane.

## Verification

- `node tools\diagnostics\strict_null_inventory.cjs` passed with the counts above.
- `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts tests\warroom_shell_layer.test.ts --reporter=dot` passed 128/128.
