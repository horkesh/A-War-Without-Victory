/**
 * Tactical Map — main application orchestrator.
 * Creates canvas, loads data, wires modules, and starts the render loop.
 */

import type { LoadedData, SettlementFeature, ViewTransform, RenderContext, FormationView } from './types.js';
import { MapState } from './state/MapState.js';
import { MapProjection } from './geo/MapProjection.js';
import { SpatialIndex } from './geo/SpatialIndex.js';
import { computeFeatureBBox } from './geo/MapProjection.js';
import { loadAllData } from './data/DataLoader.js';
import { ZOOM_LABELS, ZOOM_FACTORS, NATO_TOKENS, SIDE_COLORS, SIDE_SOLID_COLORS, SIDE_LABELS, ETHNICITY_COLORS, ETHNICITY_LABELS, HATCH_SIZE, BASE_LAYER_COLORS, BASE_LAYER_WIDTHS, FRONT_LINE, MINIMAP, formatTurnDate, FORMATION_KIND_SHAPES, FORMATION_MARKER_SIZE, FORMATION_HIT_RADIUS } from './constants.js';
import { controlKey, censusIdFromSid, buildControlLookup, buildStatusLookup } from './data/ControlLookup.js';
import { parseGameState } from './data/GameStateAdapter.js';
import { normalizeForSearch } from './data/DataLoader.js';
import type { PolygonCoords, Position } from './types.js';

export class MapApp {
  private rootId: string;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private state: MapState;
  private projection!: MapProjection;
  private spatialIndex!: SpatialIndex<SettlementFeature>;
  private data!: LoadedData;

  // Cached render data
  private baseLayerCache: HTMLCanvasElement | null = null;
  private baseLayerCacheKey = '';
  private hatchPattern: CanvasPattern | null = null;

  // Interaction state
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private panStartCenterX = 0;
  private panStartCenterY = 0;
  private panDragDistance = 0;
  private zoomSnapTimeout: ReturnType<typeof setTimeout> | null = null;
  private hoveredFeature: SettlementFeature | null = null;
  private pendingRender = false;
  private searchVisible = false;

  // Baseline control data for dataset switching
  private baselineControlLookup: Record<string, string | null> = {};
  private baselineStatusLookup: Record<string, string> = {};

  // Active control data (may come from loaded state or alternate dataset)
  private activeControlLookup: Record<string, string | null> = {};
  private activeStatusLookup: Record<string, string> = {};

  constructor(rootId: string) {
    this.rootId = rootId;
    this.state = new MapState();
  }

  async init(): Promise<void> {
    const statusEl = document.getElementById('status')!;
    const canvas = document.getElementById('map-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not available');
    this.canvas = canvas;
    this.ctx = ctx;

    // Load data
    this.data = await loadAllData((p) => {
      statusEl.textContent = p.stage;
    });

    // Store baseline control data
    this.baselineControlLookup = { ...this.data.controlLookup };
    this.baselineStatusLookup = { ...this.data.statusLookup };
    this.activeControlLookup = { ...this.data.controlLookup };
    this.activeStatusLookup = { ...this.data.statusLookup };

    // Initialize projection
    this.projection = new MapProjection(this.data.dataBounds);

    // Build spatial index
    this.spatialIndex = new SpatialIndex(this.data.dataBounds);
    for (const [, feature] of this.data.settlements) {
      this.spatialIndex.insert(feature, computeFeatureBBox(feature));
    }

    // Wire state changes → render
    this.state.subscribe(() => this.scheduleRender());

    // Wire UI
    this.wireInteraction();
    this.wireUI();

    // Sync Color-by select and legend to initial state
    const fillModeSelect = document.getElementById('settlement-fill-mode') as HTMLSelectElement | null;
    if (fillModeSelect) fillModeSelect.value = this.state.snapshot.settlementFillMode;
    this.updateLegendContent();

    // Initial render
    statusEl.textContent = '';
    statusEl.classList.add('hidden');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.canvas.focus();
  }

  // ─── Rendering ──────────────────────────────────

  private scheduleRender(): void {
    if (this.pendingRender) return;
    this.pendingRender = true;
    requestAnimationFrame(() => {
      this.pendingRender = false;
      this.render();
    });
  }

