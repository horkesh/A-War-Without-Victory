# Pipeline 2.3–2.4–2.5: Edge Cases, Operation Storm, Scoring

**Date:** 2026-02-25  
**Plan:** [pipeline_2.3–2.5_orchestrator_plan_78e014f7.plan.md](c:\Users\User\.cursor\plans\pipeline_2.3–2.5_orchestrator_plan_78e014f7.plan.md)  
**Oversight:** [ORCHESTRATOR_PIPELINE_2_3_2_4_2_5_EXECUTION_OVERSIGHT_2026_02_25.md](../convenes/ORCHESTRATOR_PIPELINE_2_3_2_4_2_5_EXECUTION_OVERSIGHT_2026_02_25.md)

---

## Summary

Implemented pipeline items **2.3** (Phase I→II edge cases), **2.4** (Operation Storm canon + pipeline step), and **2.5** (scoring/evaluation minimal criteria) with refactor-pass and tsc/vitest after each phase.

---

## 2.3 Phase I→II edge cases

- **Entrenchment init:** `state.meta.phase_ii_entrenchment_init_turns` set from scenario when building initial state (scenario_runner.ts after osid_control_overrides). Scenario types and loader: `phase_ii_entrenchment_init_turns` (0..12), `phase_i_force_transition_after_turns` (1..104). In `applyPhaseIToPhaseIITransition`, after `initializeCorpsCommand`, all brigades/OGs get `entrenchment_turns = min(meta.phase_ii_entrenchment_init_turns ?? 0, MAX_ENTRENCHMENT)` (stable formation ID order).
- **Stuck-in-Phase-I:** Force transition after N Phase I turns (N = scenario.phase_i_force_transition_after_turns ?? 52 for phase_0/phase_i starts). No UI choice; force applied automatically when `turn >= war_start_turn + N` and transition not otherwise eligible. Implemented in turn_pipeline Phase I path and run_phase_i_browser. `applyPhaseIToPhaseIITransition` accepts `options.forceTransition`.
- **Player message:** When run ends in phase_i, run_summary includes `phase_i_note`: message "Opposing control edges have not yet persisted long enough", `streak`, `required_streak: 4`.

**Files changed:** src/scenario/scenario_runner.ts, src/scenario/scenario_loader.ts, src/scenario/scenario_types.ts, src/state/game_state.ts, src/sim/phase_transitions/phase_i_to_phase_ii.ts, src/sim/turn_pipeline.ts, src/sim/run_phase_i_browser.ts, docs/30_planning/PHASE_I_II_EDGE_CASES.md, docs/10_canon/Phase_II_Specification_v0_5_0.md (§6 implementation-notes).

**Architect decisions for review:** (1) Stuck-in-Phase-I: **force transition only** (no "offer player choice"); N default 52; scenario can override via phase_i_force_transition_after_turns. (2) Entrenchment init: applied to brigade and operational_group/og; default 0 when scenario omits parameter.

---

## 2.4 Operation Storm

- **Canon:** Phase II Spec §11.3 added, referencing [OPERATION_STORM_DESIGN.md](../../30_planning/OPERATION_STORM_DESIGN.md). Conditions: Washington active, RS territorial share, exhaustion, IVP. Effects: state.meta.operation_storm_triggered.
- **Pipeline:** New step **phase-ii-operation-storm-check** after phase-ii-washington-check. Module src/sim/phase_ii/operation_storm.ts: `evaluateOperationStormPreconditions`, `checkAndApplyOperationStorm`; report on context.report.phase_ii_operation_storm_check.

**Files changed:** docs/10_canon/Phase_II_Specification_v0_5_0.md (§11.3), docs/30_planning/OPERATION_STORM_DESIGN.md (implementation note), src/sim/phase_ii/operation_storm.ts (new), src/state/game_state.ts (meta.operation_storm_triggered), src/sim/turn_pipeline.ts (import, TurnReport, phase step).

**Architect decisions for review:** Thresholds: STORM_RS_THREAT_SHARE = 0.35, STORM_COMBINED_EXHAUSTION = 60, STORM_IVP_MOMENTUM = 0.55. All preconditions AND (Washington signed, RS share ≥ threshold, combined RBiH+HRHB exhaustion ≥ threshold, IVP ≥ threshold). Flag for user review; Historian can refine from BB1 Oluja pages.

---

## 2.5 Scoring / evaluation

- **WAR_TERMINATION_MINIMAL_SPEC.md §8:** Added minimal evaluation criteria paragraph: four criteria (territory, population preserved, exhaustion, treaty terms) canonical for end-game display and timeout/stalemate branch; formula TBD; Architect to decide numeric formula vs criteria-only.
- **Phase II Spec §11.2.4:** Explicit reference to WAR_TERMINATION_MINIMAL_SPEC §8 and note that exact scoring formula TBD; Architect to decide.

**Files changed:** docs/30_planning/WAR_TERMINATION_MINIMAL_SPEC.md (§8), docs/10_canon/Phase_II_Specification_v0_5_0.md (§11.2.4).

**Architect decisions for review:** No numeric formula added; criteria-only for now. Flag for review whether to add weighted sum or leave to UI.

---

## Refactor-pass and tests

- After 2.3: tsc --noEmit OK; vitest run 158 passed, 13 skipped. FormationState.equipment_class added (game_state.ts) and faction_progression.ts updated for type safety (pre-existing alignment).
- After 2.4 and 2.5: tsc and vitest unchanged; all tests pass.

---

## Propagation

- CONSOLIDATED_IMPLEMENTED §46 (this report).
- context.md: one sentence under Implementation references.
- Backlog 20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md: 2.3, 2.4, 2.5 marked done with report reference.
- PROJECT_LEDGER: entry appended (three items, report path, Architect flags).
- .agent/napkin.md: Session Notes with completion date and one-line summary.

---

## Architect decisions for user review

| Item | Decision | Flag |
|------|----------|------|
| Stuck-in-Phase-I | Force transition after N turns (N=52 default or scenario); no UI "offer choice" | Review if player choice desired |
| Operation Storm thresholds | RS share 0.35, combined exhaustion 60, IVP 0.55 | Review for tuning |
| Scoring formula | Criteria-only in spec; no numeric formula | Review if weighted sum needed for timeout branch |
