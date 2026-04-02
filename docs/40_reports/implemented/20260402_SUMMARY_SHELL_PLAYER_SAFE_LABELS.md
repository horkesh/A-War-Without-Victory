# 2026-04-02 Summary Shell Player-Safe Labels

## Summary

Normalized high-frequency summary shells so they stop speaking in raw faction ids or depending on a ghost `playerFaction` binding.

## What changed

- `src/ui/map/components/SituationTab.tsx`
  - territory and casualties rows now use player-safe military faction names instead of raw faction ids
  - alliance gauge copy now uses player-facing wording (`Bosniak-Croat`) instead of raw ids
  - support summary copy now avoids surfacing raw faction-id shorthand in player mode
- `src/ui/map/components/army_hq/WarSummaryContent.tsx`
  - now reads `playerFaction` from the canonical `buildWarSummaryOverviewModel(...)` output instead of relying on an undefined free variable
  - player-facing header uses player-safe military faction names
- `tests/ui_player_visibility.test.ts`
  - added source guards covering both summary shells

## Why this matters

Summary screens are where a strategy game quietly becomes a staff omniscience dashboard. These shells are high-frequency player surfaces, so they need the same player-language and authority discipline as modals, rails, and the bottom strip.

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
