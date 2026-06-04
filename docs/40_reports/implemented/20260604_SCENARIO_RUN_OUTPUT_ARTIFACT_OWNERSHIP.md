# Scenario Run Output Artifact Ownership

Date: 2026-06-04
Branch: `codex/no-data-military-credibility`
Type: Generated-artifact ownership guard

## Summary

The broad `runs/<scenario_run>/...` catch-all row now has a focused static ownership guard. Replay-specific sidecars were already guarded, but the broad scenario run-output class still cited no validation command. The new test locks the default policy that scenario run directories are ignored, transient, and must not be committed.

## Scope

This is a process/static ownership change only. It does not refresh, delete, or write scenario outputs, replay sidecars, baselines, PMTiles, painted diagnostics, force-quality diagnostics, or other generated artifacts.

## Verification

- Red first: `F:\A-War-Without-Victory\vitest.cmd run tests\scenario_run_output_artifact_ownership.test.ts --reporter=dot` failed until the ownership matrix cited the new guard.
- Green focused guard: `F:\A-War-Without-Victory\vitest.cmd run tests\scenario_run_output_artifact_ownership.test.ts --reporter=dot` passed 1/1.
- Matrix/meta guard: `F:\A-War-Without-Victory\vitest.cmd run tests\generated_artifact_ownership_matrix_contract.test.ts --reporter=dot` passed 1/1.
- `git diff --check` passed.

## Follow-Up

The generated-artifact stability lane remains active for the next mapped owner check before any writer behavior changes.
