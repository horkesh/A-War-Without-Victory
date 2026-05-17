# Clean-VM Operator Evidence Template

**Release candidate:**
**Operator:**
**Commit SHA:**
**Tag:**
**Package version:**
**Artifact path:**
**Artifact SHA-256:**
**VM image / snapshot identity:**

## Scope Statement

This template records manual clean-VM evidence only. Automated package smoke proves artifact shape and identity; it does not prove SmartScreen behavior, Windows install registration, save persistence, shortcut launch, or uninstall cleanup.

## Windows Clean-VM Checklist

| Check | Evidence | Result | Notes |
|---|---|---|---|
| VM starts from clean snapshot | snapshot name / image hash | pending | |
| Installer SHA-256 matches release evidence | hash copied from artifact | pending | |
| SmartScreen wording captured | screenshot path / transcript | pending | |
| Installer completes | screenshot / log | pending | |
| Start Menu or desktop shortcut launches app | screenshot / notes | pending | |
| Settings -> Apps entry shows correct name/version | screenshot | pending | |
| First launch reaches side picker or current first-run surface | screenshot | pending | |
| New campaign starts | faction / scenario | pending | |
| One-turn advance completes | save/report path | pending | |
| Save, quit, relaunch, load succeeds | save path | pending | |
| `%APPDATA%` persistence path exists | path | pending | |
| Uninstaller completes | screenshot / log | pending | |
| App files removed after uninstall | path check | pending | |
| Registry uninstall entry removed | registry path check | pending | |

## Linux Clean-VM Checklist

| Check | Evidence | Result | Notes |
|---|---|---|---|
| VM starts from clean snapshot | distro/version | pending | |
| AppImage SHA-256 matches release evidence | hash copied from artifact | pending | |
| FUSE2 dependency behavior understood | package state / notes | pending | |
| AppImage launches | screenshot / terminal log | pending | |
| New campaign starts | faction / scenario | pending | |
| Save, quit, relaunch, load succeeds | save path | pending | |

## Findings

| Severity | Finding | Owner | Release impact |
|---|---|---|---|

## Verdict

- Clean-VM evidence complete for this exact artifact: pending
- Distribution approved for this exact artifact: pending
- Operator-only follow-up:

## Sign-Off

- release operator:
- product owner:
- technical owner:
