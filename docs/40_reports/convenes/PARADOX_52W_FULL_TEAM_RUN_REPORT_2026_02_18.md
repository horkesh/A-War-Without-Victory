# Paradox 52-Week Full Team Run Report

**Date:** 2026-02-18  
**Scenario:** apr1992_definitive_52w  
**Run id:** apr1992_definitive_52w__0af6ac1e57e861d2__w52_n7  
**Weeks:** 52  
**Artifact paths:** `runs/apr1992_definitive_52w__0af6ac1e57e861d2__w52_n7/` (run_summary.json, end_report.md, final_save.json, control_delta.json, formation_delta.json, activity_summary.json, control_events.jsonl, weekly_report.jsonl, replay.jsonl)

---

## 1. Executive summary (Orchestrator)

This 52-week run used the canonical apr1992_definitive_52w scenario and existing harness artifacts. The Paradox team was convened; six specialist reviews (Game Designer, Gameplay Programmer, Scenario-harness-engineer, Canon-compliance-reviewer, Systems Programmer, Formation & Scenario combined) were synthesized into this report. **Outcome:** Run is canon-compliant; historical anchors 7/7 passed; Phase II attack resolution, displacement (takeover + minority flight), and formation lifecycle behave as intended. **Top 3 findings:** (1) Zero defender-present battles — all 76 attacks were vs undefended/militia settlements; bot/AoR tuning or defender-present scoring should be revisited so some contested battles occur. (2) Phase II flips are not written to the harness control_events log, so "Total control events: 0" is misleading for Phase II–only runs; recommend logging Phase II flips to the same event stream or clarifying the label. (3) RBiH bot benchmarks failed 2/6 (hold_core_centers, preserve_survival_corridors) because RBiH overperformed (0.39 vs expected 0.20/0.25) — either recalibrate benchmark bands or tune balance so RBiH lands in band.

---

## 2. Tracked dimensions (summary)

| Dimension | Source | Value |
|-----------|--------|--------|
| **Troop strengths (personnel)** | historical_alignment | HRHB 17,646→22,479; RBiH 61,233→98,697; RS 42,594→52,792 |
| **Brigades** | historical_alignment, formation_delta | Initial: HRHB 25, RBiH 81, RS 64. Final: HRHB 26, RBiH 84, RS 66. Delta: +6 (all brigade) |
| **Recruitment / capital** | historical_alignment | Recruitment capital: HRHB 300→551, RBiH 400→864, RS 600→972; negotiation/prewar 0 |
| **Militia pools (end)** | end_report | HRHB 74 / 22,486 / 0 (avail/committed/exhausted); RBiH 100 / 98,732 / 0; RS 314 / 52,849 / 0 |
| **AoR (settlements per faction)** | end_report | HRHB 1,014; RBiH 2,307; RS 2,501 |
| **Displacement (minority flight)** | run_summary phase_ii_minority_flight | 790,151 displaced; 639,166 routed; 74,596 killed; 74,974 fled abroad; 19,070 settlements over 49 weeks |
| **Displacement (takeover)** | run_summary phase_ii_takeover_displacement | 14 timers started/matured; 11 camps created; 715 camps routed; 96,311 displaced; 82,542 routed; 9,626 killed; 4,143 fled abroad |
| **Military casualties** | phase_ii_attack_resolution | Attacker 335; defender 335.6; 76 orders; 37 flips; 0 defender-present, 76 defender-absent battles |
| **Civilian casualties (by faction)** | civilian_casualties | RBiH: 53,612 killed, 0 fled; RS: 20,999 killed, 56,578 fled; HRHB: 9,611 killed, 22,539 fled |
| **Control flips** | control_delta, end_report | 65 settlements with controller change; net HRHB 1018→1015, RBiH 2297→2289, RS 2507→2518 |
| **Exhaustion (start→end)** | end_report | HRHB 6→95; RBiH 6→124; RS 10→172 |
| **Formation fatigue** | end_report | Total 0→5,309 |
| **Bot benchmarks** | bot_benchmark_evaluation | 6 evaluated, 4 passed, 2 failed (RBiH hold_core_centers, preserve_survival_corridors) |
| **Historical anchors** | anchor_checks | 7/7 passed (zvornik, bijeljina, srebrenica, bihac, banja_luka, tuzla, S163520) |

---

## 3. Per-role sections

### 3.1 Game Designer

