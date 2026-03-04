# Electron Main Process Crash: app.whenReady() TypeError

**Status:** RESOLVED (2026-03-04)
**First observed:** 2026-03-04
**Severity:** HIGH — was blocking all desktop playability

## Symptom

```
TypeError: Cannot read properties of undefined (reading 'whenReady')
    at Object.<anonymous> (F:\A-War-Without-Victory\src\desktop\electron-main.cjs:563:5)
```

## Environment

- **Electron:** v33.0.0 (devDependency)
- **System Node.js:** v24.13.0
- **Electron bundled Node.js:** v20.18.0 (visible in stack trace)
- **package.json:** `"main": "src/desktop/electron-main.cjs"`, `"type": "module"`

## Root Cause

The crash was triggered by running `node src/desktop/electron-main.cjs` directly
instead of via the Electron binary (`electron .` / `npm run desktop`).

When invoked from plain Node.js, `require('electron')` returns a **string** (the path
to `electron.exe`) rather than the API object. Destructuring `{ app }` from a string
yields `undefined`, causing `app.whenReady()` to throw.

Running `electron .` (which uses `node_modules/.bin/electron`) correctly loads the
Electron process context where `require('electron')` returns the full API object.

## Fix Applied (2026-03-04)

Added a defensive guard at the top of `src/desktop/electron-main.cjs`:

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

This gives a clear, actionable error message instead of a cryptic TypeError.

## Verification

- `electron .` launches successfully (confirmed 2026-03-04)
- 5 Electron processes live after launch
- Tactical map server reports on expected port

## Related Files

- `src/desktop/electron-main.cjs` — main process entry (guard added at line 3)
- `src/desktop/preload.cjs` — preload script
- `package.json` — `"main"` field, `desktop` script
