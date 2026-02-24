/**
 * 2D canvas renderer for the Settlement Merger tool.
 * Renders all canonical settlement polygons with pan/zoom/click/hover.
 */

import { SpatialIndex } from '../geo/SpatialIndex.js';
import { MapProjection } from '../geo/MapProjection.js';
import type { BBox, ViewTransform } from '../types.js';
import type { MergerState } from './MergerState.js';
import type { CanonicalFeature, PolygonCoords } from './types.js';

// ── Color palettes ──

const ETHNIC_FILL: Record<string, string> = {
    B:  'rgba(65,145,80,0.72)',
    Bm: 'rgba(65,145,80,0.45)',
    S:  'rgba(178,60,60,0.72)',
    Sm: 'rgba(178,60,60,0.45)',
    C:  'rgba(55,115,175,0.72)',
    Cm: 'rgba(55,115,175,0.45)',
    X:  'rgba(120,115,105,0.45)',
};
const ETHNIC_STROKE: Record<string, string> = {
    B:  '#2d6e30', Bm: '#2d6e30',
    S:  '#8a2020', Sm: '#8a2020',
    C:  '#254a70', Cm: '#254a70',
    X:  '#504838',
};

const GROUP_PALETTE = [
    '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4',
    '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990', '#dcbeff',
    '#9A6324', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075',
];
const UNMERGED_FILL = 'rgba(90,85,75,0.3)';
const UNMERGED_STROKE = '#3d3729';

const MUN_BORDER_COLOR = '#d4b44a';
const MUN_BORDER_WIDTH = 2;
const SELECTED_STROKE = '#c4a44a';
const SELECTED_WIDTH = 2.5;
const FOCUSED_GROUP_STROKE = '#ffffff';
const FOCUSED_GROUP_WIDTH = 2.5;
const HOVER_STROKE = '#42d4f4';
const HOVER_WIDTH = 1.5;
const CROSSMUN_STROKE = '#e05050';
const CROSSMUN_WIDTH = 2.0;
const BG_COLOR = '#15130f';
const DEFAULT_BORDER_COLOR = '#1a1816';
const DEFAULT_BORDER_WIDTH = 0.5;

type HoverCallback = (sid: string | null, clientX: number, clientY: number) => void;
type ClickCallback = (sid: string | null) => void;

