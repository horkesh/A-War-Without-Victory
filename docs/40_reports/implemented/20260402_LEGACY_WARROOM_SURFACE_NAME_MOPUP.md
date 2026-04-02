# 2026-04-02 Legacy Warroom Surface Name Mop-Up

## Summary

Finished a smaller residual player-truth cleanup pass in `F:\AWWV_exec_clean` across older Warroom-planning surfaces and the ops-modal map hover label. This slice exists to kill the kind of half-alive legacy fallbacks that survive after the main shell has already been cleaned up.

## What Changed

- `src/ui/warroom/components/SettlementInfoPanel.ts`
  - settlement title fallback no longer prints raw `sid`
  - municipality fallback no longer prints `Municipality <id>` directly from engine ids
- `src/ui/warroom/components/WarPlanningMap.ts`
  - wall-map search index now uses player-safe settlement fallback labels instead of raw `sid`
  - investment-panel municipality fallback now uses player-safe municipality naming
- `src/ui/map/components/ops_modal/OpsMap.tsx`
  - hovered settlement label now humanizes the OSID fallback instead of showing raw `op:` identifiers

## Why

These surfaces are older and less central than the main tactical shell, which makes them more dangerous, not less. They still look alive, they still reach users, and they are exactly where raw-id fallbacks tend to linger after the obvious leaks have been fixed elsewhere.

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_map_render_smoke.test.ts`
  - PASS (`25` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Outcome

The player-facing shell is now materially more consistent: even older planning/Warroom surfaces no longer degrade into obvious engine identifiers when names are missing.
