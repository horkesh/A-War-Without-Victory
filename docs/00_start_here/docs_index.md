# Documentation index — A War Without Victory

**Purpose:** Single entrypoint for AWWV documentation. Use this to find canonical truth, engineering references, planning, and reports.

## Where to start

- **Process and workflow:** [docs/10_canon/context.md](../10_canon/context.md) — mandatory first read for agents and contributors (ledger, mistake guard, determinism).
- **Political control:** Control is **settlement-level** (each settlement has a controller); municipality-level control is a derived view (e.g. majority of settlements) for display only. See [Systems_Manual_v0_5_0.md § System 11](../10_canon/Systems_Manual_v0_5_0.md).
- **Paradox roster and handoffs:** [.cursor/AGENT_TEAM_ROSTER.md](../../.cursor/AGENT_TEAM_ROSTER.md) — Paradox (subagent collective); when to invoke which specialist; clarification-first and handoff rules.
- **Canon (game truth):** [docs/10_canon/CANON.md](../10_canon/CANON.md) — canonical doc index and precedence order.
- **Project state:** [docs/PROJECT_LEDGER.md](../PROJECT_LEDGER.md) — changelog and current state (at docs root).

## Canon set (docs/10_canon/)

| Doc | Role |
|-----|------|
| [CANON.md](../10_canon/CANON.md) | Index and precedence |
| [context.md](../10_canon/context.md) | Process canon |
| [FORAWWV.md](../10_canon/FORAWWV.md) | Validated design insights (addenda) |
| [Engine_Invariants_v0_5_0.md](../10_canon/Engine_Invariants_v0_5_0.md) | Correctness constraints |
| [Systems_Manual_v0_5_0.md](../10_canon/Systems_Manual_v0_5_0.md) | System behavior spec |
| [Rulebook_v0_5_0.md](../10_canon/Rulebook_v0_5_0.md) | Player-facing rules |
| [Game_Bible_v0_5_0.md](../10_canon/Game_Bible_v0_5_0.md) | Design philosophy |
| [Phase_Specifications_v0_5_0.md](../10_canon/Phase_Specifications_v0_5_0.md) | Frozen phase specs |
| [Phase_0_Specification_v0_5_0.md](../10_canon/Phase_0_Specification_v0_5_0.md) | Phase 0 spec |
| [Phase_I_Specification_v0_5_0.md](../10_canon/Phase_I_Specification_v0_5_0.md) | Phase I spec |
| [Phase_II_Specification_v0_5_0.md](../10_canon/Phase_II_Specification_v0_5_0.md) | Phase II spec |

## Engineering (docs/20_engineering/)

- [AGENT_WORKFLOW.md](../20_engineering/AGENT_WORKFLOW.md) — mandatory first-read pointer
- [CODE_CANON.md](../20_engineering/CODE_CANON.md) — code entrypoints and conventions
- [DETERMINISM_TEST_MATRIX.md](../20_engineering/DETERMINISM_TEST_MATRIX.md) — determinism gates and tests
- [PIPELINE_ENTRYPOINTS.md](../20_engineering/PIPELINE_ENTRYPOINTS.md) — scenario, map, baseline entrypoints
- [REPO_MAP.md](../20_engineering/REPO_MAP.md) — repo layout and “change X → go here”
- [MAP_BUILD_SYSTEM.md](../20_engineering/MAP_BUILD_SYSTEM.md) — map build commands and contracts
- [MAP_RENDERING_PIPELINE.md](../20_engineering/MAP_RENDERING_PIPELINE.md) — map rendering pipeline
- [TACTICAL_MAP_SYSTEM.md](../20_engineering/TACTICAL_MAP_SYSTEM.md) — tactical map UI (Canvas 2D, War Status, orders/AAR/events, recruitment toolbar and modal §13.8, desktop mode; New Game side picker §13.6, §21)
- [DESKTOP_GUI_IPC_CONTRACT.md](../20_engineering/DESKTOP_GUI_IPC_CONTRACT.md) — Electron main/renderer IPC contract for desktop "play myself" flow (start-new-campaign for New Game side picker, load-scenario-dialog, advance-turn, recruitment IPC)
- [GUI_PLAYBOOK_DESKTOP.md](../20_engineering/GUI_PLAYBOOK_DESKTOP.md) — playbook: load scenario/state, advance turn, AAR, replay
- [GUI_DESIGN_BLUEPRINT.md](../20_engineering/GUI_DESIGN_BLUEPRINT.md) — GUI design and phased delivery (Phases 2–4); NATO ops center dark theme implemented 2026-02-14 ([GUI_VISUAL_OVERHAUL_NATO_OPS_CENTER_2026_02_14.md](../40_reports/implemented/GUI_VISUAL_OVERHAUL_NATO_OPS_CENTER_2026_02_14.md))
- [MILITIA_BRIGADE_FORMATION_DESIGN.md](../20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md) — militia/brigade pool semantics, formation spawn, large-settlement resistance, displaced
- [ADR/](../20_engineering/ADR/) — architecture decision records
- [repo/](../20_engineering/repo/) — repo policies (tracked artifacts, node_modules)
- [specs/](../20_engineering/specs/) — phase/sim and map specs

