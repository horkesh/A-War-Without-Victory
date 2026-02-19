# Paradox 52-Week Full Team Run Report (run n11, post-remediation)

**Date:** 2026-02-19  
**Scenario:** apr1992_definitive_52w  
**Run id:** apr1992_definitive_52w__102fea508092873d__w52_n11  
**Run directory:** `runs/apr1992_definitive_52w__102fea508092873d__w52_n11/`  
**Weeks:** 52  
**Final state hash:** 2e42cec32c92b136  
**Context:** First 52w run after executing Steps 2–6.5.2 of docs/plans/2026-02-18-52w-report-issues-and-manning-plan.md (calibration, movement, recruitment, Phase II consolidation flips, displacement brigade-present gate).

**Artifact paths (all under run directory):**
- run_summary.json, end_report.md, final_save.json
- control_delta.json, formation_delta.json, activity_summary.json
- control_events.jsonl, weekly_report.jsonl
- replay.jsonl, replay_timeline.json (--video)
- save_w1.json … save_w52.json (weekly saves)

---

## 1. Executive summary (Orchestrator)

This 52-week run is the first after implementing the 52w remediation plan (Steps 2–6.5.2): calibration (FACTION_POOL_SCALE RS 1.20), movement pipeline and bot brigade_mun_orders, max_recruits 4 in definitive 52w, Phase II consolidation flips (Option B, cap 3), and displacement brigade-present gate. **Outcome:** Run completed; **7/8 historical anchors passed**; **centar_sarajevo failed** again (expected RBiH, actual RS). Phase II: 51 orders over 26 weeks, 37 settlement flips, 276/247 attacker/defender casualties; **0 defender-present battles**. Formation delta +4 brigades (HRHB +3, RS +1, RBiH 0). Personnel: HRHB 17,646→23,355; RBiH 61,233→100,713; RS 43,835→55,647. **Top 3 findings:** (1) **centar_sarajevo anchor still fails** — Sarajevo center held by RS; calibration and movement did not fix it; needs dedicated investigation (pressure, garrison, init). (2) **Defender-present battles still 0** — SCORE_DEFENDER_PRESENT_BONUS and AoR in place but no set-piece battles in this run; bot target choice or coverage remains skewed to undefended. (3) **Reporting and harness** — Phase I/II control-events clarity and run_meta.out_dir were fixed in Step 1; end_report and integerized run_summary improve interpretability.

---

## 2. Tracked dimensions (summary)

| Dimension | Source | Value |
|-----------|--------|--------|
| **Troop strengths (personnel)** | historical_alignment | HRHB 17,646→23,355; RBiH 61,233→100,713; RS 43,835→55,647 |
| **Brigades** | historical_alignment, formation_delta | Initial: HRHB 25, RBiH 81, RS 66. Final: HRHB 28, RBiH 81, RS 67. Delta: +4 (all brigade) |
| **Recruitment / capital** | historical_alignment | Recruitment capital: HRHB 300→538, RBiH 400→858, RS 600→984 |
| **Phase II attack resolution** | phase_ii_attack_resolution | 51 orders; 37 flips; 276 att / 247 def casualties; 0 defender-present, 51 defender-absent; orders_by_faction HRHB 1, RBiH 9, RS 41 |
| **Control flips** | control_delta, end_report | 65 settlements with controller change; net HRHB 1018→1014, RBiH 2297→2286, RS 2507→2522 |
| **Displacement (takeover)** | phase_ii_takeover_displacement | 14 timers started, 11 matured; 9 camps created; 208 camps routed; 175,897 displaced; 136,784 routed; 17,585 killed; 21,528 fled abroad |
| **Civilian casualties (by faction)** | civilian_casualties | RBiH: 30,166 killed, 0 fled; RS: 16,719 killed, 42,558 fled; HRHB: 4,579 killed, 11,062 fled |
| **Exhaustion (start→end)** | end_report | HRHB 6→104; RBiH 7→138; RS 11→203 |
| **Bot benchmarks** | bot_benchmark_evaluation | 6 evaluated, 4 passed, 2 failed (RBiH hold_core_centers, preserve_survival_corridors) |
| **Historical anchors** | anchor_checks | **7/8 passed**; **centar_sarajevo FAILED** (expected RBiH, actual RS). Passed: zvornik, bijeljina, srebrenica, bihac, banja_luka, tuzla, S163520 |

---

## 3. Per-role sections

### 3.1 Game Designer

