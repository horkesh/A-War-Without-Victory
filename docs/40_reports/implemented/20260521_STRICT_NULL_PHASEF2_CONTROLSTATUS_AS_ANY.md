# Strict Null Phase F2 Control-Status As-Any Cleanup

Date: 2026-05-21

## Summary

`src/cli/phaseF2_controlstatus_migration_audit.ts` now contributes zero inventory-counted `as_any_casts`.

The CLI diagnostic still builds the canonical initialization audit state, verifies legacy side lookup against `getSettlementControlStatus` for 200 known-control settlements, and runs its migrated-module raw-read guard. The guard was tightened to match the raw singular `.political_controller` property instead of falsely matching the canonical plural `.political_controllers` map.

## Scope

- Replaced the three broad casts in the Phase F2 audit `GameState` initializer with directly typed `military`, `political`, and `displacement` domains.
- Added a strict-null progress assertion pinning the Phase F2 audit file at zero `as_any_casts`.
- Corrected the diagnostic static guard so plural canonical map writes/reads do not trip a singular raw-field guard.
- No political-control behavior, settlement source data, derived canonical data, scenario behavior, save schema, or output tuning changed.

## Verification

- `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot` PASS (78/78)
- `npm.cmd run typecheck` PASS
- `npx.cmd tsx src\cli\phaseF2_controlstatus_migration_audit.ts` PASS
  - Canonical initialization reported 744 graph nodes with `null=0`.
  - Phase F2 audit report was written to `data/derived/_debug/phaseF2_controlstatus_migration_audit_report.txt`.
- `node tools\diagnostics\strict_null_inventory.cjs`
  - `as_factionid_casts`: 2
  - `as_unknown_casts`: 2
  - `as_any_casts`: 162
  - `non_null_assertions_dot`: 0
  - `non_null_assertions_index`: 0
  - `optional_fields_game_state`: 473
