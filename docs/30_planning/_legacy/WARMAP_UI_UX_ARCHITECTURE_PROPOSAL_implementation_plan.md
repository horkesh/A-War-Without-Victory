# War Map UI/UX Execution Plan (Next Phases)

Phase 1 (Foundation) has been integrated. Here is the concrete, systematic plan for executing Phases 2 through 12. Each phase assigns specific Paradox roles (from our skills catalog) and includes the requested multiple concrete tasks, capped by the `@[/refactor-pass]` workflow.

## Phase 2: Roads, Rivers, Labels (The Base Map)
**Lead Subagent:** `graphics-programmer` (assisted by `map-geometry-integrity-reviewer`)
- [ ] Implement a cased road network to the Day texture (two-pass rendering in [DayOpsTexture.ts](file:///f:/A-War-Without-Victory/src/ui/map/terrain/DayOpsTexture.ts) to support highway shields and hierarchical widths).
- [ ] Add styled rivers (with stream order width scaling) extending current basic waterways.
- [ ] Implement a progressive-disclosure label system for settlements within Three (major hubs at strategic zoom, minor villages at tactical zoom).
- [ ] Add international dashed boundaries (always visible) and make municipality boundaries a separate togglable layer.
- [ ] **Execution Hook:** Run `@[/refactor-pass]` to clean up texture generation logic and verify cartographic rendering accuracy.

## Phase 3: Settlement Control and Front Lines
**Lead Subagent:** `graphics-programmer` (assisted by `gameplay-programmer`)
- [ ] Create `SettlementControlLayer.ts`: Implement faction-colored settlement polygons blended seamlessly onto the 3D terrain mesh.
- [ ] Create `FrontLineLayer.ts`: Migrate standard 2D frontline drawing into dynamic 3D glowing path segments. Frontlines should only be drawn if a unit is present. If two opposing units are in neighboring settlements, draw two distinct fronts facing each other (e.g., a green line for RBiH facing the enemy, and a red line for the enemy facing RBiH).
- [ ] Implement contested settlement visual patterns (e.g., striped or pulsing fills) to reflect dynamic combat states.
- [ ] Apply battle damage darkening and territorial depth shading depending on rear-zone distances.
- [ ] **Execution Hook:** Run `@[/refactor-pass]` to ensure control layer logic matches `GameStateAdapter` cleanly and remove duplicate shape-building logic.

## Phase 4: Formation Display (NATO Counters)
**Lead Subagent:** `frontend-design` (assisted by `ui-ux-developer`)
- [ ] Create `FormationSpriteLayer.ts` to render 3D-oriented counter sprites preserving current APP-6 anatomy.
- [ ] Implement corps-color-coded backgrounds on sprites to instantly group brigades at a glance.
- [ ] Attach soft-factors indicator triangles (for morale/supply/experience conditions) natively onto counters.
- [ ] Build the `D` key counter data-mode cycler (switch counter labels between strength, cohesion, posture).
- [ ] Construct dynamic zoom-tier filtering and grouping (LOD grouping of counters into stacks).
- [ ] **Execution Hook:** Run `@[/refactor-pass]` to streamline DOM-to-Canvas sprite generation, caching, and reduce memory footprint.

## Phase 5: Right-Click Orders and Movement Preview
**Lead Subagent:** `architect` (assisted by `gameplay-programmer`)
- [ ] Create an `interaction/` module housing `RightClickHandler.ts` for native 3D raycast target selection.
- [ ] Wire `query-movement-range` and `query-movement-path` IPC queries directly to the Electron main process for secure state evaluation.
- [ ] Instantiate `MovementRangePreview.ts` to paint reachability overlays dynamically on the 3D terrain.
- [ ] Generate an `OrderArrowLayer.ts` to physically draw curved, 3D trajectory lines for attack, move, and reposition orders.
- [ ] Assemble the `OrderQueuePanel.ts` HTML overlay to surface the staging queue.
- [ ] **Execution Hook:** Run `@[/refactor-pass]` to delete any bypassed 2D map interactive logic and straighten the IPC payload interfaces.

## Phase 6: Attack Odds and Combat Estimate
**Lead Subagent:** `gameplay-programmer` (assisted by `ui-ux-developer`)
- [ ] Expand IPC messaging to support `query-combat-estimate`, wrapping the battle resolver cleanly without mutating master state.
- [ ] Paint the `AttackOddsPreview.ts` hover tooltip, mapping terrain scalars (elevation, river friction) and force ratios into a numeric projection.
- [ ] **Execution Hook:** Run `@[/refactor-pass]` ensuring the odds estimator cleanly invokes canon battle formulas without duplicating logic.

## Phase 7: Fog of War
**Lead Subagent:** `gameplay-programmer` (assisted by `graphics-programmer`)
- [ ] Amend the [ReconIntelligence](file:///f:/A-War-Without-Victory/src/state/game_state.ts#122-128) data contract to retain `last_seen_turn` on all tracked assets.
- [ ] Spin up `FogOfWarLayer.ts` inside the WebGL context with ternary state shading (clear, fogged, unknown/uncovered).
- [ ] Project decaying "ghost counters" for stale brigade contacts.
- [ ] Embed recon quality gradients and map the `Shift+F` key combo to view alternate faction intel.
- [ ] **Execution Hook:** Run `@[/refactor-pass]` to audit performance on visibility checks across all 5,800 settlements.

## Phase 8: Map Modes
**Lead Subagent:** `architect` (assisted by `ui-ux-developer`)
- [ ] Abstract a centralized `MapModeController.ts` handling `F`-key overlays (Political, Supply, Intel, etc.).
- [ ] Build `SupplyOverlay.ts` (F3 mode), tinting nodes by supply fraction and throughput strain.
- [ ] Build `DisplacementOverlay.ts` (F5 mode), mapping civilian population shifts and flow trajectories.
- [ ] Build `CorpsSectorOverlay.ts` (F8 mode), plotting operational AoR partition boundaries.
- [ ] **Execution Hook:** Run `@[/refactor-pass]` eliminating isolated mapping sub-modules and uniting everything behind the Mode controller abstraction.

## Phase 9: Battle Visualization
**Lead Subagent:** `graphics-programmer` (assisted by `gameplay-programmer`)
- [ ] Upgrade the CLI-bound `TurnReport` structure to yield discrete `battle_events[]` (e.g., skirmishes, captures, routs).
- [ ] Author `BattleMarkerLayer.ts` anchoring stylized effect meshes (explosions, flashes) directly to coordinates during playback.
- [ ] Execute an inter-turn procedural animation sequence that unfolds chronologically (with `Space` key sequence-skip controls).
- [ ] Apply snap event visual indicators (like red warning boxes for "ammo crisis" or "collapsing line" events).
- [ ] **Execution Hook:** Run `@[/refactor-pass]` simplifying the animation loop and separating presentation timings from absolute game state.

## Phase 10: Command Hierarchy View
**Lead Subagent:** `frontend-design`
- [ ] Author the chain-of-command topology overlay (activated by `~` key) highlighting lines identically to the HoI/WITE paradigms.
- [ ] Sketch named operation zones out onto the physical play area.
- [ ] Sync map click-through behavior so selecting a map zone triggers the corresponding Army/Corps HTML panel view.
- [ ] **Execution Hook:** Run `@[/refactor-pass]` verifying 1:1 synchronization between 3D hierarchy topology and the canonical OOB state structure.

## Phase 11: Post-Processing and Audio
**Lead Subagent:** `graphics-programmer` (assisted by `asset-integration`)
- [ ] Import `EffectComposer` into a new `postfx/` manager within [WarMapRenderer](file:///f:/A-War-Without-Victory/src/ui/map/WarMapRenderer.ts#7-159).
- [ ] Enable CRT scanlines, cinematic vignette, and subtle chromatic aberration layers (predominantly applying to Night Mode ops).
- [ ] Setup glowing bloom passes over active text labels, frontlines, and active selection perimeters.
- [ ] Scaffold `audio/` singleton connecting the Web Audio API to UI foley and ambient loops.
- [ ] **Execution Hook:** Run `@[/refactor-pass]` pruning unused post-processing nodes and verifying stable memory/garbage collection on high-end visuals.

## Phase 12: Polish and Integration
**Lead Subagent:** `architect`
- [ ] Audit `MapApp.ts` mapping code and ruthlessly extract non-Three.js logic into discrete `panels/` components.
- [ ] Execute the official Determinism Audit (VCR Test) running identical 52-week command-line versus graphical desktop evaluations.
- [ ] Conduct GPU profiling targeting sustained 60fps on mid-range hardware for the 3D map.
- [ ] Complete the settings UI to govern parameters like Fog levels, Post-Processing toggles, and audio mixing.
- [ ] **Execution Hook:** Run `@[/refactor-pass]` performing a full sweep of unused imports, dead components, and unresolved edge cases.

## Verification Plan
1. Ensure the architecture cleanly maps 1:1 against the roles stipulated in [.agent/skills-catalog.md](file:///f:/A-War-Without-Victory/.agent/skills-catalog.md) and aligns with the Paradox Team expectations. 
2. Ensure the plan requires standard pre-commit verification (lint checks, build output checking).
3. Confirm determinism holds upon deployment using the established CI scripts and VCR tools.
