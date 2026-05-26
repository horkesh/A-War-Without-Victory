# Baseline Ops Sensitivity Artifact Ownership

**Date:** 2026-05-26
**Run ID:** N/A
**Baseline:** `data/derived/scenario/baseline_ops_sensitivity*/` was committed generated output without a generated-artifact ownership row.
**Result:** Static ownership guard now locks owner command, validation tests, retained duplicate-tree classification, and byte-identity expectations.

## Summary

- Added generated-artifact ownership coverage for the committed H1.11 baseline-ops sensitivity trees.
- Classified `baseline_ops_sensitivity_run2` as retained byte-identity evidence rather than an unexplained duplicate.
- Did not rerun the scenario harness, refresh scenario outputs, delete retained artifacts, alter calibration, or change gameplay behavior.

## Changes Made

- `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md`: added the owner row for `data/derived/scenario/baseline_ops_sensitivity*/`, naming `npm.cmd run sim:scenario:baseline-ops:sensitivity`, the behavior/determinism test, this static ownership test, commit policy, and stop gate.
- `tests/baseline_ops_sensitivity_artifact_ownership.test.ts`: added a static guard that checks package script alignment, CLI default output, stable JSON writer usage, fixed per-run artifact set, mirrored primary/run2 tree shape, and byte identity for all retained files except `run_meta.json` `out_dir`.
- `tests/h1_11_baseline_ops_sensitivity.test.ts`: widened the scenario-heavy H1.11 test timeout so the declared validation can complete on the current harness runtime instead of failing at the old 30s ceiling.
- Roadmap/report/ledger docs now record this as a static save/replay generated-artifact stability slice.

## Verification

- Red first: `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\baseline_ops_sensitivity_artifact_ownership.test.ts --reporter=dot` failed before the ownership row was added because the sensitivity artifact tree was absent from `GENERATED_ARTIFACT_OWNERSHIP.md`.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\baseline_ops_sensitivity_artifact_ownership.test.ts --reporter=dot` - PASS after documentation alignment.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\h1_11_baseline_ops_sensitivity.test.ts tests\baseline_ops_sensitivity_artifact_ownership.test.ts --reporter=dot` - PASS; 4/4 tests.
- `git diff --check` - PASS.

## Notes

This is ownership-only. The committed primary and run2 trees are not refreshed in this slice. Any future refresh or deletion requires scenario/calibration approval because the artifacts are scenario-derived outputs.
