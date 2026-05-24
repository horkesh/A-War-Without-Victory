# BCS Verdict Chrome Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** Rich `VerdictScreen` mobile lower-section tabs and footer chrome

## Summary

The rich `VerdictScreen` now localizes its shell chrome for BCS mode: mobile lower-section tabs and footer tagline/actions render through the existing English/BCS dictionaries.

This is presentation-only. It does not change verdict generation, score math, Cost Ledger data, replay state, saved state, scenario data, calibration/army-arc behavior, or simulation outputs.

## Implementation

- Added `verdict.lowerSection.*` keys for Report, Reckoning, Codex, and Replay.
- Added `verdict.footer.tagline`.
- Reused the existing localized Game Over action keys for View Your War, New Game, and Load Save.
- Subscribed the rich `VerdictScreen` path to the existing locale store.
- Left faction IDs, faction tab labels, outcome classes, report body, War Cost body, and authored verdict prose for follow-up slices.

## Verification

- Red: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` failed while BCS mode still rendered rich VerdictScreen chrome in English.
- Green: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` passed 19/19.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts --reporter=dot` passed 39/39.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

The rich verdict report body remains English-only. Remaining endgame localization should continue as bounded slices: cinematic verdict copy, FactionReport labels, WarCostSummary labels, milestone rows, share summary copy, and authored prose.
