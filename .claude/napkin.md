# Napkin Runbook

**Location:** `.claude/napkin.md` - single runbook for this repo. Read and curate at session start. Update during work.

**Rules:** Max 10 items per category. Re-prioritize on every read (highest first). Merge duplicates, remove stale. Each entry: date + short title + "Do instead".

**Master files:** Calibration → `docs/40_reports/CALIBRATION_MASTER.md`; GUI (map + warroom) → `docs/40_reports/GUI_MASTER.md`; Warroom → `docs/40_reports/WARROOM_MASTER.md`; Real War → `docs/40_reports/REAL_WAR_MASTER.md`; Sectors → `docs/40_reports/SECTOR_MASTER.md`. Do instead: When doing calibration, GUI, warroom, sector, or realism work, read the relevant master first and update it during the session.

## Session Startup (do these EVERY session — BEFORE any work)
1. **[2026-03-13] Check crons and schedule if missing — ALWAYS (two crons)**
   Do instead: Run `CronList` at session start. Crons are session-only and auto-expire after 3 days. **Re-schedule every session.** Two required crons:
   **(A) Daily Paradox Standup** — cron `27 6 * * *`. Invokes /orchestrator to convene Paradox team. Three phases: (1) Yesterday's retrospective (good/bad/ugly from `git log --since=24h`, ledger, life lessons), (2) Fresh game analysis (CALIBRATION_MASTER, REAL_WAR_MASTER, War-or-Game assessment), (3) Today's priorities — plan big and ambitious (3-5 items a team of AI agents can accomplish). Present everything via /visual-explainer as a war room briefing board. Full prompt stored in `memory/cron_daily_standup.md`.
   **(B) Life-lessons review** — cron `3 6 * * *`. Gather 24h git activity, detect life-lesson violations, synthesize new lessons, promote/demote, generate visual report via `/visual-explainer`.

## Execution & Validation
1. **[2026-03-11] NEVER claim a fix works without running the scenario and verifying the output**
   Do instead: After any bug fix, run a fresh scenario (`npm run sim:scenario:run:40w`), then write a diagnostic script to verify the specific bug is gone. Check for related issues (e.g. other code paths that do the same wrong thing). Always verify with data, never with assumptions.
2. **[2026-03-11] One-change-then-verify calibration protocol (MANDATORY)**
   Do instead: (1) Change ONE parameter or fix ONE bug. Never bundle. (2) Run fresh 40w scenario. (3) Run comparison tool. (4) Run /war-or-game insanity check — brigade states, casualty ratios, tempo, troop strength, equipment (`composition` field). (5) Record result in CALIBRATION_MASTER.md.
3. **[2026-03-07] Classify phases by real code impact, not plan labels**
   Do instead: Before parallelizing or skipping regression, audit the task list. If a phase touches schema, IPC, bot logic, pipeline, or serialization, treat it as engine-touching even if the plan calls it UI-only.
4. **[2026-02-25] Determinism is sacred**
   Do instead: No `Math.random()`, no timestamps, no `Date.now()` in run folders. Sorted iteration via `strictCompare`. Monotonic `.run_counter` for run folders.
5. **[2026-02-21] Smoke-test triad after every change**
   Do instead: Run `tsc --noEmit`, `vitest run`, and `desktop:map:build` as standard smoke check.
6. **[2026-02-20] Fix ALL failing tests**
   Do instead: Fix all failing tests even if unrelated to current change. Standing directive.
7. **[2026-03-06] Preserve fractional run-summary metrics**
   Do instead: In scenario summary normalization, never round fields ending in `share`, `ratio`, `rate`, `tolerance`, or `deviation`.
8. **[2026-02-22] Never auto-rebaseline golden tests**
   Do instead: Keep failing baselines pending canon/data authority review. Refresh only after user/PM sign-off.
9. **[2026-02-21] Refactor-pass between phases/checkpoints**
   Do instead: After each implementation phase, run /refactor-pass and /code-simplifier on recently modified code.
