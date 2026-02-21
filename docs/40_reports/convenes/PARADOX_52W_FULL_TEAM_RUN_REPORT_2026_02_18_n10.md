# Paradox 52-Week Full Team Run Report (run n10)

**Date:** 2026-02-18  
**Scenario:** apr1992_definitive_52w  
**Run id:** apr1992_definitive_52w__0af6ac1e57e861d2__w52_n10  
**Run directory:** `runs/apr1992_definitive_52w__0af6ac1e57e861d2__w52_n10/`  
**Weeks:** 52  
**Final state hash:** 35e89b664ef57617  

**Artifact paths (all under run directory):**
- run_summary.json, end_report.md, final_save.json
- control_delta.json, formation_delta.json, activity_summary.json
- control_events.jsonl, weekly_report.jsonl
- replay.jsonl, replay_timeline.json (--video)
- save_w1.json … save_w52.json (weekly saves)

---

## 1. Executive summary (Orchestrator)

This 52-week run used the canonical apr1992_definitive_52w scenario with a **new** unique run (n10). The Paradox team was convened; per-role assessments were synthesized into this report. **Outcome:** Run completed; 7/8 historical anchor checks passed; **centar_sarajevo failed** (expected RBiH, actual RS) — Sarajevo center municipality fell to RS in this run. Phase II attack resolution processed 38 orders over 14 weeks, 37 settlement flips, 246/209 attacker/defender casualties; **0 defender-present battles** (all 38 vs undefended/militia). Formation delta +8 brigades; displacement (takeover + minority flight) and civilian casualties reported. **Top 3 findings:** (1) **Sarajevo anchor failure** — centar_sarajevo held by RS at end; needs calibration or scenario/historical review. (2) Phase II flips are not written to harness control_events, so "Total control events: 0" is misleading for Phase II–only runs. (3) Zero defender-present battles; bot/AoR or defender-present scoring should be revisited so some contested battles occur.

---

## 2. Tracked dimensions (summary)

| Dimension | Source | Value |
|-----------|--------|--------|
| **Troop strengths (personnel)** | historical_alignment | HRHB 17,646→24,791; RBiH 61,233→108,563; RS 42,594→58,835 |
| **Brigades** | historical_alignment, formation_delta | Initial: HRHB 25, RBiH 81, RS 64. Final: HRHB 28, RBiH 84, RS 66. Delta: +8 (all brigade) |
| **Recruitment / capital** | historical_alignment | Recruitment capital: HRHB 300→538, RBiH 400→903, RS 600→982 |
| **Militia pools (end)** | end_report | HRHB 70 / 24,798 / 0; RBiH 1,556 / 108,598 / 0; RS 301 / 58,885 / 0 |
| **AoR (settlements per faction)** | end_report | HRHB 1,013; RBiH 2,311; RS 2,498 |
| **Displacement (minority flight)** | run_summary phase_ii_minority_flight | 634,518 displaced; 523,235 routed; 56,955 killed; 52,158 fled abroad; 30,109 settlements over 43 weeks |
| **Displacement (takeover)** | run_summary phase_ii_takeover_displacement | 14 timers started, 11 matured; 11 camps created; 1,102 camps routed; 188,904 displaced; 148,490 routed; 18,886 killed; 21,528 fled abroad |
| **Military casualties** | phase_ii_attack_resolution | Attacker 246; defender 208.8; 38 orders; 37 flips; 0 defender-present, 38 defender-absent battles |
| **Civilian casualties (by faction)** | civilian_casualties | RBiH: 48,647 killed, 0 fled; RS: 21,943 killed, 61,090 fled; HRHB: 5,251 killed, 12,596 fled |
| **Control flips** | control_delta, end_report | 66 settlements with controller change; net HRHB 1018→1014, RBiH 2297→2293, RS 2507→2515 |
| **Exhaustion (start→end)** | end_report | HRHB 6→94; RBiH 6→122; RS 10→169 |
| **Formation fatigue** | end_report | Total 0→5,303 |
| **Bot benchmarks** | bot_benchmark_evaluation | 6 evaluated, 4 passed, 2 failed (RBiH hold_core_centers, preserve_survival_corridors) |
| **Historical anchors** | anchor_checks | **7/8 passed**; **centar_sarajevo FAILED** (expected RBiH, actual RS). Passed: zvornik, bijeljina, srebrenica, bihac, banja_luka, tuzla, S163520 |

---

## 3. Per-role sections

### 3.1 Game Designer

