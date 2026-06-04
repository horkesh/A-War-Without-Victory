# Save Migration Fixture Artifact Ownership

**Date:** 2026-06-04
**Type:** Static generated-artifact ownership guard.

## Summary

The committed save migration fixtures under `tests/fixtures/save_migration/v*.json` are now explicitly classified in the generated-artifact ownership matrix as retained legacy schema evidence. Prior fixture bytes are not refresh targets; schema evolution should append a new `vNN` fixture when needed.

## Scope

- Added a matrix row for `tests/fixtures/save_migration/v*.json`.
- Added `tests/save_migration_fixture_artifact_ownership.test.ts` to pin the row, tracked fixture set, `vNN_slug.json` naming, and contiguous fixture sequence.
- Updated the command board and report indices for the Save/load/replay generated-artifact lane.

No fixture bytes, migration logic, validator behavior, replay writers, scenario outputs, baselines, or save schema versions changed.

## Verification

- Red proof: `node node_modules\vitest\vitest.mjs run tests\save_migration_fixture_artifact_ownership.test.ts --reporter=dot` failed because the ownership matrix did not include `tests/fixtures/save_migration/v*.json`.
- Green proof: `node node_modules\vitest\vitest.mjs run tests\save_migration_fixture_artifact_ownership.test.ts tests\save_migration_round_trip_contract.test.ts tests\generated_artifact_ownership_matrix_contract.test.ts --reporter=dot`.
- `node node_modules\vitest\vitest.mjs run tests\save_migration_drift_audit.test.ts --reporter=dot`.
- `git diff --check`.
