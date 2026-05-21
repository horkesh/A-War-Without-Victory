# Strict Null Phase F1 Unknown-Control As-Any Cleanup

Date: 2026-05-21

## Summary

`src/cli/phaseF1_unknown_control_behavior_audit.ts` now contributes zero inventory-counted `as_any_casts`.

The CLI diagnostic still builds the same minimal canonical initialization audit state, runs `prepareNewGameState`, and verifies that `getSettlementSideLegacy` matches `getSettlementControlStatus.side` for the first 50 known-control settlements. The cleanup only types the diagnostic state initializer directly.

## Scope

- Replaced the three broad casts in the Phase F1 audit `GameState` initializer with directly typed `military`, `political`, and `displacement` domains.
- Added a strict-null progress assertion pinning the Phase F1 audit file at zero `as_any_casts`.
- No political-control behavior, settlement source data, derived canonical data, scenario behavior, save schema, or output tuning changed.

## Verification

- `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot` PASS (77/77)
- `npm.cmd run typecheck` PASS
- `npx.cmd tsx src\cli\phaseF1_unknown_control_behavior_audit.ts` PASS
  - Canonical initialization reported 744 graph nodes with `null=0`.
  - Phase F1 audit report was written to `data/derived/_debug/phaseF1_unknown_control_behavior_audit_report.txt`.
- `node tools\diagnostics\strict_null_inventory.cjs`
  - `as_factionid_casts`: 2
  - `as_unknown_casts`: 2
  - `as_any_casts`: 165
  - `non_null_assertions_dot`: 0
  - `non_null_assertions_index`: 0
  - `optional_fields_game_state`: 473