10. **[2026-02-24] Scenario checkpoint lengths**
    Do instead: Use 20w/30w checkpoint runs for iteration; reserve 52w for acceptance only.

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
1. **[2026-03-13] IN PROGRESS: Sector Defense Rework — Layers A+B DONE (n668), Layer C pending**: Layer A: Distance-weighted reactive defense. Layer B: Independent sector stances (5 stances, bot AI, combat integration). Remaining: (C) Player UI (defense heat map, enhanced AARs, stance controls). Plan: `docs/40_reports/20260313_DISTANCE_WEIGHTED_REACTIVE_DEFENSE_PLAN.md`.
2. **[2026-03-13] Calibration: n668 = 89.0% area-weighted, 6/6 benchmarks PASS, RS w40 0.519**: Layers A+B complete. RS delta -22. Hash 78a9d9943486d996. 585 tests.
2. **[2026-03-11] Zero eligible attacker operations**: 58-106 ops per 40w run have zero eligible attackers. Root cause: brigade posture gate blocks when home_defense_active or combat_ineffective. Likely fix: better pre-screening in directive generation.
3. **[2026-03-12] 1 remaining disconnected brigade assignment (edge case)**: `arbih_712th_mountain` at `op:travnik:krusevo_brdo_i`. Low priority — 28→1 after n598 fix.
4. **[2026-03-12] REAL_WAR_MASTER #14: HVO Central Bosnia ghost front — DEFERRED**: 13 front edges, 0 brigades. 7 HVO brigades in disconnected enclaves. Intentionally deferred — HVO-RBiH war breaks out April 1993; these brigades activate then. Don't fix now.
5. **[2026-03-10] Donji Vakuf pocket remnant (5 OSIDs)**: 12/17 Krajina pocket OSIDs now RS; 5 remain RBiH. May need municipality priority tuning for 2KK.
6. **[2026-03-11] Drina region RS shortfall (76 vs 95)**: ~13 OSIDs are Srebrenica enclave (realistic defense). ~6 are Rogatica holdouts. May need painted target revision.
7. **[2026-03-11] Ops planning modal arrows invisible/broken**: Parked. Needs fresh investigation — likely MapLibre fill-layer issue specific to modal map instance.
8. **[2026-03-12] HVO named officer roster critically incomplete**: 20% coverage vs VRS 90%. Needed for Croat-Bosniak war phase.
9. **[2026-03-12] REAL_WAR_MASTER #15: Intra-corps density imbalance**: 16× ratios within corps. 1KK has 6 idle brigades in Banja Luka while Posavina under-manned.
10. **[2026-03-12] REAL_WAR_MASTER #3: Per-formation casualty ledger**: State-level ledger works. Formation-level `casualty_ledger` field absent — data exists but not surfaced per-brigade.

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
10. **[2026-02-24] Test fixtures: phase + referendum required**
    Do instead: Test fixtures flowing through `runTurn` or scenario runners must set `meta.phase` + referendum fields.

## Bot AI & Combat
1. **[2026-03-13] Triple-junction adjacency for BOTH grouping AND splitting (n664)**
   Do instead: `splitNonContiguousSectors` now uses `buildEdgeAdjacency` with triple-junction (Cases A/B), same as sub-segment construction. Shared-OSID was too permissive — bridged edges facing different directions at triple junctions (Zavidovići↔Kakanj). Front-edge OSIDs can belong to multiple sectors (shared territory). Brigade at shared OSID → neediest same-corps sector. Pipeline grouping and splitting MUST use compatible adjacency — using a stricter splitter over-fragments (31 sectors gotcha).
2. **[2026-03-11] RS three-phase doctrine — organic tempo decay (n579)**
   Do instead: w0-12 blitz (0.35/0.15), w12-26 sustained (0.25/0.08), w26+ consolidation (0.20/0.05). Late-war params have ZERO calibration effect. Early-war intensity is the primary lever.
3. **[2026-03-10] Enclave defense overhaul — Sarajevo holds (n524→n527)**
   Do instead: `ALWAYS_BESIEGED_ENCLAVES` forces Sarajevo strained supply. `initial_resilience=20`. `getEnclaveGarrisonPower()` adds civilian defense volume. Urban mult 2.0×. `URBAN_TANK_TERRAIN_FLOOR=1.7`. Key lesson: personnel ratio trumps multipliers — need raw volume.
