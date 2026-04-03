# 2026-04-03 - Front tooltip sector authority alignment

## Summary
- Removed the player-facing front-tooltip dependency on `assignableFrontSegments`.
- Front tooltip persistence and sector context now come from `corpsFrontSectors`, matching the canonical sector/frontline ownership model already used elsewhere in the live shell.
- Updated the tooltip regression to prove the player-safe front model no longer needs compatibility front-segment input.

## Files changed
- `src/ui/map/components/Tooltip.tsx`
- `src/ui/map/components/tooltipPlayerSafe.ts`
- `tests/ui_map_tooltip_player_visibility.test.ts`

## Why
- The tooltip was still able to reconstruct front persistence from compatibility front-segment data even after the rest of the shell had moved to sector truth.
- That kind of small compatibility read is exactly how old authority rails re-enter the player shell after bigger cleanups.

## Verification
- `node .\\node_modules\\vitest\\vitest.mjs run tests\\ui_map_tooltip_player_visibility.test.ts tests\\ui_player_visibility.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
