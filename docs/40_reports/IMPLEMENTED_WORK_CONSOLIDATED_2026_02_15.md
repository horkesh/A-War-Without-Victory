# Implemented Work — Consolidated (2026-02-15)

**Purpose:** Single consolidated view of all work that has been implemented and absorbed into code/canon. All former individual reports from `docs/40_reports/implemented/` have been merged into this document and the originals archived to `docs/_old/40_reports/implemented_2026_02_15/` (do not delete per 40_reports policy).

**Canon absorption:** Behavior and report content are reflected in Phase I/II specs, Systems Manual, context.md, TACTICAL_MAP_SYSTEM, DESKTOP_GUI_IPC_CONTRACT, and PROJECT_LEDGER_KNOWLEDGE as documented in this consolidation.

---

## 1. Combat and battle resolution

| Report (archived) | What was implemented |
|-------------------|----------------------|
| battle_resolution_engine_report_2026_02_12.md | Multi-factor battle resolution (terrain, equipment, experience, cohesion, posture, supply, corps, OG, resilience, disruption); casualty ledger (KIA/WIA/MIA + equipment); 1.3× victory threshold; snap events (Ammo Crisis, Commander Casualty, Last Stand, Surrender Cascade); Pyrrhic Victory. Canon: Phase II §5, §12; Systems Manual §7. |
| combat_balance_and_corridor_ai_refactor_pass_2026_02_12.md | Strategic target selection (scoreTarget), RS corridor defense AI (Posavina), faction posture limits, equipment in combat, Phase I consolidation 4→8 turns, sidToMun wiring. |

---

## 2. Recruitment and Phase II accrual

| Report (archived) | What was implemented |
|-------------------|----------------------|
| recruitment_system_implementation_report.md | Three-resource brigade activation at Phase I entry; ongoing Phase II accrual + recruitment. |
| ongoing_recruitment_implementation_report_2026_02_11.md | Phase II accrual (equipment/capital from production, embargo, trickles); runOngoingRecruitment with elective cap; phase-ii-recruitment pipeline step; determinism and tests. Systems Manual §13. |
| recruitment_system_design_note.md | Design and formulas; extended window implemented. |
| SCENARIO_FORCE_CALIBRATION_2026_02_15.md | April 1992 scenario force calibration: POOL_SCALE_FACTOR 55, organizational penetration seeds (party 85, paramilitary 60), FACTION_POOL_SCALE (RBiH 1.20, RS 1.05, HRHB 1.60), mandatory brigade spawn minimum 200, scenario recruitment resources (apr1992_definitive_52w) and desktop constants sync, population loader by_municipality_id fallback. Systems Manual §13; context implementation ref. |

---

## 3. Brigade AoR, strength, and municipality layer

| Report (archived) | What was implemented |
|-------------------|----------------------|
| BRIGADE_STRENGTH_AND_AOR_INVESTIGATION_2026_02.md | Casualties confirmed in state/UI; 229 AoR root cause fixed with MAX_MUNICIPALITIES_PER_BRIGADE (8). |
| 803rd_light_223_settlements_investigation.md | AoR vs operational cap; ensure step restricted to home muns; cap 8 muns per brigade. |
| refactor_pass_2026_02_11_brigade_aor.md | Brigade AoR refactor (ensure step, home muns only). |
| municipality_supra_layer_implementation_report.md | brigade_municipality_assignment → brigade_aor derivation; sync order. |
| BRIGADE_AOR_OVERHAUL_CORPS_DIRECTED_2026_02_14.md | Corps-directed AoR assignment (corps sectors, contiguous allocation, home mun + 2 neighbors); contiguity invariant (aor_contiguity, repair, rebalance guard); dispatcher in brigade_aor (corps_command → assignCorpsDirectedAoR, else legacy Voronoi); smooth map display (compound fill, outer boundary, breathing glow). Canon: Phase II §7.1, Systems Manual §2.1/§8, TACTICAL_MAP_SYSTEM §8. |
| CORPS_AOR_CONTIGUITY_ENFORCEMENT_2026_02_15.md | Corps-level AoR contiguity (checkCorpsContiguity, repairCorpsContiguity, enforceCorpsLevelContiguity); enclave exception (detectDisconnectedTerritories); Step 9 in assignCorpsDirectedAoR; pipeline step `enforce-corps-aor-contiguity` after `rebalance-brigade-aor`; brigade repair prefers same-corps targets. Canon: Phase II §7.1, §5; Systems Manual §2.1. |
| SCENARIO_INIT_SIX_FIXES_2026_02_15.md | VRS brigade HQ resolution: `resolveValidHqSid()` ensures brigade/corps HQ is faction-controlled (fallback to first faction-controlled settlement in same mun by SID); applied to mandatory/elective brigade and corps HQ creation. Brigade AoR contiguity at init: scenario_runner calls `initializeCorpsCommand()` before `initializeBrigadeAoR()` so corps-directed path runs; `initializeBrigadeAoR()` calls `enforceContiguity()` and `enforceCorpsLevelContiguity()` after derive (idempotent safety net). Canon: Phase II §7.1; Systems Manual §2.1, §13. |

