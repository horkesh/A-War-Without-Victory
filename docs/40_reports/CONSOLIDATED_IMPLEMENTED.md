# Consolidated: Implemented Work (40_reports)

**Purpose:** Single view of work that has been implemented and absorbed into code/canon. Source reports remain in docs/40_reports for detail.

**Canon absorption:** See [ORCHESTRATOR_ABSORPTION_AND_CANON_UPDATE_2026_02_13.md](implemented/ORCHESTRATOR_ABSORPTION_AND_CANON_UPDATE_2026_02_13.md) for how recent reports were mapped to Phase II spec, Systems Manual §7, and context/CANON.

---

## 1. Combat and battle resolution

| Report | What was implemented |
|--------|------------------------|
| [battle_resolution_engine_report_2026_02_12.md](implemented/battle_resolution_engine_report_2026_02_12.md) | Multi-factor battle resolution (terrain, equipment, experience, cohesion, posture, supply, corps, OG, resilience, disruption); casualty ledger (KIA/WIA/MIA + equipment); 1.3× victory threshold; snap events (Ammo Crisis, Commander Casualty, Last Stand, Surrender Cascade); Pyrrhic Victory. Canon: Phase II §5, §12; Systems Manual §7. |
| [combat_balance_and_corridor_ai_refactor_pass_2026_02_12.md](implemented/combat_balance_and_corridor_ai_refactor_pass_2026_02_12.md) | Strategic target selection (scoreTarget), RS corridor defense AI (Posavina), faction posture limits, equipment in combat, Phase I consolidation 4→8 turns, sidToMun wiring. |

---

## 2. Recruitment and Phase II accrual

| Report | What was implemented |
|--------|------------------------|
| [recruitment_system_implementation_report.md](implemented/recruitment_system_implementation_report.md) | Three-resource brigade activation at Phase I entry; ongoing Phase II accrual + recruitment. |
| [ongoing_recruitment_implementation_report_2026_02_11.md](implemented/ongoing_recruitment_implementation_report_2026_02_11.md) | Phase II accrual (equipment/capital from production, embargo, trickles); runOngoingRecruitment with elective cap; phase-ii-recruitment pipeline step; determinism and tests. Systems Manual §13. |
| [recruitment_system_design_note.md](implemented/recruitment_system_design_note.md) | Design and formulas; extended window implemented. |

---

## 3. Brigade AoR, strength, and municipality layer

| Report | What was implemented |
|--------|------------------------|
| [BRIGADE_STRENGTH_AND_AOR_INVESTIGATION_2026_02.md](implemented/BRIGADE_STRENGTH_AND_AOR_INVESTIGATION_2026_02.md) | Casualties confirmed in state/UI; 229 AoR root cause fixed with MAX_MUNICIPALITIES_PER_BRIGADE (8). |
| [803rd_light_223_settlements_investigation.md](implemented/803rd_light_223_settlements_investigation.md) | AoR vs operational cap; ensure step restricted to home muns; cap 8 muns per brigade. |
| [refactor_pass_2026_02_11_brigade_aor.md](implemented/refactor_pass_2026_02_11_brigade_aor.md) | Brigade AoR refactor (ensure step, home muns only). |
| [municipality_supra_layer_implementation_report.md](implemented/municipality_supra_layer_implementation_report.md) | brigade_municipality_assignment → brigade_aor derivation; sync order. |
| [BRIGADE_AOR_OVERHAUL_CORPS_DIRECTED_2026_02_14.md](implemented/BRIGADE_AOR_OVERHAUL_CORPS_DIRECTED_2026_02_14.md) | Corps-directed AoR assignment (corps sectors, contiguous allocation, home mun + 2 neighbors); contiguity invariant (aor_contiguity, repair, rebalance guard); dispatcher in brigade_aor (corps_command → assignCorpsDirectedAoR, else legacy Voronoi); smooth map display (compound fill, outer boundary, breathing glow). Canon: Phase II §7.1, Systems Manual §2.1/§8, TACTICAL_MAP_SYSTEM §8. |
| [CORPS_AOR_CONTIGUITY_ENFORCEMENT_2026_02_15.md](implemented/CORPS_AOR_CONTIGUITY_ENFORCEMENT_2026_02_15.md) | Corps-level AoR contiguity (checkCorpsContiguity, repairCorpsContiguity, enforceCorpsLevelContiguity); enclave exception (detectDisconnectedTerritories); Step 9 in assignCorpsDirectedAoR; pipeline step `enforce-corps-aor-contiguity` after `rebalance-brigade-aor`; brigade repair prefers same-corps targets. Canon: Phase II §7.1, §5; Systems Manual §2.1. |

