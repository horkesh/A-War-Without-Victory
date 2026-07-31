# Seamless Command Room to Tactical Map Transition Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date:** 2026-07-31
**Status:** IN PROGRESS — Phase 0 baseline complete; Phase 1 is next
**Overseer:** Orchestrator
**Owner lane:** Performance Engineer + UI/UX Developer
**Independent reviewers:** Technical Architect, QA Engineer, Platform Specialist, Process QA
**Roadmap workstream:** R1
**Roadmap slot:** first autonomous execution packet / player-facing map performance
**Phase/workstream covered:** Electron shell navigation, tactical-map React lifetime, MapLibre/Deck lifetime, static map-data loading, packaged local HTTP caching, cold-entry bundle/network cleanup
**Current next action:** Execute Phase 1 persistent campaign-scoped map viewport against the retained Phase 0 baseline
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

- Create `tests/ui/map_shell_persistence.test.tsx`
- Modify `tests/ui/warroom_shell_ownership.test.ts`
- Modify `tests/ui/shell_navigation_ownership.test.ts`
- Modify `tests/ui/map_context_lifecycle.test.ts`
- Modify `tests/ui/error_boundary_isolation.test.ts`

- [ ] Assert a loaded campaign mounts one primary map owner across `game -> warroom -> game` rerenders.
- [ ] Assert the warm screen toggle does not call MapLibre remove, Deck finalize, or WebGL lose-context.
- [ ] Assert leaving the campaign/unmounting the app still releases both graphics owners exactly once.
- [ ] Assert the hidden viewport is `aria-hidden`, inert, and cannot receive pointer or keyboard input.
- [ ] Assert the visible viewport calls resize/repaint before accepting interaction.
- [ ] Assert the persistent viewport remains inside the canonical `RootErrorBoundary zone="map"` isolation boundary.

### Task 1.2 — Introduce one persistent viewport owner

**Files:**

- Create `src/ui/map/components/TacticalMapViewport.tsx`
- Modify `src/ui/map/App.tsx`
- Modify `src/ui/map/map/MapContainer.tsx`
- Modify `src/ui/map/components/Minimap.tsx`
- Modify `src/ui/map/styles/globals.css` only if a dedicated visibility class is needed

- [ ] Mount `TacticalMapViewport` once whenever a campaign is loaded and the app is past `mainMenu`.
- [ ] Pass `active={appScreen === 'game'}`; do not conditionally remove the map for `warroom`.
- [ ] Keep the viewport full-sized while hidden. Use `visibility`, `inert`, `aria-hidden`, and pointer/focus ownership; do not use a zero-sized container.
- [ ] On reveal, run the existing double-frame resize pattern, then `triggerRepaint()`.
- [ ] Preserve the opaque Warroom layer above the hidden map.
- [ ] Keep map state subscriptions live so a turn advanced in the Command Room can render before reveal.
- [ ] Keep the loading cover active if the retained canvas has not rendered the current revision.
- [ ] Preserve real cleanup only at campaign/app unmount.

### Task 1.3 — Reprofile before any other optimization

**Verification:**

```powershell
npm.cmd run test:vitest -- tests/ui/map_shell_persistence.test.tsx tests/ui/warroom_shell_ownership.test.ts tests/ui/shell_navigation_ownership.test.ts tests/ui/map_context_lifecycle.test.ts tests/ui/map_loading_state.test.ts tests/ui/error_boundary_isolation.test.ts tests/v093_a11y_lane_b_map_landmarks.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run desktop:map:build
npm.cmd run warroom:build
npm.cmd run qa:map-transition -- --label=persistent-viewport --cycles=20 --warmups=3
```

**Gate:** Warm cycles have one lifetime MapLibre construction and no warm release/reconstruction. If P95 is already <= 150 ms and repeat resource counts are zero, continue through Phase 2 correctness and then reassess whether Phases 3–4 are required for cold start.

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

- [ ] Assert interactive warroom and operational routes use one stable `index.html?embedded=1&view=warroom` shell URL.
- [ ] Assert room/map transitions use `awwv-shell:show-warroom` and `awwv-shell:handoff` messages.
- [ ] Assert production navigation code contains no `Date.now()`/random cachebuster.
- [ ] Assert `iframe.src` is not reassigned on a warm room/map transition.
- [ ] Keep sandbox as an explicitly separate navigation case.

### Task 2.2 — Make the existing handoff path universal

**Files:**

- Modify `src/ui/warroom/warroom.ts`
- Modify `src/ui/map/App.tsx` only if message handling needs a bounded correction

- [ ] Create the shell-capable iframe once.
- [ ] Convert operational requests into a pending/direct shell handoff rather than a new iframe URL.
- [ ] Convert return-to-HQ into the existing show-warroom message.
- [ ] Send fresh-campaign intro/reset state through the existing message contract, not URL identity.
- [ ] Preserve cross-origin bridge safety and do not restore direct iframe DOM access.

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

