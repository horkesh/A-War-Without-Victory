# 2026-04-03 - Tactical operations surface consolidation

## Summary
- Removed the old rail-mounted `OperationDetail` surface so Tactical Map no longer owns operations in two different panel systems.
- Made `selectedOperationKey` open the canonical tactical `OperationsPanel` automatically instead of silently creating a second operation detail rail.
- Updated panel-rail expectations and player-safe UI tests to reflect that direct operation selection no longer mounts a rail panel.

## Files changed
- `src/ui/map/App.tsx`
- `src/ui/map/components/panelRail.ts`
- `src/ui/map/store/gameStore.ts`
- `tests/ui_map_panel_rail.test.ts`
- `tests/ui_opord_player_safe_labels.test.ts`
- deleted `src/ui/map/components/OperationDetail.tsx`

## Why
- Tactical Map still had two operation owners: the map-facing `OperationsPanel` and the older rail-based `OperationDetail`.
- That split let operation behavior drift across multiple tactical surfaces before Army HQ was even involved.
- A map shell should have one tactical ops surface and hand off deep review to Army HQ, not grow parallel detail rails.

## Verification
- `node .\\node_modules\\vitest\\vitest.mjs run tests\\ui_map_panel_rail.test.ts tests\\ui_opord_player_safe_labels.test.ts tests\\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
