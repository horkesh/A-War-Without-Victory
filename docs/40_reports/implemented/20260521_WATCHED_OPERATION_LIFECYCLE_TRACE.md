# Watched Operation Lifecycle Trace

**Date:** 2026-05-21
**Result:** Triggered-operation skip/block/inject outcomes now persist as deterministic watched-operation trace rows and a scenario-runner artifact.

## Summary

- Added compact lifecycle trace rows for triggered operations when they are skipped, blocked, or injected.
- Wrote those rows to `watched_operations.json` from the scenario runner and added that artifact to the baseline manifest.
- Preserved H1's evidence-first rule: this changes observability and output contracts only, not operation tuning, objectives, OOB, or sensitive-history outcomes.

## Changes Made

### Triggered Operation Trace

- `src/sim/combat/triggered_operations.ts` records `state.military.watched_operations` rows for active primary corps, active secondary corps, decline/cooldown state, already-owned objectives, empty live axes, validation warnings/blockers, build failure, and accepted/injected outcomes.
- Trace rows use stable fields: operation name/id, canonical window, catalog/eligibility/launch/delivery status, typed blocker, and turn.
- Rows are updated compactly when the same operation/status/blocker recurs, and ordered deterministically by turn, operation, launch status, and blocker.

### Scenario Artifact

- `src/scenario/scenario_runner.ts` writes `watched_operations.json` in deterministic order from `state.military.watched_operations`.
- `tools/scenario_runner/run_baseline_regression.ts` now includes `watched_operations.json` in the golden artifact list.
- `data/derived/scenario/baselines/manifest.json` was regenerated after the intentional output-contract change.

## Scenario Results

`apr1992_52w` now emits three watched-operation trace rows:

- `Operation Herzegovina Consolidation`: launched at turn 14.
- `Operation Cerska-Kamenica`: catalog-present, not launched, latest blocker `build_failure` at turn 52.
- `Operation Kotor Varos`: catalog-present, not launched, latest blocker `already_owned_objectives` at turn 52.

The existing 188w H1 sensitive-history diagnostic remains evidence-first; this lane adds the persistence boundary needed before further H1 report projection or tuning.

## Determinism

No randomness, timestamps, unordered filesystem reads, or wall-clock values were introduced. Trace row ordering uses `strictCompare`, scenario output uses `stableStringify`, and the baseline manifest now proves `watched_operations.json` with the other scenario artifacts.

## Verification

- `npx.cmd vitest run tests/triggered_operations.test.ts --reporter=dot` PASS (16/16)
- `npx.cmd vitest run tests/triggered_operations.test.ts tests/sensitive_history_status_diagnostic.test.ts --reporter=dot` PASS (21/21)
- `npm.cmd run typecheck` PASS
- `npm.cmd run test:baselines` PASS after manifest refresh

## Next Steps

- Project the persisted trace rows into the H1 sensitive-history status packet for fresh 188w runs.
- Use the preserved blocker reasons to decide whether H1 needs report projection only or a later behavior-tuning lane.
- Do not tune watched-operation outcomes until the trace rows identify the binding blocker in the target 188w run.
