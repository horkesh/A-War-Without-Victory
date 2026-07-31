# Release Candidate, Gold, and Publication Implementation Plan

> **For implementation:** REQUIRED SUB-SKILL: use `executing-plans` and execute one phase at a time.

**Goal:** Convert the validated game into reproducible Windows, Linux, macOS, and Steam-ready 1.0 artifacts with security, signing, clean-machine, store, press, trailer, and rollback evidence.

**Architecture:** Freeze one source commit, produce platform artifacts only through CI/release scripts, attach SBOM/license/checksum/provenance, verify on clean machines, and promote the same immutable artifacts from RC to gold. Credentials are injected through secure CI/operator channels and never stored in the repository. Steam is the primary store path; signed direct Windows, notarized macOS, and Linux AppImage are secondary distribution artifacts.

**Tech stack:** Electron/electron-builder, GitHub Actions, Windows Artifact Signing/SignTool, Apple Developer ID/notarytool, Linux AppImage, SteamPipe, SHA-256 manifests.

**Date:** 2026-07-31
**Status:** READY -- starts after R8 produces two clean 5/5 diaries
**Roadmap workstream:** R9
**Canonical owner:** immutable release commit plus generated release manifest
**Collision rule:** No feature, calibration, schema, content, or map change after RC freeze. A blocker fix creates a new RC from a new commit and repeats all downstream phases.
**Authority boundary:** `Execute the master roadmap` authorizes repo work, RC configuration, transient local packages, dry runs, and evidence templates. `Publish 1.0` (or equally explicit wording) authorizes signing with supplied credentials, store/upload actions, public release, final tag, and push.

---

## 1. Resolved decisions

1. Steam is the primary store channel; direct signed Windows, notarized macOS, and Linux AppImage are secondary artifacts from the same commit.
2. Windows direct distribution uses Microsoft Artifact Signing when available. A self-signed or unsigned public artifact is rejected; unsigned output is QA-only.
3. macOS direct distribution uses Developer ID, Hardened Runtime, `notarytool`, and ticket stapling. No ad-hoc public build.
4. Linux ships AppImage with a clean launch/sandbox/library smoke and SHA-256 manifest.
5. The final package is offline-complete: no Google Fonts or runtime CDN dependency.
6. The version sequence is `1.0.0-rc.1` (increment RC as needed) -> `1.0.0`. The final tag points to the exact gold commit and immutable artifacts.
7. Store/press/trailer copy sells the president-through-generals, negative-sum historical simulation. It does not market conquest fantasy, atrocity spectacle, or outcomes the game does not deliver.
8. macOS/Steam credentials are inputs, not design decisions. If absent, the plan completes every repo-owned/dry-run step and emits the exact credential/operator command without silently publishing an unsigned substitute.

## 2. Research basis

- Electron recommends measuring performance, deferring unnecessary work, bundling local resources, and avoiding blocking/unnecessary network work: <https://www.electronjs.org/docs/latest/tutorial/performance>.
- Electron's security checklist requires current Electron, context isolation/sandboxing, restrictive navigation/CSP, and IPC sender validation: <https://www.electronjs.org/docs/latest/tutorial/security>.
- Microsoft currently recommends Artifact Signing for non-Store distribution and explains SmartScreen publisher/hash reputation: <https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation>.
- SignTool provides signing, timestamping, and verification; digest algorithms must be explicit: <https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool>.
- Apple requires Developer ID signing and notarization for direct distribution; current automation uses `notarytool` and stapling: <https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution>.
- SteamPipe upload workflow: <https://partner.steamgames.com/doc/sdk/uploading>.

## 3. Purpose and non-goals

### In scope

- version/RC freeze, changelog and release notes;
- dependency, license, SBOM, Electron security, and secret scans;
- reproducible Win NSIS, Linux AppImage, macOS notarized build, and Steam depot configuration;
- clean-machine install/launch/save/uninstall/update-boundary evidence;
- store copy, screenshots, press kit, trailer, known issues, support/privacy/crash policy;
- signed immutable gold artifacts, tag, checksums, rollback and publication.

### Non-goals

- no new feature/polish/calibration after freeze;
- no committed certificate, secret, password, token, package binary, or private store metadata;
- no unsigned public Windows/macOS artifact;
- no telemetry upload provider added at release;
- no public claim before the exact artifact has clean-machine proof.