**What works as intended:** Seven historical anchors pass; four bot benchmarks pass. Control narrative: 65 flips, modest net change; Phase II pipeline and casualties; +4 brigades; displacement (takeover + minority flight) and civilian casualties; exhaustion accrual; end-report clarity (Phase I vs Phase II control events). Remediation levers (pool scale, max_recruits, movement, consolidation flips, displacement gate) are in place.

**What does not:** **centar_sarajevo anchor failed again** — Sarajevo center held by RS at end. RBiH benchmarks hold_core_centers and preserve_survival_corridors still fail. No defender-present battles (51/51 vs undefended/militia). Order asymmetry RS 41, RBiH 9, HRHB 1.

**What needs changing, tuning, or investigating:** Focused centar_sarajevo investigation (init_control, RS pressure on Sarajevo-core muns, RBiH garrison/AoR). Defender-present battles: verify AoR coverage and SCORE_DEFENDER_PRESENT_BONUS effect. RBiH benchmark band recalibration.

### 3.2 Gameplay Programmer

**What works as intended:** Phase II pipeline 52 weeks; apply-municipality-orders step and bot brigade_mun_orders; phase-ii-consolidation-flips step (Option B); displacement brigade-present gate in camp reroute. phase_ii_attack_resolution and weekly rollup; 51 orders, 37 flips; displacement takeover and minority flight reported; formation delta +4; integerized run_summary; end_report Phase I vs Phase II wording.

**What does not:** centar_sarajevo control path (which flip(s) changed it). Defender-present 0. Consolidation flips may have reported 0 this run (no consolidation-posture brigades in eligible muns).

**What needs changing, tuning, or investigating:** Trace centar_sarajevo flip in control_delta/events. Confirm defender-present scoring and AoR coverage path. Optional: log Phase II flips to control_events for replay clarity.

### 3.3 Scenario-harness-engineer

**What works as intended:** All expected artifacts present. run_meta.out_dir set to actual run directory when uniqueRunFolder (Step 1). End-report "Phase I control-flip events (harness log)" and Phase II section with settlement flips applied. run_summary integerized.

**What does not:** centar_sarajevo outcome unchanged from n10. Defender-present 0.

**What needs changing, tuning, or investigating:** None for harness; follow-up is calibration and design (centar_sarajevo, defender-present).

### 3.4 Canon-compliance-reviewer

**What works as intended:** Control changes from Phase II attack resolution and consolidation-flips step; no Phase I control flip. Displacement gate: displaced_in only where faction has brigade (Step 6.5.2). Pipeline order and new steps aligned with plan. 7/8 anchors; run diagnostics match spec.

**What does not:** centar_sarajevo anchor failure is outcome/tuning. 0 defender-present is behavior/tuning. No canon breach.

**What needs changing, tuning, or investigating:** Scenario/calibration for Sarajevo center. Defender-present tuning.

### 3.5 Systems Programmer

**What works as intended:** final_state_hash 2e42cec32c92b136. run_summary integerized (Step 1). Sorted keys; deterministic pipeline; displacement gate and consolidation flips deterministic.

**What does not:** centar_sarajevo and defender-present are gameplay/calibration, not systems.

**What needs changing, tuning, or investigating:** None for systems.

### 3.6 Formation & Scenario (combined)

**What works as intended:** Formation delta +4 (HRHB +3, RS +1); max_recruits 4 and movement pipeline in place; personnel growth; seven anchors pass. Displacement gate and consolidation step implemented.

**What does not:** **centar_sarajevo anchor failed** — still RS at end. No defender-present battles. RBiH benchmark failures. Fewer new brigades than n10 (+4 vs +8) but personnel growth strong (RBiH +39k, RS +12k, HRHB +6k).

**What needs changing, tuning, or investigating:** centar_sarajevo scenario/historical and pressure/garrison review. Defender coverage so some attacks hit defended settlements.

### 3.7 QA Engineer / Determinism-auditor

**What works as intended:** Single run produced stable artifacts; final_state_hash 2e42cec32c92b136. Integerized run_summary; unique run folder n11; sorted iteration in new steps (movement, consolidation, displacement gate).

**What does not:** centar_sarajevo and defender-present are calibration/design.

**What needs changing, tuning, or investigating:** Regression: compare n10 vs n11 hashes and key counts; centar_sarajevo failure is reproducible.

---

## 4. Consolidated findings

