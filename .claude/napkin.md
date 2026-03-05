# Napkin Runbook

**Location:** `.claude/napkin.md` — single runbook for this repo. Read and curate at session start. Update during work.

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
   Do instead: After edits, verify with `ReadFile` + `git diff`. After roadmap or handoff, close with run evidence + decision memo + cross-link.
7. **[2026-02-24] Scenario checkpoint lengths**
   Do instead: Use 20w/30w checkpoint runs for iteration; reserve 52w for acceptance only.
8. **[2026-02-11] Preserve shared type exports during refactor**
   Do instead: Keep `export type { ... }` statements; removing them breaks downstream consumers silently.

## Shell & Platform
1. **[2026-03-05] Write tool EEXIST on existing dirs — use Python**
   Do instead: Write/Edit tools fail with `EEXIST: file already exists, mkdir` on `src/sim/combat`, `src/state`, etc. Use `python3 sector_gen.py` (write via Write tool to project root, then `python3 script.py`). Heredocs with single-quote TypeScript also fail in bash -c; use Python triple-quoted strings in a file.
2. **[2026-02-28] Use built-in Grep tool, not shell rg**
   Do instead: Shell `rg` unavailable in PowerShell; use the Grep tool for content scans.
2. **[2026-02-07] Windows shell separator**
   Do instead: On Windows PowerShell, use `;` not `&&` to chain commands.
3. **[2026-02-07] tsx can hang on Windows**
   Do instead: Use `node_modules/.bin/tsx` directly (not `npx tsx`). Prefer `npm run test:vitest` over `npx tsx --test`.
4. **[2026-02-28] Root tsc vs nested UI package**
   Do instead: When `npx tsc --noEmit` at root fails on JSX config, verify changed UI package with its own build (`src/ui/map: npm run build`). Report root failures as pre-existing unless introduced by your edits.
5. **[2026-02-13] Validate paths with glob before use**
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
   Do instead: All reserve logic gated by `state.meta.supply_reserves_enabled`. Constants: `supply_reserve_constants.ts`. Module: `supply_reserves.ts`. Siege drain: `SIEGE_MIN_POCKET_SIZE=5` — components below this get counter frozen at 1. Isolated source detection: `findHeartlandComponent()` in `supply_state_derivation.ts` — supply sources in disconnected pockets (Sarajevo, Bihać) produce "strained" not "adequate". Heavy weapon maintenance: `HEAVY_MAINTENANCE_PER_WEAPON=0.003` — per-tank/artillery drain on heavy_munitions_reserve. RS (794 weapons) reaches strained (~43) by w40. n413 calibration: 89.7% area-weighted, E2 active.
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
2. **[2026-03-01] RS_EARLY_WAR_END_WEEK = 20 — DO NOT CHANGE**
   Do instead: RS `general_offensive` → `balanced` at w20. Extending to 22 backfires (RBiH counterattacks drop RS to 382).
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
9. **[2026-03-04] Brigade discipline: hard block + combat fatigue (n472)**
   Do instead: `bot_brigade_ai_osid.ts` hard block — brigades ONLY attack `effectiveDirective.offensive_targets`, sole exception: counter-attacks. Frontier pressure mechanic REMOVED. `RESERVE_PER_EDGE_CAP=0.07` (was 0.5) → ~1 reserve per sector. Combat fatigue: attacker +2, defender +1 per battle (cap 20); recovery -1/turn via `applyFatigueRecovery()` in `formation_fatigue.ts`. Phase I supply-assignment fatigue inert.
10. **[2026-03-04] Vienna Declaration / Local Truces (RS-HRHB non-aggression)**
    Do instead: `src/sim/local_truces.ts` — fires at week 4; sets `state.vienna_declaration_turn`. Bot filters RS↔HRHB truce-partner OSIDs from `offensive_targets`, except {brod, derventa, odzak, bosanski_samac, orasje, jajce}. Player truce-break: `check-truce-break` step; sets `state.truce_broken_turn[faction]`, opponent gets +0.25 aggression for 6 turns.

