# Launch Artifact Ownership

**Date:** 2026-06-05

**Status:** Implemented

**Lane:** Save/load/replay and generated-artifact stability; platform release evidence

## Summary

Packaged desktop outputs under `dist-packaged/...` are now explicitly represented in the generated-artifact ownership matrix as operator-owned transient artifacts. The row names package/build owner commands, points release identity capture to the existing launch artifact dry-run planner, and states that packaged binaries or installer outputs must not be committed.

This is documentation/test hardening only. It does not build packages, hash a real release artifact, upload a release, claim clean-VM evidence, change packaging behavior, change simulation output, alter save schema, or move baselines.

## Contract

- `dist-packaged/` stays ignored.
- Package outputs are always transient.
- Release/playtest evidence may record the exact artifact path, size, SHA-256, and operator/clean-VM status.
- Distribution still requires exact-artifact dry-run evidence and clean-VM approval.

## Files

- `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md`
- `tests/launch_artifact_ownership.test.ts`
- report, board, roadmap, ledger, and knowledge-ledger updates

## Verification

- `npx.cmd vitest run tests\launch_artifact_ownership.test.ts tests\launch_operator_artifacts.test.ts tests\generated_artifact_ownership_matrix_contract.test.ts --reporter=dot`
- `npm.cmd run typecheck -- --pretty false`
- `git diff --check`

## Next

Continue the save/replay/generated-artifact lane with another mapped artifact-owner check before changing any writer behavior.