**What works as intended:** Historical anchors (7/7); four bot benchmarks (HRHB secure_herzegovina_core, hold_central_bosnia_nodes; RS early_territorial_expansion, consolidate_gains). Control and narrative: 65 flips, modest net change, plausible hotspots (Zvornik, Ilidža, Bihać, etc.). Phase II pipeline and casualties symmetric and low; +6 brigades and personnel growth; displacement and civilian casualties reported; exhaustion accrual consistent.

**What does not:** RBiH benchmarks hold_core_centers and preserve_survival_corridors fail because RBiH overperforms (0.39 vs 0.20/0.25). No defender-present battles (all 76 vs undefended/militia). Extreme order asymmetry (RS 66, RBiH 9, HRHB 1). End-report "Control events: 0" is misleading without a note that Phase II flips are in phase_ii_attack_resolution.

**What needs changing, tuning, or investigating:** Recalibrate RBiH benchmark bands or tune balance so RBiH lands in band. Investigate defender-present battles (AoR/garrison, SCORE_DEFENDER_PRESENT_BONUS). Add end-report line clarifying Phase II flips. Consider whether RBiH should issue more attack orders.

### 3.2 Gameplay Programmer

**What works as intended:** Phase II pipeline 52 weeks, 76 orders, 37 flips; phase_ii_attack_resolution and weekly rollup consistent. Attack resolution: 76 unique targets, symmetric casualties, defender-absent path used. Displacement: takeover and minority flight both reported; civilian_casualties by faction. Formation delta +6; historical_alignment personnel/brigade deltas; state and anchor checks consistent.

**What does not:** Control_events.jsonl is Phase I–only; Phase II flips are not pushed to events_all, so "Control events: 0" and control_events.jsonl are misleading. Defender-present battles 0 for whole run (bot targeting/AoR). End_report "65 settlements with controller change" vs run_summary "37 flips" needs clarification (65 = net distinct settlements; 37 = Phase II flip events).

**What needs changing, tuning, or investigating:** Log Phase II flips in harness control events (same ControlEvent shape, deterministic sort). Clarify end_report wording for "Total control events" vs "Total settlements with controller change." Optional note on minority flight vs takeover totals (different definitions).

### 3.3 Scenario-harness-engineer

**What works as intended:** All expected artifacts present (run_summary.json, end_report.md, final_save.json, control_delta, formation_delta, activity_summary, control_events.jsonl, weekly_report.jsonl, replay.jsonl). run_summary structure correct; control_delta and formation_delta match schema; activity_summary and weekly_report shape correct. control_events empty for Phase II–only run is expected. Phase II rollup diagnostics clear.

**What does not:** run_meta.json `out_dir` points at base run_id (e.g. .../w52) not the actual directory (e.g. .../w52_n7) when uniqueRunFolder is true. End_report "Control events (harness log): Total control events: 0" misleading without "Phase I control-flip events only."

**What needs changing, tuning, or investigating:** Set run_meta.out_dir to actual run directory (runDirName) when uniqueRunFolder is true. Clarify "Control events" as Phase I–only; optionally add "Phase II attack-resolution flips: N." Document fractional personnel_total_delta in historical_alignment if consumers assume integer.

### 3.4 Canon-compliance-reviewer

**What works as intended:** Control change path: all changes from Phase II attack resolution; no Phase I control flip. Attack resolution (orders, flips, casualties) aligned with Systems Manual §7.4 and Phase II spec. Displacement (takeover + minority flight, civilian_casualties) aligned with Phase II §15. Formation lifecycle +6 brigades, pipeline order correct. Historical anchors 7/7. Run diagnostics (phase_ii_attack_resolution, orders_by_faction, defender_present/absent) match spec.

**What does not:** No canon breach. 0 defender-present battles is behavior/tuning (bot prefers undefended). Phase II flips not in control_events.jsonl is a harness/reporting gap for full traceability.

**What needs changing, tuning, or investigating:** Consider bot scoring/AoR for defender-present battles. Optionally push Phase II flips to control_events or add separate Phase II flip log and reference in end report. Bot benchmark failures are calibration only.

### 3.5 Systems Programmer

**What works as intended:** final_state_hash present (16-char hex). run_summary and nested keys use stableStringify/sorted keys; orders_by_faction and weekly rollup ordered. control_delta and formation_delta sorted; control_events.jsonl sort (turn, mechanism, settlement_id). No timestamps in harness write path; unique run folder uses monotonic n7.

**What does not:** Fractional values in run_summary (casualty_defender 335.6035, personnel_total 98697.3965) can cause diff noise across platforms. "Control events (harness log)" label can be read as "all control changes."

