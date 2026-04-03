# 2026-04-03 - War Summary shell ownership unification

## Summary
- Collapsed the duplicate War Summary owners so `army_hq/WarSummaryContent` is now the only deep summary owner.
- Turned `WarSummaryModal` into a thin tactical-shell wrapper around that canonical content instead of letting it maintain its own omniscient summary model.
- Added `focusSection` support to `WarSummaryContent` so both Army HQ and the tactical wrapper can open the same summary surface without recreating the logic.

## Files changed
- `src/ui/map/components/WarSummaryModal.tsx`
- `src/ui/map/components/army_hq/WarSummaryContent.tsx`

## Why
- The tactical shell still had a second War Summary implementation with different truth standards, including exact all-faction strategic totals that Army HQ had already replaced with player-safe asymmetry.
- As long as both lived independently, any future cleanup could fix one path and leave the other lying to the player.

## Verification
- `node .\\node_modules\\vitest\\vitest.mjs run tests\\ui_army_hq_war_summary_visibility.test.ts tests\\ui_player_visibility.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
