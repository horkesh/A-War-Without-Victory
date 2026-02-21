# Repo-Wide Docs–Canon Alignment Check

**Date:** 2026-02-18  
**Scope:** docs/ (excluding append-only PROJECT_LEDGER changelog)  
**Authority:** docs/10_canon/CANON.md, context.md — current canon is **v0.5.0** (Engine_Invariants, Phase_Specifications, Phase_0/Phase_I/Phase_II, Systems_Manual, Rulebook, Game_Bible in docs/10_canon/*_v0_5_0.md).

---

## 1. Summary

- **Canon index (CANON.md):** Correct — lists v0.5.0 docs only.
- **context.md:** Correct — hierarchy and implementation refs point to v0.5.0 and IMPLEMENTED_WORK_CONSOLIDATED.
- **20_engineering (CODE_CANON, REPO_MAP, PIPELINE_ENTRYPOINTS, ADRs, MILITIA_BRIGADE_FORMATION_DESIGN):** Already reference v0_5_0.
- **00_start_here/docs_index.md:** Correct — canon table and Planning section reference v0_5_0; V0_4_CANON_ALIGNMENT correctly described as v0.4→v0.5.
- **Audit docs (40_reports/audit/):** Had stale v0.4 references; **updated** to v0.5.0.
- **Phase_II_Specification_v0_5_0.md:** One in-body reference to Phase_Specifications updated from v0_3_0 to v0_5_0 for consistency.
- **PROJECT_LEDGER.md:** Contains historical entries that mention v0.3/v0.4; **no change** (append-only changelog; historical accuracy preserved).

---

## 2. Changes Made

| File | Change |
|------|--------|
| docs/40_reports/audit/state_matrix.md | Canon refs in rows A-STATE, A-TURN-PIPELINE, A-TURN-PIPELINE-STATE: Engine_Invariants_v0_4_0, Systems_Manual_v0_4_0, Phase_Specifications_v0_4_0, Phase_0_Specification_v0_4_0 → v0_5_0. |
| docs/40_reports/audit/master_state_overview.md | Row 1: Phase_0_Specification_v0_4_0 → v0_5_0. Row 10: "v0.4" → "v0.5", Engine_Invariants_v0_4_0, Phase_Specifications_v0_4_0 → v0_5_0. Bounded MVP / Justification: "canon v0.4 alignment" → "canon v0.5 alignment"; "v0.4.0" → "v0.5.0". |
| docs/40_reports/audit/mvp_backlog.md | Canon line: Phase_0_Specification_v0_4_0, Phase_Specifications_v0_4_0 → v0_5_0. |
| docs/10_canon/Phase_II_Specification_v0_5_0.md | §1 "AoRs may be instantiated per Phase_Specifications_v0_3_0" → Phase_Specifications_v0_5_0. |

---

## 3. Intentional Non-Changes

- **PROJECT_LEDGER.md:** Changelog entries that reference v0.3 or v0.4 document sets are historical record; per project rules the changelog is append-only. No edits.
- **Phase_II_Specification_v0_5_0.md References section:** Still lists v0.3.0 docs; the note instructs readers to use v0_5_0 for cross-references. Left as-is (historical references).
- **Systems_Manual_v0_5_0.md:** Reference to "archived Systems_Manual_v0_4_0.md" is correct (pointing to archived doc for appendix tables).
- **Phase_I_Specification_v0_5_0.md:** "Supersedes v0.3.0, v0.4.0" and version-increment mention of v0.4.0 are historical; no change.

---

## 4. Verification

- Grep for `v0_4_0|v0\.4\.0` in docs/*.md (excluding PROJECT_LEDGER) after fixes: remaining hits only in PROJECT_LEDGER (changelog), _old/README.md, and intentional "archived"/"Supersedes" mentions in canon docs.
- Canon precedence (context.md §Authoritative Documentation Hierarchy): Engine Invariants > Phase Specifications > Systems Manual > Rulebook > Game Bible > context. Unchanged.
- Skills (canon-compliance-reviewer): Required reading lists Engine_Invariants_v0_5_0, Phase_II_Specification_v0_5_0, etc. No change needed.

---

## 5. Recommendation

- Treat this as the baseline docs–canon alignment pass for v0.5.0.
- When adding or editing audit or planning docs that cite canon, use the v0_5_0 doc names and docs/10_canon/ paths.
- For future v0.6 or similar cutover: update CANON.md, context.md, and audit docs in a single pass; leave PROJECT_LEDGER changelog unchanged.
