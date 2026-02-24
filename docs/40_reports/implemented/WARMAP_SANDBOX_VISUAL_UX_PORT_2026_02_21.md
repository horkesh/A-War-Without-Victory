# Implemented Work — Warmap Sandbox Visual & UX Port (Phases A–D)

**Date:** 2026-02-21
**Status:** Complete
**Scope:** Port best-of-both-worlds visual quality and UX from the tactical sandbox into the 3D operational warmap — two-tier formation counters, enhanced overlays, right-side panel system, interactive mode toolbar. 11 files created/modified, 0 test regressions.

---

## Summary

The tactical sandbox (`tactical_sandbox.ts`, `sandbox_ui.ts`) had evolved a rich set of visual and UX features — CRT-style corps counters, polygon-fill movement ranges, formation panels with posture/deploy controls, and interactive attack/move modes — that the 3D operational warmap lacked. This work ports those features into the warmap while preserving its distinct blue-steel NATO aesthetic (not the sandbox's green CRT theme).

Four phases were executed:

| Phase | Scope | Files |
|-------|-------|-------|
| **A** — Counters | Two-tier counter paint (brigade light / corps CRT), stem lines | 2 modified, 1 created |
| **B** — Overlays | AoR upgrade, polygon movement range, settlement highlight rings | 1 modified, 1 created |
| **C** — Panels | Right-side panel stack with 4 panels | 5 created |
| **D** — Modes | SELECT/ATTACK/MOVE toolbar with keyboard shortcuts | 1 created |

---

## Phase A — Enhanced Formation Counters

### A1. Two-Tier Counter Paint

Split `paintFormationCounter()` in `FormationSpriteLayer.ts` into two specialized renderers:

#### `paintBrigadeCounter()` — 128×72 canvas

| Property | Before | After |
|----------|--------|-------|
| Background | Dark `rgba(10,10,22,0.92)` | Light `rgba(240,244,248,0.93)` |
| NATO symbol stroke | Light `#e0e0e0` | Dark `#1a2a3a` |
| Name text | Light `#e0e8e0` | Dark `#1a2a3a` |
| Faction bar | 6px, faction-colored | Unchanged |
| Corps-tint overlay | 0.36 alpha | Unchanged |
| Soft-factor triangle | Top-right | Unchanged |
| Data badge | Mode-dependent color | Unchanged |
| Scale | `0.38 × 0.22` | Unchanged |

The brigade counter now uses the sandbox's light-on-dark style for better readability at operational zoom, while retaining the warmap's faction bar, corps-tint overlay, soft-factor triangle, and data badge.

#### `paintCorpsCounter()` — 256×160 canvas

Ported from the sandbox's CRT terminal aesthetic:

```
┌─────────────────────────────────────────────┐
│▐▐▐│                          ┼              │  ← crosshair top-right
│▐▐▐│  2nd Krajina Corps           ╱          │  ← green #00ff88 name
│▐▐▐│  RS                        ╱            │  ← faction-colored label
│▐▐▐│  STR: 24.3k (STRONG)     ╱             │  ← green/yellow/red threshold
│▐▐▐│  PST: DEFEND            ╱              │  ← posture-colored
│▐▐▐│  x12 bde              ╱                │  ← muted blue-gray
│▐▐▐│                     ╱       [STR]      │  ← data mode badge
│▐▐▐│ ┌─ corps-tint 4px inner border ──────┐ │
└─────────────────────────────────────────────┘
  ▲                        ▲            ▲
  12px faction bar    diagonal strike   soft-factor
```

- Background: dark `rgba(10, 10, 22, 0.92)`
- Name: bright green `#00ff88`, bold 20px Courier New
- Strength thresholds: green (≥ 60%), yellow (≥ 30%), red (< 30%)
- Posture text colored via `POSTURE_CRT_COLORS` lookup
- Scale: `0.85 × 0.53` (up from `0.44 × 0.26`)

#### Updated branching

`buildFormationSprite()` and `repaintFormationSprite()` now accept an optional `corpsAggregate` parameter and branch on `isCorpsLikeKind()`:

- Corps: W=256, H=160, call `paintCorpsCounter()`, scale `0.85 × 0.53`
- Brigade: W=128, H=72, call `paintBrigadeCounter()`, scale `0.38 × 0.22`

`buildFormationLODLayer()` passes the `CorpsAggregate` data to corps-like formations.

### A2. Stem Lines — `StemLineLayer.ts` (new)

Vertical lines connecting formation counters to the terrain surface, with radial gradient dot textures at the contact point:

| Property | Corps | Brigade |
|----------|-------|---------|
| Line color | `#00ff88` (green) | `#aabbcc` (gray-blue) |
| Line opacity | 0.55 | 0.40 |
| Dot size | 0.12 | 0.06 |
| Dot opacity | 0.7 | 0.5 |
| depthTest | false | false |

Exports: `buildStemLines()`, `updateStemVisibility()`, `disposeStemLines()`

Visibility is synced with sprite LOD — when a formation fades out at distance, its stem line fades proportionally. Dot textures use a `makeDotTexture()` helper that paints a radial gradient with a bright center highlight.

---

## Phase B — Enhanced Overlays

### B1. AoR Overlay Upgrade

Improvements to `buildSelectedAoRTexture()` in `map_operational_3d.ts`:

| Constant | Before | After |
|----------|--------|-------|
| `AOR_HATCH_WIDTH` | 2.5 | 3.0 |
| `AOR_PULSE_ALPHA` | 0.15 | 0.20 |
| `AOR_BOUNDARY_GLOW` | 4 | 6 |
| Border lineWidth | 2.0 (hardcoded) | 4.0 (`AOR_BORDER_WIDTH` constant) |

Two algorithmic improvements ported from the sandbox:

1. **Per-polygon bounding box hatch optimization** — crosshatch lines are now clipped to each settlement polygon's tight bounding box instead of spanning the full texture extent. Reduces overdraw and produces cleaner edges at polygon boundaries.

2. **Perpendicular contact edge segments** — contact edges between neighboring settlements now render as short perpendicular segments at boundary midpoints, replacing the previous centroid-to-centroid line approach. A `drawContactEdge()` helper computes the perpendicular direction from the shared boundary and draws a glowing segment.

### B2. Polygon-Based Movement Range — `MovementRangePreview.ts` (modified)

| Property | Before | After |
|----------|--------|-------|
| Rendering | Flat `CircleGeometry(0.028)` dots | 4096×4096 canvas polygon fill |
| Visual | Scattered blue/yellow dots | Full settlement polygon shapes |
| Border | None | Dashed `[12, 6]` pattern, lineWidth 3 |
| Deployed color | Blue dot | `rgba(80, 160, 255, 0.20)` fill + `0.70` border |
| Undeployed color | Yellow dot | `rgba(255, 200, 0, 0.20)` fill + `0.70` border |
| Mesh Y | 0.008 | 0.012 (above AoR at 0.010) |

The new `rebuildMovementRangePolygon()` function renders full GeoJSON settlement polygons onto a canvas texture, producing clean filled regions with dashed borders. A `ringsFromSettlement()` helper extracts polygon coordinates from settlement data.

The original `rebuildMovementRangePreview()` is retained as a fallback when GeoJSON polygons are unavailable.

### B3. Settlement Highlight Rings — `SettlementHighlightRing.ts` (new)

Animated ring geometry placed flat on terrain at settlement centroids:

| Purpose | Color | Hex |
|---------|-------|-----|
| HQ selection | Blue | `0x4488ff` |
| Move target | Green | `0x44cc44` |
| Attack target | Red | `0xff4444` |

- Geometry: `RingGeometry(0.012, 0.018, 24)` — thin donut shape
- Rotation: `ring.rotation.z += 0.01` per frame in the render loop
- `depthTest: false`, `opacity: 0.8`, `DoubleSide` — always visible above terrain

The `SettlementHighlightRings` class manages the ring lifecycle:
- `addRing(sid, centroids, heightmap, color, purpose)` — auto-deduplicates by sid+purpose
- `removeRing(sid, purpose?)` — selective removal
- `clearRings(purpose?)` — bulk removal by purpose or all
- `update()` — rotation animation (called in render loop)
- `dispose()` — full cleanup

---

## Phase C — Right-Side Panel System

### Panel Container — `WarMapPanelStack.ts` (new)

Right-side vertical flex container:

```
position: absolute; top: 44px; right: 12px; bottom: 36px; width: 280px;
z-index: 10; display: flex; flex-direction: column; gap: 4px;
overflow-y: auto; pointer-events: all;
```

Shared blue-steel NATO panel style (distinct from sandbox green CRT):

```
background: rgba(4,4,12,0.92);
border: 1px solid rgba(26,42,62,0.8);
border-left: 3px solid #4a6a90;
padding: 10px 12px;
font: 11px "IBM Plex Mono", monospace;
color: #8090a0;
```

Five exported button style constants: `WARMAP_BUTTON_STYLE`, `WARMAP_BUTTON_RED_STYLE`, `WARMAP_BUTTON_GREEN_STYLE`, `WARMAP_BUTTON_YELLOW_STYLE`, plus `WARMAP_PANEL_STYLE`.

### Panel Stack Layout (top to bottom)

```
┌──────────────────────────────────┐
│ SELECTION                        │ ← Formation stats, posture, deploy
│ 3rd Mountain Bde                 │
│ RBiH — brigade                   │
│ PRS: 4200  COH: 72%  FAT: 18%   │
│ PST: DEFEND   STS: active        │
│ ■ DEPLOYED — Combat posture      │
│ INF: 3200 | TNK: 45              │
│ ART: 28   | AA: 12               │
│ SET POSTURE: [▼ dropdown]        │
│ [▲ UNDEPLOY (contract to HQ)]    │
├──────────────────────────────────┤
│ ORDERS (3)                       │ ← Pending orders with cancel
│ ⚔ 1st Bde → S100042         [X] │
│ → 2nd Bde → S100055, S100060[X] │
│ ▼ 5th Bde → DEPLOY          [X] │
├──────────────────────────────────┤
│ BATTLE LOG                       │ ← Scrollable turn-by-turn log
│ ── Turn 14 ──                    │
│ S100042: RS → RBiH               │
│ ⚔ S100042 (battle)               │
│ Movement orders processed         │
│ ── Turn 13 ──                    │
│ No battles this turn              │
├──────────────────────────────────┤
│ FORCES                           │ ← Per-faction summary
│ RS: 15 bdes, 32.1k pers          │
│ RBiH: 12 bdes, 24.3k pers        │
│ HRHB: 8 bdes, 16.8k pers         │
└──────────────────────────────────┘
```

### Selection Panel — `SelectionPanel.ts` (new)

Displays full formation stats when a brigade or corps is clicked:
- Header: formation name in `#8cb4d8`
- Faction+kind with faction-colored text
- Personnel (PRS), Cohesion (COH%), Fatigue (FAT%) — color-coded by threshold
- HQ settlement, status, deployment state with colored status label
- Equipment composition: INF/TNK/ART/AA (when available)
- Posture dropdown: 5 options (defend, probe, attack, elastic_defense, consolidation)
- Deploy button (green, when undeployed) / Undeploy button (yellow, when deployed)
- Callbacks: `onPostureChange`, `onDeploy`, `onUndeploy`

### Battle Log Panel — `BattleLogPanel.ts` (new)

Scrollable turn-by-turn combat log:
- Max-height 300px, `flex: 1` to fill remaining space
- Turn headers: `── Turn N ──` in cyan `#4a8acc`
- Control flips: `settlement_id: faction_from → faction_to` with faction-colored text
- Battle results: sword icon `⚔` in green (success) or red (failure)
- Movement/posture status: blue/yellow indicator lines
- Auto-scrolls to bottom on new entries

### Orders Queue Panel — `OrdersQueuePanel.ts` (new)

Pending orders with type icons and cancel buttons:
- Attack: red `⚔`, Move: blue `→`, Deploy: green `▼`, Undeploy: yellow `▲`, Posture: purple `◆`
- Each entry: `brigadeName → target [X]`
- Cancel button (X) removes order by index via callback
- Header shows count: `ORDERS (N)`

### Forces Summary Panel — `ForcesSummaryPanel.ts` (new)

Per-faction brigade count and personnel:
- Format: `RS: 15 bdes, 32.1k pers`
- Colors: RS `#cc5555`, RBiH `#55aa66`, HRHB `#5588bb`
- Compact panel, recomputed on each `applySave()` from formation data

---

## Phase D — Interactive Mode System

### Mode Toolbar — `ModeToolbar.ts` (new)

Three mode buttons positioned above the panel stack:

```
┌──────────────────────────────────────┐
│  [SELECT [1]]  [ATTACK [2]]  [MOVE [3]]  │
└──────────────────────────────────────┘
position: absolute; top: 12px; right: 12px; z-index: 12;
```

- Active button: brighter background (`rgba(74,106,144,0.45)`) and border (`rgba(74,106,144,0.8)`)
- Inactive: standard `WARMAP_BUTTON_STYLE`
- Keyboard shortcuts: `1` = SELECT, `2` = ATTACK, `3` = MOVE, `Escape` = return to SELECT
- Ignores keypresses when focus is in input/select/textarea elements

The `installModeKeyboard()` function returns a cleanup function to remove the event listener.

### DesktopBridge Extensions

Two new methods added to the `DesktopBridge` interface:
- `stagePostureOrder(brigadeId: string, posture: string): void`
- `stageAttackOrder(brigadeId: string, targetSid: string): void`

These delegate to existing IPC channels in the Electron preload bridge.

---

## Integration into map_operational_3d.ts

All modules are imported and wired into the main 3D map module:

### New State Variables
- `stemGroup`, `stemEntries` — stem line layer
- `highlightRings` — `SettlementHighlightRings` instance
- `selectionPanel`, `ordersPanel`, `battleLogPanel`, `forcesPanel` — panel DOM elements
- `interactionMode` — current mode (`select | attack | move`)
- `pendingOrders` — orders queue array

### Helper Functions
- `computeForcesSummary(save)` — aggregates brigade count + personnel per faction
- `toWarMapFormationInfo(f)` — converts `FormationRecord` to `WarMapFormationInfo`
- `getDeploymentStatus(f)` — derives deploy status from `movement_status` and `movement_stance`
- `refreshOrdersPanel()` — re-renders the orders panel from current queue

### Wiring Points

| Hook | Integration |
|------|-------------|
| `rebuildFormationLayer()` | Build/dispose stem lines, add stem group to scene |
| `setSelectedFormation()` | Update selection panel, manage highlight rings at HQ settlement |
| `updateReachableOverlay()` | Branch to polygon overlay when GeoJSON available |
| `applySave()` | Update forces summary, reset orders, append battle log |
| Animation loop | `updateStemVisibility()`, `highlightRings.update()` |

### UI Repositioning

Existing UI elements moved from right to left side to avoid collision with the new panel stack:

| Element | Before | After |
|---------|--------|-------|
| Map mode badge | `right: 12px` | `left: 12px` |
| Post-FX/Audio badge | `right: 12px` | `left: 12px` |
| Layer toggle buttons | `right: 12px` | `left: 12px` |

---

## Files Modified/Created

| File | Action | Lines | Description |
|------|--------|-------|-------------|
| `src/ui/map/FormationSpriteLayer.ts` | Modified | ~350 | Two-tier counter paint (brigade light / corps CRT), new scale constants, corpsAggregate param |
| `src/ui/map/map_operational_3d.ts` | Modified | ~200 | AoR upgrade, all module integration, badge repositioning, helper functions |
| `src/ui/map/interaction/MovementRangePreview.ts` | Modified | ~80 | Added `rebuildMovementRangePolygon()` alongside fallback dots |
| `src/ui/map/StemLineLayer.ts` | Created | 133 | Stem lines from counters to terrain with radial gradient dots |
| `src/ui/map/interaction/SettlementHighlightRing.ts` | Created | 118 | Animated settlement highlight rings (selection/move/attack) |
| `src/ui/map/panels/WarMapPanelStack.ts` | Created | 58 | Panel container + shared NATO blue-steel styles |
| `src/ui/map/panels/SelectionPanel.ts` | Created | 171 | Formation info + posture dropdown + deploy/undeploy |
| `src/ui/map/panels/BattleLogPanel.ts` | Created | 83 | Scrollable turn-by-turn battle log |
| `src/ui/map/panels/OrdersQueuePanel.ts` | Created | 81 | Pending orders with cancel buttons |
| `src/ui/map/panels/ForcesSummaryPanel.ts` | Created | 52 | Per-faction brigade count + personnel |
| `src/ui/map/panels/ModeToolbar.ts` | Created | 100 | SELECT/ATTACK/MOVE toolbar with keyboard shortcuts |

**Total:** 3 modified, 8 created = 11 files touched

---

## Verification

- `npx tsc --noEmit` — clean (0 errors)
- `npx vitest run` — 143/143 tests pass (12 suites)
- No regressions; all new code is UI-layer only (no simulation logic changes)
- No new runtime dependencies added
