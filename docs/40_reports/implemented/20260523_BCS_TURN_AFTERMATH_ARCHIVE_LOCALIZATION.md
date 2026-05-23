# BCS Turn Aftermath Archive Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** Turn Aftermath campaign pulse/cost archive prose and Army HQ Records panel chrome

## Summary

Turn Aftermath archive views now render campaign-pulse prose, campaign-cost prose, top cost-driver labels, archive empty states, review filters, metric labels/details, momentum/cost badges, and Records-panel section chrome through the English/BCS localization substrate.

This is presentation-only. It does not change turn-summary schema, saved state, scenario data, combat math, operation behavior, campaign-cost classification, momentum classification, calibration/army-arc behavior, source-authored event text, settlement labels, formation names, or inbox item titles.

## Implementation

- Added `turnAftermath.records.*`, `turnAftermath.campaign.*`, `turnAftermath.campaignCost.*`, and `turnAftermath.momentum.*` message keys to the English/BCS dictionaries.
- Routed `buildTurnAftermathCampaignPulse(...)` and `buildTurnAftermathCampaignCost(...)` generated prose and top-driver labels through `t(...)`.
- Routed `TurnAftermathRecordsPanel` filters, archive chrome, metric labels/details, badges, and empty states through `t(...)`.
- Preserved source-authored content unchanged: event descriptions, formation names, settlement labels, inbox item titles, and generated record ordering/classification.

## Verification

- Red: `npx.cmd vitest run tests\ui\turn_aftermath.test.ts tests\ui\turn_aftermath_records_panel_i18n.test.ts --reporter=dot` failed while BCS mode still rendered `Archive window is quiet...` and English Records-panel filters/chrome.
- Green: `npx.cmd vitest run tests\ui\turn_aftermath.test.ts tests\ui\turn_aftermath_records_panel_i18n.test.ts --reporter=dot` passed 14/14.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts tests\ui\verdict_share_summary.test.ts tests\ui\verdict_scene.test.ts tests\ui\cinematic_verdict.test.ts tests\ui\war_cost_summary.test.ts tests\ui\codex_panel_dynamic_mount.test.ts tests\ui\chronicle_endgame_mount.test.ts tests\wrapped_slides.test.ts tests\chronicle_entries.test.ts tests\ui\turn_aftermath.test.ts tests\ui\turn_aftermath_modal_i18n.test.ts tests\ui\turn_aftermath_records_panel_i18n.test.ts --reporter=dot` passed 122/122.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Localization still needs War Summary campaign-cost chrome, broad Army HQ/Decision Room/event prose, authored Codex essay prose/content review, Cost Ledger finding prose, and native-speaker terminology review.
