# Napkin Runbook

**Location:** `.claude/napkin.md` - single runbook for this repo. Read and curate at session start. Update during work.

**Rules:** Max 10 items per category. Re-prioritize on every read (highest first). Merge duplicates, remove stale. Each entry: date + short title + "Do instead".

**Master files:** Calibration → `docs/40_reports/CALIBRATION_MASTER.md`; GUI (map + warroom) → `docs/40_reports/GUI_MASTER.md`; Warroom → `docs/40_reports/WARROOM_MASTER.md`; Real War → `docs/40_reports/REAL_WAR_MASTER.md`; Sectors → `docs/40_reports/SECTOR_MASTER.md`; **Bosniak-Croat Conflict → `docs/40_reports/BOSNIAK_CROAT_CONFLICT_MASTER.md`**. Do instead: When doing calibration, GUI, warroom, sector, realism, or HRHB-RBiH conflict work, read the relevant master first and update it during the session.

**Player command model CANON (n717):** Player commands Army→Corps→Sector only. Brigades NEVER attack independently. Valid tactical levers: corps stance, sector stance, ops planning, logistics priority, OPSEC, sector override. Direct brigade attack/move orders are architecturally wrong.

## Current State (2026-03-20, v0.6.2 — Battle of the Barracks + Equipment Overhaul)
**v0.6.2.** 1422 tests, 117 suites. tsc clean. **Latest calibration: 91.4% area-weighted (40w, feature branch).**
**This session:** **UI/UX P1 Stabilization** (T1 routing, M1 minimap) + **G2 Live Briefing** (Ops Planning Phase 3) INTEGRATED. Hybrid Deck.gl strategy adopted.
**HRHB-RBiH conflict:** P1 Backlog: CB brigade redistribution, CB operations not launching. Master: `docs/40_reports/BOSNIAK_CROAT_CONFLICT_MASTER.md`. Report: `docs/40_reports/2026-03-20-ops-planning-phase-6-completion-report.md`.
**Equipment pipeline:** Battlefield scavenging (winner 15-25%, **loser 15%**, stalemate 8% — both sides scavenge with fractional accumulator). Capture from retreat (5%/12%, min-1 at 10+ tanks). **Scarce tank protection** (<10 tanks: half loss rate, no min-1). Abandoned capture on uncontested occupation (0.0004 tanks/pop). **Battle of the Barracks** (w4-6, conditional, 13T+26A). Arms smuggling (2T+3A/12t, 60/40 ARBiH/HVO). Zenica steelworks (+3A/8t ARBiH). HV transfers (+1A/12t HVO). Write-off: >40% non-functional. `ensureBrigadeComposition` empty for non-brigades. JNA mech/moto priority. Dynamic recruitment: no JNA override. Per-brigade `total_equipment_destroyed`/`captured` on BrigadeHistory. 12 accolades in `brigade_accolades.ts`. Corps panel equipment in CorpsDetail.
**Event effect types (9):** narrative, morale_change, supply_delta, cohesion_change, humanitarian_impact, patron_pressure, alliance_change, negotiation_capital, **equipment_grant**, **aggression_modifier**.
**v0.5.x–v0.9.1 FULLY PLANNED:** 21 milestones scoped (v0.4.9 added). P4 Fog of Personality → v0.5.2. P5 Dayton Negotiation → v0.6.3.
**10 architectural patterns MANDATORY for v0.5.x** — registry patterns for briefing, settings, SFX, verdict tabs, menu slots.
**Calibration freeze rule:** After v0.6.1, any sim-affecting change needs `npm run calibrate:52w` regression check vs freeze baseline.
**External:** Visual assets (user, Gemini Pro). Audio assets (sourcing needed).

## Session Startup (do these EVERY session — BEFORE any work)
1. **[2026-03-20] Initiate MapLibre + Deck.gl Hybrid implementation (P2).**
   Do instead: Following the approved strategy in `2026-03-19-ui-visual-overhaul-design.md`, start prototyping the Deck.gl tactical overlay. Start with unit counter enrichment.
2. **[2026-03-13] Check crons and schedule if missing — ALWAYS (two crons)**
   Do instead: Run `CronList` at session start. Crons are session-only and auto-expire after 3 days. **Re-schedule every session.** Two required crons:
   **(A) Daily Pyrrhic Standup** — cron `27 6 * * *`. Invokes /orchestrator to convene Pyrrhic team. Three phases: (1) Yesterday's retrospective (good/bad/ugly from `git log --since=24h`, ledger, life lessons), (2) Fresh game analysis (CALIBRATION_MASTER, REAL_WAR_MASTER, War-or-Game assessment), (3) Today's priorities — plan big and ambitious (3-5 items a team of AI agents can accomplish). Present everything via /visual-explainer as a war room briefing board. Full prompt stored in `memory/cron_daily_standup.md`.
   **(B) Life-lessons review** — cron `3 6 * * *`. Gather 24h git activity, detect life-lesson violations, synthesize new lessons, promote/demote, generate visual report via `/visual-explainer`.

