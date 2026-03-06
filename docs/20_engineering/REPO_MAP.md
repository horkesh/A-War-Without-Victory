# Repo Map (AWWV)

## Repository Map (High-Level)
This doc is a minimal, code-facing map of the repo. It is not a design doc.

**Canonical entry points and pipeline step list:** See [PIPELINE_ENTRYPOINTS.md](PIPELINE_ENTRYPOINTS.md). That doc is the single source for entry point details and turn-pipeline step names; this doc is the high-level "where to look" map.

**External experts:** For a single handover covering project state, what is done, what needs to be done, and rules, see `docs/40_reports/EXTERNAL_EXPERT_HANDOVER.md`.

### Top-Level Directories and Responsibilities
Populate this section from the discovery checklist.
- `src/`: Core simulation code and pipeline entrypoints
- `tests/`: Determinism, invariants, and regression tests
- `tools/`: Scenario runners and utilities
- `scripts/`: One-off or pipeline scripts (map build, audits, repo checks)
- `data/`: Source and derived data artifacts
- `docs/`: Canon and engineering documentation (authoritative references)

## Key Pipelines and Their Code Locations
### Turn/Phase Pipeline
- Canon references: `docs/10_canon/Systems_Manual_v0_6_0.md`, `docs/10_canon/Engine_Invariants_v0_6_0.md`
- Code entrypoints:
  - War phases: `src/sim/turn_pipeline.ts` (orchestrator); step definitions in `src/sim/turn_phases/war_phases.ts` + `peace_phases.ts`; types in `src/sim/turn_pipeline_types.ts`
  - Phase 0 / canonical pipeline: `src/state/turn_pipeline.ts`
  - Legacy/minimal turn harness: `src/turn/pipeline.ts` (used by `src/index.ts`)
- Militia/brigade formation (Phase I): pool population `src/sim/early_war/pool_population.ts`, formation spawn `src/sim/formation_spawn.ts`, recruitment (player_choice mode) `src/sim/recruitment_engine.ts`, `src/state/recruitment_types.ts`; design: `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md`. CLI: `src/cli/sim_generate_formations.ts`.
- B1 Events: `src/sim/events/` — `event_types.ts` (trigger/effect types), `event_registry.ts` (historical + random events), `evaluate_events.ts` (deterministic evaluation). Runs first in both Phase I and Phase II pipelines (`evaluate-events` step).

### Scenario Loading/Execution
- Canon references: `docs/10_canon/Rulebook_v0_6_0.md`
- Code entrypoints:
  - Scenario harness: `src/scenario/scenario_runner.ts`
  - Harness combat causality diagnostics: `src/scenario/combat_causality.ts`
  - Scenario CLI: `src/cli/sim_scenario.ts`
  - Single-turn CLI: `src/cli/sim_run.ts`
  - Scenario loading: `src/scenario/scenario_loader.ts`
  - AoR init (browser-safe): `src/scenario/aor_init.ts` — `populateFactionAoRFromControl`, `ensureFormationHomeMunsInFactionAoR`. Used by scenario_runner, run_combat_browser, and turn_pipeline `phase-ii-aor-init`.
  - Run-summary reporting split (2026-03-06): `src/scenario/scenario_runner.ts`, `src/scenario/scenario_reporting.ts`, and `src/scenario/scenario_end_report.ts` own `behavioral_health`, `historical_fit`, benchmark contract validation, and override inventory.

### Map Build Pipeline
- Canon reference: `docs/20_engineering/MAP_BUILD_SYSTEM.md`
- **A1 tactical base map (STABLE):** `docs/20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md` — canonical substrate for warroom and tactical map
- **1990 municipality boundaries (canonical):** `data/source/boundaries/bih_adm3_1990.geojson` — 110 opštine, WGS84, mun1990_id/mun1990_name; derived by `npm run map:merge:adm3-1990`
- Code entrypoints:
  - Scripts: `scripts/map/` (see MAP_BUILD_SYSTEM for the canonical entry command)
  - Map data loading: `src/map/`

