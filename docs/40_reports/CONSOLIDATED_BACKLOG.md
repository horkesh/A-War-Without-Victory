# Consolidated: Backlog / Not Yet Implemented (40_reports)

**Purpose:** Single view of plans, designs, and research that have **not** been fully implemented. Use for prioritization and scope control.

**Structure (2026-02-24):** Backlog items are grouped into **themed docs** in [backlog/](backlog/). Original single-topic docs were archived to [docs/_old/40_reports/backlog/](../_old/40_reports/backlog/); see [docs/_old/README.md](../_old/README.md) §40_reports/backlog for the index. No planned work dropped—every archived filename is listed in the themed doc for that theme.

**Scope:** Post-MVP (Phase 7) unless otherwise noted. MVP scope remains frozen per Executive Roadmap.

---

## 2026-05-17 Backlog Plan Coverage Update

The active roadmap/general backlog points below now have separate actionable plans. Use these as the implementation entry points before changing code or scenario data.

### 2026-05-17 Code Audit Follow-Up Coverage

The loose 2026-05-16 root audit artifacts are now promoted into `docs/40_reports/audits/` and converted into implementation entry points:

| Audit Source | Follow-Up Plan |
|---|---|
| [20260516_CODE_AUDIT.md](audits/20260516_CODE_AUDIT.md) findings 1/2/4/5/6 | IMPLEMENTED 2026-05-17: [20260517_CODE_AUDIT_EOL_SCENARIO_GUARDRAILS.md](implemented/20260517_CODE_AUDIT_EOL_SCENARIO_GUARDRAILS.md). Plan: [2026-05-17-code-audit-eol-and-scenario-guardrails-plan.md](../plans/2026-05-17-code-audit-eol-and-scenario-guardrails-plan.md). |
| [20260516_CODE_AUDIT.md](audits/20260516_CODE_AUDIT.md) findings 7-12 | IMPLEMENTED/VERIFIED 2026-05-17: [20260517_CODEX_SOURCE_QUALITY_LANE_B.md](audits/20260517_CODEX_SOURCE_QUALITY_LANE_B.md), [20260517_SCENARIO_INTEGRITY_WALK_LANE_B.md](audits/20260517_SCENARIO_INTEGRITY_WALK_LANE_B.md), [20260517_DECISION_ROOM_WALKTHROUGH_LANE_B.md](audits/20260517_DECISION_ROOM_WALKTHROUGH_LANE_B.md). Plan: [2026-05-17-code-audit-round2-residuals-plan.md](../plans/2026-05-17-code-audit-round2-residuals-plan.md). |
| [20260516_CODE_AUDIT_ROUND3_AAA_POLISH.md](audits/20260516_CODE_AUDIT_ROUND3_AAA_POLISH.md) | IMPLEMENTED 2026-05-17: [20260517_CODE_AUDIT_ROUND3_AAA_POLISH_FOLLOWUPS.md](implemented/20260517_CODE_AUDIT_ROUND3_AAA_POLISH_FOLLOWUPS.md). Plan: [2026-05-17-code-audit-round3-aaa-polish-followups-plan.md](../plans/2026-05-17-code-audit-round3-aaa-polish-followups-plan.md). |

Player-facing guide artifact: [NEW_PLAYER_GUIDE.md](../00_start_here/NEW_PLAYER_GUIDE.md).

