# H2.4 Sweep Artifact Ownership

**Date:** 2026-05-26
**Run ID:** N/A
**Baseline:** `data/derived/scenario/sweeps/h2_4/h2_4_sweep/` was committed generated output without a generated-artifact ownership row.
**Result:** Static ownership guard now locks owner command, validation tests, committed tree shape, aggregate summary rows, and retained run-directory classification.

## Summary

- Added generated-artifact ownership coverage for the committed H2.4 scenario sweep tree.
- Classified the four committed run directories outside `aggregate_summary` as retained H2.4 evidence rather than deleting or refreshing them.
- Did not rerun the sweep, refresh scenario outputs, delete run directories, alter scenario data, tune calibration, or change gameplay behavior.

## Changes Made

- `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md`: added the owner row for `data/derived/scenario/sweeps/h2_4/h2_4_sweep/`, naming `npm.cmd run sim:scenario:sweep`, this static ownership test, the H2.4 scenario harness validation, commit policy, and stop gate.
- `tests/scenario_sweep_artifact_ownership.test.ts`: added a static guard that checks package script alignment, deterministic writer/source constraints, the single committed `h2_4_sweep` id, aggregate JSON/Markdown alignment, fixed per-run artifact set, and run metadata consistency.
- Roadmap/report/ledger docs now record this as a static save/replay generated-artifact stability slice.

## Verification

- Red first: `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\scenario_sweep_artifact_ownership.test.ts --reporter=dot` failed before the ownership row was added because the H2.4 sweep tree was absent from `GENERATED_ARTIFACT_OWNERSHIP.md`.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\scenario_sweep_artifact_ownership.test.ts --reporter=dot` - PASS after documentation alignment.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\scenario_harness_contracts.test.ts --reporter=dot` - PASS; 21/21 tests.
- `F:\A-War-Without-Victory\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json` - PASS after temporarily linking this worktree's missing dependency folders to the root dependency install; the temporary junctions/cache were removed after verification.
- `git diff --check` - PASS.

## Notes

This is ownership-only. The committed sweep artifacts are not refreshed in this slice. Any future refresh or deletion requires scenario/calibration approval because the artifacts are scenario-derived outputs.
