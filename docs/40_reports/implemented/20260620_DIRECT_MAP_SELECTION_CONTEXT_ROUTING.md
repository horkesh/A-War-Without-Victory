# Direct Map Selection Context Routing

## Summary
Direct tactical-map sector and formation clicks now preserve command context instead of opening orphaned sector or brigade panels.

## Changes
- Added `mapSelectionRouting.ts` to resolve map-click sector and formation targets into the existing `FieldInspectionTarget` contract.
- Routed direct sector/front clicks through `field-sector-in-corps` when corps context is known.
- Routed direct formation/counter/stack clicks through sector context first, then corps context, then settlement/bare formation fallback.
- Replaced direct `setSelectedFormationId(...)` / `setSelectedCorpsFrontSectorId(...)` map-click paths in `MapContainer.tsx` with `inspectOnField(...)`.

## Verification
- Focused proof passed: `npm.cmd exec -- vitest run tests/ui/map_click_routing_contract.test.ts tests/ui/oob_operations_panel.test.ts tests/ui/gamestore_field_inspection.test.ts tests/ui/panel_rail_ownership.test.ts tests/ui_map_panel_rail.test.ts tests/ui_map_selection_store.test.ts tests/deck_click_selection_priority.test.ts --pool=forks --reporter=dot` (37/37).
- Typecheck passed: `npm.cmd run typecheck`.
- Diff hygiene passed: `git diff --check`.
- Player-journey gate passed: `npm.cmd run qa:player-journeys` (234/234).
- Live browser sweep passed: `AWWV_LIVE_SURFACE_BROWSER_PORT=3245 npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`), and `.tmp_live_surface_browser_sweep` was removed afterward.

## Scope
UI/store routing/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
