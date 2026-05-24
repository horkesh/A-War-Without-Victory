# BCS Warroom Status Bar Localization

**Date:** 2026-05-23
**Type:** Implemented UI chrome localization slice
**Scope:** Warroom status bar priority/advance/panel labels

## Summary

The Warroom status bar now routes its phase badge, priority pulse, advance action, docket panel headings, empty state, urgency title, and docket category badges through the English/BCS localization substrate.

This is presentation-only. It does not change Warroom navigation, advance gating, pre-advance review selection, docket ordering, source handoffs, scenario data, save schema, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\ui\advance_turn_button_gated_feedback.test.ts --reporter=dot` failed while BCS mode still rendered English Warroom status-bar chrome.
- Green: `npx.cmd vitest run tests\ui\advance_turn_button_gated_feedback.test.ts --reporter=dot` passed 4/4.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Decision Room card/readiness prose, source handoff labels from the Decision Room read model, and broader map/decision chrome remain follow-up localization targets.
