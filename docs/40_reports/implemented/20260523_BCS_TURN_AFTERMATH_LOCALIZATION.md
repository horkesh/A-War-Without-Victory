# BCS Turn Aftermath Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** `TurnAftermathModal` chrome plus generated Turn Aftermath prose

## Summary

Turn Aftermath now renders its modal chrome, metric labels/details, empty states, enum badges, footer actions, generated headlines, deterministic narrative lines, cost reasons, strategic-signal wrapper labels, and judgment prose through the English/BCS localization substrate.

This is presentation-only. It does not change turn-summary schema, saved state, scenario data, combat math, operation behavior, calibration/army-arc behavior, source-authored event text, settlement labels, formation names, or inbox item titles.

## Implementation

- Added `turnAftermath.*` message keys to the English/BCS dictionaries.
- Routed `TurnAftermathModal` static chrome and enum badges through `t(...)`.
- Routed `buildTurnAftermathView(...)` generated headlines, narrative lines, cost reasons, strategic-signal wrapper labels, and judgment prose through `t(...)`.
- Preserved source-authored content unchanged: event descriptions, formation names, settlement labels, inbox item titles, and raw significance/type fallbacks.

## Verification

- Red: `npx.cmd vitest run tests\ui\turn_aftermath.test.ts tests\ui\turn_aftermath_modal_i18n.test.ts --reporter=dot` failed while BCS mode still rendered `Net territorial gain: +2 OSIDs.` and `Turn Aftermath`.
- Green: `npx.cmd vitest run tests\ui\turn_aftermath.test.ts tests\ui\turn_aftermath_modal_i18n.test.ts --reporter=dot` passed 13/13.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts tests\ui\verdict_share_summary.test.ts tests\ui\verdict_scene.test.ts tests\ui\cinematic_verdict.test.ts tests\ui\war_cost_summary.test.ts tests\ui\codex_panel_dynamic_mount.test.ts tests\ui\chronicle_endgame_mount.test.ts tests\wrapped_slides.test.ts tests\chronicle_entries.test.ts tests\ui\turn_aftermath.test.ts tests\ui\turn_aftermath_modal_i18n.test.ts --reporter=dot` passed 120/120.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Localization still needs prose-heavy slices for campaign-pulse/campaign-cost archive prose, broad Army HQ/Decision Room/event prose, authored Codex essay prose/content review, Cost Ledger finding prose, and native-speaker terminology review.
