# Paradox: Recruitment and Ethnic Control Systems — Test Run Report

**Date:** 2026-02-11  
**Role:** Orchestrator  
**Purpose:** Run scenarios to test the new recruitment and ethnic control systems; report how it went, what needs fine-tuning, and what feels ahistoric.

---

## 1. What was run

| Scenario | Init mode | Weeks | Run id | Notes |
|----------|-----------|-------|--------|--------|
| **apr1992_4w** | institutional (apr1992) | 4 | apr1992_4w__3d0ff006ce51ae06__w4 | Baseline political; no bots |
| **ethnic_1991_init_4w** | ethnic_1991 | 4 | ethnic_1991_init_4w__74c48dae1e3cd0e3__w4 | Settlement-level by 1991 census majority |
| **hybrid_1992_init_4w** | hybrid_1992 (threshold 0.7) | 4 | hybrid_1992_init_4w__f9347f6e907f3187__w4 | Political + ethnic overrides ≥70% |

All runs completed successfully (exit 0). No scenario used **recruitment_mode: "player_choice"**, so the **recruitment engine was not exercised** in this pass; current scenarios use legacy OOB/emergent spawn only.

---

## 2. How it went

### 2.1 Baseline (apr1992_4w)

- **Control:** No settlement-level control changes (0 flips). Net counts unchanged: RBiH 2158, RS 2545, HRHB 1119.
- **Phase:** Ended in Phase II (front-active 1263; run transitioned out of Phase I).
- **Displacement:** Settlement/municipality displacement totals increased (report shows 1173/23.46 → 1173/93.84), consistent with Phase II reporting.
- **Interpretation:** As intended for a no-bot political init run: stable control, no Phase I flip activity.

### 2.2 Ethnic 1991 init (ethnic_1991_init_4w)

- **Init:** 5822 settlements — RBiH 2374, RS 2412, HRHB 1036 (no nulls).
- **Control changes:** **3423 settlements** changed controller over 4 weeks. Net: RBiH 2374→1822 (−552), RS 2412→3317 (+905), HRHB 1036→683 (−353).
- **Events:** 6846 control events (all `phase_i_control_flip`).
- **Top flip municipalities (by settlement flips):** Gorazde (147), Kakanj (96), Visegrad (96), Travnik (81), Kiseljak (79), Foca (74), Visoko (74), Zenica (68), Rogatica (64), Bijeljina (62).
- **Direction:** Largest flows — RBiH→RS 1530, RS→RBiH 962, HRHB→RS 592, RS→HRHB 255.
- **Formations:** 171 brigades added (emergent spawn from pools).
- **Displacement:** Settlement/municipality displacement reported **0/0 → 0/0**.
- **Fronts:** Front-active 0 (run stayed in Phase I; no AoR).

### 2.3 Hybrid 1992 init (hybrid_1992_init_4w)

- **Init:** 5822 settlements — RBiH 2230, RS 2507, HRHB 1085 (hybrid_1992, threshold=0.7).
- **Control changes:** **3692 settlements** changed controller. Net: RBiH 2230→2142 (−88), RS 2507→2979 (+472), HRHB 1085→701 (−384).
- **Events:** 7384 control events (all `phase_i_control_flip`).
- **Top flip municipalities:** Gorazde (153), Kakanj (98), Visegrad (87), Travnik (81), Visoko (81), Kiseljak (80), Zenica (72), Foca (69), Sokolac (66), Bijeljina (65).
- **Direction:** HRHB→RS 683, RBiH→RS 1359, RS→RBiH 1249, RS→HRHB 321.
- **Formations:** 166 brigades added.
- **Displacement:** Again **0/0 → 0/0**.
- **Fronts:** Phase I only; front-active 0.

---

## 3. What needs fine-tuning

### 3.1 Displacement reporting (0 in ethnic/hybrid)

- In both ethnic and hybrid runs, **displacement** is reported as 0/0 → 0/0 despite thousands of flips.
- Canon (Phase I §4.4): displacement triggers when **Hostile_Population_Share > 0.30** on flip; hooks use census when available.
- **Recommendation:** Verify that (a) `municipalityPopulation1991` is passed in the turn input when running these scenarios (e.g. from scenario or from loaded census), and (b) Phase I displacement apply updates the state fields that feed `settlement_displacement_count` / `settlement_displacement_total` in reporting. If census is missing, fallback hostile share is 0.5, so hooks should still be created; the gap may be in apply or in what the report reads.

### 3.2 Rate and direction of flips

- **Ethnic:** ~3423 flips in 4 weeks with **no bots** (pure Phase I flip logic). RS gains +905 settlements; RBiH and HRHB lose.
- **Hybrid:** Slightly more flips (3692) but RBiH loses less (−88 vs −552). Still strong RS gains (+472) and HRHB loss (−384).
- **Fine-tuning levers to consider:** FLIP_* constants, capability-weighted and formation-aware flip (already in), defensive floors for core municipalities, and possibly init-specific tuning so ethnic start doesn’t over-favor one side when there are no player/bot actions. Formation-expert and gameplay-programmer can target balance.

### 3.3 Recruitment system not tested

