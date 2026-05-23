# BCS Verdict Dayton Labels Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** `VerdictScreen` FactionReport Dayton detail labels

## Summary

The rich `VerdictScreen` FactionReport Dayton details now render their section title, mobile toggle hint, package labels, institution label, final split label, and patron-override label through the existing English/BCS localization substrate.

This is presentation-only. It does not change Dayton negotiation results, final split data, institutional choices, patron override logic, verdict generation, scenario data, save schema, calibration/army-arc behavior, or simulation outputs.

## Implementation

- Added `verdict.dayton.*` message keys to the English/BCS dictionaries.
- Reused the localized `verdict.report.tapToToggle` mobile summary hint.
- Routed Dayton static labels through `t(...)` inside the existing locale-aware FactionReport.
- Left package IDs/names, institution keys/values, faction labels, and patron override identifiers as source-provided content for follow-up mapping/content-review slices.

## Verification

- Red: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` failed while BCS mode still rendered `Dayton Agreement` in English.
- Green: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` passed 19/19.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts --reporter=dot` passed 39/39.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite externalization/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Verdict localization still needs smaller slices for generated cinematic verdict prose, share-summary body, source-provided dimension/package/institution label mapping, milestone rows, authored verdict prose, and broader Chronicle/Army HQ/Decision Room/event prose.
