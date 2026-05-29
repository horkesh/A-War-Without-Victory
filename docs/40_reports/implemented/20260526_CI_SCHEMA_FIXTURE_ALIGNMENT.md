# CI Schema Fixture Alignment

**Date:** 2026-05-26

**Lane:** Branch/CI/release hygiene

## Summary

Aligned stale current-schema test fixtures and the tracked latest-run final-save fixture with the required persisted fields introduced by the event decision log and political war substrate schema-contract slices.

## What Changed

- Added `military.event_decision_log: []` to `data/derived/latest_run_final_save.json`.
- Added empty political war substrate records to direct current-version political fixtures in:
  - `tests/migration_nested_ownership.test.ts`
  - `tests/save_migration_counter_offers.test.ts`
  - `tests/state/player_faction_contract.test.ts`

## Scope Boundaries

No production code, migration logic, validator logic, event prose, GUI behavior, scenario source data, combat logic, calibration tuning, or non-empty save values changed.

This is a CI fixture repair for already-required save-schema fields.

## Verification

- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\migration_nested_ownership.test.ts --reporter=dot` - PASS; 4/4 tests.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\front_edge_foca_shared_border_real_save.test.ts tests\migration_nested_ownership.test.ts tests\real_save_sector_truth_contracts.test.ts tests\save_load_real_roundtrip.test.ts tests\save_migration_counter_offers.test.ts tests\sector_partition_buildCorpsFrontSectors_integration.test.ts tests\state\player_faction_contract.test.ts --reporter=dot` - PASS; 34/34 tests.
- `F:\A-War-Without-Victory\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json` - PASS.
- `git diff --check` - PASS.

## Review Notes

The repair is intentionally limited to empty required fields. It does not mask the nested ownership migration rescue tests: the legacy top-level residue case still omits nested `negotiation_ledger` and `supply_rights` so the test continues to prove rescue behavior.
