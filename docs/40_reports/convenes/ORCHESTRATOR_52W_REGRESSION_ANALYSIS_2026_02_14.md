# Orchestrator — 52-week run regression analysis: army strengths, brigades, consolidation

**Date:** 2026-02-14  
**Request:** Inspect results; full analysis of army strengths not up to par, not enough brigades, municipalities not consolidated.  
**Runs inspected:** `historical_mvp_apr1992_52w__1f30fc5bbf33b750__w52`, `historical_mvp_apr1992_52w__b6b915bcc94c2f5e__w52`, `apr1992_historical_52w__8f38ea4a52d0448f__w52`.

---

## 1. Executive summary

**Root cause:** The scenario **historical_mvp_apr1992_52w** uses `recruitment_mode: "player_choice"`. That path uses **runBotRecruitment** at init, which creates only the brigades that can be “bought” with initial recruitment capital and equipment. It does **not** spawn the full OOB. The result is low brigade counts, low army strength, and almost no defender-present battles (no meaningful territorial consolidation).

**This is not a code regression.** It is the **intended behavior** of the player_choice recruitment path, documented in napkin (“Historical 52w brigade shortfall fix”, 2026-02-13). The scenario **apr1992_historical_52w** (no `recruitment_mode`) uses the full-OOB path and produces historical-scale personnel and consolidation.

**Single priority:** Use **apr1992_historical_52w** for 52-week historical-fidelity runs (army strengths, brigades, consolidation). Reserve **historical_mvp_apr1992_52w** for player-choice / recruitment-centric play. If “historical MVP” is meant to mean “historical troop numbers and consolidation,” then the scenario should be changed to drop `recruitment_mode` (or set `recruitment_mode` to a value that triggers full OOB) and optionally keep capital/trickle for Phase II only.

---

## 2. Army strengths: observed vs reference

### 2.1 Current run (historical_mvp_apr1992_52w, player_choice)

| Faction | Initial personnel | Final personnel | Initial brigades | Final brigades |
|---------|-------------------|-----------------|------------------|----------------|
| RBiH    | 10,400            | **15,486**      | 13               | 16             |
| RS      | 7,200             | **6,974**       | 9                | 9              |
| HRHB    | 0                 | **0** (4 OGs)   | 0                | 0 (4 OGs)      |

- **Total brigade personnel end state:** ~22.5k.
- Militia pools: RBiH 826 committed / 15,772; RS 825 / 7,568; HRHB 516 / 0.

### 2.2 Reference: apr1992_historical_52w (full OOB, no player_choice)

| Faction | Initial personnel | Final personnel | Initial brigades | Final brigades |
|---------|-------------------|-----------------|------------------|----------------|
| RBiH    | 96,800            | **129,762**     | 121              | 121            |
| RS      | 74,400            | **91,190**      | 93               | 93             |
| HRHB    | 31,200            | **35,304**      | 39               | 39             |

- **Total brigade personnel end state:** ~256k.
- Same 52 weeks, same Phase II; only scenario difference is **no** `recruitment_mode` (and no capital/trickle).

### 2.3 Historical band (Sept 1992, from PARADOX convene)

- **RBiH:** ~85k–105k (ARBiH).
- **VRS/RS:** ~85k–95k.
- **HVO/HRHB:** ~40k–45k.

apr1992_historical_52w 52w end state (130k / 91k / 35k) is in the right order of magnitude and above the band (run extends past Sept 1992). historical_mvp_apr1992_52w (15k / 7k / 0) is an order of magnitude below the band.

**Conclusion:** Army strengths are “not up to par” because the scenario uses player_choice recruitment, which by design creates only a small subset of OOB brigades and leaves army strength low.

---

## 3. Brigades: why so few?

### 3.1 Init path (scenario_runner.ts createOobFormations)

- **If** `scenario.recruitment_mode === 'player_choice'` **and** there are OOB brigades:
  - Runner calls **runBotRecruitment(state, oobCorps, oobBrigades, resources, …)**.
  - Bot recruitment spends initial capital and equipment to “buy” brigades; many are skipped (control, manpower, capital, equipment). Console shows: “Mandatory: 0, Elective: 22, Skipped: control=8 manpower=207 capital=24 equipment=0”.
  - Result: only a fraction of the OOB is created (e.g. 13 RBiH, 9 RS, 4 HRHB OGs).
- **Else if** `scenario.init_formations_oob` (and no player_choice):
  - Runner calls **createOobFormationsAtPhaseIEntry(…)**.
  - All OOB brigades are created at MIN_BRIGADE_SPAWN (800). Reinforcement then fills from militia pools over 52 weeks.
  - Result: 121 RBiH, 93 RS, 39 HRHB (from apr1992_historical_52w).

### 3.2 Formation delta over 52 weeks

- **historical_mvp_apr1992_52w:** Formations added: **3** (all RBiH brigades). No new RS or HRHB formations.
- **apr1992_historical_52w:** Formations added: **0** (all created at init).

So “not enough brigades” comes from (1) init creating only a subset under player_choice, and (2) very few new formations over 52 weeks in that path.

**Conclusion:** Brigade count is low by design when using historical_mvp_apr1992_52w (player_choice). Use apr1992_historical_52w for full OOB and historical-scale brigade counts.

---

## 4. Municipalities not consolidated

### 4.1 Control flips

- **historical_mvp_apr1992_52w (1f30fc5bbf33b750):** 48 settlement flips over 52 weeks. Net: RBiH +16, RS +4, HRHB −20. Top muns: derventa (13), visoko (5), zavidovici (5).
- **apr1992_historical_52w (8f38ea4a52d0448f):** 406 settlement flips. Net: RBiH −76, RS +156, HRHB −80. Many more municipalities see flips (kotor_varos 24, vlasenica 23, gacko 19, etc.).