## Execution & Validation
1. **[2026-03-11] NEVER claim a fix works without running the scenario and verifying the output**
   Do instead: After any bug fix, run a fresh scenario (`npm run sim:scenario:run:40w`), then write a diagnostic script to verify the specific bug is gone. Check for related issues (e.g. other code paths that do the same wrong thing). Always verify with data, never with assumptions.
2. **[2026-03-14] /war-or-game sign-off required after every phase — standing directive**
   Do instead: After each implementation phase runs the scenario and comparison tool, invoke /war-or-game to sign off. If he raises P1 issues, slot them into the sprint plan before moving to the next phase. If P2, add to backlog. No phase is complete without the sign-off.
3. **[2026-03-11] One-change-then-verify calibration protocol (MANDATORY)**
   Do instead: (1) Change ONE parameter or fix ONE bug. Never bundle. (2) Run fresh 40w scenario. (3) Run comparison tool. (4) Run /war-or-game sign-off. (5) Record result in CALIBRATION_MASTER.md.
4. **[2026-03-07] Classify phases by real code impact, not plan labels**
   Do instead: Before parallelizing or skipping regression, audit the task list. If a phase touches schema, IPC, bot logic, pipeline, or serialization, treat it as engine-touching even if the plan calls it UI-only.
5. **[2026-02-25] Determinism is sacred**
   Do instead: No `Math.random()`, no timestamps, no `Date.now()` in run folders. Sorted iteration via `strictCompare`. Monotonic `.run_counter` for run folders.
6. **[2026-02-21] Smoke-test triad after every change**
   Do instead: Run `tsc --noEmit`, `vitest run`, and `desktop:map:build` as standard smoke check.
7. **[2026-02-20] Fix ALL failing tests**
   Do instead: Fix all failing tests even if unrelated to current change. Standing directive.
8. **[2026-03-06] Preserve fractional run-summary metrics**
   Do instead: In scenario summary normalization, never round fields ending in `share`, `ratio`, `rate`, `tolerance`, or `deviation`.
9. **[2026-02-22] Never auto-rebaseline golden tests**
   Do instead: Keep failing baselines pending canon/data authority review. Refresh only after user/PM sign-off.
10. **[2026-02-24] Scenario checkpoint lengths**
    Do instead: Use 20w/30w checkpoint runs for iteration; reserve 52w for acceptance only.
11. **[2026-03-20] Use visibility:hidden + requestAnimationFrame(resize) for MapLibre map toggles.**
    Do instead: To prevent context loss and re-render artifacts on toggles, use CSS visibility/opacity and call `map.resize()` inside an animation frame.

## Shell & Platform
1. **[2026-03-05] Existing-dir file generation: prefer `apply_patch` or script files**
   Do instead: Use `apply_patch` for manual edits. For bulk/generated content, write a short script file and run it.
2. **[2026-02-07] Windows shell separator**
   Do instead: On Windows PowerShell, use `;` not `&&` to chain commands.
3. **[2026-02-07] tsx can hang on Windows**
   Do instead: Use `node_modules/.bin/tsx` directly (not `npx tsx`). Prefer `npm run test:vitest` over `npx tsx --test`.
4. **[2026-02-28] Root tsc vs nested UI package**
   Do instead: When `npx tsc --noEmit` at root fails on JSX config, verify changed UI package with its own build (`src/ui/map: npm run build`).
5. **[2026-02-13] Validate paths with glob before use**
   Do instead: Stale paths break silently. Skills at `.claude/skills/*` — validate with glob.
6. **[2026-03-12] Save file field names: `corps_id` not `corps`, `location_osid` not `current_osid`**
   Do instead: In diagnostic .cjs scripts, use `f.corps_id` and `f.location_osid`. Using `f.corps` returns undefined, causing false cross-corps positives and phantom bugs.

## Imports & Build
1. **[2026-02-07] Martinez ESM import**
   Do instead: `import * as martinez from 'martinez-polygon-clipping'` (not default import).
2. **[2026-02-07] JSTS deep imports**
   Do instead: Import from `jsts/org/locationtech/jts/io/*.js` (not package root).
3. **[2026-02-07] Browser build: extract Node imports**
   Do instead: For browser-reachable code, extract Node-only imports to `*_utils.ts` files.
4. **[2026-02-28] Vitest .js import path parity**
   Do instead: For test imports using `.js` paths into `src`, ensure target base path exists. If module moved, repoint import.
5. **[2026-03-08] Warroom/vitest jsdom for DOM-dependent tests**
   Do instead: Tests that import warroom or any code using document/window need jsdom. In vitest.config set environmentMatchGlobs for the test file to 'jsdom'.

