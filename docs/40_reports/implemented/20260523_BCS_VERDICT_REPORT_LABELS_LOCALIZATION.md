# BCS Verdict Report Labels Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** Rich `VerdictScreen` FactionReport static labels

## Summary

The rich `VerdictScreen` FactionReport now localizes its static report labels in BCS mode: Pyrrhic Score, International Condemnation, Capital Dimensions, Final Statistics, mobile summary hints, and final-statistic row labels.

This is presentation-only. It does not change verdict generation, score math, Cost Ledger data, dimension labels authored by source verdict data, saved state, scenario data, calibration/army-arc behavior, or simulation outputs.

## Implementation

- Added `verdict.report.*` message keys to the English/BCS dictionaries.
- Routed FactionReport static headings and final-statistic row labels through `t(...)`.
- Subscribed FactionReport to the existing locale store.
- Left faction IDs, authored grade descriptions, source-provided dimension labels, Cost Ledger text, and cinematic verdict prose for follow-up slices.

## Verification

- Red: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` failed while BCS mode still rendered `Pyrrhic Score` and report labels in English.
- Green: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` passed 19/19.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts --reporter=dot` passed 39/39.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite externalization/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Verdict localization still needs smaller slices for cinematic verdict copy, source-provided dimension label mapping, WarCostSummary labels/body, milestone rows, share summary copy, Dayton detail labels, and authored verdict prose.
