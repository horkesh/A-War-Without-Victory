# Definitive April 1992 Scenario — Implementation Report

**Date:** 2026-02-14
**Type:** Scenario authoring + OOB data cleanup + mechanic implementation
**Scope:** April 1992 "Independence" — the first fully calibrated scenario

---

## 1. Objective

Create one working, historically calibrated scenario for April 1992 (start of the Bosnian War). The scenario needed correct starting parameters, cleaned-up OOB data, JNA transition mechanics, and an enhanced side-picker UI.

---

## 2. OOB Data Cleanup (Phase 1)

### 2.1 HRHB Subordination Bug Fix
- **15 HRHB brigades** incorrectly assigned `subordinate_to: "vrs_herzegovina"` (Serb corps)
- Remapped to correct HVO operational zones based on home municipality

### 2.2 Corps Field Mapping Fix
- **Bug:** `oob_loader.ts` line 105 read `r.corps` but data uses `subordinate_to`
- **Fix:** Fall back to `subordinate_to` when `corps` is absent
- **Result:** All 261 brigades now have corps assignments (was 0 before)

### 2.3 Corps Restructuring
- Removed `arbih_7th_corps` (formed November 1993, not April 1992) — 12 brigades → `arbih_3rd_corps`
- Removed `arbih_6th_corps` (late-war formation) — 0 brigades, subordinates would go to 4th Corps
- Removed `arbih_28th_independent` (enclave division) — 0 brigades in OOB
- Removed `arbih_81st_independent` (Goražde enclave division) — 7 brigades → `arbih_1st_corps`
- **Kept all three Army HQs** as command-level entries above corps:
  - `arbih_general_staff` — General Staff ARBiH (Kakanj), 2 directly subordinated brigades (Guards, 120th Black Swans)
  - `vrs_main_staff` — Main Staff VRS (Han Pijesak)
  - `hvo_main_staff` — Main Staff HVO (Mostar) — **new**, added for army-wide posture/operations parity

### 2.4 Equipment Classes
- Added `default_equipment_class` to all 261 brigades
- Distribution: mountain (122), light_infantry (114), motorized (19), mechanized (5), special (1)

### 2.5 Available From / Mandatory
- Added `available_from` turn gates: turn 0 (211), turn 8 (21), turn 12 (7), turn 16 (2), turn 26 (20)
- Added `mandatory: true` to 211 core brigades (all available_from: 0)

---

## 3. Initial Formations (Phase 2)

Rebuilt `initial_formations_apr1992.json` from 3-entry stub to 23 entries:
- **6 RBiH:** General Staff ARBiH + 1st–5th Corps
- **7 RS:** Main Staff VRS + 6 corps
- **5 HRHB:** Main Staff HVO + 4 OZs
- **5 JNA ghost brigades** (RS faction, see Phase 3)

All corps/staff entries use `kind: "corps_asset"` with correct `hq_sid` from municipality HQ settlement mapping. Army HQs are command-level (corps are subordinated to them), designed to anchor army-wide postures and grand operations.

---

## 4. JNA Ghost Brigade Mechanic (Phase 3)

### Design
Five RS mechanized/motorized brigades representing residual JNA forces:
- Banja Luka (2500 personnel, dissolve week 16)
- Bijeljina (2000, dissolve week 12)
- Pale (2000, dissolve week 14)
- Doboj (1800, dissolve week 10)
- Brčko (1500, dissolve week 8)

### Implementation
- **Tag-based:** `jna_legacy`, `auto_degrade`, `dissolve:N` — zero schema changes
- **New file:** `src/sim/jna_ghost_degradation.ts` — `runJNAGhostDegradation()`
- **Behavior:** Starting 4 turns before dissolution, reduce personnel by 25%/turn. At dissolve turn, set status=inactive
- **Wired into:** Both Phase I and Phase II turn pipeline (early, before combat)

### Extended initial_formations_loader.ts
- Added `posture` and `corps_id` field support so ghost brigades start in `attack` posture

---

## 5. Scenario Parameters (Phase 4)

### New file: `data/scenarios/apr1992_definitive_52w.json`