  private resize(): void {
    const wrap = this.canvas.parentElement;
    if (!wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(wrap.clientWidth * dpr);
    const h = Math.floor(wrap.clientHeight * dpr);
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = `${wrap.clientWidth}px`;
    this.canvas.style.height = `${wrap.clientHeight}px`;
    this.baseLayerCache = null; // Invalidate cache
    this.render();
  }

  private getViewTransform(): ViewTransform {
    const { zoomFactor, panCenter } = this.state.snapshot;
    return this.projection.computeTransform(
      this.canvas.width, this.canvas.height, zoomFactor, panCenter,
    );
  }

  private getRenderContext(): RenderContext {
    const vt = this.getViewTransform();
    const { zoomLevel, zoomFactor, layers } = this.state.snapshot;
    return {
      ctx: this.ctx,
      width: this.canvas.width,
      height: this.canvas.height,
      dpr: window.devicePixelRatio || 1,
      viewTransform: vt,
      project: (x, y) => this.projection.project(x, y, vt),
      unproject: (x, y) => this.projection.unproject(x, y, vt),
      zoomLevel,
      zoomFactor,
      layers,
    };
  }

  private render(): void {
    const rc = this.getRenderContext();
    const { ctx, width: w, height: h } = rc;

    // 1. Clear + background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = NATO_TOKENS.paper;
    ctx.fillRect(0, 0, w, h);

    // 2. Base layers (cached offscreen — boundary/rivers/roads always drawn)
    this.drawBaseLayersCached(rc);

    // 3. Settlement polygons
    this.drawSettlements(rc);

    // 4. Front lines
    if (rc.layers.frontLines && rc.zoomLevel >= 1) {
      this.drawFrontLines(rc);
    }

    // 5. Formation markers
    if (rc.layers.formations && this.state.snapshot.loadedGameState) {
      this.drawFormations(rc);
    }

    // 5b. Brigade AoR highlight (selected formation's AoR settlements)
    if (rc.layers.brigadeAor && this.state.snapshot.loadedGameState && this.state.snapshot.selectedFormationId) {
      this.drawBrigadeAoRHighlight(rc);
    }

    // 6. Selection highlight
    this.drawSelection(rc);

    // 7. Labels
    if (rc.layers.labels) {
      this.drawLabels(rc);
    }

    // 8. Minimap
    if (rc.layers.minimap) {
      this.drawMinimap();
    }
  }

  // ─── Base Layer Rendering (Cached) ──────────────

  private drawBaseLayersCached(rc: RenderContext): void {
    const key = `${rc.zoomFactor.toFixed(4)}:${rc.viewTransform.viewBox.minX.toFixed(2)}:${rc.viewTransform.viewBox.minY.toFixed(2)}:${rc.width}:${rc.height}:${rc.layers.munBorders}`;
    if (this.baseLayerCache && this.baseLayerCacheKey === key) {
      rc.ctx.drawImage(this.baseLayerCache, 0, 0);
      return;
    }

    // Create/resize offscreen canvas
    if (!this.baseLayerCache || this.baseLayerCache.width !== rc.width || this.baseLayerCache.height !== rc.height) {
      this.baseLayerCache = document.createElement('canvas');
      this.baseLayerCache.width = rc.width;
      this.baseLayerCache.height = rc.height;
    }
    const offCtx = this.baseLayerCache.getContext('2d')!;
    offCtx.clearRect(0, 0, rc.width, rc.height);

    const project = rc.project;

    // Boundary (always drawn — base geography)
    for (const bf of this.data.baseFeatures.boundary) {
      offCtx.strokeStyle = BASE_LAYER_COLORS.boundary;
      offCtx.lineWidth = BASE_LAYER_WIDTHS.boundary;
      this.drawGeoFeaturePath(offCtx, bf.geometry, project);
      offCtx.stroke();
    }

    // Municipality borders
    if (rc.layers.munBorders) {
      for (const cr of this.data.baseFeatures.controlRegions) {
        offCtx.fillStyle = BASE_LAYER_COLORS.controlRegionFill;
        offCtx.strokeStyle = BASE_LAYER_COLORS.controlRegionStroke;
        offCtx.lineWidth = BASE_LAYER_WIDTHS.controlRegion;
        this.drawGeoFeaturePath(offCtx, cr.geometry, project);
        offCtx.fill();
        offCtx.stroke();
      }
    }

    // Rivers (always drawn — base geography)
    offCtx.strokeStyle = BASE_LAYER_COLORS.river;
    offCtx.lineWidth = BASE_LAYER_WIDTHS.river;
    offCtx.beginPath();
    for (const rf of this.data.baseFeatures.rivers) {
      this.traceLinePath(offCtx, rf.geometry, project);
    }
    offCtx.stroke();

    // Roads — secondary first (under MSR) (always drawn — base geography)
    offCtx.strokeStyle = BASE_LAYER_COLORS.roadSecondary;
    offCtx.lineWidth = BASE_LAYER_WIDTHS.roadSecondary;
    offCtx.beginPath();
    for (const rf of this.data.baseFeatures.roadsSecondary) {
      this.traceLinePath(offCtx, rf.geometry, project);
    }
    offCtx.stroke();

    offCtx.strokeStyle = BASE_LAYER_COLORS.roadMSR;
    offCtx.lineWidth = BASE_LAYER_WIDTHS.roadMSR;
    offCtx.beginPath();
    for (const rf of this.data.baseFeatures.roadsMSR) {
      this.traceLinePath(offCtx, rf.geometry, project);
    }
    offCtx.stroke();

    this.baseLayerCacheKey = key;
    rc.ctx.drawImage(this.baseLayerCache, 0, 0);
  }

  private drawGeoFeaturePath(
    ctx: CanvasRenderingContext2D,
    geometry: { type: string; coordinates: unknown },
    project: (x: number, y: number) => [number, number],
  ): void {
    ctx.beginPath();
    if (geometry.type === 'Polygon') {
      const polys = [geometry.coordinates as PolygonCoords];
      for (const poly of polys) {
        for (const ring of poly) {
          for (let i = 0; i < ring.length; i++) {
            const [x, y] = ring[i];
            const [sx, sy] = project(x, y);
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.closePath();
        }
      }
    } else if (geometry.type === 'MultiPolygon') {
      const multiCoords = geometry.coordinates as PolygonCoords[];
      for (const poly of multiCoords) {
        for (const ring of poly) {
          for (let i = 0; i < ring.length; i++) {
            const [x, y] = ring[i] as Position;
            const [sx, sy] = project(x, y);
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.closePath();
        }
      }
    } else if (geometry.type === 'LineString') {
      this.traceLinePath(ctx, geometry as { type: string; coordinates: Position[] }, project);
    }
  }

  private traceLinePath(
    ctx: CanvasRenderingContext2D,
    geometry: { type: string; coordinates: unknown },
    project: (x: number, y: number) => [number, number],
  ): void {
    if (geometry.type === 'LineString') {
      const coords = geometry.coordinates as Position[];
      for (let i = 0; i < coords.length; i++) {
        const [sx, sy] = project(coords[i][0], coords[i][1]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
    } else if (geometry.type === 'MultiLineString') {
      const lines = geometry.coordinates as Position[][];
      for (const line of lines) {
        for (let i = 0; i < line.length; i++) {
          const [sx, sy] = project(line[i][0], line[i][1]);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
      }
    }
  }

  // ─── Settlement Rendering ───────────────────────

  private getHatchPattern(): CanvasPattern | null {
    if (this.hatchPattern) return this.hatchPattern;
    const c = document.createElement('canvas');
    c.width = HATCH_SIZE; c.height = HATCH_SIZE;
    const pctx = c.getContext('2d');
    if (!pctx) return null;
    pctx.strokeStyle = '#000';
    pctx.lineWidth = 1;
    pctx.beginPath();
    pctx.moveTo(0, 0); pctx.lineTo(HATCH_SIZE, HATCH_SIZE);
    pctx.moveTo(HATCH_SIZE, 0); pctx.lineTo(0, HATCH_SIZE);
    pctx.stroke();
    this.hatchPattern = this.ctx.createPattern(c, 'repeat');
    return this.hatchPattern;
  }

  private drawPolygonPath(
    ctx: CanvasRenderingContext2D,
    feature: SettlementFeature,
    project: (x: number, y: number) => [number, number],
  ): void {
    const polys: PolygonCoords[] = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
    ctx.beginPath();
    for (const poly of polys) {
      for (const ring of poly) {
        for (let i = 0; i < ring.length; i++) {
          const [x, y] = ring[i];
          const [sx, sy] = project(x, y);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
      }
    }
  }

  /**
   * Resolve majority ethnicity for a settlement (lowercase key for ETHNICITY_COLORS).
   * Prefers ethnicityData.by_settlement_id[sid].majority, then feature.properties.majority_ethnicity.
   */
  private getMajorityEthnicity(sid: string, feature: SettlementFeature): string | null {
    const fromData = this.data.ethnicityData?.by_settlement_id?.[sid]?.majority;
    const raw = (fromData ?? feature.properties.majority_ethnicity ?? '').trim();
    if (!raw) return null;
    const key = raw.toLowerCase();
    if (key === 'bosniak' || key === 'serb' || key === 'croat') return key;
    return 'other';
  }

  private drawSettlements(rc: RenderContext): void {
    const { ctx } = rc;
    const controllers = this.activeControlLookup;
    const controlStatus = this.activeStatusLookup;
    const contestedPattern = rc.layers.contestedZones ? this.getHatchPattern() : null;
    const fillMode = this.state.snapshot.settlementFillMode;

    const sidOrder = Array.from(this.data.settlements.keys()).sort();
    for (const sid of sidOrder) {
      const feature = this.data.settlements.get(sid)!;
      const key = controlKey(sid);
      const controller = controllers[key] ?? controllers[sid] ?? 'null';
      const status = controlStatus[key] ?? controlStatus[sid];
      const isContested = rc.layers.contestedZones && (status === 'CONTESTED' || status === 'HIGHLY_CONTESTED');

      if (!rc.layers.politicalControl) {
        ctx.fillStyle = 'rgba(120,120,120,0.2)';
      } else if (fillMode === 'ethnic_majority') {
        const ethnicityKey = this.getMajorityEthnicity(sid, feature);
        ctx.fillStyle = ethnicityKey ? (ETHNICITY_COLORS[ethnicityKey] ?? ETHNICITY_COLORS.other) : ETHNICITY_COLORS.other;
      } else {
        ctx.fillStyle = SIDE_COLORS[controller] ?? SIDE_COLORS['null'];
      }
      this.drawPolygonPath(ctx, feature, rc.project);
      ctx.fill();

      if (rc.layers.politicalControl && isContested && contestedPattern) {
        ctx.save();
        ctx.fillStyle = contestedPattern;
        this.drawPolygonPath(ctx, feature, rc.project);
        ctx.clip('evenodd');
        ctx.fillRect(0, 0, rc.width, rc.height);
        ctx.restore();
      }
    }
  }

  // ─── Front Lines ────────────────────────────────

  private drawFrontLines(rc: RenderContext): void {
    const controllers = this.activeControlLookup;
    const { ctx } = rc;

    ctx.save();
    ctx.strokeStyle = FRONT_LINE.color;
    ctx.lineWidth = FRONT_LINE.width;
    ctx.setLineDash(FRONT_LINE.dash);
    ctx.beginPath();
    for (const seg of this.data.sharedBorders) {
      const ca = controllers[seg.a] ?? controllers[controlKey(seg.a)] ?? null;
      const cb = controllers[seg.b] ?? controllers[controlKey(seg.b)] ?? null;
      if (ca != null && cb != null && ca !== cb) {
        for (let i = 0; i < seg.points.length; i++) {
          const [sx, sy] = rc.project(seg.points[i][0], seg.points[i][1]);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  // ─── Formation Markers ──────────────────────────

  /**
   * Resolve data position for a formation: hq_sid settlement centroid or municipality centroid.
   * When HQ is in enemy-controlled territory, use fallback: first AoR settlement centroid, else municipality centroid.
   */
  private getFormationPosition(f: import('./types.js').FormationView): [number, number] | null {
    const gs = this.state.snapshot.loadedGameState;
    let useFallback = false;
    if (f.hq_sid && gs) {
      const controllerAtHq = this.activeControlLookup[controlKey(f.hq_sid)] ?? this.activeControlLookup[f.hq_sid];
      if (controllerAtHq !== null && controllerAtHq !== f.faction) {
        useFallback = true; // HQ in enemy territory
      }
    }
    if (f.hq_sid && !useFallback) {
      const c = this.data.settlementCentroids.get(f.hq_sid);
      if (c) return c;
    }
    if (useFallback && gs) {
      const aorSids = gs.brigadeAorByFormationId[f.id] ?? f.aorSettlementIds;
      if (aorSids && aorSids.length > 0) {
        const firstSid = aorSids[0];
        const c = this.data.settlementCentroids.get(firstSid);
        if (c) return c;
      }
    }
    if (f.municipalityId) {
      const c = this.data.municipalityCentroids.get(f.municipalityId);
      if (c) return c;
    }
    return null;
  }

  /**
   * Draw a NATO-style formation marker: rectangular frame (1.5:1) with black border and faction fill,
   * inner symbol by kind (infantry/brigade = bar, corps/operational = diamond, militia = triangle).
   */
  private drawNatoFormationMarker(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    w: number,
    h: number,
    shape: string,
    color: string
  ): void {
    const left = sx - w / 2;
    const top = sy - h / 2;

    // Frame: rectangle with faction fill and black outline
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.fillRect(left, top, w, h);
    ctx.strokeRect(left, top, w, h);

    // Inner symbol (centered, ~50% of frame)
    const iw = w * 0.4;
    const ih = h * 0.4;
    ctx.fillStyle = '#000';
    ctx.strokeStyle = 'none';

    if (shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(sx, sy - ih);
      ctx.lineTo(sx + iw / 2, sy);
      ctx.lineTo(sx, sy + ih);
      ctx.lineTo(sx - iw / 2, sy);
      ctx.closePath();
      ctx.fill();
    } else if (shape === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(sx, sy - ih);
      ctx.lineTo(sx + iw / 2, sy + ih);
      ctx.lineTo(sx - iw / 2, sy + ih);
      ctx.closePath();
      ctx.fill();
    } else {
      // Infantry/brigade: vertical bar (NATO infantry indicator)
      const bw = Math.max(2, iw * 0.35);
      const bh = ih;
      ctx.fillRect(sx - bw / 2, sy - bh / 2, bw, bh);
    }
  }

  private drawFormations(rc: RenderContext): void {
    const gs = this.state.snapshot.loadedGameState;
    if (!gs) return;

    const { ctx } = rc;
    const dim = FORMATION_MARKER_SIZE[rc.zoomLevel];
    const formations = [...gs.formations].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    for (const f of formations) {
      const pos = this.getFormationPosition(f);
      if (!pos) continue;
      if (!this.projection.isInViewport(
        { minX: pos[0] - 1, minY: pos[1] - 1, maxX: pos[0] + 1, maxY: pos[1] + 1 },
        rc.viewTransform,
      )) continue;

      const [sx, sy] = rc.project(pos[0], pos[1]);
      const color = SIDE_SOLID_COLORS[f.faction] ?? SIDE_SOLID_COLORS['null'];
      const shape = FORMATION_KIND_SHAPES[f.kind] ?? 'square';
      this.drawNatoFormationMarker(ctx, sx, sy, dim.w, dim.h, shape, color);
    }
  }

  /** Return formation at canvas coords when formations layer is on; otherwise null. */
  private getFormationAtScreenPos(canvasX: number, canvasY: number): import('./types.js').FormationView | null {
    const gs = this.state.snapshot.loadedGameState;
    if (!gs || !this.state.snapshot.layers.formations) return null;
    const rc = this.getRenderContext();
    const formations = [...gs.formations].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    for (const f of formations) {
      const pos = this.getFormationPosition(f);
      if (!pos) continue;
      const [sx, sy] = rc.project(pos[0], pos[1]);
      const dx = canvasX - sx;
      const dy = canvasY - sy;
      if (dx * dx + dy * dy <= FORMATION_HIT_RADIUS * FORMATION_HIT_RADIUS) return f;
    }
    return null;
  }

  // ─── Selection ──────────────────────────────────

  private drawBrigadeAoRHighlight(rc: RenderContext): void {
    const gs = this.state.snapshot.loadedGameState;
    const formationId = this.state.snapshot.selectedFormationId;
    if (!gs || !formationId) return;
    const aorSids = gs.brigadeAorByFormationId[formationId];
    if (!aorSids || aorSids.length === 0) return;
    const formation = gs.formations.find((f) => f.id === formationId);
    const factionColor = formation ? (SIDE_SOLID_COLORS[formation.faction] ?? '#888') : '#888';
    const { ctx } = rc;
    ctx.save();
    ctx.strokeStyle = factionColor;
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 4]);
    ctx.fillStyle = 'rgba(128, 128, 128, 0.12)';
    for (const sid of aorSids) {
      const feature = this.data.settlements.get(sid);
      if (!feature) continue;
      this.drawPolygonPath(ctx, feature, rc.project);
      ctx.fill();
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  private drawSelection(rc: RenderContext): void {
    const selectedSid = this.state.snapshot.selectedSettlementSid;
    const hoveredSid = this.state.snapshot.hoveredSettlementSid;
    const { ctx } = rc;

    if (hoveredSid && hoveredSid !== selectedSid) {
      const feature = this.data.settlements.get(hoveredSid);
      if (feature) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        this.drawPolygonPath(ctx, feature, rc.project);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (selectedSid) {
      const feature = this.data.settlements.get(selectedSid);
      if (feature) {
        const controller = this.activeControlLookup[controlKey(selectedSid)] ?? 'null';
        ctx.save();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        this.drawPolygonPath(ctx, feature, rc.project);
        ctx.stroke();
        ctx.strokeStyle = SIDE_SOLID_COLORS[controller] ?? '#888';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ─── Labels ─────────────────────────────────────

  private drawLabels(rc: RenderContext): void {
    const { ctx, zoomLevel } = rc;
    const vt = rc.viewTransform;
    const primarySids = this.data.primaryLabelSids;

    for (const entry of this.data.searchIndex) {
      // LOD filter
      if (zoomLevel === 0 && entry.natoClass !== 'URBAN_CENTER') continue;
      if (zoomLevel === 1 && entry.natoClass !== 'URBAN_CENTER' && entry.natoClass !== 'TOWN') continue;

      // At strategic/operational zoom, only show primary label for each display name
      // (avoids overlapping "Sarajevo Dio -..." variants)
      if (zoomLevel <= 1 && entry.natoClass === 'URBAN_CENTER' && !primarySids.has(entry.sid)) continue;

      // Viewport culling
      if (!this.projection.isInViewport(entry.bbox, vt)) continue;

      const [sx, sy] = rc.project(entry.centroid[0], entry.centroid[1]);

      // Use displayName at strategic/operational, full name at tactical
      const label = zoomLevel <= 1 ? entry.displayName : entry.name;

      // Font sizing by class
      if (entry.natoClass === 'URBAN_CENTER') {
        ctx.font = 'bold 12px Arial';
      } else if (entry.natoClass === 'TOWN') {
        ctx.font = '10px Arial';
      } else {
        ctx.font = '8px Arial';
      }

      // Halo text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.strokeStyle = `rgba(235, 225, 205, 0.85)`;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(label, sx, sy + 4);
      ctx.fillStyle = '#222';
      ctx.fillText(label, sx, sy + 4);
    }
  }

  // ─── Minimap ────────────────────────────────────

  private drawMinimap(): void {
    const minimapEl = document.getElementById('minimap') as HTMLCanvasElement | null;
    if (!minimapEl) return;
    const mctx = minimapEl.getContext('2d');
    if (!mctx) return;

    const mw = MINIMAP.width;
    const mh = MINIMAP.height;
    const bounds = this.data.dataBounds;
    const rangeX = bounds.maxX - bounds.minX;
    const rangeY = bounds.maxY - bounds.minY;
    const scale = Math.min(mw / rangeX, mh / rangeY);
    const ox = (mw - rangeX * scale) / 2;
    const oy = (mh - rangeY * scale) / 2;

    mctx.fillStyle = 'rgba(30, 28, 24, 0.9)';
    mctx.fillRect(0, 0, mw, mh);

    // Draw simplified settlements
    const controllers = this.activeControlLookup;
    for (const [sid, centroid] of this.data.settlementCentroids) {
      const controller = controllers[controlKey(sid)] ?? controllers[sid] ?? 'null';
      mctx.fillStyle = SIDE_SOLID_COLORS[controller] ?? '#888';
      const mx = (centroid[0] - bounds.minX) * scale + ox;
      const my = (centroid[1] - bounds.minY) * scale + oy;
      mctx.fillRect(mx - 1, my - 1, 2, 2);
    }

    // Draw viewport rectangle
    const vt = this.getViewTransform();
    const vb = vt.viewBox;
    const rx = (vb.minX - bounds.minX) * scale + ox;
    const ry = (vb.minY - bounds.minY) * scale + oy;
    const rw = (vb.maxX - vb.minX) * scale;
    const rh = (vb.maxY - vb.minY) * scale;
    mctx.strokeStyle = '#fff';
    mctx.lineWidth = 1;
    mctx.strokeRect(rx, ry, rw, rh);
  }

  // ─── Interaction Wiring ─────────────────────────

  private wireInteraction(): void {
    const canvas = this.canvas;

    // Wheel zoom
    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const [dataX, dataY] = this.canvasToData(e);
      if (!dataX && !dataY) return;

      let factor = this.state.snapshot.zoomFactor;
      factor -= e.deltaY * 0.0015 * factor;
      factor = Math.max(1, Math.min(5, factor));

      // Update pan center to zoom toward cursor
      const bounds = this.data.dataBounds;
      const rx = bounds.maxX - bounds.minX;
      const ry = bounds.maxY - bounds.minY;
      if (rx > 0 && ry > 0) {
        const nx = (dataX - bounds.minX) / rx;
        const ny = (dataY - bounds.minY) / ry;
        const { panCenter } = this.state.snapshot;
        // Blend toward cursor position
        const blend = 0.3;
        this.state.setPan(
          panCenter.x + (nx - panCenter.x) * blend,
          panCenter.y + (ny - panCenter.y) * blend,
        );
      }

      this.state.setZoomFactor(factor);

      // Schedule snap to nearest named level
      if (this.zoomSnapTimeout) clearTimeout(this.zoomSnapTimeout);
      this.zoomSnapTimeout = setTimeout(() => {
        const current = this.state.snapshot.zoomFactor;
        const diffs = ZOOM_FACTORS.map(f => Math.abs(current - f));
        const nearest = ZOOM_FACTORS[diffs.indexOf(Math.min(...diffs))];
        this.state.setZoomFactor(nearest);
        this.updateZoomPill();
      }, 300);
      this.updateZoomPill();
    }, { passive: false });

    // Pan: mousedown
    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      if (this.state.snapshot.zoomFactor <= 1) return;
      this.isPanning = true;
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.panStartCenterX = this.state.snapshot.panCenter.x;
      this.panStartCenterY = this.state.snapshot.panCenter.y;
      this.panDragDistance = 0;
      canvas.style.cursor = 'grabbing';
    });

    // Mousemove: pan or hover
    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isPanning) {
        const dx = e.clientX - this.panStartX;
        const dy = e.clientY - this.panStartY;
        this.panDragDistance += Math.abs(dx) + Math.abs(dy);
        const rect = canvas.getBoundingClientRect();
        const factor = this.state.snapshot.zoomFactor;
        this.state.setPan(
          this.panStartCenterX - dx / (rect.width * factor),
          this.panStartCenterY - dy / (rect.height * factor),
        );
        this.panStartX = e.clientX;
        this.panStartY = e.clientY;
        this.panStartCenterX = this.state.snapshot.panCenter.x;
        this.panStartCenterY = this.state.snapshot.panCenter.y;
        return;
      }

      // Hover hit test: formations layer takes precedence (icon hit), then settlement polygon
      const rect = canvas.getBoundingClientRect();
      const canvasX = ((e.clientX - rect.left) * (canvas.width / rect.width));
      const canvasY = ((e.clientY - rect.top) * (canvas.height / rect.height));
      const formationAt = this.getFormationAtScreenPos(canvasX, canvasY);

      this.hoveredFeature = null;
      if (formationAt?.hq_sid && this.data.settlements.get(formationAt.hq_sid)) {
        this.hoveredFeature = this.data.settlements.get(formationAt.hq_sid)!;
      }
      if (!this.hoveredFeature) {
        const [dataX, dataY] = this.canvasToData(e);
        if (dataX !== 0 || dataY !== 0) {
          const candidates = this.spatialIndex.queryPoint(dataX, dataY);
          for (const feature of candidates) {
            if (this.pointInPolygon(dataX, dataY, feature)) {
              this.hoveredFeature = feature;
              break;
            }
          }
        }
      }

      const hoveredSid = this.hoveredFeature?.properties?.sid ?? null;
      this.state.setHoveredSettlement(hoveredSid);

      if (formationAt && this.hoveredFeature) {
        this.showTooltip(`${formationAt.name} (${formationAt.kind}) — ${formationAt.faction}`, e.clientX, e.clientY);
        canvas.style.cursor = this.state.snapshot.zoomFactor > 1 ? 'grab' : 'pointer';
      } else if (this.hoveredFeature) {
        const sid = this.hoveredFeature.properties.sid;
        const name = this.hoveredFeature.properties.name ?? sid;
        const pop = this.hoveredFeature.properties.pop;
        const popStr = pop != null ? pop.toLocaleString() : '—';
        const fillMode = this.state.snapshot.settlementFillMode;
        const subtitle = fillMode === 'ethnic_majority'
          ? (ETHNICITY_LABELS[this.getMajorityEthnicity(sid, this.hoveredFeature) ?? 'other'] ?? 'Other') + ' majority'
          : (SIDE_LABELS[this.activeControlLookup[controlKey(sid)] ?? 'null'] ?? 'Neutral');
        this.showTooltip(`${name} — ${subtitle} — pop ${popStr}`, e.clientX, e.clientY);
        canvas.style.cursor = this.state.snapshot.zoomFactor > 1 ? 'grab' : 'pointer';
      } else {
        this.hideTooltip();
        canvas.style.cursor = this.state.snapshot.zoomFactor > 1 ? 'grab' : 'default';
      }
    });

    // Mouseup: end pan, record whether it was a drag
    let lastWasDrag = false;
    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        lastWasDrag = this.panDragDistance > 5;
        this.isPanning = false;
        canvas.style.cursor = this.state.snapshot.zoomFactor > 1 ? 'grab' : 'default';
      } else {
        lastWasDrag = false;
      }
    });

    canvas.addEventListener('mouseleave', () => {
      this.hoveredFeature = null;
      this.state.setHoveredSettlement(null);
      this.hideTooltip();
    });

    // Click: select settlement (or formation HQ when over a formation icon)
    canvas.addEventListener('click', (e: MouseEvent) => {
      if (lastWasDrag) { lastWasDrag = false; return; }
      const rect = canvas.getBoundingClientRect();
      const canvasX = ((e.clientX - rect.left) * (canvas.width / rect.width));
      const canvasY = ((e.clientY - rect.top) * (canvas.height / rect.height));
      const formationAt = this.getFormationAtScreenPos(canvasX, canvasY);
      if (formationAt) {
        this.state.setSelectedFormation(formationAt.id);
        this.state.setSelectedSettlement(null);
        this.openBrigadePanel(formationAt);
        return;
      }
      this.state.setSelectedFormation(null);
      if (this.hoveredFeature) {
        const sid = this.hoveredFeature.properties.sid;
        this.state.setSelectedSettlement(sid);
        this.openSettlementPanel(sid);
      } else {
        this.state.setSelectedSettlement(null);
        this.closeSettlementPanel();
      }
    });

    // Keyboard
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName ?? '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      if (e.key === 'Escape') {
        if (this.searchVisible) { this.hideSearch(); e.preventDefault(); return; }
        if (this.state.snapshot.selectedFormationId) {
          this.state.setSelectedFormation(null); this.closeSettlementPanel();
          e.preventDefault(); return;
        }
        if (this.state.snapshot.selectedSettlementSid) {
          this.state.setSelectedSettlement(null); this.closeSettlementPanel();
          e.preventDefault(); return;
        }
        if (this.state.snapshot.zoomFactor > 1) {
          this.state.setZoomFactor(1); this.updateZoomPill();
          e.preventDefault(); return;
        }
      }
      if (e.key === '/' || (e.ctrlKey && e.key === 'f')) { this.showSearch(); e.preventDefault(); }
      if (e.key === 'l' || e.key === 'L') { this.toggleLayerPanel(); e.preventDefault(); }
      if (e.key === 'o' || e.key === 'O') { this.toggleOOB(); e.preventDefault(); }
      if (e.key === '1') { this.state.setZoom(0, ZOOM_FACTORS[0]); this.updateZoomPill(); e.preventDefault(); }
      if (e.key === '2') { this.state.setZoom(1, ZOOM_FACTORS[1]); this.updateZoomPill(); e.preventDefault(); }
      if (e.key === '3') { this.state.setZoom(2, ZOOM_FACTORS[2]); this.updateZoomPill(); e.preventDefault(); }
      if (e.key === '+' || e.key === '=') { this.zoomIn(); e.preventDefault(); }
      if (e.key === '-') { this.zoomOut(); e.preventDefault(); }
      if (e.key === 'f' || e.key === 'F' || e.key === 'Home') {
        this.state.setZoom(0, 1); this.state.setPan(0.5, 0.5); this.updateZoomPill();
        e.preventDefault();
      }
      // Arrow key pan
      const panDelta = 0.05;
      if (e.key === 'ArrowLeft') { this.state.setPan(this.state.snapshot.panCenter.x - panDelta, this.state.snapshot.panCenter.y); e.preventDefault(); }
      if (e.key === 'ArrowRight') { this.state.setPan(this.state.snapshot.panCenter.x + panDelta, this.state.snapshot.panCenter.y); e.preventDefault(); }
      if (e.key === 'ArrowUp') { this.state.setPan(this.state.snapshot.panCenter.x, this.state.snapshot.panCenter.y - panDelta); e.preventDefault(); }
      if (e.key === 'ArrowDown') { this.state.setPan(this.state.snapshot.panCenter.x, this.state.snapshot.panCenter.y + panDelta); e.preventDefault(); }
    });

    // Minimap click
    document.getElementById('minimap')?.addEventListener('click', (e: MouseEvent) => {
      const el = e.currentTarget as HTMLCanvasElement;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const bounds = this.data.dataBounds;
      const rangeX = bounds.maxX - bounds.minX;
      const rangeY = bounds.maxY - bounds.minY;
      const scale = Math.min(MINIMAP.width / rangeX, MINIMAP.height / rangeY);
      const ox = (MINIMAP.width - rangeX * scale) / 2;
      const oy = (MINIMAP.height - rangeY * scale) / 2;
      const nx = (mx - ox) / (rangeX * scale);
      const ny = (my - oy) / (rangeY * scale);
      this.state.setPan(Math.max(0, Math.min(1, nx)), Math.max(0, Math.min(1, ny)));
    });
  }

  // ─── UI Wiring ──────────────────────────────────

  private wireUI(): void {
    // Zoom buttons
    document.getElementById('zoom-in')?.addEventListener('click', () => this.zoomIn());
    document.getElementById('zoom-out')?.addEventListener('click', () => this.zoomOut());
    document.getElementById('zoom-in-map')?.addEventListener('click', () => this.zoomIn());
    document.getElementById('zoom-out-map')?.addEventListener('click', () => this.zoomOut());

    // Layer toggles
    const layerMap: Array<[string, keyof typeof this.state.snapshot.layers]> = [
      ['layer-control', 'politicalControl'],
      ['layer-contested', 'contestedZones'],
      ['layer-frontlines', 'frontLines'],
      ['layer-labels', 'labels'],
      ['layer-mun-borders', 'munBorders'],
      ['layer-minimap', 'minimap'],
      ['layer-formations', 'formations'],
      ['layer-brigade-aor', 'brigadeAor'],
    ];
    for (const [elId, key] of layerMap) {
      document.getElementById(elId)?.addEventListener('change', (e) => {
        this.state.setLayer(key, (e.target as HTMLInputElement).checked);
        if (key === 'munBorders') {
          this.baseLayerCache = null; // Invalidate base layer cache
        }
        // Toggle minimap visibility
        if (key === 'minimap') {
          document.getElementById('minimap')?.classList.toggle('hidden', !this.state.snapshot.layers.minimap);
        }
      });
    }

    // Layer panel toggle
    document.getElementById('layer-panel-toggle')?.addEventListener('click', () => this.toggleLayerPanel());

    // Color by (settlement fill mode)
    const fillModeEl = document.getElementById('settlement-fill-mode') as HTMLSelectElement | null;
    fillModeEl?.addEventListener('change', () => {
      const mode = fillModeEl.value as 'political_control' | 'ethnic_majority';
      this.state.setSettlementFillMode(mode);
      this.updateLegendContent();
    });

    // Legend toggle
    document.getElementById('btn-legend')?.addEventListener('click', () => {
      document.getElementById('legend')?.classList.toggle('hidden');
    });

    // OOB toggle
    document.getElementById('btn-oob')?.addEventListener('click', () => this.toggleOOB());
    document.getElementById('oob-close')?.addEventListener('click', () => this.toggleOOB());

    // Search toggle
    document.getElementById('btn-search')?.addEventListener('click', () => this.showSearch());

    // Panel close
    document.getElementById('panel-close')?.addEventListener('click', () => {
      this.state.setSelectedSettlement(null);
      this.state.setSelectedFormation(null);
      this.closeSettlementPanel();
    });

    // Control dataset
    const datasetEl = document.getElementById('control-dataset') as HTMLSelectElement | null;
    datasetEl?.addEventListener('change', async () => {
      const value = datasetEl.value;
      if (value === 'sep1992') {
        try {
          const base = window.location.origin;
          const res = await fetch(`${base}/data/derived/political_control_data_sep1992.json`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          this.activeControlLookup = buildControlLookup(data.by_settlement_id ?? {});
          this.activeStatusLookup = buildStatusLookup(data.control_status_by_settlement_id ?? {});
          this.state.setControlDataset('sep1992');
          const turnDisplay = document.getElementById('turn-display');
          if (turnDisplay) turnDisplay.textContent = 'September 1992';
        } catch {
          // Fallback to baseline
          this.activeControlLookup = { ...this.baselineControlLookup };
          this.activeStatusLookup = { ...this.baselineStatusLookup };
          this.state.setControlDataset('baseline');
        }
      } else if (value === 'jan1993') {
        try {
          const base = window.location.origin;
          // Load the full scenario file which contains control + formations
          const res = await fetch(`${base}/data/scenarios/jan1993_start.json`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          // Parse as full game state
          const loaded = parseGameState(json);
          // Load into state (formations, militia, etc.)
          this.state.loadGameState(loaded);
          // Set control lookup from loaded state
          this.activeControlLookup = buildControlLookup(loaded.controlBySettlement);
          this.activeStatusLookup = buildStatusLookup(loaded.statusBySettlement);
          this.state.setControlDataset('jan1993');

          // Update UI elements
          const turnDisplay = document.getElementById('turn-display');
          if (turnDisplay) turnDisplay.textContent = loaded.label;

          // Enable formations and brigade AoR checkboxes
          const formCheckbox = document.getElementById('layer-formations') as HTMLInputElement | null;
          if (formCheckbox) {
            formCheckbox.disabled = false;
            formCheckbox.checked = true; // Auto-enable for visibility
            this.state.setLayer('formations', true);
          }
          const brigadeAorCheckbox = document.getElementById('layer-brigade-aor') as HTMLInputElement | null;
          if (brigadeAorCheckbox) brigadeAorCheckbox.disabled = false;

          // Update OOB sidebar
          this.updateOOBSidebar(loaded);

          this.baseLayerCache = null;
        } catch (err) {
          console.error('Failed to load Jan 1993 scenario:', err);
          const statusEl = document.getElementById('status');
          if (statusEl) {
            statusEl.textContent = `Error loading Jan 1993: ${err instanceof Error ? err.message : String(err)}`;
            statusEl.classList.remove('hidden');
          }
        }
      } else if (value === 'baseline') {
        this.activeControlLookup = { ...this.baselineControlLookup };
        this.activeStatusLookup = { ...this.baselineStatusLookup };
        this.state.setControlDataset('baseline');
        const turnDisplay = document.getElementById('turn-display');
        if (turnDisplay) turnDisplay.textContent = 'Turn 0 — Sep 1991';
      } else if (value.startsWith('loaded:')) {
        const gs = this.state.snapshot.loadedGameState;
        if (gs) {
          this.activeControlLookup = buildControlLookup(gs.controlBySettlement);
          this.activeStatusLookup = buildStatusLookup(gs.statusBySettlement);
          this.state.setControlDataset(value);
          const turnDisplay = document.getElementById('turn-display');
          if (turnDisplay) turnDisplay.textContent = gs.label;
        }
      }
      this.baseLayerCache = null;
    });

    // Load state file
    const loadBtn = document.getElementById('btn-load-state');
    const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
    loadBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const loaded = parseGameState(json);
        this.state.loadGameState(loaded);
        this.activeControlLookup = buildControlLookup(loaded.controlBySettlement);
        this.activeStatusLookup = buildStatusLookup(loaded.statusBySettlement);

        // Add to dataset dropdown
        if (datasetEl) {
          const opt = document.createElement('option');
          opt.value = `loaded:${loaded.label}`;
          opt.textContent = `Loaded: ${loaded.label}`;
          datasetEl.appendChild(opt);
          datasetEl.value = opt.value;
        }

        // Enable formations and brigade AoR checkboxes
        const formCheckbox = document.getElementById('layer-formations') as HTMLInputElement | null;
        if (formCheckbox) formCheckbox.disabled = false;
        const brigadeAorCheckbox = document.getElementById('layer-brigade-aor') as HTMLInputElement | null;
        if (brigadeAorCheckbox) brigadeAorCheckbox.disabled = false;

        // Update turn display
        const turnDisplay = document.getElementById('turn-display');
        if (turnDisplay) turnDisplay.textContent = loaded.label;

        // Update OOB sidebar
        this.updateOOBSidebar(loaded);

        this.baseLayerCache = null;
      } catch (err) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
          statusEl.textContent = `Failed to load state: ${err instanceof Error ? err.message : String(err)}`;
          statusEl.classList.remove('hidden');
          statusEl.classList.add('error');
        }
      }
      fileInput.value = '';
    });

