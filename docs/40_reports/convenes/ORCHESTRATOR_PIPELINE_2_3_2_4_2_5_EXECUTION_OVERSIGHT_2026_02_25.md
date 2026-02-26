# Orchestrator: Pipeline 2.3–2.5 Execution Oversight

**Date:** 2026-02-25  
**Plan:** Pipeline 2.3–2.5 (Phase I→II edge cases, Operation Storm, Scoring/evaluation)  
**Status:** Execution in progress — Orchestrator overseeing; implementer proceeds through all phases.

---

## 1. Authority and scope

- **Orchestrator** oversees execution: single priority (2.3 → 2.4 → 2.5), refactor-pass between each phase, Architect-decides-and-flags-for-review, final report and canon propagation. Orchestrator does not implement code.
- **Implementing owners:** Game Designer (design/canon); Gameplay Programmer (code/pipeline).
- **Plan reference:** Plan file at `c:\Users\User\.cursor\plans\pipeline_2.3–2.5_orchestrator_plan_78e014f7.plan.md` (or workspace copy if present). Execute in order: Phase 1 (2.3) → refactor-pass → Phase 2 (2.4) → refactor-pass → Phase 3 (2.5) → refactor-pass → Report + propagation.

---

## 2. Single priority and handoff

| Current priority | Phase 1: 2.3 Phase I→II edge cases |
|------------------|------------------------------------|
| **Next**         | Phase 2: 2.4 Operation Storm (after refactor-pass) |
| **Then**         | Phase 3: 2.5 Scoring/evaluation (after refactor-pass) |
| **Finally**      | Implementation report + canon propagation |

**Handoff to implementer:** Execute the plan from Phase 1 through Final. For each phase:
1. Implement per plan section.
2. Run **refactor-pass** (review changes, remove dead code, simplify; `npx tsc --noEmit`, `npm run test:vitest` or `vitest run`).
3. Document any **Architect decisions** (e.g. force vs offer for stuck-in-Phase-I, Storm thresholds, scoring formula vs criteria-only) and flag for user review in deliverable or PROJECT_LEDGER.
4. Proceed to next phase; do not stop until all phases and final report/propagation are done.

---

## 3. Process rules

- **Napkin:** Read `.agent/napkin.md` at session start; update after significant changes.
- **Canon:** No FORAWWV edits. Canon changes (Phase II Spec, Systems Manual, WAR_TERMINATION_MINIMAL_SPEC) per plan; Architect sign-off only where plan says so.
- **Determinism:** All new logic must be deterministic (no RNG, no timestamps; stable ordering).
- **Decisions needing user input:** Architect decides and adds a "Decisions for review" note (deliverable or PROJECT_LEDGER).

---

## 4. Deliverables (from plan)

- **Phase 1:** Code (entrenchment init at transition, stuck-in-Phase-I fallback, player message); implementation note in Phase II Spec §6 or PHASE_I_II_EDGE_CASES.md.
- **Phase 2:** Canon subsection (Phase II Spec §11.3 or under §11.2); pipeline step phase-ii-operation-storm-check; Architect flags for thresholds.
- **Phase 3:** WAR_TERMINATION_MINIMAL_SPEC §8 + Phase II §11.2.4 minimal criteria; optional scoring wiring if Architect approves.
- **Final:** `docs/40_reports/implemented/YYYYMMDD_PIPELINE_2_3_2_4_2_5_EDGE_CASES_OPERATION_STORM_SCORING.md`; CONSOLIDATED_IMPLEMENTED §46; context.md; backlog 2.3/2.4/2.5 marked done; PROJECT_LEDGER; napkin Session Notes.

---

## 5. Continuity

When execution completes, update this memo §6 Status to "Complete" and add report path and ledger date. Orchestrator will treat the plan as complete when the implementation report exists and propagation is recorded in PROJECT_LEDGER.

---

## 6. Status

**Status:** Complete. Implementation report at docs/40_reports/implemented/20260225_PIPELINE_2_3_2_4_2_5_EDGE_CASES_OPERATION_STORM_SCORING.md; propagation recorded in PROJECT_LEDGER 2026-02-25. Verification: `npx tsc --noEmit` and `npm run test:vitest -- --run` (158 passed, 13 skipped). Architect decisions flagged in report and ledger for user review.
**Next step:** —