**What works as intended:** Seven historical anchors pass; four bot benchmarks (HRHB secure_herzegovina_core, hold_central_bosnia_nodes; RS early_territorial_expansion, consolidate_gains). Control narrative: 66 flips, modest net change; Phase II pipeline and casualties; +8 brigades and personnel growth; displacement and civilian casualties reported; exhaustion accrual consistent.

**What does not:** **centar_sarajevo anchor failed** — Sarajevo center held by RS at end (historically RBiH-held). RBiH benchmarks hold_core_centers and preserve_survival_corridors fail (RBiH overperforms 0.39 vs 0.20/0.25). No defender-present battles (38/38 vs undefended/militia). Order asymmetry RS 28, RBiH 9, HRHB 1. End-report "Control events: 0" misleading without Phase II clarification.

**What needs changing, tuning, or investigating:** Investigate centar_sarajevo flip (RS pressure, RBiH garrison, scenario init). Recalibrate RBiH benchmark bands or balance. Defender-present battles (AoR/garrison, SCORE_DEFENDER_PRESENT_BONUS). Clarify end-report Phase II flips.

### 3.2 Gameplay Programmer

**What works as intended:** Phase II pipeline 52 weeks, 38 orders, 37 flips; phase_ii_attack_resolution and weekly rollup consistent. Attack resolution: 38 unique targets, symmetric casualties, defender-absent path. Displacement: takeover and minority flight reported; civilian_casualties by faction. Formation delta +8; historical_alignment deltas; anchor checks (7/8) and state consistent.

**What does not:** control_events.jsonl is Phase I–only; Phase II flips not pushed to events_all → "Control events: 0" misleading. Defender-present battles 0. End_report "66 settlements with controller change" vs run_summary "37 flips" (66 = distinct settlements initial→final; 37 = Phase II flip events).

**What needs changing, tuning, or investigating:** Log Phase II flips in harness control events (same ControlEvent shape). Clarify end_report "Total control events" vs "Total settlements with controller change." Centar_sarajevo control path (which flip(s) changed it).

### 3.3 Scenario-harness-engineer

**What works as intended:** All expected artifacts present (run_summary, end_report, final_save, control_delta, formation_delta, activity_summary, control_events.jsonl, weekly_report.jsonl, replay.jsonl, replay_timeline.json). Schemas and Phase II rollup diagnostics correct. control_events empty for Phase II–only run is expected.

**What does not:** run_meta.out_dir may point at base run_id not actual directory when uniqueRunFolder is true. End_report "Control events (harness log): Total control events: 0" misleading without "Phase I control-flip events only."

**What needs changing, tuning, or investigating:** Set run_meta.out_dir to actual run directory when uniqueRunFolder is true. Clarify "Control events" as Phase I–only; add "Phase II attack-resolution flips: N."

### 3.4 Canon-compliance-reviewer

**What works as intended:** Control changes from Phase II attack resolution only; no Phase I control flip. Attack resolution (orders, flips, casualties) aligned with Systems Manual §7.4 and Phase II spec. Displacement (takeover + minority flight, civilian_casualties) aligned. Formation lifecycle +8 brigades; pipeline order correct. 7/8 anchors; run diagnostics match spec.

**What does not:** centar_sarajevo anchor failure is outcome/tuning (Sarajevo center RS at end). No canon breach. 0 defender-present battles is behavior/tuning. Phase II flips not in control_events.jsonl is harness/reporting gap.

**What needs changing, tuning, or investigating:** Scenario/calibration review for Sarajevo center. Optionally push Phase II flips to control_events or add Phase II flip log. Bot benchmark failures calibration only.

### 3.5 Systems Programmer

**What works as intended:** final_state_hash present. run_summary and nested keys sorted; orders_by_faction and weekly rollup ordered. control_delta and formation_delta sorted; control_events sort (turn, mechanism, settlement_id). No timestamps in harness write; unique run folder n10 monotonic.

**What does not:** Fractional values in run_summary (casualty_defender 208.814, personnel_total 108563.186) can cause diff noise. "Control events (harness log)" label can be read as all control changes.

**What needs changing, tuning, or investigating:** Integerize run_summary counts for stable regression. Clarify end report "Control events" as Phase I only.

### 3.6 Formation & Scenario (combined)

**What works as intended:** Formation growth +8 brigades (RBiH 3, HRHB 3, RS 2); recruitment capital up; personnel and militia pools feed brigades. Formation delta lists 8 added (e.g. arbih_727th_slavna, hrhb_101st_oraje_brigade, rs_1st_guards_motorized). Seven anchors pass; vs_historical and phase_ii activity reported.

