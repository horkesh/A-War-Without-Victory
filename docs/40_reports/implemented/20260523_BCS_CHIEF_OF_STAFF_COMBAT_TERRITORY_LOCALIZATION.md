# BCS Chief of Staff Combat/Territory Localization

**Date:** 2026-05-23
**Type:** Implemented UI read-model localization slice
**Scope:** Army HQ Chief of Staff cautious-tone combat and territory summary prose

## Summary

The Chief of Staff briefing generator now routes cautious-tone last-turn combat and territory summary prose through the English/BCS localization substrate. This covers the RBiH cautious Chief of Staff path for unfavorable/favorable/inconclusive battle summaries and gained/lost/mixed territory summaries.

This is presentation-only. It does not change battle outcome classification, territory-net math, turn-summary schema, command-briefing item generation, command-strain behavior, scenario data, save schema, calibration/army-arc behavior, or generated artifacts.

## Implementation

- Added `chiefOfStaff.battle.cautious.*` and `chiefOfStaff.territory.cautious.*` English/BCS message keys.
- Routed cautious-tone combat and territory summary phrases through `t(...)`.
- Preserved existing battle win/loss counting and territory gain/loss derivation.

## Verification

- Red: `npx.cmd vitest run tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` failed while BCS mode still emitted `We fought...` and `We lost 1 position...`.
- Green: `npx.cmd vitest run tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` passed 2/2.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts tests\ui\verdict_share_summary.test.ts tests\ui\verdict_scene.test.ts tests\ui\cinematic_verdict.test.ts tests\ui\war_cost_summary.test.ts tests\ui\codex_panel_dynamic_mount.test.ts tests\ui\chronicle_endgame_mount.test.ts tests\wrapped_slides.test.ts tests\chronicle_entries.test.ts tests\ui\turn_aftermath.test.ts tests\ui\turn_aftermath_modal_i18n.test.ts tests\ui\turn_aftermath_records_panel_i18n.test.ts tests\ui\war_summary_campaign_cost_i18n.test.ts tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` passed 125/125.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Chief of Staff precise/aggressive combat and territory prose, alert/exhaustion prose, command-strain prose, header, and letter-home prose remain follow-up localization/content-review slices.
