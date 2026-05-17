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
