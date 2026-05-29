# Startup Snapshot Artifact Ownership

**Date:** 2026-05-26
**Lane:** P1 Save/load/replay and generated-artifact stability
**Run ID:** Not applicable
**Baseline:** Startup snapshot ownership row, npm scripts, source definition, and builder wrapper were already aligned
**Result:** Static ownership guard now locks the April 1992 startup snapshot artifact owner and validators without refreshing the artifact

## Summary

- Added a cheap static Vitest guard for `data/derived/startup/apr_1992_initial_save.json` ownership across generated-artifact docs, `package.json`, `src/scenario/startup_snapshot.ts`, and `tools/scenario_runner/build_startup_snapshot.ts`.
- Confirmed the ownership row names the build command, check command, startup snapshot contract, and save migration round-trip contract.
- Did not run the startup snapshot build command, refresh the committed startup save, run baseline refreshes, or change scenario runner/replay/save-migration/desktop startup behavior.

## Changes Made

### Validation

- `tests/startup_snapshot_artifact_ownership.test.ts` reads the generated-artifact ownership matrix and requires the April 1992 startup snapshot row to name `npm.cmd run desktop:startup-snapshot:build`, `npm.cmd run desktop:startup-snapshot:check`, `tests/startup_snapshot_contract.test.ts`, and `tests/save_migration_round_trip_contract.test.ts`.
- The same test parses `package.json` scripts and requires `desktop:startup-snapshot:build` and `desktop:startup-snapshot:check` to map to `tsx tools/scenario_runner/build_startup_snapshot.ts --write` and `--check`.
- The test statically checks that `src/scenario/startup_snapshot.ts` owns only the `apr_1992` key and the same artifact path, and that `build_startup_snapshot.ts` imports and calls `writeStartupSnapshot` and `validateStartupSnapshot`.

### Documentation

- Registered this static ownership slice in the implemented-report indexes, the command board save/replay lane, and the project ledger.

## Scenario Results

Not applicable. No startup snapshot build, baseline, scenario, calibration, or hash-refresh command was run.

## Lessons Learned

- This slice is ownership proof only: it proves the documented owner, validators, script mapping, startup key/path, and CLI wrapper stay aligned. It does not prove byte identity for the committed startup snapshot.

## Verification

- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\startup_snapshot_artifact_ownership.test.ts --reporter=dot` - PASS; 1/1 test.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\startup_snapshot_contract.test.ts tests\save_migration_round_trip_contract.test.ts --reporter=dot` - PASS; 20/20 tests.
- `npm.cmd run desktop:startup-snapshot:check` - PASS; reported `Startup snapshot OK` for `data\derived\startup\apr_1992_initial_save.json`.
- `git diff --check` - PASS.

## Files Changed

| File | Change |
|------|--------|
| `tests/startup_snapshot_artifact_ownership.test.ts` | Added static startup snapshot artifact ownership guard |
| `docs/40_reports/implemented/20260526_STARTUP_SNAPSHOT_ARTIFACT_OWNERSHIP.md` | Added implementation report |
| `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` | Registered report |
| `docs/40_reports/README.md` | Registered report |
| `docs/plans/COMMAND_BOARD.md` | Updated save/replay lane status text |
| `docs/PROJECT_LEDGER.md` | Added ledger entry |

## Next Steps

- Continue Phase 3 with another mapped artifact-owner check or byte-identity proof before changing any generated writes.
