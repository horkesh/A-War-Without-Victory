# 2026-04-02 - Player-safe fallback helper canonicalization

## Summary

Continued the player-truth drain by removing duplicated fallback-label logic from the Warroom and standalone viewer surfaces. The repo already had a shared player-safe text utility layer, but several shells were still inventing their own last-resort names for officers, settlements, and municipalities. This slice makes those surfaces consume the same canonical helper functions instead of carrying divergent local rules.

## Implemented

- `src/ui/map/utils/playerSafeText.ts`
  - added `getPlayerSafeOfficerName(...)`
  - added `getPlayerSafeSettlementName(...)`
- `src/ui/map/data/GameStateAdapter.ts`
  - pending officer events now use the shared officer fallback helper
- `src/ui/warroom/components/NewspaperModal.ts`
  - officer fallback names now use the shared helper
- `src/ui/warroom/components/SettlementInfoPanel.ts`
  - removed local settlement fallback helper in favor of the shared one
- `src/ui/warroom/components/WarPlanningMap.ts`
  - removed local settlement fallback helper in favor of the shared one
- `src/ui/warroom/map_viewer_app.ts`
  - removed local identifier-humanizing and settlement/municipality fallback helpers
  - now consumes the shared player-safe settlement and municipality helpers

## Why this matters

- player-facing truth is still fragile if each shell invents its own fallback copy
- duplicated helpers tend to drift quietly and reintroduce raw-id leaks after later edits
- strategy-game UI quality depends on consistent degradation rules; when labels are missing, the product should fail gracefully in one voice rather than six slightly different voices

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_map_render_smoke.test.ts`
  - PASS (`26` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Architectural lesson

Player-safe naming is not a cosmetic helper; it is part of the product boundary between engine truth and player truth. Once a shared helper exists, the disciplined move is to route every shell through it and delete the local “close enough” versions before they become a second naming policy.