## 4. External-agent execution contract

```powershell
git status --short --branch
Get-Content -Raw .claude/napkin.md
Get-Content -Raw docs/life_lessons.md
Get-Content -Raw docs/plans/MASTER_ROADMAP.md
Get-Content -Raw docs/plans/2026-06-08-v1.0-definition-of-done.md
Get-Content -Raw docs/40_reports/implemented/20260731_FULL_CAMPAIGN_ELECTRON_VALIDATION.md
Get-Content -Raw .github/workflows/release.yml
Get-Content -Raw package.json
npm.cmd run launch:artifacts:dry-run
```

Before any external mutation, print the exact target account/channel/version/artifact SHA-256 and verify that `Publish 1.0` authorization is present in the current user instruction. Credentials are referenced by environment/secret name only.

## 5. Phase sequence

## Phase 0 -- Gold definition and RC freeze

**Assigned role:** Product Manager + Platform Specialist
**Independent review:** Technical Architect + QA Engineer

### Task 0.1 -- Reconcile definition of done

**Files:**

- Modify `docs/plans/2026-06-08-v1.0-definition-of-done.md`
- Modify `docs/20_engineering/VERSIONING.md`
- Modify `package.json`
- Modify lockfile through package manager only if version is represented there
- Create `tests/version_coherence.test.ts`

- [ ] Require R1-R8 closed and link exact reports/evidence.
- [ ] Set `1.0.0-rc.1`; no tag yet.
- [ ] Freeze scenario/baseline/save schema/content/package inputs by commit.
- [ ] Create a release-blocker label/list that contains defects only, not speculative polish.

### Task 0.2 -- Generate release notes from evidence

**Files:**

- Modify `tools/release/generate_release_notes.cjs`
- Modify `tests/release_notes_generator.test.ts`
- Create `docs/releases/1.0.0-rc.1.md`

- [ ] Generate features, historical scope, system requirements, accessibility, language status, known issues, save compatibility, and source commit.
- [ ] Fail on raw debug labels, stale versions, unsupported platform claims, or missing diary links.

```powershell
npm.cmd run typecheck
npm.cmd run test:vitest -- tests/version_coherence.test.ts tests/release_notes_generator.test.ts tests/desktop_release_ci_guardrails.test.ts --pool=forks --reporter=dot
npm.cmd run launch:artifacts:dry-run
git diff --check
```

`/simplify` -> review -> commit `chore(release): freeze 1.0 rc1`

## Phase 1 -- Security, dependency, license, and offline audit

**Assigned role:** Platform Specialist + Systems Programmer
**Independent review:** Code Review + QA Engineer

### Task 1.1 -- Electron security contract

**Files:**

- Modify Electron window/session/preload owners under `src/desktop/`
- Modify security-focused tests found by `rg -n "contextIsolation|sandbox|navigation|CSP|sender" tests src/desktop`
- Modify `tests/desktop_packaged_runtime_probe.test.ts`

- [ ] Pin context isolation, sandbox, node integration, navigation/new-window limits, CSP, permission handling, and IPC sender validation.
- [ ] Reject remote code and insecure content.
- [ ] Verify Electron/Chromium/Node versions and supported status.

### Task 1.2 -- Supply-chain and offline completeness

**Files:**

- Create `tools/release/build_sbom.cjs`
- Create `tools/release/audit_runtime_licenses.cjs`
- Create `tests/release_sbom.test.ts`
- Create `tests/runtime_license_audit.test.ts`
- Create `tests/release_offline_resources.test.ts`
- Modify package resources/config to remove remote font/media dependencies

- [ ] Generate deterministic dependency/SBOM/license manifests.
- [ ] Fail on missing license, prohibited asset license, vulnerable production dependency above the project's accepted severity policy, or remote runtime request.
- [ ] Verify all fonts, map resources, audio, and icons are packaged.

```powershell
npm.cmd audit --omit=dev
npm.cmd run test:vitest -- tests/desktop_packaged_runtime_probe.test.ts tests/audio_asset_provenance.test.ts tests/generated_artifact_ownership_matrix_contract.test.ts tests/release_sbom.test.ts tests/runtime_license_audit.test.ts tests/release_offline_resources.test.ts --pool=forks --reporter=dot
npm.cmd run desktop:release:check
```

`/simplify` -> security/license review -> commit `build(release): harden offline supply chain`

