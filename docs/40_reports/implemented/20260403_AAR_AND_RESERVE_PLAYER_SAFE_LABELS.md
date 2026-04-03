# 2026-04-03 - AAR and reserve player-safe labels

## Summary

- `AARPanel` now uses player-safe military labels, canonical OSID display names, and brigade display names instead of hard-coded faction shorthand, `humanizeOsid(...)`, or raw brigade ids.
- `ArmyReservePanel` now resolves reserve base locations through the canonical OSID display-name map instead of rough OSID humanization.

## Files changed

- `src/ui/map/components/AARPanel.tsx`
- `src/ui/map/components/ArmyReservePanel.tsx`
- `tests/ui_player_visibility.test.ts`

## Why

- After-action reporting is one of the highest-trust player surfaces in the game. If it leaks raw brigade ids or rough geography labels, the product still reads like an internal debug tool.
- Reserve management is a narrower shell, but it still should not regress into raw engine-ish geography when showing base locations.

## Verification

- `node .\\node_modules\\vitest\\vitest.mjs run tests\\ui_player_visibility.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
