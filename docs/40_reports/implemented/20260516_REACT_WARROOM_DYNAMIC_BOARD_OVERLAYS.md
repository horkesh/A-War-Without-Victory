# React Warroom Dynamic Board Overlays

**Date:** 2026-05-16  
**Status:** Implemented  
**Scope:** Warroom React shell UI/render restoration only

## Summary

Restored the two authored Warroom dynamic board surfaces that disappeared during the React shell migration:

- The corkboard/desk-map surface now renders a paper BiH map from current operational control, with fill only for the player faction and live current front lines over it.
- The wall calendar/whiteboard surface now renders the current game date in blue marker styling.

The existing region JSON and hotspot geometry were already correct. The regression was that `WarroomShellLayer` consumed regions only as invisible buttons and ignored dynamic-render surfaces.

## Implementation

Changed `src/ui/map/components/warroom/WarroomShellLayer.tsx` to:

- Load the canonical operational settlement GeoJSON through the existing map data loader.
- Build control GeoJSON from `LoadedGameState.controlBySettlement`.
- Project polygons into the authored `desk_map` / `wall_cork_board` region using stable OSID/path ordering.
- Fill only polygons whose current controller matches the player faction.
- Build current front-line paths from `buildFrontLinesGeoJSON`.
- Render the projection as a paper SVG under the hotspot with `pointer-events: none`.
- Render the current date under `wall_calendar_area` / `wall_calendar`, preferring `metadata.date` and falling back through the same turn-label formatter used by the tactical shell.

The hotspot buttons remain mounted above both visual overlays, so clicking the board still follows the existing Warroom navigation contract.

## Determinism

This is UI-only. The projection is derived from fixed data plus the loaded read model. Path output is stable-sorted by OSID/path, no random values or timestamps are used, and no scenario state, save state, generated run artifact, OOB, or simulation output is changed.

## Verification

- `npx.cmd vitest run tests\warroom_shell_layer.test.ts tests\ui\warroom_shell_accessibility.test.ts tests\warroom_smoke.test.ts` passed 42/42.
- `npm.cmd run typecheck` passed.
- Browser inspection on `http://127.0.0.1:3002/index.html?view=warroom&dev=1` confirmed the corkboard SVG map rendered with 2,086 projected map/frontline paths and the blue marker board read `1 Apr 1992`.
- `npm.cmd run desktop:map:build` passed with existing Vite/browser-external/chunk warnings.
- `git diff --check` reported only CRLF normalization warnings.

## Files

- `src/ui/map/components/warroom/WarroomShellLayer.tsx`
- `tests/warroom_shell_layer.test.ts`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/40_reports/GUI_MASTER.md`
- `docs/40_reports/WARROOM_MASTER.md`
- `docs/40_reports/README.md`
- `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md`
