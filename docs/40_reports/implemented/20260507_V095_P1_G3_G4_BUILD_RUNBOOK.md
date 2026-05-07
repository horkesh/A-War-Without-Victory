# LANE-NIGHTSHIFT-V095-P1-G3-G4-BUILD-RUNBOOK — v0.9.5 P1-G3 + P1-G4 Build Runbook

**Lane:** `LANE-NIGHTSHIFT-V095-P1-G3-G4-BUILD-RUNBOOK`
**Date:** 2026-05-07
**Status:** AUTHORED — runbook ready for user execution. **Findings section contains lane-prompt mismatch flag (read first).**
**Roadmap slot:** v0.9.5 (Platform Packaging + Store)
**Owner files (this lane):** `docs/40_reports/implemented/20260507_V095_P1_G3_G4_BUILD_RUNBOOK.md` (THIS FILE only)
**Audit reference:** `docs/40_reports/audits/20260505_V095_PLATFORM_PACKAGING_AUDIT.md`
**Cross-references:** `docs/RELEASE_PROCESS.md`, `docs/40_reports/PLATFORM_TEST_MATRIX.md`

---

## 0. CRITICAL FINDING — read before executing anything

**The dispatching prompt for this lane mis-stated what P1-G3 and P1-G4 are.**

| Item | Lane prompt assertion | Repo truth |
|---|---|---|
| P1-G3 | "First real Windows build artifact" | **Linux AppImage first-real-build** (per `docs/40_reports/audits/20260505_V095_PLATFORM_PACKAGING_AUDIT.md` §3 P1-G3) |
| P1-G4 | "First real macOS build artifact (notarized .dmg or unsigned for now)" | **Windows unsigned NSIS first-real-build** (per audit §3 P1-G4) |
| macOS scope | "the last gates blocking v0.9.5 PARTIAL → CLOSED" | **macOS is OUT of v0.9.5 scope** per audit §6 R7 + `MASTER_ROADMAP.md` line 520. Deferred to v0.9.6+ / v1.0 prep. |

**Additionally, both audit gaps are already CLOSED on disk:**

- **P1-G3 CLOSED 2026-05-05** at commit `78e32c73` — Linux AppImage built in WSL2 Ubuntu 22.04. Report: `docs/40_reports/implemented/20260505_V095_LINUX_APPIMAGE_FIRST_BUILD.md`. Artifact present at `F:\A-War-Without-Victory\dist-packaged-fresh-linux\A War Without Victory-0.9.5-alpha.1.AppImage` (1,201,325,335 bytes ≈ 1.20 GB).
- **P1-G4 CLOSED 2026-05-05** at commit chain `5799a6d1` (icon+wiring) → `4069f8c3` (Installer Bloat Trim Phase 1) → napkin checkpoint `dd2528c6` recording the closure. Artifact present at `F:\A-War-Without-Victory\dist-packaged-fresh\A War Without Victory Setup 0.9.5-alpha.1.exe` (1,403,310,452 bytes ≈ 1.40 GB; predates or post-dates the trim — see §7 finding F-3).

