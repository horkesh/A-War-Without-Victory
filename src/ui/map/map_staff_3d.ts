/**
 * Staff Map — 3D Three.js viewer (Military Topographic Theme)
 * Parchment-style terrain with ink rivers/roads, settlement area tints.
 * Reads engine-produced data files; no imports from project source.
 *
 * Data sources:
 *   /data/derived/terrain/heightmap_3d_viewer.json       (1024×1024 DEM)
 *   /data/derived/terrain/osm_waterways_snapshot_h6_2.geojson
 *   /data/derived/terrain/osm_roads_snapshot_h6_2.geojson
 *   /data/derived/settlements_wgs84_1990.geojson
 *   /runs/<run_id>/final_save.json  (optional, via ?run=<id>)
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// Constants & URLs
// ---------------------------------------------------------------------------
const HEIGHTMAP_URL = '/data/derived/terrain/heightmap_3d_viewer.json';
const WATERWAYS_URL = '/data/derived/terrain/osm_waterways_snapshot_h6_2.geojson';
const ROADS_URL = '/data/derived/terrain/osm_roads_snapshot_h6_2.geojson';
const SETTLEMENTS_URL = '/data/derived/settlements_wgs84_1990.geojson';
const BIH_BORDER_URL = '/data/source/boundaries/bih_adm0.geojson';

const WORLD_SCALE = 2.0;
const VERT_EXAG = 0.00022;     // gentle atlas relief (2424m peak → 0.53 world units)
const BIH_CENTER_LON = (15.62 + 19.72) / 2;  // 17.67
const BIH_CENTER_LAT = (42.46 + 45.37) / 2;  // 43.915

// ---------------------------------------------------------------------------
// TypeScript interfaces
// ---------------------------------------------------------------------------

interface HeightmapData {
    bbox: [number, number, number, number];
    width: number;
    height: number;
    elevations: number[];
}

interface SettlementProperties {
    sid: string;
    settlement_name: string;
    mun1990_id: string;
    population_total: number;
    population_bosniaks: number;
    population_serbs: number;
    population_croats: number;
}

interface GeoFeature {
    type: 'Feature';
    geometry: { type: string; coordinates: number[][][] | number[][][][] };
    properties: SettlementProperties;
}

interface SettlementsGeoJSON {
    type: 'FeatureCollection';
    features: GeoFeature[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface LineGeoJSON { type: 'FeatureCollection'; features: Array<{ geometry: { type: string; coordinates: any }; properties: Record<string, unknown> }> }

type FactionId = 'RS' | 'RBiH' | 'HRHB' | null;

interface FormationRecord {
    id: string; faction: string; name: string; kind: string;
    personnel: number; cohesion: number; fatigue: number;
    posture: string; hq_sid: string; status: string;
    corps_id?: string;
}

interface CorpsAggregate {
    formation: FormationRecord;
    totalPersonnel: number;
    brigadeCount: number;
    childIds: string[];
    dominantPosture: string;
}

interface FormationEntry {
    sprite: THREE.Sprite;
    formationId: string;
    kind: 'corps' | 'brigade';
    corpsId?: string;
    baseScaleX: number;
    baseScaleY: number;
}

interface GameSave {
    political_controllers: Record<string, FactionId>;
    formations: Record<string, FormationRecord>;
    brigade_aor: Record<string, string | null>;
    turn?: number; week?: number; date?: string;
}

// ---------------------------------------------------------------------------
// Coordinate helpers
// ---------------------------------------------------------------------------

function wgsToWorld(lon: number, lat: number, elevM: number): [number, number, number] {
    return [
        (lon - BIH_CENTER_LON) * WORLD_SCALE,
        elevM * VERT_EXAG,
        -(lat - BIH_CENTER_LAT) * WORLD_SCALE,
    ];
}

function sampleHeight(hm: HeightmapData, lon: number, lat: number): number {
    const fx = (lon - hm.bbox[0]) / (hm.bbox[2] - hm.bbox[0]) * (hm.width - 1);
    const fy = (hm.bbox[3] - lat) / (hm.bbox[3] - hm.bbox[1]) * (hm.height - 1);
    const x0 = Math.max(0, Math.min(hm.width - 1, Math.floor(fx)));
    const x1 = Math.min(hm.width - 1, x0 + 1);
    const y0 = Math.max(0, Math.min(hm.height - 1, Math.floor(fy)));
    const y1 = Math.min(hm.height - 1, y0 + 1);
    const dx = fx - x0;
    const dy = fy - y0;
    const s = (i: number, j: number) => hm.elevations[j * hm.width + i] ?? 0;
    return s(x0, y0) * (1 - dx) * (1 - dy) + s(x1, y0) * dx * (1 - dy)
        + s(x0, y1) * (1 - dx) * dy + s(x1, y1) * dx * dy;
}

/**
 * Smooth heightmap elevations in-place with multiple box-blur passes.
 */
function smoothHeightmap(hm: HeightmapData, passes = 3, radius = 2): void {
    const { width: w, height: h, elevations } = hm;
    const buf = new Float64Array(w * h);

    for (let pass = 0; pass < passes; pass++) {
        // Horizontal pass
        for (let y = 0; y < h; y++) {
            let sum = 0;
            let count = 0;
            for (let x = 0; x <= radius && x < w; x++) {
                sum += elevations[y * w + x]!;
                count++;
            }
            for (let x = 0; x < w; x++) {
                buf[y * w + x] = sum / count;
                const right = x + radius + 1;
                if (right < w) { sum += elevations[y * w + right]!; count++; }
                const left = x - radius;
                if (left >= 0) { sum -= elevations[y * w + left]!; count--; }
            }
        }
        for (let i = 0; i < w * h; i++) elevations[i] = buf[i]!;

        // Vertical pass
        for (let x = 0; x < w; x++) {
            let sum = 0;
            let count = 0;
            for (let y = 0; y <= radius && y < h; y++) {
                sum += elevations[y * w + x]!;
                count++;
            }
            for (let y = 0; y < h; y++) {
                buf[y * w + x] = sum / count;
                const bot = y + radius + 1;
                if (bot < h) { sum += elevations[bot * w + x]!; count++; }
                const top = y - radius;
                if (top >= 0) { sum -= elevations[top * w + x]!; count--; }
            }
        }
        for (let i = 0; i < w * h; i++) elevations[i] = buf[i]!;
    }
}

// ---------------------------------------------------------------------------
// Staff map elevation palette — natural atlas hypsometric tint
// Green lowlands → tan foothills → brown mountains → grey peaks
// ---------------------------------------------------------------------------

function staffElevationRGB(elev: number): [number, number, number] {
    // Sea / near-zero elevation → blue water (Adriatic coast, DEM edges)
    if (elev < 2) return [160, 195, 220];

    const stops: [number, number, number, number][] = [
        [2, 148, 191, 139],   // rich green (river valleys / lowlands)
        [80, 165, 200, 142],   // yellow-green (low plains)
        [200, 195, 212, 148],   // pale green (gentle hills)
        [400, 220, 211, 156],   // green-tan transition
        [600, 222, 198, 145],   // warm tan (foothills)
        [800, 210, 178, 128],   // light brown
        [1000, 195, 160, 112],   // medium brown (hills)
        [1300, 178, 142, 98],   // earthy brown
        [1600, 165, 130, 92],   // dark brown (mountains)
        [2000, 158, 138, 118],   // grey-brown (high mountain)
        [2500, 185, 180, 172],   // pale grey (peaks / rock)
    ];
    if (elev <= stops[0]![0]) return [stops[0]![1], stops[0]![2], stops[0]![3]];
    if (elev >= stops[stops.length - 1]![0]) {
        const l = stops[stops.length - 1]!;
        return [l[1], l[2], l[3]];
    }
    for (let i = 0; i < stops.length - 1; i++) {
        const [e0, r0, g0, b0] = stops[i]!;
        const [e1, r1, g1, b1] = stops[i + 1]!;
        if (elev >= e0 && elev < e1) {
            const t = (elev - e0) / (e1 - e0);
            return [
                Math.round(r0 + (r1 - r0) * t),
                Math.round(g0 + (g1 - g0) * t),
                Math.round(b0 + (b1 - b0) * t),
            ];
        }
    }
    return [200, 190, 160];
}

// ---------------------------------------------------------------------------
// Canvas helpers
// ---------------------------------------------------------------------------

function makeCanvasProjection(bbox: [number, number, number, number], w: number, h: number) {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    return {
        x: (lon: number) => ((lon - minLon) / (maxLon - minLon)) * w,
        y: (lat: number) => ((maxLat - lat) / (maxLat - minLat)) * h,
    };
}

// ---------------------------------------------------------------------------
// Staff map base texture builder
// ---------------------------------------------------------------------------

/**
 * Build the staff map base texture:
 * 1. Parchment elevation coloring
 * 2. Rivers (ink-blue lines)
 * 3. Roads (ink-sepia lines)
 * 4. Settlement built-up area tints (military topo style)
 */