### GUI / Map UIs
- **React + MapLibre map app (canonical):** `docs/20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md` — spec. Code: `src/ui/map/` (Vite, React, Tailwind, Zustand, MapContainer). Dev: `npm run dev:map`. Status and backlog: `docs/40_reports/20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md`. Phase 3 expansion (2026-03-02): `docs/40_reports/implemented/20260302_GUI_PHASE3_EXPANSION_SECTOR_VISUALIZATION.md`. Phase 4 desktop integration (2026-03-04): `docs/40_reports/implemented/20260304_GUI_PHASE4_ELECTRON_DESKTOP_INTEGRATION.md`. Phase 5 polish (2026-03-04): `docs/40_reports/implemented/20260304_GUI_PHASE5_BATTLE_MARKERS_FOG_STRATEGIC_CORPS_OP_WAR_SUMMARY.md` — battle markers, fog/battles/strategic-points toggles, stageCorpsOperationOrder IPC, War Summary modal; `GameState.control_events` field added. **GUI polish orchestrated (2026-03-05):** [20260305_GUI_POLISH_ORCHESTRATED_EXECUTION.md](../40_reports/implemented/20260305_GUI_POLISH_ORCHESTRATED_EXECUTION.md) — authoritative **Consolidated Phase List A–F** (arrow overhaul, Ops Planning modal, pressure/toolbar, battle pulse, status strip, general polish). Component map: `docs/20_engineering/MAP_UI_MASTER.md`. Storybook: `src/ui/map/.storybook/`, `src/ui/map/stories/`.
- **Tactical Map System (legacy reference):** `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` — engineering reference for legacy Canvas 2D and HoI 3D. Code: same `src/ui/map/` (legacy entrypoints archived or coexisting).
- **Legacy 3D tactical render path:** `src/ui/map/map_operational_3d.ts`, `src/ui/map/map_staff_3d.ts`, `src/ui/map/tactical_sandbox.ts`. Shared render contract type: `MapViewInput` in `src/ui/map/types.ts`.
- **Warroom (HQ scene + map scene):** `src/ui/warroom/`. Dev server: `npm run dev:warroom`. Full-screen map scene uses WarPlanningMap; staged assets, Phase 0 turn advance. See GUI reports in `docs/40_reports/`.
- **Phase II browser advance:** `src/sim/run_combat_browser.ts` — browser-safe Phase II turn advance (no Node/fs). Used by warroom when advancing a turn in phase_ii. Increments turn; when faction AoRs empty, populates AoR from control + formation home muns via `src/scenario/aor_init.ts`. Does not run supply pressure or exhaustion; for full Phase II use Node `runTurn`.

