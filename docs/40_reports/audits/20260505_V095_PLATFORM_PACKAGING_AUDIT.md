# v0.9.5 Platform Packaging — Closure Audit + Backlog

**Lane:** `LANE-V095-PLATFORM-PACKAGING-AUDIT`
**Date:** 2026-05-05
**Status:** AUDIT-ONLY (read-only). No source / test / scenario / canon modification.
**Roadmap slot:** v0.9.5 (Platform Packaging + Store)
**Plan reference:** `docs/plans/2026-04-06-v095-platform-packaging-store-plan.md`
**Predecessor groundwork:** `docs/40_reports/implemented/20260504_V0_9_5_PLATFORM_PACKAGING_GROUNDWORK.md` (commit `26a3d5e4` aggregated under `6d10e725`)

---

## 1. Audit scope + methodology

### Scope
Read-only audit of the current state of v0.9.5 (Platform Packaging) closure. The trip session 3 nightshift shipped `LANE-NIGHTSHIFT-PLATFORM-PACKAGING-GROUNDWORK` as **groundwork only** — config, smoke scripts, and contract tests landed; **no installer was actually built**, no release artifact was published. This audit names what is needed to actually CLOSE v0.9.5 for a v1.0-shippable release.

### Targets reviewed
1. Linux AppImage (electron-builder target: `AppImage`)
2. Windows unsigned NSIS installer (electron-builder target: `nsis`, `signAndEditExecutable: false`)
3. Build system: `desktop:release:check` chain, `dist-packaged/` output, smoke scripts under `tools/build/`
4. CI workflows in `.github/workflows/`
5. Release artifact pipeline (currently absent)
6. macOS, Steam, auto-update (out-of-scope per groundwork report §2; flagged for closure status)

### Methodology
- Read `package.json` build config, scripts, and devDependencies.
- Read both contract test files: `tests/desktop_packaging_contract.test.ts`, `tests/desktop_packaging_targets.test.ts`.
- Read smoke scripts: `tools/build/linux_appimage_smoke.cjs`, `tools/build/win_nsis_smoke.cjs`.
- Read CI workflows: `desktop-release-guard.yml`, `baseline-regression.yml`, `typecheck.yml`.
- Read groundwork report (`20260504_V0_9_5_PLATFORM_PACKAGING_GROUNDWORK.md`) and roadmap entry for v0.9.5.
- Inventoried `dist-packaged/` (only `win-unpacked/` from prior `desktop:package:dir` run; **no AppImage, no NSIS .exe artifacts present on disk**).
- `Glob`-checked for app icons (`.ico`, `.icns`, app icon PNGs): **none exist in `assets/` or `build/`**. Only UI/font/crest assets present.
- Searched `electron-main.cjs` for `BrowserWindow` icon wiring, `setAppUserModelId`, etc.: **no icon set in BrowserWindow construction; no AppUserModelId**.
- Confirmed no GitHub release / publish workflow exists in `.github/workflows/`.

### What was NOT done (audit-only)
- Did not run `electron-builder` to actually build either installer.
- Did not run `desktop:package:linux:appimage:smoke` against a real AppImage (none exists locally; would also need a Linux host or WSL).
- Did not modify any source / test / scenario / canon file. All findings are inventory + analysis.

---

## 2. Current-state inventory

### 2.1 What is working / declared

