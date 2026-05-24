# BCS War Planning Map Date Formatting

**Date:** 2026-05-23
**Type:** Implemented War Planning map formatter localization slice
**Scope:** War Planning map turn/date label

## Summary

The War Planning map turn-date helper now uses deterministic English/BCS short month tables keyed by the active UI locale. The existing map turn label keeps its current turn arithmetic and shell format while the visible date portion localizes in BCS mode.

This is presentation-only. It does not change map layers, settlement control, scenario data, save schema, simulation outputs, calibration/army-arc behavior, generated artifacts, or War Planning map interaction behavior.

## Verification

- Red: `npx.cmd vitest run tests\ui\war_planning_map_date_i18n.test.ts --reporter=dot` failed because `formatWarPlanningTurnDate` was not yet exposed and the helper was still English-only.
- Green: `npx.cmd vitest run tests\ui\war_planning_map_date_i18n.test.ts --reporter=dot` passed 2/2.
- Related: `npx.cmd vitest run tests\ui\war_planning_map_date_i18n.test.ts tests\ui\warroom_date_i18n.test.ts tests\ui\turn_aftermath.test.ts --reporter=dot` passed 17/17.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Settlement Timeline local helper, broader War Summary non-overview chrome, broad Chronicle prose, rich Verdict authored prose/source-provided labels, source-provided Decision Room prose, map overlays, event prose, launch copy, and terminology/native-speaker review remain follow-up localization targets.