## Known Backlog
1. **[2026-03-19] CB brigade redistribution (P1)**: `hvo_central_bosnia` has 5 brigades in 6 sectors — 5/6 empty. Kiseljak pocket stacked, Busovaca/Vitez/NT/Zepce undefended. See BOSNIAK_CROAT_CONFLICT_MASTER.
2. **[2026-03-19] CB operations not launching (P1)**: 3 HRHB-RBiH battles in 16 war weeks. Corps needs offensive doctrine against ARBiH + operation generation. See BOSNIAK_CROAT_CONFLICT_MASTER.
3. **[2026-03-19] Kiseljak/Vitez pocket separation (P1)**: Historically two distinct enclaves. Currently one territory. ARBiH should sever the Fojnica/Kresevo corridor.
4. **[2026-03-19] #35 SRK screening stance (P2)**: Siege corps in lowest density mode. Needs corps-specific stance floor.
5. **[2026-03-18] Drina region 78% (P2)**: Structural gap — may need OOB or painted target adjustments.
6. **[2026-03-19] 3rd Corps displacement (PARTIALLY FIXED, P3)**: 9/27 far from home. Structural.
7. **[2026-03-19] #41 Dissolution floor not enforced (P3)**: hrhb_108th at 100 pers below 150 floor.
8. **[2026-03-18] RBiH artillery below target (P3)**: 117 vs 150-250 historical.
9. **[2026-03-19] UI Visual Overhaul (P2 — PARKED)**: 6-phase plan: icons (P0), counter enrichment, sidebar upgrade, document panels, bottom strip, map ops viz. ~11-13 sessions. Plan: `docs/plans/2026-03-19-ui-visual-overhaul-design.md`. Asset brief: `docs/30_planning/VISUAL_ASSET_BRIEF.md`. Genre survey: HoI4/UoC2/EU4/AGEOD patterns.
10. **[2026-03-19] Map UX: heat map legend + context menu (P3)**: Legends for color gradients. Right-click context menu per element type. See MAP_UI report.
**Resolved this session:** #34 HVO sectors (FIXED — corps activation + consolidation protection), #38 HVO stale IDs (FIXED), #33 Sarajevo density (CORRECT — siege working).

## Simulation Engine
1. **[2026-03-07] Phase C supply agency lives in patron_pressure + supply_reserves, not a separate subsystem**
   Do instead: Keep IVP consequence hysteresis in `patron_pressure.ts`; keep convoy/smuggling/tunnel hooks in `supply_reserves.ts`.
2. **[2026-03-07] Composite IVP extends the existing patron-pressure system**
   Do instead: Extend `patron_pressure.ts` and `international_visibility_pressure`, not a parallel IVP subsystem.
3. **[2026-03-03] Supply reserves: gated + pocket threshold + isolated source + heavy weapon drain**
   Do instead: All reserve logic gated by `state.meta.supply_reserves_enabled`. SIEGE_MIN_POCKET_SIZE=8. `findHeartlandComponent()` for isolated sources. HEAVY_MAINTENANCE_PER_WEAPON=0.001.
4. **[2026-03-01] OSID/SID mismatch — never use getEffectiveSettlementSide for control**
   Do instead: `political_controllers` keyed by OSIDs in war phase. Use `buildMunControlFromOsids()` or `buildMunDominantController()`.
5. **[2026-03-11] Displacement: per-OSID census, non-overlapping buckets, static routing, UI removal count**
   Do instead: Use `getOsidCensusPopulation(osidRec)`. `departedByOsid` must count `displaced+killed+fled_abroad` (full removal). Event log: `state.displacement.displacement_event_log`.
6. **[2026-02-24] OSID-keyed political_controllers init + load migration**
   Do instead: Check `isPoliticalControllersAlreadyOsidKeyed()` first. `migratePoliticalControllersToOsidIfNeeded` only for canonical SIDs.
7. **[2026-02-28] Operational control: majority then plurality**
   Do instead: Assign faction by ethnic majority (>50%), else plurality. Not "first ≥40%".
8. **[2026-02-22] Pipeline step no-ops for missing data**
   Do instead: When operational data unavailable, log and skip OSID steps safely rather than crashing.
9. **[2026-03-08] Paramilitary rear pocket cleanup: `paramilitary_sweep.ts`**
   Do instead: Autonomous paramilitary units for rear enemy pocket clusters (1-3 OSIDs, ALL external neighbors faction-controlled). Active w0-20. Faction rates: RS=0.85, HRHB=0.55, RBiH=0.30.
10. **[2026-03-16] Historical event system LIVE — 47 events from JSON, loaded via `event_loader.ts`**
    Do instead: Events loaded from `data/scenarios/events/war_*.json` via `loadEventDefinitions(startWeek)` in scenario runner. Passed as `eventDefinitions` on `TurnInput`. `evaluateEvents()` accepts optional `registry` param. Events fire mechanical effects (morale, supply, alliance, war crimes, decisions). `events_fired` serialized to `weekly_report.jsonl`. Decision events queue for player, auto-respond for bots. **6 HRHB-RBiH events now condition-triggered** (alliance_below, faction_controls_municipality).

