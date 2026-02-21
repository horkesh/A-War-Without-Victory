# Tactical Sandbox & 3D Map Implementation Guide

**Date:** 2026-02-19 (revised 2026-02-20)
**Status:** Phase 3 complete; integration plan revised per Paradox convene and product decisions
**Author:** Development team (Claude-assisted implementation)

---

## Product Decisions (2026-02-20)

The following decisions lock scope and sequencing for integration. See [PARADOX_TACTICAL_SANDBOX_3D_MAP_CONVENE_2026_02_20.md](../40_reports/convenes/PARADOX_TACTICAL_SANDBOX_3D_MAP_CONVENE_2026_02_20.md) for full team review.

| Decision | Choice |
|----------|--------|
| **3D vs 2D** | **3D replaces 2D completely** as the main tactical map. The **Staff Map** (4th zoom, procedural paper overlay) remains as the way to take **2D snapshots**. |
| **Canon mechanics vs 3D order** | Either order is acceptable. **Both** canon mechanics (deploy/undeploy, movement radius, etc.) and 3D integration are delivered in the **same plan**, in **phases** (6A, 6B, 6C). |
| **Sandbox** | The sandbox is a **standalone system** today with its own UI and rules. It will **eventually be folded into the full game** so it can be used to create **specialized scenarios**. Exceptions (pre-claim, 7-step pipeline, sandbox UI) apply to the sandbox alone. |
| **Undeployed movement radius** | **Composition-, roads-, and terrain-scalar–dependent.** Undeployed (Column) brigades have different movement radii by **composition** and **roads network**; also **scalar scaling**: movement is **slower uphill** and **across major rivers** (use `settlements_terrain_scalars.json`: slope/elevation and river_crossing_penalty). Product preference **12 as baseline**; team to define formula and cost model (composition + roads + terrain) and document in canon. |

---

## Table of Contents

