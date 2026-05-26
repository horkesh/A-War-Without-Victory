# Recruitment Test Matrix Artifact Ownership

**Date:** 2026-05-26
**Run ID:** N/A
**Baseline:** `data/derived/scenario/recruitment_test_matrix_2026_02_11/` was committed scenario-derived evidence without a generated-artifact ownership row.
**Result:** Static ownership guard now locks the retained run-directory classification and per-run artifact shape without refreshing scenario outputs.

## Summary

- Added generated-artifact ownership coverage for the committed recruitment test matrix tree.
- Classified the retained successful, sparse, and failed `_tmp_player_choice_recruitment_4w` run directories.
- Did not rerun scenarios, refresh generated outputs, delete retained evidence, alter scenario data, tune calibration, or change gameplay behavior.

## Changes Made

- `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md`: added the owner row for `data/derived/scenario/recruitment_test_matrix_2026_02_11/`, explicitly marking it as retained static evidence with no in-place refresh command.
- `tests/recruitment_test_matrix_artifact_ownership.test.ts`: added a static guard that checks the ownership row, exact retained run directory set, fixed per-run artifact sets, 4w run metadata, and the preserved failed player-choice recruitment evidence.
- Roadmap/report/ledger docs now record this as a static save/replay generated-artifact stability slice.

## Verification

- Red first: `.\vitest.cmd run tests\recruitment_test_matrix_artifact_ownership.test.ts --reporter=dot` failed before the ownership row was added because the recruitment matrix tree was absent from `GENERATED_ARTIFACT_OWNERSHIP.md`.
- Focused pass: `.\vitest.cmd run tests\recruitment_test_matrix_artifact_ownership.test.ts --reporter=dot` - PASS after documentation alignment.

## Notes

This is ownership-only. The committed recruitment matrix artifacts are not refreshed in this slice. Future recruitment matrix evidence should be captured as a new dated tree, not by overwriting this retained 2026-02-11 evidence.
