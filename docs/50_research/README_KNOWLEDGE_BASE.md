# docs/50_research — Knowledge Base

**Purpose:** Single index and knowledge base for early game-design research in `docs/50_research/`. Use this to avoid losing design intent from PDFs and to cross-check current canon and implementation.

**Owner:** Orchestrator / Game Designer. Human extraction from PDFs is required where noted.

---

## 1. Inventory

### 1.1 Markdown (machine-readable)

| File | Summary | Key topics |
|------|---------|------------|
| **awwv_gap_analysis_vs_best_practices.md** | AWWV Warroom UI vs best-practice library; tagged findings [Clarification]/[Extension]/[Out-of-scope]. | Progressive disclosure, map tooltips, placeholder labels, wall vs overlay map, faction overview, determinism. |
| **war_sims_best_practices.md** | Evidence-based survey of UI/UX from comparable war sims (UoC2, Decisive Campaigns, TOAW, Command Ops 2, HOI4, etc.). | Information hierarchy, sitrep metaphor, layer toggles, no false precision, turn feedback, certainty signaling. |
| **gui_improvements_backlog.md** | Prioritized Warroom backlog: P0 (safe/MVP), P1 (medium effort), P2 (Phase II+). | Placeholder labels, diplomacy message, estimate labels, hover tooltips, zoom-on-click, focus trap, post-turn summary. |

### 1.2 Code / demo (machine-readable)

| File | Summary | Key topics |
|------|---------|------------|
| **militia-system.js** | Patch: settlement militias → municipal TOs, authority states (consolidated/contested/fragmented), turn effects, brigade eligibility (≥800, not fragmented). | Bottom-up militia→TO→brigade; authority modifiers; minority decay (turns 1–3); canFormBrigade. |
| **militia-demo.html** | HTML + inline JS demo: SettlementSystem (census), MilitiaSystem.initialize(), municipal TO list, historical validation (Kozarac, Sapna, Teočak, Vozuča). | Validation cases; TO aggregation; equipment. |

**Cross-reference:** Full comparison vs current design/code and rework plan: `docs/40_reports/MILITIA_BRIGADE_SYSTEM_RESEARCH_AND_REWORK_PLAN.md`.

### 1.3 PDFs (early game design) — text extracts available

**Text extraction:** Run `npm run docs:50-research:extract` to populate `docs/50_research/extracts/*.txt`. **Limitation (2026-02-08):** Current pdfjs-based extraction produces text that is **not reliably readable** for many of these PDFs (glyphs/encoding issues). The .txt files exist but are **not suitable for content study** until extraction is improved (e.g. Poppler pdftotext if available) or a **human** extracts bullets directly from the PDFs. When aligning canon or filling gaps, use markdown/code in this folder first; for PDF-sourced content, use human-extracted bullets or re-run extraction with Poppler if added.

| File | Inferred focus | Extract priority | Notes |
|------|----------------|------------------|--------|
| **COMPLETE_SYSTEM_SUMMARY.pdf** | Full system summary (likely high-level). | High | May list all systems; compare to Systems_Manual v0.4 and missing_systems_roadmap. |
| **MASTER_PROJECT_DOCUMENTATION.pdf** | Master project doc. | High | Likely overlaps MASTER_PROJECT_OVERVIEW; check for mechanics or scope we dropped. |
| **MASTER_PROJECT_OVERVIEW.pdf** | Project overview. | High | Design intent, scope, phases. |
| **Control_Formula_Demonstration_v2.pdf** | Control formula (v2). | High | Control flip, stability, formulas — align with Phase I control flip and control_status. |
| **Control_Stability_And_Flip_System_Documentation.pdf** | Control stability and flip. | High | Directly relevant to control_status (SECURE/CONTESTED/HIGHLY_CONTESTED) and flip resistance. |
| **Declaration_System_Hybrid_Implementation.pdf** | Declaration system (hybrid). | Medium | Independence/referendum, war start — compare to Phase 0 spec. |
| **Declaration_System_Implementation_Summary.pdf** | Declaration summary. | Medium | Same as above; may be shorter. |
| **CORRECTED_CORPS_SUPPLY_RESEARCH.pdf** | Corps/supply (corrected). | High | Corps, supply, logistics — compare to Phase II supply_pressure, AoR, Systems 2–3. |
| **DYNAMIC_CORPS_SYSTEM.pdf** | Dynamic corps system. | Medium | Corps behavior, formation hierarchy. |
| **GEOGRAPHIC_REFERENCE.pdf** | Geography, map, units. | Medium | Settlements, municipalities, geometry — cross-check MAP_BUILD_SYSTEM, A1_BASE_MAP_REFERENCE. |
| **HISTORICAL_EVENTS_IMPLEMENTED.pdf** | Historical events in sim. | Medium | Event triggers, timeline — compare to scenario design and Phase 0/I calendar. |
| **Historical Data Package - Readme.pdf** | Data package readme. | Medium | Source data, census, control — align with data contracts and Turn-0 init. |
| **UI_Design_Research_And_Recommendations.md.pdf** | UI design research. | Medium | UI/UX recommendations — cross-check gui_improvements_backlog, war_sims_best_practices. |

