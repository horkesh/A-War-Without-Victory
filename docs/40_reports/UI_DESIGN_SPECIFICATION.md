# UI Design Specification — Command HQ Interface
**Project:** A War Without Victory
**Version:** v1.0
**Date:** 2026-02-02
**Status:** Design Specification (Ready for Implementation)

---

## 1. Overview and Design Philosophy

### 1.1 Purpose

This document specifies the complete user interface design for "A War Without Victory" (AWWV), a strategic-level simulation of the 1992-1995 Bosnian War. The interface uses a **command headquarters (HQ) metaphor** where the player represents political leadership (RBiH/RS/HRHB), not tactical field command.

### 1.2 Design Principles

**Core Tenets:**
1. **Strategic Command Level**: Player is political leadership; the army is a tool subject to command friction
2. **Uncertainty as Design**: Information is delayed, incomplete, and uncertain (fog of war via newspapers/reports)
3. **Negative-Sum Framing**: War is destructive; UI reinforces costs via desperation indicators
4. **Settlement-Level Granularity**: Political control exists at settlement level, not municipality level
5. **Period Authenticity**: 1990s technology only (paper maps, telephones, radio—no modern digital C2)
6. **NATO Tactical Aesthetic**: Cold War-era military cartography with precise symbology and utilitarian design

### 1.3 Visual Reference Points

**Primary Influences:**
- **Cold War NATO Tactical Maps**: Standardized military symbology, hatching patterns, grease pencil annotations
- **1995 US Joint Chiefs Planning Maps**: Topographic base, colored zone fills, phase lines, unit symbols
- **Historical BiH War Command Centers**: Concrete walls, modest Eastern European administrative offices converted for wartime use

**Visual Evidence**: See attached Sora-generated reference images:
- Image 1: NATO tactical map with colored hatching (red diagonal, blue horizontal, green polka-dot)
- Image 2: Operational planning map with topographic base, unit symbols, phase lines
- Image 3: Command room with concrete walls, utilitarian desk, period-accurate props

---

## 2. Interface Structure and Layout

### 2.1 Overall Composition (2D Implementation)

**Viewing Perspective:** **Cinematic overhead 45-degree angled view**. Camera is positioned as if viewer is standing approximately 2 meters from the desk, looking down at both the desk and the wall map behind it. The desk faces the camera at a 45-degree angle, creating dynamic depth and immersion.

**Camera Specifications:**
- **Angle**: 35-degree downward tilt from eye level (overhead but not top-down)
- **Position**: Standing 2 meters from desk front edge
- **Desk orientation**: Heavy wooden desk faces camera at 45-degree angle
- **Field of view**: Captures both desk foreground and wall map background in single unified view
- **Depth of field**: Desk items in sharp focus (foreground), wall map slightly softer but fully readable (background)
- **Color grading**: Desaturated with slight blue-grey cast suggesting overcast daylight through unseen window
- **Rendering style**: Photorealistic with period-accurate details (1990s Eastern European war room)

**Screen Division:**
```
┌─────────────────────────────────────────────────────────┐
│                     WALL SECTION (60%)                  │
│                   (background, soft focus)              │
│                                                         │
│   ┌───────────────────────────────────────────┐        │
│   │         [CREST]                           │        │
│   │      BOSNIA AND HERZEGOVINA               │  ┌────┐│
│   │      Tactical Situation Map               │  │CLK ││
│   │   [NATO-style control zones]              │  │    ││
│   │   [Topographic base layer]                │  │W23 ││
│   │                                           │  │Jun ││
│   └───────────────────────────────────────────┘  └────┘│
│                                                         │
├─────────────────────────────────────────────────────────┤
│                   DESK SECTION (40%)                    │
│              (foreground, sharp focus)                  │
│        [desk at 45° angle to camera]                    │
│                                                         │
│    [Phone]  [Headgear] [Newspaper]  [Magazine]         │
│          [Reports]  [Ashtray] [Coffee]  [Radio]        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Aspect Ratio**: 16:9 (1920x1080 native, scales to 2560x1440 and 3840x2160)

**Perspective Details:**
- **Desk**: Heavy wooden socialist-era desk facing camera at 45-degree angle, fills foreground (40% of frame)
- **Wall/Map**: Background element (60% of frame), visible above and behind desk
- **Depth**: Strong perspective with desk edge closest to camera largest, receding toward wall
- **3D illusion**: 2D image rendered with cinematic depth-of-field for immersive effect
- **Angle benefits**: Desk surface fully visible, wall map clearly readable, creates sense of physical presence in command room

### 2.2 Wall Section (Primary Map Interface)

**Dimensions**: 70% of screen height, full width (minus margins)

**Visual Elements:**
- **Map Frame**: Metal/wood frame with corner clips (tactical map holder)
- **Map Surface**: Topographic base layer with overlaid tactical situation
- **National Crest**: Faction coat of arms centered above map (see §2.2.1) — **clickable** for Faction Overview
- **Classification Markings**: "TOP SECRET" (red stamp, upper left), "SECRET NOFORN" (red stamp, lower right)
- **Grid Coordinates**: UTM grid reference numbers along edges (small, black text)
- **Wall Calendar**: Monthly calendar mounted to right of map showing current week — **clickable** to advance turn (see §2.2.3)

#### 2.2.3 Wall Calendar (Turn Advancement)

**Purpose**: Primary turn advancement mechanism. Clicking the calendar processes the current turn and advances game state to the next turn. Calendar explicitly shows weekly structure (1 turn = 1 week).

**Visual Design**:
- **Style**: Monthly tear-off calendar (1990s Eastern European office style)
- **Position**: Upper right of wall, mounted adjacent to map frame
- **Size**: 200×280px (vertical orientation)
- **Layout**: 7 columns (Mon-Sun) × 5-6 rows grid
- **Content**: Month name + year at top, current week highlighted with red marker
- **Hover state**: Red outline (3px) appears around calendar, cursor changes to pointer

**Turn Advancement Flow**:

1. **Player clicks calendar** → Red outline appears briefly (200ms click animation)
2. **Confirmation modal appears** (optional, can be disabled in settings):
   ```
   ┌─────────────────────────────────────────┐
   │  ADVANCE TO NEXT TURN?                  │
   │                                         │
   │  Current: Week 23, June 1992            │
   │  Next: Week 24, June 1992               │
   │                                         │
   │  [Cancel]               [Advance Turn]  │
   └─────────────────────────────────────────┘
   ```
3. **Turn processing** (with loading indicator):
   - Calendar "page tear" animation (visual feedback)
   - "Processing Turn..." text appears below calendar
   - Game engine executes turn pipeline (see Phase A Invariants)
4. **Turn complete**:
   - Calendar updates with new week highlighted
   - If month advances: new month name + year rendered
   - Map updates with new control state
   - Desperation assets update if state changed
   - Newspaper appears (new turn's events available)

**Implementation**:
```typescript
function onCalendarClick() {
  if (gameState.turnInProgress) return; // Prevent double-click

  // Optional confirmation
  if (settings.confirmTurnAdvancement) {
    const confirmed = await showConfirmationModal({
      title: "Advance to Next Turn?",
      current: `Week ${gameState.turn}`,
      next: `Week ${gameState.turn + 1}`
    });
    if (!confirmed) return;
  }

  // Animate calendar page tear
  animateCalendarTear();
  await processTurn(gameState);

  // Update UI
  renderCalendar(gameState.turn); // Re-render calendar with new week
  updateMapVisualization(gameState);
  updateDesperationAssets(gameState);
  refreshNewspaper(gameState);
}
```

**Keyboard Shortcut**: `SPACE` or `ENTER` also advances turn (when no modal is open)

#### 2.2.1 National Crests (Above Map)

**Purpose**: Identifies which faction's HQ the player occupies

**Specifications:**
- **Position**: Centered above map, 50-80px above top frame edge
- **Size**: 120x140px (approximately), maintains aspect ratio
- **Style**: Official coat of arms/emblem in full color on wall plaque or shield

**Faction Crests:**

| Faction | Crest Description | Historical Basis |
|---------|-------------------|------------------|
| **RBiH** | Coat of Arms of Republic of Bosnia and Herzegovina (1992-1998): White shield with six golden fleur-de-lis arranged in diagonal band, blue background | Official state symbol, represents multiethnic Bosnia |
| **RS** | Coat of Arms of Republika Srpska: Serbian cross with four C's (Cyrillic "С"), red/blue/white tricolor shield, double-headed eagle | Adopted 1992, based on Serbian royal heraldry |
| **HRHB** | Coat of Arms of Croatian Republic of Herzeg-Bosnia: Red-white checkerboard (šahovnica), golden crown above, blue background | Based on Croatian coat of arms, used 1992-1994 |

**Asset Files** (sprite overlays):
- `assets/crests/rbih_crest.png` (transparent background, 512x512 source)
- `assets/crests/rs_crest.png` (transparent background, 512x512 source)
- `assets/crests/hrhb_crest.png` (transparent background, 512x512 source)

**Implementation Note**: Crests are rendered as sprite overlays positioned above the wall map on the unified HQ background. The crest sprite is swapped based on player faction selection.

**Interactivity**: The crest is **clickable** — hovering shows red outline, clicking opens the Faction Overview Panel (see §2.2.2 below).

#### 2.2.2 Faction Overview Panel (Accessed via Crest Click)

**Purpose**: Strategic dashboard providing high-level faction status at a glance. Accessed by clicking the national crest above the map.

**Visual Design**: Semi-transparent overlay panel (80% opacity dark grey background `rgba(40, 40, 40, 0.8)`) appearing centered over the map area.

**Panel Dimensions**: 800×600px, centered on screen

**Content Sections:**

**1. Header** (Top 15%):
- **Faction name**: Large bold text (e.g., "REPUBLIC OF BOSNIA AND HERZEGOVINA")
- **National crest**: Small version (60×70px) aligned left
- **Current turn**: "Week 23, June 1992" aligned right
- **Close button**: Red [X] in top-right corner

**2. Strategic Snapshot** (60% of panel, divided into 4 quadrants):

| Quadrant | Content | Visual Treatment |
|----------|---------|------------------|
| **Top-Left: Territory** | - Settlements controlled: 523 / 1,000<br>- % of BiH territory: 52.3%<br>- Change this turn: +3 settlements | Progress bar (green), ▲ or ▼ indicator |
| **Top-Right: Military Strength** | - Armed Forces: 145,000 personnel<br>- Combat exhaustion: 45% (Medium)<br>- Supply status: Adequate (7 days) | Color-coded status (green/yellow/red) |
| **Bottom-Left: Authority** | - Central authority: 0.68 (Contested)<br>- Fragmented municipalities: 12<br>- Organizational penetration: 42% | Authority gauge (circular) |
| **Bottom-Right: Population** | - Population under control: 2.1M<br>- Displaced this turn: 15,000<br>- Total displaced: 380,000 | Bar chart, orange warning colors |

**3. Strategic Warnings** (Bottom 25%):
- **Critical alerts**: Up to 3 most urgent issues displayed with red warning icons
  - Example: "⚠ Brčko Corridor at risk — VRS forces 5km away"
  - Example: "⚠ Exhaustion critical in 1st Corps — recommend defensive posture"
  - Example: "⚠ Supply corridor to Goražde severed — 25K civilians at risk"

**Interaction**:
- **Click anywhere outside panel**: Close panel
- **ESC key**: Close panel
- **Click close button [X]**: Close panel

**Implementation**:
```typescript
function openFactionOverviewPanel(faction: FactionId) {
  const panel = createOverlayPanel({
    title: getFactionFullName(faction),
    crest: `assets/crests/${faction}_crest.png`,
    data: generateFactionSnapshot(gameState, faction),
    warnings: getStrategicWarnings(gameState, faction, 3)
  });

  displayModal(panel);
}

