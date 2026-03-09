# Napkin Runbook

**Location:** `.claude/napkin.md` - single runbook for this repo. Read and curate at session start. Update during work.

**Rules:** Max 10 items per category. Re-prioritize on every read (highest first). Merge duplicates, remove stale. Each entry: date + short title + "Do instead".

**Master files:** Calibration → `docs/40_reports/CALIBRATION_MASTER.md`; GUI (map + warroom) → `docs/40_reports/GUI_MASTER.md`; Warroom → `docs/40_reports/WARROOM_MASTER.md`; Real War → `docs/40_reports/REAL_WAR_MASTER.md`. Do instead: When doing calibration, GUI, warroom, or realism work, read the relevant master first and update it during the session.

## Execution & Validation
1. **[2026-03-07] Classify phases by real code impact, not plan labels**
   Do instead: Before parallelizing or skipping regression, audit the task list. If a phase touches schema, IPC, bot logic, pipeline, or serialization, treat it as engine-touching even if the plan calls it UI-only; split the task or add the regression gate and separate commit.
2. **[2026-03-06] Preserve fractional run-summary metrics**
   Do instead: In scenario summary normalization, never round fields ending in `share`, `ratio`, `rate`, `tolerance`, or `deviation`. Benchmark fractions are historical-fit evidence, not counts.
3. **[2026-02-25] Determinism is sacred**
   Do instead: No `Math.random()`, no timestamps, no `Date.now()` in run folders. Sorted iteration via `strictCompare`. Monotonic `.run_counter` for run folders.
4. **[2026-02-21] Smoke-test triad after every change**
   Do instead: Run `tsc --noEmit`, `vitest run`, and `desktop:map:build` as standard smoke check.
5. **[2026-02-20] Fix ALL failing tests**
   Do instead: Fix all failing tests even if unrelated to current change. Standing directive.
6. **[2026-02-22] Never auto-rebaseline golden tests**
   Do instead: Keep failing baselines pending canon/data authority review. Refresh only after user/PM sign-off per `TEST_BASELINE_STRATEGY.md`.
7. **[2026-02-21] Refactor-pass and code-simplifier between phases/checkpoints**
   Do instead: After each implementation phase or between plan checkpoints, run /refactor-pass (dead code, duplication, over-engineered stubs, simplify conditionals; then tsc + vitest) and /code-simplifier on recently modified code. Plans (e.g. officers-phase-e-implementation) must instruct this between tasks.
8. **[2026-02-13] Verify edits + close handoffs with evidence**
   Do instead: After edits, verify with file reads + `git diff`. After roadmap or handoff, close with run evidence + decision memo + cross-link.
9. **[2026-02-24] Scenario checkpoint lengths**
   Do instead: Use 20w/30w checkpoint runs for iteration; reserve 52w for acceptance only.
10. **[2026-02-11] Preserve shared type exports during refactor**
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
5. **[2026-03-08] Warroom/vitest jsdom for DOM-dependent tests**
   Do instead: Tests that import warroom or any code using document/window need jsdom. In vitest.config set environment: 'node' and environmentMatchGlobs for the test file to 'jsdom'; add jsdom devDependency.

## Simulation Engine
1. **[2026-03-07] Phase C supply agency lives in patron_pressure + supply_reserves, not a separate subsystem**
   Do instead: Keep IVP consequence hysteresis in `patron_pressure.ts`; keep convoy generation/processing, smuggling allocation, and Sarajevo tunnel hooks in `supply_reserves.ts`; surface pending convoy decisions through state + desktop IPC rather than ad-hoc UI-only modals.
2. **[2026-03-07] Composite IVP extends the existing patron-pressure system**
   Do instead: Add new international-pressure behavior by extending `patron_pressure.ts` and `international_visibility_pressure`, not by creating a parallel IVP subsystem. `composite_ivp` is the UI/patron-facing summary value.
3. **[2026-03-03] Supply reserves: gated + pocket threshold + isolated source + heavy weapon drain**
   Do instead: All reserve logic gated by `state.meta.supply_reserves_enabled`. Constants: `supply_reserve_constants.ts`. Module: `supply_reserves.ts`. Siege drain: `SIEGE_MIN_POCKET_SIZE=8` — components below this get counter frozen at 1. Isolated source detection: `findHeartlandComponent()` in `supply_state_derivation.ts` — supply sources in disconnected pockets (Sarajevo, Bihać) produce "strained" not "adequate". Heavy weapon maintenance: `HEAVY_MAINTENANCE_PER_WEAPON=0.001` — per-tank/artillery drain on heavy_munitions_reserve.
