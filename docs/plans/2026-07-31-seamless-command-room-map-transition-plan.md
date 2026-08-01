# Seamless Command Room to Tactical Map Transition Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date:** 2026-07-31
**Status:** COMPLETE LOCALLY — Phases 0–6 accepted; R2 shared-file handoff is unlocked
**Overseer:** Orchestrator
**Owner lane:** Performance Engineer + UI/UX Developer
**Independent reviewers:** Technical Architect, QA Engineer, Platform Specialist, Process QA
**Roadmap workstream:** R1
**Roadmap slot:** first autonomous execution packet / player-facing map performance
**Phase/workstream covered:** Electron shell navigation, tactical-map React lifetime, MapLibre/Deck lifetime, static map-data loading, packaged local HTTP caching, cold-entry bundle/network cleanup
**Current next action:** Integrate the reviewed R1 commits, then let R2 rebase its FR-03 shared files on the completed shell/map contract
**Collision rule:** Do not execute source-changing phases while the RS 104-week friction plan's FR-03 map-focus packet owns `App.tsx`, `MapContainer.tsx`, `shellNavigation.ts`, or `gameStore.ts`. Rebase or sequence this packet first; never merge two independent edits to those files by guesswork.
**Activation boundary:** `Execute the master roadmap` authorizes source implementation, tests, evidence, local commits, and transient local directory builds for this packet. It does not authorize push, tag, signing, upload, installer publication, or release-state change.

**Goal:** Make a correctly rendered, current-turn tactical map appear seamlessly when the player moves from the Command Room, without re-fetching static map data or recreating WebGL contexts on a warm transition.

**Architecture:** Treat the tactical map as a campaign-scoped workspace instead of a disposable screen. The React map viewport, primary MapLibre map, Deck overlay, and minimap remain mounted while a campaign is loaded; Command Room and map navigation change visibility, focus, and input ownership only. Static map resources are parsed once per renderer session, optional enrichment is staged after the meaningful first frame, and the Electron iframe URL remains stable. Debug-only monotonic measurements prove both cold and warm behavior without entering game state, saves, replay artifacts, or deterministic simulation output.

**Tech stack:** Electron, React, TypeScript, Zustand UI state, MapLibre GL, Deck.gl, Vite/Rollup, Playwright Electron automation, Vitest.

---

## 1. Roadmap Control-Plane Contract

This plan owns the following finite roadmap slice and no others:

1. **Exact workstream:** R1, Seamless Command Room <-> Tactical Map transition latency.
2. **Exact renumbering:** none.
3. **Exact dependency handoff:** R2 rebases its FR-03 shared files on the completed R1 implementation; R3 remains independent but is executed later by default.
4. **Reason:** owner-observed multi-second delay affects a primary repeated player route and comes from repeat cold-start lifecycle work, not optional visual polish.
5. **Sequencing risk avoided:** 1.0 must not accept a primary navigation path that repeatedly destroys and reconstructs the canonical player-facing map. The collision rule prevents this packet from racing the RS operation-map-focus work.

This amendment does not reopen simulation calibration, historical content, canon, save schema, packaging, versioning, tags, or release state.

---

## 2. Verified Baseline and Root Cause

### 2.1 Confirmed current behavior

- `App.tsx` mounts `MapContainer` and `Minimap` only while `appScreen === 'game'`.
- Returning to the Command Room unmounts both maps and releases MapLibre and Deck WebGL contexts.
- Every main-map mount awaits operational geometry, political control, adjacency, SID mapping, terrain scalars, and the 1991 census dataset before constructing MapLibre.
- The default-visible minimap creates a second MapLibre instance and separately requests operational geometry.
- Repeat map entry re-reads approximately 14.5 MiB of JSON; the first entry reads approximately 16 MiB.
- The packaged local HTTP server sends `Cache-Control: no-store` for static files and PMTiles range responses.
- The legacy/direct map route adds `Date.now()` to the iframe URL, guaranteeing a different document URL.
- The built tactical page currently preloads 25 JavaScript files, 6.36 MiB raw, including event-year catalogs and the Codex essay index.
- Tactical-map and legacy-warroom HTML currently reference Google Fonts over the network.

### 2.2 Interpretation boundary

Raw JSON parsing measured about 80 ms on the current development machine. The remaining multi-second delay is therefore expected to be dominated by the full initialization cascade: document/module work on reload paths, MapLibre worker/style startup, GeoJSON transfer and tessellation, PMTiles range reads, WebGL/Deck initialization, and staged layer/source population. Phase 0 must measure those shares before any lower-priority optimization is selected.

### 2.3 Working behavior to preserve

- Current-turn map readiness remains revision-aware. A retained stale canvas must stay inert under the loading cover until the current turn/save fingerprint has rendered.
- Map cleanup still releases every graphics resource when the campaign genuinely exits or the app closes.
- The existing `postMessage` shell handoff remains the canonical cross-frame navigation mechanism.
- Map selection and tactical inspection overlays may still clear when returning to the Command Room; persistence applies to renderer resources, not to player selection state.

---

## 3. Locked Scope Decisions

1. **Persistent campaign ownership:** after a campaign enters the React shell, the main map remains mounted across `warroom` and `game` screens.
2. **Visibility is not lifecycle:** hiding the map must use an in-layout hidden/inert layer or an opaque covering shell, never a conditional unmount or zero-sized container.
3. **One stable interactive iframe:** operational and warroom navigation use one shell-capable React iframe. Sandbox may remain a separately navigated route.
4. **One parsed resource per renderer session:** concurrent and repeated static-data loads share the same promise/result. A rejected promise is evicted so Retry can make a real second attempt.
5. **Critical first frame first:** operational geometry, political control, and current player-visible state own the meaningful first frame. Census ghost data, adjacency-only modes, damage/scars, and other optional enrichment do not block MapLibre construction.
6. **No stale truth for speed:** the warm switch target is met only when `data-map-ready="true"`, `data-map-state-turn` matches the loaded turn, and the loaded-state fingerprint matches.
7. **Debug timing stays noncanonical:** use monotonic `performance.now()`/marks behind an explicit profiling switch. Do not write wall-clock timestamps or timing fields into state, saves, replay, scenario output, or retained deterministic artifacts.
8. **No broad rendering rewrite:** do not replace MapLibre, Deck.gl, PMTiles, the canonical OSID substrate, or existing map visual design in this packet.

---

## 4. Purpose and Non-Goals

### In scope

- Cold and warm transition instrumentation.
- Persistent main-map, Deck-overlay, and minimap lifecycle.
- Stable React-shell iframe navigation.
- Session promise/result caches for immutable static map resources.
- Staged loading of noncritical map enrichment.
- Packaged local-server cache policy appropriate to immutable/revalidated resources.
- Deferred minimap startup after the primary correct-state frame.
- Removal of external font requests from packaged critical paths.
- Conditional cold-entry code splitting only if measurement still requires it.
- Electron visual/runtime evidence and performance acceptance.