| Backlog Point | Plan |
|---|---|
| Logistics Priority lever sim wiring | IMPLEMENTED 2026-05-17: [20260517_LOGISTICS_PRIORITY_WIRED.md](implemented/20260517_LOGISTICS_PRIORITY_WIRED.md). Plan: [2026-05-17-logistics-priority-wire-or-remove-plan.md](../plans/2026-05-17-logistics-priority-wire-or-remove-plan.md). |
| 188w endgame verification | IMPLEMENTED/CLOSED 2026-05-19: [20260517_ENDGAME_188W_VERIFICATION.md](audits/20260517_ENDGAME_188W_VERIFICATION.md) opened the accepted-with-signals lane; [20260519_LATE_WAR_188W_ANCHOR_RESIDUE.md](audits/20260519_LATE_WAR_188W_ANCHOR_RESIDUE.md) repaired Teocak and then closed the Brcko residue; [20260519_OPERATION_KORIDOR_BRCKO_CLOSURE.md](implemented/20260519_OPERATION_KORIDOR_BRCKO_CLOSURE.md) records the production fix. Current accepted pair: 40w n1918 `5c6e7b62fa6670c0` (27/27 anchors, 6/6 benchmarks, byte-identical to n1916) and 188w n1919 `7b57a8592f668137` (27/27 anchors, 6/6 benchmarks). Brcko now flips RBiH -> RS by combat at turn 5 through Operation Koridor's `brcko_corridor` axis. Remaining signals: `validate_run_consistency.cjs` still emits long-run structural sector/intel signals, and `op:teslic:kamenica_2 = HRHB` is a non-anchor/non-benchmark collateral residue. Plan: [2026-05-17-endgame-188w-verification-plan.md](../plans/2026-05-17-endgame-188w-verification-plan.md). |
| Sarajevo railroad/special-case canon decision | IMPLEMENTED 2026-05-17: [20260517_SARAJEVO_SPECIAL_CASING_BRANCH_B.md](implemented/20260517_SARAJEVO_SPECIAL_CASING_BRANCH_B.md). Plan: [2026-05-17-sarajevo-special-casing-canon-plan.md](../plans/2026-05-17-sarajevo-special-casing-canon-plan.md). |
| B3 negotiation counter-offers | IMPLEMENTED 2026-05-17: [20260517_B3_NEGOTIATION_COUNTER_OFFERS.md](implemented/20260517_B3_NEGOTIATION_COUNTER_OFFERS.md). Plan: [2026-05-17-b3-negotiation-counter-offers-plan.md](../plans/2026-05-17-b3-negotiation-counter-offers-plan.md). |
| RBiH-HRHB alliance breakdown Phases B/C | IMPLEMENTATION CLOSED 2026-05-17: Phase B + C1 coverage implemented in [20260517_RBIH_HRHB_PHASE_B_CLOSURE.md](implemented/20260517_RBIH_HRHB_PHASE_B_CLOSURE.md); Phase C2-C5 implemented in [20260517_RBIH_HRHB_PHASE_C_CLOSURE.md](implemented/20260517_RBIH_HRHB_PHASE_C_CLOSURE.md). Scenario hash probes remain parent/integration-owned. Plan: [2026-05-17-rbih-hrhb-alliance-breakdown-phase-bc-plan.md](../plans/2026-05-17-rbih-hrhb-alliance-breakdown-phase-bc-plan.md). |
| Paramilitary consequence scaling, batch UI, and named units | IMPLEMENTED 2026-05-17: [20260517_PARAMILITARY_FLAVOR_AND_CONSEQUENCES.md](implemented/20260517_PARAMILITARY_FLAVOR_AND_CONSEQUENCES.md). Plan: [2026-05-17-paramilitary-flavor-and-consequences-plan.md](../plans/2026-05-17-paramilitary-flavor-and-consequences-plan.md). |
| Operation AAR UI/read-model polish | IMPLEMENTED THROUGH BATCH 17 2026-05-18: Army HQ Records owns completed-operation deep review, Chronicle files compact player-scoped completed-operation cards, Chronicle operation-record actions open the matching Operation History row expanded/highlighted, and Records now shows per-axis objective status chips from existing `axis_summaries`. Reports: [20260518_OPERATION_AAR_RECORDS_BATCH14.md](implemented/20260518_OPERATION_AAR_RECORDS_BATCH14.md), [20260518_OPERATION_AAR_CHRONICLE_BATCH15.md](implemented/20260518_OPERATION_AAR_CHRONICLE_BATCH15.md), [20260518_OPERATION_AAR_BATCH16.md](implemented/20260518_OPERATION_AAR_BATCH16.md), [20260518_OPERATION_AAR_BATCH17.md](implemented/20260518_OPERATION_AAR_BATCH17.md). |
| Intel extensions | PARTIAL IMPLEMENTED 2026-05-18: first slice adds optional sorted per-OSID confidence/source evidence to `SectorIntelRecord` and commander belief estimation; Batch 11 adds deterministic execution-time intel friction in OSID attack resolution; Batch 12 adds public-safe AAR/read-model annotations for stale-intel and defender-OPSEC friction; Batch 13 feeds per-OSID confidence into deterministic corps offensive objective ordering; Batch 15 adds deterministic low-confidence OPSEC ambush attacker casualty friction with public `ambush_risk` label; Batch 16 extends that same bounded hook with reduced defender casualties; Batch 17 scales both casualty effects by observed confidence gap inside the existing bounds. Remaining open work is broader surprise/ambush design beyond the bounded casualty hook. Reports: [20260518_INTEL_EXTENSIONS_BATCH10.md](implemented/20260518_INTEL_EXTENSIONS_BATCH10.md), [20260518_INTEL_EXECUTION_FRICTION_BATCH11.md](implemented/20260518_INTEL_EXECUTION_FRICTION_BATCH11.md), [20260518_INTEL_FRICTION_AAR_ANNOTATION_BATCH12.md](implemented/20260518_INTEL_FRICTION_AAR_ANNOTATION_BATCH12.md), [20260518_INTEL_PER_OSID_TARGET_SCORING_BATCH13.md](implemented/20260518_INTEL_PER_OSID_TARGET_SCORING_BATCH13.md), [20260518_INTEL_AMBUSH_BATCH15.md](implemented/20260518_INTEL_AMBUSH_BATCH15.md), [20260518_INTEL_SURPRISE_BATCH16.md](implemented/20260518_INTEL_SURPRISE_BATCH16.md), [20260518_INTEL_SURPRISE_BATCH17.md](implemented/20260518_INTEL_SURPRISE_BATCH17.md). Plan: [2026-05-17-intel-extensions-plan.md](../plans/2026-05-17-intel-extensions-plan.md). |
| VRS 1KK Corridor 92 | IMPLEMENTED/DIAGNOSED 2026-05-18: queued operations now emit explicit already-owned-objective status instead of disappearing silently; 40w n1872 records Corridor as `all_objectives_owned`. Report: [20260518_OPERATION_STALL_BACKLOG_LANE.md](implemented/20260518_OPERATION_STALL_BACKLOG_LANE.md). Plan: [2026-05-17-vrs-corridor-92-plan.md](../plans/2026-05-17-vrs-corridor-92-plan.md). |
| ARBiH 2nd/3rd/4th Corps zero-attack operation stalls | IMPLEMENTED 2026-05-18: opening-attack readiness now classifies below-floor participants, no approach OSID, and zero eligible axes before execution. Report: [20260518_OPERATION_STALL_BACKLOG_LANE.md](implemented/20260518_OPERATION_STALL_BACKLOG_LANE.md). Plan: [2026-05-17-arbih-zero-attack-stalls-plan.md](../plans/2026-05-17-arbih-zero-attack-stalls-plan.md). |
| ARBiH catastrophic attack stalls | IMPLEMENTED 2026-05-18: execution now records prior-turn catastrophic objective memory and stalls repeat catastrophic attacks while preserving the first desperate attack. Report: [20260518_CATASTROPHIC_ATTACK_STALL_GUARD.md](implemented/20260518_CATASTROPHIC_ATTACK_STALL_GUARD.md). Plan: [2026-05-17-catastrophic-attack-stall-plan.md](../plans/2026-05-17-catastrophic-attack-stall-plan.md). |
| Brigade dissolution threshold | IMPLEMENTED 2026-05-17: [20260517_BRIGADE_DISSOLUTION_THRESHOLD.md](implemented/20260517_BRIGADE_DISSOLUTION_THRESHOLD.md). Plan: [2026-05-17-brigade-dissolution-threshold-plan.md](../plans/2026-05-17-brigade-dissolution-threshold-plan.md). |
| RBiH supply constraint | IMPLEMENTED 2026-05-17: [20260517_RBIH_SUPPLY_CONSTRAINT_ARMS_EMBARGO.md](implemented/20260517_RBIH_SUPPLY_CONSTRAINT_ARMS_EMBARGO.md). Plan: [2026-05-17-rbih-supply-constraint-arms-embargo-plan.md](../plans/2026-05-17-rbih-supply-constraint-arms-embargo-plan.md). |
| Fatigue recovery/rebalance | IMPLEMENTED 2026-05-17: [20260517_FATIGUE_RECOVERY_REBALANCE.md](implemented/20260517_FATIGUE_RECOVERY_REBALANCE.md). Plan: [2026-05-17-fatigue-recovery-rebalance-plan.md](../plans/2026-05-17-fatigue-recovery-rebalance-plan.md). |
| Save migration hardening | IMPLEMENTED 2026-05-17: [20260517_SAVE_MIGRATION_HARDENING.md](implemented/20260517_SAVE_MIGRATION_HARDENING.md). Plan: [2026-05-17-save-migration-hardening-plan.md](../plans/2026-05-17-save-migration-hardening-plan.md). |
| Strict null contract cleanup | IN PROGRESS 2026-05-21: inventory baseline + six-phase ledger created; Phase 1 state-schema pass reduced validator `as any` casts; Batches 4-51 progressively closed the visible non-UI `as FactionId`, UI trivial-alias, and sim runtime-invariant lanes. Batch C (schema-boundary validation) CLOSED as of 2026-05-21: C0-C12 introduced `src/state/schema_validators.ts` and drove `as_unknown_casts` to 0 across all twelve plan-scoped files (80 → 28, predicted floor hit exactly). Two post-Batch-C tail passes cleaned low-risk data/loader leaves (28 → 18) and bridge/reporting/type-only sites (18 → 6). The validator `as any` lane cleaned `validateFormations`, `validateMilitiaPools`, `validateEndState`, `validateFrontSegments`, `validateFrontPosture`, `validateFrontPostureRegions`, and `validateFrontPressure` (319 → 239), then the UI corps front-lines builder slice cleaned `buildCorpsFrontLinesGeoJSON.ts` (239 → 236), the factions / supply-rights validator tail cleaned `validate/factions.ts` plus `validate/supply_rights.ts` (236 → 233), the low-risk singleton leaf slice cleaned seven more files (233 → 226), the UI window bridge slice typed `App.tsx` / `SidePickerOverlay.tsx` callbacks (226 → 220), the bot-response / interaction-layer slice cleaned `bot_response.ts` plus `interactionLayerConfig.ts` (220 → 217), the CLI political-side / MapKit slice cleaned fifteen tooling casts (217 → 202), the core singleton slice cleaned serialize/validator/turn-report casts (202 → 198), the AI settings panel IPC fix cleaned the panel bridge cast (198 → 197), and the CLI front-state diagnostic slice cleaned nine more while switching its pressure read to canonical `state.military.front_pressure` (197 → 188). Current top-level inventory: `as_factionid_casts` 2 (both retained in `GameStateAdapter.ts` under the UI/engine FactionId-unification stop-gate documented in [`PROJECT_LEDGER_KNOWLEDGE.md`](../PROJECT_LEDGER_KNOWLEDGE.md)), `as_any_casts` 188, `as_unknown_casts` 6, `non_null_assertions_dot` 11, `non_null_assertions_index` 38, `optional_fields_game_state` 463. Remaining `as unknown` sites are behavior-shaped or intentionally incomplete mock/adapter bridges; remaining `as any` / non-null assertions / optional `GameState` fields stay routed to the post-FactionId roadmap [`2026-05-20-strict-null-post-factionid-roadmap.md`](../plans/2026-05-20-strict-null-post-factionid-roadmap.md). Plan: [2026-05-17-strict-null-checks-migration-plan.md](../plans/2026-05-17-strict-null-checks-migration-plan.md), phase ledger [2026-05-17-strict-null-checks-migration-phases.md](../plans/2026-05-17-strict-null-checks-migration-phases.md). |
| War termination minimal spec | IMPLEMENTED 2026-05-17: [20260517_PLAYER_TURN_GUIDE_AND_WAR_TERMINATION_SPEC.md](implemented/20260517_PLAYER_TURN_GUIDE_AND_WAR_TERMINATION_SPEC.md). Plan: [2026-05-17-war-termination-minimal-spec-plan.md](../plans/2026-05-17-war-termination-minimal-spec-plan.md). |
| Player Turn Guide | IMPLEMENTED 2026-05-17: [20260517_PLAYER_TURN_GUIDE_AND_WAR_TERMINATION_SPEC.md](implemented/20260517_PLAYER_TURN_GUIDE_AND_WAR_TERMINATION_SPEC.md). Plan: [2026-05-17-player-turn-guide-plan.md](../plans/2026-05-17-player-turn-guide-plan.md). |
| Full supply spec | IMPLEMENTATION CLOSED 2026-05-17: diagnostic, live/cumulative reconciliation guard, bot supply scoring, panel contract, deterministic cascade-order test, canon review queue entry, and sensitive-history supply smoke completed. Manual canon wording review remains queued. Report: [20260517_SUPPLY_DESIGN_COMPLETION.md](implemented/20260517_SUPPLY_DESIGN_COMPLETION.md). Plan: [2026-05-17-supply-design-completion-plan.md](../plans/2026-05-17-supply-design-completion-plan.md). |