## Planning (docs/30_planning/)

- [ROADMAP_v1_0.md](../30_planning/ROADMAP_v1_0.md) — implementation roadmap to v1.0
- [EXECUTIVE_ROADMAP.md](../30_planning/EXECUTIVE_ROADMAP.md) — executive phases (1–7)
- [MVP_CHECKLIST.md](../30_planning/MVP_CHECKLIST.md) — MVP scope and gates
- [V1_0_PACKAGING.md](../30_planning/V1_0_PACKAGING.md) — v1.0 packaging notes
- [V0_4_CANON_ALIGNMENT.md](../30_planning/V0_4_CANON_ALIGNMENT.md) — v0.4→v0.5 canon alignment (current canon: v0.5.0)
- [missing_systems_roadmap.md](../30_planning/missing_systems_roadmap.md) — missing systems roadmap
- Gap/addendum: [gap_analysis.md](../30_planning/gap_analysis.md), [AWWV_Gap_Systems_*](../30_planning/)

## Reports (docs/40_reports/)

- **Entrypoint:** [40_reports/README.md](../40_reports/README.md) — master index and structure (2026-02-13).
- **Consolidated views:** [CONSOLIDATED_IMPLEMENTED.md](../40_reports/CONSOLIDATED_IMPLEMENTED.md) (what’s done), [CONSOLIDATED_BACKLOG.md](../40_reports/CONSOLIDATED_BACKLOG.md) (what’s not yet done), [CONSOLIDATED_LESSONS_LEARNED.md](../40_reports/CONSOLIDATED_LESSONS_LEARNED.md) (patterns and corrections).
- **Cleanup plan:** [ORCHESTRATOR_40_REPORTS_CLEANUP_AND_CONSOLIDATION_2026_02_13.md](../40_reports/ORCHESTRATOR_40_REPORTS_CLEANUP_AND_CONSOLIDATION_2026_02_13.md).
- Subfolders: [audit/](../40_reports/audit/), [implemented/](../40_reports/implemented/), [backlog/](../40_reports/backlog/), [convenes/](../40_reports/convenes/), [handovers/](../40_reports/handovers/). Custodian: `.cursor/skills/reports-custodian/SKILL.md`.
- **GUI design advisor handover:** [handovers/GUI_DESIGN_ADVISOR_HANDOVER_2026_02_14.md](../40_reports/handovers/GUI_DESIGN_ADVISOR_HANDOVER_2026_02_14.md) — report for expert GUI/UX advisor (what exists, what’s planned, what we need: layout, readability, panels, controls) before Phase 3/4.
- Handovers and implementation: [handovers/HANDOVER_WARROOM_GUI.md](../40_reports/handovers/HANDOVER_WARROOM_GUI.md), [backlog/IMPLEMENTATION_PLAN_GUI_MVP.md](../40_reports/backlog/IMPLEMENTATION_PLAN_GUI_MVP.md), [implemented/WARROOM_GUI_IMPLEMENTATION_REPORT.md](../40_reports/implemented/WARROOM_GUI_IMPLEMENTATION_REPORT.md); Phase completion: [implemented/](../40_reports/implemented/) (PHASE_*_COMPLETION_REPORT, BRIGADE_OPERATIONS_SYSTEM_COMPLETION_REPORT, RECRUITMENT_UI_FROM_MAP_2026_02_14).

## Research (docs/50_research/)

- [awwv_gap_analysis_vs_best_practices.md](../50_research/awwv_gap_analysis_vs_best_practices.md), [war_sims_best_practices.md](../50_research/war_sims_best_practices.md), [gui_improvements_backlog.md](../50_research/gui_improvements_backlog.md)
- [knowledge/](../knowledge/) — knowledge base and AWWV project notes (at docs root for tooling)

## Archive (docs/_old/)

Superseded docs only; never delete. See [docs/_old/README.md](../_old/README.md) for policy and index.

---

## How to keep docs clean

- **What goes where:** Canon (rules, invariants, manuals) → `10_canon/`. Engineering (pipelines, determinism, repo map, ADR) → `20_engineering/`. Roadmaps, MVP, packaging → `30_planning/`. Implementation reports, handovers, audits → `40_reports/`. Research and comparisons → `50_research/`.
- **Archiving:** When a doc is superseded, move it to `docs/_old/` (optionally into a subfolder). Update `_old/README.md` index. Do not delete.
- **Never delete:** Preserve history; archive instead.
