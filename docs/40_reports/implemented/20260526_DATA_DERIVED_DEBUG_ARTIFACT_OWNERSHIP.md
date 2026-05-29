# Data Derived Debug Artifact Ownership

**Date:** 2026-05-26
**Lane:** Save/load/replay and generated-artifact stability

## Summary

- Added a static ownership guard for `data/derived/_debug/**`.
- The guard confirms `.gitignore` covers `data/derived/_debug/`, the generated-artifact ownership matrix classifies the tree as default-transient with no committed files, and `git ls-files data/derived/_debug` stays empty.
- No diagnostic output, scenario output, save schema, event content, calibration, or generated artifact bytes changed.

## Scope

- Added `tests/data_derived_debug_artifact_ownership.test.ts`.
- Updated `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md` with the `data/derived/_debug/**` wildcard row.
- Updated closeout indices, command board, engine-quality plan, and project ledger.

## Non-Changes

- Did not run scenarios.
- Did not touch event content, calibration, save schema, migrations, validators, scenario outputs, or generated artifacts.
- Did not promote any file under `data/derived/_debug/`.

## Verification

- Red first: `F:\A-War-Without-Victory\vitest.cmd run tests\data_derived_debug_artifact_ownership.test.ts --reporter=dot` failed because the ownership matrix had no `data/derived/_debug/**` row.
- `F:\A-War-Without-Victory\vitest.cmd run tests\data_derived_debug_artifact_ownership.test.ts --reporter=dot` - PASS; 1/1 test.
- `F:\A-War-Without-Victory\vitest.cmd run tests\diagnostics_output_artifact_ownership.test.ts tests\desktop_packaging_contract.test.ts tests\desktop_packaging_extraresources_filter.test.ts --reporter=dot` - PASS; 10/10 tests.
- `git ls-files data/derived/_debug` - PASS; no tracked files returned.
- `git diff --check` - PASS.