function buildBaseTexture(
    hm: HeightmapData,
    waterways: LineGeoJSON | null,
    roads: LineGeoJSON | null,
    settlements: SettlementsGeoJSON,
    borderRings: number[][][],
): { texture: THREE.CanvasTexture; centroids: Map<string, [number, number]> } {
    const TEX_W = 8192;
    const TEX_H = 8192;
    const canvas = new OffscreenCanvas(TEX_W, TEX_H);
    const ctx = canvas.getContext('2d')!;
    const proj = makeCanvasProjection(hm.bbox, TEX_W, TEX_H);

    // ── Pass 1: Hypsometric elevation base (atlas-style) ──
    const imgData = ctx.createImageData(TEX_W, TEX_H);
    const data = imgData.data;
    for (let py = 0; py < TEX_H; py++) {
        for (let px = 0; px < TEX_W; px++) {
            const lon = hm.bbox[0] + (px / (TEX_W - 1)) * (hm.bbox[2] - hm.bbox[0]);
            const lat = hm.bbox[3] - (py / (TEX_H - 1)) * (hm.bbox[3] - hm.bbox[1]);
            const elev = sampleHeight(hm, lon, lat);
            const [r, g, b] = staffElevationRGB(elev);
            const i = (py * TEX_W + px) * 4;
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);

    // ── Pass 2: Rivers (atlas blue) ──────────────────────────
    if (waterways) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        // Faint bleed/halo for rivers
        for (const feature of waterways.features) {
            const wtype = (feature.properties.waterway as string) ?? '';
            if (wtype !== 'river') continue;
            drawLineFeature(ctx, feature.geometry, proj, 'rgba(60, 130, 190, 0.12)', 7.0);
        }
        // Major rivers — vivid blue core
        for (const feature of waterways.features) {
            const wtype = (feature.properties.waterway as string) ?? '';
            if (wtype !== 'river') continue;
            drawLineFeature(ctx, feature.geometry, proj, 'rgba(30, 100, 180, 0.90)', 3.0);
        }
        // Streams — thinner, lighter blue
        for (const feature of waterways.features) {
            const wtype = (feature.properties.waterway as string) ?? '';
            if (wtype !== 'stream') continue;
            drawLineFeature(ctx, feature.geometry, proj, 'rgba(50, 120, 180, 0.45)', 1.2);
        }
        ctx.restore();
    }

    // ── Pass 3: Roads (subtle dark lines) ──────────────────
    if (roads) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        const ROAD_STYLES: Record<string, { color: string; width: number }> = {
            motorway: { color: 'rgba(120, 50, 30, 0.55)', width: 2.5 },
            trunk: { color: 'rgba(120, 50, 30, 0.40)', width: 2.0 },
            primary: { color: 'rgba(130, 80, 50, 0.30)', width: 1.5 },
            secondary: { color: 'rgba(140, 110, 70, 0.18)', width: 1.0 },
            tertiary: { color: 'rgba(140, 110, 70, 0.10)', width: 0.6 },
        };
        for (const feature of roads.features) {
            const hwy = (feature.properties.highway as string) ?? '';
            const style = ROAD_STYLES[hwy];
            if (!style) continue;
            drawLineFeature(ctx, feature.geometry, proj, style.color, style.width);
        }
        ctx.restore();
    }

    // ── Pass 4: Settlement built-up area tints (military topo style) ──
    const centroids = new Map<string, [number, number]>();
    // First collect centroids for all settlements
    for (const feature of settlements.features) {
        const props = feature.properties;
        if (!props || !feature.geometry) continue;
        const rings = ringsFromSettlement(feature.geometry);
        if (rings.length === 0) continue;
        const centroid = ringCentroid(rings[0]!);
        centroids.set(props.sid, centroid);
    }

    // Paint settlement polygons as area tints
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (const feature of settlements.features) {
        const props = feature.properties;
        if (!props || !feature.geometry) continue;
        const pop = props.population_total ?? 0;
        if (pop < 100) continue; // skip very tiny hamlets
        const rings = ringsFromSettlement(feature.geometry);
        // Larger cities get darker fill — warm grey tint for atlas style
        const fillColor = pop > 15000
            ? 'rgba(180, 160, 130, 0.60)'
            : pop > 5000
                ? 'rgba(190, 175, 145, 0.45)'
                : pop > 1000
                    ? 'rgba(200, 185, 160, 0.30)'
                    : 'rgba(210, 200, 175, 0.18)';
        for (const ring of rings) {
            if (ring.length < 3) continue;
            ctx.beginPath();
            ctx.moveTo(proj.x(ring[0]![0]!), proj.y(ring[0]![1]!));
            for (let i = 1; i < ring.length; i++) {
                ctx.lineTo(proj.x(ring[i]![0]!), proj.y(ring[i]![1]!));
            }
            ctx.closePath();
            ctx.fillStyle = fillColor;
            ctx.fill();
        }
    }
    ctx.restore();

    // ── Pass 5: BiH national border ──────────────────────
    if (borderRings.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(40, 40, 50, 0.80)';
        ctx.lineWidth = 10.0;
        ctx.setLineDash([20, 8]); // bold dashed border line
        for (const ring of borderRings) {
            if (ring.length < 3) continue;
            ctx.beginPath();
            ctx.moveTo(proj.x(ring[0]![0]!), proj.y(ring[0]![1]!));
            for (let i = 1; i < ring.length; i++) {
                ctx.lineTo(proj.x(ring[i]![0]!), proj.y(ring[i]![1]!));
            }
            ctx.closePath();
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;

    return { texture, centroids };
}

/** Draw a GeoJSON LineString or MultiLineString onto canvas. */
function drawLineFeature(
    ctx: OffscreenCanvasRenderingContext2D,
    geom: { type: string; coordinates: unknown },
    proj: { x: (lon: number) => number; y: (lat: number) => number },
    color: string,
    width: number,
): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (geom.type === 'LineString') {
        drawCoordLine(ctx, geom.coordinates as number[][], proj);
    } else if (geom.type === 'MultiLineString') {
        for (const line of geom.coordinates as number[][][]) {
            drawCoordLine(ctx, line, proj);
        }
    }
}

