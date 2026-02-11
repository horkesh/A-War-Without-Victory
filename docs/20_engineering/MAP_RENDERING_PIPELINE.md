# Map Rendering Pipeline — NATO Tactical Aesthetic

**Project:** A War Without Victory
**Version:** v1.0
**Date:** 2026-02-03
**Purpose:** Technical specification for rendering settlement-level substrate data as NATO-style tactical maps

---

## 1. Overview

**Goal**: Transform settlement-level GeoJSON substrate data into period-accurate NATO tactical maps matching 1990s US Joint Chiefs planning map aesthetic (see reference images).

**Input**: `settlements_substrate.geojson` with ~1,000 settlements, each with:
- Geometry (polygon boundaries)
- Control state (faction_id, authority_state)
- Demographics (population, ethnic_composition)
- Infrastructure (urban/rural classification)

**Output**: Layered 2D canvas/SVG rendering with NATO tactical cartography styling

---

## 2. Rendering Pipeline Architecture

### 2.1 Layer Stack (Bottom to Top)

**Layer 0: Topographic Base** (static, pre-rendered)
- Aged paper texture (beige/tan `rgb(235, 225, 205)`)
- Elevation contour lines (brown `rgb(139, 90, 43)`)
- Rivers and water bodies (blue `rgb(100, 150, 200)`)
- Road network (black lines, varying width)
- Forest/vegetation (green stippling `rgb(150, 180, 120)`)

**Layer 1: Control Zones** (dynamic, updates each turn)
- Settlement polygons filled with faction-colored hatching patterns
- Opacity determined by authority state (consolidated 85%, contested 60%, fragmented 40%)

**Layer 2: Frontlines** (dynamic, Phase II only)
- Thick black dashed lines between opposing faction zones
- Calculated from settlement adjacency graph

**Layer 3: City Markers** (static reference)
- Black squares (5×5px) for major cities
- City names in stencil capitals (12pt black)
- Only cities with population >50,000

**Layer 4: Unit Symbols** (dynamic, Phase II only)
- NATO APP-6 rectangles showing brigade/corps positions
- Positioned at corps headquarters settlements

**Layer 5: Phase Lines** (dynamic, optional)
- Thick colored lines (yellow, black) showing operational boundaries
- Hand-drawn aesthetic with slight wobble

**Layer 6: Annotations** (dynamic, based on desperation)
- Grease pencil marks (red, black)
- Pushpins (red, white, yellow)
- Hand-drawn arrows
- Density increases with desperation level

**Layer 7: Grid & Classification** (static overlay)
- UTM grid reference numbers along edges (8pt black)
- "TOP SECRET" stamp (upper left, red)
- "SECRET NOFORN" stamp (lower right, red)

---

## 3. Layer-by-Layer Implementation

### 3.1 Layer 0: Topographic Base

**Implementation Approach**: Pre-render static base layer once, cache as PNG

**Data Sources**:
- Digital Elevation Model (DEM): SRTM data for Bosnia and Herzegovina
- Hydrography: OpenStreetMap water bodies and rivers
- Road network: OpenStreetMap roads
- Land cover: Corine Land Cover or similar dataset

**Rendering Process**:
```typescript
class TopographicBaseRenderer {
  async generateBaselayer(): Promise<HTMLCanvasElement> {
    const canvas = createCanvas(2400, 1800); // High-res base
    const ctx = canvas.getContext('2d');

    // 1. Fill with aged paper texture
    ctx.fillStyle = '#ebe1cd'; // Beige base
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.applyPaperTexture(ctx);

    // 2. Draw elevation contours (from DEM data)
    await this.renderContourLines(ctx, demData, {
      color: 'rgb(139, 90, 43)',
      interval: 100, // 100m contour interval
      lineWidth: 0.8
    });

    // 3. Draw rivers and water bodies
    await this.renderHydrography(ctx, waterBodies, {
      rivers: { color: 'rgb(100, 150, 200)', lineWidth: 1.5 },
      lakes: { fillColor: 'rgba(100, 150, 200, 0.3)' }
    });

    // 4. Draw road network
    await this.renderRoads(ctx, roadNetwork, {
      highway: { color: 'rgb(40, 40, 40)', lineWidth: 2.5 },
      primary: { color: 'rgb(60, 60, 60)', lineWidth: 1.5 },
      secondary: { color: 'rgb(80, 80, 80)', lineWidth: 1.0 }
    });

    // 5. Draw forest/vegetation (stippling pattern)
    await this.renderVegetation(ctx, landCover, {
      pattern: 'stipple', // Small dots
      color: 'rgb(150, 180, 120)',
      density: 0.3
    });

    return canvas;
  }

  private applyPaperTexture(ctx: CanvasRenderingContext2D) {
    // Apply noise filter for aged paper effect
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const noise = (Math.random() - 0.5) * 15; // ±7.5 brightness variation
      pixels[i] += noise;     // R
      pixels[i + 1] += noise; // G
      pixels[i + 2] += noise; // B
    }

    ctx.putImageData(imageData, 0, 0);
  }
}
```

