# 2026-04-02 - Player-safe Warroom prose hardening

## Summary

Continued the player-facing truth cleanup in the old-but-still-live prose surfaces. Newspaper officer notes, Warroom officer extraction, and Chronicle entry generation were still falling back to raw ids when labels were missing. This slice routes those paths through the shared player-safe helpers instead.

## Implemented

- `src/ui/warroom/components/NewspaperModal.ts`
  - succession/casualty/departure prose now falls back to `An officer` instead of raw officer ids
- `src/ui/warroom/data/war_data_extractor.ts`
  - officer list extraction now uses the shared player-safe officer helper
- `src/ui/map/components/chronicle/generateChronicleEntries.ts`
  - formation spawn/destruction entries now humanize fallback formation ids
  - narrative event entries now humanize fallback event ids
  - military detail badges now use shared military faction labels

## Why this matters

- old prose surfaces are one of the easiest places for raw ids to survive unnoticed
- if Warroom and Chronicle outputs talk like tools, the product still feels like debug UI even after the main shell is cleaned up
- player-truth work has to cover generators and extractors, not just React components

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_map_render_smoke.test.ts`
  - PASS (`26` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Architectural lesson

Narrative/prose builders are authority surfaces. If they degrade to ids, they reintroduce debug language into the product even when the main UI chrome is otherwise disciplined.
