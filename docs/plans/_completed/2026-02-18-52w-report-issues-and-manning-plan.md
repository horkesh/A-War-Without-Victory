# 52w Report Remediation and Manning Plan (Preparation Only)

**Date:** 2026-02-19  
**Scope:** Single implementation plan addressing RS/HRHB manning vs history, Phase I consolidation mechanic, brigade movement/recruitment balance, and all issues from the Paradox 52w full team run report (run n10). **Preparation only** — no code changes in this task.  
**Report source:** `docs/40_reports/convenes/PARADOX_52W_FULL_TEAM_RUN_REPORT_2026_02_18_n10.md`

**Run n10 context:** HRHB 17.6k→24.8k, RBiH 61k→108.6k, RS 42.6k→58.8k personnel; +8 brigades; 7/8 anchors (centar_sarajevo failed); 0 defender-present battles; Phase II flips not in control_events.

---

## 1. Title and scope

This plan covers:

1. **RS and HRHB undermanned vs history** — Historical OOB bands (docs/knowledge), run n10 comparison, and concrete levers (POOL_SCALE_FACTOR, FACTION_POOL_SCALE, recruitment caps, scenario knobs) without inventing new mechanics.
2. **Phase I “consolidation” order for brigades** — Desired mechanic (one formation in a mun with no enemy brigades can flip multiple civilian/undefended settlements); Option A (re-enable Phase I + Phase I–specific consolidation step) vs Option B (model in Phase II with multi-settlement consolidation); naming and owner.
3. **Brigade movement and more brigades recruited** — Whether movement orders are issued/executed in bot/runner; levers for “more new brigades” vs “current brigades growing” (max_recruits_per_faction_per_turn, formation_spawn_directive, reservedSpawnManpowerForReinforcement, pipeline order).
4. **All other issues from the 52w report** — P1 (centar_sarajevo, Phase II flips not in control_events, 0 defender-present); P2 (RBiH benchmarks, run_meta.out_dir, end-report clarity); P3 (integerize run_summary, 66 vs 37 clarification).
5. **Displacement** — (a) Settlement panel “Population (Current)” shows municipality total (e.g. Potkozarje shows 144,051 = Banja Luka municipal total); (b) displaced population should only settle in municipalities where their faction’s brigade is present; until then they remain abstract numbers.

---

## 2. Summary table

| Issue | Proposed direction | Owner |
|-------|--------------------|--------|
| RS/HRHB undermanned vs history | Calibrate using historical bands; levers: POOL_SCALE_FACTOR, FACTION_POOL_SCALE, scenario max_recruits, RS mandatory accrual, init OOB/spawn | Formation-expert, Game Designer; Gameplay Programmer for code levers |
| Phase I consolidation mechanic | Define “consolidation” = one formation in rear mun flips multiple eligible settlements; choose Option A (Phase I) or B (Phase II); document naming vs Phase II consolidation posture | Game Designer (design); Gameplay Programmer (pipeline/spec) |
| Brigade movement in bot/runner | Bot does not issue brigade_mun_orders or brigade_movement_orders; only desktop player does. Add bot path to issue movement orders and ensure apply-municipality-orders step runs in pipeline for bot runs. | Gameplay Programmer, Formation-expert |
| More brigades vs reinforcement growth | Increase max_recruits_per_faction_per_turn (e.g. 2→3–4), reserve spawn headroom (reservedSpawnManpowerForReinforcement), ensure recruitment before reinforcement (already in pipeline); optional scenario caps favoring new brigades | Formation-expert, Gameplay Programmer |
| centar_sarajevo anchor failure | Investigate init_control, RS pressure, RBiH garrison; calibrate or document variance | Game Designer, Scenario-creator-runner-tester |
| Phase II flips not in control_events | Push Phase II attack-resolution flips to control_events or add “Phase II flips: N” in end_report; clarify “Control events” as Phase I only | Gameplay Programmer, Scenario-harness-engineer |
| 0 defender-present battles | Use DEFENDER_PRESENT_BATTLES_DIAGNOSIS; SCORE_DEFENDER_PRESENT_BONUS (100) + AoR/garrison tuning so some attacks hit defended settlements | Gameplay Programmer, Game Designer |
| RBiH bot benchmarks (hold_core_centers, preserve_survival_corridors) | Recalibrate bands or balance | Game Designer |
| run_meta.out_dir when uniqueRunFolder | Set out_dir to actual run directory (e.g. w52_n10) | Scenario-harness-engineer |
| End-report “Control events” clarity | Label “Phase I control-flip events (harness log)”; add Phase II flips count | Scenario-harness-engineer |
| Integerize run_summary counts | Casualty and personnel totals → integers for stable regression | Systems Programmer |
| 66 vs 37 in end_report | Clarify: 66 = distinct settlements with controller change; 37 = Phase II flip events | Documentation / end_report |
| **Displacement: settlement shows municipal total** | Potkozarje (Banja Luka) shows 144,051 — UI uses municipality-level displacement_state for every settlement in that mun. Label as “Municipality population (current)” or derive per-settlement display so it’s not misleading. | UI/UX Developer, Gameplay Programmer (data contract if settlement-level added) |
| **Displacement: settle only where faction has brigade** | Displaced population should only be added to a municipality (displaced_in) when that faction has at least one brigade present there; until then displaced remain abstract (e.g. in camp/pool). Requires routing/assignment gate in displacement_takeover and minority_flight. | Gameplay Programmer, Game Designer (design: abstract pool vs camp semantics) |

