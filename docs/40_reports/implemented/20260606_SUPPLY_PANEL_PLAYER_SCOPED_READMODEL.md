# Supply Panel Player-Scoped Read-Model

**Date:** 2026-06-06
**Lane:** P2 Supply/logistics comprehension outside GUI branch
**Type:** UI/read-model hardening

## Summary

The supply map logistics panel now keeps legacy fallback supply counts scoped to the loaded player faction, localizes its corridor labels, and shows the existing player-visible supply-state count summary when adapter summary rows are available.

This is a presentation/read-model change only. It does not change supply simulation, combat supply math, save schema, migrations, scenario data, baseline manifests, generated artifacts, or persisted output ordering.

## Changes

- Replaced the panel's `localeCompare(...)` faction-summary ordering with a deterministic ASCII comparator.
- Scoped legacy `warPhaseSupplyPressure` / `warPhaseSupplyCondition` fallback rows to the loaded player faction when one is present.
- Added localized state-count and corridor-count labels in English and BCS.
- Added focused UI tests proving player-faction scoping, localized English labels, and no enemy-count leakage through the panel summary.

## Verification

- `node ..\..\node_modules\vitest\vitest.mjs run tests\ui\supply_fallbacks.test.ts tests\ui_player_supply_visibility.test.ts tests\ui_decision_room_supply_visibility.test.ts tests\ui\supply_legend_overlap_contract.test.ts --reporter=dot` PASS, 21/21.

`typecheck` and `git diff --check` are part of closeout proof for the branch.
