# BCS Decision Room Read-Model Chrome Localization

**Date:** 2026-05-23
**Type:** Implemented read-model chrome localization slice
**Scope:** Decision Room lenses, command lanes, product-loop labels, summaries, and source handoffs

## Summary

The Presidential Decision Room read model now routes its category lens labels, command-question lane labels/fallbacks, product-loop step labels/fallbacks, count summaries, source-handoff labels, and handoff action labels through the English/BCS localization substrate.

This is presentation-only. It does not change card synthesis, card ordering, severity ranking, source-handoff grouping, navigation targets, advance-readiness selection, scenario data, save schema, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\ui\presidential_decision_room.test.ts --reporter=dot` failed while BCS mode still emitted English lens labels.
- Green: `npx.cmd vitest run tests\ui\presidential_decision_room.test.ts --reporter=dot` passed 12/12.
- Related: `npx.cmd vitest run tests\ui\presidential_decision_room.test.ts tests\ui\presidential_decision_room_panel_i18n.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\warroom_priority_docket.test.ts tests\ui\advance_turn_button_gated_feedback.test.ts --reporter=dot` passed 29/29.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Decision Room generated card titles/explanations/evidence, shared date formatting, broader War Summary non-overview chrome, Chronicle prose, map overlays, event prose, launch copy, and terminology/native-speaker review remain follow-up localization targets.
