# Repo Code Health Audit Addendum

> Superseded by `20260330_REPO_HEALTH_CONSOLIDATED.md` for owner-facing use. This file remains as source material.

**Date:** 2026-03-30  
**Purpose:** Follow-up to the main repo health audit with four deeper tracks run in parallel:

1. Brigade movement authority
2. Canonical entrypoints and execution-path overlap
3. Oversized hotspot files and orchestration concentration
4. UI adapter / map container maintenance risk

This is still a **read-only advisory document**. No code changes were made.

---

## Track 1: Brigade Movement Authority

## Bottom-line verdict

Your instinct was correct. The repo does not have one clean movement authority. It has a **cluster of systems** that can alter brigade position, transit state, readiness to act, or effective presence on the front.

Some of these are true physical movement.
Some are operational staging.
Some are manpower transfer or reserve logic that changes effective availability without looking like movement.

That distinction matters because engineers will otherwise argue past each other.

## 1. Numbered inventory

### A. True movement systems

1. **Settlement-based brigade movement**
   - `src/sim/combat/brigade_movement.ts`
   - Handles `packing -> in_transit -> unpacking -> deployed`
   - Consumes `state.military.brigade_movement_orders`
   - Uses settlement graph pathfinding through friendly territory

2. **OSID-native column movement**
   - `src/sim/combat/osid_column_movement.ts`
   - Terrain-weighted Dijkstra pathing for faster redeployment in column
   - Also reads movement intent and writes transit state
   - Changes `location_osid` on arrival

3. **Bot brigade movement logic**
   - `src/sim/combat/bot_brigade_movement_ai.ts`
   - Chooses between 1-hop movement, interior movement, and column march
   - Generates move intent rather than directly executing movement

4. **Bot brigade front / sector marching**
   - `src/sim/combat/bot_brigade_eval_front.ts`
   - Generates movement or column-march orders to:
     - cover front gaps
     - march to sector fronts
     - return to corps area
     - evacuate pockets

5. **Reposition order system**
   - `src/sim/combat/apply_brigade_reposition.ts`
   - Applies `state.military.brigade_reposition_orders`
   - Distinct from the main movement-order pipeline

6. **Front redistribution**
   - `src/sim/combat/brigade_front_distribution.ts`
   - Redistributes brigades toward empty or under-covered front positions
   - Writes movement orders directly

7. **Home-return system**
   - `src/sim/combat/brigade_home_return.ts`
   - Issues return-home movement orders for certain brigades
   - Separate authority path writing `brigade_movement_orders`

### B. Operation-driven relocation systems

8. **Sector offensive staging / operation launch movement**
   - `src/sim/combat/sector_offensive.ts`
   - Issues movement orders for participating brigades as part of planning/staging
   - Also coordinates loaned reinforcement arrivals

9. **Operation reinforcement / loaned brigade arrivals**
   - `src/sim/combat/operation_reinforcement.ts`
   - Finds reinforcements, calculates travel, and makes borrowed brigades available to operations
   - Changes effective position/availability through operation assignment

10. **Bot brigade AI execution layer**
    - `src/sim/combat/bot_brigade_ai_osid.ts`
    - Central execution orchestrator that collects movement decisions from sub-evaluators
    - Writes `brigade_movement_orders` and `column_march_orders`

### C. Not true movement, but changes effective availability/positioning power

11. **Strategic reserve**
    - `src/sim/combat/strategic_reserve.ts`
    - Pure manpower flow / reserve reinforcement
    - Does not physically march brigades, but changes who can keep fighting and where strength appears

12. **Army reserve / elite loan system**
    - `src/sim/combat/army_reserve_system.ts`
    - Can attach, loan, deploy, and recall elite or reserve capability
    - More “force availability transfer” than map movement, but operationally it behaves like a repositioning authority

## 2. Ownership and conflict risks

### Risk A: many writers to `brigade_movement_orders`

This is the clearest conflict point.

Writers or mutators include at least:

- `bot_brigade_ai_osid.ts`
- `bot_brigade_eval_front.ts`
- `brigade_front_distribution.ts`
- `brigade_home_return.ts`
- `sector_offensive.ts`
- `electron-main.cjs` via desktop staging paths
- `brigade_movement.ts` consumes and clears
- `brigade_movement_orders.ts` also exists as a separate handler

This means one engineer cannot safely answer “who moved this brigade?” without checking several layers.

### Risk B: multiple movement models coexist

At minimum, the repo has:

- settlement-based transit
- OSID-native column movement
- bot-issued movement intent
- reposition-order application

Those are not just helpers. They represent different models of motion.

### Risk C: movement and availability are mixed conceptually

The repo mixes:

- actual relocation
- staging
- reserve lending
- manpower reinforcement
- front redistribution

