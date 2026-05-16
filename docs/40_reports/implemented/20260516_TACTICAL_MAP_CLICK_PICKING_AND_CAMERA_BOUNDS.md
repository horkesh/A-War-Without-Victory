# Tactical Map Click Picking And Camera Bounds

Date: 2026-05-16

## Summary

This lane fixes the immediate tactical-map interaction problems reported during live Electron/browser inspection:

- Brigade/counter clicks now resolve through a deterministic screen-space fallback before OSID or sector hitboxes can claim the click.
- Direct map formation clicks clear stale sector/settlement context, so the rail opens the formation panel instead of stacking old panels.
- The tactical map camera is fixed at 30 degrees, rotation/pitch gestures are disabled, and panning is bounded to the Bosnia and Herzegovina operational extent.
- Left rail offsets now match the visible command sidebar, and MapLibre controls sit below the presidential toolbar/floating crest.

No gameplay rule, scenario data, OOB, combat math, political controller write, sensitive-history rule, save schema, serialization format, or scenario output changed.

## Changes Made

### Click Picking

- Added `pickNearestFormationAtPoint(...)` in `src/ui/map/map/clickSelectionPriority.ts`.
- The fallback projects formation point features into screen space and applies the same zoom-sensitive counter footprint used by the Deck.gl formation icons.
- Ties are resolved by strict string id order, keeping click behavior stable.
- `useMapInteractions(...)` now checks the formation fallback before generic OSID/sector fallback and before layer-specific front/sector hitbox handlers.
- Deck.gl map clicks also use the fallback when Deck.gl misses the visible counter object.

### Rail Context

- Added a direct formation-selection helper in `MapContainer.tsx` that clears stale `selectedOsid`, `selectedCorpsFrontSectorId`, corps, army, operation, and ORBAT context.
- Result: a brigade click opens a single Formation rail panel instead of leaving an unrelated settlement or sector panel visible.

### Camera And Bounds

- Added fixed tactical-map camera constants:
  - Pitch: 30 degrees.
  - Bounds: `[15.7243, 42.55719]` to `[19.62278, 45.270542]`, derived from the operational settlement dataset extent.
- Set MapLibre `minPitch` and `maxPitch` to 30, disabled rotate/pitch gestures, and set `maxBounds` so the map cannot scroll outside the operational BiH extent.
- Battle fly-to and Home/End reset now preserve the same 30-degree pitch.

### Panel And Chrome Cleanup

- Updated `panelRail.ts` left offsets to match the actual 15.5rem OOB sidebar plus a 0.5rem gap.
- Offset MapLibre top-right controls below `--awwv-toolbar-clearance` so they no longer sit under the presidential toolbar and floating crest.

## Verification

- `npx.cmd vitest run tests\deck_click_selection_priority.test.ts tests\ui_map_interactions.test.ts tests\ui_map_panel_rail.test.ts tests\ui_map_camera_constraints.test.ts` passed 32/32.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- Browser inspection on `http://127.0.0.1:3002/tactical_map.html` confirmed:
  - Clicking a visible brigade opens one `FORMATION` panel.
  - Underlying OSID/sector panels do not steal the click.
  - Stale settlement/sector rail context clears.
  - MapLibre controls are below the toolbar/floating crest area.
  - The tactical map uses the 30-degree pitched view.

## Files Changed

| Area | Files |
| --- | --- |
| Click picking | `src/ui/map/map/clickSelectionPriority.ts`, `src/ui/map/map/useMapInteractions.ts`, `src/ui/map/map/MapContainer.tsx` |
| Camera/chrome | `src/ui/map/map/MapContainer.tsx`, `src/ui/map/styles/globals.css`, `src/ui/map/components/panelRail.ts` |
| Tests | `tests/deck_click_selection_priority.test.ts`, `tests/ui_map_interactions.test.ts`, `tests/ui_map_panel_rail.test.ts`, `tests/ui_map_camera_constraints.test.ts` |
| Docs | `docs/PROJECT_LEDGER.md`, `docs/PROJECT_LEDGER_KNOWLEDGE.md`, `docs/40_reports/GUI_MASTER.md`, `docs/40_reports/README.md`, `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` |

## Follow-Up

- Continue the broader HQ/tactical UI audit around panel density, covered controls, and disabled-action explanations.
- If internal sector topology ever returns as an overlay, it should be an explicit diagnostic/player-inspection affordance with a legend, not default map chrome.
