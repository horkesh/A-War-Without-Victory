# Codex Review Thread Cleanup

**Date:** 2026-06-04

## Summary

Closed four unresolved Codex review threads that were still open on already-merged PRs:

- PR #144: final scenario serialization now passes full operational edges and a final spatial context into `sealFinalSectorTruthFromCurrentSectors(...)`.
- PR #148: scenario-authored `decision_mode` is now normalized, typed, returned by `normalizeScenario(...)`, and applied to scenario startup state.
- PR #150: event-constraint doctrine overrides now validate `forced_stance` against the live corps-stance vocabulary: `defensive`, `balanced`, `offensive`, `reorganize`.
- PR #151: patron-defiance supply-cut receipts now reject `RBiH` rows, matching the no-coercive-patron severity contract.

No operation catalog, OOB, event prose, UI routing, or player-facing command behavior changed. The scenario baseline manifest was refreshed because the final-save seal correction changes terminal serialization hashes: the long 52-week baseline moves four formations from rear to reserve in the final snapshot, while weekly/control/activity/formation/watched-operation artifacts remain stable. The shorter scenario reports also receive new `end_report.md`/`run_summary.json` hashes because their run identity/source hash changes.

## Verification

```powershell
node node_modules\vitest\vitest.mjs run tests\scenario_player_faction_contract.test.ts tests\scenario_runner_final_seal_contract.test.ts tests\scenario_runner_artifact_repair.test.ts tests\save_migration_validator_rejection.test.ts tests\events_evaluate.test.ts tests\ai_commander_validation.test.ts --reporter=dot
node node_modules\vitest\vitest.mjs run tests\sector_partition_instrumentation.test.ts --reporter=dot
node node_modules\vitest\vitest.mjs run tests\scenario_continue_from_save_equivalence.test.ts --reporter=dot
npm.cmd run typecheck -- --pretty false
node node_modules\tsx\dist\cli.mjs tools\scenario_runner\run_baseline_regression.ts
git diff --check
```

Observed:

- focused scenario/save/event/AI validation pack: 6 files / 186 tests passed
- sector partition instrumentation static contracts: 28 tests passed
- scenario continue-from-save equivalence: 2 tests passed
- typecheck: pass
- baseline regression: pass after manifest refresh
- diff whitespace: pass

## GitHub Sweep

Deployments API returned `[]`.

Review-thread GraphQL found four unresolved non-outdated Codex review threads on merged PRs #144, #148, #150, and #151. This report covers their cleanup. Earlier Codex comments on PRs #138/#139/#140/#141/#142/#143 were either clean-review acknowledgements or previously addressed review cycles.

## Files

- `src/scenario/scenario_loader.ts`
- `src/scenario/scenario_runner.ts`
- `src/scenario/scenario_types.ts`
- `src/state/validateGameState.ts`
- `tests/scenario_player_faction_contract.test.ts`
- `tests/scenario_runner_final_seal_contract.test.ts`
- `tests/scenario_continue_from_save_equivalence.test.ts`
- `tests/sector_partition_instrumentation.test.ts`
- `tests/save_migration_validator_rejection.test.ts`
- `data/derived/scenario/baselines/manifest.json`
- `docs/40_reports/implemented/20260604_CODEX_REVIEW_THREAD_CLEANUP.md`
- `docs/PROJECT_LEDGER.md`
- `docs/40_reports/README.md`
- `docs/plans/MASTER_ROADMAP.md`
- `docs/plans/COMMAND_BOARD.md`
- `.claude/napkin.md`
