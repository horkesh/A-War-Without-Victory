# Packaging / Playtest Operator Support

**Date:** 2026-05-15
**Lane:** Packaging / playtest operator-support
**Result:** Bounded script/test/docs improvement; no clean-VM claims.

## Summary
- Added deterministic release-log facts to both platform artifact smoke scripts.
- Updated release and platform-matrix docs so operators can paste exact artifact path, size, and SHA-256 into release notes and manual execution logs.
- Reaffirmed that SmartScreen, Settings -> Apps, `%APPDATA%`, and NSIS registry/uninstaller checks are operator-only unless a real target VM is available.

## Changes Made
### Smoke scripts
- `tools/build/linux_appimage_smoke.cjs` now reports `sizeBytes`, `sha256`, and `releaseLog`.
- `tools/build/win_nsis_smoke.cjs` now reports `sha256` and `releaseLog` alongside its existing `sizeBytes`.

### Guardrail test
- `tests/desktop_packaging_targets.test.ts` creates deterministic fake AppImage and NSIS artifacts, runs both smoke scripts, and verifies the reported size/hash/release-log facts.

### Documentation
- `docs/RELEASE_PROCESS.md` tells release operators to copy the smoke JSON `releaseLog` field.
- `docs/40_reports/PLATFORM_TEST_MATRIX.md` adds execution-log slots for AppImage and NSIS smoke release logs.
- `docs/plans/MASTER_ROADMAP.md` records this as a support update without changing v0.9.5 closure status.

## Operator-Only Checklist
- Windows SmartScreen first-run UX on a clean Windows VM.
- Windows Settings -> Apps entry/version after NSIS install.
- `%APPDATA%\A War Without Victory\` save persistence/removal intent after uninstall.
- NSIS uninstaller registry entry creation/removal under HKCU.
- Linux clean-VM launch/save/load on declared distro floors with FUSE2.

## Verification
- Red first: focused Vitest failed because smoke JSON lacked the new release-log fields.
- Green focused: `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\desktop_packaging_targets.test.ts` passed 4/4 from the packaging worktree.

## Files Changed
| File | Change |
|---|---|
| `tools/build/linux_appimage_smoke.cjs` | Adds deterministic size/hash/release-log reporting. |
| `tools/build/win_nsis_smoke.cjs` | Adds deterministic hash/release-log reporting. |
| `tests/desktop_packaging_targets.test.ts` | Pins both scripts' release-log facts. |
| `docs/RELEASE_PROCESS.md` | Adds release-operator instruction for smoke JSON. |
| `docs/40_reports/PLATFORM_TEST_MATRIX.md` | Adds smoke release-log fields to manual matrix. |
| `docs/plans/MASTER_ROADMAP.md` | Adds packaging/playtest support heartbeat. |
| `docs/40_reports/README.md` | Adds this report to the report index. |

## Next Steps
- Execute the platform matrix on actual clean target VMs before any release-tag claim.
- If a target VM becomes available, capture the operator-only rows above in the release execution log.