| Surface | State | Evidence |
|---|---|---|
| Electron-builder devDep | INSTALLED v25.0.0 | `package.json` devDependencies |
| `build.appId` | `com.awwv.desktop` | `package.json:298` |
| `build.productName` | `A War Without Victory` | `package.json:299` |
| `build.directories.output` | `dist-packaged` | `package.json:302` |
| `build.files` (packaged sources) | 6 entries (electron-main + 5 helpers) | pinned by `desktop_packaging_contract.test.ts` |
| `build.extraResources` | 7 entries (sim bundle, tactical-map, warroom, derived/source/ui data, assets) | pinned by `desktop_packaging_contract.test.ts` |
| `build.win.target` | `['dir', 'nsis']` | `package.json:367` |
| `build.win.signAndEditExecutable` | `false` | `package.json:364`; pinned by both contract tests |
| `build.win.sign` | (absent — canonical "unsigned" switch) | confirmed by `desktop_packaging_targets.test.ts` T2 |
| `build.nsis` block | `oneClick:false`, `perMachine:false`, `allowToChangeInstallationDirectory:true` | `package.json:370-374` |
| `build.linux.target` | `['AppImage']` | `package.json:375-378` |
| `build.linux.category` | `Game` | `package.json:379` |
| `desktop:release:check` script | runs `desktop:map:build` + `desktop:sim:build` + `warroom:build` | `package.json:88` |
| `desktop:package:linux:appimage` | declared, gates on `desktop:release:check` | `package.json:91` |
| `desktop:package:linux:appimage:smoke` | declared, runs `tools/build/linux_appimage_smoke.cjs` | `package.json:92` |
| `desktop:package:win:nsis` | declared, gates on `desktop:release:check` | `package.json:93` |
| `desktop:package:win:nsis:smoke` | declared, runs `tools/build/win_nsis_smoke.cjs` | `package.json:94` |
| Linux smoke verifier | exists, validated header/exec/optional-launch | `tools/build/linux_appimage_smoke.cjs` (148 lines) |
| Win NSIS smoke verifier | exists, validates MZ/PE header + 4 MiB floor | `tools/build/win_nsis_smoke.cjs` (118 lines) |
| Contract tests | 3 + 4 = 7 tests pinning config | `tests/desktop_packaging_contract.test.ts`, `tests/desktop_packaging_targets.test.ts` |
| `desktop:package:probe` (existing) | builds dir + runs runtime probe in win-unpacked | `package.json:90` |
| CI: Desktop Release Guard | runs on PR/push to main; ubuntu (release-check) + windows-latest (probe) | `.github/workflows/desktop-release-guard.yml` |

### 2.2 What is untested / never executed

| Surface | State |
|---|---|
| Actual Linux AppImage build | **NEVER EXECUTED** — groundwork report §6: "Installer build executed: NO" |
| Actual Win NSIS build | **NEVER EXECUTED** — same |
| Smoke script run against real artifact | **NEVER EXECUTED** — both scripts have `--report-only` mode for CI absent-file safety, but no real artifact has been produced and passed through them |
| Headless launch test (`AWWV_SMOKE_LAUNCH=1`) | **NEVER EXECUTED** — requires Linux host with display or xvfb |
| Install / launch / save / load on a clean target | **NEVER PERFORMED** — neither Win10/11 fresh-install validation nor Linux distro validation |
| Uninstall cleanliness verification | **NEVER PERFORMED** |
| SmartScreen warning behavior on unsigned NSIS | **DOCUMENTED EXPECTATION** (groundwork §4) but never user-validated |
| Auto-update | **OUT OF SCOPE** per groundwork §2; not configured |
| Reproducible build (same input → same output) | **UNTESTED** — electron-builder version is pinned, but `npmRebuild: false` is set; no reproducibility harness |

### 2.3 What is missing entirely

