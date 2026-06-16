# Engine-Health CI Dependency Hardening

## Summary

The Baseline Regression `engine-health-188w` required check now runs under `if: always()` and fails explicitly when its upstream `scenarios` job does not conclude successfully. This closes the comment-sweep risk where a failed/skipped upstream scenario job could prevent the required engine-health job from giving its own clear red signal.

## Scope

- `.github/workflows/baseline-regression.yml`

## Behavior

- If `scenarios` succeeds, `engine-health-188w` behaves as before: it runs the existing SIM path gate, executes the 188w engine-health run only for relevant paths, and reports a green no-op on non-sim changes.
- If `scenarios` fails, is cancelled, or is skipped, `engine-health-188w` now starts and fails at `Require upstream scenario gate` with the upstream conclusion in the log.

## Verification

- `npx.cmd prettier --check .github/workflows/baseline-regression.yml`
- `git diff --check`

No simulation logic, scenario data, calibration floor, save schema, baselines, or packaged artifacts changed.
