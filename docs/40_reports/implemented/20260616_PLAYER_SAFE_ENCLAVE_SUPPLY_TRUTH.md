# Player-Safe Enclave and Supply Truth

**Date:** 2026-06-16  
**Type:** UI/read-model/map hardening  
**Scope:** player-facing tactical map, supply summary, enclave dashboard, and focused regression tests

## Summary

The player-facing UI now scopes enclave resilience and per-faction supply summaries to the loaded player faction when a campaign player is set. The tactical map enclave overlay also receives the player faction and only draws player-owned enclave polygons/labels in a player campaign. The Enclave Dashboard filters defensively against the same rule, and the Supply map legend now describes the visible friendly supply classes instead of stale global surplus thresholds.

Null-player tooling/spectator adapter output remains diagnostic: if no `player_faction` is loaded, supply summaries may still expose all faction rows. Real player campaigns are the scoped contract.

## Files

- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/map/builders/buildEnclaveGeoJSON.ts`
- `src/ui/map/map/MapContainer.tsx`
- `src/ui/map/components/EnclaveDashboard.tsx`
- `src/ui/map/components/MapModeLegend.tsx`
- `tests/ui_map_game_state_adapter.test.ts`
- `tests/ui_map_enclave_visibility.test.ts`
- `tests/supply_panel_contract.test.ts`
- `tests/ui/supply_legend_overlap_contract.test.ts`

## Verification

- Red proof first: focused suite failed on unscoped `zepce`, unscoped RS supply summary, unscoped enclave polygons, and stale supply legend thresholds.
- Green proof: `npx.cmd vitest run tests\ui_map_game_state_adapter.test.ts tests\supply_panel_contract.test.ts tests\ui\supply_legend_overlap_contract.test.ts tests\ui_map_enclave_visibility.test.ts --pool=forks --reporter=dot` -> 4 files / 35 tests passed.
- TypeScript: `npm.cmd run typecheck` passed.
- Player-journey gate: `npm.cmd run qa:player-journeys` -> 11 files / 102 tests passed.
- CI repair guard: `npx.cmd vitest run tests\docs_desktop_v09_truth.test.ts --pool=forks --reporter=dot` -> 1 file / 6 tests passed.
- Live browser smoke: `http://127.0.0.1:4183/` RS start showed the war-start overlay, then the RS opening brief, with `KNOWN FRIENDLY SUPPLY` showing Adequate / Strained / Critical / Unknown-not-visible and no stale `Surplus` / `Supply Status` legend text; no console/page errors were observed.

## Calibration

No simulation logic, scenario data, save schema, baseline manifest, golden artifacts, or packaging outputs changed. This is a UI/read-model/map presentation hardening slice.