---

## 4. Phase I control, no-flip, and initial control

| Report | What was implemented |
|--------|------------------------|
| [PARADOX_PHASEI_NOFLIP_FINAL_PROPOSAL_2026_02_11.md](implemented/PARADOX_PHASEI_NOFLIP_FINAL_PROPOSAL_2026_02_11.md) | Military-action-only semantics; player_choice GO for recruitment-centric; ethnic/hybrid NO-GO default. |
| [PARADOX_ETHNIC_INITIAL_CONTROL_CONVENE.md](implemented/PARADOX_ETHNIC_INITIAL_CONTROL_CONVENE.md) | init_control_mode: institutional | ethnic_1991 | hybrid_1992. |
| [CONTROL_SEMANTICS_AND_MISSING_CONTROLLERS_BRIEF.md](implemented/CONTROL_SEMANTICS_AND_MISSING_CONTROLLERS_BRIEF.md) | Settlement-level control clarified in canon (Systems Manual §11); municipality-level as derived view. |

---

## 5. Scenario runs, handoffs, and decisions

| Report | What was implemented |
|--------|------------------------|
| [ORCHESTRATOR_SCENARIO_RUNS_HANDOFF_2026_02_12.md](implemented/ORCHESTRATOR_SCENARIO_RUNS_HANDOFF_2026_02_12.md), [ORCHESTRATOR_SCENARIO_RUNS_HANDOFF_2026_02_13.md](implemented/ORCHESTRATOR_SCENARIO_RUNS_HANDOFF_2026_02_13.md) | Scenario run handoffs; phase_ii_attack_resolution in run_summary; no-flip semantics clarified. |
| [ORCHESTRATOR_SCENARIO_HANDOFF_DECISIONS_2026_02_13.md](implemented/ORCHESTRATOR_SCENARIO_HANDOFF_DECISIONS_2026_02_13.md) | Closure: 0-flips cause (orders_processed), formation count change (OOB/recruitment path), disable_phase_i_control_flip semantics. |
| [ORCHESTRATOR_ABSORPTION_AND_CANON_UPDATE_2026_02_13.md](implemented/ORCHESTRATOR_ABSORPTION_AND_CANON_UPDATE_2026_02_13.md) | Canon updates for Phase II pipeline, §12 stubs, Systems Manual §7, context/CANON refs. |
| [ORCHESTRATOR_52W_VIDEO_RUN_AND_ASPECTS_REPORT_2026_02_14.md](convenes/ORCHESTRATOR_52W_VIDEO_RUN_AND_ASPECTS_REPORT_2026_02_14.md) | Orchestrator 52w run with --video --map; report on run execution, video/replay pipeline, scenario/control, Phase II combat, formations, diagnostics, tactical map replay flow. |
| [ORCHESTRATOR_52W_REGRESSION_ANALYSIS_2026_02_14.md](convenes/ORCHESTRATOR_52W_REGRESSION_ANALYSIS_2026_02_14.md) | Regression analysis: army strengths, brigades, consolidation; root cause = scenario choice (player_choice vs full OOB). Use apr1992_historical_52w for 52w historical-fidelity runs. |
| [ORCHESTRATOR_APR1992_SCENARIO_CREATION_COMPREHENSIVE_REPORT_2026_02_14.md](implemented/ORCHESTRATOR_APR1992_SCENARIO_CREATION_COMPREHENSIVE_REPORT_2026_02_14.md) | End-to-end summary of April 1992 scenario work (Phases A–H): research, formation-aware flip, OOB cleanup (261 brigades, corps, HRHB subordination), JNA ghost mechanic, initial formations rebuild, **apr1992_definitive_52w** (player-facing, New Campaign side picker), **apr1992_historical_52w** (52w benchmark, default for `npm run sim:scenario:run:default`). Links to DEFINITIVE_APR1992, side picker, recruitment UI, regression analysis. |

---

## 6. Tactical map and viewer

