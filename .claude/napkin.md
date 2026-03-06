# Napkin Runbook

**Location:** `.claude/napkin.md` - single runbook for this repo. Read and curate at session start. Update during work.

**Rules:** Max 10 items per category. Re-prioritize on every read (highest first). Merge duplicates, remove stale. Each entry: date + short title + "Do instead".

## Execution & Validation
1. **[2026-02-25] Determinism is sacred**
   Do instead: No `Math.random()`, no timestamps, no `Date.now()` in run folders. Sorted iteration via `strictCompare`. Monotonic `.run_counter` for run folders.
2. **[2026-02-21] Smoke-test triad after every change**
   Do instead: Run `tsc --noEmit`, `vitest run`, and `desktop:map:build` as standard smoke check.
3. **[2026-02-20] Fix ALL failing tests**
   Do instead: Fix all failing tests even if unrelated to current change. Standing directive.
4. **[2026-02-22] Never auto-rebaseline golden tests**
   Do instead: Keep failing baselines pending canon/data authority review. Refresh only after user/PM sign-off per `TEST_BASELINE_STRATEGY.md`.
5. **[2026-02-21] Refactor-pass and code-simplifier between phases/checkpoints**
   Do instead: After each implementation phase or between plan checkpoints, run /refactor-pass (dead code, duplication, over-engineered stubs, simplify conditionals; then tsc + vitest) and /code-simplifier on recently modified code. Plans (e.g. officers-phase-e-implementation) must instruct this between tasks.
6. **[2026-02-13] Verify edits + close handoffs with evidence**
   Do instead: After edits, verify with file reads + `git diff`. After roadmap or handoff, close with run evidence + decision memo + cross-link.
7. **[2026-03-06] Preserve fractional run-summary metrics**
   Do instead: In scenario summary normalization, never round fields ending in `share`, `ratio`, `rate`, `tolerance`, or `deviation`. Benchmark fractions are historical-fit evidence, not counts.
8. **[2026-02-24] Scenario checkpoint lengths**
   Do instead: Use 20w/30w checkpoint runs for iteration; reserve 52w for acceptance only.
9. **[2026-02-11] Preserve shared type exports during refactor**
   Do instead: Keep `export type { ... }` statements; removing them breaks downstream consumers silently.

## Shell & Platform
1. **[2026-03-05] Existing-dir file generation: prefer `apply_patch` or script files**
   Do instead: Use `apply_patch` for manual edits. For bulk/generated content, write a short script file and run it. Avoid helper workflows that recreate existing directories or rely on fragile heredocs.
2. **[2026-03-05] `rg.exe` may be blocked in PowerShell**
   Do instead: Try `rg` first for fast scans. If PowerShell returns access denied, fall back to `Get-ChildItem` + `Select-String` instead of burning time on shell debugging.
3. **[2026-02-07] Windows shell separator**
   Do instead: On Windows PowerShell, use `;` not `&&` to chain commands.
4. **[2026-02-07] tsx can hang on Windows**
   Do instead: Use `node_modules/.bin/tsx` directly (not `npx tsx`). Prefer `npm run test:vitest` over `npx tsx --test`.
5. **[2026-02-28] Root tsc vs nested UI package**
   Do instead: When `npx tsc --noEmit` at root fails on JSX config, verify changed UI package with its own build (`src/ui/map: npm run build`). Report root failures as pre-existing unless introduced by your edits.
6. **[2026-02-13] Validate paths with glob before use**
   Do instead: Stale paths break silently. Skills at `.claude/skills/*` — validate with glob.

## Imports & Build
1. **[2026-02-07] Martinez ESM import**
   Do instead: `import * as martinez from 'martinez-polygon-clipping'` (not default import).
2. **[2026-02-07] JSTS deep imports**
   Do instead: Import from `jsts/org/locationtech/jts/io/*.js` (not package root).
3. **[2026-02-07] Browser build: extract Node imports**
   Do instead: For browser-reachable code, extract Node-only imports to `*_utils.ts` files.
4. **[2026-02-28] Vitest .js import path parity**
   Do instead: For test imports using `.js` paths into `src`, ensure target base path exists. If module moved, repoint import.