4. **[2026-03-01] OSID/SID mismatch — never use getEffectiveSettlementSide for control**
   Do instead: `political_controllers` keyed by OSIDs in war phase. Use `buildMunControlFromOsids()` or `buildMunDominantController()` for municipality control. `getEffectiveSettlementSide()` does SID lookup → always null → false encirclement.
5. **[2026-03-01] Displacement: per-OSID census, non-overlapping buckets, static routing**
   Do instead: Use `getOsidCensusPopulation(osidRec)` and `getOsidCensusHostileShare(osidRec, faction)`, not mun averages. `displaced_out` = routed amount. `lost_population` = killed + fled_abroad + unrouted overflow. Set `cumulative_displaced = displacementAmount` after initial fire (prevents double-counting). Routing tables in `displacement_routing_data.ts` are static (47 sub-regions × 3 ethnicities). Don't add `state` param to route lookup.
6. **[2026-02-24] OSID-keyed political_controllers init + load migration**
   Do instead: When init fills by OSID, do NOT call `promotePoliticalControllersToOsid`. Check `isPoliticalControllersAlreadyOsidKeyed()` first. On load: `migratePoliticalControllersToOsidIfNeeded` only for canonical SIDs (skip test fixtures S1/S2).
7. **[2026-02-28] Operational control: majority then plurality**
   Do instead: Assign faction by ethnic majority (>50%), else plurality. Not "first ≥40%" — that made Vozuća RBiH despite 54.5% Serb.
8. **[2026-03-01] Test fixtures: phase + referendum required**
   Do instead: Test fixtures flowing through `runTurn` or scenario runners must set `meta.phase` (`peace`/`war`) + referendum fields. Missing phase hard-fails.
9. **[2026-02-22] Pipeline step no-ops for missing data**
   Do instead: When operational data unavailable, log and skip OSID steps safely rather than crashing.
10. **[2026-03-08] Paramilitary rear pocket cleanup: `paramilitary_sweep.ts`**
    Do instead: Autonomous paramilitary units spawn when rear enemy pocket clusters detected (1-3 connected same-controller OSIDs, ALL external neighbors faction-controlled, BFS cluster detection, `op:` prefix filtering). Instant capture (MARCH_TURNS=0). Active w0-20. Faction rates: RS=0.85, HRHB=0.55, RBiH=0.30. Casualties (inflicted+suffered) count in casualty_ledger; civilian casualties init via `??=`. Bot corps AI defers (excludes paramilitary targets from opportunistic targeting). Pipeline: `paramilitary-detect` + `paramilitary-advance` after `partition-corps-front-sectors`. Player: `pending_paramilitary_requests`; bot auto-approves. `FormationKind='paramilitary'` excluded from reinforcement/bot AI.

## Bot AI & Combat
1. **[2026-03-09] FIXED: VRS sector territory gaps + deep-rear brigades**
   Do instead: Both bugs fixed in n473 session. Territory gaps: post-Voronoi sweep claims orphan OSIDs + `findSectorForEnemyOsid` territory_osids fallback. Deep-rear brigades: 7 distinct bugs in brigade AI evaluation chain, column march destination, and transit reset. Details in `docs/40_reports/REAL_WAR_MASTER.md`. RS deep rear 15→0. Remaining RBiH/HRHB deep rear is geographic fragmentation.
2. **[2026-03-06] RS stays offensive permanently — organic tempo decay (n159 audit)**
   Do instead: RS has 2 doctrine phases (both offensive). No stance switch to balanced/defensive. Tempo decay emerges organically from fatigue (+2/battle, recovery every 2 turns), supply drain (MAINTENANCE_DRAIN 0.045/formation), and entrenchment wall (sqrt curve). RS_EARLY_WAR_END_WEEK=20 still marks reduced aggression (0.15→0.05) and max_attack_share (0.28→0.22). Weekly RS attacks decline 8→1 by w40.
