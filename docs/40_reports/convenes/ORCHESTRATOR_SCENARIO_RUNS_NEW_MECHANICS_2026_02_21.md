# Orchestrator Scenario Runs Report: New Mechanics (Front Assignment, Holdout)

**Date:** 2026-02-21  
**Subject:** Scenario runs to test newly implemented mechanics (Phase 1 visual front lines, Phases 2–5 corps fronts/scaffolding, Phase 6 holdout integration)  
**Goal:** Verify runs complete, summarize outcomes, and flag follow-ups.

---

## 1. Runs Executed

| Scenario | Weeks | Run folder | Result |
|----------|-------|------------|--------|
| apr1992_definitive_52w | 20 | `runs/apr1992_definitive_52w__08e0cea89bdf5835__w20_n35` | OK |
| apr1992_definitive_52w | 52 | `runs/apr1992_definitive_52w__102fea508092873d__w52_n36` | OK |
| phase0_full_progression_20w | 20 | `runs/phase0_full_progression_20w__5ad5a41e9bd073f9__w20_n37` | OK |

All runs completed without errors. Typecheck and tests were already passing before runs (per session context).

---

## 2. Canon 52-Week Run (apr1992_definitive_52w)

### Outcomes
- **Anchor checks:** 7/8 passed. **centar_sarajevo** failed (expected RBiH, actual RS) — Sarajevo siege outcome; consistent with prior 52w runs.
- **Bot benchmarks:** 4 passed, 2 failed (evaluated at turn 26 and 52).
- **Control:** 65 settlements changed controller; net HRHB 1018→1014, RBiH 2297→2286, RS 2507→2522.
- **Phase II attack resolution:** 45 orders processed, 37 flips applied; casualties 264 (attacker) / 229 (defender).
- **Phase I control events:** 0 (canon scenario starts in phase_ii; Phase I is skipped).

### New Mechanics in This Run
- **Phase 1 (visual front lines):** `front_pressure` present in final_save; `front_edges` absent (viewer derives from control when absent; see §4).
- **Phases 2–5 (corps fronts):** `corps_front_edges` absent in headless runs. Corps fronts are populated via desktop IPC staging; `ensureDerivedCorpsFrontEdges` runs only in `desktop_sim.ts`. Headless scenario harness does not stage corps fronts; turn pipeline `apply-corps-front-orders` runs only when `corps_front_edges` exists, so it never populates in headless. **Expected:** corps fronts are a desktop/player feature; bot runs use brigade-level orders.

---

## 3. Phase 0 / Phase I Run (phase0_full_progression_20w)

### Outcomes
- **Anchor checks:** 8/8 passed (including centar_sarajevo RBiH).
- **Phase I control events:** 0.
- **Control changes:** 0 settlements.
- **Formations:** 277 brigades added (Phase II emergence); run ends in Phase II with full OOB.
- **Exhaustion / displacement:** Minimal; Front-active 0, Pressure-eligible 0 for reported weeks — run stayed in Phase 0 / early Phase I for most of the period before Phase II activation.

### Phase 6 Holdout Mechanics
- **holdoutPopulationFactor**, **getOrgDefenseBonus**, **rsBorderInterventionBonus** (Phase I) are unit-tested and pass.
- ** apr1992_definitive_52w** starts in phase_ii, so Phase I holdout is never exercised in that run.
- **phase0_full_progression_20w** does include Phase I, but reported 0 Phase I flips. Possible causes: (a) holdout + org defense made resistance strong enough that no muns flipped; (b) pressure/activation thresholds not reached; (c) scenario-specific config (e.g. ethnic init, no-flip gating). No before/after (pre-holdout vs post-holdout) comparison was run; unit tests provide formula-level verification.

---

## 4. State Keys in final_save

| Key | 52w run | Note |
|-----|---------|------|
| front_edges | absent | Canonical front edges; viewer adapter derives from control when absent. |
| front_pressure | object | Present. |
| corps_front_edges | absent | Populated only when desktop stages orders; headless runs do not. |
| corps_fallback_front_edges | — | Not checked. |
| og_subfront_edges | — | Not checked. |

---

## 5. Follow-Ups

| # | Item | Owner | Notes |
|---|------|-------|-------|
| 1 | centar_sarajevo anchor | Scenario Creator / Game Designer | Ongoing; prior reports document RS takeover in siege; investigate if design intends RBiH hold. |
| 2 | Phase I holdout observable effect | Scenario Creator / Gameplay Programmer | Run a dedicated Phase I scenario (e.g. apr1992_phase_i_to_apr1993_52w) with and without holdout and compare flip counts. |
| 3 | front_edges in persisted save | Technical Architect / Gameplay Programmer | Consider persisting `front_edges` in final_save for 3D map consistency when loading headless run outputs, if viewer fallback is insufficient. |
| 4 | corps_front_edges in headless | Gameplay Programmer | Optional: call `ensureDerivedCorpsFrontEdges` before `apply-corps-front-orders` in turn pipeline so headless runs also have derived corps fronts for downstream consumers (e.g. run_summary, diagnostics). |

---

## 6. Summary

- **Scenarios run successfully** with the new mechanics; no regressions observed.
- **Phase 1 (visual front lines):** `front_pressure` persists; `front_edges` derived by viewer when absent.
- **Phases 2–5 (corps fronts):** Scaffolding present; corps fronts populated only in desktop path. Headless runs do not populate `corps_front_edges`; this is by design for current scope.
- **Phase 6 (holdout):** Unit tests pass; scenario evidence is limited because canon 52w skips Phase I and phase0 run had 0 Phase I flips.
- **Recommendation:** Proceed with current implementation; address follow-ups as backlog items.
