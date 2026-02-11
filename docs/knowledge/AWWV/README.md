# AWWV Dual-Source Knowledge Base (PHASE KB-A)

Single, authoritative, cross-source knowledge base for **A War Without Victory (AWWV)** reconstructed from:

1. **docs/knowledge/ChatGPT** (conversations.json)
2. **docs/knowledge/Claude** (conversations.json)

Recovery-oriented: overlaps, divergences, and omissions are made explicit. Both AI sources are treated as fallible.

---

## Structure

| Path | Purpose |
|------|---------|
| **raw/** | Phase 1: Per-conversation markdown, chronological; one file per AWWV-relevant conversation. Naming: `YYYY-MM-DD_<source>_<slug>.md` (source = chatgpt | claude). Claude files with duplicate titles include an 8-char UUID suffix. |
| **CROSS_SOURCE_MATRIX.md** | Phase 2: Concepts in both sources, ChatGPT-only, Claude-only, repeated-but-never-formalized; depth and resolved/canonized status. |
| **Projects/** | Phase 3: PARA-style collation — Rulebook, Systems (Political_Control, Supply_and_Exhaustion, External_Pressure_and_Patrons, Negotiation_and_Treaties, Force_Composition_and_Asymmetry, Fragmentation_and_Command_Friction), Map_and_Geography, Phases, Engine_and_Determinism. |
| **Resources/** | Historical_sources, Data_sources (collation placeholders). |
| **Archives/** | Rejected_or_Deprecated_Ideas. |
| **DECISION_LOG.md** | Phase 4: One entry per explicit decision; source(s), rationale, consequences, superseded? |
| **CANON_STATUS.md** | Phase 4: Canonical (locked), Accepted but tunable, Proposed but not adopted, Explicitly rejected. |
| **ASSUMPTIONS.md** | Phase 4: Explicit and implicit assumptions; assumptions that caused friction or redesign. |
| **GAP_AND_RECOVERY_REPORT.md** | Phase 5: Systems missing from canon, under-justified systems, cross-source omissions, silently dropped constraints, candidates for clarification/formalization/rejection. |

---

## How to use

- **Recover context:** Use `raw/` for verbatim conversation reconstruction; `CROSS_SOURCE_MATRIX.md` for concept overlap.
- **Canon reconciliation:** Use `DECISION_LOG.md`, `CANON_STATUS.md`, `ASSUMPTIONS.md` against `docs/CANON.md` and Engine Invariants.
- **Gap closure:** Use `GAP_AND_RECOVERY_REPORT.md` to drive a later, deliberate gap-closure phase; do not invent mechanics in this KB.

---

## Ingestion scripts

- **ChatGPT:** `npx tsx tools/knowledge_ingest/parse_chatgpt_export.ts` — reads `docs/knowledge/ChatGPT/conversations.json`, writes `raw/YYYY-MM-DD_chatgpt_<slug>.md`.
- **Claude:** `npx tsx tools/knowledge_ingest/parse_claude_export.ts` — reads `docs/knowledge/Claude/conversations.json`, writes `raw/YYYY-MM-DD_claude_<slug>_<uuid8>.md`.

Re-run after updating source archives to refresh raw and then manually update Matrix, PARA, Decision Log, Canon Status, Assumptions, and Gap Report as needed.
