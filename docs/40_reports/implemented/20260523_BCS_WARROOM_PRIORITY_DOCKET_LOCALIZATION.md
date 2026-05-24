# BCS Warroom Priority Docket Localization

**Date:** 2026-05-23
**Type:** Implemented UI read-model localization slice
**Scope:** Warroom priority docket summary/open-label chrome

## Summary

The Warroom priority docket read model now routes its compact summary, source-handoff summary, and open-Decision-Room label through the English/BCS localization substrate.

This is presentation-only. It does not change pre-advance review selection, docket ordering, source-handoff grouping, blocking decisions, navigation targets, scenario data, save schema, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\ui\warroom_priority_docket.test.ts --reporter=dot` failed while BCS mode still emitted English docket summary chrome.
- Green: `npx.cmd vitest run tests\ui\warroom_priority_docket.test.ts --reporter=dot` passed 4/4.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Decision Room card/readiness prose, Warroom status-bar panel labels, and broader map/decision chrome remain follow-up localization targets.
