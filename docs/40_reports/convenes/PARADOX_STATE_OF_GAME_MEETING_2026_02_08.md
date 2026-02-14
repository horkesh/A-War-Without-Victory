# Paradox Team Meeting — State of the Game (Second Convening)

**Convened by:** Orchestrator  
**Date:** 2026-02-08  
**Goal:** (1) Align on state of the game after MVP declaration; (2) Establish and use a **knowledge base** for `docs/50_research` (including early-design PDFs); (3) **Audit canon systems** vs design/implementation and flag anything missing.

**Context:** MVP declared (Phase 6); Phase 5 (map & data authority) complete. Phases 0–4 and A1 base map stable. User added PDFs to docs/50_research from early game design and suspects we are missing some things from those. Canon docs (Systems Manual v0.4, Phase specs, Engine Invariants) define 11 systems and phase order; we need a single view of what is designed vs implemented.

**Reference:** Previous meeting: [PARADOX_STATE_OF_GAME_MEETING.md](PARADOX_STATE_OF_GAME_MEETING.md). New artifact: [docs/50_research/README_KNOWLEDGE_BASE.md](../50_research/README_KNOWLEDGE_BASE.md).

---

## 1. New artifact: docs/50_research knowledge base

A **knowledge base** for `docs/50_research` has been created:

- **Location:** `docs/50_research/README_KNOWLEDGE_BASE.md`
- **Contents:**
  - Inventory of all assets: Markdown (awwv_gap_analysis, war_sims_best_practices, gui_improvements_backlog), code/demo (militia-system.js, militia-demo.html), and **PDFs** (13 files) with inferred focus and “human extraction” priority.
  - **Gaps / “likely missing”** section: control formula v2, militia/TO/authority, corps/supply, declaration/war start, geography, historical events, master system list — with pointers to canon and code.
  - **How to use:** When changing control/flip, militia/brigade, corps/supply, or UI, consult the relevant research and PDFs (human extraction where needed).
- **PDFs:** Not machine-parsed. When aligning canon or closing gaps, a **human should extract** relevant bullets from high-priority PDFs (e.g. Control_Formula_Demonstration_v2, Control_Stability_And_Flip_System, CORRECTED_CORPS_SUPPLY_RESEARCH, COMPLETE_SYSTEM_SUMMARY, MASTER_*) and add to the knowledge base or canon as appropriate.

**Action for team:** Game Designer + Canon Compliance Reviewer — when touching control, militia, corps/supply, or declaration, check README_KNOWLEDGE_BASE.md and, if a PDF is listed as high priority, ensure extracted content has been compared to current spec/code or flag for human extraction.

---

## 2. Canon systems vs design/implementation audit

Canon source: **Systems_Manual_v0_4_0.md** (11 systems), **Phase_Specifications_v0_4_0.md** (global turn-order hooks, Phase 0/I/II), **Engine_Invariants_v0_4_0.md**. Implementation: `src/state/*.ts`, `src/sim/turn_pipeline.ts`, `src/sim/phase_i/*.ts`, `src/sim/phase_ii/*.ts`.

