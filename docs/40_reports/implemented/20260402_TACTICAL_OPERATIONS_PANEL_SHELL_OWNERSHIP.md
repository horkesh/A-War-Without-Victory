# 2026-04-02 Tactical Operations Panel Shell Ownership

## Summary

Removed command-authority actions from the tactical `OperationsPanel` so the mounted map shell no longer competes with Army HQ for operation control.

## What changed

- Removed tactical-shell launch and halt action wiring from `src/ui/map/components/OperationsPanel.tsx`.
- Kept `HQ Review` and `Open Corps Orders` as the only handoff actions.
- Replaced raw faction-id display in the selected-operation header with `getPlayerSafeMilitaryFactionName(...)`.
- Added a regression guard in `tests/ui_shell_navigation.test.ts` to assert the panel remains map-facing and does not reintroduce `Launch Now`, `Halt + Dig In`, or desktop command staging calls.

## Why this matters

The panel already declared `Army HQ owns command review. This panel stays map-facing.` but still contained live command buttons and desktop staging calls. That made the tactical shell and Army HQ co-own operation control. Removing the dead split-owner path makes the shell contract honest and reduces future Claude drift.

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_shell_navigation.test.ts tests\warroom_player_visibility.test.ts tests\ui_opord_player_safe_labels.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