4. **[2026-03-11] RBiH defensive w0-15, restrained balanced w15-56**
   Do instead: ARBiH defensive through w15, then balanced with low attack share (0.12) and negative aggression (-0.05) through w40.
5. **[2026-03-12] Operation Preparation System IMPLEMENTED**
   Do instead: `operation_preparation.ts` — 5-phase state machine (intel_gathering→force_staging→supply_check→assessment→ready). Commander personality drives tempo. Probes as sub-actions. `tickPreparation()` in pipeline. UI: `CommanderSelectionModal.tsx` + `OperationBriefingModal.tsx`. 45 tests. Player `force_launch` override. Intel-gated launch gate in `bot_corps_directives.ts`.
6. **[2026-03-08] Graz Accords / Local Truces + cold fronts**
   Do instead: `src/sim/local_truces.ts` — fires at week 4. Corps-pair truce (Herzegovina) + Kiseljak OSID exclusion. NOT covered: Posavina, central Bosnia outside Kiseljak, Jajce. Cold fronts: `isColdFront()` exempts from attrition/bombardment.
7. **[2026-03-07] Pre-planned VRS operations (5 corps only) + JNA ghost Kupres**
   Do instead: `injectPrePlannedOperations(state)` sets corps to `offensive` PERMANENTLY. Only original 5 corps. 2KK has NO pre-planned op.
8. **[2026-03-10] Cross-corps sector assignment must stay hard-blocked**
   Do instead: In `classifyBrigadesByTerritory`, never assign a brigade to another corps sector. All fallback paths must preserve brigade corps ownership.
9. **[2026-02-25] Aggression scoring: additive + multiplicative**
   Do instead: Flat additive (`aggression_modifier × 120`) PLUS multiplicative (`× (1 + aggression_modifier)`).
10. **[2026-03-13] Flat reserve pooling hides corps organizational structure**
    Do instead: When a higher-level system (corps) makes positioning decisions, the lower-level system (combat) MUST respect those decisions. If combat treats all reserves as interchangeable (`sectorReserves = totalPower - physicalPower`), corps home-affinity assignment is wasted. Per-entity contribution with spatial weighting (distance + home bonus) is required for non-uniform defense.

## Officer Architecture
1. **[2026-03-08] Named officers = corps and above only; brigades use abstracted officer_quality**
   Do instead: Named officers command corps and operations. Brigades have `officer_quality` [0,1] → `getBrigadeOfficerMod()`. Never suggest named officer assignment for brigades.
2. **[2026-03-08] distinction_potential replaces pre-awarded historical_decorations**
   Do instead: Units start with `distinction_potential: 'tier_1'|'tier_2'|'tier_3'`. Decorations EARNED during run. `historical_decorations` and `honor` fields stripped from OOB.
3. **[2026-03-08] Army HQs seeded with initial_officer_quality + cohesion**
   Do instead: `vrs_main_staff` oq=0.75 coh=72, `hvo_main_staff` oq=0.50 coh=65, `arbih_general_staff` oq=0.12 coh=38 morale=45.

## OOB & Brigade Systems
1. **[2026-03-12] Per-brigade personnel caps via `deriveMaxPersonnel()` (n626)**
   Do instead: Brigade max_personnel derived from equipment_class + faction. Replaces flat 3000 cap. Troop strength still emerges from pool demographics, mobilization scales, exhaustion, and FACTION_POOL_SCALE. RS JNA bonus=10k.
2. **[2026-03-05] April 1992 startup: patch both OOB entry + recruitment engine; home_osid must be friendly**
   Do instead: Patch both `oob_early_war_entry.ts` and `recruitment_engine.ts`. Choose starting OSIDs that are already friendly-controlled.
3. **[2026-03-02] VRS equipment decay**
   Do instead: `equipment_decay` field on FormationState. Applied as multiplier in `getEquipmentRatio()`. Starts w26, 0.5%/week, floor 0.60.