2. **[2026-03-08] Brigade discipline + fatigue + garrison + dissolution + siege + equipment**
   Do instead: Hard block — brigades ONLY attack `effectiveDirective.offensive_targets`. Fatigue: +1.5/turn frontline, +2 attacker/+1 defender per battle. Recovery: -1 every 3 turns, ONLY when OFF frontline (must rotate). **BUG FIXED (n304)**: `updateFormationFatigue` was resetting fractional fatigue to 0 via `Number.isInteger` check — replaced with `typeof !== 'number'` check. `garrison: true` on OOB → defend-only (VRS 65th Protection). Dissolution: `brigade_dissolution.ts` triple criteria. Siege bombardment: `siege_attrition.ts`. Equipment loss: OSID path (`attack_resolution_osid.ts`) now records equipment losses (was missing entirely — only legacy SID path had it). TANK_LOSS_RATE=0.08, ARTILLERY_LOSS_RATE=0.04, min 1 per battle if unit has equipment. Defender rates at 0.5×. Supply embargo: PATRON_AID_SCALE=10, faction efficiency (RBiH=0.3, RS=1.0, HRHB=0.8), caps (RBiH=45, RS=90, HRHB=70). **n304 ATH=93.8% (up from n290=88.1%) — fatigue+equipment naturally limit RS offensives.**
3. **[2026-03-04] Morale retreat resistance: per-faction floor (updated)**
   Do instead: `getMoraleResistFloor()`: RBiH=**50**, RS=70, HRHB=**60**. Morale ≥ floor + costly_victory → absorb. Decisive always retreats. ARBiH homeland last stand (≥50% Bosniak co-ethnic) also absorbs 'victory' outcomes regardless of morale. Added in n439 session.
4. **[2026-03-08] Graz Accords / Local Truces (RS-HRHB non-aggression) + cold fronts**
   Do instead: `src/sim/local_truces.ts` — fires at week 4; sets `state.vienna_declaration_turn`. Bot filters RS↔HRHB truce-partner OSIDs from `offensive_targets`, except {brod, derventa, odzak, bosanski_samac, orasje, jajce}. Player truce-break: `check-truce-break` step; sets `state.truce_broken_turn[faction]`, opponent gets +0.25 aggression for 6 turns. **Cold fronts**: RS↔HRHB front segments exempt from frontline attrition + bombardment FP calc (`isColdFront()` in `frontline_attrition.ts`). HRHB siege drain skipped while Graz active (`supply_reserves.ts`). Terminology: "Graz Accords" (not "Vienna Declaration") — state field remains `vienna_declaration_turn` for backwards compat.
5. **[2026-03-07] Pre-planned VRS operations (5 corps only) + JNA ghost Kupres**
   Do instead: `injectPrePlannedOperations(state)` sets corps to `offensive` PERMANENTLY. Only the original 5 corps (EBK/Drina/SRK/Herzegovina/1KK). 2KK has NO pre-planned op (−6.7pp regression). Kupres captured by JNA ghost phantom (`jna_9th_corps_tg`): `capture_osids` flips control at spawn, `no_equipment_handoff` dissolves without equipment distribution. No post_op_stance/stance_cap mechanism.
6. **[2026-02-25] RBiH general_defensive through week 56**
   Do instead: ARBiH must remain `general_defensive` through week 56. "Balanced" before w56 allows premature counterattacking.
7. **[2026-02-25] Aggression scoring: additive + multiplicative**
   Do instead: Flat additive (`aggression_modifier × 120`) PLUS multiplicative (`× (1 + aggression_modifier)`). Multiplier alone ineffective on low base scores.
8. **[2026-02-22] Pioneer attack seeding**
   Do instead: First brigade seeds concentration with 'repulsed' outcome; subsequent join via `estimateConcentratedOutcome()`.
9. **[2026-02-24] CorpsDirective must be complete**
   Do instead: Include `offensive_targets`, `hold_osids`, `avoid_osids`, `max_attackers_per_target`, `reserve_fraction`, `min_attack_outcome`, `aggression_modifier`.
10. **[2026-02-25] sidToMun map preservation**
    Do instead: Preserve `canonicalSidToMun` in scenario_runner.ts. Corruption prevented ALL 217 mandatory brigades from spawning.

## Officer Architecture
1. **[2026-03-08] Named officers = corps and above only; brigades use abstracted officer_quality**
   Do instead: Named officers (`officer_system.ts`) command corps and operations. Brigades have `officer_quality` [0,1] field → `getBrigadeOfficerMod()` in `combat_math.ts`. Army HQs feed into army_commander modifier for VRS general_offensive ops. Never suggest named officer assignment for brigades.
