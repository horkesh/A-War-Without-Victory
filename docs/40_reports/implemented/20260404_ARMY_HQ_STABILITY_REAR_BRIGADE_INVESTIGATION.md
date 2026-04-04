# Army HQ Stability + Rear Brigade Assignment Root-Cause Package

**Date:** 2026-04-04
**Mission:** Fix live Army HQ opening crash, investigate rear brigade assignment concerns, classify Deck null-id crash, harden integration tests.

## Specialists Used

| Specialist | Owned | Evidence |
|---|---|---|
| Systems Programmer (orchestrator) | Army HQ crash root-cause, fix, test | Traced unsafe cast, identified adapter-derived fields, implemented fix |
| Gameplay Programmer (agent) | Brigade assignment pipeline investigation | OOB source, final save state, anomaly detector cross-corps findings |
| Graphics Programmer (agent) | Deck null-id crash classification | Confirmed secondary fallout from Army HQ crash and missing error boundary |
| QA Engineer (orchestrator) | Render-path regression coverage for the crashed seam | New `generateCoSBriefing` smoke test in `ui_map_render_smoke.test.ts` |

## Phase 1 — Army HQ Crash Fix

### Root Cause
`ChiefOfStaffBriefing.tsx:131` contained an unsafe cast:
```typescript
const strain = computeCorpsCommandStrain(corps.id, state as unknown as GameState);
```

`buildStrainParagraphs` received a `LoadedGameState` (adapter-processed, flat formations) but cast it to raw `GameState` via `as unknown as GameState`. `computeCorpsCommandStrain` then read `state.military.corps_command?.[corpsId]` — a path that does not exist on `LoadedGameState`. This caused a runtime crash when opening Army HQ.

### Fix
The adapter (`GameStateAdapter.ts:878-879`) already computes `commandStrain` and `commandStrainLabel` on every corps `FormationView`. The fix:

1. Replaced the `computeCorpsCommandStrain` call with direct reads from `corps.commandStrainLabel`
2. Removed dead imports: `computeCorpsCommandStrain`, `getCommandStrainLabel`, `GameState`
3. Added `CommandStrainLabel` type import for the type annotation

**Files changed:**
- `src/ui/map/components/army_hq/ChiefOfStaffBriefing.tsx` — removed unsafe cast, uses adapter-derived fields

### Verification
- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 165 files, 2308 tests, 0 failures

## Phase 2 — Rear Brigade Investigation

### Findings

| Brigade | Corps | Location | Sector Assignment | Status |
|---|---|---|---|---|
| `rs_1st_armored` | `vrs_1st_krajina` | `op:prijedor:maricka_2` (home) | `sector:vrs_1st_krajina:0` (correct) | **No issue.** Active, 2567 pers, defend posture, correctly assigned. |
| `rs_2nd_banja_luka_light_infantry` | `vrs_1st_krajina` | `op:kljuc:donje_ratkovo_2` | `sector:vrs_2nd_krajina:0` (wrong corps) | **Cross-corps misassignment.** Pre-existing P1. |
| `rs_4th_banja_luka_light_infantry` | `vrs_1st_krajina` | `op:kljuc:donje_ratkovo_2` | `sector:vrs_2nd_krajina:0` (wrong corps) | **Cross-corps misassignment.** Pre-existing P1. |

### Root Cause for rs_2nd / rs_4th
Both are `vrs_1st_krajina` brigades physically located at `op:kljuc:donje_ratkovo_2`, which falls in `vrs_2nd_krajina` territory. The sector assignment pipeline assigns brigades to the nearest sector by physical location, regardless of corps ownership. The anomaly detector already flags this as `cross_corps_sector_assignment`.

**This is NOT a new bug.** It is a known sector-assignment topology issue where brigades near corps boundaries get assigned to a neighboring corps' sector. The anomaly detector report shows 6 total cross-corps assignments across all factions.

### Root Cause for rs_1st_armored
Correctly assigned to `sector:vrs_1st_krajina:0` but at home OSID `op:prijedor:maricka_2`, many hops from the sector's front OSIDs (Donji Vakuf/Jajce/Kotor Varos direction). Reactive defense contribution decays at `0.60^hops` and drops to 0 beyond 5 hops (`REACTIVE_DISTANCE_MAX_HOPS`). **The entire sector (10 brigades) had 0 battles in 40 weeks** — a quiet front, not a brigade-specific issue. Connects to the known ZEA rate P1.