**Simplification (if DEM/OSM data unavailable)**:
- Use simplified hand-drawn style (see reference images)
- Major rivers only (Sava, Drina, Neretva, Una, Bosna)
- Stylized contour lines (not actual elevation data)
- Major roads only (M-routes)

---

### 3.2 Layer 1: Control Zones (Faction Hatching)

**Core Challenge**: Convert ~1,000 settlement polygons → Simplified faction control zones

**Approach**: **Settlement clustering by faction + Convex hull / Alpha shape**

#### 3.2.1 Settlement Clustering Algorithm

```typescript
interface SettlementCluster {
  faction: FactionId;
  settlements: Settlement[];
  boundary: Polygon; // Computed convex hull or alpha shape
  authorityState: 'consolidated' | 'contested' | 'fragmented';
}

class ControlZoneGenerator {
  /**
   * Clusters settlements by faction and generates simplified zone boundaries
   */
  generateControlZones(gameState: GameState): SettlementCluster[] {
    const clusters: SettlementCluster[] = [];

    // Group settlements by faction
    const factionGroups = this.groupSettlementsByFaction(gameState.settlements);

    for (const [factionId, settlements] of factionGroups) {
      // Subdivide large faction groups into regional clusters
      const regionalClusters = this.subdivideByProximity(settlements, {
        maxClusterRadius: 50_000 // 50km max cluster span
      });

      for (const clusterSettlements of regionalClusters) {
        const boundary = this.computeClusterBoundary(clusterSettlements);
        const authorityState = this.computeAverageAuthorityState(clusterSettlements);

        clusters.push({
          faction: factionId,
          settlements: clusterSettlements,
          boundary,
          authorityState
        });
      }
    }

    return clusters;
  }

  /**
   * Computes simplified boundary around settlement cluster
   * Uses alpha shape (concave hull) for more natural boundaries
   */
  private computeClusterBoundary(settlements: Settlement[]): Polygon {
    // Extract centroids of all settlements in cluster
    const points = settlements.map(s => s.geometry.centroid);

    // Option A: Convex hull (simpler, more angular)
    // return convexHull(points);

    // Option B: Alpha shape (more natural, follows terrain)
    return alphaShape(points, { alpha: 0.1 }); // Alpha = 0.1 for moderate concavity
  }

  /**
   * Computes average authority state across cluster
   */
  private computeAverageAuthorityState(settlements: Settlement[]): AuthorityState {
    const avgAuthority = settlements.reduce((sum, s) =>
      sum + s.control.authority, 0) / settlements.length;

    if (avgAuthority >= 0.7) return 'consolidated';
    if (avgAuthority >= 0.4) return 'contested';
    return 'fragmented';
  }
}
```

#### 3.2.2 Control Zone Fill Rendering

**Visual Approach**:
- **Consolidated/Stable control**: Solid color fill (clean, clear ownership)
- **Contested/Fragmented areas**: Crosshatch pattern (visual uncertainty indicator)

**Faction Color Palette** (solid fills):
```typescript
const factionColors = {
  RS: 'rgb(180, 50, 50)',      // Crimson red
  RBiH: 'rgb(70, 120, 80)',    // Forest green
  HRHB: 'rgb(60, 100, 140)',   // Steel blue
  contested: 'crosshatch'       // Mixed pattern for contested areas
};
```

