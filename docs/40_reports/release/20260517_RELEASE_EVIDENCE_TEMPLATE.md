# Release Evidence Template

**Release candidate:**
**Date:**
**Owner:**
**Commit SHA:**
**Tag:**
**Artifact path:**
**Artifact SHA-256:**

## Command Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Typecheck | `npm.cmd run typecheck` | pending | |
| Fast tests | `npm.cmd run test:vitest:fast` | pending | |
| Scenario tests | `npm.cmd run test:vitest:scenario` | pending | |
| Desktop release guard | `npm.cmd run desktop:release:check` | pending | |
| Package probe | `npm.cmd run desktop:package:probe` | pending | |
| NSIS smoke | `npm.cmd run desktop:package:win:nsis:smoke -- --report-only` | pending | |

## Recommended Evidence Policy

Automated release evidence and clean-VM evidence are separate. Do not mark this report complete from CI/package smoke alone. Record the exact artifact SHA-256 here, then use that same artifact for clean-VM validation.

Automated evidence should include typecheck, fast tests, scenario tests, desktop release guard, packaged runtime probe, NSIS build/smoke, installer size, and SHA-256.

Clean-VM evidence should include Windows version, VM snapshot identity, SmartScreen wording, Settings -> Apps entry, Start Menu/shortcut launch, new campaign, one-turn advance, save/relaunch/load/advance, `%APPDATA%` persistence, uninstall cleanup, and registry cleanup.

## Scenario / Save Evidence

- scenario run:
- final hash:
- anchors/benchmarks:
- save/load smoke:

## UI / Launch Evidence

- first launch:
- settings/accessibility:
- known issues reviewed:
- rollback criteria reviewed:

## Waivers

| Criterion | Owner | Evidence reviewed | Expiry | Player-visible? | Rollback implication |
|---|---|---|---|---|---|

## Sign-Off

- release owner:
- product owner:
- technical owner:
