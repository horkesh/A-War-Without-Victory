# Napkin Runbook

**Location:** `.claude/napkin.md` - single runbook for this repo. Read and curate at session start. Update during work.

**Rules:** Max 10 items per category. Re-prioritize on every read (highest first). Merge duplicates, remove stale. Each entry: date + short title + "Do instead".

**Master files:** Calibration → `docs/40_reports/CALIBRATION_MASTER.md`; GUI (map + warroom) → `docs/40_reports/GUI_MASTER.md`; Warroom → `docs/40_reports/WARROOM_MASTER.md`; Real War → `docs/40_reports/REAL_WAR_MASTER.md`; Sectors → `docs/40_reports/SECTOR_MASTER.md`; **Bosniak-Croat Conflict → `docs/40_reports/BOSNIAK_CROAT_CONFLICT_MASTER.md`**. Do instead: When doing calibration, GUI, warroom, sector, realism, or HRHB-RBiH conflict work, read the relevant master first and update it during the session.

**Governing docs (read for any architecture, roadmap, or commander work):** Roadmap → `docs/plans/MASTER_ROADMAP.md` (single source of truth for all milestones, sequencing, and done-means). Repo health + commander intelligence audit → `docs/40_reports/audits/20260330_REPO_HEALTH_CONSOLIDATED.md` (external findings on overlapping ownership, commander maturity requirements, workstream sequencing — treat as a standing brief, not a one-time read).

**Player command model CANON (n717):** Player commands Army→Corps→Sector only. Brigades NEVER attack independently. Valid tactical levers: corps stance, sector stance, ops planning, logistics priority, OPSEC, sector override. Direct brigade attack/move orders are architecturally wrong.

## Current State (2026-04-06, v0.8.3 Phase 1 on main)
**2696/2696 vitest (187 files). v0.8.3 Phase 1 CLOSED. Commit: 86bac2e4.**
v0.8.3 Phase 1 delivered: `order_interpretation.ts` — deterministic compliance score engine (comp/agg/gap, reliabilityModifier=0 slot), 4 thresholds (full≥0.80/modified≥0.50/partial≥0.25/refused<0.25), cowed mechanic, acting_commander fast-path, patron ceiling. Type additions: OrderSnapshot, OfficerEventType+5, PendingOfficerEvent+5, NamedOfficerState+3. Dudakovic agg 5→4 (Historian). 12 new tests. Scope: stance only. Deferred: IPC wiring (Phase 2), operation interpretation (Phase 2), decay step (Phase 3), reliabilityModifier population (Phase 3), UI (Phase 4).
**v0.8.2 CLOSED (all 7 phases). v0.8.3 Phase 1 CLOSED. Next: v0.8.3 Phase 2 — IPC wiring + interpretOperationLaunch.**
Last combat calibration: n1344 93.3%, hash: 0e2fe6333394649a. n1323: 94.0%, 27/27, 6/6, 74 battles.
n1323 last combat-calibration baseline: 94.0%, 27/27 anchors, 6/6 benchmarks, 74 battles. hash: b3355614a82d13d7.
Previous ATH: n1315: 94.3%, 27/27. Previous: n1302: 93.7%, 25/25.
Commander Intelligence Overhaul (n1294–1301): must_hold 1.5× garrison (Brcko/Doboj), org readiness gate (zero main_effort → defensive), op scale cap by main_effort_count, enemy_concentration_zones from intel picture, coordination ±4%/pt officer competence, strength-based opportunity target ranking.

**ATH BASELINE: n1256 — 94.2%, 23/23 anchors, 6/6 benchmarks, 73 battles. hash: 5fa01bbdecc43f5f.**

**Open P1s:**
- **DRINA regression (~1.5pp)**: must_hold freed Drina brigades → eastern OSID overcapture. Investigate Drina Corps freed brigades → where they go.
- **boljanic_2 (Doboj)**: arbih_3rd_corps auto-generates ops from petrovo_2 adjacency; vrs_1st_krajina has no hold_osids for Doboj. rs_2nd_armored displaced to petrovo_2 (856 pers, morale 35). Fix: add boljanic_2 + adjacent Doboj OSIDs to vrs_1st_krajina hold_osids.
- **Ozren pocket** (petrovo_2, brijesnica_donja_2, vozuca_2): all flip RBiH w31–40 (historical fall: Sep 1995). Fix: add hold_osids to Ozren brigades; add petrovo_2 + brijesnica_donja_2 as RS anchors in scenario_runner.ts.
- **Casualty ratio discrepancy**: attack_resolution reports 0.814, anomaly_detection reports 0.63 — data source mismatch.
- **ZEA rate 47%** (up from 39%): op-scale cap narrowing eligible attacker pools.
- vrs_east_bosnian zero-attack ops (bounded: 2 ZEA ops at 6.7%, down from 47% — staging unreachability + Sarajevo siege); estimateTurnsActive broken suspend counter; jajce_falls turn_min 40→28; 3 stale ssid refs; P5 NATO air; P6 breakthrough.
- **RESOLVED this session:** P9 supply recalibration (graduated scoring + BFS corridor fix), estimateForceRatio supply awareness (demoted — practically inert), COMBAT-P14 (stale — feasibility check now includes defender modifiers).

**TWO OP SYSTEMS (architecture — do not confuse):**
1. **Legacy** `injectQueuedOperation` (`inject-queued-operations` step, BEFORE commander): consumes queued_operations for corps with pre-planned ops. `tryCreateFromPrePlanned` = dead code (queue already consumed).
2. **Commander** `tryCreateFromOpportunity`: runs AFTER legacy; only fires for corps with no pre-planned ops (arbih_1st, arbih_5th, etc.).

