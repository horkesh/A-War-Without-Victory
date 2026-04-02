# 2026-04-02 Bottom Status Strip Player Truth

## Summary

Stopped the bottom tactical status strip from presenting exact all-faction territory shares as if it were a neutral debug scoreboard.

## What changed

- `src/ui/map/components/BottomStatusStrip.tsx`
  - territory bar now shows `Friendly` exact control and aggregated `Hostile-held` share instead of exact faction-wide percentages for all sides
  - removed the old all-faction `orderedFactions` territory label loop from the live strip
  - kept player-side trend signaling on the friendly share only
- `tests/ui_player_visibility.test.ts`
  - added a source-level guard asserting the strip stays player-safe and does not regress into an all-faction territory scoreboard

## Why this matters

The bottom status strip is a high-frequency player surface. Showing exact all-faction territory percentages there makes the shell omniscient even if the rest of the UI tries to respect player knowledge. The strategic dashboard can still own richer analysis; the live strip should stay player-safe.

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\ui_opord_player_safe_labels.test.ts tests\warroom_player_visibility.test.ts tests\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
