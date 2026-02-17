# Paradox convene: 104-week run — team analysis and calibration / system-change proposals

**Date:** 2026-02-17  
**Convened by:** Orchestrator  
**Trigger:** User request to gather the team, analyze 104w April 1992 canon run results, and propose solutions for calibration or change of game systems.  
**Evidence:** [ORCHESTRATOR_104W_APR1992_RUN_AND_CALIBRATION_2026_02_17.md](ORCHESTRATOR_104W_APR1992_RUN_AND_CALIBRATION_2026_02_17.md) §6 (run folder `runs/apr1992_definitive_52w__3daa0c50f29af5d0__w104_n117`).

---

## 1. Goal of this convene

- **Analyze** the completed 104-week canon run (troop strength, brigades, control, bot behavior, benchmarks).
- **Propose** concrete options: **calibration-only** (tune existing levers) vs **game-system changes** (new or modified mechanics), with role ownership and risks.
- **Single priority** for follow-up: one or more actionable next steps (scenario variant, code constants, or design/canon change) so the next 104w run can be evaluated against the same historical bands.

---

## 2. Evidence summary (104w run)

| Dimension | Observation |
|-----------|-------------|
| **Troop strength (final)** | RBiH 67,626 (+14,684); RS 37,088 (+629); HRHB 19,856 (+3,131). All **below** Sept 1992 band (RBiH ~85–105k, RS ~85–95k, HRHB ~40–45k). Run ends Apr 1994. |
| **Brigades** | Initial 24/70/62 (HRHB/RBiH/RS), final 25/70/64. Only +3 formations over 104 weeks. |
| **Scenario path** | `apr1992_definitive_52w` with `recruitment_mode: "player_choice"` → runBotRecruitment at init → subset of OOB (156 mandatory, many skipped); lower starting personnel than full-OOB scenario. |
| **Phase II combat** | 2,265 orders, 404 flips, 1,231 defender-present battles; activity front-loaded (most flips in first ~25 weeks), then stable fronts. |
| **Control** | Net: RBiH +81, RS −50, HRHB −31 settlements. Anchors all passed. |
| **Bot benchmarks** | 4/6 passed. **2 failed:** RBiH `hold_core_centers` (actual 41.1% vs expected 20%), RBiH `preserve_survival_corridors` (actual 40.9% vs expected 25%) — RBiH held *more* than benchmark expected. |

---

## 3. Per-role questions and input

### 3.1 Scenario Creator / Runner and Tester

- **Question:** For a 104-week run ending April 1994, are end-state personnel (67k / 37k / 20k) and control deltas historically plausible, or should we treat “below Sept 1992 band” as a design failure for long runs?
- **Input (synthesized):** Historical bands are for Sept / Dec 1992; 104w extends to 1994. Plausibility depends on design intent: (a) “Match Sept 1992 by week 52” vs (b) “Grow toward 1994 scale by week 104.” Current run is below band at all horizons; flag as **below band** and recommend calibration or scenario path change if goal is historical troop envelopes.

### 3.2 Formation Expert

- **Question:** Why does RS grow so little (+629 personnel, +2 brigades) over 104 weeks? Is the bottleneck pool size, mandatory accrual cap, equipment/capital, or something else?
- **Input (synthesized):** Known levers: **POOL_SCALE_FACTOR** (55) and **FACTION_POOL_SCALE** (RBiH 1.20, RS 1.05, HRHB 1.60) in `src/sim/phase_i/pool_population.ts`; scenario `recruitment_capital`, `equipment_points`, `*_trickle`, `max_recruits_per_faction_per_turn` (2 in definitive). RS already has **RS-only mandatory mobilization accrual** (80 manpower/turn) for pending mandatory brigades; over 104w that may still be insufficient if pool ceiling is low or many muns are manpower-starved. Proposals: (1) Raise RS FACTION_POOL_SCALE or scenario trickle for long runs; (2) Increase RS mandatory accrual budget; (3) Audit pool availability per (mun, faction) in final state to confirm bottleneck.

### 3.3 Game Designer

- **Question:** Should RBiH “hold more core/corridor than benchmark” be treated as (a) benchmark expectations too low (update numbers), (b) RBiH defensive success (leave as-is, document), or (c) sign that RS/HRHB are underperforming?
- **Input (synthesized):** Benchmarks in `src/sim/bot/bot_strategy.ts`: RBiH `hold_core_centers` expected 0.2 ± 0.1, `preserve_survival_corridors` 0.25 ± 0.12. Actual ~41% each. Options: **Calibration:** Bump RBiH expected_control_share to 0.35–0.45 and/or tolerance so “RBiH holds core well” is pass. **System:** Keep benchmarks as “minimum survival” and treat over-performance as success; or add a “RBiH over-hold” benchmark band. Designer should decide whether 41% is intended “good” outcome or benchmark definitions are stale.

### 3.4 Gameplay Programmer

