# BCS War Summary Overview Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** Army HQ War Summary overview section labels and staff-assessment prose

## Summary

War Summary overview cards now route territory, military-strength, displacement, SITREP, civilian-impact, and full-faction overview labels through the English/BCS localization substrate. The player-safe staff-assessment prose for enemy control and enemy displacement is localized as deterministic UI copy.

This is presentation-only. It does not change summary model math, player-safe disclosure policy, turn-summary schema, saved state, scenario data, combat math, operation behavior, campaign-cost classification, SITREP derivation, war-exhaustion behavior, calibration/army-arc behavior, source-authored event text, settlement labels, formation names, or generated artifacts.

## Implementation

- Added `warSummary.overview.*` English/BCS message keys for overview section titles, row labels, table labels, staff-assessment detail copy, SITREP count formatters, and civilian-impact labels.
- Routed `WarSummaryContent` overview card titles and row/prose labels through `t(...)`.
- Preserved source-authored SITREP headline/alert text unchanged.

## Verification

- Red: `npx.cmd vitest run tests\ui\war_summary_campaign_cost_i18n.test.ts --reporter=dot` failed while BCS mode still rendered `Territory`, `Friendly control`, and English staff-assessment prose.
- Green: `npx.cmd vitest run tests\ui\war_summary_campaign_cost_i18n.test.ts --reporter=dot` passed 1/1.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts tests\ui\verdict_share_summary.test.ts tests\ui\verdict_scene.test.ts tests\ui\cinematic_verdict.test.ts tests\ui\war_cost_summary.test.ts tests\ui\codex_panel_dynamic_mount.test.ts tests\ui\chronicle_endgame_mount.test.ts tests\wrapped_slides.test.ts tests\chronicle_entries.test.ts tests\ui\turn_aftermath.test.ts tests\ui\turn_aftermath_modal_i18n.test.ts tests\ui\turn_aftermath_records_panel_i18n.test.ts tests\ui\war_summary_campaign_cost_i18n.test.ts --reporter=dot` passed 123/123.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Localization still needs broader Army HQ/Decision Room/map-overlay prose, authored Codex essay prose/content review, Cost Ledger finding prose, event prose, launch copy, and native-speaker terminology review.
