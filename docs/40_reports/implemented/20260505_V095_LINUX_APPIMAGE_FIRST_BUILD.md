# LANE-V095-LINUX-APPIMAGE-FIRST-BUILD — v0.9.5 P1-G3 CLOSED

**Date:** 2026-05-05
**Lane:** `LANE-V095-LINUX-APPIMAGE-FIRST-BUILD-RETRY` (first attempt died early; retry shipped artifact + smoke + archival)
**Status:** **CLOSED** — P1-G3 audit gap satisfied.
**Sibling reference:** Windows NSIS first-real-build at `dist-packaged-fresh\A War Without Victory Setup 0.9.5-alpha.1.exe` (1338MB → 983MB after `4069f8c3` Installer Bloat Trim).

---

## Outcome

- **Artifact:** `F:\A-War-Without-Victory\dist-packaged-fresh-linux\A War Without Victory-0.9.5-alpha.1.AppImage`
- **Size:** 1201325335 bytes ≈ 1.2 GB
- **Smoke verifier verdict:** PASS
  ```json
  {
    "tool": "linux_appimage_smoke",
    "target": "dist-packaged/A War Without Victory-0.9.5-alpha.1.AppImage",
    "exists": true,
    "executable": { "ok": true, "mode": 33261 },
    "header": { "ok": true, "elfOk": true, "aiOk": true, "reason": "ok" },
    "launch": null
  }
  ```
  ELF magic ✓, AppImage signature ✓, executable bit set ✓, header bytes valid.
- **Build host:** Ubuntu 22.04 LTS in WSL2 on Windows 11 (matches PLATFORM_TEST_MATRIX.md §2.1 floor).
- **electron-builder:** v25.1.8.

## Build environment + steps

1. **WSL Ubuntu-22.04** installed via `wsl --install -d Ubuntu-22.04` earlier in trip-session 4. Distribution registered, kernel passthrough working, `/mnt/f/` access to Windows host filesystem confirmed.
2. **Build deps installed in WSL** via apt: Node.js 24 (NodeSource), libfuse2 (FUSE2 required by AppImage runtime — per PLATFORM_TEST_MATRIX.md §2.1), fakeroot, rsync, ca-certificates.
3. **Repo synced** Windows → WSL via `rsync -a --delete --exclude='node_modules' --exclude='dist-packaged*' --exclude='dist' --exclude='runs' --exclude='.git' /mnt/f/A-War-Without-Victory/ ~/awwv-build/`. Cross-OS `node_modules` avoided to prevent native-binary ABI mismatch.
4. **`npm ci`** ran cleanly in `~/awwv-build/`.
5. **`npm run desktop:package:linux:appimage`** produced AppImage at `~/awwv-build/dist-packaged/`.
6. **Smoke verifier** ran: GREEN.
7. **Artifact copied** to Windows-side `dist-packaged-fresh-linux/`.

## Cross-OS findings

- **`extraResources` worked correctly** with the post-trim package.json (`4069f8c3`). No path drift between Windows and Linux build hosts.
- **Spaces in artifact filename** (`A War Without Victory-...AppImage`) require shell-quoting discipline. Direct PowerShell→WSL→bash glob expansion of `$APPIMAGE` variable failed in nested quote contexts; explicit single-quoted absolute path worked. Documented for future automation.
- **No native-binary issues**: `@napi-rs/canvas` and other native deps installed cleanly via `npm ci` (Node 24 prebuilt binaries available for Linux x86_64).
- **No file-lock issue** (unlike Windows NSIS first attempt where Codex `node_repl.exe` processes blocked cleanup of `dist-packaged/win-unpacked/`).

## Size comparison vs Windows NSIS

| Build | Size | Notes |
|---|---|---|
| Windows NSIS (`5799a6d1` → `4069f8c3`) | 1338MB → 983MB | Post-Installer-Bloat-Trim STRATEGY A |
| Linux AppImage (this lane) | 1201MB | Built from same post-trim `package.json` |

Linux AppImage is ~135MB smaller than the post-trim Windows NSIS, likely due to platform-specific compression efficiency (squashfs vs NSIS LZMA).

Both still well above the eventual target floor (~700MB after `data/derived/_debug/**` + duplicate viewer geojson removal in Phase 2 successor lane to Installer Bloat Trim).

## Sensitive-history compliance

- **Ring N/A** — packaging only. No determinism / sim path entered.
- **No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring touch.**
- **AppImage artifact is gitignored** (`dist-packaged-fresh-linux/` follows the same gitignore policy as `dist-packaged-fresh/`). Only this lane report is committed.

## Audit closure

**P1-G3 CLOSED.** Combined with `5799a6d1`+`4069f8c3` (Win NSIS P1-G4 CLOSED), v0.9.5 audit P1 gaps are now ALL CLOSED: G1+G2 (icon+wiring), G3 (Linux first-real-build), G4 (Win first-real-build), G5+G6 (CI matrix), G7 (version bump), G8 (release workflow). 8 of 8 P1 closed.

P2 status: G1+G3+G4+G5 closed; G2 (reproducible-build harness) and G8 (auto-update) remain deferred per audit §6 R7.

## Sibling-lane reference

- `5799a6d1` Win NSIS icon + AppUserModelId
- `c2d209e3` version bump 0.9.5-alpha.1
- `4069f8c3` Installer Bloat Trim (~355MB savings)
- `9d38f09b` Release workflow + RELEASE_PROCESS.md
- `9c9f4a3c` Platform test matrix doc

## Successor handoffs

1. **Manual install / launch / save / load / uninstall validation** per `docs/40_reports/PLATFORM_TEST_MATRIX.md` §3.1 (Linux) + §3.2 (Windows). Operator runs on clean VMs before pushing v* tag.
2. **Installer Bloat Trim Phase 2** (audit successor): revise `tests/desktop_packaging_contract.test.ts` `data/derived` filter pin to permit `_debug/` exclusion + duplicate viewer-geojson removal. Estimated savings ~635MB → installer ~700MB.
3. **First v* tag push** can dispatch the `release.yml` workflow (commit `9d38f09b`) for end-to-end CI-driven release flow validation.

## Files changed

- NEW: `docs/40_reports/implemented/20260505_V095_LINUX_APPIMAGE_FIRST_BUILD.md` (this report).

No engine code, no test code, no canon doc, no scenario data touched. Pure packaging milestone closure documentation.