## Change X → Go Here
Populate with concrete files once confirmed by discovery:
- Scenario changes → `src/scenario/`, `data/scenarios/`
- Phase ordering changes → `src/sim/turn_pipeline.ts` (orchestrator), `src/sim/turn_phases/war_phases.ts` + `peace_phases.ts` (step definitions), `src/sim/turn_pipeline_types.ts` (types/caches), `src/state/turn_pipeline.ts`
- Authority derivation (municipality control → authority map) → `src/state/formation_lifecycle.ts` (`deriveMunicipalityAuthorityMap`); used by `update-formation-lifecycle` and brigade activation gating.
- Phase I control flip (incl. B4 coercion pressure, capability-weighted flip) → `src/sim/early_war/control_flip.ts`; coercion reduces flip threshold via `state.coercion_pressure_by_municipality`; capability scales attacker/defender effectiveness (System 10) via `getFactionCapabilityModifier`; profiles updated in Phase I by `phase-i-capability-update` (turn_pipeline.ts). **Political control init:** `src/state/political_control_init.ts` — `initializePoliticalControllers` supports `init_control_mode` (institutional|ethnic_1991|hybrid_1992) and `ethnic_override_threshold`; ethnicity from `src/data/settlement_ethnicity.ts`; `prepareNewGameState` in `src/state/initialize_new_game_state.ts`; scenario schema in `src/scenario/scenario_types.ts` (init_control_mode, ethnic_override_threshold). When graph is OSID-keyed, master is `data/derived/operational/operational_initial_master.json` (744 entries); **after any OSID merge** run `npm run map:derive:operational-initial-master` so dev runner and init see same OSID set. **Displacement hooks:** `src/sim/early_war/displacement_hooks.ts` — Hostile_Population_Share from census (Phase I §4.4); no stub. **Holdout scaling:** `src/sim/early_war/settlement_control.ts` — resistance scales by population and degree (proximity).
- Militia pools / formation spawn / pool population / recruitment / strategic reserve → `src/sim/early_war/pool_population.ts`, `src/sim/formation_spawn.ts`, `src/sim/recruitment_engine.ts`, `src/state/recruitment_types.ts`, `src/state/militia_pool_key.ts`, `src/state/formation_constants.ts`, `src/sim/combat/strategic_reserve.ts` (faction-level manpower redistribution: overflow collection + reserve reinforcement), `src/sim/combat/ongoing_mobilization.ts` (faction-differentiated mobilization surge), `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md`
- Displacement per-faction rules (war-start seeding) → `src/state/displacement_takeover.ts` (`getInitialDisplacementFraction`, `HRHB_SERB_EXPULSION_FRACTION`, `RBIH_SERB_DISPLACEMENT_FRACTION`, `SARAJEVO_SERB_DISPLACEMENT_FRACTION`, `SARAJEVO_URBAN_MUN_IDS`, `frontOsids` set); `docs/20_engineering/DISPLACEMENT_MASTER.md` (Step 0 per-faction table). Report: [20260305_DISPLACEMENT_FACTION_RULES_SECTOR_FIX.md](../40_reports/implemented/20260305_DISPLACEMENT_FACTION_RULES_SECTOR_FIX.md)
- Supply reserve changes → `src/state/supply_reserves.ts` (core module: init, update, expenditure, effective state, siege counters), `src/state/supply_reserve_constants.ts` (25+ calibration constants), `src/sim/turn_phases/war_phases.ts` (update-siege-counters + compute-supply-reserves steps), `src/sim/combat/combat_math.ts` (getSupplyMult integration), `src/sim/combat/attack_resolution_osid.ts` (combat expenditure deduction + facility damage), `src/sim/combat/enclave_resilience.ts` (enclave resilience + hardening), `src/sim/combat/exhaustion.ts` (enclave exhaustion reduction)
- Determinism/serialization changes → `src/state/serializeGameState.ts`, `src/state/serialize.ts`, `src/utils/stable_json.ts`
- Map build changes → `scripts/map/`, `src/map/`, `docs/20_engineering/MAP_BUILD_SYSTEM.md`, `docs/20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md`
- War stories / brigade narrative → `src/sim/war_stories.ts` (generation), `src/sim/turn_phases/war_phases.ts` (`generate-war-stories` step), `src/ui/map/components/FormationDetail.tsx` (display), `src/ui/map/data/GameStateAdapter.ts` (extraction)
- Formation location-in-control (no formation in enemy OSID) → `src/sim/combat/attack_resolution_osid.ts` (`displaceFormationsInEnemyTerritory`), `src/sim/turn_phases/war_phases.ts` (`phase-ii-displace-enemy-territory` step after `update-sector-offensive-results`), `src/scenario/scenario_runner.ts` (initial-state displacement after backfill), `src/validate/brigade_location_control.ts` (`validateBrigadeLocationControl`), `src/validate/validate.ts` (wired into `validateState`); OOB `home_osid` in `data/source/oob_brigades.json` must be faction-controlled at scenario init
- Officers Phase E GUI → `src/ui/map/data/types.ts` (NamedOfficerView, FormationView.officer_quality), `src/ui/map/data/GameStateAdapter.ts` (namedOfficerData, namedOfficerStateById), `src/ui/map/components/FormationDetail.tsx` (Command block, Recent command changes), `src/ui/map/store/gameStore.ts` (lastTurnReport), `src/ui/warroom/data/war_data_extractor.ts` (officersByFaction, extractOfficersByFaction), `src/ui/warroom/data/warroom_state.ts` (LastTurnReport), `src/ui/warroom/components/FactionOverviewPanel.ts` (COMMAND subsection), `src/ui/warroom/components/NewspaperModal.ts` (succession lines), `src/ui/warroom/ClickableRegionManager.ts` (setLastTurnReport after advance-turn), `src/desktop/electron-main.cjs` (sendTurnReportToRenderer), `src/desktop/preload.cjs` (turn-report-updated). See TACTICAL_MAP_SYSTEM.md §0, DESKTOP_GUI_IPC_CONTRACT turn-report-updated.
- Corps/army combat summaries → `src/state/combat_summary.ts` (CombatSummary type + aggregation), `src/sim/combat/combat_summary_aggregator.ts` (pipeline function), `src/sim/turn_phases/war_phases.ts` (`compute-combat-summaries` step), `src/ui/map/components/CombatSummaryPanel.tsx` (display component), `src/ui/map/data/GameStateAdapter.ts` (extraction into FormationView.combatSummary), `src/ui/map/components/CorpsDetail.tsx` + `ArmyDetail.tsx` + `FormationDetail.tsx` (panel hosts)
- War timeline (faction temporal profiles) → `src/state/war_timeline.ts` (WarTimeline type + resolver functions + validation), `data/scenarios/timelines/apr1992.json` (canonical timeline data), `src/scenario/scenario_runner.ts` (loading), `src/state/game_state.ts` (GameState.war_timeline). Consumers: `src/sim/combat/bot_strategy.ts` (doctrine phases, standing orders, attack share), `src/sim/combat/cohesion_drift.ts` (drift), `src/sim/combat/faction_progression.ts` (floor/ceiling, maintenance), `src/state/formation_constants.ts` (reinforcement mult), `src/sim/turn_phases/war_phases.ts` (equipment decay), `src/sim/combat/battle_resolution.ts` (external support)
- Corps front sectors / sector coverage / bot sector assignment → `src/sim/combat/corps_front_sectors.ts` (`buildFactionSectors`, `buildEdgeAdjacency` with OSID-adjacency connectivity (2026-03-05), `consolidateCrossCorpsFronts` with hostile-side OSID adjacency (2026-03-06), `mergeUndersizedSubSegments` enforces `MIN_SECTOR_EDGES=5`, `deduplicateBrigadesAcrossSectors` fixes Phase 1E junction-OSID double-assignment, `splitNonContiguousSectors` post-build contiguity enforcement via friendly-OSID BFS (2026-03-06), `ensureMinimumSectorCoverage` Step 7 — friendly-territory-only BFS, connectivity-checked reserve promotion; Step 5 orphan assignment own-corps + friendly-territory BFS; Step 6 per-corps redistribution skips empty sectors — no cross-pocket transfers), `src/sim/combat/sector_rearrangement.ts` (corps AI sector rearrangement: thin sector consolidation — any 0-brigade sector merged into adjacent neighbor with MAX_SECTOR_EDGES cap, enemy pocket containment; wired into `generateCorpsDirectives()` in `bot_corps_ai.ts`), `src/sim/combat/bot_corps_ai.ts` (`reinforce_sector_ids` + `priority_sector_id` directive fields; rearrangement call), `src/sim/combat/bot_brigade_ai_osid.ts` (Rule 5c reinforce + Rule 7 priority prefix), `src/state/game_state.ts` (`CorpsDirective` interface). Reports: [20260305_SECTORS_OVERHAUL_GUI_SRC_FIX.md](../40_reports/implemented/20260305_SECTORS_OVERHAUL_GUI_SRC_FIX.md), [20260305_DISPLACEMENT_FACTION_RULES_SECTOR_FIX.md](../40_reports/implemented/20260305_DISPLACEMENT_FACTION_RULES_SECTOR_FIX.md), [20260306_SECTOR_VISUALIZATION_HOVER_CLICK_FIX.md](../40_reports/implemented/20260306_SECTOR_VISUALIZATION_HOVER_CLICK_FIX.md), [20260306_SECTOR_CONTIGUITY_AND_REARRANGEMENT.md](../40_reports/implemented/20260306_SECTOR_CONTIGUITY_AND_REARRANGEMENT.md)
- Sector-facing intelligence / recon → `src/sim/combat/sector_intel.ts` (`deriveSectorIntel`, `updateSectorIntelFromCombat`), `src/sim/combat/sector_intel_constants.ts` (faction recon profiles, confidence thresholds), `src/state/game_state.ts` (`SectorIntelRecord`, `SectorStrengthCategory`, `SectorPostureObserved`, `GameState.sector_intel`), `src/sim/turn_phases/war_phases.ts` (`derive-sector-intel` step), `src/sim/combat/attack_resolution_osid.ts` (recon-by-force hook), `src/sim/combat/bot_corps_ai.ts` (intel-weighted target sort). Tests: `tests/sector_intel.test.ts`. Report: [20260305_SECTOR_INTEL_IMPLEMENTATION.md](../40_reports/implemented/20260305_SECTOR_INTEL_IMPLEMENTATION.md)
- Scenario combat-causality harness → `src/scenario/combat_causality.ts` (`createBotOrderDiagnosticsSnapshot`, `buildOperationCombatDiagnostics`, `buildCombatCausalitySummary`), `src/scenario/scenario_runner.ts` (weekly + run_summary emission), `src/scenario/scenario_reporting.ts` (report types), `tests/scenario_operation_diagnostics.test.ts` (movement-aware invalidation regression). Execution-phase operation movement orders are counted as maneuver, not as stalled combat; quiet weeks remain visible but do not automatically fail healthy runs. Reports: [20260306_COMBAT_CAUSALITY_HARDENING_AND_OPERATION_CADENCE.md](../40_reports/implemented/20260306_COMBAT_CAUSALITY_HARDENING_AND_OPERATION_CADENCE.md), [20260306_COMBAT_CAUSALITY_RECOVERY_AND_CONTROLLED_CALIBRATION_RESUMPTION.md](../40_reports/implemented/20260306_COMBAT_CAUSALITY_RECOVERY_AND_CONTROLLED_CALIBRATION_RESUMPTION.md)
- Sector offensive cadence → `src/sim/combat/sector_offensive.ts` (`areParticipantsReadyForExecution`, early planning→execution transition once active participants are staged or already on friendly objective-approach positions, no-progress execution failure budget, reason-aware recovery timing), `src/sim/combat/bot_brigade_ai_osid.ts` (planning-phase movement toward objective approach positions), `tests/sector_offensive.test.ts` and `tests/bot_operation_objective_focus.test.ts`. Reports: [20260306_COMBAT_CAUSALITY_HARDENING_AND_OPERATION_CADENCE.md](../40_reports/implemented/20260306_COMBAT_CAUSALITY_HARDENING_AND_OPERATION_CADENCE.md), [20260306_LIVE_SECTOR_REARRANGEMENT_AND_OPERATION_PLANNING_RECOVERY.md](../40_reports/implemented/20260306_LIVE_SECTOR_REARRANGEMENT_AND_OPERATION_PLANNING_RECOVERY.md)
- Controlled calibration recovery lane → `docs/40_reports/CALIBRATION_MASTER.md` (gate source of truth), `src/scenario/scenario_runner.ts` / `src/scenario/scenario_reporting.ts` / `src/scenario/scenario_end_report.ts` (behavioral-health vs historical-fit vs attribution split), proof scenario `data/scenarios/apr1992_vrs_operation_proof_4w.json`, proof test `tests/scenario_vrs_operation_proof.test.ts`, consolidated report [20260306_COMBAT_CAUSALITY_RECOVERY_AND_CONTROLLED_CALIBRATION_RESUMPTION.md](../40_reports/implemented/20260306_COMBAT_CAUSALITY_RECOVERY_AND_CONTROLLED_CALIBRATION_RESUMPTION.md)
- Vienna Declaration / local truces (RS-HRHB non-aggression) → `src/sim/local_truces.ts` (7 exports: `VIENNA_DECLARATION_TURN=4`, `TRUCE_EXCEPTION_MUNICIPALITIES`, `isViennaDeclarationActive`, `isTruceException`, `getTrucePartner`, `checkAndFireViennaDeclaration`, `recordTruceBroken`, `getTruceBreakAggressionBonus`). State fields: `GameState.vienna_declaration_turn?`, `GameState.truce_broken_turn?`. Pipeline: `evaluate-events` fires declaration + `check-truce-break` detects player violation (both in `war_phases.ts`). Bot: `bot_corps_ai.ts` `generateCorpsDirectives()` filters truce-partner OSIDs from `offensive_targets`. Tests: `tests/local_truces.test.ts` (31 tests).
- Tactical map UI changes → `src/ui/map/`, `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`, `docs/20_engineering/MAP_UI_MASTER.md`
- Desktop GUI integration (IPC, faction selection, advance turn, recruitment, fog-of-war) → `src/ui/map/desktop/` (useIPC.ts, types.ts, orderActions.ts, campaignRecruitmentActions.ts), `src/ui/map/hooks/useDesktopSession.ts`, `src/ui/map/data/GameStateAdapter.ts` (derives `fogOfWar` from live `sector_intel` + sector topology), `src/ui/map/map/builders/buildFogOfWarGeoJSON.ts`, `src/ui/map/components/FormationDetail.tsx` (operation-owned brigades bypass UI home-defense attack lockout), `src/ui/map/components/SidePickerOverlay.tsx`, `src/ui/map/components/RecruitmentModal.tsx`, `src/desktop/electron-main.cjs` (IPC handlers; Node.js guard at top — exits with clear error if invoked via `node` instead of `electron .`), `src/desktop/preload.cjs` (bridge). Reports: [20260304_GUI_PHASE4_ELECTRON_DESKTOP_INTEGRATION.md](../40_reports/implemented/20260304_GUI_PHASE4_ELECTRON_DESKTOP_INTEGRATION.md), [20260306_RECOVERY_PLAN_REPORTING_UI_AND_BENCHMARK_HARDENING.md](../40_reports/implemented/20260306_RECOVERY_PLAN_REPORTING_UI_AND_BENCHMARK_HARDENING.md)
- Warroom UI changes → `src/ui/warroom/`, `docs/40_reports/` (GUI handovers)

