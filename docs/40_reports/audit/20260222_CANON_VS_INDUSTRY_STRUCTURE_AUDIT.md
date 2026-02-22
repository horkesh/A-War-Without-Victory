# Canon vs Industry-Standard Documentation Structure — Audit

**Date:** 2026-02-22  
**Author:** Orchestrator (Paradox convene)  
**Scope:** docs/10_canon and related doc hierarchy vs typical game-dev documentation.  
**Constraint:** No edits to FORAWWV.md; canon precedence and determinism rules must remain clear.

---

## 1. Comparison: AWWV Canon → Industry Buckets

| Industry bucket | AWWV location | Notes |
|-----------------|---------------|--------|
| **Game Concept** (overview, genre, audience, USP) | Game_Bible §1–2, Rulebook §1–2, context.md (Project Identity) | Split across three docs; no single “High Concept” one-pager. |
| **Gameplay Mechanics** | Systems_Manual, Rulebook (player-facing), Phase_Specifications + Phase_0/I/II | Industry: often one “Mechanics” section in GDD. We have implementation spec (Systems Manual), player rules (Rulebook), and frozen phase specs. |
| **Level Design** | Phase 0/I/II (time/scenario phases), spatial model in Systems_Manual | No separate level-design doc; appropriate for strategy sim. |
| **Art Style** | docs/20_engineering (GUI_DESIGN_BLUEPRINT, TACTICAL_MAP_SYSTEM) | Not in canon; engineering owns. |
| **Characters / Story** | Game Bible (narrative, design philosophy); factions in Rulebook/Systems_Manual | No character bible; faction/entity content in mechanics. |
| **UI/UX** | 20_engineering (TACTICAL_MAP_SYSTEM, DESKTOP_GUI_IPC_CONTRACT, GUI_*) | Largely outside canon; Rulebook has player-facing flow. |
| **Sound/Music** | Minimal (optional postfx/audio in implementation) | No canon doc; acceptable for current scope. |
| **Technical Requirements** (engine, platforms, constraints) | Engine_Invariants (correctness), 20_engineering (CODE_CANON, REPO_MAP, PIPELINE_ENTRYPOINTS, DETERMINISM_TEST_MATRIX) | Invariants in canon; entrypoints and code layout in engineering. |
| **GDD (single or small set)** | Game_Bible + Rulebook + Systems_Manual | Effectively “GDD” split into philosophy, player rules, and full system spec. |
| **TDD (implementation/architecture)** | Systems_Manual (implementation spec), 20_engineering (CODE_CANON, REPO_MAP, ADRs) | Systems Manual is implementation-facing and in canon; CODE_CANON defers to canon. |
| **Process / Production** | context.md (workflow, ledger, mistake guards, determinism guardrails) | In canon as “process canon”; industry often keeps this in project-management space. |

**What we have that industry often doesn’t (or does differently):**

- **Explicit precedence order** (CANON.md): Industry often has one GDD with implicit priority; we resolve conflicts via a fixed order.
- **Phase Specifications** as separate frozen docs: Industry uses milestones/features; we need frozen phase specs for determinism and phase gates.
- **Engine Invariants** as its own doc: Industry often folds this into TDD or “technical constraints”; we keep it in canon for the code-contradiction rule.
- **Process in canon** (context.md): Workflow, ledger, napkin, determinism are canonical; industry usually keeps process separate from game design.
- **FORAWWV.md** as validated addenda: Industry might use GDD appendix or Confluence; we keep addenda in canon, no auto-edit.

**What industry often has that we don’t (or that lives elsewhere):**

- Single **High Concept** one-pager: We have the content in Game Bible + Rulebook but not one short doc.
- **Art Bible**: We have GUI_DESIGN_BLUEPRINT in 20_engineering.
- **UI/UX spec** inside design: Ours is in 20_engineering; Rulebook has some player flow.
- **Single GDD**: We use Game Bible + Rulebook + Systems Manual instead of one living GDD.