---

## 1. Phase 7 / Master Early Docs queue

| Report | Summary | Priority / owner |
|--------|---------|-------------------|
| [BACKLOG_PHASE7_MASTER_EARLY_DOCS.md](backlog/BACKLOG_PHASE7_MASTER_EARLY_DOCS.md) | Phase A (AI, victory, production), Phase B (events, campaign, negotiation, coercion), Phase C (multiplayer, UI). B1/B2/B3/B4 are implemented; B3 counter-offers closed 2026-05-17 in [20260517_B3_NEGOTIATION_COUNTER_OFFERS.md](implemented/20260517_B3_NEGOTIATION_COUNTER_OFFERS.md). AI opponent critical path remains separate. Originals: IMPLEMENTATION_PLAN_MASTER_EARLY_DOCS, PHASE7_BACKLOG_QUEUE_*, MASTER_EARLY_DOCS_ANALYSIS_REPORT -> _old/40_reports/backlog/. | Post-MVP; PM for sequencing. |

---

## 2. Historical fidelity and research

| Report | Summary | Priority / owner |
|--------|---------|-------------------|
| [BACKLOG_HISTORICAL_FIDELITY_AND_RESEARCH.md](backlog/BACKLOG_HISTORICAL_FIDELITY_AND_RESEARCH.md) | Research plan, success criteria, model design, VRS/ARBiH trajectory analysis, Apr 1992 runs examination. Originals (5) → _old/40_reports/backlog/. | Research / design. |
| [20260515_FORCE_QUALITY_TRAJECTORY_FATIGUE_DEFERMENT.md](audits/20260515_FORCE_QUALITY_TRAJECTORY_FATIGUE_DEFERMENT.md) | Force-quality lane classification: personnel/reconstitution and HRHB already have recent focused evidence; the remaining safe owner is fatigue/exhaustion, but code changes require a design-gated residue/retention packet because the obvious levers are global fatigue retunes. | Focused design packet; Fatigue/exhaustion owner. |
| [PARADOX_HISTORICAL_TROOP_NUMBERS_SEPT1992_CONVENE.md](convenes/PARADOX_HISTORICAL_TROOP_NUMBERS_SEPT1992_CONVENE.md) | Convene on historical troop numbers (Sept 1992). | Design input. |