| Surface | State | Severity hint |
|---|---|---|
| Application icon (`.ico` for Win, `.png` for Linux AppImage, `.icns` for Mac future) | **ABSENT** — no `.ico` / `.icns` / `build/icon.png` exists anywhere in repo (`Glob` confirmed). electron-builder will use Electron's default icon. | P1 |
| `BrowserWindow({ icon: ... })` wiring in `electron-main.cjs` | **ABSENT** — no `icon` field set on either window constructor (lines 633, 709). | P1 |
| `setAppUserModelId(...)` on Windows | **ABSENT** — no call in `electron-main.cjs`. Affects Windows taskbar grouping + jump-list identity. | P2 |
| Linux `.desktop` file template / category icon | **ABSENT** — electron-builder generates one from `build.linux.category` and product name, but no icon means default fallback. | P1 (tied to icon) |
| Windows code-signing certificate | **OUT OF SCOPE** intentionally (groundwork §2). Closure-acceptable: SmartScreen warning is documented + intentional. | P3 (for v0.9.5 closure; P1 for v1.0 ship) |
| macOS notarized DMG | **OUT OF SCOPE** intentionally (groundwork §2). Requires Apple Dev membership. | Out of v0.9.5 scope |
| Auto-update (electron-updater) | **OUT OF SCOPE** intentionally (groundwork §2). Tied to signed Win build + GitHub Releases. | Out of v0.9.5 scope |
| GitHub Releases workflow | **ABSENT** — no `.github/workflows/release.yml`. No `gh release create` automation. Manual upload required. | P1 |
| Release notes generator / template | **ABSENT** — no automation; would need to be authored from `docs/PROJECT_LEDGER.md`. | P2 |
| Versioning protocol + bump | **STALE** — `package.json` semver is still `0.8.1`. Per `MEMORY.md` "early v0.9.x band ... package.json semver still 0.8.1 (no formal milestone bump)". | P1 |
| CI step that exercises `desktop:package:linux:appimage` on PR | **ABSENT** — current `desktop-release-guard.yml` only runs `desktop:release:check` and `desktop:package:probe`. Neither produces an AppImage or NSIS installer. | P1 |
| CI step that exercises `desktop:package:win:nsis` on PR | **ABSENT** — same as above. | P1 |
| Post-install / post-uninstall test plan documents | **ABSENT** — no checklist in `docs/40_reports/` for clean-VM verification. | P2 |
| Steam integration | **OUT OF SCOPE** per groundwork §2 + roadmap. Captured here only for completeness. | Out of v0.9.5 scope |
| `.appx` / Microsoft Store / WinGet | **OUT OF SCOPE** | Future |

### 2.4 Confirmed predecessor commits / state

- Trip session 3 nightshift `26a3d5e4` (aggregated `6d10e725`): groundwork shipped (config, scripts, smoke verifiers, 5/5 tests).
- `2ef5ffcf` fix(packaging): removed redundant `win.sign: null` (DRG regression fix). Canonical unsigned switch is now `signAndEditExecutable: false` alone.
- `dist-packaged/win-unpacked/` exists from a prior local `desktop:package:dir` run dated 2026-04-15 (before trip session 3). No `.AppImage` or `*Setup*.exe` exists locally.
- Current branch `main` has 2 modified files (`.claude/scheduled_tasks.lock`, `data/derived/latest_run_final_save.json`) + 1 untracked dir (`dist-packaged/`); none affect this audit.

---

## 3. Gap matrix

### Phase 1 closure gaps (Linux AppImage + Win NSIS minimum-shippable)