- **Question:** What is the minimal set of code/scenario changes to get 104w end-state personnel into or near Sept 1992 band without breaking 52w or determinism?
- **Input (synthesized):** (1) **Scenario-only:** New 104w scenario variant with higher `recruitment_capital_trickle`, `equipment_points_trickle`, and/or `max_recruits_per_faction_per_turn` (e.g. 3–4) so more brigades recruit and reinforce. (2) **Code constants:** Raise POOL_SCALE_FACTOR or FACTION_POOL_SCALE (e.g. RS 1.05 → 1.15) in pool_population.ts — affects all scenarios using pool population. (3) **RS accrual:** Increase RS mandatory mobilization budget in recruitment_turn.ts (e.g. 80 → 120/turn) for long runs. (4) **Full-OOB path:** Use a scenario without `recruitment_mode: "player_choice"` (e.g. apr1992_historical_52w with weeks: 104) for “historical troop count” 104w runs; leaves player_choice for desktop/player recruitment play. Determinism: all levers must remain deterministic (no new RNG, stable sort order).

### 3.5 Systems Programmer / Technical Architect

- **Question:** Are there any system-level changes (e.g. time-varying pool refill, long-run reinforcement caps, or “phase” boundaries at 52w) that would better support 104w historical fidelity without undermining 52w or engine invariants?
- **Input (synthesized):** Current design: fixed pool scale and trickle; no explicit “phase” at 52w. **Possible system changes:** (a) **Scenario-level time bands:** e.g. different trickle or cap after week 52 (requires scenario/runner support for time-dependent resources). (b) **Reinforcement ceiling:** cap or taper reinforcement per brigade to avoid unbounded growth (would need canon/design spec). (c) **No change:** keep systems as-is and rely on calibration (scenario + constants). Prefer calibration first; system change only if design explicitly asks for time-dependent or cap mechanics.

### 3.6 Product Manager

- **Question:** What is the single priority for the next sprint: calibration only, or one system-change spike (e.g. time-dependent trickle or benchmark update)?
- **Input (synthesized):** Recommend **calibration-first:** (1) Add a **104w historical-fidelity scenario variant** (e.g. `apr1992_definitive_104w_historical` or reuse full-OOB path with 104 weeks) and document “use this for troop-count validation.” (2) Optionally bump **scenario** trickle/caps for 104w only. (3) Update **bot benchmarks** (RBiH expected shares or tolerances) per Game Designer. Defer system changes (time-varying pool, reinforcement caps) until design/canon requests them.

---

## 4. Synthesis: root causes and agreement

- **Troop strength below band:** Driven by (a) **player_choice** init path (subset OOB, lower start), and (b) **limited growth** over 104w (trickle/caps/pool ceiling). RS growth is disproportionately low (pool/accrual bottleneck).
- **Bot benchmarks (RBiH):** RBiH over-held vs current benchmark numbers; team can either update expectations (calibration) or treat as “survival success” (document only).
- **Front stabilization:** Most flips in first ~25 weeks; later weeks orders but few flips. Acceptable as “stable front” outcome unless design wants breakthrough/attrition systems (out of scope for this convene).

---

## 5. Proposed solutions

### 5.1 Calibration-only (recommended first)

| # | Proposal | Owner | Risk | Verification |
|---|----------|--------|------|----------------|
| **C1** | **104w historical scenario path:** Create or designate a 104w scenario that targets historical troop bands: either (a) use **full-OOB init** (no player_choice) for 104w so start is ~96k/74k/31k and growth is reinforcement-only, or (b) keep player_choice but **raise scenario** `recruitment_capital_trickle`, `equipment_points_trickle`, `max_recruits_per_faction_per_turn` (e.g. 4) and optionally initial capital/equipment for 104w only. | Scenario Creator + Gameplay Programmer | Low. (a) may over-shoot bands at 104w; (b) keeps desktop scenario unchanged. | Re-run 104w, compare `historical_alignment.final` to Sept/Dec 1992 bands. |
| **C2** | **RS long-run growth:** Increase RS mandatory mobilization accrual (e.g. 80 → 120 per turn) in `recruitment_turn.ts` and/or raise RS `FACTION_POOL_SCALE` (e.g. 1.05 → 1.12) in `pool_population.ts` so RS personnel grow more over 104w. | Formation Expert / Gameplay Programmer | Medium. Affects all scenarios; may need 52w regression check. | 104w run RS final personnel closer to 85k band; 52w run hash or personnel within tolerance. |
| **C3** | **Bot benchmarks (RBiH):** Update RBiH benchmark expected_control_share in `bot_strategy.ts`: e.g. `hold_core_centers` 0.2 → 0.38, `preserve_survival_corridors` 0.25 → 0.40, or widen tolerances so 41% passes. | Game Designer + Gameplay Programmer | Low. Purely benchmark definition. | Bot benchmark evaluation 6/6 pass on same 104w run (or new run). |
| **C4** | **Scenario trickle (104w-only):** In `apr1992_definitive_104w.json`, set higher `recruitment_capital_trickle` and `equipment_points_trickle` (e.g. +50% vs 52w) so long runs accumulate more resources; keep 52w scenario unchanged. | Scenario Creator | Low. Isolated to 104w scenario. | 104w run personnel and brigade deltas increase. |

