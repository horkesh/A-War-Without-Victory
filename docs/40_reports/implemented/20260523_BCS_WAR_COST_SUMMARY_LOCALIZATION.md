# BCS War Cost Summary Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** `WarCostSummary` static labels and formatter strings

## Summary

`WarCostSummary` now renders its static labels, section headings, opportunity metrics, exit-class labels, source prefix, duration/casualty/territory formatter strings, and attack-count copy through the existing English/BCS localization substrate.

This is presentation-only. It does not change Cost Ledger generation, historical comparison math, verdict generation, scenario data, save schema, calibration/army-arc behavior, or simulation outputs.

## Implementation

- Added `warCost.*` message keys to the English/BCS dictionaries.
- Subscribed `WarCostSummary` to the existing locale store.
- Routed static headings, metric labels, operation-opportunity labels, source prefix, and helper formatter strings through `t(...)`.
- Left authored finding titles/text, divergence notes, operation display names, response IDs, faction IDs, and source lists as source-provided content for follow-up localization/content-review slices.

## Verification

- Red: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` failed while BCS mode still rendered WarCostSummary labels in English.
- Green: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` passed 19/19.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts --reporter=dot` passed 39/39.
- WarCost helper pack: `npx.cmd vitest run tests\ui\war_cost_summary.test.ts tests\ui\endgame_presentation_proof.test.ts tests\ui\render_proof_real_fixtures.test.ts --reporter=dot` passed 55/55.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite externalization/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Verdict localization still needs smaller slices for cinematic verdict chrome/copy, source-provided dimension label mapping, milestone rows, share summary copy, Dayton detail labels, authored verdict prose, and broader Chronicle/Army HQ/Decision Room/event prose.
