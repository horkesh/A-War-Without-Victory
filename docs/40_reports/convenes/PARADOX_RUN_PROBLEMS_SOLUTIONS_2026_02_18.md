# Paradox Convene: 52w apr1992_definitive Run — Problems, Role Assignments, and Proposed Solutions

**Date:** 2026-02-18  
**Source of truth:** `docs/40_reports/convenes/FULL_RUN_ANALYSIS_52W_APR1992_2026_02_18.md`  
**Calibration context:** `docs/40_reports/convenes/PHASE_L_CALIBRATION_AND_TESTING_2026_02_18.md`  
**Run:** apr1992_definitive_52w__0af6ac1e57e861d2__w52_n7

---

## 1. Problems and illogicalities (from full run analysis)

| # | Problem | Summary |
|---|---------|--------|
| 1 | **Displacement “15,000” population** | All municipalities in `displacement_state` get default `original_population` 10,000; receiving capacity = 1.5× → 15k cap. Many muns display 15,000; scale wrong (e.g. Banja Luka should reflect ~200k, not 15k). |
| 2 | **No brigade-vs-brigade battles** | All 76 Phase II attacks were defender-absent (undefended/militia). Zero defender-present battles → no set-piece combat; military casualties very low (335/335.6). Expected at least some defended fronts. |
| 3 | **RBiH bot benchmarks “fail” by overperforming** | hold_core_centers (actual 0.39 vs expected 0.20) and preserve_survival_corridors (0.39 vs 0.25). Benchmarks/tolerances may be mis-calibrated or design intent wrong. |
| 4 | **Mass displacement in week 1** | Minority flight week 1 is 674k displaced (most of total 790k). May be logical (initial pressure sweep) or a calibration/illogicality (too much in one tick). |
| 5 | **RBiH “fled abroad” = 0** | In civilian_casualties attribution, RBiH has 0 fled_abroad; RS/HRHB have large fled_abroad. Confirm whether by design (mechanic reflects who is displaced from where) or an omission. |
| 6 | **No formal Sarajevo hold anchor** | Siege activity present (displacement from centar_sarajevo, ilidza, hadzici, stari_grad_sarajevo) but no anchor in runner for “Sarajevo holds” (e.g. centar_sarajevo expected RBiH). |

---

## 2. Role assignments and proposed solutions

### Problem 1: Displacement “15,000” population

| Role(s) | Responsibility |
|---------|-----------------|
| **Technical Architect** | Define where and when census data is loaded; ensure `municipality_population_1991` (or equivalent) is the single source for `original_population` at scenario load; document data contract and init order. |
| **Gameplay Programmer** | Implement: at scenario load (or first displacement touch), seed `displacement_state` (or at least `original_population`) from 1991 census so receiving capacity = 1.5 × census and map “Population (Current)” scales by real mun size. |

**Proposed solution (design/scope):**
- **Architecture:** At scenario init (or when building/loading state for Phase II), initialize `displacement_state` per municipality from a census source (e.g. `data/derived/municipality_population_1991.json` or existing rolled-up census). `getOrInitDisplacementState` should use census value when available instead of default 10,000.
- **Scope:** Load census once at scenario load; key by same municipality ID used elsewhere (mun1990_id / municipality_id). No change to capacity formula (1.5×); only the baseline `original_population` becomes census-driven.
- **Canon/docs:** FULL_RUN_ANALYSIS_52W_APR1992_2026_02_18.md §5; napkin Domain Notes “Displacement 15,000 population”.

---

### Problem 2: No brigade-vs-brigade battles

| Role(s) | Responsibility |
|---------|-----------------|
| **Gameplay Programmer** | Investigate why all attacks hit undefended/militia targets: garrison assignment, front-active coverage, bot target selection. Propose pipeline or bot changes so some attacks encounter brigade defenders. |
| **Formation Expert** | Advise on AoR/garrison so brigades are present on front settlements when under pressure; ensure militia vs brigade defender logic is correct and that “defender-present” path is reachable. |
| **Game Designer** | Confirm intended density of set-piece battles (e.g. “at least some” defended fronts by week 52); set design bar for calibration. |

