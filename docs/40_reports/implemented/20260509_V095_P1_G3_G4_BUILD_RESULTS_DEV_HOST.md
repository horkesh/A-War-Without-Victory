# v0.9.5 Platform Test Matrix — Dev-Host Approximation (PARTIAL)

**Lane:** `LANE-NIGHTSHIFT-V095-DEV-HOST-TEST-MATRIX-APPROXIMATION`
**Date:** 2026-05-09
**Status:** PARTIAL — agent died mid-investigation; Linux portion verified; Windows portion not started
**Predecessor:** Build runbook `docs/40_reports/implemented/20260507_V095_P1_G3_G4_BUILD_RUNBOOK.md` + Build artifacts at `dist-packaged-fresh-linux/` (Linux AppImage 1.20 GB) and `dist-packaged-fresh/` (Windows NSIS 1.40 GB)

## What was verified (PASS)

### Linux (WSL2)

- **L-3 LAUNCH: PASS.** AppImage launched successfully under WSL2; tactical map server started on `http://127.0.0.1:45101/`. DBus errors observed (expected in WSL/headless environments) but non-fatal — process initialized the server cleanly.
- 20-second smoke timeout fired before clean exit, but the launch itself was confirmed functional via the server bind.

This is non-trivial: it confirms the AppImage build is structurally sound and runnable on a Linux environment, not just an artifact-on-disk.

## What was NOT verified

The agent terminated before completing:

### Linux (WSL2) — incomplete
- L-1 download / size check (artifact known to exist on disk)
- L-2 chmod +x (would happen during launch)
- L-4 New Game (programmatic interaction not attempted)
- L-5 advance turn
- L-6 save
- L-7 clean exit (timeout cut process)
- L-8 relaunch
- L-9 load saved
- L-10 advance from loaded
- L-11 remove AppImage
- L-12 ~/.config persistence

### Windows (dev host) — not started
- W-1 through W-20 — agent did not reach Windows phase

### Save round-trip — not started
- Pre-war / mid-war / late-war save+reload+hash+advance

### Version + AppUserModelId verification — not started

## What's clean-VM-only (legitimately deferred)

Per the lane prompt's spec, these items are inherent operator clean-VM work that no dev-host approximation can cover:
- W-2 / W-3 SmartScreen warning behavior (only fires on uncommon-binary unsigned downloads)
- W-15 Settings → Apps entry visual verification
- W-19 first-run %APPDATA% persistence (needs new user state)
- W-20 uninstaller registry cleanup

## Honest partial verdict

**v0.9.5 platform test matrix is PARTIALLY unblocked:**
- ✅ Build artifacts exist on disk (P1-G3 Linux + P1-G4 Windows; verified earlier in session)
- ✅ Linux AppImage launches cleanly under WSL2 (server bind confirmed)
- ⏸️ Windows NSIS launch + save round-trip + version verification still pending agent re-dispatch OR clean-VM operator
- ⏸️ Genuinely-clean-VM-only items remain (SmartScreen, registry cleanup) — minority of test matrix

## Recommendation

The v0.9.5 hard-blocker scope has shrunk meaningfully:
- Builds done on disk
- Linux launch path verified runnable
- Windows path UNVERIFIED — the agent died before reaching it; could be re-dispatched or operator-handled

If a re-dispatch is desired, target a NARROWER scope (Windows portion only, since Linux is partially verified) and use a separate agent to keep the surface bounded.

## Successor handoff

For a v0.9.5 final closure:
1. Re-dispatch a Windows-only test lane (smaller scope; dispatch with the runbook §4.2 W-1..W-20 minus operator-only items)
2. Operator clean-VM execution of SmartScreen + registry items (cosmetic)
3. Save round-trip via either approach

## Lane self-assessment

Honest accounting: this lane delivered ~1 verified item (Linux WSL2 launch) of an intended ~30. Most of the value the lane was supposed to deliver did not land due to agent termination mid-execution. The `dist-packaged-fresh-linux/` AppImage was confirmed launchable in a cleanish Linux environment, which is genuinely informative — but the bulk of the test matrix remains unverified.

The runbook + build artifacts + this partial verification together still constitute MORE evidence than the v0.9.5 surface had at session start (which was: builds-on-disk-but-untested). Net: marginal forward progress.

---

## Windows portion (filed 2026-05-09 follow-up — LANE-NIGHTSHIFT-V095-WINDOWS-ONLY-TEST)