---

## 3. Brigade / military / militia design (future)

| Report | Summary | Priority / owner |
|--------|---------|-------------------|
| [BACKLOG_BRIGADE_MILITIA_MILITARY.md](backlog/BACKLOG_BRIGADE_MILITIA_MILITARY.md) | Brigade realism/military fronts, militia/brigade rework plan, formation vs OOB comparison, RBiH–HRHB alliance redesign (core implemented). Originals (4) → _old/40_reports/backlog/. | Post-MVP / research / design. |
| [RBIH_HRHB_ALLIANCE_BREAKDOWN_AND_WAR_PLAN.md](../30_planning/RBIH_HRHB_ALLIANCE_BREAKDOWN_AND_WAR_PLAN.md) | RBiH-HRHB war-within-a-war: alliance-aware targeting, endogenous degradation, Phase 0 handoff. Phases A/B/C are implemented; closure reports: [20260517_RBIH_HRHB_PHASE_B_CLOSURE.md](implemented/20260517_RBIH_HRHB_PHASE_B_CLOSURE.md) and [20260517_RBIH_HRHB_PHASE_C_CLOSURE.md](implemented/20260517_RBIH_HRHB_PHASE_C_CLOSURE.md). | Implemented; monitor scenario probes. |
| **Paramilitary / rear-cleanup units** | **Implemented.** Core system live since 2026-03-07; consequence scaling, ask-mode UI surfacing, and cited named-unit catalog closed 2026-05-17 in [20260517_PARAMILITARY_FLAVOR_AND_CONSEQUENCES.md](implemented/20260517_PARAMILITARY_FLAVOR_AND_CONSEQUENCES.md). Original convene: [PARADOX_RS_JNA_PARAMILITARY_PER_ARMY_FLAVOR_2026_02_18.md](convenes/PARADOX_RS_JNA_PARAMILITARY_PER_ARMY_FLAVOR_2026_02_18.md). | Implemented; future additions are canon-gated expansion. |
| **Per-army flavor** | IMPLEMENTED 2026-05-17 for the approved cited catalog. Scorpions/Skorpioni and Yellow Wasps/Zute Ose remain explicitly blocked pending historian follow-up, not ordinary backlog. | Closed for approved catalog. |

---

## 4. GUI / War Planning Map / Warroom (design and handovers)

| Report | Summary | Priority / owner |
|--------|---------|-------------------|
| [BACKLOG_GUI_WARROOM_WAR_PLANNING_MAP.md](backlog/BACKLOG_GUI_WARROOM_WAR_PLANNING_MAP.md) | GUI MVP, War Planning Map (proposal, discussion, duty delegation), Warroom setup/Phase 0, start-of-game info, click alignment, asset brief, strategic direction, phased plan. Originals (10) → _old/40_reports/backlog/. | PM / UI / design. |
| [20260516_PRESIDENTIAL_DECISION_SURFACE_SECOND_PASS_AUDIT.md](audits/20260516_PRESIDENTIAL_DECISION_SURFACE_SECOND_PASS_AUDIT.md), [2026-05-16-presidential-decision-surface-correctness-plan.md](../plans/2026-05-16-presidential-decision-surface-correctness-plan.md), [20260516_PRESIDENTIAL_DECISION_SURFACE_CORRECTNESS.md](implemented/20260516_PRESIDENTIAL_DECISION_SURFACE_CORRECTNESS.md) | IMPLEMENTED 2026-05-16. The second-pass decision-surface audit found convoy IPC queue drift, event owner scoping gaps, and missing manifest-backed gates; Phase 0.1 closes them with canonical convoy IPC, explicit `responding_faction`, a player-decision manifest, and shared UI/desktop gates. Future backlog rule only: new generated decision families must register in the manifest. | Closed; future manifest registration rule. |
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

## 7. Intelligence system & operations — future features

| Report | Summary | Priority / owner |
|--------|---------|------------------|
| [BACKLOG_INTEL_AND_OPERATIONS.md](backlog/BACKLOG_INTEL_AND_OPERATIONS.md) | Four deferred enhancements to the intel system, captured after deep investigation of `sector_intel.ts` / `operation_preparation.ts` / `bot_corps_directives.ts` during the 2026-03-14 sprint plan session. Current intel system (passive buildup, decay, probes, recon-by-force, intel-gated launch) is live and functional; these extend it once the Phase 1–5 calibration sprint stabilises at 90%+. Items: **(1)** per-OSID confidence (currently per-sector-pair) — finer targeting granularity; **(2)** surprise/ambush mechanic — defender power bonus when attacker has low intel (complement to Phase 1.5 attacker penalty); **(3)** patrol/scout intel sources — passive civilian networks + player-ordered recon, differentiating faction intelligence capabilities beyond passive buildup rate; **(4)** stale-intel penalty during operation execution — re-assessment if enemy repositions during preparation turns. ~~Also notes OPSEC player UI gap (engine field exists, no UI).~~ **OPSEC UI is VERIFIED-STALE 2026-05-18**: SituationTab "Operational Posture" section, CorpsFrontPanel toggle + indicator, AARPanel + Tooltip `defender_opsec` labels all surface OPSEC. | Deferred post-90% calibration. Gameplay Programmer + Game Designer + War-or-Game audit. |

---

## 8. Bot AI remaining work (from BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13 and CALIBRATION_REPORT_BOT_AI_FEB_2026)

