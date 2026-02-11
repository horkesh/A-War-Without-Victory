# Paradox Team Meeting — State of the Game (Third Convening)

**Convened by:** Orchestrator  
**Date:** 2026-02-08  
**Goal:** (1) **Utilise the newly created knowledge base** (docs/50_research) and report what was studied; (2) **Study canon docs** and confirm whether all systems are designed/implemented; (3) Address the user’s concern that we may be **missing some things** from the early-design research.

**Context:** Second meeting established the knowledge base and canon audit. User requested another convening to actually use that knowledge base and to re-check systems design/implementation. This document records the third meeting: what was studied, what could not be studied (and why), and the refreshed canon audit.

**Reference:** [PARADOX_STATE_OF_GAME_MEETING_2026_02_08.md](PARADOX_STATE_OF_GAME_MEETING_2026_02_08.md) (second convening). [docs/50_research/README_KNOWLEDGE_BASE.md](../50_research/README_KNOWLEDGE_BASE.md).

---

## 1. Knowledge base — what was utilised and what could not be studied

### 1.1 Assets that were studied (machine-readable)

| Asset | Use |
|-------|-----|
| **README_KNOWLEDGE_BASE.md** | Single index: inventory (§1), gaps/likely-missing (§2), how-to-use (§3), maintenance (§4). Confirmed as the entry point before any change to control, militia, corps/supply, declaration, or UI. |
| **awwv_gap_analysis_vs_best_practices.md** | UI vs best-practice library; findings [Clarification]/[Extension]/[Out-of-scope]. Already reflected in gui_improvements_backlog and second-meeting role questions. |
| **war_sims_best_practices.md** | UI/UX patterns from comparable titles. Referenced in README for “before adding or changing UI.” |
| **gui_improvements_backlog.md** | P0/P1/P2 Warroom backlog. README points here for UI work. |
| **militia-system.js** | Patch: settlement militias → municipal TOs, authority states, canFormBrigade (≥800), minority decay. Already compared in [MILITIA_BRIGADE_SYSTEM_RESEARCH_AND_REWORK_PLAN.md](MILITIA_BRIGADE_SYSTEM_RESEARCH_AND_REWORK_PLAN.md); authority state and minority decay implemented; settlement-level militias and explicit TO remain design gaps. |
| **militia-demo.html** | Demo and validation cases; covered by rework plan. |

**Conclusion:** The **markdown and code** in docs/50_research were utilised via the knowledge base index and the existing militia rework plan. No new “extracted bullets” could be added from these (they are already summarized in README and the rework plan).

### 1.2 PDF text extracts — cannot be studied in current form

**Action taken:** The extraction script (`npm run docs:50-research:extract`) was run; all 13 PDFs produced `.txt` files in `docs/50_research/extracts/`.

**Finding:** The **extracted text is not reliably readable**. Sample reads of COMPLETE_SYSTEM_SUMMARY.txt, Control_Formula_Demonstration_v2.txt, Control_Stability_And_Flip_System_Documentation.txt, and MASTER_PROJECT_OVERVIEW.txt show heavy use of symbols, glyphs, and fragmented character sequences rather than clean prose or formulas. This is consistent with pdfjs-based extraction from PDFs that use embedded fonts or non-standard encoding; the same pipeline works for Balkan Battlegrounds PDFs elsewhere in the repo, so the 50_research PDFs may differ in structure or encoding.

**Implication:** We **cannot** close the “missing some things from those” gap by agent-led study of the current extracts. To actually study the PDFs we need one of:

1. **Poppler (pdftotext)** on the build machine for 50_research PDFs (if available and if it produces clean text for these files), or  
2. **Human extraction:** a human opens the high-priority PDFs (Control_* v2, CORRECTED_CORPS_SUPPLY_RESEARCH, COMPLETE_SYSTEM_SUMMARY, MASTER_*) and adds bullets to README_KNOWLEDGE_BASE.md or to canon per Canon Compliance process.

**Recommendation:** Document in README_KNOWLEDGE_BASE.md that current PDF extracts are **not suitable for content study** and that Poppler or human extraction is required to compare early-design content to canon/code. Leave the extract script in place for when Poppler is available or for future PDFs that extract cleanly.