## Bosniak-Croat Conflict (HRHB-RBiH War)
1. **[2026-03-19] Mobilization phase — 4-turn buildup (IMPLEMENTED)**
   Do instead: `isRbihHrhbMobilizing()` / `isRbihHrhbCombatEnabled()` in `alliance_update.ts`. Front edges appear at ≤0.20 (ALLIED_THRESHOLD). Combat suppressed for `MOBILIZATION_DURATION_TURNS=4`. Gates in `bot_brigade_eval_attack.ts`, `bot_corps_directives.ts`, `attack_resolution_osid.ts`, `battle_resolution.ts`.
2. **[2026-03-19] Condition-driven war events — no hardcoded dates (IMPLEMENTED)**
   Do instead: `war_1993.json` events fire on `alliance_below` + `faction_controls_municipality` conditions. Gornji Vakuf: alliance<0.45 + player decision. War begins: alliance<0.10. Ahmici: requires war + HRHB controls Vitez.
3. **[2026-03-19] hvo_central_bosnia activation — war-phase activate-corps step (IMPLEMENTED)**
   Do instead: `war_phases.ts` step `activate-corps` creates corps formations from OOB at their `available_from` turn. CB activates at w10. Without this, CB never exists as a formation in war-start scenarios. Pipeline: 139 steps.
4. **[2026-03-19] Sector consolidation: brigade-presence protects enclave corps (IMPLEMENTED)**
   Do instead: `consolidateCrossCorpsFronts` in `sector_territory.ts` — if ANY edge in a component has a brigade of the minority corps, protect ALL edges of that corps in the component. Without this, isolated enclave corps (CB at Kiseljak) get drained edge-by-edge.
5. **[2026-03-19] HRHB readiness: no reversion from active to forming (IMPLEMENTED)**
   Do instead: `deriveReadinessState` in `formation_lifecycle.ts` — once past forming, low cohesion → overextended/degraded, NOT forming. Without this, all 29 HRHB brigades oscillated active↔forming every turn.

## Bot AI & Combat
1. **[2026-03-13] Triple-junction adjacency: standard for grouping, strict for splitting (n664→n682)**
   Do instead: `buildEdgeAdjacency` (33m `frontEdgeAdj`) for sub-segment grouping (Steps 1-3). `buildEdgeAdjacencyStrictCaseB` for contiguity split (Step 4b): Case A always, Case B only when both fi-H and fj-H in strict adjacency (≤5.5m `SHARED_BOUNDARY_THRESHOLD`). Standard Case B bridges front edges on opposite sides of enemy pockets (e.g. dragoradi↔olovo_2 via krivajevici at 16.9m); strict Case B cuts these. Municipality guard on `mapOsidsToCorps` Phase 2 BFS prevents corps territory race.
2. **[2026-03-14] Supply gate strips all offensive targets when critical_fraction > 0.5**
   Do instead: `assessCorpsSupplyHealth` in `bot_corps_directives.ts` clears `offensiveTargets` when >50% brigades critical supply AND upgrades `min_attack_outcome` to `costly_victory` when adequate_fraction < 5%. Besieged pockets (Orašje) are always critical supply — stance change alone won't enable attacks. This is correct and historically accurate.
3. **[2026-03-11] RS three-phase doctrine — organic tempo decay (n579)**
   Do instead: w0-12 blitz (0.35/0.15), w12-26 sustained (0.25/0.08), w26+ consolidation (0.20/0.05). Late-war params have ZERO calibration effect. Early-war intensity is the primary lever.
4. **[2026-03-10] Enclave defense overhaul — Sarajevo holds (n524→n527)**
   Do instead: `ALWAYS_BESIEGED_ENCLAVES` forces Sarajevo strained supply. `initial_resilience=20`. `getEnclaveGarrisonPower()` adds civilian defense volume. Urban mult 2.0×. `URBAN_TANK_TERRAIN_FLOOR=1.7`. Key lesson: personnel ratio trumps multipliers — need raw volume.
5. **[2026-03-11] RBiH defensive w0-15, restrained balanced w15-56**
   Do instead: ARBiH defensive through w15, then balanced with low attack share (0.12) and negative aggression (-0.05) through w40.
6. **[2026-03-12] Operation Preparation System IMPLEMENTED**
   Do instead: `operation_preparation.ts` — 5-phase state machine (intel_gathering→force_staging→supply_check→assessment→ready). Commander personality drives tempo. Probes as sub-actions. `tickPreparation()` in pipeline. UI: `CommanderSelectionModal.tsx` + `OperationBriefingModal.tsx`. 45 tests. Player `force_launch` override. Intel-gated launch gate in `bot_corps_directives.ts`.
7. **[2026-03-14] Graz Accords / Local Truces — faction-level block (n697)**
   Do instead: `src/sim/local_truces.ts` — fires at week 4. Faction-level block: when Herzegovina truce active, ALL RS corps (except vrs_1st_krajina, vrs_2nd_krajina) blocked from HRHB. Corps-pair truce (Herzegovina) + Kiseljak OSID exclusion. Cold fronts: `isColdFront()` exempts from attrition/bombardment.