## OOB & Brigade Systems
1. **[2026-03-03] Personnel ceilings REMOVED + combat formula (n392 = 88.6% ATH)**
   Do instead: No hardcoded caps. Personnel emerges from pool demographics, mobilization scales (`ongoing_mobilization.ts`: RBiH 0.14, RS 0.22, HRHB 0.18), exhaustion thresholds (0.15/0.25), and FACTION_POOL_SCALE (RBiH 0.18, RS 0.25, HRHB **1.55**). Four combat mechanics: officer quality, ethnic defense, bombardment casualty mult, bombardment exposure attrition.
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

## Sectors & Operations
1. **[2026-03-01] corps_id from tags, not field**
   Do instead: Use `getFormationCorpsId(f)` from `corps_sector_partition.ts`. Brigade corps stored in tags (`corps:vrs_1st_krajina`), not `f.corps_id`.
2. **[2026-03-01] Sector exempt corps**
   Do instead: arbih_general_staff, vrs_main_staff, hvo_general_staff (army reserves) + hvo_central_bosnia (Bosniak-Croat conflict) — don't assign their brigades to front sectors.
3. **[2026-03-05] Sector pipeline (updated — contiguity fix + min coverage + balancing)**
   Do instead: `buildMultiSectorsForCorps()`: findSubSegments (friendly-OSID adjacency only — fix for non-contiguous sectors) → splitOversizedSubSegments (MAX_SECTOR_EDGES=25) → buildSectors → Phase 1E split (MAX_SECTOR_BRIGADES=8) → assignInteriorBrigades → redistributeExcessReserves → ensureMinimumSectorCoverage (promotes reserve or transfers from surplus). CorpsDirective now has `reinforce_sector_ids` (under-density sectors, <50% target density) + `priority_sector_id` (sector with most offensive targets). Bot: Rule 5c marches overstocked brigades to reinforce sectors; Rule 7 marches interior brigades to priority sector first.
4. **[2026-03-05] Sector intel replaces recon_intelligence (DELETED)**
   Do instead: Use `sector_intel.ts` / `sector_intel_constants.ts`. `derive-sector-intel` pipeline step. Confidence model, recon-by-force, bot target weighting. GUI fog-of-war (visible_brigade_ids) deferred to Phase 6. `recon_intelligence.ts` is DELETED — do not reference it.

## GUI / HoI Map
1. **[2026-03-04] GUI Phase 5 COMPLETE. Only replay scrubber deferred.**
   Do instead: Phase 5 done — battle markers (GameState.control_events + buildBattleMarkersGeoJSON), fog/battles/strategic-points layer toggles, buildStrategicPointGeoJSON (city/seat from `{mun}_2` slug), stageCorpsOperationOrder IPC backend, WarSummaryModal. Replay scrubber deferred (--video flag, 13.6 GB/run). Visual sign-off TBD.
2. **[2026-03-01] Map load: validate + defer parse + timeout**
   Do instead: Validate save (schema, meta.turn, formations/political_controllers shape). `parseGameState` unwraps `{ state }`/`{ gameState }`, treats `phase_ii` as war, accepts `formations` as object or array. Parse in requestIdleCallback (~150ms). 25s load timeout in toolbar. Show loadError on failure/timeout.
3. **[2026-02-28] Map overlay poll: check sources first**
   Do instead: Call getSource() before buildControlGeoJSON/buildFrontLinesGeoJSON. Otherwise 500ms poll freezes app.
4. **[2026-03-01] Formation icon + setData: defer to idle**
   Do instead: Run ensureFormationIcons and setData in requestIdleCallback (~400ms), not in overlay rAF chain. Cancel in cleanup.
5. **[2026-02-28] Selection panel: inline styles for positioning**
   Do instead: Use inline styles (position, right, top, zIndex, direction: ltr) so Tailwind/purge/RTL cannot override. `?showPanel=1` for dev layout verification.

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
1. **[2026-03-05] ATH n52=100% (count+area-weighted); all Tasks #13-18 complete**
   Do instead: Use area-weighted match (km²) as primary. ATH n52=100.0% (hash `a42822b1be197257`). 313 vitest pass. Pool exhaustion adds ~30k exhausted/40w; adds avoided_osids + control_overrides to compensate.