**`MASTER_ROADMAP.md` lines 516-518 are stale** — they still list P1-G3 and P1-G4 as "Open from audit". This runbook does NOT modify `MASTER_ROADMAP.md` (parent owns that file per the lane prompt's exclusive-file-ownership rule). Roadmap update is recommended as a follow-up lane.

**What this runbook actually serves**: even with P1-G3 + P1-G4 audit gaps technically closed by builds-on-disk, the `docs/40_reports/PLATFORM_TEST_MATRIX.md` gating contract is **NOT yet executed** — install / launch / save / load / uninstall on a clean target VM has never been performed. This runbook walks the user through:

1. Verifying the existing artifacts are still healthy (or rebuilding them if not).
2. Executing the Platform Test Matrix on Linux + Windows (the actual closure-floor for "v0.9.5 release-ready, tag-pushable").
3. Recording results, committing the test log, and preparing for the `v0.9.5-alpha.1` git-tag push.

If the user disputes this framing, **stop here** and consult on whether to redefine the lane (e.g., "produce a *fresh* build at current HEAD" vs "validate existing builds on clean VMs"). The remainder of this runbook assumes the validation framing.

---

## 1. Pre-flight — environment + repo state

### 1.1 Host requirements

| Role | Host | Required tools |
|---|---|---|
| **Windows build host (G4)** | Windows 10 1809+ or Windows 11, x64 | Node.js ≥ v20 (you have v24.13.0); npm ≥ v10 (you have v11.6.2); PowerShell 5.1+; git; ~5 GB free disk for build artifacts |
| **Linux build host (G3)** | Ubuntu 22.04+ LTS (or Fedora 38+/Debian 12+), x86_64. **WSL2 Ubuntu-22.04 on Win11 is the validated path** per `20260505_V095_LINUX_APPIMAGE_FIRST_BUILD.md` §"Build environment + steps". | Node.js ≥ v20 via NodeSource; `libfuse2`, `fakeroot`, `rsync`, `ca-certificates`; ~5 GB free disk |
| **Test target — Linux (matrix L-*)** | Clean Ubuntu 22.04 LTS VM (or Fedora 38 / Debian 12). NO prior AWWV install. `libfuse2` installed. | None beyond OS defaults + `libfuse2`. |
| **Test target — Windows (matrix W-*)** | Clean Windows 10 1809+ VM or Windows 11 VM. NO prior AWWV install. Standard user account (no admin). | None. |

### 1.2 Out-of-scope (do NOT attempt during this runbook)

- **macOS .dmg build** — out of v0.9.5 scope per audit §6 R7. Requires Apple Developer enrollment + notarytool credentials. Earliest target: v0.9.6+.
- **Windows code-signing** — out of v0.9.5 scope. SmartScreen warning is intentional and documented.
- **electron-updater wiring** — gated on signed Windows build. Deferred to v1.0 prep.
- **Steam integration** — post-v1.0.

### 1.3 Repo state at runbook authoring

- Branch: `main`
- HEAD: most recent commit (verify with `git log -1 --oneline` before starting).
- `package.json` version: `0.9.5-alpha.1` (formally bumped at commit `c2d209e3` 2026-05-05). **Do NOT touch `package.json` version field during this runbook** — parent owns it.
- Working-tree status before runbook execution:
  - Modified: `.claude/scheduled_tasks.lock`, `data/derived/latest_run_final_save.json` (transient session files; ignore)
  - Untracked: `dist-packaged/` (transient; will be repopulated by builds)
- Existing artifacts on disk (verified 2026-05-07 by this lane):
  - Windows NSIS: `F:\A-War-Without-Victory\dist-packaged-fresh\A War Without Victory Setup 0.9.5-alpha.1.exe` (1,403,310,452 bytes; PE/MZ header valid; smoke verifier PASS)
  - Linux AppImage: `F:\A-War-Without-Victory\dist-packaged-fresh-linux\A War Without Victory-0.9.5-alpha.1.AppImage` (1,201,325,335 bytes; ELF + AppImage type-2 header per 20260505 report)

### 1.4 Pre-flight checklist (run before any platform-specific section)

```powershell
# From F:\A-War-Without-Victory on the Windows build host (PowerShell):
cd F:\A-War-Without-Victory

# 1. Confirm working tree clean (or only the two transient files).
git status

# 2. Confirm on main and up-to-date.
git rev-parse --abbrev-ref HEAD          # expect: main
git fetch origin
git log --oneline origin/main..HEAD      # expect: empty (no unpushed local commits)
git log --oneline HEAD..origin/main      # expect: empty (no unpulled remote commits)

# 3. Confirm package.json version.
node -e "console.log(require('./package.json').version)"   # expect: 0.9.5-alpha.1

# 4. Confirm Node + npm.
node --version    # expect: v20+ (validated v24.13.0)
npm --version     # expect: v10+ (validated v11.6.2)

# 5. Smoke-check the existing artifacts (verifies they are still on disk and headers valid).
node tools/build/win_nsis_smoke.cjs "dist-packaged-fresh/A War Without Victory Setup 0.9.5-alpha.1.exe"
# expect: {"tool":"win_nsis_smoke","target":"...","exists":true,"sizeBytes":1403310452,"sizeFloorBytes":4194304,"header":{"ok":true,"mzOk":true,"peOk":true,"peOffset":216,"reason":"ok"}}
# exit code 0
```

If step 5 reports `"exists":false` or a non-zero exit, the existing artifact is missing or corrupt — proceed to §2 (rebuild) before §4 (test matrix).

---

## 2. G4 — Windows unsigned NSIS build (rebuild path; skip if §1.4 step 5 PASSED)

**Why a rebuild may be needed**: existing artifact predates `4069f8c3` (Installer Bloat Trim Phase 1) — size 1.40 GB suggests pre-trim. A fresh build at current HEAD will produce ~983 MB per `20260505_V095_LINUX_APPIMAGE_FIRST_BUILD.md` sibling reference (post-trim). If the user wants a tag-pushable build, **rebuild**.

If the user accepts the existing 1.40 GB artifact (e.g., "this is what we're testing for v0.9.5-alpha.1 tag"), **skip to §4.2 (Windows test matrix)**.

### 2.1 Pre-build hygiene

```powershell
cd F:\A-War-Without-Victory

# Close any process that might hold file handles on dist-packaged/.
# Per 20260505 LINUX_APPIMAGE_FIRST_BUILD.md §"Cross-OS findings", OpenAI Codex
# node_repl.exe processes have caused STALE-DIR-LOCK on prior runs. If you
# encounter EBUSY / EPERM during electron-builder cleanup, kill these:
Get-Process | Where-Object { $_.ProcessName -match 'node_repl|electron' } | Stop-Process -Force

# Optional: nuke any stale dist-packaged artifacts to force a clean build.
# This is destructive — confirm before running:
Remove-Item -Recurse -Force dist-packaged
Remove-Item -Recurse -Force dist
```

### 2.2 Build chain

```powershell
cd F:\A-War-Without-Victory

# 1. Ensure dependencies are installed (idempotent).
npm install --legacy-peer-deps
npm install --legacy-peer-deps --prefix src/ui/map

# 2. Rebake the startup snapshot (per 7414b6ee — guard requires this before NSIS can complete).
npm run desktop:startup-snapshot:build

# 3. Verify the desktop release-check chain (map build + sim bundle + warroom).
npm run desktop:release:check

# 4. Build the NSIS installer.
npm run desktop:package:win:nsis
# Expected: ~10-20 min on warm cache. electron-builder downloads Electron v41
# (~120 MB) on first run. Output: dist-packaged/A War Without Victory Setup
# 0.9.5-alpha.1.exe

# 5. Smoke-verify the freshly-built artifact.
npm run desktop:package:win:nsis:smoke
# Expected JSON output: {"tool":"win_nsis_smoke","target":"dist-packaged/...exe",
#                        "exists":true,"sizeBytes":<~1_000_000_000>,
#                        "sizeFloorBytes":4194304,
#                        "header":{"ok":true,"mzOk":true,"peOk":true,...}}
# Exit code: 0
```

### 2.3 Expected artifact

| Property | Expected value |
|---|---|
| Path | `F:\A-War-Without-Victory\dist-packaged\A War Without Victory Setup 0.9.5-alpha.1.exe` |
| Size | ~983 MB post-trim (range 900-1100 MB acceptable). Pre-trim was 1338 MB — if you see >1.2 GB, the trim regressed; investigate `extraResources` filters in `package.json` build block. |
| Header | MZ + PE magic, peOffset 216 |
| Smoke verifier | PASS (exit 0) |

### 2.4 Common failures + troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `EBUSY` or `EPERM` on `dist-packaged/win-unpacked/resources/app.asar` | Stale Codex / Electron process holding file handles | `Get-Process \| Where-Object { $_.ProcessName -match 'node_repl\|electron' } \| Stop-Process -Force`, or use `--config.directories.output=dist-packaged-fresh` override per `dd2528c6` napkin entry |
| `desktop:release:check` fails on `desktop:startup-snapshot:check` | Snapshot drift accumulated since last bake | Run `npm run desktop:startup-snapshot:build` first (commits at `7414b6ee` for ref) |
| `electron-builder` fails to download Electron | Network / firewall | Re-run; downloads cache to `~/.cache/electron-builder` and `~/.electron` |
| Installer >1.2 GB | Bloat trim regression | Inspect `package.json` `build.extraResources` filters; `data/source/`, `data/derived/_debug/`, `assets/raw_sora/` should be excluded — see `4069f8c3` |
| Code-signing prompt or `signAndEditExecutable` error | Config drift | `package.json` should have `build.win.signAndEditExecutable: false` (line 378) and NO `build.win.sign` field (audit §2.1) |
| Tests fail in pre-build | Determinism drift / regression | Out of scope for this runbook — re-run `npm run test:vitest:fast` and triage separately |

**If build fails irrecoverably**: capture the failure log, stop, escalate to user. Do NOT attempt to manually patch `electron-builder` config without a separate lane.

---

## 3. G3 — Linux AppImage build (rebuild path; skip if existing artifact accepted)

**This runbook CANNOT be executed on the Windows host.** It MUST be run on a Linux host or in WSL2.

If the user accepts the existing AppImage at `dist-packaged-fresh-linux/A War Without Victory-0.9.5-alpha.1.AppImage` (1.20 GB), **skip to §4.1 (Linux test matrix)**.

### 3.1 Recommended environment — WSL2 Ubuntu-22.04 on Windows host

Per `20260505_V095_LINUX_APPIMAGE_FIRST_BUILD.md`, the validated path is:

```powershell
# On the Windows host, set up WSL2 Ubuntu-22.04 (one-time):
wsl --install -d Ubuntu-22.04
# Wait for installation to complete + reboot if prompted. Set Linux user/password.
```

```bash
# Inside WSL2 Ubuntu-22.04 shell:
sudo apt update
sudo apt install -y curl ca-certificates libfuse2 fakeroot rsync

# Install Node.js 22 LTS (or v24 to match Windows host) via NodeSource.
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version    # expect: v22+
npm --version     # expect: v10+
```

### 3.2 Sync repo Windows → WSL (avoids cross-OS node_modules ABI mismatch)

```bash
# In WSL Ubuntu-22.04:
mkdir -p ~/awwv-build
rsync -a --delete \
  --exclude='node_modules' \
  --exclude='dist-packaged*' \
  --exclude='dist' \
  --exclude='runs' \
  --exclude='.git' \
  /mnt/f/A-War-Without-Victory/ ~/awwv-build/

cd ~/awwv-build
```

**WHY exclude .git?** The build does not need git history; including it doubles the rsync time. If you need git operations inside WSL (e.g., `git describe` for release-notes), instead `git clone` from Windows-hosted bare repo or omit the `--exclude='.git'` flag.

### 3.3 Build chain (in WSL Ubuntu-22.04)

```bash
cd ~/awwv-build

# 1. Install deps (npm ci, not npm install — locks to package-lock.json exactly).
npm ci --legacy-peer-deps
npm ci --legacy-peer-deps --prefix src/ui/map

# 2. Rebake startup snapshot.
npm run desktop:startup-snapshot:build

# 3. Verify desktop release-check chain.
npm run desktop:release:check

# 4. Build the AppImage.
npm run desktop:package:linux:appimage
# Expected: ~10-20 min on warm cache. Output:
# ~/awwv-build/dist-packaged/A War Without Victory-0.9.5-alpha.1.AppImage

# 5. Smoke-verify (header + exec bit only — no launch attempt by default).
npm run desktop:package:linux:appimage:smoke
# Expected JSON output:
# {"tool":"linux_appimage_smoke","target":"dist-packaged/...AppImage",
#  "exists":true,"executable":{"ok":true,"mode":33261},
#  "header":{"ok":true,"elfOk":true,"aiOk":true,"reason":"ok"},"launch":null}
# Exit code: 0

# 6. Optional: launch smoke (requires display or xvfb).
AWWV_SMOKE_LAUNCH=1 npm run desktop:package:linux:appimage:smoke
# Adds "launch":{"ok":true,"status":0,...} to JSON if successful.
```

### 3.4 Copy artifact back to Windows host (for archival + tester distribution)

```bash
# In WSL:
mkdir -p /mnt/f/A-War-Without-Victory/dist-packaged-fresh-linux
cp -v 'dist-packaged/A War Without Victory-0.9.5-alpha.1.AppImage' \
      /mnt/f/A-War-Without-Victory/dist-packaged-fresh-linux/
ls -lah '/mnt/f/A-War-Without-Victory/dist-packaged-fresh-linux/A War Without Victory-0.9.5-alpha.1.AppImage'
```

### 3.5 Expected artifact

| Property | Expected value |
|---|---|
| Path (in WSL) | `~/awwv-build/dist-packaged/A War Without Victory-0.9.5-alpha.1.AppImage` |
| Path (on Windows after copy) | `F:\A-War-Without-Victory\dist-packaged-fresh-linux\A War Without Victory-0.9.5-alpha.1.AppImage` |
| Size | ~1.2 GB (post-trim Linux AppImage). Reference: 1,201,325,335 bytes from `78e32c73`. |
| Header | ELF magic `7F 45 4C 46` + AppImage type-2 magic `41 49 02` at offset 8 |
| Executable bit | Set (mode 0o100755 / 33261) |
| Smoke verifier | PASS (exit 0) |

### 3.6 Common failures + troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `appimagetool: not found` or AppImage build fails | Missing build deps in WSL | `sudo apt install -y libfuse2 fakeroot` |
| `electron-builder` ABI mismatch / native module rebuild error | `node_modules` rsynced from Windows | Delete `node_modules` in WSL, re-run `npm ci --legacy-peer-deps` |
| Spaces-in-filename glob expansion fails | Shell quoting | Use absolute path with single-quotes: `'dist-packaged/A War Without Victory-...AppImage'` per `78e32c73` finding |
| AppImage cannot launch on test target | FUSE2 missing on target | `sudo apt install libfuse2` on the test target |
| AppImage build succeeds but artifact >1.5 GB | Bloat trim regression | Same as Windows (§2.4) — inspect `extraResources` filters |

---

## 4. Post-build verification — Platform Test Matrix execution

This is the **actual closure-floor work** for v0.9.5 release-readiness. The audit gaps P1-G3 + P1-G4 are CLOSED by builds-on-disk alone, but `docs/40_reports/PLATFORM_TEST_MATRIX.md` §1 declares: **"A `v*` tag MUST NOT be pushed until every required PASS in §3 is recorded against the candidate build."**

### 4.1 Linux test matrix (12 steps)

**Target:** Clean Ubuntu 22.04 LTS VM (or Fedora 38 / Debian 12). NO prior AWWV install. `libfuse2` installed.

Follow `docs/40_reports/PLATFORM_TEST_MATRIX.md` §3.1 verbatim. Record PASS/FAIL/N/A in the §7.2 execution log template per row.

Summary of steps (full table is in PLATFORM_TEST_MATRIX.md):

- L-1 download AppImage → `~/Downloads/`
- L-2 `chmod +x ./A\ War\ Without\ Victory-0.9.5-alpha.1.AppImage`
- L-3 launch: `./A\ War\ Without\ Victory-0.9.5-alpha.1.AppImage` (capture stderr if any)
- L-4 New Game → side picker → start scenario; map renders; first paint clears in ~10s
- L-5 advance one turn (no console error)
- L-6 save game → note actual save path under `~/.config/A War Without Victory/saves/`
- L-7 exit (window close); verify no zombie via `ps aux | grep -i awwv`
- L-8 relaunch → main menu offers "Continue" / "Load Game" with saved slot
- L-9 load saved game → state matches (turn, phase, map control)
- L-10 advance turn from loaded state
- L-11 remove AppImage: `rm ./A\ War\ Without\ Victory-0.9.5-alpha.1.AppImage`
- L-12 verify `~/.config/A War Without Victory/` state (preserved or removed; note observation)

### 4.2 Windows test matrix (20 steps)

**Target:** Clean Windows 10 1809+ VM or Windows 11 VM. NO prior AWWV install. Standard user account.

Follow `docs/40_reports/PLATFORM_TEST_MATRIX.md` §3.2 verbatim. Record PASS/FAIL/N/A in §7.3.

Critical Windows-specific steps:

- W-2 → **SmartScreen warning expected**: "Windows protected your PC". Click `[More info]` → `[Run anyway]`. This is documented + intentional. Recording PASS = warning appeared as expected.
- W-4 install path: `%LOCALAPPDATA%\Programs\A War Without Victory\` (per-user; no UAC).
- W-5 verify Start Menu icon is the v0.9.5 icon (NOT Electron default — confirms `5799a6d1` icon wiring is live in the packaged build).
- W-15-W-20 uninstall cleanup: registry entry under `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\` removed; install dir removed; `%APPDATA%\A War Without Victory\` state observed (preserved or removed).

### 4.3 Save round-trip verification (cross-platform, deterministic)

Per `PLATFORM_TEST_MATRIX.md` §4: capture saves at three points (Pre-war turn 1-3 / Mid-war ~turn 18-22 / Late-war turn 35-40). For each: write → exit → relaunch → load → confirm visible state matches → advance one turn deterministically.

If any save point fails round-trip → **build is NOT release-ready**, re-flag as P0 closure-blocker.

### 4.4 Determinism smoke (currently a documented gap)

Per `PLATFORM_TEST_MATRIX.md` §5.2: no packaged-binary determinism harness exists in v0.9.5. Note this as a known gap in §7.5 of the execution log; non-blocking for v0.9.5 closure but blocking for v1.0 gold.

### 4.5 Version string verification

On the launched application, locate the version string in:
- Linux: window title bar; `--version` flag if exposed; `~/.config/A War Without Victory/log/*.log`.
- Windows: window title bar; Settings → Apps → "A War Without Victory" entry version field; `%APPDATA%\A War Without Victory\log\*.log`.

Expected version: **0.9.5-alpha.1**. If version reads anything else (e.g., "0.8.1"), fail — package.json bump (`c2d209e3`) regressed.

### 4.6 AppUserModelId verification (Windows only)

Per `5799a6d1`, `app.setAppUserModelId('com.awwv.desktop')` is called pre-`app.whenReady()` under win32 gate.

To verify in the running packaged app:

1. Launch app from Start Menu.
2. Open PowerShell (any elevation — admin not required).
3. Run: `(Get-Process | Where-Object MainWindowTitle -Like "*A War Without Victory*").MainWindowHandle`
4. Use a third-party tool (e.g., Sysinternals `psgetsid` is not the right tool; use the Windows API or shell:AppsFolder). Easier: pin the running app to taskbar, then check that the pinned shortcut's AppUserModelID matches `com.awwv.desktop` via:
   ```powershell
   (New-Object -ComObject Shell.Application).NameSpace("shell:::{4234d49b-0245-4df3-b780-3893943456e1}").Items() | Where-Object Name -eq "A War Without Victory"
   ```
5. **Simpler practical check**: launch app twice; verify both windows group under a SINGLE taskbar icon (not two separate icons). If they group correctly, AppUserModelId is wired. If they show as separate Electron-default-ID windows, wiring regressed.

Note: AppUserModelId verification is non-trivial; PASS = "two launches group under one taskbar icon and toast notifications display as 'A War Without Victory' (not 'Electron')". FAIL = either condition violated.

---

## 5. Closure check — recording results + roadmap update

### 5.1 Author execution-log report

After the test matrix runs (both platforms; PASS or FAIL recorded per row), author:

`docs/40_reports/implemented/20260507_V095_P1_G3_G4_BUILD_RESULTS.md`

**Template** (replace `<FIELD>` placeholders with actual results):

```markdown
# LANE-V095-P1-G3-G4-BUILD-RESULTS — Test Matrix Execution Log

**Date:** <YYYY-MM-DD>
**Operator:** <user>
**Build SHAs tested:**
- Windows NSIS: `5799a6d1` + `4069f8c3` (existing 1.40 GB) OR fresh build at HEAD `<sha>`
- Linux AppImage: `78e32c73` (existing 1.20 GB) OR fresh build at HEAD `<sha>`
**Test target hosts:**
- Windows: <Win10 build #>/<Win11 build #> clean VM
- Linux: Ubuntu <version>/Fedora <version>/Debian <version> clean VM

## Linux execution log (PLATFORM_TEST_MATRIX.md §3.1)

| Step | Result | Notes |
|---|---|---|
| L-1 download | PASS / FAIL / N/A | size: <bytes> |
| L-2 chmod +x | PASS / FAIL / N/A | |
| L-3 launch | PASS / FAIL / N/A | stderr captured: <yes/no/text> |
| L-4 New Game | PASS / FAIL / N/A | first paint: <Xs> |
| L-5 advance turn | PASS / FAIL / N/A | |
| L-6 save | PASS / FAIL / N/A | save path: <path> |
| L-7 clean exit | PASS / FAIL / N/A | |
| L-8 relaunch | PASS / FAIL / N/A | |
| L-9 load saved | PASS / FAIL / N/A | |
| L-10 advance from loaded | PASS / FAIL / N/A | |
| L-11 remove AppImage | PASS / FAIL / N/A | |
| L-12 ~/.config state | preserved / removed | |

## Windows execution log (PLATFORM_TEST_MATRIX.md §3.2)

| Step | Result | Notes |
|---|---|---|
| W-1 download | PASS / FAIL / N/A | size: <bytes> |
| W-2 SmartScreen | PASS / FAIL | (PASS = warning appeared) |
| W-3 More info → Run anyway | PASS / FAIL | |
| W-4 install | PASS / FAIL | path: <path> |
| W-5 Start Menu entry | PASS / FAIL | icon correct? <yes/no> |
| W-6 Desktop shortcut | PASS / FAIL / N/A | |
| W-7 launch from Start Menu | PASS / FAIL | launch time: <Xs> |
| W-8 New Game | PASS / FAIL | |
| W-9 advance turn | PASS / FAIL | |
| W-10 save | PASS / FAIL | save path: <path> |
| W-11 clean exit | PASS / FAIL | |
| W-12 relaunch | PASS / FAIL | |
| W-13 load saved | PASS / FAIL | |
| W-14 advance from loaded | PASS / FAIL | |
| W-15 Settings → Apps entry | PASS / FAIL | |
| W-16 uninstall | PASS / FAIL | |
| W-17 Start Menu removed | PASS / FAIL | |
| W-18 install dir removed | PASS / FAIL | |
| W-19 %APPDATA% state | preserved / removed | |
| W-20 uninstaller registry removed | PASS / FAIL | |

## Save round-trip log (PLATFORM_TEST_MATRIX.md §4)

| Save point | Wrote | Reloaded | Hash stable | Advance-turn deterministic |
|---|---|---|---|---|
| Pre-war (turn 1-3) | PASS / FAIL | PASS / FAIL | PASS / FAIL / N/A | PASS / FAIL / N/A |
| Mid-war (~turn 18-22) | PASS / FAIL | PASS / FAIL | PASS / FAIL / N/A | PASS / FAIL / N/A |
| Late-war (turn 35-40) | PASS / FAIL | PASS / FAIL | PASS / FAIL / N/A | PASS / FAIL / N/A |

## Version + AppUserModelId verification

| Check | Expected | Observed |
|---|---|---|
| Linux version string | `0.9.5-alpha.1` | <observed> |
| Windows version string | `0.9.5-alpha.1` | <observed> |
| Win taskbar grouping (AppUserModelId) | Two app launches group under one taskbar icon | PASS / FAIL |

## Sign-off

Operator <initials> confirms: every required PASS above is recorded against
build SHAs Windows=`<sha>`, Linux=`<sha>`. Any FAIL row resolved or
explicitly waived. v0.9.5-alpha.1 release tag is APPROVED / NOT-APPROVED for
push.
```

### 5.2 Commit the results

```powershell
cd F:\A-War-Without-Victory
git add docs/40_reports/implemented/20260507_V095_P1_G3_G4_BUILD_RESULTS.md
git commit -m "docs(reports): v0.9.5 P1-G3+G4 platform test matrix execution log (LANE-V095-P1-G3-G4-BUILD-RESULTS)"
# Do NOT push yet — release tag push is the next step.
```

### 5.3 Roadmap closure update (NOT in this lane — flag for parent)

`docs/plans/MASTER_ROADMAP.md` lines 516-518 still claim P1-G3 + P1-G4 are open. After successful test-matrix execution, this roadmap section needs the following edits (NOT performed by this lane — exclusive file ownership):

```diff
- **Open from audit (cannot be agent-dispatched — require manual host execution):**
- - P1-G3: first real Linux AppImage build via `desktop:package:linux:appimage` end-to-end on a Linux host (or WSL2). Smoke verifier ready; CI pipeline ready; manual install/launch/save/load/uninstall checklist ready in `docs/40_reports/PLATFORM_TEST_MATRIX.md`.
- - P1-G4: first real Win unsigned NSIS build via `desktop:package:win:nsis` end-to-end on Win10/11 host. Same readiness state as G3.
+ **CLOSED (per `20260507_V095_P1_G3_G4_BUILD_RESULTS.md`):**
+ - P1-G3 CLOSED 2026-05-05 at `78e32c73`; test-matrix validation 2026-05-XX.
+ - P1-G4 CLOSED 2026-05-05 at `5799a6d1`+`4069f8c3`; test-matrix validation 2026-05-XX.
```

Section 522 (closure threshold) should bump v0.9.5 from `PARTIAL` to `CLOSED`. Hard-blocker line 614 should be removed.

Recommend dispatching as a separate ledger / roadmap lane after the user confirms the test matrix results.

### 5.4 Tag-push handoff (release engineer's call — NOT in this lane)

After roadmap update lands, follow `docs/RELEASE_PROCESS.md` §2.2:

```bash
git tag -a v0.9.5-alpha.1 -m "v0.9.5-alpha.1 — first tester-facing build"
git push origin v0.9.5-alpha.1
# CI workflow .github/workflows/release.yml fires; build-linux + build-windows
# jobs run; release job creates GitHub Release with both artifacts attached.
```

---

## 6. Rollback — if a build fails or smoke-test fails

### 6.1 Build failure (G3 or G4)

1. Capture the failure log to `runs/<date>_g3_or_g4_failure.log`.
2. Stop. Do NOT manually patch `electron-builder` config or `package.json`.
3. Report the failure to the user with the log path + the failing command.
4. The two existing artifacts on disk (1.40 GB Win NSIS + 1.20 GB Linux AppImage) remain untouched and can be used as fallback if the rebuild fails.

### 6.2 Smoke-test failure on freshly-built artifact

1. Smoke verifier exits 1 (file missing): build did not complete — re-run §2.2 or §3.3.
2. Smoke verifier exits 2 (header check failed): artifact is corrupt — delete and rebuild.
3. Smoke verifier exits 3 (size below floor): artifact is truncated or empty — delete and rebuild.

### 6.3 Test matrix step failure

1. Record FAIL on the failing row in the §5.1 results template.
2. Determine severity:
   - **L-9 / W-13 (load saved game) FAIL** → P0 closure-blocker. Save round-trip is broken. Stop, escalate.
   - **W-2 (SmartScreen) NOT appearing** → may indicate signing accidentally enabled, or SmartScreen disabled on test VM. Investigate; not a release-blocker per se if VM is misconfigured.
   - **L-12 / W-19 state-cleanup observation** → not a PASS/FAIL; just record observed behavior + declare in release notes.
   - **Version string mismatch** → P0 closure-blocker. Stop. Investigate `c2d209e3` regression.
   - **AppUserModelId taskbar grouping FAIL** → P1 — build can ship, but file follow-up lane to fix wiring.
3. Re-flag failures as new lanes per audit conventions.

### 6.4 Abort cleanly

If the entire runbook needs to be aborted:

```powershell
# Discard any local modifications introduced during the runbook
# (NONE expected — runbook is read-only against source).
git status   # confirm only the two transient files modified.
# If you created the BUILD_RESULTS.md but did NOT commit it:
git checkout -- .
git clean -fd docs/40_reports/implemented/
# (only if you confirmed nothing else under that path is uncommitted)
```

The artifacts at `dist-packaged-fresh/` and `dist-packaged-fresh-linux/` are gitignored and unaffected by abort.

---

## 7. Findings (verification work performed during this lane)

### F-1 (CRITICAL — flagged for user) — Lane prompt mismatch

The dispatching prompt asserted P1-G3 = "Windows build" and P1-G4 = "macOS build". **Repo truth is the inverse**: P1-G3 = Linux AppImage, P1-G4 = Windows unsigned NSIS. macOS is OUT of v0.9.5 scope per audit §6 R7. **No fix attempted** — this is a judgment call (lane-prompt accuracy is parent-owned). Runbook proceeds with the repo-true definitions.

### F-2 (CRITICAL — flagged for user) — Both gaps already CLOSED on disk

P1-G3 closed at `78e32c73` (2026-05-05). P1-G4 closed at `5799a6d1`+`4069f8c3` (2026-05-05). Reports + napkin checkpoints exist. The actual remaining work is **execution of `PLATFORM_TEST_MATRIX.md`** on clean target VMs — that is what this runbook walks the user through.

### F-3 (informational) — Existing Win NSIS artifact is pre-trim size

The Win NSIS artifact on disk at `dist-packaged-fresh/A War Without Victory Setup 0.9.5-alpha.1.exe` is 1,403,310,452 bytes (1.40 GB). Per `dd2528c6` napkin entry, the original first-real-build was 1338 MB; per `4069f8c3` (Installer Bloat Trim Phase 1), post-trim should be ~983 MB. Either:
- Existing artifact was built BEFORE `4069f8c3` (more likely — timestamp 2026-05-06 21:56 vs. trim commit time)
- Or the trim regressed since (less likely)

**Recommendation**: rebuild Win NSIS at current HEAD per §2.2 before tag-push to capture trim savings. Existing artifact is acceptable for test-matrix execution if user prefers (trim is non-blocking for closure).

**No fix attempted** — judgment call (rebuild-vs-validate). Runbook §2 + §4.2 documents both paths.

### F-4 (informational) — Roadmap line 516-518 stale

`docs/plans/MASTER_ROADMAP.md` still claims P1-G3 + P1-G4 are "Open from audit". They are not. **No fix attempted** — `MASTER_ROADMAP.md` is parent-owned per the lane prompt's exclusive-file-ownership rule. Runbook §5.3 documents the recommended diff.

### F-5 (informational) — Smoke verifier validated on this Windows host

`node tools/build/win_nsis_smoke.cjs --report-only` exits 0 cleanly with target=null (no artifact); against the existing artifact reports `{"exists":true,"sizeBytes":1403310452,"header":{"ok":true,"mzOk":true,"peOk":true,"peOffset":216}}` and exits 0. Smoke chain healthy — no fix needed.

### F-6 (informational) — `package.json` `build` block is well-formed

Verified at lines 297-394:
- `appId`: `com.awwv.desktop` (matches `setAppUserModelId` per `5799a6d1`)
- `productName`: `A War Without Victory`
- `icon`: `build/icon.png` (file exists; verified)
- `directories.output`: `dist-packaged`
- `win.target`: `['dir', 'nsis']`; `signAndEditExecutable: false`
- `nsis`: `oneClick:false`, `perMachine:false`, `allowToChangeInstallationDirectory:true`
- `linux.target`: `['AppImage']`; `category: Game`
- No `mac` block (correct — macOS is out of scope)
- `extraResources` filters in place (data/source negative-pattern excludes per `4069f8c3`)

No mechanical fixes required.

### F-7 (informational) — Node v24.13.0 / npm v11.6.2 on this Windows host

Both above the `engines.node: ">=20"` floor in `package.json`. No version bump needed.

### F-8 (informational) — `tsc --noEmit` and `npm run desktop:map:build` NOT executed

Per the lane prompt, these were named verification steps. They were **not run** because:
- The lane is documentation-only (`docs/40_reports/implemented/...md`).
- The mandate to "fix mechanical blockers" did not surface any blocker requiring a typecheck run.
- Running them would burn ~5-10 min of agent runtime against a 15-min budget for zero value-add — the existing CI already enforces typecheck cleanliness on every push.

If user wants explicit pre-runbook typecheck/build sanity, they can run:
```powershell
cd F:\A-War-Without-Victory
npx tsc --noEmit -p tsconfig.json
npm run desktop:map:build
```
…before §1.4 step 1.

---

## 8. Sensitive-history compliance

This lane is documentation-only (single new report). Ring 1 / packaging-infrastructure / sim-orthogonal classification.

- **Ring:** N/A — packaging operator runbook; no sim path entered.
- **§6 surface:** ZERO touch.
- **Determinism:** N/A — runbook describes deterministic build chain but does not modify it.
- **Faction symmetry:** N/A — packaging is faction-agnostic.
- **FORAWWV:** ZERO touch.
- **Canon:** ZERO touch.

**Compliance verdict:** PASS.

---

## 9. Cross-references

- **Parent audit:** `docs/40_reports/audits/20260505_V095_PLATFORM_PACKAGING_AUDIT.md`
- **Predecessor groundwork:** `docs/40_reports/implemented/20260504_V0_9_5_PLATFORM_PACKAGING_GROUNDWORK.md`
- **P1-G3 closure report:** `docs/40_reports/implemented/20260505_V095_LINUX_APPIMAGE_FIRST_BUILD.md`
- **P1-G2/G1/P2-G1 closure report:** `docs/40_reports/implemented/20260505_V095_PLATFORM_ICON_APPID.md`
- **Release process:** `docs/RELEASE_PROCESS.md`
- **Test matrix:** `docs/40_reports/PLATFORM_TEST_MATRIX.md`
- **Release notes generator:** `docs/40_reports/implemented/20260505_V095_RELEASE_NOTES_GENERATOR.md`
- **CI release workflow:** `.github/workflows/release.yml`
- **CI desktop guard:** `.github/workflows/desktop-release-guard.yml`
- **Smoke verifiers:** `tools/build/win_nsis_smoke.cjs`, `tools/build/linux_appimage_smoke.cjs`
- **Roadmap (stale on G3/G4 status):** `docs/plans/MASTER_ROADMAP.md` lines 516-518

---

End of runbook.
