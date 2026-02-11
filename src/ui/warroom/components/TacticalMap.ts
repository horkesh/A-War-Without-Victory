import { GameState } from '../../../state/game_state.js';
import { NATO_TOKENS, factionFill } from '../../../map/nato_tokens.js';
import { computeFrontEdges } from '../../../map/front_edges.js';
import type { EdgeRecord } from '../../../map/settlements.js';

type GeoFeature = {
    properties?: { sid?: string; municipality_id?: number };
    geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: any };
};

export class TacticalMap {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private polygons: Map<string, GeoFeature> = new Map();
    private baseFeatures: any[] = [];
    private settlementEdges: EdgeRecord[] = [];
    private controlZones: any[] = [];
    private bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
    private zoomLevel: 0 | 1 | 2 = 0; // 0=Strategic (full extent), 1=Operational, 2=Tactical
    private zoomCenter: { x: number; y: number } = { x: 0.5, y: 0.5 }; // Normalized 0-1

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 1800; // Resolution matching the wall frame
        this.canvas.height = 1200;
        this.ctx = this.canvas.getContext('2d')!;
    }

    async loadAssets() {
        await this.loadPolygons();
        await this.loadBaseMap();
        await this.loadSettlementEdges();
        await this.loadControlZones();
    }

    private async loadControlZones() {
        try {
            const response = await fetch('/data/derived/control_zones_A1.geojson');
            if (!response.ok) return;
            const data = await response.json();
            this.controlZones = data.features || [];
        } catch (_) {
            // optional
        }
    }

    private async loadSettlementEdges() {
        try {
            const response = await fetch('/data/derived/settlement_edges.json');
            if (!response.ok) return;
            const data = await response.json();
            this.settlementEdges = data.edges || [];
        } catch (_) {
            // optional
        }
    }

    private async loadBaseMap() {
        try {
            const response = await fetch('/data/derived/A1_BASE_MAP.geojson');
            if (!response.ok) throw new Error('Failed to load A1 Base Map');
            const data = await response.json();
            this.baseFeatures = data.features;
            console.log(`TacticalMap: Loaded ${this.baseFeatures.length} base features`);
        } catch (e) {
            console.error('TacticalMap: Error loading base map', e);
        }
    }

    /** Expand bounds to include A1 base map extent so boundary and rivers project correctly. */
    private expandBoundsFromBaseFeatures() {
        if (!this.bounds || this.baseFeatures.length === 0) return;
        let { minX, minY, maxX, maxY } = this.bounds;
        for (const f of this.baseFeatures) {
            const c = f.geometry?.coordinates;
            if (!c) continue;
            const extract = (p: number[]) => {
                minX = Math.min(minX, p[0]);
                minY = Math.min(minY, p[1]);
                maxX = Math.max(maxX, p[0]);
                maxY = Math.max(maxY, p[1]);
            };
            if (f.geometry?.type === 'Point') extract(c);
            else if (f.geometry?.type === 'LineString') c.forEach(extract);
            else if (f.geometry?.type === 'Polygon') c[0]?.forEach(extract);
            else if (f.geometry?.type === 'MultiPolygon') c.forEach((poly: any) => poly[0]?.forEach(extract));
            else if (f.geometry?.type === 'MultiLineString') c.forEach((line: any) => line.forEach(extract));
        }
        this.bounds = { minX, minY, maxX, maxY };
    }

    private async loadPolygons() {
        try {
            const response = await fetch('/data/derived/settlements_a1_viewer.geojson');
            if (!response.ok) throw new Error('Failed to load geojson');
            const geojson = await response.json();
            for (const feature of geojson.features as GeoFeature[]) {
                const sid = feature.properties?.sid;
                if (sid) this.polygons.set(sid, feature);
            }
            this.bounds = this.computeBounds(this.polygons);
        } catch (e) {
            console.error('TacticalMap: Error loading polygons', e);
        }
    }

    private computeBounds(polygons: Map<string, GeoFeature>) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const feature of polygons.values()) {
            const coords = feature.geometry.coordinates;
            const rings = feature.geometry.type === 'Polygon' ? [coords] : coords;
            for (const poly of rings) {
                for (const ring of poly) {
                    for (const [x, y] of ring) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }
        }
        return { minX, minY, maxX, maxY };
    }

    render(state: GameState): HTMLCanvasElement {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Paper substrate
        this.ctx.fillStyle = NATO_TOKENS.paper;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Base map + control (river clipping deferred — requires coordinate-space alignment fix per preferences)
        this.renderBaseLayers();
        if (this.bounds && this.polygons.size > 0) {
            this.renderControlLayer(state);
        }
        if (this.bounds && this.controlZones.length > 0) {
            this.renderControlZones();
        }

        // 4. Draw Frontlines (Layer 2: thick black dashed where control flips) — only in war phase
        const isWarPhase = state.meta.phase === 'phase_i' || state.meta.phase === 'phase_ii';
        if (isWarPhase && this.bounds && this.polygons.size > 0 && this.settlementEdges.length > 0) {
            this.renderFrontlines(state);
        }

        // 5. Draw zoom level indicator
        this.drawZoomIndicator();

        return this.canvas;
    }

    /**
     * Cycle through zoom levels
     */
    cycleZoom() {
        this.zoomLevel = ((this.zoomLevel + 1) % 3) as 0 | 1 | 2;
    }

    /**
     * Get current zoom level
     */
    getZoomLevel(): number {
        return this.zoomLevel;
    }

    /**
     * Draw zoom level indicator
     */
    private drawZoomIndicator() {
        const labels = ['STRATEGIC', 'OPERATIONAL', 'TACTICAL'];
        const label = labels[this.zoomLevel];

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'top';

        const padding = 10;
        const x = this.canvas.width - padding;
        const y = padding;

        // Background
        const metrics = this.ctx.measureText(label);
        this.ctx.fillRect(x - metrics.width - 8, y, metrics.width + 16, 24);

        // Text
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(label, x - 4, y + 6);

        this.ctx.restore();
    }

    /**
     * Resolve viewer GeoJSON sid (e.g. "S100013") + municipality_id to master sid format
     * used in political_controllers ("10014:100013"). Viewer uses S+source_id; master uses mun_code:source_id.
     */
    private getMasterSidForLookup(feature: GeoFeature): string | null {
        const sid = feature.properties?.sid;
        const munId = feature.properties?.municipality_id;
        if (!sid) return null;
        if (munId != null && typeof munId === 'number') {
            const sourceId = sid.startsWith('S') ? sid.slice(1) : sid;
            return `${munId}:${sourceId}`;
        }
        return sid;
    }

    private renderControlLayer(state: GameState) {
        const controllers = state.political_controllers ?? {};
        const SIDE_COLORS: Record<string, string> = {
            RBiH: factionFill('RBiH'),
            RS: factionFill('RS'),
            HRHB: factionFill('HRHB'),
            null: 'rgba(100, 100, 100, 0.1)'
        };

        for (const [, feature] of this.polygons.entries()) {
            const lookupSid = this.getMasterSidForLookup(feature);
            const controller = lookupSid ? (controllers[lookupSid] || 'null') : 'null';
            const color = SIDE_COLORS[controller] || SIDE_COLORS['null'];
            this.drawPolygonFeature(feature, color);
        }
    }

    /** Centroid of polygon exterior ring (first ring). */
    private getPolygonCentroid(feature: GeoFeature): [number, number] | null {
        const coords = feature.geometry.coordinates;
        const rings = feature.geometry.type === 'Polygon' ? [coords] : coords;
        const ring = rings[0]?.[0];
        if (!ring || ring.length < 2) return null;
        let sx = 0, sy = 0, n = 0;
        for (const [x, y] of ring) {
            sx += x;
            sy += y;
            n++;
        }
        return n ? [sx / n, sy / n] : null;
    }

    /** Layer 1 overlay: Control zone boundaries (concave hull per faction). */
    private renderControlZones() {
        const project = this.getProjection();
        const factionColor: Record<string, string> = {
            RBiH: factionFill('RBiH', 0.15),
            RS: factionFill('RS', 0.15),
            HRHB: factionFill('HRHB', 0.15)
        };
        for (const f of this.controlZones) {
            const faction = f.properties?.faction;
            const color = faction ? factionColor[faction] : 'rgba(0,0,0,0.05)';
            const rings = f.geometry?.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry?.coordinates;
            if (!rings) continue;
            this.ctx.fillStyle = color;
            this.ctx.strokeStyle = faction ? (factionColor[faction].replace('0.15', '0.4')) : 'rgba(0,0,0,0.2)';
            this.ctx.lineWidth = 1;
            for (const ring of rings) {
                const exterior = ring[0];
                if (!exterior || exterior.length < 2) continue;
                this.ctx.beginPath();
                for (let i = 0; i < exterior.length; i++) {
                    const [sx, sy] = project(exterior[i][0], exterior[i][1]);
                    if (i === 0) this.ctx.moveTo(sx, sy);
                    else this.ctx.lineTo(sx, sy);
                }
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
            }
        }
    }

    /** Layer 2: Frontlines — thick black dashed between settlements where control flips. */
    private renderFrontlines(state: GameState) {
        const frontEdges = computeFrontEdges(state, this.settlementEdges);
        if (frontEdges.length === 0) return;

        const masterSidToFeature = new Map<string, GeoFeature>();
        for (const [, feature] of this.polygons.entries()) {
            const masterSid = this.getMasterSidForLookup(feature);
            if (masterSid) masterSidToFeature.set(masterSid, feature);
        }

        const project = this.getProjection();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([8, 6]);

        for (const edge of frontEdges) {
            const fa = masterSidToFeature.get(edge.a);
            const fb = masterSidToFeature.get(edge.b);
            const ca = fa ? this.getPolygonCentroid(fa) : null;
            const cb = fb ? this.getPolygonCentroid(fb) : null;
            if (!ca || !cb) continue;
            const [sx0, sy0] = project(ca[0], ca[1]);
            const [sx1, sy1] = project(cb[0], cb[1]);
            this.ctx.beginPath();
            this.ctx.moveTo(sx0, sy0);
            this.ctx.lineTo(sx1, sy1);
            this.ctx.stroke();
        }

        this.ctx.setLineDash([]);
    }

    private renderBaseLayers() {
        if (!this.bounds || this.baseFeatures.length === 0) return;

        // Render in order: Rivers -> Roads -> Settlements (markers/labels); skip boundary (used for clip only)

        // Rivers (hydrography - Dusty Blue)
        this.ctx.strokeStyle = NATO_TOKENS.hydrography;
        this.ctx.lineWidth = 1.5;
        this.baseFeatures.filter((f: any) => f.properties?.role === 'river').forEach((f: any) => this.drawLineFeature(f));

        // Roads (MSR high contrast, secondary gray)
        this.baseFeatures.filter((f: any) => f.properties?.role === 'road').forEach((f: any) => {
            if (f.properties.nato_class === 'MSR') {
                this.ctx.strokeStyle = NATO_TOKENS.MSR;
                this.ctx.lineWidth = 2.0;
            } else {
                this.ctx.strokeStyle = NATO_TOKENS.secondaryRoad;
                this.ctx.lineWidth = 0.8;
            }
            this.drawLineFeature(f);
        });

        // Settlements
        this.baseFeatures.filter((f: any) => f.properties?.role === 'settlement').forEach((f: any) => {
            this.drawSettlementMarker(f);
        });
    }

    private drawLineFeature(feature: any) {
        const project = this.getProjection();
        const coords = feature.geometry.coordinates;
        const lines = feature.geometry.type === 'LineString' ? [coords] : coords;

        this.ctx.beginPath();
        for (const line of lines) {
            for (let i = 0; i < line.length; i++) {
                const [sx, sy] = project(line[i][0], line[i][1]);
                if (i === 0) this.ctx.moveTo(sx, sy);
                else this.ctx.lineTo(sx, sy);
            }
        }
        this.ctx.stroke();
    }

    private drawSettlementMarker(feature: any) {
        const project = this.getProjection();
        const [sx, sy] = project(feature.geometry.coordinates[0], feature.geometry.coordinates[1]);
        const natoClass = feature.properties.nato_class;
        const name = feature.properties.name;

        // Draw marker
        this.ctx.beginPath();
        if (natoClass === 'URBAN_CENTER') {
            this.ctx.fillStyle = '#D1A7A7'; // Muted red
            this.ctx.arc(sx, sy, 4, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        } else if (natoClass === 'TOWN') {
            this.ctx.fillStyle = '#000';
            this.ctx.arc(sx, sy, 2, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            this.ctx.fillStyle = '#555';
            this.ctx.arc(sx, sy, 1, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Labels at higher zoom
        if (this.zoomLevel >= 1 && (natoClass === 'URBAN_CENTER' || natoClass === 'TOWN')) {
            this.ctx.fillStyle = '#000';
            this.ctx.font = natoClass === 'URBAN_CENTER' ? 'bold 12px Courier New' : '10px Courier New';
            this.ctx.fillText(name, sx + 5, sy - 5);
        }
    }

    private getProjection() {
        if (!this.bounds) return (x: number, y: number) => [x, y];
        let { minX, minY, maxX, maxY } = this.bounds;

        const zoomFactors = [1, 2.5, 5];
        const zoomFactor = zoomFactors[this.zoomLevel];

        if (zoomFactor > 1) {
            const centerX = minX + (maxX - minX) * this.zoomCenter.x;
            const centerY = minY + (maxY - minY) * this.zoomCenter.y;
            const rangeX = (maxX - minX) / zoomFactor;
            const rangeY = (maxY - minY) / zoomFactor;
            minX = centerX - rangeX / 2;
            maxX = centerX + rangeX / 2;
            minY = centerY - rangeY / 2;
            maxY = centerY + rangeY / 2;
        }

        const padding = 100;
        const availableW = this.canvas.width - padding * 2;
        const availableH = this.canvas.height - padding * 2;
        const scale = Math.min(availableW / (maxX - minX), availableH / (maxY - minY));

        const offsetX = (this.canvas.width - (maxX - minX) * scale) / 2;
        const offsetY = (this.canvas.height - (maxY - minY) * scale) / 2;

        return (x: number, y: number) => [
            (x - minX) * scale + offsetX,
            (y - minY) * scale + offsetY
        ];
    }

    private drawPolygonFeature(feature: GeoFeature, color: string) {
        const project = this.getProjection();
        const coords = feature.geometry.coordinates;
        const polys = feature.geometry.type === 'Polygon' ? [coords] : coords;

        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 0.5;

        for (const poly of polys) {
            this.ctx.beginPath();
            for (const ring of poly) {
                for (let i = 0; i < ring.length; i++) {
                    const [sx, sy] = project(ring[i][0], ring[i][1]);
                    if (i === 0) this.ctx.moveTo(sx, sy);
                    else this.ctx.lineTo(sx, sy);
                }
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        }
    }
}