8. **[2026-03-07] Pre-planned VRS operations (5 corps only) + JNA ghost Kupres**
   Do instead: `injectPrePlannedOperations(state)` sets corps to `offensive` PERMANENTLY. Only original 5 corps. 2KK has NO pre-planned op.
9. **[2026-03-10] Cross-corps sector assignment must stay hard-blocked**
   Do instead: In `classifyBrigadesByTerritory`, never assign a brigade to another corps sector. All fallback paths must preserve brigade corps ownership.
10. **[2026-03-13] Flat reserve pooling hides corps organizational structure**
    Do instead: When a higher-level system (corps) makes positioning decisions, the lower-level system (combat) MUST respect those decisions. If combat treats all reserves as interchangeable (`sectorReserves = totalPower - physicalPower`), corps home-affinity assignment is wasted. Per-entity contribution with spatial weighting (distance + home bonus) is required for non-uniform defense.

## Officer Architecture
1. **[2026-03-15] Officer succession is player-choice for player faction (events, not auto-retire)**
   Do instead: `available_until_turn` creates `replacement_suggested` event (not auto-retire) for player faction. `available_from_turn` creates `officer_available` notification. Bot factions unchanged. `findHistoricalSuccessor()` finds recommended replacement. Events in `MilitaryState.pending_officer_events`. `PendingOfficerEvent` type in `officer_types.ts`. IPC: `acknowledge-officer-event`, `accept-officer-replacement`. UI: `OfficerEventBadge.tsx` in Personnel toolbar.
2. **[2026-03-15] Combat death policy: casualty_vulnerability vs available_until_turn**
   Do instead: `casualty_vulnerability` = organic KIA risk (probabilistic). `available_until_turn` = organizational replacement only (political/transfer). NEVER use `available_until_turn` for combat deaths — it creates deterministic death dates. Officers historically KIA (Nanić, Hujdur, Šehović, Hadžić, Hodžić, Bešić) use only `casualty_vulnerability`.
3. **[2026-03-15] Elite commanders: permanent brigade-level, separate from named officers**
   Do instead: `elite_commander` field on `oob_brigades.json` — static string, not in `named_officer_data`. Cannot die, promote, or command ops. 8 elite brigades (Rađo/Guards, Tirić/Black Swans, Samardžić/1st Guards Moto, Savčić/65th Protection, Glasnović/ABB, Sopta/Domagoj, Nakić/Jastrebovi, Bilonjić/Sinovi Posavine). Never suggest promoting elite commanders.
4. **[2026-03-15] War crimes records on 27 officers (informational, no gameplay effect)**
   Do instead: `war_crimes_record` field on `NamedOfficer` in `officer_types.ts`. 27 officers annotated (VRS 13, ARBiH 7, HVO 7) with court, sentence, summary. UI badge: red=convicted, green=acquitted, amber=indicted. Data in `apr1992_officers.json`. No combat modifier — purely informational.
5. **[2026-03-15] 98 named officers (RS 32, RBiH 38, HRHB 28) — all 9 Orden heroja recipients**
   Do instead: Named officers command corps and operations. Brigades have `officer_quality` [0,1] → `getBrigadeOfficerMod()`. Never suggest named officer assignment for brigades. All 9 Orden heroja oslobodilačkog rata recipients documented. `officerUtils.ts` must check `status === 'active'` (bug fixed: Delić showed instead of Halilović).
6. **[2026-03-16] Officer experience + defeatism + heroic stand ALL WIRED**
   Do instead: `applyOperationExperience()` called from `sector_offensive.ts` on op completion (ARBiH 1.5× learning). `checkDefeatism()` fires at 3+ consecutive op failures → -0.3 competence. `checkHeroicStand()` fires from `check-heroic-stand` pipeline step when defender holds at 3:1+ ratio → +1 aggressiveness + morale boost. `consecutive_op_failures` tracked on `NamedOfficerState`, reset on success.

## OOB & Brigade Systems
1. **[2026-03-12] Per-brigade personnel caps via `deriveMaxPersonnel()` (n626)**
   Do instead: Brigade max_personnel derived from equipment_class + faction. Replaces flat 3000 cap. Troop strength still emerges from pool demographics, mobilization scales, exhaustion, and FACTION_POOL_SCALE. RS JNA bonus=10k.
2. **[2026-03-05] April 1992 startup: patch both OOB entry + recruitment engine; home_osid must be friendly**
   Do instead: Patch both `oob_early_war_entry.ts` and `recruitment_engine.ts`. Choose starting OSIDs that are already friendly-controlled.
3. **[2026-03-02] VRS equipment decay**
   Do instead: `equipment_decay` field on FormationState. Applied as multiplier in `getEquipmentRatio()`. Starts w26, 0.5%/week, floor 0.60.
