# Desktop Startup Recovery

**Date:** 2026-03-31
**Baseline:** Electron desktop app failed to start cleanly and could not reliably begin a new campaign.
**Result:** Desktop app launches, `startNewCampaign` completes, Warroom load flow is repaired, and dead replay UI/menu paths are removed.

## Summary

- Repaired the Electron desktop startup path by fixing desktop bundle compatibility and preventing startup logging from crashing the main process on Windows.
- Removed the dead replay flow from the current desktop/Warroom surface so the UI matches intended behavior.
- Rewired Warroom load behavior so desktop `Load Save` uses native IPC/state loading and `Continue` only appears usable when a game is actually present.

## Root Causes

### Broken Desktop Bundle Import

The desktop sim bundle was built as CommonJS but `src/sim/events/event_loader.ts` depended on `import.meta.url`. In the bundled CJS output that value becomes empty, which broke `require('./dist/desktop/desktop_sim.cjs')` and killed all desktop sim-backed actions.

### Main-Process Startup Crash On Windows

Starting a new campaign reached scenario initialization, but `console.debug` calls in startup placement/recruitment code could throw `EPIPE` when Electron lost its stdout/stderr pipe. That made the main process crash during campaign creation.

### Desktop Surface Drift

Warroom and Electron still exposed replay-related buttons/menu items and stale preload/API hooks, even though replay was no longer part of the intended active flow.

## Changes Made

### 1. Desktop Sim Bundle Compatibility

- Updated `src/sim/events/event_loader.ts` to resolve its module directory through `__dirname` when present and fall back to `import.meta.url` otherwise.
- Added `tests/desktop_sim_bundle_smoke.test.ts` to build and require the desktop sim bundle as a regression guard.

### 2. Startup Logging Resilience

- Added a `safeDebugLog()` helper in `src/scenario/scenario_runner.ts`.
- Replaced startup `console.debug` calls in recruitment / placement initialization with `safeDebugLog()` so detached pipes cannot abort scenario startup.

### 3. Warroom Load Flow Repair

- Removed `Load Replay` from `src/ui/warroom/index.html`.
- Fixed `Continue` in `src/ui/warroom/warroom.ts` so it is enabled only when a game is loaded.
- Rewired `Load Save` so Electron desktop uses `load-state-dialog` IPC, while browser/dev fallback still uses the local file input.
- Removed the stale browser-only `loadContinueSave()` path.

### 4. Desktop Replay Surface Removal

- Removed replay menu entry and replay IPC handlers from `src/desktop/electron-main.cjs`.
- Removed replay preload bridge methods/listeners from `src/desktop/preload.cjs`.
- Removed replay IPC type wrappers from `src/ui/map/desktop/useIPC.ts`.
- Updated `src/desktop/README.md` so documentation matches the current desktop product surface.

## Verification

### Commands Run

- `node --test tests/desktop_sim_bundle_smoke.test.ts`
- `npm run warroom:build`
- `npm run desktop:sim:build`
- `npm run desktop:map:build`

### Targeted Runtime Checks

- Direct built-bundle startup:
  - `startNewCampaign(process.cwd(), 'RBiH', 'apr_1992')`
  - Completed successfully and returned state at turn `0`
- Live Electron startup:
  - `npm run desktop`
  - Survived an 18-second launch window without immediate main-process failure

## Remaining Issues Observed

- `desktop:sim:build` still emits an `import.meta` warning from the ESM/CJS dual-path in `event_loader.ts`; the bundle now works, but the warning is still noisy.
- Scenario startup still logs gameplay/data issues such as operation validation warnings and a sector reachability invariant violation. Those are simulation issues, not Electron-wiring failures.
- Desktop README and code now agree, but any historical replay-specific docs elsewhere in the repo may still need later cleanup if replay is re-scoped or permanently retired.

## Files Changed

| File | Change |
|------|--------|
| `src/sim/events/event_loader.ts` | Fixed CommonJS-safe event path resolution |
| `tests/desktop_sim_bundle_smoke.test.ts` | Added bundle import regression test |
| `src/scenario/scenario_runner.ts` | Guarded startup debug logging against `EPIPE` |
| `src/ui/warroom/index.html` | Removed replay button |
| `src/ui/warroom/warroom.ts` | Fixed `Continue`, rewired `Load Save`, removed replay path |
| `src/desktop/electron-main.cjs` | Removed replay menu/IPC flow |
| `src/desktop/preload.cjs` | Removed replay preload bridge |
| `src/ui/map/desktop/useIPC.ts` | Removed replay IPC wrapper surface |
| `src/desktop/README.md` | Updated docs to current desktop flow |
| `docs/PROJECT_LEDGER.md` | Added change log entry |

## Next Steps

- Quiet the remaining `import.meta` build warning in the desktop bundling path.
- Investigate the gameplay-side startup warnings separately from desktop host work.
- Consider whether the remaining separate tactical-map window path should be retired now that Warroom is the primary launcher surface.
