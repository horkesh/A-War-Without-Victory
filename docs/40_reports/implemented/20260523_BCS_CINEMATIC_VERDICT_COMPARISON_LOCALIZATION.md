# BCS Cinematic Verdict Comparison Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** `CinematicVerdict` comparison callouts and verdict share-summary comparison line

## Summary

`CinematicVerdict` now localizes known generated historical comparison callouts in both the visible cinematic verdict band and the plain-text share-summary preview.

This is presentation-only. It does not change `compareToHistorical(...)`, divergence-note generation, Cost Ledger data, verdict scoring, scenario data, save schema, calibration/army-arc behavior, operation outcomes, or simulation outputs.

## Implementation

- Moved `formatHistoricalDivergenceNote(...)` into `src/ui/map/data/historicalDivergenceNotes.ts` so component and data summary paths share the same localized generated-note formatter.
- Kept `WarCostSummary` exporting the helper for existing callers/tests while importing it from the shared data utility.
- Rendered `CinematicVerdict` comparison callouts through the shared formatter.
- Rendered `buildVerdictShareSummary(...)` comparison callouts through the shared formatter.
- Preserved unknown authored divergence notes as raw fallback.

## Verification

- Red: `npx.cmd vitest run tests\ui\cinematic_verdict.test.ts --reporter=dot` failed while BCS mode still rendered `War lasted 12 weeks shorter than the historical 188 weeks` in the cinematic comparison/share-summary path.
- Green: `npx.cmd vitest run tests\ui\cinematic_verdict.test.ts --reporter=dot` passed 2/2.
- Focused pack: `npx.cmd vitest run tests\ui\cinematic_verdict.test.ts tests\ui\verdict_share_summary.test.ts tests\ui\war_cost_summary.test.ts --reporter=dot` passed 18/18.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts tests\ui\verdict_share_summary.test.ts tests\ui\verdict_scene.test.ts tests\ui\cinematic_verdict.test.ts tests\ui\war_cost_summary.test.ts --reporter=dot` passed 60/60.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Localization still needs prose-heavy slices for Cost Ledger finding prose, authored verdict prose, Chronicle/Army HQ/Decision Room/event prose, and native-speaker terminology review.
