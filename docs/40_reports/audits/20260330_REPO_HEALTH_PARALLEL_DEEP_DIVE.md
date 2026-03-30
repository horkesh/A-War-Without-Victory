# Repo Health Parallel Deep Dive

> Superseded by `20260330_REPO_HEALTH_CONSOLIDATED.md` for owner-facing use. This file remains as source material.

**Date:** 2026-03-30  
**Purpose:** Follow-on engineering audit expanding the first repo health memo into four focused tracks:

1. Brigade movement authority
2. Execution entrypoints and runners
3. Mega-file risk
4. UI adapter / map container maintenance risk

This is still a **read-only advisory document**. No code changes were made.

---

## Track 1: Brigade Movement Authority

## What exists

The repo has multiple distinct mechanisms that can change brigade location, movement state, or effective availability to the front.

### Direct movement systems

1. `src/sim/combat/brigade_movement.ts`
   - classic brigade movement state machine
   - pack -> in_transit -> unpack
   - settlement-based pathfinding through friendly territory

2. `src/sim/combat/osid_column_movement.ts`
   - OSID-native column march
   - terrain-weighted Dijkstra pathfinding
   - explicit transit state

3. `src/sim/combat/bot_brigade_movement_ai.ts`
   - brigade AI movement logic
   - chooses between BFS movement, interior movement, and column march
   - not execution itself, but decision authority over movement orders

4. `src/sim/combat/bot_brigade_eval_front.ts`
   - front-evaluation logic
   - can write movement intent to fill gaps, reinforce fronts, and reposition brigades

### Movement-adjacent redistribution systems

5. `src/sim/combat/strategic_reserve.ts`
   - not physical movement on map
   - but does redistribute manpower across municipalities/factions in a way that changes effective force availability

6. `src/sim/combat/army_reserve_system.ts`
   - loan / reserve reinforcement logic
   - again, not literal marching, but changes where military strength is effectively applied

### Other related authority paths

7. `state.military.brigade_movement_orders`
   - shared order bucket touched by multiple systems

8. `state.military.column_march_orders`
   - separate order channel for column movement

9. brigade home return / evacuation / redistribution utilities referenced elsewhere in combat code
   - these are smaller, but they add to the “who owns relocation?” problem

## What this means

The repo does **not** have a single obvious “brigade relocation authority.”

Instead, it has:

- movement execution systems
- AI movement decision systems
- front-repair and redistribution systems
- reserve systems that act like strategic repositioning

A strong engineer would not call this “wrong,” but would call it **fragile** unless the ownership boundaries are extremely explicit.

## Where conflict risk lives

The clearest warning sign is not just multiple files. It is that several paths can write or influence movement orders against shared state.

Examples visible from code inspection:

- `bot_brigade_eval_front.ts` reads and writes `state.military.brigade_movement_orders`
- `brigade_front_distribution.ts` also writes movement orders
- `brigade_home_return.ts` also writes movement orders
- `bot_brigade_ai_osid.ts` writes movement and column march orders

That is exactly the pattern that creates:

- last-writer-wins behavior
- hidden order overwrites
- “why did this brigade move here?” debugging pain

## Bottom line

The movement problem is not “too many files.”
The real problem is:

**too many actors with authority over relocation**

If engineers do a cleanup pass later, this is the first subsystem that deserves a clear ownership map.

## Most concerning findings

1. Movement authority is distributed across several AI and execution layers, not clearly centralized.
2. Shared order buckets (`brigade_movement_orders`, `column_march_orders`) are touched from multiple places.
3. Reserve/manpower relocation systems increase conceptual overlap even when they are not literal marching systems.

---

## Track 2: Execution Entrypoints and Runners

## Main files identified

- `src/sim/turn_pipeline.ts`
- `src/state/turn_pipeline.ts`
- `src/turn/pipeline.ts`
- `src/sim/run_combat_browser.ts`
- `src/scenario/scenario_runner.ts`
- `src/desktop/desktop_sim.ts`
- multiple CLI wrappers under `src/cli/`

## High-level map

### Core canonical turn execution

`src/sim/turn_pipeline.ts`

- exports `runTurn()`
- war pipeline orchestrator
- uses `war_phases.ts`
- bottom-up formation mode hooks in early-war steps

