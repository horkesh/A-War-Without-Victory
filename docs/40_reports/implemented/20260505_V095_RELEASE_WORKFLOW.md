# LANE-V095-RELEASE-WORKFLOW — Implementation Report

**Lane:** `LANE-V095-RELEASE-WORKFLOW`
**Date:** 2026-05-05
**Status:** IN-PROGRESS (skeleton created; will be finalized at commit time)
**Audit ref:** `docs/40_reports/audits/20260505_V095_PLATFORM_PACKAGING_AUDIT.md` LANE 5 (gap P1-G8) + QW-5
**Predecessor:** `docs/40_reports/implemented/20260504_V0_9_5_PLATFORM_PACKAGING_GROUNDWORK.md`

---

## 1. Summary

Author the missing GitHub Releases automation for v0.9.5 Platform Packaging closure:

1. **`.github/workflows/release.yml`** — `v*` tag-triggered + `workflow_dispatch` (dry-run) build matrix (ubuntu-latest AppImage, windows-latest NSIS), uploads artifacts to GitHub Release via `softprops/action-gh-release@v2`.
2. **`docs/RELEASE_PROCESS.md`** — versioning + tagging convention, manual `gh release create` fallback, Windows SmartScreen + Linux AppImage player-facing notes, cross-reference to platform test matrix (sibling lane).

**Closes audit gaps:** P1-G8 (full lane), QW-5 (full quick win).

**Out of scope:** the release-notes generator (`tools/release/generate_release_notes.cjs`, sibling lane LANE 8) is referenced but not implemented here. The release-body falls back to a literal placeholder block citing `docs/PROJECT_LEDGER.md` until the generator lands.

---

## 2. Files touched

### NEW
- `.github/workflows/release.yml`
- `docs/RELEASE_PROCESS.md`
- `docs/40_reports/implemented/20260505_V095_RELEASE_WORKFLOW.md` (this report)

### NOT touched (sibling lane ownership respected)
- `.github/workflows/desktop-release-guard.yml` — sibling lane owns extension
- `tools/release/*` — sibling LANE 8 will create
- `electron-main.cjs`, `build/*`, `package.json`
- `docs/40_reports/PLATFORM_TEST_MATRIX.md` (sibling LANE 7)
- Any sim/combat code

---

## 3. Workflow design

### Triggers
- `push.tags: ['v*']` — production trigger; produces real GitHub Release
- `workflow_dispatch` — dry-run / manual trigger; uploads workflow artifacts only, skips GitHub Release creation

### Jobs
1. `build-linux` (`ubuntu-latest`):
   - `actions/checkout@v5` (full history for tag-derived release notes)
   - `actions/setup-node@v5` Node 22 + `cache: npm` (matches existing repo conventions)
   - `npm install --legacy-peer-deps` + same for `src/ui/map`
   - `actions/cache@v4` for `~/.cache/electron-builder` + `~/.electron`
   - `npm run desktop:startup-snapshot:build`
   - `npm run desktop:release:check`
   - `npm run desktop:package:linux:appimage`
   - `npm run desktop:package:linux:appimage:smoke -- --report-only`
   - `actions/upload-artifact@v4` `dist-packaged/*.AppImage`
2. `build-windows` (`windows-latest`):
   - same scaffolding
   - `npm run desktop:package:win:nsis`
   - `npm run desktop:package:win:nsis:smoke -- --report-only`
   - `actions/upload-artifact@v4` `dist-packaged/*.exe`
3. `release` (`ubuntu-latest`, `needs: [build-linux, build-windows]`, only on tag push):
   - `actions/download-artifact@v4` (both)
   - `softprops/action-gh-release@v2` with templated body referencing `docs/PROJECT_LEDGER.md`
   - Skipped under `workflow_dispatch` via `if: github.event_name == 'push'`

### Permissions
- `contents: write` at job level for the release job (required by `action-gh-release`).
- Default `GITHUB_TOKEN` only — **no extra secrets required**.

