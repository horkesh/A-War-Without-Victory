# Run Problems Phase 3 Complete — Orchestrator Checkpoint & PM Handover

**Date:** 2026-02-18  
**Phase:** 3 (Design-led items + Problem 4 implementation)

---

## 1. Phase 3 completion

- **Problem 3 (RBiH benchmarks):** Design decision documented in PHASE_L_CALIBRATION_AND_TESTING_2026_02_18.md §4 — keep strict benchmarks; treat 52w run as RBiH-strong. No constant or code change.
- **Problem 5 (RBiH fled_abroad = 0):** FULL_RUN_ANALYSIS_52W_APR1992_2026_02_18.md §1.3 updated with "Civilian casualties attribution (by design)": attributed by displacing faction; RBiH 0 is correct when RBiH is not the displacer.
- **Problem 4 (Mass displacement week 1):** Implemented in minority_flight.ts: (1) 4-week delay from war start (MINORITY_FLIGHT_WAR_START_DELAY_WEEKS = 4); (2) phased factor — first week of window 50%, weeks 2–4 each 1/6, then 1.0. All displacement tests pass.
- **Ledger:** PROJECT_LEDGER entry appended.

**Exit criterion met:** Problems 3 and 5 documented; Problem 4 implemented; displacement tests pass.

---

## 2. Refactor-pass (Phase 3 scope)

- **Scope:** src/state/minority_flight.ts, FULL_RUN_ANALYSIS, PHASE_L doc.
- **Result:** No dead code or duplication; phase factor logic is minimal and clear.

---

## 3. Orchestrator: single next priority

**Single agreed priority:** Phase 4 — Defender-present battles: diagnose why all attacks were defender-absent, set design bar, then propose and implement fix.

**Owners:** Gameplay Programmer + Formation Expert (diagnosis); Game Designer (design bar); Gameplay Programmer (fix after sign-off).

---

## 4. PM handover (scope for Phase 4)

**Scope:** (1) Diagnose: garrison assignment, front coverage, bot target selection. (2) Design bar: e.g. "non-trivial fraction of Phase II attacks defender-present by 52w." (3) Implement fix (bot or garrison changes). (4) Tests and ledger.

**Handoff to dev:** Execute Phase 4 to-dos; after implementation run refactor-pass, Orchestrator checkpoint, PM handover (no further phases unless PM adds follow-ups).