4. **[2026-03-15] Army HQ Reserve Pool — elite brigade loan system (IMPLEMENTED)**
   Do instead: `army_reserve_system.ts` + `elite_loan.ts`. Elites permanently under `vrs_main_staff`/`arbih_general_staff`/`hvo_main_staff`. Per-turn: `generate-army-reserve-requests` (corps request offensive_support/defensive_gap/exploitation) → `evaluateArmyReserveAssignments` (bot auto-assigns; player requests stay in `pending_reserve_requests`) → `tick-elite-loans` (force-recall ≥30% cas/morale<35/50% degradation; voluntary after ELITE_LOAN_MIN_DURATION=6 + op ended + threat<1.5). UI: `ArmyReservePanel.tsx` rendered when army_hq selected (replaces FormationDetail). IPC: `approve-reserve-request`, `recall-elite-brigade`, `redirect-reserve-loan`. State: `elite_brigade_tracker` on MilitaryState tracks episodes. Elite identified at runtime by presence of `elite_loan_state` (not `is_elite` flag).
5. **[2026-03-07] Phase E municipality support stays asymmetric and pool-constrained**
   Do instead: Faction-distinct effects: RBiH=weapons_shipment, RS=staff_priority, HRHB=croatian_support_package. One target, one turn.

## Sectors & Operations
1. **[2026-03-12] consolidateCrossCorpsFronts must respect osidToCorps (n624 Herzegovina/Sarajevo gotcha)**
   Do instead: Step 3b majority-count consolidation can steal territory from correct corps. The BFS home-seed mapping is authoritative — consolidation must protect edges where `osidToCorps` agrees with the minority corps. Without this, a larger connected front (Herzegovina) absorbs a smaller correct corps's edges (SRK Sarajevo).
2. **[2026-03-14] Commander-driven brigade assignment: 4-phase 2a/2b/2c/2d (n696)**
   Do instead: `classifyBrigadesByTerritory`: Phase 2a=home affinity (no need>0 gate), Phase 2b=competence-gated commander dist (aggressive→concentrate at threat, defensive→fill gaps), Phase 2c=BFS 4-hop cap (was 8), Phase 2d=pre-op staging weight (1.5× intel_gathering, 3.0× force_staging) + priority sector sweep. `buildCorpsCommanderProfiles()` reads named_officers + corps_command. `COMMANDER_COMPETENCE_ASSIGNMENT_THRESHOLD=0.35`, `PHASE_2C_MAX_HOPS=4`.
3. **[2026-03-09] Every brigade stays in its sector — no reserve cap**
   Do instead: Reserve cap REMOVED. Corps needs full visibility of all manpower. `deduplicateBrigadesAcrossSectors` prevents cross-sector duplicates.
4. **[2026-03-09] Mech/moto staging + priority for offensive ops**
   Do instead: `getEquipmentOffensivePriority()` (mechanized=3, motorized=2, mountain=1). Staging pass scans reserves for mech/moto. Mech/moto are offensive tools, not line troops.
5. **[2026-03-07] Sector intel replaces recon_intelligence (DELETED) — fog LIVE**
   Do instead: `sector_intel.ts`. GUI fog-of-war LIVE. `recon_intelligence.ts` is DELETED — do not reference it.
6. **[2026-03-07] Sector orders + OPSEC are sector-state, not brigade hacks**
   Do instead: `sector_stance_orders` → `applySectorStanceOrders()` → `brigade_posture_orders`. OPSEC in `state.opsec_sectors`.
7. **[2026-03-19] Corps-level operation creation — no catalog ops, no sector-scoped launch**
   Do instead: Operations launch from `generateCorpsDirectives` via `evaluateCorpsOffensiveLaunch`. Corps-wide brigade pool (all active subordinates). Contiguity from ALL corps sectors. `MAX_PARTICIPATING_BRIGADES=12`. Force-scaled objective cap: `maxObjectives = min(6, floor(brigades * 0.5))`. Probes remain sector-scoped.
8. **[2026-03-06] Proof lane + eligible-attacker boundary**
   Do instead: Run `tests/scenario_vrs_operation_proof.test.ts` before wide calibration work.
9. **[2026-03-05] Opening operations: explicit rosters + named ops own brigades**
   Do instead: For April 1992 VRS opening ops, use explicit `participating_brigades`, `sector_id`, `staging_osid`.
10. **[2026-03-19] Post-op brigade return march — immediate column march on op completion**
    Do instead: `issuePostOperationReturnMarches()` in `sector_offensive.ts`. Fires at recovery completion for ALL participants outside home municipality (no distance threshold). Orders consumed by `osid-column-movement` (step 496) next turn. Existing `return-displaced-brigades` (step 608) only catches >3 hops + runs every 4 turns. Pipeline order: step 496 osid-column-movement → step 517 apply-brigade-movement → step 608 return-displaced → step 708 advance-sector-offensives. Column-stance orders from step 708 survive to next turn's step 496.

## GUI / HoI Map
1. **[2026-03-15] Unified bottom strip: map modes + territory + toggles**
   Do instead: `BottomStatusStrip.tsx` is the single bottom bar: `[Map Mode Pills] | [Territory % area-weighted] | [Layer Toggles]`. z-20 (above map, below panels z-50-100). `MapModeToolbar` exists but is NOT rendered. Territory % uses km² from `osid_areas.json`. 7 modes (keys 1-7): Political, Ethnic, Supply, Casualties, Morale, Operations, Defense. Pressure/density modes removed (broken/redundant). Casualties + morale use continuous `interpolate` gradients. 7 layer toggles: Front, Units, Labels, Minimap, Fog, Battles, Points.
