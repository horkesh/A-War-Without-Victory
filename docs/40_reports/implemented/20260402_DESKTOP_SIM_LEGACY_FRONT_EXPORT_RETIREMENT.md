# 2026-04-02 - Desktop Sim Legacy Front Export Retirement

## Summary

Removed orphaned legacy front/theatre mutation exports from `desktop_sim.ts` so the runtime API no longer advertises dead front-assignment and renaming lanes that the live shell already stopped using.

## Root cause

Earlier cleanup had already removed these from:

- preload
- Electron main-process handlers
- live React IPC contract

But `src/desktop/desktop_sim.ts` still exported:

- `assignBrigadeToFront(...)`
- `renameFrontSegment(...)`
- `renameTheatre(...)`

Those functions had no remaining live callers outside archived UI code. Leaving them exported kept teaching future work that the legacy front/theatre mutation surface still existed.

## Implementation

Updated `src/desktop/desktop_sim.ts`:

- removed `assignBrigadeToFront(...)`
- removed `renameFrontSegment(...)`
- removed `renameTheatre(...)`

Added regression coverage in `tests/engine_honesty_legacy_contracts.test.ts`:

- proves those retired helpers are no longer exported from `desktop_sim.ts`

## Verification

- `node_modules\\.bin\\vitest.cmd run tests\\engine_honesty_legacy_contracts.test.ts`
  - PASS
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
  - PASS (`no governed files changed`)

## Why this matters

This is the same repo-health pattern as before:

- the shell looked honest
- but a lower runtime layer still exported the legacy capability

That kind of half-retired surface is exactly how dead features come back by accident. Retiring the exports closes another misleading authority seam and keeps the desktop sim API aligned with the current product shell.
