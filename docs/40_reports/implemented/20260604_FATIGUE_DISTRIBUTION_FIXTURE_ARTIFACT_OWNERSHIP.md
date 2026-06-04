# Fatigue Distribution Fixture Artifact Ownership

**Date:** 2026-06-04
**Branch:** `codex/generated-artifact-owner-slice`
**Lane:** Save/load/replay and generated-artifact stability

## Summary

The committed compact fatigue-distribution replay fixture at `tests/fixtures/fatigue_distribution/compact_run/` now has an explicit generated-artifact ownership matrix row and a static ownership guard.

This is a docs/test-only closeout. No fixture bytes, scenario outputs, replay writers, fatigue logic, combat logic, save schema, calibration, UI, or player-facing behavior changed.

## Ownership Contract

The compact fixture is retained static diagnostic evidence for `tests/fatigue_distribution_audit_diagnostic.test.ts`. It is not a refresh target and should not be confused with transient `runs/<scenario_run>/replay_save_sequence.json` sidecars.

The fixed file set is:

- `tests/fixtures/fatigue_distribution/compact_run/replay_save_sequence.json`
- `tests/fixtures/fatigue_distribution/compact_run/run_summary.json`

The guard proves the ownership row exists, names the consumer and ownership guard, classifies the fixture as committed static evidence, pins the tracked file set, and keeps the synthetic two-turn fixture shape intact.

## Verification

- Red proof: `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\fatigue_distribution_replay_fixture_artifact_ownership.test.ts --reporter=dot` failed before the matrix row because the fixture was not listed.
- Green proof: `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\fatigue_distribution_replay_fixture_artifact_ownership.test.ts tests\fatigue_distribution_audit_diagnostic.test.ts tests\generated_artifact_ownership_matrix_contract.test.ts --reporter=dot`.
- Whitespace: `git diff --check`.

## Files

- `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md`
- `tests/fatigue_distribution_replay_fixture_artifact_ownership.test.ts`
- `docs/40_reports/implemented/20260604_FATIGUE_DISTRIBUTION_FIXTURE_ARTIFACT_OWNERSHIP.md`
- `docs/40_reports/README.md`
- `docs/plans/COMMAND_BOARD.md`
- `docs/plans/MASTER_ROADMAP.md`
- `docs/PROJECT_LEDGER.md`
