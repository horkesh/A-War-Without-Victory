/**
 * Staff Map Renderer — procedural paper-map overlay for detail viewing.
 * Renders a user-defined region of the tactical map as a parchment-style military map
 * with terrain hatching, settlements, roads, rivers, front lines, and enhanced formation counters.
 *
 * Three-tier offscreen caching:
 *   1. Parchment cache — recomputed on resize only
 *   2. Terrain + geography cache — recomputed on region/control change
 *   3. Dynamic layer — rendered every frame (formations, labels, front lines, decorations)
 */

import { FORMATION_KIND_SHAPES, detHash, formatTurnDate } from '../constants.js';
import { MapProjection } from '../geo/MapProjection.js';
import { MapState } from '../state/MapState.js';
import type {
    BBox,
    FormationView,
    LoadedData,
    PolygonCoords,
    Position,
    SettlementFeature,
    SharedBorderSegment,
    StaffMapRegion,
    ViewTransform,
} from '../types.js';
import {
    CONTESTED,
    COUNTER, DECORATIONS,
    FONTS, FONT_SIZES,
    FRONT_LINES,
    INK,
    PARCHMENT,
    RIVERS,
    ROADS,
    SELECTION,
    TERRAIN,
    paperFactionBorder,
    paperFactionFill,
    paperFactionRgb,
    paperFactionText,
} from './StaffMapTheme.js';

// Vite asset URL imports for faction crest PNGs
import crestArbihUrl from '../../warroom/assets/crest_ARBiH.png?url';
import crestHvoUrl from '../../warroom/assets/crest_HVO.png?url';
import crestVrsUrl from '../../warroom/assets/crest_VRS.png?url';

