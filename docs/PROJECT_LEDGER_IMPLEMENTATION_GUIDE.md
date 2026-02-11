# Project Ledger Reorganization — Implementation Guide

**Date:** 2026-02-09  
**Audience:** Paradox team (Orchestrator, PM, documentation-specialist, ledger-process-scribe)  
**Purpose:** Step-by-step execution for transforming PROJECT_LEDGER.md into a knowledge-focused structure

---

## 1. Prerequisites

- Read `docs/PROJECT_LEDGER_REORGANIZATION_PLAN.md` (thematic structure).
- Read `docs/PROJECT_LEDGER_EXAMPLE_MIGRATION.md` (migration examples).
- Ensure `docs/PROJECT_LEDGER.md` is under version control; create a backup branch before structural edits.

---

## 2. Phase 1: Knowledge Extraction (no file moves yet)

**Owner:** Documentation-specialist + Orchestrator

1. **Scan the full ledger** and tag each substantive entry with one or more themes:
   - `identity` — project name, non-negotiables, phase status
   - `architecture` — Path A, geometry contract, pipeline, systems design
   - `implementation` — code patterns, tools, data formats, working/failed approaches
   - `canon` — Phase 0/I/II specs, Systems Manual, Engine Invariants updates
   - `process` — Paradox meetings, handovers, roadmap, Phase 7 backlog
   - `decisions` — one-off choices with rationale and consequences

2. **Produce a tagging index** (e.g. `docs/PROJECT_LEDGER_TAGGING_INDEX.md` or a spreadsheet):
   - Columns: `Date`, `First line of entry`, `Themes`, `Notes`
   - Use this to drive migration and to verify no entry is dropped.

3. **Identify decision chains** (see Example 5 in PROJECT_LEDGER_EXAMPLE_MIGRATION.md):
   - Geometry: Path A → crosswalk → union failure → drzava.js → convex hull
   - Bots: random → determinism → seeded RNG → strategy → time-adaptive
   - Map: tactical map canonical data → formation positions → viewer

---

## 3. Phase 2: Create Thematic Skeleton

**Owner:** Documentation-specialist

1. **Create a new file** `docs/PROJECT_LEDGER_KNOWLEDGE.md` (or agree on a name; plan uses “knowledge base” as a separate doc to avoid rewriting the main ledger in one shot).

2. **Copy the following section headers** and leave placeholders for content:
   - Project Identity & Governance
   - Architecture & Systems Knowledge Base
   - Implementation Knowledge Repository
   - Canon & Specifications Evolution
   - Process & Team Knowledge
   - Technical Decision Chains

3. **Under each section**, add:
   - A short “How to use this section” note.
   - Subheadings from the plan (e.g. Path A Contract Evolution, Proven Patterns, Failed Experiments, etc.).

4. **Do not delete or rewrite** `docs/PROJECT_LEDGER.md` yet; keep it as the single append-only changelog per non-negotiables.

---

## 4. Phase 3: Migrate Content by Theme

**Owner:** Documentation-specialist; review by Orchestrator

1. **Identity & Governance**
   - Copy from current ledger: Identity, Non-negotiables, Current Phase, Allowed/Disallowed Work.
   - Add a “Phase tracking & milestones” subsection with dates.
   - Add a “Decision registry” table: Date | Decision | Rationale | Consequences | Theme.

2. **Architecture & Systems**
   - Extract all Path A, geometry contract, outline modes, crosswalk behavior.
   - Add “Path A Contract Evolution” with dated bullets.
   - Add “Geometry system patterns” (working vs failed) using plan + napkin.

3. **Implementation Knowledge**
   - “Proven patterns”: from ledger and napkin “Patterns That Work”, grouped by Map, Simulation, Data pipeline.
   - “Failed experiments”: from ledger and napkin “Patterns That Don’t Work” / “Corrections”.
   - “Domain expertise”: OOB sources, municipality naming, historical context from napkin Domain Notes.

4. **Canon & Specifications**
   - List current canon docs and version.
   - Add “Specification updates log” table: Date | Specification | Change | Rationale.
   - One-line compliance status for Engine Invariants, determinism.

5. **Process & Team**
   - Paradox meetings, handovers, MVP declaration, Phase 7 backlog.
   - External expert handover scope (map-only GUI, etc.).

6. **Technical Decision Chains**
   - For each chain (geometry, bots, map), write a short narrative with dates and “Decision → Consequence → Next decision”.

7. **Cross-references**
   - In thematic doc, add “(See PROJECT_LEDGER.md entry YYYY-MM-DD)” where the full changelog entry lives.
   - In PROJECT_LEDGER.md, optionally add at the top: “For thematic index and knowledge base, see docs/PROJECT_LEDGER_KNOWLEDGE.md (or final name).”

---

## 5. Phase 4: Validation & Ledger Entry

**Owner:** Orchestrator + QA / process check

1. **Knowledge audit**
   - For a sample of 20–30 ledger entries, confirm each appears in the thematic doc or is explicitly marked as “changelog-only” (e.g. minor typo fix).
   - Confirm no substantive knowledge exists only in the thematic doc without a ledger reference (traceability).

2. **Navigation test**
   - Ask: “Where do I find why we use drzava.js for borders?” → Architecture + Decision chain.
   - Ask: “What bot patterns are deterministic?” → Implementation Knowledge → Proven patterns.

3. **Ledger entry**
   - Append to `docs/PROJECT_LEDGER.md` a single entry for “Project ledger reorganization (knowledge-focused structure)”:
     - Summary: Plan and implementation guide created; thematic structure and migration examples documented; execution to be done in phases without removing chronological ledger.
     - Change: New docs — PROJECT_LEDGER_REORGANIZATION_PLAN.md, PROJECT_LEDGER_EXAMPLE_MIGRATION.md, PROJECT_LEDGER_IMPLEMENTATION_GUIDE.md.
     - Scope: Documentation and process only; PROJECT_LEDGER.md remains append-only; thematic knowledge base is additive.

4. **Napkin**
   - In `.agent/napkin.md`, add a Domain Note or Pattern: “Ledger reorganization: thematic knowledge base is in docs/PROJECT_LEDGER_KNOWLEDGE.md (or final name); main ledger stays append-only; see PROJECT_LEDGER_REORGANIZATION_PLAN.md and PROJECT_LEDGER_IMPLEMENTATION_GUIDE.md.”

---

## 6. Ongoing Maintenance

- **New ledger entries:** Continue appending to PROJECT_LEDGER.md with date, summary, change, determinism/scope/artifacts as today.
- **Knowledge updates:** When an entry carries reusable knowledge (pattern, decision, lesson), add or update the corresponding section in the thematic knowledge doc and link to the ledger date.
- **Review:** Quarterly (or at phase boundaries), check that thematic doc is still aligned with ledger and that decision chains are up to date.

---

## 7. Role Summary

| Role                     | Responsibility                                      |
|--------------------------|-----------------------------------------------------|
| Orchestrator             | Own plan, priorities, validation, ledger entry      |
| Documentation-specialist | Thematic structure, migration, cross-references    |
| Ledger-process-scribe    | Ledger entry text, append-only discipline           |
| QA / process             | Audit and navigation checks                         |

---

## 8. Files Created (2026-02-09)

- `docs/PROJECT_LEDGER_REORGANIZATION_PLAN.md` — thematic structure and strategy
- `docs/PROJECT_LEDGER_EXAMPLE_MIGRATION.md` — migration examples
- `docs/PROJECT_LEDGER_IMPLEMENTATION_GUIDE.md` — this guide

Next step: Phase 1 tagging of existing ledger entries.
