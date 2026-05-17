# Launch-Day Automation Template

**Purpose:** Copy-ready launch operator sequence for a release candidate. Fill this from a clean checkout. Do not mark distribution approved until the exact artifact SHA-256 has automated evidence and clean-VM evidence.

## Release Candidate

- package version:
- commit SHA:
- tag:
- channel: gold / external-playtest
- artifact path:
- artifact SHA-256:
- operator:
- distribution approved: pending

## Dry-Run Manifest

Run before packaging or distribution:

```powershell
npm.cmd run launch:artifacts:dry-run -- --artifact dist-packaged\<artifact-name>
```

Expected dry-run posture:

- `distributionApproved` is `false`
- `cleanVmRequiredBeforeDistribution` is `true`
- `noCleanVmEvidenceClaimed` is `true`
- artifact `sha256` is present only when the artifact file exists

## Automated Gate Commands

Run from a clean checkout:

```powershell
git status --short
npm.cmd run typecheck
npm.cmd run test:vitest:fast
npm.cmd run test:vitest:scenario
npm.cmd run desktop:release:check
npm.cmd run desktop:package:probe
npm.cmd run desktop:package:win:nsis
npm.cmd run desktop:package:win:nsis:smoke -- --report-only
npm.cmd run launch:artifacts:dry-run -- --artifact dist-packaged\<artifact-name> --format markdown
```

## Fill Evidence

- Release evidence: `docs/40_reports/release/20260517_RELEASE_EVIDENCE_TEMPLATE.md`
- Clean-VM evidence: `docs/40_reports/release/20260518_CLEAN_VM_OPERATOR_EVIDENCE_TEMPLATE.md`
- External playtest dry run: `docs/40_reports/playtest/20260518_EXTERNAL_PLAYTEST_ARTIFACT_DRY_RUN_TEMPLATE.md`

## Publish Sequence

1. Freeze non-blocking feature work.
2. Confirm clean working tree and matching tag/package version.
3. Build and smoke the platform artifacts.
4. Record SHA-256, size, and exact artifact path.
5. Complete clean-VM operator evidence for the same SHA-256.
6. Update known issues and release notes.
7. Publish binaries, release notes, store page, and announcements in that order.
8. Monitor install, launch, save/load, crash, and sensitive-history feedback for the launch window.

## Stop Gates

- Artifact hash differs between release evidence, clean-VM evidence, and playtest dry-run evidence.
- Clean-VM evidence is missing for the distributed artifact.
- SmartScreen, Settings -> Apps, save persistence, or uninstall cleanup cannot be verified.
- A P0 crash, save/load corruption, or sensitive-history misrepresentation is found.
- Telemetry/privacy behavior differs from the approved default-off local-first policy.
