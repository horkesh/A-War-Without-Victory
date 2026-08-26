# Documentation index — A War Without Victory

**Purpose:** Single entrypoint for AWWV documentation. Use this to find canonical truth, engineering references, planning, and reports.

## Where to start

- **New player guide:** [NEW_PLAYER_GUIDE.md](NEW_PLAYER_GUIDE.md) - player-facing walkthrough for the gap between finishing the in-game tutorial and understanding the weekly turn loop. Bosnian-language parallel: [VODIC_ZA_NOVE_IGRACE.md](VODIC_ZA_NOVE_IGRACE.md).

- **Process and workflow:** [docs/10_canon/context.md](../10_canon/context.md) — mandatory first read for agents and contributors (ledger, mistake guard, determinism).
- **Political control:** Control is **settlement-level** (each settlement has a controller); municipality-level control is a derived view (e.g. majority of settlements) for display only. See [Systems_Manual_v0_9_0.md § System 11](../10_canon/Systems_Manual_v0_9_0.md).
- **Pyrrhic roster and handoffs:** [.cursor/AGENT_TEAM_ROSTER.md](../../.cursor/AGENT_TEAM_ROSTER.md) — Pyrrhic Games (subagent collective); when to invoke which specialist; clarification-first and handoff rules.
- **Canon (game truth):** [docs/10_canon/CANON.md](../10_canon/CANON.md) — canonical doc index and precedence order; includes industry mapping (GDD / TDD / process) for readers used to standard game-dev docs.
- **Project state:** [docs/PROJECT_LEDGER.md](../PROJECT_LEDGER.md) — changelog and current state (at docs root).
- **Calibration authority:** [CALIBRATION_MASTER.md](../40_reports/CALIBRATION_MASTER.md) — current checkpoint, accepted run, retired surfaces, residuals, and calibration debt. Further calibration is paused until RE closes, and no current run satisfies lean RE S0. The sole scoring scenario is `data/scenarios/apr1992_definitive_188w.json`; January 1993 is evaluated at week 39 of that master, never in a separate 40-week scenario.

## Canon set (docs/10_canon/)

| Doc | Role |
|-----|------|
| [CANON.md](../10_canon/CANON.md) | Index and precedence |
| [context.md](../10_canon/context.md) | Process canon |
| [FORAWWV.md](../10_canon/FORAWWV.md) | Validated design insights (addenda) |
| [Engine_Invariants_v0_9_0.md](../10_canon/Engine_Invariants_v0_9_0.md) | Correctness constraints |
| [Systems_Manual_v0_9_0.md](../10_canon/Systems_Manual_v0_9_0.md) | System behavior spec |
| [Rulebook_v0_9_0.md](../10_canon/Rulebook_v0_9_0.md) | Player-facing rules |
| [Game_Bible_v0_9_0.md](../10_canon/Game_Bible_v0_9_0.md) | Design philosophy |
| [Phase_Specifications_v0_9_0.md](../10_canon/Phase_Specifications_v0_9_0.md) | Frozen phase specs |
| [War_Specification_v0_9_0.md](../10_canon/War_Specification_v0_9_0.md) | War spec |

## Engineering (docs/20_engineering/)

- [AGENT_WORKFLOW.md](../20_engineering/AGENT_WORKFLOW.md) — mandatory first-read pointer
- [CODE_CANON.md](../20_engineering/CODE_CANON.md) — code entrypoints and conventions
- [DETERMINISM_TEST_MATRIX.md](../20_engineering/DETERMINISM_TEST_MATRIX.md) — determinism gates and tests
- [PIPELINE_ENTRYPOINTS.md](../20_engineering/PIPELINE_ENTRYPOINTS.md) — scenario, map, baseline entrypoints
- [REPO_MAP.md](../20_engineering/REPO_MAP.md) — repo layout and “change X → go here”
- [MAP_BUILD_SYSTEM.md](../20_engineering/MAP_BUILD_SYSTEM.md) — map build commands and contracts
- [MAP_RENDERING_PIPELINE.md](../20_engineering/MAP_RENDERING_PIPELINE.md) — map rendering pipeline
- [TACTICAL_MAP_SYSTEM.md](../20_engineering/TACTICAL_MAP_SYSTEM.md) — **§0:** canonical map = React + MapLibre app (`src/ui/map/`, `npm run dev:map`); [20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md](../40_reports/20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md); includes the case-file New Campaign flow, Field Records, tactical-map UI, order staging IPC, recruitment, embedded warroom shell, accessibility, and legacy rendering context.
- [DESKTOP_GUI_IPC_CONTRACT.md](../20_engineering/DESKTOP_GUI_IPC_CONTRACT.md) — Electron main/renderer IPC contract for explicit-mode campaign creation, safe Field Records, load-state, advance-turn, and recruitment paths.
- [GUI_PLAYBOOK_DESKTOP.md](../20_engineering/GUI_PLAYBOOK_DESKTOP.md) — playbook: load scenario/state, advance turn, AAR, replay
- [GUI_DESIGN_BLUEPRINT.md](../20_engineering/GUI_DESIGN_BLUEPRINT.md) — GUI design and phased delivery (Phases 2–4); NATO ops center dark theme implemented 2026-02-14 ([IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md §6](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md))
- [MILITIA_BRIGADE_FORMATION_DESIGN.md](../20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md) — militia/brigade pool semantics, formation spawn, large-settlement resistance, displaced
- [ADR/](../20_engineering/ADR/) — architecture decision records
- [repo/](../20_engineering/repo/) — repo policies (tracked artifacts, node_modules)
- [specs/](../20_engineering/specs/) — phase/sim and map specs
- [NIGHTSHIFT_HANDOFF_TEMPLATE.md](../20_engineering/NIGHTSHIFT_HANDOFF_TEMPLATE.md) — template for autonomous night shift handoffs
- [Night Shift Skill](../../.claude/skills/nightshift/SKILL.md) — autonomous implementation manager protocol
- [PYRRHIC_PLANNING_RULES.md](../20_engineering/PYRRHIC_PLANNING_RULES.md) — mandatory plan compliance rules (includes night shift handoff requirements)