| ID | Gap | Severity | Effort | Owner role(s) |
|---|---|---|---|---|
| P1-G1 | Application icon source missing (`build/icon.png` 512×512 minimum). electron-builder needs at least one icon source to produce platform-appropriate icons; without it, Win NSIS uses Electron-default icon (unprofessional) and Linux AppImage has no `.desktop`/launcher icon. | **P1** | M (~2-4h: source/commission art + ICO/ICNS conversion + commit to `build/`) | platform-specialist + asset-integration |
| P1-G2 | `BrowserWindow({ icon: ... })` wiring absent in `electron-main.cjs` for runtime taskbar/window icon (depends on G1). | **P1** | XS (~30min) | platform-specialist |
| P1-G3 | First Linux AppImage build never actually executed. Cannot confirm AppImage builds at all without running `desktop:package:linux:appimage` end-to-end on a Linux host (or WSL2). Groundwork shipped config-only by design. | **P1** | M (~1-2h on a Linux host: install dev deps, run release-check, run package script, smoke against artifact) | build-engineer + platform-specialist |
| P1-G4 | First Win NSIS build never actually executed. Same situation — `desktop:package:win:nsis` has never produced an installer. SmartScreen + install + launch + uninstall cycle is theoretical. | **P1** | M (~1-2h on a Win10/11 host: run package script, smoke, install, click-through SmartScreen, launch, save/load, uninstall) | build-engineer + platform-specialist |
| P1-G5 | CI does not exercise `desktop:package:linux:appimage` on PR. The packaging contract is pinned but the actual build is never attempted, so a regression that breaks the build (e.g., `extraResources` path drift, missing icon, electron version mismatch) lands silently and is only caught at manual release time. | **P1** | S (~1-2h: extend `desktop-release-guard.yml` ubuntu job to also run `desktop:package:linux:appimage` + smoke; cache electron-builder downloads; allow `--report-only` smoke as fallback) | devops-specialist + build-engineer |
| P1-G6 | CI does not exercise `desktop:package:win:nsis` on PR. Same gap as G5, Windows side. | **P1** | S (~1-2h: extend `desktop-release-guard.yml` windows-latest job to add NSIS build + smoke after probe) | devops-specialist + build-engineer |
| P1-G7 | `package.json` semver still `0.8.1`. Released installer would announce itself as 0.8.1 in NSIS uninstaller registry, AppImage filename, and runtime banner. Mismatched with roadmap state (early v0.9.x band) and meaningless to a player. | **P1** | XS (~15min: bump to `0.9.5-alpha` or per versioning policy decision; commit; verify contract tests still pass) | product-manager + build-engineer |
| P1-G8 | GitHub Releases workflow absent. No automation for tagging, attaching artifacts, generating release notes. Closure for v0.9.5 implies that a tester / pre-release player can download an installer; currently impossible without manual `gh release create`. | **P1** | M (~3-4h: new `.github/workflows/release.yml` triggered on tag push; build matrix ubuntu + windows; upload AppImage + NSIS .exe + .yml metadata; release-notes template) | devops-specialist |

### Phase 2 closure gaps (polish + reproducibility before v1.0)

| ID | Gap | Severity | Effort |
|---|---|---|---|
| P2-G1 | `setAppUserModelId('com.awwv.desktop')` absent in `electron-main.cjs`. On Windows, this affects taskbar grouping, jump lists, and toast notification identity. Without it, Electron uses a default ID and notifications/pinning may behave unexpectedly. | **P2** | XS (~15min: one-line add + test that exercises Electron API mock) |
| P2-G2 | Reproducible build harness absent. electron-builder is version-pinned, but `npmRebuild: false` and absence of a lockfile-driven reproducibility test means two devs on different hosts can produce different installer bytes. Not a v0.9.5 closure blocker but is a v1.0 release-trust requirement. | **P2** | M (~3-4h: hash AppImage internals after a stable build, document floor variance, add CI verification) |
| P2-G3 | Release notes generator absent. v0.9.5 ships → users want to know what's in the build. Currently `docs/PROJECT_LEDGER.md` is the ground truth but is not user-facing. | **P2** | S (~1-2h: script that extracts ledger entries since last tag and generates a CHANGELOG.md/release-body) |
| P2-G4 | Post-install / post-uninstall manual test plan missing. CI smoke confirms artifact integrity but not cleanliness of install (registry keys removed on uninstall, Start Menu entries cleaned, AppData remnants removed/preserved per intent). | **P2** | S (~2h: author `docs/40_reports/PLATFORM_TEST_MATRIX.md` checklist; one-time clean-VM run per platform) |
| P2-G5 | Linux distro coverage matrix undefined. AppImage is portable but glibc / FUSE2 baseline matters. Should declare e.g. "Ubuntu 22.04+, Fedora 38+, Debian 12+, FUSE2 required". | **P2** | XS (~30min: add to platform support matrix doc) |
| P2-G6 | macOS support entirely absent — flagged for v0.9.6 / v1.0+ rather than v0.9.5. Apple Developer enrollment ($99/yr) + notarytool credentials + universal binary build path. | **OUT OF SCOPE** | L (~1 day with credentials in hand) |
| P2-G7 | Steam integration entirely absent — flagged for post-v1.0. Steamworks SDK + partner agreement + depot upload. | **OUT OF SCOPE** | L (~1 week with credentials) |
| P2-G8 | Auto-update absent. Tied to signed Win build + GitHub Releases publish flow. Acceptable to ship v0.9.5 manual-update; not acceptable for v1.0 gold. | **P2** | M (~4h once signed Win + GH Releases exist) |
| P2-G9 | `dist-packaged/` is the existing output dir but is `.gitignore`'d at repo root. Confirmed via `dist-packaged/win-unpacked/` being untracked. No issue; noting that artifact storage is local-only / CI-only. | **P3** | n/a |

