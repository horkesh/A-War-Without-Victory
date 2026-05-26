# Latest Run Final Save Map-Copy Ownership

**Date:** 2026-05-26
**Run ID:** Not applicable
**Baseline:** `--map` scenario runner copied `final_save.json` inline
**Result:** Byte-equivalence proof now covers the generated latest-run map artifact

## Summary
- Extracted the `--map` final-save copy into an exported scenario-runner helper while preserving CLI behavior and tactical-map log text.
- Added a temp-root Vitest proof that `data/derived/latest_run_final_save.json` receives byte-identical source bytes without touching the tracked artifact.
- Updated generated-artifact ownership docs so the latest-run final save has a focused validation command instead of `None`.

## Changes Made
### Scenario Harness
- `tools/scenario_runner/run_scenario.ts` now exports `copyFinalSaveToLatestRun(finalSavePath, repoRoot)` and uses it for the existing `--map` copy path.
- The CLI module now uses an ESM direct-run guard so tests can import the helper without running a scenario.

### Validation
- `tests/scenario_latest_run_final_save_map_copy.test.ts` creates a temporary repo root and temporary `final_save.json`, calls the helper, and compares copied bytes against the source bytes.

### Documentation
- `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md` now names the focused validation command for `data/derived/latest_run_final_save.json`.
- Closeout indexes, command board, and ledger now record the artifact ownership proof.

## Scenario Results
Not applicable. No real `--map` scenario was run and no generated artifact or baseline was refreshed.

## Lessons Learned
- `latest_run_final_save.json` remains transient by default, but its copy path now has direct ownership/equivalence coverage independent of scenario execution.

## Verification
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\scenario_latest_run_final_save_map_copy.test.ts --reporter=dot` - PASS; 1/1 test.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\scenario_latest_run_final_save_map_copy.test.ts tests\save_load_real_roundtrip.test.ts tests\adapter_field_completeness.test.ts --reporter=dot` - PASS after temporarily linking this dependency-light worktree to the already-installed root and map UI dependency folders; 34/34 tests.
- `git diff --check` - PASS.

## Files Changed
| File | Change |
|------|--------|
| `tools/scenario_runner/run_scenario.ts` | Extracted map-copy helper and added direct-run guard |
| `tests/scenario_latest_run_final_save_map_copy.test.ts` | Added byte-equivalence helper test |
| `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md` | Replaced `None` validation with focused command |
| `docs/40_reports/implemented/20260526_LATEST_RUN_FINAL_SAVE_MAP_COPY_OWNERSHIP.md` | Added implementation report |
| `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` | Registered report |
| `docs/40_reports/README.md` | Registered report |
| `docs/plans/COMMAND_BOARD.md` | Updated Phase 3 save/replay proof status |
| `docs/PROJECT_LEDGER.md` | Added append-only ledger entry |

## Next Steps
- Continue Phase 3 with another mapped artifact-owner check before removing or consolidating writes.
