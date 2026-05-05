# Release Process — A War Without Victory

**Owner:** Pyrrhic Games (DevOps + Build Engineering)
**Audit reference:** `docs/40_reports/audits/20260505_V095_PLATFORM_PACKAGING_AUDIT.md`
**Lane:** `LANE-V095-RELEASE-WORKFLOW` (closes audit gap P1-G8 + QW-5)
**Companion CI:** `.github/workflows/release.yml`

This document describes how to release **A War Without Victory** (AWWV) to
testers and players. It covers the versioning convention, the tag-driven
GitHub Releases automation, the manual fallback when CI is unavailable, and
the platform-specific first-run notes that should be linked from every
release body.

---

## 1. Versioning convention

AWWV follows [Semantic Versioning 2.0.0](https://semver.org/) with explicit
pre-release tags for tester-facing builds:

| Form | Meaning | Example |
|---|---|---|
| `vX.Y.Z` | Stable release. Final, production-grade. | `v0.9.5`, `v1.0.0` |
| `vX.Y.Z-alpha.N` | Pre-release alpha. Internal / closed tester. | `v0.9.5-alpha.1` |
| `vX.Y.Z-beta.N` | Pre-release beta. Wider tester pool. Feature-complete for the milestone. | `v0.9.5-beta.1` |
| `vX.Y.Z-rc.N` | Release candidate. Bug-fix-only window before stable. | `v0.9.5-rc.1` |

**Hyphenated tags are auto-flagged as pre-releases by the CI workflow** (see
`.github/workflows/release.yml`, `prerelease: contains(github.ref_name, '-')`).

### Version bump cadence
- **Patch** (`Z`): bug-fix-only releases (`v0.9.5` → `v0.9.5.1` is **not**
  semver; instead bump to `v0.9.6` or use `v0.9.5-rc.N` if still pre-stable).
- **Minor** (`Y`): new mechanics, new UI surfaces, calibration updates that
  meaningfully change behavior.
- **Major** (`X`): only at v1.0 gold and at any future incompatible
  save-format / canon-break boundary.

### Source of truth
- `package.json` `version` field — authoritative.
- Git tag `vX.Y.Z[-...]` — must match `v` + `package.json.version`.
- The CI workflow does not enforce match-up; the **release engineer**
  verifies before pushing the tag.

---

## 2. Tagging and release steps (CI-driven, normal path)

The normal release path is fully automated by
`.github/workflows/release.yml`. The release engineer's job is to land the
correct version bump, then push a tag.

### 2.1 Pre-flight (on `main`)

```bash
# 1. Confirm working tree is clean and on main.
git status
git switch main
git pull --ff-only

# 2. Confirm the version bump landed (LANE-V095-VERSION-BUMP).
node -e "console.log(require('./package.json').version)"
# Expected output: 0.9.5-alpha.1   (or whatever the current target is)

# 3. Confirm typecheck + tests are clean.
npx tsc --noEmit
npm run test:vitest:fast

# 4. Confirm the desktop release-check chain passes locally.
npm run desktop:release:check
```

### 2.2 Create the annotated tag

Use an **annotated** tag (`-a`) with a message describing the release. The
tag message itself is human-facing; the CI release body is generated
separately by `.github/workflows/release.yml`.

```bash
git tag -a v0.9.5-alpha.1 -m "v0.9.5-alpha.1 — first tester-facing build"
git push origin v0.9.5-alpha.1
```

### 2.3 Watch the workflow

Pushing a tag matching `v*` triggers `.github/workflows/release.yml`:

1. **`build-linux`** (ubuntu-latest) — runs `desktop:release:check` →
   `desktop:package:linux:appimage` → smoke verifier → uploads AppImage as
   workflow artifact.
2. **`build-windows`** (windows-latest) — runs `desktop:release:check` →
   `desktop:package:win:nsis` → smoke verifier → uploads NSIS `.exe` as
   workflow artifact.
3. **`release`** (ubuntu-latest, gated on both build jobs) — downloads both
   artifacts, runs `softprops/action-gh-release@v2` to create or update the
   GitHub Release at the matching tag, and attaches the AppImage + NSIS
   installer to the release.

Watch the run at: `https://github.com/<org>/<repo>/actions`. On success,
the release will appear at: `https://github.com/<org>/<repo>/releases`.

### 2.4 Dry-run before the first real tag

The workflow also accepts `workflow_dispatch` triggers. A manually-triggered
run **builds both platform installers but does NOT create a GitHub
Release** — artifacts are uploaded only to the workflow run's artifact
panel. Use this to confirm the build matrix is healthy before pushing the
first real tag:

1. Navigate to the **Release** workflow in the GitHub Actions UI.
2. Click **Run workflow** → choose `main` → **Run workflow**.
3. Wait for both build jobs to complete.
4. Download the artifacts from the run's **Artifacts** panel and verify
   them locally.

---

## 3. Manual fallback (`gh release create`)

If the CI workflow is unavailable (e.g., GitHub Actions outage, secrets
issue, urgent hotfix) the release engineer can produce installers locally
and upload them with the `gh` CLI.

### 3.1 Prerequisites

- `gh` (GitHub CLI) authenticated against the repo: `gh auth status`.
- A Linux host (or WSL2) for the AppImage build.
- A Windows 10/11 host for the NSIS build.
- `package.json` semver matches the intended tag.

### 3.2 Build AppImage on Linux

```bash
git switch main
git pull --ff-only
npm install --legacy-peer-deps
npm install --legacy-peer-deps --prefix src/ui/map
npm run desktop:startup-snapshot:build
npm run desktop:release:check
npm run desktop:package:linux:appimage
npm run desktop:package:linux:appimage:smoke
ls -lah dist-packaged/*.AppImage
```

### 3.3 Build NSIS on Windows

```powershell
git switch main
git pull --ff-only
npm install --legacy-peer-deps
npm install --legacy-peer-deps --prefix src/ui/map
npm run desktop:startup-snapshot:build
npm run desktop:release:check
npm run desktop:package:win:nsis
npm run desktop:package:win:nsis:smoke
Get-ChildItem dist-packaged/*.exe
```

### 3.4 Tag + create the release

```bash
# On any host with both artifacts collected into ./release-staging/
git tag -a v0.9.5-alpha.1 -m "v0.9.5-alpha.1 — first tester-facing build"
git push origin v0.9.5-alpha.1

gh release create v0.9.5-alpha.1 \
  --title "v0.9.5-alpha.1" \
  --notes-file ./release-staging/RELEASE_NOTES.md \
  --prerelease \
  ./release-staging/*.AppImage \
  ./release-staging/*Setup*.exe
```

For a stable (non-pre-release) tag, omit `--prerelease`.

### 3.5 Manual release-notes body

Until `LANE-V095-RELEASE-NOTES-GENERATOR` ships
(`tools/release/generate_release_notes.cjs`), the release body must be
authored by hand from `docs/PROJECT_LEDGER.md` since the prior `v*` tag.
Use the placeholder template embedded in
`.github/workflows/release.yml`'s `body:` field as a starting point — copy
the markdown, fill in the highlights, paste into `RELEASE_NOTES.md`.

---

## 4. Player-facing first-run notes

Every release body **must** link to or include the following two notices.
The CI workflow's release body template already references both via
`docs/RELEASE_PROCESS.md`.

### 4.1 Windows: SmartScreen warning (unsigned NSIS)

> **The first time you run the AWWV installer, Windows may show a
> SmartScreen warning titled "Windows protected your PC".** This is
> expected: AWWV's installer is currently unsigned (code-signing
> certificates are out of scope for the v0.9.5 alpha builds — see audit
> §2.3).
>
> To proceed:
>
> 1. Click **More info**.
> 2. Click **Run anyway**.
>
> The installer will then proceed normally. Subsequent launches of the
> installed application will not trigger SmartScreen.
>
> A signed Windows build is planned for the v1.0 gold release.

