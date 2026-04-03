# 2026-04-03 - Tactical top-shell density and label cleanup

## Summary

- Reduced tactical-shell top clearance from `6.5rem / 7.5rem` to `5.5rem / 6.5rem` (normal/dev) so side rails and detail panels reclaim vertical space.
- Shrunk the floating army crest and reduced its reserved center spacer so the toolbar stops taxing the whole tactical shell.
- Removed remaining rough geography fallback paths in Army HQ operations review, Chronicle entry generation, and ops-planning hover tooltips.
- Ops-planning hover now humanizes controller labels through player-safe political faction naming.

## Files changed

- `src/ui/map/App.tsx`
- `src/ui/map/components/panelRail.ts`
- `src/ui/map/components/OOBSidebar.tsx`
- `src/ui/map/components/PresidentialToolbar.tsx`
- `src/ui/map/components/army_hq/OperationsSection.tsx`
- `src/ui/map/components/chronicle/generateChronicleEntries.ts`
- `src/ui/map/components/ops_modal/OpsMap.tsx`
- `tests/ui_shell_navigation.test.ts`
- `tests/ui_player_visibility.test.ts`

## Why

- The tactical shell was paying a permanent vertical penalty for a floating crest that behaved like decorative chrome rather than part of the toolbar budget.
- Small fallback paths like `humanizeOsid(...)` in Chronicle or ops-planning hover still create “internal tool” moments even after the main shells are cleaned.

## Verification

- `node .\\node_modules\\vitest\\vitest.mjs run tests\\ui_shell_navigation.test.ts tests\\ui_player_visibility.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
