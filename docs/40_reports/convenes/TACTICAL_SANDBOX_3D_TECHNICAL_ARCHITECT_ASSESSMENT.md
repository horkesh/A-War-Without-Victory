# Tactical Sandbox 3D Map — Technical Architect Assessment

**Date:** 2026-02-20  
**Context:** Review of `docs/30_planning/TACTICAL_SANDBOX_3D_MAP_IMPLEMENTATION.md` Section 6 (Integration Guide for Main Game) and `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` (overview).  
**Purpose:** Paradox convene report — architectural risks, pushback, turn-contract alignment, and recommendations.

---

## Technical Architect Section

### 1. Integration approach risks (Section 6: Replacing 2D Canvas with 3D Map)

The plan proposes porting sandbox 3D code — `buildTerrainMesh`, `buildBaseTexture`, `buildFactionTexture`, `buildAoRTexture`, `buildFormationLODLayer`, `makeCanvasProjection`, `wgsToWorld`, `sampleHeight` — into the existing MapApp (~4,710 lines, Canvas 2D). Main architectural risks:

- **Shared state and two render paths:** MapApp already owns `MapState`, Canvas 2D, `MapProjection` (data space ↔ canvas), and a single render loop. Inlining Three.js scene, terrain mesh, overlay meshes, and sprite groups would create two rendering stacks (Canvas + WebGL) in one orchestrator, with shared subscriptions to `stateChanged` / `gameStateLoaded`. Risk: divergent update paths (e.g. 2D layers vs 3D texture rebuilds), and state ownership split between Canvas viewport and 3D camera/controls.
- **Determinism and ordering:** Sandbox uses OffscreenCanvas for textures and sorted iteration for formations; MapApp already enforces sorted SID order for fills and labels (TACTICAL_MAP_SYSTEM §8). Porting must preserve a single ordering contract (e.g. formation draw order, control/AoR texture pixel order) and avoid any per-frame or event-driven nondeterminism in texture rebuild triggers. Risk: rebuild-on-state-change vs rebuild-on-view-change can diverge between 2D and 3D if not defined as a single contract.
- **Coordinate systems:** MapApp uses a custom data space (approx. X -5..931, Y -9..905) and `MapProjection`; sandbox uses WGS84 → Three.js world with `makeCanvasProjection(bbox, w, h)` and `wgsToWorld`. Merging into MapApp without a single source of truth (either data space → both views or WGS84 → both) will create bugs in picking, overlays, and minimap/3D sync.
- **Code size and single-module liability:** MapApp is already large; adding ~3,200 lines of 3D-specific logic (terrain, overlays, sprites, picking) into the same class or file increases merge conflicts, test surface, and the chance of regressions in the existing 2D path when 3D is toggled or refactored.

### 2. Pushback: more elegant approach than direct port

A **direct port of sandbox code into MapApp** is the highest-risk option. Prefer one of:

- **Separate 3D viewer component:** A dedicated 3D view (e.g. route or tab: "2D Map" | "3D Map") that consumes the **same data contract** as the 2D map: `DataLoader` + `GameStateAdapter` → `LoadedGameState`, same IPC and load paths (e.g. `game-state-updated`, Load Save, replay). The 3D viewer owns only Three.js scene, camera, and 3D-specific overlays; it does not share the Canvas 2D render loop or `MapProjection`. Benefits: single source of truth for "what to show," no mixing of Canvas and WebGL in one class, clearer testing boundary, and the option to keep the sandbox as the 3D prototype while the main app offers 2D + optional 3D entry point.
- **Shared data layer, separate render paths:** Formalize a **map data contract** (e.g. `MapViewInput`: settlements, control lookups, formations, AoR, orders, replay frame) produced by existing loaders and adapters. MapApp (2D) and a new MapApp3D or TacticalMap3D component both take `MapViewInput` and render; neither owns turn advancement. This avoids duplicating pipeline logic and keeps 3D as a pure view over the same state the 2D map uses.

Recommendation: **Do not** inline the full sandbox into MapApp. Introduce a **separate 3D viewer component** (or optional 3D mode backed by the same component) that shares the data layer and receives state via the same entrypoints (IPC, file load, replay), and document the boundary in TACTICAL_MAP_SYSTEM and REPO_MAP.

### 3. Turn pipeline: 7-step sandbox vs 30+ step main game