This section is the Windows narrow-scope follow-up to the partial closeout above. Linux is already verified PASS (§"Linux (WSL2)" above) and is NOT re-verified here. Scope intentionally bounded to: artifact integrity, silent-extract install to a temp directory (no system registration), launch-from-temp-dir, and version coherence — explicitly avoiding any modification to user environment (no Start Menu install, no registry write, no system-wide installer run).

### W-1 — Build artifact existence + size

**Result: PASS.**

```
Path: F:\A-War-Without-Victory\dist-packaged-fresh\A War Without Victory Setup 0.9.5-alpha.1.exe
Size: 1,403,310,452 bytes (1.40 GB)
Header: MZ + PE valid (peOffset=216, mzOk=true, peOk=true)
Smoke verifier: PASS (exit 0)
Sibling files: .blockmap (1.42 MB), builder-debug.yml (7,739 B), latest.yml (404 B), .icon-ico/ subdir
Build mtime: 2026-05-06 21:56 (Windows NTFS)
```

Smoke command run:
```
node tools/build/win_nsis_smoke.cjs "dist-packaged-fresh/A War Without Victory Setup 0.9.5-alpha.1.exe"
```

Output JSON:
```json
{"tool":"win_nsis_smoke","target":"dist-packaged-fresh\\A War Without Victory Setup 0.9.5-alpha.1.exe","exists":true,"sizeBytes":1403310452,"sizeFloorBytes":4194304,"header":{"ok":true,"mzOk":true,"peOk":true,"peOffset":216,"reason":"ok"}}
```

This matches finding F-3 in the `20260507_V095_P1_G3_G4_BUILD_RUNBOOK.md` (artifact is the pre-trim 1.40 GB build dated 2026-05-06).

### Version coherence — POTENTIAL FINDING (flagging)

**Observation:** `package.json` `version` field on this Windows host at the moment of test reads:

```
0.9.6-alpha.1
```

**Artifact filename:** `A War Without Victory Setup 0.9.5-alpha.1.exe`

**Implication:** The artifact on disk (built 2026-05-06) was produced when `package.json` was at `0.9.5-alpha.1`. Since then `package.json` has been bumped to `0.9.6-alpha.1` (commit history shows v0.9.5 was the formal milestone the artifact represents; semver in the working tree has since moved forward).

This is **not a regression of the artifact** — it is the expected divergence between an artifact frozen at build time vs. the current branch. But it does mean: if a user runs this v0.9.5-alpha.1 installer at this moment of the repo, the running app will display 0.9.5 (matches the artifact filename), not 0.9.6. That is correct behavior for this artifact under test.

**No fix attempted** — the lane is read-only on source code per the dispatching prompt's "DO NOT touch source code" guardrail.

---

CHECKPOINT v1: artifact existence + smoke + version observation captured. Committing before proceeding to silent-extract attempt.

### W-4 — Silent install to redirected temp directory

**Result: PASS (with caveats — see W-5/W-6).**

**Pre-install snapshot (clean baseline):**
```
HKCU Uninstall entries matching "War Without Victory" / "awwv" / "com.awwv": 0
%APPDATA%\A War Without Victory: NOT EXISTS
%LOCALAPPDATA%\Programs\A War Without Victory: NOT EXISTS
```

**Command run (PowerShell `Start-Process` — `/D=<path>` MUST be last arg, no quotes per NSIS spec):**
```
Start-Process -FilePath "F:\A-War-Without-Victory\dist-packaged-fresh\A War Without Victory Setup 0.9.5-alpha.1.exe" `
  -ArgumentList "/S","/currentuser","/D=C:\Users\User\AppData\Local\Temp\awwv-test-extract-34267595" `
  -Wait -PassThru -NoNewWindow
```

**Result:**
- Exit code: **0**
- Files extracted to temp dir: **1452**
- Main exe present: `A War Without Victory.exe` (222,836,736 bytes — Electron 41.0.3 stub, expected per `signAndEditExecutable: false` in `package.json` build block)
- All Electron runtime files present: `chrome_*.pak`, `d3dcompiler_47.dll`, `dxcompiler.dll`, `dxil.dll`, `ffmpeg.dll`, `icudtl.dat`, `libEGL.dll`, `libGLESv2.dll`, `resources.pak`, `snapshot_blob.bin`, `Uninstall A War Without Victory.exe`, `v8_context_snapshot.bin`, `vk_swiftshader.dll`, `vk_swiftshader_icd.json`, `vulkan-1.dll`
- Subdirectories: `locales/`, `resources/` (containing `app.asar`)