---

## 3. Section 1 — RS and HRHB undermanned vs history

### 3.1 Historical bands (docs/knowledge)

| Faction | April 1992 | December 1992 | Source |
|--------|------------|----------------|--------|
| **VRS/RS** | ~80,000 (incl. JNA elements) | ~90,000–100,000 | VRS_ORDER_OF_BATTLE_MASTER.md |
| **ARBiH/RBiH** | ~60,000–80,000 (many unarmed/light) | ~110,000–130,000 | ARBIH_ORDER_OF_BATTLE_MASTER.md |
| **HVO/HRHB** | ~25,000–35,000 | ~40,000–45,000 (1992) | HVO_ORDER_OF_BATTLE_MASTER.md |

Brigade counts: OOB masters list corps and brigades by period; total brigade counts can be derived from full brigade lists (VRS_APPENDIX_G_FULL_BRIGADE_LIST.md, ARBIH_APPENDIX_H, HVO_ORDER_OF_BATTLE_MASTER full list). No single “Apr vs Dec brigade count” table in the masters; narrative gives strength evolution.

### 3.2 Run n10 vs historical bands

| Faction | Run n10 final personnel | Historical band (Dec 1992) | Gap |
|--------|------------------------|----------------------------|-----|
| RS | 58,835 | ~90,000–100,000 | **Undermanned** (~31–41k short) |
| RBiH | 108,563 | ~110,000–130,000 | In band |
| HRHB | 24,791 | ~40,000–45,000 | **Undermanned** (~15–20k short) |

Brigades: Run n10 +8 (final HRHB 28, RBiH 84, RS 66). Historical brigade counts are implied by OOB structure; run’s +8 is modest vs user expectation of “more brigades recruited.”

### 3.3 Concrete levers (no new mechanics)

- **POOL_SCALE_FACTOR** (`src/sim/phase_i/pool_population.ts`): Current 55 (engine-only 104w calibration used 65). Increase to raise total pool ceiling and thus personnel ceiling.
- **FACTION_POOL_SCALE** (same file): RS 1.05→1.15 already used in 104w calibration; HRHB 1.60. Raise RS and/or HRHB to close gap (e.g. RS 1.15–1.25, HRHB 1.60–1.80) — requires Game Designer + Formation-expert alignment per napkin.
- **Scenario:** `max_recruits_per_faction_per_turn` (definitive_52w = 2). Increase (e.g. 3–4) to allow more new brigades per turn.
- **RS mandatory mobilization:** RS-only accrual (e.g. 80→120/turn) in recruitment_turn.ts for pending mandatory brigades.
- **Mandatory mobilization caps / recruitment_state:** Scenario or state knobs for max mandatory recruits per faction per turn if needed.
- **Initial OOB / spawn counts:** Ensure init_formations_oob + formation_spawn_directive and pool/control allow all mandatory brigades with spawn headroom; napkin “reserve one brigade spawn batch per (mun, faction) with spawn headroom” (reservedSpawnManpowerForReinforcement).
- **Reference:** SCENARIO_FORCE_CALIBRATION (archived docs/_old/40_reports/implemented_2026_02_15/SCENARIO_FORCE_CALIBRATION_2026_02_15.md), napkin “Scenario & pool calibration,” ORCHESTRATOR_104W_APR1992_RUN_AND_CALIBRATION_2026_02_17.md, PARADOX_104W_RESULTS_TEAM_ANALYSIS_2026_02_17.md.

