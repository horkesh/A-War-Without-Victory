# Latest Run Final-Save Static Artifact Ownership

**Date:** 2026-05-26
**Lane:** Save/load/replay and generated-artifact stability

## Summary

Added a static ownership guard for `data/derived/latest_run_final_save.json` without refreshing or rewriting the tracked save artifact.

The new guard locks the generated-artifact ownership row to the scenario-run scripts, `--map` copy helper, map-copy byte-equivalence test, transient default policy, and paired-ledger requirement for any intentional fixture refresh.

## Scope

- Added `tests/scenario_latest_run_final_save_artifact_ownership.test.ts`.
- Updated `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md` so the latest-run final-save row names both the byte-copy proof and the static ownership guard.
- Updated the command board and engine-quality residual plan to record `latest_run_final_save.json` static ownership closure.

## Non-Changes

- Did not run scenarios.
- Did not refresh `data/derived/latest_run_final_save.json`.
- Did not change save schema, scenario data, calibration, combat logic, event content, UI behavior, or generated scenario outputs.

## Verification

- Red first: `.\vitest.cmd run tests\scenario_latest_run_final_save_artifact_ownership.test.ts --reporter=dot` failed because the ownership row did not name the validation guard.
- `.\vitest.cmd run tests\scenario_latest_run_final_save_artifact_ownership.test.ts --reporter=dot` - PASS; 1/1 test.
- `.\vitest.cmd run tests\scenario_latest_run_final_save_artifact_ownership.test.ts tests\scenario_latest_run_final_save_map_copy.test.ts tests\save_load_real_roundtrip.test.ts tests\adapter_field_completeness.test.ts --reporter=dot` - PASS; 35/35 tests.
- `git diff --check` - PASS.
