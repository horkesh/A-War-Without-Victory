# Strict-Null GameStateAdapter Tail

**Date:** 2026-05-22  
**Commit scope:** `src/ui/map/data/GameStateAdapter.ts`, strict-null inventory guard, roadmap/ledger docs.

## Summary

`GameStateAdapter.ts` now contributes zero inventory-counted strict-null escape hatches. This closes the last visible `as_any_casts` and `as_factionid_casts` cluster after the save-migration tail.

## What Changed

- Replaced the parser entry `json as any` and repeated free-form field widenings with adapter-local `asLooseRecord(...)` and `readActiveOperationRows(...)` helpers.
- Typed enclave UI definitions with the UI literal `FactionId` union, removing the two retained enclave faction casts.
- Replaced the historical-baseline JSON `as any` bridge with the actual `compareToHistorical(...)` parameter type.
- Pinned the Phase 5 adapter inventory test at exact zero for `as_any_casts`, `as_factionid_casts`, `as_unknown_casts`, and non-null assertion categories.

## Non-Changes

No save schema, scenario data, simulation behavior, operation behavior, calibration/army-arc tuning, combat math, UI presentation, IPC writer, or turn ordering changed. This is a read-boundary typing cleanup only.

## Verification

- `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts tests\adapter_field_completeness.test.ts tests\game_state_adapter_estimated_civilian_risk.test.ts tests\ui_adapter_boundary.test.ts tests\ui_map_game_state_adapter.test.ts --reporter=dot` PASS 148/148
- `npm.cmd run typecheck` PASS
- `npm.cmd run desktop:map:build` PASS with existing Vite browser-external/dynamic-import/chunk-size warnings
- `git diff --check` PASS
- `node tools\diagnostics\strict_null_inventory.cjs` PASS, current counted floor:
  - `as_factionid_casts 0`
  - `as_unknown_casts 0`
  - `as_any_casts 0`
  - `non_null_assertions_dot 0`
  - `non_null_assertions_index 0`
  - `optional_fields_game_state 477`
