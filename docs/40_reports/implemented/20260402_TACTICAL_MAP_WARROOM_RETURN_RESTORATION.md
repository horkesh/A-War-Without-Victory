# 2026-04-02 - Tactical map Warroom return restoration

## Summary

The live tactical shell still had a `focusWarroom()` bridge, but the mounted `PresidentialToolbar` did not expose it. That meant standalone desktop tactical-map users could still lose the visible route back to Warroom even though the old legacy toolbar knew how to do it.

This slice restores the visible Warroom return path in the actual mounted toolbar and locks the behavior with a small navigation helper test.

## What changed

- added `warroomReturn.ts` helper utilities for shell detection
- taught `PresidentialToolbar` to show a visible `WARROOM` button when:
  - the tactical map is embedded, or
  - desktop IPC is available
- embedded mode posts `awwv-back-to-hq` to the parent shell
- standalone desktop mode calls `ipc.focusWarroom()`
- added regression coverage for the return-affordance contract

## Files changed

- `src/ui/map/utils/warroomReturn.ts`
- `src/ui/map/components/PresidentialToolbar.tsx`
- `tests/ui_shell_navigation.test.ts`

## Why this matters

- the live tactical shell now matches the product-shell contract
- the visible way back to Warroom no longer depends on dead legacy toolbar code
- the return path is explicit in both embedded and standalone desktop use

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_shell_navigation.test.ts tests\warroom_player_visibility.test.ts tests\warroom_smoke.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Follow-on

- continue checking Warroom, Codex, and Army HQ entrypoints so every major shell affordance is visible from the live product, not just technically wired in the bridge layer
