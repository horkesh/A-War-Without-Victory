# 2026-04-02 Player-Safe Faction Shell Labels

## Summary

Removed another cluster of raw faction-id leaks from live player-facing map shells.

## What changed

- `src/ui/map/components/OOBSidebar.tsx`
  - army-summary affordance now says `View <player-safe military faction> army summary`
  - army header button now uses `Army Name / Player-Safe Military Faction`
  - HQ reserve rail now reads `Reserve HQ / <name>` instead of mojibake/star residue
  - mobilization and operations accordion faction headings now use player-safe military faction names
  - operation cards now show `corps / player-safe military faction`
- `src/ui/map/components/OperationBriefingModal.tsx`
  - operation header now shows `corps / player-safe military faction` instead of raw faction id
- `tests/ui_opord_player_safe_labels.test.ts`
  - added source guards covering OOBSidebar and OperationBriefingModal player-safe faction labeling

## Why this matters

Raw faction ids in OOB, briefing, and summary shells make the product read like an internal tool instead of a command environment. This slice keeps the live shell speaking in human-facing faction language while leaving engine ids in engine-facing layers only.

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_opord_player_safe_labels.test.ts tests\warroom_player_visibility.test.ts tests\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