**Text extracts:** Run `npm run docs:50-research:extract` to produce `docs/50_research/extracts/<basename>.txt`. Agents and humans can read these .txt files.

---

## 2. Gaps and “likely missing from current design”

The following are **candidate** gaps (from titles and from militia research). Confirm against canon and code before changing design.

- **Control / stability / flip:** Control_Formula_Demonstration_v2 and Control_Stability_And_Flip_System — ensure Phase I flip resistance, large-settlement rules, and control_status derivation match any v2 formulas. **Authority:** Phase I spec, Systems Manual §11, control_flip.ts.
- **Militia / TO / brigade:** Settlement→TO→brigade model; authority state (consolidated/contested/fragmented) affecting pool and canFormBrigade; optional minority decay (turns 1–3). **Status:** Partially adopted; see MILITIA_BRIGADE_SYSTEM_RESEARCH_AND_REWORK_PLAN.md. Authority state and minority decay implemented; settlement-level militias and explicit TO entity are design gaps.
- **Corps / supply:** CORRECTED_CORPS_SUPPLY_RESEARCH and DYNAMIC_CORPS_SYSTEM — compare to Phase II supply_pressure, formation hierarchy, and Systems 2–3 (embargo, equipment). Ensure no corrected formulas were dropped.
- **Declaration / war start:** Declaration PDFs — ensure Phase 0 referendum and war_start_turn logic match “hybrid” or summary (no referendum → no war; referendum → war at correct turn).
- **Geography:** GEOGRAPHIC_REFERENCE — confirm settlement/municipality IDs, ADM3, and any geographic constants match A1 and scenario data.
- **Historical events:** HISTORICAL_EVENTS_IMPLEMENTED — list of events and triggers; ensure scenario and phase calendar align.
- **Master docs:** COMPLETE_SYSTEM_SUMMARY, MASTER_* — high-level system list and scope; reconcile with Systems_Manual v0.4 (11 systems) and missing_systems_roadmap (8 gap systems).

---

## 3. How to use this knowledge base

1. **Before changing control/flip/authority:** Read Control_* PDFs (or human-extracted bullets); compare to Phase I spec and control_flip.ts.
2. **Before changing militia/brigade/pools:** Read militia-system.js patch + MILITIA_BRIGADE_SYSTEM_RESEARCH_AND_REWORK_PLAN.md; then Systems Manual, MILITIA_BRIGADE_FORMATION_DESIGN, formation_spawn.ts.
3. **Before changing corps/supply/Phase II:** Read CORRECTED_CORPS_SUPPLY_RESEARCH and DYNAMIC_CORPS_SYSTEM (human extract); compare to phase_ii/supply_pressure, exhaustion, AoR.
4. **Before adding or changing UI:** Read war_sims_best_practices.md, gui_improvements_backlog.md, awwv_gap_analysis_vs_best_practices.md; respect Clarification/Extension/Out-of-scope tags.
5. **When canon is silent:** Check MASTER_* and COMPLETE_SYSTEM_SUMMARY (human extract) for design intent; then STOP AND ASK with options and risks.

---

## 4. Maintenance

- Run `npm run docs:50-research:extract` when new PDFs are added so extracts stay current.
- When a human extracts content from a PDF, add a short “Extracted bullets” subsection under that PDF in this file, or add a dedicated `docs/50_research/extracts/` note and link from here.
- When new research files are added to docs/50_research, add them to §1 and, if relevant, to §2.
- Napkin: “50_research: run docs:50-research:extract for .txt in docs/50_research/extracts/ Agents can read the extracted .txt files.”

---

*This knowledge base is part of the Paradox state-of-the-game process. Do not invent mechanics; all design changes must respect canon precedence and determinism.*
