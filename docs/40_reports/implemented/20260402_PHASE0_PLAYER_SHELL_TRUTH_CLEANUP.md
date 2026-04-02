# 2026-04-02 - Phase 0 player-shell truth cleanup

## Summary

This pass tightened the remaining mounted Phase 0 shell surfaces so they stop leaking raw faction shorthand and exact hostile declaration telemetry into player-facing UI.

## Changes

- `src/ui/map/components/PeaceStatusPanel.tsx`
  - kept exact pre-war capital only for the player faction
  - changed non-player faction cards from exact declaration-pressure bars to abstract posture labels (`Quiet`, `Watch`, `Elevated`, `Critical`, `Declared`)
- `src/ui/warroom/components/FactionOverviewPanel.ts`
  - replaced the raw faction-id badge with player-facing military labels (`ARBiH`, `VRS`, `HVO`)
  - changed declaration-watch rows from exact hostile percentages to qualitative declaration-drive labels and banded bars
  - replaced raw warning text (`RS declaration imminent`, `HRHB declaration imminent`) with player-facing wording
- `src/ui/warroom/components/DeclarationEventModal.ts`
  - replaced `Army of RBiH` wording with `the Bosnian Army`

## Why this mattered

The previous shell was cleaner than before, but it still mixed player-facing framing with exact hostile declaration telemetry and raw faction shorthand. That is the kind of half-clean shell that makes the product feel like an internal tool with good CSS instead of a finished strategy game.

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Follow-up

- keep scanning mounted Warroom and Army HQ surfaces for exact hostile telemetry disguised as summary UI
- once the truth-and-shell wave is merge-ready, move into the planned UX density and spacing cleanup pass
