# Replay Sidecar Artifact Ownership

**Date:** 2026-05-26
**Result:** Replay sidecar static ownership guard is closed.

## Summary

- `tests/replay_artifact_ownership.test.ts` now guards replay sidecar ownership for `runs/<scenario_run>/replay_sequence.jsonl` and `runs/<scenario_run>/replay_timeline.json`.
- `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md` now documents both sidecars as transient run outputs owned by the scenario runner / video replay path.
- The guard also keeps existing replay sidecar rows present, proves `replay_sequence.jsonl` is written/finalized before `streamFinalizeReplaySaveSequenceFromJsonl(...)` consumes it, proves `replay_timeline.json` is gated by `emitWeeklySavesForVideo`, and proves `runs/` has no committed artifacts.

## Verification Commands

- Red first: `F:\A-War-Without-Victory\vitest.cmd run tests\replay_artifact_ownership.test.ts --reporter=dot` - FAIL before the ownership rows because `replay_sequence.jsonl` was missing from the matrix.
- Focused guard: `F:\A-War-Without-Victory\vitest.cmd run tests\replay_artifact_ownership.test.ts --reporter=dot` - PASS; 1/1 test.
- Follow-up replay pack: `F:\A-War-Without-Victory\vitest.cmd run tests\replay_artifact_ownership.test.ts tests\replay_save_emit.test.ts tests\replay_surface_truth.test.ts --reporter=dot` - PASS; 13/13 tests.
- Artifact absence: `git ls-files runs` - PASS; no tracked paths returned.
- Whitespace check: `git diff --check` - PASS.

## Residual Risk

- This is a static guard only. It does not invoke scenario runs or refresh replay artifacts.
