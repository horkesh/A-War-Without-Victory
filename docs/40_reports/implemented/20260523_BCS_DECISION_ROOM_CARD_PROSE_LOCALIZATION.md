# BCS Decision Room Card Prose Localization

**Date:** 2026-05-23
**Type:** Implemented generated-prose localization slice
**Scope:** Decision Room owned card titles, explanations, evidence, source owners, and action labels

## Summary

The Presidential Decision Room now routes its owned generated card prose through the English/BCS localization substrate for presidential-review cards, paramilitary authorization cards, manifest-backed peace/Dayton/convoy cards, counter-offer cards, opportunity fallback/evidence copy, supply/SITREP source copy, hard-turn evidence, campaign-cost source/evidence copy, and Chronicle memory cards.

This is presentation-only. It does not translate source-provided external prose such as command briefing item details, opportunity recommendations/descriptions, live SITREP alert text, campaign-cost generated briefing lines, or Turn Aftermath cost reasons. It does not change card synthesis, card ordering, severity ranking, source grouping, navigation targets, scenario data, save schema, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\ui\presidential_decision_room.test.ts --reporter=dot` failed while BCS mode still emitted English Decision Room card titles.
- Green: `npx.cmd vitest run tests\ui\presidential_decision_room.test.ts --reporter=dot` passed 13/13.
- Related: `npx.cmd vitest run tests\ui\presidential_decision_room.test.ts tests\ui\presidential_decision_room_panel_i18n.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\warroom_priority_docket.test.ts tests\ui\advance_turn_button_gated_feedback.test.ts --reporter=dot` passed 30/30.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Source-provided generated prose, shared date formatting, broader War Summary non-overview chrome, Chronicle prose, map overlays, event prose, launch copy, and terminology/native-speaker review remain follow-up localization targets.
