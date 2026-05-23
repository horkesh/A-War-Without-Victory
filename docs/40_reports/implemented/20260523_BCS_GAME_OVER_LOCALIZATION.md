# BCS Game Over Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** `GameOverModal` terminal fallback surface, English/BCS dictionaries, focused UI tests

## Summary

The fallback Game Over modal now renders outcome labels, final-standings copy, faction stat lines, campaign-duration copy, and footer actions through the existing English/BCS localization substrate.

This is presentation-only. It does not change endgame scoring, game-over triggers, saved state, scenario data, calibration/army-arc behavior, or simulation outputs.

## Implementation

- Added `gameOver.*` message keys to the English and BCS dictionaries.
- Wired `GameOverModal` to `useLocale()` / `t(...)` so locale changes re-render the terminal modal.
- Localized canonical outcome labels and subtitles for known game outcomes.
- Localized final standings, OSID-control counts, active-brigade counts, campaign duration, New Game, and Load Save copy.
- Preserved canonical faction IDs and the `A War Without Victory` product title.
- Normalized the modal date separator to ASCII ` - ` while preserving the intended display.

## Verification

- Red: `npx.cmd vitest run tests\ui\game_over_i18n.test.ts --reporter=dot` failed while the modal still rendered English hard-coded copy and pluralized one-count metric labels.
- Green: `npx.cmd vitest run tests\ui\game_over_i18n.test.ts --reporter=dot` passed 2/2.
- Localization pack: `npx.cmd vitest run tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts --reporter=dot` passed 20/20.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

BCS localization remains a broad extraction/review lane. Major remaining surfaces include the richer VerdictScreen report, Chronicle, Army HQ, Decision Room, map overlays, event prose, launch copy, terminology review, and native-speaker validation.
