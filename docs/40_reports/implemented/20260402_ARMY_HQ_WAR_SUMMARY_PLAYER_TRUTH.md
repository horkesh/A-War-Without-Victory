# Army HQ War Summary Player-Truth Pass

Date: 2026-04-02  
Branch: `codex/engine-health-wave1`

## Why

Army HQ `WarSummaryContent` was still behaving like an omniscient staff dashboard:

- exact all-faction territory percentages
- exact all-faction personnel totals
- exact all-faction casualty totals
- exact per-faction displacement breakdowns

That is not a player-safe summary surface. It turns Army HQ into a debug scoreboard instead of a command shell.

## What changed

### 1. War Summary overview now respects player-facing truth

When `LoadedGameState.player_faction` is present and valid:

- `Territory` shows only friendly control exactly
- `Military Strength` shows only the player faction's exact personnel / KIA / WIA
- `Displacement` shows theater-wide total plus own-side displaced
- enemy faction-wide totals are no longer displayed in the overview

The UI now tells the truth about its own scope:

- enemy totals belong in staff assessments and front reports
- not in an exact all-faction summary grid

### 2. Overview-model logic was extracted into a pure helper

Added:

- `src/ui/map/components/army_hq/warSummaryOverview.ts`

This keeps the visibility contract testable without relying on JSX/runtime environment quirks.

### 3. Regression test added

Added:

- `tests/ui_army_hq_war_summary_visibility.test.ts`

This verifies that the overview model is keyed to the player faction and that own-side / theater-wide summary values are derived correctly.

## Files

- `src/ui/map/components/army_hq/WarSummaryContent.tsx`
- `src/ui/map/components/army_hq/warSummaryOverview.ts`
- `tests/ui_army_hq_war_summary_visibility.test.ts`
- `vitest.config.ts`

## Verification

Passed:

- `node_modules\.bin\vitest.cmd run tests\ui_army_hq_war_summary_visibility.test.ts tests\ui_shell_navigation.test.ts tests\warroom_player_visibility.test.ts tests\warroom_smoke.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Product consequence

Army HQ Summary is now closer to what a real strategy-game headquarters view should be:

- exact for own side
- abstract about the enemy
- useful without becoming omniscient

## Done means

- canonical owner: Army HQ Summary for player-facing high-level status
- demoted path: exact all-faction overview tables in normal player mode
- player-visible truth: own-side exact values, theater-wide aggregates, no enemy-wide debug scoreboard
- canonical UI surface: Army HQ `SUMMARY`
- proof: `ui_army_hq_war_summary_visibility.test.ts` + Warroom visibility tests + governance check
