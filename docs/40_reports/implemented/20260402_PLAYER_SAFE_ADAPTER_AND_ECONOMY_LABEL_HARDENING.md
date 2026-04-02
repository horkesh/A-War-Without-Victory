# 2026-04-02 - Player-safe adapter and economy label hardening

## Summary

Hardened the player-facing data pipeline by removing several adapter-side `name ?? id` fallbacks and a set of economy-shell raw faction-code badges. This keeps human-readable labels in place even when upstream data is partial, instead of letting engine identifiers reach the product shell through “harmless” data plumbing.

## Implemented

- `src/ui/map/utils/playerSafeText.ts`
  - added `getPlayerSafeDisplayLabel(...)` for generic identifier humanization
- `src/ui/map/data/DataLoader.ts`
  - event definitions now humanize fallback titles instead of using raw event ids
- `src/ui/map/data/GameStateAdapter.ts`
  - production facility names now humanize id fallbacks
  - smuggling route names now humanize id fallbacks
  - movement log formation names now humanize id fallbacks
  - historical event text now humanizes id fallbacks
  - pending peace plan names now humanize id fallbacks
- `src/ui/map/components/EconomyPanel.tsx`
  - reserve, controller, route, and embargo faction badges now use player-safe faction labels instead of raw codes
- `tests/ui_player_visibility.test.ts`
  - extended regression coverage for generic player-safe display labels

## Why this matters

- adapter-side `name ?? id` fallbacks are one of the easiest ways for raw engine truth to leak back into a cleaned-up UI
- once the adapter outputs a raw id, every shell downstream has to be perfect to stop it from reaching players
- economy screens are particularly sensitive because brackets and badges make raw codes read like official product language

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_map_render_smoke.test.ts`
  - PASS (`26` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Architectural lesson

The adapter layer is not neutral plumbing. In a strategy game, it is one of the main places where the product decides whether to speak like a warroom or like a save-file inspector.