2. **[2026-03-08] distinction_potential replaces pre-awarded historical_decorations**
   Do instead: Units that historically earned decorations start with `distinction_potential: 'tier_1'|'tier_2'|'tier_3'` + modest officer_quality seed. `decoration_evaluator.ts` reduces earning thresholds by 30–35%. Decorations are EARNED during the run, not given at war start. `historical_decorations` and `honor` fields stripped from OOB (46 brigades).
3. **[2026-03-08] Army HQs seeded with initial_officer_quality + cohesion**
   Do instead: `vrs_main_staff` oq=0.75 coh=72, `hvo_main_staff` oq=0.50 coh=65, `arbih_general_staff` oq=0.12 coh=38 morale=45. Fields flow via `OobCorps` → `oob_early_war_entry.ts` → FormationState. ARBiH General Staff available_from=24; VRS/HVO from turn 0/10.

## OOB & Brigade Systems
1. **[2026-03-06] Personnel ceilings REMOVED; organic troop strength via pool system**
   Do instead: No hardcoded caps. Personnel emerges from pool demographics, mobilization scales (`ongoing_mobilization.ts`: RBiH=0.10, RS=0.12, HRHB=0.29), exhaustion (MILITARY_AGE_MALE_FRACTION=0.28 denominator, threshold 0.25 half-rate, cap 0.50), and FACTION_POOL_SCALE (RBiH=0.25, RS=0.25, HRHB=1.05). RS JNA bonus=10k. n345 result: RBiH=119.2k (target 120k), RS=103.3k (target 102.6k), HRHB=43.4k (target 41.5k). Note: HRHB scale reduced from 1.60→1.05 after cold-front fix eliminated phantom attrition; RBiH raised from 0.18→0.25 to compensate cascade (healthier HRHB → changed territorial dynamics → less RBiH mobilization).
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

9. **[2026-03-07] Phase E municipality support stays asymmetric and pool-constrained**
   Do instead: Use municipality_support_orders as one shared state surface, but keep faction effects distinct: RBiH local mobilization (weapons_shipment), RS reinforcement-rate boost (staff_priority), HRHB reinforcement cohesion bonus (croatian_support_package). One target, one turn, no global manpower rewrite.

## Sectors & Operations
1. **[2026-03-08] Corps sector rework — ALL 6 ITEMS DONE**
   Do instead: All items from the corps sector management plan are implemented and live:
   (1) Home distance effectiveness: `home_distance.ts` → `combat_math.ts` (attack+defense), 1.0≤3 hops, -4%/hop, floor 0.70.
   (2) Brigade movement to sectors: column march (`osid_column_movement.ts`) + `sector_reassignment_orders` on CorpsDirective.
   (3) Density equalization: `bot_corps_ai.ts` surplus(>1.3×)→deficit(<0.7×), threat-weighted.
   (4) Intel-driven reinforcement: `offensive_signs` 3× boost, `fortress` 2.5×, `dense` 2×.
   (5) Sector reserves: `reserve_brigade_ids`, `reserve_fraction` (10-30% by stance).
   (6) Territory assignment: brigade-presence-first in `mapOsidsToCorps` (Phase 1 lock + Phase 2 BFS gap-fill).
   REMAINING: Elite/professional brigades should get flatter home distance curve (floor 0.85 vs 0.70).
2. **[2026-03-09] Territory-based classification — territory_osids lookup**
   Do instead: `classifyBrigadesByTerritory` uses `territoryOsidToSectorIdx` from Voronoi Step 5 as Priority 4/5. Replaces broken Priority 5 BFS that failed on fragmented friendly territory. Reserve-zone OSIDs included in territory map (cross-corps 1-hop fallback). Last-resort BFS kept for MAX_TERRITORY_OSIDS cap edge cases. Result: 3 unassigned (down from 44).
3. **[2026-03-09] Every brigade stays in its sector — no reserve cap**
   Do instead: Reserve cap REMOVED from both `reclassifyRearBrigades` and `rearrangeSectorsForCorps`. Corps needs full visibility of all manpower. Reserves sorted by proximity (closest first). `deduplicateBrigadesAcrossSectors` prevents cross-sector duplicates after Step 8.