interface FactionSnapshot {
  territory: {
    settlementsControlled: number;
    settlementsTotal: number;
    territoryPercent: number;
    changeThisTurn: number;
  };
  military: {
    personnel: number;
    exhaustion: number; // 0-100
    supplyDays: number;
  };
  authority: {
    centralAuthority: number; // 0-1
    fragmentedMunicipalities: number;
    organizationalPenetration: number; // 0-100
  };
  population: {
    underControl: number;
    displacedThisTurn: number;
    totalDisplaced: number;
  };
}
```

**Map States:**
- **Level 0 (Default)**: Strategic overview of entire BiH
- **Level 1 (Operational)**: Theater zoom (corps-level detail)
- **Level 2 (Tactical)**: Brigade AoRs and settlement-level control
- **Level 3 (Inspection)**: Info panel overlay, not further zoom

### 2.3 Desk Section (Interactive Objects)

**Dimensions**: 30% of screen height, full width

**Desk Surface**: Heavy wooden socialist-era desk (1970s), viewed from slightly above (~10-15° downward angle showing desk surface in foreground)

**Important**: The base HQ background image (wall + desk surface) is identical for all three factions. Faction identity is conveyed through **sprite overlays only**:
- National crest above map (3 variants: RBiH, RS, HRHB)
- Military headgear on desk (3 variants: green beret, šajkača, peaked cap)
- Ashtray states (4 desperation variants, rendered as sprites)
- Coffee cup states (4 desperation variants, rendered as sprites)

This design simplifies asset creation (1 base HQ image + sprite sheets) and reduces storage requirements.

**Wall Interactive Elements:**

| Object | Position | Dimensions (approx) | Hover State | Click Action | Implementation |
|--------|----------|---------------------|-------------|--------------|----------------|
| **National Crest** | Above map (center) | 120x140px | **Red outline** (3px) | Open Faction Overview Panel (see §2.2.2) | **Sprite overlay** (3 faction variants) |
| **Wall Calendar** | Upper right of wall | 200x280px | **Red outline** (3px) | **Advance Turn** — processes turn, updates game state | Calendar frame (base HQ) + dynamic content (engine) |
| **Wall Map** | Center wall | ~1200x800px | **Red outline** (3px) on frame edges | Zoom into map, toggle overlays, inspect settlements | Dynamically rendered, clickable regions |

**Desk Interactive Objects** (left to right):

| Object | Position | Dimensions (approx) | Hover State | Click Action | Implementation |
|--------|----------|---------------------|-------------|--------------|----------------|
| **Red Telephone** | Far left | 120x100px | **Red outline** (3px) | Open Diplomacy Panel (Phase D+) | Part of base HQ image + clickable region |
| **Military Headgear** | Left (on desk edge) | 100x120px | Non-interactive | Faction identification prop (see §2.3.1) | **Sprite overlay** (3 faction variants) |
| **Newspaper (Current)** | Left-center | 180x120px | **Red outline** (3px) + tooltip | Open newspaper overlay (Turn N-1 events) | Part of base HQ image + clickable region |
| **Newspaper (Old)** | Behind current | 180x120px (partial) | **Red outline** (2px, dimmer) | Open previous newspaper (Turn N-2) | Part of base HQ image + clickable region |
| **Monthly Magazine** | Center | 140x180px (vertical) | **Red outline** (3px) + tooltip | Open magazine overlay (monthly statistics) | Part of base HQ image + clickable region |
| **Situation Reports** | Right-center | 160x200px (stack) | **Red outline** (3px) + tooltip | Open reports sidebar (typed field reports) | Part of base HQ image + clickable region |
| **Transistor Radio** | Far right | 100x80px | **Red outline** (3px) | Open international news ticker (Phase D+) | Part of base HQ image + clickable region |
| **Ashtray** | Center-right | 80x80px | Non-interactive | Visual desperation indicator | **Sprite overlay** (4 desperation variants) |
| **Coffee Cup** | Right edge | 60x80px | Non-interactive | Visual desperation indicator | **Sprite overlay** (4 desperation variants) |

**Hover System Notes:**
- **Red outline** (`rgb(200, 20, 20)`, 3px solid) indicates clickable/interactive objects
- Applied to both baked-in elements (via HTML region mapping) and sprite overlays (via CSS on sprite container)
- Cursor changes to pointer on hover
- Tooltip appears after 0.5s hover (for newspapers, magazine, reports)

#### 2.3.1 Military Headgear (Faction Identification)

**Purpose**: Reinforces which faction's HQ the player occupies; adds period authenticity

**Position**: Resting on desk edge (left side) or hanging on wall hook near desk

**Faction Headgear:**

| Faction | Headgear Type | Description | Historical Basis |
|---------|---------------|-------------|------------------|
| **RBiH (ARBiH)** | Green Beret | Dark green beret with golden ARBiH badge (lily symbol), worn by Bosnian government forces | Official ARBiH headgear, "Zelene beretke" (Green Berets) |
| **RS (VRS)** | Field Cap (Šajkača) | Blue-grey Serbian field cap with red star or tricolor cockade, traditional Šajkača style | Traditional Serbian military cap, widely used by VRS |
| **HRHB (HVO)** | Peaked Cap | Blue-grey peaked officer's cap with Croatian checkerboard badge (šahovnica) | HVO officer headgear, similar to Croatian Army style |

**Visual Details:**
- **Condition**: Clean, well-maintained (stable state) → worn, faded (desperate state)
- **Placement**: Neatly placed (stable) → carelessly tossed (desperate)
- **Badge/Insignia**: Visible faction emblem on front of headgear

**Asset Files** (sprite overlays):
- `assets/props/headgear_rbih_stable.png` (green beret, neatly placed)
- `assets/props/headgear_rbih_desperate.png` (green beret, tossed carelessly)
- `assets/props/headgear_rs_stable.png` (šajkača, neatly placed)
- `assets/props/headgear_rs_desperate.png` (šajkača, carelessly positioned)
- `assets/props/headgear_hrhb_stable.png` (peaked cap, neatly placed)
- `assets/props/headgear_hrhb_desperate.png` (peaked cap, tossed carelessly)

**Implementation Note**: Headgear sprites are rendered as overlays on the unified HQ background. The sprite is selected based on player faction (RBiH/RS/HRHB) and desperation state (stable vs desperate). Intermediate states (strained, critical) use stable headgear variant.

**Desperation Indicators** (see §4 for details):
- Papers scattered across desk surface
- Multiple coffee cups (desperate state)
- Spilled coffee stains
- Cigarette butts on desk (overflow from ashtray)

---

## 3. Map Visualization System

### 3.1 Design Language: NATO Tactical Cartography

**Visual Style:**
- **Base Layer**: Topographic map (1:500,000 scale aesthetic)
  - Brown contour lines (elevation)
  - Green shading for forests/vegetation
  - Blue for water bodies (rivers, lakes)
  - Grey for built-up areas (cities)
  - Beige/tan background (land)
- **Control Zones**: Clean, readable fills
  - **Solid color fill** for consolidated control (clear ownership)
  - **Crosshatch pattern** for contested/uncertain areas (visual ambiguity indicator)
- **Typography**: Stencil-style sans-serif capitals for city names
- **Symbology**: NATO APP-6A standard military symbols (simplified)

### 3.2 Faction Color Scheme

**Control Zone Colors** (muted, tactical palette):

| Faction | Primary Color | RGB | Fill Style | Semantic |
|---------|---------------|-----|------------|----------|
| **RS (Republika Srpska)** | Crimson Red | `rgb(180, 50, 50)` | Solid fill (consolidated areas) | Enemy (from RBiH perspective) |
| **RBiH (Bosnia-Herzegovina)** | Forest Green | `rgb(70, 120, 80)` | Solid fill (consolidated areas) | Friendly (default player) |
| **HRHB (Herzeg-Bosnia)** | Steel Blue | `rgb(60, 100, 140)` | Solid fill (consolidated areas) | Allied (strained relationship) |
| **Contested Areas** | Crosshatch pattern | Faction color | Diagonal crosshatch in faction color | Control unclear/disputed |
| **Ungoverned** | Light grey | `rgb(200, 200, 200)` | Solid fill or no fill | Null control |

**Visual Treatment by Authority State:**
- **Consolidated**: 75% opacity solid color fill (clear, stable control)
- **Contested**: 60% opacity crosshatch pattern (visual uncertainty indicator)
- **Fragmented**: 35% opacity solid color fill (collapsing/weak control)

**Design Rationale**: Solid fills for stable control zones provide clean, readable maps matching NATO tactical map aesthetic. Crosshatch patterns reserved exclusively for contested/uncertain areas create immediate visual distinction that communicates control ambiguity to the player.

### 3.3 Map Layer Hierarchy (Bottom to Top)

**Layer Stack:**

1. **Topographic Base** (static, pre-rendered)
   - Elevation contours from DEM data
   - Rivers (from OSM waterways)
   - Major roads (from OSM roads, highways only)
   - Coastline, borders

2. **Control Zones** (dynamic, updated each turn)
   - Settlement-level political control polygons
   - Faction colors with hatching patterns
   - Opacity varies by authority state

3. **Military Units** (dynamic, Phase II only)
   - NATO symbols for brigades (APP-6A simplified)
   - Size indicator: II = battalion, III = regiment, X = brigade
   - Unit IDs in boxes (e.g., "1BCT", "3BR")

4. **Frontlines** (dynamic, Phase II only)
   - Thick black dashed lines (3px weight)
   - Only where settlement-level control meets opposing faction
   - Arrows for offensive pressure direction

5. **Supply Corridors** (dynamic, Phase D+)
   - Color-coded by status:
     - **Open**: Green dashed line
     - **Brittle**: Yellow dashed line
     - **Cut**: Red X marks

6. **Strategic Features** (static/semi-static)
   - City icons: Black circles, size by population
   - City labels: Stencil font, black text
   - Phase lines: Yellow highlighted routes (e.g., "PHASE LINE BRAVO")

7. **Annotations** (dynamic, player-created in future)
   - Grease pencil marks (red/blue/green)
   - Handwritten notes
   - Measurement arrows

### 3.4 Settlement-Level Rendering

**Problem**: ~1000 settlements with individual control states = potential performance bottleneck

**Solution**: Dynamic Level-of-Detail (LOD)

**LOD System:**

| Zoom Level | Aggregation | Render Method | Performance |
|------------|-------------|---------------|-------------|
| **L0 (Strategic)** | Municipality-grouped clusters | Pre-computed control zone polygons | ~50 polygons |
| **L1 (Operational)** | Sub-municipality clusters | Dynamic clustering by control state | ~200 polygons |
| **L2 (Tactical)** | Individual settlements visible | Full settlement polygons rendered | ~1000 polygons |
| **L3 (Inspection)** | Info panel, no additional render | Sidebar overlay | No change |

**Clustering Algorithm**:
```typescript
function clusterSettlements(settlements: Settlement[], zoomLevel: number): Polygon[] {
  if (zoomLevel === 0) {
    // Group by municipality + controlling faction
    return groupByMunicipality(settlements).map(group => {
      const faction = getMajorityController(group);
      return mergePolygons(group.map(s => s.geometry), faction);
    });
  } else if (zoomLevel === 1) {
    // Group by control state adjacency (connected same-faction settlements)
    return groupByAdjacency(settlements).map(group => {
      return mergePolygons(group.map(s => s.geometry), group[0].controller);
    });
  } else {
    // Render all settlements individually
    return settlements.map(s => ({
      geometry: s.geometry,
      controller: s.controller,
      authority: s.authority
    }));
  }
}
```

### 3.5 Hatching Pattern Implementation

**SVG Pattern Definitions**:
```svg
<defs>
  <!-- RS: Diagonal hatching (red) -->
  <pattern id="hatch-rs" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="8" stroke="rgb(180,50,50)" stroke-width="1.5"/>
  </pattern>

  <!-- RBiH: Horizontal lines (green) -->
  <pattern id="hatch-rbih" width="8" height="8" patternUnits="userSpaceOnUse">
    <line x1="0" y1="4" x2="8" y2="4" stroke="rgb(70,120,80)" stroke-width="1.5"/>
  </pattern>

  <!-- HRHB: Polka dots (blue) -->
  <pattern id="hatch-hrhb" width="10" height="10" patternUnits="userSpaceOnUse">
    <circle cx="5" cy="5" r="2" fill="rgb(60,100,140)"/>
  </pattern>

  <!-- Contested: Crosshatch -->
  <pattern id="hatch-contested" width="8" height="8" patternUnits="userSpaceOnUse">
    <line x1="0" y1="0" x2="8" y2="8" stroke="rgb(100,100,100)" stroke-width="1"/>
    <line x1="8" y1="0" x2="0" y2="8" stroke="rgb(100,100,100)" stroke-width="1"/>
  </pattern>
</defs>