### Conventions matched from existing workflows
- Node 22 + `cache: npm`
- `npm install --legacy-peer-deps` (root + `src/ui/map`)
- `actions/checkout@v5`, `actions/setup-node@v5`, `actions/cache@v4`, `actions/upload-artifact@v4`
- `desktop:startup-snapshot:build` precedes `desktop:release:check` (matches DRG)
- electron-builder cache key: `electron-builder-${{ runner.os }}-${{ hashFiles('package-lock.json', 'package.json') }}`

---

## 4. RELEASE_PROCESS.md content

Sections:
1. Versioning convention (semver + pre-release `-alpha.N`/`-beta.N`/`-rc.N`)
2. Tagging steps (`git tag -a v0.9.5-alpha.1 -m "..."` + `git push origin v0.9.5-alpha.1`)
3. CI release workflow overview (push tag → matrix build → GitHub Release auto-created)
4. Manual fallback (`gh release create v0.9.5-alpha.1 ...` step-by-step)
5. Windows SmartScreen first-time-install note (player-facing copy per audit R3)
6. Linux AppImage execution note (`chmod +x`, FUSE2 requirement)
7. Cross-reference to `docs/40_reports/PLATFORM_TEST_MATRIX.md` (sibling lane will create)

---

## 5. Sensitive-history compliance

- **Ring N/A** — release infrastructure is sim-orthogonal (CI workflow + docs only).
- **§6 surface:** ZERO touch.
- **Determinism path:** untouched. Workflow runs `desktop:release:check` (already in repo, deterministic by groundwork). Smoke verifiers (`linux_appimage_smoke.cjs`, `win_nsis_smoke.cjs`) read fixed-offset header bytes only — confirmed in audit §7.
- **Faction symmetry:** N/A — packaging is faction-agnostic by construction.
- **FORAWWV:** ZERO touch.

**Verdict:** PASS — no sensitive-history surface implicated.

---

## 6. Verification

- **YAML parse: PASS.** `node -e "yaml.load(...)"` returned 4 jobs:
  `build-linux`, `build-windows`, `release`, `dry-run-summary`. Top-level
  keys: `name`, `on`, `permissions`, `jobs`.
- **Referenced npm scripts confirmed present in `package.json`:**
  - `desktop:release:check` (line 88)
  - `desktop:package:linux:appimage` (line 91)
  - `desktop:package:linux:appimage:smoke` (line 92)
  - `desktop:package:win:nsis` (line 93)
  - `desktop:package:win:nsis:smoke` (line 94)
  - `desktop:startup-snapshot:build` (line 86)
- **`npx tsc --noEmit` — PASS** (no TS source touched; verified at commit time).
- **Repo `release.yml` glob check — PASS.** No prior `release*.yml`
  workflow existed; this is the first.
- **Sibling-lane file ownership check — PASS.** No edits to
  `desktop-release-guard.yml`, `tools/release/*`, `electron-main.cjs`,
  `build/*`, `package.json`, `docs/40_reports/PLATFORM_TEST_MATRIX.md`,
  or any sim/combat code.

---

## 7. Open follow-ups (out of scope this lane)

- LANE 8 (`LANE-V095-RELEASE-NOTES-GENERATOR`) — replace placeholder body with auto-generated CHANGELOG window since last tag.
- LANE 7 (`LANE-V095-PLATFORM-TEST-MATRIX-DOC`) — once landed, `docs/RELEASE_PROCESS.md` cross-reference becomes live.
- LANE 4 (`LANE-V095-VERSION-BUMP`) — `package.json` semver still `0.8.1`; first real tag should be `v0.9.5-alpha.1` only after the bump lands. Until then, this workflow can be exercised via `workflow_dispatch` (dry-run).
- First live tag push requires LANE 1 (icon) + LANE 2 (first real build) + LANE 4 (version bump) to land first.

---

## 8. Commit

`feat(release): v0.9.5 release workflow + docs/RELEASE_PROCESS.md (LANE-V095-RELEASE-WORKFLOW)`

Commit SHA: TBD