## Simulation Engine
1. **[2026-03-03] Supply reserves: gated + pocket threshold + isolated source + heavy weapon drain**
   Do instead: All reserve logic gated by `state.meta.supply_reserves_enabled`. Constants: `supply_reserve_constants.ts`. Module: `supply_reserves.ts`. Siege drain: `SIEGE_MIN_POCKET_SIZE=8` — components below this get counter frozen at 1. Isolated source detection: `findHeartlandComponent()` in `supply_state_derivation.ts` — supply sources in disconnected pockets (Sarajevo, Bihać) produce "strained" not "adequate". Heavy weapon maintenance: `HEAVY_MAINTENANCE_PER_WEAPON=0.001` — per-tank/artillery drain on heavy_munitions_reserve.
2. **[2026-03-01] OSID/SID mismatch — never use getEffectiveSettlementSide for control**
   Do instead: `political_controllers` keyed by OSIDs in war phase. Use `buildMunControlFromOsids()` or `buildMunDominantController()` for municipality control. `getEffectiveSettlementSide()` does SID lookup → always null → false encirclement.
3. **[2026-03-01] Displacement: per-OSID census, non-overlapping buckets, static routing**
   Do instead: Use `getOsidCensusPopulation(osidRec)` and `getOsidCensusHostileShare(osidRec, faction)`, not mun averages. `displaced_out` = routed amount. `lost_population` = killed + fled_abroad + unrouted overflow. Set `cumulative_displaced = displacementAmount` after initial fire (prevents double-counting). Routing tables in `displacement_routing_data.ts` are static (47 sub-regions × 3 ethnicities). Don't add `state` param to route lookup.
4. **[2026-02-24] OSID-keyed political_controllers init + load migration**
   Do instead: When init fills by OSID, do NOT call `promotePoliticalControllersToOsid`. Check `isPoliticalControllersAlreadyOsidKeyed()` first. On load: `migratePoliticalControllersToOsidIfNeeded` only for canonical SIDs (skip test fixtures S1/S2).
5. **[2026-02-28] Operational control: majority then plurality**
   Do instead: Assign faction by ethnic majority (>50%), else plurality. Not "first ≥40%" — that made Vozuća RBiH despite 54.5% Serb.
6. **[2026-03-01] Test fixtures: phase + referendum required**
   Do instead: Test fixtures flowing through `runTurn` or scenario runners must set `meta.phase` (`peace`/`war`) + referendum fields. Missing phase hard-fails. `applyConsolidationFlips` returns 0 flips when `meta.phase !== 'war'`.
7. **[2026-02-22] Pipeline step no-ops for missing data**
   Do instead: When operational data unavailable, log and skip OSID steps safely rather than crashing.
8. **[2026-03-01] Corps sector sub_segment IDs ≠ front segment IDs**
   Do instead: `assigned_front_ids` in CorpsDirective MUST use front_id format, NOT `subseg:*`. Sectors for target filtering only. Using subseg IDs breaks front_assignment.ts matching.

## Bot AI & Combat
1. **[2026-02-25] RBiH general_defensive through week 56**
   Do instead: ARBiH must remain `general_defensive` through week 56. "Balanced" before w56 allows premature counterattacking.
2. **[2026-03-06] RS stays offensive permanently — organic tempo decay (n159 audit)**
   Do instead: RS has 2 doctrine phases (both offensive). No stance switch to balanced/defensive. Tempo decay emerges organically from fatigue (+2/battle, recovery every 2 turns), supply drain (MAINTENANCE_DRAIN 0.045/formation), and entrenchment wall (sqrt curve). RS_EARLY_WAR_END_WEEK=20 still marks reduced aggression (0.15→0.05) and max_attack_share (0.28→0.22). Weekly RS attacks decline 8→1 by w40.
3. **[2026-03-04] Morale retreat resistance: per-faction floor (updated)**
   Do instead: `getMoraleResistFloor()`: RBiH=**50**, RS=70, HRHB=**60**. Morale ≥ floor + costly_victory → absorb. Decisive always retreats. ARBiH homeland last stand (≥50% Bosniak co-ethnic) also absorbs 'victory' outcomes regardless of morale. Added in n439 session.
4. **[2026-02-25] Aggression scoring: additive + multiplicative**
   Do instead: Flat additive (`aggression_modifier × 120`) PLUS multiplicative (`× (1 + aggression_modifier)`). Multiplier alone ineffective on low base scores.
5. **[2026-02-22] Pioneer attack seeding**
   Do instead: First brigade seeds concentration with 'repulsed' outcome; subsequent join via `estimateConcentratedOutcome()`.