2. **[2026-03-11] GameStateAdapter is the single chokepoint — check paths FIRST**
   Do instead: Fields live under namespaced paths (`state.military.*`, `state.displacement.*`). Wrong path silently returns `undefined`. `departedByOsid` must accumulate `displaced+killed+fled_abroad`. See `memory/gui_debugging.md`.
3. **[2026-03-07] Settlement panel: 3 horizontal tabs, nation labels, current ethnic**
   Do instead: Overview | Military | Orders & events. `ethnicityOrFactionToNationLabel`. `getCurrentEthnicForOsid`. See TACTICAL_MAP_SYSTEM §13.2.
4. **[2026-03-07] Command briefing routing lives in `App`, not the toolbar**
   Do instead: Mount briefing as thin overlay in `App.tsx`, fed by `GameStateAdapter.commandBriefing`.
5. **[2026-03-07] Detail panels drill right; App owns precedence**
   Do instead: Right-side panel rail: overview → primary → secondary. `App.tsx` mounts from one deterministic selector.
6. **[2026-03-20] MapLibre + Deck.gl Hybrid strategy: Deck.gl for tactical overlays.**
   Do instead: Use MapLibre for the terrain/base map and synchronized Deck.gl layers for dynamic tactical elements (counters, glows, previews). Deck.gl is superior for game-like overlays.
7. **[2026-03-19] Modal MapLibre: two init-timing traps**
   Do instead: (A) `setData()` on `map.addSource()`-created GeoJSON works for initial render but silently fails on updates. Use remove+re-add pattern (`replaceArrowSource` in `OpsMap.tsx`). (B) `isStyleLoaded()` returns false inside `map.on('load')` after adding sources in that callback. Never use style-loaded guards during init — create sources/layers inline. Use the remove+re-add helper for updates only, not init.
7. **[2026-03-14] Tactical map player_faction: NEVER hardcode**
   Do instead: `App.tsx` must NOT override `player_faction`. Electron uses `useDesktopSession` which preserves chosen faction. Live autoload skips when IPC available.
8. **[2026-03-15] HQ Abstraction vs Physical Units**
   Do instead: `corps_asset` and `army_hq` are organizational abstractions. They do **not** have map lines or "ghost lines". Only brigades and front sectors are map-physical. Command lines are in the OOB/Warroom, not the tactical map. Army HQ brigades (elites) navigate to the Army panel (`selectedArmyId`), not a corps panel — `FormationDetail.tsx` detects `army_hq` kind for the parent link.
9. **[2026-03-06] Tactical fog contract is `fogOfWar`, not raw sector intel**
   Do instead: Derive player-visible fog in `GameStateAdapter.ts` from `sector_intel` + sectors + friendly brigade positions.
10. **[2026-03-16] Brigade AoR highlight: dedicated layers, never shared**
    Do instead: Brigade AoR highlight uses 2 dedicated layers (`brigade-aor-pos`/`brigade-aor-neg`) on `front-edges-hover` source. Completely independent of sector/corps highlight. White icon via `FORMATION_WHITE_OVERLAY` + `SECTOR_UNIT_PULSE`. Filter by `sub_segment_id`. NEVER share layers between sector highlight and brigade highlight — use dedicated layers. Shared layers cause last-writer-wins race between useEffects.

## Desktop & Electron
1. **[2026-03-02] One map app: desktop uses dev when running**
   Do instead: Single codebase `src/ui/map/`. Electron tries ports 3002-3005 for dev map; otherwise serves built bundle.
2. **[2026-03-03] Desktop map: HTTP server + routes**
   Do instead: Map/warroom load from `http://127.0.0.1:<port>/...`. MapLibre blob workers don't work under awwv://.
3. **[2026-03-03] Desktop map build output**
   Do instead: Map Vite build outputs to `dist/tactical-map` for Electron.
4. **[2026-02-21] Electron init: EPIPE guard + first-paint + preload**
   Do instead: EPIPE guard on init logging. Preload script + `getDataBaseUrl()` for iframe/Electron data fetches.

## Map & Geometry
1. **[2026-03-03] Front line style: black-white stripe — no chevrons**
   Do instead: `front-line-base` (dark) + `front-line-dash` (white). Do NOT implement HoI4 chevron variants.
2. **[2026-02-21] FRONT definition**
   Do instead: FRONT = where two hostile settlements meet (not "where brigade is present").
3. **[2026-02-23] Front ribbons: border-based only, consecutive runs**
   Do instead: No centroid-to-centroid fallback ribbons. `borderVertexKey` with 1e6 rounding. Dedupe and smooth.
4. **[2026-03-19] MAP_GEOMETRY_MASTER.md — read first when working on front lines or polygon fills**
   Do instead: Read `docs/40_reports/MAP_GEOMETRY_MASTER.md` before any polygon/front-line/geometry work. Covers: polygon topology gaps, shared arc issue, vertex snapping approach, edges_viewer diagnostic.