4. **[2026-03-09] Mech/moto staging + priority for offensive ops**
   Do instead: `getEquipmentOffensivePriority()` in `sector_offensive.ts` (mechanized=3, motorized=2, mountain=1, default=0). Staging pass in `bot_corps_directives.ts`: scans reserves for mech/moto (priority ≥ 2), issues `sector_reassignment_orders` to priority sector. Op participant lists sorted by equipment priority. Mech/moto are offensive tools, not line troops.
4. **[2026-03-07] Sector intel replaces recon_intelligence (DELETED) — fog LIVE**
   Do instead: Use `sector_intel.ts` / `sector_intel_constants.ts`. `derive-sector-intel` pipeline step. Confidence model, recon-by-force, bot target weighting. GUI fog-of-war is LIVE: `GameStateAdapter` derives `fogOfWar` from `sector_intel` + `corps_front_sectors`; `buildFogOfWarGeoJSON` renders it; `MapContainer` toggles via `fogVisible`. `ReconIntelligenceView` + `reconIntelligence` field fully removed. `recon_intelligence.ts` is DELETED — do not reference it.
5. **[2026-03-07] Sector orders + OPSEC are sector-state, not brigade hacks**
   Do instead: Stage defensive intent in `sector_stance_orders`, then translate it through `applySectorStanceOrders()` into ordinary `brigade_posture_orders`. Keep reserve brigades out of that translation unless design explicitly changes. Store OPSEC in `state.opsec_sectors`, halve passive intel buildup against those sectors, and auto-clear OPSEC when the sector's operation enters execution.
6. **[2026-03-06] Proof lane + eligible-attacker boundary**
   Do instead: Before wide calibration work, run `tests/scenario_vrs_operation_proof.test.ts` / `data/scenarios/apr1992_vrs_operation_proof_4w.json` to prove one VRS opening op can attack, battle, and advance. In combat-causality, treat `execution_without_eligible_attackers` as a separate root-cause boundary from `execution_without_attack_orders`.
5. **[2026-03-06] Sector rearrangement + maneuver interpretation**
   Do instead: Keep `rearrangeSectorsForCorps()` + `concentrateSectorsForOffensive()` in `generateCorpsDirectives()`. Execution-phase ops with `brigade_movement_orders` but zero attack orders are still maneuvering — only true inert turns count as `execution_without_attack_orders`. Planning ends once one full turn elapsed and participants are staged or at friendly approach positions.
6. **[2026-03-05] `sector_attack` phase timing + no-progress budget**
   Do instead: `src/sim/combat/sector_offensive.ts` owns phase advances — `corps_command.ts:advanceOperations()` must skip `sector_attack` ops. If execution produces no objective attempt, treat it as failure/stalemate in `updateSectorOffensiveResults()` so the op ends rather than hanging.
7. **[2026-03-05] Opening operations: explicit rosters + named ops own brigades**
   Do instead: For April 1992 VRS opening ops, use explicit `participating_brigades`, `sector_id`, and `staging_osid`. If a brigade is in `active_operation.participating_brigades`, it routes through operation planning/execution/recovery first — `home_defense_active`, reserve logic, or generic corps targeting cannot retake control until `active_operation` is cleared.
8. **[2026-03-07] Sector-only operation creation — no catalog ops, no rear dump**
    Do instead: Operations launch ONLY from `generateCorpsDirectives` sector offensive path. Old `generateCorpsOperationOrders` (catalog-based, picks 5 from whole corps) is disabled. Rear-area brigade supplementing removed — only sector-assigned brigades participate. `MAX_PARTICIPATING_BRIGADES=12` cap in `sector_offensive.ts`. If sector lacks brigades, no launch; density balancing reinforces first.

## GUI / HoI Map
1. **[2026-03-07] Settlement panel: 3 horizontal tabs, nation labels, current ethnic**
   Do instead: Settlement (right) panel has Overview | Military | Orders & events (same style as sector/operations). “Fled from this settlement” uses nation labels (Bosniaks, Serbs, Croats, Others) via `ethnicityOrFactionToNationLabel`. Current ethnic structure shown when computable via `getCurrentEthnicForOsid`. Control tab removed; controller/status live in Overview. For future settlement-panel work, keep tabs and data sources per TACTICAL_MAP_SYSTEM §13.2 and [20260307_SETTLEMENT_PANEL_RICH_CONTENT_AND_TABS.md](docs/40_reports/implemented/20260307_SETTLEMENT_PANEL_RICH_CONTENT_AND_TABS.md). For any GUI work, read docs/40_reports/GUI_MASTER.md first and update it during the session (same discipline as CALIBRATION_MASTER for calibration).
