# War Map UI/UX Architecture Proposal

**Date:** 2026-02-20
**Author:** Paradox Team (Architect Lead, full team convened)
**Status:** Draft proposal for review
**Scope:** Comprehensive UI/UX and GUI enhancement plan for the AWWV war map
**Supersedes:** Extends OPERATIONAL_MAP_3D_PLAN.md and TACTICAL_SANDBOX_3D_POST_INTEGRATION_ROADMAP.md

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Assessment](#2-current-state-assessment)
3. [The Armchair General's Experience](#3-the-armchair-generals-experience)
4. [Industry Research: What Others Got Right](#4-industry-research-what-others-got-right)
5. [The Vision: Dual-Layer War Map](#5-the-vision-dual-layer-war-map)
6. [Base Map: The Tracestrack Topo Foundation](#6-base-map-the-tracestrack-topo-foundation)
7. [Night Mode: The Ops Center Overlay](#7-night-mode-the-ops-center-overlay)
8. [Unit Display System](#8-unit-display-system)
9. [Orders and Interaction Model](#9-orders-and-interaction-model)
10. [Front Lines and Territorial Control](#10-front-lines-and-territorial-control)
11. [Fog of War and Intelligence](#11-fog-of-war-and-intelligence)
12. [Map Modes and Information Layers](#12-map-modes-and-information-layers)
13. [The Command Hierarchy View](#13-the-command-hierarchy-view)
14. [Battle Visualization](#14-battle-visualization)
15. [Supply and Logistics Display](#15-supply-and-logistics-display)
16. [Displacement and Humanitarian Layer](#16-displacement-and-humanitarian-layer)
17. [Audio Design](#17-audio-design)
18. [Engine Implications](#18-engine-implications)
19. [Technical Architecture](#19-technical-architecture)
20. [Implementation Roadmap](#20-implementation-roadmap)
21. [Risk Assessment](#21-risk-assessment)

---

## 1. Executive Summary

AWWV's war map needs to evolve from a prototype tactical display into an immersive command experience that makes the player *feel* like they're running a 1990s-era operations center, looking down at Bosnia-Herzegovina through satellite feeds and intelligence reports while managing a war they cannot win.

This proposal defines a **dual-layer map system**: a Tracestrack Topo-inspired topographic base map (the "daylight atlas") that communicates terrain, infrastructure, and settlements with cartographic beauty, overlaid with a **night-mode military operations layer** (the current "NATO Ops Center" aesthetic) that shows control, forces, fronts, and orders with phosphor-green clarity.

The player should be able to toggle between these and see both simultaneously in blended form. The terrain base makes Bosnia's brutal geography legible; the military overlay makes the war's mechanics visible.

### Key Principles

1. **Terrain is not decoration -- it is gameplay.** If the player can see that Igman is a 1500m wall south of Sarajevo, they understand *why* attacks from the south are suicidal before they read a single number.
2. **Information density scales with zoom.** Strategic view shows corps sectors and front lines. Operational view shows brigade AoRs and movement arrows. Tactical view shows individual settlements, garrison strength, and battle damage.
3. **Orders flow from right-click context**, not mode buttons. Select a brigade, right-click an enemy settlement to attack, right-click a friendly settlement to move. The HoI4/EU4 generation expects this.
4. **Everything is available from the map.** No sub-menu diving. All panels, OOB trees, and order queues are on-map overlays following CPOF's "liquid information" principle.
5. **Fog of war creates genuine tension.** Ghost counters, recon quality gradients, and intel decay force decisions under uncertainty.
6. **The map tells the war's story.** Battle damage accumulates visually. Displacement flows are visible. Fronts harden over time. Exhaustion darkens the palette. The map gets uglier as the war grinds on.

---

## 2. Current State Assessment

### What We Have

| Component | Status | Quality |
|-----------|--------|---------|
| 2D Canvas tactical map (`MapApp.ts`, 5279 lines) | Production | Strong -- zoom tiers, panels, formations, orders, NATO aesthetic |
| Operational 3D ("Night Satellite", `map_operational_3d.ts`, 2451 lines) | Integrated | Good -- terrain mesh, faction overlays, formation sprites, AoR crosshatch |
| Staff 3D ("Parchment Topo", `map_staff_3d.ts`, 1875 lines) | Integrated | Good -- hypsometric tints, serif labels, barbed-wire front motif |
| Tactical Sandbox 3D (`tactical_sandbox.ts`, 3548 lines) | Interactive | Good -- full order system, deploy/undeploy, battle resolution, save/load |
| Warroom Phase 0 UI (16 components) | Production | Complete for Phase 0 |
| GameState Adapter (`GameStateAdapter.ts`, 389 lines) | Production | Solid bridge: GameState JSON to LoadedGameState |
| MapState observable (`MapState.ts`, 209 lines) | Production | Clean event system |
| Electron IPC bridge | Production | Full order staging, game state sync |
| Heightmap data (1024x1024 grid) | Ready | DEM-derived, smoothing pipeline exists |
| Settlement WGS84 data (5,823 features) | Ready | Complete coverage |
| Terrain scalars per settlement | Ready | Elevation, slope, road access, friction |

### What's Missing

| Gap | Impact |
|-----|--------|
| No topographic base map -- terrain is either "night satellite" dark or "parchment" historical | Player cannot intuitively assess terrain's combat impact |
| No contextual right-click ordering | Order flow requires mode switching (SELECT/ATTACK/MOVE buttons) |
| No corps-sector visualization on the live map | Player cannot see operational-level boundaries |
| No fog of war rendering in the live map | All enemy forces always visible |
| No battle animation or visual feedback | Battles resolve silently between turns |
| No supply line visualization | Supply pressure is a number, not a spatial story |
| No displacement visualization on the map | Civilian displacement is invisible |
| No map modes (F-key switching) | Single view must show everything or nothing |
| No movement range preview | Player cannot see where a brigade can reach |
| No attack odds preview | Player issues orders blind, gets results next turn |
| No "ghost counters" for lost intel contacts | Binary visibility: see it or don't |
| No audio | Silent, sterile experience |
| Front lines are flat colored edges | No depth, no hardening visualization |
| No battle damage accumulation on terrain | Settlements don't show war's toll |
| No corps/army hierarchy panel on the map | Must use OOB sidebar for command chain |

---

## 3. The Armchair General's Experience

### Who Is the Player?

The AWWV player is an armchair general -- someone who reads Balkan Battlegrounds for fun, who knows what "operational depth" means, who plays War in the East on weekends. They want the *weight* of command: imperfect intelligence, friction between intent and execution, the slow grind of a negative-sum war.

But they also want the *craft* of a beautiful interface. They've played Unity of Command 2 and know that a wargame can be both deep and clean. They've seen HoI4's battle plan arrows and know that orders can be intuitive without being dumbed down.

### The Session Flow

A typical AWWV turn should feel like this:

1. **Survey the front** (5 seconds). The map shows the current state. Front lines glow where pressure is building. Corps sectors are visible. The player's eyes are drawn to the hotspots.

2. **Read the intelligence** (10 seconds). Ghost counters show where enemy forces were last seen. Recon-covered areas show strength estimates. Unknown areas are dimmed. The player forms a picture of enemy dispositions.

3. **Issue orders** (30-60 seconds). Select a corps, review its subordinate brigades. Right-click to assign attack targets, reposition reserves, adjust postures. Movement range previews show what's possible. Attack odds estimates show what's wise.

4. **Review the plan** (10 seconds). The orders queue shows all pending actions. Movement arrows and attack indicators are visible on the map. The player sees the coherent picture of their turn's intent.

5. **Advance the turn** (3 seconds). The map animates -- battles flash, arrows pulse, control shifts. The battle log scrolls. The player reads the results and starts the next cycle.

This loop should take 60-90 seconds per turn. The interface should make steps 1-2 effortless (passive information intake) and steps 3-4 fluid (active order issuance with immediate feedback).

---

## 4. Industry Research: What Others Got Right

### Unity of Command 2: The Gold Standard for Clarity

- **Two-tier movement range outline**: normal (orange) and extended (dimmed). Instantly shows what a unit can and cannot reach.
- **Arrow-tip state preview**: hovering a movement destination shows what the unit will look like *after* the move (remaining MPs, combat state).
- **ZoC dots inside movement range**: small dots marking enemy zones of control within your reachable area.
- **Single-screen design**: everything is visible and actionable from the map. No sub-menus.
- **Hidden hex grid**: terrain is hand-drawn and beautiful. The grid appears only on hover/selection.

**Steal for AWWV:** Movement range outlines, attack odds on hover, single-screen philosophy, hidden polygon borders (show only on selection/hover).

### Hearts of Iron IV: Battle Plans as Orders

- **Drawn front lines and offensive arrows**: players draw axes of advance directly on the map. The arrow shape *is* the order.
- **Planning bonus**: accumulates while an attack plan is in place. Visible countdown creates anticipation.
- **Army Group auto-distribution**: front line segments are automatically divided among armies.
- **F-key map modes**: F1 (political), F2 (naval), F3 (air), F4 (supply), F5 (terrain) -- one key switches the entire map's information layer.

**Steal for AWWV:** F-key map modes, visual feedback for "operations" (our named operations), corps-level sector auto-partitioning visible on map.

### War in the East 2: The Information Monster

- **Army-belonging color-coded counter backgrounds**: all units in the same corps share a tinted background. Instant visual grouping.
- **Soft-factors triangle**: a tiny triangle in the counter corner shows morale/supply/experience at a glance via color.
- **Chain-of-command overlay (~ key)**: pink outlines for selected unit, blue for subordinates, yellow for siblings, orange for parent HQ.
- **Switchable counter data display**: click a dropdown to change what value is shown on each counter (strength, supply, morale, movement remaining).
- **Depot priority gradient**: green-yellow-orange-red color gradient for supply depot health.

**Steal for AWWV:** Corps-color-coded counter backgrounds, soft-factors indicator, chain-of-command overlay, switchable counter data mode.

### Command: Modern Operations: Sensor and Range

- **Merge range symbols**: collapse N overlapping range rings into one clean ring per category.
- **LOS tool**: shows what a unit can see/detect from its position. Applicable to both friendly and enemy.
- **Fade-out coast/border lines at zoom**: progressive detail.

**Steal for AWWV:** Merge/declutter toggles, progressive detail by zoom.

### Decisive Campaigns: Barbarossa: Delegation Over Micro

- **Theatre-level posture system**: Blitzkrieg / Sustained Offensive / Rest as high-level abstractions.
- **Card-based allocation**: air support, artillery, and special assets are allocated via cards, not individual unit micro.
- **Commander personality friction**: subordinate commanders can help or hinder based on personality.

**Steal for AWWV:** Already have corps stance and army stance. Visualize these as the primary order layer, with brigade-level orders as drill-down.

### Military C2 Systems: CPOF, TIGR, JCOP

- **Liquid information (CPOF)**: data is separate from presentation. Same unit data is viewable on map, in OOB tree, in a table, or on a timeline, simultaneously and consistently.
- **Composable workspace primitives**: users arrange panels and overlays to their own preference.
- **Progressive disclosure**: strategic overview at wide zoom; tactical detail at close zoom.
- **Ecological Interface Design**: leverage perceptual skills through visual encoding. Minimize mental computation.
- **Redundant encoding**: shape + color + position + size all convey the same meaning. Information survives degraded display conditions.

**Steal for AWWV:** Liquid information (already partially implemented -- same FormationView in map and OOB panel). Progressive disclosure by zoom tier. Redundant encoding for unit state.

---

## 5. The Vision: Dual-Layer War Map

### Architecture: Two Base Textures, One Military Overlay

The war map is composed of three conceptual layers rendered in the Three.js scene:

```
Layer 3: Military Overlay (formations, front lines, orders, fog of war)
         ---- always visible, styled per current theme ----
Layer 2: Faction Control Overlay (settlement tints by controlling faction)
         ---- semi-transparent, blended onto base ----
Layer 1: Base Terrain Texture (switchable between Day and Night)
         ---- the ground truth ----
```

### Day Mode: "Tracestrack Topo" Base

Inspired by the OpenStreetMap Tracestrack Topo layer (`&layers=P`), observed at multiple zoom levels over Bosnia:

- **Elevation hillshade**: Green valleys (#b8d68a to #d1e2b6) transitioning through tan/ochre (#e7d9a8) to grey-brown peaks (#c8b8a0 to #a8a098). Distinct from the current parchment (too warm) and night satellite (too dark).
- **Contour lines**: Thin grey at 100m intervals, thicker at 500m. Labeled with elevation values at tactical zoom.
- **Cased road network**: Two-pass rendering. Dark outer casing (#555, 4px) with colored fill -- red/orange for E-roads and MSRs (M-roads), yellow for secondary, white for local. Road route numbers in small shields.
- **Rivers**: Crisp medium blue (#5b9bd5) with name labels at operational zoom. Width proportional to stream order (Bosna > Vrbas > tributaries).
- **Settlement fills**: Light grey-beige polygons with darker outlines. Urban areas get denser fill at tactical zoom.
- **Labels**: Dark grey (#333) text with thick white halos for readability over complex terrain. Sans-serif (Inter or IBM Plex Sans) for cities, smaller for villages. Progressive disclosure: only major cities at strategic zoom, all labeled settlements at tactical zoom.
- **International border**: Dashed pink/magenta line (matching OSM convention for BiH border).
- **Municipality borders**: Thin grey dashed lines visible only at operational and tactical zoom.

The key quality: **this base map makes terrain legible as gameplay**. You look at Sarajevo and see the Miljacka valley, flanked by Trebevic (1629m) and Igman (~1500m), with roads funneling through bottlenecks. You understand the siege without reading a tooltip.

### Night Mode: "NATO Ops Center" Overlay

The existing aesthetic, refined:

- **Dark terrain**: Current night elevation palette (dark green through ochre to grey peaks) with city light radial gradients.
- **Amber roads, blue rivers**: Current operational 3D style.
- **Exponential fog**: Atmospheric haze matching dark background (#030810).
- **ACES filmic tone mapping**: Cinematic contrast.
- **CRT post-processing**: Subtle scanlines, vignette, phosphor glow on bright elements.

### Mode Switching

**Toggle key: `N`** (for Night/NATO). Crossfade 350ms. The 3D scene swaps the base terrain texture and adjusts lighting:

| Property | Day Mode | Night Mode |
|----------|----------|------------|
| Base texture | Tracestrack Topo palette | Night satellite palette |
| Scene background | #c8dce8 (pale blue sky) | #030810 (space black) |
| Directional light | #fff8e8, intensity 1.4 (warm sun NW) | #6080c0, intensity 0.8 (cool moonlight) |
| Ambient light | #e0e8f0, intensity 0.5 | #203040, intensity 0.3 |
| Fog | None (daylight clarity) | FogExp2(#030810, 0.015) |
| Tone mapping | Linear (neutral) | ACESFilmic, exposure 1.8 |
| Post-processing | None | CRT scanlines + vignette + bloom |
| Label color | #333 with white halo | #88cc88 with dark halo |
| Front line style | Bold red/blue on light terrain | Glowing phosphor on dark terrain |
| Formation counter style | Paper-white with faction bar | Dark with phosphor borders |

Both modes share the same military overlay data and interaction model. The switch is purely aesthetic.

### Blended Mode (Default)

A subtle blend where the Topo base is visible at ~30% behind the night mode overlays. This gives terrain readability while maintaining the dark ops center atmosphere. Adjustable via a slider in Settings (`terrain_blend: 0.0 = pure night, 1.0 = pure day`).

---

## 6. Base Map: The Tracestrack Topo Foundation

### Texture Generation Pipeline

The base terrain texture is generated as an `OffscreenCanvas` (8192x8192 for high-DPR displays, 4096x4096 for standard) in multiple passes:

**Pass 1: Hillshade Relief**
```
For each pixel:
  sample elevation at (lon, lat) and 4 neighbors
  compute slope and aspect from elevation gradient
  apply Lambertian shading with NW light source (azimuth 315, altitude 45)
  multiply by hypsometric tint (elevation -> color via 12-stop ramp)
  blend hillshade luminance with tint color (70% tint, 30% shade)
```

Hypsometric color ramp (Day Mode):
| Elevation (m) | Color | Description |
|---|---|---|
| 0-100 | #c8e6a0 | Lowland green |
| 100-200 | #d4e8b0 | Valley green |
| 200-400 | #dde8b8 | Foothill yellow-green |
| 400-600 | #e8e0a8 | Mid-elevation ochre |
| 600-800 | #e8d8a0 | Hill tan |
| 800-1000 | #d8c8a0 | Mountain light brown |
| 1000-1200 | #c8b8a0 | Mountain brown |
| 1200-1500 | #b8b0a0 | High mountain grey-brown |
| 1500-1800 | #a8a8a8 | Alpine grey |
| 1800-2000 | #c0c0c0 | Peak grey |
| 2000+ | #d8d8d8 | Summit light grey |

**Pass 2: Contour Lines**
```
For each pixel:
  if elevation MOD 100 < threshold (scaled by zoom): draw thin grey (#888, alpha 0.3)
  if elevation MOD 500 < threshold: draw medium grey (#666, alpha 0.5)
  label 500m contours at operational zoom
```

**Pass 3: Water Bodies**
```
Draw rivers from road/river data:
  Bosna, Drina, Vrbas, Una, Neretva, Sava as #4a90c8 (width 3-5px scaled by order)
  Tributaries as #6aa8d8 (width 1-2px)
  Name labels: italic, #2a6098, with white halo
```

**Pass 4: Road Network (Two-Pass Cased)**
```
Pass 4a - Casing:
  E-roads (E73, E761, etc.): dark grey #444, width 5px
  M-roads (M-17, M-18, etc.): dark grey #555, width 4px
  Secondary: grey #777, width 2px

Pass 4b - Fill:
  E-roads: red-orange #c84040, width 3px
  M-roads: orange #d89830, width 2.5px
  Secondary: yellow #e8d050, width 1.5px

  Route shields: small rounded rectangles with route numbers
```

**Pass 5: Settlement Polygons**
```
For each settlement:
  Draw polygon fill: #e8e0d8 (light beige), alpha 0.4
  Draw polygon outline: #a09080, width 0.5px
  At tactical zoom, fill density increases for urban settlements
```

**Pass 6: Labels (Progressive Disclosure)**
```
Strategic zoom (level 0): Sarajevo, Tuzla, Zenica, Banja Luka, Mostar, Brcko only
Operational zoom (level 1): All municipality seats + pop > 5000
Tactical zoom (level 2): All named settlements
Staff zoom (level 3): All settlements + elevation labels + terrain features

Font: 'Inter', 'IBM Plex Sans', sans-serif
Halo: white (#fff), lineWidth 4, alpha 0.85
Fill: #333 for cities, #555 for villages
```

**Pass 7: Borders**
```
International border: dashed magenta (#c040a0), dash [8,4], width 2px
Entity boundary (RS/FBiH): dashed orange (#c08030), dash [6,3], width 1.5px
Municipality borders: dashed grey (#999), dash [3,2], width 0.5px (operational+ zoom only)
```

---

## 7. Night Mode: The Ops Center Overlay

The existing "Night Satellite Atlas" texture pipeline (`map_operational_3d.ts`) is already close to final quality. Refinements:

### Post-Processing Chain (Three.js EffectComposer)

1. **Render pass**: Standard scene render
2. **Bloom pass**: `UnrealBloomPass` with threshold 0.8, strength 0.15, radius 0.4. Makes front lines, selected units, and battle indicators glow.
3. **Scanline pass**: Custom shader -- horizontal lines at 2px intervals, alpha 0.06. Subtle enough to be felt, not seen.
4. **Chromatic aberration pass**: Custom shader -- 0.5px RGB channel offset at screen edges. Simulates CRT lens imperfection.
5. **Vignette pass**: Darken corners to 60% brightness. Focus attention on center.

### Night Mode Label Rendering

```
Font: 'IBM Plex Mono', monospace (existing)
Color: #88cc88 (phosphor green) for cities, #668866 for villages
Halo: #0a0a1a (scene background), lineWidth 3
Glow: text-shadow equivalent via 2px blur pass in texture
```

### Night Mode Formation Counters

Rendered on dark backgrounds (#1a2a1a) with bright phosphor borders (#00d470 for friendly, #d04040 for hostile). Pulsing glow effect on selected unit (sine wave, period 2.5s). Corps counters get a wider frame and echelon marker bars.

---

## 8. Unit Display System

### NATO APP-6 Inspired Counters

The current counter system paints NATO-style rectangles with faction color bars and echelon indicators. This is good. We enhance it:

#### Counter Anatomy (128x80px texture)

```
+--[Echelon Bars]--+
|                  |
|  [Unit Type]     | <- faction color background (corps-specific tint)
|  [Icon/Symbol]   |
|                  |
+--[Strength Bar]--+
   [Posture Tag]
```

**Fields displayed:**

| Field | Position | Content |
|-------|----------|---------|
| Echelon bars | Top center | X (brigade), XX (division), XXX (corps) |
| Unit type icon | Center | Crossed rifles (infantry), tank track (mechanized), circle (artillery) |
| Faction color | Background | RBiH green, RS red, HRHB blue |
| Corps tint | Background modifier | Unique per-corps saturation/hue shift within faction palette |
| Strength bar | Bottom | Green-yellow-red gradient showing personnel % of max |
| Posture tag | Below counter | Small text: ATK, DEF, PRB, ELD, CON |
| Soft-factors indicator | Top-right corner | Tiny triangle: green (healthy), yellow (stressed), red (critical) |
| Movement indicator | Below counter | Small arrow showing transit direction, or "PACK"/"UNPACK" text |
| Disruption marker | Overlay | Diagonal yellow stripe when disrupted |
| Encirclement marker | Overlay | Red circle when encircled |

#### Corps-Color Coding (War in the East Pattern)

Each corps within a faction gets a distinct hue shift of the faction base color:

```
RBiH (base: #3a7a3a green):
  1st Corps: #3a7a3a (pure green)
  2nd Corps: #4a8a3a (yellow-green)
  3rd Corps: #3a6a4a (blue-green)
  4th Corps: #5a8a4a (olive-green)
  5th Corps: #3a7a5a (teal-green)
  7th Corps: #4a7a6a (cyan-green)

RS (base: #a03030 red):
  Drina Corps: #a03030 (pure red)
  Krajina Corps: #a04830 (orange-red)
  Herzegovina Corps: #a03048 (magenta-red)
  SRK: #803030 (dark red)
  IBK: #b04040 (bright red)

HRHB (base: #2a4a8a blue):
  HVO brigades grouped by operational zone
```

This means at a glance, the player can see which brigades belong to which corps by background tint -- a crucial operational awareness tool.

#### Switchable Counter Data Mode

**Hotkey: `D` (Data mode cycle)**. The primary number displayed on the counter cycles through:

1. **Strength** (default): Personnel count (e.g., "1,240")
2. **Cohesion**: Cohesion value with color (green 60+, yellow 30-60, red <30)
3. **Supply**: Supply status indicator
4. **Posture**: Large posture text with modifier arrows
5. **Fatigue**: Fatigue value

The counter repaints its texture on mode switch. All counters switch simultaneously.

#### Zoom-Tier Filtering

| Zoom Level | Visible Formations | Counter Size |
|---|---|---|
| 0: STRATEGIC | Army HQ + Corps only | Large (60x36 screen px) |
| 1: OPERATIONAL | Corps + Brigades | Medium (48x28 screen px) |
| 2: TACTICAL | All (including militia, OGs) | Small (40x24 screen px) |
| 3: STAFF MAP | All with full detail panels | Large with expanded info |

At strategic zoom, brigade counters are aggregated into their corps counter (showing subordinate count as a number). Clicking a corps at strategic zoom opens a dropdown showing its brigades, which can be individually selected.

---

## 9. Orders and Interaction Model

### Right-Click Context System

**Core principle**: Select a formation (left-click on counter or OOB entry), then right-click on the map to issue orders. The context determines the order type:

| Formation State | Right-Click Target | Result |
|---|---|---|
| Brigade selected, deployed | Enemy settlement adjacent to AoR | Stage attack order (show odds preview) |
| Brigade selected, deployed | Friendly settlement not in AoR | Stage AoR expansion/reposition |
| Brigade selected, any state | Distant friendly settlement | Stage movement order (show path + ETA) |
| Corps selected | Enemy territory | Set corps stance to offensive + highlight subordinate brigades |
| Corps selected | Friendly territory | Set corps stance to defensive |
| No selection | Any settlement | Open settlement info panel |

### Movement Range Preview

When a brigade is selected, the map shows:

1. **Deployed movement range**: Settlements reachable in 1 turn with current AoR intact. Highlighted with a pale faction-color wash. This is the "normal range" (inner ring).

2. **Column movement range**: Settlements reachable if the brigade undeploys and moves in column. Highlighted with a dimmer faction-color wash with dashed border. This is the "extended range" (outer ring).

3. **Path preview on hover**: When hovering over a reachable settlement, draw the BFS path from current HQ to destination. Show ETA in turns. The path line is drawn on the terrain following road access (thicker line on roads, thinner off-road).

4. **Terrain cost indicators**: Settlements with high terrain cost (mountain, river crossing) show small icons along the path: mountain triangle, river wave, or red X for impassable.

Implementation: Uses the existing `computeReachableSettlements()` Dijkstra from `tactical_sandbox.ts`, extended to produce both deployed and column range sets.

### Attack Odds Preview

When hovering over a valid attack target with a brigade selected:

```
+----------------------------+
| ATTACK ODDS                |
|                            |
| Target: Grbavica (S10042)  |
| Defender: 3rd Bgd, SRK     |
|                            |
| Your Power:  2,400         |
| Enemy Power: 1,800 (est.)  |
| Ratio:       1.33:1        |
|                            |
| Terrain:  Urban (+25% def) |
| River:    Miljacka (+40%)  |
| Front:    Static 8t (+40%) |
|                            |
| Estimate: STALEMATE        |
| Risk:     MODERATE          |
+----------------------------+
```

This uses the existing `combat_estimate.ts` read-only forecast system. For enemy formations in fog of war, show estimated strength with "?" markers based on recon intelligence categories (weak/moderate/strong/fortress).

### Order Queue Panel

A persistent panel (bottom-left, collapsible) showing all staged orders for the current turn:

```
ORDERS QUEUE (6 pending)
  ATK  3rd Bgd "Wolves" -> Grbavica    [X]
  MOV  7th Bgd "Lions"  -> Visoko (3t) [X]
  PST  1st Bgd -> ATTACK posture       [X]
  AOR  5th Bgd <- 2nd Bgd: S10044     [X]
  CRP  1st Corps -> OFFENSIVE stance    [X]
  OG   "Op. Storm" activate (4 donors) [X]
```

Each order has a remove button [X]. Clicking an order highlights it on the map (the involved settlements flash). Orders can be reordered by drag.

### Movement Arrows on Map

Staged movement orders render as animated arrows on the terrain:

- **Attack orders**: Bold red arrow from brigade HQ to target settlement. Arrowhead is a filled triangle. Arrow pulses with a glow in night mode.
- **Movement orders**: Dashed blue arrow along the BFS path. Animated "marching ants" pattern showing direction. ETA label at the midpoint.
- **Reposition orders**: Thin green arrow between source and destination settlements.
- **AoR reshaping**: Thin yellow lines between the two brigades' AoRs showing transferred settlements.

---

## 10. Front Lines and Territorial Control

### Settlement Control Rendering

Each settlement polygon is tinted by its controlling faction:

| Faction | Day Mode Fill | Night Mode Fill |
|---------|---------------|-----------------|
| RBiH | rgba(58, 122, 58, 0.35) | rgba(0, 180, 80, 0.25) |
| RS | rgba(160, 48, 48, 0.35) | rgba(200, 60, 60, 0.25) |
| HRHB | rgba(42, 74, 138, 0.35) | rgba(60, 100, 200, 0.25) |
| Null/unknown | rgba(128, 128, 128, 0.15) | rgba(80, 80, 80, 0.10) |

**Contested settlements** get a striped pattern (alternating faction colors, 4px diagonal stripes).

**Highly contested settlements** get a pulsing border animation (alternating faction colors, 1s period).

**Battle-damaged settlements** darken progressively as `battle_damage` (0.0-1.0) accumulates:
```
alpha_modifier = 1.0 - (battle_damage * 0.4)
saturation_modifier = 1.0 - (battle_damage * 0.6)
```
Heavily damaged settlements look grey-brown and washed out, telling the story of destruction.

### Front Line Rendering

Front edges (edges where opposing factions are adjacent) are rendered as thick, styled lines:

**Day Mode:**
- **Fluid fronts** (< 4 turns): Red dashed line, 2px width
- **Static fronts** (4-12 turns): Solid red line, 3px, with small barb ticks perpendicular to the line (every 8px, alternating sides)
- **Hardened fronts** (12+ turns): Thick red line, 4px, with dense barb ticks. A faint red "heat" glow extends 10px to each side.

**Night Mode:**
- **Fluid fronts**: Phosphor green dashed line with subtle glow
- **Static fronts**: Solid phosphor line with barb ticks, brighter glow
- **Hardened fronts**: Double line (inner bright, outer dim) with dense barbs and wide glow halo

**Front pressure visualization** (toggle with `P` key):
- Each front edge gets a thickness proportional to accumulated pressure (0-100 scale)
- High-pressure edges pulse with increasing frequency
- Creates a visual "heat map" of where the front is about to break

### Territorial Depth Shading

At operational+ zoom, rear areas are rendered slightly lighter than frontline areas. For each settlement, compute distance-to-front (BFS hops to nearest enemy settlement):
- Distance 0 (frontline): Full faction color saturation
- Distance 1-3 (near-front): 90% saturation
- Distance 4+: 75% saturation

This creates a natural visual gradient that makes front lines pop without explicit line drawing.

---

## 11. Fog of War and Intelligence

### Visibility Model

The fog of war system layers three states on enemy territory:

1. **Observed** (within recon range of deployed friendly brigade): Full visibility. Enemy formations shown if present; confirmed empty shown if not.

2. **Last Known** (previously observed, now out of range): Dimmed. Ghost counters show last-known enemy positions with fading transparency:
   - Turn 1 after losing contact: 70% opacity, "?" overlay
   - Turn 2-3: 50% opacity
   - Turn 4-6: 30% opacity
   - Turn 7+: Counter fades completely

3. **Unknown** (never observed or intel expired): Dark overlay. Settlement shapes visible (you know the geography) but no enemy force information. In day mode, the terrain is visible but overlaid with a semi-transparent fog wash. In night mode, the area is simply darker.

### Recon Quality Gradient

Within observed territory, the quality of intelligence varies by distance from the observer:

- **Adjacent to friendly AoR** (distance 0-1): Full detail -- exact formation name, personnel count, posture, equipment
- **Extended range** (distance 2 for RBiH, this is their max): Strength category only (weak/moderate/strong/fortress) and faction. No name, no exact count.

Visual encoding:
- High-quality intel: Normal counter rendering
- Low-quality intel: Counter rendered as a silhouette (faction color rectangle with "?" and strength category text only)
- Ghost counters: Translucent, desaturated, "?" overlay, pulsing slowly

### Player Faction Toggle

For development and replay analysis, a hotkey (`Shift+F`) toggles between:
1. **Player view**: Fog of war active for selected player faction
2. **Observer view**: All information visible (current default)
3. **Cycle through factions**: Show what each faction can see

---

## 12. Map Modes and Information Layers

### F-Key Map Modes (Hearts of Iron Pattern)

Each F-key switches the map's primary information overlay while keeping the base terrain visible:

| Key | Mode | Shows |
|-----|------|-------|
| F1 | **Political Control** (default) | Settlement tints by faction, front lines, formation counters |
| F2 | **Terrain** | Pure Topo base without faction overlays. Elevation labels, contour lines prominent. Terrain scalars visible per settlement on hover. |
| F3 | **Supply** | Per-settlement supply status gradient (green=supplied, yellow=strained, red=critical). Supply source markers. Supply line paths from sources to front. |
| F4 | **Exhaustion** | Per-faction exhaustion as a darkening wash over territory. Higher exhaustion = darker, more desaturated. Front pressure heat map overlaid. |
| F5 | **Displacement** | Population displacement flows. Arrows showing displacement routes. Municipality population bars (original vs. current). Refugee concentration zones highlighted. |
| F6 | **Ethnic Composition** | 1991 census ethnic majority per settlement (existing toggle). Pre-war vs. current population composition comparison. |
| F7 | **Intelligence** | Full fog of war visualization. Recon coverage zones. Ghost counter positions. Intel quality gradient. |
| F8 | **Command** | Corps sector boundaries. Chain-of-command lines. Army stance indicators. Named operation zones. OG deployment areas. |

Each mode is a distinct state in MapState: `mapMode: 'political' | 'terrain' | 'supply' | 'exhaustion' | 'displacement' | 'ethnic' | 'intel' | 'command'`.

The active mode determines which overlay textures are visible and which panels are emphasized.

### Layer Toggles (Hotkey Quick-Toggle)

Independent of map mode, individual layers can be toggled:

| Key | Layer | Default |
|-----|-------|---------|
| 1 | Formation counters | ON |
| 2 | Front lines | ON |
| 3 | AoR highlights | OFF (ON when formation selected) |
| 4 | Roads | ON |
| 5 | Rivers | ON |
| 6 | Settlement labels | ON |
| 7 | Municipality borders | OFF |
| 8 | Contour lines | Day: ON, Night: OFF |
| 9 | Terrain elevation tints | ON |
| 0 | Minimap | ON |
| ~ | Chain of command overlay | OFF |
| P | Front pressure heat map | OFF |

---

## 13. The Command Hierarchy View

### Corps Sector Boundaries (F8 Command Mode)

When F8 (Command mode) is active, the map shows:

1. **Corps sector boundaries**: Thick colored lines (corps-specific tint) delineating which territory each corps is responsible for. Derived from `partitionFrontIntoCorpsSectors()`.

2. **Corps HQ markers**: Large corps counter with connecting lines to all subordinate brigade counters (chain-of-command overlay). Lines are dashed and colored with the corps tint.

3. **Army HQ marker**: Largest counter at the army-level HQ settlement. Lines fan out to all corps HQs.

4. **Named operations**: If a corps has an active named operation:
   - The operation zone (target settlements) is highlighted with a bright pulsing border
   - Operation phase shown as text: "PLANNING (2/3)", "EXECUTION (3/4)", "RECOVERY (1/3)"
   - Participating brigades connected with bold lines to the operation zone

5. **OG deployment**: Active Operational Groups shown with their diamond-shaped counter and lines to donor brigades.

### Interactive Hierarchy Navigation

Clicking a formation counter at any level opens a command panel:

**Army HQ Panel:**
```
ARMY OF REPUBLIC OF BIH
Stance: BALANCED
Subordinate Corps: 6
Total Brigades: 48
Total Personnel: 52,400
Exhaustion: 34/100

[Set Stance: GENERAL DEF | BALANCED | GENERAL OFF | TOTAL MOB]
[Click corps to select]
```

**Corps Panel:**
```
1ST CORPS (Sarajevo)
Commander HQ: S10001 (Sarajevo)
Stance: OFFENSIVE  Exhaustion: 42
Subordinate Brigades: 8
Personnel: 9,200
OG Slots: 1 (0 active)
Operation: None

[Set Stance: DEF | BAL | OFF | REORG]
[Activate Operation]
[Select Brigade ▼]
  - 1st Bgd "Wolves" (ATK, 1240, Coh:62)
  - 2nd Bgd "Eagles" (DEF, 980, Coh:45)
  ...
```

**Brigade Panel:**
```
3RD BRIGADE "WOLVES"
Faction: RBiH  Corps: 1st Corps
HQ: S10042 (Grbavica approach)
Personnel: 1,240  Posture: ATTACK
Cohesion: 62  Fatigue: 18  Experience: 0.45
Readiness: ACTIVE  Disrupted: NO
Equipment: 4T / 6A / 8AA (condition: 0.72)
AoR: 4 settlements  Movement: STATIONARY
Casualties this war: 340 KIA, 620 WIA

[Set Posture: DEF | PRB | ATK | ELD | CON]
[Undeploy (Enter Column)]
[Right-click map to issue orders]
```

---

## 14. Battle Visualization

### Inter-Turn Battle Resolution Animation

When the player advances the turn, battles don't resolve silently. A **battle replay sequence** plays:

1. **Pre-battle**: Camera smoothly pans to the battle location. The target settlement pulses with a bright ring.

2. **Engagement**: Attacker and defender counters slide toward the target from their respective directions. Attack arrows become solid. A "clash" icon appears at the settlement.

3. **Resolution flash**: Brief screen flash (white for day, phosphor green for night) at the battle location. Intensity proportional to battle size.

4. **Result display**: A floating result panel appears near the settlement for 2 seconds:
   ```
   BATTLE: Grbavica
   3rd Bgd (RBiH) vs SRK garrison (RS)
   ATTACKER VICTORY
   Casualties: ATK 85 KIA / DEF 120 KIA
   Settlement flipped: RS -> RBiH
   ```

5. **Settlement flip**: The settlement polygon smoothly transitions from defender color to attacker color.

6. **Camera moves to next battle** (if multiple). All battles play in sequence (or simultaneously if they're far apart on the map).

The entire sequence should take 3-8 seconds for a typical turn with 2-5 battles. A "Skip" button (or `Space` key) instantly resolves to the end state.

### Battle Markers

After resolution, each battle location gets a persistent marker for the rest of the game:

- **Small crossed-swords icon** at the settlement, colored by winner's faction
- **Hover tooltip** shows battle details (date, forces, casualties, outcome)
- At strategic zoom, recent battles (last 4 turns) show as larger, brighter markers that fade over time
- Over the course of the game, the map accumulates a constellation of battle markers that tells the war's spatial story

### Snap Event Indicators

When special snap events occur during battle:

| Event | Visual |
|-------|--------|
| Ammo Crisis | Yellow warning triangle flashes on defender |
| Surrender Cascade | White flag icon, defender counter dissolves |
| Last Stand | Red skull-and-crossbones on defender, counter glows red |
| Commander Casualty | Star icon falls from counter |
| Pyrrhic Victory | Attacker counter cracks/flickers despite advancing |

---

## 15. Supply and Logistics Display

### F3 Supply Mode

When F3 (Supply) is active:

**Per-settlement supply coloring:**
```
Green  (#40a040): Fully supplied, good road access
Yellow (#c0c040): Strained (reduced supply, borderline)
Orange (#c08040): Critical (supply at risk)
Red    (#c04040): Cut off (no supply line to source)
```

**Supply source markers**: Large star icons at supply source settlements (faction-colored).

**Supply lines**: Thin animated lines (marching ants pattern) from supply sources through the road network to the front line. Line thickness proportional to supply flow. Lines that pass through damaged or contested territory are drawn in orange rather than green.

**Supply pressure indicator**: Per-faction text overlay at the top of the screen:
```
RBiH Supply Pressure: 34/100 [====------]
RS Supply Pressure: 18/100   [==--------]
HRHB Supply Pressure: 52/100 [=====-----]
```

### Settlement Supply Tooltip

On hover in Supply mode:
```
Settlement: Visoko (S10088)
Supply Status: STRAINED
Distance to supply source: 8 hops
Road access: 0.65 (poor mountain roads)
Nearest supply source: Zenica (12 hops via M-17)
```

---

## 16. Displacement and Humanitarian Layer

### F5 Displacement Mode

This is where the "negative-sum" nature of the war becomes viscerally visible.

**Municipality population bars**: Each municipality centroid gets a vertical bar chart:
```
| Original (1991): 42,000
| Current:         28,000 (displaced: 14,000)
| [||||||||------]
```

Bar is faction-colored, with the "missing" portion shown as a darker shade.

**Displacement flow arrows**: Animated arrows showing the direction and magnitude of displacement from conflict zones. Arrow thickness proportional to displaced population. Arrows flow from high-conflict municipalities toward safer rear areas.

**Humanitarian concentration zones**: Municipalities with disproportionate refugee intake get a red-orange highlight ring. Hover shows: original population vs. current population including displaced persons.

**War toll counter**: A persistent, somber counter in the bottom-right corner (always visible, not just in displacement mode):
```
Week 24 — 8 October 1992
KIA: 4,230  WIA: 8,940  Displaced: 142,000
```

---

## 17. Audio Design

### Sound Categories

**Ambient (continuous):**
- Command bunker: Low fan hum, distant muffled activity, occasional door closing
- Intensity scales with front pressure: more static/noise as war intensifies
- Volume: very low (10-15% of max), adjustable, mutable

**UI Foley:**
- Button clicks: Mechanical switch "clack" (heavy plastic)
- Order staged: Radio squelch chirp
- Turn advanced: Clock mechanism "thunk" + ticker tape feed
- Panel open: Filing cabinet drawer slide
- Panel close: Paper rustling

**Combat Events:**
- Battle resolved: Distant thunder rumble (proportional to battle size)
- Settlement flipped: Brief radio burst
- Surrender cascade: Silence → single bell tone
- Snap event: Sharp radio static burst

**Music:**
- No background music during gameplay (preserves tension and focus)
- Optional: somber ambient drone that increases in dissonance as exhaustion rises

### Implementation Notes

All audio via Web Audio API. Sounds loaded as small WAV/OGG files (< 50KB each). Total audio asset budget: < 2MB. Audio system is fully optional -- game is 100% functional with audio disabled. Audio preferences stored in localStorage.

---

## 18. Engine Implications

### Changes Required to Support Full Map Vision

| Area | Change | Impact | Priority |
|------|--------|--------|----------|
| **GameState** | Add `battle_events: BattleEvent[]` to TurnReport for animation data | Low -- additive to report | High |
| **Battle resolution** | Emit structured battle events with attacker/defender IDs, outcome, casualties, snap events | Low -- already computed, just needs to be reported | High |
| **Recon intelligence** | Add `last_seen_turn` tracking per detected brigade for ghost counter decay | Low -- extend ReconIntelligence type | High |
| **Supply visualization** | Expose supply pathfinding results (source → front paths) in TurnReport or as queryable | Medium -- may need a new derivation step | Medium |
| **Displacement flows** | Expose per-municipality displacement delta per turn for flow arrows | Low -- already in displacement_state | Medium |
| **Combat estimate** | Expose `computeCombatEstimate()` as an IPC-callable function for on-hover odds preview | Medium -- needs IPC handler + validation | High |
| **Movement range** | Expose `computeReachableSettlements()` as IPC-callable for range preview | Medium -- needs IPC handler | High |
| **Front classification** | Expose per-edge front stability (fluid/static/hardened) with active_streak | Low -- already in front_segments | Medium |
| **Corps sector partition** | Expose `partitionFrontIntoCorpsSectors()` result to UI | Low -- run and serialize result | Medium |

### New IPC Handlers for Desktop Mode

```typescript
// In electron-main.cjs, add:
'query-combat-estimate'     // brigade + target -> { power_ratio, outcome_estimate, risk }
'query-movement-range'      // brigade -> { reachable_deployed: sid[], reachable_column: sid[], paths: Map }
'query-movement-path'       // brigade + destination -> { path: sid[], eta_turns: number, terrain_costs: [] }
'query-corps-sectors'       // -> { sectors: Map<FormationId, SettlementId[]> }
'query-supply-paths'        // faction -> { paths: { source_sid, path: sid[], health: number }[] }
```

These are all read-only queries against the current GameState + settlement graph. They do not mutate state. They can be computed on-demand in the main process and returned via IPC.

### Determinism Safety

**All new UI features are strictly read-only.** The existing order-staging IPC pattern (stage-attack-order, stage-posture-order, etc.) is the *only* mechanism by which the UI mutates GameState. The new query handlers compute derived data on-demand and return it without side effects.

The 52-week VCR test (run CLI vs. GUI with identical orders, assert final state hash matches) remains the determinism gate.

---

## 19. Technical Architecture

### Module Structure

```
src/ui/map/
├── main.ts                          (entry point, unchanged)
├── MapApp.ts                        (orchestrator, surgical modifications)
├── types.ts                         (extended with new types)
├── constants.ts                     (extended with new visual constants)
├── data/
│   ├── DataLoader.ts                (unchanged)
│   ├── GameStateAdapter.ts          (extended: battle events, recon decay)
│   └── ControlLookup.ts             (unchanged)
├── geo/
│   ├── MapProjection.ts             (unchanged)
│   └── SpatialIndex.ts              (unchanged)
├── state/
│   └── MapState.ts                  (extended: mapMode, fogOfWar, nightMode)
├── terrain/                         [NEW]
│   ├── TerrainTextureDay.ts         (~400 lines) Day mode Topo texture generator
│   ├── TerrainTextureNight.ts       (~300 lines) Night mode texture (extracted from operational_3d)
│   ├── TerrainMeshBuilder.ts        (~150 lines) Heightmap -> BufferGeometry
│   ├── HillshadeCompute.ts          (~100 lines) Slope/aspect/shading math
│   └── ElevationPalette.ts          (~60 lines) Color ramp definitions
├── layers/                          [NEW]
│   ├── SettlementControlLayer.ts    (~200 lines) Faction-colored settlement polygons on terrain
│   ├── FrontLineLayer.ts            (~250 lines) Multi-style front line rendering
│   ├── FormationSpriteLayer.ts      (~300 lines) NATO counter sprites with LOD
│   ├── OrderArrowLayer.ts           (~200 lines) Attack/move/reposition arrows
│   ├── FogOfWarLayer.ts             (~200 lines) Visibility overlay + ghost counters
│   ├── SupplyOverlay.ts             (~150 lines) Supply gradient + paths
│   ├── DisplacementOverlay.ts       (~150 lines) Population bars + flow arrows
│   ├── CorpsSectorOverlay.ts        (~150 lines) Corps boundary lines + C2 links
│   └── BattleMarkerLayer.ts         (~100 lines) Battle result markers
├── interaction/                     [NEW]
│   ├── RightClickHandler.ts         (~200 lines) Contextual right-click order system
│   ├── MovementRangePreview.ts      (~150 lines) Reachability overlay computation
│   ├── AttackOddsPreview.ts         (~100 lines) Combat estimate tooltip
│   ├── FormationSelector.ts         (~100 lines) Click/hover on counters
│   └── MapModeController.ts         (~80 lines) F-key mode switching
├── panels/                          [NEW - extracted from MapApp.ts]
│   ├── SettlementPanel.ts           (~300 lines) Right-side settlement info
│   ├── FormationPanel.ts            (~300 lines) Formation detail panel
│   ├── OrderQueuePanel.ts           (~150 lines) Pending orders list
│   ├── BattleLogPanel.ts            (~150 lines) Turn battle results
│   └── WarTollCounter.ts            (~50 lines) Persistent KIA/displaced counter
├── audio/                           [NEW]
│   ├── AudioManager.ts              (~200 lines) Web Audio API management
│   ├── AmbientLoop.ts               (~80 lines) Background ambience
│   └── SFXLibrary.ts                (~100 lines) UI and combat sound effects
├── postfx/                          [NEW]
│   ├── PostProcessingPipeline.ts    (~150 lines) EffectComposer setup
│   ├── ScanlineShader.ts            (~40 lines) CRT scanline GLSL
│   ├── ChromaticAberrationShader.ts (~40 lines) Color fringe GLSL
│   └── VignetteShader.ts            (~30 lines) Corner darkening GLSL
├── staff/
│   ├── StaffMapRenderer.ts          (unchanged)
│   └── StaffMapTheme.ts             (unchanged)
├── sandbox/
│   ├── sandbox_engine.ts            (unchanged)
│   ├── sandbox_scenarios.ts         (unchanged)
│   ├── sandbox_slice.ts             (unchanged)
│   └── sandbox_ui.ts                (unchanged)
└── renderer/                        [NEW]
    └── WarMapRenderer.ts            (~500 lines) Main Three.js scene orchestrator
```

**New code estimate: ~4,500 lines across 25 new files.**
**Modified existing files: MapApp.ts, types.ts, constants.ts, MapState.ts, GameStateAdapter.ts, tactical_map.html, tactical-map.css.**

### WarMapRenderer Architecture

```typescript
class WarMapRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer; // post-processing

  // Terrain
  private terrainMesh: THREE.Mesh;
  private dayTexture: THREE.CanvasTexture;
  private nightTexture: THREE.CanvasTexture;
  private currentBlend: number; // 0=night, 1=day

  // Layers (each is a THREE.Group)
  private controlLayer: SettlementControlLayer;
  private frontLineLayer: FrontLineLayer;
  private formationLayer: FormationSpriteLayer;
  private orderArrowLayer: OrderArrowLayer;
  private fogOfWarLayer: FogOfWarLayer;
  private supplyOverlay: SupplyOverlay;
  private displacementOverlay: DisplacementOverlay;
  private corpsSectorOverlay: CorpsSectorOverlay;
  private battleMarkerLayer: BattleMarkerLayer;

  // Interaction
  private rightClickHandler: RightClickHandler;
  private movementPreview: MovementRangePreview;
  private attackOddsPreview: AttackOddsPreview;
  private mapModeController: MapModeController;

  // State
  private mapState: MapState;
  private loadedData: LoadedData;
  private nightMode: boolean;

  init(container: HTMLElement, mapState: MapState, data: LoadedData): void;
  updateFromGameState(loaded: LoadedGameState): void;
  setMapMode(mode: MapMode): void;
  setNightMode(enabled: boolean): void;
  setTerrainBlend(blend: number): void; // 0=night, 1=day
  animate(): void; // RAF loop
  dispose(): void;
}
```

Each layer class follows the pattern:
```typescript
interface MapLayer {
  readonly group: THREE.Group; // added to scene
  update(state: LoadedGameState, mode: MapMode): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}
```

### Data Flow (Enhanced)

```
GameState (src/state/game_state.ts)
    |
    v
runTurn() -> { nextState, turnReport }
    |
    | turnReport now includes: battle_events[], supply_paths[], displacement_deltas[]
    v
desktop_sim.advanceTurn()
    |
    v
IPC: 'game-state-updated' + 'turn-report'
    |
    v
GameStateAdapter.parseGameState(json)
    | + parseTurnReport(reportJson) -> battle events, supply data
    v
MapState.loadGameState(loaded) + MapState.loadTurnReport(report)
    |
    v
WarMapRenderer.updateFromGameState(loaded)
    | Each layer updates its Three.js objects
    v
WarMapRenderer.animate() -> composer.render()
    | Post-processing (night mode only)
    v
Screen

On-demand queries (not per-turn):
  User hovers attack target -> IPC: 'query-combat-estimate' -> tooltip
  User selects brigade -> IPC: 'query-movement-range' -> overlay
  User presses F8 -> IPC: 'query-corps-sectors' -> overlay
  User presses F3 -> IPC: 'query-supply-paths' -> overlay
```

---

## 20. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
*Goal: Dual-texture terrain with mode switching*

- [ ] Create `terrain/` module: `TerrainTextureDay.ts`, `TerrainTextureNight.ts`, `TerrainMeshBuilder.ts`, `HillshadeCompute.ts`, `ElevationPalette.ts`
- [ ] Generate Day mode Topo texture (hillshade + hypsometric tints + contours)
- [ ] Extract Night mode texture generation from `map_operational_3d.ts`
- [ ] Create `WarMapRenderer.ts` scaffold: scene, camera, terrain mesh, dual textures
- [ ] Implement `N` key toggle with crossfade
- [ ] Implement terrain blend slider
- [ ] Verify: terrain renders in both modes, crossfade is smooth

### Phase 2: Roads, Rivers, Labels (Week 3)
*Goal: The base map is cartographically complete*

- [ ] Add cased road network to Day texture (two-pass rendering)
- [ ] Add styled rivers to Day texture
- [ ] Implement progressive-disclosure label system
- [ ] Add international and municipality borders
- [ ] Verify: base map matches Tracestrack Topo quality at all zoom levels

### Phase 3: Settlement Control and Front Lines (Week 4)
*Goal: Territorial control is visible and front lines are styled*

- [ ] Create `SettlementControlLayer.ts`: faction-colored settlement polygons on terrain
- [ ] Create `FrontLineLayer.ts`: multi-style front lines (fluid/static/hardened)
- [ ] Add contested settlement patterns (striped, pulsing)
- [ ] Add battle damage darkening
- [ ] Add territorial depth shading (frontline vs. rear saturation)
- [ ] Verify: control matches 2D map exactly, front lines are readable

### Phase 4: Formation Display (Week 5)
*Goal: NATO counters with corps coloring and data modes*

- [ ] Create `FormationSpriteLayer.ts`: counter sprites with full anatomy
- [ ] Implement corps-color-coded backgrounds
- [ ] Implement soft-factors indicator triangle
- [ ] Implement `D` key counter data mode cycling
- [ ] Implement zoom-tier filtering
- [ ] Verify: all formations visible and correct at all zoom levels

### Phase 5: Right-Click Orders and Movement Preview (Weeks 6-7)
*Goal: Orders flow naturally from contextual interaction*

- [ ] Create `interaction/` module
- [ ] Implement `RightClickHandler.ts`: contextual order staging
- [ ] Add IPC handlers: `query-movement-range`, `query-movement-path`
- [ ] Create `MovementRangePreview.ts`: reachability overlay
- [ ] Create `OrderArrowLayer.ts`: attack/move/reposition arrows
- [ ] Create `panels/OrderQueuePanel.ts`
- [ ] Verify: all order types can be staged via right-click, previews are accurate

### Phase 6: Attack Odds and Combat Estimate (Week 8)
*Goal: Player can assess attacks before committing*

- [ ] Add IPC handler: `query-combat-estimate`
- [ ] Create `AttackOddsPreview.ts`: hover tooltip with terrain factors
- [ ] Verify: odds match actual battle resolution within expected variance

### Phase 7: Fog of War (Week 9)
*Goal: Intelligence creates genuine uncertainty*

- [ ] Extend `ReconIntelligence` type with `last_seen_turn` per detected brigade
- [ ] Create `FogOfWarLayer.ts`: three-state visibility overlay
- [ ] Implement ghost counter rendering with decay
- [ ] Implement recon quality gradient
- [ ] Implement `Shift+F` player faction toggle
- [ ] Verify: fog of war correctly reflects recon_intelligence state

### Phase 8: Map Modes (Week 10)
*Goal: F-key switching between 8 information layers*

- [ ] Create `MapModeController.ts`
- [ ] Create `SupplyOverlay.ts` (F3)
- [ ] Create `DisplacementOverlay.ts` (F5)
- [ ] Create `CorpsSectorOverlay.ts` (F8)
- [ ] Add IPC handlers: `query-corps-sectors`, `query-supply-paths`
- [ ] Extend GameStateAdapter for supply and displacement data
- [ ] Verify: each mode shows correct data, modes switch cleanly

### Phase 9: Battle Visualization (Week 11)
*Goal: Battles resolve visually between turns*

- [ ] Extend TurnReport with structured `battle_events[]`
- [ ] Create `BattleMarkerLayer.ts`: persistent battle markers
- [ ] Implement inter-turn battle animation sequence
- [ ] Implement snap event visual indicators
- [ ] Add "Skip" functionality (Space key)
- [ ] Verify: battle animation matches report data

### Phase 10: Command Hierarchy View (Week 12)
*Goal: F8 shows the full C2 picture*

- [ ] Implement chain-of-command overlay (~ key)
- [ ] Add named operation zone rendering
- [ ] Add army/corps panel hierarchy navigation
- [ ] Verify: hierarchy matches OOB data exactly

### Phase 11: Post-Processing and Audio (Week 13)
*Goal: The "premium feel"*

- [ ] Create `postfx/` module: EffectComposer pipeline
- [ ] Implement CRT scanlines, chromatic aberration, vignette
- [ ] Implement bloom for front lines and selected units
- [ ] Create `audio/` module: Web Audio API manager
- [ ] Add ambient loop, UI foley, combat sound effects
- [ ] Verify: post-processing only active in night mode, audio toggleable

### Phase 12: Polish and Integration (Weeks 14-15)
*Goal: Everything works together seamlessly*

- [ ] Extract panel code from MapApp.ts into `panels/` modules
- [ ] Full integration test: 52-week scenario run with all features
- [ ] VCR determinism test: CLI vs. GUI hash comparison
- [ ] Performance profiling: target 60fps on mid-range hardware
- [ ] Accessibility: all hotkeys documented, colorblind-safe palettes
- [ ] War toll counter always visible
- [ ] Settings panel for all preferences (audio, blend, fog of war, etc.)

---

## 21. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Texture generation too slow** (8192x8192 canvas) | Medium | Blocks startup for 2-5 seconds | Generate at 4096x4096 initially, upgrade async. Cache texture in IndexedDB. |
| **WebGL memory pressure** from dual textures + overlays | Medium | Crashes on low-VRAM GPUs | Monitor GL memory. Provide "Low Quality" preset (2048x2048 textures). |
| **Right-click conflicts** with browser context menu | Low | UX friction on web builds | `preventDefault()` on right-click in map area. Electron: no conflict. |
| **IPC round-trip latency** for on-demand queries | Low | Lag on hover tooltips | Cache results client-side. Invalidate on game state change only. |
| **Post-processing performance** on integrated GPUs | Medium | FPS drop below 30 | Make post-processing optional (disabled by default in "Performance" preset). |
| **Audio loading** delays first interaction | Low | Player hears nothing initially | Lazy-load audio on first user interaction (Web Audio API autoplay policy). |
| **Determinism violation** from UI accidentally mutating state | Low but catastrophic | Desync between CLI and GUI runs | All new code is read-only. 52-week VCR test as gate. |
| **Scope creep** -- 15 weeks is aggressive | High | Features cut or quality drops | Prioritize phases 1-6 (terrain + control + formations + orders). Phases 7-12 are "premium" and can ship later. |
| **MapApp.ts complexity** (already 5279 lines) | High | Refactor risk | Phase 12 explicitly extracts panels. New code goes in new modules, not MapApp. |

### Minimum Viable War Map (Phases 1-6)

If only phases 1-6 ship, the player gets:
- Beautiful dual-mode terrain (Topo + Night) with mode switching
- All settlements, roads, rivers, labels
- Faction control, front lines, battle damage
- Formation counters with corps coloring
- Right-click orders with movement range preview
- Attack odds on hover
- Order queue panel

This is already a massive leap from the current prototype. Phases 7-12 are the "premium polish" layer.

---

## Appendix A: Color Palettes

### Day Mode (Tracestrack Topo Inspired)

```
Background:        #c8dce8 (pale blue sky)
Terrain green:     #b8d68a to #d4e8b0
Terrain ochre:     #e8d8a0 to #e8e0a8
Terrain brown:     #c8b8a0 to #d8c8a0
Terrain grey:      #a8a8a8 to #d8d8d8
Water:             #4a90c8 (rivers), #6aa8d8 (streams)
Roads - E:         #c84040 (red-orange)
Roads - M:         #d89830 (orange)
Roads - secondary: #e8d050 (yellow)
Road casing:       #444444 (dark grey)
Labels:            #333333 with #ffffff halo
Borders:           #c040a0 (international, magenta)
Municipalities:    #999999 (grey dashed)
Settlement fill:   #e8e0d8 (light beige)
```

### Night Mode (NATO Ops Center)

```
Background:        #030810 (space black)
Terrain:           9-stop night ramp (existing)
City lights:       #ffa040 (amber radial gradients)
Roads:             #c09030 (amber)
Rivers:            #304880 (dark blue)
Labels:            #88cc88 (phosphor green)
Front lines:       #00d470 (phosphor green) with glow
Formations:        Dark bg with #00d470 borders
Faction - RBiH:    #00b050
Faction - RS:      #c83838
Faction - HRHB:    #3868c0
```

### Faction Colors (Consistent Across Modes)

```
RBiH:  Day rgba(58,122,58,0.35)   Night rgba(0,180,80,0.25)
RS:    Day rgba(160,48,48,0.35)    Night rgba(200,60,60,0.25)
HRHB:  Day rgba(42,74,138,0.35)    Night rgba(60,100,200,0.25)
```

---

## Appendix B: Hotkey Reference

| Key | Action |
|-----|--------|
| N | Toggle Night/Day mode |
| D | Cycle counter data display (strength/cohesion/supply/posture/fatigue) |
| F1-F8 | Map modes (political/terrain/supply/exhaustion/displacement/ethnic/intel/command) |
| 1-0 | Layer toggles |
| ~ | Chain of command overlay |
| P | Front pressure heat map |
| Space | Skip battle animation / Advance turn |
| Shift+F | Cycle player faction view (fog of war) |
| Escape | Deselect / Close panel |
| WASD | Pan camera |
| Scroll | Zoom |
| Left-click | Select formation / settlement |
| Right-click | Context-dependent order (attack/move/reposition) |
| Ctrl+Z | Undo last staged order |

---

## Appendix C: Sources and References

### Games Studied
- Command: Modern Operations (Matrix Games) -- sensor coverage, range rings, merge/declutter
- Unity of Command 2 (2x2 Games) -- movement range outlines, attack odds, single-screen design
- Decisive Campaigns: Barbarossa (VR Designs) -- theatre postures, card-based allocation, commander friction
- Gary Grigsby's War in the East 2 (2by3 Games) -- corps color coding, counter data modes, chain-of-command overlay
- Hearts of Iron IV (Paradox Interactive) -- battle plan arrows, F-key map modes, front line drawing
- Strategic Command WWII (Fury Software) -- attack odds preview, supply mismatch display
- Armored Brigade (Veitikka Studios) -- terrain LOS, SOP behavior system, command delay
- Shadow Empire (VR Designs) -- stratagem cards, logistic network preview, formation postures

### Military Standards and Systems
- NATO APP-6E (2023) -- Joint Military Symbology
- MIL-STD-2525E (2023) -- Common Warfighting Symbology
- milsymbol.js library (spatialillusions.com) -- client-side APP-6 symbol generation
- CPOF (Command Post of the Future, General Dynamics) -- liquid information, composable workspaces
- TIGR (Tactical Ground Reporting System) -- layer-based operational picture
- JCOP (Joint Common Operational Picture) -- multi-source COP aggregation
- Ecological Interface Design for Military C2 (ResearchGate, 2014)

### Map Style Reference
- OpenStreetMap Tracestrack Topo layer (`&layers=P`) -- observed at zoom 8, 11, 13 over BiH
- CyclOSM -- hillshade rendering, cased road styling
