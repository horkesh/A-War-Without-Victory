# context.md - Agent Context for A War Without Victory

## Project Identity

**A War Without Victory (AWWV)** is a strategic-level historical simulation of the 1992-1995 Bosnian War. This is a deterministic, negative-sum war game focused on exhaustion, political collapse, and constrained agency rather than conquest.

**Current Lifecycle Model:** Two-phase canonical lifecycle (`peace`, `war`). Peace retains pre-war investment/preparation mechanics; War covers all active conflict behavior and April 1992 war-start scenarios.

## Authoritative Documentation Hierarchy

When conflicts arise between documents, this is the resolution order. See **`docs/10_canon/CANON.md`** for the canonical list and paths.

1. **Engine Invariants v0.6.0** - Defines what MUST be true (correctness constraints)
2. **Phase Specifications v0.6.0** - Defines lifecycle contracts (Peace/War)
3. **Systems Manual v0.6.0** - Defines complete system behavior (implementation spec)
4. **Rulebook v0.6.0** - Defines player-facing experience
5. **Game Bible v0.6.0** - Defines design philosophy and constraints
6. **context.md** - Defines process canon (workflow, ledger, session runbook)

### Document Purposes

| Document | Audience | Purpose | Status |
|----------|----------|---------|--------|
| **Rulebook** | Players, new designers | Teach how to play | v0.6.0 |
| **Engine Invariants** | Developers, QA | Assert correctness constraints | v0.6.0 |
| **Game Bible** | Designers | Establish design principles | v0.6.0 |
| **Systems Manual** | Developers | Complete mechanical specification | v0.6.0 |
| **Phase Specifications** | Developers | Two-phase lifecycle contracts | v0.6.0 |
| **War Specification** | Developers | War-phase behavior (fronts, supply, exhaustion, operations) | v0.6.0 |

**Current Location:** Canon docs in `docs/10_canon/`. Engineering (code canon, pipelines, determinism) in `docs/20_engineering/`.

**Canonical GUI and map (2026-02-28):** The **React + MapLibre map app** in `src/ui/map/` (Vite, React, Tailwind, Zustand, MapContainer) is the **single canonical player-facing GUI**. All new GUI work must be applied there. **Aesthetic target:** [HOI_VISUAL_GUI_OVERHAUL_SPEC.md](../30_planning/20260221_settlement%20remapping%20and%20GUI%20rework/HOI_VISUAL_GUI_OVERHAUL_SPEC.md) (HoI-style visuals; authoritative for look-and-feel). **Sidebar:** two tabs — ARMY / SITUATION; **panel interaction patterns:** §3.8 of that spec. Phase A/B baseline is implemented (panel styling, Army/Situation tabs, Situation summary, corps front labels, reserve section, stance controls, sidebar↔map hover preview, Escape clears selection). Phase C complete (2026-02-28): rich tooltips, MapModeToolbar + layer toggles, keyboard shortcuts, AttackConfirmation, OrderQueue. Phase 3 expansion (2026-03-02): tooltip fix, sector fill/glow on map, brigade↔sector bidirectional sync, CorpsDetail panel, density map mode (5 modes: Political, Ethnic, Supply, Pressure, Density). Layer toggles: Fronts, Formations, Labels, Sectors. Report: [20260302_GUI_PHASE3_EXPANSION_SECTOR_VISUALIZATION.md](../40_reports/implemented/20260302_GUI_PHASE3_EXPANSION_SECTOR_VISUALIZATION.md). **GUI polish orchestrated execution (2026-03-05):** Authoritative phase checklist (A–F: Arrow overhaul, Ops Planning modal, Map mode toolbar/pressure, Battle marker pulse, Bottom status strip, General polish) and implementation details in [20260305_GUI_POLISH_ORCHESTRATED_EXECUTION.md](../40_reports/implemented/20260305_GUI_POLISH_ORCHESTRATED_EXECUTION.md) and [20260306_GUI_PANEL_REWORK_AND_GENERAL_POLISH.md](../40_reports/implemented/20260306_GUI_PANEL_REWORK_AND_GENERAL_POLISH.md). Geography layer live (2026-03-02): PMTiles restored via Git LFS — hillshade terrain (76 MB, z6-12), OSM vector tiles (438 MB, z0-15, Protomaps basemap v4: roads, water, forests, places). Style: 21 layers, correct ordering (geography below game state). Place labels: city/town at z6+, village at z10+. Report: [20260302_GEOGRAPHY_LAYER_REINTRODUCTION_PMTILES.md](../40_reports/implemented/20260302_GEOGRAPHY_LAYER_REINTRODUCTION_PMTILES.md). **Map runtime contract (2026-03-03):** Desktop map uses local HTTP server (127.0.0.1) for PMTiles/style/data; build output `dist/tactical-map`; layer-aware interaction binding; `/data/runs` for Load run. [20260303_MAP_RUNTIME_CONTRACT_FIXES.md](../40_reports/implemented/20260303_MAP_RUNTIME_CONTRACT_FIXES.md). Implementation spec: [AWWV_GUI_ARCHITECTURE_REWORK_v2.md](../20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md). Full done/remaining status and file inventory: [20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md](../40_reports/20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md). Run: `npm run dev:map`. Storybook for map components lives in `src/ui/map/` (`.storybook/`, `stories/`). The legacy HoI 3D stack, tactical_map.html, and MapApp.ts are archived (not targets for new work). **Bot AI calibration and initial-brigade/OOB tuning:** Ongoing calibration and OOB restructuring are documented in Phase II Spec §12, Systems Manual §6.5, Game Bible §7 implementation-notes; single reference for holistic tuning: [BOT_AI_HOLISTIC_TUNING_REFERENCE.md](../30_planning/BOT_AI_HOLISTIC_TUNING_REFERENCE.md); calibration runs and open issues: [CALIBRATION_REPORT_BOT_AI_FEB_2026.md](../40_reports/CALIBRATION_REPORT_BOT_AI_FEB_2026.md) and CONSOLIDATED_BACKLOG §7; OOB data: `data/source/oob_brigades.json`, `data/source/oob_corps.json` (see MILITIA_BRIGADE_FORMATION_DESIGN §10).

**Supply Reserves Phase B+C (2026-03-02):** Phase B: escalating siege drain (siege_turn_counters), patron aid income, embargo reduction, facility combat damage. Phase C: structured EnclaveResilienceEntry with isolation tracking, hardening defense bonus (+5% after 8+ turns), exhaustion reduction for RBiH. Pipeline step `update-siege-counters`. 25+ constants in `supply_reserve_constants.ts`. All gated by `supply_reserves_enabled`. Report: [20260302_SUPPLY_SYSTEM_PHASE_B_C_IMPLEMENTATION.md](../40_reports/implemented/20260302_SUPPLY_SYSTEM_PHASE_B_C_IMPLEMENTATION.md).

**Supply Phase D — UX + UN Airdrops + Bot Targeting (2026-03-03):** Supply map mode colors OSIDs by faction supply pressure (adequate/strained/critical/unknown) via `buildSupplyGeoJSON.ts`; Logistics panel (`SupplyPanel.tsx`) shows per-faction reserve bars + corridor summary when supply mode active; `factionReserves` exposed on `LoadedGameState` via `GameStateAdapter.ts`. UN Airdrops: `applyUnAirdrops()` runs after `phase-ii-enclave-resilience`, injects 1.5 general supply/enclave/turn (capped 15/turn) to RBiH enclaves with isolation_turns ≥ 4; humanitarian only (no munitions). Bot supply-aware targeting: enemy OSIDs sorted critical→strained→adequate in `bot_corps_ai.ts`. `MAINTENANCE_DRAIN_PER_FORMATION` tuned 0.15→0.04. `apr1992_definitive_40w` enables `supply_reserves_enabled: true` by default. 8 Vitest tests. Calibration: n407 **90.5% area-weighted** (ATH, +1.9pp over n392), 86.7% count-based. Canon: Systems Manual §14.2. Report: [20260303_SUPPLY_PHASE_D_IMPLEMENTATION.md](../40_reports/implemented/20260303_SUPPLY_PHASE_D_IMPLEMENTATION.md).

**OOB Rework (2026-03-02):** Complete OOB overhaul across 6 phases. Brigade combat histories (BrigadeHistory with FIFO-200 engagement log + running tallies, `brigade_history_recorder.ts`). Three-tier decoration system per faction (ARBiH: Slavna/Viteška/Zlatni Ljiljan; VRS: Mrkonjić/Nemanjić/Obilić; HVO: Zrinski/Domagoj/Trolist; criteria-based evaluation in `decoration_evaluator.ts`, replaces legacy `honor` field with backward compat). Faction personnel ceilings **REMOVED** (n369–n374): hardcoded caps deleted; growth now emerges from pool demographics, mobilization scales, and exhaustion thresholds. n392: ARBiH 119k, VRS 85k, HVO 41k — all in/near historical Dec 1992 bands. See `20260303_CEILING_REMOVAL_EMERGENT_GROWTH.md`. VRS equipment decay (0.5%/week from w26, floor 60%, via `equipment_decay` on FormationState). Formation lifecycle events (territory-loss disbands, personnel collapse in `formation_lifecycle_events.ts`). Elite loan system (6-week loan, 4-week cooldown, forced recall at 30% casualties or morale <35, permanent degradation below 50% personnel; `elite_loan.ts`). Progressive war stories — per-turn narrative generation from `brigade_history`, stored on `FormationState.war_story`, displayed in FormationDetail panel with color-coded arc badge, narrative text, and notable moments (6 arcs: veteran/bloodied/shattered/risen/destroyed/garrison; `war_stories.ts`, pipeline step `generate-war-stories`). Report: [20260302_PROGRESSIVE_WAR_STORIES_IMPLEMENTATION.md](../40_reports/implemented/20260302_PROGRESSIVE_WAR_STORIES_IMPLEMENTATION.md). Corps/army aggregate combat summaries — pipeline step `compute-combat-summaries` (after `generate-war-stories`) aggregates subordinate `brigade_history` tallies (battles, wins/losses, casualties, territory, arc distribution) onto `FormationState.combat_summary` for corps/corps_asset/army_hq formations; displayed in CorpsDetail, ArmyDetail, and FormationDetail panels via `CombatSummaryPanel.tsx` (`combat_summary.ts` type + aggregation, `combat_summary_aggregator.ts` pipeline function). 6 pipeline steps total from OOB/narrative era. OOB data: removed 13 duplicates, added 16 new brigades (5 VRS SRK/Drina/Herzegovina, 1 ARBiH 504th, 6 HVO regular, 4 HVO Guard w80-88), timing fixes, 46+ historical_decorations. 5 new pipeline steps, 81 new tests, 0 regressions. Report: [20260302_OOB_REWORK_IMPLEMENTATION_REPORT.md](../40_reports/implemented/20260302_OOB_REWORK_IMPLEMENTATION_REPORT.md).