---

## 2. Assessment: Too Much? Too Little? Wrong Structure?

**Verdict: Structure is the main differentiator, not “too much” or “too little.”**

- **Volume:** For a deterministic strategy sim with phase gates and invariants, the number of concepts is justified. We have *more documents* than a typical “one GDD + one TDD” setup, but the content is coherent and audience-split (design vs engineering vs process).
- **Gaps:** We are light on a single “High Concept” doc and on explicit Art/Sound in canon; we are strong on mechanics, invariants, determinism, and process. No change required for Art/Sound unless we want them canonical.
- **Structure:**
  - **Process in canon (context.md):** Unusual for industry; we treat workflow/ledger/determinism as canonical so agents and code follow one source. Moving it to 20_engineering would clarify “canon = game truth only” but would require all entrypoints to point at 20_engineering for process—acceptable if we want canon to be purely game/design.
  - **Game Bible vs Rulebook vs Systems Manual:** Industry often merges these into one GDD. Our split gives: designers (Bible + Rulebook) vs developers (Systems Manual) and preserves “player-facing” vs “implementation” separation. Merging would reduce clarity for audience.
  - **Phase Specs:** Necessary for our model (frozen behavior, determinism); not typical in a GDD but required for our pipeline.
  - **Engine Invariants in canon:** Keeps the “code contradicts canon → code is wrong” rule simple (all authoritative correctness in 10_canon). Moving to TDD would split “authoritative constraints” across 10_canon and 20_engineering.

**Synthesized views (Documentation Specialist, Technical Architect, Game Designer):**

- **Documentation Specialist:** Doc layout (00_start_here, 10/20/30/40) is clear; context in canon is intentional for “first read.” Moving context would need a single pointer from CANON.md so process remains discoverable.
- **Technical Architect:** CODE_CANON and REPO_MAP correctly defer to canon for game truth; entrypoints and repo layout stay in 20_engineering. Keeping Engine Invariants in canon preserves a single place for “correctness constraints” that code must satisfy.
- **Game Designer:** Game Bible (philosophy) + Rulebook (player rules) + Systems Manual (mechanics) gives clean audience separation. A single GDD would blur designer vs developer use; optional improvement is naming (e.g. “GDD” as umbrella in CANON.md) without merging.

---

## 3. Reorganization Options (Concrete, Actionable)

**Invariants for all options:** No edits to FORAWWV.md; canon precedence order and determinism rules remain explicit; CODE_CANON continues to reference canon for game truth.

### Option A: Minimal change — Add industry-friendly labels only

- **Actions:** In CANON.md (and optionally docs_index), add a short “Industry mapping” note: e.g. “Game Bible + Rulebook + Systems Manual together serve as the project’s GDD; Engine Invariants + Phase Specs are correctness and phase contracts; context is process canon.”
- **Pros:** No doc moves or renames; easier for external readers to map our structure to GDD/TDD/process.  
- **Cons:** No structural change; “too many docs” concern unchanged.

### Option B: Move process out of canon (context → 20_engineering or docs root)

- **Actions:** Move context.md to docs/20_engineering/AGENT_CONTEXT.md (or keep at docs/context.md as project root). Update CANON.md to list only game/design docs and add “Process and workflow: see docs/20_engineering/AGENT_CONTEXT.md” (or docs/context.md). Update docs_index and all “first read” pointers to the new location.
- **Pros:** Canon = game truth only; aligns with industry (process separate from GDD).  
- **Cons:** Process is no longer “canon” by name; precedence list in context currently includes context as #6—would need to live in CANON.md or AGENT_CONTEXT with “process follows game docs.”

### Option C: Introduce a single “GDD” umbrella doc (no merge)

