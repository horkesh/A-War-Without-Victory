# 2026-04-02 Player-Safe Officer Event And Warroom Viewer Labels

## Summary

Continued the player-truth cleanup in `F:\AWWV_exec_clean` by fixing two less-obvious but still live seams:

- pending officer events coming out of `GameStateAdapter`
- the standalone Warroom map viewer shell in `src/ui/warroom/map_viewer_app.ts`

Both were still willing to degrade into raw engine identifiers when names were missing.

## What Changed

- `src/ui/map/data/GameStateAdapter.ts`
  - pending officer events now use neutral fallback text (`An officer`) instead of raw officer ids
  - pending officer event corps names now resolve through `getPlayerSafeCorpsName(...)` instead of falling back to raw corps ids
- `src/ui/warroom/map_viewer_app.ts`
  - settlement tooltip and settlement-panel fallback names now humanize settlement ids instead of printing raw `sid`
  - municipality fallback text now humanizes municipality ids instead of printing raw numeric / engine identifiers
- `tests/ui_player_visibility.test.ts`
  - added regression coverage proving `parseGameState(...)` produces player-safe officer-event labels when names are missing

## Why

These are exactly the kinds of leaks that survive after the obvious panels have been cleaned up:

- adapter-produced event text that quietly reintroduces raw ids into player-facing briefings
- older but still-live Warroom surfaces that nobody looks at until a user actually clicks through them

If those seams are left alone, the repo still behaves like a debug shell wearing a player shell on top.

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_map_render_smoke.test.ts`
  - PASS (`26` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Outcome

Player-facing staffing events and the standalone Warroom viewer now follow the same player-safe naming discipline as the rest of the cleaned shell, instead of leaking raw ids through old fallback paths.