**Comprehensive Combat Formula (n375–n392, 2026-03-03):** Four mechanics added for faction-differentiating combat: (1) **Officer quality** (`getOfficerQualityMult` in `combat_math.ts`): VRS 1.10→decays 0.002/w after w20 (floor 0.95), ARBiH 0.85→grows 0.003/w (cap 1.05), HVO constant 0.97; applied to both attack and defense power. (2) **Ethnic homeland defense** (`ethnic_defense.ts`): +12% defense for ≥60% co-ethnic OSID, graduated 30–60%, none <30%; uses 1991 census per OSID. (3) **Bombardment casualty multiplier** (`getBombardmentCasualtyMult` in `combat_math.ts`): 1.0–1.8× defender casualties from attacker heavy weapons `(artEff + tankEff×0.5) / 80`. (4) **Bombardment exposure attrition** (`frontline_attrition.ts`): ratio-based passive attrition `ln(incoming_FP/own_FP) / 2.0` × 1.2%/week; ARBiH 99% effect, HVO 48%, VRS 0%; closes ARBiH KIA gap from 7,214 to 9,831 (85% of 11,500 target). n392 = **88.6% OSID match** (667/753, all-time high). Report: [20260303_COMPREHENSIVE_COMBAT_FORMULA_IMPLEMENTATION.md](../40_reports/implemented/20260303_COMPREHENSIVE_COMBAT_FORMULA_IMPLEMENTATION.md).

**Officers System — Two-Tier (Phases A–D, 2026-03-03):** Two-tier officer system replacing flat faction-level `getOfficerQualityMult()`. **Tier 2 (brigade):** per-brigade `officer_quality` [0.05, 0.90] on FormationState with combat/frontline growth, casualty loss, faction learning rates (RBiH 1.5×, RS 0.7×, HRHB 1.0×), VRS brain drain after w40. Pipeline step `update-officer-quality`. Module: `officer_quality_update.ts`. **Tier 1 (named officers):** 63 historical corps/army commanders loaded from `data/scenarios/officers/apr1992_officers.json` via `init_officers` scenario field. Per-officer competence/aggressiveness/defensiveness/political_reliability (1–5). Corps combat modifier: `0.90 + comp×0.03 + rating×0.01`. Succession from officer pool with faction-specific rules (HVO political_reliability sort + delay, VRS no regeneration, ARBiH pool regeneration every 12 turns). Pipeline step `officer-succession`. Module: `officer_system.ts`. **Bot AI:** corps aggressiveness shift (`bot_corps_ai.ts`), ARBiH warlord friction before w78 (`bot_brigade_ai_osid.ts`), Mladić override for VRS general_offensive (`combat_math.ts`). **War timeline:** `officer_config` per faction in `data/scenarios/timelines/apr1992.json`. Three-tier fallback in combat math: named officers → brigade quality → legacy. 63 new tests (19 Tier 2, 44 Tier 1). **Critical fix:** `normalizeScenario()` whitelist expanded — `war_timeline` and `init_officers` fields were being stripped (war_timeline was never loading in previous runs). n403: 88.0% OSID match (655/744), calibration guard ≥86% satisfied. Canon: Systems Manual §4, §7.4, §7.5. Report: [20260303_OFFICERS_SYSTEM_IMPLEMENTATION.md](../40_reports/implemented/20260303_OFFICERS_SYSTEM_IMPLEMENTATION.md). Design doc: [OFFICERS_SYSTEM_COMPREHENSIVE_PLAN.md](../30_planning/OFFICERS_SYSTEM_COMPREHENSIVE_PLAN.md). **Phase E GUI (2026-03-03):** FormationDetail shows Command block (officer quality, corps/army commander, Acting status) and Recent command changes when turn report includes officer_succession; warroom FactionOverviewPanel COMMAND subsection and NewspaperModal succession lines; desktop sends `turn-report-updated` after advance-turn. See [TACTICAL_MAP_SYSTEM.md](../20_engineering/TACTICAL_MAP_SYSTEM.md) §0.

**Area-Weighted Territory & Degenerate OSID Merge (2026-03-03):** Territory control percentages switched from count-based (each OSID = 1 unit) to area-weighted via precomputed `data/derived/operational/osid_areas.json` (51,337 km² total). Count-based showed RS 55.2% vs actual 65.1% by area — a 10pp gap. Area-weighted matches historical consensus (~65% RS territory). New tooling: `tools/generate_osid_areas.cjs` precomputes areas from GeoJSON via `turf.area()`. Runtime: `loadOsidAreas()` in `operational_data.ts`. UI: `useOsidAreas()` React hook in SituationTab, area % primary in FactionOverviewPanel. Comparison tool updated with area-weighted columns. 9 degenerate OSIDs (< 0.01 km², all graph-isolated geometric artifacts) merged into same-municipality same-ethnicity targets via `merge_progress.json`. OSID count: 753 → 744. Painted targets and derived pipeline regenerated. **After any OSID merge:** run `npm run map:derive:operational-initial-master` so `data/derived/operational/operational_initial_master.json` matches the settlement graph (744 entries); dev runner and political control init use it when graph is OSID-keyed (avoids "unknown settlement ids" at init). Report: [20260303_AREA_WEIGHTED_TERRITORY_AND_DEGENERATE_MERGE.md](../40_reports/implemented/20260303_AREA_WEIGHTED_TERRITORY_AND_DEGENERATE_MERGE.md).

**Formation location-in-control invariant (2026-03-03):** No active formation may have `location_osid` in an OSID controlled by another faction. Enforced by: (1) pipeline step `phase-ii-displace-enemy-territory` in `war_phases.ts` (after `update-sector-offensive-results`) calling `displaceFormationsInEnemyTerritory(state, edges, reverseMap)` from `attack_resolution_osid.ts` when operational data and edges are present; (2) scenario runner calling the same after `backfillFormationLocationOsid` before first serialize when war phase and operational data/edges available; (3) OOB `home_osid` correctness (e.g. 282nd East Bosnian Light set to `op:srebrenica:srebrenica_2` in `oob_brigades.json`); (4) validation `validateBrigadeLocationControl(state)` in `src/validate/brigade_location_control.ts` (war phase only), wired in `validateState()`; `serializeState()` runs validation before serialize. PROJECT_LEDGER 2026-03-03.

**War Timeline Externalization (2026-03-02):** All faction temporal profiles (doctrine phases, standing orders, cohesion drift/floor/ceiling, reinforcement multipliers, equipment decay, external support windows, maintenance decay) externalized into `data/scenarios/timelines/apr1992.json`. Scenarios reference a timeline by ID (`"war_timeline": "apr1992"` in scenario JSON); loaded at scenario init and stored on `GameState.war_timeline`. All consumer functions (`getActiveDoctrinePhase`, `getEffectiveAttackShare`, `getActiveStandingOrder`, `getFactionCohesionDrift`, `getFactionCohesionFloor/Ceiling`, `getFactionReinforcementMult`, `getRSMaintenanceCapacityMult`, `getExternalSupportMultiplier`) accept optional `timeline?` parameter — timeline takes priority, hardcoded fallback when absent. Type definitions and resolvers in `src/state/war_timeline.ts` (`WarTimeline`, `StepCurveEntry`, `KeyframeCurve`, `DoctrinePhase`, `StandingOrder`); generic functions `lookupStepCurve()`, `interpolateKeyframeCurve()`, `resolveCohesionBound()`, `computeMaintenanceMult()`. HRHB Lasva override removed (redundant with doctrine phase). Deterministic: no randomness, pure arithmetic resolvers, validated contiguity. 38 tests including round-trip parity (timeline-driven matches hardcoded at all sampled turns). `FACTION_ARMY_PRIORITIES` deferred to Phase 2.

**Formation markers overhaul (2026-03-04):** Three changes to `src/ui/map/map/`. (1) **Corps/army_hq removed from map** (`buildFormationsGeoJSON.ts`): command abstractions have no physical map pin; corps presence expressed via sector fill + OOB sidebar. `corps_asset` (artillery) remains. (2) **HoI-style rectangular counters** (`formationIcons.ts`): canvas redesigned to 160×80 at pixelRatio 2 → **80×40 CSS px** per icon-size unit (was 24×24 CSS px). Faction-colored fill (RS crimson, RBiH green, HRHB blue) with white kind abbreviation. `icon-allow-overlap: true` → every brigade always visible and clickable. Zoom stops: z6→40×20px, z9→56×28px, z14→80×40px. (3) **Front-distributed placement** (`buildFormationsGeoJSON.ts`): `buildFrontOffsetLookup()` builds OSID→avg-enemy-centroid map from `state.frontEdgesOsid`; `applyFrontOffset()` lerps 35% (`FRONT_LERP=0.35`) from OSID centroid toward enemy. Front-line brigades shift toward the faction boundary; rear brigades (no front adjacency) stay at OSID centroid. Graceful fallback when `frontEdgesOsid` absent. Zero simulation impact; no schema changes.

**GUI Phase 4 — Desktop Integration (2026-03-04, updated 2026-03-06):** Full Electron desktop playability for a single player faction. Created: `src/ui/map/desktop/useIPC.ts` (stable `useMemo([], …)` wrapping `window.awwv`; safe no-op fallbacks for browser dev mode), `desktop/types.ts` (RecruitmentCatalogBrigade, StartNewCampaignPayload), `desktop/orderActions.ts` (advanceTurnAndSync, stageMoveOrderFromOsid, stagePostureOrderAction), `desktop/campaignRecruitmentActions.ts` (startCampaignFromSidePicker, fetchRecruitmentCatalog, applyRecruitmentAndSync), `src/ui/map/hooks/useDesktopSession.ts` (bootstrap + game-state-updated/turn-report-updated subscriptions). Components promoted: `SidePickerOverlay.tsx` (faction selection before game load), `RecruitmentModal.tsx` (recruit from catalog). Fog-of-war layer: `GameStateAdapter.ts` now projects live engine truth into `LoadedGameState.fogOfWar` from `sector_intel`, sector topology, and friendly brigade positions; `buildFogOfWarGeoJSON.ts` consumes that adapter contract and `MapContainer.tsx` renders it. Move orders now staged via IPC (`stageMoveOrderFromOsid`). Deferred: fog toggle button, `stageCorpsOperationOrder` backend, PMTiles manual smoke test. No simulation changes; zero determinism impact. Reports: [20260304_GUI_PHASE4_ELECTRON_DESKTOP_INTEGRATION.md](../40_reports/implemented/20260304_GUI_PHASE4_ELECTRON_DESKTOP_INTEGRATION.md), [20260306_RECOVERY_PLAN_REPORTING_UI_AND_BENCHMARK_HARDENING.md](../40_reports/implemented/20260306_RECOVERY_PLAN_REPORTING_UI_AND_BENCHMARK_HARDENING.md).