**Emergent proposals (not yet implemented):**
- Proposal 2: corridor-width garrison multiplier (`allocate.ts`, `ZoneAssessment.corridor_width`)
- Proposal 3: commitment-ratio Phase B eligibility filter

**[KNOWN INVARIANT] Army HQ reserve brigades may have no sector_id while idle.** Treat `vrs_main_staff`, `arbih_general_staff`, and `hvo_main_staff` elite reserve brigades as legitimate sectorless exceptions until loaned. Only active non-exempt field-corps brigades are sector-mandatory.

**Sector-mandatory means frontline-mandatory (2026-04-03):** Do not speak as if every active non-exempt field brigade must always sit in a sector. The stricter truth is narrower: if a brigade is not on, inside, or one hop behind a real hostile frontline, it is not a sector failure merely because it is active. `collectUnresolvedSectorBrigades(...)` must accuse only missing frontline owners, not allied/interior formations.

**Sector truth after late writers (2026-04-03):** Contiguity and enclave rescue are not enough by themselves. `corps_front_sectors` must finish with a final physical-ownership pass that strips brigades not physically on the sector front, in sector territory, or one hop behind as reserve. Emit unresolved warnings only after that pass.

**Frontline truth excludes reserves (2026-04-03):** `buildFrontlineAssignedFormationSet(...)` should use only `assigned_brigade_ids`. `reserve_brigade_ids` remain sector-owned but must not leak into fatigue, officer-quality, or reporting as if they are holding the line.

**`assigned_sub_segment_id` is live authority, not harmless residue (2026-04-03):** `commander_march_correction.ts` consumes `assigned_sub_segment_id` as a real command rail. When a brigade loses sector ownership, clear that field during sector sync so recalled reserves and unresolved brigades do not keep stale frontline destiny.

## Integration Test Suites (9 suites, WS6)
1. `tests/integration_deployment_health.test.ts` — app bootstrap, Electron readiness
2. `tests/integration_run_diagnostics.test.ts` — diagnose_run.cjs output validation
3. `tests/integration_run_summary.test.ts` — scenario runner summary format
4. `tests/integration_state_assertions.test.ts` — GameState invariant checks
5. Adapter integration — GameStateAdapter field path coverage
6. IPC integration — Electron main↔renderer message contract
7. Event lifecycle — event fire/suppress/chain/decision flow
8. Save/load — serialization round-trip fidelity
9. Scenario manifest — scenario JSON schema + baseline regression

## Session Startup (do these EVERY session — BEFORE any work)
1. **[2026-03-13] Check crons and schedule if missing — ALWAYS (two crons)**
   Do instead: Run `CronList` at session start. Crons are session-only and auto-expire after 3 days. **Re-schedule every session.** Two required crons:
   **(A) Daily Pyrrhic Standup** — cron `27 6 * * *`. Invokes /orchestrator to convene Pyrrhic team. Three phases: (1) Yesterday's retrospective (good/bad/ugly from `git log --since=24h`, ledger, life lessons), (2) Fresh game analysis (CALIBRATION_MASTER, REAL_WAR_MASTER, War-or-Game assessment), (3) Today's priorities — plan big and ambitious (3-5 items a team of AI agents can accomplish). Present everything via /visual-explainer as a war room briefing board. Full prompt stored in `memory/cron_daily_standup.md`.
   **(B) Life-lessons review** — cron `3 6 * * *`. Gather 24h git activity, detect life-lesson violations, synthesize new lessons, promote/demote, generate visual report via `/visual-explainer`.
3. **[2026-03-30] Write working-on.md at session START — ALWAYS**
   Do instead: Before writing any code, create `working-on.md` at project root capturing: what you're working on, current state, open tasks. Update it at each commit. Delete only at session closeout. This is a crash-recovery artifact — if the session dies, the next session reads it first. Do NOT wait until session end to write it.

## Post-Run Analysis Protocol (MANDATORY — orchestrator must not analyze directly)
After EVERY scenario run, the orchestrator:
1. **Collect raw data**: Run `compare_painted_vs_sim.cjs`, `diagnose_run.cjs`, `validate_run_consistency.cjs`. Present raw numbers ONLY.
2. **Dispatch Tier 1 — Investigators (in parallel)**:
   - `/scenario-creator-runner-tester` — calibration %, anchors, benchmarks, events, troop strengths, per-region breakdown
   - `/anomaly-triage` — anomaly detector output, pattern analysis, root cause flags
   - `/war-or-game` — realism: would a real commander find this absurd? P0/P1/P2 triage
   - `/operations-expert` — op health: failures, zero-eligible-attacker, staging, idle corps, order counts
   - `/sector-expert` — sector health: empty sectors, density imbalance, assignment gaps
   - `/formation-expert` — OOB: brigade counts, pool drain, dissolution, elite loans, militia spawns
   - `/historian` — historical plausibility: faction behaviour, territory, event timing vs BiH war record
