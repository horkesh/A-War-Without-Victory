# LANE-V095-CI-PACKAGE-MATRIX — Implementation Report

**Date:** 2026-05-05
**Lane:** `LANE-V095-CI-PACKAGE-MATRIX`
**Audit ref:** `docs/40_reports/audits/20260505_V095_PLATFORM_PACKAGING_AUDIT.md` (LANE 3)
**Closes:** P1-G5 (CI does not exercise `desktop:package:linux:appimage`), P1-G6 (CI does not exercise `desktop:package:win:nsis`)
**Partial:** QW-4 (full execution, not just `--report-only` wiring)
**Ring:** N/A (CI workflow is sim-orthogonal infrastructure)

## Summary

Extended `.github/workflows/desktop-release-guard.yml` so:

- The existing `desktop-release-check` (ubuntu-latest) job, after `desktop:release:check`, now also runs the real Linux AppImage build (`desktop:package:linux:appimage`), then smoke-verifies the artifact (`desktop:package:linux:appimage:smoke -- --report-only`), and uploads the resulting `.AppImage` as a workflow artifact.
- The existing `desktop-packaged-runtime-probe` (windows-latest) job, after `desktop:package:probe`, now also runs the real Windows NSIS build (`desktop:package:win:nsis`), then smoke-verifies the installer (`desktop:package:win:nsis:smoke -- --report-only`), and uploads the `.exe` as a workflow artifact.
- Both jobs cache `~/.cache/electron-builder` and `~/.electron` via `actions/cache@v4` keyed on `runner.os` + `hashFiles('package-lock.json', 'package.json')`, with `restore-keys` fallback per-OS.
- All existing steps were preserved verbatim and in their original positions; new steps are appended after the existing ones.

## File changes

| File | Change | Lines added |
| --- | --- | --- |
| `.github/workflows/desktop-release-guard.yml` | Extended both jobs with cache + package + smoke + artifact-upload steps | +58 (file went 48 → 106 lines) |
| `docs/40_reports/implemented/20260505_V095_CI_PACKAGE_MATRIX.md` | NEW — this report | new file |

### Step-count delta

- `desktop-release-check`: 6 steps → 10 steps (added cache, package, smoke, upload).
- `desktop-packaged-runtime-probe`: 6 steps → 10 steps (added cache, package, smoke, upload).

### What was added (per job)

Linux job (after the existing release-check step):
1. Cache `~/.cache/electron-builder` + `~/.electron`.
2. `npm run desktop:package:linux:appimage`.
3. `npm run desktop:package:linux:appimage:smoke -- --report-only`.
4. `actions/upload-artifact@v4` → `desktop-linux-appimage` (`dist-packaged/*.AppImage`, retention 14 days, `if-no-files-found: warn`, `if: always()`).

Windows job (after the existing probe step):
1. Cache `~/.cache/electron-builder` + `~/.electron`.
2. `npm run desktop:package:win:nsis`.
3. `npm run desktop:package:win:nsis:smoke -- --report-only`.
4. `actions/upload-artifact@v4` → `desktop-win-nsis` (`dist-packaged/*.exe`, retention 14 days, `if-no-files-found: warn`, `if: always()`).

### What was NOT touched

- `.github/workflows/release.yml` — sibling lane (P1-G8) creates this file.
- `package.json` — out of scope. (Verified all four referenced npm scripts already exist at lines 91-94.)
- `electron-main.cjs`, `build/*`, `tools/release/*`, `docs/RELEASE_PROCESS.md`, `docs/40_reports/PLATFORM_TEST_MATRIX.md` — sibling lanes own these.
- Any sim/combat code.

## Verification approach

1. **Existing scripts confirmed present** in `package.json`:
   - `desktop:package:linux:appimage` (line 91)
   - `desktop:package:linux:appimage:smoke` (line 92)
   - `desktop:package:win:nsis` (line 93)
   - `desktop:package:win:nsis:smoke` (line 94)
2. **`--report-only` flag confirmed** in both smoke scripts:
   - `tools/build/linux_appimage_smoke.cjs` lines 36-37 (parseArgs accepts `--report-only`; behavior at lines 109-119 — exit 0 when artifact missing).
   - `tools/build/win_nsis_smoke.cjs` lines 35-36 (parseArgs accepts `--report-only`; behavior at lines 86-95 — exit 0 when artifact missing).
3. **YAML validity:** parsed via Node `yaml` library — both jobs present, 10 steps each. No parse errors.
4. **Existing-step preservation:** before-edit step counts (6 + 6) are visible in git diff; new steps appended only after the canonical lane comment markers.
5. **Cache key sanity:** `${{ runner.os }}` + `hashFiles('package-lock.json', 'package.json')` — invalidates when electron-builder is bumped (via package-lock or package.json), reuses across PRs otherwise.

### Smoke-flag rationale

The audit prescribes `-- --report-only` even though the package step builds the artifact. Both smoke scripts treat `--report-only` as "do not exit non-zero on missing artifact" — when the artifact IS present (the package step succeeded), they still execute all checks (header magic, executable bit / size floor) and exit non-zero on real defects. The flag therefore covers both modes:
- Package step succeeded → smoke runs full validation.
- Package step failed (CI already red) → smoke does not double-fail.

## Risk notes (audit R5: CI runtime)

- Per-platform CI runtime expected to grow ~5-10 min after the cache warms. Acceptable per audit.
- First PR after this lands will see a cache MISS and full Electron download (~150-300 MiB). Subsequent PRs reuse the cache.
- If electron-builder needs runner-side native deps (e.g., `fakeroot` for AppImage on ubuntu-latest), the package step will fail with a clear error and a follow-up lane can add a `setup` step. Audit notes this as expected diagnostic flow, not a regression.

## Determinism / sensitive-history

- Ring N/A — workflow is sim-orthogonal infrastructure.
- No deterministic state path touched.
- No sim/combat/state code modified.
- 40w hash unaffected (no scenario, sim, or data-pipeline files touched).

## Stop-and-ask conditions checked

- ✅ Existing workflow had no constructs that needed removal — appended-only edits.
- ✅ No runner secret / token required (workflow artifacts use built-in `GITHUB_TOKEN`, no extra setup).

## Commit

`feat(ci): v0.9.5 package matrix in desktop-release-guard (LANE-V095-CI-PACKAGE-MATRIX)` — single commit, conventional, no `--no-verify`. Parent batches push.

**SHA:** `55b4653a`
**`git show --stat` summary:** 2 files changed, 150 insertions (workflow +58, new report +92).