### Severity counts

- **Phase 1 (closure-blocking):** 8 gaps — P0 = 0, **P1 = 8**, P2 = 0, P3 = 0
- **Phase 2 (polish + v1.0 trust):** 9 gaps — P0 = 0, P1 = 0, **P2 = 8**, P3 = 1 (and 2 marked OUT OF SCOPE: macOS, Steam)

---

## 4. Prioritized closure backlog (next 5–10 lanes)

Ordering rationale: **icon → first real build → CI → release pipeline → version bump**, then polish. Each lane is independently dispatchable; lanes 1-2 have a soft dependency (icon must exist before first-real-build smokes the icon-rendered output meaningfully); lanes 3-4 strictly require lanes 1-2.

### LANE 1 — `LANE-V095-PLATFORM-ICON` (P1 M; ~2-4h)
**What:** Author / commission a 512×512 source icon (`build/icon.png`) for AWWV. Generate platform variants (`.ico` for Win, `.icns` deferred for Mac, `.png` series for Linux). Wire `BrowserWindow({ icon: ... })` in both window constructors of `electron-main.cjs`. Ensure `extraResources` or top-level `build.icon` field references the source so electron-builder picks it up.
**Closes:** P1-G1, P1-G2.
**Test:** New `tests/desktop_icon_contract.test.ts` pins (a) presence of `build/icon.png` ≥512×512, (b) `build.icon` field declared OR electron-builder default discovery semantics relied on with comment, (c) `BrowserWindow` constructor includes `icon`.
**Risk:** None to sim; UI / packaging only.

### LANE 2 — `LANE-V095-FIRST-REAL-BUILD` (P1 M; ~2-4h)
**What:** Execute `desktop:package:linux:appimage` and `desktop:package:win:nsis` end-to-end on appropriate hosts (or in a WSL2 Linux VM + native Win11 dev box). Run the smoke verifiers against the produced artifacts. Capture file size, build time, smoke JSON output. **First-time validation** of the entire chain.
**Closes:** P1-G3, P1-G4. Implicitly validates G1+G2 if Lane 1 has shipped.
**Output:** New `docs/40_reports/implemented/20260506_V095_FIRST_REAL_BUILD.md` capturing verified artifact sizes, smoke JSON, install/launch/save/load/uninstall pass per platform.
**Risk:** Build may fail on first attempt for unexpected reasons (e.g., `extraResources` path missing on the host, missing icon, electron version host-mismatch). Failures here are findings, not regressions; reflag as new lanes.

### LANE 3 — `LANE-V095-CI-PACKAGE-MATRIX` (P1 S; ~1-2h)
**What:** Extend `.github/workflows/desktop-release-guard.yml` so the ubuntu-latest job runs `desktop:package:linux:appimage` + `desktop:package:linux:appimage:smoke` after release-check; the windows-latest job runs `desktop:package:win:nsis` + smoke after the runtime probe. Cache electron-builder downloads. Upload artifacts as workflow artifacts (not releases) for inspection.
**Closes:** P1-G5, P1-G6.
**Risk:** CI runtime increase (~5-10 min per platform). Acceptable. Failure mode: native packaging deps differ on hosted runner; document and add `setup` step.

### LANE 4 — `LANE-V095-VERSION-BUMP` (P1 XS; ~30min)
**What:** Bump `package.json` semver `0.8.1` → `0.9.5` (or `0.9.5-alpha.1` if pre-release tagging policy preferred). Verify contract tests (`tests/desktop_packaging_contract.test.ts` + `tests/desktop_packaging_targets.test.ts` — neither pins the version, so safe), 40w smoke hash drift NONE (version is not in deterministic state path), and packaged artifact filenames / NSIS uninstaller registry / AppImage filename now reflect 0.9.5.
**Closes:** P1-G7.
**Risk:** Minimal. Run `desktop:release:check` to confirm no script reads package version into the determinism path.