function drawCoordLine(
    ctx: OffscreenCanvasRenderingContext2D,
    coords: number[][],
    proj: { x: (lon: number) => number; y: (lat: number) => number },
): void {
    if (coords.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(proj.x(coords[0]![0]!), proj.y(coords[0]![1]!));
    for (let i = 1; i < coords.length; i++) {
        ctx.lineTo(proj.x(coords[i]![0]!), proj.y(coords[i]![1]!));
    }
    ctx.stroke();
}

// ---------------------------------------------------------------------------
// Faction control overlay texture (separate, toggleable)
// ---------------------------------------------------------------------------

function buildFactionTexture(
    hm: HeightmapData,
    settlements: SettlementsGeoJSON,
    controllers: Map<string, FactionId> | null,
): THREE.CanvasTexture {
    const TEX_W = 4096;
    const TEX_H = 4096;
    const canvas = new OffscreenCanvas(TEX_W, TEX_H);
    const ctx = canvas.getContext('2d')!;
    const proj = makeCanvasProjection(hm.bbox, TEX_W, TEX_H);
    ctx.clearRect(0, 0, TEX_W, TEX_H);

    // Wargame:ALB–style vivid faction fills
    const FACTION_FILL: Record<string, string> = {
        RS: 'rgba(180, 60, 60, 0.32)',
        RBiH: 'rgba(60, 140, 60, 0.32)',
        HRHB: 'rgba(50, 90, 170, 0.32)',
        null: 'rgba(80, 80, 80, 0.04)',
    };
    // Build a per-settlement faction lookup
    const settlementFactions = new Map<string, string>();
    for (const feature of settlements.features) {
        const props = feature.properties;
        if (!props) continue;
        const faction: FactionId = controllers
            ? (controllers.get(props.sid) ?? null)
            : factionFromEthnicity(props);
        settlementFactions.set(props.sid, faction ?? 'null');
    }

    // Pass 1: Fill all settlement polygons with faction colors
    for (const feature of settlements.features) {
        const props = feature.properties;
        if (!props || !feature.geometry) continue;
        const fk = settlementFactions.get(props.sid) ?? 'null';
        const rings = ringsFromSettlement(feature.geometry);
        for (const ring of rings) {
            if (ring.length < 3) continue;
            ctx.beginPath();
            ctx.moveTo(proj.x(ring[0]![0]!), proj.y(ring[0]![1]!));
            for (let i = 1; i < ring.length; i++) {
                ctx.lineTo(proj.x(ring[i]![0]!), proj.y(ring[i]![1]!));
            }
            ctx.closePath();
            ctx.fillStyle = FACTION_FILL[fk] ?? FACTION_FILL['null']!;
            ctx.fill();
        }
    }

    // No settlement border strokes — fills only

    const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    return texture;
}

// ---------------------------------------------------------------------------
// AoR overlay — brigade operational zones shown at close zoom
// ---------------------------------------------------------------------------

/**
 * Build a texture showing brigade AoR zones. Each assigned settlement gets a
 * semi-transparent outline in the owning brigade's faction color, creating a
 * "operational responsibility" view that reveals military geography.
 */
function buildAoRTexture(
    hm: HeightmapData,
    settlements: SettlementsGeoJSON,
    save: GameSave,
): THREE.CanvasTexture {
    const TEX_W = 4096, TEX_H = 4096;
    const canvas = new OffscreenCanvas(TEX_W, TEX_H);
    const ctx = canvas.getContext('2d')!;
    const proj = makeCanvasProjection(hm.bbox, TEX_W, TEX_H);
    ctx.clearRect(0, 0, TEX_W, TEX_H);

    // Build brigade→faction lookup
    const brigadeFaction = new Map<string, string>();
    for (const [fid, f] of Object.entries(save.formations)) {
        if (f.kind === 'brigade') brigadeFaction.set(fid, f.faction);
    }

    // Faction AoR colors — distinct from political control, more vivid & saturated
    const AOR_STROKE: Record<string, string> = {
        RS: 'rgba(255, 70, 70, 0.55)',
        RBiH: 'rgba(70, 220, 100, 0.55)',
        HRHB: 'rgba(70, 140, 255, 0.55)',
    };
    const AOR_FILL: Record<string, string> = {
        RS: 'rgba(255, 70, 70, 0.08)',
        RBiH: 'rgba(70, 220, 100, 0.08)',
        HRHB: 'rgba(70, 140, 255, 0.08)',
    };

    // Assign each settlement to its AoR brigade's faction
    const settlementAoR = new Map<string, string>(); // sid → faction
    for (const [sid, brigadeId] of Object.entries(save.brigade_aor ?? {})) {
        if (!brigadeId) continue;
        const faction = brigadeFaction.get(brigadeId);
        if (faction) settlementAoR.set(sid, faction);
    }

    // Paint AoR zones — subtle fill + thin border per settlement
    for (const feature of settlements.features) {
        const props = feature.properties;
        if (!props || !feature.geometry) continue;
        const faction = settlementAoR.get(props.sid);
        if (!faction) continue;
        const rings = ringsFromSettlement(feature.geometry);
        for (const ring of rings) {
            if (ring.length < 3) continue;
            ctx.beginPath();
            ctx.moveTo(proj.x(ring[0]![0]!), proj.y(ring[0]![1]!));
            for (let i = 1; i < ring.length; i++) {
                ctx.lineTo(proj.x(ring[i]![0]!), proj.y(ring[i]![1]!));
            }
            ctx.closePath();
            ctx.fillStyle = AOR_FILL[faction] ?? 'rgba(100,100,100,0.05)';
            ctx.fill();
            ctx.strokeStyle = AOR_STROKE[faction] ?? 'rgba(100,100,100,0.2)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }

    const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    return texture;
}

// ---------------------------------------------------------------------------
// Settlement faction helpers & polygon ring helpers
// ---------------------------------------------------------------------------

function factionFromEthnicity(props: SettlementProperties): FactionId {
    const { population_bosniaks: b, population_serbs: s, population_croats: c } = props;
    if (b > s && b > c) return 'RBiH';
    if (s > b && s > c) return 'RS';
    if (c > b && c > s) return 'HRHB';
    return null;
}

type Ring = number[][];

function ringsFromSettlement(geom: { type: string; coordinates: number[][][] | number[][][][] }): Ring[] {
    if (geom.type === 'Polygon') {
        const coords = geom.coordinates as number[][][];
        return coords.length ? [coords[0]!] : [];
    }
    if (geom.type === 'MultiPolygon') {
        const coords = geom.coordinates as number[][][][];
        return coords.map((p) => p[0]!).filter((r) => r && r.length > 0);
    }
    return [];
}

function ringCentroid(ring: Ring): [number, number] {
    let sLon = 0, sLat = 0, n = 0;
    for (const [lon, lat] of ring) {
        if (lon !== undefined && lat !== undefined) { sLon += lon; sLat += lat; n++; }
    }
    return n > 0 ? [sLon / n, sLat / n] : [BIH_CENTER_LON, BIH_CENTER_LAT];
}

// ---------------------------------------------------------------------------
// Terrain mesh builder
// ---------------------------------------------------------------------------

function buildTerrainMesh(data: HeightmapData, baseTexture: THREE.CanvasTexture): THREE.Mesh {
    const { width, height, elevations, bbox } = data;
    const [minLon, , maxLon, maxLat] = bbox;
    const numVerts = width * height;
    const positions = new Float32Array(numVerts * 3);
    const uvs = new Float32Array(numVerts * 2);

    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            const idx = j * width + i;
            const lon = minLon + (i / (width - 1)) * (maxLon - minLon);
            const lat = maxLat - (j / (height - 1)) * (bbox[3] - bbox[1]);
            const elev = elevations[idx] ?? 0;
            const [wx, wy, wz] = wgsToWorld(lon, lat, elev);
            positions[idx * 3] = wx;
            positions[idx * 3 + 1] = wy;
            positions[idx * 3 + 2] = wz;
            uvs[idx * 2] = i / (width - 1);
            uvs[idx * 2 + 1] = 1 - j / (height - 1);
        }
    }

    const numCells = (width - 1) * (height - 1);
    const indices = new Uint32Array(numCells * 6);
    let ii = 0;
    for (let j = 0; j < height - 1; j++) {
        for (let i = 0; i < width - 1; i++) {
            const a = j * width + i;
            const b = a + 1, c = (j + 1) * width + i, d = c + 1;
            indices[ii++] = a; indices[ii++] = c; indices[ii++] = b;
            indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        map: baseTexture,
        roughness: 0.95,    // matte paper finish
        metalness: 0.0,
    });

    return new THREE.Mesh(geometry, material);
}

/** Build a second mesh slightly above the terrain for the faction overlay. */
function buildFactionOverlayMesh(terrainMesh: THREE.Mesh, factionTexture: THREE.CanvasTexture): THREE.Mesh {
    const mat = new THREE.MeshBasicMaterial({
        map: factionTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
    });
    const overlay = new THREE.Mesh(terrainMesh.geometry.clone(), mat);
    overlay.position.y = 0.005;
    overlay.name = 'factionOverlay';
    return overlay;
}

// ---------------------------------------------------------------------------
// Dynamic city label sprites (LOD) — atlas style
// ---------------------------------------------------------------------------

interface CityEntry {
    sprite: THREE.Sprite;
    pop: number;
    maxCamY: number;
    maxDist: number;
    baseScaleY: number;
    baseScaleX: number;
}

function buildDynamicCityLabels(
    hm: HeightmapData,
    centroids: Map<string, [number, number]>,
    settlements: SettlementsGeoJSON,
): { group: THREE.Group; entries: CityEntry[] } {
    const group = new THREE.Group();
    group.name = 'cityLabels';
    const entries: CityEntry[] = [];

    let sarajevoAdded = false;
    const cities: Array<{ name: string; pop: number; lon: number; lat: number }> = [];

    for (const feature of settlements.features) {
        const props = feature.properties;
        if (!props) continue;
        const centroid = centroids.get(props.sid);
        if (!centroid) continue;
        const pop = props.population_total ?? 0;

        if (props.settlement_name.startsWith('Sarajevo Dio')) {
            if (!sarajevoAdded) {
                sarajevoAdded = true;
                cities.push({ name: 'SARAJEVO', pop: 500000, lon: 18.41, lat: 43.86 });
            }
            continue;
        }

        if (pop < 5000) continue;
        cities.push({ name: props.settlement_name, pop, lon: centroid[0], lat: centroid[1] });
    }

    cities.sort((a, b) => b.pop - a.pop);

    for (const city of cities) {
        const maxCamY = city.pop > 80000 ? Infinity
            : city.pop > 40000 ? 12
                : city.pop > 15000 ? 6
                    : 3.5;
        const maxDist = city.pop > 80000 ? Infinity
            : city.pop > 40000 ? 8.0
                : city.pop > 15000 ? 4.0
                    : 2.5;

        // 2× resolution for crisp text (renders at double size, sprite stays same world scale)
        const LABEL_DPR = 2;
        const baseW = city.pop > 40000 ? 512 : city.pop > 5000 ? 384 : 256;
        const baseH = city.pop > 40000 ? 48 : city.pop > 5000 ? 40 : 32;
        const W = baseW * LABEL_DPR;
        const H = baseH * LABEL_DPR;
        const canvas = new OffscreenCanvas(W, H);
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, W, H);

        // Font sizing & weight matching StaffMapTheme:
        // URBAN_CENTER (pop > ~15k): bold, larger  |  TOWN: regular weight, smaller
        const baseFontSize = city.pop > 80000 ? 26
            : city.pop > 40000 ? 20
                : city.pop > 15000 ? 16
                    : 13;
        const fontSize = baseFontSize * LABEL_DPR;
        const fontWeight = city.pop > 15000 ? 'bold' : '';
        ctx.font = `${fontWeight} ${fontSize}px 'Palatino Linotype', 'Georgia', 'Times New Roman', serif`.trim();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Parchment-tinted halo for readability (matches StaffMapTheme PARCHMENT.base)
        ctx.strokeStyle = 'rgba(244, 232, 200, 0.85)';
        ctx.lineWidth = 3.5 * LABEL_DPR;
        ctx.lineJoin = 'round';
        ctx.strokeText(city.name, W / 2, H / 2);

        // Ink fill — dark for cities, medium for towns (matches StaffMapTheme INK)
        ctx.fillStyle = city.pop > 15000 ? '#2a1a0a' : '#5a3a1a';
        ctx.fillText(city.name, W / 2, H / 2);

        const imgData = ctx.getImageData(0, 0, W, H);
        const tex = new THREE.DataTexture(new Uint8Array(imgData.data.buffer), W, H, THREE.RGBAFormat);
        tex.needsUpdate = true;
        tex.flipY = true;

        const mat = new THREE.SpriteMaterial({
            map: tex,
            depthTest: false,
            transparent: true,
            sizeAttenuation: true,
        });
        const sprite = new THREE.Sprite(mat);

        const elev = sampleHeight(hm, city.lon, city.lat);
        const [wx, wy, wz] = wgsToWorld(city.lon, city.lat, elev);
        sprite.position.set(wx, wy + 0.12, wz);

        const baseScaleX = city.pop > 80000 ? 1.3
            : city.pop > 40000 ? 1.0
                : city.pop > 15000 ? 0.75
                    : 0.55;
        const baseScaleY = baseScaleX * (H / W);
        sprite.scale.set(baseScaleX, baseScaleY, 1);
        sprite.visible = false;

        group.add(sprite);
        entries.push({ sprite, pop: city.pop, maxCamY, maxDist, baseScaleY, baseScaleX });
    }

    console.log(`[staff-3d] City labels: ${entries.length} prepared`);
    return { group, entries };
}