4. **[2026-03-02] Elite loan lifecycle**
   Do instead: `elite_loan.ts` — 6w loan, 4w cooldown, forced recall 30% casualties or morale <35.
5. **[2026-03-07] Phase E municipality support stays asymmetric and pool-constrained**
   Do instead: Faction-distinct effects: RBiH=weapons_shipment, RS=staff_priority, HRHB=croatian_support_package. One target, one turn.

## Sectors & Operations
1. **[2026-03-12] consolidateCrossCorpsFronts must respect osidToCorps (n624 Herzegovina/Sarajevo gotcha)**
   Do instead: Step 3b majority-count consolidation can steal territory from correct corps. The BFS home-seed mapping is authoritative — consolidation must protect edges where `osidToCorps` agrees with the minority corps. Without this, a larger connected front (Herzegovina) absorbs a smaller correct corps's edges (SRK Sarajevo).
2. **[2026-03-12] Corps-driven brigade assignment with home-municipality affinity**
   Do instead: `classifyBrigadesByTerritory`: Phase 1=frontline, Phase 2a=home-municipality affinity, Phase 2b=corps distributes by need. MAX_TERRITORY_OSIDS cap removed. `equalizeSectorDensity` removed.
3. **[2026-03-09] Every brigade stays in its sector — no reserve cap**
   Do instead: Reserve cap REMOVED. Corps needs full visibility of all manpower. `deduplicateBrigadesAcrossSectors` prevents cross-sector duplicates.
4. **[2026-03-09] Mech/moto staging + priority for offensive ops**
   Do instead: `getEquipmentOffensivePriority()` (mechanized=3, motorized=2, mountain=1). Staging pass scans reserves for mech/moto. Mech/moto are offensive tools, not line troops.
5. **[2026-03-07] Sector intel replaces recon_intelligence (DELETED) — fog LIVE**
   Do instead: `sector_intel.ts`. GUI fog-of-war LIVE. `recon_intelligence.ts` is DELETED — do not reference it.
6. **[2026-03-07] Sector orders + OPSEC are sector-state, not brigade hacks**
   Do instead: `sector_stance_orders` → `applySectorStanceOrders()` → `brigade_posture_orders`. OPSEC in `state.opsec_sectors`.
7. **[2026-03-07] Sector-only operation creation — no catalog ops, no rear dump**
   Do instead: Operations launch ONLY from `generateCorpsDirectives` sector offensive path. `MAX_PARTICIPATING_BRIGADES=12`. Only sector-assigned brigades participate.
8. **[2026-03-06] Proof lane + eligible-attacker boundary**
   Do instead: Run `tests/scenario_vrs_operation_proof.test.ts` before wide calibration work.
9. **[2026-03-05] Opening operations: explicit rosters + named ops own brigades**
   Do instead: For April 1992 VRS opening ops, use explicit `participating_brigades`, `sector_id`, `staging_osid`.

## GUI / HoI Map
1. **[2026-03-11] GameStateAdapter is the single chokepoint — check paths FIRST**
   Do instead: Fields live under namespaced paths (`state.military.*`, `state.displacement.*`). Wrong path silently returns `undefined`. `departedByOsid` must accumulate `displaced+killed+fled_abroad`. See `memory/gui_debugging.md`.
2. **[2026-03-07] Settlement panel: 3 horizontal tabs, nation labels, current ethnic**
   Do instead: Overview | Military | Orders & events. `ethnicityOrFactionToNationLabel`. `getCurrentEthnicForOsid`. See TACTICAL_MAP_SYSTEM §13.2.
3. **[2026-03-07] Command briefing routing lives in `App`, not the toolbar**
   Do instead: Mount briefing as thin overlay in `App.tsx`, fed by `GameStateAdapter.commandBriefing`.
4. **[2026-03-07] Detail panels drill right; App owns precedence**
   Do instead: Right-side panel rail: overview → primary → secondary. `App.tsx` mounts from one deterministic selector.
5. **[2026-03-08] Warroom init races: bind Electron bridge before long async loads**
   Do instead: Assign `window.awwv` / `this.desktopBridge` before asset or map-loading awaits.