- No scenario in this run used **recruitment_mode: "player_choice"**. The recruitment engine (manpower + recruitment capital + equipment, bot scoring, mandatory-first, emergent suppression) was **not executed**.
- **Recommendation:** Add at least one short scenario (e.g. 4w) with `recruitment_mode: "player_choice"` and optional `recruitment_capital` / `equipment_points` to validate the recruitment path and bot recruitment behavior end-to-end.

### 3.4 Run artifact consistency

- First execution of ethnic and hybrid runs produced only partial artifacts (e.g. initial_save, replay, run_meta, weekly_report) in their run directories; a second run produced full artifacts (final_save, run_summary, end_report, control_delta, etc.). Same run_id (scenario + weeks hash) overwrote the directory. If the first run had failed or exited early, that could explain partial writes; otherwise consider whether the harness can ever exit before the final write block. Not blocking but worth a quick check.

---

## 4. What feels ahistoric

### 4.1 One-sided RS sweep in 4 weeks (ethnic init)

- **Observation:** In ethnic_1991_init_4w, RS gains ~905 settlements and RBiH loses ~552 in 4 weeks with no opposing player/bot actions. That yields a very fast consolidation toward RS control.
- **Historical context:** Early 1992 saw RS (VRS/JNA) advances but also RBiH consolidation and organization; enclaves (e.g. Gorazde, Srebrenica) held; the map did not collapse to one side in a month.
- **Assessment:** The **pace and one-sidedness** of flips in a no-bot ethnic init run feel **ahistoric**. With bots or a human defending, the outcome would differ; the concern is that the raw Phase I flip model, when started from ethnic init, may be too favorable to RS when unopposed.

### 4.2 Gorazde and similar enclaves

- **Observation:** Gorazde appears in the **top flip list** (147 settlement flips in ethnic, 153 in hybrid). Historically Gorazde held as an RBiH enclave for a long time.
- **Assessment:** Without defensive modifiers or scenario-specific rules for key enclaves, the model can flip Gorazde quickly. This is a candidate for **defensive floor** or **enclave preservation** tuning (design/canon decision).

### 4.3 No displacement despite many flips

- **Observation:** Thousands of control flips but 0 reported displacement. Historically, control changes in ethnically mixed or hostile-majority areas were accompanied by large displacement.
- **Assessment:** If displacement is not firing or not being reported, the run underrepresents **depopulation and ethnic homogenization** and feels ahistoric. Fixing the displacement path (census + apply + reporting) is a priority.

### 4.4 Hybrid as “middle path”

- **Observation:** Hybrid produces fewer net losses for RBiH (−88 vs −552) and still many flips (3692). Init is closer to political (RBiH 2230, RS 2507) with ethnic overrides only where opposition share ≥ 70%.
- **Assessment:** Hybrid is **more conservative** and may be a better fit for a “semi-historical” April 1992 feel once displacement and flip pace are tuned. Good candidate for scenario naming and AAR use (e.g. “April 1992 (hybrid 1992 start)”).

---

## 5. Summary and handoffs

| Item | Status | Owner / next step |
|------|--------|-------------------|
| Ethnic init | Runs; 3.4k flips; RS-heavy | Gameplay / Formation-expert: tune flip/defense so unopposed run less one-sided |
| Hybrid init | Runs; 3.7k flips; slightly less RBiH collapse | Keep as scenario option; document as semi-historical |
| Displacement 0 | Bug or missing census/apply/report | Gameplay-programmer: verify census in turn input, Phase I apply, and report wiring |
| Recruitment | Not exercised | PM / Scenario-creator: add recruitment_mode scenario; run recruitment test pass |
| Enclaves (e.g. Gorazde) | Flip too easily | Game Designer: consider defensive floors or enclave rules; Formation-expert for implementation |
| Run artifacts | Second run full; first run partial in one session | Scenario-harness-engineer: optional check for early exit before final writes |

**Single priority recommendation:** **Fix and verify Phase I displacement** (census → hooks → apply → reporting) so that ethnic/hybrid runs produce non-zero displacement where canon expects it; then re-run the same three scenarios and compare.

**Orchestrator → Product Manager:** Consider sequencing (1) displacement verification/fix, (2) one recruitment_mode scenario and test pass, (3) flip/balance tuning for ethnic init and enclaves.  
**Orchestrator → Game Designer:** Confirm whether enclave (e.g. Gorazde) preservation or defensive floors are in scope and how they should be expressed in canon/scenario.

---

## 6. References

- Scenarios: `data/scenarios/apr1992_4w.json`, `ethnic_1991_init_4w.json`, `hybrid_1992_init_4w.json`
- Run outputs: `runs/apr1992_4w__3d0ff006ce51ae06__w4`, `runs/ethnic_1991_init_4w__74c48dae1e3cd0e3__w4`, `runs/hybrid_1992_init_4w__f9347f6e907f3187__w4`
- Ethnic init design: `docs/40_reports/PARADOX_ETHNIC_INITIAL_CONTROL_CONVENE.md`
- Recruitment: `docs/40_reports/recruitment_system_implementation_report.md`, `docs/40_reports/recruitment_system_design_note.md`
- Napkin: `.agent/napkin.md` (Domain Notes updated for this test run)