**Proposed solution (design/scope):**
- **Design:** Confirm target: e.g. “non-trivial fraction of Phase II attacks should be defender-present (brigade or meaningful militia) by 52w.” Calibration may require bot target selection to prefer contested fronts and/or garrison rules so key settlements retain brigade coverage.
- **Scope:** (1) Diagnose: why no defender-present in this run (target choice, garrison coverage, one-brigade-per-target, timing). (2) Propose: bot or garrison changes (e.g. defensive posture placing brigades on front, or attack selection favoring settlements with garrison). No change to battle resolution math unless designer requests.
- **Canon/docs:** Phase II spec, Systems Manual §7; run_summary `phase_ii_attack_resolution` (defender_absent / defender_present).

---

### Problem 3: RBiH bot benchmarks “fail” by overperforming

| Role(s) | Responsibility |
|---------|-----------------|
| **Game Designer** | Decide whether benchmarks reflect “RBiH should struggle” (then tolerances are correct and run is RBiH-strong) or “RBiH can do well” (then relax or reword expectations). |
| **QA Engineer** | Recalibrate tolerances or expected values if design intent is updated; ensure benchmark definitions and pass/fail criteria are documented and reproducible. |

**Proposed solution (design/scope):**
- **Design:** Either (a) accept 52w run as “RBiH-strong” and keep strict benchmarks for future tuning, or (b) update expected values/tolerances (e.g. hold_core_centers 0.20 → 0.35, preserve_survival_corridors 0.25 → 0.40) so current calibration passes, or (c) add band (min–max) instead of single expected.
- **Scope:** Design decision first; then QA/implementation of benchmark constants and docs. No sim logic change unless designer ties benchmark to difficulty knobs.
- **Canon/docs:** AI_STRATEGY_SPECIFICATION or bot benchmark docs; PHASE_L_CALIBRATION_AND_TESTING_2026_02_18.md §4.

---

### Problem 4: Mass displacement in week 1

| Role(s) | Responsibility |
|---------|-----------------|
| **Gameplay Programmer** | Assess whether week-1 minority flight is a single-tick pressure sweep (all settlements evaluated once) or can be spread (e.g. cap per week, or phased by region). Propose design option if change is needed. |
| **QA Engineer** | If calibration change is chosen, define acceptable band for week-1 vs later displacement and add to run_summary or calibration checklist. |
| **Game Designer** | Say whether “big week 1 then smaller” is acceptable or whether displacement should be more spread over time. |

**Proposed solution (design/scope):**
- **Design:** Decide: (a) keep current (initial pressure sweep is acceptable), or (b) cap or taper week-1 minority flight (e.g. max displaced per week, or fraction of pressure applied in week 1), or (c) document as known behavior and defer.
- **Scope:** If (b), gameplay defines formula; QA adds calibration check. No change until design decision.
- **Canon/docs:** Displacement routing, minority flight phase; FULL_RUN_ANALYSIS §1.1.

---

### Problem 5: RBiH “fled abroad” = 0 in civilian_casualties

| Role(s) | Responsibility |
|---------|-----------------|
| **Gameplay Programmer** | Confirm how civilian_casualties.fled_abroad is attributed (by faction doing the displacing vs by ethnicity of displaced). If by design (RBiH = Bosniak; Bosniaks displaced from RS-held land go under RS/HRHB), document it. |
| **Game Designer** | Confirm intent: is “RBiH fled_abroad = 0” correct (Bosniaks fleeing RS/HRHB control attributed to RS/HRHB) or should RBiH also get a share of Bosniak flee-abroad from mixed attribution? |

