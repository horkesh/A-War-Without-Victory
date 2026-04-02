# 2026-04-02 Player-Safe Rail Panel Labels

## Summary

Aligned the tactical rail detail panels with the same player-safe faction-language rules already applied to OOB, operation briefing, attack confirmation, and event shells.

## What changed

- `src/ui/map/components/OperationDetail.tsx`
  - operation identity rail now uses `getPlayerSafeMilitaryFactionName(op.faction)`
- `src/ui/map/components/CorpsDetail.tsx`
  - overview header now uses player-safe military faction naming for the corps faction line
- `src/ui/map/components/CorpsFrontPanel.tsx`
  - sector dossier header now uses player-safe military faction naming for the faction field
- `tests/ui_opord_player_safe_labels.test.ts`
  - extended source guards to cover the rail detail panels

## Why this matters

The rail panels are part of the mounted tactical shell, not internal debugging surfaces. Leaving raw faction ids there would keep the shell internally inconsistent even after the surrounding modals and summaries were cleaned up.

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_opord_player_safe_labels.test.ts tests\warroom_player_visibility.test.ts tests\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