6. **[2026-02-24] CorpsDirective must be complete**
   Do instead: Include `offensive_targets`, `hold_osids`, `avoid_osids`, `max_attackers_per_target`, `reserve_fraction`, `min_attack_outcome`, `aggression_modifier`.
7. **[2026-03-05] Pre-planned VRS operations (5 corps only — 2KK deferred)**
   Do instead: `injectPrePlannedOperations(state)` sets corps to `offensive` PERMANENTLY. Only the original 5 corps (EBK/Drina/SRK/Herzegovina/1KK). Adding 2KK (Operation Kupres) causes −6.7pp regression — 2KK offensive stance disrupts Krajina/POSAVINA_NE force allocation. Kupres captured organically via Kalesija redirect (n466). Use organic bot + overrides for 2KK.
8. **[2026-02-25] sidToMun map preservation**
   Do instead: Preserve `canonicalSidToMun` in scenario_runner.ts. Corruption prevented ALL 217 mandatory brigades from spawning.
9. **[2026-03-06] Brigade discipline: hard block + combat fatigue (n159 audit rewrite)**
   Do instead: `bot_brigade_ai_osid.ts` hard block — brigades ONLY attack `effectiveDirective.offensive_targets`, sole exception: counter-attacks. Frontier pressure mechanic REMOVED. `RESERVE_PER_EDGE_CAP=0.07` (was 0.5) → ~1 reserve per sector. Combat fatigue: attacker +2, defender +1 per battle (cap `FATIGUE_MAX=30` from `formation_constants.ts`); recovery -1 every 2 turns, +0.5/turn frontline duty via `applyFatigueRecovery()`. Fatigue degrades combat power: `getFatigueMult()` in `combat_math.ts` — attackers ×0.6-1.0, defenders ×0.75-1.0 at max fatigue.
10. **[2026-03-04] Vienna Declaration / Local Truces (RS-HRHB non-aggression)**
    Do instead: `src/sim/local_truces.ts` — fires at week 4; sets `state.vienna_declaration_turn`. Bot filters RS↔HRHB truce-partner OSIDs from `offensive_targets`, except {brod, derventa, odzak, bosanski_samac, orasje, jajce}. Player truce-break: `check-truce-break` step; sets `state.truce_broken_turn[faction]`, opponent gets +0.25 aggression for 6 turns.

## OOB & Brigade Systems
1. **[2026-03-06] Personnel ceilings REMOVED; organic troop strength via pool system**
   Do instead: No hardcoded caps. Personnel emerges from pool demographics, mobilization scales (`ongoing_mobilization.ts`: RBiH=0.10, RS=0.12, HRHB=0.29), exhaustion (MILITARY_AGE_MALE_FRACTION=0.28 denominator, threshold 0.25 half-rate, cap 0.50), and FACTION_POOL_SCALE (RBiH=0.18, RS=0.25, HRHB=1.60). RS JNA bonus=10k. n191 result: RS=102.6k/110.1k, RBiH=121.0k/175.4k, HRHB=41.5k/49.8k (w40/w80).
2. **[2026-03-02] Decoration system replaces honor**
   Do instead: `getDecorationAtkMult()` and `getDecorationDefBonus()` in `decoration_evaluator.ts` — replace direct honor lookups. Falls back to legacy honor when no decorations. Three tiers per faction. Pipeline step `evaluate-brigade-decorations`.
3. **[2026-03-02] Brigade history recorder wired after each battle**
   Do instead: `recordAttackerEngagements()` + `recordDefenderEngagement()` called in `attack_resolution_osid.ts` after morale effects. Uses outer-scope `currentTurn` (line 246). FIFO cap 200 entries.