## Planning (docs/plans/)

**Current override (2026-08-27):** engine health precedes further calibration. The separate probe
prerequisite closed at `b711cffa9`; it is not part of RE. [Lean Engine Integrity](../plans/2026-08-26-engine-integrity-plan.md)
completed T0 at base `38e65547882856fba07faab7a6dbcd4258da9607`, closed T1A, and is executing
T1B followed by T1C before S0. The first Node-22 pair is reproducible pre-fix evidence only, not S0. Owner ruling
ALL requires every validated battle contributor to permit occupation, with explicit `false`
vetoes and missing declarations defaulting `true`; T1B applies that generic rule. T1C then restores
unconditional final sector owner-truth convergence and completes exact-parent/candidate performance
proof before a fresh exact-code-commit S0 and serial execution through RE-6. The
[full-team dispositions](../40_reports/proposals/20260826_ENGINE_INTEGRITY_TEAM_DISPOSITIONS.md)
index the review; frozen discovery remains report evidence. Further calibration and R8 wait on RE.
No current calibration artifact satisfies RE S0.

**Current control plane (synchronized 2026-08-27):** [MASTER_ROADMAP.md](../plans/MASTER_ROADMAP.md) is the sole authority for unfinished product work. R1–R6 and narrow RC are closed. R7 audio implementation landed at `2d106e5e0`; human listen/sensitivity, English accessibility/readability, offline browser and packaged proof remain. RE T1 is in progress: T1A is closed, T1B mixed-battle occupation convergence is active, T1C unconditional final sector owner truth follows, and only then may the fresh Node-22 S0 run; the prior pair remains pre-fix evidence only. [COMMAND_BOARD.md](../plans/COMMAND_BOARD.md) is the derived dispatch view, and the [plans index](../plans/README.md) links the sole executable packets. Collapse D-topology and multilingual localization remain post-1.0. Old WP-9/D2/D3/D4, Free War, FORAWWV-decision, Standing-OG-verdict, localization-reviewer, and release-operator queues are historical inputs, not separate authorities.

The remaining files under `docs/30_planning/` are design specifications, not active execution queues: [multi-brigade operations](../30_planning/MULTI_BRIGADE_OPERATION_DESIGN_SPEC.md), [operation reevaluation](../30_planning/OPERATION_REEVALUATION_DESIGN_SPEC.md), and [spatial context](../30_planning/SPATIAL_CONTEXT_DESIGN_SPEC.md). Historical plans removed from that folder remain available through Git history and the ledgers.

## Reports (docs/40_reports/)

