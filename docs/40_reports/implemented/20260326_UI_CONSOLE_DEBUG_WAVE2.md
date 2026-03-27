# UI Console Debug Wave 2 - 2026-03-26

## Scope

- Target: `http://localhost:3003/`
- Goal: inspect runtime console messages, isolate obvious recent UI regressions, apply safe localized fixes, and re-check console state.

## Baseline Console Capture (Before Fix)

### P1 Runtime Error (regression, fixable)

- `Uncaught TypeError: Cannot read properties of undefined (reading 'value')`
  - Source: `src/ui/map/components/BottomStatusStrip.tsx`
  - Trigger point observed: layer toggle rendering path
  - Impact: React error in `<BottomStatusStrip>` and UI instability.

### Pre-existing / expected noise (not addressed in this wave)

- Vite dev client lifecycle messages (`[vite] connecting...`, `[vite] connected.`, hot update logs).
- React DevTools suggestion warning.
- PMTiles diagnostic warnings (`registering protocol`, `source metadata request`) from `MapContainer`.
- Browser harness warning (`[CursorBrowser] Native dialog overrides installed...`).
- One historical minified `Cannot read properties of null (reading 'id')` from a previous session window; not reproduced after fix/reload in this wave.

## Root Cause Analysis

- `BottomStatusStrip` renders `LAYER_TOGGLES` from `mapModes.ts`.
- `DEV_LAYER_TOGGLES` and `LIVE_LAYER_TOGGLES` now include `ghostMapVisible`.
- Component-local `toggles` map in `BottomStatusStrip` did **not** include `ghostMapVisible`, so lookup by key returned `undefined`.
- Render path then accessed `t.value`/`t.set`, causing the runtime `TypeError`.

## Fix Applied

### Code change

- File: `src/ui/map/components/BottomStatusStrip.tsx`
- Added missing store bindings:
  - `ghostMapVisible`
  - `setGhostMapVisible`
- Added `ghostMapVisible` entry into local `toggles` map used by layer menu rendering.

### Why low-risk

- Localized to one UI component and one key mapping.
- No simulation logic, no IPC contract changes, no state schema changes.
- Aligns component mapping with existing store + map mode configuration.

## Validation

### Browser/runtime

- Reloaded `http://localhost:3003/` after patch.
- Confirmed the previous `BottomStatusStrip` `TypeError` did not reappear.
- UI rendered with bottom strip controls present.

### Static checks

- `ReadLints` on `src/ui/map/components/BottomStatusStrip.tsx`: no lints introduced.
- `src/ui/map` build command run:
  - `npm run build`
  - Fails due to extensive pre-existing repo TypeScript unused-symbol and typing issues outside this fix scope.
  - No new error attributable to `BottomStatusStrip` change.

## Before/After Console Summary

- **Before:** hard runtime crash in `BottomStatusStrip` (`reading 'value'`).
- **After:** crash removed; console contains only pre-existing dev/tooling noise in this run.

## Remaining Known Console Issues (post-fix, current observation)

- Dev-environment informational/warning noise:
  - Vite connection and HMR logs.
  - React DevTools recommendation warning.
  - PMTiles initialization/metadata warnings in `MapContainer`.
  - Browser harness native-dialog override warnings.
- No newly reproduced P1 runtime exception from this debugging wave.