4. **[2026-03-02] VRS equipment decay**
   Do instead: `equipment_decay` field on FormationState (NOT EquipmentState.condition_pct — doesn't exist). Applied as multiplier in `getEquipmentRatio()` in `combat_math.ts`. Starts w26, 0.5%/week, floor 0.60.
5. **[2026-03-02] Elite loan lifecycle**
   Do instead: `elite_loan.ts` — 6w loan, 4w cooldown (≥ not >), forced recall 30% casualties or morale <35, permanent degradation <50% personnel. Pipeline step `elite-loan-lifecycle`.
6. **[2026-03-02] OOB data: 247 brigades total**
   Do instead: After rework: RBiH 126, RS 80, HRHB 41. Removed 13 dupes, added 16 new. HVO Guard brigades at w80-88. `historical_decorations` on 46+ brigades. `is_elite` on guards + 65th.
7. **[2026-03-02] War stories (end-of-game narrative)**
   Do instead: `generateWarStories(state)` in `war_stories.ts`. 6 arcs: veteran/bloodied/shattered/risen/destroyed/garrison. Deterministic templates, no randomness. Not yet wired into final save JSON.
8. **[2026-03-05] April 1992 startup: patch both OOB entry + recruitment engine; home_osid must be friendly**
   Do instead: Patch both `src/scenario/oob_early_war_entry.ts` and `src/sim/recruitment_engine.ts` — legacy OOB path alone won't survive real scenario startup. Choose brigade starting OSIDs that are already friendly-controlled; enemy-held `home_osid` causes spread/re-homing and the intended opening operation won't launch from there.

## Sectors & Operations
1. **[2026-03-06] Proof lane + eligible-attacker boundary**
   Do instead: Before wide calibration work, run `tests/scenario_vrs_operation_proof.test.ts` / `data/scenarios/apr1992_vrs_operation_proof_4w.json` to prove one VRS opening op can attack, battle, and advance. In combat-causality, treat `execution_without_eligible_attackers` as a separate root-cause boundary from `execution_without_attack_orders`.
2. **[2026-03-05] `sector_attack` phase timing + no-progress budget**
   Do instead: `src/sim/combat/sector_offensive.ts` owns phase advances — `corps_command.ts:advanceOperations()` must skip `sector_attack` ops. If execution produces no objective attempt, treat it as failure/stalemate in `updateSectorOffensiveResults()` so the op ends rather than hanging.
3. **[2026-03-06] Sector rearrangement + maneuver interpretation**
   Do instead: Keep `rearrangeSectorsForCorps()` + `concentrateSectorsForOffensive()` in `generateCorpsDirectives()`. Execution-phase ops with `brigade_movement_orders` but zero attack orders are still maneuvering — only true inert turns count as `execution_without_attack_orders`. Planning ends once one full turn elapsed and participants are staged or at friendly approach positions.
4. **[2026-03-01] corps_id from tags, not field**
   Do instead: Use `getFormationCorpsId(f)` from `corps_sector_partition.ts`. Brigade corps stored in tags (`corps:vrs_1st_krajina`), not `f.corps_id`. Applies everywhere — sectors, directives, and operations.
5. **[2026-03-01] Sector exempt corps**
   Do instead: arbih_general_staff, vrs_main_staff, hvo_general_staff (army reserves) + hvo_central_bosnia (Bosniak-Croat conflict) — don't assign their brigades to front sectors.
6. **[2026-03-07] Sector pipeline (updated — no cross-pocket transfers)**
   Do instead: `buildMultiSectorsForCorps()`: findSubSegments → mergeUndersized → splitOversized → buildSectors → Phase1E split → dedup → **splitNonContiguousSectors** (BFS friendly OSIDs) → assignInterior → **assignOrphanedBrigadesToFaction** (own-corps + friendly-territory BFS only) → **redistributeExcessReserves** (per-corps, skip empty sectors) → **ensureMinimumSectorCoverage** (friendly-territory BFS, connectivity-checked reserve promotion). **Invariants**: no cross-pocket transfers; orphans to own-corps sectors only; reserves redistributed within same corps only.
7. **[2026-03-07] Sector intel replaces recon_intelligence (DELETED) — fog LIVE**
   Do instead: Use `sector_intel.ts` / `sector_intel_constants.ts`. `derive-sector-intel` pipeline step. Confidence model, recon-by-force, bot target weighting. GUI fog-of-war is LIVE: `GameStateAdapter` derives `fogOfWar` from `sector_intel` + `corps_front_sectors`; `buildFogOfWarGeoJSON` renders it; `MapContainer` toggles via `fogVisible`. `ReconIntelligenceView` + `reconIntelligence` field fully removed. `recon_intelligence.ts` is DELETED — do not reference it.
8. **[2026-03-05] Opening operations: explicit rosters + named ops own brigades**
   Do instead: For April 1992 VRS opening ops, use explicit `participating_brigades`, `sector_id`, and `staging_osid`. If a brigade is in `active_operation.participating_brigades`, it routes through operation planning/execution/recovery first — `home_defense_active`, reserve logic, or generic corps targeting cannot retake control until `active_operation` is cleared.
9. **[2026-03-05] Pre-planned ops: own-corps BFS + tag-derived corps**
   Do instead: In `pre_planned_operations.ts`, filter brigade participation with `getFormationCorpsId(...)` not `formation.corps_id`. Pre-planned VRS operations: 5 original corps only (EBK/Drina/SRK/Herzegovina/1KK). Adding 2KK caused −6.7pp regression — use organic bot + overrides for 2KK instead.

## GUI / HoI Map
1. **[2026-03-06] Tactical fog contract is `fogOfWar`, not raw sector intel**
   Do instead: Derive player-visible fog in `GameStateAdapter.ts` from `sector_intel` + sectors + friendly brigade positions, then render `LoadedGameState.fogOfWar`. Do not wire map layers directly to raw engine intel structures.
2. **[2026-03-01] Map load: validate + defer parse + timeout**
   Do instead: Validate save (schema, meta.turn, formations/political_controllers shape). `parseGameState` unwraps `{ state }`/`{ gameState }`, treats `phase_ii` as war, accepts `formations` as object or array. Parse in requestIdleCallback (~150ms). 25s load timeout in toolbar. Show loadError on failure/timeout.
3. **[2026-02-28] Map overlay poll: check sources first**
   Do instead: Call getSource() before buildControlGeoJSON/buildFrontLinesGeoJSON. Otherwise 500ms poll freezes app.
4. **[2026-03-01] Formation icon + setData: defer to idle**
   Do instead: Run ensureFormationIcons and setData in requestIdleCallback (~400ms), not in overlay rAF chain. Cancel in cleanup.
5. **[2026-02-28] Selection panel: inline styles for positioning**
   Do instead: Use inline styles (position, right, top, zIndex, direction: ltr) so Tailwind/purge/RTL cannot override. `?showPanel=1` for dev layout verification.
6. **[2026-03-05] Active GUI path only — avoid saved mirror files**
   Do instead: Edit `src/ui/map/components/*` and `src/ui/map/map/*` for live behavior. Treat `src/ui/map/saved/*` as legacy snapshots unless explicitly migrating.
7. **[2026-03-05] Map mode shortcuts must match toolbar labels**
   Do instead: Keep `useKeyboardShortcuts` key mapping synchronized with `MapModeToolbar` mode badges (`1`-`5`: political/ethnic/supply/pressure/density).
8. **[2026-03-05] Staged order arrowheads are fill polygons, not glyph text**
   Do instead: Pulse staged heads via `fill-opacity` (`attack-arrows-heads-staged`, `movement-arrows-heads-staged`) and avoid legacy `text-opacity` writes.
9. **[2026-03-06] Briefing panels: prefer stacked accordions over tabs**
    Do instead: Use `AccordionHeader` for unified vertical briefing views in `CorpsFrontPanel` and `OOBSidebar` to maintain situational awareness. Review for unused `collapsed` state when refactoring.
10. **[2026-03-06] Operation ownership overrides UI home-defense lockout**
    Do instead: In `FormationDetail.tsx`, if a brigade appears in `operations[].participating_brigade_ids`, allow offensive posture controls even when `home_defense_active` is true.

## Desktop & Electron
1. **[2026-03-02] One map app: desktop uses dev when running**
   Do instead: Single codebase `src/ui/map/`. When `npm run dev:map` is running, Electron's get-map-server-url tries ports 3002–3005 and uses the first that serves index.html so the in-app map is the dev map. Otherwise desktop serves built bundle from dist/tactical-map. No second "player-facing" map.
2. **[2026-03-03] Desktop map: prefer HTTP + cache clear + version badge**
   Do instead: showTacticalMapScene() re-queries getMapServerUrl() so we never use awwv fallback if map server is ready. createWindow() calls session.clearCache() so iframe gets fresh bundle. TopToolbar shows "map HH:MM" when embedded (__MAP_BUILD_TIME__) to confirm which bundle loaded.
3. **[2026-03-03] Desktop map: HTTP server + routes**
   Do instead: Map and warroom load assets from `http://127.0.0.1:<port>/...`; MapLibre blob workers do not work under awwv://. Server started in `electron-main.cjs startMapServer()`. Serves `data/source` and `data/runs`; path-traversal guard and .json-only for runs.
4. **[2026-03-03] Desktop map build output**
   Do instead: Map Vite build must output to `dist/tactical-map` for Electron; outDir in src/ui/map/vite.config.ts.
5. **[2026-03-03] Map interaction layers: bind when present**
   Do instead: Bind interactions (control, ethnic, density, front-edges) when layers exist; MapContainer uses 400ms delay after loadedGameState before useMapInteractions so layers are in style.
6. **[2026-02-21] Electron init: EPIPE guard + first-paint + preload**
   Do instead: Add EPIPE guard on init logging. `warroom-scene-hidden` for menu, `warroom-desk-hidden` for maps. Use Preload script + `getDataBaseUrl()` for iframe/Electron data fetches.
7. **[2026-02-22] IPC read-only queries**
   Do instead: Movement/combat preview as read-only (`query-*`) IPC handlers. Compute from deserialized state without mutating.
8. **[2026-02-21] Corps staging: accept all formation kinds**
   Do instead: `stageCorpsFrontOrder` and `stageCorpsAttackAxisOrder` must accept `corps_asset` and `army_hq`.

## Map & Geometry
1. **[2026-03-03] Front line style: black-white stripe — no chevrons**
   Do instead: Front style = `front-line-base` (dark) + `front-line-dash` (white dash). User confirmed keep as-is. Do NOT propose or implement HoI4 chevron/barbed-wire variants.
2. **[2026-02-21] FRONT definition**
   Do instead: FRONT = where two hostile settlements meet (not "where brigade is present"). Assign units after segment length/name.
3. **[2026-02-23] Front ribbons: border-based only, consecutive runs**
   Do instead: No centroid-to-centroid fallback ribbons — they create dark rectangular artifacts. Collect shared vertices as consecutive runs along A's ring; one ribbon per run to prevent zig-zag. Use `borderVertexKey` with 1e6 rounding. Dedupe and smooth border runs before storing.
4. **[2026-02-21] Front edges: 2D/3D single source**
   Do instead: Both renderers read persisted `front_edges` from `LoadedGameState`/`ViewerSave`. `front_pressure` drives thickness/opacity.
5. **[2026-02-07] Voronoi: post-merge validation**
   Do instead: After boolean ops, add post-merge coverage/overlap validation per mun1990.
6. **[2026-02-22] Split-muni audit before rebuild**
   Do instead: Run `npm run map:audit:split-muni-duplicates` before any map rebuild.

## User Directives
1. **[Standing] Absolute paths**
   Do instead: Always use absolute paths for tool calls.
2. **[Standing] Update napkin during work**
   Do instead: Update napkin after significant changes; don't wait until session end.
3. **[2026-02-28] Maximize safe parallel execution**
   Do instead: Run independent tasks in parallel; sequence only on shared-file or dependency gates.
4. **[2026-02-28] Canon docs get implementation notes on tech changes**
   Do instead: When stack changes (e.g. Canvas→MapLibre), add implementation notes in planning/spec doc. Keep aesthetic authority doc referenced from canon.
5. **[2026-02-25] Counterattacks are correct**
   Do instead: Captured territory SHOULD be immediately reclaimable. Counterattacks are mechanically correct.
6. **[2026-02-22] Replay disabled by default**
   Do instead: Only generate replay with `--video` flag (saves 13.6GB).
7. **[2026-02-28] Canonical map is React+MapLibre**
   Do instead: `npm run dev:map`. Legacy map_hoi.html / tactical_map.html are archived.
8. **[2026-03-02] ZoC fully removed**
   Do instead: ZoC deleted. Movement via `brigade_movement_orders.ts` / `apply-brigade-movement`. Defense via `local_front_defense.ts` density. AoR legacy also fully removed (R1–R5, 2026-03-04) — no dead AoR code remains.

## Calibration
1. **[2026-03-07] ATH n65=99.2%; troop strength n191 calibrated (strategic reserve + faction surge)**
   Do instead: ATH 40w = 99.2% (n65, commit a689d83). 171 overrides. 7 permanent mismatches. Troop strength (n191, w40/w80): RS=102.6k/110.1k ✓, RBiH=121.0k/175.4k ✓, HRHB=41.5k/49.8k ✓. Scales: ongoing_mobilization RBiH=0.10/RS=0.12/HRHB=0.29; pool_population HRHB=1.60; RS JNA bonus=10k. Faction-differentiated surge: VRS [2.0,1.8,1.3,1.1,1.0,0.6], ARBiH [2.8,2.2,1.3,0.8,0.45,0.3], HVO [2.5,2.0,1.4,1.0,0.6,0.4]. Strategic reserve draw rates: RS=0.25, HRHB=0.25, RBiH=0.02.
2. **[2026-03-06] Pool surplus absorbs mobilization scale changes — use initial pool lever**
   Do instead: If faction pool has large surplus at w40 (RS=27k, HRHB=25k), reducing FACTION_MOBILIZATION_SCALE barely moves committed brigade personnel (1-2% drop for 12% scale cut). Primary lever for initial strength is RS_JNA_INHERITANCE_BONUS and FACTION_POOL_SCALE. For RS long-run, large scale cuts (0.17→0.12) combined with JNA reduction are needed to bring into band. HRHB POOL_SCALE=1.60 restores ~40k target.
3. **[2026-03-05] Combat calibration needs causality, not just territory**
   Do instead: Before trusting control deltas, verify non-zero attack orders and non-zero battles in `weekly_report.jsonl`, then separate combat flips from consolidation, drift, and init overrides. Update `docs/40_reports/CALIBRATION_MASTER.md` during the session. Treat `n104` as partial recovery only: combat restored (`53` orders / `53` battles) but still invalid because `24` execution-phase operations emitted no attack orders.
4. **[2026-03-06] Live attribution replaces Phase I flip logs**
   Do instead: For current scenario runs, use `control_change_attribution` in `weekly_report.jsonl` / `run_summary.json`. `control_events.jsonl` was a leftover Phase I artifact and is no longer the live harness contract.
5. **[2026-03-06] Quiet weeks are warnings, not automatic causality failures**
   Do instead: In weekly combat-causality, invalidate `zero_battles` only when attack orders existed but resolved to no battles, or when the whole run totals zero battles. Keep battleless weeks visible under `behavioral_health.battleless_weeks`, but do not fail a healthy run just because of an operational lull.
6. **[2026-03-05] Pool exhaustion fix: avoided_osids DON'T prevent loss; control_overrides DO**
   Do instead: When sim=RBiH but painted=RS, adding RBiH avoided_osids is often ineffective (cells lost via counterattack or weakness, not direct attack). Add RS `osid_control_overrides` for systematic under-captures. avoideds work only when bot is actively targeting wrong cells.
7. **[2026-03-04] Override direction law — CRITICAL, confusing them causes -0.7pp regression**
   Do instead: RS `avoided_osids` = fix RS OVER-captures (painted=RBiH/HRHB, sim=RS — prevent VRS from attacking there). RS `osid_control_overrides` = fix RS UNDER-captures (painted=RS, sim=RBiH — force-start RS control). Adding under-captures to avoided_osids makes RS even less likely to capture them.
8. **[2026-03-04] HRHB Krajina/Posavina mismatches are INIT-based (ethnic Croat composition)**
   Do instead: Cells banja_luka:dragocaj, banja_luka:potkozarje_3, bosanska_gradiska:mackovac, prijedor:raljas, odzak:bosanski_samac, orasje:ostra_luka start as HRHB in initial_save due to Croat ethnic majority in those cells. Not a runtime regression. Do NOT chase these as calibration mismatches caused by bot changes — they are data-driven init artifacts.
9. **[2026-03-04] Consolidation captures CANNOT be fixed by bot config — ~8 persistent mismatches**
   Do instead: Cells surrounded by same-faction neighbors auto-flip regardless of avoided_osids or overrides. Confirmed: kakanj:biljesevo, zavidovici:cardak_2, olovo:olovo_2, and all 4 HRHB over-captures (jablanica, kiseljak outskirts, rat_2, prozor area) are consolidation-captured. Only engine-level consolidation rule changes could fix these.
10. **[2026-03-04] Load-bearing overrides: turbe_2 + Kalesija→Kupres dependency**
   Do instead: turbe_2 is an RS over-capture but enables Donji Vakuf consolidation (3 correct cells) — adding to avoided_osids causes net −3pp loss (n463). Kalesija seher_2/gojcin_2 overrides redirect VRS → kupres:kupres_2 fix (n466); adding Kladanj on top breaks this (n467). Test each override block in isolation — never stack two override groups without verifying underlying force dynamics.
## Engine Runtime Patterns
1. **[2026-03-05] Takeover displacement off-by-one FIXED**
   Do instead: `processPhaseIIDisplacementTakeover` Section 0 uses `currentTurn === warStartTurn + 1` (not warStartTurn). `runTurn()` increments turn BEFORE phases — first war turn = warStartTurn+1. Fixed in `displacement_takeover.ts`.