### 3.4 Canon / phase-spec constraints

- Formation constants (POOL_SCALE_FACTOR, FACTION_POOL_SCALE, MIN_BRIGADE_SPAWN, MIN_MANDATORY_SPAWN) require Game Designer + Formation-expert alignment before change (PARADOX_STATE_OF_GAME_MEETING_2026_02_17, napkin).
- Phase II recruitment and reinforcement order: recruitment before reinforcement is already in pipeline; no change to semantics without canon/Systems Manual update.

---

## 4. Section 2 — Phase I “consolidation” order for brigades

### 4.1 Desired mechanic

**“Consolidation” (user intent):** A **brigade in a municipality with no enemy brigades** can **flip multiple civilian/undefended settlements** in one turn — reflecting RS historically cleaning up much of west BiH from other civilians until summer 1992.

- One formation, one mun (rear, no enemy brigades), multiple eligible settlements (civilian/undefended) flipped per turn, with a deterministic cap (per formation or per turn).

### 4.2 Current state (from repo)

- Canonical scenarios use `start_phase: "phase_ii"`; Phase I control flips are **disabled** in the pipeline (ORCHESTRATOR_WHY_NO_PHASEI_CONSOLIDATION_AND_FEW_FLIPS_2026_02_14).
- Phase II has **consolidation posture** and consolidation scoring (rear cleanup, isolated clusters) in bot_brigade_ai and consolidation_scoring.ts, but attack resolution is **one order per brigade per target per turn** and **one flip per battle**; there is no “one brigade flips multiple settlements in one turn” in Phase II.

### 4.3 Options

- **Option A — Re-enable Phase I for some scenarios and add Phase I–specific consolidation step:**  
  - Scenario with `start_phase: "phase_i"`; re-enable Phase I control flips in pipeline; add a Phase I–specific step: formation in a mun with no enemy brigades can flip multiple eligible (civilian/undefended) settlements, with a deterministic cap.  
  - Owner: Game Designer (design); Gameplay Programmer (pipeline); canon/Phase I spec if touched.

- **Option B — Model in Phase II only:**  
  - Allow one brigade in “consolidation” posture to generate either (i) multiple attack orders in rear/soft sectors (deterministic cap) or (ii) one multi-settlement “consolidation” resolution (one order, multiple flips) for rear/undefended settlements.  
  - Owner: Game Designer (design); Gameplay Programmer (pipeline); Phase II spec.

### 4.4 Naming and interaction

- **Phase I consolidation period:** Post-flip lock / consolidation period in Phase I spec — keep distinct from “consolidation” = multi-flip capability.
- **Phase II consolidation posture:** Current bot “consolidation” posture (rear cleanup scoring) — avoid confusion; document “Phase I consolidation (multi-flip)” vs “Phase II consolidation posture (rear cleanup).”

---

## 5. Section 3 — Brigade movement and more brigades recruited

### 5.1 Movement: are brigades being moved?

**Finding:** In **bot/runner** runs, brigades are **not** moved between municipalities by the bot.

- **brigade_mun_orders** (municipality-level deployment): Only the **desktop** sets these via IPC (`stage-brigade-municipality-order`). **applyBrigadeMunicipalityOrders** exists in `src/sim/phase_ii/brigade_aor.ts` but is **not** invoked by any turn_pipeline step — so in CLI/bot runs these orders are never applied.
- **brigade_movement_orders** (settlement-level movement): Only the **desktop** sets these via IPC (`stage-brigade-movement-order`). **processBrigadeMovement** is in the pipeline (`process-brigade-movement`) and consumes these orders — but the **bot never issues** brigade_movement_orders, so in bot runs no movement occurs.

**Changes needed for movement in bot runs:**

1. Add a pipeline step that runs **applyBrigadeMunicipalityOrders** when `state.brigade_mun_orders` is non-empty (so that if/when bot sets mun orders, they are applied).
2. Implement **bot issuance** of brigade_mun_orders and/or brigade_movement_orders (e.g. in generateAllBotOrders or a dedicated step) so that the bot can move brigades between municipalities/AoRs. Today the bot only issues attack orders and AoR reshape orders.

### 5.2 More brigades recruited vs current ones growing