---

## 2. Canon systems — design vs implementation (refreshed audit)

Canon: **Systems_Manual_v0_4_0.md** (11 systems), **Phase_Specifications_v0_4_0.md**, **Engine_Invariants_v0_4_0.md**. Implementation: `src/state/*.ts`, `src/sim/turn_pipeline.ts`, phase_i/phase_ii steps. Pipeline step mapping: **PIPELINE_ENTRYPOINTS.md** (§ Turn pipeline and canon systems).

| System (Canon) | Designed | State/code present | Wired in pipeline | Status |
|----------------|----------|---------------------|-------------------|--------|
| **1. External Patron + IVP** | Yes | Yes | Yes (update-patron-ivp, exhaustion modifier) | Complete |
| **2. Arms Embargo Asymmetry** | Yes | Yes (embargo_profile, embargo.ts, etc.) | Partial (used by equipment/doctrine; dedicated turn hook) | Partial |
| **3. Heavy Equipment + Maintenance** | Yes | Yes (equipment_state, maintenance) | Partial (degradation paths; full order per Phase spec TBD) | Partial |
| **4. Legitimacy** | Yes | Yes (legitimacy_state, legitimacy.ts) | Partial (recruitment/authority; full turn hook TBD) | Partial |
| **5. Enclave Integrity** | Yes | Yes (enclaves, enclave_integrity.ts) | Yes | Complete |
| **6. Sarajevo Exceptions** | Yes | Yes (sarajevo_state, sarajevo_exception.ts) | Yes | Complete |
| **7. Negotiation Capital** | Yes | Yes (negotiation_state, negotiation_capital.ts) | Partial (formulas; acceptance/termination flow TBD) | Partial |
| **8. AoR Formalization** | Yes | Yes (assigned_brigade, phase-ii-aor-init) | Yes (Phase II only) | Complete |
| **9. Tactical Doctrines** | Yes | Yes (doctrine.ts, eligibility) | Partial (eligibility; full doctrine application in combat TBD) | Partial |
| **10. Capability Progression** | Yes | Yes (capability_profile) | Partial (update-capability-profiles step; progression curves TBD) | Partial |
| **11. Contested Control Init** | Yes | Yes (control_status, political_control_init, control_flip) | Yes | Complete |
| **Phase 0** | Yes | referendum_held, war_start_turn | Yes (scenario_runner, Phase 3 tests) | Complete |
| **Phase I** | Yes | Pools, spawn, flip, authority, displacement, JNA, minority decay | Yes (phase_i_* steps, formation_spawn_directive, authority in spawn) | Complete |
| **Phase II** | Yes | Front emergence, supply, exhaustion, AoR, consolidation | Yes (phase_ii_* steps, phase-ii-aor-init) | Complete |

**Summary:** All 11 systems are **designed** in canon and have **state and code**. **Fully wired** in pipeline: 1, 5, 6, 8, 11; Phase 0, I, II. **Partially wired** (state + some consumers; missing full turn-order or downstream flow): 2, 3, 4, 7, 9, 10. No system is “designed but not implemented”; the gap is degree of wiring and completeness of downstream behaviour (e.g. negotiation acceptance, doctrine effects in combat).

---

## 3. What we might be missing (from research) — and how to close the gap

The user’s concern: “We are missing some things from those [early-design docs].”

- **From markdown/code:** Already captured in README and MILITIA_BRIGADE_SYSTEM_RESEARCH_AND_REWORK_PLAN. Remaining design gaps (settlement-level militias, explicit TO entity) are documented; no new “missing” item was identified from re-reading those assets.
- **From PDFs:** We **cannot** currently say what is in the PDFs. Until Poppler or human extraction is done, “missing from those” remains a **risk** rather than a resolved list. High-priority PDFs to open first: Control_Formula_Demonstration_v2, Control_Stability_And_Flip_System_Documentation, CORRECTED_CORPS_SUPPLY_RESEARCH, COMPLETE_SYSTEM_SUMMARY, MASTER_PROJECT_OVERVIEW / MASTER_PROJECT_DOCUMENTATION.