This looks like the main engine-side turn contract.

### Scenario harness

`src/scenario/scenario_runner.ts`

- large headless harness
- deterministic multi-turn runs
- artifact writing
- diagnostics
- scenario loading
- reporting

This is effectively the main **simulation run platform** around `runTurn()`.

### Browser-safe subset

`src/sim/run_combat_browser.ts`

- explicitly says browser-safe war-phase turn advance
- not full war-phase
- no Node/fs

This is a legitimate special-case runner, but it increases cognitive load because it is “real” while also being a subset.

### Additional turn pipeline variants

`src/state/turn_pipeline.ts`
`src/turn/pipeline.ts`

These are the files that would make a maintainer pause. Even if they are documented, having multiple turn-pipeline-ish files alive at once raises the cost of confidence.

## My read

The docs are actually fairly honest here. `CODE_CANON.md`, `REPO_MAP.md`, and `PIPELINE_ENTRYPOINTS.md` do a decent job of saying which path is canonical and which are legacy/minimal/subset.

So the main issue is **not undocumented chaos**.

The issue is that the repo still has too many live-looking execution paths:

- canonical engine run
- scenario harness
- browser-safe subset
- minimal harness
- desktop wrapper
- many CLI entrypoints

This is manageable, but not cheap to maintain.

## Most concerning findings

1. Multiple turn-runner-like files are still present in active source, even when only one is canon.
2. `scenario_runner.ts` is not just a wrapper; it has become a major system hub.
3. Browser-safe and legacy/minimal variants increase the chance that future work accidentally lands in the wrong path.

---

## Track 3: Mega-File Risk

## Largest risk files observed

- `src/ui/map/map/MapContainer.tsx` — **2581** lines
- `src/sim/turn_phases/war_phases.ts` — **2539** lines
- `src/scenario/scenario_runner.ts` — **2367** lines
- `src/ui/map/data/GameStateAdapter.ts` — **2319** lines
- `src/sim/combat/sector_offensive.ts` — **1868** lines
- `src/sim/combat/bot_corps_directives.ts` — **1857** lines
- `src/desktop/electron-main.cjs` — **1826** lines
- `src/state/game_state.ts` — **1803** lines
- `src/sim/combat/attack_resolution_osid.ts` — **1769** lines

## What a senior engineer sees here

Large files are normal in complex simulation and UI code.
What matters is whether they are large because they contain one dense domain, or large because they accumulated too many responsibilities.

In this repo, several of these files look like **responsibility concentrators**:

- orchestration
- compatibility
- adapter translation
- side-effect coordination
- domain policy

That combination is where bugs breed.

## Comment and annotation quality

Approximate comment-like density in selected hotspots:

- `src/sim/combat/bot_corps_ai.ts` — about **32%**
- `src/sim/combat/sector_offensive.ts` — about **23.4%**
- `src/sim/combat/bot_corps_directives.ts` — about **21.1%**
- `src/sim/turn_phases/war_phases.ts` — about **4.6%**
- `src/scenario/scenario_runner.ts` — about **6%**
- `src/ui/map/map/MapContainer.tsx` — about **5.8%**
- `src/ui/map/data/GameStateAdapter.ts` — about **3%**

Interpretation:

- Sim subsystems generally explain themselves reasonably well.
- Giant integration/orchestration files are under-explained relative to their size.

This is exactly backwards from what future maintainers need most.

## Top breakup priorities

### 1. `war_phases.ts`

Why:

- central to engine order of operations
- high blast radius
- likely to keep growing by insertion

### 2. `scenario_runner.ts`

Why:

- mixes execution, I/O, reporting, diagnostics, artifact concerns
- too important to be this large

### 3. `MapContainer.tsx` / `GameStateAdapter.ts`

Why:

- both are integration sinks on the UI side
- both are likely to become “fix it here” files

## Most concerning findings

1. Several core files are beyond the size where one person can confidently reason about all side effects.
2. The least-commented files are some of the most integration-heavy.
3. Multiple large files appear to serve as architecture shock absorbers for ongoing transitions.

---

## Track 4: UI Adapter / Map Container Maintenance Risk