**Crosshatch Pattern for Contested Areas**:
```typescript
const contestedPattern = `
  <pattern id="crosshatch-contested" patternUnits="userSpaceOnUse" width="10" height="10">
    <!-- Diagonal lines NE-SW -->
    <line x1="0" y1="0" x2="10" y2="10" stroke="rgb(80, 80, 80)" stroke-width="1"/>
    <!-- Diagonal lines NW-SE -->
    <line x1="10" y1="0" x2="0" y2="10" stroke="rgb(80, 80, 80)" stroke-width="1"/>
  </pattern>
`;
```

**Rendering Control Zones**:
```typescript
class ControlZoneRenderer {
  renderControlZones(ctx: CanvasRenderingContext2D, zones: SettlementCluster[]) {
    for (const zone of zones) {
      // Determine fill style based on authority state
      let fillStyle: string | CanvasPattern;
      let opacity: number;

      switch (zone.authorityState) {
        case 'consolidated':
          // Solid faction color, high opacity (clear control)
          fillStyle = this.getFactionColor(zone.faction);
          opacity = 0.75;
          break;

        case 'contested':
          // Crosshatch pattern (uncertainty indicator)
          fillStyle = this.getContestedPattern(zone.faction);
          opacity = 0.60;
          break;

        case 'fragmented':
          // Lighter solid color or sparse crosshatch (collapsing control)
          fillStyle = this.getFactionColor(zone.faction);
          opacity = 0.35;
          break;
      }

      // Fill zone boundary
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = fillStyle;
      this.fillPolygon(ctx, zone.boundary);
      ctx.restore();

      // Draw zone outline (black, thin)
      ctx.strokeStyle = 'rgb(40, 40, 40)';
      ctx.lineWidth = 1.5;
      this.strokePolygon(ctx, zone.boundary);
    }
  }

  private getFactionColor(faction: FactionId): string {
    return {
      RS: 'rgb(180, 50, 50)',
      RBiH: 'rgb(70, 120, 80)',
      HRHB: 'rgb(60, 100, 140)'
    }[faction];
  }

  private getContestedPattern(faction: FactionId): CanvasPattern {
    // Create crosshatch pattern with faction color
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 10;
    patternCanvas.height = 10;
    const pctx = patternCanvas.getContext('2d')!;

    const color = this.getFactionColor(faction);
    pctx.strokeStyle = color;
    pctx.lineWidth = 1;

    // Diagonal lines
    pctx.beginPath();
    pctx.moveTo(0, 0);
    pctx.lineTo(10, 10);
    pctx.moveTo(10, 0);
    pctx.lineTo(0, 10);
    pctx.stroke();

    return ctx.createPattern(patternCanvas, 'repeat')!;
  }
}
```

---

### 3.3 Layer 2: Frontlines

**Definition**: Frontline = boundary between adjacent zones controlled by different factions

**Algorithm**: Compute zone adjacency graph, extract inter-faction edges

```typescript
class FrontlineGenerator {
  /**
   * Generates frontline segments from control zones
   */
  generateFrontlines(zones: SettlementCluster[]): LineSegment[] {
    const frontlines: LineSegment[] = [];

    // Build spatial index for fast adjacency queries
    const zoneIndex = new RBush<SettlementCluster>();
    zoneIndex.load(zones.map(z => ({
      minX: z.boundary.bbox.minX,
      minY: z.boundary.bbox.minY,
      maxX: z.boundary.bbox.maxX,
      maxY: z.boundary.bbox.maxY,
      zone: z
    })));

    // For each zone, find adjacent zones controlled by different factions
    for (const zone of zones) {
      const adjacentZones = zoneIndex.search(zone.boundary.bbox)
        .map(item => item.zone)
        .filter(adjZone => adjZone !== zone && adjZone.faction !== zone.faction);

      for (const adjZone of adjacentZones) {
        // Compute shared boundary between zones
        const sharedBoundary = this.computeSharedBoundary(
          zone.boundary,
          adjZone.boundary
        );

        if (sharedBoundary) {
          frontlines.push({
            start: sharedBoundary.start,
            end: sharedBoundary.end,
            factions: [zone.faction, adjZone.faction]
          });
        }
      }
    }

    // Merge adjacent frontline segments into longer lines
    return this.mergeFrontlineSegments(frontlines);
  }

  /**
   * Renders frontlines with hand-drawn aesthetic
   */
  renderFrontlines(ctx: CanvasRenderingContext2D, frontlines: LineSegment[]) {
    ctx.strokeStyle = 'rgb(30, 30, 30)';
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 10]); // Dashed line pattern

    for (const line of frontlines) {
      // Add slight "wobble" for hand-drawn effect
      const wobbledLine = this.applyHandDrawnWobble(line, {
        amplitude: 2, // ±2px variation
        frequency: 20  // Variation every 20px
      });

      ctx.beginPath();
      ctx.moveTo(wobbledLine[0].x, wobbledLine[0].y);
      for (let i = 1; i < wobbledLine.length; i++) {
        ctx.lineTo(wobbledLine[i].x, wobbledLine[i].y);
      }
      ctx.stroke();
    }

    ctx.setLineDash([]); // Reset dash pattern
  }
}
```

