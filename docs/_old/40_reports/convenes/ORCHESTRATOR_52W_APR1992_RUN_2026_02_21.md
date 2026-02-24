# Orchestrator 52-Week Run Report — apr1992_definitive_52w

**Date:** 2026-02-21  
**Scenario:** apr1992_definitive_52w  
**Run id:** apr1992_definitive_52w__102fea508092873d__w52_n45  
**Run folder:** `runs/apr1992_definitive_52w__102fea508092873d__w52_n45`  
**Final state hash:** 798741a42ffd136a  
**Weeks:** 52 (full run)

---

## 1. Executive summary

A complete 52-week headless run of the canonical April 1992 scenario completed successfully. **6/8 historical anchors passed**. **Two anchors failed:** centar_sarajevo (expected RBiH, actual RS) and S163520/Sapna (expected RBiH, actual RS). Phase II: 82 orders over 35 weeks, 73 settlement flips, 424/438 casualties; **all 82 battles defender-absent**. Formation delta +4 brigades; personnel and recruitment capital grew as intended. Bot benchmarks: 4/6 passed (RBiH hold_core_centers and preserve_survival_corridors failed). Run is consistent with prior 52w findings: Sarajevo centre and Sapna enclave behaviour remain the main calibration gaps.

---

## 2. Tracked dimensions

| Dimension | Source | Value |
|-----------|--------|--------|
| **Anchors** | run_summary | **6/8 passed**. Failed: centar_sarajevo (RBiH→RS), S163520/Sapna (RBiH→RS). Passed: zvornik, bijeljina, srebrenica, bihac, banja_luka, tuzla |
| **Control (net)** | run_summary, end_report | HRHB 1018→1014; RBiH 2297→2256; RS 2507→2552. 109 settlements with controller change |
| **Phase II** | run_summary | 82 orders (HRHB 1, RBiH 8, RS 73); 73 flips; 424 att / 438 def casualties; 0 defender-present, 82 defender-absent; 35 weeks with orders (w36–52 zero) |
| **Formations** | run_summary | +4 brigades (HRHB +3, RS +1, RBiH 0); personnel HRHB 17646→23355, RBiH 61233→100675, RS 43835→56857 |
| **Recruitment capital** | run_summary | HRHB 300→503, RBiH 400→857, RS 600→984 |
| **Displacement** | run_summary | takeover: 25 timers started, 16 matured; 10 camps created, 207 routed; 218,355 displaced. Minority flight: 357,186 displaced, 33,851 killed, 32,015 fled abroad |
| **vs_historical (jan1993)** | run_summary | HRHB +58, RBiH +165, RS −223 settlements (final vs jan1993 reference) |
| **Bot benchmarks** | run_summary | 6 evaluated, 4 passed, 2 failed (RBiH hold_core_centers, preserve_survival_corridors) |
| **front_corps_tracking** | run_summary | corps_count 9, corps_front_edges_present true |

---

## 3. Does the canon scenario need adjusting?

**Short answer:** The **scenario definition file** (`data/scenarios/apr1992_definitive_52w.json`) does not need structural changes for “canon” — it correctly defines April 1992, 52 weeks, Phase II, hybrid_1992, recruitment, and bot settings. **Adjustments are optional** and fall into three categories:

### 3.1 Scenario parameters (optional tuning)

- **If the goal is to improve anchor pass rate (especially centar_sarajevo / Sapna):**
  - Consider **scenario-level calibration**: e.g. higher `coercion_pressure_by_municipality` or a Sarajevo-core–specific lever for RBiH hold (only if canon/design approves).
  - Or leave as-is and treat anchor failures as **known gaps** to be fixed by **mechanics** (pressure, garrison, holdout, init) rather than by changing the scenario JSON.

- **No change recommended** to: `weeks`, `start_phase`, `init_control`, `init_control_mode`, `recruitment_mode`, `max_recruits_per_faction_per_turn`, or bot difficulty — they match intended canon.

### 3.2 Canon anchors (code: scenario_runner.ts)

- **HISTORICAL_ANCHORS_APR1992_TO_DEC1992** and **HISTORICAL_SETTLEMENT_ANCHORS_APR1992_TO_DEC1992** are **canon expectations**, not the scenario file.
- **Options:**  
  - **Keep anchors as-is** (recommended): Continue to track 6/8 or 7/8 as baseline; drive fixes via mechanics/design.  
  - **Relax or remove** centar_sarajevo / S163520 only if product/canon explicitly accepts variance for that run set.  
  - **Do not** change anchors without design/canon approval (per user rules: canon precedence).

### 3.3 Mechanics and reporting (not scenario JSON)

- **centar_sarajevo / Sarajevo siege:** Still the top priority from prior reports (pressure, garrison, init, or holdout exception). Scenario file does not need to change for that.
- **Defender-present battles (0 in this run):** Bot target choice and AoR coverage; no scenario parameter change required.
- **RBiH bot benchmarks failing:** Control-share tolerance or bot objectives; design/QA, not scenario definition.

**Recommendation:** **No change to the canon scenario file** for this run. Treat 52w as the acceptance baseline; document 6/8 anchors and 0 defender-present as known gaps; pursue Sarajevo/Sapna and defender-present via mechanics and design, not by altering `apr1992_definitive_52w.json`.

---

## 4. Artifacts

- **Run directory:** `runs/apr1992_definitive_52w__102fea508092873d__w52_n45/`
- **Key files:** run_summary.json, end_report.md, final_save.json, control_delta.json, formation_delta.json, activity_summary.json, control_events.jsonl
- **Latest run copy:** final state copied to `data/derived/latest_run_final_save.json` (--map was used)

---

## 5. References

- Prior 52w: PARADOX_52W_FULL_TEAM_RUN_REPORT_2026_02_19_n11.md (7/8 anchors; centar_sarajevo failed).
- 16w run same scenario: ORCHESTRATOR_16W_APR1992_RUN_2026_02_21.md (7/8; S163520 passed in 16w).
- Canon scenario: data/scenarios/apr1992_definitive_52w.json; anchors in src/scenario/scenario_runner.ts.