**Run n10:** +8 brigades (formation delta); large personnel growth (e.g. RBiH 61k→108k). User wants **more new brigades** (new formations) rather than **current brigades growing** (reinforcement).

**Levers:**

- **max_recruits_per_faction_per_turn:** Scenario/state; definitive_52w = 2, default in code 1. Increasing (e.g. 3–4) allows more new brigade creations per turn.
- **formation_spawn_directive:** Definitive has `{ "kind": "both" }`; spawn from pools when `pool.available >= batchSize` (1000). Keep active so new brigades can form.
- **reservedSpawnManpowerForReinforcement** (`src/sim/formation_spawn.ts`): Reserves pool for one brigade spawn batch per (mun, faction) when spawn directive is active so new brigades can form before reinforcement drains the pool. Verify this is applied in reinforcement path (reinforceBrigadesFromPools uses `availableForReinforcement = pool.available - reserveForSpawn`).
- **Pipeline order:** `phase-ii-recruitment` runs before `phase-ii-brigade-reinforcement` — correct; no change needed.
- **Caps favoring new brigades:** Optional scenario/state knobs (e.g. min pool reserved for spawn per mun, or cap on reinforcement draw per mun so spawn has headroom). No new mechanics required for first pass; tune via max_recruits and pool scale.

**Concrete steps:**

1. Raise scenario `max_recruits_per_faction_per_turn` (e.g. 2→3 or 4) for 52w historical runs.
2. Confirm reservedSpawnManpowerForReinforcement is used in reinforcement and that recruitment step runs with includeMandatory so pending OOB brigades retry.
3. If RS/HRHB still form too few brigades, consider RS/HRHB-specific recruit caps or pool scaling (Section 1) so more (mun, faction) pairs have enough pool for a new brigade.

---

## 6. Section 4 — All other issues from the 52w report

### P1

| Finding | Remediation | Owner |
|--------|-------------|--------|
| **centar_sarajevo anchor failed** | Investigate Sarajevo init_control, RS pressure on centar_sarajevo, RBiH garrison/AoR for Sarajevo-core muns; calibrate or document as known variance. Add centar_sarajevo RBiH to anchor list (Phase L added it for formal check). | Game Designer, Scenario-creator-runner-tester |
| **Phase II flips not in control_events** | Push Phase II attack-resolution flips to harness control_events (same ControlEvent shape) or add explicit “Phase II flips: N” in end_report and clarify that “Control events” = Phase I only. | Gameplay Programmer, Scenario-harness-engineer |
| **0 defender-present battles** | Use DEFENDER_PRESENT_BATTLES_DIAGNOSIS_2026_02_18.md; SCORE_DEFENDER_PRESENT_BONUS (100) in bot_brigade_ai; ensure AoR/garrison coverage so some front settlements have defender brigade in AoR. | Gameplay Programmer, Game Designer |

### P2

| Finding | Remediation | Owner |
|--------|-------------|--------|
| **RBiH bot benchmarks (hold_core_centers, preserve_survival_corridors)** | Recalibrate benchmark bands or balance so RBiH control share 0.39 aligns with expected 0.20/0.25 or adjust expectations. | Game Designer |
| **run_meta.out_dir when uniqueRunFolder** | Set run_meta.out_dir to actual run directory (e.g. w52_n10) when uniqueRunFolder is true. | Scenario-harness-engineer |
| **End-report “Control events” clarity** | Label “Phase I control-flip events (harness log)”; add “Phase II attack-resolution flips: N.” | Scenario-harness-engineer / scenario_end_report |

### P3

| Finding | Remediation | Owner |
|--------|-------------|--------|
| **Integerize run_summary counts** | Casualty and personnel totals in run_summary.json → integers for stable regression. | Systems Programmer |
| **66 vs 37 (control delta vs Phase II flips)** | In end_report, clarify: “66 = distinct settlements with controller change (initial→final)”; “37 = Phase II flip events applied.” | Documentation / end_report |

---

## 6a. Section 5 — Displacement

### 5.1 Settlement panel showing municipality total (e.g. Potkozarje 144,051)

**Observed:** Potkozarje is a **settlement** in Banja Luka **municipality**. The tactical map settlement panel shows "Population (Current): 144,051." That value is the **municipality-level** current population (Banja Luka total from `displacement_state[mun_id]`: original − displaced_out − lost + displaced_in), not a settlement-level figure.

