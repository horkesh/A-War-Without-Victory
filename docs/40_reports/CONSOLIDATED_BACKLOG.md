# Consolidated: Backlog / Not Yet Implemented (40_reports)

**Purpose:** Single view of plans, designs, and research that have **not** been fully implemented. Use for prioritization and scope control.

**Structure (2026-02-24):** Backlog items are grouped into **themed docs** in [backlog/](backlog/). Original single-topic docs were archived to [docs/_old/40_reports/backlog/](../_old/40_reports/backlog/); see [docs/_old/README.md](../_old/README.md) §40_reports/backlog for the index. No planned work dropped—every archived filename is listed in the themed doc for that theme.

**Scope:** Post-MVP (Phase 7) unless otherwise noted. MVP scope remains frozen per Executive Roadmap.

---

## 1. Phase 7 / Master Early Docs queue

| Report | Summary | Priority / owner |
|--------|---------|-------------------|
| [BACKLOG_PHASE7_MASTER_EARLY_DOCS.md](backlog/BACKLOG_PHASE7_MASTER_EARLY_DOCS.md) | Phase A (AI, victory, production), Phase B (events, campaign, negotiation, coercion), Phase C (multiplayer, UI). B1/B2/B4 implemented; **B3 negotiation counter-offers** not started. AI opponent critical path. Originals: IMPLEMENTATION_PLAN_MASTER_EARLY_DOCS, PHASE7_BACKLOG_QUEUE_*, MASTER_EARLY_DOCS_ANALYSIS_REPORT → _old/40_reports/backlog/. | Post-MVP; PM for sequencing. |

---

## 2. Historical fidelity and research

| Report | Summary | Priority / owner |
|--------|---------|-------------------|
| [BACKLOG_HISTORICAL_FIDELITY_AND_RESEARCH.md](backlog/BACKLOG_HISTORICAL_FIDELITY_AND_RESEARCH.md) | Research plan, success criteria, model design, VRS/ARBiH trajectory analysis, Apr 1992 runs examination. Originals (5) → _old/40_reports/backlog/. | Research / design. |
| [PARADOX_HISTORICAL_TROOP_NUMBERS_SEPT1992_CONVENE.md](convenes/PARADOX_HISTORICAL_TROOP_NUMBERS_SEPT1992_CONVENE.md) | Convene on historical troop numbers (Sept 1992). | Design input. |

---

## 3. Brigade / military / militia design (future)