**Recommended next steps to close the gap:**

1. **Update README_KNOWLEDGE_BASE.md:** Add a short note that current PDF extracts are not suitable for content study (encoding/glyph issues) and that Poppler or human extraction is required.
2. **Option A (build):** If Poppler is available (e.g. on CI or dev machine), add a path in the extract script to prefer pdftotext for docs/50_research PDFs and re-run; then re-assess extract readability.
3. **Option B (human):** Assign a human to extract bullets from the high-priority PDFs listed above and add them to README (e.g. “Extracted bullets” subsections) or to canon per Canon Compliance process.
4. **Process:** Any change to control, militia, corps/supply, or declaration must still consult README_KNOWLEDGE_BASE.md; if a PDF is high-priority and not yet extracted, flag for human extraction before changing canon.

---

## 4. Role questions (third convening)

Focused on “knowledge base utilisation” and “what we might be missing.”

| Role | Question |
|------|----------|
| **Game Designer** | Given that PDF content cannot be studied from current extracts, what is the **single highest-value** PDF for a human to extract first (control formulas, corps/supply, or master system list), and what one design question should that extraction answer? |
| **Technical Architect** | Should we add a **Poppler-first** branch to the 50_research extract script (try pdftotext for each PDF, fallback to pdfjs) and document it in PIPELINE_ENTRYPOINTS, or keep extraction as pdfjs-only and rely on human extraction? |
| **Canon Compliance Reviewer** | When extracted bullets from a PDF are added to the knowledge base or to canon, what **minimal process** do we require (e.g. “bullets in README §Extracted bullets; any canon change = ledger + STOP AND ASK if conflict”)? |
| **Formation-expert** | Beyond the rework plan: is there any **militia/TO/brigade** rule that you believe is still only in the PDFs (e.g. CORRECTED_CORPS or militia docs) and not yet in MILITIA_BRIGADE_FORMATION_DESIGN or code? If yes, which PDF and which rule? |
| **Product Manager** | With PDF content currently unreadable by tooling, how do you want to **sequence** (a) human PDF extraction, (b) closing partial systems (2,3,4,7,9,10), and (c) GUI backlog from the knowledge base? |

---

## 5. Synthesis and recommended next steps (Orchestrator)

**State of the game after third convening:**

- **Knowledge base:** In use as the single entry point (README) and for markdown/code. PDF extracts exist but are **not readable** for content study; we are still **missing** the ability to compare early-design PDFs to canon/code until Poppler or human extraction is used.
- **Canon vs implementation:** All 11 systems are designed and have state/code; 5 are fully wired, 6 partially wired. Phases 0, I, II are implemented. No “designed but not implemented” system; only completeness of wiring and downstream behaviour.
- **“Missing some things”:** Resolvable only after we can read the PDFs (Poppler or human). Until then, the knowledge base and this meeting record the **risk** and the **list of high-priority PDFs** to extract.

**Immediate actions:**

1. **Document PDF extract limitation:** Add to docs/50_research/README_KNOWLEDGE_BASE.md a note that current extracts are not suitable for content study and that Poppler or human extraction is required.
2. **Decide extraction path:** Technical Architect (or assignee): evaluate adding Poppler (pdftotext) for 50_research PDFs; if not feasible, document that human extraction is the path and add the high-priority PDF list to README.
3. **Single next priority:** Product Manager to set order of (a) human PDF extraction, (b) partial-system wiring, (c) GUI backlog, and to record it in this doc or the ledger.

**Handoffs:**

- **Orchestrator → Game Designer / Canon Compliance:** Define minimal process for merging extracted PDF bullets into knowledge base or canon.
- **Orchestrator → Technical Architect:** Poppler vs human extraction decision and doc update.
- **Orchestrator → PM:** Sequence extraction vs partial systems vs GUI; update ledger.

---

*End of third Paradox state-of-the-game meeting. Knowledge base utilised; PDF content study blocked on extract readability; canon audit refreshed; next steps depend on extraction path (Poppler or human).*
