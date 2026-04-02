# 2026-04-02 Economy And Logistics Player Truth

## Summary

Scoped the mounted economy and logistics shells to the player side in player mode instead of letting them act like all-faction reserve dashboards.

## What changed

- `src/ui/map/components/SupplyPanel.tsx`
  - in player mode, reserve bars now show only the player's military side instead of all factions
  - visible labels use player-safe military faction names
- `src/ui/map/components/EconomyPanel.tsx`
  - in player mode, production facilities, smuggling routes, and embargo rows now filter to the player's side
  - own-side reserve bars remain exact; hostile-side economic truth no longer appears as exact live shell data
  - empty-state copy now reflects friendly-only scope
- `tests/ui_player_visibility.test.ts`
  - added source guards covering both mounted shells

## Why this matters

Administrative panels are still player shells. If they expose exact all-faction reserves and logistics truth by default, the product still behaves like a debug console even when battlefield panels have been cleaned up.

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