---

### 3.4 Layer 3: City Markers

**Purpose**: Show major cities as reference points (not all 1,000 settlements)

**Selection Criteria**:
- Population > 50,000 (major cities only)
- Strategic importance (capitals, major hubs)

**Rendering**:
```typescript
class CityMarkerRenderer {
  renderCityMarkers(ctx: CanvasRenderingContext2D, settlements: Settlement[]) {
    // Filter to major cities
    const majorCities = settlements.filter(s =>
      s.demographics.population > 50_000 || s.isStrategic
    );

    ctx.fillStyle = 'rgb(30, 30, 30)';
    ctx.font = 'bold 12px "OCR A", "Courier New", monospace';
    ctx.textAlign = 'center';

    for (const city of majorCities) {
      const pos = city.geometry.centroid;

      // Draw city marker (black square)
      ctx.fillRect(pos.x - 2.5, pos.y - 2.5, 5, 5);

      // Draw city name in stencil capitals
      ctx.fillText(city.name.toUpperCase(), pos.x, pos.y - 8);
    }
  }
}
```

---

### 3.5 Layer 4: Unit Symbols (NATO APP-6)

**Purpose**: Show military unit positions (brigades, corps headquarters)

**Data Source**: Game state corps/brigade locations

**Symbol Format**: NATO APP-6A simplified rectangles

```typescript
interface UnitSymbol {
  unitId: string;
  unitType: 'corps' | 'brigade' | 'division';
  faction: FactionId;
  designation: string; // e.g., "1BCT", "2 Corps"
  location: Point;
  size: 'II' | 'III' | 'X'; // Echelon: Brigade, Regiment/Division, Corps
}

class UnitSymbolRenderer {
  renderUnitSymbols(ctx: CanvasRenderingContext2D, units: UnitSymbol[]) {
    for (const unit of units) {
      const color = this.getFactionColor(unit.faction);

      // Draw NATO APP-6 rectangle
      ctx.strokeStyle = 'rgb(30, 30, 30)';
      ctx.fillStyle = color;
      ctx.lineWidth = 2;

      const rect = { x: unit.location.x - 20, y: unit.location.y - 15, w: 40, h: 30 };
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

      // Draw echelon indicator (e.g., "II" for brigade, "III" for division)
      ctx.fillStyle = 'rgb(30, 30, 30)';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(unit.size, unit.location.x, unit.location.y - 18);

      // Draw unit designation (e.g., "1BCT")
      ctx.font = 'bold 11px Arial';
      ctx.fillText(unit.designation, unit.location.x, unit.location.y + 5);
    }
  }

  private getFactionColor(faction: FactionId): string {
    return {
      RS: 'rgb(180, 50, 50)',
      RBiH: 'rgb(70, 120, 80)',
      HRHB: 'rgb(60, 100, 140)'
    }[faction];
  }
}
```

---

### 3.6 Layer 6: Annotations (Grease Pencil)

**Purpose**: Simulate command staff annotations on map (increases with desperation)

**Annotation Types**:
- Grease pencil marks (red, black circles/arrows)
- Pushpins (red, white, yellow dots)
- Hand-drawn arrows showing movement

