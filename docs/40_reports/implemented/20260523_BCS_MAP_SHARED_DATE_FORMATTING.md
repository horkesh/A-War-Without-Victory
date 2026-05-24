# BCS Map Shared Date Formatting

**Date:** 2026-05-23
**Type:** Implemented shared formatter localization slice
**Scope:** Tactical-map shared turn date labels

## Summary

The tactical-map shared `turnToDateString(...)` helper now formats short month labels through deterministic English/BCS month tables keyed by the active UI locale. Turn Aftermath, Chronicle, Formation Detail history moments, Decision Room hard-turn card titles, and other tactical-map consumers of `src/ui/map/utils/formatters.ts` now inherit BCS month labels without changing turn arithmetic.

This is presentation-only. It does not change turn numbers, date baselines, scenario start dates, save schema, simulation outputs, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\ui\turn_aftermath.test.ts --reporter=dot` failed while BCS mode still emitted `24 Jun 1992`.
- Green: `npx.cmd vitest run tests\ui\turn_aftermath.test.ts --reporter=dot` passed 13/13.
- Related: `npx.cmd vitest run tests\ui\turn_aftermath.test.ts tests\ui\turn_aftermath_modal_i18n.test.ts tests\ui\presidential_decision_room.test.ts --reporter=dot` passed 27/27.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

The separate Warroom date utility, War Planning map date helper, Settlement Timeline local helper, broader War Summary non-overview chrome, Chronicle prose, map overlays, event prose, launch copy, and terminology/native-speaker review remain follow-up localization targets.