2. **[2026-03-07] Command briefing and summary routing live in `App`, not the toolbar**
   Do instead: Mount the high-level command briefing as a thin overlay in `App.tsx`, fed by `GameStateAdapter.commandBriefing`, and route it into existing panels/modals plus focused summary sections (`ivp`, `convoys`, `support`, `opsec`, etc.). Keep `TopToolbar.tsx` to compact command signals plus utility controls.
3. **[2026-03-07] Selection, army, corps, sector, formation, and operation detail share one rail**
   Do instead: Keep these panels on the same App-owned rail semantics via `panelRail.ts`. Do not let `SelectionPanel` drift back to its own far-right overlay rules.
4. **[2026-03-07] Detail panels drill right; App owns precedence**
   Do instead: Keep map detail flow on a right-side panel rail: overview -> primary detail -> secondary detail sliding further right. Preserve parent context, animate horizontal drill-downs, and let `App.tsx` mount panels from one deterministic selector instead of per-component hide/show guesses.
5. **[2026-03-08] Warroom init races: bind Electron bridge before long async loads**
   Do instead: In `src/ui/warroom/warroom.ts`, assign `window.awwv` / `this.desktopBridge` before asset or map-loading awaits. UI buttons are wired early, so bridge-dependent actions like `startNewCampaign()` must have the preload bridge available immediately, not after later async init work.
6. **[2026-03-08] Warroom region loading: missing shared file must not abort init**
   Do instead: Treat region JSON loading as optional during startup. If `hq_clickable_regions.json` is intentionally removed in favor of `hq_<faction>_clickable_regions.json`, try multiple candidates and continue booting even if the shared file is absent.
6. **[2026-03-08] Warroom image target: archival photograph, not AI concept art**
   Do instead: In warroom prompt packs, make documentary / archival photo realism the top invariant. Say "real photographed room, not AI art, not concept art, not 3D render" explicitly. Keep visible year out of baked art; only the runtime calendar shows the year. Re-measure overlay quads per approved room image.
6. **[2026-03-06] Tactical fog contract is `fogOfWar`, not raw sector intel**
   Do instead: Derive player-visible fog in `GameStateAdapter.ts` from `sector_intel` + sectors + friendly brigade positions, then render `LoadedGameState.fogOfWar`. Do not wire map layers directly to raw engine intel structures.
7. **[2026-03-06] Briefing panels: prefer stacked accordions over tabs**
   Do instead: Use `AccordionHeader` for unified vertical briefing views in `CorpsFrontPanel` and `OOBSidebar` to maintain situational awareness. Review for unused `collapsed` state when refactoring.
8. **[2026-03-07] Officer display: use OfficerProfile component, never raw stat numbers**
   Do instead: All officer displays use `OfficerProfile` component (archetype, pips, origin badge, combat record). Never show raw 1-5 values or `Math.round(x * 100)`. Character utilities in `officerCharacter.ts`. See MAP_UI_MASTER §12, §13.4.
9. **[2026-03-01] Map load: validate + defer parse + timeout**
   Do instead: Validate save (schema, meta.turn, formations/political_controllers shape). `parseGameState` unwraps `{ state }`/`{ gameState }`, treats `phase_ii` as war, accepts `formations` as object or array. Parse in requestIdleCallback (~150ms). 25s load timeout in toolbar. Show loadError on failure/timeout.
10. **[2026-03-05] Active GUI path only — avoid saved mirror files**
    Do instead: Edit `src/ui/map/components/*` and `src/ui/map/map/*` for live behavior. Treat `src/ui/map/saved/*` as legacy snapshots unless explicitly migrating.

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
1. **[Standing] working-on.md — task continuity across compaction**
   Do instead: When context is visibly high (many tool calls, long session), OR before any major task boundary, write `working-on.md` to project root with: (1) current task in one sentence, (2) files actively being modified, (3) next 3 concrete steps. This is Claude's own responsibility — not a hook. At session start: if `working-on.md` exists, read it first and delete it (MEMORY.md step 4).
