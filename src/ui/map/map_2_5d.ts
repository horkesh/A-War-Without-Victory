/**
 * Isometric 2.5D viewer — smooth terrain (heightmap) + municipal & settlement boundary lines.
 * No extrusion blocks; verticality comes only from the continuous DEM surface.
 * Browser-only; not wired to the game engine.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const HEIGHTMAP_URL = '/data/derived/terrain/heightmap_3d_viewer.json';
const MUNICIPALITIES_URL = '/data/derived/municipalities_2_5d_viewer.geojson';
const SETTLEMENTS_URL = '/data/derived/settlements_wgs84_1990.geojson';

const VERTICAL_EXAGGERATION = 0.0018;
const WORLD_SCALE = 0.02 * 100;
const BIH_CENTER_LON = (15.62 + 19.72) / 2;
const BIH_CENTER_LAT = (42.46 + 45.37) / 2;

/** Isometric: ~35.264° elevation, 45° azimuth; distance from center */
const ISOMETRIC_DISTANCE = 6;

interface HeightmapData {
    bbox: [number, number, number, number];
    width: number;
    height: number;
    elevations: number[];
}

type PolygonRing = number[][];
type PolygonCoordinates = PolygonRing[];
type MultiPolygonCoordinates = PolygonCoordinates[];

type BoundaryGeometry =
    | { type: 'Polygon'; coordinates: PolygonCoordinates }
    | { type: 'MultiPolygon'; coordinates: MultiPolygonCoordinates };

interface BoundaryFeature {
    geometry?: BoundaryGeometry;
}

interface BoundaryFeatureCollection {
    features?: BoundaryFeature[];
}

function showMessage(msg: string): void {
    const el = document.getElementById('message');
    if (el) {
        el.textContent = msg;
        el.classList.add('visible');
    }
}

function hideMessage(): void {
    const el = document.getElementById('message');
    if (el) el.classList.remove('visible');
}

function sampleHeight(hm: HeightmapData, lon: number, lat: number): number {
    const [minLon, minLat, maxLon, maxLat] = hm.bbox;
    const { width, height, elevations } = hm;
    const si = ((lon - minLon) / (maxLon - minLon)) * (width - 1);
    const sj = ((maxLat - lat) / (maxLat - minLat)) * (height - 1);
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

function project(lon: number, lat: number, y: number): [number, number, number] {
    const x = (lon - BIH_CENTER_LON) * WORLD_SCALE;
    const z = (lat - BIH_CENTER_LAT) * WORLD_SCALE;
    return [x, y * VERTICAL_EXAGGERATION, z];
}

function buildTerrainMesh(data: HeightmapData): THREE.BufferGeometry {
    const [minLon, minLat, maxLon, maxLat] = data.bbox;
    const { width, height, elevations } = data;
    const centerLon = (minLon + maxLon) / 2;
    const centerLat = (minLat + maxLat) / 2;

    const positions: number[] = [];
    const indices: number[] = [];

    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            const idx = j * width + i;
            const lon = minLon + (i / (width - 1)) * (maxLon - minLon);
            const lat = maxLat - (j / (height - 1)) * (maxLat - minLat);
            const x = (lon - centerLon) * WORLD_SCALE;
            const z = (lat - centerLat) * WORLD_SCALE;
            const y = (elevations[idx] ?? 0) * VERTICAL_EXAGGERATION;
            positions.push(x, y, z);
        }
    }

    const segsX = width - 1;
    const segsZ = height - 1;
    for (let j = 0; j < segsZ; j++) {
        for (let i = 0; i < segsX; i++) {
            const a = j * width + i;
            const b = a + 1;
            const c = a + width;
            const d = c + 1;
            indices.push(a, c, b, b, c, d);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

function ringsFromFeature(geom?: BoundaryGeometry): PolygonRing[] {
    if (!geom) return [];
    if (geom.type === 'Polygon' && geom.coordinates.length > 0) {
        return [geom.coordinates[0]!];
    }
    if (geom.type === 'MultiPolygon' && geom.coordinates.length > 0) {
        return geom.coordinates.map((p) => p[0]!).filter((r) => r && r.length > 0);
    }
    return [];
}

function buildBoundaryLines(
    hm: HeightmapData,
    fc: BoundaryFeatureCollection,
    color: number
): THREE.LineSegments {
    const points: number[] = [];
    for (const feature of fc.features ?? []) {
        for (const ring of ringsFromFeature(feature.geometry)) {
            for (let i = 0; i < ring.length; i++) {
                const [lon1, lat1] = ring[i]!;
                const [lon2, lat2] = ring[(i + 1) % ring.length]!;
                const y1 = sampleHeight(hm, lon1, lat1);
                const y2 = sampleHeight(hm, lon2, lat2);
                const [x1, y1w, z1] = project(lon1, lat1, y1);
                const [x2, y2w, z2] = project(lon2, lat2, y2);
                points.push(x1, y1w, z1, x2, y2w, z2);
            }
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return new THREE.LineSegments(
        geometry,
        new THREE.LineBasicMaterial({ color })
    );
}

async function main(): Promise<void> {
    const containerEl = document.getElementById('canvas-container');
    if (!containerEl) return;
    const container = containerEl;

    let heightmap: HeightmapData;
    try {
        const res = await fetch(HEIGHTMAP_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        heightmap = (await res.json()) as HeightmapData;
        if (!heightmap.bbox || !heightmap.elevations || !heightmap.width || !heightmap.height) {
            throw new Error('Invalid heightmap');
        }
    } catch (e) {
        showMessage(`Cannot load heightmap.\nRun: npm run map:export:heightmap-3d\n\n${(e as Error).message}`);
        return;
    }

    let munGeo: BoundaryFeatureCollection = { features: [] };
    try {
        const r = await fetch(MUNICIPALITIES_URL);
        if (r.ok) munGeo = (await r.json()) as typeof munGeo;
    } catch {
        // optional
    }

    let settlementGeo: BoundaryFeatureCollection = { features: [] };
    try {
        const r = await fetch(SETTLEMENTS_URL);
        if (r.ok) settlementGeo = (await r.json()) as typeof settlementGeo;
    } catch {
        // optional; file may not exist
    }

    hideMessage();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d1a);

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.001, 1000);
    const angle = Math.PI / 4;
    const elev = Math.asin(1 / Math.sqrt(3));
    camera.position.set(
        ISOMETRIC_DISTANCE * Math.cos(elev) * Math.cos(angle),
        ISOMETRIC_DISTANCE * Math.sin(elev),
        ISOMETRIC_DISTANCE * Math.cos(elev) * Math.sin(angle)
    );
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);

    const terrainGeometry = buildTerrainMesh(heightmap);
    const terrain = new THREE.Mesh(terrainGeometry, new THREE.MeshStandardMaterial({
        color: 0x2d4a2d,
        metalness: 0.1,
        roughness: 0.9,
    }));
    scene.add(terrain);

    if (munGeo.features?.length) {
        scene.add(buildBoundaryLines(heightmap, munGeo, 0x1a1a2e));
    }
    if (settlementGeo.features?.length) {
        scene.add(buildBoundaryLines(heightmap, settlementGeo, 0x2a2a3e));
    }

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 2, 1).normalize();
    scene.add(directionalLight);
    scene.add(new THREE.AmbientLight(0x404060, 0.4));

    function resize(): void {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
    window.addEventListener('resize', resize);

    function animate(): void {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}

main();