## Phase 2 -- Reproducible platform artifact matrix

**Assigned role:** Platform Specialist + Systems Programmer
**Independent review:** Platform Specialist

### Task 2.1 -- Windows NSIS and signing path

**Files:**

- Modify `package.json` electron-builder configuration
- Modify `.github/workflows/release.yml`
- Modify `tools/build/win_nsis_smoke.cjs`
- Modify `tests/launch_operator_artifacts.test.ts`

- [ ] Produce unsigned QA artifact only when signing credentials are absent; mark manifest `qa_only_unsigned=true`.
- [ ] Configure Artifact Signing/SignTool using CI secrets and SHA-256 timestamp/digest.
- [ ] Verify executable and installer signatures after build.
- [ ] Preserve one publisher identity across releases.

### Task 2.2 -- Linux AppImage

**Files:**

- Modify release workflow Linux job
- Modify `tools/build/linux_appimage_smoke.cjs`

- [ ] Build AppImage from the frozen commit.
- [ ] Verify executable bit, launch, local server, map resources, save path, and required libraries on a clean supported distro/container/VM.

### Task 2.3 -- macOS signing/notarization

**Files:**

- Modify electron-builder mac config
- Modify release workflow macOS job
- Create/modify macOS artifact verification script/test

- [ ] Enable Hardened Runtime and correct entitlements.
- [ ] Sign with Developer ID Application from CI keychain/secret.
- [ ] Submit through `notarytool`, require accepted status, staple ticket, and verify with `codesign`, `spctl`, and `stapler validate`.
- [ ] Never fall back to ad-hoc for a public artifact.

### Task 2.4 -- Reproducibility and manifest

- [ ] Build each unsigned byte-comparable artifact twice where the toolchain permits and compare.
- [ ] Record source commit, version, platform, architecture, size, SHA-256, signing/notarization identity/status, build job, and smoke result.
- [ ] Keep binaries outside git.

```powershell
npm.cmd run desktop:package:win:nsis
npm.cmd run desktop:package:win:nsis:smoke
npm.cmd run desktop:package:linux:appimage
npm.cmd run desktop:package:linux:appimage:smoke
npm.cmd run launch:artifacts:dry-run
```

`/simplify` -> platform review -> commit `build(release): complete platform artifact matrix`

## Phase 3 -- Clean-machine acceptance

**Assigned role:** Platform Specialist + QA Engineer
**Independent review:** Verification Before Completion

Create one evidence packet per artifact/machine:

- [ ] OS version/build, architecture, VM/image identity, clean-user state, artifact SHA-256.
- [ ] Install/launch time, SmartScreen/Gatekeeper behavior, menu/shortcut/app registration, protocol registration.
- [ ] New campaign, map open/return, three advances, save, exit, relaunch, load, replay, settings persistence.
- [ ] Offline launch and no unexpected remote requests.
- [ ] Uninstall, user-data retention/removal behavior, registry/file leftovers.
- [ ] Crash log location and support instructions.
- [ ] Windows signature, macOS notarization/ticket, Linux AppImage launch results.

**Files:**

- Create `docs/40_reports/release/1.0.0-rc.1/clean-machine-matrix.md`
- Add no screenshots/binaries to git unless report policy permits small referenced images; store large evidence externally/untracked with manifest hashes.

Any blocker fix returns to Phase 0 with `rc.N+1` and repeats Phases 1-3.

## Phase 4 -- Store, press, trailer, and support readiness

**Assigned role:** Product Manager + Documentation Specialist + UI/UX Developer
**Independent review:** Historian + Canon Compliance Reviewer

### Task 4.1 -- Steam/store package

**Files:**

- Create `docs/releases/store/steam_1.0.md`
- Create Steam depot/build scripts/templates under `tools/release/steam/` with no credentials
- Create store copy/screenshot validation test

- [ ] Short/long description, feature list, historical/content warning, system requirements, languages, accessibility, support/privacy, and known issues.
- [ ] Screenshots come from the exact RC/gold artifact and show real UI.
- [ ] Configure depots/branches so RC promotes without rebuilding the artifact.

### Task 4.2 -- Press kit and trailer

**Files:**

- Create `docs/releases/press/1.0/README.md`
- Create trailer shot list/script and asset manifest
- Modify `tools/release/prepare_launch_artifacts.cjs`