export class StaffMapRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private state: MapState;
    private data: LoadedData;

    // Region-scoped projection
    private regionProjection: MapProjection | null = null;
    private regionTransform: ViewTransform | null = null;
    private regionSidSet: Set<string> | null = null;

    // Caches
    private parchmentCache: HTMLCanvasElement | null = null;
    private parchmentCacheSize = { w: 0, h: 0 };
    private terrainCache: HTMLCanvasElement | null = null;
    private terrainCacheKey = '';

    // Active control lookup (may come from game state)
    private activeControlLookup: Record<string, string | null> = {};

    // Cached formation positions (including stack offsets), rebuilt each frame
    private formationPositions: Map<string, { cx: number; cy: number }> = new Map();

    // Enhancement 11: Faction crest images
    private crestImages: Map<string, HTMLImageElement> = new Map();
    private crestsLoaded = false;

    // Hillshade terrain underlay
    private hillshadeImage: HTMLImageElement | null = null;
    private hillshadeReady = false;

    constructor(
        canvas: HTMLCanvasElement,
        state: MapState,
        data: LoadedData,
    ) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.state = state;
        this.data = data;
        this.loadHillshade();
    }

    private loadHillshade(): void {
        const img = new Image();
        img.onload = () => {
            this.hillshadeReady = true;
            this.terrainCache = null; // force terrain cache rebuild with hillshade included
        };
        img.onerror = () => { this.hillshadeReady = false; };
        img.src = '/data/derived/terrain/hillshade_bg.png';
        this.hillshadeImage = img;
    }

    /** Update control lookup when game state changes. */
    setControlLookup(lookup: Record<string, string | null>): void {
        this.activeControlLookup = lookup;
        this.terrainCache = null; // Invalidate — control colors change
    }

    /** Resize the overlay canvas to match parent. */
    resize(): void {
        const wrap = this.canvas.parentElement;
        if (!wrap) return;
        const dpr = window.devicePixelRatio || 1;
        const w = Math.floor(wrap.clientWidth * dpr);
        const h = Math.floor(wrap.clientHeight * dpr);
        this.canvas.width = w;
        this.canvas.height = h;
        this.canvas.style.width = `${wrap.clientWidth}px`;
        this.canvas.style.height = `${wrap.clientHeight}px`;
        this.parchmentCache = null;
        this.terrainCache = null;
    }

    // ─── Region Setup ───────────────────────────────────

    private setupRegionProjection(region: StaffMapRegion): void {
        // Expand bbox slightly for padding
        const pad = Math.max(
            (region.bbox.maxX - region.bbox.minX) * 0.08,
            (region.bbox.maxY - region.bbox.minY) * 0.08,
        );
        const paddedBbox: BBox = {
            minX: region.bbox.minX - pad,
            minY: region.bbox.minY - pad,
            maxX: region.bbox.maxX + pad,
            maxY: region.bbox.maxY + pad,
        };
        this.regionProjection = new MapProjection(paddedBbox);
        this.regionTransform = this.regionProjection.computeTransform(
            this.canvas.width, this.canvas.height, 1, { x: 0.5, y: 0.5 }, 60,
        );
        this.regionSidSet = new Set(region.regionSids);
    }

    private project(x: number, y: number): [number, number] {
        if (!this.regionProjection || !this.regionTransform) return [0, 0];
        return this.regionProjection.project(x, y, this.regionTransform);
    }

    // ─── Crest Loading (Enhancement 11) ──────────────────

    private loadCrests(): void {
        if (this.crestsLoaded || this.crestImages.size > 0) return;

        const entries: [string, string][] = [
            ['ARBiH', crestArbihUrl],
            ['VRS', crestVrsUrl],
            ['HVO', crestHvoUrl],
        ];

        let loadedCount = 0;
        for (const [label, url] of entries) {
            const img = new Image();
            this.crestImages.set(label, img);
            img.onload = () => {
                loadedCount++;
                if (loadedCount === entries.length) {
                    this.crestsLoaded = true;
                    // Trigger re-render
                    this.render();
                }
            };
            img.onerror = () => {
                loadedCount++;
                if (loadedCount === entries.length) {
                    this.crestsLoaded = true;
                }
            };
            img.src = url;
        }
    }

    // ─── Main Render ────────────────────────────────────

    render(): void {
        const region = this.state.snapshot.staffMapRegion;
        if (!region) return;

        // Lazy-load crests on first render
        this.loadCrests();

        this.setupRegionProjection(region);
        const { ctx } = this;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Pass 1: Parchment background (cached)
        this.ensureParchmentCache(w, h);
        if (this.parchmentCache) {
            ctx.drawImage(this.parchmentCache, 0, 0);
        }

        // Pass 2: Terrain + geography (cached)
        this.ensureTerrainCache(region, w, h);
        if (this.terrainCache) {
            ctx.drawImage(this.terrainCache, 0, 0);
        }

        // Pass 3-N: Dynamic layers (every frame)
        this.drawFrontLines(region);
        this.drawContestedOverlay();
        this.drawFormations(region);
        this.drawLabels(region);
        this.drawRiverLabels();
        this.drawDecorations(region);
        this.drawFactionCrests();
        this.drawVignette(w, h);
        this.drawExitButton();
    }

    // ─── Pass 1: Parchment Background ──────────────────

    private ensureParchmentCache(w: number, h: number): void {
        if (this.parchmentCache && this.parchmentCacheSize.w === w && this.parchmentCacheSize.h === h) return;

        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const c = off.getContext('2d')!;

        // Base fill
        c.fillStyle = PARCHMENT.base;
        c.fillRect(0, 0, w, h);

        // Procedural grain — deterministic pixel noise at low resolution
        // Apply at 1/4 resolution and scale up for performance
        const grainScale = 4;
        const gw = Math.ceil(w / grainScale);
        const gh = Math.ceil(h / grainScale);
        const grainCanvas = document.createElement('canvas');
        grainCanvas.width = gw;
        grainCanvas.height = gh;
        const gc = grainCanvas.getContext('2d')!;
        const imgData = gc.createImageData(gw, gh);
        const pixels = imgData.data;
        // Base color components
        const baseR = 244, baseG = 232, baseB = 200;
        for (let y = 0; y < gh; y++) {
            for (let x = 0; x < gw; x++) {
                const noise = detHash(x, y, 42) * 0.06 - 0.03; // +/- 3%
                const idx = (y * gw + x) * 4;
                pixels[idx] = Math.max(0, Math.min(255, Math.round(baseR * (1 + noise))));
                pixels[idx + 1] = Math.max(0, Math.min(255, Math.round(baseG * (1 + noise))));
                pixels[idx + 2] = Math.max(0, Math.min(255, Math.round(baseB * (1 + noise))));
                pixels[idx + 3] = 255;
            }
        }
        gc.putImageData(imgData, 0, 0);
        c.imageSmoothingEnabled = true;
        c.drawImage(grainCanvas, 0, 0, w, h);

        // Aging spots — deterministic semi-transparent ellipses
        for (let i = 0; i < 5; i++) {
            const cx = detHash(i, 0, 77) * w;
            const cy = detHash(i, 1, 77) * h;
            const rx = 40 + detHash(i, 2, 77) * 100;
            const ry = 30 + detHash(i, 3, 77) * 80;
            c.save();
            c.globalAlpha = 0.04 + detHash(i, 4, 77) * 0.04;
            c.fillStyle = PARCHMENT.stain;
            c.beginPath();
            c.ellipse(cx, cy, rx, ry, detHash(i, 5, 77) * Math.PI, 0, Math.PI * 2);
            c.fill();
            c.restore();
        }

        // Enhancement 6: Fold creases
        // 3 creases: 2 roughly horizontal, 1 roughly vertical
        const creases: Array<{ horizontal: boolean; idx: number }> = [
            { horizontal: true, idx: 0 },
            { horizontal: true, idx: 1 },
            { horizontal: false, idx: 2 },
        ];
        for (const crease of creases) {
            const { horizontal, idx } = crease;
            const numSegments = 40;

            if (horizontal) {
                // Horizontal crease at roughly 1/3 and 2/3 of height
                const baseY = h * (idx === 0 ? 0.33 : 0.66);

                // Shadow line
                c.save();
                c.strokeStyle = PARCHMENT.creaseShadow;
                c.lineWidth = 1.5;
                c.beginPath();
                for (let s = 0; s <= numSegments; s++) {
                    const sx = (s / numSegments) * w;
                    const waviness = (detHash(s, idx, 150) - 0.5) * 4;
                    const sy = baseY + waviness;
                    if (s === 0) c.moveTo(sx, sy);
                    else c.lineTo(sx, sy);
                }
                c.stroke();
                c.restore();

                // Highlight line (offset 1px below)
                c.save();
                c.strokeStyle = PARCHMENT.creaseHighlight;
                c.lineWidth = 1.0;
                c.beginPath();
                for (let s = 0; s <= numSegments; s++) {
                    const sx = (s / numSegments) * w;
                    const waviness = (detHash(s, idx, 150) - 0.5) * 4;
                    const sy = baseY + waviness + 1;
                    if (s === 0) c.moveTo(sx, sy);
                    else c.lineTo(sx, sy);
                }
                c.stroke();
                c.restore();
            } else {
                // Vertical crease at roughly 1/2 of width
                const baseX = w * 0.5;

                // Shadow line
                c.save();
                c.strokeStyle = PARCHMENT.creaseShadow;
                c.lineWidth = 1.5;
                c.beginPath();
                for (let s = 0; s <= numSegments; s++) {
                    const sy = (s / numSegments) * h;
                    const waviness = (detHash(s, idx, 150) - 0.5) * 4;
                    const sx = baseX + waviness;
                    if (s === 0) c.moveTo(sx, sy);
                    else c.lineTo(sx, sy);
                }
                c.stroke();
                c.restore();

                // Highlight line (offset 1px right)
                c.save();
                c.strokeStyle = PARCHMENT.creaseHighlight;
                c.lineWidth = 1.0;
                c.beginPath();
                for (let s = 0; s <= numSegments; s++) {
                    const sy = (s / numSegments) * h;
                    const waviness = (detHash(s, idx, 150) - 0.5) * 4;
                    const sx = baseX + waviness + 1;
                    if (s === 0) c.moveTo(sx, sy);
                    else c.lineTo(sx, sy);
                }
                c.stroke();
                c.restore();
            }
        }

        // Enhancement 8: Coffee stain ring
        const coffeeX = (0.3 + 0.4 * detHash(0, 3, 123)) * w * detHash(0, 0, 123) + w * 0.1;
        const coffeeY = (0.3 + 0.4 * detHash(0, 4, 123)) * h * detHash(0, 1, 123) + h * 0.1;
        const coffeeR = 60 + detHash(0, 2, 123) * 30;
        const coffeeGrad = c.createRadialGradient(coffeeX, coffeeY, 0, coffeeX, coffeeY, coffeeR);
        coffeeGrad.addColorStop(0, 'rgba(120, 80, 30, 0)');
        coffeeGrad.addColorStop(0.7, 'rgba(120, 80, 30, 0)');
        coffeeGrad.addColorStop(0.78, 'rgba(120, 80, 30, 0.07)');
        coffeeGrad.addColorStop(0.85, 'rgba(120, 80, 30, 0.05)');
        coffeeGrad.addColorStop(1.0, 'rgba(120, 80, 30, 0)');
        c.save();
        c.fillStyle = coffeeGrad;
        c.beginPath();
        c.arc(coffeeX, coffeeY, coffeeR, 0, Math.PI * 2);
        c.fill();
        c.restore();

        this.parchmentCache = off;
        this.parchmentCacheSize = { w, h };
    }

    // ─── Pass 2: Terrain + Geography Cache ─────────────

    private ensureTerrainCache(region: StaffMapRegion, w: number, h: number): void {
        const key = `${w}:${h}:${region.regionSids.join(',')}:${JSON.stringify(region.bbox)}`;
        if (this.terrainCache && this.terrainCacheKey === key) return;

        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const c = off.getContext('2d')!;

        // Hillshade terrain underlay — drawn first, under all other terrain layers
        this.drawHillshadeOnContext(c, w, h);

        // Terrain hatching + elevation tinting per settlement
        this.drawTerrainOnContext(c, region);

        // Settlement outlines + faction tint
        this.drawSettlementOutlinesOnContext(c, region);

        // Roads
        this.drawRoadsOnContext(c);

        // Rivers
        this.drawRiversOnContext(c);

        // Enhancement 4: Contour lines from elevation data
        this.drawContourLinesOnContext(c);

        this.terrainCache = off;
        this.terrainCacheKey = key;
    }

    /**
     * Draw hillshade PNG into the terrain cache offscreen canvas.
     * On parchment (light bg) multiply blend darkens shadows into the cream
     * while leaving lit ridges bright — correct behaviour for light backgrounds.
     * Opacity 0.22 keeps it subtle so parchment texture remains dominant.
     */
    private drawHillshadeOnContext(c: CanvasRenderingContext2D, w: number, h: number): void {
        if (!this.hillshadeReady || !this.hillshadeImage || !this.regionTransform) return;

        // DEM bbox in WGS84 (from dem_snapshot_audit_h6_2.txt)
        const DEM_MIN_LON = 15.62429991660789;
        const DEM_MIN_LAT = 42.45719021065977;
        const DEM_MAX_LON = 19.722780229024387;
        const DEM_MAX_LAT = 45.37054183713614;

        const [x0, y1] = this.project(DEM_MIN_LON, DEM_MIN_LAT);
        const [x1, y0] = this.project(DEM_MAX_LON, DEM_MAX_LAT);

        const drawW = x1 - x0;
        const drawH = y1 - y0;

        if (x1 < 0 || x0 > w || y1 < 0 || y0 > h) return;

        c.save();
        c.globalAlpha = 0.22;
        c.globalCompositeOperation = 'multiply'; // correct for light parchment background
        c.drawImage(this.hillshadeImage, x0, y0, drawW, drawH);
        c.restore();
    }

    private drawTerrainOnContext(c: CanvasRenderingContext2D, region: StaffMapRegion): void {
        if (!this.regionTransform) return;

        for (const sid of region.regionSids) {
            const feature = this.data.settlements.get(sid);
            if (!feature) continue;
            const terrain = this.data.terrainScalars[sid];

            // Elevation tinting
            if (terrain) {
                const elev = terrain.elevation_mean_m;
                let tintColor: string = TERRAIN.elevationTints[0].color;
                for (const t of TERRAIN.elevationTints) {
                    if (elev <= t.max) { tintColor = t.color; break; }
                }
                c.save();
                this.clipToSettlement(c, feature);
                c.fillStyle = tintColor;
                c.fill();
                c.restore();
            }

            // River crossing wash
            if (terrain && terrain.river_crossing_penalty > TERRAIN.riverWashThreshold) {
                c.save();
                this.clipToSettlement(c, feature);
                c.fillStyle = TERRAIN.riverWashColor;
                c.fill();
                c.restore();
            }

            // Terrain hatching
            if (terrain && terrain.terrain_friction_index >= TERRAIN.hatchSpacing.none) {
                const friction = terrain.terrain_friction_index;
                let spacingPx: number;
                if (friction < 0.40) spacingPx = TERRAIN.hatchSpacing.sparse;
                else if (friction < 0.70) spacingPx = TERRAIN.hatchSpacing.medium;
                else spacingPx = TERRAIN.hatchSpacing.dense;

                const angle = (terrain.slope_index ?? 0) * 45 * (Math.PI / 180);

                c.save();
                this.clipToSettlement(c, feature);

                // Compute bounding box of the projected settlement polygon
                const bbox = this.getProjectedBBox(feature);
                const diag = Math.sqrt((bbox.maxX - bbox.minX) ** 2 + (bbox.maxY - bbox.minY) ** 2);
                const cx = (bbox.minX + bbox.maxX) / 2;
                const cy = (bbox.minY + bbox.maxY) / 2;

                c.strokeStyle = TERRAIN.hatchColor;
                c.lineWidth = TERRAIN.hatchWidth;
                c.beginPath();

                const numLines = Math.ceil(diag / spacingPx);
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);

                for (let i = -numLines; i <= numLines; i++) {
                    const offset = i * spacingPx;
                    const perpX = -sinA * offset;
                    const perpY = cosA * offset;
                    const x0 = cx + perpX - cosA * diag;
                    const y0 = cy + perpY - sinA * diag;
                    const x1 = cx + perpX + cosA * diag;
                    const y1 = cy + perpY + sinA * diag;
                    c.moveTo(x0, y0);
                    c.lineTo(x1, y1);
                }
                c.stroke();
                c.restore();
            }
        }
    }

    private drawSettlementOutlinesOnContext(c: CanvasRenderingContext2D, region: StaffMapRegion): void {
        for (const sid of region.regionSids) {
            const feature = this.data.settlements.get(sid);
            if (!feature) continue;

            // Faction tint
            const controller = this.activeControlLookup[sid] ?? this.data.controlLookup[sid] ?? null;
            c.save();
            this.traceSettlementPath(c, feature);
            c.fillStyle = paperFactionFill(controller, 0.12);
            c.fill();
            c.restore();

            // Settlement outlines removed per user request
        }
    }

    private drawRoadsOnContext(c: CanvasRenderingContext2D): void {
        if (!this.regionTransform) return;

        // MSR roads
        c.save();
        c.globalAlpha = ROADS.msrAlpha;
        c.strokeStyle = ROADS.msrColor;
        c.lineWidth = ROADS.msrWidth;
        for (const feat of this.data.baseFeatures.roadsMSR) {
            this.drawLineFeature(c, feat.geometry);
        }
        c.restore();

        // Secondary roads
        c.save();
        c.globalAlpha = ROADS.secondaryAlpha;
        c.strokeStyle = ROADS.secondaryColor;
        c.lineWidth = ROADS.secondaryWidth;
        for (const feat of this.data.baseFeatures.roadsSecondary) {
            this.drawLineFeature(c, feat.geometry);
        }
        c.restore();
    }

    private drawRiversOnContext(c: CanvasRenderingContext2D): void {
        if (!this.regionTransform) return;

        // Bleed effect (wider, very transparent)
        c.save();
        c.globalAlpha = RIVERS.bleedAlpha;
        c.strokeStyle = RIVERS.bleedColor;
        c.lineWidth = RIVERS.bleedWidth;
        for (const feat of this.data.baseFeatures.rivers) {
            this.drawLineFeature(c, feat.geometry);
        }
        c.restore();

        // Main river line
        c.save();
        c.strokeStyle = RIVERS.color;
        c.lineWidth = RIVERS.width;
        for (const feat of this.data.baseFeatures.rivers) {
            this.drawLineFeature(c, feat.geometry);
        }
        c.restore();
    }

    // ─── Enhancement 4: Contour Lines ──────────────────

    private drawContourLinesOnContext(c: CanvasRenderingContext2D): void {
        if (!this.regionTransform) return;

        const thresholds = TERRAIN.contourThresholds;
        const colors = TERRAIN.contourColors;

        for (const seg of this.data.sharedBorders) {
            const terrainA = this.data.terrainScalars[seg.a];
            const terrainB = this.data.terrainScalars[seg.b];
            if (!terrainA || !terrainB) continue;

            const elevA = terrainA.elevation_mean_m;
            const elevB = terrainB.elevation_mean_m;

            for (let ti = 0; ti < thresholds.length; ti++) {
                const threshold = thresholds[ti];
                // Check if settlements straddle this threshold (one above, one below)
                if ((elevA >= threshold && elevB < threshold) || (elevA < threshold && elevB >= threshold)) {
                    c.save();
                    c.strokeStyle = colors[ti] ?? colors[colors.length - 1];
                    c.lineWidth = TERRAIN.contourWidth;
                    c.setLineDash(TERRAIN.contourDash as number[]);
                    c.beginPath();
                    for (let i = 0; i < seg.points.length; i++) {
                        const [px, py] = this.project(seg.points[i][0], seg.points[i][1]);
                        if (i === 0) c.moveTo(px, py);
                        else c.lineTo(px, py);
                    }
                    c.stroke();
                    c.setLineDash([]);
                    c.restore();
                }
            }
        }
    }

    // ─── Pass 3: Front Lines (Enhancement 2: Barbed Wire) ───

    private drawFrontLines(region: StaffMapRegion): void {
        const { ctx } = this;
        if (!this.regionSidSet) return;

        const gs = this.state.snapshot.loadedGameState;
        const controlLookup = gs?.controlBySettlement ?? this.activeControlLookup;

        // Filter shared borders to only those involving region settlements with different controllers
        const segments: SharedBorderSegment[] = [];
        for (const seg of this.data.sharedBorders) {
            if (!this.regionSidSet.has(seg.a) && !this.regionSidSet.has(seg.b)) continue;
            const ca = controlLookup[seg.a] ?? null;
            const cb = controlLookup[seg.b] ?? null;
            if (ca && cb && ca !== cb) {
                // Check RBiH-HRHB alliance exception
                if (gs) {
                    const pair = [ca, cb].sort().join('-');
                    if (pair === 'HRHB-RBiH') {
                        const earliest = gs.rbih_hrhb_war_earliest_turn ?? Infinity;
                        const alliance = gs.phase_i_alliance_rbih_hrhb ?? 1;
                        if (gs.turn < earliest || alliance > 0.2) continue;
                    }
                }
                segments.push(seg);
            }
        }

        if (segments.length === 0) return;

        // Helper: draw Bezier-curved front line for a segment
        const drawCurvedSegment = (c: CanvasRenderingContext2D, seg: SharedBorderSegment) => {
            c.beginPath();
            if (seg.points.length === 0) return;
            const [sx, sy] = this.project(seg.points[0][0], seg.points[0][1]);
            c.moveTo(sx, sy);
            for (let i = 1; i < seg.points.length; i++) {
                const [px, py] = this.project(seg.points[i][0], seg.points[i][1]);
                const [prevX, prevY] = this.project(seg.points[i - 1][0], seg.points[i - 1][1]);
                // Compute perpendicular offset for control point
                const dx = px - prevX;
                const dy = py - prevY;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const perpX = -dy / len;
                const perpY = dx / len;
                const hashVal = detHash(i, seg.a.charCodeAt(0) + seg.b.charCodeAt(0), 101);
                const offset = (hashVal - 0.5) * 2 * FRONT_LINES.curveOffset;
                const cpx = (prevX + px) / 2 + perpX * offset;
                const cpy = (prevY + py) / 2 + perpY * offset;
                c.quadraticCurveTo(cpx, cpy, px, py);
            }
        };

        // Glow pass
        ctx.save();
        ctx.strokeStyle = FRONT_LINES.glowColor;
        ctx.lineWidth = FRONT_LINES.glowWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const seg of segments) {
            drawCurvedSegment(ctx, seg);
            ctx.stroke();
        }
        ctx.restore();

        // Main line pass
        ctx.save();
        ctx.strokeStyle = FRONT_LINES.color;
        ctx.lineWidth = FRONT_LINES.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const seg of segments) {
            drawCurvedSegment(ctx, seg);
            ctx.stroke();
        }
        ctx.restore();

        // Barb pass: draw small barbed-wire ticks along each segment
        ctx.save();
        ctx.strokeStyle = FRONT_LINES.color;
        ctx.lineWidth = FRONT_LINES.barbWidth;
        ctx.lineCap = 'round';
        for (const seg of segments) {
            for (let i = 1; i < seg.points.length; i++) {
                const [x0, y0] = this.project(seg.points[i - 1][0], seg.points[i - 1][1]);
                const [x1, y1] = this.project(seg.points[i][0], seg.points[i][1]);
                const segDx = x1 - x0;
                const segDy = y1 - y0;
                const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
                if (segLen < FRONT_LINES.barbSpacing * 0.5) continue;

                const numBarbs = Math.floor(segLen / FRONT_LINES.barbSpacing);
                const ux = segDx / segLen;  // unit along segment
                const uy = segDy / segLen;
                const perpX = -uy;  // perpendicular
                const perpY = ux;

                for (let b = 1; b <= numBarbs; b++) {
                    const t = b / (numBarbs + 1);
                    const bx = x0 + segDx * t;
                    const by = y0 + segDy * t;
                    // Alternate sides using deterministic hash
                    const side = detHash(i, b, 202) > 0.5 ? 1 : -1;
                    const barbLen = FRONT_LINES.barbLength;
                    ctx.beginPath();
                    ctx.moveTo(bx, by);
                    ctx.lineTo(bx + perpX * barbLen * side, by + perpY * barbLen * side);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    // ─── Enhancement 7: Contested Zone Overlay ─────────

    private drawContestedOverlay(): void {
        const { ctx } = this;
        if (!this.regionSidSet) return;

        const gs = this.state.snapshot.loadedGameState;
        const controlLookup = gs?.controlBySettlement ?? this.activeControlLookup;

        // Build map of settlement → set of distinct neighboring factions (excluding own controller)
        const neighborFactions = new Map<string, Set<string>>();
        for (const seg of this.data.sharedBorders) {
            const ca = controlLookup[seg.a] ?? null;
            const cb = controlLookup[seg.b] ?? null;

            // For settlement A: if B has a different controller, add B's faction
            if (this.regionSidSet.has(seg.a) && cb && ca !== cb) {
                let set = neighborFactions.get(seg.a);
                if (!set) { set = new Set(); neighborFactions.set(seg.a, set); }
                set.add(cb);
            }
            // For settlement B: if A has a different controller, add A's faction
            if (this.regionSidSet.has(seg.b) && ca && ca !== cb) {
                let set = neighborFactions.get(seg.b);
                if (!set) { set = new Set(); neighborFactions.set(seg.b, set); }
                set.add(ca);
            }
        }

        // Draw crosshatch on settlements with enough cross-faction neighbors
        for (const [sid, factions] of neighborFactions) {
            if (factions.size < CONTESTED.minCrossFactionNeighbors) continue;
            const feature = this.data.settlements.get(sid);
            if (!feature) continue;

            ctx.save();
            this.clipToSettlement(ctx, feature);

            // Draw 45-degree diagonal hatch lines
            const bbox = this.getProjectedBBox(feature);
            const diag = Math.sqrt((bbox.maxX - bbox.minX) ** 2 + (bbox.maxY - bbox.minY) ** 2);
            const centerX = (bbox.minX + bbox.maxX) / 2;
            const centerY = (bbox.minY + bbox.maxY) / 2;

            ctx.strokeStyle = CONTESTED.hatchColor;
            ctx.lineWidth = CONTESTED.hatchWidth;
            ctx.beginPath();

            const angle = Math.PI / 4; // 45 degrees
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const numLines = Math.ceil(diag / CONTESTED.hatchSpacing);

            for (let i = -numLines; i <= numLines; i++) {
                const offset = i * CONTESTED.hatchSpacing;
                const perpX = -sinA * offset;
                const perpY = cosA * offset;
                const x0 = centerX + perpX - cosA * diag;
                const y0 = centerY + perpY - sinA * diag;
                const x1 = centerX + perpX + cosA * diag;
                const y1 = centerY + perpY + sinA * diag;
                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    // ─── Pass 4: Formations ─────────────────────────────

    private drawFormations(region: StaffMapRegion): void {
        const gs = this.state.snapshot.loadedGameState;
        if (!gs || !this.regionSidSet) return;

        const { ctx } = this;
        const selectedId = this.state.snapshot.selectedFormationId;

        // Collect formations that are positioned within the region
        const regionFormations: Array<{ f: FormationView; cx: number; cy: number }> = [];
        for (const f of gs.formations) {
            const hq = f.hq_sid;
            if (!hq) continue;
            const centroid = this.data.settlementCentroids.get(hq);
            if (!centroid) continue;
            // Check if HQ is in region
            if (!this.regionSidSet.has(hq)) continue;
            const [cx, cy] = this.project(centroid[0], centroid[1]);
            regionFormations.push({ f, cx, cy });
        }

        // Sort by ID for determinism
        regionFormations.sort((a, b) => a.f.id < b.f.id ? -1 : 1);

        // Stack co-located formations by HQ settlement
        const groups = new Map<string, typeof regionFormations>();
        for (const item of regionFormations) {
            const key = item.f.hq_sid!;
            const group = groups.get(key) ?? [];
            group.push(item);
            groups.set(key, group);
        }

        // Phase 1: Assign initial stacked positions within each HQ group
        const placed: Array<{ f: FormationView; cx: number; cy: number }> = [];
        for (const group of groups.values()) {
            const count = group.length;
            for (let i = 0; i < count; i++) {
                const { f, cx, cy } = group[i];
                const stackOffset = (i - (count - 1) / 2) * (COUNTER.height + 4);
                placed.push({ f, cx, cy: cy + stackOffset });
            }
        }

        // Phase 2: Greedy collision resolution across all formations
        // Nudge overlapping counters apart (up to 5 passes)
        const cw = COUNTER.width + 4;
        const ch = COUNTER.height + 4;
        for (let pass = 0; pass < 5; pass++) {
            let anyMoved = false;
            for (let i = 0; i < placed.length; i++) {
                for (let j = i + 1; j < placed.length; j++) {
                    const a = placed[i];
                    const b = placed[j];
                    const overlapX = cw - Math.abs(a.cx - b.cx);
                    const overlapY = ch - Math.abs(a.cy - b.cy);
                    if (overlapX > 0 && overlapY > 0) {
                        // Push apart along the axis with less overlap
                        if (overlapY <= overlapX) {
                            const nudge = overlapY / 2 + 1;
                            if (a.cy <= b.cy) { a.cy -= nudge; b.cy += nudge; }
                            else { a.cy += nudge; b.cy -= nudge; }
                        } else {
                            const nudge = overlapX / 2 + 1;
                            if (a.cx <= b.cx) { a.cx -= nudge; b.cx += nudge; }
                            else { a.cx += nudge; b.cx -= nudge; }
                        }
                        anyMoved = true;
                    }
                }
            }
            if (!anyMoved) break;
        }

        // Phase 3: Draw leader lines from counter to HQ centroid (behind counters)
        this.formationPositions.clear();
        ctx.save();
        ctx.strokeStyle = INK.light;
        ctx.lineWidth = 0.7;
        ctx.setLineDash([3, 3]);
        for (const { f, cx, cy } of placed) {
            this.formationPositions.set(f.id, { cx, cy });
            const hq = f.hq_sid;
            if (!hq) continue;
            const centroid = this.data.settlementCentroids.get(hq);
            if (!centroid) continue;
            const [hcx, hcy] = this.project(centroid[0], centroid[1]);
            // Only draw if counter was nudged away from its origin
            const dist = Math.abs(cx - hcx) + Math.abs(cy - hcy);
            if (dist > 8) {
                ctx.beginPath();
                ctx.moveTo(hcx, hcy);
                ctx.lineTo(cx, cy);
                ctx.stroke();
            }
        }
        ctx.restore();

        // Phase 4: Draw counters at resolved positions
        // When a formation is selected, dim non-selected ones so the selected stands out
        for (const { f, cx, cy } of placed) {
            const dimmed = selectedId && f.id !== selectedId;
            if (dimmed) ctx.globalAlpha = 0.25;
            this.drawFormationCounter(ctx, f, cx, cy, f.id === selectedId);
            if (dimmed) ctx.globalAlpha = 1.0;
        }

        // Draw AoR fill for selected formation (Enhancement 3)
        if (selectedId) {
            const aor = gs.brigadeAorByFormationId[selectedId];
            if (aor) {
                const selectedFormation = gs.formations.find(f => f.id === selectedId);
                this.drawAoRFill(aor, selectedFormation?.faction ?? null);
            }
        }
    }

    // ─── Enhancement 1: Formation Counter with Faction Stripe ───

    private drawFormationCounter(
        ctx: CanvasRenderingContext2D,
        f: FormationView,
        cx: number, cy: number,
        isSelected: boolean,
    ): void {
        const w = COUNTER.width;
        const h = COUNTER.height;
        const x = cx - w / 2;
        const y = cy - h / 2;

        // Background + stroke
        ctx.save();
        ctx.fillStyle = COUNTER.bgColor;
        ctx.strokeStyle = paperFactionBorder(f.faction);
        ctx.lineWidth = isSelected ? COUNTER.borderWidth + 1 : COUNTER.borderWidth;
        this.roundRect(ctx, x, y, w, h, COUNTER.cornerRadius);
        ctx.fill();
        ctx.stroke();

        // Enhancement 1: Faction-colored sidebar stripe
        ctx.save();
        // Clip to the same rounded rect path
        this.roundRect(ctx, x, y, w, h, COUNTER.cornerRadius);
        ctx.clip();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = paperFactionBorder(f.faction);
        ctx.fillRect(x, y, COUNTER.stripeWidth, h);
        ctx.restore();

        // NATO symbol (small, top-right)
        const shape = FORMATION_KIND_SHAPES[f.kind] ?? 'square';
        ctx.fillStyle = paperFactionText(f.faction);
        ctx.font = `bold 10px ${FONTS.data}`;
        const symbolText = shape === 'xx' ? 'XX' : shape === 'xxx' ? 'XXX' : shape === 'diamond' ? '◇' : '▬';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(symbolText, x + w - 5, y + 4);

        // Unit name (top-left, shifted right past stripe)
        ctx.font = `${FONT_SIZES.counterName}px ${FONTS.data}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = INK.dark;
        const displayName = f.name.length > 14 ? f.name.slice(0, 13) + '\u2026' : f.name;
        ctx.fillText(displayName, x + COUNTER.stripeWidth + 4, y + 4);

        // Strength number (center)
        if (f.personnel != null) {
            ctx.font = `bold ${FONT_SIZES.counterStrength}px ${FONTS.data}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = INK.dark;
            ctx.fillText(f.personnel.toLocaleString(), cx, cy + 2);
        }

        // Cohesion bar (bottom)
        const barY = y + h - COUNTER.cohesionBarHeight - 6;
        const barX = cx - COUNTER.cohesionBarWidth / 2;
        // Background
        ctx.fillStyle = 'rgba(42, 26, 10, 0.1)';
        ctx.fillRect(barX, barY, COUNTER.cohesionBarWidth, COUNTER.cohesionBarHeight);
        // Fill
        const cohesionPct = Math.max(0, Math.min(1, f.cohesion));
        const cohesionColor = cohesionPct > 0.6 ? '#3a7a3a' : cohesionPct > 0.3 ? '#8a7a2a' : '#8a2a2a';
        ctx.fillStyle = cohesionColor;
        ctx.fillRect(barX, barY, COUNTER.cohesionBarWidth * cohesionPct, COUNTER.cohesionBarHeight);

        // Fatigue indicator (bottom-right)
        ctx.font = `${FONT_SIZES.counterPosture}px ${FONTS.data}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        const fatigue = f.fatigue ?? 0;
        ctx.fillStyle = fatigue > 0.6 ? COUNTER.fatigueColors.high
            : fatigue > 0.3 ? COUNTER.fatigueColors.medium
                : COUNTER.fatigueColors.low;
        ctx.fillText(`F:${fatigue.toFixed(1)}`, x + w - 4, y + h - 2);

        // Posture badge (bottom-left, shifted right past stripe)
        if (f.posture) {
            const postureLabel = f.posture.charAt(0).toUpperCase();
            const postureColor = COUNTER.postureColors[f.posture] ?? INK.medium;
            ctx.textAlign = 'left';
            ctx.fillStyle = postureColor;
            ctx.font = `bold ${FONT_SIZES.counterPosture}px ${FONTS.data}`;
            ctx.fillText(postureLabel, x + COUNTER.stripeWidth + 4, y + h - 2);
        }

        ctx.restore();
    }

    // ─── Enhancement 3: AoR Fill with Crosshatch ────────

    private drawAoRFill(aorSids: string[], faction: string | null): void {
        const { ctx } = this;
        if (!this.regionSidSet) return;

        for (const sid of aorSids) {
            if (!this.regionSidSet.has(sid)) continue;
            const feature = this.data.settlements.get(sid);
            if (!feature) continue;

            // Step 1: Fill with faction color
            ctx.save();
            this.clipToSettlement(ctx, feature);
            ctx.fillStyle = paperFactionFill(faction, SELECTION.aorFillAlpha);
            ctx.fill();

            // Step 2: Draw diagonal hatch lines at 45 degrees
            const bbox = this.getProjectedBBox(feature);
            const diag = Math.sqrt((bbox.maxX - bbox.minX) ** 2 + (bbox.maxY - bbox.minY) ** 2);
            const centerX = (bbox.minX + bbox.maxX) / 2;
            const centerY = (bbox.minY + bbox.maxY) / 2;

            const rgb = paperFactionRgb(faction);
            ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${SELECTION.aorHatchAlpha})`;
            ctx.lineWidth = SELECTION.aorHatchWidth;
            ctx.beginPath();

            const angle = Math.PI / 4;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const numLines = Math.ceil(diag / SELECTION.aorHatchSpacing);

            for (let i = -numLines; i <= numLines; i++) {
                const offset = i * SELECTION.aorHatchSpacing;
                const perpX = -sinA * offset;
                const perpY = cosA * offset;
                const x0 = centerX + perpX - cosA * diag;
                const y0 = centerY + perpY - sinA * diag;
                const x1 = centerX + perpX + cosA * diag;
                const y1 = centerY + perpY + sinA * diag;
                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    // ─── Pass 5: Labels ─────────────────────────────────

    private drawLabels(region: StaffMapRegion): void {
        const { ctx } = this;

        // Collect labels with positions, sorted by population desc for priority
        const labels: Array<{
            sid: string; name: string; cx: number; cy: number;
            natoClass: string; pop: number;
        }> = [];

        for (const sid of region.regionSids) {
            const feature = this.data.settlements.get(sid);
            if (!feature) continue;
            const natoClass = feature.properties.nato_class ?? 'SETTLEMENT';
            // Only label larger settlements — skip villages and smaller
            if (natoClass !== 'URBAN_CENTER' && natoClass !== 'TOWN') continue;
            const name = feature.properties.name;
            if (!name) continue;
            const centroid = this.data.settlementCentroids.get(sid);
            if (!centroid) continue;
            const [cx, cy] = this.project(centroid[0], centroid[1]);
            labels.push({
                sid,
                name,
                cx, cy,
                natoClass,
                pop: feature.properties.pop ?? 0,
            });
        }

        // Sort by population desc (bigger settlements labeled first / on top)
        labels.sort((a, b) => b.pop - a.pop);

        ctx.save();
        ctx.textBaseline = 'top';

        for (const lbl of labels) {
            let fontSize: number;
            let fontWeight = '';

            if (lbl.natoClass === 'URBAN_CENTER') {
                fontSize = FONT_SIZES.urbanCenter;
                fontWeight = 'bold';
            } else {
                fontSize = FONT_SIZES.town;
            }

            ctx.font = `${fontWeight} ${fontSize}px ${FONTS.placeName}`.trim();

            // Halo (parchment-colored stroke behind text)
            ctx.strokeStyle = PARCHMENT.base;
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.textAlign = 'center';
            ctx.strokeText(lbl.name, lbl.cx, lbl.cy + 8);

            // Text
            ctx.fillStyle = lbl.natoClass === 'URBAN_CENTER' ? INK.dark : INK.medium;
            ctx.fillText(lbl.name, lbl.cx, lbl.cy + 8);
        }

        ctx.restore();
    }

    // ─── Enhancement 5: River Labels ────────────────────

    private drawRiverLabels(): void {
        const { ctx } = this;
        if (!this.regionTransform) return;

        const labeledNames = new Set<string>();

        for (const feat of this.data.baseFeatures.rivers) {
            const name = feat.properties.name;
            if (!name) continue;
            if (labeledNames.has(name)) continue; // De-duplicate: only label each river name once

            // Get coordinates from the geometry
            let coords: Position[];
            if (feat.geometry.type === 'LineString') {
                coords = feat.geometry.coordinates as Position[];
            } else if (feat.geometry.type === 'MultiLineString') {
                const multi = feat.geometry.coordinates as Position[][];
                // Use the longest segment
                coords = multi.reduce((longest, curr) => curr.length > longest.length ? curr : longest, multi[0] ?? []);
            } else {
                continue;
            }

            if (coords.length < 2) continue;

            // Find midpoint of coordinate array
            const midIdx = Math.floor(coords.length / 2);
            const [mx, my] = this.project(coords[midIdx][0], coords[midIdx][1]);

            // Compute angle from neighboring points
            const prevIdx = Math.max(0, midIdx - 1);
            const nextIdx = Math.min(coords.length - 1, midIdx + 1);
            const [px, py] = this.project(coords[prevIdx][0], coords[prevIdx][1]);
            const [nx, ny] = this.project(coords[nextIdx][0], coords[nextIdx][1]);
            let angle = Math.atan2(ny - py, nx - px);

            // Ensure text is never upside down
            if (angle > Math.PI / 2) angle -= Math.PI;
            if (angle < -Math.PI / 2) angle += Math.PI;

            ctx.save();
            ctx.translate(mx, my);
            ctx.rotate(angle);

            ctx.font = `italic ${FONT_SIZES.town}px ${FONTS.placeName}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Parchment halo behind text
            ctx.strokeStyle = PARCHMENT.base;
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.strokeText(name, 0, 0);

            // River label text
            ctx.fillStyle = INK.water;
            ctx.fillText(name, 0, 0);

            ctx.restore();

            labeledNames.add(name);
        }
    }

    // ─── Pass 6: Decorations ────────────────────────────

    private drawDecorations(region: StaffMapRegion): void {
        this.drawCompassRose();
        this.drawScaleBar(region);
        this.drawCartouche(region);
    }

    private drawCompassRose(): void {
        const { ctx } = this;
        const w = this.canvas.width;
        const size = DECORATIONS.compassSize;
        const cx = w - size - 30;
        const cy = size + 30;

        ctx.save();
        ctx.strokeStyle = INK.medium;
        ctx.fillStyle = INK.medium;
        ctx.lineWidth = 1.5;

        // Simple 4-point compass
        const r = size / 2;
        const arrowLen = r * 0.7;
        const arrowWidth = 4;

        // N-S line
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx, cy + r);
        ctx.stroke();

        // E-W line
        ctx.beginPath();
        ctx.moveTo(cx - r, cy);
        ctx.lineTo(cx + r, cy);
        ctx.stroke();

        // North arrow
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx - arrowWidth, cy - r + arrowLen * 0.3);
        ctx.lineTo(cx + arrowWidth, cy - r + arrowLen * 0.3);
        ctx.closePath();
        ctx.fill();

        // N label
        ctx.font = `bold ${FONT_SIZES.compassLabel}px ${FONTS.placeName}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('N', cx, cy - r - 4);

        // Decorative circle
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    private drawScaleBar(region: StaffMapRegion): void {
        const { ctx } = this;
        if (!this.regionTransform) return;

        const h = this.canvas.height;
        const barX = 40;
        const barY = h - 50;

        // Approximate: 1 data unit ~ 0.35 km (rough estimate for BiH projected coords)
        const dataUnitsPerKm = 1 / 0.35;
        const pixelsPerDataUnit = this.regionTransform.scale;
        const pixelsPerKm = pixelsPerDataUnit / dataUnitsPerKm;

        // Find a nice round scale bar length
        const targetPixels = 120;
        const targetKm = targetPixels / pixelsPerKm;
        const niceKm = [1, 2, 5, 10, 20, 50].find(v => v >= targetKm * 0.5) ?? 10;
        const barWidth = niceKm * pixelsPerKm;

        ctx.save();
        ctx.strokeStyle = INK.dark;
        ctx.fillStyle = INK.dark;
        ctx.lineWidth = 1.5;

        // Bar
        ctx.beginPath();
        ctx.moveTo(barX, barY);
        ctx.lineTo(barX + barWidth, barY);
        ctx.stroke();

        // End ticks
        ctx.beginPath();
        ctx.moveTo(barX, barY - 5);
        ctx.lineTo(barX, barY + 5);
        ctx.moveTo(barX + barWidth, barY - 5);
        ctx.lineTo(barX + barWidth, barY + 5);
        ctx.stroke();

        // Label
        ctx.font = `${FONT_SIZES.scaleBar}px ${FONTS.data}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${niceKm} km`, barX + barWidth / 2, barY + 8);

        ctx.restore();
    }

    // ─── Enhancement 9: Cartouche with Margin Annotations ───

    private drawCartouche(region: StaffMapRegion): void {
        const { ctx } = this;
        const w = this.canvas.width;
        const gs = this.state.snapshot.loadedGameState;

        // Determine region name from settlement names in the region
        let regionName = 'Staff Map';
        // Find the most populous settlement in the region for the title
        let bestPop = 0;
        for (const sid of region.regionSids) {
            const feature = this.data.settlements.get(sid);
            if (feature && (feature.properties.pop ?? 0) > bestPop) {
                bestPop = feature.properties.pop ?? 0;
                regionName = feature.properties.name ?? regionName;
            }
        }
        // Simplify "Sarajevo Dio - ..." to "Sarajevo"
        const dioMatch = regionName.match(/^(.+?)\s+Dio\s*-/);
        if (dioMatch) regionName = dioMatch[1];
        regionName += ' Area';

        const turnDate = gs ? formatTurnDate(gs.turn, gs.phase) : '';

        // Cartouche dimensions
        ctx.save();
        ctx.font = `bold ${FONT_SIZES.cartoucheTitle}px ${FONTS.placeName}`;
        const titleWidth = ctx.measureText(regionName).width;
        const boxWidth = Math.max(titleWidth + DECORATIONS.cartouchePadding * 2, 200);
        const boxHeight = 54;
        const bx = (w - boxWidth) / 2;
        const by = 20;

        // Border (double lines)
        ctx.strokeStyle = INK.medium;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, boxWidth, boxHeight);
        ctx.lineWidth = 0.5;
        ctx.strokeRect(bx + 4, by + 4, boxWidth - 8, boxHeight - 8);

        // Title
        ctx.fillStyle = INK.dark;
        ctx.font = `bold ${FONT_SIZES.cartoucheTitle}px ${FONTS.placeName}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(regionName, w / 2, by + 10);

        // Subtitle (game date only)
        if (turnDate) {
            ctx.font = `${FONT_SIZES.cartoucheSubtitle}px ${FONTS.data}`;
            ctx.fillStyle = INK.medium;
            ctx.fillText(turnDate, w / 2, by + 32);
        }

        // Margin annotations below cartouche
        let annotY = by + boxHeight + 12;
        ctx.font = `italic ${FONT_SIZES.annotation}px ${FONTS.placeName}`;
        ctx.fillStyle = INK.light;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Line 1: Week number and game date
        if (gs) {
            ctx.fillText(`Wk ${gs.turn} \u2014 ${turnDate}`, w / 2, annotY);
            annotY += 12;

            // Line 2: Count of active formations per faction
            const factionCounts: Record<string, number> = {};
            for (const f of gs.formations) {
                factionCounts[f.faction] = (factionCounts[f.faction] ?? 0) + 1;
            }
            const parts = Object.keys(factionCounts).sort().map(fac => `${fac}: ${factionCounts[fac]}`);
            if (parts.length > 0) {
                ctx.fillText(`Formations: ${parts.join(', ')}`, w / 2, annotY);
            }
        }

        ctx.restore();
    }

    // ─── Player Faction Crest Stamp (top-left) ─────────

    /** Faction ID → crest image key */
    private static readonly FACTION_CREST_KEY: Record<string, string> = {
        RBiH: 'ARBiH',
        RS: 'VRS',
        HRHB: 'HVO',
    };

    private drawFactionCrests(): void {
        if (!this.crestsLoaded) return;
        const gs = this.state.snapshot.loadedGameState;
        const faction = gs?.player_faction ?? null;
        if (!faction) return;

        const crestKey = StaffMapRenderer.FACTION_CREST_KEY[faction];
        if (!crestKey) return;
        const img = this.crestImages.get(crestKey);
        if (!img || !img.naturalWidth) return;

        const { ctx } = this;
        const targetH = DECORATIONS.crestHeight;
        const aspect = img.naturalWidth / img.naturalHeight;
        const drawW = targetH * aspect;

        // Position: top-left, clear of exit button (exit occupies x 12..40)
        const x = 60;
        const y = 50;
        const centerX = x + drawW / 2;
        const centerY = y + targetH / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(DECORATIONS.crestRotation);

        // Stamp border frame
        const pad = 3;
        ctx.strokeStyle = DECORATIONS.crestBorderColor;
        ctx.lineWidth = DECORATIONS.crestBorderWidth;
        ctx.globalAlpha = 0.4;
        ctx.strokeRect(-drawW / 2 - pad, -targetH / 2 - pad, drawW + pad * 2, targetH + pad * 2);

        // Crest image at faded stamp alpha
        ctx.globalAlpha = DECORATIONS.crestAlpha;
        ctx.drawImage(img, -drawW / 2, -targetH / 2, drawW, targetH);

        // Faction label beneath
        ctx.globalAlpha = 0.5;
        ctx.font = `italic ${FONT_SIZES.crestLabel}px ${FONTS.placeName}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = INK.medium;
        ctx.fillText(crestKey, 0, targetH / 2 + pad + 2);

        ctx.restore();
    }

    // ─── Enhancement 10: Irregular Vignette Edge ────────

    private drawVignette(w: number, h: number): void {
        const { ctx } = this;
        const inset = DECORATIONS.vignetteInset;
        const n = 40; // strips per edge

        ctx.save();
        // Each edge: 0=top, 1=bottom, 2=left, 3=right
        for (let edge = 0; edge < 4; edge++) {
            for (let i = 0; i < n; i++) {
                const depthMod = detHash(i, edge, 300) * 0.6 + 0.7;
                const stripInset = inset * depthMod;
                const alpha = 0.45 * (1 - i / n) * depthMod;
                const stripSize = stripInset / n;
                ctx.fillStyle = `rgba(80, 60, 30, ${alpha.toFixed(3)})`;
                if (edge === 0) ctx.fillRect(0, i * stripSize, w, stripSize + 1);
                else if (edge === 1) ctx.fillRect(0, h - (i + 1) * stripSize, w, stripSize + 1);
                else if (edge === 2) ctx.fillRect(i * stripSize, 0, stripSize + 1, h);
                else ctx.fillRect(w - (i + 1) * stripSize, 0, stripSize + 1, h);
            }
        }
        ctx.restore();
    }

    // ─── Enhancement 12: Exit Button moved to Top-Left ──

    private drawExitButton(): void {
        const { ctx } = this;
        const size = 28;
        const x = 12;
        const y = 12;

        ctx.save();
        ctx.fillStyle = 'rgba(244, 232, 200, 0.85)';
        ctx.strokeStyle = INK.medium;
        ctx.lineWidth = 1.5;

        // Circle background
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // X mark
        ctx.strokeStyle = INK.dark;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        const pad = 8;
        ctx.beginPath();
        ctx.moveTo(x + pad, y + pad);
        ctx.lineTo(x + size - pad, y + size - pad);
        ctx.moveTo(x + size - pad, y + pad);
        ctx.lineTo(x + pad, y + size - pad);
        ctx.stroke();

        ctx.restore();
    }

    /** Check if a click at canvas coordinates hits the exit button. */
    isExitButtonHit(canvasX: number, canvasY: number): boolean {
        const size = 28;
        const cx = 12 + size / 2;
        const cy = 12 + size / 2;
        const dx = canvasX - cx;
        const dy = canvasY - cy;
        return dx * dx + dy * dy <= (size / 2 + 4) ** 2;
    }

    // ─── Geometry Helpers ───────────────────────────────

    private clipToSettlement(ctx: CanvasRenderingContext2D, feature: SettlementFeature): void {
        this.traceSettlementPath(ctx, feature);
        ctx.clip();
    }

    private traceSettlementPath(ctx: CanvasRenderingContext2D, feature: SettlementFeature): void {
        const polys: PolygonCoords[] = feature.geometry.type === 'Polygon'
            ? [feature.geometry.coordinates]
            : feature.geometry.coordinates;

        ctx.beginPath();
        for (const poly of polys) {
            const ring = poly[0]; // outer ring only
            if (!ring || ring.length < 3) continue;
            const [sx, sy] = this.project(ring[0][0], ring[0][1]);
            ctx.moveTo(sx, sy);
            for (let i = 1; i < ring.length; i++) {
                const [px, py] = this.project(ring[i][0], ring[i][1]);
                ctx.lineTo(px, py);
            }
            ctx.closePath();
        }
    }

    private getProjectedBBox(feature: SettlementFeature): BBox {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const polys: PolygonCoords[] = feature.geometry.type === 'Polygon'
            ? [feature.geometry.coordinates]
            : feature.geometry.coordinates;
        for (const poly of polys) {
            for (const ring of poly) {
                for (const [dx, dy] of ring) {
                    const [px, py] = this.project(dx, dy);
                    if (px < minX) minX = px;
                    if (py < minY) minY = py;
                    if (px > maxX) maxX = px;
                    if (py > maxY) maxY = py;
                }
            }
        }
        return { minX, minY, maxX, maxY };
    }

    private drawLineFeature(ctx: CanvasRenderingContext2D, geometry: { type: string; coordinates: unknown }): void {
        if (!this.regionTransform) return;
        const vb = this.regionTransform.viewBox;

        if (geometry.type === 'LineString') {
            const coords = geometry.coordinates as Position[];
            this.drawLineCoords(ctx, coords, vb);
        } else if (geometry.type === 'MultiLineString') {
            const multiCoords = geometry.coordinates as Position[][];
            for (const coords of multiCoords) {
                this.drawLineCoords(ctx, coords, vb);
            }
        }
    }

    private drawLineCoords(ctx: CanvasRenderingContext2D, coords: Position[], viewBox: BBox): void {
        // Quick viewport culling: skip if all points are outside the view box
        let anyInView = false;
        for (const pt of coords) {
            if (pt[0] >= viewBox.minX && pt[0] <= viewBox.maxX &&
                pt[1] >= viewBox.minY && pt[1] <= viewBox.maxY) {
                anyInView = true;
                break;
            }
        }
        if (!anyInView) return;

        ctx.beginPath();
        for (let i = 0; i < coords.length; i++) {
            const [px, py] = this.project(coords[i][0], coords[i][1]);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // ─── Hit Testing ────────────────────────────────────

    /** Find the formation at given canvas coordinates (uses stacked positions from last render). */
    getFormationAtPoint(canvasX: number, canvasY: number): FormationView | null {
        const gs = this.state.snapshot.loadedGameState;
        if (!gs || !this.regionSidSet) return null;

        const hw = COUNTER.width / 2;
        const hh = COUNTER.height / 2;
        let bestFormation: FormationView | null = null;

        // Hit-test against actual drawn positions (including stack offsets)
        for (const f of gs.formations) {
            const pos = this.formationPositions.get(f.id);
            if (!pos) continue;
            if (canvasX >= pos.cx - hw && canvasX <= pos.cx + hw
                && canvasY >= pos.cy - hh && canvasY <= pos.cy + hh) {
                bestFormation = f;
            }
        }

        return bestFormation;
    }
}