| Report | Summary | Priority / owner |
|--------|---------|-------------------|
| [BACKLOG_BRIGADE_MILITIA_MILITARY.md](backlog/BACKLOG_BRIGADE_MILITIA_MILITARY.md) | Brigade realism/military fronts, militia/brigade rework plan, formation vs OOB comparison, RBiH–HRHB alliance redesign (core implemented). Originals (4) → _old/40_reports/backlog/. | Post-MVP / research / design. |
| [RBIH_HRHB_ALLIANCE_BREAKDOWN_AND_WAR_PLAN.md](../30_planning/RBIH_HRHB_ALLIANCE_BREAKDOWN_AND_WAR_PLAN.md) | RBiH–HRHB war-within-a-war: alliance-aware targeting, endogenous degradation, Phase 0 handoff. Phase A complete; Phases B/C not started. | Planning; Gameplay Programmer / Game Designer. |
| **Paramilitary / rear-cleanup units** | **Implemented 2026-03-07.** Core system live: autonomous pocket detection, faction-differentiated spawn, 2-turn march, capture + dissolve, casualty recording, player policy. See [20260307_PARAMILITARY_SWEEP_FEATURE.md](implemented/20260307_PARAMILITARY_SWEEP_FEATURE.md). Remaining: consequence scaling (IVP/legitimacy), player UI batch panel, per-army named units. Original convene: [PARADOX_RS_JNA_PARAMILITARY_PER_ARMY_FLAVOR_2026_02_18.md](convenes/PARADOX_RS_JNA_PARAMILITARY_PER_ARMY_FLAVOR_2026_02_18.md). | Done (core); Design for flavor/consequences. |
| **Per-army flavor** | Same convene as above. Paramilitary core implemented; named units (Arkan's Tigers, HOS, etc.) remain backlog. | Design: Game Designer; Formation-expert for OOB/stats. |

---

## 4. GUI / War Planning Map / Warroom (design and handovers)

| Report | Summary | Priority / owner |
|--------|---------|-------------------|
| [BACKLOG_GUI_WARROOM_WAR_PLANNING_MAP.md](backlog/BACKLOG_GUI_WARROOM_WAR_PLANNING_MAP.md) | GUI MVP, War Planning Map (proposal, discussion, duty delegation), Warroom setup/Phase 0, start-of-game info, click alignment, asset brief, strategic direction, phased plan. Originals (10) → _old/40_reports/backlog/. | PM / UI / design. |
| [BACKLOG_UI_AND_ASSET_SPECS.md](backlog/BACKLOG_UI_AND_ASSET_SPECS.md) | UI design/NATO/clickable regions specs; UI designer/systems/temporal; Photoshop/SORA asset specs. Originals (9) → _old/40_reports/backlog/. | Design. |
| [20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md](convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md) | Orchestrator-led comprehensive GUI review of warroom + tactical map from the player's perspective. Key backlog outputs: command-briefing hierarchy, player-facing vs utility-strip split, right-drill sliding detail panels, stronger faction identity, and better surfacing of existing systems such as IVP, convoys, enclaves, OPSEC, officers, honors, and operation health. | PM to sequence; UI/UX Developer + Technical Architect. |
| [20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md](handovers/20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md) | Production-oriented warroom art handover for a single-image pipeline: `nano banana` prompt pack, fixed composition rules, faction variants, hotspot layout logic, modal-anchor recommendations, and explicit rule that only flag/calendar/ticker stay separate at runtime. | UI/UX / asset-generation operator; implementation owner to align hotspots. |
| [WAR_PLANNING_MAP_CLARIFICATION_REQUEST.md](handovers/WAR_PLANNING_MAP_CLARIFICATION_REQUEST.md) | Clarification request; status Filled. | Handoff. |
| [WARROOM_OPTION_B_IMPLEMENTATION_HANDOVER.md](handovers/WARROOM_OPTION_B_IMPLEMENTATION_HANDOVER.md), [GUI_WAR_PLANNING_MAP_EXPERT_HANDOVER.md](handovers/GUI_WAR_PLANNING_MAP_EXPERT_HANDOVER.md), [GUI_MAP_ONLY_EXTERNAL_EXPERT_HANDOVER.md](handovers/GUI_MAP_ONLY_EXTERNAL_EXPERT_HANDOVER.md) | Handovers for Warroom / War Planning Map / map-only. | Handoff. |
| [PARADOX_WAR_PLANNING_MAP_FULL_SCENE_TEAM_CONVENE.md](convenes/PARADOX_WAR_PLANNING_MAP_FULL_SCENE_TEAM_CONVENE.md) | Full-scene team convene. | Process. |
| [BATCH_ADVANCE_TWO_WEEKS_UI_PLAN.md](../30_planning/BATCH_ADVANCE_TWO_WEEKS_UI_PLAN.md) | Batch-advance N turns in warroom UI. | Planning; PM / UI. |
| [BACKLOG_PHASE_D_E_G_DIRECTIVES.md](backlog/BACKLOG_PHASE_D_E_G_DIRECTIVES.md) | Phase D completion report, Phase E spatial directive, Phase G UI notes. Originals (3) → _old/40_reports/backlog/. | Reference. |
| **Phase 0 referendum/deadline fix (priority C)** | **Implemented 2026-02-18.** Convene: [PRIORITY_C_PHASE0_REFERENDUM_DEADLINE_HANDOFF_2026_02_18.md](convenes/PRIORITY_C_PHASE0_REFERENDUM_DEADLINE_HANDOFF_2026_02_18.md). | Done. |

---

## 5. Map / census / external handovers

| Report | Summary | Priority / owner |
|--------|---------|-------------------|
| [BACKLOG_TERRAIN_MAP_AND_CENSUS.md](backlog/BACKLOG_TERRAIN_MAP_AND_CENSUS.md) | Terrain derivation/scalars/pipeline audit; 1991 census feasibility. Originals (4) → _old/40_reports/backlog/. | Research / design. |
| [MAP_RIVER_CLIP_ALIGNMENT_EXPERT_HANDOVER.md](handovers/MAP_RIVER_CLIP_ALIGNMENT_EXPERT_HANDOVER.md), [MAP_HANDOVER_BRIEF_EXTERNAL_CONSULTANCY.md](handovers/MAP_HANDOVER_BRIEF_EXTERNAL_CONSULTANCY.md) | Map handovers. | Handoff. |
| [PARADOX_CENSUS_1991_MASTER_TEAM_CONVENE.md](convenes/PARADOX_CENSUS_1991_MASTER_TEAM_CONVENE.md) | 1991 census convene. | Research / design. |
| [EXTERNAL_EXPERT_HANDOVER.md](handovers/EXTERNAL_EXPERT_HANDOVER.md) | Generic external expert handover. | Handoff. |
| **OSID-first build pipeline (Phase 2 B(a))** | **Implemented 2026-02-24.** See [20260224_OSID_AS_BASE_LAYER_PHASE2_IMPLEMENTATION.md](implemented/20260224_OSID_AS_BASE_LAYER_PHASE2_IMPLEMENTATION.md). | Done. |

---

## 6. Other convenes, meetings, and process

| Report | Summary | Priority / owner |
|--------|---------|-------------------|
| [PARADOX_STATE_OF_GAME_MEETING_2026_02_08.md](convenes/PARADOX_STATE_OF_GAME_MEETING_2026_02_08.md), [PARADOX_STATE_OF_GAME_MEETING_2026_02_08_THIRD.md](convenes/PARADOX_STATE_OF_GAME_MEETING_2026_02_08_THIRD.md), [PARADOX_STATE_OF_GAME_MEETING_2026_02_15.md](convenes/PARADOX_STATE_OF_GAME_MEETING_2026_02_15.md), [PARADOX_STATE_OF_GAME_MEETING_2026_02_17.md](convenes/PARADOX_STATE_OF_GAME_MEETING_2026_02_17.md), [PRIORITY_C_PHASE0_REFERENDUM_DEADLINE_HANDOFF_2026_02_18.md](convenes/PRIORITY_C_PHASE0_REFERENDUM_DEADLINE_HANDOFF_2026_02_18.md) | State-of-game meetings; Phase 0 referendum handoff. | Process / reference. |
| [PARADOX_PHASE0_ORCHESTRATOR_REPORT.md](convenes/PARADOX_PHASE0_ORCHESTRATOR_REPORT.md) | Phase 0 orchestrator report. | Reference. |
| [PARADOX_TACTICAL_MAP_CANONICAL_DEPRECATION_CONVENE.md](convenes/PARADOX_TACTICAL_MAP_CANONICAL_DEPRECATION_CONVENE.md) | Tactical map canonical deprecation convene. | Process. |
| [PARADOX_RBIH_WIPEOUT_FIX_MEETING.md](convenes/PARADOX_RBIH_WIPEOUT_FIX_MEETING.md) | RBiH wipeout fix meeting. | Design input. |
| [PARADOX_ORCHESTRATOR_50W_APR1992_BOTS_RUN_REPORT.md](convenes/PARADOX_ORCHESTRATOR_50W_APR1992_BOTS_RUN_REPORT.md) | 50-week Apr 1992 bots run report. | Reference. |
| [BACKLOG_GUI_WARROOM_WAR_PLANNING_MAP.md](backlog/BACKLOG_GUI_WARROOM_WAR_PLANNING_MAP.md), [BACKLOG_UI_AND_ASSET_SPECS.md](backlog/BACKLOG_UI_AND_ASSET_SPECS.md) | Warroom click alignment, asset brief, clickable regions → themed docs above. | Design. |
| [HANDOVER_WARROOM_GUI.md](handovers/HANDOVER_WARROOM_GUI.md) | Warroom GUI handover. | Handoff. |
| [BACKLOG_PROCESS_AND_REFERENCE.md](backlog/BACKLOG_PROCESS_AND_REFERENCE.md) | Repo cleanup discovery; scenario run reference. Originals (2) → _old/40_reports/backlog/. | Process. |
| Dead-code / cleanup | **Stale knip report** (root) removed 2026-02-24. **In-repo audit** (`npm run repo:cleanup:audit`) has false positives (e.g. src/operational_data.ts, electron-main.cjs marked orphan). Only verified-safe root orphans were deleted. See [20260224_DEAD_CODE_REPORT_VERIFICATION.md](audit/20260224_DEAD_CODE_REPORT_VERIFICATION.md) §6–§7. | Tech Debt; use audit as candidate list only; verify each before delete. |
| `TACTICAL_SANDBOX_3D_POST_INTEGRATION_ROADMAP.md` (docs/30_planning/) | 3D Map polishing, visual overhaul, combat width limits. | Design / Tech Debt. |

---

## 7. Bot AI remaining work (from BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13 and CALIBRATION_REPORT_BOT_AI_FEB_2026)

**Open issues from Feb 2026 calibration report** ([CALIBRATION_REPORT_BOT_AI_FEB_2026.md](CALIBRATION_REPORT_BOT_AI_FEB_2026.md) §7): **Front-assignment bug (critical)** — all RS brigades assigned to HRHB-RS front, zero see RBiH-RS front; RS cannot attack Brčko/Posavina corridor regardless of scoring. **Corps personnel imbalance (high)** — VRS 1st Krajina 56K vs Sarajevo-Romanija 2.6K; ARBiH 2nd Corps 75K vs 4th Corps 0 brigades at week 0. **Enclave protection (high)** — Srebrenica, Goražde, Cazin fall to RS; no mechanism to model besieged enclaves that held historically. **ARBiH 4th Corps / 2nd Corps balance (medium)** — OOB available_from gating and turn-0 brigade distribution; RS at 59% not 60–65% (combination of above).

The report [BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13.md](../_old/40_reports/implemented_2026_02_15/BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13.md) (archived) lists **Remaining Issues (Future Work)**:

- AoR extreme imbalance (HIGH) — contiguity and surrounded-brigade reform done 2026-02-17; remaining imbalance may be addressed later.
- **RS early-war underperformance (MEDIUM)** — **Implemented 2026-02-18 (priority B):** RS early-war window extended 0–12 → 0–26 (doctrine, standing orders, attack share, corps E1). [PRIORITY_B_RS_EARLY_WAR_BOT_HANDOFF_2026_02_18.md](convenes/PRIORITY_B_RS_EARLY_WAR_BOT_HANDOFF_2026_02_18.md) (scope, acceptance criteria, implementation complete; 16w comparison vs baseline optional).
- **Defender casualties at zero (MEDIUM)** — **Implemented 2026-02-18:** Battle resolution uses a reporting floor when defender personnel ≤ MIN_COMBAT_PERSONNEL so report and casualty_ledger show non-zero defender losses; application remains capped so formation never drops below floor (battle_resolution.ts, Phase II Spec §12).
- **HRHB near-passive (LOW–MEDIUM)** — **Implemented 2026-02-18 (Candidate B):** HRHB Lasva Offensive window (weeks 12–26): higher effective attack share (0.45), non-Herzegovina corps nudged to at least balanced when avgPers ≥ 0.4 (bot_strategy.ts, bot_corps_ai.ts). [NEXT_BOT_PRIORITY_AOR_OR_HRHB_HANDOFF_2026_02_18.md](convenes/NEXT_BOT_PRIORITY_AOR_OR_HRHB_HANDOFF_2026_02_18.md) §5.
- Posture orders for forming brigades (LOW)
- Corps command not integrated with brigade AI (LOW)
- Operational groups not used by bot AI (LOW)

Treat these as backlog items for bot/brigade AI when prioritizing. **Next single bot priority (choose one):** [NEXT_BOT_PRIORITY_AOR_OR_HRHB_HANDOFF_2026_02_18.md](convenes/NEXT_BOT_PRIORITY_AOR_OR_HRHB_HANDOFF_2026_02_18.md) — Candidate A (AoR behavioral balance, HIGH) remains open; Candidate B (HRHB activity) implemented 2026-02-18. **Bot rewrite (OSID/ZoC):** External expert implementing per [BOT_AI_DESIGN_SPEC.md](../30_planning/design/BOT_AI_DESIGN_SPEC.md); in parallel, see §9 below.

---

## 9. Pipeline next (while bot rewrite)

**Single list of work that can proceed in parallel with the external expert’s bot AI rewrite** (no dependency on new bot):

| Report | Summary | Priority / owner |
|--------|---------|-------------------|
| [20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md](backlog/20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md) | **Critical:** War termination minimal spec, Player’s Turn Guide, supply spec. **Important:** Phase 0 JNA_status hand-off, Phase II ceasefire/Washington in pipeline, Phase I→II edge cases, Operation Storm spec, scoring. **AoR follow-ups:** phase-ii-recon-intelligence OSID, aor_init cleanup, test/baseline strategy. **Other:** Phase 0 output contract, GUI/Warroom items, headless vs desktop Phase II. Ordered suggestions in doc. | PM to sequence; Game Designer / Gameplay / Architect / QA per item. |

**War termination (1.1) work directive (2026-02-24):** [ORCHESTRATOR_WAR_TERMINATION_MINIMAL_SPEC_DIRECTIVE_2026_02_24.md](convenes/ORCHESTRATOR_WAR_TERMINATION_MINIMAL_SPEC_DIRECTIVE_2026_02_24.md) — Game Designer lead, Technical Architect oversee, Historian advise on historicity. Deliverable: minimal spec (Dayton-style end, faction goals, recurring initiatives, preconditions).

**Supply full-team convene (2026-02-24):** [ORCHESTRATOR_SUPPLY_FULL_TEAM_CONVENE_2026_02_24.md](convenes/ORCHESTRATOR_SUPPLY_FULL_TEAM_CONVENE_2026_02_24.md) — Full Paradox team input; innovative proposals (enclave resilience, corridor UI, supply_mult in bot scoring, optional hardening). **Single priority:** Supply design doc (OSID trace, supply_mult wiring, cascade, enclave/resilience rules, minimum supply UX). Owner: Technical Architect (lead author), Game Designer, Architect; PM to sequence implementation after sign-off. **Supply design doc:** [docs/30_planning/SUPPLY_DESIGN.md](../30_planning/SUPPLY_DESIGN.md).

---

## 10. Documented-but-unimplemented systems (canon/planning audit)

| Report | Summary | Priority / owner |
|--------|---------|-------------------|
| [DOCUMENTED_UNIMPLEMENTED_SYSTEMS_AUDIT_2026_02_15.md](audit/DOCUMENTED_UNIMPLEMENTED_SYSTEMS_AUDIT_2026_02_15.md) | Audit of systems/mechanics described in canon (Engine Invariants, Systems Manual, Phase specs), 30_planning (missing_systems_roadmap, gap_analysis), and docs that are not yet implemented or not in an implementation plan. Includes Phase 3B/3C, phase_ii_exhaustion_local, JNA equipment transfer, OG donor return, doctrines, MCZs, command degradation, player action constraints, milestone events. | Reference; PM/Orchestrator to decide plan inclusion. |
| [STRATEGIC_DESIGN_COUNCIL_AUDIT_2026_02_15.md](audit/STRATEGIC_DESIGN_COUNCIL_AUDIT_2026_02_15.md) | Paradox-style structural critique: genre mirror (vs EU/HoI/AGEOD), strategic honesty (illusion of control, friction, negative-sum, fragmentation, over-abstraction), UI misrepresentation (control/supply/cohesion), determinism risks, canon stress, FORAWWV addendum candidates. Diagnosis only; no new mechanics or canon edits. | Reference; design/UI when revisiting representation. |
| [INTEGRATION_AND_SYSTEMS_HANDOVER_EXTERNAL_EXPERT_2026_02_15.md](handovers/INTEGRATION_AND_SYSTEMS_HANDOVER_EXTERNAL_EXPERT_2026_02_15.md) | **External expert handover:** Integration of Warroom/Phase 0 (WARROOM_SETUP_AND_PHASE0_EXECUTION_PROPOSAL) with documented unimplemented systems (audit). Detailed integration description, interaction matrix, instructions/examples, risk flags and pushback, implementation order. Goal: fully fleshed-out game with systems talking to each other. | Handover to implementer. |

---

## 11. Comprehensive design review convene (2026-02-23)

Orchestrator convened Technical Architect and Product Manager to synthesize findings from the comprehensive design review ([20260222_awwv_comprehensive_review.md](../50_research/20260222_awwv_comprehensive_review.md)). Convene report: [ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md](convenes/ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md).

**Action items (PM to sequence):**

| Action | Priority | Owner |
|--------|----------|-------|
| Phase 0: Add JNA_status to §7 Hand-Off Data / §8 Output Contract | Important | Gameplay Programmer / Game Designer |
| Phase I/II: ceasefire/Washington pipeline steps for Phase II | Important | Gameplay Programmer |
| Rulebook: Player's Turn Guide (per-phase player actions) | Critical path | Game Designer |
| War termination minimal spec (when/how game ends, scoring) | Critical path | Game Designer / Gameplay Programmer |
| AoR/OSID/front reconciliation plan | Critical path | Technical Architect (plan); PM (sequence) |
| Supply spec (sources, OSID graph tracing, corridors, enclaves) | Critical path (after above) | Game Designer / Gameplay Programmer |

**Also in roadmap:** Phase I→II edge cases, Operation Storm spec, scoring/evaluation (important). Consequence Ledger, enclave events, JNA negotiation, Federation stress (nice-to-have / explore; no commitment).

---

## 13. Combat mechanics failures (n292 audit, 2026-03-07)

**Source report:** [20260307_N292_COMBAT_MECHANICS_REPORT.md](convenes/20260307_N292_COMBAT_MECHANICS_REPORT.md)

| Issue | Priority | Complexity | Owner |
|-------|----------|------------|-------|
| Equipment attrition mechanic (0 lost in 168 battles) | **P0** | Medium | Gameplay Programmer |
| Brigade dissolution at combat-ineffective threshold | **P0** | Low | Gameplay Programmer |
| RBiH supply constraint (100% under arms embargo) | **P0** | Medium | Gameplay Programmer / Game Designer |
| Fatigue accumulation/recovery rebalance (98% at zero) | **P1** | Low | Gameplay Programmer |
| Siege/bombardment casualty mechanic (inverted KIA ratio) | **P1** | Medium | Game Designer / Gameplay Programmer |
| HRHB cohesion floor reduction (50 → 25-30) | **P2** | Trivial | Gameplay Programmer |
| Enclave resilience dynamism (static after init) | **P2** | Medium | Game Designer / Gameplay Programmer |
| 65th Protection Regt garrison flag | **P3** | Trivial | OOB data |

---

## 14. Backlog archive index (2026-02-24 themed merge)

All former single-topic backlog docs are archived to **docs/_old/40_reports/backlog/**; full content preserved. Each themed doc in backlog/ (§1–§6) lists its archived source filenames and a short summary. **Standalone (not merged):** [20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md](backlog/20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md). Master archive index: [docs/_old/README.md](../_old/README.md) §40_reports/backlog. No planned work dropped.

---

*For implemented work, see [CONSOLIDATED_IMPLEMENTED.md](CONSOLIDATED_IMPLEMENTED.md). For lessons learned, see [CONSOLIDATED_LESSONS_LEARNED.md](CONSOLIDATED_LESSONS_LEARNED.md).*