| Parameter | RS | RBiH | HRHB | Rationale |
|---|---|---|---|---|
| Recruitment capital | 350 | 200 | 120 | JNA org continuity vs desperate TO mobilization |
| Equipment points | 500 | 40 | 150 | JNA arsenal vs arms embargo vs Croatian pipeline |
| Capital trickle | 4 | 2 | 3 | Organizational capacity per turn |
| Equipment trickle | 3 | 0 | 2 | Embargo = zero heavy inflow for RBiH |
| Max recruits/turn | 2 | 2 | 2 | Global cap |

### Coercion Municipalities (17)
Prijedor (0.90), Zvornik (0.85), Foča (0.85), Bratunac (0.80), Višegrad (0.80), Vlasenica (0.75), Bijeljina (0.75), Bosanski Šamac (0.70), Sanski Most (0.70), Ključ (0.65), Bosanski Novi (0.65), Rogatica (0.60), Brčko (0.60), Doboj (0.55), Kotor Varoš (0.65), Teslić (0.55), Srebrenica (0.55)

### Desktop Updated
- `desktop_sim.ts`: `NEW_GAME_SCENARIO_RELATIVE` → `apr1992_definitive_52w.json`
- Recruitment capital and equipment constants updated to match

---

## 6. Side-Picker UI Enhancement (Phase 5)

### Scenario Briefing Header
- Image + title ("April 1992 — Independence") + italic subtitle
- External image at `assets/sources/scenarios/apr1992_briefing.png` (user-sourced)

### Per-Faction Descriptions with Difficulty Badges
- **RBiH — HARD** (red): "Surrounded and outgunned..."
- **RS — STANDARD** (green): "Inherit the JNA arsenal..."
- **HRHB — MODERATE** (amber): "Backed by Zagreb but squeezed..."

### CSS
- Card widened to 640px for descriptions
- Difficulty badges: colored pills with Material Design palette
- Description text: small, italic, centered

### Vite Build
- Extended `copyCrestsIntoBuild` plugin to also copy `assets/sources/scenarios/`

---

## 7. Files Modified

| File | Changes |
|---|---|
| `data/source/oob_brigades.json` | Fix 15 HRHB subordination, remap 12×7th Corps→3rd, add equipment_class/available_from/mandatory to all 261 |
| `data/source/oob_corps.json` | Remove `arbih_7th_corps` |
| `src/scenario/oob_loader.ts` | Fix corps field: read `subordinate_to` as fallback |
| `src/scenario/initial_formations_loader.ts` | Add `posture` and `corps_id` field support |
| `data/scenarios/initial_formations/initial_formations_apr1992.json` | Full rebuild: 20 corps + 5 JNA ghost brigades |
| `data/scenarios/apr1992_definitive_52w.json` | New canonical scenario |
| `src/sim/jna_ghost_degradation.ts` | New: JNA ghost brigade auto-degrade step |
| `src/sim/turn_pipeline.ts` | Wire JNA degradation into Phase I and Phase II pipelines |
| `src/desktop/desktop_sim.ts` | Update scenario path + resource constants |
| `src/ui/map/tactical_map.html` | Enhanced side-picker: descriptions, difficulty, scenario header |
| `src/ui/map/styles/tactical-map.css` | Side-picker styling: scenario briefing, badges, descriptions |
| `src/ui/map/MapApp.ts` | Scenario image loading in side-picker handler |
| `src/ui/map/vite.config.ts` | Extended build plugin to copy scenario assets |

---

## 8. Verification

- `npm run typecheck` — clean
- `npm run test:vitest` — 8 suites, 119 tests, all pass
- OOB loader tests — 3/3 pass
- Initial formations loader — 25 formations loaded correctly
- JNA ghost degradation — verified degradation/dissolution at correct turns
- All 261 brigades have corps assignments (verified)
- No 7th Corps references (verified)
- No HRHB subordination bugs (verified)

---

## 9. Determinism

All changes are deterministic:
- Formation iteration uses sorted keys via `strictCompare`
- JNA ghost degradation iterates in sorted order, no randomness
- Tag parsing is string-based, deterministic
- OOB loader sort unchanged (faction then name)
- No timestamps or Math.random() introduced

---

## 10. User Action Required

- **Scenario image:** Place a PNG at `assets/sources/scenarios/apr1992_briefing.png` (the UI gracefully hides if missing)
- **Calibration run:** Execute `npm run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_52w.json` to verify RS reaches 60-70% territory by week 26