6. **[2026-03-08] Warroom image target: archival photograph, not AI concept art**
   Do instead: "Real photographed room, not AI art." Keep visible year out of baked art.
7. **[2026-03-06] Tactical fog contract is `fogOfWar`, not raw sector intel**
   Do instead: Derive player-visible fog in `GameStateAdapter.ts` from `sector_intel` + sectors + friendly brigade positions.
8. **[2026-03-07] Officer display: use OfficerProfile component, never raw stat numbers**
   Do instead: All officer displays use `OfficerProfile` (archetype, pips, origin badge, combat record).
9. **[2026-03-01] Map load: validate + defer parse + timeout**
   Do instead: Validate save schema. `parseGameState` unwraps `{ state }`/`{ gameState }`. Parse in requestIdleCallback. 25s timeout.

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
2. **[2026-03-04] Override direction law — CRITICAL**
   Do instead: RS `avoided_osids` = fix RS OVER-captures. RS `osid_control_overrides` = fix RS UNDER-captures. Confusing them causes -0.7pp regression.
3. **[2026-03-07] HRHB-init cells CAN be fixed by RS overrides — add in isolated clusters only**
   Do instead: Add HRHB cells by isolated geographic cluster (KRAJINA only, then POSAVINA_NE only). Adding 10+ across regions causes cascade.
4. **[2026-03-08] Rear pocket consolidation: cluster-aware version (post-w20)**
   Do instead: `rear_pocket_consolidation.ts` with BFS detection. 1-3 connected same-controller enemy OSIDs, ALL external neighbors faction-controlled. Paramilitary sweep handles w0-20.
5. **[2026-03-07] Pre-planned operation target chains drive regional match rate**
   Do instead: Remaining misses are pre-planned-op/scenario-anchor bucket. Load-bearing overrides: turbe_2 enables Donji Vakuf consolidation; removing causes -3pp.
6. **[2026-03-06] Pool surplus absorbs mobilization scale changes — use initial pool lever**
   Do instead: Primary lever for initial strength is RS_JNA_INHERITANCE_BONUS and FACTION_POOL_SCALE, not mobilization scale.
7. **[2026-03-05] Combat calibration needs causality, not just territory**
   Do instead: Verify non-zero attacks and battles in `weekly_report.jsonl` before trusting control deltas.
8. **[2026-03-06] Live attribution replaces Phase I flip logs**
   Do instead: Use `control_change_attribution` in `weekly_report.jsonl` / `run_summary.json`.
9. **[2026-03-06] Quiet weeks are warnings, not automatic causality failures**
   Do instead: Invalidate `zero_battles` only when attack orders existed but resolved to no battles.
10. **[2026-03-08] Timeline JSON is doctrine source of truth**
    Do instead: `apr1992.json` `doctrine_phases` overrides `FACTION_DOCTRINE_PHASES` in code. Always edit timeline JSON first.

## Invariant Assertions (n648)
1. **[2026-03-12] 5 post-pipeline assertions in war_phases.ts (118 steps)**
   Do instead: When adding code that mutates formations, political_controllers, or operations, the pipeline assertions will catch invariant violations at runtime. If an assertion fires, fix the source — never disable the assertion. Files: `assert_control_events.ts`, `assert_operation_lifecycle.ts`, `assert_formation_territory.ts`, `corps_front_sectors.ts` (assertSectorBrigadesActive + assertBrigadeReachability).

## Engine Runtime Patterns
1. **[2026-03-05] Takeover displacement off-by-one FIXED**
   Do instead: `processDisplacementTakeover` uses `currentTurn === warStartTurn + 1`. `runTurn()` increments turn BEFORE phases.
2. **[2026-03-08] Phase I/II terminology fully removed — Peace/War only**
   Do instead: No `PhaseI`, `PhaseII` identifiers. `rear_pocket_consolidation.ts` replaces deleted `consolidation_flips.ts`.
3. **[2026-03-08] Deep merging test mocks with nested state**
   Do instead: Standard `...overrides` overwrites nested structures entirely. Manually deep merge or spread inside the nested object literal.