The sandbox runs a **7-step subset** (deployment states, posture, movement, equipment, pressure, resolveAttackOrders, WIA trickleback); the main game uses **30+ steps** in `turn_pipeline.ts`. To avoid duplicating pipeline logic and to keep the 3D map (and any sandbox-derived flow) aligned with canon:

- **Document a turn contract:** Define input/output once: e.g. **input** = `GameState` (or serializable snapshot) + `edges` + optional directives (orders, phase0, etc.); **output** = updated `GameState` + report (control events, casualties, etc.). The full pipeline and any subset (e.g. sandbox 7 steps) should be described as **consumers** of this contract: main game = full pipeline producing state; map/sandbox = either (a) display-only, consuming state produced elsewhere, or (b) a documented **Phase II combat/movement subset** that reuses the same engine functions and is explicitly listed as a subset, not a fork.
- **Prefer display-only for main-game 3D map:** For the **main game**, the 3D map should **display** state produced by the canonical turn pipeline (desktop advance-turn → full pipeline → `game-state-updated` → map re-renders). No second pipeline in the map; the sandbox remains the place for the 7-step interactive prototype.
- **Refactor/document the subset:** In PIPELINE_ENTRYPOINTS (or a new subsection "Turn contract and map/sandbox") add: (1) the **state-in / state-out** schema, (2) the list of steps that form the "Phase II combat/movement subset" used by the sandbox, and (3) a note that the sandbox is a **subset** for prototyping and that the authoritative turn is always the full pipeline. Optionally, extract a shared helper (e.g. `runPhaseIICombatSubset(state, edges, terrainScalars, ...)`) used by both the full pipeline and the sandbox so the 7 steps are not duplicated.

### 4. Architectural recommendations and ADR/REPO_MAP updates

**Recommendations:**

- **Adopt a separate 3D viewer component** (or optional 3D mode) that consumes the same data layer as the 2D map (`DataLoader`, `GameStateAdapter`, `LoadedGameState`) and the same IPC/load/replay entrypoints. Do not merge the full sandbox codebase into MapApp; keep MapApp as the 2D orchestrator and add a clear boundary (e.g. shared `MapViewInput` or equivalent) so both 2D and 3D views stay in sync without two render paths in one class.
- **Define and document the turn contract** (state in, state out) and the role of the sandbox 7-step subset. For the main game, the 3D map should be display-only; turn advancement should remain the responsibility of the full pipeline and existing entrypoints (desktop advance-turn, scenario runner). Document the combat/movement subset in PIPELINE_ENTRYPOINTS and, if useful, refactor so that subset is a single callable surface used by both full pipeline and sandbox to avoid duplicated logic.
- **Preserve a single coordinate/data contract** for map views: either both 2D and 3D consume the same pre-projected data space (with 3D doing data → WGS84 → world only for its own rendering) or both consume WGS84 and 2D continues to use `MapProjection` as a view transform. Avoid maintaining two unrelated coordinate systems for the same features.

**Suggested doc updates:**

- **ADR:** Add **ADR-0004 (or next number): Tactical 3D map integration approach.** Capture: (1) decision to use a separate 3D viewer component (or dedicated 3D mode) sharing the data layer with the 2D map; (2) rejection of inlining the full sandbox into MapApp; (3) turn contract (state in/out) and display-only role for the main-game 3D map; (4) reference to TACTICAL_SANDBOX_3D_MAP_IMPLEMENTATION.md and PIPELINE_ENTRYPOINTS for subset and contract.
- **REPO_MAP.md:** Under "GUI / Map UIs": (1) Add a bullet for **Tactical sandbox (3D prototype)** at `src/ui/map/tactical_sandbox.html` + `src/ui/map/sandbox/`, with a one-line note that it uses a 7-step turn subset and is the reference for 3D terrain/overlays. (2) Add a bullet or short subsection for **3D map integration (main game)**: link to the implementation plan and ADR; state that integration should be via a separate viewer/mode sharing the same data and turn contract, not a direct port into MapApp.
- **PIPELINE_ENTRYPOINTS.md:** Add a short subsection **Turn contract for map/sandbox**: input (GameState + edges + optional directives), output (updated state + report); list the Phase II combat/movement subset (7 steps) used by the sandbox and clarify that the authoritative turn is the full pipeline; optional pointer to a shared `runPhaseIICombatSubset`-style surface if refactored.

---

*Assessment complete. No code changes; recommendations and doc updates only.*
