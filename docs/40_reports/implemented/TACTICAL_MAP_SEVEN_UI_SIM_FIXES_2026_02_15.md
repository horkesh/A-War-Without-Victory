# Tactical Map — 7 UI/Sim Fixes (2026-02-15)

**Date:** 2026-02-15
**Status:** Implemented
**Verification:** tsc clean, 130/130 Vitest pass

---

## Summary

Seven fixes addressing formation rendering, hierarchy, panel interactivity, and data correctness in the tactical map and scenario initialization.

---

## Task 1: Fix 4th Corps Brigades (OOB Data)

**Problem:** All 11 brigades under `arbih_4th_corps` had `available_from: 8` and `mandatory: false`. At Phase II init (turn 0), none spawned — corps appeared empty.

**Fix:** Set 7 core 4th Corps brigades to `available_from: 0, mandatory: true`:
- arbih_4th_muslim_light, arbih_441st_vitezka_mountain, arbih_442nd_mountain, arbih_443rd_mountain, arbih_444th_mountain, arbih_445th_mountain, arbih_446th_light

4 late-war brigades (447th, 448th, 449th, 450th) remain at `available_from: 8`.

**File:** `data/source/oob_brigades.json`

---

## Task 2: Enhanced War Summary Modal

**Problem:** `openWarSummaryModal()` showed only brigade count + personnel per faction and total control events. No battle detail, no per-faction breakdown.

**Fix:** Rewrote modal to include:
- Per-faction: formation count, personnel, attack/move order counts, control gained/lost
- BATTLES THIS TURN section: settlement-level control changes with faction colors and mechanism
- ALL CONTROL EVENTS total

**File:** `src/ui/map/MapApp.ts` — `openWarSummaryModal()`

---

## Task 3: White Corps Command Lines

**Problem:** Corps-to-subordinate dashed lines used faction color at 45% opacity — nearly invisible on dark map.

**Fix:** White `#ffffff`, 60% opacity, 2px width. Dashed pattern preserved.

**File:** `src/ui/map/MapApp.ts` — `drawCorpsSubordinateLines()`

---

## Task 4: AoR Settlement Fill Pulsing

**Problem:** Only the AoR outer boundary glow pulsed (via `ctx.shadowBlur` animation). Settlement fills were static at 15% alpha.

**Fix:** Fill alpha now modulated by the same sine wave as the boundary glow. Pulses from 0.08 (subtle) to 0.22 (visible). Intensity computation moved before fill draw.

**Files:**
- `src/ui/map/constants.ts` — `AOR_HIGHLIGHT.fillAlphaMin/fillAlphaMax` replace `fillAlpha`
- `src/ui/map/MapApp.ts` — `drawBrigadeAoRHighlight()`

---

## Task 5: Corps Panel Actions

**Problem:** `renderCorpsPanel()` was info-only. Brigade panel had posture/move/attack/clear but corps had nothing.

**Fix:**
- Corps stance dropdown (defensive/balanced/offensive/reorganize) via new IPC `stage-corps-stance-order`
- Bulk subordinate posture: dropdown + "Apply" button calls `stagePostureOrder` per brigade

**Files:**
- `src/ui/map/MapApp.ts` — `renderCorpsPanel()` ACTIONS section
- `src/desktop/preload.cjs` — `stageCorpsStanceOrder` bridge method
- `src/desktop/electron-main.cjs` — `stage-corps-stance-order` IPC handler
- `src/ui/map/MapApp.ts` — `getDesktopBridge()` type updated

---

## Task 6: Army HQ Tier

**Problem:** General Staff ARBiH, Main Staff VRS, Main Staff HVO stored as `corps_asset` — indistinguishable from field corps.

**Fix:**
- New `FormationKind 'army_hq'` in `game_state.ts`
- OOB data: `"kind": "army_hq"` on 3 army-level entries in `oob_corps.json`
- OOB loader: parses `kind` field for corps (`'corps'` default, `'army_hq'` explicit)
- Recruitment engine: creates formation with `kind: 'army_hq'` when OOB specifies it
- GameStateAdapter: army_hq enrichment — subordinates are same-faction corps/corps_asset
- Constants: `FORMATION_KIND_SHAPES.army_hq = 'xxx'` (NATO triple-X), visible at strategic zoom
- Marker rendering: new `shape === 'xxx'` case draws 3 crossed lines
- Panel: new `renderArmyHqPanel()` — ARMY COMMAND header, subordinate corps list with click-through, total brigades/personnel
- Command lines: `drawCorpsSubordinateLines` works for army_hq (draws to subordinate corps)
- AoR highlight: army_hq merges all corps → their brigades' AoRs
- **Bug fix:** `initializeCorpsCommand` now includes `corps_asset` kind (was only `'corps'` — meaning no corps got initialized!)

**Files:**
- `data/source/oob_corps.json`
- `src/scenario/oob_loader.ts`
- `src/sim/recruitment_engine.ts`
- `src/state/game_state.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/constants.ts`
- `src/ui/map/MapApp.ts`
- `src/sim/phase_ii/corps_command.ts`
- `tests/oob_phase_i_entry.test.ts`

---

## Task 7: Larger Markers + Vertical Stacking

**Problem:** Markers too small. Co-located formations stacked horizontally (left-to-right), cluttering the map.

**Fix:**
- Markers enlarged ~30%: strategic 44x30, operational 54x38, tactical 66x46 (was 34x24, 42x30, 52x36)
- Hit radius: 36px (was 28px)
- Stacking direction: vertical (top-to-bottom) using `offsetY` instead of `offsetX`

**Files:**
- `src/ui/map/constants.ts` — `FORMATION_MARKER_SIZE`, `FORMATION_HIT_RADIUS`
- `src/ui/map/MapApp.ts` — `drawFormations()`, `getFormationAtScreenPos()`

---

## All Files Modified

| File | Tasks |
|------|-------|
| `data/source/oob_brigades.json` | 1 |
| `data/source/oob_corps.json` | 6 |
| `src/scenario/oob_loader.ts` | 6 |
| `src/sim/recruitment_engine.ts` | 6 |
| `src/sim/phase_ii/corps_command.ts` | 6 |
| `src/state/game_state.ts` | 6 |
| `src/ui/map/data/GameStateAdapter.ts` | 6 |
| `src/ui/map/constants.ts` | 4, 6, 7 |
| `src/ui/map/MapApp.ts` | 2, 3, 4, 5, 6, 7 |
| `src/desktop/electron-main.cjs` | 5 |
| `src/desktop/preload.cjs` | 5 |
| `tests/oob_phase_i_entry.test.ts` | 6 |
| `.agent/napkin.md` | all |
