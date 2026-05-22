# GUI Audit MapLibre Dasharray Repair

**Date:** 2026-05-22  
**Type:** Tactical-map render correctness fix from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or operation logic changed.

## Why

The GUI visual audit found MapLibre render errors around data-driven `line-dasharray` use on the tactical map. Two surfaces were affected:

- `front-line-stripe` was mutated at runtime with a front-stability dash expression.
- `supply-reach-outline` was created with a `case` dash expression, so the supply-mode outline layer could fail to materialize.

MapLibre does not reliably support feature-data-driven `line-dasharray` in these paths, so the map needs constant dash arrays per layer.

## Change

- Removed the runtime `front-line-stripe` `line-dasharray` expression; the base style keeps the front stripe dash literal.
- Split supply-reach outlines into filtered layers:
  - `supply-reach-outline` for non-isolated supply polygons with a literal `[6, 3]` dash.
  - `supply-reach-isolated-outline` for isolated polygons with a literal `[1.5, 1.5]` dash.
- Added a static regression contract that rejects data-driven dasharray expressions on these MapLibre surfaces.

## Verification

- Red run `npx.cmd vitest run tests\ui_map_maplibre_dasharray_contract.test.ts --reporter=dot` failed on the runtime front-stripe dash expression and the supply outline `case` dash expression before the patch.
- `npx.cmd vitest run tests\ui_map_maplibre_dasharray_contract.test.ts --reporter=dot` passed 2/2 after the patch.
- `npx.cmd vitest run tests\ui_map_maplibre_dasharray_contract.test.ts tests\ui_map_supply_reach.test.ts tests\ui_map_front_stability.test.ts tests\ui_map_front_lines_phase_a.test.ts --reporter=dot` passed 9/9.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite warnings.

## Remaining GUI Audit Queue

This closes the MapLibre dasharray render-correctness slice from audit Batch A. The wider GUI audit queue remains active for peace/event modal hygiene, modal palette unification, stale-state resets, Warroom chrome scoping, no-op controls/onboarding spotlight/bridge feedback, and polish cleanup.
