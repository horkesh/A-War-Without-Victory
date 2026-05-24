# BCS Chief of Staff Exhaustion Localization

**Date:** 2026-05-23
**Type:** Implemented UI read-model localization slice
**Scope:** Army HQ Chief of Staff war-exhaustion warning prose

## Summary

The Chief of Staff briefing generator now routes the army-wide war-exhaustion warning line through the English/BCS localization substrate for cautious, precise, and aggressive tones.

This is presentation-only. It does not change exhaustion calculations, command relationship readouts, command-briefing item generation, alert severity, scenario data, save schema, calibration/army-arc behavior, or generated artifacts.

## Implementation

- Added `chiefOfStaff.exhaustion.*` English/BCS message keys.
- Routed the exhaustion warning branch of `generateCoSBriefing(...)` through `t(...)`.
- Preserved the existing scope note: this remains army-wide staff interpretation, while corps-level detail lives in Command Relationship.

## Verification

- Red: `npx.cmd vitest run tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` failed while BCS mode still emitted `War exhaustion is narrowing...`.
- Green: `npx.cmd vitest run tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` passed 3/3.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts tests\ui\verdict_share_summary.test.ts tests\ui\verdict_scene.test.ts tests\ui\cinematic_verdict.test.ts tests\ui\war_cost_summary.test.ts tests\ui\codex_panel_dynamic_mount.test.ts tests\ui\chronicle_endgame_mount.test.ts tests\wrapped_slides.test.ts tests\chronicle_entries.test.ts tests\ui\turn_aftermath.test.ts tests\ui\turn_aftermath_modal_i18n.test.ts tests\ui\turn_aftermath_records_panel_i18n.test.ts tests\ui\war_summary_campaign_cost_i18n.test.ts tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` passed 126/126.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Chief of Staff precise/aggressive combat and territory prose, cohesion/operation/thin-front alert prose, command-strain prose, header, and letter-home prose remain follow-up localization/content-review slices.
