# Save Migration Drift Artifact Ownership

**Date:** 2026-05-26
**Result:** Static artifact ownership guard added.

## Summary
- Added a static Vitest guard for `tools/diagnostics/output/save_migration_drift.json`.
- The guard locks the generated-artifact ownership row, owner command, validation test, commit policy, diagnostic write path, committed `generated_by`, and deterministic script constraints.
- No migration logic, validator logic, artifact bytes, scenario output, replay behavior, event prose, GUI, or calibration data changed.

## Changes Made
### Static Ownership Guard
- Added `tests/save_migration_drift_artifact_ownership.test.ts`.
- The test verifies `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md` names:
  - artifact: `tools/diagnostics/output/save_migration_drift.json`
  - owner command: `node tools/diagnostics/save_migration_drift_audit.cjs`
  - validation: `tests/save_migration_drift_audit.test.ts`
  - policy: committed and refreshed after every migration registry change

### Diagnostic Stability Checks
- The test verifies the diagnostic script writes through the documented `outputPath`.
- The test verifies the committed JSON `generated_by` value matches the diagnostic script path.
- The test statically rejects timestamp/random APIs in the diagnostic script and checks explicit stable sort clauses for emitted field/path collections.

## Verification
- Red first: `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\save_migration_drift_artifact_ownership.test.ts --reporter=dot` failed before the new test existed with `No test files found`.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\save_migration_drift_artifact_ownership.test.ts tests\save_migration_drift_audit.test.ts --reporter=dot` - PASS; 2/2 tests.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\baseline_artifact_ownership.test.ts tests\startup_snapshot_artifact_ownership.test.ts tests\save_migration_drift_artifact_ownership.test.ts --reporter=dot` - PASS; 3/3 tests.
- `F:\A-War-Without-Victory\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json` - PASS after adding a temporary `src\ui\map\node_modules` junction to the parent checkout's installed map dependencies, then removing the junction.

## Files Changed
| File | Change |
| --- | --- |
| `tests/save_migration_drift_artifact_ownership.test.ts` | New static ownership and determinism guard. |
| `docs/40_reports/implemented/20260526_SAVE_MIGRATION_DRIFT_ARTIFACT_OWNERSHIP.md` | Implementation report. |
| `docs/40_reports/README.md` | Latest-report index entry. |
| `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` | Consolidated implementation entry. |
| `docs/plans/COMMAND_BOARD.md` | Save/load/replay artifact-stability lane proof update. |
| `docs/PROJECT_LEDGER.md` | Ledger closeout entry. |

## Next Steps
- Continue the Save/load/replay and generated-artifact stability lane with another mapped artifact-owner check before changing artifact writes.
