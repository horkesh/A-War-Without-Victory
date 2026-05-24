# BCS Verdict Share Summary Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** Verdict share-summary wrapper text and outcome-class labels

## Summary

The verdict share-summary builder now localizes its deterministic wrapper text in BCS mode: title line, outcome line labels, grade/score labels, war-ended line, Cost Ledger label, historical-comparison label, faction-outcomes label, missing-packet fallbacks, and outcome-class labels.

This is presentation-only. It does not change verdict scene selection, Cost Ledger data, historical comparison math, share-summary ordering, verdict generation, scenario data, save schema, calibration/army-arc behavior, or simulation outputs.

## Implementation

- Added `verdict.share.*` and `verdict.outcome.*` message keys to the English/BCS dictionaries.
- Routed `buildVerdictShareSummary(...)` deterministic wrapper lines through `t(...)`.
- Routed `formatVerdictOutcomeClass(...)` through localized outcome-class labels.
- Left Cost Ledger finding titles/text, historical divergence notes, outcome labels from source verdict packets, faction IDs, and source-provided prose unchanged for content-review/localization mapping slices.
- Marked the share-summary test file as jsdom because locale selection is browser-local UI state in this substrate.

## Verification

- Red: `npx.cmd vitest run tests\ui\verdict_share_summary.test.ts --reporter=dot` failed while BCS mode still rendered `A War Without Victory - Verdict`.
- Green: `npx.cmd vitest run tests\ui\verdict_share_summary.test.ts tests\ui\verdict_scene.test.ts tests\ui\cinematic_verdict.test.ts --reporter=dot` passed 7/7.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts tests\ui\verdict_share_summary.test.ts tests\ui\verdict_scene.test.ts tests\ui\cinematic_verdict.test.ts --reporter=dot` passed 46/46.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite externalization/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Verdict localization still needs smaller slices for Cost Ledger finding prose, historical divergence-note prose, source-provided dimension/package/institution label mapping, milestone rows, authored verdict prose, and broader Chronicle/Army HQ/Decision Room/event prose.
