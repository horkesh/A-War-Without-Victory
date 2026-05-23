# BCS War Summary Campaign Cost Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** Army HQ War Summary title, section tabs, campaign-cost chrome, and campaign-drag chrome

## Summary

War Summary now routes its title, empty loaded-state message, subsection tabs, Campaign Cost labels, localized cost severity value, and Campaign Drag labels/detail copy through the English/BCS localization substrate.

This is presentation-only. It does not change summary model math, turn-summary schema, saved state, scenario data, combat math, operation behavior, campaign-cost classification, war-exhaustion behavior, calibration/army-arc behavior, source-authored event text, settlement labels, formation names, or generated artifacts.

## Implementation

- Added `warSummary.*` English/BCS message keys for the War Summary shell, tabs, campaign-cost section, and campaign-drag section.
- Routed `WarSummaryContent` campaign-cost and campaign-drag chrome through `t(...)`.
- Reused the existing localized `turnAftermath.severity.*` enum labels for the War Summary campaign-cost severity value.
- Preserved source-authored and model-derived content unchanged.

## Verification

- Red: `npx.cmd vitest run tests\ui\war_summary_campaign_cost_i18n.test.ts --reporter=dot` failed while BCS mode still rendered `Campaign Cost`, `Severity`, `Friendly casualties`, `Displaced`, and `Net OSIDs`.
- Green: `npx.cmd vitest run tests\ui\war_summary_campaign_cost_i18n.test.ts --reporter=dot` passed 1/1.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts tests\ui\verdict_share_summary.test.ts tests\ui\verdict_scene.test.ts tests\ui\cinematic_verdict.test.ts tests\ui\war_cost_summary.test.ts tests\ui\codex_panel_dynamic_mount.test.ts tests\ui\chronicle_endgame_mount.test.ts tests\wrapped_slides.test.ts tests\chronicle_entries.test.ts tests\ui\turn_aftermath.test.ts tests\ui\turn_aftermath_modal_i18n.test.ts tests\ui\turn_aftermath_records_panel_i18n.test.ts tests\ui\war_summary_campaign_cost_i18n.test.ts --reporter=dot` passed 123/123.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Localization still needs broader Army HQ/Decision Room/map-overlay prose, authored Codex essay prose/content review, Cost Ledger finding prose, event prose, launch copy, and native-speaker terminology review.
