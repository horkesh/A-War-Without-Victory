# BCS Verdict Fallback Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** `VerdictScreen` fallback game-over surface, English/BCS dictionaries, focused UI proof

## Summary

The `VerdictScreen` fallback path now renders its no-verdict Game Over surface through the existing English/BCS localization substrate.

This is presentation-only. It does not change verdict generation, endgame scoring, replay state, saved state, scenario data, calibration/army-arc behavior, or simulation outputs.

## Implementation

- Reused the existing `gameOver.*` outcome, standings, metric, duration, New Game, and Load Save keys.
- Added `gameOver.viewYourWar` for the fallback-specific "View Your War" action.
- Wired `FallbackGameOver` to `useLocale()` / `t(...)` so BCS mode re-renders the fallback title, final standings, faction metric rows, campaign duration, and footer actions.
- Preserved canonical faction IDs and the `A War Without Victory` product title.

## Verification

- Red: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` failed while BCS mode still rendered the fallback VerdictScreen in English.
- Green: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` passed 18/18.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts --reporter=dot` passed 38/38.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

The rich `VerdictScreen` report path remains English-only. That surface is larger and should be localized in smaller follow-up slices around footer actions, section tabs, score labels, War Cost copy, and authored verdict prose.
