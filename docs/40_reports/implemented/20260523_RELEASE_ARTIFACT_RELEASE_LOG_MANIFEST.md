# Release Artifact Release-Log Manifest

**Date:** 2026-05-23
**Plans:** `docs/plans/2026-05-18-autonomous-save-replay-determinism-bank.md` SRD-3 and `docs/plans/2026-05-18-autonomous-platform-packaging-bank.md` PPB-1.

## Scope

This repo-side packaging slice reduces manual transcription risk in release evidence. `tools/release/prepare_launch_artifacts.cjs` now emits a deterministic `artifactReleaseLog` field when an artifact path exists:

```text
launch_artifact target=<path> sizeBytes=<bytes> sha256=<sha256>
```

The same row appears in markdown dry-run output. Missing artifacts keep `artifactReleaseLog: null`.

## Determinism Boundary

The row is derived only from a supplied artifact path, file size, and SHA-256. It uses no timestamps, randomness, network calls, uploads, signing hooks, or writes. It does not build packages and does not approve distribution.

## Operator Boundary

Still operator-only and not repo-proven:

- clean-VM install / launch / save-load / uninstall evidence
- SmartScreen wording
- Settings -> Apps registration
- AppData persistence
- NSIS registry cleanup
- code signing / Microsoft Store / macOS notarization
- public release or external playtest distribution

## Verification

```powershell
npx.cmd vitest run tests\launch_operator_artifacts.test.ts --reporter=dot
node --check tools\release\prepare_launch_artifacts.cjs
node tools\release\prepare_launch_artifacts.cjs --dry-run --artifact dist-packaged\DOES_NOT_EXIST.exe --commit TEST_SHA --package-version 0.0.0-test --format markdown
git diff --check
```
