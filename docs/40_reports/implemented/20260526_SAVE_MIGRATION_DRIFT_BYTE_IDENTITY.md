# Save Migration Drift Byte Identity

**Date:** 2026-05-26
**Lane:** P1 Save/load/replay and generated-artifact stability

## Summary

`tests/save_migration_drift_audit.test.ts` now proves that the owner command for `tools/diagnostics/output/save_migration_drift.json` regenerates the committed artifact byte-for-byte. The test still checks the semantic contract (`latest_schema_version`, zero anonymous defaults, and empty drift fields), and now restores the committed bytes if the byte-identity assertion fails so a failed test does not leave generated-artifact dirt behind.

## Verification

- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\save_migration_drift_audit.test.ts tests\save_migration_round_trip_contract.test.ts --reporter=dot` - PASS, 16/16 tests.
- `git diff --check` - PASS.

No migration code, save schema, scenario data, baseline artifact, event data, or generated artifact changed.
