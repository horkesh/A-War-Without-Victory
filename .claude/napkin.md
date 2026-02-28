# Napkin Runbook

**Location:** This napkin lives at **`.claude/napkin.md`**. It is the single runbook for this repo. Use this file at session start and update it during work. Do not use `.agent/napkin.md` or other napkin paths for runbook content.

**Rules:** Format and curation follow the [Napkin SKILL](https://github.com/blader/napkin/blob/main/SKILL.md): read and curate on every session start; keep recurring high-value guidance only; each entry has date, short title, and explicit "Do instead"; max 10 items per category; re-prioritize by importance.

## Curation Rules
- Re-prioritize on every read (highest first).
- Merge duplicates and remove stale/low-signal notes.
- Keep only recurring, high-frequency guidance.
- Each item includes date + "Do instead".
- Enforce category caps (max 10 per category).

## Execution & Validation (Highest Priority)
1. **[2026-02-25] Determinism is sacred**
   Do instead: No `Math.random()`, no timestamps, no `Date.now()` in run folders. Use sorted iteration via `strictCompare`. Sorted SID/edge keys. Use monotonic `.run_counter` for unique run folders.
2. **[2026-02-21] Smoke-test triad after every change**
   Do instead: Run `tsc --noEmit`, `vitest run`, and `desktop:map:build` as the standard smoke check.
3. **[2026-02-20] Fix ALL failing tests**
   Do instead: Fix all failing tests even if they seem unrelated to the current change. Standing user directive.
4. **[2026-02-13] Verify edits actually applied**
   Do instead: After edits, verify with `ReadFile` + `git diff`. Use scripted replacement if mismatch detected.
5. **[2026-02-22] Never auto-rebaseline golden tests**
   Do instead: Keep failing baselines as known failures pending canon/data authority review. Refresh only after user/PM sign-off per `TEST_BASELINE_STRATEGY.md`.
6. **[2026-02-21] Refactor-pass between phases**
   Do instead: After each implementation phase, do a refactor-pass (dead code, duplicates, unused imports) then run smoke-test triad before proceeding.
7. **[2026-02-11] Preserve shared type exports during refactor**
   Do instead: Keep `export type { ... }` statements; removing them breaks downstream consumers silently.
8. **[2026-02-13] Close handoffs with evidence**
   Do instead: After a roadmap or handoff, close with run evidence + decision memo + cross-link. Do not leave ambiguity open.
9. **[2026-02-24] Scenario checkpoint lengths**
   Do instead: Use 20w/30w checkpoint runs for iteration; reserve 52w runs for acceptance only.
10. **[2026-02-22] Fixture/schema: add dummy fields proactively**
    Do instead: Add null/dummy values for new required fields in test fixtures during refactor, not after tests break.

## Shell & Command Reliability
1. **[2026-02-07] Windows shell separator**
   Do instead: On Windows PowerShell, use `;` not `&&` to chain commands.
2. **[2026-02-07] Use node_modules/tsx directly**
   Do instead: Use `node_modules/.bin/tsx` directly instead of `npx tsx` which can hang on Windows.
3. **[2026-02-07] npx tsx --test can hang**
   Do instead: Run faster unit subsets first; use `npm run test:vitest` for the Vitest suite.
4. **[2026-02-13] Validate paths with glob before use**
   Do instead: Stale paths break silently. Skills live at `.claude/skills/*` now — validate with glob.
5. **[2026-02-22] OneDrive file lock retries**
   Do instead: Implement retry logic when encountering file-lock errors from OneDrive.
6. **[2026-02-28] Monorepo TS checks vs nested UI package**
   Do instead: When `npx tsc --noEmit` at repo root fails on JSX config mismatch, verify the changed UI package with its own build (`src/ui/map: npm run build`) and report root failures as pre-existing unless introduced by your edits.

## Imports & Build
1. **[2026-02-07] Martinez ESM import**
   Do instead: `import * as martinez from 'martinez-polygon-clipping'` (not default import).
2. **[2026-02-07] JSTS deep imports**
   Do instead: Import from `jsts/org/locationtech/jts/io/*.js` (not package root).
3. **[2026-02-07] Browser build: extract Node imports**
   Do instead: For browser-reachable code, extract Node-only imports to `*_utils.ts` files.
4. **[2026-02-21] Staged orders: accept both shapes**
   Do instead: Accept both legacy array and canonical record shapes for `brigade_attack_orders` / `brigade_mun_orders` to keep tests and desktop saves compatible.
5. **[2026-02-28] Vitest .js import path parity**
   Do instead: For test imports that use `.js` paths into `src`, ensure the target base path still exists (`foo.ts`/`foo.js`). If module moved, repoint the import to the current module path instead of leaving stale location imports.
6. **[2026-02-28] Storybook init scope guard**
   Do instead: Run Storybook setup inside `src/ui/map`, then verify it did not mutate root `vitest.config.ts`/root test tooling. Keep Storybook config isolated to the map package.

## Simulation Engine
1. **[2026-02-24] OSID-keyed political_controllers**
   Do instead: When init fills `political_controllers` by OSID, do NOT call `promotePoliticalControllersToOsid` (it expects SID-keyed state). Check `isPoliticalControllersAlreadyOsidKeyed()` first.
2. **[2026-02-28] Operational control derivation: majority then plurality**
   Do instead: In `derive_operational_political_control.ts`, assign faction by ethnic majority (>50%) when present, else plurality (largest share). Do not use "first group ≥40%" order — that made Vozuća RBiH despite 54.5% Serb.
3. **[2026-02-21] Consolidation is Phase I only**
   Do instead: `applyConsolidationFlips` must return 0 flips when `meta.phase !== 'phase_i'`. Phase II uses breach-based control change only.
4. **[2026-02-21] Front edges: 2D/3D single source**
   Do instead: Both 2D and 3D renderers read the same persisted `front_edges` from `LoadedGameState`/`ViewerSave`. `front_pressure` drives thickness/opacity deterministically.
5. **[2026-02-22] Pipeline step no-ops for missing data**
   Do instead: When operational data (contact graph, canonical_to_operational_map) is unavailable, log and skip OSID steps safely rather than crashing.
6. **[2026-02-21] Phase I->II: no initializeBrigadeAoR**
   Do instead: At Phase I to Phase II transition, use `phase-ii-location-osid-backfill` instead of calling `initializeBrigadeAoR`.
7. **[2026-02-24] Load migration for political_controllers**
   Do instead: `migrateState` on load: `migratePoliticalControllersToOsidIfNeeded` only when keys are known canonical SIDs (skip test fixtures like S1/S2).

## Bot AI & Combat
1. **[2026-02-25] RBiH general_defensive until week 52**
   Do instead: ARBiH must remain on `general_defensive` through week 52. "Balanced" before week 52 allows premature counterattacking.
2. **[2026-02-25] RS_EARLY_WAR_END_WEEK = 30**
   Do instead: RS transitions from `general_offensive` to `balanced` at week 30.
3. **[2026-02-25] Aggression scoring: additive + multiplicative**
   Do instead: Use flat additive (`aggression_modifier * 120`) PLUS multiplicative (`* (1 + aggression_modifier)`). Multiplier alone is ineffective on low base scores (stalemate=10).
4. **[2026-02-22] Pioneer attack seeding**
   Do instead: First brigade seeds concentration on directive target with 'repulsed' outcome; subsequent brigades join via `estimateConcentratedOutcome()`.
5. **[2026-02-25] Undefended capture: not for all factions**
   Do instead: Do not give all armies the ability to grab empty territory — it benefits RBiH more than RS and distorts historical outcomes.
6. **[2026-02-24] CorpsDirective must be complete**
   Do instead: Include `offensive_targets`, `hold_osids`, `avoid_osids`, `max_attackers_per_target`, `reserve_fraction`, `min_attack_outcome`, `aggression_modifier`.
7. **[2026-02-25] sidToMun map preservation**
   Do instead: Preserve `canonicalSidToMun` in scenario_runner.ts. Corruption prevented ALL 217 mandatory OOB brigades from spawning.

## Design Ideas (Deferred)
1. **[2026-02-28] Front segment assignment as ZoC alternative**
   If ZoC proves hard to tune: each front segment is a clickable entity; player assigns brigades and optionally specifies coverage width. Engine computes segment hardness = f(brigades, terrain, width). Mutual support = multiple brigades on same segment. Unassigned segments auto-contested. Explore if "too few brigades to cover the front" persists after calibration.

## GUI / HoI Map
1. **[2026-02-28] HOI spec = aesthetic authority; v2 doc = implementation**
   Do instead: Treat HOI_VISUAL_GUI_OVERHAUL_SPEC (docs/30_planning/...) as authoritative for look-and-feel; use AWWV_GUI_ARCHITECTURE_REWORK_v2.md for implementation. Sidebar: two tabs ARMY / SITUATION; panel interaction patterns §3.8 of HOI spec.
2. **[2026-02-28] Phase C complete: tooltips, MapModeToolbar, shortcuts, attack modal, order queue**
   Do instead: Rich tooltips use store tooltipTarget + tooltipPosition, 300ms delay; MapModeToolbar + MapLayerToggles bottom-right (C2.1); keys 1–4 = map modes, Enter = confirm primary action, Escape clears selection/tooltip/pending; AttackConfirmation modal; OrderQueue from stagedOrders. See docs/40_reports/phase_c/20260228_PHASE_C_GUI_IMPLEMENTATION_REPORT.md.
3. **[2026-02-28] Selection panel right-side positioning (React+MapLibre app)**
   Do instead: Use inline styles (position, left: auto, right, top, bottom, width, zIndex, direction: ltr) for overlay panels so Tailwind/purge/RTL cannot override. Dev-only `?showPanel=1` shows selection panel without map click for layout verification.
3. **[2026-02-26] Async terrain texture build**
   Do instead: Use `buildHoITerrainTextureAsync` yielding every 64 rows. Wrap `renderer.init()` in `Promise.race` with ~25s timeout; keep 2D placeholder on failure.
4. **[2026-02-26] Tooltip/hover/click: unconditional registration**
   Do instead: Tooltip, hover, and click registration must NOT be gated on `pendingData.formations?.length`. Register unconditionally.
5. **[2026-02-26] pointer-events on formation markers**
   Do instead: Set `pointer-events: auto` on `.hoi-formation-marker` (not `none`). Parent overlay layer stays `pointer-events: none`.
6. **[2026-02-26] Formation stacking**
   Do instead: Group by location. Overlapping formations: dense deck-of-cards stack (4px shift). Click selects top; stack unspools vertically (28px spacing) with z-index 100+.
7. **[2026-02-23] Political layer: reverse feature iteration**
   Do instead: In `buildControlLayer`, iterate features from N-1 down to 0 (reverse) so highest-Y features enter index buffer first, write depth, block double-blending.
8. **[2026-02-23] Tilt layer separation**
   Do instead: Use tight Y-offsets (0.001-0.005), `polygonOffset` on all layers, ortho camera `far=100`. For faction overlay, rasterize onto terrain mesh geometry texture.
9. **[2026-02-28] Sidebar hover-preview in React+MapLibre**
   Do instead: Drive map hover preview from store-owned `hoveredOsids` and a dedicated MapLibre outline layer (`sidebar-hover-outline`) with deterministic sorted OSID filters; brigade/corps hover events set/clear only this list.

## Desktop & Electron
1. **[2026-02-21] EPIPE guard on init logging**
   Do instead: Add EPIPE guard on Electron init logging to prevent crashes on pipe closure.
2. **[2026-02-21] Electron first-paint classes**
   Do instead: Use `warroom-scene-hidden` for menu and `warroom-desk-hidden` for maps to control first-paint visibility.
3. **[2026-02-21] Preload + getDataBaseUrl**
   Do instead: Use Preload script + `getDataBaseUrl()` for iframe/Electron data fetches.
4. **[2026-02-22] IPC read-only queries**
   Do instead: Add movement/combat preview handlers as read-only (`query-*`) IPC handlers. Compute from deserialized state without mutating.
5. **[2026-02-21] Corps staging: accept all formation kinds**
   Do instead: `stageCorpsFrontOrder` and `stageCorpsAttackAxisOrder` must accept `corps_asset` and `army_hq` (not just brigade/corps).

## Map & Geometry
1. **[2026-02-07] Voronoi: post-merge validation**
   Do instead: After boolean ops, add post-merge coverage/overlap validation per mun1990. Drive fixes from area-based diagnostics.
2. **[2026-02-23] Shared border vertex matching**
   Do instead: Use `borderVertexKey` with 1e6 rounding scale in `computeSharedBorders`. Dedupe and smooth border runs before storing.
3. **[2026-02-23] Front ribbons: border-based only**
   Do instead: Do not use centroid-to-centroid fallback ribbons — they create dark rectangular artifacts. Border-based ribbons at 84% coverage is acceptable.
4. **[2026-02-23] Consecutive border runs**
   Do instead: Collect shared vertices as consecutive runs along A's ring; draw one ribbon per run to prevent zig-zag diagonals.
5. **[2026-02-21] FRONT definition**
   Do instead: FRONT = where two hostile settlements meet (not "where brigade is present"). Assign units after segment length/name.
6. **[2026-02-22] Split-muni audit before rebuild**
   Do instead: Run `npm run map:audit:split-muni-duplicates` before any map rebuild.

## User Directives
1. **[Standing] Absolute paths**
   Do instead: Always use absolute paths for tool calls.
2. **[Standing] Update napkin during work**
   Do instead: Update napkin after significant changes; do not wait until end of session.
3. **[2026-02-28] Maximize safe parallel execution**
   Do instead: When tasks are independent, run them in parallel (subagents/processes/commands) to use available hardware fully; sequence only when there is a shared-file or dependency gate.
4. **[2026-02-28] Canon docs get implementation notes when tech changes**
   Do instead: When stack or tech changes (e.g. Canvas→MapLibre), add implementation notes in the relevant planning/spec doc and keep the aesthetic/design authority doc referenced from canon (context.md, CANON.md).
5. **[2026-02-25] Do NOT fix init control**
   Do instead: RS starting at ~35% is correct — isolated territories connected via early land grabs. Do not "fix" this.
6. **[2026-02-25] Counterattacks are correct**
   Do instead: Captured territory SHOULD be immediately reclaimable. Counterattacks are correct mechanically.
7. **[2026-02-22] Replay disabled by default**
   Do instead: Only generate replay with `--video` flag (saves 13.6GB).
8. **[2026-02-28] Canonical player-facing map is React+MapLibre app**
   Do instead: Run `npm run dev:map` for the canonical map GUI. Legacy map_hoi.html / tactical_map.html are archived; do not target them for new GUI work.
9. **[Standing] Address AoR/SID on encounter**
   Do instead: When you encounter AoR or SID in code, tests, or docs: address it (remove, replace with OSID, or document as legacy).

## Calibration
1. **[2026-02-25] Historical territory targets (year 1)**
   Do instead: RS should reach ~60-65% territory. ARBiH ~0% recaptured. ~25-35k military KIA all sides.
2. **[2026-02-25] Front stabilization timing**
   Do instead: Fronts should mostly stabilize by early October (~week 25).
3. **[2026-02-25] Winter slowdown**
   Do instead: Fighting dies down over winter. Current dead weeks (w32-39) is roughly right but accidental; needs intentional mechanic.
4. **[2026-02-25] RS init territory is correct at 35%**
   Do instead: RS starting at ~35% is by design. The gap to 60% target is closed via early land grabs, not init override.
5. **[2026-02-25] RBiH no counteroffensive until week 52**
   Do instead: ARBiH had NO meaningful counteroffensive until mid-1993. Enforce `general_defensive` through week 52.
6. **[2026-02-25] sidToMun corruption caused spawn failure**
   Do instead: Always verify spawn counts after init changes. Preservation of `canonicalSidToMun` is critical.
7. **[2026-02-25] Calibration knobs**
   Do instead: Primary levers: `POOL_SCALE_FACTOR`, `FACTION_POOL_SCALE`, `RS_EARLY_WAR_END_WEEK` (30), per-faction stance/doctrine in `bot_strategy.ts`.
8. **[2026-02-25] Knowledge base for OOB**
   Do instead: Use `docs/knowledge/{VRS,ARBIH,HVO}_ORDER_OF_BATTLE_MASTER.md` for historical formation data.
9. **[2026-02-24] Phase II entrenchment init**
   Do instead: Use optional scenario param `phase_ii_entrenchment_init_turns` (0..12) in schema and loader.
