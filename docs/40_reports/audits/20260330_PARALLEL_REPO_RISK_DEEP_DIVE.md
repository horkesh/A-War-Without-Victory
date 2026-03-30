# Parallel Repo Risk Deep Dive

> Superseded by `20260330_REPO_HEALTH_CONSOLIDATED.md` for owner-facing use. This file remains as source material.

**Date:** 2026-03-30  
**Mode:** Read-only audit  
**Related:** `docs/40_reports/audits/20260330_REPO_CODE_HEALTH_AUDIT.md`

## Purpose

Follow-up deep dive on four high-value maintenance questions:

1. Brigade movement authority
2. Canonical entrypoints and execution paths
3. Mega-file structural risk
4. UI adapter / map container maintenance risk

This document is meant to answer the practical question:

> “If a serious engineer had to maintain this repo next month, where would they lose time or confidence?”

---

## 1. Brigade Movement Authority Audit

## Bottom line

You were right to be uneasy. Brigade relocation authority is split across too many files and too many conceptual layers.

There is no single obvious answer to:

> “Which subsystem is allowed to decide where a brigade goes next?”

That is a maintainability problem even if the current behavior is mostly correct.

## Inventory: systems that can change effective brigade position or availability

### A. Direct movement / transit systems

1. `src/sim/combat/brigade_movement.ts`
   - core pack / transit / unpack lifecycle
   - processes `brigade_movement_orders`
   - real movement state machine

2. `src/sim/combat/osid_column_movement.ts`
   - separate OSID-terrain-aware column movement logic
   - effectively another movement engine

3. `src/sim/combat/bot_brigade_movement_ai.ts`
   - AI that decides movement-related behavior
   - not just movement execution, but movement choice

4. `src/sim/combat/bot_brigade_eval_front.ts`
   - front-position evaluation that can issue or rewrite movement orders
   - especially relevant for front gaps, repositioning, and sector behavior

5. `src/sim/combat/brigade_front_distribution.ts`
   - redistributes brigades toward front positions
   - writes into movement-order flows

6. `src/sim/combat/brigade_home_return.ts`
   - separate return-home / recall logic
   - movement-like authority with its own rationale

### B. Indirect movement / availability systems

7. `src/sim/combat/strategic_reserve.ts`
   - not normal map movement, but changes operational availability through reserve collection and reinforcement flows

8. `src/sim/combat/army_reserve_system.ts`
   - elite loans, reserve assignments, recall
   - affects which corps controls a brigade and where it is effectively available

9. `src/sim/combat/bot_brigade_ai_osid.ts`
   - central brigade AI path that stages and issues movement-adjacent orders

10. `src/desktop/electron-main.cjs`
   - desktop-side order staging can write movement orders directly into state

## Where the overlaps are dangerous

### 1. Multiple writers to `brigade_movement_orders`

Audit evidence shows writes or management touching `state.military.brigade_movement_orders` in several places, including:

- `bot_brigade_eval_front.ts`
- `brigade_front_distribution.ts`
- `brigade_home_return.ts`
- `bot_brigade_ai_osid.ts`
- `electron-main.cjs`

This is the strongest evidence of split authority.

Professional concern:

- last-writer-wins bugs
- hidden order cancellation
- difficult root-cause analysis for brigade drift

### 2. “Movement” and “reallocation” are mixed together conceptually

Some systems move a brigade physically.
Some systems change where it is assigned.
Some systems change where it is available to be used.

Those are three different concepts:

- physical transit
- command assignment
- manpower / reserve availability

The repo currently puts them close enough together that they can be mentally conflated.

### 3. Different pathfinding models coexist

The repo is carrying multiple path models:

- settlement BFS
- OSID movement
- front evaluation movement logic
- reserve/loan systems that bypass normal transit concerns

That increases the chance that two systems answer “can this brigade get there?” differently.

## Three most concerning findings

1. **Movement order ownership is not centralized.**  
   More than one subsystem can decide or rewrite brigade relocation behavior.

2. **Physical movement and operational availability are too easy to confuse.**  
   A maintainer can think they are changing one when they are really affecting another.

3. **The project is carrying both execution engines and advisory engines for movement.**  
   That is fertile ground for contradictory assumptions.

## Practical recommendation

The next movement audit should answer one precise question for every file involved:

> “Is this file allowed to decide movement, execute movement, recommend movement, or only observe movement?”

Right now those boundaries are not sharp enough.

---

## 2. Canonical Entrypoints And Execution Paths

## Bottom line

The repo does have a documented canonical path, but the codebase still carries enough adjacent runners and wrappers that a new maintainer could get confused quickly.

The docs are doing good work here. The code shape is still a little too plural.

## Current entrypoint map

### Primary war-phase execution

