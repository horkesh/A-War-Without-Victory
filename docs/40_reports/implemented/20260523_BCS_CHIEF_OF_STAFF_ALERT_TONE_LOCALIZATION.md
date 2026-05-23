# BCS Chief of Staff Alert Tone Localization

**Date:** 2026-05-23
**Type:** Implemented UI read-model localization slice
**Scope:** Army HQ Chief of Staff precise/aggressive cohesion, operation, and thin-front alert prose

## Summary

The Chief of Staff briefing generator now routes precise and aggressive alert prose for critical cohesion, operation readiness, and thin-front warnings through the English/BCS localization substrate.

This is presentation-only. It does not change briefing item generation, alert severity, routing targets, corps links, operation readiness, defense warning derivation, scenario data, save schema, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` failed while BCS mode still emitted English precise/aggressive alert prose.
- Green: `npx.cmd vitest run tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` passed 5/5.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Chief of Staff command-strain prose, header, and letter-home prose remain follow-up localization/content-review slices.
