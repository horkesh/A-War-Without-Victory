# 2026-04-03 - Settlement, Army HQ, and tooltip player-safe boundary pass

## Summary

- `SettlementDetailContent` no longer owns shell routing directly; it now accepts explicit `onSectorClick` and `onOperationClick` callbacks from the selection shell.
- Settlement front-sector labels now use player-safe military faction names instead of raw faction ids like `RBiH` / `RS` / `HRHB`.
- Army HQ ORBAT, sector detail, and operation history geography now prefer canonical OSID display names over rough `formatOsidLabel(...)` / `humanizeOsid(...)` fallbacks.
- Battle tooltips now use player-safe settlement and faction labels.
- Warroom settlement control status now humanizes control-state vocabulary before render.

## Files changed

- `src/ui/map/components/SettlementDetailContent.tsx`
- `src/ui/map/components/SelectionPanel.tsx`
- `src/ui/map/components/army_hq/OrbatSection.tsx`
- `src/ui/map/components/army_hq/SectorsSection.tsx`
- `src/ui/map/components/OperationHistoryPanel.tsx`
- `src/ui/map/components/Tooltip.tsx`
- `src/ui/warroom/components/SettlementInfoPanel.ts`
- `tests/ui_player_visibility.test.ts`

## Why

- Shared render-boundary components are some of the easiest places for shell authority to drift. `SettlementDetailContent` had become both a renderer and a store-writer; that makes later shell cleanup harder and encourages hidden ownership.
- Army HQ ORBAT, sectors, and operation history are primary command-review surfaces. If they fall back to rough OSID formatting, the product still reads like internal tooling instead of a player-authored strategy game.
- Warroom settlement control copy should present human language, not raw simulation enum style.

## Verification

- `node .\\node_modules\\vitest\\vitest.mjs run tests\\ui_player_visibility.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`

## Notes

- Repo-wide `tsc --noEmit -p tsconfig.json` still fails on unrelated pre-existing test/schema mismatches outside this shell-boundary pass. Those failures were not introduced by this change.