### 4.2 Linux: AppImage execution + FUSE2

> **AWWV is distributed as an AppImage on Linux.** AppImages are
> single-file portable executables; no installation step is required.
>
> 1. Download the `.AppImage` file from the Release page.
> 2. Make it executable: `chmod +x *.AppImage`
> 3. Run: `./AWWV-<version>.AppImage`
>
> **FUSE2 is required** (AppImages are FUSE2-mounted at runtime). On
> recent Ubuntu / Debian:
>
> ```bash
> sudo apt install libfuse2
> ```
>
> Tested distributions: Ubuntu 22.04+, Fedora 38+, Debian 12+. See
> `docs/40_reports/PLATFORM_TEST_MATRIX.md` (sibling lane
> `LANE-V095-PLATFORM-TEST-MATRIX-DOC` will land this) for the verified
> baseline + glibc / FUSE2 floor.

---

## 5. Cross-references

- `docs/40_reports/PLATFORM_TEST_MATRIX.md` — install / launch /
  save-load / uninstall checklist per platform. **Authored by sibling
  lane `LANE-V095-PLATFORM-TEST-MATRIX-DOC`** — once that lane lands,
  this section becomes a live cross-reference; until then this is a
  forward declaration so release engineers know the doc is coming.
- `docs/40_reports/audits/20260505_V095_PLATFORM_PACKAGING_AUDIT.md` —
  v0.9.5 platform packaging closure audit. Authoritative gap matrix +
  prioritized backlog.
- `docs/40_reports/implemented/20260504_V0_9_5_PLATFORM_PACKAGING_GROUNDWORK.md`
  — predecessor lane that landed config + smoke verifiers + contract tests.
- `docs/PROJECT_LEDGER.md` — primary changelog. Source for release notes
  until the auto-generator (`LANE-V095-RELEASE-NOTES-GENERATOR`) ships.
- `.github/workflows/release.yml` — the workflow this document operates.

---

## 6. Sensitive-history compliance

Release infrastructure is sim-orthogonal:

- **Ring** classification: N/A — neither sim core nor canon is touched.
- **§6 surface:** ZERO touch.
- **Determinism path:** unaffected. The workflow runs
  `desktop:release:check` (existing, deterministic per groundwork report)
  and the smoke verifiers read fixed-offset header bytes only.
- **Faction symmetry:** N/A — packaging is faction-agnostic by
  construction.
- **FORAWWV:** ZERO touch.

Verdict: PASS — no sensitive-history surface implicated.
