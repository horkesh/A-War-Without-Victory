/**
 * HoI-style 2.5D WebGL renderer: orthographic tilted view, terrain, political control.
 * ADDENDUM_25D_AND_MOSTAR_SPLIT Part B; HOI_VISUAL_GUI_OVERHAUL_SPEC §2.
 *
 * Control layer uses a single merged mesh with per-vertex colors and a global
 * vertex table so that shared boundary vertices between adjacent settlements are
 * identical in 3D, eliminating gaps and overlaps.
 */

import * as THREE from 'three';
import { Earcut } from 'three/src/extras/Earcut.js';
import { wgsToWorld, buildTerrainMesh } from '../terrain/TerrainMeshBuilder.js';
import { smoothHeightmap } from '../terrain/heightmapSmooth.js';
import { buildHoITerrainTexture } from '../terrain/HoITerrainTexture.js';

const HEIGHTMAP_URL = '/data/derived/terrain/heightmap_3d_viewer.json';
const OPERATIONAL_SETTLEMENTS_URL = '/data/derived/operational/operational_settlements.geojson';
const OPERATIONAL_CONTACT_GRAPH_URL = '/data/derived/operational/operational_contact_graph.json';
const WATERWAYS_URL = '/data/derived/terrain/osm_waterways_snapshot_h6_2.geojson';
const ROADS_URL = '/data/derived/terrain/major_roads_wgs84.geojson';

const DEFAULT_TILT_DEG = 20;
const DEFAULT_ZOOM = 2.8;
const MIN_ZOOM = 0.4;   // closest zoom (most detail)
const MAX_ZOOM = 3.2;   // furthest zoom — shows whole map, no further
const MIN_TILT_DEG = 10; // nearly top-down
const MAX_TILT_DEG = 50; // steep oblique — shows 3D relief prominently
const MIN_YAW_DEG = -30; // orbit left (inspect from west)
const MAX_YAW_DEG = 30;  // orbit right (inspect from east)
/** Zoom below this uses higher-res label texture (Phase 4 LOD). Architect: 1.4× default. */
const LABEL_LOD_ZOOM_THRESHOLD = DEFAULT_ZOOM / 1.4;
/** When zoom >= this (max zoom out), only corps/army_hq markers are visible (strategic view). */
const ZOOM_CORPS_ONLY_THRESHOLD = 2.6;

export interface HeightmapData {
  bbox: [number, number, number, number];
  width: number;
  height: number;
  elevations: number[];
}

type Ring = [number, number][];
interface GeoJSONFeature {
  type: 'Feature';
  geometry?: { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] };
  properties?: { osid?: string; sid?: string; [k: string]: unknown };
}
interface GeoJSONFC {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}
interface LineGeoJSON {
  type: string;
  features: { type: string; geometry: { type: string; coordinates: unknown }; properties: Record<string, unknown> }[];
}

/** Contact graph edge (from operational_contact_graph.json). */
interface ContactEdge { a: string; b: string; type?: string; }
/** Shared border between two settlements: one or more contiguous runs of [lon, lat] vertices along the boundary. */
interface SharedBorder { a: string; b: string; runs: [number, number][][]; }

/** Epsilon for treating coordinates as the same (WGS84 degrees). */
const BORDER_KEY_SCALE = 1e6;
function borderVertexKey(lon: number, lat: number): string {
  return `${Math.round(lon * BORDER_KEY_SCALE) / BORDER_KEY_SCALE},${Math.round(lat * BORDER_KEY_SCALE) / BORDER_KEY_SCALE}`;
}

function sampleHeight(hm: HeightmapData, lon: number, lat: number): number {
  const [minLon, minLat, maxLon, maxLat] = hm.bbox;
  const { width, height, elevations } = hm;
  const si = ((lon - minLon) / (maxLon - minLon || 1)) * (width - 1);
  const sj = ((maxLat - lat) / (maxLat - minLat || 1)) * (height - 1);
  const i0 = Math.floor(si);
  const j0 = Math.floor(sj);
  const i1 = Math.min(i0 + 1, width - 1);
  const j1 = Math.min(j0 + 1, height - 1);
  const fx = si - i0;
  const fy = sj - j0;
  const v00 = elevations[j0 * width + i0] ?? 0;
  const v10 = elevations[j0 * width + i1] ?? 0;
  const v01 = elevations[j1 * width + i0] ?? 0;
  const v11 = elevations[j1 * width + i1] ?? 0;
  return (1 - fx) * (1 - fy) * v00 + fx * (1 - fy) * v10 + (1 - fx) * fy * v01 + fx * fy * v11;
}

/** Faction fill colors at 75% opacity (HOI spec §9.1). */
const FACTION_COLORS: Record<string, number> = {
  RS: 0xb23c3c,
  RBiH: 0x419150,
  HRHB: 0x3773af,
};
const NULL_COLOR = 0xacbe91; // muted sage-green matching terrain lowland base — blends at 75% opacity

/** Get outer rings only (for borders, centroids, selection highlight). */
function getRings(f: GeoJSONFeature): Ring[] {
  const g = f.geometry;
  if (!g) return [];
  if (g.type === 'Polygon') return g.coordinates.length ? [g.coordinates[0]!] : [];
  if (g.type === 'MultiPolygon') {
    const out: Ring[] = [];
    for (const poly of g.coordinates) if (poly?.[0]) out.push(poly[0]);
    return out;
  }
  return [];
}

/** Get all polygon coordinate sets (outer + holes) for proper triangulation. */
function getPolygonCoordSets(f: GeoJSONFeature): Ring[][] {
  const g = f.geometry;
  if (!g) return [];
  if (g.type === 'Polygon') return g.coordinates.length ? [g.coordinates as Ring[]] : [];
  if (g.type === 'MultiPolygon') {
    // Each element is [outerRing, ...holeRings]
    return (g.coordinates as Ring[][]).filter(poly => poly?.[0]?.length);
  }
  return [];
}

/** Strip closing point if ring is closed (last ~= first). Earcut expects OPEN rings. */
function openRing(ring: Ring): Ring {
  if (ring.length < 2) return ring;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (Math.abs(first[0] - last[0]) < 1e-9 && Math.abs(first[1] - last[1]) < 1e-9) {
    return ring.slice(0, -1);
  }
  return ring;
}

function strictCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Which layers are visible on the map — used by the map mode toolbar. */
export interface HoILayerVisibility {
  terrain: boolean;
  control: boolean;
  frontLines: boolean;
  formations: boolean;
  labels: boolean;
  /** Enemy Zone of Control overlay (per-faction OSIDs from phase_ii_enemy_zoc_by_faction). */
  zoc: boolean;
}

export type HoILayerName = keyof HoILayerVisibility;

export interface HoIMapRendererOptions {
  container: HTMLElement;
  controlBySettlement?: Record<string, string | null>;
  getBaseUrl?: () => string;
}

/** Front edge: settlement ids a, b (order stable for keying). */
export interface FrontEdgeInput {
  edge_id?: string;
  a: string;
  b: string;
  /** Faction controlling settlement a. */
  side_a?: string | null;
  /** Faction controlling settlement b. */
  side_b?: string | null;
}

/** Assignable front segment: list of edge_ids (e.g. "a__b") for ribbon chain. */
export interface AssignableFrontSegmentInput {
  front_id: string;
  edge_ids: string[];
}

/** Order arrow: from position to target position, faction for color. */
export interface OrderArrowInput {
  from: [number, number, number];
  to: [number, number, number];
  faction?: string;
  isAttack?: boolean;
}

/** Formation marker for billboard sprite (position in world coords). */
export interface FormationMarkerInput {
  id: string;
  position: [number, number, number];
  name: string;
  faction: string;
  posture?: string;
  isCorps?: boolean;
  /** When true, marker is visible at max zoom out (strategic view); corps/army_hq only. */
  showWhenZoomedOut?: boolean;
}

/** Label LOD: position and text; major = show at higher altitude. */
export interface LabelInput {
  position: [number, number, number];
  text: string;
  major?: boolean;
}

/** Strategic point: position and size (small/medium/large). */
export interface StrategicPointInput {
  position: [number, number, number];
  size: 'small' | 'medium' | 'large';
}

/** Enclave ring: closed loop of world positions, faction color. */
export interface EnclaveRingInput {
  positions: [number, number, number][];
  faction: string;
  label?: string;
}

/**
 * Global vertex table used by the control layer.
 * Keyed by `lon.toFixed(7),lat.toFixed(7)` so that shared boundary vertices
 * across adjacent polygons map to the exact same index and 3D position.
 */
interface GlobalVertexTable {
  /** lon/lat pairs (parallel to positions array) */
  lonLat: [number, number][];
  /** Deduplicated vertex positions as flat [x,y,z, x,y,z, …] */
  positions: number[];
  /** key → index into lonLat/positions */
  map: Map<string, number>;
}

export class HoIMapRenderer {
  private container: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private controlMesh: THREE.Mesh | null = null;
  private controlMeshes: THREE.Mesh[] = [];
  private factionOverlayMesh: THREE.Mesh | null = null;
  private frontRibbonMeshes: THREE.Mesh[] = [];
  private orderArrowLines: THREE.Line[] = [];
  private formationSprites: THREE.Sprite[] = [];
  private formationSpriteData: { scaleBase: number; isCorps: boolean; showWhenZoomedOut: boolean }[] = [];
  private showWhenZoomedOutByFormationId = new Map<string, boolean>();
  /** Invisible hit proxies for formation raycast (one small plane per formation). */
  private formationHitProxies = new THREE.Group();
  private formationProxyMeshes: THREE.Mesh[] = [];
  private formationIdByProxy: Map<THREE.Mesh, string> = new Map();
  private labelSprites: THREE.Sprite[] = [];
  private labelData: { major: boolean }[] = [];
  private strategicMarkers: THREE.Points[] = [];
  private enclaveRings: THREE.LineSegments[] = [];
  private settlementLabelSprites: THREE.Sprite[] = [];
  private settlementLabelMeta: { pop: number; scaleBase: number; aspect: number }[] = [];
  /** ZoC overlay: one mesh per faction (OSIDs under enemy ZoC); built from enemyZocByFaction. */
  private zocMeshes: THREE.Mesh[] = [];
  private enemyZocByFaction: Record<string, string[]> = {};
  /** Selection ZoC: single mesh for selected formation's ZoC OSIDs; visible independently of F6. */
  private selectionZocMesh: THREE.Mesh | null = null;
  /** Corps–brigade lines when a corps is selected (one line per subordinate). */
  private corpsBrigadeLineSegments: THREE.LineSegments | null = null;
  /** Assignable front segments (HoI-style fronts): ribbons along segment edge chains. */
  private assignableSegmentMeshes: THREE.Mesh[] = [];
  private terrainMesh: THREE.Mesh | null = null;
  private heightmap: HeightmapData | null = null;
  private waterways: LineGeoJSON | null = null;
  private roads: LineGeoJSON | null = null;
  private operationalGeo: GeoJSONFC | null = null;
  /** Shared border geometry by normalized edge id ("a__b" where a < b). */
  private sharedBorderByEdge: Map<string, SharedBorder> = new Map();
  /** Canonical SID → operational SID mapping (for front edges that use S-prefix IDs). */
  private sidToOsid: Record<string, string> = {};
  private centroidBySid: Record<string, [number, number]> = {};
  private controlBySettlement: Record<string, string | null> = {};
  private playerFaction: string | null = null;
  private getBaseUrl: () => string;
  private pan = { x: 0, z: 0 };
  private zoom = DEFAULT_ZOOM;
  private tilt = DEFAULT_TILT_DEG;
  private yaw = 0; // orbit horizontal (degrees), ±30°
  private isPanning = false;
  private isTilting = false;
  private isYawing = false;
  private lastPointer = { x: 0, y: 0 };
  private rafId = 0;
  private lastContainerWidth = 0;
  private lastContainerHeight = 0;
  /** Assignable front segment ribbon color (gold) to distinguish from generic front lines. */
  private readonly ASSIGNABLE_SEGMENT_COLOR = 0xe8b923;
  private readonly REFERENCE_ALTITUDE = 2.5;
  private readonly FORMATION_SPRITE_BASE = 0.15;
  private readonly LABEL_ALTITUDE_MAX = 4;
  private readonly LABEL_MAJOR_ALTITUDE_MAX = 6;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  /**
   * Maps triangle face index in the single control mesh → feature.
   * Built during buildControlLayer().
   */
  private featureByTriIndex: GeoJSONFeature[] = [];
  /** Control mesh triangle indices (flat array, 3 per face). Stored for selection border extraction. */
  private controlIndices: number[] = [];
  /** Control mesh vertex positions (flat [x,y,z,...] array). Stored for selection border extraction. */
  private controlPositions: number[] = [];
  private onHoverSettlement: ((feature: GeoJSONFeature | null, screenX: number, screenY: number) => void) | null = null;
  private selectedFeature: GeoJSONFeature | null = null;
  private selectionBorder: THREE.LineSegments | null = null;
  private onClickSettlement: ((feature: GeoJSONFeature | null) => void) | null = null;
  private onClickFormation: ((formationId: string | null) => void) | null = null;
  /** Cached for label LOD rebuild when zoom crosses threshold. */
  private _lastLabelInput: LabelInput[] = [];
  private _labelLodHighRes = false;

  /** Layer visibility state — toggled by the map mode toolbar. */
  private layerVisibility: HoILayerVisibility = {
    terrain: true,
    control: true,
    frontLines: true,
    formations: true,
    labels: true,
    zoc: false,
  };

  constructor(options: HoIMapRendererOptions) {
    this.container = options.container;
    this.controlBySettlement = options.controlBySettlement ?? {};
    this.getBaseUrl = options.getBaseUrl ?? (() => (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : ''));
  }

  async init(): Promise<boolean> {
    const gl = this.container.ownerDocument.defaultView?.document.createElement('canvas')?.getContext('webgl2') ?? this.container.ownerDocument.defaultView?.document.createElement('canvas')?.getContext('webgl');
    if (!gl) return false;

    try {
      const heightmapRes = await fetch(`${this.getBaseUrl()}${HEIGHTMAP_URL}`);
      if (!heightmapRes.ok) throw new Error(`Heightmap HTTP ${heightmapRes.status}`);
      this.heightmap = (await heightmapRes.json()) as HeightmapData;
      if (!this.heightmap.bbox || !this.heightmap.elevations?.length) throw new Error('Invalid heightmap');
      smoothHeightmap(this.heightmap, 2, 2);
    } catch (e) {
      console.warn('HoIMapRenderer: heightmap load failed', e);
      return false;
    }

    // Fetch operational settlements, contact graph, waterways, and roads in parallel (all optional)
    const base = this.getBaseUrl();
    const [opRes, cgRes, wwRes, rdRes] = await Promise.all([
      fetch(`${base}${OPERATIONAL_SETTLEMENTS_URL}`).catch(() => null),
      fetch(`${base}${OPERATIONAL_CONTACT_GRAPH_URL}`).catch(() => null),
      fetch(`${base}${WATERWAYS_URL}`).catch(() => null),
      fetch(`${base}${ROADS_URL}`).catch(() => null),
    ]);

    let operational: GeoJSONFC = { type: 'FeatureCollection', features: [] };
    try {
      if (opRes?.ok) operational = (await opRes.json()) as GeoJSONFC;
    } catch { /* optional */ }
    this.operationalGeo = operational;
    this.computeCentroids();

    // Parse contact graph edges and compute shared borders for front line rendering
    try {
      if (cgRes?.ok) {
        const cg = (await cgRes.json()) as { edges?: ContactEdge[] };
        if (cg.edges) this.computeSharedBorders(cg.edges);
      }
    } catch { /* optional — front lines fall back to centroid ribbons */ }

    try {
      if (wwRes?.ok) this.waterways = (await wwRes.json()) as LineGeoJSON;
    } catch { /* optional — terrain renders without rivers */ }

    try {
      if (rdRes?.ok) this.roads = (await rdRes.json()) as LineGeoJSON;
    } catch { /* optional — terrain renders without roads */ }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x252220);

    const rect0 = this.container.getBoundingClientRect();
    const w0 = Math.max(1, rect0.width);
    const h0 = Math.max(1, rect0.height);
    const aspect = w0 / h0;
    const frustum = this.zoom;
    this.camera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect, frustum, -frustum, 0.01, 100
    );
    const tiltRad = (this.tilt * Math.PI) / 180;
    const yawRad = (this.yaw * Math.PI) / 180;
    const camDist = 10;
    const x = camDist * Math.sin(tiltRad) * Math.sin(yawRad);
    const z = camDist * Math.sin(tiltRad) * Math.cos(yawRad);
    const y = camDist * Math.cos(tiltRad);
    this.camera.position.set(this.pan.x + x, y, this.pan.z + z);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.pan.x, 0, this.pan.z);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setClearColor(0x252220, 1);
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'auto';
    const pixelRatio = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2);
    this.renderer.setPixelRatio(pixelRatio);
    const r0 = this.container.getBoundingClientRect();
    this.renderer.setSize(Math.max(1, Math.floor(r0.width)), Math.max(1, Math.floor(r0.height)));
    this.container.appendChild(canvas);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xeee8dc, 0.6);
    dir.position.set(1, 2, 1);
    this.scene.add(dir);

    this.buildTerrain();
    this.buildControlLayer();
    this.buildSettlementLabels();
    this.setupControls();
    this.animate();
    // Resize on next frame so we get correct dimensions after layout (avoids blank 0×0 canvas)
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.resize());
    }
    return true;
  }

  private buildTerrain(): void {
    if (!this.heightmap) return;

    // Build terrain texture (hillshade + rivers + roads + settlement markers)
    const { texture } = buildHoITerrainTexture(
      this.heightmap, this.waterways, this.roads,
      this.operationalGeo as Parameters<typeof buildHoITerrainTexture>[3],
    );

    // Build UV-mapped terrain mesh using the shared TerrainMeshBuilder
    const mesh = buildTerrainMesh(this.heightmap, texture);

    // Prevent z-fighting with the control layer above
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = 1;
    mat.polygonOffsetUnits = 1;

    mesh.renderOrder = 0;
    this.terrainMesh = mesh;
    this.scene.add(mesh);
  }

  /**
   * Subdivide a triangle into smaller triangles so interior vertices can
   * sample the heightmap, draping the polygon onto terrain.
   * Returns arrays of lon/lat pairs and triangle index triples.
   * `n` = number of subdivisions along each edge (2 → 4 sub-triangles).
   */
  private static subdivideTriangle(
    lonLatVerts: [number, number][],
    i0: number, i1: number, i2: number,
    n: number
  ): { pts: [number, number][]; tris: [number, number, number][] } {
    const p0 = lonLatVerts[i0]!;
    const p1 = lonLatVerts[i1]!;
    const p2 = lonLatVerts[i2]!;
    // Generate barycentric grid points
    const pts: [number, number][] = [];
    const indexMap: number[][] = [];
    for (let j = 0; j <= n; j++) {
      const row: number[] = [];
      for (let i = 0; i <= n - j; i++) {
        const u = i / n;
        const v = j / n;
        const w = 1 - u - v;
        const lon = w * p0[0] + u * p1[0] + v * p2[0];
        const lat = w * p0[1] + u * p1[1] + v * p2[1];
        row.push(pts.length);
        pts.push([lon, lat]);
      }
      indexMap.push(row);
    }
    const tris: [number, number, number][] = [];
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n - j; i++) {
        const a = indexMap[j]![i]!;
        const b = indexMap[j]![i + 1]!;
        const c = indexMap[j + 1]![i]!;
        tris.push([a, b, c]);
        if (i + 1 < n - j) {
          const d = indexMap[j + 1]![i + 1]!;
          tris.push([b, d, c]);
        }
      }
    }
    return { pts, tris };
  }

  /**
   * Build a single merged mesh for the entire control layer.
   * All features feed into one BufferGeometry with per-vertex colors.
   * Shared boundary vertices use the same global index → no gaps.
   *
   * Also builds featureByTriIndex for raycast hit-testing.
   */
  private buildControlLayer(): void {
    if (!this.heightmap || !this.operationalGeo?.features?.length) return;
    const hm = this.heightmap;

    for (const mesh of this.controlMeshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.controlMeshes = [];
    this.controlMesh = null;
    this.featureByTriIndex = [];

    const CONTROL_Y_OFFSET = 0.001;
    const SUBDIV = 3; // subdivide each triangle into 9 sub-triangles

    // Global vertex table shared across all features
    const vtx: GlobalVertexTable = {
      lonLat: [],
      positions: [],
      map: new Map(),
    };

    // Global triangle index list
    const globalIndices: number[] = [];

    // Track which feature each triangle belongs to (for raycasting)
    // We'll push one entry per triangle (3 indices = 1 face)
    const triFeatures: GeoJSONFeature[] = [];

    // All features at the same tiny Y so they stay flush with terrain when tilted.
    // Overlap resolved by reverse iteration + depthFunc:Less (first drawn wins at equal depth).
    const featureCount = this.operationalGeo.features.length;

    for (let fi = featureCount - 1; fi >= 0; fi--) {
      const feature = this.operationalGeo.features[fi]!;
      const polyCoordSets = getPolygonCoordSets(feature);
      const controller = this.getMajorityController(feature);
      const colorHex = controller ? (FACTION_COLORS[controller] ?? NULL_COLOR) : NULL_COLOR;

      const colorTag = colorHex.toString(16);
      const featureAddPt = (lon: number, lat: number): number => {
        const key = `${lon.toFixed(7)},${lat.toFixed(7)}:${colorTag}:${fi}`;
        const existing = vtx.map.get(key);
        if (existing !== undefined) return existing;
        const idx = vtx.lonLat.length;
        vtx.lonLat.push([lon, lat]);
        const elev = sampleHeight(hm, lon, lat);
        const [wx, wy, wz] = wgsToWorld(lon, lat, elev);
        vtx.positions.push(wx, wy + CONTROL_Y_OFFSET, wz);
        vtx.map.set(key, idx);
        return idx;
      };

      for (const coordSet of polyCoordSets) {
        // coordSet = [outerRing, ...holeRings]
        const outerRing = coordSet[0];
        if (!outerRing || outerRing.length < 3) continue;

        // Build combined lonLat array: outer ring + hole rings (contiguous for Earcut)
        const lonLat: [number, number][] = [];
        const holeIndices: number[] = [];

        // Add outer ring vertices (opened)
        const openOuter = openRing(outerRing);
        if (openOuter.length < 3) continue;
        for (const [lon, lat] of openOuter) {
          lonLat.push([lon, lat]);
        }

        // Add hole ring vertices (if any, also opened)
        for (let hi = 1; hi < coordSet.length; hi++) {
          const holeRing = coordSet[hi];
          if (!holeRing || holeRing.length < 3) continue;
          const oh = openRing(holeRing);
          if (oh.length < 3) continue;
          holeIndices.push(lonLat.length);
          for (const [lon, lat] of oh) {
            lonLat.push([lon, lat]);
          }
        }

        // Build flat array in world coords for Earcut
        const flat: number[] = [];
        for (const [lon, lat] of lonLat) {
          const [x, , z] = wgsToWorld(lon, lat, 0);
          flat.push(x, z);
        }

        // Triangulate with Earcut
        let baseTris: number[];
        try {
          baseTris = Earcut.triangulate(
            flat,
            holeIndices.length > 0 ? holeIndices : undefined,
            2
          );
        } catch {
          continue;
        }
        if (baseTris.length === 0) continue;

        // Convert flat earcut indices to triplets for subdivision
        const triTriplets: [number, number, number][] = [];
        for (let ti = 0; ti < baseTris.length; ti += 3) {
          triTriplets.push([baseTris[ti]!, baseTris[ti + 1]!, baseTris[ti + 2]!]);
        }

        // Subdivide and add to global vertex table
        for (const [i0, i1, i2] of triTriplets) {
          const { pts, tris } = HoIMapRenderer.subdivideTriangle(lonLat, i0, i1, i2, SUBDIV);
          const remap: number[] = [];
          for (const pt of pts) remap.push(featureAddPt(pt[0], pt[1]));
          for (const [a, b2, c] of tris) {
            globalIndices.push(remap[a]!, remap[b2]!, remap[c]!);
            triFeatures.push(feature);
          }
        }
      }
    }

    if (globalIndices.length === 0) return;

    // Build per-vertex color array. Key format: "lon,lat:colorHex:featureIndex"
    const numVerts = vtx.lonLat.length;
    const colorArray = new Float32Array(numVerts * 3);
    for (const [key, idx] of vtx.map) {
      const firstColon = key.indexOf(':');
      const secondColon = key.indexOf(':', firstColon + 1);
      const hexStr = secondColon > firstColon ? key.slice(firstColon + 1, secondColon) : key.slice(firstColon + 1);
      const hex = parseInt(hexStr, 16);
      colorArray[idx * 3] = ((hex >> 16) & 0xff) / 255;
      colorArray[idx * 3 + 1] = ((hex >> 8) & 0xff) / 255;
      colorArray[idx * 3 + 2] = (hex & 0xff) / 255;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vtx.positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3));
    geom.setIndex(globalIndices);
    geom.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      depthTest: true,
      depthWrite: true,
      depthFunc: THREE.LessDepth,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -4,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.renderOrder = 1;
    mesh.visible = false;
    this.controlMesh = mesh;
    this.controlMeshes = [mesh];
    this.featureByTriIndex = triFeatures;
    this.controlIndices = globalIndices;
    this.controlPositions = vtx.positions;

    this.buildFactionOverlay();
  }

  /**
   * Build a texture-based faction overlay that is applied directly to the terrain mesh
   * geometry. This eliminates the floating-polygon-layer approach so control colors
   * stay perfectly on the terrain surface at all tilt angles.
   */
  private buildFactionOverlay(): void {
    if (this.factionOverlayMesh) {
      this.scene.remove(this.factionOverlayMesh);
      (this.factionOverlayMesh.material as THREE.Material).dispose();
      this.factionOverlayMesh = null;
    }
    if (!this.heightmap || !this.operationalGeo?.features?.length || !this.terrainMesh) return;

    const TEX_W = 2048;
    const TEX_H = 2048;
    const canvas = new OffscreenCanvas(TEX_W, TEX_H);
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, TEX_W, TEX_H);

    const bbox = this.heightmap.bbox as [number, number, number, number];
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const projX = (lon: number) => ((lon - minLon) / (maxLon - minLon)) * TEX_W;
    const projY = (lat: number) => ((maxLat - lat) / (maxLat - minLat)) * TEX_H;

    for (const feature of this.operationalGeo.features) {
      const controller = this.getMajorityController(feature);
      const colorHex = controller ? (FACTION_COLORS[controller] ?? NULL_COLOR) : NULL_COLOR;
      const r = (colorHex >> 16) & 0xff;
      const g = (colorHex >> 8) & 0xff;
      const b = colorHex & 0xff;

      ctx.fillStyle = `rgba(${r},${g},${b},0.75)`;

      const polyCoordSets = getPolygonCoordSets(feature);
      for (const coordSet of polyCoordSets) {
        const outerRing = coordSet[0];
        if (!outerRing || outerRing.length < 3) continue;

        ctx.beginPath();
        ctx.moveTo(projX(outerRing[0]![0]), projY(outerRing[0]![1]));
        for (let i = 1; i < outerRing.length; i++) {
          ctx.lineTo(projX(outerRing[i]![0]), projY(outerRing[i]![1]));
        }
        ctx.closePath();

        for (let hi = 1; hi < coordSet.length; hi++) {
          const hole = coordSet[hi];
          if (!hole || hole.length < 3) continue;
          ctx.moveTo(projX(hole[0]![0]), projY(hole[0]![1]));
          for (let i = 1; i < hole.length; i++) {
            ctx.lineTo(projX(hole[i]![0]), projY(hole[i]![1]));
          }
          ctx.closePath();
        }

        ctx.fill('evenodd');
      }
    }

    const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;

    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -4,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(this.terrainMesh.geometry, mat);
    mesh.renderOrder = 1;
    mesh.visible = this.layerVisibility.control;
    this.scene.add(mesh);
    this.factionOverlayMesh = mesh;
  }

  /**
   * Build ZoC overlay from phase_ii_enemy_zoc_by_faction: for each faction, draw OSIDs
   * in that faction's enemy-ZoC set as a subtle faction-colored fill above the control layer.
   */
  private buildZocLayer(): void {
    for (const mesh of this.zocMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.zocMeshes = [];

    if (!this.heightmap || !this.operationalGeo?.features?.length) return;
    const hm = this.heightmap;
    const ZOC_Y_OFFSET = 0.004;
    const SUBDIV = 3;

    const factionIds = Object.keys(this.enemyZocByFaction).sort((a, b) => a.localeCompare(b));
    for (const factionId of factionIds) {
      const osidList = this.enemyZocByFaction[factionId];
      if (!Array.isArray(osidList) || osidList.length === 0) continue;
      const osidSet = new Set(osidList);

      const vtx: GlobalVertexTable = { lonLat: [], positions: [], map: new Map() };
      const globalIndices: number[] = [];

      const colorHex = FACTION_COLORS[factionId] ?? NULL_COLOR;
      const colorTag = colorHex.toString(16);
      const addPt = (lon: number, lat: number): number => {
        const key = `${lon.toFixed(7)},${lat.toFixed(7)}:${colorTag}`;
        const existing = vtx.map.get(key);
        if (existing !== undefined) return existing;
        const idx = vtx.lonLat.length;
        vtx.lonLat.push([lon, lat]);
        const elev = sampleHeight(hm, lon, lat);
        const [wx, wy, wz] = wgsToWorld(lon, lat, elev);
        vtx.positions.push(wx, wy + ZOC_Y_OFFSET, wz);
        vtx.map.set(key, idx);
        return idx;
      };

      for (const feature of this.operationalGeo!.features) {
        const osid = (feature.properties?.osid ?? '') as string;
        if (!osid || !osidSet.has(osid)) continue;

        const polyCoordSets = getPolygonCoordSets(feature);
        for (const coordSet of polyCoordSets) {
          const outerRing = coordSet[0];
          if (!outerRing || outerRing.length < 3) continue;
          const lonLat: [number, number][] = [];
          const holeIndices: number[] = [];
          const openOuter = openRing(outerRing);
          if (openOuter.length < 3) continue;
          for (const [lon, lat] of openOuter) lonLat.push([lon, lat]);
          for (let hi = 1; hi < coordSet.length; hi++) {
            const holeRing = coordSet[hi];
            if (!holeRing || holeRing.length < 3) continue;
            const oh = openRing(holeRing);
            if (oh.length < 3) continue;
            holeIndices.push(lonLat.length);
            for (const [lon, lat] of oh) lonLat.push([lon, lat]);
          }
          const flat: number[] = [];
          for (const [lon, lat] of lonLat) {
            const [x, , z] = wgsToWorld(lon, lat, 0);
            flat.push(x, z);
          }
          let baseTris: number[];
          try {
            baseTris = Earcut.triangulate(flat, holeIndices.length > 0 ? holeIndices : undefined, 2);
          } catch {
            continue;
          }
          if (baseTris.length === 0) continue;
          const triTriplets: [number, number, number][] = [];
          for (let ti = 0; ti < baseTris.length; ti += 3) {
            triTriplets.push([baseTris[ti]!, baseTris[ti + 1]!, baseTris[ti + 2]!]);
          }
          for (const [i0, i1, i2] of triTriplets) {
            const { pts, tris } = HoIMapRenderer.subdivideTriangle(lonLat, i0, i1, i2, SUBDIV);
            const remap: number[] = [];
            for (const pt of pts) remap.push(addPt(pt[0], pt[1]));
            for (const [a, b2, c] of tris) {
              globalIndices.push(remap[a]!, remap[b2]!, remap[c]!);
            }
          }
        }
      }

      if (globalIndices.length === 0) continue;

      const numVerts = vtx.lonLat.length;
      const colorArray = new Float32Array(numVerts * 3);
      const r = ((colorHex >> 16) & 0xff) / 255;
      const g = ((colorHex >> 8) & 0xff) / 255;
      const b = (colorHex & 0xff) / 255;
      for (let i = 0; i < numVerts; i++) {
        colorArray[i * 3] = r;
        colorArray[i * 3 + 1] = g;
        colorArray[i * 3 + 2] = b;
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(vtx.positions, 3));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3));
      geom.setIndex(globalIndices);
      geom.computeVertexNormals();
      const mat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.22,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.renderOrder = 2;
      mesh.visible = this.layerVisibility.zoc;
      this.scene.add(mesh);
      this.zocMeshes.push(mesh);
    }
  }

  /**
   * Build a single ZoC fill mesh for a set of OSIDs (shared by buildZocLayer and selection ZoC).
   * Returns null when no geometry (e.g. no matching features).
   */
  private buildZocMeshFromOsidSet(osidSet: Set<string>, colorHex: number): THREE.Mesh | null {
    const hm = this.heightmap!;
    const ZOC_Y_OFFSET = 0.004;
    const SUBDIV = 3;
    const vtx: GlobalVertexTable = { lonLat: [], positions: [], map: new Map() };
    const globalIndices: number[] = [];
    const colorTag = colorHex.toString(16);
    const addPt = (lon: number, lat: number): number => {
      const key = `${lon.toFixed(7)},${lat.toFixed(7)}:${colorTag}`;
      const existing = vtx.map.get(key);
      if (existing !== undefined) return existing;
      const idx = vtx.lonLat.length;
      vtx.lonLat.push([lon, lat]);
      const elev = sampleHeight(hm, lon, lat);
      const [wx, wy, wz] = wgsToWorld(lon, lat, elev);
      vtx.positions.push(wx, wy + ZOC_Y_OFFSET, wz);
      vtx.map.set(key, idx);
      return idx;
    };
    for (const feature of this.operationalGeo!.features) {
      const osid = (feature.properties?.osid ?? '') as string;
      if (!osid || !osidSet.has(osid)) continue;
      const polyCoordSets = getPolygonCoordSets(feature);
      for (const coordSet of polyCoordSets) {
        const outerRing = coordSet[0];
        if (!outerRing || outerRing.length < 3) continue;
        const lonLat: [number, number][] = [];
        const holeIndices: number[] = [];
        const openOuter = openRing(outerRing);
        if (openOuter.length < 3) continue;
        for (const [lon, lat] of openOuter) lonLat.push([lon, lat]);
        for (let hi = 1; hi < coordSet.length; hi++) {
          const holeRing = coordSet[hi];
          if (!holeRing || holeRing.length < 3) continue;
          const oh = openRing(holeRing);
          if (oh.length < 3) continue;
          holeIndices.push(lonLat.length);
          for (const [lon, lat] of oh) lonLat.push([lon, lat]);
        }
        const flat: number[] = [];
        for (const [lon, lat] of lonLat) {
          const [x, , z] = wgsToWorld(lon, lat, 0);
          flat.push(x, z);
        }
        let baseTris: number[];
        try {
          baseTris = Earcut.triangulate(flat, holeIndices.length > 0 ? holeIndices : undefined, 2);
        } catch {
          continue;
        }
        if (baseTris.length === 0) continue;
        const triTriplets: [number, number, number][] = [];
        for (let ti = 0; ti < baseTris.length; ti += 3) {
          triTriplets.push([baseTris[ti]!, baseTris[ti + 1]!, baseTris[ti + 2]!]);
        }
        for (const [i0, i1, i2] of triTriplets) {
          const { pts, tris } = HoIMapRenderer.subdivideTriangle(lonLat, i0, i1, i2, SUBDIV);
          const remap: number[] = [];
          for (const pt of pts) remap.push(addPt(pt[0], pt[1]));
          for (const [a, b2, c] of tris) {
            globalIndices.push(remap[a]!, remap[b2]!, remap[c]!);
          }
        }
      }
    }
    if (globalIndices.length === 0) return null;
    const numVerts = vtx.lonLat.length;
    const colorArray = new Float32Array(numVerts * 3);
    const r = ((colorHex >> 16) & 0xff) / 255;
    const g = ((colorHex >> 8) & 0xff) / 255;
    const b = (colorHex & 0xff) / 255;
    for (let i = 0; i < numVerts; i++) {
      colorArray[i * 3] = r;
      colorArray[i * 3 + 1] = g;
      colorArray[i * 3 + 2] = b;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vtx.positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3));
    geom.setIndex(globalIndices);
    geom.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.22,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.renderOrder = 2;
    return mesh;
  }

  /**
   * Set selection ZoC: show ZoC fill for the given OSIDs (e.g. selected brigade's neighbors).
   * Visible independently of F6. Call with ([], null) to clear.
   */
  setSelectionZocOsids(osids: string[], factionId: string | null): void {
    if (this.selectionZocMesh) {
      this.scene.remove(this.selectionZocMesh);
      this.selectionZocMesh.geometry.dispose();
      (this.selectionZocMesh.material as THREE.Material).dispose();
      this.selectionZocMesh = null;
    }
    if (osids.length === 0 || !factionId || !this.heightmap || !this.operationalGeo?.features?.length) return;
    const osidSet = new Set(osids);
    const colorHex = FACTION_COLORS[factionId] ?? NULL_COLOR;
    const mesh = this.buildZocMeshFromOsidSet(osidSet, colorHex);
    if (!mesh) return;
    mesh.visible = true;
    this.scene.add(mesh);
    this.selectionZocMesh = mesh;
  }

  /**
   * Set corps–brigade lines (from corps centroid to each subordinate). Clear when segments.length === 0.
   * factionId optional: use faction color for the lines.
   */
  setCorpsBrigadeLines(
    segments: { from: [number, number, number]; to: [number, number, number] }[],
    factionId?: string | null
  ): void {
    if (this.corpsBrigadeLineSegments) {
      this.scene.remove(this.corpsBrigadeLineSegments);
      this.corpsBrigadeLineSegments.geometry.dispose();
      (this.corpsBrigadeLineSegments.material as THREE.Material).dispose();
      this.corpsBrigadeLineSegments = null;
    }
    if (segments.length === 0) return;
    const positions: number[] = [];
    for (const s of segments) {
      positions.push(s.from[0], s.from[1], s.from[2], s.to[0], s.to[1], s.to[2]);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const colorHex = factionId ? (FACTION_COLORS[factionId] ?? NULL_COLOR) : 0xddd5c8;
    const mat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 1 });
    this.corpsBrigadeLineSegments = new THREE.LineSegments(geom, mat);
    this.corpsBrigadeLineSegments.renderOrder = 2;
    this.scene.add(this.corpsBrigadeLineSegments);
  }

  /**
   * Determine the political controller for an operational GeoJSON feature by majority vote
   * of its constituent canonical SIDs. Falls back to the feature's primary SID or OSID.
   */
  private getMajorityController(feature: GeoJSONFeature): string | null {
    const constituents = feature.properties?.constituent_sids as string[] | undefined;
    if (Array.isArray(constituents) && constituents.length > 0) {
      const counts: Record<string, number> = {};
      for (const csid of constituents) {
        const ctrl = this.controlBySettlement[csid];
        if (ctrl) counts[ctrl] = (counts[ctrl] ?? 0) + 1;
      }
      let best: string | null = null;
      let bestCount = 0;
      for (const [faction, count] of Object.entries(counts)) {
        if (count > bestCount || (count === bestCount && faction < (best ?? ''))) {
          best = faction;
          bestCount = count;
        }
      }
      if (best) return best;
    }
    const sid = (feature.properties?.sid ?? '') as string;
    const osid = (feature.properties?.osid ?? '') as string;
    return this.controlBySettlement[sid] ?? this.controlBySettlement[osid] ?? null;
  }

  /**
   * Return world position [x, y, z] for a settlement by OSID or SID; null if unknown.
   * Used for formation marker placement and corps line endpoints. Deterministic.
   */
  getWorldPositionForSettlement(osidOrSid: string): [number, number, number] | null {
    const centroid = this.centroidBySid[osidOrSid];
    if (!centroid || !this.heightmap) return null;
    const elev = sampleHeight(this.heightmap, centroid[0], centroid[1]);
    return wgsToWorld(centroid[0], centroid[1], elev);
  }

  private computeCentroids(): void {
    this.centroidBySid = {};
    this.sidToOsid = {};
    if (!this.operationalGeo?.features?.length) return;
    for (const f of this.operationalGeo.features) {
      const rings = getRings(f);
      const osid = (f.properties?.osid ?? '') as string;
      const sid = (f.properties?.sid ?? '') as string;
      const key = osid || sid;
      if (!key || !rings[0]?.length) continue;
      let sumLon = 0, sumLat = 0;
      const ring = rings[0];
      for (const [lon, lat] of ring) {
        sumLon += lon;
        sumLat += lat;
      }
      const centroid: [number, number] = [sumLon / ring.length, sumLat / ring.length];
      this.centroidBySid[key] = centroid;
      // Map primary canonical SID → osid
      if (sid && sid !== key) {
        this.centroidBySid[sid] = centroid;
        this.sidToOsid[sid] = key;
      }
      // Map ALL constituent canonical SIDs → osid (for front edge lookup)
      const constituents = f.properties?.constituent_sids as string[] | undefined;
      if (Array.isArray(constituents)) {
        for (const csid of constituents) {
          if (csid && !this.sidToOsid[csid]) {
            this.sidToOsid[csid] = key;
            if (!this.centroidBySid[csid]) this.centroidBySid[csid] = centroid;
          }
        }
      }
    }
  }

  /**
   * Deduplicate consecutive points and apply one-pass smoothing to a border run
   * to reduce jaggedness from dense or noisy polygon vertices. Deterministic.
   */
  private dedupeAndSmoothBorderRun(run: [number, number][], eps: number): [number, number][] {
    if (run.length < 2) return run;
    const deduped: [number, number][] = [run[0]!];
    for (let i = 1; i < run.length; i++) {
      const p = run[i]!;
      const prev = deduped[deduped.length - 1]!;
      if (Math.abs(p[0] - prev[0]) < eps && Math.abs(p[1] - prev[1]) < eps) continue;
      if (deduped.length === 1 && i === run.length - 1 && Math.abs(p[0] - run[0]![0]) < eps && Math.abs(p[1] - run[0]![1]) < eps) continue;
      deduped.push(p);
    }
    if (deduped.length >= 2) {
      const first = deduped[0]!;
      const last = deduped[deduped.length - 1]!;
      if (Math.abs(first[0] - last[0]) < eps && Math.abs(first[1] - last[1]) < eps) deduped.pop();
    }
    if (deduped.length < 2) return deduped;
    const smoothed: [number, number][] = [[deduped[0]![0], deduped[0]![1]]];
    for (let i = 1; i < deduped.length - 1; i++) {
      const a = deduped[i - 1]!;
      const b = deduped[i]!;
      const c = deduped[i + 1]!;
      smoothed.push([
        0.25 * a[0] + 0.5 * b[0] + 0.25 * c[0],
        0.25 * a[1] + 0.5 * b[1] + 0.25 * c[1],
      ]);
    }
    smoothed.push([deduped[deduped.length - 1]![0], deduped[deduped.length - 1]![1]]);
    return smoothed;
  }

  /**
   * Compute shared border geometry for every edge in the contact graph.
   * Walks the outer ring(s) of settlement A and collects consecutive runs of
   * vertices that also appear on B's boundary, so each run follows the actual
   * border (no zig-zags or diagonals across the polygon).
   */
  private computeSharedBorders(edges: ContactEdge[]): void {
    this.sharedBorderByEdge = new Map();
    if (!this.operationalGeo?.features?.length) return;

    const featureBySid = new Map<string, GeoJSONFeature>();
    for (const f of this.operationalGeo.features) {
      const sid = (f.properties?.osid ?? f.properties?.sid ?? '') as string;
      if (sid) featureBySid.set(sid, f);
    }

    for (const edge of edges) {
      const fa = featureBySid.get(edge.a);
      const fb = featureBySid.get(edge.b);
      if (!fa || !fb) continue;

      const ringsB = getRings(fb);
      const setB = new Set<string>();
      for (const ring of ringsB) {
        for (const pt of ring) setB.add(borderVertexKey(pt[0], pt[1]));
      }

      const runs: [number, number][][] = [];
      const ringsA = getRings(fa);
      const EPS = 1e-9;
      for (const ring of ringsA) {
        let currentRun: [number, number][] = [];
        for (const pt of ring) {
          if (setB.has(borderVertexKey(pt[0], pt[1]))) {
            currentRun.push([pt[0], pt[1]]);
          } else {
            if (currentRun.length >= 2) runs.push(this.dedupeAndSmoothBorderRun(currentRun, EPS));
            currentRun = [];
          }
        }
        if (currentRun.length >= 2) runs.push(this.dedupeAndSmoothBorderRun(currentRun, EPS));
      }
      const filteredRuns = runs.filter((r) => r.length >= 2);
      if (filteredRuns.length === 0) continue;

      const border: SharedBorder = { a: edge.a, b: edge.b, runs: filteredRuns };
      const key = edge.a < edge.b ? `${edge.a}__${edge.b}` : `${edge.b}__${edge.a}`;
      this.sharedBorderByEdge.set(key, border);

      const sidA = (featureBySid.get(edge.a)?.properties?.sid ?? '') as string;
      const sidB = (featureBySid.get(edge.b)?.properties?.sid ?? '') as string;
      if (sidA && sidB) {
        const sidKey = sidA < sidB ? `${sidA}__${sidB}` : `${sidB}__${sidA}`;
        if (!this.sharedBorderByEdge.has(sidKey)) {
          this.sharedBorderByEdge.set(sidKey, border);
        }
      }
    }
  }

  /**
   * Build floating settlement name labels as billboard sprites.
   * Cities (pop >= 15k) get larger labels; towns (pop >= 5k) get smaller ones.
   * Labels float just above the terrain and scale with zoom.
   */
  private buildSettlementLabels(): void {
    // Dispose old
    for (const s of this.settlementLabelSprites) {
      this.scene.remove(s);
      (s.material as THREE.SpriteMaterial).map?.dispose();
      (s.material as THREE.SpriteMaterial).dispose();
    }
    this.settlementLabelSprites = [];
    this.settlementLabelMeta = [];

    if (!this.heightmap || !this.operationalGeo?.features?.length) return;
    const hm = this.heightmap;

    const CITY_POP = 15000;
    const TOWN_POP = 5000;

    /** Sarajevo municipalities: show one "Sarajevo" label for the whole cluster. */
    const SARAJEVO_MUN_IDS = new Set([
      'centar_sarajevo', 'novo_sarajevo', 'novi_grad_sarajevo', 'stari_grad_sarajevo',
    ]);
    const SARAJEVO_LABEL_LON = 18.41;
    const SARAJEVO_LABEL_LAT = 43.86;

    function isSarajevoFeature(f: GeoJSONFeature): boolean {
      const munId = (f.properties?.mun1990_id ?? '') as string;
      if (SARAJEVO_MUN_IDS.has(munId)) return true;
      const osid = (f.properties?.osid ?? '') as string;
      if (SARAJEVO_MUN_IDS.has(osid.split(':')[1] ?? '')) return true;
      // Sarajevo Dio - Ilidža and any other "Sarajevo Dio" settlement (osid segment contains sarajevo_dio)
      if (osid.includes('sarajevo_dio')) return true;
      const name = (f.properties?.settlement_name ?? '') as string;
      return name.startsWith('Sarajevo Dio');
    }

    // Collect qualifying settlements sorted by population (largest first)
    const allCandidates = this.operationalGeo.features
      .filter(f => {
        const pop = f.properties?.population_total as number | undefined;
        return typeof pop === 'number' && pop >= TOWN_POP;
      })
      .sort((a, b) =>
        ((b.properties?.population_total as number) ?? 0)
        - ((a.properties?.population_total as number) ?? 0)
      );

    /** Živinice town: merge Živinice Gornje and Živinice Grad into one "Živinice" label (mun zivinice only; not op:derventa:zivinice). */
    function isZiviniceTownFeature(f: GeoJSONFeature): boolean {
      const osid = (f.properties?.osid ?? '') as string;
      const parts = osid.split(':');
      const mun = parts[1] ?? '';
      const slug = parts[2] ?? '';
      if (mun !== 'zivinice') return false;
      if (slug.startsWith('zivinice_gornje') || slug.startsWith('zivinice_grad')) return true;
      const name = (f.properties?.settlement_name ?? '') as string;
      return /^[ZŽ]ivinice (Gornje|Grad)/i.test(name);
    }

    const sarajevoFeatures = allCandidates.filter(isSarajevoFeature);
    const ziviniceTownFeatures = allCandidates.filter(f => !isSarajevoFeature(f) && isZiviniceTownFeature(f));
    const candidates = allCandidates.filter(
      f => !isSarajevoFeature(f) && !isZiviniceTownFeature(f)
    );

    const addLabel = (name: string, lon: number, lat: number, pop: number): void => {
      const isCity = pop >= CITY_POP;
      // Higher-res texture (1.5×) so labels stay crisp when zoomed in (Phase 4 LOD; single atlas).
      const fontSize = isCity ? 32 : 26;
      const canvasW = isCity ? 384 : 288;
      const canvasH = isCity ? 60 : 48;

      // Create canvas label
      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d')!;

      const fontWeight = isCity ? '700' : '600';
      ctx.font = `${fontWeight} ${fontSize}px "IBM Plex Sans Condensed", Arial Narrow, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const textX = 10;
      const textY = canvasH / 2;
      const metrics = ctx.measureText(name);
      const textW = metrics.width;
      const paddingH = 8;
      const paddingV = 6;
      const r = 4;

      // Solid background pill so label stays readable over fronts, control, arrows
      const bgL = textX - paddingH;
      const bgR = textX + textW + paddingH;
      const bgT = textY - fontSize / 2 - paddingV;
      const bgB = textY + fontSize / 2 + paddingV;
      ctx.beginPath();
      ctx.roundRect(bgL, bgT, bgR - bgL, bgB - bgT, r);
      ctx.fillStyle = 'rgba(28, 26, 23, 0.92)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(196, 163, 90, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Dark text (no halo — background provides contrast)
      ctx.fillStyle = isCity ? 'rgba(221, 213, 200, 0.98)' : 'rgba(200, 192, 180, 0.95)';
      ctx.fillText(name, textX, textY);

      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(mat);

      // Position: at settlement centroid, slightly above terrain
      const elev = sampleHeight(hm, lon, lat);
      const [wx, wy, wz] = wgsToWorld(lon, lat, elev);
      sprite.position.set(wx + 0.02, wy + 0.03, wz); // slight offset right + up

      // Scale: tiny billboard (will be scaled dynamically in animate())
      const scaleBase = isCity ? 0.12 : 0.08;
      const aspect = canvasW / canvasH;
      sprite.scale.set(scaleBase * aspect, scaleBase, 1);
      sprite.renderOrder = 4;

      this.scene.add(sprite);
      this.settlementLabelSprites.push(sprite);
      this.settlementLabelMeta.push({ pop, scaleBase, aspect: canvasW / canvasH });
    };

    for (const feature of candidates) {
      const pop = feature.properties?.population_total as number;
      const rawName = (feature.properties?.settlement_name ?? feature.properties?.osid ?? '') as string;
      const name = rawName.replace(/\s*\(\+\d+\)$/, '');
      if (!name) continue;

      const sid = (feature.properties?.osid ?? feature.properties?.sid ?? '') as string;
      const centroid = this.centroidBySid[sid];
      if (!centroid) continue;
      addLabel(name, centroid[0], centroid[1], pop);
    }

    if (sarajevoFeatures.length > 0) {
      const totalPop = sarajevoFeatures.reduce(
        (sum, f) => sum + ((f.properties?.population_total as number) ?? 0),
        0
      );
      addLabel('Sarajevo', SARAJEVO_LABEL_LON, SARAJEVO_LABEL_LAT, Math.max(totalPop, 300000));
    }

    if (ziviniceTownFeatures.length > 0) {
      const totalPop = ziviniceTownFeatures.reduce(
        (sum, f) => sum + ((f.properties?.population_total as number) ?? 0),
        0
      );
      const firstSid = (ziviniceTownFeatures[0]!.properties?.osid ?? ziviniceTownFeatures[0]!.properties?.sid ?? '') as string;
      const centroid = this.centroidBySid[firstSid];
      if (centroid) {
        addLabel('Živinice', centroid[0], centroid[1], totalPop);
      }
    }
  }

  private updateCamera(): void {
    const rect = this.container.getBoundingClientRect();
    const aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
    const frustum = this.zoom;
    this.camera.left = -frustum * aspect;
    this.camera.right = frustum * aspect;
    this.camera.top = frustum;
    this.camera.bottom = -frustum;
    this.camera.updateProjectionMatrix();
    const tiltRad = (this.tilt * Math.PI) / 180;
    const yawRad = (this.yaw * Math.PI) / 180;
    const camDist = 10;
    const horiz = camDist * Math.sin(tiltRad);
    const dx = horiz * Math.sin(yawRad);
    const dz = horiz * Math.cos(yawRad);
    this.camera.position.set(this.pan.x + dx, camDist * Math.cos(tiltRad), this.pan.z + dz);
    this.camera.lookAt(this.pan.x, 0, this.pan.z);
    // Label LOD: rebuild when zoom crosses threshold
    const newHigh = this.zoom < LABEL_LOD_ZOOM_THRESHOLD;
    if (this._lastLabelInput.length > 0 && newHigh !== this._labelLodHighRes) {
      this._labelLodHighRes = newHigh;
      this.rebuildLabelSprites();
    }
  }

  /** Set enemy ZoC by faction (OSID arrays). Rebuilds ZoC overlay layer. */
  setEnemyZocByFaction(data: Record<string, string[]>): void {
    this.enemyZocByFaction = data && typeof data === 'object' && !Array.isArray(data) ? { ...data } : {};
    this.buildZocLayer();
  }

  setControlBySettlement(control: Record<string, string | null>): void {
    this.controlBySettlement = control;
    this.buildControlLayer();
  }

  setPlayerFaction(faction: string | null): void {
    this.playerFaction = faction;
  }

  setHoverCallback(cb: (feature: GeoJSONFeature | null, screenX: number, screenY: number) => void): void {
    this.onHoverSettlement = cb;
  }

  setClickCallback(cb: (feature: GeoJSONFeature | null) => void): void {
    this.onClickSettlement = cb;
  }

  setClickFormationCallback(cb: (formationId: string | null) => void): void {
    this.onClickFormation = cb;
  }

  getControlBySettlement(): Record<string, string | null> {
    return this.controlBySettlement;
  }

  /** Toggle a named layer on/off. Returns the new visibility state. */
  setLayerVisible(layer: HoILayerName, visible: boolean): boolean {
    this.layerVisibility[layer] = visible;
    this.applyLayerVisibility();
    return visible;
  }

  /** Get current layer visibility state. */
  getLayerVisibility(): Readonly<HoILayerVisibility> {
    return { ...this.layerVisibility };
  }

  /** Apply current layerVisibility state to scene objects. */
  private applyLayerVisibility(): void {
    if (this.terrainMesh) this.terrainMesh.visible = this.layerVisibility.terrain;
    if (this.factionOverlayMesh) this.factionOverlayMesh.visible = this.layerVisibility.control;
    for (const m of this.frontRibbonMeshes) m.visible = this.layerVisibility.frontLines;
    for (const m of this.assignableSegmentMeshes) m.visible = this.layerVisibility.frontLines;
    // Formation sprite visibility per-sprite is set in animate() (zoom-based: at max zoom out only corps/army_hq)
    for (const s of this.formationSprites) s.visible = this.layerVisibility.formations;
    for (const s of this.labelSprites) s.visible = this.layerVisibility.labels;
    // Settlement floating labels follow the labels layer toggle
    // (exact visibility per-sprite is handled in animate() based on zoom)
    for (const s of this.settlementLabelSprites) s.visible = this.layerVisibility.labels;
    // Selection border follows control layer visibility
    if (this.selectionBorder) this.selectionBorder.visible = this.layerVisibility.control;
    for (const m of this.zocMeshes) m.visible = this.layerVisibility.zoc;
  }

  /**
   * Look up the GeoJSON feature from a raycast intersection against the
   * single control mesh, using the face index → featureByTriIndex mapping.
   */
  private featureFromIntersection(intersection: THREE.Intersection): GeoJSONFeature | null {
    const faceIdx = intersection.faceIndex;
    if (faceIdx == null) return null;
    return this.featureByTriIndex[faceIdx] ?? null;
  }

  private raycastControl(): THREE.Intersection[] {
    return this.controlMesh ? this.raycaster.intersectObject(this.controlMesh, false) : [];
  }

  private centerOnSid(sid: string, targetZoom?: number): void {
    const osid = this.sidToOsid[sid];
    const centroid = this.centroidBySid[sid] ?? (osid ? this.centroidBySid[osid] : undefined);
    if (!centroid) return;
    const [wx, , wz] = wgsToWorld(centroid[0], centroid[1], 0);
    this.pan = { x: wx, z: wz };
    if (typeof targetZoom === 'number' && Number.isFinite(targetZoom)) {
      this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
    }
    this.updateCamera();
  }

  private centerOnFeature(feature: GeoJSONFeature | null, targetZoom?: number): void {
    if (!feature) return;
    const osid = typeof feature.properties?.osid === 'string' ? feature.properties.osid : null;
    const sid = typeof feature.properties?.sid === 'string' ? feature.properties.sid : null;
    if (osid) {
      this.centerOnSid(osid, targetZoom);
      return;
    }
    if (sid) this.centerOnSid(sid, targetZoom);
  }

  private centerOnPlayerCapital(): void {
    if (!this.playerFaction) return;
    const candidateSids = Object.keys(this.controlBySettlement)
      .filter((sid) => this.controlBySettlement[sid] === this.playerFaction)
      .sort(strictCompare);
    if (candidateSids.length === 0) return;
    let bestSid: string | null = null;
    let bestPop = -1;
    for (const sid of candidateSids) {
      const osid = this.sidToOsid[sid];
      const centroid = this.centroidBySid[sid] ?? (osid ? this.centroidBySid[osid] : undefined);
      if (!centroid) continue;
      const feature = this.operationalGeo?.features.find((f) => {
        const fsid = typeof f.properties?.sid === 'string' ? f.properties.sid : null;
        const fosid = typeof f.properties?.osid === 'string' ? f.properties.osid : null;
        return fsid === sid || (osid != null && fosid === osid);
      });
      const popRaw = feature?.properties?.population_total ?? feature?.properties?.pop ?? 0;
      const pop = typeof popRaw === 'number' && Number.isFinite(popRaw) ? popRaw : 0;
      if (pop > bestPop || (pop === bestPop && bestSid != null && strictCompare(sid, bestSid) < 0) || bestSid == null) {
        bestPop = pop;
        bestSid = sid;
      }
    }
    if (bestSid) this.centerOnSid(bestSid);
  }

  private handleSettlementClick(e: MouseEvent): void {
    const el = this.renderer.domElement;
    const rect = el.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (this.formationProxyMeshes.length > 0 && this.layerVisibility.formations) {
      const formationIntersects = this.raycaster.intersectObjects(this.formationProxyMeshes, false);
      if (formationIntersects.length > 0) {
        const hitMesh = formationIntersects[0]!.object as THREE.Mesh;
        const formationId = this.formationIdByProxy.get(hitMesh);
        const onlyCorpsLevel = this.zoom >= ZOOM_CORPS_ONLY_THRESHOLD;
        if (formationId != null && (!onlyCorpsLevel || this.showWhenZoomedOutByFormationId.get(formationId))) {
          this.selectedFeature = null;
          this.clearSelectionBorder();
          this.onClickFormation?.(formationId);
          return;
        }
      }
    }
    const intersects = this.raycastControl();
    if (intersects.length > 0) {
      const feature = this.featureFromIntersection(intersects[0]!);
      if (feature === this.selectedFeature) {
        this.selectedFeature = null;
        this.clearSelectionBorder();
      } else {
        this.selectedFeature = feature;
        this.buildSelectionBorder(feature);
      }
      this.onClickSettlement?.(this.selectedFeature);
      this.onClickFormation?.(null);
    } else {
      this.selectedFeature = null;
      this.clearSelectionBorder();
      this.onClickSettlement?.(null);
      this.onClickFormation?.(null);
    }
  }

  private clearSelectionBorder(): void {
    if (this.selectionBorder) {
      this.scene.remove(this.selectionBorder);
      this.selectionBorder.geometry.dispose();
      (this.selectionBorder.material as THREE.Material).dispose();
      this.selectionBorder = null;
    }
  }

  /**
   * Build selection highlight by extracting boundary edges from the control
   * mesh's triangles that belong to the selected feature.
   *
   * A boundary edge is one that appears in only ONE triangle of this feature
   * (i.e. it's on the silhouette — not shared between two same-feature triangles).
   * This uses the exact same vertex positions as the control fill, guaranteeing
   * pixel-perfect alignment. A tiny Y bump lifts the lines above the fill.
   */
  private buildSelectionBorder(feature: GeoJSONFeature | null): void {
    this.clearSelectionBorder();
    if (!feature || this.controlIndices.length === 0) return;

    const SEL_Y_BUMP = 0.005; // tiny lift above control fill

    // Collect all triangle face indices that belong to this feature
    const featureFaceIndices: number[] = [];
    for (let fi = 0; fi < this.featureByTriIndex.length; fi++) {
      if (this.featureByTriIndex[fi] === feature) {
        featureFaceIndices.push(fi);
      }
    }
    if (featureFaceIndices.length === 0) return;

    // Count how many times each edge appears in this feature's triangles.
    // An edge is a pair of vertex indices; we canonicalise by sorting (min, max).
    const edgeCounts = new Map<string, [number, number]>();
    const edgeCountMap = new Map<string, number>();
    for (const fi of featureFaceIndices) {
      const base = fi * 3;
      const a = this.controlIndices[base]!;
      const b = this.controlIndices[base + 1]!;
      const c = this.controlIndices[base + 2]!;
      const edges: [number, number][] = [[a, b], [b, c], [c, a]];
      for (const [p, q] of edges) {
        const lo = Math.min(p, q);
        const hi = Math.max(p, q);
        const key = `${lo},${hi}`;
        edgeCountMap.set(key, (edgeCountMap.get(key) ?? 0) + 1);
        if (!edgeCounts.has(key)) edgeCounts.set(key, [lo, hi]);
      }
    }

    // Boundary edges appear exactly once (not shared between two triangles of this feature)
    const positions: number[] = [];
    const src = this.controlPositions;
    for (const [key, [a, b]] of edgeCounts) {
      if (edgeCountMap.get(key)! !== 1) continue;
      // Copy vertex positions from control mesh with Y bump
      const ax = src[a * 3]!, ay = src[a * 3 + 1]!, az = src[a * 3 + 2]!;
      const bx = src[b * 3]!, by = src[b * 3 + 1]!, bz = src[b * 3 + 2]!;
      positions.push(ax, ay + SEL_Y_BUMP, az, bx, by + SEL_Y_BUMP, bz);
    }

    if (positions.length === 0) return;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xffd700,
      linewidth: 2,
      depthTest: false,
    });
    this.selectionBorder = new THREE.LineSegments(geom, mat);
    this.selectionBorder.renderOrder = 3;
    this.scene.add(this.selectionBorder);
  }

  /**
   * HoI4-style painted band front lines (HOI_VISUAL_GUI_OVERHAUL_SPEC §2.3, §9.1).
   *
   * Single neutral warm grey band with dark center line; asymmetric width (wider on
   * player-faction side). Front = full hostile boundary (no filter by "where we have units").
   */
  setFrontEdges(edges: FrontEdgeInput[]): void {
    for (const m of this.frontRibbonMeshes) {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.frontRibbonMeshes = [];
    if (!this.heightmap || edges.length === 0) return;
    const hm = this.heightmap;

    /** Zoom-scaled band half-widths (WGS): base * (DEFAULT_ZOOM / zoom) so strategic = thinner. */
    const zoomScale = DEFAULT_ZOOM / Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom));
    const BAND_HALF_BASE_WGS = 0.0012;
    const halfWgs = BAND_HALF_BASE_WGS * zoomScale;
    /** Asymmetric: wider on friendly (player) side. Architect decision: friendly = playerFaction. */
    const FRIENDLY_HALF_WGS = halfWgs * 1.25;
    const OTHER_HALF_WGS = halfWgs * 0.75;
    const CENTER_HALF_WGS = 0.00025;  // Thick blue center line (HoI-style)
    const FRONT_LINE_Y = 0.002;
    const CENTER_LINE_Y = 0.003;
    const BARB_Y = 0.0035;
    const NEUTRAL_BAND_COLOR = 0x503c28; // rgba(80,60,40,0.6) per spec
    /** Front line color by side: friendly (player on one end) vs other (no player). */
    const FRIENDLY_FRONT_LINE_COLOR = 0x4a6fa5; // Steel blue — "your" front
    const OTHER_FRONT_LINE_COLOR = 0x6a5a4a;   // Warm grey — fronts between other factions
    const barbLengthWgs = 0.00035;
    const barbHalfWidthWgs = 0.00012;
    const barbStep = 2; // Add barb every N segments

    const drawnOpBorders = new Set<string>();

    /** HoI-style barbs: triangles along the run with tip toward enemy (-flipSign * normal). */
    const buildBarbsAlongRun = (
      pts: [number, number][],
      flipSign: number,
      color: number,
      opacity: number
    ): void => {
      if (pts.length < 2) return;
      const nSegs = pts.length - 1;
      const positions: number[] = [];
      for (let s = 0; s < nSegs; s += barbStep) {
        const p0 = pts[s]!;
        const p1 = pts[s + 1]!;
        const mx = (p0[0] + p1[0]) / 2;
        const my = (p0[1] + p1[1]) / 2;
        const dx = p1[0] - p0[0];
        const dy = p1[1] - p0[1];
        const len = Math.sqrt(dx * dx + dy * dy) || 1e-10;
        const tx = dx / len;
        const ty = dy / len;
        const nx = -ty;
        const ny = tx;
        const enemyDx = -flipSign * nx;
        const enemyDy = -flipSign * ny;
        const baseLonL = mx - barbHalfWidthWgs * tx;
        const baseLatL = my - barbHalfWidthWgs * ty;
        const baseLonR = mx + barbHalfWidthWgs * tx;
        const baseLatR = my + barbHalfWidthWgs * ty;
        const tipLon = mx + barbLengthWgs * enemyDx;
        const tipLat = my + barbLengthWgs * enemyDy;
        const eBaseL = sampleHeight(hm, baseLonL, baseLatL);
        const eBaseR = sampleHeight(hm, baseLonR, baseLatR);
        const eTip = sampleHeight(hm, tipLon, tipLat);
        const [xL, yL, zL] = wgsToWorld(baseLonL, baseLatL, eBaseL);
        const [xR, yR, zR] = wgsToWorld(baseLonR, baseLatR, eBaseR);
        const [xT, yT, zT] = wgsToWorld(tipLon, tipLat, eTip);
        positions.push(xL, yL + BARB_Y, zL, xR, yR + BARB_Y, zR, xT, yT + BARB_Y, zT);
      }
      if (positions.length === 0) return;
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.computeVertexNormals();
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: opacity < 1,
        opacity,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -12,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.renderOrder = 4;
      this.scene.add(mesh);
      this.frontRibbonMeshes.push(mesh);
    };

    const buildRibbonAlongBorder = (
      pts: [number, number][], flipSign: number,
      offsetDir: number, halfWidth: number, color: number, opacity: number, yLift: number, renderOrder: number,
    ): void => {
      if (pts.length < 2) return;
      const nSegs = pts.length - 1;
      const positions = new Float32Array(nSegs * 4 * 3);
      const indices: number[] = [];
      let vi = 0;
      let ii = 0;

      for (let s = 0; s < nSegs; s++) {
        const p0 = pts[s]!;
        const p1 = pts[s + 1]!;
        const dx = p1[0] - p0[0];
        const dy = p1[1] - p0[1];
        const len = Math.sqrt(dx * dx + dy * dy) || 1e-10;
        const nx = (-dy / len) * halfWidth * offsetDir * flipSign;
        const ny = (dx / len) * halfWidth * offsetDir * flipSign;

        const lon0inner = p0[0];
        const lat0inner = p0[1];
        const lon0outer = p0[0] + nx * 2;
        const lat0outer = p0[1] + ny * 2;

        const lon1inner = p1[0];
        const lat1inner = p1[1];
        const lon1outer = p1[0] + nx * 2;
        const lat1outer = p1[1] + ny * 2;

        const e0i = sampleHeight(hm, lon0inner, lat0inner);
        const e0o = sampleHeight(hm, lon0outer, lat0outer);
        const e1i = sampleHeight(hm, lon1inner, lat1inner);
        const e1o = sampleHeight(hm, lon1outer, lat1outer);

        const [x0i, y0i, z0i] = wgsToWorld(lon0inner, lat0inner, e0i);
        const [x0o, y0o, z0o] = wgsToWorld(lon0outer, lat0outer, e0o);
        const [x1i, y1i, z1i] = wgsToWorld(lon1inner, lat1inner, e1i);
        const [x1o, y1o, z1o] = wgsToWorld(lon1outer, lat1outer, e1o);

        const base = vi / 3;
        positions[vi++] = x0i; positions[vi++] = y0i + yLift; positions[vi++] = z0i;
        positions[vi++] = x0o; positions[vi++] = y0o + yLift; positions[vi++] = z0o;
        positions[vi++] = x1o; positions[vi++] = y1o + yLift; positions[vi++] = z1o;
        positions[vi++] = x1i; positions[vi++] = y1i + yLift; positions[vi++] = z1i;

        indices[ii++] = base; indices[ii++] = base + 1; indices[ii++] = base + 2;
        indices[ii++] = base; indices[ii++] = base + 2; indices[ii++] = base + 3;
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions.slice(0, vi), 3));
      geom.setIndex(indices.slice(0, ii));
      geom.computeVertexNormals();
      const mat = new THREE.MeshBasicMaterial({
        color, transparent: opacity < 1, opacity,
        side: THREE.DoubleSide,
        depthTest: true, depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: renderOrder <= 2 ? -2 : -3,
        polygonOffsetUnits: renderOrder <= 2 ? -8 : -12,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.renderOrder = renderOrder;
      this.scene.add(mesh);
      this.frontRibbonMeshes.push(mesh);
    };

    for (const edge of edges) {
      const key = edge.a < edge.b ? `${edge.a}__${edge.b}` : `${edge.b}__${edge.a}`;
      let border = this.sharedBorderByEdge.get(key);
      if (!border) {
        const oa = this.sidToOsid[edge.a] ?? edge.a;
        const ob = this.sidToOsid[edge.b] ?? edge.b;
        if (oa !== ob) {
          const opKey = oa < ob ? `${oa}__${ob}` : `${ob}__${oa}`;
          border = this.sharedBorderByEdge.get(opKey);
        }
      }

      const hasValidRun = border ? border.runs.some((r) => r.length >= 2) : false;
      if (!border || !hasValidRun) continue;
      const borderKey = `${border.a}__${border.b}`;
      if (drawnOpBorders.has(borderKey)) continue;
      drawnOpBorders.add(borderKey);

      const sideA = edge.side_a ?? this.controlBySettlement[edge.a] ?? null;
      const sideB = edge.side_b ?? this.controlBySettlement[edge.b] ?? null;
      const player = this.playerFaction;
      const friendlyTowardA = player ? sideA === player : true;
      const isPlayerFront = Boolean(player && (sideA === player || sideB === player));
      const frontLineColor = isPlayerFront ? FRIENDLY_FRONT_LINE_COLOR : OTHER_FRONT_LINE_COLOR;

      for (const run of border.runs) {
        if (run.length < 2) continue;
        const centroidA = this.centroidBySid[edge.a];
        let flipSign = 1;
        if (centroidA) {
          const mid0 = run[0]!;
          const mid1 = run[1]!;
          const tdx = mid1[0] - mid0[0];
          const tdy = mid1[1] - mid0[1];
          const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
          const nx = -tdy / tlen;
          const ny = tdx / tlen;
          const mx = (mid0[0] + mid1[0]) / 2;
          const my = (mid0[1] + mid1[1]) / 2;
          const dot = nx * (centroidA[0] - mx) + ny * (centroidA[1] - my);
          if (dot < 0) flipSign = -1;
        }
        const halfA = friendlyTowardA ? FRIENDLY_HALF_WGS : OTHER_HALF_WGS;
        const halfB = friendlyTowardA ? OTHER_HALF_WGS : FRIENDLY_HALF_WGS;
        buildRibbonAlongBorder(run, flipSign, 1, halfA, NEUTRAL_BAND_COLOR, 0.6, FRONT_LINE_Y, 2);
        buildRibbonAlongBorder(run, flipSign, -1, halfB, NEUTRAL_BAND_COLOR, 0.6, FRONT_LINE_Y, 2);
        buildRibbonAlongBorder(run, flipSign, 1, CENTER_HALF_WGS, frontLineColor, 0.8, CENTER_LINE_Y, 3);
        buildBarbsAlongRun(run, flipSign, frontLineColor, 0.9);
      }
    }
  }

  /**
   * Order edge_ids (e.g. "a__b") into a chain of node ids so consecutive edges share a vertex.
   * Returns ordered list of node ids, or empty if any edge cannot be resolved or chain is broken.
   */
  private orderSegmentEdgeIdsAsChain(edgeIds: string[]): string[] {
    if (edgeIds.length === 0) return [];
    const pairs: [string, string][] = [];
    for (const eid of edgeIds) {
      const idx = eid.indexOf('__');
      if (idx <= 0 || idx >= eid.length - 2) return [];
      const a = eid.slice(0, idx);
      const b = eid.slice(idx + 2);
      if (!a || !b) return [];
      pairs.push([a, b]);
    }
    const ordered: string[] = [pairs[0]![0], pairs[0]![1]];
    const used = new Set<number>([0]);
    while (used.size < pairs.length) {
      let extended = false;
      const last = ordered[ordered.length - 1]!;
      const first = ordered[0]!;
      for (let i = 0; i < pairs.length; i++) {
        if (used.has(i)) continue;
        const [x, y] = pairs[i]!;
        if (x === last) { ordered.push(y); used.add(i); extended = true; break; }
        if (y === last) { ordered.push(x); used.add(i); extended = true; break; }
        if (x === first) { ordered.unshift(y); used.add(i); extended = true; break; }
        if (y === first) { ordered.unshift(x); used.add(i); extended = true; break; }
      }
      if (!extended) break;
    }
    return ordered;
  }

  setAssignableFrontSegments(segments: AssignableFrontSegmentInput[]): void {
    for (const m of this.assignableSegmentMeshes) {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.assignableSegmentMeshes = [];
    if (!this.heightmap || segments.length === 0) return;
    const hm = this.heightmap;
    const HALF_WGS = 0.00028;
    const seenOpBorders = new Set<string>();

    const resolveBorder = (a: string, b: string): SharedBorder | null => {
      const directKey = a < b ? `${a}__${b}` : `${b}__${a}`;
      const direct = this.sharedBorderByEdge.get(directKey);
      if (direct) return direct;

      const oa = this.sidToOsid[a] ?? a;
      const ob = this.sidToOsid[b] ?? b;
      if (oa === ob) return null;
      const opKey = oa < ob ? `${oa}__${ob}` : `${ob}__${oa}`;
      return this.sharedBorderByEdge.get(opKey) ?? null;
    };

    const buildRibbonAlongBorder = (
      pts: [number, number][],
      halfWidth: number,
      color: number,
      opacity: number,
    ): THREE.Mesh | null => {
      if (pts.length < 2) return null;
      const nSegs = pts.length - 1;
      const positions = new Float32Array(nSegs * 4 * 3);
      const indices: number[] = [];
      let vi = 0;
      let ii = 0;

      for (let s = 0; s < nSegs; s++) {
        const p0 = pts[s]!;
        const p1 = pts[s + 1]!;
        const dx = p1[0] - p0[0];
        const dy = p1[1] - p0[1];
        const len = Math.sqrt(dx * dx + dy * dy) || 1e-10;
        const nx = (-dy / len) * halfWidth;
        const ny = (dx / len) * halfWidth;

        const lon0L = p0[0] - nx;
        const lat0L = p0[1] - ny;
        const lon0R = p0[0] + nx;
        const lat0R = p0[1] + ny;
        const lon1L = p1[0] - nx;
        const lat1L = p1[1] - ny;
        const lon1R = p1[0] + nx;
        const lat1R = p1[1] + ny;

        const e0L = sampleHeight(hm, lon0L, lat0L);
        const e0R = sampleHeight(hm, lon0R, lat0R);
        const e1L = sampleHeight(hm, lon1L, lat1L);
        const e1R = sampleHeight(hm, lon1R, lat1R);

        const [x0L, y0L, z0L] = wgsToWorld(lon0L, lat0L, e0L);
        const [x0R, y0R, z0R] = wgsToWorld(lon0R, lat0R, e0R);
        const [x1L, y1L, z1L] = wgsToWorld(lon1L, lat1L, e1L);
        const [x1R, y1R, z1R] = wgsToWorld(lon1R, lat1R, e1R);

        const lift = 0.005;
        const base = vi / 3;
        positions[vi++] = x0L; positions[vi++] = y0L + lift; positions[vi++] = z0L;
        positions[vi++] = x0R; positions[vi++] = y0R + lift; positions[vi++] = z0R;
        positions[vi++] = x1R; positions[vi++] = y1R + lift; positions[vi++] = z1R;
        positions[vi++] = x1L; positions[vi++] = y1L + lift; positions[vi++] = z1L;

        indices[ii++] = base; indices[ii++] = base + 1; indices[ii++] = base + 2;
        indices[ii++] = base; indices[ii++] = base + 2; indices[ii++] = base + 3;
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions.slice(0, vi), 3));
      geom.setIndex(indices.slice(0, ii));
      geom.computeVertexNormals();
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -16,
      });
      return new THREE.Mesh(geom, mat);
    };

    for (const seg of segments) {
      for (const edgeId of seg.edge_ids) {
        const idx = edgeId.indexOf('__');
        if (idx <= 0 || idx >= edgeId.length - 2) continue;
        const a = edgeId.slice(0, idx);
        const b = edgeId.slice(idx + 2);
        if (!a || !b) continue;
        const border = resolveBorder(a, b);
        if (!border) continue;

        const opKey = `${border.a}__${border.b}`;
        if (seenOpBorders.has(opKey)) continue;
        seenOpBorders.add(opKey);

        for (const run of border.runs) {
          if (run.length < 2) continue;
          const mesh = buildRibbonAlongBorder(run, HALF_WGS, this.ASSIGNABLE_SEGMENT_COLOR, 0.38);
          if (!mesh) continue;
          this.scene.add(mesh);
          this.assignableSegmentMeshes.push(mesh);
        }
      }
    }
    for (const m of this.assignableSegmentMeshes) m.visible = this.layerVisibility.frontLines;
  }

  setOrderArrows(orders: OrderArrowInput[]): void {
    for (const line of this.orderArrowLines) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.orderArrowLines = [];
    for (const o of orders) {
      const colorHex = o.faction ? (FACTION_COLORS[o.faction] ?? NULL_COLOR) : NULL_COLOR;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(o.from[0], o.from[1], o.from[2]),
        new THREE.Vector3(
          (o.from[0] + o.to[0]) / 2 + 0.02,
          (o.from[1] + o.to[1]) / 2 + 0.02,
          (o.from[2] + o.to[2]) / 2
        ),
        new THREE.Vector3(o.to[0], o.to[1], o.to[2])
      );
      const points = curve.getPoints(12);
      const positions = new Float32Array(points.length * 3);
      points.forEach((p, i) => {
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
      });
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: colorHex,
        linewidth: o.isAttack ? 2 : 1,
      });
      const line = new THREE.Line(geom, mat);
      this.scene.add(line);
      this.orderArrowLines.push(line);
    }
  }

  setFormations(markers: FormationMarkerInput[]): void {
    for (const s of this.formationSprites) {
      this.scene.remove(s);
      (s.material as THREE.SpriteMaterial).map?.dispose();
      (s.material as THREE.SpriteMaterial).dispose();
    }
    this.formationSprites = [];
    this.formationSpriteData = [];
    this.showWhenZoomedOutByFormationId.clear();
    for (const mesh of this.formationProxyMeshes) {
      this.formationHitProxies.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.formationProxyMeshes = [];
    this.formationIdByProxy.clear();
    if (this.scene.children.includes(this.formationHitProxies)) {
      this.scene.remove(this.formationHitProxies);
    }
    for (const m of markers) {
      const colorHex = FACTION_COLORS[m.faction] ?? NULL_COLOR;
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 32;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
      ctx.fillRect(0, 0, 64, 32);
      ctx.fillStyle = '#ddd5c8';
      ctx.font = '12px "IBM Plex Mono", monospace';
      ctx.fillText(m.name.slice(0, 10), 4, 20);
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(m.position[0], m.position[1], m.position[2]);
      const scaleBase = m.isCorps ? this.FORMATION_SPRITE_BASE * 1.5 : this.FORMATION_SPRITE_BASE;
      sprite.scale.set(scaleBase, scaleBase * 0.5, 1);
      this.scene.add(sprite);
      this.formationSprites.push(sprite);
      const showWhenZoomedOut = m.showWhenZoomedOut ?? (m.isCorps ?? false);
      this.formationSpriteData.push({ scaleBase, isCorps: m.isCorps ?? false, showWhenZoomedOut });
      this.showWhenZoomedOutByFormationId.set(m.id, showWhenZoomedOut);
      const proxyGeom = new THREE.PlaneGeometry(0.05, 0.025);
      const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
      const proxyMesh = new THREE.Mesh(proxyGeom, proxyMat);
      proxyMesh.position.set(m.position[0], m.position[1], m.position[2]);
      this.formationHitProxies.add(proxyMesh);
      this.formationProxyMeshes.push(proxyMesh);
      this.formationIdByProxy.set(proxyMesh, m.id);
    }
    if (this.formationHitProxies.children.length > 0) {
      this.scene.add(this.formationHitProxies);
    }
  }

  setLabels(labels: LabelInput[]): void {
    this._lastLabelInput = [...labels];
    this._labelLodHighRes = this.zoom < LABEL_LOD_ZOOM_THRESHOLD;
    this.rebuildLabelSprites();
  }

  /** Rebuild label sprites from _lastLabelInput using current LOD band (_labelLodHighRes). */
  private rebuildLabelSprites(): void {
    for (const s of this.labelSprites) {
      this.scene.remove(s);
      (s.material as THREE.SpriteMaterial).map?.dispose();
      (s.material as THREE.SpriteMaterial).dispose();
    }
    this.labelSprites = [];
    this.labelData = [];
    const highRes = this._labelLodHighRes;
    const w = highRes ? 256 : 128;
    const h = highRes ? 64 : 32;
    const fontSize = highRes ? 18 : 14;
    const padY = highRes ? 28 : 22;
    for (const l of this._lastLabelInput) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ddd5c8';
      ctx.font = `${fontSize}px "IBM Plex Mono", monospace`;
      ctx.fillText(l.text.slice(0, highRes ? 28 : 20), 4, padY);
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(l.position[0], l.position[1], l.position[2]);
      sprite.scale.set(0.2, 0.05, 1);
      this.scene.add(sprite);
      this.labelSprites.push(sprite);
      this.labelData.push({ major: l.major ?? false });
    }
  }

  setStrategicPoints(points: StrategicPointInput[]): void {
    for (const p of this.strategicMarkers) {
      this.scene.remove(p);
      p.geometry.dispose();
      (p.material as THREE.Material).dispose();
    }
    this.strategicMarkers = [];
    const pos: number[] = [];
    for (const pt of points) {
      pos.push(pt.position[0], pt.position[1], pt.position[2]);
    }
    if (pos.length === 0) return;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xc4a35a, size: 0.03, sizeAttenuation: true });
    const mesh = new THREE.Points(geom, mat);
    this.scene.add(mesh);
    this.strategicMarkers.push(mesh);
  }

  setEnclaveRings(rings: EnclaveRingInput[]): void {
    for (const line of this.enclaveRings) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.enclaveRings = [];
    for (const r of rings) {
      if (r.positions.length < 2) continue;
      const pos: number[] = [];
      const pts = r.positions;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]!;
        const q = pts[(i + 1) % pts.length]!;
        pos.push(p[0], p[1], p[2], q[0], q[1], q[2]);
      }
      const colorHex = FACTION_COLORS[r.faction] ?? NULL_COLOR;
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const mat = new THREE.LineBasicMaterial({ color: colorHex });
      const line = new THREE.LineSegments(geom, mat);
      this.scene.add(line);
      this.enclaveRings.push(line);
    }
  }

  private setupControls(): void {
    const el = this.renderer.domElement;
    const container = this.container;

    const onWheel = (e: WheelEvent): void => {
      if (!container.contains(e.target as Node)) return;
      e.preventDefault();
      e.stopPropagation();
      const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
      this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom * factor));
      this.updateCamera();
    };
    container.addEventListener('wheel', onWheel, { passive: false, capture: true });
    el.addEventListener('wheel', onWheel, { passive: false });

    // Suppress context menu on the canvas so right-click-drag works for tilt
    el.addEventListener('contextmenu', (e) => e.preventDefault());

    // Pan: left-drag. Yaw: middle-drag horizontal or Shift+right-drag horizontal. Tilt: right-drag vertical.
    let dragStartX = 0;
    let dragStartY = 0;
    let hasDragged = false;

    el.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isPanning = true;
        hasDragged = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        el.style.cursor = 'grabbing';
      } else if (e.button === 1) {
        this.isYawing = true;
        el.style.cursor = 'ew-resize';
      } else if (e.button === 2) {
        this.isTilting = true;
        el.style.cursor = 'ns-resize';
      }
      this.lastPointer = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        const dx = (e.clientX - this.lastPointer.x) * 0.005 * this.zoom;
        const dz = (e.clientY - this.lastPointer.y) * 0.005 * this.zoom;
        this.pan.x -= dx;
        this.pan.z -= dz;
        this.updateCamera();
        const totalDx = e.clientX - dragStartX;
        const totalDy = e.clientY - dragStartY;
        if (Math.abs(totalDx) > 3 || Math.abs(totalDy) > 3) hasDragged = true;
      }
      if (this.isYawing) {
        const dx = e.clientX - this.lastPointer.x;
        this.yaw = Math.max(MIN_YAW_DEG, Math.min(MAX_YAW_DEG, this.yaw + dx * 0.25));
        this.updateCamera();
      }
      if (this.isTilting) {
        const dy = e.clientY - this.lastPointer.y;
        this.tilt = Math.max(MIN_TILT_DEG, Math.min(MAX_TILT_DEG, this.tilt + dy * 0.25));
        if (e.shiftKey) {
          const dx = e.clientX - this.lastPointer.x;
          this.yaw = Math.max(MIN_YAW_DEG, Math.min(MAX_YAW_DEG, this.yaw + dx * 0.25));
        }
        this.updateCamera();
      }
      this.lastPointer = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener('mouseup', (e) => {
      const wasPanning = this.isPanning;
      if (this.isPanning) el.style.cursor = '';
      if (this.isYawing) el.style.cursor = '';
      if (this.isTilting) el.style.cursor = '';
      this.isPanning = false;
      this.isYawing = false;
      this.isTilting = false;
      if (wasPanning && !hasDragged && e.button === 0) {
        this.handleSettlementClick(e);
      }
    });
    el.addEventListener('mouseleave', () => {
      if (this.isPanning || this.isYawing || this.isTilting) el.style.cursor = '';
      this.isPanning = false;
      this.isYawing = false;
      this.isTilting = false;
    });
    el.addEventListener('dblclick', (e) => {
      if (this.isPanning || this.isYawing || this.isTilting) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycastControl();
      if (intersects.length === 0) return;
      const feature = this.featureFromIntersection(intersects[0]!);
      this.centerOnFeature(feature, Math.min(this.zoom, 1.0));
    });

    // Hover raycasting for settlement tooltip (separate from pan handler)
    let hoverRafPending = false;
    el.addEventListener('mousemove', (e) => {
      if (this.isPanning || this.isYawing || this.isTilting || hoverRafPending) return;
      hoverRafPending = true;
      requestAnimationFrame(() => {
        hoverRafPending = false;
        const rect = el.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycastControl();
        if (intersects.length > 0) {
          const feature = this.featureFromIntersection(intersects[0]!);
          this.onHoverSettlement?.(feature, e.clientX, e.clientY);
        } else {
          this.onHoverSettlement?.(null, 0, 0);
        }
      });
    });

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Home') {
        e.preventDefault();
        this.pan = { x: 0, z: 0 };
        this.zoom = DEFAULT_ZOOM;
        this.tilt = DEFAULT_TILT_DEG;
        this.yaw = 0;
        this.updateCamera();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        this.centerOnPlayerCapital();
      } else if (e.key === 't') {
        e.preventDefault();
        this.tilt = Math.min(MAX_TILT_DEG, this.tilt + 5);
        this.updateCamera();
      } else if (e.key === 'T') {
        e.preventDefault();
        this.tilt = Math.max(MIN_TILT_DEG, this.tilt - 5);
        this.updateCamera();
      }
    };
    el.tabIndex = 0;
    el.addEventListener('keydown', keyHandler);
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);
    const rect = this.container.getBoundingClientRect();
    const cw = Math.floor(rect.width);
    const ch = Math.floor(rect.height);
    if (cw !== this.lastContainerWidth || ch !== this.lastContainerHeight) {
      this.resize();
    }
    const alt = this.camera.position.length();
    const onlyCorpsLevel = this.zoom >= ZOOM_CORPS_ONLY_THRESHOLD;
    for (let i = 0; i < this.formationSprites.length; i++) {
      const sprite = this.formationSprites[i]!;
      const { scaleBase, showWhenZoomedOut } = this.formationSpriteData[i]!;
      const s = scaleBase * (this.REFERENCE_ALTITUDE / Math.max(0.1, alt));
      sprite.scale.set(s, s * 0.5, 1);
      sprite.visible = this.layerVisibility.formations && (!onlyCorpsLevel || showWhenZoomedOut);
    }
    for (let i = 0; i < this.labelSprites.length; i++) {
      const sprite = this.labelSprites[i]!;
      const { major } = this.labelData[i]!;
      const maxAlt = major ? this.LABEL_MAJOR_ALTITUDE_MAX : this.LABEL_ALTITUDE_MAX;
      sprite.visible = alt <= maxAlt;
    }
    // Settlement floating labels: scale with zoom, respect layer toggle
    const labelsVisible = this.layerVisibility.labels;
    for (let i = 0; i < this.settlementLabelSprites.length; i++) {
      const sprite = this.settlementLabelSprites[i]!;
      const meta = this.settlementLabelMeta[i]!;
      // Scale relative to zoom (this.zoom = frustum half-size; smaller zoom = more zoomed in)
      const scaleFactor = this.zoom / DEFAULT_ZOOM;
      const s = meta.scaleBase * scaleFactor;
      sprite.scale.set(s * meta.aspect, s, 1);
      // Cities always visible; towns only when somewhat zoomed in
      const isTown = meta.pop < 15000;
      sprite.visible = labelsVisible && (!isTown || this.zoom < 2.5);
    }
    this.renderer.render(this.scene, this.camera);
  };

  resize(): void {
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    this.renderer.setSize(w, h);
    this.lastContainerWidth = w;
    this.lastContainerHeight = h;
    this.updateCamera();
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    // Dispose terrain mesh + texture
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      this.terrainMesh.geometry.dispose();
      const tMat = this.terrainMesh.material as THREE.MeshStandardMaterial;
      tMat.map?.dispose();
      tMat.dispose();
      this.terrainMesh = null;
    }
    for (const mesh of this.controlMeshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.controlMeshes = [];
    this.controlMesh = null;
    if (this.factionOverlayMesh) {
      this.scene.remove(this.factionOverlayMesh);
      const fMat = this.factionOverlayMesh.material as THREE.MeshBasicMaterial;
      fMat.map?.dispose();
      fMat.dispose();
      this.factionOverlayMesh = null;
    }
    for (const mesh of this.frontRibbonMeshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.frontRibbonMeshes = [];
    for (const mesh of this.assignableSegmentMeshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.assignableSegmentMeshes = [];
    for (const line of this.orderArrowLines) {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.orderArrowLines = [];
    for (const s of this.formationSprites) {
      (s.material as THREE.SpriteMaterial).map?.dispose();
      (s.material as THREE.SpriteMaterial).dispose();
    }
    this.formationSprites = [];
    this.formationSpriteData = [];
    this.showWhenZoomedOutByFormationId.clear();
    for (const s of this.labelSprites) {
      (s.material as THREE.SpriteMaterial).map?.dispose();
      (s.material as THREE.SpriteMaterial).dispose();
    }
    this.labelSprites = [];
    this.labelData = [];
    for (const s of this.settlementLabelSprites) {
      (s.material as THREE.SpriteMaterial).map?.dispose();
      (s.material as THREE.SpriteMaterial).dispose();
    }
    this.settlementLabelSprites = [];
    this.settlementLabelMeta = [];
    for (const line of this.enclaveRings) {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.enclaveRings = [];
    for (const p of this.strategicMarkers) {
      p.geometry.dispose();
      (p.material as THREE.Material).dispose();
    }
    this.strategicMarkers = [];
    this.clearSelectionBorder();
    this.scene.clear();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  }
}