**Cause:** `displacement_state` is keyed by municipality only. In `GameStateAdapter`, `displacementByMun` is built from `state.displacement_state` (mun_id → row). In `MapApp.getCurrentPopulationForFeature(feature)`, the map resolves the feature's municipality (`mun1990Id`) and returns `gs.displacementByMun[mun1990Id].currentPopulation` — so **every settlement in the same municipality** displays the same number (the municipal total).

**Remediation:**

- **Option A (minimal):** In the settlement panel and tooltip, change the label from "Population (Current)" to "Municipality population (current)" (or "Current pop (mun)") so users understand it is municipal, not settlement-level.
- **Option B (if data available):** If settlement-level population or a per-settlement share of municipal population exists (e.g. from census or derived), show settlement-level current population for the selected settlement and keep municipal total as a separate line. Today displacement_state has no settlement-level breakdown; adding it would require a data/schema decision and pipeline changes.

**Owner:** UI/UX Developer (label/copy); Gameplay Programmer if Option B (displacement_state or derived settlement-level data).

### 5.2 Displaced population only settles where faction's brigade is present

**User intent:** Displaced population should **only settle** (be added to `displaced_in` at a municipality) in municipalities where **that faction has at least one brigade present**. Until then, displaced persons are **abstract numbers** (e.g. in camps or an abstract pool), not "settled" in that mun.

**Current behaviour:** In `displacement_takeover` and `minority_flight` (and Phase I displacement routing in `displacement.ts`), displaced are routed to destination municipalities by distance/region rules and capacity; there is **no check** that the receiving faction has a brigade in that municipality. So `displaced_in` can increase in muns where the faction has no formation present.

**Proposed change:**

- **Gate:** When routing displaced to a destination municipality (adding to `displaced_in` / `displaced_in_by_faction`), allow routing **only** to municipalities where the **receiving faction** (for that stream of displaced) has at least one brigade (or formation) present — e.g. any formation with that faction whose `brigade_municipality_assignment` or AoR includes that mun, or equivalent.
- **Abstract pool:** Displaced that would otherwise route to a mun without a same-faction brigade remain in an abstract state (e.g. "in camp" or a separate pool) until a brigade is present there in a later turn, at which point they can be routed in (or a separate step "settles" them when a brigade enters). Exact semantics (camp vs abstract counter, and when/how they later "settle") need design.

**Design decisions:**

- Whether "brigade present" means brigade with that municipality in its assignment/AoR at the **start** of the displacement step or at the **end** of the turn.
- How to represent and display "abstract" displaced (camp totals, run_summary, map) without adding displaced_in to muns with no friendly brigade.
- Interaction with receiving capacity (getReceivingCapacityFraction) and existing routing order (distance, LARGE_URBAN_MUN_IDS overflow).

**Owner:** Game Designer (design: abstract pool vs camp, when to settle); Gameplay Programmer (displacement_takeover, minority_flight, and any Phase I displacement routing); Formation-expert if brigade presence definition touches AoR/assignment.

**References:** `src/state/displacement_takeover.ts`, `src/state/minority_flight.ts`, `src/state/displacement.ts`, `docs/20_engineering/DISPLACEMENT_CENSUS_SEEDING.md`; napkin "Displacement receiving cap," "Displacement routing redesign."

---

## 7. Stepwise implementation order

Suggested sequence (dependencies respected):

1. **Harness/reporting (low risk):**  
   - Phase II flips → control_events or end_report “Phase II flips: N”; clarify “Control events” as Phase I only.  
   - run_meta.out_dir when uniqueRunFolder.  
   - Integerize run_summary counts; end_report 66 vs 37 clarification.  
   → Unblocks clear interpretation of future runs.

2. **Calibration (manning + anchors):**  
   - RS/HRHB: adjust POOL_SCALE_FACTOR, FACTION_POOL_SCALE, max_recruits_per_faction_per_turn, RS mandatory accrual per Section 1 (with Game Designer + Formation-expert alignment).  
   - centar_sarajevo: investigation and scenario/pressure/garrison calibration.  
   - Defender-present: SCORE_DEFENDER_PRESENT_BONUS + AoR/garrison tuning.  
   → Re-run 52w and compare to historical bands and anchors.

3. **Movement (bot):**  
   - Add pipeline step for applyBrigadeMunicipalityOrders when orders present; implement bot issuance of brigade_mun_orders and/or brigade_movement_orders.  
   → Depends on design decision (which orders bot uses).