3. **Dispatch Tier 2 — Analysts (after Tier 1 reports)**:
   - `/gap-finder` — design gaps implied by findings; **only analyst with authority to dispatch agents and question specialists directly**; dispatches `/railroad-hunter` when forced behavior suspected
   - `/game-designer` — design intent: bug or feature? mechanic consistency
   - `/corps-army-commander` — AI behaviour fixes given ops/sector findings
   - `/modern-wargame-expert` — representation audit: does UI truthfully reflect what the run showed?
   - `/canon-compliance-reviewer` — gate: do proposed solutions violate canon/phase specs?
   > `/railroad-hunter` — Gap Finder's sub-agent only; not a standing panel member. Classifies behavior as EMERGENT / RAILROAD / PARTIAL RAILROAD. Reports to Gap Finder.
4. **Synthesize**: Orchestrator collates all reports, attributes findings ("War-or-Game found X"), gives go/no-go. Does NOT add own analysis.
5. **Record**: Update CALIBRATION_MASTER with the run entry.

## Execution & Validation
1. **[2026-04-05] Claude report handoff protocol: treat report as claims, not truth**
   Do instead: When the user pastes a Claude/subagent report, do not synthesize from the pasted text alone. Inspect the actual repo changes, verify the claimed files and behavior locally, run the relevant checks yourself, correct overclaims, and if the lane is truly accepted, stage/commit it before replying. Always include the next prompt automatically after the verdict.
1. **[2026-03-27] Brigade front-lock investigations need both placement and history validation**
   Do instead: After any line-assignment/march fix, verify the target brigade in final_save has (a) `onSectorFront=true`, (b) no deep-rear friction OSIDs in `brigade_history.engagements`, and (c) fresh 40w run evidence recorded in PROJECT_LEDGER.
1. **[2026-03-11] NEVER claim a fix works without running the scenario and verifying the output**
   Do instead: After any bug fix, run a fresh scenario (`npm run sim:scenario:run:40w`), then write a diagnostic script to verify the specific bug is gone. Check for related issues (e.g. other code paths that do the same wrong thing). Always verify with data, never with assumptions.
2. **[2026-03-30 UPDATED] Two-tier post-run panel required after every calibration run — standing directive**
   Do instead: After every scenario run, dispatch the full two-tier panel (see §Post-Run Analysis Protocol). /war-or-game is Tier 1 investigator — its sign-off alone is NOT sufficient. Orchestrator issues go/no-go only after all Tier 2 analysts report. No phase is complete without Orchestrator go/no-go.
3. **[2026-03-11] One-change-then-verify calibration protocol (MANDATORY)**
   Do instead: (1) Change ONE parameter or fix ONE bug. Never bundle. (2) Run fresh 40w scenario. (3) Run comparison tool. (4) Dispatch two-tier post-run panel — Orchestrator issues go/no-go. (5) Record result in CALIBRATION_MASTER.md.
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
7. **[2026-03-20] Nested package installations for Map UI**
   Do instead: The tactical map UI is a completely separate workspace at `src/ui/map` with its own `package.json`. Commands like `npm run dev:map` run `cd src/ui/map && npx vite`. When adding UI dependencies (like `deck.gl`), you MUST run `npm install` inside the `src/ui/map` directory, not the project root. Root `npm install --legacy-peer-deps` can break the inner Vite installation.

8. **[2026-03-21] Deck.gl: formations (IconLayer) + settlement labels (TextLayer)**
   Do instead: **`deckFormationCounters` defaults `true`** — clean NATO IconLayer counters only (enrichments stripped). MapLibre `formation-markers`/`formation-labels` hidden. Zoom-interpolation: `16px` @ Z6 to `40px` @ Z14. **Settlement labels**: Deck.gl TextLayer (27 cities) — MapLibre symbol layers globally broken (0 rendered features). `fontSettings: { sdf: true }`, `characterSet: 'auto'` for Bosnian diacritics. `setSettlementLabelData()` feeds from `buildMajorCityLabelGeoJSON`. Sarajevo 5 muns merged to one label.
9. **[2026-03-26] UI screenshot automation on Windows uses Edge with puppeteer-core**
   Do instead: For scripted screenshot capture in this repo (root `package.json` has `"type":"module"`), use a temporary `.cjs` script with `puppeteer-core` and `executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"`. Avoid `.js` scripts with `require()` because they fail under ESM.
10. **[2026-03-26] Peace Plan modal can silently pollute UI verification screenshots**
   Do instead: Before capturing map UI screenshots, dismiss blocking overlays first (especially `PeacePlanModal` via `Reject Plan`/`Accept Plan`), then verify the target surface is visible in the first capture before batch runs.

## GUI / Map
1. **[2026-03-27] Command sidebar `top` is global crest clearance — looks empty on the left**
   Do instead: Before changing `--awwv-toolbar-clearance`, read [20260327_COMMAND_SIDEBAR_LAYOUT_KNOWLEDGE.md](../docs/40_reports/implemented/20260327_COMMAND_SIDEBAR_LAYOUT_KNOWLEDGE.md). Left rail shares clearance with crest; **split variable or z-index overlap** if tightening; re-verify `PresidentialToolbar`, dev strip, `CommandBriefingLayer`.
2. **[2026-03-26] BottomStatusStrip layer toggle mapping must stay in lockstep with `mapModes.ts`**
   Do instead: When adding/removing keys in `DEV_LAYER_TOGGLES` or `LIVE_LAYER_TOGGLES`, update `BottomStatusStrip.tsx` local `toggles` map in the same change. Missing keys cause runtime crashes (`Cannot read properties of undefined (reading 'value')`).
3. **[2026-03-26] HOI visual spec path can drift between docs**
   Do instead: Before GUI planning/implementation, verify the authoritative `HOI_VISUAL_GUI_OVERHAUL_SPEC.md` path exists; if requested path is missing, flag ambiguity and proceed using `GUI_MASTER.md` + `TACTICAL_MAP_SYSTEM.md` until clarified.
