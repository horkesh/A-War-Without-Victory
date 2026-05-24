# BCS Chief of Staff Stable Briefing Localization

**Date:** 2026-05-23
**Type:** Implemented UI read-model localization slice
**Scope:** Army HQ Chief of Staff stable/no-alert briefing greetings and prose

## Summary

The Chief of Staff briefing generator now routes its deterministic greeting bank and stable/no-alert paragraph through the English/BCS localization substrate. This covers the baseline Army HQ briefing prose shown when no critical or warning briefing items are present.

This is presentation-only. It does not change command-briefing item generation, alert severity, corps routing links, command-strain behavior, battle/territory summaries, letter-home generation, scenario data, save schema, calibration/army-arc behavior, or generated artifacts.

## Implementation

- Added `chiefOfStaff.greeting.*` and `chiefOfStaff.stable.*` English/BCS message keys.
- Routed the stable/no-alert branch of `generateCoSBriefing(...)` through `t(...)`.
- Preserved deterministic greeting selection by turn modulo phrase count.

## Verification

- Red: `npx.cmd vitest run tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` failed while BCS mode still emitted `Commander, ...` and `The situation is stable for now...`.
- Green: `npx.cmd vitest run tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` passed 1/1.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts tests\ui\verdict_share_summary.test.ts tests\ui\verdict_scene.test.ts tests\ui\cinematic_verdict.test.ts tests\ui\war_cost_summary.test.ts tests\ui\codex_panel_dynamic_mount.test.ts tests\ui\chronicle_endgame_mount.test.ts tests\wrapped_slides.test.ts tests\chronicle_entries.test.ts tests\ui\turn_aftermath.test.ts tests\ui\turn_aftermath_modal_i18n.test.ts tests\ui\turn_aftermath_records_panel_i18n.test.ts tests\ui\war_summary_campaign_cost_i18n.test.ts tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` passed 124/124.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Chief of Staff battle, territory, alert, exhaustion, command-strain, header, and letter-home prose remain follow-up localization/content-review slices.