1. [Overview](#overview)
2. [3D Map Creation](#3d-map-creation)
3. [Sandbox Architecture](#sandbox-architecture)
4. [Game Mechanics & UI/GUI Decisions](#game-mechanics--uigui-decisions)
5. [File Manifest](#file-manifest)
6. [Integration Guide for Main Game](#integration-guide-for-main-game)
7. [Implementation Phases (Summary)](#7-implementation-phases-summary)

---

## 1. Overview

The tactical sandbox is a standalone Three.js-based 3D terrain viewer with interactive wargame mechanics. It was built in three phases as a prototyping ground for the main game's operational map:

- **Phase 1**: 3D terrain rendering, settlement overlay, formation counters (NATO symbology), faction control coloring
- **Phase 2**: Interactive modes (SELECT/ATTACK/MOVE), brigade spawning, AoR crosshatch overlay, attack orders with battle resolution, movement orders, turn advance with real engine integration
- **Phase 3**: Deployed/undeployed brigade states, movement radius visualization, multi-click destination selection, AoR reshaping, front line teeth visualization, real terrain scalars for battles

The sandbox reuses the **real AWWV engine** functions (`resolveAttackOrders`, `processBrigadeMovement`, `applyPostureOrders`, `degradeEquipment`, `applyBrigadePressureToState`, `applyWiaTrickleback`) wrapped in a simplified turn pipeline. It is **not** a separate engine — it calls the same battle resolution, movement, and equipment degradation code that the full simulation uses.

**Main game integration:** The **3D map will replace the 2D canvas completely** as the primary tactical map. The **Staff Map** (key 4, drag-to-define region, procedural paper overlay) remains available for **2D snapshots**. Canon mechanics (deploy/undeploy, movement radius UI, multi-click move) and 3D integration are delivered in the **same implementation plan**, in phases (Section 6). The sandbox will eventually be **folded into the full game** for specialized scenario creation; until then it remains a standalone entry point with its own UI and rules.

---

## 2. 3D Map Creation

### 2.1 Technology Stack

- **Three.js** (`three@0.170.0`) — 3D rendering
- **OrbitControls** — Camera orbit, zoom, pan
- **OffscreenCanvas** (4096x4096 or 8192x8192) — Texture generation for terrain base, faction overlays, AoR patterns
- **Vite** dev server with HMR — Live development at `http://localhost:3005/src/ui/map/tactical_sandbox.html`

### 2.2 Terrain Mesh Construction

**Data source:** `data/derived/terrain/heightmap_3d_viewer.json` — 1024x1024 DEM grid covering all of Bosnia-Herzegovina in WGS84 coordinates.

**Process:**

1. **Crop heightmap to region bounding box** (`cropHeightmap()`): The full 1024x1024 heightmap covers all of BiH. For each sandbox region (e.g., Travnik-Sarajevo: `[17.50, 43.72, 18.58, 44.10]`), the heightmap is cropped to the region bbox + 0.05° margin. This produces a smaller grid (e.g., 200x150) that only covers the visible area. All downstream code uses the cropped bbox for coordinate transforms.

2. **Build terrain geometry** (`buildTerrainMesh()`): Creates a `THREE.PlaneGeometry` with `widthSegments = cropWidth - 1` and `heightSegments = cropHeight - 1`. The geometry is then deformed:
   - X position: `(lon - CENTER_LON) * WORLD_SCALE` where `WORLD_SCALE = 2.0`
   - Y position: `elevation * VERT_EXAG` where `VERT_EXAG = 0.00022` (gentle atlas relief — 2424m peak becomes ~0.53 world units)
   - Z position: `-(lat - CENTER_LAT) * WORLD_SCALE` (negative because Three.js Z goes "into screen" while latitude increases northward)

3. **Dynamic center**: `CENTER_LON` and `CENTER_LAT` are set to the center of the cropped heightmap bbox, not hardcoded. This ensures the terrain mesh is centered at world origin for each region.

**What worked:**
- Cropping the heightmap to the region bbox drastically reduces vertex count and improves performance
- `VERT_EXAG = 0.00022` gives a subtle "atlas" relief that looks like a physical terrain model without exaggerated mountains
- Using `MeshPhongMaterial` with directional light provides natural terrain shading

**What didn't work / issues:**
- Initially used the full 1024x1024 heightmap for every region — very wasteful, caused texture aliasing
- Early `VERT_EXAG` values (0.001) made mountains too spiky and obscured settlement details
- `MeshBasicMaterial` (no lighting) made terrain look flat and unreadable

### 2.3 Base Texture (8192x8192)

**Function:** `buildBaseTexture()` — generates the main terrain texture.

**Layers painted in order:**
1. **Elevation-based terrain coloring**: Each pixel is colored based on the heightmap elevation at that WGS84 coordinate. Uses a green-brown-gray gradient: low elevation = dark green, mid = tan/brown, high = gray/white.
2. **Settlement polygons**: Each settlement's GeoJSON polygon is filled with a semi-transparent off-white (`rgba(240,240,230,0.15)`), giving settlements a subtle visible footprint on the terrain.
3. **Settlement borders**: Thin gray lines (`rgba(150,150,150,0.25)`) outline each settlement polygon.
4. **Roads**: OSM road geometries drawn as thin brown lines (`rgba(140,120,90,0.35)`, lineWidth=2).
5. **Waterways**: OSM waterway geometries drawn as blue lines (`rgba(80,130,200,0.5)`, lineWidth=2-3).
6. **BiH border**: Country boundary drawn as dashed white line (`rgba(255,255,255,0.4)`, lineWidth=3).

**Coordinate projection:** `makeCanvasProjection(bbox, w, h)` — maps WGS84 `[lon, lat]` to canvas pixel coordinates `[x, y]` using simple linear interpolation within the bbox.

**Settlement centroids**: Built during base texture generation — each settlement's centroid is computed from its polygon ring and stored in a `Map<string, [number, number]>` keyed by settlement ID. Used throughout for placing sprites, picking, highlighting, etc.

### 2.4 Faction Control Overlay (4096x4096)

**Function:** `buildFactionTexture()` — paints each settlement polygon with a translucent faction fill:
- **RS**: `rgba(180, 60, 60, 0.32)` (red)
- **RBiH**: `rgba(60, 140, 60, 0.32)` (green)
- **HRHB**: `rgba(50, 90, 170, 0.32)` (blue)
- **Uncontrolled**: `rgba(80, 80, 80, 0.04)` (barely visible gray)

Rendered on a separate `THREE.Mesh` positioned at `y = 0.005` (just above terrain). Uses `transparent: true, depthWrite: false, blending: NormalBlending`.

### 2.5 AoR (Area of Responsibility) Overlay (4096x4096)

**Function:** `buildAoRTexture()` — draws crosshatch patterns on settlements assigned to brigades via `brigade_aor`.

Each faction uses a distinct hatch pattern for visual distinction:
- **RS**: 45° diagonal lines (\\\\) in red
- **RBiH**: -45° diagonal lines (////) in green
- **HRHB**: Horizontal lines (───) in blue

**Rendering per settlement:**
1. Build clipping path from settlement polygon
2. Fill with subtle faction color (`rgba(faction, 0.25)`)
3. Clip to polygon, draw hatch lines at faction angle (spacing=8px, width=3px)
4. Restore clip, draw settlement border stroke (lineWidth=4)

**Contact-edge visual** (replaces front line teeth): After the crosshatch loop, for each **contact edge** (settlement with friendly brigade in AoR adjacent to enemy-controlled or enemy-brigade settlement), draw the **shared boundary** with a **red, glowing** stroke (warning red e.g. `#ff4444`, soft glow 2–4px, alpha ~0.9). No toothed FEBA lines. See §4.5 for full spec.

Rendered on a separate mesh at `y = 0.010` (above faction overlay). Toggleable via AoR button.

### 2.6 Formation Counters (NATO Symbology Sprites)

**Function:** `buildFormationLODLayer()` — creates `THREE.Sprite` objects for each formation.

Each brigade/OG gets a NATO-style counter sprite generated on a 256x256 canvas:
- Rectangle with faction-colored fill (green/red/blue) and black border
- NATO unit size indicator (brigade = "X X" above rectangle)
- Unit name text inside
- Posture color coding on the border (defend=blue, attack=red, probe=yellow)

Sprites are positioned at the formation's HQ settlement centroid, elevated above terrain. They use `THREE.SpriteMaterial` with `sizeAttenuation: false` for consistent screen-space size.

**Corps aggregation**: Brigades belonging to a corps are grouped. At far zoom, only the corps counter is shown; at close zoom, individual brigades appear.

**Stem lines**: Thin vertical lines connect each sprite to the terrain surface below it, providing visual grounding.

### 2.7 Overlay Mesh Pattern

All overlays follow the same pattern:

```typescript
function buildFactionOverlayMesh(terrainMesh: THREE.Mesh, texture: THREE.CanvasTexture): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const overlay = new THREE.Mesh(terrainMesh.geometry.clone(), mat);
  overlay.position.y = Y_OFFSET;  // stacking order
  return overlay;
}
```

**Y-offset stacking order:**
- `0.005` — Faction control overlay
- `0.010` — AoR crosshatch + front line teeth overlay
- `0.012` — Movement radius overlay (temporary, during MOVE mode)
- `0.015` — Move selection highlights (temporary green rings)

### 2.8 Camera & Controls

- **Camera**: `THREE.PerspectiveCamera` with FOV=50, positioned above terrain looking down at ~45°
- **Controls**: `OrbitControls` with constrained min/max polar angle (prevent going underground)
- **WASD panning**: Keyboard handler applies camera pan in the camera's forward/right direction (Y-component zeroed)
- **Initial position**: Camera starts centered on the region with elevation + offset calculated from terrain data

### 2.9 Settlement Click Detection

**Function:** `findNearestSettlement()` — projects all settlement centroids to screen space via `projVec.project(camera)`, finds the nearest centroid within `maxPickRadius` pixels of the click point.

**Formation picking** uses the same approach but with `entry.sprite.getWorldPosition(projVec)` — critical that `getWorldPosition()` is used instead of `entry.sprite.position` because sprites are children of a group, so their local position != world position.

### 2.10 HMR (Hot Module Replacement) Guard

**Problem discovered**: Vite HMR reloads during development would call `main()` again without destroying the previous instance. This caused 7+ simultaneous render loops, 7+ sets of event handlers, and race conditions.

**Solution**: AbortController pattern:
```typescript
// Before main():
if (window.__sandboxAbort) window.__sandboxAbort.abort();
if (window.__sandboxCleanup) window.__sandboxCleanup();
const hmrAbort = new AbortController();
window.__sandboxAbort = hmrAbort;

// Inside main():
async function main(signal: AbortSignal): Promise<void> {
  // All event listeners use { signal } option:
  renderer.domElement.addEventListener('mousedown', handler, { signal });
  window.addEventListener('keydown', handler, { signal });
  // etc.

  // Render loop checks abort:
  (function animate() {
    if (signal.aborted) return;
    requestAnimationFrame(animate);
    // ...
  })();

  // Cleanup function disposes Three.js resources:
  window.__sandboxCleanup = () => {
    renderer.dispose();
    controls.dispose();
    scene.clear();
  };
}
```

---

## 3. Sandbox Architecture

### 3.1 Module Structure

```
src/ui/map/
  tactical_sandbox.html        # Entry point HTML (Vite dev server)
  tactical_sandbox.ts          # Main viewer (~3200 lines) — rendering, interaction, turn advance

src/ui/map/sandbox/
  sandbox_scenarios.ts         # Region definitions (bbox, name, description)
  sandbox_slice.ts             # Data slicer — fetches full data, filters to region
  sandbox_engine.ts            # Turn engine — wraps real AWWV engine functions
  sandbox_ui.ts                # HTML overlay panels (toolbar, selection, orders, battle log, spawn)
```

### 3.2 Data Flow

```
                      ┌─────────────────────┐
                      │  Full AWWV Data      │
                      │  (settlements, edges,│
                      │   game saves, etc.)  │
                      └───────┬─────────────┘
                              │
                    loadSliceData(region)
                              │
                      ┌───────▼─────────────┐
                      │  SliceData           │
                      │  - settlements[]     │
                      │  - edges[]           │
                      │  - formations{}      │
                      │  - political_ctrl{}  │
                      │  - brigade_aor{}     │
                      │  - sidSet, sidToMun  │
                      └───────┬─────────────┘
                              │
                    sliceToGameState()
                              │
                      ┌───────▼─────────────┐
                      │  GameState (minimal) │
                      │  - formations        │
                      │  - political_ctrl    │
                      │  - brigade_aor       │
                      │  - meta (turn, phase)│
                      └───────┬─────────────┘
                              │
                   advanceSandboxTurn(gs, edges, terrain, sidToMun, deploymentStates)
                              │
                      ┌───────▼─────────────┐
                      │  SandboxTurnReport   │
                      │  - turn number       │
                      │  - attack report     │
                      │  - movement processed│
                      │  - posture applied   │
                      │  - deployment logs   │
                      └─────────────────────┘
```

### 3.3 Sandbox State

```typescript
interface SandboxState {
  mode: 'select' | 'attack' | 'move';
  selectedFormationId: string | null;
  orders: OrderEntry[];
  turnNumber: number;
  sliceData: SliceData | null;
  gameState: Record<string, unknown> | null;
  turnReports: SandboxTurnReport[];
  deploymentStates: Record<string, DeploymentState>;
  terrainScalars: TerrainScalarsData | null;
  moveSelection: MoveSelectionState | null;
}
```

### 3.4 Sandbox Turn Pipeline

The `advanceSandboxTurn()` function runs a subset of the full 30+ step canon pipeline:

1. **Process deployment states** (sandbox-only): `processDeploymentStates()` — handles deploying/undeploying transitions
2. **Apply posture orders**: `applyPostureOrders()` — changes brigade posture (defend, attack, probe, etc.)
3. **Process brigade movement**: `processBrigadeMovement()` — pack → transit → unpack state machine
4. **Equipment degradation**: `degradeEquipment()` — wear on tanks, artillery based on posture and maintenance
5. **Compute brigade pressure**: `applyBrigadePressureToState()` — calculates pressure scores between adjacent opposing brigades
6. **Resolve attack orders**: `resolveAttackOrders()` — full battle resolution with terrain modifiers, casualties, control flips
7. **WIA trickleback**: `applyWiaTrickleback()` — wounded soldiers return to formations over time
8. **Advance turn counter**

---

## 4. Game Mechanics & UI/GUI Decisions

### 4.1 Brigade Spawning

- **Spawn panel** in right sidebar: select faction (RS/RBiH/HRHB), equipment class (light/medium/heavy/mechanized), optional name, HQ settlement
- **Equipment class templates** (`EQUIPMENT_CLASS_TEMPLATES` from `recruitment_types.ts`):
  - Light: 400 infantry, 0 tanks, 2 artillery, 0 AA
  - Medium: 600 infantry, 4 tanks, 6 artillery, 2 AA
  - Heavy: 800 infantry, 12 tanks, 12 artillery, 4 AA
  - Mechanized: 700 infantry, 24 tanks, 8 artillery, 6 AA
- **Spawn as UNDEPLOYED**: Brigades spawn with AoR = 1 settlement (HQ only), in column march posture
- HQ settlement is claimed for the spawning faction
- Formation is synced to both `sliceData` and `gameState`
- HQ settlement can be **any settlement** in the slice (sandbox freedom — no faction restriction for spawning location)

**Decision**: HQ list in spawn panel shows settlements where the faction has control. But all settlements start uncontrolled in sandbox mode (set in `sandbox_slice.ts` — the no-save default), so the spawn panel initially shows "(no settlements)". Spawning the first brigade claims that settlement.

**Workaround for spawn panel**: The panel lists controlled settlements per faction. Since settlements start uncontrolled, the player needs to use the "HQ" dropdown which will populate as they claim settlements. Future improvement: allow clicking a settlement to set spawn target.

### 4.2 Deployed/Undeployed State System

**Design rationale**: In real operations, brigades alternate between column march (fast movement, concentrated) and deployed combat posture (spread across area, slower). This creates meaningful decisions about when to deploy vs. stay mobile.

**States:**
| State | AoR | Movement Rate | Transition |
|-------|-----|--------------|------------|
| `undeployed` (Column) | 1 settlement (HQ only) | **Composition-dependent** (see below) | Spawn default. Click DEPLOY to start deploying |
| `deploying` | 1 settlement | — | 1 turn transition. AoR expands on completion |
| `deployed` (Combat) | 1–4 settlements | 3 sett/turn | Implicit (no entry in deploymentStates = deployed). Click UNDEPLOY |
| `undeploying` | Current AoR | — | 1 turn transition. AoR contracts to HQ on completion |

**Undeployed (Column) movement radius — composition-, roads-, and terrain-scalar–dependent:** Product decision: undeployed brigades have **different movement radii** by **composition**, **roads network**, and **scalar scaling** (terrain). Movement is **slower uphill** and **across major rivers**; use `settlements_terrain_scalars.json` (e.g. slope_index, elevation_mean_m, river_crossing_penalty). Product preference **12 as baseline**. Team to define formula and cost model (composition + roads + terrain) and document in Phase II spec and Systems Manual. Until then, sandbox may keep a baseline or placeholder; canon will define the final rule.

**AoR expansion on deploy**: When deploying completes, the brigade's AoR expands from HQ to HQ + adjacent friendly/uncontrolled settlements, up to a cap of `min(4, max(1, floor(personnel / 400)))`.

**Selection panel UI**: Shows deployment status with color coding:
- Undeployed: yellow `#ffaa00` — "UNDEPLOYED — Column march (N sett/turn)" (N = composition-dependent rate; team to define)
- Deploying: cyan `#00cccc` — "DEPLOYING... (advance turn)"
- Undeploying: orange `#ff8844` — "UNDEPLOYING... (advance turn)"
- Deployed: green `#00ff88` — "DEPLOYED — Combat posture (3 sett/turn)"

**Buttons**: DEPLOY button (green, shown when undeployed) / UNDEPLOY button (yellow, shown when deployed)

### 4.3 Movement System

**Movement flow:**
1. Enter MOVE mode (click MOVE button in toolbar)
2. Click a brigade counter — shows movement radius overlay + initializes move selection
3. Click destination settlement(s) within radius
4. Confirm with Enter key or CONFIRM MOVE button

**Movement radius visualization:**
- BFS from brigade's current AoR settlements through friendly/uncontrolled territory (main game: friendly-only; sandbox may use uncontrolled — see §4.8)
- Depth limit = movement rate: **undeployed = composition-dependent** (team to define; product preference 12 baseline), **deployed = 3**
- Rendered as translucent overlay texture at `y = 0.012` (above AoR)
- Color: yellow (`{r:255, g:200, b:0}`) for undeployed, blue (`{r:80, g:160, b:255}`) for deployed
- Dashed border around each reachable settlement (distinct from AoR crosshatch)

**Multi-click destination selection (deployed brigades):**
- Maximum settlements = `min(4, max(1, floor(personnel / 400)))`
- Each click adds a settlement to the selection (or deselects if already selected)
- **Contiguity constraint**: Each new settlement must be adjacent to at least one already-selected settlement
- Green ring highlights (`THREE.RingGeometry`, color `0x00ff88`) on each selected settlement
- CONFIRM MOVE button appears at bottom center: "CONFIRM MOVE (2/3) [Enter]"
- Auto-confirms when max settlements reached
- Enter key also confirms

**Undeployed brigades:**
- Max settlements = 1 (column march converges to single point)
- Auto-confirms on single click (no multi-click needed)

**Movement validation:**
- Destination must not be enemy-controlled
- Destination must be within reachable radius
- Path must exist through friendly/uncontrolled territory

**Pre-claim BFS in turn advance:**
- Before running the engine, sandbox claims uncontrolled settlements along the movement path for the moving faction
- This is necessary because the canon engine's BFS only traverses faction-controlled territory
- Claims all destination settlements plus intermediate path settlements

**Post-turn AoR sync:**
- After turn completes, `brigade_aor` is synced back from game state to slice data
- HQ settlement is updated to first (sorted) AoR settlement
- Political control follows AoR: uncontrolled settlements in a brigade's AoR are claimed for that brigade's faction

### 4.4 Attack System

**Attack flow:**
1. Enter ATTACK mode (click ATTACK button in toolbar)
2. Click attacking brigade counter
3. Click target settlement (within range)
4. Attack order is queued (shown as red arrow in 3D and in ORDERS panel)

**Battle resolution** uses the real `resolveAttackOrders()` from the engine:
- Terrain modifiers from `settlements_terrain_scalars.json`: elevation/slope defense, river crossing penalty, road access, urban bonus, terrain friction
- Base casualty formula: `baseCas = 50 * (min(att_power, def_power) / 350)`
- Combat power includes personnel, equipment (tanks, artillery), cohesion, fatigue, experience
- Defender terrain advantage: slope_index, river_crossing_penalty from real terrain data
- Battle outcome determines control flip

**Terrain scalars loading** (Phase 3 fix):
- `data/derived/terrain/settlements_terrain_scalars.json` (6,137 settlements)
- Fields per settlement: `slope_index`, `river_crossing_penalty`, `elevation_mean_m`, `road_access_index`, `terrain_friction_index`, `is_urban`
- Previously the sandbox passed `{ by_sid: {} }` (empty terrain data), causing all battles to use flat terrain defaults with very low casualties
- Now loads real terrain data, producing realistic terrain-modified casualties

### 4.5 Contact-Edge Visualization (replaces front line teeth)

**Design:** Front line teeth (toothed FEBA markers) are **removed**. Instead, **contact edges** — shared boundaries between a settlement with friendly units in AoR and an opposing settlement (enemy-controlled or enemy units in AoR) — get a distinct **red, glowing** stroke so contact lines are visible at a glance.

**Rules:**
- **Contact edge:** an edge between two adjacent settlements where (a) one has a friendly brigade in AoR and (b) the other is enemy-controlled or has an enemy brigade in AoR.
- Draw only the **shared boundary** (the edge segment between the two settlement polygons), not toothed lines or faction-colored arcs.

**Rendering (on AoR or overlay texture):**
- Stroke along the contact-edge geometry (shared border vertices).
- **Color:** warning/danger red (e.g. `#ff4444` or `#e04040`) so it reads as "contact/threat" — document as contact-edge convention to avoid confusion with RS faction color.
- **Glow:** soft glow (e.g. 2–4px blur or outer glow, alpha ~0.9) for visibility.
- If playtesting shows confusion with RS red, switch to amber (`#ffaa00`) as fallback.

### 4.6 UI Panels (Right Sidebar) — Sandbox build only

The following panels and toolbar (§4.7) describe the **sandbox-only** build. The **main game** 3D map uses the canonical layout per [TACTICAL_MAP_SYSTEM.md](../20_engineering/TACTICAL_MAP_SYSTEM.md) and [2026-02-19-warmap-figma-spec.md](../plans/2026-02-19-warmap-figma-spec.md): single right panel (settlement 5 tabs or formation panel), OOB 300px left, bottom layer toolbar, no SAVE/LOAD/region on map surface.

All panels use a dark NATO aesthetic: `background:rgba(10,10,22,0.92)`, green accent border `#00ff88`, monospace font.

| Panel | Purpose | Updates |
|-------|---------|---------|
| **SELECTION** | Shows selected formation details | On click: name, faction, personnel, posture, cohesion, fatigue, HQ, deployment status. Posture dropdown. Deploy/Undeploy buttons |
| **ORDERS** | Queued orders for next turn | List of attack/move orders with remove buttons |
| **BATTLE LOG** | Turn-by-turn combat results | Appended after each turn advance. Shows casualties, flips, movement |
| **FORCES** | Faction resource summary | Brigade count and total personnel per faction |
| **SPAWN BRIGADE** | Brigade creation | Faction, equipment class, name, HQ settlement dropdowns |

### 4.7 Toolbar (Top Bar) — Sandbox build only

- **Region selector**: Dropdown to switch between predefined regions (reloads page)
- **ADVANCE TURN**: Executes one turn using real engine
- **Turn counter**: "Turn: N"
- **Mode buttons**: SELECT / ATTACK / MOVE (highlighted when active)
- **AoR toggle**: Show/hide brigade AoR crosshatch overlay
- **SAVE / LOAD / RESET**: State persistence (JSON to/from localStorage)

### 4.8 Sandbox-Only vs Canon Mechanics

| Feature | Sandbox | Canon Engine |
|---------|---------|-------------|
| Settlement starting control | All uncontrolled | From scenario init_control |
| Brigade spawning | Click-to-spawn panel | `formation_spawn.ts` with militia pools |
| Deployment states | Sandbox processDeploymentStates() | BrigadeMovementStatus in brigade_movement |
| AoR expansion on deploy | HQ + adjacent, personnel-capped | Canon AoR reshaping via aor_reshaping.ts |
| Movement pre-claim | BFS claims uncontrolled path | Only faction-controlled territory traversal |
| Terrain scalars | Real data from JSON file | Same JSON file, loaded by scenario runner |
| Turn pipeline | 7-step subset | 30+ step full pipeline |

---

## 5. File Manifest

### 5.1 Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `src/ui/map/tactical_sandbox.html` | ~30 | Vite entry point HTML |
| `src/ui/map/tactical_sandbox.ts` | ~3200 | Main viewer: 3D terrain, overlays, interaction, turn advance |
| `src/ui/map/sandbox/sandbox_scenarios.ts` | ~60 | Region definitions (bbox, names) |
| `src/ui/map/sandbox/sandbox_slice.ts` | ~265 | Data slicer: loads full data, filters to region bbox |
| `src/ui/map/sandbox/sandbox_engine.ts` | ~290 | Turn engine: deployment states, turn pipeline, determinism utilities |
| `src/ui/map/sandbox/sandbox_ui.ts` | ~550 | HTML overlay panels: toolbar, selection, orders, battle log, spawn, resources |

### 5.2 Files Modified

| File | Changes |
|------|---------|
| `vite.config.ts` | Added `tactical_sandbox.html` to Vite multi-page input |
| `src/state/recruitment_types.ts` | Exported `EQUIPMENT_CLASS_TEMPLATES` for browser-safe use |

### 5.3 Data Files Used

| File | Size | Purpose |
|------|------|---------|
| `data/derived/terrain/heightmap_3d_viewer.json` | ~1.4 MB | 1024x1024 DEM grid (WGS84) |
| `data/derived/settlements_wgs84_1990.geojson` | ~8 MB | 5,823 settlement polygons |
| `data/derived/settlement_edges.json` | ~200 KB | Settlement adjacency graph |
| `data/derived/terrain/osm_waterways_snapshot_h6_2.geojson` | ~2 MB | River/stream geometries |
| `data/derived/terrain/osm_roads_snapshot_h6_2.geojson` | ~3 MB | Road network geometries |
| `data/source/boundaries/bih_adm0.geojson` | ~100 KB | BiH country border |
| `data/derived/terrain/settlements_terrain_scalars.json` | ~200 KB | Per-settlement terrain combat modifiers |
| `runs/<run_id>/initial_save.json` | Variable | Optional game save with formations, control, AoR |

### 5.4 Engine Functions Reused (from main simulation)

| Function | Source File | Purpose |
|----------|------------|---------|
| `resolveAttackOrders()` | `src/sim/phase_ii/resolve_attack_orders.ts` | Full battle resolution |
| `processBrigadeMovement()` | `src/sim/phase_ii/brigade_movement.ts` | Pack/transit/unpack movement |
| `applyPostureOrders()` | `src/sim/phase_ii/brigade_posture.ts` | Posture changes |
| `applyBrigadePressureToState()` | `src/sim/phase_ii/brigade_pressure.ts` | Brigade pressure computation |
| `degradeEquipment()` | `src/sim/phase_ii/equipment_effects.ts` | Equipment wear |
| `ensureBrigadeComposition()` | `src/sim/phase_ii/equipment_effects.ts` | Equipment state initialization |
| `applyWiaTrickleback()` | `src/sim/formation_spawn.ts` | WIA recovery |
| `strictCompare()` | `src/state/validateGameState.ts` | Deterministic sort comparator |
| `initializeCasualtyLedger()` | `src/state/casualty_ledger.ts` | Casualty tracking initialization |

---

## 6. Integration Guide for Main Game

**Scope (per product decisions 2026-02-20):** The **3D map replaces the 2D canvas completely** as the primary tactical map. The **Staff Map** (4th zoom) remains for **2D snapshots**. Canon mechanics (deploy/undeploy, composition-dependent movement radius, movement radius UI, multi-click move) and 3D integration are delivered in the **same plan**, in **phases** (6A, 6B, 6C). The **sandbox** will eventually be **folded into the full game** for specialized scenario creation; until then it is a standalone system with its own UI and rules. Main-game 3D uses the **canonical chrome** (TACTICAL_MAP_SYSTEM, Figma spec); §4.6–4.7 above apply to the sandbox build only.

### 6.1 Replacing 2D Canvas with 3D Map

The existing main game tactical map (`src/ui/map/MapApp.ts`, ~4,710 lines) uses Canvas 2D. **Replace it entirely** with the 3D approach (separate 3D viewer component sharing the same data contract — see Paradox convene report). Staff Map remains as a 2D snapshot overlay (key 4).

**Critical code to port:**
1. `buildTerrainMesh()` — Terrain geometry from DEM heightmap
2. `buildBaseTexture()` — 8192x8192 base terrain texture with settlements, roads, waterways
3. `buildFactionTexture()` — 4096x4096 faction control overlay
4. `buildAoRTexture()` — 4096x4096 AoR crosshatch with front line teeth
5. `buildFormationLODLayer()` — NATO symbology sprite generation
6. `makeCanvasProjection()` — WGS84 to canvas pixel mapping
7. `wgsToWorld()` — WGS84 to Three.js world coordinates
8. `sampleHeight()` — Bilinear interpolation of heightmap elevations

**Rendering pipeline:**
```
Scene
  ├── terrainMesh (base geometry + terrain texture)
  ├── factionOverlay (y=0.005, faction colors)
  ├── aorOverlay (y=0.010, crosshatch + teeth)
  ├── movementRadiusOverlay (y=0.012, temporary)
  ├── formationGroup (NATO counter sprites)
  ├── stemGroup (sprite-to-terrain connecting lines)
  ├── attackArrowGroup (red 3D line arrows)
  ├── movementPathGroup (blue 3D path lines)
  └── highlightGroup (settlement ring highlights)
```

**Key architectural decisions for integration:**
- Overlays are separate meshes cloning the terrain geometry (same UVs), not separate canvases
- Texture rebuilding (faction, AoR) should happen on state changes, not every frame
- Movement radius overlay is created/destroyed on demand (not persistent)
- Formation sprites use `sizeAttenuation: false` for consistent screen-space size
- All picking uses `getWorldPosition()` not `.position` (sprites are group children)

### 6.2 Porting Sandbox Mechanics to Canon

**Deployment states**: The sandbox's `DeploymentState` system maps to the canon's `BrigadeMovementStatus`. The canon already has `packed`, `in_transit`, `unpacked` states. Use **Column** and **Combat** as player-facing labels (Game Designer recommendation). Map:
- `undeployed` (Column) → canon `packed` (contracted AoR)
- `deploying` → 1-turn transition to `unpacked`
- `deployed` (Combat) → canon `unpacked` (expanded AoR)
- `undeploying` → 1-turn transition to `packed`

**Movement radius — undeployed composition-, roads-, and terrain-scalar–dependent:** Canon must define Column (undeployed) movement rate by **composition**, **roads**, and **terrain scalars** (slower uphill and across major rivers; use settlements_terrain_scalars). Product preference **12 as baseline**; team to specify formula and cost model. Deployed (Combat) rate remains 3. Document in Phase II spec and Systems Manual §6.

**Movement radius (reachability)**: The BFS-based reachability computation (`computeReachableSettlements`) should be ported to the main UI to show valid move destinations. Use the canon movement rate(s) — composition-dependent for Column, 3 for Combat. The function signature:
```typescript
function computeReachableSettlements(
  startSids: string[], faction: string, maxHops: number,
  edges: Array<{a: string; b: string}>,
  politicalControllers: Record<string, string | null>,
  sliceSids: Set<string>,
): Set<string>
```

**Multi-click destination selection**: The `MoveSelectionState` interface and contiguity validation should be ported:
```typescript
interface MoveSelectionState {
  brigadeId: string;
  isUndeployed: boolean;
  maxSettlements: number;  // min(4, max(1, floor(personnel/400)))
  reachableSids: Set<string>;
  selectedSids: string[];
}
```

**Contact-edge visual**: Port contact-edge detection (friendly AoR vs opposing settlement) and draw the shared boundary with a red glowing stroke per §4.5. Do not port toothed FEBA (`drawFrontTeeth`); that visual is removed.

### 6.3 Performance Considerations

- **Heightmap cropping** is essential — don't render full BiH mesh when zoomed into a region
- **Texture resolution**: 4096x4096 for overlays is fine for regions; may need dynamic resolution for full BiH
- **OffscreenCanvas** is used for all texture generation — keeps main thread responsive
- **Sprite culling**: Formation sprites that are off-screen or below opacity threshold are skipped during picking
- **Texture disposal**: All `dispose()` calls are critical — Three.js textures leak GPU memory without explicit disposal

### 6.4 Known Limitations / Future Work

1. **No fog of war**: All formations are visible to all factions
2. **No supply lines**: Movement ignores logistics
3. **Simplified equipment**: No individual vehicle tracking, just aggregate composition
4. **No air support / artillery fire missions**: Only direct brigade-vs-settlement attacks
5. **Settlement polygons**: Some MultiPolygon settlements only render first polygon ring
6. **Text legibility**: NATO counter text can be hard to read at certain zoom levels
7. **Movement animation**: No visual animation of brigade movement — they teleport on turn advance
8. **Multi-turn movement**: No waypoints or multi-turn movement planning
9. **Spawn panel UX**: HQ settlement dropdown is empty until faction controls settlements

---

## Appendix: Region Definitions

| Region | ID | Bbox | Settlements | Description |
|--------|-----|------|-------------|-------------|
| Travnik — Sarajevo | `travnik_sarajevo` | [17.50, 43.72, 18.58, 44.10] | ~150 | Wide three-faction belt |
| Sarajevo Environs | `sarajevo` | [18.20, 43.75, 18.55, 43.92] | ~40 | Urban siege contact zone |
| Posavina Corridor | `posavina` | [17.90, 44.70, 18.60, 45.10] | ~50 | RS corridor, linear front |
| Central Bosnia | `central_bosnia` | [17.60, 44.00, 17.90, 44.25] | ~50 | RBiH/HRHB contact zone |

---

## Appendix: Determinism

The sandbox inherits the AWWV engine's determinism guarantees:
- No `Math.random()` — all randomness is seeded/deterministic
- Sorted iteration via `strictCompare` from `validateGameState.ts`
- `JSON.parse(JSON.stringify(state))` for deep cloning
- `compareTurnReports()` utility for verifying identical outputs from identical inputs

---

---

## 7. Implementation Phases (Summary)

| Phase | Deliverable |
|-------|-------------|
| **6A** | 3D view with parity to current 2D: terrain, faction overlay, formations, picking; same data and IPC; canonical chrome (OOB, single right panel, layer toolbar). Staff Map remains for 2D snapshots. |
| **6B** | Canon mechanics: deploy/undeploy (Column/Combat) and **composition-, roads-, and terrain-scalar–dependent** Column movement (team to define formula and cost model; 12 baseline; slower uphill and across major rivers) in Phase II spec, Systems Manual §6, IPC; movement radius UI in TACTICAL_MAP_SYSTEM. |
| **6C** | Port movement radius overlay, deploy/undeploy UI, multi-click move, front teeth into 3D map. Sandbox eventually folded into full game for specialized scenario creation. |

---

*Last updated: 2026-02-20 — product decisions and phased integration; 2026-02-19 — initial implementation guide.*