### 4.2 Defender-present battles (consolidation)

- **historical_mvp_apr1992_52w:** Phase II attack resolution: **0 defender-present battles**, 440 defender-absent. All engagements are soft-front / undefended. Flips taper to zero after ~week 22.
- **apr1992_historical_52w:** Weekly rollup shows **defender-present and defender-absent** both nonzero (e.g. w13: 83/51 casualties, 23 defender-present / 18 absent). Sustained contested battles and territorial change.

So in the player_choice run there is almost no “consolidation” in the sense of defended battles and sustained pressure; in the full-OOB run there is.

**Conclusion:** Municipalities appear “not consolidated” because (1) few flips (48 vs 406), and (2) zero defender-present battles, so no model of clearing defended territory. That again traces to low army strength and few brigades (player_choice path).

---

## 5. Why two different historical_mvp_apr1992_52w runs (1f30fc5bbf33b750 vs b6b915bcc94c2f5e)?

- **1f30fc5bbf33b750:** 48 flips, 0 Phase I control events, 16 RBiH / 9 RS / 4 HRHB, ~15k / ~7k / 0 personnel. Matches current scenario and Phase II–only, player_choice.
- **b6b915bcc94c2f5e:** 1,858 flips, **4,834 phase_i_control_flip** events, 220 formations added, final personnel 43k / 134k / 114k. Different init (e.g. RBiH 1,600 / 10,400 / 13,600 initial) and Phase I was executed.

So b6b915bcc94c2f5e is from an older or different setup (Phase I run or different scenario version). It is not reproducible with current **historical_mvp_apr1992_52w.json** (Phase II only, player_choice). Do not treat it as the baseline for “historical MVP” unless the scenario is reverted or duplicated with that behavior.

---

## 6. Scenario config comparison

| Field                 | historical_mvp_apr1992_52w     | apr1992_historical_52w   |
|-----------------------|---------------------------------|--------------------------|
| recruitment_mode      | **"player_choice"**             | (none → effective auto_oob) |
| recruitment_capital   | RS 260, RBiH 130, HRHB 110     | —                        |
| equipment_points     | RS 280, RBiH 100, HRHB 120     | —                        |
| init_formations_oob   | true                           | true                     |
| start_phase           | phase_ii                       | phase_ii                 |
| init_control_mode     | ethnic_1991                    | ethnic_1991              |

The only behavioral difference for formation creation is **recruitment_mode**. When it is `player_choice`, createOobFormations uses runBotRecruitment and limits brigades/strength.

---

## 7. Recommendations

### 7.1 For 52-week historical-fidelity runs (army strengths, brigades, consolidation)

- **Use scenario:** **apr1992_historical_52w.json**.
- **Command:** `npm run sim:scenario:run -- --scenario data/scenarios/apr1992_historical_52w.json --video --map --out runs` (add `--video` if replay is needed).
- **Expected:** Full OOB at init (121 RBiH, 93 RS, 39 HRHB), personnel in band order (~130k / ~91k / ~35k at 52w), defender-present battles, hundreds of settlement flips.

### 7.2 For “historical MVP” naming and docs

- If “historical MVP” is intended to mean “historical troop numbers and territorial consolidation,” then **historical_mvp_apr1992_52w** should be aligned with that goal:
  - **Option A:** Remove `recruitment_mode` from historical_mvp_apr1992_52w so it uses the full-OOB path (same as apr1992_historical_52w). Optionally keep capital/trickle only for Phase II accrual if the code supports that.
  - **Option B:** Keep historical_mvp_apr1992_52w as the player_choice scenario and clearly document it as “recruitment-centric / low initial OOB”; treat apr1992_historical_52w as the canonical “historical 52w” for strength and consolidation.
- **Orchestrator recommends Option B** in the short term (no scenario file change): use apr1992_historical_52w for 52w historical-fidelity runs; document in README or scenario list that historical_mvp = player_choice, apr1992_historical = full OOB for historical strength/consolidation.

### 7.3 Handoffs

- **Orchestrator → Scenario-creator-runner-tester:** Validate 52w runs using **apr1992_historical_52w** for historical alignment (anchors, vs_historical, control-share tolerance). Use HISTORICAL_FIDELITY_APR1992_SUCCESS_CRITERIA.md; acceptance run protocol already references apr1992_historical_52w.
- **Orchestrator → PM / Documentation:** Decide whether to rename or document scenario roles (historical_mvp = player_choice vs apr1992_historical = full OOB) and update any roadmap or convene that assumes “historical MVP 52w” implies historical troop numbers.
- **Orchestrator → Formation-expert (if scenario changed):** If Option A is chosen, ensure militia_pools are seeded when init_formations_oob without player_choice for Phase II start (napkin: “Seed militia_pools when init_formations_oob for Phase II start (not just player_choice)”).

---

## 8. Summary table

| Aspect              | historical_mvp_apr1992_52w (player_choice) | apr1992_historical_52w (full OOB) |
|---------------------|--------------------------------------------|-----------------------------------|
| Army strength (52w) | ~15k / ~7k / 0                             | ~130k / ~91k / ~35k               |
| Brigades (52w)      | 16 RBiH, 9 RS, 4 HRHB OGs                  | 121 RBiH, 93 RS, 39 HRHB          |
| Settlement flips    | 48                                        | 406                               |
| Defender-present    | 0                                          | Many (weekly rollup)              |
| Init path           | runBotRecruitment (capital/equipment limited) | createOobFormationsAtPhaseIEntry (all at 800) |
| Use for             | Recruitment-centric, low-OOB play         | Historical-fidelity 52w, strength & consolidation |

---

*Orchestrator regression analysis; root cause: scenario choice (player_choice vs full OOB), not code regression.*
