# Scenario Init — Six Fixes (2026-02-15)

**Status**: Implemented
**Scope**: Tactical map UI (4 changes), simulation engine (2 changes)
**Verification**: tsc clean, 130/130 Vitest tests pass

---

## 1. Formation Marker Stacking

**Problem**: Corps and brigade markers at the same HQ settlement overlapped completely — identical screen coordinates from `getFormationPosition()`.

**Fix**: Two-pass rendering in `drawFormations()` via `buildFormationPositionGroups()`:
- Group formations by quantized screen position (2px grid key)
- Groups with >1 marker offset horizontally: `(i - (count-1)/2) * (markerWidth + 3px)`
- `getFormationAtScreenPos()` uses the same grouping for accurate hit-testing

**File**: `src/ui/map/MapApp.ts`

---

## 2. Corps-to-Brigade Command Lines

**Problem**: No visual hierarchy between a selected corps and its subordinate brigades on the map.

**Fix**: New `drawCorpsSubordinateLines(rc)` method:
- When selected formation is a corps, iterates `subordinateIds`
- Draws dashed lines (faction color, 45% opacity, `setLineDash([6,4])`, 1.5px)
- Inserted between `drawFormations()` and `drawOrderArrows()` in render pass 5

**File**: `src/ui/map/MapApp.ts`

---

## 3. Velika Kladuša → RBiH-Aligned

**Problem**: Velika Kladuša municipality (Bihać pocket, 5th Corps area) was missing from the RBiH-aligned exceptions list.

**Fix**: Added `'velika_kladusa'` to `MUN1990_IDS_ALIGNED_TO_RBIH` array. Canonical list now 9 municipalities: Bihać, Brčko, Gradačac, Lopare, Maglaj, Srebrenik, Tešanj, Tuzla, Velika Kladuša.

**File**: `src/state/rbih_aligned_municipalities.ts`

---

## 4. Settlement Panel Tabs — Vertical Stack

**Problem**: 7 horizontal tabs (OVERVIEW through EVENTS) were cramped and overflowing.

**Fix**:
- HTML: Wrapped `#panel-tabs` + `#panel-content` in `<div class="tm-panel-body">` flex-row container
- CSS: `.tm-panel-tabs` changed to `flex-direction: column` (vertical sidebar, min-width 72px); active indicator is `border-left` instead of `border-bottom`

**Files**: `src/ui/map/tactical_map.html`, `src/ui/map/styles/tactical-map.css`

---

## 5. VRS Brigade HQ Resolution

**Problem**: Mandatory VRS brigades (e.g. 11th Krupa @ bosanska_krupa, 7th Krajina @ kupres) spawned with `hq_sid` pointing to the municipality's main settlement even when enemy-controlled. The lookup `municipalityHqSettlement[home_mun]` had no faction-control validation.

**Fix**: New `resolveValidHqSid()` helper:
1. Checks if default HQ is faction-controlled in `state.political_controllers`
2. If not, finds faction-controlled settlements in the same mun via `sidToMun`
3. Sorts candidates by SID for determinism, returns first
4. Applied to mandatory brigade, elective brigade, and corps HQ creation

**File**: `src/sim/recruitment_engine.ts`

---

## 6. Brigade AoR Contiguity at Init

**Root cause**: `scenario_runner.ts` called `initializeBrigadeAoR()` BEFORE `initializeCorpsCommand()`. Since `corps_command` didn't exist yet, `ensureBrigadeMunicipalityAssignment()` fell through to the legacy Voronoi path which skips `enforceContiguity()` and `enforceCorpsLevelContiguity()`.

**Fix (two-part)**:

**Part A — Reorder init** (scenario_runner.ts):
- `initializeCorpsCommand(state)` now runs BEFORE `initializeBrigadeAoR()`
- `initializeCorpsCommand` only reads `state.formations` — does not depend on `brigade_aor`

**Part B — Safety net** (brigade_aor.ts):
- `initializeBrigadeAoR()` now calls `enforceContiguity()` and `enforceCorpsLevelContiguity()` after `deriveBrigadeAoRFromMunicipalities()`
- Idempotent: if corps-directed path already enforced (Steps 8-9), the second pass is a no-op
- `enforceContiguity` exported from `corps_directed_aor.ts`

**Files**: `src/scenario/scenario_runner.ts`, `src/sim/phase_ii/brigade_aor.ts`, `src/sim/phase_ii/corps_directed_aor.ts`

---

## Files Modified

| File | Changes |
|------|---------|
| `src/ui/map/MapApp.ts` | Marker stacking, hit-test offset, corps command lines, render loop |
| `src/ui/map/tactical_map.html` | Panel body wrapper for vertical tabs |
| `src/ui/map/styles/tactical-map.css` | Vertical tab layout, panel body flex-row |
| `src/state/rbih_aligned_municipalities.ts` | Added velika_kladusa |
| `src/sim/recruitment_engine.ts` | resolveValidHqSid helper, applied to 3 HQ lookups |
| `src/scenario/scenario_runner.ts` | Reordered corps command before brigade AoR init |
| `src/sim/phase_ii/brigade_aor.ts` | Post-assignment contiguity safety net |
| `src/sim/phase_ii/corps_directed_aor.ts` | Exported enforceContiguity |