function updateCityLabelVisibility(
    entries: CityEntry[],
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    labelsEnabled: boolean,
): void {
    if (!labelsEnabled) return;
    const camY = camera.position.y;
    const target = controls.target;
    const scaleFactor = Math.max(0.5, Math.min(1.3, 2.2 / Math.sqrt(Math.max(camY, 0.3))));

    for (let i = 0; i < entries.length; i++) {
        const e = entries[i]!;
        if (camY >= e.maxCamY) { e.sprite.visible = false; continue; }
        if (e.maxDist < Infinity) {
            const dx = e.sprite.position.x - target.x;
            const dz = e.sprite.position.z - target.z;
            const distSq = dx * dx + dz * dz;
            if (distSq > e.maxDist * e.maxDist) { e.sprite.visible = false; continue; }
        }
        e.sprite.visible = true;
        e.sprite.scale.set(e.baseScaleX * scaleFactor, e.baseScaleY * scaleFactor, 1);
        const mat = e.sprite.material as THREE.SpriteMaterial;
        if (e.maxCamY < Infinity) {
            const fadeZone = e.maxCamY * 0.25;
            const fade = Math.min(1.0, (e.maxCamY - camY) / fadeZone);
            mat.opacity = fade;
        } else {
            mat.opacity = 1.0;
        }
    }
}

// ---------------------------------------------------------------------------
// Formation LOD — corps at strategic zoom, brigades on zoom-in
// ---------------------------------------------------------------------------

/** Camera Y above which only corps are shown; below which brigades appear */
const FORMATION_LOD_THRESHOLD = 4.0;
/** Fraction of threshold defining the crossfade zone */
const FORMATION_FADE_ZONE = 0.20;

function buildCorpsAggregates(save: GameSave): Map<string, CorpsAggregate> {
    const aggregates = new Map<string, CorpsAggregate>();
    const formations = Object.values(save.formations);
    const postureCounts = new Map<string, Map<string, number>>();

    // Seed with all corps_asset and army_hq formations
    for (const f of formations) {
        if (f.kind === 'corps_asset' || f.kind === 'army_hq') {
            aggregates.set(f.id, { formation: f, totalPersonnel: 0, brigadeCount: 0, childIds: [], dominantPosture: 'defend' });
            postureCounts.set(f.id, new Map());
        }
    }

    // Group brigades under their parent corps
    for (const f of formations) {
        if (f.kind !== 'brigade' || !f.corps_id) continue;
        const agg = aggregates.get(f.corps_id);
        if (!agg) continue;
        agg.totalPersonnel += f.personnel ?? 0;
        agg.brigadeCount++;
        agg.childIds.push(f.id);
        const pc = postureCounts.get(f.corps_id)!;
        pc.set(f.posture, (pc.get(f.posture) ?? 0) + 1);
    }

    // Sort childIds for determinism; compute dominant posture
    for (const [corpsId, agg] of aggregates) {
        agg.childIds.sort();
        const pc = postureCounts.get(corpsId)!;
        let maxCount = 0;
        for (const [posture, count] of pc) {
            if (count > maxCount) { maxCount = count; agg.dominantPosture = posture; }
        }
    }

    return aggregates;
}