4. **[2026-03-26] Fullscreen overlays must use two live information regions**
   Do instead: For overlay density fixes (Chronicle, Reserve, Ops), avoid single narrow strips; keep one primary timeline/list region plus a concurrent detail/dossier region to consume width without changing mechanics.
5. **[2026-03-25] OSID display names: human-readable, no duplicates**
    Do instead: `osidDisplayName.ts` handles both GeoJSON-sourced and fallback paths. `humanizeOsid()` strips `op:` prefix, `_2` cluster suffix, title-cases, appends municipality only when different from name. `formatSettlementDisplayName()` strips `(+N)`, same dedup rule. "Simin Han (Tuzla)" not "simin_han_2". "Tuzla" not "Tuzla (Tuzla)".
6. **[2026-03-27] Electron IPC Contract: `useIPC.ts` is the single source of truth**
    Do instead: When adding Electron handlers to `electron-main.cjs` and `preload.cjs`, you MUST update the `WindowAwwv` interface and hook in `src/ui/map/desktop/useIPC.ts` immediately. Do not use legacy `bridge.ts` or standalone IPC calls.
7. **[2026-03-27] Decommissioned 1991: April 1992 is the sole entry baseline**
    Do instead: Use April 1992 (`apr_1992`) as the starting scenario for all campaign work. `sep_1991` is decommissioned and should not be referenced in new code or scenarios.
8. **[2026-04-03] Map-first principle: toolbar/shortcut affordances open map-local surfaces when they exist**
   Do instead: Route toolbar buttons and keyboard shortcuts to map-local panels (OperationsPanel, WarSummaryModal) for quick-glance interactions. Route to Army HQ only when no map surface owns that concept (AAR, personnel, briefing drill-down). The map-local surface should always provide an explicit "HQ Review" handoff for deeper investigation.
8. **[2026-03-20] G-2 prediction — DONE (WS5)**
   Do instead: Engine returns `OperationPredictionResponse` (`axes`, `totalEstimatedCasualties`, commander `sections` as `{enemy, ownForces, assessment}`). UI expects `PredictionResult` — normalize in `usePrediction` (`normalizeOperationPredictionResponse`). G-2 phase fully wired in ops modal flow.
9. **[2026-03-26] Browser-driven UI walkthrough: ESC can open Pause overlay**
   Do instead: When auditing `src/ui/map` via browser automation, avoid `Escape` for closing overlays unless the overlay explicitly advertises `[ESC]`; otherwise it may open the Pause menu and pollute screenshots/findings.
10. **[2026-03-26] War Summary/Summary focused tabs should render only focused section**
   Do instead: When `SituationTab` is used with `focusSection` (Army HQ `SUMMARY` and War Summary modal), render only that section card and suppress overview/snapshot/alliance/alerts blocks to avoid duplicate-content dead space.
11. **[2026-04-02] Warroom command prose must derive from snapshot truth or stay generic**
   Do instead: In `src/ui/warroom`, never hardcode confident lines like safe convoys, calm enclaves, or fake-specific staff authorship unless `extractWarData(...)` actually proves them. Warroom is a player-facing shell, not a narrative wrapper for hidden truth.
9. **[2026-03-26] Toolbar-clearance verification must include live + dev contexts**
   Do instead: For top-toolbar clearance checks, always capture one no-dev-strip (`?live=1`) shot and one dev-strip shot with side panels visible, then state overlap verdict explicitly in the report.

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
**All P3 items RESOLVED (2026-03-25).** Gorazde: Operation Circle event flips 3 OSIDs. Hrasnica: 102nd relocated to Hadzici (refugee brigade). Remaining: `op:gorazde:kolovarice` mismatch (needs /historian research).

**Ops engine backlog (2026-03-28):**
- **[P1] Bake initial OSID control into scenario JSON (2026-03-31)** — initial `political_controllers` currently derived at runtime from municipality-level data → wrong per-OSID assignments (e.g. all Stolac/Capljina OSIDs init as RS, blocking Op Jackal staging). Fix: write explicit `initial_osid_controllers` map into scenario JSON (one-time curation per scenario); read it at init instead of deriving. Discovered during Op Jackal root-cause investigation. Historian must determine correct April 1992 per-OSID controllers for Stolac/Capljina before Op Jackal can be fixed.
- **[P1] `validateOpAtInjection()`** — engine-level validation firing at op injection. Five failure modes to catch: (1) non-existent OSID objectives, (2) staging not adjacent to first-objective path, (3) brigade doesn't exist at injection turn, (4) all objectives already friendly-controlled, (5) cross-corps axis assignment. Stop patching individual ops; fix the engine.
- **[P2] Check #12 false positive** — `operation_zero_eligible_execution` flags Op Drina + Op Visegrad (consolidation sweeps). Fix: one-line exclusion `if (op.success && op.captures > 0 && op.attacks === 0) skip`. Files: `anomaly_detector.ts`.
- **[P2] Ghost sector investigation** — 5 empty sectors with front edges. `phantom_sector_advantage` check #11 may be reading the wrong fields to detect these. Verify which field represents "sector has no brigades" in the anomaly detector vs the sector data structure.
- **[P2] Op Foča `rs_kalinovik_brigade`** — `home_osid` is `zavait_3`, should be `kalinovik_2`; Kalinovik staging OSID not adjacent to `varos_2`. Brigade stranded at injection.
- **[P2] Op Herzegovina Consolidation** — `rs_2nd_herzegovina` spawns w20 but op fires w12 → axis always dropped. Either delay op to w22+ or find a w12-eligible replacement brigade.
- **[P2] Op Donji Vakuf** — `rs_19th` dissolves before injection; 2 objectives (`torlakovac_2`, `babin_potok_2`) always pre-captured. Need dissolution-resistant brigade assignment + conditional objective guard.
- **[P3] Op Kotor Varos** — 1KK queue always full w10-w40; Kotor Varos never gets its op. Design queue priority mechanism or dedicated 2KK handoff.