- [ ] Write failing tests for concurrent and sequential calls to every static map resource loader.
- [ ] Assert main map and minimap share one operational-geometry fetch/parse result.
- [ ] Cache the in-flight promise immediately, not only the fulfilled value.
- [ ] Evict rejected promises so an explicit Retry can reload.
- [ ] Treat returned static resources as immutable. Do not cache game-state-derived control GeoJSON.
- [ ] Provide a test-only cache reset with no production UI control.

### Task 3.2 — Separate core and optional initialization

**Files:**

- Modify `src/ui/map/map/MapContainer.tsx`
- Modify `tests/ui/map_loading_state.test.ts`
- Create `tests/ui/map_critical_first_init.test.ts`

- [ ] Start all safe fetches early, but await only operational geometry and political control before constructing the base map.
- [ ] Preserve SID aliases needed for exact current-state placement before declaring current-state readiness.
- [ ] Load census/ghost data only on first ghost-layer request.
- [ ] Load adjacency only on first map mode/read model that requires it.
- [ ] Apply terrain/property enrichment without blocking base geography and current control.
- [ ] Apply damage/scar enrichment after the first current-state render.
- [ ] Do not use `requestIdleCallback` as the sole scheduler for player-critical counters or readiness.
- [ ] Keep optional-load failure diagnostic and nonfatal; keep required-source failure retryable and visible.

### Task 3.3 — Use cacheable packaged HTTP semantics

**Files:**

- Modify `src/desktop/electron-main.cjs`
- Modify `tests/desktop_pmtiles_protocol_route.test.ts`
- Modify `tests/desktop_packaged_runtime_probe.test.ts`

- [ ] Keep `index.html` revalidated rather than immutable.
- [ ] Serve content-hashed `/assets/*` as long-lived immutable resources.
- [ ] Give packaged derived data, fonts, and PMTiles range responses a stable ETag/revalidation or process-lifetime immutable policy.
- [ ] Preserve byte-range correctness and exposed range headers.
- [ ] Keep Vite development behavior separate so source edits remain visible during development.
- [ ] Assert 206 and 200 responses use consistent validators/cache policy.

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
- Modify `tests/ui/map_shell_persistence.test.tsx`
- Modify `tests/ui_map_build_warning_contract.test.ts`

- [ ] Mount the minimap only after the primary map reports the first current-state frame.
- [ ] Keep the minimap mounted thereafter across room switches.
- [ ] Reuse the cached operational geometry.
- [ ] Keep minimap visibility preference and click-to-pan behavior unchanged.
- [ ] Do not replace the minimap renderer unless profiling still identifies it as a dominant cost.

### Task 4.2 — Remove packaged external-font dependency

**Files:**

- Modify `src/ui/map/index.html`
- Modify `src/ui/warroom/index.html`
- Modify relevant CSS/font assets only if reviewed local WOFF2 files and licenses are present
- Create `tests/ui/packaged_font_network_contract.test.ts`

- [ ] Remove Google Fonts preconnect, stylesheet link, and CSS `@import` from packaged entrypoints.
- [ ] Use reviewed local webfonts if already supplied with license provenance; otherwise retain the current CSS family names with system fallbacks.
- [ ] Do not fetch or add unreviewed font binaries during implementation.
- [ ] Assert packaged HTML contains no `http://` or `https://` font dependency.

### Task 4.3 — Split only measured optional modules

**Entry gate:** Cold P95 still exceeds 1,500 ms and the Phase 0 module timeline shows optional JS evaluation/preload as material.

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
npm.cmd run test:vitest -- tests/ui/map_shell_persistence.test.tsx tests/ui_map_build_warning_contract.test.ts tests/ui/packaged_font_network_contract.test.ts tests/ui_map_entry_budget_contract.test.ts tests/ui_map_browser_safe_imports.test.ts --pool=forks --reporter=dot
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
npm.cmd run test:vitest -- tests/ui/map_transition_timing.test.ts tests/map_transition_profile_harness.test.ts tests/ui/map_shell_persistence.test.tsx tests/ui/warroom_tactical_map_lifecycle.test.ts tests/ui/map_data_loader_cache.test.ts tests/ui/map_critical_first_init.test.ts tests/ui/map_context_lifecycle.test.ts tests/ui/map_loading_state.test.ts tests/ui/warroom_shell_ownership.test.ts tests/ui/shell_navigation_ownership.test.ts tests/ui_map_render_smoke.test.ts tests/ui_map_build_warning_contract.test.ts tests/desktop_pmtiles_protocol_route.test.ts tests/desktop_packaged_runtime_probe.test.ts --pool=forks --reporter=dot
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

- [ ] Run three clean launches on the recorded target/development machine.
- [ ] Run 3 warmups + 20 measured switches per launch.
- [ ] Capture one Command Room screenshot, one first cold correct-state map screenshot, and one warm correct-state map screenshot per launch.
- [ ] Verify map interaction: pan, zoom, select a visible formation/stack, open a settlement, return to the Command Room, reopen map.
- [ ] Verify the displayed turn/fingerprint after a turn advanced from the Command Room.
- [ ] Verify no hidden map input or shortcut fires while the Command Room owns focus.
- [ ] Record p50/p95, construction/release/resource counts, diagnostic counts, runtime versions, viewport, and machine class in a bounded summary.

**Acceptance table:**

