# docs/40_reports — Master Index and Structure

**Purpose:** Single entrypoint for implementation reports, handovers, convenes, investigations, and audits. Use consolidated summaries for quick reference; use individual reports for detail.

**Last reorg:** 2026-02-13 (Orchestrator-led cleanup and consolidation).

---

## 1. How to use this folder

| Need | Go to |
|------|--------|
| **What’s already implemented** | [CONSOLIDATED_IMPLEMENTED.md](CONSOLIDATED_IMPLEMENTED.md) → [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md](IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) (single doc; originals archived to docs/_old/40_reports/implemented_2026_02_15/) |
| **What’s not yet implemented (backlog)** | [CONSOLIDATED_BACKLOG.md](CONSOLIDATED_BACKLOG.md) |
| **Lessons learned and patterns** | [CONSOLIDATED_LESSONS_LEARNED.md](CONSOLIDATED_LESSONS_LEARNED.md) |
| **Cleanup plan and subfolder policy** | [ORCHESTRATOR_40_REPORTS_CLEANUP_AND_CONSOLIDATION_2026_02_13.md](ORCHESTRATOR_40_REPORTS_CLEANUP_AND_CONSOLIDATION_2026_02_13.md) |
| **State-of-game and MVP audits** | [audit/](audit/) — incl. [DOCUMENTED_UNIMPLEMENTED_SYSTEMS_AUDIT_2026_02_15.md](audit/DOCUMENTED_UNIMPLEMENTED_SYSTEMS_AUDIT_2026_02_15.md), [STRATEGIC_DESIGN_COUNCIL_AUDIT_2026_02_15.md](audit/STRATEGIC_DESIGN_COUNCIL_AUDIT_2026_02_15.md) (genre mirror, strategic honesty, UI critique). |
| **GUI design advisor handover** | [handovers/GUI_DESIGN_ADVISOR_HANDOVER_2026_02_14.md](handovers/GUI_DESIGN_ADVISOR_HANDOVER_2026_02_14.md) — for expert design input before Phase 3/4. |
| **Integration + systems handover (external expert)** | [handovers/INTEGRATION_AND_SYSTEMS_HANDOVER_EXTERNAL_EXPERT_2026_02_15.md](handovers/INTEGRATION_AND_SYSTEMS_HANDOVER_EXTERNAL_EXPERT_2026_02_15.md) — Warroom/Phase 0 + documented unimplemented systems; integration, interactions, instructions, risk flags. |

---

## 2. Subfolder structure

| Subfolder | Contents |
|-----------|----------|
| **audit/** | State-of-game overview, MVP backlog, state matrix (evidence-backed). |
| **implemented/** | New report 2026-02-16: [WARROOM_RESTYLE_SCENARIO_FIX_EMBEDDED_MAP_FOG_OF_WAR_2026_02_16.md](implemented/WARROOM_RESTYLE_SCENARIO_FIX_EMBEDDED_MAP_FOG_OF_WAR_2026_02_16.md). All content also in [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md](IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) §11. Pre-2026-02-16 originals archived to docs/_old/40_reports/implemented_2026_02_15/. |
| **backlog/** | Plans, designs, research, and specs not yet implemented. |
| **convenes/** | PARADOX convenes, state-of-game meetings, orchestrator reports. |
| **handovers/** | Expert handovers, implementation handovers, clarification requests. |
| **audits/** | Phase/feature audits (pre-existing). |
| **cleanup/** | Cleanup artifacts (pre-existing). |
| **Root** | README, CONSOLIDATED_*.md, ORCHESTRATOR_40_REPORTS_CLEANUP_AND_CONSOLIDATION memo. |

---

## 3. Classification (by status)

Classification is authoritative in the three consolidation docs. Summary:

- **Implemented:** Work reflected in code and/or canon; see [CONSOLIDATED_IMPLEMENTED.md](CONSOLIDATED_IMPLEMENTED.md).
- **Backlog / not yet implemented:** Plans, designs, research; see [CONSOLIDATED_BACKLOG.md](CONSOLIDATED_BACKLOG.md).
- **Lessons learned:** Patterns, mistakes, and corrections; see [CONSOLIDATED_LESSONS_LEARNED.md](CONSOLIDATED_LESSONS_LEARNED.md).

Reports that are **convenes**, **handovers**, or **investigations** may be either implemented or backlog depending on outcome; the consolidation docs assign them.

---

## 4. Links from docs_index

The main docs index is [docs/00_start_here/docs_index.md](../00_start_here/docs_index.md). The “Reports (docs/40_reports)” section there points here and to key handovers/phase reports. Keep that section in sync when adding new high-level report categories.

---

## 5. Archiving policy

- **Superseded reports:** Move to `docs/_old/` (optionally `docs/_old/40_reports/`), update `_old/README.md`. Do not delete.
- **Consolidation:** When consolidating, keep originals in place or archive per above; consolidation docs link to source reports.

---

*This README is the structural entrypoint for 40_reports. For thematic knowledge (decisions, patterns), see docs/PROJECT_LEDGER_KNOWLEDGE.md and .agent/napkin.md.*
