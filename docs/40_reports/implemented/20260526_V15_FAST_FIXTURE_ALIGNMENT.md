# V15 Fast Fixture Alignment

**Date:** 2026-05-26
**Run ID:** GitHub Actions Baseline Regression `26461125177`
**Baseline:** Main commit `4a72fed9` failed fast tests after the v15 event-bookkeeping schema contract.
**Result:** Stale fast-suite fixtures now include the required inert v15 event bookkeeping records, and v14-to-v15 round-trip fixture coverage exists.

## Summary

- Added empty v15 event bookkeeping records to current-schema test fixtures that bypass full state builders.
- Added a v14 save-migration fixture so the round-trip fixture contract covers the v15 migration step.
- No production code, scenario data, generated run output, event prose, calibration, or gameplay behavior changed.

## Verification

- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\migration_nested_ownership.test.ts tests\save_migration_round_trip_contract.test.ts tests\state.test.ts --reporter=dot` - PASS; 24/24 tests.

## Notes

The GitHub failure was fixture drift: CI exposed current-schema literals and fixture inventory that were outside the previous focused v15 verification bundle.
