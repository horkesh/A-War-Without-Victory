# AWWV Platform Test Matrix

**Purpose:** Manual clean-VM test plan executed before each `v*` release tag push. Closes audit gaps **P2-G4** (post-install / post-uninstall manual test plan) and **P2-G5** (Linux distro coverage matrix declared) from `docs/40_reports/audits/20260505_V095_PLATFORM_PACKAGING_AUDIT.md`.
**Updated:** 2026-05-05 (v0.9.5 Platform Packaging closure groundwork)
**Scope:** Platform packaging infrastructure — Ring N/A. No simulation / determinism / `§6` surface touched.
**Cross-references:**
- `docs/RELEASE_PROCESS.md` — release tagging + GitHub Releases workflow (sibling lane).
- `docs/40_reports/audits/20260505_V095_PLATFORM_PACKAGING_AUDIT.md` — parent audit (LANE 7, gaps P2-G4 + P2-G5).
- `docs/40_reports/implemented/20260504_V0_9_5_PLATFORM_PACKAGING_GROUNDWORK.md` — predecessor groundwork.

---

## 1. When to run this matrix

**Trigger:** Before pushing any `v*` git tag (e.g. `v0.9.5-alpha.1`, `v0.9.5`, `v1.0.0`).
**Operator:** Release driver (one human runs the whole matrix on clean target VMs).
**Output:** Filled-out execution log table per platform (see §7) appended to the release tag's GitHub Release body or attached as a markdown asset.
**Hard gate:** A `v*` tag MUST NOT be pushed until every required PASS in §3 is recorded against the candidate build.

This is a **manual** matrix. CI smoke (`tools/build/linux_appimage_smoke.cjs`, `tools/build/win_nsis_smoke.cjs`) verifies that an artifact exists and has correct headers / minimum size. CI does NOT verify install cleanliness, SmartScreen behavior, save round-trip across executions, Start Menu wiring, or AppData cleanup. Those require a human on a clean VM.

---

## 2. Supported platforms — declared floors

### 2.1 Linux (AppImage target)

| Property | Floor / value |
|---|---|
| Distro family | Ubuntu 22.04+, Fedora 38+, Debian 12+ |
| glibc | ≥ 2.31 (Ubuntu 22.04 ships 2.35) |
| FUSE | **FUSE2 required** — AppImage uses libfuse2 to mount the squashfs payload at runtime. `sudo apt install libfuse2` on Debian/Ubuntu derivatives that ship FUSE3 only |
| Architecture | x86_64 (no aarch64 / ARM64 build in v0.9.5) |
| Display | X11 or Wayland with XWayland; no headless support in player path |
| Disk | ~250 MB free for AppImage + ~50 MB for `~/.config/A War Without Victory/` save tree |

### 2.2 Windows (NSIS target)