### LANE 5 — `LANE-V095-RELEASE-WORKFLOW` (P1 M; ~3-4h)
**What:** Author `.github/workflows/release.yml` triggered on `v*` tag push. Build matrix: ubuntu-latest (AppImage) + windows-latest (NSIS). Upload artifacts to GitHub Release using `softprops/action-gh-release` or equivalent. Author release-body template that references `docs/PROJECT_LEDGER.md` window since last tag. Document tagging convention (`v0.9.5-alpha.1`, `v0.9.5`, `v1.0.0`) in a new `docs/RELEASE_PROCESS.md` (or extend platform plan).
**Closes:** P1-G8.
**Risk:** First tag push will exercise the workflow live — recommend dry-run via manual `workflow_dispatch` trigger first.

### LANE 6 — `LANE-V095-APP-USER-MODEL-ID` (P2 XS; ~15min)
**What:** Add `app.setAppUserModelId('com.awwv.desktop')` near `app.whenReady()` in `electron-main.cjs`. Ensures consistent Windows taskbar / jump-list / notification identity. Faction-agnostic, deterministic, sim-orthogonal.
**Closes:** P2-G1.
**Risk:** None.

### LANE 7 — `LANE-V095-PLATFORM-TEST-MATRIX-DOC` (P2 S; ~2h)
**What:** Author `docs/40_reports/PLATFORM_TEST_MATRIX.md` covering: install steps per platform; launch verification; new game / load game; save / load round-trip; advance-turn smoke; clean uninstall (Win) / clean removal (Linux). Declare supported distros (Ubuntu 22.04+, Fedora 38+, Debian 12+; Win10 1809+ / Win11). Note glibc / FUSE2 floor for AppImage.
**Closes:** P2-G4, P2-G5.
**Risk:** None — doc-only.

### LANE 8 — `LANE-V095-RELEASE-NOTES-GENERATOR` (P2 S; ~1-2h)
**What:** Tooling at `tools/release/generate_release_notes.cjs` that reads `docs/PROJECT_LEDGER.md` since last `v*` git tag and emits a Markdown release-body suitable for GitHub Releases. Idempotent + deterministic.
**Closes:** P2-G3.
**Risk:** None.

### LANE 9 — `LANE-V095-REPRODUCIBLE-BUILD-HARNESS` (P2 M; ~3-4h; **Phase 2 polish**)
**What:** After a stable build pipeline lands, add a CI job that builds the AppImage + NSIS twice on the same SHA and compares hashes (or hashes-of-internals if outer wrappers carry timestamps). Document acceptable variance floor.
**Closes:** P2-G2.
**Risk:** electron-builder embeds build timestamps in some places; may need to whitelist or use `SOURCE_DATE_EPOCH` env var.

### LANE 10 — `LANE-V095-AUTO-UPDATE` (P2 M; **deferred — depends on Win signing cert + GH Releases**)
**What:** Wire `electron-updater` reading from GitHub Releases. Gated on a signed Win build (auto-update unsigned binaries is a security anti-pattern per groundwork §2).
**Closes:** P2-G8.
**Risk:** Cannot ship without a code-signing cert.

---

## 5. Quick wins (<2 hours each)