| Metric | Baseline | Final | Target | Result |
|---|---:|---:|---:|---|
| Warm switch P50 | record Phase 0 | record | informational | |
| Warm switch P95 | record Phase 0 | record | <= 150 ms | |
| Warm MapLibre constructions | record | record | 0 | |
| Warm WebGL releases | record | record | 0 | |
| Warm static resource requests | record | record | 0 | |
| Cold current-state P50 | record | record | <= 1,000 ms | |
| Cold current-state P95 | record | record | <= 1,500 ms | |
| Stale/blank samples | record | record | 0 | |
| Unexpected diagnostics | record | record | 0 | |

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

- [ ] Document campaign-scoped map ownership, reveal/resize behavior, static-resource cache ownership, and cold/warm metric definitions.
- [ ] Include the before/after acceptance table and exact evidence path.
- [ ] Move the command-board row to `CLOSED` only when every Phase 5 target passes.
- [ ] Add a short roadmap closure amendment; do not rewrite historical amendments.
- [ ] Do not update package version, tag, release state, or `FORAWWV.md`.

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

- [ ] Orchestrator oversees all phases.
- [ ] Technical Architect reviews the campaign-scoped ownership boundary.
- [ ] Napkin and life-lessons indexes are read at session start.
- [ ] TDD red/green proof precedes behavior changes.
- [ ] `/simplify` runs between every phase and its findings are fixed before the next phase.
- [ ] Typecheck and focused Vitest run after every phase.
- [ ] One logical phase per commit after implementation is authorized.
- [ ] Process QA validates the closeout.
- [ ] Ledger and implementation report are updated on completion.
- [ ] No version, tag, push, PR, signing, upload, installer publication, or release mutation occurs without the separate publication instruction.

---

## 12. Success Criteria

- [ ] The current-turn tactical map stays mounted across Command Room transitions.
- [ ] Warm P95 is <= 150 ms over the defined sample.
- [ ] Warm transitions create/release zero graphics contexts and request zero static map resources.
- [ ] Cold current-state P50/P95 meet 1,000/1,500 ms targets on the recorded machine.
- [ ] All accepted frames are current-turn/current-fingerprint, interactive, and fog-safe.
- [ ] Sandbox remains functional without weakening the stable interactive-shell contract.
- [ ] Map cleanup remains exact on real campaign/app exit.
- [ ] Focused, player-journey, browser, Electron runtime, build, EOL, and diff gates pass.
- [ ] Roadmap, command board, masters, report, ledger, and knowledge are synchronized.

---

## 13. Execution Log

| Phase | Status | Commit | Verification | Evidence |
|---|---|---|---|---|
| 0 Baseline | Complete | Phase 0 commit + two review-fix follow-ups | 26 focused + 20 Electron-contract Vitest tests; typecheck; tactical-map and warroom builds; 3 cold launches + 3 warmups + 20 measured warm cycles per launch; whole-evidence volatility scan | `tmp-map-transition-perf/baseline-stable-process-diagnostics-v2/baseline.json` |
| 1 Persistent viewport | Not started | — | — | — |
| 2 Stable shell | Not started | — | — | — |
| 3 Resource/cache | Not started | — | — | — |
| 4 Cold-entry residual | Not started | — | — | — |
| 5 Acceptance | Not started | — | — | — |
| 6 Closeout | Not started | — | — | — |

The authoritative Phase 0 baseline records cold current-state-rendered p50/p95 of 5095.2/5100.42 ms and warm interactive-switch p50/p95 of 4171.2/4539.09 ms on app 0.9.9-beta.1, Electron 41.0.3, and Chromium 146.0.7680.80. Its bounded machine manifest is Windows x64, AMD x64 CPU class, 9–16 logical processors, 17–32 GiB memory, and a 1386×837 viewport at 1.5 device scale. All 72 transitions follow the locked milestone order and contain current-state proof; unexpected diagnostics, stale samples, lifecycle imbalances, and repository-save changes are zero. The whole 109,248-byte JSON contains zero loopback HTTP/WebSocket endpoints, UUIDs, Windows absolute/user-home paths, or values in the Windows ephemeral-port range. Expected stdout is retained only as `tactical_map_server_started: 3` and `built_map_server_selected: 6`; expected stderr is retained only as `inspector_shutdown: 3` and `inspector_help: 3`. Every one of the 60 measured warm cycles reconstructed and released one map and repeated static resource requests, establishing the Phase 1 lifecycle target without changing player behavior.

`tmp-map-transition-perf/baseline-stable-process-diagnostics-v2/baseline.json` supersedes all retained earlier artifacts. `baseline-complete-marks` is not valid acceptance evidence because all 72 samples placed full MapLibre `load` after current-state render and its field labeled `cold_current_state_ms` summarized `interactive`. `baseline-ordered-current-state` corrected those semantics but persisted expected local-server stdout verbatim, including ephemeral loopback URLs and ports. The intermediate `baseline-stable-process-diagnostics` capture proved category reduction but preceded generic unexpected-line URL/path redaction. Schema 3 v2 classifies expected stdout/stderr before serialization and retains only sanitized stable unexpected lines.

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
