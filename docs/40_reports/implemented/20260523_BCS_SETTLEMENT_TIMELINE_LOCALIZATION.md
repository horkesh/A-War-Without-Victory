# BCS Settlement Timeline Localization

**Date:** 2026-05-23
**Type:** Implemented Settlement Timeline localization slice
**Scope:** Settlement timeline dates, empty state, and component-owned casualty row

## Summary

`SettlementTimeline` now uses deterministic English/BCS short month tables keyed by the active UI locale. Its no-events empty state and component-owned casualty row label also render through the English/BCS message substrate.

This is presentation-only. Timeline event titles/details remain source-authored. The change does not affect event collection, event ordering, settlement control, battle data, casualties, scenario data, save schema, simulation outputs, calibration/army-arc behavior, generated artifacts, or map interaction behavior.

## Verification

- Red: `npx.cmd vitest run tests\ui\settlement_timeline_i18n.test.ts --reporter=dot` first failed because `formatSettlementTimelineTurnDate` was not exposed; after the date/empty-state pass, the casualty-row addition failed while BCS mode still rendered `Casualties: 3 att / 5 def`.
- Green: `npx.cmd vitest run tests\ui\settlement_timeline_i18n.test.ts --reporter=dot` passed 3/3.
- Related: `npx.cmd vitest run tests\ui\settlement_timeline_i18n.test.ts tests\ui\war_planning_map_date_i18n.test.ts tests\ui\warroom_date_i18n.test.ts tests\ui\turn_aftermath.test.ts --reporter=dot` passed 20/20.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Broader War Summary non-overview chrome, broad Chronicle prose, rich Verdict authored prose/source-provided labels, source-provided Decision Room prose, map overlays, event prose, launch copy, and terminology/native-speaker review remain follow-up localization targets.
