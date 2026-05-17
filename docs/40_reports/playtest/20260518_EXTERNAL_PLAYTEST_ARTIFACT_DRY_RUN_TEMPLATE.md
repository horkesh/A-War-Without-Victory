# External Playtest Artifact Dry-Run Template

**Operator:**
**Commit SHA:**
**Package version:**
**Artifact path:**
**Artifact SHA-256:**
**Clean-VM evidence path:**
**Tester packet path:**
**Feedback form link:**

## Artifact Identity

Use only the exact artifact that passed clean-VM validation. The SHA-256 in this report must match the release evidence and clean-VM evidence.

Dry-run command:

```powershell
npm.cmd run launch:artifacts:dry-run -- --artifact dist-packaged\<artifact-name> --channel external-playtest --format markdown
```

## Distribution Readiness

| Check | Evidence | Result | Notes |
|---|---|---|---|
| Artifact hash matches release evidence | release evidence path | pending | |
| Artifact hash matches clean-VM evidence | clean-VM evidence path | pending | |
| Known issues included | `docs/50_launch/release/known_issues.md` | pending | |
| Tester quickstart included | `docs/playtesting/v092/tester_quickstart.md` | pending | |
| Feedback form matches schema | `docs/playtesting/v092/feedback_form_schema.md` | pending | |
| Crash/log guidance present | tester packet path | pending | |
| Privacy note present | tester packet path | pending | |
| Intake owner assigned | operator name | pending | |

## Dry-Run Walkthrough

| Step | Result | Notes |
|---|---|---|
| Download / transfer artifact | pending | |
| Install or run artifact | pending | |
| First launch | pending | |
| Start recommended scenario | pending | |
| Save/load | pending | |
| Find known issues | pending | |
| Submit feedback | pending | |
| Submit crash/log artifact | pending | |

## Blockers

| Severity | Finding | Owner |
|---|---|---|

## Verdict

- External distribution approved: pending
- Approved artifact SHA-256:
- Operator-only remaining work:
