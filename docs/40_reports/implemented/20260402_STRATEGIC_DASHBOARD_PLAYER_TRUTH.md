# 2026-04-02 Strategic Dashboard Player Truth

## Summary

Aligned the strategic dashboard with the player-truth contract already enforced in the bottom status strip.

## What changed

- `src/ui/map/components/StrategicDashboard.tsx`
  - in player mode, current territory now shows exact friendly control plus aggregated `Hostile-held` share instead of exact all-faction percentages
  - territory trend chart now shows the player side's line rather than a live all-faction stacked scoreboard
  - casualty and supply cards now show own-side exact values instead of cross-faction exact tables
  - fallback all-faction tables remain available only for non-player/debug contexts
- `tests/ui_player_visibility.test.ts`
  - added a source-level guard asserting the strategic dashboard stays player-safe

## Why this matters

Fixing the bottom strip while leaving the dashboard it opens as an omniscient all-faction scoreboard would leave the shell lying one click later. Player-facing truth has to be consistent across the whole interaction path.

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
