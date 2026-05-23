# BCS Chief of Staff Command-Strain Localization

**Date:** 2026-05-23
**Type:** Implemented UI read-model localization slice
**Scope:** Army HQ Chief of Staff command-strain prose

## Summary

The Chief of Staff briefing generator now routes command-strain institutional warning prose through the English/BCS localization substrate for cautious, precise, and aggressive staff tones.

This is presentation-only. It does not change command-strain calculation, command relationship state, intervention costs, corps sorting, briefing item generation, scenario data, save schema, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` failed while BCS mode still emitted English command-strain prose.
- Green: `npx.cmd vitest run tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` passed 6/6.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Chief of Staff precise/aggressive combat and territory prose, header chrome, and letter-home prose remain follow-up localization/content-review slices.