- **Actions:** Add docs/10_canon/GDD_INDEX.md (or similar) that: (1) states that Game Bible + Rulebook + Systems Manual form the project’s Game Design Document; (2) links to each and states audience (designers vs players vs developers); (3) points to CANON.md for precedence. Keep all three docs as-is.
- **Pros:** Industry-standard term (GDD) visible; single entry for “where is design?”  
- **Cons:** One more file; CANON.md already functions as index.

### Option D: Merge Game Bible + Rulebook into one “GDD” doc (two parts)

- **Actions:** Create docs/10_canon/GDD_v0_5_0.md with Part A = current Game Bible content, Part B = current Rulebook content. Archive Game_Bible_v0_5_0.md and Rulebook_v0_5_0.md to docs/_old/, update CANON.md precedence (e.g. “GDD v0.5.0” replaces Game Bible and Rulebook, order: Invariants > Phase Specs > Systems Manual > GDD > context).
- **Pros:** Single “game design” doc; closer to one-GDD industry norm.  
- **Cons:** Two audiences (designers, players) in one long doc; harder to hand “just the rulebook” to players; larger single file.

### Option E: Rename “Systems_Manual” to “Technical_Design” or “Systems_Spec”

- **Actions:** Rename Systems_Manual_v0_5_0.md to Technical_Design_v0_5_0.md (or Systems_Spec_v0_5_0.md). Update CANON.md, context.md, docs_index, CODE_CANON, and all cross-references.
- **Pros:** Name aligns with “TDD” or “technical spec” language.  
- **Cons:** “Systems Manual” is already clear; rename is cosmetic and touches many references.

**Recommendation:** Option A is the lowest-friction improvement. Option B is the one structural change that makes canon “game/design only” and aligns with industry separation of process. Option C is a small add if we want an explicit GDD entrypoint without merging. Options D and E are optional and can be deferred (D changes audience experience; E is rename-only).

---

## 4. What Should Stay As-Is

- **CANON.md:** Index and precedence order; do not remove or dilute.
- **FORAWWV.md:** No edits; validated addenda only.
- **Engine_Invariants_v0_5_0.md:** Stays in canon; single source for correctness constraints code must satisfy.
- **Phase_Specifications_v0_5_0.md + Phase_0/Phase_I/Phase_II_Specification_v0_5_0.md:** Required for phase gates and determinism; keep in 10_canon.
- **Determinism and code-contradiction rules:** Remain in CANON.md and context (or AGENT_CONTEXT if Option B); no softening.
- **20_engineering:** CODE_CANON, REPO_MAP, PIPELINE_ENTRYPOINTS, TACTICAL_MAP_SYSTEM, GUI_*, ADRs remain where they are; they reference canon and do not become canon.

---

## 5. Summary for Parent

| Question | Answer |
|----------|--------|
| **Where does the report live?** | docs/40_reports/audit/20260222_CANON_VS_INDUSTRY_STRUCTURE_AUDIT.md |
| **Verdict (too much / too little / structure)?** | **Structure** is the main difference from industry, not volume. We have the right amount of content for a deterministic sim with phase specs; our *split* (Bible / Rulebook / Systems Manual / Invariants / Phase Specs / process in canon) is more granular than the typical one-GDD + one-TDD setup. |
| **Top 2–3 reorganization options** | **(1) Option A (minimal):** Add industry mapping note in CANON.md — pros: no moves, easy for externals; cons: no structural change. **(2) Option B (process out of canon):** Move context to 20_engineering or docs root so canon = game truth only — pros: industry-aligned separation; cons: process no longer “canon” by name, pointers must be updated. **(3) Option C (GDD umbrella):** Add GDD_INDEX.md linking Game Bible + Rulebook + Systems Manual as “the GDD” — pros: standard term, single entrypoint; cons: one more file, CANON.md already indexes. |

---

*This audit was produced by the Orchestrator role; it convenes Documentation Specialist, Technical Architect, and Game Designer perspectives. FORAWWV.md was not edited. Canon precedence and determinism rules are unchanged.*