### 5.2 Game-system changes (if design/canon requests)

| # | Proposal | Owner | Risk | Note |
|---|----------|--------|------|------|
| **S1** | **Time-dependent resources:** Allow scenario or runner to define trickle/caps that change by time band (e.g. after week 52). | Gameplay Programmer + Tech Architect | Medium. New scenario schema and runner logic; determinism must be preserved. | Only if design explicitly wants “phase 2” economy for long runs. |
| **S2** | **Reinforcement / personnel cap:** Cap or taper per-brigade or per-faction personnel growth (e.g. ceiling per brigade, or exhaustion-linked). | Game Designer + Gameplay Programmer | High. Touches Phase II reinforcement and possibly combat; requires canon/spec. | Defer unless canon specifies long-run personnel bounds. |
| **S3** | **Benchmark bands instead of point targets:** Replace expected_control_share ± tolerance with min/max band so “RBiH holds 35–45%” is pass. | Gameplay Programmer | Low. Bot benchmark eval logic change. | Improves robustness to run variance. |

---

## 6. Single priority and handoffs

- **Single priority:** **Implement C1 + C3** (104w historical scenario path or scenario trickle bump, and RBiH benchmark update). C2 (RS growth) can follow if C1 alone does not bring RS into band.
- **Handoffs:**
  - **Orchestrator → Game Designer:** Confirm RBiH benchmark interpretation (update numbers vs document success) and sign-off on C3.
  - **Orchestrator → Scenario Creator / Gameplay Programmer:** Implement C1 (scenario variant or 104w-only trickle) and C3 (benchmark constants); run 52w regression and one 104w validation run.
  - **Formation Expert:** If C1 is “full-OOB 104w,” no change. If C1 is “player_choice + higher trickle,” advise on C2 (RS accrual or FACTION_POOL_SCALE) if RS still below band after C1.
- **Documentation:** Update [ORCHESTRATOR_104W_APR1992_RUN_AND_CALIBRATION_2026_02_17.md](ORCHESTRATOR_104W_APR1992_RUN_AND_CALIBRATION_2026_02_17.md) with “Calibrations applied” and re-run results once C1/C3 (and optionally C2) are done. Ledger entry when behavior or scenario data changes.

---

## 7. Execution update (engine-only, implemented 2026-02-17)

Per user direction ("do not tweak scenarios"), calibration was implemented in engine code only:

- `src/sim/phase_i/pool_population.ts`: `POOL_SCALE_FACTOR 55 -> 65`, `FACTION_POOL_SCALE.RS 1.05 -> 1.15`.
- `src/state/formation_constants.ts`: `REINFORCEMENT_RATE 200 -> 260`, `COMBAT_REINFORCEMENT_RATE 100 -> 130`.
- `src/sim/recruitment_turn.ts`: `RS_MANDATORY_MOBILIZATION_PER_TURN 80 -> 120`.
- `src/sim/phase_ii/battle_resolution.ts`: thresholds/casualty calibration (`ATTACKER_VICTORY_THRESHOLD 1.3 -> 1.2`, `STALEMATE_LOWER_BOUND 0.8 -> 0.7`, `BASE_CASUALTY_PER_INTENSITY 20 -> 35`, `MIN_CASUALTIES_PER_BATTLE 5 -> 10`, `UNDEFENDED_DEFENDER_CASUALTY_SCALE 0.2 -> 0.4`, intensity divisor `500 -> 400`).

Validation reruns:

- **52w calibrated** (`...w52_n119`): personnel final 76,954 / 48,711 / 24,114 (RBiH/RS/HRHB), brigades 74 / 71 / 28, flips 516, casualties 5,050 / 3,024 (att/def).
- **104w calibrated** (`...w104_n120`): personnel final 75,530 / 48,641 / 24,114, brigades 74 / 71 / 28, flips 557, casualties 7,234 / 4,120.
- **Comparison vs baseline 104w n117:** flips +153 (404 -> 557), first-year casualties +3,152 total (4,922 -> 8,074), RBiH casualties +1,686 and RS casualties +1,251 by final casualty ledger.

Open issue: casualty volume is still below the target scale ("thousands to tens of thousands per army in first year"), especially HRHB; further combat-intensity or force-availability calibration is still required.

## 8. References

- ORCHESTRATOR_104W_APR1992_RUN_AND_CALIBRATION_2026_02_17.md (§6 results)
- PARADOX_HISTORICAL_TROOP_NUMBERS_SEPT1992_CONVENE.md
- ORCHESTRATOR_52W_REGRESSION_ANALYSIS_2026_02_14.md (player_choice vs full OOB)
- `src/sim/phase_i/pool_population.ts` (POOL_SCALE_FACTOR, FACTION_POOL_SCALE)
- `src/sim/bot/bot_strategy.ts` (benchmarks)
- napkin: Scenario & pool calibration, Canon April 1992 scenario, 104w canon run