```typescript
class AnnotationRenderer {
  renderAnnotations(
    ctx: CanvasRenderingContext2D,
    desperation: DesperationLevel,
    mapBounds: Bounds
  ) {
    const annotationDensity = {
      stable: 10,
      strained: 30,
      critical: 60,
      desperate: 100
    }[desperation];

    // Generate random annotation positions
    const annotations = this.generateRandomAnnotations(
      annotationDensity,
      mapBounds
    );

    for (const annotation of annotations) {
      switch (annotation.type) {
        case 'circle':
          this.drawGreasePencilCircle(ctx, annotation.position, {
            color: annotation.color,
            radius: annotation.radius
          });
          break;
        case 'arrow':
          this.drawGreasePencilArrow(ctx, annotation.start, annotation.end, {
            color: annotation.color
          });
          break;
        case 'pushpin':
          this.drawPushpin(ctx, annotation.position, annotation.color);
          break;
      }
    }
  }

  private drawGreasePencilCircle(
    ctx: CanvasRenderingContext2D,
    center: Point,
    opts: { color: string, radius: number }
  ) {
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.7;

    // Draw circle with hand-drawn wobble
    ctx.beginPath();
    for (let angle = 0; angle <= Math.PI * 2; angle += 0.1) {
      const wobble = (Math.random() - 0.5) * 2;
      const r = opts.radius + wobble;
      const x = center.x + Math.cos(angle) * r;
      const y = center.y + Math.sin(angle) * r;
      if (angle === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.globalAlpha = 1.0;
  }
}
```

---

## 4. Complete Rendering Pipeline

### 4.1 Main Renderer Class

```typescript
class TacticalMapRenderer {
  private baseLayer: HTMLCanvasElement;
  private controlZoneGenerator: ControlZoneGenerator;
  private frontlineGenerator: FrontlineGenerator;
  private cityMarkerRenderer: CityMarkerRenderer;
  private unitSymbolRenderer: UnitSymbolRenderer;
  private annotationRenderer: AnnotationRenderer;

  constructor() {
    // Pre-render static base layer
    this.baseLayer = await new TopographicBaseRenderer().generateBaselayer();

    this.controlZoneGenerator = new ControlZoneGenerator();
    this.frontlineGenerator = new FrontlineGenerator();
    this.cityMarkerRenderer = new CityMarkerRenderer();
    this.unitSymbolRenderer = new UnitSymbolRenderer();
    this.annotationRenderer = new AnnotationRenderer();
  }

  /**
   * Renders complete tactical map for current game state
   */
  renderMap(gameState: GameState, desperation: DesperationMetrics): HTMLCanvasElement {
    const canvas = createCanvas(1200, 900); // Map display size
    const ctx = canvas.getContext('2d');

    // Layer 0: Topographic base (static)
    ctx.drawImage(this.baseLayer, 0, 0, canvas.width, canvas.height);

    // Layer 1: Control zones (faction hatching)
    const controlZones = this.controlZoneGenerator.generateControlZones(gameState);
    new ControlZoneRenderer().renderControlZones(ctx, controlZones);

    // Layer 2: Frontlines (Phase II only)
    if (gameState.phase >= 2) {
      const frontlines = this.frontlineGenerator.generateFrontlines(controlZones);
      this.frontlineGenerator.renderFrontlines(ctx, frontlines);
    }

    // Layer 3: City markers
    this.cityMarkerRenderer.renderCityMarkers(ctx, gameState.settlements);

    // Layer 4: Unit symbols (Phase II only)
    if (gameState.phase >= 2) {
      const units = this.extractUnitSymbols(gameState);
      this.unitSymbolRenderer.renderUnitSymbols(ctx, units);
    }

    // Layer 6: Annotations (desperation-based)
    this.annotationRenderer.renderAnnotations(
      ctx,
      desperation.level,
      { minX: 0, minY: 0, maxX: canvas.width, maxY: canvas.height }
    );

    // Layer 7: Grid and classification stamps
    this.renderGridAndStamps(ctx, canvas.width, canvas.height);

    return canvas;
  }

  /**
   * Renders UTM grid and classification stamps
   */
  private renderGridAndStamps(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // UTM grid numbers along edges
    ctx.fillStyle = 'rgb(60, 60, 60)';
    ctx.font = '8px Arial';

    // Top edge (E-W coordinates)
    for (let i = 0; i < 10; i++) {
      const x = (width / 10) * i + (width / 20);
      ctx.fillText(`E${i}`, x, 12);
    }

    // Left edge (N-S coordinates)
    for (let i = 0; i < 10; i++) {
      const y = (height / 10) * i + (height / 20);
      ctx.fillText(`${50 + i}`, 8, y);
    }

    // Classification stamps
    ctx.fillStyle = 'rgb(200, 20, 20)';
    ctx.font = 'bold 14px Arial';

    // TOP SECRET (upper left)
    ctx.save();
    ctx.translate(80, 40);
    ctx.rotate(-0.1); // Slight angle
    ctx.strokeStyle = 'rgb(200, 20, 20)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-5, -15, 100, 20);
    ctx.fillText('TOP SECRET', 0, 0);
    ctx.restore();

    // SECRET NOFORN (lower right)
    ctx.save();
    ctx.translate(width - 120, height - 30);
    ctx.rotate(0.08);
    ctx.strokeRect(-5, -15, 130, 20);
    ctx.fillText('SECRET NOFORN', 0, 0);
    ctx.restore();
  }
}
```