| Property | Floor / value |
|---|---|
| OS | Windows 10 1809 (October 2018 Update) and newer; Windows 11 |
| Architecture | x64 (no ARM64 build in v0.9.5) |
| Code signing | **UNSIGNED** in v0.9.5 — SmartScreen warning is expected + intentional (see §6.2) |
| Install scope | Per-user (`perMachine: false`); installs into `%LOCALAPPDATA%\Programs\A War Without Victory\` |
| Disk | ~250 MB free for installed app + ~50 MB for `%APPDATA%\A War Without Victory\` save tree |

### 2.3 Out of v0.9.5 scope

| Platform | Status | Earliest target |
|---|---|---|
| macOS (`.dmg`, notarized, universal binary) | NOT SUPPORTED in v0.9.5 | v0.9.6+ (requires Apple Developer enrollment + notarytool credentials) |
| Steam (Steamworks SDK + depot upload) | NOT SUPPORTED in v0.9.5 | post-v1.0 (requires Steamworks partner agreement) |
| Microsoft Store (`.appx` / WinGet) | NOT SUPPORTED in v0.9.5 | future / undecided |
| Linux AppImage on aarch64 / ARM64 | NOT SUPPORTED in v0.9.5 | future / undecided |
| Linux `.deb` / `.rpm` / Flatpak / Snap | NOT SUPPORTED in v0.9.5 | future / undecided |
| Windows ARM64 | NOT SUPPORTED in v0.9.5 | future / undecided |

This declared floor is the contract a player or tester sees when they download a v0.9.5 build. Anything outside the floor is "use at your own risk" and may not work at all.

---

## 3. Per-platform install / launch / save / load / advance / uninstall checklist

Each row is a single operator-verifiable step. Operator records PASS / FAIL / N/A per row in the §7 execution log.

### 3.1 Linux AppImage

**Target:** Clean Ubuntu 22.04 LTS VM (or Fedora 38 / Debian 12). No prior AWWV install. `libfuse2` installed.

| # | Step | Expected behavior | Notes |
|---|---|---|---|
| L-1 | Download `A War Without Victory-<version>.AppImage` from the GitHub Release assets | File downloads to `~/Downloads/`; size matches release-body declared size | Verify SHA-256 against release-body if published |
| L-2 | `chmod +x ./A\ War\ Without\ Victory-<version>.AppImage` | Permission bit set; `ls -l` shows `-rwxr-xr-x` | First-time-install UX gap — see §6.1 |
| L-3 | Run from terminal: `./A\ War\ Without\ Victory-<version>.AppImage` | Splash / main window appears within ~5s; no terminal stack trace | Capture stderr if anything emits |
| L-4 | Click "New Game" → side picker → start scenario | Scenario loads; map renders; first-paint skeleton clears within ~10s | Tutorial onboarding may auto-engage on first-ever launch |
| L-5 | Advance turn (one click) | Turn advances; phase indicator updates; no console error | Capture electron-main stderr if anything emits |
| L-6 | Save game (any save slot) | Save succeeds; save file written under `~/.config/A War Without Victory/saves/` (or app-equivalent path) | Note actual path observed |
| L-7 | Exit application (window close) | Process exits cleanly; no zombie | `ps aux \| grep -i awwv` returns empty |
| L-8 | Re-run AppImage from terminal | Application relaunches; main menu offers "Continue" / "Load Game" with the saved slot present | Save persisted across executions |
| L-9 | Load saved game | Game state matches what was saved; same turn / phase / map state | **Save round-trip §4 required** |
| L-10 | Advance turn from loaded state | Turn advances; deterministic result expected | If determinism smoke harness exists, see §5 |
| L-11 | Exit, then `rm ./A\ War\ Without\ Victory-<version>.AppImage` | AppImage file removed | Per AppImage convention, no installer trace to remove |
| L-12 | Verify `~/.config/A War Without Victory/` state | Save tree still present (intentional — preserves user data) OR removed (if design intent says clean-on-removal) | **Note current behavior** in execution log; declare design intent in release notes |

### 3.2 Windows NSIS installer

**Target:** Clean Windows 10 1809+ VM or Windows 11 VM. No prior AWWV install. Standard user account (no admin elevation expected — `perMachine: false`).

| # | Step | Expected behavior | Notes |
|---|---|---|---|
| W-1 | Download `A War Without Victory Setup <version>.exe` from the GitHub Release assets | File downloads to `Downloads`; size matches release-body declared size | Verify SHA-256 against release-body if published |
| W-2 | Run installer (double-click) | **SmartScreen warning appears: "Windows protected your PC"** | Expected + documented — see §6.2 |
| W-3 | Click `[More info]` → `[Run anyway]` | Installer wizard launches | This is the cliff documented in §6.2 |
| W-4 | Step through installer wizard (accept defaults) | Wizard installs into `%LOCALAPPDATA%\Programs\A War Without Victory\`; per-user; no UAC prompt | `allowToChangeInstallationDirectory: true` permits override; default path used in this matrix |
| W-5 | Verify Start Menu entry | "A War Without Victory" present under Start Menu → All Apps | Icon should be the v0.9.5 application icon (not Electron default) |
| W-6 | Verify Desktop shortcut (if installer creates one) | Desktop shortcut present + functional | Note current behavior; may be installer-default |
| W-7 | Launch from Start Menu | Splash / main window appears within ~5s | Capture observed launch time |
| W-8 | Click "New Game" → side picker → start scenario | Scenario loads; map renders; first-paint skeleton clears within ~10s | |
| W-9 | Advance turn (one click) | Turn advances; phase indicator updates; no error dialog | |
| W-10 | Save game (any save slot) | Save succeeds; save file written under `%APPDATA%\A War Without Victory\saves\` (or app-equivalent path) | Note actual path observed |
| W-11 | Exit application (window close) | Process exits cleanly; no zombie process | Task Manager → no `electron` / `A War Without Victory.exe` lingering |
| W-12 | Relaunch from Start Menu | Application relaunches; main menu offers "Continue" / "Load Game" with the saved slot present | Save persisted across executions |
| W-13 | Load saved game | Game state matches what was saved; same turn / phase / map state | **Save round-trip §4 required** |
| W-14 | Advance turn from loaded state | Turn advances; deterministic result expected | If determinism smoke harness exists, see §5 |
| W-15 | Exit. Open Settings → Apps → installed apps; locate "A War Without Victory" | Entry present; version matches installed | Built-in NSIS uninstaller registry entry expected |
| W-16 | Run uninstaller (Settings → Apps → Uninstall, or Start Menu uninstaller shortcut if present) | Uninstaller wizard runs; no admin prompt for per-user install; uninstall completes | |
| W-17 | Verify Start Menu entry removed | "A War Without Victory" no longer in Start Menu → All Apps | |
| W-18 | Verify install dir removed | `%LOCALAPPDATA%\Programs\A War Without Victory\` no longer exists | |
| W-19 | Verify `%APPDATA%\A War Without Victory\` state | Save tree still present (intentional — preserves user data) OR removed (if design intent says clean-on-uninstall) | **Note current behavior** in execution log; declare design intent in release notes |
| W-20 | Verify NSIS uninstaller registry entry removed | `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\<app-key>` absent | Per-user install → HKCU; not HKLM |

---

## 4. Save round-trip verification (cross-platform, deterministic)

Save round-trip is the load-bearing correctness check for the player. A save written must replay byte-stable across executions. This applies to BOTH Linux AppImage AND Windows NSIS targets — run the round-trip on each.

### 4.1 Three save points

Capture saves at three points in a single playthrough:

| Save point | Approximate turn | Why this point |
|---|---|---|
| **Pre-war** | Turn 1–3 (early scenario, pre-mobilization triggers) | Validates initial-state serialization; early-war shape |
| **Mid-war** | ~ Turn 18–22 (after mobilization curve, before late-war benchmarks) | Validates mid-flight sim state; combat history depth |
| **Late-war** | Turn 35–40 (after rupture if reachable on the scenario) | Validates accumulated combat / displacement / political-control state |

For each save point: write the save, then exit the application, then relaunch, then load.

### 4.2 Round-trip verification per save

| Step | Expected |
|---|---|
| Load saved game | Save loads without error |
| Confirm visible state | Turn number, phase, map control, formations match what was saved |
| Confirm save-file hash | If `tools/<release_hash_check>` exists, run it; the save bytes (or canonical hash of the save) should match a re-save of the same in-memory state immediately after load (byte-stable round-trip) |
| Advance one turn | Turn advances deterministically; if a determinism smoke harness exists (§5), the resulting state hash should match a known fixture |

If any save point fails round-trip, the v0.9.5 build is NOT release-ready. Re-flag as a P0 closure-blocker on the audit.

---

## 5. Determinism smoke (packaged build)

**Status:** GAP — see audit `§3 P2-G4` neighborhood. v0.9.5 has a smoke harness that runs against the source tree (`npm run sim:scenario:run:40w`), but does NOT have a smoke harness that runs from inside the **packaged AppImage / NSIS-installed binary**.

### 5.1 If a packaged determinism harness exists

Run the 40w scenario from inside the installed application (e.g. via a developer menu or CLI flag exposed by the packaged build). Compare the resulting `final_save.json` hash against the source-tree-built reference hash. They MUST match — packaging must not perturb determinism.

### 5.2 If no packaged determinism harness exists (current state)

Note as a known gap in the §7 execution log: "Packaged determinism smoke not available — relies on developer responsibility to not introduce packaging-time state into the deterministic path." File a follow-up lane to add a packaged determinism harness before v1.0 gold.

This gap is non-blocking for v0.9.5 closure (per audit P2 classification) but IS blocking for v1.0 release-trust.

---

## 6. First-time-install UX

### 6.1 Linux: AppImage execute permission

The AppImage format requires the user to set execute permission manually after download:

```bash
chmod +x ./A\ War\ Without\ Victory-<version>.AppImage
./A\ War\ Without\ Victory-<version>.AppImage
```

This is standard AppImage UX and is documented in player-facing release notes. Some file managers (GNOME Files, KDE Dolphin) expose a "Allow executing as program" checkbox in the file properties dialog as an alternative. The release-body MUST include this note for first-time players. Without execute permission, double-clicking the AppImage produces a "do not have permission" dialog or silently does nothing depending on distro.

### 6.2 Windows: SmartScreen "Windows protected your PC" cliff

The v0.9.5 NSIS installer is **unsigned by intent** (out of v0.9.5 scope per audit + groundwork §2). The first time a user runs the installer on a fresh Windows machine, Microsoft Defender SmartScreen displays:

> **Windows protected your PC**
> Microsoft Defender SmartScreen prevented an unrecognized app from starting. Running this app might put your PC at risk.
> App: `A War Without Victory Setup <version>.exe`
> Publisher: Unknown publisher
> [Don't run] (default-focused)

To proceed, the user must:

1. Click `[More info]` (small text under the message body — visually de-emphasized).
2. A `[Run anyway]` button appears.
3. Click `[Run anyway]` to launch the installer.

**Screenshot description for player docs:** A two-pane SmartScreen dialog. Top pane: blue header "Windows protected your PC" with red shield icon. Body text says Microsoft Defender SmartScreen prevented an unrecognized app from starting. App name and publisher ("Unknown publisher") shown. Bottom pane (after `[More info]` click): same dialog with `[Run anyway]` button revealed alongside default `[Don't run]`.

This warning IS expected and IS intentional in v0.9.5. It will disappear in a future release once the Windows build is code-signed (audit gap P3, planned post-v0.9.5 / v1.0 prep). Player-facing release notes MUST tell the player to expect this warning and how to bypass it. Do NOT suggest disabling SmartScreen globally.

---

## 7. Test execution log template

Append one filled-out copy of this block to each release tag's GitHub Release body (or attach as `RELEASE_TEST_LOG_<tag>.md`).

### 7.1 Header

| Field | Value |
|---|---|
| Release tag | `v<x.y.z[-prerelease.n]>` |
| Build SHA | `<git-sha>` |
| Build date | `<ISO 8601>` |
| Tester initials | `<XX>` |
| Linux target | Ubuntu / Fedora / Debian (version) |
| Windows target | Windows 10 / 11 (build number) |

### 7.2 Linux execution log

| Step | Result | Notes |
|---|---|---|
| L-1 download | PASS / FAIL / N/A | |
| L-2 chmod +x | PASS / FAIL / N/A | |
| L-3 launch from terminal | PASS / FAIL / N/A | |
| L-4 New Game | PASS / FAIL / N/A | |
| L-5 advance turn | PASS / FAIL / N/A | |
| L-6 save | PASS / FAIL / N/A | save path: |
| L-7 clean exit | PASS / FAIL / N/A | |
| L-8 relaunch | PASS / FAIL / N/A | |
| L-9 load saved game | PASS / FAIL / N/A | |
| L-10 advance from loaded | PASS / FAIL / N/A | |
| L-11 remove AppImage | PASS / FAIL / N/A | |
| L-12 ~/.config state | preserved / removed | |

### 7.3 Windows execution log

| Step | Result | Notes |
|---|---|---|
| W-1 download | PASS / FAIL / N/A | |
| W-2 SmartScreen warning observed | PASS / FAIL / N/A | (PASS = warning appeared as expected) |
| W-3 More info → Run anyway | PASS / FAIL / N/A | |
| W-4 wizard install | PASS / FAIL / N/A | install path: |
| W-5 Start Menu entry | PASS / FAIL / N/A | icon correct? |
| W-6 Desktop shortcut | PASS / FAIL / N/A | |
| W-7 launch from Start Menu | PASS / FAIL / N/A | launch time: |
| W-8 New Game | PASS / FAIL / N/A | |
| W-9 advance turn | PASS / FAIL / N/A | |
| W-10 save | PASS / FAIL / N/A | save path: |
| W-11 clean exit | PASS / FAIL / N/A | |
| W-12 relaunch | PASS / FAIL / N/A | |
| W-13 load saved game | PASS / FAIL / N/A | |
| W-14 advance from loaded | PASS / FAIL / N/A | |
| W-15 entry in Settings → Apps | PASS / FAIL / N/A | |
| W-16 uninstall completes | PASS / FAIL / N/A | |
| W-17 Start Menu entry removed | PASS / FAIL / N/A | |
| W-18 install dir removed | PASS / FAIL / N/A | |
| W-19 %APPDATA% state | preserved / removed | |
| W-20 uninstaller registry entry removed | PASS / FAIL / N/A | |

### 7.4 Save round-trip log

| Save point | Wrote | Reloaded | Hash stable | Advance-turn deterministic |
|---|---|---|---|---|
| Pre-war (turn 1–3) | PASS / FAIL | PASS / FAIL | PASS / FAIL / N/A | PASS / FAIL / N/A |
| Mid-war (~ turn 18–22) | PASS / FAIL | PASS / FAIL | PASS / FAIL / N/A | PASS / FAIL / N/A |
| Late-war (turn 35–40) | PASS / FAIL | PASS / FAIL | PASS / FAIL / N/A | PASS / FAIL / N/A |

### 7.5 Determinism smoke log

| Run | Hash observed | Reference hash | Match |
|---|---|---|---|
| Packaged 40w smoke (if available) | | | PASS / FAIL / N/A — gap |

### 7.6 Sign-off

> Tester `<initials>` confirms: every required PASS above is recorded against build SHA `<sha>`. Any FAIL row must be resolved (or explicitly waived in writing by the release driver) before pushing the release tag. This log is appended to the GitHub Release body for `v<tag>`.

---

## 8. Cross-references + revision history

### 8.1 Cross-references

- **Parent audit:** `docs/40_reports/audits/20260505_V095_PLATFORM_PACKAGING_AUDIT.md` (gaps P2-G4, P2-G5; LANE 7 in §4 prioritized backlog).
- **Release process:** `docs/RELEASE_PROCESS.md` — versioning convention, tagging, GitHub Releases workflow (sibling lane).
- **Predecessor groundwork:** `docs/40_reports/implemented/20260504_V0_9_5_PLATFORM_PACKAGING_GROUNDWORK.md`.
- **Smoke verifiers:** `tools/build/linux_appimage_smoke.cjs`, `tools/build/win_nsis_smoke.cjs` — CI-side artifact-existence + header-byte checks (NOT a substitute for this manual matrix).
- **Roadmap slot:** v0.9.5 Platform Packaging + Store; `docs/plans/2026-04-06-v095-platform-packaging-store-plan.md`.

### 8.2 Revision history

| Date | Change |
|---|---|
| 2026-05-05 | Initial authoring (LANE-V095-PLATFORM-TEST-MATRIX-DOC). Closes audit P2-G4 + P2-G5. |

---

End of matrix.