export class MergerRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private state: MergerState;
    private projection: MapProjection;
    private spatialIndex: SpatialIndex<string>;

    // View
    private panCenter = { x: 0.5, y: 0.5 };
    private zoomFactor = 1;

    // Interaction tracking
    private isPanning = false;
    private lastPointer = { x: 0, y: 0 };
    private panDragDist = 0;

    // Callbacks
    private onHover: HoverCallback | null = null;
    private onClick: ClickCallback | null = null;

    // Cached bboxes for spatial index
    private featureBboxes = new Map<string, BBox>();
    // Pre-computed municipality boundary line segments: array of [lon1, lat1, lon2, lat2]
    private munBorderSegments: number[][] = [];

    constructor(container: HTMLElement, state: MergerState) {
        this.state = state;
        this.canvas = document.createElement('canvas');
        container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d')!;

        // Compute data bounds
        const bounds = this.computeDataBounds();
        this.projection = new MapProjection(bounds);

        // Build spatial index
        this.spatialIndex = new SpatialIndex<string>(bounds, 60);
        for (const [sid, f] of state.features) {
            const bb = this.computeFeatureBbox(f);
            this.featureBboxes.set(sid, bb);
            this.spatialIndex.insert(sid, bb);
        }

        // Pre-compute municipality boundary segments by finding shared edges
        // between adjacent settlements in different municipalities
        this.munBorderSegments = this.computeMunBorderSegments();

        this.setupControls();
        this.resize();
    }

    setHoverCallback(cb: HoverCallback): void { this.onHover = cb; }
    setClickCallback(cb: ClickCallback): void { this.onClick = cb; }

    // ── Rendering ──

    render(): void {
        const { canvas, ctx } = this;
        const w = canvas.width;
        const h = canvas.height;
        if (w === 0 || h === 0) return;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, w, h);

        const vt = this.projection.computeTransform(w, h, this.zoomFactor, this.panCenter, 20);

        const visibleSids = this.state.getVisibleSids();
        const colorMode = this.state.colorMode;

        // Layer 1: filled settlement polygons
        for (const sid of visibleSids) {
            const feature = this.state.features.get(sid);
            if (!feature) continue;
            const bb = this.featureBboxes.get(sid);
            if (bb && !this.projection.isInViewport(bb, vt)) continue;

            let fillColor: string;
            let strokeColor: string;

            if (colorMode === 'ethnic') {
                const ek = feature.properties.ethnic_key || 'X';
                fillColor = ETHNIC_FILL[ek] ?? ETHNIC_FILL.X!;
                strokeColor = ETHNIC_STROKE[ek] ?? ETHNIC_STROKE.X!;
            } else if (colorMode === 'group_ethnic') {
                // Color by the merge group's aggregated ethnicity
                const ek = this.state.getGroupEthnicKey(sid);
                fillColor = ETHNIC_FILL[ek] ?? ETHNIC_FILL.X!;
                strokeColor = ETHNIC_STROKE[ek] ?? ETHNIC_STROKE.X!;
            } else {
                // merge_group mode
                const osid = this.state.sidToOsid.get(sid);
                if (osid) {
                    const group = this.state.mergeGroups.get(osid);
                    const ci = group ? group.colorIndex % GROUP_PALETTE.length : 0;
                    fillColor = GROUP_PALETTE[ci]! + 'aa';
                    strokeColor = GROUP_PALETTE[ci]!;
                } else {
                    fillColor = UNMERGED_FILL;
                    strokeColor = UNMERGED_STROKE;
                }
            }

            this.drawFeature(feature, vt, fillColor, strokeColor, DEFAULT_BORDER_WIDTH);
        }

        // Layer 2: municipality boundary lines (actual shared edges)
        if (this.munBorderSegments.length > 0) {
            ctx.beginPath();
            for (const seg of this.munBorderSegments) {
                const [sx1, sy1] = this.projectFlipped(seg[0]!, seg[1]!, vt);
                const [sx2, sy2] = this.projectFlipped(seg[2]!, seg[3]!, vt);
                ctx.moveTo(sx1, sy1);
                ctx.lineTo(sx2, sy2);
            }
            ctx.strokeStyle = MUN_BORDER_COLOR;
            ctx.lineWidth = MUN_BORDER_WIDTH;
            ctx.stroke();
        }

        // Layer 3: cross-municipality groups (red dashed outlines)
        ctx.save();
        ctx.setLineDash([6, 3]);
        for (const [osid, group] of this.state.mergeGroups) {
            const validation = this.state.getGroupValidation(osid);
            if (!validation.crossMun) continue;
            for (const sid of group.memberSids) {
                const feature = this.state.features.get(sid);
                if (!feature) continue;
                const bb = this.featureBboxes.get(sid);
                if (bb && !this.projection.isInViewport(bb, vt)) continue;
                this.drawFeatureStroke(feature, vt, CROSSMUN_STROKE, CROSSMUN_WIDTH);
            }
        }
        ctx.setLineDash([]);
        ctx.restore();

        // Layer 4: focused merge group (white highlight around all members)
        if (this.state.focusedGroupOsid) {
            const group = this.state.mergeGroups.get(this.state.focusedGroupOsid);
            if (group) {
                for (const sid of group.memberSids) {
                    const feature = this.state.features.get(sid);
                    if (!feature) continue;
                    this.drawFeatureStroke(feature, vt, FOCUSED_GROUP_STROKE, FOCUSED_GROUP_WIDTH);
                }
            }
        }

        // Layer 5: selected settlements (gold highlight)
        for (const sid of this.state.selectedSids) {
            const feature = this.state.features.get(sid);
            if (!feature) continue;
            this.drawFeatureStroke(feature, vt, SELECTED_STROKE, SELECTED_WIDTH);
        }

        // Layer 6: hovered settlement (cyan highlight)
        if (this.state.hoveredSid) {
            const feature = this.state.features.get(this.state.hoveredSid);
            if (feature) {
                ctx.setLineDash([4, 3]);
                this.drawFeatureStroke(feature, vt, HOVER_STROKE, HOVER_WIDTH);
                ctx.setLineDash([]);
            }
        }
    }

    private drawFeature(
        feature: CanonicalFeature, vt: ViewTransform,
        fillColor: string, strokeColor: string, strokeWidth: number,
    ): void {
        const { ctx } = this;
        this.buildPolygonPath(feature, vt);
        ctx.fillStyle = fillColor;
        ctx.fill('evenodd');
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
    }

    private drawFeatureStroke(
        feature: CanonicalFeature, vt: ViewTransform,
        strokeColor: string, strokeWidth: number,
    ): void {
        const { ctx } = this;
        this.buildPolygonPath(feature, vt);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
    }

    /**
     * Project data coords (lon, lat) to canvas coords, flipping Y so north is up.
     * GeoJSON latitude increases northward but canvas Y increases downward,
     * so we negate latitude before projecting.
     */
    private projectFlipped(lon: number, lat: number, vt: ViewTransform): [number, number] {
        return this.projection.project(lon, -lat, vt);
    }

    /** Build a canvas path from a feature's polygon/multipolygon geometry. */
    private buildPolygonPath(feature: CanonicalFeature, vt: ViewTransform): void {
        const { ctx } = this;
        const polys: PolygonCoords[] = feature.geometry.type === 'Polygon'
            ? [feature.geometry.coordinates as PolygonCoords]
            : feature.geometry.coordinates as PolygonCoords[];
        ctx.beginPath();
        for (const poly of polys) {
            for (const ring of poly) {
                for (let i = 0; i < ring.length; i++) {
                    const [sx, sy] = this.projectFlipped(ring[i]![0]!, ring[i]![1]!, vt);
                    if (i === 0) ctx.moveTo(sx, sy);
                    else ctx.lineTo(sx, sy);
                }
                ctx.closePath();
            }
        }
    }

    // ── Hit testing ──

    private hitTest(canvasX: number, canvasY: number): string | null {
        const vt = this.getVT();
        // Unproject gives us (lon, -lat) in the flipped coordinate space
        const [dataX, dataY] = this.projection.unproject(canvasX, canvasY, vt);

        // Quick spatial index lookup
        const candidates = this.spatialIndex.queryPoint(dataX, dataY);
        if (candidates.length === 0) return null;

        // Filter by visibility (municipality)
        const activeMun = this.state.activeMunicipality;

        // Point-in-polygon test
        for (const sid of candidates) {
            if (activeMun) {
                const f = this.state.features.get(sid);
                if (f && f.properties.mun1990_id !== activeMun) continue;
            }
            const f = this.state.features.get(sid);
            if (f && this.pointInPolygon(dataX, dataY, f)) return sid;
        }
        return null;
    }

    /**
     * Point-in-polygon test. x,y are in the flipped coordinate space (lon, -lat).
     * Ring coords are in original GeoJSON (lon, lat) so we negate lat during test.
     */
    private pointInPolygon(x: number, y: number, feature: CanonicalFeature): boolean {
        const polys: PolygonCoords[] = feature.geometry.type === 'Polygon'
            ? [feature.geometry.coordinates as PolygonCoords]
            : feature.geometry.coordinates as PolygonCoords[];
        for (const poly of polys) {
            const ring = poly[0];
            if (!ring || ring.length < 3) continue;
            let inside = false;
            let j = ring.length - 1;
            for (let i = 0; i < ring.length; i++) {
                const xi = ring[i]![0]!, yi = -ring[i]![1]!;
                const xj = ring[j]![0]!, yj = -ring[j]![1]!;
                if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
                    inside = !inside;
                }
                j = i;
            }
            if (inside) return true;
        }
        return false;
    }

    // ── Interaction ──

    private setupControls(): void {
        const c = this.canvas;

        c.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = c.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * (c.width / rect.width);
            const my = (e.clientY - rect.top) * (c.height / rect.height);

            const vt = this.getVT();
            // unproject gives (lon, -lat) in flipped space — that's fine for panCenter calc
            const [dataX, dataY] = this.projection.unproject(mx, my, vt);

            const zoomDelta = e.deltaY < 0 ? 1.15 : 1 / 1.15;
            this.zoomFactor = Math.max(1, Math.min(200, this.zoomFactor * zoomDelta));

            // Adjust pan so data point under cursor stays fixed
            const bounds = this.projection.getBounds();
            const rangeX = bounds.maxX - bounds.minX;
            const rangeY = bounds.maxY - bounds.minY;
            this.panCenter.x = (dataX - bounds.minX) / rangeX;
            this.panCenter.y = (dataY - bounds.minY) / rangeY;

            this.render();
        }, { passive: false });

        c.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            this.isPanning = true;
            this.lastPointer = { x: e.clientX, y: e.clientY };
            this.panDragDist = 0;
            c.setPointerCapture(e.pointerId);
        });

        c.addEventListener('pointermove', (e) => {
            if (this.isPanning) {
                const dx = e.clientX - this.lastPointer.x;
                const dy = e.clientY - this.lastPointer.y;
                this.panDragDist += Math.abs(dx) + Math.abs(dy);

                const rect = c.getBoundingClientRect();
                const bounds = this.projection.getBounds();
                const rangeX = bounds.maxX - bounds.minX;
                const rangeY = bounds.maxY - bounds.minY;
                const vt = this.getVT();
                // Convert pixel drag to data space
                this.panCenter.x -= (dx / rect.width) * (vt.viewBox.maxX - vt.viewBox.minX) / rangeX;
                this.panCenter.y -= (dy / rect.height) * (vt.viewBox.maxY - vt.viewBox.minY) / rangeY;

                this.lastPointer = { x: e.clientX, y: e.clientY };
                this.render();
            } else {
                // Hover
                const rect = c.getBoundingClientRect();
                const mx = (e.clientX - rect.left) * (c.width / rect.width);
                const my = (e.clientY - rect.top) * (c.height / rect.height);
                const sid = this.hitTest(mx, my);
                if (this.onHover) this.onHover(sid, e.clientX, e.clientY);
            }
        });

        c.addEventListener('pointerup', (e) => {
            if (!this.isPanning) return;
            this.isPanning = false;
            c.releasePointerCapture(e.pointerId);

            // If drag distance was small, treat as click
            if (this.panDragDist < 5) {
                const rect = c.getBoundingClientRect();
                const mx = (e.clientX - rect.left) * (c.width / rect.width);
                const my = (e.clientY - rect.top) * (c.height / rect.height);
                const sid = this.hitTest(mx, my);
                if (this.onClick) this.onClick(sid);
            }
        });
    }

    // ── View helpers ──

    private getVT(): ViewTransform {
        return this.projection.computeTransform(
            this.canvas.width, this.canvas.height,
            this.zoomFactor, this.panCenter, 20,
        );
    }

    /** Zoom to fit a specific municipality's settlements. */
    zoomToMunicipality(munId: string): void {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let count = 0;
        for (const [sid, f] of this.state.features) {
            if (f.properties.mun1990_id !== munId) continue;
            const bb = this.featureBboxes.get(sid);
            if (!bb) continue;
            if (bb.minX < minX) minX = bb.minX;
            if (bb.minY < minY) minY = bb.minY;
            if (bb.maxX > maxX) maxX = bb.maxX;
            if (bb.maxY > maxY) maxY = bb.maxY;
            count++;
        }
        if (count === 0) return;

        const bounds = this.projection.getBounds();
        const rangeX = bounds.maxX - bounds.minX;
        const rangeY = bounds.maxY - bounds.minY;
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        this.panCenter.x = (cx - bounds.minX) / rangeX;
        this.panCenter.y = (cy - bounds.minY) / rangeY;

        const extentX = maxX - minX;
        const extentY = maxY - minY;
        const zx = extentX > 0 ? rangeX / extentX * 0.8 : 1;
        const zy = extentY > 0 ? rangeY / extentY * 0.8 : 1;
        this.zoomFactor = Math.max(1, Math.min(200, Math.min(zx, zy)));

        this.render();
    }

    zoomToFit(): void {
        this.panCenter = { x: 0.5, y: 0.5 };
        this.zoomFactor = 1;
        this.render();
    }

    resize(): void {
        const parent = this.canvas.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.render();
    }

    // ── Data bounds ──

    /**
     * Compute data bounds with latitude negated so north is up in screen space.
     * GeoJSON [lon, lat] → internal [lon, -lat].
     */
    private computeDataBounds(): BBox {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const f of this.state.features.values()) {
            const polys: PolygonCoords[] = f.geometry.type === 'Polygon'
                ? [f.geometry.coordinates as PolygonCoords]
                : f.geometry.coordinates as PolygonCoords[];
            for (const poly of polys) {
                for (const ring of poly) {
                    for (const pt of ring) {
                        const lon = pt[0]!;
                        const negLat = -pt[1]!;
                        if (lon < minX) minX = lon;
                        if (negLat < minY) minY = negLat;
                        if (lon > maxX) maxX = lon;
                        if (negLat > maxY) maxY = negLat;
                    }
                }
            }
        }
        return { minX, minY, maxX, maxY };
    }

    /**
     * Compute bbox for a single feature with latitude negated.
     */
    private computeFeatureBbox(f: CanonicalFeature): BBox {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const polys: PolygonCoords[] = f.geometry.type === 'Polygon'
            ? [f.geometry.coordinates as PolygonCoords]
            : f.geometry.coordinates as PolygonCoords[];
        for (const poly of polys) {
            for (const ring of poly) {
                for (const pt of ring) {
                    const lon = pt[0]!;
                    const negLat = -pt[1]!;
                    if (lon < minX) minX = lon;
                    if (negLat < minY) minY = negLat;
                    if (lon > maxX) maxX = lon;
                    if (negLat > maxY) maxY = negLat;
                }
            }
        }
        return { minX, minY, maxX, maxY };
    }

    /**
     * Find actual municipality boundary line segments by detecting shared edges
     * between adjacent settlement polygons that belong to different municipalities.
     *
     * For each cross-municipality adjacency pair (A, B), we find vertices from A's
     * outer rings that also appear in B's outer rings (within a small epsilon).
     * Consecutive shared vertices form boundary segments.
     */
    private computeMunBorderSegments(): number[][] {
        const segments: number[][] = [];
        const state = this.state;
        const EPS = 1e-8;

        // Build a set of processed pairs to avoid duplicates
        const processed = new Set<string>();

        for (const [sidA, neighbors] of state.adjacency) {
            const fA = state.features.get(sidA);
            if (!fA) continue;
            const munA = fA.properties.mun1990_id;

            for (const sidB of neighbors) {
                // Skip if same municipality
                const fB = state.features.get(sidB);
                if (!fB) continue;
                if (fB.properties.mun1990_id === munA) continue;

                // Skip if already processed this pair
                const pairKey = sidA < sidB ? `${sidA}|${sidB}` : `${sidB}|${sidA}`;
                if (processed.has(pairKey)) continue;
                processed.add(pairKey);

                // Get all outer ring vertices of B into a lookup set
                const polysB: PolygonCoords[] = fB.geometry.type === 'Polygon'
                    ? [fB.geometry.coordinates as PolygonCoords]
                    : fB.geometry.coordinates as PolygonCoords[];
                const bVertSet = new Set<string>();
                for (const polyB of polysB) {
                    const ringB = polyB[0];
                    if (!ringB) continue;
                    for (const pt of ringB) {
                        // Quantize to avoid floating point mismatch
                        bVertSet.add(`${Math.round(pt[0]! / EPS)}|${Math.round(pt[1]! / EPS)}`);
                    }
                }

                // Walk A's outer rings and find consecutive runs of shared vertices
                const polysA: PolygonCoords[] = fA.geometry.type === 'Polygon'
                    ? [fA.geometry.coordinates as PolygonCoords]
                    : fA.geometry.coordinates as PolygonCoords[];
                for (const polyA of polysA) {
                    const ringA = polyA[0];
                    if (!ringA || ringA.length < 2) continue;

                    let prevShared = false;
                    let prevLon = 0, prevLat = 0;

                    for (const pt of ringA) {
                        const key = `${Math.round(pt[0]! / EPS)}|${Math.round(pt[1]! / EPS)}`;
                        const isShared = bVertSet.has(key);

                        if (isShared && prevShared) {
                            // Both this and previous vertex are shared — emit a segment
                            segments.push([prevLon, prevLat, pt[0]!, pt[1]!]);
                        }

                        prevShared = isShared;
                        prevLon = pt[0]!;
                        prevLat = pt[1]!;
                    }
                }
            }
        }

        return segments;
    }
}
