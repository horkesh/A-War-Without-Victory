# Phase I → Phase II Edge Cases (Planning)

Design for two edge cases: **stuck-in-Phase-I** (transition never fires) and **entrenchment init** (first turns of Phase II). Optional scenario parameter for entrenchment init is documented in Phase II Spec §4 and §6; implementation may set `state.meta.phase_ii_entrenchment_init_turns` at load so the transition can read it.

---

## 1. Stuck-in-Phase-I

### Definition

**Stuck-in-Phase-I** occurs when the game remains in Phase I indefinitely because the state-driven transition rule (Phase II Spec §6) is never satisfied. Specifically:

- **meta.phase** remains **"phase_i"**, and
- At least one of the following fails for every turn:
  - **JNA transition complete:** phase_i_jna.transition_begun, withdrawal_progress ≥ 0.95, asset_transfer_rs ≥ 0.9
  - **Front-precursor persistence:** opposing-control adjacency edge count ≥ MIN_OPPOSING_EDGES (25) for **PERSIST_TURNS** (4) consecutive turns (meta.phase_i_opposing_edges_streak ≥ 4)
  - referendum_held, war_start_turn defined, meta.turn ≥ war_start_turn

So “stuck” = transition never fires because the front-precursor condition (or JNA completion) is never met.

**Historical context (for narrative only):** 1992 was fluid; 1993 saw consolidation; 1994 Washington and stable fronts. Washington Agreement acts as a political precondition for mid-war; the transition rule is a gameplay abstraction of “sustained opposing fronts” rather than a fixed date.

### Time-based fallback (design)

To avoid infinite Phase I in edge-case scenarios:

- **Option:** After **N** Phase I turns (e.g. N = 52 or scenario-defined) without transition, the pipeline may **force transition** to Phase II or **offer a player choice** (e.g. “Force Mid-War phase?”). Exact N and UI are implementation details; the spec allows a fallback to be added as an implementation-note without changing the normative state-driven rule.
- **Determinism:** If a time-based fallback is implemented, it must be deterministic (e.g. same N, same scenario flag) so that reproducibility is preserved.

### Player-facing explanation

When the game is still in Phase I and the player might expect Phase II:

- **Explanation:** The UI or report should explain that the game remains in Phase I because **“Opposing control edges have not yet persisted long enough”** (or equivalent), i.e. the number of opposing-control edges has not reached MIN_OPPOSING_EDGES (25) for PERSIST_TURNS (4) consecutive turns, and/or JNA transition is not complete.
- Optional: show current **phase_i_opposing_edges_streak** and required **PERSIST_TURNS** so the player understands progress (e.g. “3 of 4 turns with sufficient fronts”).

---

## 2. Entrenchment init (policy)

### Policy

- **Default:** Brigades entering Phase II via the transition start with **entrenchment_turns === 0** (weak first turns). This is **accepted as design**: formations have not had time to dig in.
- **Optional scenario parameter:** **phase_ii_entrenchment_init_turns** (0..12). When set, at Phase I→II transition every brigade receives that many entrenchment turns (capped by MAX_ENTRENCHMENT, e.g. 12). Implementation can set **state.meta.phase_ii_entrenchment_init_turns** at scenario load so that **applyPhaseIToPhaseIITransition** (or the pipeline step that runs it) can read the value and apply it to all formations. If omitted, default is 0.

### Scenario schema

When the parameter is used, it is part of the scenario definition (see Phase II Spec §4, §6). Schema: **phase_ii_entrenchment_init_turns?: number** (optional; integer 0..12; default 0). Documented in Phase II Spec and in scenario type/docs.

### Implementation note

Implementation may: (1) add **phase_ii_entrenchment_init_turns** to the scenario schema and load it into **state.meta** at init so the transition step can read it; (2) in **applyPhaseIToPhaseIITransition** (or immediately after), set **formation.entrenchment_turns = min(meta.phase_ii_entrenchment_init_turns ?? 0, MAX_ENTRENCHMENT)** for each brigade. This is a small, optional code change; design is complete with docs and schema only if implementation is deferred.

**Implemented (Pipeline 2.3, 2026-02-25):** Scenario loader parses `phase_ii_entrenchment_init_turns` (0..12) and `phase_i_force_transition_after_turns` (1..104). Scenario runner sets `state.meta.phase_ii_entrenchment_init_turns` and `state.meta.phase_i_force_transition_after_turns` (default 52 for phase_0/phase_i starts) when building initial state. `applyPhaseIToPhaseIITransition` applies entrenchment init to all brigades/OGs and accepts `options.forceTransition` for stuck-in-Phase-I. Pipeline and browser Phase I path force transition when `turn >= war_start_turn + phase_i_force_transition_after_turns` and transition not otherwise eligible. run_summary includes `phase_i_note` (message, streak, required_streak) when final phase is phase_i. See implementation report docs/40_reports/implemented/20260225_PIPELINE_2_3_2_4_2_5_EDGE_CASES_OPERATION_STORM_SCORING.md.