**Sector-Facing Intelligence — Sector Intel (2026-03-05):** Replaced vestigial SID-keyed BFS `recon_intelligence.ts` (zero bot consumers) with a sector-pair confidence model. Each friendly sector tracks `SectorIntelRecord[]` for each facing enemy sector: confidence [0–1], strength_category (unknown/thin/moderate/dense/fortress), posture_observed (unknown/defensive/entrenched/offensive_prep), offensive_signs, visible_brigade_ids, turns_in_contact. Confidence accumulates via passive contact (faction recon profiles: RBiH +0.30/turn, RS/HRHB +0.20/turn), decays when sectors not in contact (RBiH −0.10, RS/HRHB −0.25), and jumps to 1.0 on any combat engagement (recon by force). Bot corps AI uses strength_category as a secondary sort key for offensive targets (thin→−2, dense→+1, fortress→+2). Pipeline step `derive-sector-intel` replaces `phase-ii-recon-intelligence` (runs after `partition-corps-front-sectors`, before `generate-bot-corps-orders`). GUI fog-of-war integration of `visible_brigade_ids` deferred to GUI Phase 6. 17 new tests. Zero calibration regression (95.6% area-weighted pre- and post-change). Report: [20260305_SECTOR_INTEL_IMPLEMENTATION.md](../40_reports/implemented/20260305_SECTOR_INTEL_IMPLEMENTATION.md). New: `src/sim/combat/sector_intel.ts`, `src/sim/combat/sector_intel_constants.ts`. Deleted: `src/sim/combat/recon_intelligence.ts`.

**Takeover Displacement Bug Fix — War-Start Seeding (2026-03-05):** `processPhaseIIDisplacementTakeover` Section 0 (war-start OSID timer seeding) was silently broken: `runTurn()` increments `state.meta.turn` BEFORE executing phases, so the first executed war turn is always `warStartTurn + 1`, not `warStartTurn`. The `currentTurn === warStartTurn` check never matched, leaving `timers_started = 0` and `displaced_total = 0` for all 52 weeks. Fix: `currentTurn === warStartTurn + 1` in `displacement_takeover.ts`. Confirmed working: 1,045 timers seeded at w1, 869k displaced at w5, 890k total over 40w. **Sustained displacement fix (2026-03-05):** Branch A was clearing 100% of OSID minority in one shot, leaving nothing for Branch B's 3%/turn trickle. Fixed by adding `INITIAL_DISPLACEMENT_FRACTION = 0.70` — initial wave = 70%, 30% sustained over ~35 weeks at 3%/turn. 40w result: 1.18M total displaced (+33%), 250k from sustained trickle. DISPLACEMENT_MASTER.md updated. Report: PROJECT_LEDGER [2026-03-05].

**Per-Faction Displacement Rules (2026-03-05):** War-start OSID seeding now uses per-faction fractions instead of a uniform 70% cap. HRHB-controlled OSIDs → Serbs: 100% expelled (no front gating — historic mass exodus). RBiH-controlled Sarajevo urban (`centar_sarajevo`, `novi_grad_sarajevo`, `novo_sarajevo`, `stari_grad_sarajevo`, `ilidza`, `vogosca`, `hadzici`) → Serbs: 10% (gradual departure under siege). RBiH-controlled front-adjacent OSIDs → Serbs: 50%. RBiH deep-rear non-Sarajevo → Serbs: skipped entirely (no timer seeded). All other faction pairs: 70% (default). Front-adjacency built from `state.war_front_edges_osid`; fallback to all-front-adjacent when no edges yet (turn 1). Implementation: `getInitialDisplacementFraction(toFaction, fromFaction, munId, isFrontAdjacent)` helper in `displacement_takeover.ts`. 40w result: total 1.06M displaced (−21% from uniform cap); RS-controlled (Bosniaks): 897k; RBiH-controlled (Serbs): 134k; ordering now historically correct. Report: [20260305_DISPLACEMENT_FACTION_RULES_SECTOR_FIX.md](../40_reports/implemented/20260305_DISPLACEMENT_FACTION_RULES_SECTOR_FIX.md).

**Corps Front Sector OSID-Adjacency Fix (2026-03-05):** `buildEdgeAdjacency` previously connected front edges only via shared OSID endpoints — two edges on adjacent (but different) OSIDs were treated as disconnected, fragmenting the front into 255 single-edge sectors (95% tiny, 1–4 edges). Fix: `buildEdgeAdjacency` now accepts `osidAdjacency: Map<Osid, Osid[]>` and connects edges whose friendly-side OSIDs are OSID-adjacent. Added `mergeUndersizedSubSegments()` to enforce the pre-existing `MIN_SECTOR_EDGES=5` constant (was defined but never enforced). Added `deduplicateBrigadesAcrossSectors()` to fix a pre-existing Phase 1E bug where junction OSIDs caused brigades to be double-assigned to two sectors. 40w result: 255 → 150 sectors, mean edges/sector 2.1 → 8.6, tiny sectors 242 → 53, empty sectors 99 → 27. Brigade duplicates: 18 → 0. Report: [20260305_DISPLACEMENT_FACTION_RULES_SECTOR_FIX.md](../40_reports/implemented/20260305_DISPLACEMENT_FACTION_RULES_SECTOR_FIX.md).


**Sector Visualization Fix (2026-03-06):** Per-segment hover features with per-segment offset computation (centroid cross product per polygon boundary segment). Hover highlight changed from feature-state to filter-based by sector_id, so entire sector highlights on hover (was single segment). Hostile-side OSID adjacency added to `consolidateCrossCorpsFronts()` in `corps_front_sectors.ts` — edges facing the same enemy OSID are now adjacent for consolidation, fixing cross-corps splits (e.g., Bosanska Gradiska). Front line rendering filters by authoritative contact-graph pairs (phantom edges suppressed). Centroid-to-centroid fallback lines removed (93 contact-graph edges without shared polygon boundaries are intentionally not rendered). Layer architecture: hitbox layers filter by offset_side, highlight/glow layers filter by sector_id; all use the front-edges-hover source. Report: [20260306_SECTOR_VISUALIZATION_HOVER_CLICK_FIX.md](../40_reports/implemented/20260306_SECTOR_VISUALIZATION_HOVER_CLICK_FIX.md).
**Combat-Causality Hardening (2026-03-06):** Scenario runs now distinguish operation maneuver from dead execution. Execution-phase operations are not invalidated just because they emit zero attack orders on a turn; if participating brigades received movement orders, that turn counts as maneuver toward the current objective. Sector offensives also no longer wait out the full nominal planning duration once the assigned force has already assembled: after one full planning turn, a `sector_attack` may enter execution early if all active participants have reached `staging_osid`. Result: `n113` removed invalid execution windows entirely (`invalid_operation_count = 0`) and improved RS activity to `60` attack orders / `51` battles, leaving only isolated battleless weeks as the next calibration gap. Report: [20260306_COMBAT_CAUSALITY_HARDENING_AND_OPERATION_CADENCE.md](../40_reports/implemented/20260306_COMBAT_CAUSALITY_HARDENING_AND_OPERATION_CADENCE.md).

**Recovery-plan reporting and UI truth hardening (2026-03-06):** The scenario harness now exposes split reporting families: `behavioral_health`, `historical_fit`, and `control_change_attribution`. Weekly rows expose `behavioral_health`, while `run_summary.json` carries both grouped families plus compatibility copies of legacy top-level fields. Bot benchmark summaries are validated for internal coherence, and fractional share/tolerance/deviation fields are preserved through summary normalization. Tactical map fog-of-war now consumes `LoadedGameState.fogOfWar`, projected from live `sector_intel`, rather than the deleted `recon_intelligence` path. FormationDetail also treats active operation ownership as stronger than the brigade’s `home_defense_active` UI lockout. Recovery evidence run: `n130`, same final state hash as `n128` (`a53e4b93a0b8a94e`) with corrected historical-fit fractions. Report: [20260306_RECOVERY_PLAN_REPORTING_UI_AND_BENCHMARK_HARDENING.md](../40_reports/implemented/20260306_RECOVERY_PLAN_REPORTING_UI_AND_BENCHMARK_HARDENING.md).

**Sector Contiguity Enforcement + Corps AI Sector Rearrangement (2026-03-06):** Post-build contiguity split for corps front sectors — `splitNonContiguousSectors()` BFS through friendly OSIDs via OSID adjacency, splits disconnected components into separate sectors. Corps AI sector rearrangement via `rearrangeSectorsForCorps()` in `sector_rearrangement.ts`: thin-sector consolidation (any 0-brigade sector merged into adjacent neighbor, capped at MAX_SECTOR_EDGES) and enemy pocket containment (surrounded enemy OSIDs → dedicated containment sectors). Wired into `generateCorpsDirectives()` after sector collection, before brigade orders. 7 new tests (4 contiguity + 3 rearrangement), 321 total pass. Report: [20260306_SECTOR_CONTIGUITY_AND_REARRANGEMENT.md](../40_reports/implemented/20260306_SECTOR_CONTIGUITY_AND_REARRANGEMENT.md).
**Sector Fix: All 15 Corps Get Front Sectors (2026-03-06):** Fixed 5 corps with zero front sectors. Root causes: BFS seeding only used edge-graph OSIDs (expanded to include all `political_controllers` entries); `consolidateCrossCorpsFronts` over-stripped minority corps (added `protectedCorps` set); 15 OOB tag mismatches in `oob_brigades.json` (legacy→canonical corps IDs); thin consolidation `break` bug (fixed to `continue` + `unmergeable` tracking, removed ≤3-edge limit). HVO SE Herzegovina HQ moved from Mostar to Čitluk. **Design decision:** Corps HQs are abstractions (GUI display only), not physical map entities — BFS seeding uses political_controllers, not HQ OSID positions. Result (n142): all 15 corps have sectors, 25 misassigned brigades (was 50), 0 empty non-pocket sectors, 81.5% area-weighted (expected regression from corrected assignments).

