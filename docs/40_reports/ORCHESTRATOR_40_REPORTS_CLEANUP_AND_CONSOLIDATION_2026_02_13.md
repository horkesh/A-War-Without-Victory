# Orchestrator: docs/40_reports Cleanup and Consolidation

**Date:** 2026-02-13  
**Role:** Orchestrator  
**Scope:** Arrange cleanup and consolidation of docs/40_reports; structure for implemented vs backlog vs lessons learned; optional subfolders and custodian guidance.

---

## 1. Goal

- **Consolidate** reports that have **not** been implemented yet into a single backlog view.
- **Consolidate** reports that **have** been implemented into a single implemented view.
- **Consolidate** lessons learned from reports (and napkin) into a single lessons-learned view.
- Provide a **structure** (index, subfolders, consolidation docs) so the wealth of information is findable and maintainable.

---

## 2. What was done

1. **Master index:** [README.md](README.md) — entrypoint for 40_reports; points to consolidation docs and audit/.
2. **Consolidation docs (new):**
   - [CONSOLIDATED_IMPLEMENTED.md](CONSOLIDATED_IMPLEMENTED.md) — implemented work by theme with links to source reports.
   - [CONSOLIDATED_BACKLOG.md](CONSOLIDATED_BACKLOG.md) — not-yet-implemented plans, designs, research; priority/owner where known.
   - [CONSOLIDATED_LESSONS_LEARNED.md](CONSOLIDATED_LESSONS_LEARNED.md) — patterns, corrections, and lessons from reports and napkin.
3. **Subfolders (physical reorg completed):** **audit/**, **implemented/**, **backlog/**, **convenes/**, **handovers/**. Reports were moved into these folders; CONSOLIDATED_* links updated to use subfolder paths.
4. **Custodian:** A dedicated **reports-custodian** skill was created (`.cursor/skills/reports-custodian/SKILL.md`). The custodian is in charge of classifying new reports, keeping CONSOLIDATED_* and README in sync, and archiving superseded reports.
5. **This memo** — orchestrator directive and handoff to the custodian.

---

## 3. Custodian / maintenance

- **Who:** Documentation Specialist owns doc layout; Orchestrator/PM set priority for which backlog items get implemented.
- **When updating:** After a report’s work is implemented, add it to CONSOLIDATED_IMPLEMENTED and (if applicable) add lessons to CONSOLIDATED_LESSONS_LEARNED. When a new plan or design is added to 40_reports, add an entry to CONSOLIDATED_BACKLOG.
- **Archiving:** Superseded reports → `docs/_old/` (see README §5); update `_old/README.md`.

---

## 4. Reports custodian (created)

A dedicated **reports-custodian** skill exists at `.cursor/skills/reports-custodian/SKILL.md`. The custodian:
- Classifies new reports as implemented / backlog / convenes / handovers and places them in the correct subfolder (or adds to root and updates consolidation).
- Keeps CONSOLIDATED_IMPLEMENTED, CONSOLIDATED_BACKLOG, CONSOLIDATED_LESSONS_LEARNED, and README in sync when reports are added, moved, or superseded.
- Archives superseded reports to `docs/_old/` per README §5 and updates `_old/README.md`.
- Works with Documentation Specialist for doc layout; defers to Orchestrator/PM for priority of backlog items.

---

## 5. Single priority and handoff (to custodian)

- **Priority:** Use the new README and consolidation docs as the canonical way to find “what’s done,” “what’s next,” and “what we learned” in 40_reports.
- **Handoff:** Documentation Specialist — when touching 40_reports, follow README and consolidation structure; consider ledger/thematic update per docs-only-ledger-handling.

---

*Orchestrator; 2026-02-13.*