**What needs changing, tuning, or investigating:** Integerize run_summary counts (casualties, personnel) for stable regression. Clarify in end report that "Control events" is Phase I control-flip only. Confirm phase_ii_minority_flight_weekly / phase_ii_takeover_displacement_weekly array and key ordering.

### 3.6 Formation & Scenario (combined)

**What works as intended:** All 7 anchor checks pass. Formation growth +6 brigades; recruitment capital up for all factions. Personnel and militia pools (committed >> available, none exhausted) feed brigades as intended. Net control change small (65 flips); vs_historical consistent. Phase II activity and displacement reported.

**What does not:** No defender-present battles (76/76 defender_absent). RBiH benchmarks failed (overperformed). Order skew (RS 66, RBiH 9, HRHB 1) may understate RBiH/HRHB activity.

**What needs changing, tuning, or investigating:** Defender coverage/scoring (AoR, front-active, SCORE_DEFENDER_PRESENT_BONUS) so some attacks hit defended settlements. Decide RBiH benchmark band vs calibration. Optional scenario review for Srebrenica/Sarajevo settlement-level churn.

---

## 4. Consolidated findings

| Priority | Finding | Owner / action |
|----------|---------|----------------|
| P1 | **Phase II flips not in control_events:** Harness does not push Phase II attack-resolution flips to control_events.jsonl; end_report "Total control events: 0" is misleading. | Gameplay Programmer / Scenario-harness: add Phase II flip events to events_all (mechanism e.g. phase_ii_attack_resolution) or clarify label and add "Phase II flips: N" in end report. |
| P1 | **Defender-present battles 0:** All 76 battles vs undefended/militia; no set-piece brigade-vs-brigade. | Gameplay Programmer / Game Designer: use DEFENDER_PRESENT_BATTLES_DIAGNOSIS and SCORE_DEFENDER_PRESENT_BONUS; tune bot and/or AoR so some attacks hit defended settlements. |
| P2 | **RBiH bot benchmarks (2 failed):** hold_core_centers and preserve_survival_corridors fail because RBiH control share 0.39 vs expected 0.20/0.25. | Game Designer: decide band vs balance; either raise expected/tolerance or tune RS pressure/RBiH so share lands in band. |
| P2 | **run_meta.out_dir when uniqueRunFolder:** out_dir points at base run_id, not actual directory (e.g. w52_n7). | Scenario-harness-engineer: set out_dir to runDirName when uniqueRunFolder is true. |
| P2 | **End-report "Control events" clarity:** Label as "Phase I control-flip events (harness log)" and optionally add Phase II flips count. | Scenario-harness-engineer / scenario_end_report. |
| P3 | **Integerize run_summary counts:** Casualty and personnel totals have fractional values; integerize for stable regression. | Systems Programmer. |
| P3 | **65 vs 37 (control delta vs flips_applied):** Clarify in end_report that 65 = distinct settlements with controller change (initial→final), 37 = Phase II flip events. | Documentation / end_report wording. |
| P3 | **RBiH/HRHB order count:** Confirm design intent for RBiH/HRHB attack order volume; consider bot strategy if more counterattack activity desired. | Game Designer. |

---

## 5. Single priority and owner (Orchestrator)

**Single priority:** Fix harness reporting so Phase II–only runs are not misleading: (1) Log Phase II attack-resolution flips to the control_events stream (or document and display Phase II flips count in end report), and (2) Clarify "Control events (harness log)" as Phase I control-flip events only.

**Owner:** Gameplay Programmer (harness change to push Phase II flips) with Scenario-harness-engineer (run_meta.out_dir fix and end_report wording). Game Designer to follow with defender-present battles and RBiH benchmark decisions as next priorities.

---

## 6. References

- Run summary: `runs/apr1992_definitive_52w__0af6ac1e57e861d2__w52_n7/run_summary.json`
- End report: `runs/apr1992_definitive_52w__0af6ac1e57e861d2__w52_n7/end_report.md`
- Final save: `runs/apr1992_definitive_52w__0af6ac1e57e861d2__w52_n7/final_save.json`
- Canon: docs/10_canon/Systems_Manual_v0_5_0.md, Phase II spec
- PROJECT_LEDGER: docs/PROJECT_LEDGER.md
- Existing analysis: docs/40_reports/convenes/FULL_RUN_ANALYSIS_52W_APR1992_2026_02_18.md, PHASE_L_CALIBRATION_AND_TESTING_2026_02_18.md
- Defender-present diagnosis: docs/40_reports/convenes/DEFENDER_PRESENT_BATTLES_DIAGNOSIS_2026_02_18.md
