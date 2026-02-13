# Investigation: Brigades at “Full Strength” and 229-Settlement AoRs

**Date:** 2026-02-13  
**Scope:** (1) Combat casualties not reflected in brigade strength; (2) Brigades still showing 229 (or similar) settlement AoRs.

---

## 1. Brigade strength / casualties

### Finding: Casualties **are** applied; state and UI show reduced personnel

- **Battle resolution** in `src/sim/phase_ii/battle_resolution.ts` calls `applyPersonnelLoss(formation, loss)` after each engagement (line ~875). Formation objects are mutated in place; `runTurn` works on a clone of state and returns it, so personnel changes persist.
- **Run checked:** `apr1992_phase_ii_4w__f1a162b69d2138ef__w20` (20-week Phase II).
  - **Final save** (`data/derived/latest_run_final_save.json`): **35 brigades** have `personnel < 3000`. Examples: 501st Slavna Mountain 1400, 502nd Vitezka 1300, 102nd Motorized 1235, 1st Brigade Mostar 1029, etc.
  - **Casualty ledger:** 276 total (killed + wounded + missing_captured), matching `run_summary.json` `phase_ii_attack_resolution.casualty_attacker`.
- **Tactical map** shows `f.personnel` in the brigade panel (“Personnel” field and subtitle “X pers”). Data comes from `GameStateAdapter`, which reads `personnel` from the loaded state JSON.

### If you still see “full strength” (e.g. 3000)

1. **Dataset:** Confirm the map is using **“Latest run”** (or the 20w run state file). If you load an older state (e.g. initial save or a 4w run), personnel will be at or near 3000.
2. **Reinforcement:** After battles, `phase-ii-brigade-reinforcement` runs and tops brigades up from militia pools (up to `REINFORCEMENT_RATE` 200 / `COMBAT_REINFORCEMENT_RATE` 100 per turn). Over 20 weeks, pools can refill many brigades toward 3000. So some formations will appear “full” again; others stay below 3000 if they took more losses or had less pool.
3. **Which run:** Ensure the file you load is the **20-week** run final save (e.g. `runs/.../final_save.json` or the copy in `data/derived/latest_run_final_save.json` after that run).

**Conclusion:** The combat system does reduce formation personnel and the UI displays it. “Full strength” is expected when viewing a different/older state or when reinforcement has refilled a brigade.

---

## 2. 229-settlement AoRs

### Root cause: Ensure step concentrated all uncovered (faction, home_mun) on one brigade

- **Design:** `brigade_aor` is the full set of settlements assigned to a brigade (ownership). Only **operational coverage** is capped (e.g. 48 via `BRIGADE_OPERATIONAL_AOR_HARD_CAP`). So a brigade can “own” 200+ settlements while only a capped subset is used for garrison/pressure/attack.
- **Why one brigade got 229:** In `ensureBrigadeMunicipalityAssignment()` we “ensure every front-active (faction, municipality) has at least one brigade” **only for municipalities that are the home of at least one brigade** (2026-02-11 rule). Uncovered (faction, home_mun) pairs are assigned to the brigade with **the fewest current municipalities**. So one brigade (e.g. starting with 1 mun) was repeatedly chosen and given every other uncovered (faction, home_mun), ending up with many municipalities and hence 200+ settlements (e.g. one large home mun + several others). See `docs/40_reports/803rd_light_223_settlements_investigation.md`.

### Change made: Cap municipalities per brigade in the ensure step

- **Constant:** `MAX_MUNICIPALITIES_PER_BRIGADE = 8` in `src/state/formation_constants.ts`. A brigade may be assigned at most 8 municipalities in the ensure pass.
- **Logic:** In the ensure loop we now pick the **first candidate brigade that is below the cap** (instead of always the one with fewest muns). If all candidates are at cap, we still assign to the first so every (faction, home_mun) remains covered. This spreads municipalities across brigades and prevents a single brigade from receiving 20+ muns and 229 settlements.

**Files:** `src/state/formation_constants.ts`, `src/sim/phase_ii/brigade_aor.ts`.

---

## 3. References

- Battle application: `applyPersonnelLoss`, `applyEquipmentBattleLoss` in `src/sim/phase_ii/battle_resolution.ts`
- Reinforcement: `reinforceBrigadesFromPools` in `src/sim/formation_spawn.ts` (runs after attack resolution)
- AoR / ensure: `ensureBrigadeMunicipalityAssignment` in `src/sim/phase_ii/brigade_aor.ts`
- 803rd report: `docs/40_reports/803rd_light_223_settlements_investigation.md`
- Napkin: “Hard frontage cap”, “803rd Light 223 settlements”, “Municipality supra-layer”