## File 1: `src/ui/map/data/GameStateAdapter.ts`

## What it owns

This file appears to own a very wide slice of UI-facing data shaping:

- transforms raw `GameState` into `LoadedGameState`
- display-name generation
- enclave derivation helpers
- command briefing construction
- negotiation-related derived UI values
- compatibility fallbacks for legacy save shapes
- flattening and merging officer, formation, operation, and state data into UI-friendly structures

This is a classic adapter file, but it is now large enough to behave like a **UI domain translation layer** rather than a simple adapter.

## Why it looks like a dumping ground

Symptoms:

- **2319** lines
- low comment density relative to size
- multiple fallback and compatibility branches
- large embedded static maps and display tables
- TODOs for incomplete migration

Example signs of transition still alive here:

- legacy wrapper acceptance
- peace/legacy vs war-phase logic comments
- fallback synthesis for older save shapes
- TODO to migrate UI away from legacy negotiation-capital usage

This is the kind of file engineers start using as a “safe place to patch the UI” because it touches everything. That is dangerous.

## Comment quality

The file has a decent top-level description, but not enough sectional explanation for its size.

What is missing:

- stronger section boundaries
- clearer ownership notes
- “this logic is temporary until X is removed” markers in one consistent style

Right now the file explains *that* it adapts, but not always *why this derivation belongs here* versus elsewhere.

---

## File 2: `src/ui/map/map/MapContainer.tsx`

## What it owns

This file appears to coordinate almost the entire tactical map surface:

- MapLibre setup
- Deck.gl overlay integration
- data-source loading
- GeoJSON builder wiring
- source/layer registration
- visibility toggles
- interaction hooks
- selection state sync
- hover state
- overlay sync
- map-store coupling
- IPC-driven order staging hooks

That is far more than “container” suggests.

## Why it looks like an integration sink

The import list is the giveaway.

This file depends on:

- data loaders
- many GeoJSON builders
- store state setters/selectors
- interaction hook
- IPC layer
- order staging actions
- icon setup
- deck-layer composition
- ghost-map support
- sector utilities

In practice, this file is acting as:

- map bootstrapper
- map renderer coordinator
- overlay manager
- interaction controller
- state synchronization hub

That is a lot of power in one file.

## Comment quality

This file has many small tactical comments:

- layer ID explanations
- visibility notes
- some effect guard comments

Those are useful, but they do not fully solve the maintenance problem because the file lacks higher-level structural annotation.

What is needed for maintainers is stronger comments around:

- lifecycle phases of the component
- which effects are “load once” vs “reactive update”
- which store values are authoritative
- where source/layer ownership begins and ends

Right now, someone new will have to reconstruct the mental model from imports and effects.

## Top 3 risks for future UI work

1. **Incidental coupling**
   - a new map mode or overlay could break unrelated behavior because too much wiring is centralized here

2. **Effect-order fragility**
   - with this many refs, effects, and source updates, future changes can easily create race conditions or stale UI state

3. **Adapter drift**
   - the UI may keep compensating for backend schema or transition issues inside `GameStateAdapter` instead of enforcing cleaner contracts upstream

---

## Overall Conclusions Across All Four Tracks

## What is genuinely strong

- The repo is not careless.
- It has serious docs.
- It has serious tests.
- Core sim modules often carry useful intent comments.

## What is genuinely risky

- ownership overlap
- compatibility layers lingering in core paths
- multiple runner/movement pathways alive at once
- integration sinks getting larger instead of thinner

## The single best summary

This repo’s main code-health problem is:

**too many responsibilities are currently shared instead of cleanly owned**

That shows up differently in each track:

- movement: too many actors can relocate force
- runners: too many live-looking execution paths
- mega-files: too many concerns in one place
- UI: too much adaptation and map coordination concentrated in two files

## What engineers should worry about first

1. Brigade movement authority
2. `war_phases.ts` and `scenario_runner.ts`
3. `GameStateAdapter.ts` becoming the permanent place where architectural mismatches go to hide

---

## Notes

- This deep dive supplements the earlier high-level audit.
- No code was changed.
- `FORAWWV.md` was not edited.
- Ledger handling was considered. No ledger update was made because this document records analysis only and does not change behavior, workflow, or canon.