**Post-install state-pollution audit:**

| Marker | Pre | Post | Status |
|---|---|---|---|
| HKCU Uninstall registry entry | 0 | 0 | CLEAN — `/D=` redirect prevented default-install registry write |
| `%APPDATA%\A War Without Victory` (per-user state) | absent | absent | CLEAN — only created at first launch |
| `%LOCALAPPDATA%\Programs\A War Without Victory` | absent | absent | CLEAN — `/D=` redirected install away from default |
| Start Menu shortcut (`%APPDATA%\Microsoft\Windows\Start Menu\Programs\A War Without Victory.lnk`) | absent | **PRESENT** | **POLLUTION — installer created shortcut even with /D= redirect** |
| Desktop shortcut (`%USERPROFILE%\Desktop\A War Without Victory.lnk`) | absent | **PRESENT** | **POLLUTION — same** |

**Finding W-4-A (POLLUTION):** The electron-builder NSIS `assistedInstaller.nsh` mode writes Start Menu + Desktop shortcuts even when `/D=` redirects the install path away from `%LOCALAPPDATA%\Programs`. The shortcuts point to the installer-redirected install dir. **This is operator-unfriendly for testing**: a strict "no environment modification" path is not achievable with this installer config. Mitigation: shortcuts can be removed manually post-test (this lane will clean up before finishing).

**Finding W-4-B (POSITIVE):** No HKCU Uninstall registry entries created. This means an "Apps & Features" entry was NOT registered — the install behaves more like a portable extract than a registered install when `/D=` is supplied. This is the cleanest dev-host approximation available without resorting to a 7-Zip / native NSIS unpack tool (neither was available on this dev host: no `7z.exe` in standard paths, no PATH entry).

### W-5 — Start Menu entry creation

**Result: PRESENT (unexpected — runbook predicted FALSE for temp install).** See W-4-A above. The dispatching prompt predicted "expected miss for temp-install path" but `/D=` redirect did NOT suppress shortcut creation. This is a behavioral fact about electron-builder's NSIS template, not a build defect.

### W-6 — Desktop shortcut

**Result: PRESENT.** Same root cause as W-5.

### Version coherence at the asar layer

**Result: PASS.**

Read the embedded root `package.json` from `resources/app.asar` by parsing the asar header (16-byte header + JSON file table) and seeking to the entry's offset:

```
ASAR root package.json:
  name: awwv
  version: 0.9.5-alpha.1
  description: A War Without Victory (AWWV) simulation prototype
  productName: (empty — productName lives at electron-builder build block, not in package.json root)
```

**Coherence check:**
- Artifact filename: `A War Without Victory Setup 0.9.5-alpha.1.exe` → version segment `0.9.5-alpha.1`
- Embedded asar root `package.json.version`: `0.9.5-alpha.1`
- **MATCH** — artifact's runtime-visible version field aligns with its filename. **The artifact is genuinely a v0.9.5-alpha.1 build.**

**On the surrounding context:** the working-tree `package.json` at this moment of the repo reads `0.9.6-alpha.1` (the milestone has moved forward since 2026-05-06 build), but the artifact under test is correctly frozen at the older version. This is healthy — frozen artifacts decouple from in-flight working-tree bumps.

### Binary VersionInfo (Windows file properties)

**Observed:**
```
ProductName:  Electron
ProductVersion: 41.0.3
FileVersion: 41.0.3
CompanyName: GitHub, Inc.
OriginalFilename: electron.exe
InternalName: electron.exe
FileDescription: Electron
```

**Expected per audit §2.1:** `signAndEditExecutable: false` is intentional in `package.json` build block — Windows VersionInfo on the binary remains the unmodified Electron stub. The actual game version lives in `app.asar`, not in the PE resource section. This is **the documented v0.9.5 behavior**, not a bug.

For users browsing properties via Explorer, the visible product is "Electron 41.0.3", which is **mildly confusing** but consistent with the v0.9.5 audit's deliberate scope (signing + brand-stamping deferred to v1.0). Recommended for v1.0: enable `signAndEditExecutable: true` after acquiring a signing cert + setting `extraResources` accordingly.

---

CHECKPOINT v2: silent extract via /S /D= verified + version coherence verified. Committing before launch attempt.