| System (Canon) | Designed (canon) | State / code present | Wired in pipeline | Notes |
|----------------|------------------|----------------------|-------------------|--------|
| **1. External Patron + IVP** | Yes (§1) | Yes: patron_state, international_visibility_pressure; patron_pressure.ts, exhaustion.ts | Yes: updatePatronState, getExhaustionExternalModifier | |
| **2. Arms Embargo Asymmetry** | Yes (§2) | Yes: embargo_profile; embargo.ts, maintenance.ts, heavy_equipment.ts, doctrine.ts | Partial: used by equipment/maintenance/doctrine; full turn-order hook TBD | |
| **3. Heavy Equipment + Maintenance** | Yes (§3) | Yes: equipment_state, maintenance_capacity; heavy_equipment.ts, maintenance.ts | Partial: init and degradation paths; pipeline step order per Phase spec TBD | |
| **4. Legitimacy** | Yes (§4) | Yes: legitimacy_state; legitimacy.ts | Partial: used in recruitment/authority; full turn-order hook TBD | |
| **5. Enclave Integrity** | Yes (§5) | Yes: enclaves; enclave_integrity.ts | Yes: enclave detection and humanitarian pressure in pipeline | |
| **6. Sarajevo Exceptions** | Yes (§6) | Yes: sarajevo_state; sarajevo_exception.ts | Yes: sarajevo_state updated; feeds IVP/patron | |
| **7. Negotiation Capital** | Yes (§7) | Yes: negotiation_state; negotiation_capital.ts | Partial: state and formulas; acceptance/war-termination flow TBD | |
| **8. AoR Formalization** | Yes (§8) | Yes: assigned_brigade, phase-ii-aor-init | Yes: Phase II only; AoR init from political_controllers + formation home muns | |
| **9. Tactical Doctrines** | Yes (§9) | Yes: doctrine.ts, posture eligibility, equipment/embargo used | Partial: eligibility and modifiers; full doctrine application in combat TBD | |
| **10. Capability Progression** | Yes (§10) | Capability profile in state | Partial: time-indexed progression; pipeline hook TBD | |
| **11. Contested Control Init** | Yes (§11) | Yes: control_status; political_control_init, control_flip | Yes: Phase 0 stability → control_status; Phase I flip resistance | |
| **Phase 0** | Yes | referendum_held, war_start_turn, phase_0_referendum_turn | Yes: scenario_runner, phase 0 turn loop, Phase 3 tests | |
| **Phase I** | Yes | Pool, formation spawn, control flip, authority, displacement, JNA, minority decay | Yes: pipeline steps phase_i_*; formation_spawn_directive; authority state (contested/fragmented) in spawn | |
| **Phase II** | Yes | Front emergence, supply pressure, exhaustion, AoR, consolidation | Yes: phase_ii_* steps; phase-ii-aor-init | |

**Summary:** All 11 systems are **designed** in canon and have **state schema and at least partial code**. Most have some pipeline wiring; “Partial” means not every turn-order hook or downstream consumer is fully implemented per Phase Specifications global turn-order list. **Phase 0, I, and II** core flows are implemented; Phase II pressure/exhaustion/doctrine integration may need verification against Systems Manual.

**Recommendation:** Gameplay Programmer + Systems Programmer — (1) Walk Phase_Specifications_v0_4_0 global turn-order hooks 1–11 against `turn_pipeline.ts` and document any missing or reordered steps. (2) For any system marked “Partial,” list the one missing piece that would move it to “Wired.”

---

## 3. Individual questions (by role)

Each Paradox specialist is asked one question to surface state of the game and alignment with the new knowledge base and canon audit.

### Planning

| Role | Question |
|------|----------|
| **Game Designer** | Given the new docs/50_research knowledge base and the canon-vs-implementation audit, what is the **single biggest** design gap or risk: something in the PDFs we may have missed, or a canon system that is designed but not yet fully reflected in player experience or spec? |
| **Technical Architect** | Where should we document the **pipeline turn-order** (global hooks 1–11 and phase-specific steps) so that “canon systems vs implementation” stays traceable as we add or reorder steps? (REPO_MAP, PIPELINE_ENTRYPOINTS, or a new doc?) |
| **Product Manager** | Post-MVP, what is the next **single priority** (e.g. 50_research PDF extraction, Phase II full wiring, GUI from gui_improvements_backlog, or something else), and what assumption could invalidate it? |

### Development

| Role | Question |
|------|----------|
| **Gameplay Programmer** | For Systems 2, 3, 4, 7, 9, 10 (marked “Partial” in the audit), which **one** would you implement or wire next to get the most correctness/completeness for the sim? |
| **Systems Programmer** | Are there **ordering or serialization invariants** for the new state (patron_state, enclaves, sarajevo_state, negotiation_state) that we should add to Engine Invariants or DETERMINISM_TEST_MATRIX? |
| **UI/UX Developer** | With the knowledge base listing **gui_improvements_backlog** and **awwv_gap_analysis**, which **one** P0 or P1 item (e.g. placeholder labels, map hover tooltips, diplomacy message) would you do first for “state of the game” clarity? |
| **Formation-expert** | Per MILITIA_BRIGADE_SYSTEM_RESEARCH_AND_REWORK_PLAN and the knowledge base: authority state and minority decay are in; settlement-level militias and explicit TO entity are design gaps. Should we **document** “no settlement militia entities; pool is the TO analogue” in MILITIA_BRIGADE_FORMATION_DESIGN, or plan a small design spike for settlement→TO? |