**Open issues from Feb 2026 calibration report** ([CALIBRATION_REPORT_BOT_AI_FEB_2026.md](CALIBRATION_REPORT_BOT_AI_FEB_2026.md) §7): **Front-assignment bug (critical)** — all RS brigades assigned to HRHB-RS front, zero see RBiH-RS front; RS cannot attack Brčko/Posavina corridor regardless of scoring. **Corps personnel imbalance (high)** — VRS 1st Krajina 56K vs Sarajevo-Romanija 2.6K; ARBiH 2nd Corps 75K vs 4th Corps 0 brigades at week 0. **Enclave protection (high)** — Srebrenica, Goražde, Cazin fall to RS; no mechanism to model besieged enclaves that held historically. **ARBiH 4th Corps / 2nd Corps balance (medium)** — OOB available_from gating and turn-0 brigade distribution; RS at 59% not 60–65% (combination of above).

The report [BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13.md](../_old/40_reports/implemented_2026_02_15/BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13.md) (archived) lists **Remaining Issues (Future Work)**:

- ~~AoR extreme imbalance (HIGH)~~ **VERIFIED-STALE 2026-05-18: AoR concept removed from engine 2026-03-04.** No `AoR` / `area_of_responsibility` / `aor_orders` references remain in `src/`.
- **RS early-war underperformance (MEDIUM)** — **Implemented 2026-02-18 (priority B):** RS early-war window extended 0–12 → 0–26 (doctrine, standing orders, attack share, corps E1). _(Original handoff doc `PRIORITY_B_RS_EARLY_WAR_BOT_HANDOFF_2026_02_18.md` retired during convenes pruning; implementation lives in `bot_strategy.ts` / `bot_corps_ai.ts`.)_
- **Defender casualties at zero (MEDIUM)** — **Implemented 2026-02-18:** Battle resolution uses a reporting floor when defender personnel ≤ MIN_COMBAT_PERSONNEL so report and casualty_ledger show non-zero defender losses; application remains capped so formation never drops below floor (battle_resolution.ts, Phase II Spec §12).
- **HRHB near-passive (LOW–MEDIUM)** — **Implemented 2026-02-18 (Candidate B):** HRHB Lasva Offensive window (weeks 12–26): higher effective attack share (0.45), non-Herzegovina corps nudged to at least balanced when avgPers ≥ 0.4 (bot_strategy.ts, bot_corps_ai.ts). _(Original handoff doc `NEXT_BOT_PRIORITY_AOR_OR_HRHB_HANDOFF_2026_02_18.md` retired during convenes pruning.)_
- Posture orders for forming brigades (LOW)
- Corps command not integrated with brigade AI (LOW)
- Operational groups not used by bot AI (LOW)

Treat these as backlog items for bot/brigade AI when prioritizing. ~~**Next single bot priority (choose one):** Candidate A (AoR behavioral balance, HIGH) remains open; Candidate B (HRHB activity) implemented 2026-02-18.~~ **VERIFIED-STALE 2026-05-18:** Candidate A is obsolete (AoR removed from engine 2026-03-04); Candidate B shipped. The cited handoff doc `NEXT_BOT_PRIORITY_AOR_OR_HRHB_HANDOFF_2026_02_18.md` no longer exists on disk. **Bot rewrite (OSID/ZoC):** External expert implementing per [BOT_AI_DESIGN_SPEC.md](../30_planning/design/BOT_AI_DESIGN_SPEC.md); in parallel, see §9 below.