**Engine health quick wins (2026-04-02) — all ≤30 lines, high-confidence fixes:**
- **[P1] Combat predictor blind to defender multipliers** — `checkLaunchFeasibility()` uses `basePower × 0.8` only; ignores defender artillery (`getDefensiveFireMult` up to 1.8×), terrain (urban 1.35×, forest 1.15×), entrenchment (+51%). **Primary driver of 47% ZEA rate.** Fix: multiply defender raw power by these factors before computing required force. File: `bot_corps_directives.ts`. ~30 lines.
- **[P1] `recent_territory_change` hardcoded 0** — `assessCorps()` returns 0 always. Theater Assessment trend-blind. Fix: count Δ(friendly_osids) over last 3–5 turns. File: `src/sim/combat/commander/assess.ts`. ~20 lines.
- **[P1] `supply_by_osid` never consumed by briefing** — hardcoded 0.8. Fix: read supply for sector OSIDs, derive min/mean, pass to briefing. File: `src/sim/combat/commander/briefing.ts`. ~15 lines.
- **[P2] Feint has zero enemy effect** — applies −5 cohesion to own brigades only. Fix: when feint active on sector, raise enemy sector threat_ratio ×1.5 for the duration. File: `src/sim/combat/sector_offensive.ts`. ~20 lines.
- **[P2] Corps exhaustion not in briefing** — field exists in state, never passed. Fix: single lookup. File: `briefing.ts`. ~5 lines.
- **[P2] Enemy equipment absent from briefing** — Fix: derive `{ artillery, tanks, infantry_only }` from adjacent enemy brigades. File: `briefing.ts`. ~25 lines.
- **[P2] Op-level failure cap broken (Issue #29)** — cap applied per-axis (8 failures each), not per-operation. File: `sector_offensive.ts`. ~10 lines.
- **[P2] Winter season combat modifier absent** — Fix: `getSeasonalCombatMult(week)` ~15% attacker penalty weeks 1–8 and 48–52. File: `combat_math.ts`. ~15 lines.
- **[P0] CampaignPlan not wired to corps CO briefings** — `army_hq_gathering.ts` produces `CampaignPlan` every turn; `buildBriefing()` never reads it. Strategic layer structurally disconnected. Needs design first. File: `commander/briefing.ts`. ~30 lines wiring, but requires design of how priorities map to briefing fields.

**Deferred to roadmap:**
- Front Line Terrain Tinting (P4) → v0.9.4 (Map That Scars milestone)
- Elevation Profile on Ops Axes (P4) → v0.9.4 (visual polish)
- **Explicitly rejected:** LOS cones, full 3D main map, 3D battle replay, threat heat layer, pulsing markers.

## Simulation Engine
1. **[2026-03-07] Phase C supply agency lives in patron_pressure + supply_reserves, not a separate subsystem**
   Do instead: Keep IVP consequence hysteresis in `patron_pressure.ts`; keep convoy/smuggling/tunnel hooks in `supply_reserves.ts`.
2. **[2026-03-07] Composite IVP extends the existing patron-pressure system**
   Do instead: Extend `patron_pressure.ts` and `international_visibility_pressure`, not a parallel IVP subsystem.
3. **[2026-03-03] Supply reserves: gated + pocket threshold + isolated source + heavy weapon drain**
   Do instead: All reserve logic gated by `state.meta.supply_reserves_enabled`. SIEGE_MIN_POCKET_SIZE=8. `findHeartlandComponent()` for isolated sources. HEAVY_MAINTENANCE_PER_WEAPON=0.001.
4. **[2026-03-01] OSID/SID mismatch — never use getEffectiveSettlementSide for control**
   Do instead: `political_controllers` keyed by OSIDs in war phase. Use `buildMunControlFromOsids()` or `buildMunDominantController()`.
5. **[2026-03-21] Displacement: event `displaced` = total removed (killed/fled are subsets)**
   Do instead: Use `getOsidCensusPopulation(osidRec)`. In event log, `displaced` means total people removed — `killed` and `fled_abroad` are subsets, NOT additional. Adapter: `out = displaced` (not `displaced + killed + fledAbroad`). `departedByOsid` uses `displaced` as total. Municipality `displacement_state` has separate non-overlapping `displaced_out` + `lost_population`.
6. **[2026-02-24] OSID-keyed political_controllers init + load migration**
   Do instead: Check `isPoliticalControllersAlreadyOsidKeyed()` first. `migratePoliticalControllersToOsidIfNeeded` only for canonical SIDs.
7. **[2026-02-28] Operational control: majority then plurality**
   Do instead: Assign faction by ethnic majority (>50%), else plurality. Not "first ≥40%".
8. **[2026-02-22] Pipeline step no-ops for missing data**
   Do instead: When operational data unavailable, log and skip OSID steps safely rather than crashing.
9. **[2026-03-08] Paramilitary rear pocket cleanup: `paramilitary_sweep.ts`**
   Do instead: Autonomous paramilitary units for rear enemy pocket clusters (1-3 OSIDs, ALL external neighbors faction-controlled). Active w0-20. Faction rates: RS=0.85, HRHB=0.55, RBiH=0.30.
10. **[2026-03-28] Point-only polygon contacts are not real adjacency — shared_segments >= 1 required**
    Do instead: Contact graph edges with `shared_segments=0` are artifacts (single snapped vertex, no boundary segment). 46 total, 12 cross-faction (e.g. sela_2-golubici_2 bridging Trnovo-Kalinovik). Sector system, territory contiguity, and front edges must filter to `shared_segments >= 1`. 1,979 real segment contacts vs 46 point-only artifacts.

## Bosniak-Croat Conflict (HRHB-RBiH War)
1. **[2026-03-19] Mobilization phase — 4-turn buildup (IMPLEMENTED)**
   Do instead: `isRbihHrhbMobilizing()` / `isRbihHrhbCombatEnabled()` in `alliance_update.ts`. Front edges appear at ≤0.20 (ALLIED_THRESHOLD). Combat suppressed for `MOBILIZATION_DURATION_TURNS=4`. Gates in `bot_brigade_eval_attack.ts`, `bot_corps_directives.ts`, `attack_resolution_osid.ts`, `battle_resolution.ts`.
2. **[2026-03-19] Condition-driven war events — no hardcoded dates (IMPLEMENTED)**
   Do instead: `war_1993.json` events fire on `alliance_below` + `faction_controls_municipality` conditions. Gornji Vakuf: alliance<0.45 + player decision. War begins: alliance<0.10. Ahmici: requires war + HRHB controls Vitez.
3. **[2026-03-19] hvo_central_bosnia activation — war-phase activate-corps step (IMPLEMENTED)**
   Do instead: `war_phases.ts` step `activate-corps` creates corps formations from OOB at their `available_from` turn. CB activates at w10. Without this, CB never exists as a formation in war-start scenarios. Pipeline: 140 steps.
4. **[2026-03-19] Sector consolidation: brigade-presence protects enclave corps (IMPLEMENTED)**
   Do instead: `consolidateCrossCorpsFronts` in `sector_territory.ts` — if ANY edge in a component has a brigade of the minority corps, protect ALL edges of that corps in the component. Without this, isolated enclave corps (CB at Kiseljak) get drained edge-by-edge.
5. **[2026-03-19] HRHB readiness: no reversion from active to forming (IMPLEMENTED)**
   Do instead: `deriveReadinessState` in `formation_lifecycle.ts` — once past forming, low cohesion → overextended/degraded, NOT forming. Without this, all 29 HRHB brigades oscillated active↔forming every turn.
6. **[2026-03-31] HVO CB prep for 1993-war activation (BACKLOG)**
   Do instead: hvo_central_bosnia zero battles in 40w is HISTORICALLY CORRECT (Lašva Valley war didn't start until 1993). Prerequisite work before 1993-war scenario: (1) CB brigade redistribution — 5/6 sectors empty, brigades cluster in Zenica sector; (2) CB operations not launching in 52w scenario; (3) Kiseljak/Vitez pocket separation. Address in HRHB-RBiH war feature branch, not 40w calibration.

## Bot AI & Combat
1. **[2026-04-01] Commander correction pass — step 153 in war_phases.ts (n1278)**
   Do instead: `commander-correct-march-orders` step 153 calls `correctMarchOrders` + `correctTransitStates` in `commander_march_correction.ts`. Commander is now the authority on brigade positioning — corrects wrong-destination orders and stale transit states each turn. Sub-segment IDs use `sector_id` prefix (not `corps_id`): format `subseg:sector:${sectorId}:split${n}`. Verify ID format when debugging stale ssid references.
2. **[2026-03-13] Triple-junction adjacency: standard for grouping, strict for splitting (n664→n682)**
   Do instead: `buildEdgeAdjacency` (33m `frontEdgeAdj`) for sub-segment grouping (Steps 1-3). `buildEdgeAdjacencyStrictCaseB` for contiguity split (Step 4b): Case A always, Case B only when both fi-H and fj-H in strict adjacency (≤5.5m `SHARED_BOUNDARY_THRESHOLD`). Standard Case B bridges front edges on opposite sides of enemy pockets (e.g. dragoradi↔olovo_2 via krivajevici at 16.9m); strict Case B cuts these. Municipality guard on `mapOsidsToCorps` Phase 2 BFS prevents corps territory race.
3. **[2026-03-14] Supply gate strips all offensive targets when critical_fraction > 0.5**
   Do instead: `assessCorpsSupplyHealth` in `bot_corps_directives.ts` clears `offensiveTargets` when >50% brigades critical supply AND upgrades `min_attack_outcome` to `costly_victory` when adequate_fraction < 5%. Besieged pockets (Orašje) are always critical supply — stance change alone won't enable attacks. This is correct and historically accurate.
4. **[2026-03-11] RS three-phase doctrine — organic tempo decay (n579)**
   Do instead: w0-12 blitz (0.35/0.15), w12-26 sustained (0.25/0.08), w26+ consolidation (0.20/0.05). Late-war params have ZERO calibration effect. Early-war intensity is the primary lever.
5. **[2026-03-10] Enclave defense overhaul — Sarajevo holds (n524→n527)**
   Do instead: `ALWAYS_BESIEGED_ENCLAVES` forces Sarajevo strained supply. `initial_resilience=20`. `getEnclaveGarrisonPower()` adds civilian defense volume. Urban mult 2.0×. `URBAN_TANK_TERRAIN_FLOOR=1.7`. Key lesson: personnel ratio trumps multipliers — need raw volume.
6. **[2026-03-11] RBiH defensive w0-15, restrained balanced w15-56**
   Do instead: ARBiH defensive through w15, then balanced with low attack share (0.12) and negative aggression (-0.05) through w40.
7. **[2026-03-12] Operation Preparation System IMPLEMENTED**
   Do instead: `operation_preparation.ts` — 5-phase state machine (intel_gathering→force_staging→supply_check→assessment→ready). Commander personality drives tempo. Probes as sub-actions. `tickPreparation()` in pipeline. UI: `CommanderSelectionModal.tsx` + `OperationBriefingModal.tsx`. 45 tests. Player `force_launch` override. Intel-gated launch gate in `bot_corps_directives.ts`.
8. **[2026-03-14] Graz Accords / Local Truces — faction-level block (n697)**
   Do instead: `src/sim/local_truces.ts` — fires at week 4. Faction-level block: when Herzegovina truce active, ALL RS corps (except vrs_1st_krajina, vrs_2nd_krajina) blocked from HRHB. Corps-pair truce (Herzegovina) + Kiseljak OSID exclusion. Cold fronts: `isColdFront()` exempts from attrition/bombardment.
9. **[2026-03-07] Pre-planned VRS operations (5 corps only) + JNA ghost Kupres**
   Do instead: `injectPrePlannedOperations(state)` sets corps to `offensive` PERMANENTLY. Only original 5 corps. 2KK has NO pre-planned op.
10. **[2026-03-10] Cross-corps sector assignment must stay hard-blocked**
    Do instead: In `classifyBrigadesByTerritory`, never assign a brigade to another corps sector. All fallback paths must preserve brigade corps ownership.

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
8. **[2026-03-28] Op axis drops silently when assigned brigade spawns after op injection**
   Do instead: Check `available_from` turn for every axis brigade against the op's injection turn. If brigade spawns after injection, axis is silently dropped — no error, no fallback. Either delay the op past `available_from` or assign an earlier-spawning brigade. Affected: Op Herzegovina Consolidation (`rs_2nd_herzegovina` spawns w20, op fires w12).
8. **[2026-03-28] foca_valley axis is always organically captured — don't add it to Op Foča**
   Do instead: VRS brigades naturally occupy foca_valley before Op Foča fires. Adding it as an op objective creates phantom work. Only include axes where VRS needs explicit operation-level force to capture territory.
8. **[2026-03-06] Proof lane + eligible-attacker boundary**
   Do instead: Run `tests/scenario_vrs_operation_proof.test.ts` before wide calibration work.
9. **[2026-03-05] Opening operations: explicit rosters + named ops own brigades**
   Do instead: For April 1992 VRS opening ops, use explicit `participating_brigades`, `sector_id`, `staging_osid`.
10. **[2026-03-19] Post-op brigade return march — immediate column march on op completion**
    Do instead: `issuePostOperationReturnMarches()` in `sector_offensive.ts`. Fires at recovery completion for ALL participants outside home municipality (no distance threshold). Orders consumed by `osid-column-movement` (step 496) next turn. Existing `return-displaced-brigades` (step 608) only catches >3 hops + runs every 4 turns. Pipeline order: step 496 osid-column-movement → step 517 apply-brigade-movement → step 608 return-displaced → step 708 advance-sector-offensives. Column-stance orders from step 708 survive to next turn's step 496.

## GUI / HoI Map
1. **[2026-04-01] Fog is not enough - player-facing state must be filtered before render**
   Do instead: Treat desktop / tactical-map player knowledge as a data-boundary contract. Do not ship near-full GameState to the renderer and trust fog or panel discipline to hide it later. Raw ids like `arbih_3rd_corps`, raw sector ids, and enemy/internal ops belong only in explicit debug surfaces.
2. **[2026-04-02] PresidentialToolbar is the live shell; Army HQ RECORDS owns history**
   Do instead: Start shell/navigation work from `PresidentialToolbar.tsx`, not the older `TopToolbar.tsx`. Route AAR and operation history through Army HQ `RECORDS`; tactical-map ops UI should stay a field snapshot and hand command review off to HQ.
3. **[2026-04-02] Army HQ SUMMARY is player-safe, not an all-faction scoreboard**
   Do instead: Keep own-side exact territory/personnel/casualty values in `WarSummaryContent`, allow theater-wide aggregates when useful, and push enemy-wide totals back into staff abstractions instead of exact comparison tables.
1. **[2026-03-15] Unified bottom strip: map modes + territory + toggles**
   Do instead: `BottomStatusStrip.tsx` is the single bottom bar: `[Map Mode Pills] | [Territory % area-weighted] | [Layer Toggles]`. z-20 (above map, below panels z-50-100). `MapModeToolbar` exists but is NOT rendered. Territory % uses km² from `osid_areas.json`. 7 modes (keys 1-7): Political, Ethnic, Supply, Casualties, Morale, Operations, Defense. Pressure/density modes removed (broken/redundant). Casualties + morale use continuous `interpolate` gradients. 7 layer toggles: Front, Units, Labels, Minimap, Fog, Battles, Points.
2. **[2026-03-11] GameStateAdapter is the single chokepoint — check paths FIRST**
   Do instead: Fields live under namespaced paths (`state.military.*`, `state.displacement.*`). Wrong path silently returns `undefined`. `departedByOsid` must accumulate `displaced+killed+fled_abroad`. See `memory/gui_debugging.md`.
3. **[2026-03-07] Settlement panel: 3 horizontal tabs, nation labels, current ethnic**
   Do instead: Overview | Military | Orders & events. `ethnicityOrFactionToNationLabel`. `getCurrentEthnicForOsid`. See TACTICAL_MAP_SYSTEM §13.2.
4. **[2026-03-07] Command briefing routing lives in `App`, not the toolbar**
   Do instead: Mount briefing as thin overlay in `App.tsx`, fed by `GameStateAdapter.commandBriefing`.
5. **[2026-03-20] MapLibre + Deck.gl Hybrid strategy: Deck.gl for tactical overlays.**
   Do instead: Use MapLibre for the terrain/base map and synchronized Deck.gl layers for dynamic tactical elements (counters, glows, previews). Deck.gl is superior for game-like overlays.
6. **[2026-03-19] Modal MapLibre: two init-timing traps**
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
9. **[2026-04-03] Test discovery must be automatic**
   Do instead: Treat `tools/test/discover_test_files.mjs` as the single authority for classifying Vitest vs `node:test` files. Do not reintroduce hand-maintained Vitest include lists; new regression files should become runnable by convention.

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
1. **[2026-03-21] 5 post-pipeline assertions in war_phases.ts (140 steps)**
   Do instead: When adding code that mutates formations, political_controllers, or operations, the pipeline assertions will catch invariant violations at runtime. If an assertion fires, fix the source — never disable the assertion. Files: `assert_control_events.ts`, `assert_operation_lifecycle.ts`, `assert_formation_territory.ts`, `corps_front_sectors.ts` (assertSectorBrigadesActive + assertBrigadeReachability).

## Engine Runtime Patterns
1. **[2026-03-05] Takeover displacement off-by-one FIXED**
   Do instead: `processDisplacementTakeover` uses `currentTurn === warStartTurn + 1`. `runTurn()` increments turn BEFORE phases.
2. **[2026-03-08] Phase I/II terminology fully removed — Peace/War only**
   Do instead: No `PhaseI`, `PhaseII` identifiers. `rear_pocket_consolidation.ts` replaces deleted `consolidation_flips.ts`.
3. **[2026-03-08] Deep merging test mocks with nested state**
   Do instead: Standard `...overrides` overwrites nested structures entirely. Manually deep merge or spread inside the nested object literal.

4. **[2026-04-03] Sector merge rule â€” shared friendly-side OSIDs are not enough**
   Do instead: A sector merge is legal only if the merged edge set still forms one contiguous frontline. Never short-circuit adjacency just because sectors share a friendly-side OSID; that is how separate hostile pockets get re-glued into one fake sector.

5. **[2026-04-03] Sector invariant — one sector = one frontline**
   Do instead: Treat sectors as commanded frontline slices, not OSID/sub-segment buckets. If a saved sector still carries multiple sub-segments, that is invalid state to rebuild or split, not a tolerated variant.
6. **[2026-04-03] Commander review may not rewrite frontline truth without movement**
   Do instead: If a brigade's current `location_osid` is on a sector frontline, treat that sector as anchored truth. Commander review may stage reserves and rear units, but it must not paper-transfer a physically front-anchored brigade into another sector roster.
7. **[2026-04-03] Cross-corps enclave rescue needs a physical claim, not just component membership**
   Do instead: `assignCrossCorpsEnclaveDefenders(...)` may rescue a brigade into another same-faction corps sector only when the brigade's current location is already on that sector's frontline or inside its territory. Same-component fallback alone is false sector truth.

## Player Shell Discipline
1. **[2026-04-02] Player-facing operation documents must never print raw OSIDs**
   Do instead: OPORDs, objective lists, and HQ roster/history hover rows must resolve settlement labels through player-safe helpers. Exact internal identifiers belong only in debug-only surfaces.
2. **[2026-04-02] Warroom faction overview stays strategic**
   Do instead: Warroom may summarize command posture, but detailed formations, personnel rosters, reserve handling, and commander reassignment belong to Army HQ. If Warroom starts doing those things again, it is stealing ownership from the command shell.
3. **[2026-04-02] Tactical map must always show the way back to Warroom**
   Do instead: If desktop IPC is available or the map is embedded, the mounted tactical toolbar must expose a visible `WARROOM` return affordance. A hidden bridge method in legacy code is not enough.
4. **[2026-04-03] Missing roadmap priorities must become plans before code**
   Do instead: If sector/frontline truth, UI density, shell cohesion, or product architecture simplification becomes a near-term priority, make sure there is an execution-grade Pyrrhic plan in `docs/plans/` before implementation starts.
5. **[2026-04-03] Canonical and operational edge universes must be bridged explicitly**
   Do instead: When sector/frontline code consumes canonical settlement edges but sectors own OSID frontier edges, normalize edge IDs at the boundary. Never let mismatched geometry silently collapse activity or pressure to zero.
6. **[2026-04-03] Windows-safe local CLIs are part of the repo contract**
   Do instead: Critical scripts should invoke local package entrypoints directly or provide repo-local wrappers like `tsx.cmd` / `vitest.cmd`. Do not rely on `.bin` shims or PATH luck inside nested npm/shell hops.