## User Directives
1. **[Standing] working-on.md — task continuity across compaction**
   Do instead: When context is visibly high, write `working-on.md` to project root: (1) current task, (2) files being modified, (3) next 3 steps. At session start: read and delete if exists.
2. **[Standing] Life lessons enforcement system (3 mechanisms)**
   Do instead: (A) Session start: read `docs/life_lessons.md`, flag relevant lessons. (B) Pre-commit: `/awwv_pre_commit_check` includes life-lessons compliance. (C) Daily cron: `3 6 * * *` — re-schedule each session.
3. **[Standing] Absolute paths**
   Do instead: Always use absolute paths for tool calls.
4. **[Standing] Update napkin during work**
   Do instead: Update napkin after significant changes; don't wait until session end.
5. **[2026-02-28] Maximize safe parallel execution**
   Do instead: Run independent tasks in parallel; sequence only on shared-file or dependency gates.
6. **[2026-02-25] Counterattacks are correct**
   Do instead: Captured territory SHOULD be immediately reclaimable.
7. **[2026-02-22] Replay disabled by default**
   Do instead: Only generate replay with `--video` flag.
8. **[2026-02-28] Canonical map is React+MapLibre**
   Do instead: `npm run dev:map`. Legacy map_hoi.html / tactical_map.html are archived.

## Calibration
1. **[2026-03-08] NEVER override initial OSIDs — not an option**
   Do instead: Initial OSID control from census/referendum is NEVER manually overridden. Fix engine, OOB, operations, or scenario params instead.
2. **[2026-03-14] NEVER use avoided_osids_by_faction as a calibration fix — BANNED**
   Do instead: Fix bot_corps_directives.ts target priority, OOB terrain/personnel stats, or painted targets. `avoided_osids` hides broken engine behavior. Use `osid_control_overrides` only for factual initial-control corrections.
3. **[2026-03-04] Override direction law — CRITICAL**
   Do instead: `osid_control_overrides` = fix initial UNDER-captures (factual data only, not bot suppression).
4. **[2026-03-07] HRHB-init cells CAN be fixed by RS overrides — add in isolated clusters only**
   Do instead: Add HRHB cells by isolated geographic cluster (KRAJINA only, then POSAVINA_NE only). Adding 10+ across regions causes cascade.
5. **[2026-03-08] Rear pocket consolidation: cluster-aware version (post-w20)**
   Do instead: `rear_pocket_consolidation.ts` with BFS detection. 1-3 connected same-controller enemy OSIDs, ALL external neighbors faction-controlled. Paramilitary sweep handles w0-20.
6. **[2026-03-07] Pre-planned operation target chains drive regional match rate**
   Do instead: Remaining misses are pre-planned-op/scenario-anchor bucket. Load-bearing overrides: turbe_2 enables Donji Vakuf consolidation; removing causes -3pp.
7. **[2026-03-06] Pool surplus absorbs mobilization scale changes — use initial pool lever**
   Do instead: Primary lever for initial strength is RS_JNA_INHERITANCE_BONUS and FACTION_POOL_SCALE, not mobilization scale.
8. **[2026-03-05] Combat calibration needs causality, not just territory**
   Do instead: Verify non-zero attacks and battles in `weekly_report.jsonl` before trusting control deltas.
9. **[2026-03-06] Live attribution replaces Phase I flip logs**
   Do instead: Use `control_change_attribution` in `weekly_report.jsonl` / `run_summary.json`.
10. **[2026-03-08] Timeline JSON is doctrine source of truth**
    Do instead: `apr1992.json` `doctrine_phases` overrides `FACTION_DOCTRINE_PHASES` in code. Always edit timeline JSON first.

## Invariant Assertions (n648)
1. **[2026-03-17] 5 post-pipeline assertions in war_phases.ts (138 steps)**
   Do instead: When adding code that mutates formations, political_controllers, or operations, the pipeline assertions will catch invariant violations at runtime. If an assertion fires, fix the source — never disable the assertion. Files: `assert_control_events.ts`, `assert_operation_lifecycle.ts`, `assert_formation_territory.ts`, `corps_front_sectors.ts` (assertSectorBrigadesActive + assertBrigadeReachability).

## Engine Runtime Patterns
1. **[2026-03-05] Takeover displacement off-by-one FIXED**
   Do instead: `processDisplacementTakeover` uses `currentTurn === warStartTurn + 1`. `runTurn()` increments turn BEFORE phases.
2. **[2026-03-08] Phase I/II terminology fully removed — Peace/War only**
   Do instead: No `PhaseI`, `PhaseII` identifiers. `rear_pocket_consolidation.ts` replaces deleted `consolidation_flips.ts`.
3. **[2026-03-08] Deep merging test mocks with nested state**
   Do instead: Standard `...overrides` overwrites nested structures entirely. Manually deep merge or spread inside the nested object literal.