1. `src/sim/turn_pipeline.ts`
   - `runTurn(...)`
   - appears to be the main war-phase turn orchestrator
   - calls `warPhases`
   - can also inject selected early-war steps for bottom-up mode

### Canonical non-war weekly turn pipeline

2. `src/state/turn_pipeline.ts`
   - `runOneTurn(...)`
   - explicitly rejects war phase
   - separate canonical weekly phase pipeline

### Browser-safe subset

3. `src/sim/run_combat_browser.ts`
   - browser-safe war-phase turn advance
   - not full simulation
   - increments turn only
   - explicitly says full war-phase sim must use `runTurn`

### Desktop wrapper

4. `src/desktop/desktop_sim.ts`
   - Electron-facing API
   - wraps scenario load / state load / advance turn / read-only queries
   - calls `runTurn(...)` for war phase

### Scenario harness

5. `src/scenario/scenario_runner.ts`
   - large deterministic harness
   - orchestrates multi-turn runs, reporting, artifacts, diagnostics
   - central to analysis and calibration

### Legacy / minimal

6. `src/turn/pipeline.ts`
   - minimal harness
   - explicitly non-canonical per docs

## What is healthy here

- The docs are explicit about canonical vs non-canonical paths.
- `run_combat_browser.ts` is honest about being a subset, not pretending to be the full engine.
- `desktop_sim.ts` looks like a wrapper, not a shadow engine.

## What is risky here

### 1. Multiple “almost-primary” paths remain in the tree

Even if documentation is accurate, maintainers still have to remember:

- war canonical path
- non-war canonical path
- browser subset path
- desktop wrapper path
- scenario harness path
- legacy minimal path

That is a lot of execution vocabulary.

### 2. The scenario harness is so large it feels like an alternate center of gravity

`src/scenario/scenario_runner.ts` is not just a thin runner. At **2367** lines, it has enough weight that it risks becoming a second architectural center instead of “just the harness.”

### 3. Wrappers can silently become logic owners

`src/desktop/desktop_sim.ts` is large enough (**798** lines) that it is no longer a tiny adapter. Large wrappers often begin by routing, then gradually accumulate business logic.

## Top 3 maintainability concerns

1. **Too many execution nouns.**  
   `runTurn`, `runOneTurn`, browser turn, scenario harness, desktop advance, legacy pipeline.

2. **The harness is oversized for something that should mostly orchestrate.**

3. **A new engineer can follow the docs and still feel uneasy about where ownership really lives.**

## Practical recommendation

The repo needs a one-page “execution authority map” answering:

- who advances canonical war turns
- who advances non-war turns
- who is read-only
- who is wrapper-only
- who is legacy and must not grow

The docs are close. The next step is making that map impossible to misunderstand.

---

## 3. Mega-File Risk Audit

## Bottom line

The largest files are not random. They are mostly integration hubs and orchestration hubs.

That means the risk is not just line count. It is **responsibility density**.

## Highest-risk files from this audit

### Tier 1 risk

1. `src/sim/turn_phases/war_phases.ts` — **2539** lines
2. `src/scenario/scenario_runner.ts` — **2367** lines
3. `src/ui/map/map/MapContainer.tsx` — **2581** lines
4. `src/ui/map/data/GameStateAdapter.ts` — **2319** lines

### Tier 2 risk

5. `src/sim/combat/sector_offensive.ts` — **1868** lines
6. `src/sim/combat/bot_corps_directives.ts` — **1857** lines
7. `src/desktop/electron-main.cjs` — **1826** lines
8. `src/state/game_state.ts` — **1803** lines
9. `src/sim/combat/attack_resolution_osid.ts` — **1769** lines

## What responsibilities are mixed together

### `war_phases.ts`

Likely mixes:

- pipeline order definition
- integration sequencing
- system wiring
- compatibility glue
- report stitching

This is a classic “change sequencing carefully or the whole turn changes” file.

### `scenario_runner.ts`

Likely mixes:

- scenario execution
- artifact generation
- validation
- reporting
- compatibility handling
- calibration support

That is too much centrality for one file.

### `MapContainer.tsx`

Clearly mixes:

- MapLibre initialization
- layer/source orchestration
- selection logic
- store synchronization
- IPC usage
- overlay state
- deck.gl hybrid behavior
- mode-specific rendering behavior

This is not just a container anymore. It is a map runtime hub.

### `GameStateAdapter.ts`

Clearly mixes:

- schema adaptation
- fallback compatibility handling
- display formatting
- UI-friendly derivation
- naming cleanup
- domain aggregation

This is a translation sink.

## Comments and annotation quality

### Adequate or better

Approximate comment-like line density from the audit sample:

