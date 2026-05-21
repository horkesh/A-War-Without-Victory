# Strict Null Phase F4 Unknown-Attribution As-Any Cleanup

Date: 2026-05-21

## Summary

`src/cli/phaseF4_unknown_control_attribution_audit.ts` now contributes zero inventory-counted `as_any_casts`.

The CLI diagnostic still builds the canonical initialization audit state, attributes unknown-control settlements by reason bucket, writes the debug report, and exits non-zero if any error bucket is present. The cleanup only types the diagnostic state initializer directly.

## Scope

- Replaced the three broad casts in the Phase F4 audit `GameState` initializer with directly typed `military`, `political`, and `displacement` domains.
- Added a strict-null progress assertion pinning the Phase F4 audit file at zero `as_any_casts`.
- No unknown-control attribution behavior, source data, derived canonical data, scenario behavior, save schema, or output tuning changed.

## Verification

- `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot` PASS (79/79)
- `npm.cmd run typecheck` PASS
- `npx.cmd tsx src\cli\phaseF4_unknown_control_attribution_audit.ts` PASS
  - Canonical initialization reported 744 graph nodes with `null=0`.
  - Phase F4 audit report was written to `data/derived/_debug/phaseF4_unknown_control_attribution_report.txt`.
- `node tools\diagnostics\strict_null_inventory.cjs`
  - `as_factionid_casts`: 2
  - `as_unknown_casts`: 2
  - `as_any_casts`: 159
  - `non_null_assertions_dot`: 0
  - `non_null_assertions_index`: 0
  - `optional_fields_game_state`: 473
