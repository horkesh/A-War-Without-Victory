# 2026-04-02 - Player-safe view-model hardening

## Summary

Tightened a few more loaded-state fallbacks so the view model itself stops carrying raw ids into live panels. This slice covers formation names, officer names, fired-event titles, and corps-detail fallback naming.

## Implemented

- `src/ui/map/data/GameStateAdapter.ts`
  - formation view names now humanize id fallbacks
  - named officer view names now fall back to `An officer`
  - fired-event titles now route through the player-safe decision-title helper
- `src/ui/map/components/CorpsDetail.tsx`
  - corps fallback naming now uses the shared corps helper instead of local string surgery

## Why this matters

- once the view model carries raw ids, every downstream panel has to be perfect not to leak them
- view-model hardening is cheaper than shell-by-shell cleanup because it fixes multiple consumers at once
- shared helpers are only truly authoritative once old local fallback logic is removed

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_map_render_smoke.test.ts`
  - PASS (`26` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS
