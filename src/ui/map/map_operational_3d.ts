/**
 * Operational Map — 2.5D Three.js viewer (Night Satellite Atlas)
 * Standalone tactical overlay: terrain + rivers + roads + cities + faction control.
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
import { FactionId, SettlementsGeoJSON, SettlementProperties, SharedBorderSegment, SettlementFeature, GameSave, FormationRecord, CorpsAggregate, FormationEntry } from './types';
import { WarMapRenderer } from './WarMapRenderer';
import { computeSharedBorders } from './data/DataLoader';
import { toViewerSave } from './data/ViewerStateAdapter';
import { buildFrontLineMesh } from './FrontLineLayer';
import { BattleMarkerLayer } from './BattleMarkerLayer';
import { CommandHierarchyPanel } from './CommandHierarchyPanel';
import { buildCorpsAggregates, buildFormationLODLayer, nextCounterDataMode, updateFormationVisibility } from './FormationSpriteLayer';
import { FORMATION_COUNTER_DATA_MODES, type FormationCounterDataMode } from './constants';
import { MapModeController, modeFromFunctionKey, type MapModeId } from './MapModeController';
import { applyFogOfWarToEntries, rebuildGhostCounterLayer } from './FogOfWarLayer';
import { resolveRightClickIntent } from './interaction/RightClickHandler';
import { clearMovementRangePreview, rebuildMovementRangePreview } from './interaction/MovementRangePreview';
import { AttackOddsPreview } from './interaction/AttackOddsPreview';
import { clearOrderArrows, drawMovementOrderArrow } from './OrderArrowLayer';
import { clearSupplyOverlay, rebuildSupplyOverlay } from './SupplyOverlay';
import { clearDisplacementOverlay, rebuildDisplacementOverlay } from './DisplacementOverlay';
import { clearCorpsSectorOverlay, rebuildCorpsSectorOverlay } from './CorpsSectorOverlay';
import { PostProcessingManager } from './postfx/PostProcessingManager';
import { AudioManager } from './audio/AudioManager';

// ---------------------------------------------------------------------------
// Constants & URLs (base URL so fetches work from Electron/iframe)
// ---------------------------------------------------------------------------
function getDataBaseUrl(): string {
    if (typeof window === 'undefined' || !window.location?.origin) return '';
    return window.location.origin;
}

function adaptivePixelRatio(widthPx: number): number {
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    return Math.min(dpr, 2, Math.max(1, (widthPx * dpr) / 1920));
}

const HEIGHTMAP_PATH = '/data/derived/terrain/heightmap_3d_viewer.json';
const WATERWAYS_PATH = '/data/derived/terrain/osm_waterways_snapshot_h6_2.geojson';
const ROADS_PATH = '/data/derived/terrain/osm_roads_snapshot_h6_2.geojson';
const SETTLEMENTS_PATH = '/data/derived/settlements_wgs84_1990.geojson';
const BASE_MAP_PATH = '/data/derived/A1_BASE_MAP.geojson';
const EDGES_PATH = '/data/derived/settlement_edges.json';
const TERRAIN_SCALARS_PATH = '/data/derived/terrain/settlements_terrain_scalars.json';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface LineGeoJSON { type: 'FeatureCollection'; features: Array<{ geometry: { type: string; coordinates: any }; properties: Record<string, unknown> }> }

interface EdgeRecord {
    a: string;
    b: string;
}

interface TerrainScalarRecord {
    road_access_index: number;
    river_crossing_penalty: number;
    elevation_mean_m: number;
    slope_index: number;
    terrain_friction_index: number;
}

interface TerrainScalarsPayload {
    by_sid: Record<string, TerrainScalarRecord>;
}

/** Cached 3D map data filled by preload3DData(); used by init3DMap when available. */
export interface Preload3DDataCache {
    heightmap: HeightmapData;
    settlements: SettlementsGeoJSON;
    baseFeatures?: { features: any[] } | null;
    waterways: LineGeoJSON | null;
    roads: LineGeoJSON | null;
    edges: EdgeRecord[];
    sharedBorders: SharedBorderSegment[];
    terrainBySid: Record<string, TerrainScalarRecord>;
}

let preload3DDataCache: Preload3DDataCache | null = null;
let preloadCacheReadyResolve: (() => void) | null = null;
/** Resolves when preload has populated the cache (so init3DMap can wait briefly for it). */
const preloadCacheReadyPromise = new Promise<void>(r => {
    preloadCacheReadyResolve = r;
});

interface DesktopBridge {
    getCurrentGameState?: () => Promise<string | null>;
    setGameStateUpdatedCallback?: (cb: (stateJson: string) => void) => void;
    stageDeployOrder?: (brigadeId: string) => Promise<{ ok: boolean; error?: string }>;
    stageUndeployOrder?: (brigadeId: string) => Promise<{ ok: boolean; error?: string }>;
    stageBrigadeMovementOrder?: (brigadeId: string, targetSettlementIds: string[]) => Promise<{ ok: boolean; error?: string }>;
    queryMovementRange?: (brigadeId: string) => Promise<{
        ok: boolean;
        error?: string;
        start_sid?: string | null;
        reachable_deployed?: string[];
        reachable_column?: string[];
    }>;
    queryMovementPath?: (brigadeId: string, destinationSid: string) => Promise<{
        ok: boolean;
        error?: string;
        path?: string[];
        eta_turns?: number;
        terrain_costs?: number[];
    }>;
    queryCombatEstimate?: (brigadeId: string, targetSettlementId: string) => Promise<{
        ok: boolean;
        error?: string;
        expected_loss_fraction?: number;
        win_probability?: number;
        power_ratio?: number;
    }>;
    querySupplyPaths?: () => Promise<{
        ok: boolean;
        error?: string;
        report?: {
            factions: Array<{ faction_id: string; isolated_controlled: string[] }>;
        };
    }>;
    queryCorpsSectors?: () => Promise<{
        ok: boolean;
        error?: string;
        sectors?: Array<{ corps_id: string; faction: string; settlement_ids: string[] }>;
    }>;
    queryBattleEvents?: () => Promise<{
        ok: boolean;
        error?: string;
        turn?: number;
        events?: Array<{
            turn: number;
            settlement_id: string;
            from: string | null;
            to: string | null;
            mechanism: string;
            mun_id: string | null;
        }>;
    }>;
}

interface MapAppStateBridge {
    snapshot?: {
        selectedFormationId?: string | null;
    };
    setSelectedFormation?: (formationId: string | null) => void;
    setSelectedSettlement?: (sid: string | null) => void;
}

interface MapAppBridge {
    state?: MapAppStateBridge;
    openBrigadePanelForSelection?: () => void;
    openSettlementPanelForSelection?: (sid: string) => void;
}

declare global {
    interface Window {
        awwv?: DesktopBridge;
        __awwvMapApp?: MapAppBridge;
    }
}

// ---------------------------------------------------------------------------
// Coordinate helpers
// ---------------------------------------------------------------------------

// Removed wgsToWorld and sampleHeight (now in terrain/TextureHelpers.ts and TerrainMeshBuilder.ts)
import { sampleHeight, buildMunBordersTexture } from './terrain/TextureHelpers';
import { wgsToWorld } from './terrain/TerrainMeshBuilder';
import { buildFactionTexture, factionFromEthnicity } from './SettlementControlLayer';


/**
 * Smooth heightmap elevations in-place with multiple box-blur passes.
 * Each pass averages each pixel with its neighbours in a (2*radius+1) kernel.
 * Two passes of box-blur ≈ one Gaussian blur, producing gently rolling terrain.
 */
