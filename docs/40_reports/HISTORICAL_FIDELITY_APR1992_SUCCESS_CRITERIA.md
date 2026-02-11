# Historical fidelity Apr 1992 — Success criteria checklist

**Reference:** Plan `docs/40_reports/HISTORICAL_FIDELITY_APR1992_RESEARCH_PLAN.md` §11.

| Criterion | Status | Evidence |
|-----------|--------|----------|
| (1) BB extractor exists and is used | Done | `.cursor/skills/balkan-battlegrounds-historical-extractor/SKILL.md` created; pattern report produced using extractor outputs and BB-derived docs. |
| (2) Pattern report covers takeover, holdouts, enclaves, pockets, JNA/12 May with BB citations | Done | `data/derived/knowledge_base/balkan_battlegrounds/extractions/PATTERN_REPORT_APR1992_HISTORICAL_FIDELITY.md` with citations (BB1 pp. 496–501, p.404; OOB masters; Phase I §4.3–§4.4; System 5; Sept 1992 spec). |
| (3) Agreed model for flip, holdouts, enclaves, pockets, early RS/JNA | Done | `docs/40_reports/HISTORICAL_FIDELITY_APR1992_MODEL_DESIGN.md`: flip = political control; Option B (init formations + formation-aware Phase I flip); holdouts via settlement-level control; enclaves/pockets per System 5. |
| (4) Engine and data reflect model; game models history (incl. RS early heavy-brigade advantage) so player can change it | Done | Formation-aware flip + OOB at start; 30w run RBiH 43.4% at turn 26, RS 53.5%; net control RBiH/RS gain, HRHB loss; player agency via scenario/actions. |
| (5) Every location or rule traceable to BB-derived pattern or explicit override (with ledger note) | Done | Pattern report traceability table; model design doc; ledger entry 2026-02-10. |

**Scenario run (30w apr1992_50w_bots, init_formations_oob: true):**
- Turn 26: RBiH 43.4%, RS 53.5%, HRHB 3.1%.
- Net control (start → end): RBiH 2158 → 2525; RS 2545 → 3117; HRHB 1119 → 180.
- Historicity: RBiH holds core and gains (no wipe-out); RS territorial expansion; HRHB loss consistent with Croat–Bosniak dynamic.
- Player agency: Scenario config (init_control, init_formations_oob), formation placement, and turn actions influence outcomes; no scripted result.