**Implementation references:** As of 2026-02-21, all implemented report content is in [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) (sections 1–31; §10 = Warroom/Phase 0 and systems integration; §11 = Warroom restyle, Apr 1992 scenario fix, embedded map, fog-of-war; §12 = deterministic org-pen initialization and Phase 0->I handoff alignment; §13 = Sep 1991 capital trickle calibration; §14 = deferred recruitment and ARBiH corps scope; §15 = tactical map layers UX: bottom floating toolbar, load controls off map surface; §16 = tactical map GUI corrections: toolbar date-only, settlement 5 tabs, corps/brigade panel trims; §17 = Staff Map 4th zoom layer and settlement border removal; §18 = Staff Map 12 visual enhancements; §19 = Staff Map crest stamp and war map barbed-wire front lines; §20 = War map enhanced formation markers; §21 = Front line defended/undefended and AoR crosshatch color; §22 = War map labels, AoR auto-display, front/AoR cleanup; §23 = displacement refactor shared utils, receiving cap (1.5×/1.1×, overflow to urban), census seeding (Phase 1 Run Problems); see Systems Manual §12, DISPLACEMENT_CENSUS_SEEDING.md; §24 = Dual defensive arc front lines and war map UI cleanup; §25 = Faction AI improvements all phases: Phase 0 bot integration in headless runs, Phase 0 faction-specific strategies and alliance-aware coordination, Phase I bot posture assignment (hold/probe/push), Phase II expanded operations catalog, defensive OGs, emergency defensive operations, inter-corps coordination, dynamic elastic defense; §26 = Tactical map UX 2026-02-19: ARIA live region, keyboard settlement navigation (Arrow/Enter), tooltips with shortcuts, loading/error/empty states, optional tour; [TACTICAL_MAP_SYSTEM.md](../20_engineering/TACTICAL_MAP_SYSTEM.md) §2). **Operational 3D map completion (2026-02-21):** Formation counter data modes (D-key cycle), read-only IPC queries (query-movement-range, query-movement-path, query-combat-estimate, query-supply-paths, query-corps-sectors, query-battle-events), right-click movement preview, attack-odds preview, fog/recon layer (G-key debug), F-key map modes (F1–F4: supply/displacement/command overlays), battle replay markers with K skip, command hierarchy panel with OOB parity, optional postfx/audio presets; spec: [TACTICAL_MAP_SYSTEM.md](../20_engineering/TACTICAL_MAP_SYSTEM.md), [DESKTOP_GUI_IPC_CONTRACT.md](../20_engineering/DESKTOP_GUI_IPC_CONTRACT.md); PROJECT_LEDGER 2026-02-21. **GUI and map frontline rework (2026-02-21):** Canonical `front_edges` persisted in GameState; 2D/3D renderers prefer canonical front edges with deterministic fallback; corps panel Stage Front / Stage Axis / Stage OG wired to existing IPC; Load Save menu only when desktop has no state; Day/Night (N) in operational 3D; refactor pass (getEdgesForTurn, single normalizeEdgeId, useCanonicalEdges). Report: [GUI_MAP_FRONTLINE_REWORK_AND_REFACTOR_2026_02_21.md](../40_reports/implemented/GUI_MAP_FRONTLINE_REWORK_AND_REFACTOR_2026_02_21.md); IMPLEMENTED_WORK_CONSOLIDATED §27; TACTICAL_MAP_SYSTEM §2, DESKTOP_GUI_IPC_CONTRACT. **Front system comprehensive rebuild (2026-02-21):** assignable_front_segments, brigade_front_assignment (reserve rule), theatres, army_theatre_assignment, GUI assign-to-front and naming IPC, 2D/3D single source; verification and state contract in [TACTICAL_MAP_SYSTEM.md](../20_engineering/TACTICAL_MAP_SYSTEM.md) §10.4, §21.3 and [DESKTOP_GUI_IPC_CONTRACT.md](../20_engineering/DESKTOP_GUI_IPC_CONTRACT.md). Report: [FRONT_SYSTEM_REBUILD_HOI_THEATRES_2026_02_21.md](../40_reports/implemented/FRONT_SYSTEM_REBUILD_HOI_THEATRES_2026_02_21.md); IMPLEMENTED_WORK_CONSOLIDATED §28. **Operational settlement merger and HoI map rework (2026-02-22):** Settlement merger tool (standalone Vite page, hand-curated merge groups, TopoJSON export); derive pipeline migrated from algorithmic clustering to 702 merge groups in `data/source/merge_progress.json` → 744 operational settlements (OSID format `op:<mun>:<slug>`; was 753, reduced by 9 degenerate merges 2026-03-03); all derived outputs in `data/derived/operational/`. HoI map control layer: single merged mesh (global vertex table, per-vertex colors), gap-free; default tilt 20°, zoom 4.5. OSID is the canonical map unit for simulation, rendering, and political control. Report: [20260222_OPERATIONAL_SETTLEMENT_MERGER_AND_HOI_MAP_REWORK.md](../40_reports/implemented/20260222_OPERATIONAL_SETTLEMENT_MERGER_AND_HOI_MAP_REWORK.md); IMPLEMENTED_WORK_CONSOLIDATED §32. **HoI map 3D tilt and texture-on-terrain (2026-02-23):** Political control no longer a floating overlay; faction colors rasterized onto 2048×2048 texture and applied to terrain mesh geometry (same vertices/UVs → no gaps at any tilt). Ortho camera far 1000→100; overlay Y-offsets reduced; polygonOffset used for depth ordering; invisible control mesh kept for raycasting. Report: [20260223_HOI_MAP_3D_TILT_AND_TEXTURE_ON_TERRAIN.md](../40_reports/implemented/20260223_HOI_MAP_3D_TILT_AND_TEXTURE_ON_TERRAIN.md); IMPLEMENTED_WORK_CONSOLIDATED §35. **HoI map improvements phased (2026-02-23):** Orbit yaw ±30°, higher-res settlement labels, HoI front style (neutral band + dark center line, asymmetric width); front = full hostile boundary (no filter by units). Report: [20260223_HOI_MAP_IMPROVEMENTS_PHASED.md](../40_reports/implemented/20260223_HOI_MAP_IMPROVEMENTS_PHASED.md); IMPLEMENTED_WORK_CONSOLIDATED §36. **OSID terrain-weighted column movement and bot column march (2026-02-23):** Terrain-weighted multi-hop column movement (osid_column_movement.ts: edge costs, getOsidColumnRate by composition, Dijkstra through friendly OSIDs, two-pass processOsidColumnMovement); bot issues column march for interior brigades ≥3 hops from front; pipeline order: osid-column-movement before zoc-constrained-movement. Report: [20260223_OSID_COLUMN_MOVEMENT_AND_BOT_COLUMN_MARCH.md](../40_reports/implemented/20260223_OSID_COLUMN_MOVEMENT_AND_BOT_COLUMN_MARCH.md); IMPLEMENTED_WORK_CONSOLIDATED §37. **Headless corps fronts and run_summary (2026-02-21):** Phase II pipeline step `ensure-derived-corps-front-edges` populates corps_front_edges in headless runs; run_summary includes `front_corps_tracking` when Phase II ran. PROJECT_LEDGER 2026-02-21. **Warroom war-phase modals (2026-02-21):** Seven desk objects + declaration events wired to real GameState via extractWarData, three-tier fog, turn_event_generator; report: [WARROOM_WAR_PHASE_MODALS_2026_02_21.md](../40_reports/implemented/WARROOM_WAR_PHASE_MODALS_2026_02_21.md); IMPLEMENTED_WORK_CONSOLIDATED §31. Originals archived to docs/_old/40_reports/implemented_2026_02_15/; new reports 2026-02-16+ in implemented/. Brigade Operations: [BRIGADE_OPERATIONS_SYSTEM_COMPLETION_REPORT.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) — canon has been updated to reflect it (Phase II, Systems Manual, Engine Invariants, Phase I). Recruitment system: [recruitment_system_implementation_report.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) — three-resource brigade activation at Phase I entry; canon updated in Systems Manual §13, Phase I implementation-note, MILITIA_BRIGADE_FORMATION_DESIGN §10. Battle resolution (Phase II): [battle_resolution_engine_report_2026_02_12.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) — multi-factor combat, terrain, casualty ledger, snap events; canon updated in Phase II §5, §12 and Systems Manual §7.4. Scenario handoff decisions (no-flip semantics, 0-flip interpretation): [ORCHESTRATOR_SCENARIO_HANDOFF_DECISIONS_2026_02_13.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md); Phase I implementation-note for military-action-only added 2026-02-13. Bot AI (Phase II): [BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) — pipeline ordering (formation lifecycle before brigade ops), pending posture for same-pass attack orders, formation grace-period auto-activation, faction strategic objectives and attack scoring; canon updated in Phase II §5, §12 and Systems Manual §5, §6.5. AI consolidation and breakthrough: [AI_STRATEGY_SPECIFICATION.md](../20_engineering/AI_STRATEGY_SPECIFICATION.md) §Consolidation and rear cleanup — Phase I consolidation bonus and control-flip ordering, Phase II consolidation posture (soft vs real front), exception data (strongholds/holdouts/fast-cleanup muns), casualty-tracked cleanup; Systems Manual §6.1, §6.5; Phase II Spec §12. Attack target de-duplication (2026-02-14): one brigade per faction per turn per target; exception OG+operation and heavy resistance (stub); run summary reports unique_attack_targets; AI_STRATEGY_SPECIFICATION §Attack target de-duplication, Systems Manual §6.5, Phase II Spec §12. **Brigade AoR overhaul (2026-02-14):** corps-directed assignment when corps_command present (partition front into corps sectors, allocate brigades along frontline, home mun + up to 2 contiguous neighbors); contiguity as hard invariant (check/repair, rebalance guard); legacy Voronoi fallback when no corps; smooth AoR visualization (compound fill, outer boundary only, breathing glow). [BRIGADE_AOR_OVERHAUL_CORPS_DIRECTED_2026_02_14.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md); Phase II §7.1, Systems Manual §2.1/§8, TACTICAL_MAP_SYSTEM Pass 6. **Launchable desktop GUI (Phases 2–3):** tactical map in Electron with rewatch and “play myself” flow (load scenario/state, advance turn, AAR modal, replay scrubber); spec: [TACTICAL_MAP_SYSTEM.md](../20_engineering/TACTICAL_MAP_SYSTEM.md) §21, [DESKTOP_GUI_IPC_CONTRACT.md](../20_engineering/DESKTOP_GUI_IPC_CONTRACT.md), [GUI_PLAYBOOK_DESKTOP.md](../20_engineering/GUI_PLAYBOOK_DESKTOP.md), [GUI_DESIGN_BLUEPRINT.md](../20_engineering/GUI_DESIGN_BLUEPRINT.md); implementation under `src/desktop/` and `src/ui/map/`; phased plan and status in [CONSOLIDATED_IMPLEMENTED.md](../40_reports/CONSOLIDATED_IMPLEMENTED.md) and convenes. Recruitment UI from map (2026-02-14): toolbar capital, Recruit modal (catalog, eligibility, Activate), desktop IPC apply-recruitment and placement feedback; desktop advance runs accrual without bot recruitment; [RECRUITMENT_UI_FROM_MAP_2026_02_14.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md), TACTICAL_MAP_SYSTEM §13.8. Visual identity (NATO ops center dark theme, phosphor-green accents, IBM Plex Mono): [GUI_VISUAL_OVERHAUL_NATO_OPS_CENTER_2026_02_14.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md). **New Game side picker (2026-02-14):** desktop "New Campaign" opens side-selection overlay (RBiH, RS, HRHB with flags); choosing a side invokes `start-new-campaign` IPC, loads fixed April 1992 scenario (`apr1992_historical_52w.json`), sets `meta.player_faction`, injects `recruitment_state` for toolbar/Recruit modal; `meta.player_faction` is optional and non-normative for simulation (implementation note). Report: [NEW_GAME_SIDE_PICKER_APRIL_1992_2026_02_14.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md). **GUI polish pass (2026-02-14):** tab renames (OVERVIEW/CONTROL/MILITARY/HISTORY), strategic zoom corps-only with watercolor alpha on small settlements, corps detail panel (CORPS COMMAND/STRENGTH/OG/OOB) and brigade panel with parent corps link, SET POSTURE/MOVE/ATTACK wired (posture dropdown, target-selection mode), zoom-to-selection, pruned Settings/Help modals, browser "Load Scenario" and dimmed Continue, dataset dropdown fix, AAR 0-events message; [GUI_POLISH_PASS_AND_REFACTOR_2026_02_14.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md). **April 1992 scenario creation (2026-02-14):** Comprehensive report [ORCHESTRATOR_APR1992_SCENARIO_CREATION_COMPREHENSIVE_REPORT_2026_02_14.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) — research (Phases A–C), OOB cleanup (261 brigades, corps mapping, HRHB subordination), JNA ghost brigades (tag-based dissolve), initial formations rebuild, two canonical scenarios: **apr1992_definitive_52w** (player-facing, New Campaign), **apr1992_historical_52w** (52w benchmark, default CLI); formation-aware Phase I flip; desktop GUI integration (side picker, recruitment). See CONSOLIDATED_IMPLEMENTED §5 and §7. **Orders pipeline and posture UX (2026-02-15):** Desktop advance uses full runTurn pipeline; IPC order staging (stage-attack-order, stage-posture-order, stage-move-order, clear-orders); GameStateAdapter parses orders as Records; bot AI excludes meta.player_faction so player orders are preserved; posture picker has human labels, tooltip stats, inline description, disabled by cohesion/readiness. [ORDERS_PIPELINE_AND_POSTURE_UX_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md); TACTICAL_MAP_SYSTEM §2, §13.3, §21, DESKTOP_GUI_IPC_CONTRACT, Systems Manual §6.5. **Order target selection UX (2026-02-15):** Full targeting mode for attack/move orders — visual overlay (own-faction dimmed, municipality highlight for move), enriched tooltips, Escape to cancel, cursor feedback, attack two-step confirmation, preview dashed arrow. [ORDER_TARGET_SELECTION_SYSTEM_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md); TACTICAL_MAP_SYSTEM §2, §8, §12.4, §13.3, §21. **Corps AoR contiguity (2026-02-15):** Corps-level contiguity check/repair (checkCorpsContiguity, repairCorpsContiguity, enforceCorpsLevelContiguity); enclave exception; Step 9 in assignCorpsDirectedAoR; pipeline step `enforce-corps-aor-contiguity` after `rebalance-brigade-aor`; brigade repair prefers same-corps targets. [CORPS_AOR_CONTIGUITY_ENFORCEMENT_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md); Phase II §5, §7.1; Systems Manual §2.1. **Scenario force calibration (2026-02-15):** Pool and recruitment calibration for April 1992 player-facing scenario: POOL_SCALE_FACTOR 55, organizational penetration seeds (party 85, paramilitary 60), mandatory brigade spawn minimum 200, FACTION_POOL_SCALE (RBiH 1.20, RS 1.05, HRHB 1.60), scenario recruitment resources and desktop constants sync, population loader by_municipality_id fallback. [SCENARIO_FORCE_CALIBRATION_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md). **Scenario init six fixes (2026-02-15):** Formation marker stacking and corps-to-brigade command lines (MapApp), settlement panel vertical tabs (tactical-map.css/html), Velika Kladuša RBiH-aligned (rbih_aligned_municipalities), VRS brigade HQ resolution (resolveValidHqSid in recruitment_engine), brigade AoR contiguity at init (scenario_runner corps-before-AoR, brigade_aor/corps_directed_aor safety net). [SCENARIO_INIT_SIX_FIXES_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md); TACTICAL_MAP_SYSTEM §8, §13.2; Phase II §7.1; Systems Manual §2.1, §13. **Tactical map seven UI/sim fixes (2026-02-15):** 4th Corps OOB (7 core brigades mandatory at turn 0), War Summary modal (per-faction counts + BATTLES THIS TURN), white corps-to-brigade command lines, AoR fill pulsing, corps panel ACTIONS (corps stance + bulk posture via stage-corps-stance-order), army_hq tier (FormationKind, NATO xxx, panel, command lines), larger markers and vertical stacking; [TACTICAL_MAP_SEVEN_UI_SIM_FIXES_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md); TACTICAL_MAP_SYSTEM §8, §13, §21; DESKTOP_GUI_IPC_CONTRACT. **Warroom restyle and scenario fix (2026-02-16):** All April 1992 scenarios now use init_control_mode hybrid_1992 with init_control apr1992 (curated municipal file); warroom modals/panels unified to NATO ops-center CSS; tactical map embedded as full-screen iframe in warroom (same-origin awwv://warroom/tactical-map/*); faction fog-of-war (own formations only on canvas). [WARROOM_RESTYLE_SCENARIO_FIX_EMBEDDED_MAP_FOG_OF_WAR_2026_02_16.md](../40_reports/implemented/WARROOM_RESTYLE_SCENARIO_FIX_EMBEDDED_MAP_FOG_OF_WAR_2026_02_16.md); IMPLEMENTED_WORK_CONSOLIDATED §11; TACTICAL_MAP_SYSTEM §21.1, §22; Systems Manual implementation-note (Apr 1992 init). **Deterministic org-pen initialization and Phase 0->I handoff alignment (2026-02-16):** formula-based startup/handoff seeding now uses A/B/C signals (controller, aligned population share, planned war-start OOB presence); see [ORG_PEN_FORMULA_INIT_AND_PHASE0_HANDOFF_2026_02_16.md](../40_reports/implemented/ORG_PEN_FORMULA_INIT_AND_PHASE0_HANDOFF_2026_02_16.md) and IMPLEMENTED_WORK_CONSOLIDATED §12. **Phase 0 capital trickle calibration (2026-02-17):** Sep 1991 20w/31w runs validated trickle constants; see [SEP_1991_CAPITAL_TRICKLE_CALIBRATION_2026_02_17.md](../40_reports/convenes/SEP_1991_CAPITAL_TRICKLE_CALIBRATION_2026_02_17.md) and IMPLEMENTED_WORK_CONSOLIDATED §13. **Deferred recruitment (2026-02-17):** Scenario flag `no_initial_brigade_formations` with `recruitment_mode: "player_choice"` creates corps/army_hq only at init; brigades via turn-based recruitment; IMPLEMENTED_WORK_CONSOLIDATED §14, Systems Manual §13, Phase II Spec, MILITIA_BRIGADE_FORMATION_DESIGN §10. **Staff Map and settlement borders (2026-02-17):** Tactical map has a 4th zoom layer — Staff Map (press `4`, drag region ≥5 settlements): procedural paper-map overlay at 8× with parchment, terrain hatching, full-detail formation counters; main map no longer draws inter-settlement polygon strokes (fill only). [STAFF_MAP_4TH_ZOOM_LAYER_AND_SETTLEMENT_BORDER_REMOVAL_2026_02_17.md](../40_reports/implemented/STAFF_MAP_4TH_ZOOM_LAYER_AND_SETTLEMENT_BORDER_REMOVAL_2026_02_17.md); IMPLEMENTED_WORK_CONSOLIDATED §17; TACTICAL_MAP_SYSTEM §2, §7–§9, §12. **Staff Map 12 visual enhancements (2026-02-17):** Faction stripe on counters, barbed-wire front lines, AoR crosshatch fill, contour lines, river labels, fold creases, contested-zone pencil hatch, coffee stain, margin annotations, irregular vignette, faction crests at top center, exit button top-left. [STAFF_MAP_12_VISUAL_ENHANCEMENTS_2026_02_17.md](../40_reports/implemented/STAFF_MAP_12_VISUAL_ENHANCEMENTS_2026_02_17.md); IMPLEMENTED_WORK_CONSOLIDATED §18. **Staff Map crest stamp and war map barbed-wire (2026-02-17):** Staff map shows single player-faction crest as faded ink stamp (top-left); main war map front lines use barbed-wire motif (Bézier curves + barb ticks); detHash shared via constants.ts. [STAFF_MAP_CREST_STAMP_AND_WARMAP_BARBED_WIRE_FRONTLINES_2026_02_17.md](../40_reports/implemented/STAFF_MAP_CREST_STAMP_AND_WARMAP_BARBED_WIRE_FRONTLINES_2026_02_17.md); IMPLEMENTED_WORK_CONSOLIDATED §19. **War map enhanced formation markers (2026-02-17):** Marker refactor (FormationView + zoomLevel), readiness glow, strength numbers, name labels at tactical zoom, AABB hit-test, ResizeObserver canvas fix, formation dimming (war + staff map). [WARMAP_ENHANCED_FORMATION_MARKERS_2026_02_17.md](../40_reports/implemented/WARMAP_ENHANCED_FORMATION_MARKERS_2026_02_17.md); IMPLEMENTED_WORK_CONSOLIDATED §20. **Front line defended/undefended (2026-02-17):** Defended segments (at least one adjacent settlement in brigade AoR) render solid + barbed wire; undefended dashed + reddish glow, no barbs. AoR crosshatch: black when Control layer ON, white when OFF. [FRONT_LINE_DEFENDED_UNDEFENDED_2026_02_17.md](../40_reports/implemented/FRONT_LINE_DEFENDED_UNDEFENDED_2026_02_17.md); IMPLEMENTED_WORK_CONSOLIDATED §21. **War map labels and AoR cleanup (2026-02-17):** Labels restricted to URBAN_CENTER+TOWN, always on (no toggle); Labels and Brigade AoR toggles removed (AoR auto when formation selected); crosshatch density increased. [WARMAP_LABELS_AOR_FRONT_CLEANUP_2026_02_17.md](../40_reports/implemented/WARMAP_LABELS_AOR_FRONT_CLEANUP_2026_02_17.md); IMPLEMENTED_WORK_CONSOLIDATED §22. **Dual defensive arc front lines (2026-02-17):** Front lines replaced with paired faction-colored defensive arc symbols on each side of borders; arcs only where brigades deployed (defendedByFaction from AoR); barb ticks toward enemy; SIDE_RGB colors; old single-line system removed. [DUAL_DEFENSIVE_ARC_FRONT_LINES_2026_02_17.md](../40_reports/implemented/DUAL_DEFENSIVE_ARC_FRONT_LINES_2026_02_17.md); IMPLEMENTED_WORK_CONSOLIDATED §24. **Displacement refactor (2026-02-17):** Shared `displacement_state_utils.ts` (getOrInitDisplacementState, getMunicipalityIdFromRecord); displacement_takeover and minority_flight import from it; no behavior change. [DISPLACEMENT_REFACTOR_SHARED_UTILS_2026_02_17.md](../40_reports/implemented/DISPLACEMENT_REFACTOR_SHARED_UTILS_2026_02_17.md); IMPLEMENTED_WORK_CONSOLIDATED §23. **Comprehensive review convene canon propagation (2026-02-23):** Orchestrator convened Technical Architect + Product Manager on comprehensive design review (20260222_awwv_comprehensive_review.md). Canon updates propagated: Phase 0 Spec §7.7 JNA Status + §8 Output Contract JNA_status (closes Phase I §3 data-contract gap); Phase II Spec §5 ceasefire/Washington implementation-note (pipeline gap: checks must run in Phase II when preconditions first met there); Rulebook §15 Player's Turn Guide (phase-by-phase player actions); Phase II Spec §11.2 War Termination and End-Game (minimal design intent: negotiated settlement, faction collapse, timeout, scoring). Roadmap: war termination + player action guide + AoR/OSID reconciliation + supply spec on critical path; PM to sequence. Report: [ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md](../40_reports/convenes/ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md). **HoI 3D strategic zoom and corps HQ placement (2026-02-24):** At max zoom out only corps/army_hq visible and clickable; corps/army_hq placed at location_osid when set (historical HQ OSID), else centroid of subordinates; TACTICAL_MAP_SYSTEM §2, [20260224_HOI_3D_FORMATIONS_ZOC_IMPLEMENTATION.md](../40_reports/implemented/20260224_HOI_3D_FORMATIONS_ZOC_IMPLEMENTATION.md) Phase 6. **Phase 0 JNA_status hand-off (2026-02-24):** state.phase_i_jna set at Phase 0→I transition in applyPhase0ToPhaseITransition (Option A1); transition_begun = RS declared; meta.phase_0_end_turn, phase_1_start_turn, escalation_reason persisted; Phase_0_Spec §7.7 and §8 implementation-notes; Phase I Spec §3 implementation-note; CONSOLIDATED_IMPLEMENTED §43; PROJECT_LEDGER 2026-02-24. **War termination minimal spec (2026-02-24):** WAR_TERMINATION_MINIMAL_SPEC.md drafted; Architect (product architecture) sign-off §13; directive 1.1 complete. **Player's Turn Guide (backlog 1.2):** Confirmed 2026-02-24 that Rulebook v0.5.0 §15 satisfies pipeline backlog 1.2 (phase-by-phase player actions); no doc change. **Supply full run Phases 1–5 (2026-02-24):** OSID supply trace, phase-ii-supply-osid, supply_state_by_osid, getSupplyMult in combat and bot, cascade semantics, querySupplyPaths/3D supply mode, enclave resilience stub, supplyConnectivityByFaction; Phase II Spec §5 pipeline updated; Systems Manual §14.2; CONSOLIDATED_IMPLEMENTED §45. [CALIBRATION_REPORT_BOT_AI_FEB_2026.md](../40_reports/CALIBRATION_REPORT_BOT_AI_FEB_2026.md) — runs n115–n125; propagated to Phase II Spec §12, Systems Manual §6.5, Game Bible §7, Rulebook (enclave note); CONSOLIDATED_IMPLEMENTED §44; open issues (front-assignment bug, personnel distribution, enclave protection, 4th/2nd Corps balance) in CONSOLIDATED_BACKLOG §7. **Session 2 (2026-02-25):** Ethnic scoring, init control fix (hybrid_1992 + operational_political_control.json), Bihać OSID narrowing, heartland time-decay, Pelagićevo corridor, ARBiH undefended bonus, HVO Posavina retreat; Phase II Spec §12, Systems Manual §6.5, Game Bible §7, CONSOLIDATED_IMPLEMENTED §44, PROJECT_LEDGER. **Pipeline 2.3–2.5 (2026-02-25):** Phase I→II edge cases (entrenchment init, stuck-in-Phase-I force transition, run_summary phase_i_note), Operation Storm canon + phase-ii-operation-storm-check, scoring minimal criteria in WAR_TERMINATION_MINIMAL_SPEC §8 and Phase II §11.2.4; report [20260225_PIPELINE_2_3_2_4_2_5_EDGE_CASES_OPERATION_STORM_SCORING.md](../40_reports/implemented/20260225_PIPELINE_2_3_2_4_2_5_EDGE_CASES_OPERATION_STORM_SCORING.md); CONSOLIDATED_IMPLEMENTED §46. **Multi-sector corps, supply gating, sector offensives (2026-03-01):** Phase A multi-sector promotion (MIN_SECTOR_EDGES, sector_targets), Phase B supply gating (critical→defend, strained→victory-only; corps thresholds), Phase C sector offensives (named operations, momentum, pipeline steps advance-sector-offensives, update-sector-offensive-results); n314 87.4%. **Sector offensive activation (n359, 2026-03-02):** 26 sector offensives now execute in 40w window (was 0). Fixes: evaluateOperationProgress() skips sector_attack (sole handler: advanceSectorOffensives), computeSupplyReadiness() returns 1.0 when supply_reserves_enabled=false, recovery-phase launches allowed (+15 exhaustion), min objectives lowered to 1. RS=432, RBiH=236, HRHB=85, 86.7% match. See L42/L43 in CALIBRATION_MASTER. Canon: Systems Manual §2.1, §6.4, §6.5, §14.5; War Spec §5, §10. Report: [20260301_MULTI_SECTOR_SUPPLY_GATING_SECTOR_OFFENSIVES.md](../40_reports/implemented/20260301_MULTI_SECTOR_SUPPLY_GATING_SECTOR_OFFENSIVES.md). **Supply reserves Phase A (2026-03-01):** Faction-level two-category reserves (general_supply_reserve + heavy_munitions_reserve [0..100]) with maintenance drain, combat expenditure, and effective supply state combining BFS reachability with reserve level. Pipeline step compute-supply-reserves; integration in getSupplyMult (combat_math.ts) and attack_resolution_osid.ts. Gated by supply_reserves_enabled scenario flag (default false). 14 calibration constants in supply_reserve_constants.ts. n338 86.9% (no behavioral change when disabled). Canon: Systems Manual §14.2, Engine Invariants §4, War Spec §7. Report: [20260301_SUPPLY_RESERVES_PHASE_A_IMPLEMENTATION.md](../40_reports/implemented/20260301_SUPPLY_RESERVES_PHASE_A_IMPLEMENTATION.md).

### Canon v0.6 implementation-notes policy

Implementation-notes in canon that are explicitly "non-normative unless promoted" remain implementation notes in v0.6. Promotion to normative requires explicit canon update in the precedence chain and corresponding ledger evidence.

## Mandatory Workflow Guardrails

### 0. Code Canon Entry Point - ALWAYS READ

**Read before any new phase or entrypoint change:**
- `docs/20_engineering/CODE_CANON.md`
- `docs/20_engineering/REPO_MAP.md`
- `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`
- `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`

**Rationale:** Prevents canon drift, entrypoint divergence, and silent nondeterminism.

### 1. Project Ledger - ALWAYS UPDATE

**Ledger structure (two-part, process canon):**

| Document | Location | Purpose |
|----------|----------|---------|
| **Changelog** | `docs/PROJECT_LEDGER.md` | Single authoritative append-only chronological record. All work that affects behavior, outputs, or scenarios MUST be appended here. |
| **Thematic knowledge base** | `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Decisions, patterns, and rationale by topic (Identity & Governance, Architecture, Implementation, Canon, Process, Decision Chains). Use for discovery; do not duplicate full changelog. |

**CRITICAL RULE:** Every work session MUST update the Project Ledger (changelog) before and after work. New entries are **appended at the end** of the changelog in `docs/PROJECT_LEDGER.md`.

**When an entry carries reusable knowledge** (e.g. a pattern, a decision with rationale, a failed approach or lesson): add or update the relevant section in `docs/PROJECT_LEDGER_KNOWLEDGE.md` and link to the ledger date. See `docs/PROJECT_LEDGER_IMPLEMENTATION_GUIDE.md` §6 (Ongoing maintenance).

**Required Format (changelog entry):**
```markdown
**[YYYY-MM-DD] Task Name**

- **Summary:** One-line description
- **Change:** What was changed and why
- **Failure mode prevented:** One line (e.g., "prevents silent nondeterminism")
- **Files modified:** List of files
- **Mistake guard:** Key phrase used
- **FORAWWV note:** Required if design insights revealed
```

**When to update:**
- Start of session: Read current state (changelog and, if needed, thematic knowledge base)
- During work: Append entries to the changelog for each logical unit of work
- End of session: Confirm all changes documented; optionally update thematic knowledge base for new patterns/decisions

### 2. Napkin - SESSION START

**Location:** `.claude/napkin.md` (canonical runbook for this repo; do not use `.agent/napkin.md` for runbook content).

**CRITICAL RULE:** At session start, read `.claude/napkin.md` before doing anything else. It tracks corrections, user preferences, and patterns that work or don't. Update it continuously as you work. Format and curation follow the [Napkin SKILL](https://github.com/blader/napkin/blob/main/SKILL.md).

**Paradox rules:** When the Orchestrator is in charge of a multi-phase implementation (e.g. Phase C GUI), all agents follow [PARADOX_RULES.md](../20_engineering/PARADOX_RULES.md): concrete phases with todos, refactor-pass between phases, full Paradox team delegation, concurrent execution where possible, then tests → report → napkin/ledger/docs → commit and push. Architect oversees and flags decisions for user review.

### 3. Git Updates - ALWAYS FOLLOW

**Before any commit:**
1. Check git status: `git status`
2. Verify only intended files staged
3. Run relevant validation: `npm run typecheck` or `npm test`
4. Check for untracked sensitive files
5. Update Project Ledger with changes

**Commit Message Format:**
```
Brief description (imperative mood)

- Change 1
- Change 2
- Change 3

Refs: docs/PROJECT_LEDGER.md entry [date]
```

**Protected Paths (never commit):**
- `data/derived/_debug/` - Debug outputs
- `data/derived/settlements_substrate.geojson` - Large derived file (regenerated)
- `docs/cleanup/cleanup_audit.*` - Audit outputs (regenerated)
- `node_modules/` - Dependencies
- `*.log` - Log files

**Always track:**
- Source code changes (`src/`, `scripts/`, `tools/`)
- Canonical documentation (`docs/**/*.md`)
- Configuration (`package.json`, `tsconfig.json`)
- Project metadata (`docs/PROJECT_LEDGER.md`, `.claude/napkin.md`)

### 4. Determinism - ALWAYS ENFORCE

**CRITICAL RULES:**
- No `Date.now()` or timestamps in derived artifacts
- No randomness in simulation logic
- Stable ordering for all iterations affecting output
- Canonical IDs only (no auto-generated IDs with timestamps)
- Serialization must be reproducible

**Canonical enforcement gate (default):**
- `npm run canon:check` (runs static scan; runs baseline regression if manifest exists)

**When processing data:**
```typescript
// ✅ GOOD: Deterministic ordering
const items = [...collection].sort((a, b) => 
  a.id.localeCompare(b.id)
);

// ❌ BAD: Non-deterministic iteration
for (const item of collection) { ... }

// ✅ GOOD: No timestamps in output
const output = { data: processedData };

// ❌ BAD: Timestamp in output
const output = { data: processedData, generated_at: Date.now() };
```

### 5. FORAWWV.md - WHEN TO UPDATE

**Location:** `docs/10_canon/FORAWWV.md`

**Purpose:** Records validated systemic truths discovered during implementation.

**When to flag for addendum:**
- Discovery of data characteristics affecting design (e.g., coordinate regimes)
- Validation of assumptions (e.g., settlement adjacency definitions)
- Detection of mismatches between design intent and data reality

**NEVER edit automatically** - Flag with note:
```
**docs/10_canon/FORAWWV.md may require an addendum** about [insight].
Do NOT edit FORAWWV automatically.
```

### 6. Process QA — Who Validates Process

**Principle:** *Process QA changes everything.* A dedicated QA agent validates that **other** agents followed this process (context, ledger, napkin at session start, commit discipline). That single checkpoint virtually eliminates micromanagement: others do the work; Process QA verifies they did it by the book.

**Designated validator:** The **Process QA** role (`.cursor/skills/quality-assurance-process` — Paradox roster: "Process QA"). Process QA does not do the work for others; it checks that the roles who did the work followed the mandatory workflow above.

**When to invoke Process QA:** After significant handoffs, after Orchestrator or Product Manager execution, or before merge. All Paradox roles are subject to Process QA validation when they produce work.

**See also:** `docs/20_engineering/AGENT_WORKFLOW.md` (Process QA section), `.cursor/AGENT_TEAM_ROSTER.md` (Process QA in Meta).

## Core Design Principles (Non-Negotiable)

### 1. Determinism
- All simulation logic is deterministic (no randomness)
- All derived artifacts are reproducible
- No timestamps in outputs
- Stable ordering everywhere

### 2. Negative-Sum Conflict
- Violence always produces costs
- Exhaustion is irreversible
- No purely military solutions
- Political collapse as dangerous as military defeat

### 3. Spatial Substrate

**Political Control (Pre-Front)**
- Settlements have political controllers independent of military presence
- Initialized deterministically before fronts exist
- Stable by default (doesn't drift without defined mechanisms)
- Change only via: sustained pressure, internal collapse, or negotiation

**War phase spatial model (OSID/Corps Sectors/Frontage cap; AoR removed, ZoC removed 2026-03-02)**
- Brigade location is location_osid only; no AoR
- Rear Political Control Zones: control unchanged without attack resolution
- Control change only via attack resolution or corps/frontline operations
- Brigades have one OSID; front segments from phase_ii_front_edges_osid
- Corps Sectors: derived each turn via multi-source BFS; partition front edges per corps for targeting and density. Sectors split by opposing faction and capped at MAX_SECTOR_EDGES=25 / MAX_SECTOR_BRIGADES=8; interior brigades assigned as reserves via BFS with proportional cap (RESERVE_PER_EDGE_CAP=0.07 — ~1 reserve per typical sector; was 0.5, excess redistributed to underfilled sectors). Exempt corps (general staff, HVO Central Bosnia) excluded. GUI renders corps-colored sector boundaries with click-to-inspect panels.
- Brigade Directive Discipline: brigades may only attack OSIDs in effectiveDirective.offensive_targets; sole exception is counter-attacks (brigade retreated from that OSID last turn). Hard block in bot_brigade_ai_osid.ts — no opportunistic off-directive attacks.
- Combat Fatigue: ops.fatigue increments per battle (attacker +2, defender +1, cap 20); recovers -1/turn via applyFatigueRecovery() before updateFormationFatigue() in update-formation-fatigue pipeline step. Peace-phase supply-assignment fatigue inert for war-phase brigades (no assignment field).
- Vienna Declaration / Local Truces: at week 4 (May 1992), evaluate-events step fires checkAndFireViennaDeclaration() → sets state.vienna_declaration_turn; narrative event pushed to events_fired. After declaration, bot generateCorpsDirectives() filters each truce partner's controlled OSIDs from offensive_targets (RS filters HRHB OSIDs, HRHB filters RS OSIDs), except municipalities in TRUCE_EXCEPTION_MUNICIPALITIES (Posavina corridor: brod/derventa/odzak/bosanski_samac/orasje + jajce). Player CAN attack across truce → check-truce-break pipeline step detects player brigade_attack_orders against partner OSIDs → sets state.truce_broken_turn[faction] and emits warning event. Truce break gives opponent bot +0.25 aggression for 6 turns (getTruceBreakAggressionBonus). Module: src/sim/local_truces.ts. State fields: vienna_declaration_turn?, truce_broken_turn?.

### 4. Pressure → Exhaustion → Collapse Chain

**Phase 3A: Pressure Eligibility and Diffusion**
- Pressure propagates across eligible settlement contacts
- Diffusion is conservative (preserves total pressure)
- Deterministic weights from Phase 2 contact metrics
- Does NOT cause exhaustion directly (substrate only)

**Phase 3B: Pressure → Exhaustion Coupling**
- Sustained pressure converts to irreversible exhaustion
- Edge-based accounting (not node-based)
- Persistence gating (must persist N turns)
- State coherence gating (requires supporting degradation)

**Phase 3C: Exhaustion → Collapse Gating**
- Exhaustion enables collapse eligibility (doesn't trigger it)
- Multi-domain gating (authority, command, spatial)
- Threshold + persistence + state coherence required
- Eligibility ≠ collapse (further resolution needed)

### 5. No Unitless Control
- Military formations required for control
- Brigade location (OSID) doesn't create control; control change only via attack/corps ops
- Political control exists independently
- Control contested by formations, not generated by them

## Project Structure

```
AWWV/
├── src/                          # Simulation engine (TypeScript)
│   ├── sim/                      # Core simulation logic
│   │   ├── combat/               # War-phase combat, bot AI, corps sectors (renamed from phase_ii/; ZoC removed 2026-03-02)
│   │   ├── early_war/            # Early-war (peace-phase) militia, control flip, displacement (renamed from phase_i/)
│   │   ├── bot/                  # Bot manager, strategy, interfaces
│   │   ├── events/               # B1 event system
│   │   ├── turn_phases/          # War and peace phase step definitions
│   │   │   ├── war_phases.ts     # War-phase pipeline steps (phase-i-* early-war + phase-ii-* combat; step names load-bearing)
│   │   │   └── peace_phases.ts   # Peace-phase pipeline steps
│   │   ├── turn_pipeline.ts      # Turn orchestrator (slim; assembles phases, runs runTurn)
│   │   └── turn_pipeline_types.ts # TurnInput, TurnReport, TurnContext, caches
│   ├── state/                    # Game state definitions
│   ├── cli/                      # CLI tools and harnesses
│   └── tests/                    # Test suites
├── scripts/                      # Build/processing scripts
│   ├── map/                      # Map data processing
│   └── repo/                     # Repository maintenance
├── tools/                        # Development tools
│   ├── assistant/                # Ledger/context helpers (no mistake guard)
│   ├── dev_runner/               # Dev server (GameState exposure)
│   ├── dev_viewer/               # HTML viewer (read-only)
│   └── docs/                     # Document generation scripts
├── data/
│   ├── source/                   # Authoritative source data (READ-ONLY)
│   │   ├── bih_master.geojson    # Settlement geometries
│   │   ├── bih_census_1991.json  # Census data
│   │   └── settlements/          # SVG municipality files
│   └── derived/                  # Generated artifacts
│       ├── settlements_substrate.geojson  # Canonical substrate
│       ├── settlement_contact_graph.json  # Phase 1 adjacency
│       ├── settlement_contact_graph_enriched.json  # Phase 2 metrics
│       └── _debug/               # Debug outputs (not tracked)
├── docs/                         # Canonical documentation
│   ├── A_War_Without_Victory_Rulebook_v0_2_7.docx
│   ├── A_War_Without_Victory_Engine_Invariants_v0_2_7.docx
│   ├── A_War_Without_Victory_Game_Bible_v0_2_5.docx (→ v0.2.7)
│   ├── A_War_Without_Victory_Systems_And_Mechanics_Manual_v0_2_5.docx (→ v0.2.7)
│   ├── PROJECT_LEDGER.md         # Authoritative project log
│   └── .claude/napkin.md        # Session runbook (read at session start)
│   └── FORAWWV.md                # Validated design insights
└── package.json                  # NPM scripts and dependencies
```

## Key NPM Scripts

### Map Building
```bash
npm run map:derive:substrate      # Build canonical settlement substrate
npm run map:merge:adm3-1990       # Regenerate canonical 1990 municipality polygons (data/source/boundaries/bih_adm3_1990.geojson)
npm run map:derive:mun1990:boundaries  # Build municipality 1990 boundary overlay (derived MultiLineString for viewers; canonical polygons = bih_adm3_1990.geojson)
npm run map:derive:contact:phase1 # Build Phase 1 contact graph
npm run map:derive:continuity:g3_6  # Build continuity graph
npm run map:contact:enrich2       # Build Phase 2 enriched graph
npm run map:viewer:substrate:index # Build substrate viewer
npm run map:viewer:contact:phase1  # Build contact graph viewer
npm run map:build:ethnicity       # Build ethnicity attribute dataset
npm run map:viewer:map:build      # Build unified multi-layer map viewer
npm run map:viewer:map:all        # Full build chain for unified viewer
npm run map:smoke:map-viewer      # Smoke test unified map viewer
```

### A1 Tactical Base Map (STABLE — basis for game)
Canonical reference: [docs/20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md](../20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md)
```bash
npm run map:a1:derive             # Build A1_BASE_MAP.geojson (borders, MSRs, roads, hydro, settlements)
npm run map:a1:snapshot           # Re-categorize layers (logic only; viewer is primary)
npm run map:a1:verify             # Verify coordinate transform
# View: npx http-server -p 8080 → http://localhost:8080/data/derived/A1_viewer.html
```

### Viewing Maps
To view the unified multi-layer map viewer:
```bash
# From repository root:
npx http-server -p 8080 -c-1

# Then open in browser:
# http://localhost:8080/data/derived/map_viewer/index.html
```

The unified viewer provides:
- Base layer: settlement polygons
- Overlay layers (togglable): municipality 1990 boundaries, political control, ethnicity majority
- Filters: unknown control only, SID substring highlight
- Contract-first loading with fatal error banner on failures

### Simulation
```bash
npm run phase3:abc_audit          # Run Phase 3A/B/C audit harness
npm run dev:runner                # Start dev runner (port 3000)
```

### Repository Maintenance
```bash
npm run repo:cleanup:audit        # Audit for orphan files
npm run typecheck                 # Type check all TypeScript
npm test                          # Run test suite
```

## Common Workflows

### 1. Starting a New Task

```bash
# 1. Read current state
cat docs/PROJECT_LEDGER.md | tail -50

# 2. Read napkin (corrections + preferences + patterns)
# (see .claude/napkin.md)

# 3. Create your script

# 4. Work on task

# 5. Update ledger
echo "**[$(date +%Y-%m-%d)] Your Task**
- Summary: What you did
- Files modified: list
" >> docs/PROJECT_LEDGER.md
```

### 2. Map Data Processing

```bash
# Check preferences first
# Read .claude/napkin.md at session start

# Run derivation
npm run map:derive:substrate

# Verify determinism (run twice, check hash)
sha256sum data/derived/settlements_substrate.geojson

# Update ledger with results
```

### 3. Document Updates

```bash
# For document changes, always:
# 1. Read current docs/PROJECT_LEDGER.md
# 2. Make changes
# 3. Generate if needed
# 4. Update ledger
# 5. Commit with proper message

git add docs/Your_Document.docx docs/PROJECT_LEDGER.md
git commit -m "Update document: brief description

- Change 1
- Change 2

Refs: PROJECT_LEDGER.md [date]"
```

### 4. Creating New Phases/Features

```bash
# 1. Check if phase exists in specs
ls docs/specs/sim/

# 2. If implementing frozen phase, read spec first
cat docs/specs/sim/phase3a_pressure_eligibility.md

# 3. Check preferences; create script
# 4. Add to turn pipeline with feature flag (default OFF)
# 5. Create audit/validation harness
# 6. Run validation
# 7. Update docs
# 8. Update ledger
```

## Critical File Locations

### Must Read Before Work
- `docs/PROJECT_LEDGER.md` - Current project state
- `.claude/napkin.md` - Corrections, preferences, patterns (read at session start)
- `docs/10_canon/FORAWWV.md` - Validated design insights
- `docs/ENGINE_FREEZE_v0_2_6.md` - Engine freeze contract

### Must Update After Work
- `docs/PROJECT_LEDGER.md` - Always
- `.claude/napkin.md` - Update when you learn something worth recording

### Reference During Work
- `docs/A_War_Without_Victory_Rulebook_v0_2_7.docx` - Player-facing rules
- `docs/A_War_Without_Victory_Engine_Invariants_v0_2_7.docx` - Correctness constraints
- `docs/specs/sim/phase3*_*.md` - Phase specifications (if implementing frozen phases)

## Known Issues and Constraints

### Map Data
- **Settlement polygons**: Independently digitized, use tolerance-based matching (not exact vertex alignment)
- **Coordinate regime**: SVG coordinate space (not geographic CRS)
- **Adjacency definition**: Shared border (positive overlap length) + point-touch + distance contact (D0=0.5)
- **Municipality borders**: Derived from settlement fabric via edge cancellation

### Phase 3 Implementation Status
- ✅ Phase 3A: Pressure eligibility and diffusion (frozen, implemented)
- ✅ Phase 3B: Pressure → exhaustion coupling (frozen, implemented)
- ✅ Phase 3C: Exhaustion → collapse gating (frozen, implemented)
- ✅ Phase 3D: Collapse resolution (implemented, capacity modifiers)
- ⏸️ Phase 4+: Not yet specified

### Dev Tools
- **Dev runner**: Exposes raw GameState via HTTP (port 3000)
- **Dev viewer**: Read-only HTML viewer, no game logic
- **Canonical faction IDs**: RBiH, RS, HRHB only (no aliases)
- **location_osid**: War-phase brigade location; dev/viewer use OSID for formation position

## Validation Commands

Before any commit, run appropriate validation:

```bash
# TypeScript compilation
npm run typecheck

# Simulation validation
npm run phase3:abc_audit

# Map determinism check
npm run map:derive:substrate
sha256sum data/derived/settlements_substrate.geojson
# (run again, verify same hash)

# Document generation (if modified tools/docs/)
npm run docs:validate:phase3a  # etc.
```

## Anti-Patterns (DO NOT DO)

### ❌ Don't Skip Napkin
At session start, read `.claude/napkin.md` and apply its corrections and patterns. Update it as you work.

### ❌ Don't Break Determinism
```typescript
// BAD: Timestamp in output
const output = { data, timestamp: Date.now() };

// BAD: Non-deterministic iteration
for (const [key, value] of Object.entries(map)) { ... }

// GOOD: No timestamp
const output = { data };

// GOOD: Stable ordering
const sorted = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
for (const [key, value] of sorted) { ... }
```

### ❌ Don't Forget Project Ledger
```typescript
// BAD: Work without ledger update
// ... make changes ...
// ... commit ...

// GOOD: Update ledger
// 1. Read ledger before work
// 2. Make changes
// 3. Update ledger with entry
// 4. Commit with ledger update
```

### ❌ Don't Invent Geometry
```typescript
// BAD: Create new geometry
const repaired = fixPolygon(brokenPolygon);

// GOOD: Validate and report
if (!isValid(polygon)) {
  console.warn(`Invalid polygon: ${sid}`);
  recordInAudit(sid, "invalid_geometry");
}
```

### ❌ Don't Edit FORAWWV.md Automatically
```typescript
// BAD: Modify FORAWWV.md
fs.appendFileSync('docs/10_canon/FORAWWV.md', newInsight);

// GOOD: Flag for manual review
console.log('**docs/10_canon/FORAWWV.md may require an addendum** about [insight].');
console.log('Do NOT edit FORAWWV automatically.');
```

## Quick Reference Card

**Every work session:**
1. ✅ Read `docs/PROJECT_LEDGER.md` (last 50 lines)
2. ✅ Read `.claude/napkin.md` at session start
4. ✅ Maintain determinism (no timestamps, stable ordering)
5. ✅ Update `docs/PROJECT_LEDGER.md` after work
6. ✅ Check git status before commit
7. ✅ Run validation before commit
8. ✅ Commit with proper message + ledger reference

**Canonical fact hierarchy:**
1. Engine Invariants (what MUST be true)
2. Phase Specifications (how frozen phases work)
3. Systems Manual (complete mechanics)
4. Game Bible (design philosophy)
5. Rulebook (player experience)

**When in doubt:**
- Read napkin at session start
- Read relevant canonical docs
- Validate determinism
- Update ledger
- Flag FORAWWV if design insight discovered

## Document Reconciliation Status (2026-01-29)

**Current Task:** Reconciling all documentation to v0.2.7

**Status:**
- ✅ Rulebook v0.2.7 (needs formatting)
- ✅ Engine Invariants v0.2.7 (needs formatting)
- 🔄 Game Bible v0.2.5 → v0.2.7 (in progress)
- 🔄 Systems Manual v0.2.5 → v0.2.7 (in progress)
- 🔄 Phase Specifications v0.2.7 (creating new document)

**Changes Being Applied:**
1. Remove appendix-style sections from all docs
2. Add proper chapter/section numbering
3. Integrate v0.2.7 political control content
4. Extract Phase 3A/B/C specs to separate document
5. Update all cross-references
6. Ensure terminology consistency

**See:** `docs/document_reconciliation_plan.md` for full details.

## Contact and Escalation

**Primary documentation**: All canonical docs in `docs/` directory
**Project log**: `docs/PROJECT_LEDGER.md` (append-only changelog, authoritative)
**Thematic knowledge**: `docs/PROJECT_LEDGER_KNOWLEDGE.md` (decisions, patterns, rationale by topic)
**Napkin**: `.claude/napkin.md` (corrections, preferences, patterns — read at session start)
**Design insights**: `docs/10_canon/FORAWWV.md` (validated truths only)

**If uncertain:**
1. Check napkin for similar situations
2. Check project ledger for recent context
3. Read relevant canonical documents
4. When in doubt, validate and report rather than guess
5. Flag FORAWWV if design assumption seems violated

---

**Last Updated:** 2026-01-29
**Document Version:** 1.0
**Project Phase:** Engine implementation + document reconciliation