2. **[2026-03-05] Pool exhaustion fix: avoided_osids DON'T prevent loss; control_overrides DO**
   Do instead: When sim=RBiH but painted=RS, adding RBiH avoided_osids is often ineffective (cells lost via counterattack or weakness, not direct attack). Add RS `osid_control_overrides` for systematic under-captures. avoideds work only when bot is actively targeting wrong cells.
3. **[2026-03-04] Override direction law — CRITICAL, confusing them causes -0.7pp regression**
   Do instead: RS `avoided_osids` = fix RS OVER-captures (painted=RBiH/HRHB, sim=RS — prevent VRS from attacking there). RS `osid_control_overrides` = fix RS UNDER-captures (painted=RS, sim=RBiH — force-start RS control). Adding under-captures to avoided_osids makes RS even less likely to capture them.
4. **[2026-03-04] HRHB Krajina/Posavina mismatches are INIT-based (ethnic Croat composition)**
   Do instead: Cells banja_luka:dragocaj, banja_luka:potkozarje_3, bosanska_gradiska:mackovac, prijedor:raljas, odzak:bosanski_samac, orasje:ostra_luka start as HRHB in initial_save due to Croat ethnic majority in those cells. Not a runtime regression. Do NOT chase these as calibration mismatches caused by bot changes — they are data-driven init artifacts.
5. **[2026-03-04] Consolidation captures CANNOT be fixed by bot config — ~8 persistent mismatches**
   Do instead: Cells surrounded by same-faction neighbors auto-flip regardless of avoided_osids or overrides. Confirmed: kakanj:biljesevo, zavidovici:cardak_2, olovo:olovo_2, and all 4 HRHB over-captures (jablanica, kiseljak outskirts, rat_2, prozor area) are consolidation-captured. Only engine-level consolidation rule changes could fix these.
6. **[2026-03-04] Load-bearing wrong captures: turbe_2 RS over-capture enables Donji Vakuf cascade**
   Do instead: turbe_2 is an RS over-capture BUT it is a stepping stone enabling Donji Vakuf consolidation cascade (3 correct cells). Adding turbe_2 to RS avoided_osids breaks Donji Vakuf → net -3pp loss (n463 confirmed). Do NOT add turbe_2 to RS avoided_osids.
7. **[2026-03-04] Fragile VRS force allocation: Kalesija→Kupres dependency**
   Do instead: Kalesija seher_2/gojcin_2 RS overrides redirect VRS pressure → bonus kupres:kupres_2 fix (n466). Adding Kladanj overrides on top disrupts this allocation → kupres:kupres_2 reverts (n467). Test each override block in isolation; never stack two override groups without verifying the underlying force dynamics.
8. **[2026-03-03] Timeline knobs drive 40w behavior first & prove efficacy**
   Do instead: Tune `apr1992.json` before `bot_strategy.ts`. Prove efficacy immediately by running one 40w test and comparing `final_state_hash` and `compare_painted_vs_sim.cjs`; revert if inert.
9. **[2026-03-04] apr1992.json ↔ FACTION_DOCTRINE_PHASES must stay synced**
   Do instead: After editing EITHER `data/scenarios/timelines/apr1992.json` doctrine values OR `bot_strategy.ts` `FACTION_DOCTRINE_PHASES`, immediately run `npx vitest run tests/war_timeline.test.ts` to confirm round-trip parity. Drift causes silent calibration regression.
10. **[2026-03-03] Municipality target sets are the strongest live lever**
    Do instead: Prioritize small `target_municipalities` edits for affected corps (e.g., EBK `brcko`/`lopare` trimming yielded +8.3pp POSAVINA_NE) before weight/min_outcome tuning.
## Engine Runtime Patterns
1. **[2026-03-05] Takeover displacement off-by-one FIXED**
   Do instead: `processPhaseIIDisplacementTakeover` Section 0 uses `currentTurn === warStartTurn + 1` (not warStartTurn). `runTurn()` increments turn BEFORE phases — first war turn = warStartTurn+1. Fixed in `displacement_takeover.ts`.
