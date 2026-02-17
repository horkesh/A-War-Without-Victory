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
  LoadedGameState,
  StaffMapRegion,
} from './types.js';
import { StaffMapRenderer } from './staff/StaffMapRenderer.js';
import { MapState } from './state/MapState.js';
import { MapProjection } from './geo/MapProjection.js';
import { SpatialIndex } from './geo/SpatialIndex.js';
import { computeFeatureBBox } from './geo/MapProjection.js';
import { loadAllData } from './data/DataLoader.js';
import { ZOOM_LABELS, ZOOM_FACTORS, NATO_TOKENS, SIDE_COLORS, SIDE_SOLID_COLORS, SIDE_LABELS, SIDE_RGB, FACTION_DISPLAY_ORDER, ETHNICITY_COLORS, ETHNICITY_LABELS, BASE_LAYER_COLORS, BASE_LAYER_WIDTHS, FRONT_LINE, MINIMAP, FORMATION_KIND_SHAPES, FORMATION_MARKER_SIZE, ZOOM_FORMATION_FILTER, AOR_HIGHLIGHT, panelReadinessColor, detHash, formatTurnDate } from './constants.js';
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

  /** Staff map overlay renderer (4th zoom layer). */
  private staffMapRenderer: StaffMapRenderer | null = null;
  private staffMapCanvas: HTMLCanvasElement | null = null;

  /** Region selection mode for staff map: user draws a rectangle. */
  private staffMapSelectionMode = false;
  private staffMapSelecting = false;
  private staffMapSelectStart: { x: number; y: number } | null = null;
  private staffMapSelectEnd: { x: number; y: number } | null = null;

  /** Pending order mode: when set, next map click resolves the order. */
  private pendingOrderMode: {
    type: 'move' | 'attack';
    formation: FormationView;
    candidateTargetSid?: string;
  } | null = null;

  /** Reverse lookup: settlement SID → defending formation. Rebuilt when game state loads. */
  private defenderBySid: Map<string, FormationView> = new Map();

  /** Municipality mun1990_id → settlement SID list. Lazily built for move-targeting overlay. */
  private munToSidsCache: Map<string, string[]> | null = null;

  /** Animation frame handle for targeting-mode pulsing highlight. */
  private targetingAnimFrame: number | null = null;

  // Baseline control data for dataset switching
  private baselineControlLookup: Record<string, string | null> = {};
  private baselineStatusLookup: Record<string, string> = {};

  // Active control data (may come from loaded state or alternate dataset)
  private activeControlLookup: Record<string, string | null> = {};
  private activeStatusLookup: Record<string, string> = {};

  /** Army crest images for map markers and OOB. Keyed by faction id (RBiH, RS, HRHB). */
  private crestImages: Map<string, HTMLImageElement> = new Map();

  /** Get the desktop IPC bridge (awwv) if available (Electron only). */
  private getDesktopBridge(): {
    stageAttackOrder?: (brigadeId: string, targetSettlementId: string) => Promise<{ ok: boolean; error?: string }>;
    stagePostureOrder?: (brigadeId: string, posture: string) => Promise<{ ok: boolean; error?: string }>;
    stageMoveOrder?: (brigadeId: string, targetMunicipalityId: string) => Promise<{ ok: boolean; error?: string }>;
    clearOrders?: (brigadeId: string) => Promise<{ ok: boolean; error?: string }>;
    stageCorpsStanceOrder?: (corpsId: string, stance: string) => Promise<{ ok: boolean; error?: string }>;
  } | null {
    return (window as unknown as {
      awwv?: {
        stageAttackOrder?: (brigadeId: string, targetSettlementId: string) => Promise<{ ok: boolean; error?: string }>;
        stagePostureOrder?: (brigadeId: string, posture: string) => Promise<{ ok: boolean; error?: string }>;
        stageMoveOrder?: (brigadeId: string, targetMunicipalityId: string) => Promise<{ ok: boolean; error?: string }>;
        clearOrders?: (brigadeId: string) => Promise<{ ok: boolean; error?: string }>;
        stageCorpsStanceOrder?: (corpsId: string, stance: string) => Promise<{ ok: boolean; error?: string }>;
      };
    }).awwv ?? null;
  }

  constructor(_rootId: string) {
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

    // Initialize staff map overlay canvas
    this.staffMapCanvas = document.getElementById('staff-map-canvas') as HTMLCanvasElement | null;
    if (this.staffMapCanvas) {
      this.staffMapRenderer = new StaffMapRenderer(this.staffMapCanvas, this.state, this.data);
      this.staffMapRenderer.setControlLookup(this.activeControlLookup);
    }

    // Wire UI
    this.wireInteraction();
    this.wireUI();

    this.updateLegendContent();

    // Initial render
    statusEl.textContent = '';
    statusEl.classList.add('hidden');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    // Observe wrapper resizes (sidebar/panel open/close change flex layout)
    const wrap = this.canvas.parentElement;
    if (wrap) {
      new ResizeObserver(() => this.resize()).observe(wrap);
    }
    this.canvas.focus();
  }

  private static readonly CREST_ASSETS_BASE = '/assets/sources/crests/';
  private static readonly CAMPAIGN_SCENARIO_STORAGE_KEY = 'awwv.desktop.newCampaign.scenarioKey';

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
    // Also resize staff map canvas if active
    if (this.staffMapRenderer && this.state.snapshot.staffMapRegion) {
      this.staffMapRenderer.resize();
    }
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
    // Staff map active — delegate to overlay renderer
    if (this.state.snapshot.staffMapRegion && this.staffMapRenderer) {
      this.staffMapRenderer.render();
      return;
    }

    // Region selection mode — draw the rubber-band rectangle overlay
    if (this.staffMapSelectionMode && this.staffMapSelectStart && this.staffMapSelectEnd) {
      // Render normal map first, then draw selection overlay on top
      this.renderMainMap();
      this.drawSelectionOverlay();
      return;
    }

    this.renderMainMap();
  }

  private drawSelectionOverlay(): void {
    const { ctx } = this;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dim the map
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, w, h);

    // Draw rubber-band rectangle
    if (this.staffMapSelectStart && this.staffMapSelectEnd) {
      const x0 = Math.min(this.staffMapSelectStart.x, this.staffMapSelectEnd.x);
      const y0 = Math.min(this.staffMapSelectStart.y, this.staffMapSelectEnd.y);
      const rw = Math.abs(this.staffMapSelectEnd.x - this.staffMapSelectStart.x);
      const rh = Math.abs(this.staffMapSelectEnd.y - this.staffMapSelectStart.y);

      // Clear the rectangle area (show map beneath)
      ctx.clearRect(x0, y0, rw, rh);
      // Re-draw the map in the cleared area — skip for simplicity, just show bright border
      ctx.strokeStyle = '#c8a050';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(x0, y0, rw, rh);
      ctx.setLineDash([]);
    }

    // Instruction text
    ctx.fillStyle = 'rgba(200, 160, 80, 0.9)';
    ctx.font = 'bold 14px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Click and drag to define staff map area', w / 2, 20);
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillText('Press Escape to cancel', w / 2, 40);

    ctx.restore();
  }

  private renderMainMap(): void {
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
      this.drawCorpsSubordinateLines(rc);
      this.drawOrderArrows(rc);
    }

    // 5b. Brigade AoR highlight (automatic when a formation is selected)
    if (this.state.snapshot.loadedGameState && this.state.snapshot.selectedFormationId) {
      this.drawBrigadeAoRHighlight(rc);
    } else {
      this.aorBoundaryCache = null;
    }

    // 5c. Targeting overlay (dim friendly, highlight target)
    if (this.pendingOrderMode) {
      this.drawTargetingOverlay(rc);
    }

    // 6. Selection highlight
    this.drawSelection(rc);

    // 7. Labels (always on — only URBAN_CENTER + TOWN shown)
    this.drawLabels(rc);

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

      // Settlement borders removed per user request

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
    const gs = this.state.snapshot.loadedGameState;

    // Build per-faction defended lookup: SID → faction that defends it
    const defendedByFaction = new Map<string, string>();
    if (gs) {
      for (const fv of gs.formations) {
        const aor = gs.brigadeAorByFormationId[fv.id];
        if (!aor) continue;
        for (const sid of aor) defendedByFaction.set(sid, fv.faction);
      }
    }

    // Classify front segments: which sides are defended?
    const borders = this.data.sharedBorders;
    const centroids = this.data.settlementCentroids;
    const arcs: {
      seg: (typeof borders)[number];
      factionA: string;
      factionB: string;
      aDefended: boolean;
      bDefended: boolean;
    }[] = [];

    for (const seg of borders) {
      const ca = controllers[seg.a] ?? controllers[controlKey(seg.a)] ?? null;
      const cb = controllers[seg.b] ?? controllers[controlKey(seg.b)] ?? null;
      if (!this.shouldDrawFrontSegment(ca, cb)) continue;

      const aDefended = defendedByFaction.get(seg.a) === ca;
      const bDefended = defendedByFaction.get(seg.b) === cb;

      // No unit → no front
      if (!aDefended && !bDefended) continue;

      arcs.push({ seg, factionA: ca!, factionB: cb!, aDefended, bDefended });
    }
    if (arcs.length === 0) return;

    // Helper: perpendicular direction pointing toward a settlement centroid
    const getOffsetDir = (
      x0: number, y0: number, x1: number, y1: number, sid: string,
    ): { perpX: number; perpY: number } | null => {
      const centroid = centroids.get(sid);
      if (!centroid) return null;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < FRONT_LINE.minSubSegLen) return null;

      let perpX = -dy / len;
      let perpY = dx / len;

      // Dot product with vector from midpoint to centroid → pick correct side
      const [cx, cy] = rc.project(centroid[0], centroid[1]);
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2;
      if (perpX * (cx - mx) + perpY * (cy - my) < 0) {
        perpX = -perpX;
        perpY = -perpY;
      }
      return { perpX, perpY };
    };

    // Draw one faction's defensive arc along one side of a border segment
    const drawDefensiveArc = (
      seg: (typeof borders)[number],
      sid: string,
      faction: string,
    ): void => {
      const rgb = SIDE_RGB[faction] ?? SIDE_RGB['null'];
      const pts = seg.points;
      if (pts.length < 2) return;
      const segHash = seg.a.charCodeAt(0) + seg.b.charCodeAt(0);

      // Single pass: collect arc path + barb positions
      type CurvePoint = { ox0: number; oy0: number; cpx: number; cpy: number; ox1: number; oy1: number };
      type BarbTick = { bx: number; by: number; rdx: number; rdy: number };
      const curvePts: CurvePoint[] = [];
      const barbs: BarbTick[] = [];

      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = rc.project(pts[i - 1][0], pts[i - 1][1]);
        const [x1, y1] = rc.project(pts[i][0], pts[i][1]);
        const dir = getOffsetDir(x0, y0, x1, y1, sid);
        if (!dir) continue;

        const ox0 = x0 + dir.perpX * FRONT_LINE.arcOffset;
        const oy0 = y0 + dir.perpY * FRONT_LINE.arcOffset;
        const ox1 = x1 + dir.perpX * FRONT_LINE.arcOffset;
        const oy1 = y1 + dir.perpY * FRONT_LINE.arcOffset;

        // Bézier control point
        const dx = ox1 - ox0;
        const dy = oy1 - oy0;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const curveOff = (detHash(i, segHash, 101) - 0.5) * 2 * FRONT_LINE.curveOffset;
        const cpx = (ox0 + ox1) / 2 + (-dy / len) * curveOff;
        const cpy = (oy0 + oy1) / 2 + (dx / len) * curveOff;
        curvePts.push({ ox0, oy0, cpx, cpy, ox1, oy1 });

        // Barb tick positions
        const segLen = Math.sqrt(dx * dx + dy * dy);
        if (segLen < FRONT_LINE.barbSpacing * 0.5) continue;
        const numBarbs = Math.floor(segLen / FRONT_LINE.barbSpacing);
        const barbDirX = -dir.perpX;
        const barbDirY = -dir.perpY;
        for (let b = 1; b <= numBarbs; b++) {
          const t = b / (numBarbs + 1);
          const bx = ox0 + dx * t;
          const by = oy0 + dy * t;
          const angle = (detHash(i, b, 202) - 0.5) * 0.6;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          barbs.push({
            bx, by,
            rdx: barbDirX * cos - barbDirY * sin,
            rdy: barbDirX * sin + barbDirY * cos,
          });
        }
      }
      if (curvePts.length === 0) return;

      // Helper: build path from collected curve points
      const buildPath = () => {
        ctx.beginPath();
        ctx.moveTo(curvePts[0].ox0, curvePts[0].oy0);
        for (const cp of curvePts) {
          ctx.quadraticCurveTo(cp.cpx, cp.cpy, cp.ox1, cp.oy1);
        }
      };

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Glow stroke (wide, low alpha)
      ctx.strokeStyle = `rgba(${rgb}, ${FRONT_LINE.glowAlpha})`;
      ctx.lineWidth = FRONT_LINE.glowWidth;
      buildPath();
      ctx.stroke();

      // Arc stroke (narrow, higher alpha)
      ctx.strokeStyle = `rgba(${rgb}, ${FRONT_LINE.arcAlpha})`;
      ctx.lineWidth = FRONT_LINE.arcWidth;
      buildPath();
      ctx.stroke();

      // Barb ticks
      ctx.strokeStyle = `rgba(${rgb}, ${FRONT_LINE.barbAlpha})`;
      ctx.lineWidth = FRONT_LINE.barbWidth;
      for (const bk of barbs) {
        ctx.beginPath();
        ctx.moveTo(bk.bx, bk.by);
        ctx.lineTo(bk.bx + bk.rdx * FRONT_LINE.barbLength,
                   bk.by + bk.rdy * FRONT_LINE.barbLength);
        ctx.stroke();
      }

      ctx.restore();
    };

    // Draw all defensive arcs
    for (const arc of arcs) {
      if (arc.aDefended) drawDefensiveArc(arc.seg, arc.seg.a, arc.factionA);
      if (arc.bDefended) drawDefensiveArc(arc.seg, arc.seg.b, arc.factionB);
    }
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
  /** Format personnel count compactly: <1000 as-is, ≥1000 as X.Xk */
  private static formatStrength(n: number): string {
    if (n < 1000) return String(n);
    return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }

  private drawNatoFormationMarker(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    w: number,
    h: number,
    f: FormationView,
    color: string,
    zoomLevel: number,
  ): void {
    const shape = FORMATION_KIND_SHAPES[f.kind] ?? 'square';
    const { faction, posture } = f;
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

    // Frame: faction-colored outer border
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(left, top, w, h);

    // Readiness inner glow — colored border inside the frame
    const readinessColor = panelReadinessColor(f.readiness);
    ctx.strokeStyle = readinessColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;
    ctx.strokeRect(left + 1.5, top + 1.5, w - 3, h - 3);
    ctx.globalAlpha = 1.0;

    // Left: dark background with crest
    const crestLeft = left + 2;
    const crestTop = top + 2;
    const crestBoxW = crestW - 3;
    const crestBoxH = h - 4;
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
    ctx.fillRect(left + crestW + 1, top + 2, symbolW - 3, h - 4);
    ctx.globalAlpha = 1.0;

    // NATO symbol centered in right portion — bright white, shifted up to make room for strength
    const symbolCenterX = left + crestW + symbolW / 2;
    const symbolCenterY = sy - h * 0.08; // nudge up slightly
    const iw = symbolW * 0.4;
    const ih = h * 0.35;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';

    if (shape === 'xxx') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2;
      const xSpacing = iw * 0.35;
      for (let xi = -1; xi <= 1; xi++) {
        const cx = symbolCenterX + xi * xSpacing;
        ctx.beginPath();
        ctx.moveTo(cx - iw * 0.22, symbolCenterY - ih * 0.55);
        ctx.lineTo(cx + iw * 0.22, symbolCenterY + ih * 0.55);
        ctx.moveTo(cx + iw * 0.22, symbolCenterY - ih * 0.55);
        ctx.lineTo(cx - iw * 0.22, symbolCenterY + ih * 0.55);
        ctx.stroke();
      }
    } else if (shape === 'xx') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2;
      const xSpacingXX = iw * 0.4;
      for (let xi = 0; xi <= 1; xi++) {
        const cx = symbolCenterX + xi * xSpacingXX;
        ctx.beginPath();
        ctx.moveTo(cx - iw * 0.35, symbolCenterY - ih * 0.6);
        ctx.lineTo(cx + iw * 0.35, symbolCenterY + ih * 0.6);
        ctx.moveTo(cx + iw * 0.35, symbolCenterY - ih * 0.6);
        ctx.lineTo(cx - iw * 0.35, symbolCenterY + ih * 0.6);
        ctx.stroke();
      }
    } else if (shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(symbolCenterX, symbolCenterY - ih);
      ctx.lineTo(symbolCenterX + iw / 2, symbolCenterY);
      ctx.lineTo(symbolCenterX, symbolCenterY + ih);
      ctx.lineTo(symbolCenterX - iw / 2, symbolCenterY);
      ctx.closePath();
      ctx.fill();
    } else if (shape === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(symbolCenterX, symbolCenterY - ih);
      ctx.lineTo(symbolCenterX + iw / 2, symbolCenterY + ih);
      ctx.lineTo(symbolCenterX - iw / 2, symbolCenterY + ih);
      ctx.closePath();
      ctx.fill();
    } else {
      const bw = Math.max(2, iw * 0.35);
      const bh = ih;
      ctx.fillRect(symbolCenterX - bw / 2, symbolCenterY - bh / 2, bw, bh);
    }

    // Strength number below NATO symbol (skip at strategic zoom — too small)
    if (zoomLevel >= 1) {
      const fontSize = zoomLevel >= 2 ? 9 : 8;
      ctx.font = `bold ${fontSize}px "IBM Plex Mono", Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      // For corps/army, show subordinate count; for brigades show personnel
      const isHigherHQ = f.kind === 'corps' || f.kind === 'corps_asset' || f.kind === 'army_hq';
      if (isHigherHQ && f.subordinateIds) {
        ctx.fillText(`×${f.subordinateIds.length}`, symbolCenterX, top + h - 3);
      } else if (f.personnel != null) {
        ctx.fillText(MapApp.formatStrength(f.personnel), symbolCenterX, top + h - 3);
      }
    }

    // Posture badge (top-right corner)
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

  /** Gap in pixels between co-located formation markers. */
  private static readonly MARKER_STACK_GAP = 3;

  /**
   * Build position groups for visible formations: formations sharing an HQ settlement
   * are grouped so they can be offset horizontally when drawn.
   */
  private buildFormationPositionGroups(
    rc: RenderContext
  ): Map<string, Array<{ f: FormationView; sx: number; sy: number }>> {
    const gs = this.state.snapshot.loadedGameState;
    if (!gs) return new Map();

    const playerFaction = gs.player_faction ?? null;
    const zoomFilter = ZOOM_FORMATION_FILTER[rc.zoomLevel] ?? null;
    const formations = [...gs.formations].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const groups = new Map<string, Array<{ f: FormationView; sx: number; sy: number }>>();

    for (const f of formations) {
      if (playerFaction && f.faction !== playerFaction) continue;
      if (zoomFilter && !zoomFilter.has(f.kind)) continue;
      const pos = this.getFormationPosition(f);
      if (!pos) continue;
      if (!this.projection.isInViewport(
        { minX: pos[0] - 1, minY: pos[1] - 1, maxX: pos[0] + 1, maxY: pos[1] + 1 },
        rc.viewTransform,
      )) continue;

      const [sx, sy] = rc.project(pos[0], pos[1]);
      // Quantize to 2px grid to group co-located formations
      const key = `${Math.round(sx / 2) * 2},${Math.round(sy / 2) * 2}`;
      const group = groups.get(key) ?? [];
      group.push({ f, sx, sy });
      groups.set(key, group);
    }

    return groups;
  }

  private drawFormations(rc: RenderContext): void {
    const gs = this.state.snapshot.loadedGameState;
    if (!gs) return;

    const { ctx } = rc;
    const dim = FORMATION_MARKER_SIZE[rc.zoomLevel];
    const gap = MapApp.MARKER_STACK_GAP;
    const groups = this.buildFormationPositionGroups(rc);
    const selectedId = this.state.snapshot.selectedFormationId;
    const isTactical = rc.zoomLevel >= 2;

    // When a formation is selected, draw non-selected formations at reduced opacity
    // so the selected one stands out and stacked markers become easier to read.
    for (const group of groups.values()) {
      const count = group.length;
      for (let i = 0; i < count; i++) {
        const { f, sx, sy } = group[i];
        const offsetY = count > 1 ? (i - (count - 1) / 2) * (dim.h + gap) : 0;
        const color = SIDE_SOLID_COLORS[f.faction] ?? SIDE_SOLID_COLORS['null'];
        const markerY = sy + offsetY;

        const dimmed = selectedId && f.id !== selectedId;
        if (dimmed) ctx.globalAlpha = 0.25;
        this.drawNatoFormationMarker(ctx, sx, markerY, dim.w, dim.h, f, color, rc.zoomLevel);

        // Name label below marker at tactical zoom
        if (isTactical) {
          const displayName = f.name.length > 18 ? f.name.slice(0, 17) + '\u2026' : f.name;
          ctx.font = 'bold 8px "IBM Plex Mono", Consolas, monospace';
          const tw = ctx.measureText(displayName).width;
          const labelX = sx - tw / 2 - 3;
          const labelY = markerY + dim.h / 2 + 3;
          // Dark pill background for readability
          ctx.fillStyle = 'rgba(10, 10, 26, 0.7)';
          ctx.fillRect(labelX, labelY, tw + 6, 12);
          // Label text
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(displayName, sx, labelY + 1);
        }

        if (dimmed) ctx.globalAlpha = 1.0;
      }
    }
  }

  /** When a corps or army HQ is selected, draw dashed command lines to each subordinate HQ. */
  private drawCorpsSubordinateLines(rc: RenderContext): void {
    const gs = this.state.snapshot.loadedGameState;
    const selectedId = this.state.snapshot.selectedFormationId;
    if (!gs || !selectedId) return;

    const byId = new Map(gs.formations.map(f => [f.id, f] as const));
    const corps = byId.get(selectedId);
    if (!corps || (corps.kind !== 'corps' && corps.kind !== 'corps_asset' && corps.kind !== 'army_hq')) return;

    const subIds = corps.subordinateIds ?? [];
    if (subIds.length === 0) return;

    const corpsPos = this.getFormationPosition(corps);
    if (!corpsPos) return;
    const [cx, cy] = rc.project(corpsPos[0], corpsPos[1]);

    const { ctx } = rc;
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.60;
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;

    for (const subId of subIds) {
      const sub = byId.get(subId);
      if (!sub) continue;
      const subPos = this.getFormationPosition(sub);
      if (!subPos) continue;
      const [sx, sy] = rc.project(subPos[0], subPos[1]);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }

    ctx.restore();
  }

  private getSettlementCentroidFromSid(sid: string): [number, number] | null {
    const f = this.getSettlementFeatureBySid(sid);
    if (!f) return null;
    return this.data.settlementCentroids.get(f.properties.sid) ?? null;
  }

  private drawOrderArrows(rc: RenderContext): void {
    const gs = this.state.snapshot.loadedGameState;
    if (!gs) return;
    const playerFaction = gs.player_faction ?? null;
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
      if (playerFaction && formation.faction !== playerFaction) continue;
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
      if (playerFaction && formation.faction !== playerFaction) continue;
      const from = this.getFormationPosition(formation);
      const to = this.data.municipalityCentroids.get(order.targetMunicipalityId);
      if (!from || !to) continue;
      const [sx, sy] = rc.project(from[0], from[1]);
      const [tx, ty] = rc.project(to[0], to[1]);
      ctx.strokeStyle = SIDE_SOLID_COLORS[formation.faction] ?? '#999';
      ctx.fillStyle = SIDE_SOLID_COLORS[formation.faction] ?? '#999';
      this.drawArrow(ctx, sx, sy, tx, ty, true);
    }

    // Preview arrow for attack confirmation (dashed, dimmer)
    if (this.pendingOrderMode?.type === 'attack' && this.pendingOrderMode.candidateTargetSid) {
      const formation = byId.get(this.pendingOrderMode.formation.id);
      if (formation) {
        const from = this.getFormationPosition(formation);
        const to = this.getSettlementCentroidFromSid(this.pendingOrderMode.candidateTargetSid);
        if (from && to) {
          const [sx2, sy2] = rc.project(from[0], from[1]);
          const [tx2, ty2] = rc.project(to[0], to[1]);
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = 'rgba(255, 68, 68, 0.7)';
          ctx.fillStyle = 'rgba(255, 68, 68, 0.7)';
          ctx.lineWidth = 2;
          ctx.shadowColor = 'rgba(255, 68, 68, 0.3)';
          ctx.shadowBlur = 4;
          this.drawArrow(ctx, sx2, sy2, tx2, ty2, false);
        }
      }
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
    const dim = FORMATION_MARKER_SIZE[rc.zoomLevel];
    const gap = MapApp.MARKER_STACK_GAP;
    const groups = this.buildFormationPositionGroups(rc);

    // AABB half-dimensions with a small hit-expansion for easier clicking
    const hw = dim.w / 2 + 4;
    const hh = dim.h / 2 + 4;

    // Track the topmost (last-drawn) match — painter's algorithm means last drawn is on top
    let best: import('./types.js').FormationView | null = null;
    for (const group of groups.values()) {
      const count = group.length;
      for (let i = 0; i < count; i++) {
        const { f, sx, sy } = group[i];
        const offsetY = count > 1 ? (i - (count - 1) / 2) * (dim.h + gap) : 0;
        const markerY = sy + offsetY;
        if (canvasX >= sx - hw && canvasX <= sx + hw
          && canvasY >= markerY - hh && canvasY <= markerY + hh) {
          best = f;
        }
      }
    }
    return best;
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

  private drawBrigadeAoRHighlight(rc: RenderContext): void {
    const gs = this.state.snapshot.loadedGameState;
    const formationId = this.state.snapshot.selectedFormationId;
    if (!gs || !formationId) return;
    const formation = gs.formations.find((f) => f.id === formationId);
    if (!formation) return;

    // Collect AoR settlement IDs based on hierarchy level:
    //   army_hq → corps → brigades; corps → brigades; brigade → direct lookup
    let aorSids: string[];
    if (formation.kind === 'army_hq' || formation.kind === 'corps' || formation.kind === 'corps_asset') {
      const brigadeIds: string[] = [];
      if (formation.kind === 'army_hq') {
        for (const corpsId of formation.subordinateIds ?? []) {
          const corpsF = gs.formations.find(f => f.id === corpsId);
          if (corpsF) brigadeIds.push(...(corpsF.subordinateIds ?? []));
        }
      } else {
        brigadeIds.push(...(formation.subordinateIds ?? []));
      }
      const merged = new Set<string>();
      for (const bId of brigadeIds) {
        const subAor = gs.brigadeAorByFormationId[bId];
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

    ctx.save();

    // 1. Per-settlement: faction fill + strong pencil crosshatch
    const cos45 = Math.cos(Math.PI / 4);
    const sin45 = Math.sin(Math.PI / 4);
    const fillStyle = this.hexToRgba(factionColor, AOR_HIGHLIGHT.fillAlpha);
    // Black hatch on colored control surfaces; white hatch on dark background
    const hatchStyle = rc.layers.politicalControl
      ? `rgba(0, 0, 0, ${AOR_HIGHLIGHT.hatchAlpha})`
      : `rgba(255, 255, 255, ${AOR_HIGHLIGHT.hatchAlpha})`;

    for (const sid of aorSids) {
      const feature = this.getSettlementFeatureBySid(sid);
      if (!feature) continue;

      // Clip to settlement polygon
      ctx.save();
      ctx.beginPath();
      this.addPolygonSubpath(ctx, feature, rc.project);
      ctx.clip();

      // Fill with faction color
      ctx.fillStyle = fillStyle;
      ctx.fill();

      // Draw 45° crosshatch lines
      const rings = this.getOuterRings(feature);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const ring of rings) {
        for (const pt of ring) {
          const [sx, sy] = rc.project(pt[0], pt[1]);
          if (sx < minX) minX = sx;
          if (sy < minY) minY = sy;
          if (sx > maxX) maxX = sx;
          if (sy > maxY) maxY = sy;
        }
      }

      const diag = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const numLines = Math.ceil(diag / AOR_HIGHLIGHT.hatchSpacing);

      ctx.strokeStyle = hatchStyle;
      ctx.lineWidth = AOR_HIGHLIGHT.hatchWidth;
      ctx.beginPath();
      for (let i = -numLines; i <= numLines; i++) {
        const offset = i * AOR_HIGHLIGHT.hatchSpacing;
        const perpX = -sin45 * offset;
        const perpY = cos45 * offset;
        ctx.moveTo(centerX + perpX - cos45 * diag, centerY + perpY - sin45 * diag);
        ctx.lineTo(centerX + perpX + cos45 * diag, centerY + perpY + sin45 * diag);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 2. Outer boundary stroke (cached, no glow)
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
    ctx.stroke();

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

  /** Draw targeting-mode visual overlay: dim friendly settlements (attack) or highlight municipality (move). */
  private drawTargetingOverlay(rc: RenderContext): void {
    if (!this.pendingOrderMode) return;
    const mode = this.pendingOrderMode;
    const { ctx } = rc;

    if (mode.type === 'attack') {
      // Dim settlements controlled by the ordering brigade's own faction
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      const sidOrder = Array.from(this.data.settlements.keys()).sort();
      for (const sid of sidOrder) {
        const controller = this.activeControlLookup[controlKey(sid)] ?? 'null';
        if (controller === mode.formation.faction) {
          const feature = this.data.settlements.get(sid)!;
          this.drawPolygonPath(ctx, feature, rc.project);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    if (mode.type === 'move' && this.hoveredFeature) {
      // Highlight all settlements in the hovered municipality
      const resolved = this.resolveMunicipalityFromFeature(this.hoveredFeature);
      if (resolved.mun1990Id) {
        const munSids = this.getMunToSids().get(resolved.mun1990Id);
        if (munSids) {
          ctx.save();
          const color = SIDE_SOLID_COLORS[mode.formation.faction] ?? '#999';
          ctx.fillStyle = this.hexToRgba(color, 0.12);
          for (const sid of munSids) {
            const feature = this.data.settlements.get(sid);
            if (feature) {
              this.drawPolygonPath(ctx, feature, rc.project);
              ctx.fill();
            }
          }
          ctx.restore();
        }
      }
    }

    // Pulsing border on hovered target
    if (this.hoveredFeature) {
      ctx.save();
      const t = (performance.now() % 1500) / 1500;
      const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);

      if (mode.type === 'attack') {
        ctx.strokeStyle = `rgba(255, 68, 68, ${(0.5 + pulse * 0.5).toFixed(2)})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(255, 68, 68, 0.6)';
        ctx.shadowBlur = 4 + pulse * 4;
      } else {
        const color = SIDE_SOLID_COLORS[mode.formation.faction] ?? '#999';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 3 + pulse * 3;
      }

      this.drawPolygonPath(ctx, this.hoveredFeature, rc.project);
      ctx.stroke();
      ctx.restore();

      // For attack with candidate: also highlight the candidate settlement if different from hover
      if (mode.type === 'attack' && mode.candidateTargetSid) {
        const candidateFeature = this.data.settlements.get(mode.candidateTargetSid);
        if (candidateFeature && candidateFeature !== this.hoveredFeature) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          this.drawPolygonPath(ctx, candidateFeature, rc.project);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
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
      // LOD filter — only URBAN_CENTER and TOWN; strategic zoom: URBAN_CENTER only
      const nc = entry.natoClass;
      if (nc !== 'URBAN_CENTER' && nc !== 'TOWN') continue;
      if (zoomLevel === 0 && nc !== 'URBAN_CENTER') continue;

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
      } else {
        ctx.font = '9px "IBM Plex Mono", Consolas, monospace';
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
      } else {
        ctx.fillStyle = 'rgba(200, 200, 210, 0.8)';
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
      // No zooming while staff map is active or selection mode
      if (this.state.snapshot.staffMapRegion || this.staffMapSelectionMode) return;

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

    // Pan: mousedown (or staff map region selection)
    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      // Staff map active — no panning on main canvas
      if (this.state.snapshot.staffMapRegion) return;

      // Staff map selection mode — start rubber-band
      if (this.staffMapSelectionMode) {
        const rect = canvas.getBoundingClientRect();
        const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
        this.staffMapSelecting = true;
        this.staffMapSelectStart = { x: cx, y: cy };
        this.staffMapSelectEnd = { x: cx, y: cy };
        return;
      }

      if (this.state.snapshot.zoomFactor <= 1) return;
      this.isPanning = true;
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.panStartCenterX = this.state.snapshot.panCenter.x;
      this.panStartCenterY = this.state.snapshot.panCenter.y;
      this.panDragDistance = 0;
      canvas.style.cursor = 'grabbing';
    });

    // Mousemove: pan or hover (or staff map selection or staff map hover)
    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      // Staff map region selection: update rubber-band (aspect-ratio locked to canvas)
      if (this.staffMapSelecting && this.staffMapSelectStart) {
        const rect = canvas.getBoundingClientRect();
        const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const cy = (e.clientY - rect.top) * (canvas.height / rect.height);

        // Lock to canvas aspect ratio: width drives, height follows
        const aspect = canvas.width / canvas.height;
        const dx = cx - this.staffMapSelectStart.x;
        const dy = cy - this.staffMapSelectStart.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        // Use whichever axis the user dragged more along
        let rw: number, rh: number;
        if (absDx / aspect >= absDy) {
          rw = absDx;
          rh = absDx / aspect;
        } else {
          rh = absDy;
          rw = absDy * aspect;
        }
        this.staffMapSelectEnd = {
          x: this.staffMapSelectStart.x + Math.sign(dx || 1) * rw,
          y: this.staffMapSelectStart.y + Math.sign(dy || 1) * rh,
        };
        this.scheduleRender();
        return;
      }

      // Staff map active — delegate hover to staff map renderer
      if (this.state.snapshot.staffMapRegion && this.staffMapRenderer) {
        const rect = canvas.getBoundingClientRect();
        // Use the staff map canvas for coordinate mapping
        const sCanvas = this.staffMapCanvas!;
        const scx = (e.clientX - rect.left) * (sCanvas.width / rect.width);
        const scy = (e.clientY - rect.top) * (sCanvas.height / rect.height);

        // Exit button hover
        if (this.staffMapRenderer.isExitButtonHit(scx, scy)) {
          this.hideTooltip();
          canvas.style.cursor = 'pointer';
          this.scheduleRender();
          return;
        }

        const formation = this.staffMapRenderer.getFormationAtPoint(scx, scy);

        if (formation) {
          this.showTooltip(`${formation.name} (${formation.kind}) — ${formation.faction}`, e.clientX, e.clientY);
          canvas.style.cursor = 'pointer';
        } else {
          this.hideTooltip();
          canvas.style.cursor = 'default';
        }
        this.scheduleRender();
        return;
      }

      // Selection mode — just show crosshair
      if (this.staffMapSelectionMode) {
        canvas.style.cursor = 'crosshair';
        return;
      }

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

      // Targeting mode: override cursor + tooltip with tactical context
      if (this.pendingOrderMode) {
        if (this.hoveredFeature) {
          canvas.style.cursor = this.pendingOrderMode.type === 'attack' ? 'crosshair' : 'cell';
          const sid = this.hoveredFeature.properties.sid;
          if (this.pendingOrderMode.type === 'attack') {
            const name = this.hoveredFeature.properties.name ?? sid;
            const natoClass = this.hoveredFeature.properties.nato_class ?? 'SETTLEMENT';
            const controller = this.activeControlLookup[controlKey(sid)] ?? 'null';
            const controllerLabel = SIDE_LABELS[controller] ?? 'Neutral';
            const defender = this.defenderBySid.get(sid);
            const defenderStr = defender ? `${defender.name} (${defender.posture ?? '?'})` : 'Undefended';
            this.showTooltip(`TARGET: ${name}\n${natoClass} — ${controllerLabel}\nDefender: ${defenderStr}`, e.clientX, e.clientY);
          } else {
            const resolved = this.resolveMunicipalityFromFeature(this.hoveredFeature);
            this.showTooltip(`MOVE TO: ${resolved.displayName}`, e.clientX, e.clientY);
          }
        } else {
          canvas.style.cursor = 'not-allowed';
          this.hideTooltip();
        }
      } else if (formationAt && this.hoveredFeature) {
        this.showTooltip(`${formationAt.name} (${formationAt.kind}) — ${formationAt.faction}`, e.clientX, e.clientY);
        canvas.style.cursor = this.state.snapshot.zoomFactor > 1 ? 'grab' : 'pointer';
      } else if (this.hoveredFeature) {
        const sid = this.hoveredFeature.properties.sid;
        const name = this.hoveredFeature.properties.name ?? sid;
        const pop1991 = this.hoveredFeature.properties.pop;
        const pop1991Str = pop1991 != null ? pop1991.toLocaleString() : '—';
        const currentPopulation = this.getCurrentPopulationForFeature(this.hoveredFeature);
        const currentPopulationStr = currentPopulation != null ? currentPopulation.toLocaleString() : '—';
        const fillMode = this.state.snapshot.settlementFillMode;
        const subtitle = fillMode === 'ethnic_majority'
          ? (ETHNICITY_LABELS[this.getMajorityEthnicity(sid, this.hoveredFeature) ?? 'other'] ?? 'Other') + ' majority'
          : (SIDE_LABELS[this.activeControlLookup[controlKey(sid)] ?? 'null'] ?? 'Neutral');
        this.showTooltip(`${name} — ${subtitle} — pop 1991 ${pop1991Str} | current ${currentPopulationStr}`, e.clientX, e.clientY);
        canvas.style.cursor = this.state.snapshot.zoomFactor > 1 ? 'grab' : 'pointer';
      } else {
        this.hideTooltip();
        canvas.style.cursor = this.state.snapshot.zoomFactor > 1 ? 'grab' : 'default';
      }
    });

    // Mouseup: end pan, end region selection, or record whether it was a drag
    let lastWasDrag = false;
    window.addEventListener('mouseup', () => {
      // Finish staff map region selection
      if (this.staffMapSelecting) {
        this.staffMapSelecting = false;
        this.finalizeStaffMapSelection();
        return;
      }

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

      // Staff map active — delegate clicks
      if (this.state.snapshot.staffMapRegion && this.staffMapRenderer && this.staffMapCanvas) {
        const rect = canvas.getBoundingClientRect();
        const scx = (e.clientX - rect.left) * (this.staffMapCanvas.width / rect.width);
        const scy = (e.clientY - rect.top) * (this.staffMapCanvas.height / rect.height);

        // Exit button
        if (this.staffMapRenderer.isExitButtonHit(scx, scy)) {
          this.exitStaffMap();
          return;
        }

        // Formation click — only brigades are interactive in staff map
        const formation = this.staffMapRenderer.getFormationAtPoint(scx, scy);
        if (formation) {
          this.state.setSelectedFormation(formation.id);
          this.state.setSelectedSettlement(null);
          this.openBrigadePanel(formation);
        } else {
          this.state.setSelectedFormation(null);
        }
        this.scheduleRender();
        return;
      }

      // Selection mode — ignore regular clicks
      if (this.staffMapSelectionMode) return;

      // Pending order mode: intercept click to resolve MOVE/ATTACK target
      if (this.pendingOrderMode) {
        const mode = this.pendingOrderMode;

        // No target hovered → cancel
        if (!this.hoveredFeature) {
          this.cancelPendingOrder();
          this.showStatusError(`${mode.type === 'attack' ? 'Attack' : 'Move'} order cancelled — no target selected.`);
          return;
        }

        // ATTACK: two-step confirmation
        if (mode.type === 'attack') {
          const targetSid = this.hoveredFeature.properties.sid;
          // First click or re-targeting a different settlement → show confirmation
          if (!mode.candidateTargetSid || mode.candidateTargetSid !== targetSid) {
            mode.candidateTargetSid = targetSid;
            this.showAttackConfirmation(mode, targetSid);
            this.scheduleRender();
          } else {
            // Clicking same settlement again → confirm
            this.executeAttackOrder(mode.formation.id, targetSid);
          }
          return;
        }

        // MOVE: single click, immediate staging
        if (mode.type === 'move') {
          const resolved = this.resolveMunicipalityFromFeature(this.hoveredFeature);
          const mun1990Id = resolved.mun1990Id;
          const munLabel = mun1990Id ? `${resolved.displayName} (${mun1990Id})` : (this.hoveredFeature.properties.name ?? this.hoveredFeature.properties.sid);
          if (mun1990Id) {
            const bridge = this.getDesktopBridge();
            if (bridge?.stageMoveOrder) {
              bridge.stageMoveOrder(mode.formation.id, mun1990Id).then(r => {
                if (r.ok) this.showStatusError(`Move order staged: ${mode.formation.name} → ${munLabel}. Advance turn to execute.`);
                else this.showStatusError(`Move order failed: ${r.error ?? 'unknown'}`);
              }).catch(err => this.showStatusError(`Move order failed: ${err}`));
            } else {
              this.showStatusError(`Move order staged: ${mode.formation.name} → ${munLabel}. Advance turn to execute.`);
            }
          } else {
            this.showStatusError(`Move order cancelled — target has no municipality.`);
          }
          this.exitTargetingMode();
          return;
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
        // Exit staff map
        if (this.state.snapshot.staffMapRegion) {
          this.exitStaffMap(); e.preventDefault(); return;
        }
        // Exit selection mode
        if (this.staffMapSelectionMode) {
          this.exitStaffMapSelectionMode(); e.preventDefault(); return;
        }
        if (this.pendingOrderMode) { this.cancelPendingOrder(); e.preventDefault(); return; }
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
      if (e.key === 'o' || e.key === 'O') { this.toggleOOB(); e.preventDefault(); }
      if (e.key === '1') { this.state.setZoom(0, ZOOM_FACTORS[0]); this.updateZoomPill(); e.preventDefault(); }
      if (e.key === '2') { this.state.setZoom(1, ZOOM_FACTORS[1]); this.updateZoomPill(); e.preventDefault(); }
      if (e.key === '3') { this.state.setZoom(2, ZOOM_FACTORS[2]); this.updateZoomPill(); e.preventDefault(); }
      if (e.key === '4') {
        if (this.state.snapshot.staffMapRegion) {
          this.exitStaffMap();
        } else if (this.staffMapSelectionMode) {
          this.exitStaffMapSelectionMode();
        } else {
          this.enterStaffMapSelectionMode();
        }
        e.preventDefault();
      }
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

  private updateToolbarDate(turn: number, phase: string): void {
    const turnDisplay = document.getElementById('turn-display');
    if (!turnDisplay) return;
    turnDisplay.textContent = formatTurnDate(turn, phase);
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
    this.updateToolbarDate(loaded.turn, loaded.phase);
    const formCheckbox = document.getElementById('layer-formations') as HTMLInputElement | null;
    if (formCheckbox) {
      formCheckbox.disabled = false;
      formCheckbox.checked = true;
      this.state.setLayer('formations', true);
    }
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

  /** Apply a loaded game state to map, OOB, and turn display. */
  private applyLoadedGameState(loaded: LoadedGameState): void {
    const previous = this.lastLoadedGameState;
    this.state.loadGameState(loaded);
    this.lastLoadedGameState = loaded;
    this.activeControlLookup = buildControlLookup(loaded.controlBySettlement);
    this.activeStatusLookup = buildStatusLookup(loaded.statusBySettlement);
    this.rebuildDefenderCache();
    // Cancel targeting if game state changes mid-targeting (stale references)
    if (this.pendingOrderMode) this.cancelPendingOrder();
    this.state.setControlDataset(`loaded:${loaded.label}`);
    this.updateToolbarDate(loaded.turn, loaded.phase);
    const formCheckbox = document.getElementById('layer-formations') as HTMLInputElement | null;
    if (formCheckbox) {
      formCheckbox.disabled = false;
      formCheckbox.checked = true;
      this.state.setLayer('formations', true);
    }
    this.updateWarStatusSection(loaded);
    this.updateOOBSidebar(loaded);
    this.updateStatusTicker(loaded);
    this.baseLayerCache = null;
    this.clearStatusBar();
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
      this.applyLoadedGameState(loaded);
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
        startNewCampaign?: (p: { playerFaction: string; scenarioKey?: 'sep_1991' | 'apr_1992' }) => Promise<{ ok: boolean; error?: string; stateJson?: string }>;
        loadScenarioDialog?: () => Promise<{ ok: boolean; error?: string; stateJson?: string }>;
        loadStateDialog?: () => Promise<{ ok: boolean; error?: string; stateJson?: string }>;
        advanceTurn?: () => Promise<{ ok: boolean; error?: string; stateJson?: string }>;
        setGameStateUpdatedCallback?: (cb: (stateJson: string) => void) => void;
        getCurrentGameState?: () => Promise<string | null>;
        focusWarroom?: () => Promise<{ ok: boolean; error?: string }>;
      };
    }).awwv;
    const embeddedInWarroom = new URLSearchParams(window.location.search).get('embedded') === '1';

    // "Back to HQ" button — visible for desktop and embedded warroom iframe.
    const hqBtn = document.getElementById('btn-back-to-hq');
    if (hqBtn && (awwvDesktop?.focusWarroom || embeddedInWarroom)) {
      hqBtn.style.display = '';
      hqBtn.addEventListener('click', () => {
        if (awwvDesktop?.focusWarroom) {
          awwvDesktop.focusWarroom().catch((err) => console.warn('focus-warroom failed:', err));
          return;
        }
        if (embeddedInWarroom && window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'awwv-back-to-hq' }, '*');
        }
      });
    }

    // In browser mode (no desktop API), relabel "New Campaign" → "Load Scenario"
    if (!awwvDesktop?.startNewCampaign) {
      const newCampaignBtn = document.getElementById('menu-new-campaign');
      if (newCampaignBtn) newCampaignBtn.textContent = 'Load Scenario';
    }

    document.getElementById('menu-new-campaign')?.addEventListener('click', () => {
      this.showOverlay('main-menu-overlay', false);
      if (awwvDesktop?.focusWarroom) {
        // Desktop mode: redirect to warroom window which has the polished side picker
        awwvDesktop.focusWarroom().catch((err) => console.warn('focus-warroom failed:', err));
      } else if (awwvDesktop?.startNewCampaign) {
        // Fallback: show local side picker if focusWarroom not available
        const errEl = document.getElementById('side-picker-error');
        if (errEl) {
          errEl.textContent = '';
          errEl.classList.add('hidden');
        }
        for (const faction of FACTION_DISPLAY_ORDER) {
          const el = document.getElementById(`side-picker-flag-${faction}`) as HTMLImageElement | null;
          if (el) el.src = this.getFlagUrl(faction);
        }
        const scenarioImg = document.getElementById('scenario-briefing-image') as HTMLImageElement | null;
        const scenarioTitleEl = document.querySelector('.tm-scenario-title') as HTMLElement | null;
        const scenarioSubtitleEl = document.querySelector('.tm-scenario-subtitle') as HTMLElement | null;
        const updateScenarioBriefing = (scenarioKey: 'sep_1991' | 'apr_1992') => {
          if (scenarioTitleEl && scenarioSubtitleEl) {
            if (scenarioKey === 'sep_1991') {
              scenarioTitleEl.textContent = 'September 1991 — Pre-War';
              scenarioSubtitleEl.textContent = 'The conflict has not fully ignited. Build influence, manage escalation, and prepare your side before open war begins.';
            } else {
              scenarioTitleEl.textContent = 'April 1992 — Independence';
              scenarioSubtitleEl.textContent = 'Bosnia-Herzegovina declares independence. The JNA withdraws—leaving everything behind. Three armies emerge from the chaos. A war without victory begins.';
            }
          }
          if (scenarioImg) {
            const src = scenarioKey === 'sep_1991'
              ? '/assets/sources/scenarios/sep1991_briefing.png'
              : '/assets/sources/scenarios/apr1992_briefing.png';
            scenarioImg.src = src;
            scenarioImg.style.display = '';
            scenarioImg.onerror = () => { scenarioImg.style.display = 'none'; };
          }
        };
        const sepScenario = document.getElementById('side-picker-scenario-sep1991') as HTMLInputElement | null;
        const aprScenario = document.getElementById('side-picker-scenario-apr1992') as HTMLInputElement | null;
        const persistedScenario = this.getPersistedCampaignScenarioKey();
        if (sepScenario && aprScenario) {
          sepScenario.checked = persistedScenario === 'sep_1991';
          aprScenario.checked = persistedScenario === 'apr_1992';
        } else if (aprScenario) {
          aprScenario.checked = true;
        }
        if (sepScenario) {
          sepScenario.onchange = () => {
            if (!sepScenario.checked) return;
            this.persistCampaignScenarioKey('sep_1991');
            updateScenarioBriefing('sep_1991');
          };
        }
        if (aprScenario) {
          aprScenario.onchange = () => {
            if (!aprScenario.checked) return;
            this.persistCampaignScenarioKey('apr_1992');
            updateScenarioBriefing('apr_1992');
          };
        }
        updateScenarioBriefing(persistedScenario);
        this.showOverlay('side-picker-overlay', true);
      } else {
        document.getElementById('btn-load-scenario')?.dispatchEvent(new Event('click'));
      }
    });
    document.getElementById('side-picker-close')?.addEventListener('click', () => this.showOverlay('side-picker-overlay', false));
    for (const faction of FACTION_DISPLAY_ORDER) {
      document.getElementById(`side-picker-${faction}`)?.addEventListener('click', async () => {
        if (!awwvDesktop?.startNewCampaign) return;
        const selectedScenario = (document.querySelector('input[name="side-picker-scenario"]:checked') as HTMLInputElement | null)?.value;
        const scenarioKey = selectedScenario === 'sep_1991' ? 'sep_1991' : 'apr_1992';
        this.persistCampaignScenarioKey(scenarioKey);
        let r: { ok: boolean; error?: string; stateJson?: string } | undefined;
        try {
          r = await awwvDesktop.startNewCampaign({ playerFaction: faction, scenarioKey });
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

    // Layer toggles (Labels always on; Brigade AoR automatic — no UI toggle needed)
    const layerMap: Array<[string, keyof typeof this.state.snapshot.layers]> = [
      ['layer-control', 'politicalControl'],
      ['layer-frontlines', 'frontLines'],
      ['layer-mun-borders', 'munBorders'],
      ['layer-minimap', 'minimap'],
      ['layer-formations', 'formations'],
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

    // Load state file (click handler set below: desktop → IPC, else → file input)
    const loadBtn = document.getElementById('btn-load-state');
    const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
    fileInput?.addEventListener('change', async () => {
      this.stopReplayPlayback();
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const loaded = parseGameState(JSON.parse(await file.text()));
        this.applyLoadedGameState(loaded);
      } catch (err) {
        this.showStatusError(`Failed to load state: ${err instanceof Error ? err.message : String(err)}`);
      }
      fileInput.value = '';
    });

    // Load run: fetch final_save.json from /runs/<runId>/ (dev server serves /runs/ from project root)
    const runFolderInput = document.getElementById('run-folder-input') as HTMLInputElement | null;
    const loadRunBtn = document.getElementById('btn-load-run');
    const loadRunFromId = async (runId: string): Promise<boolean> => {
      const trimmed = runId.trim();
      if (!trimmed) return false;
      this.stopReplayPlayback();
      try {
        const base = window.location.origin;
        const res = await fetch(`${base}/runs/${encodeURIComponent(trimmed)}/final_save.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const loaded = parseGameState(json);
        this.applyLoadedGameState(loaded);
        this.clearStatusBar();
        return true;
      } catch (err) {
        this.showStatusError(`Run load failed: ${err instanceof Error ? err.message : String(err)}. Use dev server (npm run dev:map) and a run folder under runs/.`);
        return false;
      }
    };
    loadRunBtn?.addEventListener('click', async () => {
      if (runFolderInput?.value) await loadRunFromId(runFolderInput.value);
    });
    // Optional: load run from URL ?run=<run_folder_name> for easy sharing (e.g. ?run=apr1992_definitive_52w__965092d481876749__w16_n80)
    const runParam = new URLSearchParams(window.location.search).get('run');
    if (runParam && runParam.trim()) {
      if (runFolderInput) runFolderInput.value = runParam.trim();
      void loadRunFromId(runParam.trim());
    }

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
      // Pull current state immediately (covers race where did-finish-load fires before callback is registered)
      if (awwvDesktop.getCurrentGameState) {
        awwvDesktop.getCurrentGameState().then((stateJson) => {
          if (stateJson && !this.state.snapshot.loadedGameState) {
            this.applyGameStateFromJson(stateJson);
          } else if (!stateJson && !this.state.snapshot.loadedGameState) {
            // No active game — show the main menu so the user can start/load one
            this.showOverlay('main-menu-overlay', true);
          }
        }).catch(() => { this.showOverlay('main-menu-overlay', true); });
      }
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
    this.updateToolbarDate(0, 'phase_0');
    this.setReplayStatus('Replay: not loaded');
    this.updateReplayScrubber();
    // In Electron, the menu is hidden by the inline script and state arrives
    // asynchronously via getCurrentGameState. Only force the menu open in
    // browser mode where the user must act manually.
    if (!awwvDesktop?.getCurrentGameState) {
      this.showOverlay('main-menu-overlay', true);
    }

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
    el.style.whiteSpace = 'pre-line';
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
    if (!el) return;
    if (this.state.snapshot.staffMapRegion) {
      el.textContent = 'STAFF MAP';
      el.classList.add('staff-map-active');
    } else {
      el.textContent = ZOOM_LABELS[this.state.snapshot.zoomLevel] ?? ZOOM_LABELS[0];
      el.classList.remove('staff-map-active');
    }
  }

  // ─── Staff Map Selection & Transition ─────────────

  private enterStaffMapSelectionMode(): void {
    this.staffMapSelectionMode = true;
    this.staffMapSelectStart = null;
    this.staffMapSelectEnd = null;
    this.canvas.style.cursor = 'crosshair';
    this.scheduleRender();
  }

  private exitStaffMapSelectionMode(): void {
    this.staffMapSelectionMode = false;
    this.staffMapSelecting = false;
    this.staffMapSelectStart = null;
    this.staffMapSelectEnd = null;
    this.canvas.style.cursor = this.state.snapshot.zoomFactor > 1 ? 'grab' : 'default';
    this.scheduleRender();
  }

  private finalizeStaffMapSelection(): void {
    if (!this.staffMapSelectStart || !this.staffMapSelectEnd) {
      this.exitStaffMapSelectionMode();
      return;
    }

    // Convert canvas pixel coords to data-space coords
    const vt = this.getViewTransform();
    const [dx0, dy0] = this.projection.unproject(
      this.staffMapSelectStart.x, this.staffMapSelectStart.y, vt,
    );
    const [dx1, dy1] = this.projection.unproject(
      this.staffMapSelectEnd.x, this.staffMapSelectEnd.y, vt,
    );

    const region = this.computeStaffMapRegionFromRect(
      Math.min(dx0, dx1), Math.min(dy0, dy1),
      Math.max(dx0, dx1), Math.max(dy0, dy1),
    );

    if (!region || region.regionSids.length < 5) {
      // Too few settlements — show a message and stay in selection mode
      this.showStatusError?.('Area too small — select a larger region (min 5 settlements).');
      this.staffMapSelecting = false;
      this.staffMapSelectStart = null;
      this.staffMapSelectEnd = null;
      this.scheduleRender();
      return;
    }

    // Exit selection mode and enter staff map
    this.staffMapSelectionMode = false;
    this.staffMapSelecting = false;
    this.staffMapSelectStart = null;
    this.staffMapSelectEnd = null;

    // Show staff map overlay
    if (this.staffMapCanvas) {
      this.staffMapCanvas.style.display = 'block';
      this.staffMapRenderer?.resize();
      this.staffMapRenderer?.setControlLookup(this.activeControlLookup);
    }
    this.state.enterStaffMap(region);
    this.updateZoomPill();
  }

  private exitStaffMap(): void {
    if (this.staffMapCanvas) {
      this.staffMapCanvas.style.display = 'none';
    }
    this.state.exitStaffMap();
    this.updateZoomPill();
    this.canvas.style.cursor = this.state.snapshot.zoomFactor > 1 ? 'grab' : 'default';
    this.scheduleRender();
  }

  private computeStaffMapRegionFromRect(
    x0: number, y0: number, x1: number, y1: number,
  ): StaffMapRegion | null {
    const regionSids: string[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const [sid, centroid] of this.data.settlementCentroids) {
      const [cx, cy] = centroid;
      if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) {
        regionSids.push(sid);
        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;
      }
    }

    if (regionSids.length === 0) return null;

    // Sort for determinism
    regionSids.sort();

    return {
      regionSids,
      bbox: { minX, minY, maxX, maxY },
      selectionRect: { x0, y0, x1, y1 },
    };
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
    const pop1991 = feature.properties.pop;
    const pop1991Str = pop1991 != null ? pop1991.toLocaleString() : '—';
    const currentPopulation = this.getCurrentPopulationForFeature(feature);
    const currentPopulationStr = currentPopulation != null ? currentPopulation.toLocaleString() : '—';
    const fillMode = this.state.snapshot.settlementFillMode;
    const thirdLine = fillMode === 'ethnic_majority'
      ? (ETHNICITY_LABELS[this.getMajorityEthnicity(sid, feature) ?? 'other'] ?? 'Other') + ' majority'
      : (SIDE_LABELS[controller] ?? controller);
    document.getElementById('panel-name')!.textContent = name;
    document.getElementById('panel-subtitle')!.textContent = `${natoClass} — Pop 1991 ${pop1991Str} | Current ${currentPopulationStr} — ${thirdLine}`;

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

  /** Open the panel with a formation's header (name, flag, subtitle) and clear tabs. Returns content element, or null if panel missing. */
  private showFormationPanelHeader(faction: string, name: string, subtitle: string): HTMLElement | null {
    const factionColor = SIDE_SOLID_COLORS[faction] ?? '#888';
    if (!this.showPanel(factionColor)) return null;
    document.getElementById('panel-name')!.textContent = name;
    document.getElementById('panel-subtitle')!.textContent = subtitle;
    const flagEl = document.getElementById('panel-flag') as HTMLImageElement;
    if (flagEl) { flagEl.src = this.getFlagUrl(faction); flagEl.style.display = ''; }
    document.getElementById('panel-tabs')!.innerHTML = '';
    return document.getElementById('panel-content')!;
  }

  /** Enter target-selection mode for a move or attack order. Shows targeting header in panel. */
  private enterOrderSelectionMode(type: 'move' | 'attack', formation: FormationView): void {
    this.pendingOrderMode = { type, formation };

    const target = type === 'move' ? 'municipality' : 'settlement';
    const factionColor = SIDE_SOLID_COLORS[formation.faction] ?? '#888';

    // Show compact targeting header in the panel
    const contentEl = this.showFormationPanelHeader(formation.faction, formation.name, `Selecting ${type.toUpperCase()} target…`);
    if (contentEl) {
      contentEl.innerHTML = `<div class="tm-panel-section" style="text-align:center;padding:16px 0">
        <div style="font-size:12px;color:${this.escapeHtml(factionColor)};margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">
          Select target ${this.escapeHtml(target)}
        </div>
        <div style="font-size:10px;color:#90a4ae;margin-bottom:12px">
          Click a ${this.escapeHtml(target)} on the map
        </div>
        <button type="button" class="tm-toolbar-btn" id="cancel-targeting-btn"
          style="background:rgba(255,61,0,0.15);border-color:#ff3d00;color:#ff8a65">
          Cancel (Esc)
        </button>
      </div>`;
      document.getElementById('cancel-targeting-btn')?.addEventListener('click', () => {
        this.cancelPendingOrder();
      });
    }

    this.showStatusError(`Select target ${target} on the map for ${formation.name} ${type} order. Press Esc to cancel.`);
    this.startTargetingAnimation();
    this.scheduleRender();
  }

  /** Tear down targeting-mode state (animation, panel, render). Does not clear status bar. */
  private exitTargetingMode(): void {
    this.pendingOrderMode = null;
    this.stopTargetingAnimation();
    this.closeSettlementPanel();
    this.scheduleRender();
  }

  /** Cancel pending order mode and clean up all targeting state. */
  private cancelPendingOrder(): void {
    if (!this.pendingOrderMode) return;
    this.exitTargetingMode();
    this.clearStatusBar();
  }

  /** Stage a confirmed attack order via the desktop bridge. */
  private executeAttackOrder(brigadeId: string, targetSid: string): void {
    const feature = this.data.settlements.get(targetSid);
    const targetName = feature?.properties.name ?? targetSid;
    const bridge = this.getDesktopBridge();
    if (bridge?.stageAttackOrder) {
      bridge.stageAttackOrder(brigadeId, targetSid).then(r => {
        if (r.ok) this.showStatusError(`Attack order staged: ${targetName} (${targetSid}). Advance turn to execute.`);
        else this.showStatusError(`Attack order failed: ${r.error ?? 'unknown'}`);
      }).catch(err => this.showStatusError(`Attack order failed: ${err}`));
    } else {
      this.showStatusError(`Attack order staged: ${targetName} (${targetSid}). Advance turn to execute.`);
    }
    this.exitTargetingMode();
  }

  /** Show attack confirmation panel with target details + Confirm/Cancel buttons. */
  private showAttackConfirmation(
    mode: NonNullable<typeof this.pendingOrderMode>,
    targetSid: string
  ): void {
    const feature = this.data.settlements.get(targetSid);
    if (!feature) return;
    const name = feature.properties.name ?? targetSid;
    const natoClass = feature.properties.nato_class ?? 'SETTLEMENT';
    const controller = this.activeControlLookup[controlKey(targetSid)] ?? 'null';
    const controllerLabel = SIDE_LABELS[controller] ?? 'Neutral';
    const defender = this.defenderBySid.get(targetSid);
    const defenderStr = defender
      ? `${defender.name} (${defender.posture ?? '?'})`
      : 'Undefended';

    const contentEl = this.showFormationPanelHeader(mode.formation.faction, mode.formation.name, 'CONFIRM ATTACK');
    if (!contentEl) return;
    contentEl.innerHTML = `
      <div class="tm-panel-section">
        <div class="tm-panel-section-header">ATTACK TARGET</div>
        <div class="tm-panel-field"><span class="tm-panel-field-label">Settlement</span>
          <span class="tm-panel-field-value">${this.escapeHtml(name)}</span></div>
        <div class="tm-panel-field"><span class="tm-panel-field-label">Class</span>
          <span class="tm-panel-field-value">${this.escapeHtml(natoClass)}</span></div>
        <div class="tm-panel-field"><span class="tm-panel-field-label">Controller</span>
          <span class="tm-panel-field-value">${this.escapeHtml(controllerLabel)}</span></div>
        <div class="tm-panel-field"><span class="tm-panel-field-label">Defender</span>
          <span class="tm-panel-field-value">${this.escapeHtml(defenderStr)}</span></div>
      </div>
      <div style="display:flex;gap:8px;justify-content:center;padding:12px 0">
        <button type="button" class="tm-toolbar-btn" id="confirm-attack-btn"
          style="background:rgba(255,68,68,0.2);border-color:#ff4444;color:#ff8a65">
          Confirm Attack
        </button>
        <button type="button" class="tm-toolbar-btn" id="cancel-attack-btn">Cancel</button>
      </div>
      <div style="font-size:9px;color:#616161;text-align:center">Click target again or press Confirm</div>`;

    document.getElementById('confirm-attack-btn')?.addEventListener('click', () => {
      this.executeAttackOrder(mode.formation.id, targetSid);
    });
    document.getElementById('cancel-attack-btn')?.addEventListener('click', () => {
      this.cancelPendingOrder();
    });

    this.showStatusError(`Confirm attack on ${name}. Click again, press Confirm, or Esc to cancel.`);
  }

  /** Rebuild the SID→defender reverse lookup from the loaded game state. */
  private rebuildDefenderCache(): void {
    this.defenderBySid.clear();
    const gs = this.state.snapshot.loadedGameState;
    if (!gs) return;
    for (const fv of gs.formations) {
      const aor = gs.brigadeAorByFormationId[fv.id];
      if (!aor) continue;
      for (const sid of aor) {
        this.defenderBySid.set(sid, fv);
      }
    }
  }

  /** Get or build the municipality→SID list cache. */
  private getMunToSids(): Map<string, string[]> {
    if (this.munToSidsCache) return this.munToSidsCache;
    const map = new Map<string, string[]>();
    for (const [sid, feature] of this.data.settlements) {
      const { mun1990Id } = this.resolveMunicipalityFromFeature(feature);
      if (mun1990Id) {
        const list = map.get(mun1990Id) ?? [];
        list.push(sid);
        map.set(mun1990Id, list);
      }
    }
    this.munToSidsCache = map;
    return map;
  }

  private startTargetingAnimation(): void {
    if (this.targetingAnimFrame !== null) return;
    const animate = () => {
      if (!this.pendingOrderMode) { this.stopTargetingAnimation(); return; }
      this.scheduleRender();
      this.targetingAnimFrame = requestAnimationFrame(animate);
    };
    this.targetingAnimFrame = requestAnimationFrame(animate);
  }

  private stopTargetingAnimation(): void {
    if (this.targetingAnimFrame !== null) {
      cancelAnimationFrame(this.targetingAnimFrame);
      this.targetingAnimFrame = null;
    }
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

    if (f.kind === 'army_hq') {
      this.renderArmyHqPanel(f, gs, contentEl);
    } else if (f.kind === 'corps' || f.kind === 'corps_asset') {
      this.renderCorpsPanel(f, gs, contentEl);
    } else {
      this.renderBrigadePanel(f, gs, contentEl);
    }
  }

  /** Render army HQ detail panel: lists subordinate corps with click-through. */
  private renderArmyHqPanel(f: FormationView, gs: LoadedGameState, contentEl: HTMLElement): void {
    const subtitleParts = ['army hq', SIDE_LABELS[f.faction] ?? f.faction];
    document.getElementById('panel-subtitle')!.textContent = subtitleParts.join(' — ');

    const crestUrl = this.getCrestUrl(f.faction);

    // Subordinates are corps of the same faction
    const subIds = f.subordinateIds ?? [];
    const subordinates = subIds
      .map(id => gs.formations.find(sub => sub.id === id))
      .filter((s): s is FormationView => s != null);

    // Total personnel across all corps (summing brigades under each corps)
    let totalPersonnel = 0;
    let totalBrigades = 0;
    for (const corps of subordinates) {
      const corpsBrigadeIds = corps.subordinateIds ?? [];
      for (const bId of corpsBrigadeIds) {
        const brig = gs.formations.find(b => b.id === bId);
        if (brig) {
          totalPersonnel += brig.personnel ?? 0;
          totalBrigades++;
        }
      }
    }

    let html = `<div class="tm-brigade-crest-wrap"><img class="tm-brigade-crest" src="${this.escapeHtml(crestUrl)}" alt="" /></div>`;

    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">ARMY COMMAND</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">ID</span><span class="tm-panel-field-value">${this.escapeHtml(f.id)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Faction</span><span class="tm-panel-field-value">${this.escapeHtml(SIDE_LABELS[f.faction] ?? f.faction)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Status</span><span class="tm-panel-field-value">${this.escapeHtml(f.status)}</span></div>
    </div>`;

    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">STRENGTH</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Subordinate corps</span><span class="tm-panel-field-value">${subordinates.length}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Total brigades</span><span class="tm-panel-field-value">${totalBrigades}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Total personnel</span><span class="tm-panel-field-value">${totalPersonnel.toLocaleString()}</span></div>
    </div>`;

    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">SUBORDINATE CORPS</div>`;
    if (subordinates.length === 0) {
      html += `<div class="tm-panel-placeholder">No subordinate corps</div>`;
    } else {
      for (const sub of subordinates) {
        const subCrest = this.getCrestUrl(sub.faction);
        const subBrigadeCount = (sub.subordinateIds ?? []).length;
        const subPers = (sub.subordinateIds ?? []).reduce((sum, bId) => {
          const brig = gs.formations.find(b => b.id === bId);
          return sum + (brig?.personnel ?? 0);
        }, 0);
        const stanceStr = sub.corpsStance ? ` · ${sub.corpsStance}` : '';
        html += `<div class="tm-formation-row" data-formation-id="${this.escapeHtml(sub.id)}" style="cursor:pointer">
          <img class="tm-formation-crest" src="${this.escapeHtml(subCrest)}" alt="" />
          <span class="tm-formation-name">${this.escapeHtml(sub.name)}</span>
          <span class="tm-formation-kind" style="opacity:0.6;font-size:10px">${subBrigadeCount} bde | ${subPers.toLocaleString()} pers${stanceStr}</span>
        </div>`;
      }
    }
    html += `</div>`;

    contentEl.innerHTML = html;

    // Wire subordinate clicks → open that corps panel
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
      <div class="tm-panel-field"><span class="tm-panel-field-label">Stance</span><span class="tm-panel-field-value tm-stance-${this.escapeHtml(f.corpsStance ?? 'unknown')}">${this.escapeHtml(f.corpsStance ?? '—')}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Exhaustion</span><span class="tm-panel-field-value">${f.corpsExhaustion != null ? (f.corpsExhaustion * 100).toFixed(0) + '%' : '—'}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Command span</span><span class="tm-panel-field-value">${f.corpsCommandSpan ?? '—'}</span></div>
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

    // Corps actions: stance dropdown + bulk subordinate posture
    const stanceOptions = ['defensive', 'balanced', 'offensive', 'reorganize'];
    const currentStance = f.corpsStance ?? 'balanced';
    const stanceOpts = stanceOptions.map(s =>
      `<option value="${this.escapeHtml(s)}"${s === currentStance ? ' selected' : ''}>${this.escapeHtml(s.charAt(0).toUpperCase() + s.slice(1))}</option>`
    ).join('');

    const postureOptions = ['defend', 'probe', 'attack', 'elastic_defense', 'consolidation'];
    const postureOpts = postureOptions.map(p =>
      `<option value="${this.escapeHtml(p)}">${this.escapeHtml(p === 'elastic_defense' ? 'Elastic Defense' : p.charAt(0).toUpperCase() + p.slice(1))}</option>`
    ).join('');

    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">ACTIONS</div>
      <div class="tm-panel-field">
        <span class="tm-panel-field-label">Corps Stance</span>
        <select id="corps-stance-select" class="tm-select" style="font-size:11px;padding:2px 4px;background:#1a2236;color:#c8e6c9;border:1px solid rgba(200,230,201,0.3);border-radius:3px">${stanceOpts}</select>
      </div>
      <div style="margin-top:8px;font-size:10px;color:#90a4ae;text-transform:uppercase;letter-spacing:0.05em">Set all subordinates</div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:4px">
        <select id="corps-bulk-posture-select" class="tm-select" style="font-size:11px;padding:2px 4px;background:#1a2236;color:#c8e6c9;border:1px solid rgba(200,230,201,0.3);border-radius:3px;flex:1">${postureOpts}</select>
        <button type="button" class="tm-toolbar-btn" id="corps-apply-posture-btn" title="Apply posture to all subordinate brigades">Apply</button>
      </div>
    </div>`;

    contentEl.innerHTML = html;

    // Wire corps stance dropdown
    const stanceSelect = contentEl.querySelector('#corps-stance-select') as HTMLSelectElement | null;
    if (stanceSelect) {
      stanceSelect.addEventListener('change', () => {
        const newStance = stanceSelect.value;
        const bridge = this.getDesktopBridge();
        if (bridge?.stageCorpsStanceOrder) {
          bridge.stageCorpsStanceOrder(f.id, newStance).then((r: { ok: boolean; error?: string }) => {
            if (r.ok) this.showStatusError(`Corps stance staged: ${f.name} → ${newStance}. Advance turn to execute.`);
            else this.showStatusError(`Corps stance failed: ${r.error ?? 'unknown'}`);
          }).catch((err: unknown) => this.showStatusError(`Corps stance failed: ${err}`));
        } else {
          this.showStatusError(`Corps stance staged: ${f.name} → ${newStance}. (No desktop bridge)`);
        }
      });
    }

    // Wire bulk posture apply button
    const applyBtn = contentEl.querySelector('#corps-apply-posture-btn') as HTMLElement | null;
    const bulkPostureSelect = contentEl.querySelector('#corps-bulk-posture-select') as HTMLSelectElement | null;
    if (applyBtn && bulkPostureSelect) {
      applyBtn.addEventListener('click', () => {
        const posture = bulkPostureSelect.value;
        const bridge = this.getDesktopBridge();
        let staged = 0;
        for (const subId of subIds) {
          if (bridge?.stagePostureOrder) {
            bridge.stagePostureOrder(subId, posture).then((r: { ok: boolean }) => {
              if (r.ok) staged++;
            }).catch(() => {});
          }
        }
        this.showStatusError(`Posture ${posture} staged for ${subIds.length} subordinates of ${f.name}.`);
      });
    }

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

    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">CHAIN OF COMMAND</div>`;
    if (corpsName && f.corps_id) {
      html += `<button type="button" class="tm-corps-link tm-toolbar-btn" data-corps-id="${this.escapeHtml(f.corps_id)}" style="width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px;letter-spacing:0.4px">
        <span style="opacity:0.8">Part of corps</span>
        <span style="text-decoration:underline;font-weight:700">${this.escapeHtml(corpsName)}</span>
      </button>`;
    } else {
      html += `<div class="tm-panel-placeholder">No parent corps assigned.</div>`;
    }
    html += `</div>`;

    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">STATISTICS</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Personnel</span><span class="tm-panel-field-value">${f.personnel != null ? f.personnel.toLocaleString() : '—'}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Posture</span><span class="tm-panel-field-value">${this.escapeHtml(f.posture ?? '—')}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Fatigue</span><span class="tm-panel-field-value">${f.fatigue}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Cohesion</span><span class="tm-panel-field-value">${f.cohesion}%</span></div>
    </div>`;
    // Consolidated AoR + coverage: single compact line
    const aorStatusParts: string[] = [`${coveredCount}/${aorCount} settlements covered`];
    if (overflowCount > 0) aorStatusParts.push(`<span style="color:#ef9a9a">${overflowCount} overextended</span>`);
    if (fortressActive) aorStatusParts.push(`<span style="color:#80cbc4">urban fortress</span>`);
    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">AoR</div>
      <div class="tm-panel-field"><span class="tm-panel-field-value">${aorStatusParts.join(' · ')}</span></div>
    </div>`;
    // Posture dropdown with descriptions and eligibility
    const postureInfo: Record<string, { label: string; pressure: string; defense: string; cohesionCost: string; minCoh: number; readiness: string[] }> = {
      defend:           { label: 'Defend',           pressure: '0.3×', defense: '1.5×', cohesionCost: '+1/turn',   minCoh: 0,  readiness: ['active', 'overextended', 'degraded', 'forming'] },
      probe:            { label: 'Probe',            pressure: '0.7×', defense: '1.0×', cohesionCost: '−1/turn',   minCoh: 20, readiness: ['active', 'overextended'] },
      attack:           { label: 'Attack',           pressure: '1.5×', defense: '0.5×', cohesionCost: '−3/turn',   minCoh: 40, readiness: ['active'] },
      elastic_defense:  { label: 'Elastic Defense',  pressure: '0.2×', defense: '1.2×', cohesionCost: '−0.5/turn', minCoh: 0,  readiness: ['active', 'overextended', 'degraded'] },
      consolidation:    { label: 'Consolidation',    pressure: '0.6×', defense: '1.1×', cohesionCost: '+0.5/turn', minCoh: 0,  readiness: ['active', 'overextended', 'degraded'] },
    };
    const postureKeys = ['defend', 'probe', 'attack', 'elastic_defense', 'consolidation'];
    const currentPosture = f.posture ?? 'defend';
    const brigCohesion = f.cohesion ?? 60;
    const brigReadiness = f.readiness ?? 'active';
    const postureOptions = postureKeys.map(p => {
      const pi = postureInfo[p];
      const canAdopt = brigCohesion >= pi.minCoh && pi.readiness.includes(brigReadiness);
      const disabledAttr = canAdopt ? '' : ' disabled';
      const titleText = `${pi.label}: Pressure ${pi.pressure} | Defense ${pi.defense} | Cohesion ${pi.cohesionCost} | Min cohesion ${pi.minCoh} | Readiness: ${pi.readiness.join(', ')}`;
      return `<option value="${this.escapeHtml(p)}"${p === currentPosture ? ' selected' : ''}${disabledAttr} title="${this.escapeHtml(titleText)}">${this.escapeHtml(pi.label)}</option>`;
    }).join('');

    const currentPI = postureInfo[currentPosture] ?? postureInfo['defend'];
    const postureDesc = `Pressure ${currentPI.pressure} · Defense ${currentPI.defense} · Cohesion ${currentPI.cohesionCost}`;

    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">ACTIONS</div>
      <div class="tm-panel-field">
        <span class="tm-panel-field-label">Posture</span>
        <select id="brigade-posture-select" class="tm-select" style="font-size:11px;padding:2px 4px;background:#1a2236;color:#c8e6c9;border:1px solid rgba(200,230,201,0.3);border-radius:3px">${postureOptions}</select>
      </div>
      <div id="posture-description" style="font-size:10px;color:#90a4ae;margin:4px 0 2px 0">${this.escapeHtml(postureDesc)}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
        <button type="button" class="tm-toolbar-btn" data-brigade-action="move" title="Select target municipality on map">Move</button>
        <button type="button" class="tm-toolbar-btn" data-brigade-action="attack" title="Select target settlement on map">Attack</button>
        <button type="button" class="tm-toolbar-btn" data-brigade-action="clear" title="Clear all pending orders for this brigade">Clear Orders</button>
      </div>
    </div>`;

    contentEl.innerHTML = html;

    // Wire posture dropdown
    const postureSelect = contentEl.querySelector('#brigade-posture-select') as HTMLSelectElement | null;
    const postureDescEl = contentEl.querySelector('#posture-description') as HTMLElement | null;
    if (postureSelect) {
      postureSelect.addEventListener('change', () => {
        const newPosture = postureSelect.value;
        // Update inline description
        if (postureDescEl) {
          const pi = postureInfo[newPosture] ?? postureInfo['defend'];
          postureDescEl.textContent = `Pressure ${pi.pressure} · Defense ${pi.defense} · Cohesion ${pi.cohesionCost}`;
        }
        const bridge = this.getDesktopBridge();
        if (bridge?.stagePostureOrder) {
          bridge.stagePostureOrder(f.id, newPosture).then(r => {
            if (r.ok) this.showStatusError(`Posture order staged: ${f.name} → ${newPosture}. Advance turn to execute.`);
            else this.showStatusError(`Posture order failed: ${r.error ?? 'unknown'}`);
          }).catch(err => this.showStatusError(`Posture order failed: ${err}`));
        } else {
          this.showStatusError(`Posture order staged: ${f.name} → ${newPosture}. Advance turn to execute.`);
        }
      });
    }

    // Wire move/attack/clear buttons
    contentEl.querySelectorAll('[data-brigade-action]').forEach((el) => {
      el.addEventListener('click', () => {
        const action = (el as HTMLElement).getAttribute('data-brigade-action');
        if (action === 'clear') {
          const bridge = this.getDesktopBridge();
          if (bridge?.clearOrders) {
            bridge.clearOrders(f.id).then(r => {
              if (r.ok) this.showStatusError(`Orders cleared for ${f.name}.`);
              else this.showStatusError(`Clear orders failed: ${r.error ?? 'unknown'}`);
            }).catch(err => this.showStatusError(`Clear orders failed: ${err}`));
          } else {
            this.showStatusError(`Orders cleared for ${f.name}. (No desktop bridge)`);
          }
        } else if (action === 'move' || action === 'attack') {
          this.enterOrderSelectionMode(action, f);
        }
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
      { id: 'control', label: 'CONTROL' },
      { id: 'intel', label: 'MILITARY' },
      { id: 'orders_events', label: 'ORDERS/EVENTS' },
      { id: 'aar', label: 'HISTORY' },
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
        contentEl.innerHTML = this.renderOverviewTab(sid, feature, controller, controlStatus) + this.renderAdminTab(sid, feature);
      } else if (tabId === 'control') {
        contentEl.innerHTML = this.renderControlTab(sid, controller, controlStatus, factionColor);
      } else if (tabId === 'intel') {
        contentEl.innerHTML = this.renderIntelTab(sid, feature);
      } else if (tabId === 'orders_events') {
        contentEl.innerHTML = this.renderOrdersEventsTab(sid);
      } else if (tabId === 'aar') {
        contentEl.innerHTML = this.renderAarTab(sid);
      }
      this.wireSettlementFormationLinks(contentEl);
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

  private wireSettlementFormationLinks(contentEl: HTMLElement): void {
    const gs = this.state.snapshot.loadedGameState;
    if (!gs) return;
    contentEl.querySelectorAll<HTMLElement>('[data-formation-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const formationId = el.dataset.formationId;
        if (!formationId) return;
        const formation = gs.formations.find((f) => f.id === formationId);
        if (!formation) return;
        this.state.setSelectedFormation(formationId);
        this.openBrigadePanel(formation);
      });
    });
  }

  private renderOverviewTab(sid: string, feature: SettlementFeature, controller: string, controlStatus: string): string {
    const name = feature.properties.name ?? sid;
    const natoClass = feature.properties.nato_class ?? 'SETTLEMENT';
    const natoClassLabel = natoClass.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const pop1991 = feature.properties.pop;
    const pop1991Str = pop1991 != null ? pop1991.toLocaleString() : '—';
    const currentPopulation = this.getCurrentPopulationForFeature(feature);
    const currentPopulationStr = currentPopulation != null ? currentPopulation.toLocaleString() : '—';

    let html = `<div class="tm-panel-section">
      <div class="tm-panel-section-header">IDENTIFICATION</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Name</span><span class="tm-panel-field-value">${this.escapeHtml(name)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Type</span><span class="tm-panel-field-value">${this.escapeHtml(natoClassLabel)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Population (1991)</span><span class="tm-panel-field-value">${this.escapeHtml(pop1991Str)}</span></div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Population (Current)</span><span class="tm-panel-field-value">${this.escapeHtml(currentPopulationStr)}</span></div>
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

  /** Current population inferred from loaded displacement state for this feature's municipality. */
  private getCurrentPopulationForFeature(feature: SettlementFeature): number | null {
    const gs = this.state.snapshot.loadedGameState;
    if (!gs?.displacementByMun) return null;
    const { mun1990Id } = this.resolveMunicipalityFromFeature(feature);
    if (!mun1990Id) return null;
    const row = gs.displacementByMun[mun1990Id];
    if (!row) return null;
    const current = row.currentPopulation;
    if (typeof current !== 'number' || !Number.isFinite(current)) return null;
    return Math.max(0, Math.round(current));
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

    const pf = gs.player_faction;
    const formations = gs.formations.filter(f => f.municipalityId === mun1990Id && (!pf || f.faction === pf));

    let html = `<div class="tm-panel-section"><div class="tm-panel-section-header">FORMATIONS (${formations.length})</div>`;
    if (formations.length === 0) {
      html += `<div class="tm-panel-placeholder">No formations in this municipality.</div>`;
    } else {
      for (const f of formations.slice(0, 20)) {
        const readinessColor = panelReadinessColor(f.readiness);
        const cohesionPct = Math.round(f.cohesion);
        const intelCrestUrl = this.getCrestUrl(f.faction);
        html += `<div class="tm-formation-row" data-formation-id="${this.escapeHtml(f.id)}" style="cursor:pointer">
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

    // Militia pool (player faction only when set)
    const pool = gs.militiaPools.find(p => p.munId === mun1990Id && (!pf || p.faction === pf));
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
    const pf = gs.player_faction;
    const brigadeToFaction = pf ? new Map(gs.formations.map(f => [f.id, f.faction] as const)) : null;
    const isOwn = (brigadeId: string) => !pf || brigadeToFaction?.get(brigadeId) === pf;
    const attack = gs.attackOrders.filter((o) => o.targetSettlementId === sid && isOwn(o.brigadeId));
    const movement = gs.movementOrders.filter((o) => {
      if (!isOwn(o.brigadeId)) return false;
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

  private renderOrdersEventsTab(sid: string): string {
    return this.renderOrdersTab(sid) + this.renderEventsTab(sid);
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

    const pf = gs.player_faction;
    const visibleFactions = pf ? [pf] : FACTION_DISPLAY_ORDER;
    const ownFormations = pf ? gs.formations.filter(f => f.faction === pf) : gs.formations;

    const countsByFaction = new Map<string, number>();
    const allSids = Object.keys(this.activeControlLookup).sort();
    for (const sid of allSids) {
      const c = this.activeControlLookup[sid];
      if (!c) continue;
      countsByFaction.set(c, (countsByFaction.get(c) ?? 0) + 1);
    }
    const totalSettlements = Math.max(1, allSids.length);

    let html = `<div class="tm-panel-section"><div class="tm-panel-section-header">WAR STATUS</div>`;
    for (const faction of visibleFactions) {
      const count = countsByFaction.get(faction) ?? 0;
      const pct = ((count / totalSettlements) * 100).toFixed(1);
      const personnel = ownFormations.filter(f => f.faction === faction).reduce((s, f) => s + (f.personnel ?? 0), 0);
      html += `<div class="tm-panel-field"><span class="tm-panel-field-label">${this.escapeHtml(SIDE_LABELS[faction] ?? faction)}</span><span class="tm-panel-field-value">${pct}% | ${personnel.toLocaleString()} pers</span></div>`;
    }
    const flipsThisTurn = gs.recentControlEvents.filter((e) => e.turn === gs.turn).length;
    const ownAttackOrders = pf ? gs.attackOrders.filter(o => ownFormations.some(f => f.id === o.brigadeId)) : gs.attackOrders;
    const ownMoveOrders = pf ? gs.movementOrders.filter(o => ownFormations.some(f => f.id === o.brigadeId)) : gs.movementOrders;
    const pendingOrders = ownAttackOrders.length + ownMoveOrders.length;
    html += `<div class="tm-panel-field"><span class="tm-panel-field-label">Flips this turn</span><span class="tm-panel-field-value">${flipsThisTurn}</span></div>`;
    html += `<div class="tm-panel-field"><span class="tm-panel-field-label">Pending orders</span><span class="tm-panel-field-value">${pendingOrders}</span></div>`;
    html += `</div>`;

    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">FORCE OVERVIEW</div>`;
    for (const faction of visibleFactions) {
      const formations = ownFormations.filter((f) => f.faction === faction);
      const avgCohesion = formations.length === 0 ? 0 : Math.round(formations.reduce((s, f) => s + f.cohesion, 0) / formations.length);
      html += `<div class="tm-panel-field"><span class="tm-panel-field-label">${this.escapeHtml(SIDE_LABELS[faction] ?? faction)}</span><span class="tm-panel-field-value">${formations.length} brigades | coh ${avgCohesion}%</span></div>`;
    }
    html += `</div>`;

    const overextended = ownFormations.filter((f) => f.readiness === 'overextended').length;
    const lowCohesion = ownFormations.filter((f) => f.cohesion < 40).length;
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

    const pf = gs.player_faction;
    const visibleFactions = pf ? [pf] : FACTION_DISPLAY_ORDER;

    // Group by faction
    const byFaction = new Map<string, typeof gs.formations>();
    for (const f of gs.formations) {
      let list = byFaction.get(f.faction);
      if (!list) { list = []; byFaction.set(f.faction, list); }
      list.push(f);
    }

    let html = '';
    for (const faction of visibleFactions) {
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

    // Militia pool summary (player faction only when set)
    const pools = pf ? gs.militiaPools.filter(p => p.faction === pf) : gs.militiaPools;
    if (pools.length > 0) {
      const totalAvail = pools.reduce((s, p) => s + p.available, 0);
      const totalCommit = pools.reduce((s, p) => s + p.committed, 0);
      const totalExhaust = pools.reduce((s, p) => s + p.exhausted, 0);
      html += `<div class="tm-panel-section" style="margin-top:12px">
        <div class="tm-panel-section-header">MILITIA POOLS</div>
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

    const pf = gs.player_faction;
    const visibleFactions = pf ? [pf] : FACTION_DISPLAY_ORDER;

    // Build per-faction stats (player faction only when set)
    const byFaction = new Map<string, { pers: number; count: number }>();
    for (const f of gs.formations) {
      if (f.kind === 'army_hq') continue; // skip army HQs from brigade counts
      if (pf && f.faction !== pf) continue;
      const rec = byFaction.get(f.faction) ?? { pers: 0, count: 0 };
      rec.pers += f.personnel ?? 0;
      rec.count += 1;
      byFaction.set(f.faction, rec);
    }

    // Build brigade→faction lookup for orders
    const brigadeToFaction = new Map<string, string>();
    for (const f of gs.formations) {
      brigadeToFaction.set(f.id, f.faction);
    }

    // Per-faction attack/movement order counts (player faction only)
    const attacksByFaction = new Map<string, number>();
    for (const o of gs.attackOrders) {
      const faction = brigadeToFaction.get(o.brigadeId) ?? 'unknown';
      if (pf && faction !== pf) continue;
      attacksByFaction.set(faction, (attacksByFaction.get(faction) ?? 0) + 1);
    }
    const movesByFaction = new Map<string, number>();
    for (const o of gs.movementOrders) {
      const faction = brigadeToFaction.get(o.brigadeId) ?? 'unknown';
      if (pf && faction !== pf) continue;
      movesByFaction.set(faction, (movesByFaction.get(faction) ?? 0) + 1);
    }

    // Control changes this turn (visible to all — map shows control colors)
    const thisTurnEvents = gs.recentControlEvents.filter(e => e.turn === gs.turn);
    const gainedByFaction = new Map<string, number>();
    const lostByFaction = new Map<string, number>();
    for (const e of thisTurnEvents) {
      if (e.to) gainedByFaction.set(e.to, (gainedByFaction.get(e.to) ?? 0) + 1);
      if (e.from) lostByFaction.set(e.from, (lostByFaction.get(e.from) ?? 0) + 1);
    }

    let html = `<div class="tm-panel-section"><div class="tm-panel-section-header">WAR SUMMARY — TURN ${gs.turn}</div>`;

    // Per-faction force summary (player faction only)
    for (const faction of visibleFactions) {
      const rec = byFaction.get(faction) ?? { pers: 0, count: 0 };
      const attacks = attacksByFaction.get(faction) ?? 0;
      const moves = movesByFaction.get(faction) ?? 0;
      const gained = gainedByFaction.get(faction) ?? 0;
      const lost = lostByFaction.get(faction) ?? 0;
      const fLabel = this.escapeHtml(SIDE_LABELS[faction] ?? faction);
      html += `<div style="margin:6px 0 2px 0;font-size:11px;font-weight:600;color:${SIDE_SOLID_COLORS[faction] ?? '#888'}">${fLabel}</div>`;
      html += `<div class="tm-panel-field"><span class="tm-panel-field-label">Formations</span><span class="tm-panel-field-value">${rec.count} | ${rec.pers.toLocaleString()} pers</span></div>`;
      if (attacks > 0 || moves > 0) {
        html += `<div class="tm-panel-field"><span class="tm-panel-field-label">Orders</span><span class="tm-panel-field-value">${attacks} attack · ${moves} move</span></div>`;
      }
      if (gained > 0 || lost > 0) {
        html += `<div class="tm-panel-field"><span class="tm-panel-field-label">Control</span><span class="tm-panel-field-value"><span style="color:#81c784">+${gained}</span> / <span style="color:#ef9a9a">−${lost}</span></span></div>`;
      }
    }
    html += `</div>`;

    // Battles this turn
    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">BATTLES THIS TURN (${thisTurnEvents.length})</div>`;
    if (thisTurnEvents.length === 0) {
      html += `<div class="tm-panel-placeholder">No control changes this turn.</div>`;
    } else {
      const maxShow = 30;
      const eventsToShow = thisTurnEvents.slice(0, maxShow);
      for (const e of eventsToShow) {
        const fromLabel = e.from ? (SIDE_LABELS[e.from] ?? e.from) : '—';
        const toLabel = e.to ? (SIDE_LABELS[e.to] ?? e.to) : '—';
        const fromColor = e.from ? (SIDE_SOLID_COLORS[e.from] ?? '#888') : '#888';
        const toColor = e.to ? (SIDE_SOLID_COLORS[e.to] ?? '#888') : '#888';
        html += `<div style="font-size:10px;margin:2px 0;color:#b0bec5">
          <span style="opacity:0.7">${this.escapeHtml(e.settlementId)}</span>
          <span style="color:${fromColor}">${this.escapeHtml(fromLabel)}</span> →
          <span style="color:${toColor}">${this.escapeHtml(toLabel)}</span>
          <span style="opacity:0.5">(${this.escapeHtml(e.mechanism)})</span>
        </div>`;
      }
      if (thisTurnEvents.length > maxShow) {
        html += `<div class="tm-panel-placeholder">...and ${thisTurnEvents.length - maxShow} more</div>`;
      }
    }
    html += `</div>`;

    // Total control events
    html += `<div class="tm-panel-section"><div class="tm-panel-section-header">ALL CONTROL EVENTS</div>
      <div class="tm-panel-field"><span class="tm-panel-field-label">Total recorded</span><span class="tm-panel-field-value">${gs.recentControlEvents.length}</span></div>
    </div>`;

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

  private getPersistedCampaignScenarioKey(): 'sep_1991' | 'apr_1992' {
    try {
      const raw = localStorage.getItem(MapApp.CAMPAIGN_SCENARIO_STORAGE_KEY);
      if (raw === 'sep_1991' || raw === 'apr_1992') return raw;
    } catch {
      // localStorage can fail in hardened/private contexts; fallback to default.
    }
    return 'apr_1992';
  }

  private persistCampaignScenarioKey(scenarioKey: 'sep_1991' | 'apr_1992'): void {
    try {
      localStorage.setItem(MapApp.CAMPAIGN_SCENARIO_STORAGE_KEY, scenarioKey);
    } catch {
      // Ignore persistence failure; selection still works for this session.
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