| Report | What was implemented |
|--------|------------------------|
| [GUI_VISUAL_OVERHAUL_NATO_OPS_CENTER_2026_02_14.md](implemented/GUI_VISUAL_OVERHAUL_NATO_OPS_CENTER_2026_02_14.md) | Tactical Map visual identity: dark navy canvas (#0d0d1a), phosphor-green accents, IBM Plex Mono; two-pass front lines (amber glow + white dashed); settlement borders; formation markers with dark bg; nato_tokens.ts canonical palette. Canon: TACTICAL_MAP_SYSTEM §2, §8–10; GUI_DESIGN_BLUEPRINT §21. |
| [TACTICAL_MAP_VIEWER_FIXES_2026_02_13.md](implemented/TACTICAL_MAP_VIEWER_FIXES_2026_02_13.md) | MapApp fixes (e.g. null-control, dataset failure recovery, faction order). |
| [BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13.md](implemented/BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13.md) | Bot AI fixes (zero attack orders, pipeline ordering, posture-attack timing, supply gate); strategic objectives; scenario validation. Remaining issues listed as future work. |
| [ORCHESTRATOR_ONE_BRIGADE_PER_TARGET_REPORT_2026_02_14.md](implemented/ORCHESTRATOR_ONE_BRIGADE_PER_TARGET_REPORT_2026_02_14.md) | One brigade per faction per turn per target; OG+heavy-resistance exception (stub); unique_attack_targets diagnostic; canon updated (AI_STRATEGY_SPECIFICATION, Systems Manual §6.5, Phase II Spec §12, context). |
| [THREE_SIDED_BOT_AI_AND_STANDING_ORDERS_2026_02_14.md](implemented/THREE_SIDED_BOT_AI_AND_STANDING_ORDERS_2026_02_14.md) | Three-layer bot AI (army standing orders, corps AI, brigade AI); corps stance, named operations, OG activation, corridor breach; casualty-aversion, doctrine phases, economy of force, feints. Refactor pass 2026-02-14: shared `phase_ii_adjacency.ts` (buildAdjacencyFromEdges, getFactionBrigades), removed duplicate helpers and unused imports in bot_corps_ai/bot_brigade_ai/brigade_aor. |
| [ORDERS_PIPELINE_AND_POSTURE_UX_2026_02_15.md](implemented/ORDERS_PIPELINE_AND_POSTURE_UX_2026_02_15.md) | Full turn pipeline in desktop (runTurn from turn_pipeline.ts); IPC order staging (stage-attack-order, stage-posture-order, stage-move-order, clear-orders); GameStateAdapter fix (orders as Record not Array); MapApp wiring (desktop bridge, Attack/Move/Posture handlers, Clear Orders); player_faction excluded from bot AI (generate-bot-corps-orders, generate-bot-brigade-orders); posture picker UX (human labels, tooltip stats, inline description, disabled by cohesion/readiness). Canon: TACTICAL_MAP_SYSTEM §2, §13.3, §14.2, §21; DESKTOP_GUI_IPC_CONTRACT; Systems Manual §6.5. |
| [ORDER_TARGET_SELECTION_SYSTEM_2026_02_15.md](implemented/ORDER_TARGET_SELECTION_SYSTEM_2026_02_15.md) | Full targeting mode UX for attack/move orders: visual overlay (dim own-faction, pulse on hover, municipality highlight for move); enriched tactical tooltips (attack: target name, NATO class, controller, defender+posture; move: municipality); Escape to cancel; cursor feedback (crosshair/cell/not-allowed); panel targeting header (compact header with Cancel); attack confirmation flow (two-step: click target → confirm panel → confirm or cancel); preview dashed arrow; defenderBySid/munToSidsCache caches. Pure UI in MapApp.ts; no engine or IPC changes. Canon: TACTICAL_MAP_SYSTEM §2, §8, §12.4, §13.3, §21. |

---

## 7. Launchable desktop (GUI)

| Report / doc | What was implemented |
|--------------|----------------------|
| **Phase 1:** [src/desktop/README.md](../../src/desktop/README.md), [TACTICAL_MAP_SYSTEM.md](../20_engineering/TACTICAL_MAP_SYSTEM.md) §5.2 | Electron main (awwv protocol), map app + data/derived + assets; scripts: `desktop:map:build`, `desktop`; crests copied into build. |
| **Phase 2 (rewatch):** MapApp `loadReplayFromData()`, `window.awwv` hook (setReplayLoadedCallback, getLastReplayContent); "Open last run" button; File → Open replay; IPC load-replay-dialog, get-last-replay, replay-loaded. | Rewatch in app: Load Replay (file picker), File → Open replay (menu), Open last run; play/pause/step unchanged. |
| **Phase 3 (play myself):** Desktop sim API (`src/desktop/desktop_sim.ts`): loadScenarioFromPath, loadStateFromPath, advanceTurn (Phase 0/I/II browser-safe runners), serializeStateForIpc, deserializeStateFromIpc. scenario_runner: createInitialGameState exported with optional baseDir; createStateFromScenario(scenarioPath, baseDir); RunScenarioOptions.baseDir. Electron main: getBaseDir(), currentGameStateJson, getDesktopSim(), IPC load-scenario-dialog, load-state-dialog, advance-turn, game-state-updated; File menu Load scenario / Load state file. Preload: loadScenarioDialog, loadStateDialog, advanceTurn, setGameStateUpdatedCallback. MapApp: applyGameStateFromJson(), showStatusError(); play-myself row (Load scenario, Load state file, Advance turn) when awwv exposed. Build: desktop:sim:build (esbuild → dist/desktop/desktop_sim.cjs). | User can load scenario or state file and advance turns; map and state update after each advance. |
| **Recruitment UI from map:** Toolbar shows player's Capital and Equipment when state has recruitment; Recruit button and R open modal that lists only the player's side and only brigades recruitable right now; cost legend C/E/M (Capital, Equipment, Manpower); desktop IPC get-recruitment-catalog and apply-recruitment; confirm applies one player recruitment and map shows placement feedback (new formation selected 4s); desktop advance runs accrueRecruitmentResources (no bot recruitment). See [RECRUITMENT_UI_FROM_MAP_2026_02_14.md](implemented/RECRUITMENT_UI_FROM_MAP_2026_02_14.md) §2.6, TACTICAL_MAP_SYSTEM §13.8, DESKTOP_GUI_IPC_CONTRACT. | Player sees only their recruitable brigades with clear costs; capital/equipment accrue each turn on advance. |
| **New Game side picker (2026-02-14):** New Campaign opens side-selection overlay (RBiH, RS, HRHB with flags); user chooses a side; `start-new-campaign` IPC loads fixed April 1992 scenario (`apr1992_historical_52w.json`), sets `meta.player_faction`, injects `recruitment_state` for toolbar/Recruit modal; LoadedGameState exposes `player_faction`. See [NEW_GAME_SIDE_PICKER_APRIL_1992_2026_02_14.md](implemented/NEW_GAME_SIDE_PICKER_APRIL_1992_2026_02_14.md), GUI_DESIGN_BLUEPRINT §19.2, DESKTOP_GUI_IPC_CONTRACT, TACTICAL_MAP_SYSTEM §13.6, §21. | Player starts a new campaign by choosing side (no scenario file picker); April 1992 start with full OOB and recruitment state. |
| **GUI polish pass + refactor (2026-02-14):** Tab renames (OVERVIEW/CONTROL/MILITARY/HISTORY); strategic zoom corps-only with NATO XX markers and watercolor alpha on small settlements; corps detail panel (CORPS COMMAND/STRENGTH/OG/ORDER OF BATTLE with clickable subordinates); posture dropdown (5 options), MOVE/ATTACK target-selection mode; zoom-to-selection; pruned SETTINGS/HELP modals; browser mode Load Scenario + dimmed Continue; dataset dropdown fix; AAR 0-events message. Refactor: `panelReadinessColor()`, `showPanel()`, `enterOrderSelectionMode()` helpers. See [GUI_POLISH_PASS_AND_REFACTOR_2026_02_14.md](implemented/GUI_POLISH_PASS_AND_REFACTOR_2026_02_14.md). | Polished UI: clear tab labels, corps interaction, working action buttons, strategic watercolor, refactored panel helpers. |
| **Orders pipeline and posture UX (2026-02-15):** Desktop advance uses full `runTurn` pipeline (combat, supply, exhaustion, posture costs, AoR rebalance, bot AI); four IPC channels stage/clear orders (`stage-attack-order`, `stage-posture-order`, `stage-move-order`, `clear-orders`) so player Attack/Move/Posture persist in state and arrows appear immediately; GameStateAdapter parses `brigade_attack_orders` / `brigade_mun_orders` as Records; bot AI skips `meta.player_faction` so player orders are not overwritten; posture picker has human labels, tooltip stats, inline description, and disabled options by cohesion/readiness. See [ORDERS_PIPELINE_AND_POSTURE_UX_2026_02_15.md](implemented/ORDERS_PIPELINE_AND_POSTURE_UX_2026_02_15.md). | Player orders execute on advance; posture picker is readable and gated. |
| **Order target selection UX (2026-02-15):** Attack/Move enter targeting mode with visual overlay (own-faction dimmed for attack, municipality highlight for move), pulsing borders on hover, enriched tooltips (NATO class, controller, defender, posture), Escape to cancel, cursor feedback, compact targeting header, two-step attack confirmation (click target → confirm panel → confirm or cancel), preview dashed arrow. See [ORDER_TARGET_SELECTION_SYSTEM_2026_02_15.md](implemented/ORDER_TARGET_SELECTION_SYSTEM_2026_02_15.md). | Target selection is discoverable and low-misclick; attack orders require confirmation. |
| **Definitive April 1992 scenario (2026-02-14):** Fixed 15 HRHB subordination bugs, corps field mapping bug (261 brigades now have corps assignments). Removed anachronistic corps (7th, 6th, 28th/81st Independent); added 3 army HQs (GS ARBiH, MS VRS, MS HVO) as command-level entries for army-wide postures/operations. Final: RBiH 6 (GS+5), RS 7 (MS+6), HRHB 5 (MS+4). Equipment classes, available_from, mandatory on all 261 brigades. 18 corps/staff + 5 JNA ghost brigades (tag-based `dissolve:N`, 4-turn ramp-down). `apr1992_definitive_52w.json` with calibrated economics + 17 coercion municipalities. Side-picker: scenario briefing, per-faction descriptions, HARD/STANDARD/MODERATE badges. See [DEFINITIVE_APR1992_SCENARIO_2026_02_14.md](implemented/DEFINITIVE_APR1992_SCENARIO_2026_02_14.md). | First fully calibrated playable scenario with historically accurate OOB, army HQs, JNA ghost brigades, calibrated economics, enhanced faction selection UI. |

---

## 8. Canon checkpoints and phase completion

| Report | What was implemented |
|--------|------------------------|
| [CANON_CHECKPOINT_MILITIA_BRIGADE_PHASE_I.md](implemented/CANON_CHECKPOINT_MILITIA_BRIGADE_PHASE_I.md) | Checkpoint closed; militia/brigade/large-settlement aligned with Phase I. |
| [CANON_ALIGNMENT_MILITIA_BRIGADE_AND_LARGE_SETTLEMENT.md](implemented/CANON_ALIGNMENT_MILITIA_BRIGADE_AND_LARGE_SETTLEMENT.md) | Militia/brigade and control flip formula aligned with Phase I; large-settlement resistance documented. |
| [PHASE_E_COMPLETION_REPORT.md](implemented/PHASE_E_COMPLETION_REPORT.md), [PHASE_F_COMPLETION_REPORT.md](implemented/PHASE_F_COMPLETION_REPORT.md) | Phase E/F completion. |
| [BRIGADE_OPERATIONS_SYSTEM_COMPLETION_REPORT.md](implemented/BRIGADE_OPERATIONS_SYSTEM_COMPLETION_REPORT.md) | Brigade operations system completion. |
| [WARROOM_GUI_IMPLEMENTATION_REPORT.md](implemented/WARROOM_GUI_IMPLEMENTATION_REPORT.md) | Warroom GUI implementation. |
| [PHASE_A_INVARIANTS.md](implemented/PHASE_A_INVARIANTS.md) | Phase A invariants documented. |

---

## 9. Other implemented / resolved

| Report | What was implemented or resolved |
|--------|----------------------------------|
| [A1_MAP_EXTERNAL_EXPERT_HANDOVER.md](implemented/A1_MAP_EXTERNAL_EXPERT_HANDOVER.md) | Marked RESOLVED; superseded by docs/20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md. |
| [PARADOX_PHASEI_SCENARIO_LEVEL_TUNING_PASS_2026_02_11.md](implemented/PARADOX_PHASEI_SCENARIO_LEVEL_TUNING_PASS_2026_02_11.md), [PARADOX_PHASEI_MILITARY_ACTION_CALIBRATION_SWEEP_2026_02_11.md](implemented/PARADOX_PHASEI_MILITARY_ACTION_CALIBRATION_SWEEP_2026_02_11.md) | Calibration passes; no-flip scenario authoring. |
| [PARADOX_RECRUITMENT_ETHNIC_CONTROL_TEST_RUN_REPORT.md](implemented/PARADOX_RECRUITMENT_ETHNIC_CONTROL_TEST_RUN_REPORT.md) | Test run and findings absorbed. |

---

*For backlog (not yet implemented), see [CONSOLIDATED_BACKLOG.md](CONSOLIDATED_BACKLOG.md). For patterns and corrections, see [CONSOLIDATED_LESSONS_LEARNED.md](CONSOLIDATED_LESSONS_LEARNED.md) and .agent/napkin.md.*