<!-- Usage -->
<path d="..." fill="url(#hatch-rs)" opacity="0.85"/>
```

**Canvas Alternative** (for performance):
```typescript
function drawHatchedZone(ctx: CanvasRenderingContext2D, polygon: Polygon, faction: Faction) {
  ctx.save();

  // Clip to polygon
  ctx.beginPath();
  polygon.coordinates.forEach((coord, i) => {
    if (i === 0) ctx.moveTo(coord.x, coord.y);
    else ctx.lineTo(coord.x, coord.y);
  });
  ctx.closePath();
  ctx.clip();

  // Draw hatching pattern
  const pattern = getHatchPattern(faction); // Returns canvas pattern
  ctx.fillStyle = pattern;
  ctx.fill();

  // Draw border
  ctx.strokeStyle = 'rgb(40, 40, 40)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}
```

### 3.6 NATO Military Symbology

**APP-6A Simplified Symbols** (Phase II only):

**Brigade Symbol Structure**:
```
┌─────────────┐
│   Faction   │  ← Affiliation (Red=Enemy, Green=Friendly, Blue=Allied)
│   ┌─────┐   │
│   │  X  │   │  ← Size indicator (X=Brigade, III=Regiment, II=Battalion)
│   └─────┘   │
│    1BCT     │  ← Unit designation
└─────────────┘
```

**SVG Implementation**:
```svg
<g id="brigade-symbol-rbih">
  <!-- Green rectangle (friendly, RBiH) -->
  <rect x="0" y="0" width="60" height="40" fill="rgb(70,120,80)" stroke="black" stroke-width="2"/>

  <!-- Size indicator box -->
  <rect x="15" y="10" width="30" height="20" fill="white" stroke="black" stroke-width="1.5"/>

  <!-- X for brigade -->
  <text x="30" y="25" font-family="Arial" font-size="16" font-weight="bold" text-anchor="middle">X</text>

  <!-- Unit ID -->
  <text x="30" y="55" font-family="Stencil" font-size="12" text-anchor="middle">1BCT</text>
</g>
```

**Symbol States**:
- **Normal**: Full opacity, black outline
- **Depleted**: 50% opacity, dashed outline
- **Destroyed**: Grey fill, X overlay

### 3.7 Dynamic Wall Map Rendering

**Purpose**: The wall map in the HQ scene must display **live game state**, not a static image. It updates automatically when turns advance to show current control zones, frontlines, and tactical situation.

**Implementation Strategy**: Canvas-to-Image Pipeline (In-Memory Only)

#### 3.7.1 Rendering Pipeline

**How It Works**:
1. **Turn End**: After each turn completes, render current game state to off-screen Canvas
2. **Export Image**: Convert Canvas to WebP data URL (compressed, ~300KB)
3. **Display**: Set wall map element `background-image` to data URL
4. **On Click**: Transition to interactive SVG/Canvas map for zoom/pan

**Advantages**:
- Wall map automatically updates with game state
- Zero performance cost (static image until user clicks)
- Can apply paper texture and desperation annotations
- Not serialized in save files (re-rendered on load)

#### 3.7.2 Off-Screen Map Renderer

```typescript
class WallMapRenderer {
  private offscreenCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private topographicBase: HTMLImageElement;

  constructor() {
    // Create hidden canvas for rendering
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 1800;  // High-res for wall display
    this.offscreenCanvas.height = 1200;
    this.ctx = this.offscreenCanvas.getContext('2d')!;

    // Load topographic base layer
    this.topographicBase = new Image();
    this.topographicBase.src = '/assets/map/topographic_base.png';
  }

  /**
   * Render current game state to static image
   * Called at end of each turn
   */
  renderCurrentState(gameState: GameState, desperation: DesperationMetrics): string {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);

    // 1. Draw topographic base layer
    this.ctx.drawImage(this.topographicBase, 0, 0, 1800, 1200);

    // 2. Draw control zones (simplified for strategic view)
    this.drawControlZones(gameState);

    // 3. Draw major frontlines (if Phase II active)
    if (gameState.meta.phase === 'phase_II') {
      this.drawFrontlines(gameState);
    }

    // 4. Draw major cities
    this.drawCities();

    // 5. Draw faction unit symbols (Phase II only)
    if (gameState.meta.phase === 'phase_II') {
      this.drawUnitSymbols(gameState);
    }

    // 6. Apply desperation annotations (critical/desperate only)
    if (desperation.level === 'critical' || desperation.level === 'desperate') {
      this.drawDesperationAnnotations(desperation);
    }

    // 7. Apply paper texture and tactical map styling
    this.applyTacticalMapFilter();

    // 8. Convert to WebP data URL (90% quality)
    return this.offscreenCanvas.toDataURL('image/webp', 0.9);
  }

  private drawControlZones(gameState: GameState) {
    // Group settlements by controlling faction for performance
    const zones = this.clusterSettlementsByControl(gameState.settlements);

    zones.forEach(zone => {
      // Get faction color and hatching pattern
      const pattern = this.getZoneFillPattern(zone.controller);
      const opacity = this.getAuthorityOpacity(zone.authority);

      // Draw zone polygon
      this.ctx.fillStyle = pattern;
      this.ctx.globalAlpha = opacity;

      this.ctx.beginPath();
      zone.geometry.coordinates.forEach((coord, i) => {
        if (i === 0) this.ctx.moveTo(coord.x, coord.y);
        else this.ctx.lineTo(coord.x, coord.y);
      });
      this.ctx.closePath();
      this.ctx.fill();

      // Draw border
      this.ctx.strokeStyle = 'rgb(40, 40, 40)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    });

    this.ctx.globalAlpha = 1.0; // Reset
  }

  private getZoneFillPattern(faction: Faction): CanvasPattern {
    // Create hatching patterns for each faction
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 10;
    patternCanvas.height = 10;
    const pCtx = patternCanvas.getContext('2d')!;

    switch(faction.id) {
      case 'RBiH':
        // Green horizontal lines
        pCtx.strokeStyle = 'rgb(70, 120, 80)';
        pCtx.lineWidth = 1.5;
        pCtx.beginPath();
        pCtx.moveTo(0, 5);
        pCtx.lineTo(10, 5);
        pCtx.stroke();
        break;

      case 'RS':
        // Red diagonal lines
        pCtx.strokeStyle = 'rgb(180, 50, 50)';
        pCtx.lineWidth = 1.5;
        pCtx.save();
        pCtx.translate(5, 5);
        pCtx.rotate(Math.PI / 4); // 45 degrees
        pCtx.beginPath();
        pCtx.moveTo(0, -7);
        pCtx.lineTo(0, 7);
        pCtx.stroke();
        pCtx.restore();
        break;

      case 'HRHB':
        // Blue polka dots
        pCtx.fillStyle = 'rgb(60, 100, 140)';
        pCtx.beginPath();
        pCtx.arc(5, 5, 2, 0, Math.PI * 2);
        pCtx.fill();
        break;
    }

    return this.ctx.createPattern(patternCanvas, 'repeat')!;
  }

  private getAuthorityOpacity(authority: AuthorityState): number {
    switch(authority) {
      case 'Consolidated': return 0.85;
      case 'Contested': return 0.60;
      case 'Fragmented': return 0.40;
      default: return 0.70;
    }
  }

  private drawFrontlines(gameState: GameState) {
    // Identify settlements where control meets opposing faction
    const frontlineSegments = this.detectFrontlineSegments(gameState);

    this.ctx.strokeStyle = 'rgb(0, 0, 0)';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([10, 5]); // Dashed line

    frontlineSegments.forEach(segment => {
      this.ctx.beginPath();
      this.ctx.moveTo(segment.start.x, segment.start.y);
      this.ctx.lineTo(segment.end.x, segment.end.y);
      this.ctx.stroke();
    });

    this.ctx.setLineDash([]); // Reset
  }

  private drawCities() {
    const majorCities = [
      {name: 'Sarajevo', x: 900, y: 700},
      {name: 'Banja Luka', x: 550, y: 350},
      {name: 'Mostar', x: 850, y: 950},
      {name: 'Tuzla', x: 1100, y: 450},
      {name: 'Zenica', x: 800, y: 550},
      {name: 'Bihać', x: 400, y: 500}
    ];

    this.ctx.fillStyle = 'rgb(0, 0, 0)';
    this.ctx.font = 'bold 16px Arial, sans-serif';
    this.ctx.textAlign = 'center';

    majorCities.forEach(city => {
      // Draw city circle
      this.ctx.beginPath();
      this.ctx.arc(city.x, city.y, 8, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw city label
      this.ctx.fillText(city.name.toUpperCase(), city.x, city.y - 15);
    });
  }

  private drawDesperationAnnotations(desperation: DesperationMetrics) {
    // Draw random grease pencil marks for critical/desperate states
    this.ctx.strokeStyle = 'rgba(200, 50, 50, 0.6)'; // Red grease pencil
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';

    const markCount = desperation.level === 'desperate' ? 15 : 8;

    for (let i = 0; i < markCount; i++) {
      this.drawRandomGreaseMark();
    }

    // Add pushpin marks (small circles)
    this.ctx.fillStyle = 'rgba(180, 50, 50, 0.8)';
    const pinCount = desperation.level === 'desperate' ? 20 : 10;

    for (let i = 0; i < pinCount; i++) {
      const x = Math.random() * this.offscreenCanvas.width;
      const y = Math.random() * this.offscreenCanvas.height;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawRandomGreaseMark() {
    const x = Math.random() * this.offscreenCanvas.width;
    const y = Math.random() * this.offscreenCanvas.height;
    const length = 30 + Math.random() * 50;
    const angle = Math.random() * Math.PI * 2;

    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(
      x + length * Math.cos(angle),
      y + length * Math.sin(angle)
    );
    this.ctx.stroke();
  }

  private applyTacticalMapFilter() {
    // Apply beige paper tint
    this.ctx.globalCompositeOperation = 'multiply';
    this.ctx.fillStyle = 'rgba(245, 235, 215, 0.3)';
    this.ctx.fillRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    this.ctx.globalCompositeOperation = 'source-over';

    // Add subtle paper grain
    this.addPaperGrain();
  }

  private addPaperGrain() {
    const imageData = this.ctx.getImageData(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    const data = imageData.data;

    // Add subtle noise for paper texture
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 10;
      data[i] += noise;     // R
      data[i + 1] += noise; // G
      data[i + 2] += noise; // B
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private clusterSettlementsByControl(settlements: Settlement[]): ControlZone[] {
    // Group adjacent settlements with same controller
    // Returns merged polygons for performance
    // Implementation details omitted for brevity
    return [];
  }

  private detectFrontlineSegments(gameState: GameState): LineSegment[] {
    // Detect where settlement control meets opposing faction
    // Returns line segments for frontline rendering
    // Implementation details omitted for brevity
    return [];
  }
}
```

#### 3.7.3 Turn End Update Hook

```typescript
class GameController {
  private wallMapRenderer: WallMapRenderer;
  private wallMapCache: WallMapCache;
  private currentWallMapImage: string;

  constructor() {
    this.wallMapRenderer = new WallMapRenderer();
    this.wallMapCache = new WallMapCache();
    this.currentWallMapImage = '';
  }

  /**
   * Called after each turn is processed
   */
  onTurnComplete(gameState: GameState) {
    // 1. Calculate desperation for current faction
    const desperation = calculateDesperation(gameState, gameState.playerFaction);

    // 2. Check cache (only re-render if control state changed)
    let mapImage = this.wallMapCache.getCachedMap(gameState);

    if (!mapImage) {
      // Render new wall map
      console.log('Rendering new wall map for turn', gameState.meta.turn);
      mapImage = this.wallMapRenderer.renderCurrentState(gameState, desperation);

      // Cache for future use (e.g., when loading saved game at this turn)
      this.wallMapCache.cacheMap(gameState, mapImage);
    } else {
      console.log('Using cached wall map for turn', gameState.meta.turn);
    }

    // 3. Update HQ display
    this.currentWallMapImage = mapImage;
    this.updateHQWallMap(mapImage);
  }

  private updateHQWallMap(imageDataURL: string) {
    const wallMapElement = document.getElementById('wall-map-display');
    if (wallMapElement) {
      wallMapElement.style.backgroundImage = `url(${imageDataURL})`;
    }
  }

  /**
   * Called when loading a saved game
   */
  onGameLoad(gameState: GameState) {
    // Re-render wall map from loaded state (not serialized in save)
    const desperation = calculateDesperation(gameState, gameState.playerFaction);
    const mapImage = this.wallMapRenderer.renderCurrentState(gameState, desperation);
    this.updateHQWallMap(mapImage);
  }
}
```

#### 3.7.4 Caching Strategy

**Purpose**: Avoid re-rendering wall map if control state hasn't changed

```typescript
class WallMapCache {
  private cache: Map<string, string> = new Map();
  private maxCacheSize: number = 10; // Keep last 10 turns

  getCacheKey(gameState: GameState): string {
    // Hash based on control state + turn
    const controlHash = this.hashControlState(gameState);
    return `${gameState.meta.turn}-${controlHash}`;
  }

  getCachedMap(gameState: GameState): string | null {
    const key = this.getCacheKey(gameState);
    return this.cache.get(key) || null;
  }

  cacheMap(gameState: GameState, imageDataURL: string) {
    const key = this.getCacheKey(gameState);
    this.cache.set(key, imageDataURL);

    // Limit cache size (LRU eviction)
    if (this.cache.size > this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  private hashControlState(gameState: GameState): string {
    // Create deterministic hash of settlement control states
    const controlString = gameState.settlements
      .sort((a, b) => a.id.localeCompare(b.id)) // Deterministic order
      .map(s => `${s.id}:${s.controller}`)
      .join('|');

    return this.simpleHash(controlString);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  clear() {
    this.cache.clear();
  }
}
```

#### 3.7.5 Transition to Interactive Map

**User clicks wall map → Zoom to interactive view**

```typescript
function zoomToInteractiveMap() {
  const wallMapContainer = document.getElementById('wall-map-container');
  const interactiveMapContainer = document.getElementById('interactive-map-container');

  // Fade out wall map
  wallMapContainer.style.transition = 'opacity 300ms ease-out';
  wallMapContainer.style.opacity = '0';

  setTimeout(() => {
    // Hide wall map, show interactive map
    wallMapContainer.style.display = 'none';
    interactiveMapContainer.style.display = 'block';
    interactiveMapContainer.style.opacity = '0';

    // Fade in interactive map
    requestAnimationFrame(() => {
      interactiveMapContainer.style.transition = 'opacity 300ms ease-in';
      interactiveMapContainer.style.opacity = '1';
    });

    // Enable interactive controls (zoom, pan, settlement inspection)
    enableMapControls();
  }, 300);
}

function returnToHQView() {
  const wallMapContainer = document.getElementById('wall-map-container');
  const interactiveMapContainer = document.getElementById('interactive-map-container');

  // Reverse transition
  interactiveMapContainer.style.transition = 'opacity 300ms ease-out';
  interactiveMapContainer.style.opacity = '0';

  setTimeout(() => {
    interactiveMapContainer.style.display = 'none';
    wallMapContainer.style.display = 'block';
    wallMapContainer.style.opacity = '0';

    requestAnimationFrame(() => {
      wallMapContainer.style.transition = 'opacity 300ms ease-in';
      wallMapContainer.style.opacity = '1';
    });

    disableMapControls();
  }, 300);
}
```

#### 3.7.6 Performance Characteristics

**Rendering Time**:
- Initial render: ~80-120ms (1800x1200 canvas)
- Cached render: ~1ms (lookup only)
- WebP encoding: ~20-30ms
- Total turn overhead: <150ms (acceptable)

**Memory Usage**:
- Single map image: ~300KB (WebP compressed)
- Cache of 10 images: ~3MB (negligible)
- Off-screen canvas: ~8.6MB (1800×1200×4 bytes, reused)

**Optimization Notes**:
- Settlement clustering reduces polygon count (1000+ → ~50-100 zones)
- Canvas patterns reused (not regenerated per zone)
- Topographic base loaded once at initialization
- Paper grain applied as final pass (not per-element)

#### 3.7.7 Save/Load Integration

**Wall map is NOT serialized** (Option 1: In-Memory Only)

```typescript
interface SaveData {
  gameState: GameState;
  // wallMapImage NOT included - re-rendered on load
}

function saveGame(gameState: GameState): string {
  const saveData: SaveData = {
    gameState: gameState
  };
  return JSON.stringify(saveData);
}

function loadGame(saveJSON: string): GameState {
  const saveData: SaveData = JSON.parse(saveJSON);
  const gameState = saveData.gameState;

  // Re-render wall map from loaded state
  const desperation = calculateDesperation(gameState, gameState.playerFaction);
  const mapImage = wallMapRenderer.renderCurrentState(gameState, desperation);
  updateHQWallMap(mapImage);

  return gameState;
}
```

**Advantages of not serializing**:
- Save files remain small (~500KB vs ~800KB)
- No data staleness (always reflects current state)
- Simpler save/load logic

**Disadvantage**:
- Slight delay on load (80-120ms render time)
- **Acceptable**: User waits for game load anyway, <200ms is imperceptible

---

### 3.8 Map Overlay System

**Purpose**: Provide toggleable information layers on the interactive map to visualize game systems without cluttering the base view.

**Design Philosophy**: Overlays are **opt-in** (default: off) and **phase-appropriate** (only available when the underlying system is active).

#### 3.8.1 Overlay Toggle Controls

**Location**: Top-right corner of interactive map view (appears when zoomed from HQ wall map)

**Visual Design**: Compact checkbox list with category icons

```
┌─────────────────────────────┐
│  MAP OVERLAYS               │
├─────────────────────────────┤
│  ☐ Command Structure        │  Phase II+
│  ☐ Supply Status            │  Phase II+
│  ☐ Exhaustion Heatmap       │  Phase I+
│  ☐ Stability Scores         │  Phase 0+
│  ☐ Displacement Flows       │  Phase I+
│  ☐ Control Strain           │  Phase I+
│  ☐ Organizational Strength  │  Phase 0 only
└─────────────────────────────┘
```

#### 3.8.2 Overlay Definitions

| Overlay Name | Visual Representation | Data Source | Phase Availability |
|--------------|----------------------|-------------|-------------------|
| **Command Structure** | Corps boundaries (dashed), Brigade AoRs (solid borders), NATO unit symbols with strength % | `gameState.corps`, `gameState.brigades`, `gameState.aors` | Phase II+ |
| **Supply Status** | Corridor lines color-coded (Green=Open, Yellow=Brittle, Red=Cut), Supply route arrows | `gameState.corridors`, `gameState.supplyRoutes` | Phase II+ |
| **Exhaustion Heatmap** | Municipality fill colors on gradient (Green=low, Yellow=medium, Red=high exhaustion) | `gameState.municipalities[].exhaustion` | Phase I+ |
| **Stability Scores** | Municipality fill colors on gradient (Green=stable 80-100, Yellow=unstable 40-79, Red=collapse <40) | `gameState.municipalities[].stability_score` | Phase 0+ |
| **Displacement Flows** | Animated arrows showing refugee movement from source to destination municipalities | `gameState.displacementFlows` | Phase I+ |
| **Control Strain** | Municipality fill intensity (darker = higher strain burden) | `gameState.municipalities[].control_strain` | Phase I+ |
| **Organizational Strength** | Municipality fill colors showing Police/TO/Party/Paramilitary penetration heatmap | `gameState.municipalities[].organizational_penetration` | Phase 0 only |

#### 3.8.3 Command Structure Overlay (Detailed Spec)

**Purpose**: Show military command hierarchy and unit deployment (Phase II only)

**Visual Elements**:

1. **Corps Boundaries**
   - Thick dashed lines (4px) in faction color
   - Label: Corps name + HQ location (e.g., "1st Corps (Sarajevo)")
   - Shows which brigades belong to which corps

2. **Brigade Areas of Responsibility (AoRs)**
   - Solid borders (2px) around assigned settlements
   - Brigade NATO symbol at center of AoR
   - Symbol includes:
     - Faction color (Green=RBiH, Red=RS, Blue=HRHB)
     - Size indicator (X=Brigade)
     - Unit designation (e.g., "2nd Bde")
     - Strength percentage badge (e.g., "85%")

3. **Operational Groups (OG) - Special Visualization**
   - **Problem**: OGs are ad-hoc formations, not permanent corps
   - **Solution**: Different visual treatment from corps

   **OG Visual Design**:
   - Dotted boundaries (3px) instead of dashed (distinguishes from corps)
   - OG label with "OG" prefix (e.g., "OG Bihać")
   - Slightly lighter line color (60% opacity vs 100% for corps)
   - No permanent HQ marker (OGs are tactical, temporary)
   - Brigades show dual assignment: "(2nd Bde - OG Bihać)" if temporarily under OG command

4. **Command Degradation Indicators**
   - Red warning icon (⚠) on brigade symbol when command friction detected
   - Tooltip on hover: "Intent diverged: Ordered to defend, executing limited offensive"
   - Appears when `brigade.commandFriction > 0.5`

**Click Interactions**:
- **Click Corps boundary** → Info panel: Corps strength, subordinate brigades, supply status
- **Click Brigade symbol** → Info panel: Brigade details (see §3.8.4)
- **Click OG boundary** → Info panel: OG composition, assigned brigades, operational objective

**Example Rendering**:
```
┌────────────────────────────────────────────────┐
│  1st CORPS (SARAJEVO) [Dashed Green Border]   │
│                                                │
│  ┌──────────┐         ┌──────────┐           │
│  │ 2nd Bde  │         │ 3rd Bde  │           │
│  │   [X]    │         │   [X]    │ ⚠        │
│  │   85%    │         │   60%    │           │
│  └──────────┘         └──────────┘           │
│                                                │
│  ...OG BIHAĆ [Dotted Green Border]...         │
│  .  ┌──────────┐                         .    │
│  .  │ 5th Bde  │                         .    │
│  .  │   [X]    │ (OG Bihać)              .    │
│  .  │   70%    │                         .    │
│  .  └──────────┘                         .    │
│  .........................................    │
└────────────────────────────────────────────────┘
```

#### 3.8.4 Brigade Info Panel (Click Brigade Symbol)

**Content** (sidebar overlay, 300px wide):

```
┌──────────────────────────────────────┐
│  2nd BRIGADE (ARBiH)                 │
│  1st Corps, Sarajevo                 │
├──────────────────────────────────────┤
│  Strength: 85% (1,200 troops)        │
│  Morale: Good                        │
│  Supply: Adequate (7 days)           │
│  Exhaustion: 25%                     │
│                                      │
│  Area of Responsibility:             │
│  - Dobrinja                          │
│  - Ilidža                            │
│  - Butmir                            │
│  (12 settlements total)              │
│                                      │
│  Current Orders:                     │
│  "Defend Sarajevo airport corridor"  │
│                                      │
│  Command Friction: Low               │
│  └─ Intent aligned with orders       │
│                                      │
│  Recent Activity:                    │
│  - Turn 22: Repelled RS attack       │
│  - Turn 21: Received resupply        │
└──────────────────────────────────────┘
```

#### 3.8.5 Supply Status Overlay (Detailed Spec)

**Purpose**: Visualize supply corridors and logistics network (Phase II only)

**Visual Elements**:

1. **Supply Corridors**
   - Lines connecting key route settlements
   - Color-coded by status:
     - **Green**: Open (normal supply flow)
     - **Yellow**: Brittle (continuous penalties)
     - **Red**: Cut (no supply flow)
   - Line thickness: 4px
   - Animated flow: Small arrows moving along line (when Open/Brittle)

2. **Supply Route Arrows**
   - Show direction of supply flow (from supply source → brigades)
   - Source nodes: Port cities, border crossings, production centers
   - Destination nodes: Brigade positions

3. **Critical Junctions**
   - Yellow warning circles at junction settlements (Brčko, etc.)
   - Tooltip on hover: "Critical junction: 3 corridors depend on this settlement"

**Example**:
```
   [Supply Source: Tuzla]
            ↓ (Green line)
     [Junction: Kladanj]
       ↙          ↘
 (Green)       (Yellow - Brittle)
   ↙              ↘
[2nd Bde]      [3rd Bde]
```

#### 3.8.6 Exhaustion Heatmap Overlay

**Purpose**: Show faction exhaustion levels at municipality scale

**Visual Treatment**:
- Semi-transparent color overlay on municipalities (40% opacity)
- Gradient from green (low) → yellow (medium) → red (high)
- Color scale:
  - Green: 0-30% exhaustion
  - Yellow: 31-60% exhaustion
  - Orange: 61-80% exhaustion
  - Red: 81-100% exhaustion

**Hover Tooltip**:
```
Municipality: Sarajevo
Exhaustion: 65% (High)
Sources:
- Static fronts: +15%
- Supply strain: +20%
- Control Strain: +30%
```

#### 3.8.7 Displacement Flows Overlay

**Purpose**: Visualize refugee movement (Phase I+)

**Visual Treatment**:
- Animated arrows (2px width) from source → destination municipalities
- Arrow color matches displaced population ethnicity:
  - Green: Bosniak refugees
  - Red: Serb refugees
  - Blue: Croat refugees
- Arrow thickness proportional to displaced population size
- Animation: Slow-moving flow (2 seconds per arrow cycle)

**Example**:
```
[Srebrenica] ─────→ [Tuzla]
   (Red zone)   (Green arrows)  (Green zone)
                 ▂▂▂▂▂▂▂▂▂▂
                 3,500 displaced Bosniaks
```

#### 3.8.8 Implementation: Overlay Rendering

```typescript
interface MapOverlay {
  id: string;
  enabled: boolean;
  renderLayer: (ctx: CanvasRenderingContext2D | SVGElement, gameState: GameState) => void;
  phaseRequirement: 'phase_0' | 'phase_I' | 'phase_II';
}

class MapOverlayManager {
  private overlays: Map<string, MapOverlay> = new Map();
  private enabledOverlays: Set<string> = new Set();

  registerOverlay(overlay: MapOverlay) {
    this.overlays.set(overlay.id, overlay);
  }

  toggleOverlay(overlayId: string) {
    if (this.enabledOverlays.has(overlayId)) {
      this.enabledOverlays.delete(overlayId);
    } else {
      this.enabledOverlays.add(overlayId);
    }
    this.renderMap();
  }

  renderMap() {
    const ctx = getMapCanvas().getContext('2d');

    // Render base map layers first
    renderBaseMap(ctx);

    // Render enabled overlays in order
    this.enabledOverlays.forEach(overlayId => {
      const overlay = this.overlays.get(overlayId);
      if (overlay && this.isPhaseAllowed(overlay.phaseRequirement)) {
        overlay.renderLayer(ctx, gameState);
      }
    });
  }

  private isPhaseAllowed(requirement: string): boolean {
    const phaseOrder = ['phase_0', 'phase_I', 'phase_II'];
    const currentIndex = phaseOrder.indexOf(gameState.meta.phase);
    const requiredIndex = phaseOrder.indexOf(requirement);
    return currentIndex >= requiredIndex;
  }
}

// Example: Command Structure Overlay
const commandStructureOverlay: MapOverlay = {
  id: 'commandStructure',
  enabled: false,
  phaseRequirement: 'phase_II',
  renderLayer: (ctx, gameState) => {
    // Draw corps boundaries
    gameState.corps.forEach(corps => {
      drawCorpsBoundary(ctx, corps, 'dashed');
    });

    // Draw OG boundaries
    gameState.operationalGroups.forEach(og => {
      drawOGBoundary(ctx, og, 'dotted');
    });

    // Draw brigade symbols
    gameState.brigades.forEach(brigade => {
      drawBrigadeSymbol(ctx, brigade);
    });
  }
};
```

---

### 3.9 Interactive Map Behaviors

**Zoom Transitions**:
```typescript
interface ZoomLevel {
  id: 0 | 1 | 2 | 3;
  scale: number;
  center: {x: number, y: number};
  duration: number; // Transition time in ms
}

const zoomLevels: ZoomLevel[] = [
  { id: 0, scale: 1.0, center: {x: 960, y: 540}, duration: 300 },   // Full BiH
  { id: 1, scale: 2.5, center: {x: 0, y: 0}, duration: 400 },      // Theater (click-dependent)
  { id: 2, scale: 5.0, center: {x: 0, y: 0}, duration: 400 },      // Brigade detail
  { id: 3, scale: 5.0, center: {x: 0, y: 0}, duration: 0 }         // Info panel (no zoom)
];

function zoomToLevel(currentLevel: number, targetLevel: number, clickPoint?: {x: number, y: number}) {
  const target = zoomLevels[targetLevel];

  // Calculate new center (zoom towards click point if provided)
  const newCenter = clickPoint
    ? {x: clickPoint.x, y: clickPoint.y}
    : target.center;

  // Animate transition
  animateMapTransform({
    from: { scale: zoomLevels[currentLevel].scale, center: mapCenter },
    to: { scale: target.scale, center: newCenter },
    duration: target.duration,
    easing: 'ease-in-out'
  });
}
```

**Click Handlers**:
```typescript
function handleMapClick(event: MouseEvent, currentZoom: number) {
  const clickPoint = {x: event.offsetX, y: event.offsetY};
  const feature = getFeatureAtPoint(clickPoint); // Returns settlement or unit

  if (currentZoom === 0) {
    // Strategic view: Zoom to theater
    zoomToLevel(0, 1, clickPoint);
  } else if (currentZoom === 1) {
    // Operational view: Zoom to brigade detail
    zoomToLevel(1, 2, clickPoint);
  } else if (currentZoom === 2 && feature?.type === 'settlement') {
    // Tactical view: Open settlement info panel
    openSettlementInfo(feature.id);
  }
}

function handleBackButton() {
  if (currentZoom > 0) {
    zoomToLevel(currentZoom, currentZoom - 1);
  }
}
```

---

## 4. Desperation Indicator System

### 4.1 Desperation Metric Calculation

**Purpose**: Visually represent faction's strategic situation via HQ environmental details

**Formula**:
```typescript
interface DesperationMetrics {
  authority: number;      // 0-40 points
  exhaustion: number;     // 0-30 points
  supply: number;         // 0-20 points
  territorial: number;    // 0-10 points
  total: number;          // 0-100
  level: 'stable' | 'strained' | 'critical' | 'desperate';
}

function calculateDesperation(state: GameState, faction: Faction): DesperationMetrics {
  // Authority contribution (0-40)
  const authorityScore = (1.0 - faction.authority) * 40;

  // Exhaustion contribution (0-30)
  const exhaustionScore = faction.exhaustion * 30;

  // Supply corridor contribution (0-20)
  const corridors = getCorridors(state, faction);
  const cutCount = corridors.filter(c => c.status === 'Cut').length;
  const brittleCount = corridors.filter(c => c.status === 'Brittle').length;
  const supplyScore = (cutCount * 10) + (brittleCount * 5);

  // Territorial loss contribution (0-10)
  const controlDelta = getControlDelta(state, faction); // Negative if losing territory
  const territorialScore = Math.max(0, -controlDelta * 10);

  const total = Math.min(100, authorityScore + exhaustionScore + supplyScore + territorialScore);

  return {
    authority: authorityScore,
    exhaustion: exhaustionScore,
    supply: supplyScore,
    territorial: territorialScore,
    total: total,
    level: total < 25 ? 'stable' :
           total < 50 ? 'strained' :
           total < 75 ? 'critical' : 'desperate'
  };
}
```

### 4.2 Visual Indicator Specifications

**Ashtray States**:

| Level | Cigarette Count | Visual Details | Asset File |
|-------|-----------------|----------------|------------|
| Stable | 1-2 | Clean glass ashtray, fresh butts with ash | `ashtray_stable.png` |
| Strained | 5-7 | Half-full, some crushed butts | `ashtray_strained.png` |
| Critical | 10-15 | Nearly full, tightly packed | `ashtray_critical.png` |
| Desperate | 18+ overflowing | Butts piled up, 2-3 on desk surface | `ashtray_desperate.png` |

**Coffee Cup States**:

| Level | Cup Count | Visual Details | Asset File |
|-------|-----------|----------------|------------|
| Stable | 1 | Single cup, half-full, clean | `coffee_stable.png` |
| Strained | 1 | Empty cup, dried ring stain inside | `coffee_strained.png` |
| Critical | 2 | One empty (stained), one half-empty | `coffee_critical.png` |
| Desperate | 3+ | Multiple cups, one tipped/spilled, coffee stains on desk | `coffee_desperate.png` |

**Desk Paper Scatter**:

| Level | Paper Coverage | Layout | Asset File (Base HQ Image) |
|-------|----------------|--------|------------|
| Stable | 20% desk | Organized stacks, aligned edges | `hq_background_stable.png` |
| Strained | 40% desk | Slightly scattered, some overlap | `hq_background_strained.png` |
| Critical | 65% desk | Very scattered, papers at angles | `hq_background_critical.png` |
| Desperate | 85%+ desk | Chaotic, papers falling off edge, visible disorder | `hq_background_desperate.png` |

**Note**: These are unified HQ backgrounds (wall + desk) identical for all factions. Papers are baked into the base image, not separate sprites.

**Wall Map Condition**:

| Level | Annotation Density | Wear & Tear | Implementation |
|-------|-------------------|-------------|----------------|
| Stable | Minimal pencil marks | Clean, taut mounting | Overlay: 5-10 small marks |
| Strained | Moderate annotations | Dog-eared corners, few pushpins | Overlay: 20-30 marks, 3-5 pins |
| Critical | Heavy markings | Torn edges, many pushpins, grease pencil scribbles | Overlay: 50+ marks, 10+ pins, red grease lines |
| Desperate | Excessive scribbling | Heavily worn, torn sections, pins everywhere | Overlay: Dense markings, visible tears, 20+ pins |

**Wall Cracks (Concrete Deterioration)**:

| Level | Crack Severity | Description | Baked into HQ Background |
|-------|---------------|-------------|--------------------------|
| Stable | None | Clean concrete wall, no visible damage | No cracks visible |
| Strained | Minor hairline cracks | 1-2 thin hairline cracks near map edges, barely visible | Subtle single crack (2-3mm wide, 20-30cm long) |
| Critical | Moderate cracks | 3-5 visible cracks radiating from corners, some branching | Multiple cracks (5-8mm wide, 50-80cm long, slight branching) |
| Desperate | Severe structural damage | Extensive crack network across wall, spalling concrete, exposed rebar hints | Dense crack network (10-15mm wide, full wall span, heavy branching, small chunks missing) |

**Lighting Conditions**:

| Level | Lighting Quality | CSS Filter |
|-------|------------------|------------|
| Stable | Bright, even | `brightness(1.0)` |
| Strained | Slightly dim | `brightness(0.9)` |
| Critical | Dim, one tube flickering | `brightness(0.8)` + flicker animation |
| Desperate | Harsh shadows, one tube out | `brightness(0.7) contrast(1.2)` |

### 4.3 Implementation Example

**Asset Swapping System**:
```typescript
interface DesperationAssets {
  background: string;
  ashtray: string;
  coffee: string;
  papers: string;
  mapOverlay: string;
  lightingFilter: string;
}

const desperationAssetMap: Record<DesperationLevel, DesperationAssets> = {
  stable: {
    background: '/assets/hq/hq_background_stable.png',    // Unified HQ (wall + desk)
    ashtray: '/assets/props/ashtray_stable.png',          // Sprite overlay
    coffee: '/assets/props/coffee_stable.png',            // Sprite overlay
    mapOverlay: '/assets/map/annotations_light.png',
    lightingFilter: 'brightness(1.0)'
  },
  strained: {
    background: '/assets/hq/hq_background_strained.png',  // Unified HQ (wall + desk)
    ashtray: '/assets/props/ashtray_strained.png',        // Sprite overlay
    coffee: '/assets/props/coffee_strained.png',          // Sprite overlay
    mapOverlay: '/assets/map/annotations_medium.png',
    lightingFilter: 'brightness(0.9)'
  },
  critical: {
    background: '/assets/hq/hq_background_critical.png',  // Unified HQ (wall + desk)
    ashtray: '/assets/props/ashtray_critical.png',        // Sprite overlay
    coffee: '/assets/props/coffee_critical.png',          // Sprite overlay
    mapOverlay: '/assets/map/annotations_heavy.png',
    lightingFilter: 'brightness(0.8)'
  },
  desperate: {
    background: '/assets/hq/hq_background_desperate.png', // Unified HQ (wall + desk)
    ashtray: '/assets/props/ashtray_desperate.png',       // Sprite overlay
    coffee: '/assets/props/coffee_desperate.png',         // Sprite overlay
    mapOverlay: '/assets/map/annotations_extreme.png',
    lightingFilter: 'brightness(0.7) contrast(1.2)'
  }
};

// Faction-specific sprite overlays (independent of desperation state)
const factionAssetMap: Record<FactionId, FactionAssets> = {
  RBiH: {
    crest: '/assets/crests/rbih_crest.png',
    headgearStable: '/assets/props/headgear_rbih_stable.png',
    headgearDesperate: '/assets/props/headgear_rbih_desperate.png'
  },
  RS: {
    crest: '/assets/crests/rs_crest.png',
    headgearStable: '/assets/props/headgear_rs_stable.png',
    headgearDesperate: '/assets/props/headgear_rs_desperate.png'
  },
  HRHB: {
    crest: '/assets/crests/hrhb_crest.png',
    headgearStable: '/assets/props/headgear_hrhb_stable.png',
    headgearDesperate: '/assets/props/headgear_hrhb_desperate.png'
  }
};

function updateHQVisuals(desperation: DesperationMetrics, faction: FactionId) {
  const assets = desperationAssetMap[desperation.level];
  const factionAssets = factionAssetMap[faction];

  // Update unified HQ background (wall + desk combined)
  document.getElementById('hq-scene').style.backgroundImage = `url(${assets.background})`;

  // Update faction-specific sprite overlays
  document.getElementById('crest-sprite').src = factionAssets.crest;
  const headgear = desperation.level === 'desperate' ? factionAssets.headgearDesperate : factionAssets.headgearStable;
  document.getElementById('headgear-sprite').src = headgear;

  // Update desperation sprite overlays
  document.getElementById('ashtray-sprite').src = assets.ashtray;
  document.getElementById('coffee-sprite').src = assets.coffee;

  // Update map annotations overlay
  document.getElementById('map-annotations').src = assets.mapOverlay;

  // Update lighting
  document.getElementById('hq-scene').style.filter = assets.lightingFilter;
}
```

---

## 5. Interactive Object System: Newspapers

### 5.1 Purpose and Scope

**Newspapers serve dual purpose:**
1. **Turn-by-turn event reporting**: Show events from previous turn (fog of war)
2. **Scripted event delivery**: Major historical events (referendum, massacres) and emergent events (major control changes, diplomatic shifts)

**Design Philosophy**: Newspapers are the **primary storytelling mechanism**—they contextualize abstract game state changes into narrative events.

### 5.2 Newspaper Visual Design

**Physical Appearance**:
- **Format**: Broadsheet fold (tabloid half-page when closed)
- **Paper texture**: Yellowed newsprint (aged effect increases with turn age)
- **Masthead**: Faction-specific newspaper names in English:
  - **RBiH**: "OSLOBOĐENJE" (Liberation) — subtitle: "Independent Daily"
  - **RS**: "GLAS SRPSKE" (Voice of Srpska) — subtitle: "Republika Srpska Daily"
  - **HRHB**: "CROATIAN HERALD" — subtitle: "Herzeg-Bosnia News"
- **Typography**:
  - Headlines: Condensed bold serif (Franklin Gothic or similar), 36-48pt
  - Subheads: Medium serif, 18-24pt
  - Body: Serif, 10-12pt, 2-3 column layout
- **Photography**: Grainy B&W images processed from map screenshots with halftone filter

**Example Masthead**:
```
┌──────────────────────────────────────────────┐
│  OSLOBOĐENJE                      23 Jun 1992│
│  Independent Daily              Week 23, 1992│
├──────────────────────────────────────────────┤
│                                              │
│     VRS ADVANCES ON BRČKO CORRIDOR           │
│  RBiH Forces Lose Control of Odžak Village  │
│                                              │
│  [Grainy B&W photo of Odžak]                │
│                                              │
│  Heavy fighting erupted yesterday as...      │
│                                              │
└──────────────────────────────────────────────┘
```

### 5.3 Newspaper Content Generation

**Data Structure**:
```typescript
interface NewspaperReport {
  turn: number;
  date: string; // Calendar date from turn counter
  faction: Faction; // Which faction's newspaper

  headline: {
    main: string;      // "VRS Advances on Brčko Corridor"
    subhead: string;   // "RBiH Forces Lose Control of Odžak"
  };

  leadStory: {
    type: 'scripted' | 'emergent';
    content: string;   // 3-4 paragraphs
    photo?: {
      caption: string;
      imageData: string; // Base64 or URL to generated image
    };
  };

  sections: {
    frontlineSummary: ArticleSection;      // Corps-level movements
    controlChanges: ArticleSection;        // Settlements that flipped
    diplomaticNews: ArticleSection;        // UN statements, negotiations
    casualties: ArticleSection;            // Vague estimates ("heavy losses")
    internationalReaction: ArticleSection; // Foreign press, UN responses
  };

  accuracy: number; // 0.7-0.9 (fog of war for emergent events)
  delay: number;    // Always 1 turn behind current state
}

interface ArticleSection {
  headline: string;
  content: string; // 1-2 paragraphs
  columnPosition: 1 | 2 | 3; // Which column in 3-column layout
}
```

**Content Generation Logic**:
```typescript
class NewspaperGenerator {

  generateDailyPaper(state: GameState, faction: Faction, turn: number): NewspaperReport {
    const previousTurn = turn - 1;
    const events = this.extractEvents(state, previousTurn);

    // Check for scripted events first
    const scriptedEvent = this.checkScriptedEvents(state, previousTurn);

    if (scriptedEvent) {
      return this.generateScriptedNewspaper(scriptedEvent, faction, turn);
    } else {
      return this.generateEmergentNewspaper(events, faction, turn);
    }
  }

  private checkScriptedEvents(state: GameState, turn: number): ScriptedEvent | null {
    // Major historical events
    if (state.meta.referendum_held && state.meta.referendum_turn === turn) {
      return {
        type: 'referendum',
        headline: 'INDEPENDENCE REFERENDUM HELD',
        subhead: 'BiH Votes to Secede from Yugoslavia',
        content: this.generateReferendumArticle(state)
      };
    }

    if (this.isBreadlineMassacre(state, turn)) {
      return {
        type: 'massacre',
        headline: 'BREADLINE MASSACRE IN SARAJEVO',
        subhead: 'Mortar Attack Kills 22 Civilians',
        content: this.generateBreadlineArticle(state)
      };
    }

    // Check for major emergent events worthy of scripted treatment
    if (this.isMajorCityFall(state, turn)) {
      const city = this.getFallenCity(state, turn);
      return {
        type: 'major_control_change',
        headline: `${city.name.toUpperCase()} FALLS TO ${city.newController}`,
        subhead: `Strategic City Lost After ${city.siegeDuration} Weeks`,
        content: this.generateCityFallArticle(city, state)
      };
    }

    return null;
  }

  private generateEmergentNewspaper(events: GameEvent[], faction: Faction, turn: number): NewspaperReport {
    // Sort events by importance
    const sortedEvents = this.rankEventsByImportance(events);
    const topEvent = sortedEvents[0];

    return {
      turn: turn,
      date: this.turnToDate(turn),
      faction: faction,
      headline: {
        main: this.generateHeadline(topEvent),
        subhead: this.generateSubhead(topEvent)
      },
      leadStory: {
        type: 'emergent',
        content: this.generateLeadContent(topEvent, events.slice(1, 4)),
        photo: this.generateNewsPhoto(topEvent)
      },
      sections: {
        frontlineSummary: this.generateFrontlineSummary(events),
        controlChanges: this.generateControlChangesList(events),
        diplomaticNews: this.generateDiplomaticSection(events),
        casualties: this.generateCasualtyEstimates(events),
        internationalReaction: this.generateInternationalSection(events)
      },
      accuracy: 0.85, // Emergent events are ~85% accurate (1 turn lag)
      delay: 1
    };
  }

  private generateHeadline(event: GameEvent): string {
    switch(event.type) {
      case 'control_flip':
        return `${event.faction} CAPTURES ${event.settlement.toUpperCase()}`;
      case 'corridor_cut':
        return `${event.corridor.toUpperCase()} CORRIDOR SEVERED`;
      case 'declaration':
        return `${event.faction} DECLARES INDEPENDENCE`;
      case 'major_offensive':
        return `OFFENSIVE LAUNCHED IN ${event.region.toUpperCase()}`;
      default:
        return 'SITUATION DETERIORATES ON EASTERN FRONT';
    }
  }

  private generateNewsPhoto(event: GameEvent): {caption: string, imageData: string} {
    // Capture map screenshot of event location
    const mapScreenshot = this.captureMapRegion(event.location);

    // Apply 1992 wire photo effect
    const processedImage = this.applyNewsPrintEffect(mapScreenshot, {
      grayscale: true,
      halftone: true,
      grain: 0.3,
      contrast: 1.2
    });

    return {
      caption: this.generatePhotoCaption(event),
      imageData: processedImage
    };
  }
}
```

### 5.4 Scripted Event Examples

**Referendum Event** (Turn = referendum_turn):
```
HEADLINE: INDEPENDENCE REFERENDUM HELD
SUBHEAD: Citizens Vote to Secede from Yugoslavia

CONTENT:
In a historic referendum held yesterday, citizens of Bosnia and Herzegovina
voted overwhelmingly in favor of independence from Yugoslavia. Preliminary
results indicate 99.7% support among voters, though the Serbian population
largely boycotted the vote.

The referendum, organized under pressure from the European Community, asked
voters: "Are you in favor of a sovereign and independent Bosnia-Herzegovina,
a state of equal citizens and nations of Muslims, Serbs, Croats and others
who live in it?"

International observers report the voting proceeded peacefully in most areas,
though tensions remain high. The United States and European Community are
expected to recognize BiH independence within weeks.

[Photo: Voters queuing at polling station in Sarajevo]
```

**Breadline Massacre** (Turn = breadline_event_turn):
```
HEADLINE: MORTAR ATTACK KILLS 22 IN SARAJEVO
SUBHEAD: Breadline Massacre Shocks International Community

CONTENT:
A mortar shell struck a breadline in downtown Sarajevo this morning, killing
at least 22 civilians and wounding over 60 others. The attack occurred at
approximately 12:15 as residents queued for bread during a rare ceasefire.

Witnesses describe scenes of carnage as the shell exploded without warning.
"People were just waiting for bread," said one survivor. "Then there was a
flash and everyone was on the ground."

The attack has drawn international condemnation. UN Secretary-General Boutros
Boutros-Ghali called it a "crime against humanity." Republika Srpska forces
deny responsibility, claiming the attack was staged by Bosnian government forces.

[Photo: Aftermath of mortar strike, bodies covered with sheets]
```

**Major City Fall** (Turn = city_fall_turn):
```
HEADLINE: SREBRENICA FALLS TO VRS FORCES
SUBHEAD: Eastern Enclave Collapses After 8-Week Siege

CONTENT:
Republika Srpska forces captured the strategic town of Srebrenica early this
morning after an eight-week siege. The fall of the enclave represents a major
defeat for RBiH forces and leaves thousands of Bosniak civilians trapped.

VRS General Ratko Mladić announced the capture via radio, declaring "Srebrenica
is finally Serbian." RBiH defenders retreated towards Tuzla, abandoning heavy
equipment. Approximately 15,000 civilians are believed to remain in the town.

The United Nations has expressed grave concern for civilian safety. Dutch
peacekeepers stationed in Srebrenica were unable to prevent the VRS advance.
RBiH officials accuse UN forces of failing to protect the "safe area."

[Photo: VRS soldiers entering Srebrenica town center]
```

### 5.5 Newspaper Interaction Flow

**Player Clicks Newspaper on Desk**:

1. **Newspaper overlay appears** (full-screen or 70% screen modal)
2. **Front page displays** with headline, lead story, photo
3. **Player can scroll** to read additional sections (frontline summary, control changes, etc.)
4. **Click "Close" or ESC** to return to HQ view
5. **Newspaper marked as "read"** (visual indicator on desk)

**Multiple Newspapers Available**:
- **Current turn newspaper** (N-1 events): Highlighted, glowing
- **Previous turn newspaper** (N-2 events): Partially visible behind current, dim glow
- **Archive** (optional): Click on old papers to review past events

**Code Example**:
```typescript
function openNewspaper(turn: number) {
  const newspaper = newspaperGenerator.getDailyPaper(gameState, playerFaction, turn);

  // Create modal overlay
  const modal = createNewspaperModal(newspaper);
  document.body.appendChild(modal);

  // Render front page
  renderFrontPage(modal, newspaper);

  // Mark as read
  markNewspaperRead(turn);
}

function renderFrontPage(container: HTMLElement, paper: NewspaperReport) {
  const html = `
    <div class="newspaper-page">
      <div class="masthead">
        <h1>${paper.faction === 'RBiH' ? 'OSLOBOĐENJE' : 'GLAS SRPSKE'}</h1>
        <p class="date">${paper.date} | Week ${paper.turn}</p>
      </div>

      <div class="headline">
        <h2>${paper.headline.main}</h2>
        <h3>${paper.headline.subhead}</h3>
      </div>

      ${paper.leadStory.photo ? `
        <div class="photo">
          <img src="${paper.leadStory.photo.imageData}" alt="News photo">
          <p class="caption">${paper.leadStory.photo.caption}</p>
        </div>
      ` : ''}

      <div class="article-columns">
        ${this.formatArticleContent(paper.leadStory.content)}
      </div>

      <div class="secondary-sections">
        ${this.renderSection(paper.sections.frontlineSummary)}
        ${this.renderSection(paper.sections.controlChanges)}
        ${this.renderSection(paper.sections.diplomaticNews)}
      </div>
    </div>
  `;

  container.innerHTML = html;
}
```

---

## 6. Interactive Object System: Monthly Magazine

### 6.1 Purpose

**Magazine provides strategic-level analysis** with monthly aggregation:
- Detailed statistics (control changes, casualties, displacement)
- Charts and infographics (bar charts, line graphs, pie charts)
- Before/after control maps
- Intelligence estimates with error bars

**Delay**: Published 1 week after month ends (4 turns = 1 month, so magazine for Month M published at Turn M*4 + 5)

### 6.2 Magazine Visual Design

**Physical Appearance**:
- **Format**: Glossy magazine (A4 size, portrait orientation)
- **Cover design**: Professional 1990s publication aesthetic
  - Bold title: "MONTHLY OPERATIONAL REVIEW"
  - Month/year: "MAY 1992"
  - Cover graphic: Small control map + key statistics in boxes
  - Color scheme: Blue and red with grey accents
- **Interior pages**: 8-12 pages (scrollable in overlay)
- **Typography**:
  - Headers: Sans-serif bold (Arial/Helvetica), 24-36pt
  - Body: Sans-serif regular, 11-13pt
  - Charts: Sans-serif labels, grid lines

**Example Cover**:
```
┌────────────────────────────────────┐
│  MONTHLY OPERATIONAL REVIEW        │
│  MAY 1992                          │
│                                    │
│  ┌──────────────────────────────┐ │
│  │   [Control map: before/after]│ │
│  │                              │ │
│  └──────────────────────────────┘ │
│                                    │
│  KEY STATISTICS:                   │
│  ┌──────┬──────┬──────┐           │
│  │ +12  │  -8  │ 15K  │           │
│  │Gained│ Lost │Displ.│           │
│  └──────┴──────┴──────┘           │
│                                    │
│  INSIDE: Corps Performance, Supply │
│  Corridor Analysis, Intelligence   │
└────────────────────────────────────┘
```

### 6.3 Magazine Content Structure

**Data Structure**:
```typescript
interface MonthlyMagazine {
  month: string; // "May 1992"
  coverTurns: [number, number]; // [turn_start, turn_end] for the month
  publicationTurn: number; // When available to read

  cover: {
    beforeAfterMap: {
      before: string; // PNG of control at month start
      after: string;  // PNG of control at month end
    };
    keyStatistics: {
      settlementsGained: number;
      settlementsLost: number;
      netChange: number;
      totalDisplaced: number;
      exhaustionDelta: number;
    };
  };

  pages: {
    executiveSummary: ExecutiveSummaryPage;
    corpsPerformance: CorpsPerformancePage;
    supplyAnalysis: SupplyAnalysisPage;
    displacementReport: DisplacementReportPage;
    intelligenceEstimate: IntelligenceEstimatePage;
    statisticalAppendix: StatisticalAppendixPage;
  };
}

interface ExecutiveSummaryPage {
  narrative: string; // 2-3 paragraphs of analysis
  controlChangesChart: ChartData; // Bar chart: gains vs losses
  authorityTrendGraph: ChartData; // Line graph: authority over month
}

interface CorpsPerformancePage {
  corpsReports: Array<{
    corpsId: string; // "2nd Corps"
    offensiveRating: number; // 0-100
    defensiveRating: number; // 0-100
    supplyStatus: 'Adequate' | 'Strained' | 'Critical';
    keyActions: string[]; // List of major operations
  }>;
}

interface IntelligenceEstimatePage {
  enemyStrength: {
    estimated: number; // e.g., 45,000 troops
    confidenceInterval: [number, number]; // [40000, 50000]
    confidenceLevel: string; // "Medium confidence"
  };
  enemyIntentions: string; // Narrative assessment
  threatsAndOpportunities: {
    threats: string[];
    opportunities: string[];
  };
}
```

### 6.4 Chart Generation

**Chart Types**:

1. **Bar Chart** (Control Changes):
```typescript
function generateControlChangeChart(monthData: MonthlyData): ChartData {
  return {
    type: 'bar',
    title: 'Settlement Control Changes - May 1992',
    xAxis: ['Week 17', 'Week 18', 'Week 19', 'Week 20'],
    series: [
      {
        name: 'Gained',
        data: [3, 5, 2, 2],
        color: 'rgb(60, 140, 60)' // Green
      },
      {
        name: 'Lost',
        data: [1, 2, 3, 2],
        color: 'rgb(180, 50, 50)' // Red
      }
    ]
  };
}
```

2. **Line Graph** (Authority Trend):
```typescript
function generateAuthorityTrendGraph(monthData: MonthlyData): ChartData {
  return {
    type: 'line',
    title: 'Authority Score Trends - May 1992',
    xAxis: ['Week 17', 'Week 18', 'Week 19', 'Week 20'],
    yAxis: { min: 0, max: 1.0, label: 'Authority' },
    series: [
      {
        name: 'RBiH Central Authority',
        data: [0.75, 0.72, 0.68, 0.65],
        color: 'rgb(60, 100, 140)'
      },
      {
        name: 'RS Authority',
        data: [0.45, 0.48, 0.52, 0.55],
        color: 'rgb(180, 50, 50)'
      }
    ]
  };
}
```

3. **Pie Chart** (Displacement Distribution):
```typescript
function generateDisplacementPieChart(monthData: MonthlyData): ChartData {
  return {
    type: 'pie',
    title: 'Displaced Population by Destination',
    data: [
      { label: 'Adjacent Friendly Municipalities', value: 10500, percent: 70 },
      { label: 'Distant Enclaves', value: 3000, percent: 20 },
      { label: 'External (Refugees)', value: 1500, percent: 10 }
    ],
    colors: ['rgb(60, 100, 140)', 'rgb(100, 140, 180)', 'rgb(150, 150, 150)']
  };
}
```

**Rendering** (use Chart.js or similar):
```typescript
function renderChart(canvas: HTMLCanvasElement, chartData: ChartData) {
  const ctx = canvas.getContext('2d');

  // Apply 1990s aesthetic styling
  const config = {
    type: chartData.type,
    data: {
      labels: chartData.xAxis,
      datasets: chartData.series.map(s => ({
        label: s.name,
        data: s.data,
        backgroundColor: s.color,
        borderColor: 'rgb(40, 40, 40)',
        borderWidth: 2
      }))
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: chartData.title,
          font: { size: 16, family: 'Arial', weight: 'bold' }
        },
        legend: {
          display: true,
          position: 'bottom'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgb(200, 200, 200)' }
        }
      }
    }
  };

  new Chart(ctx, config);
}
```

---

## 7. Interactive Object System: Situation Reports

### 7.1 Purpose

**Typed field reports from corps/brigade commanders** providing:
- Recent enemy activity observations
- Own forces status (supply, morale, readiness)
- Critical needs (ammunition, reinforcements)
- Commander's narrative assessment

**Characteristics**:
- **Delay**: 1-2 turns (reports take time to reach HQ)
- **Accuracy**: 60-80% (field reports are uncertain, observations are incomplete)
- **Format**: Typewritten onionskin paper with carbon copy effect

### 7.2 Visual Design

**Physical Appearance**:
- **Paper**: Onionskin (semi-transparent), carbon copy blur effect
- **Stamps**: Red rubber stamp "CONFIDENTIAL" or "RESTRICTED"
- **Typography**: Monospace typewriter font (Courier New), 12pt
- **Handwritten notes**: Blue pen cursive in margins (commander annotations)
- **Formatting**: Military memo format with header block

**Example Report**:
```
┌────────────────────────────────────────────────┐
│  RESTRICTED                                    │
│                                                │
│  FROM: 2nd Corps Command, Tuzla                │
│  TO:   General Staff, Sarajevo                 │
│  DATE: 18 June 1992                            │
│  SUBJ: Situation Report - Week 22              │
│                                                │
│  1. ENEMY ACTIVITY:                            │
│     Increased VRS movement observed near       │
│     Zvornik. Estimated 1 battalion strength    │
│     with armor support. Intent unclear.        │
│                                                │
│  2. OWN FORCES STATUS:                         │
│     Supply: ADEQUATE (7 days ammunition)       │
│     Morale: GOOD                               │
│     Readiness: 75% (3 brigades operational)    │
│                                                │
│  3. CRITICAL NEEDS:                            │
│     - Anti-tank weapons (urgent)               │
│     - Medical supplies                         │
│     - Reinforcements for 3rd Brigade           │
│                                                │
│  4. COMMANDER'S ASSESSMENT:                    │
│     Posavina corridor remains vulnerable.      │
│     Recommend reinforcing Brčko sector.        │
│                                                │
│                      [Handwritten signature]   │
│                      BG Sead Delić             │
│                      Commander, 2nd Corps      │
│                                                │
│  CONFIDENTIAL                                  │
└────────────────────────────────────────────────┘
```

### 7.3 Report Generation

```typescript
interface SituationReport {
  from: string; // Corps/brigade designation
  to: string; // "General Staff, Sarajevo"
  date: string; // Turn date
  classification: 'RESTRICTED' | 'CONFIDENTIAL' | 'SECRET';

  sections: {
    enemyActivity: string; // Recent observations
    ownForcesStatus: {
      supply: 'CRITICAL' | 'LOW' | 'ADEQUATE' | 'GOOD';
      morale: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
      readiness: number; // 0-100%
    };
    criticalNeeds: string[]; // List of requests
    commanderAssessment: string; // Narrative
  };

  commander: {
    rank: string; // "BG" (Brigadier General)
    name: string;
    position: string; // "Commander, 2nd Corps"
  };

  accuracy: number; // 0.6-0.8
  delay: number; // 1-2 turns
}

function generateSituationReport(state: GameState, corps: Corps, turn: number): SituationReport {
  const observedEnemyActivity = observeEnemyMovement(state, corps, turn);
  const supplyStatus = calculateSupplyStatus(corps);
  const needs = determineCriticalNeeds(corps);

  return {
    from: `${corps.name}, ${corps.headquarters}`,
    to: "General Staff, Sarajevo",
    date: turnToDate(turn - 1), // 1 turn delay
    classification: determineClassification(observedEnemyActivity),
    sections: {
      enemyActivity: generateEnemyActivityReport(observedEnemyActivity),
      ownForcesStatus: {
        supply: supplyStatus,
        morale: calculateMorale(corps),
        readiness: calculateReadiness(corps)
      },
      criticalNeeds: needs,
      commanderAssessment: generateCommanderAssessment(corps, observedEnemyActivity)
    },
    commander: {
      rank: corps.commander.rank,
      name: corps.commander.name,
      position: `Commander, ${corps.name}`
    },
    accuracy: 0.7,
    delay: 1
  };
}
```

---

## 8. Interactive Object System: International News Ticker (Radio)

### 8.1 Purpose and Design

**Radio provides dual function**:
1. **Real-world context**: Sports, entertainment, technology news from 1992-1995
2. **International reactions**: UN statements, foreign press, diplomatic pressure on Bosnia

**Design Philosophy**: Intersperse real-world news with Bosnia coverage (70% real world / 30% Bosnia) to:
- Ground player in historical period
- Show how war fits into broader 1990s context
- Provide relief from intensity (Michael Jordan news between massacre reports)
- Demonstrate international attention waxing/waning

### 8.2 Content Mix and Pacing

**Typical Ticker Sequence** (6 items, 2 real world : 1 Bosnia ratio):

```
[SPORTS] Michael Jordan leads Chicago Bulls to second NBA championship

[BOSNIA] UN Security Council approves Resolution 757, economic sanctions on Serbia

[TECHNOLOGY] Microsoft releases Windows 3.1, selling 1 million copies in 2 months

[WORLD] Earth Summit concludes in Rio de Janeiro, 178 nations sign climate pact

[BOSNIA] UNPROFOR reports 800K displaced persons, "humanitarian crisis worsening"

[ENTERTAINMENT] Batman Returns opens in US theaters, Keaton and Pfeiffer star
```

### 8.3 News Categories and Color Coding

| Category | Color | Content Type | Examples |
|----------|-------|--------------|----------|
| **SPORTS** | Green | NBA, Olympics, boxing, World Cup | "Jordan wins championship", "Dream Team to Barcelona" |
| **BOSNIA** | Red | War events, UN actions, humanitarian crisis | "UN condemns attack", "UNPROFOR deploys" |
| **WORLD** | Blue | International politics, summits, elections | "Clinton elected", "Maastricht Treaty signed" |
| **TECHNOLOGY** | Grey | Product launches, internet, computing | "Windows 3.1 released", "First text message sent" |
| **ENTERTAINMENT** | Purple | Movies, music, TV, pop culture | "Unforgiven wins Oscar", "Nirvana releases Nevermind" |
| **DIPLOMACY** | Dark Blue | Peace talks, sanctions, international law | "Contact Group meets in Geneva", "Arms embargo" |
| **SCIENCE** | Teal | Discoveries, space, medicine | "Hubble repaired", "HIV protease inhibitor" |

### 8.4 Historical News Database

**Data Structure**:
```typescript
interface NewsTickerItem {
  date: string; // "1992-06-23" (YYYY-MM-DD)
  category: 'SPORTS' | 'BOSNIA' | 'WORLD' | 'TECHNOLOGY' | 'ENTERTAINMENT' | 'DIPLOMACY' | 'SCIENCE';
  headline: string; // Max 120 characters
  source: 'historical' | 'generated'; // Historical = pre-loaded, Generated = from game state
}
```

**Pre-Loaded Historical Database** (`data/news/historical_news_1991_1995.json`):

```json
{
  "1992-06-23": [
    {
      "category": "SPORTS",
      "headline": "Michael Jordan leads Chicago Bulls to second NBA championship, defeating Portland Trail Blazers 4-2",
      "source": "historical"
    },
    {
      "category": "TECHNOLOGY",
      "headline": "Microsoft Windows 3.1 becomes fastest-selling software ever, 1 million copies in 2 months",
      "source": "historical"
    },
    {
      "category": "ENTERTAINMENT",
      "headline": "Batman Returns opens in US theaters, starring Michael Keaton and Michelle Pfeiffer",
      "source": "historical"
    },
    {
      "category": "WORLD",
      "headline": "UN Conference on Environment and Development concludes in Rio de Janeiro, 178 nations attend",
      "source": "historical"
    }
  ],
  "1992-06-24": [
    // Next day's news...
  ]
}
```

**Data Sources** (for creation):
- Wikipedia "1992 in [topic]" pages (sports, film, technology, politics)
- Historical news archives (AP, Reuters headlines)
- Pop culture databases (IMDb release dates, Billboard charts)
- Sports archives (NBA, Olympics, World Cup results)

**Coverage Targets**:
- ~10-15 items per week (1992-1995)
- ~2,500 total historical items (3+ years × 52 weeks × 15 items)
- Emphasis on major events (elections, disasters, cultural milestones)

### 8.5 Bosnia News Generation from Game State

```typescript
class BosniaNewsGenerator {
  /**
   * Generate Bosnia-related news from game events
   */
  generateFromGameState(gameState: GameState): NewsTickerItem[] {
    const news: NewsTickerItem[] = [];
    const currentDate = this.turnToDate(gameState.meta.turn);

    // Major scripted events (referendum, massacres)
    const scriptedEvent = this.checkScriptedEvents(gameState);
    if (scriptedEvent) {
      news.push({
        date: currentDate,
        category: 'BOSNIA',
        headline: scriptedEvent.headline,
        source: 'generated'
      });
    }

    // UN reactions to major control changes
    if (this.isMajorCityFall(gameState)) {
      const city = this.getFallenCity(gameState);
      news.push({
        date: currentDate,
        category: 'BOSNIA',
        headline: `UN Security Council expresses "grave concern" over fall of ${city}, emergency session called`,
        source: 'generated'
      });
    }

    // Humanitarian crisis updates
    if (this.isDisplacementSurge(gameState)) {
      const displaced = Math.floor(this.getTotalDisplaced(gameState) / 1000);
      news.push({
        date: currentDate,
        category: 'BOSNIA',
        headline: `UNHCR reports ${displaced}K displaced persons in BiH, warns of "catastrophic humanitarian crisis"`,
        source: 'generated'
      });
    }

    // Diplomatic pressure
    if (this.isHighExhaustion(gameState)) {
      news.push({
        date: currentDate,
        category: 'DIPLOMACY',
        headline: `International mediators intensify pressure for ceasefire as violence escalates in Bosnia`,
        source: 'generated'
      });
    }

    // Supply corridor news
    if (this.isCorridorCut(gameState)) {
      const corridor = this.getCutCorridor(gameState);
      news.push({
        date: currentDate,
        category: 'BOSNIA',
        headline: `UNPROFOR warns ${corridor} corridor cut, thousands at risk of starvation`,
        source: 'generated'
      });
    }

    // Peace process milestones
    if (this.isPeaceProgress(gameState)) {
      news.push({
        date: currentDate,
        category: 'DIPLOMACY',
        headline: `Contact Group reports progress in Bosnia peace talks, cautious optimism in Geneva`,
        source: 'generated'
      });
    }

    return news;
  }

  private checkScriptedEvents(gameState: GameState): {headline: string} | null {
    // Referendum
    if (gameState.meta.referendum_held && gameState.meta.referendum_turn === gameState.meta.turn) {
      return {
        headline: "Bosnia-Herzegovina holds independence referendum, overwhelming majority votes to secede from Yugoslavia"
      };
    }

    // Breadline massacre
    if (this.isBreadlineMassacre(gameState)) {
      return {
        headline: "Mortar attack on Sarajevo breadline kills 22 civilians, international community condemns 'crime against humanity'"
      };
    }

    // Srebrenica fall (if occurs)
    if (this.isSrebrenicaFall(gameState)) {
      return {
        headline: "Srebrenica falls to Bosnian Serb forces, UN peacekeepers unable to prevent assault on 'safe area'"
      };
    }

    return null;
  }
}
```

### 8.6 Ticker Interface Design

**Visual Treatment**: Transistor radio on desk (far right edge)

**Radio States**:
- **Idle**: Radio sits silently, small LED indicator off
- **Hover**: LED indicator lights up (red glow)
- **Active (after click)**: LED on, ticker overlay appears

**Click Radio** → Ticker overlay appears:

```
┌──────────────────────────────────────────────────────┐
│  INTERNATIONAL NEWS TICKER    Week 23, June 1992    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [SPORTS] Michael Jordan leads Bulls to second...   │
│                                                      │
│  [BOSNIA] UN condemns Sarajevo breadline attack...  │
│                                                      │
│  [TECH] Microsoft Windows 3.1 sells 1 million...    │
│                                                      │
│  [WORLD] Earth Summit concludes in Rio, 178...      │
│                                                      │
│  [BOSNIA] 800K displaced persons in BiH, UNHCR...   │
│                                                      │
│  [ENTERTAINMENT] Batman Returns opens in US...      │
│                                                      │
│  ▼ More (3 items)                                   │
└──────────────────────────────────────────────────────┘
```

**Interaction Options**:

1. **Auto-scrolling ticker** (default):
   - News items scroll upward continuously
   - Speed: 1 item per 5 seconds
   - Loops when reaching end

2. **Manual scroll** (user preference):
   - Scroll bar on right
   - Mouse wheel to scroll
   - Click ▼ More to load additional items

3. **Click individual item** (optional enhancement):
   - Expands to show full article text (if available)
   - For Bosnia items: Link to relevant newspaper article

### 8.7 Ticker Generation on Turn End

```typescript
class NewsTickerGenerator {
  private historicalNews: Map<string, NewsTickerItem[]>;
  private bosniaGenerator: BosniaNewsGenerator;

  constructor() {
    // Load historical news database
    this.historicalNews = this.loadHistoricalNews();
    this.bosniaGenerator = new BosniaNewsGenerator();
  }

  /**
   * Generate ticker for current turn
   */
  generateTicker(gameState: GameState): NewsTickerItem[] {
    const currentDate = this.turnToDate(gameState.meta.turn);

    // Get real-world news for this date
    const realWorldNews = this.getHistoricalNews(currentDate);

    // Generate Bosnia news from game state
    const bosniaNews = this.bosniaGenerator.generateFromGameState(gameState);

    // Interleave: 2 real world items, 1 Bosnia item
    const ticker = this.interleaveNews(realWorldNews, bosniaNews, 2, 1);

    // Limit to 10 most relevant items
    return ticker.slice(0, 10);
  }

  private getHistoricalNews(date: string): NewsTickerItem[] {
    // Exact date match preferred
    if (this.historicalNews.has(date)) {
      return this.historicalNews.get(date)!;
    }

    // Fallback: Get news from same week
    const weekNews = this.getWeeklyNews(date);
    return weekNews;
  }

  private getWeeklyNews(date: string): NewsTickerItem[] {
    // Get all news from the week containing this date
    const weekStart = this.getWeekStart(date);
    const weekItems: NewsTickerItem[] = [];

    for (let i = 0; i < 7; i++) {
      const dayDate = this.addDays(weekStart, i);
      const dayNews = this.historicalNews.get(dayDate);
      if (dayNews) {
        weekItems.push(...dayNews);
      }
    }

    // Shuffle to avoid same order every day
    return this.shuffleDeterministic(weekItems, date);
  }

  private interleaveNews(
    realWorld: NewsTickerItem[],
    bosnia: NewsTickerItem[],
    realWorldRatio: number,
    bosniaRatio: number
  ): NewsTickerItem[] {
    const result: NewsTickerItem[] = [];
    let rwIndex = 0;
    let bIndex = 0;

    while (rwIndex < realWorld.length || bIndex < bosnia.length) {
      // Add real-world items
      for (let i = 0; i < realWorldRatio && rwIndex < realWorld.length; i++) {
        result.push(realWorld[rwIndex++]);
      }

      // Add Bosnia items
      for (let i = 0; i < bosniaRatio && bIndex < bosnia.length; i++) {
        result.push(bosnia[bIndex++]);
      }
    }

    return result;
  }

  private shuffleDeterministic(items: NewsTickerItem[], seed: string): NewsTickerItem[] {
    // Deterministic shuffle based on date seed
    const seeded = items.map((item, index) => ({
      item,
      sortKey: this.hashString(seed + index)
    }));

    seeded.sort((a, b) => a.sortKey - b.sortKey);
    return seeded.map(s => s.item);
  }
}
```

### 8.8 UI Component Implementation

```typescript
// React component for news ticker
const NewsTickerOverlay: React.FC<{newsItems: NewsTickerItem[]}> = ({newsItems}) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    if (autoScroll) {
      const interval = setInterval(() => {
        setScrollPosition(prev => (prev + 1) % newsItems.length);
      }, 5000); // Scroll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [autoScroll, newsItems.length]);

  return (
    <div className={styles.newsTickerOverlay}>
      <div className={styles.header}>
        <h2>INTERNATIONAL NEWS TICKER</h2>
        <p>Week {currentTurn}, {getCalendarDate(currentTurn)}</p>
      </div>

      <div className={styles.newsItems}>
        {newsItems.map((item, index) => (
          <div
            key={index}
            className={`${styles.newsItem} ${styles[item.category.toLowerCase()]}`}
          >
            <span className={styles.category}>[{item.category}]</span>
            <span className={styles.headline}>{item.headline}</span>
          </div>
        ))}
      </div>

      <div className={styles.controls}>
        <button onClick={() => setAutoScroll(!autoScroll)}>
          {autoScroll ? 'Pause' : 'Play'}
        </button>
      </div>
    </div>
  );
};
```

### 8.9 Example Historical News Samples (1992-1995)

**1992**:
- [SPORTS] Dream Team wins Olympic gold in Barcelona, dominates competition
- [ENTERTAINMENT] Aladdin becomes highest-grossing film of 1992, $504 million worldwide
- [WORLD] Bill Clinton elected 42nd President of United States, defeats Bush
- [TECHNOLOGY] First text message sent: "Merry Christmas" transmitted over Vodafone
- [SCIENCE] Hubble Space Telescope discovers evidence of black holes in distant galaxies

**1993**:
- [WORLD] Maastricht Treaty takes effect, European Union officially established
- [ENTERTAINMENT] Jurassic Park breaks box office records, $912 million worldwide
- [TECHNOLOGY] Intel releases Pentium processor, 60 MHz clock speed
- [DIPLOMACY] Oslo Accords signed, Israel and PLO mutual recognition

**1994**:
- [WORLD] Nelson Mandela elected President of South Africa in first multiracial elections
- [SPORTS] Brazil wins FIFA World Cup in USA, defeats Italy on penalties
- [TECHNOLOGY] Amazon.com founded by Jeff Bezos, starts as online bookstore
- [SCIENCE] Comet Shoemaker-Levy 9 collides with Jupiter, spectacular astronomical event

**1995**:
- [TECHNOLOGY] Windows 95 released, selling 7 million copies in first 5 weeks
- [ENTERTAINMENT] Toy Story released, first fully computer-animated feature film
- [WORLD] Oklahoma City bombing kills 168, worst domestic terrorism in US history
- [DIPLOMACY] Dayton Agreement signed, ending Bosnian War after 3.5 years

---

## 9. Technical Implementation Stack

### 8.1 Recommended Technology Choices

**Frontend Framework**: React + TypeScript
- Component-based architecture for interactive objects
- Type safety for game state management
- Easy integration with Canvas/SVG rendering

**Map Rendering**:
- **Option A (Recommended)**: SVG + D3.js
  - Vector graphics scale infinitely
  - Easy to apply filters (hatching patterns)
  - D3.js for geo projections and zoom behavior
- **Option B**: HTML5 Canvas
  - Better performance for >1000 settlements
  - More complex to implement interactive features

**Charting**: Chart.js
- Lightweight, simple API
- Supports bar/line/pie charts
- Can be styled for 1990s aesthetic

**State Management**: Zustand or Redux
- Game state synchronization
- Undo/redo for turn rewind
- Persistence hooks for save/load

**Styling**: CSS Modules + SCSS
- Scoped styles for components
- Variables for desperation states
- Easy theming

### 8.2 File Structure

```
src/
├── components/
│   ├── HQ/
│   │   ├── HQScene.tsx              // Main HQ container
│   │   ├── DeskSection.tsx          // Desk with interactive objects
│   │   ├── WallMapSection.tsx       // Map display area
│   │   └── InteractiveObject.tsx    // Generic hover/click component
│   ├── Map/
│   │   ├── TacticalMap.tsx          // Main map component
│   │   ├── ControlZone.tsx          // Settlement control rendering
│   │   ├── MilitarySymbol.tsx       // NATO unit symbols
│   │   ├── Frontline.tsx            // Frontline rendering
│   │   └── MapControls.tsx          // Zoom, pan controls
│   ├── Overlays/
│   │   ├── NewspaperOverlay.tsx     // Newspaper modal
│   │   ├── MagazineOverlay.tsx      // Magazine modal
│   │   ├── ReportsSidebar.tsx       // Situation reports
│   │   └── SettlementInfoPanel.tsx  // Settlement inspection
│   └── Charts/
│       ├── BarChart.tsx
│       ├── LineChart.tsx
│       └── PieChart.tsx
├── systems/
│   ├── newspaper/
│   │   ├── NewspaperGenerator.ts    // Content generation
│   │   ├── ScriptedEvents.ts        // Scripted event definitions
│   │   └── EmergentEvents.ts        // Emergent event detection
│   ├── desperation/
│   │   ├── DesperationCalculator.ts // Desperation metric
│   │   └── AssetManager.ts          // Asset swapping logic
│   └── reports/
│       ├── MagazineGenerator.ts
│       └── SituationReportGenerator.ts
├── rendering/
│   ├── svg/
│   │   ├── HatchPatterns.ts         // SVG pattern definitions
│   │   └── NATOSymbols.ts           // NATO symbol SVG templates
│   └── canvas/
│       ├── CanvasRenderer.ts        // Canvas fallback renderer
│       └── HatchingUtils.ts         // Canvas hatching functions
├── assets/
│   ├── hq/
│   │   ├── hq_background_stable.png      // Unified HQ (wall + desk, same for all factions)
│   │   ├── hq_background_strained.png    // Unified HQ (wall + desk, same for all factions)
│   │   ├── hq_background_critical.png    // Unified HQ (wall + desk, same for all factions)
│   │   └── hq_background_desperate.png   // Unified HQ (wall + desk, same for all factions)
│   ├── crests/
│   │   ├── rbih_crest.png                // RBiH coat of arms sprite overlay
│   │   ├── rs_crest.png                  // RS coat of arms sprite overlay
│   │   └── hrhb_crest.png                // HRHB coat of arms sprite overlay
│   ├── props/
│   │   ├── headgear_rbih_stable.png      // Faction headgear sprite overlays
│   │   ├── headgear_rbih_desperate.png
│   │   ├── headgear_rs_stable.png
│   │   ├── headgear_rs_desperate.png
│   │   ├── headgear_hrhb_stable.png
│   │   ├── headgear_hrhb_desperate.png
│   │   ├── ashtray_*.png (4 variants)    // Desperation sprite overlays
│   │   ├── coffee_*.png (4 variants)     // Desperation sprite overlays
│   │   ├── newspaper_*.png (templates)
│   │   └── magazine_*.png (templates)
│   ├── map/
│   │   ├── topographic_base.png
│   │   └── annotations_*.png (4 variants)
│   └── fonts/
│       ├── stencil.ttf
│       └── courier_typewriter.ttf
└── styles/
    ├── hq.module.scss
    ├── map.module.scss
    ├── newspaper.module.scss
    └── desperation.module.scss
```

### 8.3 Performance Optimization

**Settlement Rendering Optimization**:
```typescript
// Use spatial indexing for fast lookups
class SettlementIndex {
  private rtree: RBush<Settlement>; // R-tree spatial index

  constructor(settlements: Settlement[]) {
    this.rtree = new RBush();
    this.rtree.load(settlements.map(s => ({
      minX: s.bounds.minX,
      minY: s.bounds.minY,
      maxX: s.bounds.maxX,
      maxY: s.bounds.maxY,
      settlement: s
    })));
  }

  getVisibleSettlements(viewport: Bounds): Settlement[] {
    return this.rtree.search(viewport).map(item => item.settlement);
  }
}

// Only render settlements in viewport
function renderVisibleSettlements(viewport: Bounds, zoom: number) {
  const visible = settlementIndex.getVisibleSettlements(viewport);

  if (zoom < 2.0) {
    // Strategic zoom: cluster settlements
    const clusters = clusterByControlState(visible);
    renderClusters(clusters);
  } else {
    // Tactical zoom: render individual settlements
    visible.forEach(s => renderSettlement(s));
  }
}
```

**Canvas vs SVG Decision**:
```typescript
// Use Canvas for high settlement counts, SVG for clarity
const CANVAS_THRESHOLD = 500; // Switch to Canvas if >500 settlements visible

function selectRenderer(visibleCount: number): 'svg' | 'canvas' {
  return visibleCount > CANVAS_THRESHOLD ? 'canvas' : 'svg';
}
```

**Asset Preloading**:
```typescript
// Preload all desperation variant assets on game load
async function preloadAssets() {
  const assetPaths = [
    ...Object.values(desperationAssetMap).flatMap(a => [
      a.background, a.ashtray, a.coffee, a.papers, a.mapOverlay
    ]),
    '/assets/map/topographic_base.png',
    // ... all other assets
  ];

  await Promise.all(assetPaths.map(path => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = path;
    });
  }));
}
```

---

## 9. Roadmap Integration and Timeline

### 9.1 Alignment with ROADMAP_v1_0.md

**This UI specification implements Phase G (UI Prototype)**:

**ROADMAP Phase G Requirements**:
> - Implement strategic map presentation (settlements, municipalities, control, optional fronts/supply)
> - Implement municipality and settlement inspection (click or select to see control, population, forces, exhaustion, authority)
> - Implement population, forces, exhaustion overview (faction-level or summary)
> - Implement phase indicator and turn feedback (current phase, turn number, key events)
> - Implement explicit uncertainty and delay signaling

**How This Spec Addresses Requirements**:

| Requirement | Implementation in This Spec |
|-------------|----------------------------|
| Strategic map presentation | Wall map with NATO tactical style, settlement-level control zones, zoom levels 0-2 |
| Settlement inspection | Level 3 zoom → info panel with control, stability, demographics |
| Overview (population, forces, exhaustion) | Monthly magazine (detailed statistics), newspapers (narrative summaries) |
| Phase indicator | Clock + turn display on wall, newspaper dates |
| Uncertainty and delay signaling | Newspapers (1 turn delay), magazines (1 week delay), situation reports (1-2 turn delay), fog of war accuracy ratings |

### 9.2 Implementation Timeline

**Total Duration: 12-15 days** (fits within Phase G scope)

#### **Phase G.1 — Core HQ Interface (Days 1-5)**

**Day 1: Asset Creation**
- Commission or generate 4 unified HQ background illustrations (Sora + Photoshop processing)
  - hq_background_stable.png, hq_background_strained.png, hq_background_critical.png, hq_background_desperate.png
  - These are identical for all three factions (wall + desk combined image)
- Create faction-specific sprite overlays:
  - National crests (3 variants: RBiH, RS, HRHB)
  - Military headgear (6 variants: 3 factions × 2 states)
- Create desperation sprite overlays:
  - Ashtray states (4 variants: stable, strained, critical, desperate)
  - Coffee cup states (4 variants: stable, strained, critical, desperate)
- **Deliverable**: 4 unified HQ backgrounds (2048x1152) + sprite sheets with transparent backgrounds

**Day 2: HQ Scene Layout**
- Implement HQScene.tsx component
- Position wall map section (70%) and desk section (30%)
- Define interactive object hotspots (JSON config)
- Implement hover/click system for objects
- **Deliverable**: Clickable HQ interface with hotspot detection

**Day 3: Desperation System**
- Implement DesperationCalculator.ts
- Implement asset swapping logic
- Wire desperation to game state (authority, exhaustion, supply, territorial)
- **Deliverable**: HQ visuals update based on faction situation

**Day 4-5: Wall Map (Strategic Level)**
- Implement TacticalMap.tsx with SVG rendering
- Render topographic base layer
- Render settlement control zones with NATO hatching patterns
- Implement Level 0 (strategic overview)
- **Deliverable**: Functional strategic map showing faction control

#### **Phase G.2 — Map Interaction & Zoom (Days 6-8)**

**Day 6: Zoom System**
- Implement zoom levels 0-3 with smooth transitions
- Implement click-to-zoom behavior
- Implement LOD settlement clustering
- **Deliverable**: Multi-level zoom working

**Day 7: Settlement Detail Rendering**
- Implement Level 2 (tactical) settlement rendering
- Render individual settlement polygons with hatching
- Optimize performance (spatial indexing)
- **Deliverable**: Settlement-level detail visible at tactical zoom

**Day 8: Settlement Info Panel**
- Implement SettlementInfoPanel.tsx
- Display control, stability, demographics, Control Strain
- Wire to settlement click at Level 2
- **Deliverable**: Settlement inspection working

#### **Phase G.3 — Newspapers & Reports (Days 9-12)**

**Day 9: Newspaper System**
- Implement NewspaperGenerator.ts
- Create newspaper template HTML/CSS
- Implement scripted events (referendum, massacres)
- **Deliverable**: Newspapers generate from game state

**Day 10: Newspaper Overlay**
- Implement NewspaperOverlay.tsx modal
- Render front page with headline, lead story, photo
- Implement news photo generation (map screenshot → halftone filter)
- **Deliverable**: Clickable newspaper opens overlay

**Day 11: Monthly Magazine**
- Implement MagazineGenerator.ts
- Create magazine template HTML/CSS
- Implement chart generation (Chart.js)
- **Deliverable**: Magazine generates monthly statistics

**Day 12: Situation Reports**
- Implement SituationReportGenerator.ts
- Create report template (typewriter style)
- Implement ReportsSidebar.tsx
- **Deliverable**: Situation reports available

#### **Phase G.4 — Polish & Testing (Days 13-15)**

**Day 13: Visual Polish**
- Refine hover states and transitions
- Add lighting effects (desperation states)
- Optimize asset loading
- **Deliverable**: Smooth interactions

**Day 14: Integration Testing**
- Test all interactive objects
- Test zoom transitions
- Test desperation state changes
- **Deliverable**: Bug-free UI

**Day 15: Documentation & Handoff**
- Update PROJECT_LEDGER.md
- Create user-facing documentation
- **Deliverable**: Phase G complete

### 9.3 Dependencies and Prerequisites

**Before Phase G Begins (Required)**:
- ✓ Phase A complete (state, turn pipeline, serialization)
- ✓ Phase B complete (Phase 0 implemented, game state has referendum, declarations)
- ✓ Phase C complete (Phase I implemented, control flips, militia, Control Strain)
- ✓ Phase D complete (authority, supply, exhaustion systems)

**Data Requirements**:
- Settlement geometry (from `settlements_substrate.geojson`)
- Topographic base layer (from terrain pipeline H6.2, or placeholder)
- Faction state (control, authority, exhaustion from game state)

**Optional Enhancements (Post-v1.0)**:
- Telephone (diplomacy panel) — requires pre-negotiation system
- Radio (international news) — requires external event system
- Player-created map annotations — requires drawing tool

---

## 10. Design Validation and Success Criteria

### 10.1 Phase G Validation Tests (from ROADMAP_v1_0.md)

**Required Validation**:
> - **Player can answer "What do I control, at what cost?":** Manual or scripted check that control and cost (exhaustion, forces, supply) are visible and interpretable.
> - **No false precision/certainty:** Review that delayed or uncertain information is not presented as exact or guaranteed.

**How This Design Validates**:

| Validation Criterion | Implementation |
|---------------------|----------------|
| **"What do I control?"** | Map shows settlement-level control with zoom levels, info panel provides details |
| **"At what cost?"** | Desperation indicators (ashtray, coffee, lighting), monthly magazine (exhaustion statistics), newspapers (casualty estimates) |
| **No false precision** | Newspapers: 1 turn delay, ~85% accuracy; Situation reports: 1-2 turn delay, 60-80% accuracy; Magazine: 1 week delay; All reports explicitly show delay and confidence levels |

### 10.2 User Experience Success Metrics

**Qualitative Goals**:
1. **Atmosphere**: Player feels like political leadership in 1990s command center
2. **Information flow**: Player understands events through period-appropriate media (newspapers, reports)
3. **Strategic focus**: Player cannot micro-manage tactical details (zoom restrictions prevent this)
4. **Narrative clarity**: Game state changes are contextualized into readable stories
5. **Desperation feedback**: Player perceives faction's situation intuitively (ashtray overflow = bad)

**Quantitative Goals** (user testing):
- 90%+ users can identify controlling faction of a settlement within 10 seconds
- 80%+ users notice desperation indicators without prompting
- 75%+ users read at least one newspaper per session
- 95%+ users successfully zoom to operational level

### 10.3 Accessibility Considerations

**Color Blindness**:
- Hatching patterns differentiate factions (not color alone)
- Red/blue/green chosen to maximize contrast for deuteranopia
- Optional high-contrast mode (solid fills instead of hatching)

**Readability**:
- Minimum font size: 12pt for body text, 18pt for headlines
- High contrast text (black on white/beige backgrounds)
- Newspaper/magazine text is scrollable and zoomable

**Performance**:
- 60 FPS target on mid-range hardware (2016 laptop)
- Fallback to Canvas rendering if SVG performance degrades
- Progressive enhancement (3D WebGL → 2D Canvas → 2D SVG)

---

## 11. Future Enhancements (Post-v1.0)

### 11.1 Phase H+ Features

**Telephone (Diplomacy)**:
- Click red telephone → diplomacy panel opens
- Contact opposing factions, UN mediators, international actors
- Negotiate ceasefires, safe corridors, peace talks
- Requires pre-negotiation diplomacy system (Phase D expansion)

**Radio (International News)**:
- Click radio → news ticker overlay
- Shows international reactions (UN resolutions, foreign press)
- External pressure events (sanctions, airstrikes, UNPROFOR deployment)
- Requires external event system

**Player Map Annotations**:
- Grease pencil tool for marking map
- Draw arrows, circles, text notes
- Annotations saved with game state
- Requires drawing tool implementation

**Animated Transitions**:
- Control zone color changes animate over 500ms (smooth flips)
- Frontline movement animations
- Displacement flow arrows (animated refugees)

### 11.2 Multiplayer Considerations

**If multiplayer implemented**:
- Each player sees their faction's HQ (different newspapers, reports)
- Enemy positions shown with uncertainty (fog of war)
- Diplomatic communications via in-game telephone
- Shared map with hidden information

### 11.3 Modding Support

**Customizable Elements**:
- Faction colors and patterns (JSON config)
- Newspaper templates (HTML/CSS)
- HQ backgrounds (PNG swapping)
- Desperation thresholds (tuning parameters)

---

## 12. Handoff Checklist for Implementation Team

### 12.1 Before Starting Implementation

- [ ] Read this entire document (UI_DESIGN_SPECIFICATION.md)
- [ ] Review ROADMAP_v1_0.md Phase G section
- [ ] Review Phase_0_Specification_v0_4_0.md and Phase_I_Specification_v0_4_0.md (understand game systems)
- [ ] Review Engine_Invariants_v0_4_0.md (understand constraints)
- [ ] Verify Phase A, B, C, D are complete (check PROJECT_LEDGER.md)
- [ ] Confirm game state schema includes: control, authority, exhaustion, supply, referendum state

### 12.2 Asset Requirements

**Unified HQ Backgrounds** (same for all factions):
- [ ] Commission or generate 4 HQ background illustrations (wall + desk combined, see §2.3, §4.2)
  - [ ] hq_background_stable.png (2048x1152)
  - [ ] hq_background_strained.png (2048x1152)
  - [ ] hq_background_critical.png (2048x1152)
  - [ ] hq_background_desperate.png (2048x1152)

**Faction-Specific Sprite Overlays** (rendered on top of unified HQ):
- [ ] National crests (3 factions, transparent PNG, 512x512):
  - [ ] RBiH coat of arms (white shield, six golden fleur-de-lis)
  - [ ] RS coat of arms (Serbian cross, tricolor shield, eagle)
  - [ ] HRHB coat of arms (red-white checkerboard, golden crown)
- [ ] Military headgear (3 factions × 2 states = 6 variants, transparent PNG):
  - [ ] RBiH green beret (stable + desperate)
  - [ ] RS šajkača field cap (stable + desperate)
  - [ ] HRHB peaked officer's cap (stable + desperate)

**Desperation Sprite Overlays** (same for all factions):
- [ ] Ashtray states (4 variants, transparent PNG):
  - [ ] ashtray_stable.png (1-2 cigarettes)
  - [ ] ashtray_strained.png (5-7 cigarettes)
  - [ ] ashtray_critical.png (10-15 cigarettes)
  - [ ] ashtray_desperate.png (18+ overflowing)
- [ ] Coffee cup states (4 variants, transparent PNG):
  - [ ] coffee_stable.png (single cup, clean)
  - [ ] coffee_strained.png (empty cup, stained)
  - [ ] coffee_critical.png (2 cups, one empty)
  - [ ] coffee_desperate.png (3+ cups, one spilled)
- [ ] Obtain topographic base layer (or create placeholder)
- [ ] Prepare newspaper and magazine templates (HTML mockups)
- [ ] License or create fonts (stencil for map labels, courier for reports)

### 12.3 Technical Setup

- [ ] Set up React + TypeScript project (if not already)
- [ ] Install dependencies: D3.js, Chart.js, RBush (spatial index)
- [ ] Create file structure (see §8.2)
- [ ] Configure SVG pattern definitions (see §3.5)
- [ ] Set up CSS Modules/SCSS

### 12.4 Development Milestones

- [ ] **Milestone 1 (Day 5)**: HQ scene with clickable objects, desperation system working
- [ ] **Milestone 2 (Day 8)**: Map with zoom levels 0-2, settlement inspection working
- [ ] **Milestone 3 (Day 12)**: Newspapers, magazine, situation reports functional
- [ ] **Milestone 4 (Day 15)**: Phase G complete, all validation tests passing

### 12.5 Testing Requirements

- [ ] Manual test: Click every interactive object (newspaper, magazine, reports, map)
- [ ] Manual test: Zoom through all levels (0 → 1 → 2 → 3 → back to 0)
- [ ] Manual test: Change desperation state (modify game state, verify HQ updates)
- [ ] Manual test: Read newspaper for scripted event (referendum, massacre)
- [ ] Performance test: 1000+ settlements rendered at tactical zoom (60 FPS minimum)
- [ ] Validation test: "What do I control, at what cost?" (see §10.1)

### 12.6 Documentation Deliverables

- [ ] Update PROJECT_LEDGER.md with Phase G completion entry
- [ ] Create user-facing guide (how to interact with HQ, read newspapers, use map)
- [ ] Document any deviations from this spec (with justification)
- [ ] Create developer notes for future maintainers

---

## 13. Appendix: Code Examples

### 13.1 Complete HQScene Component

```typescript
import React, { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { calculateDesperation } from '../systems/desperation/DesperationCalculator';
import { DeskSection } from './DeskSection';
import { WallMapSection } from './WallMapSection';
import styles from '../styles/hq.module.scss';

export const HQScene: React.FC = () => {
  const gameState = useGameState();
  const [desperation, setDesperation] = useState<DesperationMetrics | null>(null);
  const [currentZoom, setCurrentZoom] = useState(0);

  useEffect(() => {
    if (gameState) {
      const desp = calculateDesperation(gameState, gameState.playerFaction);
      setDesperation(desp);
    }
  }, [gameState]);

  return (
    <div className={styles.hqScene} style={{ filter: desperation?.assets.lightingFilter }}>
      {/* Wall Section (70%) */}
      <WallMapSection
        gameState={gameState}
        currentZoom={currentZoom}
        onZoomChange={setCurrentZoom}
      />

      {/* Desk Section (30%) */}
      <DeskSection
        gameState={gameState}
        desperation={desperation}
      />
    </div>
  );
};
```

### 13.2 Interactive Object Component

```typescript
import React, { useState } from 'react';
import styles from '../styles/interactive-object.module.scss';

interface InteractiveObjectProps {
  id: string;
  imageSrc: string;
  bounds: { x: number; y: number; width: number; height: number };
  tooltip?: string;
  onClick: () => void;
}

export const InteractiveObject: React.FC<InteractiveObjectProps> = ({
  id,
  imageSrc,
  bounds,
  tooltip,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`${styles.interactiveObject} ${isHovered ? styles.hovered : ''}`}
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        backgroundImage: `url(${imageSrc})`,
        cursor: 'pointer'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      role="button"
      aria-label={tooltip || id}
    >
      {isHovered && tooltip && (
        <div className={styles.tooltip}>{tooltip}</div>
      )}
    </div>
  );
};
```

### 13.3 Settlement Control Zone Renderer

```typescript
import React from 'react';
import { Settlement, Faction } from '../types/game';

interface ControlZoneProps {
  settlement: Settlement;
  faction: Faction;
  opacity: number; // Based on authority state
}

export const ControlZone: React.FC<ControlZoneProps> = ({
  settlement,
  faction,
  opacity
}) => {
  const patternId = `hatch-${faction.id}`;
  const pathData = settlementPolygonToSVGPath(settlement.geometry);

  return (
    <g>
      {/* Fill with hatching pattern */}
      <path
        d={pathData}
        fill={`url(#${patternId})`}
        opacity={opacity}
        stroke="rgb(40, 40, 40)"
        strokeWidth={1.5}
      />
    </g>
  );
};

function settlementPolygonToSVGPath(geometry: Polygon): string {
  return geometry.coordinates
    .map((coord, i) => `${i === 0 ? 'M' : 'L'} ${coord.x} ${coord.y}`)
    .join(' ') + ' Z';
}
```

### 13.4 Newspaper Content Generator

```typescript
export class NewspaperGenerator {

  generateDailyPaper(
    state: GameState,
    faction: Faction,
    turn: number
  ): NewspaperReport {
    const previousTurn = turn - 1;

    // Check scripted events first
    const scriptedEvent = this.checkScriptedEvents(state, previousTurn);
    if (scriptedEvent) {
      return this.generateScriptedNewspaper(scriptedEvent, faction, turn);
    }

    // Otherwise generate from emergent events
    const events = this.extractEmergentEvents(state, previousTurn);
    return this.generateEmergentNewspaper(events, faction, turn);
  }

  private checkScriptedEvents(state: GameState, turn: number): ScriptedEvent | null {
    // Referendum event
    if (state.meta.referendum_held && state.meta.referendum_turn === turn) {
      return {
        type: 'referendum',
        headline: 'INDEPENDENCE REFERENDUM HELD',
        subhead: 'BiH Votes to Secede from Yugoslavia',
        content: this.generateReferendumArticle(state),
        photo: this.generateReferendumPhoto()
      };
    }

    // Breadline massacre
    if (this.isBreadlineMassacre(state, turn)) {
      return {
        type: 'massacre',
        headline: 'MORTAR ATTACK KILLS 22 IN SARAJEVO',
        subhead: 'Breadline Massacre Shocks International Community',
        content: this.generateBreadlineArticle(state),
        photo: this.generateMassacrePhoto()
      };
    }

    return null;
  }

  private generateEmergentNewspaper(
    events: GameEvent[],
    faction: Faction,
    turn: number
  ): NewspaperReport {
    const topEvent = events.sort((a, b) => b.importance - a.importance)[0];

    return {
      turn: turn,
      date: this.turnToDate(turn),
      faction: faction,
      headline: {
        main: this.generateHeadline(topEvent),
        subhead: this.generateSubhead(topEvent)
      },
      leadStory: {
        type: 'emergent',
        content: this.generateLeadContent(topEvent, events),
        photo: this.generateNewsPhoto(topEvent)
      },
      sections: {
        frontlineSummary: this.generateFrontlineSummary(events),
        controlChanges: this.generateControlChangesList(events),
        diplomaticNews: this.generateDiplomaticSection(events),
        casualties: this.generateCasualtyEstimates(events),
        internationalReaction: this.generateInternationalSection(events)
      },
      accuracy: 0.85,
      delay: 1
    };
  }

  private generateHeadline(event: GameEvent): string {
    switch(event.type) {
      case 'control_flip':
        return `${event.newController} CAPTURES ${event.settlement.name.toUpperCase()}`;
      case 'corridor_cut':
        return `${event.corridor.toUpperCase()} CORRIDOR SEVERED`;
      case 'major_offensive':
        return `OFFENSIVE LAUNCHED IN ${event.region.toUpperCase()}`;
      default:
        return 'FIGHTING INTENSIFIES ON EASTERN FRONT';
    }
  }
}
```

---

## 14. Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| v1.0 | 2026-02-02 | Initial specification | Design Team |

---

**END OF UI DESIGN SPECIFICATION**

This document is ready for handoff to implementation team. All design decisions are final and align with AWWV canon (Engine Invariants, Phase Specifications, Roadmap v1.0).