That makes discussions slippery. A coder may say “movement is broken” when the actual issue is reserve logic, operation staging, or direct reassignment.

## 3. Places where multiple systems can issue competing orders

### Competing-order hotspots

1. `state.military.brigade_movement_orders`
   - written by several systems
   - likely last-writer-wins in some paths

2. `column_march_orders`
   - assembled in brigade AI evaluation paths
   - can conflict conceptually with normal movement intent

3. `brigade_reposition_orders`
   - separate path from normal movement orders
   - gives the repo another relocation authority channel

4. Operation staging vs front coverage
   - `sector_offensive.ts`
   - `bot_brigade_eval_front.ts`
   - `brigade_front_distribution.ts`
   These can all have legitimate reasons to move the same brigade.

5. Home-return vs active front logic
   - `brigade_home_return.ts`
   - front/sector evaluators
   This is exactly the kind of “why did it leave the front?” confusion that produces non-obvious bugs.

## 4. Three most concerning findings

1. **There is no obvious single owner of brigade relocation.**
   Engineers will keep tripping over this until the project explicitly names one layer as authoritative.

2. **The repo has both multiple movement executors and multiple movement intent generators.**
   That is worse than just having multiple helpers.

3. **Operational availability systems blur into movement systems.**
   Strategic reserve and army reserve are not map movement, but they change battlefield reality enough that the architecture currently feels conceptually mixed.

---

## Track 2: Canonical Entrypoints and Execution-Path Overlap

## Bottom-line verdict

The repo does have documented canonical entrypoints, but the codebase still carries enough parallel pathways that ownership is easy to blur.

The docs are better than the architecture here. The docs know what should be canonical. The tree still contains several parallel ways to advance or simulate state.

## 1. Entry-point map

### Main war-phase path

1. `src/sim/turn_pipeline.ts`
   - `runTurn(...)`
   - appears to be the canonical war-phase turn orchestrator

2. `src/sim/turn_phases/war_phases.ts`
   - giant ordered step list and imports for war-phase simulation

### Canonical-but-not-war pipeline

3. `src/state/turn_pipeline.ts`
   - `runOneTurn(...)`
   - explicitly says war phase is not implemented there
   - more of a canonical pipeline abstraction for non-war contexts

### Legacy / minimal harness

4. `src/turn/pipeline.ts`
   - `executeTurn(...)`
   - very small, generic pipeline harness
   - looks legacy/minimal compared with the main simulation path

### Browser-safe subset

5. `src/sim/run_combat_browser.ts`
   - browser-safe advance
   - explicitly not full war simulation
   - only increments turn / limited behavior

### Scenario / desktop wrappers

6. `src/scenario/scenario_runner.ts`
   - huge headless scenario harness
   - wraps canonical simulation plus reporting/artifacts/diagnostics

7. `src/desktop/desktop_sim.ts`
   - desktop-facing simulation API
   - wrapper around scenario loading and `runTurn`

8. CLI wrappers
   - `src/cli/sim_scenario.ts`
   - `src/cli/sim_run.ts`
   - plus several other specialized CLI harnesses

## 2. Overlap / confusion risks

### Risk A: “canonical” exists, but wrappers are big enough to feel like peers

`scenario_runner.ts` and `desktop_sim.ts` are large enough that a new maintainer may treat them as separate simulation owners rather than wrappers.

### Risk B: multiple terms for similar responsibilities

The tree contains:

- canonical pipeline
- war pipeline
- browser-safe turn advance
- desktop sim
- scenario runner
- legacy/minimal harness

All of those names make sense individually. Together they increase mental overhead.

### Risk C: docs and code are aligned conceptually, but the code still exposes many doors

I did not find a glaring “docs say X, code does Y” contradiction in the quick pass.
What I found is softer and more dangerous:

> the docs define a primary path, but the tree still contains enough other paths that mistakes remain easy

## 3. Top three maintainability concerns

1. **Too many execution-facing entrypoints still exist in live source.**
2. **Wrappers are large enough to become policy owners instead of thin adapters.**
3. **The browser-safe subset path is a permanent source of confusion unless kept visibly limited and isolated.**

---

## Track 3: Oversized Hotspot Files and Orchestration Concentration

## Bottom-line verdict

The repo has several files that are now “system magnets.” They attract more behavior because they are already central. That is the maintenance danger.

## 1. Largest active hotspots from this audit

- `src/ui/map/map/MapContainer.tsx` — **2581** lines
- `src/sim/turn_phases/war_phases.ts` — **2539** lines
- `src/scenario/scenario_runner.ts` — **2367** lines
- `src/ui/map/data/GameStateAdapter.ts` — **2319** lines
- `src/sim/combat/sector_offensive.ts` — **1868** lines
- `src/sim/combat/bot_corps_directives.ts` — **1857** lines
- `src/desktop/electron-main.cjs` — **1826** lines
- `src/state/game_state.ts` — **1803** lines
- `src/sim/combat/attack_resolution_osid.ts` — **1769** lines