### Root Cause for rs_2nd / rs_4th Banja Luka Light Infantry
Both are `vrs_1st_krajina` brigades at `op:kljuc:donje_ratkovo_2`, which falls entirely in `vrs_2nd_krajina` territory. No `vrs_1st_krajina` sector claims Kljuc. The assignment pipeline's rehoming pass (`brigade_assignment.ts:1097-1137`) correctly assigns them cross-corps to avoid leaving them unassigned. The resulting sector (`vrs_2nd_krajina:0`) also had 0 attacks in 40 weeks.

### Conclusion
None of these brigades are unassigned. All three are sector-assigned and defending. Two independent root causes:
1. **Quiet fronts** — Both `vrs_1st_krajina:0` and `vrs_2nd_krajina:0` had zero attacks in 40 weeks despite enemy presence. Part of the known 47% ZEA rate P1.
2. **Corps-territory mismatch** — Kljuc municipality mapped to `vrs_2nd_krajina`, so `vrs_1st_krajina` brigades there get rehomed cross-corps. Pre-existing P1.

No code change required for this investigation.

## Phase 3 — Deck null-id Classification

**Classification: SECONDARY FALLOUT from the Army HQ crash.**

Evidence (from graphics-programmer investigation):
- All Deck.gl layer IDs are hardcoded strings — no primary null-id bug possible in layer construction
- All GeoJSON builders produce valid feature IDs; adapter filters empty IDs at `GameStateAdapter.ts:480-481`
- **No React Error Boundary exists in `App.tsx`** — `ArmyHQModal` and `MapContainer` are siblings with no error boundary
- When `ChiefOfStaffBriefing` throws, React unmounts the entire `<App>` tree including `MapContainer`
- The MapLibre `<canvas>` survives (DOM element, not React-managed), but `MapboxOverlay` (Deck.gl) is orphaned
- On the next MapLibre render cycle, Deck.gl tries to diff layers with corrupted/finalized state → null-id error

Root cause chain: Army HQ crash → no error boundary → React tree unmount → orphaned Deck overlay → null-id on next render.

**Fixing the Army HQ crash eliminates the Deck error.**

**Follow-up recommendation:** Add a React Error Boundary wrapping modal components in `App.tsx` to prevent future modal crashes from killing the map. This is a separate, bounded task.

## Phase 4 — Test Hardening

### New Test
Added to `tests/ui_map_render_smoke.test.ts`:
- `generateCoSBriefing uses adapter-derived commandStrainLabel without raw GameState access`
  - Creates a `LoadedGameState` with corps formations having `commandStrain`/`commandStrainLabel` set
  - Calls `generateCoSBriefing` and verifies it produces correct strain paragraphs
  - **This test would have caught the crash** — it exercises the exact `ChiefOfStaffBriefing` generation seam that failed

This is render-path regression coverage, not a full mounted `ArmyHQModal` integration test.

### Suite Result
165 files, 2308 tests, 0 failures.

## Durable Lesson

**UI components must never cast LoadedGameState to raw GameState — the adapter boundary is the contract.**

The adapter (`GameStateAdapter`) exists precisely to transform the nested `GameState` (with `state.military.corps_command`, `state.military.named_officers`, etc.) into the flat `LoadedGameState` (with `formations[]`, `operations[]`, etc.). Casting `LoadedGameState` back to `GameState` via `as unknown as` bypasses this contract and accesses paths that don't exist on the adapted shape. When a UI component needs a derived value, it should read it from the already-adapted `FormationView` fields — not reach past the adapter into the raw state.

## Next Lane Recommendation

Based on this investigation, the next lane should be:
1. **React Error Boundary for App.tsx** — small, bounded task to prevent future modal crashes from killing the map. Prevents the entire class of secondary Deck errors.
2. **Residual ZEA** — the quiet-front finding for both `vrs_1st_krajina:0` and `vrs_2nd_krajina:0` (zero attacks, 15+ brigades idle) connects directly to the 47% ZEA rate P1. This is the standing calibration priority.
3. **Cross-corps sector assignment** — 6 instances, pre-existing P1. Lower priority unless player confusion is high.

## Completion Block

**Canonical owner:** `ChiefOfStaffBriefing.tsx` (CoS briefing), `GameStateAdapter.ts` (strain derivation)
**Demoted path:** `computeCorpsCommandStrain` called directly from UI with raw GameState cast — replaced by adapter-derived `commandStrainLabel`
**Player-visible truth:** Army HQ opens without crash. Strain paragraphs display correctly for strained corps.
**Canonical UI surface:** `ChiefOfStaffBriefing` → `buildStrainParagraphs` → reads `FormationView.commandStrainLabel`
**Done means:** Army HQ crash fixed, root cause documented, render-path regression catches the failure mode, brigade investigation complete with evidence, full suite green (2308/2308).
