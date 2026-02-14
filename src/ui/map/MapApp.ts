/**
 * Tactical Map — main application orchestrator.
 * Creates canvas, loads data, wires modules, and starts the render loop.
 */

import type {
  LoadedData,
  SettlementFeature,
  ViewTransform,
  RenderContext,
  FormationView,
  ReplayTimelineData,
  ReplayControlEvent,
  LoadedGameState
} from './types.js';
import { MapState } from './state/MapState.js';
import { MapProjection } from './geo/MapProjection.js';
import { SpatialIndex } from './geo/SpatialIndex.js';
import { computeFeatureBBox } from './geo/MapProjection.js';
import { loadAllData } from './data/DataLoader.js';
import { ZOOM_LABELS, ZOOM_FACTORS, NATO_TOKENS, SIDE_COLORS, SIDE_SOLID_COLORS, SIDE_LABELS, FACTION_DISPLAY_ORDER, ETHNICITY_COLORS, ETHNICITY_LABELS, BASE_LAYER_COLORS, BASE_LAYER_WIDTHS, FRONT_LINE, MINIMAP, FORMATION_KIND_SHAPES, FORMATION_MARKER_SIZE, FORMATION_HIT_RADIUS, SETTLEMENT_BORDER, ZOOM_FORMATION_FILTER, AOR_HIGHLIGHT, panelReadinessColor } from './constants.js';
import { controlKey, censusIdFromSid, buildControlLookup, buildStatusLookup } from './data/ControlLookup.js';
import { parseGameState } from './data/GameStateAdapter.js';
import { normalizeForSearch } from './data/DataLoader.js';
import {
  computeBrigadeOperationalCoverageCapFromFormation,
  getFormationHomeMunFromTags
} from '../../state/brigade_operational_cap.js';
import { isLargeUrbanSettlementMun } from '../../state/formation_constants.js';
import { getEquipmentCost } from '../../state/recruitment_types.js';
import type { PolygonCoords, Position } from './types.js';

