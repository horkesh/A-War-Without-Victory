/**
 * Tactical Sandbox Viewer — Interactive 3D Three.js viewer for sandbox gameplay.
 *
 * Fork of map_staff_3d.ts adapted for interactive tactical sandbox:
 *   - Slice-based region viewing (not full BiH)
 *   - Interactive mode system: SELECT / ATTACK / MOVE
 *   - Side panel UI (selection, orders, battle log, resources)
 *   - Turn advance with real engine integration
 *   - Attack order arrows (red 3D lines) and movement paths (blue 3D lines)
 *   - Settlement click detection (nearest centroid picking)
 *   - Contact-edge highlighting (red glowing shared boundary)
 *
 * Data sources:
 *   /data/derived/terrain/heightmap_3d_viewer.json       (1024x1024 DEM)
 *   /data/derived/terrain/osm_waterways_snapshot_h6_2.geojson
 *   /data/derived/terrain/osm_roads_snapshot_h6_2.geojson
 *   /data/derived/settlements_wgs84_1990.geojson
 *   /runs/<run_id>/initial_save.json  (optional, via ?run=<id>)
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Sandbox modules
import type { DeploymentState, DeploymentStatus, SandboxTurnReport } from './sandbox/sandbox_engine.js';
import { advanceSandboxTurn, DEPLOYED_MOVEMENT_RATE, UNDEPLOYED_MOVEMENT_RATE } from './sandbox/sandbox_engine.js';
import { DEFAULT_REGION, SANDBOX_REGIONS } from './sandbox/sandbox_scenarios.js';
import type { SliceData, SliceFormation } from './sandbox/sandbox_slice.js';
import { loadSliceData } from './sandbox/sandbox_slice.js';
import type { OrderEntry, SpawnTemplate } from './sandbox/sandbox_ui.js';
import {
    appendBattleLog,
    buildBattleLog,
    buildOrdersPanel,
    buildResourcePanel,
    buildSelectionPanel,
    buildSidePanel,
    buildSpawnPanel,
    buildToolbar,
    updateOrdersPanel,
    updateResourcePanel,
    updateSelectionPanel,
    updateSpawnPanel,
} from './sandbox/sandbox_ui.js';

// Equipment class templates for brigade spawning (pure data, browser-safe)
import type { EquipmentClass } from '../../state/recruitment_types.js';
import { EQUIPMENT_CLASS_TEMPLATES } from '../../state/recruitment_types.js';

// Terrain scalars for battle resolution (elevation, rivers, roads)
import type { TerrainScalarsData } from '../../map/terrain_scalars.js';

// ---------------------------------------------------------------------------
// Constants & URLs
// ---------------------------------------------------------------------------
const HEIGHTMAP_URL = '/data/derived/terrain/heightmap_3d_viewer.json';
const WATERWAYS_URL = '/data/derived/terrain/osm_waterways_snapshot_h6_2.geojson';
const ROADS_URL = '/data/derived/terrain/osm_roads_snapshot_h6_2.geojson';
const SETTLEMENTS_URL = '/data/derived/settlements_wgs84_1990.geojson';
const BIH_BORDER_URL = '/data/source/boundaries/bih_adm0.geojson';
const TERRAIN_SCALARS_URL = '/data/derived/terrain/settlements_terrain_scalars.json';

const WORLD_SCALE = 2.0;
const VERT_EXAG = 0.00022;     // gentle atlas relief (2424m peak -> 0.53 world units)

// Dynamic center — set after heightmap is cropped to the region bbox
let CENTER_LON = (15.62 + 19.72) / 2;  // default full-BiH: 17.67
let CENTER_LAT = (42.46 + 45.37) / 2;  // default full-BiH: 43.915

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
// Sandbox-specific types
// ---------------------------------------------------------------------------

type InteractionMode = 'select' | 'attack' | 'move';

interface MoveSelectionState {
    brigadeId: string;
    isUndeployed: boolean;
    maxSettlements: number;  // 1 if undeployed, floor(personnel/400) clamped [1,4] if deployed
    reachableSids: Set<string>;
    selectedSids: string[];
}

interface SandboxState {
    mode: InteractionMode;
    selectedFormationId: string | null;
    orders: OrderEntry[];
    turnNumber: number;
    sliceData: SliceData | null;
    /** Minimal GameState for engine calls */
    gameState: Record<string, unknown> | null;
    /** History of turn reports */
    turnReports: SandboxTurnReport[];
    /** Deployment states: tracks deployed/undeployed/transitioning brigades */
    deploymentStates: Record<string, DeploymentState>;
    /** Terrain scalars for battle resolution (elevation, rivers, roads) */
    terrainScalars: TerrainScalarsData | null;
    /** Multi-click move destination selection state */
    moveSelection: MoveSelectionState | null;
}

// ---------------------------------------------------------------------------
// Coordinate helpers
// ---------------------------------------------------------------------------