---

## 5. Performance Optimizations

### 5.1 Caching Strategy

**Problem**: Re-rendering entire map each frame is expensive

**Solution**: Layer-based caching

```typescript
class CachedTacticalMapRenderer {
  private layerCache: Map<string, HTMLCanvasElement> = new Map();

  renderMap(gameState: GameState, desperation: DesperationMetrics): HTMLCanvasElement {
    // Cache key based on relevant game state
    const cacheKey = this.generateCacheKey(gameState, desperation);

    if (this.layerCache.has(cacheKey)) {
      return this.layerCache.get(cacheKey)!;
    }

    // Render map (expensive operation)
    const renderedMap = this.performFullRender(gameState, desperation);

    // Cache result
    this.layerCache.set(cacheKey, renderedMap);

    // Limit cache size (keep last 5 renders)
    if (this.layerCache.size > 5) {
      const oldestKey = this.layerCache.keys().next().value;
      this.layerCache.delete(oldestKey);
    }

    return renderedMap;
  }

  private generateCacheKey(gameState: GameState, desperation: DesperationMetrics): string {
    // Cache key includes:
    // - Turn number
    // - Desperation level
    // - Hash of control state (which faction controls which settlements)
    const controlHash = this.hashControlState(gameState.settlements);
    return `turn-${gameState.turn}_desp-${desperation.level}_ctrl-${controlHash}`;
  }
}
```

### 5.2 Level-of-Detail (LOD) Rendering

**Zoom Level 0 (Strategic)**: Show simplified faction zones (10-20 clusters)
**Zoom Level 1 (Operational)**: Show regional clusters (50-100 zones)
**Zoom Level 2 (Tactical)**: Show settlement-level detail (~1,000 settlements)

---

## 6. Export to Wall Map (Canvas-to-Image)

**Integration with HQ Interface**:

```typescript
class WallMapExporter {
  /**
   * Exports tactical map as static PNG for display on HQ wall
   */
  exportAsWallMap(gameState: GameState, desperation: DesperationMetrics): string {
    const renderer = new TacticalMapRenderer();
    const mapCanvas = renderer.renderMap(gameState, desperation);

    // Convert to WebP data URL for efficient display
    return mapCanvas.toDataURL('image/webp', 0.92);
  }
}
```

This exported image becomes the wall map displayed in the HQ background (see UI_DESIGN_SPECIFICATION.md §3.7).

---

## 7. Summary

**Pipeline Flow**:
```
settlements_substrate.geojson
  → Cluster by faction (10-100 zones)
  → Compute zone boundaries (alpha shape)
  → Render topographic base
  → Fill zones with faction hatching patterns
  → Draw frontlines between opposing zones
  → Add city markers (major cities only)
  → Add unit symbols (NATO APP-6)
  → Add grease pencil annotations
  → Add grid and classification stamps
  → Export as PNG/WebP for HQ wall display
```

**Key Libraries**:
- **Turf.js**: Geospatial operations (convex hull, alpha shape, polygon intersection)
- **RBush**: Spatial indexing for fast adjacency queries
- **Canvas API**: Rendering (or SVG for vector output)
- **D3.js**: Optional, for geo projections if using real lat/lon coordinates

This pipeline transforms your settlement-level substrate into period-accurate NATO tactical maps matching the reference aesthetic!