const REPLAY_WEEK_INTERVAL_MS = 900;
const REPLAY_FIRE_TTL_FRAMES = 45;

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
  private replayFrames: unknown[] = [];
  private replayEventsByTurn = new Map<number, ReplayControlEvent[]>();
  private replayCurrentWeek = 0;
  private replayTimer: ReturnType<typeof setInterval> | null = null;
  private fireActiveBySid = new Map<string, number>();
  private mediaRecorder: MediaRecorder | null = null;
  private mediaChunks: Blob[] = [];
  private isExportingReplay = false;
  private lastLoadedGameState: LoadedGameState | null = null;
  private uiAudioEnabled = false;
  private selectedRecruitmentBrigadeId: string | null = null;
  private selectedRecruitmentEquipmentClass: string | null = null;

  /** Pending order mode: when set, next map click resolves the order. */
  private pendingOrderMode: { type: 'move' | 'attack'; brigadeId: string; brigadeName: string } | null = null;

  // Baseline control data for dataset switching
  private baselineControlLookup: Record<string, string | null> = {};
  private baselineStatusLookup: Record<string, string> = {};

  // Active control data (may come from loaded state or alternate dataset)
  private activeControlLookup: Record<string, string | null> = {};
  private activeStatusLookup: Record<string, string> = {};

  /** Army crest images for map markers and OOB. Keyed by faction id (RBiH, RS, HRHB). */
  private crestImages: Map<string, HTMLImageElement> = new Map();

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

    // Load army crests (assets/sources/crests/crest_ARBiH.png etc.)
    this.loadCrestImages();

    // Wire UI
    this.wireInteraction();
    this.wireUI();

    this.updateArmyStrengthDisplay(null);
    this.updateRecruitmentCapitalDisplay(null);
    this.updateLegendContent();

    // Initial render
    statusEl.textContent = '';
    statusEl.classList.add('hidden');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.canvas.focus();
  }

  private static readonly CREST_ASSETS_BASE = '/assets/sources/crests/';

  /** Crest filename by faction: RBiH → ARBiH, RS → VRS, HRHB → HVO (assets/sources/crests). */
  private static getCrestFilename(faction: string): string {
    if (faction === 'RBiH') return 'ARBiH';
    if (faction === 'RS') return 'VRS';
    if (faction === 'HRHB') return 'HVO';
    return faction;
  }

  /** Public URL for crest image (OOB/INTEL HTML img src). Served from project root /assets/ by Vite plugin. */
  getCrestUrl(faction: string): string {
    const name = MapApp.getCrestFilename(faction);
    return `${MapApp.CREST_ASSETS_BASE}crest_${name}.png`;
  }

  /** Public URL for faction flag (settlement/brigade panel). Same folder as crests. */
  getFlagUrl(faction: string): string {
    return `${MapApp.CREST_ASSETS_BASE}flag_${faction}.png`;
  }

  private loadCrestImages(): void {
    for (const faction of FACTION_DISPLAY_ORDER) {
      const name = MapApp.getCrestFilename(faction);
      const img = new Image();
      img.onload = () => this.scheduleRender();
      img.onerror = () => { /* fallback: no crest drawn */ };
      img.src = `${MapApp.CREST_ASSETS_BASE}crest_${name}.png`;
      this.crestImages.set(faction, img);
    }
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
    this.advanceFireOverlay();

    // 4. Front lines — always visible when enabled (key visual element)
    if (rc.layers.frontLines) {
      this.drawFrontLines(rc);
    }

    // 5. Formation markers
    if (rc.layers.formations && this.state.snapshot.loadedGameState) {
      this.drawFormations(rc);
      this.drawOrderArrows(rc);
    }

    // 5b. Brigade AoR highlight (selected formation's AoR settlements)
    if (rc.layers.brigadeAor && this.state.snapshot.loadedGameState && this.state.snapshot.selectedFormationId) {
      this.drawBrigadeAoRHighlight(rc);
    } else if (this.aorAnimating) {
      this.stopAoRAnimation();
      this.aorBoundaryCache = null;
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
    const fillMode = this.state.snapshot.settlementFillMode;
    const isStrategic = rc.zoomLevel === 0;

    const sidOrder = Array.from(this.data.settlements.keys()).sort();
    for (const sid of sidOrder) {
      const feature = this.data.settlements.get(sid)!;
      const key = controlKey(sid);
      const controller = controllers[key] ?? controllers[sid] ?? 'null';
      const natoClass = feature.properties.nato_class ?? '';

      // At strategic zoom, reduce alpha on minor settlements for a watercolor effect
      const isLargeSettlement = natoClass === 'URBAN_CENTER' || natoClass === 'TOWN';
      if (isStrategic) {
        ctx.globalAlpha = isLargeSettlement ? 1.0 : 0.45;
      }

      if (!rc.layers.politicalControl) {
        ctx.fillStyle = 'rgba(40, 40, 55, 0.4)';
      } else if (fillMode === 'ethnic_majority') {
        const ethnicityKey = this.getMajorityEthnicity(sid, feature);
        ctx.fillStyle = ethnicityKey ? (ETHNICITY_COLORS[ethnicityKey] ?? ETHNICITY_COLORS.other) : ETHNICITY_COLORS.other;
      } else {
        ctx.fillStyle = SIDE_COLORS[controller] ?? SIDE_COLORS['null'];
      }
      this.drawPolygonPath(ctx, feature, rc.project);
      ctx.fill();

      // Settlement borders: skip on small settlements at strategic zoom for cleaner look
      if (!isStrategic || isLargeSettlement) {
        ctx.strokeStyle = SETTLEMENT_BORDER.sameColor;
        ctx.lineWidth = SETTLEMENT_BORDER.sameWidth;
        ctx.stroke();
      }

      if (isStrategic) ctx.globalAlpha = 1.0;

      this.drawFlipFireOverlay(rc, sid, feature);
    }
  }

  private drawFlipFireOverlay(rc: RenderContext, sid: string, feature: SettlementFeature): void {
    const ttl = this.fireActiveBySid.get(sid);
    if (ttl === undefined || ttl <= 0) return;
    const intensity = Math.max(0, Math.min(1, ttl / 45));
    // Brighter and more vivid on dark background
    const alpha = 0.25 + (0.55 * intensity);
    const warm = 160 + Math.floor(80 * intensity);
    const hot = 40 + Math.floor(80 * intensity);
    rc.ctx.fillStyle = `rgba(255,${warm},${hot},${alpha.toFixed(3)})`;
    this.drawPolygonPath(rc.ctx, feature, rc.project);
    rc.ctx.fill();
  }

  private advanceFireOverlay(): void {
    if (this.fireActiveBySid.size === 0) return;
    const next = new Map<string, number>();
    for (const [sid, ttl] of this.fireActiveBySid.entries()) {
      const n = ttl - 1;
      if (n > 0) next.set(sid, n);
    }
    this.fireActiveBySid = next;
    if (next.size > 0) this.scheduleRender();
  }

  // ─── Front Lines ────────────────────────────────

  /** Phase I §4.8: no front between RBiH and HRHB until war (match backend ALLIED_THRESHOLD 0.20). */
  private shouldDrawFrontSegment(ca: string | null, cb: string | null): boolean {
    if (ca == null || cb == null || ca === cb) return false;
    const isRbihHrhb =
      (ca === 'RBiH' && cb === 'HRHB') || (ca === 'HRHB' && cb === 'RBiH');
    if (!isRbihHrhb) return true;
    const gs = this.state.snapshot.loadedGameState;
    if (!gs) return false;
    const turn = gs.turn ?? 0;
    const earliest = gs.rbih_hrhb_war_earliest_turn ?? 26;
    const alliance = gs.phase_i_alliance_rbih_hrhb ?? 1;
    if (turn < earliest || alliance > 0.2) return false;
    return true;
  }

  private drawFrontLines(rc: RenderContext): void {
    const controllers = this.activeControlLookup;
    const { ctx } = rc;

    ctx.save();

    // Pass 1: Glow layer (wider, semi-transparent warm glow behind the front)
    ctx.strokeStyle = FRONT_LINE.glowColor;
    ctx.lineWidth = FRONT_LINE.glowWidth;
    ctx.setLineDash([]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const seg of this.data.sharedBorders) {
      const ca = controllers[seg.a] ?? controllers[controlKey(seg.a)] ?? null;
      const cb = controllers[seg.b] ?? controllers[controlKey(seg.b)] ?? null;
      if (!this.shouldDrawFrontSegment(ca, cb)) continue;
      for (let i = 0; i < seg.points.length; i++) {
        const [sx, sy] = rc.project(seg.points[i][0], seg.points[i][1]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
    }
    ctx.stroke();

    // Pass 2: Main front line (bright, dashed)
    ctx.strokeStyle = FRONT_LINE.color;
    ctx.lineWidth = FRONT_LINE.width;
    ctx.setLineDash(FRONT_LINE.dash);
    ctx.beginPath();
    for (const seg of this.data.sharedBorders) {
      const ca = controllers[seg.a] ?? controllers[controlKey(seg.a)] ?? null;
      const cb = controllers[seg.b] ?? controllers[controlKey(seg.b)] ?? null;
      if (!this.shouldDrawFrontSegment(ca, cb)) continue;
      for (let i = 0; i < seg.points.length; i++) {
        const [sx, sy] = rc.project(seg.points[i][0], seg.points[i][1]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
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
   * Draw a NATO-style formation marker: horizontal box with army crest on the left (smaller)
   * and unit NATO designation (infantry bar, corps diamond, militia triangle) on the right.
   */
  private drawNatoFormationMarker(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    w: number,
    h: number,
    shape: string,
    color: string,
    faction: string,
    posture?: string
  ): void {
    const left = sx - w / 2;
    const top = sy - h / 2;
    const crestW = Math.max(8, w * 0.4);
    const symbolW = w - crestW;

    // Drop shadow for depth on dark map
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Frame background: dark semi-transparent
    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.fillRect(left, top, w, h);
    ctx.restore();

    // Frame: faction-colored border with glow
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(left, top, w, h);

    // Left: dark background with crest
    const crestLeft = left + 1;
    const crestTop = top + 1;
    const crestBoxW = crestW - 2;
    const crestBoxH = h - 2;
    ctx.fillStyle = 'rgba(20, 20, 35, 0.9)';
    ctx.fillRect(crestLeft, crestTop, crestBoxW, crestBoxH);

    const crestImg = this.crestImages.get(faction);
    if (crestImg && crestImg.complete && crestImg.naturalWidth > 0 && crestImg.naturalHeight > 0) {
      const nw = crestImg.naturalWidth;
      const nh = crestImg.naturalHeight;
      const scale = Math.min(crestBoxW / nw, crestBoxH / nh);
      const dw = nw * scale;
      const dh = nh * scale;
      const dx = crestLeft + (crestBoxW - dw) / 2;
      const dy = crestTop + (crestBoxH - dh) / 2;
      ctx.drawImage(crestImg, 0, 0, nw, nh, dx, dy, dw, dh);
    }

    // Right: faction fill behind symbol (muted)
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(left + crestW + 1, top + 1, symbolW - 2, h - 2);
    ctx.globalAlpha = 1.0;

    // NATO symbol centered in right portion — bright white for contrast
    const symbolCenterX = left + crestW + symbolW / 2;
    const iw = symbolW * 0.4;
    const ih = h * 0.4;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';

    if (shape === 'xx') {
      // NATO XX symbol for corps: two crossed lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(symbolCenterX - iw * 0.35, sy - ih * 0.6);
      ctx.lineTo(symbolCenterX + iw * 0.35, sy + ih * 0.6);
      ctx.moveTo(symbolCenterX + iw * 0.35, sy - ih * 0.6);
      ctx.lineTo(symbolCenterX - iw * 0.35, sy + ih * 0.6);
      ctx.stroke();
      // Second X offset right
      const xOff = iw * 0.4;
      ctx.beginPath();
      ctx.moveTo(symbolCenterX - iw * 0.35 + xOff, sy - ih * 0.6);
      ctx.lineTo(symbolCenterX + iw * 0.35 + xOff, sy + ih * 0.6);
      ctx.moveTo(symbolCenterX + iw * 0.35 + xOff, sy - ih * 0.6);
      ctx.lineTo(symbolCenterX - iw * 0.35 + xOff, sy + ih * 0.6);
      ctx.stroke();
    } else if (shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(symbolCenterX, sy - ih);
      ctx.lineTo(symbolCenterX + iw / 2, sy);
      ctx.lineTo(symbolCenterX, sy + ih);
      ctx.lineTo(symbolCenterX - iw / 2, sy);
      ctx.closePath();
      ctx.fill();
    } else if (shape === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(symbolCenterX, sy - ih);
      ctx.lineTo(symbolCenterX + iw / 2, sy + ih);
      ctx.lineTo(symbolCenterX - iw / 2, sy + ih);
      ctx.closePath();
      ctx.fill();
    } else {
      const bw = Math.max(2, iw * 0.35);
      const bh = ih;
      ctx.fillRect(symbolCenterX - bw / 2, sy - bh / 2, bw, bh);
    }

    if (posture) {
      const p = posture === 'elastic_defense' ? 'E' : posture.charAt(0).toUpperCase();
      ctx.fillStyle = 'rgba(10, 10, 26, 0.9)';
      ctx.fillRect(left + w - 11, top + 1, 10, 10);
      ctx.fillStyle = '#00e878';
      ctx.font = 'bold 8px "IBM Plex Mono", Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p, left + w - 6, top + 6);
    }
  }

  private drawFormations(rc: RenderContext): void {
    const gs = this.state.snapshot.loadedGameState;
    if (!gs) return;

    const { ctx } = rc;
    const dim = FORMATION_MARKER_SIZE[rc.zoomLevel];
    const zoomFilter = ZOOM_FORMATION_FILTER[rc.zoomLevel] ?? null;
    const formations = [...gs.formations].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    for (const f of formations) {
      // At strategic zoom, show only corps; at operational/tactical, show all
      if (zoomFilter && !zoomFilter.has(f.kind)) continue;
      const pos = this.getFormationPosition(f);
      if (!pos) continue;
      if (!this.projection.isInViewport(
        { minX: pos[0] - 1, minY: pos[1] - 1, maxX: pos[0] + 1, maxY: pos[1] + 1 },
        rc.viewTransform,
      )) continue;

      const [sx, sy] = rc.project(pos[0], pos[1]);
      const color = SIDE_SOLID_COLORS[f.faction] ?? SIDE_SOLID_COLORS['null'];
      const shape = FORMATION_KIND_SHAPES[f.kind] ?? 'square';
      this.drawNatoFormationMarker(ctx, sx, sy, dim.w, dim.h, shape, color, f.faction, f.posture);
    }
  }

  private getSettlementCentroidFromSid(sid: string): [number, number] | null {
    const f = this.getSettlementFeatureBySid(sid);
    if (!f) return null;
    return this.data.settlementCentroids.get(f.properties.sid) ?? null;
  }

  private drawOrderArrows(rc: RenderContext): void {
    const gs = this.state.snapshot.loadedGameState;
    if (!gs) return;
    const byId = new Map(gs.formations.map((f) => [f.id, f] as const));
    const { ctx } = rc;
    ctx.save();

    // Planned attack arrows (bright red solid with arrowhead + glow).
    ctx.strokeStyle = '#ff4444';
    ctx.fillStyle = '#ff4444';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(255, 68, 68, 0.4)';
    ctx.shadowBlur = 6;
    for (const order of gs.attackOrders) {
      const formation = byId.get(order.brigadeId);
      if (!formation) continue;
      const from = this.getFormationPosition(formation);
      const to = this.getSettlementCentroidFromSid(order.targetSettlementId);
      if (!from || !to) continue;
      const [sx, sy] = rc.project(from[0], from[1]);
      const [tx, ty] = rc.project(to[0], to[1]);
      this.drawArrow(ctx, sx, sy, tx, ty, false);
    }

    // Planned movement arrows (faction colored dashed).
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.setLineDash([7, 6]);
    for (const order of gs.movementOrders) {
      const formation = byId.get(order.brigadeId);
      if (!formation || !formation.faction) continue;
      const from = this.getFormationPosition(formation);
      const to = this.data.municipalityCentroids.get(order.targetMunicipalityId);
      if (!from || !to) continue;
      const [sx, sy] = rc.project(from[0], from[1]);
      const [tx, ty] = rc.project(to[0], to[1]);
      ctx.strokeStyle = SIDE_SOLID_COLORS[formation.faction] ?? '#999';
      ctx.fillStyle = SIDE_SOLID_COLORS[formation.faction] ?? '#999';
      this.drawArrow(ctx, sx, sy, tx, ty, true);
    }
    ctx.restore();
  }

  private drawArrow(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    curved: boolean
  ): void {
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.hypot(dx, dy);
    if (len < 4) return;
    const ux = dx / len;
    const uy = dy / len;
    const endX = tx - ux * 8;
    const endY = ty - uy * 8;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    if (curved) {
      const mx = (sx + endX) / 2;
      const my = (sy + endY) / 2;
      const nx = -uy;
      const ny = ux;
      const bend = Math.min(40, len * 0.15);
      ctx.quadraticCurveTo(mx + nx * bend, my + ny * bend, endX, endY);
    } else {
      ctx.lineTo(endX, endY);
    }
    ctx.stroke();

    const head = 7;
    const leftX = tx - ux * head - uy * (head * 0.5);
    const leftY = ty - uy * head + ux * (head * 0.5);
    const rightX = tx - ux * head + uy * (head * 0.5);
    const rightY = ty - uy * head - ux * (head * 0.5);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fill();
  }

  /** Return formation at canvas coords when formations layer is on; otherwise null. */
  private getFormationAtScreenPos(canvasX: number, canvasY: number): import('./types.js').FormationView | null {
    const gs = this.state.snapshot.loadedGameState;
    if (!gs || !this.state.snapshot.layers.formations) return null;
    const rc = this.getRenderContext();
    const zoomFilter = ZOOM_FORMATION_FILTER[rc.zoomLevel] ?? null;
    const formations = [...gs.formations].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    for (const f of formations) {
      if (zoomFilter && !zoomFilter.has(f.kind)) continue;
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

  /** Resolve AoR SID (may be S-prefixed or mun:census format from saved state) to a settlement feature. */
  private getSettlementFeatureBySid(sid: string): SettlementFeature | undefined {
    let f = this.data.settlements.get(sid);
    if (f) return f;
    if (sid.includes(':')) {
      const censusPart = sid.split(':')[1];
      if (censusPart) f = this.data.settlements.get(censusPart.startsWith('S') ? censusPart : `S${censusPart}`);
    }
    if (f) return f;
    return this.data.settlements.get(sid.startsWith('S') ? sid : `S${sid}`);
  }

  /** AoR boundary cache: computed outer boundary segments for the selected formation. */
  private aorBoundaryCache: {
    formationId: string;
    aorKey: string;
    zoomFactor: number;
    segments: [number, number][][];
  } | null = null;

  /** Whether we're currently animating the AoR glow. */
  private aorAnimating = false;
  private aorAnimationId: number | null = null;

  /** Start the AoR breathing glow animation loop. */
  private startAoRAnimation(): void {
    if (this.aorAnimating) return;
    this.aorAnimating = true;
    const loop = (): void => {
      if (!this.aorAnimating) return;
      this.scheduleRender();
      this.aorAnimationId = requestAnimationFrame(loop);
    };
    this.aorAnimationId = requestAnimationFrame(loop);
  }

  /** Stop the AoR animation loop. */
  private stopAoRAnimation(): void {
    this.aorAnimating = false;
    if (this.aorAnimationId != null) {
      cancelAnimationFrame(this.aorAnimationId);
      this.aorAnimationId = null;
    }
  }

  private drawBrigadeAoRHighlight(rc: RenderContext): void {
    const gs = this.state.snapshot.loadedGameState;
    const formationId = this.state.snapshot.selectedFormationId;
    if (!gs || !formationId) return;
    const formation = gs.formations.find((f) => f.id === formationId);
    if (!formation) return;

    // Corps: merge all subordinate brigades' AoRs into one unified highlight
    let aorSids: string[];
    if (formation.kind === 'corps' || formation.kind === 'corps_asset') {
      const merged = new Set<string>();
      for (const subId of formation.subordinateIds ?? []) {
        const subAor = gs.brigadeAorByFormationId[subId];
        if (subAor) for (const sid of subAor) merged.add(sid);
      }
      aorSids = [...merged].sort();
    } else {
      aorSids = gs.brigadeAorByFormationId[formationId] ?? [];
    }
    if (aorSids.length === 0) return;

    const factionColor = SIDE_SOLID_COLORS[formation.faction] ?? '#888';
    const { ctx } = rc;
    const aorSet = new Set(aorSids);

    // Start animation if not already running
    if (!this.aorAnimating) this.startAoRAnimation();

    ctx.save();

    // 1. Compound fill: single path for all AoR settlement polygons
    ctx.beginPath();
    for (const sid of aorSids) {
      const feature = this.getSettlementFeatureBySid(sid);
      if (!feature) continue;
      this.addPolygonSubpath(ctx, feature, rc.project);
    }
    ctx.fillStyle = this.hexToRgba(factionColor, AOR_HIGHLIGHT.fillAlpha);
    ctx.fill('evenodd');

    // 2. Compute outer boundary (cached)
    const aorKey = aorSids.join(',');
    if (
      !this.aorBoundaryCache ||
      this.aorBoundaryCache.formationId !== formationId ||
      this.aorBoundaryCache.aorKey !== aorKey ||
      this.aorBoundaryCache.zoomFactor !== rc.zoomFactor
    ) {
      this.aorBoundaryCache = {
        formationId,
        aorKey,
        zoomFactor: rc.zoomFactor,
        segments: this.computeAoROuterBoundary(aorSet, rc.project),
      };
    }

    // 3. Draw outer boundary with breathing glow
    const t = (performance.now() % AOR_HIGHLIGHT.glowCycleMs) / AOR_HIGHLIGHT.glowCycleMs;
    const glowIntensity = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
    const glowBlur = AOR_HIGHLIGHT.glowBlurMin + (AOR_HIGHLIGHT.glowBlurMax - AOR_HIGHLIGHT.glowBlurMin) * glowIntensity;

    ctx.beginPath();
    for (const segment of this.aorBoundaryCache.segments) {
      for (let i = 0; i < segment.length; i++) {
        const [sx, sy] = segment[i];
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
    }
    ctx.strokeStyle = factionColor;
    ctx.lineWidth = AOR_HIGHLIGHT.strokeWidth;
    ctx.setLineDash([]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = factionColor;
    ctx.shadowBlur = glowBlur;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  /**
   * Add settlement polygon as a subpath WITHOUT starting a new path.
   * Used for compound fills where multiple polygons share one beginPath().
   */
  private addPolygonSubpath(
    ctx: CanvasRenderingContext2D,
    feature: SettlementFeature,
    project: (x: number, y: number) => [number, number],
  ): void {
    const polys: PolygonCoords[] = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
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
   * Compute the outer boundary of an AoR region.
   * Uses sharedBorders to detect internal edges (between two AoR settlements).
   * Returns projected screen-coordinate segments for the outer boundary only.
   */
  private computeAoROuterBoundary(
    aorSet: Set<string>,
    project: (x: number, y: number) => [number, number]
  ): [number, number][][] {
    // Build set of internal shared-border vertex keys
    const internalVertexKeys = new Set<string>();
    for (const seg of this.data.sharedBorders) {
      if (aorSet.has(seg.a) && aorSet.has(seg.b)) {
        for (const pt of seg.points) {
          internalVertexKeys.add(`${pt[0]},${pt[1]}`);
        }
      }
    }

    // Walk each AoR settlement's outer ring, collecting non-internal edge segments
    const segments: [number, number][][] = [];
    for (const sid of aorSet) {
      const feature = this.getSettlementFeatureBySid(sid);
      if (!feature) continue;
      const rings = this.getOuterRings(feature);
      for (const ring of rings) {
        let currentSegment: [number, number][] = [];
        for (let i = 0; i < ring.length; i++) {
          const pt = ring[i];
          const key = `${pt[0]},${pt[1]}`;
          const isInternal = internalVertexKeys.has(key);
          if (!isInternal) {
            currentSegment.push(project(pt[0], pt[1]));
          } else {
            if (currentSegment.length >= 2) {
              segments.push(currentSegment);
            }
            currentSegment = [];
          }
        }
        if (currentSegment.length >= 2) {
          segments.push(currentSegment);
        }
      }
    }
    return segments;
  }

  /** Extract outer rings from a settlement feature (first ring of each polygon). */
  private getOuterRings(feature: SettlementFeature): Position[][] {
    const polys: PolygonCoords[] = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
    return polys.map(poly => poly[0]);
  }

  /** Convert hex color to rgba string. */
  private hexToRgba(hex: string, alpha: number): string {
    const match = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!match) return `rgba(128,128,128,${alpha})`;
    const r = parseInt(match[1], 16);
    const g = parseInt(match[2], 16);
    const b = parseInt(match[3], 16);
    return `rgba(${r},${g},${b},${alpha})`;
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

      // Font sizing by class — monospace for military aesthetic
      if (entry.natoClass === 'URBAN_CENTER') {
        ctx.font = 'bold 11px "IBM Plex Mono", Consolas, monospace';
      } else if (entry.natoClass === 'TOWN') {
        ctx.font = '9px "IBM Plex Mono", Consolas, monospace';
      } else {
        ctx.font = '7px "IBM Plex Mono", Consolas, monospace';
      }

      // Halo text — dark outline on light text for dark map background
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.strokeStyle = 'rgba(10, 10, 26, 0.85)';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(label, sx, sy + 4);

      // Label color by class
      if (entry.natoClass === 'URBAN_CENTER') {
        ctx.fillStyle = '#e0e0e8';
      } else if (entry.natoClass === 'TOWN') {
        ctx.fillStyle = 'rgba(200, 200, 210, 0.8)';
      } else {
        ctx.fillStyle = 'rgba(160, 160, 175, 0.6)';
      }
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

    mctx.fillStyle = 'rgba(10, 10, 26, 0.92)';
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

      // Pending order mode: intercept click to resolve MOVE/ATTACK target
      if (this.pendingOrderMode) {
        const mode = this.pendingOrderMode;
        this.pendingOrderMode = null;
        canvas.style.cursor = this.state.snapshot.zoomFactor > 1 ? 'grab' : 'default';

        if (mode.type === 'attack' && this.hoveredFeature) {
          const targetSid = this.hoveredFeature.properties.sid;
          const targetName = this.hoveredFeature.properties.name ?? targetSid;
          this.showStatusError(`Attack order staged: ${mode.brigadeName} → ${targetName} (${targetSid}). Advance turn to execute.`);
        } else if (mode.type === 'move' && this.hoveredFeature) {
          const munId = this.hoveredFeature.properties.municipality_id;
          const targetSid = this.hoveredFeature.properties.sid;
          const targetName = this.hoveredFeature.properties.name ?? targetSid;
          const munLabel = munId != null ? `mun ${munId}` : targetName;
          this.showStatusError(`Move order staged: ${mode.brigadeName} → ${munLabel}. Advance turn to execute.`);
        } else {
          this.showStatusError(`${mode.type === 'attack' ? 'Attack' : 'Move'} order cancelled — no target selected.`);
        }
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const canvasX = ((e.clientX - rect.left) * (canvas.width / rect.width));
      const canvasY = ((e.clientY - rect.top) * (canvas.height / rect.height));
      const formationAt = this.getFormationAtScreenPos(canvasX, canvasY);
      if (formationAt) {
        this.state.setSelectedFormation(formationAt.id);
        this.state.setSelectedSettlement(null);
        this.state.setLayer('brigadeAor', true);
        const brigadeAorCheckbox = document.getElementById('layer-brigade-aor') as HTMLInputElement | null;
        if (brigadeAorCheckbox) { brigadeAorCheckbox.disabled = false; brigadeAorCheckbox.checked = true; }
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

  private setReplayStatus(text: string): void {
    const el = document.getElementById('replay-status');
    if (el) el.textContent = text;
  }

  private formatReplayError(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }

  private stopReplayPlayback(): void {
    if (this.replayTimer) {
      clearInterval(this.replayTimer);
      this.replayTimer = null;
    }
    const playBtn = document.getElementById('btn-replay-play');
    if (playBtn) playBtn.textContent = 'Play replay';
  }

  private buildReplayEventsByTurn(events: ReplayControlEvent[]): Map<number, ReplayControlEvent[]> {
    const byTurn = new Map<number, ReplayControlEvent[]>();
    const sorted = [...events].sort((a, b) => {
      if (a.turn !== b.turn) return a.turn - b.turn;
      const mech = (a.mechanism ?? '').localeCompare(b.mechanism ?? '');
      if (mech !== 0) return mech;
      return (a.settlement_id ?? '').localeCompare(b.settlement_id ?? '');
    });
    for (const ev of sorted) {
      const list = byTurn.get(ev.turn) ?? [];
      list.push(ev);
      byTurn.set(ev.turn, list);
    }
    return byTurn;
  }

  private applyReplayWeek(weekIndex: number): void {
    if (weekIndex < 0 || weekIndex >= this.replayFrames.length) return;
    const loaded = parseGameState(this.replayFrames[weekIndex]);
    this.replayCurrentWeek = weekIndex;
    this.state.loadGameState(loaded);
    this.lastLoadedGameState = loaded;
    this.activeControlLookup = buildControlLookup(loaded.controlBySettlement);
    this.activeStatusLookup = buildStatusLookup(loaded.statusBySettlement);
    const turnDisplay = document.getElementById('turn-display');
    if (turnDisplay) turnDisplay.textContent = `${loaded.label} [Replay w${weekIndex + 1}/${this.replayFrames.length}]`;
    const formCheckbox = document.getElementById('layer-formations') as HTMLInputElement | null;
    if (formCheckbox) {
      formCheckbox.disabled = false;
      formCheckbox.checked = true;
      this.state.setLayer('formations', true);
    }
    const brigadeAorCheckbox = document.getElementById('layer-brigade-aor') as HTMLInputElement | null;
    if (brigadeAorCheckbox) brigadeAorCheckbox.disabled = false;
    this.updateWarStatusSection(loaded);
    this.updateOOBSidebar(loaded);
    this.updateStatusTicker(loaded);
    this.baseLayerCache = null;

    const events = this.replayEventsByTurn.get(loaded.turn) ?? [];
    if (events.length > 0) {
      for (const ev of events) {
        if (!ev?.settlement_id) continue;
        this.fireActiveBySid.set(ev.settlement_id, REPLAY_FIRE_TTL_FRAMES);
      }
    }
    this.setReplayStatus(
      `Replay: week ${weekIndex + 1}/${this.replayFrames.length} (turn ${loaded.turn})` +
      (events.length > 0 ? ` - flips this turn: ${events.length}` : '')
    );
    this.updateReplayScrubber();
    this.scheduleRender();
  }

  private loadReplayTimeline(data: ReplayTimelineData): void {
    if (!Array.isArray(data.frames) || data.frames.length === 0) {
      throw new Error('Replay timeline has no frames.');
    }
    const sortedFrames = [...data.frames]
      .sort((a, b) => (a.week_index ?? 0) - (b.week_index ?? 0))
      .map((f) => f.game_state);
    this.replayFrames = sortedFrames;
    this.replayEventsByTurn = this.buildReplayEventsByTurn(data.control_events ?? []);
    this.fireActiveBySid.clear();
    this.stopReplayPlayback();
    this.applyReplayWeek(0);
    this.updateReplayScrubber();
  }

  /**
   * Public API: load replay from parsed JSON (e.g. content received via Electron IPC).
   * Same behavior as loading via file picker.
   */
  loadReplayFromData(data: ReplayTimelineData): void {
    try {
      this.loadReplayTimeline(data);
      this.setReplayStatus(`Replay loaded: ${this.replayFrames.length} weeks.`);
    } catch (err) {
      this.setReplayStatus(`Replay load failed: ${this.formatReplayError(err)}`);
    }
  }

  private stepReplayForward(): void {
    if (this.replayFrames.length === 0) return;
    const next = this.replayCurrentWeek + 1;
    if (next >= this.replayFrames.length) {
      this.stopReplayPlayback();
      if (this.isExportingReplay) {
        this.stopReplayExport();
      }
      return;
    }
    this.applyReplayWeek(next);
  }

  private toggleReplayPlayback(): void {
    if (this.replayFrames.length === 0) {
      this.setReplayStatus('Replay: load replay_timeline.json first.');
      return;
    }
    if (this.replayTimer) {
      this.stopReplayPlayback();
      return;
    }
    this.replayTimer = setInterval(() => this.stepReplayForward(), REPLAY_WEEK_INTERVAL_MS);
    const playBtn = document.getElementById('btn-replay-play');
    if (playBtn) playBtn.textContent = 'Pause replay';
  }

  private stopReplayExport(): void {
    this.isExportingReplay = false;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    } else {
      this.mediaRecorder = null;
      this.mediaChunks = [];
    }
    const exportBtn = document.getElementById('btn-replay-export');
    if (exportBtn) exportBtn.textContent = 'Export replay';
  }

  private startReplayExport(): void {
    if (this.replayFrames.length === 0) {
      this.setReplayStatus('Replay export: load replay_timeline.json first.');
      return;
    }
    if (this.isExportingReplay) {
      this.stopReplayExport();
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      this.setReplayStatus('Replay export: MediaRecorder is unavailable.');
      return;
    }
    const preferredType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : (MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '');
    if (!preferredType) {
      this.setReplayStatus('Replay export: WebM encoding is not supported in this browser.');
      return;
    }
    const capture = this.canvas.captureStream(30);
    this.mediaChunks = [];
    this.mediaRecorder = new MediaRecorder(capture, { mimeType: preferredType });
    this.mediaRecorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) this.mediaChunks.push(ev.data);
    };
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.mediaChunks, { type: preferredType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scenario_replay.webm';
      a.click();
      URL.revokeObjectURL(url);
      this.mediaRecorder = null;
      this.mediaChunks = [];
      this.setReplayStatus('Replay export complete: scenario_replay.webm');
    };
    this.isExportingReplay = true;
    const exportBtn = document.getElementById('btn-replay-export');
    if (exportBtn) exportBtn.textContent = 'Stop export';
    this.mediaRecorder.start();
    this.applyReplayWeek(0);
    this.stopReplayPlayback();
    this.replayTimer = setInterval(() => this.stepReplayForward(), REPLAY_WEEK_INTERVAL_MS);
    const playBtn = document.getElementById('btn-replay-play');
    if (playBtn) playBtn.textContent = 'Pause replay';
    this.setReplayStatus('Replay export running...');
  }

  /** Apply a loaded game state to map, OOB, and turn display. Optionally add to dataset dropdown. */
  private applyLoadedGameState(
    loaded: LoadedGameState,
    datasetEl?: HTMLSelectElement | null
  ): void {
    const previous = this.lastLoadedGameState;
    this.state.loadGameState(loaded);
    this.lastLoadedGameState = loaded;
    this.activeControlLookup = buildControlLookup(loaded.controlBySettlement);
    this.activeStatusLookup = buildStatusLookup(loaded.statusBySettlement);
    this.state.setControlDataset(`loaded:${loaded.label}`);
    const turnDisplay = document.getElementById('turn-display');
    if (turnDisplay) turnDisplay.textContent = loaded.label;
    const formCheckbox = document.getElementById('layer-formations') as HTMLInputElement | null;
    if (formCheckbox) {
      formCheckbox.disabled = false;
      formCheckbox.checked = true;
      this.state.setLayer('formations', true);
    }
    const brigadeAorCheckbox = document.getElementById('layer-brigade-aor') as HTMLInputElement | null;
    if (brigadeAorCheckbox) brigadeAorCheckbox.disabled = false;
    this.updateWarStatusSection(loaded);
    this.updateOOBSidebar(loaded);
    this.updateStatusTicker(loaded);
    this.baseLayerCache = null;
    this.clearStatusBar();
    if (datasetEl) {
      const opt = document.createElement('option');
      opt.value = `loaded:${loaded.label}`;
      opt.textContent = `Loaded: ${loaded.label}`;
      datasetEl.appendChild(opt);
      datasetEl.value = opt.value;
    }
    this.showOverlay('main-menu-overlay', false);
    // Enable Continue button now that state is loaded
    const continueBtn = document.getElementById('menu-close') as HTMLButtonElement | null;
    if (continueBtn) {
      continueBtn.style.opacity = '1';
      continueBtn.style.cursor = 'pointer';
    }
    if (previous) this.maybeShowAarFromStateDelta(previous, loaded);
  }

  /** Apply game state from JSON (IPC from Electron or after load). */
  private applyGameStateFromJson(stateJson: string): void {
    try {
      const loaded = parseGameState(JSON.parse(stateJson) as unknown);
      const datasetEl = document.getElementById('control-dataset') as HTMLSelectElement | null;
      this.applyLoadedGameState(loaded, datasetEl);
    } catch (err) {
      this.showStatusError(`Failed to apply state: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ─── UI Wiring ──────────────────────────────────

  private wireUI(): void {
    document.getElementById('btn-main-menu')?.addEventListener('click', () => this.showOverlay('main-menu-overlay', true));
    document.getElementById('menu-close')?.addEventListener('click', () => this.showOverlay('main-menu-overlay', false));

    // Continue button: disabled when no state is loaded
    const continueBtn = document.getElementById('menu-close') as HTMLButtonElement | null;
    if (continueBtn && !this.state.snapshot.loadedGameState) {
      continueBtn.style.opacity = '0.4';
      continueBtn.style.cursor = 'not-allowed';
    }

    const awwvDesktop = (window as unknown as {
      awwv?: {
        startNewCampaign?: (p: { playerFaction: string }) => Promise<{ ok: boolean; error?: string; stateJson?: string }>;
        loadScenarioDialog?: () => Promise<{ ok: boolean; error?: string; stateJson?: string }>;
        loadStateDialog?: () => Promise<{ ok: boolean; error?: string; stateJson?: string }>;
        advanceTurn?: () => Promise<{ ok: boolean; error?: string; stateJson?: string }>;
        setGameStateUpdatedCallback?: (cb: (stateJson: string) => void) => void;
      };
    }).awwv;

    // In browser mode (no desktop API), relabel "New Campaign" → "Load Scenario"
    if (!awwvDesktop?.startNewCampaign) {
      const newCampaignBtn = document.getElementById('menu-new-campaign');
      if (newCampaignBtn) newCampaignBtn.textContent = 'Load Scenario';
    }

    document.getElementById('menu-new-campaign')?.addEventListener('click', () => {
      this.showOverlay('main-menu-overlay', false);
      if (awwvDesktop?.startNewCampaign) {
        const errEl = document.getElementById('side-picker-error');
        if (errEl) {
          errEl.textContent = '';
          errEl.classList.add('hidden');
        }
        for (const faction of FACTION_DISPLAY_ORDER) {
          const el = document.getElementById(`side-picker-flag-${faction}`) as HTMLImageElement | null;
          if (el) el.src = this.getFlagUrl(faction);
        }
        // Load scenario briefing image
        const scenarioImg = document.getElementById('scenario-briefing-image') as HTMLImageElement | null;
        if (scenarioImg) {
          scenarioImg.src = '/assets/sources/scenarios/apr1992_briefing.png';
          scenarioImg.style.display = '';
          scenarioImg.onerror = () => { scenarioImg.style.display = 'none'; };
        }
        this.showOverlay('side-picker-overlay', true);
      } else {
        document.getElementById('btn-load-scenario')?.dispatchEvent(new Event('click'));
      }
    });
    document.getElementById('side-picker-close')?.addEventListener('click', () => this.showOverlay('side-picker-overlay', false));
    for (const faction of FACTION_DISPLAY_ORDER) {
      document.getElementById(`side-picker-${faction}`)?.addEventListener('click', async () => {
        if (!awwvDesktop?.startNewCampaign) return;
        let r: { ok: boolean; error?: string; stateJson?: string } | undefined;
        try {
          r = await awwvDesktop.startNewCampaign({ playerFaction: faction });
        } catch (err) {
          this.showSidePickerError(String(err));
          return;
        }
        if (r?.ok && r.stateJson) {
          try {
            this.applyGameStateFromJson(r.stateJson);
            this.showOverlay('side-picker-overlay', false);
          } catch (err) {
            this.showSidePickerError(String(err));
          }
        } else if (r?.error) {
          this.showSidePickerError(r.error);
        }
      });
    }
    document.getElementById('menu-load-state')?.addEventListener('click', () => {
      this.showOverlay('main-menu-overlay', false);
      document.getElementById('btn-load-state')?.dispatchEvent(new Event('click'));
    });
    document.getElementById('menu-load-replay')?.addEventListener('click', () => {
      this.showOverlay('main-menu-overlay', false);
      document.getElementById('btn-load-replay')?.dispatchEvent(new Event('click'));
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => this.showOverlay('settings-modal', true));
    document.getElementById('settings-close')?.addEventListener('click', () => this.showOverlay('settings-modal', false));
    document.getElementById('btn-help')?.addEventListener('click', () => this.showOverlay('help-modal', true));
    document.getElementById('help-close')?.addEventListener('click', () => this.showOverlay('help-modal', false));
    document.getElementById('aar-close')?.addEventListener('click', () => this.showOverlay('aar-modal', false));
    document.getElementById('btn-recruit')?.addEventListener('click', () => this.openRecruitmentModal());
    document.getElementById('recruitment-close')?.addEventListener('click', () => this.showOverlay('recruitment-modal', false));

    document.getElementById('toggle-crt')?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      document.body.classList.toggle('tm-crt-enabled', enabled);
    });
    document.getElementById('toggle-audio')?.addEventListener('change', (e) => {
      this.uiAudioEnabled = (e.target as HTMLInputElement).checked;
    });

    document.getElementById('btn-war-summary')?.addEventListener('click', () => this.openWarSummaryModal());

    // Zoom buttons
    document.getElementById('zoom-in')?.addEventListener('click', () => this.zoomIn());
    document.getElementById('zoom-out')?.addEventListener('click', () => this.zoomOut());
    document.getElementById('zoom-in-map')?.addEventListener('click', () => this.zoomIn());
    document.getElementById('zoom-out-map')?.addEventListener('click', () => this.zoomOut());

    // Layer toggles
    const layerMap: Array<[string, keyof typeof this.state.snapshot.layers]> = [
      ['layer-control', 'politicalControl'],
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

    // Legend toggle
    document.getElementById('btn-legend')?.addEventListener('click', () => {
      document.getElementById('legend')?.classList.toggle('hidden');
    });
    // Ethnic 1991: single entry point for toggling political control vs ethnic majority fill
    document.getElementById('btn-ethnic')?.addEventListener('click', () => {
      const current = this.state.snapshot.settlementFillMode;
      const next = current === 'political_control' ? 'ethnic_majority' : 'political_control';
      this.state.setSettlementFillMode(next);
      this.updateLegendContent();
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
      this.stopReplayPlayback();
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
          this.clearStatusBar();
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
          this.clearStatusBar();
        } catch (err) {
          console.error('Failed to load Jan 1993 scenario:', err);
          this.activeControlLookup = { ...this.baselineControlLookup };
          this.activeStatusLookup = { ...this.baselineStatusLookup };
          this.state.clearGameState();
          if (datasetEl) datasetEl.value = 'baseline';
          const statusEl = document.getElementById('status');
          if (statusEl) {
            statusEl.textContent = `Error loading Jan 1993: ${err instanceof Error ? err.message : String(err)}`;
            statusEl.classList.remove('hidden');
          }
        }
      } else if (value === 'latest_run') {
        try {
          const base = window.location.origin;
          const res = await fetch(`${base}/data/derived/latest_run_final_save.json`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          const loaded = parseGameState(json);
          this.state.loadGameState(loaded);
          this.activeControlLookup = buildControlLookup(loaded.controlBySettlement);
          this.activeStatusLookup = buildStatusLookup(loaded.statusBySettlement);
          this.state.setControlDataset('latest_run');
          const turnDisplay = document.getElementById('turn-display');
          if (turnDisplay) turnDisplay.textContent = loaded.label;
          const formCheckbox = document.getElementById('layer-formations') as HTMLInputElement | null;
          if (formCheckbox) {
            formCheckbox.disabled = false;
            formCheckbox.checked = true;
            this.state.setLayer('formations', true);
          }
          const brigadeAorCheckbox = document.getElementById('layer-brigade-aor') as HTMLInputElement | null;
          if (brigadeAorCheckbox) brigadeAorCheckbox.disabled = false;
          this.updateOOBSidebar(loaded);
          this.baseLayerCache = null;
          this.clearStatusBar();
        } catch (err) {
          console.error('Failed to load latest run:', err);
          this.activeControlLookup = { ...this.baselineControlLookup };
          this.activeStatusLookup = { ...this.baselineStatusLookup };
          this.state.clearGameState();
          if (datasetEl) datasetEl.value = 'baseline';
          const statusEl = document.getElementById('status');
          if (statusEl) {
            statusEl.textContent = 'No latest run. Run a scenario with --map first.';
            statusEl.classList.remove('hidden');
          }
        }
      } else if (value === 'baseline') {
        this.activeControlLookup = { ...this.baselineControlLookup };
        this.activeStatusLookup = { ...this.baselineStatusLookup };
        this.state.setControlDataset('baseline');
        const turnDisplay = document.getElementById('turn-display');
        if (turnDisplay) turnDisplay.textContent = 'Turn 0 — Sep 1991';
        this.clearStatusBar();
      } else if (value.startsWith('loaded:')) {
        const gs = this.state.snapshot.loadedGameState;
        if (gs) {
          this.activeControlLookup = buildControlLookup(gs.controlBySettlement);
          this.activeStatusLookup = buildStatusLookup(gs.statusBySettlement);
          this.state.setControlDataset(value);
          const turnDisplay = document.getElementById('turn-display');
          if (turnDisplay) turnDisplay.textContent = gs.label;
          this.clearStatusBar();
        }
      }
      this.baseLayerCache = null;
    });

    // Load state file (click handler set below: desktop → IPC, else → file input)
    const loadBtn = document.getElementById('btn-load-state');
    const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
    fileInput?.addEventListener('change', async () => {
      this.stopReplayPlayback();
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const loaded = parseGameState(JSON.parse(await file.text()));
        this.applyLoadedGameState(loaded, datasetEl);
      } catch (err) {
        this.showStatusError(`Failed to load state: ${err instanceof Error ? err.message : String(err)}`);
      }
      fileInput.value = '';
    });

    // Load replay timeline bundle
    const loadReplayBtn = document.getElementById('btn-load-replay');
    const replayFileInput = document.getElementById('replay-file-input') as HTMLInputElement | null;
    const replayPlayBtn = document.getElementById('btn-replay-play');
    const replayExportBtn = document.getElementById('btn-replay-export');
    const replayWeekSlider = document.getElementById('replay-week-slider') as HTMLInputElement | null;
    const replayWeekLabel = document.getElementById('replay-week-label');
    loadReplayBtn?.addEventListener('click', () => replayFileInput?.click());
    replayFileInput?.addEventListener('change', async () => {
      const file = replayFileInput.files?.[0];
      if (!file) return;
      try {
        this.stopReplayPlayback();
        this.stopReplayExport();
        const text = await file.text();
        const trimmed = text.trim();
        if (!trimmed) {
          this.setReplayStatus('Replay load failed: file is empty. Use replay_timeline.json from a run with --video.');
          replayFileInput.value = '';
          return;
        }
        let json: ReplayTimelineData;
        try {
          json = JSON.parse(text) as ReplayTimelineData;
        } catch (parseErr) {
          const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
          const likelyTruncated = /end of JSON input|Unexpected token|position|truncat/i.test(msg);
          const hint = likelyTruncated
            ? ' Replay file may be truncated (run was interrupted). Use replay_timeline.json from a run that completed with --video.'
            : ' Use replay_timeline.json from a run with --video and ensure the run completed.';
          this.setReplayStatus(`Replay load failed: ${msg}.${hint}`);
          replayFileInput.value = '';
          return;
        }
        this.loadReplayTimeline(json);
      } catch (err) {
        this.setReplayStatus(`Replay load failed: ${this.formatReplayError(err)}`);
      }
      replayFileInput.value = '';
    });
    replayPlayBtn?.addEventListener('click', () => this.toggleReplayPlayback());
    replayExportBtn?.addEventListener('click', () => this.startReplayExport());
    replayWeekSlider?.addEventListener('input', () => {
      const week = Math.max(1, Number(replayWeekSlider.value));
      this.applyReplayWeek(week - 1);
      if (replayWeekLabel) replayWeekLabel.textContent = `Week ${week}/${this.replayFrames.length || 1}`;
    });

    // Open last run (Electron: when awwv.getLastReplayContent is exposed, show button and load on click)
    const awwv = (window as unknown as { awwv?: { getLastReplayContent?: () => Promise<ReplayTimelineData | null>; setReplayLoadedCallback?: (cb: (data: ReplayTimelineData) => void) => void } }).awwv;
    const openLastReplayBtn = document.getElementById('btn-open-last-replay');
    if (awwv?.getLastReplayContent && openLastReplayBtn) {
      openLastReplayBtn.style.display = '';
      openLastReplayBtn.addEventListener('click', async () => {
        const data = await awwv.getLastReplayContent!();
        if (data) this.loadReplayFromData(data);
        else this.setReplayStatus('No last run replay available.');
      });
    }
    if (awwv?.setReplayLoadedCallback) {
      awwv.setReplayLoadedCallback((data: ReplayTimelineData) => this.loadReplayFromData(data));
    }

    // Play myself (desktop): Load scenario, Load state file, Advance turn
    if (awwvDesktop?.loadScenarioDialog && awwvDesktop?.setGameStateUpdatedCallback) {
      awwvDesktop.setGameStateUpdatedCallback((stateJson: string) => this.applyGameStateFromJson(stateJson));
      const playSep = document.getElementById('play-myself-sep');
      const playRow = document.getElementById('play-myself-row');
      if (playSep) playSep.style.display = '';
      if (playRow) playRow.style.display = '';
      document.getElementById('btn-load-scenario')?.addEventListener('click', async () => {
        const r = await awwvDesktop.loadScenarioDialog!();
        if (!r.ok && r.error) this.showStatusError(r.error);
      });
      document.getElementById('btn-advance-turn')?.addEventListener('click', async () => {
        const before = this.lastLoadedGameState;
        const r = await awwvDesktop.advanceTurn!();
        if (!r.ok && r.error) this.showStatusError(r.error);
        if (r.ok && r.stateJson) {
          const parsed = parseGameState(JSON.parse(r.stateJson) as unknown);
          this.lastLoadedGameState = parsed;
          if (this.uiAudioEnabled) {
            const audio = new AudioContext();
            const osc = audio.createOscillator();
            const gain = audio.createGain();
            osc.type = 'triangle';
            osc.frequency.value = 440;
            gain.gain.value = 0.03;
            osc.connect(gain);
            gain.connect(audio.destination);
            osc.start();
            osc.stop(audio.currentTime + 0.08);
          }
          if (before) this.maybeShowAarFromStateDelta(before, parsed);
        }
      });
      // In desktop, "Load State..." can also go through main (file picker from main)
      const loadStateBtn = document.getElementById('btn-load-state');
      const fileInputForLoad = document.getElementById('file-input') as HTMLInputElement | null;
      const loadStateDesktopBtn = document.getElementById('btn-load-state-desktop');
      if (loadStateDesktopBtn && awwvDesktop.loadStateDialog) {
        loadStateDesktopBtn.addEventListener('click', async () => {
          const r = await awwvDesktop.loadStateDialog!();
          if (!r.ok && r.error) this.showStatusError(r.error);
        });
      }
    }
    loadBtn?.addEventListener('click', () => fileInput?.click());

    // Search input
    const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
    searchInput?.addEventListener('input', () => this.updateSearchResults());
    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hideSearch();
    });

    // Turn display init
    const turnDisplay = document.getElementById('turn-display');
    if (turnDisplay) turnDisplay.textContent = 'Turn 0 — Sep 1991';
    this.setReplayStatus('Replay: not loaded');
    this.updateReplayScrubber();
    this.showOverlay('main-menu-overlay', true);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.showOverlay('main-menu-overlay', false);
        this.showOverlay('side-picker-overlay', false);
        this.showOverlay('settings-modal', false);
        this.showOverlay('help-modal', false);
        this.showOverlay('aar-modal', false);
        this.showOverlay('recruitment-modal', false);
        this.hideSearch();
      } else if (e.key.toLowerCase() === 'r') {
        if (this.lastLoadedGameState?.recruitment) {
          this.openRecruitmentModal();
        } else {
          document.getElementById('btn-load-replay')?.dispatchEvent(new Event('click'));
        }
      } else if (e.key.toLowerCase() === 'm') {
        this.showOverlay('main-menu-overlay', !document.getElementById('main-menu-overlay')?.classList.contains('open'));
      } else if (e.key.toLowerCase() === 'o') {
        this.toggleOOB();
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.toggleReplayPlayback();
      }
    });
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

    // If a settlement or formation is selected, pan to center on it
    const bounds = this.data.dataBounds;
    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;
    const selectedSid = this.state.snapshot.selectedSettlementSid;
    const selectedFid = this.state.snapshot.selectedFormationId;
    if (selectedSid && bw > 0 && bh > 0) {
      const centroid = this.data.settlementCentroids.get(selectedSid);
      if (centroid) {
        this.state.setPan((centroid[0] - bounds.minX) / bw, (centroid[1] - bounds.minY) / bh);
      }
    } else if (selectedFid && bw > 0 && bh > 0) {
      const gs = this.state.snapshot.loadedGameState;
      const fv = gs?.formations.find(f => f.id === selectedFid);
      if (fv) {
        // Try HQ settlement centroid first, then municipality centroid
        let centroid: [number, number] | undefined;
        if (fv.hq_sid) centroid = this.data.settlementCentroids.get(fv.hq_sid);
        if (!centroid && fv.municipalityId) centroid = this.data.municipalityCentroids.get(fv.municipalityId);
        if (centroid) {
          this.state.setPan((centroid[0] - bounds.minX) / bw, (centroid[1] - bounds.minY) / bh);
        }
      }
    }
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
        <div class="tm-legend-row">&mdash; &mdash; Front line (dashed)</div>`;
    } else {
      el.innerHTML = `
        <div class="tm-legend-row"><span class="tm-swatch" style="background:rgb(70,120,80)"></span> RBiH (ARBiH)</div>
        <div class="tm-legend-row"><span class="tm-swatch" style="background:rgb(180,50,50)"></span> RS (VRS)</div>
        <div class="tm-legend-row"><span class="tm-swatch" style="background:rgb(60,100,140)"></span> HRHB (HVO)</div>
        <div class="tm-legend-row"><span class="tm-swatch" style="background:rgb(100,100,100)"></span> Neutral</div>
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

    const key = controlKey(sid);
    const controller = this.activeControlLookup[key] ?? this.activeControlLookup[sid] ?? 'null';
    const controlStatus = this.activeStatusLookup[key] ?? this.activeStatusLookup[sid] ?? 'CONSOLIDATED';
    const factionColor = SIDE_SOLID_COLORS[controller] ?? SIDE_SOLID_COLORS['null'];

    if (!this.showPanel(factionColor)) return;

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

    const flagEl = document.getElementById('panel-flag') as HTMLImageElement;
    if (flagEl) {
      flagEl.src = this.getFlagUrl(controller);
      flagEl.style.display = controller && controller !== 'null' ? '' : 'none';
    }

    // Build tabs
    this.buildPanelTabs(sid, feature, controller, controlStatus, factionColor);
  }

  /** Open the side panel and apply the given faction accent color. Returns the panel element, or null if missing. */
  private showPanel(factionColor: string): HTMLElement | null {
    const panel = document.getElementById('settlement-panel');
    if (!panel) return null;
    panel.classList.remove('closed');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    panel.style.borderLeftColor = factionColor;
    panel.style.setProperty('--faction-color', factionColor);
    return panel;
  }

  private closeSettlementPanel(): void {
    const panel = document.getElementById('settlement-panel');
    if (!panel) return;
    panel.classList.add('closed');
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }

  /** Enter target-selection mode for a move or attack order. Closes the panel and shows a status prompt. */
  private enterOrderSelectionMode(type: 'move' | 'attack', brigadeId: string, brigadeName: string): void {
    this.pendingOrderMode = { type, brigadeId, brigadeName };
    const target = type === 'move' ? 'municipality' : 'settlement';
    this.showStatusError(`Select target ${target} on the map for ${brigadeName} ${type} order. Click a settlement to set target.`);
    this.closeSettlementPanel();
  }

  private openBrigadePanel(f: FormationView): void {
    const gs = this.state.snapshot.loadedGameState;
    if (!gs) return;

    const factionColor = SIDE_SOLID_COLORS[f.faction] ?? '#888';
    if (!this.showPanel(factionColor)) return;

    document.getElementById('panel-name')!.textContent = f.name;
    const flagEl = document.getElementById('panel-flag') as HTMLImageElement;
    if (flagEl) {
      flagEl.src = this.getFlagUrl(f.faction);
      flagEl.style.display = '';
    }

    const tabsEl = document.getElementById('panel-tabs')!;
    const contentEl = document.getElementById('panel-content')!;
    tabsEl.innerHTML = '';

    if (f.kind === 'corps' || f.kind === 'corps_asset') {
      this.renderCorpsPanel(f, gs, contentEl);
    } else {
      this.renderBrigadePanel(f, gs, contentEl);
    }
  }

  /** Render corps detail panel: command info, stance, exhaustion, subordinate OOB. */
  private renderCorpsPanel(f: FormationView, gs: LoadedGameState, contentEl: HTMLElement): void {
    const subtitleParts = ['corps', SIDE_LABELS[f.faction] ?? f.faction];
    if (f.corpsStance) subtitleParts.push(f.corpsStance);
    document.getElementById('panel-subtitle')!.textContent = subtitleParts.join(' — ');

    const crestUrl = this.getCrestUrl(f.faction);

    // Subordinates
    const subIds = f.subordinateIds ?? [];
    const subordinates = subIds
      .map(id => gs.formations.find(sub => sub.id === id))
      .filter((s): s is FormationView => s != null);
    const totalPersonnel = subordinates.reduce((sum, s) => sum + (s.personnel ?? 0), 0);

    let html = `<div class="tm-brigade-crest-wrap"><img class="tm-brigade-crest" src="${this.escapeHtml(crestUrl)}" alt="" /></div>`;

    // Command section
    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">CORPS COMMAND</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">ID</span><span class="tm-panel-field-value">${this.escapeHtml(f.id)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Faction</span><span class="tm-panel-field-value">${this.escapeHtml(SIDE_LABELS[f.faction] ?? f.faction)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Stance</span><span class="tm-panel-field-value tm-stance-${this.escapeHtml(f.corpsStance ?? 'unknown')}">${this.escapeHtml(f.corpsStance ?? '—')}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Exhaustion</span><span class="tm-panel-field-value">${f.corpsExhaustion != null ? (f.corpsExhaustion * 100).toFixed(0) + '%' : '—'}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Command span</span><span class="tm-panel-field-value">${f.corpsCommandSpan ?? '—'}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Status</span><span class="tm-panel-field-value">${this.escapeHtml(f.status)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Created (turn)</span><span class="tm-panel-field-value">${f.createdTurn}</span></div>
    </div>`;

    // Strength summary
    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">STRENGTH</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Subordinate brigades</span><span class="tm-panel-field-value">${subordinates.length}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Total personnel</span><span class="tm-panel-field-value">${totalPersonnel.toLocaleString()}</span></div>
    </div>`;

    // OG slots
    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">OPERATIONAL GROUPS</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">OG slots</span><span class="tm-panel-field-value">${f.corpsOgSlots ?? '—'}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Active OGs</span><span class="tm-panel-field-value">${f.corpsActiveOgIds?.length ?? 0}</span></div>`;
    if (f.corpsActiveOgIds && f.corpsActiveOgIds.length > 0) {
      for (const ogId of f.corpsActiveOgIds) {
        const ogF = gs.formations.find(sub => sub.id === ogId);
        html += `<div class="tm-panel-field" style="padding-left:8px"><span class="tm-panel-field-label" style="font-size:10px">${this.escapeHtml(ogId)}</span><span class="tm-panel-field-value" style="font-size:10px">${ogF ? this.escapeHtml(ogF.name) : '—'}</span></div>`;
      }
    }
    html += `</div>`;

    // Subordinate OOB list
    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">ORDER OF BATTLE</div>`;
    if (subordinates.length === 0) {
      html += `<div class="tm-panel-placeholder">No subordinate formations</div>`;
    } else {
      for (const sub of subordinates) {
        const readinessColor = panelReadinessColor(sub.readiness);
        const subCrest = this.getCrestUrl(sub.faction);
        const persStr = sub.personnel != null ? sub.personnel.toLocaleString() : '—';
        const postureStr = sub.posture ? ` · ${sub.posture}` : '';
        html += `<div class="tm-formation-row" data-formation-id="${this.escapeHtml(sub.id)}" style="cursor:pointer">
          <img class="tm-formation-crest" src="${this.escapeHtml(subCrest)}" alt="" />
          <span class="tm-formation-badge" style="background:${readinessColor}" title="${sub.readiness}"></span>
          <span class="tm-formation-name">${this.escapeHtml(sub.name)}</span>
          <span class="tm-formation-kind" style="opacity:0.6;font-size:10px">${persStr}${postureStr}</span>
        </div>`;
      }
    }
    html += `</div>`;

    contentEl.innerHTML = html;

    // Wire subordinate clicks → open that brigade's panel
    contentEl.querySelectorAll('.tm-formation-row[data-formation-id]').forEach(row => {
      row.addEventListener('click', () => {
        const fid = (row as HTMLElement).dataset.formationId;
        if (!fid) return;
        const sub = gs.formations.find(s => s.id === fid);
        if (sub) {
          this.state.setSelectedFormation(fid);
          this.openBrigadePanel(sub);
        }
      });
    });
  }

  /** Render brigade/militia/TD detail panel. */
  private renderBrigadePanel(f: FormationView, gs: LoadedGameState, contentEl: HTMLElement): void {
    const subtitleParts = [f.kind, f.faction];
    if (f.personnel != null) subtitleParts.push(`${f.personnel} pers`);
    if (f.posture) subtitleParts.push(f.posture);
    document.getElementById('panel-subtitle')!.textContent = subtitleParts.join(' — ');

    const aorSids = gs.brigadeAorByFormationId[f.id] ?? f.aorSettlementIds ?? [];
    const aorCount = aorSids.length;
    const potentialCap = computeBrigadeOperationalCoverageCapFromFormation({
      personnel: f.personnel,
      readiness: f.readiness,
      posture: f.posture,
      status: f.status,
      kind: f.kind,
      tags: f.tags
    });
    // Effective cap cannot exceed currently assigned AoR footprint.
    const cap = Math.min(aorCount, potentialCap);
    const coveredCount = Math.min(aorCount, cap);
    const overflowCount = Math.max(0, aorCount - coveredCount);
    const homeMun = getFormationHomeMunFromTags(f.tags);
    const fortressActive = Boolean(
      homeMun &&
      isLargeUrbanSettlementMun(homeMun) &&
      (f.posture === 'defend' || f.posture === 'elastic_defense') &&
      potentialCap === 1
    );

    // Parent corps reference
    let corpsName = '';
    if (f.corps_id) {
      const corpsF = gs.formations.find(c => c.id === f.corps_id);
      corpsName = corpsF ? corpsF.name : f.corps_id;
    }

    const crestUrl = this.getCrestUrl(f.faction);
    let html = `<div class="tm-brigade-crest-wrap"><img class="tm-brigade-crest" src="${this.escapeHtml(crestUrl)}" alt="" /></div>`;

    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">FORMATION</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">ID</span><span class="tm-panel-field-value">${this.escapeHtml(f.id)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Faction</span><span class="tm-panel-field-value">${this.escapeHtml(f.faction)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Kind</span><span class="tm-panel-field-value">${this.escapeHtml(f.kind)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Status</span><span class="tm-panel-field-value">${this.escapeHtml(f.status)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Created (turn)</span><span class="tm-panel-field-value">${f.createdTurn}</span></div>`;
    if (corpsName) {
      html += `<div class="tm-panel-field"><span class="tm-panel-field-label">Corps</span><span class="tm-panel-field-value tm-corps-link" data-corps-id="${this.escapeHtml(f.corps_id!)}" style="cursor:pointer;text-decoration:underline">${this.escapeHtml(corpsName)}</span></div>`;
    }
    html += `</div>`;

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
    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">OPERATIONAL COVERAGE</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Dynamic cap</span><span class="tm-panel-field-value">${cap}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Potential cap</span><span class="tm-panel-field-value">${potentialCap}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Covered</span><span class="tm-panel-field-value">${coveredCount}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Overflow</span><span class="tm-panel-field-value">${overflowCount}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Urban fortress</span><span class="tm-panel-field-value">${fortressActive ? 'Active' : 'No'}</span></div>
    </div>`;
    // Posture dropdown
    const postures = ['defend', 'probe', 'attack', 'elastic_defense', 'consolidation'];
    const currentPosture = f.posture ?? 'defend';
    const postureOptions = postures.map(p =>
      `<option value="${this.escapeHtml(p)}"${p === currentPosture ? ' selected' : ''}>${this.escapeHtml(p)}</option>`
    ).join('');

    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">ACTIONS</div>
      <div class="tm-panel-field">
        <span class="tm-panel-field-label">Posture</span>
        <select id="brigade-posture-select" class="tm-select" style="font-size:11px;padding:2px 4px;background:#1a2236;color:#c8e6c9;border:1px solid rgba(200,230,201,0.3);border-radius:3px">${postureOptions}</select>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
        <button type="button" class="tm-toolbar-btn" data-brigade-action="move" title="Select target municipality on map">Move</button>
        <button type="button" class="tm-toolbar-btn" data-brigade-action="attack" title="Select target settlement on map">Attack</button>
      </div>
    </div>`;

    contentEl.innerHTML = html;

    // Wire posture dropdown
    const postureSelect = contentEl.querySelector('#brigade-posture-select') as HTMLSelectElement | null;
    if (postureSelect) {
      postureSelect.addEventListener('change', () => {
        const newPosture = postureSelect.value;
        this.showStatusError(`Posture order staged: ${f.name} → ${newPosture}. Advance turn to execute.`);
      });
    }

    // Wire move/attack buttons → enter target selection mode
    contentEl.querySelectorAll('[data-brigade-action]').forEach((el) => {
      el.addEventListener('click', () => {
        const action = (el as HTMLElement).getAttribute('data-brigade-action') as 'move' | 'attack';
        this.enterOrderSelectionMode(action, f.id, f.name);
      });
    });

    // Wire corps link click → navigate to parent corps panel
    contentEl.querySelectorAll('.tm-corps-link[data-corps-id]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const corpsId = (el as HTMLElement).dataset.corpsId;
        if (!corpsId) return;
        const corpsF = gs.formations.find(c => c.id === corpsId);
        if (corpsF) {
          this.state.setSelectedFormation(corpsId);
          this.openBrigadePanel(corpsF);
        }
      });
    });
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
      { id: 'overview', label: 'OVERVIEW' },
      { id: 'admin', label: 'ADMIN' },
      { id: 'control', label: 'CONTROL' },
      { id: 'intel', label: 'MILITARY' },
      { id: 'orders', label: 'ORDERS' },
      { id: 'aar', label: 'HISTORY' },
      { id: 'events', label: 'EVENTS' },
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
      } else if (tabId === 'orders') {
        contentEl.innerHTML = this.renderOrdersTab(sid);
      } else if (tabId === 'aar') {
        contentEl.innerHTML = this.renderAarTab(sid);
      } else if (tabId === 'events') {
        contentEl.innerHTML = this.renderEventsTab(sid);
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

  /** Normalize mun1990 slug for lookup (by_mun1990_id keys are lowercase with underscores). */
  private static normalizeMun1990Slug(slug: string): string {
    return slug.toLowerCase().replace(/-/g, '_').trim();
  }

  /** Resolve municipality display name and mun1990_id from feature (municipality_id or mun1990_id). */
  private resolveMunicipalityFromFeature(feature: SettlementFeature): { displayName: string; mun1990Id: string; idForDisplay: string } {
    const props = feature.properties as Record<string, unknown>;
    const munId = feature.properties.municipality_id;
    const mun1990SlugRaw = props?.mun1990_id as string | undefined;
    const mun1990Slug = mun1990SlugRaw && String(mun1990SlugRaw).trim() ? String(mun1990SlugRaw).trim() : undefined;
    const mun1990NameOnFeature = props?.mun1990_name as string | undefined;
    const munMid = munId != null ? String(munId) : undefined;
    const byMun = this.data.mun1990Names.by_municipality_id ?? {};
    const byMun1990 = this.data.mun1990Names.by_mun1990_id ?? {};
    if (munMid && byMun[munMid]) {
      const e = byMun[munMid];
      return { displayName: e.display_name, mun1990Id: e.mun1990_id, idForDisplay: munMid };
    }
    if (mun1990Slug) {
      const normalized = MapApp.normalizeMun1990Slug(mun1990Slug);
      const entry = byMun1990[mun1990Slug] ?? byMun1990[normalized];
      if (entry) return { displayName: entry.display_name, mun1990Id: mun1990Slug, idForDisplay: mun1990Slug };
      return {
        displayName: mun1990NameOnFeature && String(mun1990NameOnFeature).trim() ? String(mun1990NameOnFeature).trim() : mun1990Slug,
        mun1990Id: mun1990Slug,
        idForDisplay: mun1990Slug,
      };
    }
    if (munMid) return { displayName: munMid, mun1990Id: byMun[munMid]?.mun1990_id ?? '', idForDisplay: munMid };
    return { displayName: '—', mun1990Id: '', idForDisplay: '—' };
  }

  private renderAdminTab(sid: string, feature: SettlementFeature): string {
    const resolved = this.resolveMunicipalityFromFeature(feature);
    const natoClass = feature.properties.nato_class ?? 'SETTLEMENT';

    // Count settlements in same municipality (by resolved mun1990Id); deterministic sorted iteration
    let munSettlementCount = 0;
    const sidOrder = Array.from(this.data.settlements.keys()).sort();
    for (const s of sidOrder) {
      const f = this.data.settlements.get(s)!;
      const r = this.resolveMunicipalityFromFeature(f);
      if (r.mun1990Id && r.mun1990Id === resolved.mun1990Id) munSettlementCount++;
    }

    return `<div class="tm-panel-section">
      <div class="tm-panel-section-header">MUNICIPALITY</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Name</span><span class="tm-panel-field-value">${this.escapeHtml(resolved.displayName)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">ID</span><span class="tm-panel-field-value">${this.escapeHtml(resolved.idForDisplay)}</span></div>
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
        <div class="tm-panel-section-header">MILITARY</div>
        <div class="tm-panel-placeholder">Load a game state to view military information.</div>
      </div>`;
    }

    // Resolve municipality (municipality_id or mun1990_id) so formations/pools match by mun1990_id
    const { mun1990Id } = this.resolveMunicipalityFromFeature(feature);

    const formations = gs.formations.filter(f => f.municipalityId === mun1990Id);

    let html = `<div class="tm-panel-section"><div class="tm-panel-section-header">FORMATIONS (${formations.length})</div>`;
    if (formations.length === 0) {
      html += `<div class="tm-panel-placeholder">No formations in this municipality.</div>`;
    } else {
      for (const f of formations.slice(0, 20)) {
        const readinessColor = panelReadinessColor(f.readiness);
        const cohesionPct = Math.round(f.cohesion);
        const intelCrestUrl = this.getCrestUrl(f.faction);
        html += `<div class="tm-formation-row">
          <img class="tm-formation-crest" src="${this.escapeHtml(intelCrestUrl)}" alt="" />
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

  private renderOrdersTab(sid: string): string {
    const gs = this.state.snapshot.loadedGameState;
    if (!gs) {
      return `<div class="tm-panel-section"><div class="tm-panel-section-header">ORDERS</div><div class="tm-panel-placeholder">Load a game state to inspect orders.</div></div>`;
    }
    const attack = gs.attackOrders.filter((o) => o.targetSettlementId === sid);
    const movement = gs.movementOrders.filter((o) => {
      const feature = this.getSettlementFeatureBySid(sid);
      if (!feature) return false;
      const { mun1990Id } = this.resolveMunicipalityFromFeature(feature);
      return mun1990Id === o.targetMunicipalityId;
    });
    let html = `<div class="tm-panel-section"><div class="tm-panel-section-header">PENDING ATTACK ORDERS (${attack.length})</div>`;
    if (attack.length === 0) {
      html += `<div class="tm-panel-placeholder">No pending attack orders for this settlement.</div>`;
    } else {
      for (const o of attack) {
        html += `<div class="tm-panel-field"><span class="tm-panel-field-label">${this.escapeHtml(o.brigadeId)}</span><span class="tm-panel-field-value">ATTACK</span></div>`;
      }
    }
    html += `</div><div class="tm-panel-section"><div class="tm-panel-section-header">PENDING MOVE ORDERS (${movement.length})</div>`;
    if (movement.length === 0) {
      html += `<div class="tm-panel-placeholder">No pending movement orders for this municipality.</div>`;
    } else {
      for (const o of movement) {
        html += `<div class="tm-panel-field"><span class="tm-panel-field-label">${this.escapeHtml(o.brigadeId)}</span><span class="tm-panel-field-value">MOVE ${this.escapeHtml(o.targetMunicipalityId)}</span></div>`;
      }
    }
    html += `</div>`;
    return html;
  }

  private renderAarTab(sid: string): string {
    const gs = this.state.snapshot.loadedGameState;
    if (!gs) {
      return `<div class="tm-panel-section"><div class="tm-panel-section-header">HISTORY</div><div class="tm-panel-placeholder">Load a game state to view control change history.</div></div>`;
    }
    const recent = gs.recentControlEvents.filter((e) => e.settlementId === sid).slice(-20).reverse();
    let html = `<div class="tm-panel-section"><div class="tm-panel-section-header">CONTROL CHANGES (${recent.length})</div>`;
    if (recent.length === 0) {
      html += `<div class="tm-panel-placeholder">No recorded control changes for this settlement.</div>`;
    } else {
      for (const e of recent) {
        html += `<div class="tm-panel-field"><span class="tm-panel-field-label">Turn ${e.turn}</span><span class="tm-panel-field-value">${this.escapeHtml(e.from ?? 'null')} → ${this.escapeHtml(e.to ?? 'null')}</span></div>`;
      }
    }
    html += `</div>`;
    return html;
  }

  private renderEventsTab(sid: string): string {
    const gs = this.state.snapshot.loadedGameState;
    const feature = this.data.settlements.get(sid);
    if (!gs) {
      return `<div class="tm-panel-section"><div class="tm-panel-section-header">EVENTS</div><div class="tm-panel-placeholder">No game state loaded.</div></div>`;
    }
    const targetMun = feature ? this.resolveMunicipalityFromFeature(feature).mun1990Id : '';
    const events = gs.recentControlEvents
      .filter((e) => e.settlementId === sid || (targetMun !== '' && e.municipalityId === targetMun))
      .slice(-30)
      .reverse();
    let html = `<div class="tm-panel-section"><div class="tm-panel-section-header">EVENT LOG (${events.length})</div>`;
    if (events.length === 0) {
      html += `<div class="tm-panel-placeholder">No events for this area yet.</div>`;
    } else {
      for (const e of events) {
        html += `<div class="tm-panel-field"><span class="tm-panel-field-label">T${e.turn} ${this.escapeHtml(e.mechanism)}</span><span class="tm-panel-field-value">${this.escapeHtml(e.settlementId)}</span></div>`;
      }
    }
    html += `</div>`;
    return html;
  }

  // ─── OOB Sidebar ────────────────────────────────

  private updateWarStatusSection(gs: LoadedGameState): void {
    const container = document.getElementById('war-status-content');
    if (!container) return;
    const totalsByFaction = new Map<string, number>();
    const countsByFaction = new Map<string, number>();
    const allSids = Object.keys(this.activeControlLookup).sort();
    for (const sid of allSids) {
      const c = this.activeControlLookup[sid];
      if (!c) continue;
      countsByFaction.set(c, (countsByFaction.get(c) ?? 0) + 1);
    }
    for (const f of gs.formations) {
      totalsByFaction.set(f.faction, (totalsByFaction.get(f.faction) ?? 0) + (f.personnel ?? 0));
    }
    const totalSettlements = Math.max(1, allSids.length);
    let html = `<div class="tm-panel-section"><div class="tm-panel-section-header">WAR STATUS</div>`;
    for (const faction of FACTION_DISPLAY_ORDER) {
      const count = countsByFaction.get(faction) ?? 0;
      const pct = ((count / totalSettlements) * 100).toFixed(1);
      const personnel = totalsByFaction.get(faction) ?? 0;
      html += `<div class="tm-panel-field"><span class="tm-panel-field-label">${this.escapeHtml(SIDE_LABELS[faction] ?? faction)}</span><span class="tm-panel-field-value">${pct}% | ${personnel.toLocaleString()} pers</span></div>`;
    }
    const flipsThisTurn = gs.recentControlEvents.filter((e) => e.turn === gs.turn).length;
    const pendingOrders = gs.attackOrders.length + gs.movementOrders.length;
    const overextended = gs.formations.filter((f) => f.readiness === 'overextended').length;
    const lowCohesion = gs.formations.filter((f) => f.cohesion < 40).length;
    html += `<div class="tm-panel-field"><span class="tm-panel-field-label">Flips this turn</span><span class="tm-panel-field-value">${flipsThisTurn}</span></div>`;
    html += `<div class="tm-panel-field"><span class="tm-panel-field-label">Pending orders</span><span class="tm-panel-field-value">${pendingOrders}</span></div>`;
    html += `</div>`;
    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">FACTION OVERVIEW</div>`;
    for (const faction of FACTION_DISPLAY_ORDER) {
      const formations = gs.formations.filter((f) => f.faction === faction);
      const avgCohesion = formations.length === 0 ? 0 : Math.round(formations.reduce((s, f) => s + f.cohesion, 0) / formations.length);
      html += `<div class="tm-panel-field"><span class="tm-panel-field-label">${this.escapeHtml(SIDE_LABELS[faction] ?? faction)}</span><span class="tm-panel-field-value">${formations.length} brigades | coh ${avgCohesion}%</span></div>`;
    }
    html += `</div>`;
    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">ALERTS</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Overextended brigades</span><span class="tm-panel-field-value">${overextended}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Low cohesion (&lt;40)</span><span class="tm-panel-field-value">${lowCohesion}</span></div>
    </div>`;
    container.innerHTML = html;
  }

  private updateStatusTicker(gs: LoadedGameState): void {
    const status = document.getElementById('status');
    if (!status) return;
    const last = gs.recentControlEvents.at(-1);
    status.textContent = last
      ? `Turn ${gs.turn}: ${last.settlementId} ${last.from ?? 'null'} -> ${last.to ?? 'null'} via ${last.mechanism}`
      : `Turn ${gs.turn} (${gs.phase}) ready.`;
    status.classList.remove('hidden', 'error');
  }

  private toggleOOB(): void {
    const sidebar = document.getElementById('oob-sidebar');
    if (!sidebar) return;
    const isOpen = sidebar.classList.contains('open');
    sidebar.classList.toggle('open', !isOpen);
    sidebar.classList.toggle('closed', isOpen);
    sidebar.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
  }

  private updateOOBSidebar(gs: LoadedGameState): void {
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
    for (const faction of FACTION_DISPLAY_ORDER) {
      const formations = byFaction.get(faction) ?? [];
      if (formations.length === 0) continue;
      const fColor = SIDE_SOLID_COLORS[faction] ?? '#888';
      const avgCohesion = formations.reduce((s, f) => s + f.cohesion, 0) / formations.length;

      const crestUrl = this.getCrestUrl(faction);
      html += `<div class="tm-oob-faction">
        <div class="tm-oob-faction-header">
          <img class="tm-oob-faction-crest" src="${this.escapeHtml(crestUrl)}" alt="" />
          <span class="tm-oob-faction-badge" style="background:${fColor}"></span>
          <span>${this.escapeHtml(SIDE_LABELS[faction] ?? faction)}</span>
          <span class="tm-oob-faction-count">${formations.length} formations — avg cohesion ${Math.round(avgCohesion)}%</span>
        </div>
        <div class="tm-oob-formation-list">`;

      // Show first 50 formations
      for (const f of formations.slice(0, 50)) {
        const readinessColor = panelReadinessColor(f.readiness);
        const rowCrestUrl = this.getCrestUrl(f.faction);
        html += `<div class="tm-formation-row" data-mun="${this.escapeHtml(f.municipalityId ?? '')}" style="cursor:pointer">
          <img class="tm-formation-crest" src="${this.escapeHtml(rowCrestUrl)}" alt="" />
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

    this.updateArmyStrengthDisplay(gs);
    this.updateRecruitmentCapitalDisplay(gs);

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

  /** Update toolbar army strength line: total personnel per faction (soldiers in formations). */
  private updateArmyStrengthDisplay(gs: LoadedGameState | null): void {
    const el = document.getElementById('army-strength');
    if (!el) return;
    if (!gs?.formations?.length) {
      el.textContent = '';
      el.style.display = 'none';
      return;
    }
    const byFaction: Record<string, number> = {};
    for (const f of gs.formations) {
      const fac = f.faction || '';
      byFaction[fac] = (byFaction[fac] ?? 0) + (f.personnel ?? 0);
    }
    const parts = FACTION_DISPLAY_ORDER
      .filter((f) => (byFaction[f] ?? 0) > 0)
      .map((f) => `${SIDE_LABELS[f] ?? f} ${(byFaction[f] ?? 0).toLocaleString()}`);
    el.textContent = parts.length > 0 ? `Army: ${parts.join(' | ')}` : '';
    el.style.display = parts.length > 0 ? '' : 'none';
  }

  /** Update toolbar recruitment capital: capital by faction when recruitment_state exists. */
  private updateRecruitmentCapitalDisplay(gs: LoadedGameState | null): void {
    const el = document.getElementById('recruitment-capital');
    if (!el) return;
    const rec = gs?.recruitment?.capitalByFaction;
    if (!rec || Object.keys(rec).length === 0) {
      el.textContent = '';
      el.style.display = 'none';
      return;
    }
    const parts = FACTION_DISPLAY_ORDER
      .filter((f) => rec[f] !== undefined)
      .map((f) => `${SIDE_LABELS[f] ?? f} ${Math.round(rec[f] ?? 0)}`);
    el.textContent = parts.length > 0 ? `Capital: ${parts.join(' | ')}` : '';
    el.style.display = parts.length > 0 ? '' : 'none';
  }

  /** Open recruitment modal; load catalog from desktop when available and render brigade list. */
  private async openRecruitmentModal(): Promise<void> {
    this.showOverlay('recruitment-modal', true);
    const content = document.getElementById('recruitment-content');
    const confirmBtn = document.getElementById('recruitment-confirm') as HTMLButtonElement | null;
    if (!content) return;

    const setMsg = (html: string) => {
      content.innerHTML = html;
      if (confirmBtn) confirmBtn.disabled = true;
    };

    const gs = this.lastLoadedGameState;
    if (!gs?.recruitment) {
      setMsg('<p class="tm-muted">Load a game state with recruitment (player_choice scenario) to see the brigade catalog.</p>');
      return;
    }

    const awwv = (window as unknown as {
      awwv?: {
        getRecruitmentCatalog?: () => Promise<{ brigades?: Array<{ id: string; faction: string; name: string; home_mun: string; manpower_cost: number; capital_cost: number; default_equipment_class: string; available_from: number; mandatory: boolean }>; error?: string }>;
        applyRecruitment?: (brigadeId: string, equipmentClass: string) => Promise<{ ok: boolean; error?: string; stateJson?: string; newFormationId?: string }>;
      };
    }).awwv;
    if (!awwv?.getRecruitmentCatalog) {
      setMsg('<p class="tm-muted">Run the desktop app (npm run desktop) to load the recruitment catalog and activate brigades.</p>');
      return;
    }

    try {
      const catalog = await awwv.getRecruitmentCatalog();
      const allBrigades = catalog?.brigades ?? [];
      const playerFaction = gs.player_faction ?? null;

      if (allBrigades.length === 0) {
        setMsg(`<p class="tm-muted">${catalog?.error ? this.escapeHtml(catalog.error) : 'No brigade catalog available.'}</p>`);
        return;
      }

      if (!playerFaction) {
        setMsg('<p class="tm-muted">Start a New Campaign and choose your side to see recruitment options.</p>');
        return;
      }

      const rec = gs.recruitment;
      const recruitedSet = new Set(rec.recruitedBrigadeIds ?? []);
      const capitalByFaction = rec.capitalByFaction ?? {};
      const equipmentByFaction = rec.equipmentByFaction ?? {};
      const turn = gs.turn ?? 0;

      const poolByKey = new Map<string, number>();
      for (const p of gs.militiaPools ?? []) {
        const key = `${p.munId}:${p.faction}`;
        poolByKey.set(key, (poolByKey.get(key) ?? 0) + p.available);
      }

      type CatalogBrigade = (typeof allBrigades)[number];
      const getEquipCost = (cls: string) => {
        try {
          return getEquipmentCost(cls as 'mechanized' | 'motorized' | 'mountain' | 'light_infantry' | 'garrison' | 'police' | 'special');
        } catch {
          return 0;
        }
      };

      const recruitable: { b: CatalogBrigade; equipCost: number; manpowerAvail: number }[] = [];
      for (const b of allBrigades) {
        if (b.faction !== playerFaction) continue;
        const equipCost = getEquipCost(b.default_equipment_class);
        const manpowerAvail = poolByKey.get(`${b.home_mun}:${b.faction}`) ?? 0;
        const cap = capitalByFaction[b.faction] ?? 0;
        const eq = equipmentByFaction[b.faction] ?? 0;
        const eligible = !recruitedSet.has(b.id) && b.available_from <= turn && cap >= b.capital_cost && eq >= equipCost && manpowerAvail >= b.manpower_cost;
        if (eligible) recruitable.push({ b, equipCost, manpowerAvail });
      }

      const playerCap = Math.round(capitalByFaction[playerFaction] ?? 0);
      const playerEq = Math.round(equipmentByFaction[playerFaction] ?? 0);
      let html = '<div class="tm-recruitment-resources">';
      html += `<span class="tm-recruitment-faction">${this.escapeHtml(SIDE_LABELS[playerFaction] ?? playerFaction)}: ${playerCap} Capital, ${playerEq} Equipment</span>`;
      html += '</div>';
      html += '<p class="tm-recruitment-legend tm-muted">Costs: <strong>C</strong> = Capital, <strong>E</strong> = Equipment, <strong>M</strong> = Manpower (from militia pool)</p>';
      html += '<div class="tm-recruitment-catalog">';

      if (recruitable.length === 0) {
        html += '<p class="tm-muted">No brigades available to recruit right now. Earn more Capital, Equipment, or Manpower (militia pool) to unlock options.</p>';
      } else {
        html += '<table class="tm-recruitment-table"><thead><tr><th>Brigade</th><th>Home</th><th>Cost</th><th>Pool (M)</th><th></th></tr></thead><tbody>';
        for (const { b, equipCost, manpowerAvail } of recruitable) {
          html += `<tr class="tm-recruitment-row" data-brigade-id="${this.escapeHtml(b.id)}" data-equipment-class="${this.escapeHtml(b.default_equipment_class)}" data-capital-cost="${b.capital_cost}" data-equipment-cost="${equipCost}" data-manpower-cost="${b.manpower_cost}" data-home-mun="${this.escapeHtml(b.home_mun)}" data-brigade-name="${this.escapeHtml(b.name)}">
          <td>${this.escapeHtml(b.name)}</td><td>${this.escapeHtml(b.home_mun)}</td><td>${b.capital_cost} C, ${equipCost} E, ${b.manpower_cost} M</td><td>${manpowerAvail.toLocaleString()}</td>
          <td><button type="button" class="tm-recruitment-select-btn">Select</button></td></tr>`;
        }
        html += '</tbody></table>';
      }
      html += '</div>';
      content.innerHTML = html;

      if (confirmBtn) confirmBtn.disabled = true;
      this.selectedRecruitmentBrigadeId = null;
      this.selectedRecruitmentEquipmentClass = null;

      content.querySelectorAll('.tm-recruitment-select-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const row = (btn as HTMLElement).closest('tr');
          if (!row) return;
          const id = row.getAttribute('data-brigade-id');
          const eqClass = row.getAttribute('data-equipment-class');
          if (!id || !eqClass) return;
          content.querySelectorAll('.tm-recruitment-row').forEach((r) => r.classList.remove('tm-recruitment-selected'));
          row.classList.add('tm-recruitment-selected');
          this.selectedRecruitmentBrigadeId = id;
          this.selectedRecruitmentEquipmentClass = eqClass;
          if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = `Activate ${row.getAttribute('data-brigade-name') ?? id}`;
          }
        });
      });

      if (confirmBtn) {
        const onConfirm = async () => {
          if (!this.selectedRecruitmentBrigadeId || !this.selectedRecruitmentEquipmentClass) return;
          const brigadeId = this.selectedRecruitmentBrigadeId;
          const equipmentClass = this.selectedRecruitmentEquipmentClass;
          if (awwv?.applyRecruitment) {
            try {
              const result = await awwv.applyRecruitment(brigadeId, equipmentClass);
              if (result?.ok && result.stateJson != null) {
                this.showOverlay('recruitment-modal', false);
                this.applyGameStateFromJson(result.stateJson);
                if (result.newFormationId) {
                  this.state.setSelectedFormation(result.newFormationId);
                  window.setTimeout(() => this.state.setSelectedFormation(null), 4000);
                }
                this.showStatusError('');
              } else {
                this.showStatusError(result?.error ?? 'Recruitment failed');
              }
            } catch (err) {
              this.showStatusError(err instanceof Error ? err.message : String(err));
            }
          } else {
            this.showOverlay('recruitment-modal', false);
            this.showStatusError('Recruitment apply only in desktop app.');
          }
        };
        const newBtn = confirmBtn.cloneNode(true) as HTMLButtonElement;
        confirmBtn.replaceWith(newBtn);
        newBtn.addEventListener('click', onConfirm);
      }
    } catch (err) {
      setMsg(`<p class="tm-muted">Failed to load catalog: ${this.escapeHtml(err instanceof Error ? err.message : String(err))}</p>`);
    }
  }

  private showOverlay(id: string, open: boolean): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('open', open);
    el.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  private updateReplayScrubber(): void {
    const scrubber = document.getElementById('replay-scrubber');
    const slider = document.getElementById('replay-week-slider') as HTMLInputElement | null;
    const label = document.getElementById('replay-week-label');
    if (!scrubber || !slider || !label) return;
    const hasReplay = this.replayFrames.length > 0;
    scrubber.classList.toggle('closed', !hasReplay);
    if (!hasReplay) return;
    slider.min = '1';
    slider.max = String(this.replayFrames.length);
    slider.value = String(Math.min(this.replayFrames.length, Math.max(1, this.replayCurrentWeek + 1)));
    label.textContent = `Week ${slider.value}/${this.replayFrames.length}`;
  }

  private maybeShowAarFromStateDelta(previous: LoadedGameState, next: LoadedGameState): void {
    const gained = next.recentControlEvents.filter((e) => e.turn === next.turn);
    if (gained.length === 0) return;
    const rows = gained.slice(0, 20).map((e) => (
      `<div class="tm-panel-field"><span class="tm-panel-field-label">T${e.turn} ${this.escapeHtml(e.mechanism)}</span><span class="tm-panel-field-value">${this.escapeHtml(e.settlementId)}: ${this.escapeHtml(e.from ?? 'null')} → ${this.escapeHtml(e.to ?? 'null')}</span></div>`
    ));
    const prevPersonnel = previous.formations.reduce((sum, f) => sum + (f.personnel ?? 0), 0);
    const nextPersonnel = next.formations.reduce((sum, f) => sum + (f.personnel ?? 0), 0);
    const delta = nextPersonnel - prevPersonnel;
    const content = document.getElementById('aar-content');
    if (!content) return;
    content.innerHTML = `<div class="tm-panel-section"><div class="tm-panel-section-header">TURN ${next.turn} SUMMARY</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Control changes</span><span class="tm-panel-field-value">${gained.length}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Personnel delta</span><span class="tm-panel-field-value">${delta >= 0 ? '+' : ''}${delta.toLocaleString()}</span></div>
    </div>
    <div class="tm-panel-section"><div class="tm-panel-section-header">EVENTS</div>${rows.join('')}</div>`;
    this.showOverlay('aar-modal', true);
  }

  private openWarSummaryModal(): void {
    const gs = this.lastLoadedGameState;
    const content = document.getElementById('aar-content');
    if (!content) return;
    if (!gs) {
      content.innerHTML = `<div class="tm-panel-section"><div class="tm-panel-section-header">WAR SUMMARY</div><div class="tm-panel-placeholder">Load a game state first.</div></div>`;
      this.showOverlay('aar-modal', true);
      return;
    }
    const byFaction = new Map<string, { pers: number; count: number }>();
    for (const f of gs.formations) {
      const rec = byFaction.get(f.faction) ?? { pers: 0, count: 0 };
      rec.pers += f.personnel ?? 0;
      rec.count += 1;
      byFaction.set(f.faction, rec);
    }
    let html = `<div class="tm-panel-section"><div class="tm-panel-section-header">WAR SUMMARY (TURN ${gs.turn})</div>`;
    for (const faction of FACTION_DISPLAY_ORDER) {
      const rec = byFaction.get(faction) ?? { pers: 0, count: 0 };
      html += `<div class="tm-panel-field"><span class="tm-panel-field-label">${this.escapeHtml(SIDE_LABELS[faction] ?? faction)}</span><span class="tm-panel-field-value">${rec.count} brigades | ${rec.pers.toLocaleString()} pers</span></div>`;
    }
    html += `</div><div class="tm-panel-section"><div class="tm-panel-section-header">CONTROL EVENTS</div>`;
    if (gs.recentControlEvents.length === 0 && gs.turn > 0) {
      html += `<div class="tm-panel-placeholder">Control events are recorded during turn execution. Load a replay to see the full history.</div>`;
    } else {
      html += `<div class="tm-panel-field"><span class="tm-panel-field-label">Total recorded</span><span class="tm-panel-field-value">${gs.recentControlEvents.length}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">This turn</span><span class="tm-panel-field-value">${gs.recentControlEvents.filter((e) => e.turn === gs.turn).length}</span></div>`;
    }
    html += `</div>`;
    content.innerHTML = html;
    this.showOverlay('aar-modal', true);
  }

  // ─── Utilities ──────────────────────────────────

  private showStatusError(message: string): void {
    const el = document.getElementById('status');
    if (el) {
      el.textContent = message;
      el.classList.remove('hidden');
      el.classList.add('error');
    }
  }

  /** Show error in status bar and in side-picker overlay (when open). */
  private showSidePickerError(message: string): void {
    this.showStatusError(message);
    const errEl = document.getElementById('side-picker-error');
    if (errEl) {
      errEl.textContent = message;
      errEl.classList.remove('hidden');
    }
  }

  private clearStatusBar(): void {
    const el = document.getElementById('status');
    if (el) {
      el.textContent = '';
      el.classList.add('hidden');
      el.classList.remove('error');
    }
  }

  private escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}