---

## 4. Phase I control, no-flip, and initial control

| Report (archived) | What was implemented |
|-------------------|----------------------|
| PARADOX_PHASEI_NOFLIP_FINAL_PROPOSAL_2026_02_11.md | Military-action-only semantics; player_choice GO for recruitment-centric; ethnic/hybrid NO-GO default. |
| PARADOX_ETHNIC_INITIAL_CONTROL_CONVENE.md | init_control_mode: institutional \| ethnic_1991 \| hybrid_1992. |
| CONTROL_SEMANTICS_AND_MISSING_CONTROLLERS_BRIEF.md | Settlement-level control clarified in canon (Systems Manual §11); municipality-level as derived view. |
| SCENARIO_INIT_SIX_FIXES_2026_02_15.md | Velika Kladuša added to RBiH-aligned municipalities; canonical list now 9 (Bihać, Brčko, Gradačac, Lopare, Maglaj, Srebrenik, Tešanj, Tuzla, Velika Kladuša). Single source `src/state/rbih_aligned_municipalities.ts`. |

---

## 5. Scenario runs, handoffs, and decisions

| Report (archived) | What was implemented |
|-------------------|----------------------|
| ORCHESTRATOR_SCENARIO_RUNS_HANDOFF_2026_02_12.md, ORCHESTRATOR_SCENARIO_RUNS_HANDOFF_2026_02_13.md | Scenario run handoffs; phase_ii_attack_resolution in run_summary; no-flip semantics clarified. |
| ORCHESTRATOR_SCENARIO_HANDOFF_DECISIONS_2026_02_13.md | Closure: 0-flips cause (orders_processed), formation count change (OOB/recruitment path), disable_phase_i_control_flip semantics. |
| ORCHESTRATOR_ABSORPTION_AND_CANON_UPDATE_2026_02_13.md | Canon updates for Phase II pipeline, §12 stubs, Systems Manual §7, context/CANON refs. |
| ORCHESTRATOR_APR1992_SCENARIO_CREATION_COMPREHENSIVE_REPORT_2026_02_14.md | End-to-end summary of April 1992 scenario work (Phases A–H): research, formation-aware flip, OOB cleanup (261 brigades, corps, HRHB subordination), JNA ghost mechanic, initial formations rebuild. **Canon scenario:** **apr1992_definitive_52w** — single scenario for desktop New Campaign, bot optimization, and `npm run sim:scenario:run:default`. apr1992_historical_52w = legacy reference. Links to DEFINITIVE_APR1992, side picker, recruitment UI, regression analysis. |

*Convenes (remain in convenes/):* ORCHESTRATOR_52W_VIDEO_RUN_AND_ASPECTS_REPORT_2026_02_14.md (52w run --video --map); ORCHESTRATOR_52W_REGRESSION_ANALYSIS_2026_02_14.md (regression analysis). Canon 52w scenario: apr1992_definitive_52w.

---

## 6. Tactical map and viewer

