# Orchestrator: Scenario handoff decisions (closure)

**Date:** 2026-02-13  
**Scope:** Close the three open questions from `ORCHESTRATOR_SCENARIO_RUNS_HANDOFF_2026_02_13.md`.

---

## Decision 1: Why `apr1992_phase_ii_4w` had 0 flips

- **Resolved:** 0 flips in the current canonical run are due to **no attack orders being processed**, not defender-favored outcomes.
- **Evidence:** `runs/apr1992_phase_ii_4w__e9030069f8c5c321__w4/run_summary.json` has:
  - `phase_ii_attack_resolution.orders_processed = 0`
  - `phase_ii_attack_resolution.flips_applied = 0`
  - `phase_ii_attack_resolution.weeks_with_phase_ii = 4`
- **Implication:** The immediate diagnostic focus is order generation calibration/criteria, not battle resolution casualty/flip tuning.

---

## Decision 2: Why formation counts changed from 274 to 55

- **Resolved:** The 55 total formations in the current run come from the current `player_choice` OOB path, which recruits a constrained subset at scenario start.
- **Evidence in code path:**
  - In `src/scenario/scenario_runner.ts`, `createOobFormations()` branches on `scenario.recruitment_mode === "player_choice"` and calls `runBotRecruitment(...)` instead of full OOB auto-spawn.
  - `data/scenarios/apr1992_phase_ii_4w.json` sets `"recruitment_mode": "player_choice"` and `"init_formations_oob": true`.
- **Run evidence:**
  - Older run (`60c803...`) `formation_delta.json` shows `brigade: 253` (+ 21 corps assets) -> ~274 formations.
  - Current run (`e90300...`) `formation_delta.json` shows `brigade: 34` (+ 21 corps assets) -> 55 formations.
- **Interpretation:** The two counts are from **different initialization behavior across revisions**, not nondeterministic drift inside one revision.

---

## Decision 3: `disable_phase_i_control_flip` semantics

- **Resolved:** Keep current semantics: `disable_phase_i_control_flip: true` means **military-action-only** control resolution in Phase I, not strict zero flips.
- **Evidence:**
  - Existing scenario output (`player_choice_recruitment_no_flip_4w`) shows flips under this mode and is consistent with the current code path.
  - Engineering checklist already states this semantic contract (`docs/20_engineering/PHASEI_NOFLIP_SCENARIO_AUTHOR_CHECKLIST.md`).
- **Action:** Align wording and naming across docs/tests so this behavior is explicit and non-ambiguous.

---

## Phase A closure status

- Open question #1 (0 flips vs attack outcomes): **Closed**
- Open question #2 (55 vs 274 formations): **Closed**
- Open question #3 (no-flip semantics): **Closed**

## Carry-forward items to next phases

1. Add explicit regression tests for military-action-only semantics and run-summary attack-resolution diagnostics.
2. Update stale documentation language that implies strict zero-flip behavior for `disable_phase_i_control_flip`.
3. Keep future comparisons pinned to run IDs and code revision context to avoid cross-revision count confusion.