### Non-goals

- No simulation, combat, AI, event, scenario, OOB, historical, or calibration changes.
- No new player command, map mode, overlay, dossier, or decision surface.
- No save field, migration, schema version, startup snapshot, or baseline-manifest edit.
- No PMTiles regeneration or map-derived artifact refresh.
- No hidden-enemy or fog-of-war relaxation.
- No installer, distributable package, version bump, tag, release, or baseline refresh.
- No `FORAWWV.md` or other canon edit.
- No commit, push, PR, or branch cleanup in the current planning pass. Future authority is defined by the master-roadmap activation matrix.

---

## 5. External-Agent Execution Contract

### 5.1 Session start

Run from `F:\A-War-Without-Victory`:

```powershell
git status --short --branch
git rev-parse --short HEAD
git worktree list
git branch --list "codex/map-transition-performance"
```

If implementation is authorized and no collision exists, create or reuse an isolated worktree:

```powershell
git worktree add -b codex/map-transition-performance ..\AWWV-map-transition-performance
Set-Location ..\AWWV-map-transition-performance
```

Do not delete, reset, clean, stash, or alter another worktree. Stop if the RS FR-03 packet or another active branch owns any Phase 1–4 source file.

### 5.2 Required reading before editing

- `.claude/napkin.md`, especially `Map & UI Shell`, `Execution & Validation`, and `User Directives`
- `docs/00_start_here/docs_index.md`
- `docs/10_canon/context.md`
- `docs/10_canon/CANON.md`
- `docs/20_engineering/CODE_CANON.md`
- `docs/20_engineering/MAP_RENDERING_PIPELINE.md` §5
- `docs/20_engineering/MAP_BUILD_SYSTEM.md`
- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` §§21–21.1
- `docs/40_reports/GUI_MASTER.md`
- `docs/40_reports/WARROOM_MASTER.md`
- `docs/20_engineering/PYRRHIC_PLANNING_RULES.md`
- `docs/plans/PLAN_EXECUTION_STANDARD.md`
- this plan, `docs/plans/COMMAND_BOARD.md`, and `docs/plans/MASTER_ROADMAP.md`

### 5.3 Inspect before editing

- `src/ui/map/App.tsx`
- `src/ui/map/map/MapContainer.tsx`
- `src/ui/map/components/Minimap.tsx`
- `src/ui/map/data/DataLoader.ts`
- `src/ui/map/map/mapContextLifecycle.ts`
- `src/ui/map/map/overlayTiming.ts`
- `src/ui/map/components/warroom/WarroomShellLayer.tsx`
- `src/ui/warroom/warroom.ts`
- `src/desktop/electron-main.cjs`
- `src/ui/map/index.html`
- `src/ui/warroom/index.html`
- `src/ui/map/vite.config.ts`
- the focused tests named in each phase

### 5.4 Global stop rule

Stop and report instead of improvising if:

- persistent mounting would require duplicate command or state ownership;
- the map cannot remain fog-safe while hidden;
- a correct-current-state frame cannot be distinguished from a stale retained frame;
- a cache would return mutable cross-campaign state rather than immutable static assets;
- a source change moves scenario output, structural fingerprint, save schema, or baselines;
- an active branch owns the same shell/map files;
- the target can only be met by packaging, changing release state, or deleting retained evidence;
- unexplained console, network, WebGL, or current-turn readiness errors appear.

### 5.5 Phase and commit boundaries

Execute phases sequentially. Each implementation phase ends with:

`red test -> minimal implementation -> focused green tests -> /simplify -> typecheck -> phase verification -> one logical commit`

Do not push or open a PR under `Execute the master roadmap`; external publication requires `Publish 1.0` or equally explicit wording. Generated timings, screenshots, traces, and user-data belong under ignored `tmp-map-transition-perf/`; only bounded summaries belong in the implementation report.

---

## 6. Performance Contract

### 6.1 Milestones

Use these stable debug labels:

```ts
export const MAP_TRANSITION_MARKS = [
  'command',
  'viewport-visible',
  'core-data-ready',
  'map-created',
  'style-loaded',
  'current-state-rendered',
  'interactive',
] as const;
```

Every sample records durations only, plus deterministic categorical metadata:

- `kind: 'cold' | 'warm'`
- cycle index
- loaded turn
- loaded-state fingerprint equality, not the full fingerprint
- map construction count
- WebGL release count
- static resource request counts by stable resource key
- current-state readiness result
- console/page/network failure counts

Do not record date/time, username, file paths, save contents, hidden enemy state, or raw game state.

### 6.2 Acceptance targets

- Warm Command Room -> Map P95 <= 150 ms over 20 measured cycles after 3 warmups.
- Warm cycles perform zero new MapLibre constructions, zero WebGL releases, and zero static map-resource requests.
- Every accepted warm sample reaches a current-turn/current-fingerprint frame; no stale frame is counted as success.
- Cold first meaningful/current-state map <= 1,000 ms at median and <= 1,500 ms at P95 on the recorded release-target machine.
- Zero unexpected console errors, page errors, failed requests, WebGL context loss, or blank-map samples.
- Returning to the Command Room remains <= 100 ms and leaves no map input/focus owner active.

If target hardware is not defined, Phase 0 records the machine/runtime manifest and uses the current machine only as a development baseline. Do not claim release-hardware closure from a different class of machine.

---

## 7. Phase Sequence

## Phase 0 — Baseline instrumentation and reproducible Electron profile

**Assigned to:** Performance Engineer
**Reviewers:** QA Engineer + Determinism Auditor
**Estimated scope:** 2 small source helpers, 1 harness, 2 tests, no player behavior change

### Task 0.1 — Write the timing contract first

**Files:**

- Create `src/ui/map/perf/mapTransitionTiming.ts`
- Create `tests/ui/map_transition_timing.test.ts`

- [x] Define the stable mark vocabulary from §6.1.
- [x] Write a failing test proving profiling is disabled unless `profile_map_transition=1` is present.
- [x] Write a failing test proving collected samples contain durations/counters only and reject wall-clock/date/path/state fields.
- [x] Write a failing test proving percentile calculation is stable and numeric-input-order independent.
- [x] Implement the smallest monotonic timing helper that makes the tests pass.
- [x] Keep the helper browser-only and free of simulation imports.

**Red/green command:**

```powershell
npm.cmd run test:vitest -- tests/ui/map_transition_timing.test.ts --pool=forks --reporter=dot
```

### Task 0.2 — Add lifecycle marks without changing lifecycle

**Files:**

- Modify `src/ui/map/App.tsx`
- Modify `src/ui/map/map/MapContainer.tsx`
- Modify `src/ui/map/data/DataLoader.ts`
- Modify `tests/ui/map_overlay_timing_contract.test.ts`
- Modify `tests/ui/map_loading_state.test.ts`

- [x] Mark the canonical `leaveWarroomForGame()` command boundary.
- [x] Mark viewport visibility, core-data-ready, map construction, style load, current-state render, and interactivity.
- [x] Count MapLibre creation, cleanup/release, and stable resource-key loads only while profiling is enabled.
- [x] Preserve the existing current-turn/current-fingerprint readiness gate.
- [x] Keep raw duplicate-prone `console.time()` calls forbidden.

### Task 0.3 — Build the repeatable Electron harness

**Files:**

- Create `tools/ui/map_transition_profile.cjs`
- Create `tests/map_transition_profile_harness.test.ts`
- Modify `package.json` to add `qa:map-transition`

- [x] Launch the unpackaged Electron application with isolated user data.
- [x] Start one clean campaign fixture without changing repository autosaves.
- [x] Measure three cold launches and 3 warmups + 20 warm Command Room <-> Map cycles per launch.
- [x] Wait for visible `data-map-ready="true"` and exact current turn before completing a sample.
- [x] Collect request failures, HTTP errors, console errors, page errors, main-process stderr, construction/release counters, and resource counts.
- [x] Write only under ignored `tmp-map-transition-perf/<label>/` using an explicit label.
- [x] Fail if the output directory already exists; never overwrite retained evidence.
- [x] Make `--cycles`, `--warmups`, and `--label` explicit CLI options with safe defaults.

**Verification:**

```powershell
node --check tools/ui/map_transition_profile.cjs
npm.cmd run test:vitest -- tests/ui/map_transition_timing.test.ts tests/map_transition_profile_harness.test.ts tests/ui/map_overlay_timing_contract.test.ts tests/ui/map_loading_state.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run desktop:map:build
npm.cmd run warroom:build
npm.cmd run qa:map-transition -- --label=baseline --cycles=20 --warmups=3
```

**Gate:** Baseline JSON names every phase duration, repeat request, construction/release count, current-state result, and runtime diagnostic. Do not begin optimization without this artifact.

-> `/simplify` -> verify -> commit `test(map): add transition performance baseline`

---

## Phase 1 — Campaign-scoped persistent map viewport

**Assigned to:** Performance Engineer + UI/UX Developer
**Reviewers:** Technical Architect + QA Engineer
**Estimated scope:** 1 new component, 4 source files, 3 focused tests

### Task 1.1 — Pin the ownership contract with failing tests

**Files:**

- Create `tests/ui/map_shell_persistence.test.ts`
- Modify `tests/ui/warroom_shell_ownership.test.ts`
- Modify `tests/ui/shell_navigation_ownership.test.ts`
- Modify `tests/ui/map_context_lifecycle.test.ts`
- Modify `tests/ui/error_boundary_isolation.test.ts`

- [x] Assert a loaded campaign mounts one primary map owner across `game -> warroom -> game` rerenders.
- [x] Assert the warm screen toggle does not call MapLibre remove, Deck finalize, or WebGL lose-context.
- [x] Assert leaving the campaign/unmounting the app still releases both graphics owners exactly once.
- [x] Assert the hidden viewport is `aria-hidden`, inert, and cannot receive pointer or keyboard input.
- [x] Assert the visible viewport calls resize/repaint before accepting interaction.
- [x] Assert the persistent viewport remains inside the canonical `RootErrorBoundary zone="map"` isolation boundary.

### Task 1.2 — Introduce one persistent viewport owner

**Files:**

- Create `src/ui/map/components/TacticalMapViewport.tsx`
- Modify `src/ui/map/App.tsx`
- Modify `src/ui/map/map/MapContainer.tsx`
- Modify `src/ui/map/components/Minimap.tsx`
- Modify `src/ui/map/styles/globals.css` only if a dedicated visibility class is needed

- [x] Mount `TacticalMapViewport` once whenever a campaign is loaded and the app is past `mainMenu`.
- [x] Pass `active={appScreen === 'game'}`; do not conditionally remove the map for `warroom`.
- [x] Keep the viewport full-sized while hidden. Use `visibility`, `inert`, `aria-hidden`, and pointer/focus ownership; do not use a zero-sized container.
- [x] On reveal, run the existing double-frame resize pattern, then `triggerRepaint()`.
- [x] Preserve the opaque Warroom layer above the hidden map.
- [x] Keep map state subscriptions live so a turn advanced in the Command Room can render before reveal.
- [x] Keep the loading cover active if the retained canvas has not rendered the current revision.
- [x] Preserve real cleanup only at campaign/app unmount.

### Task 1.3 — Reprofile before any other optimization

**Verification:**

```powershell
npm.cmd run test:vitest -- tests/ui/map_shell_persistence.test.ts tests/ui/warroom_shell_ownership.test.ts tests/ui/shell_navigation_ownership.test.ts tests/ui/map_context_lifecycle.test.ts tests/ui/map_loading_state.test.ts tests/ui/error_boundary_isolation.test.ts tests/v093_a11y_lane_b_map_landmarks.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run desktop:map:build
npm.cmd run warroom:build
npm.cmd run qa:map-transition -- --label=persistent-viewport --cycles=20 --warmups=3
```

**Gate:** Evidence reports 2 MapLibre constructions per campaign epoch (main + minimap), 0 warm MapLibre constructions/releases, and 1 Deck owner. A real campaign/application teardown releases the main MapLibre map, minimap MapLibre map, and Deck owner exactly once. If P95 is already <= 150 ms and repeat resource counts are zero, continue through Phase 2 correctness and then reassess whether Phases 3–4 are required for cold start.

-> `/simplify` -> verify -> commit `perf(map): preserve tactical viewport across room switches`

---

## Phase 2 — Stable iframe and shell navigation

**Assigned to:** Platform Specialist
**Reviewers:** UI/UX Developer + QA Engineer
**Estimated scope:** 2 source files, 2 focused tests

### Task 2.1 — Pin a single-document navigation contract

**Files:**

- Create `tests/ui/warroom_tactical_map_lifecycle.test.ts`
- Modify `tests/warroom_new_campaign_flow_truth.test.ts`

- [x] Assert interactive warroom and operational routes use one stable `index.html?embedded=1&view=warroom` shell URL.
- [x] Assert room/map transitions use `awwv-shell:show-warroom` and `awwv-shell:handoff` messages.
- [x] Assert production navigation code contains no `Date.now()`/random cachebuster.
- [x] Assert `iframe.src` is not reassigned on a warm room/map transition.
- [x] Keep sandbox as an explicitly separate navigation case.

### Task 2.2 — Make the existing handoff path universal

**Files:**

- Modify `src/ui/warroom/warroom.ts`
- Modify `src/ui/map/App.tsx` only if message handling needs a bounded correction

- [x] Create the shell-capable iframe once.
- [x] Convert operational requests into a pending/direct shell handoff rather than a new iframe URL.
- [x] Convert return-to-HQ into the existing show-warroom message.
- [x] Send fresh-campaign intro/reset state through the existing message contract, not URL identity.
- [x] Preserve cross-origin bridge safety and do not restore direct iframe DOM access.

**Verification:**

```powershell
npm.cmd run test:vitest -- tests/ui/warroom_tactical_map_lifecycle.test.ts tests/warroom_new_campaign_flow_truth.test.ts tests/ui/warroom_shell_ownership.test.ts tests/ui/shell_navigation_ownership.test.ts tests/ui_map_desktop_bridge.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run desktop:release:check
npm.cmd run qa:map-transition -- --label=stable-shell --cycles=20 --warmups=3
```

**Gate:** Every non-sandbox warm transition stays in the same iframe document and preserves the one map lifetime from Phase 1.

-> `/simplify` -> verify -> commit `perf(desktop): keep one tactical shell document`

---

## Phase 3 — Static resource cache and critical-first initialization

**Assigned to:** Performance Engineer + Systems Programmer
**Reviewers:** Determinism Auditor + QA Engineer
**Estimated scope:** 3 source files, local-server header policy, 3 focused tests

### Task 3.1 — Deduplicate immutable resource loads

**Files:**

- Modify `src/ui/map/data/DataLoader.ts`
- Create `tests/ui/map_data_loader_cache.test.ts`

- [x] Write failing tests for concurrent and sequential calls to every static map resource loader.
- [x] Assert main map and minimap share one operational-geometry fetch/parse result.
- [x] Cache the in-flight promise immediately, not only the fulfilled value.
- [x] Evict rejected promises so an explicit Retry can reload.
- [x] Treat returned static resources as immutable. Do not cache game-state-derived control GeoJSON.
- [x] Provide a test-only cache reset with no production UI control.

### Task 3.2 — Separate core and optional initialization

**Files:**

- Modify `src/ui/map/map/MapContainer.tsx`
- Modify `tests/ui/map_loading_state.test.ts`
- Create `tests/ui/map_critical_first_init.test.ts`

- [x] Start all safe fetches early, but await only operational geometry and political control before constructing the base map.
- [x] Preserve SID aliases needed for exact current-state placement before declaring current-state readiness.
- [x] Load census/ghost data only on first ghost-layer request.
- [x] Load adjacency only on first map mode/read model that requires it.
- [x] Apply terrain/property enrichment without blocking base geography and current control.
- [x] Apply damage/scar enrichment after the first current-state render.
- [x] Do not use `requestIdleCallback` as the sole scheduler for player-critical counters or readiness.
- [x] Keep optional-load failure diagnostic and nonfatal; keep required-source failure retryable and visible.

### Task 3.3 — Use cacheable packaged HTTP semantics

**Files:**

- Modify `src/desktop/electron-main.cjs`
- Modify `tests/desktop_pmtiles_protocol_route.test.ts`
- Modify `tests/desktop_packaged_runtime_probe.test.ts`

- [x] Keep `index.html` revalidated rather than immutable.
- [x] Serve content-hashed `/assets/*` as long-lived immutable resources.
- [x] Give packaged derived data, fonts, and PMTiles range responses a stable ETag/revalidation or process-lifetime immutable policy.
- [x] Preserve byte-range correctness and exposed range headers.
- [x] Keep Vite development behavior separate so source edits remain visible during development.
- [x] Assert 206 and 200 responses use consistent validators/cache policy.

**Verification:**

```powershell
npm.cmd run test:vitest -- tests/ui/map_data_loader_cache.test.ts tests/ui/map_critical_first_init.test.ts tests/ui/map_loading_state.test.ts tests/desktop_pmtiles_protocol_route.test.ts tests/desktop_packaged_runtime_probe.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run desktop:release:check
npm.cmd run qa:electron-runtime-contracts
npm.cmd run qa:map-transition -- --label=resource-cache --cycles=20 --warmups=3
```

**Gate:** A warm cycle generates zero static map-resource requests. Cold profiling proves the base/current-state map is no longer blocked by census, adjacency-only, or scar enrichment.

-> `/simplify` -> verify -> commit `perf(map): cache static data and stage optional enrichment`

---

## Phase 4 — Defer secondary map and remove cold-entry ballast

**Assigned to:** Performance Engineer + Platform Specialist
**Reviewers:** UI/UX Developer + Technical Architect
**Entry gate:** Execute only after reprofile. If Phase 3 meets both cold targets, implement Task 4.1 and the external-font removal, then stop; do not perform speculative code splitting.

### Task 4.1 — Move minimap off the primary readiness path

**Files:**

- Modify `src/ui/map/components/TacticalMapViewport.tsx`
- Modify `src/ui/map/components/Minimap.tsx`
- Modify `tests/ui/map_shell_persistence.test.ts`
- Modify `tests/ui_map_build_warning_contract.test.ts`

- [x] Mount the minimap only after the primary map reports the first current-state frame.
- [x] Keep the minimap mounted thereafter across room switches.
- [x] Reuse the cached operational geometry.
- [x] Keep minimap visibility preference and click-to-pan behavior unchanged.
- [x] Do not replace the minimap renderer unless profiling still identifies it as a dominant cost.

### Task 4.2 — Remove packaged external-font dependency

**Files:**

- Modify `src/ui/map/index.html`
- Modify `src/ui/warroom/index.html`
- Modify relevant CSS/font assets only if reviewed local WOFF2 files and licenses are present
- Create `tests/ui/packaged_font_network_contract.test.ts`

- [x] Remove Google Fonts preconnect, stylesheet link, and CSS `@import` from packaged entrypoints.
- [x] Use reviewed local webfonts if already supplied with license provenance; otherwise retain the current CSS family names with system fallbacks.
- [x] Do not fetch or add unreviewed font binaries during implementation.
- [x] Assert packaged HTML contains no `http://` or `https://` font dependency.

### Task 4.3 — Split only measured optional modules

**Entry gate:** Cold P95 still exceeds 1,500 ms and the Phase 0 module timeline shows optional JS evaluation/preload as material.

**Disposition:** NOT APPLICABLE. Phase 3 cold current-state p95 was 125.2 ms, so the 1,500 ms entry gate did not open. The packet deliberately stopped before speculative module splitting.

**Files:**

- Modify `src/ui/map/App.tsx` and the exact optional feature owners selected by the trace
- Modify `src/ui/map/vite.config.ts`
- Create `tools/diagnostics/tactical_map_entry_budget.cjs`
- Create `tests/ui_map_entry_budget_contract.test.ts`
- Modify `package.json` to add `qa:map-entry-budget`

- [ ] Convert Codex essay content, event-year catalogs, verdict, planning, and other measured non-first-frame surfaces to bounded dynamic imports.
- [ ] Keep the Warroom shell, primary map, current-state adapter, and player blockers synchronously available.
- [ ] Build before/after and record entry/modulepreload bytes.
- [ ] Require the built entry to stop preloading Codex and event-year catalog chunks.
- [ ] Require at least a 30% reduction from the recorded 6.36 MiB raw preload baseline; do not invent a lower absolute budget without measured evidence.
- [ ] Preserve existing browser-safe import and Vite warning contracts.

**Verification:**

```powershell
npm.cmd run test:vitest -- tests/ui/map_shell_persistence.test.ts tests/ui_map_build_warning_contract.test.ts tests/ui/packaged_font_network_contract.test.ts tests/ui_map_entry_budget_contract.test.ts tests/ui_map_browser_safe_imports.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run desktop:map:build
npm.cmd run qa:map-entry-budget
npm.cmd run qa:map-transition -- --label=cold-entry --cycles=20 --warmups=3
```

**Acceptance barrier:** Meet the cold target. If it is still missed, continue within this phase against the next measured owner; do not close R1 or create speculative lazy-import churn.

-> `/simplify` -> verify -> commit `perf(map): defer secondary and optional cold-start work`

---

## Phase 5 — Full verification and player-visible evidence

**Assigned to:** QA Engineer
**Reviewers:** Process QA + Technical Architect
**Estimated scope:** verification/evidence only unless a failing regression requires returning to its owning phase

### Task 5.1 — Focused and broad gates

```powershell
npm.cmd run typecheck
npm.cmd run test:vitest -- tests/ui/map_transition_timing.test.ts tests/map_transition_profile_harness.test.ts tests/ui/map_shell_persistence.test.ts tests/ui/warroom_tactical_map_lifecycle.test.ts tests/ui/map_data_loader_cache.test.ts tests/ui/map_critical_first_init.test.ts tests/ui/map_context_lifecycle.test.ts tests/ui/map_loading_state.test.ts tests/ui/warroom_shell_ownership.test.ts tests/ui/shell_navigation_ownership.test.ts tests/ui_map_render_smoke.test.ts tests/ui_map_build_warning_contract.test.ts tests/desktop_pmtiles_protocol_route.test.ts tests/desktop_packaged_runtime_probe.test.ts --pool=forks --reporter=dot
npm.cmd run qa:player-journeys
npm.cmd run qa:first-hour:browser
npm.cmd run qa:live-surface:browser
npm.cmd run qa:electron-runtime-contracts
npm.cmd run desktop:release:check
npm.cmd run repo:eol:check
git diff --check
```

No package/distributable command is authorized.

### Task 5.2 — Cold/warm acceptance matrix

- [x] Run three clean launches on the recorded target/development machine.
- [x] Run 3 warmups + 20 measured switches per launch.
- [x] Capture one Command Room screenshot, one first cold correct-state map screenshot, and one warm correct-state map screenshot per launch.
- [x] Verify map interaction: pan, zoom, select a visible formation/stack, open a settlement, return to the Command Room, reopen map.
- [x] Verify the displayed turn/fingerprint after a turn advanced from the Command Room.
- [x] Verify no hidden map input or shortcut fires while the Command Room owns focus.
- [x] Record p50/p95, construction/release/resource counts, diagnostic counts, runtime versions, viewport, and machine class in a bounded summary.

**Acceptance table:**

| Metric | Baseline | Final | Target | Result |
|---|---:|---:|---:|---|
| Warm switch P50 | 4,251.05 ms | 114.45 ms | informational | Improved 97.3% |
| Warm switch P95 | 4,628.045 ms | 139.515 ms | <= 150 ms | PASS |
| Warm MapLibre constructions | 2/cycle | 0/cycle | 0 | PASS |
| Warm WebGL releases | 2/cycle | 0/cycle | 0 | PASS |
| Warm static resource requests | 6/cycle | 0/cycle | 0 | PASS |
| Cold current-state P50 | 5,368 ms | 70.7 ms | <= 1,000 ms | PASS |
| Cold current-state P95 | 5,380.87 ms | 78.8 ms | <= 1,500 ms | PASS |
| Stale/blank samples | 0 | 0 of 72 | 0 | PASS |
| Unexpected diagnostics | 0 | 0 | 0 | PASS |

**Stop gate:** A visually fast but stale, noninteractive, fog-unsafe, or erroring map is a failure. Return to the owning phase; do not relax the metric definition.

-> `/simplify` -> verify -> commit `test(map): prove seamless room transition`

---

## Phase 6 — Documentation and roadmap closeout

**Assigned to:** Documentation Specialist
**Reviewer:** Process QA

### Task 6.1 — Record the implemented contract

**Files:**

- Update this plan's execution log and checkboxes
- Update `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`
- Update `docs/40_reports/GUI_MASTER.md`
- Update `docs/40_reports/WARROOM_MASTER.md`
- Update `docs/plans/COMMAND_BOARD.md`
- Update `docs/plans/MASTER_ROADMAP.md` only when the packet closes
- Append `docs/PROJECT_LEDGER.md`
- Update `docs/PROJECT_LEDGER_KNOWLEDGE.md` only if implementation changes the reusable rule below
- Create `docs/40_reports/implemented/20260731_SEAMLESS_COMMAND_ROOM_MAP_TRANSITION.md`

- [x] Document campaign-scoped map ownership, reveal/resize behavior, static-resource cache ownership, and cold/warm metric definitions.
- [x] Include the before/after acceptance table and exact evidence path.
- [x] Move the command-board row to `CLOSED` only when every Phase 5 target passes.
- [x] Add a short roadmap closure amendment; do not rewrite historical amendments.
- [x] Do not update package version, tag, release state, or `FORAWWV.md`.

**Verification:**

```powershell
npm.cmd run repo:eol:check
git diff --check
```

-> `/simplify` -> verify -> commit `docs(map): close seamless transition lane`

---

## 8. Determinism and Save-Schema Barriers

- Performance marks use monotonic renderer timing only and are disabled by default.
- Profiling output contains no wall-clock timestamp, random id, locale sort, environment path, state dump, save contents, or hidden enemy truth.
- Stable labels and ASCII ordering are required for metric rows and resource keys.
- Static caches hold immutable package resources only; campaign/player-derived state must continue through the live store and current-revision rendering path.
- No new persisted field, migration, validator, schema version, baseline refresh, startup snapshot, or scenario artifact is permitted.
- If any simulation or approved baseline output changes, stop. This UI/runtime packet does not own that drift.

---

## 9. UI and Player-Truth Barriers

- React + MapLibre remains the canonical player-facing map.
- Warroom remains the command-shell owner; the map remains battlespace interaction owner.
- Persistent mounting must not create a second shell, inbox, command resolver, or map state owner.
- Hidden map controls are inert and inaccessible while the Command Room owns focus.
- Retained stale map pixels stay covered until the current turn/save fingerprint renders.
- Fog/player-safe projection remains unchanged; no profiling field may expose raw formations or full state.
- Existing EN/BCS player copy must remain valid; new player-facing loading/error copy requires both locales.
- Electron visual evidence is mandatory because a static component test cannot prove WebGL reuse or a seamless player-visible transition.

---

## 10. Historical and Sensitive-History Barriers

This packet does not touch historical claims, event timing, scenarios, OOB, Codex content, painted targets, or sensitive-history mechanics. If implementation reveals a need to alter any of those, leave the historical surface unchanged and route the finding to R6 or R7 under their locked evidence rules. Performance is never grounds to remove or coarsen player-visible historical truth.

---

## 11. Protocol Enforcement

- [x] Orchestrator oversees all phases.
- [x] Technical Architect reviews the campaign-scoped ownership boundary.
- [x] Napkin and life-lessons indexes are read at session start.
- [x] TDD red/green proof precedes behavior changes.
- [x] `/simplify` runs between every phase and its findings are fixed before the next phase.
- [x] Typecheck and focused Vitest run after every phase.
- [x] One logical phase per commit after implementation is authorized.
- [x] Process QA validates the closeout.
- [x] Ledger and implementation report are updated on completion.
- [x] No version, tag, push, PR, signing, upload, installer publication, or release mutation occurs without the separate publication instruction.

---

## 12. Success Criteria

- [x] The current-turn tactical map stays mounted across Command Room transitions.
- [x] Warm P95 is <= 150 ms over the defined sample.
- [x] Warm transitions create/release zero graphics contexts and request zero static map resources.
- [x] Cold current-state P50/P95 meet 1,000/1,500 ms targets on the recorded machine.
- [x] All accepted frames are current-turn/current-fingerprint, interactive, and fog-safe.
- [x] Sandbox remains functional without weakening the stable interactive-shell contract.
- [x] Map cleanup remains exact on real campaign/app exit.
- [x] Focused, player-journey, browser, Electron runtime, build, EOL, and diff gates pass.
- [x] Roadmap, command board, masters, report, ledger, and knowledge are synchronized.

---

## 13. Execution Log

| Phase | Status | Commit | Verification | Evidence |
|---|---|---|---|---|
| 0 Baseline | Complete | Phase 0 commit + five review-fix follow-ups | Exact current commands and counts below; typecheck; tactical-map and warroom builds; harness syntax; EOL and diff checks; 3 cold launches + 3 warmups + 20 measured warm cycles per launch; diagnostics-failure, cleanup, and whole-evidence volatility proof | `tmp-map-transition-perf/baseline-all-contexts-diagnostics-cleanup-v4b/baseline.json` |
| 1 Persistent viewport | Complete; independently approved | Phase 1 integration commit | 24 focused/adjacent files / 226 tests; typecheck; tactical-map and Warroom builds; harness syntax; EOL and diff checks; independent repair review: 4 files / 38 tests | `tmp-map-transition-perf/phase1-retained-viewport-authoritative-v7-final/baseline.json` |
| 2 Stable shell | Complete; independently approved | Phase 2 integration commit | 11 focused/adjacent files / 162 tests; typecheck; desktop release build; harness syntax; EOL and diff checks; independent initial and repair review | `tmp-map-transition-perf/phase2-stable-shell-authoritative-v1/baseline.json` |
| 3 Resource/cache | Complete; independently approved | Phase 3 local commit | Focused cache/critical-init/protocol tests; typecheck; release/runtime checks; 72-sample Electron profile | `tmp-map-transition-perf/phase3-resource-cache-authoritative-v1/baseline.json` |
| 4 Cold-entry residual | Complete; independently approved; Task 4.3 not applicable | Phase 4/5 local commit | Focused reveal/minimap/font tests; typecheck; production builds; 72-sample Electron profile | `tmp-map-transition-perf/phase4-minimap-reveal-font-authoritative-v1/baseline.json` |
| 5 Acceptance | Complete; independently approved | Phase 4/5 local commit | 42/42 evidence hardening tests; three player-visible launches; 21 screenshots; exact interaction, decision, advance, cleanup, diagnostic, save, and privacy proof | `tmp-map-transition-perf/phase5-player-visible-interaction-authoritative-v8/baseline.json` |
| 6 Closeout | Complete | Documentation local commit | 18 files / 187 focused/docs tests; 8 files / 85 Electron runtime tests; 44 files / 769 player journeys; 36-step first-hour and 42-step live-surface browser proofs; desktop release, typecheck, EOL, and diff gates | [Implementation report](../40_reports/implemented/20260801_SEAMLESS_COMMAND_ROOM_MAP_TRANSITION.md) |

### Phase 3–6 closeout amendment (2026-08-01)

Phase 3 introduced immutable promise/result caches with rejection eviction and mutation-safe map results, kept campaign truth uncached, moved optional enrichment off the truthful first frame, and aligned packaged HTTP/PMTiles caching, validators, containment, conditionals, and ranges. Its authoritative profile (`a3e7c73ad82b040fb0c7d5b33f4ee45a838a6e3821bfc391578b578c8e6857c2`) recorded cold p50/p95 69.4/125.2 ms, zero warm static-resource requests, 72/72 ordered samples, and zero unexpected diagnostics. Warm p95 remained 229.605 ms, selecting the reveal path for Phase 4.

Phase 4 removed the two-frame reveal delay, tied interactivity to resize/one-render/repaint plus exact revision truth, deferred minimap readiness, and removed external font requests. The authoritative 72-sample profile (`33a32edb7dda961533bf8f846326cf41603da2a465f7d76abbb26669dba06b5b`) records cold p50/p95 70.7/78.8 ms and warm p50/p95 114.45/139.515 ms with zero warm renderer churn, releases, static requests, stale samples, or unexpected diagnostics. Task 4.3 did not execute because the cold-p95 entry gate had already passed by more than an order of magnitude.

Phase 5 added profile-only camera state and a bounded player-visible schema. The accepted v8 packet (`2855c269ad72a6a4e8d21b664e61cc92c5c6e045980211b215148a73f50ab34e`) proves three clean RBiH launches through actual pan/zoom/Home, exact formation and settlement inspection, Command Room ownership, catalog-marked historical-default choice, visible Advance, neutral Cutileiro deferral, read-only Foča acknowledgement, and exact post-advance turn/fingerprint readiness. Failed v5-v7 packets are rejected diagnostic lineage, never acceptance evidence. Independent re-review approved the final implementation with no actionable findings.

Phase 1 replaces screen-scoped map mounting with one App-owned campaign epoch above `CampaignTacticalViewportOwner`, so an initial load can succeed before any tactical viewport exists. Successful browser auto/manual/continue/main-menu and Toolbar development loads use the same success-aware replacement runner. Packaged new-campaign, scenario-load, and state-load broadcasts carry replacement metadata through Electron main, preload, Warroom, and the embedded iframe bridge; initial packaged state is classified as a replacement at session attachment. Failed replacements and ordinary turn/mutation updates do not advance the epoch. Normal `game <-> warroom` navigation changes only visibility, focus, and input ownership. The full-size retained layer stays opaque-covered, `aria-hidden`, inert, pointer-disabled, and keyboard-disabled while inactive or while its committed turn/fingerprint is stale. Reveal uses two animation frames, resizes the main map and minimap, listens for one rendered frame, repaints, and only then admits current-revision input. Hidden application updates use no application animation frame, and warm navigation does not create or release a graphics owner.

The ownership and failure-path tests exercise the production `MapContainer` and `Minimap` cleanup surfaces: one campaign epoch owns exactly two MapLibre maps and one Deck overlay; warm toggles release none; campaign/app teardown calls both MapLibre `remove` paths, both WebGL lose-context paths, Deck `finalize`, and Deck WebGL lose-context exactly once. A partially constructed Deck owner is registered before `addControl`; if `addControl` throws, it is finalized, loses context, increments the release counter once, and is not released again at unmount. Installed window, document, MapLibre, and canvas listeners consult render-current activation refs, with layout-effect regressions proving the commit-to-passive-cleanup interval fails closed.

The final ownership repair also makes Minimap's initialization, settlement-data, and viewport `load` callbacks explicitly removable and current-map/current-state/current-fingerprint guarded. Deferred settlement data from a superseded campaign and callbacks captured before teardown are behaviorally proven unable to write to released sources. A post-repair profile then exposed a separate first-attachment race: desktop `loadSave` published the initial session state before its replacement promise resolved, so the first viewport mounted at epoch 0 and was immediately remounted at epoch 1. The coordinator now samples whether a campaign was already loaded immediately before each serialized replacement executes. It always records the newest successful reservation as applied, but advances the graphics epoch only when a prior campaign actually existed. The regression proves first attachment mounts once, a later real replacement remounts once, and failure/stale semantics remain intact.

`tmp-map-transition-perf/phase1-retained-viewport-authoritative-v6-postrepair/baseline.json` (110,118 bytes; SHA-256 `7a0ccda78d2138fcba7e622fb3b47322c367c7804437c0fb0ddf7bdbc003f732`) is retained as rejected failure evidence, not acceptance evidence. Although its top-level harness result was `ok: true`, each launch reported three MapLibre constructions, one premature WebGL release, one Deck construction, and duplicated one-time static-resource requests. Its second launch also stalled at 3863.4 ms current-state-rendered / 3878.5 ms interactive, producing a 3490.82 ms cold p95. Those ownership counters exposed the first-attachment remount and required the regression and repair above.

Authoritative schema-4 evidence is `tmp-map-transition-perf/phase1-retained-viewport-authoritative-v7-final/baseline.json` (110,105 bytes; SHA-256 `c9dd1dbec72c438ad1c2a5fea687c7916d1869f6b2ae6546d442a4cf91416d65`). All three launches completed one cold sample, three warmups, and twenty measured warm cycles: 72/72 samples are complete, ordered, current-turn/current-fingerprint safe, and current-state ready. Cold current-state-rendered p50/p95 is 81.5/81.68 ms and cold interactive spans 555.3-639.9 ms, inside the 1000/1500 ms cold target. Warm interactive p50/p95 is 253/289.16 ms and remains above the 150 ms target. Every launch reports lifetime ownership of exactly two MapLibre maps, zero pre-cleanup WebGL releases, one Deck overlay, and zero pre-cleanup Deck releases; all 60 measured warm cycles report zero MapLibre/Deck construction and zero MapLibre/Deck release. One-time static resources load once per renderer session, while each warm cycle still requests `operational-settlements` once, so Phase 3 cache work remains required after Phase 2 stabilizes shell navigation.

Unexpected console warnings/errors, page errors, request failures, HTTP errors, stdout, and stderr are all zero. Repository saves are unchanged with zero files in scope. Each launch closed gracefully, required no forced kill, and verified process exit; no Electron process remained afterward. A full JSON scan found zero URL schemes, loopback endpoints, UUIDs, Windows/POSIX user paths, user-root values, or ephemeral ports. Six nonempty screenshots were retained and visually inspected. The Phase 1 harness captures them after each profiled cycle has returned to the Command Room, so they prove a stable visible Desk surface but are not represented as the Phase 5 cold-map/warm-map screenshot matrix.

Phase 2 removes the timestamped operational iframe route and creates one stable `index.html?embedded=1&view=warroom` document for the renderer session. Command Room-to-map requests are shared `war-map` handoffs; other destinations use the same pending/direct `awwv-shell:handoff` path, and return-to-HQ uses `awwv-shell:show-warroom`. Fresh-campaign reset/intro state is delivered before any queued handoff through `awwv-shell:fresh-campaign-started`, not URL identity. The separate sandbox iframe uses the established `desktop_window=sandbox` deep-link so its `index.html` fallback enters the game shell. The parent and child both validate frame identity; the Warroom also requires the exact HTTP origin or exact opaque `null` origin and never reaches through iframe DOM.

Authoritative schema-4 evidence is `tmp-map-transition-perf/phase2-stable-shell-authoritative-v1/baseline.json` (110,107 bytes; SHA-256 `d288e130a662025cf466304d844020dad642a5cab022dea8a9008b74424f1220`). All three launches completed one cold sample, three warmups, and twenty measured warm cycles: 72/72 samples are complete, ordered, current-turn/current-fingerprint safe, and current-state ready. Cold current-state-rendered p50/p95 is 75.2/127.85 ms; cold interactive spans 477.8–615.6 ms. Warm interactive p50/p95 is 212.85/241.47 ms, improved from Phase 1's 253/289.16 ms but still above the 150 ms final target. Every launch reports exactly two MapLibre constructions, zero pre-cleanup WebGL releases, one Deck construction, and zero pre-cleanup Deck releases. All 60 measured warm cycles report zero MapLibre/Deck construction and release. Each measured warm cycle still requests `operational-settlements` once, so Phase 3 remains required.

Unexpected console warnings/errors, page errors, request failures, HTTP errors, stdout, and stderr are all zero. Repository saves are unchanged with zero files in scope. All three launches closed gracefully, required no forced kill, verified process exit, and left no Electron/profile process. A whole-artifact scan found zero URL schemes, loopback endpoints, UUIDs, Windows/POSIX user paths, or ephemeral-port tokens. Six nonempty cold/warm screenshots were visually inspected; all show the stable visible Command Room Desk after the harness returned from its measured map transition, with no blank, error, or leaked tactical surface. They remain Desk-return evidence rather than the Phase 5 screenshot matrix.

Phase 0 read-first and process evidence is complete: the implementer read `.claude/napkin.md` and `docs/10_canon/context.md` before this follow-up, rechecked the owning plan and relevant engineering/determinism constraints, worked only in the isolated R1 worktree, used failing tests before implementation, preserved append-only ledger handling, left `docs/10_canon/FORAWWV.md` untouched, and performed no packaging, version, tag, push, publication, or release-state mutation. The process checklist was: diagnose the concrete evidence gaps; record RED; implement the smallest profiling-only correction; run focused and adjacent GREEN gates; rebuild both UI bundles; capture under a new fixed label; audit the full serialized artifact, screenshots, save hashes, process exit, and profile cleanup; then update this log, ledger, and reusable knowledge.

The authoritative schema-4 baseline records cold current-state-rendered p50/p95 of 5368/5380.87 ms and warm interactive-switch p50/p95 of 4251.05/4628.045 ms on app 0.9.9-beta.1, Electron 41.0.3, and Chromium 146.0.7680.80. Its bounded machine manifest is Windows x64, AMD x64 CPU class, 9–16 logical processors, 17–32 GiB memory, and a 1386×837 viewport at 1.5 device scale. All 72 transitions follow the locked milestone order and contain current-turn/current-fingerprint proof; unexpected diagnostics, invalid samples, and repository-save changes are zero. Every measured warm cycle now reports two MapLibre constructions and two releases—main map plus minimap—and repeats `census-settlements: 1`, `operational-political-control: 1`, `operational-settlements: 3`, and `osid-adjacency: 1`. Each launch balances 48 constructions with 48 releases. All three application closes were graceful, required no forced kill, and verified process exit.

The 109,679-byte JSON has SHA-256 `5e922cafa7749339819a437565033159ebf830fc9cf6b8e7ed4ad4b4810bf1db`. A recursive scan of every serialized string found zero URL schemes, loopback endpoints, UUIDs, Windows or POSIX absolute paths, user-root values, or Windows ephemeral-port values. Expected stdout is retained only as `tactical_map_server_started: 3` and `built_map_server_selected: 6`; expected stderr is retained only as `inspector_shutdown: 3` and `inspector_help: 3`. Any nonzero unexpected console, page, request, HTTP, stdout, or stderr diagnostic now makes `ok` false, writes failed evidence, and exits nonzero. Failure-path tests prove bounded forced kill and verified exit when graceful close fails or hangs, plus a hard failure when exit cannot be verified.

`tmp-map-transition-perf/baseline-all-contexts-diagnostics-cleanup-v4b/baseline.json` supersedes every retained earlier artifact, including `baseline-stable-process-diagnostics-v2`, whose lifecycle totals omitted the minimap and whose `ok` value did not fail on unexpected diagnostics. Its page/request/HTTP fields also lacked generic whole-payload sanitization, and its cleanup protection began after application evaluation/listener setup while swallowing close failures. The incomplete `baseline-all-contexts-clean-diagnostics-cleanup-v4` directory is not evidence: an operator-side terminal timeout interrupted it before JSON creation; all six exact profile-bound processes were stopped, zero remained, and the isolated profile passed an exclusive-open check before v4b began. Earlier schema-1 through schema-3 supersession reasons remain recorded in the ledger.

The final bounded failure-path follow-up routes top-level failed-evidence `error` and fatal CLI stderr through the same generic sanitizer as diagnostic payloads. A functional regression serializes a malicious failure stack containing an external URL, Windows and POSIX absolute paths, UUID, and ephemeral port, then proves only stable placeholders remain; it also pins the unchanged successful outcome `{ "ok": true, "error": null }`. This changes neither schema 4 nor any successful evidence content. The authoritative v4b artifact was produced from the unchanged success path and therefore remains current; repeating the 72-sample performance capture would add timing noise without exercising the corrected failure-only sinks.

The final delimiter correction covers POSIX stack paths following parentheses, single/double quotes, brackets, braces, and comparable diagnostic separators while preserving those delimiters around `<absolute-path>`. The functional failed-evidence and CLI-stderr regression now includes exact parenthesized and quoted Node-stack forms. Fresh validation accounting uses literal commands rather than changing aggregate labels:

```text
.\node_modules\.bin\vitest.cmd run tests/map_transition_profile_harness.test.ts tests/ui/map_transition_timing.test.ts tests/ui/map_context_lifecycle.test.ts --pool=forks --reporter=dot
PASS — 3 files / 33 tests

.\node_modules\.bin\vitest.cmd run tests/docs_desktop_v09_truth.test.ts --pool=forks --reporter=dot
PASS — 1 file / 7 tests

.\node_modules\.bin\vitest.cmd run tests/desktop_persistence_contract.test.ts tests/desktop_packaged_runtime_probe.test.ts --pool=forks --reporter=dot
PASS — 2 files / 20 tests

node --check tools/ui/map_transition_profile.cjs
npm.cmd run typecheck
npm.cmd run repo:eol:check
git diff --check
PASS — each command exited 0
```

The delimiter matcher and validation documentation affect only failure sanitization and process evidence. They do not change successful evidence schema/content, timing, lifecycle, diagnostics, cleanup, or sample collection; v4b remains the authoritative successful baseline and the 72-sample profile is not repeated.

---

## 14. Copy-Ready Execution Prompt

```text
Role and objective: You are the implementation agent for the Seamless Command Room <-> Tactical Map transition lane. Execute docs/plans/2026-07-31-seamless-command-room-map-transition-plan.md one phase at a time, beginning with Phase 0. Do not skip the baseline or optimize an unmeasured residual.

Canon and engineering references: Read .claude/napkin.md; docs/00_start_here/docs_index.md; docs/10_canon/context.md and CANON.md; docs/20_engineering/CODE_CANON.md, MAP_RENDERING_PIPELINE.md §5, MAP_BUILD_SYSTEM.md, TACTICAL_MAP_SYSTEM.md §§21–21.1, PYRRHIC_PLANNING_RULES.md; docs/40_reports/GUI_MASTER.md and WARROOM_MASTER.md; docs/plans/PLAN_EXECUTION_STANDARD.md, COMMAND_BOARD.md, MASTER_ROADMAP.md, and the full implementation plan before editing.

Execution boundary: Work in an isolated codex/map-transition-performance worktree only after checking collisions. Do not proceed while the RS 104-week FR-03 packet or another branch owns App.tsx, MapContainer.tsx, shellNavigation.ts, or gameStore.ts; sequence the packets and rebase on the finished owner. Execute red test -> minimal implementation -> focused green tests -> /simplify -> typecheck -> phase verification. One logical phase per local commit under `Execute the master roadmap`. Do not push or open a PR under that instruction.

Determinism and ledger constraints: Profiling is default-off and monotonic. No timestamps, randomness, locale sorting, environment paths, raw state, hidden enemy truth, or save/replay/scenario fields. No save schema, migrations, baseline refresh, startup snapshot, calibration, PMTiles regeneration, package version, tag, installer, or release mutation. Append PROJECT_LEDGER.md and create the implementation report only when implementation actually lands.

Automatic dispositions: sequence/rebase a branch-ownership collision; route canon/history findings to R6/R7 without changing them here; keep R1 open if stale current-turn readiness cannot be guarded; reject any cache of campaign-derived mutable state; investigate and revert unexplained simulation/hash/baseline/schema or fog/player-truth drift; use only the transient directory build authorized for R8-style validation; and keep the failing phase open until console/network/WebGL diagnostics are clean.

Output and validation: At each handoff report files changed, phase completed, /simplify result, exact tests and pass counts, cold/warm p50/p95, context creation/release/resource counts, current-state proof, diagnostics, generated evidence path, docs/ledger status, and next unfinished phase. A visually fast stale or noninteractive map is a failed result.
```