## 2. Why this matters

These files are not just long. They are high-centrality files that likely combine:

- orchestration
- compatibility
- policy
- glue
- side effects

That is the exact combination that makes refactors risky and bugs sticky.

## 3. Most concerning concentrations

### `war_phases.ts`

This file looks like the operational heart of the war simulation.
It imports a huge amount of domain logic and defines pipeline ordering.

Professional risk:

- step-order bugs
- hard-to-verify side effects
- “just insert one more phase” accumulation

### `scenario_runner.ts`

This file appears to own too many adjacent concerns:

- harnessing
- scenario state creation
- reporting
- diagnostics
- serialization
- comparison utilities

Even if correct, it is a classic “difficult to change safely” file.

### `electron-main.cjs`

At **1826** lines, this is a lot for an Electron main-process file.
Main-process code benefits from being very boring. Large main-process files often become accidental control towers.

## 4. Three most concerning findings

1. **There are several concentration points, not just one.**
   This means maintenance risk is systemic, not local.

2. **The hottest files are mostly orchestration files, not just algorithm files.**
   That is more dangerous because orchestration files coordinate many side effects.

3. **The project has already split some domains into modules, but the last-mile aggregators are still very large.**
   So the refactor has started, but not finished.

---

## Track 4: UI Adapter and Map Container Maintenance Risk

## Bottom-line verdict

The map UI layer has the classic symptoms of a powerful front end that has become the integration sink for too many concerns.

The project clearly has serious UI ambition. The risk is that some files are becoming “everything interfaces with this” zones.

## 1. `MapContainer.tsx`

Current size:

- `src/ui/map/map/MapContainer.tsx` — **2581** lines

What it appears to do:

- map bootstrap
- source/layer setup
- many data loader integrations
- map interaction glue
- deck.gl integration
- formation / operations / fog / labels / overlays
- direct coordination with desktop IPC actions

This is too much surface area for one React map container.

Professional concern:

- hard to test
- hard to review
- hard to reason about render/order side effects
- hard to assign ownership cleanly between map rendering, state adaptation, and IPC concerns

## 2. `GameStateAdapter.ts`

Current size:

- `src/ui/map/data/GameStateAdapter.ts` — **2319** lines

This is likely the single biggest “translation sink” in the front end.

It already shows signs of long-lived compatibility logic:

- wrapper/fallback handling
- legacy save support
- older negotiation field fallback
- mixed-phase shape adaptation

This is dangerous because teams often “fix it in the adapter” instead of cleaning the underlying contract.

## 3. Annotation quality in the UI layer

Comment density from the earlier audit:

- `MapContainer.tsx` — about **5.8%**
- `GameStateAdapter.ts` — about **3%**

That is light for files of this size and coupling.

This does **not** mean they need more comments everywhere.
It means they need more **intent comments at integration boundaries**, especially around:

- why a fallback exists
- what contract is authoritative
- which inputs are transitional
- what can be deleted later

## 4. Three most concerning findings

1. **The map container is acting as a mega-integration component.**
2. **The adapter is likely accumulating contract debt from every subsystem.**
3. **UI maintenance risk is less about React quality and more about boundary ownership.**

---

## Cross-Track Synthesis

All four tracks point to the same core issue:

## The repo’s biggest maintainability problem is not bad code style.

It is **unclear ownership across overlapping systems**.

That shows up as:

- multiple movement authorities
- multiple entrypoint shapes
- several orchestration magnets
- UI integration sinks
- compatibility code that is staying alive for a long time

## What a senior engineer would likely say

They would probably not complain first about syntax, comments, or even testing.

They would say:

1. “What is the single owner of brigade relocation?”
2. “Which execution path is canonical in practice, not just in docs?”
3. “Which files are allowed to remain integration hubs, and which need slimming?”
4. “Which compatibility layers are temporary, and what is the retirement plan?”

That is the real maturity question for this repo.

---

## Recommended Next Step

If you want the highest-value next advisory pass, I would do this next:

### Single-owner movement audit

Produce one table with these columns:

- System
- True movement or not
- Writes orders or executes them
- Source of authority
- Can conflict with
- Should survive long-term?

That would turn the current “I think we have 5 movement systems” concern into a precise engineering map.

---

## Notes

- This addendum supplements the main audit at `docs/40_reports/audits/20260330_REPO_CODE_HEALTH_AUDIT.md`.
- No code was changed.
- `FORAWWV.md` was not edited.
- Ledger handling was considered. No ledger update was made because this is an advisory audit, not a behavior, canon, or workflow change.