    // Search input
    const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
    searchInput?.addEventListener('input', () => this.updateSearchResults());
    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hideSearch();
    });

    // Turn display init
    const turnDisplay = document.getElementById('turn-display');
    if (turnDisplay) turnDisplay.textContent = 'Turn 0 — Sep 1991';
  }

  // ─── Hit Testing ────────────────────────────────

  private canvasToData(e: MouseEvent): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    const vt = this.getViewTransform();
    return this.projection.unproject(cx, cy, vt);
  }

  private pointInPolygon(x: number, y: number, feature: SettlementFeature): boolean {
    const polys: PolygonCoords[] = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
    for (const poly of polys) {
      const ring = poly[0];
      if (!ring || ring.length < 3) continue;
      let inside = false;
      let j = ring.length - 1;
      for (let i = 0; i < ring.length; i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
        j = i;
      }
      if (inside) return true;
    }
    return false;
  }

  // ─── Tooltip ────────────────────────────────────

  private showTooltip(text: string, clientX: number, clientY: number): void {
    const el = document.getElementById('tooltip');
    if (!el) return;
    el.textContent = text;
    el.style.display = 'block';
    el.style.left = `${Math.min(clientX + 14, window.innerWidth - 310)}px`;
    el.style.top = `${clientY + 14}px`;
  }

  private hideTooltip(): void {
    const el = document.getElementById('tooltip');
    if (el) el.style.display = 'none';
  }

  // ─── Zoom helpers ───────────────────────────────

  private zoomIn(): void {
    const idx = ZOOM_FACTORS.indexOf(this.state.snapshot.zoomFactor as 1 | 2.5 | 5);
    const nextIdx = Math.min(ZOOM_FACTORS.length - 1, (idx >= 0 ? idx : 0) + 1);
    this.state.setZoom(nextIdx as 0 | 1 | 2, ZOOM_FACTORS[nextIdx]);
    this.updateZoomPill();
  }

  private zoomOut(): void {
    const idx = ZOOM_FACTORS.indexOf(this.state.snapshot.zoomFactor as 1 | 2.5 | 5);
    const nextIdx = Math.max(0, (idx >= 0 ? idx : ZOOM_FACTORS.length - 1) - 1);
    this.state.setZoom(nextIdx as 0 | 1 | 2, ZOOM_FACTORS[nextIdx]);
    this.updateZoomPill();
  }

  private updateZoomPill(): void {
    const el = document.getElementById('zoom-pill');
    if (el) el.textContent = ZOOM_LABELS[this.state.snapshot.zoomLevel];
  }

  // ─── Layer Panel ────────────────────────────────

  private toggleLayerPanel(): void {
    document.getElementById('layer-panel')?.classList.toggle('collapsed');
  }

  /** Update legend DOM to match current settlement fill mode. */
  private updateLegendContent(): void {
    const el = document.getElementById('legend-content');
    if (!el) return;
    const mode = this.state.snapshot.settlementFillMode;
    if (mode === 'ethnic_majority') {
      el.innerHTML = `
        <div class="tm-legend-row"><span class="tm-swatch" style="background:rgb(70,120,80)"></span> Bosniak</div>
        <div class="tm-legend-row"><span class="tm-swatch" style="background:rgb(180,50,50)"></span> Serb</div>
        <div class="tm-legend-row"><span class="tm-swatch" style="background:rgb(60,100,140)"></span> Croat</div>
        <div class="tm-legend-row"><span class="tm-swatch" style="background:rgb(100,100,100)"></span> Other</div>
        <div class="tm-legend-row">&mdash; Contested (hatch)</div>
        <div class="tm-legend-row">&mdash; &mdash; Front line (dashed)</div>`;
    } else {
      el.innerHTML = `
        <div class="tm-legend-row"><span class="tm-swatch" style="background:rgb(70,120,80)"></span> RBiH (ARBiH)</div>
        <div class="tm-legend-row"><span class="tm-swatch" style="background:rgb(180,50,50)"></span> RS (VRS)</div>
        <div class="tm-legend-row"><span class="tm-swatch" style="background:rgb(60,100,140)"></span> HRHB (HVO)</div>
        <div class="tm-legend-row"><span class="tm-swatch" style="background:rgb(100,100,100)"></span> Neutral</div>
        <div class="tm-legend-row">&mdash; Contested (hatch)</div>
        <div class="tm-legend-row">&mdash; &mdash; Front line (dashed)</div>`;
    }
  }

  // ─── Search ─────────────────────────────────────

  private showSearch(): void {
    const overlay = document.getElementById('search-overlay');
    if (!overlay) return;
    overlay.classList.remove('closed');
    this.searchVisible = true;
    const input = document.getElementById('search-input') as HTMLInputElement | null;
    input?.focus();
    input?.select();
  }

  private hideSearch(): void {
    const overlay = document.getElementById('search-overlay');
    if (!overlay) return;
    overlay.classList.add('closed');
    this.searchVisible = false;
    const results = document.getElementById('search-results');
    if (results) results.innerHTML = '';
    this.canvas.focus();
  }

  private updateSearchResults(): void {
    const input = document.getElementById('search-input') as HTMLInputElement | null;
    const resultsEl = document.getElementById('search-results');
    if (!input || !resultsEl) return;

    const query = normalizeForSearch(input.value.trim());
    resultsEl.innerHTML = '';
    if (query.length < 2) return;

    const matches = this.data.searchIndex
      .filter(e => e.nameNormalized.includes(query))
      .slice(0, 12);

    for (const match of matches) {
      const btn = document.createElement('button');
      btn.className = 'tm-search-result';
      btn.innerHTML = `${this.escapeHtml(match.name)} <span class="tm-search-result-class">${match.natoClass}</span>`;
      btn.addEventListener('click', () => {
        // Jump to settlement
        const bounds = this.data.dataBounds;
        const rx = bounds.maxX - bounds.minX;
        const ry = bounds.maxY - bounds.minY;
        this.state.setPan(
          (match.centroid[0] - bounds.minX) / rx,
          (match.centroid[1] - bounds.minY) / ry,
        );
        this.state.setZoom(2, ZOOM_FACTORS[2]);
        this.state.setSelectedSettlement(match.sid);
        this.openSettlementPanel(match.sid);
        this.updateZoomPill();
        this.hideSearch();
      });
      resultsEl.appendChild(btn);
    }
  }

  // ─── Settlement Panel ───────────────────────────

  private openSettlementPanel(sid: string): void {
    const feature = this.data.settlements.get(sid);
    if (!feature) return;

    const panel = document.getElementById('settlement-panel');
    if (!panel) return;
    panel.classList.remove('closed');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');

    const key = controlKey(sid);
    const controller = this.activeControlLookup[key] ?? this.activeControlLookup[sid] ?? 'null';
    const controlStatus = this.activeStatusLookup[key] ?? this.activeStatusLookup[sid] ?? 'CONSOLIDATED';
    const factionColor = SIDE_SOLID_COLORS[controller] ?? SIDE_SOLID_COLORS['null'];

    // Set faction accent
    panel.style.borderLeftColor = factionColor;
    panel.style.setProperty('--faction-color', factionColor);

    // Header
    const name = feature.properties.name ?? sid;
    const natoClass = feature.properties.nato_class ?? 'SETTLEMENT';
    const pop = feature.properties.pop;
    const popStr = pop != null ? pop.toLocaleString() : '—';
    const fillMode = this.state.snapshot.settlementFillMode;
    const thirdLine = fillMode === 'ethnic_majority'
      ? (ETHNICITY_LABELS[this.getMajorityEthnicity(sid, feature) ?? 'other'] ?? 'Other') + ' majority'
      : (SIDE_LABELS[controller] ?? controller);
    document.getElementById('panel-name')!.textContent = name;
    document.getElementById('panel-subtitle')!.textContent = `${natoClass} — Pop ${popStr} — ${thirdLine}`;

    // Build tabs
    this.buildPanelTabs(sid, feature, controller, controlStatus, factionColor);
  }

  private closeSettlementPanel(): void {
    const panel = document.getElementById('settlement-panel');
    if (!panel) return;
    panel.classList.add('closed');
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }

  private openBrigadePanel(f: FormationView): void {
    const panel = document.getElementById('settlement-panel');
    if (!panel) return;
    const gs = this.state.snapshot.loadedGameState;
    if (!gs) return;

    panel.classList.remove('closed');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');

    const factionColor = SIDE_SOLID_COLORS[f.faction] ?? '#888';
    panel.style.borderLeftColor = factionColor;
    panel.style.setProperty('--faction-color', factionColor);

    document.getElementById('panel-name')!.textContent = f.name;
    const subtitleParts = [f.kind, f.faction];
    if (f.personnel != null) subtitleParts.push(`${f.personnel} pers`);
    if (f.posture) subtitleParts.push(f.posture);
    document.getElementById('panel-subtitle')!.textContent = subtitleParts.join(' — ');

    const tabsEl = document.getElementById('panel-tabs')!;
    const contentEl = document.getElementById('panel-content')!;
    tabsEl.innerHTML = '';

    const aorSids = gs.brigadeAorByFormationId[f.id] ?? f.aorSettlementIds ?? [];
    const aorCount = aorSids.length;

    let html = `<div class="tm-panel-section"><div class="tm-panel-section-header">BRIGADE</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">ID</span><span class="tm-panel-field-value">${this.escapeHtml(f.id)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Faction</span><span class="tm-panel-field-value">${this.escapeHtml(f.faction)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Kind</span><span class="tm-panel-field-value">${this.escapeHtml(f.kind)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Status</span><span class="tm-panel-field-value">${this.escapeHtml(f.status)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Created (turn)</span><span class="tm-panel-field-value">${f.createdTurn}</span></div>
    </div>`;
    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">STATISTICS</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Personnel</span><span class="tm-panel-field-value">${f.personnel != null ? f.personnel.toLocaleString() : '—'}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Posture</span><span class="tm-panel-field-value">${this.escapeHtml(f.posture ?? '—')}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Fatigue</span><span class="tm-panel-field-value">${f.fatigue}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Cohesion</span><span class="tm-panel-field-value">${f.cohesion}%</span></div>
    </div>`;
    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">AREA OF RESPONSIBILITY</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Settlements</span><span class="tm-panel-field-value">${aorCount}</span></div>`;
    if (aorSids.length > 0 && aorSids.length <= 30) {
      html += `<div class="tm-panel-placeholder" style="margin-top:6px;font-size:10px">${aorSids.slice(0, 30).map(sid => this.escapeHtml(sid)).join(', ')}</div>`;
    } else if (aorSids.length > 30) {
      html += `<div class="tm-panel-placeholder" style="margin-top:6px;font-size:10px">${aorSids.slice(0, 30).map(sid => this.escapeHtml(sid)).join(', ')} … +${aorSids.length - 30} more</div>`;
    }
    html += `</div>`;

    contentEl.innerHTML = html;
  }

  private buildPanelTabs(
    sid: string,
    feature: SettlementFeature,
    controller: string,
    controlStatus: string,
    factionColor: string,
  ): void {
    const tabsEl = document.getElementById('panel-tabs')!;
    const contentEl = document.getElementById('panel-content')!;
    tabsEl.innerHTML = '';

    const tabs: Array<{ id: string; label: string }> = [
      { id: 'overview', label: 'OVER' },
      { id: 'admin', label: 'ADMIN' },
      { id: 'control', label: 'CTRL' },
      { id: 'intel', label: 'INTEL' },
    ];

    let activeTab = 'overview';

    const renderTab = (tabId: string) => {
      activeTab = tabId;
      // Update tab buttons
      tabsEl.querySelectorAll('.tm-panel-tab').forEach(btn => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tabId);
      });
      contentEl.innerHTML = '';

      if (tabId === 'overview') {
        contentEl.innerHTML = this.renderOverviewTab(sid, feature, controller, controlStatus);
      } else if (tabId === 'admin') {
        contentEl.innerHTML = this.renderAdminTab(sid, feature);
      } else if (tabId === 'control') {
        contentEl.innerHTML = this.renderControlTab(sid, controller, controlStatus, factionColor);
      } else if (tabId === 'intel') {
        contentEl.innerHTML = this.renderIntelTab(sid, feature);
      }
    };

    for (const tab of tabs) {
      const btn = document.createElement('button');
      btn.className = `tm-panel-tab ${tab.id === activeTab ? 'active' : ''}`;
      btn.textContent = tab.label;
      btn.dataset.tab = tab.id;
      btn.addEventListener('click', () => renderTab(tab.id));
      tabsEl.appendChild(btn);
    }

    renderTab('overview');
  }

  private renderOverviewTab(sid: string, feature: SettlementFeature, controller: string, controlStatus: string): string {
    const name = feature.properties.name ?? sid;
    const natoClass = feature.properties.nato_class ?? 'SETTLEMENT';
    const pop = feature.properties.pop;
    const popStr = pop != null ? pop.toLocaleString() : '—';

    let html = `<div class="tm-panel-section">
      <div class="tm-panel-section-header">IDENTIFICATION</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">SID</span><span class="tm-panel-field-value">${this.escapeHtml(sid)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Name</span><span class="tm-panel-field-value">${this.escapeHtml(name)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Type</span><span class="tm-panel-field-value">${this.escapeHtml(natoClass)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Population</span><span class="tm-panel-field-value">${this.escapeHtml(popStr)}</span></div>
    </div>`;

    // Ethnicity
    const censusId = censusIdFromSid(sid);
    const ethnicity = this.data.ethnicityData?.by_settlement_id?.[sid] ?? null;
    if (ethnicity?.composition) {
      html += `<div class="tm-panel-section"><div class="tm-panel-section-header">DEMOGRAPHICS (1991 Census)</div>`;
      for (const [group, pct] of Object.entries(ethnicity.composition)) {
        if (pct <= 0) continue;
        const pctStr = (pct * 100).toFixed(1);
        const label = group.charAt(0).toUpperCase() + group.slice(1);
        const barColor = group === 'bosniak' ? '#4a7a50' : group === 'serb' ? '#a04040' : group === 'croat' ? '#4060a0' : '#888';
        html += `<div class="tm-eth-row">
          <span class="tm-eth-label">${this.escapeHtml(label)}</span>
          <div class="tm-eth-bar"><div class="tm-eth-bar-fill" style="width:${pctStr}%;background:${barColor}"></div></div>
          <span class="tm-eth-pct">${pctStr}%</span>
        </div>`;
      }
      if (ethnicity.provenance) {
        html += `<div class="tm-panel-field" style="margin-top:4px"><span class="tm-panel-field-label">Source</span><span class="tm-panel-field-value" style="font-size:10px">${this.escapeHtml(ethnicity.provenance)}</span></div>`;
      }
      html += `</div>`;
    } else {
      html += `<div class="tm-panel-section"><div class="tm-panel-section-header">DEMOGRAPHICS</div><div class="tm-panel-placeholder">No ethnicity data available</div></div>`;
    }

    return html;
  }

  private renderAdminTab(sid: string, feature: SettlementFeature): string {
    const munId = feature.properties.municipality_id;
    const munMid = munId != null ? String(munId) : undefined;
    const munEntry = munMid ? this.data.mun1990Names.by_municipality_id?.[munMid] : undefined;
    const munName = munEntry?.display_name ?? munMid ?? '—';
    const natoClass = feature.properties.nato_class ?? 'SETTLEMENT';

    // Count settlements in municipality
    let munSettlementCount = 0;
    if (munId != null) {
      for (const f of this.data.settlements.values()) {
        if (f.properties.municipality_id === munId) munSettlementCount++;
      }
    }

    return `<div class="tm-panel-section">
      <div class="tm-panel-section-header">MUNICIPALITY</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Name</span><span class="tm-panel-field-value">${this.escapeHtml(munName)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">ID</span><span class="tm-panel-field-value">${this.escapeHtml(munMid ?? '—')}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Settlements</span><span class="tm-panel-field-value">${munSettlementCount}</span></div>
    </div>
    <div class="tm-panel-section">
      <div class="tm-panel-section-header">DESIGNATION</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">NATO Class</span><span class="tm-panel-field-value">${this.escapeHtml(natoClass)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Urban Center</span><span class="tm-panel-field-value">${natoClass === 'URBAN_CENTER' ? 'Yes' : 'No'}</span></div>
    </div>`;
  }

  private renderControlTab(sid: string, controller: string, controlStatus: string, factionColor: string): string {
    return `<div class="tm-panel-section">
      <div class="tm-panel-section-header">POLITICAL STATUS</div>
      <div class="tm-panel-field">
        <span class="tm-panel-field-label">Controller</span>
        <span class="tm-panel-field-value">
          <span class="tm-swatch" style="background:${factionColor};display:inline-block;width:10px;height:10px;margin-right:4px;vertical-align:middle"></span>
          ${this.escapeHtml(SIDE_LABELS[controller] ?? controller)}
        </span>
      </div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Status</span><span class="tm-panel-field-value">${this.escapeHtml(controlStatus)}</span></div>
    </div>
    <div class="tm-panel-section">
      <div class="tm-panel-section-header">STABILITY</div>
      <div class="tm-panel-placeholder">Stability score and control strain available in Phase I+</div>
    </div>`;
  }

  private renderIntelTab(sid: string, feature: SettlementFeature): string {
    const gs = this.state.snapshot.loadedGameState;
    if (!gs) {
      return `<div class="tm-panel-section">
        <div class="tm-panel-section-header">MILITARY INTEL</div>
        <div class="tm-panel-placeholder">Load a game state to view military intel.</div>
      </div>`;
    }

    // Find formations in this municipality
    const munId = feature.properties.municipality_id;
    const munStr = munId != null ? String(munId) : '';
    // Match formations by mun tag — the tag stores mun1990_id (string like "banovici")
    // We need the mun1990_id from the mun1990_names lookup
    const munEntry = munStr ? this.data.mun1990Names.by_municipality_id?.[munStr] : undefined;
    const mun1990Id = munEntry?.mun1990_id ?? '';

    const formations = gs.formations.filter(f => f.municipalityId === mun1990Id);

    let html = `<div class="tm-panel-section"><div class="tm-panel-section-header">FORMATIONS (${formations.length})</div>`;
    if (formations.length === 0) {
      html += `<div class="tm-panel-placeholder">No formations in this municipality.</div>`;
    } else {
      for (const f of formations.slice(0, 20)) {
        const readinessColor = f.readiness === 'active' ? '#4CAF50' : f.readiness === 'forming' ? '#FFC107' : f.readiness === 'overextended' ? '#FF9800' : '#F44336';
        const cohesionPct = Math.round(f.cohesion);
        html += `<div class="tm-formation-row">
          <span class="tm-formation-badge" style="background:${readinessColor}" title="${f.readiness}"></span>
          <span class="tm-formation-name">${this.escapeHtml(f.name)}</span>
          <span class="tm-formation-kind">${this.escapeHtml(f.kind)}</span>
          <div class="tm-formation-cohesion" title="Cohesion: ${cohesionPct}%"><div class="tm-formation-cohesion-fill" style="width:${cohesionPct}%;background:${readinessColor}"></div></div>
        </div>`;
      }
      if (formations.length > 20) {
        html += `<div class="tm-panel-placeholder">+${formations.length - 20} more formations</div>`;
      }
    }
    html += `</div>`;

    // Militia pool
    const pool = gs.militiaPools.find(p => p.munId === mun1990Id);
    if (pool) {
      const total = pool.available + pool.committed + pool.exhausted;
      const aPct = total > 0 ? (pool.available / total * 100) : 0;
      const cPct = total > 0 ? (pool.committed / total * 100) : 0;
      const ePct = total > 0 ? (pool.exhausted / total * 100) : 0;
      html += `<div class="tm-panel-section"><div class="tm-panel-section-header">MILITIA POOL</div>
        <div class="tm-pool-bar">
          <div class="tm-pool-segment" style="width:${aPct}%;background:#4CAF50" title="Available: ${pool.available}"></div>
          <div class="tm-pool-segment" style="width:${cPct}%;background:#FFC107" title="Committed: ${pool.committed}"></div>
          <div class="tm-pool-segment" style="width:${ePct}%;background:#F44336" title="Exhausted: ${pool.exhausted}"></div>
        </div>
        <div class="tm-panel-field"><span class="tm-panel-field-label">Available</span><span class="tm-panel-field-value">${pool.available}</span></div>
        <div class="tm-panel-field"><span class="tm-panel-field-label">Committed</span><span class="tm-panel-field-value">${pool.committed}</span></div>
        <div class="tm-panel-field"><span class="tm-panel-field-label">Exhausted</span><span class="tm-panel-field-value">${pool.exhausted}</span></div>
      </div>`;
    }

    return html;
  }

  // ─── OOB Sidebar ────────────────────────────────

  private toggleOOB(): void {
    const sidebar = document.getElementById('oob-sidebar');
    if (!sidebar) return;
    const isOpen = sidebar.classList.contains('open');
    sidebar.classList.toggle('open', !isOpen);
    sidebar.classList.toggle('closed', isOpen);
    sidebar.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
  }

  private updateOOBSidebar(gs: import('./types.js').LoadedGameState): void {
    const content = document.getElementById('oob-content');
    if (!content) return;

    // Group by faction
    const byFaction = new Map<string, typeof gs.formations>();
    for (const f of gs.formations) {
      let list = byFaction.get(f.faction);
      if (!list) { list = []; byFaction.set(f.faction, list); }
      list.push(f);
    }

    let html = '';
    const factionOrder = ['RBiH', 'RS', 'HRHB'];
    for (const faction of factionOrder) {
      const formations = byFaction.get(faction) ?? [];
      if (formations.length === 0) continue;
      const fColor = SIDE_SOLID_COLORS[faction] ?? '#888';
      const avgCohesion = formations.reduce((s, f) => s + f.cohesion, 0) / formations.length;

      html += `<div class="tm-oob-faction">
        <div class="tm-oob-faction-header">
          <span class="tm-oob-faction-badge" style="background:${fColor}"></span>
          <span>${this.escapeHtml(SIDE_LABELS[faction] ?? faction)}</span>
          <span class="tm-oob-faction-count">${formations.length} formations — avg cohesion ${Math.round(avgCohesion)}%</span>
        </div>
        <div class="tm-oob-formation-list">`;

      // Show first 50 formations
      for (const f of formations.slice(0, 50)) {
        const readinessColor = f.readiness === 'active' ? '#4CAF50' : f.readiness === 'forming' ? '#FFC107' : f.readiness === 'overextended' ? '#FF9800' : '#F44336';
        html += `<div class="tm-formation-row" data-mun="${this.escapeHtml(f.municipalityId ?? '')}" style="cursor:pointer">
          <span class="tm-formation-badge" style="background:${readinessColor}" title="${f.readiness}"></span>
          <span class="tm-formation-name">${this.escapeHtml(f.name)}</span>
          <span class="tm-formation-kind">${this.escapeHtml(f.kind)}</span>
        </div>`;
      }
      if (formations.length > 50) {
        html += `<div class="tm-muted">+${formations.length - 50} more</div>`;
      }

      html += `</div></div>`;
    }

    // Militia pool summary
    if (gs.militiaPools.length > 0) {
      const totalAvail = gs.militiaPools.reduce((s, p) => s + p.available, 0);
      const totalCommit = gs.militiaPools.reduce((s, p) => s + p.committed, 0);
      const totalExhaust = gs.militiaPools.reduce((s, p) => s + p.exhausted, 0);
      html += `<div class="tm-panel-section" style="margin-top:12px">
        <div class="tm-panel-section-header">MILITIA POOLS (ALL)</div>
        <div class="tm-panel-field"><span class="tm-panel-field-label">Available</span><span class="tm-panel-field-value">${totalAvail.toLocaleString()}</span></div>
        <div class="tm-panel-field"><span class="tm-panel-field-label">Committed</span><span class="tm-panel-field-value">${totalCommit.toLocaleString()}</span></div>
        <div class="tm-panel-field"><span class="tm-panel-field-label">Exhausted</span><span class="tm-panel-field-value">${totalExhaust.toLocaleString()}</span></div>
      </div>`;
    }

    content.innerHTML = html;

    // Wire formation row clicks → jump to municipality
    content.querySelectorAll('.tm-formation-row[data-mun]').forEach(row => {
      row.addEventListener('click', () => {
        const munId = (row as HTMLElement).dataset.mun;
        if (!munId) return;
        const centroid = this.data.municipalityCentroids.get(munId);
        if (!centroid) return;
        const bounds = this.data.dataBounds;
        this.state.setPan(
          (centroid[0] - bounds.minX) / (bounds.maxX - bounds.minX),
          (centroid[1] - bounds.minY) / (bounds.maxY - bounds.minY),
        );
        this.state.setZoom(2, ZOOM_FACTORS[2]);
        this.updateZoomPill();
      });
    });
  }

  // ─── Utilities ──────────────────────────────────

  private escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}