| ID | Quick Win | Effort | Closes |
|---|---|---|---|
| QW-1 | Bump `package.json` semver `0.8.1` → `0.9.5-alpha.1` | XS (~15min) | P1-G7 |
| QW-2 | Add `app.setAppUserModelId('com.awwv.desktop')` in `electron-main.cjs` | XS (~15min) | P2-G1 |
| QW-3 | Add `tests/desktop_icon_contract.test.ts` skeleton (red-test that fails until icon lands; documents the contract) | XS (~30min) | seeds P1-G1 |
| QW-4 | Extend `.github/workflows/desktop-release-guard.yml` ubuntu job to add `desktop:package:linux:appimage:smoke -- --report-only` (no-build, just script wiring; report-only mode is CI-safe with no AppImage present) | S (~30-60min) | partial P1-G5 |
| QW-5 | Author `docs/RELEASE_PROCESS.md` skeleton — versioning convention, tagging convention, GH Release manual-fallback steps until LANE 5 ships | S (~1h) | partial P1-G8 |
| QW-6 | Add a `desktop:package:all` script that chains both `linux:appimage` and `win:nsis` (convenience for local one-shot before CI catches up) | XS (~15min) | DX polish |
| QW-7 | Update CI workflow comments to explain why the package matrix is currently absent (so the next contributor doesn't assume coverage exists) | XS (~15min) | doc hygiene |

**Total quick-win effort:** ~2.5-3 hours. Could be batched as a single "v0.9.5 micro-polish" lane.

---

## 6. Cross-cutting risks

### R1 — Icon work fans out across all platforms simultaneously
A single source icon (`build/icon.png` 512×512) feeds: Win NSIS installer icon, Win runtime BrowserWindow icon, Linux AppImage launcher icon, Linux `.desktop` file icon (autogenerated by electron-builder), and (future) Mac `.icns`. Lane 1 can't be partial — if you ship Lane 1 with only `.ico`, Linux loses; if only PNG, Win loses. Recommend a single source PNG with electron-builder's automatic conversion + an explicit `.ico` for Win where needed.

### R2 — First-real-build will surface unknown unknowns
`desktop:package:linux:appimage` has never executed end-to-end. Gaps that may surface: (a) `extraResources` path drift — `dist/desktop/desktop_sim.cjs`, `dist/tactical-map/`, `dist/warroom/` must exist on the build host, which means `desktop:release:check` must succeed first (gates already wired); (b) electron-builder may need additional Linux-host packages (`fakeroot`, `dpkg` not strictly needed for AppImage but `appimagetool` lineage matters); (c) hardcoded host assumptions in `tools/desktop_bundle_sim.mjs` etc. Contingency: budget Lane 2 generously (4-6h instead of 2-4h) and treat first-build failures as new findings, not regressions.

### R3 — Windows SmartScreen warning is a UX cliff
Even with v0.9.5 closure shipping unsigned, every first-time installer launch will show "Windows protected your PC" with `[Run anyway]` hidden behind `[More info]`. This is documented + intentional but is a concrete onboarding-friction signal. Recommend docs/RELEASE_PROCESS.md include a player-facing "First-time install warning" note linkable from the GitHub Release body.

### R4 — Determinism path is mostly orthogonal but check the version bump
`package.json` semver bump should NOT touch any state path. However, if any code reads `process.env.npm_package_version` or `require('../package.json').version` and embeds it in `final_save.json` or a hash-bearing artifact, the 40w smoke hash will drift. Mitigation: grep for `npm_package_version` and `package.json.*version` before bumping; run 40w smoke pre-bump (n????) and post-bump and confirm hash byte-stable.

### R5 — CI cost / runtime
Adding two real package builds to the existing PR pipeline adds ~5-10 min per platform. Acceptable but worth caching: cache `~/.cache/electron-builder` and `~/.electron` to avoid re-downloading Electron on every PR. Recommend treating Lane 3 as a cache-tuning lane as well.

### R6 — Roadmap mismatch (`semver=0.8.1` vs reality early v0.9.x)
Anyone running `node -e "console.log(require('./package.json').version)"` today gets `0.8.1`. This contradicts MEMORY.md ("early v0.9.x band"), MASTER_ROADMAP.md (v0.9.0–v0.9.4 OPENED/PARTIAL), and the existence of v0.9.5 work in flight. The version bump (Lane 4 / QW-1) is small and is one of the cheapest lanes to ship; recommend prioritizing.

### R7 — Steam, macOS, signed-Win are NOT in v0.9.5 closure
Per groundwork §2 + roadmap, these are explicitly out of v0.9.5 scope. v1.0 gold (per MASTER_ROADMAP "Platform packaging (Win/Mac/Linux/Steam)" line in v1.0 deliverables) **does** include them. **This means v0.9.5 closure is intentionally narrower than v1.0 platform readiness.** The audit names this distinction: v0.9.5 = "Linux AppImage + Win unsigned NSIS shippable to testers via direct download / GitHub Releases". v1.0 platform parity is a v0.9.6+ / v1.0 prep concern.

---

## 7. Sensitive-history compliance

**Audit-only.** This lane is read-only inventory + analysis of packaging surfaces. No source / test / scenario / canon file was modified. No engine code path is touched. No mechanism affecting RBiH / RS / HRHB combat outcomes, dissolution, displacement, rupture, enclave behavior, or political control is named or proposed.

- **Ring 1 / Ring 2 / Ring 3 classification:** N/A — packaging is sim-orthogonal infrastructure.
- **§6 surface:** ZERO touch. Packaging never reaches `enclave_resilience.ts`, paint anchors, `political_controllers`, OOB, rupture wiring, FORAWWV, sensitive-history design gate, or any combat-math number.
- **Faction symmetry:** N/A — packaging is faction-agnostic by construction.
- **Determinism:** Smoke scripts (`linux_appimage_smoke.cjs`, `win_nsis_smoke.cjs`) read fixed-offset header bytes only; no `Math.random()`, no `Date.now()`, no network. Confirmed by inspection of both files. CI workflow is platform-bound but not state-bound.
- **FORAWWV:** ZERO touch.

**Compliance assertion:** All audit findings, the gap matrix, prioritized backlog, quick wins, and cross-cutting risks contain no proposal that would touch sensitive-history surfaces or the deterministic sim path. Every named lane is platform / build / CI / docs scope. Every implementation lane (when subsequently dispatched) must reaffirm this classification at intake.

---

## 8. Recommended next implementation lane

**LANE 1 (`LANE-V095-PLATFORM-ICON`)** — author the source icon, generate `.ico`, wire `BrowserWindow({ icon })`. Reasoning:

1. It is the **single load-bearing prerequisite for every other shippable v0.9.5 lane**. Any user-visible installer / launcher without a real icon is unprofessional and forecloses meaningful first-real-build verification (Lane 2) of branding.
2. It is **medium-effort but unblocks** Lanes 2, 3, 5 (the actual closure path).
3. It has **zero sim risk** (Ring 1, faction-agnostic, no §6, UI/asset only).
4. It is **independently verifiable** with a contract test (`tests/desktop_icon_contract.test.ts`) following the codebase convention — pins icon presence + dimensions + electron-builder discovery.

**Alternative starter (if icon authoring is slower than expected):** **QW-1 + QW-2 batch** as a 30-minute "v0.9.5 micro-polish" commit — version bump + AppUserModelId + workflow comment cleanup. These are non-blocking but each closes a real gap and demonstrates that the closure backlog is being actively burned down. Could ship before Lane 1 lands.

**Absolute-minimum closure of v0.9.5 (if you must ship today):** is currently **NOT met**. Current state has groundwork shipped + tests pinning config but **zero produced artifacts and zero CI coverage of artifact production**. A reasonable v0.9.5 closure floor requires AT MINIMUM Lanes 1 + 2 + 4 (icon, first real build, version bump). That is ~5-9 hours of work and yields a manually-uploadable release artifact pair (Linux AppImage + Win unsigned NSIS) with correct branding and version. Lanes 3 + 5 (CI + GH Releases) bring the floor to something a tester can actually consume from a public link without manual coordination — that is the more meaningful closure threshold and adds another ~5-7 hours.

**v0.9.5 is shippable as-is?** **NO.** Groundwork shipped config + tests + smoke verifiers but **never produced an installer**. v0.9.5 = "platform packaging that produces a downloadable artifact" by intent; the current state is "platform packaging that *would* produce an artifact if anyone ran the script". The minimum honest closure lane is **LANE 2 (first real build)** — it converts groundwork into proof. Without it, v0.9.5 is OPENED-WITH-CONFIG, not CLOSED.
