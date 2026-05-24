# BCS Warroom Date Formatting

**Date:** 2026-05-23
**Type:** Implemented shared Warroom formatter localization slice
**Scope:** Warroom date, month-year, week, and toolbar date labels

## Summary

The Warroom `warroom_utils.ts` date helpers now use deterministic English/BCS month tables keyed by the active UI locale. This covers Warroom modal/panel date strings, monthly publication labels, week strings, and short toolbar month labels while preserving the existing scenario-start-date arithmetic.

This is presentation-only. It does not change ticker turns, scenario start-date state, turn arithmetic, faction colors, player-faction resolution, save schema, simulation outputs, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\ui\warroom_date_i18n.test.ts --reporter=dot` failed while BCS mode still emitted `1 September 1991`.
- Green: `npx.cmd vitest run tests\ui\warroom_date_i18n.test.ts --reporter=dot` passed 2/2.
- Related: `npx.cmd vitest run tests\ui\warroom_date_i18n.test.ts tests\faction_palette_canonical.test.ts tests\ui\warroom_player_faction.test.ts --reporter=dot` passed 10/10.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

War Planning map date helper, Settlement Timeline local helper, broader War Summary non-overview chrome, Chronicle prose, map overlays, event prose, launch copy, and terminology/native-speaker review remain follow-up localization targets.