function wgsToWorld(lon: number, lat: number, elevM: number): [number, number, number] {
    return [
        (lon - CENTER_LON) * WORLD_SCALE,
        elevM * VERT_EXAG,
        -(lat - CENTER_LAT) * WORLD_SCALE,
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
 * Crop a heightmap to a region bounding box (with optional margin).
 * Returns a new HeightmapData covering only the cropped area.
 * All downstream code (sampleHeight, buildBaseTexture, buildTerrainMesh) is bbox-relative
 * and works unchanged with the cropped heightmap.
 */
function cropHeightmap(
    hm: HeightmapData,
    regionBbox: [number, number, number, number],
    margin = 0.05,
): HeightmapData {
    const [hmMinLon, hmMinLat, hmMaxLon, hmMaxLat] = hm.bbox;
    const hmLonSpan = hmMaxLon - hmMinLon;
    const hmLatSpan = hmMaxLat - hmMinLat;

    // Expand region bbox by margin, clamped to heightmap extent
    const cropMinLon = Math.max(hmMinLon, regionBbox[0] - margin);
    const cropMinLat = Math.max(hmMinLat, regionBbox[1] - margin);
    const cropMaxLon = Math.min(hmMaxLon, regionBbox[2] + margin);
    const cropMaxLat = Math.min(hmMaxLat, regionBbox[3] + margin);

    // Map lon/lat to grid indices (col for lon, row for lat)
    // Note: row 0 is top of heightmap (maxLat), row h-1 is bottom (minLat)
    const col0 = Math.max(0, Math.floor((cropMinLon - hmMinLon) / hmLonSpan * (hm.width - 1)));
    const col1 = Math.min(hm.width - 1, Math.ceil((cropMaxLon - hmMinLon) / hmLonSpan * (hm.width - 1)));
    const row0 = Math.max(0, Math.floor((hmMaxLat - cropMaxLat) / hmLatSpan * (hm.height - 1)));
    const row1 = Math.min(hm.height - 1, Math.ceil((hmMaxLat - cropMinLat) / hmLatSpan * (hm.height - 1)));

    const newWidth = col1 - col0 + 1;
    const newHeight = row1 - row0 + 1;

    // Extract sub-array
    const cropped = new Array<number>(newWidth * newHeight);
    for (let r = 0; r < newHeight; r++) {
        for (let c = 0; c < newWidth; c++) {
            cropped[r * newWidth + c] = hm.elevations[(row0 + r) * hm.width + (col0 + c)] ?? 0;
        }
    }

    // Compute precise bbox from grid indices
    const newMinLon = hmMinLon + (col0 / (hm.width - 1)) * hmLonSpan;
    const newMaxLon = hmMinLon + (col1 / (hm.width - 1)) * hmLonSpan;
    const newMaxLat = hmMaxLat - (row0 / (hm.height - 1)) * hmLatSpan;
    const newMinLat = hmMaxLat - (row1 / (hm.height - 1)) * hmLatSpan;

    return {
        bbox: [newMinLon, newMinLat, newMaxLon, newMaxLat],
        width: newWidth,
        height: newHeight,
        elevations: cropped,
    };
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
// Staff map elevation palette
// ---------------------------------------------------------------------------

function staffElevationRGB(elev: number): [number, number, number] {
    if (elev < 2) return [160, 195, 220];

    const stops: [number, number, number, number][] = [
        [2, 148, 191, 139],
        [80, 165, 200, 142],
        [200, 195, 212, 148],
        [400, 220, 211, 156],
        [600, 222, 198, 145],
        [800, 210, 178, 128],
        [1000, 195, 160, 112],
        [1300, 178, 142, 98],
        [1600, 165, 130, 92],
        [2000, 158, 138, 118],
        [2500, 185, 180, 172],
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
// Base texture builder
// ---------------------------------------------------------------------------

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

    // Pass 1: Hypsometric elevation base
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

    // Pass 2: Rivers
    if (waterways) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        for (const feature of waterways.features) {
            const wtype = (feature.properties.waterway as string) ?? '';
            if (wtype !== 'river') continue;
            drawLineFeature(ctx, feature.geometry, proj, 'rgba(60, 130, 190, 0.12)', 7.0);
        }
        for (const feature of waterways.features) {
            const wtype = (feature.properties.waterway as string) ?? '';
            if (wtype !== 'river') continue;
            drawLineFeature(ctx, feature.geometry, proj, 'rgba(30, 100, 180, 0.90)', 3.0);
        }
        for (const feature of waterways.features) {
            const wtype = (feature.properties.waterway as string) ?? '';
            if (wtype !== 'stream') continue;
            drawLineFeature(ctx, feature.geometry, proj, 'rgba(50, 120, 180, 0.45)', 1.2);
        }
        ctx.restore();
    }

    // Pass 3: Roads
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

    // Pass 4: Settlement built-up area tints
    const centroids = new Map<string, [number, number]>();
    for (const feature of settlements.features) {
        const props = feature.properties;
        if (!props || !feature.geometry) continue;
        const rings = ringsFromSettlement(feature.geometry);
        if (rings.length === 0) continue;
        const centroid = ringCentroid(rings[0]!);
        centroids.set(props.sid, centroid);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (const feature of settlements.features) {
        const props = feature.properties;
        if (!props || !feature.geometry) continue;
        const pop = props.population_total ?? 0;
        if (pop < 100) continue;
        const rings = ringsFromSettlement(feature.geometry);
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

    // Pass 5: BiH national border
    if (borderRings.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(40, 40, 50, 0.80)';
        ctx.lineWidth = 10.0;
        ctx.setLineDash([20, 8]);
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
// Faction control overlay texture
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

    const FACTION_FILL: Record<string, string> = {
        RS: 'rgba(180, 60, 60, 0.32)',
        RBiH: 'rgba(60, 140, 60, 0.32)',
        HRHB: 'rgba(50, 90, 170, 0.32)',
        null: 'rgba(80, 80, 80, 0.04)',
    };
    const settlementFactions = new Map<string, string>();
    for (const feature of settlements.features) {
        const props = feature.properties;
        if (!props) continue;
        const faction: FactionId = controllers
            ? (controllers.get(props.sid) ?? null)
            : factionFromEthnicity(props);
        settlementFactions.set(props.sid, faction ?? 'null');
    }

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
// AoR overlay texture
// ---------------------------------------------------------------------------

/**
 * Build AoR overlay texture with per-faction crosshatch patterns.
 * Each faction gets a distinct hatch direction for visual distinction:
 *   RS  (red):   45° diagonal  (\\\)
 *   RBiH (green): -45° diagonal (///)
 *   HRHB (blue):  horizontal lines (───)
 */
function buildAoRTexture(
    hm: HeightmapData,
    settlements: SettlementsGeoJSON,
    save: GameSave,
    edges?: Array<{ a: string; b: string }>,
    settlementCentroids?: Map<string, [number, number]>,
): THREE.CanvasTexture {
    const TEX_W = 4096, TEX_H = 4096;
    const canvas = new OffscreenCanvas(TEX_W, TEX_H);
    const ctx = canvas.getContext('2d')!;
    const proj = makeCanvasProjection(hm.bbox, TEX_W, TEX_H);
    ctx.clearRect(0, 0, TEX_W, TEX_H);

    // Build brigade → faction lookup
    const brigadeFaction = new Map<string, string>();
    for (const [fid, f] of Object.entries(save.formations)) {
        if (f.kind === 'brigade' || f.kind === 'og') brigadeFaction.set(fid, f.faction);
    }
    console.log(`[sandbox] buildAoRTexture: ${brigadeFaction.size} brigades, ${Object.keys(save.brigade_aor ?? {}).filter(k => save.brigade_aor[k]).length} AoR assignments`);

    // Faction visual constants
    const AOR_STROKE: Record<string, string> = {
        RS: 'rgba(255, 70, 70, 0.9)',
        RBiH: 'rgba(70, 220, 100, 0.9)',
        HRHB: 'rgba(70, 140, 255, 0.9)',
    };
    const AOR_FILL: Record<string, string> = {
        RS: 'rgba(255, 70, 70, 0.25)',
        RBiH: 'rgba(70, 220, 100, 0.25)',
        HRHB: 'rgba(70, 140, 255, 0.25)',
    };
    const AOR_HATCH: Record<string, string> = {
        RS: 'rgba(255, 70, 70, 0.85)',
        RBiH: 'rgba(70, 220, 100, 0.85)',
        HRHB: 'rgba(70, 140, 255, 0.85)',
    };
    // Hatch angle in radians: RS=45°, RBiH=-45°, HRHB=0° (horizontal)
    const AOR_HATCH_ANGLE: Record<string, number> = {
        RS: Math.PI / 4,
        RBiH: -Math.PI / 4,
        HRHB: 0,
    };
    const HATCH_SPACING = 8;    // pixels between parallel lines (on 4096px texture)
    const HATCH_WIDTH = 3.0;    // line width

    // Build settlement → faction map via brigade_aor
    const settlementAoR = new Map<string, string>();
    for (const [sid, brigadeId] of Object.entries(save.brigade_aor ?? {})) {
        if (!brigadeId) continue;
        const faction = brigadeFaction.get(brigadeId);
        if (faction) settlementAoR.set(sid, faction);
    }

    let drawnCount = 0;
    for (const feature of settlements.features) {
        const props = feature.properties;
        if (!props || !feature.geometry) continue;
        const faction = settlementAoR.get(props.sid);
        if (!faction) continue;
        const rings = ringsFromSettlement(feature.geometry);
        drawnCount++;

        for (const ring of rings) {
            if (ring.length < 3) continue;

            // Build clipping path for this settlement polygon
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(proj.x(ring[0]![0]!), proj.y(ring[0]![1]!));
            for (let i = 1; i < ring.length; i++) {
                ctx.lineTo(proj.x(ring[i]![0]!), proj.y(ring[i]![1]!));
            }
            ctx.closePath();

            // 1. Subtle faction fill
            ctx.fillStyle = AOR_FILL[faction] ?? 'rgba(100,100,100,0.05)';
            ctx.fill();

            // 2. Clip to settlement polygon for crosshatch
            ctx.clip();

            // 3. Draw diagonal hatch lines across the clipped area
            const angle = AOR_HATCH_ANGLE[faction] ?? 0;
            ctx.strokeStyle = AOR_HATCH[faction] ?? 'rgba(100,100,100,0.3)';
            ctx.lineWidth = HATCH_WIDTH;

            // Find bounding box of projected polygon
            let minPx = Infinity, maxPx = -Infinity, minPy = Infinity, maxPy = -Infinity;
            for (const pt of ring) {
                const px = proj.x(pt[0]!);
                const py = proj.y(pt[1]!);
                if (px < minPx) minPx = px;
                if (px > maxPx) maxPx = px;
                if (py < minPy) minPy = py;
                if (py > maxPy) maxPy = py;
            }

            // Diagonal span needed to cover the bbox at the given angle
            const bboxW = maxPx - minPx;
            const bboxH = maxPy - minPy;
            const diag = Math.sqrt(bboxW * bboxW + bboxH * bboxH);
            const centerX = (minPx + maxPx) / 2;
            const centerY = (minPy + maxPy) / 2;
            const numLines = Math.ceil(diag / HATCH_SPACING);
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);

            ctx.beginPath();
            for (let i = -numLines; i <= numLines; i++) {
                const offset = i * HATCH_SPACING;
                // Perpendicular offset from center line
                const perpX = -sinA * offset;
                const perpY = cosA * offset;
                // Line endpoints along the hatch direction
                const x1 = centerX + perpX - cosA * diag;
                const y1 = centerY + perpY - sinA * diag;
                const x2 = centerX + perpX + cosA * diag;
                const y2 = centerY + perpY + sinA * diag;
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }
            ctx.stroke();

            ctx.restore();

            // 4. Draw settlement border stroke (outside clip)
            ctx.beginPath();
            ctx.moveTo(proj.x(ring[0]![0]!), proj.y(ring[0]![1]!));
            for (let i = 1; i < ring.length; i++) {
                ctx.lineTo(proj.x(ring[i]![0]!), proj.y(ring[i]![1]!));
            }
            ctx.closePath();
            ctx.strokeStyle = AOR_STROKE[faction] ?? 'rgba(100,100,100,0.2)';
            ctx.lineWidth = 4;
            ctx.stroke();
        }
    }

    // ---------------------------------------------------------------------------
    // Contact-edge visual: red glowing shared boundary on opposing contact edges
    // ---------------------------------------------------------------------------
    const CONTACT_EDGE_COLOR = 'rgba(255, 68, 68, 0.92)';

    if (edges && settlementCentroids && edges.length > 0) {
        let contactEdgeCount = 0;

        // Build centroid pixel lookup from centroids map
        const centroidPx = new Map<string, [number, number]>();
        for (const [sid, [lon, lat]] of settlementCentroids) {
            centroidPx.set(sid, [proj.x(lon), proj.y(lat)]);
        }

        for (const edge of edges) {
            const brigadeA = (save.brigade_aor ?? {})[edge.a];
            const brigadeB = (save.brigade_aor ?? {})[edge.b];
            if (!brigadeA && !brigadeB) continue;  // Neither has a brigade

            const factionA = brigadeA ? brigadeFaction.get(brigadeA) ?? null : null;
            const factionB = brigadeB ? brigadeFaction.get(brigadeB) ?? null : null;

            // Contact edge: opposing factions with at least one side defended by brigade AoR
            if (factionA === factionB) continue;
            if (!factionA && !factionB) continue;

            const cpA = centroidPx.get(edge.a);
            const cpB = centroidPx.get(edge.b);
            if (!cpA || !cpB) continue;

            // Direction vector from A to B (in canvas pixels)
            const dx = cpB[0] - cpA[0];
            const dy = cpB[1] - cpA[1];
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1) continue;

            const perpX = -(dy / dist); // perpendicular to centroid direction
            const perpY = dx / dist;

            drawContactEdge(ctx, cpA, cpB, perpX, perpY, dist, CONTACT_EDGE_COLOR);
            contactEdgeCount++;
        }

        if (contactEdgeCount > 0) {
            console.log(`[sandbox] buildAoRTexture: drew ${contactEdgeCount} contact-edge highlights`);
        }
    }

    console.log(`[sandbox] buildAoRTexture: drew ${drawnCount} settlement polygons on ${TEX_W}x${TEX_H} canvas`);

    const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    return texture;
}

/** Draw red glowing contact-edge line between opposing settlements. */
function drawContactEdge(
    ctx: OffscreenCanvasRenderingContext2D,
    fromPx: [number, number],
    toPx: [number, number],
    perpX: number, perpY: number, // perpendicular to direction
    dist: number,
    color: string,
): void {
    // Shared boundary indicator: place a short segment near midpoint of the two centroids.
    const lineCenterX = (fromPx[0] + toPx[0]) * 0.5;
    const lineCenterY = (fromPx[1] + toPx[1]) * 0.5;
    const lineHalfLen = Math.min(24, dist * 0.22);
    const lineStartX = lineCenterX - perpX * lineHalfLen;
    const lineStartY = lineCenterY - perpY * lineHalfLen;
    const lineEndX = lineCenterX + perpX * lineHalfLen;
    const lineEndY = lineCenterY + perpY * lineHalfLen;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;

    // glow pass
    ctx.beginPath();
    ctx.moveTo(lineStartX, lineStartY);
    ctx.lineTo(lineEndX, lineEndY);
    ctx.stroke();

    // core stroke for sharp edge readability
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lineStartX, lineStartY);
    ctx.lineTo(lineEndX, lineEndY);
    ctx.stroke();

    ctx.restore();
}

// ---------------------------------------------------------------------------
// Movement radius: BFS reachability + texture overlay
// ---------------------------------------------------------------------------

/**
 * Deterministic SID comparator.
 */
function compareSid(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

interface TerrainScalarLike {
    road_access_index: number;
    river_crossing_penalty: number;
    elevation_mean_m: number;
    slope_index: number;
    terrain_friction_index: number;
}

const DEFAULT_TERRAIN_SCALAR: TerrainScalarLike = {
    road_access_index: 0.5,
    river_crossing_penalty: 0,
    elevation_mean_m: 200,
    slope_index: 0.1,
    terrain_friction_index: 0.1,
};

function getTerrainForSid(terrainScalars: TerrainScalarsData | null | undefined, sid: string): TerrainScalarLike {
    return (terrainScalars?.by_sid?.[sid] as TerrainScalarLike | undefined) ?? DEFAULT_TERRAIN_SCALAR;
}

/**
 * Column movement budget derived from composition.
 * Baseline is 12; heavier formations move less, lighter formations move more.
 */
function getUndeployedMovementRate(formation: SliceFormation): number {
    const c = formation.composition ?? {};
    const tanks = Number(c.tanks ?? 0);
    const artillery = Number(c.artillery ?? 0);
    const aa = Number(c.aa_systems ?? 0);
    const personnel = Number(formation.personnel ?? 0);

    let budget = UNDEPLOYED_MOVEMENT_RATE; // baseline 12
    const heavyLoad = tanks * 1.2 + artillery * 0.8 + aa * 0.6;

    if (heavyLoad >= 70) budget -= 3;
    else if (heavyLoad >= 45) budget -= 2;
    else if (heavyLoad >= 25) budget -= 1;
    else budget += 1;

    if (personnel < 500) budget += 1;
    if (personnel > 900) budget -= 1;

    return Math.max(8, Math.min(16, Math.round(budget)));
}

function getMovementRatesForFormation(formation: SliceFormation): { columnRate: number; combatRate: number } {
    return {
        columnRate: getUndeployedMovementRate(formation),
        combatRate: DEPLOYED_MOVEMENT_RATE,
    };
}

/**
 * Movement traversal cost for undeployed brigades:
 * - better road access lowers cost
 * - uphill movement increases cost
 * - major river crossings increase cost
 */
function computeUndeployedTraversalCost(
    fromSid: string,
    toSid: string,
    terrainScalars: TerrainScalarsData | null | undefined,
): number {
    const fromTerrain = getTerrainForSid(terrainScalars, fromSid);
    const toTerrain = getTerrainForSid(terrainScalars, toSid);

    const roadAccess = Math.max(0, Math.min(1, (fromTerrain.road_access_index + toTerrain.road_access_index) / 2));
    const roadPenalty = (1 - roadAccess) * 1.4;

    const uphillGain = Math.max(0, toTerrain.elevation_mean_m - fromTerrain.elevation_mean_m);
    const uphillPenalty = Math.min(2.5, uphillGain / 350);

    const slopePenalty = Math.max(0, Math.min(1, toTerrain.slope_index)) * 0.8;
    const riverPenalty = Math.max(fromTerrain.river_crossing_penalty, toTerrain.river_crossing_penalty) * 2.2;
    const frictionPenalty = Math.max(0, Math.min(1, toTerrain.terrain_friction_index)) * 0.6;

    return 1 + roadPenalty + uphillPenalty + slopePenalty + riverPenalty + frictionPenalty;
}

interface ReachabilityOptions {
    allowUncontrolled: boolean;
    useUndeployedScaling: boolean;
    terrainScalars?: TerrainScalarsData | null;
}

/**
 * Reachability with deterministic traversal.
 * - Deployed: plain BFS by hop count (`movementBudget` = max hops)
 * - Undeployed: weighted traversal cost using roads + terrain scalars
 */
function computeReachableSettlements(
    startSids: string[],
    faction: string,
    movementBudget: number,
    edges: Array<{ a: string; b: string }>,
    politicalControllers: Record<string, string | null>,
    sliceSids: Set<string>,
    options: ReachabilityOptions,
): Set<string> {
    // Build adjacency
    const adj = new Map<string, string[]>();
    for (const e of edges) {
        if (!adj.has(e.a)) adj.set(e.a, []);
        if (!adj.has(e.b)) adj.set(e.b, []);
        adj.get(e.a)!.push(e.b);
        adj.get(e.b)!.push(e.a);
    }

    for (const sid of adj.keys()) {
        adj.get(sid)!.sort(compareSid);
    }

    const bestCost = new Map<string, number>();
    const queue: Array<{ sid: string; cost: number }> = [];
    const initial = [...new Set(startSids)].sort(compareSid);
    for (const sid of initial) {
        bestCost.set(sid, 0);
        queue.push({ sid, cost: 0 });
    }

    while (queue.length > 0) {
        queue.sort((a, b) => {
            if (a.cost !== b.cost) return a.cost - b.cost;
            return compareSid(a.sid, b.sid);
        });
        const current = queue.shift()!;
        const knownCost = bestCost.get(current.sid);
        if (knownCost === undefined || current.cost > knownCost) continue;
        if (current.cost >= movementBudget) continue;

        for (const n of (adj.get(current.sid) ?? [])) {
            if (!sliceSids.has(n)) continue;
            const ctrl = politicalControllers[n];
            const isEnemyControlled = Boolean(ctrl && ctrl !== faction);
            if (isEnemyControlled) continue;
            if (!options.allowUncontrolled && !ctrl) continue;

            const stepCost = options.useUndeployedScaling
                ? computeUndeployedTraversalCost(current.sid, n, options.terrainScalars)
                : 1;
            const nextCost = current.cost + stepCost;
            if (nextCost > movementBudget) continue;

            const prev = bestCost.get(n);
            if (prev === undefined || nextCost < prev) {
                bestCost.set(n, nextCost);
                queue.push({ sid: n, cost: nextCost });
            }
        }
    }
    return new Set(bestCost.keys());
}

/**
 * Build a translucent overlay texture highlighting reachable settlements.
 * Uses a solid fill with a dashed border — distinct from AoR crosshatch.
 */
function buildMovementRadiusTexture(
    hm: HeightmapData,
    settlements: SettlementsGeoJSON,
    reachableSids: Set<string>,
    color: { r: number; g: number; b: number },  // e.g. {r:255, g:200, b:0} for yellow
): THREE.CanvasTexture {
    const TEX_W = 4096, TEX_H = 4096;
    const canvas = new OffscreenCanvas(TEX_W, TEX_H);
    const ctx = canvas.getContext('2d')!;
    const proj = makeCanvasProjection(hm.bbox, TEX_W, TEX_H);
    ctx.clearRect(0, 0, TEX_W, TEX_H);

    const fillColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.20)`;
    const strokeColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.70)`;

    for (const feature of settlements.features) {
        const props = feature.properties;
        if (!props || !feature.geometry) continue;
        if (!reachableSids.has(props.sid)) continue;
        const rings = ringsFromSettlement(feature.geometry);

        for (const ring of rings) {
            if (ring.length < 3) continue;

            // Solid translucent fill
            ctx.beginPath();
            ctx.moveTo(proj.x(ring[0]![0]!), proj.y(ring[0]![1]!));
            for (let i = 1; i < ring.length; i++) {
                ctx.lineTo(proj.x(ring[i]![0]!), proj.y(ring[i]![1]!));
            }
            ctx.closePath();
            ctx.fillStyle = fillColor;
            ctx.fill();

            // Dashed border for visual distinction from AoR crosshatch
            ctx.setLineDash([12, 6]);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.setLineDash([]);
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
    return n > 0 ? [sLon / n, sLat / n] : [CENTER_LON, CENTER_LAT];
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
        roughness: 0.95,
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
// Dynamic city label sprites (LOD)
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

        const LABEL_DPR = 2;
        const baseW = city.pop > 40000 ? 512 : city.pop > 5000 ? 384 : 256;
        const baseH = city.pop > 40000 ? 48 : city.pop > 5000 ? 40 : 32;
        const W = baseW * LABEL_DPR;
        const H = baseH * LABEL_DPR;
        const canvas = new OffscreenCanvas(W, H);
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, W, H);

        const baseFontSize = city.pop > 80000 ? 26
            : city.pop > 40000 ? 20
                : city.pop > 15000 ? 16
                    : 13;
        const fontSize = baseFontSize * LABEL_DPR;
        const fontWeight = city.pop > 15000 ? 'bold' : '';
        ctx.font = `${fontWeight} ${fontSize}px 'Palatino Linotype', 'Georgia', 'Times New Roman', serif`.trim();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.strokeStyle = 'rgba(244, 232, 200, 0.85)';
        ctx.lineWidth = 3.5 * LABEL_DPR;
        ctx.lineJoin = 'round';
        ctx.strokeText(city.name, W / 2, H / 2);

        ctx.fillStyle = city.pop > 15000 ? '#2a1a0a' : '#5a3a1a';
        ctx.fillText(city.name, W / 2, H / 2);

        const labelImgData = ctx.getImageData(0, 0, W, H);
        const tex = new THREE.DataTexture(new Uint8Array(labelImgData.data.buffer), W, H, THREE.RGBAFormat);
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

    console.log(`[sandbox] City labels: ${entries.length} prepared`);
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

const FORMATION_LOD_THRESHOLD = 4.0;
const FORMATION_FADE_ZONE = 0.20;

function buildCorpsAggregates(save: GameSave): Map<string, CorpsAggregate> {
    const aggregates = new Map<string, CorpsAggregate>();
    const formations = Object.values(save.formations);
    const postureCounts = new Map<string, Map<string, number>>();

    for (const f of formations) {
        if (f.kind === 'corps_asset' || f.kind === 'army_hq') {
            aggregates.set(f.id, { formation: f, totalPersonnel: 0, brigadeCount: 0, childIds: [], dominantPosture: 'defend' });
            postureCounts.set(f.id, new Map());
        }
    }

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

    const corpsScale = Math.max(0.8, Math.min(1.15, 2.0 / Math.sqrt(Math.max(camY, 0.5))));
    const camRatio = Math.min(camY, threshold) / threshold;
    const brigadeScale = Math.max(0.06, Math.pow(camRatio, 1.5));

    for (const e of entries) {
        const mat = e.sprite.material as THREE.SpriteMaterial;
        const sf = e.kind === 'corps' ? corpsScale : brigadeScale;

        if (e.kind === 'corps') {
            if (camY < fadeStart) {
                e.sprite.visible = false;
            } else {
                e.sprite.visible = true;
                const t = Math.min(1.0, (camY - fadeStart) / fadeRange);
                mat.opacity = t;
                e.sprite.scale.set(e.baseScaleX * sf, e.baseScaleY * sf, 1);
            }
        } else {
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
// Formation billboard markers
// ---------------------------------------------------------------------------

function paintCorpsCounter(
    ctx: OffscreenCanvasRenderingContext2D, w: number, h: number,
    agg: CorpsAggregate,
): void {
    const formation = agg.formation;
    const factionColor: Record<string, string> = {
        RS: '#b43232', RBiH: '#37884b', HRHB: '#326eaa',
    };
    const fc = factionColor[formation.faction] ?? '#666';

    ctx.fillStyle = 'rgba(10, 10, 22, 0.92)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fc;
    ctx.fillRect(0, 0, 12, h);
    ctx.strokeStyle = fc;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 6, w - 20, h - 12);
    ctx.strokeStyle = fc;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(14, h - 14); ctx.lineTo(w - 6, 14);
    ctx.stroke();

    ctx.fillStyle = '#00ff88';
    ctx.font = `bold 20px 'Courier New', Courier, monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const maxNameLen = Math.floor((w - 40) / 12);
    const nameStr = formation.name.length > maxNameLen
        ? formation.name.slice(0, maxNameLen - 1) + '\u2026'
        : formation.name;
    ctx.fillText(nameStr, 20, 20);

    ctx.fillStyle = fc;
    ctx.font = `13px 'Courier New', Courier, monospace`;
    ctx.fillText(formation.faction, 20, 46);

    const persStr = agg.totalPersonnel >= 1000
        ? `${(agg.totalPersonnel / 1000).toFixed(1)}k`
        : `${agg.totalPersonnel}`;
    const strLabel = agg.totalPersonnel > 15000 ? 'STRONG' : agg.totalPersonnel > 5000 ? 'MODERATE' : 'WEAK';
    const strColor = agg.totalPersonnel > 15000 ? '#00ff88' : agg.totalPersonnel > 5000 ? '#ffab00' : '#ff4444';
    ctx.fillStyle = strColor;
    ctx.font = `bold 16px 'Courier New', Courier, monospace`;
    ctx.fillText(`STR: ${persStr} (${strLabel})`, 20, 72);

    const postureLabel = (agg.dominantPosture ?? 'defend').toUpperCase();
    const postureColors: Record<string, string> = {
        ATTACK: '#ff4444', PROBE: '#ffab00', DEFEND: '#4a8aff',
        ELASTIC_DEFENSE: '#8a6aff', WITHDRAW: '#ff8844',
    };
    ctx.fillStyle = postureColors[postureLabel] ?? '#4a8aff';
    ctx.font = `14px 'Courier New', Courier, monospace`;
    ctx.fillText(`PST: ${postureLabel}`, 20, 96);

    ctx.fillStyle = 'rgba(180, 200, 220, 0.6)';
    ctx.font = `12px 'Courier New', Courier, monospace`;
    ctx.fillText(`\u00d7${agg.brigadeCount} bde`, 20, 118);

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
    const factionColors: Record<string, string> = {
        RS: 'rgba(140, 50, 50, 0.6)', RBiH: 'rgba(60, 100, 60, 0.6)', HRHB: 'rgba(50, 80, 120, 0.6)',
    };
    const postureColors: Record<string, string> = {
        defend: '#4a6a3a', probe: '#5a6a4a', attack: '#7a3a2a', elastic_defense: '#5a4a6a',
    };
    const factionCol = factionColors[formation.faction] ?? 'rgba(60, 70, 80, 0.4)';
    const postureCol = postureColors[formation.posture] ?? '#5a4a3a';

    ctx.fillStyle = 'rgba(240, 244, 248, 0.93)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = factionCol;
    ctx.fillRect(0, 0, 6, h);
    ctx.strokeStyle = 'rgba(60, 80, 100, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.75, 0.75, w - 1.5, h - 1.5);

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

    ctx.fillStyle = '#1a2a3a';
    ctx.font = `bold 10px 'IBM Plex Mono', 'Consolas', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const nameStr = formation.name.length > 14 ? formation.name.slice(0, 13) + '\u2026' : formation.name;
    ctx.fillText(nameStr, w / 2 + 3, h * 0.72);

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
    brigadeAor?: Record<string, string | null>,
): { group: THREE.Group; entries: FormationEntry[] } {
    const group = new THREE.Group();
    group.name = 'formationGroup';
    const entries: FormationEntry[] = [];
    const aggregates = buildCorpsAggregates(save);

    for (const [corpsId, agg] of aggregates) {
        const f = agg.formation;
        if (f.status !== 'active') continue;
        if (!f.hq_sid) continue;
        if (agg.brigadeCount === 0) continue;
        const centroid = centroids.get(f.hq_sid);
        if (!centroid) continue;
        const [lon, lat] = centroid;
        const elev = sampleHeight(hm, lon, lat);
        const [wx, wy, wz] = wgsToWorld(lon, lat, elev);
        const sprite = buildCorpsSprite(agg);
        sprite.position.set(wx, wy + 0.35, wz);
        sprite.name = `corps_${corpsId}`;
        sprite.visible = true;
        group.add(sprite);
        entries.push({
            sprite, formationId: corpsId, kind: 'corps',
            baseScaleX: 0.85, baseScaleY: 0.53,
        });
    }

    for (const formation of Object.values(save.formations)) {
        if (formation.status !== 'active') continue;
        if (formation.kind !== 'brigade') continue;
        if (!formation.hq_sid) continue;

        // Compute AoR centroid: average position of all settlements assigned to this brigade
        let posLon: number | undefined;
        let posLat: number | undefined;
        if (brigadeAor) {
            let sumLon = 0, sumLat = 0, count = 0;
            for (const [sid, bid] of Object.entries(brigadeAor)) {
                if (bid === formation.id) {
                    const c = centroids.get(sid);
                    if (c) { sumLon += c[0]; sumLat += c[1]; count++; }
                }
            }
            if (count > 0) {
                posLon = sumLon / count;
                posLat = sumLat / count;
            }
        }
        // Fallback to hq_sid centroid
        if (posLon === undefined || posLat === undefined) {
            const c = centroids.get(formation.hq_sid);
            if (!c) continue;
            posLon = c[0];
            posLat = c[1];
        }

        const elev = sampleHeight(hm, posLon, posLat);
        const [wx, wy, wz] = wgsToWorld(posLon, posLat, elev);
        const sprite = buildBrigadeSprite(formation);
        sprite.position.set(wx, wy + 0.25, wz);
        sprite.name = `brigade_${formation.id}`;
        sprite.visible = false;
        group.add(sprite);
        entries.push({
            sprite, formationId: formation.id, kind: 'brigade',
            corpsId: formation.corps_id,
            baseScaleX: 0.55, baseScaleY: 0.31,
        });
    }

    console.log(`[sandbox] Formation LOD: ${aggregates.size} corps, ${entries.filter(e => e.kind === 'brigade').length} brigades`);
    return { group, entries };
}

// ---------------------------------------------------------------------------
// Stem lines
// ---------------------------------------------------------------------------

interface StemEntry {
    line: THREE.Line;
    dot: THREE.Sprite;
    kind: 'corps' | 'brigade';
}

function buildStemLines(entries: FormationEntry[]): { group: THREE.Group; stems: StemEntry[] } {
    const group = new THREE.Group();
    group.name = 'stemLines';
    const stems: StemEntry[] = [];

    function makeDotTexture(color: string, size: number): THREE.DataTexture {
        const canvas = new OffscreenCanvas(size, size);
        const ctx = canvas.getContext('2d')!;
        const r = size / 2;
        const grad = ctx.createRadialGradient(r, r, r * 0.15, r, r, r);
        grad.addColorStop(0, color);
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
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

        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(pos.x, pos.y, pos.z),
            new THREE.Vector3(pos.x, terrainY, pos.z),
        ]);
        const mat = e.kind === 'corps' ? corpsLineMat : brigadeLineMat;
        const line = new THREE.Line(geometry, mat.clone());
        line.visible = e.sprite.visible;
        group.add(line);

        const dotTex = e.kind === 'corps' ? corpsDotTex : brigadeDotTex;
        const dotMat = new THREE.SpriteMaterial({
            map: dotTex, transparent: true, depthTest: false,
            opacity: e.kind === 'corps' ? 0.7 : 0.5,
        });
        const dot = new THREE.Sprite(dotMat);
        const dotSize = e.kind === 'corps' ? 0.12 : 0.06;
        dot.scale.set(dotSize, dotSize, 1);
        dot.position.set(pos.x, terrainY + 0.005, pos.z);
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

        stem.line.visible = vis;
        const lineMat = stem.line.material as THREE.LineBasicMaterial;
        lineMat.opacity = eMat.opacity * (stem.kind === 'corps' ? 0.55 : 0.40);

        stem.dot.visible = vis;
        const dotMat = stem.dot.material as THREE.SpriteMaterial;
        dotMat.opacity = eMat.opacity * (stem.kind === 'corps' ? 0.7 : 0.5);
    }
}

// ---------------------------------------------------------------------------
// Formation tooltip
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

    const x = pageX - containerRect.left + 16;
    const y = pageY - containerRect.top - 10;
    const maxX = containerRect.width - tooltip.offsetWidth - 10;
    const maxY = containerRect.height - tooltip.offsetHeight - 10;
    tooltip.style.left = `${Math.min(x, maxX)}px`;
    tooltip.style.top = `${Math.max(8, Math.min(y, maxY))}px`;
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
// Sandbox-specific: Attack order arrows (red 3D lines)
// ---------------------------------------------------------------------------

function buildAttackArrows(
    orders: OrderEntry[],
    formations: Record<string, SliceFormation>,
    centroids: Map<string, [number, number]>,
    hm: HeightmapData,
): THREE.Group {
    const group = new THREE.Group();
    group.name = 'attackArrows';

    const arrowMat = new THREE.LineBasicMaterial({
        color: 0xff3333, transparent: true, opacity: 0.85, depthTest: false, linewidth: 2,
    });

    for (const order of orders) {
        if (order.type !== 'attack') continue;
        const f = formations[order.brigadeId];
        if (!f || !order.targetSid) continue;

        const srcCentroid = centroids.get(f.hq_sid);
        const tgtCentroid = centroids.get(order.targetSid);
        if (!srcCentroid || !tgtCentroid) continue;

        const srcElev = sampleHeight(hm, srcCentroid[0], srcCentroid[1]);
        const tgtElev = sampleHeight(hm, tgtCentroid[0], tgtCentroid[1]);
        const [sx, sy, sz] = wgsToWorld(srcCentroid[0], srcCentroid[1], srcElev);
        const [tx, ty, tz] = wgsToWorld(tgtCentroid[0], tgtCentroid[1], tgtElev);

        // Raise arrows slightly above terrain
        const arcHeight = 0.08;
        const midX = (sx + tx) / 2;
        const midY = Math.max(sy, ty) + arcHeight;
        const midZ = (sz + tz) / 2;

        const points = [
            new THREE.Vector3(sx, sy + 0.02, sz),
            new THREE.Vector3(midX, midY, midZ),
            new THREE.Vector3(tx, ty + 0.02, tz),
        ];

        // Build a smooth curve through the 3 points
        const curve = new THREE.QuadraticBezierCurve3(points[0]!, points[1]!, points[2]!);
        const curvePoints = curve.getPoints(16);
        const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const line = new THREE.Line(geometry, arrowMat.clone());
        group.add(line);

        // Arrowhead (small cone at target end)
        const dir = new THREE.Vector3().subVectors(points[2]!, points[1]!).normalize();
        const arrowHelper = new THREE.ArrowHelper(dir, points[2]!, 0.02, 0xff3333, 0.02, 0.01);
        group.add(arrowHelper);
    }

    return group;
}

// ---------------------------------------------------------------------------
// Sandbox-specific: Movement path visualization (blue lines)
// ---------------------------------------------------------------------------

function buildMovementPaths(
    orders: OrderEntry[],
    formations: Record<string, SliceFormation>,
    centroids: Map<string, [number, number]>,
    hm: HeightmapData,
): THREE.Group {
    const group = new THREE.Group();
    group.name = 'movementPaths';

    const pathMat = new THREE.LineBasicMaterial({
        color: 0x3388ff, transparent: true, opacity: 0.75, depthTest: false, linewidth: 2,
    });
    const dashMat = new THREE.LineDashedMaterial({
        color: 0x3388ff, transparent: true, opacity: 0.60,
        dashSize: 0.02, gapSize: 0.01, depthTest: false,
    });

    for (const order of orders) {
        if (order.type !== 'move') continue;
        const f = formations[order.brigadeId];
        if (!f || !order.destinationSids || order.destinationSids.length === 0) continue;

        // Build waypoint chain: HQ -> destination[0] -> destination[1] -> ...
        const waypointSids = [f.hq_sid, ...order.destinationSids];
        const points: THREE.Vector3[] = [];

        for (const sid of waypointSids) {
            const c = centroids.get(sid);
            if (!c) continue;
            const elev = sampleHeight(hm, c[0], c[1]);
            const [wx, wy, wz] = wgsToWorld(c[0], c[1], elev);
            points.push(new THREE.Vector3(wx, wy + 0.015, wz));
        }

        if (points.length < 2) continue;

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, points.length > 2 ? dashMat.clone() : pathMat.clone());
        if (line.geometry) line.computeLineDistances();
        group.add(line);

        // Waypoint markers (small blue dots)
        for (let i = 1; i < points.length; i++) {
            const dotGeo = new THREE.SphereGeometry(0.006, 8, 8);
            const dotMatl = new THREE.MeshBasicMaterial({ color: 0x3388ff, transparent: true, opacity: 0.8 });
            const dot = new THREE.Mesh(dotGeo, dotMatl);
            dot.position.copy(points[i]!);
            group.add(dot);
        }
    }

    return group;
}

// ---------------------------------------------------------------------------
// Sandbox-specific: Settlement highlight ring
// ---------------------------------------------------------------------------

function buildSettlementHighlight(
    sid: string,
    centroids: Map<string, [number, number]>,
    hm: HeightmapData,
    color: number = 0xffcc00,
): THREE.Group {
    const group = new THREE.Group();
    group.name = 'settlementHighlight';

    const centroid = centroids.get(sid);
    if (!centroid) return group;

    const elev = sampleHeight(hm, centroid[0], centroid[1]);
    const [wx, wy, wz] = wgsToWorld(centroid[0], centroid[1], elev);

    // Ring geometry around the settlement
    const ringGeo = new THREE.RingGeometry(0.012, 0.018, 24);
    const ringMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthTest: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(wx, wy + 0.01, wz);
    ring.rotation.x = -Math.PI / 2; // Lay flat on terrain
    group.add(ring);

    return group;
}

// ---------------------------------------------------------------------------
// Sandbox-specific: Find nearest settlement to click point
// ---------------------------------------------------------------------------

function findNearestSettlement(
    clickScreenX: number,
    clickScreenY: number,
    screenW: number,
    screenH: number,
    camera: THREE.PerspectiveCamera,
    centroids: Map<string, [number, number]>,
    hm: HeightmapData,
    maxPickRadius: number = 40,
): string | null {
    const projVec = new THREE.Vector3();
    let bestSid: string | null = null;
    let bestDistSq = Infinity;

    for (const [sid, [lon, lat]] of centroids) {
        const elev = sampleHeight(hm, lon, lat);
        const [wx, wy, wz] = wgsToWorld(lon, lat, elev);

        projVec.set(wx, wy, wz);
        projVec.project(camera);
        const sx = (projVec.x * 0.5 + 0.5) * screenW;
        const sy = (-projVec.y * 0.5 + 0.5) * screenH;

        const dx = sx - clickScreenX;
        const dy = sy - clickScreenY;
        const distSq = dx * dx + dy * dy;

        if (distSq < bestDistSq && distSq < maxPickRadius * maxPickRadius) {
            bestDistSq = distSq;
            bestSid = sid;
        }
    }

    return bestSid;
}

// ---------------------------------------------------------------------------
// Sandbox-specific: Convert SliceData to minimal GameSave for rendering
// ---------------------------------------------------------------------------

function sliceToGameSave(slice: SliceData): GameSave {
    const formations: Record<string, FormationRecord> = {};
    for (const [fid, sf] of Object.entries(slice.formations)) {
        formations[fid] = {
            id: sf.id,
            faction: sf.faction,
            name: sf.name,
            kind: sf.kind,
            personnel: sf.personnel,
            cohesion: sf.cohesion,
            fatigue: sf.fatigue,
            posture: sf.posture,
            hq_sid: sf.hq_sid,
            status: sf.status,
            corps_id: sf.corps_id,
        };
    }
    return {
        political_controllers: slice.political_controllers as Record<string, FactionId>,
        formations,
        brigade_aor: slice.brigade_aor,
    };
}

// ---------------------------------------------------------------------------
// Sandbox-specific: Convert SliceData to minimal GameState for engine
// ---------------------------------------------------------------------------

function sliceToGameState(slice: SliceData): Record<string, unknown> {
    const formations: Record<string, Record<string, unknown>> = {};
    for (const [fid, sf] of Object.entries(slice.formations)) {
        formations[fid] = {
            ...sf,
            id: fid,
        };
    }

    return {
        political_controllers: { ...slice.political_controllers },
        formations,
        brigade_aor: { ...slice.brigade_aor },
        brigade_attack_orders: {},
        brigade_movement_orders: {},
        brigade_posture_orders: [],
        casualty_ledger: null,
        pending_wia: {},
        meta: { turn: 0, phase: 'phase_ii' },
    };
}

// ---------------------------------------------------------------------------
// Sandbox-specific: Compute faction resource summaries
// ---------------------------------------------------------------------------

function computeFactionResources(
    formations: Record<string, SliceFormation>,
): Array<{ id: string; brigadeCount: number; totalPersonnel: number }> {
    const factionMap = new Map<string, { brigadeCount: number; totalPersonnel: number }>();

    for (const f of Object.values(formations)) {
        if (f.status !== 'active' || f.kind !== 'brigade') continue;
        const entry = factionMap.get(f.faction) ?? { brigadeCount: 0, totalPersonnel: 0 };
        entry.brigadeCount++;
        entry.totalPersonnel += f.personnel ?? 0;
        factionMap.set(f.faction, entry);
    }

    const result: Array<{ id: string; brigadeCount: number; totalPersonnel: number }> = [];
    for (const fid of ['RBiH', 'RS', 'HRHB']) {
        const entry = factionMap.get(fid);
        if (entry) {
            result.push({ id: fid, ...entry });
        }
    }
    return result;
}

// ---------------------------------------------------------------------------
// HMR cleanup: abort previous instance before starting a new one
// ---------------------------------------------------------------------------
declare global {
    interface Window {
        __sandboxAbort?: AbortController;
        __sandboxCleanup?: () => void;
    }
}

if (window.__sandboxAbort) {
    window.__sandboxAbort.abort();
}
if (window.__sandboxCleanup) {
    window.__sandboxCleanup();
}
const hmrAbort = new AbortController();
window.__sandboxAbort = hmrAbort;

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

async function main(signal: AbortSignal): Promise<void> {
    const container = document.getElementById('sandbox-container');
    if (!container) return;

    // Clear previous DOM content from HMR reload
    container.innerHTML = '';

    const params = new URLSearchParams(window.location.search);
    const runId = params.get('run');
    const saveFile = params.get('save') === 'initial' ? 'initial_save.json' : 'initial_save.json'; // Sandbox defaults to initial
    const regionParam = params.get('region') ?? DEFAULT_REGION;

    // Find the selected region definition
    const selectedRegion = SANDBOX_REGIONS.find(r => r.id === regionParam) ?? SANDBOX_REGIONS[0]!;

    showMessage('LOADING DATA...');

    // ---- Sandbox state ----
    const sandboxState: SandboxState = {
        mode: 'select',
        selectedFormationId: null,
        orders: [],
        turnNumber: 0,
        sliceData: null,
        gameState: null,
        turnReports: [],
        deploymentStates: {},
        terrainScalars: null,
        moveSelection: null,
    };

    // ---- Parallel fetch all base data ----
    let heightmap: HeightmapData;
    let settlements: SettlementsGeoJSON;
    let waterways: LineGeoJSON | null = null;
    let roads: LineGeoJSON | null = null;
    let borderRings: number[][][] = [];

    try {
        const [hmRes, stRes, wwRes, rdRes, borderRes, terrainScalarsRes] = await Promise.all([
            fetch(HEIGHTMAP_URL),
            fetch(SETTLEMENTS_URL),
            fetch(WATERWAYS_URL).catch(() => null),
            fetch(ROADS_URL).catch(() => null),
            fetch(BIH_BORDER_URL).catch(() => null),
            fetch(TERRAIN_SCALARS_URL).catch(() => null),
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
        if (terrainScalarsRes && terrainScalarsRes.ok) {
            try {
                const tsData = (await terrainScalarsRes.json()) as TerrainScalarsData;
                sandboxState.terrainScalars = tsData;
                console.log(`[sandbox] Loaded terrain scalars: ${Object.keys(tsData.by_sid ?? {}).length} settlements`);
            } catch { sandboxState.terrainScalars = { by_sid: {} }; }
        } else {
            sandboxState.terrainScalars = { by_sid: {} };
            console.warn('[sandbox] Terrain scalars not loaded, using empty defaults');
        }
    } catch (e) {
        showMessage(`LOAD ERROR\n\n${(e as Error).message}\n\nnpm run dev:map`);
        return;
    }

    console.log(`[sandbox] Loaded: heightmap ${heightmap.width}x${heightmap.height}, ${settlements.features.length} settlements, ${waterways?.features.length ?? 0} waterways, ${roads?.features.length ?? 0} roads`);

    // ---- Crop heightmap to region bbox ----
    heightmap = cropHeightmap(heightmap, selectedRegion.bbox, 0.08);
    CENTER_LON = (heightmap.bbox[0] + heightmap.bbox[2]) / 2;
    CENTER_LAT = (heightmap.bbox[1] + heightmap.bbox[3]) / 2;
    console.log(`[sandbox] Cropped heightmap to region: ${heightmap.width}x${heightmap.height}, bbox=[${heightmap.bbox.map(n => n.toFixed(3)).join(', ')}]`);

    // ---- Load slice data ----
    showMessage(`LOADING SLICE: ${selectedRegion.name}...`);
    let sliceData: SliceData;
    try {
        sliceData = await loadSliceData(selectedRegion, runId, saveFile);
        sandboxState.sliceData = sliceData;
        sandboxState.gameState = sliceToGameState(sliceData);
    } catch (e) {
        console.warn('[sandbox] Slice load failed, using empty slice:', (e as Error).message);
        sliceData = {
            region: selectedRegion,
            settlements: [],
            edges: [],
            political_controllers: {},
            formations: {},
            brigade_aor: {},
            sidSet: new Set(),
            sidToMun: new Map(),
        };
        sandboxState.sliceData = sliceData;
        sandboxState.gameState = sliceToGameState(sliceData);
    }

    // ---- Smooth heightmap ----
    smoothHeightmap(heightmap, 8, 5);
    console.log('[sandbox] Heightmap smoothed (8 passes, radius 5)');

    // ---- Build scene ----
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xc8d8e4);

    // Camera starts zoomed into the slice region center
    const regionCenterLon = (selectedRegion.bbox[0] + selectedRegion.bbox[2]) / 2;
    const regionCenterLat = (selectedRegion.bbox[1] + selectedRegion.bbox[3]) / 2;
    const regionElev = sampleHeight(heightmap, regionCenterLon, regionCenterLat);
    const [rcx, rcy, rcz] = wgsToWorld(regionCenterLon, regionCenterLat, regionElev);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 500);
    // Position camera above and slightly south of slice center, looking down
    camera.position.set(rcx, rcy + 2.0, rcz + 1.2);
    camera.lookAt(rcx, rcy, rcz);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NoToneMapping;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement as unknown as HTMLElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(rcx, rcy, rcz);
    controls.maxPolarAngle = Math.PI * 0.45;
    controls.minDistance = 0.3;

    // Lighting
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(-3, 8, 4);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xf0f0f0, 0.7));
    scene.add(new THREE.HemisphereLight(0xf8f8ff, 0xd0d8c8, 0.4));

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    // ---- Build base texture ----
    showMessage('BUILDING ATLAS...');
    const { texture: baseTexture, centroids } = buildBaseTexture(heightmap, waterways, roads, settlements, borderRings);
    baseTexture.anisotropy = maxAniso;

    // ---- Build terrain mesh ----
    showMessage('BUILDING TERRAIN...');
    const terrainMesh = buildTerrainMesh(heightmap, baseTexture);
    terrainMesh.name = 'terrain';
    scene.add(terrainMesh);

    // ---- Build faction overlay from slice political controllers ----
    const sliceSave = sliceToGameSave(sliceData);
    const sliceControllers = new Map<string, FactionId>();
    for (const [sid, faction] of Object.entries(sliceData.political_controllers)) {
        sliceControllers.set(sid, faction as FactionId);
    }

    const factionTexture = buildFactionTexture(heightmap, settlements, sliceControllers);
    factionTexture.anisotropy = maxAniso;
    let factionOverlay = buildFactionOverlayMesh(terrainMesh, factionTexture);
    scene.add(factionOverlay);

    // ---- City labels ----
    const { group: cityLabels, entries: cityLabelEntries } = buildDynamicCityLabels(heightmap, centroids, settlements);
    let cityLabelsEnabled = true;
    scene.add(cityLabels);

    // ---- Formation layer from slice ----
    let formationEntries: FormationEntry[] = [];
    let stemEntries: StemEntry[] = [];
    let corpsAggregates: Map<string, CorpsAggregate> = new Map();
    let formationGroup: THREE.Group | null = null;
    let stemGroup: THREE.Group | null = null;
    let aorOverlay: THREE.Mesh | null = null;
    let movementRadiusOverlay: THREE.Mesh | null = null;

    function showMovementRadius(brigadeId: string): void {
        hideMovementRadius();
        if (!sandboxState.sliceData) return;

        const f = sandboxState.sliceData.formations[brigadeId];
        if (!f) return;

        // Determine movement budget based on deployment status
        const deployState = sandboxState.deploymentStates[brigadeId];
        const isUndeployed = deployState?.status === 'undeployed';
        const movementBudget = isUndeployed ? getUndeployedMovementRate(f) : DEPLOYED_MOVEMENT_RATE;

        // Get brigade's current AoR settlements as start nodes
        const startSids: string[] = [];
        for (const [sid, bid] of Object.entries(sandboxState.sliceData.brigade_aor)) {
            if (bid === brigadeId) startSids.push(sid);
        }
        if (startSids.length === 0) startSids.push(f.hq_sid);

        // Reachability for movement overlay
        const reachable = computeReachableSettlements(
            startSids, f.faction, movementBudget,
            sandboxState.sliceData.edges,
            sandboxState.sliceData.political_controllers,
            sandboxState.sliceData.sidSet,
            {
                allowUncontrolled: true, // sandbox exception
                useUndeployedScaling: isUndeployed,
                terrainScalars: sandboxState.terrainScalars,
            },
        );

        // Color: yellow for undeployed, blue for deployed
        const color = isUndeployed
            ? { r: 255, g: 200, b: 0 }
            : { r: 80, g: 160, b: 255 };

        const tex = buildMovementRadiusTexture(heightmap, settlements, reachable, color);
        tex.anisotropy = maxAniso;
        movementRadiusOverlay = buildFactionOverlayMesh(terrainMesh, tex);
        movementRadiusOverlay.position.y = 0.012;  // above AoR at 0.010
        movementRadiusOverlay.name = 'movementRadiusOverlay';
        scene.add(movementRadiusOverlay);

        console.log(`[sandbox] Movement radius: ${brigadeId} (${isUndeployed ? 'undeployed' : 'deployed'}, budget=${movementBudget}) -> ${reachable.size} reachable settlements`);
    }

    function hideMovementRadius(): void {
        if (movementRadiusOverlay) {
            scene.remove(movementRadiusOverlay);
            const mat = movementRadiusOverlay.material as THREE.MeshBasicMaterial;
            if (mat.map) mat.map.dispose();
            mat.dispose();
            movementRadiusOverlay.geometry.dispose();
            movementRadiusOverlay = null;
        }
    }

    // ---- Move selection highlights (green rings on selected destination settlements) ----
    let moveSelectionGroup: THREE.Group | null = null;
    let confirmMoveBtn: HTMLButtonElement | null = null;

    function buildSliceAdjacency(): Map<string, string[]> {
        const adj = new Map<string, string[]>();
        for (const e of (sandboxState.sliceData?.edges ?? [])) {
            if (!adj.has(e.a)) adj.set(e.a, []);
            if (!adj.has(e.b)) adj.set(e.b, []);
            adj.get(e.a)!.push(e.b);
            adj.get(e.b)!.push(e.a);
        }
        return adj;
    }

    function updateMoveSelectionVisuals(): void {
        // Remove old highlights
        if (moveSelectionGroup) { scene.remove(moveSelectionGroup); }
        moveSelectionGroup = new THREE.Group();
        moveSelectionGroup.name = 'moveSelectionHighlights';

        const ms = sandboxState.moveSelection;
        if (!ms || ms.selectedSids.length === 0) {
            // Remove confirm button
            if (confirmMoveBtn) { confirmMoveBtn.remove(); confirmMoveBtn = null; }
            return;
        }

        // Build green rings for each selected settlement
        for (const sid of ms.selectedSids) {
            const c = centroids.get(sid);
            if (!c) continue;
            const elev = sampleHeight(heightmap, c[0], c[1]);
            const [wx, wy, wz] = wgsToWorld(c[0], c[1], elev);

            const ringGeo = new THREE.RingGeometry(0.014, 0.022, 24);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0x00ff88, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthTest: false,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.set(wx, wy + 0.015, wz);
            ring.rotation.x = -Math.PI / 2;
            moveSelectionGroup.add(ring);
        }
        scene.add(moveSelectionGroup);

        // Show/update CONFIRM MOVE button for deployed brigades
        if (!ms.isUndeployed && ms.selectedSids.length > 0) {
            if (!confirmMoveBtn) {
                confirmMoveBtn = document.createElement('button');
                confirmMoveBtn.style.cssText = [
                    'position:absolute', 'bottom:60px', 'left:50%', 'transform:translateX(-50%)',
                    'z-index:20', 'padding:8px 20px',
                    'background:rgba(0,255,136,0.25)', 'border:2px solid #00ff88', 'color:#00ff88',
                    'font:13px "Courier New",monospace', 'font-weight:bold', 'cursor:pointer',
                    'pointer-events:all',
                ].join(';');
                confirmMoveBtn.onclick = confirmMoveOrder;
                overlay.appendChild(confirmMoveBtn);
            }
            confirmMoveBtn.textContent = `CONFIRM MOVE (${ms.selectedSids.length}/${ms.maxSettlements}) [Enter]`;
        }
    }

    function clearMoveSelection(): void {
        sandboxState.moveSelection = null;
        if (moveSelectionGroup) { scene.remove(moveSelectionGroup); moveSelectionGroup = null; }
        if (confirmMoveBtn) { confirmMoveBtn.remove(); confirmMoveBtn = null; }
    }

    function confirmMoveOrder(): void {
        const ms = sandboxState.moveSelection;
        if (!ms || ms.selectedSids.length === 0) return;

        const sf = sandboxState.sliceData?.formations[ms.brigadeId];
        if (!sf) return;

        const order: OrderEntry = {
            type: 'move',
            brigadeId: sf.id,
            brigadeName: sf.name,
            destinationSids: [...ms.selectedSids],
        };
        sandboxState.orders.push(order);
        updateOrdersPanel(ordersPanel, sandboxState.orders, handleRemoveOrder);
        rebuildOrderVisuals();
        showFadingMessage(`MOVE ORDER: ${sf.name} -> ${ms.selectedSids.join(', ')} (${ms.selectedSids.length} settlements)`, 2000);
        console.log(`[sandbox] Move order: ${sf.id} -> [${ms.selectedSids.join(', ')}]`);

        clearMoveSelection();
        hideMovementRadius();
        sandboxState.selectedFormationId = null;
    }

    function rebuildFormations(): void {
        // Remove old groups
        if (formationGroup) { scene.remove(formationGroup); formationGroup = null; }
        if (stemGroup) { scene.remove(stemGroup); stemGroup = null; }
        if (aorOverlay) { scene.remove(aorOverlay); aorOverlay = null; }
        hideMovementRadius();

        const currentSave = sliceToGameSave(sandboxState.sliceData!);
        corpsAggregates = buildCorpsAggregates(currentSave);

        const result = buildFormationLODLayer(heightmap, currentSave, centroids, sandboxState.sliceData!.brigade_aor);
        formationGroup = result.group;
        formationEntries = result.entries;
        scene.add(formationGroup);

        const stemResult = buildStemLines(formationEntries);
        stemGroup = stemResult.group;
        stemEntries = stemResult.stems;
        scene.add(stemGroup);

        // AoR overlay
        const aorTex = buildAoRTexture(heightmap, settlements, currentSave, sandboxState.sliceData?.edges, centroids);
        aorTex.anisotropy = maxAniso;
        aorOverlay = buildFactionOverlayMesh(terrainMesh, aorTex);
        aorOverlay.position.y = 0.010;
        aorOverlay.name = 'aorOverlay';
        aorOverlay.visible = aorEnabled;
        scene.add(aorOverlay);
    }

    function rebuildFactionOverlay(): void {
        const currentControllers = new Map<string, FactionId>();
        for (const [sid, faction] of Object.entries(sandboxState.sliceData!.political_controllers)) {
            currentControllers.set(sid, faction as FactionId);
        }
        const newFactionTex = buildFactionTexture(heightmap, settlements, currentControllers);
        newFactionTex.anisotropy = maxAniso;
        const factionMat = factionOverlay.material as THREE.MeshBasicMaterial;
        if (factionMat.map) factionMat.map.dispose();
        factionMat.map = newFactionTex;
        factionMat.needsUpdate = true;
    }

    // Initial build
    if (Object.keys(sliceData.formations).length > 0) {
        rebuildFormations();
    }

    // ---- Attack arrows and movement paths (3D overlays) ----
    let attackArrowGroup: THREE.Group | null = null;
    let movementPathGroup: THREE.Group | null = null;
    let highlightGroup: THREE.Group | null = null;

    function rebuildOrderVisuals(): void {
        if (attackArrowGroup) { scene.remove(attackArrowGroup); }
        if (movementPathGroup) { scene.remove(movementPathGroup); }

        attackArrowGroup = buildAttackArrows(
            sandboxState.orders, sandboxState.sliceData!.formations, centroids, heightmap,
        );
        scene.add(attackArrowGroup);

        movementPathGroup = buildMovementPaths(
            sandboxState.orders, sandboxState.sliceData!.formations, centroids, heightmap,
        );
        scene.add(movementPathGroup);
    }

    function setSettlementHighlight(sid: string | null, color: number = 0xffcc00): void {
        if (highlightGroup) { scene.remove(highlightGroup); highlightGroup = null; }
        if (sid) {
            highlightGroup = buildSettlementHighlight(sid, centroids, heightmap, color);
            scene.add(highlightGroup);
        }
    }

    // ---- HTML overlay container ----
    const overlay = document.createElement('div');
    overlay.id = 'sandbox-overlay';
    overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:5';
    container.style.position = 'relative';
    container.appendChild(overlay);

    // ---- Side panel ----
    const sidePanel = buildSidePanel();
    overlay.appendChild(sidePanel);

    const selectionPanel = buildSelectionPanel();
    sidePanel.appendChild(selectionPanel);

    const ordersPanel = buildOrdersPanel();
    sidePanel.appendChild(ordersPanel);

    const battleLogPanel = buildBattleLog();
    sidePanel.appendChild(battleLogPanel);

    const resourcePanel = buildResourcePanel();
    sidePanel.appendChild(resourcePanel);

    // Initial resource display
    updateResourcePanel(resourcePanel, computeFactionResources(sliceData.formations));

    // ---- Spawn panel ----
    const spawnPanel = buildSpawnPanel();
    sidePanel.appendChild(spawnPanel);

    let spawnCounter = 0;

    /** Build SpawnTemplate map from EQUIPMENT_CLASS_TEMPLATES */
    function getSpawnTemplates(): Record<string, SpawnTemplate> {
        const out: Record<string, SpawnTemplate> = {};
        for (const [cls, t] of Object.entries(EQUIPMENT_CLASS_TEMPLATES)) {
            out[cls] = { infantry: t.infantry, tanks: t.tanks, artillery: t.artillery, aa_systems: t.aa_systems };
        }
        return out;
    }

    /** Get settlements controlled by each faction for HQ dropdown */
    function getControlledSettlements(): Record<string, Array<{ sid: string; name: string }>> {
        const result: Record<string, Array<{ sid: string; name: string }>> = { RS: [], RBiH: [], HRHB: [] };
        const pc = sliceData.political_controllers;
        // Include faction-controlled + uncontrolled settlements for each faction
        // (sandbox mode: any faction can spawn on uncontrolled settlements)
        for (const s of sliceData.settlements) {
            const controller = pc[s.sid];
            if (controller && result[controller]) {
                // Settlement controlled by this faction
                result[controller]!.push({ sid: s.sid, name: s.name });
            } else if (!controller || controller === null) {
                // Uncontrolled — available to all factions in sandbox
                for (const f of ['RS', 'RBiH', 'HRHB']) {
                    result[f]!.push({ sid: s.sid, name: s.name });
                }
            }
        }
        // Sort by name for readability
        for (const arr of Object.values(result)) {
            arr.sort((a, b) => a.name.localeCompare(b.name));
        }
        return result;
    }

    function handleSpawnBrigade(faction: string, equipClass: string, name: string, hqSid: string): void {
        spawnCounter++;
        const id = `sandbox_${faction}_${spawnCounter}`;
        const template = EQUIPMENT_CLASS_TEMPLATES[equipClass as EquipmentClass];
        if (!template) return;

        const autoName = name || `${faction}-Bde-${spawnCounter}`;

        const formation: SliceFormation = {
            id,
            faction,
            name: autoName,
            kind: 'brigade',
            personnel: template.infantry,
            cohesion: 80,
            fatigue: 0,
            experience: 20,
            posture: 'defend',
            hq_sid: hqSid,
            status: 'active',
            composition: {
                infantry: template.infantry,
                tanks: template.tanks,
                artillery: template.artillery,
                aa_systems: template.aa_systems,
                tank_condition: { operational: 0.85, degraded: 0.10, non_operational: 0.05 },
                artillery_condition: { operational: 0.85, degraded: 0.10, non_operational: 0.05 },
            },
        };

        // Add to slice data
        sliceData.formations[id] = formation;

        // Claim HQ settlement for this faction
        sliceData.political_controllers[hqSid] = faction;

        // Spawn as UNDEPLOYED: only HQ settlement in AoR (column march posture)
        sliceData.brigade_aor[hqSid] = id;

        // Register as undeployed in deployment state tracker
        sandboxState.deploymentStates[id] = {
            status: 'undeployed',
            saved_aor_sids: [hqSid],
            hq_sid: hqSid,
        };

        console.log(`[sandbox] Spawned ${id} at ${hqSid}: UNDEPLOYED (1 settlement, move rate ${getUndeployedMovementRate(formation)})`);

        // Sync to game state
        const gs = sandboxState.gameState as Record<string, unknown>;
        const gsFormations = (gs['formations'] as Record<string, unknown>) ?? {};
        gsFormations[id] = { ...formation };
        gs['formations'] = gsFormations;
        const gsAor = (gs['brigade_aor'] as Record<string, string | null>) ?? {};
        for (const [sid, bid] of Object.entries(sliceData.brigade_aor)) {
            gsAor[sid] = bid;
        }
        gs['brigade_aor'] = gsAor;
        // Sync political controllers
        const gsPc = (gs['political_controllers'] as Record<string, string | null>) ?? {};
        for (const [sid, ctrl] of Object.entries(sliceData.political_controllers)) {
            gsPc[sid] = ctrl;
        }
        gs['political_controllers'] = gsPc;

        // Rebuild visuals
        rebuildFormations();
        rebuildFactionOverlay();
        updateResourcePanel(resourcePanel, computeFactionResources(sliceData.formations));
        refreshSpawnPanel();

        showFadingMessage(`SPAWNED: ${autoName} (${faction} ${equipClass}) at ${hqSid}`, 2000);
        console.log(`[sandbox] Spawned formation ${id}: ${autoName}, faction=${faction}, class=${equipClass}, hq=${hqSid}`);
    }

    function refreshSpawnPanel(): void {
        updateSpawnPanel(spawnPanel, getSpawnTemplates(), getControlledSettlements(), {
            onSpawn: handleSpawnBrigade,
        });
    }

    refreshSpawnPanel();

    // ---- AoR state ----
    let aorEnabled = true;

    // ---- Toolbar ----
    function rebuildToolbar(): void {
        const existing = document.getElementById('sandbox-toolbar');
        if (existing) existing.remove();

        const toolbar = buildToolbar(
            selectedRegion.id,
            sandboxState.turnNumber,
            sandboxState.mode,
            {
                onRegionChange: (regionId: string) => {
                    const newParams = new URLSearchParams(window.location.search);
                    newParams.set('region', regionId);
                    window.location.search = newParams.toString();
                },
                onAdvanceTurn: handleAdvanceTurn,
                onSave: handleSave,
                onLoad: handleLoad,
                onReset: handleReset,
                onModeChange: (mode: InteractionMode) => {
                    sandboxState.mode = mode;
                    sandboxState.selectedFormationId = null;
                    setSettlementHighlight(null);
                    hideMovementRadius();
                    clearMoveSelection();
                    showFadingMessage(`MODE: ${mode.toUpperCase()}`, 1500);
                    rebuildToolbar();
                },
                onToggleAoR: () => {
                    aorEnabled = !aorEnabled;
                    if (aorOverlay) {
                        aorOverlay.visible = aorEnabled;
                    }
                    showFadingMessage(aorEnabled ? 'AoR: ON' : 'AoR: OFF', 1000);
                },
            },
        );
        overlay.appendChild(toolbar);
    }

    rebuildToolbar();

    // ---- Formation tooltip ----
    const tooltip = buildFormationTooltip();
    overlay.appendChild(tooltip);

    // ---- Turn advance handler ----
    function handleAdvanceTurn(): void {
        if (!sandboxState.sliceData || !sandboxState.gameState) {
            showFadingMessage('No slice data loaded', 2000);
            return;
        }

        const gs = sandboxState.gameState as Record<string, unknown>;

        // Apply queued orders to game state
        const attackOrders: Record<string, string> = {};
        const moveOrders: Record<string, { destination_sids: string[] }> = {};

        for (const order of sandboxState.orders) {
            if (order.type === 'attack' && order.targetSid) {
                attackOrders[order.brigadeId] = order.targetSid;
            } else if (order.type === 'move' && order.destinationSids) {
                moveOrders[order.brigadeId] = { destination_sids: order.destinationSids };
            }
        }

        gs['brigade_attack_orders'] = attackOrders;
        gs['brigade_movement_orders'] = moveOrders;

        // Sandbox: claim uncontrolled settlements along movement paths for the moving faction
        // The canon engine's BFS only traverses faction-controlled territory, so we pre-claim
        // uncontrolled settlements on the path to enable movement in the sandbox.
        const gsPc = (gs['political_controllers'] as Record<string, string | null>) ?? {};
        const adjMap = new Map<string, string[]>();
        for (const e of sandboxState.sliceData.edges) {
            if (!adjMap.has(e.a)) adjMap.set(e.a, []);
            if (!adjMap.has(e.b)) adjMap.set(e.b, []);
            adjMap.get(e.a)!.push(e.b);
            adjMap.get(e.b)!.push(e.a);
        }
        for (const [bid, mOrder] of Object.entries(moveOrders)) {
            const f = sandboxState.sliceData.formations[bid];
            if (!f) continue;
            const faction = f.faction;
            if (!mOrder.destination_sids || mOrder.destination_sids.length === 0) continue;

            // Find AoR start nodes
            const aorSids: string[] = [];
            const gsAorPre = (gs['brigade_aor'] as Record<string, string | null>) ?? {};
            for (const [sid, aBid] of Object.entries(gsAorPre)) {
                if (aBid === bid) aorSids.push(sid);
            }
            if (aorSids.length === 0) aorSids.push(f.hq_sid);

            // BFS from AoR to ALL destination settlements, claiming uncontrolled nodes on path
            // First, do a full BFS to build parent map
            const visited = new Set<string>(aorSids);
            const parent = new Map<string, string>();
            const queue = [...aorSids];
            const destSet = new Set<string>(mOrder.destination_sids);

            while (queue.length > 0) {
                const current = queue.shift()!;
                for (const n of (adjMap.get(current) ?? [])) {
                    if (visited.has(n)) continue;
                    const ctrl = gsPc[n];
                    if (ctrl && ctrl !== faction) continue;  // skip enemy
                    visited.add(n);
                    parent.set(n, current);
                    queue.push(n);
                }
            }

            // Trace path from each destination back to AoR, claiming uncontrolled settlements
            for (const destSid of mOrder.destination_sids) {
                if (!visited.has(destSid)) continue;  // unreachable
                let node: string | undefined = destSid;
                while (node && !aorSids.includes(node)) {
                    if (!gsPc[node] || gsPc[node] === null) {
                        gsPc[node] = faction;
                        sandboxState.sliceData.political_controllers[node] = faction;
                    }
                    node = parent.get(node);
                }
            }

            // Also claim the destination settlements themselves
            for (const destSid of mOrder.destination_sids) {
                if (!gsPc[destSid] || gsPc[destSid] === null) {
                    gsPc[destSid] = faction;
                    sandboxState.sliceData.political_controllers[destSid] = faction;
                }
            }
        }
        gs['political_controllers'] = gsPc;

        // Run turn
        try {
            const report = advanceSandboxTurn(
                gs as any,
                sandboxState.sliceData.edges.map(e => ({ a: e.a, b: e.b })) as any,
                (sandboxState.terrainScalars ?? { by_sid: {} }) as any,
                sandboxState.sliceData.sidToMun,
                sandboxState.deploymentStates,
            );

            sandboxState.turnNumber = report.turn;
            sandboxState.turnReports.push(report);

            // Sync slice data from mutated game state
            const gsFormations = (gs as any).formations ?? {};
            for (const [fid, f] of Object.entries(gsFormations)) {
                if (sandboxState.sliceData.formations[fid]) {
                    Object.assign(sandboxState.sliceData.formations[fid]!, f);
                }
            }
            const gsControllers = (gs as any).political_controllers ?? {};
            for (const [sid, faction] of Object.entries(gsControllers)) {
                sandboxState.sliceData.political_controllers[sid] = faction as string | null;
            }

            // Sync brigade_aor back to slice (movement changes AoR)
            const gsAor = (gs as any).brigade_aor ?? {};
            for (const [sid, bid] of Object.entries(gsAor)) {
                sandboxState.sliceData.brigade_aor[sid] = bid as string | null;
            }

            // Update hq_sid based on AoR (engine movement doesn't update hq_sid)
            // For each brigade, set hq_sid to first AoR settlement (deterministic: sorted)
            // Also ensure political control follows new AoR
            const brigadeAorSids = new Map<string, string[]>();
            for (const [sid, bid] of Object.entries(sandboxState.sliceData.brigade_aor)) {
                if (!bid) continue;
                if (!brigadeAorSids.has(bid)) brigadeAorSids.set(bid, []);
                brigadeAorSids.get(bid)!.push(sid);
            }
            for (const [bid, sids] of brigadeAorSids) {
                sids.sort();
                const sf = sandboxState.sliceData.formations[bid];
                if (sf && sids.length > 0) {
                    sf.hq_sid = sids[0]!;
                    // Also update in game state
                    const gsf = (gsFormations as Record<string, any>)[bid];
                    if (gsf) gsf.hq_sid = sids[0]!;

                    // Ensure political control follows AoR: brigade's AoR settlements → brigade's faction
                    for (const sid of sids) {
                        const currentCtrl = sandboxState.sliceData.political_controllers[sid];
                        if (!currentCtrl || currentCtrl === null) {
                            sandboxState.sliceData.political_controllers[sid] = sf.faction;
                            (gs as any).political_controllers[sid] = sf.faction;
                        }
                    }
                }
            }

            // Clear orders
            sandboxState.orders = [];

            // Rebuild visuals
            rebuildFactionOverlay();
            rebuildFormations();
            rebuildOrderVisuals();

            // Update UI
            appendBattleLog(battleLogPanel, report);
            updateOrdersPanel(ordersPanel, sandboxState.orders, handleRemoveOrder);
            updateResourcePanel(resourcePanel, computeFactionResources(sandboxState.sliceData.formations));
            refreshSpawnPanel();
            rebuildToolbar();

            showFadingMessage(`TURN ${report.turn} COMPLETE | Battles: ${report.attackReport.orders_processed} | Flips: ${report.attackReport.flips_applied}`, 3000);

            console.log(`[sandbox] Turn ${report.turn}: ${report.attackReport.orders_processed} battles, ${report.attackReport.flips_applied} flips`);
        } catch (e) {
            console.error('[sandbox] Turn advance failed:', e);
            showFadingMessage(`TURN ADVANCE FAILED: ${(e as Error).message}`, 4000);
        }
    }

    // ---- Save/Load/Reset handlers ----
    function handleSave(): void {
        const saveData = {
            version: 1,
            region: selectedRegion.id,
            turnNumber: sandboxState.turnNumber,
            sliceData: {
                political_controllers: sandboxState.sliceData?.political_controllers ?? {},
                formations: sandboxState.sliceData?.formations ?? {},
                brigade_aor: sandboxState.sliceData?.brigade_aor ?? {},
            },
            orders: sandboxState.orders,
            turnReports: sandboxState.turnReports,
        };
        const json = JSON.stringify(saveData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sandbox_${selectedRegion.id}_turn${sandboxState.turnNumber}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showFadingMessage('STATE SAVED', 1500);
    }

    function handleLoad(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                if (!data.version || !data.sliceData) throw new Error('Invalid save file');

                // Restore state
                sandboxState.turnNumber = data.turnNumber ?? 0;
                sandboxState.orders = data.orders ?? [];
                sandboxState.turnReports = data.turnReports ?? [];

                if (sandboxState.sliceData) {
                    Object.assign(sandboxState.sliceData.political_controllers, data.sliceData.political_controllers ?? {});
                    Object.assign(sandboxState.sliceData.formations, data.sliceData.formations ?? {});
                    Object.assign(sandboxState.sliceData.brigade_aor, data.sliceData.brigade_aor ?? {});
                }
                sandboxState.gameState = sliceToGameState(sandboxState.sliceData!);

                // Rebuild everything
                rebuildFactionOverlay();
                rebuildFormations();
                rebuildOrderVisuals();
                updateOrdersPanel(ordersPanel, sandboxState.orders, handleRemoveOrder);
                updateResourcePanel(resourcePanel, computeFactionResources(sandboxState.sliceData!.formations));
                rebuildToolbar();

                showFadingMessage(`STATE LOADED: Turn ${sandboxState.turnNumber}`, 2000);
            } catch (e) {
                showFadingMessage(`LOAD FAILED: ${(e as Error).message}`, 3000);
            }
        };
        input.click();
    }

    function handleReset(): void {
        // Reload page with same params to reset
        window.location.reload();
    }

    function handleRemoveOrder(idx: number): void {
        sandboxState.orders.splice(idx, 1);
        updateOrdersPanel(ordersPanel, sandboxState.orders, handleRemoveOrder);
        rebuildOrderVisuals();
    }

    // ---- Click handler: mode-aware interaction ----
    let clickStartTime = 0;
    let clickStartX = 0;
    let clickStartY = 0;

    renderer.domElement.addEventListener('mousedown', (e: MouseEvent) => {
        clickStartTime = performance.now();
        clickStartX = e.clientX;
        clickStartY = e.clientY;
    }, { signal });

    renderer.domElement.addEventListener('mouseup', (e: MouseEvent) => {
        const dt = performance.now() - clickStartTime;
        const dx = e.clientX - clickStartX;
        const dy = e.clientY - clickStartY;
        if (dt > 300 || Math.sqrt(dx * dx + dy * dy) > 5) return;

        const rect = renderer.domElement.getBoundingClientRect();
        const clickScreenX = e.clientX - rect.left;
        const clickScreenY = e.clientY - rect.top;
        const screenW = rect.width;
        const screenH = rect.height;

        if (sandboxState.mode === 'select') {
            // Try formation picking first
            let bestEntry: FormationEntry | null = null;
            let bestDistSq = Infinity;
            const MAX_PICK_RADIUS = 80;
            const projVec = new THREE.Vector3();

            for (const entry of formationEntries) {
                if (!entry.sprite.visible) continue;
                const mat = entry.sprite.material as THREE.SpriteMaterial;
                if (mat.opacity < 0.1) continue;

                entry.sprite.getWorldPosition(projVec);
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
                console.log(`[sandbox] SELECT picked: ${bestEntry.formationId} dist=${Math.sqrt(bestDistSq).toFixed(1)}px`);
                // Formation selected
                sandboxState.selectedFormationId = bestEntry.formationId;
                const sliceFormation = sandboxState.sliceData?.formations[bestEntry.formationId] ?? null;
                const deployState = sliceFormation ? (sandboxState.deploymentStates[sliceFormation.id] ?? null) : null;
                const deployStatus: DeploymentStatus | null = deployState?.status ?? null;
                updateSelectionPanel(selectionPanel, sliceFormation, {
                    onPostureChange: (newPosture: string) => {
                        if (sliceFormation) {
                            sliceFormation.posture = newPosture;
                            // Queue posture order in game state
                            const gs = sandboxState.gameState as any;
                            if (!gs.brigade_posture_orders) gs.brigade_posture_orders = [];
                            gs.brigade_posture_orders.push({ brigade_id: sliceFormation.id, posture: newPosture });
                            showFadingMessage(`${sliceFormation.name}: posture -> ${newPosture.toUpperCase()}`, 1500);
                        }
                    },
                    onDeploy: (formationId: string) => {
                        const f = sandboxState.sliceData?.formations[formationId];
                        if (!f) return;

                        // Get current AoR settlements for this brigade
                        const aor = sandboxState.sliceData?.brigade_aor ?? {};
                        const currentAoR: string[] = [];
                        for (const [sid, bid] of Object.entries(aor)) {
                            if (bid === formationId) currentAoR.push(sid);
                        }

                        sandboxState.deploymentStates[formationId] = {
                            status: 'deploying',
                            saved_aor_sids: currentAoR,
                            hq_sid: f.hq_sid,
                            turns_remaining: 1,
                        };

                        showFadingMessage(`${f.name}: DEPLOYING (advance turn to complete)`, 2000);
                        // Refresh the selection panel to show new status
                        updateSelectionPanel(selectionPanel, f, {
                            onPostureChange: undefined,
                        }, 'deploying', getMovementRatesForFormation(f));
                    },
                    onUndeploy: (formationId: string) => {
                        const f = sandboxState.sliceData?.formations[formationId];
                        if (!f) return;

                        // Get current AoR settlements for this brigade
                        const aor = sandboxState.sliceData?.brigade_aor ?? {};
                        const currentAoR: string[] = [];
                        for (const [sid, bid] of Object.entries(aor)) {
                            if (bid === formationId) currentAoR.push(sid);
                        }

                        sandboxState.deploymentStates[formationId] = {
                            status: 'undeploying',
                            saved_aor_sids: currentAoR,
                            hq_sid: f.hq_sid,
                            turns_remaining: 1,
                        };

                        showFadingMessage(`${f.name}: UNDEPLOYING (advance turn to complete)`, 2000);
                        // Refresh the selection panel to show new status
                        updateSelectionPanel(selectionPanel, f, {
                            onPostureChange: undefined,
                        }, 'undeploying', getMovementRatesForFormation(f));
                    },
                }, deployStatus, sliceFormation ? getMovementRatesForFormation(sliceFormation) : undefined);

                // Highlight HQ settlement
                if (sliceFormation) {
                    setSettlementHighlight(sliceFormation.hq_sid, 0x00ff88);
                }

                // Show tooltip
                const containerRect = container!.getBoundingClientRect();
                const currentSave = sliceToGameSave(sandboxState.sliceData!);
                showFormationTooltip(tooltip, bestEntry, currentSave, corpsAggregates, e.clientX, e.clientY, containerRect);

                console.log(`[sandbox] Selected formation: ${bestEntry.formationId} (${bestEntry.kind})`);
            } else {
                // Try settlement picking
                const sid = findNearestSettlement(clickScreenX, clickScreenY, screenW, screenH, camera, centroids, heightmap);
                if (sid) {
                    setSettlementHighlight(sid, 0xffcc00);
                    sandboxState.selectedFormationId = null;
                    updateSelectionPanel(selectionPanel, null);
                    tooltip.style.display = 'none';
                    // Find settlement name
                    const sInfo = sliceData.settlements.find(s => s.sid === sid);
                    const sName = sInfo ? sInfo.name : sid;
                    const ctrl = sliceData.political_controllers[sid];
                    showFadingMessage(`${sName} (${sid})${ctrl ? ' [' + ctrl + ']' : ' [uncontrolled]'}`, 1500);
                    console.log(`[sandbox] Selected settlement: ${sid}`);

                    // Update spawn panel HQ to this settlement
                    const hqSel = document.getElementById('spawn-hq') as HTMLSelectElement | null;
                    if (hqSel) {
                        // Ensure this sid exists as an option (it should for uncontrolled in sandbox mode)
                        let found = false;
                        for (const opt of hqSel.options) {
                            if (opt.value === sid) { found = true; break; }
                        }
                        if (!found) {
                            // Add it as an option
                            const opt = document.createElement('option');
                            opt.value = sid;
                            opt.textContent = `${sName} (${sid})`;
                            hqSel.appendChild(opt);
                        }
                        hqSel.value = sid;
                        hqSel.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } else {
                    setSettlementHighlight(null);
                    sandboxState.selectedFormationId = null;
                    updateSelectionPanel(selectionPanel, null);
                    tooltip.style.display = 'none';
                }
            }

        } else if (sandboxState.mode === 'attack') {
            // Attack mode: first click selects brigade, second click selects target settlement
            if (!sandboxState.selectedFormationId) {
                // Pick a brigade
                let bestEntry: FormationEntry | null = null;
                let bestDistSq = Infinity;
                const projVec = new THREE.Vector3();
                const ATK_PICK_RADIUS = 80;

                for (const entry of formationEntries) {
                    if (!entry.sprite.visible || entry.kind !== 'brigade') continue;
                    const mat = entry.sprite.material as THREE.SpriteMaterial;
                    if (mat.opacity < 0.1) continue;

                    entry.sprite.getWorldPosition(projVec);
                    projVec.project(camera);
                    const sx = (projVec.x * 0.5 + 0.5) * screenW;
                    const sy = (-projVec.y * 0.5 + 0.5) * screenH;

                    const ddx = sx - clickScreenX;
                    const ddy = sy - clickScreenY;
                    const distSq = ddx * ddx + ddy * ddy;

                    if (distSq < bestDistSq && distSq < ATK_PICK_RADIUS * ATK_PICK_RADIUS) {
                        bestDistSq = distSq;
                        bestEntry = entry;
                    }
                }

                if (bestEntry) {
                    sandboxState.selectedFormationId = bestEntry.formationId;
                    const sf = sandboxState.sliceData?.formations[bestEntry.formationId] ?? null;
                    if (sf) {
                        setSettlementHighlight(sf.hq_sid, 0xff4444);
                        showFadingMessage(`ATTACK: Select target for ${sf.name}`, 2000);
                    }
                }
            } else {
                // Pick target settlement
                const sid = findNearestSettlement(clickScreenX, clickScreenY, screenW, screenH, camera, centroids, heightmap);
                if (sid) {
                    const sf = sandboxState.sliceData?.formations[sandboxState.selectedFormationId];
                    if (sf) {
                        const order: OrderEntry = {
                            type: 'attack',
                            brigadeId: sf.id,
                            brigadeName: sf.name,
                            targetSid: sid,
                        };
                        sandboxState.orders.push(order);
                        updateOrdersPanel(ordersPanel, sandboxState.orders, handleRemoveOrder);
                        rebuildOrderVisuals();
                        setSettlementHighlight(sid, 0xff4444);
                        showFadingMessage(`ATTACK ORDER: ${sf.name} -> ${sid}`, 2000);
                        console.log(`[sandbox] Attack order: ${sf.id} -> ${sid}`);
                    }
                }
                sandboxState.selectedFormationId = null;
            }

        } else if (sandboxState.mode === 'move') {
            // Move mode: first click selects brigade, second click selects destination
            if (!sandboxState.selectedFormationId) {
                let bestEntry: FormationEntry | null = null;
                let bestDistSq = Infinity;
                const projVec = new THREE.Vector3();
                const PICK_RADIUS = 80;
                let debugClosest = { id: '', dist: Infinity, sx: 0, sy: 0, visible: false, opacity: 0 };

                for (const entry of formationEntries) {
                    if (entry.kind !== 'brigade') continue;
                    const mat = entry.sprite.material as THREE.SpriteMaterial;

                    entry.sprite.getWorldPosition(projVec);
                    projVec.project(camera);
                    const sx = (projVec.x * 0.5 + 0.5) * screenW;
                    const sy = (-projVec.y * 0.5 + 0.5) * screenH;

                    const ddx = sx - clickScreenX;
                    const ddy = sy - clickScreenY;
                    const distSq = ddx * ddx + ddy * ddy;
                    const dist = Math.sqrt(distSq);

                    // Track closest for debug regardless of visibility
                    if (dist < debugClosest.dist) {
                        debugClosest = { id: entry.formationId, dist, sx, sy, visible: entry.sprite.visible, opacity: mat.opacity };
                    }

                    if (!entry.sprite.visible) continue;
                    if (mat.opacity < 0.1) continue;

                    if (distSq < bestDistSq && distSq < PICK_RADIUS * PICK_RADIUS) {
                        bestDistSq = distSq;
                        bestEntry = entry;
                    }
                }

                console.log(`[sandbox] MOVE pick: click=(${clickScreenX.toFixed(0)},${clickScreenY.toFixed(0)}), canvas=(${screenW}x${screenH}), entries=${formationEntries.length}, brigades=${formationEntries.filter(e => e.kind === 'brigade').length}, closest=${debugClosest.id} at (${debugClosest.sx.toFixed(0)},${debugClosest.sy.toFixed(0)}) dist=${debugClosest.dist.toFixed(1)} vis=${debugClosest.visible} opa=${debugClosest.opacity.toFixed(2)}`);

                if (bestEntry) {
                    sandboxState.selectedFormationId = bestEntry.formationId;
                    const sf = sandboxState.sliceData?.formations[bestEntry.formationId] ?? null;
                    if (sf) {
                        setSettlementHighlight(sf.hq_sid, 0x3388ff);
                        showMovementRadius(bestEntry.formationId);
                        const deployState = sandboxState.deploymentStates[bestEntry.formationId];
                        const isUndeployed = deployState?.status === 'undeployed';
                        const moveRate = isUndeployed ? getUndeployedMovementRate(sf) : DEPLOYED_MOVEMENT_RATE;

                        // Compute reachable settlements for move selection
                        const startSids: string[] = [];
                        for (const [sid, bid] of Object.entries(sandboxState.sliceData?.brigade_aor ?? {})) {
                            if (bid === bestEntry.formationId) startSids.push(sid);
                        }
                        if (startSids.length === 0) startSids.push(sf.hq_sid);

                        const reachable = computeReachableSettlements(
                            startSids, sf.faction, moveRate,
                            sandboxState.sliceData!.edges,
                            sandboxState.sliceData!.political_controllers,
                            sandboxState.sliceData!.sidSet,
                            {
                                allowUncontrolled: true, // sandbox exception
                                useUndeployedScaling: isUndeployed,
                                terrainScalars: sandboxState.terrainScalars,
                            },
                        );

                        // Compute max destination settlements
                        const maxSettlements = isUndeployed
                            ? 1
                            : Math.min(4, Math.max(1, Math.floor(sf.personnel / 400)));

                        // Initialize move selection state
                        sandboxState.moveSelection = {
                            brigadeId: bestEntry.formationId,
                            isUndeployed,
                            maxSettlements,
                            reachableSids: reachable,
                            selectedSids: [],
                        };

                        showFadingMessage(`MOVE: ${sf.name} (${isUndeployed ? 'undeployed' : 'deployed'}, budget ${moveRate}, ${maxSettlements} sett max)`, 2000);
                        console.log(`[sandbox] MOVE picked: ${sf.id} (${sf.name}) dist=${Math.sqrt(bestDistSq).toFixed(1)}px, reachable=${reachable.size}, maxSett=${maxSettlements}`);
                    }
                } else {
                    // Fall through to settlement pick as visual feedback
                    const sid = findNearestSettlement(clickScreenX, clickScreenY, screenW, screenH, camera, centroids, heightmap);
                    if (sid) {
                        showFadingMessage(`No brigade at click — nearest settlement: ${sid}. Click a brigade counter.`, 2000);
                    }
                }
            } else {
                // Multi-click destination selection
                const ms = sandboxState.moveSelection;
                if (!ms) {
                    // No move selection state — should not happen, reset
                    hideMovementRadius();
                    sandboxState.selectedFormationId = null;
                    return;
                }

                const sid = findNearestSettlement(clickScreenX, clickScreenY, screenW, screenH, camera, centroids, heightmap);
                if (!sid) return;

                // Toggle: if already selected, deselect
                const existingIdx = ms.selectedSids.indexOf(sid);
                if (existingIdx >= 0) {
                    ms.selectedSids.splice(existingIdx, 1);
                    updateMoveSelectionVisuals();
                    showFadingMessage(`Deselected ${sid} (${ms.selectedSids.length}/${ms.maxSettlements})`, 1000);
                    return;
                }

                // Validate: must be within reachable radius
                if (!ms.reachableSids.has(sid)) {
                    setSettlementHighlight(sid, 0xff0000);
                    showFadingMessage(`OUT OF RANGE: ${sid} is not reachable`, 2000);
                    return;
                }

                // Validate: must not be enemy-controlled
                const pc = sandboxState.sliceData?.political_controllers ?? {};
                const sf = sandboxState.sliceData?.formations[ms.brigadeId];
                if (!sf) return;
                const destCtrl = pc[sid];
                if (destCtrl && destCtrl !== sf.faction) {
                    setSettlementHighlight(sid, 0xff0000);
                    showFadingMessage(`BLOCKED: ${sid} controlled by ${destCtrl}`, 2000);
                    return;
                }

                // Validate: max settlements not exceeded
                if (ms.selectedSids.length >= ms.maxSettlements) {
                    showFadingMessage(`MAX ${ms.maxSettlements} settlements reached`, 1500);
                    return;
                }

                // Validate contiguity: first selection is free; subsequent must be adjacent to an existing selection
                if (ms.selectedSids.length > 0) {
                    const adj = buildSliceAdjacency();
                    const isAdjacent = ms.selectedSids.some(existingSid => {
                        const neighbors = adj.get(existingSid) ?? [];
                        return neighbors.includes(sid);
                    });
                    if (!isAdjacent) {
                        setSettlementHighlight(sid, 0xff8800);
                        showFadingMessage(`NOT CONTIGUOUS: ${sid} must be adjacent to selected area`, 2000);
                        return;
                    }
                }

                // Add to selection
                ms.selectedSids.push(sid);
                updateMoveSelectionVisuals();

                // Undeployed: auto-confirm on single selection
                if (ms.isUndeployed) {
                    confirmMoveOrder();
                    return;
                }

                // Deployed: show selection count, wait for Enter or CONFIRM button
                showFadingMessage(`Selected ${sid} (${ms.selectedSids.length}/${ms.maxSettlements}) — Enter to confirm`, 1500);

                // Auto-confirm if max reached
                if (ms.selectedSids.length >= ms.maxSettlements) {
                    confirmMoveOrder();
                }
            }
        }
    }, { signal });

    // Hide tooltip on scroll/zoom
    renderer.domElement.addEventListener('wheel', () => { tooltip.style.display = 'none'; }, { signal });

    // ESC: cancel current action / hide tooltip / hide movement radius / clear move selection
    // Enter: confirm move order
    window.addEventListener('keydown', (e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
        if (e.key === 'Escape') {
            tooltip.style.display = 'none';
            hideMovementRadius();
            clearMoveSelection();
            sandboxState.selectedFormationId = null;
            setSettlementHighlight(null);
        } else if (e.key === 'Enter' && sandboxState.moveSelection && sandboxState.moveSelection.selectedSids.length > 0) {
            confirmMoveOrder();
        }
    }, { signal });

    // ---- WASD keyboard movement ----
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
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
        const k = e.key.toLowerCase();
        keysDown.add(k);
        const d = computePanDelta(k);
        if (d) { camera.position.add(d); controls.target.add(d); }
    }, { signal });
    window.addEventListener('keyup', (e) => { keysDown.delete(e.key.toLowerCase()); }, { signal });

    function applyKeyboardPan(): void {
        keysDown.forEach((k) => {
            const d = computePanDelta(k);
            if (d) { camera.position.add(d); controls.target.add(d); }
        });
    }

    // ---- Resize + render loop ----
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }, { signal });

    // Register cleanup for HMR: dispose Three.js resources
    window.__sandboxCleanup = () => {
        renderer.dispose();
        controls.dispose();
        scene.clear();
    };

    showFadingMessage(`SANDBOX READY: ${selectedRegion.name} | ${Object.keys(sliceData.formations).length} formations | ${sliceData.settlements.length} settlements`, 3000);

    let frameCount = 0;
    (function animate() {
        if (signal.aborted) return; // Stop render loop on HMR
        requestAnimationFrame(animate);
        frameCount++;
        applyKeyboardPan();
        updateCityLabelVisibility(cityLabelEntries, camera, controls, cityLabelsEnabled);
        updateFormationVisibility(formationEntries, camera);

        if (stemEntries.length > 0) {
            updateStemVisibility(stemEntries, formationEntries);
        }

        // AoR overlay: fade in at operational zoom
        const aorOverlayMesh = aorOverlay as THREE.Mesh | null;
        if (aorOverlayMesh && aorEnabled) {
            const camY = camera.position.y;
            const aorThreshold = FORMATION_LOD_THRESHOLD;
            if (camY >= aorThreshold) {
                aorOverlayMesh.visible = false;
            } else {
                aorOverlayMesh.visible = true;
                const aorMat = aorOverlayMesh.material as THREE.MeshBasicMaterial;
                const t = 1.0 - Math.min(1.0, camY / aorThreshold);
                aorMat.opacity = Math.min(1.0, t * 1.5);
            }
        }

        // Subtle pulse on corps counters
        if (formationEntries.length > 0) {
            const pulse = 0.92 + 0.08 * Math.sin(frameCount * 0.025);
            for (const e of formationEntries) {
                if (e.kind !== 'corps' || !e.sprite.visible) continue;
                const mat = e.sprite.material as THREE.SpriteMaterial;
                if (mat.opacity > 0.3) {
                    mat.opacity = Math.min(1.0, mat.opacity * pulse);
                }
            }
        }

        // Animate settlement highlight ring (rotation)
        const activeHighlightGroup = highlightGroup as THREE.Group | null;
        if (activeHighlightGroup) {
            for (const child of activeHighlightGroup.children) {
                if (child instanceof THREE.Mesh) {
                    child.rotation.z += 0.01;
                }
            }
        }

        controls.update();
        renderer.render(scene, camera);
    })();
}

main(hmrAbort.signal);
