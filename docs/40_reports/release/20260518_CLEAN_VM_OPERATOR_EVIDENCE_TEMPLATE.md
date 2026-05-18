# Clean-VM Operator Evidence Template

**Release candidate:**
**Operator initials:**
**Commit SHA:**
**Tag:**
**Package version:**
**Artifact path:**
**Artifact SHA-256:**
**VM image / snapshot identity:**
**Host OS + build number (Windows):**
**Host distro + kernel (Linux):**
**Run date (operator entry — not a generated timestamp):**

## Scope Statement

This template records manual clean-VM evidence only. Automated package smoke proves artifact shape and identity; it does not prove SmartScreen behavior, Windows install registration, save persistence, shortcut launch, or uninstall cleanup.

## Repo-proven vs operator-only

> **This template is NOT repo-proven.** No row below can be closed by an
> autonomous worker or by CI alone. Each row requires an operator on a
> clean VM with the exact artifact SHA-256 recorded above. If a row is
> marked PASS without an operator-supplied screenshot path or transcript,
> the row MUST be reverted to `pending` by the next reviewer.

## Windows Clean-VM Checklist

| Check | Evidence (path/transcript) | OS build captured | Screenshot path | Result | Operator initials | Notes |
|---|---|---|---|---|---|---|
| VM starts from clean snapshot | snapshot name / image hash | | | pending | | |
| Installer SHA-256 matches release evidence | hash copied from artifact | | | pending | | |
| SmartScreen wording captured | transcript verbatim | | | pending | | |
| Installer completes | log path | | | pending | | |
| Start Menu or desktop shortcut launches app | shortcut path | | | pending | | |
| Settings -> Apps entry shows correct name/version | entry name + version | | | pending | | |
| First launch reaches side picker or current first-run surface | surface name | | | pending | | |
| New campaign starts | faction / scenario | | | pending | | |
| One-turn advance completes | save/report path | | | pending | | |
| Save, quit, relaunch, load succeeds | save path | | | pending | | |
| `%APPDATA%` persistence path exists | path | | | pending | | |
| Uninstaller completes | log path | | | pending | | |
| App files removed after uninstall | path check | | | pending | | |
| Registry uninstall entry removed | registry path check | | | pending | | |

## Linux Clean-VM Checklist

| Check | Evidence (path/transcript) | Distro/version captured | Screenshot path | Result | Operator initials | Notes |
|---|---|---|---|---|---|---|
| VM starts from clean snapshot | distro/version | | | pending | | |
| AppImage SHA-256 matches release evidence | hash copied from artifact | | | pending | | |
| FUSE2 dependency behavior understood | package state / notes | | | pending | | |
| AppImage launches | terminal log path | | | pending | | |
| New campaign starts | faction / scenario | | | pending | | |
| Save, quit, relaunch, load succeeds | save path | | | pending | | |

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
