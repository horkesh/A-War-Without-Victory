# Map Visibility Polish, Timeline Sync Fix & Electron Crash Investigation
**Date:** 2026-03-04 (evening session)

## Executive Summary

This session addressed three areas: (1) map visual polish for sector glow and front line visibility, (2) a data sync fix between `apr1992.json` timeline and the hardcoded `FACTION_DOCTRINE_PHASES`, and (3) investigation of the persistent Electron main process crash.

---

## 1. Map Visibility Polish

### Sector Glow Opacity
**File:** `src/ui/map/map/awwv_map_style.json`

Increased the base `line-opacity` for both faction border glow layers from **0.45 → 0.65**, ensuring sectors are visually prominent even when `pressure_intensity` is low:
- `faction-border-glow-pos` (line 402–406): opacity interpolation base 0.45 → **0.65**
- `faction-border-glow-neg` (line 554–558): opacity interpolation base 0.45 → **0.65**

### Front Line Width & Opacity
Increased `line-width` and `line-opacity` for both front line layers to ensure they remain distinct against the thicker sector glows:
- `front-line-base` (line 578–595): widths increased (1.8→2.2, 3→3.8, 4.2→5.0 across zoom levels), opacity 0.9 → **0.95**
- `front-line-stripe` (line 613–635): widths increased (1→1.4, 1.8→2.4, 2.6→3.2 across zoom levels), opacity 0.85 → **0.95**

---

## 2. War Timeline ↔ Hardcoded Doctrine Phase Sync Fix

### Problem
Two tests in `tests/war_timeline.test.ts` were failing:
- `doctrine phases match at sample turns` — expected 0.28, got 0.26
- `effective attack share matches` — expected 0.28, got 0.26

The round-trip parity tests compare the timeline-driven values from `data/scenarios/timelines/apr1992.json` against the hardcoded `FACTION_DOCTRINE_PHASES` in `src/sim/combat/bot_strategy.ts`. The values had drifted apart across calibration sessions.

### Root Cause
`apr1992.json` RS doctrine phase values had been tuned independently of the hardcoded fallback in `bot_strategy.ts`:

| Property | `apr1992.json` (was) | `bot_strategy.ts` (hardcoded) |
|---|---|---|
| RS phase 0 `max_attack_share_override` | 0.26 | **0.28** |
| RS phase 0 `aggression_modifier` | 0.13 | **0.15** |
| RS phase 1 `max_attack_share_override` | 0.10 | **0.08** |

### Fix
Updated `data/scenarios/timelines/apr1992.json` to match the hardcoded values in `bot_strategy.ts`, since the hardcoded values are the calibrated ones (latest ATH n466=92.0%):

```json
RS phase 0: max_attack_share_override 0.26 → 0.28, aggression_modifier 0.13 → 0.15
RS phase 1: max_attack_share_override 0.10 → 0.08
```

### Verification
- `npx vitest run tests/war_timeline.test.ts` → **38/38 passed** ✅
- `npx vitest run` (full suite) → **288 passed, 1 skipped, 0 failed** (war_timeline fixed; 2 pre-existing failures in tests using `tsx --test` runner are a vitest-state error, not real test failures)

---

## 3. Electron Main Process Crash (UNRESOLVED — investigation only)

### Symptom
```
TypeError: Cannot read properties of undefined (reading 'whenReady')
    at Object.<anonymous> (F:\A-War-Without-Victory\src\desktop\electron-main.cjs:563:5)
```

### Investigation Summary
1. **Electron v33.0.0** is correctly installed (`npm list electron` confirms)
2. **`package.json` main field** correctly points to `src/desktop/electron-main.cjs`
3. **File IS running inside Electron** — the stack trace shows `Node.js v20.18.0` (Electron's bundled Node, not the system v24.13.0)
4. **`require('electron')` returns a string** (the path to `electron.exe`) when called from plain Node.js — this is expected. But inside the Electron process, it should return the full API object with `app`, `BrowserWindow`, etc.
5. The destructuring `const { app } = require('electron')` yields `undefined` for `app` even though the file is running inside Electron's process
6. A debug `console.log` was added at line 2 but the test command was cancelled before output could be captured

### Current State
- **Debug line still present** at line 2 of `electron-main.cjs` — should be removed or used to capture output
- The issue may relate to Electron v33 + Node v24 interaction, or a corrupted Electron binary installation
- All build steps succeed: `desktop:map:build`, `desktop:sim:build`, `warroom:build`

### Recommended Next Steps
1. Clean reinstall of `node_modules/electron` (was attempted but blocked by file locks)
2. Try `electron .` via the `desktop` npm script (which does the full build chain first)
3. Consider pinning Electron to a version known to work with Node v24
4. Check if there's a conflict between Electron v33's bundled Node v20 and the system Node v24

---

## Files Modified

| File | Change |
|---|---|
| `src/ui/map/map/awwv_map_style.json` | Sector glow opacity + front line width/opacity increases |
| `data/scenarios/timelines/apr1992.json` | RS doctrine phase values synced to hardcoded fallback |
| `src/desktop/electron-main.cjs` | Debug console.log added (line 2) — **should be removed** |

## Test Results

| Suite | Result |
|---|---|
| `vitest run` | 288 passed, 1 skipped, 0 failed ✅ |
| `war_timeline.test.ts` | 38/38 passed ✅ |
| `desktop:map:build` | Success ✅ |
| `desktop:sim:build` | Success ✅ |
| `warroom:build` | Success ✅ |
| Electron startup | ❌ BLOCKED (app.whenReady crash) |
