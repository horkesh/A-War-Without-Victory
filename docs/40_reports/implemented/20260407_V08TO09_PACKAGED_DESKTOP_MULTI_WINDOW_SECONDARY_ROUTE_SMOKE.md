# V0.8-to-V0.9 Packaged Desktop Multi-Window / Secondary Route Smoke

Date: 2026-04-07
Lane: Packaged Desktop Multi-Window / Secondary Route Smoke
Status: Implemented

## Summary

This lane strengthened the canonical packaged runtime probe by proving one real secondary packaged desktop window path under the same `desktop:package:probe` contract.

The desktop already proved:
- packaged boot
- packaged resource resolution
- baked April 1992 startup snapshot loading
- tactical-map server routing
- initial Warroom window load

The remaining gap was the secondary tactical-map window. It still relied on a timestamp cache-buster route and had no packaged proof. This lane replaced that with a deterministic tactical-map window URL contract and extended the packaged runtime probe to require successful `did-finish-load` for the real secondary map window.

## Audit findings

Before this lane:
- `openTacticalMapWindow()` used `Date.now()` in the route, making the tactical-map secondary window URL nondeterministic.
- `desktop:package:probe` did not prove the packaged app could open the real tactical-map BrowserWindow.
- Probe mode also exposed a packaged-Electron fragility: once the probe covered more than one real window, relying only on GUI stdout for the success manifest became brittle.
- The tactical-map packaged path exercised preload IPC (`get-map-server-url`, `get-current-game-state`) that was not explicitly owned in probe mode.

## Design

Canonical contract after cleanup:
- `desktop:package:probe` remains the only packaged-runtime probe path.
- The secondary packaged tactical-map window is opened through the same runtime code path the app already owns.
- Tactical-map probe routing is deterministic via `getTacticalMapWindowUrl(mode)`.
- Probe mode explicitly registers the minimal IPC surface needed by packaged window loading.
- Probe success is persisted to a deterministic manifest beside the unpacked executable so packaged GUI proof does not depend solely on stdout timing.

This lane intentionally did not add:
- UI automation
- installer/store flow
- another package/build command
- any Warroom component changes

## Implementation

Files changed:
- `src/desktop/electron-main.cjs`
- `tools/desktop_packaged_runtime_probe.mjs`
- `tests/desktop_packaged_runtime_probe.test.ts`
- `src/desktop/README.md`

Key changes:
- Added `getTacticalMapWindowUrl(mode)` and removed the `Date.now()` tactical-map cache buster.
- Added `createTacticalMapWindow(...)` so the packaged probe uses the real secondary BrowserWindow path.
- Extended `runPackagedRuntimeProbe()` to verify:
  - Warroom main window loads `awwv://warroom/index.html`
  - tactical-map secondary window loads `/?desktop_window=operational`
- Added explicit probe-safe IPC registration for:
  - `get-current-game-state`
  - `get-map-server-url`
- Added deterministic probe-manifest fallback at:
  - `dist-packaged/win-unpacked/awwv_desktop_runtime_probe_manifest.json`
- Hardened the external probe tool to require the tactical-map secondary window proof.

## Real bugs caught and fixed

1. Secondary tactical-map window used a nondeterministic `Date.now()` cache-buster route.
2. Probe mode did not explicitly register the minimal IPC handlers the tactical-map window expects.
3. Multi-window packaged probing exposed stdout fragility for GUI app success signaling, so the probe now writes a deterministic manifest file as a robust fallback.
4. Probe-mode shutdown needed to own window lifecycle more explicitly so Electron's normal `window-all-closed` behavior could not terminate the probe before its success contract was recorded.

## Verification

Targeted:
- `node --check src\\desktop\\electron-main.cjs`
- `npx.cmd tsx --test tests\\desktop_packaged_runtime_probe.test.ts tests\\desktop_release_ci_guardrails.test.ts`

Required commands:
- `npm.cmd run desktop:startup-snapshot:check`
- `npm.cmd run desktop:release:check`
- `npm.cmd run desktop:package:probe`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

Results:
- syntax check passed
- targeted packaged probe / workflow tests passed: `6/6`
- `desktop:startup-snapshot:check` passed
- `desktop:release:check` passed
- `desktop:package:probe` passed
- `test:vitest` passed: `216/216` files, `3018/3018` tests
- `tsc --noEmit` passed
- `build` passed

Packaged probe manifest now proves both windows:
- `awwv://warroom/index.html`
- `http://127.0.0.1:<port>/?desktop_window=operational`

## Residual risks

Still deferred:
- packaged UI interaction smoke beyond load completion
- sandbox tactical-map route proof
- installer / store / publish flow
- non-Windows packaged targets

## Integration notes

For `docs/PROJECT_LEDGER.md`:
- Add a 2026-04-07 entry for `Packaged Desktop Multi-Window / Secondary Route Smoke`.
- Note that `desktop:package:probe` now requires the real secondary tactical-map window to reach `did-finish-load` on a deterministic operational route, and that probe mode owns the minimal IPC/load contract needed for packaged tactical-map window boot.
- Suggested text:
  - `2026-04-07 - Packaged Desktop Multi-Window / Secondary Route Smoke: strengthened desktop:package:probe to prove the real packaged tactical-map secondary BrowserWindow reaches did-finish-load on the deterministic operational route /?desktop_window=operational. Removed the Date.now() cache-buster from tactical-map window routing, registered the minimal probe-safe IPC handlers needed by packaged window preload, and added a deterministic packaged runtime probe manifest fallback beside the unpacked executable so multi-window GUI probe success does not depend solely on stdout timing.`

For `docs/plans/MASTER_ROADMAP.md`:
- Mark the lane complete only if wording matches delivered scope: real secondary packaged window load proof under the existing packaged probe, not full UI automation.
- Recommended next lane: `Packaged Desktop Tactical Sandbox Route Smoke` or `Packaged Desktop UI Interaction Smoke`, depending on whether the priority is route coverage or interaction depth.

For `.claude/architect_notes.md`:
- Record the lesson that once packaged runtime probing covers multiple real BrowserWindows, the probe should own the minimal preload IPC contract explicitly and persist success via a deterministic manifest rather than relying only on GUI stdout timing.