4. **Recruitment vs growth:**  
   - Raise max_recruits_per_faction_per_turn (scenario); verify reservedSpawnManpowerForReinforcement and recruitment order; optional per-faction or per-mun caps.  
   → Can overlap with step 2 calibration.

5. **Phase I consolidation (design then implementation):**  
   - Game Designer chooses Option A or B; Phase I/II spec updates; then pipeline/spec implementation.  
   → Depends on product priority and Phase I re-enable decision.

6. **Displacement:**  
   - **5.1 (display):** Relabel “Population (Current)” → “Municipality population (current)” (or add settlement-level display if data exists). Low risk; can be done early.  
   - **5.2 (settle only where brigade present):** Design (abstract pool vs camp, when to settle); then gate routing in displacement_takeover and minority_flight so displaced_in only increases in muns where that faction has a brigade present.  
   → 5.2 may affect run outcomes and displacement_state; add ledger entry and regression check.

---

## 8. Required docs and tests

- **Canon / phase specs:** Phase I Specification (if Option A), Phase II Specification (if Option B or defender-present/consolidation changes), Systems Manual §7.4 and recruitment/reinforcement.
- **Scenario files:** apr1992_definitive_52w (and 104w variant if used) for calibration; any new Phase I scenario if Option A.
- **Tests:** Determinism (ordering, no new RNG); run_summary schema if integerize; end_report wording; optional integration test for Phase II flips in control_events; displacement routing tests if 5.2 (brigade-present gate) is implemented.
- **Reference docs:** SCENARIO_FORCE_CALIBRATION (archived), napkin scenario calibration, ORCHESTRATOR_WHY_NO_PHASEI_CONSOLIDATION_AND_FEW_FLIPS_2026_02_14, DEFENDER_PRESENT_BATTLES_DIAGNOSIS_2026_02_18, PHASE_L_CALIBRATION_AND_TESTING_2026_02_18; displacement: DISPLACEMENT_CENSUS_SEEDING, napkin “Displacement receiving cap,” “Displacement routing redesign.”

---

## 9. Determinism and ledger

- **Ordering:** All new or changed steps must use deterministic sort order (faction, formation, settlement, etc.); no new randomness.
- **PROJECT_LEDGER:** Any behavior or output change (pipeline steps, reporting, calibration constants that change run outcomes) requires a PROJECT_LEDGER entry per awwv-ledger-entry skill.
- **Regression:** Integerized run_summary and clarified end_report improve regression stability; calibration changes may require 52w/104w hash or band checks.

---

## 10. References

- **Report:** `docs/40_reports/convenes/PARADOX_52W_FULL_TEAM_RUN_REPORT_2026_02_18_n10.md`
- **OOB / knowledge:**  
  - `docs/knowledge/VRS_ORDER_OF_BATTLE_MASTER.md`  
  - `docs/knowledge/ARBIH_ORDER_OF_BATTLE_MASTER.md`  
  - `docs/knowledge/HVO_ORDER_OF_BATTLE_MASTER.md`  
  - HVO/HRHB strength notes in same HVO master.
- **Phase I consolidation:** `docs/40_reports/convenes/ORCHESTRATOR_WHY_NO_PHASEI_CONSOLIDATION_AND_FEW_FLIPS_2026_02_14.md`
- **Calibration:** napkin “Scenario & pool calibration”; `docs/_old/40_reports/implemented_2026_02_15/SCENARIO_FORCE_CALIBRATION_2026_02_15.md`; `docs/40_reports/convenes/ORCHESTRATOR_104W_APR1992_RUN_AND_CALIBRATION_2026_02_17.md`; `docs/40_reports/convenes/PARADOX_104W_RESULTS_TEAM_ANALYSIS_2026_02_17.md`
- **Defender-present:** `docs/40_reports/convenes/DEFENDER_PRESENT_BATTLES_DIAGNOSIS_2026_02_18.md`
- **Phase L / anchors:** `docs/40_reports/convenes/PHASE_L_CALIBRATION_AND_TESTING_2026_02_18.md`
- **Displacement:** `docs/20_engineering/DISPLACEMENT_CENSUS_SEEDING.md`; napkin “Displacement receiving cap,” “Displacement routing redesign,” “Displacement ‘15,000’ population”
- **Napkin:** `.agent/napkin.md` (patterns, domain notes, formation constants)
