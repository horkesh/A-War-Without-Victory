# Electron Guard + Crash Resolution

**Date:** 2026-03-04
**Commit:** `4456017`
**Status:** RESOLVED

## Summary

- Investigated a HIGH-severity Electron main process crash (`app.whenReady()` TypeError) that had blocked desktop playability in the previous session.
- Identified root cause: `electron-main.cjs` was invoked via plain Node.js during investigation rather than via the Electron binary. Under Node.js, `require('electron')` returns a string (the path to `electron.exe`), so `{ app }` destructures to `undefined`.
- Added a defensive early-exit guard that gives a clear error message if the file is ever invoked with Node.js again.
- Confirmed app launches cleanly: `electron .` runs successfully, map server reports on expected port.

## Changes Made

### 1. Defensive guard — `src/desktop/electron-main.cjs`

Replaced the bare `require('electron')` destructuring at line 1 with a guarded version:

```javascript
const _electronModule = require('electron');
if (typeof _electronModule === 'string') {
  process.stderr.write(
    'ERROR: electron-main.cjs must be launched via the Electron binary.\n' +
    '  Correct:   electron .\n' +
    '  Correct:   npm run desktop\n' +
    '  Wrong:     node src/desktop/electron-main.cjs\n'
  );
  process.exit(1);
}
const { app, BrowserWindow, protocol, ipcMain, dialog, Menu } = _electronModule;
```

**Rationale:** Under Node.js, `require('electron')` returns the path string to the
Electron binary. Destructuring `{ app }` from a string silently yields `undefined`,
causing a cryptic TypeError far from the real mistake. The guard exits with a
plain-English message pointing to the correct invocation.

### 2. Comment update — `src/sim/combat/pre_planned_operations.ts`

Updated the file header comment to reflect 6 pre-planned VRS operations (was 5):
- Added: `- Operation Kupres (2nd Krajina Corps): Seize Kupres from HVO (April 1992)`
- Changed: "Five named operations, one per VRS corps (2nd Krajina excepted)" →
  "Six named operations, one per VRS corps"

This documents an already-implemented operation; no code changed.

### 3. Issue report closed — `docs/40_reports/issues/2026_03_04_ELECTRON_APP_WHENREADY_CRASH.md`

Updated status from `OPEN` to `RESOLVED`. Added root cause explanation and fix details.

## Root Cause

The previous investigation session ran `electron-main.cjs` via Node.js directly
(as part of debugging), triggering the crash. The Electron binary itself (`v33.0.0`)
was healthy throughout — `node_modules/.bin/electron --version` reported correctly.
The crash was **not** a Node v24 ↔ Electron v33 incompatibility; it was an incorrect
invocation path during investigation.

## Verification

| Check | Result |
|---|---|
| `electron .` launches | ✅ — map server port logged, app opens |
| 5 Electron processes alive after launch | ✅ |
| Debug `console.log` from prior investigation | Already removed — not present in file |
| `npm run desktop` script path | Unchanged — builds first, then `electron .` |

## Files Changed

| File | Change |
|---|---|
| `src/desktop/electron-main.cjs` | Defensive Node.js guard added at startup |
| `src/sim/combat/pre_planned_operations.ts` | Comment: 5→6 ops, Operation Kupres documented |
| `docs/40_reports/issues/2026_03_04_ELECTRON_APP_WHENREADY_CRASH.md` | Status: OPEN → RESOLVED |

## Next Steps

- GUI Phase 5 visual sign-off (battle markers, fog/layer toggles, War Summary modal)
- Decide Phase 6 target (next GUI feature or next sim mechanic)
- Other agent (separate terminal) continuing calibration work — coordinate via ledger
