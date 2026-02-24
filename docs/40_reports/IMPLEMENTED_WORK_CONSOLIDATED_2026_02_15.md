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

**Displacement receiving cap and census seeding (2026-02-18, Run Problems):** Receivers cap at pre-war × 1.5 (Sarajevo area × 1.1 due to siege); overflow beyond cap routed to next-closest urban centers (`displacement_routing_data.ts`, `displacement.ts`, `displacement_takeover.ts`). At scenario load, when census is available and start_phase is phase_i or phase_ii, `displacement_state` is seeded from 1991 census so `original_population` and map "Population (Current)" scale by real mun size (docs/20_engineering/DISPLACEMENT_CENSUS_SEEDING.md). Run summary includes `defender_present_battles` and `defender_absent_battles` (Phase II §11.1). Sarajevo hold anchor: `centar_sarajevo` expected RBiH in historical anchors (harness). Canon: Phase I §4.4.3, Phase II §15, Systems Manual §12.

---

## 24. Dual defensive arc front lines and war map UI cleanup (2026-02-17)

| Report | What was implemented |
|--------|----------------------|
| [DUAL_DEFENSIVE_ARC_FRONT_LINES_2026_02_17.md](implemented/DUAL_DEFENSIVE_ARC_FRONT_LINES_2026_02_17.md) | **Dual defensive arc front lines:** Replaced single white front line with **paired faction-colored defensive arc symbols** on each side of settlement borders — arcs only where brigades are deployed (defendedByFaction from brigade AoR). Both factions with AoR → arcs both sides; one faction → arcs that side only; neither → nothing drawn. Perpendicular barb ticks toward enemy; faction colors from SIDE_RGB (RBiH green, RS crimson, HRHB blue). Old single-line system removed (undefended/dashed, FRONT_LINE.color/glowColor/barbColor, defendedSids partition). Refactor: single collection loop then glow/arc/barb draw passes. Also: AoR crosshatch adaptive color and density, labels URBAN_CENTER+TOWN only, Labels and Brigade AoR toggles removed (aligns with §22). Canon: TACTICAL_MAP_SYSTEM §2 (front lines), §8. |

---

## 25. Faction AI improvements across all phases (2026-02-18)

| Report | What was implemented |
|--------|----------------------|
| [FACTION_AI_IMPROVEMENTS_ALL_PHASES_2026_02_18.md](implemented/FACTION_AI_IMPROVEMENTS_ALL_PHASES_2026_02_18.md) | **Six-stage faction bot overhaul.** (1) **Phase 0 bot integration fix:** Headless runs now run Phase 0 bot investments and relationship init in `runOneTurn()` (src/state/turn_pipeline.ts), mirroring warroom logic so non-player factions invest during Phase 0. (2) **Phase II operations catalog & defensive OGs:** Six new named operations (2 per faction: sector_attack/strategic_defense); OGs can activate during strategic_defense with posture 'defend'; corridor breach donor threshold 3→2; OGActivationOrder.posture extended to 'defend'. (3) **Emergency defensive operations:** generateEmergencyDefensiveOperations() for defensive corps with no active op when sector threat > 2.0; launches strategic_defense with up to 4 brigades. (4) **Phase 0 faction-specific strategies:** FACTION_PHASE0_STRATEGIES (RS paramilitary-first/aggressive budget; RBiH TO-first/contested bonus; HRHB police/party); alliance-aware coordination (RBiH–HRHB when relationship > 0.2). (5) **Inter-corps coordination & economy of force:** coordinateMultiCorpsOffensive() pre-sets top 2 corps offensive under general_offensive; CORRIDOR_BREACH_MAX_STRIP_WIDTH 5→8; dynamic elastic defense [1, 4] scaled by front brigade count (1 per 5 front brigades) in bot_brigade_ai. (6) **Phase I bot AI (new):** src/sim/phase_i/bot_phase_i.ts — posture assignment (hold/probe/push) for bot-controlled factions; PHASE_I_PROFILES (RS 40% push + early boost; RBiH 8% push; HRHB 20%); alliance-aware edge skip; pipeline step phase-i-bot-posture in turn_pipeline.ts. Canon: Phase II Spec §5/§12 implementation-note; Systems Manual §6.5; context, docs_index, ledger. |

---

