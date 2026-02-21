/**
 * HoI-style 2.5D WebGL renderer: orthographic tilted view, terrain, political control.
 * ADDENDUM_25D_AND_MOSTAR_SPLIT Part B; HOI_VISUAL_GUI_OVERHAUL_SPEC §2.
 */

import * as THREE from 'three';
import { wgsToWorld } from '../terrain/TerrainMeshBuilder.js';

const HEIGHTMAP_URL = '/data/derived/terrain/heightmap_3d_viewer.json';
const OPERATIONAL_SETTLEMENTS_URL = '/data/derived/operational/operational_settlements.geojson';

const WORLD_SCALE = 2.0;
const VERT_EXAG = 0.00022;
const BIH_CENTER_LON = (15.62 + 19.72) / 2;
const BIH_CENTER_LAT = (42.46 + 45.37) / 2;
const TILT_DEG = 20;
const DEFAULT_ZOOM = 4.5;

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
const NULL_COLOR = 0xb4aa96;

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

export class HoIMapRenderer {
  private container: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private controlMeshes: THREE.Mesh[] = [];
  private frontRibbonMeshes: THREE.Mesh[] = [];
  private orderArrowLines: THREE.Line[] = [];
  private formationSprites: THREE.Sprite[] = [];
  private formationSpriteData: { scaleBase: number; isCorps: boolean }[] = [];
  private labelSprites: THREE.Sprite[] = [];
  private labelData: { major: boolean }[] = [];
  private strategicMarkers: THREE.Points[] = [];
  private enclaveRings: THREE.LineSegments[] = [];
  private heightmap: HeightmapData | null = null;
  private operationalGeo: GeoJSONFC | null = null;
  private centroidBySid: Record<string, [number, number]> = {};
  private controlBySettlement: Record<string, string | null> = {};
  private getBaseUrl: () => string;
  private pan = { x: 0, z: 0 };
  private zoom = DEFAULT_ZOOM;
  private isPanning = false;
  private lastPointer = { x: 0, y: 0 };
  private rafId = 0;
  private lastContainerWidth = 0;
  private lastContainerHeight = 0;
  private readonly FRONT_RIBBON_WIDTH = 0.08;
  private readonly FRONT_COLOR = 0x503c28;
  private readonly REFERENCE_ALTITUDE = 2.5;
  private readonly FORMATION_SPRITE_BASE = 0.15;
  private readonly LABEL_ALTITUDE_MAX = 4;
  private readonly LABEL_MAJOR_ALTITUDE_MAX = 6;

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
    } catch (e) {
      console.warn('HoIMapRenderer: heightmap load failed', e);
      return false;
    }

    let operational: GeoJSONFC = { type: 'FeatureCollection', features: [] };
    try {
      const r = await fetch(`${this.getBaseUrl()}${OPERATIONAL_SETTLEMENTS_URL}`);
      if (r.ok) operational = (await r.json()) as GeoJSONFC;
    } catch {
      // optional
    }
    this.operationalGeo = operational;
    this.computeCentroids();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x252220);

    const rect0 = this.container.getBoundingClientRect();
    const w0 = Math.max(1, rect0.width);
    const h0 = Math.max(1, rect0.height);
    const aspect = w0 / h0;
    const frustum = this.zoom;
    this.camera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect, frustum, -frustum, 0.01, 1000
    );
    const tiltRad = (TILT_DEG * Math.PI) / 180;
    const camDist = 10;
    this.camera.position.set(0, camDist * Math.cos(tiltRad), camDist * Math.sin(tiltRad));
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);

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
    const dir = new THREE.DirectionalLight(0xeee8dc, 0.5);
    dir.position.set(1, 2, 1);
    this.scene.add(dir);

    this.buildTerrain();
    this.buildControlLayer();
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
    const { width, height, elevations, bbox } = this.heightmap;
    const [minLon, , maxLon, maxLat] = bbox;
    const positions: number[] = [];
    const indices: number[] = [];
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const idx = j * width + i;
        const lon = minLon + (i / (width - 1)) * (maxLon - minLon);
        const lat = maxLat - (j / (height - 1)) * (bbox[3] - bbox[1]);
        const [wx, wy, wz] = wgsToWorld(lon, lat, elevations[idx] ?? 0);
        positions.push(wx, wy, wz);
      }
    }
    for (let j = 0; j < height - 1; j++) {
      for (let i = 0; i < width - 1; i++) {
        const a = j * width + i;
        const b = a + 1;
        const c = (j + 1) * width + i;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: 0x8a7d6d,
      roughness: 0.9,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
  }

  private buildControlLayer(): void {
    if (!this.heightmap || !this.operationalGeo?.features?.length) return;
    const hm = this.heightmap;
    for (const mesh of this.controlMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.controlMeshes = [];

    for (const feature of this.operationalGeo.features) {
      const rings = getRings(feature);
      const osid = feature.properties?.osid ?? feature.properties?.sid ?? '';
      const controller = osid ? (this.controlBySettlement[osid] ?? null) : null;
      const colorHex = controller ? (FACTION_COLORS[controller] ?? NULL_COLOR) : NULL_COLOR;
      const color = new THREE.Color(colorHex);

      for (const ring of rings) {
        if (ring.length < 3) continue;
        const contour: THREE.Vector2[] = [];
        const lonLat: [number, number][] = [];
        for (const [lon, lat] of ring) {
          const [x, , z] = wgsToWorld(lon, lat, 0);
          contour.push(new THREE.Vector2(x, z));
          lonLat.push([lon, lat]);
        }
        let triangles: number[][];
        try {
          triangles = THREE.ShapeUtils.triangulateShape(contour, []);
        } catch {
          continue;
        }
        const positions: number[] = [];
        const indices: number[] = [];
        for (let i = 0; i < contour.length; i++) {
          const [lon, lat] = lonLat[i]!;
          const elev = sampleHeight(hm, lon, lat);
          const [wx, wy, wz] = wgsToWorld(lon, lat, elev);
          positions.push(wx, wy, wz);
        }
        for (const tri of triangles) {
          indices.push(tri[0]!, tri[1]!, tri[2]!);
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom.setIndex(indices);
        geom.computeVertexNormals();
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.75,
          depthWrite: true,
        });
        const mesh = new THREE.Mesh(geom, mat);
        this.scene.add(mesh);
        this.controlMeshes.push(mesh);
      }
    }
  }

  private computeCentroids(): void {
    this.centroidBySid = {};
    if (!this.operationalGeo?.features?.length) return;
    for (const f of this.operationalGeo.features) {
      const rings = getRings(f);
      const sid = (f.properties?.osid ?? f.properties?.sid ?? '') as string;
      if (!sid || !rings[0]?.length) continue;
      let sumLon = 0, sumLat = 0;
      const ring = rings[0];
      for (const [lon, lat] of ring) {
        sumLon += lon;
        sumLat += lat;
      }
      this.centroidBySid[sid] = [sumLon / ring.length, sumLat / ring.length];
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
    const tiltRad = (TILT_DEG * Math.PI) / 180;
    const camDist = 10;
    this.camera.position.set(this.pan.x, camDist * Math.cos(tiltRad), camDist * Math.sin(tiltRad) + this.pan.z);
    this.camera.lookAt(this.pan.x, 0, this.pan.z);
  }

  setControlBySettlement(control: Record<string, string | null>): void {
    this.controlBySettlement = control;
    this.buildControlLayer();
  }

  setFrontEdges(edges: FrontEdgeInput[]): void {
    for (const m of this.frontRibbonMeshes) {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.frontRibbonMeshes = [];
    if (!this.heightmap || edges.length === 0) return;
    const hm = this.heightmap;
    for (const edge of edges) {
      const ca = this.centroidBySid[edge.a];
      const cb = this.centroidBySid[edge.b];
      if (!ca || !cb) continue;
      const [lonA, latA] = ca;
      const [lonB, latB] = cb;
      const [, yA, ] = wgsToWorld(lonA, latA, sampleHeight(hm, lonA, latA));
      const [, yB, ] = wgsToWorld(lonB, latB, sampleHeight(hm, lonB, latB));
      const [xA, , zA] = wgsToWorld(lonA, latA, 0);
      const [xB, , zB] = wgsToWorld(lonB, latB, 0);
      const dx = xB - xA;
      const dz = zB - zA;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      const perpX = (-dz / len) * this.FRONT_RIBBON_WIDTH;
      const perpZ = (dx / len) * this.FRONT_RIBBON_WIDTH;
      const positions = new Float32Array([
        xA - perpX, yA, zA - perpZ,
        xA + perpX, yA, zA + perpZ,
        xB + perpX, yB, zB + perpZ,
        xB - perpX, yB, zB - perpZ,
      ]);
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.setIndex([0, 1, 2, 0, 2, 3]);
      geom.computeVertexNormals();
      const mat = new THREE.MeshBasicMaterial({
        color: this.FRONT_COLOR,
        transparent: true,
        opacity: 0.6,
      });
      const mesh = new THREE.Mesh(geom, mat);
      this.scene.add(mesh);
      this.frontRibbonMeshes.push(mesh);
    }
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
      this.formationSpriteData.push({ scaleBase, isCorps: m.isCorps ?? false });
    }
  }

  setLabels(labels: LabelInput[]): void {
    for (const s of this.labelSprites) {
      this.scene.remove(s);
      (s.material as THREE.SpriteMaterial).map?.dispose();
      (s.material as THREE.SpriteMaterial).dispose();
    }
    this.labelSprites = [];
    this.labelData = [];
    for (const l of labels) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 32;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ddd5c8';
      ctx.font = '14px "IBM Plex Mono", monospace';
      ctx.fillText(l.text.slice(0, 20), 4, 22);
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
      this.zoom = Math.max(0.3, Math.min(10, this.zoom * factor));
      this.updateCamera();
    };
    container.addEventListener('wheel', onWheel, { passive: false, capture: true });
    el.addEventListener('wheel', onWheel, { passive: false });

    el.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        this.isPanning = true;
        el.style.cursor = 'grabbing';
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
      }
      this.lastPointer = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener('mouseup', () => {
      if (this.isPanning) el.style.cursor = '';
      this.isPanning = false;
    });
    el.addEventListener('mouseleave', () => {
      if (this.isPanning) el.style.cursor = '';
      this.isPanning = false;
    });

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Home') {
        e.preventDefault();
        this.pan = { x: 0, z: 0 };
        this.zoom = DEFAULT_ZOOM;
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
    for (let i = 0; i < this.formationSprites.length; i++) {
      const sprite = this.formationSprites[i]!;
      const { scaleBase } = this.formationSpriteData[i]!;
      const s = scaleBase * (this.REFERENCE_ALTITUDE / Math.max(0.1, alt));
      sprite.scale.set(s, s * 0.5, 1);
    }
    for (let i = 0; i < this.labelSprites.length; i++) {
      const sprite = this.labelSprites[i]!;
      const { major } = this.labelData[i]!;
      const maxAlt = major ? this.LABEL_MAJOR_ALTITUDE_MAX : this.LABEL_ALTITUDE_MAX;
      sprite.visible = alt <= maxAlt;
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
    for (const mesh of this.controlMeshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.controlMeshes = [];
    for (const mesh of this.frontRibbonMeshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.frontRibbonMeshes = [];
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
    for (const s of this.labelSprites) {
      (s.material as THREE.SpriteMaterial).map?.dispose();
      (s.material as THREE.SpriteMaterial).dispose();
    }
    this.labelSprites = [];
    this.labelData = [];
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
    this.scene.clear();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  }
}