### Quality and process

| Role | Question |
|------|----------|
| **Canon Compliance Reviewer** | When a human extracts bullets from a 50_research PDF (e.g. Control_Formula_Demonstration_v2), what **process** should we use to merge them into canon (e.g. add to Systems Manual or Phase spec, with ledger + STOP AND ASK if conflict)? |
| **QA Engineer** | What **one** test or regression would you add to lock in “canon systems vs implementation” (e.g. pipeline step order, or presence of state fields after a full run)? |
| **Process QA** | After this meeting and the new knowledge base, what **checklist item** would you add so that future changes that touch control, militia, corps/supply, or declaration consider docs/50_research and the audit? |

---

## 4. Collective discussion — state of the game (synthesis)

**Current state (concise):**

- **MVP:** Declared (Phase 6). Scope frozen per Executive Roadmap; post-MVP in Phase 7.
- **Phases 0–5:** Phase 0 (GUI MVP), Phase 1–2 (gates), Phase 3 (canon war start), Phase 4 (turn pipeline → GUI), Phase 5 (map & data authority) executed. A1 base map STABLE.
- **Canon:** All 11 systems in Systems Manual v0.4 are **designed**; state and code exist for all; pipeline wiring is **full** for 1, 5, 6, 8, 11 and **partial** for 2, 3, 4, 7, 9, 10.
- **50_research:** Now indexed in README_KNOWLEDGE_BASE.md. PDFs require human extraction to avoid missing early-design intent (control formulas, corps/supply, declaration, master system list).

**Risks and assumptions:**

1. **PDF content unknown:** We may be missing formulas, constraints, or system list from COMPLETE_SYSTEM_SUMMARY, Control_* v2, or CORRECTED_CORPS_SUPPLY_RESEARCH until a human extracts and compares.
2. **Partial systems:** Systems 2, 3, 4, 7, 9, 10 are partially wired; ordering or downstream effects may not yet match Phase Specifications global turn-order.
3. **Process:** Any design change that touches control, militia, corps/supply, or declaration should consult the knowledge base and, if needed, trigger human PDF extraction before changing canon.

---

## 5. Recommended next steps (Orchestrator)

**Immediate:**

1. **Adopt the knowledge base.** All roles use `docs/50_research/README_KNOWLEDGE_BASE.md` when touching control, militia, brigade, corps/supply, declaration, or UI from research. Game Designer or delegate to perform **human extraction** from high-priority PDFs (Control_* v2, CORRECTED_CORPS_SUPPLY_RESEARCH, COMPLETE_SYSTEM_SUMMARY, MASTER_*) and add bullets to the knowledge base or to canon per Canon Compliance process.
2. **Pipeline turn-order doc.** Technical Architect or Gameplay Programmer: add a short section to PIPELINE_ENTRYPOINTS or a linked doc that maps Phase Specifications global hooks 1–11 to actual pipeline step names/order, and note any gap (e.g. “Capability Progression: not yet a dedicated step”).
3. **Process QA.** Invoke Process QA (quality-assurance-process) to validate: context (napkin, canon), ledger (this meeting and knowledge base as ledger-worthy), and that a checklist item is added for “50_research + canon audit” when changing relevant systems.

**Next (after extraction and pipeline doc):**

4. **Close one partial system.** Gameplay Programmer picks one of Systems 2, 3, 4, 7, 9, 10 and either wires the missing turn-order hook or documents why it is deferred (with ledger entry).
5. **Re-convene.** If scope or phase becomes unclear, or after first batch of PDF extractions, Orchestrator re-convenes Paradox for a short sync.

**Handoffs:**

- **Orchestrator → Game Designer / Canon Compliance:** Own human extraction from high-priority 50_research PDFs and merge process into canon.
- **Orchestrator → Technical Architect / Gameplay Programmer:** Pipeline turn-order documentation and one “partial” system closure.
- **Orchestrator → PM:** Track “next single priority” post-MVP; keep this doc and ledger updated.

---

*End of meeting. This document is the record of the second Paradox state-of-the-game meeting, the creation of the docs/50_research knowledge base, and the canon systems vs implementation audit.*
