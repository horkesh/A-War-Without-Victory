# 2026-04-02 Cross-Shell Alliance Vocabulary Cleanup

## Summary

Normalized alliance wording across peace shell and Warroom milestone surfaces so the live product stops mixing player-facing language with raw faction-id shorthand.

## What changed

- `src/ui/map/components/PeaceStatusPanel.tsx`
  - alliance gauge now says `Bosniak-Croat Alliance`
- `src/ui/warroom/components/DeclarationEventModal.ts`
  - ceasefire milestone subtitle now uses `Bosniak-Croat ceasefire`
- `src/ui/warroom/components/FactionOverviewPanel.ts`
  - relationship bar now uses `Bosniak-Croat relationship`
- tests
  - added source guards in `tests/ui_player_visibility.test.ts`
  - added source guards in `tests/warroom_player_visibility.test.ts`

## Why this matters

A strategy game that calls the same relationship three different things across peace shell, tactical shell, and Warroom still feels stitched together even if the underlying mechanics are right. Shared player vocabulary is part of shell authority.

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
