# Migration Nested Ownership v21 Fixture Alignment

**Date:** 2026-05-27
**Result:** Baseline fast-test fixture gap closed

## Summary
- `tests/migration_nested_ownership.test.ts` now includes the required v21 top-level `paramilitary_decision_history` field in its current-schema fixture.
- This aligns the nested migration ownership fixture with the v21 save-shape contract without changing migration logic, validation logic, save data, event behavior, or scenario output.

## Verification
- `F:\A-War-Without-Victory\vitest.cmd run tests\migration_nested_ownership.test.ts tests\save_load_real_roundtrip.test.ts tests\save_migration_counter_offers.test.ts tests\save_migration_drift_audit.test.ts tests\state.test.ts --reporter=dot` - PASS; 27/27 tests.
