# Desktop Startup Snapshot Refresh

**Date:** 2026-05-23
**Status:** Implemented and locally verified
**Lane:** Desktop packaging / reproducible startup artifact
**Scope:** Refreshes the baked April 1992 desktop startup snapshot to current canonical builder truth. No code, scenario source data, combat math, operation behavior, save schema, UI behavior, calibration, or painted target logic changed.

## Summary

The map/scenario queue-cursor slice exposed a pre-existing desktop release blocker: `tests\startup_snapshot_contract.test.ts` and `tests\desktop_sim_bundle_smoke.test.ts` failed because the baked `apr_1992` startup artifact had drifted from the canonical builder.

This lane refreshes `data/derived/startup/apr_1992_initial_save.json` using the canonical writer:

`npm.cmd run desktop:startup-snapshot:build`

## Determinism

- The artifact was produced by `tools/scenario_runner/build_startup_snapshot.ts --write`.
- The check path rebuilt the same canonical payload and matched the committed artifact.
- No timestamps or random output fields were introduced.
- No pipeline entrypoint changed; this preserves the desktop startup contract described in `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`.

## Verification

| Check | Result |
|---|---|
| Snapshot build | PASS: `npm.cmd run desktop:startup-snapshot:build` wrote `data\derived\startup\apr_1992_initial_save.json`. |
| Snapshot check | PASS: `npm.cmd run desktop:startup-snapshot:check`. |
| Desktop snapshot and bundle tests | PASS, 9/9: `tests\startup_snapshot_contract.test.ts`, `tests\desktop_sim_bundle_smoke.test.ts`, and `tests\desktop_startup_snapshot_guardrails.test.ts`. |
| Diff hygiene | PASS: `git diff --check`. |

## Files Changed

| File | Change |
|---|---|
| `data/derived/startup/apr_1992_initial_save.json` | Refreshed baked desktop startup artifact to canonical builder truth. |