- **Entrypoint:** [40_reports/README.md](../40_reports/README.md) — master index and structure (2026-02-13).
- **Latest D2 closeout:** [implemented/20260731_D2_OWNER_DIARY_REMEDIATION_AND_REPOSITORY_CLOSEOUT.md](../40_reports/implemented/20260731_D2_OWNER_DIARY_REMEDIATION_AND_REPOSITORY_CLOSEOUT.md) — seven owner diaries, preserved evidence, bug-first remediation, open friction lanes, and repository reconciliation.
- **Consolidated views:** [CONSOLIDATED_IMPLEMENTED.md](../40_reports/CONSOLIDATED_IMPLEMENTED.md) (what’s done; single doc [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md), reports archived 2026-02-15), [CONSOLIDATED_BACKLOG.md](../40_reports/CONSOLIDATED_BACKLOG.md) (what’s not yet done), [CONSOLIDATED_LESSONS_LEARNED.md](../40_reports/CONSOLIDATED_LESSONS_LEARNED.md) (patterns and corrections).
- **Cleanup plan:** [ORCHESTRATOR_40_REPORTS_CLEANUP_AND_CONSOLIDATION_2026_02_13.md](../40_reports/ORCHESTRATOR_40_REPORTS_CLEANUP_AND_CONSOLIDATION_2026_02_13.md).
- Subfolders: [audits/](../40_reports/audits/), [implemented/](../40_reports/implemented/), [backlog/](../40_reports/backlog/), [convenes/](../40_reports/convenes/), [handovers/](../40_reports/handovers/), [playtests/](../40_reports/playtests/). Custodian: `.cursor/skills/reports-custodian/SKILL.md`.
- **Latest GUI research review:** [convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md](../40_reports/convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md) — orchestrator-led player-perspective review of warroom + tactical map; flags hidden systems, hierarchy issues, faction-pride opportunities, and calls for right-drill sliding panels instead of stacked detail panels.
- **Latest GUI implementation report:** [implemented/20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md](../40_reports/implemented/20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md) — delivered map panel rail, warroom scene-plate contract, hotspot-anchor routing, and faction-identity presentation updates.
- **Warroom image-generation handover:** [handovers/20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md](../40_reports/handovers/20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md) — detailed single-image warroom brief for `nano banana`, including master composition, faction variants, hotspot mapping, modal anchors, and the constraint that only flag/calendar/ticker remain separate runtime elements.
- **Corps sector system overhaul:** [20260308_SECTOR_SYSTEM_OVERHAUL.md](../40_reports/20260308_SECTOR_SYSTEM_OVERHAUL.md) — territory cap (MAX_TERRITORY_OSIDS=40), density equalization, exempt corps, ghost sector filtering, BFS-through-friendly adjacency. n403 = 86.9% ATH.
- **React map app (canonical GUI) — status for external review:** [20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md](../40_reports/20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md) — full done/remaining vs AWWV_GUI_ARCHITECTURE_REWORK_v2.md; file inventory; verification checklist.
- **Implemented work:** [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) — all implemented reports in one doc (sections 1–29; §10 = Warroom/Phase 0 and systems integration; §11 = Warroom restyle, Apr 1992 scenario fix, embedded map, fog-of-war; §12–§14 = org-pen init, capital trickle, deferred recruitment; §15–§16 = tactical map layers UX and GUI corrections; §17 = Staff Map 4th zoom layer and settlement border removal; §18 = Staff Map 12 visual enhancements; §19 = Staff Map crest stamp and war map barbed-wire front lines; §20 = War map enhanced formation markers; §21 = Front line defended/undefended and AoR crosshatch; §22 = War map labels, AoR auto, front/AoR cleanup; §23 = displacement refactor shared utils; §24 = Dual defensive arc front lines; §25 = Faction AI improvements all phases; §26 = Tactical map UX 2026-02-19: accessibility, visual feedback, typography, color, discoverability, loading/error/empty states, optional tour; §27 = GUI and map frontline rework 2026-02-21; §28 = Front system comprehensive rebuild 2026-02-21; §29 = Headless corps fronts and run_summary tracking 2026-02-21); originals archived to docs/_old/40_reports/implemented_2026_02_15/; new reports in [implemented/](../40_reports/implemented/). Handover: [implemented/HANDOVER_WARROOM_GUI.md](../40_reports/implemented/HANDOVER_WARROOM_GUI.md). Backlog: themed docs in [backlog/](../40_reports/backlog/) (BACKLOG_*.md; originals archived 2026-02-24 to docs/_old/40_reports/backlog/); see [CONSOLIDATED_BACKLOG.md](../40_reports/CONSOLIDATED_BACKLOG.md).

## Research (docs/50_research/)

- [awwv_gap_analysis_vs_best_practices.md](../50_research/awwv_gap_analysis_vs_best_practices.md), [war_sims_best_practices.md](../50_research/war_sims_best_practices.md), [gui_improvements_backlog.md](../50_research/gui_improvements_backlog.md)
- [knowledge/](../knowledge/) — knowledge base and AWWV project notes (at docs root for tooling)

## Player-Facing Guides

- [NEW_PLAYER_GUIDE.md](NEW_PLAYER_GUIDE.md) - practical first-session guide covering premise, weekly loop, faction advice, toolbar, OpsPlanningModal, Decision Room, common mistakes, and glossary-style tips.

## Versioning

See [docs/20_engineering/VERSIONING.md](../20_engineering/VERSIONING.md) for the game versioning system (MAJOR.MINOR.PATCH). Current package version: **v0.9.9-beta.1**. Canon document versions are independent of the game/package version; active canon is **v0.9.0**.

---

## How to keep docs clean

- **What goes where:** Canon (rules, invariants, manuals) → `10_canon/`. Engineering (pipelines, determinism, repo map, ADR) → `20_engineering/`. Roadmaps, MVP, packaging → `30_planning/`. Implementation reports, handovers, audits → `40_reports/`. Research and comparisons → `50_research/`.
- **Archiving:** When a doc is superseded, move it to `docs/_old/` (optionally into a subfolder). Update `_old/README.md` index. Do not delete.
- **Never delete:** Preserve history; archive instead.