## Generated vs Source Artifacts
Fill this section with concrete locations and policies:
- Generated artifacts: `data/derived/` (verify against `docs/20_engineering/repo/Tracked_artifacts_policy.md`)
- Source-of-truth artifacts: `data/source/` (verify against `docs/20_engineering/repo/Tracked_artifacts_policy.md`)
- **Historical OOB primary sources:** Brigades: `data/source/oob_brigades.json`. Corps: `data/source/oob_corps.json`. See `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md` §10.
- Never-edit-by-hand list: see `docs/20_engineering/repo/Tracked_artifacts_policy.md`

## Discovery Checklist (Deterministic)
### Commands / Searches
- `rg --files -g "*.ts" -g "*.js"` (inventory source files)
- `rg -n "main\\(|cli|entry|run|runner|scenario|pipeline"` (entrypoints)
- `rg -n "serialize|determin|random|timestamp|Date\\("` (determinism risks)
- `rg -n "phase|turn|tick|step"` (phase pipeline)
- `rg -n "map|terrain|osm|build"` (map pipeline)

### Evidence to Collect
- Primary entrypoints and their call chains
- Source of truth for phase ordering
- Serialization boundaries and derived-state handling
- Generated artifact locations

### How Findings Map into Docs
- Entry points → `docs/20_engineering/CODE_CANON.md` and this doc
- Pipeline locations → this doc
- Determinism risks → enforcement plan in `docs/engineering/INVARIANTS_IN_CODE.md` (add gates as needed)