**ARBiH zero-capture operations (LOW–MEDIUM, 2026-03-15):** In the n745 calibration run (40w, Jan 1993), 8 of 25 ARBiH operations captured 0 objectives during their full execution window. Affected operations include 1st Corps operations around Foča/Kalinovik and some 5th Corps / 7th Corps operations in central Bosnia. Root cause is not yet isolated — candidates: (a) objectives permanently surrounded by RS/unreachable via friendly territory, causing the march-first loop to spin without ever finding an attackable OSID (same class of problem as #36 Operacija Zora stall); (b) operation participation guard (`isActiveSectorOperationParticipant`) preventing non-participant brigades from joining but no participants can reach the front; (c) undersupplied / understrength brigades blocked by the `personnel<400` ineffective gate. 8/25 = 32% zero-capture rate is likely too high — historically ARBiH operations achieved at least some territorial change or produced significant attrition. **Do not fix until realism audit determines which ops are legitimately stalled (historically accurate) vs gamey.** Assign to War-or-Game for triage, then Gameplay Programmer if a fix is warranted. See REAL_WAR_MASTER.md for any open issues related to ARBiH 1st/5th/7th Corps operation tempo.

**Elite loan: cohesion-based recall missing (P2, REAL_WAR_MASTER #37, 2026-03-15):** STALE/VERIFIED CLOSED 2026-05-18. `ELITE_COHESION_RECALL` and cohesion-triggered recall already exist in `elite_loan_types.ts` / `army_reserve_system.ts`; `tests/elite_loan_recall.test.ts` covers it.

**Elite loan tracker instrumentation gap (P3, REAL_WAR_MASTER #38, 2026-03-15):** STALE/VERIFIED CLOSED 2026-05-18. `brigade_history_recorder.ts` increments elite-loan battle/casualty counters from battle participants; `tests/elite_loan_recall.test.ts` covers it.

**ARBiH suicide attacks at 0.1-0.2 power ratio (P2, REAL_WAR_MASTER #39, 2026-03-15):** IMPLEMENTED 2026-05-18. Execution now records objective-level catastrophic attack memory by faction/corps/objective and stalls a repeat attack when the next-turn prediction remains catastrophic below the 0.3 power-ratio guard, while preserving the first desperate attack allowance. Report: [20260518_CATASTROPHIC_ATTACK_STALL_GUARD.md](implemented/20260518_CATASTROPHIC_ATTACK_STALL_GUARD.md).

**Operational tempo 3.5 battles/week (P3, REAL_WAR_MASTER #40, 2026-03-15):** 141 battles / 40 weeks = 3.5/week across 198 brigades. Known ops-only doctrine trade-off. Historically, the Bosnian War had continuous engagements on every front. May be addressed by follow-on planning (deferred Fix B) or limited independent tactical actions. **Monitor, do not fix now.**

---

## 9. Pipeline next (while bot rewrite)

**Single list of work that can proceed in parallel with the external expert’s bot AI rewrite** (no dependency on new bot):

| Report | Summary | Priority / owner |
|--------|---------|-------------------|
| [20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md](backlog/20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md) | **Critical:** War termination minimal spec, Player’s Turn Guide, supply spec. **Important:** Phase 0 JNA_status hand-off, Phase II ceasefire/Washington in pipeline, Phase I→II edge cases, Operation Storm spec, scoring. **AoR follow-ups:** phase-ii-recon-intelligence OSID, aor_init cleanup, test/baseline strategy. **Other:** Phase 0 output contract, GUI/Warroom items, headless vs desktop Phase II. Ordered suggestions in doc. | PM to sequence; Game Designer / Gameplay / Architect / QA per item. |

**War termination (1.1) work directive (2026-02-24):** [ORCHESTRATOR_WAR_TERMINATION_MINIMAL_SPEC_DIRECTIVE_2026_02_24.md](convenes/ORCHESTRATOR_WAR_TERMINATION_MINIMAL_SPEC_DIRECTIVE_2026_02_24.md) — Game Designer lead, Technical Architect oversee, Historian advise on historicity. Deliverable: minimal spec (Dayton-style end, faction goals, recurring initiatives, preconditions).

**Supply full-team convene (2026-02-24):** [ORCHESTRATOR_SUPPLY_FULL_TEAM_CONVENE_2026_02_24.md](convenes/ORCHESTRATOR_SUPPLY_FULL_TEAM_CONVENE_2026_02_24.md) — Full Pyrrhic team input; innovative proposals (enclave resilience, corridor UI, supply_mult in bot scoring, optional hardening). **Single priority:** Supply design doc (OSID trace, supply_mult wiring, cascade, enclave/resilience rules, minimum supply UX). Owner: Technical Architect (lead author), Game Designer, Architect; PM to sequence implementation after sign-off. **Supply design doc:** [docs/30_planning/SUPPLY_DESIGN.md](../30_planning/SUPPLY_DESIGN.md).

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

## 15. March-first staging failures — n58 War-or-Game audit (2026-03-14)

Two new realism issues surfaced in the n58 audit. Both share the same root cause: operations generated for objectives the assigned brigades cannot physically reach via march-first (no friendly OSID path), producing zero-attack stalls.

| Issue | Priority | Description | Fix direction |
|-------|----------|-------------|---------------|
| **#34 - VRS 1KK Corridor 92 never happens** | **P1** | IMPLEMENTED/DIAGNOSED 2026-05-18. Queued Operation Corridor now records explicit `all_objectives_owned` status in 40w n1872 instead of silently disappearing; future work, if desired, is a realism/tempo data decision about why the objectives are already RS-held by turn 5. | Report: [20260518_OPERATION_STALL_BACKLOG_LANE.md](implemented/20260518_OPERATION_STALL_BACKLOG_LANE.md). |
| **#35 - ARBiH 2nd/3rd/4th Corps zero-attack stalls** | **P2** | IMPLEMENTED 2026-05-18. Opening-attack readiness now emits typed blockers for understrength participants, no approach OSID, and zero eligible axis before execution/AAR. | Report: [20260518_OPERATION_STALL_BACKLOG_LANE.md](implemented/20260518_OPERATION_STALL_BACKLOG_LANE.md). |

**Source:** `docs/40_reports/REAL_WAR_MASTER.md` issues #34 and #35 (added 2026-03-14 n58 audit).

---

## 13. Combat mechanics failures (n292 audit, 2026-03-07)

**Source report:** [20260307_N292_COMBAT_MECHANICS_REPORT.md](convenes/20260307_N292_COMBAT_MECHANICS_REPORT.md)

| Issue | Priority | Complexity | Owner |
|-------|----------|------------|-------|
| ~~Equipment attrition mechanic (0 lost in 168 battles)~~ | ~~**P0**~~ | — | **FIXED** — `attack_resolution_osid.ts` added per-battle loss after n292. At w40: RS 132 tanks/152 arty, RBiH 45/77, HRHB 6/14. |
| ~~Brigade dissolution at combat-ineffective threshold~~ | ~~**P0**~~ | -- | **IMPLEMENTED 2026-05-17** - threshold work completed in [20260517_BRIGADE_DISSOLUTION_THRESHOLD.md](implemented/20260517_BRIGADE_DISSOLUTION_THRESHOLD.md). |
| ~~RBiH supply constraint (100% under arms embargo)~~ | ~~**P0**~~ | -- | **IMPLEMENTED 2026-05-17** - phase-keyed RBiH arms-embargo caps/events completed in [20260517_RBIH_SUPPLY_CONSTRAINT_ARMS_EMBARGO.md](implemented/20260517_RBIH_SUPPLY_CONSTRAINT_ARMS_EMBARGO.md). |
| ~~Fatigue accumulation/recovery rebalance (98% at zero)~~ | ~~**P1**~~ | -- | **IMPLEMENTED 2026-05-17** - owner D late-war exhaustion/recent-combat residue floor; n1864 40w 27/27 anchors, n1863 188w sector-front pct_zero 58.416. See [20260517_FATIGUE_RECOVERY_REBALANCE.md](implemented/20260517_FATIGUE_RECOVERY_REBALANCE.md). |
| ~~Siege/bombardment casualty mechanic (inverted KIA ratio)~~ | ~~**P1**~~ | — | **RESOLVED** — `frontline_attrition.ts` bombardment exposure added after n292 (BOMBARDMENT_EXPOSURE_RATE=0.008). Current w40: RBiH 17,235 KIA vs RS 7,775 KIA (2.2:1 defender:attacker — correct direction). REAL_WAR_MASTER H5 still open as fine-tuning. |
| ~~HRHB cohesion floor reduction (50 -> 25-30)~~ | ~~**P2**~~ | -- | **STALE/VERIFIED CLOSED 2026-05-18** - active timeline already uses 40 through week 52 then 30 from week 53. Report: [20260518_HRHB_COHESION_65TH_TAGGING_VERIFICATION.md](implemented/20260518_HRHB_COHESION_65TH_TAGGING_VERIFICATION.md). |
| ~~Enclave resilience dynamism (static after init)~~ | ~~**P2**~~ | — | **RESOLVED** — `enclave_resilience.ts` per-enclave growth_mult + supply-driven growth/decay implemented after n292. At w40: Sarajevo 44/45, Gorazde 33/35, Srebrenica 17.5/25, Zepa 15/20, Bihac 11.5/40 (partially isolated). |
| ~~65th Protection Regt garrison flag~~ | ~~**P3**~~ | -- | **STALE/VERIFIED CLOSED 2026-05-18** - current OOB correctly tags it as RS/VRS Main Staff motorized elite, not RBiH garrison. Report: [20260518_HRHB_COHESION_65TH_TAGGING_VERIFICATION.md](implemented/20260518_HRHB_COHESION_65TH_TAGGING_VERIFICATION.md). |

---

## 14. Backlog archive index (2026-02-24 themed merge)

All former single-topic backlog docs are archived to **docs/_old/40_reports/backlog/**; full content preserved. Each themed doc in backlog/ (§1–§6) lists its archived source filenames and a short summary. **Standalone (not merged):** [20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md](backlog/20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md). Master archive index: [docs/_old/README.md](../_old/README.md) §40_reports/backlog. No planned work dropped.

---

## 16. Structural defect audit (2026-05-17)

**Source:** [20260517_STRUCTURAL_DEFECT_AUDIT_AND_VERIFICATION.md](audits/20260517_STRUCTURAL_DEFECT_AUDIT_AND_VERIFICATION.md). Originated from a user-reported Codex/event surfacing defect; widened by four parallel investigators and one verification pass.

**Companion plan:** [2026-05-17-two-level-event-surfacing-and-codex-visibility-plan.md](../plans/2026-05-17-two-level-event-surfacing-and-codex-visibility-plan.md) (Phases A/B/B+ and feature-flagged Phase C substrate shipped by 2026-05-18; Phase D safe content has partial coverage, and the residual sensitive-content review plan is [2026-05-18-event-notification-sensitive-content-review-plan.md](../plans/2026-05-18-event-notification-sensitive-content-review-plan.md)).

| Backlog item | Priority | Owner / Disposition |
|---|---|---|
| **Phase B - `player_faction` loaded-state contract** | **P0** | IMPLEMENTED 2026-05-18 with schema v14 migration/defaulting and loaded-state validation. Scenario JSON remains faction-neutral/optional; loaded gameplay/read-model state now requires canonical `meta.player_faction`. Report: `docs/40_reports/implemented/20260518_player_faction_contract_and_codex_visibility.md`. |
| **Logistics Priority lever — wire-or-remove decision** | **P1** | IMPLEMENTED 2026-05-17: `stage-logistics-priority` now writes canonical `state.military.logistics_priority[faction][edgeId]`; combat supply math and formation fatigue consume the shared `[0.5, 1.5]` clamped helper; UI/IPC contract reconciled. Report: `docs/40_reports/implemented/20260517_LOGISTICS_PRIORITY_WIRED.md`. Full supply design remains separate. |
| **Phase B+ - `player_faction` contract hardening** | P1 (hygiene) | IMPLEMENTED 2026-05-18. `playerFactionMatch.ts` is the shared strict helper; warroom RBiH fallback and permissive UI/read-model filters were removed or tightened. Report: `docs/40_reports/implemented/20260518_player_faction_contract_and_codex_visibility.md`. |
| **Endgame verification at 188w** | P1 | IMPLEMENTED/CLOSED 2026-05-19. Current accepted pair is n1918 (`runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1918`, hash `5c6e7b62fa6670c0`, 27/27 anchors, 6/6 benchmarks, byte-identical to n1916) and n1919 (`runs/apr1992_definitive_188w__210e69404d054959__w188_n1919`, hash `7b57a8592f668137`, 27/27 anchors, 6/6 benchmarks). The prior n1844/n1917 26/27 Brcko residue is closed by `docs/40_reports/implemented/20260519_OPERATION_KORIDOR_BRCKO_CLOSURE.md`; remaining signals are Sarajevo casualty ratio, absent serialized `patron_pressure`, late-war force-quality/reconstitution drift, long-run structural sector/intel diagnostics, and non-anchor `op:teslic:kamenica_2 = HRHB` collateral residue. |
| **Sarajevo railroad canon question** | P1 (design) | IMPLEMENTED 2026-05-17 as Branch B: numeric siege parameters are optional `scenario.sarajevo_overrides`; ID-set geometry remains code-side canon. Report: `docs/40_reports/implemented/20260517_SARAJEVO_SPECIAL_CASING_BRANCH_B.md`. |
| **Phase C - Two-level event surfacing** | P2 | IMPLEMENTED 2026-05-18 as a feature-flagged substrate behind `AWWV_TWO_LEVEL_NOTIFICATIONS=true`: optional `pending_event_notifications`, deterministic emission, sparse `war_1992` authored text, and Inbox `intelligence_notification` projection. Default 40w n1875 remains hash-stable at `42607f83870e01d5`. Report: `docs/40_reports/implemented/20260518_TWO_LEVEL_EVENT_SURFACING_PHASE_C.md`. |
| **Phase D - Notification content backfill** | P3 (content) | PARTIAL 2026-05-18. Notification dismissal command path is implemented; `hrhb_political_goal`, `london_conference_1992`, the three 1993 strategic posture review events, and six additional 1993 conflict/diplomacy rows now have complete first-pass recipient text. The residual gate audit classifies the remaining 20 rows / 102 missing recipient blocks into historian-required, narrative-tone, Washington-timing, late-war-outcome, and mixed-sensitive front-visit lanes. Tracker: `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`; plan: [2026-05-18-event-notification-sensitive-content-review-plan.md](../plans/2026-05-18-event-notification-sensitive-content-review-plan.md). |
| **`FACTION_MORALE_RESIST_FLOOR` faction-asymmetric hardcode** | P2 (design) | VERIFIED 2026-05-18. Current asymmetry is documented doctrine (RBiH=50/RS=55/HRHB=60); stale Engine Invariants RS=70 line corrected to RS=55. Report: `docs/40_reports/audits/20260518_BATCH3_MORALE_AND_EXHAUSTION_DRIFT_AUDIT.md`. |
| **`CEASEFIRE_*_EXHAUSTION` + `WASH_COMBINED_EXHAUSTION` narrative gates** | P2 | RECONCILED 2026-05-18. Exhaustion thresholds are wired and not the current binding drift. The live `washington_signed` predicate remains an emergent RBiH-HRHB framework activation; the formal `washington_agreement_1994` narrative event remains week 102. Turn summaries/AAR now label the live predicate as `rbih_hrhb_framework_activated`. Reports: `docs/40_reports/audits/20260518_BATCH3_MORALE_AND_EXHAUSTION_DRIFT_AUDIT.md`, `docs/40_reports/audits/20260518_WASHINGTON_TIMING_RECONCILIATION.md`. |
| **Phase pipeline silent-skip diagnostic wrapper** | P3 (hygiene) | IMPLEMENTED 2026-05-18. `NamedPhase.skipIf` predicates now emit typed `phase_skip_diagnostics` into turn reports; `sync-front-segments` records missing settlement-edge inputs instead of silently disappearing. Report: `docs/40_reports/implemented/20260518_PHASE_PIPELINE_SKIP_DIAGNOSTICS.md`. |
| **Primary Army / Primary Corps quick-select** | P3 (minor) | IMPLEMENTED 2026-05-18. Dead `App.tsx` handlers removed; visible OOB command surfaces remain the owner for army/corps selection. Report: `docs/40_reports/implemented/20260518_PRIMARY_COMMAND_QUICK_SELECT_CLEANUP.md`. |
| **`IvpBreakdownModal` dead requirement** | P3 (cleanup) | STALE/VERIFIED CLOSED 2026-05-18. `src/ui/warroom/components/IvpBreakdownModal.ts` exists, is wired from `ClickableRegionManager`, and has boundary tests. Report: `docs/40_reports/implemented/20260518_IVP_BREAKDOWN_MODAL_STALE_ROW_VERIFICATION.md`. |
| **`ParamilitaryReviewModal` dead entry** | P3 (cleanup) | IMPLEMENTED 2026-05-17: ask-mode paramilitary requests now project to Inbox/Decision Room with integer civilian-risk counts and route to the existing modal surface. Report: `docs/40_reports/implemented/20260517_PARAMILITARY_FLAVOR_AND_CONSEQUENCES.md`. |
| **`SettingsScreen` shell** | P3 (cleanup) | IMPLEMENTED 2026-05-18. Dead local-only controls were removed; the surface now defaults to real audio settings and shows Gameplay only when tutorial restart is available. Report: `docs/40_reports/implemented/20260518_SETTINGS_SCREEN_SHELL_CLEANUP.md`. |
| **Save migration gap** | P3 (hygiene) | IMPLEMENTED 2026-05-17: schema registry now versions migrated defaults through v12, strict required-as-of-version validation is opt-in at deserialize, startup artifact regenerated, drift audit reports 0 anonymous defaults, and `docs/20_engineering/SAVE_SCHEMA_EVOLUTION.md` documents future bumps. Report: `docs/40_reports/implemented/20260517_SAVE_MIGRATION_HARDENING.md`. |
| **`try/catch` swallow in `pressure_system.ts:67-69`** | P4 | STALE/VERIFIED CLOSED 2026-05-18. Current `src/sim/events/pressure_system.ts` has no `try`/`catch` swallow; `tests/pressure_system.test.ts` passes. |
| **`strictNullChecks` migration** | P4 (long) | IN PROGRESS 2026-05-21: inventory baseline (2026-05-17) recorded 154 `as FactionId`, 395 `as any`, 97 `as unknown`, 50 dot non-null assertions, 59 index non-null assertions, and 458 optional `GameState` fields. Current truth from `tools/diagnostics/strict_null_inventory.cjs`: 2 `as FactionId` (both retained in `GameStateAdapter.ts` under the UI/engine FactionId-unification stop-gate documented in [`PROJECT_LEDGER_KNOWLEDGE.md`](../PROJECT_LEDGER_KNOWLEDGE.md)), 188 `as any`, 6 `as unknown`, 11 dot non-null, 38 index non-null, 463 optional `GameState` fields. Visible non-UI `as FactionId` lane CLOSED via Batches 4-49; Batch 50 closed the UI-only trivial alias / JSX truthy-narrowing slice (-7 dot / -5 index across 8 UI files); Batch 51 closed the sim runtime-invariant slice (-21 dot across 8 sim files including `corps_front_sectors.ts` and `scenario_runner.ts`). Batch C closed the twelve-file schema-boundary lane (80 → 28), two post-Batch-C tail passes cleaned low-risk data/loader leaves plus bridge/reporting/type-only sites (28 → 6), the validator `as any` lane cleaned seven validator files (319 → 239), the UI corps front-lines builder slice cleaned `buildCorpsFrontLinesGeoJSON.ts` (239 → 236), the factions / supply-rights validator tail cleaned 3 more (236 → 233), the low-risk singleton leaf slice cleaned seven more (233 → 226), the UI window bridge slice cleaned six more (226 → 220), the bot-response / interaction-layer slice cleaned three more (220 → 217), the CLI political-side / MapKit slice cleaned fifteen more (217 → 202), the core singleton slice cleaned four more (202 → 198), the AI settings panel IPC fix cleaned one more (198 → 197), and the CLI front-state diagnostic slice cleaned nine more (197 → 188). Remaining `as unknown` / `as any` / non-null assertions / optional `GameState` fields routed to [`2026-05-20-strict-null-post-factionid-roadmap.md`](../plans/2026-05-20-strict-null-post-factionid-roadmap.md) for next-phase classification (trivial alias vs schema boundary vs save-shape risk vs runtime invariant vs UI adapter boundary vs deferred behavior fix) before any further cleanup batch starts. |
| **`state.political` is the next iceberg** | DEFERRED | 636 guarded reads vs 1041 unguarded reads. Currently LATENT (state.political always populated). Worth monitoring; not actionable now. |

**Latent findings (no action; documented for awareness):** NATO never-intervenes NaN path, multi-brigade pressure mult fallback, settlement-flip discard, casualty-faction cast. All confirmed not-firing in n1741 turn-40 sample; recheck at endgame.

---

*For implemented work, see [CONSOLIDATED_IMPLEMENTED.md](CONSOLIDATED_IMPLEMENTED.md). For lessons learned, see [CONSOLIDATED_LESSONS_LEARNED.md](CONSOLIDATED_LESSONS_LEARNED.md).*