- [ ] Position the game as president-through-generals and historically constrained/negative-sum.
- [ ] Use no atrocity spectacle, body-count hook, misleading conquest promise, copyrighted anthem/folk cue, or fabricated review quote.
- [ ] Record license/source for every image/audio/video asset.
- [ ] Include logo, key art, factual one-sheet, developer contact, screenshots, trailer, and press FAQ.

### Task 4.3 -- Support and rollback

- [ ] Write known-issues, save-backup, crash-log, verification-checksum, and refund/support routing.
- [ ] Pin previous RC/gold artifacts and rollback steps without auto-updater dependence.

`/simplify` -> historical/marketing/license review -> commit `docs(release): complete gold publication kit`

## Phase 5 -- Gold promotion and public publication

**Assigned role:** Platform Specialist + Product Manager
**Independent review:** QA Engineer + owner external-state confirmation

This phase executes only when the current instruction explicitly authorizes `Publish 1.0` and required credentials are available.

- [ ] Verify R8 final reports and two 5/5 diaries still bind the release commit.
- [ ] Run full local/CI gates from a clean checkout.
- [ ] Change version from final RC to `1.0.0`; rebuild/sign/notarize once through the release workflow.
- [ ] Repeat artifact and clean-machine verification for the gold hashes or prove the only difference is signed/version metadata as designed.
- [ ] Upload/promote Steam depots and secondary artifacts; verify download/install from each public channel.
- [ ] Publish release notes/support/press/trailer.
- [ ] Create annotated `v1.0.0` tag on the gold commit and push it.
- [ ] Record public URLs, artifact hashes, job ids, signing/notarization status, and rollback version.
- [ ] Create `docs/40_reports/implemented/YYYYMMDD_V1_0_GOLD_PUBLICATION.md` and update roadmap/ledger/version docs.

```powershell
npm.cmd run typecheck
npm.cmd run test:vitest -- --pool=forks --reporter=dot
npm.cmd run test:baselines
npm.cmd run engine:health:gate
npm.cmd run ci:structural-fingerprint:check
npm.cmd run qa:player-experience
npm.cmd run desktop:release:check
npm.cmd run launch:artifacts:dry-run
git diff --check
```

## 6. Success criteria

- [ ] One immutable gold commit produces all platform/store artifacts.
- [ ] Windows is trusted-signed, macOS signed/notarized/stapled, Linux AppImage clean-launches.
- [ ] Clean-machine install/play/save/load/uninstall evidence exists for every public artifact.
- [ ] SBOM, licenses, checksums, release notes, known issues, support, store, press, and trailer are complete and honest.
- [ ] Public channel downloads match recorded hashes and launch successfully.
- [ ] `v1.0.0` tag, release record, rollback plan, roadmap, and ledger all point to the same gold commit.

## 7. Copy-ready execution prompt

```text
Role and objective: Implement roadmap R9 from docs/plans/2026-07-31-release-candidate-gold-publication-plan.md after R8 has two clean 5/5 diaries. Work from one frozen commit and promote immutable artifacts.

Locked decisions: Steam primary; signed Windows direct secondary via Artifact Signing/SignTool; notarized Developer ID macOS; Linux AppImage; offline-complete; RC -> gold; no feature work after freeze.

Authority: Execute repo/RC/dry-run work under `Execute the master roadmap`. Before signing, uploading, tagging, pushing, or public release, confirm the current user instruction explicitly authorizes `Publish 1.0` and print exact target/artifact hashes.

Constraints: no secrets/certs/binaries in git, no unsigned public artifacts, clean-machine evidence, deterministic manifests, one logical commit, /simplify and independent verification each phase.

Handoff: source commit/version, files, tests/results, artifact paths/sizes/hashes/signing status, clean-machine results, store/press assets, external actions performed, public URLs, rollback, docs/ledger updates, next phase.
```

## 8. Orchestrator completion block

**Canonical owner:** frozen source commit and immutable release manifest.
**Demoted path:** manually rebuilt store artifact, unsigned public binary, history-free marketing, credential in repo.
**Player-visible truth:** the tested game downloaded from the public channel matches the reviewed RC/gold.
**Canonical UI surface:** packaged Electron artifact validated in R8.
**Done means:** signed/notarized clean-machine-proven artifacts, honest store/press package, public hash verification, tag, and rollback record all agree.