| Report (archived) | What was implemented |
|-------------------|----------------------|
| GUI_VISUAL_OVERHAUL_NATO_OPS_CENTER_2026_02_14.md | Tactical Map visual identity: dark navy canvas (#0d0d1a), phosphor-green accents, IBM Plex Mono; two-pass front lines (amber glow + white dashed); settlement borders; formation markers with dark bg; nato_tokens.ts canonical palette. Canon: TACTICAL_MAP_SYSTEM §2, §8–10; GUI_DESIGN_BLUEPRINT §21. |
| TACTICAL_MAP_VIEWER_FIXES_2026_02_13.md | MapApp fixes (e.g. null-control, dataset failure recovery, faction order). |
| BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13.md | Bot AI fixes (zero attack orders, pipeline ordering, posture-attack timing, supply gate); strategic objectives; scenario validation. Remaining issues listed as future work. |
| ORCHESTRATOR_ONE_BRIGADE_PER_TARGET_REPORT_2026_02_14.md | One brigade per faction per turn per target; OG+heavy-resistance exception (stub); unique_attack_targets diagnostic; canon updated (AI_STRATEGY_SPECIFICATION, Systems Manual §6.5, Phase II Spec §12, context). |
| THREE_SIDED_BOT_AI_AND_STANDING_ORDERS_2026_02_14.md | Three-layer bot AI (army standing orders, corps AI, brigade AI); corps stance, named operations, OG activation, corridor breach; casualty-aversion, doctrine phases, economy of force, feints. Refactor pass 2026-02-14: shared `phase_ii_adjacency.ts` (buildAdjacencyFromEdges, getFactionBrigades), removed duplicate helpers and unused imports in bot_corps_ai/bot_brigade_ai/brigade_aor. |
| ORDERS_PIPELINE_AND_POSTURE_UX_2026_02_15.md | Full turn pipeline in desktop (runTurn from turn_pipeline.ts); IPC order staging (stage-attack-order, stage-posture-order, stage-move-order, clear-orders); GameStateAdapter fix (orders as Record not Array); MapApp wiring (desktop bridge, Attack/Move/Posture handlers, Clear Orders); player_faction excluded from bot AI (generate-bot-corps-orders, generate-bot-brigade-orders); posture picker UX (human labels, tooltip stats, inline description, disabled by cohesion/readiness). Canon: TACTICAL_MAP_SYSTEM §2, §13.3, §14.2, §21; DESKTOP_GUI_IPC_CONTRACT; Systems Manual §6.5. |
| ORDER_TARGET_SELECTION_SYSTEM_2026_02_15.md | Full targeting mode UX for attack/move orders: visual overlay (dim own-faction, pulse on hover, municipality highlight for move); enriched tactical tooltips (attack: target name, NATO class, controller, defender+posture; move: municipality); Escape to cancel; cursor feedback (crosshair/cell/not-allowed); panel targeting header (compact header with Cancel); attack confirmation flow (two-step: click target → confirm panel → confirm or cancel); preview dashed arrow; defenderBySid/munToSidsCache caches. Pure UI in MapApp.ts; no engine or IPC changes. Canon: TACTICAL_MAP_SYSTEM §2, §8, §12.4, §13.3, §21. |
| SCENARIO_INIT_SIX_FIXES_2026_02_15.md | Formation marker stacking: co-located markers grouped by quantized screen position (2px), offset horizontally so corps/brigade at same HQ sit side by side; hit-test uses same grouping. Corps-to-brigade command lines: when corps selected, dashed lines (faction color, 45% opacity) from corps to each subordinate; drawn between Pass 5 and Pass 5a. Settlement panel: 7 tabs in vertical stack (`.tm-panel-tabs` column, min-width 72px, border-left active). Canon: TACTICAL_MAP_SYSTEM §8, §13.2. |
| TACTICAL_MAP_SEVEN_UI_SIM_FIXES_2026_02_15.md | Seven fixes: (1) 4th Corps OOB — 7 core brigades set `available_from: 0, mandatory: true` (4 late-war remain at 8). (2) War Summary modal — per-faction formation count, personnel, attack/move orders, control gained/lost; BATTLES THIS TURN (settlement flips with faction colors); ALL CONTROL EVENTS. (3) Corps command lines — white #ffffff, 60% opacity, 2px dashed. (4) AoR highlight — fill alpha pulsed 0.08–0.22 (same sine as boundary glow). (5) Corps panel ACTIONS — stance dropdown (defensive/balanced/offensive/reorganize) via `stage-corps-stance-order` IPC; bulk Apply postures for subordinates. (6) Army HQ tier — FormationKind `army_hq`; NATO xxx symbol; army HQ panel (ARMY COMMAND, subordinate corps click-through); command lines and AoR merge; `initializeCorpsCommand` now includes `corps_asset`. (7) Markers — ~30% larger (strategic 44×30, operational 54×38, tactical 66×46), hit radius 36px; co-located markers offset **vertically**. Canon: TACTICAL_MAP_SYSTEM §2, §8, §13, §20, §21; DESKTOP_GUI_IPC_CONTRACT; Systems Manual implementation-note. |

---

## 7. Launchable desktop (GUI)

| Report / doc (archived or reference) | What was implemented |
|--------------------------------------|----------------------|
| Phase 1: src/desktop/README.md, TACTICAL_MAP_SYSTEM.md §5.2 | Electron main (awwv protocol), map app + data/derived + assets; scripts: `desktop:map:build`, `desktop`; crests copied into build. |
| Phase 2 (rewatch) | MapApp `loadReplayFromData()`, `window.awwv` hook (setReplayLoadedCallback, getLastReplayContent); "Open last run" button; File → Open replay; IPC load-replay-dialog, get-last-replay, replay-loaded. Rewatch in app: Load Replay (file picker), File → Open replay (menu), Open last run; play/pause/step unchanged. |
| Phase 3 (play myself) | Desktop sim API (`src/desktop/desktop_sim.ts`): loadScenarioFromPath, loadStateFromPath, advanceTurn (Phase 0/I/II browser-safe runners), serializeStateForIpc, deserializeStateFromIpc. scenario_runner: createInitialGameState exported with optional baseDir; createStateFromScenario(scenarioPath, baseDir); RunScenarioOptions.baseDir. Electron main: getBaseDir(), currentGameStateJson, getDesktopSim(), IPC load-scenario-dialog, load-state-dialog, advance-turn, game-state-updated; File menu Load scenario / Load state file. Preload: loadScenarioDialog, loadStateDialog, advanceTurn, setGameStateUpdatedCallback. MapApp: applyGameStateFromJson(), showStatusError(); play-myself row (Load scenario, Load state file, Advance turn) when awwv exposed. Build: desktop:sim:build (esbuild → dist/desktop/desktop_sim.cjs). User can load scenario or state file and advance turns; map and state update after each advance. |
| Recruitment UI from map (RECRUITMENT_UI_FROM_MAP_2026_02_14.md) | Toolbar shows player's Capital and Equipment when state has recruitment; Recruit button and R open modal that lists only the player's side and only brigades recruitable right now; cost legend C/E/M (Capital, Equipment, Manpower); desktop IPC get-recruitment-catalog and apply-recruitment; confirm applies one player recruitment and map shows placement feedback (new formation selected 4s); desktop advance runs accrueRecruitmentResources (no bot recruitment). TACTICAL_MAP_SYSTEM §13.8, DESKTOP_GUI_IPC_CONTRACT. |
| New Game side picker (NEW_GAME_SIDE_PICKER_APRIL_1992_2026_02_14.md) | New Campaign opens side-selection overlay (RBiH, RS, HRHB with flags). Current desktop flow adds scenario selection (`sep_1991` or `apr_1992`) and passes `{ playerFaction, scenarioKey }` to `start-new-campaign`. Main sets `meta.player_faction`; April 1992 start initializes recruitment_state for toolbar/Recruit modal. LoadedGameState exposes `player_faction`. GUI_DESIGN_BLUEPRINT §19.2, DESKTOP_GUI_IPC_CONTRACT, TACTICAL_MAP_SYSTEM §13.6, §21. |
| Electron warroom launcher flow (2026-02-15) | Desktop startup now opens warroom first (`awwv://warroom/index.html`) instead of tactical map. Warroom displays a launcher overlay (side picker + scenario picker: Sep 1991 / Apr 1992), calls `start-new-campaign` with `{ playerFaction, scenarioKey }`, and consumes `game-state-updated` IPC for canonical state. `advance-turn` now accepts optional `phase0Directives` payload so staged Phase 0 investments are applied in main before deterministic turn advance. Optional tactical map companion window can be opened from main via `open-tactical-map-window` (`awwv://app/tactical_map.html`). Build script `npm run desktop` now includes `warroom:build`. Canon/engineering refs: DESKTOP_GUI_IPC_CONTRACT, TACTICAL_MAP_SYSTEM §21. |
| GUI polish pass + refactor (GUI_POLISH_PASS_AND_REFACTOR_2026_02_14.md) | Tab renames (OVERVIEW/CONTROL/MILITARY/HISTORY); strategic zoom corps-only with NATO XX markers and watercolor alpha on small settlements; corps detail panel (CORPS COMMAND/STRENGTH/OG/ORDER OF BATTLE with clickable subordinates); posture dropdown (5 options), MOVE/ATTACK target-selection mode; zoom-to-selection; pruned SETTINGS/HELP modals; browser mode Load Scenario + dimmed Continue; dataset dropdown fix; AAR 0-events message. Refactor: `panelReadinessColor()`, `showPanel()`, `enterOrderSelectionMode()` helpers. |
| Orders pipeline and posture UX (ORDERS_PIPELINE_AND_POSTURE_UX_2026_02_15.md) | Desktop advance uses full `runTurn` pipeline (combat, supply, exhaustion, posture costs, AoR rebalance, bot AI); four IPC channels stage/clear orders so player Attack/Move/Posture persist in state and arrows appear immediately; GameStateAdapter parses orders as Records; bot AI skips `meta.player_faction`; posture picker has human labels, tooltip stats, inline description, disabled by cohesion/readiness. |
| Order target selection UX (ORDER_TARGET_SELECTION_SYSTEM_2026_02_15.md) | Attack/Move enter targeting mode with visual overlay, pulsing borders on hover, enriched tooltips, Escape to cancel, cursor feedback, compact targeting header, two-step attack confirmation, preview dashed arrow. |
| Definitive April 1992 scenario (DEFINITIVE_APR1992_SCENARIO_2026_02_14.md) | Fixed 15 HRHB subordination bugs, corps field mapping bug (261 brigades with corps assignments). Removed anachronistic corps; added 3 army HQs (GS ARBiH, MS VRS, MS HVO). Equipment classes, available_from, mandatory on all brigades. 18 corps/staff + 5 JNA ghost brigades (tag-based `dissolve:N`, 4-turn ramp-down). `apr1992_definitive_52w.json` with calibrated economics + 17 coercion municipalities. Side-picker: scenario briefing, per-faction descriptions, HARD/STANDARD/MODERATE badges. **Update 2026-02-17:** OOB corrected to true brigades only (25 non-brigade units removed): 236 brigades total, 195 mandatory at turn 0 (RBiH 116, RS 80, HRHB 40). See MILITIA_BRIGADE_FORMATION_DESIGN §10. |

---

## 8. Canon checkpoints and phase completion

| Report (archived) | What was implemented |
|-------------------|----------------------|
| CANON_CHECKPOINT_MILITIA_BRIGADE_PHASE_I.md | Checkpoint closed; militia/brigade/large-settlement aligned with Phase I. |
| CANON_ALIGNMENT_MILITIA_BRIGADE_AND_LARGE_SETTLEMENT.md | Militia/brigade and control flip formula aligned with Phase I; large-settlement resistance documented. |
| PHASE_E_COMPLETION_REPORT.md, PHASE_F_COMPLETION_REPORT.md | Phase E/F completion. |
| BRIGADE_OPERATIONS_SYSTEM_COMPLETION_REPORT.md | Brigade operations system completion. |
| WARROOM_GUI_IMPLEMENTATION_REPORT.md | Warroom GUI implementation. |
| PHASE_A_INVARIANTS.md | Phase A invariants documented. |

---

## 9. Other implemented / resolved

| Report (archived) | What was implemented or resolved |
|-------------------|----------------------------------|
| A1_MAP_EXTERNAL_EXPERT_HANDOVER.md | Marked RESOLVED; superseded by docs/20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md. |
| PARADOX_PHASEI_SCENARIO_LEVEL_TUNING_PASS_2026_02_11.md, PARADOX_PHASEI_MILITARY_ACTION_CALIBRATION_SWEEP_2026_02_11.md | Calibration passes; no-flip scenario authoring. |
| PARADOX_RECRUITMENT_ETHNIC_CONTROL_TEST_RUN_REPORT.md | Test run and findings absorbed. |
| BOT_AI_CAPITAL_POLICY_DECISION_2026_02_13.md, BOT_AI_HISTORICAL_ALIGNMENT_CLOSURE_2026_02_13.md | Bot AI policy and historical alignment closure (archived with above). |

---

## 10. Warroom overhaul, Phase 0 gameplay, and systems integration

| Report | What was implemented |
|--------|----------------------|
| WARROOM_PHASE0_AND_SYSTEMS_INTEGRATION_2026_02_15.md | Comprehensive warroom overhaul: Phase 0 pre-war gameplay loop (Sep 1991 → Apr 1992) with capital allocation, bot AI, historical events, dynamic newspaper/magazine/reports, declaration modals, Phase I transition. INVEST layer in War Planning Map with side panel (capital bar, org factors, investment options, staged undo). Ethnicity layer toggle. 11 new files (2,003 lines), 18 modified files. Six systems integration tasks with feature flags (legitimacy → authority/recruitment, IVP → exhaustion/negotiation, embargo enforcement, Phase 3B/3C coupling, enclave/Sarajevo → IVP, heavy equipment → combat). Browser-safe module extraction pattern (`legitimacy_utils.ts`). Phase 0 scenario file (`sep_1991_phase0.json`). Canon: Phase 0 Spec §4.1–§5; Engine Invariants §11.3, §16.A/D/K; Systems Manual §2.1, §7, §13. |

---

---

## 11. Warroom CSS restyle, scenario init fix, embedded tactical map, fog-of-war (2026-02-16)

| Report | What was implemented |
|--------|----------------------|
| WARROOM_RESTYLE_SCENARIO_FIX_EMBEDDED_MAP_FOG_OF_WAR_2026_02_16.md | **Four items:** (1) Complete warroom UI aesthetic overhaul — unified CSS design system (dark navy, IBM Plex Mono, #00e878/#ffab00/#ff3d00 accents); reusable .wr-dialog, .wr-btn-*, .wr-bar-* classes; modals.css rewritten (~1235 lines); DeclarationEventModal, FactionOverviewPanel, MagazineModal, ReportsModal, ClickableRegionManager all converted from inline styles to CSS classes. (2) Ahistorical 1992 scenario fix — 11 Apr 1992 scenarios switched from ethnic_1991 to hybrid_1992 init_control_mode with explicit init_control: apr1992; uses curated municipal controller file + 70% ethnic settlement override; test assertion relaxed to >= 3 formations. (3) Tactical map embedded as full-screen iframe in warroom window — no separate BrowserWindow; same-origin achieved via awwv://warroom/tactical-map/* protocol route; inline script inherits parent's IPC bridge; focusWarroom overridden with postMessage for scene-swap; state sync on return. (4) Faction fog-of-war — buildFormationPositionGroups and drawOrderArrows filter by player_faction; enemy formations invisible on canvas; defenders visible in attack panel; null player_faction shows all (replay/dev compat). |

---

## 12. Deterministic org-pen initialization and Phase 0->I handoff alignment (2026-02-16)

| Report | What was implemented |
|--------|----------------------|
| ORG_PEN_FORMULA_INIT_AND_PHASE0_HANDOFF_2026_02_16.md | Replaced uniform/controller-only organizational penetration seeds with deterministic A/B/C formula values: A = municipality controller (mayor-party proxy), B = faction-aligned 1991 population share threshold, C = planned war-start OOB brigade presence (`available_from <= war_start_turn`). Added pure formula module (`organizational_penetration_formula.ts`), refactored seeding path (`seed_organizational_penetration_from_control.ts`) with deterministic key normalization across controller/population/OOB maps, wired scenario initialization inputs in `scenario_runner.ts`, and aligned Phase 0->I uninvested handoff in `run_phase0_turn.ts` to formula-derived seeding. Added focused determinism/variance/integration tests. Canon propagation: Systems Manual implementation-note, Phase 0/I implementation-notes, context/docs index, ledger knowledge/changelog. |

---

## 13. Sep 1991 Phase 0 capital trickle calibration (2026-02-17)

| Report | What was validated |
|--------|--------------------|
| [SEP_1991_CAPITAL_TRICKLE_CALIBRATION_2026_02_17.md](convenes/SEP_1991_CAPITAL_TRICKLE_CALIBRATION_2026_02_17.md) | 20w/31w Sep 1991 runs confirm trickle constants (1/turn, max +20) reach cap by turn 20; no tuning needed. Phase_0_Spec §4.1.1 implementation-note added. |

---

## 14. Deferred recruitment and ARBiH corps scope (2026-02-17)

| Item | What was implemented |
|------|----------------------|
| **Deferred recruitment** | Scenario flag `no_initial_brigade_formations` with `recruitment_mode: "player_choice"`: init creates corps/army_hq only; brigades appear only via turn-based recruitment from turn 0 onward. Same deterministic Phase 0→militia→pool path; AoR/corps init valid with zero brigades. Scenario types + loader + scenario_runner; tests: scenario_no_initial_brigades.test.ts, init_control_mode + oob_phase_i_entry. Canon: Systems Manual §13, Phase II Spec (pipeline note), MILITIA_BRIGADE_FORMATION_DESIGN §10. |
| **ARBiH 6th/7th corps policy** | Game scope: ARBiH has five corps (1st–5th) + General Staff; 6th/7th do not exist. Historical 6th→4th, 7th→3rd in tools (enrich/rebuild); `available_from` set to 0 for all 3rd/4th corps brigades in oob_brigades.json. MILITIA_BRIGADE_FORMATION_DESIGN §10, formation-expert SKILL.md, PROJECT_LEDGER. |

---

---

## 15. Tactical map layers UX (2026-02-17)

| Item | What was implemented |
|------|----------------------|
| **Bottom floating layer toolbar** | Replaced the top-right collapsible "Layers" panel with a **bottom floating layer toolbar** (`.tm-layer-toolbar`) containing only layer checkboxes (Political control, Front lines, Settlement labels, Municipality borders, Minimap, Formations, Brigade AoR). Same checkbox IDs preserved for MapApp wiring. |
| **Load/run/replay off map surface** | Load State, Load Run, Load Replay, dataset selector, and replay transport controls are no longer on the map surface; loading is via main menu (Menu → Load Save / Load Replay) or desktop IPC (`game-state-updated`). Hidden compatibility elements retained for existing IPC/file handlers. |
| **Shortcut** | `L` (toggle layer panel) removed; no replacement (layers are always visible in the bottom toolbar). |

Canon: TACTICAL_MAP_SYSTEM §2, §13.1, §14.1; keyboard table no longer lists `L`.

---

## 16. Tactical map GUI corrections (2026-02-17)

| Item | What was implemented |
|------|----------------------|
| **Toolbar date** | Top-right shows single campaign date derived from phase anchor (Phase 0 = Sep 1991; Phase I/II = Apr 1992). Replaces turn/capital/army summary text. |
| **Settlement panel 5 tabs** | Tabs consolidated to OVERVIEW, CONTROL, MILITARY, ORDERS/EVENTS, HISTORY. Overview merges identification and admin; no SID/ID/provenance; type in sentence case; Military formation rows clickable to open formation panel. |
| **Corps panel trim** | Removed ID, Faction, Status, Created (turn). Keeps CORPS COMMAND (stance, exhaustion, command span), STRENGTH, OPERATIONAL GROUPS, ORDER OF BATTLE, ACTIONS. |
| **Brigade panel trim** | Removed FORMATION metadata block. Chain of Command section with prominent clickable parent corps; Statistics; AoR; SET POSTURE, MOVE/ATTACK, Clear Orders; zoom-to-selection. |
| **Recruitment modal** | Wording: "Brigades you can recruit right now" and cost legend (C/E/M). |

Canon: TACTICAL_MAP_SYSTEM §2 (summary), §13, §13.2, §13.3.

---

## 17. Staff Map (4th zoom layer) and settlement border removal (2026-02-17)

| Report | What was implemented |
|--------|----------------------|
| [STAFF_MAP_4TH_ZOOM_LAYER_AND_SETTLEMENT_BORDER_REMOVAL_2026_02_17.md](implemented/STAFF_MAP_4TH_ZOOM_LAYER_AND_SETTLEMENT_BORDER_REMOVAL_2026_02_17.md) | **Staff Map:** 4th viewing layer — procedural paper-map overlay (parchment, terrain hatching, serif typography, desaturated faction fills, full-detail 100×60px formation counters, front lines, cartographic decorations). Entry: press `4` → drag rectangle (≥5 settlements) → staff map opens at 8× zoom; separate overlay canvas with 10-pass pipeline and three-tier caching; all procedural effects deterministic (detHash). **Settlement border removal:** main tactical map no longer draws inter-settlement polygon strokes; settlement fills only. Bug fixes: staff map canvas `pointer-events: none` so exit button and clicks work; staff map labels limited to URBAN_CENTER and TOWN. Canon: TACTICAL_MAP_SYSTEM §2, §7, §8, §9, §12, §13. |

---

## 18. Staff Map: 12 visual enhancements (2026-02-17)

| Report | What was implemented |
|--------|----------------------|
| [STAFF_MAP_12_VISUAL_ENHANCEMENTS_2026_02_17.md](implemented/STAFF_MAP_12_VISUAL_ENHANCEMENTS_2026_02_17.md) | **Staff Map visual polish:** (1) Faction-colored 6px sidebar stripe on formation counters. (2) Barbed-wire front lines (quadratic Bezier curves + perpendicular barb ticks). (3) AoR faction fill with diagonal crosshatch (no settlement borders). (4) Contour lines from elevation (400/800/1200m thresholds). (5) River labels (italic blue, rotated along course). (6) Fold creases on parchment. (7) Pencil crosshatch for contested zones (≥2 cross-faction neighbors). (8) Coffee stain ring on parchment. (9) Margin annotations (week/date, formations per faction). (10) Irregular vignette edge (noise-modulated strips). (11) Faction army crests at top center (ARBiH, VRS, HVO). (12) Exit button moved to top-left. All deterministic (detHash); three-tier caching unchanged. Canon: TACTICAL_MAP_SYSTEM §2 (Staff Map). |

---

## 19. Staff Map crest stamp and war map barbed-wire front lines (2026-02-17)

| Report | What was implemented |
|--------|----------------------|
| [STAFF_MAP_CREST_STAMP_AND_WARMAP_BARBED_WIRE_FRONTLINES_2026_02_17.md](implemented/STAFF_MAP_CREST_STAMP_AND_WARMAP_BARBED_WIRE_FRONTLINES_2026_02_17.md) | **(1) Staff Map crest stamp:** Replaced three faction crests with a single player-faction crest in the top-left (right of exit button), styled as a faded ink stamp (rotation ~3.4° CCW, thin border frame, 0.55 alpha). Uses `loadedGameState.player_faction` (RBiH→ARBiH, RS→VRS, HRHB→HVO); no crest if player_faction null. **(2) War map barbed-wire front lines:** Main tactical map front lines now use the same barbed-wire motif as the staff map: 3-pass (glow + solid Bézier curve + perpendicular barb ticks at 14px intervals). `detHash()` exported from `constants.ts` and shared by MapApp and StaffMapRenderer. Canon: TACTICAL_MAP_SYSTEM §2 (front lines, Staff Map). |

---

## 20. War map enhanced formation markers (2026-02-17)

| Report | What was implemented |
|--------|----------------------|
| [WARMAP_ENHANCED_FORMATION_MARKERS_2026_02_17.md](implemented/WARMAP_ENHANCED_FORMATION_MARKERS_2026_02_17.md) | **Seven changes:** (1) **Marker refactor** — `drawNatoFormationMarker()` now accepts full `FormationView` and zoomLevel; derives shape/faction/posture from f. (2) **Readiness glow** — 1px inset stroke with `panelReadinessColor(f.readiness)` (active/forming/overextended/degraded). (3) **Strength numbers** — personnel below NATO symbol (formatStrength: &lt;1000 as-is, ≥1000 as X.Xk); corps/army show subordinate count (×N); zoom-adaptive 8px/9px. (4) **Name labels** — at tactical zoom only, below marker (8px mono, truncate 18 chars, dark pill bg). (5) **AABB hit-test** — replaced circular radius with axis-aligned bounding box (dim + 4px margin); topmost match when overlapping. (6) **ResizeObserver canvas fix** — canvas wrapper observed so resize runs when sidebar/panel opens or closes. (7) **Formation dimming** — non-selected formations at globalAlpha 0.25 (war map and staff map). Dead code removed (FORMATION_HIT_RADIUS, formatCampaignDate duplicate, unused constants). Canon: TACTICAL_MAP_SYSTEM §2, §8. |

---

## 21. Front line defended/undefended distinction and AoR crosshatch color (2026-02-17)

| Report | What was implemented |
|--------|----------------------|
| [FRONT_LINE_DEFENDED_UNDEFENDED_2026_02_17.md](implemented/FRONT_LINE_DEFENDED_UNDEFENDED_2026_02_17.md) | **(1) Defended vs undefended front:** Segment is defended if at least one adjacent settlement is in any brigade AoR; otherwise undefended. Defended: solid white line, warm gold glow, barbed-wire ticks. Undefended: dashed (6/4px), dimmer white, reddish glow, no barbs. **(2) AoR crosshatch adaptive color:** When Political Control layer ON, crosshatch uses black (visible on faction fills); when OFF, white (visible on dark background). Constants: FRONT_LINE.undefendedColor, undefendedGlowColor, undefendedDash. Canon: TACTICAL_MAP_SYSTEM §2 (front lines), §8 (AoR highlight). |

---

## 22. War map labels, AoR auto-display, front/AoR cleanup (2026-02-17)

| Report | What was implemented |
|--------|----------------------|
| [WARMAP_LABELS_AOR_FRONT_CLEANUP_2026_02_17.md](implemented/WARMAP_LABELS_AOR_FRONT_CLEANUP_2026_02_17.md) | **Six changes:** (1) **Labels restricted** to URBAN_CENTER and TOWN at all zoom levels (small settlement labels removed). (2) **Labels toggle removed** — labels always on; no checkbox. (3) **Brigade AoR toggle removed** — AoR highlight automatic when any formation selected; no layer toggle. (4) Front line defended/undefended distinction (aligns with §21). (5) AoR crosshatch adaptive color (aligns with §21). (6) **Crosshatch density increased** (spacing 7→5, width 1.0→1.5, alpha 0.35→0.55) on war map and staff map. Dead code: LayerVisibility.labels and .brigadeAor, DEFAULT_LAYERS, checkbox DOM, setLayer('brigadeAor') calls, #layer-labels and #layer-brigade-aor HTML. Canon: TACTICAL_MAP_SYSTEM §2, §8, §13.1. |

---

## 23. Displacement refactor: shared utils (2026-02-17)

| Report | What was implemented |
|--------|----------------------|
| [DISPLACEMENT_REFACTOR_SHARED_UTILS_2026_02_17.md](implemented/DISPLACEMENT_REFACTOR_SHARED_UTILS_2026_02_17.md) | **Code organization (no behavior change):** New `displacement_state_utils.ts` with `getOrInitDisplacementState` and `getMunicipalityIdFromRecord`. `displacement_takeover` and `minority_flight` import from it; removed ~30 lines duplication each. Simplified `minority_flight` (redundant assignments, unused import). Canon: Systems Manual §12 implementation-note (displacement module structure). |

---

## 24. Dual defensive arc front lines and war map UI cleanup (2026-02-17)

| Report | What was implemented |
|--------|----------------------|
| [DUAL_DEFENSIVE_ARC_FRONT_LINES_2026_02_17.md](implemented/DUAL_DEFENSIVE_ARC_FRONT_LINES_2026_02_17.md) | **Dual defensive arc front lines:** Replaced single white front line with **paired faction-colored defensive arc symbols** on each side of settlement borders — arcs only where brigades are deployed (defendedByFaction from brigade AoR). Both factions with AoR → arcs both sides; one faction → arcs that side only; neither → nothing drawn. Perpendicular barb ticks toward enemy; faction colors from SIDE_RGB (RBiH green, RS crimson, HRHB blue). Old single-line system removed (undefended/dashed, FRONT_LINE.color/glowColor/barbColor, defendedSids partition). Refactor: single collection loop then glow/arc/barb draw passes. Also: AoR crosshatch adaptive color and density, labels URBAN_CENTER+TOWN only, Labels and Brigade AoR toggles removed (aligns with §22). Canon: TACTICAL_MAP_SYSTEM §2 (front lines), §8. |

---

*For backlog (not yet implemented), see [CONSOLIDATED_BACKLOG.md](CONSOLIDATED_BACKLOG.md). For patterns and corrections, see [CONSOLIDATED_LESSONS_LEARNED.md](CONSOLIDATED_LESSONS_LEARNED.md) and .agent/napkin.md. Original report files archived to docs/_old/40_reports/implemented_2026_02_15/.*