function updateFormationVisibility(
    entries: FormationEntry[],
    camera: THREE.PerspectiveCamera,
): void {
    if (entries.length === 0) return;

    const camY = camera.position.y;
    const threshold = FORMATION_LOD_THRESHOLD;
    const fadeStart = threshold * (1 - FORMATION_FADE_ZONE);
    const fadeRange = threshold - fadeStart;

    // Corps scale: stay readable at distance, don't balloon at close zoom
    const corpsScale = Math.max(0.8, Math.min(1.15, 2.0 / Math.sqrt(Math.max(camY, 0.5))));
    // Brigade scale: shrink faster than linear to counteract perspective magnification
    // pow(1.5) ensures they visually shrink on screen as you zoom in, settling into hexes
    // At threshold (camY=4) → 1.0, at camY=2 → 0.35, at camY=1 → 0.125, at camY=0.5 → 0.044
    const camRatio = Math.min(camY, threshold) / threshold;
    const brigadeScale = Math.max(0.06, Math.pow(camRatio, 1.5));

    for (const e of entries) {
        const mat = e.sprite.material as THREE.SpriteMaterial;
        const sf = e.kind === 'corps' ? corpsScale : brigadeScale;

        if (e.kind === 'corps') {
            // Corps: visible at strategic zoom (camY >= fadeStart), fade in across the zone
            if (camY < fadeStart) {
                e.sprite.visible = false;
            } else {
                e.sprite.visible = true;
                const t = Math.min(1.0, (camY - fadeStart) / fadeRange);
                mat.opacity = t;
                e.sprite.scale.set(e.baseScaleX * sf, e.baseScaleY * sf, 1);
            }
        } else {
            // Brigade: visible at operational zoom (camY < threshold), fade out across the zone
            if (camY >= threshold) {
                e.sprite.visible = false;
            } else if (camY >= fadeStart) {
                e.sprite.visible = true;
                const t = 1.0 - Math.min(1.0, (camY - fadeStart) / fadeRange);
                mat.opacity = t;
                e.sprite.scale.set(e.baseScaleX * sf, e.baseScaleY * sf, 1);
            } else {
                e.sprite.visible = true;
                mat.opacity = 1.0;
                e.sprite.scale.set(e.baseScaleX * sf, e.baseScaleY * sf, 1);
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Formation billboard markers — atlas style
// ---------------------------------------------------------------------------

function paintCorpsCounter(
    ctx: OffscreenCanvasRenderingContext2D, w: number, h: number,
    agg: CorpsAggregate,
): void {
    const formation = agg.formation;

    // Faction colors — matching mockup: saturated, distinct per faction
    const factionColor: Record<string, string> = {
        RS: '#b43232', RBiH: '#37884b', HRHB: '#326eaa',
    };
    const fc = factionColor[formation.faction] ?? '#666';

    // ── Background ──
    ctx.fillStyle = 'rgba(10, 10, 22, 0.92)';
    ctx.fillRect(0, 0, w, h);

    // ── Left faction bar (12px wide) ──
    ctx.fillStyle = fc;
    ctx.fillRect(0, 0, 12, h);

    // ── Outer border (faction colored) ──
    ctx.strokeStyle = fc;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);

    // ── Inner dim frame ──
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 6, w - 20, h - 12);

    // ── Diagonal NATO combat unit line ──
    ctx.strokeStyle = fc;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(14, h - 14); ctx.lineTo(w - 6, 14);
    ctx.stroke();

    // ── Formation name — bright green (all factions) ──
    ctx.fillStyle = '#00ff88';
    ctx.font = `bold 20px 'Courier New', Courier, monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const maxNameLen = Math.floor((w - 40) / 12);  // ~18 chars for 256px
    const nameStr = formation.name.length > maxNameLen
        ? formation.name.slice(0, maxNameLen - 1) + '\u2026'
        : formation.name;
    ctx.fillText(nameStr, 20, 20);

    // ── Faction tag — faction color ──
    ctx.fillStyle = fc;
    ctx.font = `13px 'Courier New', Courier, monospace`;
    ctx.fillText(formation.faction, 20, 46);

    // ── Strength line — color coded ──
    const persStr = agg.totalPersonnel >= 1000
        ? `${(agg.totalPersonnel / 1000).toFixed(1)}k`
        : `${agg.totalPersonnel}`;
    const strLabel = agg.totalPersonnel > 15000 ? 'STRONG' : agg.totalPersonnel > 5000 ? 'MODERATE' : 'WEAK';
    const strColor = agg.totalPersonnel > 15000 ? '#00ff88' : agg.totalPersonnel > 5000 ? '#ffab00' : '#ff4444';
    ctx.fillStyle = strColor;
    ctx.font = `bold 16px 'Courier New', Courier, monospace`;
    ctx.fillText(`STR: ${persStr} (${strLabel})`, 20, 72);

    // ── Posture line — color coded ──
    const postureLabel = (agg.dominantPosture ?? 'defend').toUpperCase();
    const postureColors: Record<string, string> = {
        ATTACK: '#ff4444', PROBE: '#ffab00', DEFEND: '#4a8aff',
        ELASTIC_DEFENSE: '#8a6aff', WITHDRAW: '#ff8844',
    };
    ctx.fillStyle = postureColors[postureLabel] ?? '#4a8aff';
    ctx.font = `14px 'Courier New', Courier, monospace`;
    ctx.fillText(`PST: ${postureLabel}`, 20, 96);

    // ── Brigade count (bottom area) ──
    ctx.fillStyle = 'rgba(180, 200, 220, 0.6)';
    ctx.font = `12px 'Courier New', Courier, monospace`;
    ctx.fillText(`\u00d7${agg.brigadeCount} bde`, 20, 118);

    // ── Corner cross (top-right military marker) ──
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    const ccx = w - 20, ccy = 20, ccs = 8;
    ctx.beginPath();
    ctx.moveTo(ccx - ccs, ccy); ctx.lineTo(ccx + ccs, ccy);
    ctx.moveTo(ccx, ccy - ccs); ctx.lineTo(ccx, ccy + ccs);
    ctx.stroke();
}

function paintFormationCounter(
    ctx: OffscreenCanvasRenderingContext2D, w: number, h: number, formation: FormationRecord
): void {
    // Desaturated staff map faction colors
    const factionColors: Record<string, string> = {
        RS: 'rgba(140, 50, 50, 0.6)', RBiH: 'rgba(60, 100, 60, 0.6)', HRHB: 'rgba(50, 80, 120, 0.6)',
    };
    const postureColors: Record<string, string> = {
        defend: '#4a6a3a', probe: '#5a6a4a', attack: '#7a3a2a', elastic_defense: '#5a4a6a',
    };
    const factionCol = factionColors[formation.faction] ?? 'rgba(60, 70, 80, 0.4)';
    const postureCol = postureColors[formation.posture] ?? '#5a4a3a';

    // Light background
    ctx.fillStyle = 'rgba(240, 244, 248, 0.93)';
    ctx.fillRect(0, 0, w, h);
    // Faction stripe
    ctx.fillStyle = factionCol;
    ctx.fillRect(0, 0, 6, h);
    // Border
    ctx.strokeStyle = 'rgba(60, 80, 100, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.75, 0.75, w - 1.5, h - 1.5);

    // NATO symbol
    const symbolX = w / 2 + 3, symbolY = h * 0.36;
    ctx.strokeStyle = '#1a2a3a';
    ctx.lineWidth = 1.5;
    if (formation.kind === 'brigade') {
        ctx.strokeRect(symbolX - 10, symbolY - 7, 20, 14);
    } else if (formation.kind === 'corps' || formation.kind === 'corps_asset') {
        ctx.beginPath();
        ctx.moveTo(symbolX - 12, symbolY - 6); ctx.lineTo(symbolX - 4, symbolY + 6);
        ctx.moveTo(symbolX - 4, symbolY - 6); ctx.lineTo(symbolX - 12, symbolY + 6);
        ctx.moveTo(symbolX + 4, symbolY - 6); ctx.lineTo(symbolX + 12, symbolY + 6);
        ctx.moveTo(symbolX + 12, symbolY - 6); ctx.lineTo(symbolX + 4, symbolY + 6);
        ctx.stroke();
    } else if (formation.kind === 'army_hq') {
        ctx.beginPath();
        for (let xi = -1; xi <= 1; xi++) {
            const xc = symbolX + xi * 10;
            ctx.moveTo(xc - 5, symbolY - 6); ctx.lineTo(xc + 5, symbolY + 6);
            ctx.moveTo(xc + 5, symbolY - 6); ctx.lineTo(xc - 5, symbolY + 6);
        }
        ctx.stroke();
    }

    // Name
    ctx.fillStyle = '#1a2a3a';
    ctx.font = `bold 10px 'IBM Plex Mono', 'Consolas', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const nameStr = formation.name.length > 14 ? formation.name.slice(0, 13) + '\u2026' : formation.name;
    ctx.fillText(nameStr, w / 2 + 3, h * 0.72);

    // Personnel badge
    const pStr = formation.personnel >= 1000 ? `${(formation.personnel / 1000).toFixed(1)}k` : `${formation.personnel}`;
    ctx.fillStyle = postureCol;
    ctx.fillRect(w - 30, h - 14, 28, 12);
    ctx.fillStyle = '#e8eef4';
    ctx.font = `8px 'IBM Plex Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(pStr, w - 16, h - 8);
}

function buildBrigadeSprite(formation: FormationRecord): THREE.Sprite {
    const W = 128, H = 72;
    const canvas = new OffscreenCanvas(W, H);
    const ctx = canvas.getContext('2d')!;
    paintFormationCounter(ctx, W, H, formation);
    const imgData = ctx.getImageData(0, 0, W, H);
    const tex = new THREE.DataTexture(new Uint8Array(imgData.data.buffer), W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.needsUpdate = true;
    tex.flipY = true;
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, opacity: 0 });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.55, 0.31, 1);
    return sprite;
}

function buildCorpsSprite(agg: CorpsAggregate): THREE.Sprite {
    const W = 256, H = 160;
    const canvas = new OffscreenCanvas(W, H);
    const ctx = canvas.getContext('2d')!;
    paintCorpsCounter(ctx, W, H, agg);
    const imgData = ctx.getImageData(0, 0, W, H);
    const tex = new THREE.DataTexture(new Uint8Array(imgData.data.buffer), W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.needsUpdate = true;
    tex.flipY = true;
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.85, 0.53, 1);
    return sprite;
}

function buildFormationLODLayer(
    hm: HeightmapData, save: GameSave, centroids: Map<string, [number, number]>,
): { group: THREE.Group; entries: FormationEntry[] } {
    const group = new THREE.Group();
    group.name = 'formationGroup';
    const entries: FormationEntry[] = [];
    const aggregates = buildCorpsAggregates(save);

    // ── Corps sprites (visible at strategic zoom) ──
    for (const [corpsId, agg] of aggregates) {
        const f = agg.formation;
        if (f.status !== 'active') continue;
        if (!f.hq_sid) continue;
        // Skip empty corps with no subordinate brigades
        if (agg.brigadeCount === 0) continue;
        const centroid = centroids.get(f.hq_sid);
        if (!centroid) continue;
        const [lon, lat] = centroid;
        const elev = sampleHeight(hm, lon, lat);
        const [wx, wy, wz] = wgsToWorld(lon, lat, elev);
        const sprite = buildCorpsSprite(agg);
        sprite.position.set(wx, wy + 0.35, wz);
        sprite.name = `corps_${corpsId}`;
        sprite.visible = true;  // Corps start visible
        group.add(sprite);
        entries.push({
            sprite, formationId: corpsId, kind: 'corps',
            baseScaleX: 0.85, baseScaleY: 0.53,
        });
    }

    // ── Brigade sprites (visible at operational zoom) ──
    for (const formation of Object.values(save.formations)) {
        if (formation.status !== 'active') continue;
        if (formation.kind !== 'brigade') continue;
        if (!formation.hq_sid) continue;
        const centroid = centroids.get(formation.hq_sid);
        if (!centroid) continue;
        const [lon, lat] = centroid;
        const elev = sampleHeight(hm, lon, lat);
        const [wx, wy, wz] = wgsToWorld(lon, lat, elev);
        const sprite = buildBrigadeSprite(formation);
        sprite.position.set(wx, wy + 0.25, wz);
        sprite.name = `brigade_${formation.id}`;
        sprite.visible = false;  // Brigades start hidden
        group.add(sprite);
        entries.push({
            sprite, formationId: formation.id, kind: 'brigade',
            corpsId: formation.corps_id,
            baseScaleX: 0.55, baseScaleY: 0.31,
        });
    }

    console.log(`[staff-3d] Formation LOD: ${aggregates.size} corps, ${entries.filter(e => e.kind === 'brigade').length} brigades`);
    return { group, entries };
}

// ---------------------------------------------------------------------------
// Stem lines — thin vertical lines from counters to terrain (tactical marker)
// ---------------------------------------------------------------------------

interface StemEntry {
    line: THREE.Line;
    dot: THREE.Sprite;       // ground connection marker
    kind: 'corps' | 'brigade';
}

function buildStemLines(entries: FormationEntry[]): { group: THREE.Group; stems: StemEntry[] } {
    const group = new THREE.Group();
    group.name = 'stemLines';
    const stems: StemEntry[] = [];

    // Build small dot textures for ground markers
    function makeDotTexture(color: string, size: number): THREE.DataTexture {
        const canvas = new OffscreenCanvas(size, size);
        const ctx = canvas.getContext('2d')!;
        const r = size / 2;
        // Outer glow
        const grad = ctx.createRadialGradient(r, r, r * 0.15, r, r, r);
        grad.addColorStop(0, color);
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        // Center pip
        ctx.beginPath();
        ctx.arc(r, r, r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.7;
        ctx.fill();
        const imgData = ctx.getImageData(0, 0, size, size);
        const tex = new THREE.DataTexture(new Uint8Array(imgData.data.buffer), size, size, THREE.RGBAFormat);
        tex.needsUpdate = true;
        tex.flipY = true;
        return tex;
    }

    const corpsDotTex = makeDotTexture('rgba(0, 255, 136, 0.8)', 32);
    const brigadeDotTex = makeDotTexture('rgba(160, 180, 200, 0.6)', 24);

    const corpsLineMat = new THREE.LineBasicMaterial({
        color: 0x00ff88, transparent: true, opacity: 0.55, depthTest: false,
    });
    const brigadeLineMat = new THREE.LineBasicMaterial({
        color: 0xaabbcc, transparent: true, opacity: 0.40, depthTest: false,
    });

    for (const e of entries) {
        const pos = e.sprite.position;
        const terrainY = Math.max(0, pos.y - (e.kind === 'corps' ? 0.35 : 0.25));

        // --- Stem line (single line, WebGL only renders 1px but brighter now) ---
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(pos.x, pos.y, pos.z),
            new THREE.Vector3(pos.x, terrainY, pos.z),
        ]);
        const mat = e.kind === 'corps' ? corpsLineMat : brigadeLineMat;
        const line = new THREE.Line(geometry, mat.clone());
        line.visible = e.sprite.visible;
        group.add(line);

        // --- Ground dot marker (connects stem to terrain) ---
        const dotTex = e.kind === 'corps' ? corpsDotTex : brigadeDotTex;
        const dotMat = new THREE.SpriteMaterial({
            map: dotTex, transparent: true, depthTest: false,
            opacity: e.kind === 'corps' ? 0.7 : 0.5,
        });
        const dot = new THREE.Sprite(dotMat);
        const dotSize = e.kind === 'corps' ? 0.12 : 0.06;
        dot.scale.set(dotSize, dotSize, 1);
        dot.position.set(pos.x, terrainY + 0.005, pos.z);  // Slightly above terrain
        dot.visible = e.sprite.visible;
        group.add(dot);

        stems.push({ line, dot, kind: e.kind });
    }

    return { group, stems };
}

function updateStemVisibility(
    stems: StemEntry[],
    formationEntries: FormationEntry[],
): void {
    for (let i = 0; i < stems.length && i < formationEntries.length; i++) {
        const stem = stems[i]!;
        const entry = formationEntries[i]!;
        const vis = entry.sprite.visible;
        const eMat = entry.sprite.material as THREE.SpriteMaterial;

        // Sync line visibility + opacity
        stem.line.visible = vis;
        const lineMat = stem.line.material as THREE.LineBasicMaterial;
        lineMat.opacity = eMat.opacity * (stem.kind === 'corps' ? 0.55 : 0.40);

        // Sync ground dot visibility + opacity
        stem.dot.visible = vis;
        const dotMat = stem.dot.material as THREE.SpriteMaterial;
        dotMat.opacity = eMat.opacity * (stem.kind === 'corps' ? 0.7 : 0.5);
    }
}

// ---------------------------------------------------------------------------
// HTML overlay builders — atlas theme
// ---------------------------------------------------------------------------

function buildInfoPanel(runId: string | null, save: GameSave | null, baselineMode: boolean): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'staff-info-panel';
    panel.style.cssText = 'position:absolute;top:12px;left:12px;z-index:10;padding:10px 14px;background:rgba(240,244,248,0.92);border:1px solid rgba(60,80,100,0.3);font:11px "IBM Plex Mono",monospace;color:#2a3a4a;pointer-events:none;line-height:1.7';
    let statusLine = '';
    if (baselineMode || !save) {
        statusLine = 'BASELINE: ETHNIC MAJORITY CONTROL';
    } else {
        const parts = [
            save.turn !== undefined ? `TURN ${save.turn}` : '',
            save.week !== undefined ? `WEEK ${save.week}` : '',
            save.date ?? '',
        ].filter(Boolean);
        statusLine = parts.join(' \u2014 ') || `RUN: ${runId}`;
    }
    panel.innerHTML = `
    <div style="color:#1a2a3a;font-weight:bold;letter-spacing:0.08em">STAFF MAP \u2014 3D</div>
    <div style="color:#8a6a3a;font-size:10px;letter-spacing:0.06em">A WAR WITHOUT VICTORY</div>
    <div style="color:#2a3a4a;margin-top:4px;font-size:10px">${statusLine}</div>
  `;
    return panel;
}

function buildRunLoader(currentRunId: string | null): HTMLElement {
    const c = document.createElement('div');
    c.id = 'staff-run-loader';
    c.style.cssText = 'position:absolute;top:12px;right:12px;z-index:10;padding:8px 12px;background:rgba(240,244,248,0.92);border:1px solid rgba(60,80,100,0.3);font:11px "IBM Plex Mono",monospace;color:#2a3a4a;display:flex;align-items:center;gap:8px';
    const label = document.createElement('span');
    label.textContent = 'RUN:';
    label.style.color = '#8a6a3a';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'run_id';
    input.value = currentRunId ?? '';
    input.style.cssText = 'background:rgba(245,248,252,0.9);border:1px solid rgba(60,80,100,0.3);color:#1a2a3a;font:11px "IBM Plex Mono",monospace;padding:3px 7px;width:140px;outline:none';
    const btn = document.createElement('button');
    btn.textContent = 'LOAD';
    btn.style.cssText = 'background:rgba(220,230,240,0.9);border:1px solid rgba(60,80,100,0.3);color:#2a3a4a;font:11px "IBM Plex Mono",monospace;padding:3px 10px;cursor:pointer';
    btn.addEventListener('click', () => {
        const id = input.value.trim();
        if (!id) return;
        const params = new URLSearchParams(window.location.search);
        params.set('run', id);
        window.location.search = params.toString();
    });
    c.appendChild(label);
    c.appendChild(input);
    c.appendChild(btn);
    return c;
}

function buildLayerToggles(
    onToggleFaction: (on: boolean) => void,
    onToggleCityLabels: (on: boolean) => void,
    onToggleAoR?: (on: boolean) => void,
): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;top:80px;right:12px;z-index:10;padding:8px 12px;background:rgba(240,244,248,0.92);border:1px solid rgba(60,80,100,0.3);font:11px "IBM Plex Mono",monospace;color:#2a3a4a;display:flex;flex-direction:column;gap:6px';

    function makeToggle(label: string, defaultOn: boolean, cb: (on: boolean) => void): HTMLElement {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;color:#2a3a4a';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = defaultOn;
        checkbox.style.cssText = 'accent-color:#4a7a9a';
        checkbox.addEventListener('change', () => cb(checkbox.checked));
        row.appendChild(checkbox);
        row.appendChild(document.createTextNode(label));
        return row;
    }

    container.appendChild(makeToggle('FACTION CONTROL', true, onToggleFaction));
    container.appendChild(makeToggle('CITY LABELS', true, onToggleCityLabels));
    if (onToggleAoR) {
        container.appendChild(makeToggle('BRIGADE AOR', true, onToggleAoR));
    }
    return container;
}

function buildHUD(settlementCount: number, formationCount: number, hasGameState: boolean): HTMLElement {
    const hud = document.createElement('div');
    hud.id = 'staff-hud';
    hud.style.cssText = 'position:absolute;bottom:0;left:0;right:0;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:7px 16px;background:rgba(240,244,248,0.92);border-top:1px solid rgba(60,80,100,0.3);font:11px "IBM Plex Mono",monospace;color:#2a3a4a';
    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex;align-items:center;gap:14px';
    for (const { label, color } of [
        { label: 'RS', color: 'rgba(180, 60, 60, 0.6)' },
        { label: 'RBiH', color: 'rgba(60, 140, 60, 0.6)' },
        { label: 'HRHB', color: 'rgba(50, 90, 170, 0.6)' },
    ]) {
        const item = document.createElement('span');
        item.style.cssText = 'display:flex;align-items:center;gap:5px';
        item.innerHTML = `<span style="display:inline-block;width:12px;height:12px;background:${color};border:1px solid rgba(60,80,100,0.2)"></span>${label}`;
        legend.appendChild(item);
    }
    const hint = document.createElement('div');
    hint.style.cssText = 'color:#8a6a3a;text-align:center';
    hint.textContent = 'WASD to pan \u00b7 Drag to rotate \u00b7 Scroll to zoom \u00b7 Right-drag to pan';
    const stats = document.createElement('div');
    stats.style.cssText = 'color:#8a6a3a;text-align:right';
    stats.textContent = hasGameState
        ? `SETTLEMENTS: ${settlementCount} | FORMATIONS: ${formationCount}`
        : `SETTLEMENTS: ${settlementCount}`;
    hud.appendChild(legend);
    hud.appendChild(hint);
    hud.appendChild(stats);
    return hud;
}

// ---------------------------------------------------------------------------
// Status message helpers
// ---------------------------------------------------------------------------

function showMessage(msg: string): void {
    const el = document.getElementById('message');
    if (el) { el.textContent = msg; el.classList.add('visible'); }
}

function showFadingMessage(msg: string, delayMs = 2000): void {
    const el = document.getElementById('message');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
    el.style.transition = '';
    el.style.opacity = '1';
    setTimeout(() => {
        el.style.transition = 'opacity 0.8s ease';
        el.style.opacity = '0';
        setTimeout(() => { el.classList.remove('visible'); el.style.opacity = ''; el.style.transition = ''; }, 850);
    }, delayMs);
}

// ---------------------------------------------------------------------------
// Formation tooltip for click interaction
// ---------------------------------------------------------------------------

function buildFormationTooltip(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'formation-tooltip';
    el.style.cssText = [
        'position:absolute', 'z-index:20', 'display:none',
        'padding:10px 14px', 'min-width:180px', 'max-width:260px',
        'background:rgba(10,10,22,0.94)', 'border:1px solid rgba(0,255,136,0.4)',
        'border-left:4px solid #00ff88',
        'font:12px "Courier New", Courier, monospace', 'color:#c0d8e0',
        'pointer-events:none', 'line-height:1.6',
        'box-shadow:0 4px 16px rgba(0,0,0,0.5)',
    ].join(';');
    return el;
}

function showFormationTooltip(
    tooltip: HTMLElement,
    entry: FormationEntry,
    save: GameSave,
    aggregates: Map<string, CorpsAggregate>,
    pageX: number, pageY: number,
    containerRect: DOMRect,
): void {
    const factionColors: Record<string, string> = {
        RS: '#b43232', RBiH: '#37884b', HRHB: '#326eaa',
    };
    const postureColors: Record<string, string> = {
        attack: '#ff4444', probe: '#ffab00', defend: '#4a8aff',
        elastic_defense: '#8a6aff', withdraw: '#ff8844',
    };

    let html = '';
    if (entry.kind === 'corps') {
        const agg = aggregates.get(entry.formationId);
        if (!agg) { tooltip.style.display = 'none'; return; }
        const f = agg.formation;
        const fc = factionColors[f.faction] ?? '#666';
        const pst = (agg.dominantPosture ?? 'defend').toLowerCase();
        const pstColor = postureColors[pst] ?? '#4a8aff';
        const strLabel = agg.totalPersonnel > 15000 ? 'STRONG' : agg.totalPersonnel > 5000 ? 'MODERATE' : 'WEAK';
        const strColor = agg.totalPersonnel > 15000 ? '#00ff88' : agg.totalPersonnel > 5000 ? '#ffab00' : '#ff4444';
        const persStr = agg.totalPersonnel >= 1000 ? `${(agg.totalPersonnel / 1000).toFixed(1)}k` : `${agg.totalPersonnel}`;
        html = `
      <div style="color:#00ff88;font-weight:bold;font-size:13px;margin-bottom:4px">${f.name}</div>
      <div style="color:${fc};font-size:11px;margin-bottom:6px">${f.faction} \u2022 ${f.kind.toUpperCase()}</div>
      <div style="color:${strColor};font-size:12px"><b>STR:</b> ${persStr} (${strLabel})</div>
      <div style="color:${pstColor};font-size:12px"><b>PST:</b> ${pst.toUpperCase()}</div>
      <div style="color:rgba(180,200,220,0.7);font-size:11px;margin-top:4px">\u00d7${agg.brigadeCount} brigades</div>
      <div style="color:rgba(160,170,180,0.5);font-size:10px;margin-top:2px">HQ: ${f.hq_sid}</div>
    `;
        tooltip.style.borderLeftColor = fc;
    } else {
        const f = save.formations[entry.formationId];
        if (!f) { tooltip.style.display = 'none'; return; }
        const fc = factionColors[f.faction] ?? '#666';
        const pstColor = postureColors[f.posture] ?? '#4a8aff';
        const persStr = f.personnel >= 1000 ? `${(f.personnel / 1000).toFixed(1)}k` : `${f.personnel}`;
        const cohPct = Math.round(f.cohesion ?? 0);
        const fatPct = Math.round(f.fatigue ?? 0);
        html = `
      <div style="color:#00ff88;font-weight:bold;font-size:13px;margin-bottom:4px">${f.name}</div>
      <div style="color:${fc};font-size:11px;margin-bottom:6px">${f.faction} \u2022 BRIGADE</div>
      <div style="color:#c0d8e0;font-size:12px"><b>PRS:</b> ${persStr}</div>
      <div style="color:${pstColor};font-size:12px"><b>PST:</b> ${(f.posture ?? 'defend').toUpperCase()}</div>
      <div style="color:#88bbdd;font-size:12px"><b>COH:</b> ${cohPct}%</div>
      <div style="color:#cc8844;font-size:12px"><b>FAT:</b> ${fatPct}%</div>
      <div style="color:rgba(160,170,180,0.5);font-size:10px;margin-top:4px">HQ: ${f.hq_sid} \u2022 ${f.status}</div>
    `;
        tooltip.style.borderLeftColor = fc;
    }

    tooltip.innerHTML = html;
    tooltip.style.display = 'block';

    // Position: offset from cursor, keep within container bounds
    const x = pageX - containerRect.left + 16;
    const y = pageY - containerRect.top - 10;
    const maxX = containerRect.width - tooltip.offsetWidth - 10;
    const maxY = containerRect.height - tooltip.offsetHeight - 10;
    tooltip.style.left = `${Math.min(x, maxX)}px`;
    tooltip.style.top = `${Math.max(8, Math.min(y, maxY))}px`;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    const container = document.getElementById('staff-3d-container');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const runId = params.get('run');
    const saveFile = params.get('save') === 'initial' ? 'initial_save.json' : 'final_save.json';

    showMessage('LOADING DATA...');

    // ── Parallel fetch all data ──────────────────────────
    let heightmap: HeightmapData;
    let settlements: SettlementsGeoJSON;
    let waterways: LineGeoJSON | null = null;
    let roads: LineGeoJSON | null = null;
    let borderRings: number[][][] = []; // WGS84 [lon, lat] rings for BiH national border

    try {
        const [hmRes, stRes, wwRes, rdRes, borderRes] = await Promise.all([
            fetch(HEIGHTMAP_URL),
            fetch(SETTLEMENTS_URL),
            fetch(WATERWAYS_URL).catch(() => null),
            fetch(ROADS_URL).catch(() => null),
            fetch(BIH_BORDER_URL).catch(() => null),
        ]);

        if (!hmRes.ok) throw new Error(`Heightmap HTTP ${hmRes.status}`);
        heightmap = (await hmRes.json()) as HeightmapData;
        if (!heightmap.bbox || !heightmap.elevations) throw new Error('Invalid heightmap');

        if (!stRes.ok) throw new Error(`Settlements HTTP ${stRes.status}`);
        settlements = (await stRes.json()) as SettlementsGeoJSON;
        if (!settlements.features) throw new Error('Invalid settlements GeoJSON');

        if (wwRes && wwRes.ok) {
            try { waterways = (await wwRes.json()) as LineGeoJSON; } catch { /* optional */ }
        }
        if (rdRes && rdRes.ok) {
            try { roads = (await rdRes.json()) as LineGeoJSON; } catch { /* optional */ }
        }
        if (borderRes && borderRes.ok) {
            try {
                const borderGeo = await borderRes.json() as { features: Array<{ geometry: { type: string; coordinates: number[][][][] } }> };
                // Extract rings from MultiPolygon
                for (const f of borderGeo.features ?? []) {
                    if (f.geometry?.type === 'MultiPolygon') {
                        for (const poly of f.geometry.coordinates) {
                            for (const ring of poly) borderRings.push(ring);
                        }
                    } else if (f.geometry?.type === 'Polygon') {
                        for (const ring of (f.geometry as unknown as { coordinates: number[][][] }).coordinates) {
                            borderRings.push(ring);
                        }
                    }
                }
            } catch { /* optional */ }
        }
    } catch (e) {
        showMessage(`LOAD ERROR\n\n${(e as Error).message}\n\nnpm run dev:map`);
        return;
    }

    console.log(`[staff-3d] Loaded: heightmap ${heightmap.width}x${heightmap.height}, ${settlements.features.length} settlements, ${waterways?.features.length ?? 0} waterways, ${roads?.features.length ?? 0} roads`);

    // ── Smooth heightmap for gentle rolling terrain ──────
    smoothHeightmap(heightmap, 8, 5);
    console.log('[staff-3d] Heightmap smoothed (8 passes, radius 5)');

    // ── Build scene ──────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xc8d8e4);  // light blue-grey (atlas sea)
    // No fog — clean paper aesthetic

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 500);
    camera.position.set(0, 8, 4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NoToneMapping;  // clean, bright — no ACES
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement as unknown as HTMLElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 0, 0);
    // Prevent camera from rotating below the terrain surface
    controls.maxPolarAngle = Math.PI * 0.45;   // ~81° from vertical — never below horizon
    controls.minDistance = 0.3;                 // don't clip into terrain

    // Lighting — bright, even daylight
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);   // neutral white daylight
    sun.position.set(-3, 8, 4);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xf0f0f0, 0.7));       // neutral ambient
    scene.add(new THREE.HemisphereLight(0xf8f8ff, 0xd0d8c8, 0.4));

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    console.log(`[staff-3d] Max anisotropy: ${maxAniso}`);

    // ── Build base texture (staff map: terrain + rivers + roads + settlement tints) ──
    showMessage('BUILDING ATLAS...');
    const { texture: baseTexture, centroids } = buildBaseTexture(heightmap, waterways, roads, settlements, borderRings);
    baseTexture.anisotropy = maxAniso;

    // ── Build terrain mesh ────────────────────────────────
    showMessage('BUILDING TERRAIN...');
    const terrainMesh = buildTerrainMesh(heightmap, baseTexture);
    terrainMesh.name = 'terrain';
    scene.add(terrainMesh);

    // ── Build faction overlay (toggleable) ────────────────
    const factionTexture = buildFactionTexture(heightmap, settlements, null);
    factionTexture.anisotropy = maxAniso;
    const factionOverlay = buildFactionOverlayMesh(terrainMesh, factionTexture);
    scene.add(factionOverlay);

    // ── City labels (dynamic LOD) ──────────────────────────
    const { group: cityLabels, entries: cityLabelEntries } = buildDynamicCityLabels(heightmap, centroids, settlements);
    let cityLabelsEnabled = true;
    scene.add(cityLabels);

    // ── HTML overlay ──────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.id = 'staff-overlay';
    overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:5';
    container.style.position = 'relative';
    container.appendChild(overlay);

    let infoPanel = buildInfoPanel(runId, null, true);
    overlay.appendChild(infoPanel);

    const runLoader = buildRunLoader(runId);
    runLoader.style.pointerEvents = 'all';
    overlay.appendChild(runLoader);

    let aorEnabled = true;
    const layerToggles = buildLayerToggles(
        (on) => { factionOverlay.visible = on; },
        (on) => { cityLabels.visible = on; cityLabelsEnabled = on; },
        (on) => { aorEnabled = on; if (aorOverlay && !on) aorOverlay.visible = false; },
    );
    layerToggles.style.pointerEvents = 'all';
    overlay.appendChild(layerToggles);

    let formationCount = 0;
    let formationEntries: FormationEntry[] = [];
    let stemEntries: StemEntry[] = [];
    let aorOverlay: THREE.Mesh | null = null;
    let gameSave: GameSave | null = null;
    let corpsAggregates: Map<string, CorpsAggregate> = new Map();

    // ── Formation click interaction (screen-space picking + tooltip) ──
    const tooltip = buildFormationTooltip();
    overlay.appendChild(tooltip);

    // ── Game state (optional) ─────────────────────────────
    if (runId) {
        showMessage(`LOADING RUN: ${runId}...`);
        try {
            const saveRes = await fetch(`/runs/${runId}/${saveFile}`);
            if (!saveRes.ok) throw new Error(`HTTP ${saveRes.status}`);
            const save = (await saveRes.json()) as GameSave;

            const controllers = new Map<string, FactionId>();
            for (const [sid, faction] of Object.entries(save.political_controllers ?? {})) {
                controllers.set(sid, faction);
            }

            // Rebuild faction overlay with game state
            const gsFactionTex = buildFactionTexture(heightmap, settlements, controllers);
            gsFactionTex.anisotropy = maxAniso;
            const factionMat = factionOverlay.material as THREE.MeshBasicMaterial;
            if (factionMat.map) factionMat.map.dispose();
            factionMat.map = gsFactionTex;
            factionMat.needsUpdate = true;

            gameSave = save;
            corpsAggregates = buildCorpsAggregates(save);

            const { group: formationGroup, entries: fEntries } = buildFormationLODLayer(heightmap, save, centroids);
            formationEntries = fEntries;
            formationCount = formationGroup.children.length;
            scene.add(formationGroup);

            // ── AoR overlay (operational zoom only) ──
            const aorTex = buildAoRTexture(heightmap, settlements, save);
            aorTex.anisotropy = maxAniso;
            aorOverlay = buildFactionOverlayMesh(terrainMesh, aorTex);
            aorOverlay.position.y = 0.010;  // Above faction overlay
            aorOverlay.name = 'aorOverlay';
            aorOverlay.visible = false;  // Hidden at strategic zoom
            scene.add(aorOverlay);

            // ── Stem lines (thin vertical lines from counters to terrain) ──
            const { group: stemGroup, stems: stemList } = buildStemLines(formationEntries);
            stemEntries = stemList;
            scene.add(stemGroup);

            infoPanel.remove();
            infoPanel = buildInfoPanel(runId, save, false);
            overlay.appendChild(infoPanel);

            const hud = buildHUD(settlements.features.length, formationCount, true);
            overlay.appendChild(hud);
            showFadingMessage(`RUN LOADED: ${runId}\nFORMATIONS: ${formationCount}`, 2500);
        } catch (e) {
            console.warn('[staff-3d] Run load failed:', (e as Error).message);
            const hud = buildHUD(settlements.features.length, 0, false);
            overlay.appendChild(hud);
            showFadingMessage('RUN LOAD FAILED \u2014 Baseline mode', 3000);
        }
    } else {
        const hud = buildHUD(settlements.features.length, 0, false);
        overlay.appendChild(hud);
        showFadingMessage('READY \u2014 Baseline: ethnic majority control', 2500);
    }

    // ── Click handler for formation sprites ──────────────
    let clickStartTime = 0;
    let clickStartX = 0;
    let clickStartY = 0;

    renderer.domElement.addEventListener('mousedown', (e: MouseEvent) => {
        clickStartTime = performance.now();
        clickStartX = e.clientX;
        clickStartY = e.clientY;
    });

    renderer.domElement.addEventListener('mouseup', (e: MouseEvent) => {
        // Ignore drags (moved > 5px or held > 300ms)
        const dt = performance.now() - clickStartTime;
        const dx = e.clientX - clickStartX;
        const dy = e.clientY - clickStartY;
        if (dt > 300 || Math.sqrt(dx * dx + dy * dy) > 5) return;

        if (!gameSave || formationEntries.length === 0) return;

        // Screen-space picking — project each visible sprite to screen coords
        // and find the closest one to the click. Much more reliable than raycaster
        // for small sprites at distance.
        const rect = renderer.domElement.getBoundingClientRect();
        const clickScreenX = e.clientX - rect.left;
        const clickScreenY = e.clientY - rect.top;
        const screenW = rect.width;
        const screenH = rect.height;

        let bestEntry: FormationEntry | null = null;
        let bestDistSq = Infinity;
        const MAX_PICK_RADIUS = 60;  // px — max screen distance to count as a hit

        const projVec = new THREE.Vector3();
        for (const entry of formationEntries) {
            if (!entry.sprite.visible) continue;
            const mat = entry.sprite.material as THREE.SpriteMaterial;
            if (mat.opacity < 0.1) continue;  // skip near-invisible sprites

            // Project sprite world position → screen coordinates
            projVec.copy(entry.sprite.position);
            projVec.project(camera);
            const sx = (projVec.x * 0.5 + 0.5) * screenW;
            const sy = (-projVec.y * 0.5 + 0.5) * screenH;

            const ddx = sx - clickScreenX;
            const ddy = sy - clickScreenY;
            const distSq = ddx * ddx + ddy * ddy;

            if (distSq < bestDistSq && distSq < MAX_PICK_RADIUS * MAX_PICK_RADIUS) {
                bestDistSq = distSq;
                bestEntry = entry;
            }
        }

        if (bestEntry) {
            const containerRect = container!.getBoundingClientRect();
            showFormationTooltip(tooltip, bestEntry, gameSave!, corpsAggregates, e.clientX, e.clientY, containerRect);
            console.log(`[staff-3d] Clicked formation: ${bestEntry.formationId} (${bestEntry.kind}), dist=${Math.sqrt(bestDistSq).toFixed(1)}px`);
        } else {
            tooltip.style.display = 'none';
        }
    });

    // Hide tooltip on scroll/zoom
    renderer.domElement.addEventListener('wheel', () => { tooltip.style.display = 'none'; });

    // ESC closes tooltip
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') tooltip.style.display = 'none';
    });

    // ── WASD keyboard movement ──────────────────────────
    const keysDown = new Set<string>();
    const PAN_SPEED = 0.06;

    function computePanDelta(key: string): THREE.Vector3 | null {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        switch (key) {
            case 'w': case 'arrowup': return forward.multiplyScalar(PAN_SPEED);
            case 's': case 'arrowdown': return forward.multiplyScalar(-PAN_SPEED);
            case 'a': case 'arrowleft': return right.multiplyScalar(-PAN_SPEED);
            case 'd': case 'arrowright': return right.multiplyScalar(PAN_SPEED);
            default: return null;
        }
    }

    window.addEventListener('keydown', (e) => {
        if (e.target instanceof HTMLInputElement) return;
        const k = e.key.toLowerCase();
        keysDown.add(k);
        const d = computePanDelta(k);
        if (d) { camera.position.add(d); controls.target.add(d); }
    });
    window.addEventListener('keyup', (e) => { keysDown.delete(e.key.toLowerCase()); });

    function applyKeyboardPan(): void {
        keysDown.forEach((k) => {
            const d = computePanDelta(k);
            if (d) { camera.position.add(d); controls.target.add(d); }
        });
    }

    // ── Resize + render loop ──────────────────────────────
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    let frameCount = 0;
    (function animate() {
        requestAnimationFrame(animate);
        frameCount++;
        applyKeyboardPan();
        updateCityLabelVisibility(cityLabelEntries, camera, controls, cityLabelsEnabled);
        updateFormationVisibility(formationEntries, camera);

        // Sync stem line visibility with their parent formation entries
        if (stemEntries.length > 0) {
            updateStemVisibility(stemEntries, formationEntries);
        }

        // AoR overlay: fade in at operational zoom (below threshold), hidden at strategic
        if (aorOverlay && aorEnabled) {
            const camY = camera.position.y;
            const aorThreshold = FORMATION_LOD_THRESHOLD;
            if (camY >= aorThreshold) {
                aorOverlay.visible = false;
            } else {
                aorOverlay.visible = true;
                // Fade in as we zoom past the threshold
                const aorMat = aorOverlay.material as THREE.MeshBasicMaterial;
                const t = 1.0 - Math.min(1.0, camY / aorThreshold);
                aorMat.opacity = t * 0.8;  // max 80% to keep it subtle
            }
        }

        // Subtle pulse on corps counters — breathing glow at strategic zoom
        if (formationEntries.length > 0) {
            const pulse = 0.92 + 0.08 * Math.sin(frameCount * 0.025);
            for (const e of formationEntries) {
                if (e.kind !== 'corps' || !e.sprite.visible) continue;
                const mat = e.sprite.material as THREE.SpriteMaterial;
                // Only modulate if already opaque enough to be visible
                if (mat.opacity > 0.3) {
                    mat.opacity = Math.min(1.0, mat.opacity * pulse);
                }
            }
        }

        controls.update();
        renderer.render(scene, camera);
    })();
}

main();
