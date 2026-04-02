# 2026-04-02 - Player-safe faction label canonicalization

## Summary

Continued the player-facing truth cleanup by centralizing political and military faction labels in the shared `playerSafeText` layer. Several peace/event surfaces were still carrying their own hardcoded faction maps and would fall back to raw faction ids if anything drifted. This slice makes those surfaces speak through one canonical label policy.

## Implemented

- `src/ui/map/utils/playerSafeText.ts`
  - added `getPlayerSafePoliticalFactionName(...)`
  - added `getPlayerSafeMilitaryFactionName(...)`
- `src/ui/map/components/PeaceStatusPanel.tsx`
  - replaced local faction maps with shared helpers
  - peace-event faction badges now render player-safe military labels
- `src/ui/map/components/PeacePlanModal.tsx`
  - bot-response faction labels now use the shared political helper
- `src/ui/map/components/DiplomacyOverview.tsx`
  - negotiation-capital faction labels now use the shared political helper
- `src/ui/map/App.tsx`
  - event-effect fallback text now uses shared military faction labels instead of raw ids
- `tests/ui_player_visibility.test.ts`
  - added regression coverage for the new faction-label helpers

## Why this matters

- player-safe naming should be one policy, not several hand-maintained dictionaries
- local faction-label maps eventually drift in spelling, tone, or fallback behavior
- event and peace surfaces are exactly where raw faction codes feel most like developer leakage rather than game language

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_map_render_smoke.test.ts`
  - PASS (`26` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Architectural lesson

Faction labels are part of the player-truth boundary. Once a repo has both military-facing and political-facing language, those labels need canonical helpers just as much as corps, officer, settlement, and municipality names do.