function smoothHeightmap(hm: HeightmapData, passes = 3, radius = 2): void {
    const { width: w, height: h, elevations } = hm;
    const buf = new Float64Array(w * h);

    for (let pass = 0; pass < passes; pass++) {
        // Horizontal pass
        for (let y = 0; y < h; y++) {
            let sum = 0;
            let count = 0;
            // Seed window
            for (let x = 0; x <= radius && x < w; x++) {
                sum += elevations[y * w + x]!;
                count++;
            }
            for (let x = 0; x < w; x++) {
                buf[y * w + x] = sum / count;
                // Extend right edge of window
                const right = x + radius + 1;
                if (right < w) { sum += elevations[y * w + right]!; count++; }
                // Shrink left edge
                const left = x - radius;
                if (left >= 0) { sum -= elevations[y * w + left]!; count--; }
            }
        }
        // Copy horizontal result back
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
// Night satellite base texture builder
// ---------------------------------------------------------------------------

// Texture generation moved to terrain/*.ts
function calculateCentroids(settlements: SettlementsGeoJSON): Map<string, [number, number]> {
    const centroids = new Map<string, [number, number]>();
    for (const feature of settlements.features) {
        const props = feature.properties;
        if (!props || !feature.geometry) continue;
        const rings = ringsFromSettlement(feature.geometry);
        if (rings.length === 0) continue;
        const centroid = ringCentroid(rings[0]!);
        centroids.set(props.sid, centroid);
    }
    return centroids;
}

// ---------------------------------------------------------------------------
// Faction control overlay texture (moved to SettlementControlLayer)
// ---------------------------------------------------------------------------

/** Per-faction hatch angle in degrees (plan §2.5: RS 45°, RBiH -45°, HRHB horizontal). */
const AOR_HATCH_ANGLE: Record<string, number> = { RS: 45, RBiH: -45, HRHB: 0 };
const AOR_HATCH_SPACING = 8;
const AOR_HATCH_WIDTH = 2.5;
const AOR_PULSE_ALPHA = 0.15;  // TACTICAL_MAP_SYSTEM Pass 6: 0.08–0.22
const AOR_BOUNDARY_GLOW = 4;   // shadowBlur 2–6px
const CONTACT_EDGE_COLOR = 'rgba(255, 68, 68, 0.9)';  // plan §4.5: red glowing
const CONTACT_EDGE_GLOW = 4;
const CONTACT_EDGE_WIDTH = 3;

function buildSelectedAoRTexture(
    hm: HeightmapData,
    settlements: SettlementsGeoJSON,
    save: GameSave,
    selectedBrigadeIds: ReadonlySet<string>,
    edges: EdgeRecord[],
): THREE.CanvasTexture {
    const TEX_W = 4096;
    const TEX_H = 4096;
    const canvas = new OffscreenCanvas(TEX_W, TEX_H);
    const ctx = canvas.getContext('2d')!;
    const proj = (window as any).makeCanvasProjection ? (window as any).makeCanvasProjection(hm.bbox, TEX_W, TEX_H) : { x: (lon: number) => ((lon - hm.bbox[0]) / (hm.bbox[2] - hm.bbox[0])) * TEX_W, y: (lat: number) => ((hm.bbox[3] - lat) / (hm.bbox[3] - hm.bbox[1])) * TEX_H };
    ctx.clearRect(0, 0, TEX_W, TEX_H);

    const brigadeFaction = new Map<string, string>();
    for (const fid of Object.keys(save.formations).sort((a, b) => a.localeCompare(b))) {
        const formation = save.formations[fid];
        if (!formation || formation.kind !== 'brigade') continue;
        brigadeFaction.set(fid, formation.faction);
    }

    const sidToFaction = new Map<string, string>();
    for (const sid of Object.keys(save.brigade_aor ?? {}).sort((a, b) => a.localeCompare(b))) {
        const brigadeId = save.brigade_aor[sid];
        if (!brigadeId) continue;
        if (!selectedBrigadeIds.has(brigadeId)) continue;
        const faction = brigadeFaction.get(brigadeId);
        if (!faction) continue;
        sidToFaction.set(sid, faction);
    }

    const ourFactions = new Set<string>();
    for (const bid of selectedBrigadeIds) {
        const f = brigadeFaction.get(bid);
        if (f) ourFactions.add(f);
    }
    const controllers = save.political_controllers ?? {};
    const brigadeAor = save.brigade_aor ?? {};
    const isEnemy = (sid: string): boolean =>
        !sidToFaction.has(sid) &&
        ((controllers[sid] != null && !ourFactions.has(controllers[sid])) ||
            (brigadeAor[sid] != null && !selectedBrigadeIds.has(brigadeAor[sid]!)));

    const AOR_STROKE: Record<string, string> = {
        RS: 'rgba(255, 100, 100, 0.85)',
        RBiH: 'rgba(100, 235, 130, 0.85)',
        HRHB: 'rgba(110, 165, 255, 0.85)',
    };
    const AOR_FILL: Record<string, string> = {
        RS: `rgba(255, 100, 100, ${AOR_PULSE_ALPHA})`,
        RBiH: `rgba(100, 235, 130, ${AOR_PULSE_ALPHA})`,
        HRHB: `rgba(110, 165, 255, ${AOR_PULSE_ALPHA})`,
    };
    const sidToPx = new Map<string, [number, number]>();

    for (const feature of settlements.features) {
        const props = feature.properties;
        if (!props || !feature.geometry) continue;
        const faction = sidToFaction.get(props.sid);
        if (!faction) continue;
        const rings = ringsFromSettlement(feature.geometry);
        for (const ring of rings) {
            if (ring.length < 3) continue;
            const cx = ringCentroid(ring);
            sidToPx.set(props.sid, [proj.x(cx[0]), proj.y(cx[1])]);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(proj.x(ring[0]![0]!), proj.y(ring[0]![1]!));
            for (let i = 1; i < ring.length; i++) {
                ctx.lineTo(proj.x(ring[i]![0]!), proj.y(ring[i]![1]!));
            }
            ctx.closePath();
            ctx.clip();
            ctx.fillStyle = AOR_FILL[faction] ?? `rgba(120,120,120,${AOR_PULSE_ALPHA})`;
            ctx.fill();
            const angle = (AOR_HATCH_ANGLE[faction] ?? 0) * (Math.PI / 180);
            const cos = Math.cos(angle), sin = Math.sin(angle);
            ctx.strokeStyle = AOR_STROKE[faction] ?? 'rgba(140,140,140,0.6)';
            ctx.lineWidth = AOR_HATCH_WIDTH;
            const extent = Math.max(TEX_W, TEX_H) * 1.5;
            for (let d = -extent; d <= extent; d += AOR_HATCH_SPACING) {
                ctx.beginPath();
                if (Math.abs(sin) < 0.01) {
                    ctx.moveTo(0, d);
                    ctx.lineTo(TEX_W, d);
                } else {
                    const y0 = d / sin;
                    const y1 = (d - TEX_W * cos) / sin;
                    ctx.moveTo(0, y0);
                    ctx.lineTo(TEX_W, y1);
                }
                ctx.stroke();
            }
            ctx.restore();
            ctx.beginPath();
            ctx.moveTo(proj.x(ring[0]![0]!), proj.y(ring[0]![1]!));
            for (let i = 1; i < ring.length; i++) {
                ctx.lineTo(proj.x(ring[i]![0]!), proj.y(ring[i]![1]!));
            }
            ctx.closePath();
            ctx.shadowColor = AOR_STROKE[faction] ?? 'rgba(140,140,140,0.6)';
            ctx.shadowBlur = AOR_BOUNDARY_GLOW;
            ctx.strokeStyle = AOR_STROKE[faction] ?? 'rgba(140,140,140,0.4)';
            ctx.lineWidth = 2.0;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    for (const { a, b } of edges) {
        const aOur = sidToFaction.has(a);
        const bOur = sidToFaction.has(b);
        if (!aOur && !bOur) continue;
        if (aOur && bOur) continue;
        const ourSid = aOur ? a : b;
        const otherSid = aOur ? b : a;
        if (!isEnemy(otherSid)) continue;
        const pa = sidToPx.get(ourSid);
        const pb = sidToPx.get(otherSid);
        if (!pa || !pb) continue;
        ctx.beginPath();
        ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(pb[0], pb[1]);
        ctx.strokeStyle = CONTACT_EDGE_COLOR;
        ctx.lineWidth = CONTACT_EDGE_WIDTH;
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = CONTACT_EDGE_GLOW;
        ctx.stroke();
        ctx.shadowBlur = 0;
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

// Settlement faction helpers moved to SettlementControlLayer

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

/** First [lon, lat] from a settlement GeoJSON (for WGS84 detection). */
function getFirstCoordinate(fc: SettlementsGeoJSON): [number, number] | null {
    const f = fc?.features?.[0];
    if (!f?.geometry?.coordinates) return null;
    if (f.geometry.type === 'Polygon') {
        const c = f.geometry.coordinates as number[][][];
        if (Array.isArray(c[0]) && c[0]?.[0]?.length >= 2) {
            return [c[0][0][0] as number, c[0][0][1] as number];
        }
    }
    if (f.geometry.type === 'MultiPolygon') {
        const c = f.geometry.coordinates as number[][][][];
        if (Array.isArray(c[0]) && c[0]?.[0]?.[0]?.length >= 2) {
            return [c[0][0][0][0] as number, c[0][0][0][1] as number];
        }
    }
    return null;
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

// buildTerrainMesh removed, now handled by WarMapRenderer

/** Build a second mesh slightly above the terrain for the faction overlay. */
function buildFactionOverlayMesh(terrainMesh: THREE.Mesh, factionTexture: THREE.CanvasTexture): THREE.Mesh {
    const mat = new THREE.MeshBasicMaterial({
        map: factionTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
    });
    const overlay = new THREE.Mesh(terrainMesh.geometry.clone(), mat);
    // Shift slightly up to avoid z-fighting
    overlay.position.y = 0.005;
    overlay.name = 'factionOverlay';
    return overlay;
}

// ---------------------------------------------------------------------------
// Dynamic city label sprites (LOD: more labels appear as camera gets closer)
// ---------------------------------------------------------------------------

/**
 * Population tier thresholds — each tier becomes visible when the camera
 * drops below its `maxCamY` distance.  Sorted biggest-first so the largest
 * cities are always visible while smaller ones fade in progressively.
 *
 * Labels are also culled by XZ distance from the camera target so they
 * don't float up into the sky on the far horizon at oblique angles.
 */
interface CityEntry {
    sprite: THREE.Sprite;
    pop: number;
    /** Camera Y threshold: label is visible when camera.position.y < this */
    maxCamY: number;
    /** Max XZ distance from camera target for this label to be visible */
    maxDist: number;
    /** Base sprite Y-scale for this label */
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

    // Deduplicate Sarajevo districts into one label
    let sarajevoAdded = false;
    const cities: Array<{ name: string; pop: number; lon: number; lat: number }> = [];

    for (const feature of settlements.features) {
        const props = feature.properties;
        if (!props) continue;
        const centroid = centroids.get(props.sid);
        if (!centroid) continue;
        const pop = props.population_total ?? 0;

        const name = props.settlement_name || props.name || '';
        // Sarajevo special case: merge districts
        if (name.startsWith('Sarajevo Dio')) {
            if (!sarajevoAdded) {
                sarajevoAdded = true;
                cities.push({ name: 'SARAJEVO', pop: 500000, lon: 18.41, lat: 43.86 });
            }
            continue;
        }

        if (pop < 5000) continue;  // only label towns and larger (user can click for smaller)
        cities.push({ name: name.toUpperCase(), pop, lon: centroid[0], lat: centroid[1] });
    }

    // Sort by population descending (largest first for consistent z-order)
    cities.sort((a, b) => b.pop - a.pop);

    for (const city of cities) {
        // Determine population tier → camera height threshold + XZ distance cull
        //   Capital/major cities (>80k):  always visible
        //   Large cities (>40k):          visible from far
        //   Medium cities (>15k):         visible from medium distance
        //   Towns (>5k):                  visible when moderately zoomed
        const maxCamY = city.pop > 80000 ? Infinity
            : city.pop > 40000 ? 12
                : city.pop > 15000 ? 6
                    : 3.5;

        // Max XZ distance from camera target — prevents labels floating on horizon
        const maxDist = city.pop > 80000 ? Infinity
            : city.pop > 40000 ? 8.0
                : city.pop > 15000 ? 4.0
                    : 2.5;

        // Canvas size scales with importance — bigger cities get crisper textures
        const W = city.pop > 40000 ? 512 : city.pop > 5000 ? 384 : 256;
        const H = city.pop > 40000 ? 48 : city.pop > 5000 ? 40 : 32;
        const canvas = new OffscreenCanvas(W, H);
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, W, H);

        // Font size based on population
        const fontSize = city.pop > 80000 ? 26
            : city.pop > 40000 ? 20
                : city.pop > 15000 ? 16
                    : 13;
        ctx.font = `bold ${fontSize}px 'IBM Plex Mono', 'Consolas', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Dark outline/halo for readability over terrain
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.strokeText(city.name, W / 2, H / 2);

        // Warm glow
        ctx.shadowColor = 'rgba(255, 220, 140, 0.7)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = city.pop > 40000 ? 'rgba(255, 245, 220, 0.98)'
            : 'rgba(230, 225, 200, 0.92)';
        ctx.fillText(city.name, W / 2, H / 2);
        ctx.shadowBlur = 0;

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
        sprite.position.set(wx, wy + 0.05, wz);

        // Base scale — larger for more important cities, compact for smaller ones
        const baseScaleX = city.pop > 80000 ? 1.3
            : city.pop > 40000 ? 1.0
                : city.pop > 15000 ? 0.75
                    : 0.55;
        const baseScaleY = baseScaleX * (H / W);
        sprite.scale.set(baseScaleX, baseScaleY, 1);

        // Start hidden — updateCityLabelVisibility() will show the right ones
        sprite.visible = false;

        group.add(sprite);
        entries.push({ sprite, pop: city.pop, maxCamY, maxDist, baseScaleY, baseScaleX });
    }

    console.log(`[op-map] City labels: ${entries.length} prepared (${cities.filter(c => c.pop > 80000).length} always, ${cities.filter(c => c.pop > 15000 && c.pop <= 80000).length} medium, ${cities.filter(c => c.pop <= 15000).length} close-range)`);
    return { group, entries };
}

/**
 * Per-frame update: show/hide labels based on camera height + distance from
 * camera target.  Distance culling prevents labels from floating into the sky
 * at oblique viewing angles — only labels near where the camera is looking
 * are shown.  Labels fade in smoothly near their thresholds.
 */
function updateCityLabelVisibility(
    entries: CityEntry[],
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    labelsEnabled: boolean,
): void {
    if (!labelsEnabled) return;
    const camY = camera.position.y;
    const target = controls.target;
    // Gentle inverse-sqrt scaling — labels grow modestly as camera descends
    const scaleFactor = Math.max(0.5, Math.min(1.3, 2.2 / Math.sqrt(Math.max(camY, 0.3))));

    for (let i = 0; i < entries.length; i++) {
        const e = entries[i]!;
        // Camera height check
        if (camY >= e.maxCamY) { e.sprite.visible = false; continue; }

        // XZ distance from camera target — cull labels far from where we're looking
        if (e.maxDist < Infinity) {
            const dx = e.sprite.position.x - target.x;
            const dz = e.sprite.position.z - target.z;
            const distSq = dx * dx + dz * dz;
            if (distSq > e.maxDist * e.maxDist) { e.sprite.visible = false; continue; }
        }

        e.sprite.visible = true;
        e.sprite.scale.set(
            e.baseScaleX * scaleFactor,
            e.baseScaleY * scaleFactor,
            1,
        );
        // Fade in as camera approaches height threshold
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
// Formation billboard markers
// ---------------------------------------------------------------------------

const FORMATION_LOD_THRESHOLD = 4.0;
const FORMATION_FADE_ZONE = 0.20;

// Formation helpers moved to FormationSpriteLayer

// ---------------------------------------------------------------------------
// HTML overlay builders
// ---------------------------------------------------------------------------

function buildInfoPanel(runId: string | null, save: GameSave | null, baselineMode: boolean): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'op-info-panel';
    panel.style.cssText = 'position:absolute;top:12px;left:12px;z-index:10;padding:10px 14px;background:rgba(4,4,12,0.88);border:1px solid #1a2a3e;font:11px "IBM Plex Mono",monospace;color:#8090a0;pointer-events:none;line-height:1.7';
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
    <div style="color:#b0c0d0;font-weight:bold;letter-spacing:0.08em">OPERATIONAL MAP \u2014 2.5D</div>
    <div style="color:#506080;font-size:10px;letter-spacing:0.06em">A WAR WITHOUT VICTORY</div>
    <div style="color:#607090;margin-top:4px;font-size:10px">${statusLine}</div>
  `;
    return panel;
}

function buildRunLoader(currentRunId: string | null): HTMLElement {
    const c = document.createElement('div');
    c.id = 'op-run-loader';
    c.style.cssText = 'position:absolute;top:12px;right:12px;z-index:10;padding:8px 12px;background:rgba(4,4,12,0.88);border:1px solid #1a2a3e;font:11px "IBM Plex Mono",monospace;color:#8090a0;display:flex;align-items:center;gap:8px';
    const label = document.createElement('span');
    label.textContent = 'RUN:';
    label.style.color = '#506080';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'run_id';
    input.value = currentRunId ?? '';
    input.style.cssText = 'background:rgba(10,10,20,0.9);border:1px solid #2a3a5e;color:#a0b8d0;font:11px "IBM Plex Mono",monospace;padding:3px 7px;width:140px;outline:none';
    const btn = document.createElement('button');
    btn.textContent = 'LOAD';
    btn.style.cssText = 'background:#0a1428;border:1px solid #2a3a5a;color:#6080b0;font:11px "IBM Plex Mono",monospace;padding:3px 10px;cursor:pointer';
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
): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;top:80px;right:12px;z-index:10;padding:8px 12px;background:rgba(4,4,12,0.88);border:1px solid #1a2a3e;font:11px "IBM Plex Mono",monospace;color:#8090a0;display:flex;flex-direction:column;gap:6px';

    function makeToggle(label: string, defaultOn: boolean, cb: (on: boolean) => void): HTMLElement {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;color:#7090a0';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = defaultOn;
        checkbox.style.cssText = 'accent-color:#4a6a90';
        checkbox.addEventListener('change', () => cb(checkbox.checked));
        row.appendChild(checkbox);
        row.appendChild(document.createTextNode(label));
        return row;
    }

    container.appendChild(makeToggle('FACTION CONTROL', true, onToggleFaction));
    container.appendChild(makeToggle('CITY LABELS', true, onToggleCityLabels));
    return container;
}

function buildHUD(settlementCount: number, formationCount: number, hasGameState: boolean): HTMLElement {
    const hud = document.createElement('div');
    hud.id = 'op-hud';
    hud.style.cssText = 'position:absolute;bottom:0;left:0;right:0;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:7px 16px;background:rgba(4,4,12,0.88);border-top:1px solid #1a2a3e;font:11px "IBM Plex Mono",monospace;color:#6080a0';
    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex;align-items:center;gap:14px';
    for (const { label, color } of [
        { label: 'RS', color: '#993333' },
        { label: 'RBiH', color: '#2d7a3f' },
        { label: 'HRHB', color: '#2a5a9a' },
    ]) {
        const item = document.createElement('span');
        item.style.cssText = 'display:flex;align-items:center;gap:5px';
        item.innerHTML = `<span style="display:inline-block;width:12px;height:12px;background:${color};border:1px solid rgba(255,255,255,0.15)"></span>${label}`;
        legend.appendChild(item);
    }
    const hint = document.createElement('div');
    hint.style.cssText = 'color:#3a5070;text-align:center';
    hint.textContent = 'WASD to pan \u00b7 Drag to rotate \u00b7 Scroll to zoom \u00b7 Right-drag to pan';
    const stats = document.createElement('div');
    stats.style.cssText = 'color:#4a6080;text-align:right';
    stats.textContent = hasGameState
        ? `SETTLEMENTS: ${settlementCount} | FORMATIONS: ${formationCount}`
        : `SETTLEMENTS: ${settlementCount}`;
    hud.appendChild(legend);
    hud.appendChild(hint);
    hud.appendChild(stats);
    return hud;
}

function modeLabel(mode: MapModeId): string {
    if (mode === 'operations') return 'F1 OPERATIONS';
    if (mode === 'supply') return 'F2 SUPPLY';
    if (mode === 'displacement') return 'F3 DISPLACEMENT';
    return 'F4 COMMAND';
}

function buildMapModeBadge(initialMode: MapModeId): HTMLDivElement {
    const badge = document.createElement('div');
    badge.style.cssText = [
        'position:absolute',
        'top:12px',
        'right:12px',
        'z-index:12',
        'padding:6px 10px',
        'border:1px solid rgba(94,120,168,0.6)',
        'background:rgba(8,12,24,0.88)',
        'color:#b7c8e5',
        'font:11px "IBM Plex Mono", monospace',
        'letter-spacing:0.04em',
    ].join(';');
    badge.textContent = modeLabel(initialMode);
    return badge;
}

function buildPostFxAudioBadge(): HTMLDivElement {
    const badge = document.createElement('div');
    badge.style.cssText = [
        'position:absolute',
        'top:44px',
        'right:12px',
        'z-index:12',
        'padding:6px 10px',
        'border:1px solid rgba(90,112,160,0.45)',
        'background:rgba(7,10,18,0.82)',
        'color:#b7c8e5',
        'font:11px "IBM Plex Mono", monospace',
    ].join(';');
    return badge;
}

function buildOrdersPanel(
    onDeploy: (formationId: string) => void,
    onUndeploy: (formationId: string) => void,
    onSelectFormation: (formationId: string | null) => void,
    onConfirmMove: (formationId: string, path: string[]) => void,
    onClearMove: () => void,
): {
    container: HTMLElement;
    setFormations: (formations: FormationRecord[]) => void;
    setSelectionInfo: (text: string) => void;
    setSelectedFormation: (formationId: string | null) => void;
    setMovePath: (path: string[]) => void;
} {
    const container = document.createElement('div');
    container.id = 'op-orders-panel';
    container.style.cssText = 'position:absolute;left:12px;bottom:48px;z-index:10;padding:10px 12px;background:rgba(4,4,12,0.92);border:1px solid #1a2a3e;font:11px "IBM Plex Mono",monospace;color:#90a8c0;display:flex;flex-direction:column;gap:8px;min-width:220px;pointer-events:all';

    const title = document.createElement('div');
    title.textContent = 'FORMATION ORDERS';
    title.style.cssText = 'font-weight:bold;color:#b0c0d0;letter-spacing:0.06em';
    container.appendChild(title);

    const select = document.createElement('select');
    select.style.cssText = 'background:#0a1428;border:1px solid #2a3a5a;color:#b0c0d0;font:11px "IBM Plex Mono",monospace;padding:4px 6px';
    select.addEventListener('change', () => {
        const id = select.value || null;
        onSelectFormation(id);
    });
    container.appendChild(select);

    const info = document.createElement('div');
    info.style.cssText = 'color:#6f86a2;line-height:1.5;min-height:2.8em';
    info.textContent = 'Select a brigade to show movement stance and reachable overlay.';
    container.appendChild(info);

    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex;gap:6px';
    const deployBtn = document.createElement('button');
    deployBtn.textContent = 'DEPLOY';
    deployBtn.style.cssText = 'background:#0e2a18;border:1px solid #1f5c38;color:#8de3b0;font:11px "IBM Plex Mono",monospace;padding:4px 8px;cursor:pointer';
    deployBtn.addEventListener('click', () => {
        if (select.value) onDeploy(select.value);
    });
    const undeployBtn = document.createElement('button');
    undeployBtn.textContent = 'UNDEPLOY';
    undeployBtn.style.cssText = 'background:#2a160e;border:1px solid #6d3a23;color:#e3b08d;font:11px "IBM Plex Mono",monospace;padding:4px 8px;cursor:pointer';
    undeployBtn.addEventListener('click', () => {
        if (select.value) onUndeploy(select.value);
    });
    buttons.appendChild(deployBtn);
    buttons.appendChild(undeployBtn);
    container.appendChild(buttons);

    const moveInfo = document.createElement('div');
    moveInfo.style.cssText = 'color:#7d95af;line-height:1.4;min-height:2.2em';
    moveInfo.textContent = 'Move path: -';
    container.appendChild(moveInfo);

    const moveButtons = document.createElement('div');
    moveButtons.style.cssText = 'display:flex;gap:6px';
    const confirmMoveBtn = document.createElement('button');
    confirmMoveBtn.textContent = 'CONFIRM MOVE';
    confirmMoveBtn.style.cssText = 'background:#10224a;border:1px solid #274b94;color:#9dc0ff;font:11px "IBM Plex Mono",monospace;padding:4px 8px;cursor:pointer';
    confirmMoveBtn.addEventListener('click', () => {
        const id = select.value;
        if (!id) return;
        const path = moveInfo.getAttribute('data-path');
        const parsed = path ? path.split(',').filter(Boolean) : [];
        onConfirmMove(id, parsed);
    });
    const clearMoveBtn = document.createElement('button');
    clearMoveBtn.textContent = 'CLEAR PATH';
    clearMoveBtn.style.cssText = 'background:#1b1f2a;border:1px solid #49576e;color:#a8b6ca;font:11px "IBM Plex Mono",monospace;padding:4px 8px;cursor:pointer';
    clearMoveBtn.addEventListener('click', () => onClearMove());
    moveButtons.appendChild(confirmMoveBtn);
    moveButtons.appendChild(clearMoveBtn);
    container.appendChild(moveButtons);

    return {
        container,
        setFormations: (formations: FormationRecord[]) => {
            const current = select.value;
            select.innerHTML = '';
            const empty = document.createElement('option');
            empty.value = '';
            empty.textContent = formations.length > 0 ? 'Select brigade...' : 'No active brigades';
            select.appendChild(empty);
            for (const f of formations) {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.textContent = `${f.name} (${f.faction})`;
                select.appendChild(opt);
            }
            if (current && formations.some((f) => f.id === current)) {
                select.value = current;
            } else {
                select.value = '';
            }
            onSelectFormation(select.value || null);
        },
        setSelectionInfo: (text: string) => {
            info.textContent = text;
        },
        setSelectedFormation: (formationId: string | null) => {
            select.value = formationId ?? '';
            onSelectFormation(select.value || null);
        },
        setMovePath: (path: string[]) => {
            moveInfo.setAttribute('data-path', path.join(','));
            moveInfo.textContent = path.length > 0 ? `Move path: ${path.join(' -> ')}` : 'Move path: -';
        },
    };
}

// ---------------------------------------------------------------------------
// Status message helpers
// ---------------------------------------------------------------------------

/** When embedded (e.g. in tactical map), no #message exists; init3DMap sets this. */
let embeddedMessageEl: HTMLElement | null = null;

function showMessage(msg: string): void {
    const el = embeddedMessageEl ?? document.getElementById('message');
    if (el) {
        el.textContent = msg;
        el.classList.add('visible');
        (el as HTMLElement).style.display = 'block';
    }
}

function hideMessage(): void {
    const el = embeddedMessageEl ?? document.getElementById('message');
    if (el) {
        el.classList.remove('visible');
        (el as HTMLElement).style.display = 'none';
    }
}

function showFadingMessage(msg: string, delayMs = 2000): void {
    const el = embeddedMessageEl ?? document.getElementById('message');
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

function getDesktopBridge(): DesktopBridge | null {
    const bridge = window.awwv;
    if (!bridge || typeof bridge !== 'object') return null;
    return bridge;
}

function getMapAppBridge(): MapAppBridge | null {
    const app = window.__awwvMapApp;
    if (!app || typeof app !== 'object') return null;
    return app;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function buildAdjacency(edges: EdgeRecord[]): Map<string, string[]> {
    const map = new Map<string, Set<string>>();
    for (const { a, b } of edges) {
        if (!map.has(a)) map.set(a, new Set<string>());
        if (!map.has(b)) map.set(b, new Set<string>());
        map.get(a)!.add(b);
        map.get(b)!.add(a);
    }
    const out = new Map<string, string[]>();
    for (const [sid, neighbors] of map.entries()) {
        out.set(sid, [...neighbors].sort((x, y) => x.localeCompare(y)));
    }
    return out;
}

function getDefaultTerrain(): TerrainScalarRecord {
    return {
        road_access_index: 0.5,
        river_crossing_penalty: 0,
        elevation_mean_m: 200,
        slope_index: 0.1,
        terrain_friction_index: 0.1,
    };
}

function getColumnMovementBudget(f: FormationRecord): number {
    const c = f.composition;
    if (!c) return 12;
    const infantry = Math.max(0, c.infantry ?? 0);
    const tanks = Math.max(0, c.tanks ?? 0);
    const artillery = Math.max(0, c.artillery ?? 0);
    const aa = Math.max(0, c.aa_systems ?? 0);
    const denom = Math.max(1, infantry + tanks + artillery + aa);
    const heavyShare = (tanks + artillery + 0.5 * aa) / denom;
    const infantryBonus = clamp(infantry / 2200, 0, 1);
    const raw = 12 - Math.round(heavyShare * 4) + infantryBonus;
    return Math.round(clamp(raw, 8, 14));
}

function getColumnEdgeCost(from: string, to: string, terrainBySid: Record<string, TerrainScalarRecord>): number {
    const fromT = terrainBySid[from] ?? getDefaultTerrain();
    const toT = terrainBySid[to] ?? getDefaultTerrain();
    const roadPenalty = (1 - clamp((fromT.road_access_index + toT.road_access_index) / 2, 0, 1)) * 0.9;
    const slopePenalty = clamp((fromT.slope_index + toT.slope_index) / 2, 0, 1) * 0.8;
    const frictionPenalty = clamp((fromT.terrain_friction_index + toT.terrain_friction_index) / 2, 0, 1) * 0.9;
    const riverPenalty = clamp(Math.max(fromT.river_crossing_penalty, toT.river_crossing_penalty), 0, 1) * 1.2;
    const uphillPenalty = Math.max(0, toT.elevation_mean_m - fromT.elevation_mean_m) / 400;
    return 1 + roadPenalty + slopePenalty + frictionPenalty + riverPenalty + uphillPenalty;
}

function getFormationStartSid(save: GameSave, formation: FormationRecord): string | null {
    if (formation.hq_sid) return formation.hq_sid;
    const owned = Object.keys(save.brigade_aor).sort((a, b) => a.localeCompare(b));
    for (const sid of owned) {
        if (save.brigade_aor[sid] === formation.id) return sid;
    }
    return null;
}

function computeReachableSettlements(
    save: GameSave,
    formation: FormationRecord,
    adjacency: Map<string, string[]>,
    terrainBySid: Record<string, TerrainScalarRecord>,
): Set<string> {
    const start = getFormationStartSid(save, formation);
    if (!start) return new Set<string>();
    const faction = formation.faction;
    const stance = formation.movement_stance ?? (formation.movement_status === 'packing' ? 'column' : 'combat');
    const budget = stance === 'column' ? getColumnMovementBudget(formation) : 3;
    const isFriendly = (sid: string) => save.political_controllers[sid] === faction;
    if (!isFriendly(start)) return new Set<string>();

    const bestCost = new Map<string, number>();
    const queue: Array<{ sid: string; cost: number }> = [{ sid: start, cost: 0 }];
    bestCost.set(start, 0);

    while (queue.length > 0) {
        queue.sort((a, b) => (a.cost - b.cost) || a.sid.localeCompare(b.sid));
        const current = queue.shift()!;
        if (current.cost > (bestCost.get(current.sid) ?? Number.POSITIVE_INFINITY)) continue;
        const neighbors = adjacency.get(current.sid) ?? [];
        for (const next of neighbors) {
            if (!isFriendly(next)) continue;
            const stepCost = stance === 'column'
                ? getColumnEdgeCost(current.sid, next, terrainBySid)
                : 1;
            const nextCost = current.cost + stepCost;
            if (nextCost > budget) continue;
            const prevCost = bestCost.get(next);
            if (prevCost === undefined || nextCost < prevCost - 1e-9) {
                bestCost.set(next, nextCost);
                queue.push({ sid: next, cost: nextCost });
            }
        }
    }
    return new Set(bestCost.keys());
}

// ---------------------------------------------------------------------------
// Preload 3D data (call during game load so init3DMap can use cache)
// ---------------------------------------------------------------------------

async function fetchAndParse3DData(base: string): Promise<Preload3DDataCache> {
    const [hmRes, stRes, baseMapRes, wwRes, rdRes, edgeRes, terrainRes] = await Promise.all([
        fetch(`${base}${HEIGHTMAP_PATH}`),
        fetch(`${base}${SETTLEMENTS_PATH}`),
        fetch(`${base}${BASE_MAP_PATH}`).catch(() => null),
        fetch(`${base}${WATERWAYS_PATH}`).catch(() => null),
        fetch(`${base}${ROADS_PATH}`).catch(() => null),
        fetch(`${base}${EDGES_PATH}`).catch(() => null),
        fetch(`${base}${TERRAIN_SCALARS_PATH}`).catch(() => null),
    ]);

    if (!hmRes.ok) throw new Error(`Heightmap HTTP ${hmRes.status}`);
    const heightmap = (await hmRes.json()) as HeightmapData;
    if (!heightmap.bbox || !heightmap.elevations) throw new Error('Invalid heightmap');

    let settlements: SettlementsGeoJSON;
    if (!stRes.ok) {
        const fallbackRes = await fetch(`${base}/data/derived/settlements_a1_viewer.geojson`);
        if (!fallbackRes.ok) throw new Error(`Settlements HTTP ${stRes.status}. Need WGS84 data.`);
        const candidate = (await fallbackRes.json()) as SettlementsGeoJSON;
        if (!candidate?.features?.length) throw new Error(`Settlements HTTP ${stRes.status}`);
        const firstCoord = getFirstCoordinate(candidate);
        if (!firstCoord || firstCoord[0] < 12 || firstCoord[0] > 20 || firstCoord[1] < 42 || firstCoord[1] > 46) {
            throw new Error(`Settlements HTTP ${stRes.status}. Need WGS84 data.`);
        }
        settlements = candidate;
    } else {
        settlements = (await stRes.json()) as SettlementsGeoJSON;
    }
    if (!settlements.features) throw new Error('Invalid settlements GeoJSON');

    let baseFeatures = null;
    if (baseMapRes?.ok) {
        try { baseFeatures = await baseMapRes.json(); } catch { /* optional */ }
    }

    let waterways: LineGeoJSON | null = null;
    let roads: LineGeoJSON | null = null;
    let edges: EdgeRecord[] = [];
    let terrainBySid: Record<string, TerrainScalarRecord> = {};
    if (wwRes?.ok) {
        try { waterways = (await wwRes.json()) as LineGeoJSON; } catch { /* optional */ }
    }
    if (rdRes?.ok) {
        try { roads = (await rdRes.json()) as LineGeoJSON; } catch { /* optional */ }
    }
    if (edgeRes?.ok) {
        try {
            const payload = (await edgeRes.json()) as { edges?: EdgeRecord[] } | EdgeRecord[];
            edges = Array.isArray(payload) ? payload : (payload?.edges ?? []);
        } catch { /* optional */ }
    }
    if (terrainRes?.ok) {
        try {
            const terrain = (await terrainRes.json()) as TerrainScalarsPayload;
            terrainBySid = terrain.by_sid ?? {};
        } catch { /* optional */ }
    }

    const settlementsMap = new Map<string, SettlementFeature>();
    for (const f of settlements.features) {
        if (f.properties?.sid) settlementsMap.set(f.properties.sid, f as SettlementFeature);
    }
    const sharedBorders = computeSharedBorders(edges as { a: string, b: string }[], settlementsMap);

    smoothHeightmap(heightmap, 2, 2);
    return { heightmap, settlements, baseFeatures, waterways, roads, edges, sharedBorders, terrainBySid };
}

/**
 * Fetches and parses all static 3D map data, smooths heightmap, and stores in module cache.
 * init3DMap() uses this cache when available to avoid duplicate network work.
 * Safe to call fire-and-forget; rejects on critical failure (heightmap/settlements).
 */
export function preload3DData(): Promise<void> {
    const base = getDataBaseUrl();
    if (!base) return Promise.resolve();
    return fetchAndParse3DData(base).then(data => {
        preload3DDataCache = data;
        preloadCacheReadyResolve?.();
        preloadCacheReadyResolve = null;
    });
}

/** Start preload as soon as the map module loads (so 3D is faster when opened by default). */
if (typeof getDataBaseUrl === 'function' && getDataBaseUrl()) {
    preload3DData().catch(() => { });
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function init3DMap(container: HTMLElement): Promise<void> {
    // When embedded (e.g. tactical map), there is no #message; create overlay inside container so errors are visible
    if (!document.getElementById('message')) {
        embeddedMessageEl = document.createElement('div');
        embeddedMessageEl.id = 'operational-3d-message';
        embeddedMessageEl.setAttribute('aria-live', 'polite');
        Object.assign(embeddedMessageEl.style, {
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            padding: '1.5rem 2rem', background: 'rgba(0,0,0,0.9)', color: '#00e878',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px', whiteSpace: 'pre-wrap',
            border: '1px solid #00e878', borderRadius: '8px', maxWidth: '90%', display: 'none',
            zIndex: '10', pointerEvents: 'auto',
        });
        embeddedMessageEl.style.display = 'none';
        container.appendChild(embeddedMessageEl);
    } else {
        embeddedMessageEl = null;
    }

    const params = new URLSearchParams(window.location.search);
    const runId = params.get('run');

    showMessage('LOADING DATA...');

    let heightmap: HeightmapData;
    let settlements: SettlementsGeoJSON;
    let baseFeatures: { features: any[] } | undefined | null;
    let waterways: LineGeoJSON | null;
    let roads: LineGeoJSON | null;
    let edges: EdgeRecord[];
    let sharedBorders: SharedBorderSegment[];
    let terrainBySid: Record<string, TerrainScalarRecord>;

    const base = getDataBaseUrl();
    if (!base) {
        showMessage('LOAD ERROR\n\nCannot determine base URL.');
        return;
    }

    if (!preload3DDataCache) {
        await Promise.race([
            preloadCacheReadyPromise,
            new Promise<void>(r => setTimeout(r, 2500)),
        ]);
    }

    if (preload3DDataCache) {
        heightmap = preload3DDataCache.heightmap;
        settlements = preload3DDataCache.settlements;
        waterways = preload3DDataCache.waterways;
        roads = preload3DDataCache.roads;
        edges = preload3DDataCache.edges;
        sharedBorders = preload3DDataCache.sharedBorders;
        terrainBySid = preload3DDataCache.terrainBySid;
        showMessage('CACHE HIT');
    } else {
        try {
            const data = await fetchAndParse3DData(base);
            preload3DDataCache = data;
            heightmap = data.heightmap;
            settlements = data.settlements;
            baseFeatures = data.baseFeatures;
            waterways = data.waterways;
            roads = data.roads;
            edges = data.edges;
            sharedBorders = data.sharedBorders;
            terrainBySid = data.terrainBySid;
            console.log('[op-map] Heightmap smoothed (2 passes, radius 2)');
        } catch (e) {
            const msg = (e as Error).message;
            const hint = msg.includes('Settlements') || msg.includes('404')
                ? '\n\nCreate settlements: npm run map:derive:settlements:wgs84\n(or full pipeline: npm run map:build:wgs84)'
                : '\n\nServe data: npm run dev:map (from repo root)';
            showMessage(`LOAD ERROR\n\n${msg}${hint}`);
            return;
        }
    }

    console.log(`[op-map] Loaded: heightmap ${heightmap.width}x${heightmap.height}, ${settlements.features.length} settlements, ${waterways?.features.length ?? 0} waterways, ${roads?.features.length ?? 0} roads`);

    // City lights and UI overlays need `centroids`
    const centroids = calculateCentroids(settlements);

    // ── Build scene ──────────────────────────────────────
    const mapRenderer = new WarMapRenderer(container);
    mapRenderer.initTerrain(heightmap, waterways, roads, settlements, centroids, baseFeatures);

    // Wire up variables locally for UI / overlays
    const { scene, camera, renderer, controls } = mapRenderer;
    const terrainMesh = mapRenderer.getTerrainMesh()!;

    // Clamp anisotropy to GPU max (textures set anisotropy=16, but GPU may support less)
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    console.log(`[op-map] Max anisotropy: ${maxAniso}`);

    const centroidWorld = new Map<string, THREE.Vector3>();
    for (const [sid, c] of centroids.entries()) {
        const [lon, lat] = c;
        const elev = sampleHeight(heightmap, lon, lat);
        const [x, y, z] = wgsToWorld(lon, lat, elev);
        centroidWorld.set(sid, new THREE.Vector3(x, y + 0.01, z));
    }

    // ── Faction overlay ──────────────────────────────────
    const factionTexture = buildFactionTexture(heightmap, settlements, null, null, edges);
    factionTexture.anisotropy = maxAniso;
    const factionOverlay = buildFactionOverlayMesh(terrainMesh, factionTexture);
    scene.add(factionOverlay);

    // ── Municipality boundaries overlay ──────────────────
    let munOverlay: THREE.Mesh | null = null;
    if (baseFeatures) {
        const munTexture = buildMunBordersTexture(heightmap, baseFeatures);
        munTexture.anisotropy = maxAniso;
        munOverlay = buildFactionOverlayMesh(terrainMesh, munTexture);
        munOverlay.name = 'munOverlay';
        // Place slightly above faction overlay
        munOverlay.position.y = 0.008;
        munOverlay.visible = false; // off by default
        scene.add(munOverlay);
    }

    // Wire Control layers checkbox
    const layerControlEl = document.getElementById('layer-control') as HTMLInputElement | null;
    if (layerControlEl) {
        factionOverlay.visible = layerControlEl.checked;
        layerControlEl.addEventListener('change', () => {
            factionOverlay.visible = layerControlEl.checked;
        });
    }

    const layerMunBordersEl = document.getElementById('layer-mun-borders') as HTMLInputElement | null;
    if (layerMunBordersEl && munOverlay) {
        munOverlay.visible = layerMunBordersEl.checked;
        layerMunBordersEl.addEventListener('change', () => {
            if (munOverlay) munOverlay.visible = layerMunBordersEl.checked;
        });
    }

    // 3D layer support matrix:
    // - `layer-control`    => faction control overlay (implemented)
    // - `layer-mun-borders`=> municipality borders overlay (implemented)
    // - `layer-formations` => formation sprites (implemented below after load)
    // - `layer-frontlines` => Frontlines (implemented below after load)
    // - `layer-minimap` are 2D-only for now

    let frontLineGroup: THREE.Group | undefined;
    const layerFrontlinesEl = document.getElementById('layer-frontlines') as HTMLInputElement | null;
    if (layerFrontlinesEl) {
        layerFrontlinesEl.addEventListener('change', () => {
            if (frontLineGroup) {
                frontLineGroup.visible = layerFrontlinesEl.checked;
            }
        });
    }

    // ── City labels (dynamic LOD) ──────────────────────────
    const { group: cityLabels, entries: cityLabelEntries } = buildDynamicCityLabels(heightmap, centroids, settlements);
    let cityLabelsEnabled = true;
    scene.add(cityLabels);

    // ── HTML overlay ──────────────────────────────────────
    // (Removed sandbox HUD/Orders panel, now handled by tactical_map.html real GUI)

    const adjacency = buildAdjacency(edges);
    const bridge = getDesktopBridge();
    const mapApp = getMapAppBridge();
    const mapModeController = new MapModeController();
    const mapModeBadge = buildMapModeBadge(mapModeController.getMode());
    container.appendChild(mapModeBadge);
    const postFxManager = new PostProcessingManager();
    const audioManager = new AudioManager();
    const postFxAudioBadge = buildPostFxAudioBadge();
    container.appendChild(postFxAudioBadge);
    let commandHierarchyPanel: CommandHierarchyPanel | null = null;
    const attackOddsPreview = new AttackOddsPreview(container);
    let attackPreviewSerial = 0;
    let lastAttackPreviewKey = '';
    let supplyReportCache: { factions: Array<{ faction_id: string; isolated_controlled: string[] }> } | null = null;
    let corpsSectorsCache: Array<{ corps_id: string; faction: string; settlement_ids: string[] }> | null = null;
    let battleEventsCache: Array<{ turn: number; settlement_id: string; from: string | null; to: string | null; mechanism: string; mun_id: string | null }> = [];
    let lastBattleReplayTurn = -1;
    let formationCount = 0;
    let formationGroup: THREE.Group | null = null;
    let formationEntries: FormationEntry[] = [];
    let corpsAggregates = new Map<string, CorpsAggregate>();
    let selectedCorpsChildIds = new Set<string>();
    let selectedParentCorpsId: string | null = null;
    let counterDataMode: FormationCounterDataMode = FORMATION_COUNTER_DATA_MODES[0];
    const brigadeToCorps = new Map<string, string>();
    const selectionLinkGroup = new THREE.Group();
    selectionLinkGroup.name = 'formationSelectionLinks';
    scene.add(selectionLinkGroup);
    let selectedAoROverlay: THREE.Mesh | null = null;
    let currentSave: GameSave | null = null;
    let selectedFormationId: string | null = null;
    let currentReachable = new Set<string>();
    let pendingMovePath: string[] = [];
    let reachableRequestSerial = 0;
    const fogDebugCycle: Array<string | null> = [null, 'RBiH', 'RS', 'HRHB'];
    let fogDebugIdx = 0;
    const reachableGroup = new THREE.Group();
    reachableGroup.name = 'reachableOverlay';
    scene.add(reachableGroup);
    const orderArrowGroup = new THREE.Group();
    orderArrowGroup.name = 'orderArrowOverlay';
    scene.add(orderArrowGroup);
    const ghostCounterGroup = new THREE.Group();
    ghostCounterGroup.name = 'fogGhostCounters';
    scene.add(ghostCounterGroup);
    const supplyOverlayGroup = new THREE.Group();
    supplyOverlayGroup.name = 'supplyOverlay';
    scene.add(supplyOverlayGroup);
    const displacementOverlayGroup = new THREE.Group();
    displacementOverlayGroup.name = 'displacementOverlay';
    scene.add(displacementOverlayGroup);
    const corpsSectorOverlayGroup = new THREE.Group();
    corpsSectorOverlayGroup.name = 'corpsSectorOverlay';
    scene.add(corpsSectorOverlayGroup);
    const battleMarkerGroup = new THREE.Group();
    battleMarkerGroup.name = 'battleMarkerOverlay';
    scene.add(battleMarkerGroup);
    const battleMarkerLayer = new BattleMarkerLayer(battleMarkerGroup);
    const layerFormationsEl = document.getElementById('layer-formations') as HTMLInputElement | null;
    if (layerFormationsEl) {
        layerFormationsEl.addEventListener('change', () => {
            if (formationGroup) {
                formationGroup.visible = layerFormationsEl.checked;
            }
        });
    }
    mapModeController.onChange(() => {
        void refreshMapModeOverlays();
    });

    function clearReachableOverlay(): void {
        clearMovementRangePreview(reachableGroup);
    }

    function clearSelectionLinks(): void {
        while (selectionLinkGroup.children.length > 0) {
            const child = selectionLinkGroup.children[0];
            if (!child) break;
            selectionLinkGroup.remove(child);
            const line = child as THREE.Line;
            if ((line.geometry as THREE.BufferGeometry | undefined)?.dispose) {
                (line.geometry as THREE.BufferGeometry).dispose();
            }
            if ((line.material as THREE.Material | undefined)?.dispose) {
                (line.material as THREE.Material).dispose();
            }
        }
    }

    function getSelectedBrigadeIdsForAoR(save: GameSave, formationId: string): Set<string> {
        const selected = save.formations[formationId];
        if (selected?.kind === 'brigade') return new Set([formationId]);

        const selectedAgg = corpsAggregates.get(formationId);
        if (selectedAgg) return new Set(selectedAgg.childIds);

        return new Set<string>();
    }

    function updateSelectedAoROverlay(): void {
        if (!currentSave || !selectedFormationId) {
            if (selectedAoROverlay) selectedAoROverlay.visible = false;
            return;
        }

        const selectedBrigadeIds = getSelectedBrigadeIdsForAoR(currentSave, selectedFormationId);
        if (selectedBrigadeIds.size === 0) {
            if (selectedAoROverlay) selectedAoROverlay.visible = false;
            return;
        }

        const tex = buildSelectedAoRTexture(heightmap, settlements, currentSave, selectedBrigadeIds, edges);
        tex.anisotropy = maxAniso;
        if (!selectedAoROverlay) {
            selectedAoROverlay = buildFactionOverlayMesh(terrainMesh, tex);
            selectedAoROverlay.position.y = 0.010;
            selectedAoROverlay.name = 'selectedAorOverlay';
            scene.add(selectedAoROverlay);
        } else {
            const mat = selectedAoROverlay.material as THREE.MeshBasicMaterial;
            if (mat.map) mat.map.dispose();
            mat.map = tex;
            mat.needsUpdate = true;
        }
        selectedAoROverlay.visible = true;
    }

    function updateSelectionLinkOverlay(): void {
        clearSelectionLinks();
        if (!selectedFormationId) return;
        if (!formationGroup) return;

        const lineMat = new THREE.LineBasicMaterial({
            color: 0xffd36e,
            transparent: true,
            opacity: 0.9,
            depthTest: false,
        });

        if (corpsAggregates.has(selectedFormationId)) {
            const corpsEntry = formationEntries.find((e) => e.kind === 'corps' && e.formationId === selectedFormationId);
            const agg = corpsAggregates.get(selectedFormationId);
            if (!corpsEntry || !agg) {
                lineMat.dispose();
                return;
            }
            for (const childId of agg.childIds) {
                const brigadeEntry = formationEntries.find((e) => e.kind === 'brigade' && e.formationId === childId);
                if (!brigadeEntry) continue;
                const geometry = new THREE.BufferGeometry().setFromPoints([
                    corpsEntry.sprite.position.clone(),
                    brigadeEntry.sprite.position.clone(),
                ]);
                const line = new THREE.Line(geometry, lineMat.clone());
                selectionLinkGroup.add(line);
            }
            lineMat.dispose();
            return;
        }

        const selectedBrigade = currentSave?.formations[selectedFormationId];
        if (!selectedBrigade || selectedBrigade.kind !== 'brigade') {
            lineMat.dispose();
            return;
        }
        const corpsId = selectedBrigade.corps_id ?? brigadeToCorps.get(selectedBrigade.id) ?? null;
        if (!corpsId) {
            lineMat.dispose();
            return;
        }
        const corpsEntry = formationEntries.find((e) => e.kind === 'corps' && e.formationId === corpsId);
        const brigadeEntry = formationEntries.find((e) => e.kind === 'brigade' && e.formationId === selectedBrigade.id);
        if (!corpsEntry || !brigadeEntry) {
            lineMat.dispose();
            return;
        }
        const geometry = new THREE.BufferGeometry().setFromPoints([
            brigadeEntry.sprite.position.clone(),
            corpsEntry.sprite.position.clone(),
        ]);
        const line = new THREE.Line(geometry, lineMat.clone());
        selectionLinkGroup.add(line);
        lineMat.dispose();
    }

    function setSelectedFormation(
        formationId: string | null,
        options?: { syncMapApp?: boolean; announce?: boolean; forceRefresh?: boolean },
    ): void {
        const syncMapApp = options?.syncMapApp ?? true;
        const announce = options?.announce ?? false;
        const forceRefresh = options?.forceRefresh ?? false;
        const nextId = formationId && currentSave
            && (currentSave.formations[formationId] || corpsAggregates.has(formationId))
            ? formationId
            : null;
        if (!forceRefresh && selectedFormationId === nextId) return;
        selectedFormationId = nextId;
        selectedCorpsChildIds = new Set<string>();
        selectedParentCorpsId = null;
        pendingMovePath = [];
        clearOrderArrows(orderArrowGroup);
        attackOddsPreview.hide();
        lastAttackPreviewKey = '';

        if (currentSave && selectedFormationId) {
            const selected = currentSave.formations[selectedFormationId];
            if (selected?.kind === 'brigade') {
                selectedParentCorpsId = selected.corps_id ?? brigadeToCorps.get(selected.id) ?? null;
            } else if (corpsAggregates.has(selectedFormationId)) {
                const agg = corpsAggregates.get(selectedFormationId);
                if (agg) selectedCorpsChildIds = new Set<string>(agg.childIds);
            }
        }

        if (syncMapApp && typeof mapApp?.state?.setSelectedFormation === 'function') {
            mapApp.state.setSelectedFormation(selectedFormationId);
        }

        updateReachableOverlay();
        updateSelectedAoROverlay();
        updateSelectionLinkOverlay();

        if (announce && currentSave && selectedFormationId) {
            const selected = currentSave.formations[selectedFormationId];
            if (selected?.kind === 'brigade') {
                const parent = selected.corps_id ?? brigadeToCorps.get(selected.id);
                if (parent) {
                    const corpsName = currentSave.formations[parent]?.name ?? parent;
                    showFadingMessage(`BRIGADE: ${selected.name}\nCORPS LINK: ${corpsName}`, 1800);
                }
            } else if (corpsAggregates.has(selectedFormationId)) {
                const agg = corpsAggregates.get(selectedFormationId);
                if (agg) showFadingMessage(`CORPS: ${agg.formation.name}\nSUBORDINATE BRIGADES: ${agg.childIds.length}`, 1800);
            }
        }
    }

    function formatSelectionInfo(save: GameSave, formation: FormationRecord | null, reachableCount: number): string {
        if (!formation) return 'Select a brigade to show movement stance and reachable overlay.';
        if (formation.kind !== 'brigade') return `${formation.name} | CORPS COMMAND`;
        const stance = formation.movement_stance ?? (formation.movement_status === 'packing' ? 'column' : 'combat');
        const budget = stance === 'column' ? getColumnMovementBudget(formation) : 3;
        return `${formation.name} | ${stance.toUpperCase()} | ${budget} max\nReachable settlements: ${reachableCount}`;
    }

    async function updateReachableOverlay(): Promise<void> {
        const serial = ++reachableRequestSerial;
        clearReachableOverlay();
        if (!currentSave || !selectedFormationId) {
            currentReachable = new Set<string>();
            pendingMovePath = [];
            return;
        }
        const formation = currentSave.formations[selectedFormationId];
        if (!formation || formation.kind !== 'brigade') {
            currentReachable = new Set<string>();
            pendingMovePath = [];
            return;
        }
        let reachable = new Set<string>();
        let startSid = getFormationStartSid(currentSave, formation);
        if (bridge?.queryMovementRange) {
            const result = await bridge.queryMovementRange(formation.id);
            if (serial !== reachableRequestSerial) return;
            if (result.ok) {
                startSid = result.start_sid ?? startSid;
                const mode = (formation.movement_stance ?? (formation.movement_status === 'packing' ? 'column' : 'combat')) === 'column'
                    ? result.reachable_column
                    : result.reachable_deployed;
                reachable = new Set((mode ?? []).slice().sort((a, b) => a.localeCompare(b)));
            }
        }
        if (reachable.size === 0) {
            reachable = computeReachableSettlements(currentSave, formation, adjacency, terrainBySid);
        }
        currentReachable = reachable;
        rebuildMovementRangePreview({
            group: reachableGroup,
            reachableSids: [...reachable],
            startSid,
            sidToWorld: centroidWorld,
            color: formation.faction === 'RS' ? 0xff7777 : formation.faction === 'HRHB' ? 0x77aaff : 0x7dff99,
        });
    }

    function setHud(hasGameState: boolean, count: number): void {
        // Replaced by real game HUD
    }

    function refreshPostFxAudioStatus(): void {
        postFxAudioBadge.textContent = `P PRESET: ${postFxManager.getPreset().toUpperCase()} | O AUDIO: ${audioManager.isEnabled() ? 'ON' : 'OFF'}`;
    }

    function activeFogFactionOverride(): string | null {
        return fogDebugCycle[fogDebugIdx] ?? null;
    }

    function refreshFogLayer(): void {
        rebuildGhostCounterLayer(ghostCounterGroup, currentSave, centroidWorld, activeFogFactionOverride());
    }

    async function refreshMapModeOverlays(): Promise<void> {
        const mode = mapModeController.getMode();
        mapModeBadge.textContent = modeLabel(mode);

        supplyOverlayGroup.visible = mode === 'supply';
        displacementOverlayGroup.visible = mode === 'displacement';
        corpsSectorOverlayGroup.visible = mode === 'command';
        commandHierarchyPanel?.setVisible(mode === 'command');

        if (mode === 'supply') {
            if (!supplyReportCache && bridge?.querySupplyPaths) {
                const result = await bridge.querySupplyPaths();
                if (result.ok && result.report) supplyReportCache = result.report;
            }
            rebuildSupplyOverlay(
                supplyOverlayGroup,
                supplyReportCache,
                centroidWorld,
                activeFogFactionOverride() ?? (currentSave?.player_faction ?? null)
            );
        } else {
            clearSupplyOverlay(supplyOverlayGroup);
        }

        if (mode === 'displacement') {
            rebuildDisplacementOverlay(displacementOverlayGroup, currentSave?.settlement_displacement, centroidWorld);
        } else {
            clearDisplacementOverlay(displacementOverlayGroup);
        }

        if (mode === 'command') {
            if (!corpsSectorsCache && bridge?.queryCorpsSectors) {
                const result = await bridge.queryCorpsSectors();
                if (result.ok && result.sectors) corpsSectorsCache = result.sectors;
            }
            rebuildCorpsSectorOverlay(corpsSectorOverlayGroup, corpsSectorsCache, centroidWorld);
        } else {
            clearCorpsSectorOverlay(corpsSectorOverlayGroup);
        }
    }

    async function refreshBattleReplay(): Promise<void> {
        if (!currentSave) {
            battleEventsCache = [];
            battleMarkerLayer.clear();
            return;
        }
        if (bridge?.queryBattleEvents) {
            const result = await bridge.queryBattleEvents();
            if (result.ok && Array.isArray(result.events)) {
                battleEventsCache = [...result.events].sort((a, b) => {
                    if (a.turn !== b.turn) return a.turn - b.turn;
                    const mech = a.mechanism.localeCompare(b.mechanism);
                    if (mech !== 0) return mech;
                    return a.settlement_id.localeCompare(b.settlement_id);
                });
            }
        } else {
            battleEventsCache = [...(currentSave.control_events ?? [])];
        }
        const activeTurn = currentSave.turn ?? 0;
        const thisTurnEvents = battleEventsCache.filter((ev) => ev.turn === activeTurn);
        if (thisTurnEvents.length === 0) {
            battleMarkerLayer.clear();
            return;
        }
        if (lastBattleReplayTurn === activeTurn) return;
        lastBattleReplayTurn = activeTurn;
        battleMarkerLayer.play(thisTurnEvents, centroidWorld, 240);
    }

    function rebuildFormationLayer(save: GameSave): void {
        if (formationGroup) scene.remove(formationGroup);
        const lodLayer = buildFormationLODLayer(heightmap, save, centroids, corpsAggregates, counterDataMode);
        formationGroup = lodLayer.group;
        formationEntries = lodLayer.entries;
        formationCount = formationEntries.filter((e) => e.kind === 'brigade').length;
        if (layerFormationsEl) formationGroup.visible = layerFormationsEl.checked;
        scene.add(formationGroup);
    }

    function cycleFormationCounterMode(): void {
        counterDataMode = nextCounterDataMode(counterDataMode);
        if (!currentSave) {
            showFadingMessage(`COUNTER MODE: ${counterDataMode.toUpperCase()}`, 900);
            return;
        }
        rebuildFormationLayer(currentSave);
        setSelectedFormation(selectedFormationId, { syncMapApp: false, announce: false, forceRefresh: true });
        showFadingMessage(`COUNTER MODE: ${counterDataMode.toUpperCase()}`, 1200);
    }

    function applySave(save: GameSave, sourceLabel: string): void {
        currentSave = save;
        commandHierarchyPanel?.setSave(save);
        lastAttackPreviewKey = '';
        supplyReportCache = null;
        corpsSectorsCache = null;
        corpsAggregates = buildCorpsAggregates(save);
        brigadeToCorps.clear();
        for (const [corpsId, agg] of corpsAggregates.entries()) {
            for (const childId of agg.childIds) brigadeToCorps.set(childId, corpsId);
        }

        const controllers = new Map<string, FactionId>();
        for (const [sid, faction] of Object.entries(save.political_controllers ?? {})) {
            controllers.set(sid, faction);
        }

        const gsFactionTex = buildFactionTexture(
            heightmap,
            settlements,
            controllers,
            save.control_status_by_settlement_id ?? null,
            edges
        );
        gsFactionTex.anisotropy = maxAniso;
        const factionMat = factionOverlay.material as THREE.MeshBasicMaterial;
        if (factionMat.map) factionMat.map.dispose();
        factionMat.map = gsFactionTex;
        factionMat.needsUpdate = true;

        if (frontLineGroup) {
            scene.remove(frontLineGroup);
        }
        frontLineGroup = buildFrontLineMesh(heightmap, sharedBorders, controllers, save.brigade_aor, save.formations as Record<string, { faction: string }>);
        if (layerFrontlinesEl) {
            frontLineGroup.visible = layerFrontlinesEl.checked;
        }
        scene.add(frontLineGroup);

        rebuildFormationLayer(save);
        refreshFogLayer();
        void refreshMapModeOverlays();
        void refreshBattleReplay();

        if (selectedFormationId && !save.formations[selectedFormationId] && !corpsAggregates.has(selectedFormationId)) {
            selectedFormationId = null;
        }
        setSelectedFormation(selectedFormationId, { syncMapApp: false, announce: false, forceRefresh: true });
        showFadingMessage(`${sourceLabel}\nFORMATIONS: ${formationCount}`, 1800);
    }

    commandHierarchyPanel = new CommandHierarchyPanel(container, {
        onSelectFormation: (formationId: string) => {
            setSelectedFormation(formationId, { syncMapApp: true, announce: false, forceRefresh: true });
            mapApp?.openBrigadePanelForSelection?.();
        },
    });
    commandHierarchyPanel.setSave(currentSave);
    commandHierarchyPanel.setVisible(mapModeController.getMode() === 'command');

    setHud(false, 0);
    postFxManager.apply(renderer, container.clientWidth || 1024);
    refreshPostFxAudioStatus();
    void refreshMapModeOverlays();

    // ── Game state (run file or desktop bridge) ───────────
    if (runId) {
        showMessage(`LOADING RUN: ${runId}...`);
        try {
            const saveRes = await fetch(`${base}/runs/${runId}/final_save.json`);
            if (!saveRes.ok) throw new Error(`HTTP ${saveRes.status}`);
            const save = (await saveRes.json()) as GameSave;
            applySave(save, `RUN LOADED: ${runId}`);
        } catch (e) {
            console.warn('[op-map] Run load failed:', (e as Error).message);
            showFadingMessage('RUN LOAD FAILED — Baseline mode', 3000);
        }
    } else {
        if (bridge?.getCurrentGameState) {
            try {
                const stateJson = await bridge.getCurrentGameState();
                if (stateJson) {
                    const parsed = JSON.parse(stateJson) as unknown;
                    const save = toViewerSave(parsed);
                    if (save) applySave(save, 'DESKTOP STATE LOADED');
                }
            } catch (e) {
                console.warn('[op-map] Desktop state load failed:', (e as Error).message);
            }
            bridge.setGameStateUpdatedCallback?.((stateJson: string) => {
                try {
                    const parsed = JSON.parse(stateJson) as unknown;
                    const save = toViewerSave(parsed);
                    if (save) applySave(save, 'STATE UPDATED');
                } catch {
                    // Ignore malformed updates.
                }
            });
        } else {
            showFadingMessage('READY — Baseline: ethnic majority control', 2500);
        }
    }

    function syncSelectedFormationFromMapApp(): void {
        const externalSelected = mapApp?.state?.snapshot?.selectedFormationId;
        const normalized = typeof externalSelected === 'string' && externalSelected.length > 0
            ? externalSelected
            : null;
        if (normalized !== selectedFormationId) {
            setSelectedFormation(normalized, { syncMapApp: false, announce: false });
        }
    }

    // Click-select formation markers in 3D scene.
    function pickNearestSettlement(clientX: number, clientY: number): string | null {
        const rect = renderer.domElement.getBoundingClientRect();
        const maxDistPx = 16;
        let bestSid: string | null = null;
        let bestDist = Number.POSITIVE_INFINITY;
        for (const [sid, world] of centroidWorld.entries()) {
            const projected = world.clone().project(camera);
            if (projected.z < -1 || projected.z > 1) continue;
            const sx = (projected.x * 0.5 + 0.5) * rect.width + rect.left;
            const sy = (-projected.y * 0.5 + 0.5) * rect.height + rect.top;
            const dx = sx - clientX;
            const dy = sy - clientY;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < bestDist) {
                bestDist = d;
                bestSid = sid;
            }
        }
        return bestDist <= maxDistPx ? bestSid : null;
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    renderer.domElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    renderer.domElement.addEventListener('pointerdown', async (e) => {
        if (!formationGroup) return;
        syncSelectedFormationFromMapApp();

        const pickedSid = pickNearestSettlement(e.clientX, e.clientY);
        if (e.button === 2) {
            const selectedFormation = selectedFormationId && currentSave ? currentSave.formations[selectedFormationId] : null;
            const intent = resolveRightClickIntent({
                selectedFormationId,
                selectedFormationKind: selectedFormation?.kind ?? null,
                targetSid: pickedSid,
                reachableSids: currentReachable,
            });
            if (intent.kind !== 'stage_move' || !selectedFormationId || !currentSave || !selectedFormation) return;

            let path = [intent.targetSid];
            let etaTurns: number | null = null;
            if (bridge?.queryMovementPath) {
                const result = await bridge.queryMovementPath(selectedFormationId, intent.targetSid);
                if (result.ok && Array.isArray(result.path) && result.path.length > 0) {
                    path = result.path;
                    etaTurns = typeof result.eta_turns === 'number' ? result.eta_turns : null;
                }
            }
            pendingMovePath = path;
            drawMovementOrderArrow(orderArrowGroup, path, centroidWorld);
            if (bridge?.stageBrigadeMovementOrder) {
                const stage = await bridge.stageBrigadeMovementOrder(selectedFormationId, [intent.targetSid]);
                if (!stage.ok) {
                    showFadingMessage(stage.error ? `MOVE ORDER FAILED\n${stage.error}` : 'MOVE ORDER FAILED', 1800);
                    return;
                }
            }
            const etaText = etaTurns != null ? `\nETA: ${etaTurns} turn(s)` : '';
            showFadingMessage(`MOVE ORDER STAGED\n${selectedFormation.name} -> ${intent.targetSid}${etaText}`, 1400);
            void audioManager.uiClick();
            return;
        }
        if (e.button !== 0) return;

        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(formationGroup.children, true);
        for (const hit of hits) {
            let node: THREE.Object3D | null = hit.object;
            while (node) {
                if (typeof node.name === 'string') {
                    const name = node.name;
                    const formationId = name.startsWith('brigade_')
                        ? name.slice('brigade_'.length)
                        : name.startsWith('corps_')
                            ? name.slice('corps_'.length)
                            : name.startsWith('formation_')
                                ? name.slice('formation_'.length)
                                : null;
                    if (formationId) {
                        setSelectedFormation(formationId, { syncMapApp: true, announce: true });
                        mapApp?.openBrigadePanelForSelection?.();
                        return;
                    }
                }
                node = node.parent;
            }
        }

        if (pickedSid) {
            setSelectedFormation(null, { syncMapApp: true, announce: false });
            mapApp?.state?.setSelectedSettlement?.(pickedSid);
            mapApp?.openSettlementPanelForSelection?.(pickedSid);
            return;
        }
    });
    renderer.domElement.addEventListener('pointermove', async (e) => {
        if (!bridge?.queryCombatEstimate || !currentSave || !selectedFormationId) {
            attackOddsPreview.hide();
            return;
        }
        const selected = currentSave.formations[selectedFormationId];
        if (!selected || selected.kind !== 'brigade') {
            attackOddsPreview.hide();
            return;
        }
        const targetSid = pickNearestSettlement(e.clientX, e.clientY);
        if (!targetSid) {
            attackOddsPreview.hide();
            return;
        }
        const controller = currentSave.political_controllers?.[targetSid] ?? null;
        if (controller === selected.faction) {
            attackOddsPreview.hide();
            return;
        }
        const key = `${selectedFormationId}:${targetSid}`;
        if (key === lastAttackPreviewKey) {
            attackOddsPreview.setPosition(e.clientX, e.clientY);
            return;
        }
        const serial = ++attackPreviewSerial;
        const estimate = await bridge.queryCombatEstimate(selectedFormationId, targetSid);
        if (serial !== attackPreviewSerial) return;
        if (!estimate.ok) {
            attackOddsPreview.hide();
            return;
        }
        lastAttackPreviewKey = key;
        attackOddsPreview.show(
            targetSid,
            {
                expected_loss_fraction: estimate.expected_loss_fraction ?? 0,
                win_probability: estimate.win_probability ?? 0,
                power_ratio: estimate.power_ratio ?? 0,
            },
            e.clientX,
            e.clientY
        );
    });
    renderer.domElement.addEventListener('pointerleave', () => {
        attackOddsPreview.hide();
    });

    // Keep 3D selection in sync with the tactical map panel/2D interactions.
    if (typeof mapApp?.state?.setSelectedFormation === 'function') {
        syncSelectedFormationFromMapApp();
    }

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
        if (k === 'd' && !e.altKey && !e.ctrlKey && !e.metaKey) {
            if (!e.repeat) cycleFormationCounterMode();
            e.preventDefault();
            return;
        }
        if (k === 'g' && !e.altKey && !e.ctrlKey && !e.metaKey) {
            if (!e.repeat) {
                fogDebugIdx = (fogDebugIdx + 1) % fogDebugCycle.length;
                refreshFogLayer();
                void refreshMapModeOverlays();
                const f = activeFogFactionOverride() ?? 'PLAYER_FACTION';
                showFadingMessage(`FOG DEBUG: ${f}`, 1000);
            }
            e.preventDefault();
            return;
        }
        const mapMode = modeFromFunctionKey(e.key);
        if (mapMode) {
            mapModeController.setMode(mapMode);
            showFadingMessage(`MAP MODE: ${modeLabel(mapMode)}`, 900);
            void audioManager.uiClick();
            e.preventDefault();
            return;
        }
        if (k === 'p' && !e.altKey && !e.ctrlKey && !e.metaKey) {
            const preset = postFxManager.cyclePreset();
            postFxManager.apply(renderer, container.clientWidth || 1024);
            refreshPostFxAudioStatus();
            showFadingMessage(`POSTFX PRESET: ${preset.toUpperCase()}`, 900);
            void audioManager.uiClick();
            e.preventDefault();
            return;
        }
        if (k === 'o' && !e.altKey && !e.ctrlKey && !e.metaKey) {
            void audioManager.setEnabled(!audioManager.isEnabled()).then(() => {
                refreshPostFxAudioStatus();
            });
            showFadingMessage(`AUDIO: ${audioManager.isEnabled() ? 'OFF' : 'ON'}`, 900);
            e.preventDefault();
            return;
        }
        if (k === 'k' && !e.altKey && !e.ctrlKey && !e.metaKey) {
            battleMarkerLayer.skip();
            showFadingMessage('BATTLE REPLAY SKIPPED', 800);
            e.preventDefault();
            return;
        }
        keysDown.add(k);
        // Immediate nudge for single-press responsiveness
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
        const w = container.clientWidth || 1024;
        const h = container.clientHeight || 768;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        postFxManager.apply(renderer, w);
    });

    hideMessage();

    (function animate() {
        requestAnimationFrame(animate);
        syncSelectedFormationFromMapApp();
        applyKeyboardPan();
        updateFormationVisibility(formationEntries, camera, selectedFormationId, selectedCorpsChildIds, selectedParentCorpsId);
        applyFogOfWarToEntries(formationEntries, currentSave, activeFogFactionOverride());
        updateSelectionLinkOverlay();
        updateCityLabelVisibility(cityLabelEntries, camera, controls, cityLabelsEnabled);
        controls.update();
        renderer.render(scene, camera);
    })();
}

// ---------------------------------------------------------------------------
// Standalone page bootstrap: when opened as map_operational_3d.html, auto-init
// ---------------------------------------------------------------------------
if (typeof document !== 'undefined' && (window.location.pathname || '').includes('map_operational_3d')) {
    function runStandalone() {
        const container = document.getElementById('operational-3d-container');
        if (container) {
            init3DMap(container).catch((e) => {
                showMessage(`LOAD ERROR\n\n${(e as Error).message}`);
            });
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runStandalone);
    } else {
        runStandalone();
    }
}
