# BCS Verdict Scene Prose Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** Deterministic `buildVerdictScene(...)` headline/subheadline/default cost prose

## Summary

The deterministic verdict scene builder now localizes its tone headlines, tone subheadlines, missing Cost Ledger fallback, default war-cost-total title, and default war-cost-total sentence through the existing English/BCS localization substrate.

This is presentation-only. It does not change tone selection, focus-faction selection, Cost Ledger data, historical comparison math, share-summary ordering, verdict generation, scenario data, save schema, calibration/army-arc behavior, or simulation outputs.

## Implementation

- Added `verdict.scene.*` message keys to the English/BCS dictionaries.
- Routed `headlineForTone(...)`, `subheadlineForTone(...)`, and default cost-emphasis fallback/totals text through `t(...)`.
- Left Cost Ledger finding titles/text and historical divergence notes source-authored for separate content-review/localization slices.

## Verification

- Red: `npx.cmd vitest run tests\ui\cinematic_verdict.test.ts --reporter=dot` failed while BCS mode still rendered `Pyrrhic success, measured against the bill`.
- Green: `npx.cmd vitest run tests\ui\cinematic_verdict.test.ts tests\ui\verdict_scene.test.ts tests\ui\verdict_share_summary.test.ts --reporter=dot` passed 8/8.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts tests\ui\verdict_share_summary.test.ts tests\ui\verdict_scene.test.ts tests\ui\cinematic_verdict.test.ts --reporter=dot` passed 47/47.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite externalization/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Verdict localization still needs smaller slices for Cost Ledger finding prose, historical divergence-note prose, source-provided dimension/package/institution label mapping, milestone rows, authored verdict prose, and broader Chronicle/Army HQ/Decision Room/event prose.
