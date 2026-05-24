# BCS Chief of Staff Header Localization

**Date:** 2026-05-23
**Type:** Implemented UI chrome localization slice
**Scope:** Army HQ Chief of Staff briefing stamp, header label, and staff title chrome

## Summary

The Chief of Staff briefing component now routes the paper stamp, daily-briefing label, and staff title labels through the English/BCS localization substrate.

This is presentation-only. It does not change Chief of Staff identity, faction profile selection, briefing generation, date calculation, scenario data, save schema, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` failed while BCS mode still rendered English header chrome.
- Green: `npx.cmd vitest run tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` passed 8/8.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Chief of Staff letter-home prose remains a follow-up localization/content-review slice. Date formatting remains a broader shared formatter localization target.