| Priority | Finding | Owner / action |
|----------|---------|----------------|
| P1 | **centar_sarajevo anchor still fails:** Sarajevo center municipality held by RS at end (expected RBiH). Remediation (calibration, movement) did not fix. | Game Designer / Scenario-creator-runner-tester: dedicated investigation — init_control, RS pressure on Sarajevo-core, RBiH garrison/AoR; calibrate or document variance. |
| P1 | **Defender-present battles still 0:** All 51 battles vs undefended/militia. | Gameplay Programmer / Game Designer: verify SCORE_DEFENDER_PRESENT_BONUS and AoR coverage; tune so some attacks hit defended settlements. |
| P2 | **RBiH bot benchmarks (2 failed):** hold_core_centers, preserve_survival_corridors. | Game Designer: recalibrate bands or balance. |
| P2 | **Formation delta +4 vs n10 +8:** Fewer new brigades this run; max_recruits 4 and movement in place — monitor over more runs. | Formation-expert: optional review of recruitment/movement effect on brigade count. |

---

## 5. Single priority and owner

**Single priority:** **centar_sarajevo investigation and calibration** — determine why Sarajevo center flips to RS and fix via scenario init, pressure, or RBiH garrison/AoR so the anchor passes consistently.  
**Owner:** Game Designer with Scenario-creator-runner-tester; Gameplay Programmer for any code/pipeline changes that affect Sarajevo-core control.

---

## 6. References

- **Plan:** docs/plans/2026-02-18-52w-report-issues-and-manning-plan.md  
- **Run n10 report:** docs/40_reports/convenes/PARADOX_52W_FULL_TEAM_RUN_REPORT_2026_02_18_n10.md  
- **Defender-present diagnosis:** docs/40_reports/convenes/DEFENDER_PRESENT_BATTLES_DIAGNOSIS_2026_02_18.md  
- **Phase L calibration:** docs/40_reports/convenes/PHASE_L_CALIBRATION_AND_TESTING_2026_02_18.md  

---

## 7. Analysis (post-remediation)

**Key outcomes of this run (n11):** Personnel grew for all factions (HRHB +5.7k, RBiH +39.5k, RS +11.8k). Brigade count +4 (vs n10 +8). Seven of eight historical anchors passed; centar_sarajevo again held by RS at end. Phase II produced 51 orders and 37 flips over 26 weeks; all battles were defender-absent. Displacement (takeover + minority flight) and civilian casualties reported; displacement brigade-present gate is active (routing only to muns where faction has a brigade). End-report and run_summary clarity improved (Phase I vs Phase II, integerized counts).

**Comparison to run n10:** (1) **Improved:** End-report labels (Phase I control-flip events; Phase II flips in Phase II section); run_summary integerized; run_meta.out_dir points to actual run directory; displacement gate and consolidation-flips step present. (2) **Regressed / same:** centar_sarajevo still fails (RS); defender-present battles still 0; RBiH benchmarks still 2 failed. (3) **Different but not clearly better:** Formation delta +4 vs n10 +8; personnel totals similar band (RBiH 100.7k vs n10 108.6k, RS 55.6k vs n10 58.8k). Hash changed (n11 2e42cec32c92b136 vs n10 35e89b664ef57617) as expected after remediation code and scenario changes.

**Single priority alignment:** The report’s single priority (centar_sarajevo investigation) aligns with the remediation plan’s P1. The plan’s Step 2 included “centar_sarajevo investigation/calibration”; implementation delivered calibration (FACTION_POOL_SCALE) and defender-present bonus in code, but did not include a dedicated Sarajevo pressure/garrison fix. So the next focus is exactly that: centar_sarajevo-specific investigation and, if needed, scenario or pressure/garrison tuning.

**Lessons and next steps:** (1) **Remediation execution:** Steps 2–6.5.2 were implemented and committed; movement pipeline and bot mun orders, consolidation flips, and displacement gate are in place. (2) **Remaining gaps:** centar_sarajevo and defender-present battles need targeted work beyond global calibration. (3) **Recommended next steps:** (a) Run a short (e.g. 20w) centar_sarajevo-focused scenario with logging to see when and how the mun flips. (b) Revisit defender-present: confirm AoR coverage for Sarajevo-core RBiH settlements and that bot target selection can choose defended targets. (c) Optionally add Phase II flips to control_events for replay and debugging. (d) Track formation delta over several 52w runs to see if max_recruits 4 and bot movement stabilize brigade growth.