## 26. Tactical map UX: accessibility, visual feedback, typography, color, discoverability, missing states (2026-02-19)

| Source | What was implemented |
|--------|----------------------|
| Warmap GUI UX plan (cursor plan), PROJECT_LEDGER 2026-02-19 | **Accessibility:** Canvas `aria-describedby` + live region (#map-aria-description) for selected/hovered settlement; Arrow keys (when map focused) move selection between settlements (deterministic sorted SID); Enter opens panel; focus-visible rings on toolbar and canvas. **Visual feedback:** Cursor pointer over settlements, crosshair otherwise; hover glow (shadowBlur 5px) and selection outline pulse (2→4px over 600ms); subtle formation marker outer glow (faction color). **Layout:** Toolbar grouped (View \| Tools \| Info) with separators; panel tabs 90px min-width, 10px font. **Typography:** Sentence case for body content; 12px body/controls, 10px labels; control status and settlement type in sentence case. **Color:** Accent green desaturated to #00d470 (--accent-green, --accent-green-rgb); subtle root gradient. **Discoverability:** Tooltips (title) on all toolbar/zoom/layer controls with shortcuts; Help modal lists Arrow/Enter. **States:** Loading spinner and text during init; error overlay with Retry on load failure; OOB "No formations deployed" and Military tab empty copy; optional first-time quick tour (Tour button, localStorage awwv.tacticalMap.tutorialDone). Canon: TACTICAL_MAP_SYSTEM §2; docs/plans/2026-02-19-warmap-figma-spec.md implementation note; PROJECT_LEDGER_KNOWLEDGE Handovers. |

---

## 27. GUI and map frontline rework + refactor (2026-02-21)

| Report | What was implemented |
|--------|----------------------|
| [GUI_MAP_FRONTLINE_REWORK_AND_REFACTOR_2026_02_21.md](implemented/GUI_MAP_FRONTLINE_REWORK_AND_REFACTOR_2026_02_21.md) | **Visibility and data:** `front_edges` persisted in GameState (canonical serialization); 2D map prefers canonical `frontEdges` when present and draws strategic front even without local brigade defender; 3D FrontLineLayer uses canonical edges with robust fallback. **Corps assignment UI:** Corps panel Stage Front (derive from subordinate AoR → `stage-corps-front-order`), Stage Axis (`stage-corps-attack-axis-order`), Stage OG (`stage-og-subfront-order`); IPC already present, first playable path in 2D. **Warmap fixes:** Load Save menu only when desktop has no state; Day/Night (N) in operational 3D only, message shown there. **Refactor:** MapApp single `normalizeEdgeId`; turn_pipeline `getEdgesForTurn()` shared by refreshFrontEdgeSnapshot and Phase I; FrontLineLayer single `useCanonicalEdges`. Canon: TACTICAL_MAP_SYSTEM §2, DESKTOP_GUI_IPC_CONTRACT; context.md implementation ref. |

---

## 28. Front system comprehensive rebuild (HoI theatres + assignable fronts) (2026-02-21)

| Report | What was implemented |
|--------|----------------------|
| [FRONT_SYSTEM_REBUILD_HOI_THEATRES_2026_02_21.md](implemented/FRONT_SYSTEM_REBUILD_HOI_THEATRES_2026_02_21.md) | **Phases 1–6:** (1) Contiguous assignable front segments from hostile boundary edges (`assignable_front_segments`). (2) Reserve rule: `brigade_front_assignment` (front_id \| null); reserve brigades do not apply pressure or execute attack/posture/movement until assigned. (3) Theatres and army_theatre_assignment; segment theatre linkage. (4) GUI assign-to-front, hierarchy panel Theatre → Army → Corps → Brigade. (5) Naming IPC: assign-brigade-to-front, rename-front-segment, rename-theatre. (6) Canon propagation (Game Bible, Rulebook, Systems Manual). 2D/3D single source: both maps read same GameState; verification test plan in TACTICAL_MAP_SYSTEM §10.4, §21.3; state contract in DESKTOP_GUI_IPC_CONTRACT. |

---

## 29. Headless corps fronts and run_summary tracking (2026-02-21)

| Source | What was implemented |
|--------|----------------------|
| PROJECT_LEDGER 2026-02-21, refactor + pipeline | **Pipeline:** Phase II step `ensure-derived-corps-front-edges` before `apply-corps-front-orders`: calls `ensureDerivedCorpsFrontEdges(state, edges)` so headless scenario runs populate `corps_front_edges` from brigade AoR and `applyCorpsFrontAutoDistribution` can run. **Run summary:** When Phase II ran, `run_summary.json` includes `front_corps_tracking: { corps_front_edges_present: boolean, corps_count: number }` for diagnostics. Refactor: removed dead `component.length === 0` check in assignable_front_segments. |

---

## 30. Warmap sandbox visual & UX port (2026-02-21)

| Report | What was implemented |
|--------|----------------------|
| [WARMAP_SANDBOX_VISUAL_UX_PORT_2026_02_21.md](implemented/WARMAP_SANDBOX_VISUAL_UX_PORT_2026_02_21.md) | **Operational 3D warmap** — Port from tactical sandbox into `map_operational_3d.ts` (blue-steel NATO aesthetic retained). **Counters:** Two-tier formation paint — brigade 128×72 light background; corps 256×160 CRT-style (green name, strength/posture colors, corps-tint border). **Stem lines:** Vertical lines from counters to terrain with radial-gradient dots (corps green, brigade gray-blue); visibility synced with sprite LOD. **Overlays:** AoR upgrade (per-polygon hatch, perpendicular contact-edge segments); polygon-fill movement range (GeoJSON settlement shapes, dashed border, deployed/undeployed colors); settlement highlight rings (HQ blue, move green, attack red, animated). **Panels:** Right-side stack (WarMapPanelStack) — Selection (formation stats, posture dropdown, deploy/undeploy), Orders queue (pending with cancel), Battle log (turn-by-turn scrollable), Forces summary (per-faction bde count + personnel). **Modes:** SELECT/ATTACK/MOVE toolbar (1/2/3, Escape); DesktopBridge `stagePostureOrder` / `stageAttackOrder` for panel and mode flow. Map mode/Post-FX/layer toggles moved to left to avoid panel collision. Canon: TACTICAL_MAP_SYSTEM §2, §21.2; DESKTOP_GUI_IPC_CONTRACT; Systems Manual implementation-note. |

---

## 31. Warroom war-phase modals (2026-02-21)

| Report | What was implemented |
|--------|----------------------|
| [WARROOM_WAR_PHASE_MODALS_2026_02_21.md](implemented/WARROOM_WAR_PHASE_MODALS_2026_02_21.md) | **Seven desk objects + declaration events** wired to real war-phase GameState via shared extraction and three-tier fog. **Data:** `data/fog_of_war.ts` (FogTier, strength categories); `data/war_data_extractor.ts` — single entry point `extractWarData(gameState, playerFaction)` → WarDataSnapshot (12 sub-snapshots); fog enforced at extraction boundary. **Delta events:** `data/warroom_state.ts` (PreviousTurnSnapshot singleton), `data/turn_event_generator.ts` (generateTurnEvents, 11 event types); capture before advance, consume after. **Desk objects:** Flag (FactionOverviewPanel) — real personnel, casualties, 4-quadrant layout; Magazine — phase gate, 6-section war assessment, faction mastheads; Reports — 6-section intelligence brief; Telephone — new DiplomacyModal (RS/RBiH/HRHB faction-specific); Newspaper — war communique, pickBestWarHeadline, fog-framed; Ticker — dynamic war events (max 5) + ~180 scripted historical (turns 32–207); Calendar — THIS WEEK preview (pending ops, WIA, corps ops, warnings). **Declaration:** 4 war milestone events (rbih_hrhb_war_begins, ceasefire, washington, exhaustion_critical); findWarMilestoneEvent. 7 new files, 9 modified under `src/ui/warroom/`; no simulation files modified; determinism preserved (sorted iteration, no timestamps/random). |

---

## 32. Operational settlement merger tool & HoI map control layer rework (2026-02-22)

| Report | What was implemented |
|--------|----------------------|
| [20260222_OPERATIONAL_SETTLEMENT_MERGER_AND_HOI_MAP_REWORK.md](implemented/20260222_OPERATIONAL_SETTLEMENT_MERGER_AND_HOI_MAP_REWORK.md) | **Three bodies of work:** (1) **Settlement Merger Tool** — Standalone Vite page `settlement_merger.html` (7 new files under `src/ui/map/merger/`): hand-curate merge groups with visual feedback, ethnic composition, contiguity validation, cross-municipality warnings, save/load, TopoJSON export; Mostar split applied (5,823 → 5,824 displayed). (2) **Derive pipeline migration** — Replaced algorithmic clustering (Phases 2–4.6) with import of 702 hand-curated merge groups from `data/source/merge_progress.json`; **753 operational settlements** (702 merged + 51 singletons) from 5,823 canonical; OSID format `op:<mun>:<slug>`; all 5 outputs in `data/derived/operational/` (operational_settlements.geojson, canonical_to_operational_map.json, operational_contact_graph.json, operational_political_control.json, operational_initial_master.json). Political control: RBiH 372, RS 266, HRHB 115. (3) **HoI map renderer rework** — Single merged mesh with global vertex table and per-vertex colors (zero gaps/overlaps); tilt default 20°, zoom 4.5; cleanup duplicate constants. **OSID is now the canonical map unit** for simulation, rendering, and political control. |

---

## 33. AoR phase-out OSID/ZoC full implementation (2026-02-23)

| Report | What was implemented |
|--------|----------------------|
| [20260223_AOR_PHASEOUT_OSID_ZOC_FULL_IMPLEMENTATION.md](implemented/20260223_AOR_PHASEOUT_OSID_ZOC_FULL_IMPLEMENTATION.md) | **Phase II spatial model is OSID/ZoC-only.** (1) Canon + reconciliation: AoR references removed from Phase II Spec, Systems Manual, Engine Invariants, Rulebook, PIPELINE_ENTRYPOINTS, context.md; reconciliation doc `AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md`. (2) State: `brigade_aor`, `brigade_aor_orders`, `brigade_mun_orders`, `brigade_municipality_assignment` removed from GameState type and serialization; `LegacyBrigadeAoRState` + `getLegacyAoR()` for transition reads; migrateState strips legacy keys. (3) Pipeline: AoR steps removed; `phase-ii-location-osid-backfill`; `assignable_front_segments` from `phase_ii_front_edges_osid` in refreshFrontEdgeSnapshot; Phase I→II no `initializeBrigadeAoR`. (4) Scenario/run_phase_ii_browser: no AoR init; backfill only. (5) UI adapters, war_data_extractor, desktop_sim, sandbox_engine: Phase II use `location_osid` and OSID front edges. (6) Bot: `generate-bot-brigade-orders` OSID path only when operational data present; no brigade_aor gate. Known Vitest failures (AoR-related) documented; not blocking scenario runs. |

---

## 35. HoI map 3D tilt fix & political control texture-on-terrain (2026-02-23)

| Report | What was implemented |
|--------|----------------------|
| [20260223_HOI_MAP_3D_TILT_AND_TEXTURE_ON_TERRAIN.md](implemented/20260223_HOI_MAP_3D_TILT_AND_TEXTURE_ON_TERRAIN.md) | **Two-phase fix for HoI 2.5D map at steep camera tilt.** (1) **Depth/tilt:** Ortho camera far 1000→100; control layer Y 0.02→0.001, per-feature Y step removed (overlap via reverse iteration + `depthFunc: LessDepth` + polygonOffset); front ribbons Y 0.10→0.002, ZoC/assignable Y reduced; polygonOffset on all overlay layers; `t`/`T` keyboard tilt adjust (5°). (2) **Texture-on-terrain:** Political control no longer a separate floating polygon mesh; faction colors rasterized onto 2048×2048 canvas (per operational settlement polygon, 75% opacity) and applied to terrain mesh geometry (same BufferGeometry → no gaps, no terrain poke-through at any tilt). Invisible control mesh retained for raycasting (hover/click). F2 Political toggles faction overlay mesh. Report: full implementation details, verification, canon propagation. |

---

## 36. HoI map improvements phased (2026-02-23)

| Report | What was implemented |
|--------|----------------------|
| [20260223_HOI_MAP_IMPROVEMENTS_PHASED.md](implemented/20260223_HOI_MAP_IMPROVEMENTS_PHASED.md) | **All five Orchestrator convene improvements.** Phase 1: Option C layout (gap:0 .hoi-main). Phase 2: Shared terrain/heightmapSmooth.ts; HoIMapRenderer smoothHeightmap(2,2) before buildTerrainMesh. Phase 3: Orbit yaw ±30° (middle-drag, Shift+right-drag horizontal). Phase 4: Label LOD — zoom &lt; DEFAULT_ZOOM/1.4 → 256×64/18px, else 128×32/14px; rebuild on threshold cross. Phase 5: HoI front style (neutral band + center line, zoom-scaled width, asymmetric player-faction side). **Front = full hostile boundary** (no "where units" filter). Architect decisions flagged: LOD threshold 1.4×; friendly = playerFaction. TACTICAL_MAP_SYSTEM §2 updated. |

---

## 37. OSID terrain-weighted column movement and bot column march (2026-02-23)

| Report | What was implemented |
|--------|----------------------|
| [20260223_OSID_COLUMN_MOVEMENT_AND_BOT_COLUMN_MARCH.md](implemented/20260223_OSID_COLUMN_MOVEMENT_AND_BOT_COLUMN_MARCH.md) | **Part 2 — Column movement:** New `src/sim/phase_ii/osid_column_movement.ts`: terrain-weighted edge costs (road/slope/friction/uphill/river), `getOsidColumnRate()` by composition (heavy 2, light 4, mixed 3), Dijkstra through friendly OSIDs, `processOsidColumnMovement()` two-pass (advance existing transits, then process new column orders). Transit lifecycle: order with `stance: 'column'` → in_transit with path → arrive, set location_osid, clear state. **Part 4 — Bot column march:** In `bot_brigade_ai_osid.ts`: interior brigades ≥3 hops from front get column march to a front destination; in-transit brigades skipped. **Pipeline:** osid-column-movement runs BEFORE zoc-constrained-movement (ZoC step clears all brigade_movement_orders). Determinism: sorted iteration, deterministic Dijkstra tie-break, no randomness; 52-week hash verified. Canon: Phase II Spec §4–§5, Systems Manual §6.2.1/§6.5, Engine Invariants §14.9, Rulebook §5.4, Game Bible §7, context.md. |

---

## 41. Mobilization & Force Growth and scenario init fix (2026-02-24)

| Report | What was implemented |
|--------|----------------------|
| [20260224_MOBILIZATION_FORCE_GROWTH_AND_SCENARIO_INIT_FULL_REPORT.md](implemented/20260224_MOBILIZATION_FORCE_GROWTH_AND_SCENARIO_INIT_FULL_REPORT.md) | **Mobilization plan (Parts 1–8):** Part 1 Phase II ongoing mobilization (ongoing_mobilization.ts, pipeline step before brigade-reinforcement); Part 2 RS JNA inheritance bonus (20k one-time at init, pool_population + scenario_runner); Part 3 VRS initial personnel (FACTION_INITIAL_PERSONNEL RS 1200, RBiH/HRHB 800); Part 4 faction initial cohesion (FACTION_INITIAL_COHESION RS 72, HRHB 62, RBiH 55); Part 5 ARBiH available_from OOB shifts (30 brigades 3rd/4th corps); Part 7a experience gain and commander exp loss in attack_resolution_osid; Part 7b cohesion drift (phase-ii-cohesion-drift after resolve-attack-orders, engaged_formation_ids, cohesion_drift.ts); Part 7c exhaustion penalty (ratio ≥0.8 / ≥0.95, cohesion_drift). **Scenario init fix:** Skip promotePoliticalControllersToOsid when political_controllers already OSID-keyed (isPoliticalControllersAlreadyOsidKeyed in political_control_init.ts); unblocks 52-week apr1992_definitive_52w run. Architect decisions: [MOBILIZATION_ARCHITECT_DECISIONS.md](backlog/MOBILIZATION_ARCHITECT_DECISIONS.md). Canon: Phase II Spec §5, Systems Manual §13. |

---

*For backlog (not yet implemented), see [CONSOLIDATED_BACKLOG.md](CONSOLIDATED_BACKLOG.md). For patterns and corrections, see [CONSOLIDATED_LESSONS_LEARNED.md](CONSOLIDATED_LESSONS_LEARNED.md) and .agent/napkin.md. Original report files archived to docs/_old/40_reports/implemented_2026_02_15/.*