**What does not:** **centar_sarajevo anchor failed** — Sarajevo center RS at end; ahistorical for April 1992 narrative. No defender-present battles (38/38 defender_absent). RBiH benchmarks failed (overperform). Order skew (RS 28, RBiH 9, HRHB 1).

**What needs changing, tuning, or investigating:** Scenario/historical review for centar_sarajevo (init_control, RS pressure, RBiH garrison). Defender coverage/scoring so some attacks hit defended settlements. RBiH benchmark band vs calibration.

### 3.7 QA Engineer / Determinism-auditor

**What works as intended:** Single run produced stable artifacts; final_state_hash 35e89b664ef57617. Sorted keys in run_summary and deltas; unique run folder n10 from monotonic counter. No timestamps in artifact paths.

**What does not:** Fractional personnel/casualty in run_summary may cause cross-platform diff noise. Control-events label ambiguity.

**What needs changing, tuning, or investigating:** Integerize counts for regression; clarify Phase I vs Phase II in end report.

---

## 4. Consolidated findings

| Priority | Finding | Owner / action |
|----------|---------|----------------|
| P1 | **centar_sarajevo anchor failed:** Sarajevo center municipality held by RS at end (expected RBiH). | Game Designer / Scenario-creator-runner-tester: investigate init_control, RS pressure, RBiH garrison; calibrate or flag scenario. |
| P1 | **Phase II flips not in control_events:** Harness does not push Phase II attack-resolution flips to control_events.jsonl; end_report "Total control events: 0" misleading. | Gameplay Programmer / Scenario-harness-engineer: add Phase II flip events to events_all or clarify label and add "Phase II flips: N" in end report. |
| P1 | **Defender-present battles 0:** All 38 battles vs undefended/militia. | Gameplay Programmer / Game Designer: use DEFENDER_PRESENT_BATTLES_DIAGNOSIS and SCORE_DEFENDER_PRESENT_BONUS; tune bot/AoR so some attacks hit defended settlements. |
| P2 | **RBiH bot benchmarks (2 failed):** hold_core_centers, preserve_survival_corridors (RBiH control share 0.39 vs expected 0.20/0.25). | Game Designer: recalibrate bands or tune balance. |
| P2 | **run_meta.out_dir when uniqueRunFolder:** out_dir should reflect actual directory (e.g. w52_n10). | Scenario-harness-engineer. |
| P2 | **End-report "Control events" clarity:** Label as "Phase I control-flip events (harness log)" and add Phase II flips count. | Scenario-harness-engineer / scenario_end_report. |
| P3 | **Integerize run_summary counts:** Casualty and personnel totals; integerize for stable regression. | Systems Programmer. |
| P3 | **66 vs 37 (control delta vs flips_applied):** Clarify in end_report that 66 = distinct settlements with controller change, 37 = Phase II flip events. | Documentation / end_report. |

---

## 5. Single priority and owner (Orchestrator)

**Single priority:** (1) **Investigate and address centar_sarajevo anchor failure** — determine why Sarajevo center (expected RBiH) ended under RS in this run; adjust scenario, pressure, or garrison so anchor passes or document as known variance. (2) **Fix harness reporting for Phase II runs:** Log Phase II attack-resolution flips to the control_events stream (or document and display Phase II flips count in end report) and clarify "Control events (harness log)" as Phase I control-flip events only.

**Owner:** Game Designer / Scenario-creator-runner-tester for centar_sarajevo investigation and calibration. Gameplay Programmer with Scenario-harness-engineer for Phase II control-events reporting and end_report wording. Defender-present battles and RBiH benchmarks as next priorities.

---

## 6. References

- Run summary: `runs/apr1992_definitive_52w__0af6ac1e57e861d2__w52_n10/run_summary.json`
- End report: `runs/apr1992_definitive_52w__0af6ac1e57e861d2__w52_n10/end_report.md`
- Final save: `runs/apr1992_definitive_52w__0af6ac1e57e861d2__w52_n10/final_save.json`
- Canon: docs/10_canon/Systems_Manual_v0_5_0.md, Phase II spec
- PROJECT_LEDGER: docs/PROJECT_LEDGER.md
- Phase L calibration: docs/40_reports/convenes/PHASE_L_CALIBRATION_AND_TESTING_2026_02_18.md
- Defender-present diagnosis: docs/40_reports/convenes/DEFENDER_PRESENT_BATTLES_DIAGNOSIS_2026_02_18.md
- Same-day report (run n7): docs/40_reports/convenes/PARADOX_52W_FULL_TEAM_RUN_REPORT_2026_02_18.md
