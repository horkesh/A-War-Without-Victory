# Replay Manifest Ownership Equivalence

**Date:** 2026-05-26
**Lane:** P1 Save/load/replay and generated-artifact stability
**Owner:** scenario-harness-engineer implementation, determinism/QA review

## Summary

The scenario harness now exposes the sparse desktop replay sidecar path in `RunScenarioResult.paths.replay_save_manifest` alongside `replay_save_sequence`. The existing save-continue equivalence proof now compares the resumed sparse manifest frames against the uninterrupted manifest tail, matching the desktop loader's preference for `replay_save_manifest.json` before falling back to the full sequence.

The generated-artifact ownership matrix now names `runs/<scenario_run>/replay.jsonl`, `runs/<scenario_run>/replay_save_sequence.json`, and `runs/<scenario_run>/replay_save_manifest.json` as transient run-output sidecars with their owner commands and validation tests.

## Files

- `src/scenario/scenario_runner.ts`
- `tests/scenario_continue_from_save_equivalence.test.ts`
- `tests/replay_save_emit.test.ts`
- `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md`
- `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`
- `tests/save_migration_counter_offers.test.ts`
- `tests/state/player_faction_contract.test.ts`
- `tests/strict_null_inventory_progress.test.ts`

## Verification

- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\scenario_continue_from_save_equivalence.test.ts tests\replay_save_emit.test.ts tests\replay_player.test.ts --reporter=dot` - PASS, 18/18 tests.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\save_migration_counter_offers.test.ts tests\state\player_faction_contract.test.ts tests\strict_null_inventory_progress.test.ts --reporter=dot` - PASS, 95/95 tests.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\scenario_continue_from_save_equivalence.test.ts tests\replay_save_emit.test.ts tests\replay_player.test.ts tests\docs_truth_no_skip_guard.test.ts tests\startup_snapshot_contract.test.ts --reporter=dot` - PASS, 25/25 tests.
- `F:\A-War-Without-Victory\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json` - PASS, using a temporary worktree junction to the already-installed map UI dependencies; junction removed after the run.
- `npm.cmd run test:baselines` - PASS, using a temporary worktree junction to root dependencies; `Baseline regression: all scenarios match`; junction removed after the run.
- `git diff --check` - PASS.

## Notes

No scenario data, event data, GUI presentation, baseline artifacts, save schema, migration, calibration tuning, or generated committed artifacts changed. The change is path metadata, tests, ownership documentation, and CI fixture repair for the already-merged v10 army-command schema contract.
