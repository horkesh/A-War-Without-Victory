# External Playtest Dry-Run Template

**Date:**
**Operator:**
**Commit SHA:**
**Artifact path:**
**Artifact SHA-256:**
**Tester packet path:**

## Objective

Run the playtest instructions without internal repo knowledge. Record whether install, launch, first objective, save/load, crash reporting guidance, and feedback submission are understandable.

## Results

| Step | Result | Notes |
|---|---|---|
| Install | pending | |
| First launch | pending | |
| First objective | pending | |
| Save/load | pending | |
| Feedback submission | pending | |
| Crash/log guidance | pending | |

## Blockers

| Severity | Finding | Owner |
|---|---|---|

## Verdict

External distribution approved: pending

## Recommended Playtest Policy

Use only the exact artifact that passed clean-VM validation. Record its SHA-256 above before distribution.

For public pre-release Steam testing, prefer Steam Playtest where available: it uses a separate child appID, allows access gating, and avoids mixing playtest behavior with the main game's reviews, wishlist, refunds, or playtime. For confidential tests, use hidden Playtest keys or main-app release override keys with a separate NDA/intake process.

Use `docs/40_reports/playtest/20260518_EXTERNAL_PLAYTEST_ARTIFACT_DRY_RUN_TEMPLATE.md` for the artifact-specific dry run and run:

```powershell
npm.cmd run launch:artifacts:dry-run -- --artifact dist-packaged\<artifact-name> --channel external-playtest --format markdown
```