**Proposed solution (design/scope):**
- **Design:** Document current rule: e.g. “fled_abroad by displacing-faction (timer.from_faction / minority flight controller)” so RBiH 0 is by design when RBiH is not the one displacing those who flee abroad. If designer wants ethnicity-based attribution instead, scope a separate attribution path.
- **Scope:** Documentation first; code change only if attribution rule is revised.
- **Canon/docs:** displacement_takeover, minority_flight, civilian_casualties; FULL_RUN_ANALYSIS §1.3.

---

### Problem 6: No formal Sarajevo hold anchor

| Role(s) | Responsibility |
|---------|-----------------|
| **Scenario Harness Engineer** | Add municipality anchor for Sarajevo hold: e.g. `centar_sarajevo` expected_controller RBiH to `HISTORICAL_ANCHORS_APR1992_TO_DEC1992` in scenario_runner so runner reports pass/fail for “Sarajevo holds.” |
| **Scenario Creator Runner Tester** | Confirm centar_sarajevo (or one Sarajevo-core mun) is the right anchor for “Sarajevo holds” from historical expectation. |

**Proposed solution (design/scope):**
- **Design:** Add one municipality-level anchor: `{ municipality_id: 'centar_sarajevo', expected_controller: 'RBiH' }` to the existing historical anchor list used for apr1992→Dec1992 runs. Runner already supports municipality anchors; no new mechanism.
- **Scope:** Single constant/list change in scenario_runner (HISTORICAL_ANCHORS_APR1992_TO_DEC1992). End_report and run_summary will then include Sarajevo in anchor checks.
- **Canon/docs:** PHASE_L_CALIBRATION_AND_TESTING_2026_02_18.md §2, §6; scenario_runner.ts HISTORICAL_ANCHORS_APR1992_TO_DEC1992.

---

## 3. Single agreed priority and owner

**Single agreed priority:** **Displacement census seeding (Problem 1).**

- **Owner:** **Technical Architect** (design + data contract) with **Gameplay Programmer** (implementation).
- **Rationale:** Fix is well specified in the full run analysis; it corrects a visible scale error (15k everywhere) and restores credibility of population and displacement metrics without changing combat or bot logic. Other items are either smaller in scope (Sarajevo anchor), require design decisions first (benchmarks, week-1 displacement, fled_abroad attribution), or need diagnosis before solution (defender-present battles).

**Success:** At scenario load, `displacement_state` (or equivalent) has `original_population` per municipality from 1991 census; receiving capacity and map “Population (Current)” scale by real mun size (e.g. Banja Luka order ~200k, not 15k cap).

---

## 4. Handoff to Product Manager (optional phased plan)

If the team sequences more than the single priority:

1. **Immediate:** Displacement census seeding (Technical Architect + Gameplay Programmer) — see §3.
2. **Quick win:** Add Sarajevo hold anchor (Scenario Harness Engineer + Scenario Creator Runner Tester) — config-only, no sim change.
3. **Design-led:** RBiH benchmark tolerances (Game Designer + QA Engineer); RBiH fled_abroad attribution (Game Designer + Gameplay Programmer doc); week-1 displacement (Game Designer + Gameplay Programmer option).
4. **Diagnosis then fix:** Defender-present battles (Gameplay Programmer + Formation Expert diagnose; then design/scope fix).

PM may produce a short phased plan with dependencies (e.g. census seeding before recalibrating displacement checks) and assign owners per phase.

---

## 5. References

- **Full run analysis:** docs/40_reports/convenes/FULL_RUN_ANALYSIS_52W_APR1992_2026_02_18.md  
- **Phase L calibration:** docs/40_reports/convenes/PHASE_L_CALIBRATION_AND_TESTING_2026_02_18.md  
- **Run artifacts:** runs/apr1992_definitive_52w__0af6ac1e57e861d2__w52_n7/ (run_summary.json, end_report.md, final_save.json)  
- **Napkin:** .agent/napkin.md (Domain Notes: Displacement 15,000 population)  
- **Orchestrator skill:** .cursor/skills/orchestrator/SKILL.md  
- **Skills catalog:** .agent/skills-catalog.md  

---

*Convene produced by Orchestrator. No canon or code edited; proposals only.*