- `src/sim/combat/bot_corps_ai.ts` — **32%**
- `src/sim/combat/sector_offensive.ts` — **23.4%**
- `src/sim/combat/bot_corps_directives.ts` — **21.1%**

These files benefit from domain headers and intent explanations.

### Weak relative to size and importance

- `src/sim/turn_phases/war_phases.ts` — **4.6%**
- `src/scenario/scenario_runner.ts` — **6%**
- `src/ui/map/map/MapContainer.tsx` — **5.8%**
- `src/ui/map/data/GameStateAdapter.ts` — **3%**

The issue is not “too few comments” in a generic sense.
The issue is “too little explanation in files where maintainers need architectural orientation.”

### Additional warning sign

Several of the comments that do exist are compatibility comments:

- legacy
- deprecated
- backward-compatible
- fallback

Useful, but also evidence that the project is still carrying more generations of behavior than ideal.

## Top 3 breakup priorities

1. **`war_phases.ts`**
   - because pipeline order bugs are expensive and subtle

2. **`GameStateAdapter.ts`**
   - because adapter sinks silently absorb schema debt

3. **`MapContainer.tsx`**
   - because UI complexity concentrated there will slow every future map feature

`scenario_runner.ts` is also a top concern, but I would rank it just after those three because the harness can sometimes tolerate size better than the main live runtime path.

---

## 4. UI Adapter / Map Container Maintenance Risk

## Bottom line

`GameStateAdapter.ts` and `MapContainer.tsx` are the UI files most likely to become future pain multipliers.

They are doing real work. They are also absorbing too much cross-system complexity.

## `src/ui/map/data/GameStateAdapter.ts`

## What it appears to own

- raw saved-state adaptation
- flattening GameState into UI models
- naming / display normalization
- fallback compatibility logic
- enclave derivation and other view computations
- display-oriented defaults

## Why it is risky

This file has the shape of a “just put it in the adapter” magnet.

That is dangerous because:

- schema drift gets normalized instead of fixed at the source
- view-specific hacks accumulate
- legacy branches linger forever
- UI begins depending on adapter quirks instead of actual model contracts

Audit evidence:

- multiple compatibility and legacy comments
- TODOs that show the UI still depends on older negotiation-capital paths
- low comment density relative to size

## `src/ui/map/map/MapContainer.tsx`

## What it appears to own

From the import and constant surface alone, it is handling:

- MapLibre startup
- source/layer registration
- deck.gl integration
- order staging hooks
- IPC access
- selection state
- hover state
- overlay management
- map-mode-specific rendering
- city labels, battle markers, fog, sectors, operations, formations, ethnic layers, ghost paths

This is a very broad runtime surface.

## Why it is risky

When one file owns this many concerns:

- onboarding cost rises
- regressions become hard to localize
- feature work encourages more additions instead of better decomposition
- testing often becomes indirect rather than local

This is how front-end infrastructure becomes “nobody wants to touch it.”

## Comment quality for maintainers

### Good

- plenty of naming constants
- some defensive helper functions
- some comments clarifying selection / zoom / overlay behavior

### Weak

- not enough higher-level explanation for a 2500-line integration hub
- little guidance on which responsibilities are stable vs transitional
- no obvious “mental map” section near the top of the file

## Top 3 future UI risks

1. **MapContainer becomes the default dumping ground for every new map feature.**

2. **GameStateAdapter becomes the place where model inconsistencies get hidden instead of resolved.**

3. **UI engineers will be forced to understand too much simulation detail to make safe front-end changes.**

That third point is especially expensive. Good UI surfaces should consume stable view models, not constantly renegotiate engine history.

---

## Consolidated Priority View

If I had to rank the four audit tracks by urgency:

1. **Brigade movement authority**
   - most likely to create “why did this happen?” bugs

2. **Mega-file breakup risk**
   - most likely to slow future engineers and make safe changes expensive

3. **UI integration sinks**
   - most likely to create drag on new interface work

4. **Entrypoint pluralism**
   - manageable today because docs are fairly strong, but still worth tightening

---

## Most Important Non-Coder Takeaway

The repo’s problem is not “the coders were sloppy.”

The repo’s problem is:

- too many overlapping authorities
- too many transition layers
- too many big files acting as central glue

That is the kind of issue a real engineer takes seriously, because those are the things that turn a smart codebase into a brittle one.

## Final Summary

If you want the blunt version:

- The project is serious.
- The maintainability debt is real.
- The biggest debt is **ownership clarity**, not raw code quality.

If this repo gets a simplification phase after the current commander milestone, that will not be cosmetic cleanup. It will be core engineering work.

---

## Notes

- No code was changed.
- No tests were run for this deep dive.
- This audit documents repo state only and does not change canon, behavior, or workflow.