2. **[Standing] Life lessons enforcement system (3 mechanisms)**
   Do instead: (A) **Session start**: read `docs/life_lessons.md`, flag lessons relevant to current task, STOP if about to violate one. (B) **Pre-commit**: `/awwv_pre_commit_check` includes life-lessons compliance — each active lesson checked as PASS/FLAG against the diff. (C) **Daily cron**: schedule `3 6 * * *` at session start — gathers 24h activity, detects violations in git diffs, synthesizes new lessons, promotes/demotes based on compliance, regenerates `/visual-explainer`. Session-only cron — must re-schedule each session.
3. **[2026-03-08] Cross-check same-day reports against the latest ledger**
   Do instead: Before reusing a report, audit, or handover summary from the same day, read the newest `docs/PROJECT_LEDGER.md` entries first. This repo can change materially within hours, and stale summaries can keep already-fixed issues on the priority list.
2. **[Standing] Absolute paths**
   Do instead: Always use absolute paths for tool calls.
3. **[Standing] Update napkin during work**
   Do instead: Update napkin after significant changes; don't wait until session end.
4. **[2026-02-28] Maximize safe parallel execution**
   Do instead: Run independent tasks in parallel; sequence only on shared-file or dependency gates.
5. **[2026-02-28] Canon docs get implementation notes on tech changes**
   Do instead: When stack changes (e.g. Canvas→MapLibre), add implementation notes in planning/spec doc. Keep aesthetic authority doc referenced from canon.
6. **[2026-02-25] Counterattacks are correct**
   Do instead: Captured territory SHOULD be immediately reclaimable. Counterattacks are mechanically correct.
7. **[2026-02-22] Replay disabled by default**
   Do instead: Only generate replay with `--video` flag (saves 13.6GB).
8. **[2026-02-28] Canonical map is React+MapLibre**
   Do instead: `npm run dev:map`. Legacy map_hoi.html / tactical_map.html are archived.
9. **[2026-03-02] ZoC fully removed**
   Do instead: ZoC deleted. Movement via `brigade_movement_orders.ts` / `apply-brigade-movement`. Defense via `local_front_defense.ts` density. AoR legacy also fully removed (R1–R5, 2026-03-04) — no dead AoR code remains.

## Calibration
1. **[2026-03-08] n371 = 88.2% — findSectorForEnemyOsid fix + elite home distance curve (neutral)**
   Do instead: Fixed `findSectorForEnemyOsid` searching `enemy_osids` instead of `friendly_osids` in `corps_front_sectors.ts` — correctness fix, no calibration change. Elite home distance curve (floor 0.85 vs 0.70 for `elite_loan_state` brigades) — neutral (only 3 elite brigades). Bucovaca painted control fix (HRHB→RS) changes comparison hash. Undefended floor REMOVED (caused 82.5% regression). ATH remains n304=93.8%.
2. **[2026-03-07] HRHB-init cells CAN be fixed by RS overrides — add in isolated clusters only**
   Do instead: Cells like banja_luka:dragocaj, kotor_varos x4, mrkonjic_grad:baljvine_2, skender_vakuf:donji_koricani start HRHB but painting=RS. Adding RS overrides for these IS effective (n238: KRAJINA 89.4%→97.8%). RULE: add HRHB cells by isolated geographic cluster (KRAJINA only, then POSAVINA_NE only, etc.) — adding 10+ HRHB cells across multiple regions at once (n237) caused POSAVINA_NE −9.9pp and SARAJEVO −9.3pp cascade.
3. **[2026-03-08] Rear pocket consolidation: cluster-aware version RE-ADDED**
   Do instead: `rear_pocket_consolidation.ts` re-added with cluster-aware BFS detection (1-3 connected same-controller enemy OSIDs, ALL external neighbors faction-controlled). Post-week-20 auto-flip for surrounded enemy clusters without defending brigades. Original `consolidation_flips.ts` remains deleted — the new version is structural replacement. Paramilitary sweep handles w0-20; rear pocket consolidation handles w20+.
