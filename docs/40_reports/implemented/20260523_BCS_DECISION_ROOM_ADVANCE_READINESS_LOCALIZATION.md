# BCS Decision Room Advance Readiness Localization

**Date:** 2026-05-23
**Type:** Implemented UI/read-model localization slice
**Scope:** Decision Room advance-readiness and pre-advance gate chrome

## Summary

The shared Decision Room advance-readiness read model now routes its clear/review/unavailable headlines, active-dossier advance badge, and pre-advance pending-decision gate title through the English/BCS localization substrate.

This is presentation-only. It does not change Decision Room card selection, advance-gate blocking logic, source handoff grouping, navigation targets, scenario data, save schema, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\ui\pre_advance_command_review.test.ts tests\ui\advance_turn_button_gated_feedback.test.ts --reporter=dot` failed while BCS mode still emitted English readiness headlines and gate titles.
- Green: `npx.cmd vitest run tests\ui\pre_advance_command_review.test.ts tests\ui\advance_turn_button_gated_feedback.test.ts tests\ui\warroom_priority_docket.test.ts tests\ui\presidential_decision_room.test.ts --reporter=dot` passed 27/27.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Decision Room card body prose, lane labels/summaries, source handoff labels, broader map overlay chrome, event prose, shared date formatting, and terminology/native-speaker review remain follow-up localization targets.
