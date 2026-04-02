# 2026-04-02 - Player language shell sweep

## Summary

This pass removed two remaining live-shell faction-language leaks that still used raw shorthand rather than player-facing political names:

- `src/ui/map/components/PeacePlanModal.tsx`
- `src/ui/warroom/components/SettlementInfoPanel.ts`

The goal was not to erase all military shorthand everywhere. It was to keep the player-facing diplomatic and settlement shells from sounding like backend enums.

## What changed

### Peace plan territorial split labels

`PeacePlanModal.tsx` previously labeled the proposed split bar and hover titles with raw faction shorthand:

- `RBiH`
- `RS`
- `HRHB`

This pass now routes those labels through `getPlayerSafePoliticalFactionName(...)` so the player sees:

- `Republic of Bosnia and Herzegovina`
- `Republika Srpska`
- `Croatian Republic of Herzeg-Bosnia`

This keeps the peace-plan shell consistent with the broader player-truth cleanup already underway.

### Warroom settlement control labels

`SettlementInfoPanel.ts` previously hardcoded:

- `RBiH (Green)`
- `RS (Crimson)`
- `HRHB (Blue)`

Those were replaced with player-facing political names using the same player-safe text helper layer. The color still communicates control at a glance; the label no longer reads like a dev/debug shorthand.

## Regression coverage

Added source-level regressions to ensure these shells do not drift back toward raw faction shorthand:

- `tests/ui_player_visibility.test.ts`
- `tests/warroom_player_visibility.test.ts`

The new assertions prove:

- `PeacePlanModal.tsx` uses `getPlayerSafePoliticalFactionName(...)`
- `SettlementInfoPanel.ts` uses `getPlayerSafePoliticalFactionName(...)`
- the old shorthand labels are gone from those two live shells

## Verification

- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_shell_navigation.test.ts tests\ui_map_render_smoke.test.ts`
- `npm.cmd run warroom:build`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Why this matters

This is a small pass, but it protects an important contract:

- player-facing diplomacy and settlement shells should sound like game product surfaces
- not like internal scenario/state identifiers

The repo is now slightly more honest at the language layer, which is exactly where trust erosion often starts in strategy UI.