4. **[2026-03-07] Pre-planned operation target chains drive regional match rate (n218)**
   Do instead: 84.2% plateau caused by Operation Drina missing djulici/drinjaca/krizevici/paljevici/donja_kamenica (Zvornik) and Operation Koridor missing Brcko corridor (brcko:brcko/donji_rahic/krepsic/skakava_donja). Fix is data change to `src/sim/combat/pre_planned_operations.ts` + scenario anchor — not engine code. Municipality-level anchors for pockets (bihac) give false failures; use OSID-level anchor `op:bihac:bihac_2` instead. Post-H clean run `n248` confirms the remaining notable misses are still `srebrenica` municipality and `op:brcko:brka_2`, which fits this same pre-planned-op/scenario-anchor bucket rather than a combat-loop bug.
   Load-bearing overrides: turbe_2 is RS over-capture but enables Donji Vakuf consolidation (3 correct cells) — adding to avoided_osids causes net −3pp loss (n463). Kalesija seher_2/gojcin_2 overrides redirect VRS → kupres:kupres_2 fix (n466). Test each override block in isolation.
5. **[2026-03-06] Pool surplus absorbs mobilization scale changes — use initial pool lever**
   Do instead: If faction pool has large surplus at w40 (RS=27k, HRHB=25k), reducing FACTION_MOBILIZATION_SCALE barely moves committed brigade personnel (1-2% drop for 12% scale cut). Primary lever for initial strength is RS_JNA_INHERITANCE_BONUS and FACTION_POOL_SCALE. For RS long-run, large scale cuts (0.17→0.12) combined with JNA reduction are needed to bring into band. HRHB POOL_SCALE=1.60 restores ~40k target.
6. **[2026-03-05] Combat calibration needs causality, not just territory**
   Do instead: Before trusting control deltas, verify non-zero attack orders and non-zero battles in `weekly_report.jsonl`, then separate combat flips from consolidation, drift, and init overrides. Update `docs/40_reports/CALIBRATION_MASTER.md` during the session. Current clean engine-valid baseline is `n248`: combat restored with `invalid_operation_count=0`, but territorial anchor drift remains a separate calibration problem.
7. **[2026-03-06] Live attribution replaces Phase I flip logs**
   Do instead: For current scenario runs, use `control_change_attribution` in `weekly_report.jsonl` / `run_summary.json`. `control_events.jsonl` was a leftover Phase I artifact and is no longer the live harness contract.
8. **[2026-03-06] Quiet weeks are warnings, not automatic causality failures**
   Do instead: In weekly combat-causality, invalidate `zero_battles` only when attack orders existed but resolved to no battles, or when the whole run totals zero battles. Keep battleless weeks visible under `behavioral_health.battleless_weeks`, but do not fail a healthy run just because of an operational lull.
9. **[2026-03-08] NEVER override initial OSIDs — not an option**
   Do instead: Initial OSID control comes from census/referendum data and is NEVER manually overridden. If sim doesn't match painted, fix the engine, OOB, operations, or scenario parameters — not init_control. This applies to ALL calibration work. No exceptions.
10. **[2026-03-04] Override direction law — CRITICAL, confusing them causes -0.7pp regression**
    Do instead: RS `avoided_osids` = fix RS OVER-captures (painted=RBiH/HRHB, sim=RS — prevent VRS from attacking there). RS `osid_control_overrides` = fix RS UNDER-captures (painted=RS, sim=RBiH — force-start RS control). Adding under-captures to avoided_osids makes RS even less likely to capture them.
## Engine Runtime Patterns
1. **[2026-03-05] Takeover displacement off-by-one FIXED**
   Do instead: `processDisplacementTakeover` Section 0 uses `currentTurn === warStartTurn + 1` (not warStartTurn). `runTurn()` increments turn BEFORE phases — first war turn = warStartTurn+1. Fixed in `displacement_takeover.ts`.
2. **[2026-03-08] Phase I/II terminology fully removed — Peace/War only**
   Do instead: No `PhaseI`, `PhaseII`, `phase_i_`, `phase_ii_` identifiers anywhere. Original `consolidation_flips.ts` deleted; replaced by cluster-aware `rear_pocket_consolidation.ts` (post-w20 auto-flip of surrounded 1-3 OSID clusters without defenders). Pipeline steps use clean names. Report keys use clean names. Canon v0.6: Peace and War phases only.
3. **[2026-03-08] Deep merging test mocks with nested state**
   Do instead: When mocking nested state structures (e.g. GameState partitioned into military/political/displacement), standard `...overrides` in mock state generators will overwrite nested structures entirely. You must manually deep merge nested properties or explicitly place the `...(overrides?.domain || {})` spread *inside* the corresponding nested object literal to ensure tests can accurately override specific sub-properties without losing hardcoded defaults.
