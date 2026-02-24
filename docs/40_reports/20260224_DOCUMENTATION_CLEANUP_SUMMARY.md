# Documentation Cleanup Summary (2026-02-24)

**Role:** Orchestrator  
**Goal:** Clean up docs/40_reports and backlogs so the repo has a concrete structure, consolidated reports, and no planned-but-unimplemented or partially implemented work is lost.

---

## What was done

1. **README (docs/40_reports/README.md)**  
   - Removed stale subfolder rows for **audits/** and **cleanup/** (those folders do not exist; only **audit/** exists).  
   - Added a short note that phase/feature audits live in **audit/** and there are no separate `audits/` or `cleanup/` subfolders.

2. **CONSOLIDATED_BACKLOG.md**  
   - Added **§12. Additional backlog docs (full index)** so every backlog file is referenced in the single backlog view.  
   - Indexed: WARROOM_SETUP_AND_PHASE0_EXECUTION_PROPOSAL, PHASE_D_COMPLETION_REPORT, TERRAIN_DERIVATION_PLAN, TERRAIN_SCALARS_SPEC, TERRAIN_PIPELINE_AUDIT, UI_DESIGNER_BRIEF, UI_TEMPORAL_CONTRACT, UI_SYSTEMS_SPECIFICATION, PHOTOSHOP_TEMPLATE_SPECIFICATION, SORA_ASSET_SPECIFICATION, SORA_PROMPTS_UI.  
   - All other backlog files were already covered in §1–§11.

3. **No files archived or merged**  
   - No content was deleted. No reports were moved to docs/_old/. Consolidation was by index only (CONSOLIDATED_BACKLOG §12).

4. **PROJECT_LEDGER**  
   - Appended an entry for this cleanup (2026-02-24) describing the README and CONSOLIDATED_BACKLOG changes and where to find implemented vs backlog vs convenes.

---

## Where to find things

| Need | Location |
|------|----------|
| **What’s implemented** | [CONSOLIDATED_IMPLEMENTED.md](CONSOLIDATED_IMPLEMENTED.md) → [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md](IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) (§1–§42); individual reports in [implemented/](implemented/). |
| **What’s not yet implemented (backlog)** | [CONSOLIDATED_BACKLOG.md](CONSOLIDATED_BACKLOG.md) (§1–§12). Source docs in [backlog/](backlog/). |
| **Convenes / state-of-game** | [convenes/](convenes/). |
| **Handovers** | [handovers/](handovers/). |
| **Audits (state-of-game, MVP, canon)** | [audit/](audit/). |
| **Lessons learned** | [CONSOLIDATED_LESSONS_LEARNED.md](CONSOLIDATED_LESSONS_LEARNED.md); see also `.agent/napkin.md`. |

---

## Planned-but-unimplemented and partially implemented work

- **Audit:** Cross-checked CONSOLIDATED_BACKLOG and backlog/ against napkin Session Notes, PROJECT_LEDGER_KNOWLEDGE, and key convenes.  
- **Preserved:** All 43 backlog/ files are now referenced either in §1–§11 (existing sections) or in §12 (full index). Items that are partially implemented (e.g. RBiH–HRHB core lifecycle, Phase 2 B(a) OSID-first pipeline) remain marked in CONSOLIDATED_BACKLOG as done where applicable; remaining work stays in the backlog view.  
- **No planned work dropped:** Every backlog doc is linked from CONSOLIDATED_BACKLOG so nothing is lost when navigating the single view.

---

## Constraints respected

- No edits to FORAWWV.md.  
- No deletion of report content; no archiving performed this pass.  
- Reports-custodian workflow: README and CONSOLIDATED_BACKLOG updated; CONSOLIDATED_IMPLEMENTED unchanged (already current through §42).  
- PROJECT_LEDGER entry added per docs-only-ledger-handling (structure/findability change).

---

## Addendum: Second pass — themed merge and archive (2026-02-24)

**Goal:** Deeper consolidation: merge small/overlapping backlog docs into fewer themed files; archive superseded reports.

### Themed merge of backlog

| Themed doc (in backlog/) | Source files merged (archived to docs/_old/40_reports/backlog/) |
|--------------------------|------------------------------------------------------------------|
| BACKLOG_HISTORICAL_FIDELITY_AND_RESEARCH.md | HISTORICAL_FIDELITY_APR1992_RESEARCH_PLAN, _SUCCESS_CRITERIA, _MODEL_DESIGN, HISTORICAL_TRAJECTORY_VRS_ARBIH_ANALYSIS, APR1992_RUNS_EXAMINATION_REPORT (5) |
| BACKLOG_PHASE7_MASTER_EARLY_DOCS.md | IMPLEMENTATION_PLAN_MASTER_EARLY_DOCS, PHASE7_BACKLOG_QUEUE_MASTER_EARLY_DOCS, MASTER_EARLY_DOCS_ANALYSIS_REPORT (3) |
| BACKLOG_BRIGADE_MILITIA_MILITARY.md | BRIGADE_REALISM_AND_MILITARY_FRONTS_IMPLEMENTATION_PLAN, MILITIA_BRIGADE_SYSTEM_RESEARCH_AND_REWORK_PLAN, FORMATION_BRIGADE_VS_HISTORICAL_OOB_COMPARISON, RBiH_HRHB_ALLIANCE_REDESIGN_DESIGN (4) |
| BACKLOG_GUI_WARROOM_WAR_PLANNING_MAP.md | IMPLEMENTATION_PLAN_GUI_MVP, WAR_PLANNING_MAP_EXPERT_PROPOSAL, _TEAM_DISCUSSION, WAR_PLANNING_MAP_VIEWER_DUTY_DELEGATION, WARROOM_SETUP_AND_PHASE0_EXECUTION_PROPOSAL, WARROOM_START_OF_GAME_INFORMATION_REPORT, WARROOM_CLICK_ALIGNMENT_TEAM_DISCUSSION, WARROOM_ASSET_GENERATION_BRIEF, GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION, PHASED_PLAN_MAP_AND_WAR_SYSTEM (10) |
| BACKLOG_UI_AND_ASSET_SPECS.md | UI_DESIGN_SPECIFICATION, NATO_AESTHETIC_SPEC, CLICKABLE_REGIONS_SPECIFICATION, UI_DESIGNER_BRIEF, UI_TEMPORAL_CONTRACT, UI_SYSTEMS_SPECIFICATION, PHOTOSHOP_TEMPLATE_SPECIFICATION, SORA_ASSET_SPECIFICATION, SORA_PROMPTS_UI (9) |
| BACKLOG_PHASE_D_E_G_DIRECTIVES.md | PHASE_D_COMPLETION_REPORT, PHASE_E_DIRECTIVE_SPATIAL_v1, PHASE_G_UI_NOTES (3) |
| BACKLOG_TERRAIN_MAP_AND_CENSUS.md | TERRAIN_DERIVATION_PLAN, TERRAIN_SCALARS_SPEC, TERRAIN_PIPELINE_AUDIT, FEASIBILITY_1991_CENSUS_MASTER (4) |
| BACKLOG_MOBILIZATION.md | MOBILIZATION_AND_FORCE_GROWTH_PLAN, MOBILIZATION_ARCHITECT_DECISIONS (2) |
| BACKLOG_PROCESS_AND_REFERENCE.md | REPO_CLEANUP_2026_PHASE0_DISCOVER, SCENARIO_RUN_WHAT_ACTUALLY_HAPPENS (2) |

**Standalone (not merged):** 20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md remains in backlog/.

**Total archived to _old/40_reports/backlog/:** 43 files. Full content preserved; each themed doc lists its source filenames and a short summary.

### Superseded reports archived

| Report | New location | Superseded by |
|--------|---------------|----------------|
| ORCHESTRATOR_52W_APR1992_RUN_2026_02_21.md | docs/_old/40_reports/convenes/ | ORCHESTRATOR_52W_APR1992_DETAILED_RUN_2026_02_21.md (in 40_reports/convenes/) |

### Updates made

- **CONSOLIDATED_BACKLOG:** §1–§6 and §12 now point to themed docs and docs/_old/40_reports/backlog/; §7 BOT_AI link → _old/implemented_2026_02_15.
- **README §2:** backlog/ row describes themed docs and archive.
- **docs/_old/README.md:** Added §40_reports/backlog (themed merge 2026-02-24) and §40_reports/convenes (superseded 2026-02-24).
- **In-repo links:** ORCHESTRATOR_52W_FULL_REPORT (related report → DETAILED_RUN); INTEGRATION_AND_SYSTEMS_HANDOVER (WARROOM ref → themed doc + _old path); PROJECT_LEDGER and PROJECT_LEDGER_KNOWLEDGE (new entries / structure note).

### Constraints

- No FORAWWV edits. No deletion of content—archive only. CONSOLIDATED_BACKLOG still references every distinct backlog item (by themed doc or _old index). PROJECT_LEDGER entry added.
