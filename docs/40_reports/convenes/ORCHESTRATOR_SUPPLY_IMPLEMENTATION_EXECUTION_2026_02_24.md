# Orchestrator: Supply Implementation Plan — Execution Kickoff

**Date:** 2026-02-24  
**Plan:** [docs/30_planning/SUPPLY_IMPLEMENTATION_PLAN.md](../../30_planning/SUPPLY_IMPLEMENTATION_PLAN.md)  
**Status:** Full run in progress — Phases 1→2→3→4→5 with refactor-pass between each; PM sequences 2 vs 3 after Phase 1.

---

## 1. Big picture

- The **Supply Design Implementation Plan** is now in the repo at `docs/30_planning/SUPPLY_IMPLEMENTATION_PLAN.md`.
- Execution has **not yet started**; this memo sets the single priority and handoffs so the next session or implementer can execute with clear direction.
- **Single priority:** **Phase 1** of the Supply Implementation Plan (OSID supply trace + supply_mult in combat).

---

## 2. Single priority and owners

| Item | Assignment |
|------|------------|
| **Current priority** | Phase 1: OSID supply trace + supply_mult in combat |
| **Primary owners (Phase 1)** | Gameplay Programmer (implementation), Technical Architect (report shape, pipeline contract), Systems Programmer (determinism) |
| **Scope** | Per plan §1.1–§1.6: OSID supply reachability and report extension, where to run OSID supply (Option A/B per Architect), wiring `getSupplyMult` in attack_resolution_osid and combat_predictor, tests and determinism, canon/docs, then **refactor-pass** |

---

## 3. Handoffs and sequencing

- **After Phase 1** is complete and **refactor-pass** is done (per refactor-pass skill: review changes, remove dead code, straighten logic, run `tsc --noEmit` and `vitest run`), **Product Manager** sequences:
  - **Phase 2** (corridor cascade) vs **Phase 3** (min supply UX) — plan allows either order; Phase 3 does not depend on Phase 2.
  - Then **Phase 4** (enclave resilience/hardening).
  - Then **Phase 5** (bot supply awareness).
- **Refactor-pass runs between each phase** (after Phase 1, 2, 3, 4, and 5) before starting the next.
- Phases 4 and 5 are **in scope** (not optional).

---

## 4. Process

- **Napkin and canon** apply; read `.agent/napkin.md` at session start and update as work proceeds.
- **Canon changes** require **Technical Architect** sign-off (Phase 4 also requires **Game Designer** sign-off).
- **Architect decisions** (e.g. Option A vs B for OSID step placement, same-turn vs next-turn cascade, recompute vs cache for UI report): Architect makes the call and **flags for user review** (e.g. "Decisions for review" in phase deliverable or PROJECT_LEDGER).
- **Process QA** may be invoked after Phase 1 (or any phase) deliverable to validate that process was followed; optional at Orchestrator discretion.

---

## 5. Recorded for continuity

| Item | Value |
|------|--------|
| **Plan location** | docs/30_planning/SUPPLY_IMPLEMENTATION_PLAN.md |
| **Current priority** | Phase 1 |
| **Refactor-pass** | Between each phase (after 1, 2, 3, 4, 5) |
| **Decision rule** | Architect decides; flag for user review |
| **Next step for team** | Execute Phase 1 per plan §1.1–§1.6; then refactor-pass; then report back for Phase 2/3 sequencing (PM). |

---

## 6. Next step (actionable)

**For implementers / next session:** Execute **Phase 1** per plan sections 1.1–1.6. On completion, run **refactor-pass** (refactor-pass skill), then report back so **PM** can sequence Phase 2 vs Phase 3 and continue through Phase 4 and Phase 5 with refactor-pass between each.

---

## 7. PM sequencing and full-run handoff (2026-02-24)

**Phase 2 vs Phase 3 order:** **Phase 2 then Phase 3.** Rationale: Lock cascade semantics (Adequate→Strained→Critical, next-turn visibility, dependency threshold) before building UX, so the supply panel and any map layer display a stable, canonical model and avoid rework when cascade rules are formalized.

**Full run scope for this execution:** All five phases are in scope: Phase 1 (OSID supply trace + supply_mult in combat), Phase 2 (corridor collapse and cascade), Phase 3 (minimum viable supply UX), Phase 4 (enclave resilience and hardening), Phase 5 (bot supply awareness). Phases 4 and 5 are not optional. A **refactor-pass** runs after each phase (after Phase 1, 2, 3, 4, and 5) before starting the next.

**Handoff to implementing agent:** Execute Phase 1 per plan §1.1–§1.6; then refactor-pass; then Phase 2 (cascade); refactor-pass; then Phase 3 (supply UX); refactor-pass; then Phase 4 (enclave resilience/hardening); refactor-pass; then Phase 5 (bot supply awareness); refactor-pass. Use SUPPLY_IMPLEMENTATION_PLAN.md and SUPPLY_DESIGN.md as authority. Architect decisions (e.g. Option A vs B for OSID step placement, same-turn vs next-turn cascade, recompute vs cache for supply report in UI) are made by Architect but must be flagged for user review.

**Ledger/memo note (for continuity):** *Supply full run: Phases 1→2→3→4→5 with refactor-pass between each; PM sequence 2 vs 3 after Phase 1; execution in progress.* **Next step:** Implementing agent begins Phase 1 and proceeds through all phases until done.
