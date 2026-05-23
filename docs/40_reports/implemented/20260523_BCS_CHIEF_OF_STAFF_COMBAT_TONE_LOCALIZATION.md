# BCS Chief of Staff Combat Tone Localization

**Date:** 2026-05-23
**Type:** Implemented UI read-model localization slice
**Scope:** Army HQ Chief of Staff precise/aggressive combat and territory prose

## Summary

The Chief of Staff briefing generator now routes precise and aggressive last-turn combat and territory summary prose through the English/BCS localization substrate.

This is presentation-only. It does not change battle outcome classification, territory-net derivation, command briefing generation, turn-summary schema, scenario data, save schema, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` failed while BCS mode still emitted English precise/aggressive combat and territory prose.
- Green: `npx.cmd vitest run tests\ui\chief_of_staff_briefing_i18n.test.ts --reporter=dot` passed 7/7.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Chief of Staff header chrome and letter-home prose remain follow-up localization/content-review slices.
