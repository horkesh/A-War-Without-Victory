# Phase L: Calibration & Testing — Baseline Verification

**Date:** 2026-02-18  
**Status:** Baseline runs complete; anchor checklist passed.  
**Scope:** Brigade AoR Redesign Study Phase L — run 52w scenario, verify historical anchors, document baseline.

---

## 1. Scenario and runs

| Run | Scenario | Weeks | Out dir | Final state hash |
|-----|----------|-------|---------|-------------------|
| Baseline 20w | apr1992_definitive_52w | 20 | runs/apr1992_definitive_52w__fac729a0d90c0df8__w20_n6 | d6b43adc1522bdcc |
| Baseline 52w | apr1992_definitive_52w | 52 | runs/apr1992_definitive_52w__0af6ac1e57e861d2__w52_n7 | 21561c4049662268 |

- **Scenario:** `data/scenarios/apr1992_definitive_52w.json` (Phase II start, hybrid_1992, apr1992 init control/formations, 52 weeks).
- **Command (20w):** `npm run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_52w.json --weeks 20 --unique --out runs`
- **Command (52w):** `npm run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_52w.json --weeks 52 --unique --out runs --map`
- **Artifacts:** `run_summary.json`, `end_report.md`, `final_save.json`, `control_delta.json`; 52w also copied to `data/derived/latest_run_final_save.json` for map viewer.

---

## 2. Historical anchor checklist (automated)

The scenario runner evaluates **historical anchors** (see `scenario_runner.ts` `HISTORICAL_ANCHORS_APR1992_TO_DEC1992` and `HISTORICAL_SETTLEMENT_ANCHORS_APR1992_TO_DEC1992`). Results:

| Anchor | Type | Expected | 20w actual | 52w actual | Pass |
|--------|------|----------|------------|------------|------|
| zvornik | municipality | RS | RS | RS | ✓ |
| bijeljina | municipality | RS | RS | RS | ✓ |
| srebrenica | municipality | RBiH | RBiH | RBiH | ✓ |
| bihac | municipality | RBiH | RBiH | RBiH | ✓ |
| banja_luka | municipality | RS | RS | RS | ✓ |
| tuzla | municipality | RBiH | RBiH | RBiH | ✓ |
| centar_sarajevo | municipality | RBiH | RBiH | RBiH | ✓ |
| S163520 (Sapna) | settlement | RBiH | RBiH | RBiH | ✓ |

**All eight anchors passed** at both 20w and 52w (centar_sarajevo added 2026-02-18 for "Sarajevo holds" check).

- **Zvornik falls:** Confirmed — RS holds Zvornik (historically fell April 1992).
- **Enclaves:** Srebrenica remains RBiH; Bihać RBiH; Sapna (S163520) RBiH.
- **Sarajevo hold:** centar_sarajevo expected RBiH; runner now includes this anchor (Run Problems Phase 2).

---

## 3. Phase II attack resolution (52w)

- **Weeks with Phase II:** 52  
- **Orders processed:** 110  
- **Flips applied:** 65  
- **Orders by faction:** RBiH 27, RS 80, HRHB 3  
- **Defender-absent battles:** 110 (all attacks vs undefended/militia-held settlements in this run)  
- **Defender-present battles:** 0  

Net control (start → end): RBiH 2297 → 2289, RS 2507 → 2518, HRHB 1018 → 1015. Exhaustion and displacement increased as expected.

---

## 4. Bot benchmark evaluation (52w)

- **Evaluated:** 6  
- **Passed:** 4  
- **Failed:** 2 (RBiH hold_core_centers at 26w — actual 0.39 vs expected 0.20; one other)  
- **Not reached:** 0  

Benchmark tolerances are strict; 4/6 pass is a reasonable baseline. **Design decision (Run Problems Phase 3):** Keep strict benchmarks; treat 52w run as "RBiH-strong." Tuning RBiH core-hold or relaxing tolerances is a future calibration option.

---

## 5. Constants and calibration

**This pass:** No constant changes. Baseline verification only.

**Areas for future calibration** (per Brigade AoR Redesign Study Phase L):

1. **Combat/garrison** — Scale for 1–4 settlement garrison ranges if flip rates or casualties need adjustment.
2. **Militia garrison** — If undefended settlements fall too easily or hold too long.
3. **Battle damage / exhaustion** — Rate of accumulation; aim for visible front stagnation by ~week 40+.
4. **Terrain battle width** — Slope/river thresholds if mountain/river chokepoints need tuning.

---

## 6. Verification summary

| Check | Result |
|-------|--------|
| Zvornik falls (RS) | ✓ |
| Sarajevo (siege activity; no anchor yet) | Siege muns present in displacement data; add anchor for formal hold check if desired |
| Enclaves (Srebrenica, Bihać, Sapna RBiH) | ✓ |
| Late-war front (52w) | Control and exhaustion stable; 65 flips over 52 weeks |
| RBiH recon | recon_intelligence populated (Phase J); map overlay deferred |
| Battle-damaged front | Exhaustion and displacement accumulated; no code change this pass |

---

## 7. Deliverables and references

- **Report:** This document.  
- **Run artifacts:** `runs/apr1992_definitive_52w__fac729a0d90c0df8__w20_n6/`, `runs/apr1992_definitive_52w__0af6ac1e57e861d2__w52_n7/`.  
- **Plan reference:** docs/plans/2026-02-18-brigade-aor-redesign-study.md § Phase L.  
- **Ledger:** PROJECT_LEDGER.md entry appended.

Phase L baseline verification complete. Optional next steps: add Sarajevo-core anchor, recalibrate constants if later runs diverge, or run 104w for extended stability check.
