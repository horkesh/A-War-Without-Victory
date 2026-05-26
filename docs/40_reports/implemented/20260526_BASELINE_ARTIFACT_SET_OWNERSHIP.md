# Baseline Artifact Set Ownership

**Date:** 2026-05-26
**Lane:** P1 Save/load/replay and generated-artifact stability
**Run ID:** Not applicable
**Baseline:** Manifest and runner defaults already listed eight hashed run artifacts
**Result:** Static ownership guard now locks manifest, runner defaults, and docs to the same manifest-owned hash-key set

## Summary

- Added a cheap static Vitest guard for baseline manifest artifact-set drift across `manifest.json`, `run_baseline_regression.ts`, and generated-artifact ownership docs.
- Updated the generated-artifact ownership matrix to state that only `manifest.json` is committed and to list the `.json`, `.md`, and `.jsonl` hashed run outputs owned by its `artifacts[]` and scenario hash keys.
- Did not refresh baseline hashes, run long baselines, or touch calibration/scenario outputs.

## Changes Made

### Validation
- `tests/baseline_artifact_ownership.test.ts` reads the committed baseline manifest, parses the runner `ARTIFACTS` default list, and checks every scenario's `expected_files` plus hash keys against the canonical eight-name hashed run artifact set.
- The same test requires the ownership doc row to state that only `manifest.json` is committed and to name the hashed run outputs.

### Documentation
- `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md` now documents `manifest.json` as the committed baseline artifact and lists `activity_summary.json`, `control_delta.json`, `end_report.md`, `final_save.json`, `formation_delta.json`, `run_summary.json`, `watched_operations.json`, and `weekly_report.jsonl` as hashed run outputs, not committed per-scenario payloads.

## Scenario Results

Not applicable. No baseline, scenario, calibration, or hash-refresh command was run.

## Lessons Learned

- The baseline manifest and runner defaults were already aligned; the drift was documentation ownership language that only named `*.json`, missed `end_report.md` plus `weekly_report.jsonl`, and could be read as a committed per-scenario payload path.

## Verification

- Red first: `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\baseline_artifact_ownership.test.ts --reporter=dot` - FAIL before the doc update; ownership docs did not name `activity_summary.json` on the baseline ownership row.
- Green: `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\baseline_artifact_ownership.test.ts --reporter=dot` - PASS; 1/1 test.
- Focused ownership guardrails: `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\baseline_artifact_ownership.test.ts tests\baseline_regression_ci_guardrails.test.ts --reporter=dot` - PASS; 2/2 tests.
- `git diff --check` - PASS.
- `git ls-files data/derived/scenario/baselines` - PASS; only `data/derived/scenario/baselines/manifest.json` is tracked.

## Files Changed

| File | Change |
|------|--------|
| `tests/baseline_artifact_ownership.test.ts` | Added static artifact-set drift guard |
| `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md` | Documented manifest-only commit ownership and enumerated hashed run outputs beyond `*.json` |
| `docs/40_reports/implemented/20260526_BASELINE_ARTIFACT_SET_OWNERSHIP.md` | Added implementation report |
| `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` | Registered report |
| `docs/40_reports/README.md` | Registered report |
| `docs/plans/COMMAND_BOARD.md` | Updated save/replay lane status text |
| `docs/PROJECT_LEDGER.md` | Added append-only ledger entry |

## Next Steps

- Continue Phase 3 with another mapped artifact-owner check before changing generated writes.
