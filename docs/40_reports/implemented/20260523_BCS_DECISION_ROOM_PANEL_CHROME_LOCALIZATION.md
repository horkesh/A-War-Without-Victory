# BCS Decision Room Panel Chrome Localization

**Date:** 2026-05-23
**Type:** Implemented UI chrome localization slice
**Scope:** Army HQ Presidential Decision Room panel labels

## Summary

The Army HQ Presidential Decision Room panel now routes its static frame labels through the English/BCS localization substrate, including the panel title, strategic-priorities header, advanced toggle, advanced metrics, command/product loop headings, dossier labels, source handoff headings, inspection empty states, and review-before-advance section.

This is presentation-only. It does not change Decision Room card synthesis, command-loop lane selection, product-loop ordering, advance-readiness selection, navigation targets, scenario data, save schema, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\ui\presidential_decision_room_panel_i18n.test.ts --reporter=dot` failed while BCS mode still rendered English Decision Room panel chrome.
- Green: `npx.cmd vitest run tests\ui\presidential_decision_room_panel_i18n.test.ts --reporter=dot` passed 1/1.
- Related: `npx.cmd vitest run tests\ui\presidential_decision_room_panel_i18n.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\warroom_priority_docket.test.ts tests\ui\advance_turn_button_gated_feedback.test.ts --reporter=dot` passed 28/28.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Decision Room generated card prose, command-loop lane labels/summaries, source handoff labels, broader Inbox opening brief chrome, map overlays, event prose, shared date formatting, and terminology/native-speaker review remain follow-up localization targets.
